/**
 * iPhoneの「画面最上部（時刻やバッテリーの表示）をタップすると先頭へ戻る」操作に対応する。
 * このアプリは固定レイアウトで内側の領域がスクロールするため、そのままでは反応しない。
 * そこで、見えない縦長のページ(window)をわざと少しスクロールした状態にしておき、
 * ステータスバーのタップで window が先頭へ戻されたことを検知して、画面内のスクロール領域を先頭へ動かす。
 */
const REST = 120;

function findActiveScroller(): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>('.ios-scroll-container'));
  // 後から表示されたもの（モーダル等）を優先し、実際に表示されていて、スクロールできるものを選ぶ
  for (let i = all.length - 1; i >= 0; i--) {
    const el = all[i];
    if (el.offsetParent !== null && el.scrollHeight > el.clientHeight + 1) return el;
  }
  return null;
}

export function initStatusBarScrollTop(): () => void {
  let enabled = true;
  try {
    enabled = localStorage.getItem('melotrace_statusbar_top_v1') !== 'off';
  } catch (e) {}
  if (!enabled) return () => {};

  let ignore = false;
  const rest = () => {
    ignore = true;
    window.scrollTo(0, REST);
    setTimeout(() => {
      ignore = false;
    }, 120);
  };
  let lastBlurAt = 0;
  const onBlur = () => {
    lastBlurAt = Date.now();
  };
  const onScroll = () => {
    if (ignore) return;
    // 文字入力中・入力直後のキーボード開閉による画面のずれは無視する
    const ae = document.activeElement as HTMLElement | null;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    if (Date.now() - lastBlurAt < 800) {
      rest();
      return;
    }
    if (window.scrollY < REST / 2) {
      const el = findActiveScroller();
      if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
      rest();
    }
  };
  rest();
  const t = setTimeout(rest, 600);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('focusout', onBlur, true);
  window.addEventListener('pageshow', rest);
  document.addEventListener('visibilitychange', rest);
  return () => {
    clearTimeout(t);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('focusout', onBlur, true);
    window.removeEventListener('pageshow', rest);
    document.removeEventListener('visibilitychange', rest);
  };
}
