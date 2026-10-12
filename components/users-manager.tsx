'use client';

import { KeyRound, Plus, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { formatDate } from '@/lib/format';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Modal, PageHeader, inputClass } from './ui';
import { useToast } from './toast';

type U = { id: string; full_name: string; email: string; role: 'admin' | 'rsd' | 'user'; created_at: string; last_sign_in_at: string | null };

const ROLES = [
  { value: 'admin', label: 'Administrator', desc: 'Full access, manages accounts and can delete records' },
  { value: 'rsd', label: 'RSD Staff', desc: 'Can add and edit records' },
  { value: 'user', label: 'Viewer', desc: 'Can view and export records' },
] as const;
const TONE = { admin: 'navy', rsd: 'amber', user: 'slate' } as const;

async function api(method: string, body?: unknown, query = '') {
  const res = await fetch(`/api/users${query}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json;
}

export function UsersManager() {
  const toast = useToast();
  const [users, setUsers] = useState<U[] | null>(null);
  const [me, setMe] = useState('');
  const [form, setForm] = useState<null | { mode: 'new' | 'edit' | 'password'; user?: U; full_name: string; email: string; role: string; password: string }>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<U | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api('GET');
      setUsers(d.users);
      setMe(d.me);
    } catch (e: any) {
      toast('error', e.message);
      setUsers([]);
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      if (form.mode === 'new') await api('POST', { full_name: form.full_name, email: form.email, role: form.role, password: form.password });
      else if (form.mode === 'edit') await api('PATCH', { id: form.user!.id, full_name: form.full_name, role: form.role });
      else await api('PATCH', { id: form.user!.id, password: form.password });
      toast('success', form.mode === 'new' ? 'Account created.' : form.mode === 'password' ? 'Password reset.' : 'Account updated.');
      setForm(null);
      load();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api('DELETE', undefined, `?id=${deleting.id}`);
      toast('success', 'Account deleted.');
      setDeleting(null);
      load();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Administration" title="User Accounts" description="Create accounts and decide who can view, edit or administer RAMS."
        actions={<Button onClick={() => setForm({ mode: 'new', full_name: '', email: '', role: 'user', password: '' })}><Plus className="h-4 w-4" /> New account</Button>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r.value} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <Badge tone={TONE[r.value]}>{r.label}</Badge>
              <span className="font-display text-lg font-bold tabular-nums text-slate-900 dark:text-white">{users?.filter((u) => u.role === r.value).length ?? '–'}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{r.desc}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        {users === null ? (
          <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : users.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No accounts" text="Check that SUPABASE_SERVICE_ROLE_KEY is set in your environment." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Avatar name={u.full_name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                    <span className="truncate">{u.full_name}</span>{u.id === me && <span className="text-xs font-normal text-slate-400">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-slate-500">{u.email}</p>
                </div>
                <div className="hidden text-right text-xs text-slate-400 md:block">
                  <p>Last sign-in</p>
                  <p className="text-slate-600 dark:text-slate-300">{u.last_sign_in_at ? formatDate(u.last_sign_in_at) : 'Never'}</p>
                </div>
                <Badge tone={TONE[u.role]}>{ROLES.find((r) => r.value === u.role)!.label}</Badge>
                <div className="flex gap-1">
                  <button aria-label="Edit account" onClick={() => setForm({ mode: 'edit', user: u, full_name: u.full_name, email: u.email, role: u.role, password: '' })} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy-700 dark:hover:bg-slate-800"><UserCog className="h-4 w-4" /></button>
                  <button aria-label="Reset password" onClick={() => setForm({ mode: 'password', user: u, full_name: u.full_name, email: u.email, role: u.role, password: '' })} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy-700 dark:hover:bg-slate-800"><KeyRound className="h-4 w-4" /></button>
                  {u.id !== me && <button aria-label="Delete account" onClick={() => setDeleting(u)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} size="sm"
        title={form?.mode === 'new' ? 'New account' : form?.mode === 'password' ? `Reset password` : 'Edit account'}
        description={form?.mode !== 'new' ? form?.user?.email : 'The user can sign in right away with this password.'}
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" form="user-form" loading={saving}>Save</Button></>}>
        {form && (
          <form id="user-form" onSubmit={submit} className="space-y-4">
            {form.mode !== 'password' && (
              <>
                <Labeled label="Full name"><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} /></Labeled>
                {form.mode === 'new' && <Labeled label="Email"><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="name@isatu.edu.ph" /></Labeled>}
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Role</legend>
                  <div className="space-y-2">
                    {ROLES.map((r) => (
                      <label key={r.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${form.role === r.value ? 'border-navy-500 bg-navy-50/60 dark:bg-navy-950' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}>
                        <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={() => setForm({ ...form, role: r.value })} className="mt-0.5 accent-navy-700"
                          disabled={form.user?.id === me && r.value !== 'admin'} />
                        <span><span className="block text-sm font-medium text-slate-800 dark:text-white">{r.label}</span><span className="text-xs text-slate-500">{r.desc}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            {form.mode !== 'edit' && (
              <Labeled label={form.mode === 'new' ? 'Temporary password' : 'New password'}>
                <input type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} placeholder="At least 8 characters" autoComplete="new-password" />
              </Labeled>
            )}
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={busy}
        title="Delete account?" message={`${deleting?.full_name} (${deleting?.email}) will no longer be able to sign in.`} />
    </>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>{children}</label>;
}
