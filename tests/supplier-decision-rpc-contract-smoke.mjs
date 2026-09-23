import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260923105041_lock_supplier_decision_rpc_from_anon_v1.sql'),
  'utf8',
).toLowerCase();
const signature = 'public.pppp_record_supplier_decision_v1(uuid, uuid, text, text, jsonb)';

assert(sql.includes(`revoke execute on function ${signature}\n  from public, anon;`));
assert(sql.includes(`grant execute on function ${signature}\n  to authenticated, service_role, postgres;`));
assert.equal((sql.match(/revoke execute on function/g) || []).length, 1);
assert.equal((sql.match(/grant execute on function/g) || []).length, 1);

console.log('Supplier-decision RPC contract smoke OK');
