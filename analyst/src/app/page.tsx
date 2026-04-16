'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ChatPanel from '@/components/chat/ChatPanel';
import DocumentsPanel from '@/components/documents/DocumentsPanel';
import ComparePanel from '@/components/compare/ComparePanel';
import ReportsPanel from '@/components/reports/ReportsPanel';
import CitationsPanel from '@/components/citations/CitationsPanel';
import AnalyticsPanel from '@/components/analytics/AnalyticsPanel';
import { createClient } from '@/lib/db/supabase';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

const PANEL_MAP: Record<string, React.ReactNode> = {
  chat:      <ChatPanel />,
  documents: <DocumentsPanel />,
  compare:   <ComparePanel />,
  reports:   <ReportsPanel />,
  citations: <CitationsPanel />,
  analytics: <AnalyticsPanel />,
};

export default function AppPage() {
  const router = useRouter();
  const { activeTab, sidebarOpen, toggleSidebar } = useAppStore();
  const [user, setUser] = useState<{ email?: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/auth/login');
      } else {
        setUser({ id: data.user.id, email: data.user.email });
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#080c14]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-sky-600 dark:bg-cyan-500 animate-pulse" />
          <p className="text-xs font-mono text-slate-400">Loading Analyst AI…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080c14]">

      {/* ── Mobile overlay backdrop ── */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={`
              flex-shrink-0 overflow-hidden
              ${isMobile ? 'fixed left-0 top-0 h-full z-40' : 'relative'}
            `}
            style={{ width: 260 }}
          >
            <Sidebar user={user} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header />

        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {PANEL_MAP[activeTab]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}