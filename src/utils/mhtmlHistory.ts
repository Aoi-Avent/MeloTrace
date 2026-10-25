/**
 * Google「マイアクティビティ」を保存した .mhtml から、
 * Google Takeout 互換の watch-history.json を作るためのユーティリティ。
 *
 * - mhtml は数百MBになることがあるため、ファイル全体を読み込まず、
 *   MIMEパートを探して「マイアクティビティ本体のHTMLパート」だけを取り出す。
 * - 本体HTMLは正規表現で1件ずつ解析する（DOMParserは使わない＝巨大HTMLでも軽い）。
 * - 複数ファイルの期間が重なっていても、重複は自動で取り除く。
 *
 * すべてブラウザ内で完結し、外部へ送信しません。
 */

export interface WatchHistoryItem {
  header: string;
  title: string;
  titleUrl: string;
  subtitles?: { name: string; url: string }[];
  time: string; // ISO8601 (UTC)
  products: string[];
  activityControls: string[];
}

export interface ParsedEntry extends WatchHistoryItem {
  /** 重複排除用キー（動画ID|時刻|同一分内の出現順） */
  _key: string;
}

export interface MhtmlParseResult {
  entries: ParsedEntry[];
  /** 動画以外（検索・広告アクセスなど）で除外した件数 */
  skipped: number;
}

/* ------------------------------------------------------------------ */
/* バイト列ユーティリティ                                              */
/* ------------------------------------------------------------------ */

const CHUNK = 8 * 1024 * 1024;

function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/** Blob内で needle を from 以降から探し、見つかった絶対位置（なければ -1）を返す */
async function findBytes(blob: Blob, needle: Uint8Array, from: number): Promise<number> {
  const n = needle.length;
  let pos = from;
  while (pos < blob.size) {
    const end = Math.min(blob.size, pos + CHUNK + n - 1);
    const buf = new Uint8Array(await blob.slice(pos, end).arrayBuffer());
    let i = 0;
    while (true) {
      i = buf.indexOf(needle[0], i);
      if (i < 0 || i + n > buf.length) break;
      let ok = true;
      for (let k = 1; k < n; k++) {
        if (buf[i + k] !== needle[k]) {
          ok = false;
          break;
        }
      }
      if (ok) return pos + i;
      i++;
    }
    if (end >= blob.size) break;
    pos += CHUNK;
  }
  return -1;
}

function hexVal(c: number | undefined): number {
  if (c === undefined) return -1;
  if (c >= 0x30 && c <= 0x39) return c - 0x30; // 0-9
  if (c >= 0x41 && c <= 0x46) return c - 0x41 + 10; // A-F
  if (c >= 0x61 && c <= 0x66) return c - 0x61 + 10; // a-f
  return -1;
}

export function decodeQuotedPrintable(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  let o = 0;
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c === 0x3d) {
      const n1 = bytes[i + 1];
      if (n1 === 0x0d && bytes[i + 2] === 0x0a) {
        i += 2; // ソフト改行 "=\r\n"
        continue;
      }
      if (n1 === 0x0a) {
        i += 1; // ソフト改行 "=\n"
        continue;
      }
      const h = hexVal(n1);
      const l = hexVal(bytes[i + 2]);
      if (h >= 0 && l >= 0) {
        out[o++] = h * 16 + l;
        i += 2;
        continue;
      }
    }
    out[o++] = c;
  }
  return out.subarray(0, o);
}

function decodeBase64Bytes(bytes: Uint8Array): Uint8Array {
  // 空白・改行を除去してから、4文字単位でatobする
  const clean = new Uint8Array(bytes.length);
  let n = 0;
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c !== 0x0d && c !== 0x0a && c !== 0x20 && c !== 0x09) clean[n++] = c;
  }
  const out = new Uint8Array(Math.floor((n * 3) / 4) + 3);
  let o = 0;
  const step = 4 * 16384;
  for (let s = 0; s < n; s += step) {
    const e = Math.min(n, s + step);
    let str = '';
    for (let i = s; i < e; i += 8192) {
      str += String.fromCharCode(...clean.subarray(i, Math.min(e, i + 8192)));
    }
    const bin = atob(str);
    for (let i = 0; i < bin.length; i++) out[o++] = bin.charCodeAt(i);
  }
  return out.subarray(0, o);
}

/* ------------------------------------------------------------------ */
/* MIME                                                                */
/* ------------------------------------------------------------------ */

interface PartHeaders {
  contentType: string;
  charset: string;
  encoding: string;
  location: string;
}

function parseHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = text.split(/\r?\n/);
  let cur = '';
  const flush = () => {
    const idx = cur.indexOf(':');
    if (idx > 0) headers[cur.slice(0, idx).trim().toLowerCase()] = cur.slice(idx + 1).trim();
    cur = '';
  };
  for (const line of lines) {
    if (/^[ \t]/.test(line)) cur += ' ' + line.trim();
    else {
      if (cur) flush();
      cur = line;
    }
  }
  if (cur) flush();
  return headers;
}

function toPartHeaders(h: Record<string, string>): PartHeaders {
  const ct = h['content-type'] || '';
  const charset = /charset="?([^";\s]+)"?/i.exec(ct)?.[1] || 'utf-8';
  return {
    contentType: ct.split(';')[0].trim().toLowerCase(),
    charset,
    encoding: (h['content-transfer-encoding'] || '7bit').toLowerCase(),
    location: h['content-location'] || '',
  };
}

function bytesToText(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/**
 * mhtml から「マイアクティビティ本体のHTML」を取り出す。
 * 本体はふつう最初のパートなので、見つかった時点で読み込みを打ち切る。
 */
export async function extractMyActivityHtml(file: Blob): Promise<string> {
  const head = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
  const headText = new TextDecoder('latin1').decode(head);
  const bm = /boundary="?([^"\r\n;]+)"?/i.exec(headText);
  if (!bm) throw new Error('mhtmlの形式として読み取れませんでした（boundaryが見つかりません）。');

  const boundary = '--' + bm[1];
  const delim = asciiBytes(boundary);
  const nlDelim = asciiBytes('\n' + boundary);

  // 最初の区切り位置
  let delimPos = await findBytes(file, delim, 0);
  if (delimPos < 0) throw new Error('mhtmlの区切りが見つかりませんでした。');

  while (delimPos >= 0) {
    // 区切り行の終わりまで進める
    const afterDelim = delimPos + delim.length;
    const lineProbe = new TextDecoder('latin1').decode(
      new Uint8Array(await file.slice(afterDelim, afterDelim + 2).arrayBuffer())
    );
    if (lineProbe.startsWith('--')) break; // 終端

    // パートヘッダーを読む
    const hdrBuf = new Uint8Array(await file.slice(afterDelim, afterDelim + 65536).arrayBuffer());
    const hdrText = new TextDecoder('latin1').decode(hdrBuf);
    const sep = /\r?\n\r?\n/.exec(hdrText);
    if (!sep) break;
    const bodyStart = afterDelim + sep.index + sep[0].length;
    const partHeaders = toPartHeaders(parseHeaders(hdrText.slice(0, sep.index)));

    // このパートの終わり（次の区切り）
    const nextNl = await findBytes(file, nlDelim, bodyStart);
    const bodyEnd = nextNl < 0 ? file.size : nextNl;
    const hasCr = nextNl >= 0 && bodyEnd > bodyStart && (await endsWithCr(file, bodyEnd));
    const bodyEndTrim = hasCr ? bodyEnd - 1 : bodyEnd;

    const isTarget =
      partHeaders.contentType === 'text/html' &&
      /^https:\/\/myactivity\.google\.com\//i.test(partHeaders.location);

    if (isTarget) {
      const raw = new Uint8Array(await file.slice(bodyStart, bodyEndTrim).arrayBuffer());
      let decoded: Uint8Array;
      if (partHeaders.encoding === 'quoted-printable') decoded = decodeQuotedPrintable(raw);
      else if (partHeaders.encoding === 'base64') decoded = decodeBase64Bytes(raw);
      else decoded = raw;
      return bytesToText(decoded, partHeaders.charset);
    }

    if (nextNl < 0) break;
    delimPos = nextNl + 1; // '\n' の次が区切り文字列の先頭
  }

  throw new Error(
    'マイアクティビティのページが見つかりませんでした。myactivity.google.com のYouTube視聴履歴ページを「ページを保存（mhtml）」したファイルを選んでください。'
  );
}

async function endsWithCr(file: Blob, pos: number): Promise<boolean> {
  if (pos <= 0) return false;
  const b = new Uint8Array(await file.slice(pos - 1, pos).arrayBuffer());
  return b[0] === 0x0d;
}

/* ------------------------------------------------------------------ */
/* HTML 解析                                                           */
/* ------------------------------------------------------------------ */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, g: string) => {
    if (g[0] === '#') {
      const code = g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return m;
      }
    }
    return ENTITIES[g] ?? m;
  });
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, ''));
}

const VIDEO_URL_RE =
  /^https?:\/\/(?:www\.|music\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^"#]*&)?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

const MAX_SEGMENT = 20000;

/** マイアクティビティ本体HTMLから、動画視聴の履歴を取り出す */
export function parseMyActivityHtml(html: string): MhtmlParseResult {
  const marks: { idx: number; date: string }[] = [];
  const dateRe = /data-date="(\d{8})"/g;
  let dm: RegExpExecArray | null;
  while ((dm = dateRe.exec(html)) !== null) marks.push({ idx: dm.index, date: dm[1] });

  const entries: ParsedEntry[] = [];
  const seenInFile = new Map<string, number>();
  let skipped = 0;

  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].idx;
    const end = Math.min(i + 1 < marks.length ? marks[i + 1].idx : html.length, start + MAX_SEGMENT);
    const seg = html.slice(start, end);

    // 動画リンク（テキストを持つ最初の <a>）
    let videoId = '';
    let titleText = '';
    let prefix = '';
    let suffix = '';
    const anchorRe = /<a\b[^>]*?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let am: RegExpExecArray | null;
    let channelName = '';
    let channelUrl = '';
    while ((am = anchorRe.exec(seg)) !== null) {
      const href = decodeEntities(am[1]);
      const text = stripTags(am[2]).trim();
      if (!videoId) {
        const vm = VIDEO_URL_RE.exec(href);
        if (vm && text) {
          videoId = vm[1];
          titleText = text;
          // リンク直前・直後の文字（「を視聴しました」「Watched」など）
          const before = seg.slice(Math.max(0, am.index - 120), am.index);
          const bm = /([^<>]*)$/.exec(before);
          prefix = bm ? decodeEntities(bm[1]).trim() : '';
          const after = seg.slice(am.index + am[0].length, am.index + am[0].length + 120);
          const sm = /^([^<>]*)/.exec(after);
          suffix = sm ? decodeEntities(sm[1]).trim() : '';
          continue;
        }
      }
      if (videoId && !channelUrl) {
        const cm = /^https?:\/\/(?:www\.)?youtube\.com\/(?:channel\/|@|c\/|user\/)/.exec(href);
        if (cm && text) {
          channelName = text;
          channelUrl = href;
        }
      }
      if (videoId && channelUrl) break;
    }

    if (!videoId) {
      // 日付だけの見出し要素は数えず、時刻つきの項目（検索・広告アクセスなど）だけを「除外」として数える
      if (/\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?\s*(?:•|·|&bull;|&#8226;|&middot;)/.test(seg)) skipped++;
      continue;
    }

    // 時刻
    const tm = /(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?\s*(?:•|·|&bull;|&#8226;|&middot;)/.exec(seg);
    const y = +marks[i].date.slice(0, 4);
    const mo = +marks[i].date.slice(4, 6);
    const d = +marks[i].date.slice(6, 8);
    let hh = 0;
    let mm = 0;
    if (tm) {
      hh = +tm[1];
      mm = +tm[2];
      if (tm[3]) {
        const pm = tm[3].toLowerCase() === 'pm';
        if (pm && hh < 12) hh += 12;
        if (!pm && hh === 12) hh = 0;
      }
    }
    const time = new Date(y, mo - 1, d, hh, mm, 0, 0).toISOString();

    // プロダクト名（YouTube / YouTube Music）
    const pm2 = /class="[^"]*\bhJ7x8b\b[^"]*"[^>]*>([^<]*)</.exec(seg);
    const product = pm2 && /youtube music/i.test(pm2[1]) ? 'YouTube Music' : 'YouTube';

    // Takeout形式のタイトル： 「タイトル」+「を視聴しました」 / 「Watched 」+「タイトル」
    const title = prefix ? `${prefix} ${titleText}${suffix ? ' ' + suffix : ''}` : `${titleText}${suffix}`;

    const k0 = `${videoId}|${time}`;
    const n = (seenInFile.get(k0) || 0) + 1;
    seenInFile.set(k0, n);

    const item: ParsedEntry = {
      header: product,
      title,
      titleUrl: `https://www.youtube.com/watch?v=${videoId}`,
      time,
      products: [product],
      activityControls: ['YouTube watch history'],
      _key: `${k0}|${n}`,
    };
    if (channelName && channelUrl) item.subtitles = [{ name: channelName, url: channelUrl }];
    entries.push(item);
  }

  return { entries, skipped };
}

/* ------------------------------------------------------------------ */
/* 複数ファイルの統合                                                  */
/* ------------------------------------------------------------------ */

export interface MergeSummary {
  total: number;
  duplicatesRemoved: number;
  skipped: number;
  from: string | null;
  to: string | null;
  perFile: { name: string; count: number; skipped: number; error?: string }[];
}

export class HistoryMerger {
  private map = new Map<string, ParsedEntry>();
  private dupes = 0;
  private skipped = 0;
  readonly perFile: MergeSummary['perFile'] = [];

  add(name: string, result: { entries: ParsedEntry[]; skipped: number }) {
    for (const e of result.entries) {
      if (this.map.has(e._key)) this.dupes++;
      else this.map.set(e._key, e);
    }
    this.skipped += result.skipped;
    this.perFile.push({ name, count: result.entries.length, skipped: result.skipped });
  }

  addError(name: string, message: string) {
    this.perFile.push({ name, count: 0, skipped: 0, error: message });
  }

  /** 新しい順（Takeoutと同じ並び）の配列 */
  toItems(): WatchHistoryItem[] {
    const arr = Array.from(this.map.values());
    // 同時刻は元の並びを保つため、安定ソート（時刻の降順）
    arr.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
    return arr.map(({ _key, ...rest }) => rest);
  }

  summary(): MergeSummary {
    const items = this.toItems();
    return {
      total: items.length,
      duplicatesRemoved: this.dupes,
      skipped: this.skipped,
      from: items.length ? items[items.length - 1].time : null,
      to: items.length ? items[0].time : null,
      perFile: this.perFile,
    };
  }
}

export function downloadTextFile(filename: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** 複数のmhtmlを順に読み込み、重複を除いた watch-history 形式の配列にまとめる */
export async function convertMhtmlFiles(
  files: File[],
  onProgress?: (message: string) => void
): Promise<{ items: WatchHistoryItem[]; summary: MergeSummary }> {
  const merger = new HistoryMerger();
  const tick = () => new Promise<void>((r) => setTimeout(r, 0));

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const label = `(${i + 1}/${files.length}) ${f.name}`;
    try {
      onProgress?.(`${label} を読み込み中…`);
      await tick();
      const html = await extractMyActivityHtml(f);
      onProgress?.(`${label} を解析中…`);
      await tick();
      merger.add(f.name, parseMyActivityHtml(html));
    } catch (err: any) {
      merger.addError(f.name, err?.message || '不明なエラー');
    }
  }

  return { items: merger.toItems(), summary: merger.summary() };
}
