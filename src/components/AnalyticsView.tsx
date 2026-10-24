import React, { useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  Flame,
  Play,
  Sparkles,
  Trophy,
  Compass,
  Headphones,
  Calendar
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { MusicTrack } from '../types/music';

export const AnalyticsView: React.FC = () => {
  const { tracks, playTrack } = usePlayer();

  // Basic stats
  const totalPlays = useMemo(() => {
    return tracks.reduce((acc, t) => acc + t.playCount, 0);
  }, [tracks]);

  const estimatedHours = useMemo(() => {
    // Avg 4 mins per play if duration not available
    const totalSec = tracks.reduce((acc, t) => acc + (t.duration || 240) * t.playCount, 0);
    return Math.round((totalSec / 3600) * 10) / 10;
  }, [tracks]);

  // Top genres
  const genreStats = useMemo(() => {
    const map = new Map<string, number>();
    tracks.forEach((t) => {
      const g = t.genre || 'その他';
      map.set(g, (map.get(g) || 0) + t.playCount);
    });
    const sorted = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({
        genre,
        count,
        percent: totalPlays > 0 ? Math.round((count / totalPlays) * 100) : 0,
      }));
    return sorted;
  }, [tracks, totalPlays]);

  // Top 10 repeat tracks
  const top10Tracks = useMemo(() => {
    return [...tracks].sort((a, b) => b.playCount - a.playCount).slice(0, 10);
  }, [tracks]);

  // Top 5 Artists
  const topArtists = useMemo(() => {
    const map = new Map<string, { count: number; songs: number }>();
    tracks.forEach((t) => {
      const current = map.get(t.artist) || { count: 0, songs: 0 };
      map.set(t.artist, {
        count: current.count + t.playCount,
        songs: current.songs + 1,
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([artist, data]) => ({ artist, ...data }));
  }, [tracks]);

  // Rediscover gems: high play count but not played recently
  const rediscoverTracks = useMemo(() => {
    const now = new Date().getTime();
    return [...tracks]
      .filter((t) => {
        if (t.playCount < 3 || !t.lastPlayed) return false;
        const last = new Date(t.lastPlayed).getTime();
        const daysDiff = (now - last) / (1000 * 60 * 60 * 24);
        return daysDiff >= 3 || isNaN(daysDiff);
      })
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 4);
  }, [tracks]);

  const genreColors: Record<string, string> = {
    'J-POP': '#ff2d78',
    'アニメ・ボカロ': '#a855f7',
    'シティポップ': '#06b6d4',
    'ロック・バンド': '#f59e0b',
    '作業用・Lo-Fi': '#10b981',
    'カバー・歌ってみた': '#ec4899',
    'その他': '#64748b',
  };

  return (
    <div className="pb-36 pt-4 px-4 max-w-lg mx-auto">
      {/* Top Header */}
      <header className="mb-5">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-rose-400" />
          <span>音楽カルテ・分析</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          YouTubeの視聴データから読み解くあなたの音楽嗜好
        </p>
      </header>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        <div className="p-3.5 rounded-2xl glass-panel text-center">
          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">総楽曲数</span>
          <span className="text-xl font-black text-white">{tracks.length}</span>
          <span className="text-[10px] text-slate-500 block">曲</span>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel text-center">
          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">累計再生</span>
          <span className="text-xl font-black text-rose-400">{totalPlays}</span>
          <span className="text-[10px] text-slate-500 block">回</span>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel text-center">
          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">総視聴時間</span>
          <span className="text-xl font-black text-violet-400">{estimatedHours}</span>
          <span className="text-[10px] text-slate-500 block">時間</span>
        </div>
      </div>

      {/* Genre Breakdown */}
      <section className="mb-7 p-4 rounded-3xl glass-panel">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>あなたの音楽ジャンル比率</span>
        </h3>

        {/* Stacked Percentage Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-white/5 mb-3">
          {genreStats.map((item) => (
            <div
              key={item.genre}
              style={{
                width: `${item.percent}%`,
                backgroundColor: genreColors[item.genre] || '#64748b',
              }}
              title={`${item.genre}: ${item.percent}%`}
              className="h-full transition-all duration-500"
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {genreStats.map((item) => (
            <div key={item.genre} className="flex items-center justify-between p-1.5 rounded-xl bg-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: genreColors[item.genre] || '#64748b' }}
                />
                <span className="text-slate-300 truncate font-medium">{item.genre}</span>
              </div>
              <span className="font-bold text-white shrink-0">{item.percent}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* Top 10 Repeated Songs */}
      <section className="mb-7">
        <h3 className="text-sm font-bold text-white tracking-tight mb-3 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>最多リピートランキング TOP 10</span>
        </h3>

        <div className="flex flex-col gap-2">
          {top10Tracks.map((track, idx) => (
            <div
              key={track.id}
              onClick={() => playTrack(track, top10Tracks)}
              className="flex items-center gap-3 p-2.5 rounded-2xl glass-panel hover:bg-white/10 cursor-pointer active:scale-[0.99] transition-all"
            >
              <div className="w-6 text-center font-black text-xs shrink-0">
                {idx === 0 ? (
                  <span className="text-amber-400 text-sm">1</span>
                ) : idx === 1 ? (
                  <span className="text-slate-300 text-sm">2</span>
                ) : idx === 2 ? (
                  <span className="text-amber-600 text-sm">3</span>
                ) : (
                  <span className="text-slate-500">{idx + 1}</span>
                )}
              </div>

              <img
                src={`https://img.youtube.com/vi/${track.id}/mqdefault.jpg`}
                alt={track.title}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl object-cover shrink-0"
                loading="lazy"
              />

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate leading-tight">
                  {track.title}
                </h4>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {track.artist}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-extrabold text-rose-400">{track.playCount}</span>
                <span className="text-[10px] text-slate-500 block">回再生</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Artists Leaderboard */}
      <section className="mb-7">
        <h3 className="text-sm font-bold text-white tracking-tight mb-3 flex items-center gap-1.5">
          <Headphones className="w-4 h-4 text-violet-400" />
          <span>最愛アーティスト TOP 5</span>
        </h3>

        <div className="flex flex-col gap-2">
          {topArtists.map((artist, idx) => {
            const artistShare = totalPlays > 0 ? Math.round((artist.count / totalPlays) * 100) : 0;
            return (
              <div key={artist.artist} className="p-3 rounded-2xl glass-panel">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                    <h4 className="text-xs font-bold text-white">{artist.artist}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-violet-300">{artist.count}回</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">({artistShare}%)</span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-rose-500 rounded-full"
                    style={{ width: `${Math.min(100, artistShare * 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rediscover Buried Gems (ご無沙汰の名曲を発掘) */}
      {rediscoverTracks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>ご無沙汰の名曲（埋もれた名曲を発掘）</span>
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
            以前よく聴いていたのに、最近再生されていないお気に入りの曲です。もう一度聴いてみませんか？
          </p>

          <div className="flex flex-col gap-2">
            {rediscoverTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => playTrack(track)}
                className="flex items-center gap-3 p-2.5 rounded-2xl glass-panel hover:bg-white/10 cursor-pointer active:scale-[0.99] transition-all"
              >
                <img
                  src={`https://img.youtube.com/vi/${track.id}/mqdefault.jpg`}
                  alt={track.title}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate leading-tight">
                    {track.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {track.artist} · 過去{track.playCount}回再生
                  </p>
                </div>
                <button
                  className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/30 flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>再会する</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
