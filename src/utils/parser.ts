import { MusicTrack, LyricLine } from '../types/music';

// High-precision non-music blacklist (Clips, chat, streams, news, commentary)
const NON_MUSIC_BLACKLIST_REGEX = /切り抜き|きりぬき|雑談|生放送|配信アーカイブ|公式ラジオ|重大発表|振り返り|凸待ち|まとめ|ハイライト|shorts|実況プレイ|ゲーム実況|開封動画|料理動画|レシピ|レビュー|速報|解説動画|プログラミング|asmr|作業用音声|朗読|勉強用bgmなし|コラボ配信|告知|切り抜きまとめ|vtuber切り抜き|short clips/i;

const NON_MUSIC_CHANNELS_REGEX = /切り抜き|clips|まとめ|ch切り抜き|アーカイブ|news|速報/i;

// Vocaloid Producers (ボカロP)
export const VOCALOID_PRODUCERS_REGEX = /蝶々P|バルーン|須田景凪|DECO\*27|ピノキオピー|ツミキ|Kanaria|Chinozo|ナユタン星人|すりぃ|wowaka|ハチ|米津玄師|かいりきベア|Ayase|syudou|164|40mP|みきとP|kz|じん|れるりり|鬱P|和田たけあき|煮ル果実|kemu|Orangestar|てにをは|MARETU|柊キライ|傘村トータ|Nem|neru|doriko|黒うさP|PolyphonicBranch|TOKOTOKO|buzzG|Omoi|Giga|ギガ|ゆよゆっぺ|Heavenz|椎名もた|いよわ|wotaku/i;

// Vocaloid voicebanks & synths
export const VOCALOID_SYNTHS_REGEX = /初音ミク|鏡音リン|鏡音レン|巡音ルカ|GUMI|神威がくぽ|IA|MAYU|結月ゆかり|紲星あかり|東北ずん子|琴葉|flower|vflower|可不|KAFU|裏命|RIME|羽累|HARU|星界|SEKAI|重音テト|UTAU|CeVIO|Synthesizer V|SynthV|VOCALOID|ボカロ|プロセカ|プロジェクトセカイ/i;

// Free BGM, Classical, Sleep BGM, Ambient & non-artist soundscape detection
export const AMBIENT_SLEEP_AND_BGM_REGEX =
  /睡眠|安眠|熟睡|快眠|寝落ち|入眠|不眠|疲労回復|自律神経|癒し|ヒーリング|瞑想|meditation|ソルフェジオ|周波数|528hz|432hz|環境音|自然音|波の音|雨の音|川のせせらぎ|水流|焚き火|焚火|ホワイトノイズ|ピンクノイズ|胎内音|asmr|作業用bgm|勉強用bgm|カフェbgm|集中用|朗読|オーディオブック|フリーbgm|dova[-_ ]?syndrome|甘茶の音楽工房|甘茶|魔王魂|musmus|peritune|騒音のない世界|しゃろう|sharou|audiostock|クラシック|chopin|ショパン|mozart|モーツァルト|beethoven|ベートーヴェン|bach|バッハ|debussy|ドビュッシー|ambient|lofi loop|オルゴール|bgm\s*[0-9]+分|bgm\s*[0-9]+時間|[0-9]+\s*hours?|[0-9]+\s*時間.*(?:作業|睡眠|勉強|メドレー)|relaxing (piano|sleep|music)|deep sleep|sleep music|soundscape|white noise|binaural beats/i;

export const BGM_AND_CLASSICAL_REGEX = AMBIENT_SLEEP_AND_BGM_REGEX;

const MUSIC_RULES: [string, RegExp][] = [
  ['フリーBGM・環境音', AMBIENT_SLEEP_AND_BGM_REGEX],
  ['ボカロ・VOCALOID', /ボカロ|ボーカロイド|VOCALOID|初音ミク|プロセカ|Chinozo|Kanaria|DECO\*27|ピノキオピー|ツミキ|可不|重音テト|バルーン|蝶々P|ナユタン星人|かいりきベア|wowaka|すりぃ/i],
  ['歌ってみた・Cover', /歌ってみた|カバー|\bcover\b|弾いてみた|叩いてみた|演奏してみた|covered by/i],
  ['作業用・Lo-Fi', /lo-?fi|ローファイ|chill|relax|jazz/i],
  ['シティポップ', /Plastic Love|プラスティック|真夜中のドア|竹内まりや|松原みき|山下達郎|大貫妙子|city pop|シティポップ/i],
  ['ロック・バンド', /King Gnu|Vaundy|ONE OK ROCK|RADWIMPS|back number|マカロニえんぴつ|緑黄色社会|BUMP|Alexandros|Mrs\. GREEN APPLE|凛として時雨|ELLEGARDEN|羊文学|バンド|ロック|ROCK/i],
  ['J-POP', /\bMV\b|Music Video|Official (Audio|Video)|YOASOBI|米津玄師|Official髭男dism|Ado|ずっと真夜中でいいのに。|ヨルシカ|優里|藤井風|星野源|LiSA|Eve|あいみょん|菅田将暉|Uru|Aimer|milet|宇多田ヒカル|椎名林檎|楽曲|シングル|アルバム|feat\.|Remix/i],
];

export function isAmbientOrAtmosphereTrack(track: { title: string; artist: string; genre?: string }): boolean {
  if (track.genre === 'フリーBGM・環境音' || track.genre === 'フリーBGM・クラシック') return true;
  return AMBIENT_SLEEP_AND_BGM_REGEX.test(`${track.title} ${track.artist}`);
}

export function isBgmOrClassicalTrack(track: { title: string; artist: string; genre?: string }): boolean {
  return isAmbientOrAtmosphereTrack(track);
}

export function isLikelyMusic(
  title: string,
  channel: string,
  product?: string,
  strictness: 'strict' | 'standard' | 'all' = 'standard'
): boolean {
  if (product === 'YouTube Music') return true;
  if (strictness === 'all') return true;

  const combined = `${title} ${channel}`.toLowerCase();

  // 1. Strict blacklist check
  if (NON_MUSIC_BLACKLIST_REGEX.test(combined)) {
    // If it's explicitly a talk/clip/chat, reject it even if it mentions a song title
    return false;
  }

  if (NON_MUSIC_CHANNELS_REGEX.test(channel)) {
    return false;
  }

  // 2. Clear music indicators
  if (
    /【mv】|［mv］|\(mv\)|music video|official video|official audio|lyrics|lyric video|サウンドトラック|\bost\b|インスト|acoustic|【歌ってみた】|【cover】|covered by/i.test(
      combined
    )
  ) {
    return true;
  }

  // 3. Vocaloid indicators
  if (VOCALOID_PRODUCERS_REGEX.test(combined) || VOCALOID_SYNTHS_REGEX.test(combined)) {
    return true;
  }

  // 4. Genre rules
  for (const [, regex] of MUSIC_RULES) {
    if (regex.test(combined)) return true;
  }

  // In strict mode, only accept confirmed music markers
  if (strictness === 'strict') {
    return false;
  }

  // Standard fallback
  return /曲|歌|piano|guitar|remix|feat|single|album|soundtrack|テーマ|主題歌/i.test(combined);
}

export function classifyMusicGenre(title: string, channel: string): string {
  const combined = `${title} ${channel}`;
  if (VOCALOID_PRODUCERS_REGEX.test(combined) || VOCALOID_SYNTHS_REGEX.test(combined)) {
    return 'ボカロ・VOCALOID';
  }
  for (const [genre, regex] of MUSIC_RULES) {
    if (regex.test(combined)) return genre;
  }
  return 'J-POP';
}

export interface ParsedTrackMeta {
  cleanTitle: string;
  cleanArtist: string;
  originalProducer?: string;
  isCover: boolean;
  searchKeywords: string[];
}

/**
 * Intelligent song title & artist cleaner tailored for Vocaloid, VTubers, and Utaite covers
 */
export function extractSmartTrackMeta(rawTitle: string, rawChannel: string): ParsedTrackMeta {
  let title = rawTitle.trim();
  let artist = rawChannel.trim();
  let originalProducer: string | undefined;
  let isCover = false;

  // 1. Detect if it's a cover
  if (/歌ってみた|cover|covered by/i.test(title)) {
    isCover = true;
  }

  // 2. Check for Vocalo-P in title (e.g. "About me/蝶々P Covered by 渚トラウト")
  const vocaloMatch = title.match(VOCALOID_PRODUCERS_REGEX);
  if (vocaloMatch) {
    originalProducer = vocaloMatch[0];
  }

  // 3. Pattern: "Title / Artist Covered by Singer" or "Title / VocaloP Covered by Singer"
  const coveredByMatch = title.match(/^(.*?)(?:\/|\s+Covered by\s+)(.*?)(?:Covered by\s+(.*))?$/i);
  if (/Covered by/i.test(title)) {
    const parts = title.split(/Covered by/i);
    if (parts.length >= 2) {
      const left = parts[0].trim();
      const right = parts[1].trim();
      // left might be "About me/蝶々P"
      const slashParts = left.split('/');
      if (slashParts.length >= 2) {
        title = slashParts[0].trim();
        originalProducer = slashParts[1].trim();
      } else {
        title = left;
      }
      // right might be "渚トラウト - 渚トラウト / Nagisa Trout 【にじさんじ】"
      const singerPart = right.split(/[-–—]/)[0].trim();
      if (singerPart) {
        artist = `${singerPart} (Cover)`;
      }
    }
  }

  // 4. Pattern: "【cover】 - 雨とペトラ(Piano ver.)/雨海ルカ"
  if (/【\s*cover\s*】|【歌ってみた】/i.test(title)) {
    isCover = true;
    let stripped = title.replace(/^[【［\[\(]\s*(cover|歌ってみた)\s*[】］\]\)]\s*[-–—:]*\s*/i, '');
    // e.g. "雨とペトラ(Piano ver.)/雨海ルカ"
    if (stripped.includes('/')) {
      const parts = stripped.split('/');
      title = parts[0].trim();
      if (parts[1]) artist = `${parts[1].trim()} (Cover)`;
    } else if (stripped.includes(' - ')) {
      const parts = stripped.split(' - ');
      title = parts[0].trim();
      if (parts[1]) artist = `${parts[1].trim()} (Cover)`;
    } else {
      title = stripped;
    }
  }

  // 5. Pattern: "Title / Vocaloid" e.g. "フォニイ / 可不" or "フォニイ / ツミキ"
  if (!isCover && title.includes(' / ')) {
    const parts = title.split(' / ');
    if (parts.length === 2) {
      title = parts[0].trim();
      artist = parts[1].trim();
    }
  }

  // 6. Strip noisy version tags from title
  const cleanTitle = title
    .replace(/[【［\[\(]\s*(MV|Music Video|Official\s*(Video|Audio)?|Full|Lyric\s*Video|アニメ|フル|公式|本人映像|Piano\s*ver\.?|Acoustic\s*ver\.?)\s*[】］\]\)]/gi, '')
    .replace(/^[【［\[\(].*?[】］\]\)]\s*/, '')
    .replace(/\s*[-–—]\s*(MV|Music Video|Official Video)$/i, '')
    .trim() || rawTitle;

  // Clean artist channel name
  let cleanArtist = artist
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s*(Official|公式)(チャンネル|Channel|YouTube Channel)?$/i, '')
    .replace(/【にじさんじ】|【ホロライブ】|【ぶいすぽっ！?】/gi, '')
    .trim();

  if (isCover && !cleanArtist.includes('(Cover)')) {
    cleanArtist = `${cleanArtist} (Cover)`;
  }

  // Build targeted search queries for lyrics API
  const searchKeywords: string[] = [];
  searchKeywords.push(cleanTitle); // Just song title alone (highest match for covers of famous tracks!)
  if (originalProducer) {
    searchKeywords.push(`${cleanTitle} ${originalProducer}`);
  }
  const baseArtist = cleanArtist.replace(/\s*\(Cover\)/i, '').trim();
  if (baseArtist) {
    searchKeywords.push(`${cleanTitle} ${baseArtist}`);
  }

  return {
    cleanTitle,
    cleanArtist,
    originalProducer,
    isCover,
    searchKeywords,
  };
}

export function cleanSongTitle(title: string, artist: string): string {
  const meta = extractSmartTrackMeta(title, artist);
  return meta.cleanTitle;
}

export function extractArtist(title: string, channel: string): string {
  const meta = extractSmartTrackMeta(title, channel);
  return meta.cleanArtist;
}

export function extractYouTubeId(urlOrText: string): string | null {
  if (!urlOrText) return null;
  const str = urlOrText.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = str.match(regExp);
  return match ? match[1] : null;
}

export function parseTakeoutJson(
  jsonContent: string,
  strictness: 'strict' | 'standard' | 'all' = 'standard'
): MusicTrack[] {
  try {
    const data = JSON.parse(jsonContent);
    if (!Array.isArray(data)) return [];

    const tracksMap = new Map<
      string,
      {
        title: string;
        channel: string;
        channelId?: string;
        product?: string;
        playCount: number;
        firstPlayed: string;
        lastPlayed: string;
      }
    >();

    for (const item of data) {
      if (!item || !item.titleUrl || !item.title) continue;
      const id = extractYouTubeId(item.titleUrl);
      if (!id) continue;

      const rawTitle = item.title
        .replace(/^(Watched|Viewed)\s+/i, '')
        .replace(/\s*を(視聴|再生|表示)しました$/, '');
      const sub = (item.subtitles && item.subtitles[0]) || {};
      const channel = sub.name || '';
      const channelId = (sub.url || '').split('/').pop();
      const product = item.header || (item.products && item.products[0]) || 'YouTube';
      const timeStr =
        typeof item.time === 'string'
          ? item.time.slice(0, 16).replace('T', ' ')
          : item.time
          ? new Date(item.time).toISOString().replace('T', ' ').slice(0, 16)
          : '';

      if (!isLikelyMusic(rawTitle, channel, product, strictness)) {
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
      const meta = extractSmartTrackMeta(item.title, item.channel);
      const genre = classifyMusicGenre(item.title, item.channel);

      result.push({
        id,
        title: meta.cleanTitle,
        artist: meta.cleanArtist,
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
    if (!text) continue;
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
