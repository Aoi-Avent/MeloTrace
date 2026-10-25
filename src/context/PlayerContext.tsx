import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MusicTrack, Playlist, RepeatMode } from '../types/music';
import { DEMO_TRACKS, DEMO_PLAYLISTS } from '../data/demoData';
import { extractYouTubeId, extractSmartTrackMeta, isLikelyMusic, isBgmOrClassicalTrack } from '../utils/parser';
import { getLyricsForTrack } from '../utils/lyricsService';
import { audioKeepAlive } from '../utils/audioKeepAlive';
import { saveTracksToDB, loadTracksFromDB, savePlaylistsToDB, loadPlaylistsFromDB, clearDB } from '../utils/db';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface PlayerContextType {
  tracks: MusicTrack[];
  activeTracks: MusicTrack[];
  musicTracks: MusicTrack[];
  bgmTracks: MusicTrack[];
  playlists: Playlist[];
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  queue: MusicTrack[];
  queueIndex: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  sleepTimerMinutes: number | null;
  isNowPlayingOpen: boolean;
  ytPlayerReady: boolean;
  nowPlayingTab: 'video' | 'lyrics' | 'art' | 'queue';
  isDemoMode: boolean;
  isLoadingLyrics: boolean;
  bannedArtists: string[];
  bannedTracks: string[];
  strictnessMode: 'strict' | 'standard' | 'all';
  selectedArtistForDetail: string | null;
  setSelectedArtistForDetail: (artist: string | null) => void;
  setStrictnessMode: (mode: 'strict' | 'standard' | 'all') => void;
  banArtist: (artist: string) => void;
  unbanArtist: (artist: string) => void;
  banTrack: (trackId: string) => void;
  unbanTrack: (trackId: string) => void;
  clearAllBans: () => void;
  setCustomLyrics: (trackId: string, lyrics: string) => void;
  setNowPlayingTab: (tab: 'video' | 'lyrics' | 'art' | 'queue') => void;
  isBuffering: boolean;
  isAdPlaying: boolean;
  playTrack: (track: MusicTrack, newQueue?: MusicTrack[], shouldOpenModal?: boolean) => void;
  playBgmStation: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (sec: number) => void;
  setPlaybackRate: (rate: number) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setIsShuffle: (shuffle: boolean) => void;
  setSleepTimer: (minutes: number | null) => void;
  toggleFavorite: (trackId: string) => void;
  setIsNowPlayingOpen: (open: boolean) => void;
  loadDemoData: () => void;
  importTracks: (newTracks: MusicTrack[]) => void;
  addSingleTrackByUrl: (urlOrId: string, customTitle?: string, customArtist?: string) => boolean;
  clearAllData: () => void;
  createPlaylist: (name: string, trackIds: string[]) => void;
}

const STORAGE_KEY_TRACKS = 'melotrace_tracks_v5';
const STORAGE_KEY_PLAYLISTS = 'melotrace_playlists_v5';
const STORAGE_KEY_IS_DEMO = 'melotrace_is_demo_v5';
const STORAGE_KEY_BANNED_ARTISTS = 'melotrace_banned_artists_v1';
const STORAGE_KEY_BANNED_TRACKS = 'melotrace_banned_tracks_v1';
const STORAGE_KEY_STRICTNESS = 'melotrace_strictness_v1';
const STORAGE_KEY_LAST_TRACK_ID = 'melotrace_last_track_id_v5';
const STORAGE_KEY_LAST_QUEUE_IDS = 'melotrace_last_queue_ids_v5';

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_IS_DEMO);
      if (saved !== null) return saved === 'true';
    } catch (e) {
      // ignore
    }
    return true;
  });

  const [strictnessMode, setStrictnessModeState] = useState<'strict' | 'standard' | 'all'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STRICTNESS);
      if (saved === 'strict' || saved === 'standard' || saved === 'all') return saved;
    } catch (e) {
      // ignore
    }
    return 'standard';
  });

  const [bannedArtists, setBannedArtists] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BANNED_ARTISTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [];
  });

  const [bannedTracks, setBannedTracks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BANNED_TRACKS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [];
  });

  const [tracks, setTracks] = useState<MusicTrack[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRACKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read stored tracks', e);
    }
    return DEMO_TRACKS;
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYLISTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to read stored playlists', e);
    }
    return DEMO_PLAYLISTS;
  });

  // Active unbanned tracks
  const activeTracks = useMemo(() => {
    return tracks.filter(
      (t) => !bannedTracks.includes(t.id) && !bannedArtists.includes(t.artist)
    );
  }, [tracks, bannedTracks, bannedArtists]);

  // Pure music tracks (EXCLUDES Free BGM, Classical & Sleep soundscapes)
  const musicTracks = useMemo(() => {
    return activeTracks.filter((t) => !isBgmOrClassicalTrack(t));
  }, [activeTracks]);

  // Dedicated Free BGM & Atmosphere tracks
  const bgmTracks = useMemo(() => {
    return activeTracks.filter((t) => isBgmOrClassicalTrack(t));
  }, [activeTracks]);

  const [selectedArtistForDetail, setSelectedArtistForDetail] = useState<string | null>(null);

  // Restore last playing track or default to first music track
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(() => {
    try {
      const lastId = localStorage.getItem(STORAGE_KEY_LAST_TRACK_ID);
      if (lastId) {
        const found = tracks.find((t) => t.id === lastId);
        if (found && !bannedTracks.includes(found.id) && !bannedArtists.includes(found.artist)) {
          return found;
        }
      }
    } catch (e) {
      // ignore
    }
    return musicTracks[0] || activeTracks[0] || null;
  });

  // Restore last queue or default to music tracks
  const [queue, setQueue] = useState<MusicTrack[]>(() => {
    try {
      const lastQueueIds = localStorage.getItem(STORAGE_KEY_LAST_QUEUE_IDS);
      if (lastQueueIds) {
        const ids: string[] = JSON.parse(lastQueueIds);
        if (Array.isArray(ids) && ids.length > 0) {
          const map = new Map(tracks.map((t) => [t.id, t]));
          const restored = ids
            .map((id) => map.get(id))
            .filter((t): t is MusicTrack => Boolean(t && !bannedTracks.includes(t.id) && !bannedArtists.includes(t.artist)));
          if (restored.length > 0) return restored;
        }
      }
    } catch (e) {
      // ignore
    }
    return musicTracks.length > 0 ? musicTracks : activeTracks;
  });

  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(activeTracks[0]?.duration || 210);
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [ytPlayerReady, setYtPlayerReady] = useState<boolean>(false);
  const [nowPlayingTab, setNowPlayingTab] = useState<'video' | 'lyrics' | 'art' | 'queue'>('art');
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(false);

  const ytPlayerRef = useRef<any>(null);
  const pendingTrackRef = useRef<MusicTrack | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrorsRef = useRef<number>(0);
  const nextTrackRef = useRef<() => void>(() => {});
  const handleTrackEndedRef = useRef<() => void>(() => {});
  const currentTrackRef = useRef<MusicTrack | null>(currentTrack);
  const playbackRateRef = useRef<number>(playbackRate);
  const isAdPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  // Restore full library from IndexedDB if available
  useEffect(() => {
    let isMounted = true;
    loadTracksFromDB().then((dbTracks) => {
      if (isMounted && dbTracks && dbTracks.length > 0) {
        setTracks(dbTracks);
      }
    });
    loadPlaylistsFromDB().then((dbPls) => {
      if (isMounted && dbPls && dbPls.length > 0) {
        setPlaylists(dbPls);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync full library to IndexedDB (non-blocking) and keep lightweight fast-boot cache in localStorage
  useEffect(() => {
    saveTracksToDB(tracks);
    try {
      // Cap localStorage cache to top 300 tracks so localStorage never exceeds 5MB quota
      const cacheSubset = tracks.slice(0, 300);
      localStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(cacheSubset));
      localStorage.setItem(STORAGE_KEY_IS_DEMO, isDemoMode.toString());
      localStorage.setItem(STORAGE_KEY_BANNED_ARTISTS, JSON.stringify(bannedArtists));
      localStorage.setItem(STORAGE_KEY_BANNED_TRACKS, JSON.stringify(bannedTracks));
      localStorage.setItem(STORAGE_KEY_STRICTNESS, strictnessMode);
    } catch (e) {
      console.warn('LocalStorage quota guarded:', e);
    }
  }, [tracks, isDemoMode, bannedArtists, bannedTracks, strictnessMode]);

  useEffect(() => {
    savePlaylistsToDB(playlists);
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLISTS, JSON.stringify(playlists));
    } catch (e) {
      console.warn('Failed to save playlists to localStorage', e);
    }
  }, [playlists]);

  // Persist current track & queue (capped)
  useEffect(() => {
    if (currentTrack) {
      try {
        localStorage.setItem(STORAGE_KEY_LAST_TRACK_ID, currentTrack.id);
      } catch (e) {}
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    if (queue.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_LAST_QUEUE_IDS, JSON.stringify(queue.slice(0, 100).map((t) => t.id)));
      } catch (e) {}
    }
  }, [queue]);

  // Automatic real lyrics fetch for current track if missing
  useEffect(() => {
    if (!currentTrack) return;
    // If track already has real lyrics
    if (currentTrack.lyrics && currentTrack.lyrics.trim().length > 10) {
      // If legacy fake placeholder detected, purge and re-fetch!
      if (
        currentTrack.lyrics.includes('静けさの中に響く旋律') ||
        currentTrack.lyrics.includes('胸の鼓動と重なってゆく')
      ) {
        // Purge fake lyrics
        currentTrack.lyrics = undefined;
      } else {
        return;
      }
    }

    let isMounted = true;
    setIsLoadingLyrics(true);

    getLyricsForTrack(
      currentTrack.artist,
      currentTrack.title,
      currentTrack.duration || 240,
      currentTrack.id
    )
      .then((lrc) => {
        if (!isMounted) return;
        setIsLoadingLyrics(false);
        if (lrc) {
          setCurrentTrack((prev) => (prev && prev.id === currentTrack.id ? { ...prev, lyrics: lrc } : prev));
          setTracks((prev) =>
            prev.map((t) => (t.id === currentTrack.id ? { ...t, lyrics: lrc } : t))
          );
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingLyrics(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id]);

  // Handle Track End
  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'one') {
      if (ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
      }
      return;
    }
    if (queue.length === 0) return;
    let nextIdx = 0;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = (queueIndex + 1) % queue.length;
    }
    setQueueIndex(nextIdx);
    const nextT = queue[nextIdx];
    if (nextT) {
      playTrack(nextT, queue, false);
    }
  }, [repeatMode, queue, queueIndex, isShuffle]);

  useEffect(() => {
    handleTrackEndedRef.current = handleTrackEnded;
  }, [handleTrackEnded]);

  // Initialize YouTube IFrame Player with ad-suppression parameters
  useEffect(() => {
    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      if (ytPlayerRef.current) return;

      const container = document.getElementById('yt-player-target');
      if (!container) {
        setTimeout(initPlayer, 200);
        return;
      }

      try {
        ytPlayerRef.current = new window.YT.Player('yt-player-target', {
          height: '100%',
          width: '100%',
          videoId: currentTrack?.id || 'ZRtdQ81jPUQ',
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            fs: 0,
            origin: window.location.origin,
            widget_referrer: window.location.href,
            hl: 'ja',
          },
          events: {
            onReady: () => {
              setYtPlayerReady(true);
              if (pendingTrackRef.current) {
                const p = pendingTrackRef.current;
                pendingTrackRef.current = null;
                try {
                  ytPlayerRef.current.loadVideoById(p.id, 0);
                  ytPlayerRef.current.playVideo?.();
                } catch (e) {
                  console.warn('onReady loadVideoById failed', e);
                }
              }
            },
            onStateChange: (event: any) => {
              // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING, -1: UNSTARTED, 5: CUED
              if (event.data === 1) {
                setIsPlaying(true);
                consecutiveErrorsRef.current = 0;

                // Inspect current video data to distinguish ad vs actual track
                const vData = ytPlayerRef.current?.getVideoData?.();
                const isAd = Boolean(
                  vData?.video_id &&
                  currentTrackRef.current?.id &&
                  vData.video_id !== currentTrackRef.current.id
                );
                setIsAdPlaying(isAd);
                isAdPlayingRef.current = isAd;

                if (isAd) {
                  // Mute the ad and 2x fast-forward through it!
                  try {
                    ytPlayerRef.current?.mute?.();
                    ytPlayerRef.current?.setPlaybackRate?.(2);
                  } catch (e) {}
                  setCurrentTime(0);
                  setIsBuffering(true); // Treat ad as loading/buffering state
                } else {
                  // Unmute and restore user-chosen playback rate
                  try {
                    ytPlayerRef.current?.unMute?.();
                    ytPlayerRef.current?.setPlaybackRate?.(playbackRateRef.current);
                  } catch (e) {}
                  setIsBuffering(false);
                  const d = ytPlayerRef.current?.getDuration?.();
                  if (d && !isNaN(d) && d > 0) setDuration(d);
                }
              } else if (event.data === 2) {
                setIsPlaying(false);
                setIsBuffering(false);
              } else if (event.data === 0) {
                setIsBuffering(false);

                // Check if the ended video was actually an ad
                const vData = ytPlayerRef.current?.getVideoData?.();
                if (
                  vData?.video_id &&
                  currentTrackRef.current?.id &&
                  vData.video_id !== currentTrackRef.current.id
                ) {
                  console.log('Ad finished playing; waiting for target music track to begin.');
                  setIsAdPlaying(false);
                  isAdPlayingRef.current = false;
                  try {
                    ytPlayerRef.current?.unMute?.();
                  } catch (e) {}
                  return; // CRITICAL: Do NOT advance track when an ad ends!
                }

                // Check if premature end fired
                const curTime = ytPlayerRef.current?.getCurrentTime?.() || 0;
                const dur = ytPlayerRef.current?.getDuration?.() || 0;
                if (dur > 30 && curTime < dur - 5) {
                  console.log('Premature ended event ignored (probable ad-to-video transition):', curTime, dur);
                  return; // CRITICAL: Do NOT advance track!
                }

                setIsAdPlaying(false);
                isAdPlayingRef.current = false;
                try {
                  ytPlayerRef.current?.unMute?.();
                } catch (e) {}
                handleTrackEndedRef.current();
              } else if (event.data === 3) {
                // Buffering is normal stream loading. Never skip track during buffering!
                setIsBuffering(true);
              } else if (event.data === -1 || event.data === 5) {
                setIsBuffering(false);
              }
            },
            onError: (err: any) => {
              const errCode = err?.data;
              console.warn('YouTube Player Error Code:', errCode);
              setIsBuffering(false);
              setIsAdPlaying(false);
              isAdPlayingRef.current = false;
              try {
                ytPlayerRef.current?.unMute?.();
              } catch (e) {}
              // 2: Invalid param, 5: HTML5 player error, 100: Not found/private, 101/150: Embed blocked
              if ([2, 5, 100, 101, 150].includes(errCode)) {
                if (consecutiveErrorsRef.current < 2) {
                  consecutiveErrorsRef.current += 1;
                  console.warn(`Unplayable video (${errCode}), skipping to next (attempt ${consecutiveErrorsRef.current}/2)`);
                  setTimeout(() => nextTrackRef.current(), 1000);
                } else {
                  console.warn('Multiple consecutive playback errors. Pausing playback to prevent skip storm.');
                  setIsPlaying(false);
                  consecutiveErrorsRef.current = 0;
                }
              }
            },
          },
        });
      } catch (e) {
        console.error('Failed to init YT player:', e);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      const t = setTimeout(initPlayer, 500);
      return () => clearTimeout(t);
    }
  }, []);

  // Poll real playback time & monitor ad state from YouTube Player
  useEffect(() => {
    if (isPlaying) {
      pollIntervalRef.current = setInterval(() => {
        if (ytPlayerRef.current?.getCurrentTime) {
          try {
            // Real-time ad state check
            const vData = ytPlayerRef.current.getVideoData?.();
            if (vData?.video_id && currentTrackRef.current?.id) {
              const isAd = vData.video_id !== currentTrackRef.current.id;
              setIsAdPlaying(isAd);
              if (isAd) {
                isAdPlayingRef.current = true;
                try {
                  ytPlayerRef.current.mute?.();
                  ytPlayerRef.current.setPlaybackRate?.(2);
                } catch (e) {}
                setCurrentTime(0);
                setIsBuffering(true);
                return; // Freeze time at 0 during ad (treated as track loading)
              } else if (isAdPlayingRef.current) {
                // Ad completed, unmuting for song
                isAdPlayingRef.current = false;
                try {
                  ytPlayerRef.current.unMute?.();
                  ytPlayerRef.current.setPlaybackRate?.(playbackRateRef.current);
                } catch (e) {}
                setIsBuffering(false);
              }
            }

            const current = ytPlayerRef.current.getCurrentTime();
            const dur = ytPlayerRef.current.getDuration();
            if (typeof current === 'number' && !isNaN(current)) {
              setCurrentTime(current);
            }
            if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
              setDuration(dur);
            }
          } catch (e) {
            // ignore
          }
        }
      }, 300);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isPlaying]);

  const playTrack = useCallback(
    (track: MusicTrack, newQueue?: MusicTrack[], shouldOpenModal: boolean = false) => {
      const isBgm = isBgmOrClassicalTrack(track);
      const defaultQ = isBgm ? bgmTracks : musicTracks.length > 0 ? musicTracks : activeTracks;
      const q = newQueue || (queue.length > 0 ? queue : defaultQ);

      if (newQueue || queue.length === 0) {
        setQueue(q);
      }
      const idx = q.findIndex((t) => t.id === track.id);
      setQueueIndex(idx >= 0 ? idx : 0);
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(track.duration || 210);
      setIsPlaying(true);
      setIsBuffering(true);
      setIsAdPlaying(false);

      // Only open full modal sheet if explicitly requested
      if (shouldOpenModal) {
        setIsNowPlayingOpen(true);
      }

      // Trigger iOS Background Playback keep-alive & MediaSession metadata
      audioKeepAlive.onPlay(track);

      if (ytPlayerRef.current?.loadVideoById) {
        try {
          ytPlayerRef.current.loadVideoById(track.id, 0);
          ytPlayerRef.current.playVideo?.();
        } catch (e) {
          console.warn('loadVideoById failed', e);
        }
      } else {
        pendingTrackRef.current = track;
      }

      setTracks((prev) =>
        prev.map((t) => {
          if (t.id === track.id) {
            return {
              ...t,
              playCount: t.playCount + 1,
              lastPlayed: new Date().toISOString().replace('T', ' ').slice(0, 16),
            };
          }
          return t;
        })
      );
    },
    [queue, musicTracks, bgmTracks, activeTracks]
  );

  const playBgmStation = useCallback(() => {
    if (bgmTracks.length === 0) return;
    setIsShuffle(true);
    const rand = Math.floor(Math.random() * bgmTracks.length);
    playTrack(bgmTracks[rand], bgmTracks, false);
  }, [bgmTracks, playTrack]);

  const togglePlay = useCallback(() => {
    if (ytPlayerRef.current?.getPlayerState) {
      try {
        const state = ytPlayerRef.current.getPlayerState();
        if (state === 1) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
          audioKeepAlive.onPause();
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          audioKeepAlive.onPlay(currentTrack);
        }
      } catch (e) {
        setIsPlaying((prev) => !prev);
      }
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentTrack]);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    let nextIdx = 0;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = (queueIndex + 1) % queue.length;
    }
    setQueueIndex(nextIdx);
    const nextT = queue[nextIdx];
    if (nextT) {
      playTrack(nextT, queue, false);
    }
  }, [queue, queueIndex, isShuffle, playTrack]);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  const prevTrack = useCallback(() => {
    if (queue.length === 0) return;
    const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIdx);
    const prevT = queue[prevIdx];
    if (prevT) {
      playTrack(prevT, queue, false);
    }
  }, [queue, queueIndex, playTrack]);

  const seekTo = useCallback((sec: number) => {
    setCurrentTime(sec);
    if (ytPlayerRef.current?.seekTo) {
      try {
        ytPlayerRef.current.seekTo(sec, true);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (ytPlayerRef.current?.setPlaybackRate) {
      try {
        ytPlayerRef.current.setPlaybackRate(rate);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const toggleFavorite = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          return { ...t, isFavorite: !t.isFavorite };
        }
        return t;
      })
    );
    setCurrentTrack((prev) => {
      if (prev && prev.id === trackId) {
        return { ...prev, isFavorite: !prev.isFavorite };
      }
      return prev;
    });
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (minutes && minutes > 0) {
      sleepTimerRef.current = setTimeout(() => {
        if (ytPlayerRef.current?.pauseVideo) {
          ytPlayerRef.current.pauseVideo();
        }
        setIsPlaying(false);
        setSleepTimerMinutes(null);
      }, minutes * 60 * 1000);
    }
  }, []);

  // Ban / Unban actions
  const banArtist = useCallback((artist: string) => {
    setBannedArtists((prev) => (prev.includes(artist) ? prev : [...prev, artist]));
  }, []);

  const unbanArtist = useCallback((artist: string) => {
    setBannedArtists((prev) => prev.filter((a) => a !== artist));
  }, []);

  const banTrack = useCallback((trackId: string) => {
    setBannedTracks((prev) => (prev.includes(trackId) ? prev : [...prev, trackId]));
  }, []);

  const unbanTrack = useCallback((trackId: string) => {
    setBannedTracks((prev) => prev.filter((id) => id !== trackId));
  }, []);

  const clearAllBans = useCallback(() => {
    setBannedArtists([]);
    setBannedTracks([]);
  }, []);

  const setStrictnessMode = useCallback((mode: 'strict' | 'standard' | 'all') => {
    setStrictnessModeState(mode);
  }, []);

  // Allow user to manually paste or edit lyrics for a track
  const setCustomLyrics = useCallback((trackId: string, lyricsText: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, lyrics: lyricsText } : t))
    );
    setCurrentTrack((prev) => (prev && prev.id === trackId ? { ...prev, lyrics: lyricsText } : prev));
  }, []);

  const loadDemoData = useCallback(() => {
    setIsDemoMode(true);
    setTracks(DEMO_TRACKS);
    setPlaylists(DEMO_PLAYLISTS);
    setQueue(DEMO_TRACKS);
    setQueueIndex(0);
    setCurrentTrack(DEMO_TRACKS[0]);
    setCurrentTime(0);
    setIsPlaying(true);
    if (ytPlayerRef.current?.loadVideoById) {
      try {
        ytPlayerRef.current.loadVideoById(DEMO_TRACKS[0].id);
        ytPlayerRef.current.playVideo();
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const importTracks = useCallback((newTracks: MusicTrack[]) => {
    if (!newTracks || newTracks.length === 0) return;

    setIsDemoMode(false);
    setTracks(newTracks);
    setQueue(newTracks);
    setQueueIndex(0);
    setCurrentTrack(newTracks[0]);
    setCurrentTime(0);
    setDuration(newTracks[0]?.duration || 210);

    // Auto-create smart playlists
    const genreMap = new Map<string, string[]>();
    newTracks.forEach((t) => {
      if (t.genre) {
        const arr = genreMap.get(t.genre) || [];
        arr.push(t.id);
        genreMap.set(t.genre, arr);
      }
    });

    const smartPlaylists: Playlist[] = [
      {
        id: 'pl_fav_' + Date.now(),
        name: 'お気に入り・高リピート',
        trackIds: newTracks.filter((t) => t.isFavorite || t.playCount >= 3).map((t) => t.id),
        createdAt: new Date().toISOString().slice(0, 16),
        updatedAt: new Date().toISOString().slice(0, 16),
      },
      ...Array.from(genreMap.entries())
        .slice(0, 4)
        .map(([g, ids]) => ({
          id: `pl_${g}_${Date.now()}`,
          name: `${g} セレクション`,
          trackIds: ids.slice(0, 30),
          createdAt: new Date().toISOString().slice(0, 16),
          updatedAt: new Date().toISOString().slice(0, 16),
        })),
    ];
    setPlaylists(smartPlaylists);

    if (ytPlayerRef.current?.loadVideoById && newTracks[0]) {
      try {
        ytPlayerRef.current.loadVideoById(newTracks[0].id, 0);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const addSingleTrackByUrl = useCallback(
    (urlOrId: string, customTitle?: string, customArtist?: string): boolean => {
      const id = extractYouTubeId(urlOrId);
      if (!id) return false;

      const meta = extractSmartTrackMeta(customTitle || 'YouTube Music Track', customArtist || 'YouTube');

      const newTrack: MusicTrack = {
        id,
        title: meta.cleanTitle,
        artist: meta.cleanArtist,
        genre: meta.originalProducer ? 'ボカロ・VOCALOID' : 'J-POP',
        playCount: 1,
        duration: 240,
        lastPlayed: new Date().toISOString().replace('T', ' ').slice(0, 16),
        firstPlayed: new Date().toISOString().replace('T', ' ').slice(0, 16),
        isFavorite: true,
        thumbnailUrl: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      };

      setTracks((prev) => [newTrack, ...prev.filter((t) => t.id !== id)]);
      setQueue((prev) => [newTrack, ...prev]);
      playTrack(newTrack);
      return true;
    },
    [playTrack]
  );

  const clearAllData = useCallback(() => {
    if (ytPlayerRef.current?.pauseVideo) {
      ytPlayerRef.current.pauseVideo();
    }
    setTracks([]);
    setPlaylists([]);
    setQueue([]);
    setCurrentTrack(null);
    setIsPlaying(false);
    setIsDemoMode(false);
    clearDB();
    localStorage.removeItem(STORAGE_KEY_TRACKS);
    localStorage.removeItem(STORAGE_KEY_PLAYLISTS);
    localStorage.removeItem(STORAGE_KEY_IS_DEMO);
  }, []);

  const createPlaylist = useCallback((name: string, trackIds: string[]) => {
    const newPl: Playlist = {
      id: 'pl_' + Date.now(),
      name,
      trackIds,
      createdAt: new Date().toISOString().slice(0, 16),
      updatedAt: new Date().toISOString().slice(0, 16),
    };
    setPlaylists((prev) => [newPl, ...prev]);
  }, []);

  // Register iOS Lock Screen and MediaSession action listeners
  useEffect(() => {
    audioKeepAlive.setupMediaSessionHandlers({
      onPlay: () => togglePlay(),
      onPause: () => togglePlay(),
      onNext: () => nextTrack(),
      onPrev: () => prevTrack(),
      onSeek: (sec) => seekTo(sec),
    });
  }, [togglePlay, nextTrack, prevTrack, seekTo]);

  // Global Keyboard Shortcuts (Space: Play/Pause, Meta/Ctrl+Arrows: Skip, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || (activeEl as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        nextTrack();
      } else if (e.code === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        prevTrack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, nextTrack, prevTrack]);

  return (
    <PlayerContext.Provider
      value={{
        tracks,
        activeTracks,
        musicTracks,
        bgmTracks,
        playlists,
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        queue,
        queueIndex,
        repeatMode,
        isShuffle,
        sleepTimerMinutes,
        isNowPlayingOpen,
        ytPlayerReady,
        nowPlayingTab,
        isDemoMode,
        isLoadingLyrics,
        isBuffering,
        isAdPlaying,
        bannedArtists,
        bannedTracks,
        strictnessMode,
        selectedArtistForDetail,
        setSelectedArtistForDetail,
        setStrictnessMode,
        banArtist,
        unbanArtist,
        banTrack,
        unbanTrack,
        clearAllBans,
        setCustomLyrics,
        setNowPlayingTab,
        playTrack,
        playBgmStation,
        togglePlay,
        nextTrack,
        prevTrack,
        seekTo,
        setPlaybackRate,
        setRepeatMode,
        setIsShuffle,
        setSleepTimer,
        toggleFavorite,
        setIsNowPlayingOpen,
        loadDemoData,
        importTracks,
        addSingleTrackByUrl,
        clearAllData,
        createPlaylist,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
