const fs=require('fs');
const assert=require('assert');
const source=fs.readFileSync('pristeel-home-command-center-v2.js','utf8');
const canonical=fs.readFileSync('pristeel-home-canonical-v1.js','utf8');

assert(!/MutationObserver|setInterval\s*\(/.test(source),'Home workdesk must remain event-driven');
assert(source.includes("t.textContent='Fillo këtu'"),'Missing primary starting point');
assert(source.includes('Radha ime e punës'),'Missing work queue');
assert(source.includes("pt.textContent='Projektet aktive'"),'Missing active-project lane');
assert(source.includes("box.dataset.pstOpen='0'"),'Waiting must default to collapsed');
assert(source.includes('.pst-ws-quick{display:none!important}'),'Quick tile strip must not compete with the work queue');
assert(canonical.includes("function blocksHomeAction(p){return explicitWaiting(p);}"),'Only explicit waiting may suppress canonical Home actions');
assert(canonical.includes("return out.slice(0,5)"),'Canonical Home must cap the action lane at five projects');
assert(canonical.includes('var occupied={}'),'Canonical project derivation must exclude projects already used by action/wait lanes');
console.log('Home workdesk layout/source guard passed.');
