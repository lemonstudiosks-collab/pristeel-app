import fs from 'node:fs';
import assert from 'node:assert/strict';

const path='supabase/functions/project-action-engine/index.ts';
const src=fs.readFileSync(path,'utf8');
const deno=JSON.parse(fs.readFileSync('supabase/functions/project-action-engine/deno.json','utf8'));

for(const marker of [
  'function extractRequest',
  'async function ensureQuoteRevision',
  'async function ensureTask',
  'async function ensureEventAnalysis',
  'async function reconcile',
  'gmail_tracker_cron_authorized',
  'email_request_auto',
  'revision_source_ref',
  'installation_price_pending'
]) assert(src.includes(marker),`missing source marker: ${marker}`);

assert(src.includes('SUPABASE_SERVICE_ROLE_KEY'),'runtime must read the service key from environment');
assert(!/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/.test(src),'no JWT/service key may be committed');
assert.deepEqual(deno,{imports:{}});

console.log('Project action engine source smoke passed.');
