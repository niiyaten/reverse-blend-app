import { NextRequest, NextResponse } from "next/server";
import { createErrorBody } from "../../../../lib/api-error";
import { supabaseServer } from "../../../../lib/supabase-server";

type SpotifyProfile = {
  id: string;
  display_name: string;
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  // Spotifyのstateには、招待ルーム経由のログイン時だけroomIdを入れている
  const roomId = request.nextUrl.searchParams.get("state");

  if (error) {
    return NextResponse.json(
      createErrorBody("Spotifyログインがキャンセルまたは失敗しました。", error),
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Spotify認証コードが見つかりません。" },
      { status: 400 }
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const appUrl = process.env.APP_URL;

  if (!clientId || !clientSecret || !redirectUri || !appUrl) {
    return NextResponse.json(
      { error: "Spotify連携に必要な環境変数が不足しています。" },
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
      createErrorBody(
        "Spotifyのアクセストークン取得に失敗しました。もう一度ログインしてください。",
        errorText
      ),
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
      createErrorBody(
        "Spotifyプロフィールの取得に失敗しました。もう一度ログインしてください。",
        errorText
      ),
      { status: 500 }
    );
  }

  const profile = (await profileResponse.json()) as SpotifyProfile;

  const tokenExpiresAt = new Date(
    Date.now() + tokenData.expires_in * 1000
  ).toISOString();

  // Spotifyユーザー情報とtokenを、プレイリスト作成時に参照できるよう保存する
  const { data: savedUser, error: saveUserError } = await supabaseServer
    .from("users")
    .upsert(
      {
        spotify_user_id: profile.id,
        display_name: profile.display_name,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "spotify_user_id",
      }
    )
    .select("id, spotify_user_id, display_name")
    .single();

  if (saveUserError) {
    return NextResponse.json(
      createErrorBody(
        "ログインユーザー情報の保存に失敗しました。",
        saveUserError.message
      ),
      { status: 500 }
    );
  }

  // 招待ルーム経由のログインなら、ログインユーザーをゲストとして紐づける
  if (roomId) {
    const { data: room, error: roomFetchError } = await supabaseServer
      .from("rooms")
      .select("id, host_user_id, guest_user_id")
      .eq("id", roomId)
      .single();

    if (roomFetchError || !room) {
      return NextResponse.json(
        createErrorBody(
          "招待ルームが見つかりません。",
          roomFetchError?.message
        ),
        { status: 404 }
      );
    }

    // ホスト本人が自分の招待URLを開いた場合は、ゲストとして登録しない
    if (room.host_user_id !== savedUser.id) {
      const { error: roomUpdateError } = await supabaseServer
        .from("rooms")
        .update({
          guest_user_id: savedUser.id,
          status: "ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", roomId);

      if (roomUpdateError) {
        return NextResponse.json(
          createErrorBody(
            "招待ルームへの参加に失敗しました。",
            roomUpdateError.message
          ),
          { status: 500 }
        );
      }
    }
  }

  const redirectUrl = roomId ? `${appUrl}/room/${roomId}` : `${appUrl}/dashboard`;
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set("spotify_access_token", tokenData.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: tokenData.expires_in,
  });

  response.cookies.set("app_user_id", savedUser.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
