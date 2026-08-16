import assert from 'node:assert/strict';
import {bodyHydrationPatch,selectLinkedBodyCandidates} from '../supabase/functions/gmail-tracker/body-hydration.mjs';

const emails=[
  {gmail_message_id:'direct-new',project_id:'p1',body_hydrated_at:null,sent_at:'2026-08-16T10:00:00Z'},
  {gmail_message_id:'linked-new',project_id:null,suggested_project_id:'not-truth',body_hydrated_at:null,sent_at:'2026-08-16T11:00:00Z'},
  {gmail_message_id:'suggested-only',project_id:null,suggested_project_id:'p9',body_hydrated_at:null,sent_at:'2026-08-16T12:00:00Z'},
  {gmail_message_id:'already-full',project_id:'p2',body_hydrated_at:'2026-08-15T09:00:00Z',sent_at:'2026-08-16T13:00:00Z'},
  {gmail_message_id:'unlinked',project_id:null,body_hydrated_at:null,sent_at:'2026-08-16T14:00:00Z'},
  {gmail_message_id:'direct-old',project_id:'p3',body_hydrated_at:null,sent_at:'2026-08-15T08:00:00Z'},
  {gmail_message_id:'direct-new',project_id:'p1',body_hydrated_at:null,sent_at:'2026-08-16T10:00:00Z'},
];
const links=[
  {gmail_message_id:'linked-new',project_id:'p4'},
  {gmail_message_id:'already-full',project_id:'p2'},
];
const candidates=selectLinkedBodyCandidates(emails,links,20);
assert.deepEqual(candidates.map(x=>x.gmail_message_id),['linked-new','direct-new','direct-old'],'only confirmed, unhydrated linked messages should be selected newest-first');
assert(!candidates.some(x=>x.gmail_message_id==='suggested-only'),'suggested project must never qualify as confirmed linkage');
assert(!candidates.some(x=>x.gmail_message_id==='already-full'),'already hydrated message must not be fetched again');
assert(!candidates.some(x=>x.gmail_message_id==='unlinked'),'unlinked inbox message must not enter hydration backlog');
assert.equal(selectLinkedBodyCandidates(emails,links,1).length,1,'body hydration batch limit must be enforced');

const at='2026-08-16T12:00:00.000Z';
const patch=bodyHydrationPatch('  Complete body\ntext  ',at);
assert.deepEqual(patch,{snippet:'Complete body\ntext',body_hydrated_at:at,body_hydration_method:'server-full-mime-v1',updated_at:at});
assert.equal(bodyHydrationPatch('   ',at),null,'empty Gmail body must not be marked hydrated');
assert.equal(bodyHydrationPatch('x'.repeat(60000),at).snippet.length,50000,'server body storage must remain bounded');

console.log('Gmail linked body hydration helper smoke: OK');
