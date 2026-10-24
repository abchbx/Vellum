# 贡献指南

感谢你关注 Vellum · 数字花园。请在提 issue / PR 前阅读以下约定。

## 开发环境

- Node 22+，npm
- PostgreSQL 16+（本地可用 Docker：`docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=vellum postgres:16-alpine`）
- 本地无 Docker 时，集成测试需要可访问的 `DATABASE_URL`（如 Neon 分支库）

## 常用命令

```bash
npm run lint            # ESLint
npx tsc --noEmit        # 类型检查
npm run test            # Vitest（无 DATABASE_URL 时集成测试自动跳过）
npm run build           # Next.js 生产构建
npm run migrate         # 应用数据库迁移（幂等）
npm run seed            # 灌入演示数据（生产环境需 --force / VELUM_ALLOW_SEED=1）
```

## 代码规范

- TypeScript strict 模式（含 `noUncheckedIndexedAccess`），保持零错误零警告
- 所有 SQL 必须参数化；禁止 `sql.raw()` 拼接请求字符串
- 每个缺陷修复必须附带能复现该缺陷的回归测试
- 提交信息格式：`fix(scope): 一句话描述（编号）`，涉及缺陷清单编号时标注

## 数据库变更

1. 修改 `db/schema.ts`
2. `npm run generate-db` 生成迁移
3. GIN 等 kit 不支持的索引：手写迁移文件并登记 `drizzle/meta/_journal.json`
4. `npm run migrate` 应用；CI 会校验迁移与 schema 一致

## 测试策略

- `tests/*.test.ts`：纯函数单元测试，无需数据库
- `tests/integration/*.test.ts`：真实 Postgres 集成测试，无 `DATABASE_URL` 时自动跳过
- CI（GitHub Actions）使用 postgres:16 服务容器跑全量测试

## 分支与 PR

- 从 `main` 切功能分支
- PR 需通过 CI（lint + tsc + test + build）
- 涉及数据库 schema 变更的 PR 请附迁移文件
