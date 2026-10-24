import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  FolderDown,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download,
  ExternalLink,
  HelpCircle,
  Sliders,
  Check,
  Plus
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { parseTakeoutJson, isLikelyMusic, classifyMusicGenre, extractArtist, cleanSongTitle, extractYouTubeId } from '../utils/parser';
import { MusicTrack, ActiveTab } from '../types/music';

interface DataImportViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const DataImportView: React.FC<DataImportViewProps> = ({ setActiveTab }) => {
  const {
    tracks,
    loadDemoData,
    importTracks,
    clearAllData,
    playMode,
    setPlayMode,
    addSingleTrackByUrl,
  } = usePlayer();

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demoLoadedSuccess, setDemoLoadedSuccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Single URL add state
  const [quickUrl, setQuickUrl] = useState('');
  const [quickAddSuccess, setQuickAddSuccess] = useState(false);

  // Load demo data handler
  const handleLoadDemo = () => {
    loadDemoData();
    setDemoLoadedSuccess(true);
    setTimeout(() => {
      setDemoLoadedSuccess(false);
      setActiveTab('home');
    }, 1200);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    setImportResult(null);
    setErrorMessage(null);

    try {
      const fileName = file.name.toLowerCase();
      const text = await file.text();

      let extractedTracks: MusicTrack[] = [];

      if (fileName.endsWith('.json')) {
        // Parse Google Takeout watch-history.json
        extractedTracks = parseTakeoutJson(text);
      } else {
        // Fallback or HTML / text parser
        // Look for youtube links in text
        const matches = text.matchAll(/watch\?v=([a-zA-Z0-9_-]{11})/g);
        const map = new Map<string, number>();
        for (const m of matches) {
          const id = m[1];
          map.set(id, (map.get(id) || 0) + 1);
        }

        extractedTracks = Array.from(map.entries()).map(([id, count]) => ({
          id,
          title: `YouTube Music (${id})`,
          artist: '取り込み動画',
          genre: 'J-POP',
          playCount: count,
          lastPlayed: new Date().toISOString().replace('T', ' ').slice(0, 16),
          firstPlayed: new Date().toISOString().replace('T', ' ').slice(0, 16),
          isFavorite: count >= 3,
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        }));
      }

      if (extractedTracks.length > 0) {
        importTracks(extractedTracks);
        setImportResult(`解析が完了しました！ ${extractedTracks.length}曲の音楽データを新しく追加しました。`);
      } else {
        setErrorMessage('音楽データの検出ができませんでした。ファイルの形式を確認してください（Google Takeoutの watch-history.json 等に対応しています）。');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('ファイルの読み込み中にエラーが発生しました: ' + (err?.message || '不明なエラー'));
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Quick single URL add
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;
    const ok = addSingleTrackByUrl(quickUrl.trim());
    if (ok) {
      setQuickAddSuccess(true);
      setQuickUrl('');
      setTimeout(() => setQuickAddSuccess(false), 1500);
    } else {
      alert('有効なYouTubeのURLを入力してください。');
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tracks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `melotrace_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="pb-36 pt-4 px-4 max-w-lg mx-auto">
      {/* Top Header */}
      <header className="mb-5">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <FolderDown className="w-5 h-5 text-rose-400" />
          <span>データの取り込み・管理</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          スマホだけで簡単！履歴ファイルの読み込みや体験用データの反映
        </p>
      </header>

      {/* SECTION 1: ONE-TAP DEMO DATA (体験してみる) */}
      <section className="mb-6 rounded-3xl bg-gradient-to-br from-rose-900/40 via-purple-900/30 to-slate-900/90 border border-rose-500/30 p-5 shadow-2xl relative overflow-hidden">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-widest">
            おすすめ · 準備ゼロ
          </span>
        </div>

        <h3 className="text-base font-bold text-white tracking-tight mb-1">
          今すぐ体験してみる（サンプル全データをロード）
        </h3>
        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          手元に履歴ファイルがなくても大丈夫！YOASOBI、米津玄師、Vaundy、Ado、King Gnuなどの代表曲とリアルな視聴データ（約120曲）を一瞬で読み込んで、すべての機能をお試しいただけます。
        </p>

        <button
          onClick={handleLoadDemo}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-600 hover:brightness-110 active:scale-98 text-white font-bold text-sm shadow-[0_4px_20px_rgba(255,45,120,0.4)] flex items-center justify-center gap-2 transition-all"
        >
          {demoLoadedSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>読み込みました！ホームへ移動します...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>ワンタップで体験データを読み込む</span>
            </>
          )}
        </button>
      </section>

      {/* SECTION 2: FILE UPLOAD */}
      <section className="mb-6 p-5 rounded-3xl glass-panel">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Upload className="w-4 h-4 text-violet-400" />
            <span>自分のYouTube履歴を取り込む</span>
          </h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>手順ガイド</span>
          </button>
        </div>

        {/* Step by step guide if toggled */}
        {showHelp && (
          <div className="mb-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 flex flex-col gap-2 leading-relaxed">
            <p className="font-bold text-rose-300">Googleから履歴をダウンロードする方法:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>スマホのブラウザで「Google データ エクスポート (Takeout)」を開く</li>
              <li>「YouTube と YouTube Music」のみを選択して次へ進む</li>
              <li>エクスポートされたZIP内の <code className="text-rose-300 font-mono">watch-history.json</code> を下のボタンで選択するだけ！</li>
            </ol>
            <a
              href="https://takeout.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold mt-1"
            >
              <span>Google Takeoutを開く</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Google Takeoutの <code className="text-slate-300">watch-history.json</code> やマイアクティビティのファイルをスマホから選択してください。自動で音楽動画だけを抽出・分類します。
        </p>

        {/* File input button */}
        <label className="block w-full">
          <input
            type="file"
            accept=".json,.html,.mhtml,.csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isLoadingFile}
          />
          <div className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-white/20 hover:border-rose-500/50 hover:bg-white/5 active:scale-98 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center">
            <FileText className="w-6 h-6 text-slate-400" />
            <span className="text-xs font-bold text-white">
              {isLoadingFile ? 'ファイルを解析中...' : 'ファイルを選択して取り込む'}
            </span>
            <span className="text-[10px] text-slate-500">
              タップしてスマホのファイル（.json / .html / .mhtml）を選ぶ
            </span>
          </div>
        </label>

        {/* Feedback message */}
        {importResult && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importResult}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </section>

      {/* SECTION 3: QUICK URL ADD */}
      <section className="mb-6 p-5 rounded-3xl glass-panel">
        <h3 className="text-sm font-bold text-white tracking-tight mb-2 flex items-center gap-2">
          <Plus className="w-4 h-4 text-rose-400" />
          <span>YouTubeのURLから1曲追加</span>
        </h3>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          お気に入りの曲のYouTubeリンクを貼るだけで、すぐにライブラリに追加できます。
        </p>

        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="https://youtu.be/... または watch?v=..."
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold shrink-0 transition-all flex items-center gap-1"
          >
            {quickAddSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>追加済</span>
              </>
            ) : (
              <span>追加</span>
            )}
          </button>
        </form>
      </section>

      {/* SECTION 4: SETTINGS & PLAYBACK MODE */}
      <section className="mb-6 p-5 rounded-3xl glass-panel">
        <h3 className="text-sm font-bold text-white tracking-tight mb-3 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-400" />
          <span>再生プレイヤー設定</span>
        </h3>

        <div className="flex flex-col gap-2">
          <label
            onClick={() => setPlayMode('youtube')}
            className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer border transition-all ${
              playMode === 'youtube'
                ? 'bg-rose-500/10 border-rose-500/40'
                : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
          >
            <input
              type="radio"
              name="playMode"
              checked={playMode === 'youtube'}
              onChange={() => setPlayMode('youtube')}
              className="mt-1 accent-rose-500"
            />
            <div>
              <p className="text-xs font-bold text-white">
                YouTube内蔵プレイヤー (推奨・確実再生)
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                YouTubeの公式埋め込みプレイヤーを使用します。100%確実にすべての楽曲を映像・高音質で再生できます。
              </p>
            </div>
          </label>

          <label
            onClick={() => setPlayMode('stream')}
            className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer border transition-all ${
              playMode === 'stream'
                ? 'bg-rose-500/10 border-rose-500/40'
                : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
          >
            <input
              type="radio"
              name="playMode"
              checked={playMode === 'stream'}
              onChange={() => setPlayMode('stream')}
              className="mt-1 accent-rose-500"
            />
            <div>
              <p className="text-xs font-bold text-white">
                バックグラウンド音声ストリーム (軽量・通信節約)
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                音声のみを取得して&lt;audio&gt;で再生します。画面ロック中も聴きやすく通信量を大幅に節約できます。
              </p>
            </div>
          </label>
        </div>
      </section>

      {/* SECTION 5: BACKUP & DATA RESET */}
      <section className="p-5 rounded-3xl glass-panel">
        <h3 className="text-sm font-bold text-white tracking-tight mb-3">
          データの保存とリセット
        </h3>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleExportJson}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:scale-98 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>ライブラリデータをJSONで保存する</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('本当にすべての音楽データをリセットしますか？この操作は取り消せません。')) {
                clearAllData();
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-98 text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-rose-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>全データをリセット（初期化）</span>
          </button>
        </div>
      </section>
    </div>
  );
};
