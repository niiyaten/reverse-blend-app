import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createErrorBody } from "../../../lib/api-error";
import {
  SESSION_COOKIE_NAME,
  verifyAppSessionCookieValue,
} from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabase-server";
import { decryptToken } from "../../../lib/token-crypto";

export async function GET() {
  const cookieStore = await cookies();
  const appUserId = verifyAppSessionCookieValue(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );

  if (!appUserId) {
    return NextResponse.json(
      { error: "Spotifyログイン情報が見つかりません。もう一度ログインしてください。" },
      { status: 401 }
    );
  }

  const { data: user, error: userError } = await supabaseServer
    .from("users")
    .select("access_token")
    .eq("id", appUserId)
    .single();

  if (userError || !user) {
    return NextResponse.json(
      createErrorBody("ログインユーザー情報の取得に失敗しました。", userError?.message),
      { status: 500 }
    );
  }

  // 自分がよく聴いている曲をSpotifyから取得する
  const topTracksResponse = await fetch(
    "https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=long_term",
    {
      headers: {
        Authorization: `Bearer ${decryptToken(user.access_token)}`,
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
