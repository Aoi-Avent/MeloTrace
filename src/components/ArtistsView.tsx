import React, { useMemo, useState } from 'react';
import { Search, ArrowDownUp, Heart, Play, BadgeCheck } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { ArtistSummary, MusicTrack } from '../types/music';
import { BackgroundPlayButton } from './BackgroundGuide';
import { ArtistFilterToggle } from './ArtistFilterToggle';

type ArtistSortKey = 'name' | 'plays' | 'first' | 'last' | 'favorites' | 'tracks';
type Dir = 'asc' | 'desc';

const SORTS: { key: ArtistSortKey; label: string; defaultDir: Dir }[] = [
  { key: 'name', label: '五十音順', defaultDir: 'asc' },
  { key: 'plays', label: 'よく聴く順', defaultDir: 'desc' },
  { key: 'last', label: '最近聴いた順', defaultDir: 'desc' },
  { key: 'first', label: '初めて聴いた順', defaultDir: 'asc' },
  { key: 'favorites', label: 'スキの数順', defaultDir: 'desc' },
  { key: 'tracks', label: '曲数順', defaultDir: 'desc' },
];

const collator = new Intl.Collator('ja', { sensitivity: 'base', numeric: true });
const STORAGE_KEY = 'melotrace_artists_sort_v1';

export const ArtistsView: React.FC = () => {
  const { musicTracks, setSelectedArtistForDetail, playTrack, artistStatus, setArtistOverride } = usePlayer();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<ArtistSortKey>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (v && SORTS.some((s) => s.key === v.key)) return v.key;
    } catch (e) {}
    return 'plays';
  });
  const [dir, setDir] = useState<Dir>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (v && (v.dir === 'asc' || v.dir === 'desc')) return v.dir;
    } catch (e) {}
    return 'desc';
  });

  const update = (key: ArtistSortKey, d: Dir) => {
    setSortKey(key);
    setDir(d);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ key, dir: d }));
    } catch (e) {}
  };

  const artists: ArtistSummary[] = useMemo(() => {
    const map = new Map<string, ArtistSummary>();
    for (const t of musicTracks) {
      const name = t.artist || '(不明)';
      let a = map.get(name);
      if (!a) {
        a = { name, trackCount: 0, totalPlayCount: 0, favoriteCount: 0, tracks: [], thumbnailUrl: undefined };
        map.set(name, a);
      }
      a.trackCount += 1;
      a.totalPlayCount += t.playCount || 0;
      if (t.isFavorite) a.favoriteCount += 1;
      if (t.firstPlayed && (!a.firstPlayed || t.firstPlayed < a.firstPlayed)) a.firstPlayed = t.firstPlayed;
      if (t.lastPlayed && (!a.lastPlayed || t.lastPlayed > a.lastPlayed)) a.lastPlayed = t.lastPlayed;
      a.tracks.push(t);
    }
    // 代表サムネイル: 再生回数が最も多い曲
    map.forEach((a) => {
      const top = [...a.tracks].sort((x, y) => (y.playCount || 0) - (x.playCount || 0))[0];
      a.thumbnailUrl = top ? `https://img.youtube.com/vi/${top.id}/mqdefault.jpg` : undefined;
    });
    return Array.from(map.values());
  }, [musicTracks]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? artists.filter((a) => a.name.toLowerCase().includes(q)) : artists;
    const sign = dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let c = 0;
      switch (sortKey) {
        case 'name':
          c = collator.compare(a.name, b.name);
          break;
        case 'plays':
          c = a.totalPlayCount - b.totalPlayCount;
          break;
        case 'tracks':
          c = a.trackCount - b.trackCount;
          break;
        case 'favorites':
          c = a.favoriteCount - b.favoriteCount;
          break;
        case 'first':
          c = (a.firstPlayed || '9999').localeCompare(b.firstPlayed || '9999');
          break;
        case 'last':
          c = (a.lastPlayed || '').localeCompare(b.lastPlayed || '');
          break;
      }
      // 同値は名前順で安定化（二次キー）
      return c !== 0 ? c * sign : collator.compare(a.name, b.name);
    });
  }, [artists, query, sortKey, dir]);

  const subtitle = (a: ArtistSummary) => {
    switch (sortKey) {
      case 'favorites':
        return `スキ ${a.favoriteCount}曲 ・ ${a.trackCount}曲`;
      case 'first':
        return `初回 ${a.firstPlayed?.slice(0, 10) ?? '不明'} ・ ${a.trackCount}曲`;
      case 'last':
        return `最終 ${a.lastPlayed?.slice(0, 10) ?? '不明'} ・ ${a.trackCount}曲`;
      default:
        return `${a.trackCount}曲 ・ 再生 ${a.totalPlayCount}回`;
    }
  };

  return (
    <div className="ios-scroll-container pb-36 pt-2 px-4 max-w-lg mx-auto">
      <header className="pt-2 pb-2">
        <h1 className="text-2xl font-bold text-white">アーティスト</h1>
        <p className="text-xs text-[#8e8e93] mt-0.5">{list.length} 組</p>
        <BackgroundPlayButton compact className="mt-2" />
        <ArtistFilterToggle className="mt-2" />
      </header>

      <div className="relative mb-3">
        <Search className="w-4 h-4 text-[#8e8e93] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="アーティスト・チャンネルを検索"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#1c1c1e] text-sm text-white placeholder:text-[#8e8e93] focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => update(s.key, sortKey === s.key ? (dir === 'asc' ? 'desc' : 'asc') : s.defaultDir)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${
              sortKey === s.key ? 'bg-white text-black' : 'bg-white/10 text-white/80'
            }`}
          >
            {s.label}
            {sortKey === s.key && <span className="text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[#8e8e93] mb-2 flex items-center gap-1">
        <ArrowDownUp className="w-3 h-3" />選択中のボタンをもう一度押すと昇順／降順が切り替わります
      </p>

      <div className="flex flex-col gap-1.5">
        {list.map((a) => (
          <div
            key={a.name}
            onClick={() => setSelectedArtistForDetail(a.name)}
            className="flex items-center gap-3 p-2.5 rounded-xl apple-card hover:bg-white/[0.08] cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2c2c2e] shrink-0">
              {a.thumbnailUrl && (
                <img
                  src={a.thumbnailUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white truncate flex items-center gap-1">
                {a.name}
                {artistStatus(a.name) === 'verified' && <BadgeCheck className="w-3.5 h-3.5 text-accent shrink-0" aria-label="実在するアーティスト" />}
              </h4>
              <p className="text-[11px] text-[#8e8e93] truncate flex items-center gap-1">
                {sortKey === 'favorites' && <Heart className="w-3 h-3 text-accent fill-accent" />}
                {subtitle(a)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const verified = artistStatus(a.name) === 'verified';
                if (window.confirm(verified ? `「${a.name}」を公式アーティストから外しますか？` : `「${a.name}」を公式アーティストとして扱いますか？`)) {
                  setArtistOverride(a.name, verified ? 'exclude' : 'official');
                }
              }}
              className="w-8 h-8 rounded-full bg-white/5 text-[#8e8e93] flex items-center justify-center shrink-0"
              aria-label="公式かどうかを手動で変更"
            >
              <BadgeCheck className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const sorted: MusicTrack[] = [...a.tracks].sort((x, y) => (y.playCount || 0) - (x.playCount || 0));
                playTrack(sorted[0], sorted);
              }}
              className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0"
              aria-label={`${a.name}を再生`}
            >
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </button>
          </div>
        ))}
        {list.length === 0 && <p className="text-xs text-[#8e8e93] text-center py-10">該当するアーティストがいません。</p>}
      </div>
    </div>
  );
};
