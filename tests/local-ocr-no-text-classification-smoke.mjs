import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('supabase/migrations/20260823100000_local_ocr_no_text_classification.sql','utf8');

assert.match(sql,/['"]no_text['"]/i,'local OCR jobs must have an explicit expected-no-text terminal state');
assert.match(sql,/create or replace function public\.local_ocr_no_text_job_trigger/i);
assert.match(sql,/create or replace function public\.local_ocr_fail_job/i);
assert.match(sql,/ocr_empty/i,'worker-reported OCR-empty condition must be recognized');
assert.match(sql,/analysis_status='image_review'/i,'unique real images must remain visible for human visual review');
assert.match(sql,/analysis_status='duplicate_content'/i,'exact binary duplicates must be separated from real image review');
assert.match(sql,/x\.content_sha256=a\.content_sha256/i,'duplicate classification must use exact content SHA-256');
assert.match(sql,/analysis_status='metadata_noise'/i,'tiny Word-generated artifacts must not remain OCR failures');
assert.match(sql,/document_image_review/i,'real no-text images must create a visual review task instead of an OCR failure task');
assert.match(sql,/status='no_text'.*completed_at/s,'expected no-text jobs should terminate cleanly');
assert.match(sql,/where a\.id=j\.attachment_link_id[\s\S]*j\.status='failed'[\s\S]*ocr_empty/i,'historical cleanup must be narrowly scoped to failed OCR-empty jobs');
assert.doesNotMatch(sql,/delete\s+from\s+public\.project_attachment_links/i,'no attachment may be deleted by OCR classification');
assert.doesNotMatch(sql,/set\s+status\s*=\s*'completed'[\s\S]{0,120}document_image_review/i,'visual review must never be silently completed');
assert.match(sql,/revoke all on function public\.local_ocr_fail_job\(text,bigint,text\) from public,anon,authenticated/i,'worker RPC must stay service-role only');

console.log('Local OCR expected-no-text classification smoke: OK');
