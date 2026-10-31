/**
 * iOS Safari の下部ツールバーで画面下が隠れる問題への対応。
 * 「レイアウト上の画面の高さ」と「実際に見えている高さ」の差を --bottom-gap として CSS に渡し、
 * 画面下に固定した要素（ナビ・ミニプレイヤー・モーダル）をその分だけ持ち上げる。
 * 端末によって差が出るため、手動の追加補正(--bottom-extra)も足せる。
 */
const EXTRA_KEY = 'melotrace_bottom_extra_v1';

export function getBottomExtra(): number {
  try {
    const v = parseInt(localStorage.getItem(EXTRA_KEY) || '0', 10);
    return isNaN(v) ? 0 : Math.max(0, Math.min(120, v));
  } catch (e) {
    return 0;
  }
}

let autoGap = 0;
function apply() {
  const total = autoGap + getBottomExtra();
  document.documentElement.style.setProperty('--bottom-gap', `${total}px`);
}

export function setBottomExtra(px: number) {
  try {
    localStorage.setItem(EXTRA_KEY, String(Math.max(0, Math.min(120, Math.round(px)))));
  } catch (e) {}
  apply();
}

export function initViewportFix(): () => void {
  const root = document.documentElement;
  const update = () => {
    const vv = window.visualViewport;
    let gap = 0;
    // ピンチ拡大中や、PC版サイト表示(縮小表示)では誤差が大きいので自動補正しない
    if (vv && Math.abs(vv.scale - 1) < 0.02) {
      gap = Math.max(0, Math.round(root.clientHeight - (vv.height + vv.offsetTop)));
      if (gap > 200) gap = 0; // 異常値は無視（キーボード表示中など）
    }
    autoGap = gap;
    apply();
  };
  update();
  const timers = [300, 1000, 2500].map((ms) => setTimeout(update, ms));
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  window.addEventListener('pageshow', update);
  document.addEventListener('visibilitychange', update);
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  return () => {
    timers.forEach(clearTimeout);
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
    window.removeEventListener('pageshow', update);
    document.removeEventListener('visibilitychange', update);
    window.visualViewport?.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('scroll', update);
  };
}
