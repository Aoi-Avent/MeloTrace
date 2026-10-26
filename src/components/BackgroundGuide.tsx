import React from 'react';
import { Smartphone, X, Check, AlertTriangle } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

/** 各所に置ける「バックグラウンド再生」ボタン */
export const BackgroundPlayButton: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact }) => {
  const { setIsBgGuideOpen } = usePlayer();
  return (
    <button
      onClick={() => setIsBgGuideOpen(true)}
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold active:scale-95 transition ${
        compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
      } ${className}`}
    >
      <Smartphone className="w-3.5 h-3.5 text-[#30d158]" />
      <span>バックグラウンド再生</span>
    </button>
  );
};

export const BackgroundGuideModal: React.FC = () => {
  const { isBgGuideOpen, setIsBgGuideOpen } = usePlayer();
  if (!isBgGuideOpen) return null;

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3"
      onClick={() => setIsBgGuideOpen(false)}
    >
      <div
        className="w-full max-w-sm max-h-[88vh] overflow-y-auto rounded-3xl bg-[#1c1c1e] border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#30d158]" />
            <h3 className="text-base font-bold text-white">バックグラウンド再生のコツ</h3>
          </div>
          <button onClick={() => setIsBgGuideOpen(false)} className="p-1 text-[#8e8e93]" aria-label="閉じる">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#d1d1d6] leading-relaxed mb-4">
          このアプリはYouTube公式プレイヤーで再生しています。そのため、ブラウザの標準設定のままだと
          <b className="text-white">画面を消す・他のアプリに切り替えると止まりやすい</b>
          です。<b className="text-white">「デスクトップ用サイトを表示（PC版サイト）」にすると、部分的に再生を続けられる</b>ことがあります。
        </p>

        <div className={`rounded-2xl p-3.5 mb-3 border ${isIOS ? 'bg-[#30d158]/10 border-[#30d158]/30' : 'bg-white/5 border-white/10'}`}>
          <p className="text-xs font-bold text-white mb-2">iPhone / iPad（Safari）</p>
          <ol className="text-xs text-[#d1d1d6] leading-relaxed list-decimal pl-4 space-y-1">
            <li>アドレスバー左の「ぁあ」（aA）をタップ</li>
            <li>「デスクトップ用Webサイトを表示」を選ぶ</li>
            <li>ページが再読み込みされたら、曲を再生</li>
            <li>ホームに戻る／画面ロックしても、続くことがあります</li>
          </ol>
        </div>

        <div className={`rounded-2xl p-3.5 mb-3 border ${isAndroid ? 'bg-[#30d158]/10 border-[#30d158]/30' : 'bg-white/5 border-white/10'}`}>
          <p className="text-xs font-bold text-white mb-2">Android（Chrome）</p>
          <ol className="text-xs text-[#d1d1d6] leading-relaxed list-decimal pl-4 space-y-1">
            <li>右上の「︙」メニューを開く</li>
            <li>「PC版サイト」にチェックを入れる</li>
            <li>曲を再生してからホームに戻る</li>
          </ol>
        </div>

        <div className="rounded-2xl p-3.5 bg-[#ff9f0a]/10 border border-[#ff9f0a]/30">
          <p className="text-xs font-bold text-[#ff9f0a] mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />あくまで「部分的」です
          </p>
          <ul className="text-[11px] text-[#d1d1d6] leading-relaxed space-y-1">
            <li className="flex gap-1.5"><Check className="w-3 h-3 mt-0.5 shrink-0 text-[#30d158]" />OS・ブラウザのバージョンや省電力設定で動作が変わります</li>
            <li className="flex gap-1.5"><Check className="w-3 h-3 mt-0.5 shrink-0 text-[#30d158]" />しばらくして止まる場合は、ロック画面の再生ボタンで再開できることがあります</li>
            <li className="flex gap-1.5"><Check className="w-3 h-3 mt-0.5 shrink-0 text-[#30d158]" />確実に続けたい場合は、YouTube公式アプリ（Premium）のご利用が確実です</li>
          </ul>
        </div>

        <button
          onClick={() => setIsBgGuideOpen(false)}
          className="w-full mt-4 py-3 rounded-xl bg-[#fa2d48] text-white text-sm font-bold active:scale-[0.98] transition"
        >
          わかりました
        </button>
      </div>
    </div>
  );
};
