const fs=require('fs');
const entry=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
function must(x,m){if(!x){console.error('UI OWNERSHIP CLEANUP SMOKE ERROR:',m);process.exitCode=1;}}
must(entry.includes('installRecoveryGate'),'startup recovery gate missing');
must(!entry.includes('window.confirm'),'browser confirm must not be used by ownership cleanup');
must(entry.includes('PPPP found unfinished work'),'single English recovery banner missing');
must(entry.includes("'Mundësitë':'Opportunities'")&&entry.includes("'Projektet':'Projects'")&&entry.includes("'Partnerët':'Partners'")&&entry.includes("'Financat':'Finance'")&&entry.includes("'Sistemi':'System'"),'visible sidebar translations missing');
must(entry.includes("'PYET PPPP':'ASK PPPP'")&&entry.includes('Ask the platform about any project'),'Ask PPPP cleanup missing');
must(entry.includes("background:#FBFAF7!important;border:1px solid #DED8CC!important;border-left:3px solid #B08A57!important"),'Ask PPPP warm off-white/ochre treatment missing');
for(const token of ['#F4F1EA','#FBFAF7','#DED8CC','#B08A57','#6E8793']) must(entry.includes(token),`warm earth palette token missing from entry: ${token}`);
must(entry.includes('installWarmEarthTheme'),'warm earth theme installer missing');
must(!/new\s+MutationObserver\s*\(/.test(entry),'MutationObserver forbidden');
must(!/setInterval\s*\(/.test(entry),'setInterval forbidden');
if(!process.exitCode)console.log('UI ownership cleanup smoke OK.');