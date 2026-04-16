'use client';
import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Terminal, Upload, MessageSquare, FileText, Mic, Layers } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const STEPS = [
  {
    icon: <Terminal size={20} />,
    title: 'Welcome to Analyst AI',
    description: 'Your personal AI research assistant. Ask questions, analyze documents, search the web, and generate professional reports — all in one place.',
    tip: 'No experience needed — just type or speak your question naturally!',
    color: 'text-sky-600 dark:text-cyan-400',
    bg: 'bg-sky-500/10 dark:bg-cyan-500/10',
  },
  {
    icon: <Upload size={20} />,
    title: 'Upload your documents',
    description: 'Go to the Documents tab and drag and drop your files (PDF, Word, CSV, TXT). The AI will read, chunk, and index them instantly.',
    tip: 'Try uploading a report, a CV, or any document you want to analyze.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: <MessageSquare size={20} />,
    title: 'Ask research questions',
    description: 'Click "new session" then type your question. Ask things like "Summarize this document" or "What are the key findings from all uploaded files?"',
    tip: 'You can also click the microphone button to speak your question!',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: <FileText size={20} />,
    title: 'Generate reports',
    description: 'Ask the AI to "Generate a professional research report" and it will create a downloadable Word document with all findings, citations, and sources.',
    tip: 'Reports are saved in the Reports tab for later download.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: <Mic size={20} />,
    title: 'Voice input ready',
    description: 'Click the microphone button in the chat input to speak instead of type. Works best in Chrome or Edge browser.',
    tip: 'Speak clearly and naturally — the AI understands full sentences.',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
  },
  {
    icon: <Layers size={20} />,
    title: "You're all set!",
    description: 'Explore all tabs: Documents, Compare, Reports, Citations, and Analytics. Everything is automatically saved to your account.',
    tip: 'Use "new session" to start a fresh research topic anytime.',
    color: 'text-sky-600 dark:text-cyan-400',
    bg: 'bg-sky-500/10 dark:bg-cyan-500/10',
  },
];

export default function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0d1117] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Progress bar */}
        <div className="h-0.5 bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-sky-500 dark:bg-cyan-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step counter + close */}
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 tracking-widest">
            STEP {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>
          <button
            onClick={onComplete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-4 text-center">

          {/* Icon */}
          <div className={cn(
            'h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-all',
            current.bg, current.color
          )}>
            {current.icon}
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 tracking-tight">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
            {current.description}
          </p>

          {/* Tip */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono mb-6 text-left">
            <span className="text-sky-600 dark:text-cyan-400 font-semibold">TIP </span>
            {current.tip}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  i === step
                    ? 'w-6 bg-sky-500 dark:bg-cyan-400'
                    : 'w-1 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                )}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-mono"
              >
                <ChevronLeft size={14} /> back
              </button>
            )}
            <button
              onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 dark:bg-cyan-500 hover:bg-sky-500 dark:hover:bg-cyan-400 text-white dark:text-slate-900 text-sm font-bold transition-all shadow-md shadow-sky-500/20 dark:shadow-cyan-500/20"
            >
              {isLast ? "Let's go!" : 'Next'}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>

          {!isLast && (
            <button
              onClick={onComplete}
              className="mt-3 text-xs font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}