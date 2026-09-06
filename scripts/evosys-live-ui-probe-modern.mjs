import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const SITE=process.env.PPPP_LIVE_URL||'https://lemonstudiosks-collab.github.io/pristeel-app/';
const SB=process.env.SUPABASE_URL||'https://isymxqfqzkchbsrbhucf.supabase.co';
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const PID='fc96208d-356c-410a-a356-96ce9e9b4d2f';
const CANDIDATE=process.env.CANDIDATE_URL||'';
const OUT=process.env.PROBE_OUT||'tmp/evosys-live-ui-probe';
await fs.mkdir(OUT,{recursive:true});
const report={site:SITE,project_id:PID,candidate_intercept:!!CANDIDATE,started_at:new Date().toISOString(),ok:false,checks:{},diagnostics:{},errors:[]};

function headers(extra={}){return {...extra,apikey:KEY,Authorization:`Bearer ${KEY}`};}
async function json(url,opts={}){const r=await fetch(url,opts);let b=null;try{b=await r.json();}catch{}if(!r.ok)throw new Error(`HTTP ${r.status} ${new URL(url).pathname}`);return b;}
async function session(){
  if(!KEY)throw new Error('No configured Supabase privileged key');
  const roles=await json(`${SB}/rest/v1/user_roles?select=user_id,role&role=in.(admin,sales,procurement,finance)`,{headers:headers()});
  const map=new Map((roles||[]).map(x=>[String(x.user_id),String(x.role)]));
  const users=await json(`${SB}/auth/v1/admin/users?page=1&per_page=1000`,{headers:headers()});
  const list=(users?.users||[]).filter(u=>u?.id&&u?.email&&u.email_confirmed_at&&map.has(String(u.id))).sort((a,b)=>Date.parse(b.last_sign_in_at||0)-Date.parse(a.last_sign_in_at||0));
  if(!list.length)throw new Error('No confirmed write-capable PPPP user');
  const u=list[0];report.operator_role=map.get(String(u.id));
  const link=await json(`${SB}/auth/v1/admin/generate_link`,{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({type:'magiclink',email:u.email})});
  if(!link?.hashed_token)throw new Error('No magic-link token');
  for(const type of [...new Set([link.verification_type||'magiclink','email'])]){
    try{const s=await json(`${SB}/auth/v1/verify`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({type,token_hash:link.hashed_token})});if(s?.access_token&&s?.refresh_token)return s;}catch{}
  }
  throw new Error('Unable to create authenticated session');
}
async function counts(){
  const [o,d]=await Promise.all([
    json(`${SB}/rest/v1/offers?project_id=eq.${PID}&origin=eq.manual&select=id`,{headers:headers()}),
    json(`${SB}/rest/v1/project_supplier_decisions?project_id=eq.${PID}&status=eq.active&select=id`,{headers:headers()})
  ]);return{manual_offers:(o||[]).length,active_supplier_decisions:(d||[]).length};
}
async function snap(page,name){await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true}).catch(()=>{});const t=await page.locator('body').innerText().catch(()=> '');await fs.writeFile(path.join(OUT,name+'.txt'),String(t).slice(0,40000));}

let browser,page;
try{
  const s=await session();report.before=await counts();
  let candidate='';if(CANDIDATE){const r=await fetch(CANDIDATE,{headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw new Error(`Candidate fetch HTTP ${r.status}`);candidate=await r.text();if(!candidate.includes('PSTManualSupplierOfferV1'))throw new Error('Candidate is not manual supplier module');}
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1600,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e).slice(0,600)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,600));});
  if(candidate)await page.route('**/pristeel-manual-supplier-offer-v1.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:candidate,headers:{'cache-control':'no-store'}}));

  await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:60000});
  await page.evaluate(x=>localStorage.setItem('pristeel_session',JSON.stringify(x)),{...s,expires_at:Date.now()+Math.max(60,Number(s.expires_in||3600))*1000});
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{const g=document.getElementById('auth-gate'),r=document.getElementById('app-shell-root');return !!r&&getComputedStyle(r).display!=='none'&&(!g||getComputedStyle(g).display==='none');},{timeout:60000});
  report.checks.authenticated_ui=true;await snap(page,'00-authenticated-home');

  const nav=page.locator('.pst-ws-navbtn[data-key="projects"]').first();await nav.waitFor({state:'visible',timeout:90000});await nav.click();report.checks.projects_nav_clicked=true;
  const row=page.locator('.pst-pm-row[data-project-id="'+PID+'"]').first();await row.waitFor({state:'visible',timeout:90000});report.checks.evosys_row_visible=true;report.evosys_row_text=(await row.innerText()).replace(/\s+/g,' ').trim().slice(0,700);await snap(page,'01-projects-evosys-row');
  const open=row.locator('[data-pm-open="'+PID+'"]').first();await open.click();
  await page.waitForSelector('#page-workspace-project.active',{state:'visible',timeout:90000});
  await page.waitForFunction(id=>String(window.__pstCurrentProjectId||window._curProjId||'')===id,{timeout:90000},PID);report.checks.evosys_open=true;await snap(page,'02-evosys-project-open');

  const area=page.locator('.pwf-area-btn[data-pwf-area="procurement"]').first();await area.waitFor({state:'visible',timeout:90000});await area.click();report.checks.procurement_clicked=true;
  const stage=page.locator('.pwf-stage[data-pwf-stage="offers"]').first();await stage.waitFor({state:'visible',timeout:60000});await stage.click();
  await page.waitForFunction(()=>{const p=document.getElementById('page-workspace-project');return p?.getAttribute('data-pwf-area')==='procurement'&&p?.getAttribute('data-pwf-stage')==='offers';},{timeout:30000});await page.waitForTimeout(1800);report.checks.supplier_offer_stage=true;

  report.diagnostics=await page.evaluate(()=>{
    const p=document.getElementById('page-workspace-project'),body=document.getElementById('pst-pi-body');
    const bs=[...document.querySelectorAll('[data-mso-open]')].map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return{text:(b.textContent||'').trim(),disabled:!!b.disabled,display:s.display,visibility:s.visibility,pointerEvents:s.pointerEvents,rect:{x:r.x,y:r.y,w:r.width,h:r.height}};});
    const relevant=[...document.querySelectorAll('button,article,section,div')].filter(x=>/(furnitor|prodhues|manual)/i.test(x.textContent||'')&&x.getBoundingClientRect().width>0&&x.getBoundingClientRect().height>0).slice(0,60).map(x=>({tag:x.tagName,cls:x.className||'',text:(x.textContent||'').replace(/\s+/g,' ').trim().slice(0,700)}));
    return{page_area:p?.getAttribute('data-pwf-area')||'',page_stage:p?.getAttribute('data-pwf-stage')||'',module_flag:!!window.__pstManualSupplierOfferV1,module_api:!!window.PSTManualSupplierOfferV1,loader_flag:!!window.__pstManualSupplierOfferLoaderV1,buttons:bs,button_count:bs.length,scripts:[...document.scripts].filter(s=>String(s.src).includes('manual-supplier-offer')).map(s=>s.src),relevant,body_text:(body?.textContent||'').replace(/\s+/g,' ').trim().slice(0,5000)};
  });report.console_errors=errors.slice(0,40);await snap(page,'03-evosys-offers-before-click');

  const btn=page.locator('[data-mso-open]').first();report.checks.manual_action_present=(await btn.count())>0;if(!report.checks.manual_action_present)throw new Error('Live EVOSYS stage has no manual supplier action');
  report.checks.manual_action_visible=await btn.isVisible();report.checks.manual_action_enabled=await btn.isEnabled();const box=await btn.boundingBox();if(box)report.hit_target=await page.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);return e?{tag:e.tagName,cls:e.className||'',text:(e.textContent||'').trim().slice(0,250)}:null;},{x:box.x+box.width/2,y:box.y+box.height/2});
  await btn.click({timeout:10000});const modal=page.locator('#pst-mso-modal');let visible=false;try{await modal.waitFor({state:'visible',timeout:5000});visible=true;}catch{}report.checks.click_opened_modal=visible;
  if(!visible){await snap(page,'04-after-click-no-modal');throw new Error('Live click did not open manual supplier modal');}
  report.modal_title=(await page.locator('#pst-mso-title').textContent())?.trim()||'';await snap(page,'04-modal-open');
  report.after_click=await counts();report.checks.no_offer_created=report.after_click.manual_offers===report.before.manual_offers;report.checks.no_supplier_selected=report.after_click.active_supplier_decisions===report.before.active_supplier_decisions;if(!report.checks.no_offer_created||!report.checks.no_supplier_selected)throw new Error('Click changed protected business state');
  await page.locator('[data-mso-close]').first().click();await page.waitForTimeout(250);report.after_close=await counts();report.checks.no_write_after_close=JSON.stringify(report.after_close)===JSON.stringify(report.before);if(!report.checks.no_write_after_close)throw new Error('Close changed protected business state');
  report.ok=true;
}catch(e){report.errors.push(String(e?.message||e));if(page)await snap(page,'99-failure-state').catch(()=>{});}finally{report.finished_at=new Date().toISOString();await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));if(browser)await browser.close();}
console.log(JSON.stringify({ok:report.ok,checks:report.checks,errors:report.errors,diagnostics:{module_flag:report.diagnostics?.module_flag,module_api:report.diagnostics?.module_api,loader_flag:report.diagnostics?.loader_flag,button_count:report.diagnostics?.button_count,page_area:report.diagnostics?.page_area,page_stage:report.diagnostics?.page_stage},operator_role:report.operator_role,candidate_intercept:report.candidate_intercept},null,2));if(!report.ok)process.exit(1);
