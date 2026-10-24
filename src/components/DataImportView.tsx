import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  ArrowDownToLine,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download,
  ExternalLink,
  HelpCircle,
  Check,
  Plus,
  ShieldCheck,
  Ban,
  Filter,
  Volume2,
  ShieldAlert,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { parseTakeoutJson } from '../utils/parser';
import { MusicTrack, ActiveTab } from '../types/music';

interface DataImportViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const DataImportView: React.FC<DataImportViewProps> = ({ setActiveTab }) => {
  const {
    tracks,
    activeTracks,
    isDemoMode,
    bannedArtists,
    bannedTracks,
    strictnessMode,
    setStrictnessMode,
    unbanArtist,
    unbanTrack,
    clearAllBans,
    loadDemoData,
    importTracks,
    clearAllData,
    addSingleTrackByUrl,
  } = usePlayer();

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demoLoadedSuccess, setDemoLoadedSuccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showBannedModal, setShowBannedModal] = useState(false);

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
    }, 1000);
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
        // Parse Google Takeout watch-history.json with current strictness
        extractedTracks = parseTakeoutJson(text, strictnessMode);
      } else {
        // Fallback: look for youtube links in text/html
        const matches = text.matchAll(/watch\?v=([a-zA-Z0-9_-]{11})/g);
        const map = new Map<string, number>();
        for (const m of matches) {
          const id = m[1];
          map.set(id, (map.get(id) || 0) + 1);
        }

        extractedTracks = Array.from(map.entries()).map(([id, count]) => ({
          id,
          title: `YouTube Track (${id})`,
          artist: '取り込み楽曲',
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
        setImportResult(
          `インポート成功！切り抜きや非音楽動画を高精度にフィルタリングし、${extractedTracks.length}曲 の純粋な音楽・ボカロ・カバー楽曲をライブラリに反映しました。`
        );
      } else {
        setErrorMessage(
          '音楽データが検出されませんでした。Google Takeoutの watch-history.json ファイルをお選びください。'
        );
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
      setTimeout(() => setQuickAddSuccess(false), 1200);
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
    <div className="ios-scroll-container pb-36 pt-2 px-4 max-w-lg mx-auto">
      {/* Top Header */}
      <header className="pt-2 pb-1 mb-4">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          取込 & フィルター管理
        </h1>
        <p className="text-xs text-[#8e8e93] mt-0.5">
          高精度な音楽判定・除外（Ban）設定・広告抑制・データ管理
        </p>
      </header>

      {/* Current Data & Ban Status Bar */}
      <div className="mb-5 p-3.5 rounded-xl apple-card border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#30d158]" />
          <div>
            <p className="text-xs font-bold text-white">
              {isDemoMode ? 'サンプル体験モード中' : 'マイデータ運用中'}
            </p>
            <p className="text-[11px] text-[#8e8e93]">
              有効楽曲: {activeTracks.length}曲
              {bannedArtists.length + bannedTracks.length > 0 &&
                ` (除外: ${bannedArtists.length + bannedTracks.length}件)`}
            </p>
          </div>
        </div>

        {bannedArtists.length + bannedTracks.length > 0 && (
          <button
            onClick={() => setShowBannedModal(true)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#fa2d48]/20 text-[#fa2d48] hover:bg-[#fa2d48]/30 transition-colors"
          >
            Banリスト管理
          </button>
        )}
      </div>

      {/* SECTION 1: HIGH-PRECISION MUSIC FILTER STRICTNESS */}
      <section className="mb-6 p-5 rounded-2xl apple-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#fa2d48]" />
            <span>音楽判定の厳格度（切り抜き・雑談の徹底除外）</span>
          </h3>
        </div>
        <p className="text-xs text-[#8e8e93] mb-3 leading-relaxed">
          YouTube履歴から「切り抜き」「まとめ」「雑談」「ゲーム実況」「配信アーカイブ」など不快な動画をどれくらい厳しく除外するかを設定できます。
        </p>

        <div className="grid grid-cols-3 gap-2">
          {[
            {
              id: 'strict',
              title: '厳格モード',
              desc: '公式MV・音源のみ (切り抜き徹底排除)',
            },
            {
              id: 'standard',
              title: '標準モード',
              desc: 'MV・ボカロ・歌ってみた・Cover',
            },
            {
              id: 'all',
              title: '全件モード',
              desc: '全履歴をそのまま保持',
            },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setStrictnessMode(mode.id as any)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                strictnessMode === mode.id
                  ? 'border-[#fa2d48] bg-[#fa2d48]/15 text-white'
                  : 'border-white/5 bg-white/[0.03] text-[#8e8e93] hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{mode.title}</span>
                {strictnessMode === mode.id && (
                  <Check className="w-3.5 h-3.5 text-[#fa2d48]" />
                )}
              </div>
              <p className="text-[10px] opacity-75 line-clamp-2 leading-tight">
                {mode.desc}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 2: AD SUPPRESSION ARCHITECTURE */}
      <section className="mb-6 p-5 rounded-2xl apple-card">
        <h3 className="text-sm font-bold text-white tracking-tight mb-2 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#30d158]" />
          <span>広告ブロック & 広告なし再生の仕組み</span>
        </h3>
        <p className="text-xs text-[#8e8e93] mb-3 leading-relaxed">
          アドオンが入っていないiPhoneのSafariやスマホ環境でも広告を最小化するよう特別設計されています。
        </p>

        <div className="flex flex-col gap-2 text-xs text-[#d1d1d6]">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="font-bold text-white block mb-0.5">1. YouTube NoCookie (プライバシー保護モード)</span>
            <span className="text-[11px] text-[#8e8e93]">
              ターゲティング広告トラッカーを遮断する専用ホスト経由でプレイヤーを初期化し、割り込み広告の頻度を劇的に引き下げています。
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="font-bold text-white block mb-0.5">2. バックグラウンドキュー＆シームレス自動送り</span>
            <span className="text-[11px] text-[#8e8e93]">
              プレイヤー枠を破棄せず1インスタンスで動画IDのみを高速切替するため、連続再生時の広告読み込みを大幅に抑制しています。
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 3: GOOGLE TAKEOUT JSON IMPORT */}
      {/* SECTION 2: JSON BACKUP & RESTORE */}
      <section className="mb-6 p-5 rounded-2xl apple-card border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-[#fa2d48]" />
            <span>ライブラリの書き出しと読み込み (JSON)</span>
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[#d1d1d6] font-semibold">
            JSON
          </span>
        </div>
        <p className="text-xs text-[#8e8e93] mb-4 leading-relaxed">
          現在のライブラリデータをJSON形式で書き出したり、バックアップファイルから楽曲リストを読み込んで復元できます。
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleExportJson}
            className="py-3 px-3 rounded-xl bg-[#fa2d48] hover:bg-[#ff3b56] text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-[#fa2d48]/20"
          >
            <Download className="w-4 h-4" />
            <span>ライブラリを書き出す</span>
          </button>

          <label className="py-3 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer text-center">
            <Upload className="w-4 h-4 text-[#30d158]" />
            <span>JSONファイルを読み込む</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </section>

      {/* SECTION 3: 2-STEP GOOGLE TAKEOUT ONBOARDING */}
      <section className="mb-6 p-5 rounded-2xl apple-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#fa2d48]" />
            <span>Google Takeout（自分のYouTube全履歴を取り込む）</span>
          </h3>
        </div>

        <p className="text-xs text-[#8e8e93] mb-3 leading-relaxed">
          YouTube公式からエクスポートした <code className="text-[#d1d1d6]">watch-history.json</code> を読み込み、切り抜きや雑談を排除してあなた専用のApple Musicを作ります。
        </p>

        {/* 2-Step Frictionless Guide Card */}
        <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 mb-4 flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[#fa2d48] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-white">YouTube専用の直行リンクを開く</p>
              <p className="text-[11px] text-[#8e8e93] mt-0.5">
                あらかじめ「YouTube」のみが選択された状態で開くため迷いません。
              </p>
              <a
                href="https://takeout.google.com/settings/takeout/custom/youtube"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#fa2d48] font-bold mt-1.5 hover:underline"
              >
                <span>Google Takeout（YouTube専用）を開く</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="border-t border-white/5 pt-2 flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-white/20 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-white">ZIP内の watch-history.json を選択</p>
              <p className="text-[11px] text-[#8e8e93] mt-0.5">
                ダウンロードされたZIPを展開し、下記のボタンからファイルを選んでください。
              </p>
            </div>
          </div>
        </div>

        {/* File Upload Trigger */}
        <label className="block w-full">
          <input
            type="file"
            accept=".json,.html,.mhtml,.csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isLoadingFile}
          />
          <div className="w-full py-5 px-4 rounded-xl border border-dashed border-white/20 hover:border-[#fa2d48] hover:bg-white/[0.02] active:scale-[0.99] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center">
            <FileText className="w-7 h-7 text-[#8e8e93]" />
            <span className="text-xs font-bold text-white">
              {isLoadingFile ? '高精度フィルタリング解析中...' : 'watch-history.json を選んで取り込む'}
            </span>
            <span className="text-[10px] text-[#8e8e93]">
              ボカロ・歌ってみた・J-POPを自動分類します
            </span>
          </div>
        </label>

        {importResult && (
          <div className="mt-3 p-3 rounded-xl bg-[#30d158]/15 border border-[#30d158]/30 text-[#30d158] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importResult}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-[#fa2d48]/15 border border-[#fa2d48]/30 text-[#fa2d48] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </section>

      {/* SECTION 4: ONE-TAP DEMO DATA */}
      <section className="mb-6 p-5 rounded-2xl apple-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ffd60a]" />
            <span>サンプル体験データを読み込む</span>
          </h3>
          <span className="text-[10px] text-[#8e8e93]">お試し用</span>
        </div>

        <p className="text-xs text-[#8e8e93] mb-4 leading-relaxed">
          YOASOBI、ボカロ神曲（バルーン、DECO*27、蝶々P、ピノキオピー等）を含む代表曲サンプルをワンタップでロードできます。
        </p>

        <button
          onClick={handleLoadDemo}
          className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 active:scale-98 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all"
        >
          {demoLoadedSuccess ? (
            <>
              <Check className="w-4 h-4 text-[#30d158]" />
              <span>体験データを反映しました！</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#ffd60a]" />
              <span>体験データをロードする</span>
            </>
          )}
        </button>
      </section>

      {/* SECTION 5: QUICK URL ADD */}
      <section className="mb-6 p-5 rounded-2xl apple-card">
        <h3 className="text-sm font-bold text-white tracking-tight mb-1 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#fa2d48]" />
          <span>YouTubeのURLから曲を即時追加</span>
        </h3>
        <p className="text-xs text-[#8e8e93] mb-3 leading-relaxed">
          お気に入りの曲の動画URLを貼るだけで、ボカロPやカバー名義も自動抽出して登録されます。
        </p>

        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="https://youtu.be/... または watch?v=..."
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-[#2c2c2e] text-xs text-white placeholder-[#8e8e93] focus:outline-none focus:ring-1 focus:ring-[#fa2d48]"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#fa2d48] text-white text-xs font-semibold hover:bg-[#ff3b56] active:scale-95 transition-all shrink-0"
          >
            {quickAddSuccess ? '追加済' : '追加'}
          </button>
        </form>
      </section>

      {/* SECTION 6: BACKUP & RESET */}
      <section className="p-5 rounded-2xl apple-card">
        <h3 className="text-sm font-bold text-white tracking-tight mb-3">
          バックアップとデータ初期化
        </h3>

        <div className="flex flex-col gap-2.5">
          <a
            href="/melotrace-github.zip"
            download="melotrace-github.zip"
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:scale-98 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all text-center"
          >
            <Download className="w-3.5 h-3.5 text-[#30d158]" />
            <span>GitHub公開用プロジェクト一式をダウンロード (.zip)</span>
          </a>

          <button
            onClick={handleExportJson}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:scale-98 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#8e8e93]" />
            <span>ライブラリをJSON形式で書き出す</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('すべての音楽データを消去して初期化しますか？この操作は取り消せません。')) {
                clearAllData();
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#fa2d48]/10 hover:bg-[#fa2d48]/20 active:scale-98 text-[#fa2d48] text-xs font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>全データをリセット（初期化）</span>
          </button>
        </div>
      </section>

      {/* BANNED LIST MODAL */}
      {showBannedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl apple-card p-5 shadow-2xl border border-white/10 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">非表示 (Ban) リスト管理</h3>
                <p className="text-[11px] text-[#8e8e93]">
                  除外したアーティストや動画を解除・復元できます
                </p>
              </div>
              <button onClick={() => setShowBannedModal(false)} className="text-[#8e8e93]">
                <Check className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="overflow-y-auto py-3 flex flex-col gap-3 flex-1 ios-scroll-container">
              {bannedArtists.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#fa2d48] mb-1.5 uppercase tracking-wider">
                    除外アーティスト ({bannedArtists.length})
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {bannedArtists.map((artist) => (
                      <div
                        key={artist}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs text-white"
                      >
                        <span className="truncate pr-2">{artist}</span>
                        <button
                          onClick={() => unbanArtist(artist)}
                          className="text-[11px] text-[#30d158] font-bold shrink-0 hover:underline"
                        >
                          解除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bannedTracks.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#fa2d48] mb-1.5 uppercase tracking-wider">
                    除外動画ID ({bannedTracks.length})
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {bannedTracks.map((id) => (
                      <div
                        key={id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs text-white"
                      >
                        <span className="truncate pr-2 font-mono">{id}</span>
                        <button
                          onClick={() => unbanTrack(id)}
                          className="text-[11px] text-[#30d158] font-bold shrink-0 hover:underline"
                        >
                          解除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bannedArtists.length === 0 && bannedTracks.length === 0 && (
                <div className="text-center py-8 text-xs text-[#8e8e93]">
                  現在除外されているアーティストや動画はありません。
                </div>
              )}
            </div>

            {bannedArtists.length + bannedTracks.length > 0 && (
              <div className="pt-3 border-t border-white/10">
                <button
                  onClick={() => {
                    if (window.confirm('すべての除外設定を解除しますか？')) {
                      clearAllBans();
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-white/10 text-xs font-semibold text-white hover:bg-white/15"
                >
                  すべての除外を解除
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
