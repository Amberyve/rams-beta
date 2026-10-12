import { notFound } from 'next/navigation';
import { UsersManager } from '@/components/users-manager';
import { requireProfile } from '@/lib/session';

export const metadata = { title: 'User Accounts' };

export default async function Page() {
  const { role } = await requireProfile();
  if (role !== 'admin') notFound();
  return <UsersManager />;
}
