const fs = require('fs');
function fail(m){ console.error('NATIVE UI V4 SMOKE ERROR:',m); process.exitCode=1; }
function must(cond,m){ if(!cond) fail(m); }
const roles=fs.readFileSync('pristeel-roles.js','utf8');
const entry=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
const core=fs.readFileSync('pristeel-native-ui-v4-core.js','utf8');
const workspace=fs.readFileSync('pristeel-workspace-architecture-v1.js','utf8');
const projectsModern=fs.readFileSync('pristeel-projects-modern-v1.js','utf8');
const primaryNav=fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');
const manifest=JSON.parse(fs.readFileSync('runtime-manifest.json','utf8'));
const nativeNeedle='pristeel-native-ui-v3.js?v=20260911-fullredesign1';
const nativeAt=roles.indexOf(nativeNeedle);
const projectEmailsAt=roles.indexOf('pristeel-project-emails.js');
must(nativeAt>=0,'roles loader does not reference native UI compatibility entry');
must(projectEmailsAt>=0,'roles loader does not reference project-emails bootstrap');
must(nativeAt<projectEmailsAt,'native UI must be loaded before project-emails bootstrap');
must(roles.includes(':not(.pst-native-ui-ready) #page-workspace-home.active'),'startup Home reveal does not recognize early native UI readiness');
for(const token of ['#4F97AF','#3F7F98','#F7F6F3','#E6E3DE']) must(core.includes(token),`PriSteel soft palette token missing from v4 core: ${token}`);
for(const token of ['QENDRA E DREJTIMIT PPPP','Rrjedha e ditës','Pulsi i biznesit','Projekte aktive','Mundësi','Ballina','p.sh. Çfarë po ndodh me STACON?']) must(core.includes(token),`source-level Albanian UI token missing: ${token}`);
must(core.includes("r.id='pst-native-home-v4'"),'native Home v4 single owner is missing');
must(core.includes("document.documentElement.classList.add('pst-native-ui-ready','pst-native-ui-v4-ready')"),'early UI readiness marker missing');
must(entry.includes('pristeel-native-ui-v4-core.js?v=20260911-fullredesign1'),'entry does not load the current Albanian native UI core');
must(entry.includes('installRecoveryGate'),'early recovery gate is missing');
must(entry.includes('Never enter the shared workspace router'),'Finance capture is not isolated from decorated workspace routing');
must(entry.includes('__pstOriginalRecoverUnsavedWork'),'recovery gate does not preserve original recovery action');
must(!entry.includes('window.confirm'),'entry must never monkeypatch or invoke browser confirm');
must(entry.includes('PPPP gjeti punë të pambyllur'),'Albanian recovery banner missing');
must(!entry.includes("'Mundësitë':'Opportunities'"),'entry must never translate Albanian navigation back to English');
must(!core.includes("'Mundësitë':'Opportunities'"),'core must never translate Albanian navigation back to English');

// First-paint Home geometry must already match the operational four-zone owner.
must(entry.includes("home.setAttribute('data-pst-font-lock','1')"),'Home typography is not locked against late readability resizing');
must(entry.includes('html.pst-native-ui-v4-ready #page-workspace-home #pst-native-home-v4 .pn-head p{font-size:14px!important'),'Home subtitle does not have a stable first-paint size');
must(entry.includes('html.pst-native-ui-v4-ready #page-workspace-home #pst-native-home-v4 .pn-kicker{font-size:12px!important'),'Home kicker does not have a stable first-paint size');
must(entry.includes('.pn-ask-slot{min-height:64px!important'),'Home command slot is not compact at first paint');
must(entry.includes('.pst-live-command-shell{position:relative!important;min-height:64px!important;height:auto!important'),'Home command shell is not compact/expandable');
for(const token of ['.pn-work-grid{gap:12px!important;margin-bottom:12px!important}', '.pn-panel>header{padding:12px 13px!important}', '.pn-work-row{min-height:58px!important', '.pn-pulse{min-height:66px!important']) must(entry.includes(token),`Operational Home first-paint token missing: ${token}`);

// + Krijo has exactly one structural owner. Native/readability layers may style it,
// but may not snapshot, destroy or repair its DOM.
must(workspace.includes('function createControlMarkup()'),'+ Krijo canonical markup factory missing from workspace owner');
must(workspace.includes("data-pst-create-owner','workspace-v1'"),'+ Krijo owner marker missing');
must(workspace.includes('window.PSTWorkspaceCreateControlV1={owner:\'pristeel-workspace-architecture-v1\''),'+ Krijo public ownership contract missing');
must(workspace.includes('if(window.__pstWorkspaceArchitectureV1SystemContract2Loaded)return;'),'workspace runtime upgrade guard is missing');
must(!workspace.includes('if(window.__pstWorkspaceArchitectureV1Loaded)return;'),'legacy workspace guard must not suppress the System renderer upgrade');
must(workspace.includes('width="16" height="16" aria-hidden="true" focusable="false"'),'+ Krijo SVG dimensions are not owned by component markup');
must(workspace.includes('aria-haspopup="menu"')&&workspace.includes('aria-expanded="false"'),'+ Krijo accessibility contract missing');
for(const type of ['project','offer','invoice','task']) must(workspace.includes(`item('${type}'`),`+ Krijo missing canonical option: ${type}`);
must(!entry.includes('snapshotCreateControl'),'v3 must not snapshot + Krijo for later repair');
must(!entry.includes('repairCreateControl'),'v3 must not repair + Krijo after another owner destroys it');
must(!core.includes("create.textContent='+"),'Home owner must not destroy + Krijo canonical children');

// Four daily operating zones replace analytic/noisy Home cards.
for(const token of ['PËR TY TANI','MË PAS','NË PRITJE','pn-portfolio-pulse','KËRKON VËMENDJE']) must(core.includes(token),`Home operational zone missing: ${token}`);
for(const retired of ['pn-kpis','pn-clients-movement','pn-projects-commercial','pn-fin-auto-balance','pn-donut','pn-funnel']) must(!core.includes(retired),`Retired analytical Home surface returned: ${retired}`);
must(core.includes("if(blockers.length)exceptions.push")&&core.includes("if(issues>0)exceptions.push"),'Exception zone is not value-driven');
must(core.includes("else{ex.hidden=true;ex.innerHTML='';}"),'Zero-value exception zone must disappear completely');
for(const icon of ['project:','action:','clock:','target:','finance:','warning:','execution:','waiting:']) must(core.includes(icon),`Unified operational icon family missing: ${icon}`);

// Application-shell geometry remains stable.
must(entry.includes('.sidebar{width:204px!important;min-width:204px!important;max-width:204px!important}'),'canonical desktop sidebar width is not 204px');
must(entry.includes('#pst-v2-sidebar{width:204px!important;min-width:204px!important;max-width:204px!important}'),'sidebar host width is not locked to 204px');
must(entry.includes('Pyet PPPP për një projekt…'),'Home command copy overpromises beyond the supported project-data scope');
must(entry.includes('max-width:1360px!important'),'Home content width is not balanced');

must(core.includes('homeRouteContext'),'Home surfaces must resolve a destination context before navigation');
must(core.includes("filter='due'")&&core.includes("filter='review'")&&core.includes("area='outreach'"),'Home opportunity and reminder routes must preserve exact work subsets');
must(core.includes("p.openFinance(filter||'')")&&core.includes("p.openOpportunities(filter||'')"),'Home filters must be forwarded to terminal page owners');
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
must(manifest.entrypoints.bootstrapLoaderGitBlobSha==='311a4594f0305ddc8e670d25c1a85ccc103ce19e','manifest loader SHA does not match audited roles blob');
must(manifest.entrypoints.bootstrapGitBlobSha==='33923c761378c233afd003b23a7aaf5a20daeabd','manifest bootstrap SHA does not match production bootstrap');
if(!process.exitCode) console.log('Native UI v4 structural create + four-zone Home smoke OK.');
