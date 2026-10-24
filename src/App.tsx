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
  const { currentTrack, isPlaying, isNowPlayingOpen, setIsNowPlayingOpen } = usePlayer();

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Docked Floating Video Player for Continuous Playback on Mobile Safari */}
      {currentTrack && isPlaying && !isNowPlayingOpen && (
        <div
          onClick={() => setIsNowPlayingOpen(true)}
          className="fixed bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))] right-3 z-30 w-32 aspect-video rounded-xl overflow-hidden shadow-2xl border border-rose-500/30 bg-black cursor-pointer active:scale-95 transition-transform"
          title="タップしてプレイヤーを展開"
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${currentTrack.id}?autoplay=1&enablejsapi=1&playsinline=1&rel=0`}
            title="Now Playing Mini Video"
            className="w-full h-full border-0 pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
