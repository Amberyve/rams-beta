'use client';

import { Eye, EyeOff, Lightbulb, Lock, Mail, FlaskConical, Users } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, inputClass } from '@/components/ui';
import { cn } from '@/lib/format';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message);
      return;
    }
    const next = params.get('next');
    router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
    router.refresh();
  }

  async function forgot() {
    setError('');
    if (!email.trim()) return setError('Enter your email above first, then tap “Forgot password”.');
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/account`,
    });
    if (error) setError(error.message); else setResetSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">{error}</div>}
      {resetSent && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Check your inbox for a password reset link.</div>}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@isatu.edu.ph" className={cn(inputClass, 'h-11 pl-9')} />
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
          <button type="button" onClick={forgot} className="text-xs font-medium text-navy-600 hover:text-navy-800 dark:text-navy-300">Forgot password?</button>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} className={cn(inputClass, 'h-11 pl-9 pr-10')} />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-600">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" loading={loading} className="h-11 w-full">Sign in</Button>
      <p className="text-center text-xs text-slate-500">Accounts are issued by the RAMS administrator.</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-navy-950 lg:block">
        <Image src="/campus.jpg" alt="" fill priority className="object-cover opacity-40" sizes="55vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/70 to-navy-900/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <Image src="/isat-logo.png" alt="ISAT U seal" width={52} height={52} />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gold-300">Iloilo Science and Technology University</p>
              <p className="text-xs text-navy-200">Research and Development Office</p>
            </div>
          </div>
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
              Every invention, researcher,<br />and lab — <span className="text-gold-400">in one place.</span>
            </h1>
            <p className="mt-4 max-w-md text-navy-100/80">The Research Asset Management System keeps the university’s intellectual property, people and physical resources searchable and up to date.</p>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {[
                { icon: Lightbulb, label: 'Intellectual Property' },
                { icon: Users, label: 'Researchers & Students' },
                { icon: FlaskConical, label: 'Labs & Equipment' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <Icon className="h-5 w-5 text-gold-400" />
                  <p className="mt-2 text-xs font-medium text-navy-100">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <Image src="/isat-logo.png" alt="ISAT U seal" width={64} height={64} className="mb-4 lg:hidden" />
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sign in to RAMS</h2>
            <p className="mt-1 text-sm text-slate-500">Use your ISAT U account credentials.</p>
          </div>
          <Suspense><LoginForm /></Suspense>
        </div>
      </div>
    </div>
  );
}
