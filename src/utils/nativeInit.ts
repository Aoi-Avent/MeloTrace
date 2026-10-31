import { isNativeApp } from './platform';

/** iOSアプリ起動時の初期化（Webでは何もしない） */
export async function initNative(): Promise<void> {
  if (!isNativeApp()) return;
  document.documentElement.classList.add('native-app');

  // WKWebViewの保存領域（IndexedDB/localStorage）が容量逼迫時に消されにくいよう要求する
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* 非対応 */
  }

  // ステータスバーの文字色をアプリのテーマに合わせる（Style.Dark = 白文字）
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const apply = () => {
      const mode = document.documentElement.getAttribute('data-theme-mode');
      StatusBar.setStyle({ style: mode === 'light' ? Style.Light : Style.Dark }).catch(() => {});
    };
    apply();
    new MutationObserver(apply).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme-mode'],
    });
  } catch {
    /* プラグイン未導入 */
  }
}
