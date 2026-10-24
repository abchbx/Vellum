import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { links, notes, users } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { SiteHeader } from '@/components/SiteHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { renderMarkdown } from '@/lib/markdown';

export const runtime = 'nodejs';
export const revalidate = 300;

export default async function ReadNote({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}) {
  const { handle, slug } = await params;
  const [user, noteRows] = await Promise.all([
    db.select().from(users).where(sql`${users.handle} = ${handle}`).limit(1),
    db
      .select()
      .from(notes)
      .where(sql`${notes.authorId} = (SELECT id FROM users WHERE handle = ${handle}) AND ${notes.slug} = ${slug}`)
      .limit(1),
  ]);

  const gardenUser = user[0];
  const row = noteRows[0];
  if (!gardenUser || !gardenUser.gardenPublic || !row || !row.published) notFound();

  const backlinks = await db
    .select({ title: notes.title, slug: notes.slug, id: notes.id })
    .from(notes)
    .where(
      sql`${notes.authorId} = ${gardenUser.id}::uuid AND ${notes.id} IN (SELECT ${links.sourceId} FROM ${links} WHERE ${links.targetId} = ${row.id}::uuid)`,
    );

  const authorNotes = await db
    .select({ title: notes.title, slug: notes.slug })
    .from(notes)
    .where(sql`${notes.authorId} = ${gardenUser.id}::uuid`);
  const slugMap = new Map(authorNotes.map((n) => [n.title, n.slug]));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-[680px] px-6 py-16 md:px-12">
        <Link href={`/u/${handle}`} className="eyebrow link-underline">
          ← 回到花园
        </Link>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <StatusBadge status={row.status} />
          <span className="font-mono text-xs text-muted tabular">
            {row.publishedAt instanceof Date
              ? row.publishedAt.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
              : new Date(row.publishedAt ?? Date.now()).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span className="font-mono text-xs text-muted tabular">· 约 {row.readingMins} 分钟</span>
        </div>
        <h1 className="mt-6 font-serif text-4xl leading-tight tracking-tight md:text-5xl">{row.title}</h1>
        <p className="mt-4 font-mono text-xs text-muted">/u/{handle}/{row.slug}</p>

        <article
          className="mt-10 text-[17px] leading-[1.85]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(row.contentMd, `/u/${handle}`, slugMap) }}
        />

        {backlinks.length > 0 && (
          <section className="mt-20 border-t border-line pt-12">
            <p className="eyebrow">反向链接 · {backlinks.length}</p>
            <ul className="mt-8 space-y-6">
              {backlinks.map((b) => (
                <li key={b.id}>
                  <Link href={`/u/${handle}/${b.slug}`} className="group block">
                    <div className="border-l-2 border-line pl-5">
                      <h2 className="font-serif text-xl group-hover:text-accent">「{b.title}」</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        从这篇笔记链接到了本文。
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
