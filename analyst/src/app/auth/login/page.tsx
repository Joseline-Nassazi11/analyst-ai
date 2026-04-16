'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/supabase';
import { Terminal, Mail, Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { toast.error(error.message); }
      else { toast.success('Account created! Check your email to verify.'); setMode('login'); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); }
      else { router.replace('/'); }
    }
    setLoading(false);
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] flex items-center justify-center p-4">

      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f020_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f020_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b30_1px,transparent_1px),linear-gradient(to_bottom,#1e293b30_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-14 w-14 rounded-2xl bg-sky-500/10 dark:bg-cyan-500/10 border border-sky-500/20 dark:border-cyan-500/20 flex items-center justify-center mb-4">
            <Terminal size={24} className="text-sky-600 dark:text-cyan-400" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-50 dark:border-[#080c14]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Analyst AI</h1>
          <p className="text-xs font-mono text-slate-400 mt-1 tracking-wider">RESEARCH OS v2.0</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1117] p-8 shadow-sm">

          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/50 p-1 mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 text-xs font-mono transition-all ${
                  mode === m
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-cyan-500 focus:border-transparent font-mono transition-all"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 pl-10 pr-10 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-cyan-500 focus:border-transparent font-mono transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-600 dark:bg-cyan-500 hover:bg-sky-500 dark:hover:bg-cyan-400 py-3 text-sm font-bold text-white dark:text-slate-900 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 dark:shadow-cyan-500/20 mt-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-[#0d1117] px-3 text-[10px] font-mono text-slate-400">or</span>
            </div>
          </div>

          {/* Google */}
          <button
            onClick={signInWithGoogle}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <Shield size={11} className="text-slate-400" />
          <p className="text-[10px] font-mono text-slate-400">
            Encrypted & stored securely via Supabase
          </p>
        </div>
      </div>
    </div>
  );
}