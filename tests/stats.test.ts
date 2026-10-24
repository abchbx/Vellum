import { describe, expect, it } from 'vitest';
import { calcStreak, heatmap, toDateKey } from '@/lib/stats';
import type { Note } from '@/db/schema';

function day(offset: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d;
}

function at(y: number, m: number, d: number): Date {
  return new Date(y, m, d, 12, 0, 0, 0);
}

describe('连续写作天数（生产路径 = lib/stats.ts，P1-6）', () => {
  it('今天与昨天都写了 => 至少 2 天', () => {
    expect(calcStreak([day(0), day(1)])).toBeGreaterThanOrEqual(2);
  });

  it('跨月边界连续', () => {
    expect(calcStreak([at(2026, 1, 28), at(2026, 2, 1)], at(2026, 2, 1))).toBe(2);
  });

  it('跨年边界连续', () => {
    expect(calcStreak([at(2025, 11, 31), at(2026, 0, 1)], at(2026, 0, 1))).toBe(2);
  });

  it('断了一天则重置', () => {
    const streak = calcStreak([day(0), day(1), day(3), day(4)]);
    expect(streak).toBeLessThanOrEqual(2);
  });

  it('空数组为 0', () => {
    expect(calcStreak([])).toBe(0);
  });

  it('今天没写但昨天写了 => 从昨天计', () => {
    expect(calcStreak([day(1)])).toBe(1);
  });

  it('日期键格式正确', () => {
    expect(toDateKey(new Date(2026, 9, 24))).toBe('2026-10-24');
  });
});

describe('热力图（P1-6）', () => {
  const mk = (updatedAt: Date): Note =>
    ({
      id: 'x',
      authorId: 'a',
      slug: 's',
      title: 't',
      contentMd: '',
      excerpt: '',
      status: 'seedling',
      readingMins: 1,
      published: false,
      createdAt: updatedAt,
      updatedAt,
      publishedAt: null,
      contentTsv: '',
    }) as Note;

  it('窗口为 26 周 = 182 格', () => {
    expect(heatmap([])).toHaveLength(182);
  });

  it('超窗日期被排除', () => {
    const old = new Date();
    old.setDate(old.getDate() - 30 * 7);
    const cells = heatmap([mk(old), mk(day(0))]);
    const last = cells[cells.length - 1];
    expect(last?.date).toBe(toDateKey(day(0)));
    expect(cells.reduce((s, c) => s + c.count, 0)).toBe(1);
  });

  it('同一天多次更新累计', () => {
    const cells = heatmap([mk(day(0)), mk(day(0))]);
    const today = toDateKey(day(0));
    expect(cells.find((c) => c.date === today)?.count).toBe(2);
  });
});
