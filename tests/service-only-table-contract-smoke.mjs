import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260922220708_lock_service_only_tables_v8.sql'),
  'utf8',
).toLowerCase();

const tables = [
  'local_ocr_jobs',
  'local_ocr_workers',
  'pppp_automation_http_runs',
  'pppp_chatgpt_command_receipts',
  'pppp_intelligence_snapshots_v1',
  'pppp_platform_changelog',
  'pppp_platform_context',
  'pppp_platform_integrations',
  'pppp_platform_protected_rules',
  'pppp_tender_project_promotions',
  'project_attachment_scan_state',
  'semantic_ai_jobs',
  'semantic_worker_keys',
];

for (const table of tables) {
  assert(sql.includes(`revoke all privileges on table public.${table} from public, anon, authenticated;`));
  assert(sql.includes(`grant all privileges on table public.${table} to service_role, postgres;`));
}

assert(!sql.includes('supabase_read_only_user'), 'The audited read-only bridge must remain unchanged');

console.log('Service-only table contract smoke OK (13 tables)');
