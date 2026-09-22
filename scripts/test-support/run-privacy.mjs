import { readFile, readdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
if (!process.argv[2]) throw new Error('Pass the path to @electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const appliedMigrations = new Set();
try {
  for (const path of [
    './cloud-schema.sql',
    './privacy-storage-schema.sql',
    '../../supabase/migrations/20260921164838_nolto_identity_and_federation_security.sql',
    '../../supabase/migrations/20260921195208_nolto_account_and_data_boundaries.sql',
    '../../supabase/migrations/20260922041529_nolto_private_messages_and_minimisation.sql',
    '../../supabase/migrations/20260922041921_nolto_deletion_retention.sql',
    './privacy-assertions.sql',
    '../../supabase/migrations/20260922065026_nolto_reported_deletion_review.sql',
    './moderation-retention-assertions.sql',
    '../../supabase/migrations/20260922073754_nolto_rpc_and_invitation_boundaries.sql',
    './rpc-boundary-assertions.sql',
    '../../supabase/migrations/20260922081110_nolto_post_notifications.sql',
    './post-notification-assertions.sql',
    '../../supabase/migrations/20260922124130_personal_feeds.sql',
    './personal-feed-assertions.sql',
    '../../supabase/migrations/20260922141011_considerate_moderation.sql',
    '../../supabase/migrations/20260922142915_atproto_sign_in.sql',
    './atproto-assertions.sql',
    '../../supabase/migrations/20260922150131_review_context_and_appeal.sql',
    './considerate-moderation-assertions.sql',
    '../../supabase/migrations/20260922172010_federated_interactions.sql',
    './federated-interaction-assertions.sql',
    '../../supabase/migrations/20260922172019_post_image_drafts.sql',
    './post-image-assertions.sql',
    '../../supabase/migrations/20260922184945_mastodon_client_access.sql',
    './mastodon-assertions.sql',
  ]) {
    try {
      if (path !== './cloud-schema.sql') await db.exec('SET check_function_bodies = true');
      await db.exec(await readFile(new URL(path, import.meta.url), 'utf8'));
      if (path.includes('/supabase/migrations/')) appliedMigrations.add(basename(path));
    } catch (error) { throw new Error(`${path}: ${error.message}${error.where ? ` (${error.where})` : ''}`); }
  }
  // Hosted deployments can generate migration copies. Replay every later file,
  // including files not explicitly listed above, to catch duplicate DDL in CI.
  const migrationDirectory = new URL('../../supabase/migrations/', import.meta.url);
  const laterMigrations = (await readdir(migrationDirectory)).filter(name =>
    /^\d{14}_.+\.sql$/.test(name) && name > '20260922172019_' && !appliedMigrations.has(name)).sort();
  for (const name of laterMigrations) {
    try { await db.exec(await readFile(new URL(name, migrationDirectory), 'utf8')); }
    catch (error) { throw new Error(`${name}: ${error.message}`); }
  }
  console.log('PASS: privacy migrations, deletion visibility and retention, private media, encrypted message boundaries.');
} finally { await db.close(); }
