import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// 本地运行集成测试需要 DATABASE_URL：优先读 .env.local（与 Next 行为一致）
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1] as string] = m[2];
  }
} catch {
  /* 无 .env.local 时集成测试将跳过 */
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
