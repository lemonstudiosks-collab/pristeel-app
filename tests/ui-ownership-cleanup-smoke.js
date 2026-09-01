const fs=require('fs');
const entry=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
function must(x,m){if(!x){console.error('UI OWNERSHIP CLEANUP SMOKE ERROR:',m);process.exitCode=1;}}
must(entry.includes('installRecoveryGate'),'startup recovery gate missing');
must(!entry.includes('window.confirm'),'browser confirm must not be used by ownership cleanup');
must(entry.includes('PPPP found unfinished work'),'single English recovery banner missing');
must(entry.includes("'Mundësitë':'Opportunities'")&&entry.includes("'Projektet':'Projects'")&&entry.includes("'Partnerët':'Partners'")&&entry.includes("'Financat':'Finance'")&&entry.includes("'Sistemi':'System'"),'visible sidebar translations missing');
must(entry.includes("'PYET PPPP':'ASK PPPP'")&&entry.includes('Ask the platform about any project'),'Ask PPPP cleanup missing');
must(entry.includes('border-top:2px solid var(--pst-soft-blue)'),'Ask PPPP soft line treatment missing');
must(entry.includes('directRoute')&&entry.includes('stopImmediatePropagation'),'fast direct sidebar routing missing');
must(!entry.includes('[0,100,350,900,1700,5200]'),'legacy six-pass cleanup loop remains');
must(!/new\s+MutationObserver\s*\(/.test(entry),'MutationObserver forbidden');
must(!/setInterval\s*\(/.test(entry),'setInterval forbidden');
if(!process.exitCode)console.log('UI ownership cleanup soft performance smoke OK.');
