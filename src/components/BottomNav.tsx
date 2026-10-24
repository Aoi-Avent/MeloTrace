import React from 'react';
import { Home, ListMusic, TrendingUp, FolderDown } from 'lucide-react';
import { ActiveTab } from '../types/music';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home' as ActiveTab, label: 'ホーム', icon: Home },
    { id: 'library' as ActiveTab, label: 'ライブラリ', icon: ListMusic },
    { id: 'analytics' as ActiveTab, label: '分析カルテ', icon: TrendingUp },
    { id: 'import' as ActiveTab, label: 'データ管理', icon: FolderDown },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 ${
                isActive
                  ? 'text-rose-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-rose-400 rounded-full shadow-[0_0_8px_#fb7185]" />
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
