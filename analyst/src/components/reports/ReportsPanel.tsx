'use client';
import { useEffect, useState } from 'react';
import { Download, Trash2, Loader2, Sparkles, Clock, RefreshCw, FilePlus, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';

interface ReportRow {
  id: string;
  title: string;
  format: string;
  created_at: string;
}

export default function ReportsPanel() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/export');
      if (res.ok) { const { reports: data } = await res.json(); setReports(data ?? []); }
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function downloadReport(id: string) { window.open('/api/export?id=' + id, '_blank'); }

  async function deleteReport(id: string) {
    if (!confirm('Delete this report?')) return;
    await fetch('/api/export', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: id }) });
    setReports(prev => prev.filter(r => r.id !== id));
    toast.success('Report deleted');
  }

  async function generateReport() {
    if (!topic.trim()) { toast.error('Enter a report topic'); return; }
    setGenerating(true);
    const toastId = toast.loading('Generating report...');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Generate a professional research report on: ' + topic }],
          modelId: 'gpt-4o-mini', enableWebSearch: true, enableRAG: true,
          activeTools: { generateReport: true },
        }),
      });
      if (res.ok) { toast.success('Report generated!', { id: toastId }); setTopic(''); await load(); }
      else { toast.error('Generation failed', { id: toastId }); }
    } catch { toast.error('Generation failed', { id: toastId }); }
    finally { setGenerating(false); }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-[#080c14] dark:bg-[#080c14] light:bg-slate-50 overflow-y-auto">
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Research Reports</h1>
            <p className="text-xs font-mono text-slate-400 mt-0.5">generate · export · archive</p>
          </div>
          <button onClick={load} className="p-2 rounded-lg text-slate-400 hover:text-sky-600 dark:hover:text-cyan-400 hover:bg-sky-500/10 dark:hover:bg-cyan-500/10 transition-all">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Generate */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/50 p-5">
          <div className="flex items-center gap-2 mb-1">
            <FilePlus size={13} className="text-sky-600 dark:text-cyan-400" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">New report</p>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mb-4">AI researches your topic using uploaded documents + web search</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateReport()}
              placeholder="e.g. AI trends in healthcare 2025..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-100 dark:bg-slate-100 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500/50 focus:ring-1 focus:ring-sky-500/20 dark:focus:ring-cyan-500/20 font-mono"
            />
            <button
              onClick={generateReport}
              disabled={generating || !topic.trim()}
              className="px-4 py-2 bg-sky-600 dark:bg-cyan-500 hover:bg-sky-500 dark:hover:bg-cyan-400 disabled:opacity-30 text-white dark:text-slate-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-sky-500/20 dark:shadow-cyan-500/20"
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>

        {/* Reports list */}
        <div>
          <p className="text-[10px] font-mono text-slate-400 tracking-widest mb-3">
            SAVED REPORTS <span className="text-sky-600 dark:text-cyan-400">({reports.length})</span>
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 size={14} className="animate-spin text-sky-600 dark:text-cyan-400" />
              <span className="text-xs font-mono">loading...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
              <Archive size={32} className="mb-3 opacity-30" />
              <p className="text-xs font-mono">no reports yet</p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">generate one above or ask AI in chat</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((report, i) => (
                <div
                  key={report.id}
                  className="group flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-200 bg-white dark:bg-white dark:bg-slate-50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 p-4 transition-all"
                >
                  <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{report.title}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                      <Clock size={9} />
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-cyan-500 uppercase border border-sky-500/20 dark:border-cyan-500/20">
                        {report.format}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => downloadReport(report.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 dark:bg-cyan-500 hover:bg-sky-500 dark:hover:bg-cyan-400 text-white dark:text-slate-900 text-xs font-bold transition-all"
                    >
                      <Download size={11} /> Export
                    </button>
                    <button
                      onClick={() => deleteReport(report.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}