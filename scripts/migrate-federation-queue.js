import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  const { data, error } = await supabase.rpc('migrate_federation_queue_data');
  if (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
  console.log(`Migrated ${data} queue items`);
})();

