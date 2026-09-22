import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20260922165905_retire_orphaned_legacy_project_request_wrappers.sql');
const root = fileURLToPath(new URL('../', import.meta.url));

for (const signature of [
  'private.dynamic_plan_internal_request(integer)',
  'private.gmail_attachment_reconcile_internal_request(integer)',
  'private.gmail_attachment_reconcile_message_request(text, integer)',
  'private.gmail_ted_sales_reconcile_internal_request(integer)',
  'private.project_document_intake_backfill_request(integer)',
  'private.project_document_intake_process_id_request(bigint)',
]) {
  assert.ok(migration.includes(`drop function if exists ${signature}`), `missing cleanup for ${signature}`);
}

assert.doesNotMatch(migration, /drop\s+(table|view|trigger)\b/i, 'cleanup must not remove business data or runtime triggers');
assert.doesNotMatch(migration, /drop function if exists public\./i, 'cleanup must not remove public RPCs');

const excluded = [
  'supabase/migrations/',
  'docs/archive/',
  'tests/',
];
const legacyUrl = 'https://isymxqfqzkchbsrbhucf.supabase.co';
const stale = [];
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
    if (excluded.some(prefix => relativePath.startsWith(prefix))) continue;
    if (entry.isDirectory()) scan(fullPath);
    else if (!entry.name.startsWith('PPPP_CHECKPOINT_') && fs.readFileSync(fullPath, 'utf8').includes(legacyUrl)) stale.push(relativePath);
  }
}
scan(root);
assert.deepEqual(stale, [], `active files still target the legacy Supabase project:\n${stale.join('\n')}`);

console.log('Legacy project cleanup smoke OK');
