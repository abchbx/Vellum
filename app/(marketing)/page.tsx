import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { Vine } from '@/components/Vine';
import { CommandPalette } from '@/components/CommandPalette';
import { Reveal } from '@/components/Reveal';
import { escapeHtml } from '@/lib/markdown';
import { db } from '@/db';
import { notes, users } from '@/db/schema';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const revalidate = 60;

async function demoGarden() {
  try {
    const user = await db.select().from(users).where(sql`${users.handle} = 'demo'`).limit(1);
    if (!user[0]) return null;
    const rows = await db
      .select({ title: notes.title, excerpt: notes.excerpt, status: notes.status, slug: notes.slug })
      .from(notes)
      .where(sql`${notes.authorId} = ${user[0].id}::uuid AND ${notes.published}`)
      .orderBy(sql`${notes.publishedAt} DESC`)
      .limit(3);
    return { handle: user[0].handle, displayName: user[0].displayName, notes: rows };
  } catch {
    return null;
  }
}

export default async function Landing() {
  const garden = await demoGarden();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <SiteHeader />
      <Vine />

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-[1180px] px-6 pb-24 pt-28 md:px-12 md:pt-40">
          <p className="eyebrow animate-[fadeUp_640ms_var(--ease-vellum)_both]">
            Digital Garden · 数字花园
          </p>
          <h1 className="mt-8 max-w-[14ch] font-serif text-[clamp(3rem,10vw,7.5rem)] leading-[1.05] tracking-[-0.03em]">
            种一座
            <br />
            思想的花园
          </h1>
          <div className="mt-10 max-w-[44ch] animate-[fadeUp_640ms_200ms_var(--ease-vellum)_both] text-lg leading-[1.7] text-muted">
            用 Markdown 写下笔记，用 <span className="font-mono text-ink">[[双向链接]]</span> 把想法连成网。
            图谱自动生长，反向链接自动显形，写作统计替你记住每一个伏笔。
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link href="/register" className="btn btn-accent">
              开始种一座花园
            </Link>
            <Link href={garden ? `/u/${garden.handle}` : '/login'} className="btn btn-ghost">
              看看 demo 的花园 →
            </Link>
          </div>
          <div className="mt-16 flex flex-wrap gap-12 font-mono text-xs text-muted tabular">
            <span>
              <span className="text-2xl font-serif text-ink tabular">12+</span> 篇互链笔记
            </span>
            <span>
              <span className="text-2xl font-serif text-ink tabular">3</span> 种生长状态
            </span>
            <span>
              <span className="text-2xl font-serif text-ink tabular">⌘K</span> 秒搜全文
            </span>
          </div>
        </div>
      </section>

      {/* Act 1: 双向链接 */}
      <section className="relative py-24 md:py-40">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <p className="eyebrow">第一幕 · 链接</p>
          <div className="mt-6 max-w-[640px] font-serif text-3xl leading-snug md:text-4xl">
            知识不是按书架码放的，<br />
            是按藤蔓生长的。
          </div>
          <Reveal>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {[
                { n: '01', t: '写下 [[标题]]', d: '任何笔记里出现方括号，链接便自动成立，无需手动维护。' },
                { n: '02', t: '反向链接显形', d: '被引用的那一刻，对方笔记的文末会长出一条归途。' },
                { n: '03', t: '图谱连成网', d: '打开图谱页，所有链接汇成一幅力导引星图。' },
              ].map((c) => (
                <div key={c.n} className="paper group p-8 transition-transform duration-320 hover:-translate-y-1">
                  <span className="font-mono text-xs text-accent tabular">{c.n}</span>
                  <h3 className="mt-6 text-lg">{c.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{c.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Act 2: 产品展示（真实数据渲染的静态场景） */}
      <section className="relative py-24 md:py-40">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <p className="eyebrow">第二幕 · 工作台</p>
          <div className="mt-6 max-w-[640px] font-serif text-3xl leading-snug md:text-4xl">
            不是又一个编辑器，<br />
            是一座看得见的花园。
          </div>
          <Reveal>
            {garden ? (
            <div className="paper mt-16 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-line" />
                <span className="h-2.5 w-2.5 rounded-full bg-line" />
                <span className="h-2.5 w-2.5 rounded-full bg-line" />
                <span className="ml-3 font-mono text-[11px] text-muted">vellum · /u/{garden.handle}</span>
              </div>
              <div className="grid gap-px bg-line md:grid-cols-[220px_1fr_240px]">
                <div className="bg-surface p-5">
                  <p className="font-mono text-[11px] text-muted">NOTES</p>
                  {garden.notes.map((n) => (
                    <div key={n.slug} className="mt-3">
                      <span
                        className="mr-2 h-1.5 w-1.5 rounded-full align-middle"
                        style={{
                          background:
                            n.status === 'evergreen'
                              ? 'var(--evergreen)'
                              : n.status === 'budding'
                                ? 'var(--budding)'
                                : 'var(--seedling)',
                        }}
                      />
                      <span className="text-[13px] text-ink">{n.title}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-surface p-10">
                  <div className="border-b border-line pb-2 font-serif text-2xl">
                    {garden.notes[0]?.title}
                  </div>
                  <div
                    className="mt-6 text-[15px] leading-[1.8] text-muted"
                    dangerouslySetInnerHTML={{
                      __html: garden.notes[0]
                        ? `${escapeHtml(garden.notes[0].excerpt)}<br/><br/><span class="font-mono text-xs">…</span>`
                        : '',
                    }}
                  />
                  <a className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-accent link-underline" href={garden.notes[0] ? `/u/${garden.handle}/${garden.notes[0].slug}` : '#'}>
                    阅读这篇笔记 →
                  </a>
                </div>
                <div className="bg-surface p-5">
                  <p className="font-mono text-[11px] text-muted">BACKLINKS</p>
                  <div className="mt-3 space-y-2 text-[13px] text-muted">
                    <div className="border-l-2 border-line pl-3">
                      「笔记卡片盒方法」<br />
                      <span className="font-mono text-[11px]">2 天前更新</span>
                    </div>
                    <div className="border-l-2 border-line pl-3">
                      「写作统计」<br />
                      <span className="font-mono text-[11px]">4 天前更新</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="paper mt-16 p-16 text-center text-muted">
              种子数据尚未就绪，登录后即可看到完整工作台。
            </div>
          )}
          </Reveal>
        </div>
      </section>

      {/* Act 3: 生长隐喻 */}
      <section className="relative py-24 md:py-40">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <p className="eyebrow">第三幕 · 生长</p>
          <div className="mt-6 max-w-[640px] font-serif text-3xl leading-snug md:text-4xl">
            每一篇笔记都有自己的季节。
          </div>
          <Reveal>
            <div className="mt-16 grid gap-12 md:grid-cols-3">
              {[
                { t: 'Seedling 幼苗', d: '刚写下的想法，尚未展开。属于你一个人的春天。', c: 'var(--seedling)' },
                { t: 'Budding 抽芽', d: '有了结构，开始链接别人。藤蔓找到了支架。', c: 'var(--budding)' },
                { t: 'Evergreen 常青', d: '经得起重读，可以公开。成为花园里永远的绿。', c: 'var(--evergreen)' },
              ].map((s) => (
                <div key={s.t}>
                  <div className="h-px w-full bg-line" />
                  <div className="mt-4 flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: s.c }} />
                    <h3 className="font-serif text-xl">{s.t}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted">{s.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <div className="mt-24 text-center">
            <Link href="/register" className="btn btn-accent">
              种下第一株幼苗
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-16">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 md:flex-row md:items-end md:justify-between md:px-12">
          <div>
            <div className="flex items-center gap-3">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M4 28 C4 16, 12 8, 16 4 C20 8, 28 16, 28 28" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="16" cy="6" r="2" fill="var(--ink)" />
              </svg>
              <span className="font-serif text-lg">Vellum</span>
            </div>
            <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-muted">
              克制、安静、纸质感。以排版与留白为第一视觉语言——不是又一个博客，是「思想生长」的容器。
            </p>
          </div>
          <nav className="flex gap-8 font-mono text-xs text-muted">
            <Link href="/app" className="link-underline">工作台</Link>
            <Link href="/u/demo" className="link-underline">demo 花园</Link>
            <Link href="/login" className="link-underline">登录</Link>
          </nav>
        </div>
        <div className="mx-auto mt-12 max-w-[1180px] px-6 md:px-12">
          <div className="h-px bg-line" />
          <p className="mt-4 font-mono text-[11px] text-muted">
            © {new Date().getFullYear()} Vellum · 用 Markdown 写，用链接长，用花园收。
          </p>
        </div>
      </footer>
      <CommandPalette />
    </div>
  );
}
