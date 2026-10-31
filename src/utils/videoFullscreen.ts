import { useSyncExternalStore } from 'react';

/** 動画の全画面表示のオン/オフ（アプリ内だけの一時的な状態。保存はしない） */
let fullscreen = false;
const listeners = new Set<() => void>();

export function setVideoFullscreen(value: boolean) {
  if (fullscreen === value) return;
  fullscreen = value;
  listeners.forEach((l) => l());
}

export function useVideoFullscreen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => fullscreen
  );
}
