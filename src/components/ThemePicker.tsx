import React from 'react';
import { Check, Palette } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { THEMES } from '../utils/theme';

export const ThemePicker: React.FC = () => {
  const { themeId, setThemeId } = usePlayer();
  return (
    <div className="mb-5 p-4 rounded-2xl apple-card border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-bold text-white">テーマカラー</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {THEMES.map((t) => {
          const active = t.id === themeId;
          return (
            <button
              key={t.id}
              onClick={() => setThemeId(t.id)}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition"
              aria-label={t.name}
              aria-pressed={active}
            >
              <span
                className={`w-11 h-11 rounded-full flex items-center justify-center border-2 ${active ? 'border-white' : 'border-transparent'}`}
                style={{ background: t.accent }}
              >
                {active && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
              </span>
              <span className={`text-[10px] ${active ? 'text-white font-semibold' : 'text-[#8e8e93]'}`}>{t.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
