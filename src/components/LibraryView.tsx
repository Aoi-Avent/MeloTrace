import React, { useState, useMemo } from 'react';
import {
  Search,
  Heart,
  Play,
  Pause,
  Plus,
  ExternalLink,
  ListMusic,
  SlidersHorizontal,
  FolderPlus,
  X,
  Check
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { MusicTrack } from '../types/music';

export const LibraryView: React.FC = () => {
  const {
    tracks,
    playlists,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    toggleFavorite,
    addSingleTrackByUrl,
    createPlaylist,
  } = usePlayer();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'plays' | 'recent' | 'first' | 'title'>('plays');
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'playlists'>('all');
  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [inputArtist, setInputArtist] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  // New playlist modal state
  const [showNewPlModal, setShowNewPlModal] = useState(false);
  const [newPlName, setNewPlName] = useState('');

  const genres = useMemo(() => {
    const set = new Set<string>();
    tracks.forEach((t) => {
      if (t.genre) set.add(t.genre);
    });
    return Array.from(set);
  }, [tracks]);

  // Filtered & sorted tracks
  const filteredTracks = useMemo(() => {
    return tracks
      .filter((t) => {
        if (selectedGenre === 'favorites') return t.isFavorite;
        if (selectedGenre !== 'all' && t.genre !== selectedGenre) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.genre && t.genre.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortOrder === 'plays') return b.playCount - a.playCount;
        if (sortOrder === 'recent') return (b.lastPlayed || '').localeCompare(a.lastPlayed || '');
        if (sortOrder === 'first') return (a.firstPlayed || '').localeCompare(b.firstPlayed || '');
        if (sortOrder === 'title') return a.title.localeCompare(b.title, 'ja');
        return 0;
      });
  }, [tracks, searchQuery, selectedGenre, sortOrder]);

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    const ok = addSingleTrackByUrl(inputUrl.trim(), inputTitle.trim(), inputArtist.trim());
    if (ok) {
      setAddSuccess(true);
      setTimeout(() => {
        setAddSuccess(false);
        setShowAddUrlModal(false);
        setInputUrl('');
        setInputTitle('');
        setInputArtist('');
      }, 1000);
    } else {
      alert('有効なYouTubeのURLまたは動画ID（11桁）を入力してください。');
    }
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlName.trim()) return;
    createPlaylist(newPlName.trim(), []);
    setNewPlName('');
    setShowNewPlModal(false);
  };

  return (
    <div className="pb-36 pt-4 px-4 max-w-lg mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">ライブラリ</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {tracks.length}曲の音楽コレクション
          </p>
        </div>

        <button
          onClick={() => setShowAddUrlModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-medium text-xs shadow-md transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>曲を追加</span>
        </button>
      </header>

      {/* Sub tabs: 全曲 / プレイリスト */}
      <div className="flex items-center gap-2 mb-4 p-1 bg-white/5 border border-white/10 rounded-2xl">
        <button
          onClick={() => setActiveSubTab('all')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
            activeSubTab === 'all'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          全曲 ({tracks.length})
        </button>
        <button
          onClick={() => setActiveSubTab('playlists')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
            activeSubTab === 'playlists'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          プレイリスト ({playlists.length})
        </button>
      </div>

      {/* VIEW 1: ALL TRACKS */}
      {activeSubTab === 'all' && (
        <>
          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="曲名、アーティスト、ジャンルで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-panel text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Genre and Sort Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
            <button
              onClick={() => setSelectedGenre('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                selectedGenre === 'all'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'glass-panel text-slate-400 hover:text-white'
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setSelectedGenre('favorites')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                selectedGenre === 'favorites'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'glass-panel text-slate-400 hover:text-white'
              }`}
            >
              <Heart className="w-3 h-3 fill-current" />
              <span>お気に入り</span>
            </button>
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                  selectedGenre === g
                    ? 'bg-rose-500 text-white font-bold'
                    : 'glass-panel text-slate-400 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Sort bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
            <span>{filteredTracks.length} 件</span>
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortOrder}
                onChange={(e: any) => setSortOrder(e.target.value)}
                className="bg-transparent text-slate-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="plays" className="bg-slate-900 text-white">再生回数順</option>
                <option value="recent" className="bg-slate-900 text-white">最近聴いた順</option>
                <option value="first" className="bg-slate-900 text-white">初めて聴いた順</option>
                <option value="title" className="bg-slate-900 text-white">タイトル順</option>
              </select>
            </div>
          </div>

          {/* Track List */}
          <div className="flex flex-col gap-2">
            {filteredTracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, filteredTracks)}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl glass-panel hover:bg-white/10 cursor-pointer active:scale-[0.99] transition-all group ${
                    isCurrent ? 'border-rose-500/40 bg-rose-500/10' : ''
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-800 border border-white/5">
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isCurrent && isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <h4
                      className={`text-xs font-bold truncate leading-snug ${
                        isCurrent ? 'text-rose-400' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {track.artist}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                      <span>{track.playCount}回再生</span>
                      <span>·</span>
                      <span>{track.genre || 'J-POP'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleFavorite(track.id)}
                      className={`p-2 rounded-full transition-colors ${
                        track.isFavorite
                          ? 'text-rose-500'
                          : 'text-slate-500 hover:text-white'
                      }`}
                      aria-label="お気に入り"
                    >
                      <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    <a
                      href={`https://www.youtube.com/watch?v=${track.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-500 hover:text-white transition-colors"
                      title="YouTubeで開く"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}

            {filteredTracks.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                条件に一致する曲が見つかりませんでした
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW 2: PLAYLISTS */}
      {activeSubTab === 'playlists' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400">作成したプレイリスト</h3>
            <button
              onClick={() => setShowNewPlModal(true)}
              className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>新規作成</span>
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {playlists.map((pl) => {
              const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    if (plTracks.length > 0) {
                      playTrack(plTracks[0], plTracks);
                    }
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl glass-panel hover:bg-white/10 cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-rose-500 flex items-center justify-center shrink-0 shadow-md">
                    <ListMusic className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{pl.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{plTracks.length} 曲</p>
                  </div>
                  <button
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0"
                    aria-label="再生"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Track by URL Modal */}
      {showAddUrlModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/10 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">YouTubeの曲を追加</h3>
              <button
                onClick={() => setShowAddUrlModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              YouTubeの動画リンク（URL）または11桁の動画IDを入力すると、ライブラリにすぐ追加されます。
            </p>

            <form onSubmit={handleAddTrack} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  YouTubeのURL / ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="https://youtu.be/... または watch?v=..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  曲名 (任意)
                </label>
                <input
                  type="text"
                  placeholder="例: 新曲タイトル"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  アーティスト名 (任意)
                </label>
                <input
                  type="text"
                  placeholder="例: アーティスト名"
                  value={inputArtist}
                  onChange={(e) => setInputArtist(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUrlModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold hover:bg-white/10"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 shadow-md flex items-center justify-center gap-1.5"
                >
                  {addSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>追加しました！</span>
                    </>
                  ) : (
                    <span>ライブラリに追加</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Playlist Modal */}
      {showNewPlModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/10 p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">新規プレイリスト作成</h3>
            <form onSubmit={handleCreatePlaylist} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="プレイリスト名 (例: ドライブ用)"
                value={newPlName}
                onChange={(e) => setNewPlName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPlModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold"
                >
                  作成する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
