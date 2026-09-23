import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260922174500_lock_trigger_functions_from_api_v1.sql'),
  'utf8',
);

const signatures = [...sql.matchAll(/public\.([a-z0-9_]+)\(\)/gi)].map((match) => match[1]);
assert.equal(signatures.length, 32, 'the audited trigger-only function set must stay explicit');
assert.equal(new Set(signatures).size, signatures.length, 'function signatures must not repeat');
assert.match(sql, /revoke execute on function/i);
assert.match(sql, /from public, anon, authenticated/i);
assert.doesNotMatch(sql, /service_role/i, 'service execution must stay intact');
assert.doesNotMatch(sql, /drop\s+(function|trigger)/i, 'hardening must not remove trigger behavior');

console.log('Trigger function API lock smoke OK');
