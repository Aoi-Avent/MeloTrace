import { getPref, setPref } from './uiPrefs';

export const PREF_UI = 'melotrace_ui_v1'; // 'classic' | 'next'
export const PREF_ANIM = 'melotrace_anim_v1'; // 'on' | 'off'
export const PREF_STATUSBAR = 'melotrace_statusbar_top_v1'; // 'on' | 'off'

const FONT_LINK_ID = 'mt-next-fonts';

/** 「開発中のUI」のときだけ、やさしい丸ゴシックとLCD風フォントを読み込む（以前のUIの動作・速度には影響しない） */
function ensureNextFonts() {
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900&family=DotGothic16&display=swap';
  document.head.appendChild(link);
}

export function applyUiPrefs() {
  const root = document.documentElement;
  const ui = getPref(PREF_UI, 'classic');
  root.setAttribute('data-ui', ui === 'next' ? 'next' : 'classic');
  root.setAttribute('data-anim', getPref(PREF_ANIM, 'on') === 'off' ? 'off' : 'on');
  if (ui === 'next') ensureNextFonts();
}

export function setUiPref(key: string, value: string) {
  setPref(key, value);
  applyUiPrefs();
}
