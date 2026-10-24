import { NextRequest } from 'next/server';
import { requireUserFromRequest } from '@/lib/auth';
import { getStats, getStreak } from '@/db/queries';
import { ok, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromRequest(req);
    const stats = await getStats(user.id);
    const streak = await getStreak(user.id);
    return ok({ ...stats, streakDays: streak });
  } catch (err) {
    return handleError(err);
  }
}
