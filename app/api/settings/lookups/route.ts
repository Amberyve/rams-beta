import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const LOOKUPS = {
  campuses: { researcherField: 'campus' },
  colleges: { researcherField: 'college' },
  research_centers: { researcherField: 'research_center' },
} as const;

type LookupKey = keyof typeof LOOKUPS;

function lookupKey(value: unknown): LookupKey | null {
  return typeof value === 'string' && value in LOOKUPS ? value as LookupKey : null;
}

async function requireAdmin() {
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: NextResponse.json({ error: 'Server is missing SUPABASE_SECRET_KEY.' }, { status: 500 }) };
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) };
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (data?.role !== 'admin') return { error: NextResponse.json({ error: 'Administrators only' }, { status: 403 }) };
  return { userId: user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const admin = createServiceClient();
  const keys = Object.keys(LOOKUPS) as LookupKey[];
  const results = await Promise.all(keys.map((key) => admin.from(key).select('id, name').order('name')));
  const failed = results.find((result) => result.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  return NextResponse.json({ lookups: Object.fromEntries(keys.map((key, index) => [key, results[index].data ?? []])) });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const key = lookupKey(body.list);
  const name = String(body.name ?? '').trim();
  if (!key) return NextResponse.json({ error: 'Invalid list' }, { status: 400 });
  if (!name || name.length > 120) return NextResponse.json({ error: 'Name must be between 1 and 120 characters' }, { status: 400 });

  const { data, error } = await createServiceClient().from(key).insert({ name }).select('id, name').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That name already exists.' : error.message }, { status: 400 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const key = lookupKey(body.list);
  const id = Number(body.id);
  const name = String(body.name ?? '').trim();
  if (!key || !Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid list item' }, { status: 400 });
  if (!name || name.length > 120) return NextResponse.json({ error: 'Name must be between 1 and 120 characters' }, { status: 400 });

  const admin = createServiceClient();
  const { data: current, error: lookupError } = await admin.from(key).select('name').eq('id', id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'List item not found' }, { status: 404 });
  const { data, error } = await admin.from(key).update({ name }).eq('id', id).select('id, name').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That name already exists.' : error.message }, { status: 400 });

  if (current.name !== name) {
    const { error: researcherError } = await admin.from('researchers')
      .update({ [LOOKUPS[key].researcherField]: name })
      .eq(LOOKUPS[key].researcherField, current.name);
    if (researcherError) {
      await admin.from(key).update({ name: current.name }).eq('id', id);
      return NextResponse.json({ error: `Could not update researcher records: ${researcherError.message}` }, { status: 500 });
    }
  }
  return NextResponse.json({ item: data });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const url = new URL(req.url);
  const key = lookupKey(url.searchParams.get('list'));
  const id = Number(url.searchParams.get('id'));
  if (!key || !Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid list item' }, { status: 400 });

  const admin = createServiceClient();
  const { data: item, error: lookupError } = await admin.from(key).select('name').eq('id', id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: 'List item not found' }, { status: 404 });
  const field = LOOKUPS[key].researcherField;
  const { count, error: usageError } = await admin.from('researchers').select('id', { count: 'exact', head: true }).eq(field, item.name);
  if (usageError) return NextResponse.json({ error: usageError.message }, { status: 500 });
  if (count) return NextResponse.json({ error: `Cannot delete this item because ${count} researcher${count === 1 ? ' uses' : 's use'} it.` }, { status: 409 });

  const { error } = await admin.from(key).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}