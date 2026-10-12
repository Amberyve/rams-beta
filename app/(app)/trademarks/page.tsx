import { ResourceManager } from '@/components/resource-manager';
import { requireProfile } from '@/lib/session';

export const metadata = { title: 'Trademarks' };

export default async function Page() {
  const { role } = await requireProfile();
  return <ResourceManager resource="trademarks" role={role} />;
}
