import { ResearchersDirectory } from '@/components/researchers-directory';
import { requireProfile } from '@/lib/session';

export const metadata = { title: 'Faculty Researchers' };

export default async function Page() {
  const { role } = await requireProfile();
  return <ResearchersDirectory role={role} />;
}
