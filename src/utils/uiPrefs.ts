import { useSyncExternalStore } from 'react';

/** 端末内に保存する小さな表示設定（マスコットのオンオフなど）。変更は全画面に即反映される */
const listeners = new Set<() => void>();

export function getPref<T extends string>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return (v as T) ?? fallback;
  } catch (e) {
    return fallback;
  }
}

export function setPref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
  listeners.forEach((l) => l());
}

export function usePref(key: string, fallback: string): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => getPref(key, fallback)
  );
  return [value, (v: string) => setPref(key, v)];
}

export const PREF_MASCOT = 'melotrace_mascot_v1'; // 'on' | 'off'
export const PREF_MASCOT_TALK = 'melotrace_mascot_talk_v1'; // 'on' | 'off'
