import { sql } from 'drizzle-orm';
import { db } from '../db';
import { links, notes } from '../db/schema';
import { extractLinkedSlugs } from './markdown';

export async function rebuildLinksForNote(noteId: string, authorId: string) {
  const content = await db
    .select({ contentMd: notes.contentMd })
    .from(notes)
    .where(sql`${notes.id} = ${noteId}::uuid`)
    .limit(1);
  const slugs = extractLinkedSlugs(content[0]?.contentMd ?? '')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const all = await db
    .select({ id: notes.id, slug: notes.slug })
    .from(notes)
    .where(sql`${notes.authorId} = ${authorId}::uuid`);
  const bySlug = new Map(all.map((n) => [n.slug.toLowerCase(), n.id]));

  for (const slug of slugs) {
    const targetId = bySlug.get(slug) ?? null;
    await db
      .insert(links)
      .values({ sourceId: noteId, targetSlug: slug, targetId })
      .onConflictDoUpdate({
        target: [links.sourceId, links.targetSlug],
        set: { targetId },
      });
  }

  const existing = await db
    .select({ id: links.id, targetSlug: links.targetSlug })
    .from(links)
    .where(sql`${links.sourceId} = ${noteId}::uuid`);
  const keep = new Set(slugs);
  const gone = existing
    .filter((l) => !keep.has(l.targetSlug.toLowerCase()))
    .map((l) => l.id);
  if (gone.length > 0) {
    const ors = gone.map((id) => sql`${links.id} = ${id}::uuid`);
    await db.delete(links).where(sql`${sql.join(ors, sql` OR `)}`);
  }
}
