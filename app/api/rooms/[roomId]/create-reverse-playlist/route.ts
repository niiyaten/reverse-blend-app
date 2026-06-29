import { NextResponse } from "next/server";
import { createErrorBody } from "../../../../lib/api-error";
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

type SpotifyAlbum = {
  id: string;
  name: string;
};

type SpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  artists: SpotifyArtist[];
  album?: SpotifyAlbum | null;
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

type ScoredTrack = {
  track: SpotifyTrack;
  score: number;
  ownSimilarity: number;
  otherSimilarity: number;
  rankScore: number;
};

const TRACKS_PER_USER = 15;

// 1人由来の15曲内で、同じアーティストに偏りすぎないようにする
const MAX_TRACKS_PER_ARTIST = 2;

// 1人由来の15曲内で、同じアルバムに偏りすぎないようにする
const MAX_TRACKS_PER_ALBUM = 1;

// すでに選んだ曲と似ている曲をどれくらい避けるか
const MMR_DIVERSITY_WEIGHT = 45;

async function fetchJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify APIリクエストに失敗しました: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// Top Tracksが空のときに、最近再生した曲を代替として使う
async function getRecentlyPlayedTracks(accessToken: string) {
  const data = await fetchJson<{
    items: { track: SpotifyTrack | null }[];
  }>(
    "https://api.spotify.com/v1/me/player/recently-played?limit=50",
    accessToken
  );

  const tracks = data.items
    .map((item) => item.track)
    .filter((track): track is SpotifyTrack => track !== null);

  return uniqueTracks(tracks);
}

// 基本はlong_termのTop Tracksを使い、空ならRecently Playedにfallbackする
async function getTopTracksOrRecentTracks(accessToken: string) {
  const data = await fetchJson<SpotifyTopTracksResponse>(
    "https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=long_term",
    accessToken
  );

  if (data.items.length > 0) {
    return uniqueTracks(data.items);
  }

  return getRecentlyPlayedTracks(accessToken);
}

// long_termのTop Artistsを取得する
async function getTopArtists(accessToken: string) {
  const data = await fetchJson<SpotifyTopArtistsResponse>(
    "https://api.spotify.com/v1/me/top/artists?limit=50&time_range=long_term",
    accessToken
  );

  return data.items;
}

// 曲に含まれるアーティストIDから、ジャンル情報付きの詳細を取得する
async function getArtistDetails(accessToken: string, artistIds: string[]) {
  const uniqueArtistIds = [...new Set(artistIds)].filter(Boolean);
  const artistMap = new Map<string, SpotifyArtist>();

  if (uniqueArtistIds.length === 0) {
    return artistMap;
  }

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

// 同じ曲IDの重複を除去する
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

function getPrimaryArtistId(track: SpotifyTrack) {
  return track.artists[0]?.id ?? "unknown-artist";
}

function getAlbumId(track: SpotifyTrack) {
  return track.album?.id ?? "unknown-album";
}

function addToVector(vector: Map<string, number>, key: string, value: number) {
  vector.set(key, (vector.get(key) ?? 0) + value);
}

// ユーザーの好みを「artist:xxx」「genre:xxx」のベクトルに変換する
function buildUserPreferenceVector(params: {
  topArtists: SpotifyArtist[];
  tracks: SpotifyTrack[];
  trackArtistDetailMap: Map<string, SpotifyArtist>;
}) {
  const { topArtists, tracks, trackArtistDetailMap } = params;
  const vector = new Map<string, number>();

  // Top Artistsは、その人の好みの中心として強めに入れる
  topArtists.forEach((artist, index) => {
    const rankWeight = 1 - index / Math.max(topArtists.length, 1);

    addToVector(vector, `artist:${artist.id}`, 4.0 * rankWeight);

    for (const genre of artist.genres ?? []) {
      addToVector(vector, `genre:${genre.toLowerCase()}`, 2.5 * rankWeight);
    }
  });

  // Top Tracks / Recently Playedに出てくるアーティストも好みとして入れる
  tracks.forEach((track, index) => {
    const rankWeight = 1 - index / Math.max(tracks.length, 1);

    for (const artist of track.artists) {
      const detail = trackArtistDetailMap.get(artist.id);

      addToVector(vector, `artist:${artist.id}`, 2.0 * rankWeight);

      for (const genre of detail?.genres ?? []) {
        addToVector(vector, `genre:${genre.toLowerCase()}`, 1.2 * rankWeight);
      }
    }
  });

  return vector;
}

// 候補曲を「artist:xxx」「genre:xxx」のベクトルに変換する
function buildTrackVector(
  track: SpotifyTrack,
  artistDetailMap: Map<string, SpotifyArtist>
) {
  const vector = new Map<string, number>();

  for (const artist of track.artists) {
    const detail = artistDetailMap.get(artist.id);

    addToVector(vector, `artist:${artist.id}`, 4.0);

    for (const genre of detail?.genres ?? []) {
      addToVector(vector, `genre:${genre.toLowerCase()}`, 2.0);
    }
  }

  return vector;
}

// 2つのベクトルの近さをcosine similarityで計算する
function cosineSimilarity(
  vectorA: Map<string, number>,
  vectorB: Map<string, number>
) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const value of vectorA.values()) {
    normA += value * value;
  }

  for (const value of vectorB.values()) {
    normB += value * value;
  }

  for (const [key, valueA] of vectorA.entries()) {
    const valueB = vectorB.get(key) ?? 0;
    dot += valueA * valueB;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getArtistIdSetFromTracksAndArtists(
  tracks: SpotifyTrack[],
  artists: SpotifyArtist[]
) {
  return new Set([
    ...getArtistIdsFromTracks(tracks),
    ...artists.map((artist) => artist.id),
  ]);
}

// 自分には近く、相手からは遠い曲ほど高スコアにする
function scoreTracks(params: {
  ownTracks: SpotifyTrack[];
  otherTracks: SpotifyTrack[];
  ownTopArtists: SpotifyArtist[];
  otherTopArtists: SpotifyArtist[];
  ownArtistDetailMap: Map<string, SpotifyArtist>;
  ownPreferenceVector: Map<string, number>;
  otherPreferenceVector: Map<string, number>;
}) {
  const {
    ownTracks,
    otherTracks,
    otherTopArtists,
    ownArtistDetailMap,
    ownPreferenceVector,
    otherPreferenceVector,
  } = params;

  const otherTrackIds = new Set(otherTracks.map((track) => track.id));
  const otherArtistIds = getArtistIdSetFromTracksAndArtists(
    otherTracks,
    otherTopArtists
  );

  return ownTracks
    .map((track, index): ScoredTrack => {
      const trackVector = buildTrackVector(track, ownArtistDetailMap);

      const ownSimilarity = cosineSimilarity(trackVector, ownPreferenceVector);
      const otherSimilarity = cosineSimilarity(
        trackVector,
        otherPreferenceVector
      );

      const sameTrack = otherTrackIds.has(track.id);
      const sameArtist = track.artists.some((artist) =>
        otherArtistIds.has(artist.id)
      );

      // Top Tracks上位ほど、その人らしい曲として少し加点する
      const rankScore = 1 - index / Math.max(ownTracks.length, 1);

      let score = 0;

      // 自分に近いほど加点する
      score += ownSimilarity * 80;

      // 相手に近いほど減点する
      score -= otherSimilarity * 100;

      // Top Tracks上位曲を少し優先する
      score += rankScore * 25;

      // 同じ曲は2人の違いが出にくいので大きく減点する
      if (sameTrack) {
        score -= 120;
      } else {
        score += 20;
      }

      // 同じアーティストも近い趣味と見なして減点する
      if (sameArtist) {
        score -= 55;
      } else {
        score += 20;
      }

      return {
        track,
        score,
        ownSimilarity,
        otherSimilarity,
        rankScore,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// MMRにより、スコアが高いだけでなく、選ばれた曲同士が似すぎないようにする
function selectWithMmrAndDiversity(params: {
  scoredTracks: ScoredTrack[];
  artistDetailMap: Map<string, SpotifyArtist>;
  limit: number;
}) {
  const { scoredTracks, artistDetailMap, limit } = params;

  const selected: ScoredTrack[] = [];
  const selectedTrackIds = new Set<string>();
  const artistCounts = new Map<string, number>();
  const albumCounts = new Map<string, number>();

  // relaxLevel 0: アーティスト・アルバム制約を守る
  // relaxLevel 1: アルバム制約だけ緩める
  // relaxLevel 2: それでも足りない場合、制約を緩めて補充する
  for (let relaxLevel = 0; relaxLevel <= 2; relaxLevel++) {
    while (selected.length < limit) {
      let bestItem: ScoredTrack | null = null;
      let bestAdjustedScore = -Infinity;

      for (const item of scoredTracks) {
        const track = item.track;

        if (selectedTrackIds.has(track.id)) {
          continue;
        }

        const artistId = getPrimaryArtistId(track);
        const albumId = getAlbumId(track);
        const artistCount = artistCounts.get(artistId) ?? 0;
        const albumCount = albumCounts.get(albumId) ?? 0;

        if (relaxLevel === 0) {
          if (artistCount >= MAX_TRACKS_PER_ARTIST) {
            continue;
          }

          if (albumCount >= MAX_TRACKS_PER_ALBUM) {
            continue;
          }
        }

        if (relaxLevel === 1) {
          if (artistCount >= MAX_TRACKS_PER_ARTIST) {
            continue;
          }
        }

        const trackVector = buildTrackVector(track, artistDetailMap);

        let maxSimilarityToSelected = 0;

        for (const selectedItem of selected) {
          const selectedVector = buildTrackVector(
            selectedItem.track,
            artistDetailMap
          );
          const similarity = cosineSimilarity(trackVector, selectedVector);
          maxSimilarityToSelected = Math.max(
            maxSimilarityToSelected,
            similarity
          );
        }

        // すでに選ばれた曲と似ているほど減点する
        const adjustedScore =
          item.score - maxSimilarityToSelected * MMR_DIVERSITY_WEIGHT;

        if (adjustedScore > bestAdjustedScore) {
          bestAdjustedScore = adjustedScore;
          bestItem = item;
        }
      }

      if (!bestItem) {
        break;
      }

      selected.push(bestItem);
      selectedTrackIds.add(bestItem.track.id);

      const artistId = getPrimaryArtistId(bestItem.track);
      const albumId = getAlbumId(bestItem.track);

      artistCounts.set(artistId, (artistCounts.get(artistId) ?? 0) + 1);
      albumCounts.set(albumId, (albumCounts.get(albumId) ?? 0) + 1);
    }

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

// 1人分の候補曲から、2人の違いが出やすい曲を選ぶ
function selectFarTracks(params: {
  ownTracks: SpotifyTrack[];
  otherTracks: SpotifyTrack[];
  ownTopArtists: SpotifyArtist[];
  otherTopArtists: SpotifyArtist[];
  ownArtistDetailMap: Map<string, SpotifyArtist>;
  ownPreferenceVector: Map<string, number>;
  otherPreferenceVector: Map<string, number>;
  limit: number;
}) {
  const scoredTracks = scoreTracks(params);

  return selectWithMmrAndDiversity({
    scoredTracks,
    artistDetailMap: params.ownArtistDetailMap,
    limit: params.limit,
  });
}

// ホスト由来・ゲスト由来を交互に並べる
function interleaveTracks(hostTracks: ScoredTrack[], guestTracks: ScoredTrack[]) {
  const result: ScoredTrack[] = [];
  const maxLength = Math.max(hostTracks.length, guestTracks.length);

  for (let i = 0; i < maxLength; i++) {
    if (hostTracks[i]) {
      result.push(hostTracks[i]);
    }

    if (guestTracks[i]) {
      result.push(guestTracks[i]);
    }
  }

  const uniqueResult: ScoredTrack[] = [];
  const seenUris = new Set<string>();

  for (const item of result) {
    if (!seenUris.has(item.track.uri)) {
      uniqueResult.push(item);
      seenUris.add(item.track.uri);
    }
  }

  return uniqueResult;
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
      createErrorBody("招待ルームが見つかりません。", roomError?.message),
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
      createErrorBody(
        "ルーム参加者の情報取得に失敗しました。",
        usersError?.message
      ),
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
        error: "ホストまたはゲストのユーザー情報が見つかりません。",
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

    const hostPreferenceVector = buildUserPreferenceVector({
      topArtists: hostTopArtists,
      tracks: hostTracks,
      trackArtistDetailMap: hostArtistDetailMap,
    });

    const guestPreferenceVector = buildUserPreferenceVector({
      topArtists: guestTopArtists,
      tracks: guestTracks,
      trackArtistDetailMap: guestArtistDetailMap,
    });

    const selectedHostTracks = selectFarTracks({
      ownTracks: hostTracks,
      otherTracks: guestTracks,
      ownTopArtists: hostTopArtists,
      otherTopArtists: guestTopArtists,
      ownArtistDetailMap: hostArtistDetailMap,
      ownPreferenceVector: hostPreferenceVector,
      otherPreferenceVector: guestPreferenceVector,
      limit: TRACKS_PER_USER,
    });

    const selectedGuestTracks = selectFarTracks({
      ownTracks: guestTracks,
      otherTracks: hostTracks,
      ownTopArtists: guestTopArtists,
      otherTopArtists: hostTopArtists,
      ownArtistDetailMap: guestArtistDetailMap,
      ownPreferenceVector: guestPreferenceVector,
      otherPreferenceVector: hostPreferenceVector,
      limit: TRACKS_PER_USER,
    });

    const playlistTracks = interleaveTracks(
      selectedHostTracks,
      selectedGuestTracks
    );

    const trackUris = playlistTracks.map((item) => item.track.uri);

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
          name: `Crossfade Mix - ${hostName} x ${guestName}`,
          description:
            "2人のSpotify傾向から、あえて共通点が少なそうな曲を集めたプレイリストです。奇数曲はホスト由来、偶数曲はゲスト由来です。",
          public: false,
        }),
      }
    );

    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text();
      throw new Error(`Spotifyプレイリストの作成に失敗しました: ${errorText}`);
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
      throw new Error(`Spotifyプレイリストへの曲追加に失敗しました: ${errorText}`);
    }

    await supabaseServer.from("playlists").insert({
      room_id: room.id,
      spotify_playlist_id: playlist.id,
      spotify_playlist_url: playlist.external_urls.spotify,
      created_by_user_id: hostUser.id,
    });

    return NextResponse.json({
      message: "Crossfade Mix playlist created.",
      playlist: {
        id: playlist.id,
        name: playlist.name,
        spotifyUrl: playlist.external_urls.spotify,
      },
      tracks: playlistTracks.map((item, index) => ({
        position: index + 1,
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map((artist) => artist.name).join(", "),
        album: item.track.album?.name ?? null,
        uri: item.track.uri,
        source: index % 2 === 0 ? "host" : "guest",
        score: Number(item.score.toFixed(3)),
        ownSimilarity: Number(item.ownSimilarity.toFixed(3)),
        otherSimilarity: Number(item.otherSimilarity.toFixed(3)),
        rankScore: Number(item.rankScore.toFixed(3)),
      })),
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        createErrorBody(
          "Crossfade Mixプレイリストの作成に失敗しました。",
          error.message
        ),
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "予期しないエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
