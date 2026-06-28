import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase-server";

type AppUser = {
  id: string;
  spotify_user_id: string;
  display_name: string | null;
  access_token: string;
};

type SpotifyArtist = {
  id: string;
  name: string;
  genres?: string[];
};

type SpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  artists: SpotifyArtist[];
};

type SpotifyTopTracksResponse = {
  items: SpotifyTrack[];
};

type SpotifyTopArtistsResponse = {
  items: SpotifyArtist[];
};

type SpotifyPlaylistResponse = {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
};

async function fetchJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify API request failed: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

async function getRecentlyPlayedTracks(accessToken: string) {
  const data = await fetchJson<{
    items: { track: SpotifyTrack }[];
  }>(
    "https://api.spotify.com/v1/me/player/recently-played?limit=50",
    accessToken
  );

  const tracks = data.items
    .map((item) => item.track)
    .filter((track) => track !== null);

  return uniqueTracks(tracks);
}

async function getTopTracksOrRecentTracks(accessToken: string) {
  const data = await fetchJson<SpotifyTopTracksResponse>(
    "https://api.spotify.com/v1/me/top/tracks?limit=30&time_range=medium_term",
    accessToken
  );

  if (data.items.length > 0) {
    return uniqueTracks(data.items);
  }

  return getRecentlyPlayedTracks(accessToken);
}

async function getTopArtists(accessToken: string) {
  const data = await fetchJson<SpotifyTopArtistsResponse>(
    "https://api.spotify.com/v1/me/top/artists?limit=30&time_range=medium_term",
    accessToken
  );

  return data.items;
}

async function getArtistDetails(accessToken: string, artistIds: string[]) {
  const uniqueArtistIds = [...new Set(artistIds)].filter(Boolean);
  const artistMap = new Map<string, SpotifyArtist>();

  for (let i = 0; i < uniqueArtistIds.length; i += 50) {
    const chunk = uniqueArtistIds.slice(i, i + 50);

    const data = await fetchJson<{ artists: SpotifyArtist[] }>(
      `https://api.spotify.com/v1/artists?ids=${chunk.join(",")}`,
      accessToken
    );

    for (const artist of data.artists) {
      artistMap.set(artist.id, artist);
    }
  }

  return artistMap;
}

function uniqueTracks(tracks: SpotifyTrack[]) {
  const result: SpotifyTrack[] = [];
  const seenIds = new Set<string>();

  for (const track of tracks) {
    if (!seenIds.has(track.id)) {
      result.push(track);
      seenIds.add(track.id);
    }
  }

  return result;
}

function getArtistIdsFromTracks(tracks: SpotifyTrack[]) {
  return tracks.flatMap((track) => track.artists.map((artist) => artist.id));
}

function getGenreSetFromArtists(artists: SpotifyArtist[]) {
  return new Set(
    artists.flatMap((artist) =>
      (artist.genres ?? []).map((genre) => genre.toLowerCase())
    )
  );
}

function getArtistNameSet(artists: SpotifyArtist[]) {
  return new Set(artists.map((artist) => artist.name.toLowerCase()));
}

function getTrackGenres(
  track: SpotifyTrack,
  artistDetailMap: Map<string, SpotifyArtist>
) {
  const genres = track.artists.flatMap((artist) => {
    const detail = artistDetailMap.get(artist.id);
    return detail?.genres ?? [];
  });

  return [...new Set(genres.map((genre) => genre.toLowerCase()))];
}

function countGenreOverlap(trackGenres: string[], otherGenreSet: Set<string>) {
  return trackGenres.filter((genre) => otherGenreSet.has(genre)).length;
}

function selectFarTracks(params: {
  ownTracks: SpotifyTrack[];
  otherTracks: SpotifyTrack[];
  ownTopArtists: SpotifyArtist[];
  otherTopArtists: SpotifyArtist[];
  ownArtistDetailMap: Map<string, SpotifyArtist>;
  limit: number;
}) {
  const {
    ownTracks,
    otherTracks,
    ownTopArtists,
    otherTopArtists,
    ownArtistDetailMap,
    limit,
  } = params;

  const otherTrackIds = new Set(otherTracks.map((track) => track.id));
  const otherTopArtistNames = getArtistNameSet(otherTopArtists);
  const otherGenreSet = getGenreSetFromArtists(otherTopArtists);
  const ownGenreSet = getGenreSetFromArtists(ownTopArtists);

  const scoredTracks = ownTracks.map((track, index) => {
    const artistNames = track.artists.map((artist) => artist.name.toLowerCase());
    const trackGenres = getTrackGenres(track, ownArtistDetailMap);

    const sameTrack = otherTrackIds.has(track.id);
    const sameTopArtist = artistNames.some((artistName) =>
      otherTopArtistNames.has(artistName)
    );

    const otherGenreOverlap = countGenreOverlap(trackGenres, otherGenreSet);
    const ownGenreOverlap = countGenreOverlap(trackGenres, ownGenreSet);

    let score = 0;

    // 自分のTop上位曲ほど、その人らしい曲として加点する
    score += Math.max(0, 30 - index);

    // 相手と同じ曲なら逆Blend感が弱いので大きく減点する
    if (sameTrack) {
      score -= 100;
    } else {
      score += 30;
    }

    // 相手のTop Artistsと同じアーティストなら減点する
    if (sameTopArtist) {
      score -= 50;
    } else {
      score += 30;
    }

    // 相手のジャンルと重なるほど減点する
    score -= otherGenreOverlap * 25;

    // 自分側のジャンルには乗っている曲なら、その人らしさとして加点する
    score += ownGenreOverlap * 10;

    // ジャンル情報が取れない曲は判断材料が少ないので軽く減点する
    if (trackGenres.length === 0) {
      score -= 10;
    }

    return {
      track,
      score,
      debug: {
        trackGenres,
        sameTrack,
        sameTopArtist,
        otherGenreOverlap,
        ownGenreOverlap,
      },
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

  return uniqueTracks(result);
}

export async function POST(
  _request: Request,
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
    const [hostTracks, guestTracks, hostTopArtists, guestTopArtists] =
      await Promise.all([
        getTopTracksOrRecentTracks(hostUser.access_token),
        getTopTracksOrRecentTracks(guestUser.access_token),
        getTopArtists(hostUser.access_token),
        getTopArtists(guestUser.access_token),
      ]);

    if (hostTracks.length === 0 || guestTracks.length === 0) {
      return NextResponse.json(
        {
          error:
            "どちらかのSpotifyアカウントでTop Tracks / Recently Playedの両方が取得できませんでした。",
          hostTrackCount: hostTracks.length,
          guestTrackCount: guestTracks.length,
        },
        { status: 400 }
      );
    }

    const [hostArtistDetailMap, guestArtistDetailMap] = await Promise.all([
      getArtistDetails(hostUser.access_token, getArtistIdsFromTracks(hostTracks)),
      getArtistDetails(
        guestUser.access_token,
        getArtistIdsFromTracks(guestTracks)
      ),
    ]);

    const selectedHostTracks = selectFarTracks({
      ownTracks: hostTracks,
      otherTracks: guestTracks,
      ownTopArtists: hostTopArtists,
      otherTopArtists: guestTopArtists,
      ownArtistDetailMap: hostArtistDetailMap,
      limit: 10,
    });

    const selectedGuestTracks = selectFarTracks({
      ownTracks: guestTracks,
      otherTracks: hostTracks,
      ownTopArtists: guestTopArtists,
      otherTopArtists: hostTopArtists,
      ownArtistDetailMap: guestArtistDetailMap,
      limit: 10,
    });

    const playlistTracks = interleaveTracks(
      selectedHostTracks,
      selectedGuestTracks
    );
    const trackUris = playlistTracks.map((track) => track.uri);

    const hostName = hostUser.display_name ?? "Host";
    const guestName = guestUser.display_name ?? "Guest";

    const playlistResponse = await fetch(
      "https://api.spotify.com/v1/me/playlists",
      {
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
      }
    );

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