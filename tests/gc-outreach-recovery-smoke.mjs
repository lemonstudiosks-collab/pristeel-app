import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const src=await readFile(new URL('../supabase/functions/pppp-gc-outreach/index.ts',import.meta.url),'utf8');
for(const token of [
 "function safePersonName",
 "Dear Sir or Madam,",
 "Recovered missing Gmail draft #1",
 "Recovered missing Gmail draft #2",
 "live_draft_1_verified",
 "live_draft_2_verified",
 "function contactDomain",
 "quality and fabrication documentation"
]) assert.ok(src.includes(token),'missing GC outreach hardening: '+token);
assert.equal(src.includes("Dear ${c||'Sir or Madam'} team,"),false,'generic English salutation must not address a company team');
assert.equal(src.includes('EN 1090-2 up to EXC-4'),false,'first touch must not overclaim detailed certification');
console.log('GC outreach live-draft recovery smoke: ok');
