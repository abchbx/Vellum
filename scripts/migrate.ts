import { readFileSync, readdirSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { getDb } from '../db';

process.env.DATABASE_URL = readFileSync('.env.local', 'utf8')
  .split('\n')
  .filter((l) => l.startsWith('DATABASE_URL='))
  .pop()!
  .slice('DATABASE_URL='.length)
  .trim();

async function main() {
  const db = getDb();
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS drizzle_migrations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tag text NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `));

  const applied = new Set(
    ((await db.execute(sql.raw('SELECT tag FROM drizzle_migrations'))).rows as { tag: string }[]).map((r) => r.tag),
  );

  const files = readdirSync('drizzle')
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let appliedCount = 0;
  for (const file of files) {
    const tag = file.replace(/\.sql$/, '');
    if (applied.has(tag)) {
      console.log(`[migrate] skip ${tag} (already applied)`);
      continue;
    }
    const raw = readFileSync(`drizzle/${file}`, 'utf8');
    const statements = raw
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    console.log(`[migrate] applying ${tag}: ${statements.length} statements`);
    for (const stmt of statements) {
      await db.execute(sql.raw(stmt));
    }
    await db.execute(
      sql`INSERT INTO drizzle_migrations (tag) VALUES (${tag}) ON CONFLICT DO NOTHING`,
    );
    appliedCount++;
  }

  console.log(`[migrate] done. applied=${appliedCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate] failed:', err.message);
    process.exit(1);
  });
