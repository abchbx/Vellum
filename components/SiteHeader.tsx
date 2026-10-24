import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader({
  handle,
  right,
}: {
  handle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="relative z-10 border-b border-line">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="group flex items-center gap-3">
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M4 28 C4 16, 12 8, 16 4 C20 8, 28 16, 28 28"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="16" cy="6" r="2" fill="var(--ink)" />
            <circle cx="28" cy="28" r="1.6" fill="var(--seedling)" />
          </svg>
          <span className="font-serif text-lg tracking-tight">Vellum</span>
        </Link>
        <nav className="flex items-center gap-6">
          {handle ? (
            <>
              <Link href={`/u/${handle}`} className="link-underline text-sm text-muted">
                /u/{handle}
              </Link>
              <Link href="/app" className="link-underline text-sm text-muted">
                工作台
              </Link>
              <Link href="/app/graph" className="link-underline text-sm text-muted">
                图谱
              </Link>
              <Link href="/app/stats" className="link-underline text-sm text-muted">
                统计
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="link-underline text-sm text-muted">
                登录
              </Link>
              <Link href="/register" className="btn btn-accent text-sm">
                开始种一座花园
              </Link>
            </>
          )}
          <ThemeToggle />
          {right}
        </nav>
      </div>
    </header>
  );
}
