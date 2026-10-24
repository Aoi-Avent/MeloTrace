/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { BottomNav } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlayingModal } from './components/NowPlayingModal';
import { HomeView } from './components/HomeView';
import { LibraryView } from './components/LibraryView';
import { AnalyticsView } from './components/AnalyticsView';
import { DataImportView } from './components/DataImportView';
import { ActiveTab } from './types/music';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const { currentTrack, isPlaying, playMode, isNowPlayingOpen } = usePlayer();

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Background Hidden YouTube Player for continuous web audio in youtube mode */}
      {playMode === 'youtube' && currentTrack && isPlaying && !isNowPlayingOpen && (
        <div className="fixed -bottom-96 -right-96 opacity-0 pointer-events-none w-1 h-1 overflow-hidden" aria-hidden="true">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${currentTrack.id}?autoplay=1&enablejsapi=1`}
            title="Background Audio"
            allow="autoplay; encrypted-media"
          />
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {activeTab === 'home' && <HomeView setActiveTab={setActiveTab} />}
        {activeTab === 'library' && <LibraryView />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'import' && <DataImportView setActiveTab={setActiveTab} />}
      </main>

      {/* Sticky Mini Player above Bottom Bar */}
      <MiniPlayer />

      {/* Full-screen Now Playing Modal (lyrics, queue, video) */}
      <NowPlayingModal />

      {/* Fixed Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}
