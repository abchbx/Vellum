import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { csrfOk } from '@/lib/http';

const siteUrl = 'http://localhost:3000';
(process.env as Record<string, string>).NEXT_PUBLIC_SITE_URL = siteUrl;

function req(method: string, opts: { origin?: string; referer?: string; cookie?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.origin) headers.origin = opts.origin;
  if (opts.referer) headers.referer = opts.referer;
  if (opts.cookie) headers.cookie = `vl_session=${opts.cookie}`;
  return new NextRequest(`${siteUrl}/api/notes`, { method, headers });
}

describe('CSRF 来源校验（P1-8）', () => {
  it('GET/HEAD 直接放行', () => {
    expect(csrfOk(req('GET', { cookie: 'x' }))).toBe(true);
    expect(csrfOk(req('HEAD', { cookie: 'x' }))).toBe(true);
  });

  it('无会话 Cookie 的变更请求不构成 CSRF 风险', () => {
    expect(csrfOk(req('POST'))).toBe(true);
  });

  it('带 Cookie 但无 Origin/Referer 时拒绝', () => {
    expect(csrfOk(req('POST', { cookie: 'tok' }))).toBe(false);
  });

  it('Origin 匹配站点时放行', () => {
    expect(csrfOk(req('POST', { cookie: 'tok', origin: siteUrl }))).toBe(true);
  });

  it('Origin 不匹配时拒绝', () => {
    expect(csrfOk(req('POST', { cookie: 'tok', origin: 'http://evil.example' }))).toBe(false);
  });

  it('Referer 匹配站点时放行', () => {
    expect(csrfOk(req('POST', { cookie: 'tok', referer: `${siteUrl}/app` }))).toBe(true);
  });

  it('Referer 不匹配时拒绝', () => {
    expect(csrfOk(req('POST', { cookie: 'tok', referer: 'http://evil.example/x' }))).toBe(false);
  });
});
