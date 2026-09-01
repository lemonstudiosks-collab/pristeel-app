const fs = require('fs');
function fail(m){ console.error('NATIVE UI V3 SMOKE ERROR:',m); process.exitCode=1; }
function must(cond,m){ if(!cond) fail(m); }
const roles=fs.readFileSync('pristeel-roles.js','utf8');
const ui=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
const manifest=JSON.parse(fs.readFileSync('runtime-manifest.json','utf8'));
const nativeNeedle='pristeel-native-ui-v3.js?v=20260901-1';
const nativeAt=roles.indexOf(nativeNeedle);
const projectEmailsAt=roles.indexOf('pristeel-project-emails.js');
must(nativeAt>=0,'roles loader does not reference native UI v3');
must(projectEmailsAt>=0,'roles loader does not reference project-emails bootstrap');
must(nativeAt<projectEmailsAt,'native UI must be loaded before project-emails bootstrap');
must(roles.includes(':not(.pst-native-ui-ready) #page-workspace-home.active'), 'startup Home reveal does not recognize early native UI readiness');
for(const token of ['#1E3A8A','#3B82F6','#F7F8FA','#E5E7EB']) must(ui.includes(token),`approved palette token missing: ${token}`);
for(const selector of ['#fin-hub-grid>div[onclick*="finSwitchTab"]','.pst-pm-row','.pst-pm-btn.primary','#page-workspace-project .pf2-card','#pst-pcw-ted-sales-link']) must(ui.includes(selector),`real runtime selector missing: ${selector}`);
must(ui.includes("r.id='pst-native-home-v3'"),'native Home single owner is missing');
must(ui.includes("document.documentElement.classList.add('pst-native-ui-ready')"),'early UI readiness marker missing');
must(!/\bnew\s+MutationObserver\s*\(/.test(ui),'MutationObserver instance is forbidden in the presentation owner');
must(!/\bsetInterval\s*\(/.test(ui),'setInterval polling is forbidden in the presentation owner');
for(const method of ['PATCH','PUT','DELETE']){
  const re=new RegExp(`supaFetch\\s*\\([^)]*['\"]${method}['\"]`,'i');
  must(!re.test(ui),`${method} business-data write is forbidden in the presentation owner`);
}
const dyn=(manifest.dynamicRuntime||[]).find(x=>x.module==='pristeel-native-ui-v3.js');
must(!!dyn,'native UI is not registered in runtime manifest');
must(dyn && dyn.loader==='pristeel-roles.js','native UI runtime loader must be pristeel-roles.js');
must(manifest.entrypoints.bootstrapLoaderGitBlobSha==='3e4c3ac88bef313fb2a37ca229770326d8ad55cb','manifest loader SHA does not match audited roles blob');
must(manifest.entrypoints.bootstrapGitBlobSha==='427a685acf45c47db68e8c38a11a595748aaed86','manifest bootstrap SHA does not match rollback production bootstrap');
if(!process.exitCode) console.log('Native UI v3 smoke OK.');