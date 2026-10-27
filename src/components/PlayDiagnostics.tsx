import React from 'react';
import { Timer } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

/** 「タップしてから鳴り始めるまで」の実測値。遅い原因が広告なのか読み込みなのかを切り分けるためのもの */
export const PlayDiagnostics: React.FC = () => {
  const { playMetrics } = usePlayer();
  const sec = (ms: number) => (ms / 1000).toFixed(1) + '秒';
  const avg = playMetrics.length ? playMetrics.reduce((a, m) => a + m.ms, 0) / playMetrics.length : 0;
  const avgNoAd = playMetrics.length ? playMetrics.reduce((a, m) => a + Math.max(0, m.ms - m.adMs), 0) / playMetrics.length : 0;

  return (
    <div className="mb-5 p-4 rounded-2xl apple-card border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <Timer className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-bold text-white">再生開始までの時間（診断）</h3>
      </div>
      {playMetrics.length === 0 ? (
        <p className="text-[11px] text-[#8e8e93]">曲を再生すると、ここに直近20曲の記録が表示されます。</p>
      ) : (
        <>
          <p className="text-[11px] text-white mb-2">
            平均 <b>{sec(avg)}</b>（広告を除くと <b>{sec(avgNoAd)}</b>）
          </p>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {playMetrics.map((m, i) => (
              <div key={m.at + i} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-[#d1d1d6]">{m.title}</span>
                <span className="shrink-0 tabular-nums text-white">
                  {sec(m.ms)}
                  {m.adMs > 500 && <span className="text-[#ff9f0a]"> （広告 {sec(m.adMs)}）</span>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
