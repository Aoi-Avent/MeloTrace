/**
 * 読み込みが長引くときの、静かでやわらかい「ぽーん」という音。
 * Web Audio で小さく鳴らし、再生が始まったらすぐ止める。端末のマナーモード時は鳴らない。
 */
const KEY = 'melotrace_wait_chime_v1';
let ctx: AudioContext | null = null;

export function isChimeEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch (e) {
    return true;
  }
}
export function setChimeEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch (e) {}
}

/** ユーザー操作の中で一度呼んでおくと、後から鳴らせる */
export function primeChime() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  } catch (e) {}
}

function pon(freq: number) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.05, t + 0.03);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  out.connect(ctx.destination);
  [1, 2.01].forEach((m, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = 'sine';
    o.frequency.value = freq * m;
    g.gain.value = i === 0 ? 1 : 0.22;
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 1.2);
  });
}

/** やさしい音階を、間隔を空けて最大4回。戻り値の関数で止められる */
export function startWaitChime(): () => void {
  if (!isChimeEnabled()) return () => {};
  primeChime();
  const notes = [523.25, 587.33, 659.25, 783.99];
  let i = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const next = () => {
    if (i >= notes.length) return;
    pon(notes[i++]);
    timer = setTimeout(next, 2600);
  };
  next();
  return () => {
    if (timer) clearTimeout(timer);
    i = notes.length;
  };
}
