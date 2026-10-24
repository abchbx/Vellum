import { NextRequest } from 'next/server';
import { loginUser } from '@/lib/auth-service';
import { setSessionCookie } from '@/lib/auth';
import { ok, fail, handleError, csrfOk } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!csrfOk(req)) return fail(403, 'CSRF', '请求来源校验失败');
    const body = await req.json().catch(() => null);
    const result = await loginUser(req.headers, body);
    if (!result.ok) {
      return fail(result.status ?? 500, 'AUTH', result.error ?? '登录失败');
    }
    const secure = req.nextUrl.protocol === 'https:';
    await setSessionCookie(result.token as string, secure);
    return ok({ id: result.user?.id, handle: result.user?.handle });
  } catch (err) {
    return handleError(err);
  }
}
