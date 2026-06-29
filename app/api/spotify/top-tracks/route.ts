import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createErrorBody } from "../../../lib/api-error";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Spotifyログイン情報が見つかりません。もう一度ログインしてください。" },
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
      createErrorBody("よく聴く曲の取得に失敗しました。", errorText),
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
