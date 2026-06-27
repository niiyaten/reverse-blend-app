export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm font-medium text-zinc-400">
          Spotify Playlist Generator
        </p>

        <h1 className="mb-6 text-5xl font-bold tracking-tight">逆Blend</h1>

        <p className="mb-10 max-w-xl text-lg leading-8 text-zinc-300">
          友達とのSpotifyの音楽傾向から、あえて共通点の少ない曲を集めた
          プレイリストを作成します。
        </p>

        <a
          href="/api/auth/login"
          className="rounded-full bg-green-500 px-8 py-4 font-bold text-black transition hover:bg-green-400"
        >
          Spotifyでログイン
        </a>

        <p className="mt-8 text-sm text-zinc-500">
          まずは自分と友達1人で使えるMVPとして開発中です。
        </p>
      </section>
    </main>
  );
}