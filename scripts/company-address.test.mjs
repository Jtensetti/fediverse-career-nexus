import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

globalThis.companyAddressTest = {};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@/lib/supabase') return { url: 'company-test:client', shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'company-test:client') return { format: 'module', source: `export const supabase={
      rpc:async()=>globalThis.companyAddressTest.reserved,
      from:()=>{globalThis.companyAddressTest.lookups++;return {select:()=>({eq:()=>({limit:async()=>globalThis.companyAddressTest.existing})})};}
    };`, shortCircuit: true };
    return next(url, context);
  },
});
const { isSlugAvailable } = await import('../src/services/company/companyService.ts');
function setup(reserved = false, existing = []) {
  Object.assign(globalThis.companyAddressTest, { reserved: { data: reserved, error: null }, existing: { data: existing, error: null }, lookups: 0 });
}

test('reserved and existing organization addresses are unavailable while a confirmed free address is available', async () => {
  setup(true);
  assert.equal(await isSlugAvailable('reserved'), false);
  assert.equal(globalThis.companyAddressTest.lookups, 0);
  setup(false, [{ id: 'existing-organization' }]);
  assert.equal(await isSlugAvailable('existing'), false);
  setup();
  assert.equal(await isSlugAvailable('new-organization'), true);
});

test('failed reserved-name or organization reads never report an address available', async () => {
  setup();
  globalThis.companyAddressTest.reserved = { data: null, error: { message: 'Private provider diagnostic' } };
  await assert.rejects(() => isSlugAvailable('new-organization'), { message: 'Could not check organization address' });
  assert.equal(globalThis.companyAddressTest.lookups, 0);
  setup();
  globalThis.companyAddressTest.existing = { data: null, error: { message: 'Private provider diagnostic' } };
  await assert.rejects(() => isSlugAvailable('new-organization'), { message: 'Could not check organization address' });
});
