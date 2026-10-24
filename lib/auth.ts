import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { db } from '../db';
import { users } from '../db/schema';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dev-only-insecure-secret-32chars-min-xxxxxxxxxx',
);
export const SESSION_COOKIE = 'vl_session';
const SESSION_DAYS = 7;

const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p });
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_r,
    SCRYPT_p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [_, n, r, p, saltB64, hashB64] = stored.split('$');
    const salt = Buffer.from(saltB64 ?? '', 'base64');
    const expected = Buffer.from(hashB64 ?? '', 'base64');
    const actual = scryptSync(password, salt, 64, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(SESSION_SECRET);
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return typeof payload.sub === 'string' ? payload.sub : null;
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
  const rows = await db.select().from(users).where(users.id = userId as never).limit(1);
  return rows[0] ?? null;
}

export async function getSessionUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifyToken(token);
  if (!userId) return null;
  const rows = await db.select().from(users).where(users.id = userId as never).limit(1);
  return rows[0] ?? null;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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
