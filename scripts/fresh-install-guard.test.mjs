import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { checkDestination, childEnv } from './test-support/fresh-install/destination.mjs';

const ok = { NOLTO_FRESH_INSTALL_TEST: '1', PGHOST: '127.0.0.1', PGPORT: '5432' };
const dirs = { isDirectory: path => path === '/tmp/pg-socket' };

test('requires explicit opt-in', () => {
  assert.throws(() => checkDestination({ ...ok, NOLTO_FRESH_INSTALL_TEST: undefined }), /NOLTO_FRESH_INSTALL_TEST=1/);
  assert.throws(() => checkDestination({ ...ok, NOLTO_FRESH_INSTALL_TEST: 'true' }), /NOLTO_FRESH_INSTALL_TEST=1/);
});

test('accepts only literal loopback or an absolute local socket directory', () => {
  assert.equal(checkDestination(ok).host, '127.0.0.1');
  assert.equal(checkDestination({ ...ok, PGHOST: '::1' }).host, '::1');
  assert.equal(checkDestination({ ...ok, PGHOST: '/tmp/pg-socket' }, dirs).host, '/tmp/pg-socket');
  for (const host of [undefined, '', 'localhost', 'db.internal', '10.0.0.5', '127.0.0.2', 'abc.supabase.co', '127.0.0.1,db.example',
    'tmp/pg-socket', '/tmp/missing', '/tmp/pg-socket,/tmp/pg-socket', 'host=db.example', 'postgresql://db.example']) {
    assert.throws(() => checkDestination({ ...ok, PGHOST: host }, dirs), /PGHOST/, String(host));
  }
  for (const port of ['0', '70000', '5432,5433', 'x']) assert.throws(() => checkDestination({ ...ok, PGPORT: port }), /PGPORT/);
});

test('child processes never inherit libpq destination overrides and get a connect timeout', () => {
  const env = childEnv({ ...ok, PGUSER: 'postgres', PGPASSWORD: 'throwaway', PATH: '/bin',
    PGHOSTADDR: '203.0.113.9', PGSERVICE: 'prod', PGSERVICEFILE: '/etc/pg_service.conf', PGOPTIONS: '-c role=x', PGDATABASE: 'prod',
    PGSYSCONFDIR: '/etc', PGPASSFILE: '/root/.pgpass', PGSSLMODE: 'disable', PGTARGETSESSIONATTRS: 'any', PGCONNECT_TIMEOUT: '600' });
  assert.deepEqual(Object.keys(env).filter(k => k.startsWith('PG')).sort(), ['PGAPPNAME', 'PGCONNECT_TIMEOUT', 'PGHOST', 'PGPASSWORD', 'PGPORT', 'PGUSER']);
  assert.equal(env.PGCONNECT_TIMEOUT, '5');
  assert.equal(env.PATH, '/bin');
});

test('the runner refuses before touching any server', () => {
  const run = extra => spawnSync(process.execPath, ['scripts/test-support/run-fresh-install.mjs'], { encoding: 'utf8',
    env: { PATH: '/nonexistent', ...extra } }); // PATH without psql: a refusal must not depend on psql failing
  let result = run({ PGHOST: '127.0.0.1' });
  assert.equal(result.status, 2); assert.match(result.stderr, /NOLTO_FRESH_INSTALL_TEST=1/);
  result = run({ NOLTO_FRESH_INSTALL_TEST: '1', PGHOST: 'db.example.com' });
  assert.equal(result.status, 2); assert.match(result.stderr, /PGHOST/);
});

test('assertions.sql refuses unmarked databases and keeps its security checks', () => {
  const sql = readFileSync(new URL('./test-support/fresh-install/assertions.sql', import.meta.url), 'utf8');
  assert.match(sql, /current_database\(\) NOT LIKE 'nolto_fresh_%'\s+AND coalesce\(current_setting\('nolto\.fresh_install_guard', true\), ''\) <> 'isolated-ci'/);
  for (const check of ['Tables without RLS', 'A storage bucket is public', 'Client role can provision actors', 'User granted themselves admin', 'is_admin ignores user_roles', 'Signup did not create the profile'])
    assert.ok(sql.includes(check), check);
});
