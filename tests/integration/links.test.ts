import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb } from '../../db';
import { links, notes, users } from '../../db/schema';
import { rebuildLinksForNote, resolveDanglingLinks } from '../../lib/links';
import { slugify } from '../../db/queries';

const hasDb = !!process.env.DATABASE_URL;
const suite = hasDb ? describe : describe.skip;

suite('悬空双链回填（P0-7）', () => {
  it('先建 A 引用未存在的 B，再建 B 后回填，反向链接出现', async () => {
    const db = getDb();
    const handle = `test-${Date.now().toString(36)}`;
    const [user] = await db
      .insert(users)
      .values({ email: `${handle}@test.local`, handle, passwordHash: 'x' })
      .returning({ id: users.id });
    expect(user).toBeTruthy();

    const [noteA] = await db
      .insert(notes)
      .values({
        authorId: user!.id,
        slug: slugify('笔记 A'),
        title: '笔记 A',
        contentMd: '本文链接到 [[笔记 B]]。',
      })
      .returning({ id: notes.id });

    await rebuildLinksForNote(noteA!.id, user!.id);
    const dangling = await db
      .select({ targetId: links.targetId })
      .from(links)
      .where(sql`${links.sourceId} = ${noteA!.id}::uuid`);
    expect(dangling[0]?.targetId).toBeNull();

    const [noteB] = await db
      .insert(notes)
      .values({
        authorId: user!.id,
        slug: slugify('笔记 B'),
        title: '笔记 B',
        contentMd: 'B 的正文。',
      })
      .returning({ id: notes.id });

    const resolved = await resolveDanglingLinks(user!.id);
    expect(resolved).toBeGreaterThanOrEqual(1);

    const after = await db
      .select({ targetId: links.targetId })
      .from(links)
      .where(sql`${links.sourceId} = ${noteA!.id}::uuid`);
    expect(after[0]?.targetId).toBe(noteB!.id);

    const backlinks = await db
      .select({ id: notes.id, title: notes.title })
      .from(notes)
      .where(
        sql`${notes.id} IN (SELECT ${links.sourceId} FROM ${links} WHERE ${links.targetId} = ${noteB!.id}::uuid)`,
      );
    expect(backlinks.map((n) => n.title)).toContain('笔记 A');

    await db.delete(users).where(sql`${users.id} = ${user!.id}::uuid`);
  }, 30_000);
});
