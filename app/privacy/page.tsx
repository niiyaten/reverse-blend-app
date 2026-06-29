import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <article className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm text-zinc-400">Privacy Policy</p>

        <h1 className="mb-8 text-4xl font-bold">プライバシーポリシー</h1>

        <div className="space-y-8 text-zinc-300">
          <section>
            <p>
              本プライバシーポリシーは、Crossfade Mix（以下「本アプリ」）における
              ユーザー情報の取得、利用、保存、管理について説明するものです。
            </p>
            <p className="mt-3">
              本アプリはSpotify公式サービスではなく、Spotifyとは無関係の個人開発アプリです。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">1. 取得する情報</h2>
            <p>本アプリは、Spotifyログインを通じて以下の情報を取得する場合があります。</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>SpotifyユーザーID</li>
              <li>Spotify上の表示名</li>
              <li>Top Tracks</li>
              <li>Top Artists</li>
              <li>Recently Played</li>
              <li>Spotify APIのaccess tokenおよびrefresh token</li>
              <li>作成したプレイリストのIDおよびURL</li>
              <li>招待ルームに関する情報</li>
            </ul>
            <p className="mt-3">
              本アプリは、Spotifyアカウントのメールアドレスを取得・保存しません。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">2. 利用目的</h2>
            <p>取得した情報は、以下の目的で利用します。</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Spotifyログイン機能の提供</li>
              <li>招待ルームの作成および参加状況の管理</li>
              <li>2人の音楽傾向の比較</li>
              <li>共通点が少なそうな非公開プレイリストの作成</li>
              <li>作成済みプレイリスト情報の保存</li>
              <li>不具合調査および機能改善</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">3. 保存する情報</h2>
            <p>
              本アプリでは、ユーザー識別、ルーム管理、プレイリスト作成のために、
              SpotifyユーザーID、表示名、token、ルーム情報、作成済みプレイリスト情報を保存します。
            </p>
            <p className="mt-3">
              保存先にはSupabaseを利用します。また、本アプリのホスティングにはVercelを利用します。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">4. 第三者提供</h2>
            <p>
              本アプリは、取得したユーザーデータを広告目的で販売したり、第三者へ販売したりしません。
              ただし、本アプリの提供に必要な範囲で、Spotify API、Supabase、Vercelなどの外部サービスを利用します。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">5. データの削除</h2>
            <p>
              ユーザーは、本アプリに保存された自身のデータの削除を依頼できます。
              削除依頼を受けた場合、合理的な範囲で関連するユーザー情報、ルーム情報、
              プレイリスト記録を削除します。
            </p>
            <p className="mt-3">
              削除依頼の連絡先は、公開用の問い合わせ手段を準備後に本ページへ記載します。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">6. Spotifyとの関係</h2>
            <p>
              本アプリはSpotify Web APIを利用していますが、Spotify公式サービスではありません。
              Spotifyによる承認、提携、保証を意味するものではありません。
            </p>
            <p className="mt-3">
              Spotifyアカウントとの連携解除は、Spotifyアカウント内のアプリ連携管理画面から行えます。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">7. 注意事項</h2>
            <p>
              本アプリは個人開発の試験運用段階です。Spotify API、Supabase、Vercelなど
              外部サービスの仕様変更や障害により、機能が変更、停止、または利用できなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">8. 改定</h2>
            <p>
              本プライバシーポリシーは、必要に応じて変更される場合があります。
              重要な変更がある場合は、本アプリ上で分かりやすく告知します。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">9. お問い合わせ</h2>
            <p>お問い合わせ先は、公開用の連絡手段を準備後に記載します。</p>
          </section>

          <section>
            <p className="text-sm text-zinc-500">制定日：2026年6月29日</p>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-green-400 underline">
            トップに戻る
          </Link>
        </div>
      </article>
    </main>
  );
}
