import React from 'react';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

/** 全チャンネル表示 / 公式アーティスト限定表示 の切り替え */
export const ArtistFilterToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { artistFilterMode, setArtistFilterMode, verifyProgress, isDemoMode } = usePlayer();
  const checking = verifyProgress.total > 0 && verifyProgress.done < verifyProgress.total;
  const pct = verifyProgress.total > 0 ? Math.round((verifyProgress.done / verifyProgress.total) * 100) : 0;

  return (
    <div className={className}>
      <div className="inline-flex items-center gap-1 p-0.5 rounded-full bg-fg/10 border border-fg/10 text-[11px] font-semibold">
        <button
          onClick={() => setArtistFilterMode('all')}
          className={`px-3 py-1.5 rounded-full transition-colors ${artistFilterMode === 'all' ? 'bg-fg text-inverse' : 'text-fg/70'}`}
        >
          全チャンネル
        </button>
        <button
          onClick={() => setArtistFilterMode('official')}
          className={`px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${artistFilterMode === 'official' ? 'bg-accent text-on-accent' : 'text-fg/70'}`}
        >
          <BadgeCheck className="w-3.5 h-3.5" />公式アーティストのみ
        </button>
      </div>
      {!isDemoMode && checking && (
        <p className="mt-1.5 text-[10px] text-muted flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          アーティストの実在を判定中… {pct}%（{verifyProgress.done.toLocaleString()} / {verifyProgress.total.toLocaleString()}）
          {artistFilterMode === 'official' && ' 判定が進むほど表示が増えます'}
        </p>
      )}
    </div>
  );
};
