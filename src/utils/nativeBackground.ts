/**
 * iOSアプリ用: アプリを離れた（ホームに戻る/画面ロック）ときに、YouTubeプレーヤーが
 * システム都合で止められたら、自動で再生を再開する。
 *
 * Webでは、ブラウザがバックグラウンドのページの動作を止めるため再開できないが、
 * アプリ（バックグラウンド音声モード）では、離れた直後も少しの間コードが動くので再開を試せる。
 * ユーザー自身が止めた場合（isWanted が false）は何もしない。
 */
import { isNativeApp } from './platform';

export interface BackgroundResumeOptions {
  /** 「再生したい」意思があるか（ユーザーが止めていなければ true） */
  isWanted: () => boolean;
  /** 今、実際に再生中（または読み込み中）か */
  isPlaying: () => boolean;
  /** 再生を再開する */
  resume: () => void;
  /** アプリの前面/背面が切り替わった瞬間の通知（システム都合の一時停止の判定に使う） */
  onStateChange: () => void;
  log: (message: string) => void;
}

const WATCH_MS = 20000; // 背面に回ってから、この間だけ見張る
const INTERVAL_MS = 700;

export async function setupNativeBackgroundResume(o: BackgroundResumeOptions): Promise<() => void> {
  if (!isNativeApp()) return () => {};

  const { App } = await import('@capacitor/app');
  let timer: number | undefined;
  const stop = () => {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };

  const handle = await App.addListener('appStateChange', ({ isActive }) => {
    o.onStateChange();
    o.log(`アプリ ${isActive ? '前面' : '背面'}`);
    stop();
    if (isActive || !o.isWanted()) return;

    const until = Date.now() + WATCH_MS;
    timer = window.setInterval(() => {
      if (Date.now() > until || !o.isWanted()) {
        stop();
        return;
      }
      if (!o.isPlaying()) {
        o.log('背面で停止を検知 → 再開を試行');
        o.resume();
      }
    }, INTERVAL_MS);
  });

  return () => {
    stop();
    handle.remove();
  };
}
