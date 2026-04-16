'use client';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { GitCompare, Loader2, FileText, Brain, CheckSquare, Square, Zap } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

export default function ComparePanel() {
  const { documents } = useAppStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState<{ topic: string; documents: { documentId: string; documentName: string; passages: { content: string; similarity: number }[] }[] } | null>(null);
  const [synthesis, setSynthesis] = useState('');
  const [comparing, setComparing] = useState(false);
  const [synthesising, setSynthesising] = useState(false);

  const readyDocs = documents.filter(d => d.status === 'ready');

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function runComparison() {
    if (selected.length < 2) { toast.error('Select at least 2 documents'); return; }
    if (!topic.trim()) { toast.error('Enter a comparison topic'); return; }
    setComparing(true); setSynthesis(''); setResult(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: topic, documentIds: selected, mode: 'compare' }),
      });
      setResult(await res.json());
    } catch { toast.error('Comparison failed'); }
    finally { setComparing(false); }
  }

  async function runSynthesis() {
    if (!result) return;
    setSynthesising(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Compare and synthesize these document excerpts on "${result.topic}":\n\n` +
              result.documents.map(d => `## ${d.documentName}\n${d.passages.map(p => p.content).join('\n')}`).join('\n\n') +
              '\n\nProvide: 1) Key similarities 2) Key differences 3) Overall synthesis',
          }],
          modelId: 'gpt-4o-mini', enableWebSearch: false, enableRAG: false,
        }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let text = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split('\n')) {
            if (line.startsWith('0:')) { try { text += JSON.parse(line.slice(2)); setSynthesis(text); } catch {} }
          }
        }
      }
    } catch { toast.error('Synthesis failed'); }
    finally { setSynthesising(false); }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-[#080c14] dark:bg-[#080c14] light:bg-slate-50 overflow-y-auto">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Source Comparison</h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">select · compare · synthesize</p>
        </div>

        {readyDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText size={32} className="mb-3 opacity-20" />
            <p className="text-xs font-mono">no indexed documents</p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">upload documents first</p>
          </div>
        ) : (
          <>
            {/* Document selector */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GitCompare size={13} className="text-sky-600 dark:text-cyan-400" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Select documents</p>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {selected.length} selected
                  {selected.length >= 2 && <span className="text-emerald-600 dark:text-emerald-400 ml-1">✓ ready</span>}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {readyDocs.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => toggleSelect(doc.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 text-left text-xs transition-all',
                      selected.includes(doc.id)
                        ? 'border-sky-500/50 dark:border-cyan-500/50 bg-sky-500/10 dark:bg-cyan-500/10 text-sky-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-100 dark:bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
                    )}
                  >
                    {selected.includes(doc.id)
                      ? <CheckSquare size={12} className="text-sky-600 dark:text-cyan-400 flex-shrink-0" />
                      : <Square size={12} className="flex-shrink-0 text-slate-400 dark:text-slate-600" />
                    }
                    <span className="truncate font-mono">{doc.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic + compare */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/50 p-5">
              <p className="text-xs font-mono text-slate-400 mb-3 tracking-wider">COMPARISON TOPIC</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runComparison()}
                  placeholder="e.g. key findings, methodology, conclusions..."
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-100 dark:bg-slate-100 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500/50 focus:ring-1 focus:ring-sky-500/20 dark:focus:ring-cyan-500/20 font-mono"
                />
                <button
                  onClick={runComparison}
                  disabled={comparing || selected.length < 2 || !topic.trim()}
                  className="px-4 py-2 bg-sky-600 dark:bg-cyan-500 hover:bg-sky-500 dark:hover:bg-cyan-400 disabled:opacity-30 text-white dark:text-slate-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {comparing ? <Loader2 size={13} className="animate-spin" /> : <GitCompare size={13} />}
                  {comparing ? 'Comparing...' : 'Compare'}
                </button>
              </div>
            </div>

            {/* Results */}
            {result && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-slate-400">
                    RESULTS <span className="text-sky-600 dark:text-cyan-400">/ {result.topic}</span>
                  </p>
                  <button
                    onClick={runSynthesis}
                    disabled={synthesising}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-mono transition-all disabled:opacity-40"
                  >
                    {synthesising ? <Loader2 size={11} className="animate-spin" /> : <Brain size={11} className="text-sky-600 dark:text-cyan-400" />}
                    {synthesising ? 'synthesising...' : 'AI Synthesis'}
                  </button>
                </div>

                <div className={cn('grid gap-3', result.documents.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
                  {result.documents.map((doc, di) => (
                    <div key={doc.documentId} className="rounded-xl border border-slate-200 dark:border-slate-200 bg-white dark:bg-white dark:bg-slate-50 dark:bg-slate-900/30 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          DOC {String(di + 1).padStart(2, '0')}
                        </span>
                        <p className="text-xs font-mono text-sky-600 dark:text-cyan-400 truncate">{doc.documentName}</p>
                      </div>
                      <div className="space-y-2">
                        {doc.passages.map((p, i) => (
                          <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-100 dark:bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 px-3 py-2.5">
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{p.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-0.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-sky-500 dark:bg-cyan-400"
                                  style={{ width: `${(p.similarity * 100).toFixed(0)}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-mono text-sky-600 dark:text-cyan-400">{(p.similarity * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {synthesis && (
                  <div className="rounded-xl border border-sky-500/20 dark:border-cyan-500/20 bg-sky-50 dark:bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap size={13} className="text-sky-600 dark:text-cyan-400" />
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Synthesis</p>
                    </div>
                    <div className="prose-os text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{synthesis}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}