import { isNativeApp } from './platform';

/** iPhone/iPod のモバイル表示（＝デスクトップ用Webサイトではない）で開いているか */
export function isIOSMobileMode(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (isNativeApp()) return false;
  return /iPhone|iPod/.test(navigator.userAgent);
}

/** iPhone/iPad で「デスクトップ用Webサイト」表示になっているか（UAがMacに見え、タッチ対応） */
export function isIOSDesktopMode(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Macintosh/.test(navigator.userAgent) && (navigator.maxTouchPoints || 0) > 1;
}

export function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
}

/** iPhone / iPad / iPod（デスクトップ表示のiPadも含む）。この端末ではWebから音量を変えられない */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || isIOSDesktopMode();
}
