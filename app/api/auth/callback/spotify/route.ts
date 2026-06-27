import { NextRequest, NextResponse } from "next/server";

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

  // SpotifyにClient IDとClient Secretを渡すため、Base64形式に変換する
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  // Spotifyからaccess_tokenを取得する
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

  // ログイン成功後はダッシュボード画面へ移動する
  const response = NextResponse.redirect(`${appUrl}/dashboard`);

  // MVP段階なので、まずはaccess_tokenをCookieに保存する
  // httpOnlyにして、ブラウザのJavaScriptから直接読めないようにする
  response.cookies.set("spotify_access_token", tokenData.access_token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: tokenData.expires_in,
  });

  return response;
}