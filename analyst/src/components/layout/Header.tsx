'use client';

import { useAppStore } from '@/lib/store';
import { PanelLeft, Menu } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const TABS = [
  { id: 'chat',      label: 'Research',  short: 'Chat' },
  { id: 'documents', label: 'Documents', short: 'Docs' },
  { id: 'compare',   label: 'Compare',   short: 'Cmp' },
  { id: 'reports',   label: 'Reports',   short: 'Rep' },
  { id: 'citations', label: 'Citations', short: 'Cite' },
  { id: 'analytics', label: 'Analytics', short: 'Stats' },
];

export default function Header() {
  const { activeTab, setActiveTab, sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <header className="relative flex h-11 items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080c14] px-2 sm:px-3 flex-shrink-0">

      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex-shrink-0"
      >
        <PanelLeft size={14} />
      </button>

      {/* Divider */}
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 flex-shrink-0" />

      {/* Tabs — scrollable on mobile */}
      <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex items-center px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all duration-150 flex-shrink-0',
              activeTab === tab.id
                ? 'text-sky-600 dark:text-cyan-400 bg-sky-500/10 dark:bg-cyan-500/10'
                : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            )}
          >
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-px bg-sky-500 dark:bg-cyan-400 rounded-full" />
            )}
            {/* Show short label on mobile, full label on desktop */}
            <span className="sm:hidden">{tab.short}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Right side — hidden on smallest screens */}
      <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-slate-400 dark:text-slate-600 flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-emerald-600 dark:text-emerald-500">LIVE</span>
        </span>
        <span className="text-slate-300 dark:text-slate-800">·</span>
        <span>RESEARCH MODE</span>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-300/50 dark:via-cyan-500/20 to-transparent" />
    </header>
  );
}