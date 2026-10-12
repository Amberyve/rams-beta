'use client';

import {
  BadgeCheck, BookOpenText, ChevronDown, FlaskConical, GraduationCap, LayoutDashboard,
  LogOut, Menu, Microscope, ScrollText, Settings, ShieldCheck, Stamp, Users, Wrench, X, Lightbulb,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/session';
import { cn } from '@/lib/format';
import { Avatar } from './ui';

type NavItem = { href: string; label: string; icon: React.ElementType };
const NAV: { group?: string; items: NavItem[]; admin?: boolean }[] = [
  { items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }] },
  { group: 'Intellectual Property', items: [
    { href: '/patents', label: 'Patents', icon: Lightbulb },
    { href: '/trademarks', label: 'Trademarks', icon: Stamp },
    { href: '/copyrights', label: 'Copyrights', icon: ScrollText },
  ] },
  { group: 'People', items: [
    { href: '/researchers', label: 'Faculty Researchers', icon: Users },
    { href: '/research', label: 'Faculty Research', icon: BookOpenText },
    { href: '/graduates', label: 'Graduate Students', icon: GraduationCap },
  ] },
  { group: 'Resources', items: [
    { href: '/laboratories', label: 'Laboratories', icon: FlaskConical },
    { href: '/services', label: 'Services', icon: Microscope },
    { href: '/equipment', label: 'Equipment', icon: Wrench },
  ] },
  { group: 'Administration', admin: true, items: [{ href: '/users', label: 'User Accounts', icon: ShieldCheck }] },
];

const ROLE_LABEL = { admin: 'Administrator', rsd: 'RSD Staff', user: 'Viewer' } as const;

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => { setOpen(false); setMenu(false); }, [pathname]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'));

  const sidebar = (
    <nav className="flex h-full flex-col bg-navy-950 text-navy-100">
      <Link href="/" className="flex items-center gap-3 px-5 pb-5 pt-6">
        <Image src="/isat-logo.png" alt="ISAT U seal" width={40} height={40} className="h-10 w-10" priority />
        <div className="leading-tight">
          <p className="font-display text-base font-bold tracking-tight text-white">RAMS</p>
          <p className="text-[11px] text-navy-300">ISAT U Research Assets</p>
        </div>
      </Link>
      <div className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAV.filter((s) => !s.admin || profile.role === 'admin').map((section, i) => (
          <div key={i}>
            {section.group && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-navy-400">{section.group}</p>}
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} aria-current={isActive(href) ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                      isActive(href) ? 'bg-white/10 text-white' : 'text-navy-200 hover:bg-white/5 hover:text-white',
                    )}>
                    {isActive(href) && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-gold-400" />}
                    <Icon className={cn('h-4 w-4', isActive(href) ? 'text-gold-400' : 'text-navy-400 group-hover:text-navy-200')} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 p-4 text-[11px] text-navy-400">
        Iloilo Science and Technology University
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fade-in absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <aside className="toast-in relative h-full w-72 max-w-[85vw]">
            {sidebar}
            <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-3 top-5 rounded-lg p-2 text-navy-200 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </aside>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 lg:hidden">
          <Image src="/isat-logo.png" alt="" width={28} height={28} />
          <span className="font-display font-bold text-navy-900 dark:text-white">RAMS</span>
        </div>
        <div className="ml-auto relative">
          <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu"
            className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <Avatar name={profile.full_name} size={34} />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold text-slate-800 dark:text-white">{profile.full_name}</span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                {profile.role !== 'user' && <BadgeCheck className="h-3 w-3 text-navy-500" />}{ROLE_LABEL[profile.role]}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div role="menu" className="fade-in absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{profile.full_name}</p>
                  <p className="truncate text-xs text-slate-500">{profile.email}</p>
                </div>
                <Link href="/account" role="menuitem" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Settings className="h-4 w-4" /> Account settings
                </Link>
                <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}

