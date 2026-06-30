# Crossfade Mix

Crossfade Mix is a web app that creates a private Spotify playlist from two users' listening profiles, focusing on tracks that are less similar between them.

本アプリはSpotify公式サービスではありません。Spotifyによる承認、提携、保証を意味するものではない個人開発アプリです。

## Production URL

https://reverse-blend-app.vercel.app

## 現在の公開範囲

現在はSpotify Development Modeでのテスト運用中です。利用できるユーザーは、Spotify Developer DashboardのUsers Managementに登録されたテストユーザーに限られる場合があります。一般公開には、SpotifyのExtended quota mode申請が必要です。

## 利用するSpotifyデータ

本アプリは、Spotifyログインを通じて以下の情報を利用します。

- SpotifyユーザーID
- Spotify上の表示名
- Top Tracks
- Top Artists
- Recently Played
- Spotify APIのaccess token / refresh token
- 作成したプレイリスト情報

メールアドレスは取得・保存しません。

## 使用しているSpotify scope

- `user-read-private`
- `user-top-read`
- `user-read-recently-played`
- `playlist-modify-private`

## 法務ページ

- プライバシーポリシー: https://reverse-blend-app.vercel.app/privacy
- 利用規約: https://reverse-blend-app.vercel.app/terms

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

## コンセプト

通常のレコメンドや共通嗜好ベースのプレイリストでは出会いにくい曲を見つけるため、2人の音楽傾向の違いを利用します。

Crossfade Mixでは、以下のような曲を優先します。

- 由来側ユーザーの好みに近い
- 相手側ユーザーの好みとは少し離れている
- 同じ曲、同じアーティスト、同じアルバムに偏りすぎない

## プレイリスト仕様

作成されるプレイリストは、作成操作をした参加者本人のSpotifyアカウントに非公開プレイリストとして作成されます。ルームの参加者ではない第三者は作成できません。

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
    rooms/
    spotify/
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

## 環境変数

`.env.local` に以下を設定します。

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback/spotify
APP_URL=http://127.0.0.1:3000
APP_SESSION_SECRET=
APP_TOKEN_ENCRYPTION_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` は強い権限を持つため、絶対に `NEXT_PUBLIC_` を付けないでください。

`APP_SESSION_SECRET` はアプリ内セッションCookieの署名に使います。`APP_TOKEN_ENCRYPTION_SECRET` はSupabaseに保存するSpotify tokenの暗号化に使います。本番では推測しにくい長いランダム文字列を設定してください。

`.env.local` や `.env.Vercel` はGitHubへpushしないでください。

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
