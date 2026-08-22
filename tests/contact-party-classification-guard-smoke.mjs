import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const sql=await readFile('supabase/migrations/20260822201500_contact_party_classification_guard.sql','utf8');
const compact=sql.replace(/\s+/g,' ').toLowerCase();

assert(compact.includes('create or replace function public.pppp_contact_party_guard_v1()'),'Canonical contact party guard is not versioned');
assert(compact.includes("p.relation @> array['supplier']::text[]"),'Supplier partner evidence is not restricted to relation=supplier');
assert(compact.includes("p.relation && array['buyer','lead']::text[]"),'Buyer/lead evidence is not represented');
assert(compact.includes("new.kind := 'client'"),'Buyer/lead guard does not correct false supplier classification');
assert(compact.includes("new.kind := 'supplier'"),'Supplier evidence does not classify supplier contacts');
assert(compact.includes('c.id is distinct from new.id'),'Domain inheritance can seed itself during updates');

for(const domain of ['gmail.com','googlemail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','me.com','live.com','protonmail.com']){
  assert(sql.includes(`'${domain}'`),`Generic domain exclusion missing: ${domain}`);
}

assert(compact.includes('create or replace function public.pppp_project_contact_party_guard_v1()'),'Project-contact party invariant is missing');
assert(compact.includes("lower(coalesce(new.source,'')) not in ('gmail','email-auto')"),'Manual project contacts are not protected from canonical auto-classification');
assert(compact.includes("new.role := 'supplier'"),'Auto project relationships are not aligned to supplier role');
assert(compact.includes("new.role := 'client'"),'False auto supplier roles are not corrected to client');
assert(compact.includes('revoke all on function public.pppp_project_contact_party_guard_v1() from public, anon, authenticated'),'New SECURITY DEFINER helper is exposed to normal API roles');

assert(compact.includes("c.notes='auto-linked from gmail through pppp project context'"),'Company repair is not narrowly scoped to Gmail-auto provenance');
assert(compact.includes("lower(trim(c.company))=sd.domain"),'Raw-domain company repair condition is missing');
assert(compact.includes("nullif(trim(coalesce(c.company,'')),'') is null"),'Blank-company repair condition is missing');
assert(compact.includes('row_number() over(partition by domain order by priority'),'Supplier-domain canonical seed has no deterministic priority');
assert(compact.includes("when exists (select 1 from public.rfq_log"),'RFQ seed priority is missing');
assert(compact.includes("when exists (select 1 from supplier_names"),'Supplier-partner seed priority is missing');

assert(!/truncate\s+|drop\s+(table|schema)|delete\s+from\s+public\.contacts/i.test(sql),'Migration contains broad destructive contact cleanup');
assert(!/where\s+lower\(trim\(coalesce\(p\.name,''\)\)\)=lower\(trim\(coalesce\(new\.company,''\)\)\)[\s\S]{0,180}new\.kind\s*:=\s*'supplier'/i.test(sql),'Any-partner supplier shortcut reappeared');

console.log('Contact party classification guard smoke test passed.');
