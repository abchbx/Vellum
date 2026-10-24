import { NextRequest } from 'next/server';
import { registerUser } from '@/lib/auth-service';
import { setSessionCookie } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const result = await registerUser(req.headers, body);
    if (!result.ok) {
      return fail(result.status ?? 500, 'AUTH', result.error ?? '注册失败');
    }
    const secure = req.nextUrl.protocol === 'https:';
    await setSessionCookie(result.token as string, secure);
    return ok({ id: result.user?.id, handle: result.user?.handle });
  } catch (err) {
    return handleError(err);
  }
}
