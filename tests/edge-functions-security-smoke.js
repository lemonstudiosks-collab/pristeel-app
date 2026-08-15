const fs=require('fs');
const assert=require('assert');

const gmail=fs.readFileSync('supabase/functions/gmail-tracker/index.ts','utf8');
const hubspot=fs.readFileSync('supabase/functions/hubspot-sync/index.ts','utf8');
const gh=fs.readFileSync('supabase/functions/github-deploy/index.ts','utf8');

// gmail-tracker: custom cron auth + conservative RFQ matching + terminal lifecycle guard.
assert.ok(gmail.includes('gmail_tracker_cron_authorized'),'gmail-tracker must validate the Vault-backed cron secret');
assert.ok(gmail.includes('x-pppp-cron-secret'),'gmail-tracker must require the internal cron header');
assert.ok(gmail.includes('urn:ietf:params:oauth:grant-type:jwt-bearer'),'Google service-account grant type must remain valid');
assert.ok(!gmail.includes('urn:ietf:params:oauth2:grant-type:jwt-bearer'),'invalid OAuth grant type must not return');
assert.ok(gmail.includes('function normalizeSubject'),'RFQ reply detection must normalize subjects');
assert.ok(gmail.includes('r.normalizedSubject === incomingSubject'),'RFQ reply detection must require a subject match');
assert.ok(gmail.includes('Date.parse(r.sent_at) <= atMs'),'RFQ reply detection must reject messages older than the RFQ');
assert.ok(gmail.includes('.is("replied_at", null)'),'reply detection must not overwrite an existing reply timestamp');
assert.ok(gmail.includes('scan_preview'),'a no-write reply preview path must remain available');
for(const terminal of ['humbur','arkivuar','mbyllur','realizuar']){
  assert.ok(gmail.includes(`"${terminal}"`),`SLA guard must keep terminal status ${terminal}`);
}

// hubspot-sync: server-side token may only be exercised behind Vault cron auth.
assert.ok(hubspot.includes('hubspot_sync_cron_authorized'),'hubspot-sync must validate the Vault-backed cron secret');
assert.ok(hubspot.includes('x-pppp-cron-secret'),'hubspot-sync must require the internal cron header');
assert.ok(hubspot.includes('if (!(await cronAuthorized(req)))'),'hubspot-sync must reject before any action is processed');
assert.ok(hubspot.includes('status = 200'),'hubspot response helper contract changed unexpectedly');

// github-deploy: intentionally retired. Do not restore direct main mutation from an Edge Function.
assert.ok(gh.includes('github-deploy is retired'),'github-deploy must remain retired');
assert.ok(gh.includes('status: 410'),'retired github-deploy must not silently act like a live endpoint');
assert.ok(!gh.includes('GITHUB_TOKEN'),'retired github-deploy must not consume a GitHub credential');
assert.ok(!gh.includes('method: "PUT"'),'retired github-deploy must not write repository files');
assert.ok(!gh.includes('method: "DELETE"'),'retired github-deploy must not delete repository files');
assert.ok(!gh.includes('putFile('),'retired github-deploy mutation helper must not return');

console.log('Edge Functions security smoke: OK');
