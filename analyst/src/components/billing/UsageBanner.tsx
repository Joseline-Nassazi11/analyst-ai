// src/components/billing/UsageBanner.tsx
// Drop this into your main layout — it shows a warning when the user
// is close to their usage limit, and a hard limit modal when they hit it.
// No real payments — just UI that looks production-ready.

'use client';

import { useEffect, useState } from 'react';
import { Zap, X, ArrowRight, Sparkles, AlertTriangle, Crown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const FREE_TIER_LIMIT = 10; // messages per month
const WARN_AT = 80;          // show warning at 80%

interface UsageData {
  used: number;
  limit: number;
  plan: 'free' | 'pro';
}

function UpgradeModal({ usage, onClose }: { usage: UsageData; onClose: () => void }) {
  const isHardLimit = usage.used >= usage.limit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0d0d16] rounded-2xl shadow-2xl border border-indigo-200 dark:border-[#2a2a3a] overflow-hidden">

        {/* Gradient top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500" />

        {/* Close button — only if not hard limit */}
        {!isHardLimit && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <X size={16} />
          </button>
        )}

        <div className="p-8">
          {/* Icon */}
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-5">
            {isHardLimit
              ? <AlertTriangle size={24} className="text-amber-500" />
              : <Crown size={24} className="text-brand-500" />
            }
          </div>

          {/* Heading */}
          <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
            {isHardLimit ? "You've reached your limit" : "You're almost out of messages"}
          </h2>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            {isHardLimit
              ? `You've used all ${usage.limit} free messages this month. Upgrade to Pro to continue your research.`
              : `You've used ${usage.used} of ${usage.limit} free messages. Upgrade now to avoid interruptions.`
            }
          </p>

          {/* Usage bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{usage.used} messages used</span>
              <span>{usage.limit} limit</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  isHardLimit
                    ? 'bg-red-500'
                    : 'bg-gradient-to-r from-amber-400 to-orange-500'
                )}
                style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Free plan */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 opacity-60">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Free</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">$0</p>
              <p className="text-xs text-gray-400 mt-1">/month</p>
              <ul className="mt-3 space-y-1.5 text-xs text-gray-500">
                <li className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-gray-400" />
                  100 messages/mo
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-gray-400" />
                  5 documents
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-gray-400" />
                  GPT-4o Mini only
                </li>
              </ul>
            </div>

            {/* Pro plan */}
            <div className="relative rounded-xl border-2 border-brand-500 bg-gradient-to-br from-brand-500/5 to-purple-500/5 p-4">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-brand-500 to-purple-500 text-white text-[10px] font-semibold">
                  RECOMMENDED
                </span>
              </div>
              <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1">Pro</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">$12</p>
              <p className="text-xs text-gray-400 mt-1">/month</p>
              <ul className="mt-3 space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-1.5">
                  <Sparkles size={10} className="text-brand-500" />
                  Unlimited messages
                </li>
                <li className="flex items-center gap-1.5">
                  <Sparkles size={10} className="text-brand-500" />
                  Unlimited documents
                </li>
                <li className="flex items-center gap-1.5">
                  <Sparkles size={10} className="text-brand-500" />
                  All AI models
                </li>
              </ul>
            </div>
          </div>

          {/* CTA buttons */}
          <button
            onClick={() => {
              // In a real app this would go to Stripe checkout
              // For now just close and show a toast
              onClose();
              alert('💳 Billing coming soon! This is a demo of the upgrade flow.');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 shadow-lg shadow-brand-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
          >
            <Crown size={15} />
            Upgrade to Pro
            <ArrowRight size={14} />
          </button>

          {!isHardLimit && (
            <button
              onClick={onClose}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              Continue with free plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UsageBanner() {
  const [usage, setUsage]           = useState<UsageData | null>(null);
  const [dismissed, setDismissed]   = useState(false);
  const [showModal, setShowModal]   = useState(false);

  useEffect(() => {
        fetch('/api/usage')
        .then(r => r.json())
        .then(data => {
            console.log('Usage data:', data);
            data.used = data.limit - 2; // force to 80% for testing
            if (data && !data.error) {
            setUsage(data);
            if (data.used >= data.limit) setShowModal(true);
            }
        })
        .catch(e => console.error('Usage error:', e));
    }, []);

  if (!usage || usage.plan === 'pro') return null;

  const pct     = Math.round((usage.used / usage.limit) * 100);
  const isHard  = usage.used >= usage.limit;
  const isWarn  = pct >= WARN_AT;

  if (!isWarn && !isHard) return null;
  if (dismissed && !isHard) return null;

  return (
    <>
      {showModal && (
        <UpgradeModal
          usage={usage}
          onClose={() => { if (!isHard) setShowModal(false); }}
        />
      )}

      {/* Sticky banner */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-2.5 text-xs border-b transition-all',
        isHard
          ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'
          : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'
      )}>
        <Zap size={13} className="flex-shrink-0" />

        <div className="flex-1 flex items-center gap-3">
          <span>
            {isHard
              ? `You've reached your free limit (${usage.limit} messages). `
              : `${usage.used}/${usage.limit} free messages used (${pct}%). `
            }
          </span>

          {/* Mini progress bar */}
          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-32">
            <div className="flex-1 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className={cn('h-full rounded-full', isHard ? 'bg-red-500' : 'bg-amber-500')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-mono">{pct}%</span>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105',
            isHard
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          )}
        >
          <Crown size={11} /> Upgrade
        </button>

        {!isHard && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </>
  );
}