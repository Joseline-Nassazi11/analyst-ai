// src/components/chat/SourcesPanel.tsx
// Displays RAG document sources and web sources with similarity scores.
// Directly addresses the reviewer complaint: "citation score was not demonstrated."
// Drop this component into ChatPanel.tsx — see instructions at the bottom.

'use client';

import { useState } from 'react';
import { Database, Globe, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DocumentSource {
  documentId: string;
  documentName: string;
  chunkContent: string;
  similarity: number;
}

interface WebSource {
  url: string;
  title: string;
  snippet: string;
  publishedDate?: string;
}

interface SourcesPanelProps {
  /** Raw message content — we parse tool results out of it */
  toolInvocations?: Array<{
    toolName: string;
    state: string;
    result?: unknown;
  }>;
}

function SimilarityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? 'bg-green-500' :
    pct >= 60 ? 'bg-brand-500' :
    pct >= 40 ? 'bg-amber-500' :
                'bg-gray-400';

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn(
        'text-[10px] font-mono font-semibold tabular-nums',
        pct >= 80 ? 'text-green-600 dark:text-green-400' :
        pct >= 60 ? 'text-brand-600 dark:text-brand-400' :
        pct >= 40 ? 'text-amber-600 dark:text-amber-400' :
                    'text-gray-400'
      )}>
        {pct}%
      </span>
    </div>
  );
}

export default function SourcesPanel({ toolInvocations }: SourcesPanelProps) {
  const [open, setOpen] = useState(true);

  if (!toolInvocations?.length) return null;

  // Extract document sources from ragSearch tool results
  const docSources: DocumentSource[] = [];
  const webSources: WebSource[] = [];

  for (const inv of toolInvocations) {
    if (inv.state !== 'result' || !inv.result) continue;
    const result = inv.result as Record<string, unknown>;

    if (inv.toolName === 'ragSearch' && result.found && Array.isArray(result.sources)) {
      docSources.push(...(result.sources as DocumentSource[]));
    }

    if (inv.toolName === 'webSearch' && Array.isArray(result.sources)) {
      webSources.push(...(result.sources as WebSource[]));
    }
  }

  if (docSources.length === 0 && webSources.length === 0) return null;

  const totalSources = docSources.length + webSources.length;
  const avgSimilarity = docSources.length > 0
    ? Math.round((docSources.reduce((s, d) => s + d.similarity, 0) / docSources.length) * 100)
    : null;

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 dark:border-[#2a2a3a] bg-indigo-50/50 dark:bg-[#0d0d16] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-indigo-100/50 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          <Database size={11} />
          {totalSources} source{totalSources !== 1 ? 's' : ''} retrieved
          {avgSimilarity !== null && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono">
              avg {avgSimilarity}% match
            </span>
          )}
        </div>
        {open ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">

          {/* Document sources */}
          {docSources.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1 mt-1">
                <Database size={9} /> Document sources
              </p>
              {docSources.map((src, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-indigo-200 dark:border-[#2a2a3a] bg-white dark:bg-[#12121e] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                      {src.documentName}
                    </p>
                    <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                      chunk #{i + 1}
                    </span>
                  </div>
                  <SimilarityBar score={src.similarity} />
                  <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                    {src.chunkContent}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Web sources */}
          {webSources.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1 mt-1">
                <Globe size={9} /> Web sources
              </p>
              {webSources.slice(0, 4).map((src, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-indigo-200 dark:border-[#2a2a3a] bg-white dark:bg-[#12121e] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-1">
                      {src.title}
                    </p>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-500 hover:text-brand-600 flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-400 truncate">{src.url}</p>
                  {src.publishedDate && (
                    <p className="text-[10px] text-gray-400 mt-0.5">Published: {src.publishedDate}</p>
                  )}
                  <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                    {src.snippet}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HOW TO ADD THIS TO ChatPanel.tsx ────────────────────────────────────────
//
// 1. Import at the top of ChatPanel.tsx:
//    import SourcesPanel from '@/components/chat/SourcesPanel';
//
// 2. Find the assistant message bubble in ChatPanel.tsx — the block that starts:
//    <div className="rounded-2xl border border-indigo-200 ... px-5 py-4 shadow-sm">
//      <div className="prose-chat text-sm leading-relaxed">
//        <ReactMarkdown ...>{message.content}</ReactMarkdown>
//      </div>
//    </div>
//
//    Add <SourcesPanel> right AFTER that closing </div>, like this:
//
//    <div className="rounded-2xl border ...">
//      <div className="prose-chat ...">
//        <ReactMarkdown ...>{message.content}</ReactMarkdown>
//      </div>
//    </div>
//    <SourcesPanel toolInvocations={message.toolInvocations as any} />  ← ADD THIS
//
// That's it! The panel auto-hides when there are no sources.