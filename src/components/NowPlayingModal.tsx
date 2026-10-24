import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Timer,
  Tv,
  Mic2,
  ListMusic,
  Disc3,
  Sliders,
  Volume2,
  ExternalLink
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { parseLrcLyrics } from '../utils/parser';
import { LyricLine } from '../types/music';

export const NowPlayingModal: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    queue,
    queueIndex,
    repeatMode,
    isShuffle,
    playMode,
    sleepTimerMinutes,
    isNowPlayingOpen,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    setPlaybackRate,
    setRepeatMode,
    setIsShuffle,
    setSleepTimer,
    toggleFavorite,
    setPlayMode,
    playTrack,
    setIsNowPlayingOpen,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<'art' | 'lyrics' | 'video' | 'queue'>('art');
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Parse lyrics
  const parsedLyrics: LyricLine[] = React.useMemo(() => {
    if (!currentTrack?.lyrics) return [];
    return parseLrcLyrics(currentTrack.lyrics);
  }, [currentTrack?.lyrics]);

  // Find active lyric line
  const activeLyricIndex = React.useMemo(() => {
    if (!parsedLyrics.length) return -1;
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= parsedLyrics[i].time) {
        return i;
      }
    }
    return 0;
  }, [parsedLyrics, currentTime]);

  // Auto-scroll active lyric
  useEffect(() => {
    if (activeTab === 'lyrics' && lyricsContainerRef.current && activeLyricIndex >= 0) {
      const activeEl = lyricsContainerRef.current.children[activeLyricIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLyricIndex, activeTab]);

  if (!isNowPlayingOpen || !currentTrack) return null;

  const formatTime = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextSec = (parseFloat(e.target.value) / 100) * duration;
    seekTo(nextSec);
  };

  const cycleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07080c] flex flex-col justify-between overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
      {/* Dynamic blurred ambient glow behind album art */}
      <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
        <div
          className="w-full h-full scale-150 blur-3xl bg-cover bg-center"
          style={{ backgroundImage: `url(${currentTrack.thumbnailUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080c]/60 via-[#07080c]/90 to-[#07080c]" />
      </div>

      {/* Top Bar */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-2">
        <button
          onClick={() => setIsNowPlayingOpen(false)}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          aria-label="閉じる"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
            {playMode === 'stream' ? 'バックグラウンド音声再生' : 'YouTube内蔵プレイヤー'}
          </p>
          <h3 className="text-xs font-semibold text-slate-200 mt-0.5 truncate max-w-[200px]">
            {currentTrack.genre || 'MeloTrace'}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTimerMenu(!showTimerMenu)}
            className={`p-2.5 rounded-full transition-colors relative ${
              sleepTimerMinutes
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
            title="スリープタイマー"
          >
            <Timer className="w-4 h-4" />
            {sleepTimerMinutes && (
              <span className="absolute -top-1 -right-1 px-1 bg-rose-500 text-[9px] font-bold text-white rounded-full">
                {sleepTimerMinutes}m
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Sleep Timer Dropdown Modal */}
      {showTimerMenu && (
        <div className="absolute top-16 right-4 z-50 bg-slate-900/95 border border-white/10 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl flex flex-col gap-1 w-44">
          <p className="text-[11px] font-semibold text-slate-400 px-2 py-1">スリープタイマー</p>
          {[
            { label: 'OFF', val: null },
            { label: '15分後', val: 15 },
            { label: '30分後', val: 30 },
            { label: '45分後', val: 45 },
            { label: '60分後', val: 60 },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setSleepTimer(item.val);
                setShowTimerMenu(false);
              }}
              className={`px-3 py-1.5 text-xs text-left rounded-lg transition-colors ${
                sleepTimerMinutes === item.val
                  ? 'bg-rose-500 text-white font-medium'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Mode / Tabs Selector */}
      <div className="relative z-10 flex items-center justify-center px-4 py-1">
        <div className="inline-flex p-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
          <button
            onClick={() => setActiveTab('art')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeTab === 'art'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>アート</span>
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeTab === 'lyrics'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>歌詞</span>
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeTab === 'video'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>映像</span>
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeTab === 'queue'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>再生列</span>
          </button>
        </div>
      </div>

      {/* Center Display Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-2 min-h-0 overflow-hidden">
        {/* TAB 1: ART */}
        {activeTab === 'art' && (
          <div className="w-full max-w-[320px] aspect-square relative rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 group">
            <img
              src={currentTrack.thumbnailUrl}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-medium text-emerald-300">再生中</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LYRICS */}
        {activeTab === 'lyrics' && (
          <div
            ref={lyricsContainerRef}
            className="w-full h-full max-h-[380px] overflow-y-auto px-2 py-4 flex flex-col gap-4 text-center select-none"
          >
            {parsedLyrics.length > 0 ? (
              parsedLyrics.map((line, idx) => {
                const isActive = idx === activeLyricIndex;
                return (
                  <p
                    key={idx}
                    onClick={() => seekTo(line.time)}
                    className={`cursor-pointer transition-all duration-300 text-sm md:text-base leading-relaxed ${
                      isActive
                        ? 'text-white font-bold text-lg scale-105 drop-shadow-[0_0_12px_rgba(255,45,120,0.7)]'
                        : 'text-slate-500 hover:text-slate-300 font-medium'
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })
            ) : (
              <div className="m-auto text-slate-400 text-sm flex flex-col items-center gap-2">
                <Mic2 className="w-8 h-8 text-slate-600" />
                <p>この曲の同期歌詞はまだ登録されていません</p>
                <p className="text-xs text-slate-500">
                  YouTubeの公式MVまたは音源で音楽をお楽しみください
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VIDEO (Embedded YouTube Player) */}
        {activeTab === 'video' && (
          <div className="w-full max-w-sm aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${currentTrack.id}?autoplay=1&enablejsapi=1`}
              title={currentTrack.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* TAB 4: QUEUE */}
        {activeTab === 'queue' && (
          <div className="w-full h-full max-h-[380px] overflow-y-auto px-1 py-2 flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-400 mb-1 px-2">
              次の再生リスト ({queue.length}曲)
            </p>
            {queue.map((t, idx) => (
              <div
                key={`${t.id}_${idx}`}
                onClick={() => playTrack(t)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                  t.id === currentTrack.id
                    ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <img
                  src={t.thumbnailUrl}
                  alt={t.title}
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{t.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">{t.artist}</p>
                </div>
                {t.id === currentTrack.id && (
                  <span className="text-[10px] font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-500/20 shrink-0">
                    再生中
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Track Meta & Controls */}
      <footer className="relative z-10 px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-1 max-w-lg mx-auto w-full">
        {/* Title and Favorite */}
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0 pr-3">
            <h2 className="text-lg md:text-xl font-bold text-white truncate tracking-tight">
              {currentTrack.title}
            </h2>
            <p className="text-sm font-medium text-slate-400 truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>
          <button
            onClick={() => toggleFavorite(currentTrack.id)}
            className={`p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors shrink-0 ${
              currentTrack.isFavorite
                ? 'text-rose-500 fill-rose-500'
                : 'text-slate-400 hover:text-white'
            }`}
            aria-label="お気に入り"
          >
            <Heart className={`w-5 h-5 ${currentTrack.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Progress Slider */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeekChange}
            className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-400"
          />
          <div className="flex justify-between text-[11px] font-medium text-slate-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
        <div className="flex items-center justify-between px-2 mb-4">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2.5 rounded-full transition-colors ${
              isShuffle ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 hover:text-white'
            }`}
            aria-label="シャッフル"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={prevTrack}
            className="p-2.5 text-slate-200 hover:text-white active:scale-95 transition-all"
            aria-label="前の曲"
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_4px_24px_rgba(255,255,255,0.25)]"
            aria-label={isPlaying ? '一時停止' : '再生'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-2.5 text-slate-200 hover:text-white active:scale-95 transition-all"
            aria-label="次の曲"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-2.5 rounded-full transition-colors ${
              repeatMode !== 'off'
                ? 'text-rose-400 bg-rose-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
            aria-label="リピート"
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Sub Controls: Speed, Engine Toggle, YouTube Link */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
          {/* Speed Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium"
            >
              <span>{playbackRate}x</span>
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-8 left-0 z-50 bg-slate-900 border border-white/10 rounded-xl p-1 shadow-xl flex flex-col gap-1 w-20">
                {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setPlaybackRate(rate);
                      setShowSpeedMenu(false);
                    }}
                    className={`px-2 py-1 text-xs text-center rounded-lg ${
                      playbackRate === rate ? 'bg-rose-500 text-white' : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Engine Mode Switcher */}
          <button
            onClick={() => setPlayMode(playMode === 'stream' ? 'youtube' : 'stream')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-medium"
          >
            {playMode === 'stream' ? 'ストリーム音声' : 'YouTubeプレイヤー'}
          </button>

          {/* YouTube Official Link */}
          <a
            href={`https://www.youtube.com/watch?v=${currentTrack.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
          >
            <span>YouTubeで開く</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
};
