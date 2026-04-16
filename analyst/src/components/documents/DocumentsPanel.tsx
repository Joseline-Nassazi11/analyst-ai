'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/lib/store';
import type { Document } from '@/types';
import {
  Upload, FileText, FileSpreadsheet, File, Trash2,
  CheckCircle2, AlertCircle, Loader2, Search, RefreshCw,
  BarChart2, X, TrendingUp, Database, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = ['#00d4ff', '#00ff88', '#ffd700', '#ff6b6b', '#a78bfa'];

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf:  <FileText size={14} className="text-red-400" />,
  csv:  <FileSpreadsheet size={14} className="text-emerald-400" />,
  docx: <FileText size={14} className="text-cyan-400" />,
  txt:  <File size={14} className="text-slate-400" />,
  md:   <File size={14} className="text-violet-400" />,
};

const STATUS_ICONS: Record<Document['status'], React.ReactNode> = {
  pending:    <Loader2 size={11} className="animate-spin text-slate-500" />,
  processing: <Loader2 size={11} className="animate-spin text-cyan-400" />,
  ready:      <CheckCircle2 size={11} className="text-emerald-400" />,
  error:      <AlertCircle size={11} className="text-red-400" />,
};

const STATUS_COLORS: Record<Document['status'], string> = {
  pending:    'text-slate-500',
  processing: 'text-cyan-400',
  ready:      'text-emerald-400',
  error:      'text-red-400',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

interface CSVStats {
  rows: number; cols: number; numeric: number; headers: string[];
}

function CSVDashboard({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CSVStats | null>(null);
  const [barData, setBarData] = useState<{ name: string; value: number }[]>([]);
  const [lineData, setLineData] = useState<{ name: string; value: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'bar' | 'line'>('bar');
  const [colLabel, setColLabel] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/ingest/csv?documentId=' + doc.id);
        if (res.status !== 200) { setLoading(false); return; }
        const json = await res.json();
        const text = json.content as string;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map(line => line.split(',').map(v => v.trim().replace(/"/g, '')));
        const numericCols = headers.filter((h, i) => {
          const vals = rows.map(r => r[i]).filter(Boolean);
          return vals.filter(v => !isNaN(Number(v)) && v !== '').length > vals.length * 0.7;
        });
        setStats({ rows: rows.length, cols: headers.length, numeric: numericCols.length, headers });
        if (numericCols[0]) {
          const idx = headers.indexOf(numericCols[0]);
          setColLabel(numericCols[0]);
          setBarData(rows.slice(0, 20).map((row, i) => ({ name: String(i + 1), value: Number(row[idx]) || 0 })));
          setLineData(rows.slice(0, 50).map((row, i) => ({ name: String(i + 1), value: Number(row[idx]) || 0 })));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [doc.id]);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-[#0d1117] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-cyan-500/10 flex items-center justify-center">
            <BarChart2 size={12} className="text-cyan-400" />
          </div>
          <p className="text-sm font-semibold text-slate-200">Data Analytics</p>
          <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-800">{doc.name}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors">
          <X size={13} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
          <Loader2 size={14} className="animate-spin text-cyan-400" />
          <span className="text-xs font-mono">parsing csv...</span>
        </div>
      ) : stats ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'ROWS', value: stats.rows, color: 'text-cyan-400' },
              { label: 'COLS', value: stats.cols, color: 'text-emerald-400' },
              { label: 'NUMERIC', value: stats.numeric, color: 'text-amber-400' },
              { label: 'TEXT', value: stats.cols - stats.numeric, color: 'text-violet-400' },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-slate-100 dark:bg-slate-100 dark:bg-slate-800/50 border border-slate-700/50 p-3 text-center">
                <p className={cn('text-xl font-bold font-mono', s.color)}>{s.value}</p>
                <p className="text-[9px] text-slate-500 mt-0.5 tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          {barData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                  <TrendingUp size={9} /> {colLabel}
                </p>
                <div className="flex gap-1 p-0.5 rounded-md bg-slate-800">
                  {(['bar', 'line'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      className={cn('px-2 py-0.5 rounded text-[10px] font-mono transition-all capitalize',
                        activeTab === t ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                {activeTab === 'bar' ? (
                  <BarChart data={barData}>
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                      {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={lineData}>
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
                    <Line type="monotone" dataKey="value" stroke="#00d4ff" strokeWidth={1.5} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Columns */}
          <div>
            <p className="text-[9px] font-mono text-slate-500 mb-2 tracking-widest">DETECTED COLUMNS</p>
            <div className="flex flex-wrap gap-1.5">
              {stats.headers.map(h => (
                <span key={h} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-cyan-500/20">
                  {h}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500 text-center py-4 font-mono">could not parse csv</p>
      )}
    </div>
  );
}

export default function DocumentsPanel() {
  const { documents, setDocuments, addDocument, removeDocument } = useAppStore();
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCSV, setSelectedCSV] = useState<Document | null>(null);

  async function loadDocuments() {
    setLoading(true);
    try {
      const res = await fetch('/api/ingest');
      if (res.ok) {
        const { documents: docs } = await res.json();
        setDocuments(docs ?? []);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { loadDocuments(); }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    const formData = new FormData();
    acceptedFiles.forEach(f => formData.append('files', f));
    const toastId = toast.loading('Ingesting ' + acceptedFiles.length + ' file(s)...');
    try {
      const res = await fetch('/api/ingest', { method: 'POST', body: formData });
      const { results } = await res.json();
      let ok = 0, failed = 0;
      results.forEach((r: { status: string; name: string }) => {
        if (r.status === 'ready') ok++; else failed++;
      });
      toast.success(ok + ' file(s) ingested' + (failed ? ', ' + failed + ' failed' : ''), { id: toastId });
      await loadDocuments();
      const csvResult = results.find((r: { status: string; name: string }) =>
        r.name && r.name.endsWith('.csv') && r.status === 'ready'
      );
      if (csvResult) {
        setTimeout(() => {
          const csvDocs = documents.filter(d => d.type === 'csv' && d.status === 'ready');
          if (csvDocs.length > 0) setSelectedCSV(csvDocs[0]);
        }, 500);
      }
    } catch {
      toast.error('Upload failed', { id: toastId });
    } finally { setUploading(false); }
  }, [documents]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: true,
  });

  async function deleteDocument(id: string, name: string) {
    if (!confirm('Delete "' + name + '"?')) return;
    await fetch('/api/ingest', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: id }) });
    removeDocument(id);
    if (selectedCSV?.id === id) setSelectedCSV(null);
    toast.success('Document deleted');
  }

  const filtered = documents.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  const stats = {
    total: documents.length,
    ready: documents.filter(d => d.status === 'ready').length,
    chunks: documents.reduce((sum, d) => sum + (d.chunkCount ?? 0), 0),
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-[#080c14]">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">Knowledge Base</h1>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-500 mt-0.5">manage · ingest · search</p>
          </div>
          <button onClick={loadDocuments} className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'DOCUMENTS', value: stats.total, icon: <Database size={12} />, color: 'text-cyan-400', border: 'border-cyan-500/20' },
            { label: 'INDEXED', value: stats.ready, icon: <CheckCircle2 size={12} />, color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'CHUNKS', value: stats.chunks.toLocaleString(), icon: <Layers size={12} />, color: 'text-amber-400', border: 'border-amber-500/20' },
          ].map(stat => (
            <div key={stat.label} className={cn('rounded-xl border bg-slate-50 dark:bg-slate-50 dark:bg-slate-900/50 p-4', stat.border)}>
              <div className={cn('flex items-center gap-1.5 mb-2', stat.color)}>
                {stat.icon}
                <span className="text-[9px] font-mono tracking-widest">{stat.label}</span>
              </div>
              <p className={cn('text-2xl font-bold font-mono', stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all cursor-pointer group',
            isDragActive
              ? 'border-cyan-400 bg-cyan-500/5'
              : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-100 dark:bg-white dark:bg-slate-800/30'
          )}
        >
          <input {...getInputProps()} />
          <div className={cn(
            'h-14 w-14 rounded-xl flex items-center justify-center mb-4 transition-all',
            isDragActive ? 'bg-cyan-500/20' : 'bg-slate-800 group-hover:bg-slate-700'
          )}>
            {uploading
              ? <Loader2 size={24} className="text-cyan-400 animate-spin" />
              : <Upload size={24} className={isDragActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'} />
            }
          </div>
          <p className="text-sm font-medium text-slate-300">
            {isDragActive ? 'Release to ingest' : 'Drop files to ingest'}
          </p>
          <p className="text-xs font-mono text-slate-500 mt-1">PDF · TXT · MD · CSV · DOCX</p>
          <div className="absolute top-3 right-3">
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-500">
              CSV → auto analytics
            </span>
          </div>
        </div>

        {/* CSV Dashboard */}
        {selectedCSV && <CSVDashboard doc={selectedCSV} onClose={() => setSelectedCSV(null)} />}

        {/* Document Library */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest">DOCUMENT LIBRARY</p>
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="filter..."
                className="pl-7 pr-3 py-1.5 text-xs font-mono rounded-lg border border-slate-700 bg-slate-100 dark:bg-slate-100 dark:bg-slate-800/50 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 w-40"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <File size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-xs font-mono">{search ? 'no matches' : 'no documents'}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => {
                    if (doc.type === 'csv' && doc.status === 'ready')
                      setSelectedCSV(prev => prev?.id === doc.id ? null : doc);
                  }}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg border p-3 transition-all',
                    doc.type === 'csv' && doc.status === 'ready' ? 'cursor-pointer' : '',
                    selectedCSV?.id === doc.id
                      ? 'border-cyan-500/40 bg-cyan-500/5'
                      : 'border-slate-200 bg-white dark:bg-white dark:bg-slate-900/30 hover:border-slate-700 hover:bg-slate-100 dark:bg-slate-100 dark:bg-slate-800/50'
                  )}
                >
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center">
                    {FILE_ICONS[doc.type] ?? <File size={14} className="text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{doc.name}</p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-500 mt-0.5">
                      {formatBytes(doc.size)} · {doc.chunkCount ?? 0} chunks · {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('flex items-center gap-1 text-[10px] font-mono', STATUS_COLORS[doc.status])}>
                      {STATUS_ICONS[doc.status]}
                      {doc.status}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); deleteDocument(doc.id, doc.name); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 transition-all"
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