/* PRISTEEL canonical project workflow v1
 * Final UI reconciler for the Project-First workspace.
 * Keeps one project context and one procurement flow while reusing the
 * existing BOM, RFQ, supplier comparison, pricing and client-offer engines.
 * No business-data writes and no outbound communication.
 */
(function(){
'use strict';
if(window.__pstCanonicalProjectWorkflowV1)return;
window.__pstCanonicalProjectWorkflowV1=true;

var AREA_LABELS={
  overview:'Përmbledhja',
  procurement:'Prokurimi',
  execution:'Ekzekutimi',
  finance:'Financat',
  files:'Skedarët',
  communication:'Komunikimi'
};
var STAGES=[
  {id:'bom',label:'BOM'},
  {id:'rfq',label:'RFQ'},
  {id:'offers',label:'Ofertat e furnitorëve'},
  {id:'comparison',label:'Krahasimi i ofertave'},
  {id:'pricing',label:'Çmimi i shitjes'},
  {id:'client_offer',label:'Oferta për klientin'}
];
var state={area:'overview',stage:'bom',projectId:'',origin:null,installed:false};
var base={render:null,mount:null,open:null,flowGoto:null,goBack:null};

function A(v){return Array.isArray(v)?v:[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function O(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;}return'';}
function N(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function data(){return window.__pstIntegrityLastData||null;}
function projectId(){
  var d=data();
  return String(window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||state.projectId||'');
}
function projectName(){
  var d=data(),p=d&&d.project||{};
  return O(p.name,p.project_name,p.ref,'Projekt');
}
function currentPage(){
  var p=document.querySelector('.page.active');
  return p&&p.id&&p.id.indexOf('page-')===0?p.id.slice(5):'';
}
function date(v){
  var d=v?new Date(v):null;
  return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';
}
function money(v,c){
  var n=N(v);
  return n?n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c||'EUR'):'—';
}
function offerTotal(o){return N(o&&O(o.total_eur,o.total_amount,o.total,o.amount,o.gross_amount,o.subtotal));}
function offerText(o){
  var s=o&&o.offer_state||{};
  return norm([o&&o.status,o&&o.state,o&&o.followup_status,o&&o.sent_status,s.status,s.revision_status,s.sent_at,o&&o.sent_at].filter(Boolean).join(' '));
}
function offerSent(o){
  if(!o)return false;
  var s=o.offer_state||{};
  if(o.sent_at||s.sent_at)return true;
  return /\b(sent|derguar|dërguar|submitted|issued)\b/.test(offerText(o));
}
function offerDraft(o){
  if(!o)return false;
  if(offerSent(o))return false;
  return /\b(draft|review|pending|open|pergatit|përgatit)\b/.test(offerText(o))||!!o.created_at;
}
function latestOffer(d){
  var xs=A(d&&d.ourOffers).slice();
  if(d&&d.currentOurOffer&&xs.indexOf(d.currentOurOffer)<0)xs.unshift(d.currentOurOffer);
  xs.sort(function(a,b){
    return new Date(O(b&&b.sent_at,b&&b.updated_at,b&&b.created_at,0)).getTime()-
      new Date(O(a&&a.sent_at,a&&a.updated_at,a&&a.created_at,0)).getTime();
  });
  return xs[0]||null;
}
function projectPhase(d){
  var p=d&&d.project||{},q=latestOffer(d),x=norm(p.pipeline_stage);
  if(q&&offerDraft(q))return'Përgatitje oferte';
  if(q&&offerSent(q))return'Oferta te klienti';
  if(/production|execution|ekzek/.test(x))return'Ekzekutim';
  if(/transport/.test(x))return'Transport';
  if(/pricing|cmim|çmim/.test(x))return'Çmimi i shitjes';
  if(/supplier|furnitor/.test(x))return'Zgjedhje furnitori';
  if(/rfq/.test(x))return'RFQ';
  return O(p.pipeline_stage,'Aktiv');
}
function countFiles(d){
  return A(d&&d.projectDocs).length+A(d&&d.attachmentLinks).length+A(d&&d.inboxDocs).length+
    A(d&&d.docs).length+A(d&&d.mailAttachments).length+A(d&&d.drive&&d.drive.rows).length;
}
function stageState(id,d){
  var b=A(d&&d.bom).length,r=A(d&&d.rfqs).length,o=A(d&&d.supplierOffers).length,q=latestOffer(d);
  if(id==='bom')return b?{tone:'done',label:b+' pozicione'}:{tone:'optional',label:'Pa BOM'};
  if(id==='rfq')return r?{tone:'done',label:r+' RFQ'}:{tone:'attention',label:'Për t’u përgatitur'};
  if(id==='offers')return o?{tone:'done',label:o+' oferta'}:{tone:r?'attention':'upcoming',label:r?'Në pritje':'Pa RFQ'};
  if(id==='comparison')return o?{tone:o>1?'ready':'attention',label:o>1?'Gati':'1 ofertë'}:{tone:'upcoming',label:'Pa oferta'};
  if(id==='pricing')return q&&offerTotal(q)>0?{tone:'done',label:'Ka çmim'}:{tone:o?'attention':'upcoming',label:o?'Kërkon vendim':'Pa kosto'};
  if(id==='client_offer')return q&&offerSent(q)?{tone:'done',label:'Dërguar'}:q?{tone:'attention',label:'Draft'}:{tone:'upcoming',label:'Pa draft'};
  return{tone:'upcoming',label:''};
}
function nextStage(d){
  var r=A(d&&d.rfqs).length,o=A(d&&d.supplierOffers).length,q=latestOffer(d);
  if(!r)return'rfq';
  if(!o)return'offers';
  if(o>0&&(!q||!offerTotal(q)))return'comparison';
  if(!q||!offerTotal(q))return'pricing';
  if(!offerSent(q))return'client_offer';
  return'client_offer';
}
function nextMessage(d){
  var id=nextStage(d),q=latestOffer(d);
  if(id==='rfq')return['Përgatit RFQ','Krijo ose kontrollo kërkesën për furnitorët.'];
  if(id==='offers')return['Mblidh ofertat e furnitorëve','RFQ ekziston. Regjistro ose kontrollo përgjigjet e furnitorëve.'];
  if(id==='comparison')return['Krahaso ofertat','Kontrollo koston reale dhe scope-in para çmimit të shitjes.'];
  if(id==='pricing')return['Vendos çmimin e shitjes','Përcakto marzhin dhe çmimin vetëm pasi kostoja të jetë e qartë.'];
  if(q&&!offerSent(q))return['Finalizo ofertën për klientin','Drafti ekziston por nuk është dërguar. Kontrolloje para dërgimit.'];
  return['Oferta është te klienti','Ruaj projektin në pritje derisa të vijë përgjigje ose follow-up-i.'];
}
function topNav(){
  return Object.keys(AREA_LABELS).map(function(k){
    return'<button type="button" class="pwf-area-btn'+(state.area===k?' on':'')+'" data-pwf-area="'+k+'">'+E(AREA_LABELS[k])+'</button>';
  }).join('');
}
function stageNav(d){
  return STAGES.map(function(s,i){
    var st=stageState(s.id,d);
    return'<button type="button" class="pwf-stage '+E(st.tone)+(state.stage===s.id?' on':'')+'" data-pwf-stage="'+s.id+'">'+
      '<span class="pwf-stage-index">'+(st.tone==='done'?'✓':String(i+1))+'</span>'+
      '<span class="pwf-stage-copy"><b>'+E(s.label)+'</b><small>'+E(st.label)+'</small></span>'+
      '</button>';
  }).join('');
}
function contextBar(d){
  var p=d&&d.project||{},q=latestOffer(d),msg=nextMessage(d);
  return'<section class="pwf-project-context">'+
    '<div class="pwf-project-main"><span>PROJEKTI AKTIV</span><b>'+E(projectName())+'</b><small>'+E([O(p.client,''),projectPhase(d)].filter(Boolean).join(' · '))+'</small></div>'+
    '<div class="pwf-project-kpis">'+
      '<div><span>RFQ</span><b>'+A(d&&d.rfqs).length+'</b></div>'+
      '<div><span>Oferta furnitorësh</span><b>'+A(d&&d.supplierOffers).length+'</b></div>'+
      '<div><span>Oferta klientit</span><b>'+(q?(offerSent(q)?'Dërguar':'Draft'):'—')+'</b></div>'+
      '<div><span>Skedarë</span><b>'+countFiles(d)+'</b></div>'+
    '</div>'+
    '<button type="button" class="pwf-next" data-pwf-stage="'+nextStage(d)+'"><span>HAPI I RADHËS</span><b>'+E(msg[0])+'</b><small>'+E(msg[1])+'</small></button>'+
  '</section>';
}
function stageShell(d){
  return'<section class="pwf-procurement-head">'+
    '<div class="pwf-procurement-title"><span>RRJEDHA E PROKURIMIT</span><b>Nga kërkesa te oferta për klientin</b><small>Çdo hap është i klikueshëm. Statusi tregon çfarë ekziston, jo ku lejohet të hysh.</small></div>'+
    '<div class="pwf-stage-nav">'+stageNav(d)+'</div>'+
  '</section>';
}
function emptyState(title,copy,action,label){
  return'<section class="pwf-empty"><div class="pwf-empty-icon">○</div><div><b>'+E(title)+'</b><p>'+E(copy)+'</p></div>'+
    (action?'<button type="button" class="pf2-btn p" data-pwf-action="'+E(action)+'">'+E(label||'Vazhdo')+'</button>':'')+'</section>';
}
function ourOfferRows(d){
  var xs=A(d&&d.ourOffers);
  if(!xs.length)return emptyState('Nuk ka ofertë për klientin','Krijo një draft vetëm pasi kostoja dhe çmimi i shitjes të jenë kontrolluar.','open-client-offer','Krijo draftin');
  return xs.slice(0,20).map(function(o){
    var st=offerSent(o)?'Dërguar':'Draft',tone=offerSent(o)?'done':'attention';
    return'<div class="pwf-doc-row"><div><span class="pwf-state '+tone+'">'+E(st)+'</span><b>'+E(O(o.doc_nr,o.document_nr,o.reference,'Ofertë'))+'</b><small>'+E([date(O(o.sent_at,o.updated_at,o.created_at)),money(offerTotal(o),o.currency||'EUR')].join(' · '))+'</small></div>'+
      '<button type="button" class="pf2-btn" data-pwf-action="open-client-offer">Hap / edito</button></div>';
  }).join('');
}
function pricingView(d){
  var offers=A(d&&d.supplierOffers),q=latestOffer(d),msg=nextMessage(d);
  var priced=offers.map(function(o){
    var t=N(O(o.total_eur,o.total_amount,o.total));
    return t>0?{name:O(o.supplier,o.supplier_name,'Furnitor'),total:t,currency:o.currency||'EUR'}:null;
  }).filter(Boolean).sort(function(a,b){return a.total-b.total;});
  var ref=priced[0];
  return'<div class="pwf-focus-grid">'+
    '<section class="pwf-focus-card"><span>KOSTO REFERENCE</span><b>'+(ref?E(money(ref.total,ref.currency)):'—')+'</b><small>'+(ref?E(ref.name):'Nuk ka total të krahasueshëm ende')+'</small></section>'+
    '<section class="pwf-focus-card"><span>ÇMIMI AKTUAL I SHITJES</span><b>'+(q&&offerTotal(q)?E(money(offerTotal(q),q.currency||'EUR')):'—')+'</b><small>'+(q?E(O(q.doc_nr,q.reference,'Drafti aktual')):'Nuk ka draft të ofertës')+'</small></section>'+
    '<section class="pwf-focus-card wide"><span>VENDIMI</span><b>'+E(msg[0])+'</b><small>'+E(msg[1])+'</small><div class="pwf-actions"><button type="button" class="pf2-btn p" data-pwf-action="open-pricing">Hap kalkulatorin e çmimit</button><button type="button" class="pf2-btn" data-pwf-stage="comparison">Kthehu te krahasimi</button></div></section>'+
  '</div>';
}
function clientOfferView(d){
  var q=latestOffer(d),sent=q&&offerSent(q);
  return'<div class="pwf-focus-grid">'+
    '<section class="pwf-focus-card wide"><span>OFERTA PËR KLIENTIN</span><b>'+(sent?'Oferta është dërguar':'Dokumenti mbetet human-gated')+'</b>'+
      '<small>'+(sent?'Dokumenti i dërguar ruhet si histori komerciale. Ndryshimet bëhen si revizion i ri.':'PPPP mund ta përgatisë draftin, por çmimi final dhe dërgimi kërkojnë veprim të qartë nga përdoruesi.')+'</small>'+
      '<div class="pwf-actions"><button type="button" class="pf2-btn p" data-pwf-action="open-client-offer">'+(q?'Hap / edito ofertën':'Krijo ofertë draft')+'</button><button type="button" class="pf2-btn" data-pwf-stage="pricing">Kontrollo çmimin</button></div></section>'+
    '<section class="pwf-list-card"><header><b>Dokumentet e ofertës</b><span>'+A(d&&d.ourOffers).length+' dokumente</span></header>'+ourOfferRows(d)+'</section>'+
  '</div>';
}
function findCard(title){
  var p=document.getElementById('page-workspace-project');
  if(!p)return null;
  var cards=[].slice.call(p.querySelectorAll('.pf2-card'));
  return cards.filter(function(c){
    var b=c.querySelector('header b');
    return b&&String(b.textContent||'').trim()===title;
  })[0]||null;
}
function hideCard(title){
  var c=findCard(title);
  if(c)c.classList.add('pwf-hidden');
}
function retargetBaseActions(stage){
  var body=document.getElementById('pst-pi-body');
  if(!body)return;
  if(stage==='bom'){
    body.querySelectorAll('[data-pf2-action="rfq"]').forEach(function(b){b.removeAttribute('data-pf2-action');b.setAttribute('data-pwf-stage','rfq');b.textContent='Vazhdo te RFQ';});
    body.querySelectorAll('[data-pf2-action="legacy-bom"]').forEach(function(b){b.removeAttribute('data-pf2-action');b.setAttribute('data-pwf-action','open-bom');});
  }
  if(stage==='rfq'){
    body.querySelectorAll('[data-pf2-action="rfq"]').forEach(function(b){b.removeAttribute('data-pf2-action');b.setAttribute('data-pwf-action','open-rfq');b.textContent='Përgatit / hap RFQ';});
  }
  if(stage==='offers'){
    body.querySelectorAll('[data-pf2-action="offer"]').forEach(function(b){b.classList.add('pwf-hidden');});
  }
}
function procurementBody(stage,d){
  var body=document.getElementById('pst-pi-body');
  if(!body)return false;
  if(stage==='pricing'){
    body.innerHTML=pricingView(d);
  }else if(stage==='client_offer'){
    body.innerHTML=clientOfferView(d);
  }else{
    retargetBaseActions(stage);
    if(stage==='rfq'){
      hideCard('Oferta furnitorësh');
    }else if(stage==='offers'){
      hideCard('Ofertat tona');
      var c=findCard('Oferta furnitorësh');
      if(c&&A(d&&d.supplierOffers).length===0){
        var target=c.querySelector('header+div');
        if(target)target.innerHTML=emptyState('Ende nuk ka oferta të furnitorëve','RFQ-të mbeten të lidhura me projektin. Kur vjen përgjigjja, oferta duhet të shfaqet këtu dhe pastaj te krahasimi.','open-gmail','Kontrollo komunikimin');
      }
    }else if(stage==='comparison'){
      hideCard('Ofertat tona');
      if(window.PSTProjectFirstCommercialV1&&typeof window.PSTProjectFirstCommercialV1.inject==='function'){
        try{window.PSTProjectFirstCommercialV1.inject();}catch(e){warn('comparison inject',e);}
      }
      if(!A(d&&d.supplierOffers).length){
        body.insertAdjacentHTML('beforeend',emptyState('Nuk ka çfarë të krahasohet','Regjistro së pari një ofertë furnitori. Tabela e krahasimit nuk duhet të jetë një faqe e bardhë.','',''));
      }
    }
  }
  body.insertAdjacentHTML('afterbegin',stageShell(d));
  body.insertAdjacentHTML('afterbegin',contextBar(d));
  body.classList.add('pwf-body','pwf-procurement','pwf-stage-'+stage);
  return true;
}
function areaContext(area,d){
  var body=document.getElementById('pst-pi-body');
  if(!body)return;
  body.insertAdjacentHTML('afterbegin',contextBar(d));
  body.classList.add('pwf-body','pwf-area-'+area);
}
function decorateTopNav(){
  var page=document.getElementById('page-workspace-project'),tabs=page&&page.querySelector('.pst-pi-tabs');
  if(!tabs)return false;
  tabs.classList.add('pwf-area-nav');
  tabs.innerHTML=topNav();
  return true;
}
function clearBodyClasses(){
  var body=document.getElementById('pst-pi-body');
  if(!body)return;
  [].slice.call(body.classList).forEach(function(c){if(c.indexOf('pwf-')===0)body.classList.remove(c);});
}
function baseTab(area,stage){
  if(area==='overview')return'overview';
  if(area==='communication')return'communication';
  if(area==='files')return'files';
  if(area==='execution')return'execution';
  if(area==='finance')return'finance';
  if(area==='procurement'){
    if(stage==='bom')return'bom';
    if(stage==='rfq')return'procurement';
    return'commercial';
  }
  return'overview';
}
function render(area,stage){
  var d=data();
  if(!d||!window.PSTProjectFirstV2||!base.render)return false;
  state.area=AREA_LABELS[area]?area:'overview';
  if(stage&&STAGES.some(function(s){return s.id===stage;}))state.stage=stage;
  if(state.area==='procurement'&&!state.stage)state.stage=nextStage(d);
  state.projectId=projectId();

  clearBodyClasses();
  try{base.render(baseTab(state.area,state.stage));}catch(e){warn('base render',e);return false;}
  clearBodyClasses();
  decorateTopNav();

  if(state.area==='procurement')procurementBody(state.stage,d);
  else areaContext(state.area,d);

  var page=document.getElementById('page-workspace-project');
  if(page){page.classList.add('pwf-canonical');page.setAttribute('data-pwf-area',state.area);page.setAttribute('data-pwf-stage',state.stage||'');}
  return true;
}
function refreshAndRender(area,stage){
  var id=projectId(),I=window.PSTProjectDataIntegrity;
  if(id&&I&&typeof I.load==='function'){
    return Promise.resolve(I.load(id)).then(function(fresh){
      if(fresh)window.__pstIntegrityLastData=fresh;
      render(area,stage);
      return true;
    }).catch(function(e){warn('refresh',e);render(area,stage);return false;});
  }
  return Promise.resolve(render(area,stage));
}
function activateProject(id){
  id=String(id||projectId());
  if(!id)return;
  state.projectId=id;
  window.__pstCurrentProjectId=id;
  window._curProjId=id;
  try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  var s=document.getElementById('global-proj');if(s)s.value=id;
}
function rememberLegacy(stage,page){
  var o={projectId:projectId(),stage:stage||state.stage||'bom',area:'procurement',page:page||'',at:Date.now()};
  state.origin=o;
  window.__pstCanonicalProjectWorkflowOrigin=o;
  return o;
}
function origin(){
  var o=state.origin||window.__pstCanonicalProjectWorkflowOrigin;
  if(!o||!o.projectId)return null;
  if(o.at&&Date.now()-o.at>6*60*60*1000)return null;
  return o;
}
function legacyPageEl(){
  var p=document.querySelector('.page.active');
  return p&&p.id!=='page-workspace-project'?p:null;
}
function decorateLegacy(pageName,stage){
  var page=legacyPageEl();
  if(!page)return false;
  page.classList.add('pwf-legacy-page');
  page.setAttribute('data-pwf-stage',stage||'');
  var old=page.querySelector('#pwf-legacy-context');
  if(old)old.remove();

  var o=origin(),id=o&&o.projectId||projectId();
  var ctx=document.createElement('section');
  ctx.id='pwf-legacy-context';
  var step=STAGES.filter(function(s){return s.id===stage;})[0]||{};
  ctx.innerHTML='<div><span>PROJEKTI</span><b>'+E(projectName())+'</b><small>'+E(AREA_LABELS.procurement+' · '+O(step.label,''))+'</small></div>'+
    '<button type="button" class="pf2-btn p" data-pwf-action="return-project">← Kthehu te rrjedha e projektit</button>';
  page.insertBefore(ctx,page.firstChild);

  var fs=page.querySelector('.flow-step');
  if(fs){
    var holder=fs.parentElement;
    if(holder)holder.classList.add('pwf-old-flow-hidden');
  }
  var back=page.querySelector('#modbar-back');
  if(back&&back.parentElement)back.parentElement.classList.add('pwf-legacy-topbar-context');
  activateProject(id);
  return true;
}
function afterLegacy(page,stage){
  [0,80,220,500].forEach(function(ms){setTimeout(function(){decorateLegacy(page,stage);},ms);});
}
function callLegacy(page,stage,fn){
  rememberLegacy(stage,page);
  activateProject(projectId());
  try{
    var out=fn&&fn();
    afterLegacy(page,stage);
    return out===undefined?true:out;
  }catch(e){warn('legacy '+page,e);return false;}
}
function openBom(){
  return callLegacy('bom','bom',function(){
    if(typeof window.pstPiLegacy==='function')return window.pstPiLegacy('bom');
    if(typeof base.flowGoto==='function')return base.flowGoto('bom');
    if(typeof window.showPage==='function')return window.showPage('bom');
  });
}
function openRfq(){
  return callLegacy('rfq','rfq',function(){
    if(typeof window.pstPiLegacy==='function')return window.pstPiLegacy('rfq');
    if(typeof base.flowGoto==='function')return base.flowGoto('rfq');
    if(typeof window.showPage==='function')return window.showPage('rfq');
  });
}
function openPricing(){
  return callLegacy('kalkulator','pricing',function(){
    if(typeof base.flowGoto==='function')return base.flowGoto('kalkulator');
    if(typeof window.flowGoto==='function'&&window.flowGoto!==base.flowGoto)return window.flowGoto('kalkulator');
    if(typeof window.showPage==='function')return window.showPage('kalkulator');
  });
}
function openClientOffer(){
  return callLegacy('oferta','client_offer',function(){
    if(typeof window.pstPiNew==='function')return window.pstPiNew('offer');
    if(window.PSTCommercialNavigationFixV1&&typeof window.PSTCommercialNavigationFixV1.createDocument==='function')return window.PSTCommercialNavigationFixV1.createDocument('offer');
    if(typeof window.showPage==='function')return window.showPage('oferta');
  });
}
function openGmail(){
  if(typeof window.pstPiGmail==='function')return window.pstPiGmail();
  render('communication');
}
function returnProject(){
  var o=origin(),id=o&&o.projectId||projectId(),stage=o&&o.stage||state.stage||'bom';
  if(!id)return false;
  activateProject(id);
  var open=base.open||window.pstOpenProjectWorkspace;
  try{
    Promise.resolve(open&&open(id)).then(function(){
      activateProject(id);
      refreshAndRender('procurement',stage);
      state.origin=null;window.__pstCanonicalProjectWorkflowOrigin=null;
    }).catch(function(e){warn('return project',e);render('procurement',stage);});
    return true;
  }catch(e){warn('return project',e);return false;}
}
function warn(label,e){try{console.warn('PPPP canonical workflow '+label+':',e);}catch(x){}}
function installOpenBridge(){
  if(typeof window.pstOpenProjectWorkspace!=='function')return false;
  if(window.pstOpenProjectWorkspace.__pwfCanonical)return true;
  base.open=window.pstOpenProjectWorkspace;
  var wrapped=async function(id){
    var r=await base.open.apply(this,arguments);
    activateProject(id);
    state.area='overview';
    var d=data();
    state.stage=d?nextStage(d):'bom';
    render('overview');
    return r;
  };
  wrapped.__pwfCanonical=true;wrapped.__base=base.open;
  window.pstOpenProjectWorkspace=wrapped;
  return true;
}
function installProjectFirstBridge(){
  var P=window.PSTProjectFirstV2;
  if(!P||typeof P.render!=='function')return false;
  if(!base.render)base.render=P.render;
  if(!base.mount&&typeof P.mount==='function')base.mount=P.mount;
  if(P.render.__pwfCanonical)return true;
  var r=function(tab){
    if(tab==='communication'||tab==='files'||tab==='execution'||tab==='finance'||tab==='overview')return render(tab);
    if(tab==='bom')return render('procurement','bom');
    if(tab==='procurement')return render('procurement','rfq');
    if(tab==='commercial')return render('procurement','comparison');
    return render('overview');
  };
  r.__pwfCanonical=true;r.__base=base.render;
  P.render=r;
  if(typeof P.mount==='function'){
    P.mount=async function(id,reset){
      var out=await base.mount.apply(this,arguments);
      activateProject(id);
      var d=data();
      if(reset){state.area='overview';state.stage=d?nextStage(d):'bom';}
      render(state.area,state.stage);
      return out;
    };
    P.mount.__pwfCanonical=true;P.mount.__base=base.mount;
  }
  return true;
}
function installLegacyNavigationBridge(){
  if(typeof window.flowGoto==='function'&&!base.flowGoto)base.flowGoto=window.flowGoto;
  if(typeof window.goBack==='function'&&!base.goBack)base.goBack=window.goBack;
}
function handleAction(action){
  if(action==='open-bom')return openBom();
  if(action==='open-rfq')return openRfq();
  if(action==='open-pricing')return openPricing();
  if(action==='open-client-offer')return openClientOffer();
  if(action==='open-gmail')return openGmail();
  if(action==='return-project')return returnProject();
  if(action==='refresh')return refreshAndRender(state.area,state.stage);
}
function click(e){
  var t=e.target&&e.target.closest?e.target.closest('[data-pwf-area],[data-pwf-stage],[data-pwf-action]'):null;
  if(!t)return;
  if(t.hasAttribute('data-pwf-area')){
    e.preventDefault();e.stopImmediatePropagation();
    var a=t.getAttribute('data-pwf-area');
    if(a==='procurement')return render('procurement',state.stage||nextStage(data()));
    return render(a);
  }
  if(t.hasAttribute('data-pwf-stage')){
    e.preventDefault();e.stopImmediatePropagation();
    return render('procurement',t.getAttribute('data-pwf-stage'));
  }
  if(t.hasAttribute('data-pwf-action')){
    e.preventDefault();e.stopImmediatePropagation();
    return handleAction(t.getAttribute('data-pwf-action'));
  }
}
function css(){
  if(document.getElementById('pwf-canonical-css'))return;
  var s=document.createElement('style');s.id='pwf-canonical-css';
  s.textContent=
  '#page-workspace-project.pwf-canonical .pst-pi-tabs.pwf-area-nav{display:flex!important;gap:6px!important;padding:6px!important;margin:0 0 14px!important;border:1px solid #DCE7EA!important;border-radius:12px!important;background:#F7FAFB!important;overflow:auto!important}'+
  '#page-workspace-project .pwf-area-btn{border:0;background:transparent;color:#6D7A80;border-radius:8px;min-height:38px;padding:0 14px;font:700 12.5px Inter,sans-serif;white-space:nowrap;cursor:pointer}'+
  '#page-workspace-project .pwf-area-btn:hover{background:#EEF5F7;color:#3F7F98}#page-workspace-project .pwf-area-btn.on{background:#fff;color:#34758F;box-shadow:0 1px 5px #2341}'+
  '#page-workspace-project .pwf-project-context{display:grid;grid-template-columns:minmax(250px,1.1fr) minmax(360px,1fr) minmax(300px,.9fr);gap:12px;align-items:stretch;margin:0 0 12px}'+
  '#page-workspace-project .pwf-project-main,#page-workspace-project .pwf-project-kpis,#page-workspace-project .pwf-next{border:1px solid #DCE7EA;background:#fff;border-radius:13px}'+
  '#page-workspace-project .pwf-project-main{padding:13px 15px;min-width:0}#page-workspace-project .pwf-project-main span,#page-workspace-project .pwf-next span,#page-workspace-project .pwf-procurement-title span,#page-workspace-project .pwf-focus-card>span{display:block;font-size:9px;font-weight:800;letter-spacing:.65px;color:#5B9BB3}'+
  '#page-workspace-project .pwf-project-main b{display:block;font-size:15px;line-height:1.25;color:#293940;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}#page-workspace-project .pwf-project-main small{display:block;font-size:11px;color:#7D898E;margin-top:4px}'+
  '#page-workspace-project .pwf-project-kpis{display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden}#page-workspace-project .pwf-project-kpis>div{padding:11px;border-right:1px solid #E8EEF0}#page-workspace-project .pwf-project-kpis>div:last-child{border-right:0}#page-workspace-project .pwf-project-kpis span{display:block;font-size:9px;color:#859197}#page-workspace-project .pwf-project-kpis b{display:block;font-size:13px;color:#304047;margin-top:3px}'+
  '#page-workspace-project .pwf-next{text-align:left;padding:11px 13px;cursor:pointer}#page-workspace-project .pwf-next:hover{border-color:#9FC5D3;background:#F7FBFC}#page-workspace-project .pwf-next b{display:block;font-size:12px;color:#314148;margin-top:2px}#page-workspace-project .pwf-next small{display:block;font-size:10px;line-height:1.35;color:#7B888E;margin-top:3px}'+
  '#page-workspace-project .pwf-procurement-head{border:1px solid #DCE7EA;background:#fff;border-radius:14px;padding:14px 15px;margin-bottom:12px}#page-workspace-project .pwf-procurement-title b{display:block;font-size:14px;color:#2E3E45;margin-top:2px}#page-workspace-project .pwf-procurement-title small{display:block;font-size:10.5px;color:#7E8A90;margin-top:3px}'+
  '#page-workspace-project .pwf-stage-nav{display:grid;grid-template-columns:repeat(6,minmax(128px,1fr));gap:7px;margin-top:13px;overflow:auto;padding-bottom:2px}#page-workspace-project .pwf-stage{display:flex;align-items:center;gap:8px;min-width:128px;border:1px solid #DDE6E9;background:#fff;border-radius:10px;padding:9px 10px;text-align:left;cursor:pointer}#page-workspace-project .pwf-stage:hover{border-color:#A8CBD7;background:#F7FBFC}#page-workspace-project .pwf-stage.on{border-color:#5B9BB3;background:#EDF7FA;box-shadow:inset 0 0 0 1px #5B9BB3}'+
  '#page-workspace-project .pwf-stage-index{width:25px;height:25px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:#EFF3F4;color:#7C898F;font:800 10px Inter,sans-serif}#page-workspace-project .pwf-stage.done .pwf-stage-index{background:#E8F5EE;color:#2F7657}#page-workspace-project .pwf-stage.attention .pwf-stage-index{background:#FFF1DA;color:#98631D}#page-workspace-project .pwf-stage.ready .pwf-stage-index{background:#EAF5F8;color:#3F7F98}#page-workspace-project .pwf-stage.on .pwf-stage-index{background:#5B9BB3;color:#fff}'+
  '#page-workspace-project .pwf-stage-copy{min-width:0}#page-workspace-project .pwf-stage-copy b{display:block;font-size:11px;line-height:1.2;color:#39484F}#page-workspace-project .pwf-stage-copy small{display:block;font-size:9px;color:#89959A;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '#page-workspace-project .pwf-hidden{display:none!important}#page-workspace-project .pwf-empty{display:flex;align-items:center;gap:12px;padding:16px;border:1px dashed #CBDADF;background:#FAFCFD;border-radius:11px;margin:10px}#page-workspace-project .pwf-empty-icon{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#EFF5F7;color:#5B9BB3;font-size:19px}#page-workspace-project .pwf-empty>div:nth-child(2){flex:1}#page-workspace-project .pwf-empty b{display:block;font-size:13px;color:#34444B}#page-workspace-project .pwf-empty p{font-size:11px;line-height:1.45;color:#7B888E;margin:3px 0 0}'+
  '#page-workspace-project .pwf-focus-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}#page-workspace-project .pwf-focus-card,#page-workspace-project .pwf-list-card{border:1px solid #DCE7EA;background:#fff;border-radius:13px;padding:16px}#page-workspace-project .pwf-focus-card.wide,#page-workspace-project .pwf-list-card{grid-column:1/-1}#page-workspace-project .pwf-focus-card>b{display:block;font-size:20px;color:#293A41;margin-top:5px}#page-workspace-project .pwf-focus-card>small{display:block;font-size:11px;line-height:1.5;color:#7B888E;margin-top:4px}#page-workspace-project .pwf-actions{display:flex;gap:8px;margin-top:13px;flex-wrap:wrap}'+
  '#page-workspace-project .pwf-list-card{padding:0;overflow:hidden}#page-workspace-project .pwf-list-card>header{display:flex;justify-content:space-between;gap:10px;padding:13px 15px;border-bottom:1px solid #E8EEF0}#page-workspace-project .pwf-list-card>header b{font-size:13px}#page-workspace-project .pwf-list-card>header span{font-size:10px;color:#859197}#page-workspace-project .pwf-doc-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 15px;border-bottom:1px solid #EEF2F3}#page-workspace-project .pwf-doc-row>div{min-width:0}#page-workspace-project .pwf-doc-row b{display:block;font-size:12px;color:#34444B;margin-top:4px}#page-workspace-project .pwf-doc-row small{display:block;font-size:10px;color:#879399;margin-top:2px}.pwf-state{display:inline-flex;font-size:9px;font-weight:800;border-radius:999px;padding:2px 7px;background:#EFF3F4;color:#718087}.pwf-state.done{background:#E8F5EE;color:#2F7657}.pwf-state.attention{background:#FFF1DA;color:#91621E}'+
  '.pwf-legacy-page #pwf-legacy-context{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 18px;margin:0;border-bottom:1px solid #DCE7EA;background:#F7FAFB;position:relative;z-index:4}.pwf-legacy-page #pwf-legacy-context>div{min-width:0}.pwf-legacy-page #pwf-legacy-context span{display:block;font-size:9px;font-weight:800;letter-spacing:.65px;color:#5B9BB3}.pwf-legacy-page #pwf-legacy-context b{display:block;font-size:14px;color:#293940;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pwf-legacy-page #pwf-legacy-context small{display:block;font-size:10px;color:#7E8A90;margin-top:2px}.pwf-legacy-page .pwf-old-flow-hidden{display:none!important}'+
  '@media(max-width:1180px){#page-workspace-project .pwf-project-context{grid-template-columns:1fr 1fr}#page-workspace-project .pwf-next{grid-column:1/-1}#page-workspace-project .pwf-stage-nav{grid-template-columns:repeat(6,150px)}}'+
  '@media(max-width:760px){#page-workspace-project .pwf-project-context,#page-workspace-project .pwf-focus-grid{grid-template-columns:1fr}#page-workspace-project .pwf-project-kpis{grid-column:1/-1;grid-template-columns:repeat(2,1fr)}#page-workspace-project .pwf-focus-card.wide{grid-column:auto}.pwf-legacy-page #pwf-legacy-context{align-items:flex-start;flex-direction:column}}';
  document.head.appendChild(s);
}
function install(){
  if(state.installed)return true;
  var P=window.PSTProjectFirstV2;
  if(!P||typeof P.render!=='function')return false;
  css();
  base.render=P.render;
  base.mount=typeof P.mount==='function'?P.mount:null;
  installLegacyNavigationBridge();
  installProjectFirstBridge();
  installOpenBridge();
  document.addEventListener('click',click,true);
  state.installed=true;

  var id=projectId();
  if(id&&document.getElementById('page-workspace-project')&&document.getElementById('page-workspace-project').classList.contains('active')){
    state.projectId=id;
    state.stage=nextStage(data());
    render('overview');
  }
  return true;
}
document.addEventListener('pst:modules-ready',function(){
  if(!install())setTimeout(install,80);
  setTimeout(function(){
    if(state.installed&&currentPage()==='workspace-project')render(state.area,state.stage);
  },160);
},{once:true});
[0,120,420,900].forEach(function(ms){setTimeout(function(){if(!state.installed)install();},ms);});

window.PSTCanonicalProjectWorkflowV1={
  install:install,
  render:render,
  refresh:refreshAndRender,
  returnProject:returnProject,
  openPricing:openPricing,
  openClientOffer:openClientOffer,
  _test:{
    nextStage:nextStage,
    stageState:stageState,
    offerSent:offerSent,
    offerDraft:offerDraft,
    latestOffer:latestOffer
  }
};
})();