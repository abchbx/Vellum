# 安全披露政策

## 报告漏洞

Vellum 正在成长中，欢迎负责任的漏洞披露。

请通过以下方式之一私下报告：

1. GitHub Security Advisories：仓库 → Security → Report a vulnerability
2. 邮件：security@vellum.example（占位，实际使用时替换为真实联系邮箱）

请勿在公开 issue / PR / 讨论区中披露漏洞细节。

## 我们承诺

- 收到报告后 48 小时内确认收悉
- 修复期间与报告者保持沟通
- 修复完成后公开致谢（征得同意后）
- 重大漏洞修复前不公开细节

## 范围

以下情形不在范围内：

- 对生产部署的未授权访问（属于部署方责任）
- 依赖供应链漏洞（请向对应上游报告）
- 需要物理接触设备的场景

## 已知防护

- 口令使用 scrypt（N=32768，OWASP 推荐档位）哈希
- JWT 会话表支持撤销，登出/改密即时失效
- 所有变更请求带 Origin/Referer CSRF 校验
- 状态变更接口统一 401/403 鉴权语义
- 公开页面仅暴露 published + gardenPublic 数据
