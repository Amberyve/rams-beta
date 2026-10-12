import { ResourceManager } from '@/components/resource-manager';
import { requireProfile } from '@/lib/session';

export const metadata = { title: 'Services' };

export default async function Page() {
  const { role } = await requireProfile();
  return <ResourceManager resource="services" role={role} />;
}
