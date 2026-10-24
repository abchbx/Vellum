import { describe, expect, it } from 'vitest';
import { calcStreak, toDateKey } from '@/lib/stats';

function day(offset: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d;
}

describe('连续写作天数', () => {
  it('今天与昨天都写了 => 至少 2 天', () => {
    expect(calcStreak([day(0), day(1)])).toBeGreaterThanOrEqual(2);
  });

  it('断了一天则重置', () => {
    const streak = calcStreak([day(0), day(1), day(3), day(4)]);
    expect(streak).toBeLessThanOrEqual(2);
  });

  it('空数组为 0', () => {
    expect(calcStreak([])).toBe(0);
  });

  it('日期键格式正确', () => {
    const d = new Date(2026, 9, 24);
    expect(toDateKey(d)).toBe('2026-10-24');
  });
});
