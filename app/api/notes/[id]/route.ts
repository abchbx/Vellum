import { NextRequest } from 'next/server';
import { requireUserFromRequest } from '@/lib/auth';
import { db } from '@/db';
import { links, noteTags, notes, tags } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { noteUpdateSchema } from '@/lib/zod';
import { syncTags, computeExcerpt, computeReadingMins } from '@/db/queries';
import { rebuildLinksForNote } from '@/lib/links';
import { ok, fail, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserFromRequest(req);
    const { id } = await ctx.params;
    const rows = await db.select().from(notes).where(sql`${notes.id} = ${id}::uuid`).limit(1);
    const note = rows[0];
    if (!note) return fail(404, 'NOT_FOUND', '笔记不存在');
    if (note.authorId !== user.id) return fail(403, 'FORBIDDEN', '无权访问');
    const tagRows = await db
      .select({ tagId: noteTags.tagId, name: tags.name, color: tags.color })
      .from(noteTags)
      .innerJoin(tags, sql`${tags.id} = ${noteTags.tagId}`)
      .where(sql`${noteTags.noteId} = ${id}::uuid`);
    const outgoing = await db
      .select({ targetSlug: links.targetSlug, resolved: links.targetId })
      .from(links)
      .where(sql`${links.sourceId} = ${id}::uuid`);
    return ok({
      note: { ...note, tags: tagRows.map((t) => ({ id: t.tagId, name: t.name, color: t.color })) },
      outgoing,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserFromRequest(req);
    const { id } = await ctx.params;
    const rows = await db.select().from(notes).where(sql`${notes.id} = ${id}::uuid`).limit(1);
    const note = rows[0];
    if (!note) return fail(404, 'NOT_FOUND', '笔记不存在');
    if (note.authorId !== user.id) return fail(403, 'FORBIDDEN', '无权修改');

    const body = await req.json().catch(() => null);
    const parsed = noteUpdateSchema.safeParse(body);
    if (!parsed.success) return fail(400, 'VALIDATION', '输入校验失败');

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.contentMd !== undefined) {
      patch.contentMd = parsed.data.contentMd;
      patch.excerpt = computeExcerpt(parsed.data.contentMd);
      patch.readingMins = computeReadingMins(parsed.data.contentMd);
    }
    if (parsed.data.status !== undefined) patch.status = parsed.data.status;
    if (parsed.data.published !== undefined) {
      patch.published = parsed.data.published;
      patch.publishedAt = parsed.data.published ? new Date() : null;
    }
    const [updated] = await db
      .update(notes)
      .set(patch as never)
      .where(sql`${notes.id} = ${id}::uuid`)
      .returning();
    if (!updated) throw new Error('update failed');

    if (parsed.data.tagNames !== undefined) await syncTags(user.id, id, parsed.data.tagNames);
    await rebuildLinksForNote(id, user.id);
    return ok({ note: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserFromRequest(req);
    const { id } = await ctx.params;
    const rows = await db.select().from(notes).where(sql`${notes.id} = ${id}::uuid`).limit(1);
    const note = rows[0];
    if (!note) return fail(404, 'NOT_FOUND', '笔记不存在');
    if (note.authorId !== user.id) return fail(403, 'FORBIDDEN', '无权删除');
    await db.delete(notes).where(sql`${notes.id} = ${id}::uuid`);
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
