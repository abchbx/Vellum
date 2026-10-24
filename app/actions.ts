'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  hashPassword,
  verifyPassword,
  signToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionUser,
} from '@/lib/auth';
import { registerSchema, loginSchema, noteUpdateSchema } from '@/lib/zod';
import { db } from '@/db';
import { notes, users } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { uniqueSlug, syncTags, computeExcerpt, computeReadingMins } from '@/db/queries';
import { rebuildLinksForNote } from '@/lib/links';
import { cookies } from 'next/headers';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function registerAction(form: FormData): Promise<ActionResult> {
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');
  const handle = String(form.get('handle') ?? '');
  const displayName = String(form.get('displayName') ?? '');

  const parsed = registerSchema.safeParse({ email, password, handle, displayName });
  if (!parsed.success) return { ok: false, error: '请检查邮箱、密码与 handle（3-24 位小写字母、数字、_、-）' };

  const lowerEmail = email.toLowerCase();
  const conflict = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`(lower(${users.email}) = ${lowerEmail} OR ${users.handle} = ${handle})`)
    .limit(1);
  if (conflict.length > 0) return { ok: false, error: '邮箱或 handle 已被注册' };

  const [created] = await db
    .insert(users)
    .values({
      email: lowerEmail,
      handle,
      passwordHash: hashPassword(password),
      displayName: displayName || handle,
    })
    .returning({ id: users.id });
  if (!created) return { ok: false, error: '注册失败，请重试' };

  const token = await signToken(created.id);
  const store = await cookies();
  const isProd = process.env.NODE_ENV === 'production';
  store.set('vl_session', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  redirect('/app');
}

export async function loginAction(form: FormData): Promise<ActionResult> {
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) return { ok: false, error: '请输入邮箱与密码' };

  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: '邮箱或密码不正确' };
  }
  const token = await signToken(user.id);
  const store = await cookies();
  const isProd = process.env.NODE_ENV === 'production';
  store.set('vl_session', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
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
