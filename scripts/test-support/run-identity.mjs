import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
// Use a temporary PGlite install, so the production project needs no PostgreSQL test dependency.
if (!process.argv[2]) throw new Error('Pass the path to @electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const sql = name => readFile(new URL(name, import.meta.url), 'utf8');
try {
  await db.exec(await sql('./identity-schema.sql'));
  await db.exec(await sql('../../supabase/migrations/20260921164838_nolto_identity_and_federation_security.sql'));
  await db.exec('CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();');
  await db.exec(await sql('./identity-assertions.sql'));
  console.log('PASS: identity, key permissions, opt-in, content privacy, ordered delivery, tombstones and email confirmation assertions.');
} finally { await db.close(); }
