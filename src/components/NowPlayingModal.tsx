import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
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
  Quote,
  ListMusic,
  Disc3,
  ExternalLink,
  Search,
  Edit3,
  Ban,
  Check,
  X,
  Sparkles,
  Loader2,
  Maximize2,
  RotateCcw,
  Trash2,
  Music,
  Layers,
  Smartphone,
  Minus,
  Plus,
  Crosshair,
  Disc,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { setVideoFullscreen } from '../utils/videoFullscreen';
import { parseLrcLyrics, extractSmartTrackMeta } from '../utils/parser';
import {
  getLyricsForTrack,
  searchLyricsCandidates,
  purgeLyricsCache,
  convertPlainToSyncedLines,
  LrcLibTrack,
} from '../utils/lyricsService';
import { LyricLine } from '../types/music';
import { WaitIndicator } from './WaitIndicator';

export const NowPlayingModal: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    playbackRate,
    queue,
    repeatMode,
    isShuffle,
    sleepTimerMinutes,
    isNowPlayingOpen,
    isLoadingLyrics,
    setSelectedArtistForDetail,
    banArtist,
    banTrack,
    setCustomLyrics,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setPlaybackRate,
    setRepeatMode,
    setIsShuffle,
    setSleepTimer,
    toggleFavorite,
    playTrack,
    setIsNowPlayingOpen,
    nowPlayingTab,
    setNowPlayingTab,
    isAdPlaying,
    lyricsOffset,
    adjustLyricsOffset,
    resetLyricsOffset,
    lyricsDisplayMode,
    setLyricsDisplayMode,
    artworkAspectRatio,
    setArtworkAspectRatio,
    setIsRetroPlayerOpen,
    setIsBgGuideOpen,
    artworkSource,
    setArtworkSource,
    albumArtFor,
    albumArtState,
    retryAlbumArt,
  } = usePlayer();

  // 動画表示モード: 埋め込みプレーヤーを、ジャケット/サムネと同じ位置に重ねるため、枠の位置を共有する
  const videoSlotRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (nowPlayingTab !== 'video') return;
    const root = document.documentElement;
    let raf = 0;
    let last = '';
    const tick = () => {
      const el = videoSlotRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const key = `${r.top.toFixed(1)}|${r.left.toFixed(1)}|${r.width.toFixed(1)}`;
        if (key !== last) {
          last = key;
          root.style.setProperty('--vid-top', `${r.top}px`);
          root.style.setProperty('--vid-left', `${r.left}px`);
          root.style.setProperty('--vid-w', `${r.width}px`);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      ['--vid-top', '--vid-left', '--vid-w'].forEach((k) => root.style.removeProperty(k));
    };
  }, [nowPlayingTab]);

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showManualLyricsModal, setShowManualLyricsModal] = useState(false);
  const [manualLyricsInput, setManualLyricsInput] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [customSearchTitle, setCustomSearchTitle] = useState('');
  const [customSearchArtist, setCustomSearchArtist] = useState('');
  const [searchErrorMsg, setSearchErrorMsg] = useState<string | null>(null);
  const [isReSearching, setIsReSearching] = useState(false);
  const [candidatesList, setCandidatesList] = useState<LrcLibTrack[]>([]);
  const [isSearchingCandidates, setIsSearchingCandidates] = useState(false);
  const [hasSearchedCandidates, setHasSearchedCandidates] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const [imgRatio, setImgRatio] = useState<number>(16 / 9);
  const [alignMode, setAlignMode] = useState(false);
  const [ytIdx, setYtIdx] = useState(0); // 高画質→低画質の順に試すサムネイルの段階
  const [albumFailed, setAlbumFailed] = useState(false);
  const panRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setImgError(false);
    setImgRatio(16 / 9);
    setAlignMode(false);
    setYtIdx(0);
    setAlbumFailed(false);
  }, [currentTrack?.id]);

  // 実際に取得できた画像の縦横比から、1:1 か 16:9 かを判定
  const isSquareImage = imgRatio < 1.3;
  const albumArt = currentTrack && artworkSource === 'album' && !albumFailed ? albumArtFor(currentTrack.id) : null;
  const albumStatus = currentTrack ? albumArtState(currentTrack.id) : 'unknown';
  const YT_CHAIN = currentTrack
    ? [
        `https://i.ytimg.com/vi/${currentTrack.id}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${currentTrack.id}/hq720.jpg`,
        `https://i.ytimg.com/vi/${currentTrack.id}/sddefault.jpg`,
        `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`,
        `https://i.ytimg.com/vi/${currentTrack.id}/mqdefault.jpg`,
      ]
    : [];
  const artSrc = albumArt ? albumArt.url : YT_CHAIN[Math.min(ytIdx, YT_CHAIN.length - 1)];
  const artIsWide =
    artworkAspectRatio === '16:9' ? true : artworkAspectRatio === '1:1' ? false : !isSquareImage;
  // 「1:1」を選んだまま横長画像(16:9)のとき: 切り取らず、横にスクロールして全体を見られるようにする
  const panMode = !artIsWide && imgRatio >= 1.3;

  // Clean meta
  const trackMeta = React.useMemo(() => {
    if (!currentTrack) return null;
    return extractSmartTrackMeta(currentTrack.title, currentTrack.artist);
  }, [currentTrack]);

  // Parse lyrics
  const parsedLyrics: LyricLine[] = React.useMemo(() => {
    if (!currentTrack?.lyrics) return [];
    return parseLrcLyrics(currentTrack.lyrics);
  }, [currentTrack?.lyrics]);

  // Active lyric index
  const activeLyricIndex = React.useMemo(() => {
    if (!parsedLyrics.length) return -1;
    const t = currentTime + lyricsOffset;
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
      if (t >= parsedLyrics[i].time) {
        return i;
      }
    }
    return 0;
  }, [parsedLyrics, currentTime, lyricsOffset]);

  // Auto-scroll active lyric to center (dynamic mode only; scrolls only the lyrics container)
  useEffect(() => {
    if (nowPlayingTab !== 'lyrics' || lyricsDisplayMode !== 'dynamic') return;
    const container = lyricsContainerRef.current;
    if (!container || activeLyricIndex < 0) return;
    const activeEl = container.children[activeLyricIndex] as HTMLElement | undefined;
    if (!activeEl) return;
    const top = activeEl.offsetTop - container.clientHeight / 2 + activeEl.offsetHeight / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [activeLyricIndex, nowPlayingTab, lyricsDisplayMode, parsedLyrics.length]);

  if (!isNowPlayingOpen || !currentTrack) return null;

  const formatTime = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatRemainingTime = (currentSec: number, durSec: number) => {
    const rem = Math.max(0, durSec - currentSec);
    return `-${formatTime(rem)}`;
  };

  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const displayProgress = isSeeking ? seekVal : progress;
  const displayTime = isSeeking ? (seekVal / 100) * duration : currentTime;

  const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    setSeekVal(parseFloat(e.target.value));
  };

  const handleSeekCommit = () => {
    if (isSeeking) {
      const nextSec = (seekVal / 100) * duration;
      seekTo(nextSec);
      setIsSeeking(false);
    }
  };

  const cycleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  // Execute candidate search from LRCLib API
  const handleExecuteCandidateSearch = async (title?: string, artist?: string) => {
    const qTitle = (title !== undefined ? title : customSearchTitle).trim();
    const qArtist = (artist !== undefined ? artist : customSearchArtist).trim();
    if (!qTitle) return;

    setIsSearchingCandidates(true);
    setSearchErrorMsg(null);
    setHasSearchedCandidates(true);
    try {
      const candidates = await searchLyricsCandidates(qTitle, qArtist);
      setCandidatesList(candidates);
      if (candidates.length === 0) {
        setSearchErrorMsg('指定したキーワードに一致する歌詞候補が見つかりませんでした。別の曲名表記（英字・カナ）や原曲P名での検索、または手動貼り付けをお試しください。');
      }
    } catch (e: any) {
      setSearchErrorMsg('歌詞候補の検索中に通信エラーが発生しました。');
    } finally {
      setIsSearchingCandidates(false);
    }
  };

  // Re-search lyrics with custom keywords form submit
  const handleCustomSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleExecuteCandidateSearch();
  };

  // User selects a specific candidate from the list
  const handleSelectCandidate = (candidate: LrcLibTrack) => {
    if (!currentTrack) return;
    if (candidate.syncedLyrics) {
      setCustomLyrics(currentTrack.id, candidate.syncedLyrics);
    } else if (candidate.plainLyrics) {
      const synced = convertPlainToSyncedLines(candidate.plainLyrics, duration || 240);
      setCustomLyrics(currentTrack.id, synced);
    }
    setShowSearchModal(false);
    setCandidatesList([]);
    setHasSearchedCandidates(false);
  };

  // Delete/Clear lyrics for current track
  const handleClearLyrics = () => {
    if (!currentTrack) return;
    purgeLyricsCache(currentTrack.id);
    setCustomLyrics(currentTrack.id, '');
    setShowSearchModal(false);
    setShowMoreMenu(false);
  };

  // Force re-fetch from cache purge
  const handleResyncLyrics = async () => {
    resetLyricsOffset();
    await handleForceReloadLyrics();
  };

  const handleForceReloadLyrics = async () => {
    if (!currentTrack) return;
    purgeLyricsCache(currentTrack.id);
    setCustomLyrics(currentTrack.id, '');
    setIsReSearching(true);
    const res = await getLyricsForTrack(
      trackMeta?.originalProducer || currentTrack.artist,
      trackMeta?.cleanTitle || currentTrack.title,
      duration
    );
    setIsReSearching(false);
    if (res) {
      setCustomLyrics(currentTrack.id, res);
    }
  };

  const handleSaveManualLyrics = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLyricsInput.trim()) return;
    setCustomLyrics(currentTrack.id, manualLyricsInput.trim());
    setShowManualLyricsModal(false);
    setManualLyricsInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col justify-between overflow-hidden animate-in fade-in slide-in-from-bottom duration-300 mt-sheet">
      {/* Apple Music Fluid Live Blurred Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div
          className="w-full h-full opacity-35 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://img.youtube.com/vi/${currentTrack.id}/mqdefault.jpg)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-[#000000]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 px-5 pt-[max(env(safe-area-inset-top,0px),12px)] pb-2 flex items-center justify-between">
        <button
          onClick={() => setIsNowPlayingOpen(false)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-white active:scale-90 transition-transform"
          aria-label="閉じる"
        >
          <ChevronDown className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Center Grab Handle */}
        <div
          onClick={() => setIsNowPlayingOpen(false)}
          className="w-9 h-1 rounded-full bg-white/30 cursor-pointer hover:bg-white/50 transition-colors"
        />

        {/* Right contextual controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsBgGuideOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-white transition-colors"
            title="バックグラウンド再生"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setIsRetroPlayerOpen(true); setIsNowPlayingOpen(false); }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-white transition-colors"
            title="iPod / Walkman モード"
          >
            <Disc className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowTimerMenu(!showTimerMenu)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors relative ${
              sleepTimerMinutes ? 'text-accent bg-accent/20' : 'text-[#8e8e93] hover:text-white'
            }`}
            title="スリープタイマー"
          >
            <Timer className="w-5 h-5" />
            {sleepTimerMinutes && (
              <span className="absolute -top-1 -right-1 px-1 bg-accent text-[9px] font-bold text-on-accent rounded-full">
                {sleepTimerMinutes}m
              </span>
            )}
          </button>

          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-white transition-colors"
            title="その他のメニュー"
          >
            <Ban className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* More Options / Exclude Menu Popover */}
      {showMoreMenu && (
        <div className="absolute top-16 right-5 z-50 apple-glass rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-60 animate-in fade-in zoom-in-95 duration-150">
          <p className="text-[11px] font-semibold text-[#8e8e93] px-2.5 py-1">曲・アーティスト操作</p>
          <button
            onClick={() => {
              setSelectedArtistForDetail(currentTrack.artist);
              setShowMoreMenu(false);
            }}
            className="px-3 py-2 text-xs text-left text-white hover:bg-white/10 rounded-xl transition-colors font-medium flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>このアーティストの他の曲</span>
          </button>
          <button
            onClick={() => {
              banTrack(currentTrack.id);
              setShowMoreMenu(false);
              nextTrack();
            }}
            className="px-3 py-2 text-xs text-left text-accent hover:bg-white/10 rounded-xl transition-colors font-medium flex items-center gap-2"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>この曲を非表示 (スキップ)</span>
          </button>
          <button
            onClick={() => {
              banArtist(currentTrack.artist);
              setShowMoreMenu(false);
              nextTrack();
            }}
            className="px-3 py-2 text-xs text-left text-accent hover:bg-white/10 rounded-xl transition-colors font-medium flex items-center gap-2"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>このアーティストをBan</span>
          </button>

          <div className="my-1 border-t border-white/10" />
          <p className="text-[11px] font-semibold text-[#8e8e93] px-2.5 py-0.5">歌詞操作</p>
          <button
            onClick={() => {
              setShowMoreMenu(false);
              setCustomSearchTitle(trackMeta?.cleanTitle || currentTrack.title);
              setCustomSearchArtist(trackMeta?.originalProducer || currentTrack.artist);
              setShowSearchModal(true);
              handleExecuteCandidateSearch(trackMeta?.cleanTitle || currentTrack.title, trackMeta?.originalProducer || currentTrack.artist);
            }}
            className="px-3 py-2 text-xs text-left text-white hover:bg-white/10 rounded-xl transition-colors font-medium flex items-center gap-2"
          >
            <Search className="w-3.5 h-3.5 text-accent" />
            <span>歌詞の候補を探す / 再検索</span>
          </button>
          <button
            onClick={() => {
              setShowMoreMenu(false);
              setManualLyricsInput(currentTrack.lyrics || '');
              setShowManualLyricsModal(true);
            }}
            className="px-3 py-2 text-xs text-left text-white hover:bg-white/10 rounded-xl transition-colors font-medium flex items-center gap-2"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#30d158]" />
            <span>歌詞を手動で貼り付け・編集</span>
          </button>
          {currentTrack.lyrics && (
            <button
              onClick={() => {
                setShowMoreMenu(false);
                handleClearLyrics();
              }}
              className="px-3 py-2 text-xs text-left text-accent hover:bg-white/10 rounded-xl transition-colors font-medium flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>現在の歌詞を消去（リセット）</span>
            </button>
          )}
        </div>
      )}

      {/* Sleep Timer Popover */}
      {showTimerMenu && (
        <div className="absolute top-16 right-5 z-50 apple-glass rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-44 animate-in fade-in zoom-in-95 duration-150">
          <p className="text-[11px] font-semibold text-[#8e8e93] px-2.5 py-1">スリープタイマー</p>
          {[
            { label: 'オフ', val: null },
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
              className={`px-3 py-2 text-xs text-left rounded-xl transition-colors ${
                sleepTimerMinutes === item.val
                  ? 'bg-accent text-on-accent font-semibold'
                  : 'text-[#f5f5f7] hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* CENTER STAGE */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-2 min-h-0 overflow-y-auto overflow-x-hidden ios-scroll-container">
        {/* MODE: ARTWORK */}
        {nowPlayingTab === 'art' && (
          <div className="w-full flex flex-col items-center gap-3">
          <div
            className={`${artIsWide ? 'aspect-video' : 'aspect-square'} relative rounded-2xl overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.85)] border border-white/10 flex items-center justify-center bg-[#1c1c1e] shrink-0 mt-art-frame transition-all duration-500 ease-out ${
              isPlaying ? 'scale-100' : 'scale-[0.88]'
            }`}
            style={{
              // 画面の高さに合わせて大きさを決める（Safariのバーで下が隠れないように）。設定画面の「ジャケットの大きさ・位置」も反映
              width: artIsWide
                ? 'calc(min(100%, 360px, max(266px, (100dvh - 440px) * 1.7778)) * var(--art-scale, 1))'
                : 'calc(min(100%, 310px, max(170px, 100dvh - 440px)) * var(--art-scale, 1))',
              maxWidth: '100%',
              marginTop: 'var(--art-y, 0px)',
            }}
          >
            {!imgError ? (
              (() => {
                const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
                  const img = e.currentTarget;
                  // YouTubeは画像が無い場合、120x90 前後の代替画像を返すので、その場合は次の画質へ
                  if (!albumArt && img.naturalWidth <= 130 && ytIdx < YT_CHAIN.length - 1) {
                    setYtIdx((i) => i + 1);
                    return;
                  }
                  if (img.naturalWidth && img.naturalHeight) setImgRatio(img.naturalWidth / img.naturalHeight);
                  if (panRef.current) {
                    const el = panRef.current;
                    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
                  }
                };
                const onError = () => {
                  if (albumArt) setAlbumFailed(true);
                  else if (ytIdx < YT_CHAIN.length - 1) setYtIdx((i) => i + 1);
                  else setImgError(true);
                };
                return panMode ? (
                  <div
                    ref={panRef}
                    className="absolute inset-0 overflow-x-auto overflow-y-hidden"
                    style={{ touchAction: 'pan-x', scrollbarWidth: 'none' }}
                  >
                    <img
                      key={artSrc}
                      src={artSrc}
                      alt={currentTrack.title}
                      referrerPolicy="no-referrer"
                      onError={onError}
                      onLoad={onLoad}
                      draggable={false}
                      className="h-full w-auto max-w-none select-none"
                    />
                  </div>
                ) : (
                  <img
                    key={artSrc}
                    src={artSrc}
                    alt={currentTrack.title}
                    referrerPolicy="no-referrer"
                    onError={onError}
                    onLoad={onLoad}
                    className="w-full h-full object-cover mt-focus"
                  />
                );
              })()
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <Disc3 className="w-16 h-16 text-accent animate-spin mb-2" />
                <p className="text-sm font-bold text-white line-clamp-2">{currentTrack.title}</p>
                <p className="text-xs text-[#8e8e93] mt-1">{currentTrack.artist}</p>
              </div>
            )}

            {panMode && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-full bg-black/60 text-[10px] font-semibold text-white/90 pointer-events-none">
                ◀ スライドで全体表示 ▶
              </div>
            )}

            {/* Vocaloid or Cover Tag */}
            {trackMeta?.originalProducer && (
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 text-[10px] font-bold text-[#af52de] border border-white/10">
                ボカロ原曲: {trackMeta.originalProducer}
              </div>
            )}

            {/* Apple Music Fluid Waveform Visualizer */}
            {isPlaying && (
              <div className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-full bg-black/70 border border-white/10 flex items-end gap-[3px] h-6 shadow-lg">
                <span className="w-1 bg-accent rounded-full apple-eq-bar-1" />
                <span className="w-1 bg-accent rounded-full apple-eq-bar-2" />
                <span className="w-1 bg-accent rounded-full apple-eq-bar-3" />
                <span className="w-1 bg-accent rounded-full apple-eq-bar-4" />
                <span className="w-1 bg-accent rounded-full apple-eq-bar-5" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
          <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-semibold">
            <button
              onClick={() => setArtworkSource('album')}
              className={`px-2.5 py-1 rounded-full transition-colors ${artworkSource === 'album' ? 'bg-white text-black' : 'text-white/70'}`}
            >
              ジャケット
            </button>
            <button
              onClick={() => setArtworkSource('youtube')}
              className={`px-2.5 py-1 rounded-full transition-colors ${artworkSource === 'youtube' ? 'bg-white text-black' : 'text-white/70'}`}
            >
              サムネ
            </button>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-semibold">
            {([['auto','自動'],['1:1','1:1'],['16:9','16:9']] as const).map(([v,l]) => (
              <button
                key={v}
                onClick={() => setArtworkAspectRatio(v)}
                className={`px-2.5 py-1 rounded-full transition-colors ${artworkAspectRatio === v ? 'bg-white text-black' : 'text-white/70'}`}
              >
                {l}
              </button>
            ))}
          </div>
          </div>
          {artworkSource === 'album' && !albumArt && (
            <p className="text-[10px] text-white/60 flex items-center gap-2">
              {albumStatus === 'unknown' ? 'ジャケットを探しています…' : 'この曲のジャケットは見つかりませんでした（サムネを表示中）'}
              {albumStatus === 'none' && (
                <button onClick={() => retryAlbumArt(currentTrack)} className="underline text-white/80">
                  再検索
                </button>
              )}
            </p>
          )}
          {albumArt && albumArt.album && <p className="text-[10px] text-white/60 truncate max-w-[300px]">{albumArt.album}</p>}
          </div>
        )}

        {/* MODE: LYRICS (Real Synced Lyrics or Clean Missing State) */}
        {nowPlayingTab === 'lyrics' && (
          <div className="w-full h-full flex flex-col items-center justify-start max-h-[380px]">
            {/* Top Lyrics Action Ribbon */}
            <div className="w-full max-w-sm flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-white/10 border border-white/10 text-xs shrink-0 z-20">
              <div className="flex items-center gap-1.5 text-white/80 font-medium">
                <Quote className="w-3.5 h-3.5 text-accent" />
                <span className="text-[11px] font-bold">歌詞設定</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setCustomSearchTitle(trackMeta?.cleanTitle || currentTrack.title);
                    setCustomSearchArtist(trackMeta?.originalProducer || currentTrack.artist);
                    setShowSearchModal(true);
                    handleExecuteCandidateSearch(trackMeta?.cleanTitle || currentTrack.title, trackMeta?.originalProducer || currentTrack.artist);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="別の歌詞候補を探す"
                >
                  <Search className="w-3 h-3 text-accent" />
                  <span>別の候補</span>
                </button>
                <button
                  onClick={handleResyncLyrics}
                  disabled={isReSearching}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition-colors"
                  title="歌詞を再取得してタイミングを再同期"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isReSearching ? 'animate-spin text-accent' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    setManualLyricsInput(currentTrack.lyrics || '');
                    setShowManualLyricsModal(true);
                  }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition-colors"
                  title="手動で貼り付け・編集"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#30d158]" />
                </button>
                {currentTrack.lyrics && (
                  <button
                    onClick={handleClearLyrics}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-accent/20 text-[#8e8e93] hover:text-accent text-[11px] font-medium transition-colors"
                    title="この曲の歌詞を消去（リセット）"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {isLoadingLyrics ? (
              <div className="m-auto flex flex-col items-center gap-3 text-white/60">
                <Loader2 className="w-7 h-7 text-accent animate-spin" />
                <p className="text-xs font-medium">歌詞データを検索中...</p>
              </div>
            ) : parsedLyrics.length > 0 ? (
              <div className="w-full flex-1 min-h-0 flex flex-col">
                {/* Timing / mode controls */}
                <div className="w-full flex items-center justify-between gap-1 px-1 pb-2 shrink-0 text-[10px] font-semibold text-white/80">
                  <div className="flex items-center gap-0.5 rounded-full bg-white/10 p-0.5">
                    <button onClick={() => adjustLyricsOffset(-0.3)} className="px-2 py-1 rounded-full hover:bg-white/15 flex items-center gap-0.5" title="歌詞を0.3秒遅くする">
                      <Minus className="w-3 h-3" />遅く
                    </button>
                    <button onClick={resetLyricsOffset} className="px-1.5 py-1 tabular-nums min-w-[44px] text-center" title="ズレをリセット">
                      {lyricsOffset > 0 ? '+' : ''}{lyricsOffset.toFixed(1)}s
                    </button>
                    <button onClick={() => adjustLyricsOffset(0.3)} className="px-2 py-1 rounded-full hover:bg-white/15 flex items-center gap-0.5" title="歌詞を0.3秒早くする">
                      早く<Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => setAlignMode((v) => !v)}
                    className={`px-2 py-1.5 rounded-full flex items-center gap-1 ${alignMode ? 'bg-accent text-on-accent' : 'bg-white/10'}`}
                    title="歌っている行をタップして、その行に合わせます"
                  >
                    <Crosshair className="w-3 h-3" />合わせる
                  </button>
                  <button
                    onClick={() => setLyricsDisplayMode(lyricsDisplayMode === 'dynamic' ? 'static' : 'dynamic')}
                    className="px-2 py-1.5 rounded-full bg-white/10"
                    title="歌詞の表示方式（動的 / 静的）"
                  >
                    {lyricsDisplayMode === 'dynamic' ? '動的' : '静的'}
                  </button>
                </div>
                {alignMode && (
                  <p className="text-[10px] text-accent pb-1 px-1 shrink-0">
                    いま歌っている行をタップすると、その行がこの瞬間に来るよう自動調整します。
                  </p>
                )}
                <div
                  ref={lyricsContainerRef}
                  className="relative w-full flex-1 min-h-0 overflow-y-auto px-4 py-6 flex flex-col gap-5 text-left select-none ios-scroll-container"
                >
                  {parsedLyrics.map((line, idx) => {
                    const isActive = idx === activeLyricIndex;
                    const dynamic = lyricsDisplayMode === 'dynamic';
                    // 改行位置が動かないよう、文字サイズ・幅は常に固定。強調は transform(scale)/色/不透明度のみで行う。
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (alignMode) {
                            // この行が「今」に来るようオフセットを算出（0.1秒単位）
                            const next = Math.round((line.time - currentTime) * 10) / 10;
                            adjustLyricsOffset(next - lyricsOffset);
                            setAlignMode(false);
                          } else {
                            seekTo(Math.max(0, line.time - lyricsOffset));
                          }
                        }}
                        style={dynamic ? { width: '83%' } : undefined}
                        className={`cursor-pointer font-bold leading-relaxed text-xl whitespace-pre-wrap break-words origin-left transition-[transform,opacity,color] duration-300 will-change-transform ${
                          isActive
                            ? `text-white opacity-100 ${dynamic ? 'scale-[1.2]' : 'underline decoration-accent decoration-2 underline-offset-4'}`
                            : 'text-white/40 opacity-70 hover:text-white/80'
                        }`}
                      >
                        {line.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* REAL MISSING STATE (No fake lyrics! Gives user clear actions) */
              <div className="m-auto text-center text-white/70 p-4 max-w-xs flex flex-col items-center gap-3">
                <Quote className="w-10 h-10 text-white/20" />
                <div>
                  <p className="text-sm font-bold text-white">この曲の同期歌詞は見つかりませんでした</p>
                  <p className="text-xs text-[#8e8e93] mt-1">
                    マニアックな曲や独自アレンジ・歌ってみた等は、1タップでWeb検索や手動登録が可能です。
                  </p>
                </div>

                <div className="flex flex-col gap-2 w-full mt-2">
                  {/* Search candidate list */}
                  <button
                    onClick={() => {
                      setCustomSearchTitle(trackMeta?.cleanTitle || currentTrack.title);
                      setCustomSearchArtist(trackMeta?.originalProducer || currentTrack.artist);
                      setShowSearchModal(true);
                      handleExecuteCandidateSearch(trackMeta?.cleanTitle || currentTrack.title, trackMeta?.originalProducer || currentTrack.artist);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-accent/25"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>歌詞の候補を探す / 再検索</span>
                  </button>

                  {/* Direct 1-tap Google Lyrics Search */}
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(
                      `${currentTrack.title} ${currentTrack.artist} 歌詞`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-accent" />
                    <span>Webで歌詞を調べる (Google)</span>
                  </a>

                  {/* Manual Paste/Edit Lyrics */}
                  <button
                    onClick={() => {
                      setManualLyricsInput(currentTrack.lyrics || '');
                      setShowManualLyricsModal(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#30d158]" />
                    <span>歌詞を手動で貼り付け / 登録</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE: VIDEO */}
        {nowPlayingTab === 'video' && (
          <div className="w-full flex flex-col items-center gap-3">
            {/* 埋め込みプレーヤーはこの枠の位置に重なる（ジャケットの横長表示と同じ大きさ・位置） */}
            <div
              ref={videoSlotRef}
              className="aspect-video rounded-2xl shrink-0 pointer-events-none"
              style={{
                width: 'calc(min(100%, 360px, max(266px, (100dvh - 440px) * 1.7778)) * var(--art-scale, 1))',
                maxWidth: '100%',
                marginTop: 'var(--art-y, 0px)',
              }}
            />
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                onClick={() => setVideoFullscreen(true)}
                className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-semibold text-white/85 flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                全画面
              </button>
            </div>
          </div>
        )}

        {/* MODE: UP NEXT QUEUE */}
        {nowPlayingTab === 'queue' && (
          <div className="w-full h-full max-h-[380px] overflow-y-auto px-2 py-2 flex flex-col gap-2 ios-scroll-container">
            <div className="flex items-center justify-between px-2 mb-1">
              <h4 className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
                次に再生 ({queue.length}曲)
              </h4>
              <span className="text-[11px] text-accent font-medium">
                {isShuffle ? 'シャッフル中' : '通常再生'}
              </span>
            </div>

            {queue.map((t, idx) => {
              const isCurrent = t.id === currentTrack.id;
              return (
                <div
                  key={`${t.id}_${idx}`}
                  onClick={() => playTrack(t)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isCurrent ? 'bg-white/15 text-white font-semibold' : 'hover:bg-white/5 text-[#d1d1d6]'
                  }`}
                >
                  <img
                    src={`https://img.youtube.com/vi/${t.id}/mqdefault.jpg`}
                    alt={t.title}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-cover shrink-0 bg-[#2c2c2e]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{t.title}</p>
                    <p className="text-[11px] text-[#8e8e93] truncate">{t.artist}</p>
                  </div>
                  {isCurrent && (
                    <div className="flex items-end gap-[2px] h-3 shrink-0 px-2">
                      <span className="w-1 bg-accent rounded-full apple-eq-bar-1" />
                      <span className="w-1 bg-accent rounded-full apple-eq-bar-2" />
                      <span className="w-1 bg-accent rounded-full apple-eq-bar-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTTOM CONTROL PANEL */}
      <footer className="relative z-10 px-6 pb-[max(env(safe-area-inset-bottom,0px),16px)] pt-1 max-w-md mx-auto w-full">
        {/* Ad Status Indicator */}
        {isAdPlaying && (
          <div className="mb-3 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>広告終了までお待ちください（消音・2倍速中）</span>
            </span>
            <span className="text-[10px] text-amber-300 font-semibold shrink-0">まもなく始まります</span>
          </div>
        )}

        {/* Track Title, Artist, & Favorite */}
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 pr-3">
            <h2 className="text-xl md:text-2xl font-bold text-white truncate tracking-tight">
              {currentTrack.title}
            </h2>
            <button
              onClick={() => setSelectedArtistForDetail(currentTrack.artist)}
              className="text-base font-medium text-[#8e8e93] hover:text-accent truncate mt-0.5 flex items-center gap-1 group text-left transition-colors max-w-full"
              title="このアーティストの他の曲・アルバムを開く"
            >
              <span className="truncate group-hover:underline">{currentTrack.artist}</span>
              <ChevronRight className="w-4 h-4 opacity-70 group-hover:opacity-100 shrink-0 text-[#8e8e93] group-hover:text-accent transition-colors" />
            </button>
          </div>

          <button
            onClick={() => toggleFavorite(currentTrack.id)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-accent active:scale-90 transition-transform shrink-0"
            aria-label="お気に入り"
          >
            <Heart
              className={`w-6 h-6 ${
                currentTrack.isFavorite ? 'text-accent fill-accent mt-pop' : 'stroke-[1.8]'
              }`}
            />
          </button>
        </div>

        {/* Scrubber Slider */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={displayProgress}
            onChange={handleSeekInput}
            onPointerUp={handleSeekCommit}
            onTouchEnd={handleSeekCommit}
            onMouseUp={handleSeekCommit}
            className="apple-slider"
          />
          <div className="flex justify-between text-[11px] font-medium text-[#8e8e93] mt-1.5 tabular-nums">
            <span>{formatTime(displayTime)}</span>
            <WaitIndicator className="-mt-0.5" />
            <span>{formatRemainingTime(displayTime, duration)}</span>
          </div>
        </div>

        {/* Main Transport Controls */}
        <div className="flex items-center justify-between px-3 mb-6">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
              isShuffle ? 'text-accent' : 'text-[#8e8e93] hover:text-white'
            }`}
            aria-label="シャッフル"
          >
            <Shuffle className="w-5 h-5 stroke-[2]" />
          </button>

          <button
            onClick={prevTrack}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
            aria-label="前の曲"
          >
            <SkipBack className="w-8 h-8 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_4px_24px_rgba(255,255,255,0.25)] mt-key"
            aria-label={isPlaying ? '一時停止' : '再生'}
          >
            {(isBuffering || isAdPlaying) && isPlaying ? (
              <Loader2 className="w-8 h-8 animate-spin text-black" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
            aria-label="次の曲"
          >
            <SkipForward className="w-8 h-8 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
              repeatMode !== 'off' ? 'text-accent' : 'text-[#8e8e93] hover:text-white'
            }`}
            aria-label="リピート"
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5 stroke-[2.2]" />
            ) : (
              <Repeat className="w-5 h-5 stroke-[2]" />
            )}
          </button>
        </div>

        {/* Bottom Toolbar: Lyrics, Video, YouTube Direct Link, Queue, Speed */}
        <div className="flex items-center justify-between text-[#8e8e93] px-2 pt-2 border-t border-white/10">
          <button
            onClick={() => setNowPlayingTab(nowPlayingTab === 'lyrics' ? 'art' : 'lyrics')}
            className={`p-2.5 rounded-full transition-all active:scale-90 ${
              nowPlayingTab === 'lyrics'
                ? 'bg-white text-black shadow-lg scale-105'
                : 'text-[#8e8e93] hover:text-white'
            }`}
            title="歌詞"
          >
            <Quote className="w-5 h-5" />
          </button>

          <button
            onClick={() => setNowPlayingTab(nowPlayingTab === 'video' ? 'art' : 'video')}
            className={`p-2.5 rounded-full transition-all active:scale-90 ${
              nowPlayingTab === 'video'
                ? 'bg-white text-black shadow-lg scale-105'
                : 'text-[#8e8e93] hover:text-white'
            }`}
            title="MV映像"
          >
            <Tv className="w-5 h-5" />
          </button>

          <a
            href={`https://www.youtube.com/watch?v=${currentTrack.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-full text-[#8e8e93] hover:text-white active:scale-90 transition-transform"
            title="YouTubeで開く"
          >
            <ExternalLink className="w-5 h-5" />
          </a>

          <button
            onClick={() => setNowPlayingTab(nowPlayingTab === 'queue' ? 'art' : 'queue')}
            className={`p-2.5 rounded-full transition-all active:scale-90 ${
              nowPlayingTab === 'queue'
                ? 'bg-white text-black shadow-lg scale-105'
                : 'text-[#8e8e93] hover:text-white'
            }`}
            title="再生待機列"
          >
            <ListMusic className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {playbackRate}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-10 right-0 z-50 apple-glass rounded-xl p-1 shadow-2xl flex flex-col gap-1 w-20">
                {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setPlaybackRate(rate);
                      setShowSpeedMenu(false);
                    }}
                    className={`px-2 py-1 text-xs text-center rounded-lg ${
                      playbackRate === rate
                        ? 'bg-accent text-on-accent font-bold'
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* Manual Lyrics Paste Modal */}
      {showManualLyricsModal && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl apple-card p-5 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">歌詞の手動登録・編集</h3>
              <button onClick={() => setShowManualLyricsModal(false)} className="text-[#8e8e93]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#8e8e93] mb-3">
              Webからコピーした歌詞テキストを貼り付けると、歌詞タブに反映されます。
            </p>
            <form onSubmit={handleSaveManualLyrics} className="flex flex-col gap-3">
              <textarea
                rows={8}
                value={manualLyricsInput}
                onChange={(e) => setManualLyricsInput(e.target.value)}
                placeholder="歌詞テキストをここに貼り付けてください..."
                className="w-full p-3 rounded-xl bg-[#2c2c2e] text-xs text-white placeholder-[#8e8e93] focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualLyricsModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Re-Search / Candidate Selection Lyrics Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl apple-card p-5 shadow-2xl border border-white/10 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-accent" />
                <h3 className="text-base font-bold text-white">歌詞の検索・候補選択</h3>
              </div>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setCandidatesList([]);
                  setHasSearchedCandidates(false);
                }}
                className="text-[#8e8e93] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#8e8e93] mb-3 shrink-0">
              曲名や原曲ボカロP・アーティスト名で検索し、正しい歌詞候補を選んで適用できます。
            </p>

            {/* Search Input Form */}
            <form onSubmit={handleCustomSearch} className="flex flex-col gap-2.5 shrink-0 mb-3">
              <div>
                <label className="text-[11px] font-semibold text-[#8e8e93] block mb-1">
                  曲名
                </label>
                <input
                  type="text"
                  value={customSearchTitle}
                  onChange={(e) => setCustomSearchTitle(e.target.value)}
                  placeholder="例: 雨とペトラ, About me, 夜に駆ける"
                  className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#8e8e93] block mb-1">
                  原曲アーティスト / ボカロP (任意)
                </label>
                <input
                  type="text"
                  value={customSearchArtist}
                  onChange={(e) => {
                    setCustomSearchArtist(e.target.value);
                    if (searchErrorMsg) setSearchErrorMsg(null);
                  }}
                  placeholder="例: バルーン, 蝶々P, YOASOBI"
                  className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <button
                type="submit"
                disabled={isSearchingCandidates || isReSearching}
                className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-accent/20 disabled:opacity-50 mt-1"
              >
                {isSearchingCandidates || isReSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>歌詞候補を検索中...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>候補を検索する</span>
                  </>
                )}
              </button>
            </form>

            {/* Error or Info message */}
            {searchErrorMsg && (
              <div className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-[#ff453a] text-[11px] leading-relaxed mb-3 shrink-0">
                {searchErrorMsg}
              </div>
            )}

            {/* Candidates Results List */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 flex flex-col gap-2 ios-scroll-container">
              {candidatesList.length > 0 && (
                <div className="flex items-center justify-between text-[11px] font-bold text-[#8e8e93] px-1 pb-1">
                  <span>見つかった歌詞候補 ({candidatesList.length}件)</span>
                  <span className="text-[10px] text-white/50">タップして適用</span>
                </div>
              )}

              {candidatesList.map((cand) => {
                const hasSynced = Boolean(cand.syncedLyrics);
                const hasPlain = Boolean(cand.plainLyrics);
                return (
                  <div
                    key={cand.id || Math.random()}
                    className="p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-accent/50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-white truncate">
                          {cand.trackName || customSearchTitle}
                        </span>
                        {hasSynced ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#30d158]/20 text-[#30d158] shrink-0">
                            同期歌詞
                          </span>
                        ) : hasPlain ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#af52de]/20 text-[#af52de] shrink-0">
                            テキスト
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-[#8e8e93] truncate">
                        {cand.artistName || 'アーティスト名なし'}
                        {cand.albumName ? ` • ${cand.albumName}` : ''}
                      </p>
                      {cand.duration && (
                        <p className="text-[10px] text-white/40 mt-0.5">
                          曲長: {formatTime(cand.duration)}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectCandidate(cand)}
                      className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-xs font-bold shrink-0 transition-colors active:scale-95 shadow-md shadow-accent/20"
                    >
                      適用
                    </button>
                  </div>
                );
              })}

              {hasSearchedCandidates && candidatesList.length === 0 && !isSearchingCandidates && !searchErrorMsg && (
                <div className="py-6 text-center text-xs text-[#8e8e93]">
                  候補が見つかりませんでした。別のキーワードでお試しください。
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 shrink-0 mt-2">
              {currentTrack.lyrics ? (
                <button
                  type="button"
                  onClick={handleClearLyrics}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-accent/20 text-accent text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>歌詞をリセット（消去）</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchModal(false);
                    setShowManualLyricsModal(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#30d158]" />
                  <span>手動で貼り付け</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowSearchModal(false);
                  setCandidatesList([]);
                  setHasSearchedCandidates(false);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
