import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createErrorBody } from "../../../lib/api-error";

type SpotifyProfile = {
  id: string;
  display_name: string;
};

type SpotifyTopTracksResponse = {
  items: {
    id: string;
    name: string;
    uri: string;
    artists: { name: string }[];
  }[];
};

type SpotifyPlaylistResponse = {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
};

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Spotifyログイン情報が見つかりません。もう一度ログインしてください。" },
      { status: 401 }
    );
  }

  // ログイン中のSpotifyユーザー情報を取得する
  const profileResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!profileResponse.ok) {
    const errorText = await profileResponse.text();

    return NextResponse.json(
      createErrorBody(
        "Spotifyプロフィールの取得に失敗しました。",
        errorText
      ),
      { status: 500 }
    );
  }

  const profile = (await profileResponse.json()) as SpotifyProfile;

  // テスト用に、自分がよく聴いている曲をSpotifyから取得する
  const topTracksResponse = await fetch(
    "https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term",
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

  const topTracks = (await topTracksResponse.json()) as SpotifyTopTracksResponse;
  const trackUris = topTracks.items.map((track) => track.uri);

  if (trackUris.length === 0) {
    return NextResponse.json(
      { error: "プレイリストに追加できる曲が見つかりませんでした。" },
      { status: 400 }
    );
  }

  // Spotify上に非公開のテストプレイリストを作成する
  const playlistResponse = await fetch(
    `https://api.spotify.com/v1/users/${profile.id}/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Crossfade Mix Test",
        description:
          "Crossfade Mixの開発テスト用プレイリストです。自分のTop Tracksから作成しています。",
        public: false,
      }),
    }
  );

  if (!playlistResponse.ok) {
    const errorText = await playlistResponse.text();

    return NextResponse.json(
      createErrorBody(
        "Spotifyプレイリストの作成に失敗しました。",
        errorText
      ),
      { status: 500 }
    );
  }

  const playlist = (await playlistResponse.json()) as SpotifyPlaylistResponse;

  // 作成したプレイリストへ曲を追加する
  const addTracksResponse = await fetch(
    `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: trackUris,
      }),
    }
  );

  if (!addTracksResponse.ok) {
    const errorText = await addTracksResponse.text();

    return NextResponse.json(
      createErrorBody(
        "Spotifyプレイリストへの曲追加に失敗しました。",
        errorText
      ),
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Test playlist created.",
    playlist: {
      id: playlist.id,
      name: playlist.name,
      spotifyUrl: playlist.external_urls.spotify,
    },
    tracks: topTracks.items.map((track) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((artist) => artist.name).join(", "),
      uri: track.uri,
    })),
  });
}
