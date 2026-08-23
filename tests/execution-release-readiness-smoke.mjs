import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('supabase/migrations/20260823110000_execution_release_readiness_v1.sql','utf8');
const dsn=fs.readFileSync('supabase/migrations/20260823110500_dsn_icon_metadata_cleanup.sql','utf8');

assert.match(sql,/pppp_execution_release_snapshot_v1/i);
assert.match(sql,/pppp_sync_execution_release_readiness_v1/i);
assert.match(sql,/project_requirements[\s\S]*status='review'/i,'requirements review must be a release blocker');
assert.match(sql,/bom_items[\s\S]*needs_review is true/i,'unreviewed BOM must be a release blocker');
assert.match(sql,/local_ocr_failed[\s\S]*image_review/i,'attachment/OCR visual review states must be included');
assert.match(sql,/document_bom_review','document_image_review'/i,'document review tasks must be included');
assert.match(sql,/source='execution_release_readiness'/i,'release readiness must use one idempotent task source');
assert.match(sql,/execution-release-readiness-hourly/i,'hourly readiness reconciliation cron missing');
assert.match(sql,/HUMAN GATE/i,'release signal must explicitly preserve the human release decision');
assert.doesNotMatch(sql,/update\s+public\.projects/i,'release readiness must never advance or mutate projects');
assert.doesNotMatch(sql,/mail\.google|gmail|sendMessage|messages\.send/i,'release readiness must never send external communication');
assert.doesNotMatch(sql,/insert\s+into\s+public\.offers|insert\s+into\s+public\.invoices/i,'release readiness must not create commercial documents');
assert.match(sql,/revoke all on function public\.pppp_execution_release_snapshot_v1\(uuid\) from public,anon,authenticated/i);
assert.match(sql,/revoke all on function public\.pppp_sync_execution_release_readiness_v1\(\) from public,anon,authenticated/i);

assert.match(dsn,/delivery status notification/i);
assert.match(dsn,/mailer-daemon@googlemail\.com/i);
assert.match(dsn,/attachment_size_bytes,0\)<=4096/i,'DSN metadata cleanup must be limited to tiny icons');
assert.match(dsn,/analysis_status='metadata_noise'/i);
assert.doesNotMatch(dsn,/delete\s+from/i,'DSN icon cleanup must preserve original attachments');

console.log('Execution release readiness + DSN metadata cleanup smoke: OK');
