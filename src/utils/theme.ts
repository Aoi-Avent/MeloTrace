export interface ThemeDef {
  id: string;
  name: string;
  accent: string;
  hover: string;
}

export const THEMES: ThemeDef[] = [
  { id: 'blue', name: 'ブルー', accent: '#0a84ff', hover: '#409cff' },
  { id: 'teal', name: 'ティール', accent: '#30b0c7', hover: '#5ac8d8' },
  { id: 'green', name: 'グリーン', accent: '#30d158', hover: '#5ee07a' },
  { id: 'purple', name: 'パープル', accent: '#af52de', hover: '#c27ae8' },
  { id: 'pink', name: 'ピンク', accent: '#ff2d95', hover: '#ff5cae' },
  { id: 'red', name: 'レッド', accent: '#fa2d48', hover: '#ff3b56' },
  { id: 'orange', name: 'オレンジ', accent: '#ff9f0a', hover: '#ffb340' },
];

export const DEFAULT_THEME_ID = 'blue';
export const THEME_STORAGE_KEY = 'melotrace_theme_v1';

export function getTheme(id: string | null | undefined): ThemeDef {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function getSavedThemeId(): string {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v && THEMES.some((t) => t.id === v)) return v;
  } catch (e) {}
  return DEFAULT_THEME_ID;
}

export function applyTheme(id: string) {
  const t = getTheme(id);
  const root = document.documentElement;
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--accent-hover', t.hover);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#000000');
}
