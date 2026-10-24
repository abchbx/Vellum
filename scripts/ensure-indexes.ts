import { getDb, ensureIndexes } from '../db';

async function main() {
  await ensureIndexes();
  const count = await getDb().execute('SELECT count(*)::int as c FROM notes');
  console.log(`[indexes] gin index ensured. notes=${(count.rows[0] as { c: number }).c}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
