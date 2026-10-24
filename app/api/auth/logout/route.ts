import { NextRequest } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { ok, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    await clearSessionCookie();
    return ok({ loggedOut: true });
  } catch (err) {
    return handleError(err);
  }
}
