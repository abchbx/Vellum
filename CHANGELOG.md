# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [1.0.0] - 2026-10-24

### 新增
- 数字花园核心：Markdown 笔记、`[[双向链接]]`、知识图谱、反向链接、写作统计
- 公开花园（`/u/[handle]`）、阅读视图、JSON / Markdown ZIP 导出
- 认证：scrypt 口令哈希 + jose JWT + httpOnly Cookie，会话表支持撤销
- 搜索：Postgres FTS（tsvector 生成列 + GIN），ts_headline 高亮
- 编辑器：Markdown 工具栏、自动保存、状态机（幼苗/抽芽/常青）

### 安全
- SESSION_SECRET 启动强校验（缺失/过短拒绝启动）
- 鉴权服务层统一限流（IP + 邮箱双维度，登录失败计数与审计）
- CSRF Origin/Referer 校验（全部变更路由）
- 存储型 XSS 防护（搜索片段哨兵转义、excerpt 剥离 HTML）

### 工程
- 迁移产物修复：schema 直接产出正确 tsvector 生成列；GIN 独立迁移
- 悬空双链回填 `resolveDanglingLinks`；seed 范围限定 + 守卫
- 统计/图谱 SQL 聚合化；批量写入消除 N+1
- Vitest 单元 + 集成测试（真实 Postgres）
- CI：lint + tsc + test + build（postgres:16 服务容器）
