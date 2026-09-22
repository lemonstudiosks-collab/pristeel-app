import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260922175307_lock_internal_worker_rpcs_v1.sql'),
  'utf8',
).toLowerCase();

const signatures = [
  'chatgpt_command_bridge_internal_request(integer)',
  'commercial_intake_internal_request(integer)',
  'gmail_tracker_internal_request(text, integer, integer)',
  'local_ocr_apply_completed_job(bigint)',
  'local_ocr_claim_job(text)',
  'local_ocr_enqueue_attachment(bigint)',
  'local_ocr_enqueue_expense_receipt_v1(uuid)',
  'local_ocr_fail_job(text, bigint, text)',
  'local_ocr_heartbeat(text, bigint)',
  'local_ocr_submit_result(text, bigint, text, jsonb)',
  'pppp_apply_expense_receipt_ocr_v1(uuid, text, jsonb)',
  'pppp_expense_drive_ingest_internal_request(integer)',
  'pppp_followup_draft_generator_internal_request(integer)',
  'pppp_gc_discovery_internal_request(integer, boolean)',
  'pppp_gc_outreach_internal_request(integer)',
  'pppp_project_event_intelligence_internal_request(integer, integer)',
  'pppp_project_memory_synthesis_internal_request(integer)',
  'project_document_intake_internal_process(bigint)',
  'project_document_intake_internal_request(text, integer)',
  'project_drive_reconciler_internal_request(integer)',
  'semantic_claim_job(text)',
  'semantic_complete_job(uuid, text, text, jsonb, text)',
  'semantic_local_orchestrator_internal_request(integer)',
  'semantic_worker_authorize(text)',
];

for (const signature of signatures) {
  assert(
    sql.includes(`revoke execute on function public.${signature} from public, anon, authenticated;`),
    `${signature} must not be callable by browser roles`,
  );
  assert(
    sql.includes(`grant execute on function public.${signature} to service_role, postgres;`),
    `${signature} must remain callable by service workers and schedulers`,
  );
}

assert.equal((sql.match(/revoke execute on function/g) || []).length, signatures.length);
assert.equal((sql.match(/grant execute on function/g) || []).length, signatures.length);

console.log(`Internal worker RPC lock smoke OK (${signatures.length} functions)`);
