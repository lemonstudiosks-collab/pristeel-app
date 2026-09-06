import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const SITE_URL=process.env.PPPP_LIVE_URL||'https://lemonstudiosks-collab.github.io/pristeel-app/';
const SB_URL=process.env.SUPABASE_URL||'https://isymxqfqzkchbsrbhucf.supabase.co';
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const PROJECT_ID='fc96208d-356c-410a-a356-96ce9e9b4d2f';
const CANDIDATE_URL=process.env.CANDIDATE_URL||'';
const OUT=process.env.PROBE_OUT||'tmp/evosys-live-ui-probe';

await fs.mkdir(OUT,{recursive:true});
const report={
  site:SITE_URL,project_id:PROJECT_ID,candidate_intercept:!!CANDIDATE_URL,
  auth_mode:'one-time-admin-generated-magiclink',started_at:new Date().toISOString(),
  ok:false,checks:{},diagnostics:{},errors:[]
};
if(!SERVICE_KEY){
  report.errors.push('No configured Supabase privileged key was exposed to this workflow');
  report.finished_at=new Date().toISOString();
  await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({ok:false,errors:report.errors},null,2));
  process.exit(1);
}

async function httpJson(url,options={}){
  const r=await fetch(url,options);let body=null;
  try{body=await r.json();}catch{body=null;}
  if(!r.ok){const err=new Error(`HTTP ${r.status} for ${new URL(url).pathname}`);err.status=r.status;err.body=body;throw err;}
  return body;
}
function svcHeaders(extra={}){return {...extra,apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`};}
async function selectOperator(){
  const roles=await httpJson(`${SB_URL}/rest/v1/user_roles?select=user_id,role&role=in.(admin,sales,procurement,finance)`,{headers:svcHeaders()});
  const allowed=new Map((Array.isArray(roles)?roles:[]).map(r=>[String(r.user_id),String(r.role||'viewer')]));
  if(!allowed.size)throw new Error('No write-capable PPPP role is available for live verification');
  const data=await httpJson(`${SB_URL}/auth/v1/admin/users?page=1&per_page=1000`,{headers:svcHeaders()});
  const users=Array.isArray(data?.users)?data.users:[];
  const eligible=users.filter(u=>u?.id&&u?.email&&allowed.has(String(u.id))&&u.email_confirmed_at);
  eligible.sort((a,b)=>Date.parse(b.last_sign_in_at||0)-Date.parse(a.last_sign_in_at||0));
  if(!eligible.length)throw new Error('No confirmed write-capable PPPP user is available for live verification');
  return {id:String(eligible[0].id),email:String(eligible[0].email),role:allowed.get(String(eligible[0].id))};
}
async function createUserSession(operator){
  const link=await httpJson(`${SB_URL}/auth/v1/admin/generate_link`,{
    method:'POST',headers:svcHeaders({'Content-Type':'application/json'}),body:JSON.stringify({type:'magiclink',email:operator.email})
  });
  if(!link?.hashed_token)throw new Error('Supabase did not return a hashed magic-link token');
  const variants=[link.verification_type||'magiclink','email'];let last=null;
  for(const type of [...new Set(variants)]){
    try{
      const session=await httpJson(`${SB_URL}/auth/v1/verify`,{
        method:'POST',headers:{apikey:SERVICE_KEY,'Content-Type':'application/json'},body:JSON.stringify({type,token_hash:link.hashed_token})
      });
      if(session?.access_token&&session?.refresh_token)return session;last=new Error('Verification response had no session');
    }catch(e){last=e;}
  }
  if(link.email_otp){
    try{
      const session=await httpJson(`${SB_URL}/auth/v1/verify`,{
        method:'POST',headers:{apikey:SERVICE_KEY,'Content-Type':'application/json'},body:JSON.stringify({type:'email',email:operator.email,token:link.email_otp})
      });
      if(session?.access_token&&session?.refresh_token)return session;
    }catch(e){last=e;}
  }
  throw last||new Error('Unable to create one-time authenticated PPPP session');
}
async function rows(pathname){const v=await httpJson(`${SB_URL}/rest/v1/${pathname}`,{headers:svcHeaders()});return Array.isArray(v)?v:[];}
async function businessCounts(){
  const [offers,decisions]=await Promise.all([
    rows(`offers?project_id=eq.${PROJECT_ID}&origin=eq.manual&select=id`),
    rows(`project_supplier_decisions?project_id=eq.${PROJECT_ID}&status=eq.active&select=id`)
  ]);
  return {manual_offers:offers.length,active_supplier_decisions:decisions.length};
}
async function snapshot(page,name){
  await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true}).catch(()=>{});
  const text=await page.locator('body').innerText().catch(()=> '');
  await fs.writeFile(path.join(OUT,name+'.txt'),String(text).slice(0,30000));
}

let browser,page;
try{
  const operator=await selectOperator();report.operator_role=operator.role;
  const session=await createUserSession(operator);
  const before=await businessCounts();report.before=before;

  let candidateSource='';
  if(CANDIDATE_URL){
    const r=await fetch(CANDIDATE_URL,{headers:{'Cache-Control':'no-cache'}});
    if(!r.ok)throw new Error(`Candidate source fetch failed: HTTP ${r.status}`);
    candidateSource=await r.text();
    if(!candidateSource.includes('PSTManualSupplierOfferV1'))throw new Error('Candidate source is not the manual supplier module');
  }

  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1600,height:1000}});
  page=await context.newPage();
  const consoleErrors=[];
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text().slice(0,500));});
  page.on('pageerror',e=>consoleErrors.push(`pageerror: ${String(e.message||e).slice(0,500)}`));
  if(candidateSource){
    await page.route('**/pristeel-manual-supplier-offer-v1.js*',async route=>{
      await route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:candidateSource,headers:{'cache-control':'no-store'}});
    });
  }

  await page.goto(SITE_URL,{waitUntil:'domcontentloaded',timeout:60000});
  const appSession={...session,expires_at:Date.now()+Math.max(60,Number(session.expires_in||3600))*1000};
  await page.evaluate(s=>localStorage.setItem('pristeel_session',JSON.stringify(s)),appSession);
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{
    const gate=document.getElementById('auth-gate'),root=document.getElementById('app-shell-root');
    return !!root&&getComputedStyle(root).display!=='none'&&(!gate||getComputedStyle(gate).display==='none');
  },{timeout:60000});
  report.checks.authenticated_ui=true;report.final_url=page.url().split('#')[0];
  await snapshot(page,'00-authenticated-home');

  const projectsNav=page.locator('.pst-ws-navbtn[data-key="projects"]').first();
  await projectsNav.waitFor({state:'visible',timeout:90000});
  report.checks.projects_nav_visible=true;
  await projectsNav.click();
  const search=page.locator('#pst-ws-project-search');
  await search.waitFor({state:'visible',timeout:60000});
  const filter=page.locator('#pst-ws-project-filter');
  if(await filter.count())await filter.selectOption('all');
  await search.fill('Evosys');
  await page.waitForTimeout(600);
  const evosysRow=page.locator('#pst-ws-project-list tr').filter({hasText:/Evosys/i}).first();
  await evosysRow.waitFor({state:'visible',timeout:60000});
  report.checks.evosys_row_visible=true;
  report.evosys_row_text=(await evosysRow.innerText()).replace(/\s+/g,' ').trim().slice(0,500);
  await snapshot(page,'01-projects-evosys-row');
  await evosysRow.click();
  await page.waitForSelector('#page-workspace-project.active',{state:'visible',timeout:60000});
  await page.waitForFunction(id=>String(window.__pstCurrentProjectId||window._curProjId||'')===id,{timeout:60000},PROJECT_ID);
  report.checks.evosys_open=true;
  await snapshot(page,'02-evosys-project-open');

  const area=page.locator('.pwf-area-btn[data-pwf-area="procurement"]').first();
  await area.waitFor({state:'visible',timeout:60000});
  await area.click();
  const stage=page.locator('.pwf-stage[data-pwf-stage="offers"]').first();
  await stage.waitFor({state:'visible',timeout:60000});
  await stage.click();
  await page.waitForFunction(()=>{
    const p=document.getElementById('page-workspace-project');
    return p&&p.getAttribute('data-pwf-area')==='procurement'&&p.getAttribute('data-pwf-stage')==='offers';
  },{timeout:30000});
  await page.waitForTimeout(1800);
  report.checks.supplier_offer_stage=true;

  report.diagnostics=await page.evaluate(()=>{
    const p=document.getElementById('page-workspace-project'),body=document.getElementById('pst-pi-body');
    const buttons=[...document.querySelectorAll('[data-mso-open]')].map(b=>({text:(b.textContent||'').trim(),disabled:!!b.disabled,display:getComputedStyle(b).display,visibility:getComputedStyle(b).visibility,pointerEvents:getComputedStyle(b).pointerEvents,rect:(()=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};})()}));
    const scripts=[...document.scripts].filter(s=>String(s.src).includes('manual-supplier-offer')).map(s=>s.src);
    const relevant=[...document.querySelectorAll('button,article,section,div')].filter(x=>/(furnitor|prodhues|manual)/i.test((x.textContent||''))&&x.getBoundingClientRect().width>0&&x.getBoundingClientRect().height>0).slice(0,40).map(x=>({tag:x.tagName,cls:x.className||'',text:(x.textContent||'').replace(/\s+/g,' ').trim().slice(0,500)}));
    return {page_area:p?.getAttribute('data-pwf-area')||'',page_stage:p?.getAttribute('data-pwf-stage')||'',module_flag:!!window.__pstManualSupplierOfferV1,module_api:!!window.PSTManualSupplierOfferV1,loader_flag:!!window.__pstManualSupplierOfferLoaderV1,button_count:buttons.length,buttons,scripts,relevant,body_text:(body?.textContent||'').replace(/\s+/g,' ').trim().slice(0,3000)};
  });
  report.console_errors=consoleErrors.slice(0,30);
  await snapshot(page,'03-evosys-offers-before-click');

  const btn=page.locator('[data-mso-open]').first();
  const count=await btn.count();report.checks.manual_action_present=count>0;
  if(!count)throw new Error('Live EVOSYS supplier-offer stage has no [data-mso-open] action');
  report.checks.manual_action_visible=await btn.isVisible();report.checks.manual_action_enabled=await btn.isEnabled();
  const box=await btn.boundingBox();
  if(box)report.hit_target=await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y);return el?{tag:el.tagName,cls:el.className||'',text:(el.textContent||'').trim().slice(0,200)}:null;},{x:box.x+box.width/2,y:box.y+box.height/2});

  await btn.click({timeout:10000});
  const modal=page.locator('#pst-mso-modal');let modalVisible=false;
  try{await modal.waitFor({state:'visible',timeout:5000});modalVisible=true;}catch{}
  report.checks.click_opened_modal=modalVisible;
  if(modalVisible){report.modal_title=(await page.locator('#pst-mso-title').textContent())?.trim()||'';await snapshot(page,'04-evosys-modal-open');}
  else{await snapshot(page,'04-evosys-after-click-no-modal');throw new Error('Live click did not open #pst-mso-modal');}

  const afterClick=await businessCounts();report.after_click=afterClick;
  report.checks.no_offer_created=afterClick.manual_offers===before.manual_offers;
  report.checks.no_supplier_selected=afterClick.active_supplier_decisions===before.active_supplier_decisions;
  if(!report.checks.no_offer_created||!report.checks.no_supplier_selected)throw new Error('Live click changed protected business state');

  await page.locator('[data-mso-close]').first().click();await page.waitForTimeout(300);
  const afterClose=await businessCounts();report.after_close=afterClose;
  report.checks.no_write_after_close=afterClose.manual_offers===before.manual_offers&&afterClose.active_supplier_decisions===before.active_supplier_decisions;
  if(!report.checks.no_write_after_close)throw new Error('Closing the modal changed protected business state');
  report.ok=true;
}catch(e){
  report.errors.push(String(e?.message||e));if(e?.status)report.http_status=e.status;
  if(page)await snapshot(page,'99-failure-state').catch(()=>{});
}finally{
  report.finished_at=new Date().toISOString();await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));if(browser)await browser.close();
}
console.log(JSON.stringify({ok:report.ok,checks:report.checks,errors:report.errors,diagnostics:{module_flag:report.diagnostics?.module_flag,module_api:report.diagnostics?.module_api,loader_flag:report.diagnostics?.loader_flag,button_count:report.diagnostics?.button_count,page_area:report.diagnostics?.page_area,page_stage:report.diagnostics?.page_stage},operator_role:report.operator_role,candidate_intercept:report.candidate_intercept},null,2));
if(!report.ok)process.exit(1);
