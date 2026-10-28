import React from 'react';
import { Loader2, Hourglass, Megaphone, RefreshCw } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

type Phase = 'loading' | 'slow' | 'ad' | 'retry';

const META: Record<Phase, { icon: React.ReactNode; label: string; hint: string }> = {
  loading: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: '読み込み中', hint: '曲を読み込んでいます' },
  slow: { icon: <Hourglass className="w-3.5 h-3.5 od-wiggle" />, label: 'もう少し', hint: '読み込みに時間がかかっています。ごめんね' },
  ad: { icon: <Megaphone className="w-3.5 h-3.5" />, label: '広告中', hint: '広告の間は音を消しています。まもなく曲が始まります' },
  retry: { icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, label: '再接続中', hint: 'つなぎ直しています' },
};

/** 待ち時間の理由を、文章ではなく小さなアイコン＋ひとことで伝える。長押しやタップで説明が出る */
export const WaitIndicator: React.FC<{ compact?: boolean; className?: string }> = ({ compact, className = '' }) => {
  const { playWait } = usePlayer();
  const [showHint, setShowHint] = React.useState(false);
  if (playWait.phase === 'idle') return null;
  const m = META[playWait.phase];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setShowHint((v) => !v);
        setTimeout(() => setShowHint(false), 3500);
      }}
      className={`inline-flex items-center gap-1.5 rounded-full bg-fg/10 text-fg/80 ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[11px]'} font-semibold ${className}`}
      aria-live="polite"
    >
      <span className="text-accent flex">{m.icon}</span>
      <span>{showHint ? m.hint : m.label}</span>
    </button>
  );
};

/** ミニプレイヤーの上端に出る、細くて静かな「待っています」の帯 */
export const WaitBar: React.FC = () => {
  const { playWait } = usePlayer();
  if (playWait.phase === 'idle') return null;
  return (
    <div className="absolute left-4 right-4 top-0 h-[2px] overflow-hidden rounded-full bg-fg/10" aria-hidden="true">
      <div className="od-wait-bar h-full w-1/3 rounded-full bg-accent" />
    </div>
  );
};
