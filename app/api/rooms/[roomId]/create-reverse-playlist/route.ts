import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase-server";

type AppUser = {
  id: string;
  spotify_user_id: string;
  display_name: string | null;
  access_token: string;
};

type SpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
};

type SpotifyTopTracksResponse = {
  items: SpotifyTrack[];
};

type SpotifyPlaylistResponse = {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
};

async function getRecentlyPlayedTracks(accessToken: string) {
  const response = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=50",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get recently played tracks: ${errorText}`);
  }

  const data = await response.json();

  const tracks = data.items
    .map((item: { track: SpotifyTrack }) => item.track)
    .filter((track: SpotifyTrack | null) => track !== null);

  const uniqueTracks: SpotifyTrack[] = [];
  const seenTrackIds = new Set<string>();

  for (const track of tracks) {
    if (!seenTrackIds.has(track.id)) {
      uniqueTracks.push(track);
      seenTrackIds.add(track.id);
    }
  }

  return uniqueTracks;
}

async function getTopTracks(accessToken: string) {
  const response = await fetch(
    "https://api.spotify.com/v1/me/top/tracks?limit=30&time_range=medium_term",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get top tracks: ${errorText}`);
  }

  const data = (await response.json()) as SpotifyTopTracksResponse;

  if (data.items.length > 0) {
    return data.items;
  }

  // 新規アカウントなどでTop Tracksが空の場合は、最近再生した曲を使う
  return getRecentlyPlayedTracks(accessToken);
}

function getArtistNameSet(tracks: SpotifyTrack[]) {
  return new Set(
    tracks.flatMap((track) =>
      track.artists.map((artist) => artist.name.toLowerCase())
    )
  );
}

function selectFarTracks(
  ownTracks: SpotifyTrack[],
  otherTracks: SpotifyTrack[],
  limit: number
) {
  const otherTrackIds = new Set(otherTracks.map((track) => track.id));
  const otherArtistNames = getArtistNameSet(otherTracks);

  const scoredTracks = ownTracks.map((track, index) => {
    const artistNames = track.artists.map((artist) => artist.name.toLowerCase());

    const hasSameTrack = otherTrackIds.has(track.id);
    const hasSameArtist = artistNames.some((artistName) =>
      otherArtistNames.has(artistName)
    );

    let score = 100;

    // 自分のTop Tracks上位ほど残したいので、順位による加点を入れる
    score += Math.max(0, 30 - index);

    // 相手が同じ曲を聴いていなければ、逆Blendらしさとして加点
    if (!hasSameTrack) {
      score += 30;
    }

    // 相手のTop Tracksに同じアーティストが少なければ、さらに加点
    if (!hasSameArtist) {
      score += 40;
    }

    return {
      track,
      score,
    };
  });

  return scoredTracks
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.track);
}

function interleaveTracks(hostTracks: SpotifyTrack[], guestTracks: SpotifyTrack[]) {
  const result: SpotifyTrack[] = [];
  const maxLength = Math.max(hostTracks.length, guestTracks.length);

  for (let i = 0; i < maxLength; i++) {
    if (hostTracks[i]) {
      result.push(hostTracks[i]);
    }

    if (guestTracks[i]) {
      result.push(guestTracks[i]);
    }
  }

  const uniqueTracks: SpotifyTrack[] = [];
  const seenUris = new Set<string>();

  for (const track of result) {
    if (!seenUris.has(track.uri)) {
      uniqueTracks.push(track);
      seenUris.add(track.uri);
    }
  }

  return uniqueTracks;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const { data: room, error: roomError } = await supabaseServer
    .from("rooms")
    .select("id, host_user_id, guest_user_id, status")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return NextResponse.json(
      {
        error: "Room not found.",
        detail: roomError?.message,
      },
      { status: 404 }
    );
  }

  if (!room.host_user_id || !room.guest_user_id) {
    return NextResponse.json(
      {
        error: "2人が揃っていません。",
      },
      { status: 400 }
    );
  }

  const { data: users, error: usersError } = await supabaseServer
    .from("users")
    .select("id, spotify_user_id, display_name, access_token")
    .in("id", [room.host_user_id, room.guest_user_id]);

  if (usersError || !users) {
    return NextResponse.json(
      {
        error: "Failed to get room users.",
        detail: usersError?.message,
      },
      { status: 500 }
    );
  }

  const hostUser = users.find((user) => user.id === room.host_user_id) as
    | AppUser
    | undefined;
  const guestUser = users.find((user) => user.id === room.guest_user_id) as
    | AppUser
    | undefined;

  if (!hostUser || !guestUser) {
    return NextResponse.json(
      {
        error: "Host or guest user was not found.",
      },
      { status: 500 }
    );
  }

  try {
    const hostTopTracks = await getTopTracks(hostUser.access_token);
    const guestTopTracks = await getTopTracks(guestUser.access_token);

    if (hostTopTracks.length === 0 || guestTopTracks.length === 0) {
      return NextResponse.json(
        {
          error:
            "どちらかのSpotifyアカウントでTop Tracks / Recently Playedの両方が取得できませんでした。サブ垢で何曲か再生してから再試行してください。",
          hostTrackCount: hostTopTracks.length,
          guestTrackCount: guestTopTracks.length,
        },
        { status: 400 }
      );
    }

    const selectedHostTracks = selectFarTracks(hostTopTracks, guestTopTracks, 10);
    const selectedGuestTracks = selectFarTracks(guestTopTracks, hostTopTracks, 10);
    const playlistTracks = interleaveTracks(selectedHostTracks, selectedGuestTracks);
    const trackUris = playlistTracks.map((track) => track.uri);

    const hostName = hostUser.display_name ?? "Host";
    const guestName = guestUser.display_name ?? "Guest";

    // ホスト側のSpotifyアカウントに非公開プレイリストを作る
    const playlistResponse = await fetch("https://api.spotify.com/v1/me/playlists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hostUser.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `逆Blend - ${hostName} × ${guestName}`,
        description:
          "2人のSpotify傾向から、あえて共通点が少なそうな曲を集めたプレイリストです。",
        public: false,
      }),
    });

    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text();
      throw new Error(`Failed to create playlist: ${errorText}`);
    }

    const playlist = (await playlistResponse.json()) as SpotifyPlaylistResponse;

    const addTracksResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hostUser.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: trackUris,
        }),
      }
    );

    if (!addTracksResponse.ok) {
      const errorText = await addTracksResponse.text();
      throw new Error(`Failed to add tracks: ${errorText}`);
    }

    await supabaseServer.from("playlists").insert({
      room_id: room.id,
      spotify_playlist_id: playlist.id,
      spotify_playlist_url: playlist.external_urls.spotify,
      created_by_user_id: hostUser.id,
    });

    return NextResponse.json({
      message: "Reverse Blend playlist created.",
      playlist: {
        id: playlist.id,
        name: playlist.name,
        spotifyUrl: playlist.external_urls.spotify,
      },
      tracks: playlistTracks.map((track) => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist) => artist.name).join(", "),
        uri: track.uri,
      })),
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Failed to create reverse playlist.",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Unknown error occurred.",
      },
      { status: 500 }
    );
  }
}