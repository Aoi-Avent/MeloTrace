import React, { useCallback, useMemo, useRef, useState } from 'react';
import { X, ChevronRight, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { MusicTrack } from '../types/music';
import { usePlayerTime } from '../utils/timeStore';

type ScreenId = string; // 'root' | 'now' | 'songs' | 'artists' | 'artist:<name>' | 'favorites' | 'playlists' | 'pl:<id>' | 'settings'

interface MenuItem {
  label: string;
  sub?: string;
  chevron?: boolean;
  onSelect: () => void;
}

const collator = new Intl.Collator('ja', { sensitivity: 'base', numeric: true });
const MAX_ROWS = 400; // 小さい画面でも固まらないよう上限

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export const RetroPlayer: React.FC = () => {
  const {
    isRetroPlayerOpen,
    setIsRetroPlayerOpen,
    retroPlayerSkin,
    setRetroPlayerSkin,
    musicTracks,
    playlists,
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    playTrack,
    setIsShuffle,
    isShuffle,
  } = usePlayer();
  const { currentTime, duration } = usePlayerTime();

  const [stack, setStack] = useState<ScreenId[]>(['root']);
  const [cursors, setCursors] = useState<Record<string, number>>({});
  const screen = stack[stack.length - 1];
  const isIpod = retroPlayerSkin === 'ipod';

  const push = useCallback((id: ScreenId) => setStack((s) => [...s, id]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  const play = useCallback(
    (t: MusicTrack, list: MusicTrack[]) => {
      playTrack(t, list, false);
      setStack((s) => (s[s.length - 1] === 'now' ? s : [...s, 'now']));
    },
    [playTrack]
  );

  const items: MenuItem[] = useMemo(() => {
    const trackItems = (list: MusicTrack[]): MenuItem[] =>
      list.slice(0, MAX_ROWS).map((t) => ({ label: t.title, sub: t.artist, onSelect: () => play(t, list) }));

    if (screen === 'root') {
      return [
        { label: '再生中', chevron: true, onSelect: () => push('now') },
        { label: '曲', sub: `${musicTracks.length}`, chevron: true, onSelect: () => push('songs') },
        { label: 'アーティスト', chevron: true, onSelect: () => push('artists') },
        { label: 'お気に入り', chevron: true, onSelect: () => push('favorites') },
        { label: 'プレイリスト', chevron: true, onSelect: () => push('playlists') },
        {
          label: `シャッフル再生`,
          sub: isShuffle ? 'オン' : 'オフ',
          onSelect: () => {
            if (musicTracks.length === 0) return;
            setIsShuffle(true);
            play(musicTracks[Math.floor(Math.random() * musicTracks.length)], musicTracks);
          },
        },
        { label: '設定', chevron: true, onSelect: () => push('settings') },
      ];
    }
    if (screen === 'songs') {
      const list = [...musicTracks].sort((a, b) => collator.compare(a.title, b.title));
      return trackItems(list);
    }
    if (screen === 'favorites') return trackItems(musicTracks.filter((t) => t.isFavorite));
    if (screen === 'artists') {
      const map = new Map<string, number>();
      musicTracks.forEach((t) => map.set(t.artist, (map.get(t.artist) || 0) + 1));
      return Array.from(map.entries())
        .sort((a, b) => collator.compare(a[0], b[0]))
        .slice(0, MAX_ROWS)
        .map(([name, n]) => ({ label: name, sub: `${n}`, chevron: true, onSelect: () => push('artist:' + name) }));
    }
    if (screen.startsWith('artist:')) {
      const name = screen.slice(7);
      return trackItems(musicTracks.filter((t) => t.artist === name));
    }
    if (screen === 'playlists') {
      return playlists.map((pl) => ({ label: pl.name, sub: `${pl.trackIds.length}`, chevron: true, onSelect: () => push('pl:' + pl.id) }));
    }
    if (screen.startsWith('pl:')) {
      const pl = playlists.find((p) => p.id === screen.slice(3));
      const byId = new Map(musicTracks.map((t) => [t.id, t]));
      const list = (pl?.trackIds || []).map((id) => byId.get(id)).filter((t): t is MusicTrack => Boolean(t));
      return trackItems(list);
    }
    if (screen === 'settings') {
      return [
        { label: 'スキン', sub: isIpod ? 'iPod' : 'Walkman', onSelect: () => setRetroPlayerSkin(isIpod ? 'walkman' : 'ipod') },
        { label: '閉じる', onSelect: () => setIsRetroPlayerOpen(false) },
      ];
    }
    return [];
  }, [screen, musicTracks, playlists, isShuffle, isIpod, push, play, setIsShuffle, setRetroPlayerSkin, setIsRetroPlayerOpen]);

  const cursor = Math.min(cursors[screen] ?? 0, Math.max(0, items.length - 1));
  const moveCursor = useCallback(
    (delta: number) => {
      if (screen === 'now') {
        seekTo(Math.max(0, Math.min(duration || 0, currentTime + delta * 5)));
        return;
      }
      setCursors((c) => {
        const cur = Math.min(c[screen] ?? 0, Math.max(0, items.length - 1));
        const next = Math.max(0, Math.min(items.length - 1, cur + delta));
        return next === cur ? c : { ...c, [screen]: next };
      });
    },
    [screen, items.length, seekTo, duration, currentTime]
  );

  const select = () => {
    if (screen === 'now') {
      togglePlay();
      return;
    }
    items[cursor]?.onSelect();
  };

  // クリックホイール: 円周上のドラッグ角度で項目送り（約28°ごとに1つ）
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const lastAngle = useRef<number | null>(null);
  const accum = useRef(0);
  const angleOf = (e: React.PointerEvent) => {
    const r = wheelRef.current!.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  };
  const onWheelDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    lastAngle.current = angleOf(e);
    accum.current = 0;
  };
  const onWheelMove = (e: React.PointerEvent) => {
    if (lastAngle.current === null) return;
    const a = angleOf(e);
    let d = a - lastAngle.current;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    lastAngle.current = a;
    accum.current += d;
    const step = (28 * Math.PI) / 180;
    while (Math.abs(accum.current) >= step) {
      const dir = accum.current > 0 ? 1 : -1;
      moveCursor(dir);
      accum.current -= dir * step;
    }
  };
  const onWheelUp = () => {
    lastAngle.current = null;
  };

  if (!isRetroPlayerOpen) return null;

  const titleOf = (id: string) =>
    id === 'root' ? (isIpod ? 'iPod' : 'WALKMAN')
    : id === 'now' ? '再生中'
    : id === 'songs' ? '曲'
    : id === 'artists' ? 'アーティスト'
    : id === 'favorites' ? 'お気に入り'
    : id === 'playlists' ? 'プレイリスト'
    : id === 'settings' ? '設定'
    : id.startsWith('artist:') ? id.slice(7)
    : id.startsWith('pl:') ? playlists.find((p) => p.id === id.slice(3))?.name || 'プレイリスト'
    : '';

  // 表示ウィンドウ（カーソルを中心に6行）
  const ROWS = 6;
  const start = Math.max(0, Math.min(cursor - Math.floor(ROWS / 2), Math.max(0, items.length - ROWS)));
  const visible = items.slice(start, start + ROWS);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const screenEl = (
    <div
      className={`h-[200px] rounded-md overflow-hidden flex flex-col border ${
        isIpod ? 'bg-[#dfe7d0] border-[#8a927b] text-[#1b2314]' : 'bg-[#0d1b2a] border-[#2a3a4d] text-[#9fe3ff]'
      }`}
      style={{ fontFamily: isIpod ? 'Helvetica, Arial, sans-serif' : 'ui-monospace, Menlo, monospace' }}
    >
      <div className={`flex items-center justify-between px-2 py-1 text-[11px] font-bold border-b ${isIpod ? 'border-[#9aa28a] bg-gradient-to-b from-[#eef3e2] to-[#c9d1b8]' : 'border-[#2a3a4d]'}`}>
        <span className="truncate">{titleOf(screen)}</span>
        <span>{isPlaying ? '▶' : '❚❚'}</span>
      </div>

      {screen === 'now' ? (
        <div className="flex-1 flex flex-col items-center justify-center px-3 gap-1 text-center">
          {currentTrack ? (
            <>
              <img
                src={`https://img.youtube.com/vi/${currentTrack.id}/mqdefault.jpg`}
                alt=""
                referrerPolicy="no-referrer"
                className="w-28 h-[63px] object-cover rounded-sm"
              />
              <p className="text-xs font-bold truncate w-full">{currentTrack.title}</p>
              <p className="text-[11px] opacity-70 truncate w-full">{currentTrack.artist}</p>
              <div className="w-full flex items-center gap-1.5 text-[10px] tabular-nums">
                <span>{fmt(currentTime)}</span>
                <div className="flex-1 h-2 rounded-sm bg-black/15 overflow-hidden border border-black/20">
                  <div className={`h-full ${isIpod ? 'bg-[#2a6fd6]' : 'bg-[#ff8a00]'}`} style={{ width: `${progress}%` }} />
                </div>
                <span>-{fmt(Math.max(0, duration - currentTime))}</span>
              </div>
            </>
          ) : (
            <p className="text-xs opacity-70">曲が選ばれていません</p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {visible.map((it, i) => {
            const idx = start + i;
            const sel = idx === cursor;
            return (
              <div
                key={idx}
                onClick={() => {
                  setCursors((c) => ({ ...c, [screen]: idx }));
                  if (sel) it.onSelect();
                }}
                className={`flex items-center justify-between px-2 h-[28px] text-[13px] ${
                  sel ? (isIpod ? 'bg-gradient-to-b from-[#4a90e2] to-[#1f5fbf] text-white' : 'bg-[#ff8a00] text-black') : ''
                }`}
              >
                <span className="truncate flex-1">{it.label}</span>
                {it.sub && <span className="text-[11px] opacity-70 ml-2 shrink-0">{it.sub}</span>}
                {it.chevron && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </div>
            );
          })}
          {items.length === 0 && <p className="text-xs opacity-70 p-3">項目がありません</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4 select-none touch-none">
      <button
        onClick={() => setIsRetroPlayerOpen(false)}
        className="absolute top-[max(env(safe-area-inset-top,0px),12px)] right-4 p-2 rounded-full bg-white/10 text-white"
        aria-label="閉じる"
      >
        <X className="w-5 h-5" />
      </button>

      {isIpod ? (
        // iPod classic 風
        <div className="w-[300px] rounded-[28px] p-4 bg-gradient-to-b from-[#f4f4f2] to-[#cfcfcb] shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-white/60">
          {screenEl}
          <div className="mt-5 flex justify-center">
            <div
              ref={wheelRef}
              onPointerDown={onWheelDown}
              onPointerMove={onWheelMove}
              onPointerUp={onWheelUp}
              onPointerCancel={onWheelUp}
              className="relative w-[210px] h-[210px] rounded-full bg-gradient-to-b from-[#fdfdfd] to-[#d8d8d4] border border-[#b9b9b4] shadow-inner touch-none"
            >
              <button onClick={back} className="absolute top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold text-[#555]">MENU</button>
              <button onClick={nextTrack} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555]" aria-label="次の曲"><SkipForward className="w-5 h-5 fill-current" /></button>
              <button onClick={prevTrack} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" aria-label="前の曲"><SkipBack className="w-5 h-5 fill-current" /></button>
              <button onClick={togglePlay} className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[#555]" aria-label="再生/一時停止">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              <button
                onClick={select}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[78px] h-[78px] rounded-full bg-gradient-to-b from-[#f1f1ee] to-[#cfcfca] border border-[#b5b5b0] active:brightness-90"
                aria-label="決定"
              />
            </div>
          </div>
          <p className="text-center text-[10px] text-[#777] mt-3">ホイールをなぞるとスクロール</p>
        </div>
      ) : (
        // Walkman 風
        <div className="w-[300px] rounded-[18px] p-4 bg-gradient-to-b from-[#3b3f45] to-[#1b1d21] shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-black tracking-[0.25em] text-[#ff8a00]">WALKMAN</span>
            <span className="text-[9px] text-white/40">MeloTrace</span>
          </div>
          {screenEl}
          <div className="mt-4 grid grid-cols-3 gap-2 text-white">
            <button onClick={() => moveCursor(-1)} className="py-2.5 rounded-lg bg-[#2a2d33] active:bg-[#3a3e45] text-xs font-bold">▲</button>
            <button onClick={select} className="py-2.5 rounded-lg bg-[#ff8a00] text-black active:brightness-90 text-xs font-black">決定</button>
            <button onClick={() => moveCursor(1)} className="py-2.5 rounded-lg bg-[#2a2d33] active:bg-[#3a3e45] text-xs font-bold">▼</button>
            <button onClick={prevTrack} className="py-2.5 rounded-lg bg-[#2a2d33] active:bg-[#3a3e45] flex justify-center" aria-label="前の曲"><SkipBack className="w-4 h-4 fill-current" /></button>
            <button onClick={togglePlay} className="py-2.5 rounded-lg bg-[#2a2d33] active:bg-[#3a3e45] flex justify-center" aria-label="再生/一時停止">
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button onClick={nextTrack} className="py-2.5 rounded-lg bg-[#2a2d33] active:bg-[#3a3e45] flex justify-center" aria-label="次の曲"><SkipForward className="w-4 h-4 fill-current" /></button>
          </div>
          <button onClick={back} className="mt-2 w-full py-2 rounded-lg bg-[#2a2d33] text-white/80 text-xs font-bold active:bg-[#3a3e45]">BACK</button>
        </div>
      )}

      {/* スキン切替 */}
      <div className="absolute bottom-[max(env(safe-area-inset-bottom,0px),16px)] left-1/2 -translate-x-1/2 flex gap-1 p-1 rounded-full bg-white/10 text-xs font-semibold">
        {(['ipod', 'walkman'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setRetroPlayerSkin(s)}
            className={`px-4 py-1.5 rounded-full ${retroPlayerSkin === s ? 'bg-white text-black' : 'text-white/70'}`}
          >
            {s === 'ipod' ? 'iPod' : 'Walkman'}
          </button>
        ))}
      </div>
    </div>
  );
};
