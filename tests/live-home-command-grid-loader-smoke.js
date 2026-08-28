const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('pristeel-project-emails.js', 'utf8');
const finalizer = src.indexOf("pristeel-redesign-finalizer-v1.js?v=20260828-sourcelink1");
const legacy = src.indexOf("pristeel-project-workflow-legacy-capture-v1.js?v=20260822-flow2");
const tender = src.indexOf("pristeel-tender-priority-actions-v1.js?v=20260827-ux1");
const home = src.indexOf("pristeel-home-operating-grid-v1.js?v=20260823-homegrid2");
const classification = src.indexOf("pristeel-project-classification-v1.js?v=20260827-ux1");
const nav = src.indexOf("pristeel-primary-nav-resilience-v1.js?v=20260827-singleowner1");

assert.ok(finalizer >= 0, 'Redesign finalizer cache key was not bumped for the current runtime ownership release');
assert.ok(legacy >= 0 && tender > legacy, 'Tender priority must load after all legacy workflow layers');
assert.ok(home > tender, 'Home operating grid must load after tender priority actions');
assert.ok(classification > home, 'Project classification must load after the Home grid');
assert.ok(nav > classification, 'Primary navigation resilience must be the final bootstrap module');

const tail = src.slice(legacy, src.indexOf('];', legacy));
assert.ok(!tail.includes('pristeel-home-live-fix-v1.js'), 'No legacy Home layer may load after the command grid');
assert.ok(!tail.includes('pristeel-home-stability-v2.js'), 'No legacy Home stability layer may load after the command grid');

console.log('Live Home command grid loader smoke: OK');
