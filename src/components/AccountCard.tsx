import React from 'react';
import { Cloud, LogOut, RefreshCw, Loader2, AlertTriangle, Youtube } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const AccountCard: React.FC = () => {
  const {
    currentUser,
    loginWithGoogle,
    logout,
    isCloudSyncing,
    syncWithCloud,
    cloudConfigured,
    cloudError,
    recordYtHistory,
    setRecordYtHistory,
  } = usePlayer();

  return (
    <div className="mb-5 p-4 rounded-2xl apple-card border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <Cloud className="w-4 h-4 text-[#0a84ff]" />
        <h3 className="text-sm font-bold text-white">Googleアカウントとクラウド保存</h3>
      </div>

      {!currentUser ? (
        <>
          <p className="text-xs text-[#8e8e93] leading-relaxed mb-3">
            ログインすると、スキした曲・Banしたアーティスト・プレイリスト・各種設定がご自身のGoogleドライブ内の
            アプリ専用フォルダに保存され、別の端末でも呼び出せます（このアプリが作ったファイル以外にはアクセスしません）。
          </p>
          <button
            onClick={loginWithGoogle}
            disabled={isCloudSyncing || !cloudConfigured}
            className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition"
          >
            {isCloudSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Googleアカウントでログイン
          </button>
          {!cloudConfigured && (
            <p className="text-[11px] text-[#ff9f0a] mt-2 leading-relaxed">
              この環境ではGoogleログインが未設定です。管理者設定（VITE_GOOGLE_CLIENT_ID）が必要です。
            </p>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#2c2c2e]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{currentUser.displayName}</p>
              <p className="text-[11px] text-[#8e8e93] truncate">{currentUser.email}</p>
              <p className="text-[10px] text-[#8e8e93]">{currentUser.lastSync ? `最終同期 ${currentUser.lastSync}` : '未同期'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={syncWithCloud}
              disabled={isCloudSyncing}
              className="flex-1 py-2.5 rounded-xl bg-[#0a84ff] text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />今すぐ同期
            </button>
            <button onClick={logout} className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" />ログアウト
            </button>
          </div>
          <p className="text-[10px] text-[#8e8e93] mt-2 leading-relaxed">
            変更は自動で保存されます。ログイン状態は約1時間で切れるため、期間が空いたら「今すぐ同期」を押してください。
          </p>
        </>
      )}

      {cloudError && (
        <p className="text-[11px] text-[#fa2d48] mt-2 flex gap-1.5 leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {cloudError}
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5 text-[#fa2d48]" />YouTubeの視聴履歴にも残す
            </p>
            <p className="text-[10px] text-[#8e8e93] leading-relaxed mt-1">
              オンにすると、同じブラウザでYouTubeにログイン中なら、このアプリで再生した曲がYouTubeの履歴に記録される場合があります。
              ブラウザのCookie設定により反映されないことがあります。広告が増える可能性もあります。
            </p>
          </div>
          <button
            onClick={() => {
              setRecordYtHistory(!recordYtHistory);
              if (window.confirm('設定を反映するため、ページを再読み込みします。よろしいですか？')) window.location.reload();
            }}
            className={`w-12 h-7 rounded-full shrink-0 relative transition-colors ${recordYtHistory ? 'bg-[#30d158]' : 'bg-[#3a3a3c]'}`}
            role="switch"
            aria-checked={recordYtHistory}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${recordYtHistory ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
