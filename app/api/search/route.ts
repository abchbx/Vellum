import { NextRequest } from 'next/server';
import { requireUserFromRequest } from '@/lib/auth';
import { searchNotes } from '@/db/queries';
import { ok, fail, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromRequest(req);
    const q = req.nextUrl.searchParams.get('q') ?? '';
    if (q.trim().length < 1) return fail(400, 'VALIDATION', '请输入搜索词');
    const { rows } = await searchNotes(user.id, q, 20);
    return ok({
      items: rows.map((r) => ({
        id: (r as Record<string, unknown>).id,
        title: (r as Record<string, unknown>).title,
        slug: (r as Record<string, unknown>).slug,
        excerpt: (r as Record<string, unknown>).excerpt,
        status: (r as Record<string, unknown>).status,
        published: (r as Record<string, unknown>).published,
        snippet: (r as Record<string, unknown>).snippet,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
