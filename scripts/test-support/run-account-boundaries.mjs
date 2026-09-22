import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
if (!process.argv[2]) throw new Error('Pass the path to @electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
try {
  for (const path of [
    './cloud-schema.sql',
    '../../supabase/migrations/20260921164838_nolto_identity_and_federation_security.sql',
    '../../supabase/migrations/20260921195208_nolto_account_and_data_boundaries.sql',
    './account-assertions.sql',
  ]) {
    try {
      if (path !== './cloud-schema.sql') await db.exec('SET check_function_bodies = true');
      await db.exec(await readFile(new URL(path, import.meta.url), 'utf8'));
    }
    catch (error) { throw new Error(`${path}: ${error.message}${error.where ? ` (${error.where})` : ''}`); }
  }
  console.log('PASS: deployed-schema migrations, revoked sessions, MFA, private messages, RPC permissions, post audiences and account deletion.');
} finally { await db.close(); }
