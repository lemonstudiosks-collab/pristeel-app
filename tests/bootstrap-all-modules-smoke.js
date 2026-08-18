const fs = require('fs');
const assert = require('assert');
const { execFileSync } = require('child_process');

const bootstrap = fs.readFileSync('pristeel-project-emails.js','utf8');
const matches = [...bootstrap.matchAll(/['"]([^'"]+\.js)\?v=[^'"]+['"]/g)].map(m => m[1]);
assert(matches.length > 40, 'Bootstrap module list was not parsed correctly');
assert.strictEqual(new Set(matches).size, matches.length, 'Bootstrap contains duplicate module entries');

for (const file of matches) {
  assert(fs.existsSync(file), `Bootstrap references missing module: ${file}`);
  execFileSync(process.execPath, ['--check', file], { stdio:'pipe' });
}

const required = [
  'pristeel-business-command-center-v1.js',
  'pristeel-business-command-center-deep-gmail-v1.js',
  'pristeel-search-stable-v2.js',
  'pristeel-gmail-live-inbox-v2.js',
  'pristeel-gmail-intake-v3.js',
  'pristeel-email-full-body-v1.js',
  'pristeel-drive-import.js',
  'pristeel-project-data-integrity-v1.js',
  'pristeel-project-load-stability-v2.js',
  'pristeel-project-state-contract-v1.js',
  'pristeel-project-command-view-v1.js',
  'pristeel-project-drive-lifecycle-v1.js',
  'pristeel-rfq-no-bom-v1.js',
  'pristeel-workflow-governance-v1.js',
  'pristeel-quote-followup-governance-v1.js',
  'pristeel-offer-project-status-sync-v1.js',
  'pristeel-project-first-v2.js',
  'pristeel-email-offer-intake-v1.js',
  'pristeel-email-offer-intake-ui-fix-v1.js',
  'pristeel-project-first-execution-v1.js',
  'pristeel-project-first-actions-v1.js',
  'pristeel-supplier-capability-manager-v1.js',
  'pristeel-project-first-commercial-v1.js',
  'pristeel-project-file-upload-v1.js',
  'pristeel-project-contacts-full-v1.js',
  'pristeel-contacts-provenance-ui-v1.js',
  'pristeel-home-command-center-v2.js',
  'pristeel-home-live-fix-v1.js',
  'pristeel-home-stability-v2.js',
  'pristeel-redesign-finalizer-v1.js',
  'pristeel-commercial-navigation-fix-v1.js'
];
required.forEach(file => assert(matches.includes(file), `Critical module missing from bootstrap: ${file}`));

assert(
  matches.indexOf('pristeel-project-state-contract-v1.js') > matches.indexOf('pristeel-project-load-stability-v2.js') &&
  matches.indexOf('pristeel-project-state-contract-v1.js') < matches.indexOf('pristeel-project-integrity-ui-v1.js'),
  'Project state contract must load after the bounded loader and before project workspace renderers'
);
assert(
  matches.indexOf('pristeel-contacts-provenance-ui-v1.js') > matches.indexOf('pristeel-project-contacts-full-v1.js'),
  'Contacts provenance UI should load after the existing contacts module'
);

const contactsUi = fs.readFileSync('pristeel-contacts-provenance-ui-v1.js','utf8');
assert(contactsUi.includes('contact_sources?select='), 'Contacts provenance UI must read contact_sources');
assert(contactsUi.includes("source==='bitrix24'"), 'Contacts provenance UI must understand Bitrix24');
assert(contactsUi.includes("source==='hubspot'"), 'Contacts provenance UI must understand HubSpot');
assert(contactsUi.includes('clearLegacyHubspot'), 'Contacts provenance UI must neutralize the old HubSpot-only filter');
assert(!/supaFetch\([^\n]*(?:POST|PATCH|DELETE)/.test(contactsUi), 'Contacts provenance UI must stay read-only for contact master data');

const retired = [
  'pristeel-gmail-intake-v2.js',
  'pristeel-gmail-create-project-fix-v1.js',
  'pristeel-gmail-live-inbox-v1.js'
];
retired.forEach(file => assert(!matches.includes(file), `Retired overlapping stability module still loaded: ${file}`));

assert(bootstrap.includes('timeoutMs=8000,maxAttempts=2'), 'Ordered bootstrap must bound a hung module and retry once');
assert(bootstrap.includes('__pstBootstrapDiagnostics'), 'Ordered bootstrap must expose diagnostics for timeout/error recovery');
assert(bootstrap.includes("el.remove()"), 'Timed-out module element must be removed before retry/continuation');

console.log(`Bootstrap coverage smoke test passed for ${matches.length} modules, including canonical project state protection.`);
require('./bootstrap-timeout-safety-smoke.js');
require('./project-discovery-runtime-smoke.js');
require('./project-state-contract-smoke.js');
require('./project-commercial-breakdown-smoke.js');
