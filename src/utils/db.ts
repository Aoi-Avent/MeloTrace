/**
 * Lightweight native IndexedDB storage for large music libraries
 * Prevents localStorage 5MB quota errors and keeps the main UI thread silky smooth.
 */
import { MusicTrack, Playlist } from '../types/music';

const DB_NAME = 'melotrace_db';
const DB_VERSION = 1;
const STORE_TRACKS = 'tracks';
const STORE_PLAYLISTS = 'playlists';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTracksToDB(tracks: MusicTrack[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    store.clear();
    for (const track of tracks) {
      store.put(track);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('saveTracksToDB failed:', err);
  }
}

export async function loadTracksFromDB(): Promise<MusicTrack[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('loadTracksFromDB failed:', err);
    return null;
  }
}

export async function savePlaylistsToDB(playlists: Playlist[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);
    store.clear();
    for (const pl of playlists) {
      store.put(pl);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('savePlaylistsToDB failed:', err);
  }
}

export async function loadPlaylistsFromDB(): Promise<Playlist[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PLAYLISTS, 'readonly');
    const store = tx.objectStore(STORE_PLAYLISTS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('loadPlaylistsFromDB failed:', err);
    return null;
  }
}

export async function clearDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_TRACKS, STORE_PLAYLISTS], 'readwrite');
    tx.objectStore(STORE_TRACKS).clear();
    tx.objectStore(STORE_PLAYLISTS).clear();
  } catch (err) {
    console.warn('clearDB failed:', err);
  }
}
