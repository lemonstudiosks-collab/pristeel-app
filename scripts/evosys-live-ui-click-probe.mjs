import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const SITE=process.env.PPPP_LIVE_URL||'https://lemonstudiosks-collab.github.io/pristeel-app/';
const SB=process.env.SUPABASE_URL||'https://isymxqfqzkchbsrbhucf.supabase.co';
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const PID='fc96208d-356c-410a-a356-96ce9e9b4d2f';
const OUT=process.env.PROBE_OUT||'tmp/evosys-live-ui-click-probe';
const CANDIDATE=process.env.CANDIDATE_URL||'';
await fs.mkdir(OUT,{recursive:true});
const report={site:SITE,project_id:PID,ok:false,checks:{},diagnostics:{},errors:[],candidate_intercept:!!CANDIDATE,started_at:new Date().toISOString()};
function H(extra={}){return {...extra,apikey:KEY,Authorization:`Bearer ${KEY}`};}
async function J(url,opts={}){const r=await fetch(url,opts);let b=null;try{b=await r.json();}catch{}if(!r.ok)throw new Error(`HTTP ${r.status} ${new URL(url).pathname}`);return b;}
async function getSession(){
  if(!KEY)throw new Error('Missing Supabase privileged key');
  const roles=await J(`${SB}/rest/v1/user_roles?select=user_id,role&role=eq.admin`,{headers:H()});
  const ids=new Set((roles||[]).map(x=>String(x.user_id)));
  const users=await J(`${SB}/auth/v1/admin/users?page=1&per_page=1000`,{headers:H()});
  const list=(users?.users||[]).filter(u=>u?.id&&u?.email&&u.email_confirmed_at&&ids.has(String(u.id))).sort((a,b)=>Date.parse(b.last_sign_in_at||0)-Date.parse(a.last_sign_in_at||0));
  const u=list[0]; if(!u)throw new Error('No admin session candidate');
  const link=await J(`${SB}/auth/v1/admin/generate_link`,{method:'POST',headers:H({'Content-Type':'application/json'}),body:JSON.stringify({type:'magiclink',email:u.email})});
  for(const type of [...new Set([link?.verification_type||'magiclink','email'])]){
    try{const s=await J(`${SB}/auth/v1/verify`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({type,token_hash:link.hashed_token})});if(s?.access_token)return s;}catch{}
  }
  throw new Error('Unable to create authenticated admin session');
}
async function counts(){
  const [o,d]=await Promise.all([
    J(`${SB}/rest/v1/offers?project_id=eq.${PID}&origin=eq.manual&select=id`,{headers:H()}),
    J(`${SB}/rest/v1/project_supplier_decisions?project_id=eq.${PID}&status=eq.active&select=id`,{headers:H()})
  ]);return{manual_offers:(o||[]).length,active_supplier_decisions:(d||[]).length};
}
async function snap(page,name){await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(OUT,name+'.txt'),String(await page.locator('body').innerText().catch(()=>'' )).slice(0,50000));}
let browser,page;
try{
  const s=await getSession(); report.before=await counts();
  let candidate=''; if(CANDIDATE){const r=await fetch(CANDIDATE,{headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw new Error(`Candidate fetch HTTP ${r.status}`);candidate=await r.text();}
  browser=await chromium.launch({headless:true}); page=await browser.newPage({viewport:{width:1600,height:1000}});
  const consoleErrors=[];page.on('pageerror',e=>consoleErrors.push(String(e.message||e).slice(0,500)));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,500));});
  if(candidate)await page.route('**/pristeel-manual-supplier-offer-v1.js*',r=>r.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:candidate,headers:{'cache-control':'no-store'}}));
  await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:60000});
  await page.evaluate(x=>localStorage.setItem('pristeel_session',JSON.stringify(x)),{...s,expires_at:Date.now()+Math.max(60,Number(s.expires_in||3600))*1000});
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{const g=document.getElementById('auth-gate'),r=document.getElementById('app-shell-root');return !!r&&getComputedStyle(r).display!=='none'&&(!g||getComputedStyle(g).display==='none');},{timeout:60000});
  report.checks.authenticated_ui=true;
  const nav=page.locator('.pst-ws-navbtn[data-key="projects"]').first(); await nav.waitFor({state:'visible',timeout:90000}); await nav.click();
  const row=page.locator(`.pst-pm-row[data-project-id="${PID}"]`).first(); await row.waitFor({state:'visible',timeout:90000}); report.checks.evosys_row_visible=true; await snap(page,'01-evosys-row');
  await row.locator(`[data-pm-open="${PID}"]`).first().click();
  const workspace=page.locator('#page-workspace-project.active'); await workspace.waitFor({state:'visible',timeout:90000});
  await page.waitForFunction(()=>/Evosys Laser GmbH/i.test(document.getElementById('page-workspace-project')?.innerText||'')&&!/Projekti nuk u gjet/i.test(document.getElementById('page-workspace-project')?.innerText||''),{timeout:30000});
  report.checks.evosys_open=true; report.runtime_ids=await page.evaluate(()=>({current:String(window.__pstCurrentProjectId||''),legacy:String(window._curProjId||''),integrity:String(window.__pstIntegrityLastData?.project?.id||'')})); await snap(page,'02-evosys-open');
  const area=page.locator('.pwf-area-btn[data-pwf-area="procurement"]').first(); await area.waitFor({state:'visible',timeout:60000}); await area.click(); report.checks.procurement_clicked=true;
  const stage=page.locator('.pwf-stage[data-pwf-stage="offers"]').first(); await stage.waitFor({state:'visible',timeout:60000}); await stage.click();
  await page.waitForFunction(()=>{const p=document.getElementById('page-workspace-project');return p?.getAttribute('data-pwf-area')==='procurement'&&p?.getAttribute('data-pwf-stage')==='offers';},{timeout:30000}); await page.waitForTimeout(1600); report.checks.supplier_offer_stage=true;
  report.diagnostics=await page.evaluate(()=>{const p=document.getElementById('page-workspace-project'),body=document.getElementById('pst-pi-body');const buttons=[...document.querySelectorAll('[data-mso-open]')].map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return{text:(b.textContent||'').trim(),disabled:!!b.disabled,display:s.display,visibility:s.visibility,pointerEvents:s.pointerEvents,rect:{x:r.x,y:r.y,w:r.width,h:r.height}};});return{area:p?.getAttribute('data-pwf-area')||'',stage:p?.getAttribute('data-pwf-stage')||'',module_flag:!!window.__pstManualSupplierOfferV1,module_api:!!window.PSTManualSupplierOfferV1,loader_flag:!!window.__pstManualSupplierOfferLoaderV1,button_count:buttons.length,buttons,scripts:[...document.scripts].filter(s=>String(s.src).includes('manual-supplier-offer')).map(s=>s.src),body_text:(body?.innerText||'').slice(0,7000)};}); report.console_errors=consoleErrors.slice(0,30); await snap(page,'03-offers-stage');
  const btn=page.locator('[data-mso-open]').first(); report.checks.manual_action_present=(await btn.count())>0; if(!report.checks.manual_action_present)throw new Error('Manual supplier action missing in live offers stage');
  report.checks.manual_action_visible=await btn.isVisible(); report.checks.manual_action_enabled=await btn.isEnabled();
  const box=await btn.boundingBox(); if(box)report.hit_target=await page.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);return e?{tag:e.tagName,cls:String(e.className||''),text:(e.textContent||'').trim().slice(0,250)}:null;},{x:box.x+box.width/2,y:box.y+box.height/2});
  await btn.click({timeout:10000}); const modal=page.locator('#pst-mso-modal'); let visible=false; try{await modal.waitFor({state:'visible',timeout:5000});visible=true;}catch{} report.checks.click_opened_modal=visible; await snap(page,visible?'04-modal-open':'04-click-no-modal'); if(!visible)throw new Error('Manual supplier action click did not open modal');
  report.after_click=await counts(); report.checks.no_offer_created=report.after_click.manual_offers===report.before.manual_offers; report.checks.no_supplier_selected=report.after_click.active_supplier_decisions===report.before.active_supplier_decisions; if(!report.checks.no_offer_created||!report.checks.no_supplier_selected)throw new Error('Protected business state changed on modal open');
  await page.locator('[data-mso-close]').first().click(); await page.waitForTimeout(250); report.after_close=await counts(); report.checks.no_write_after_close=JSON.stringify(report.after_close)===JSON.stringify(report.before); if(!report.checks.no_write_after_close)throw new Error('Protected business state changed on modal close');
  report.ok=true;
}catch(e){report.errors.push(String(e?.message||e));if(page)await snap(page,'99-failure').catch(()=>{});}finally{report.finished_at=new Date().toISOString();await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));if(browser)await browser.close();}
console.log(JSON.stringify({ok:report.ok,checks:report.checks,errors:report.errors,runtime_ids:report.runtime_ids,diagnostics:report.diagnostics},null,2));if(!report.ok)process.exit(1);
