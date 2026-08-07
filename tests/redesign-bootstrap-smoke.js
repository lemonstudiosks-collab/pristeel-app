const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('pristeel-project-emails.js', 'utf8');
const version = '20260807-10';
const required = [
  'pristeel-ui-corrections-v2.js',
  'pristeel-dashboard-task-cards-v1.js',
  'pristeel-business-command-center-v1.js',
  'pristeel-gmail-deep-search-v1.js',
  'pristeel-business-command-center-deep-gmail-v1.js',
  'pristeel-project-command-view-v1.js',
  'pristeel-home-command-center-v2.js',
  'pristeel-redesign-finalizer-v1.js'
];

required.forEach(file => {
  assert(
    source.includes(`${file}?v=${version}`),
    `${file} is missing from the current versioned redesign bootstrap`
  );
});

const positions = required.map(file => source.indexOf(`${file}?v=${version}`));
assert(positions.every(pos => pos >= 0), 'One or more redesign modules are absent');
assert(
  positions[positions.length - 1] > positions[positions.length - 2],
  'Redesign finalizer must load after the Home command center'
);
assert(source.includes("document.dispatchEvent(new CustomEvent('pst:modules-ready'))"), 'Bootstrap readiness event is missing');
assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source), 'Bootstrap must not poll or observe the platform');

console.log('Redesign bootstrap contract smoke test passed.');
