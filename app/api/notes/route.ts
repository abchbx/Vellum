import { NextRequest } from 'next/server';
import { requireUserFromRequest } from '@/lib/auth';
import { db } from '@/db';
import { notes } from '@/db/schema';
import { noteCreateSchema } from '@/lib/zod';
import { uniqueSlug, syncTags, computeExcerpt, computeReadingMins, listNotes } from '@/db/queries';
import { rebuildLinksForNote, resolveDanglingLinks } from '@/lib/links';
import { ok, fail, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUserFromRequest(req);
    const sp = req.nextUrl.searchParams;
    const status = sp.get('status') ?? undefined;
    if (status && !['seedling', 'budding', 'evergreen'].includes(status)) {
      return fail(400, 'VALIDATION', 'status 无效');
    }
    const result = await listNotes(user.id, {
      status,
      tag: sp.get('tag') ?? undefined,
      q: sp.get('q') ?? undefined,
      cursor: sp.get('cursor') ?? undefined,
      limit: Number(sp.get('limit') ?? 20) || 20,
    });
    return ok({ items: result.items, nextCursor: result.nextCursor });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromRequest(req);
    const body = await req.json().catch(() => null);
    const parsed = noteCreateSchema.safeParse(body);
    if (!parsed.success) return fail(400, 'VALIDATION', '输入校验失败');

    const slug = await uniqueSlug(user.id, parsed.data.title);
    const [note] = await db
      .insert(notes)
      .values({
        authorId: user.id,
        slug,
        title: parsed.data.title,
        contentMd: parsed.data.contentMd ?? '',
        excerpt: computeExcerpt(parsed.data.contentMd ?? ''),
        status: parsed.data.status ?? 'seedling',
        readingMins: computeReadingMins(parsed.data.contentMd ?? ''),
        published: parsed.data.published ?? false,
        publishedAt: parsed.data.published ? new Date() : null,
      })
      .returning();
    if (!note) throw new Error('insert failed');

    if (parsed.data.tagNames) await syncTags(user.id, note.id, parsed.data.tagNames);
    await rebuildLinksForNote(note.id, user.id);
    await resolveDanglingLinks(user.id);
    return ok({ note });
  } catch (err) {
    return handleError(err);
  }
}
