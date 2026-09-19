/* PRISTEEL Projects Mindmap v1
 * Presentation/navigation layer for the Projects register and Project Workspace.
 * Reuses canonical project rows, Project-First data and canonical workflow actions.
 * No Supabase writes, no supplier selection, no pricing commitment and no outbound actions.
 */
(function(){
'use strict';
if(window.__pstProjectMindmapV1)return;
window.__pstProjectMindmapV1=true;

var BRAND='#5B9BB3',BRAND_DEEP='#3F7F98';
var VIEW_KEY='pristeel_projects_presentation_view_v1';
var state={view:'mindmap',focus:'',closedOpen:false,installed:false,lastProjectId:'',projectMapCollapsed:false};
var bridges={};

function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function num(v){var n=parseFloat(S(v).replace(',','.'));return isFinite(n)?n:0;}
function pick(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&S(v).trim()!=='')return v;}return'';}
function dateValue(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.getTime():0;}
function money(v,c){var n=num(v);return n?n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c||'EUR'):'—';}
function currentProjectRows(){return A(window.__pstWorkspaceProjectRows||window._allProjectsCache||window.projects||window.PST_PROJECTS);}
function projectData(){return window.__pstIntegrityLastData||null;}
function currentProjectId(){var d=projectData();return S(window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'');}

function terminalKind(row){
  var s=N(row&&row.status);
  if(/humb|lost|cancel|refuz/.test(s))return'lost';
  if(s==='fituar'||s==='won'||s==='closedwon'||/\bfituar\b/.test(s))return'won';
  if(/arkiv|archiv|realizuar|mbyllur|closed/.test(s))return'closed';
  return'';
}
function execution(row){
  var t=terminalKind(row);if(t==='lost'||t==='closed')return false;
  var s=N([row&&row.operational_state,row&&row.status,row&&row.pipeline_stage].join(' '));
  return t==='won'||/execution|realiz|production|prodhim|factory_audit|transport/.test(s);
}
function waiting(row){
  if(terminalKind(row)||execution(row))return false;
  var op=N(row&&row.operational_state),s=N(row&&row.status);
  if(/^wait_/.test(op))return true;
  if(/action_required|active_work|execution/.test(op))return false;
  return /pritje|waiting|pending/.test(s);
}
function needsAction(row){return !terminalKind(row)&&!execution(row)&&!waiting(row);}
function primaryGroup(row){var t=terminalKind(row);return t||'offered';}
function projectGroups(rows){
  var out={offered:[],won:[],lost:[],action:[],closed:[]};
  A(rows).forEach(function(r){var k=primaryGroup(r);if(out[k])out[k].push(r);if(needsAction(r))out.action.push(r);});
  Object.keys(out).forEach(function(k){out[k].sort(function(a,b){return dateValue(pick(b.last_activity_at,b.last_email_at,b.updated_at,b.created_at))-dateValue(pick(a.last_activity_at,a.last_email_at,a.updated_at,a.created_at));});});
  return out;
}
function stageLabel(row){
  var s=S(row&&row.pipeline_stage);
  var map={rfq_in:'Kërkesë / RFQ',technical_review:'Shqyrtim teknik',supplier_selection:'Furnitorë',pricing:'Çmimi',client_offer:'Oferta jonë',commercial:'Te klienti',production_control:'Prodhim',factory_audit:'Auditim',transport:'Dorëzim'};
  return map[s]||S(row&&row.status)||'Projekt';
}
function cardSub(row){return [pick(row&&row.client,''),stageLabel(row)].filter(Boolean).join(' · ');}
function projectCard(row,tone){
  return '<button type="button" class="pmm-project-card" data-pmm-open="'+E(row&&row.id)+'" data-pmm-tone="'+E(tone||'offered')+'">'+
    '<span class="pmm-project-icon">'+(tone==='won'?'✓':tone==='lost'?'×':tone==='action'?'!':'◇')+'</span>'+
    '<span class="pmm-project-copy"><b>'+E(pick(row&&row.name,row&&row.project_name,'Pa emër'))+'</b><small>'+E(cardSub(row))+'</small></span><span class="pmm-chevron">›</span></button>';
}
function previewStack(rows,tone,side){
  var xs=A(rows).slice(0,3),more=Math.max(0,A(rows).length-xs.length);
  return '<div class="pmm-project-stack '+side+'" data-pmm-stack="'+tone+'">'+xs.map(function(r){return projectCard(r,tone);}).join('')+
    (more?'<button type="button" class="pmm-more" data-pmm-focus="'+tone+'">+'+more+' projekte · shiko të gjitha</button>':'')+'</div>';
}
function branchNode(key,label,count,subtitle,icon){
  return '<button type="button" class="pmm-branch pmm-branch-'+key+'" data-pmm-focus="'+key+'"><span class="pmm-branch-icon">'+icon+'</span><span><b>'+E(label)+'</b><small>'+Number(count||0)+' projekte'+(subtitle?' · '+E(subtitle):'')+'</small></span></button>';
}
function focusTitle(k){return({offered:'Projektet e ofertuara',won:'Projektet e fituara',lost:'Projektet e humbura',action:'Projektet që kërkojnë reagim',closed:'Projektet e mbyllura'})[k]||'Projektet';}
function focusPanel(groups){
  var k=state.focus;if(!k)return'';var rows=A(groups[k]);
  return '<section class="pmm-focus-panel" data-pmm-focus-panel="'+E(k)+'"><header><div><span>FOKUS</span><b>'+E(focusTitle(k))+'</b><small>'+rows.length+' projekte</small></div><button type="button" data-pmm-focus-clear>×</button></header><div class="pmm-focus-grid">'+
    (rows.length?rows.map(function(r){return projectCard(r,k);}).join(''):'<div class="pmm-empty">Nuk ka projekte në këtë grup.</div>')+'</div></section>';
}
function projectsMapHtml(rows){
  var g=projectGroups(rows),total=g.offered.length+g.won.length+g.lost.length+g.closed.length;
  return '<div class="pmm-canvas-wrap"><div class="pmm-canvas" id="pmm-projects-canvas">'+
    '<svg class="pmm-connectors" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">'+
      '<circle cx="500" cy="305" r="92"/><circle cx="500" cy="305" r="142"/><circle cx="500" cy="305" r="194"/>'+
      '<path d="M455 285 C420 260 410 180 362 160"/><path d="M545 285 C580 260 590 180 638 160"/>'+
      '<path d="M455 330 C420 350 410 430 362 450"/><path d="M545 330 C580 350 590 430 638 450"/>'+
      '<path d="M500 350 C500 405 500 475 500 525"/>'+
      '<path class="pmm-soft" d="M310 160 C255 160 225 160 190 160"/><path class="pmm-soft" d="M690 160 C745 160 775 160 810 160"/>'+
      '<path class="pmm-soft" d="M310 450 C255 450 225 450 190 450"/><path class="pmm-soft" d="M690 450 C745 450 775 450 810 450"/>'+
    '</svg>'+
    '<div class="pmm-center"><span class="pmm-center-mark">⌘</span><div><b>PPPP Projects</b><small>'+total+' projekte</small></div></div>'+
    branchNode('offered','Ofertuara',g.offered.length,'në portofol','◇')+
    branchNode('won','Fituara',g.won.length,'','✓')+
    branchNode('action','Kërkojnë reagim',g.action.length,'','!')+
    branchNode('lost','Humbura',g.lost.length,'','×')+
    '<button type="button" class="pmm-closed" data-pmm-focus="closed"><span>▣</span><b>Closed</b><small>'+g.closed.length+' projekte</small><i>›</i></button>'+
    previewStack(g.offered,'offered','left top')+previewStack(g.won,'won','right top')+previewStack(g.action,'action','left bottom')+previewStack(g.lost,'lost','right bottom')+
  '</div></div>'+focusPanel(g);
}
function ensureProjectsChrome(page){
  var head=page.querySelector('.pst-pm-head');if(!head)return;
  if(!head.querySelector('.pmm-back')){
    var back=document.createElement('button');back.type='button';back.className='pmm-back';back.setAttribute('data-pmm-back','1');back.innerHTML='<span>←</span> Kthehu';head.insertBefore(back,head.firstChild);
  }
  var actions=head.querySelector('.pst-pm-head-actions');if(actions&&!actions.querySelector('.pmm-view-toggle')){
    var toggle=document.createElement('div');toggle.className='pmm-view-toggle';toggle.innerHTML='<button type="button" data-pmm-view="mindmap">⌘ <span>Mindmap</span></button><button type="button" data-pmm-view="list">☷ <span>Listë</span></button>';actions.appendChild(toggle);
  }
  var title=page.querySelector('.pst-pm-title');if(title)title.textContent='Projects';
  var sub=page.querySelector('.pst-pm-sub');if(sub)sub.textContent='Projektet sipas gjendjes reale. Kliko një degë për fokus ose një projekt për ta hapur.';
}
function decorateProjects(){
  var page=document.getElementById('page-workspace-projects');if(!page||!page.classList.contains('active'))return false;
  var shell=page.querySelector('.pst-pm-page'),content=document.getElementById('pst-pm-content');if(!shell||!content)return false;
  ensureProjectsChrome(page);
  page.classList.add('pmm-enabled');page.setAttribute('data-pmm-view',state.view);
  var root=document.getElementById('pst-projects-mindmap-v1');
  if(!root){root=document.createElement('div');root.id='pst-projects-mindmap-v1';content.parentNode.insertBefore(root,content);}
  if(state.view==='mindmap')root.innerHTML=projectsMapHtml(currentProjectRows());
  var toggle=page.querySelectorAll('[data-pmm-view]');Array.prototype.forEach.call(toggle,function(b){b.classList.toggle('on',b.getAttribute('data-pmm-view')===state.view);});
  return true;
}
function setProjectsView(v){state.view=v==='list'?'list':'mindmap';try{localStorage.setItem(VIEW_KEY,state.view);}catch(e){}decorateProjects();}
function openProject(id){
  id=S(id).trim();if(!id)return false;
  window.__pstCurrentProjectId=id;window._curProjId=id;try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  if(typeof window.pstOpenProjectWorkspace==='function'){window.pstOpenProjectWorkspace(id);return true;}
  if(typeof window.loadProject==='function'){window.loadProject(id);return true;}
  return false;
}
function goBackProjects(){
  state.focus='';
  var home=document.getElementById('page-workspace-home');

  if(typeof window.pstWorkspaceGo==='function'){
    try{
      window.pstWorkspaceGo('home');
    }catch(e){
      console.warn('PRISTEEL projects back route:',e);
    }
  }

  home=document.getElementById('page-workspace-home');
  if(home&&home.classList.contains('active')&&(!home.style||home.style.display!=='none')){
    return true;
  }

  if(typeof window.goHome==='function'){
    try{
      window.goHome();
    }catch(e){
      console.warn('PRISTEEL projects back fallback:',e);
    }
  }

  home=document.getElementById('page-workspace-home');
  return !!(
    home &&
    home.classList.contains('active') &&
    (!home.style || home.style.display!=='none')
  );
}

function supplierName(o){return pick(o&&o.supplier,o&&o.supplier_name,o&&o.company,'Furnitor');}
function offerTotal(o){return num(pick(o&&o.total_eur,o&&o.total_amount,o&&o.total,o&&o.amount));}
function offerPriceKg(o){return num(pick(o&&o.price_kg,o&&o.priceKg));}
function offerMeta(o){
  var c=S(o&&o.currency||'EUR').toUpperCase()||'EUR',t=offerTotal(o),p=offerPriceKg(o),del=num(o&&o.delivery_weeks);
  var main=t>0?money(t,c):p>0?money(p,c)+'/kg':'Ofertë e regjistruar';
  return main+(del>0?' · '+del+' javë':'');
}
function ourOffers(d){var xs=A(d&&d.ourOffers).slice();if(d&&d.currentOurOffer&&xs.indexOf(d.currentOurOffer)<0)xs.unshift(d.currentOurOffer);return xs.sort(function(a,b){return dateValue(pick(b&&b.sent_at,b&&b.updated_at,b&&b.created_at))-dateValue(pick(a&&a.sent_at,a&&a.updated_at,a&&a.created_at));});}
function offerSent(o){if(!o)return false;var st=o.offer_state||{};if(o.sent_at||st.sent_at)return true;return /\b(sent|derguar|dërguar|submitted|issued)\b/.test(N([o.status,o.state,o.followup_status,o.sent_status,st.status,st.revision_status].join(' ')));}
function projectWon(d){var p=d&&d.project||{},s=N([p.status,p.pipeline_stage,p.operational_state].join(' '));return /\bfituar\b|\bwon\b|execution|production|prodhim|factory_audit|transport/.test(s);}
function nextProjectStep(d){
  if(projectWon(d))return{title:'Vazhdo ekzekutimin',copy:'Projekti është në fazën pas fitimit.',area:'execution'};
  var rfqs=A(d&&d.rfqs),offers=A(d&&d.supplierOffers),ours=ourOffers(d),q=ours[0];
  if(!rfqs.length)return{title:'Përgatit RFQ',copy:'Nuk ka RFQ të regjistruar.',stage:'rfq'};
  if(!offers.length)return{title:'Mblidh ofertat',copy:'RFQ ekziston; duhen ofertat e furnitorëve.',stage:'offers'};
  if(!q)return{title:'Krahaso ofertat',copy:'Ka oferta furnitorësh; vazhdo me krahasimin.',stage:'comparison'};
  if(!offerSent(q))return{title:'Finalizo ofertën tonë',copy:'Drafti ekziston dhe mbetet human-gated.',stage:'client_offer'};
  return{title:'Në pritje të klientit',copy:'Oferta është dërguar. Vepro vetëm kur ka përgjigje ose follow-up.',area:'communication'};
}
function supplierCards(d){
  var rows=A(d&&d.supplierOffers),visible=rows.slice(0,4),more=Math.max(0,rows.length-visible.length);
  if(!visible.length)return '<button type="button" class="pmm-pd-supplier empty" data-pwf-stage="offers"><span>＋</span><b>Ende pa ofertë furnitori</b><small>Hap ofertat / komunikimin</small></button>';
  return visible.map(function(o){return '<button type="button" class="pmm-pd-supplier" data-pwf-stage="comparison"><span class="dot"></span><b>'+E(supplierName(o))+'</b><small>'+E(offerMeta(o))+'</small></button>';}).join('')+
    (more?'<button type="button" class="pmm-pd-supplier more" data-pwf-stage="comparison"><b>+'+more+' oferta të tjera</b><small>Hap krahasimin</small></button>':'');
}
function projectMapHtml(d){
  var p=d&&d.project||{},offers=A(d&&d.supplierOffers),ours=ourOffers(d),q=ours[0],next=nextProjectStep(d),sent=q&&offerSent(q);
  var ourTitle=!q?'Pa ofertë tonën':sent?'Oferta jonë · dërguar':'Oferta jonë · draft';
  var ourMeta=q?[pick(q.doc_nr,q.document_nr,q.reference,'Ofertë'),offerTotal(q)>0?money(offerTotal(q),q.currency||'EUR'):''].filter(Boolean).join(' · '):'Krijo vetëm pasi kostoja të jetë e qartë';
  var customerMeta=sent?'Në pritje të përgjigjes':'Ende pa ofertë të dërguar';
  return '<section class="pmm-pd-map" id="pst-project-map-v1"><header><div><span>RRJEDHA E PROJEKTIT</span><b>Mindmap operative</b><small>Ofertat e furnitorëve → krahasimi → kostoja → oferta jonë → klienti</small></div><div class="pmm-pd-head-actions"><button type="button" data-pmm-projects>← Projektet</button><button type="button" data-pmm-map-collapse>Fshih hartën</button></div></header>'+
    '<div class="pmm-pd-flow">'+
      '<div class="pmm-pd-suppliers"><div class="pmm-pd-label"><b>Prodhues / furnitorë</b><small>'+offers.length+' oferta</small></div>'+supplierCards(d)+'</div>'+
      '<button type="button" class="pmm-pd-node compare" data-pwf-stage="comparison"><span>⇄</span><b>Krahaso ofertat</b><small>Scope · kosto · afat</small></button>'+
      '<div class="pmm-pd-node project"><span class="project-mark">⌘</span><b>'+E(pick(p.name,p.project_name,p.ref,'Projekt'))+'</b><small>'+E([pick(p.client,''),pick(p.reference,p.ref,'')].filter(Boolean).join(' · '))+'</small></div>'+
      '<button type="button" class="pmm-pd-node pricing" data-pwf-stage="pricing"><span>€</span><b>Kosto / çmimi</b><small>Human gate për çmimin final</small></button>'+
      '<button type="button" class="pmm-pd-node ours" data-pwf-stage="client_offer"><span>◇</span><b>'+E(ourTitle)+'</b><small>'+E(ourMeta)+'</small></button>'+
      '<div class="pmm-pd-node customer"><span>◎</span><b>Klienti</b><small>'+E(customerMeta)+'</small></div>'+
    '</div>'+
    '<div class="pmm-pd-utility">'+
      '<button type="button" data-pwf-area="files"><span>▤</span><b>Skedarët</b><small>'+A(d&&d.projectDocs).length+' të lidhur</small></button>'+
      '<button type="button" data-pwf-area="communication"><span>✉</span><b>Komunikimi</b><small>Emailat e projektit</small></button>'+
      '<button type="button" class="pulse" '+(next.stage?'data-pwf-stage="'+E(next.stage)+'"':'data-pwf-area="'+E(next.area||'overview')+'"')+'><span>↗</span><b>'+E(next.title)+'</b><small>'+E(next.copy)+'</small></button>'+
    '</div></section>';
}
function decorateProject(){
  var page=document.getElementById('page-workspace-project'),d=projectData();if(!page||!page.classList.contains('active')||!d||!d.project)return false;
  var body=document.getElementById('pst-pi-body');if(!body||!body.parentNode)return false;
  var id=currentProjectId(),old=document.getElementById('pst-project-map-v1');
  if(old&&old.getAttribute('data-project-id')===id){old.classList.toggle('collapsed',!!state.projectMapCollapsed);return true;}
  if(old)old.remove();
  var holder=document.createElement('div');holder.innerHTML=projectMapHtml(d);var map=holder.firstElementChild;if(!map)return false;
  map.setAttribute('data-project-id',id);map.classList.toggle('collapsed',!!state.projectMapCollapsed);
  body.parentNode.insertBefore(map,body);state.lastProjectId=id;return true;
}
function scheduleProjects(){[0,70,220,650,1150,2050,2450].forEach(function(ms){setTimeout(decorateProjects,ms);});}
function scheduleProject(){[0,70,220,520,1100].forEach(function(ms){setTimeout(decorateProject,ms);});}
function wrapGlobal(name,after){
  var fn=window[name];if(typeof fn!=='function'||fn.__pmmWrapped)return false;
  var w=function(){var out=fn.apply(this,arguments);Promise.resolve(out).finally(after);return out;};w.__pmmWrapped=true;w.__base=fn;window[name]=w;bridges[name]=fn;return true;
}
function installBridges(){
  wrapGlobal('pstProjectsModernOpen',scheduleProjects);wrapGlobal('pstProjectsModernRefresh',scheduleProjects);wrapGlobal('pstOpenProjectWorkspace',scheduleProject);
  var go=window.pstWorkspaceGo;if(typeof go==='function'&&!go.__pmmWrapped){var w=function(key){var out=go.apply(this,arguments);if(key==='projects')Promise.resolve(out).finally(scheduleProjects);return out;};w.__pmmWrapped=true;w.__base=go;window.pstWorkspaceGo=w;bridges.pstWorkspaceGo=go;}
}
function click(e){
  var t=e.target&&e.target.closest?e.target:null;if(!t)return;
  var open=t.closest('[data-pmm-open]');if(open){e.preventDefault();e.stopPropagation();openProject(open.getAttribute('data-pmm-open'));return;}
  var view=t.closest('[data-pmm-view]');if(view){e.preventDefault();setProjectsView(view.getAttribute('data-pmm-view'));return;}
  var focus=t.closest('[data-pmm-focus]');if(focus){e.preventDefault();var k=focus.getAttribute('data-pmm-focus');state.focus=state.focus===k?'':k;decorateProjects();return;}
  if(t.closest('[data-pmm-focus-clear]')){e.preventDefault();state.focus='';decorateProjects();return;}
  if(t.closest('[data-pmm-back]')){e.preventDefault();e.stopPropagation();goBackProjects();return;}
  if(t.closest('[data-pmm-projects]')){e.preventDefault();if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('projects');return;}
  if(t.closest('[data-pmm-map-collapse]')){e.preventDefault();state.projectMapCollapsed=!state.projectMapCollapsed;var map=document.getElementById('pst-project-map-v1');if(map){map.classList.toggle('collapsed',state.projectMapCollapsed);var b=map.querySelector('[data-pmm-map-collapse]');if(b)b.textContent=state.projectMapCollapsed?'Shfaq hartën':'Fshih hartën';}return;}
  var nav=t.closest('.pst-ws-navbtn[data-key="projects"],#pst-ws-projects,[data-key="projects"]');if(nav)scheduleProjects();
}
function css(){
  if(document.getElementById('pst-project-mindmap-v1-css'))return;
  var s=document.createElement('style');s.id='pst-project-mindmap-v1-css';s.textContent=`
#page-workspace-projects.pmm-enabled .pst-pm-page{max-width:none;padding:20px 24px 40px}
#page-workspace-projects.pmm-enabled .pst-pm-head{align-items:center;margin-bottom:14px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px}
#page-workspace-projects .pmm-back{height:34px;border:1px solid #4F97AF;border-radius:9px;background:#4F97AF;color:#fff!important;padding:0 11px;font-size:12px;cursor:pointer;box-shadow:0 2px 8px rgba(33,55,64,.035)}#page-workspace-projects .pmm-back *{color:#fff!important}
#page-workspace-projects .pmm-back:hover{border-color:#4389A1;color:#fff!important;background:#4389A1}
#page-workspace-projects.pmm-enabled .pst-pm-head>div:nth-of-type(1){min-width:0}#page-workspace-projects.pmm-enabled .pst-pm-eyebrow{display:none!important}
#page-workspace-projects.pmm-enabled .pst-pm-title{font-size:24px!important;font-weight:650!important;letter-spacing:-.35px!important;color:#26343A!important;margin:0!important}
#page-workspace-projects.pmm-enabled .pst-pm-sub{font-size:12px!important;color:#879298!important;margin-top:4px!important}
#page-workspace-projects .pmm-view-toggle{display:flex!important;border:1px solid #DEE8EC;border-radius:10px;padding:3px;background:#F7F9FA;margin-left:4px}
#page-workspace-projects .pmm-view-toggle button{height:32px;border:0;background:transparent;border-radius:7px;padding:0 11px;color:#77848A;font-size:12px;cursor:pointer;display:flex;gap:6px;align-items:center}
#page-workspace-projects .pmm-view-toggle button.on{background:#fff;color:${BRAND_DEEP};box-shadow:0 1px 4px rgba(37,62,73,.09)}
#page-workspace-projects[data-pmm-view="mindmap"] .pst-pm-controls,#page-workspace-projects[data-pmm-view="mindmap"] #pst-pm-content{display:none!important}
#page-workspace-projects[data-pmm-view="mindmap"] .pst-pm-head-actions>.pst-pm-btn{display:none!important}
#page-workspace-projects[data-pmm-view="list"] #pst-projects-mindmap-v1{display:none!important}
#page-workspace-projects[data-pmm-view="list"] .pst-pm-head-actions>.pst-pm-btn.primary{display:inline-flex!important;align-items:center!important}
#pst-projects-mindmap-v1{min-height:640px}
.pmm-canvas-wrap{border:1px solid #E7EEF1;border-radius:18px;background:linear-gradient(180deg,#FEFFFF 0%,#FBFDFE 100%);overflow:auto;box-shadow:0 6px 22px rgba(37,61,71,.035)}
.pmm-canvas{position:relative;min-width:1060px;height:620px;overflow:hidden;background:radial-gradient(circle at 50% 49%,rgba(91,155,179,.035),transparent 34%)}
.pmm-connectors{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.pmm-connectors circle{fill:none;stroke:#EDF3F5;stroke-width:1}.pmm-connectors path{fill:none;stroke:#8EB8C8;stroke-width:1.5;vector-effect:non-scaling-stroke}.pmm-connectors path.pmm-soft{stroke:#B9CFD7;stroke-width:1.2}
.pmm-center{position:absolute;left:50%;top:49%;transform:translate(-50%,-50%);width:184px;min-height:72px;border:1px solid #BFDCE6;border-radius:17px;background:#F8FCFD;display:flex;align-items:center;justify-content:center;gap:11px;box-shadow:0 10px 26px rgba(67,122,143,.08);z-index:3}.pmm-center-mark{width:36px;height:36px;border:1px solid #A9D1DF;border-radius:12px;display:grid;place-items:center;color:#2E82A1;font-size:19px;background:#fff}.pmm-center b{display:block;font-size:15px;color:#26373E;font-weight:650}.pmm-center small{display:block;font-size:11px;color:#819096;margin-top:3px}
.pmm-branch{position:absolute;width:156px;min-height:54px;border:1px solid #D7E5EA;border-radius:14px;background:#fff;display:flex;align-items:center;gap:9px;padding:8px 11px;text-align:left;cursor:pointer;z-index:3;box-shadow:0 5px 16px rgba(39,66,76,.045);transition:.15s}.pmm-branch:hover{border-color:#9FC5D3;transform:translateY(-1px);box-shadow:0 9px 23px rgba(39,72,84,.075)}.pmm-branch-icon{width:28px;height:28px;border:1px solid #D9E7EB;border-radius:9px;display:grid;place-items:center;color:${BRAND_DEEP};font-size:13px;flex:0 0 auto}.pmm-branch b{display:block;font-size:12px;color:#324248;font-weight:650}.pmm-branch small{display:block;font-size:9.5px;color:#8C979C;margin-top:2px}.pmm-branch-offered{left:31%;top:21%}.pmm-branch-won{right:31%;top:21%}.pmm-branch-action{left:31%;top:69%}.pmm-branch-lost{right:31%;top:69%}
.pmm-project-stack{position:absolute;width:190px;display:grid;gap:8px;z-index:2}.pmm-project-stack.left{left:3.5%}.pmm-project-stack.right{right:3.5%}.pmm-project-stack.top{top:8%}.pmm-project-stack.bottom{top:57%}
.pmm-project-card{position:relative;width:100%;min-height:56px;border:1px solid #E0E9EC;border-radius:13px;background:#fff;display:grid;grid-template-columns:30px minmax(0,1fr) 14px;gap:8px;align-items:center;padding:8px 9px;text-align:left;cursor:pointer;box-shadow:0 4px 14px rgba(35,60,69,.035);transition:.15s}.pmm-project-card:hover{border-color:#AFCED9;transform:translateY(-1px);box-shadow:0 8px 20px rgba(38,71,83,.07)}.pmm-project-icon{width:28px;height:28px;border-radius:9px;border:1px solid #DCE8EC;display:grid;place-items:center;color:#4D8AA0;font-size:12px}.pmm-project-card[data-pmm-tone="won"] .pmm-project-icon{color:#2F7657}.pmm-project-card[data-pmm-tone="lost"] .pmm-project-icon{color:#A64B42}.pmm-project-card[data-pmm-tone="action"] .pmm-project-icon{color:#98631D}.pmm-project-copy{min-width:0}.pmm-project-copy b{display:block;font-size:11.5px;color:#2E3C42;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:620}.pmm-project-copy small{display:block;font-size:9.5px;color:#89949A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}.pmm-chevron{color:#7CAFC2;font-size:17px}.pmm-more{height:30px;border:1px dashed #CEDDE2;border-radius:10px;background:rgba(255,255,255,.75);color:#6D858F;font-size:10px;cursor:pointer}.pmm-more:hover{background:#fff;color:${BRAND_DEEP};border-color:#A8C8D4}
.pmm-closed{position:absolute;left:50%;bottom:7%;transform:translateX(-50%);min-width:150px;height:48px;border:1px solid #DEE6E9;border-radius:13px;background:#fff;display:flex;align-items:center;justify-content:center;gap:8px;color:#68767C;cursor:pointer;z-index:3}.pmm-closed:hover{border-color:#BACDD4;background:#FAFCFD}.pmm-closed b{font-size:11px;font-weight:620}.pmm-closed small{font-size:9px;color:#939DA1}.pmm-closed i{font-style:normal;color:#7DA6B5}
.pmm-focus-panel{margin-top:14px;border:1px solid #E2EBEE;border-radius:16px;background:#fff;padding:14px}.pmm-focus-panel header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.pmm-focus-panel header span{display:block;font-size:9px;letter-spacing:.8px;color:#6D9AAC;font-weight:700}.pmm-focus-panel header b{display:block;font-size:15px;color:#2C3B41;margin-top:2px;font-weight:650}.pmm-focus-panel header small{font-size:10px;color:#909A9F}.pmm-focus-panel header button{width:30px;height:30px;border:1px solid #E1E9EC;border-radius:9px;background:#fff;color:#7C888D;cursor:pointer}.pmm-focus-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:9px}.pmm-empty{padding:22px;color:#8C979C;font-size:12px;text-align:center}

#page-workspace-project #pst-project-map-v1{margin:0 0 14px;border:1px solid #E1EAED;border-radius:17px;background:#FCFEFF;box-shadow:0 6px 22px rgba(35,61,71,.035);overflow:hidden}
#page-workspace-project #pst-project-map-v1>header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 15px;border-bottom:1px solid #E8EFF1;background:#fff}#page-workspace-project #pst-project-map-v1>header span{display:block;font-size:9px;letter-spacing:.75px;color:#5B9BB3;font-weight:750}#page-workspace-project #pst-project-map-v1>header b{display:block;font-size:14px;color:#2C3B41;margin-top:2px}#page-workspace-project #pst-project-map-v1>header small{display:block;font-size:10.5px;color:#849096;margin-top:2px}.pmm-pd-head-actions{display:flex;gap:7px}.pmm-pd-head-actions button{height:31px;border:1px solid #DFE8EB;border-radius:9px;background:#fff;color:#64747B;padding:0 10px;font-size:10px;cursor:pointer}.pmm-pd-head-actions button:hover{border-color:#B5D0D9;color:${BRAND_DEEP};background:#F8FBFC}
.pmm-pd-flow{position:relative;display:grid;grid-template-columns:minmax(185px,1.35fr) 145px minmax(190px,1.2fr) 145px minmax(180px,1.1fr) 145px;gap:24px;align-items:center;min-width:1120px;padding:25px 24px 22px;overflow:visible}.pmm-pd-flow:before{content:"";position:absolute;left:10%;right:6%;top:50%;height:1px;background:#AFCBD5;z-index:0}.pmm-pd-suppliers{position:relative;z-index:1;display:grid;gap:7px}.pmm-pd-label{display:flex;justify-content:space-between;gap:8px;align-items:end;margin-bottom:1px}.pmm-pd-label b{font-size:10px;color:#586A72}.pmm-pd-label small{font-size:9px;color:#8B989D}.pmm-pd-supplier{min-height:48px;border:1px solid #DFE9EC;border-radius:11px;background:#fff;text-align:left;padding:7px 9px;cursor:pointer;position:relative;box-shadow:0 3px 10px rgba(38,62,72,.025)}.pmm-pd-supplier:hover{border-color:#A8CBD7;background:#FBFDFE}.pmm-pd-supplier b{display:block;font-size:11px;color:#33434A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmm-pd-supplier small{display:block;font-size:9px;color:#87949A;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmm-pd-supplier .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#74AFC3;margin-right:5px}.pmm-pd-supplier.empty,.pmm-pd-supplier.more{border-style:dashed;background:#FAFCFD;color:#70848D}
.pmm-pd-node{position:relative;z-index:2;min-height:84px;border:1px solid #D8E6EA;border-radius:14px;background:#fff;padding:11px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 5px 16px rgba(37,64,74,.04)}button.pmm-pd-node:hover{border-color:#99C2D0;background:#F8FCFD;transform:translateY(-1px)}.pmm-pd-node>span{width:29px;height:29px;border:1px solid #D9E8EC;border-radius:9px;display:grid;place-items:center;color:#3F7F98;background:#fff;margin-bottom:6px}.pmm-pd-node b{display:block;font-size:11.5px;color:#2F4047;font-weight:650}.pmm-pd-node small{display:block;font-size:9.5px;line-height:1.35;color:#87949A;margin-top:3px}.pmm-pd-node.project{min-height:104px;border-color:#B8D7E1;background:#F5FBFD;box-shadow:0 9px 24px rgba(61,121,143,.07)}.pmm-pd-node.project .project-mark{color:#2E82A1}.pmm-pd-node.ours{border-color:#BEDCE6}.pmm-pd-node.customer{border-style:dashed;background:#FBFCFD}
.pmm-pd-utility{display:grid;grid-template-columns:1fr 1fr 1.35fr;gap:8px;padding:0 24px 20px;min-width:720px}.pmm-pd-utility button{border:1px solid #E0E9EC;border-radius:11px;background:#fff;min-height:58px;padding:9px 11px;text-align:left;display:grid;grid-template-columns:26px minmax(0,1fr);column-gap:8px;cursor:pointer}.pmm-pd-utility button>span{grid-row:1/3;width:26px;height:26px;border-radius:8px;background:#F1F7F9;display:grid;place-items:center;color:#4D8CA3}.pmm-pd-utility button b{font-size:10.5px;color:#38484F}.pmm-pd-utility button small{font-size:9.5px;color:#87949A}.pmm-pd-utility button:hover{border-color:#B6D1DA;background:#FBFDFE}.pmm-pd-utility button.pulse{border-color:#B8D7E1;background:#F7FBFD}.pmm-pd-map.collapsed .pmm-pd-flow,.pmm-pd-map.collapsed .pmm-pd-utility{display:none}.pmm-pd-map.collapsed>header{border-bottom:0}
@media(max-width:900px){#page-workspace-projects.pmm-enabled .pst-pm-head{grid-template-columns:auto minmax(0,1fr)}#page-workspace-projects.pmm-enabled .pst-pm-head-actions{grid-column:1/-1;justify-content:flex-end}.pmm-canvas{min-width:980px}.pmm-pd-map>header{align-items:flex-start;flex-direction:column}.pmm-pd-head-actions{width:100%;justify-content:flex-end}}
`;
  document.head.appendChild(s);
}
function init(){
  if(state.installed){installBridges();scheduleProjects();scheduleProject();return;}
  state.installed=true;css();try{var v=localStorage.getItem(VIEW_KEY);if(v==='list'||v==='mindmap')state.view=v;}catch(e){}
  installBridges();document.addEventListener('click',click,true);scheduleProjects();scheduleProject();
}
window.PSTProjectMindmapV1={apply:init,decorateProjects:decorateProjects,decorateProject:decorateProject,state:state,_test:{terminalKind:terminalKind,needsAction:needsAction,primaryGroup:primaryGroup,projectGroups:projectGroups,nextProjectStep:nextProjectStep}};
if(window.__pstModulesReady)setTimeout(init,0);else document.addEventListener('pst:modules-ready',init,{once:true});
})();
