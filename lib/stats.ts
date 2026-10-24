import type { Note } from '../db/schema';

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calcStreak(dates: Date[], end?: Date): number {
  if (dates.length === 0) return 0;
  const daySet = new Set(dates.map(toDateKey));
  const today = end ?? new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let cursor = today;
  if (!daySet.has(toDateKey(cursor))) cursor = yesterday;

  let streak = 0;
  while (daySet.has(toDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function heatmap(notes: Note[], weeks = 26): { date: string; count: number }[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - weeks * 7 + 1);

  for (const n of notes) {
    const d = n.updatedAt instanceof Date ? n.updatedAt : new Date(n.updatedAt);
    const key = toDateKey(d);
    if (key < toDateKey(start)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const cells: { date: string; count: number }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toDateKey(d);
    cells.push({ date: key, count: buckets.get(key) ?? 0 });
  }
  return cells;
}

export function heatmapFromDayCounts(
  dayCounts: { date: string; count: number }[],
  weeks = 26,
): { date: string; count: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - weeks * 7 + 1);
  const startKey = toDateKey(start);

  const map = new Map(dayCounts.map((c) => [c.date, c.count]));
  const cells: { date: string; count: number }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toDateKey(d);
    cells.push({ date: key, count: key >= startKey ? (map.get(key) ?? 0) : 0 });
  }
  return cells;
}

export function findOrphans(notes: Note[], outbound: Set<string>, inbound: Set<string>) {
  return notes
    .filter((n) => !outbound.has(n.id) && !inbound.has(n.id))
    .map((n) => ({ id: n.id, title: n.title, slug: n.slug, status: n.status }));
}
