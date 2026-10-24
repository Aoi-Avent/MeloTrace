import { MusicTrack, LyricLine } from '../types/music';

const MUSIC_RULES: [string, RegExp][] = [
  ['アニメ・ボカロ', /ボカロ|ボーカロイド|VOCALOID|初音ミク|プロセカ|東方|アニメ|主題歌|OP|ED|Chinozo|Kanaria|DECO\*27|ピノキオピー|ツミキ|可不/i],
  ['作業用・Lo-Fi', /BGM|作業用|lo-?fi|ローファイ|睡眠|ヒーリング|chill|relax|勉強用|瞑想|jazz/i],
  ['シティポップ', /Plastic Love|プラスティック|真夜中のドア|竹内まりや|松原みき|山下達郎|大貫妙子|city pop|シティポップ/i],
  ['ロック・バンド', /King Gnu|Vaundy|ONE OK ROCK|RADWIMPS|back number|マカロニえんぴつ|緑黄色社会|BUMP|Alexandros|Mrs\. GREEN APPLE|凛として時雨|ELLEGARDEN|羊文学|バンド|ロック|ROCK/i],
  ['カバー・歌ってみた', /歌ってみた|カバー|\bcover\b|弾いてみた|叩いてみた|演奏してみた|カラオケ/i],
  ['J-POP', /\bMV\b|Music Video|Official (Audio|Video)|YOASOBI|米津玄師|Official髭男dism|Ado|ずっと真夜中でいいのに。|ヨルシカ|優里|藤井風|星野源|LiSA|Eve|あいみょん|菅田将暉|Uru|Aimer|milet|宇多田ヒカル|椎名林檎|楽曲|シングル|アルバム|feat\.|Remix/i],
];

export function isLikelyMusic(title: string, channel: string, product?: string): boolean {
  if (product === 'YouTube Music') return true;
  const combined = `${title} ${channel}`.toLowerCase();
  
  // Exclude obvious non-music videos
  if (/実況|切り抜き|雑談|ニュース|速報|解説|講座|プログラミング|スマホ|iPhone|レビュー|商品紹介|開封|料理|レシピ|キャンプ|ルームツアー|ルーティン/i.test(combined)) {
    // Unless explicitly marked as MV/Music
    if (!/\b(mv|music video|official audio)\b/i.test(combined)) {
      return false;
    }
  }

  // Matches music patterns
  for (const [, regex] of MUSIC_RULES) {
    if (regex.test(combined)) return true;
  }

  // General music indicators
  if (/【mv】|［mv］|\(mv\)|music video|official video|official audio|lyrics|lyric video|サウンドトラック|\bost\b|インスト|acoustic/i.test(combined)) {
    return true;
  }

  return false;
}

export function classifyMusicGenre(title: string, channel: string): string {
  const combined = `${title} ${channel}`;
  for (const [genre, regex] of MUSIC_RULES) {
    if (regex.test(combined)) return genre;
  }
  return 'J-POP';
}

export function extractArtist(title: string, channel: string): string {
  // Pattern: "Artist - Title" or "Artist「Title」"
  const dashMatch = title.match(/^(.{1,35}?)\s[-–—]\s/);
  if (dashMatch) {
    return dashMatch[1].trim();
  }
  const bracketMatch = title.match(/^(.{1,35}?)[「『【]/);
  if (bracketMatch && bracketMatch[1].trim().length > 1) {
    const candidate = bracketMatch[1].trim();
    if (!/【|\[|official|mv/i.test(candidate)) {
      return candidate;
    }
  }

  // Clean channel name
  const cleanCh = (channel || 'Unknown')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s*(Official|公式)(チャンネル|Channel|YouTube Channel)?$/i, '')
    .trim();

  return cleanCh || 'Unknown Artist';
}

export function cleanSongTitle(title: string, artist: string): string {
  let cleaned = title;
  // Remove "Artist - " prefix
  if (artist && cleaned.startsWith(artist)) {
    cleaned = cleaned.slice(artist.length).replace(/^[\s-–—:：]+/, '');
  }
  // Strip common noisy tags
  cleaned = cleaned
    .replace(/[【［\[\(]\s*(MV|Music Video|Official\s*(Video|Audio|Music\s*Video)?|Full|Lyric\s*Video|アニメ|フル|公式|本人映像)\s*[】］\]\)]/gi, '')
    .replace(/\s*-\s*(MV|Music Video|Official Video)$/i, '')
    .trim();

  return cleaned || title;
}

export function extractYouTubeId(urlOrText: string): string | null {
  if (!urlOrText) return null;
  const str = urlOrText.trim();
  
  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // URLs
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = str.match(regExp);
  return match ? match[1] : null;
}

export function parseTakeoutJson(jsonContent: string): MusicTrack[] {
  try {
    const data = JSON.parse(jsonContent);
    if (!Array.isArray(data)) return [];

    const tracksMap = new Map<string, {
      title: string;
      channel: string;
      channelId?: string;
      product?: string;
      playCount: number;
      firstPlayed: string;
      lastPlayed: string;
    }>();

    for (const item of data) {
      if (!item || !item.titleUrl || !item.title) continue;
      const id = extractYouTubeId(item.titleUrl);
      if (!id) continue;

      const rawTitle = item.title.replace(/^(Watched|Viewed)\s+/i, '').replace(/\s*を(視聴|再生|表示)しました$/, '');
      const sub = (item.subtitles && item.subtitles[0]) || {};
      const channel = sub.name || '';
      const channelId = (sub.url || '').split('/').pop();
      const product = item.header || (item.products && item.products[0]) || 'YouTube';
      const timeStr = item.time ? new Date(item.time).toISOString().replace('T', ' ').slice(0, 16) : '';

      if (!isLikelyMusic(rawTitle, channel, product)) {
        continue;
      }

      const existing = tracksMap.get(id);
      if (existing) {
        existing.playCount += 1;
        if (timeStr && timeStr > existing.lastPlayed) existing.lastPlayed = timeStr;
        if (timeStr && (!existing.firstPlayed || timeStr < existing.firstPlayed)) existing.firstPlayed = timeStr;
      } else {
        tracksMap.set(id, {
          title: rawTitle,
          channel,
          channelId,
          product,
          playCount: 1,
          firstPlayed: timeStr || new Date().toISOString().slice(0, 16),
          lastPlayed: timeStr || new Date().toISOString().slice(0, 16),
        });
      }
    }

    const result: MusicTrack[] = [];
    for (const [id, item] of tracksMap.entries()) {
      const artist = extractArtist(item.title, item.channel);
      const title = cleanSongTitle(item.title, artist);
      const genre = classifyMusicGenre(item.title, item.channel);

      result.push({
        id,
        title,
        artist,
        channelId: item.channelId,
        genre,
        playCount: item.playCount,
        lastPlayed: item.lastPlayed,
        firstPlayed: item.firstPlayed,
        isFavorite: item.playCount >= 5,
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      });
    }

    return result.sort((a, b) => b.playCount - a.playCount);
  } catch (err) {
    console.error('Failed to parse takeout json:', err);
    return [];
  }
}

export function parseLrcLyrics(lrcText: string): LyricLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
    let match;
    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(line)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const totalSec = min * 60 + sec + ms / 1000;
      result.push({ time: totalSec, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}
