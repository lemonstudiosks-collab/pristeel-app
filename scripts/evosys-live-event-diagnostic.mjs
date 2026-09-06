import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const SITE=process.env.PPPP_LIVE_URL||'https://lemonstudiosks-collab.github.io/pristeel-app/';
const SB=process.env.SUPABASE_URL||'https://isymxqfqzkchbsrbhucf.supabase.co';
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const PID='fc96208d-356c-410a-a356-96ce9e9b4d2f';
const OUT=process.env.PROBE_OUT||'tmp/evosys-live-event-diagnostic';
await fs.mkdir(OUT,{recursive:true});
const report={ok:false,project_id:PID,checks:{},errors:[],started_at:new Date().toISOString()};
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
async function snap(page,name){await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true}).catch(()=>{});}
let browser,page;
try{
  if(!KEY)throw new Error('Missing Supabase privileged key');
  const session=await adminSession();report.before=await counts();
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1600,height:1000}});
  await page.addInitScript(()=>{
    window.__pstDiag={listeners:[],rdStacks:[]};
    const add=EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener=function(type,fn,opts){
      if(type==='click'&&(this===window||this===document)){
        const cap=typeof opts==='boolean'?opts:!!(opts&&opts.capture);
        window.__pstDiag.listeners.push({target:this===window?'window':'document',capture:cap,stack:String(new Error().stack||'').slice(0,1800)});
      }
      return add.call(this,type,fn,opts);
    };
    const clsAdd=DOMTokenList.prototype.add;
    DOMTokenList.prototype.add=function(...tokens){if(tokens.includes('pst-rd-control'))window.__pstDiag.rdStacks.push({kind:'classList.add',stack:String(new Error().stack||'').slice(0,2000)});return clsAdd.apply(this,tokens);};
    const setAttr=Element.prototype.setAttribute;
    Element.prototype.setAttribute=function(name,value){if(name==='class'&&String(value).includes('pst-rd-control'))window.__pstDiag.rdStacks.push({kind:'setAttribute',stack:String(new Error().stack||'').slice(0,2000)});return setAttr.call(this,name,value);};
  });
  const consoleErrors=[];page.on('pageerror',e=>consoleErrors.push(String(e.message||e).slice(0,600)));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,600));});
  await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:60000});
  await page.evaluate(x=>localStorage.setItem('pristeel_session',JSON.stringify(x)),{...session,expires_at:Date.now()+Math.max(60,Number(session.expires_in||3600))*1000});
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{const g=document.getElementById('auth-gate'),r=document.getElementById('app-shell-root');return !!r&&getComputedStyle(r).display!=='none'&&(!g||getComputedStyle(g).display==='none');},{timeout:60000});
  report.checks.authenticated=true;
  const nav=page.locator('.pst-ws-navbtn[data-key="projects"]').first();await nav.waitFor({state:'visible',timeout:90000});await nav.click();
  const row=page.locator(`.pst-pm-row[data-project-id="${PID}"]`).first();await row.waitFor({state:'visible',timeout:90000});await row.locator(`[data-pm-open="${PID}"]`).first().click();
  await page.waitForFunction(()=>/Evosys Laser GmbH/i.test(document.getElementById('page-workspace-project')?.innerText||'')&&!/Projekti nuk u gjet/i.test(document.getElementById('page-workspace-project')?.innerText||''),{timeout:60000});
  report.checks.evosys_open=true;
  const area=page.locator('.pwf-area-btn[data-pwf-area="procurement"]').first();await area.waitFor({state:'visible',timeout:60000});await area.click();
  const stage=page.locator('.pwf-stage[data-pwf-stage="offers"]').first();await stage.waitFor({state:'visible',timeout:60000});await stage.click();await page.waitForTimeout(1700);
  report.checks.offers_stage=true;
  const btn=page.locator('[data-mso-open]').first();await btn.waitFor({state:'visible',timeout:30000});report.button=await btn.evaluate(b=>({className:b.className,disabled:b.disabled,pointerEvents:getComputedStyle(b).pointerEvents}));
  report.pre_diag=await page.evaluate(()=>window.__pstDiag);
  await snap(page,'01-before-click');
  await btn.click({timeout:10000});await page.waitForTimeout(700);
  const modal=page.locator('#pst-mso-modal');report.checks.real_click_opened=await modal.isVisible().catch(()=>false);
  report.after_real_click_diag=await page.evaluate(()=>window.__pstDiag);
  if(!report.checks.real_click_opened){
    report.direct_open_result=await page.evaluate(async()=>{
      try{const api=window.PSTManualSupplierOfferV1;if(!api||typeof api.open!=='function')return{called:false,error:'API open unavailable'};const r=api.open();if(r&&typeof r.then==='function')await r;return{called:true,error:null};}catch(e){return{called:true,error:String(e&&e.message||e)};}
    });
    await page.waitForTimeout(800);
    report.checks.direct_open_opened=await modal.isVisible().catch(()=>false);
    await snap(page,'02-after-direct-open');
  }
  report.after_open=await counts();report.checks.no_offer_created=report.after_open.manual_offers===report.before.manual_offers;report.checks.no_supplier_selected=report.after_open.active_supplier_decisions===report.before.active_supplier_decisions;
  report.console_errors=consoleErrors;
  report.final_diag=await page.evaluate(()=>window.__pstDiag);
  report.ok=report.checks.direct_open_opened===true&&report.checks.no_offer_created&&report.checks.no_supplier_selected;
}catch(e){report.errors.push(String(e?.message||e));if(page)await snap(page,'99-failure');}finally{report.finished_at=new Date().toISOString();await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));if(browser)await browser.close();}
console.log(JSON.stringify(report,null,2));if(!report.ok)process.exit(1);
