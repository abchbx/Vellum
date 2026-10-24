'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { registerUser, loginUser } from '@/lib/auth-service';
import { setSessionCookie, clearSessionCookie, getSessionUser } from '@/lib/auth';
import { noteUpdateSchema } from '@/lib/zod';
import { db } from '@/db';
import { notes } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { uniqueSlug, syncTags, computeExcerpt, computeReadingMins } from '@/db/queries';
import { rebuildLinksForNote } from '@/lib/links';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function registerAction(prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  void prev;
  const h = await headers();
  const result = await registerUser(h, {
    email: String(form.get('email') ?? ''),
    password: String(form.get('password') ?? ''),
    handle: String(form.get('handle') ?? ''),
    displayName: String(form.get('displayName') ?? ''),
  });
  if (!result.ok) return { ok: false, error: result.error };
  await setSessionCookie(result.token as string, process.env.NODE_ENV === 'production');
  redirect('/app');
}

export async function loginAction(prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  void prev;
  const h = await headers();
  const result = await loginUser(h, {
    email: String(form.get('email') ?? ''),
    password: String(form.get('password') ?? ''),
  });
  if (!result.ok) return { ok: false, error: result.error };
  await setSessionCookie(result.token as string, process.env.NODE_ENV === 'production');
  redirect('/app');
}

export async function logoutAction(): Promise<ActionResult> {
  await clearSessionCookie();
  redirect('/');
}

export async function saveNoteAction(noteId: string, form: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: '未登录' };

  const body = {
    title: String(form.get('title') ?? ''),
    contentMd: String(form.get('contentMd') ?? ''),
    status: String(form.get('status') ?? 'seedling') as 'seedling' | 'budding' | 'evergreen',
    published: form.get('published') === 'true',
    tagNames: String(form.get('tagNames') ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  };
  const parsed = noteUpdateSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: '内容校验失败' };

  const rows = await db.select().from(notes).where(sql`${notes.id} = ${noteId}::uuid`).limit(1);
  const note = rows[0];
  if (!note) return { ok: false, error: '笔记不存在' };
  if (note.authorId !== user.id) return { ok: false, error: '无权修改' };

  await db
    .update(notes)
    .set({
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.contentMd !== undefined
        ? { contentMd: parsed.data.contentMd, excerpt: computeExcerpt(parsed.data.contentMd), readingMins: computeReadingMins(parsed.data.contentMd) }
        : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      published: parsed.data.published,
      publishedAt: parsed.data.published ? new Date() : null,
      updatedAt: new Date(),
    } as never)
    .where(sql`${notes.id} = ${noteId}::uuid`);

  await syncTags(user.id, noteId, parsed.data.tagNames ?? []);
  await rebuildLinksForNote(noteId, user.id);
  revalidatePath('/app');
  return { ok: true };
}

export async function createNoteAction(form: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: '未登录' };

  const title = String(form.get('title') ?? '');
  if (!title.trim()) return { ok: false, error: '标题不能为空' };

  const slug = await uniqueSlug(user.id, title);
  const [note] = await db
    .insert(notes)
    .values({
      authorId: user.id,
      slug,
      title,
      contentMd: '',
      excerpt: '',
      readingMins: 1,
    })
    .returning({ id: notes.id });
  if (!note) return { ok: false, error: '创建失败' };
  revalidatePath('/app');
  return { ok: true };
}
