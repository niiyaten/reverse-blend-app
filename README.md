# Crossfade Mix

## Current Status

Crossfade Mix is currently operated as a private development-mode project for limited testing.
Due to Spotify Extended quota mode requirements, public access is not planned at this stage.

This repository is public for portfolio and learning purposes.
The hosted demo is only available to Spotify users allowlisted in the Spotify Developer Dashboard.
This app is not a public Spotify application.

Crossfade Mix is a web app that creates a private Spotify playlist from two users' listening profiles, focusing on tracks that are less similar between them.

本アプリはSpotify公式サービスではありません。Spotifyによる承認、提携、保証を意味するものではない個人開発アプリです。また、SpotifyアプリのCrossfade機能とも無関係です。

## Hosted Demo

https://reverse-blend-app.vercel.app

## 現在の公開範囲

現在はSpotify Development Modeでのテスト運用中です。利用できるユーザーは、Spotify Developer DashboardのUsers Managementに登録されたテストユーザーに限られます。一般公開Spotifyアプリではありません。

このリポジトリをpullして自分で動かす場合は、自分自身のSpotify Developer App、Supabase Project、Vercel Deployment、環境変数設定が必要です。

## 利用するSpotifyデータ

本アプリは、Spotifyログインを通じて以下の情報を利用します。

- SpotifyユーザーID
- Spotify上の表示名
- Top Tracks
- Top Artists
- Recently Played
- Spotify APIのaccess token / refresh token
- 作成したプレイリスト情報

Spotifyログインを通じてメールアドレスは取得・保存しません。問い合わせフォームでは、返信が必要な場合のみ任意でメールアドレスを入力できます。

## 使用しているSpotify scope

- `user-read-private`
- `user-top-read`
- `user-read-recently-played`
- `playlist-modify-private`

## 法務ページ

- プライバシーポリシー: https://reverse-blend-app.vercel.app/privacy
- 利用規約: https://reverse-blend-app.vercel.app/terms
- 問い合わせフォーム: https://reverse-blend-app.vercel.app/contact

## 問い合わせ・削除依頼

問い合わせや保存データの削除依頼は、以下から連絡してください。

```text
https://reverse-blend-app.vercel.app/contact
```

## 主な機能

- Spotify OAuthログイン
- 招待ルーム作成
- 2人目のSpotifyログインによるルーム参加
- Top Tracks / Top Artists取得
- Top Tracksが空の場合のRecently Played fallback
- 2人の音楽傾向をもとにした選曲スコア計算
- ホスト由来曲とゲスト由来曲の交互配置
- 同一アーティスト、同一アルバムへの偏り抑制
- 作成操作をした参加者のSpotifyアカウントへの非公開プレイリスト作成
- Webアプリ上でのスコア表示
- 問い合わせ・削除依頼フォーム

## コンセプト

通常のレコメンドや共通嗜好ベースのプレイリストでは出会いにくい曲を見つけるため、2人の音楽傾向の違いを利用します。

Crossfade Mixでは、以下のような曲を優先します。

- 由来側ユーザーの好みに近い
- 相手側ユーザーの好みとは少し離れている
- 同じ曲、同じアーティスト、同じアルバムに偏りすぎない

## プレイリスト仕様

作成されるプレイリストは、作成操作をした参加者本人のSpotifyアカウントに非公開プレイリストとして作成されます。ルームの参加者ではない第三者は作成できません。

同じルームで同じ参加者がすでにプレイリストを作成済みの場合は、重複作成せず既存プレイリストURLを返します。また、同じユーザー・同じルームで短時間に作成操作が続く場合は、簡易rate limitにより一時的に拒否します。

初期仕様では最大30曲です。

- ホスト由来: 最大15曲
- ゲスト由来: 最大15曲

基本的には、ホスト由来曲とゲスト由来曲を交互に並べます。

```text
1曲目: ホスト由来
2曲目: ゲスト由来
3曲目: ホスト由来
4曲目: ゲスト由来
...
```

## 技術スタック

- Next.js
- TypeScript
- React
- Tailwind CSS
- Supabase
- PostgreSQL
- Spotify Web API
- Vercel

## 主要ディレクトリ

```text
app/
  api/
    auth/
    contact/
    rooms/
    spotify/
  contact/
  dashboard/
  lib/
  privacy/
  room/
  terms/
```

## 主要API

### Spotifyログイン開始

```text
GET /api/auth/login
GET /api/auth/login?roomId={roomId}
```

`roomId` はSpotify OAuthの `state` に入れてcallbackへ渡します。

### Spotify callback

```text
GET /api/auth/callback/spotify
```

Spotifyから認可コードを受け取り、access token / refresh tokenを取得し、Supabaseの `users` テーブルに保存します。`roomId` がある場合は、対象ルームの `guest_user_id` に保存します。

### プロフィール取得

```text
GET /api/spotify/profile
```

ログイン中ユーザーのSpotifyプロフィールを取得します。

### Top Tracks取得

```text
GET /api/spotify/top-tracks
```

ログイン中ユーザーのTop Tracksを取得します。

### テストプレイリスト作成

```text
POST /api/spotify/create-test-playlist
```

ログイン中ユーザーのTop Tracksから、テスト用プレイリストを作成します。

### ルーム作成

```text
POST /api/rooms/create
```

ログイン中ユーザーをホストとして、Supabaseの `rooms` テーブルに招待ルームを作成します。

### ルーム情報取得

```text
GET /api/rooms/[roomId]
```

指定したルームの参加状況を取得します。

### Crossfade Mixプレイリスト作成

```text
POST /api/rooms/[roomId]/create-reverse-playlist
```

指定したルームのホスト・ゲスト情報をもとに、Crossfade Mixプレイリストを作成します。
作成できるのは対象ルームのホストまたはゲストだけです。作成されたプレイリストは、作成操作をした参加者本人のSpotifyアカウントに保存されます。

### 問い合わせ送信

```text
POST /api/contact
```

問い合わせ、保存データの削除依頼、不具合報告をSupabaseの `contact_requests` テーブルに保存します。テーブル作成SQLは `docs/contact_requests.sql` にあります。

## 環境変数

このリポジトリには、本物の環境変数やsecret keyは含めていません。

ローカルで動かす場合は、`.env.example` を `.env.local` にコピーし、自分の値を入れてください。

```powershell
Copy-Item .env.example .env.local
```

必要な環境変数は以下です。

```env
APP_URL=http://127.0.0.1:3000

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback/spotify

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

APP_SESSION_SECRET=
APP_TOKEN_ENCRYPTION_SECRET=

NEXT_PUBLIC_CONTACT_URL=
NEXT_PUBLIC_CONTACT_LABEL=
```

`APP_URL` は、招待URLやSpotify OAuth callback後の遷移先を作るために使います。ローカルでは `http://127.0.0.1:3000`、Vercelでは自分のデプロイURLを設定してください。

`SPOTIFY_CLIENT_ID`、`SPOTIFY_CLIENT_SECRET`、`SPOTIFY_REDIRECT_URI` は、自分のSpotify Developer Appで発行・設定してください。

`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` はブラウザ側のSupabase Realtime購読に使います。

`SUPABASE_SERVICE_ROLE_KEY` は強い権限を持つため、絶対に `NEXT_PUBLIC_` を付けないでください。

`APP_SESSION_SECRET` はアプリ内セッションCookieの署名に使います。`APP_TOKEN_ENCRYPTION_SECRET` はSupabaseに保存するSpotify tokenの暗号化に使います。本番では推測しにくい長いランダム文字列を設定してください。

`NEXT_PUBLIC_CONTACT_URL` と `NEXT_PUBLIC_CONTACT_LABEL` は任意です。未設定の場合、問い合わせ先はアプリ内の `/contact` になります。

`.env`、`.env.local`、`.env.Vercel` などsecretを含みうるファイルはGitHubへpushしないでください。共有するのは `.env.example` だけです。

## 自分の環境で動かす手順

1. このリポジトリをcloneします。
2. `.env.example` を `.env.local` にコピーします。
3. 自分のSpotify Developer Appを作成し、Client ID、Client Secret、Redirect URIを設定します。
4. 自分のSupabase Projectを作成し、必要なテーブルを作成します。問い合わせテーブルのSQLは `docs/contact_requests.sql` にあります。
5. Supabase Realtimeで `rooms` テーブルのUPDATE配信を有効にします。
6. `npm install` を実行します。
7. `npm run dev` を実行します。
8. Vercelにデプロイする場合は、Vercel Project側にも同じ環境変数を設定します。

## ローカル開発

```powershell
npm run dev
```

PC上では以下を使用します。

```text
http://127.0.0.1:3000
```

Spotify OAuthのRedirect URIと合わせるため、開発中は `127.0.0.1` に統一します。

## Spotify Developer Dashboard設定

ローカル開発では以下のRedirect URIを登録します。

```text
http://127.0.0.1:3000/api/auth/callback/spotify
```

本番では以下を登録します。

```text
https://reverse-blend-app.vercel.app/api/auth/callback/spotify
```

## 現在の制限

### 1. 選曲ロジックは調整中

現在は基本動作の確認を優先しています。よりCrossfade Mixらしい選曲にするには、Top Artists、ジャンル、アーティスト重複、曲重複などのスコア調整が必要です。

### 2. Spotifyアプリ内で曲ごとの由来表示はできない

Spotify Web APIでは、プレイリスト内の各曲に「ホスト由来」「ゲスト由来」のような独自ラベルを付けることはできません。そのため、Webアプリ側の結果画面で由来とスコアを表示します。

### 3. Token refreshは今後改善予定

現在はログイン時に取得したaccess tokenを利用しています。access tokenの期限が切れた場合は、再ログインが必要です。今後、refresh tokenを利用した自動更新処理を追加する予定です。

### 4. Top Tracksが空になることがある

作成直後のSpotifyアカウントではTop Tracksが取得できないことがあります。その場合はRecently Playedをfallbackとして利用します。

## 今後の改善予定

- Crossfade Mixスコアの改善
- Top Artists / genreを使った選曲精度向上
- 由来が分かる簡易結果画面の改善
- access token期限切れ時のrefresh処理
- プレイリスト説明文の改善
- ルームの有効期限設定

## Git運用

作業後は以下で差分を確認します。

```powershell
git status
git diff
```

コミットやpushが必要な場合は、差分内容を確認してから実行します。
