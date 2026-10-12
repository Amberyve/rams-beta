'use client';

import {
  ArrowLeft, BookOpenText, Building2, GraduationCap, Mail, MapPin, Pencil, Phone, Plus, Sparkles, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RESEARCHER_FIELDS, RESOURCES, canDelete, canEdit, type Role } from '@/lib/resources';
import { formatDate } from '@/lib/format';
import { Avatar, Badge, Button, ConfirmDialog, Modal } from './ui';
import { RecordForm, normalize, validate, type FormValues } from './record-form';
import { useToast } from './toast';

const PROJECT_FIELDS = RESOURCES.research!.fields.filter((f) => f.key !== 'researcher_id');

export function ResearcherProfile({ researcher, projects: initial, role }: { researcher: any; projects: any[]; role: Role }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const router = useRouter();
  const [r, setR] = useState(researcher);
  const [projects, setProjects] = useState(initial);
  const [editing, setEditing] = useState<FormValues | null>(null);
  const [project, setProject] = useState<{ id?: number; values: FormValues } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: 'researcher' } | { kind: 'project'; row: any }>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'all' | 'ongoing' | 'completed'>('all');

  async function saveProfile() {
    if (!editing) return;
    const errs = validate(RESEARCHER_FIELDS, editing);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const { data, error } = await supabase.from('researchers').update(normalize(RESEARCHER_FIELDS, editing)).eq('id', r.id).select().single();
    setSaving(false);
    if (error) return toast('error', error.message);
    setR(data);
    setEditing(null);
    toast('success', 'Profile updated.');
  }

  async function saveProject() {
    if (!project) return;
    const errs = validate(PROJECT_FIELDS, project.values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const payload = { ...normalize(PROJECT_FIELDS, project.values), researcher_id: r.id };
    const res = project.id
      ? await supabase.from('research_projects').update(payload).eq('id', project.id).select().single()
      : await supabase.from('research_projects').insert(payload).select().single();
    setSaving(false);
    if (res.error) return toast('error', res.error.message);
    setProjects((ps) => project.id ? ps.map((p) => (p.id === project.id ? res.data : p)) : [res.data, ...ps]);
    setProject(null);
    toast('success', project.id ? 'Research updated.' : 'Research added.');
  }

  async function doDelete() {
    if (!confirm) return;
    setBusy(true);
    if (confirm.kind === 'researcher') {
      const { error } = await supabase.from('researchers').delete().eq('id', r.id);
      setBusy(false);
      if (error) return toast('error', error.message);
      toast('success', 'Researcher deleted.');
      router.push('/researchers');
      router.refresh();
    } else {
      const { error } = await supabase.from('research_projects').delete().eq('id', confirm.row.id);
      setBusy(false);
      if (error) return toast('error', error.message);
      setProjects((ps) => ps.filter((p) => p.id !== confirm.row.id));
      setConfirm(null);
      toast('success', 'Research deleted.');
    }
  }

  const visible = projects.filter((p) => tab === 'all' || p.status === tab);
  const counts = { all: projects.length, ongoing: projects.filter((p) => p.status === 'ongoing').length, completed: projects.filter((p) => p.status === 'completed').length };

  return (
    <div>
      <Link href="/researchers" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy-700 dark:hover:text-navy-200">
        <ArrowLeft className="h-4 w-4" /> All researchers
      </Link>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Profile card */}
        <aside className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-24">
          <div className="h-24 bg-gradient-to-br from-navy-700 via-navy-800 to-navy-950" />
          <div className="-mt-12 px-6 pb-6">
            <Avatar name={r.full_name} src={r.photo_url} size={96} />
            <h1 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">{r.full_name}</h1>
            <p className="text-sm text-slate-500">{r.expertise || r.researcher_type}</p>
            <div className="mt-2"><Badge tone="navy">{r.researcher_type}</Badge></div>

            <ul className="mt-5 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
              {r.email && <li className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-slate-400" /><a href={`mailto:${r.email}`} className="truncate hover:text-navy-700">{r.email}</a></li>}
              {r.phone && <li className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-slate-400" />{r.phone}</li>}
              {r.college && <li className="flex items-center gap-2.5"><Building2 className="h-4 w-4 text-slate-400" />{r.college}</li>}
              {r.campus && <li className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-slate-400" />{r.campus} campus</li>}
              {(r.cluster || r.research_center) && (
                <li className="flex items-center gap-2.5"><Sparkles className="h-4 w-4 text-slate-400" />{[r.cluster, r.research_center].filter(Boolean).join(' · ')}</li>
              )}
            </ul>

            {(canEdit(role) || canDelete(role)) && (
              <div className="mt-6 flex gap-2">
                {canEdit(role) && <Button variant="secondary" className="flex-1" onClick={() => { setErrors({}); setEditing({ ...r }); }}><Pencil className="h-4 w-4" /> Edit profile</Button>}
                {canDelete(role) && <Button variant="ghost" aria-label="Delete researcher" className="text-rose-600" onClick={() => setConfirm({ kind: 'researcher' })}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-6">
          {/* Qualifications */}
          <section className="grid gap-6 md:grid-cols-2">
            <TagCard icon={GraduationCap} title="Educational qualifications" items={r.education} empty="No degrees listed" />
            <TagCard icon={Sparkles} title="Areas of specialization" items={r.specializations} empty="No specializations listed" chips />
          </section>

          {/* Research */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BookOpenText className="h-5 w-5 text-navy-600" />
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Research</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium dark:bg-slate-800" role="tablist">
                  {(['all', 'ongoing', 'completed'] as const).map((t) => (
                    <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                      className={`rounded-md px-3 py-1.5 capitalize transition ${tab === t ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                      {t} <span className="tabular-nums text-slate-400">{counts[t]}</span>
                    </button>
                  ))}
                </div>
                {canEdit(role) && (
                  <Button className="h-9" onClick={() => { setErrors({}); setProject({ values: { status: 'ongoing' } }); }}>
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                )}
              </div>
            </div>
            {visible.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-slate-500">No {tab === 'all' ? '' : tab} research recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map((p) => (
                  <li key={p.id} className="group flex gap-4 px-6 py-4">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${p.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{p.title}</p>
                      {p.applicability && <p className="mt-0.5 text-sm text-slate-500"><span className="font-medium text-slate-600 dark:text-slate-400">Applicability:</span> {p.applicability}</p>}
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        {p.status === 'completed' ? <Badge tone="green">Completed</Badge> : <Badge tone="amber">Ongoing</Badge>}
                        {formatDate(p.publication_date)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-start gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      {canEdit(role) && <button aria-label="Edit research" onClick={() => { setErrors({}); setProject({ id: p.id, values: { ...p } }); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy-700 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>}
                      {canDelete(role) && <button aria-label="Delete research" onClick={() => setConfirm({ kind: 'project', row: p })} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit researcher profile"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveProfile} loading={saving}>Save changes</Button></>}>
        {editing && <RecordForm fields={RESEARCHER_FIELDS} values={editing} onChange={setEditing} errors={errors} />}
      </Modal>

      <Modal open={!!project} onClose={() => setProject(null)} title={project?.id ? 'Edit research' : 'Add research'} description={r.full_name}
        footer={<><Button variant="secondary" onClick={() => setProject(null)}>Cancel</Button><Button onClick={saveProject} loading={saving}>{project?.id ? 'Save changes' : 'Add research'}</Button></>}>
        {project && <RecordForm fields={PROJECT_FIELDS} values={project.values} onChange={(values) => setProject({ ...project, values })} errors={errors} />}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete} loading={busy}
        title={confirm?.kind === 'researcher' ? 'Delete researcher?' : 'Delete research?'}
        message={confirm?.kind === 'researcher'
          ? `${r.full_name} and all of their ${projects.length} research record(s) will be permanently removed.`
          : `“${confirm?.kind === 'project' ? confirm.row.title : ''}” will be permanently removed.`} />
    </div>
  );
}

function TagCard({ icon: Icon, title, items, empty, chips }: { icon: React.ElementType; title: string; items: string[]; empty: string; chips?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-gold-500" />
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {!items?.length ? <p className="text-sm text-slate-400">{empty}</p> : chips ? (
        <div className="flex flex-wrap gap-2">
          {items.map((t) => <span key={t} className="rounded-lg bg-navy-50 px-2.5 py-1 text-sm font-medium text-navy-700 dark:bg-navy-950 dark:text-navy-200">{t}</span>)}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => <li key={t} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />{t}</li>)}
        </ul>
      )}
    </div>
  );
}
