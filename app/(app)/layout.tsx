import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { SiteHeader } from '@/components/SiteHeader';
import { CommandPalette } from '@/components/CommandPalette';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="relative min-h-screen">
      <SiteHeader handle={user.handle} />
      {children}
      <CommandPalette />
    </div>
  );
}
