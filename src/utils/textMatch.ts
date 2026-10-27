/** 名前・曲名の照合用ユーティリティ */

export function normalizeName(s: string): string {
  return (s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s*[-–—]\s*topic$/i, '')
    .replace(/\s*(official|公式)(\s*(channel|チャンネル|youtube\s*channel))?$/i, '')
    .replace(/\s*\(cover\)\s*$/i, '')
    .replace(/[\s\-_・･.,、。'’"“”()（）【】\[\]「」『』!！?？:：;；/／\\|~〜～*＊&＆+＋]/g, '');
}

/** 「A feat. B」「A × B」「A, B」のような複数名表記を個別の名前に分ける */
export function splitArtistNames(name: string): string[] {
  const parts = name
    .replace(/\s*\(cover\)\s*$/i, '')
    .split(/\s*(?:feat\.?|ft\.?|featuring|×|x\s|&|＆|、|,|\/|／|\bwith\b|\bvs\.?\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set([name, ...parts]));
}

/** 曲名の類似度 (0〜1)。完全一致=1、包含=0.9、それ以外は文字2-gramの重なり */
export function titleSimilarity(a: string, b: string): number {
  const x = normalizeName(a.replace(/[（(\[【].*?[）)\]】]/g, ''));
  const y = normalizeName(b.replace(/[（(\[【].*?[）)\]】]/g, ''));
  if (!x || !y) return 0;
  if (x === y) return 1;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length >= 3 && long.includes(short)) return 0.9;
  const grams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const gx = grams(x);
  const gy = grams(y);
  if (gx.size === 0 || gy.size === 0) return 0;
  let inter = 0;
  gx.forEach((g) => {
    if (gy.has(g)) inter += 1;
  });
  return inter / Math.max(gx.size, gy.size);
}
