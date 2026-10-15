import { notFound } from 'next/navigation';
import { SettingsManager } from '@/components/settings-manager';
import { requireProfile } from '@/lib/session';

export const metadata = { title: 'Setting' };

export default async function Page() {
  const { role } = await requireProfile();
  if (role !== 'admin') notFound();
  return <SettingsManager />;
}