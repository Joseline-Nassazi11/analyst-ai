'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart2, MessageSquare, Coins, ThumbsUp, Zap, Brain, Send, AlertTriangle, TrendingUp } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface AnalyticsSummary {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  positiveRatings: number;
  negativeRatings: number;
  messagesByDay: { date: string; messages: number }[];
  tokensByModel: { model: string; tokens: number }[];
  costBreakdown?: { model: string; cost: number }[]; // ✅ ADDED
}

function Shimmer() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />)}
      </div>
      <div className="h-48 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
    </div>
  );
}

export default function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<{ nextWeekMessages: number; avgPerDay: number } | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);

  // Auto-refresh every 30 seconds
  useEffect(() => {
  const loadData = async () => {
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      return json;
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadInsights = async (json: any) => {
    if (!json || json.totalMessages === 0) return;
    setInsightLoading(true);
    try {
      const ir = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: json }),
      });
      const id = await ir.json();
      setAiInsight(id.insight);
      setAlerts(id.alerts ?? []);
      setPrediction(id.prediction ?? null);
    } catch { setAiInsight(null); }
    finally { setInsightLoading(false); }
  };

  loadData().then(json => { if (json) loadInsights(json); });

  const interval = setInterval(loadData, 30000);
  return () => clearInterval(interval);
}, []);

  async function askAnalytics() {
    if (!question.trim() || !data) return;
    setAsking(true);
    setAnswer('');
    try {
      const res = await fetch('/api/analytics/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, data }),
      });
      const json = await res.json();
      setAnswer(json.answer);
    } catch { setAnswer('Unable to analyze. Please try again.'); }
    finally { setAsking(false); }
  }

  if (loading) return <Shimmer />;

  if (!data || data.totalMessages === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <BarChart2 size={36} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">No analytics yet</p>
        <p className="text-xs mt-1">Start a research session to unlock insights</p>
      </div>
    );
  }

  const peakDay = data.messagesByDay.reduce((a, b) => a.messages > b.messages ? a : b, { date: 'N/A', messages: 0 });
  const topModel = data.tokensByModel[0];
  const engagementRate = data.totalMessages > 0 ? Math.round((data.positiveRatings / data.totalMessages) * 100) : 0;

  const STAT_CARDS = [
    { icon: <MessageSquare size={18} className="text-brand-500" />, label: 'Messages', value: data.totalMessages.toLocaleString() },
    { icon: <Zap size={18} className="text-amber-500" />, label: 'Total tokens', value: data.totalTokens.toLocaleString() },
    { icon: <Coins size={18} className="text-green-500" />, label: 'Est. cost', value: `$${data.totalCost.toFixed(4)}` },
    { icon: <ThumbsUp size={18} className="text-emerald-500" />, label: 'Positive ratings', value: data.positiveRatings },

    // ✅ NEW CARD
    { 
      icon: <TrendingUp size={18} className="text-purple-500" />, 
      label: 'Cost / message', 
      value: data.totalMessages > 0 
        ? `$${(data.totalCost / data.totalMessages).toFixed(5)}` 
        : '$0.00000'
    },
  ];

  const ratingData = [
    { name: 'Positive', value: data.positiveRatings },
    { name: 'Negative', value: data.negativeRatings },
    { name: 'Unrated', value: Math.max(0, data.totalMessages - data.positiveRatings - data.negativeRatings) },
  ].filter(d => d.value > 0);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Intelligence Dashboard
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Auto-updates every 30s</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse" />
          Live data
        </div>
      </div>

      {/* Smart Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* AI Intelligence Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-5">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 pointer-events-none" />
        <div className="relative">
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
            <Brain size={12} className="text-indigo-400" />
            AI Intelligence Analysis
          </p>
          {insightLoading ? (
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-4/5" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/5" />
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {aiInsight ?? 'Analyzing your usage patterns...'}
            </p>
          )}
        </div>
      </div>

      {/* Smart insight cards + prediction */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-gray-400">Peak Day</p>
          <p className="text-sm font-semibold mt-1">{peakDay.date}</p>
          <p className="text-xs text-gray-400">{peakDay.messages} messages</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-gray-400">Top Model</p>
          <p className="text-sm font-semibold mt-1 truncate">{topModel?.model ?? 'N/A'}</p>
          <p className="text-xs text-gray-400">{topModel?.tokens?.toLocaleString()} tokens</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-gray-400">Engagement</p>
          <p className="text-sm font-semibold mt-1">{engagementRate}%</p>
          <p className="text-xs text-gray-400">positive ratings</p>
        </div>
        {prediction && (
          <div className="glass rounded-xl p-4 border-brand-500/20">
            <p className="text-xs text-gray-400 flex items-center gap-1"><TrendingUp size={10} /> Next 7 days</p>
            <p className="text-sm font-semibold mt-1 text-brand-500">{prediction.nextWeekMessages} msgs</p>
            <p className="text-xs text-gray-400">{prediction.avgPerDay}/day avg</p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_CARDS.map(card => (
          <div key={card.label} className="relative overflow-hidden rounded-xl p-4 glass hover-lift">
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-indigo-500 to-purple-500 pointer-events-none" />
            <div className="relative">
              <div className="mb-2">{card.icon}</div>
              <p className="text-2xl font-bold tracking-tight">{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Message activity */}
      <div className="rounded-xl glass p-5 group transition-all duration-300 hover:scale-[1.005]">
        <p className="text-sm font-semibold mb-1">Message activity</p>
        {peakDay.messages > 0 && <p className="text-xs text-gray-400 mb-4">Peak: {peakDay.date} — {peakDay.messages} messages</p>}
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data.messagesByDay}>
            <defs>
              <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: 'rgba(255,255,255,0.95)' }} />
            <Area type="natural" dataKey="messages" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorMsgs)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Tokens by model */}
        {data.tokensByModel.length > 0 && (
          <div className="rounded-xl glass p-5 group transition-all duration-300 hover:scale-[1.01]">
            <p className="text-sm font-semibold mb-4">Tokens by model</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.tokensByModel} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="model" tick={{ fontSize: 10 }} width={80} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="tokens" radius={[0, 4, 4, 0]}>
                  {data.tokensByModel.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Response ratings */}
        {ratingData.length > 0 && (
          <div className="rounded-xl glass p-5 group transition-all duration-300 hover:scale-[1.01]">
            <p className="text-sm font-semibold mb-4">Response ratings</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={ratingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {ratingData.map((_, i) => (
                    <Cell key={i} fill={['#10b981', '#ef4444', '#d1d5db'][i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>

      {/* ✅ Cost breakdown OUTSIDE the grid */}
      {data.costBreakdown && data.costBreakdown.length > 0 && (
        <div className="rounded-xl glass p-5">
          <p className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Coins size={14} className="text-green-500" />
            Cost breakdown by model
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Total spend: ${data.totalCost.toFixed(6)} across all sessions
          </p>

          <div className="space-y-3">
            {data.costBreakdown.map((entry, i) => {
              const pct = data.totalCost > 0
                ? Math.round((entry.cost / data.totalCost) * 100)
                : 0;

              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400 truncate">
                      {entry.model}
                    </span>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-gray-400">{pct}%</span>
                      <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                        ${entry.cost.toFixed(6)}
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>

          <p className="text-[10px] text-gray-400 mt-4">
            * Cost estimates based on published token pricing per provider
          </p>
        </div>
      )}

      {/* Ask Analytics */}
      <div className="rounded-xl glass p-5">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Brain size={14} className="text-brand-500" />
          Ask your analytics
        </p>
        <p className="text-xs text-gray-400 mb-3">Ask anything about your usage data in plain English</p>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askAnalytics()}
            className="flex-1 rounded-xl border border-white/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. Which model costs me the most? Why did usage spike?"
          />
          <button
            onClick={askAnalytics}
            disabled={asking || !question.trim()}
            className="px-4 py-2 bg-gradient-to-r from-brand-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Send size={13} />
            {asking ? 'Thinking...' : 'Ask'}
          </button>
        </div>
        {answer && (
          <div className="mt-3 rounded-xl bg-brand-500/5 border border-brand-500/20 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {answer}
          </div>
        )}
      </div>
    </div>
  );
}