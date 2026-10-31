/**
 * iOS Safari のゴムのような引っ張り（バウンス）を防ぐ。
 *
 * 以前は touchmove のたびに、親要素をたどって getComputedStyle を何度も呼んでいた（1秒に60回以上）。
 * スタイルの再計算を強制するため、スクロール中の負荷と電池消費が大きかった。
 * 今は touchstart で一度だけ判定し、touchmove では判定済みの結果を使うだけにしている。
 */
export function initNoBounceScroll(): () => void {
  let verticalScroller: HTMLElement | null = null;
  let horizontalScroller = false;

  const handleTouchStart = (e: TouchEvent) => {
    verticalScroller = null;
    horizontalScroller = false;
    let el = e.target as HTMLElement | null;
    while (el && el !== document.body && el !== document.documentElement) {
      const cs = window.getComputedStyle(el);
      if (!verticalScroller && (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        verticalScroller = el;
      }
      if (!horizontalScroller && (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth) {
        horizontalScroller = true;
      }
      if (verticalScroller && horizontalScroller) break;
      el = el.parentElement;
    }

    if (verticalScroller) {
      // 端ぴったりで止まっているとバウンスが始まるので、1px内側に寄せる
      const { scrollTop, scrollHeight, clientHeight } = verticalScroller;
      if (scrollTop <= 0) verticalScroller.scrollTop = 1;
      else if (scrollTop + clientHeight >= scrollHeight) verticalScroller.scrollTop = scrollHeight - clientHeight - 1;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (horizontalScroller) return; // 横スクロールできる要素の上では何も妨げない
    // スクロールできない場所では、画面全体が引っ張られないようにする
    if (!verticalScroller && e.cancelable) e.preventDefault();
  };

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  return () => {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
  };
}
