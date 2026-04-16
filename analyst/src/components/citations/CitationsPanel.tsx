'use client';
import { useEffect, useState } from 'react';
import type { Citation, CitationFormat } from '@/types';
import { formatCitation } from '@/lib/utils/citations';
import { BookOpen, Trash2, Download, Globe, FileText, Plus, Copy, RefreshCw, Quote } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

const FORMAT_OPTIONS: { value: CitationFormat; label: string; desc: string }[] = [
  { value: 'apa',     label: 'APA',     desc: '7th ed.' },
  { value: 'mla',     label: 'MLA',     desc: '9th ed.' },
  { value: 'chicago', label: 'Chicago', desc: '17th ed.' },
];

export default function CitationsPanel() {
  const [citations, setCitations]     = useState<Citation[]>([]);
  const [format, setFormat]           = useState<CitationFormat>('apa');
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [newCitation, setNewCitation] = useState({
    title: '', authors: '', url: '', publisher: '', publicationDate: '',
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/citations');
      if (res.ok) { const { citations: data } = await res.json(); setCitations(data ?? []); }
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function addCitation() {
    if (!newCitation.title.trim()) { toast.error('Title is required'); return; }
    const res = await fetch('/api/citations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCitation),
    });
    if (res.ok) {
      toast.success('Citation added');
      setNewCitation({ title: '', authors: '', url: '', publisher: '', publicationDate: '' });
      setShowAdd(false); load();
    }
  }

  async function deleteCitation(id: string) {
    await fetch('/api/citations', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ citationId: id }) });
    setCitations(prev => prev.filter(c => c.id !== id));
    toast.success('Citation deleted');
  }

  function copyCitation(citation: Citation) {
    navigator.clipboard.writeText(formatCitation(citation, format));
    toast.success('Copied');
  }

  function exportAll() {
    const text = citations.map(c => formatCitation(c, format)).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'citations-' + format + '.txt'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-[#080c14] dark:bg-[#080c14] light:bg-slate-50 overflow-y-auto">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Citations</h1>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              {citations.length} source{citations.length !== 1 ? 's' : ''} · manage · export
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={load} className="p-2 rounded-lg text-slate-400 hover:text-sky-600 dark:hover:text-cyan-400 hover:bg-sky-500/10 dark:hover:bg-cyan-500/10 transition-all">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            {citations.length > 0 && (
              <button
                onClick={exportAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-cyan-400 hover:border-sky-500/50 dark:hover:border-cyan-500/50 transition-all"
              >
                <Download size={11} /> Export
              </button>
            )}
            <button
              onClick={() => setShowAdd(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 dark:bg-cyan-500 hover:bg-sky-500 dark:hover:bg-cyan-400 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm shadow-sky-500/20 dark:shadow-cyan-500/20"
            >
              <Plus size={11} /> Add
            </button>
          </div>
        </div>

        {/* Format selector */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-400 tracking-widest">FORMAT</span>
          <div className="flex gap-1 p-1 rounded-lg bg-slate-200/50 dark:bg-slate-100 dark:bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
            {FORMAT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-mono transition-all',
                  format === opt.value
                    ? 'bg-sky-500/20 dark:bg-cyan-500/20 text-sky-600 dark:text-cyan-400 border border-sky-500/30 dark:border-cyan-500/30'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                {opt.label}
                <span className="ml-1 text-[9px] opacity-50">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Add citation form */}
        {showAdd && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/50 p-5 space-y-3">
            <p className="text-xs font-mono text-slate-400 tracking-widest">NEW CITATION</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'title',           placeholder: 'Title *',                span: 2 },
                { key: 'authors',         placeholder: 'Authors (e.g. Smith, J.)' },
                { key: 'publisher',       placeholder: 'Publisher / Journal' },
                { key: 'publicationDate', placeholder: 'Year (e.g. 2024)' },
                { key: 'url',             placeholder: 'URL (optional)',          span: 2 },
              ].map(field => (
                <input
                  key={field.key}
                  value={newCitation[field.key as keyof typeof newCitation]}
                  onChange={e => setNewCitation(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className={cn(
                    'rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-100 dark:bg-slate-100 dark:bg-slate-800/50 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500/50 focus:ring-1 focus:ring-sky-500/20 dark:focus:ring-cyan-500/20',
                    field.span === 2 && 'col-span-2'
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all">
                cancel
              </button>
              <button onClick={addCitation} className="px-4 py-1.5 rounded-lg bg-sky-600 dark:bg-cyan-500 hover:bg-sky-500 dark:hover:bg-cyan-400 text-white dark:text-slate-900 text-xs font-bold transition-all">
                Save citation
              </button>
            </div>
          </div>
        )}

        {/* Citations list */}
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
            <div className="h-3 w-3 rounded-full border border-sky-500 dark:border-cyan-400 border-t-transparent animate-spin" />
            <span className="text-xs font-mono">loading...</span>
          </div>
        ) : citations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <BookOpen size={28} className="mb-3 opacity-20" />
            <p className="text-xs font-mono">no citations yet</p>
            <p className="text-[10px] font-mono text-slate-400 mt-1">saved automatically when AI cites sources</p>
          </div>
        ) : (
          <div className="space-y-2">
            {citations.map((citation) => (
              <div
                key={citation.id}
                className="group rounded-xl border border-slate-200 dark:border-slate-200 bg-white dark:bg-white dark:bg-slate-50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-slate-50 dark:bg-slate-800/30 p-4 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mt-0.5">
                    {citation.url
                      ? <Globe size={12} className="text-sky-600 dark:text-cyan-400" />
                      : <FileText size={12} className="text-slate-500 dark:text-slate-400" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{citation.title}</p>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {citation.authors.length > 0 && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {Array.isArray(citation.authors) ? citation.authors.join(', ') : citation.authors}
                        </span>
                      )}
                      {citation.publicationDate && (
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-500/70">{citation.publicationDate}</span>
                      )}
                      {citation.publisher && (
                        <span className="text-[10px] font-mono text-slate-400">{citation.publisher}</span>
                      )}
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 uppercase">
                        {citation.source}
                      </span>
                    </div>

                    <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-100 dark:bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 px-3 py-2 flex items-start gap-2">
                      <Quote size={10} className="text-sky-500/50 dark:text-cyan-400/50 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] font-mono text-slate-500 italic leading-relaxed">
                        {formatCitation(citation, format)}
                      </p>
                    </div>

                    {citation.url && (
                      <a href={citation.url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-mono text-sky-600 dark:text-cyan-500/70 hover:text-sky-500 dark:hover:text-cyan-400 mt-1.5 block truncate transition-colors">
                        ↗ {citation.url}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => copyCitation(citation)} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 dark:hover:text-cyan-400 hover:bg-sky-500/10 dark:hover:bg-cyan-500/10 transition-all">
                      <Copy size={11} />
                    </button>
                    <button onClick={() => deleteCitation(citation.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}