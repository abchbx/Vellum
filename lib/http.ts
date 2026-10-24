import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof HttpError) return fail(err.status, err.code, err.message);
  if (err instanceof ZodError) return fail(400, 'VALIDATION', '输入校验失败');
  const msg = err instanceof Error ? err.message : '服务器内部错误';
  if (msg.includes('23505')) return fail(409, 'CONFLICT', '资源已存在');
  if (msg.includes('23502')) return fail(400, 'FOREIGN_KEY', '关联资源不存在');
  console.error('[api]', err);
  return fail(500, 'INTERNAL', '服务器内部错误');
}
