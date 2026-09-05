const fs = require('fs');
function fail(m){ console.error('NATIVE UI V4 SMOKE ERROR:',m); process.exitCode=1; }
function must(cond,m){ if(!cond) fail(m); }
const roles=fs.readFileSync('pristeel-roles.js','utf8');
const entry=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
const core=fs.readFileSync('pristeel-native-ui-v4-core.js','utf8');
const manifest=JSON.parse(fs.readFileSync('runtime-manifest.json','utf8'));
const nativeNeedle='pristeel-native-ui-v3.js?v=20260905-finance-terminal1';
const nativeAt=roles.indexOf(nativeNeedle);
const projectEmailsAt=roles.indexOf('pristeel-project-emails.js');
must(nativeAt>=0,'roles loader does not reference native UI compatibility entry');
must(projectEmailsAt>=0,'roles loader does not reference project-emails bootstrap');
must(nativeAt<projectEmailsAt,'native UI must be loaded before project-emails bootstrap');
must(roles.includes(':not(.pst-native-ui-ready) #page-workspace-home.active'),'startup Home reveal does not recognize early native UI readiness');
for(const token of ['#4F97AF','#3F7F98','#F7F6F3','#E6E3DE']) must(core.includes(token),`PriSteel soft palette token missing from v4 core: ${token}`);
for(const token of ['QENDRA E DREJTIMIT PPPP','Pasqyra operative','Projekte aktive','Mundësi të hapura','Veprime prioritare','Kryefaqja','p.sh. Çfarë po ndodh me STACON?']) must(core.includes(token),`source-level Albanian UI token missing: ${token}`);
must(core.includes("r.id='pst-native-home-v4'"),'native Home v4 single owner is missing');
must(core.includes("document.documentElement.classList.add('pst-native-ui-ready','pst-native-ui-v4-ready')"),'early UI readiness marker missing');
must(entry.includes('pristeel-native-ui-v4-core.js?v=20260903-singleowner1'),'entry does not load the current Albanian native UI core');
must(entry.includes('installRecoveryGate'),'early recovery gate is missing');
must(entry.includes('Never enter the shared workspace router'),'Finance capture is not isolated from decorated workspace routing');
must(entry.includes('__pstOriginalRecoverUnsavedWork'),'recovery gate does not preserve original recovery action');
must(!entry.includes('window.confirm'),'entry must never monkeypatch or invoke browser confirm');
must(entry.includes('PPPP gjeti punë të pambyllur'),'Albanian recovery banner missing');
must(!entry.includes("'Mundësitë':'Opportunities'"),'entry must never translate Albanian navigation back to English');
must(!core.includes("'Mundësitë':'Opportunities'"),'core must never translate Albanian navigation back to English');
for(const src of [entry,core]){
  must(!/\bnew\s+MutationObserver\s*\(/.test(src),'MutationObserver instance is forbidden in presentation UI');
  must(!/\bsetInterval\s*\(/.test(src),'setInterval polling is forbidden in presentation UI');
  for(const method of ['PATCH','PUT','DELETE']){
    const re=new RegExp(`supaFetch\\s*\\([^)]*['\"]${method}['\"]`,'i');
    must(!re.test(src),`${method} business-data write is forbidden in presentation UI`);
  }
}
const dyn=(manifest.dynamicRuntime||[]).find(x=>x.module==='pristeel-native-ui-v3.js');
must(!!dyn,'native UI compatibility entry is not registered in runtime manifest');
must(dyn&&dyn.loader==='pristeel-roles.js','native UI runtime loader must remain pristeel-roles.js');
must(manifest.entrypoints.bootstrapLoaderGitBlobSha==='6110ccff0e59b96f0c3ceec8a8ff27de3d504204','manifest loader SHA does not match audited roles blob');
must(manifest.entrypoints.bootstrapGitBlobSha==='7be6c5167e46328a1ec3e9f242d5343ed06d0b86','manifest bootstrap SHA does not match production bootstrap');
if(!process.exitCode) console.log('Native UI v4 Albanian single-owner smoke OK.');
