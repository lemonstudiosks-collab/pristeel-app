import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260922215544_restore_authenticated_rpc_contracts_v5.sql'),
  'utf8',
).toLowerCase();

const signatures = [
  'pppp_automation_control_health_v1()',
  'pppp_confirm_expense_receipt_v1(uuid, jsonb)',
  'pppp_create_manual_supplier_offer_v1(uuid, jsonb)',
  'pppp_ignore_expense_receipt_v1(uuid)',
];

for (const signature of signatures) {
  assert(sql.includes(`revoke execute on function public.${signature} from public, anon;`));
  assert(sql.includes(`grant execute on function public.${signature} to authenticated, service_role, postgres;`));
}

assert.equal((sql.match(/revoke execute on function/g) || []).length, signatures.length);
assert.equal((sql.match(/grant execute on function/g) || []).length, signatures.length);

console.log('Authenticated RPC contract smoke OK (4 functions)');
