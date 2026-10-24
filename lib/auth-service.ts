import { registerSchema, loginSchema } from './zod';
import { hashPassword, verifyPassword, signToken } from './auth';
import { db } from '../db';
import { users } from '../db/schema';
import { sql } from 'drizzle-orm';

export interface AuthResult {
  ok: boolean;
  user?: { id: string; handle: string };
  token?: string;
  error?: string;
  status?: number;
}

export function getClientIp(headers: Headers): string {
  if (process.env.TRUST_PROXY === 'true') {
    const xff = headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() ?? 'unknown';
  }
  return 'local';
}

export class RateLimiter {
  private buckets = new Map<string, number[]>();
  private now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  hit(key: string, limit: number, windowMs: number): boolean {
    const now = this.now();
    const arr = this.buckets.get(key) ?? [];
    const fresh = arr.filter((t) => now - t < windowMs);
    if (fresh.length >= limit) {
      this.buckets.set(key, fresh);
      return false;
    }
    fresh.push(now);
    this.buckets.set(key, fresh);
    this.sweep(now);
    return true;
  }

  count(key: string, windowMs: number): number {
    const now = this.now();
    const arr = this.buckets.get(key) ?? [];
    const fresh = arr.filter((t) => now - t < windowMs);
    this.buckets.set(key, fresh);
    return fresh.length;
  }

  record(key: string, windowMs: number): void {
    const now = this.now();
    const arr = this.buckets.get(key) ?? [];
    arr.push(now);
    this.buckets.set(key, arr.filter((t) => now - t < windowMs));
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  sweep(now: number = this.now()): void {
    const cutoff = now - 10 * 60_000;
    for (const [key, arr] of this.buckets) {
      if (arr.length === 0 || (arr[arr.length - 1] ?? 0) < cutoff) this.buckets.delete(key);
    }
  }

  size(): number {
    return this.buckets.size;
  }
}

export const authLimiter = new RateLimiter();

const WINDOW = 60_000;
const REGISTER_IP_LIMIT = 10;
const REGISTER_EMAIL_LIMIT = 5;
const LOGIN_IP_LIMIT = 10;
const LOGIN_EMAIL_LIMIT = 20;
const LOGIN_FAIL_LIMIT = 10;

export async function registerUser(headers: Headers, body: unknown): Promise<AuthResult> {
  const ip = getClientIp(headers);
  if (!authLimiter.hit(`register:ip:${ip}`, REGISTER_IP_LIMIT, WINDOW)) {
    return { ok: false, error: '注册请求过于频繁，请一分钟后再试', status: 429 };
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: '输入校验失败', status: 400 };
  const { email, password, handle, displayName } = parsed.data;
  const lowerEmail = email.toLowerCase();

  if (!authLimiter.hit(`register:email:${lowerEmail}`, REGISTER_EMAIL_LIMIT, WINDOW)) {
    return { ok: false, error: '该邮箱注册过于频繁', status: 429 };
  }

  const conflict = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`(lower(${users.email}) = ${lowerEmail} OR ${users.handle} = ${handle})`)
    .limit(1);
  if (conflict.length > 0) return { ok: false, error: '邮箱或 handle 已被注册', status: 409 };

  const [created] = await db
    .insert(users)
    .values({
      email: lowerEmail,
      handle,
      passwordHash: hashPassword(password),
      displayName: displayName ?? handle,
    })
    .returning({ id: users.id, handle: users.handle });
  if (!created) return { ok: false, error: '注册失败，请重试', status: 500 };

  const token = await signToken(created.id);
  return { ok: true, user: { id: created.id, handle: created.handle }, token };
}

export async function loginUser(headers: Headers, body: unknown): Promise<AuthResult> {
  const ip = getClientIp(headers);
  if (!authLimiter.hit(`login:ip:${ip}`, LOGIN_IP_LIMIT, WINDOW)) {
    return { ok: false, error: '登录请求过于频繁，请一分钟后再试', status: 429 };
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: '输入校验失败', status: 400 };
  const email = parsed.data.email.toLowerCase();

  if (!authLimiter.hit(`login:email:${email}`, LOGIN_EMAIL_LIMIT, WINDOW)) {
    return { ok: false, error: '该邮箱登录尝试过多', status: 429 };
  }

  const failKey = `login-fail:email:${email}`;
  if (authLimiter.count(failKey, WINDOW) >= LOGIN_FAIL_LIMIT) {
    return { ok: false, error: '登录失败次数过多，请稍后再试', status: 429 };
  }

  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    authLimiter.record(failKey, WINDOW);
    return { ok: false, error: '邮箱或密码不正确', status: 401 };
  }
  authLimiter.reset(failKey);

  const token = await signToken(user.id);
  return { ok: true, user: { id: user.id, handle: user.handle }, token };
}
