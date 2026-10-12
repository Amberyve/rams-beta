'use client';

import { MapPin, Plus, Search, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RESEARCHER_FIELDS, canEdit, type Role } from '@/lib/resources';
import { cn } from '@/lib/format';
import { Avatar, Button, EmptyState, Modal, PageHeader, inputClass } from './ui';
import { RecordForm, normalize, validate, type FormValues } from './record-form';
import { useToast } from './toast';

type Researcher = {
  id: number; full_name: string; email: string | null; college: string | null; campus: string | null;
  expertise: string | null; specializations: string[]; photo_url: string | null; research_projects: { count: number }[];
};

export function ResearchersDirectory({ role }: { role: Role }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const router = useRouter();
  const [people, setPeople] = useState<Researcher[] | null>(null);
  const [q, setQ] = useState('');
  const [college, setCollege] = useState('');
  const [adding, setAdding] = useState<FormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('researchers')
      .select('id, full_name, email, college, campus, expertise, specializations, photo_url, research_projects(count)')
      .order('full_name')
      .then(({ data, error }) => {
        if (error) toast('error', error.message);
        setPeople((data as any) ?? []);
      });
  }, [supabase, toast]);

  const colleges = useMemo(() => Array.from(new Set((people ?? []).map((p) => p.college).filter(Boolean))) as string[], [people]);
  const shown = useMemo(() => {
    const term = q.toLowerCase().trim();
    return (people ?? []).filter((p) =>
      (!college || p.college === college) &&
      (!term || [p.full_name, p.expertise, p.college, ...(p.specializations ?? [])].some((v) => v?.toLowerCase().includes(term))));
  }, [people, q, college]);

  async function save() {
    if (!adding) return;
    const errs = validate(RESEARCHER_FIELDS, adding);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const { data, error } = await supabase.from('researchers').insert(normalize(RESEARCHER_FIELDS, adding)).select('id').single();
    setSaving(false);
    if (error) return toast('error', error.message);
    toast('success', 'Researcher added.');
    router.push(`/researchers/${data.id}`);
  }

  return (
    <>
      <PageHeader eyebrow="People" title="Faculty Researchers"
        description="Directory of faculty experts, their qualifications, specializations and research."
        actions={canEdit(role) && (
          <Button onClick={() => { setErrors({}); setAdding({ researcher_type: 'Faculty', education: [], specializations: [] }); }}>
            <Plus className="h-4 w-4" /> Add researcher
          </Button>
        )} />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search researchers"
            placeholder="Search by name, expertise or specialization…" className={cn(inputClass, 'pl-9')} />
        </div>
        <select value={college} onChange={(e) => setCollege(e.target.value)} aria-label="College" className={cn(inputClass, 'sm:w-72')}>
          <option value="">All colleges</option>
          {colleges.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {people === null ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <EmptyState icon={UserRound} title={people.length ? 'No matches' : 'No researchers yet'}
            text={people.length ? 'Try a different name or specialization.' : 'Add faculty researchers to build the expert directory.'} />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <Link key={p.id} href={`/researchers/${p.id}`}
              className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-navy-700">
              <div className="flex items-start gap-4">
                <Avatar name={p.full_name} src={p.photo_url} size={56} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-base font-semibold text-slate-900 group-hover:text-navy-700 dark:text-white dark:group-hover:text-navy-200">{p.full_name}</h3>
                  <p className="line-clamp-2 text-sm text-slate-500">{p.expertise || 'Faculty researcher'}</p>
                </div>
              </div>
              {p.specializations?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.specializations.slice(0, 3).map((s) => (
                    <span key={s} className="rounded-md bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-700 dark:bg-navy-950 dark:text-navy-200">{s}</span>
                  ))}
                  {p.specializations.length > 3 && <span className="px-1 text-xs text-slate-400">+{p.specializations.length - 3}</span>}
                </div>
              )}
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
                <span className="flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{p.college || p.campus || '—'}</span></span>
                <span className="shrink-0 rounded-full bg-gold-100 px-2 py-0.5 font-semibold text-gold-800 dark:bg-gold-900/40 dark:text-gold-200">
                  {p.research_projects?.[0]?.count ?? 0} research
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={!!adding} onClose={() => setAdding(null)} title="Add researcher" description="Fields marked * are required."
        footer={<><Button variant="secondary" onClick={() => setAdding(null)}>Cancel</Button><Button onClick={save} loading={saving}>Add researcher</Button></>}>
        {adding && <RecordForm fields={RESEARCHER_FIELDS} values={adding} onChange={setAdding} errors={errors} />}
      </Modal>
    </>
  );
}
