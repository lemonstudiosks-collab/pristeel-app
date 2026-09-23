import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260922220054_lock_remaining_maintenance_rpcs_v7.sql'),
  'utf8',
).toLowerCase();

const signatures = [
  'pppp_low_egress_schedule_controller_v1()',
  'pppp_supplier_identity_reconcile_v1(boolean)',
  'pppp_supplier_master_background_reconcile_v1(integer)',
  'pppp_supplier_master_ingest_v1(jsonb)',
];

for (const signature of signatures) {
  assert(sql.includes(`revoke execute on function public.${signature} from public, anon, authenticated;`));
  assert(sql.includes(`grant execute on function public.${signature} to service_role, postgres;`));
}

console.log('Remaining maintenance RPC lock smoke OK (4 functions)');
