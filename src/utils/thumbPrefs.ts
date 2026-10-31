/** サムネイル・ジャケットの表示設定（大きさ・切り抜き位置・再生画面での位置）。CSS変数として全画面に反映する */
export interface ThumbPrefs {
  scale: number; // 一覧のサムネイルの大きさ (0.7〜1.5)
  x: number; // 切り抜き位置 左右 (0〜100%)
  y: number; // 切り抜き位置 上下 (0〜100%)
  artScale: number; // 再生画面のジャケットの大きさ (0.6〜1.15)
  artY: number; // 再生画面のジャケットの上下位置 (-60〜60px)
}
export const DEFAULT_THUMB: ThumbPrefs = { scale: 1, x: 50, y: 50, artScale: 1, artY: 0 };
const KEY = 'melotrace_thumb_v1';

export function loadThumbPrefs(): ThumbPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object') return { ...DEFAULT_THUMB, ...v };
  } catch (e) {}
  return { ...DEFAULT_THUMB };
}

export function applyThumbPrefs(p: ThumbPrefs) {
  const r = document.documentElement.style;
  r.setProperty('--thumb-scale', String(p.scale));
  r.setProperty('--thumb-x', `${p.x}%`);
  r.setProperty('--thumb-y', `${p.y}%`);
  r.setProperty('--art-scale', String(p.artScale));
  r.setProperty('--art-y', `${p.artY}px`);
}

export function saveThumbPrefs(p: ThumbPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch (e) {}
  applyThumbPrefs(p);
}
