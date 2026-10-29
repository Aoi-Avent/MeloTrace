import React, { useState } from 'react';
import { Sparkles, MoveVertical } from 'lucide-react';
import { usePref, PREF_MASCOT, PREF_MASCOT_TALK } from '../utils/uiPrefs';
import { PREF_UI, PREF_ANIM, PREF_STATUSBAR, setUiPref } from '../utils/uiMode';
import { isChimeEnabled, setChimeEnabled } from '../utils/waitChime';
import { getBottomExtra, setBottomExtra } from '../utils/viewport';

const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label }) => (
  <button
    onClick={() => onChange(!on)}
    className={`w-12 h-7 rounded-full shrink-0 relative transition-colors ${on ? 'bg-[#30d158]' : 'bg-surface-3'}`}
    role="switch"
    aria-checked={on}
    aria-label={label}
  >
    <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-fg transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
);

export const AppearanceCard: React.FC = () => {
  const [mascot, setMascot] = usePref(PREF_MASCOT, 'on');
  const [talk, setTalk] = usePref(PREF_MASCOT_TALK, 'on');
  const [extra, setExtra] = useState<number>(getBottomExtra());
  const [ui] = usePref(PREF_UI, 'classic');
  const [anim] = usePref(PREF_ANIM, 'on');
  const [statusTop] = usePref(PREF_STATUSBAR, 'on');
  const [chime, setChime] = useState<boolean>(isChimeEnabled());
  const [videoMode, setVideoMode] = usePref('melotrace_video_mode_v1', 'normal');

  return (
    <>
    <div className="mb-5 p-4 rounded-2xl apple-card">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-bold text-fg">デザインとアニメーション</h3>
      </div>
      <p className="text-[10px] text-muted leading-relaxed mb-3">新しいデザインを試せます。いつでも元に戻せて、機能や動作は変わりません。</p>
      <div className="inline-flex items-center gap-1 p-0.5 rounded-full bg-fg/10 text-[11px] font-semibold mb-4">
        {([['classic', '以前のUI'], ['next', '開発中のUI']] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setUiPref(PREF_UI, v)}
            className={`px-3.5 py-1.5 rounded-full transition-colors ${ui === v ? 'bg-fg text-inverse' : 'text-fg/70'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {ui === 'next' && <p className="text-[10px] text-muted leading-relaxed -mt-2 mb-3">「ふわもち×ウォークマン」の試作です。テーマは「ふわもち」「ホワイト」「スチール」などと相性が良いです。</p>}

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-fg">画面のアニメーション</p>
          <p className="text-[10px] text-muted mt-0.5 leading-relaxed">画面の切り替えやシートの動きなど。動きが重いときはオフに。</p>
        </div>
        <Switch on={anim !== 'off'} onChange={(v) => setUiPref(PREF_ANIM, v ? 'on' : 'off')} label="画面のアニメーション" />
      </div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-fg">待ち時間のやさしい音</p>
          <p className="text-[10px] text-muted mt-0.5 leading-relaxed">読み込みが長引くときだけ、小さく鳴ります（マナーモードでは鳴りません）。</p>
        </div>
        <Switch on={chime} onChange={(v) => { setChime(v); setChimeEnabled(v); }} label="待ち時間のやさしい音" />
      </div>
      <div className="mb-3">
        <p className="text-xs font-semibold text-fg">映像の描画（実験）</p>
        <p className="text-[10px] text-muted mt-0.5 leading-relaxed mb-2">
          「抑える」にすると、動画の映像を画面に描かず、低画質で読み込みます。再生開始が速くなるかを試すための実験機能です（効果は端末や状況で変わります）。遅くなる・止まるときは「標準」に戻してください。
        </p>
        <div className="inline-flex items-center gap-1 p-0.5 rounded-full bg-fg/10 text-[11px] font-semibold">
          {([['normal', '標準'], ['quiet', '抑える（実験）']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setVideoMode(v)}
              className={`px-3.5 py-1.5 rounded-full transition-colors ${videoMode === v ? 'bg-fg text-inverse' : 'text-fg/70'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-fg">画面最上部のタップで先頭へ</p>
          <p className="text-[10px] text-muted mt-0.5 leading-relaxed">時刻や電池表示をタップすると、一覧の先頭に戻ります（再読み込み後に反映）。</p>
        </div>
        <Switch on={statusTop !== 'off'} onChange={(v) => { setUiPref(PREF_STATUSBAR, v ? 'on' : 'off'); }} label="画面最上部のタップで先頭へ" />
      </div>
    </div>

    <div className="mb-5 p-4 rounded-2xl apple-card">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-bold text-fg">おとだま（画面の住人）</h3>
      </div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-fg">おとだまを表示する</p>
          <p className="text-[10px] text-muted mt-0.5 leading-relaxed">
            画面の下をのんびり歩き、曲に合わせて揺れます。タップは素通しなので操作の邪魔になりません。
          </p>
        </div>
        <Switch on={mascot === 'on'} onChange={(v) => setMascot(v ? 'on' : 'off')} label="おとだまを表示" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-fg">ひとりごと（ふきだし）</p>
        <Switch on={talk === 'on'} onChange={(v) => setTalk(v ? 'on' : 'off')} label="ふきだし" />
      </div>

      <div className="mt-4 pt-3 border-t border-fg/10">
        <div className="flex items-center gap-2 mb-1">
          <MoveVertical className="w-4 h-4 text-accent" />
          <p className="text-xs font-bold text-fg">画面下の余白を調整</p>
        </div>
        <p className="text-[10px] text-muted leading-relaxed mb-2">
          Safariの下のバーにボタンが隠れるときは、ここで持ち上げます（現在 {extra}px）。
        </p>
        <input
          type="range"
          min={0}
          max={80}
          step={2}
          value={extra}
          onChange={(e) => {
            const v = Number(e.target.value);
            setExtra(v);
            setBottomExtra(v);
          }}
          className="w-full accent-[var(--accent)]"
        />
      </div>
    </div>
    </>
  );
};
