import { spawnSync } from 'node:child_process';
// Functions maintained by the identity/federation/auth paths in this release.
const names = [
  'webfinger', 'actor', 'inbox', 'outbox', 'objects', 'activities', 'followers', 'following',
  'host-meta', 'nodeinfo', 'create-user-actor', 'send-follow', 'send-move', 'federation',
  'federated-auth-init', 'federated-auth-callback', 'sync-federated-profile',
  'auth-signup', 'auth-confirm-email', 'import-follows-csv', 'send-dm', 'seed-demo-users',
  'generate-actor-keys', 'follower-batch-processor', 'key-manager',
  'request-mfa-recovery', 'admin-issue-mfa-recovery',
];
const result = spawnSync('deno', ['check', '--config', 'deno.json', ...names.map(name => `supabase/functions/${name}/index.ts`)], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
