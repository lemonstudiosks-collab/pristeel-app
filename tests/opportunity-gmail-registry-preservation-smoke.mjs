import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260907125000_opportunity_action_gmail_registry_preservation_v2.sql','utf8');
const required=[
  'gmail_draft_id','gmail_message_id','gmail_thread_id','gmail_draft_created_at',
  'gmail_draft_generator','gmail_draft_generator_target','gmail_draft_generator_complete',
  'gmail_drafts','gmail_draft_count','gmail_recipient_count','gmail_recipients',
  'gmail_auto_send','human_send_required'
];
for(const key of required)assert(migration.includes(`'${key}'`),`registry preservation must include ${key}`);
assert(migration.includes('before update of payload'),'preservation must execute before payload refresh');
assert(migration.includes('old.payload ? k'),'external state must come from the existing action payload');
assert(migration.includes('not new.payload ? k'),'fresh engine state must win when it intentionally supplies a key');
assert(migration.includes('jsonb_build_object(k, old.payload -> k)'),'missing Gmail registry keys must be merged from old payload');
assert(!/gmail.send|messages\/send/.test(migration),'DB preservation must not add any email-send capability');

console.log('Opportunity Gmail multi-contact registry preservation smoke passed.');
