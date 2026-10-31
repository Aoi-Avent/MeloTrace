import React, { useRef, useState } from 'react';

/* ===== Apple Music 風の部品（再生バー・音量バー・再生ボタンの形） ===== */

interface AppleSliderProps {
  /** 0〜1 */
  value: number;
  /** つまみを動かしている間の値（0〜1） */
  onScrub?: (v: number) => void;
  /** 指を離したときの値（0〜1） */
  onCommit: (v: number) => void;
  ariaLabel: string;
  disabled?: boolean;
}

/**
 * Apple Music の再生バー。細い角丸のバーで、つまみは無い。
 * 触ると少し太くなり、白く明るくなる。左から右へ白（半透明）で塗られる。
 */
export const AppleSlider: React.FC<AppleSliderProps> = ({ value, onScrub, onCommit, ariaLabel, disabled }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);

  const calc = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  const shown = Math.min(1, Math.max(0, drag ?? value));
  const active = drag !== null;

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      aria-disabled={disabled}
      className={`relative h-8 flex items-center select-none ${disabled ? 'opacity-40' : 'cursor-pointer'}`}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const v = calc(e.clientX);
        setDrag(v);
        onScrub?.(v);
      }}
      onPointerMove={(e) => {
        if (drag === null) return;
        const v = calc(e.clientX);
        setDrag(v);
        onScrub?.(v);
      }}
      onPointerUp={(e) => {
        if (drag === null) return;
        const v = calc(e.clientX);
        setDrag(null);
        onCommit(v);
      }}
      onPointerCancel={() => setDrag(null)}
    >
      <div
        className="w-full rounded-full overflow-hidden"
        style={{
          height: active ? 12 : 7,
          background: 'rgba(255,255,255,0.2)',
          transition: 'height 0.15s ease-out',
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${shown * 100}%`,
            background: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)',
          }}
        />
      </div>
    </div>
  );
};

/* ===== 再生コントロールの形（SF Symbols に近い塗りつぶし形） ===== */

interface GlyphProps {
  className?: string;
}

export const PauseGlyph: React.FC<GlyphProps> = ({ className }) => (
  <svg viewBox="0 0 30 40" className={className} fill="currentColor" aria-hidden="true">
    <rect x="0" y="0" width="12" height="40" rx="3.5" />
    <rect x="18" y="0" width="12" height="40" rx="3.5" />
  </svg>
);

export const PlayGlyph: React.FC<GlyphProps> = ({ className }) => (
  <svg viewBox="0 0 34 40" className={className} fill="currentColor" aria-hidden="true">
    <path
      d="M5 4.5 L29 20 L5 35.5 Z"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinejoin="round"
    />
  </svg>
);

/** 前の曲（二重の左向き三角） */
export const BackwardGlyph: React.FC<GlyphProps> = ({ className }) => (
  <svg viewBox="0 0 44 26" className={className} fill="currentColor" aria-hidden="true">
    <path d="M3.5 13 L20 3.5 L20 22.5 Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M24 13 L40.5 3.5 L40.5 22.5 Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
  </svg>
);

/** 次の曲（二重の右向き三角） */
export const ForwardGlyph: React.FC<GlyphProps> = ({ className }) => (
  <svg viewBox="0 0 44 26" className={className} fill="currentColor" aria-hidden="true">
    <path d="M40.5 13 L24 3.5 L24 22.5 Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M20 13 L3.5 3.5 L3.5 22.5 Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
  </svg>
);

export const EllipsisGlyph: React.FC<GlyphProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <circle cx="4.5" cy="12" r="2.2" />
    <circle cx="12" cy="12" r="2.2" />
    <circle cx="19.5" cy="12" r="2.2" />
  </svg>
);
