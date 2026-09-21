import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {listAllDraftRefs,localDate} from '../supabase/functions/pppp-outbound-sync/sync-core.mjs';

const pages=[
  {drafts:Array.from({length:20},(_,i)=>({id:`d${i+1}`})),nextPageToken:'page-2'},
  {drafts:Array.from({length:20},(_,i)=>({id:`d${i+21}`})),nextPageToken:'page-3'},
  {drafts:Array.from({length:5},(_,i)=>({id:`d${i+41}`}))},
];
const requested=[];
const paged=await listAllDraftRefs(async path=>{
  requested.push(path);
  const url=new URL(`https://gmail.test${path}`);
  const token=url.searchParams.get('pageToken')||'';
  return pages[token===''?0:token==='page-2'?1:2];
});
assert.equal(paged.pages,3,'must follow every Gmail page');
assert.equal(paged.refs.length,45,'must preserve 20+20+N draft references');
assert.deepEqual(requested.map(x=>new URL(`https://gmail.test${x}`).searchParams.get('pageToken')), [null,'page-2','page-3']);

await assert.rejects(
  listAllDraftRefs(async()=>({drafts:[],nextPageToken:'same-token'})),
  /gmail_repeated_next_page_token/,
  'must stop a repeated Gmail page token instead of looping',
);
assert.equal(localDate('Europe/Belgrade',new Date('2026-09-21T22:30:00Z')),'2026-09-22');

const edge=await readFile(new URL('../supabase/functions/pppp-outbound-sync/index.ts',import.meta.url),'utf8');
const migration=(await readFile(new URL('../supabase/migrations/20260921170821_outbound_sync_server_canonical_v1.sql',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
for(const token of [
  'https://www.googleapis.com/auth/gmail.readonly',
  'pppp_outbound_reconcile_live_drafts_v1',
  'pppp_outbound_plan_day_v1',
  'reconcile_calls: 1',
  'plan_calls: 1',
  'sent_email: false',
]) assert.ok(edge.includes(token),`missing sync safeguard: ${token}`);
assert.equal(edge.includes('/drafts/send'),false,'sync must never send Gmail drafts');
assert.equal(edge.includes('gmail.compose'),false,'sync must not request Gmail compose scope');

for(const token of [
  'pppp_outbound_sync_internal_request',
  'pppp-outbound-sync-server-4x',
  'pppp-outbound-dispatch-shared-10m',
  'pppp_outbound_source_guard_v1',
  'pppp_outbound_reconcile_live_drafts_v1',
  'pppp_outbound_plan_day_v1',
  'pppp_outbound_claim_for_dispatch_v1',
  "delete from public.pppp_outbound_live_drafts_v1\n  where draft_id is not null",
  "grant execute on function public.pppp_outbound_sync_internal_request() to service_role",
]) assert.ok(migration.includes(token),`missing canonical migration token: ${token}`);
assert.equal(migration.includes('set send_enabled=true'),false,'migration must not enable sending');
assert.equal(/set\s+approved_for_send\s*=\s*true/i.test(migration),false,'migration must not approve queue rows');

console.log('server-side outbound sync smoke: ok');
