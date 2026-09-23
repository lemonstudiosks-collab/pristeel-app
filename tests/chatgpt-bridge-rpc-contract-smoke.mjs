import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260922215738_lock_chatgpt_bridge_rpc_contracts_v6.sql'),
  'utf8',
).toLowerCase();

assert.equal((sql.match(/revoke execute on function/g) || []).length, 27);
assert.equal((sql.match(/grant execute on function public/g) || []).length, 27);
assert.match(sql, /from public, anon, authenticated/);
assert.match(sql, /to service_role, postgres/);
assert.match(sql, /rolname = 'supabase_read_only_user'/);
assert.equal((sql.match(/'public\.pppp_chatgpt_/g) || []).length, 24);

for (const writeName of [
  'pppp_chatgpt_create_project_v1',
  'pppp_chatgpt_create_supplier_offer_v1',
  'pppp_chatgpt_project_disposition_v1',
]) {
  const readOnlyGrantSection = sql.slice(sql.indexOf('foreach signature'));
  assert(!readOnlyGrantSection.includes(`public.${writeName}`), `${writeName} must stay service-only`);
}

console.log('ChatGPT bridge RPC contract smoke OK (24 read + 3 write functions)');
