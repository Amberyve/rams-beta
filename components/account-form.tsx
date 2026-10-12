'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/session';
import { Button, PageHeader, inputClass } from './ui';
import { useToast } from './toast';

export function AccountForm({ profile }: { profile: Profile }) {
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState(profile.full_name);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState<'' | 'name' | 'pw'>('');

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy('name');
    const { error } = await createClient().from('profiles').update({ full_name: name.trim() }).eq('id', profile.id);
    setBusy('');
    if (error) return toast('error', error.message);
    toast('success', 'Name updated.');
    router.refresh();
  }

  async function savePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast('error', 'Password must be at least 8 characters.');
    if (pw !== pw2) return toast('error', 'Passwords do not match.');
    setBusy('pw');
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy('');
    if (error) return toast('error', error.message);
    setPw(''); setPw2('');
    toast('success', 'Password changed.');
  }

  const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900';
  return (
    <div className="max-w-2xl">
      <PageHeader title="Account settings" description={profile.email ?? undefined} />
      <div className="space-y-6">
        <form onSubmit={saveName} className={card}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Profile</h2>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Display name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </label>
          <div className="mt-4 flex justify-end"><Button type="submit" loading={busy === 'name'} disabled={name.trim() === profile.full_name}>Save</Button></div>
        </form>
        <form onSubmit={savePw} className={card}>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Change password</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">New password</span>
              <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Confirm password</span>
              <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputClass} /></label>
          </div>
          <div className="mt-4 flex justify-end"><Button type="submit" loading={busy === 'pw'} disabled={!pw}>Update password</Button></div>
        </form>
      </div>
    </div>
  );
}
