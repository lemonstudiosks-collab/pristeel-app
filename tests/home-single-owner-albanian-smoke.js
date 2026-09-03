const fs=require('fs');
const assert=require('assert');
const entry=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
const core=fs.readFileSync('pristeel-native-ui-v4-core.js','utf8');
const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');

assert(core.includes("p.dataset.pstHomeOwner='native-v4'"),'Native v4 must own visible Home');
assert(core.includes('QENDRA E DREJTIMIT PPPP')&&core.includes('Pasqyra operative'),'Visible Home must be authored in Albanian');
assert(core.includes('Kryefaqja')&&core.includes('Mundësitë')&&core.includes('Projektet')&&core.includes('Partnerët')&&core.includes('Financat')&&core.includes('Sistemi'),'Sidebar must be authored in Albanian');
assert(!entry.includes("'Mundësitë':'Opportunities'"),'Early entry must not reverse Albanian to English');
assert(!core.includes("'Mundësitë':'Opportunities'"),'Visible Home owner must not reverse Albanian to English');
assert(!core.includes('function burst('),'Delayed translation burst must remain retired');
assert(!/\[0,80,250,700,1500\]/.test(core),'Old delayed language rewrite schedule must remain retired');
assert(finalizer.includes("document.getElementById('pst-native-home-v4')||document.getElementById('pst-native-home-v3')"),'Finalizer must claim native Home, not project-control Home');
assert(!finalizer.includes("page.dataset.pstHomeOwner='project-control-v2'"),'Project-control Home must not regain ownership');
console.log('Home single-owner Albanian regression smoke passed.');
