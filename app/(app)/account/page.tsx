import { AccountForm } from '@/components/account-form';
import { requireProfile } from '@/lib/session';

export const metadata = { title: 'Account' };

export default async function Page() {
  return <AccountForm profile={await requireProfile()} />;
}
