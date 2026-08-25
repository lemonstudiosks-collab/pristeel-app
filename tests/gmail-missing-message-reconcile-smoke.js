const fs=require('fs');
const assert=require('assert');

const source=fs.readFileSync('supabase/migrations/20260825212500_gmail_missing_message_reconcile.sql','utf8');

assert.match(source,/pppp_reconcile_gmail_missing_http_v1/i,'missing-message reconciler function is required');
assert.match(source,/net\._http_response/i,'reconciler must use actual async HTTP outcomes');
assert.match(source,/messages\/\(\[0-9a-f\]\+\)/i,'reconciler must extract the exact Gmail message id');
assert.match(source,/Gmail \/messages\/%-> 404/i,'only confirmed Gmail missing-message responses may be terminal-marked');
assert.match(source,/body_hydration_method\s*=\s*case/i,'body hydration provenance must be preserved for already-hydrated messages');
assert.match(source,/server-full-mime-gmail-missing-v1/i,'missing body hydration must receive explicit provenance');
assert.match(source,/server-metadata-gmail-missing-v1/i,'missing attachment scan must receive explicit provenance');
assert.match(source,/project_attachment_scan_state/i,'attachment retries must be terminal-marked through the existing scan-state table');
assert.match(source,/outcome='no_downloadable'/i,'existing allowed terminal attachment outcome must be reused');
assert.match(source,/on conflict \(project_id,gmail_message_id\) do update/i,'scan-state repair must be idempotent');
assert.match(source,/project_email_links/i,'confirmed project links must be honored when project_emails.project_id is absent');
assert.match(source,/revoke all on function public\.pppp_reconcile_gmail_missing_http_v1\(integer\) from public, anon, authenticated/i,'reconciler must not become a user-facing mutation RPC');
assert.match(source,/gmail-missing-message-reconcile-5m/i,'self-heal must run automatically');
assert.match(source,/8-58\/5 \* \* \* \*/i,'self-heal cadence must remain bounded and avoid the attachment-sync minute');
assert.doesNotMatch(source,/delete\s+from\s+public\.project_emails/i,'historical project email records must never be deleted');

console.log('Gmail missing-message reconcile smoke test passed.');
