import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { notes, users } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { SiteHeader } from '@/components/SiteHeader';
import { StatusBadge } from '@/components/StatusBadge';

export const runtime = 'nodejs';
export const revalidate = 300;

export default async function PublicGarden({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [user, rows] = await Promise.all([
    db.select().from(users).where(sql`${users.handle} = ${handle}`).limit(1),
    db
      .select({
        id: notes.id,
        title: notes.title,
        slug: notes.slug,
        excerpt: notes.excerpt,
        status: notes.status,
        publishedAt: notes.publishedAt,
        authorId: notes.authorId,
      })
      .from(notes)
      .where(sql`${notes.published} = true`)
      .orderBy(sql`${notes.publishedAt} DESC`),
  ]);

  const gardenUser = user[0];
  if (!gardenUser || !gardenUser.gardenPublic) notFound();
  const gardenNotes = rows.filter((n) => n.authorId === gardenUser.id);

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
        )}
      </div>
    </div>
  );
}
