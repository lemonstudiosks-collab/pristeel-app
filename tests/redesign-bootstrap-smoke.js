const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('pristeel-project-emails.js', 'utf8');
const requiredExact = [
  'pristeel-login-brand-v1.js?v=20260807-1',
  'pristeel-login-transition-v2.js?v=20260807-1',
  'pristeel-ui-corrections-v2.js?v=20260807-10',
  'pristeel-dashboard-task-cards-v1.js?v=20260807-10',
  'pristeel-business-command-center-v1.js?v=20260807-10',
  'pristeel-gmail-deep-search-v1.js?v=20260807-10',
  'pristeel-business-command-center-deep-gmail-v1.js?v=20260807-10',
  'pristeel-project-command-view-v1.js?v=20260807-10',
  'pristeel-home-command-center-v2.js?v=20260807-12',
  'pristeel-redesign-finalizer-v1.js?v=20260807-10',
  'pristeel-home-live-fix-v1.js?v=20260807-1',
  'pristeel-home-visual-cleanup-v1.js?v=20260807-1'
];

requiredExact.forEach(entry => {
  assert(source.includes(entry), `${entry} is missing from the current redesign bootstrap`);
});

const loginBrandPos=source.indexOf('pristeel-login-brand-v1.js?v=20260807-1');
const loginTransitionPos=source.indexOf('pristeel-login-transition-v2.js?v=20260807-1');
const homePos=source.indexOf('pristeel-home-command-center-v2.js?v=20260807-12');
const cleanupPos=source.indexOf('pristeel-home-visual-cleanup-v1.js?v=20260807-1');
assert(loginBrandPos>=0&&loginTransitionPos>loginBrandPos,'Login transition must load after the login brand layer');
assert(homePos>=0&&cleanupPos>homePos,'Home visual cleanup must load after the Home command center');
assert(source.includes("document.dispatchEvent(new CustomEvent('pst:modules-ready'))"), 'Bootstrap readiness event is missing');
assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source), 'Bootstrap must not poll or observe the platform');

console.log('Redesign bootstrap contract smoke test passed.');
