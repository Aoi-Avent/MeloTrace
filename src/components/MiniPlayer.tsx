import React from 'react';
import { Play, Pause, SkipForward, Heart, ChevronUp } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    toggleFavorite,
    setIsNowPlayingOpen,
  } = usePlayer();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-30 px-3 pb-1">
      <div
        onClick={() => setIsNowPlayingOpen(true)}
        className="max-w-lg mx-auto relative overflow-hidden rounded-2xl glass-panel shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 cursor-pointer active:scale-[0.99] transition-transform"
      >
        {/* Top subtle progress bar */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3 p-2.5">
          {/* Thumbnail with mini equalizer overlay when playing */}
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-slate-800 border border-white/10 shadow-sm">
            <img
              src={currentTrack.thumbnailUrl}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-end justify-center gap-[2px] pb-1.5">
                <span className="w-[3px] bg-rose-400 rounded-full animate-eq-1" />
                <span className="w-[3px] bg-rose-400 rounded-full animate-eq-2" />
                <span className="w-[3px] bg-rose-400 rounded-full animate-eq-3" />
                <span className="w-[3px] bg-rose-400 rounded-full animate-eq-4" />
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold text-white truncate leading-tight">
                {currentTrack.title}
              </h4>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => toggleFavorite(currentTrack.id)}
              className={`p-2 rounded-full transition-colors ${
                currentTrack.isFavorite
                  ? 'text-rose-400 fill-rose-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="お気に入り"
              aria-label="お気に入り"
            >
              <Heart className={`w-4 h-4 ${currentTrack.isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all shadow-md ml-0.5"
              aria-label={isPlaying ? '一時停止' : '再生'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-2 text-slate-300 hover:text-white active:scale-95 transition-colors"
              aria-label="次の曲"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
