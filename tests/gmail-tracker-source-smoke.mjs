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
assert.ok(source.includes('body_hydration_method: "server-full-mime-v1"'),'new server-ingested messages must record full-body provenance');
assert.ok(source.includes('match_method: "server-ingest-unmatched-v1"'),'server ingestion must remain explicitly unmatched');
assert.ok(source.includes('match_confidence: 0'),'server ingestion must not invent match confidence');
assert.ok(source.includes('needs_review: false'),'new ingestion must not fabricate a review decision');

const fetchStart=source.indexOf('async function fetchMessageRow');
const bodyCandidatesStart=source.indexOf('async function linkedBodyHydrationCandidates');
assert.ok(fetchStart>=0&&bodyCandidatesStart>fetchStart,'fetchMessageRow ingestion boundary must exist');
const fetchBlock=source.slice(fetchStart,bodyCandidatesStart);
assert.ok(!/\bproject_id\b/.test(fetchBlock),'raw Gmail ingestion must never assign a project_id');
assert.ok(!/suggested_project_id/.test(fetchBlock),'raw Gmail ingestion must never assign a suggested project');
assert.ok(!/\/attachments\//.test(source),'gmail-tracker must not download attachment binaries during metadata/body ingestion');

const bodyCandidatesEnd=source.indexOf('async function syncLinkedBodyHydration');
assert.ok(bodyCandidatesStart>=0&&bodyCandidatesEnd>bodyCandidatesStart,'linked body hydration candidate boundary missing');
const bodyCandidateBlock=source.slice(bodyCandidatesStart,bodyCandidatesEnd);
assert.ok(bodyCandidateBlock.includes('.is("body_hydrated_at", null)'),'server hydration must only select messages not already hydrated');
assert.ok(bodyCandidateBlock.includes('selectLinkedBodyCandidates(emails ?? [], links ?? [], limit)'),'server hydration must use the confirmed-link selector');
assert.ok(bodyCandidateBlock.includes('suggested_project_id'),'suggested identity may be read for audit compatibility but must never be used by the pure selector as confirmed linkage');

const bodySyncEnd=source.indexOf('async function linkedAttachmentCandidates');
const bodySyncBlock=source.slice(bodyCandidatesEnd,bodySyncEnd);
assert.ok(bodySyncBlock.includes('bodyHydrationPatch(body, at)'),'server hydration must use the bounded provenance patch helper');
assert.ok(bodySyncBlock.includes('.eq("gmail_message_id", id)'),'server hydration must update only the exact Gmail message');
assert.ok(bodySyncBlock.includes('.is("body_hydrated_at", null)'),'concurrent already-hydrated messages must not be overwritten');
assert.ok(!/project_id\s*:|suggested_project_id\s*:/.test(bodySyncBlock),'body hydration write must never assign project identity');
assert.ok(source.includes('if (action === "body_hydrate")'),'explicit body hydration action missing');
assert.ok(source.includes('const body_hydration = await syncLinkedBodyHydration(bodyLimit)'),'hourly run must include bounded linked-body hydration');

const ingestStart=source.indexOf('async function ingestProjectEmails');
const ingestEnd=source.indexOf('async function scanReplies');
assert.ok(ingestStart>=0&&ingestEnd>ingestStart,'project email ingestion boundary must exist');
const ingestBlock=source.slice(ingestStart,ingestEnd);
assert.ok(ingestBlock.includes('const newIds = ids.filter((id) => !existing.has(id));'),'ingestion must fetch only new Gmail message ids');
assert.ok(ingestBlock.includes('ignoreDuplicates: true'),'database insert must remain duplicate-safe');
assert.ok(ingestBlock.includes('onConflict: "gmail_message_id"'),'Gmail message id must remain the dedupe key');

assert.ok(source.includes('attachmentRegistryRows(full, candidate.project_id, "server-metadata-v1")'),'attachment metadata must require a confirmed project relation');
assert.ok(source.includes('Math.min(40, Math.max(1, Math.floor(Number(limit) || 20)))'),'attachment metadata sync must remain batch-bounded');
assert.ok(source.includes('onConflict: "gmail_message_id,attachment_id,project_id"'),'attachment metadata registry must remain duplicate-safe per project');

console.log('Gmail tracker source safety smoke: OK');
