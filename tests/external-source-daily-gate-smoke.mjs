import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { claimExternalSourceDay, normalizeSourceKey } from '../scripts/external-source-daily-gate.mjs';

assert.equal(normalizeSourceKey(' krpp '), 'KRPP');
assert.throws(() => normalizeSourceKey('bad source!'));

let request;
const result = await claimExternalSourceDay({
  sourceKey: 'TED',
  runToken: 'workflow-123',
  triggerName: 'schedule',
  serviceKey: 'test-service-key',
  supabaseUrl: 'https://example.supabase.co/',
  fetchImpl: async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, text: async () => JSON.stringify({ allowed: true, source_key: 'TED', access_day: '2026-09-24' }) };
  }
});
assert.equal(result.allowed, true);
assert.equal(request.url, 'https://example.supabase.co/rest/v1/rpc/pppp_claim_external_source_daily_access_v1');
assert.equal(request.options.method, 'POST');
assert.equal(request.options.headers.Authorization, 'Bearer test-service-key');
assert.deepEqual(JSON.parse(request.options.body), {
  p_source_key: 'TED',
  p_run_token: 'workflow-123',
  p_trigger_name: 'schedule',
  p_timezone: 'Europe/Budapest'
});

await assert.rejects(() => claimExternalSourceDay({
  sourceKey: 'KRPP', runToken: 'workflow-456', serviceKey: 'key',
  fetchImpl: async () => ({ ok: false, status: 404, text: async () => 'missing RPC' })
}), /failed closed/);

const migration = await readFile('supabase/migrations/20260924083000_external_source_daily_access_guard_v1.sql', 'utf8');
assert.match(migration, /primary key \(source_key, access_day\)/i, 'daily claim must be unique per source and day');
assert.match(migration, /on conflict \(source_key, access_day\) do nothing/i, 'daily claim must be atomic');
assert.match(migration, /at time zone v_timezone/i, 'business day must use the configured timezone');
assert.match(migration, /security invoker/i, 'service-only claim RPC must use caller privileges');
assert.doesNotMatch(migration, /security definer/i, 'daily gate must not bypass caller privileges');
assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/i, 'claim RPC must not be public');
assert.match(migration, /grant execute on function[\s\S]*to service_role/i, 'claim RPC must remain service-only');

console.log('external source daily gate smoke passed');
