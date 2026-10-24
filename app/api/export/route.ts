import { NextRequest } from 'next/server';
import { requireUserFromRequest } from '@/lib/auth';
import { db } from '@/db';
import { noteTags, notes, tags } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { buildZip } from '@/lib/zip';
import { fail, handleError, csrfOk } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!csrfOk(req)) return fail(403, 'CSRF', '请求来源校验失败');
    const user = await requireUserFromRequest(req);
    const body = await req.json().catch(() => null);
    const format = body?.format === 'json' ? 'json' : 'md-zip';

    const rows = await db.select().from(notes).where(sql`${notes.authorId} = ${user.id}::uuid`);

    if (format === 'json') {
      const data = JSON.stringify({ exportedAt: new Date().toISOString(), notes: rows }, null, 2);
      return new Response(data, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="vellum-export-${user.handle}.json"`,
        },
      });
    }

    const tagRows = await db
      .select({ noteId: noteTags.noteId, tagId: noteTags.tagId, name: tags.name })
      .from(noteTags)
      .innerJoin(tags, sql`${tags.id} = ${noteTags.tagId}`)
      .execute();

    const entries = rows.map((n) => {
      const tagsOfNote = tagRows.filter((t) => t.noteId === n.id).map((t) => t.name);
      const frontmatter = [
        '---',
        `title: ${n.title}`,
        `slug: ${n.slug}`,
        `status: ${n.status}`,
        `published: ${n.published}`,
        `updated: ${n.updatedAt instanceof Date ? n.updatedAt.toISOString() : n.updatedAt}`,
        `tags: [${tagsOfNote.join(', ')}]`,
        '---',
        '',
        n.contentMd,
      ].join('\n');
      return { name: `${n.slug}.md`, content: frontmatter };
    });

    const zip = buildZip(entries);
    return new Response(new Uint8Array(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="vellum-export-${user.handle}.zip"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function GET(req: NextRequest) {
  void req;
  return fail(405, 'METHOD_NOT_ALLOWED', '请使用 POST');
}
