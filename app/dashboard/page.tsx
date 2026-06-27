"use client";

import { useEffect, useState } from "react";

type Profile = {
  id: string;
  display_name: string;
  email: string;
};

type Track = {
  id: string;
  name: string;
  artists: string;
  spotifyUrl: string;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadSpotifyData() {
      try {
        setLoading(true);
        setErrorMessage("");

        const profileResponse = await fetch("/api/spotify/profile");
        const profileData = await profileResponse.json();

        if (!profileResponse.ok) {
          throw new Error(profileData.error ?? "プロフィール取得に失敗しました。");
        }

        setProfile(profileData);

        const tracksResponse = await fetch("/api/spotify/top-tracks");
        const tracksData = await tracksResponse.json();

        if (!tracksResponse.ok) {
          throw new Error(tracksData.error ?? "Top Tracks取得に失敗しました。");
        }

        setTracks(tracksData.tracks ?? []);
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("不明なエラーが発生しました。");
        }
      } finally {
        setLoading(false);
      }
    }

    loadSpotifyData();
  }, []);

  async function createTestPlaylist() {
    try {
      setErrorMessage("");

      const response = await fetch("/api/spotify/create-test-playlist", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "プレイリスト作成に失敗しました。");
      }

      window.open(data.playlist.spotifyUrl, "_blank");
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("不明なエラーが発生しました。");
      }
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm text-zinc-400">Reverse Blend MVP</p>

        <h1 className="mb-8 text-4xl font-bold">Spotifyデータ確認</h1>

        {loading && (
          <div className="mb-6 rounded-lg bg-zinc-900 p-4 text-zinc-300">
            Spotifyデータを読み込み中です...
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-lg bg-red-950 p-4 text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="mb-8 rounded-2xl bg-zinc-900 p-6">
          <h2 className="mb-3 text-xl font-bold">ログイン中のユーザー</h2>

          {profile ? (
            <div className="space-y-1 text-zinc-300">
              <p>表示名：{profile.display_name}</p>
              <p>Spotify ID：{profile.id}</p>
              <p>メール：{profile.email}</p>
            </div>
          ) : (
            <p className="text-zinc-400">
              {loading ? "読み込み中..." : "ユーザー情報がありません。"}
            </p>
          )}
        </div>

        <button
          onClick={createTestPlaylist}
          className="mb-8 rounded-full bg-green-500 px-6 py-3 font-bold text-black transition hover:bg-green-400"
        >
          テストプレイリストを作成
        </button>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="mb-4 text-xl font-bold">よく聴いている曲 Top 10</h2>

          {tracks.length > 0 ? (
            <ol className="space-y-3">
              {tracks.map((track, index) => (
                <li
                  key={track.id}
                  className="rounded-xl bg-zinc-800 p-4 text-zinc-200"
                >
                  <div className="text-sm text-zinc-500">#{index + 1}</div>
                  <a
                    href={track.spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold hover:underline"
                  >
                    {track.name}
                  </a>
                  <div className="text-sm text-zinc-400">{track.artists}</div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-zinc-400">
              {loading ? "読み込み中..." : "Top Tracksがありません。"}
            </p>
          )}
        </div>

        <div className="mt-8 flex gap-4 text-sm">
          <a className="text-green-400 underline" href="/api/spotify/profile">
            profile API確認
          </a>
          <a className="text-green-400 underline" href="/api/spotify/top-tracks">
            top-tracks API確認
          </a>
        </div>
      </section>
    </main>
  );
}