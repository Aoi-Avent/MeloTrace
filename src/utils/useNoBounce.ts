/**
 * Global iOS Safari Rubberband Bounce Elimination
 * Fixes the "端までいくとグニャンとなる挙動" by clamping scrollTop
 * on touchstart/touchmove so iOS Safari never initiates viewport elastic bounce.
 */
export function initNoBounceScroll(): () => void {
  const handleTouchStart = (e: TouchEvent) => {
    let target = e.target as HTMLElement | null;
    let scrollableParent: HTMLElement | null = null;

    while (target && target !== document.body && target !== document.documentElement) {
      const style = window.getComputedStyle(target);
      const overflowY = style.overflowY;
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        target.scrollHeight > target.clientHeight
      ) {
        scrollableParent = target;
        break;
      }
      target = target.parentElement;
    }

    if (!scrollableParent) {
      return;
    }

    // iOS Boundary Clamp: prevent scrollTop from resting at exactly 0 or max scroll
    const { scrollTop, scrollHeight, clientHeight } = scrollableParent;
    if (scrollTop <= 0) {
      scrollableParent.scrollTop = 1;
    } else if (scrollTop + clientHeight >= scrollHeight) {
      scrollableParent.scrollTop = scrollHeight - clientHeight - 1;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    let target = e.target as HTMLElement | null;
    let scrollableParent: HTMLElement | null = null;

    while (target && target !== document.body && target !== document.documentElement) {
      const style = window.getComputedStyle(target);
      const overflowY = style.overflowY;
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        target.scrollHeight > target.clientHeight
      ) {
        scrollableParent = target;
        break;
      }
      target = target.parentElement;
    }

    // If touching on a non-scrollable area, prevent dragging the whole page
    if (!scrollableParent) {
      if (e.cancelable) {
        e.preventDefault();
      }
      return;
    }

    // If scrollable element has no scroll headroom (content fits within container)
    if (scrollableParent.scrollHeight <= scrollableParent.clientHeight) {
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });

  return () => {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
  };
}
