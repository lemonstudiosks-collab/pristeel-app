import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260823080000_commercial_intake_candidates_v1.sql','utf8');
const orchestrator=fs.readFileSync('supabase/functions/commercial-intake-orchestrator/index.ts','utf8');
const discovery=fs.readFileSync('scripts/project-discovery-queue.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/project-data-reconcile.yml','utf8');

assert.match(migration,/create table if not exists public\.supplier_offer_candidates/i);
assert.match(migration,/create table if not exists public\.invoice_candidates/i);
assert.match(migration,/status text not null default 'review'/i,'candidate queues must remain review-first');
assert.match(migration,/commercial_intake_internal_request/i);
assert.match(migration,/revoke all on function public\.commercial_intake_internal_request\(integer\) from public,anon,authenticated/i,'internal cron RPC must stay service-role only');
assert.match(migration,/commercial-intake-10m/i,'candidate intake cron missing');

assert.match(orchestrator,/gmail_tracker_cron_authorized/,'orchestrator must use the existing cron authorization contract');
assert.match(orchestrator,/sup=await (?:supplierEvidence|suppliers)\(\)/,'supplier evidence must be loaded before intake');
assert.match(orchestrator,/!sup\.emails\.has\(se\)/,'supplier evidence gate missing');
assert.match(orchestrator,/supplier_offer_candidates/,'supplier candidate queue missing');
assert.match(orchestrator,/invoice_candidates/,'invoice candidate queue missing');
assert.match(orchestrator,/status\s*:\s*['"]review['"]/,'intake must create review candidates only');
assert.doesNotMatch(orchestrator,/db\.from\(['"]offers['"]\)\.(?:insert|upsert|update|delete)/,'intake must never create or mutate canonical supplier offers');
assert.doesNotMatch(orchestrator,/db\.from\(['"]invoices_(?:in|out)['"]\)\.(?:insert|upsert|update|delete)/,'intake must never create or mutate canonical invoices');
assert.doesNotMatch(orchestrator,/mail\.google\.com|gmail\.users\.messages\.send|sendMessage\s*\(/i,'intake must never send external communication');

assert.match(discovery,/TERMINAL_STATUSES=new Set\(\['created','linked','ignored'\]\)/,'Project Discovery terminal-state protection missing');
assert.doesNotMatch(discovery,/from\(['"]projects['"]\)\.(?:insert|upsert)/,'Project Discovery must not auto-create projects');
assert.match(workflow,/PROJECT_DISCOVERY_MODE: \$\{\{ github\.event_name == 'schedule' && 'apply'/,'scheduled Project Discovery must persist its review queue');
assert.match(workflow,/inputs\.mode \|\| 'preview'/,'manual/default Project Discovery must stay preview unless explicitly requested');

console.log('Commercial intake candidates + scheduled Project Discovery safety smoke: OK');
