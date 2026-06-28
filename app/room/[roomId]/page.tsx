"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type RoomUser = {
  id: string;
  display_name: string | null;
  spotify_user_id: string;
};

type Room = {
  id: string;
  status: string;
  host: RoomUser | null;
  guest: RoomUser | null;
};

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  useEffect(() => {
    setInviteUrl(window.location.href);
  }, []);

  useEffect(() => {
    async function loadRoom() {
      try {
        setErrorMessage("");

        const response = await fetch(`/api/rooms/${roomId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "ルーム情報の取得に失敗しました。");
        }

        setRoom(data.room);
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("不明なエラーが発生しました。");
        }
      }
    }

    loadRoom();
  }, [roomId]);

  async function copyInviteUrl() {
    if (!inviteUrl) return;

    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  async function createReversePlaylist() {
    try {
      setCreatingPlaylist(true);
      setErrorMessage("");

      const response = await fetch(
        `/api/rooms/${roomId}/create-reverse-playlist`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "逆Blendプレイリストの作成に失敗しました。");
      }

      window.open(data.playlist.spotifyUrl, "_blank");
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("不明なエラーが発生しました。");
      }
    } finally {
      setCreatingPlaylist(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm text-zinc-400">Reverse Blend MVP</p>

        <h1 className="mb-6 text-4xl font-bold">招待ルーム</h1>

        {errorMessage && (
          <div className="mb-6 rounded-lg bg-red-950 p-4 text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="mb-8 rounded-2xl bg-zinc-900 p-6">
          <h2 className="mb-3 text-xl font-bold">ルームID</h2>
          <p className="break-all text-zinc-300">{roomId}</p>
        </div>

        <div className="mb-8 rounded-2xl bg-zinc-900 p-6">
          <h2 className="mb-3 text-xl font-bold">参加状況</h2>

          {room ? (
            <div className="space-y-3 text-zinc-300">
              <p>状態：{room.status}</p>
              <p>ホスト：{room.host?.display_name ?? "不明"}</p>
              <p>
                ゲスト：
                {room.guest?.display_name
                  ? room.guest.display_name
                  : "まだ参加していません"}
              </p>
            </div>
          ) : (
            <p className="text-zinc-400">読み込み中...</p>
          )}
        </div>

        <div className="mb-8 rounded-2xl bg-zinc-900 p-6">
          <h2 className="mb-3 text-xl font-bold">友達に送るURL</h2>

          <p className="mb-4 break-all rounded-lg bg-zinc-800 p-4 text-zinc-300">
            {inviteUrl || "URLを取得中..."}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={copyInviteUrl}
              className="rounded-full bg-green-500 px-6 py-3 font-bold text-black transition hover:bg-green-400"
            >
              招待URLをコピー
            </button>

            <a
              href={`/api/auth/login?roomId=${roomId}`}
              className="rounded-full bg-white px-6 py-3 text-center font-bold text-black transition hover:bg-zinc-200"
            >
              Spotifyでこのルームに参加
            </a>
          </div>

          {copied && (
            <p className="mt-3 text-sm text-green-400">コピーしました。</p>
          )}
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="mb-3 text-xl font-bold">次のステップ</h2>

          {room?.guest ? (
            <div className="space-y-4">
              <p className="text-zinc-300">
                2人が揃いました。この2人のTop Tracksを使って逆Blendプレイリストを作成できます。
              </p>

              <button
                onClick={createReversePlaylist}
                disabled={creatingPlaylist}
                className="rounded-full bg-green-500 px-6 py-3 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-300"
              >
                {creatingPlaylist
                  ? "逆Blendを作成中..."
                  : "逆Blendプレイリストを作成"}
              </button>
            </div>
          ) : (
            <p className="text-zinc-300">
              友達にURLを送り、友達側でSpotifyログインしてもらってください。
            </p>
          )}
        </div>

        <div className="mt-8">
          <a href="/dashboard" className="text-green-400 underline">
            ダッシュボードに戻る
          </a>
        </div>
      </section>
    </main>
  );
}