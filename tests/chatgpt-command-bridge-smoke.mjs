import fs from 'node:fs';
import assert from 'node:assert/strict';

const fn=fs.readFileSync('supabase/functions/chatgpt-command-bridge/index.ts','utf8');
const mig=fs.readFileSync('supabase/migrations/20260903134500_chatgpt_command_write_bridge_v1.sql','utf8');

assert.match(fn,/COMMAND_SHEET_ID\s*=\s*'1ZoU1-aqHaN0CLI_1bcAUDXtGKdm97ixvopkusB96hZ8'/,'canonical command sheet missing');
assert.match(fn,/new Set\(\['context_fact',\s*'task'\]\)/,'safe action allowlist missing');
assert.match(fn,/approval\s*!==\s*'approved'/,'explicit approval gate missing');
assert.match(fn,/pppp_ingest_context_fact_v1/,'context ingestion RPC missing');
assert.match(fn,/source:\s*'chatgpt_bridge'/,'ChatGPT task source missing');
assert.match(fn,/onConflict:\s*'source,source_ref'/,'task dedup missing');
assert.match(fn,/https:\/\/www\.googleapis\.com\/auth\/drive/,'Drive-only DWD scope missing');
assert.match(fn,/mimeType=.*text%2Fcsv|encodeURIComponent\('text\/csv'\)/,'Drive CSV export missing');
assert.doesNotMatch(fn,/gmail\.googleapis\.com|messages\/send|sendMail|supplier_decision|mark.*won|mark.*lost/i,'bridge must not perform protected commercial/external actions');

assert.match(mig,/create table if not exists public\.pppp_chatgpt_command_receipts/,'receipt table missing');
assert.match(mig,/pppp_chatgpt_command_status_v1/,'read-only status contract missing');
assert.match(mig,/supabase_read_only_user/,'ChatGPT read-only connector grant missing');
assert.match(mig,/chatgpt_command_bridge_internal_request/,'managed HTTP request function missing');
assert.match(mig,/chatgpt-command-bridge-10m/,'cron job missing');
assert.match(mig,/\*\/10 \* \* \* \*/,'10-minute schedule missing');
assert.match(mig,/revoke all .* authenticated/i,'authenticated write access must stay revoked');

console.log('ChatGPT command bridge smoke: OK');
