import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260922215317_restore_maintenance_rpc_contracts_v4.sql'),
  'utf8',
).toLowerCase();

const signatures = [
  'pppp_automation_watchdog_v1()',
  'pppp_project_discovery_triage_v1(boolean, integer)',
  'pppp_reconcile_contact_role_conflicts_v1(boolean)',
  'pppp_reconcile_gmail_missing_http_v1(integer)',
  'pppp_reconcile_legacy_followups_v1(boolean)',
  'pppp_supplier_offer_precision_reconcile_v1(boolean)',
];

for (const signature of signatures) {
  assert(sql.includes(`revoke execute on function public.${signature} from public, anon, authenticated;`));
  assert(sql.includes(`grant execute on function public.${signature} to service_role, postgres;`));
}

assert.equal((sql.match(/revoke execute on function/g) || []).length, signatures.length);
assert.equal((sql.match(/grant execute on function/g) || []).length, signatures.length);

console.log('Maintenance RPC contract smoke OK (6 functions)');
