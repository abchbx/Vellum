import { sql } from 'drizzle-orm';
import { getDb } from '../db';
import { readFileSync } from 'node:fs';

process.env.DATABASE_URL = readFileSync('.env.local', 'utf8')
  .split('\n')
  .filter((l) => l.startsWith('DATABASE_URL='))
  .pop()!
  .slice('DATABASE_URL='.length)
  .trim();

const EXPR =
  "to_tsvector('simple', regexp_replace(lower(coalesce(title, '') || ' ' || coalesce(content_md, '')), '([一-鿿])', ' \\1 ', 'g'))";

async function main() {
  const db = getDb();
  await db.execute(sql.raw('ALTER TABLE notes DROP COLUMN IF EXISTS content_tsv'));
  await db.execute(sql.raw(`ALTER TABLE notes ADD COLUMN content_tsv tsvector GENERATED ALWAYS AS (${EXPR}) STORED NOT NULL`));
  console.log('[fts] column rebuilt');

  const tsv = await db.execute(sql.raw("SELECT content_tsv FROM notes WHERE slug = 'n948599d2'"));
  const row = (tsv.rows as { content_tsv: string }[])[0];
  console.log('[fts] sample:', String(row?.content_tsv).slice(0, 160));

  const m = await db.execute(sql.raw("SELECT count(*)::int as c FROM notes WHERE content_tsv @@ plainto_tsquery('simple', '花 园')"));
  console.log('[fts] match 花 园:', (m.rows as { c: number }[])[0]?.c);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[fts] failed:', err.message);
    process.exit(1);
  });
