import React, { useEffect } from 'react';
import { AlertCircle, X, Play } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

/** 再生が始まらない／スキップした等のとき、画面下部（ミニプレイヤーの上）に理由と対処を表示する */
export const PlaybackToast: React.FC = () => {
  const { playbackHint, playbackHintLink, dismissPlaybackHint, togglePlay, isPlaying } = usePlayer();

  useEffect(() => {
    if (!playbackHint) return;
    const t = setTimeout(dismissPlaybackHint, 12000);
    return () => clearTimeout(t);
  }, [playbackHint, dismissPlaybackHint]);

  if (!playbackHint) return null;
  return (
    <div className="fixed left-0 right-0 z-[65] px-3 bottom-[calc(8.5rem+max(env(safe-area-inset-bottom,0px),8px)+var(--bottom-gap,0px))]">
      <div className="max-w-lg mx-auto flex items-center gap-2 rounded-2xl bg-surface-2 border border-fg/10 px-3 py-2.5 shadow-2xl">
        <AlertCircle className="w-4 h-4 text-[#ff9f0a] shrink-0" />
        <p className="flex-1 text-xs text-fg leading-snug">{playbackHint}</p>
        {playbackHintLink && (
          <a
            href={playbackHintLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-full bg-fg/10 text-fg text-[11px] font-semibold shrink-0"
          >
            YouTubeで開く
          </a>
        )}
        {!isPlaying && (
          <button
            onClick={() => {
              dismissPlaybackHint();
              togglePlay();
            }}
            className="px-3 py-1.5 rounded-full bg-accent text-on-accent text-xs font-bold flex items-center gap-1 shrink-0"
          >
            <Play className="w-3 h-3 fill-current" />再生
          </button>
        )}
        <button onClick={dismissPlaybackHint} className="p-1 text-muted" aria-label="閉じる">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
