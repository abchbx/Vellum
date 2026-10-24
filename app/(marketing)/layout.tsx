import { PageTransition } from '@/components/PageTransition';

export const runtime = 'nodejs';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
