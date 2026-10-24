import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { MusicTrack, Playlist, PlayMode, RepeatMode } from '../types/music';
import { DEMO_TRACKS, DEMO_PLAYLISTS } from '../data/demoData';
import { extractYouTubeId } from '../utils/parser';

interface PlayerContextType {
  tracks: MusicTrack[];
  playlists: Playlist[];
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  queue: MusicTrack[];
  queueIndex: number;
  playMode: PlayMode;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  sleepTimerMinutes: number | null;
  isNowPlayingOpen: boolean;
  isStreamLoading: boolean;
  streamError: string | null;
  playTrack: (track: MusicTrack, newQueue?: MusicTrack[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (sec: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackRate: (rate: number) => void;
  setPlayMode: (mode: PlayMode) => void;
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

const STORAGE_KEY_TRACKS = 'melotrace_tracks_v2';
const STORAGE_KEY_PLAYLISTS = 'melotrace_playlists_v2';

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRACKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if user has old invalid IDs, auto-upgrade
          if (parsed.some((t: any) => t.id === 'f04z12v7cI8' || t.id === 'by4SYYWlhEs' || t.id === 'j1hft9WQI9U')) {
            return DEMO_TRACKS;
          }
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

  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(tracks[0] || null);
  const [queue, setQueue] = useState<MusicTrack[]>(tracks);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(tracks[0]?.duration || 210);
  const [volume, setVolumeState] = useState<number>(1);
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const [playMode, setPlayMode] = useState<PlayMode>('youtube');
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isStreamLoading, setIsStreamLoading] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(tracks));
    } catch (e) {
      console.warn('Failed to save tracks to localStorage', e);
    }
  }, [tracks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLISTS, JSON.stringify(playlists));
    } catch (e) {
      console.warn('Failed to save playlists to localStorage', e);
    }
  }, [playlists]);

  // Simulated playback time increment for synced lyrics and progress bar
  useEffect(() => {
    if (isPlaying) {
      timerIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            handleTrackEnded();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isPlaying, duration]);

  // Media Session integration
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.genre || 'MeloTrace',
          artwork: [
            { src: currentTrack.thumbnailUrl, sizes: '512x512', type: 'image/jpeg' },
            { src: `https://img.youtube.com/vi/${currentTrack.id}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => togglePlay());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
        navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      } catch (e) {
        // MediaSession optional
      }
    }
  }, [currentTrack]);

  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'one') {
      setCurrentTime(0);
      return;
    }
    nextTrack();
  }, [repeatMode]);

  const playTrack = useCallback((track: MusicTrack, newQueue?: MusicTrack[]) => {
    const q = newQueue || queue;
    if (newQueue) {
      setQueue(newQueue);
    }
    const idx = q.findIndex(t => t.id === track.id);
    setQueueIndex(idx >= 0 ? idx : 0);
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration || 210);
    setIsPlaying(true);

    // Update track play count and lastPlayed
    setTracks(prev => prev.map(t => {
      if (t.id === track.id) {
        return {
          ...t,
          playCount: t.playCount + 1,
          lastPlayed: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };
      }
      return t;
    }));
  }, [queue]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

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
      playTrack(nextT, queue);
    }
  }, [queue, queueIndex, isShuffle, playTrack]);

  const prevTrack = useCallback(() => {
    if (queue.length === 0) return;
    const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIdx);
    const prevT = queue[prevIdx];
    if (prevT) {
      playTrack(prevT, queue);
    }
  }, [queue, queueIndex, playTrack]);

  const seekTo = useCallback((sec: number) => {
    setCurrentTime(sec);
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(Math.max(0, Math.min(1, vol)));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
  }, []);

  const toggleFavorite = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        return { ...t, isFavorite: !t.isFavorite };
      }
      return t;
    }));
    setCurrentTrack(prev => {
      if (prev && prev.id === trackId) {
        return { ...prev, isFavorite: !prev.isFavorite };
      }
      return prev;
    });
  }, []);

  // Sleep timer
  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (minutes && minutes > 0) {
      sleepTimerRef.current = setTimeout(() => {
        setIsPlaying(false);
        setSleepTimerMinutes(null);
      }, minutes * 60 * 1000);
    }
  }, []);

  const loadDemoData = useCallback(() => {
    setTracks(DEMO_TRACKS);
    setPlaylists(DEMO_PLAYLISTS);
    setQueue(DEMO_TRACKS);
    setQueueIndex(0);
    setCurrentTrack(DEMO_TRACKS[0]);
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const importTracks = useCallback((newTracks: MusicTrack[]) => {
    if (!newTracks || newTracks.length === 0) return;
    setTracks(prev => {
      const map = new Map<string, MusicTrack>();
      prev.forEach(t => map.set(t.id, t));
      newTracks.forEach(t => {
        const exist = map.get(t.id);
        if (exist) {
          map.set(t.id, {
            ...exist,
            playCount: exist.playCount + t.playCount,
            lastPlayed: t.lastPlayed > exist.lastPlayed ? t.lastPlayed : exist.lastPlayed
          });
        } else {
          map.set(t.id, t);
        }
      });
      return Array.from(map.values()).sort((a, b) => b.playCount - a.playCount);
    });
    setQueue(prev => [...newTracks, ...prev]);
  }, []);

  const addSingleTrackByUrl = useCallback((urlOrId: string, customTitle?: string, customArtist?: string): boolean => {
    const id = extractYouTubeId(urlOrId);
    if (!id) return false;

    const newTrack: MusicTrack = {
      id,
      title: customTitle || 'YouTube Music Track',
      artist: customArtist || 'YouTube',
      genre: 'J-POP',
      playCount: 1,
      duration: 240,
      lastPlayed: new Date().toISOString().replace('T', ' ').slice(0, 16),
      firstPlayed: new Date().toISOString().replace('T', ' ').slice(0, 16),
      isFavorite: true,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
    };

    setTracks(prev => [newTrack, ...prev.filter(t => t.id !== id)]);
    setQueue(prev => [newTrack, ...prev]);
    playTrack(newTrack);
    return true;
  }, [playTrack]);

  const clearAllData = useCallback(() => {
    setTracks([]);
    setPlaylists([]);
    setQueue([]);
    setCurrentTrack(null);
    setIsPlaying(false);
    localStorage.removeItem(STORAGE_KEY_TRACKS);
    localStorage.removeItem(STORAGE_KEY_PLAYLISTS);
  }, []);

  const createPlaylist = useCallback((name: string, trackIds: string[]) => {
    const newPl: Playlist = {
      id: 'pl_' + Date.now(),
      name,
      trackIds,
      createdAt: new Date().toISOString().slice(0, 16),
      updatedAt: new Date().toISOString().slice(0, 16)
    };
    setPlaylists(prev => [newPl, ...prev]);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        tracks,
        playlists,
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        playbackRate,
        queue,
        queueIndex,
        playMode,
        repeatMode,
        isShuffle,
        sleepTimerMinutes,
        isNowPlayingOpen,
        isStreamLoading,
        streamError,
        playTrack,
        togglePlay,
        nextTrack,
        prevTrack,
        seekTo,
        setVolume,
        setPlaybackRate,
        setPlayMode,
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
