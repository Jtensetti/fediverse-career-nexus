/** Dry-run by default. Never selects ordinary accounts by display name or company slug alone. */
import { readFile, writeFile } from 'node:fs/promises';
import { isDemoUser, isUnclaimedSeedCompany } from './demo-selection.mjs';
const args = process.argv.slice(2);
const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : null;
const project = value('--project');
const output = value('--output');
const manifestPath = value('--apply');
const origin = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!project || !/^[a-z]{20}$/.test(project) || origin !== `https://${project}.supabase.co` || !key) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and pass --project <exact project ref>. Dry-run: --output manifest.json. Delete reviewed targets: --apply manifest.json.');
}
async function api(path, method = 'GET', body) {
  const response = await fetch(`${origin}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) throw new Error(`${method} ${path.split('?')[0]} returned HTTP ${response.status}; cleanup stopped`);
  const text = await response.text(); return text ? JSON.parse(text) : null;
}
async function rows(table, query = '') {
  const all = [];
  for (let offset = 0; ; offset += 500) {
    const page = await api(`/rest/v1/${table}?${query}${query ? '&' : ''}order=id&limit=500&offset=${offset}`);
    all.push(...page); if (page.length < 500) return all;
  }
}
async function inventory() {
  const users = [];
  const seen = new Set();
  // Collect the complete target set before deleting: deletion must not shift pagination.
  for (let page = 1; ; page++) {
    const data = await api(`/auth/v1/admin/users?page=${page}&per_page=1000`);
    for (const user of data.users || []) {
      if (seen.has(user.id)) throw new Error('Repeated admin pagination; refusing an incomplete inventory');
      seen.add(user.id); if (isDemoUser(user)) users.push({ id: user.id, email: user.email });
    }
    if (!data.users?.length || data.users.length < 1000) break;
  }
  const ids = new Set(users.map(user => user.id));
  const actors = (await rows('actors', 'select=id,user_id')).filter(actor => ids.has(actor.user_id));
  const actorIds = new Set(actors.map(actor => actor.id));
  const candidates = (await rows('companies', 'select=id,slug,name,logo_url,claim_status,verified_at')).filter(isUnclaimedSeedCompany);
  const companies = [], review = [];
  for (const company of candidates) {
    let hasRealContribution = false;
    for (const table of ['company_roles', 'company_employees', 'company_followers', 'articles', 'job_posts']) {
      const related = await rows(table, `select=id,user_id&company_id=eq.${company.id}`);
      if (related.some(row => !ids.has(row.user_id))) hasRealContribution = true;
    }
    const posts = await rows('ap_objects', `select=id,attributed_to&company_id=eq.${company.id}`);
    if (posts.some(post => !actorIds.has(post.attributed_to))) hasRealContribution = true;
    (hasRealContribution ? review : companies).push({ id: company.id, slug: company.slug });
  }
  return { project, users: users.sort((a,b) => a.id.localeCompare(b.id)), actors: actors.map(a => a.id).sort(),
    companies: companies.sort((a,b) => a.id.localeCompare(b.id)), review };
}
const plan = await inventory();
if (!manifestPath) {
  if (output) await writeFile(output, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
  else console.log(JSON.stringify(plan, null, 2));
  console.log(`Dry-run: ${plan.users.length} demo users, ${plan.companies.length} unclaimed seed companies; ${plan.review.length} companies require manual review. Nothing deleted.`);
} else {
  const reviewed = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (JSON.stringify(reviewed) !== JSON.stringify(plan)) throw new Error('Inventory changed since the reviewed manifest. Generate and review a new dry-run. Nothing deleted.');
  // Pause fake identities before cascades; never deliver synthetic deletion activities to real peers.
  for (const id of plan.actors) {
    await api(`/rest/v1/actors?id=eq.${id}`, 'PATCH', { status: 'disabled' });
    await api(`/rest/v1/federation_queue_partitioned?actor_id=eq.${id}`, 'DELETE');
  }
  for (const company of plan.companies) await api(`/rest/v1/companies?id=eq.${company.id}`, 'DELETE');
  for (const user of plan.users) await api(`/auth/v1/admin/users/${user.id}`, 'DELETE');
  console.log(`Deleted ${plan.users.length} demo accounts and ${plan.companies.length} seed companies. Review residual files and the skipped-company list before reopening.`);
}
