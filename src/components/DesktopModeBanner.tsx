import React, { useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { isIOSMobileMode } from '../utils/deviceMode';

const KEY = 'melotrace_dm_banner_dismissed_v1';

/** iPhone(モバイル表示)で開いているときだけ、バックグラウンド再生のための設定を一度だけ案内する */
export const DesktopModeBanner: React.FC = () => {
  const { setIsBgGuideOpen } = usePlayer();
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === 'true';
    } catch (e) {
      return false;
    }
  });
  if (hidden || !isIOSMobileMode()) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, 'true');
    } catch (e) {}
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[70] pt-[max(env(safe-area-inset-top,0px),8px)] px-3 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto flex items-center gap-2 rounded-2xl bg-[#1c1c1e] border border-white/10 px-3 py-2 shadow-2xl">
        <Smartphone className="w-4 h-4 text-[#30d158] shrink-0" />
        <p className="flex-1 text-[11px] text-white leading-snug">
          画面を閉じても音楽を続けるには、「デスクトップ用Webサイト」の設定（1回だけ）が必要です。
        </p>
        <button onClick={() => setIsBgGuideOpen(true)} className="px-2.5 py-1.5 rounded-full bg-white text-black text-[11px] font-bold shrink-0">
          手順
        </button>
        <button onClick={dismiss} className="p-1 text-[#8e8e93]" aria-label="閉じる">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
