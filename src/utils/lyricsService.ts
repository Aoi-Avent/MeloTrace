import { extractSmartTrackMeta } from './parser';

interface LrcLibResponse {
  id?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  instrumental?: boolean;
}

const LYRICS_CACHE_PREFIX = 'melotrace_lrc_cache_v3_';
const memoryCache = new Map<string, string | null>();

// Clear any outdated cache entries
try {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('melotrace_lrc_cache_') && !key.startsWith(LYRICS_CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
} catch (e) {
  // ignore
}

/**
 * Fetch high-precision real lyrics with YouTube timedtext captions + multi-tier LRCLib search.
 * Targets 80%~90% hit rate for J-POP, Vocaloid, Utaite, and anime tracks.
 * NEVER returns fake/invented placeholder lyrics!
 */
export async function getLyricsForTrack(
  rawArtist: string,
  rawTitle: string,
  durationSec: number = 240,
  youtubeVideoId?: string
): Promise<string | null> {
  const meta = extractSmartTrackMeta(rawTitle, rawArtist);
  const cacheKey = `${meta.cleanArtist}:::${meta.cleanTitle}`.toLowerCase();

  // 1. Check memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) || null;
  }

  // 2. Check localStorage cache
  try {
    const cached = localStorage.getItem(LYRICS_CACHE_PREFIX + cacheKey);
    if (cached !== null) {
      if (cached.includes('静けさの中に響く旋律') || cached.includes('胸の鼓動と重なってゆく')) {
        localStorage.removeItem(LYRICS_CACHE_PREFIX + cacheKey);
      } else {
        memoryCache.set(cacheKey, cached);
        return cached;
      }
    }
  } catch (e) {
    // ignore
  }

  // 3. PRIORITY A: Try fetching YouTube CC / timedtext captions (Direct creator lyrics!)
  if (youtubeVideoId && /^[a-zA-Z0-9_-]{11}$/.test(youtubeVideoId)) {
    try {
      const ytLyrics = await fetchYouTubeCaptions(youtubeVideoId);
      if (ytLyrics && ytLyrics.trim().length > 20) {
        saveToCache(cacheKey, ytLyrics);
        return ytLyrics;
      }
    } catch (e) {
      // Continue to LRCLib
    }
  }

  // 4. PRIORITY B: Multi-Query Search on LRCLib
  const cleanTitleNoBrackets = meta.cleanTitle
    .replace(/[【［\[\(].*?[】］\]\)]/g, '')
    .replace(/[-–—/].*$/, '')
    .trim();

  const searchQueries: string[] = [];

  // Query 1: Clean Title + Original Vocalo-P (e.g. "フォニイ ツミキ", "About me 蝶々P")
  if (meta.originalProducer) {
    searchQueries.push(`${cleanTitleNoBrackets || meta.cleanTitle} ${meta.originalProducer}`);
  }

  // Query 2: Clean Title + Base Artist (without "(Cover)")
  const baseArtist = meta.cleanArtist.replace(/\s*\(Cover\)/i, '').trim();
  if (baseArtist) {
    searchQueries.push(`${cleanTitleNoBrackets || meta.cleanTitle} ${baseArtist}`);
  }

  // Query 3: Clean Title alone
  if (cleanTitleNoBrackets && cleanTitleNoBrackets !== meta.cleanTitle) {
    searchQueries.push(cleanTitleNoBrackets);
  }
  searchQueries.push(meta.cleanTitle);

  // Remove duplicates
  const uniqueQueries = Array.from(new Set(searchQueries.filter((q) => q.length >= 2)));

  for (const query of uniqueQueries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2600);

      const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: LrcLibResponse[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Select best match: prioritize syncedLyrics, and duration similarity
          const validMatches = data.filter((d) => d.syncedLyrics || d.plainLyrics);

          if (validMatches.length > 0) {
            // Sort by duration delta to YouTube video length if available
            validMatches.sort((a, b) => {
              const aHasSync = a.syncedLyrics ? 0 : 1;
              const bHasSync = b.syncedLyrics ? 0 : 1;
              if (aHasSync !== bHasSync) return aHasSync - bHasSync;

              if (durationSec && a.duration && b.duration) {
                const deltaA = Math.abs(a.duration - durationSec);
                const deltaB = Math.abs(b.duration - durationSec);
                return deltaA - deltaB;
              }
              return 0;
            });

            const best = validMatches[0];
            if (best.syncedLyrics && best.syncedLyrics.trim().length > 15) {
              saveToCache(cacheKey, best.syncedLyrics);
              return best.syncedLyrics;
            }
            if (best.plainLyrics && best.plainLyrics.trim().length > 15) {
              const synced = convertPlainToSyncedLines(best.plainLyrics, durationSec);
              saveToCache(cacheKey, synced);
              return synced;
            }
          }
        }
      }
    } catch (e) {
      // Continue next query
    }
  }

  // 5. NOT FOUND: Return null. NEVER return fake placeholder lyrics!
  saveToCache(cacheKey, null);
  return null;
}

/**
 * Fetch and convert YouTube timedtext captions to LRC format
 */
async function fetchYouTubeCaptions(videoId: string): Promise<string | null> {
  const languages = ['ja', 'ja-JP', 'en'];

  for (const lang of languages) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      // Attempt to load timedtext caption XML
      const res = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        if (text.includes('<text start=')) {
          const lrc = parseTimedTextXmlToLrc(text);
          if (lrc && lrc.trim().length > 20) {
            return lrc;
          }
        }
      }
    } catch (e) {
      // continue
    }
  }
  return null;
}

/**
 * Parse YouTube XML timedtext `<text start="12.34" dur="2.5">lyrics</text>` to LRC
 */
function parseTimedTextXmlToLrc(xmlStr: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, 'text/xml');
    const textNodes = doc.querySelectorAll('text');
    if (!textNodes || textNodes.length === 0) return null;

    const lines: string[] = [];
    textNodes.forEach((node) => {
      const startSec = parseFloat(node.getAttribute('start') || '0');
      let rawContent = node.textContent || '';
      // Decode HTML entities
      rawContent = rawContent
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();

      if (rawContent) {
        const m = Math.floor(startSec / 60)
          .toString()
          .padStart(2, '0');
        const s = Math.floor(startSec % 60)
          .toString()
          .padStart(2, '0');
        const ms = Math.floor((startSec % 1) * 100)
          .toString()
          .padStart(2, '0');
        lines.push(`[${m}:${s}.${ms}]${rawContent}`);
      }
    });

    return lines.join('\n');
  } catch (e) {
    return null;
  }
}

function convertPlainToSyncedLines(plain: string, durationSec: number = 240): string {
  const lines = plain
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\[.*\]$/.test(l));

  if (lines.length === 0) return '';
  const total = lines.length;
  const startSec = 10;
  const endSec = Math.max(30, durationSec - 15);
  const step = (endSec - startSec) / total;

  return lines
    .map((text, idx) => {
      const cur = startSec + idx * step;
      const min = Math.floor(cur / 60)
        .toString()
        .padStart(2, '0');
      const sec = Math.floor(cur % 60)
        .toString()
        .padStart(2, '0');
      return `[${min}:${sec}.00]${text}`;
    })
    .join('\n');
}

function saveToCache(key: string, lrc: string | null) {
  memoryCache.set(key, lrc);
  try {
    if (lrc) {
      localStorage.setItem(LYRICS_CACHE_PREFIX + key, lrc);
    }
  } catch (e) {
    // ignore
  }
}
