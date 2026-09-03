import fs from 'node:fs';
import assert from 'node:assert/strict';

const lifecycle = fs.readFileSync('supabase/migrations/20260825101000_task_lifecycle_reconcile_v1.sql', 'utf8');
const enforcer = fs.readFileSync('supabase/migrations/20260825101200_task_lifecycle_close_enforcer_v1.sql', 'utf8');
const hardening = fs.readFileSync('supabase/migrations/20260903073000_automation_backlog_hardening_v1.sql', 'utf8');

assert.match(lifecycle, /pppp_task_lifecycle_reconcile_v1/);
assert.match(lifecycle, /task-lifecycle-reconcile-15m/);
assert.match(lifecycle, /pg_trigger_depth\(\) > 1/);
assert.match(lifecycle, /row_number\(\) over/);
assert.match(lifecycle, /project_discovery_auto/);
assert.match(lifecycle, /commercial_intake_review/);
assert.match(lifecycle, /operational_state,''\)\) = 'execution'/);
assert(!lifecycle.includes("'invoice_receivable'"), 'finance receivables must not be auto-closed by lifecycle reconciliation');
assert(!lifecycle.includes("'invoice_due_date_missing'"), 'finance due-date work must not be auto-closed by lifecycle reconciliation');
assert(!lifecycle.includes("'kontrate'"), 'contract obligations must remain outside automated lifecycle cleanup');

assert.match(enforcer, /zzzz_pppp_task_lifecycle_close_enforcer_v1/);
assert.match(enforcer, /lifecycle-auto-closed/);
assert.match(enforcer, /lifecycle-dedup/);
assert.match(enforcer, /new\.status := 'mbyllur'/);

assert.match(hardening, /semantic_worker_ready_v1/);
assert.match(hardening, /last_used_at >= now\(\) - greatest/);
assert.match(hardening, /semantic-local-orchestrator-5m/);
assert.match(hardening, /if not public\.semantic_worker_ready_v1/);
assert.match(hardening, /'semantic_local',jsonb_build_object/);
assert.match(hardening, /downstream-client-offer-auto-closed/);
assert.match(hardening, /new\.source='project_decision_auto'/);
assert.match(hardening, /e\.project_id=new\.project_id/);
assert.match(hardening, /e\.direction='outgoing'/);
assert.match(hardening, /pppp_documents_registry_doc_nr_guard_v1/);
assert.match(hardening, /pg_advisory_xact_lock\(hashtext\('documents_registry:doc_nr:'/);
assert.match(hardening, /errcode='23505'/);
assert(!hardening.includes('update public.documents_registry\nset doc_nr'), 'historical document numbers must never be rewritten by collision prevention');

console.log('Task lifecycle reconciliation smoke: OK');
