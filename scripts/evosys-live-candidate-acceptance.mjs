import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const SITE=process.env.PPPP_LIVE_URL||'https://lemonstudiosks-collab.github.io/pristeel-app/';
const SB=process.env.SUPABASE_URL||'https://isymxqfqzkchbsrbhucf.supabase.co';
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const CANDIDATE_URL=process.env.CANDIDATE_URL||'';
const PID='fc96208d-356c-410a-a356-96ce9e9b4d2f';
const OUT=process.env.PROBE_OUT||'tmp/evosys-live-candidate-acceptance';
await fs.mkdir(OUT,{recursive:true});
const report={ok:false,project_id:PID,candidate_url:!!CANDIDATE_URL,checks:{},errors:[],started_at:new Date().toISOString()};
function H(extra={}){return {...extra,apikey:KEY,Authorization:`Bearer ${KEY}`};}
async function J(url,opts={}){const r=await fetch(url,opts);let b=null;try{b=await r.json();}catch{}if(!r.ok)throw new Error(`HTTP ${r.status} ${new URL(url).pathname}`);return b;}
async function adminSession(){
  const roles=await J(`${SB}/rest/v1/user_roles?select=user_id&role=eq.admin`,{headers:H()});
  const ids=new Set((roles||[]).map(x=>String(x.user_id)));
  const users=await J(`${SB}/auth/v1/admin/users?page=1&per_page=1000`,{headers:H()});
  const list=(users?.users||[]).filter(u=>u?.id&&u?.email&&u.email_confirmed_at&&ids.has(String(u.id))).sort((a,b)=>Date.parse(b.last_sign_in_at||0)-Date.parse(a.last_sign_in_at||0));
  const u=list[0];if(!u)throw new Error('No authenticated admin candidate');
  const link=await J(`${SB}/auth/v1/admin/generate_link`,{method:'POST',headers:H({'Content-Type':'application/json'}),body:JSON.stringify({type:'magiclink',email:u.email})});
  for(const type of [...new Set([link?.verification_type||'magiclink','email'])]){try{const s=await J(`${SB}/auth/v1/verify`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({type,token_hash:link.hashed_token})});if(s?.access_token)return s;}catch{}}
  throw new Error('Unable to create admin session');
}
async function counts(){const [o,d]=await Promise.all([J(`${SB}/rest/v1/offers?project_id=eq.${PID}&origin=eq.manual&select=id`,{headers:H()}),J(`${SB}/rest/v1/project_supplier_decisions?project_id=eq.${PID}&status=eq.active&select=id`,{headers:H()})]);return{manual_offers:(o||[]).length,active_supplier_decisions:(d||[]).length};}
async function snap(page,name){await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true}).catch(()=>{});const t=await page.locator('body').innerText().catch(()=>'');await fs.writeFile(path.join(OUT,name+'.txt'),String(t).slice(0,50000));}
let browser,page;
try{
  if(!KEY)throw new Error('Missing Supabase privileged key');
  if(!CANDIDATE_URL)throw new Error('Missing CANDIDATE_URL');
  const r=await fetch(CANDIDATE_URL,{headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw new Error(`Candidate fetch HTTP ${r.status}`);const candidate=await r.text();
  if(!candidate.includes("if(!t||t.id==='page-workspace-project')return;"))throw new Error('Candidate does not contain workspace-root click guard');
  report.checks.candidate_guard_present=true;
  const session=await adminSession();report.before=await counts();
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1600,height:1000}});
  const consoleErrors=[];page.on('pageerror',e=>consoleErrors.push(String(e.message||e).slice(0,600)));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,600));});
  let intercepted=0;
  await page.route('**/pristeel-project-workflow-canonical-v1.js*',async route=>{intercepted++;await route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:candidate,headers:{'cache-control':'no-store'}});});
  await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:60000});
  await page.evaluate(x=>localStorage.setItem('pristeel_session',JSON.stringify(x)),{...session,expires_at:Date.now()+Math.max(60,Number(session.expires_in||3600))*1000});
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{const g=document.getElementById('auth-gate'),r=document.getElementById('app-shell-root');return !!r&&getComputedStyle(r).display!=='none'&&(!g||getComputedStyle(g).display==='none');},{timeout:60000});
  report.checks.authenticated_ui=true;report.checks.candidate_intercepted=intercepted>0;report.intercept_count=intercepted;if(!report.checks.candidate_intercepted)throw new Error('Candidate canonical module was not intercepted in live Pages');

  const nav=page.locator('.pst-ws-navbtn[data-key="projects"]').first();await nav.waitFor({state:'visible',timeout:90000});await nav.click();
  const row=page.locator(`.pst-pm-row[data-project-id="${PID}"]`).first();await row.waitFor({state:'visible',timeout:90000});report.checks.evosys_row_visible=true;await snap(page,'01-evosys-row');
  await row.locator(`[data-pm-open="${PID}"]`).first().click();
  await page.waitForFunction(()=>/Evosys Laser GmbH/i.test(document.getElementById('page-workspace-project')?.innerText||'')&&!/Projekti nuk u gjet/i.test(document.getElementById('page-workspace-project')?.innerText||''),{timeout:60000});report.checks.evosys_open=true;
  await page.waitForTimeout(2200);await snap(page,'02-evosys-open');

  let area=page.locator('.pwf-area-btn[data-pwf-area="procurement"]').first();
  if(!(await area.count())||!(await area.isVisible().catch(()=>false)))area=page.getByRole('button',{name:'Prokurimi',exact:true}).first();
  await area.waitFor({state:'visible',timeout:60000});await area.click({noWaitAfter:true});await page.waitForTimeout(1200);report.checks.procurement_clicked=true;
  let stage=page.locator('.pwf-stage[data-pwf-stage="offers"]').first();
  if(!(await stage.count())||!(await stage.isVisible().catch(()=>false)))stage=page.getByRole('button',{name:/Ofertat? e furnitorëve/i}).first();
  if(await stage.count()){await stage.waitFor({state:'visible',timeout:60000});await stage.click({noWaitAfter:true});await page.waitForTimeout(1600);}
  report.checks.supplier_offer_stage=(await page.locator('[data-mso-open]').count())>0;if(!report.checks.supplier_offer_stage)throw new Error('Manual supplier action not present after opening procurement supplier offers');

  const btn=page.locator('[data-mso-open]').first();await btn.waitFor({state:'visible',timeout:30000});report.checks.manual_action_visible=await btn.isVisible();report.checks.manual_action_enabled=await btn.isEnabled();
  const box=await btn.boundingBox();if(!box)throw new Error('Manual supplier action has no hit box');report.hit_target=await page.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);return e?{tag:e.tagName,className:String(e.className||''),text:(e.textContent||'').trim().slice(0,250)}:null;},{x:box.x+box.width/2,y:box.y+box.height/2});
  await snap(page,'03-before-click');
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(700);
  const modal=page.locator('#pst-mso-modal');report.checks.real_click_opened_modal=await modal.isVisible().catch(()=>false);if(!report.checks.real_click_opened_modal){await snap(page,'04-click-no-modal');throw new Error('Candidate failed: real click did not open manual supplier modal');}
  report.modal_title=(await page.locator('#pst-mso-title').textContent())?.trim()||'';report.checks.correct_modal_title=report.modal_title==='Shto ofertë furnitori';await snap(page,'04-modal-open');if(!report.checks.correct_modal_title)throw new Error(`Unexpected modal title: ${report.modal_title}`);

  report.after_open=await counts();report.checks.no_offer_created_on_open=report.after_open.manual_offers===report.before.manual_offers;report.checks.no_supplier_selected_on_open=report.after_open.active_supplier_decisions===report.before.active_supplier_decisions;if(!report.checks.no_offer_created_on_open||!report.checks.no_supplier_selected_on_open)throw new Error('Protected business state changed on modal open');
  await page.locator('[data-mso-close]').first().click();await page.waitForTimeout(300);report.checks.modal_closed=!(await modal.isVisible().catch(()=>false));
  report.after_close=await counts();report.checks.no_offer_created_after_close=report.after_close.manual_offers===report.before.manual_offers;report.checks.no_supplier_selected_after_close=report.after_close.active_supplier_decisions===report.before.active_supplier_decisions;if(!report.checks.no_offer_created_after_close||!report.checks.no_supplier_selected_after_close)throw new Error('Protected business state changed after modal close');
  report.console_errors=consoleErrors.slice(0,30);report.ok=true;
}catch(e){report.errors.push(String(e?.message||e));if(page)await snap(page,'99-failure').catch(()=>{});}finally{report.finished_at=new Date().toISOString();await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));if(browser)await browser.close();}
console.log(JSON.stringify(report,null,2));if(!report.ok)process.exit(1);
