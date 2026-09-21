export function isDemoUser(user) {
  return user?.user_metadata?.seeded === true && typeof user.email === 'string' && user.email.toLowerCase().endsWith('@demo.nolto.local');
}
// Provenance: the retired seed-demo-users function, before the production readiness migration.
const seedCompanies = new Map([
  ['nordlys-labs', 'Nordlys Labs'], ['fjord-och-kod', 'Fjord & Kod'], ['granit-mobility', 'Granit Mobility'],
  ['lagom-health', 'Lagom Health'], ['tinda-pay', 'Tinda Pay'], ['skogen-studios', 'Skogen Studios'],
  ['brevik-och-co', 'Brevik & Co'], ['oresund-analytics', 'Öresund Analytics'],
]);
export function isUnclaimedSeedCompany(company) {
  if (seedCompanies.get(company.slug) !== company.name || company.claim_status !== 'unclaimed' || company.verified_at) return false;
  try {
    const logo = new URL(company.logo_url);
    return logo.origin === 'https://api.dicebear.com' && logo.pathname === '/9.x/shapes/svg' && logo.searchParams.get('seed') === company.slug;
  } catch { return false; }
}
