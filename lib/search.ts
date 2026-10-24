import { sql } from 'drizzle-orm';

function normalizeForTs(raw: string): string {
  return raw
    .replace(/([一-鿿])/g, ' $1 ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function toTsQuery(raw: string): string {
  const normalized = normalizeForTs(raw);
  const lexemes = normalized.split(/\s+/).filter(Boolean);
  if (lexemes.length === 0) return '';
  const escaped = lexemes.map((l) => l.replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
  return escaped.map((l) => `'${l}:*'`).join(' & ');
}

export function buildSearchSql(rawQuery: string) {
  const query = toTsQuery(rawQuery);
  if (!query) return null;
  return {
    query,
    sql: sql`ts_rank(${sql.raw('content_tsv')}, to_tsquery('simple', ${query})) as rank_`,
    headline: sql`ts_headline(content_md, to_tsquery('simple', ${query}), 'MaxFragments=1, MaxWords=60, StartSel=<mark class="bg-accent/25 rounded px-0.5">, StopSel=</mark>')`,
  };
}
