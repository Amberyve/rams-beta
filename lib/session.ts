import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from './supabase/server';
import type { Role } from './resources';

export type Profile = { id: string; full_name: string; email: string | null; role: Role };

/** Current user + profile; redirects to /login when signed out. Cached per request. */
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data } = await supabase.from('profiles').select('id, full_name, email, role').eq('id', user.id).single();
  return (data as Profile) ?? { id: user.id, full_name: user.email ?? 'User', email: user.email ?? null, role: 'user' };
});
