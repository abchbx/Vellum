import { sql } from 'drizzle-orm';
import { db } from '../db';
import { links, notes } from '../db/schema';
import { extractLinkedSlugs } from './markdown';
import { slugify } from '../db/queries';

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

  // 一致性说明：neon-http 无交互事务，删除与插入之间存在短暂窗口；
  // 本函数幂等，失败后重跑即收敛（详见 README「一致性模型」）。
  await db.delete(links).where(sql`${links.sourceId} = ${noteId}::uuid`);
  const rows = slugs.map((slug) => ({
    sourceId: noteId,
    targetSlug: slug,
    targetId: bySlug.get(slugify(slug)) ?? null,
  }));
  if (rows.length > 0) {
    await db.insert(links).values(rows).onConflictDoNothing();
  }
}

export async function resolveDanglingLinks(authorId: string): Promise<number> {
  const dangling = await db
    .select({ id: links.id, targetSlug: links.targetSlug })
    .from(links)
    .where(
      sql`${links.targetId} IS NULL AND ${links.sourceId} IN (SELECT ${notes.id} FROM ${notes} WHERE ${notes.authorId} = ${authorId}::uuid)`,
    );
  if (dangling.length === 0) return 0;

  const all = await db
    .select({ id: notes.id, slug: notes.slug })
    .from(notes)
    .where(sql`${notes.authorId} = ${authorId}::uuid`);
  const bySlug = new Map(all.map((n) => [n.slug.toLowerCase(), n.id]));

  let resolved = 0;
  for (const l of dangling) {
    const targetId = bySlug.get(slugify(l.targetSlug));
    if (targetId) {
      await db
        .update(links)
        .set({ targetId })
        .where(sql`${links.id} = ${l.id}::uuid`);
      resolved++;
    }
  }
  return resolved;
}

export async function rebuildAllLinks(authorId: string): Promise<number> {
  const authorNotes = await db
    .select({ id: notes.id })
    .from(notes)
    .where(sql`${notes.authorId} = ${authorId}::uuid`);
  await db.delete(links).where(
    sql`${links.sourceId} IN (SELECT ${notes.id} FROM ${notes} WHERE ${notes.authorId} = ${authorId}::uuid)`,
  );
  for (const n of authorNotes) {
    await rebuildLinksForNote(n.id, authorId);
  }
  return authorNotes.length;
}
