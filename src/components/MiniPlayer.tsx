import React, { useState } from 'react';
import { Play, Pause, SkipForward, Disc3, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    isAdPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    setIsNowPlayingOpen,
    setSelectedArtistForDetail,
  } = usePlayer();

  const [imgError, setImgError] = useState(false);

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-[calc(3.75rem+max(env(safe-area-inset-bottom,0px),8px))] left-0 right-0 z-30 px-3">
      <div
        onClick={() => setIsNowPlayingOpen(true)}
        className="max-w-lg mx-auto relative overflow-hidden rounded-2xl apple-pill-miniplayer cursor-pointer active:scale-[0.985] transition-all"
      >
        <div className="flex items-center gap-3 p-2">
          {/* Thumbnail */}
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-[#2c2c2e] border border-white/10 shadow-sm flex items-center justify-center">
            {!imgError ? (
              <img
                src={`https://img.youtube.com/vi/${currentTrack.id}/mqdefault.jpg`}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <Disc3 className="w-6 h-6 text-[#fa2d48] animate-spin" />
            )}

            {/* Micro equalizing bar indicator when playing real music */}
            {isPlaying && !isAdPlaying && (
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] flex items-end justify-center gap-[2px] pb-1.5">
                <span className="w-[2.5px] bg-white rounded-full apple-eq-bar-1" />
                <span className="w-[2.5px] bg-white rounded-full apple-eq-bar-2" />
                <span className="w-[2.5px] bg-white rounded-full apple-eq-bar-3" />
              </div>
            )}
          </div>

          {/* Track metadata */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 truncate">
              <h4 className="text-xs font-semibold text-white truncate leading-tight tracking-tight">
                {currentTrack.title}
              </h4>
              {isAdPlaying && (
                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  消音・高速スキップ中
                </span>
              )}
            </div>
            <p
              onClick={(e) => {
                e.stopPropagation();
                setSelectedArtistForDetail(currentTrack.artist);
              }}
              className="text-[11px] text-[#8e8e93] hover:text-[#fa2d48] hover:underline truncate mt-0.5 cursor-pointer"
              title="アーティストの曲一覧を開く"
            >
              {isAdPlaying ? '広告終了までお待ちください（まもなく始まります）' : currentTrack.artist}
            </p>
          </div>

          {/* iOS Apple Music Controls: Play/Pause and Next */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:text-white/80 active:scale-90 transition-transform"
              aria-label={isPlaying ? '一時停止' : '再生'}
            >
              {(isBuffering || isAdPlaying) && isPlaying ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#fa2d48]" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-white active:scale-90 transition-colors"
              aria-label="次の曲"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>

        {/* Subtle bottom progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
          <div
            className="h-full bg-[#fa2d48] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
