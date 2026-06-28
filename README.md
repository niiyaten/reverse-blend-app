# 逆Blend

## 概要

逆Blendは、2人のSpotifyアカウントを連携し、通常のSpotify Blendとは逆に、**あえて共通点が少なそうな曲を集めたプレイリスト**を作成するWebアプリです。

通常のBlendが「2人の好みを混ぜる」方向であるのに対し、本アプリでは「2人の音楽性のズレ」を楽しむことを目的としています。

作成されたプレイリストは、ホスト側のSpotifyアカウントに非公開プレイリストとして作成されます。

---

## コンセプト

### 通常のBlend

* 2人の好みを混ぜる
* 共通して楽しめそうな曲を集める
* 相性の良さを楽しむ

### 逆Blend

* 2人の好みのズレを見る
* 相手が普段聴かなそうな曲を集める
* 「これはどちら由来の曲か」を交互配置で楽しむ

---

## 現在の主な機能

### 実装済み

* Spotify OAuthログイン
* Spotifyプロフィール取得
* Spotify Top Tracks取得
* Top Tracksが空の場合のRecently Played fallback
* Supabaseへのユーザー情報保存
* 招待ルーム作成
* 招待URL発行
* 2人目のSpotifyログインによるルーム参加
* 2人分のSpotifyデータ取得
* 逆Blendプレイリスト作成
* ホスト側Spotifyアカウントへの非公開プレイリスト作成
* プレイリストへの曲追加
* 作成済みプレイリストURLのSupabase保存

---

## プレイリスト仕様

### 作成先

プレイリストは、ルームを作成したホスト側のSpotifyアカウントに作成されます。

### 公開範囲

現在は非公開プレイリストとして作成します。

```ts
public: false
```

### 曲数

初期仕様では最大20曲です。

* ホスト由来：最大10曲
* ゲスト由来：最大10曲

### 並び順

基本的に以下のように交互に並べます。

```text
1曲目：ホスト由来
2曲目：ゲスト由来
3曲目：ホスト由来
4曲目：ゲスト由来
...
```

今後の改善方針として、各ユーザー内では「相手との共通点が少ない順」に並べる想定です。

---

## 選曲ロジック

現在の選曲ロジックは開発中です。

基本方針は以下です。

1. 各ユーザーのTop Tracksを取得する
2. Top Tracksが空の場合はRecently Playedを使用する
3. 相手と同じ曲・同じアーティストを避ける
4. Top Artistsやジャンル情報を使い、相手の傾向から遠そうな曲を優先する
5. ホスト由来曲とゲスト由来曲を交互に並べる

現時点では、選曲精度はまだ調整段階です。
まずは「2人ログインしてSpotify上にプレイリストを作成する」ことを優先して実装しています。

---

## 技術スタック

### フロントエンド

* Next.js
* TypeScript
* React
* Tailwind CSS

### バックエンド

* Next.js Route Handlers

### データベース

* Supabase
* PostgreSQL

### 外部API

* Spotify Web API

### ホスティング想定

* ローカル開発：Next.js dev server
* 公開時：Vercel想定

---

## ディレクトリ構成

主な構成は以下です。

```text
app
├─ api
│  ├─ auth
│  │  ├─ login
│  │  │  └─ route.ts
│  │  └─ callback
│  │     └─ spotify
│  │        └─ route.ts
│  ├─ spotify
│  │  ├─ profile
│  │  │  └─ route.ts
│  │  ├─ top-tracks
│  │  │  └─ route.ts
│  │  └─ create-test-playlist
│  │     └─ route.ts
│  └─ rooms
│     ├─ create
│     │  └─ route.ts
│     └─ [roomId]
│        ├─ route.ts
│        └─ create-reverse-playlist
│           └─ route.ts
├─ dashboard
│  └─ page.tsx
├─ lib
│  ├─ supabase.ts
│  └─ supabase-server.ts
├─ room
│  └─ [roomId]
│     └─ page.tsx
└─ page.tsx
```

---

## 画面仕様

### トップ画面

URL：

```text
/
```

機能：

* アプリ概要を表示
* Spotifyログインボタンを表示

---

### ダッシュボード画面

URL：

```text
/dashboard
```

機能：

* Spotifyログイン済みユーザーのプロフィール表示
* Top Tracks表示
* テストプレイリスト作成
* 招待ルーム作成

---

### ルーム画面

URL：

```text
/room/[roomId]
```

機能：

* ルームID表示
* ホスト表示
* ゲスト表示
* 招待URL表示
* 招待URLコピー
* Spotifyでこのルームに参加
* 2人が揃った場合、逆Blendプレイリスト作成ボタンを表示

---

## API仕様

### Spotifyログイン開始

```text
GET /api/auth/login
```

通常ログイン用。

```text
GET /api/auth/login?roomId={roomId}
```

ルーム参加用。
`roomId` はSpotify OAuthの `state` に入れてcallbackへ渡します。

---

### Spotify callback

```text
GET /api/auth/callback/spotify
```

処理内容：

* Spotifyから認可コードを受け取る
* access_token / refresh_token を取得する
* Spotifyプロフィールを取得する
* Supabaseの `users` テーブルにユーザー情報を保存する
* `roomId` がある場合は、対象ルームの `guest_user_id` に保存する
* Cookieに `spotify_access_token` と `app_user_id` を保存する

---

### プロフィール取得

```text
GET /api/spotify/profile
```

ログイン中ユーザーのSpotifyプロフィールを取得します。

---

### Top Tracks取得

```text
GET /api/spotify/top-tracks
```

ログイン中ユーザーのTop Tracksを取得します。

---

### テストプレイリスト作成

```text
POST /api/spotify/create-test-playlist
```

ログイン中ユーザーのTop Tracksから、テスト用プレイリストを作成します。

---

### ルーム作成

```text
POST /api/rooms/create
```

ログイン中ユーザーをホストとして、Supabaseの `rooms` テーブルに招待ルームを作成します。

---

### ルーム情報取得

```text
GET /api/rooms/[roomId]
```

指定したルームの参加状況を取得します。

---

### 逆Blendプレイリスト作成

```text
POST /api/rooms/[roomId]/create-reverse-playlist
```

指定したルームのホスト・ゲスト情報をもとに、逆Blendプレイリストを作成します。

---

## Supabaseテーブル仕様

### users

Spotifyログインしたユーザー情報を保存します。

| カラム名             | 内容                    |
| ---------------- | --------------------- |
| id               | アプリ内ユーザーID            |
| spotify_user_id  | SpotifyユーザーID         |
| display_name     | Spotify表示名            |
| email            | Spotify登録メール          |
| access_token     | Spotify access token  |
| refresh_token    | Spotify refresh token |
| token_expires_at | token有効期限             |
| created_at       | 作成日時                  |
| updated_at       | 更新日時                  |

---

### rooms

招待ルーム情報を保存します。

| カラム名          | 内容              |
| ------------- | --------------- |
| id            | ルームID           |
| host_user_id  | ホストユーザーID       |
| guest_user_id | ゲストユーザーID       |
| status        | waiting / ready |
| created_at    | 作成日時            |
| updated_at    | 更新日時            |

---

### playlists

作成したプレイリスト情報を保存します。

| カラム名                 | 内容               |
| -------------------- | ---------------- |
| id                   | アプリ内プレイリストID     |
| room_id              | 紐づくルームID         |
| spotify_playlist_id  | SpotifyプレイリストID  |
| spotify_playlist_url | SpotifyプレイリストURL |
| created_by_user_id   | 作成したユーザーID       |
| created_at           | 作成日時             |

---

## 環境変数

`.env.local` に以下を設定します。

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback/spotify
APP_URL=http://127.0.0.1:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### 注意

`SUPABASE_SERVICE_ROLE_KEY` は強い権限を持つため、絶対に `NEXT_PUBLIC_` を付けないこと。

NG例：

```env
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=
```

また、`.env.local` はGitHubにpushしないこと。

---

## ローカル開発

### 起動

```powershell
npm run dev
```

### アクセス

PC上では以下を使用します。

```text
http://127.0.0.1:3000
```

### 注意

`localhost` と `127.0.0.1` はCookie上は別扱いになる場合があります。
Spotify OAuthのRedirect URIと合わせるため、開発中は `127.0.0.1` に統一します。

---

## スマホ確認について

PCの開発サーバーは、同じWi-Fi内であれば以下のようなNetwork URLからスマホで見られる場合があります。

```text
http://192.168.x.x:3000
```

ただし、Spotify OAuthのRedirect URIが `127.0.0.1` の場合、スマホ側でSpotifyログインまで完了させることはできません。

スマホからSpotifyログインまで確認するには、以下のいずれかが必要です。

* VercelなどにデプロイしてHTTPS URLを使う
* ngrokやCloudflare Tunnelでローカル環境を一時的にHTTPS公開する

---

## Spotify Developer Dashboard設定

### Redirect URI

ローカル開発では以下を登録します。

```text
http://127.0.0.1:3000/api/auth/callback/spotify
```

### Development Modeの制約

Spotify DeveloperアプリがDevelopment Modeの場合、使用できるユーザーは事前登録が必要です。

サブアカウントや友達のアカウントでテストする場合は、Spotify Developer DashboardのUsers Managementに、そのSpotifyアカウントのメールアドレスを追加します。

---

## 必要なSpotify Scope

現在利用しているscopeは以下です。

```text
user-read-private
user-read-email
user-top-read
user-read-recently-played
playlist-modify-private
```

### 各scopeの用途

| scope                     | 用途                         |
| ------------------------- | -------------------------- |
| user-read-private         | ユーザー基本情報取得                 |
| user-read-email           | メールアドレス取得                  |
| user-top-read             | Top Tracks / Top Artists取得 |
| user-read-recently-played | Recently Played取得          |
| playlist-modify-private   | 非公開プレイリスト作成・曲追加            |

---

## 現在の制約

### 1. 選曲ロジックは調整中

現在は、アプリの基本動作確認を優先しています。
本当に「逆Blendらしい」選曲にするには、Top Artists、ジャンル、アーティスト重複、曲重複などのスコア調整が必要です。

---

### 2. Spotifyアプリ内で曲ごとの由来表示はできない

Spotify Web APIでは、プレイリスト内の各曲に「ホスト由来」「ゲスト由来」のような独自ラベルを付けることはできません。

そのため、Spotify上では以下のように表現します。

```text
奇数曲：ホスト由来
偶数曲：ゲスト由来
```

曲ごとの由来を明確に表示したい場合は、自作Webアプリ側の結果画面で補足表示する必要があります。

---

### 3. Token refreshは今後改善予定

現在はログイン時に取得したaccess_tokenを利用しています。
access_tokenの期限が切れた場合は、再ログインが必要です。

今後、refresh_tokenを利用した自動更新処理を追加する予定です。

---

### 4. サブアカウントはTop Tracksが空になりやすい

作成直後のSpotifyアカウントではTop Tracksが取得できないことがあります。
その場合はRecently Playedをfallbackとして利用します。

---

## 今後の改善予定

### 優先度高

* 逆Blendスコアの改善
* Top Artists / genre を使った選曲精度向上
* 由来が分かる簡易結果画面の追加
* access_token期限切れ時のrefresh処理
* プレイリスト説明文の改善

### 優先度中

* 既存ルームの再読み込み
* 作成済みプレイリストの再表示
* ルームの有効期限設定
* エラー文の改善
* スマホ表示の調整

### 優先度低

* SNS共有
* 3人以上対応
* 公開用ランディングページ
* Spotify審査用README / Privacy Policy整備
* Vercelデプロイ

---

## 開発メモ

### 現在の到達点

* 2人でSpotifyログインできる
* Supabaseにユーザー情報を保存できる
* 招待ルームを作成できる
* ゲスト参加できる
* 2人分の曲データからプレイリストを作成できる
* Spotify上に非公開プレイリストを作成できる

### 次にやること

次の開発テーマは、**選曲ロジックを逆Blendらしくすること**です。

具体的には、

```text
1. ホスト由来曲とゲスト由来曲を交互に並べる
2. 各ユーザー内で、相手との共通点が少ない順に並べる
3. Top Artists / genre を用いて距離スコアを改善する
4. プレイリスト説明文に「奇数曲・偶数曲」の意味を書く
```

を行います。

---

## Git運用

作業後は以下でGitHubへ反映します。

```powershell
git status
git add .
git commit -m "変更内容を表すメッセージ"
git push
```

`.env.local` が `git status` に表示されていないことを確認してからpushします。
