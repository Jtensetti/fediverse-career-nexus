#!/usr/bin/env node
// Replays supabase/migrations exactly as `supabase start` selects them (files named
// <digits>_<name>.sql, lexical order, one transaction each) into a brand-new throwaway
// database, then runs schema/permission/provisioning assertions.
//
// Requires an EMPTY, isolated PostgreSQL server reachable through PG* env vars whose
// extension directory includes the pg_cron/pg_net stand-ins from ./fresh-install/extensions
// (see docs/fresh-install.md). Requires NOLTO_FRESH_INSTALL_TEST=1 and a loopback/local-socket
// PGHOST; all other libpq destination overrides are stripped (fresh-install/destination.mjs).
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { childEnv } from './fresh-install/destination.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const migrations = join(root, 'supabase/migrations');
let env;
try { env = childEnv(process.env); } catch (error) { console.error(error.message); process.exit(2); }
const keep = process.argv.includes('--keep');
const allFailures = process.argv.includes('--continue');
const db = `nolto_fresh_${process.pid}`;
const psql = (args, database = 'postgres', input) => spawnSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', database, ...args], { encoding: 'utf8', input, env });

export const CLI_PATTERN = /^([0-9]+)_(.*)\.sql$/;
const files = readdirSync(migrations).filter(name => name.endsWith('.sql')).sort();
const skipped = files.filter(name => !CLI_PATTERN.test(name));
const selected = files.filter(name => CLI_PATTERN.test(name));
const versions = new Map();
for (const name of selected) {
  const version = name.match(CLI_PATTERN)[1];
  if (versions.has(version)) throw new Error(`Duplicate migration version ${version}: ${versions.get(version)} and ${name}`);
  versions.set(version, name);
}
if (skipped.length) { console.error('FAIL: files the Supabase CLI would skip:\n  ' + skipped.join('\n  ')); process.exit(1); }

execFileSync('psql', ['-X', '-q', '-d', 'postgres', '-c', `CREATE DATABASE ${db}`], { env });
let failures = 0;
try {
  const stub = psql(['--single-transaction', '-f', join(root, 'scripts/test-support/fresh-install/platform-stub.sql')], db);
  if (stub.status !== 0) throw new Error('platform stub failed: ' + stub.stderr);
  for (const name of selected) {
    const result = psql(['--single-transaction', '-f', join(migrations, name)], db);
    if (result.status !== 0) {
      failures++;
      console.error(`FAIL ${name}\n${result.stderr.trim().split('\n').slice(0, 6).join('\n')}`);
      if (!allFailures) break;
    }
  }
  if (!failures) {
    console.log(`PASS: ${selected.length} migrations replayed into an empty database.`);
    const checks = psql(['-f', join(root, 'scripts/test-support/fresh-install/assertions.sql')], db);
    process.stdout.write(checks.stdout);
    if (checks.status !== 0) { failures++; console.error('FAIL assertions\n' + checks.stderr.trim()); }
  }
} finally {
  if (!keep) execFileSync('psql', ['-X', '-q', '-d', 'postgres', '-c', `DROP DATABASE ${db}`], { env });
  else console.log(`kept database ${db}`);
}
process.exit(failures ? 1 : 0);
