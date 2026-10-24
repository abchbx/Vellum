import { describe, expect, it } from 'vitest';
import { RateLimiter, getClientIp } from '@/lib/auth-service';

describe('RateLimiter（P1-4）', () => {
  it('达到上限后拒绝', () => {
    const t = 0;
    const rl = new RateLimiter(() => t);
    for (let i = 0; i < 3; i++) expect(rl.hit('k', 3, 60_000)).toBe(true);
    expect(rl.hit('k', 3, 60_000)).toBe(false);
  });

  it('窗口过期后桶自动消失', () => {
    let t = 0;
    const rl = new RateLimiter(() => t);
    rl.hit('k', 1, 60_000);
    expect(rl.hit('k', 1, 60_000)).toBe(false);
    t = 61_000;
    expect(rl.hit('k', 1, 60_000)).toBe(true);
    t = 61_000 + 10 * 60_000 + 1;
    rl.sweep();
    expect(rl.size()).toBe(0);
  });

  it('record 计数与 reset 清零', () => {
    const t = 0;
    const rl = new RateLimiter(() => t);
    for (let i = 0; i < 3; i++) rl.record('fail', 60_000);
    expect(rl.count('fail', 60_000)).toBe(3);
    rl.reset('fail');
    expect(rl.count('fail', 60_000)).toBe(0);
  });

  it('计数窗口过期后归零', () => {
    let t = 0;
    const rl = new RateLimiter(() => t);
    rl.record('fail', 60_000);
    t = 61_000;
    expect(rl.count('fail', 60_000)).toBe(0);
  });
});

describe('getClientIp（TRUST_PROXY 策略）', () => {
  const headersOf = (xff?: string) => new Headers(xff ? { 'x-forwarded-for': xff } : {});

  it('TRUST_PROXY=true 时信任 xff 首段', () => {
    (process.env as Record<string, string>).TRUST_PROXY = 'true';
    expect(getClientIp(headersOf('1.2.3.4, 5.6.7.8'))).toBe('1.2.3.4');
    (process.env as Record<string, string>).TRUST_PROXY = '';
  });

  it('未开启 TRUST_PROXY 时不信任 xff', () => {
    (process.env as Record<string, string>).TRUST_PROXY = '';
    expect(getClientIp(headersOf('1.2.3.4'))).toBe('local');
  });
});
