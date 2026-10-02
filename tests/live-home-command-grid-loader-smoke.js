const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('pristeel-project-emails.js', 'utf8');
const workspace = src.indexOf("pristeel-workspace-architecture-v1.js?v=");
const legacy = src.indexOf("pristeel-project-workflow-legacy-capture-v1.js?v=");
const tender = src.indexOf("pristeel-tender-priority-actions-v1.js?v=");
const homeGrid = src.indexOf("pristeel-home-operating-grid-v1.js?v=");
const classification = src.indexOf("pristeel-project-classification-v1.js?v=");
const nav = src.indexOf("pristeel-primary-nav-resilience-v1.js?v=");
const operator = src.indexOf("pristeel-home-operator-dashboard-v1.js?v=");
const launcher = src.indexOf("pristeel-home-launcher-v4.js?v=");
const stability = src.indexOf("pristeel-ui-runtime-stability-v1.js?v=");

assert.ok(workspace >= 0 && launcher > workspace, 'Final Home launcher must mount immediately after the workspace shell becomes available');
assert.ok(legacy > launcher, 'Legacy workflow/Home-compatible layers must load after the final launcher has claimed first paint');
assert.ok(tender > legacy, 'Tender priority must load after legacy workflow capture');
assert.ok(homeGrid > tender, 'Home operating grid must load after tender priority actions');
assert.ok(classification > homeGrid, 'Project classification must load after the Home grid');
assert.ok(nav > classification, 'Primary navigation resilience must load after project classification');
assert.ok(operator > nav, 'Home operator compatibility layer must load after navigation');
assert.ok(operator > launcher, 'Operator dashboard remains compatibility-only and must not become the first visible Home');
assert.ok(stability > operator, 'Runtime stability observer must load after compatibility Home layers settle');

console.log('Live Home command grid loader smoke: OK');
