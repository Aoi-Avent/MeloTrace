import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MusicTrack,
  Playlist,
  RepeatMode,
  ArtworkAspectRatio,
  LyricsDisplayMode,
  UserAccount,
} from '../types/music';
import { DEMO_TRACKS, DEMO_PLAYLISTS } from '../data/demoData';
import { extractYouTubeId, extractSmartTrackMeta, isLikelyMusic, isBgmOrClassicalTrack } from '../utils/parser';
import { getLyricsForTrack } from '../utils/lyricsService';
import { audioKeepAlive } from '../utils/audioKeepAlive';
import {
  GOOGLE_CLIENT_ID,
  SyncPayload,
  requestAccessToken,
  fetchProfile,
  revokeToken,
  pullFromCloud,
  pushToCloud,
} from '../utils/cloudSync';
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
  createPlaylist: (name: string, description?: string, color?: string, initialTrackIds?: string[]) => Playlist;
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  resyncPlayer: () => void;
  unmuteAudio: () => void;
  isPlayerMuted: boolean;
  // Lyrics offset & display mode
  lyricsOffset: number;
  adjustLyricsOffset: (delta: number) => void;
  resetLyricsOffset: () => void;
  lyricsDisplayMode: LyricsDisplayMode;
  setLyricsDisplayMode: (mode: LyricsDisplayMode) => void;
  // Artwork aspect ratio
  artworkAspectRatio: ArtworkAspectRatio;
  setArtworkAspectRatio: (ratio: ArtworkAspectRatio) => void;
  // Retro Player (iPod / Walkman)
  isRetroPlayerOpen: boolean;
  setIsRetroPlayerOpen: (open: boolean) => void;
  retroPlayerSkin: 'ipod' | 'walkman';
  setRetroPlayerSkin: (skin: 'ipod' | 'walkman') => void;
  // Background Guide
  isBgGuideOpen: boolean;
  setIsBgGuideOpen: (open: boolean) => void;
  // Cloud & Account
  currentUser: UserAccount | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isCloudSyncing: boolean;
  syncWithCloud: () => Promise<void>;
  cloudConfigured: boolean;
  cloudError: string | null;
  // YouTube側の視聴履歴にも記録させる（埋め込みをyoutube.com経由にする。反映には再読み込みが必要）
  recordYtHistory: boolean;
  setRecordYtHistory: (v: boolean) => void;
}

const STORAGE_KEY_TRACKS = 'melotrace_tracks_v5';
const STORAGE_KEY_PLAYLISTS = 'melotrace_playlists_v5';
const STORAGE_KEY_IS_DEMO = 'melotrace_is_demo_v5';
const STORAGE_KEY_BANNED_ARTISTS = 'melotrace_banned_artists_v1';
const STORAGE_KEY_BANNED_TRACKS = 'melotrace_banned_tracks_v1';
const STORAGE_KEY_STRICTNESS = 'melotrace_strictness_v1';
const STORAGE_KEY_LAST_TRACK_ID = 'melotrace_last_track_id_v5';
const STORAGE_KEY_LAST_QUEUE_IDS = 'melotrace_last_queue_ids_v5';
const YT_HISTORY_KEY = 'melotrace_record_yt_history_v1';
const LOCAL_MODIFIED_KEY = 'melotrace_local_modified_v1';

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
  const [isPlayerMuted, setIsPlayerMuted] = useState<boolean>(false);

  // New States: Lyrics offset, lyrics display mode, artwork ratio, retro mode, cloud sync
  const [lyricsOffset, setLyricsOffset] = useState<number>(0);
  const [lyricsDisplayMode, setLyricsDisplayModeState] = useState<LyricsDisplayMode>(() => {
    try {
      const saved = localStorage.getItem('melotrace_lyrics_mode_v1');
      if (saved === 'static' || saved === 'dynamic') return saved as LyricsDisplayMode;
    } catch (e) {}
    return 'dynamic';
  });
  const [artworkAspectRatio, setArtworkAspectRatioState] = useState<ArtworkAspectRatio>(() => {
    try {
      const saved = localStorage.getItem('melotrace_artwork_ratio_v1');
      if (saved === 'auto' || saved === '1:1' || saved === '16:9') return saved as ArtworkAspectRatio;
    } catch (e) {}
    return 'auto';
  });
  const [isRetroPlayerOpen, setIsRetroPlayerOpen] = useState<boolean>(false);
  const [retroPlayerSkin, setRetroPlayerSkin] = useState<'ipod' | 'walkman'>('ipod');
  const [isBgGuideOpen, setIsBgGuideOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('melotrace_user_account_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [recordYtHistory, setRecordYtHistoryState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(YT_HISTORY_KEY) === 'true';
    } catch (e) {
      return false;
    }
  });

  const ytPlayerRef = useRef<any>(null);
  const pendingTrackRef = useRef<MusicTrack | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrorsRef = useRef<number>(0);
  const nextTrackRef = useRef<() => void>(() => {});
  const handleTrackEndedRef = useRef<() => void>(() => {});
  const currentTrackRef = useRef<MusicTrack | null>(currentTrack);
  const playbackRateRef = useRef<number>(playbackRate);
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(false);
  const isAdPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  const isHydratedRef = useRef<boolean>(false);

  // Restore full library from IndexedDB if available
  useEffect(() => {
    let isMounted = true;
    Promise.all([loadTracksFromDB(), loadPlaylistsFromDB()]).then(([dbTracks, dbPls]) => {
      if (!isMounted) return;
      if (dbTracks && dbTracks.length > 0) {
        setTracks(dbTracks);
        setIsDemoMode(false);
      }
      if (dbPls && dbPls.length > 0) {
        setPlaylists(dbPls);
      }
      isHydratedRef.current = true;
    }).catch(() => {
      isHydratedRef.current = true;
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync full library to IndexedDB (non-blocking) and keep lightweight fast-boot cache in localStorage
  useEffect(() => {
    if (!isHydratedRef.current) return; // PREVENT WIPING DATABASE ON INITIAL RENDER!
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
          host: (() => {
            try {
              return localStorage.getItem(YT_HISTORY_KEY) === 'true' ? 'https://www.youtube.com' : 'https://www.youtube-nocookie.com';
            } catch (e) {
              return 'https://www.youtube-nocookie.com';
            }
          })(),
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

            // Sync CarPlay / Lock Screen progress scrubber
            if (typeof current === 'number' && typeof dur === 'number' && dur > 0) {
              audioKeepAlive.updatePositionState(current, dur);
            }

            // Sync mute status
            if (ytPlayerRef.current.isMuted) {
              const muted = Boolean(ytPlayerRef.current.isMuted());
              setIsPlayerMuted(muted);
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

  const unmuteAudio = useCallback(() => {
    try {
      if (ytPlayerRef.current?.unMute) {
        ytPlayerRef.current.unMute();
      }
      if (ytPlayerRef.current?.setVolume) {
        ytPlayerRef.current.setVolume(100);
      }
      setIsPlayerMuted(false);
    } catch (e) {}
  }, []);

  const resyncPlayer = useCallback(() => {
    if (!currentTrack) return;
    try {
      unmuteAudio();
      const pos = currentTime || 0;
      if (ytPlayerRef.current?.loadVideoById) {
        ytPlayerRef.current.loadVideoById(currentTrack.id, pos);
        ytPlayerRef.current.playVideo?.();
      }
      setIsPlaying(true);
      setIsBuffering(false);
      audioKeepAlive.onPlay(currentTrack);
    } catch (e) {
      console.warn('resyncPlayer failed:', e);
    }
  }, [currentTrack, currentTime, unmuteAudio]);

  // Reset lyrics offset whenever track changes
  useEffect(() => {
    setLyricsOffset(0);
  }, [currentTrack?.id]);

  const adjustLyricsOffset = useCallback((delta: number) => {
    setLyricsOffset((prev) => Math.round((prev + delta) * 10) / 10);
  }, []);

  const resetLyricsOffset = useCallback(() => {
    setLyricsOffset(0);
  }, []);

  const setLyricsDisplayMode = useCallback((mode: LyricsDisplayMode) => {
    setLyricsDisplayModeState(mode);
    try {
      localStorage.setItem('melotrace_lyrics_mode_v1', mode);
    } catch (e) {}
  }, []);

  const setArtworkAspectRatio = useCallback((ratio: ArtworkAspectRatio) => {
    setArtworkAspectRatioState(ratio);
    try {
      localStorage.setItem('melotrace_artwork_ratio_v1', ratio);
    } catch (e) {}
  }, []);

  const createPlaylist = useCallback(
    (name: string, description?: string, color?: string, initialTrackIds: string[] = []): Playlist => {
      const newPl: Playlist = {
        id: 'pl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: name.trim() || '新規プレイリスト',
        description: description?.trim(),
        color: color || '#fa2d48',
        coverTrackId: initialTrackIds[0],
        trackIds: initialTrackIds,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
      setPlaylists((prev) => [newPl, ...prev]);
      return newPl;
    },
    []
  );

  const updatePlaylist = useCallback((playlistId: string, updates: Partial<Playlist>) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, ...updates, updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) }
          : pl
      )
    );
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
  }, []);

  const addTrackToPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          if (pl.trackIds.includes(trackId)) return pl;
          return {
            ...pl,
            trackIds: [...pl.trackIds, trackId],
            coverTrackId: pl.coverTrackId || trackId,
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
        }
        return pl;
      })
    );
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          const nextIds = pl.trackIds.filter((id) => id !== trackId);
          return {
            ...pl,
            trackIds: nextIds,
            coverTrackId: pl.coverTrackId === trackId ? nextIds[0] : pl.coverTrackId,
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
        }
        return pl;
      })
    );
  }, []);

  const setRecordYtHistory = useCallback((v: boolean) => {
    setRecordYtHistoryState(v);
    try {
      localStorage.setItem(YT_HISTORY_KEY, String(v));
    } catch (e) {}
  }, []);

  // ---- Cloud sync (Google Drive appDataFolder) ----
  const tokenRef = useRef<{ accessToken: string; expiresAt: number } | null>(null);
  const cloudFileIdRef = useRef<string | null>(null);
  const cloudExtraFavRef = useRef<string[]>([]); // クラウド上にあるが、この端末のライブラリに無い曲のスキ
  const syncingRef = useRef(false);
  const skipNextSigRef = useRef(false);

  const nowIso = () => new Date().toISOString();

  const buildPayload = useCallback((): SyncPayload => {
    const localFav = tracks.filter((t) => t.isFavorite).map((t) => t.id);
    const known = new Set(tracks.map((t) => t.id));
    const keep = cloudExtraFavRef.current.filter((id) => !known.has(id));
    let modified = nowIso();
    try {
      modified = localStorage.getItem(LOCAL_MODIFIED_KEY) || modified;
    } catch (e) {}
    return {
      version: 1,
      updatedAt: modified,
      favoriteIds: Array.from(new Set([...localFav, ...keep])),
      bannedArtists,
      bannedTracks,
      playlists,
      settings: { strictnessMode, lyricsDisplayMode, artworkAspectRatio, retroPlayerSkin },
    };
  }, [tracks, bannedArtists, bannedTracks, playlists, strictnessMode, lyricsDisplayMode, artworkAspectRatio, retroPlayerSkin]);

  const applyPayload = useCallback((p: SyncPayload) => {
    const favSet = new Set(p.favoriteIds);
    setTracks((prev) => {
      cloudExtraFavRef.current = p.favoriteIds.filter((id) => !prev.some((t) => t.id === id));
      return prev.map((t) => (t.isFavorite === favSet.has(t.id) ? t : { ...t, isFavorite: favSet.has(t.id) }));
    });
    setBannedArtists(p.bannedArtists || []);
    setBannedTracks(p.bannedTracks || []);
    setPlaylists(p.playlists || []);
    if (p.settings?.strictnessMode) setStrictnessModeState(p.settings.strictnessMode);
    if (p.settings?.lyricsDisplayMode) setLyricsDisplayModeState(p.settings.lyricsDisplayMode);
    if (p.settings?.artworkAspectRatio) setArtworkAspectRatioState(p.settings.artworkAspectRatio);
    if (p.settings?.retroPlayerSkin) setRetroPlayerSkin(p.settings.retroPlayerSkin);
  }, []);

  const ensureToken = useCallback(async () => {
    const t = tokenRef.current;
    if (t && t.expiresAt > Date.now()) return t.accessToken;
    // 期限切れ（約1時間）: 同意済みなら無操作で更新を試みる（ブラウザによってはポップアップが開く）
    const fresh = await requestAccessToken('');
    tokenRef.current = fresh;
    return fresh.accessToken;
  }, []);

  const runSync = useCallback(
    async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      setIsCloudSyncing(true);
      setCloudError(null);
      try {
        const token = await ensureToken();
        const remote = await pullFromCloud(token);
        let localModified = '';
        try {
          localModified = localStorage.getItem(LOCAL_MODIFIED_KEY) || '';
        } catch (e) {}
        if (remote) cloudFileIdRef.current = remote.fileId;
        if (remote && remote.payload.updatedAt > localModified) {
          skipNextSigRef.current = true;
          setTimeout(() => {
            skipNextSigRef.current = false;
          }, 1500);
          applyPayload(remote.payload);
          try {
            localStorage.setItem(LOCAL_MODIFIED_KEY, remote.payload.updatedAt);
          } catch (e) {}
        } else {
          cloudFileIdRef.current = await pushToCloud(token, buildPayload(), cloudFileIdRef.current);
        }
        const done = nowIso().replace('T', ' ').slice(0, 16);
        setCurrentUser((u) => {
          if (!u) return u;
          const updated = { ...u, lastSync: done };
          try {
            localStorage.setItem('melotrace_user_account_v1', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      } catch (e: any) {
        setCloudError(e?.message || '同期に失敗しました');
      } finally {
        syncingRef.current = false;
        setIsCloudSyncing(false);
      }
    },
    [ensureToken, applyPayload, buildPayload]
  );

  const loginWithGoogle = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      setCloudError('Googleログインはまだ設定されていません（VITE_GOOGLE_CLIENT_ID が未設定です）');
      return;
    }
    setIsCloudSyncing(true);
    setCloudError(null);
    try {
      const tok = await requestAccessToken('select_account');
      tokenRef.current = tok;
      const prof = await fetchProfile(tok.accessToken);
      const user: UserAccount = {
        uid: prof.sub,
        email: prof.email,
        displayName: prof.name || prof.email,
        photoURL: prof.picture,
      };
      setCurrentUser(user);
      localStorage.setItem('melotrace_user_account_v1', JSON.stringify(user));
    } catch (e: any) {
      setCloudError(e?.message || 'ログインに失敗しました');
      setIsCloudSyncing(false);
      return;
    }
    setIsCloudSyncing(false);
    await runSync();
  }, [runSync]);

  const logout = useCallback(() => {
    if (tokenRef.current) revokeToken(tokenRef.current.accessToken);
    tokenRef.current = null;
    cloudFileIdRef.current = null;
    setCurrentUser(null);
    setCloudError(null);
    localStorage.removeItem('melotrace_user_account_v1');
  }, []);

  const syncWithCloud = useCallback(async () => {
    if (!currentUser) return;
    await runSync();
  }, [currentUser, runSync]);

  // 同期対象（スキ・Ban・プレイリスト・設定）が変わったら更新時刻を記録し、ログイン中なら自動でクラウドへ保存
  const syncSignature = useMemo(
    () =>
      JSON.stringify([
        tracks.filter((t) => t.isFavorite).map((t) => t.id),
        bannedArtists,
        bannedTracks,
        playlists,
        strictnessMode,
        lyricsDisplayMode,
        artworkAspectRatio,
        retroPlayerSkin,
      ]),
    [tracks, bannedArtists, bannedTracks, playlists, strictnessMode, lyricsDisplayMode, artworkAspectRatio, retroPlayerSkin]
  );
  const lastSigRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastSigRef.current === null) {
      lastSigRef.current = syncSignature;
      return;
    }
    if (lastSigRef.current === syncSignature) return;
    lastSigRef.current = syncSignature;
    // クラウドからの反映による変化は「ローカル編集」として扱わない
    if (skipNextSigRef.current) {
      skipNextSigRef.current = false;
      return;
    }
    try {
      localStorage.setItem(LOCAL_MODIFIED_KEY, nowIso());
    } catch (e) {}
    if (!currentUser || !tokenRef.current || tokenRef.current.expiresAt <= Date.now()) return;
    const timer = setTimeout(async () => {
      try {
        const token = tokenRef.current?.accessToken;
        if (!token) return;
        cloudFileIdRef.current = await pushToCloud(token, buildPayload(), cloudFileIdRef.current);
        setCloudError(null);
      } catch (e: any) {
        setCloudError(e?.message || '自動保存に失敗しました');
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [syncSignature, currentUser, buildPayload]);

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
        updatePlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        resyncPlayer,
        unmuteAudio,
        isPlayerMuted,
        lyricsOffset,
        adjustLyricsOffset,
        resetLyricsOffset,
        lyricsDisplayMode,
        setLyricsDisplayMode,
        artworkAspectRatio,
        setArtworkAspectRatio,
        isRetroPlayerOpen,
        setIsRetroPlayerOpen,
        retroPlayerSkin,
        setRetroPlayerSkin,
        isBgGuideOpen,
        setIsBgGuideOpen,
        currentUser,
        loginWithGoogle,
        logout,
        isCloudSyncing,
        syncWithCloud,
        cloudConfigured: Boolean(GOOGLE_CLIENT_ID),
        cloudError,
        recordYtHistory,
        setRecordYtHistory,
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
