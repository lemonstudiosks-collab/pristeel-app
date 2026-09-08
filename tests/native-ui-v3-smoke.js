const fs = require('fs');
function fail(m){ console.error('NATIVE UI V4 SMOKE ERROR:',m); process.exitCode=1; }
function must(cond,m){ if(!cond) fail(m); }
const roles=fs.readFileSync('pristeel-roles.js','utf8');
const entry=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
const core=fs.readFileSync('pristeel-native-ui-v4-core.js','utf8');
const projectsModern=fs.readFileSync('pristeel-projects-modern-v1.js','utf8');
const primaryNav=fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');
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

// First-paint Home contract: these rules must already exist in the early owner,
// with specificity above late Home/readability decorators.
must(entry.includes("home.setAttribute('data-pst-font-lock','1')"),'Home typography is not locked against late readability resizing');
must(entry.includes('html.pst-native-ui-v4-ready #page-workspace-home #pst-native-home-v4 .pn-head p{font-size:14px!important'),'Home subtitle does not have a first-paint readable size');
must(entry.includes('html.pst-native-ui-v4-ready #page-workspace-home #pst-native-home-v4 .pn-kicker{font-size:12px!important'),'Home kicker does not have a first-paint readable size');
must(entry.includes('.pn-ask-slot{min-height:64px!important'),'Home command slot is not compact at first paint');
must(entry.includes('.pst-live-command-shell{position:relative!important;min-height:64px!important;height:auto!important'),'Home command shell is not compact/expandable');
must(entry.includes('.pn-kpi span{font-size:11.5px!important'),'Home KPI label does not use the stable first-paint size');
must(entry.includes('.pn-kpi small{font-size:10.5px!important'),'Home KPI helper does not use the stable first-paint size');

// Canonical create control must survive Native UI normalization without any
// automatic business-object creation.
must(entry.includes('snapshotCreateControl'),'canonical + Krijo markup is not preserved before Native UI apply');
must(entry.includes('repairCreateControl'),'canonical + Krijo repair is missing');
must(entry.includes('installNativeUiApplyGuard'),'future Native UI apply calls are not guarded');
for(const type of ['project','offer','invoice','task'])must(entry.includes(`pstWsCreate(\\'${type}\\')`),`+ Krijo missing canonical option: ${type}`);
must(entry.includes('aria-haspopup="menu"'),'+ Krijo is missing dropdown accessibility contract');

// Application-shell geometry is owned here according to runtime-manifest.json.
must(entry.includes('.sidebar{width:204px!important;min-width:204px!important;max-width:204px!important}'),'canonical desktop sidebar width is not 204px');
must(entry.includes('#pst-v2-sidebar{width:204px!important;min-width:204px!important;max-width:204px!important}'),'sidebar host width is not locked to 204px');

// Copy and spacing are intentionally applied after the stable geometry contract.
must(entry.includes('Pyet PPPP për një projekt…'),'Home command copy overpromises beyond the supported project-data scope');
must(entry.includes('max-width:1360px!important'),'Home content width is not balanced');
must(entry.includes('.pn-grid{gap:10px!important;margin-bottom:10px!important}'),'Home micro-spacing contract missing');

must(core.includes('homeRouteContext'),'Home cards must resolve a destination context before navigation');
must(core.includes("filter='due'")&&core.includes("filter='review'")&&core.includes("area='outreach'"),'Home opportunity and follow-up cards must route to their exact work subset');
must(core.includes("p.openFinance(filter||'')")&&core.includes("p.openOpportunities(filter||'')"),'Home filters must be forwarded to the terminal page owners');
must(projectsModern.includes('operationalGroup')&&projectsModern.includes("state.operational=value"),'Project cards must open the requested operational subset');
must(projectsModern.includes("state.search=value")&&projectsModern.includes("value=\"'+esc(state.search)+'\""),'Client cards must open Projects with the client search visibly retained');
must(primaryNav.includes("window.pstProjectsModernOpen(filter||'')")&&primaryNav.includes('openFinance(filter)'),'Primary navigation must pass Home context to Projects and Finance');
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
must(manifest.entrypoints.bootstrapGitBlobSha==='5f40652c18a283309d9020d3a06824e979429411','manifest bootstrap SHA does not match production bootstrap');
if(!process.exitCode) console.log('Native UI v4 Albanian single-owner smoke OK.');