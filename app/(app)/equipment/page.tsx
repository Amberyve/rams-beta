import { ResourceManager } from '@/components/resource-manager';
import { requireProfile } from '@/lib/session';

export const metadata = { title: 'Equipment' };

export default async function Page() {
  const { role } = await requireProfile();
  return <ResourceManager resource="equipment" role={role} />;
}
