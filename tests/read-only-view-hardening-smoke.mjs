import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260922173000_harden_read_only_views_v1.sql'),
  'utf8',
);

for (const view of [
  'pppp_home_current_actions_v1',
  'pppp_tender_price_dataset_v1',
]) {
  assert.match(
    migration,
    new RegExp(`alter view public\\.${view}\\s+set \\(security_invoker = true\\)`, 'i'),
    `${view} must run under the caller's RLS context`,
  );
}

for (const view of [
  'pppp_home_current_actions_v1',
  'pppp_tender_price_dataset_v1',
  'pppp_tender_price_work_queue_v1',
]) {
  assert.match(migration, new RegExp(`public\\.${view}`, 'i'));
}

assert.match(migration, /revoke insert, update, delete, truncate, references, trigger/i);
assert.doesNotMatch(migration, /revoke\s+select/i, 'authenticated SELECT must remain available');
assert.doesNotMatch(migration, /drop\s+(view|table)/i, 'hardening must not remove API surfaces');

console.log('Read-only view hardening smoke OK');
