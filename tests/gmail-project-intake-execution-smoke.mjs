import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('supabase/functions/gmail-project-intake/index.ts','utf8');
assert.match(source,/function ensureQuoteRevision\(/,'Gmail intake must have a controlled quote revision step');
assert.match(source,/revision_source_ref/,'Quote revision must be idempotent by Gmail source reference');
assert.match(source,/followup_status:\s*"draft"/,'Automatically prepared quote must remain a draft');
assert.match(source,/installation_price_pending/,'Installation must stay explicitly pending when no price exists');
assert.match(source,/price:0,_pstNeedsPrice:true/,'No installation price may be invented');
assert.match(source,/subtotal_before_installation/,'Subtotal must explicitly exclude pending installation');
assert.match(source,/text\(d\.followup_status\)\.toLowerCase\(\)===\"sent\"/,'Revision must start from an already sent PRISTEEL quote');
assert.match(source,/r\.massKg<=qty/,'Requested coating quantity must be bounded by the base quote quantity');
assert.match(source,/engine:\"server_event_rules\"/,'A processed client request must write a deterministic current Project Intelligence event analysis');
assert.match(source,/model:\"deterministic-client-request-v1\"/,'Event analysis must be identifiable and auditable');
assert.match(source,/source:\"email_request_auto\"/,'Client request task must retain its dedicated source');
assert.doesNotMatch(source,/db\.from\(\"bom_items\"\)\.(?:insert|update|upsert|delete)\s*\(/,'Client-request execution must not write BOM');
assert.doesNotMatch(source,/db\.from\(\"projects\"\)\.(?:insert|update|upsert|delete)\s*\(/,'Client-request execution must not alter project status or create projects');
console.log('Gmail project intake execution smoke test passed.');