import React, { useState, useMemo } from 'react';
import {
  Search,
  Heart,
  Play,
  Plus,
  ExternalLink,
  ListMusic,
  SlidersHorizontal,
  FolderPlus,
  X,
  Check,
  Ban,
  MoreVertical,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { MusicTrack } from '../types/music';

export const LibraryView: React.FC = () => {
  const {
    activeTracks,
    musicTracks,
    bgmTracks,
    playlists,
    currentTrack,
    isPlaying,
    playTrack,
    toggleFavorite,
    addSingleTrackByUrl,
    createPlaylist,
    setSelectedArtistForDetail,
    banArtist,
    banTrack,
  } = usePlayer();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'plays' | 'recent' | 'first' | 'title'>('plays');
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'vocaloid' | 'bgm' | 'favorites' | 'playlists'>('all');
  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [inputArtist, setInputArtist] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  // Active track options modal
  const [targetTrackForMenu, setTargetTrackForMenu] = useState<MusicTrack | null>(null);

  // New playlist modal state
  const [showNewPlModal, setShowNewPlModal] = useState(false);
  const [newPlName, setNewPlName] = useState('');

  const genres = useMemo(() => {
    const set = new Set<string>();
    activeTracks.forEach((t) => {
      if (t.genre) set.add(t.genre);
    });
    return Array.from(set);
  }, [activeTracks]);

  // Filtered & sorted tracks
  const filteredTracks = useMemo(() => {
    const baseList = activeSubTab === 'bgm' ? bgmTracks : activeSubTab === 'all' ? musicTracks : activeTracks;

    return baseList
      .filter((t) => {
        if (activeSubTab === 'favorites') return t.isFavorite;
        if (activeSubTab === 'vocaloid') {
          return t.genre === 'ボカロ・VOCALOID' || t.genre === '歌ってみた・Cover';
        }
        if (activeSubTab === 'bgm') return true;
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
  }, [activeTracks, searchQuery, selectedGenre, sortOrder, activeSubTab]);

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
      alert('有効なYouTubeのURLまたは動画IDを入力してください。');
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
    <div className="ios-scroll-container pb-36 pt-2 px-4 max-w-lg mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between pt-2 pb-1 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            ライブラリ
          </h1>
          <p className="text-xs text-[#8e8e93] mt-0.5">
            {activeTracks.length}曲の音楽コレクション
          </p>
        </div>

        <button
          onClick={() => setShowAddUrlModal(true)}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-colors"
          title="曲を追加"
        >
          <Plus className="w-5 h-5 text-[#fa2d48]" />
        </button>
      </header>

      {/* Segmented Sub-Tab Selector with Vocaloid Tab */}
      <div className="flex items-center gap-1.5 p-1 bg-[#1c1c1e] rounded-xl mb-3 border border-white/5">
        <button
          onClick={() => setActiveSubTab('all')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeSubTab === 'all'
              ? 'bg-[#2c2c2e] text-white shadow-sm'
              : 'text-[#8e8e93] hover:text-white'
          }`}
        >
          音楽 ({musicTracks.length})
        </button>

        <button
          onClick={() => setActiveSubTab('vocaloid')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeSubTab === 'vocaloid'
              ? 'bg-[#2c2c2e] text-[#af52de] shadow-sm font-bold'
              : 'text-[#8e8e93] hover:text-[#af52de]'
          }`}
        >
          ボカロ
        </button>

        <button
          onClick={() => setActiveSubTab('bgm')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeSubTab === 'bgm'
              ? 'bg-[#2c2c2e] text-[#30d158] shadow-sm font-bold'
              : 'text-[#8e8e93] hover:text-[#30d158]'
          }`}
          title="通常シャッフルから隔離された作業用BGM・クラシック"
        >
          BGM ({bgmTracks.length})
        </button>

        <button
          onClick={() => setActiveSubTab('favorites')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
            activeSubTab === 'favorites'
              ? 'bg-[#2c2c2e] text-white shadow-sm'
              : 'text-[#8e8e93] hover:text-white'
          }`}
        >
          <Heart className="w-3.5 h-3.5 fill-current text-[#fa2d48]" />
          <span>お気に入り</span>
        </button>

        <button
          onClick={() => setActiveSubTab('playlists')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeSubTab === 'playlists'
              ? 'bg-[#2c2c2e] text-white shadow-sm'
              : 'text-[#8e8e93] hover:text-white'
          }`}
        >
          リスト
        </button>
      </div>

      {/* TRACKS LIST VIEW */}
      {activeSubTab !== 'playlists' && (
        <>
          {/* iOS Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e93]" />
            <input
              type="text"
              placeholder="曲名、アーティスト、ボカロP名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#1c1c1e] text-xs text-white placeholder-[#8e8e93] focus:outline-none focus:ring-1 focus:ring-[#fa2d48] border border-white/5"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8e8e93] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Genre filter pills */}
          {activeSubTab === 'all' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none -mx-4 px-4">
              <button
                onClick={() => setSelectedGenre('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                  selectedGenre === 'all'
                    ? 'bg-white text-black font-semibold'
                    : 'apple-card text-[#8e8e93] hover:text-white'
                }`}
              >
                すべて
              </button>
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                    selectedGenre === g
                      ? 'bg-white text-black font-semibold'
                      : 'apple-card text-[#8e8e93] hover:text-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* Sort bar */}
          <div className="flex items-center justify-between text-xs text-[#8e8e93] mb-2 px-1">
            <span>{filteredTracks.length} 曲</span>
            <div className="flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8e8e93]" />
              <select
                value={sortOrder}
                onChange={(e: any) => setSortOrder(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="plays" className="bg-[#1c1c1e] text-white">再生回数順</option>
                <option value="recent" className="bg-[#1c1c1e] text-white">最近聴いた順</option>
                <option value="first" className="bg-[#1c1c1e] text-white">最初期順</option>
                <option value="title" className="bg-[#1c1c1e] text-white">曲名順</option>
              </select>
            </div>
          </div>

          {/* iOS Track Rows */}
          <div className="flex flex-col gap-1.5">
            {filteredTracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, filteredTracks)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl apple-card hover:bg-white/[0.08] cursor-pointer active:scale-[0.99] transition-all group ${
                    isCurrent ? 'bg-[#fa2d48]/15 border-[#fa2d48]/40' : ''
                  }`}
                >
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-[#2c2c2e]">
                    <img
                      src={`https://img.youtube.com/vi/${track.id}/mqdefault.jpg`}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isCurrent && isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex items-end gap-[2px] h-3">
                          <span className="w-1 bg-[#fa2d48] rounded-full apple-eq-bar-1" />
                          <span className="w-1 bg-[#fa2d48] rounded-full apple-eq-bar-2" />
                          <span className="w-1 bg-[#fa2d48] rounded-full apple-eq-bar-3" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <h4
                      className={`text-xs font-semibold truncate leading-snug ${
                        isCurrent ? 'text-[#fa2d48]' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </h4>
                    <p
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedArtistForDetail(track.artist);
                      }}
                      className="text-[11px] text-[#8e8e93] hover:text-[#fa2d48] hover:underline truncate mt-0.5 cursor-pointer"
                      title="アーティスト詳細を開く"
                    >
                      {track.artist}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#8e8e93] mt-0.5">
                      <span>{track.playCount}回再生</span>
                      <span>·</span>
                      <span className={track.genre === 'ボカロ・VOCALOID' ? 'text-[#af52de] font-semibold' : ''}>
                        {track.genre || 'J-POP'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleFavorite(track.id)}
                      className="p-2 text-[#8e8e93] hover:text-[#fa2d48] transition-colors"
                      aria-label="お気に入り"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          track.isFavorite ? 'text-[#fa2d48] fill-[#fa2d48]' : ''
                        }`}
                      />
                    </button>

                    {/* Track Context Menu (Ban / Hide / Open) */}
                    <button
                      onClick={() => setTargetTrackForMenu(track)}
                      className="p-2 text-[#8e8e93] hover:text-white transition-colors"
                      title="メニュー"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredTracks.length === 0 && (
              <div className="text-center py-12 text-[#8e8e93] text-xs">
                条件に一致する曲が見つかりませんでした
              </div>
            )}
          </div>
        </>
      )}

      {/* Track Action Bottom Sheet */}
      {targetTrackForMenu && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-end justify-center p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl apple-card p-4 shadow-2xl border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-bold text-white truncate">{targetTrackForMenu.title}</p>
                <p className="text-[11px] text-[#8e8e93] truncate">{targetTrackForMenu.artist}</p>
              </div>
              <button onClick={() => setTargetTrackForMenu(null)} className="text-[#8e8e93]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => {
                banTrack(targetTrackForMenu.id);
                setTargetTrackForMenu(null);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs font-semibold text-[#fa2d48] flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              <span>この曲を非表示 (Ban) にする</span>
            </button>

            <button
              onClick={() => {
                banArtist(targetTrackForMenu.artist);
                setTargetTrackForMenu(null);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs font-semibold text-[#fa2d48] flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              <span>「{targetTrackForMenu.artist}」の全動画をBan</span>
            </button>

            <a
              href={`https://www.youtube.com/watch?v=${targetTrackForMenu.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs font-semibold text-white flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4 text-[#8e8e93]" />
              <span>YouTubeで確認する</span>
            </a>
          </div>
        </div>
      )}

      {/* PLAYLISTS VIEW */}
      {activeSubTab === 'playlists' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
              作成したプレイリスト
            </h3>
            <button
              onClick={() => setShowNewPlModal(true)}
              className="flex items-center gap-1 text-xs text-[#fa2d48] font-semibold hover:underline"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>新規作成</span>
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {playlists.map((pl) => {
              const plTracks = activeTracks.filter((t) => pl.trackIds.includes(t.id));
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    if (plTracks.length > 0) {
                      playTrack(plTracks[0], plTracks);
                    }
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl apple-card hover:bg-white/[0.08] cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#3a1c28] to-[#fa2d48]/40 border border-white/10 flex items-center justify-center shrink-0">
                    <ListMusic className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{pl.name}</h4>
                    <p className="text-xs text-[#8e8e93] mt-0.5">{plTracks.length} 曲</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Track by URL Modal */}
      {showAddUrlModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl apple-card p-5 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">YouTubeの曲を追加</h3>
              <button
                onClick={() => setShowAddUrlModal(false)}
                className="p-1 text-[#8e8e93] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#8e8e93] mb-4 leading-relaxed">
              YouTubeのURLまたは11桁の動画IDを入力すると、ボカロ曲やカバー曲も自動で判別してライブラリに追加されます。
            </p>

            <form onSubmit={handleAddTrack} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#8e8e93] block mb-1">
                  YouTubeのURL / ID <span className="text-[#fa2d48]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="https://youtu.be/... または watch?v=..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#fa2d48]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8e8e93] block mb-1">
                  曲名 (任意)
                </label>
                <input
                  type="text"
                  placeholder="例: 雨とペトラ, About me"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#fa2d48]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8e8e93] block mb-1">
                  アーティスト / ボカロP (任意)
                </label>
                <input
                  type="text"
                  placeholder="例: バルーン, 蝶々P"
                  value={inputArtist}
                  onChange={(e) => setInputArtist(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#fa2d48]"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUrlModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#fa2d48] text-white text-xs font-bold flex items-center justify-center gap-1"
                >
                  {addSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>追加完了！</span>
                    </>
                  ) : (
                    <span>追加する</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Playlist Modal */}
      {showNewPlModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl apple-card p-5 shadow-2xl border border-white/10">
            <h3 className="text-base font-bold text-white mb-2">新規プレイリスト作成</h3>
            <form onSubmit={handleCreatePlaylist} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="プレイリスト名"
                value={newPlName}
                onChange={(e) => setNewPlName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#fa2d48]"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPlModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#fa2d48] text-white text-xs font-bold"
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
