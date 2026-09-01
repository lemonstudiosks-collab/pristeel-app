const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'qa-artifacts', 'native-ui-v3');
fs.mkdirSync(outDir, { recursive: true });

const projects = [
  {id:'p1',name:'STACON — Execution package',client:'STACON',status:'aktiv',pipeline_stage:'execution',operational_state:'execution',last_activity_at:'2026-09-01T10:00:00Z',last_email_at:'2026-09-01T09:30:00Z',updated_at:'2026-09-01T10:00:00Z'},
  {id:'p2',name:'SSP — Pole package',client:'SSP',status:'aktiv',pipeline_stage:'offer',operational_state:'action required',last_activity_at:'2026-08-31T15:00:00Z',last_email_at:'2026-08-31T14:00:00Z',updated_at:'2026-08-31T15:00:00Z'},
  {id:'p3',name:'SPIE / TENNET',client:'SPIE',status:'aktiv',pipeline_stage:'follow-up',operational_state:'waiting',last_activity_at:'2026-08-30T12:00:00Z',last_email_at:'2026-08-30T12:00:00Z',updated_at:'2026-08-30T12:00:00Z'},
  {id:'p4',name:'Archived sample',client:'Old Client',status:'humbur',pipeline_stage:'lost',operational_state:'closed',updated_at:'2026-08-20T12:00:00Z'}
];
const actions = [
  {id:'a1',project_id:'p2',project_name:'SSP — Pole package',client:'SSP',title:'Answer supplier clarification',detail:'Confirm technical dimensions',due_date:'2026-09-02',priority:'high',status:'confirmed',source:'email',created_at:'2026-09-01T09:00:00Z'},
  {id:'a2',project_id:'p2',project_name:'SSP — Pole package',client:'SSP',title:'Review supplier offer',detail:'Commercial comparison',due_date:'2026-09-03',priority:'medium',status:'confirmed',source:'offer',created_at:'2026-08-31T09:00:00Z'}
];
const invoicesOut = [{id:'io1',invoice_nr:'INV-001',client:'Client A',date:'2026-07-01',due_date:'2026-07-31',gross_amount:41000,paid:false,project:'STACON',project_id:'p1'}];
const invoicesIn = [{id:'ii1',supplier_invoice_nr:'SUP-001',supplier:'Supplier A',date:'2026-07-05',due_date:'2026-08-05',amount:12000,paid:false,project:'STACON',project_id:'p1'}];
const opportunities = [
  {id:'t1',title:'EU steel package',operating_lane:'review',status:'review',project_id:null,deadline:'2026-09-05'},
  {id:'t2',title:'Promoted opportunity',operating_lane:'promoted',status:'promoted',project_id:'p1',deadline:'2026-09-10'}
];
const outreach = [{id:'o1',status:'follow-up',follow_up_date:'2026-08-31',closed:false,replied:false,meeting:false,updated_at:'2026-08-30T10:00:00Z'}];

function fixtureFor(url) {
  const u = new URL(url);
  const p = u.pathname;
  if (p.includes('/rest/v1/projects')) return projects;
  if (p.includes('/rest/v1/pppp_home_current_actions_v1')) return actions;
  if (p.includes('/rest/v1/invoices_out')) return invoicesOut;
  if (p.includes('/rest/v1/invoices_in')) return invoicesIn;
  if (p.includes('/rest/v1/pppp_tender_operating_lanes_v1')) return opportunities;
  if (p.includes('/rest/v1/outreach_contacts')) return outreach;
  if (p.includes('/rest/v1/user_roles')) return [{user_id:'preview-user',email:'preview@pristeel.test',role:'admin',full_name:'Preview Admin'}];
  if (p.includes('/rest/v1/rpc/pppp_automation_health_v1')) return [{pppp_automation_health_v1:{issue_count:2,ocr_pending:1,semantic_pending:0,drive_missing_count:1}}];
  if (p.includes('/rest/v1/')) return [];
  if (p.includes('/functions/v1/')) return {};
  return null;
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const pageErrors = [];
  const confirmCalls = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('dialog', async d => { confirmCalls.push(d.message()); await d.dismiss(); });

  await page.route('**/*', async route => {
    const url = route.request().url();
    if (/isymxqfqzkchbsrbhucf\.supabase\.co/.test(url)) {
      const fixture = fixtureFor(url);
      if (fixture !== null) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture), headers: {'access-control-allow-origin':'*'} });
        return;
      }
    }
    try { await route.continue(); } catch (_) {}
  });

  await page.addInitScript(() => {
    const payload = btoa(JSON.stringify({email:'preview@pristeel.test',sub:'preview-user',exp:4000000000})).replace(/=/g,'');
    localStorage.setItem('pristeel_session', JSON.stringify({access_token:'x.'+payload+'.x',refresh_token:'preview',expires_at:Date.now()+86400000,email:'preview@pristeel.test'}));
    localStorage.setItem('pristeel_unsaved_browser_preview', JSON.stringify({path:'projects?id=eq.p1',method:'PATCH',body:{preview:true},at:new Date().toISOString()}));
  });

  await page.goto('http://127.0.0.1:4173/pristeel-procurement.html', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => typeof window.startApp === 'function', null, {timeout:30000});
  await page.evaluate(() => {
    const shell = document.getElementById('app-shell-root');
    if (shell && getComputedStyle(shell).display === 'none') window.startApp();
  });

  await page.waitForSelector('#pst-native-home-v3', { state:'visible', timeout:30000 });
  await page.waitForFunction(() => window.PSTNativeUiV3 && /^stable-/.test(window.PSTNativeUiV3.version || ''), null, {timeout:30000});
  await page.waitForFunction(() => {
    const k = document.querySelector('#pn-kpis .pn-kpi b');
    return k && k.textContent.trim() !== '—';
  }, null, {timeout:30000});

  const home = await page.locator('#pst-native-home-v3').innerText();
  assert(home.includes('PPPP COMMAND CENTER'), 'Command Center heading is missing');
  assert(home.includes('Active projects'), 'Home KPI did not render');
  assert(home.includes('Priority actions'), 'Priority actions did not render');
  assert(home.includes('Financial attention'), 'Finance attention did not render');
  assert.strictEqual(await page.locator('#pst-native-home-v3').count(), 1, 'Duplicate native Home owner');
  assert.strictEqual(await page.locator('#pst-native-home-v3 .pst-live-command-shell').count(), 1, 'Ask PPPP command shell was not adopted exactly once');
  assert.strictEqual(await page.locator('#pst-ws-canonical-nav').count(), 1, 'Canonical sidebar navigation is not singular');
  assert.strictEqual(await page.locator('#pst-native-sidebar-v3').count(), 0, 'A duplicate native sidebar was created');
  const legacyDisplay = await page.locator('#pst-project-control-home-v2').evaluate(el => getComputedStyle(el).display).catch(() => 'missing');
  assert(legacyDisplay === 'none' || legacyDisplay === 'missing', 'Legacy Home owner remains visible');
  const visibleBody = await page.locator('body').innerText();
  for (const term of ['Mirëmbrëma','Mundësitë','Projektet','Financat','Sistemi']) {
    assert(!visibleBody.includes(term), 'Visible legacy Albanian label remains: '+term);
  }

  await page.evaluate(() => window.recoverUnsavedWork());
  await page.waitForSelector('#pst-ui-recovery-clean', { state:'visible', timeout:5000 });
  assert.strictEqual(confirmCalls.length, 0, 'Legacy confirm() recovery dialog was triggered');
  const recoveryText = await page.locator('#pst-ui-recovery-clean').innerText();
  assert(recoveryText.includes('PPPP found unfinished work'), 'Clean recovery notice missing');
  await page.locator('#pst-ui-recovery-clean [data-rec="later"]').click();
  await page.evaluate(() => window.recoverUnsavedWork());
  await page.waitForTimeout(250);
  assert.strictEqual(await page.locator('#pst-ui-recovery-clean').count(), 0, 'Recovery notice repeated after Keep for later');
  assert.strictEqual(confirmCalls.length, 0, 'Legacy recovery confirm repeated after deferral');

  await screenshot(page, '01-home-command-center.png');

  const surfaces = [
    ['projects', '02-projects.png'],
    ['tenders', '03-opportunities.png'],
    ['finance', '04-finance.png'],
    ['apps', '05-system.png']
  ];
  for (const [key, file] of surfaces) {
    const button = page.locator('#pst-ws-canonical-nav .pst-ws-navbtn[data-key="'+key+'"]');
    assert(await button.count(), 'Missing canonical navigation button: '+key);
    await button.first().click();
    await page.waitForTimeout(1200);
    await screenshot(page, file);
    const text = await page.locator('body').innerText();
    assert(!/\b(Mundësitë|Projektet|Financat|Sistemi)\b/.test(text), 'Visible Albanian navigation/module label after '+key+' navigation');
  }

  const canOpenProject = await page.evaluate(() => typeof window.pstOpenProjectWorkspace === 'function');
  assert(canOpenProject, 'Project workspace entry point is unavailable');
  await page.evaluate(() => window.pstOpenProjectWorkspace('p1'));
  await page.waitForTimeout(1800);
  await screenshot(page, '06-project-detail.png');

  const result = {
    nativeVersion: await page.evaluate(() => window.PSTNativeUiV3 && window.PSTNativeUiV3.version),
    commandCenterOwners: await page.locator('#pst-native-home-v3').count(),
    canonicalNavOwners: await page.locator('#pst-ws-canonical-nav').count(),
    duplicateNativeSidebars: await page.locator('#pst-native-sidebar-v3').count(),
    recoveryDialogs: confirmCalls.length,
    pageErrors: pageErrors.slice(0,20)
  };
  fs.writeFileSync(path.join(outDir, 'browser-verification.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})().catch(err => {
  console.error(err && err.stack || err);
  process.exit(1);
});