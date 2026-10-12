'use client';

import {
  ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Inbox, Pencil, Plus, Search, Trash2, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RESOURCES, canDelete, canEdit, type Column, type Role } from '@/lib/resources';
import { cn, formatDate, formatPeso, toCsv } from '@/lib/format';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Modal, PageHeader, inputClass } from './ui';
import { RecordForm, normalize, validate, type FormValues } from './record-form';
import { useToast } from './toast';

const PAGE_SIZE = 15;

export function Cell({ col, row }: { col: Column; row: any }) {
  const v = row[col.key];
  switch (col.kind) {
    case 'strong': return <span className="font-medium text-slate-900 dark:text-white">{v || '—'}</span>;
    case 'muted': return <span className="line-clamp-2 text-slate-500 dark:text-slate-400">{v || '—'}</span>;
    case 'date': return <span className="whitespace-nowrap tabular-nums">{formatDate(v)}</span>;
    case 'currency': return <span className="whitespace-nowrap tabular-nums">{formatPeso(v)}</span>;
    case 'status': return v === 'completed' ? <Badge tone="green">Completed</Badge> : <Badge tone="amber">Ongoing</Badge>;
    case 'relation': return <span>{v?.[col.relationKey!] ?? '—'}</span>;
    case 'avatar':
      return (
        <span className="flex items-center gap-3">
          <Avatar name={v} src={row.photo_url} size={32} />
          <span className="font-medium text-slate-900 dark:text-white">{v}</span>
        </span>
      );
    default: return <span>{v ?? '—'}</span>;
  }
}

export function ResourceManager({ resource, role }: { resource: string; role: Role }) {
  const cfg = RESOURCES[resource]!;
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(cfg.defaultSort);

  const [editing, setEditing] = useState<{ id?: number; values: FormValues } | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const buildQuery = useCallback((withCount: boolean) => {
    let q = supabase.from(cfg.table).select(cfg.select ?? '*', withCount ? { count: 'exact' } : undefined);
    if (debounced) {
      const term = debounced.replace(/[%,()]/g, ' ');
      q = q.or(cfg.searchKeys.map((k) => `${k}.ilike.%${term}%`).join(','));
    }
    for (const [k, v] of Object.entries(filters)) if (v) q = q.eq(k, v);
    return q.order(sort.key, { ascending: sort.ascending, nullsFirst: false }).order('id', { ascending: false });
  }, [supabase, cfg, debounced, filters, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count: c, error } = await buildQuery(true).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) toast('error', error.message);
    setRows(data ?? []);
    setCount(c ?? 0);
    setLoading(false);
  }, [buildQuery, page, toast]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setErrors({});
    setEditing({ values: Object.fromEntries(cfg.fields.map((f) => [f.key, f.type === 'tags' ? [] : ''])) });
  }
  function openEdit(row: any) {
    setErrors({});
    setViewing(null);
    setEditing({ id: row.id, values: Object.fromEntries(cfg.fields.map((f) => [f.key, row[f.key] ?? (f.type === 'tags' ? [] : '')])) });
  }

  async function save() {
    if (!editing) return;
    const errs = validate(cfg.fields, editing.values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const payload = normalize(cfg.fields, editing.values);
    const { error } = editing.id
      ? await supabase.from(cfg.table).update(payload).eq('id', editing.id)
      : await supabase.from(cfg.table).insert(payload);
    setSaving(false);
    if (error) return toast('error', error.message);
    toast('success', `${cfg.singular} ${editing.id ? 'updated' : 'added'}.`);
    setEditing(null);
    load();
  }

  async function remove() {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error } = await supabase.from(cfg.table).delete().eq('id', deleting.id);
    setDeleteBusy(false);
    if (error) return toast('error', error.message);
    toast('success', `${cfg.singular} deleted.`);
    setDeleting(null);
    setViewing(null);
    if (rows.length === 1 && page > 0) setPage(page - 1); else load();
  }

  async function exportCsv() {
    const { data, error } = await buildQuery(false).limit(5000);
    if (error) return toast('error', error.message);
    const flat = (data ?? []).map((r: any) => {
      const o: Record<string, unknown> = { ...r };
      for (const c of cfg.columns) if (c.kind === 'relation') o[c.key] = r[c.key]?.[c.relationKey!] ?? '';
      return o;
    });
    const cols = [...cfg.columns, ...cfg.fields.filter((f) => !cfg.columns.some((c) => c.key === f.key) && f.type !== 'image' && f.type !== 'relation')];
    const blob = new Blob([toCsv(flat, cols)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${cfg.table}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, ascending: !s.ascending } : { key, ascending: true }));

  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const activeFilters = Object.values(filters).filter(Boolean).length + (debounced ? 1 : 0);

  return (
    <>
      <PageHeader
        eyebrow={cfg.group}
        title={cfg.plural}
        description={cfg.description}
        actions={<>
          <Button variant="secondary" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
          {canEdit(role) && <Button onClick={openNew}><Plus className="h-4 w-4" /> Add {cfg.singular.toLowerCase()}</Button>}
        </>}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${cfg.plural.toLowerCase()}…`}
              aria-label={`Search ${cfg.plural}`}
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          {cfg.filters?.map((f) => (
            <select key={f.key} aria-label={f.label} value={filters[f.key] ?? ''} className={cn(inputClass, 'sm:w-44')}
              onChange={(e) => { setFilters((x) => ({ ...x, [f.key]: e.target.value })); setPage(0); }}>
              <option value="">Any {f.label.toLowerCase()}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
          {activeFilters > 0 && (
            <Button variant="ghost" onClick={() => { setQuery(''); setFilters({}); }}><X className="h-4 w-4" /> Clear</Button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                {cfg.columns.map((c) => {
                  const sortable = c.kind !== 'relation';
                  return (
                    <th key={c.key} scope="col" className={cn('px-4 py-3 font-semibold', c.hideOnMobile && 'hidden md:table-cell')}>
                      {sortable ? (
                        <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-800 dark:hover:text-white">
                          {c.label}
                          {sort.key === c.key && (sort.ascending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </button>
                      ) : c.label}
                    </th>
                  );
                })}
                {(canEdit(role) || canDelete(role)) && <th className="w-24 px-4 py-3"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && rows.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {cfg.columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-4', c.hideOnMobile && 'hidden md:table-cell')}>
                      <div className="skeleton h-4 w-3/4 rounded" />
                    </td>
                  ))}
                  {(canEdit(role) || canDelete(role)) && <td />}
                </tr>
              ))}
              {rows.map((row) => (
                <tr key={row.id} onClick={() => setViewing(row)}
                  className={cn('group cursor-pointer text-slate-700 transition hover:bg-navy-50/40 dark:text-slate-300 dark:hover:bg-slate-800/50', loading && 'opacity-60')}>
                  {cfg.columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3 align-middle', c.hideOnMobile && 'hidden md:table-cell')}>
                      <Cell col={c} row={row} />
                    </td>
                  ))}
                  {(canEdit(role) || canDelete(role)) && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        {canEdit(role) && (
                          <button aria-label="Edit" onClick={() => openEdit(row)} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-navy-700 dark:hover:bg-slate-700">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete(role) && (
                          <button aria-label="Delete" onClick={() => setDeleting(row)} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-rose-600 dark:hover:bg-slate-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && rows.length === 0 && (
          activeFilters
            ? <EmptyState icon={Search} title="No matches" text="Nothing matches your search or filters. Try a different term." />
            : <EmptyState icon={Inbox} title={`No ${cfg.plural.toLowerCase()} yet`} text={`Records you add will appear here.`}
                action={canEdit(role) && <Button onClick={openNew}><Plus className="h-4 w-4" /> Add the first one</Button>} />
        )}

        {/* Pagination */}
        {count > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500 dark:border-slate-800">
            <span>
              Showing <b className="text-slate-700 dark:text-slate-200">{page * PAGE_SIZE + 1}–{Math.min(count, (page + 1) * PAGE_SIZE)}</b> of{' '}
              <b className="text-slate-700 dark:text-slate-200">{count}</b>
            </span>
            <div className="flex items-center gap-1">
              <button aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
              <span className="px-2 tabular-nums">{page + 1} / {pages}</span>
              <button aria-label="Next page" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* View details */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? String(viewing[cfg.columns[0]!.key] ?? cfg.singular) : ''}
        description={cfg.singular}
        footer={<>
          {canDelete(role) && <Button variant="ghost" className="mr-auto text-rose-600" onClick={() => setDeleting(viewing)}><Trash2 className="h-4 w-4" /> Delete</Button>}
          <Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>
          {canEdit(role) && <Button onClick={() => openEdit(viewing)}><Pencil className="h-4 w-4" /> Edit</Button>}
        </>}>
        {viewing && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {cfg.fields.map((f) => {
              const rel = f.type === 'relation' ? cfg.columns.find((c) => c.kind === 'relation') : undefined;
              let display: React.ReactNode = viewing[f.key];
              if (f.type === 'image') display = viewing[f.key] ? <Avatar src={viewing[f.key]} name="" size={72} /> : null;
              else if (f.type === 'date') display = formatDate(viewing[f.key]);
              else if (f.type === 'currency') display = formatPeso(viewing[f.key]);
              else if (f.type === 'relation') display = rel ? viewing[rel.key]?.[rel.relationKey!] : viewing[f.key];
              else if (f.key === 'status') display = <Cell col={{ key: 'status', label: '', kind: 'status' }} row={viewing} />;
              if (f.type === 'image' && !display) return null;
              return (
                <div key={f.key} className={cn(f.wide && 'sm:col-span-2')}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{f.label}</dt>
                  <dd className="mt-1 whitespace-pre-line text-sm text-slate-800 dark:text-slate-100">{display || '—'}</dd>
                </div>
              );
            })}
          </dl>
        )}
      </Modal>

      {/* Add / edit */}
      <Modal open={!!editing} onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${cfg.singular.toLowerCase()}` : `Add ${cfg.singular.toLowerCase()}`}
        description="Fields marked * are required."
        footer={<>
          <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={save} loading={saving}>{editing?.id ? 'Save changes' : `Add ${cfg.singular.toLowerCase()}`}</Button>
        </>}>
        {editing && (
          <form onSubmit={(e) => { e.preventDefault(); save(); }}>
            <RecordForm fields={cfg.fields} values={editing.values} errors={errors} onChange={(values) => setEditing({ ...editing, values })} />
            <button type="submit" className="hidden" />
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={deleteBusy}
        title={`Delete ${cfg.singular.toLowerCase()}?`}
        message={`“${deleting?.[cfg.columns[0]!.key] ?? ''}” will be permanently removed. This can’t be undone.`} />
    </>
  );
}
