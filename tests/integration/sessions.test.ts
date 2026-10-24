import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb } from '../../db';
import { users } from '../../db/schema';
import { signToken, createSession, revokeAllSessions, verifyToken } from '../../lib/auth';

const hasDb = !!process.env.DATABASE_URL;
const suite = hasDb ? describe : describe.skip;

suite('会话撤销（P1-7）', () => {
  it('登出（撤销全部会话）后已签发 token 失效', async () => {
    const db = getDb();
    const handle = `sess-${Date.now().toString(36)}`;
    const [user] = await db
      .insert(users)
      .values({ email: `${handle}@t.local`, handle, passwordHash: 'x' })
      .returning({ id: users.id });

    const { token, jti } = await signToken(user!.id);
    await createSession(user!.id, jti);
    expect(await verifyToken(token)).toBe(user!.id);

    await revokeAllSessions(user!.id);
    expect(await verifyToken(token)).toBeNull();

    await db.delete(users).where(sql`${users.id} = ${user!.id}::uuid`);
  }, 30_000);

  it('未登记的 jti 无法通过验证', async () => {
    const { token } = await signToken('00000000-0000-0000-0000-000000000000');
    expect(await verifyToken(token)).toBeNull();
  }, 30_000);
});
