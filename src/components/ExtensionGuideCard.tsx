import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, ChevronDown, ExternalLink } from 'lucide-react';
import { getPref, setPref } from '../utils/uiPrefs';

const FOCUS_KEY = 'melotrace_focus_ext_v1';
const appStoreSearch = (term: string) => `itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&term=${encodeURIComponent(term)}`;

/** 広告ブロック拡張機能の案内。押し付けないよう、折りたたんで置いておく */
export const ExtensionGuideCard: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (getPref(FOCUS_KEY, '') === '1') {
      setPref(FOCUS_KEY, '');
      setOpen(true);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    }
  }, []);

  return (
    <div ref={ref} className="mb-5 rounded-2xl apple-card overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full p-4 flex items-center gap-2 text-left">
        <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-fg">広告が気になる方へ（任意）</h3>
          <p className="text-[11px] text-muted mt-0.5">ブラウザの広告ブロック機能の入れ方</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 text-[12px] text-fg-soft leading-relaxed">
          <p className="mb-3">
            動画の前後に広告が流れることがあります。ブラウザの広告ブロック機能を使うと、広告を減らせる場合があります（完全に消えるとは限りません）。使うかどうかは、お好みで決めてください。
          </p>

          <p className="text-[11px] font-bold text-fg mb-1.5">iPhone / iPad の Safari</p>
          <ol className="list-decimal pl-5 space-y-1 mb-3">
            <li>App Storeで広告ブロックのアプリを入れる（下のボタンから検索できます）</li>
            <li>Safariを開き、アドレスバー左の「ぁあ」をタップ →「機能拡張を管理」</li>
            <li>入れたものを「オン」にして、完了をタップ</li>
            <li>もう一度「ぁあ」をタップし、その拡張を選んで「このWebサイトで常に許可」</li>
          </ol>
          <p className="text-[11px] text-muted mb-2">
            開発者の検証では、<b className="text-fg">Adblock Plus だけ</b>を有効にした状態が、広告がいちばん減り、動作も安定しました（そのぶん、曲の再生開始まで10秒前後かかる曲が多めです）。
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {['Adblock Plus', 'AdGuard', '1Blocker'].map((n) => (
              <a
                key={n}
                href={appStoreSearch(n)}
                className="px-3 py-1.5 rounded-full bg-fg/10 text-fg text-[11px] font-semibold inline-flex items-center gap-1"
              >
                {n}<ExternalLink className="w-3 h-3 text-muted" />
              </a>
            ))}
          </div>

          <div className="rounded-xl bg-fg/5 p-3 mb-3">
            <p className="text-[11px] font-bold text-fg mb-1">そのほかのブラウザ</p>
            <ul className="space-y-1 text-[11px]">
              <li><b>Brave</b>：広告ブロック（シールド）が最初から入っています</li>
              <li><b>Firefox（Android）</b>：「uBlock Origin」を追加できます</li>
              <li><b>Chrome（パソコン）</b>：「uBlock Origin Lite」などを追加できます</li>
              <li><b>Chrome（iPhone / Android）</b>：拡張機能は使えません</li>
            </ul>
          </div>

          <div className="rounded-xl bg-[#ff9f0a]/10 border border-[#ff9f0a]/25 p-3 text-[11px]">
            <p className="font-bold text-[#ff9f0a] mb-1">うまく動かないときは</p>
            <ul className="space-y-1">
              <li>・拡張機能は<b>1つだけ</b>にしてください。複数を同時にオンにすると、読み込みが遅くなったり、再生が不安定になることがあります。</li>
              <li>・曲の再生が始まるまで長く待つ場合は、一度すべてオフにして、比べてみてください。</li>
              <li>・「ぁあ」メニューの「コンテンツブロッカーをオフにする」で、このサイトだけ一時的に外せます。</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
