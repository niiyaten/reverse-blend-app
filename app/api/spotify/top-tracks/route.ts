import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Spotify access token is missing." },
      { status: 401 }
    );
  }

  // 自分がよく聴いている曲をSpotifyから取得する
  const topTracksResponse = await fetch(
    "https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=long_term",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!topTracksResponse.ok) {
    const errorText = await topTracksResponse.text();

    return NextResponse.json(
      {
        error: "Failed to get Spotify top tracks.",
        detail: errorText,
      },
      { status: 500 }
    );
  }

  const topTracks = await topTracksResponse.json();

  const tracks = topTracks.items.map(
    (track: {
      id: string;
      name: string;
      uri: string;
      artists: { name: string }[];
      external_urls: { spotify: string };
    }) => ({
      id: track.id,
      name: track.name,
      uri: track.uri,
      artists: track.artists.map((artist) => artist.name).join(", "),
      spotifyUrl: track.external_urls.spotify,
    })
  );

  return NextResponse.json({ tracks });
}