import React from 'react';
import {
  Play,
  Shuffle,
  Flame,
  Moon,
  Zap,
  History,
  Compass,
  Sparkles,
  Upload,
  Music2,
  ChevronRight,
  Disc3,
  Heart
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { MusicTrack, ActiveTab } from '../types/music';

interface HomeViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab }) => {
  const {
    tracks,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    loadDemoData,
    toggleFavorite,
    setIsShuffle,
  } = usePlayer();

  const totalPlays = React.useMemo(() => {
    return tracks.reduce((acc, t) => acc + t.playCount, 0);
  }, [tracks]);

  // Handle giant "とりあえず再生"
  const handleBigPlay = () => {
    if (tracks.length === 0) {
      loadDemoData();
      return;
    }
    if (isPlaying) {
      togglePlay();
      return;
    }
    // Pick random or top track
    const randomIdx = Math.floor(Math.random() * tracks.length);
    setIsShuffle(true);
    playTrack(tracks[randomIdx], tracks);
  };

  // Quick Mood Filter handlers
  const handleMoodPlay = (mood: 'fav' | 'chill' | 'energy' | 'nostalgia' | 'discover') => {
    if (tracks.length === 0) {
      loadDemoData();
      return;
    }
    let filtered: MusicTrack[] = [];
    switch (mood) {
      case 'fav':
        filtered = tracks.filter((t) => t.isFavorite || t.playCount >= 5);
        break;
      case 'chill':
        filtered = tracks.filter((t) => t.genre === '作業用・Lo-Fi' || t.genre === 'シティポップ');
        break;
      case 'energy':
        filtered = tracks.filter((t) => t.genre === 'ロック・バンド' || t.genre === 'アニメ・ボカロ');
        break;
      case 'nostalgia':
        filtered = [...tracks].sort((a, b) => (a.firstPlayed || '').localeCompare(b.firstPlayed || '')).slice(0, 20);
        break;
      case 'discover':
        filtered = [...tracks].filter((t) => t.playCount < 3);
        break;
    }
    if (filtered.length === 0) filtered = tracks;
    setIsShuffle(true);
    playTrack(filtered[0], filtered);
  };

  // Top repeated tracks
  const topTracks = React.useMemo(() => {
    return [...tracks].sort((a, b) => b.playCount - a.playCount).slice(0, 5);
  }, [tracks]);

  // Recent tracks
  const recentTracks = React.useMemo(() => {
    return [...tracks]
      .sort((a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || ''))
      .slice(0, 8);
  }, [tracks]);

  // Top artists
  const topArtists = React.useMemo(() => {
    const map = new Map<string, number>();
    tracks.forEach((t) => map.set(t.artist, (map.get(t.artist) || 0) + t.playCount));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [tracks]);

  return (
    <div className="pb-36 pt-4 px-4 max-w-lg mx-auto">
      {/* Brand Header */}
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-violet-600 flex items-center justify-center shadow-[0_0_16px_rgba(255,45,120,0.4)]">
            <Music2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              <span>MeloTrace</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-rose-300 uppercase tracking-widest">
                Mobile
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              YouTube履歴が自分専用の音楽ラウンジに
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('import')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-panel hover:bg-white/10 text-xs font-medium text-slate-200 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-rose-400" />
          <span>データ取込</span>
        </button>
      </header>

      {/* Zero State / Demo Callout if empty */}
      {tracks.length === 0 && (
        <div className="mb-6 p-5 rounded-3xl bg-gradient-to-br from-rose-950/40 via-purple-950/30 to-slate-900 border border-rose-500/30 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">
            まだ音楽データがありません
          </h2>
          <p className="text-xs text-slate-300 mb-4 leading-relaxed">
            ワンタップで充実したサンプル履歴をロードして、今すぐ最高の音楽体験をお試しいただけます！
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={loadDemoData}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-violet-600 text-white font-bold text-sm shadow-[0_4px_20px_rgba(255,45,120,0.4)] hover:brightness-110 active:scale-95 transition-all"
            >
              今すぐ体験してみる（デモデータをロード）
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
            >
              自分のYouTube履歴ファイルを読み込む
            </button>
          </div>
        </div>
      )}

      {/* Main Hero Card: 「とりあえずシャッフル再生」 */}
      {tracks.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600/30 via-violet-600/20 to-slate-900/80 border border-white/10 p-5 mb-6 shadow-2xl backdrop-blur-xl">
          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ワンタップですぐ聴ける</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {tracks.length}曲 · 累計{totalPlays}回再生
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-extrabold text-white tracking-tight leading-snug">
                  とりあえずシャッフル再生
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  過去に聴いた履歴から、今聴きたい最高の一曲をランダムにお届けします。
                </p>
              </div>

              {/* Giant Play Button */}
              <button
                onClick={handleBigPlay}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-[0_0_28px_rgba(255,45,120,0.55)] hover:scale-105 active:scale-95 transition-all group"
                aria-label="シャッフル再生"
              >
                {isPlaying ? (
                  <Disc3 className="w-8 h-8 animate-spin" />
                ) : (
                  <Play className="w-8 h-8 fill-current ml-1" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mood Mixes (気分別クイックミックス) */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            <span>気分で選ぶクイックミックス</span>
          </h3>
          <span className="text-[11px] text-slate-400">1タップで再生</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleMoodPlay('fav')}
            className="flex items-center gap-3 p-3 rounded-2xl glass-panel hover:bg-white/10 text-left active:scale-98 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">いつもの定番</h4>
              <p className="text-[10px] text-slate-400 truncate">ヘビロテ中の人気曲</p>
            </div>
          </button>

          <button
            onClick={() => handleMoodPlay('chill')}
            className="flex items-center gap-3 p-3 rounded-2xl glass-panel hover:bg-white/10 text-left active:scale-98 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Moon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">作業・深夜のチル</h4>
              <p className="text-[10px] text-slate-400 truncate">Lo-Fi・シティポップ</p>
            </div>
          </button>

          <button
            onClick={() => handleMoodPlay('energy')}
            className="flex items-center gap-3 p-3 rounded-2xl glass-panel hover:bg-white/10 text-left active:scale-98 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">テンションMAX</h4>
              <p className="text-[10px] text-slate-400 truncate">ロック・アニメ・ボカロ</p>
            </div>
          </button>

          <button
            onClick={() => handleMoodPlay('nostalgia')}
            className="flex items-center gap-3 p-3 rounded-2xl glass-panel hover:bg-white/10 text-left active:scale-98 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">懐かしのあの曲</h4>
              <p className="text-[10px] text-slate-400 truncate">最初期によく聴いた曲</p>
            </div>
          </button>
        </div>
      </section>

      {/* Recently Played (最近聴いた曲) Horizontal Scroll */}
      {recentTracks.length > 0 && (
        <section className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">最近聴いた曲</h3>
            <button
              onClick={() => setActiveTab('library')}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-0.5"
            >
              <span>すべて見る</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {recentTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => playTrack(track)}
                className="w-32 shrink-0 cursor-pointer group active:scale-95 transition-all"
              >
                <div className="w-32 h-32 rounded-2xl overflow-hidden relative mb-2 bg-slate-800 border border-white/5 shadow-md">
                  <img
                    src={`https://img.youtube.com/vi/${track.id}/mqdefault.jpg`}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  {currentTrack?.id === track.id && isPlaying && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-semibold text-white truncate leading-tight">
                  {track.title}
                </h4>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {track.artist}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top 5 Most Repeated Tracks (ヘビロテランキング) */}
      {topTracks.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">
              あなたの最多リピート TOP 5
            </h3>
            <button
              onClick={() => setActiveTab('analytics')}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-0.5"
            >
              <span>分析カルテ</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {topTracks.map((track, idx) => (
              <div
                key={track.id}
                onClick={() => playTrack(track)}
                className="flex items-center gap-3 p-2.5 rounded-2xl glass-panel hover:bg-white/10 cursor-pointer active:scale-[0.99] transition-all"
              >
                <span
                  className={`w-6 text-center font-black text-sm shrink-0 ${
                    idx === 0
                      ? 'text-amber-400'
                      : idx === 1
                      ? 'text-slate-300'
                      : idx === 2
                      ? 'text-amber-600'
                      : 'text-slate-500'
                  }`}
                >
                  {idx + 1}
                </span>

                <img
                  src={`https://img.youtube.com/vi/${track.id}/mqdefault.jpg`}
                  alt={track.title}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-xl object-cover shrink-0"
                  loading="lazy"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate leading-tight">
                    {track.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {track.artist} · {track.playCount}回再生
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(track.id);
                  }}
                  className={`p-2 rounded-full transition-colors ${
                    track.isFavorite ? 'text-rose-400' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top Artists quick tags */}
      {topArtists.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-white tracking-tight mb-3">
            よく聴くアーティスト
          </h3>
          <div className="flex flex-wrap gap-2">
            {topArtists.map((artist) => (
              <button
                key={artist.name}
                onClick={() => {
                  const artistTracks = tracks.filter((t) => t.artist === artist.name);
                  if (artistTracks.length > 0) {
                    playTrack(artistTracks[0], artistTracks);
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel hover:bg-white/10 active:scale-95 transition-all text-xs text-slate-200"
              >
                <span className="font-medium">{artist.name}</span>
                <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded-full">
                  {artist.count}回
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
