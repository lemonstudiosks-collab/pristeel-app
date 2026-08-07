const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('pristeel-project-emails.js', 'utf8');
const required = [
  'pristeel-login-brand-v1.js',
  'pristeel-login-transition-v2.js',
  'pristeel-ui-corrections-v2.js',
  'pristeel-dashboard-task-cards-v1.js',
  'pristeel-business-command-center-v1.js',
  'pristeel-gmail-deep-search-v1.js',
  'pristeel-business-command-center-deep-gmail-v1.js',
  'pristeel-search-stable-v2.js',
  'pristeel-project-command-view-v1.js',
  'pristeel-home-command-center-v2.js',
  'pristeel-home-live-fix-v1.js',
  'pristeel-home-stability-v2.js',
  'pristeel-home-visual-cleanup-v1.js',
  'pristeel-gmail-live-inbox-v2.js',
  'pristeel-gmail-intake-v3.js',
  'pristeel-project-load-stability-v2.js',
  'pristeel-rfq-stability-v2.js',
  'pristeel-offer-pricing-stability-v2.js',
  'pristeel-our-offer-stability-v2.js',
  'pristeel-finance-stability-v2.js',
  'pristeel-document-center-stable-v2.js',
  'pristeel-modal-navigation-safety-v2.js',
  'pristeel-redesign-finalizer-v1.js'
];

required.forEach(entry => {
  assert(source.includes(entry), `${entry} is missing from the current redesign bootstrap`);
});

[
  'pristeel-gmail-intake-create-project-fix-v1.js',
  'pristeel-gmail-live-inbox-v1.js',
  'pristeel-document-center-v2.js'
].forEach(entry=>assert(!source.includes(entry),`${entry} is retired and must not return to the bootstrap`));

const searchPos=source.indexOf('pristeel-search-stable-v2.js');
const homePos=source.indexOf('pristeel-home-command-center-v2.js');
const livePos=source.indexOf('pristeel-home-live-fix-v1.js');
const stabilityPos=source.indexOf('pristeel-home-stability-v2.js');
const cleanupPos=source.indexOf('pristeel-home-visual-cleanup-v1.js');
assert(searchPos>=0,'Stable search must be loaded');
assert(homePos>=0&&livePos>homePos,'Approved Home live layer must load after the Home command center');
assert(stabilityPos>livePos,'Home stability must load after the approved Home live layer');
assert(cleanupPos>stabilityPos,'Home visual cleanup must load after Home stability');
assert(source.includes("document.dispatchEvent(new CustomEvent('pst:modules-ready'))"), 'Bootstrap readiness event is missing');
assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source), 'Bootstrap must not poll or observe the platform');

console.log('Redesign bootstrap contract smoke test passed.');
