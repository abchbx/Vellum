const WIKI_LINK_RE = /\[\[([^\][|]+)(?:\|([^\][]+))?\]\]/g;

export interface WikiLink {
  slug: string;
  text: string;
  index: number;
}

export function parseWikiLinks(md: string): WikiLink[] {
  const out: WikiLink[] = [];
  for (const m of md.matchAll(WIKI_LINK_RE)) {
    const slug = (m[1] ?? '').trim();
    if (!slug) continue;
    out.push({ slug, text: (m[2] ?? slug).trim(), index: m.index });
  }
  return out;
}

export function extractLinkedSlugs(md: string): string[] {
  const slugs = parseWikiLinks(md)
    .map((l) => l.slug)
    .filter((s, i, arr) => s && arr.indexOf(s) === i);
  return slugs;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (/^(https?:|mailto:|\/|#)/i.test(url)) return url;
  if (url.startsWith('[') && url.endsWith(']')) return url.slice(1, -1);
  return null;
}

function inline(s: string): string {
  let out = s;
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code class="rounded bg-surface-2 px-1">${c}</code>`);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
    const href = safeHref(src);
    if (!href) return alt;
    return `<img src="${href}" alt="${alt}" loading="lazy" />`;
  });
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, text, href) => {
      const h = safeHref(href);
      if (!h) return text;
      return `<a href="${h}" class="link-underline">${text}</a>`;
    },
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return out;
}

function renderTable(lines: string[]): string {
  const cells = (line: string) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
  const header = cells(lines[0] ?? '');
  const body = lines.slice(2).map(cells);
  const th = header.map((c) => `<th>${inline(escapeHtml(c))}</th>`).join('');
  const trs = body
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td>${inline(escapeHtml(c))}</td>`).join('')}</tr>`,
    )
    .join('');
  return `<table class="paper overflow-hidden my-8"><thead><tr class="bg-surface-2 text-left">${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

export function renderMarkdown(md: string): string {
  const links = parseWikiLinks(md);
  const placeholders = new Map<string, WikiLink>();
  let stash = md;
  links.forEach((l) => {
    const key = `\u0000WIKI${placeholders.size}\u0000`;
    placeholders.set(key, l);
    stash = stash.replace(`[[${l.slug}]]`, key).replace(`[[${l.slug}|${l.text}]]`, key);
  });

  const blocks: string[] = [];
  const lines = stash.split('\n');
  let i = 0;
  let para: string[] = [];

  const flush = () => {
    if (para.length) {
      blocks.push(`<p class="leading-[1.65]">${inline(escapeHtml(para.join(' ')))}</p>`);
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.startsWith('```')) {
      flush();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        buf.push(lines[i] ?? '');
        i++;
      }
      i++;
      blocks.push(
        `<pre class="paper my-8 p-6 overflow-x-auto"><code>${escapeHtml(buf.join('\n'))}</code></pre>`,
      );
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s-|]+\|\s*$/.test(lines[i + 1] ?? '')) {
      flush();
      const tbl: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i] ?? '')) {
        tbl.push(lines[i] ?? '');
        i++;
      }
      blocks.push(renderTable(tbl));
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      const level = h[1]?.length ?? 2;
      const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base'];
      blocks.push(`<h${level} class="${sizes[level - 1] ?? 'text-base'} mt-12 mb-4">${inline(escapeHtml(h[2] ?? ''))}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flush();
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i] ?? '')) {
        buf.push((lines[i] ?? '').replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push(`<blockquote class="border-l-2 border-line pl-6 italic text-muted my-8">${inline(escapeHtml(buf.join(' ')))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flush();
      const buf: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? '')) {
        buf.push((lines[i] ?? '').replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(`<ul class="list-disc pl-6 my-6 space-y-2">${buf.map((b) => `<li>${inline(escapeHtml(b))}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      flush();
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? '')) {
        buf.push((lines[i] ?? '').replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(`<ol class="list-decimal pl-6 my-6 space-y-2">${buf.map((b) => `<li>${inline(escapeHtml(b))}</li>`).join('')}</ol>`);
      continue;
    }

    if (line.trim() === '') {
      flush();
      i++;
      continue;
    }

    para.push(line);
    i++;
  }
  flush();

  let html = blocks.join('\n');
  for (const [key, l] of placeholders) {
    html = html.replace(
      key,
      `<a href="/u/${encodeURIComponent('demo')}/${encodeURIComponent(l.slug)}" class="vl-link link-underline font-medium">${escapeHtml(l.text)}</a>`,
    );
  }
  return html;
}

export function excerptOf(md: string, max = 160): string {
  const plain = md
    .replace(WIKI_LINK_RE, (_m, s, t) => t ?? s)
    .replace(/^#{1,4}\s+/gm, '')
    .replace(/[`*>_-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

export function readingMinutes(md: string): number {
  const cjk = (md.match(/[一-鿿]/g) ?? []).length;
  const words = (md.replace(/[一-鿿]/g, ' ').match(/[A-Za-z0-9]+/g) ?? []).length;
  return Math.max(1, Math.round((cjk + words * 2) / 350));
}
