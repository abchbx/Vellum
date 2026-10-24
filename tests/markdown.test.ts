import { describe, expect, it } from 'vitest';
import {
  parseWikiLinks,
  extractLinkedSlugs,
  renderMarkdown,
  excerptOf,
  readingMinutes,
} from '@/lib/markdown';

describe('wiki-link 解析', () => {
  it('解析基本链接与自定义文本', () => {
    const links = parseWikiLinks('看 [[数字花园]] 和 [[笔记卡片盒|卡片盒]] 两篇');
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ slug: '数字花园', text: '数字花园' });
    expect(links[1]).toMatchObject({ slug: '笔记卡片盒', text: '卡片盒' });
  });

  it('提取去重后的 slug', () => {
    expect(extractLinkedSlugs('[[a]] [[b|c]] [[a]]')).toEqual(['a', 'b']);
  });

  it('忽略空链接', () => {
    expect(extractLinkedSlugs('[[]] [[]]')).toEqual([]);
  });
});

describe('Markdown 渲染', () => {
  it('转义 HTML 防注入', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('渲染标题、粗体、列表、引用、代码块', () => {
    const md = [
      '# 标题',
      '**粗体**',
      '- 项目一',
      '- 项目二',
      '> 引用',
      '```',
      'code',
      '```',
    ].join('\n');
    const html = renderMarkdown(md);
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>粗体</strong>');
    expect(html).toContain('<ul');
    expect(html).toContain('<blockquote');
    expect(html).toContain('<pre');
  });

  it('渲染 GFM 表格', () => {
    const html = renderMarkdown('| A | B |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<table');
    expect(html).toContain('<th>A</th>');
  });

  it('wiki 链接转为带 class 的锚点', () => {
    const html = renderMarkdown('见 [[某个笔记]]');
    expect(html).toContain('class="vl-link');
    expect(html).toContain('某个笔记');
  });

  it('excerpt 不超过 160 字', () => {
    const long = '字'.repeat(300);
    expect(excerptOf(long).length).toBeLessThanOrEqual(161);
  });

  it('阅读分钟数为正整数', () => {
    expect(readingMinutes('短')).toBeGreaterThanOrEqual(1);
    expect(readingMinutes('内容'.repeat(100))).toBeGreaterThan(1);
  });
});
