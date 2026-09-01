const fs = require('fs');
function fail(m){ console.error('NATIVE UI V3 SMOKE ERROR:',m); process.exitCode=1; }
function must(cond,m){ if(!cond) fail(m); }
const roles=fs.readFileSync('pristeel-roles.js','utf8');
const entry=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
const core=fs.readFileSync('pristeel-native-ui-v3-core.js','utf8');
const manifest=JSON.parse(fs.readFileSync('runtime-manifest.json','utf8'));
const nativeNeedle='pristeel-native-ui-v3.js?v=20260901-1';
const nativeAt=roles.indexOf(nativeNeedle);
const projectEmailsAt=roles.indexOf('pristeel-project-emails.js');
must(nativeAt>=0,'roles loader does not reference native UI v3');
must(projectEmailsAt>=0,'roles loader does not reference project-emails bootstrap');
must(nativeAt<projectEmailsAt,'native UI must be loaded before project-emails bootstrap');
must(roles.includes(':not(.pst-native-ui-ready) #page-workspace-home.active'),'startup Home reveal does not recognize early native UI readiness');
for(const token of ['#365565','#7899AA','#87A191','#C5A066','#F5F7F7','#DDE5E8']) must(core.includes(token),`soft palette token missing from core: ${token}`);
must(!core.includes('#1E3A8A')&&!core.includes('#3B82F6'),'old high-saturation blue palette remains in native core');
must(core.includes('border-top:2px solid'),'soft line-based card treatment is missing');
for(const selector of ['#fin-hub-grid>div[onclick*="finSwitchTab"]','.pst-pm-row','.pst-pm-btn.primary','#page-workspace-project .pf2-card','#pst-pcw-ted-sales-link']) must(core.includes(selector),`real runtime selector missing from core: ${selector}`);
must(core.includes("r.id='pst-native-home-v3'"),'native Home single owner is missing');
must(core.includes("document.documentElement.classList.add('pst-native-ui-ready')"),'early UI readiness marker missing');
must(entry.includes('pristeel-native-ui-v3-core.js?v=20260901-softperf1'),'entry does not load fast soft native UI core');
must(entry.includes('installRecoveryGate'),'early recovery gate is missing');
must(entry.includes('__pstOriginalRecoverUnsavedWork'),'recovery gate does not preserve original recovery action');
must(!entry.includes('window.confirm'),'entry must never monkeypatch or invoke browser confirm');
must(entry.includes('directRoute'),'primary sidebar does not have a direct fast route');
must(entry.includes('stopImmediatePropagation'),'fast sidebar route does not suppress slower duplicate routing');
must(entry.includes("tenders:'Opportunities'")&&entry.includes("projects:'Projects'")&&entry.includes("contacts:'Partners'")&&entry.includes("finance:'Finance'")&&entry.includes("apps:'System'"),'English canonical nav labels missing');
must(entry.includes('Ask the platform about any project'),'English Ask PPPP normalization missing');
must(entry.includes('PPPP found unfinished work'),'English recovery banner missing');
must(core.includes('Date.now()-homeState.loadedAt<60000'),'Home cache is not using the 60-second fast-path');
must(!core.includes('[0,300,1000,2500,5000]'),'legacy five-pass Home refresh loop remains');
must(!core.includes('burst(document)'),'whole-document translation burst remains');
must(!core.includes("document.addEventListener('click'"),'core still runs a global click cleanup listener');
for(const src of [entry,core]){
  must(!/\bnew\s+MutationObserver\s*\(/.test(src),'MutationObserver instance is forbidden in presentation UI');
  must(!/\bsetInterval\s*\(/.test(src),'setInterval polling is forbidden in presentation UI');
  for(const method of ['PATCH','PUT','DELETE']){
    const re=new RegExp(`supaFetch\\s*\\([^)]*['\"]${method}['\"]`,'i');
    must(!re.test(src),`${method} business-data write is forbidden in presentation UI`);
  }
}
const dyn=(manifest.dynamicRuntime||[]).find(x=>x.module==='pristeel-native-ui-v3.js');
must(!!dyn,'native UI entry is not registered in runtime manifest');
must(dyn&&dyn.loader==='pristeel-roles.js','native UI runtime loader must be pristeel-roles.js');
must(manifest.entrypoints.bootstrapLoaderGitBlobSha==='3e4c3ac88bef313fb2a37ca229770326d8ad55cb','manifest loader SHA does not match audited roles blob');
must(manifest.entrypoints.bootstrapGitBlobSha==='427a685acf45c47db68e8c38a11a595748aaed86','manifest bootstrap SHA does not match production bootstrap');
if(!process.exitCode) console.log('Native UI v3 soft performance smoke OK.');
