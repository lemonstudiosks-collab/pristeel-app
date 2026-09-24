import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_SUPABASE_URL = 'https://awqfpnzqwfjrjefoktgd.supabase.co';
const SOURCE_PATTERN = /^[A-Z0-9_:-]{2,80}$/;

export function normalizeSourceKey(value) {
  const source = String(value || '').trim().toUpperCase();
  if (!SOURCE_PATTERN.test(source)) throw new Error('A valid external source key is required.');
  return source;
}

export async function claimExternalSourceDay({
  sourceKey,
  runToken,
  triggerName = '',
  timezone = 'Europe/Budapest',
  supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  fetchImpl = fetch
} = {}) {
  const source = normalizeSourceKey(sourceKey);
  const token = String(runToken || '').trim();
  if (!token) throw new Error('PPPP_SOURCE_ACCESS_RUN_TOKEN is required.');
  if (!serviceKey) throw new Error('A Supabase service key is required for the external-source daily gate.');

  const response = await fetchImpl(`${String(supabaseUrl).replace(/\/$/, '')}/rest/v1/rpc/pppp_claim_external_source_daily_access_v1`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_source_key: source,
      p_run_token: token,
      p_trigger_name: String(triggerName || '').slice(0, 120) || null,
      p_timezone: timezone
    })
  });
  const raw = await response.text();
  let result;
  try { result = raw ? JSON.parse(raw) : null; } catch { result = null; }
  if (!response.ok || !result || typeof result.allowed !== 'boolean') {
    throw new Error(`Daily source gate failed closed: HTTP ${response.status} ${raw.slice(0, 500)}`);
  }
  return result;
}

async function main() {
  const sourceKey = process.argv[2] || process.env.PPPP_EXTERNAL_SOURCE_KEY;
  const result = await claimExternalSourceDay({
    sourceKey,
    runToken: process.env.PPPP_SOURCE_ACCESS_RUN_TOKEN,
    triggerName: process.env.PPPP_SOURCE_ACCESS_TRIGGER || process.env.GITHUB_EVENT_NAME || 'manual'
  });
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `allowed=${result.allowed}\nsource_key=${result.source_key}\naccess_day=${result.access_day}\n`, 'utf8');
  }
  console.log(result.allowed
    ? `External source ${result.source_key}: daily access claimed for ${result.access_day}.`
    : `External source ${result.source_key}: skipped; ${result.access_day} was already claimed.`);
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) main().catch(error => { console.error(error?.message || error); process.exit(1); });

