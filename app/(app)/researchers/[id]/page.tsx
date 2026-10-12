import { notFound } from 'next/navigation';
import { ResearcherProfile } from '@/components/researcher-profile';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/session';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { data } = await createClient().from('researchers').select('full_name').eq('id', params.id).maybeSingle();
  return { title: data?.full_name ?? 'Researcher' };
}

export default async function Page({ params }: { params: { id: string } }) {
  const { role } = await requireProfile();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const supabase = createClient();
  const [{ data: researcher }, { data: projects }] = await Promise.all([
    supabase.from('researchers').select('*').eq('id', id).maybeSingle(),
    supabase.from('research_projects').select('*').eq('researcher_id', id).order('publication_date', { ascending: false, nullsFirst: false }),
  ]);
  if (!researcher) notFound();
  return <ResearcherProfile key={id} researcher={researcher} projects={projects ?? []} role={role} />;
}
