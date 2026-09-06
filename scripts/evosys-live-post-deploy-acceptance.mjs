import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const SITE=process.env.PPPP_LIVE_URL||'https://lemonstudiosks-collab.github.io/pristeel-app/';
const SB=process.env.SUPABASE_URL||'https://isymxqfqzkchbsrbhucf.supabase.co';
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const EXPECTED_SHA=process.env.EXPECTED_PRODUCTION_SHA||'';
const PID='fc96208d-356c-410a-a356-96ce9e9b4d2f';
const ASSET='pristeel-project-workflow-canonical-v1.js';
const OUT=process.env.PROBE_OUT||'tmp/evosys-live-post-deploy-acceptance';
await fs.mkdir(OUT,{recursive:true});
const report={ok:false,mode:'production-no-injection',project_id:PID,expected_production_sha:EXPECTED_SHA,checks:{no_injection:true},errors:[],started_at:new Date().toISOString()};
function H(extra={}){return {...extra,apikey:KEY,Authorization:`Bearer ${KEY}`};}
async function J(url,opts={}){const r=await fetch(url,opts);let b=null;try{b=await r.json();}catch{}if(!r.ok)throw new Error(`HTTP ${r.status} ${new URL(url).pathname}`);return b;}
async function T(url){const r=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache, no-store'}});if(!r.ok)throw new Error(`HTTP ${r.status} ${new URL(url).pathname}`);return r.text();}
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
async function counts(){
  const [o,d]=await Promise.all([
    J(`${SB}/rest/v1/offers?project_id=eq.${PID}&origin=eq.manual&select=id`,{headers:H()}),
    J(`${SB}/rest/v1/project_supplier_decisions?project_id=eq.${PID}&status=eq.active&select=id`,{headers:H()})
  ]);
  return{manual_offers:(o||[]).length,active_supplier_decisions:(d||[]).length};
}
async function snap(page,name){await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true}).catch(()=>{});const t=await page.locator('body').innerText().catch(()=>'');await fs.writeFile(path.join(OUT,name+'.txt'),String(t).slice(0,50000));}
async function state(page){return page.evaluate(()=>{const p=document.getElementById('page-workspace-project');return{workspace_display:p?getComputedStyle(p).display:null,text:(p?.innerText||'').slice(0,5000),evosys:/Evosys Laser GmbH/i.test(p?.innerText||''),not_found:/Projekti nuk u gjet/i.test(p?.innerText||''),load_failed:/Projekti nuk u ngarkua/i.test(p?.innerText||'')};});}
let browser,page;
try{
  if(!KEY)throw new Error('Missing Supabase privileged key');
  if(!EXPECTED_SHA)throw new Error('Missing EXPECTED_PRODUCTION_SHA');

  const liveAssetUrl=`${SITE}${ASSET}?acceptance=${Date.now()}`;
  const expectedAssetUrl=`https://raw.githubusercontent.com/lemonstudiosks-collab/pristeel-app/${EXPECTED_SHA}/${ASSET}`;
  const [liveAsset,expectedAsset]=await Promise.all([T(liveAssetUrl),T(expectedAssetUrl)]);
  report.production_asset={name:ASSET,live_bytes:liveAsset.length,expected_bytes:expectedAsset.length};
  report.checks.production_asset_has_root_guard=liveAsset.includes("if(!t||t.id==='page-workspace-project')return;");
  report.checks.production_asset_matches_expected_commit=liveAsset===expectedAsset;
  if(!report.checks.production_asset_has_root_guard)throw new Error('Live Pages canonical workflow does not contain workspace-root click guard');
  if(!report.checks.production_asset_matches_expected_commit)throw new Error('Live Pages canonical workflow does not match expected merge commit');

  const session=await adminSession();
  report.before=await counts();
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1600,height:1000}});
  await page.goto(SITE+`?post_deploy_acceptance=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.evaluate(x=>localStorage.setItem('pristeel_session',JSON.stringify(x)),{...session,expires_at:Date.now()+Math.max(60,Number(session.expires_in||3600))*1000});
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{const g=document.getElementById('auth-gate'),r=document.getElementById('app-shell-root');return !!r&&getComputedStyle(r).display!=='none'&&(!g||getComputedStyle(g).display==='none');},null,{timeout:60000});
  report.checks.authenticated_ui=true;
  await page.waitForFunction(()=>!!(window.__pstProjectClassificationV1&&window.__pstCanonicalProjectWorkflowV1&&window.__pstManualSupplierOfferV1&&window.pstOpenProjectWorkspace),null,{timeout:90000});
  await page.waitForTimeout(1800);report.checks.runtime_ready=true;

  let opened=false;report.open_attempts=[];
  for(let attempt=1;attempt<=3&&!opened;attempt++){
    const nav=page.locator('.pst-ws-navbtn[data-key="projects"]').first();await nav.waitFor({state:'visible',timeout:90000});await nav.click();
    const row=page.locator(`.pst-pm-row[data-project-id="${PID}"]`).first();await row.waitFor({state:'visible',timeout:90000});report.checks.evosys_row_visible=true;
    const main=row.locator(`[data-pm-open="${PID}"]`).first();await main.waitFor({state:'visible',timeout:30000});
    if(attempt===1)await snap(page,'01-evosys-row');
    const box=await main.boundingBox();if(!box)throw new Error('EVOSYS project row has no clickable hit box');
    await page.mouse.click(box.x+Math.min(box.width/2,180),box.y+box.height/2);
    await page.waitForTimeout(4200);
    const s=await state(page);report.open_attempts.push({attempt,...s});opened=s.evosys&&!s.not_found&&!s.load_failed;
    if(!opened&&attempt<3)await page.waitForTimeout(1200);
  }
  if(!opened)throw new Error('EVOSYS failed to open after 3 real UI attempts');
  report.checks.evosys_open=true;await snap(page,'02-evosys-open');

  let area=page.locator('.pwf-area-btn[data-pwf-area="procurement"]').first();
  if(!(await area.count())||!(await area.isVisible().catch(()=>false)))area=page.getByRole('button',{name:'Prokurimi',exact:true}).first();
  await area.waitFor({state:'visible',timeout:60000});await area.click({noWaitAfter:true});await page.waitForTimeout(1400);report.checks.procurement_clicked=true;await snap(page,'03-procurement');

  let stage=page.getByRole('button',{name:'Furnitorët',exact:true}).first();
  if(!(await stage.count())||!(await stage.isVisible().catch(()=>false)))stage=page.locator('.pwf-stage[data-pwf-stage="offers"]').first();
  if(!(await stage.count())||!(await stage.isVisible().catch(()=>false)))stage=page.getByRole('button',{name:/Ofertat? e furnitorëve/i}).first();
  if(!(await stage.count())||!(await stage.isVisible().catch(()=>false)))throw new Error('Supplier flow control not found');
  await stage.click({noWaitAfter:true});await page.waitForTimeout(1800);report.checks.supplier_flow_clicked=true;await snap(page,'04-supplier-flow');

  const btn=page.locator('[data-mso-open]').first();await btn.waitFor({state:'visible',timeout:30000});
  report.checks.manual_action_visible=await btn.isVisible();report.checks.manual_action_enabled=await btn.isEnabled();
  report.manual_action=await btn.evaluate(el=>({text:(el.textContent||'').trim().replace(/\s+/g,' '),disabled:!!el.disabled,pointerEvents:getComputedStyle(el).pointerEvents,outerHTML:el.outerHTML.slice(0,1600)}));
  const box=await btn.boundingBox();if(!box)throw new Error('Manual supplier action has no hit box');
  report.hit_target=await page.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);return e?{tag:e.tagName,className:String(e.className||''),text:(e.textContent||'').trim().slice(0,250)}:null;},{x:box.x+box.width/2,y:box.y+box.height/2});
  await snap(page,'05-before-manual-click');
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(700);
  const modal=page.locator('#pst-mso-modal');report.checks.real_click_opened_modal=await modal.isVisible().catch(()=>false);
  if(!report.checks.real_click_opened_modal){await snap(page,'06-click-no-modal');throw new Error('Production failed: real click did not open manual supplier modal');}
  report.modal_title=(await page.locator('#pst-mso-title').textContent())?.trim()||'';
  report.checks.correct_modal_title=report.modal_title==='Shto ofertë furnitori';await snap(page,'06-modal-open');
  if(!report.checks.correct_modal_title)throw new Error(`Unexpected modal title: ${report.modal_title}`);

  report.after_open=await counts();
  report.checks.no_offer_created_on_open=report.after_open.manual_offers===report.before.manual_offers;
  report.checks.no_supplier_selected_on_open=report.after_open.active_supplier_decisions===report.before.active_supplier_decisions;
  if(!report.checks.no_offer_created_on_open||!report.checks.no_supplier_selected_on_open)throw new Error('Protected business state changed on modal open');
  await page.locator('[data-mso-close]').first().click();await page.waitForTimeout(300);
  report.checks.modal_closed=!(await modal.isVisible().catch(()=>false));
  report.after_close=await counts();
  report.checks.no_offer_created_after_close=report.after_close.manual_offers===report.before.manual_offers;
  report.checks.no_supplier_selected_after_close=report.after_close.active_supplier_decisions===report.before.active_supplier_decisions;
  if(!report.checks.no_offer_created_after_close||!report.checks.no_supplier_selected_after_close)throw new Error('Protected business state changed after modal close');
  report.ok=true;
}catch(e){report.errors.push(String(e?.message||e));if(page)await snap(page,'99-failure').catch(()=>{});}finally{report.finished_at=new Date().toISOString();await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));if(browser)await browser.close();}
console.log(JSON.stringify(report,null,2));if(!report.ok)process.exit(1);
