/** アルバムジャケットの取得（iTunes Search API）。曖昧な一致は採用せず、元のサムネイルのままにする */
import { searchSongs, ItunesResult } from './itunes';
import { extractSmartTrackMeta } from './parser';
import { normalizeName, splitArtistNames, titleSimilarity } from './textMatch';

const CACHE_KEY = 'melotrace_album_art_v1';
const RETRY_NONE_MS = 7 * 24 * 3600 * 1000;

export interface AlbumArt {
  url: string;
  album: string;
}
// 値: [url, album, checkedAt] = 見つかった / [0, '', checkedAt] = 見つからなかった
type Entry = [string | 0, string, number];
let cache: Record<string, Entry> | null = null;

function load(): Record<string, Entry> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {};
  } catch (e) {
    cache = {};
  }
  return cache!;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const entries = Object.entries(load());
      // 肥大化防止: 多すぎる場合は新しい順に3000件だけ残す
      const trimmed = entries.length > 3000 ? entries.sort((a, b) => b[1][2] - a[1][2]).slice(0, 3000) : entries;
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
    } catch (e) {}
  }, 1500);
}

export function getCachedArt(trackId: string): { state: 'found'; art: AlbumArt } | { state: 'none' } | { state: 'unknown' } {
  const e = load()[trackId];
  if (!e) return { state: 'unknown' };
  if (e[0]) return { state: 'found', art: { url: e[0], album: e[1] } };
  return Date.now() - e[2] > RETRY_NONE_MS ? { state: 'unknown' } : { state: 'none' };
}

export function pickBest(results: ItunesResult[], artist: string, title: string): ItunesResult | null {
  const wanted = new Set(splitArtistNames(artist).map(normalizeName).filter(Boolean));
  let best: { r: ItunesResult; score: number } | null = null;
  for (const r of results) {
    if (!r.artworkUrl100 || !r.artistName || !r.trackName) continue;
    const rArtists = splitArtistNames(r.artistName).map(normalizeName);
    const artistOk = rArtists.some((a) => wanted.has(a));
    if (!artistOk) continue;
    const ts = titleSimilarity(r.trackName, title);
    if (ts < 0.8) continue;
    if (!best || ts > best.score) best = { r, score: ts };
  }
  return best ? best.r : null;
}

/** 失敗(通信エラー)は null、見つからない場合は state 'none' として保存 */
export async function findAlbumArt(
  trackId: string,
  rawTitle: string,
  rawArtist: string,
  priority: 'high' | 'low' = 'high'
): Promise<AlbumArt | null | undefined> {
  const meta = extractSmartTrackMeta(rawTitle, rawArtist);
  const artist = meta.cleanArtist.replace(/\s*\(Cover\)/i, '').trim();
  const title = meta.cleanTitle;
  if (!artist || !title) return undefined;
  const results = await searchSongs(`${artist} ${title}`, priority);
  if (results === null) return undefined; // 通信失敗: 後で再試行
  const hit = pickBest(results, artist, title);
  const c = load();
  if (!hit) {
    c[trackId] = [0, '', Date.now()];
    saveSoon();
    return null;
  }
  const url = hit.artworkUrl100!.replace(/\/\d+x\d+bb\./, '/600x600bb.');
  c[trackId] = [url, hit.collectionName || '', Date.now()];
  saveSoon();
  return { url, album: hit.collectionName || '' };
}

export function forgetArt(trackId: string) {
  delete load()[trackId];
  saveSoon();
}
