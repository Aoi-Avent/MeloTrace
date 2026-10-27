import React, { useState } from 'react';
import { Timer, Copy, RefreshCw } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

/** 「タップしてから鳴り始めるまで」の実測値。遅い原因が広告なのか読み込みなのかを切り分けるためのもの */
export const PlayDiagnostics: React.FC = () => {
  const { playMetrics, getPlaybackLog, clearPlaybackLog, restartPlayer } = usePlayer();
  const [log, setLog] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
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

      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setLog(getPlaybackLog())}
            className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[11px] font-semibold"
          >
            再生ログを表示
          </button>
          <button
            onClick={() => {
              if (window.confirm('YouTubeプレーヤーを作り直します。再生中の曲は続きから再開します。')) restartPlayer();
            }}
            className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[11px] font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />プレーヤーを再起動
          </button>
        </div>
        {log && (
          <div className="mt-2">
            <pre className="max-h-48 overflow-auto rounded-xl bg-black/50 p-2 text-[10px] leading-relaxed text-[#d1d1d6] whitespace-pre-wrap break-all">
              {log.length ? log.join('\n') : 'まだ記録がありません'}
            </pre>
            <div className="flex gap-2 mt-2">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(log.join('\n'));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch (e) {}
                }}
                className="px-3 py-1.5 rounded-full bg-accent text-white text-[11px] font-semibold flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />{copied ? 'コピーしました' : 'ログをコピー'}
              </button>
              <button
                onClick={() => {
                  clearPlaybackLog();
                  setLog([]);
                }}
                className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[11px] font-semibold"
              >
                消去
              </button>
            </div>
            <p className="text-[10px] text-[#8e8e93] mt-1.5">曲名とYouTubeの動画IDのみで、個人情報は含まれません。不具合の報告にお使いください。</p>
          </div>
        )}
      </div>
    </div>
  );
};
