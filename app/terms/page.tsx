import Link from "next/link";
import { CONTACT_LABEL, CONTACT_URL } from "../lib/contact";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <article className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm text-zinc-400">Terms of Service</p>

        <h1 className="mb-8 text-4xl font-bold">利用規約</h1>

        <div className="space-y-8 text-zinc-300">
          <section>
            <p>
              本利用規約は、Crossfade Mix（以下「本アプリ」）の利用条件を定めるものです。
              本アプリを利用するユーザーは、本利用規約に同意したものとみなします。
            </p>
            <p className="mt-3">
              本アプリはSpotify公式サービスではなく、Spotifyによる承認、提携、保証を意味しません。
              また、SpotifyアプリのCrossfade機能とも無関係です。
            </p>
            <p className="mt-3">
              Crossfade Mixは、Spotifyの音声を再生、編集、ミックス、リミックス、
              クロスフェード、重ね合わせるアプリではありません。Spotify Web APIを利用して、
              2人の音楽傾向をもとに非公開プレイリストを作成するアプリです。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">1. 本アプリの概要</h2>
            <p>
              本アプリは、2人のSpotify上のTop Tracks、Top Artists、Recently Playedなどを利用し、
              互いの音楽傾向の違いをもとに非公開プレイリストを作成するWebアプリです。
            </p>
            <p className="mt-3">
              ユーザーが普段触れにくい楽曲やアーティストとの出会いを楽しむことを目的としています。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">2. 利用条件</h2>
            <p>
              本アプリを利用するには、Spotifyアカウントが必要です。試験運用段階では、
              Spotify Developer Dashboard上で許可されたユーザーのみ利用できる場合があります。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">3. Spotifyアカウント連携</h2>
            <p>
              ユーザーは、Spotify OAuth認証を通じて本アプリとSpotifyアカウントを連携します。
              本アプリは、プレイリスト作成に必要な範囲でSpotify Web APIを利用します。
            </p>
            <p className="mt-3">
              Spotifyアカウントとの連携解除は、Spotifyアカウント内のアプリ連携管理画面から行えます。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">4. 作成されるプレイリスト</h2>
            <p>
              本アプリにより作成されるプレイリストは、作成操作をした参加者本人のSpotifyアカウント上に
              非公開プレイリストとして作成されます。ルームの参加者ではない第三者は作成できません。
            </p>
            <p className="mt-3">
              ただし、Spotify側の仕様変更、API制限、通信エラー、ユーザーのアカウント状態などにより、
              プレイリスト作成が正常に行われない場合があります。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">5. 禁止事項</h2>
            <p>ユーザーは、本アプリの利用にあたり以下の行為を行ってはなりません。</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>法令または公序良俗に反する行為</li>
              <li>他人のSpotifyアカウントを無断で利用する行為</li>
              <li>本アプリ、データベース、外部APIに過度な負荷を与える行為</li>
              <li>本アプリの不具合を悪用する行為</li>
              <li>本アプリの運営、開発、試験利用を妨害する行為</li>
              <li>その他、開発者が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">6. 免責事項</h2>
            <p>
              本アプリは個人開発による試験運用中のサービスです。動作、継続提供、
              作成されるプレイリストの内容や品質について保証しません。
            </p>
            <p className="mt-3">
              本アプリの利用によりユーザーに生じた損害、不利益、データ消失、
              Spotifyアカウント上の変更などについて、開発者は故意または重大な過失がある場合を除き責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">7. 外部サービス</h2>
            <p>
              本アプリは、Spotify Web API、Supabase、Vercelなどの外部サービスを利用しています。
              これら外部サービスの仕様変更、制限、障害、提供終了により、本アプリの全部または一部が
              利用できなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">8. サービス内容の変更・停止</h2>
            <p>
              開発者は、ユーザーへの事前通知なく、本アプリの内容を変更、停止、終了することがあります。
              本アプリは試験運用段階であり、機能や仕様は今後変更される可能性があります。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">9. ユーザーデータの取り扱い</h2>
            <p>
              本アプリにおけるユーザーデータの取り扱いについては、
              <Link href="/privacy" className="text-green-400 underline">
                プライバシーポリシー
              </Link>
              に従います。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">10. 利用規約の変更</h2>
            <p>
              開発者は、必要に応じて本利用規約を変更することがあります。
              重要な変更がある場合は、本アプリ上で分かりやすく告知します。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-white">11. お問い合わせ</h2>
            <p>
              お問い合わせは{" "}
              <a href={CONTACT_URL} className="text-green-400 underline">
                {CONTACT_LABEL}
              </a>
              から連絡してください。
            </p>
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
