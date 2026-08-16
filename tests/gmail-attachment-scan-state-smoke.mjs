import assert from 'node:assert/strict';
import {attachmentScanStateRow,selectUnscannedAttachmentPairs} from '../supabase/functions/gmail-tracker/attachment-scan-state.mjs';

const pairs=[
  {project_id:'p1',gmail_message_id:'m1',gmail_thread_id:'t1'},
  {project_id:'p1',gmail_message_id:'m1',gmail_thread_id:'t1'},
  {project_id:'p2',gmail_message_id:'m1',gmail_thread_id:'t1'},
  {project_id:'p3',gmail_message_id:'m2',gmail_thread_id:'t2'},
  {project_id:'',gmail_message_id:'broken'},
];
const scanned=[{project_id:'p1',gmail_message_id:'m1'}];
const pending=selectUnscannedAttachmentPairs(pairs,scanned,20);
assert.deepEqual(pending,[
  {project_id:'p2',gmail_message_id:'m1',gmail_thread_id:'t1'},
  {project_id:'p3',gmail_message_id:'m2',gmail_thread_id:'t2'},
],'scan state must skip exact project-message pairs while preserving valid multi-project relations');
assert.equal(selectUnscannedAttachmentPairs(pairs,[],1).length,1,'attachment scan batch limit must be enforced');

const at='2026-08-16T12:00:00.000Z';
assert.deepEqual(attachmentScanStateRow({project_id:'p1',gmail_message_id:'m1',gmail_thread_id:'t1'},3,at),{
  project_id:'p1',gmail_message_id:'m1',gmail_thread_id:'t1',outcome:'registered',attachment_count:3,scan_method:'server-metadata-v1',scanned_at:at
});
assert.deepEqual(attachmentScanStateRow({project_id:'p1',gmail_message_id:'m2'},0,at),{
  project_id:'p1',gmail_message_id:'m2',gmail_thread_id:null,outcome:'no_downloadable',attachment_count:0,scan_method:'server-metadata-v1',scanned_at:at
});
assert.equal(attachmentScanStateRow({project_id:'',gmail_message_id:'m1'},1,at),null,'invalid pair must never create scan state');

console.log('Gmail attachment scan state smoke: OK');
