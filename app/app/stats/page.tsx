import { getSessionUser } from '@/lib/auth';
import { db } from '@/db';
import { links, notes } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { getStats, getStreak } from '@/db/queries';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEAT_LEVELS = ['bg-surface-2', 'bg-seedling/35', 'bg-seedling/60', 'bg-seedling/85'];

export default async function StatsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const stats = await getStats(user.id);
  const streak = await getStreak(user.id);

  const orphanRows = await db
    .select({ id: notes.id, title: notes.title, slug: notes.slug, status: notes.status })
    .from(notes)
    .where(
      sql`${notes.authorId} = ${user.id}::uuid AND NOT EXISTS (SELECT 1 FROM ${links} l WHERE l.source_id = ${notes.id} OR l.target_id = ${notes.id})`,
    );

  const maxCount = Math.max(1, ...stats.heatmap.map((c) => c.count));
  const totalDays = new Set(stats.heatmap.map((c) => c.date)).size;

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-16 md:px-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">写作统计</h1>
          <p className="mt-2 text-sm text-muted">诚实的数字，替你记住每一个伏笔。</p>
        </div>
        <div className="flex gap-12">
          <div>
            <p className="font-mono text-xs text-muted">连续天数</p>
            <p className="font-serif text-4xl tabular">{streak}</p>
          </div>
          <div>
            <p className="font-mono text-xs text-muted">笔记总数</p>
            <p className="font-serif text-4xl tabular">{stats.total}</p>
          </div>
          <div>
            <p className="font-mono text-xs text-muted">链接总数</p>
            <p className="font-serif text-4xl tabular">{stats.links}</p>
          </div>
          <div>
            <p className="font-mono text-xs text-muted">孤儿笔记</p>
            <p className="font-serif text-4xl tabular">{orphanRows.length}</p>
          </div>
        </div>
      </div>

      {/* 热力图 */}
      <section className="mt-16">
        <p className="eyebrow">近 26 周 · {totalDays} 个写作日</p>
        <div className="mt-6 flex gap-1 overflow-x-auto pb-2">
          {Array.from({ length: 26 }, (_, week) => (
            <div key={week} className="flex flex-col gap-1">
              {Array.from({ length: 7 }, (_, day) => {
                const cell = stats.heatmap[week * 7 + day];
                if (!cell) return <div key={day} className="h-3 w-3 rounded-sm bg-transparent" />;
                const lvl = cell.count === 0 ? 0 : Math.min(3, Math.ceil((cell.count / maxCount) * 3));
                return (
                  <div
                    key={day}
                    title={`${cell.date} · ${cell.count} 次更新`}
                    className={`h-3.5 w-3.5 rounded-sm ${HEAT_LEVELS[lvl]}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 font-mono text-[10px] text-muted">
          <span>少</span>
          {HEAT_LEVELS.map((l, i) => (
            <span key={i} className={`h-3 w-3 rounded-sm ${l}`} />
          ))}
          <span>多</span>
        </div>
      </section>

      {/* 状态分布 */}
      <section className="mt-24">
        <p className="eyebrow">状态分布</p>
        <div className="mt-8 grid gap-12 md:grid-cols-3">
          {([
            { key: 'seedling', label: '幼苗', value: stats.byStatus.seedling },
            { key: 'budding', label: '抽芽', value: stats.byStatus.budding },
            { key: 'evergreen', label: '常青', value: stats.byStatus.evergreen },
          ] as const).map((s) => {
            const pct = stats.total > 0 ? Math.round((s.value / stats.total) * 100) : 0;
            return (
              <div key={s.key} className="paper p-8">
                <StatusBadge status={s.key} />
                <p className="mt-6 font-serif text-5xl tabular">{s.value}</p>
                <div className="mt-6 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.key === 'evergreen' ? 'var(--evergreen)' : s.key === 'budding' ? 'var(--budding)' : 'var(--seedling)' }} />
                </div>
                <p className="mt-3 font-mono text-xs text-muted tabular">{pct}%</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 孤儿笔记 */}
      <section className="mt-24">
        <p className="eyebrow">孤儿笔记 · {orphanRows.length}</p>
        <p className="mt-4 max-w-[56ch] text-sm leading-relaxed text-muted">
          没有被任何笔记链接、也没有链接任何笔记。它们不是错误，是待完成的连接——给它们找株伴，或者推它们长成常青。
        </p>
        {orphanRows.length === 0 ? (
          <p className="mt-8 font-serif text-xl">这座花园没有孤儿。藤蔓正在合拢。</p>
        ) : (
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {orphanRows.map((n) => (
              <li key={n.id} className="flex items-center gap-4 py-5">
                <StatusBadge status={n.status} />
                <Link
                  href={`/app?note=${n.id}`}
                  className="font-serif text-lg link-underline"
                >
                  {n.title}
                </Link>
                <span className="ml-auto font-mono text-[11px] text-muted tabular">/u/{user.handle}/{n.slug}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
