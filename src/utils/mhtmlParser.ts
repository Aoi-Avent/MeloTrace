/**
 * MHTML / HTML YouTube Watch History Parser & JSON Extractor
 * Converts Google Takeout HTML / MHTML single-file archives into standard watch-history.json format.
 */

export interface MhtmlExtractionResult {
  success: boolean;
  jsonContent: string;
  entries: any[];
  filename: string;
  totalExtracted: number;
  errorMessage?: string;
}

/**
 * Decodes Quoted-Printable encoded text (standard in MHTML files)
 */
function decodeQuotedPrintable(str: string): string {
  // Remove soft line breaks: '=\r\n' or '=\n'
  const cleaned = str.replace(/=(?:\r\n|\n|\r)/g, '');

  // Decode byte escapes like =E3=81=82 into UTF-8 characters
  return cleaned.replace(/(?:=[0-9A-Fa-f]{2})+/g, (match) => {
    try {
      const bytes: number[] = [];
      const parts = match.split('=');
      for (const p of parts) {
        if (p) {
          bytes.push(parseInt(p, 16));
        }
      }
      const uint8 = new Uint8Array(bytes);
      return new TextDecoder('utf-8').decode(uint8);
    } catch (e) {
      return match;
    }
  });
}

/**
 * Parses MHTML / HTML content and extracts YouTube watch history into standard JSON
 */
export function parseMhtmlToWatchHistory(content: string): MhtmlExtractionResult {
  if (!content || typeof content !== 'string') {
    return {
      success: false,
      jsonContent: '[]',
      entries: [],
      filename: '',
      totalExtracted: 0,
      errorMessage: 'ファイル内容が空です。',
    };
  }

  try {
    // 1. If MHTML, decode quoted-printable encoding
    let text = content;
    if (content.includes('Content-Type: multipart/related') || content.includes('quoted-printable')) {
      text = decodeQuotedPrintable(content);
    }

    const entries: any[] = [];
    const seenIds = new Set<string>();

    // 2. Pattern A: Google Takeout Content Cells
    // <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
    //   YouTube<br><a href="https://www.youtube.com/watch?v=XXX">Title</a><br><a href="...">Channel</a><br>Date
    // </div>
    const cellRegex = /<div class="content-cell[^"]*">([\s\S]*?)<\/div>/gi;
    let match: RegExpExecArray | null;

    while ((match = cellRegex.exec(text)) !== null) {
      const cellHtml = match[1];

      // Extract watch URL & Title
      const watchMatch = cellHtml.match(/href="https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})[^"]*">([^<]*)<\/a>/i);
      if (!watchMatch) continue;

      const videoId = watchMatch[1];
      let rawTitle = watchMatch[2].trim()
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // Extract channel name & url if present
      const channelMatch = cellHtml.match(/href="(https?:\/\/(?:www\.)?youtube\.com\/(?:channel\/|user\/|@)[^"]*)">([^<]*)<\/a>/i);
      const channelUrl = channelMatch ? channelMatch[1] : `https://www.youtube.com/watch?v=${videoId}`;
      const channelName = channelMatch
        ? channelMatch[2].trim().replace(/&amp;/g, '&').replace(/&#39;/g, "'")
        : '';

      // Extract date text from cell
      const dateTextMatch = cellHtml.match(/(?:<br\s*\/?>\s*)([A-Za-z0-9,:\s\/\-\.]+(?:JST|UTC|GMT|[A-Z]{3,4})?)\s*$/i) ||
                            cellHtml.match(/(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}[\s\d:]*)/i);
      let timeIso = new Date().toISOString();
      if (dateTextMatch) {
        const d = new Date(dateTextMatch[1].trim());
        if (!isNaN(d.getTime())) {
          timeIso = d.toISOString();
        }
      }

      entries.push({
        header: 'YouTube',
        title: rawTitle.endsWith('を視聴しました') ? rawTitle : `${rawTitle}を視聴しました`,
        titleUrl: `https://www.youtube.com/watch?v=${videoId}`,
        subtitles: channelName ? [{ name: channelName, url: channelUrl }] : [],
        time: timeIso,
        products: ['YouTube'],
      });
      seenIds.add(videoId);
    }

    // 3. Pattern B: Fallback regex on general watch links (e.g. saved YouTube web page)
    if (entries.length === 0) {
      const linkRegex = /href="(?:https?:\/\/(?:www\.)?youtube\.com)?\/watch\?v=([a-zA-Z0-9_-]{11})"[^>]*>([^<]*)<\/a>/gi;
      let linkMatch: RegExpExecArray | null;

      while ((linkMatch = linkRegex.exec(text)) !== null) {
        const videoId = linkMatch[1];
        const title = linkMatch[2].trim()
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'");

        if (title && !seenIds.has(videoId)) {
          seenIds.add(videoId);
          entries.push({
            header: 'YouTube',
            title: title.endsWith('を視聴しました') ? title : `${title}を視聴しました`,
            titleUrl: `https://www.youtube.com/watch?v=${videoId}`,
            subtitles: [],
            time: new Date().toISOString(),
            products: ['YouTube'],
          });
        }
      }
    }

    if (entries.length === 0) {
      return {
        success: false,
        jsonContent: '[]',
        entries: [],
        filename: '',
        totalExtracted: 0,
        errorMessage: 'YouTubeの視聴履歴データが検出されませんでした。Google TakeoutのHTMLまたはMHTMLファイルをお試しください。',
      };
    }

    // Format filename with current extraction date & time: YYYYMMDD_HHMM
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeStampStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const filename = `watch-history_extracted_${timeStampStr}.json`;

    const jsonContent = JSON.stringify(entries, null, 2);

    return {
      success: true,
      jsonContent,
      entries,
      filename,
      totalExtracted: entries.length,
    };
  } catch (err: any) {
    return {
      success: false,
      jsonContent: '[]',
      entries: [],
      filename: '',
      totalExtracted: 0,
      errorMessage: 'MHTML解析中にエラーが発生しました: ' + (err?.message || '不明なエラー'),
    };
  }
}
