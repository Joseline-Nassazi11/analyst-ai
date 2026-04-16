import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import UsageBanner from '@/components/billing/UsageBanner';

export const metadata: Metadata = {
  title: 'Analyst AI — Evidence-Driven Research',
  description: 'AI-powered research assistant with RAG, multi-provider LLMs, citations, and report generation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-surface-0 text-gray-900 dark:text-gray-100 antialiased font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') ?? 'system';
                const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (dark) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              })();
            `,
          }}
        />
        <UsageBanner />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'text-sm font-medium',
            style: { borderRadius: '10px', padding: '12px 16px' },
          }}
        />
      </body>
    </html>
  );
}