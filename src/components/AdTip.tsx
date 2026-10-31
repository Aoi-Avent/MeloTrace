import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { getPref, setPref } from '../utils/uiPrefs';

const SHOWN_KEY = 'melotrace_adtip_v1';

/** 初めて広告が流れたときだけ、小さく一度だけヒントを出す */
export const AdTip: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { isAdPlaying, currentTrack } = usePlayer();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isAdPlaying && getPref(SHOWN_KEY, '') !== '1') {
      setPref(SHOWN_KEY, '1');
      setShow(true);
    }
  }, [isAdPlaying]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 9000);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;
  return (
    <div className={`fixed left-0 right-0 z-[64] px-3 ${currentTrack ? 'bottom-[calc(8.4rem+max(env(safe-area-inset-bottom,0px),8px)+var(--bottom-gap,0px))]' : 'bottom-[calc(4.4rem+max(env(safe-area-inset-bottom,0px),8px)+var(--bottom-gap,0px))]'}`}>
      <div className="max-w-lg mx-auto flex items-center gap-2 rounded-2xl bg-surface-2 border border-fg/10 px-3 py-2 shadow-2xl">
        <p className="flex-1 text-[11px] text-fg leading-snug">広告が気になる場合は、ブラウザの広告ブロックを使う方法があります。</p>
        <button
          onClick={() => {
            setShow(false);
            setPref('melotrace_focus_ext_v1', '1');
            onOpen();
          }}
          className="px-3 py-1.5 rounded-full bg-accent text-on-accent text-[11px] font-bold shrink-0"
        >
          見てみる
        </button>
        <button onClick={() => setShow(false)} className="p-1 text-muted" aria-label="閉じる">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
