/**
 * iTunes Search API（Apple公開API・キー不要）への問い合わせ。
 * - ブラウザのCORS制限を避けるため、公式にサポートされている JSONP(callback) 方式で呼び出す
 * - 目安として1分あたり約20回までの制限があるため、直列キューで間隔を空けて実行する
 * - 優先度つき: 再生中の曲のジャケット取得(high)を、アーティスト判定の裏処理(low)より先に処理する
 */

export interface ItunesResult {
  wrapperType?: string;
  artistName?: string;
  trackName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  primaryGenreName?: string;
}

type Priority = 'high' | 'low';
interface Job {
  url: string;
  priority: Priority;
  resolve: (r: ItunesResult[] | null) => void;
}

const MIN_INTERVAL_MS = 3200;
const queue: Job[] = [];
let running = false;
let lastAt = 0;
let consecutiveFailures = 0;
let pausedUntil = 0;
let cbSeq = 0;

function jsonp(url: string, timeoutMs = 9000): Promise<ItunesResult[] | null> {
  return new Promise((resolve) => {
    const name = `__mt_itunes_${Date.now().toString(36)}_${cbSeq++}`;
    const script = document.createElement('script');
    let done = false;
    const finish = (val: ItunesResult[] | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        delete (window as any)[name];
      } catch (e) {
        (window as any)[name] = undefined;
      }
      script.remove();
      resolve(val);
    };
    (window as any)[name] = (data: any) => finish(Array.isArray(data?.results) ? data.results : []);
    script.onerror = () => finish(null);
    const timer = setTimeout(() => finish(null), timeoutMs);
    script.src = `${url}&callback=${name}`;
    document.head.appendChild(script);
  });
}

async function pump() {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const now = Date.now();
      if (now < pausedUntil) {
        await new Promise((r) => setTimeout(r, Math.min(pausedUntil - now, 30000)));
        continue;
      }
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      const wait = lastAt + MIN_INTERVAL_MS - now;
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));

      const hi = queue.findIndex((j) => j.priority === 'high');
      const job = queue.splice(hi >= 0 ? hi : 0, 1)[0];
      lastAt = Date.now();
      const res = await jsonp(job.url);
      if (res === null) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= 3) pausedUntil = Date.now() + 5 * 60 * 1000; // 連続失敗したら5分休む
      } else {
        consecutiveFailures = 0;
      }
      job.resolve(res);
    }
  } finally {
    running = false;
  }
}

function enqueue(url: string, priority: Priority): Promise<ItunesResult[] | null> {
  return new Promise((resolve) => {
    queue.push({ url, priority, resolve });
    void pump();
  });
}

const base = 'https://itunes.apple.com/search';

/** 曲を検索（ジャケット画像つき）。null = 通信失敗 */
export function searchSongs(term: string, priority: Priority = 'high'): Promise<ItunesResult[] | null> {
  return enqueue(`${base}?term=${encodeURIComponent(term)}&country=JP&media=music&entity=song&limit=8`, priority);
}

/** アーティストを検索。null = 通信失敗 */
export function searchArtists(term: string, priority: Priority = 'low'): Promise<ItunesResult[] | null> {
  return enqueue(`${base}?term=${encodeURIComponent(term)}&country=JP&media=music&entity=musicArtist&limit=5`, priority);
}

export function itunesQueueLength(): number {
  return queue.length;
}
