# Vellum · 数字花园

一个给长期写作者用的「数字花园」：用 Markdown 写笔记，用 `[[双向链接]]` 把想法连成网，
自动生成知识图谱、反向链接与写作统计，并能把花园公开给他人阅读。

## 技术栈

- **前端**：Next.js 15（App Router / RSC / Route Handlers / Server Actions）、TypeScript strict（含 `noUncheckedIndexedAccess`）、Tailwind CSS v4（CSS-first 令牌）、Motion、next/font
- **后端/数据**：PostgreSQL（Neon serverless）+ `@neondatabase/serverless`、Drizzle ORM + drizzle-kit、自研认证（`crypto.scrypt` + `jose` JWT，httpOnly Cookie）、zod、自研 Markdown 渲染管线（wiki-link + 安全子集 + 白名单消毒）、`d3-force`（仅 force 模块，SVG 自绘）
- **测试**：Vitest（wiki-link 解析、Markdown 渲染、搜索分词、统计聚合）

## 本地启动

```bash
npm install
cp .env.example .env.local   # 填入 DATABASE_URL / SESSION_SECRET / NEXT_PUBLIC_SITE_URL
npm run migrate              # 应用 drizzle/ 下的迁移（幂等）
npm run seed                 # 灌入 12 篇互链笔记 + demo 账号
npm run dev
```

演示账号：`demo@vellum.app` / `demo1234`（handle: `demo`，花园已公开：`/u/demo`）。

> 迁移说明：`drizzle-kit generate` 可直接产出正确的 `tsvector` 生成列；GIN 索引因
> drizzle-kit 0.31 的 `index()` 不支持 `using('gin')`，由手写迁移
> `drizzle/0001_gin_fts_index.sql` 维护（已在 journal 登记，`npm run migrate` 幂等执行）。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `SESSION_SECRET` | JWT 签名密钥，32+ 随机字符 |
| `NEXT_PUBLIC_SITE_URL` | 站点公开地址 |

## 架构（文字版）

```
浏览器 ── ⌘K 命令面板 / 工作台 ──► Next.js App Router
                                  ├─ /app/*        RSC + Server Actions（表单写操作）
                                  ├─ /api/*        Route Handlers（JSON API，统一 {ok,data}/{ok,error} 信封）
                                  └─ /u/*          公开花园 SSR + ISR（revalidate 300s）
                                      │
                                      ▼
                          lib/auth.ts（scrypt 口令哈希 + jose JWT + Cookie）
                          lib/markdown.ts（wiki-link 解析 + 安全子集渲染 + 消毒）
                          lib/links.ts（links 表维护 / 反向链接）
                          lib/search.ts（CJK 逐字切分 → tsvector）
                          lib/stats.ts（连续天数 / 热力图 / 孤儿笔记）
                                      │
                                      ▼
                          Drizzle ORM（neon-http）→ Neon Postgres
                          notes 表带生成列 content_tsv（to_tsvector）+ GIN 索引
```

## API

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 注册（限流 10/分钟/IP） | — |
| POST | `/api/auth/login` | 登录（401 通用文案） | — |
| POST | `/api/auth/logout` | 登出 | — |
| GET | `/api/me` | 当前用户 + 花园开关 | — |
| GET | `/api/notes` | 游标分页列表（status/tag/q 过滤） | 会话 |
| POST | `/api/notes` | 创建（自动 slug） | 会话 |
| GET | `/api/notes/:id` | 详情（含 outgoing） | 会话 |
| PATCH | `/api/notes/:id` | 局部更新（重建 links） | 会话 |
| DELETE | `/api/notes/:id` | 删除（级联清理） | 会话 |
| GET | `/api/notes/:id/backlinks` | 反向链接 | 会话 |
| GET | `/api/graph` | 图谱 nodes/edges | 会话 |
| GET | `/api/search` | Postgres FTS（ts_rank + ts_headline 高亮） | 会话 |
| GET | `/api/stats` | 统计 + 热力图 | 会话 |
| POST | `/api/export` | 导出 JSON / Markdown ZIP | 会话 |
| GET | `/api/health` | 健康检查 | — |

## 部署

本次交付使用 **Vercel 临时部署**（`vercel deploy --temporary`，无需登录，URL 可后续认领）：

```bash
npx vercel build --no-symlinks --yes -e DATABASE_URL=... -e SESSION_SECRET=... -e NEXT_PUBLIC_SITE_URL=...
npx vercel deploy --prebuilt --temporary --yes
```

> Windows 上 Vercel CLI 创建符号链接需要特权，故使用 `--no-symlinks`。
> 有账号后可 `vercel link` → `vercel env add`（production）→ `vercel deploy --prod` 升级为正式部署。

回退方案：`Dockerfile`（node:22-alpine + standalone 输出）+ Fly.io（`fly launch --generate-name`）。

数据库由 Neon 提供；本次部署通过 Neon 的 Claimable 机制临时 provisioning（无需注册），
项目 ID 与凭据记录在 `.secrets/`（已被 gitignore）。**需要手工认领**：见下方「认领数据库」。

## 认领数据库（Neon Claimable）

本项目当前连接的 Neon 项目是匿名 provisioning 的临时项目。若要长期保留：

```bash
npx neon claim accept --no-open   # 本地执行（持有 identity 凭据时），或按下方 HTTP 流程
```

HTTP 流程（POST `https://claimable.neon.tech/v1/projects/<project_id>/claim`，
携带 Bearer token）会返回 `verification_uri_complete` 与 `user_code`；
在 Neon 登录后访问该 URL 即可认领。认领完成前项目会过期。

## 已知限制

- 限流为内存计数，仅适用于单实例部署（文档 §4.3 允许）
- 中文 FTS 采用逐字切分，非专业分词器，对短语精确匹配有限
- 图谱力导引为简化实现，无拖拽/缩放手势（桌面可点击节点跳转）
- 移动端工作台降级为标签页布局

## 质量门槛

```bash
npm run lint && npx tsc --noEmit && npm run build && npm run test
```
