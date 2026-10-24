import { describe, expect, it } from 'vitest';

const setEnv = (key: string, value: string) => {
  (process.env as Record<string, string>)[key] = value;
};

describe('SESSION_SECRET 启动校验（P0-2）', () => {
  it('未配置 SESSION_SECRET 且非 test 环境时 import 抛错', async () => {
    const prevSecret = process.env.SESSION_SECRET;
    const prevEnv = process.env.NODE_ENV;
    setEnv('SESSION_SECRET', '');
    setEnv('NODE_ENV', 'production');
    try {
      await import('@/lib/auth');
      throw new Error('should have thrown');
    } catch (err) {
      expect(String((err as Error).message)).toMatch(/SESSION_SECRET/);
    } finally {
      process.env.SESSION_SECRET = prevSecret;
      setEnv("NODE_ENV", prevEnv || "test");
    }
  });

  it('SESSION_SECRET 长度不足 32 时抛错', async () => {
    const prevSecret = process.env.SESSION_SECRET;
    const prevEnv = process.env.NODE_ENV;
    setEnv('SESSION_SECRET', 'short');
    setEnv('NODE_ENV', 'production');
    try {
      await import('@/lib/auth');
      throw new Error('should have thrown');
    } catch (err) {
      expect(String((err as Error).message)).toMatch(/SESSION_SECRET/);
    } finally {
      process.env.SESSION_SECRET = prevSecret;
      setEnv("NODE_ENV", prevEnv || "test");
    }
  });
});
