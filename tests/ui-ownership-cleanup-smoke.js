const fs=require('fs');
const entry=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
const core=fs.readFileSync('pristeel-native-ui-v4-core.js','utf8');
const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
function must(x,m){if(!x){console.error('UI OWNERSHIP CLEANUP SMOKE ERROR:',m);process.exitCode=1;}}
must(entry.includes('installRecoveryGate'),'startup recovery gate missing');
must(!entry.includes('window.confirm'),'browser confirm must not be used by ownership cleanup');
must(entry.includes('PPPP gjeti punë të pambyllur'),'single Albanian recovery banner missing');
must(entry.includes('pristeel-native-ui-v4-core.js?v=20260903-singleowner1'),'compatibility entry must load v4 core');
must(!entry.includes('installWarmEarthTheme'),'retired warm-earth presentation owner must not return');
must(!entry.includes("'Mundësitë':'Opportunities'"),'entry must not translate Albanian back to English');
must(!core.includes("'Mundësitë':'Opportunities'"),'v4 core must not translate Albanian back to English');
for(const token of ['Kryefaqja','Mundësitë','Projektet','Partnerët','Financat','Sistemi','PYET PPPP','Pyet platformën për çdo projekt']) must(core.includes(token),`Albanian visible UI token missing: ${token}`);
must(core.includes("p.dataset.pstHomeOwner='native-v4'"),'v4 core must claim the visible Home owner');
must(finalizer.includes("document.getElementById('pst-native-home-v4')||document.getElementById('pst-native-home-v3')"),'finalizer must prefer the native visible Home owner');
must(!finalizer.includes("page.dataset.pstHomeOwner='project-control-v2'"),'project-control Home must never reclaim visible ownership');
for(const src of [entry,core]){
  must(!/new\s+MutationObserver\s*\(/.test(src),'MutationObserver forbidden');
  must(!/setInterval\s*\(/.test(src),'setInterval forbidden');
}
if(!process.exitCode)console.log('UI ownership cleanup Albanian single-owner smoke OK.');
