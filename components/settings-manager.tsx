'use client';

import { Building2, MapPin, Microscope, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button, ConfirmDialog, PageHeader, inputClass } from './ui';
import { useToast } from './toast';

type ListKey = 'campuses' | 'colleges' | 'research_centers';
type LookupItem = { id: number; name: string };
type Lists = Record<ListKey, LookupItem[]>;

const LISTS: { key: ListKey; title: string; description: string; singular: string; icon: React.ElementType }[] = [
  { key: 'campuses', title: 'Campuses', description: 'Campus options available on researcher records.', singular: 'campus', icon: MapPin },
  { key: 'colleges', title: 'Colleges', description: 'College options available on researcher records.', singular: 'college', icon: Building2 },
  { key: 'research_centers', title: 'Research Centers', description: 'Research center options available on researcher records.', singular: 'research center', icon: Microscope },
];

async function api(method: string, body?: unknown, query = '') {
  const response = await fetch(`/api/settings/lookups${query}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Request failed');
  return result;
}

export function SettingsManager() {
  const toast = useToast();
  const [lists, setLists] = useState<Lists | null>(null);
  const [drafts, setDrafts] = useState<Record<ListKey, string>>({ campuses: '', colleges: '', research_centers: '' });
  const [editing, setEditing] = useState<{ key: ListKey; id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState<{ key: ListKey; item: LookupItem } | null>(null);
  const [busy, setBusy] = useState('');
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await api('GET');
      setLists(result.lookups);
      setLoadError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load reference lists.';
      setLoadError(message);
      toast('error', message);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function addItem(key: ListKey, event: React.FormEvent) {
    event.preventDefault();
    const name = drafts[key].trim();
    if (!name) return;
    setBusy(`add:${key}`);
    try {
      const result = await api('POST', { list: key, name });
      setLists((current) => current && { ...current, [key]: [...current[key], result.item].sort((a, b) => a.name.localeCompare(b.name)) });
      setDrafts((current) => ({ ...current, [key]: '' }));
      toast('success', `${name} added.`);
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Could not add list item.');
    } finally {
      setBusy('');
    }
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const { key, id, name } = editing;
    setBusy(`edit:${id}`);
    try {
      const result = await api('PATCH', { list: key, id, name });
      setLists((current) => current && {
        ...current,
        [key]: current[key].map((item) => item.id === id ? result.item : item).sort((a, b) => a.name.localeCompare(b.name)),
      });
      setEditing(null);
      toast('success', 'List item updated.');
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Could not update list item.');
    } finally {
      setBusy('');
    }
  }

  async function removeItem() {
    if (!deleting) return;
    const { key, item } = deleting;
    setBusy(`delete:${item.id}`);
    try {
      await api('DELETE', undefined, `?list=${key}&id=${item.id}`);
      setLists((current) => current && ({ ...current, [key]: current[key].filter((entry) => entry.id !== item.id) }));
      setDeleting(null);
      toast('success', `${item.name} removed.`);
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Could not remove list item.');
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageHeader eyebrow="Administration" title="Setting" description="Manage the reference lists used when adding researchers." />

      {loadError ? (
        <div role="alert" className="border-y border-rose-200 py-5 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">{loadError}</div>
      ) : lists === null ? (
        <div className="space-y-4">{LISTS.map(({ key }) => <div key={key} className="skeleton h-28 rounded-lg" />)}</div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {LISTS.map(({ key, title, description, singular, icon: Icon }) => (
            <section key={key} className="py-6 first:pt-0">
              <div className="mb-4 flex items-start gap-3">
                <span className="mt-0.5 text-navy-600 dark:text-navy-300"><Icon className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
                  <p className="text-sm text-slate-500">{description}</p>
                </div>
              </div>

              <form onSubmit={(event) => addItem(key, event)} className="mb-3 flex max-w-2xl gap-2">
                <input value={drafts[key]} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
                  maxLength={120} aria-label={`New ${singular}`} placeholder={`Add ${singular}`} className={inputClass} />
                <Button type="submit" loading={busy === `add:${key}`} disabled={!drafts[key].trim()}><Plus className="h-4 w-4" /> Add</Button>
              </form>

              <ul className="max-w-2xl divide-y divide-slate-100 border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {lists[key].length === 0 ? (
                  <li className="py-3 text-sm text-slate-500">No {title.toLowerCase()} added.</li>
                ) : lists[key].map((item) => (
                  <li key={item.id} className="flex min-h-12 items-center justify-between gap-3 py-2">
                    {editing?.key === key && editing.id === item.id ? (
                      <form onSubmit={saveEdit} className="flex flex-1 gap-2">
                        <input autoFocus value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                          maxLength={120} aria-label={`Edit ${singular}`} className={inputClass} />
                        <Button type="submit" aria-label="Save changes" loading={busy === `edit:${item.id}`} disabled={!editing.name.trim()}><Save className="h-4 w-4" /></Button>
                        <Button type="button" variant="secondary" aria-label="Cancel editing" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                      </form>
                    ) : <>
                      <span className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-200">{item.name}</span>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" aria-label={`Edit ${item.name}`} title="Edit" onClick={() => setEditing({ key, id: item.id, name: item.name })}
                          className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-navy-700 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                        <button type="button" aria-label={`Delete ${item.name}`} title="Delete" onClick={() => setDeleting({ key, item })}
                          className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={removeItem} loading={!!busy}
        title="Remove list item?" message={`${deleting?.item.name} will be removed from the ${deleting ? LISTS.find((list) => list.key === deleting.key)?.title.toLowerCase() : 'reference'} list. Items in use by researchers cannot be removed.`} />
    </>
  );
}