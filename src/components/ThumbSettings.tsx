import React, { useState } from 'react';
import { Image as ImageIcon, RotateCcw } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { DEFAULT_THUMB, loadThumbPrefs, saveThumbPrefs, ThumbPrefs } from '../utils/thumbPrefs';

const Slider: React.FC<{ label: string; value: number; min: number; max: number; step: number; unit?: string; fmt?: (v: number) => string; onChange: (v: number) => void }> = ({
  label, value, min, max, step, fmt, unit = '', onChange,
}) => (
  <div className="mb-3">
    <div className="flex items-center justify-between text-[11px] mb-1">
      <span className="text-fg font-semibold">{label}</span>
      <span className="text-muted tabular-nums">{fmt ? fmt(value) : `${value}${unit}`}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
  </div>
);

export const ThumbSettings: React.FC = () => {
  const { currentTrack, musicTracks } = usePlayer();
  const [p, setP] = useState<ThumbPrefs>(loadThumbPrefs());
  const update = (patch: Partial<ThumbPrefs>) => {
    const next = { ...p, ...patch };
    setP(next);
    saveThumbPrefs(next);
  };
  const sample = currentTrack || musicTracks[0];
  const src = sample ? `https://i.ytimg.com/vi/${sample.id}/mqdefault.jpg` : '';

  return (
    <div className="mb-5 p-4 rounded-2xl apple-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-fg">サムネイルの表示</h3>
        </div>
        <button
          onClick={() => {
            setP({ ...DEFAULT_THUMB });
            saveThumbPrefs({ ...DEFAULT_THUMB });
          }}
          className="text-[11px] text-muted flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />初期値
        </button>
      </div>

      {/* プレビュー */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-fg/5 mb-3">
        <div className="shrink-0 flex items-center justify-center" style={{ minWidth: 64 }}>
          {src ? (
            <img src={src} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg object-cover mt-thumb bg-surface-2" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-surface-2 mt-thumb" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-fg truncate">{sample ? sample.title : 'サンプルの曲'}</p>
          <p className="text-[11px] text-muted truncate">{sample ? sample.artist : 'アーティスト'}</p>
        </div>
      </div>

      <Slider label="一覧のサムネイルの大きさ" value={p.scale} min={0.7} max={1.5} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update({ scale: v })} />
      <Slider label="切り抜き位置（左右）" value={p.x} min={0} max={100} step={5} unit="%" onChange={(v) => update({ x: v })} />
      <Slider label="切り抜き位置（上下）" value={p.y} min={0} max={100} step={5} unit="%" onChange={(v) => update({ y: v })} />
      <div className="mt-4 pt-3 border-t border-fg/10">
        <Slider label="再生画面のジャケットの大きさ" value={p.artScale} min={0.6} max={1.15} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update({ artScale: v })} />
        <Slider label="再生画面のジャケットの位置（上下）" value={p.artY} min={-60} max={60} step={4} unit="px" onChange={(v) => update({ artY: v })} />
      </div>
      <p className="text-[10px] text-muted leading-relaxed">切り抜き位置は、正方形などに切り取って表示するサムネイル全体に効きます。</p>
    </div>
  );
};
