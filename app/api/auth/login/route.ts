import { NextResponse } from "next/server";

const scopes = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "playlist-modify-private",
].join(" ");

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Spotify environment variables are missing." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}