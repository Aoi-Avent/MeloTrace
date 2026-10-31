# MeloTrace を iOS アプリにする手順（Capacitor）

> **現在の構成（2026-10 時点）**
> - アプリの中身は、公開中のWeb版（`capacitor.config.ts` の `server.url`）を読み込みます。画面や機能の更新は、GitHubに反映すれば、アプリ側のビルドなしで届きます。
> - Info.plist（URLスキーム、バックグラウンド音声）や `capacitor.config.ts` を変えたときだけ、`npm run ios:sync` → Xcodeで ▶ が必要です。
> - GitHub Actions の変数に `VITE_GOOGLE_CLIENT_ID`（Web用）と `VITE_GOOGLE_IOS_CLIENT_ID`（iOS用）の両方が必要です。


React + Vite の Web アプリを [Capacitor](https://capacitorjs.com/) で iOS アプリ（WKWebView）にします。
Web 版は今まで通り動きます（iOS 専用コードは `isNativeApp()` が true のときだけ動作）。

## 必要なもの
- Mac + Xcode（最新版）、Node.js 20 以上
- 実機で動かすだけなら無料の Apple ID でOK（7日ごとに再署名）。TestFlight / App Store は Apple Developer Program（年額 99 USD）が必要

## 1. Googleログインの準備（アプリ内でクラウド保存を使う場合）
1. [Google Cloud Console](https://console.cloud.google.com/) で **Google Drive API** を有効化
2. 「OAuth 同意画面」で `.../auth/drive.appdata` スコープを追加
   - 公開ステータスが「テスト」のままだと、**リフレッシュトークンが7日で失効**します。使い続けるなら「本番環境に公開」にしてください（`drive.appdata` は審査不要のスコープです）
3. 「認証情報」→「OAuth クライアント ID を作成」→ 種類 **iOS**、バンドルID は `capacitor.config.ts` の `appId` と同じものを入力
4. 発行されたクライアントIDを `.env.local` に書く
   ```
   VITE_GOOGLE_IOS_CLIENT_ID="xxxxxxxx.apps.googleusercontent.com"
   ```
   （Web 版用の `VITE_GOOGLE_CLIENT_ID` はそのまま。別のIDです）

## 2. セットアップ
`capacitor.config.ts` の `appId`（例 `com.example.melotrace`）を自分のものに変更してから:
```bash
./scripts/setup-ios.sh
```
依存インストール → ビルド → `ios/` 作成 → 設定の自動反映 → Xcode 起動、まで行います。
自動で入る設定（`scripts/patch-ios.py`、何度実行しても安全）:
- Info.plist: バックグラウンド音声（`UIBackgroundModes = audio`）
- Info.plist: Googleログインの戻り先 URL スキーム（`.env.local` のクライアントIDから生成）
- AppDelegate.swift: オーディオセッションを「再生」カテゴリに設定

Web 側を直したあとの反映:
```bash
npm run ios:sync   # ビルド → ios/ に反映 → 設定を再適用
npm run ios:open   # Xcode を開く
```
**setup-ios.sh が `package.json` に Capacitor の依存を追加します。** GitHub Pages の自動デプロイも、この `package.json` / `package-lock.json` をコミットしてから動かしてください（コミット前は Web 版のビルドが失敗します）。

## 3. 手動で必要な作業
1. Xcode: App ターゲット → Signing & Capabilities → Team を選び、Bundle Identifier を `appId` と一致させる
2. アイコン（1024×1024）を `ios/App/App/Assets.xcassets` に設定
3. （App Store 公開時）輸出コンプライアンス: HTTPS のみの利用なら通常は免除対象です。毎回の質問を省くなら Info.plist の `ITSAppUsesNonExemptEncryption` を自己判断で設定

## 実装した iOS 対応
| 内容 | 実装 |
|---|---|
| Googleログイン | OAuth 2.0 + PKCE。システムのブラウザ画面で認証し、カスタムURLスキームでアプリに戻る。リフレッシュトークンを保存して1時間ごとの更新は無操作 |
| JSON/MHTML の保存 | WKWebView では `<a download>` が動かないため、共有シート経由（`nativeFile.ts`） |
| バックグラウンド再生の土台 | Info.plist + オーディオセッション設定 |
| ステータスバー | テーマ（ライト/ダーク）に合わせて文字色を切り替え |
| データ保護 | 容量逼迫時に IndexedDB/localStorage が消されにくくなるよう永続化を要求 |
| アプリ内で不要な案内の非表示 | Safari 用「バックグラウンド再生」手順、モバイル表示バナー、広告ブロック拡張の案内 |

## 未検証・要注意（この環境ではビルド・実機テストができていません）
1. **Googleログイン**: 型チェックと PKCE の計算（RFC 7636 のテストベクタ）は確認済みですが、実際のログインは未確認です。うまく戻ってこない場合は Xcode のログと、Info.plist の URL スキームが `com.googleusercontent.apps.<クライアントIDの前半>` になっているかを確認してください
2. **YouTube 再生**: アプリ内の origin は `https://localhost`。再生できない（エラー 153 など）場合は `capacitor.config.ts` の `server.hostname` に自分のドメインを設定して試してください
3. **画面ロック中の再生**: YouTube の IFrame プレイヤーは、バックグラウンドで停止することがあります。無音ループ（`audioKeepAlive.ts`）はアプリ版でも有効のままですが、効果は実機で確認してください（アプリ版では keep-alive の切り替えUIを非表示にしています）
4. **ロック画面のコントロール**: 既存の Media Session API をそのまま使います。ネイティブの Now Playing 連携は入れていません

## App Store 公開を考える場合のリスク
- YouTube の API 利用規約は、埋め込みプレイヤーのバックグラウンド再生や広告回避を前提にした機能を認めていません。アプリ版では案内 UI を隠しましたが、機能自体が残っていれば審査・規約上の問題は残ります
- Web アプリを包んだだけのアプリは Guideline 4.2（最低限の機能）で指摘されることがあります
- プライバシーポリシーの公開 URL が必要です（`public/privacy.html` を公開すれば流用できます）

個人利用や TestFlight の少人数配布が目的なら、上記のリスクはかなり小さくなります。
