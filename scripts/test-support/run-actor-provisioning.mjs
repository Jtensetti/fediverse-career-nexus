import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// In-memory PostgreSQL only. This runner never connects to a hosted database.
if (!process.argv[2]) throw new Error('Pass the path to @electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const sql = name => readFile(new URL(name, import.meta.url), 'utf8');
try {
  await db.exec(await sql('./identity-schema.sql'));
  await db.exec(await sql('../../supabase/migrations/20260921164838_nolto_identity_and_federation_security.sql'));
  await db.exec(`
    REVOKE ALL ON auth.users FROM PUBLIC, anon, authenticated, service_role;
    INSERT INTO auth.users(id,email_confirmed_at) VALUES('11111111-1111-4111-8111-111111111111',now());
    INSERT INTO public.profiles(id,username) VALUES('11111111-1111-4111-8111-111111111111','provisioning_regression');
    SET ROLE service_role;
  `);
  // Reproduce the production failure with the original RPC and actual role ACLs.
  await assert.rejects(
    db.query("SELECT public.ensure_local_actor('11111111-1111-4111-8111-111111111111','','',false)"),
    error => error.code === '42501' && /permission denied for table users/.test(error.message),
  );
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.actors')).rows[0].count, 0);
  await db.exec(await sql('../../supabase/migrations/20260923065928_local_actor_provisioning_permissions.sql'));
  await db.exec(await sql('./actor-provisioning-assertions.sql'));
  console.log('PASS: original permission failure reproduced; restricted provisioning succeeds without auth.users access, retains keys and opt-in, and denies client roles.');
} finally { await db.close(); }
