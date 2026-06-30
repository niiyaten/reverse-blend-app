"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const requestTypeOptions = [
  { value: "delete_request", label: "削除依頼" },
  { value: "bug_report", label: "不具合報告" },
  { value: "general", label: "その他の問い合わせ" },
];

export default function ContactPage() {
  const [requestType, setRequestType] = useState("delete_request");
  const [contact, setContact] = useState("");
  const [spotifyDisplayName, setSpotifyDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function submitContactRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSending(true);
      setSuccessMessage("");
      setErrorMessage("");

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestType,
          contact,
          spotifyDisplayName,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "問い合わせの送信に失敗しました。");
      }

      setSuccessMessage("問い合わせを受け付けました。内容を確認します。");
      setContact("");
      setSpotifyDisplayName("");
      setMessage("");
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("不明なエラーが発生しました。");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-2xl">
        <p className="mb-4 text-sm text-zinc-400">Contact</p>

        <h1 className="mb-6 text-4xl font-bold">問い合わせ・削除依頼</h1>

        <p className="mb-8 leading-7 text-zinc-300">
          Crossfade Mixに関する問い合わせ、保存データの削除依頼、不具合報告は
          このフォームから送信してください。返信が必要な場合のみ、連絡先を入力してください。
        </p>

        {successMessage && (
          <div className="mb-6 rounded-lg bg-green-950 p-4 text-green-200">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-lg bg-red-950 p-4 text-red-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={submitContactRequest} className="space-y-6">
          <div>
            <label className="mb-2 block font-bold" htmlFor="requestType">
              問い合わせ種別
            </label>
            <select
              id="requestType"
              value={requestType}
              onChange={(event) => setRequestType(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white"
            >
              {requestTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-bold" htmlFor="contact">
              返信先 任意
            </label>
            <input
              id="contact"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              maxLength={200}
              placeholder="返信が必要な場合のみ入力してください"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-bold" htmlFor="spotifyDisplayName">
              Spotify表示名 任意
            </label>
            <input
              id="spotifyDisplayName"
              value={spotifyDisplayName}
              onChange={(event) => setSpotifyDisplayName(event.target.value)}
              maxLength={120}
              placeholder="削除依頼の確認に使える名前があれば入力してください"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-bold" htmlFor="message">
              内容
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              required
              rows={8}
              placeholder="問い合わせ内容を入力してください"
              className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500"
            />
            <p className="mt-2 text-sm text-zinc-500">
              {message.length}/2000文字
            </p>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="rounded-full bg-green-500 px-8 py-4 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-300"
          >
            {sending ? "送信中..." : "送信する"}
          </button>
        </form>

        <div className="mt-10">
          <Link href="/" className="text-green-400 underline">
            トップに戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
