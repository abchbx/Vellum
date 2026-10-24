# Vellum · 数字花园

一个给长期写作者用的「数字花园」：用 Markdown 写笔记，用 `[[双向链接]]` 把想法连成网，
自动生成知识图谱、反向链接与写作统计，并能把花园公开给他人阅读。

克制、安静、纸质感——以排版与留白为第一视觉语言，不是又一个博客，是「思想生长」的容器。

## 特性

- **双向链接**：`[[笔记标题]]` 自动建链，反向链接自动显形，悬空链接自动回填
- **知识图谱**：d3-force 力导引布局，hover 高亮一阶邻居
- **写作统计**：26 周热力图、连续天数、状态分布、孤儿笔记清单
- **全文搜索**：Postgres FTS（tsvector 生成列 + GIN），ts_headline 高亮
- **公开花园**：`/u/<handle>` 免登录阅读，草稿永远留在墙内
- **导出备份**：JSON 与 Markdown ZIP
- **编辑器**：Markdown 工具栏、1.6s 自动保存、版本冲突提示
- **工程护栏**：lint / tsc / 单测 / 集成测试 / CI 全绿

## 快速开始

```bash
npm install
cp .env.example .env.local
npm run migrate        # 应用数据库迁移（幂等）
npm run seed           # 灌入演示数据（会打印演示账号）
npm run dev
```

打开 http://localhost:3000。演示账号由 seed 脚本生成并打印（不在文档中硬编码）。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串（Neon pooled connection string） |
| `SESSION_SECRET` | JWT 签名密钥，32+ 随机字符；缺失或过短时应用拒绝启动 |
| `NEXT_PUBLIC_SITE_URL` | 站点公开地址（用于 OG 图、CSRF 同源校验） |
| `TRUST_PROXY` | 置 `true` 时信任 `x-forwarded-for` 首段作为客户端 IP（限流用） |
| `VELUM_ALLOW_SEED` | 置 `1` 时允许生产环境执行 seed（否则需 `--force`） |

## 技术栈

- **前端**：Next.js 15（App Router / RSC / Route Handlers / Server Actions）、TypeScript strict（含 `noUncheckedIndexedAccess`）、Tailwind CSS v4、Motion、next/font
- **后端/数据**：PostgreSQL（Neon serverless）+ `@neondatabase/serverless`、Drizzle ORM + drizzle-kit、自研认证（scrypt N=32768 + jose JWT + 会话表撤销）、zod、自研 Markdown 渲染管线、d3-force
- **测试**：Vitest（单元 + 真实 Postgres 集成测试）

## 架构

```
浏览器 ── 工作台 / ⌘K 面板 ──► Next.js App Router
                              ├─ /app/*        RSC + Server Actions
                              ├─ /api/*        Route Handlers（统一 {ok,data}/{ok,error} 信封）
                              └─ /u/*          公开花园 SSR + ISR
                                  │
                              ▼
                          lib/auth-service.ts（唯一鉴权入口：注册/登录/限流/审计）
                          lib/auth.ts（scrypt 口令 + JWT + 会话表）
                          lib/markdown.ts（wiki-link 解析 + 安全子集渲染 + 转义）
                          lib/links.ts（links 表维护 / 悬空链接回填）
                          lib/search.ts（CJK 逐字切分 → tsvector）
                          lib/stats.ts（连续天数 / 热力图 / 孤儿笔记）
                                  │
                                  ▼
                          Drizzle ORM（neon-http）→ PostgreSQL
                          notes.content_tsv 生成列（to_tsvector）+ GIN 索引
```

### 关键架构决策（ADR）

1. **FTS 中文分词**：生成列写入侧逐字切分 CJK（`regexp_replace`），查询侧用
   `plainto_tsquery` + 同样切分，避免手工 tsquery 语法的传输脆弱性。
2. **slug 方案**：ASCII 安全方案——中文标题取 sha1 哈希前缀（`n<hash>`），
   冲突追加 `-2`。曾评估保留 Unicode slug，但中文 Windows 下 CJK 路径参数
   编码会全量 404（已实测），ASCII 方案跨平台稳健。
3. **一致性模型**：neon-http 无交互事务。「更新笔记 + 重建 links + 同步 tags」
   三步不保证原子，但全部幂等——任何中间失败由 `reconcileNote` 重放收敛；
   跨笔记的悬空链接由 `resolveDanglingLinks` 延迟对账。
4. **迁移策略**：`drizzle-kit generate` 直接产出 tsvector 生成列；GIN 索引因
   drizzle-kit 0.31 无 `using()` 支持，由手写迁移 `0001_gin_fts_index.sql` 维护；
   `npm run migrate` 幂等执行全部文件。
5. **会话撤销**：JWT 携带 jti 并登记 sessions 表；登出/改密即时失效，
   代价是每次鉴权一次 DB 查询。

## API

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 注册（IP+邮箱双维度限流） | — |
| POST | `/api/auth/login` | 登录（失败计数 + 审计日志） | — |
| POST | `/api/auth/logout` | 登出（撤销全部会话） | — |
| GET | `/api/me` | 当前用户 | — |
| GET | `/api/notes` | 游标分页列表 | 会话 |
| POST | `/api/notes` | 创建（自动 slug） | 会话 |
| GET/PATCH/DELETE | `/api/notes/:id` | 详情/更新（版本冲突 409）/删除 | 会话 |
| GET | `/api/notes/:id/backlinks` | 反向链接 | 会话 |
| GET | `/api/graph` | 图谱（上限 500 节点） | 会话 |
| GET | `/api/search` | Postgres FTS + 高亮 | 会话 |
| GET | `/api/stats` | 统计 + 热力图 | 会话 |
| POST | `/api/export` | JSON / Markdown ZIP 导出 | 会话 |
| POST | `/api/account/delete` | 注销账号（级联清理） | 会话 |
| GET | `/api/health` | 健康检查 | — |

所有变更请求带 CSRF Origin/Referer 校验；缺失会话时返回 401，越权返回 403。

## 质量护栏

**本地**（每次改动后必须全绿）：

```bash
npm run lint            # ESLint（零错误零警告）
npx tsc --noEmit        # TypeScript strict 零错误
npm run test            # Vitest：单元测试必跑；集成测试无 DATABASE_URL 时自动跳过
npm run build           # Next.js 生产构建
npm run migrate         # 迁移幂等性
```

**CI**（`.github/workflows/ci.yml`，push/PR 触发）：

```
lint → tsc → test（postgres:16 服务容器，含集成测试）→ build
```

**测试覆盖率现状**：9 个测试文件、46 条断言，覆盖 wiki-link 解析、Markdown 渲染、
搜索分词、统计聚合、限流器、口令哈希、CSRF、会话撤销、悬空链接回填（集成）。
纯函数层覆盖率较高，`app/api/*` 路由层与前端交互层覆盖率低。
**下一步目标**：路由层 mock 集成测试 + 编辑器保存/冲突流程 E2E，行覆盖 ≥ 70%。

## 已知限制

- 中文 Windows 环境下 CJK 路径参数编码异常，slug 采用 ASCII 方案规避
- FTS 为逐字切分，非专业中文分词器，短语精确匹配有限
- 会话校验为每请求一次 DB 查询（单实例内存限流器，多实例需外部存储）
- 图谱上限 500 节点 / 5000 边；导出上限 1000 篇
- 移动端图谱为简化实现（无 pinch-zoom）

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。安全漏洞按 [SECURITY.md](SECURITY.md) 披露。
变更记录见 [CHANGELOG.md](CHANGELOG.md)。

## 许可

[MIT](LICENSE)
