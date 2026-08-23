import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('supabase/migrations/20260823112000_swift_payment_evidence_punctuation_fix.sql','utf8');

assert.match(sql,/attachment_name,''\)\) like 'swift confirmation%'/i,'SWIFT routing must require the expected filename family');
assert.match(sql,/extracted_text,''\)\) like '%swift%'/i,'SWIFT routing must require SWIFT evidence in extracted text');
assert.match(sql,/message input reference/i,'OCR punctuation-safe payment evidence marker missing');
assert.match(sql,/network ack/i,'network acknowledgement marker missing');
assert.match(sql,/network delivery\. status/i,'punctuated OCR variant must be recognized');
assert.match(sql,/document_class','payment_evidence'/i);
assert.match(sql,/technical_bom_relevance','none'/i);
assert.match(sql,/bom_status='none'/i);
assert.match(sql,/source='document_bom_review'/i,'false technical review task must be closed');
assert.match(sql,/pppp_sync_execution_release_readiness_v1/i,'release readiness must be recalculated');
assert.doesNotMatch(sql,/delete\s+from/i,'source evidence must never be deleted');
assert.doesNotMatch(sql,/update\s+public\.projects/i,'project lifecycle state must not be changed');
assert.doesNotMatch(sql,/\bwhere\s+(?:a\.)?id\s*=\s*\d+/i,'cleanup must not depend on hardcoded attachment IDs');

console.log('SWIFT payment evidence routing smoke: OK');
