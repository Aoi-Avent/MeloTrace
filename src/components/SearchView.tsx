import React, { useState, useMemo } from 'react';
import {
  Search as SearchIcon,
  X,
  Play,
  Heart,
  Music2,
  Sparkles,
  Flame,
  ArrowRight,
  Disc3,
  User,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { MusicTrack } from '../types/music';

interface SearchViewProps {
  onSelectArtist: (artist: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ onSelectArtist }) => {
  const { activeTracks, currentTrack, isPlaying, playTrack, toggleFavorite } = usePlayer();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { label: 'ボカロ・VOCALOID', filter: 'ボカロ' },
    { label: '歌ってみた・Cover', filter: '歌ってみた' },
    { label: 'J-POP', filter: 'J-POP' },
    { label: 'ロック・バンド', filter: 'ロック' },
    { label: '作業用・BGM', filter: 'BGM' },
    { label: 'シティポップ', filter: 'シティポップ' },
  ];

  // Group artists with count
  const allArtists = useMemo(() => {
    const map = new Map<string, { count: number; topTrack: MusicTrack }>();
    activeTracks.forEach((t) => {
      const existing = map.get(t.artist);
      if (!existing) {
        map.set(t.artist, { count: 1, topTrack: t });
      } else {
        existing.count += 1;
        if (t.playCount > existing.topTrack.playCount) {
          existing.topTrack = t;
        }
      }
    });

    return Array.from(map.entries()).map(([artist, { count, topTrack }]) => ({
      artist,
      count,
      topTrack,
    }));
  }, [activeTracks]);

  // Filtered tracks
  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed && !selectedCategory) return [];

    return activeTracks.filter((track) => {
      if (selectedCategory) {
        const matchesCategory =
          track.genre.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          `${track.title} ${track.artist}`.toLowerCase().includes(selectedCategory.toLowerCase());
        if (!matchesCategory) return false;
      }

      if (!trimmed) return true;

      const titleMatch = track.title.toLowerCase().includes(trimmed);
      const artistMatch = track.artist.toLowerCase().includes(trimmed);
      const genreMatch = track.genre.toLowerCase().includes(trimmed);
      return titleMatch || artistMatch || genreMatch;
    });
  }, [activeTracks, query, selectedCategory]);

  // Matching artists
  const matchingArtists = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    return allArtists
      .filter((item) => item.artist.toLowerCase().includes(trimmed))
      .slice(0, 4);
  }, [allArtists, query]);

  const topMatchingArtist = matchingArtists[0];

  const formatDuration = (sec?: number | null) => {
    if (!sec || isNaN(sec)) return '3:30';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="ios-scroll-container pb-36 pt-2 px-4 max-w-lg mx-auto">
      {/* Apple Music Large Header */}
      <div className="pt-2 pb-1">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">検索</h1>
      </div>

      {/* Apple Music Search Input */}
      <div className="my-3 relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <SearchIcon className="h-4 w-4 text-[#8e8e93]" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="曲名、アーティスト、ボカロP、ジャンル"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#1c1c1e] text-white text-sm placeholder-[#8e8e93] border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#fa2d48]/50 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8e8e93] hover:text-white"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <X className="w-3 h-3 text-white" />
            </div>
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.filter;
          return (
            <button
              key={cat.filter}
              onClick={() => {
                setSelectedCategory(isSelected ? null : cat.filter);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                isSelected
                  ? 'bg-[#fa2d48] text-white shadow-md shadow-[#fa2d48]/30'
                  : 'bg-[#1c1c1e] text-[#8e8e93] hover:text-white border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* SEARCH RESULTS VIEW */}
      {query.trim().length > 0 || selectedCategory ? (
        <div className="mt-4">
          {/* Top Result Card (Artist or Song) */}
          {topMatchingArtist && (
            <div className="mb-5 p-4 rounded-2xl apple-card border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#fa2d48] uppercase tracking-wider">
                  トップアーティスト
                </span>
                <button
                  onClick={() => onSelectArtist(topMatchingArtist.artist)}
                  className="text-xs text-[#fa2d48] font-semibold flex items-center gap-1 hover:underline"
                >
                  <span>曲一覧・詳細</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                onClick={() => onSelectArtist(topMatchingArtist.artist)}
                className="flex items-center gap-3.5 cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-white/20 shadow-lg bg-black">
                  <img
                    src={`https://img.youtube.com/vi/${topMatchingArtist.topTrack.id}/mqdefault.jpg`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white truncate">
                    {topMatchingArtist.artist}
                  </h3>
                  <p className="text-xs text-[#8e8e93] mt-0.5">
                    ライブラリ収録: {topMatchingArtist.count}曲
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const filtered = activeTracks.filter(
                      (t) => t.artist === topMatchingArtist.artist
                    );
                    if (filtered[0]) playTrack(filtered[0], filtered);
                  }}
                  className="w-10 h-10 rounded-full bg-[#fa2d48] flex items-center justify-center text-white shadow-lg active:scale-95 shrink-0"
                >
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </button>
              </div>
            </div>
          )}

          {/* Matching Songs List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                曲 ({searchResults.length})
              </h2>
            </div>

            {searchResults.length === 0 ? (
              <div className="py-12 text-center text-[#8e8e93]">
                <Music2 className="w-10 h-10 mx-auto text-white/20 mb-2" />
                <p className="text-sm font-semibold text-white">該当する曲が見つかりません</p>
                <p className="text-xs mt-1">別のキーワードやひらがな・英字でお試しください</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {searchResults.map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => playTrack(track, searchResults)}
                      className={`flex items-center justify-between py-2.5 px-2 rounded-xl cursor-pointer active:bg-white/10 transition-colors ${
                        isCurrent ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-black relative border border-white/10">
                          <img
                            src={`https://img.youtube.com/vi/${track.id}/mqdefault.jpg`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {isCurrent && isPlaying && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#fa2d48] animate-ping" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${
                              isCurrent ? 'text-[#fa2d48]' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectArtist(track.artist);
                              }}
                              className="text-[11px] text-[#8e8e93] hover:text-[#fa2d48] truncate hover:underline"
                            >
                              {track.artist}
                            </span>
                            <span className="text-[#8e8e93] text-[9px]">•</span>
                            <span className="text-[10px] text-[#8e8e93] shrink-0">
                              {formatDuration(track.duration)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(track.id);
                        }}
                        className="p-2 text-[#8e8e93] hover:text-[#fa2d48] transition-colors shrink-0"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            track.isFavorite ? 'text-[#fa2d48] fill-[#fa2d48]' : 'stroke-[1.8]'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DEFAULT EMPTY SEARCH: EXPLORE ARTISTS & POPULAR GENRES */
        <div className="mt-4">
          <div className="mb-6">
            <h2 className="text-sm font-bold text-white tracking-tight mb-3">
              人気のアーティスト
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {allArtists.slice(0, 6).map(({ artist, count, topTrack }) => (
                <div
                  key={artist}
                  onClick={() => onSelectArtist(artist)}
                  className="p-3 rounded-2xl apple-card border border-white/5 hover:border-white/15 cursor-pointer active:scale-98 transition-all flex items-center gap-2.5"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-black border border-white/10">
                    <img
                      src={`https://img.youtube.com/vi/${topTrack.id}/mqdefault.jpg`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{artist}</p>
                    <p className="text-[10px] text-[#8e8e93]">{count}曲</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white tracking-tight mb-3">
              最近再生された曲
            </h2>
            <div className="divide-y divide-white/5">
              {activeTracks.slice(0, 5).map((track) => (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className="flex items-center justify-between py-2 px-1 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-black border border-white/10">
                      <img
                        src={`https://img.youtube.com/vi/${track.id}/mqdefault.jpg`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{track.title}</p>
                      <p className="text-[11px] text-[#8e8e93] truncate">{track.artist}</p>
                    </div>
                  </div>
                  <Play className="w-3.5 h-3.5 text-[#8e8e93] hover:text-white shrink-0 mr-2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
