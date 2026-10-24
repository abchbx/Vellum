import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb } from '../../db';
import { notes, users } from '../../db/schema';
import { listNotes } from '../../db/queries';

const hasDb = !!process.env.DATABASE_URL;
const suite = hasDb ? describe : describe.skip;

suite('listNotes 过滤（自查）', () => {
  it('q 过滤命中标题或正文', async () => {
    const db = getDb();
    const handle = `q-${Date.now().toString(36)}`;
    const [user] = await db
      .insert(users)
      .values({ email: `${handle}@t.local`, handle, passwordHash: 'x' })
      .returning({ id: users.id });

    await db.insert(notes).values({ authorId: user!.id, slug: 'one', title: '含搜索词的笔记', contentMd: '正文' });
    await db.insert(notes).values({ authorId: user!.id, slug: 'two', title: '无关笔记', contentMd: '正文也有搜索词' });

    const result = await listNotes(user!.id, { q: '搜索词' });
    expect(result.items.length).toBe(2);

    const none = await listNotes(user!.id, { q: '绝不存在的词' });
    expect(none.items.length).toBe(0);

    await db.delete(users).where(sql`${users.id} = ${user!.id}::uuid`);
  }, 30_000);
});
