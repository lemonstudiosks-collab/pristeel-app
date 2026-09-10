import fs from 'node:fs';
import assert from 'node:assert/strict';

const entry=fs.readFileSync('supabase/functions/chatgpt-command-bridge/index.ts','utf8');
const workerPath='supabase/functions/chatgpt-command-bridge/worker.ts';
const worker=fs.existsSync(workerPath)?fs.readFileSync(workerPath,'utf8'):'';
const fn=`${entry}\n${worker}`;
const mig=fs.readFileSync('supabase/migrations/20260903134500_chatgpt_command_write_bridge_v1.sql','utf8');
const projectMig=fs.readFileSync('supabase/migrations/20260909222500_chatgpt_project_creation_command_bridge_v3.sql','utf8');
const cronMig=fs.readFileSync('supabase/migrations/20260909224000_chatgpt_command_bridge_cron_direct_v1.sql','utf8');

assert.match(entry,/import\s+["']\.\/worker\.ts["']/,'v3 worker entrypoint missing');
assert.match(fn,/COMMAND_SHEET_ID\s*=\s*'1ZoU1-aqHaN0CLI_1bcAUDXtGKdm97ixvopkusB96hZ8'/,'canonical command sheet missing');
assert.match(fn,/new Set\(\['context_fact',\s*'task',\s*'create_project'\]\)/,'safe action allowlist missing project creation');
assert.match(fn,/approval\s*!==\s*'approved'/,'explicit approval gate missing');
assert.match(fn,/pppp_ingest_context_fact_v1/,'context ingestion RPC missing');
assert.match(fn,/source:\s*'chatgpt_bridge'/,'ChatGPT task source missing');
assert.match(fn,/onConflict:\s*'source,source_ref'/,'task dedup missing');
assert.match(fn,/pppp_chatgpt_create_project_v1/,'canonical project creation RPC missing');
assert.match(fn,/project_name\s*is required|project_name is required/,'project name validation missing');
assert.match(fn,/resultProjectId\s*=\s*validUuid\(result\?\.project_id\)/,'created project ID is not preserved into receipt');
assert.match(fn,/https:\/\/www\.googleapis\.com\/auth\/drive/,'Drive-only DWD scope missing');
assert.match(fn,/mimeType=.*text%2Fcsv|encodeURIComponent\('text\/csv'\)/,'Drive CSV export missing');
assert.doesNotMatch(fn,/gmail\.googleapis\.com|messages\/send|sendMail|supplier_decision|mark.*won|mark.*lost/i,'bridge must not perform protected commercial/external actions');

const receiptLookup=fn.indexOf('const existing = await receipt(commandId)');
const terminalReceiptSkip=fn.indexOf("['succeeded', 'rejected'].includes(existing.status)",receiptLookup);
const attemptsGuard=fn.indexOf('if (attempts > 3)',terminalReceiptSkip);
const checkedIncrement=fn.indexOf('summary.checked++',attemptsGuard);
assert.ok(
  receiptLookup>=0 && terminalReceiptSkip>receiptLookup && attemptsGuard>terminalReceiptSkip && checkedIncrement>attemptsGuard,
  'already-processed or attempt-exhausted receipts must be skipped before consuming the reconciliation limit',
);

assert.match(mig,/create table if not exists public\.pppp_chatgpt_command_receipts/,'receipt table missing');
assert.match(mig,/pppp_chatgpt_command_status_v1/,'read-only status contract missing');
assert.match(mig,/supabase_read_only_user/,'ChatGPT read-only connector grant missing');
assert.match(mig,/chatgpt_command_bridge_internal_request/,'managed HTTP request function missing');
assert.match(mig,/chatgpt-command-bridge-10m/,'cron job missing');
assert.match(mig,/\*\/10 \* \* \* \*/,'10-minute schedule missing');
assert.match(mig,/revoke all .* authenticated/i,'authenticated write access must stay revoked');

assert.match(projectMig,/bridge_version','chatgpt-command-v3'/,'v3 bridge manifest missing');
assert.match(projectMig,/create_project_idempotent_by','command_id'/,'project creation idempotency contract missing');
assert.match(projectMig,/revoke execute .* supabase_read_only_user/is,'direct read-only connector write access must stay revoked');
assert.match(projectMig,/grant execute .* service_role/is,'trusted service worker execution grant missing');
assert.match(cronMig,/net\.http_post/,'dedicated bridge cron HTTP transport missing');
assert.doesNotMatch(cronMig,/pppp_enqueue_automation_http_v1/,'bridge cron must not reuse the colliding generic HTTP ledger');

console.log('ChatGPT command bridge smoke: OK');
