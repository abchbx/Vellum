import { describe, expect, it } from 'vitest';
import { buildSearchSql } from '@/lib/search';

describe('全文搜索分词', () => {
  it('中文逐字切分并转 tsquery', () => {
    const r = buildSearchSql('花园');
    expect(r?.query).toContain("'花:*'");
    expect(r?.query).toContain("'园:*'");
  });

  it('英文小写化', () => {
    const r = buildSearchSql('Seedling');
    expect(r?.query).toContain("'seedling:*'");
  });

  it('空查询返回 null', () => {
    expect(buildSearchSql('   ')).toBeNull();
  });

  it('引号被转义', () => {
    const r = buildSearchSql('it\'s');
    expect(r?.query).toContain('\\');
  });
});
