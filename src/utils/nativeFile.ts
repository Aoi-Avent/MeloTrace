/**
 * ファイル保存の共通ユーティリティ。
 * - Web: <a download> でダウンロード
 * - iOSアプリ(Capacitor): WKWebViewでは <a download> が動かないため、
 *   一時ファイルに書き出して共有シート（ファイルに保存 / AirDrop など）を開く
 */
import { Capacitor } from '@capacitor/core';

export async function saveTextFile(
  filename: string,
  content: string,
  mime = 'application/json;charset=utf-8'
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const written = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: filename, url: written.uri });
    return;
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
