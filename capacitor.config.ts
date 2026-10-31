import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aoi.melotrace',
  appName: 'MeloTrace',
  webDir: 'dist',
  server: {
    iosScheme: 'https',
    // アプリの中身は、公開中のWeb版を読み込む（YouTube埋め込みを正常に動かすため）
    url: 'https://aoi-avent.github.io/melotrace/',
  },
  ios: {
    // 余白処理はアプリ側の env(safe-area-inset-*) に任せる
    contentInset: 'never',
    backgroundColor: '#090a0f',
    // バックグラウンド再生のため、デスクトップ表示で読み込む
    preferredContentMode: 'desktop',
  },
};

export default config;
