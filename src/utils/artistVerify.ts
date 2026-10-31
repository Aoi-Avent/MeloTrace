/**
 * 「アーティストとして実在するか」の判定。
 * 音楽カタログ（MusicBrainz → iTunes）に同名のアーティストが存在するかを照合し、結果を端末に保存する。
 * - verified:   カタログに実在を確認できた
 * - unverified: 照合したが見つからなかった（個人チャンネル・まとめ・配信者名など）
 * - 通信失敗は結果を保存せず、後で再試行する
 */
import { searchArtists } from './itunes';
import { normalizeName, splitArtistNames } from './textMatch';

export type VerifyStatus = 'verified' | 'unverified';

const CACHE_KEY = 'melotrace_artist_verify_v1';
const OVERRIDE_KEY = 'melotrace_artist_override_v1';
const UNVERIFIED_RETRY_MS = 30 * 24 * 3600 * 1000;

type CacheEntry = [1 | 0, number, string?]; // [verified?, checkedAt, source]
let cache: Record<string, CacheEntry> | null = null;
let overrides: Record<string, 'official' | 'exclude'> | null = null;

function loadCache(): Record<string, CacheEntry> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {};
  } catch (e) {
    cache = {};
  }
  return cache!;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveCacheSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {}
  }, 1500);
}

export function loadOverrides(): Record<string, 'official' | 'exclude'> {
  if (overrides) return overrides;
  try {
    overrides = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') || {};
  } catch (e) {
    overrides = {};
  }
  return overrides!;
}

export function setOverride(artist: string, v: 'official' | 'exclude' | null) {
  const o = loadOverrides();
  const k = normalizeName(artist);
  if (v) o[k] = v;
  else delete o[k];
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o));
  } catch (e) {}
}

/** 保存済みの判定結果。未判定なら null */
export function getStatus(artist: string): VerifyStatus | null {
  const k = normalizeName(artist);
  const ov = loadOverrides()[k];
  if (ov === 'official') return 'verified';
  if (ov === 'exclude') return 'unverified';
  const e = loadCache()[k];
  if (!e) return null;
  return e[0] === 1 ? 'verified' : 'unverified';
}

export function needsCheck(artist: string): boolean {
  const k = normalizeName(artist);
  if (loadOverrides()[k]) return false;
  const e = loadCache()[k];
  if (!e) return true;
  if (e[0] === 0 && Date.now() - e[1] > UNVERIFIED_RETRY_MS) return true;
  return false;
}

// ---- MusicBrainz ----
let mbLast = 0;
let mbFailures = 0;
let mbDisabled = false;

async function checkMusicBrainz(names: string[]): Promise<boolean | null> {
  if (mbDisabled) return null;
  const wait = mbLast + 1150 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  mbLast = Date.now();
  const primary = names[0];
  try {
    const url = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${primary.replace(/"/g, '')}"`)}&fmt=json&limit=5`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    mbFailures = 0;
    const wanted = new Set(names.map(normalizeName).filter(Boolean));
    for (const a of json.artists || []) {
      if ((a.score ?? 0) < 90) continue;
      const cands = [a.name, a['sort-name'], ...((a.aliases || []).map((x: any) => x.name))].filter(Boolean).map(normalizeName);
      const hit = cands.some((c: string) => wanted.has(c));
      const looksReal = Boolean(a.type) || (Array.isArray(a.tags) && a.tags.length > 0);
      if (hit && looksReal) return true;
    }
    return false;
  } catch (e) {
    mbFailures += 1;
    if (mbFailures >= 3) mbDisabled = true; // CORS/通信エラーが続くならこの起動中は使わない
    return null;
  }
}

async function checkItunes(names: string[]): Promise<boolean | null> {
  const res = await searchArtists(names[0], 'low');
  if (res === null) return null;
  const wanted = new Set(names.map(normalizeName).filter(Boolean));
  return res.some((r) => r.artistName && wanted.has(normalizeName(r.artistName)));
}

/** 1人分を判定して保存する。通信失敗時は null（保存しない） */
export async function verifyArtist(artist: string): Promise<VerifyStatus | null> {
  const names = splitArtistNames(artist);
  let verdict: boolean | null = null;
  let source = '';
  const mb = await checkMusicBrainz(names);
  if (mb === true) {
    verdict = true;
    source = 'mb';
  } else {
    const it = await checkItunes(names);
    if (it === true) {
      verdict = true;
      source = 'itunes';
    } else if (it === false && mb !== null) {
      verdict = false; // 両方で確認できなかった
    } else if (it === false && mb === null) {
      verdict = false;
    }
  }
  if (verdict === null) return null;
  loadCache()[normalizeName(artist)] = [verdict ? 1 : 0, Date.now(), source];
  saveCacheSoon();
  return verdict ? 'verified' : 'unverified';
}
