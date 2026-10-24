/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { BottomNav } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlayingModal } from './components/NowPlayingModal';
import { HomeView } from './components/HomeView';
import { RadioView } from './components/RadioView';
import { LibraryView } from './components/LibraryView';
import { AnalyticsView } from './components/AnalyticsView';
import { DataImportView } from './components/DataImportView';
import { SearchView } from './components/SearchView';
import { ArtistDetailModal } from './components/ArtistDetailModal';
import { ActiveTab } from './types/music';
import { initNoBounceScroll } from './utils/useNoBounce';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Crash intercepted by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('melotrace_last_track_id_v5');
    } catch (e) {}
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-[#000000] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-2xl bg-[#fa2d48]/15 border border-[#fa2d48]/30 flex items-center justify-center mb-4">
            <span className="text-2xl text-[#fa2d48]"></span>
          </div>
          <h1 className="text-lg font-bold mb-2">プレイヤーを安全に復旧中</h1>
          <p className="text-xs text-[#8e8e93] max-w-xs mb-6 leading-relaxed">
            再生セッションの一時的な不整合を検出しました。下のボタンを押すと直前の再生状態から安全に再開できます。
          </p>
          <button
            onClick={this.handleReset}
            className="py-3 px-6 rounded-full bg-[#fa2d48] text-white text-xs font-semibold hover:bg-[#ff3b56] active:scale-95 transition-all shadow-lg shadow-[#fa2d48]/20"
          >
            プレイヤーを再開する
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const STORAGE_KEY_ACTIVE_TAB = 'melotrace_active_tab_v5';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB) as ActiveTab;
      if (saved && ['home', 'radio', 'library', 'search', 'analytics', 'import'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    return 'home';
  });

  const {
    isPlaying,
    isNowPlayingOpen,
    setIsNowPlayingOpen,
    nowPlayingTab,
    selectedArtistForDetail,
    setSelectedArtistForDetail,
  } = usePlayer();

  // Save activeTab whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTab);
    } catch (e) {
      // ignore
    }
  }, [activeTab]);

  // Permanently eliminate iOS Safari rubberband bounce
  useEffect(() => {
    const cleanup = initNoBounceScroll();
    return cleanup;
  }, []);

  const isVideoVisible = isNowPlayingOpen && nowPlayingTab === 'video';

  return (
    <div className="h-full w-full bg-[#000000] text-[#f5f5f7] flex flex-col font-sans select-none overflow-hidden relative">
      {/* THE OFFICIAL PERSISTENT YOUTUBE PLAYER CONTAINER */}
      {/* Kept mounted in DOM to prevent audio interruption; hidden off-screen when not viewing video */}
      <div
        className={
          isVideoVisible
            ? 'fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-sm aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black'
            : 'fixed -top-[9999px] -left-[9999px] w-[320px] h-[180px] pointer-events-none opacity-[0.01]'
        }
      >
        <div id="yt-player-target" className="w-full h-full" />
      </div>

      {/* Main View Area with zero-bounce scrolling */}
      <main className="flex-1 w-full max-w-lg mx-auto h-full overflow-hidden relative">
        {activeTab === 'home' && <HomeView setActiveTab={setActiveTab} />}
        {activeTab === 'radio' && <RadioView />}
        {activeTab === 'library' && <LibraryView />}
        {activeTab === 'search' && (
          <SearchView onSelectArtist={(artist) => setSelectedArtistForDetail(artist)} />
        )}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'import' && <DataImportView setActiveTab={setActiveTab} />}
      </main>

      {/* Apple Music Floating Mini Player */}
      <MiniPlayer />

      {/* Apple Music Full-Screen Now Playing Modal Sheet */}
      <NowPlayingModal />

      {/* Apple Music Artist Catalog Deep-Dive Modal */}
      <ArtistDetailModal
        artistName={selectedArtistForDetail}
        onClose={() => setSelectedArtistForDetail(null)}
      />

      {/* Apple Music 5-Tab Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <PlayerProvider>
        <AppContent />
      </PlayerProvider>
    </ErrorBoundary>
  );
}
