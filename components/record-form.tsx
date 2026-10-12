'use client';

import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Field } from '@/lib/resources';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/format';
import { Avatar, inputClass } from './ui';

export type FormValues = Record<string, any>;

/** Converts form strings into DB-ready values (numbers, nulls, arrays). */
export function normalize(fields: Field[], values: FormValues) {
  const out: FormValues = {};
  for (const f of fields) {
    let v = values[f.key];
    if (f.type === 'tags') v = Array.isArray(v) ? v : [];
    else if (v === '' || v === undefined) v = null;
    else if (f.type === 'currency') v = Number(String(v).replace(/[^0-9.]/g, ''));
    else if (f.type === 'year' || f.type === 'relation') v = Number(v);
    out[f.key] = v;
  }
  return out;
}

export function RecordForm({
  fields, values, onChange, errors,
}: {
  fields: Field[]; values: FormValues; onChange: (v: FormValues) => void; errors: Record<string, string>;
}) {
  const set = (key: string, v: unknown) => onChange({ ...values, [key]: v });

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className={cn(f.wide && 'sm:col-span-2')}>
          <label htmlFor={`f-${f.key}`} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            {f.label}
            {f.required && <span className="ml-0.5 text-rose-500">*</span>}
          </label>
          <FieldInput field={f} value={values[f.key]} onChange={(v) => set(f.key, v)} values={values} />
          {errors[f.key]
            ? <p className="mt-1 text-xs text-rose-600">{errors[f.key]}</p>
            : f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}
        </div>
      ))}
    </div>
  );
}

function FieldInput({ field: f, value, onChange, values }: { field: Field; value: any; onChange: (v: any) => void; values: FormValues }) {
  const id = `f-${f.key}`;
  switch (f.type) {
    case 'textarea':
      return <textarea id={id} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder}
        className={cn(inputClass, 'h-auto py-2')} />;
    case 'select':
      return (
        <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value="">Select…</option>
          {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'relation':
      return <RelationSelect id={id} field={f} value={value} onChange={onChange} />;
    case 'tags':
      return <TagInput id={id} value={Array.isArray(value) ? value : []} onChange={onChange} placeholder={f.placeholder} />;
    case 'image':
      return <ImageUpload value={value} onChange={onChange} name={values.full_name ?? values.name} />;
    case 'currency':
      return (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">₱</span>
          <input id={id} inputMode="decimal" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, 'pl-7')} placeholder="0.00" />
        </div>
      );
    case 'year':
      return <input id={id} type="number" min={1900} max={2100} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="YYYY" />;
    default:
      return <input id={id} type={f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : 'text'} value={value ?? ''}
        onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} className={inputClass} />;
  }
}

function RelationSelect({ id, field, value, onChange }: { id: string; field: Field; value: any; onChange: (v: any) => void }) {
  const [options, setOptions] = useState<{ id: number; label: string }[] | null>(null);
  useEffect(() => {
    const { table, labelKey } = field.relation!;
    createClient().from(table).select(`id, ${labelKey}`).order(labelKey).then(({ data }) => {
      setOptions((data ?? []).map((r: any) => ({ id: r.id, label: r[labelKey] })));
    });
  }, [field.relation]);

  return (
    <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputClass} disabled={!options}>
      <option value="">{options ? 'None' : 'Loading…'}</option>
      {options?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

function TagInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className={cn(inputClass, 'flex h-auto min-h-10 flex-wrap items-center gap-1.5 py-1.5')}>
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-700 dark:bg-navy-900 dark:text-navy-100">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="text-navy-400 hover:text-navy-700">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? '' : placeholder ?? 'Type and press Enter'}
        className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

function ImageUpload({ value, onChange, name }: { value?: string | null; onChange: (v: string | null) => void; name?: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError('');
    if (!file.type.startsWith('image/')) return setError('Please choose an image file.');
    if (file.size > 3 * 1024 * 1024) return setError('Image must be 3 MB or smaller.');
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: err } = await supabase.storage.from('photos').upload(path, file, { cacheControl: '31536000' });
    setUploading(false);
    if (err) return setError(err.message);
    onChange(supabase.storage.from('photos').getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={value} size={64} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={uploading}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {value ? 'Change photo' : 'Upload photo'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        )}
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        {error && <p className="w-full text-xs text-rose-600">{error}</p>}
      </div>
    </div>
  );
}

export function validate(fields: Field[], values: FormValues) {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = values[f.key];
    if (f.required && (v === undefined || v === null || String(v).trim() === '')) errors[f.key] = `${f.label} is required`;
    if (f.type === 'email' && v && !/^\S+@\S+\.\S+$/.test(v)) errors[f.key] = 'Enter a valid email address';
    if (f.type === 'currency' && v && isNaN(Number(String(v).replace(/[^0-9.]/g, '')))) errors[f.key] = 'Enter a number';
    if (f.type === 'year' && v && (Number(v) < 1900 || Number(v) > 2100)) errors[f.key] = 'Enter a 4-digit year';
  }
  return errors;
}
