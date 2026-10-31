import React from 'react';
import { Smartphone, X, Check, AlertTriangle } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { isIOSMobileMode, isIOSDesktopMode, isAndroid } from '../utils/deviceMode';

/** 各所に置ける「バックグラウンド再生」ボタン */
export const BackgroundPlayButton: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact }) => {
  const { setIsBgGuideOpen } = usePlayer();
  return (
    <button
      onClick={() => setIsBgGuideOpen(true)}
      className={`inline-flex items-center gap-1.5 rounded-full bg-fg/10 hover:bg-fg/15 text-fg font-semibold active:scale-95 transition ${
        compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
      } ${className}`}
    >
      <Smartphone className="w-3.5 h-3.5 text-[#30d158]" />
      <span>バックグラウンド再生</span>
    </button>
  );
};

export const BackgroundGuideModal: React.FC = () => {
  const { isBgGuideOpen, setIsBgGuideOpen, keepAliveEnabled, setKeepAliveEnabled, currentTrack } = usePlayer();
  if (!isBgGuideOpen) return null;

  const iosMobile = isIOSMobileMode();
  const iosDesktop = isIOSDesktopMode();
  const android = isAndroid();

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 flex items-end sm:items-center justify-center p-3" onClick={() => setIsBgGuideOpen(false)}>
      <div
        className="w-full max-w-sm max-h-[88vh] overflow-y-auto rounded-3xl bg-surface border border-fg/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#30d158]" />
            <h3 className="text-base font-bold text-fg">バックグラウンド再生</h3>
          </div>
          <button onClick={() => setIsBgGuideOpen(false)} className="p-1 text-muted" aria-label="閉じる">
            <X className="w-5 h-5" />
          </button>
        </div>

        {iosDesktop && (
          <p className="mb-3 px-3 py-2 rounded-xl bg-[#30d158]/15 border border-[#30d158]/30 text-xs text-[#30d158] font-semibold flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />現在「デスクトップ用Webサイト」で表示中です
          </p>
        )}
        {iosMobile && (
          <p className="mb-3 px-3 py-2 rounded-xl bg-[#ff9f0a]/15 border border-[#ff9f0a]/30 text-xs text-[#ff9f0a] font-semibold">
            現在はモバイル表示です。下の設定をすると、画面を閉じても続きやすくなります。
          </p>
        )}

        <p className="text-xs text-fg-soft leading-relaxed mb-4">
          動画の再生にはYouTube公式プレーヤーを使っています。ブラウザは、画面を消したりアプリを切り替えると、
          モバイル表示のページの再生を止めます。<b className="text-fg">デスクトップ用Webサイトにすると止まりにくくなります。</b>
        </p>

        <div className="rounded-2xl p-3.5 mb-3 border bg-fg/5 border-fg/10">
          <p className="text-xs font-bold text-fg mb-2">iPhone / iPad（Safari）— 1回だけでOK</p>
          <ol className="text-xs text-fg-soft leading-relaxed list-decimal pl-4 space-y-1">
            <li>アドレスバー左の「ぁあ」（aA）をタップ</li>
            <li>「Webサイト設定」を開く</li>
            <li>「デスクトップ用Webサイトを表示」をオン</li>
            <li>このサイト（aoi-avent.github.io）では、次回から自動でこの表示になります</li>
          </ol>
          <p className="text-[11px] text-muted mt-2 leading-relaxed">
            iPhone全体の初期設定にしたい場合は、「設定」→「Safari」→「デスクトップ用Webサイトを表示」から変更できます。
          </p>
        </div>

        <div className={`rounded-2xl p-3.5 mb-3 border ${android ? 'bg-[#30d158]/10 border-[#30d158]/30' : 'bg-fg/5 border-fg/10'}`}>
          <p className="text-xs font-bold text-fg mb-2">Android（Chrome）</p>
          <ol className="text-xs text-fg-soft leading-relaxed list-decimal pl-4 space-y-1">
            <li>右上の「︙」メニューを開く</li>
            <li>「PC版サイト」にチェックを入れる</li>
          </ol>
        </div>

        <div className="rounded-2xl p-3.5 mb-3 bg-fg/5 border border-fg/10">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-fg">無音ループで維持（実験的）</p>
              <p className="text-[10px] text-muted leading-relaxed mt-1">
                再生中だけ、聞こえない音を流してブラウザに「音楽アプリ」と認識させます。音が出ない・止まるなどの不具合が続く場合はオフにしてください。
              </p>
            </div>
            <button
              onClick={() => setKeepAliveEnabled(!keepAliveEnabled)}
              className={`w-12 h-7 rounded-full shrink-0 relative transition-colors ${keepAliveEnabled ? 'bg-[#30d158]' : 'bg-surface-3'}`}
              role="switch"
              aria-checked={keepAliveEnabled}
            >
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-fg transition-all ${keepAliveEnabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {currentTrack && (
          <div className="rounded-2xl p-3.5 mb-3 bg-fg/5 border border-fg/10">
            <p className="text-xs font-bold text-fg mb-1">YouTube Premiumをお持ちなら</p>
            <p className="text-[11px] text-fg-soft leading-relaxed mb-2">
              今の曲をYouTube Musicアプリで開くと、画面を閉じても確実に再生が続きます（アプリが入っている場合）。
            </p>
            <a
              href={`https://music.youtube.com/watch?v=${currentTrack.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-3.5 py-2 rounded-full bg-fg text-inverse text-xs font-bold"
            >
              YouTube Musicで開く
            </a>
          </div>
        )}

        <div className="rounded-2xl p-3.5 bg-[#ff9f0a]/10 border border-[#ff9f0a]/30">
          <p className="text-xs font-bold text-[#ff9f0a] mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />ご注意
          </p>
          <ul className="text-[11px] text-fg-soft leading-relaxed space-y-1">
            <li className="flex gap-1.5"><Check className="w-3 h-3 mt-0.5 shrink-0 text-[#30d158]" />デスクトップ表示でも、画面を閉じた直後に止まることがあります。その場合は、ロック画面やコントロールセンターの再生ボタンを押すと続きが再生されます。</li>
            <li className="flex gap-1.5"><Check className="w-3 h-3 mt-0.5 shrink-0 text-[#30d158]" />Webサイト側の設定だけで、デスクトップ表示に切り替えることはできません（ブラウザの仕様です）。</li>
            <li className="flex gap-1.5"><Check className="w-3 h-3 mt-0.5 shrink-0 text-[#30d158]" />完全なバックグラウンド再生が必要な場合は、YouTube Premiumの公式アプリが確実です。</li>
          </ul>
        </div>

        <button
          onClick={() => setIsBgGuideOpen(false)}
          className="w-full mt-4 py-3 rounded-xl bg-accent text-on-accent text-sm font-bold active:scale-[0.98] transition"
        >
          わかりました
        </button>
      </div>
    </div>
  );
};
