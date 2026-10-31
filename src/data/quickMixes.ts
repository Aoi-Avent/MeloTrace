import { MusicTrack, QuickMixItem } from '../types/music';
import { VOCALOID_PRODUCERS_REGEX, VOCALOID_SYNTHS_REGEX } from '../utils/parser';

export const QUICK_MIXES: QuickMixItem[] = [
  {
    id: 'vocaloid_god',
    title: 'ボカロ神曲・VOCALOID',
    subtitle: '初音ミク・人気ボカロP・殿堂入り',
    category: 'genre',
    color: 'from-cyan-500/20 to-teal-500/20 text-cyan-400 border-cyan-500/30',
    filterFn: (tracks) =>
      tracks.filter(
        (t) =>
          t.genre === 'ボカロ・VOCALOID' ||
          VOCALOID_PRODUCERS_REGEX.test(`${t.title} ${t.artist}`) ||
          VOCALOID_SYNTHS_REGEX.test(`${t.title} ${t.artist}`)
      ),
  },
  {
    id: 'utaite_covers',
    title: '歌ってみた・Cover傑作選',
    subtitle: 'VTuber・歌い手の名カバー',
    category: 'genre',
    color: 'from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/30',
    filterFn: (tracks) =>
      tracks.filter(
        (t) =>
          t.genre === '歌ってみた・Cover' ||
          /歌ってみた|cover|covered by/i.test(`${t.title} ${t.artist}`)
      ),
  },
  {
    id: 'fav',
    title: 'いつもの定番',
    subtitle: 'ヘビロテ中の人気曲',
    category: 'mood',
    color: 'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30',
    filterFn: (tracks) => tracks.filter((t) => t.isFavorite || t.playCount >= 5),
  },
  {
    id: 'chill',
    title: '深夜のチル & Lo-Fi',
    subtitle: 'Lo-Fi・シティポップ・睡眠',
    category: 'mood',
    color: 'from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30',
    filterFn: (tracks) => tracks.filter((t) => t.genre === '作業用・Lo-Fi' || t.genre === 'シティポップ'),
  },
  {
    id: 'energy',
    title: 'テンションMAX',
    subtitle: 'ロック・疾走感・アガる曲',
    category: 'mood',
    color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
    filterFn: (tracks) => tracks.filter((t) => t.genre === 'ロック・バンド' || t.genre === 'ボカロ・VOCALOID'),
  },
  {
    id: 'nostalgia',
    title: '懐かしのあの曲',
    subtitle: '最初期によく聴いた曲',
    category: 'history',
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
    filterFn: (tracks) => [...tracks].sort((a, b) => (a.firstPlayed || '').localeCompare(b.firstPlayed || '')).slice(0, 25),
  },
  {
    id: 'focus',
    title: '集中・作業用BGM',
    subtitle: '作業が劇的にはかどる音',
    category: 'activity',
    color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
    filterFn: (tracks) => {
      const match = tracks.filter((t) => /bgm|作業|lo-?fi|relax|chill|jazz|勉強|instrumental/i.test(`${t.title} ${t.genre}`));
      return match.length > 0 ? match : tracks;
    },
  },
  {
    id: 'drive',
    title: 'ドライブ爽快ビート',
    subtitle: '車内やお出かけのbgmに',
    category: 'activity',
    color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
    filterFn: (tracks) => tracks.filter((t) => t.genre === 'ロック・バンド' || t.genre === 'J-POP'),
  },
  {
    id: 'hall_of_fame',
    title: '最多リピート殿堂入り',
    subtitle: '累計再生回数TOP 15',
    category: 'history',
    color: 'from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30',
    filterFn: (tracks) => [...tracks].sort((a, b) => b.playCount - a.playCount).slice(0, 15),
  },
  {
    id: 'discovery',
    title: '発掘・隠れた名曲',
    subtitle: '1〜2回だけ聴いた埋もれた名作',
    category: 'history',
    color: 'from-violet-500/20 to-fuchsia-500/20 text-violet-400 border-violet-500/30',
    filterFn: (tracks) => tracks.filter((t) => t.playCount <= 2),
  },
  {
    id: 'night_vocaloid',
    title: '哀愁・エモボカロ',
    subtitle: '心揺さぶる叙情的なメロディ',
    category: 'mood',
    color: 'from-violet-600/20 to-indigo-600/20 text-violet-300 border-violet-500/30',
    filterFn: (tracks) =>
      tracks.filter(
        (t) =>
          (t.genre === 'ボカロ・VOCALOID' || t.genre === '歌ってみた・Cover') &&
          /エモ|夜|雨|ペトラ|バラード|切ない|蝶々|バルーン|wowaka/i.test(`${t.title} ${t.artist}`)
      ),
  },
  {
    id: 'citypop',
    title: 'シティポップ & ネオソウル',
    subtitle: '都会的で洗練されたグルーヴ',
    category: 'genre',
    color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30',
    filterFn: (tracks) => tracks.filter((t) => t.genre === 'シティポップ'),
  },
  {
    id: 'acoustic',
    title: 'アコースティック & 弾き語り',
    subtitle: 'アコギとボーカルの生音',
    category: 'mood',
    color: 'from-stone-500/20 to-amber-500/20 text-amber-300 border-amber-500/30',
    filterFn: (tracks) => {
      const match = tracks.filter((t) => /acoustic|アコギ|弾き語り|piano|ピアノ|生音/i.test(`${t.title} ${t.artist}`));
      return match.length > 0 ? match : tracks.filter((t) => t.genre === 'J-POP');
    },
  },
  {
    id: 'morning',
    title: '朝の目覚め & スタート',
    subtitle: '1日を爽やかにスタートする曲',
    category: 'activity',
    color: 'from-sky-500/20 to-emerald-500/20 text-sky-400 border-sky-500/30',
    filterFn: (tracks) => tracks.filter((t) => t.playCount >= 2).slice(0, 20),
  },
  {
    id: 'ballad',
    title: '切ないエモバラード',
    subtitle: '胸に深く染みわたるメロディ',
    category: 'mood',
    color: 'from-red-500/20 to-rose-700/20 text-rose-300 border-rose-500/30',
    filterFn: (tracks) => tracks.filter((t) => /バラード|切ない|泣ける|ballad|雨|夜/i.test(`${t.title} ${t.genre}`)),
  },
  {
    id: 'karaoke',
    title: 'カラオケ鉄板ヒット',
    subtitle: '思わず一緒に口ずさむ名曲',
    category: 'activity',
    color: 'from-fuchsia-500/20 to-pink-500/20 text-fuchsia-400 border-fuchsia-500/30',
    filterFn: (tracks) => tracks.filter((t) => t.genre === 'J-POP' || t.genre === '歌ってみた・Cover'),
  },
  {
    id: 'top_artist_focus',
    title: '最愛アーティスト特集',
    subtitle: '一番再生したアーティストの楽曲群',
    category: 'history',
    color: 'from-rose-600/20 to-violet-600/20 text-rose-400 border-rose-500/30',
    filterFn: (tracks) => {
      if (tracks.length === 0) return [];
      const map = new Map<string, number>();
      tracks.forEach((t) => map.set(t.artist, (map.get(t.artist) || 0) + t.playCount));
      const topArtist = Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
      return topArtist ? tracks.filter((t) => t.artist === topArtist) : tracks;
    },
  },
  {
    id: 'recent_played',
    title: '最近のマイブーム',
    subtitle: '直近に聴いたお気に入り楽曲',
    category: 'history',
    color: 'from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30',
    filterFn: (tracks) => [...tracks].sort((a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || '')).slice(0, 20),
  },
  {
    id: 'rock_band',
    title: '純度100% 激熱ロック',
    subtitle: '魂揺さぶるバンドサウンド',
    category: 'genre',
    color: 'from-red-600/20 to-amber-600/20 text-red-400 border-red-500/30',
    filterFn: (tracks) => tracks.filter((t) => t.genre === 'ロック・バンド'),
  },
  {
    id: 'favorites_only',
    title: 'お気に入りコレクション',
    subtitle: 'ハートをつけた愛聴曲のみ',
    category: 'history',
    color: 'from-rose-500/25 to-pink-600/25 text-rose-400 border-rose-500/40',
    filterFn: (tracks) => {
      const favs = tracks.filter((t) => t.isFavorite);
      return favs.length > 0 ? favs : tracks.filter((t) => t.playCount >= 4);
    },
  },
  {
    id: 'shuffle_gacha',
    title: '完全ランダム・ガチャ',
    subtitle: '全履歴から予測不能な選曲',
    category: 'mood',
    color: 'from-violet-600/25 to-blue-600/25 text-violet-300 border-violet-500/30',
    filterFn: (tracks) => [...tracks].sort(() => Math.random() - 0.5),
  },
];
