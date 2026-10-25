import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/db';
import { notes, users } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { SiteHeader } from '@/components/SiteHeader';
import { StatusBadge } from '@/components/StatusBadge';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `${handle} 的花园 · Vellum`,
    description: `${handle} 的数字花园：公开的 evergreen 笔记，用双向链接把想法连成网。`,
    openGraph: {
      title: `${handle} 的花园 · Vellum`,
      description: `${handle} 的数字花园：公开的 evergreen 笔记。`,
      type: 'profile',
      images: [{ url: `/og?title=${encodeURIComponent(handle)} 的花园` }],
    },
  };
}

export default async function PublicGarden({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<URLSearchParams>;
}) {
  const { handle } = await params;
  const spRaw = await searchParams;
  const spGet = (key: string): string | null => {
    if (spRaw instanceof URLSearchParams) return spRaw.get(key);
    const v = (spRaw as Record<string, string | undefined>)[key];
    return v ?? null;
  };
  const user = await db.select().from(users).where(sql`${users.handle} = ${handle}`).limit(1);
  const gardenUser = user[0];
  if (!gardenUser || !gardenUser.gardenPublic) notFound();

  const limit = Math.min(Math.max(Number(spGet('limit') ?? 36) || 36, 1), 100);
  let cursorCond = sql`true`;
  const cursor = spGet('cursor');
  if (cursor) {
    const [publishedAt, id] = cursor.split('|');
    if (publishedAt && id) {
      cursorCond = sql`(${notes.publishedAt} < ${publishedAt}::timestamptz OR (${notes.publishedAt} = ${publishedAt}::timestamptz AND ${notes.id} < ${id}::uuid))`;
    }
  }
  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      slug: notes.slug,
      excerpt: notes.excerpt,
      status: notes.status,
      publishedAt: notes.publishedAt,
    })
    .from(notes)
    .where(sql`${notes.authorId} = ${gardenUser.id}::uuid AND ${notes.published} = true AND ${cursorCond}`)
    .orderBy(sql`${notes.publishedAt} DESC, ${notes.id} DESC`)
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const gardenNotes = rows.slice(0, limit);
  const last = gardenNotes[gardenNotes.length - 1];
  const nextCursor = hasMore && last ? `${last.publishedAt?.toISOString()}|${last.id}` : null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-[1180px] px-6 py-20 md:px-12">
        <p className="eyebrow">/u/{gardenUser.handle}</p>
        <h1 className="mt-6 font-serif text-5xl tracking-tight md:text-6xl">
          {gardenUser.displayName || gardenUser.handle} 的花园
        </h1>
        {gardenUser.bio && (
          <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-muted">{gardenUser.bio}</p>
        )}
        <p className="mt-8 font-mono text-xs text-muted">
          {gardenNotes.length} 篇公开笔记 · 访客无需登录即可阅读
        </p>

        {gardenNotes.length === 0 ? (
          <p className="mt-16 text-center text-muted">园主还没有公开任何 evergreen 笔记。</p>
        ) : (
          <>
            <div className="mt-16 grid gap-px overflow-hidden border border-line bg-line md:grid-cols-3">
              {gardenNotes.map((n) => (
                <Link
                  key={n.id}
                  href={`/u/${handle}/${n.slug}`}
                  className="group flex flex-col gap-4 bg-surface p-8 transition-transform duration-320 hover:-translate-y-1"
                >
                  <StatusBadge status={n.status} />
                  <h2 className="font-serif text-xl">{n.title}</h2>
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted">{n.excerpt}</p>
                  <span className="mt-auto font-mono text-[11px] text-accent">阅读 →</span>
                </Link>
              ))}
            </div>
            {nextCursor && (
              <p className="mt-8 text-center">
                <Link href={`/u/${handle}?cursor=${encodeURIComponent(nextCursor)}`} className="link-underline text-sm text-muted">
                  加载更多 →
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
