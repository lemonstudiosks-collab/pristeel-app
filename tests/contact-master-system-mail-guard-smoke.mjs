import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const path='supabase/migrations/20260822193000_contact_master_system_mail_guard.sql';
const sql=await readFile(path,'utf8');
const compact=sql.replace(/\s+/g,' ').toLowerCase();

assert(compact.includes('create or replace function public.pppp_sync_contact_from_project_email_v1()'),'Live Gmail Contact Master trigger function is not versioned');
assert(compact.includes('create or replace function public.pppp_sync_contact_from_project_email_v1_row(p_email_row_id bigint)'),'Row rebuild helper is not guarded');
assert(compact.includes('create or replace function public.pppp_rebuild_gmail_contact_master_v1()'),'Bulk Gmail Contact Master rebuild is not guarded');

for(const token of ['no-?reply','do-?not-?reply','mailer-daemon','postmaster','notifications?','dmarc']){
  assert(sql.includes(token),`Missing system-mail exclusion: ${token}`);
}
assert(compact.includes("split_part(v_email,'@',2) = 'prissteel.com'"),'Exact PRISTEEL domain guard is missing');
assert(compact.includes("split_part(v_email,'@',2) like '%.prissteel.com'"),'PRISTEEL subdomain guard is missing');

assert(compact.includes("name=coalesce(nullif(trim(public.project_contacts.name),''),nullif(excluded.name,''))"),'Existing project-contact name is not preserved before inferred name');
assert(compact.includes("company=coalesce(nullif(trim(public.project_contacts.company),''),nullif(excluded.company,''))"),'Existing project-contact company is not preserved before inferred company');
assert(compact.includes("role=coalesce(nullif(trim(public.project_contacts.role),''),nullif(excluded.role,''))"),'Existing project-contact role is not preserved before inferred role');
assert(!compact.includes('is_primary=excluded.is_primary'),'Email reconciliation must never overwrite the primary-contact choice');
assert(compact.includes("when coalesce(nullif(trim(public.project_contacts.source),''),'gmail') in ('gmail','email-auto') then 'active'"),'Manual/non-auto status protection is missing');

assert(compact.includes("c.notes='auto-linked from gmail through pppp project context'"),'Cleanup is not restricted to Gmail-auto-created canonical contacts');
assert(compact.includes('c.hubspot_id is null'),'Cleanup is not restricted away from HubSpot-backed contacts');
assert(compact.includes("cs.source='gmail'"),'Cleanup may delete non-Gmail provenance');
assert(compact.includes('not exists ( select 1 from public.contact_sources cs where cs.contact_id=c.id::text )'),'Canonical cleanup does not preserve contacts with another source identity');
assert(compact.includes("coalesce(is_primary,false)=false"),'Project-contact cleanup does not protect primary relationships');
assert(compact.includes("source in ('gmail','email-auto')"),'Project-contact cleanup is not restricted to auto sources');

assert(!/drop\s+(table|schema)|truncate\s+/i.test(sql),'Migration contains destructive broad DDL');

console.log('Contact Master system-mail guard migration smoke test passed.');
