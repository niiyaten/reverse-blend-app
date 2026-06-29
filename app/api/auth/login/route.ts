import { NextRequest, NextResponse } from "next/server";

const scopes = [
  "user-read-private",
  "user-top-read",
  "playlist-modify-private",
  "user-read-recently-played",
].join(" ");

export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Spotify environment variables are missing." },
      { status: 500 }
    );
  }

  const roomId = request.nextUrl.searchParams.get("roomId");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
  });

  // 招待ルームからログインした場合は、stateにroomIdを入れてcallbackへ渡す
  if (roomId) {
    params.set("state", roomId);
  }

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}