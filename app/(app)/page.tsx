import {
  ArrowRight, BookOpenText, FlaskConical, GraduationCap, Lightbulb, Microscope, ScrollText, Stamp, Users, Wrench,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/session';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'Dashboard' };

type Stats = Record<string, number>;

export default async function Dashboard() {
  const profile = await requireProfile();
  const supabase = createClient();
  const [{ data: stats }, { data: recent }, { data: researchers }] = await Promise.all([
    supabase.rpc('dashboard_stats'),
    supabase.from('research_projects').select('id, title, status, publication_date, researchers(full_name)')
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('researchers').select('id, full_name, college, photo_url').order('created_at', { ascending: false }).limit(4),
  ]);
  const s: Stats = (stats as Stats) ?? {};
  const n = (k: string) => s[k] ?? 0;

  const hour = Number(new Intl.DateTimeFormat('en-PH', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = profile.full_name.split(' ')[0];

  const groups = [
    { title: 'Intellectual Property', tone: 'from-navy-600 to-navy-800', items: [
      { label: 'Patents', value: n('patents'), href: '/patents', icon: Lightbulb },
      { label: 'Trademarks', value: n('trademarks'), href: '/trademarks', icon: Stamp },
      { label: 'Copyrights', value: n('copyrights'), href: '/copyrights', icon: ScrollText },
    ] },
    { title: 'People', tone: 'from-gold-400 to-gold-600', items: [
      { label: 'Faculty Researchers', value: n('researchers'), href: '/researchers', icon: Users },
      { label: 'Research Projects', value: n('research_projects'), href: '/research', icon: BookOpenText },
      { label: 'Graduate Students', value: n('graduate_students'), href: '/graduates', icon: GraduationCap },
    ] },
    { title: 'Resources', tone: 'from-emerald-500 to-emerald-700', items: [
      { label: 'Laboratories', value: n('laboratories'), href: '/laboratories', icon: FlaskConical },
      { label: 'Services', value: n('services'), href: '/services', icon: Microscope },
      { label: 'Equipment', value: n('equipment'), href: '/equipment', icon: Wrench },
    ] },
  ];

  const total = n('research_projects');
  const pct = total ? Math.round((n('research_completed') / total) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-navy-900 text-white shadow-card">
        <Image src="/campus-2.jpg" alt="" fill className="object-cover opacity-25" sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-900/90 to-navy-900/30" />
        <div className="relative px-6 py-10 sm:px-10">
          <p className="text-sm font-medium text-gold-300">{greeting}, {firstName}</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">ISAT U Research Asset Management System</h1>
          <p className="mt-2 max-w-xl text-sm text-navy-100/80">
            {n('patents') + n('trademarks') + n('copyrights')} intellectual property records, {n('researchers')} researchers and{' '}
            {n('laboratories')} laboratories on file.
          </p>
        </div>
      </section>

      {/* Stat groups */}
      <section className="grid gap-5 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${g.tone}`} />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{g.title}</h2>
            </div>
            <ul className="space-y-1">
              {g.items.map(({ label, value, href, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="rounded-lg bg-slate-100 p-2 text-slate-600 group-hover:bg-navy-100 group-hover:text-navy-700 dark:bg-slate-800 dark:text-slate-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">{label}</span>
                    <span className="font-display text-xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        {/* Research progress */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Research progress</h2>
          <div className="mt-5 flex items-end gap-2">
            <span className="font-display text-4xl font-bold tabular-nums text-slate-900 dark:text-white">{pct}%</span>
            <span className="pb-1.5 text-sm text-slate-500">completed</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950" role="img" aria-label={`${pct}% of research completed`}>
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/50">
              <dt className="text-emerald-700 dark:text-emerald-300">Completed</dt>
              <dd className="font-display text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-100">{n('research_completed')}</dd>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/50">
              <dt className="text-amber-700 dark:text-amber-300">Ongoing</dt>
              <dd className="font-display text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-100">{n('research_ongoing')}</dd>
            </div>
          </dl>
        </div>

        {/* Recent research */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recently added research</h2>
            <Link href="/research" className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-800 dark:text-navy-300">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recent && recent.length > 0 ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((r: any) => (
                <li key={r.id} className="flex items-center gap-4 px-6 py-3.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${r.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-label={r.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.title}</p>
                    <p className="truncate text-xs text-slate-500">{r.researchers?.full_name ?? 'Unassigned'}</p>
                  </div>
                  <span className="hidden whitespace-nowrap text-xs text-slate-400 sm:block">{formatDate(r.publication_date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-slate-500">No research projects yet.</p>
          )}
        </div>
      </section>

      {researchers && researchers.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Faculty researchers</h2>
            <Link href="/researchers" className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-800 dark:text-navy-300">
              Directory <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {researchers.map((p: any) => (
              <Link key={p.id} href={`/researchers/${p.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-navy-200 dark:border-slate-800 dark:bg-slate-900">
                {p.photo_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                  : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-100 font-semibold text-navy-700">{p.full_name[0]}</span>}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{p.full_name}</p>
                  <p className="truncate text-xs text-slate-500">{p.college ?? '—'}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
