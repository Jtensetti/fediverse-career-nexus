import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const directory = 'supabase/functions';
const entrypoints = readdirSync(directory, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
  .flatMap(entry => ['index.ts', 'manage.ts'].map(file => `${directory}/${entry.name}/${file}`).filter(existsSync));
const result = spawnSync('deno', ['check', '--config', 'deno.json', ...entrypoints], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
