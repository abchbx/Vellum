import { sql } from 'drizzle-orm';
import { db } from './index';
import { links, noteTags, notes, tags, users } from './schema';
import { excerptOf, readingMinutes } from '../lib/markdown';
import { TAG_COLORS } from '../lib/zod';

import { createHash } from 'node:crypto';

export function slugify(raw: string, fallback = 'note'): string {
  const ascii = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (ascii.length > 0) return ascii.slice(0, 80);
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 8);
  return `n${hash}`;
}

export async function uniqueSlug(authorId: string, title: string, ignoreId?: string) {
  const base = slugify(title);
  const candidate0 = base;
  let candidate = candidate0;
  for (let i = 2; i < 50; i++) {
    const safe = candidate.replace(/'/g, "''");
    const rows = await db
      .select({ id: notes.id })
      .from(notes)
      .where(sql`${notes.authorId} = ${authorId}::uuid AND ${notes.slug} = ${sql.raw(`'${safe}'`)}`)
      .limit(1);
    if (rows.length === 0 || (ignoreId && rows[0]?.id === ignoreId)) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function syncTags(authorId: string, noteId: string, names: string[]) {
  await db.delete(noteTags).where(sql`${noteTags.noteId} = ${noteId}::uuid`);
  if (names.length === 0) return;
  const existing = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(sql`${tags.authorId} = ${authorId}::uuid`);
  const byName = new Map(existing.map((t) => [t.name, t.id]));
  for (const raw of names) {
    const name = raw.trim().slice(0, 30);
    if (!name) continue;
    let tagId = byName.get(name);
    if (!tagId) {
      const inserted = await db
        .insert(tags)
        .values({ authorId, name, color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)] })
        .returning({ id: tags.id });
      tagId = inserted[0]?.id;
      if (tagId) byName.set(name, tagId);
    }
    if (tagId) {
      await db
        .insert(noteTags)
        .values({ noteId, tagId })
        .onConflictDoNothing();
    }
  }
}

export async function listNotes(authorId: string, opts: {
  status?: string;
  tag?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const conds = [sql`${notes.authorId} = ${authorId}::uuid`];
  if (opts.status) conds.push(sql`${notes.status} = ${opts.status}`);
  if (opts.tag) {
    conds.push(
      sql`EXISTS (SELECT 1 FROM ${noteTags} nt JOIN ${tags} t ON t.id = nt.tag_id WHERE nt.note_id = ${notes.id} AND t.name = ${opts.tag})`,
    );
  }
  let cursorCond = sql`true`;
  if (opts.cursor) {
    const parts = opts.cursor.split('|');
    const updatedAt = parts[0];
    const id = parts[1];
    if (updatedAt && id) {
      cursorCond = sql`(${notes.updatedAt} < ${updatedAt}::timestamptz OR (${notes.updatedAt} = ${updatedAt}::timestamptz AND ${notes.id} < ${id}::uuid))`;
    }
  }
  const where = sql`${sql.join(conds, sql` AND `)} AND ${cursorCond}`;
  const rows = await db
    .select()
    .from(notes)
    .where(where)
    .orderBy(sql`${notes.updatedAt} DESC, ${notes.id} DESC`)
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page,
    nextCursor: hasMore && last ? `${last.updatedAt.toISOString()}|${last.id}` : null,
  };
}

export async function getNote(noteId: string) {
  const rows = await db.select().from(notes).where(sql`${notes.id} = ${noteId}::uuid`).limit(1);
  return rows[0] ?? null;
}

export async function searchNotes(
  authorId: string,
  rawQuery: string,
  limit = 20,
): Promise<{ rows: Record<string, unknown>[] }> {
  const normalized = rawQuery.replace(/([一-鿿])/g, ' $1 ').trim();
  if (!normalized) return { rows: [] };
  const result = await db.execute(sql`
    SELECT id, title, slug, excerpt, status, published,
           ts_rank(content_tsv, plainto_tsquery('simple', ${normalized})) as rank_,
           ts_headline(content_md, plainto_tsquery('simple', ${normalized}),
             'MaxFragments=1, MaxWords=60, StartSel=<mark>, StopSel=</mark>') as snippet
    FROM notes
    WHERE author_id = ${authorId}::uuid AND content_tsv @@ plainto_tsquery('simple', ${normalized})
    ORDER BY rank_ DESC, updated_at DESC
    LIMIT ${limit}
  `);
  return { rows: result.rows as Record<string, unknown>[] };
}

export async function getGraph(authorId: string) {
  const rows = await db.select().from(notes).where(sql`${notes.authorId} = ${authorId}::uuid`);
  const linkRows = await db.select().from(links).where(sql`${links.sourceId} IN (SELECT id FROM notes WHERE author_id = ${authorId}::uuid)`);
  const statusWeight = { seedling: 1, budding: 2, evergreen: 3 } as const;
  const nodes = rows.map((n) => ({
    id: n.id,
    title: n.title,
    slug: n.slug,
    status: n.status,
    size: statusWeight[n.status],
  }));
  const edges = linkRows
    .filter((l) => l.targetId !== null)
    .map((l) => ({ source: l.sourceId, target: l.targetId as string }));
  return { nodes, edges };
}

export async function getStats(authorId: string) {
  const rows = await db
    .select()
    .from(notes)
    .where(sql`${notes.authorId} = ${authorId}::uuid`);
  const linkRows = await db
    .select({ sourceId: links.sourceId, targetId: links.targetId })
    .from(links)
    .where(sql`${links.sourceId} IN (SELECT id FROM notes WHERE author_id = ${authorId}::uuid)`);

  const outbound = new Set(linkRows.map((l) => l.sourceId));
  const inbound = new Set(linkRows.filter((l) => l.targetId !== null).map((l) => l.targetId as string));
  const byStatus = { seedling: 0, budding: 0, evergreen: 0 };
  for (const n of rows) byStatus[n.status] += 1;
  return {
    total: rows.length,
    byStatus,
    links: linkRows.filter((l) => l.targetId !== null).length,
    orphans: rows.filter((n) => !outbound.has(n.id) && !inbound.has(n.id)).length,
    heatmap: heatmapRows(rows),
  };
}

function heatmapRows(rows: typeof notes.$inferSelect[]) {
  const buckets = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 26 * 7 + 1);
  const key = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  for (const n of rows) {
    const d = n.updatedAt instanceof Date ? n.updatedAt : new Date(n.updatedAt);
    const k = key(d);
    if (k < key(start)) continue;
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  const cells: { date: string; count: number }[] = [];
  for (let i = 0; i < 26 * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: key(d), count: buckets.get(key(d)) ?? 0 });
  }
  return cells;
}

export async function getStreak(authorId: string) {
  const rows = await db
    .select({ updatedAt: notes.updatedAt })
    .from(notes)
    .where(sql`${notes.authorId} = ${authorId}::uuid`);
  const days = new Set(
    rows.map((r) => {
      const d = r.updatedAt instanceof Date ? r.updatedAt : new Date(r.updatedAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = today;
  const todayKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
  if (!days.has(todayKey)) {
    cursor = new Date(today);
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (true) {
    const k = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (!days.has(k)) break;
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeExcerpt(contentMd: string) {
  return excerptOf(contentMd);
}

export function computeReadingMins(contentMd: string) {
  return readingMinutes(contentMd);
}

export async function ensureIndexes() {
  await db.execute(sql`CREATE INDEX IF NOT EXISTS notes_content_tsv_gin ON notes USING gin (content_tsv)`);
}

export async function deleteUserNotes(authorId: string) {
  await db.delete(notes).where(sql`${notes.authorId} = ${authorId}::uuid`);
}

export async function userByHandle(handle: string) {
  const rows = await db.select().from(users).where(sql`${users.handle} = ${handle}`).limit(1);
  return rows[0] ?? null;
}
