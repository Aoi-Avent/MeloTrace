import React from 'react';
import { Check, Palette } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { THEMES, THEME_GROUP_LABELS, ThemeGroup } from '../utils/theme';

const GROUPS: ThemeGroup[] = ['accent', 'mono', 'metal', 'gradient', 'light'];

export const ThemePicker: React.FC = () => {
  const { themeId, setThemeId } = usePlayer();
  return (
    <div className="mb-5 p-4 rounded-2xl apple-card">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-bold text-fg">テーマ</h3>
      </div>
      <div className="flex flex-col gap-4">
        {GROUPS.map((g) => (
          <div key={g}>
            <p className="text-[11px] font-semibold text-muted mb-2">{THEME_GROUP_LABELS[g]}</p>
            <div className="grid grid-cols-4 gap-x-2 gap-y-3">
              {THEMES.filter((t) => t.group === g).map((t) => {
                const active = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setThemeId(t.id)}
                    className="flex flex-col items-center gap-1.5 active:scale-95 transition"
                    aria-label={t.name}
                    aria-pressed={active}
                  >
                    {/* 背景色とアクセント色のプレビュー */}
                    <span
                      className={`relative w-14 h-14 rounded-2xl overflow-hidden flex items-end justify-end p-1.5 border-2 ${active ? 'border-accent' : 'border-fg/15'}`}
                      style={{ background: t.appBg }}
                    >
                      <span className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center" style={{ background: t.accentGrad && t.accentGrad !== 'none' ? t.accentGrad : t.accent }}>
                        {active && <Check className="w-3.5 h-3.5" strokeWidth={3} style={{ color: t.onAccent }} />}
                      </span>
                    </span>
                    <span className={`text-[10px] leading-tight text-center ${active ? 'text-fg font-semibold' : 'text-muted'}`}>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
