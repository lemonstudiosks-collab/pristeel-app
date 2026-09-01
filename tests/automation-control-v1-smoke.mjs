import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const core=read('supabase/migrations/20260901150530_automation_http_control_core_v1.sql');
const routing=read('supabase/migrations/20260901150632_automation_http_routing_v1.sql');
const tender=read('supabase/migrations/20260901150758_tender_project_promotion_v1.sql');

for(const token of [
  'pppp_automation_http_runs',
  'pppp_enqueue_automation_http_v1',
  'pppp_reconcile_automation_http_v1',
  'pppp_automation_watchdog_v1',
  "status in ('queued','succeeded','retry_wait','retried','failed')",
  "automation-http-reconcile-1m",
  "automation-watchdog-10m",
]) assert.ok(core.includes(token),`core missing ${token}`);

for(const token of [
  'private.dynamic_plan_internal_request',
  'private.gmail_attachment_reconcile_internal_request',
  'private.gmail_ted_sales_reconcile_internal_request',
  'public.commercial_intake_internal_request',
  'public.project_drive_reconciler_internal_request',
  'public.semantic_local_orchestrator_internal_request',
  'public.gmail_tracker_internal_request',
  'public.pppp_project_event_intelligence_internal_request',
  'public.project_document_intake_internal_request',
  'hubspot-sync-every-15min',
]) assert.ok(routing.includes(token),`routing missing ${token}`);
assert.ok((routing.match(/pppp_enqueue_automation_http_v1/g)||[]).length>=10,'managed dispatcher is not used broadly enough');

for(const token of [
  'pppp_tender_project_promotions',
  'pppp_tender_project_promotion_reconcile_v1',
  "v.operating_lane='direct_tender'",
  "if r.status<>'review' then continue; end if;",
  "'technical_review'",
  "'tender_project_promotion'",
  'No outbound communication was sent by this promotion.',
  'tender-project-promotion-hourly',
]) assert.ok(tender.includes(token),`tender promotion missing ${token}`);

assert.ok(!tender.includes("status='Fituar'"),'promotion must not auto-mark Won');
assert.ok(!tender.includes('gmail.send'),'promotion must not send Gmail');

console.log('Automation control v1 smoke OK');
