import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles links from Supabase emails (password reset, invites).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';
  if (code) await createClient().auth.exchangeCodeForSession(code);
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return NextResponse.redirect(new URL(safe, url.origin));
}
