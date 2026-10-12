import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const ROLES = ['admin', 'rsd', 'user'] as const;

/** Only admins may call these endpoints. Returns the caller's id or an error response. */
async function requireAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: NextResponse.json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY — add it in Vercel → Settings → Environment Variables.' }, { status: 500 }) };
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
  const [{ data: profiles, error }, { data: list }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, role, created_at').order('created_at'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const lastSeen = new Map(list?.users.map((u) => [u.id, u.last_sign_in_at]) ?? []);
  return NextResponse.json({ users: profiles!.map((p) => ({ ...p, last_sign_in_at: lastSeen.get(p.id) ?? null })), me: auth.userId });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const full_name = String(body.full_name ?? '').trim();
  const password = String(body.password ?? '');
  const role = ROLES.includes(body.role) ? body.role : 'user';
  if (!email || !full_name) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from('profiles').upsert({ id: data.user.id, full_name, email, role });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  const admin = createServiceClient();

  const update: Record<string, string> = {};
  if (body.full_name) update.full_name = String(body.full_name).trim();
  if (body.role) {
    if (!ROLES.includes(body.role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    if (id === auth.userId && body.role !== 'admin') return NextResponse.json({ error: 'You cannot remove your own admin role' }, { status: 400 });
    update.role = body.role;
  }
  if (Object.keys(update).length) {
    const { error } = await admin.from('profiles').update(update).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (body.password) {
    if (String(body.password).length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    const { error } = await admin.auth.admin.updateUserById(id, { password: String(body.password) });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  if (id === auth.userId) return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  const { error } = await createServiceClient().auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
