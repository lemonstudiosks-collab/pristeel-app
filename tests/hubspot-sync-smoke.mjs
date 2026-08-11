import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mapHubSpotContact, mapHubSpotDeal, planHubSpotContactUpdate } from '../scripts/hubspot-sync.mjs';
import { makeSourceRow, dedupeSourceRows, upsertSourceRows } from '../scripts/contact-provenance-common.mjs';
import { resolveBitrixEmailGroups } from '../scripts/bitrix-contact-email-resolver.mjs';
import { resolveSupabaseWorkflowAccess } from '../scripts/supabase-workflow-auth.mjs';

const contact = mapHubSpotContact({
  id: '123',
  properties: {
    firstname: 'Anna',
    lastname: 'Muster',
    email: 'ANNA@EXAMPLE.COM',
    phone: '+49 123',
    company: 'Example GmbH',
    jobtitle: 'Einkauf',
    country: 'DE'
  }
});

assert.equal(contact.hubspot_id, '123');
assert.equal(contact.person, 'Anna Muster');
assert.equal(contact.email, 'anna@example.com');
assert.equal(contact.company, 'Example GmbH');
assert.match(contact.hubspot_url, /147958987\/contact\/123$/);
assert.deepEqual(Object.keys(contact).sort(), [
  'company', 'country', 'email', 'hubspot_id', 'hubspot_url', 'person', 'phone', 'role'
].sort());

const safeMerge = planHubSpotContactUpdate({
  id: 'local-1',
  hubspot_id: null,
  hubspot_url: null,
  person: 'Anton Manzl jr.',
  company: 'Empl Baugesellschaft m.b.H.',
  email: 'office@empl-bau.at',
  phone: '+43 111',
  role: null,
  country: 'AT'
}, {
  hubspot_id: '987',
  hubspot_url: 'https://app.hubspot.com/contacts/147958987/contact/987',
  person: 'Anton Manzl',
  company: 'Empl Baugesellschaft m.b.H.',
  email: 'office@empl-bau.at',
  phone: '+43 999',
  role: 'Einkauf',
  country: 'AT'
});

assert.equal(safeMerge.payload.hubspot_id, '987');
assert.match(safeMerge.payload.hubspot_url, /\/987$/);
assert.equal(safeMerge.payload.role, 'Einkauf');
assert.equal(safeMerge.payload.person, undefined);
assert.equal(safeMerge.payload.phone, undefined);
assert.equal(safeMerge.payload.company, undefined);
assert.equal(safeMerge.payload.email, undefined);
assert.equal(safeMerge.payload.country, undefined);
assert.deepEqual(safeMerge.conflicts.sort(), ['person', 'phone']);

const fillOnly = planHubSpotContactUpdate({
  hubspot_id: '123',
  hubspot_url: 'https://app.hubspot.com/contacts/147958987/contact/123',
  person: null,
  company: '',
  email: 'anna@example.com',
  phone: null,
  role: null,
  country: null
}, contact);

assert.equal(fillOnly.payload.person, 'Anna Muster');
assert.equal(fillOnly.payload.company, 'Example GmbH');
assert.equal(fillOnly.payload.phone, '+49 123');
assert.equal(fillOnly.payload.role, 'Einkauf');
assert.equal(fillOnly.payload.country, 'DE');
assert.equal(fillOnly.payload.email, undefined);
assert.deepEqual(fillOnly.conflicts, []);

const sourceRow = makeSourceRow({
  contactId: 42,
  email: ' ANNA@EXAMPLE.COM ',
  source: 'HubSpot',
  externalId: '123',
  externalUrl: 'https://example.test/123',
  seenAt: '2026-08-11T18:00:00.000Z'
});
assert.equal(sourceRow.contact_id, '42');
assert.equal(sourceRow.email, 'anna@example.com');
assert.equal(sourceRow.source, 'hubspot');
assert.equal(sourceRow.external_id, '123');

const deduped = dedupeSourceRows([
  sourceRow,
  { contact_id:'42', source:'hubspot', last_seen:'2026-08-11T19:00:00.000Z' }
]);
assert.equal(deduped.length, 1);
assert.equal(deduped[0].external_id, '123');
assert.equal(deduped[0].last_seen, '2026-08-11T19:00:00.000Z');

let postedBody = null;
const okResult = await upsertSourceRows({
  supabaseUrl: 'https://example.supabase.co',
  apiKey: 'key',
  bearerToken: 'token',
  rows: [sourceRow],
  fetchImpl: async (_url, options) => {
    postedBody = JSON.parse(options.body);
    return { ok:true, status:201, text:async()=>'' };
  }
});
assert.equal(okResult.available, true);
assert.equal(okResult.upserted, 1);
assert.equal(postedBody[0].source, 'hubspot');

const missingResult = await upsertSourceRows({
  supabaseUrl: 'https://example.supabase.co',
  apiKey: 'key',
  bearerToken: 'token',
  rows: [sourceRow],
  fetchImpl: async () => ({
    ok:false,
    status:404,
    text:async()=>'{"code":"PGRST205","message":"Could not find the table public.contact_sources"}'
  })
});
assert.equal(missingResult.available, false);
assert.equal(missingResult.upserted, 0);

const importedPairs=[];
for(let i=1;i<=27;i++){
  const email=`contact${i}@example.test`,company=`Company ${i} GmbH`;
  importedPairs.push({bitrix_id:`company-${i}`,email,person:company,company,vcard_kind:'org',phone:`+49 100${i}`});
  importedPairs.push({bitrix_id:`person-${i}`,email,person:`Person ${i}`,company,vcard_kind:'individual',role:'Purchasing'});
}
const bitrixResolved=resolveBitrixEmailGroups(importedPairs);
assert.equal(bitrixResolved.byEmail.size,27,'27 imported Company+Contact pairs must resolve to 27 unique emails');
assert.equal(bitrixResolved.resolvedDuplicates.length,27,'All Company+Contact duplicate groups should be safely collapsed');
assert.equal(bitrixResolved.unresolvedDuplicates.length,0,'Company+Contact pairs must not be treated as genuine duplicate people');
for(let i=1;i<=27;i++){
  const row=bitrixResolved.byEmail.get(`contact${i}@example.test`);
  assert.equal(row.bitrix_id,`person-${i}`,'Contact card must win over organization card');
  assert.equal(row.person,`Person ${i}`);
  assert.equal(row.phone,`+49 100${i}`,'Blank contact field may be safely filled from matching organization card');
}

const dangerousSharedEmail=resolveBitrixEmailGroups([
  {bitrix_id:'p-a',email:'info@shared.test',person:'Anna Example',company:'Shared GmbH',vcard_kind:'individual'},
  {bitrix_id:'p-b',email:'info@shared.test',person:'Ben Example',company:'Shared GmbH',vcard_kind:'individual'}
]);
assert.equal(dangerousSharedEmail.byEmail.size,0,'Two different people sharing an email must not be silently collapsed');
assert.equal(dangerousSharedEmail.unresolvedDuplicates.length,1,'True shared-email ambiguity must remain a hard-stop');

const samePersonCards=resolveBitrixEmailGroups([
  {bitrix_id:'old',email:'sales@example.test',person:'Maria Test',company:'Example AG',vcard_kind:'individual'},
  {bitrix_id:'rich',email:'sales@example.test',person:'Maria Test',company:'Example AG',role:'Sales',country:'CH',vcard_kind:'individual'}
]);
assert.equal(samePersonCards.unresolvedDuplicates.length,0);
assert.equal(samePersonCards.byEmail.get('sales@example.test').bitrix_id,'rich','Richer duplicate card for same person should be retained');

let serviceFetchCalled=false;
const serviceAccess=await resolveSupabaseWorkflowAccess({
  supabaseUrl:'https://example.supabase.co',
  serviceKey:'service-secret',
  syncEmail:'unused@example.test',
  syncPassword:'unused',
  fetchImpl:async()=>{serviceFetchCalled=true;throw new Error('service key should not authenticate through password');}
});
assert.equal(serviceAccess.authMode,'service_key');
assert.equal(serviceAccess.apiKey,'service-secret');
assert.equal(serviceAccess.bearerToken,'service-secret');
assert.equal(serviceFetchCalled,false,'Service-key auth must not call password auth');

let authRequest=null;
const userAccess=await resolveSupabaseWorkflowAccess({
  supabaseUrl:'https://example.supabase.co',
  serviceKey:'',
  syncEmail:'sync@example.test',
  syncPassword:'sync-password',
  fetchImpl:async(url,options)=>{
    authRequest={url,options};
    return{ok:true,status:200,text:async()=>JSON.stringify({access_token:'user-access-token'})};
  }
});
assert.equal(userAccess.authMode,'pppp_sync_account');
assert.equal(userAccess.bearerToken,'user-access-token');
assert(userAccess.apiKey&&userAccess.apiKey!=='user-access-token','PPPP auth must use the public API key plus user bearer token');
assert.match(authRequest.url,/\/auth\/v1\/token\?grant_type=password$/);
assert.equal(JSON.parse(authRequest.options.body).email,'sync@example.test');
await assert.rejects(
  ()=>resolveSupabaseWorkflowAccess({supabaseUrl:'https://example.supabase.co',serviceKey:'',syncEmail:'',syncPassword:'',fetchImpl:async()=>{throw new Error('should not fetch');}}),
  /No Supabase service key or PPPP sync account/,
  'Workflow auth must fail closed when no credential path exists'
);

execFileSync(process.execPath, ['--check', 'scripts/hubspot-contact-provenance.mjs']);
execFileSync(process.execPath, ['--check', 'scripts/bitrix-contact-email-resolver.mjs']);
execFileSync(process.execPath, ['--check', 'scripts/bitrix-pppp-sync.mjs']);
execFileSync(process.execPath, ['--check', 'scripts/bitrix-contact-provenance.mjs']);
execFileSync(process.execPath, ['--check', 'scripts/contact-provenance-common.mjs']);
execFileSync(process.execPath, ['--check', 'scripts/supabase-workflow-auth.mjs']);
execFileSync(process.execPath, ['--check', 'scripts/invoice-payment-task-sync.mjs']);
execFileSync(process.execPath, ['--check', 'scripts/won-execution-bootstrap.mjs']);

const deal = mapHubSpotDeal({
  id: '456',
  properties: {
    dealname: 'Airbus H24X',
    amount: '125000.50',
    dealstage: 'appointmentscheduled',
    closedate: '2026-09-15T00:00:00.000Z',
    description: 'Steel package'
  }
});

assert.equal(deal.hs_object_id, '456');
assert.equal(deal.dealname, 'Airbus H24X');
assert.equal(deal.amount, 125000.5);
assert.equal(deal.closedate, '2026-09-15');
assert.deepEqual(Object.keys(deal).sort(), [
  'amount', 'closedate', 'dealname', 'dealstage', 'description', 'hs_object_id'
].sort());

console.log('HubSpot/Bitrix sync mapping, contact safety, provenance and workflow auth smoke test passed.');
