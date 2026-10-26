import React from 'react';
import { PlayCircle, Radio, Library, Search, ArrowDownToLine, Mic2 } from 'lucide-react';
import { ActiveTab } from '../types/music';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home' as ActiveTab, label: '今すぐ聴く', icon: PlayCircle },
    { id: 'radio' as ActiveTab, label: 'ラジオ', icon: Radio },
    { id: 'library' as ActiveTab, label: 'ライブラリ', icon: Library },
    { id: 'artists' as ActiveTab, label: 'アーティスト', icon: Mic2 },
    { id: 'search' as ActiveTab, label: '検索', icon: Search },
    { id: 'import' as ActiveTab, label: '取込・設定', icon: ArrowDownToLine },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 apple-nav-glass pb-[max(env(safe-area-inset-bottom,0px),8px)]">
      <div className="max-w-lg mx-auto flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors duration-150 active:scale-95 ${
                isActive ? 'text-accent' : 'text-[#8e8e93] hover:text-[#ebebf5]'
              }`}
            >
              <Icon
                className={`w-[22px] h-[22px] transition-transform ${
                  isActive ? 'stroke-[2.4] scale-105' : 'stroke-[1.8]'
                }`}
              />
              <span className={`text-[10px] mt-1 font-medium tracking-tight ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
