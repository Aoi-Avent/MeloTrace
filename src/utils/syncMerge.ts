/**
 * クラウド同期の「判断」部分（純粋関数）。
 * 方式: 前回同期した時点の内容ハッシュ(base)と比べて、
 *   - この端末だけ変わった   → 保存(push)
 *   - クラウドだけ変わった   → 反映(apply)
 *   - 両方変わった/初回接続  → 統合(merge)して反映＋保存
 * ライブラリ(曲一覧)は常に和集合で統合し、再生回数などは大きい方を採用する。
 */
import type { MusicTrack, Playlist } from '../types/music';
import type { CompactTrack, SyncPayload, SyncSettings } from './cloudSync';

export interface LocalSnapshot {
  tracks: MusicTrack[];
  bannedArtists: string[];
  bannedTracks: string[];
  playlists: Playlist[];
  settings: SyncSettings;
  modifiedAt: string; // この端末で最後に設定を変更した時刻(ISO)。不明なら ''
  isDemoMode: boolean;
}

export interface SyncBase {
  hash: string;
  rev: string;
}

export interface ApplyState {
  tracks: MusicTrack[];
  favoriteIds: string[];
  bannedArtists: string[];
  bannedTracks: string[];
  playlists: Playlist[];
  settings: SyncSettings;
  leaveDemoMode: boolean;
}

export interface SyncDecision {
  apply: ApplyState | null;
  push: SyncPayload | null;
  message: string;
}

export type SyncMode = 'auto' | 'push' | 'pull';

/** 同期対象の内容を表す文字列（順序に依存しない） */
export function contentSignature(s: {
  tracks: MusicTrack[];
  bannedArtists: string[];
  bannedTracks: string[];
  playlists: Playlist[];
  settings: SyncSettings;
}): string {
  const favs = s.tracks.filter((t) => t.isFavorite && !t.isDemo).map((t) => t.id).sort();
  const pls = [...s.playlists].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify([
    favs,
    [...s.bannedArtists].sort(),
    [...s.bannedTracks].sort(),
    pls,
    s.settings.strictnessMode ?? null,
    s.settings.lyricsDisplayMode ?? null,
    s.settings.artworkAspectRatio ?? null,
    s.settings.retroPlayerSkin ?? null,
    s.settings.themeId ?? null,
  ]);
}

/** 軽量な文字列ハッシュ (cyrb53) */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function toCompact(t: MusicTrack): CompactTrack {
  const c: CompactTrack = {
    id: t.id,
    title: t.title,
    artist: t.artist,
    genre: t.genre,
    playCount: t.playCount || 0,
    lastPlayed: t.lastPlayed || '',
  };
  if (t.channelId) c.channelId = t.channelId;
  if (t.duration != null) c.duration = t.duration;
  if (t.firstPlayed) c.firstPlayed = t.firstPlayed;
  return c;
}

export function fromCompact(c: CompactTrack): MusicTrack {
  return {
    id: c.id,
    title: c.title,
    artist: c.artist,
    channelId: c.channelId,
    genre: c.genre,
    playCount: c.playCount || 0,
    duration: c.duration ?? null,
    lastPlayed: c.lastPlayed || '',
    firstPlayed: c.firstPlayed,
    isFavorite: false,
    thumbnailUrl: `https://img.youtube.com/vi/${c.id}/mqdefault.jpg`,
  };
}

export function mergeTracks(local: MusicTrack[], remote: CompactTrack[] | undefined, localIsDemo: boolean): MusicTrack[] {
  if (!remote || remote.length === 0) return local;
  if (localIsDemo) return remote.map(fromCompact); // サンプルデータは実データで置き換える
  const map = new Map<string, MusicTrack>();
  for (const t of local) map.set(t.id, t);
  for (const r of remote) {
    const l = map.get(r.id);
    if (!l) {
      map.set(r.id, fromCompact(r));
    } else {
      const first = [l.firstPlayed, r.firstPlayed].filter(Boolean).sort()[0];
      map.set(r.id, {
        ...l,
        playCount: Math.max(l.playCount || 0, r.playCount || 0),
        lastPlayed: (l.lastPlayed || '') >= (r.lastPlayed || '') ? l.lastPlayed : r.lastPlayed,
        firstPlayed: first || l.firstPlayed,
      });
    }
  }
  return Array.from(map.values());
}

const union = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));

export function mergePlaylists(a: Playlist[], b: Playlist[]): Playlist[] {
  const map = new Map<string, Playlist>();
  for (const p of a) map.set(p.id, p);
  for (const p of b) {
    const cur = map.get(p.id);
    if (!cur || (p.updatedAt || '') > (cur.updatedAt || '')) map.set(p.id, p);
  }
  return Array.from(map.values());
}

function applyFavorites(tracks: MusicTrack[], favIds: string[]): MusicTrack[] {
  const set = new Set(favIds);
  return tracks.map((t) => (t.isFavorite === set.has(t.id) ? t : { ...t, isFavorite: set.has(t.id) }));
}

function buildPayload(tracks: MusicTrack[], l: LocalSnapshot, favoriteIds: string[], bans: { a: string[]; t: string[] }, playlists: Playlist[], settings: SyncSettings, now: string): SyncPayload {
  return {
    version: 1,
    updatedAt: now,
    favoriteIds,
    bannedArtists: bans.a,
    bannedTracks: bans.t,
    playlists,
    settings,
    tracks: tracks.filter((t) => !t.isDemo).map(toCompact),
  };
}

function tracksDiffer(local: MusicTrack[], remote: CompactTrack[] | undefined): boolean {
  const real = local.filter((t) => !t.isDemo);
  if (!remote) return real.length > 0;
  if (real.length !== remote.length) return true;
  const m = new Map(remote.map((r) => [r.id, r]));
  for (const t of real) {
    const r = m.get(t.id);
    if (!r) return true;
    if ((t.playCount || 0) !== (r.playCount || 0) || (t.lastPlayed || '') !== (r.lastPlayed || '')) return true;
  }
  return false;
}

export function decideSync(args: {
  mode: SyncMode;
  remote: SyncPayload | null;
  base: SyncBase | null;
  localHash: string;
  local: LocalSnapshot;
  now: string;
}): SyncDecision {
  const { mode, remote, base, localHash, local, now } = args;
  const localFavs = local.tracks.filter((t) => t.isFavorite && !t.isDemo).map((t) => t.id);
  const localDirty = !base || base.hash !== localHash;
  const remoteChanged = !!remote && (!base || base.rev !== remote.updatedAt);
  const mergedTracks = remote ? mergeTracks(local.tracks, remote.tracks, local.isDemoMode) : local.tracks;
  const leaveDemo = local.isDemoMode && !!remote?.tracks && remote.tracks.length > 0;

  const pushLocal = (tracks: MusicTrack[]) =>
    buildPayload(tracks, local, tracks.filter((t) => t.isFavorite && !t.isDemo).map((t) => t.id), { a: local.bannedArtists, t: local.bannedTracks }, local.playlists, local.settings, now);

  const fromRemote = (tracks: MusicTrack[]): ApplyState => ({
    tracks: applyFavorites(tracks, remote!.favoriteIds),
    favoriteIds: remote!.favoriteIds,
    bannedArtists: remote!.bannedArtists || [],
    bannedTracks: remote!.bannedTracks || [],
    playlists: remote!.playlists || [],
    settings: remote!.settings || {},
    leaveDemoMode: leaveDemo,
  });

  const merged = (): { apply: ApplyState; push: SyncPayload } => {
    const favs = union(localFavs, remote!.favoriteIds);
    const bansA = union(local.bannedArtists, remote!.bannedArtists || []);
    const bansT = union(local.bannedTracks, remote!.bannedTracks || []);
    const pls = mergePlaylists(local.playlists, remote!.playlists || []);
    const remoteNewer = (remote!.updatedAt || '') > (local.modifiedAt || '');
    const settings = remoteNewer ? { ...local.settings, ...remote!.settings } : { ...remote!.settings, ...local.settings };
    const tracks = applyFavorites(mergedTracks, favs);
    return {
      apply: { tracks, favoriteIds: favs, bannedArtists: bansA, bannedTracks: bansT, playlists: pls, settings, leaveDemoMode: leaveDemo },
      push: buildPayload(tracks, local, favs, { a: bansA, t: bansT }, pls, settings, now),
    };
  };

  if (mode === 'pull') {
    if (!remote) return { apply: null, push: null, message: 'クラウドにはまだ保存されたデータがありません' };
    return { apply: fromRemote(mergedTracks), push: null, message: 'クラウドの内容をこの端末に反映しました' };
  }
  if (mode === 'push' || !remote) {
    return { apply: null, push: pushLocal(local.tracks), message: 'この端末の内容をクラウドに保存しました' };
  }

  // auto
  if (!base) {
    const m = merged();
    return { ...m, message: '初回の同期：この端末とクラウドの内容を統合しました' };
  }
  if (remoteChanged && !localDirty) {
    const needPush = tracksDiffer(mergedTracks, remote.tracks);
    return { apply: fromRemote(mergedTracks), push: needPush ? buildPayload(applyFavorites(mergedTracks, remote.favoriteIds), local, remote.favoriteIds, { a: remote.bannedArtists || [], t: remote.bannedTracks || [] }, remote.playlists || [], remote.settings || {}, now) : null, message: '他の端末での変更をこの端末に反映しました' };
  }
  if (!remoteChanged && localDirty) {
    return { apply: null, push: pushLocal(mergedTracks), message: 'この端末での変更をクラウドに保存しました' };
  }
  if (remoteChanged && localDirty) {
    const m = merged();
    return { ...m, message: '両方の変更を統合しました' };
  }
  if (tracksDiffer(local.tracks, remote.tracks)) {
    return { apply: null, push: pushLocal(mergedTracks), message: '再生履歴などをクラウドに保存しました' };
  }
  return { apply: null, push: null, message: '変更なし（すでに最新です）' };
}
