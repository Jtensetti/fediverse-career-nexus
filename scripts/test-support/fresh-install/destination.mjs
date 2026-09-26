// Destination guard for run-fresh-install.mjs. The replay creates cluster-wide roles, so it
// may only ever reach a throwaway PostgreSQL on this machine, and only on explicit opt-in.
import { statSync } from 'node:fs';
import { isAbsolute } from 'node:path';

const LOOPBACK = new Set(['127.0.0.1', '::1']);
// Every libpq variable that can redirect or reconfigure a connection is dropped; only the
// validated host/port and the throwaway credentials are passed on to psql.
const PASS_THROUGH = new Set(['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD']);

export function checkDestination(env, { isDirectory = path => { try { return statSync(path).isDirectory(); } catch { return false; } } } = {}) {
  if (env.NOLTO_FRESH_INSTALL_TEST !== '1') throw new Error('Refusing to run: set NOLTO_FRESH_INSTALL_TEST=1 to confirm this is a throwaway PostgreSQL server');
  const host = env.PGHOST ?? '';
  const socketDir = isAbsolute(host) && !host.includes(',') && isDirectory(host);
  if (!LOOPBACK.has(host) && !socketDir) throw new Error(`Refusing to run: PGHOST must be 127.0.0.1, ::1 or an absolute local socket directory (got ${JSON.stringify(host)})`);
  const port = env.PGPORT ?? '5432';
  if (!/^[0-9]{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error(`Refusing to run: invalid PGPORT ${JSON.stringify(port)}`);
  return { host, port };
}

export function childEnv(env) {
  const clean = Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith('PG') || PASS_THROUGH.has(key)));
  const { host, port } = checkDestination(env);
  return { ...clean, PGHOST: host, PGPORT: port, PGCONNECT_TIMEOUT: '5', PGAPPNAME: 'nolto-fresh-install' };
}
