import { NextRequest } from 'next/server';
import { loginSchema } from '@/lib/zod';
import { verifyPassword, signToken, setSessionCookie, rateLimit } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { ok, fail, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    if (!rateLimit(`login:${ip}`, 10)) {
      return fail(429, 'RATE_LIMIT', '请求过于频繁，请一分钟后再试');
    }
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return fail(400, 'VALIDATION', '输入校验失败');

    const rows = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${parsed.data.email.toLowerCase()}`)
      .limit(1);
    const user = rows[0];
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return fail(401, 'INVALID_CREDENTIALS', '邮箱或密码不正确');
    }
    const token = await signToken(user.id);
    const secure = req.nextUrl.protocol === 'https:';
    await setSessionCookie(token, secure);
    return ok({ id: user.id, handle: user.handle });
  } catch (err) {
    return handleError(err);
  }
}
