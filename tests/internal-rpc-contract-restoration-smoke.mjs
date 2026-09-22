import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260922180319_restore_internal_rpc_contracts_v2.sql'),
  'utf8',
).toLowerCase();

const serviceOnly = [
  'pppp_email_subject_explicit_project_v1(text)',
  'pppp_enqueue_automation_http_v1(text, text, text, integer, integer, uuid, integer)',
  'pppp_execution_release_confirmed_v1(uuid)',
  'pppp_execution_release_snapshot_v1(uuid)',
  'pppp_gc_mark_bounced_v1(uuid, timestamptz, text)',
  'pppp_gc_mark_first_sent_v1(uuid, text, text, timestamptz)',
  'pppp_gc_mark_gmail_history_duplicate_v1(uuid, text)',
  'pppp_gc_mark_no_response_v1(uuid)',
  'pppp_gc_mark_replied_v1(uuid, timestamptz, text)',
  'pppp_gc_mark_second_sent_v1(uuid, text, text, timestamptz)',
  'pppp_gc_register_contact_v1(uuid)',
  'pppp_gc_upsert_prospect_v1(text, text, text, text, text, text, integer, text, text, text, text, integer, jsonb, jsonb, jsonb, text, text, uuid)',
  'pppp_project_email_identity_autolink_v1(integer)',
  'pppp_reconcile_automation_http_v1(integer)',
  'pppp_reconcile_email_context_v1(integer)',
  'pppp_refresh_client_wait_followups_v1()',
  'pppp_refresh_followup_draft_candidates_v1()',
  'pppp_task_lifecycle_reconcile_v1(uuid)',
  'semantic_worker_ready_v1(interval)',
];

const postgresOnly = [
  'pppp_intelligence_change_from_state_v1(jsonb, integer, integer)',
  'pppp_intelligence_compact_state_v1(integer, integer)',
  'pppp_intelligence_snapshot_capture_v1(text)',
];

for (const signature of serviceOnly) {
  assert(sql.includes(`revoke execute on function public.${signature} from public, anon, authenticated;`));
  assert(sql.includes(`grant execute on function public.${signature} to service_role, postgres;`));
}

for (const signature of postgresOnly) {
  assert(sql.includes(`revoke execute on function public.${signature} from public, anon, authenticated, service_role;`));
  assert(sql.includes(`grant execute on function public.${signature} to postgres;`));
}

assert.equal((sql.match(/revoke execute on function/g) || []).length, 22);
assert.equal((sql.match(/grant execute on function/g) || []).length, 22);

console.log('Internal RPC contract restoration smoke OK (22 functions)');
