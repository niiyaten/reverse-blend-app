import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm font-medium text-zinc-400">
          Spotify Playlist Generator
        </p>

        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          Crossfade Mix
        </h1>

        <p className="mb-8 max-w-xl text-lg leading-8 text-zinc-300">
          2人のSpotify上の音楽傾向をもとに、あえて共通点が少なそうな曲を集めた
          非公開プレイリストを作成します。
        </p>

        <div className="mb-8 rounded-2xl bg-zinc-900 p-5 text-left text-sm leading-7 text-zinc-300">
          <p>
            Crossfade MixはSpotify公式サービスではありません。
            Spotifyとは無関係の個人開発アプリです。
          </p>
          <p className="mt-2">
            SpotifyのTop Tracks、Top Artists、Recently Playedなどを利用して、
            2人の音楽傾向の違いをもとにプレイリストを作成します。
          </p>
          <p className="mt-2">
            利用前に、プライバシーポリシーと利用規約を確認してください。
          </p>
        </div>

        <a
          href="/api/auth/login"
          className="rounded-full bg-green-500 px-8 py-4 font-bold text-black transition hover:bg-green-400"
        >
          Spotifyでログイン
        </a>

        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/privacy" className="text-green-400 underline">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="text-green-400 underline">
            利用規約
          </Link>
        </div>

        <p className="mt-8 text-sm text-zinc-500">
          現在は試験運用中です。Spotify Developer Dashboardで許可されたユーザーのみ利用できる場合があります。
        </p>
      </section>
    </main>
  );
}
