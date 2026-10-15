'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn, initials } from '@/lib/format';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';

export function Button({
  variant = 'primary', loading, className, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-navy-700 text-white hover:bg-navy-800 focus-visible:ring-navy-400',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400',
    gold: 'bg-gold-400 text-navy-950 hover:bg-gold-300 focus-visible:ring-gold-500',
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        styles[variant], className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'green' | 'amber' | 'navy' | 'rose'; children: React.ReactNode }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300',
    navy: 'bg-navy-50 text-navy-700 ring-navy-600/20 dark:bg-navy-950 dark:text-navy-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300',
  };
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-transparent', tones[tone])}>{children}</span>;
}

export function Avatar({ name, src, size = 36 }: { name?: string | null; src?: string | null; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-800" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy-500 to-navy-700 font-semibold text-white ring-2 ring-white dark:ring-slate-800"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function Modal({
  open, onClose, title, description, children, footer, size = 'lg',
}: {
  open: boolean; onClose: () => void; title: string; description?: string;
  children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'lg';
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the latest onClose in a ref. Parents pass a new arrow function on every
  // render, so depending on it directly re-ran this effect on every keystroke and
  // yanked focus back to the first field.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Focus the first field once, when the dialog opens — never while typing.
    if (!ref.current?.contains(document.activeElement)) {
      (ref.current?.querySelector<HTMLElement>('.overflow-y-auto input:not([type=hidden]):not([type=file]), .overflow-y-auto textarea, .overflow-y-auto select')
        ?? ref.current?.querySelector<HTMLElement>('button'))?.focus();
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fade-in absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'modal-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-2xl',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3 dark:border-slate-800 dark:bg-slate-900">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, loading,
}: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>Delete</Button>
      </>}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </Modal>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: React.ElementType; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 rounded-2xl bg-navy-50 p-4 text-navy-600 dark:bg-navy-950 dark:text-navy-300">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const inputClass =
  'block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition ' +
  'focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white';
