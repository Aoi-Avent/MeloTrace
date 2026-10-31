import { MusicTrack } from '../types/music';

export type TrackSortKey = 'artist' | 'title' | 'playCount' | 'lastPlayed' | 'firstPlayed' | 'favorite' | 'genre';
export type SortDir = 'asc' | 'desc';
export interface SortRule {
  key: TrackSortKey;
  dir: SortDir;
}

export const SORT_KEY_LABELS: Record<TrackSortKey, string> = {
  artist: 'アーティスト',
  title: '曲名',
  playCount: '再生回数',
  lastPlayed: '最近聴いた',
  firstPlayed: '最初に聴いた',
  favorite: 'スキ',
  genre: 'ジャンル',
};

/** 各キーの「自然な」初期方向（数値・日付は降順、文字は昇順） */
export const DEFAULT_DIR: Record<TrackSortKey, SortDir> = {
  artist: 'asc',
  title: 'asc',
  playCount: 'desc',
  lastPlayed: 'desc',
  firstPlayed: 'asc',
  favorite: 'desc',
  genre: 'asc',
};

const collator = new Intl.Collator('ja', { sensitivity: 'base', numeric: true });

function compareBy(a: MusicTrack, b: MusicTrack, key: TrackSortKey): number {
  switch (key) {
    case 'artist':
      return collator.compare(a.artist || '', b.artist || '');
    case 'title':
      return collator.compare(a.title || '', b.title || '');
    case 'genre':
      return collator.compare(a.genre || '', b.genre || '');
    case 'playCount':
      return (a.playCount || 0) - (b.playCount || 0);
    case 'favorite':
      return Number(!!a.isFavorite) - Number(!!b.isFavorite);
    case 'lastPlayed':
      return (a.lastPlayed || '').localeCompare(b.lastPlayed || '');
    case 'firstPlayed': {
      // 未記録は「最後」に回すため、昇順時に大きい値として扱う
      const fa = a.firstPlayed || '9999';
      const fb = b.firstPlayed || '9999';
      return fa.localeCompare(fb);
    }
  }
}

/** 多重ソート（先頭のルールが最優先。同値なら次のルールで比較） */
export function sortTracksMulti(tracks: MusicTrack[], rules: SortRule[]): MusicTrack[] {
  if (rules.length === 0) return [...tracks];
  return [...tracks].sort((a, b) => {
    for (const r of rules) {
      const c = compareBy(a, b, r.key);
      if (c !== 0) return r.dir === 'asc' ? c : -c;
    }
    return 0;
  });
}

export interface ArtistGroup {
  artist: string;
  tracks: MusicTrack[];
}

/** アーティスト毎にまとめる（グループ内の順序は渡された tracks の順序を保持。グループ順は先頭曲の出現順） */
export function groupByArtist(tracks: MusicTrack[]): ArtistGroup[] {
  const map = new Map<string, MusicTrack[]>();
  for (const t of tracks) {
    const k = t.artist || '(不明)';
    const arr = map.get(k);
    if (arr) arr.push(t);
    else map.set(k, [t]);
  }
  return Array.from(map, ([artist, list]) => ({ artist, tracks: list }));
}

export const DEFAULT_SORT_RULES: SortRule[] = [{ key: 'playCount', dir: 'desc' }];
export const MAX_SORT_RULES = 4;
