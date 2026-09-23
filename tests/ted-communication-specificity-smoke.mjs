import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const reconciler=await readFile(new URL('../supabase/functions/gmail-ted-sales-reconciler/index.ts',import.meta.url),'utf8');
const migration=await readFile(new URL('../supabase/migrations/20260923113000_ted_communication_specificity_v1.sql',import.meta.url),'utf8');
const explicitOnly=await readFile(new URL('../supabase/migrations/20260923121000_ted_communication_explicit_only_v2.sql',import.meta.url),'utf8');

for(const token of [
  'scoreTender(k,subject,snippet)',
  'method:"ted-subject-title-v7"',
  'best.score-runnerUp.score>=1',
  '.order("sent_at",{ascending:true})',
  'version:7'
]) assert.ok(reconciler.includes(token),`reconciler missing ${token}`);

assert.match(migration,/pe\.tender_watch_id=a\.tender_watch_id/);
assert.match(migration,/pe\.tender_watch_id is null/);
assert.match(migration,/explicit_tender/);
assert.match(migration,/grant select on public\.pppp_opportunity_communication_state_v1/);
assert.match(explicitOnly,/pe\.tender_watch_id=a\.tender_watch_id/);
assert.match(explicitOnly,/explicit_tender/);
assert.doesNotMatch(explicitOnly,/company_domain'::text/);
assert.doesNotMatch(explicitOnly,/cross join lateral/);

// A title-specific email must outrank another opportunity for the same company.
const norm=(v)=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const stop=new Set(['germany','austria','france','denmark','structural','steelworks','construction','metalworking','works','work','stahlbau','stahlbauarbeiten','neubau','gmbh','projekt','project','zusatzliche','fertigungskapazitat','prissteel']);
const tokens=(v)=>[...new Set(norm(v).split(' ').filter((x)=>x.length>=5&&!stop.has(x)))];
const score=(title,subject)=>tokens(title).filter((x)=>norm(subject).includes(x)).length;
const subject='AW: EÜ Grünstraße Gengenbach – Fertigung Stahlüberbauten | PRISTEEL';
const exact=score('Germany – Railway bridge construction work – Ern. EÜ Grünstraße Gengenbach Str. 4250 km 9,743 - Hauptbauleistungen',subject);
const other=score('Germany – Neubau Kolpingstraße – Hauptbauleistungen',subject);
assert.ok(exact>=2);
assert.ok(exact-other>=1);

console.log('TED communication specificity smoke: ok');
