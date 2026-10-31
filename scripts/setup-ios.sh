#!/usr/bin/env bash
# MeloTrace iOS 初期セットアップ（Mac + Xcode が必要）
set -euo pipefail
cd "$(dirname "$0")/.."

if ! grep -qs 'VITE_GOOGLE_IOS_CLIENT_ID=.\+' .env.local .env 2>/dev/null && [ -z "${VITE_GOOGLE_IOS_CLIENT_ID:-}" ]; then
  echo "注意: VITE_GOOGLE_IOS_CLIENT_ID が未設定です。アプリ内のGoogleログインは使えません。"
  echo "      .env.local に VITE_GOOGLE_IOS_CLIENT_ID=\"xxxx.apps.googleusercontent.com\" を書いて再実行できます。"
  echo
fi

npm install
npm install @capacitor/core @capacitor/app @capacitor/browser @capacitor/filesystem \
            @capacitor/preferences @capacitor/share @capacitor/status-bar
npm install -D @capacitor/cli @capacitor/ios

npm run build
rm -f dist/*.zip   # 配布用zipをアプリ本体に含めない

[ -d ios ] || npx cap add ios
npx cap sync ios
python3 scripts/patch-ios.py   # Info.plist / AppDelegate の設定

echo
echo "完了。IOS_SETUP.md の「手動で必要な作業」を確認してから Xcode で実行してください。"
npx cap open ios
