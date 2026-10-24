import { NextRequest } from 'next/server';
import { getSessionUserFromRequest, revokeAllSessions, clearSessionCookie } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { ok, fail, handleError, csrfOk } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!csrfOk(req)) return fail(403, 'CSRF', '请求来源校验失败');
    const user = await getSessionUserFromRequest(req);
    if (!user) return fail(401, 'UNAUTHORIZED', '未登录');

    await db.delete(users).where(sql`${users.id} = ${user.id}::uuid`);
    await revokeAllSessions(user.id);
    await clearSessionCookie();
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
