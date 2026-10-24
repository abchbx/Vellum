import { NextRequest } from 'next/server';
import { requireUserFromRequest } from '@/lib/auth';
import { db } from '@/db';
import { links, notes } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { ok, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserFromRequest(req);
    const { id } = await ctx.params;
    const rows = await db
      .select()
      .from(notes)
      .where(
        sql`${notes.authorId} = ${user.id}::uuid AND ${notes.id} IN (SELECT ${links.sourceId} FROM ${links} WHERE ${links.targetId} = ${id}::uuid)`,
      )
      .orderBy(sql`${notes.updatedAt} DESC`);
    return ok({ items: rows });
  } catch (err) {
    return handleError(err);
  }
}
