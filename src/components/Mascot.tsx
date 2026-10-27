import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { usePref, PREF_MASCOT, PREF_MASCOT_TALK } from '../utils/uiPrefs';

/**
 * 「おとだま」— 音の魂（たましい）。曲を聴くと勝手にノってくる、ちょっとヘンテコな住人。
 * 画面の下のほうをのんびり歩き回る。操作の邪魔にならないよう、タップはすべて素通しにしている。
 */
type Mood = 'idle' | 'groove' | 'sleep' | 'ad' | 'loading' | 'worry';

const LINES: Record<string, string[]> = {
  groove: ['♪ ふんふ〜ん', 'いい曲だねぇ', 'しっぽが勝手に動く…', 'ノってきた！', '今日もよく聴いてるね', 'ここ好き'],
  idle: ['ぼーっ…', 'おなかすいた', 'ここにいるよ', 'おとだま、だよ', 'なにか流す？', 'ひま〜'],
  sleep: ['zzz…', 'むにゃ…', 'あと5分…'],
  ad: ['…広告だね', '耳ふさいでる', 'もうすぐ曲だよ'],
  worry: ['あれっ？', 'だいじょうぶ？', 'うーん…'],
  next: ['つぎ！', 'お、変わった', 'どんな曲かな'],
  love: ['♡', 'だいすき！', 'わかる〜'],
};

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const Mascot: React.FC = () => {
  const { currentTrack, isPlaying, isBuffering, isAdPlaying, playbackHint, isNowPlayingOpen, isRetroPlayerOpen } = usePlayer();
  const [enabled] = usePref(PREF_MASCOT, 'on');
  const [talk] = usePref(PREF_MASCOT_TALK, 'on');

  const [x, setX] = useState(18); // 画面幅に対する位置(%)
  const [facing, setFacing] = useState<1 | -1>(1);
  const [hopKey, setHopKey] = useState(0);
  const [bubble, setBubble] = useState<{ text: string; key: number } | null>(null);
  const [hearts, setHearts] = useState(0);
  const [sleeping, setSleeping] = useState(false);
  const reduceMotion = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const mood: Mood = playbackHint ? 'worry' : isAdPlaying ? 'ad' : isBuffering && isPlaying ? 'loading' : isPlaying ? 'groove' : sleeping ? 'sleep' : 'idle';

  const say = (text: string) => {
    if (talk !== 'on') return;
    setBubble({ text, key: Date.now() });
  };

  // 停止して25秒たつと眠る
  useEffect(() => {
    if (isPlaying) {
      setSleeping(false);
      return;
    }
    const t = setTimeout(() => setSleeping(true), 25000);
    return () => clearTimeout(t);
  }, [isPlaying]);

  // 曲が変わったら、ぴょん
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentTrack) return;
    if (lastId.current && lastId.current !== currentTrack.id) {
      setHopKey((k) => k + 1);
      if (Math.random() < 0.35) say(pick(LINES.next));
    }
    lastId.current = currentTrack.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // 「スキ」を付けたら、ハートがふわっと出る
  const lastFav = useRef<boolean | null>(null);
  useEffect(() => {
    if (!currentTrack) return;
    if (lastFav.current === false && currentTrack.isFavorite) {
      setHearts((n) => n + 1);
      say(pick(LINES.love));
    }
    lastFav.current = currentTrack.isFavorite;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.isFavorite, currentTrack?.id]);

  // 気分が変わったとき、たまにひとこと
  useEffect(() => {
    if (mood === 'ad' || mood === 'worry') say(pick(LINES[mood]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood]);

  // のんびり歩く
  useEffect(() => {
    if (enabled !== 'on' || reduceMotion.current) return;
    let timer: ReturnType<typeof setTimeout>;
    const walk = () => {
      if (mood !== 'sleep') {
        setX((prev) => {
          const next = Math.round(8 + Math.random() * 72);
          setFacing(next >= prev ? 1 : -1);
          return next;
        });
      }
      timer = setTimeout(walk, 7000 + Math.random() * 7000);
    };
    timer = setTimeout(walk, 4000);
    return () => clearTimeout(timer);
  }, [enabled, mood]);

  // ときどきひとりごと
  useEffect(() => {
    if (enabled !== 'on' || talk !== 'on') return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible' || Math.random() > 0.5) return;
      const key = mood === 'groove' ? 'groove' : mood === 'sleep' ? 'sleep' : mood === 'idle' ? 'idle' : null;
      if (key) say(pick(LINES[key]));
    }, 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, talk, mood]);

  if (enabled !== 'on' || isNowPlayingOpen || isRetroPlayerOpen) return null;

  // ミニプレイヤーが出ているときは、その上に立つ
  const lift = currentTrack ? '4.6rem' : '0rem';

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 right-0 z-[25] pointer-events-none"
      style={{ bottom: `calc(3.75rem + max(env(safe-area-inset-bottom, 0px), 8px) + var(--bottom-gap, 0px) + ${lift})` }}
    >
      <div
        className="relative w-[72px]"
        style={{ left: `${x}%`, transition: reduceMotion.current ? 'none' : 'left 6s ease-in-out', transform: 'translateX(-50%)' }}
      >
        {/* ふきだし */}
        {bubble && (
          <div
            key={bubble.key}
            onAnimationEnd={() => setBubble(null)}
            className="od-bubble absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-black shadow-lg"
          >
            {bubble.text}
          </div>
        )}

        {/* ハート */}
        {hearts > 0 && (
          <div key={hearts} className="od-float absolute -top-4 left-1/2 text-base text-accent" onAnimationIteration={() => setHearts(0)}>
            ♥
          </div>
        )}
        {mood === 'sleep' && <div className="od-float absolute -top-3 right-0 text-xs font-bold text-white/70">z z</div>}

        <div key={hopKey} className={hopKey > 0 ? 'od-hop' : ''}>
          <div className={mood === 'groove' ? 'od-bob' : 'od-breathe'}>
            <div className={mood === 'loading' ? 'od-spin' : ''} style={{ transform: `scaleX(${facing})` }}>
              <OtodamaSvg mood={mood} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const OtodamaSvg: React.FC<{ mood: Mood }> = ({ mood }) => {
  const sleepy = mood === 'sleep';
  const ad = mood === 'ad';
  const worry = mood === 'worry';
  return (
    <svg viewBox="0 0 80 84" width="72" height="76" style={{ overflow: 'visible' }}>
      {/* 音符のアンテナ */}
      <g className="od-note">
        <path d="M44 14 C44 8 46 4 50 2" stroke="#d9c6a8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <ellipse cx="42" cy="15" rx="4.4" ry="3.4" fill="var(--accent)" transform="rotate(-20 42 15)" />
        <path d="M46 14 L46 2 Q52 3 53 8" stroke="var(--accent)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
      {/* 足 */}
      <ellipse cx="29" cy="78" rx="8" ry="4.5" fill="#cdb894" />
      <ellipse cx="51" cy="78" rx="8" ry="4.5" fill="#cdb894" />
      {/* からだ（ゆがんだおもち） */}
      <path
        d="M40 14 C60 12 74 28 72 50 C71 68 58 78 40 78 C22 78 9 68 8 50 C7 28 22 15 40 14 Z"
        fill="#f6ecdb"
        stroke="#e2d2b4"
        strokeWidth="2"
      />
      {/* ほっぺ */}
      <ellipse cx="22" cy="54" rx="5" ry="3" fill="#f5b7a8" opacity="0.7" />
      <ellipse cx="58" cy="52" rx="4" ry="2.6" fill="#f5b7a8" opacity="0.7" />
      {/* 目（左右で大きさがちがう） */}
      {sleepy ? (
        <g stroke="#3b2f22" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M20 44 Q26 48 32 44" />
          <path d="M47 45 Q52 48 57 45" />
        </g>
      ) : ad ? (
        <g stroke="#3b2f22" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M20 42 L32 46 M20 48 L32 46" />
          <path d="M48 44 L58 46 M48 48 L58 46" />
        </g>
      ) : (
        <g className="od-eye">
          <ellipse cx="26" cy="44" rx="6" ry="7" fill="#3b2f22" />
          <circle cx="28" cy="41.5" r="2.2" fill="#fff" />
          <ellipse cx="53" cy="46" rx="3.6" ry="4.2" fill="#3b2f22" />
          <circle cx="54.2" cy="44.6" r="1.3" fill="#fff" />
        </g>
      )}
      {/* くち */}
      {worry ? (
        <path d="M34 62 Q40 57 46 62" stroke="#3b2f22" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      ) : sleepy ? (
        <ellipse cx="40" cy="61" rx="2.4" ry="2" fill="#3b2f22" opacity="0.8" />
      ) : (
        <path d="M33 58 Q36.5 63 40 58 Q43.5 63 47 58" stroke="#3b2f22" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}
      {/* 大きすぎるヘッドホン */}
      <path d="M10 40 C8 14 72 14 70 40" stroke="var(--accent)" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="3" y="36" width="12" height="20" rx="6" fill="var(--accent)" />
      <rect x="65" y="36" width="12" height="20" rx="6" fill="var(--accent)" />
      <rect x="6" y="40" width="4" height="12" rx="2" fill="#fff" opacity="0.35" />
      <rect x="70" y="40" width="4" height="12" rx="2" fill="#fff" opacity="0.35" />
      {worry && <path d="M66 24 q3 5 0 8 q-3 -3 0 -8z" fill="#8ecbff" />}
    </svg>
  );
};
