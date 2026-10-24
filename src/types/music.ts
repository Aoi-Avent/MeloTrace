export interface MusicTrack {
  id: string; // YouTube Video ID (11 chars)
  title: string;
  artist: string;
  channelId?: string;
  genre: string;
  playCount: number;
  duration?: number | null; // in seconds
  lastPlayed: string; // YYYY-MM-DD HH:mm
  firstPlayed?: string;
  isFavorite: boolean;
  thumbnailUrl: string;
  lyrics?: string; // LRC formatted or plain text
  notes?: string;
  isDemo?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type PlayMode = 'stream' | 'youtube';
export type RepeatMode = 'off' | 'all' | 'one';
export type ActiveTab = 'home' | 'radio' | 'library' | 'search' | 'analytics' | 'import';

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface QuickMixItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'mood' | 'genre' | 'history' | 'activity';
  color: string;
  filterFn: (tracks: MusicTrack[]) => MusicTrack[];
}
