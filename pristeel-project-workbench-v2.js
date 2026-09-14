/* PRISTEEL Project Workbench v2
 * Action-first presentation layer for a single Project Workspace.
 * Reuses the canonical project data already loaded by PPPP and the canonical
 * Project Workflow navigation. No Supabase writes, no outbound actions and no
 * bypass of supplier, pricing, offer-send, contract or won/lost approval gates.
 */
(function(){
'use strict';
if(window.__pstProjectWorkbenchV2)return;
window.__pstProjectWorkbenchV2=true;

var state={signature:'',timer:0,observer:null};
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function num(v){var n=parseFloat(S(v).replace(',','.'));return isFinite(n)?n:0;}
function pick(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&S(v).trim()!=='')return v;}return'';}
function ts(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.getTime():0;}
function money(v,c){var n=num(v);return n>0?n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c||'EUR'):'—';}
function data(){return window.__pstIntegrityLastData||null;}
function currentId(){var d=data(),p=d&&d.project||{};return S(window.__pstCurrentProjectId||window._curProjId||p.id||'');}
function projectMatches(d){var id=currentId(),pid=S(d&&d.project&&d.project.id||'');return !id||!pid||id===pid;}
function supplierOffers(d){return A(d&&d.supplierOffers);}
function rfqs(d){return A(d&&d.rfqs);}
function emails(d){return A(d&&(d.projectEmails||d.recentEmails||d.emails||d.gmailMessages||d.communications));}
function docs(d){return A(d&&(d.projectDocs||d.documents||d.files));}
function supplierName(o){return pick(o&&o.supplier,o&&o.supplier_name,o&&o.company,o&&o.vendor_name,'Furnitor');}
function offerAmount(o){return num(pick(o&&o.total_eur,o&&o.total_amount,o&&o.total,o&&o.amount));}
function offerMeta(o){var t=offerAmount(o),p=num(pick(o&&o.price_kg,o&&o.priceKg)),c=S(o&&o.currency||'EUR').toUpperCase()||'EUR',w=num(o&&o.delivery_weeks);var x=t>0?money(t,c):p>0?money(p,c)+'/kg':'Ofertë e regjistruar';return x+(w>0?' · '+w+' javë':'');}
function ourOffers(d){var x=A(d&&d.ourOffers).slice(),q=d&&d.currentOurOffer;if(q&&x.indexOf(q)<0)x.unshift(q);return x.sort(function(a,b){return offerTime(b)-offerTime(a);});}
function offerTime(o){return Math.max(ts(o&&o.sent_at),ts(o&&o.updated_at),ts(o&&o.created_at),ts(o&&o.offer_state&&o.offer_state.sent_at));}
function offerSent(o){if(!o)return false;var st=o.offer_state||{};if(o.sent_at||st.sent_at)return true;return /\b(sent|derguar|submitted|issued|delivered)\b/.test(N([o.status,o.state,o.followup_status,o.sent_status,st.status,st.revision_status].join(' ')));}
function emailTime(m){return Math.max(ts(m&&m.date),ts(m&&m.sent_at),ts(m&&m.received_at),ts(m&&m.internal_date),ts(m&&m.created_at),ts(m&&m.updated_at));}
function latestEmail(d){var xs=emails(d).slice().sort(function(a,b){return emailTime(b)-emailTime(a);});return xs[0]||null;}
function projectWon(d){var p=d&&d.project||{},s=N([p.status,p.pipeline_stage,p.operational_state,p.phase].join(' '));return /\bfituar\b|\bwon\b|closedwon|execution|ekzekutim|production|prodhim|factory_audit|transport/.test(s);}
function projectLost(d){var p=d&&d.project||{},s=N([p.status,p.pipeline_stage,p.operational_state].join(' '));return /\bhumbur\b|\blost\b|cancel|refuz/.test(s);}
function latestActivityAfterOffer(d,q){if(!q||!offerSent(q))return false;var m=latestEmail(d);return !!m&&emailTime(m)>offerTime(q)+60000;}
function latestEmailSubject(d){var m=latestEmail(d);return pick(m&&m.subject,m&&m.title,m&&m.snippet,'');}
function stageFromProject(d){return S(d&&d.project&&d.project.pipeline_stage||'');}
function workflowState(d){
  var offers=supplierOffers(d),r=rfqs(d),ours=ourOffers(d),q=ours[0]||null,won=projectWon(d),lost=projectLost(d),sent=offerSent(q),after=latestActivityAfterOffer(d,q),stage=stageFromProject(d);
  if(lost)return{kind:'closed',title:'Projekt i humbur / i mbyllur',copy:'Shiko historinë dhe dokumentet e projektit.',area:'communication'};
  if(won)return{kind:'execution',title:'Vazhdo ekzekutimin',copy:'Projekti është fituar. Fokusi tani është realizimi, kostoja, dokumentet dhe komunikimi.',area:'execution'};
  if(sent&&after)return{kind:'customer',title:'Shqyrto aktivitetin e ri pas ofertës',copy:latestEmailSubject(d)||'Ka komunikim më të ri se oferta e dërguar. Kontrollo kërkesën/përgjigjen para hapit tjetër.',area:'communication'};
  if(sent)return{kind:'customer',title:'Në pritje të klientit / follow-up',copy:'Oferta jonë është dërguar. Hapi i radhës varet nga përgjigjja ose follow-up-i.',area:'communication'};
  if(q)return{kind:'our_offer',title:'Finalizo ofertën tonë',copy:'Oferta ekziston si draft. Çmimi final dhe dërgimi mbeten human-gated.',stage:'client_offer'};
  if(offers.length)return{kind:'comparison',title:'Krahaso ofertat dhe mbyll koston',copy:'Ka oferta furnitorësh. Krahaso scope-in, çmimin dhe afatin para çmimit të shitjes.',stage:'comparison'};
  if(r.length)return{kind:'supplier',title:'Mblidh ofertat e furnitorëve',copy:'RFQ ekziston. Kontrollo përgjigjet dhe plotëso ofertat e furnitorëve.',stage:'offers'};
  if(stage==='pricing')return{kind:'pricing',title:'Përcakto koston dhe çmimin',copy:'Hap pricing-un; çmimi final mbetet vendim njerëzor.',stage:'pricing'};
  return{kind:'rfq',title:'Përgatit kërkesën / RFQ',copy:'Nuk ka ende bazë të mjaftueshme për krahasim komercial.',stage:'rfq'};
}
function doneClass(ok,current){return current?' current':ok?' done':'';}
function navAttr(step){return step.stage?'data-pwf-stage="'+E(step.stage)+'"':'data-pwf-area="'+E(step.area||'overview')+'"';}
function miniSupplierCards(d){var xs=supplierOffers(d).slice(0,3),more=Math.max(0,supplierOffers(d).length-xs.length);if(!xs.length)return '<button type="button" class="pwb2-supplier empty" data-pwf-stage="offers"><span>＋</span><b>Pa ofertë furnitori</b><small>Hap furnitorët / RFQ</small></button>';return xs.map(function(o){return '<button type="button" class="pwb2-supplier" data-pwf-stage="comparison"><span>◇</span><b>'+E(supplierName(o))+'</b><small>'+E(offerMeta(o))+'</small></button>';}).join('')+(more?'<button type="button" class="pwb2-more" data-pwf-stage="comparison">+'+more+' oferta të tjera</button>':'');}
function commercialFlow(d,next){
  var hasR=rfqs(d).length>0,hasS=supplierOffers(d).length>0,q=ourOffers(d)[0]||null,hasO=!!q,sent=offerSent(q),after=latestActivityAfterOffer(d,q);
  var current=next.kind;
  function node(key,icon,title,sub,attr,done){return '<button type="button" class="pwb2-flow-node'+doneClass(done,current===key)+'" '+attr+'><span class="pwb2-node-icon">'+icon+'</span><b>'+E(title)+'</b><small>'+E(sub)+'</small></button>';}
  return '<div class="pwb2-commercial">'+
    '<div class="pwb2-supplier-col"><div class="pwb2-col-label"><b>Furnitorë / prodhues</b><small>'+supplierOffers(d).length+' oferta</small></div>'+miniSupplierCards(d)+'</div>'+
    node('supplier','1','RFQ / oferta',hasR?'RFQ i regjistruar':'Nis kërkesën','data-pwf-stage="offers"',hasR)+
    node('comparison','2','Krahasimi',hasS?'Ka oferta për krahasim':'Pret oferta','data-pwf-stage="comparison"',hasS)+
    node('pricing','3','Kosto / çmimi',hasS?'Kontrollo koston':'Pas krahasimit','data-pwf-stage="pricing"',hasO)+
    node('our_offer','4','Oferta jonë',hasO?(sent?'E dërguar':'Draft'):'Ende pa ofertë','data-pwf-stage="client_offer"',sent)+
    node('customer','5','Klienti',after?'Ka aktivitet të ri':sent?'Në pritje / follow-up':'Pas dërgimit','data-pwf-area="communication"',false)+
  '</div>';
}
function executionFlow(d,next){
  var p=d.project||{},stage=N([p.pipeline_stage,p.operational_state].join(' '));
  function card(key,icon,title,sub,attr,hot){return '<button type="button" class="pwb2-exec-card'+(hot?' current':'')+'" '+attr+'><span>'+icon+'</span><b>'+E(title)+'</b><small>'+E(sub)+'</small><i>›</i></button>';}
  return '<div class="pwb2-exec-grid">'+
    card('execution','↗','Ekzekutimi','Realizimi, prodhimi dhe dorëzimi','data-pwf-area="execution"',true)+
    card('finance','€','Financat','Kosto, fatura dhe fitimi','data-pwf-area="finance"',false)+
    card('files','▤','Skedarët',docs(d).length?docs(d).length+' skedarë të lidhur':'Dokumentet e projektit','data-pwf-area="files"',false)+
    card('communication','✉','Komunikimi',emails(d).length?emails(d).length+' komunikime':'Emailat e projektit','data-pwf-area="communication"',false)+
    card('history','◇','Historia komerciale','RFQ, ofertat dhe krahasimi','data-pwf-stage="comparison"',false)+
  '</div>';
}
function header(d,next){var p=d.project||{},won=projectWon(d);return '<header class="pwb2-head"><div><span>'+(won?'PROJEKT I FITUAR · WORKBENCH':'PROJECT WORKBENCH')+'</span><h2>'+E(pick(p.name,p.project_name,p.ref,'Projekt'))+'</h2><p>'+E([pick(p.client,p.company,''),pick(p.reference,p.ref,'')].filter(Boolean).join(' · '))+'</p></div><button type="button" data-pwb2-projects>← Projektet</button></header>'+
  '<section class="pwb2-next"><div class="pwb2-next-mark">'+(won?'↗':'!')+'</div><div><span>HAPI I RADHËS</span><h3>'+E(next.title)+'</h3><p>'+E(next.copy)+'</p></div><button type="button" '+navAttr(next)+'>Hape tani <i>›</i></button></section>';}
function utility(d){var q=ourOffers(d)[0]||null;return '<div class="pwb2-utility">'+
  '<button type="button" data-pwf-area="communication"><span>✉</span><b>Komunikimi</b><small>'+emails(d).length+' të lidhura</small></button>'+
  '<button type="button" data-pwf-area="files"><span>▤</span><b>Skedarët</b><small>'+docs(d).length+' të lidhur</small></button>'+
  '<button type="button" data-pwf-stage="client_offer"><span>◇</span><b>Oferta jonë</b><small>'+(q?E(offerSent(q)?'Dërguar / histori':'Draft / review'):'Pa ofertë')+'</small></button>'+
  '</div>';}
function renderHtml(d){var next=workflowState(d),won=projectWon(d);return '<div class="pwb2-shell">'+header(d,next)+'<section class="pwb2-map-card"><div class="pwb2-map-title"><div><span>'+(won?'REALIZIMI':'RRJEDHA E PROJEKTIT')+'</span><b>'+(won?'Qendra operative e projektit':'Nga kërkesa te klienti')+'</b></div><small>'+(won?'Vepro nga një qendër e vetme; komercialja mbetet histori.':'Hapat e përfunduar shënohen; hapi aktual theksohet.')+'</small></div>'+(won?executionFlow(d,next):commercialFlow(d,next))+'</section>'+utility(d)+'<div class="pwb2-details-label"><span>Detajet dhe aktiviteti ekzistues i projektit</span><i>↓</i></div></div>';}
function signature(d){var p=d&&d.project||{},q=ourOffers(d)[0]||null,m=latestEmail(d);return [p.id,p.status,p.pipeline_stage,p.operational_state,rfqs(d).length,supplierOffers(d).length,ourOffers(d).length,offerTime(q),emails(d).length,emailTime(m),docs(d).length].join('|');}
function loading(page,body){var root=document.getElementById('pst-project-workbench-v2');if(!root){root=document.createElement('div');root.id='pst-project-workbench-v2';root.innerHTML='<div class="pwb2-loading"><span></span><div><b>Duke përgatitur projektin…</b><small>Po lidh të dhënat dhe hapin e radhës.</small></div></div>';body.parentNode.insertBefore(root,body);}page.classList.add('pwb2-on');}
function sync(){
  var page=document.getElementById('page-workspace-project'),body=document.getElementById('pst-pi-body');if(!page||!page.classList.contains('active')||!body)return false;
  var d=data();if(!d||!d.project||!projectMatches(d)){loading(page,body);return false;}
  var sig=signature(d),root=document.getElementById('pst-project-workbench-v2');
  page.classList.add('pwb2-on');var old=document.getElementById('pst-project-map-v1');if(old)old.remove();
  if(root&&state.signature===sig&&root.getAttribute('data-project-id')===S(d.project.id||''))return true;
  if(!root){root=document.createElement('div');root.id='pst-project-workbench-v2';body.parentNode.insertBefore(root,body);}
  root.setAttribute('data-project-id',S(d.project.id||''));root.innerHTML=renderHtml(d);state.signature=sig;return true;
}
function schedule(){clearTimeout(state.timer);state.timer=setTimeout(sync,35);}
function goProjects(){if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('projects');if(typeof window.pstProjectsModernOpen==='function')return window.pstProjectsModernOpen();}
function click(e){var t=e.target&&e.target.closest?e.target.closest('[data-pwb2-projects]'):null;if(t){e.preventDefault();e.stopPropagation();goProjects();}}
function css(){if(document.getElementById('pst-project-workbench-v2-css'))return;var s=document.createElement('style');s.id='pst-project-workbench-v2-css';s.textContent=`
#page-workspace-project.pwb2-on #pst-project-map-v1{display:none!important}
#pst-project-workbench-v2{margin:0 0 16px;font-family:inherit;color:#293B43}
.pwb2-shell{display:grid;gap:11px}.pwb2-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:2px 2px 0}.pwb2-head span,.pwb2-next span,.pwb2-map-title span{font-size:9px;letter-spacing:.9px;font-weight:750;color:#5B9BB3}.pwb2-head h2{font-size:18px;line-height:1.2;margin:4px 0 3px;font-weight:650;letter-spacing:-.2px}.pwb2-head p{font-size:11px;color:#849198;margin:0}.pwb2-head>button{height:32px;border:1px solid #DBE6EA;background:#fff;border-radius:9px;padding:0 11px;color:#5E7078;font-size:10.5px;cursor:pointer}.pwb2-head>button:hover{border-color:#A9CBD7;color:#3F7F98;background:#F8FCFD}
.pwb2-next{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #BCD8E2;border-left:4px solid #6AA8BE;border-radius:14px;background:#F4FAFC;padding:13px 14px;box-shadow:0 5px 18px rgba(55,102,119,.045)}.pwb2-next-mark{width:34px;height:34px;border:1px solid #AFCFDA;border-radius:11px;background:#fff;display:grid;place-items:center;color:#3F829B;font-weight:700}.pwb2-next h3{font-size:17px;line-height:1.2;margin:2px 0 2px;font-weight:650}.pwb2-next p{margin:0;color:#6F7E85;font-size:11px;line-height:1.4}.pwb2-next>button{height:36px;border:1px solid #5B9BB3;border-radius:10px;background:#5B9BB3;color:#fff;padding:0 13px;font-size:11px;font-weight:620;cursor:pointer}.pwb2-next>button:hover{filter:brightness(.97)}.pwb2-next>button i{font-style:normal;margin-left:7px}
.pwb2-map-card{border:1px solid #E0EAED;border-radius:16px;background:#FCFEFF;padding:14px 15px 16px;box-shadow:0 5px 18px rgba(39,67,77,.03)}.pwb2-map-title{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:12px}.pwb2-map-title b{display:block;font-size:13px;margin-top:2px}.pwb2-map-title small{font-size:9.5px;color:#8A969B}.pwb2-commercial{position:relative;display:grid;grid-template-columns:minmax(165px,1.25fr) repeat(5,minmax(115px,.85fr));gap:17px;align-items:center;min-width:900px;overflow:visible}.pwb2-commercial:before{content:"";position:absolute;left:14%;right:4%;top:50%;height:1px;background:#C3D8DF;z-index:0}.pwb2-supplier-col{position:relative;z-index:1;display:grid;gap:6px}.pwb2-col-label{display:flex;justify-content:space-between;align-items:end;gap:8px}.pwb2-col-label b{font-size:9.5px}.pwb2-col-label small{font-size:8.5px;color:#8A979C}.pwb2-supplier{min-height:40px;border:1px solid #DFE9EC;border-radius:10px;background:#fff;display:grid;grid-template-columns:22px minmax(0,1fr);column-gap:7px;text-align:left;padding:6px 8px;cursor:pointer}.pwb2-supplier>span{grid-row:1/3;width:22px;height:22px;border:1px solid #E0EAED;border-radius:7px;display:grid;place-items:center;color:#4B8DA5}.pwb2-supplier b{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pwb2-supplier small{font-size:8.5px;color:#89959A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pwb2-supplier:hover{border-color:#ACCCD7}.pwb2-supplier.empty{border-style:dashed;color:#70858E}.pwb2-more{height:26px;border:1px dashed #CFDEE3;border-radius:8px;background:#fff;color:#70858E;font-size:9px;cursor:pointer}
.pwb2-flow-node{position:relative;z-index:2;min-height:82px;border:1px solid #DCE7EA;border-radius:13px;background:#fff;padding:10px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;cursor:pointer;box-shadow:0 3px 12px rgba(40,65,74,.025)}.pwb2-flow-node:hover{border-color:#9EC4D1;background:#FAFDFE}.pwb2-node-icon{width:26px;height:26px;border:1px solid #DCE9ED;border-radius:8px;display:grid;place-items:center;color:#598EA2;font-size:10px;margin-bottom:5px}.pwb2-flow-node b{font-size:10.5px;font-weight:650}.pwb2-flow-node small{font-size:8.5px;color:#89959A;margin-top:3px;line-height:1.3}.pwb2-flow-node.done{border-color:#C5DED3;background:#FBFDFC}.pwb2-flow-node.done .pwb2-node-icon{color:#36785A;border-color:#C9E0D6}.pwb2-flow-node.done .pwb2-node-icon:after{content:"✓";position:absolute;margin:28px 0 0 30px;width:14px;height:14px;border-radius:50%;background:#fff;border:1px solid #BBD8CC;display:grid;place-items:center;font-size:8px}.pwb2-flow-node.current{border:2px solid #65A8BF;background:#F1F8FB;box-shadow:0 7px 20px rgba(64,128,151,.09)}.pwb2-flow-node.current:after{content:"TANI";position:absolute;top:-8px;right:8px;background:#5B9BB3;color:#fff;border-radius:8px;padding:2px 5px;font-size:7px;letter-spacing:.4px;font-weight:750}
.pwb2-exec-grid{display:grid;grid-template-columns:repeat(5,minmax(150px,1fr));gap:9px}.pwb2-exec-card{position:relative;min-height:86px;border:1px solid #DEE8EB;border-radius:13px;background:#fff;padding:11px;text-align:left;display:grid;grid-template-columns:30px minmax(0,1fr) 12px;column-gap:8px;align-items:center;cursor:pointer}.pwb2-exec-card>span{grid-row:1/3;width:30px;height:30px;border-radius:9px;background:#F1F7F9;color:#4D8EA6;display:grid;place-items:center}.pwb2-exec-card b{font-size:10.5px}.pwb2-exec-card small{font-size:8.8px;color:#87949A}.pwb2-exec-card i{grid-column:3;grid-row:1/3;font-style:normal;color:#75A8BA}.pwb2-exec-card:hover{border-color:#AACBD6;background:#FBFDFE}.pwb2-exec-card.current{border:2px solid #65A8BF;background:#F2F9FB}.pwb2-exec-card.current:after{content:"TANI";position:absolute;right:9px;top:-8px;background:#5B9BB3;color:#fff;border-radius:7px;padding:2px 5px;font-size:7px;font-weight:750}
.pwb2-utility{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.pwb2-utility button{min-height:50px;border:1px solid #E0E9EC;border-radius:11px;background:#fff;padding:8px 10px;text-align:left;display:grid;grid-template-columns:25px minmax(0,1fr);column-gap:8px;cursor:pointer}.pwb2-utility button>span{grid-row:1/3;width:25px;height:25px;border-radius:8px;background:#F2F7F9;color:#518DA3;display:grid;place-items:center}.pwb2-utility button b{font-size:10px}.pwb2-utility button small{font-size:8.8px;color:#89959A}.pwb2-utility button:hover{border-color:#B0CFD9;background:#FBFDFE}.pwb2-details-label{height:27px;display:flex;align-items:center;justify-content:center;gap:7px;color:#909BA0;font-size:8.5px;letter-spacing:.3px}.pwb2-details-label i{font-style:normal}.pwb2-loading{min-height:86px;border:1px solid #E2EAED;border-radius:14px;background:#fff;display:flex;align-items:center;gap:12px;padding:14px;margin-bottom:12px}.pwb2-loading>span{width:26px;height:26px;border:2px solid #D6E5EA;border-top-color:#5B9BB3;border-radius:50%;animation:pwb2spin .8s linear infinite}.pwb2-loading b{display:block;font-size:11px}.pwb2-loading small{display:block;font-size:9px;color:#89959A;margin-top:3px}@keyframes pwb2spin{to{transform:rotate(360deg)}}
@media(max-width:1100px){.pwb2-map-card{overflow:auto}.pwb2-commercial{min-width:980px}.pwb2-exec-grid{min-width:860px}.pwb2-next{grid-template-columns:34px minmax(0,1fr)}.pwb2-next>button{grid-column:2;justify-self:start}.pwb2-utility{grid-template-columns:1fr}}
`;
document.head.appendChild(s);}
function init(){css();document.addEventListener('click',click,true);document.addEventListener('pst:project-ready',schedule,false);window.addEventListener('hashchange',schedule,false);window.addEventListener('popstate',schedule,false);if(window.MutationObserver){state.observer=new MutationObserver(schedule);state.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});}schedule();}
window.PSTProjectWorkbenchV2={sync:sync,workflowState:workflowState,projectWon:projectWon};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
