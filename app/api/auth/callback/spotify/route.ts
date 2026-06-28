import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase-server";

type SpotifyProfile = {
  id: string;
  display_name: string;
  email: string;
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json(
      { error: "Authorization code is missing." },
      { status: 400 }
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const appUrl = process.env.APP_URL;

  if (!clientId || !clientSecret || !redirectUri || !appUrl) {
    return NextResponse.json(
      { error: "Spotify environment variables are missing." },
      { status: 500 }
    );
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();

    return NextResponse.json(
      {
        error: "Failed to get Spotify access token.",
        detail: errorText,
      },
      { status: 500 }
    );
  }

  const tokenData = await tokenResponse.json();

  const profileResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    const errorText = await profileResponse.text();

    return NextResponse.json(
      {
        error: "Failed to get Spotify profile.",
        detail: errorText,
      },
      { status: 500 }
    );
  }

  const profile = (await profileResponse.json()) as SpotifyProfile;

  const tokenExpiresAt = new Date(
    Date.now() + tokenData.expires_in * 1000
  ).toISOString();

  const { data: savedUser, error: saveUserError } = await supabaseServer
    .from("users")
    .upsert(
      {
        spotify_user_id: profile.id,
        display_name: profile.display_name,
        email: profile.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "spotify_user_id",
      }
    )
    .select("id, spotify_user_id, display_name, email")
    .single();

  if (saveUserError) {
    return NextResponse.json(
      {
        error: "Failed to save Spotify user to Supabase.",
        detail: saveUserError.message,
      },
      { status: 500 }
    );
  }

  const response = NextResponse.redirect(`${appUrl}/dashboard`);

  response.cookies.set("spotify_access_token", tokenData.access_token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: tokenData.expires_in,
  });

  response.cookies.set("app_user_id", savedUser.id, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}