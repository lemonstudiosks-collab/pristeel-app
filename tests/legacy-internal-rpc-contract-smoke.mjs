import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260922180803_restore_legacy_internal_rpc_contracts_v3.sql'),
  'utf8',
).toLowerCase();

const signatures = [
  'hubspot_sync_cron_authorized(text)',
  'merge_crm_contacts()',
  'pppp_rebuild_gmail_contact_master_v1()',
  'pppp_refresh_project_decision(uuid)',
  'pppp_sync_contact_from_project_email_v1_row(bigint)',
  'pppp_sync_execution_release_readiness_v1()',
];

for (const signature of signatures) {
  assert(sql.includes(`revoke execute on function public.${signature} from public, anon, authenticated;`));
  assert(sql.includes(`grant execute on function public.${signature} to service_role, postgres;`));
}

assert.equal((sql.match(/revoke execute on function/g) || []).length, signatures.length);
assert.equal((sql.match(/grant execute on function/g) || []).length, signatures.length);

console.log('Legacy internal RPC contract smoke OK (6 functions)');
