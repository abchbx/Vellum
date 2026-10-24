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
  const files = readdirSync('drizzle')
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const raw = readFileSync(`drizzle/${file}`, 'utf8');
    const statements = raw
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    console.log(`[apply] ${file}: ${statements.length} statements`);
    for (const stmt of statements) {
      await db.execute(sql.raw(stmt));
    }
  }

  await db.execute(
    sql.raw('CREATE INDEX IF NOT EXISTS notes_content_tsv_gin ON notes USING gin (content_tsv)'),
  );
  console.log('[apply] gin index ensured');

  const tables = await db.execute(
    sql.raw("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"),
  );
  console.log('[apply] tables:', (tables.rows as { table_name: string }[]).map((t) => t.table_name).join(', '));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[apply] failed:', err.message);
    process.exit(1);
  });
