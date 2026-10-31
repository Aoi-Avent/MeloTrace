import { useSyncExternalStore } from 'react';

/**
 * 再生位置・曲の長さ専用の保管場所。
 * 以前は PlayerContext の state だったため、再生位置が動くたびに（0.25〜0.5秒ごと）
 * アプリ全体の画面（ライブラリの数十行など）が描き直されていた。
 * 必要な画面（ミニプレイヤー・再生画面）だけがここを購読するようにして、それ以外は描き直さない。
 */
interface Snap {
  currentTime: number;
  duration: number;
}
let snap: Snap = { currentTime: 0, duration: 210 };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const timeStore = {
  get: (): Snap => snap,
  setCurrentTime(v: number | ((prev: number) => number)) {
    const next = typeof v === 'function' ? v(snap.currentTime) : v;
    if (next === snap.currentTime) return;
    snap = { ...snap, currentTime: next };
    emit();
  },
  setDuration(v: number | ((prev: number) => number)) {
    const next = typeof v === 'function' ? v(snap.duration) : v;
    if (next === snap.duration) return;
    snap = { ...snap, duration: next };
    emit();
  },
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};

export function usePlayerTime(): Snap {
  return useSyncExternalStore(timeStore.subscribe, timeStore.get);
}
