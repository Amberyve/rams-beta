import { ResourceManager } from '@/components/resource-manager';
import { requireProfile } from '@/lib/session';

export const metadata = { title: 'Faculty Research' };

export default async function Page() {
  const { role } = await requireProfile();
  return <ResourceManager resource="research" role={role} />;
}
