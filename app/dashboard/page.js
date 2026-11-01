import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { INTERVAL_OPTIONS } from '@/lib/config';
import Dashboard from './Dashboard';

export const metadata = { title: 'Dashboard', robots: { index: false } };

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  return <Dashboard email={user.email} intervals={INTERVAL_OPTIONS} />;
}
