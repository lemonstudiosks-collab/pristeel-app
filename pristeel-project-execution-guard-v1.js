/* PRISTEEL post-award execution guard v1
 * A won / execution project can no longer return to the pre-award calculation flow.
 * Historical BOM/RFQ/offers remain data history; this module never deletes or rewrites them.
 * Allowed operational surfaces: project overview, execution, finance, files, communication/activity.
 * UI/navigation only. No automatic business-data writes and no outbound communication.
 */
(function(){
'use strict';
if(window.__pstProjectExecutionGuardV1)return;
window.__pstProjectExecutionGuardV1=true;

var PREAWARD_PAGES={bom:1,rfq:1,offers:1,ranking:1,comparison:1,kalkulator:1,pricing:1,oferta:1,client_offer:1};
var PREAWARD_TABS={bom:1,procurement:1,commercial:1};
var PREAWARD_ACTIONS={
  'legacy-bom':1,rfq:1,offer:1,
  'open-bom':1,'open-rfq':1,'open-pricing':1,'open-client-offer':1
};
var cache={id:'',project:null,at:0};
var otherCostCache={};
var installing=false;
var bases={};

function A(v){return Array.isArray(v)?v:[];}
function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_]+/g,' ').replace(/\s+/g,' ').trim();}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function num(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function money(v,c){var n=num(v);return n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c||'EUR');}
function pct(v){return isFinite(v)?v.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'—';}
function data(){return window.__pstIntegrityLastData||null;}
function activeId(){
  var d=data(),s=document.getElementById('global-proj');
  return String(window.__pstCurrentProjectId||window._curProjId||(s&&s.value)||(d&&d.project&&d.project.id)||'');
}
function currentProject(){
  var d=data(),id=activeId();
  if(d&&d.project&&(!id||String(d.project.id)===id))return d.project;
  if(cache.project&&String(cache.project.id)===id)return cache.project;
  return null;
}
function isPostAward(p){
  if(!p)return false;
  var status=N(p.status),op=N(p.operational_state),stage=N(p.pipeline_stage);
  if(op==='execution')return true;
  if(/\b(fituar|won|realizuar|completed)\b/.test(status))return true;
  if(p.execution_bootstrapped_at)return true;
  return /\b(production|production_control|execution|ekzekutim|transport|delivery|installation|montim|handover|commissioning)\b/.test(stage);
}
function locked(){return isPostAward(currentProject());}
function preAwardPage(p){return !!PREAWARD_PAGES[N(p)];}
function preAwardTab(t){return !!PREAWARD_TABS[N(t)];}
function preAwardAction(a){return !!PREAWARD_ACTIONS[String(a||'')];}
function safeFetch(path){return typeof window.supaFetch==='function'?Promise.resolve(window.supaFetch(path)).catch(function(){return[];}):Promise.resolve([]);}
function ensureProject(id){
  id=String(id||activeId());
  if(!id)return Promise.resolve(null);
  var d=data();if(d&&d.project&&String(d.project.id)===id){cache={id:id,project:d.project,at:Date.now()};return Promise.resolve(d.project);}
  if(cache.project&&cache.id===id&&Date.now()-cache.at<60000)return Promise.resolve(cache.project);
  return safeFetch('projects?id=eq.'+encodeURIComponent(id)+'&select=id,name,ref,status,pipeline_stage,operational_state,execution_bootstrapped_at,work_model,deal_type&limit=1').then(function(rows){
    var p=A(rows)[0]||null;cache={id:id,project:p,at:Date.now()};return p;
  });
}
function currentPage(){var p=document.querySelector('.page.active');return p&&p.id&&p.id.indexOf('page-')===0?p.id.slice(5):'';}
function canonicalRender(area,stage){
  var C=window.PSTCanonicalProjectWorkflowV1;
  var fn=bases.canonicalRender||(C&&C.render);
  if(typeof fn==='function')return fn.call(C,area,stage);
  var P=window.PSTProjectFirstV2,pr=bases.projectFirstRender||(P&&P.render);
  if(typeof pr==='function')return pr.call(P,area==='finance'?'finance':area==='files'?'files':area==='communication'?'communication':'execution');
  return false;
}
function activate(id){
  id=String(id||activeId());if(!id)return;
  window.__pstCurrentProjectId=id;window._curProjId=id;
  try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  var s=document.getElementById('global-proj');if(s&&[].slice.call(s.options||[]).some(function(o){return String(o.value)===id;}))s.value=id;
}
function routeWorkspace(area){
  area=area||'execution';var id=activeId();if(!id)return false;activate(id);
  var page=document.getElementById('page-workspace-project');
  function finish(){activate(id);try{canonicalRender(area);}catch(e){}scheduleDecorate();}
  if(page&&page.classList.contains('active')){finish();return true;}
  if(typeof window.pstOpenProjectWorkspace==='function'){
    try{Promise.resolve(window.pstOpenProjectWorkspace(id)).then(finish).catch(function(){finish();});return true;}catch(e){}
  }
  if(typeof bases.showPage==='function')try{bases.showPage.call(window,'workspace-project');}catch(e){}
  finish();return true;
}
function routeExecution(){return routeWorkspace('execution');}
function blockedMessage(){return 'Projekti është fituar dhe është në ekzekutim. BOM, RFQ, krahasimi, çmimi dhe oferta para-award janë mbyllur; historia ruhet vetëm si evidencë.';}

function gateLegacyCall(base,ctx,args,page){
  if(!preAwardPage(page))return base.apply(ctx,args);
  var p=currentProject();
  if(p){if(isPostAward(p)){routeExecution();return false;}return base.apply(ctx,args);}
  var id=activeId();
  if(!id)return base.apply(ctx,args);
  ensureProject(id).then(function(found){if(isPostAward(found))routeExecution();else base.apply(ctx,args);});
  return false;
}
function wrapLegacyNavigation(){
  if(typeof window.flowGoto==='function'&&!window.flowGoto.__pstExecutionGuard){
    bases.flowGoto=window.flowGoto;var fg=function(page){return gateLegacyCall(bases.flowGoto,this,arguments,page);};fg.__pstExecutionGuard=true;fg.__base=bases.flowGoto;window.flowGoto=fg;
  }
  if(typeof window.showPage==='function'&&!window.showPage.__pstExecutionGuard){
    bases.showPage=window.showPage;var sp=function(page){return gateLegacyCall(bases.showPage,this,arguments,page);};sp.__pstExecutionGuard=true;sp.__base=bases.showPage;window.showPage=sp;
  }
  if(typeof window.pstPiLegacy==='function'&&!window.pstPiLegacy.__pstExecutionGuard){
    bases.pstPiLegacy=window.pstPiLegacy;var pl=function(page){if(preAwardPage(page)&&locked()){routeExecution();return false;}return bases.pstPiLegacy.apply(this,arguments);};pl.__pstExecutionGuard=true;pl.__base=bases.pstPiLegacy;window.pstPiLegacy=pl;
  }
  if(typeof window.pstPiNew==='function'&&!window.pstPiNew.__pstExecutionGuard){
    bases.pstPiNew=window.pstPiNew;var pn=function(type){if(N(type)==='offer'&&locked()){routeExecution();return false;}return bases.pstPiNew.apply(this,arguments);};pn.__pstExecutionGuard=true;pn.__base=bases.pstPiNew;window.pstPiNew=pn;
  }
}
function wrapCanonical(){
  var C=window.PSTCanonicalProjectWorkflowV1;
  if(C&&typeof C.render==='function'&&!C.render.__pstExecutionGuard){
    bases.canonicalRender=C.render;
    var cr=function(area,stage){
      if(locked()&&(N(area)==='procurement'||preAwardPage(stage)))area='execution',stage=undefined;
      var out=bases.canonicalRender.call(C,area,stage);scheduleDecorate();return out;
    };
    cr.__pstExecutionGuard=true;cr.__base=bases.canonicalRender;C.render=cr;
  }
  var P=window.PSTProjectFirstV2;
  if(P&&typeof P.render==='function'&&!P.render.__pstExecutionGuard){
    bases.projectFirstRender=P.render;
    var pr=function(tab){if(locked()&&preAwardTab(tab))tab='execution';var out=bases.projectFirstRender.call(P,tab);scheduleDecorate();return out;};
    pr.__pstExecutionGuard=true;pr.__base=bases.projectFirstRender;P.render=pr;
  }
}
function wrapCommercialCreators(){
  var nav=window.PSTCommercialNavigationFixV1;
  if(nav&&typeof nav.createDocument==='function'&&!nav.createDocument.__pstExecutionGuard){
    bases.createDocument=nav.createDocument;
    var cd=function(type){if(N(type)==='offer'&&locked()){routeExecution();return false;}return bases.createDocument.apply(nav,arguments);};cd.__pstExecutionGuard=true;cd.__base=bases.createDocument;nav.createDocument=cd;
  }
  var b=window.PSTCommercialDocumentBuilderV1;
  if(b&&typeof b.begin==='function'&&!b.begin.__pstExecutionGuard){
    bases.builderBegin=b.begin;
    var bb=function(type){if(N(type)==='offer'&&locked()){routeExecution();return false;}return bases.builderBegin.apply(b,arguments);};bb.__pstExecutionGuard=true;bb.__base=bases.builderBegin;b.begin=bb;
  }
}

function flowTarget(el){
  if(!el)return'';var oc=String(el.getAttribute('onclick')||''),m=oc.match(/flowGoto\s*\(\s*['\"]([^'\"]+)/i);if(m)return N(m[1]);
  var t=N(el.textContent||'');if(/\bbom\b/.test(t))return'bom';if(/\brfq\b/.test(t))return'rfq';if(/ofertat/.test(t)&&!/oferta jone/.test(t))return'offers';if(/krahas/.test(t))return'ranking';if(/cmim|kalkulator/.test(t))return'kalkulator';if(/oferta jone|oferta per klientin/.test(t))return'oferta';return'';
}
function clickCapture(e){
  var t=e.target&&e.target.closest?e.target.closest('[data-pxg-go],[data-pwf-area],[data-pwf-stage],[data-pwf-action],[data-pf2-tab],[data-pf2-action],.flow-step'):null;if(!t)return;
  var go=t.getAttribute('data-pxg-go');
  if(go&&locked()){
    e.preventDefault();e.stopImmediatePropagation();
    if(go==='finance'||go==='files'||go==='communication'||go==='overview'||go==='execution')return routeWorkspace(go);
    if(go==='invoices'&&typeof window.showPage==='function')return window.showPage('invoices');
    if(go==='library'&&typeof window.showPage==='function')return window.showPage('library');
    return routeExecution();
  }
  if(!locked())return;
  var blocked=false;
  if(N(t.getAttribute('data-pwf-area'))==='procurement')blocked=true;
  if(preAwardPage(t.getAttribute('data-pwf-stage')))blocked=true;
  if(preAwardAction(t.getAttribute('data-pwf-action')))blocked=true;
  if(preAwardTab(t.getAttribute('data-pf2-tab')))blocked=true;
  if(preAwardAction(t.getAttribute('data-pf2-action')))blocked=true;
  if(t.classList.contains('flow-step')&&preAwardPage(flowTarget(t)))blocked=true;
  if(blocked){e.preventDefault();e.stopImmediatePropagation();routeExecution();}
}

function unique(rows,key){var seen={};return A(rows).filter(function(r){var k=String(key(r)||'');if(!k||seen[k])return false;seen[k]=1;return true;});}
function docKey(r){return N(r&& (r.invoice_nr||r.supplier_invoice_nr||r.doc_nr||r.document_nr||r.reference||r.id));}
function amount(r){return num(r&&(r.net_amount||r.gross_amount||r.total_price||r.total_eur||r.total_amount||r.total||r.amount));}
function winningQuote(d){
  var rows=unique(A(d&&d.ourOffers).concat(A(d&&d.docs)),docKey).filter(function(r){return String(r.series||'').toUpperCase()==='QUO'||/quo|offer|ofert/.test(N(r.doc_nr||r.document_nr||r.reference));});
  var won=rows.filter(function(r){return /\b(won|fituar|awarded|accepted|pranuar)\b/.test(N([r.followup_status,r.status,r.state,r.offer_state&&r.offer_state.status].filter(Boolean).join(' ')))&&amount(r)>0;});
  var pool=won.length?won:rows.filter(function(r){return amount(r)>0;});
  return pool.sort(function(a,b){return new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0);})[0]||null;
}
function committedOffers(d){
  var rows=unique(A(d&&d.offers),function(r){return r&&r.id||docKey(r);});
  return rows.filter(function(r){
    if(amount(r)<=0)return false;
    var t=N([r.supplier,r.supplier_name,r.notes,r.status,r.state,r.origin].filter(Boolean).join(' '));
    return /nenshkruar|nenkontrat|kontrat|signed|contract|selected|approved|awarded|porosi|order confirmed|purchase order/.test(t);
  });
}
function revenueRows(d){
  var inv=unique(A(d&&d.invoicesOut),docKey);if(inv.length)return inv;
  return unique(A(d&&d.docs).filter(function(r){return String(r.series||'').toUpperCase()==='INV';}),docKey);
}
function projectMatch(row,p){
  var a=N(row&&row.project),n=N(p&&p.name),r=N(p&&p.ref);
  if(!a)return false;if(n&&(a===n||a.indexOf(n)>-1||n.indexOf(a)>-1))return true;if(r&&r.length>=4&&a.indexOf(r)>-1)return true;return false;
}
function loadOtherCosts(p){
  var id=String(p&&p.id||'');if(!id)return Promise.resolve([]);if(otherCostCache[id])return Promise.resolve(otherCostCache[id]);
  return safeFetch('other_costs?select=id,category,description,project,amount,date&limit=2000').then(function(rows){var x=A(rows).filter(function(r){return projectMatch(r,p);});otherCostCache[id]=x;return x;});
}
function financeModel(d,other){
  var q=winningQuote(d),contract=amount(q),comm=committedOffers(d),committed=comm.reduce(function(s,r){return s+amount(r);},0);
  var rev=revenueRows(d).reduce(function(s,r){return s+amount(r);},0);
  var cost=unique(A(d&&d.invoicesIn),docKey).reduce(function(s,r){return s+amount(r);},0);
  var extras=A(other).reduce(function(s,r){return s+amount(r);},0);
  var base=contract&&committed?contract-committed:null,basePct=base!==null&&contract?base/contract*100:null;
  var actual=rev-(cost+extras),actualPct=rev?actual/rev*100:null;
  return{contract:contract,committed:committed,base:base,basePct:basePct,revenue:rev,cost:cost,extras:extras,actual:actual,actualPct:actualPct,committedCount:comm.length};
}
function metric(label,value,sub){return'<div class="pxg-metric"><span>'+E(label)+'</span><b>'+E(value)+'</b>'+(sub?'<small>'+E(sub)+'</small>':'')+'</div>';}
function financeHtml(m){
  return'<section id="pxg-finance-summary" class="pxg-finance-summary"><header><div><span>FINANCAT E EKZEKUTIMIT</span><b>Kosto dhe fitimi i projektit</b><small>Vetëm nga dokumentet dhe kostot e regjistruara në PPPP; nuk rihap kalkulimin e ofertës.</small></div></header><div class="pxg-metrics">'+
    metric('Vlera e kontratës',m.contract?money(m.contract):'—','oferta e fituar / baseline')+
    metric('Kosto e kontraktuar',m.committed?money(m.committed):'—',m.committedCount?m.committedCount+' angazhim(e) të konfirmuara':'pa kontratë furnitori të shënuar')+
    metric('Marzhi bazë',m.base!==null?money(m.base):'—',m.basePct!==null?pct(m.basePct):'baseline jo i plotë')+
    metric('Faturuar klientit',money(m.revenue),'deri tani')+
    metric('Kosto të faturuara',money(m.cost),'fatura hyrëse të lidhura')+
    metric('Kosto të tjera',money(m.extras),'kosto projekti të regjistruara')+
    metric('Rezultati i regjistruar',money(m.actual),m.actualPct!==null?'marzh '+pct(m.actualPct):'jo fitim final; projekti është në vazhdim')+
    '</div><footer>Fitimi final mbyllet vetëm kur projekti përfundon dhe të gjitha faturat/kostot janë regjistruar.</footer></section>';
}
function injectFinanceSummary(){
  if(!locked())return;var d=data(),body=document.getElementById('pst-pi-body');if(!d||!body)return;
  var area=(document.getElementById('page-workspace-project')||{}).getAttribute&&document.getElementById('page-workspace-project').getAttribute('data-pwf-area');
  var meaningful=area==='execution'||area==='finance'||body.classList.contains('pwf-area-execution')||body.classList.contains('pwf-area-finance');if(!meaningful)return;
  loadOtherCosts(d.project).then(function(other){
    var old=document.getElementById('pxg-finance-summary');if(old)old.remove();
    var host=document.getElementById('pst-pi-body');if(!host||!locked())return;
    var ctx=host.querySelector('.pwf-project-context');if(ctx)ctx.insertAdjacentHTML('afterend',financeHtml(financeModel(d,other)));else host.insertAdjacentHTML('afterbegin',financeHtml(financeModel(d,other)));
  });
}
function executionBanner(){
  var body=document.getElementById('pst-pi-body');if(!body||body.querySelector('#pxg-execution-lock'))return;
  var ctx=body.querySelector('.pwf-project-context');var html='<section id="pxg-execution-lock" class="pxg-lock"><div><span>PROJEKT I FITUAR · EKZEKUTIM</span><b>Workflow-i i ofertimit është mbyllur</b><small>BOM, RFQ, krahasimi, çmimi dhe oferta ruhen si histori. Tani ndiqen realizimi, kostot, faturat dhe fitimi.</small></div><div><button type="button" data-pxg-go="execution">Ekzekutimi</button><button type="button" data-pxg-go="finance">Financat</button><button type="button" data-pxg-go="files">Skedarët</button></div></section>';
  if(ctx)ctx.insertAdjacentHTML('afterend',html);else body.insertAdjacentHTML('afterbegin',html);
}
function decorateOverview(){
  var body=document.getElementById('pst-pi-body');if(!body)return;
  var hero=body.querySelector('.pf2-hero');if(hero){
    var h=hero.querySelector('h2'),p=hero.querySelector('p');if(h)h.textContent='Ekzekutimi i projektit';if(p)p.textContent='Projekti është fituar. Ndiq realizimin, financat, kostot aktuale dhe fitimin; kalkulimet para-award mbeten histori.';
    var primary=hero.querySelector('.pf2-actions [data-pf2-action],.pf2-actions [data-pwf-stage]');if(primary){primary.removeAttribute('data-pf2-action');primary.removeAttribute('data-pwf-stage');primary.setAttribute('data-pxg-go','execution');primary.textContent='Vazhdo ekzekutimin';}
    [].slice.call(hero.querySelectorAll('.pf2-shortcut')).forEach(function(s){var l=s.querySelector('span'),txt=N(l&&l.textContent);if(txt==='oferta'){s.setAttribute('data-pxg-go','finance');s.removeAttribute('data-pf2-action');var b=s.querySelector('b'),sm=s.querySelector('small');if(l)l.textContent='Financat';if(b)b.textContent='Kosto + fitim';if(sm)sm.textContent='Ndiq financat e projektit';}});
  }
}
function decorateNav(){
  var page=document.getElementById('page-workspace-project');if(!page||!locked())return;
  page.classList.add('pxg-post-award');
  [].slice.call(page.querySelectorAll('[data-pwf-area="procurement"],[data-pf2-tab="bom"],[data-pf2-tab="procurement"],[data-pf2-tab="commercial"]')).forEach(function(x){x.remove();});
  [].slice.call(page.querySelectorAll('.pwf-procurement-head,.pwf-stage-nav')).forEach(function(x){x.remove();});
  var next=page.querySelector('.pwf-next');if(next){next.removeAttribute('data-pwf-stage');next.setAttribute('data-pxg-go','execution');var b=next.querySelector('b'),s=next.querySelector('small');if(b)b.textContent='Vazhdo ekzekutimin';if(s)s.textContent='Ndiq realizimin, kostot, faturat dhe fitimin e projektit.';}
  decorateOverview();executionBanner();injectFinanceSummary();
}
function decorateLegacyFlow(){
  if(!locked())return;var bar=document.getElementById('flow-bar');if(!bar)return;
  bar.innerHTML='<div class="pxg-legacy-flow"><b>PROJEKT NË EKZEKUTIM</b><button type="button" data-pxg-go="execution">Ekzekutimi</button><span>→</span><button type="button" data-pxg-go="finance">Financat</button><span>→</span><button type="button" data-pxg-go="invoices">Faturat</button><span>→</span><button type="button" data-pxg-go="files">Skedarët</button></div>';
  bar.style.display='block';
}
function decorate(){if(!locked())return;decorateNav();decorateLegacyFlow();}
function scheduleDecorate(){[0,60,180,420].forEach(function(ms){setTimeout(decorate,ms);});}
function enforceCurrentPage(){
  var p=currentPage();if(locked()&&preAwardPage(p)){routeExecution();return true;}decorate();return false;
}
function refreshState(){var id=activeId();if(!id)return Promise.resolve(null);return ensureProject(id).then(function(p){if(p&&isPostAward(p))enforceCurrentPage();return p;});}

function css(){
  if(document.getElementById('pxg-css'))return;var s=document.createElement('style');s.id='pxg-css';s.textContent='\
#page-workspace-project.pxg-post-award [data-pwf-area="procurement"],#page-workspace-project.pxg-post-award [data-pf2-tab="bom"],#page-workspace-project.pxg-post-award [data-pf2-tab="procurement"],#page-workspace-project.pxg-post-award [data-pf2-tab="commercial"],#page-workspace-project.pxg-post-award .pwf-procurement-head{display:none!important}\
#page-workspace-project .pxg-lock{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 15px;margin:0 0 12px;border:1px solid #CFE0D6;background:#F5FAF7;border-radius:13px}\
#page-workspace-project .pxg-lock span,#page-workspace-project .pxg-finance-summary header span{display:block;font-size:9px;font-weight:800;letter-spacing:.6px;color:#3D7B5A}\
#page-workspace-project .pxg-lock b{display:block;font-size:14px;color:#2F4238;margin-top:2px}#page-workspace-project .pxg-lock small{display:block;font-size:10.5px;color:#738078;margin-top:3px;line-height:1.4}\
#page-workspace-project .pxg-lock>div:last-child{display:flex;gap:7px;flex-wrap:wrap}#page-workspace-project .pxg-lock button,.pxg-legacy-flow button{height:34px;padding:0 11px;border:1px solid #BDD7C8;background:#fff;border-radius:8px;color:#376D51;font:750 11px Inter,sans-serif;cursor:pointer}\
#page-workspace-project .pxg-finance-summary{border:1px solid #DCE7EA;background:#fff;border-radius:13px;margin:0 0 12px;overflow:hidden}#page-workspace-project .pxg-finance-summary header{padding:13px 15px;border-bottom:1px solid #E8EEF0}#page-workspace-project .pxg-finance-summary header b{display:block;font-size:14px;color:#2F3F46;margin-top:2px}#page-workspace-project .pxg-finance-summary header small{display:block;font-size:10px;color:#7C898F;margin-top:2px}\
#page-workspace-project .pxg-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.pxg-metric{padding:13px 14px;border-right:1px solid #EDF1F2;border-bottom:1px solid #EDF1F2}.pxg-metric span{display:block;font-size:9px;color:#879399}.pxg-metric b{display:block;font-size:14px;color:#304148;margin-top:3px}.pxg-metric small{display:block;font-size:9px;color:#8C979C;margin-top:2px}.pxg-finance-summary footer{padding:9px 14px;background:#F8FAFB;color:#7B888E;font-size:9.5px}\
.pxg-legacy-flow{display:flex;align-items:center;gap:9px;padding:9px 12px}.pxg-legacy-flow>b{font-size:10px;color:#3D7B5A;margin-right:6px}.pxg-legacy-flow>span{color:#AAB4B8}\
@media(max-width:900px){#page-workspace-project .pxg-lock{align-items:flex-start;flex-direction:column}#page-workspace-project .pxg-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}\
@media(max-width:560px){#page-workspace-project .pxg-metrics{grid-template-columns:1fr}.pxg-legacy-flow{overflow:auto;white-space:nowrap}}';document.head.appendChild(s);
}
function install(){
  if(installing)return true;installing=true;css();wrapLegacyNavigation();wrapCanonical();wrapCommercialCreators();
  window.addEventListener('click',clickCapture,true);
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='global-proj'){cache={id:'',project:null,at:0};setTimeout(function(){refreshState();scheduleDecorate();},0);}},true);
  refreshState();scheduleDecorate();return true;
}

install();
document.addEventListener('pst:modules-ready',function(){wrapLegacyNavigation();wrapCanonical();wrapCommercialCreators();refreshState();scheduleDecorate();},{once:true});
[120,500,1200].forEach(function(ms){setTimeout(function(){wrapLegacyNavigation();wrapCanonical();wrapCommercialCreators();refreshState();},ms);});

window.PSTProjectExecutionGuardV1={
  install:install,isPostAward:isPostAward,locked:locked,refreshState:refreshState,routeExecution:routeExecution,decorate:decorate,financeModel:financeModel,
  _test:{preAwardPage:preAwardPage,preAwardTab:preAwardTab,preAwardAction:preAwardAction,winningQuote:winningQuote,committedOffers:committedOffers,revenueRows:revenueRows,projectMatch:projectMatch,blockedMessage:blockedMessage}
};
})();
