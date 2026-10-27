import React, { useState } from 'react';
import { Sparkles, MoveVertical } from 'lucide-react';
import { usePref, PREF_MASCOT, PREF_MASCOT_TALK } from '../utils/uiPrefs';
import { getBottomExtra, setBottomExtra } from '../utils/viewport';

const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label }) => (
  <button
    onClick={() => onChange(!on)}
    className={`w-12 h-7 rounded-full shrink-0 relative transition-colors ${on ? 'bg-[#30d158]' : 'bg-[#3a3a3c]'}`}
    role="switch"
    aria-checked={on}
    aria-label={label}
  >
    <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
);

export const AppearanceCard: React.FC = () => {
  const [mascot, setMascot] = usePref(PREF_MASCOT, 'on');
  const [talk, setTalk] = usePref(PREF_MASCOT_TALK, 'on');
  const [extra, setExtra] = useState<number>(getBottomExtra());

  return (
    <div className="mb-5 p-4 rounded-2xl apple-card border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-bold text-white">おとだま（画面の住人）</h3>
      </div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white">おとだまを表示する</p>
          <p className="text-[10px] text-[#8e8e93] mt-0.5 leading-relaxed">
            画面の下をのんびり歩き、曲に合わせて揺れます。タップは素通しなので操作の邪魔になりません。
          </p>
        </div>
        <Switch on={mascot === 'on'} onChange={(v) => setMascot(v ? 'on' : 'off')} label="おとだまを表示" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-white">ひとりごと（ふきだし）</p>
        <Switch on={talk === 'on'} onChange={(v) => setTalk(v ? 'on' : 'off')} label="ふきだし" />
      </div>

      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <MoveVertical className="w-4 h-4 text-accent" />
          <p className="text-xs font-bold text-white">画面下の余白を調整</p>
        </div>
        <p className="text-[10px] text-[#8e8e93] leading-relaxed mb-2">
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
  );
};
