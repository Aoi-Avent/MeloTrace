import React, { useMemo } from 'react';
import {
  X,
  Play,
  Shuffle,
  Heart,
  ExternalLink,
  Ban,
  Music2,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { MusicTrack } from '../types/music';
import { usePlayer } from '../context/PlayerContext';

interface ArtistDetailModalProps {
  artistName: string | null;
  onClose: () => void;
}

export const ArtistDetailModal: React.FC<ArtistDetailModalProps> = ({
  artistName,
  onClose,
}) => {
  const {
    activeTracks,
    currentTrack,
    isPlaying,
    playTrack,
    setIsShuffle,
    toggleFavorite,
    banArtist,
  } = usePlayer();

  const artistTracks = useMemo(() => {
    if (!artistName) return [];
    const normalizedTarget = artistName.replace(/\s*\(Cover\)/i, '').trim().toLowerCase();

    return activeTracks.filter((t) => {
      const a = t.artist.replace(/\s*\(Cover\)/i, '').trim().toLowerCase();
      return a === normalizedTarget || t.artist.toLowerCase().includes(normalizedTarget);
    });
  }, [activeTracks, artistName]);

  const sortedTracks = useMemo(() => {
    return [...artistTracks].sort((a, b) => b.playCount - a.playCount);
  }, [artistTracks]);

  const totalPlays = useMemo(() => {
    return artistTracks.reduce((acc, t) => acc + t.playCount, 0);
  }, [artistTracks]);

  if (!artistName) return null;

  const topTrack = sortedTracks[0];
  const representativeThumbnail =
    topTrack?.thumbnailUrl ||
    (topTrack?.id ? `https://img.youtube.com/vi/${topTrack.id}/hqdefault.jpg` : '');

  const formatDuration = (sec?: number | null) => {
    if (!sec || isNaN(sec)) return '3:30';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayAll = (shuffle: boolean) => {
    if (sortedTracks.length === 0) return;
    setIsShuffle(shuffle);
    if (shuffle) {
      const randIdx = Math.floor(Math.random() * sortedTracks.length);
      playTrack(sortedTracks[randIdx], sortedTracks);
    } else {
      playTrack(sortedTracks[0], sortedTracks);
    }
  };

  const handleBan = () => {
    if (window.confirm(`「${artistName}」をライブラリから除外（非表示）にしますか？\n設定画面からいつでも解除できます。`)) {
      banArtist(artistName);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 flex flex-col justify-end animate-in fade-in duration-200">
      {/* Background backdrop blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {representativeThumbnail && (
          <img
            src={representativeThumbnail}
            alt=""
            className="w-full h-full object-cover mt-focus scale-150 blur-3xl opacity-20"
          />
        )}
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto bg-surface/95 border-t border-fg/10 rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden pb-[max(env(safe-area-inset-bottom,0px),12px)]">
        {/* Top Handle / Close Bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-fg/5">
          <div className="w-8" />
          <div className="w-10 h-1 bg-fg/20 rounded-full" />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-fg/10 flex items-center justify-center text-muted hover:text-fg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Artist Catalog Content */}
        <div className="overflow-y-auto px-5 pt-4 pb-12 flex-1 ios-scroll-container">
          {/* Artist Header Profile */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-28 h-28 rounded-full overflow-hidden shadow-2xl border-2 border-fg/15 bg-surface-2 mb-3.5 relative">
              {representativeThumbnail ? (
                <img
                  src={representativeThumbnail}
                  alt={artistName}
                  className="w-full h-full object-cover mt-focus"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-2">
                  <Music2 className="w-10 h-10 text-fg/40" />
                </div>
              )}
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-semibold mb-1 border border-accent/20">
              <Sparkles className="w-3 h-3" />
              <span>ライブラリ収録アーティスト</span>
            </div>

            <h2 className="text-2xl font-bold text-fg tracking-tight px-4 break-words">
              {artistName}
            </h2>

            <p className="text-xs text-muted mt-1">
              {artistTracks.length}曲 収録 • 合計 {totalPlays} 回再生
            </p>

            {/* Apple Music Action Buttons */}
            <div className="flex items-center gap-3 w-full max-w-xs mt-4">
              <button
                onClick={() => handlePlayAll(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-accent/25 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>すべて再生</span>
              </button>

              <button
                onClick={() => handlePlayAll(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-fg/10 hover:bg-fg/15 text-fg text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Shuffle className="w-4 h-4" />
                <span>シャッフル</span>
              </button>
            </div>
          </div>

          {/* Song List */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-fg tracking-tight">
                このアーティストの曲 ({artistTracks.length})
              </h3>
              <span className="text-[11px] text-muted">再生回数順</span>
            </div>

            <div className="divide-y divide-fg/5">
              {sortedTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, sortedTracks)}
                    className={`flex items-center justify-between py-2.5 px-2 rounded-xl cursor-pointer active:bg-fg/10 transition-colors ${
                      isCurrent ? 'bg-fg/10' : 'hover:bg-fg/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="text-xs font-semibold text-muted w-4 text-center tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-surface-2 relative border border-fg/10">
                        <img
                          src={`https://img.youtube.com/vi/${track.id}/mqdefault.jpg`}
                          alt=""
                          className="w-full h-full object-cover mt-focus"
                        />
                        {isCurrent && isPlaying && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isCurrent ? 'text-accent' : 'text-fg'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-[11px] text-muted truncate mt-0.5">
                          再生 {track.playCount}回 • {formatDuration(track.duration)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(track.id);
                      }}
                      className="p-2 text-muted hover:text-accent transition-colors shrink-0"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          track.isFavorite ? 'text-accent fill-accent' : 'stroke-[1.8]'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Artist Management Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-fg/10">
            {topTrack?.id && (
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(artistName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-fg/5 hover:bg-fg/10 text-fg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-muted" />
                <span>YouTubeで「{artistName}」を検索・開く</span>
              </a>
            )}

            <button
              onClick={handleBan}
              className="w-full py-2.5 px-3 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>このアーティストを非表示 (Ban) にする</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
