/**
 * Googleログイン + Google Drive「アプリ専用データフォルダ(appDataFolder)」を使ったクラウド保存。
 * - 専用サーバー不要（GitHub Pages のままで動作）
 * - アプリが作成したファイルにしかアクセスできない権限(drive.appdata)のみを要求
 * - 必要なもの: Google Cloud Console の OAuth クライアントID（ウェブ）→ VITE_GOOGLE_CLIENT_ID
 */
import type { Playlist } from '../types/music';

export const GOOGLE_CLIENT_ID: string = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.appdata';
const SYNC_FILE_NAME = 'melotrace-sync.json';

export interface CompactTrack {
  id: string;
  title: string;
  artist: string;
  channelId?: string;
  genre: string;
  playCount: number;
  duration?: number | null;
  lastPlayed: string;
  firstPlayed?: string;
}

export interface SyncSettings {
  strictnessMode?: 'strict' | 'standard' | 'all';
  lyricsDisplayMode?: 'dynamic' | 'static';
  artworkAspectRatio?: 'auto' | '1:1' | '16:9';
  retroPlayerSkin?: 'ipod' | 'walkman';
  themeId?: string;
  artistFilterMode?: 'all' | 'official';
  artworkSource?: 'album' | 'youtube';
}

export interface SyncPayload {
  version: 1;
  updatedAt: string; // ISO8601（この内容の版を表す）
  favoriteIds: string[];
  bannedArtists: string[];
  bannedTracks: string[];
  playlists: Playlist[];
  settings: SyncSettings;
  /** ライブラリ（歌詞を除く軽量データ）。古い版には無い */
  tracks?: CompactTrack[];
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

let gsiPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gsiPromise = null;
      reject(new Error('Googleログイン用スクリプトを読み込めませんでした（通信環境を確認してください）'));
    };
    document.head.appendChild(s);
  });
  return gsiPromise;
}

export interface TokenResult {
  accessToken: string;
  expiresAt: number; // epoch ms
}

/** prompt: 'consent' = 同意画面を出す(初回) / '' = 既に同意済みなら無操作で更新を試みる */
export async function requestAccessToken(prompt: '' | 'consent' | 'select_account'): Promise<TokenResult> {
  if (!GOOGLE_CLIENT_ID) throw new Error('NO_CLIENT_ID');
  await loadGsi();
  return new Promise<TokenResult>((resolve, reject) => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      prompt,
      callback: (resp: any) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error_description || resp.error || 'ログインに失敗しました'));
          return;
        }
        resolve({ accessToken: resp.access_token, expiresAt: Date.now() + (Number(resp.expires_in) || 3600) * 1000 - 60_000 });
      },
      error_callback: (err: any) => reject(new Error(err?.type === 'popup_closed' ? 'ログインがキャンセルされました' : err?.message || 'ログインに失敗しました')),
    });
    client.requestAccessToken();
  });
}

export async function fetchProfile(token: string): Promise<GoogleProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('アカウント情報を取得できませんでした');
  return res.json();
}

export function revokeToken(token: string) {
  try {
    (window as any).google?.accounts?.oauth2?.revoke(token, () => {});
  } catch (e) {}
}

async function driveFetch(token: string, url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Drive APIエラー(${res.status}) ${text.slice(0, 120)}`);
  }
  return res;
}

async function findSyncFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${SYNC_FILE_NAME}' and trashed=false`);
  const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&pageSize=1`);
  const json = await res.json();
  return json.files?.[0]?.id ?? null;
}

export async function pullFromCloud(token: string): Promise<{ fileId: string; payload: SyncPayload } | null> {
  const id = await findSyncFileId(token);
  if (!id) return null;
  const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
  const payload = (await res.json()) as SyncPayload;
  if (!payload || payload.version !== 1) throw new Error('クラウド上のデータ形式が不明です');
  return { fileId: id, payload };
}

export async function pushToCloud(token: string, payload: SyncPayload, knownFileId?: string | null): Promise<string> {
  const body = JSON.stringify(payload);
  const fileId = knownFileId ?? (await findSyncFileId(token));
  if (fileId) {
    await driveFetch(token, `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return fileId;
  }
  const boundary = 'melotrace' + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name: SYNC_FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' });
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  const res = await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
  return (await res.json()).id as string;
}
