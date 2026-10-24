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
export type ActiveTab = 'home' | 'library' | 'analytics' | 'import';

export interface LyricLine {
  time: number; // in seconds
  text: string;
}
