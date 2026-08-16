import fs from 'node:fs';
import assert from 'node:assert/strict';

const path='supabase/functions/gmail-tracker/index.ts';
const source=fs.readFileSync(path,'utf8');

assert.ok(source.includes('x-pppp-cron-secret'),'cron secret header guard must remain');
assert.ok(source.includes('gmail_tracker_cron_authorized'),'cron secret must be verified server-side');
assert.ok(source.includes('?format=full&fields='),'new Gmail ingestion must request full MIME payload');
assert.ok(source.includes('body(data,attachmentId,size)'),'full MIME request must include inline body data metadata');
assert.ok(source.includes('function fullBodyText('),'full-body parser must exist');
assert.ok(source.includes('.slice(0, 50000)'),'email body storage must stay bounded to 50k characters');
assert.ok(source.includes('snippet: fullBodyText(full.payload, String(full.snippet ?? ""))'),'new messages must store hydrated body text in the existing snippet contract');
assert.ok(source.includes('match_method: "server-ingest-unmatched-v1"'),'server ingestion must remain explicitly unmatched');
assert.ok(source.includes('match_confidence: 0'),'server ingestion must not invent match confidence');
assert.ok(source.includes('needs_review: false'),'new ingestion must not fabricate a review decision');

const fetchStart=source.indexOf('async function fetchMessageRow');
const ingestStart=source.indexOf('async function ingestProjectEmails');
assert.ok(fetchStart>=0&&ingestStart>fetchStart,'fetchMessageRow ingestion boundary must exist');
const fetchBlock=source.slice(fetchStart,ingestStart);
assert.ok(!/\bproject_id\b/.test(fetchBlock),'raw Gmail ingestion must never assign a project_id');
assert.ok(!/suggested_project_id/.test(fetchBlock),'raw Gmail ingestion must never assign a suggested project');
assert.ok(!/\/attachments\//.test(source),'gmail-tracker must not download attachment binaries during metadata/body ingestion');

const ingestEnd=source.indexOf('async function scanReplies');
const ingestBlock=source.slice(ingestStart,ingestEnd);
assert.ok(ingestBlock.includes('const newIds = ids.filter((id) => !existing.has(id));'),'ingestion must fetch only new Gmail message ids');
assert.ok(ingestBlock.includes('ignoreDuplicates: true'),'database insert must remain duplicate-safe');
assert.ok(ingestBlock.includes('onConflict: "gmail_message_id"'),'Gmail message id must remain the dedupe key');

console.log('Gmail tracker source safety smoke: OK');
