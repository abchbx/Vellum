import { NextRequest } from 'next/server';
import { getSessionUserFromRequest, revokeAllSessions, clearSessionCookie } from '@/lib/auth';
import { ok, fail, handleError, csrfOk } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!csrfOk(req)) return fail(403, 'CSRF', '请求来源校验失败');
    const user = await getSessionUserFromRequest(req);
    if (user) await revokeAllSessions(user.id);
    await clearSessionCookie();
    return ok({ loggedOut: true });
  } catch (err) {
    return handleError(err);
  }
}
