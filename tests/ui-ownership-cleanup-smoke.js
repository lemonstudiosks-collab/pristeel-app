const fs=require('fs');
const entry=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
function must(x,m){if(!x){console.error('UI OWNERSHIP CLEANUP SMOKE ERROR:',m);process.exitCode=1;}}
must(entry.includes('installRecoveryGate'),'startup recovery gate missing');
must(!entry.includes('window.confirm'),'browser confirm must not be used by ownership cleanup');
must(entry.includes('PPPP found unfinished work'),'single English recovery banner missing');
must(entry.includes("'Mundësitë':'Opportunities'")&&entry.includes("'Projektet':'Projects'")&&entry.includes("'Partnerët':'Partners'")&&entry.includes("'Financat':'Finance'")&&entry.includes("'Sistemi':'System'"),'visible sidebar translations missing');
must(entry.includes("'PYET PPPP':'ASK PPPP'")&&entry.includes('Ask the platform about any project'),'Ask PPPP cleanup missing');
must(entry.includes("background:#FCFBF9!important;border:1px solid #E4DFD7!important;border-left:3px solid #806E5A!important"),'Ask PPPP soft off-white/taupe treatment missing');
for(const token of ['#F7F5F1','#FCFBF9','#E4DFD7','#806E5A','#7F9299']) must(entry.includes(token),`soft earth palette token missing from entry: ${token}`);
must(entry.includes('installWarmEarthTheme'),'warm earth theme installer missing');
must(!/new\s+MutationObserver\s*\(/.test(entry),'MutationObserver forbidden');
must(!/setInterval\s*\(/.test(entry),'setInterval forbidden');
if(!process.exitCode)console.log('UI ownership cleanup smoke OK.');
