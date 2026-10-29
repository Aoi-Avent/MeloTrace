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
  const median = (xs: number[]) => {
    if (!xs.length) return null;
    const s2 = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s2.length / 2);
    return s2.length % 2 ? s2[mid] : (s2[mid - 1] + s2[mid]) / 2;
  };
  // 条件ごとの中央値（遅くなる条件を見つけるため）
  const groups: { label: string; xs: number[] }[] = [
    { label: '手動タップ・画面表示中', xs: playMetrics.filter((m) => m.auto === false && m.hidden === false).map((m) => m.ms) },
    { label: '自動で次の曲・画面表示中', xs: playMetrics.filter((m) => m.auto === true && m.hidden === false).map((m) => m.ms) },
    { label: '自動で次の曲・画面非表示（ロック中など）', xs: playMetrics.filter((m) => m.auto === true && m.hidden === true).map((m) => m.ms) },
    { label: '映像を抑える設定', xs: playMetrics.filter((m) => m.mode === 'quiet').map((m) => m.ms) },
  ];
  const avgNoAd = playMetrics.length ? playMetrics.reduce((a, m) => a + Math.max(0, m.ms - m.adMs), 0) / playMetrics.length : 0;

  return (
    <div className="mb-5 p-4 rounded-2xl apple-card border border-fg/10">
      <div className="flex items-center gap-2 mb-2">
        <Timer className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-bold text-fg">再生開始までの時間（診断）</h3>
      </div>
      {playMetrics.length === 0 ? (
        <p className="text-[11px] text-muted">曲を再生すると、ここに直近20曲の記録が表示されます。</p>
      ) : (
        <>
          <p className="text-[11px] text-fg mb-2">
            平均 <b>{sec(avg)}</b>（広告を除くと <b>{sec(avgNoAd)}</b>）
          </p>
          <div className="mb-2 rounded-xl bg-fg/5 p-2 text-[10px] text-fg-soft space-y-0.5">
            {groups.map((g) => (
              <div key={g.label} className="flex justify-between gap-2">
                <span className="truncate">{g.label}</span>
                <span className="tabular-nums shrink-0">{g.xs.length ? `中央値 ${sec(median(g.xs)!)}（${g.xs.length}曲）` : '—'}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {playMetrics.map((m, i) => (
              <div key={m.at + i} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-fg-soft">{m.title}</span>
                <span className="shrink-0 tabular-nums text-fg">
                  {sec(m.ms)}
                  {m.adMs > 500 && <span className="text-[#ff9f0a]"> （広告 {sec(m.adMs)}）</span>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 pt-3 border-t border-fg/10">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setLog(getPlaybackLog())}
            className="px-3 py-1.5 rounded-full bg-fg/10 text-fg text-[11px] font-semibold"
          >
            再生ログを表示
          </button>
          <button
            onClick={() => {
              if (window.confirm('YouTubeプレーヤーを作り直します。再生中の曲は続きから再開します。')) restartPlayer();
            }}
            className="px-3 py-1.5 rounded-full bg-fg/10 text-fg text-[11px] font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />プレーヤーを再起動
          </button>
        </div>
        {log && (
          <div className="mt-2">
            <pre className="max-h-48 overflow-auto rounded-xl bg-black/50 p-2 text-[10px] leading-relaxed text-fg-soft whitespace-pre-wrap break-all">
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
                className="px-3 py-1.5 rounded-full bg-accent text-on-accent text-[11px] font-semibold flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />{copied ? 'コピーしました' : 'ログをコピー'}
              </button>
              <button
                onClick={() => {
                  clearPlaybackLog();
                  setLog([]);
                }}
                className="px-3 py-1.5 rounded-full bg-fg/10 text-fg text-[11px] font-semibold"
              >
                消去
              </button>
            </div>
            <p className="text-[10px] text-muted mt-1.5">曲名とYouTubeの動画IDのみで、個人情報は含まれません。不具合の報告にお使いください。</p>
          </div>
        )}
      </div>
    </div>
  );
};
