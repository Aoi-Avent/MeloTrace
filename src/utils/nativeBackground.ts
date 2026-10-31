/**
 * iOSアプリ用: アプリを離れた（ホームに戻る/画面ロック）ときの再生の見張り。
 *
 * - システム都合で止められたら、自動で再生を再開する
 * - 「読み込み中」のまま進まなくなったら、今の位置から読み込み直す
 * - 何が起きているか分かるよう、背面にいる間の状態を再生ログに残す
 *
 * ユーザー自身が止めた場合（isWanted が false）は何もしない。
 */
import { isNativeApp } from './platform';

export interface BackgroundResumeOptions {
  /** 「再生したい」意思があるか（ユーザーが止めていなければ true） */
  isWanted: () => boolean;
  /** YouTubeプレーヤーの状態（1 再生中 / 2 一時停止 / 3 読み込み中 / -1 未開始 / 5 待機） */
  getState: () => number | undefined;
  /** 現在の再生位置（秒） */
  getTime: () => number;
  /** 再生を再開する */
  resume: () => void;
  /** 指定位置から動画を読み込み直す */
  reload: (startSeconds: number) => void;
  /** アプリの前面/背面が切り替わった瞬間の通知（システム都合の一時停止の判定に使う） */
  onStateChange: () => void;
  log: (message: string) => void;
}

const WATCH_MS = 20000; // 背面に回ってから、この間だけ見張る
const INTERVAL_MS = 700;
const STUCK_TICKS = 4; // 約3秒、読み込み中のまま進まなければ読み込み直す
const MAX_RELOADS = 2;

export async function setupNativeBackgroundResume(o: BackgroundResumeOptions): Promise<() => void> {
  if (!isNativeApp()) return () => {};

  o.log(navigator.userAgent.includes('Macintosh') ? '表示モード: デスクトップ' : '表示モード: モバイル');

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

    const startedAt = Date.now();
    let ticks = 0;
    let stuckTicks = 0;
    let reloads = 0;
    let lastTime = o.getTime();

    timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed > WATCH_MS || !o.isWanted()) {
        stop();
        return;
      }
      ticks++;
      const st = o.getState();
      const t = o.getTime();
      const moved = Math.abs(t - lastTime) > 0.2;
      lastTime = t;
      if (ticks % 3 === 0) o.log(`背面 ${Math.round(elapsed / 1000)}秒 状態=${st} 位置=${t.toFixed(1)}`);

      if (st === 1) {
        stuckTicks = 0;
        return;
      }
      if (st === 3) {
        stuckTicks = moved ? 0 : stuckTicks + 1;
        if (stuckTicks >= STUCK_TICKS && reloads < MAX_RELOADS) {
          reloads++;
          stuckTicks = 0;
          o.log('読み込み中のまま停止 → 今の位置から読み込み直し');
          o.reload(t);
        }
        return;
      }
      stuckTicks = 0;
      o.log('背面で停止を検知 → 再開を試行');
      o.resume();
    }, INTERVAL_MS);
  });

  return () => {
    stop();
    handle.remove();
  };
}
