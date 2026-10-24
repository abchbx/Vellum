import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth';

describe('口令哈希（P1-5）', () => {
  it('异步哈希可验证且参数为 OWASP 档位', async () => {
    const h = await hashPassword('secret123');
    expect(h.startsWith('scrypt$32768$8$1$')).toBe(true);
    expect(await verifyPassword('secret123', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });

  it('兼容旧参数 N=16384 的哈希', async () => {
    const { scryptSync } = await import('node:crypto');
    const salt = Buffer.from('0123456789abcdef', 'utf8');
    const hash = scryptSync('secret123', salt, 64, { N: 16384, r: 8, p: 1 });
    const old = ['scrypt', 16384, 8, 1, salt.toString('base64'), hash.toString('base64')].join('$');
    expect(await verifyPassword('secret123', old)).toBe(true);
  });
});
