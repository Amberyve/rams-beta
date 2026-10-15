'use client';

import { FileSpreadsheet, KeyRound, Plus, ShieldCheck, Trash2, Upload, UserCog } from 'lucide-react';
import readXlsxFile from 'read-excel-file/browser';
import { useCallback, useEffect, useState } from 'react';
import { formatDate } from '@/lib/format';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Modal, PageHeader, inputClass } from './ui';
import { useToast } from './toast';

type U = { id: string; full_name: string; email: string; role: 'admin' | 'rsd' | 'user'; created_at: string; last_sign_in_at: string | null };
type ImportRow = { row: number; full_name: string; email: string; role: U['role']; password: string; errors: string[] };
type ImportResult = { imported: number; failures: { row: number; email: string; error: string }[] };

const ROLES = [
  { value: 'admin', label: 'Administrator', desc: 'Full access, manages accounts and can delete records' },
  { value: 'rsd', label: 'RSD Staff', desc: 'Can add and edit records' },
  { value: 'user', label: 'Viewer', desc: 'Can view and export records' },
] as const;
const TONE = { admin: 'navy', rsd: 'amber', user: 'slate' } as const;

function normalizeHeader(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseRole(value: unknown): U['role'] | null {
  const role = String(value ?? '').trim().toLowerCase().replace(/[^a-z]/g, '');
  if (!role || role === 'user' || role === 'viewer') return 'user';
  if (role === 'admin' || role === 'administrator') return 'admin';
  if (role === 'rsd' || role === 'rsdstaff') return 'rsd';
  return null;
}

async function api(method: string, body?: unknown, query = '') {
  const res = await fetch(`/api/users${query}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json;
}

export function UsersManager() {
  const toast = useToast();
  const [users, setUsers] = useState<U[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState('');
  const [form, setForm] = useState<null | { mode: 'new' | 'edit' | 'password'; user?: U; full_name: string; email: string; role: string; password: string }>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<U | null>(null);
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api('GET');
      setUsers(d.users);
      setMe(d.me);
      setLoadError(null);
    } catch (e: any) {
      toast('error', e.message);
      setLoadError(e.message);
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  function closeImport() {
    if (importBusy) return;
    setImportOpen(false);
    setImportRows([]);
    setImportFileName('');
    setImportResult(null);
  }

  async function readImportFile(file?: File) {
    setImportRows([]);
    setImportFileName('');
    setImportResult(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'Choose an Excel file smaller than 5 MB.');
      return;
    }

    try {
      const sheet = (await readXlsxFile(file))[0]?.data;
      if (!sheet || sheet.length < 2) throw new Error('The first worksheet needs a header row and at least one account row.');
      const headers = sheet[0].map(normalizeHeader);
      const findColumn = (...names: string[]) => headers.findIndex((header) => names.includes(header));
      const nameColumn = findColumn('full_name', 'name', 'fullname');
      const emailColumn = findColumn('email', 'email_address');
      const passwordColumn = findColumn('password', 'temporary_password');
      const roleColumn = findColumn('role', 'account_role');
      if (nameColumn < 0 || emailColumn < 0 || passwordColumn < 0) {
        throw new Error('Required columns: full_name, email, password. The role column is optional and defaults to user.');
      }

      const dataRows = sheet.slice(1).map((cells, index) => ({ cells, row: index + 2 }))
        .filter(({ cells }) => cells.some((cell) => String(cell ?? '').trim()));
      if (!dataRows.length) throw new Error('No account rows found below the header.');
      if (dataRows.length > 250) throw new Error('Import is limited to 250 accounts at a time.');

      const seenEmails = new Set<string>();
      const parsed = dataRows.map(({ cells, row }) => {
        const full_name = String(cells[nameColumn] ?? '').trim();
        const email = String(cells[emailColumn] ?? '').trim().toLowerCase();
        const password = String(cells[passwordColumn] ?? '');
        const role = parseRole(roleColumn < 0 ? '' : cells[roleColumn]);
        const errors: string[] = [];
        if (!full_name) errors.push('Name is required.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Enter a valid email.');
        if (password.length < 8) errors.push('Password must be at least 8 characters.');
        if (!role) errors.push('Role must be admin, rsd, or user.');
        if (email && seenEmails.has(email)) errors.push('Duplicate email in this file.');
        if (email) seenEmails.add(email);
        return { row, full_name, email, role: role ?? 'user', password, errors };
      });
      setImportRows(parsed);
      setImportFileName(file.name);
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Could not read this Excel file.');
    }
  }

  async function importAccounts() {
    const ready = importRows.filter((row) => row.errors.length === 0);
    if (!ready.length) return;
    setImportBusy(true);
    try {
      const result = await api('POST', {
        users: ready.map(({ row, full_name, email, role, password }) => ({ row, full_name, email, role, password })),
      }) as ImportResult;
      setImportResult(result);
      const failures = new Map(result.failures.map((failure) => [failure.row, failure.error]));
      setImportRows(importRows.filter((row) => row.errors.length > 0 || failures.has(row.row)).map((row) => {
        const error = failures.get(row.row);
        return error ? { ...row, errors: [...row.errors, error] } : row;
      }));
      toast(result.failures.length ? 'error' : 'success', `${result.imported} account${result.imported === 1 ? '' : 's'} imported${result.failures.length ? `; ${result.failures.length} failed` : '.'}`);
      if (result.imported) await load();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Could not import accounts.');
    } finally {
      setImportBusy(false);
    }
  }

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
        actions={<>
          <Button variant="secondary" onClick={() => { setImportOpen(true); setImportRows([]); setImportFileName(''); setImportResult(null); }}><Upload className="h-4 w-4" /> Import New Account</Button>
          <Button onClick={() => setForm({ mode: 'new', full_name: '', email: '', role: 'user', password: '' })}><Plus className="h-4 w-4" /> Add New Account</Button>
        </>} />

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
        {loadError ? (
          <EmptyState icon={ShieldCheck} title="Unable to load accounts" text={loadError} />
        ) : users === null ? (
          <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : users.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No accounts" text="Create an account to get started." />
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

      <Modal open={importOpen} onClose={closeImport} size="lg" title="Import New Account" description="Review spreadsheet rows before creating accounts. Passwords are never shown in the preview."
        footer={<>
          <Button variant="secondary" onClick={closeImport} disabled={importBusy}>Close</Button>
          <Button onClick={importAccounts} loading={importBusy} disabled={!importRows.some((row) => row.errors.length === 0)}>
            Import {importRows.filter((row) => row.errors.length === 0).length} accounts
          </Button>
        </>}>
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100"><FileSpreadsheet className="h-4 w-4 text-navy-600" /> Excel format</div>
            <p className="mt-2 text-slate-600 dark:text-slate-300">Use a .xlsx workbook with columns <strong>full_name</strong>, <strong>email</strong>, <strong>password</strong>, and optionally <strong>role</strong>.</p>
            <p className="mt-1 text-xs text-slate-500">Passwords need at least 8 characters. Roles: admin, rsd, or user. Blank roles default to user. Maximum 250 rows; duplicate or existing emails will fail.</p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Excel workbook (.xlsx)</span>
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => readImportFile(event.target.files?.[0])}
              className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-4 file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-slate-100" />
          </label>
          {importFileName && <p className="text-xs text-slate-500">{importFileName}</p>}

          {importResult && <div role="status" className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
            <p className="font-medium text-slate-800 dark:text-slate-100">{importResult.imported} imported, {importResult.failures.length} failed.</p>
            {importResult.failures.length > 0 && <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-rose-700 dark:text-rose-300">
              {importResult.failures.map((failure) => <li key={`${failure.row}-${failure.email}`}>Row {failure.row} ({failure.email || 'no email'}): {failure.error}</li>)}
            </ul>}
          </div>}

          {importRows.length > 0 && <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              <span className="font-medium text-slate-800 dark:text-slate-100">Preview</span>
              <span className="text-xs text-slate-500">{importRows.filter((row) => row.errors.length === 0).length} ready · {importRows.filter((row) => row.errors.length > 0).length} with issues</span>
            </div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-800"><tr>
                  <th className="px-3 py-2 font-medium">Row</th><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Email</th><th className="px-3 py-2 font-medium">Role</th><th className="px-3 py-2 font-medium">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {importRows.map((row) => <tr key={row.row}>
                    <td className="px-3 py-2 text-slate-500">{row.row}</td>
                    <td className="max-w-32 truncate px-3 py-2 text-slate-800 dark:text-slate-200">{row.full_name || '—'}</td>
                    <td className="max-w-40 truncate px-3 py-2 text-slate-600 dark:text-slate-300">{row.email || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.role}</td>
                    <td className={`px-3 py-2 ${row.errors.length ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{row.errors.join(' ') || 'Ready'}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>}
        </div>
      </Modal>

      <Modal open={!!form} onClose={() => setForm(null)} size="sm"
        title={form?.mode === 'new' ? 'Add New Account' : form?.mode === 'password' ? `Reset password` : 'Edit account'}
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
