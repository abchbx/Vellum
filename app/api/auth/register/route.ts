import { NextRequest } from 'next/server';
import { registerSchema } from '@/lib/zod';
import { hashPassword, signToken, setSessionCookie, rateLimit } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { ok, fail, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    const bucket = rateLimit(`register:${ip}`, 10);
    if (!bucket) return fail(429, 'RATE_LIMIT', '请求过于频繁，请一分钟后再试');

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return fail(400, 'VALIDATION', '输入校验失败');
    const { email, password, handle, displayName } = parsed.data;
    const lowerEmail = email.toLowerCase();

    const conflict = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`(lower(${users.email}) = ${lowerEmail} OR ${users.handle} = ${handle})`)
      .limit(1);
    if (conflict.length > 0) return fail(409, 'CONFLICT', '邮箱或 handle 已被注册');

    const [created] = await db
      .insert(users)
      .values({
        email: lowerEmail,
        handle,
        passwordHash: hashPassword(password),
        displayName: displayName ?? handle,
        gardenPublic: false,
      })
      .returning({ id: users.id, handle: users.handle });

    if (!created) throw new Error('insert failed');
    const token = await signToken(created.id);
    const secure = req.nextUrl.protocol === 'https:';
    await setSessionCookie(token, secure);
    return ok({ id: created.id, handle: created.handle });
  } catch (err) {
    return handleError(err);
  }
}
