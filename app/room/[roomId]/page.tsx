"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInviteUrl(window.location.href);
  }, []);

  async function copyInviteUrl() {
    if (!inviteUrl) return;

    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm text-zinc-400">Reverse Blend MVP</p>

        <h1 className="mb-6 text-4xl font-bold">招待ルームを作成しました</h1>

        <div className="mb-8 rounded-2xl bg-zinc-900 p-6">
          <h2 className="mb-3 text-xl font-bold">ルームID</h2>
          <p className="break-all text-zinc-300">{roomId}</p>
        </div>

        <div className="mb-8 rounded-2xl bg-zinc-900 p-6">
          <h2 className="mb-3 text-xl font-bold">友達に送るURL</h2>

          <p className="mb-4 break-all rounded-lg bg-zinc-800 p-4 text-zinc-300">
            {inviteUrl || "URLを取得中..."}
          </p>

          <button
            onClick={copyInviteUrl}
            className="rounded-full bg-green-500 px-6 py-3 font-bold text-black transition hover:bg-green-400"
          >
            招待URLをコピー
          </button>

          {copied && (
            <p className="mt-3 text-sm text-green-400">
              コピーしました。
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="mb-3 text-xl font-bold">現在の状態</h2>
          <p className="text-zinc-300">
            友達の参加待ちです。次のステップで、このURLから友達がSpotifyログインできるようにします。
          </p>
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