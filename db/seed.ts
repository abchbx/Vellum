import { db } from './index';
import { links, noteTags, notes, tags, users } from './schema';
import { sql } from 'drizzle-orm';
import { hashPassword } from '../lib/auth';
import { excerptOf, readingMinutes } from '../lib/markdown';
import { TAG_COLORS } from '../lib/zod';
import { slugify } from './queries';

const SEED_USER = {
  email: 'demo@vellum.app',
  password: 'demo1234',
  handle: 'demo',
  displayName: 'Demo Garden',
  bio: '一座种着想法的花园。',
};

interface SeedNote {
  title: string;
  contentMd: string;
  status: 'seedling' | 'budding' | 'evergreen';
  published: boolean;
  tagNames: string[];
  daysAgo: number;
}

const NOTES: SeedNote[] = [
  {
    title: '数字花园的由来',
    status: 'evergreen',
    published: true,
    tagNames: ['理念', '笔记'],
    daysAgo: 21,
    contentMd: `花园不是图书馆。图书馆按分类法码放知识，花园让知识像植物一样生长、攀援、彼此遮蔽又彼此透光。

这个概念最早可以追溯到笔记卡片盒（Zettelkasten）——[[笔记卡片盒方法]]。每张卡片是一个独立的想法，想法之间的联系比想法本身更重要。

> 写作不是从零开始，而是从已有的东西之间生长出来。

数字花园把这个过程放到了屏幕上：[[双向链接]]让笔记自动长出藤蔓，[[写作统计]]让你看见自己思想的年轮。`,
  },
  {
    title: '笔记卡片盒方法',
    status: 'evergreen',
    published: true,
    tagNames: ['理念', '方法'],
    daysAgo: 19,
    contentMd: `尼克拉斯·卢曼用卡片盒写了 70 多本书和 400 多篇论文。他的秘密不在天赋，而在 [[写作统计]] 背后的那套系统。

三条原则：

1. 原子化：一张卡片只写一个想法。
2. 索引化：每张卡片有唯一的编号，可以被别人引用。
3. 连接化：新卡片必须挂接到已有的卡片上。

这三条原则和 [[数字花园的由来]] 一脉相承，也是 Vellum 这套工具的底层逻辑。`,
  },
  {
    title: '双向链接',
    status: 'evergreen',
    published: true,
    tagNames: ['方法', '工具'],
    daysAgo: 17,
    contentMd: `单向链接是"我说你听"，双向链接是"对话"。

当我写 [[数字花园的由来]] 时，用 [[双向链接]] 指向它；在数字花园那篇里，系统自动生成反向链接，告诉我"谁引用了我"。知识因此长成了网，而不是链。

在 Vellum 中，只要写下 [[笔记标题]] 这样的记号，链接就自动建立，并在 [[知识图谱]] 里画成一条线。`,
  },
  {
    title: '知识图谱',
    status: 'budding',
    published: true,
    tagNames: ['工具', '图谱'],
    daysAgo: 14,
    contentMd: `把笔记画成图：每篇笔记是一个节点，[[双向链接]] 是一条边。

力导引布局会让联系紧密的笔记聚成一团，孤立的笔记漂到边缘。那些漂在边缘的节点就是 [[孤儿笔记]]——写了却没人引用，也没有引用别人。

图谱的价值不在于好看，而在于让你看见自己思想的盲区。`,
  },
  {
    title: '写作统计',
    status: 'budding',
    published: true,
    tagNames: ['方法', '统计'],
    daysAgo: 12,
    contentMd: `写作是复利游戏。重要的不是某天写多少，而是连续写了多少天。

Vellum 的 [[写作统计]] 页用热力图记录近 26 周的产出，并用连续天数鼓励你坚持下去。[[笔记卡片盒方法]] 的创始人卢曼也是个长跑选手——他一生写了 70 多本书。

数字不会替你写作，但它们诚实。`,
  },
  {
    title: '孤儿笔记',
    status: 'seedling',
    published: false,
    tagNames: ['统计'],
    daysAgo: 9,
    contentMd: `每一座花园里都有几株被遗忘的植物。在笔记世界里，它们叫 [[孤儿笔记]]：没有被任何笔记链接，也没有链接任何笔记。

孤儿笔记不是错误，它是待完成的连接。打开 [[写作统计]] 页的孤儿清单，给它们找株伴。

也许 [[双向链接]] 是让它们重新发芽的园丁。`,
  },
  {
    title: 'Markdown 排版',
    status: 'evergreen',
    published: true,
    tagNames: ['工具', '排版'],
    daysAgo: 8,
    contentMd: `好的排版是隐形的。字号、行距、栏宽、留白——所有尺度都应该服从阅读的节奏。

这套系统的规矩：正文 16–18px、行高 1.65、每行 62–72 个字符。标题用衬线体，正文用无衬线体，数字用等宽体——这就是为什么你在 Vellum 里看到的数字都是齐平的。

相关内容：[[知识图谱]]、[[写作统计]]。`,
  },
  {
    title: 'Seedling 到 Evergreen',
    status: 'evergreen',
    published: true,
    tagNames: ['理念', '状态'],
    daysAgo: 6,
    contentMd: `笔记的状态像植物的生长：

- **Seedling（幼苗）**：刚写下的想法，尚未展开。
- **Budding（抽芽）**：有了结构，开始链接别人。
- **Evergreen（常青）**：经得起重读，可以被公开。

一篇笔记从 [[Seedling 到 Evergreen]] 的距离，就是它从私人到公开的距离。只有状态是 evergreen 且标记了公开的笔记，才会出现在别人的 [[公开花园]] 里。`,
  },
  {
    title: '公开花园',
    status: 'budding',
    published: true,
    tagNames: ['理念', '功能'],
    daysAgo: 5,
    contentMd: `花园可以围墙，也可以开门。

开启公开花园后，你的 evergreen 笔记会出现在 /u/<你的 handle> 页面，访客无需登录就能阅读。草稿永远留在墙内——[[Seedling 到 Evergreen]] 之前，谁也看不到。

这是数字花园和博客的分野：博客是成品展厅，花园是过程展示。`,
  },
  {
    title: '命令面板',
    status: 'seedling',
    published: false,
    tagNames: ['工具', '功能'],
    daysAgo: 3,
    contentMd: `按下 ⌘K，全局搜索从正文里生长出来。

Vellum 的搜索走 PostgreSQL 全文索引（tsvector + GIN），[[全文搜索]] 相关文档里写过，它对中文做了逐字切分，所以搜"花园"能命中"数字花园的由来"。

命令面板里除了搜索，还有导航：去图谱、去统计、新建笔记。键盘优先，鼠标次之。`,
  },
  {
    title: '全文搜索',
    status: 'seedling',
    published: false,
    tagNames: ['工具', '搜索'],
    daysAgo: 2,
    contentMd: `数据库层面的全文搜索用的是 tsvector 与 GIN 倒排索引。

中文没有空格，直接分词会失败——所以写入时把每个汉字切成独立的词条（[[命令面板]] 里提到的逐字切分就是这个意思），查询时做同样的变换。

配合 ts_rank 排序与 ts_headline 高亮，[[全文搜索]] 能直接给出命中的片段。`,
  },
  {
    title: '导出与备份',
    status: 'seedling',
    published: false,
    tagNames: ['工具', '备份'],
    daysAgo: 1,
    contentMd: `你写下的每一篇笔记都应该能带走。

Vellum 支持两种导出：JSON（带完整元数据）与 Markdown ZIP（适合放进任何静态站点）。[[双向链接]] 在导出时保留为原始 [[Markdown 排版]] 记号，随时可以重新链接。

备份的意义在于：花园是你的，不是平台的。`,
  },
];

async function main() {
  console.log('[seed] clearing tables…');
  await db.delete(links);
  await db.delete(noteTags);
  await db.delete(tags);
  await db.delete(notes);
  await db.delete(users).where(sql`${users.handle} = ${SEED_USER.handle}`);

  console.log('[seed] creating demo user…');
  const [demo] = await db
    .insert(users)
    .values({
      email: SEED_USER.email,
      handle: SEED_USER.handle,
      passwordHash: hashPassword(SEED_USER.password),
      displayName: SEED_USER.displayName,
      bio: SEED_USER.bio,
      gardenPublic: true,
    })
    .returning();
  if (!demo) throw new Error('seed: demo user insert failed');
  console.log(`[seed] demo user id=${demo.id}`);

  const tagMap = new Map<string, string>();
  let colorIdx = 0;
  for (const n of NOTES) {
    for (const name of n.tagNames) {
      if (!tagMap.has(name)) {
        const inserted = await db
          .insert(tags)
          .values({
            authorId: demo.id,
            name,
            color: TAG_COLORS[colorIdx % TAG_COLORS.length],
          })
          .returning({ id: tags.id });
        tagMap.set(name, inserted[0]?.id ?? '');
        colorIdx++;
      }
    }
  }

  console.log(`[seed] creating ${NOTES.length} notes…`);
  const byTitle = new Map<string, string>();
  for (const n of NOTES) {
    const created = await db
      .insert(notes)
      .values({
        authorId: demo.id,
        slug: slugify(n.title),
        title: n.title,
        contentMd: n.contentMd,
        excerpt: excerptOf(n.contentMd),
        status: n.status,
        readingMins: readingMinutes(n.contentMd),
        published: n.published,
        publishedAt: n.published ? new Date(Date.now() - n.daysAgo * 86400_000) : null,
        createdAt: new Date(Date.now() - n.daysAgo * 86400_000),
        updatedAt: new Date(Date.now() - n.daysAgo * 86400_000),
      })
      .returning({ id: notes.id });
    const id = created[0]?.id;
    if (!id) throw new Error('seed: note insert failed');
    byTitle.set(n.title, id);
    for (const name of n.tagNames) {
      const tagId = tagMap.get(name);
      if (tagId) {
        await db
          .insert(noteTags)
          .values({ noteId: id, tagId })
          .onConflictDoNothing();
      }
    }
  }

  console.log('[seed] rebuilding links…');
  for (const n of NOTES) {
    const content = await db
      .select({ contentMd: notes.contentMd })
      .from(notes)
      .where(sql`${notes.id} = ${byTitle.get(n.title)}::uuid`)
      .limit(1);
    const md = content[0]?.contentMd ?? '';
    const slugRe = /\[\[([^\][|]+)(?:\|[^\][]+)?\]\]/g;
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = slugRe.exec(md)) !== null) {
      const slugRaw = (m[1] ?? '').trim();
      const slug = slugRaw.toLowerCase();
      if (seen.has(slug)) continue;
      seen.add(slug);
      const target = NOTES.find((t) => slugify(t.title) === slug);
      const targetId = target ? byTitle.get(target.title) : null;
      await db
        .insert(links)
        .values({
          sourceId: byTitle.get(n.title) as string,
          targetSlug: slugRaw,
          targetId: targetId ?? null,
        })
        .onConflictDoNothing();
    }
  }

  const count = await db.execute(sql`SELECT count(*)::int as c FROM notes`);
  console.log(`[seed] done. notes=${(count.rows[0] as { c: number } | undefined)?.c ?? 0}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
