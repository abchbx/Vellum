import { randomBytes, scrypt, timingSafeEqual, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { users, sessions as sessionsTable } from '../db/schema';
import { HttpError } from './http';

function loadSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === 'test') {
      return new TextEncoder().encode('test-only-secret-32chars-min-0000000000');
    }
    throw new Error('SESSION_SECRET 未配置或长度不足 32 字符，拒绝启动');
  }
  return new TextEncoder().encode(raw);
}

const SESSION_SECRET = loadSecret();
export const SESSION_COOKIE = 'vl_session';
const SESSION_DAYS = 7;

const SCRYPT_N = 32768;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

export function scryptParams() {
  return { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p, maxmem: SCRYPT_MAXMEM },
      (err, d) => (err ? reject(err) : resolve(d)),
    );
  });
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_r,
    SCRYPT_p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    const salt = Buffer.from(parts[4] ?? '', 'base64');
    const expected = Buffer.from(parts[5] ?? '', 'base64');
    const actual = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        password,
        salt,
        expected.length,
        { N: Number(parts[1]), r: Number(parts[2]), p: Number(parts[3]), maxmem: SCRYPT_MAXMEM },
        (err, d) => (err ? reject(err) : resolve(d)),
      );
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function signToken(userId: string): Promise<{ token: string; jti: string }> {
  const jti = randomUUID();
  const token = await new SignJWT({ sub: userId, jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(SESSION_SECRET);
  return { token, jti };
}

export async function createSession(userId: string, jti: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60_000);
  await db
    .insert(sessionsTable)
    .values({ userId, jti, expiresAt })
    .onConflictDoNothing();
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(sessionsTable).where(sql`${sessionsTable.userId} = ${userId}::uuid`);
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    if (typeof payload.sub !== 'string' || typeof payload.jti !== 'string') return null;
    const rows = await db
      .select({ id: sessionsTable.id, expiresAt: sessionsTable.expiresAt })
      .from(sessionsTable)
      .where(sql`${sessionsTable.jti} = ${payload.jti}`)
      .limit(1);
    const session = rows[0];
    if (!session) return null;
    const expires = session.expiresAt instanceof Date ? session.expiresAt : new Date(session.expiresAt);
    if (expires.getTime() <= Date.now()) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

function cookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export async function setSessionCookie(token: string, secure: boolean) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(secure));
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifyToken(token);
  if (!userId) return null;
  const rows = await db.select().from(users).where(sql`${users.id} = ${userId}::uuid`).limit(1);
  return rows[0] ?? null;
}

export async function getSessionUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifyToken(token);
  if (!userId) return null;
  const rows = await db.select().from(users).where(sql`${users.id} = ${userId}::uuid`).limit(1);
  return rows[0] ?? null;
}

export class AuthError extends HttpError {
  constructor(status: number, message: string) {
    super(status, status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message);
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401, '未登录');
  return user;
}

export async function requireUserFromRequest(req: NextRequest) {
  const user = await getSessionUserFromRequest(req);
  if (!user) throw new AuthError(401, '未登录');
  return user;
}

type Bucket = { counts: number[] };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const bucket = (buckets.get(key) ?? { counts: [] }) as Bucket;
  bucket.counts = bucket.counts.filter((t) => now - t < windowMs);
  if (bucket.counts.length >= limit) return false;
  bucket.counts.push(now);
  buckets.set(key, bucket);
  return true;
}
