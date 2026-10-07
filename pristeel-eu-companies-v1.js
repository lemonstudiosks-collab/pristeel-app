/* PRISTEEL — Kompanitë EU v1
 * Proces i veçantë për klientë të drejtpërdrejtë në Evropë.
 * Nuk krijon projekt, kontakt, draft ose dërgim emaili.
 */
(function(){
'use strict';
if(window.__pstEUCompaniesV1)return;
window.__pstEUCompaniesV1=true;

var VIEW='pppp_eu_direct_operational_v1';
var state={rows:[],loading:false,loaded:false,error:'',query:'',selected:'',filter:'action',stage:'',country:'',preflight:null,lastLoadedAt:0,gmailOpenedAt:0,loadPromise:null};
var navObserver=null;
var STAGES=[['found','Gjetur'],['verified','Verifikuar'],['contact_ready','Kontakt gati'],['draft_ready','Draft gati'],['contacted','Kontaktuar'],['replied','Përgjigjur'],['qualified','E kualifikuar']];

function S(v){return String(v==null?'':v)}
function A(v){return Array.isArray(v)?v:[]}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
function D(v){if(!v)return'—';try{return new Date(v).toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'})}catch(e){return S(v)}}

function stableHtml(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html}
function safeUrl(v){try{var u=new URL(S(v));return /^(https?:)$/.test(u.protocol)?u.href:''}catch(e){return''}}
function hasReply(r){return r.stage==='replied'||r.stage==='qualified'||r.outreach_status==='replied'}
function hasSent(r){return !!(r.last_outbound_at||r.last_contact_at)||['contacted','replied','qualified'].indexOf(r.stage)>-1||['contacted','sent','replied'].indexOf(r.outreach_status)>-1}
function hasDraft(r){return !hasReply(r)&&(!!r.has_active_draft||(r.stage==='draft_ready'&&!!r.gmail_draft_id&&!hasSent(r)))}
function numPriority(r){return Number(r.priority_score)||0}
function actionRank(r){if(r.routing_state==='review')return 5;if(hasReply(r))return 4;if(hasDraft(r))return 3;var n=daysTo(r.next_action_due);return n!==null&&n<=0?2:needsAction(r)?1:0}
function contactLabel(v){return({verified:'Kontakt i verifikuar',found:'Kontakt i gjetur',searching:'Në kërkim',missing:'Kontakti mungon',unknown:'Në verifikim',review:'Kërkon shqyrtim'})[S(v)]||'Në verifikim'}
function outreachLabel(v){return({not_ready:'Komunikimi ende nuk është gati',ready:'Gati për kontaktim',draft:'Draft i regjistruar',draft_ready:'Draft i regjistruar',queued:'Draft në përgatitje',contacted:'Kontaktim i regjistruar',sent:'Dërgim i konfirmuar',replied:'Përgjigje e marrë',suppressed:'Kontaktim i bllokuar'})[S(v)]||'Në verifikim'}
function uiText(v){return S(v).replace(/external[_ ]production[_ ]capacity/gi,'kapacitet prodhues shtesë').replace(/fabricated[_ ]steel[_ ]package/gi,'paketa çeliku të fabrikuar').replace(/subcontracting/gi,'nënkontraktim').replace(/fabrication/gi,'fabrikim').replace(/overflow/gi,'kapacitet shtesë').replace(/follow[- ]up/gi,'rikontaktim').replace(/outreach/gi,'kontaktim').replace(/routing/gi,'përkatësi të modulit')}
function gmailIcon(){return '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path fill="#4285f4" d="M3 6h3v14H3z"/><path fill="#34a853" d="M18 6h3v14h-3z"/><path fill="#ea4335" d="M3 4l9 7 9-7v4l-9 7-9-7z"/></svg>'}
function workNav(){var tabs=[['action','Për veprim'],['drafts','Draftet për rishikim'],['replies','Përgjigjet'],['contacted','Në pritje / kontaktuar'],['research','Për pasurim'],['all','Të gjitha']];return tabs.map(function(x){var rows=state.rows.filter(function(r){return !r.archived_at}),n=rows.filter(function(r){return x[0]==='action'?needsAction(r):x[0]==='drafts'?hasDraft(r):x[0]==='replies'?hasReply(r):x[0]==='contacted'?hasSent(r):x[0]==='research'?r.contact_status!=='verified'&&!hasDraft(r)&&!hasSent(r)&&!hasReply(r):true}).length;return'<button class="pst-eu-work-nav '+(state.filter===x[0]&&!state.stage?'on':'')+'" type="button" aria-current="'+(state.filter===x[0]&&!state.stage?'page':'false')+'" data-eu-filter="'+x[0]+'"><span>'+x[1]+'</span><b>'+n+'</b></button>'}).join('')}
function syncOnReturn(){var p=document.getElementById('page-eu-companies');if(document.visibilityState==='hidden'||!p||!p.classList.contains('active'))return;var gmail=state.gmailOpenedAt;state.gmailOpenedAt=0;if(gmail||Date.now()-state.lastLoadedAt>=300000)load(true)}

function selected(){return state.rows.find(function(r){return S(r.id)===S(state.selected)})||null}
function hideOthers(page){document.querySelectorAll('.page').forEach(function(p){if(p===page)return;p.classList.remove('active');p.style.display='none'})}
function setRoute(active){try{if(active){if(location.hash!=='#kompanite-eu')history.pushState({pst:'kompanite-eu'},'',location.pathname+location.search+'#kompanite-eu')}else if(location.hash==='#kompanite-eu')history.replaceState({},'',location.pathname+location.search)}catch(e){}}

function typeLabel(v){
 var m={gc_gu:'Kontraktor i përgjithshëm',epc_industrial:'Kontraktor EPC / industrial',industrial_contractor:'Kontraktor industrial',developer:'Zhvillues',manufacturer:'Prodhues',steel_contractor:'Kontraktor çeliku',other_direct_client:'Klient i drejtpërdrejtë'};
 return m[S(v)]||'Kompani';
}
function stageLabel(v){
 var m={found:'Gjetur',verified:'Verifikuar',contact_ready:'Kontakt gati',draft_ready:'Draft gati',contacted:'Kontaktuar',replied:'Përgjigjur',qualified:'E kualifikuar',closed:'Mbyllur'};
 return m[S(v)]||'Në verifikim';
}
function scopeLabel(v){
 var m={fabricated_steel_package:'Paketa çeliku të fabrikuar',external_production_capacity:'Kapacitet prodhues shtesë',overflow_capacity:'Kapacitet për ngarkesë kulmore',fabrication_to_drawings:'Prodhim sipas vizatimeve',selected_subcontract_package:'Paketa të përzgjedhura nënkontraktimi',technical_coordination:'Koordinim teknik',material_procurement:'Prokurim materiali'};
 return m[S(v)]||uiText(v).replace(/_/g,' ');
}
function fitText(r){return A(r.business_scope).map(scopeLabel).join(' · ')||uiText(r.why_relevant)||'Për shqyrtim'}
function contactText(r){return S(r.contact_name||r.contact_email)||'Pa kontakt të verifikuar'}
function guardLabel(v){
 var m={clear:'Pa pengesë të njohur',blocked:'Mos kontakto',existing_draft:'Ka draft ekzistues',cooldown_30d:'Kontaktuar brenda 30 ditëve',routing_review:'Kontrollo modulin tjetër',contacted_before:'Kontaktuar më parë'};
 return m[S(v)]||'Për shqyrtim';
}
function guardClass(v){return v==='clear'?'ok':v==='blocked'?'bad':'warn'}
function routeLabel(v){
 var m={material_trade:'Blerësit e çelikut',representations:'Përfaqësime',opportunities:'Mundësitë'};
 return m[S(v)]||S(v);
}

function css(){
 if(document.getElementById('pst-eu-companies-v1-css'))return;
 var s=document.createElement('style');s.id='pst-eu-companies-v1-css';s.textContent=`
#page-eu-companies{--eu:#315e72;--eu-dark:#173d4c;--eu-soft:#eef5f8;--eu-line:#dbe6eb;--eu-text:#263f49}
body:has(#page-eu-companies.active) .topbar,body:has(#page-eu-companies.active) #pst-global-page-backbar{display:none!important}
.pst-eu-page{max-width:1480px;margin:0 auto;padding:20px 22px 48px;color:var(--eu-text)}
.pst-eu-top{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.pst-eu-btn{border:1px solid var(--eu-line);background:#fff;color:var(--eu-dark);border-radius:10px;padding:9px 12px;font-size:10.5px;font-weight:800;cursor:pointer}
.pst-eu-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;margin-bottom:14px}
.pst-eu-eye{font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase;color:#71858e}
.pst-eu-head h1{margin:4px 0 3px;font-size:30px;letter-spacing:-.6px}.pst-eu-head p{margin:0;color:#6e8189;font-size:11px;line-height:1.5}
.pst-eu-summary{font-size:10px;color:#6f8087;white-space:nowrap}.pst-eu-summary b{color:var(--eu-dark);font-size:14px}
.pst-eu-tools{display:flex;gap:8px;margin-bottom:12px}.pst-eu-search{flex:1;max-width:460px;height:40px;border:1px solid var(--eu-line);border-radius:10px;padding:0 12px;font-size:11px;color:#314b55;background:#fff}
.pst-eu-table{border:1px solid var(--eu-line);border-radius:14px;background:#fff;overflow:hidden}
.pst-eu-row{width:100%;display:grid;grid-template-columns:minmax(220px,1.45fr) 120px minmax(200px,1.3fr) minmax(190px,1.1fr) 145px;gap:12px;align-items:center;border:0;border-top:1px solid #edf2f4;background:#fff;padding:12px 14px;text-align:left;cursor:pointer;color:#53666e}
.pst-eu-row:first-child{border-top:0}.pst-eu-row:hover{background:#f7fafb}
.pst-eu-row b{display:block;color:#223f4b;font-size:12px}.pst-eu-row small{display:block;margin-top:3px;color:#87959a;font-size:9px}
.pst-eu-headrow{display:grid;grid-template-columns:minmax(220px,1.45fr) 120px minmax(200px,1.3fr) minmax(190px,1.1fr) 145px;gap:12px;padding:10px 14px;background:#f7f9fa;color:#87969c;font-size:8px;font-weight:850;text-transform:uppercase;letter-spacing:.05em}
.pst-eu-chip{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:8.5px;font-weight:850;background:#eef3f5;color:#506b76}.pst-eu-chip.ok{background:#eaf5ef;color:#35704d}.pst-eu-chip.warn{background:#fff4df;color:#8a6424}.pst-eu-chip.bad{background:#fae9e7;color:#94423d}
.pst-eu-empty{padding:36px 18px;text-align:center;color:#7a8c93;font-size:11px}
.pst-eu-error{margin-bottom:10px;padding:10px 12px;border-radius:10px;background:#fff0ed;color:#934b43;font-size:10px}
.pst-eu-detail{border:1px solid var(--eu-line);border-radius:14px;background:#fff;padding:18px}
.pst-eu-detail-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.pst-eu-detail h2{margin:4px 0;font-size:25px;color:#1f414e}.pst-eu-detail-meta{font-size:10.5px;color:#75878e}.pst-eu-detail-meta a{color:#2d6a82;text-decoration:none;font-weight:750}
.pst-eu-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}.pst-eu-section{border-top:1px solid #edf2f4;padding-top:12px}.pst-eu-section.full{grid-column:1/-1}.pst-eu-section h3{margin:0 0 8px;font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#7f9097}.pst-eu-section p{margin:0;font-size:11px;line-height:1.55;color:#4d646d}.pst-eu-kv{display:grid;grid-template-columns:130px 1fr;gap:7px 10px;font-size:10.5px}.pst-eu-kv span:nth-child(odd){color:#89979c}.pst-eu-kv span:nth-child(even){font-weight:720;color:#36515b;overflow-wrap:anywhere}
.pst-eu-tags{display:flex;flex-wrap:wrap;gap:6px}.pst-eu-tags span{padding:5px 7px;border-radius:8px;background:var(--eu-soft);font-size:9px;color:#426571;font-weight:700}
#pst-eu-companies-home-v1{min-width:0}.pst-eu-home{width:100%;height:100%;border:0;background:transparent;padding:0;text-align:left;cursor:pointer;color:inherit}.pst-eu-home-inner{display:flex;align-items:center;justify-content:space-between;gap:14px}.pst-eu-home-eye{font-size:9px;font-weight:850;letter-spacing:.11em;color:#6d858f;text-transform:uppercase}.pst-eu-home-title{margin-top:5px;font-size:18px;font-weight:850;color:#254753}.pst-eu-home-sub{margin-top:4px;font-size:10px;color:#74878e;line-height:1.4}.pst-eu-home-count{text-align:right}.pst-eu-home-count b{display:block;font-size:25px;color:#315e72}.pst-eu-home-count span{font-size:9px;color:#829198}
@media(max-width:900px){.pst-eu-page{padding:16px 12px 92px}.pst-eu-head{display:block}.pst-eu-summary{margin-top:9px}.pst-eu-headrow{display:none}.pst-eu-row{grid-template-columns:1fr;padding:14px;gap:7px}.pst-eu-row>span{display:block}.pst-eu-detail-grid{grid-template-columns:1fr}.pst-eu-section.full{grid-column:auto}.pst-eu-detail-top{display:block}.pst-eu-tools{position:sticky;top:0;z-index:5;background:#f7f8f9;padding:7px 0}.pst-eu-search{max-width:none}}
`;document.head.appendChild(s);
}

function ensurePage(){
 css();enhanceCss();
 var p=document.getElementById('page-eu-companies');if(p)return p;
 var host=document.querySelector('.content')||document.body;
 p=document.createElement('div');p.id='page-eu-companies';p.className='page';p.style.display='none';
 p.innerHTML='<div class="pst-eu-page"><aside class="pst-eu-work-sidebar"><div class="pst-eu-brand"><span>P</span><div><b>PRISTEEL</b><small>Klientë të drejtpërdrejtë</small></div></div><button class="pst-eu-side-home" type="button" data-eu-back>← Kthehu në Ballinë</button><div class="pst-eu-side-label">PUNËT DHE VEPRIMET</div><nav aria-label="Punët e kompanive" data-eu-work-nav></nav><section class="pst-eu-work-copy"><h3>Çfarë bën PPPP</h3><p>Kontrollon identitetin, historikun e kontaktimit dhe draftet ekzistuese. Veçon përgjigjet, afatet dhe rastet që kërkojnë shqyrtim.</p><h3>Çfarë bën ti</h3><p>Rishikon draftet, përgjigjet dhe konfliktet. Vendos hapin tregtar të ardhshëm.</p><details><summary>Rrjedha e punës</summary><p>Zbulim → verifikim → kontakte → vlerësim → draft → kontaktim → përgjigje.</p><p>Zbulimi dhe kërkimi i kontakteve të reja nuk kanë ende automatizim të planifikuar të konfirmuar për këtë modul.</p></details></section><details class="pst-eu-extra-controls"><summary>Mjete shtesë</summary><button class="pst-eu-btn" type="button" data-eu-new>+ Kompani e re</button><button class="pst-eu-btn" type="button" data-eu-refresh>Rifresko</button><div data-eu-stage-tools></div></details></aside><main class="pst-eu-work-main"><header class="pst-eu-head"><div><div class="pst-eu-eye">KLIENTË TË DREJTPËRDREJTË NË EVROPË</div><h1>Kompanitë EU</h1><p>Paketa çeliku të fabrikuar, kapacitet prodhues dhe nënkontraktim.</p></div><div class="pst-eu-summary" data-eu-summary aria-live="polite"></div></header><div data-eu-error role="status"></div><div data-eu-controls></div><div data-eu-body></div></main></div>';
 host.appendChild(p);
 p.querySelector('[data-eu-back]').onclick=back;
 p.querySelector('[data-eu-new]').onclick=openIntake;
 p.addEventListener('input',function(e){if(e.target&&e.target.matches('[data-eu-search]')){state.query=e.target.value;renderList()}});
 p.addEventListener('change',function(e){if(e.target&&e.target.matches('[data-eu-country]')){state.country=e.target.value;render()}});
 p.addEventListener('click',function(e){
  var row=e.target.closest&&e.target.closest('[data-eu-id]');if(row){state.selected=row.dataset.euId;render();return}
  var tab=e.target.closest&&e.target.closest('[data-eu-filter]');if(tab){state.filter=tab.dataset.euFilter;state.stage='';render();return}
  var st=e.target.closest&&e.target.closest('[data-eu-stage]');if(st){var v=st.dataset.euStage;state.stage=state.stage===v?'':v;state.filter='all';render();return}
  if(e.target.closest&&e.target.closest('[data-eu-refresh]')){load(true);return}
  if(e.target.closest&&e.target.closest('[data-eu-gmail]'))state.gmailOpenedAt=Date.now();
 });
 return p;
}

function daysTo(v){if(!v)return null;var d=new Date(v),n=new Date();if(isNaN(d.getTime()))return null;d=new Date(d.getFullYear(),d.getMonth(),d.getDate());n=new Date(n.getFullYear(),n.getMonth(),n.getDate());return Math.round((d-n)/86400000)}
function followLabel(r){var n=daysTo(r.next_action_due);if(n===null)return r.next_action||'Pa afat';if(n<0)return'Me vonesë '+Math.abs(n)+' ditë';if(n===0)return'Sot';if(n===1)return'Nesër';return'Pas '+n+' ditësh'}
function needsAction(r){
 if(r.do_not_contact||r.outreach_guard==='blocked'||r.stage==='closed')return r.routing_state==='review';
 if(r.routing_state==='review'||hasDraft(r)||hasReply(r))return true;
 if(r.outreach_guard==='clear'&&r.contact_status==='verified'&&!hasSent(r))return true;
 var n=daysTo(r.next_action_due);return n!==null&&n<=0;
}

function operational(r){if(r.routing_state==='review')return['Kërkon shqyrtim','bad'];if(r.do_not_contact||r.outreach_guard==='blocked')return['Mos kontakto','bad'];if(hasReply(r))return['Përgjigje e marrë','ok'];if(hasDraft(r))return['Draft për rishikim','warn'];if(hasSent(r))return[daysTo(r.next_action_due)!==null&&daysTo(r.next_action_due)<=0?'Afati për rikontaktim':'Në pritje të përgjigjes','neutral'];if(r.contact_status==='verified'&&r.outreach_guard==='clear')return['Gati për kontaktim','ok'];return[stageLabel(r.stage),'neutral']}

function nextActionText(r){if(r.do_not_contact||r.outreach_guard==='blocked')return'Kontaktimi është i ndaluar.';if(r.routing_state==='review')return'Shqyrto përputhjen me modulin tjetër para kontaktimit.';if(r.next_action)return uiText(r.next_action);if(hasReply(r))return'Lexo përgjigjen dhe vendos hapin e ardhshëm.';if(hasDraft(r))return'Hap draftin, kontrollo tekstin dhe vendos manualisht për dërgim.';if(hasSent(r))return daysTo(r.next_action_due)!==null&&daysTo(r.next_action_due)<=0?'Rishiko bisedën dhe vendos nëse duhet rikontaktim.':'Në pritje të përgjigjes; historiku ruhet nga PPPP.';if(r.contact_status!=='verified')return'Kontakti kërkon verifikim përpara përgatitjes së komunikimit.';return'Rishiko kompaninë dhe përgatit hapin e kontaktimit.'}

function readiness(r){var n=0;if(r.company_domain_normalized)n+=20;if(A(r.evidence).length)n+=20;if(r.contact_email)n+=20;if(r.contact_status==='verified')n+=20;if(r.routing_state==='clear'&&!A(r.routing_conflicts).length)n+=10;if(['clear','existing_draft','cooldown_30d'].indexOf(r.outreach_guard)>-1)n+=10;return Math.min(100,n)}
function gmailThread(id){return id?'https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(id):''}
function gmailDraft(id){return id?'https://mail.google.com/mail/u/0/#drafts/'+encodeURIComponent(id):''}
function filtered(){
 var q=N(state.query),rows=state.rows.filter(function(r){return !r.archived_at});
 if(state.filter==='action')rows=rows.filter(needsAction);
 if(state.filter==='drafts')rows=rows.filter(hasDraft);
 if(state.filter==='contacted')rows=rows.filter(hasSent);
 if(state.filter==='replies')rows=rows.filter(hasReply);
 if(state.filter==='research')rows=rows.filter(function(r){return r.contact_status!=='verified'&&!hasDraft(r)&&!hasSent(r)&&!hasReply(r)});
 if(state.stage)rows=rows.filter(function(r){return r.stage===state.stage});
 if(state.country)rows=rows.filter(function(r){return S(r.country)===state.country});
 if(q)rows=rows.filter(function(r){return N([r.company_name,r.company_domain_normalized,r.country,r.contact_name,r.contact_email,r.contact_role,typeLabel(r.company_type),A(r.business_scope).map(scopeLabel).join(' '),r.why_relevant,r.next_action].join(' ')).indexOf(q)>-1});
 return rows.sort(function(a,b){return actionRank(b)-actionRank(a)||numPriority(b)-numPriority(a)});
}

function statusCounts(){var rows=state.rows.filter(function(r){return !r.archived_at}),x={all:rows.length,action:0,contacted:0,drafts:0,replies:0};rows.forEach(function(r){if(needsAction(r))x.action++;if(hasSent(r))x.contacted++;if(hasDraft(r))x.drafts++;if(hasReply(r))x.replies++});return x}

function stageCount(v){return state.rows.filter(function(r){return !r.archived_at&&r.stage===v}).length}
function countryOptions(){var seen={};state.rows.forEach(function(r){if(r.country&&!r.archived_at)seen[r.country]=1});return Object.keys(seen).sort()}
function summary(){var x=statusCounts();return '<b>'+x.all+'</b> kompani · '+x.action+' për veprim · '+x.contacted+' kontaktuar'}
function kpis(){var x=statusCounts(),a=[['Kompani aktive',x.all],['Për veprim',x.action],['Kontaktuar',x.contacted],['Draft / bisedë',x.drafts],['Përgjigje',x.replies]];return'<div class="pst-eu-kpis">'+a.map(function(i){return'<div class="pst-eu-kpi"><b>'+i[1]+'</b><span>'+i[0]+'</span></div>'}).join('')+'</div>'}
function pipeline(){return'<div class="pst-eu-pipeline">'+STAGES.map(function(s){return'<button type="button" class="pst-eu-pipe '+(state.stage===s[0]?'on':'')+'" data-eu-stage="'+E(s[0])+'"><b>'+stageCount(s[0])+'</b><span>'+E(s[1])+'</span></button>'}).join('')+'</div>'}
function controls(){return'<div class="pst-eu-controls"><input class="pst-eu-search" data-eu-search type="search" value="'+E(state.query)+'" aria-label="Kërko kompani" placeholder="Kërko kompani, vend, person ose email"><select class="pst-eu-select" data-eu-country aria-label="Filtro sipas vendit"><option value="">Të gjitha vendet</option>'+countryOptions().map(function(c){return'<option value="'+E(c)+'"'+(state.country===c?' selected':'')+'>'+E(c)+'</option>'}).join('')+'</select></div>'}

function renderList(){
 var p=ensurePage(),body=p.querySelector('[data-eu-body]'),rows=filtered();
 if(!rows.some(function(r){return S(r.id)===S(state.selected)}))state.selected=rows.length?S(rows[0].id):'';
 stableHtml(p.querySelector('[data-eu-error]'),state.error?'<div class="pst-eu-error">Të dhënat nuk u rifreskuan: '+E(state.error)+'</div>':'');
 stableHtml(p.querySelector('[data-eu-work-nav]'),workNav());
 stableHtml(p.querySelector('[data-eu-stage-tools]'),pipeline());
 stableHtml(p.querySelector('[data-eu-summary]'),state.loading?'Duke lexuar të dhënat…':summary());
 var controlsHost=p.querySelector('[data-eu-controls]');if(!controlsHost.querySelector('[data-eu-search]'))controlsHost.innerHTML=controls();
 var country=controlsHost.querySelector('[data-eu-country]');
 if(country){var options='<option value="">Të gjitha vendet</option>'+countryOptions().map(function(c){return'<option value="'+E(c)+'">'+E(c)+'</option>'}).join('');stableHtml(country,options);country.value=state.country;}
 stableHtml(body,'<div class="pst-eu-shell"><div class="pst-eu-table"><div class="pst-eu-headrow"><span>Kompania</span><span>Mundësia PriSteel</span><span>Gjendja dhe hapi i ardhshëm</span></div>'+(rows.length?rows.map(function(r){var o=operational(r);return'<button type="button" class="pst-eu-row '+(S(r.id)===S(state.selected)?'on':'')+'" aria-pressed="'+(S(r.id)===S(state.selected))+'" data-eu-id="'+E(r.id)+'"><span><b>'+E(r.company_name)+'</b><small>'+E(r.country||'—')+' · '+E(r.company_domain_normalized||'')+'</small></span><span><b>'+E(fitText(r))+'</b><small>'+E(contactText(r))+'</small></span><span><i class="pst-eu-chip '+o[1]+'">'+E(o[0])+'</i><small>'+E(nextActionText(r))+'</small></span></button>'}).join(''):'<div class="pst-eu-empty">'+(state.loading?'Duke ngarkuar kompanitë…':state.filter==='action'?'Nuk ka kompani që kërkojnë veprim tani. Zgjidh “Të gjitha” për historikun.':'Nuk ka kompani në këtë pamje.')+'</div>')+'</div>'+renderDetail(selected())+'</div>');
}

function evidenceHtml(r){var xs=A(r.evidence).filter(function(x){return !!safeUrl(x.url)});if(!xs.length)return'<p>Nuk ka burim të strukturuar me lidhje të vlefshme.</p>';return'<div class="pst-eu-evidence">'+xs.slice(0,8).map(function(x){return'<a href="'+E(safeUrl(x.url))+'" target="_blank" rel="noopener"><b>'+E(x.type==='contact'?'Kontakt / rol':'Kompani / projekt')+'</b><span>'+E(uiText(x.source)||'Burim')+' · '+E(x.verified_on||'—')+'</span></a>'}).join('')+'</div>'}

function renderDetail(r){
 if(!r)return'<aside class="pst-eu-side"><div class="pst-eu-side-empty">Zgjidh një kompani për kontaktet, komunikimin dhe hapin e ardhshëm.</div></aside>';
 var conflicts=A(r.routing_conflicts),scopes=A(r.business_scope).map(scopeLabel),o=operational(r),draft=gmailDraft(r.gmail_thread_id||r.gmail_draft_id),thread=gmailThread(r.gmail_thread_id),act='';
 if(hasReply(r)&&thread)act='<a class="primary" data-eu-gmail href="'+E(thread)+'" target="_blank" rel="noopener">'+gmailIcon()+'Lexo përgjigjen</a>';
 else if(hasDraft(r)&&draft)act='<a class="primary" data-eu-gmail href="'+E(draft)+'" target="_blank" rel="noopener">'+gmailIcon()+'Hap draftin</a>';
 else if(thread)act='<a class="primary" data-eu-gmail href="'+E(thread)+'" target="_blank" rel="noopener">'+gmailIcon()+'Hap bisedën</a>';
 var website=safeUrl(r.company_website),contactEmail=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(S(r.contact_email))?r.contact_email:'';
 return'<aside class="pst-eu-side"><div class="pst-eu-side-head"><div class="pst-eu-eye">'+E(typeLabel(r.company_type))+'</div><h2>'+E(r.company_name)+'</h2><div class="pst-eu-detail-meta">'+E(r.country||'')+' · '+E(r.company_domain_normalized||'')+'</div><div class="pst-eu-side-badges"><i class="pst-eu-chip '+o[1]+'">'+E(o[0])+'</i></div></div>'+
 '<section class="pst-eu-section"><h3>Çfarë duhet bërë</h3><p>'+E(nextActionText(r))+'</p>'+(r.next_action_due?'<small>Afati: '+E(D(r.next_action_due))+' · '+E(followLabel(r))+'</small>':'')+'<div class="pst-eu-side-actions">'+act+'</div></section>'+
 '<section class="pst-eu-section"><h3>Mundësia për PriSteel</h3><p>'+E(uiText(r.why_relevant)||fitText(r))+'</p><div class="pst-eu-tags">'+scopes.map(function(x){return'<span>'+E(x)+'</span>'}).join('')+'</div></section>'+
 '<section class="pst-eu-section"><h3>Kontakti</h3><p>'+E(r.contact_name||'Personi përgjegjës nuk është konfirmuar')+(r.contact_role?'<br>'+E(uiText(r.contact_role)):'')+'</p>'+(contactEmail?'<a href="mailto:'+E(contactEmail)+'">'+E(contactEmail)+'</a>':'<p>Adresa e kontaktit mungon.</p>')+'<small>'+E(contactLabel(r.contact_status))+'</small></section>'+
 '<section class="pst-eu-section"><h3>Komunikimi</h3><p>'+E(outreachLabel(r.outreach_status))+'</p>'+(r.last_outbound_at||r.contact_master_last_contact||r.last_contact_at?'<small>Kontakti i fundit: '+E(D(r.last_outbound_at||r.contact_master_last_contact||r.last_contact_at))+'</small>':'')+'<small>'+E(guardLabel(r.outreach_guard))+'</small></section>'+
 (r.routing_state==='review'?'<section class="pst-eu-section"><h3>Kërkon shqyrtim</h3><p>Përputhje me '+E(conflicts.map(routeLabel).join(' · ')||'një modul tjetër')+'. Verifiko identitetin para kontaktimit.</p></section>':'')+
 '<details class="pst-eu-section pst-eu-details"><summary>Burimet dhe të dhënat shtesë</summary>'+(website?'<p><a href="'+E(website)+'" target="_blank" rel="noopener">Faqja e kompanisë ↗</a></p>':'')+evidenceHtml(r)+'<div class="pst-eu-kv"><span>Faza</span><span>'+E(stageLabel(r.stage))+'</span><span>Gatishmëria</span><span>'+readiness(r)+'/100</span><span>Prioriteti</span><span>'+E(r.priority_score==null?'—':r.priority_score)+'</span><span>Verifikuar</span><span>'+E(D(r.last_verified_at))+'</span><span>Regjistri i kontakteve</span><span>'+(r.known_in_contact_master?'Po':'Jo')+'</span></div></details></aside>';
}

function render(){renderList();renderHome();renderSidebar()}
async function load(force){
 if(state.loadPromise)return state.loadPromise;
 if(state.loaded&&!force){render();return}
 if(typeof window.supaFetch!=='function'){state.error='Lidhja me PPPP nuk është gati.';render();return}
 state.loading=true;state.error='';render();
 state.loadPromise=Promise.resolve().then(async function(){
  try{
   state.rows=A(await window.supaFetch(VIEW+'?select=*&archived_at=is.null&order=priority_score.desc.nullslast,updated_at.desc&limit=500'));
   state.loaded=true;state.lastLoadedAt=Date.now();
   if(state.selected&&!state.rows.some(function(r){return S(r.id)===S(state.selected)}))state.selected='';
  }catch(e){state.error=S(e&&e.message||e)}
  finally{state.loading=false;state.loadPromise=null;render()}
 });
 return state.loadPromise;
}

function enhanceCss(){
 if(document.getElementById('pst-eu-companies-v2-css'))return;
 var s=document.createElement('style');s.id='pst-eu-companies-v2-css';
 s.textContent='.pst-eu-head{align-items:flex-start;margin-bottom:10px}.pst-eu-actions{display:flex;gap:7px;flex-wrap:wrap}.pst-eu-btn.primary{background:#4b91a5;border-color:#4b91a5;color:#fff}.pst-eu-rule{margin-bottom:10px;padding:9px 11px;border:1px solid #dce8e9;border-radius:10px;background:#f3f8f8;color:#647b83;font-size:9px;line-height:1.45}.pst-eu-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid var(--eu-line);border-radius:12px;background:#fff;overflow:hidden;margin-bottom:9px}.pst-eu-kpi{padding:9px 12px;border-right:1px solid #e9eff0}.pst-eu-kpi:last-child{border-right:0}.pst-eu-kpi b{display:block;font-size:18px;color:#2c5361}.pst-eu-kpi span{font-size:7.8px;text-transform:uppercase;font-weight:800;color:#85949a}.pst-eu-pipeline{display:flex;gap:5px;overflow-x:auto;margin-bottom:9px}.pst-eu-pipe{min-width:105px;flex:1;border:1px solid var(--eu-line);border-radius:10px;background:#fff;padding:7px 9px;cursor:pointer;text-align:left;color:#61777f}.pst-eu-pipe.on{border-color:#95bfca;background:#eef7f8;color:#2d6475}.pst-eu-pipe b{display:block;font-size:12px}.pst-eu-pipe span{font-size:7.8px;font-weight:750;text-transform:uppercase;white-space:nowrap}.pst-eu-controls{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:9px}.pst-eu-tabs{display:flex;gap:5px}.pst-eu-tab{border:1px solid var(--eu-line);border-radius:999px;background:#fff;color:#637980;padding:6px 9px;font-size:8.5px;font-weight:820;cursor:pointer}.pst-eu-tab.on{background:#3c7688;border-color:#3c7688;color:#fff}.pst-eu-select{height:40px;border:1px solid var(--eu-line);border-radius:10px;background:#fff;padding:0 9px;color:#526970;font-size:9px}.pst-eu-shell{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:12px;align-items:start}.pst-eu-headrow,.pst-eu-row{grid-template-columns:minmax(180px,1.08fr) 92px minmax(170px,1.1fr) minmax(165px,.95fr) 118px 104px}.pst-eu-row.on{background:#f6fafb;box-shadow:inset 3px 0 0 #3c7688}.pst-eu-chip.neutral{background:#eff2f3;color:#66777c}.pst-eu-side{position:sticky;top:10px;border:1px solid var(--eu-line);border-radius:14px;background:#fff;overflow:hidden}.pst-eu-side-empty{padding:28px 20px;text-align:center;color:#809197;font-size:10px;line-height:1.5}.pst-eu-side-head{padding:14px 15px 12px;border-bottom:1px solid #e9eff0;background:linear-gradient(135deg,#fff,#f4f9fa)}.pst-eu-side-head h2{margin:3px 0 2px;font-size:18px;color:#244753}.pst-eu-side-badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.pst-eu-side-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.pst-eu-side-actions a{min-height:30px;border:1px solid #cfe0e4;border-radius:8px;background:#fff;color:#326f82;padding:0 9px;font-size:8.5px;font-weight:820;text-decoration:none;display:inline-flex;align-items:center}.pst-eu-side-actions a.primary{background:#4b91a5;border-color:#4b91a5;color:#fff}.pst-eu-side .pst-eu-section{padding:12px 15px;border-top:1px solid #edf1f2}.pst-eu-side .pst-eu-section h3{margin:0 0 8px;font-size:8px}.pst-eu-evidence{display:grid;gap:6px}.pst-eu-evidence a{display:block;border:1px solid #e3eaeb;border-radius:8px;padding:7px 8px;text-decoration:none;color:#446b78;font-size:8.8px;background:#fcfdfd}.pst-eu-evidence a b,.pst-eu-evidence a span{display:block}.pst-eu-evidence a span{color:#849499;margin-top:2px}#pst-eu-companies-home-v1.pst-morning-lane{margin:0;min-width:0}.pst-eu-home{border:1px solid #d8e5e8;background:#f2f8fa;border-radius:15px;overflow:hidden}.pst-eu-home-head{display:flex;justify-content:space-between;gap:12px;padding:14px 16px 12px}.pst-eu-home-open{font-size:9.5px;font-weight:760;color:#367a91}.pst-eu-home-stats{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #dce7e9}.pst-eu-home-stat{padding:11px 8px;text-align:center;border-right:1px solid #dce7e9}.pst-eu-home-stat:last-child{border-right:0}.pst-eu-home-stat b{display:block;font-size:17px;color:#315e6d}.pst-eu-home-stat span{display:block;margin-top:3px;font-size:7.6px;color:#839298;text-transform:uppercase;font-weight:700}#pst-eu-companies-nav-v1 .pst-eu-nav-count{margin-left:auto;min-width:20px;height:20px;border-radius:999px;background:#eef6f8;color:#38788d;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:850;padding:0 5px}.sidebar:not(.open) #pst-eu-companies-nav-v1 .pst-eu-nav-count{display:none}.pst-eu-modal{position:fixed;inset:0;z-index:9400;background:rgba(23,45,53,.34);display:grid;place-items:center;padding:18px}.pst-eu-dialog{width:min(720px,100%);max-height:92vh;overflow:auto;border-radius:15px;background:#f7fafb;box-shadow:0 24px 80px rgba(19,39,46,.24)}.pst-eu-dialog-head{background:#fff;border-bottom:1px solid var(--eu-line);padding:13px 15px;display:flex;justify-content:space-between;gap:10px}.pst-eu-dialog-head h2{margin:0;font-size:17px}.pst-eu-dialog-head p{margin:3px 0 0;font-size:9px;color:#7b8c92}.pst-eu-dialog-body{padding:13px}.pst-eu-form{display:grid;grid-template-columns:1fr 1fr;gap:9px}.pst-eu-field.full{grid-column:1/-1}.pst-eu-field label{display:block;margin-bottom:4px;font-size:8px;text-transform:uppercase;color:#819299;font-weight:800}.pst-eu-field input,.pst-eu-field select,.pst-eu-field textarea{width:100%;border:1px solid var(--eu-line);border-radius:8px;background:#fff;padding:8px 9px;font-size:10px}.pst-eu-field textarea{min-height:62px}.pst-eu-preflight{grid-column:1/-1;border:1px solid #d9e6e8;border-radius:9px;background:#fff;padding:10px;font-size:9px;line-height:1.5}.pst-eu-dialog-foot{display:flex;justify-content:flex-end;gap:7px;padding:0 13px 13px}@media(max-width:1120px){.pst-eu-shell{grid-template-columns:1fr}.pst-eu-side{position:static}}@media(max-width:760px){.pst-eu-kpis{grid-template-columns:repeat(2,1fr)}.pst-eu-shell{grid-template-columns:1fr}.pst-eu-form{grid-template-columns:1fr}.pst-eu-field.full,.pst-eu-preflight{grid-column:auto}}';
 document.head.appendChild(s);
}
function ensureHome(){
 var home=document.getElementById('pst-home-launchpad-v1'),lanes=home&&home.querySelector('.pst-morning-lanes'),opportunities=lanes&&lanes.querySelector('.pst-morning-lane.opportunities');if(!home||!lanes||!opportunities)return false;
 var card=document.getElementById('pst-eu-companies-home-v1');if(!card){card=document.createElement('section');card.id='pst-eu-companies-home-v1';card.onclick=open}
 card.className='pst-morning-lane eu-direct';
 var rep=document.getElementById('pst-representations-home-v1');if(card.parentNode!==lanes){if(rep&&rep.parentNode===lanes)lanes.insertBefore(card,rep.nextSibling);else lanes.insertBefore(card,opportunities.nextSibling)}
 renderHome();return true;
}
function renderHome(){var card=document.getElementById('pst-eu-companies-home-v1');if(!card)return;var x=statusCounts();card.innerHTML='<button class="pst-eu-home" type="button"><div class="pst-eu-home-head"><div><div class="pst-eu-home-eye">KOMPANITË EU</div><div class="pst-eu-home-title">Klientë të drejtpërdrejtë</div><div class="pst-eu-home-sub">Çelik i fabrikuar · kapacitet prodhues · nënkontraktim</div></div><div class="pst-eu-home-open">Hap →</div></div><div class="pst-eu-home-stats"><div class="pst-eu-home-stat"><b>'+x.all+'</b><span>Kompani</span></div><div class="pst-eu-home-stat"><b>'+x.action+'</b><span>Për veprim</span></div><div class="pst-eu-home-stat"><b>'+x.contacted+'</b><span>Kontaktuar</span></div><div class="pst-eu-home-stat"><b>'+x.drafts+'</b><span>Draft / bisedë</span></div></div></button>'}
function ensureSidebar(){var host=document.getElementById('side-nav');if(!host)return false;var item=document.getElementById('pst-eu-companies-nav-v1');if(!item){item=document.createElement('div');item.id='pst-eu-companies-nav-v1';item.className='nav-item';item.title='Kompanitë EU — klientë të drejtpërdrejtë';item.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 5V3h10v2M8 10h2M14 10h2M8 14h2M14 14h2"/></svg><span class="sb-lbl">Kompanitë EU</span><span class="sb-lbl pst-eu-nav-count" data-eu-nav-count>0</span>';item.onclick=open}var children=Array.prototype.slice.call(host.children),anchor=children.find(function(x){return /përfaqësime|perfaqesime/i.test(S(x.textContent))})||children.find(function(x){return /mundësitë|mundesite/i.test(S(x.textContent))});if(item.parentNode!==host){if(anchor&&anchor.nextSibling)host.insertBefore(item,anchor.nextSibling);else host.appendChild(item)}renderSidebar();return true}
function renderSidebar(){var item=document.getElementById('pst-eu-companies-nav-v1');if(!item)return;var c=item.querySelector('[data-eu-nav-count]'),x=statusCounts();if(c)c.textContent=x.action||x.all;var p=document.getElementById('page-eu-companies');item.classList.toggle('active',!!(p&&p.classList.contains('active')&&p.style.display!=='none'))}
function watchSidebar(){var host=document.getElementById('side-nav');if(!host||navObserver)return;try{navObserver=new MutationObserver(function(){if(!document.getElementById('pst-eu-companies-nav-v1'))setTimeout(ensureSidebar,0)});navObserver.observe(host,{childList:true})}catch(e){}}
function normalizeDomain(v){return S(v).trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split(/[\/#:?]/)[0]}
function openIntake(){var old=document.getElementById('pst-eu-intake-modal');if(old)old.remove();state.preflight=null;var m=document.createElement('div');m.id='pst-eu-intake-modal';m.className='pst-eu-modal';m.innerHTML='<div class="pst-eu-dialog"><div class="pst-eu-dialog-head"><div><h2>Kompani e re · Klient direkt</h2><p>Kontrolli paraprak dhe përgatitje e kërkesës. Shfletuesi nuk shkruan direkt në PPPP.</p></div><button class="pst-eu-btn" data-close>✕</button></div><div class="pst-eu-dialog-body"><div class="pst-eu-form"><div class="pst-eu-field"><label>Kompania *</label><input id="eu-i-name"></div><div class="pst-eu-field"><label>Domeni zyrtar *</label><input id="eu-i-domain" placeholder="company.com"></div><div class="pst-eu-field"><label>Vendi *</label><input id="eu-i-country"></div><div class="pst-eu-field"><label>Kodi</label><input id="eu-i-code" maxlength="2"></div><div class="pst-eu-field"><label>Kontakti</label><input id="eu-i-contact"></div><div class="pst-eu-field"><label>Email</label><input id="eu-i-email" type="email"></div><div class="pst-eu-field full"><label>Pse është relevante</label><textarea id="eu-i-why"></textarea></div><div class="pst-eu-field full"><label>Burimi publik</label><input id="eu-i-source" placeholder="https://..."></div><div class="pst-eu-preflight" data-preflight>Ende nuk është bërë kontrolli paraprak.</div></div></div><div class="pst-eu-dialog-foot"><button class="pst-eu-btn" data-check>Kontrollo duplikimin</button><button class="pst-eu-btn primary" data-copy>Përgatit kërkesën për PPPP</button></div></div>';document.body.appendChild(m);m.onclick=function(e){if(e.target===m||e.target.closest('[data-close]'))m.remove()};m.querySelector('[data-check]').onclick=preflightIntake;m.querySelector('[data-copy]').onclick=copyIntake}
function intake(){function v(id){var e=document.getElementById(id);return e?S(e.value).trim():''}return{company_name:v('eu-i-name'),company_domain:normalizeDomain(v('eu-i-domain')),country:v('eu-i-country'),country_code:v('eu-i-code').toUpperCase(),contact_name:v('eu-i-contact'),contact_email:v('eu-i-email').toLowerCase(),why_relevant:v('eu-i-why'),source_url:v('eu-i-source')}}
async function preflightIntake(){var p=intake(),box=document.querySelector('[data-preflight]');if(!p.company_name||!p.company_domain||!p.country){state.preflight={ok:false};box.textContent='Plotëso kompaninë, domenin dhe vendin.';return}box.textContent='Duke kontrolluar identitetin në Kompanitë EU…';try{var rows=A(await window.supaFetch(VIEW+'?select=id,company_name,company_domain_normalized,contact_email,country,stage&archived_at=is.null&limit=500')),d=p.company_domain,em=N(p.contact_email),nm=N(p.company_name),m=rows.filter(function(r){return normalizeDomain(r.company_domain_normalized)===d||(em&&N(r.contact_email)===em)||(N(r.company_name)===nm&&N(r.country)===N(p.country))});state.preflight={ok:!m.length};box.innerHTML=m.length?'<b>⚠ U gjet përputhje:</b> '+m.map(function(x){return E(x.company_name)+' · '+E(stageLabel(x.stage))}).join('<br>'):'<b>✓ Pa duplikat brenda Kompanive EU.</b><br>PPPP kontrollon edhe Blerësit e çelikut, Mundësitë, Përfaqësimet dhe historikun e kontaktimit para regjistrimit.'}catch(e){state.preflight={ok:false};box.textContent='Kontrolli dështoi: '+S(e&&e.message||e)}}
async function copyIntake(){var p=intake();if(!state.preflight||!state.preflight.ok){await preflightIntake();if(!state.preflight||!state.preflight.ok)return}var txt='Regjistroje në PPPP si Kompani EU / klient direkt. Kontrollo identitetin kanonik dhe përkatësinë e modulit kundër Mundësive, Blerësve të çelikut, Përfaqësimeve dhe historikut të kontaktimit. Mos e nis komunikimin dhe mos krijo projekt automatikisht.\n\nKompania: '+p.company_name+'\nDomeni: '+p.company_domain+'\nVendi: '+p.country+' ('+(p.country_code||'—')+')\nPse relevante: '+(p.why_relevant||'—')+'\nKontakt: '+(p.contact_name||'—')+' | '+(p.contact_email||'—')+'\nBurimi: '+(p.source_url||'—');try{await navigator.clipboard.writeText(txt);window.alert('Kërkesa u kopjua. Ngjite në ChatGPT; regjistrimi kalon përmes rrugës së kontrolluar të PPPP.')}catch(e){window.prompt('Kopjo kërkesën për PPPP:',txt)}}
function open(){var p=ensurePage();hideOthers(p);p.style.display='block';p.classList.add('active');setRoute(true);ensureSidebar();renderSidebar();try{window.scrollTo(0,0)}catch(e){}load(state.loaded&&Date.now()-state.lastLoadedAt>=300000);return true}

function back(){setRoute(false);var p=document.getElementById('page-eu-companies');if(p){p.classList.remove('active');p.style.display='none'}renderSidebar();try{var n=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1;if(n&&typeof n.openHome==='function'){n.openHome();return}}catch(e){}try{if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('home')}catch(e){}}
function boot(){enhanceCss();ensurePage();ensureHome();ensureSidebar();watchSidebar();if(location.hash==='#kompanite-eu')open();else load(false)}
document.addEventListener('pst:native-home-ready',function(){setTimeout(function(){ensureHome();ensureSidebar()},0)});
document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(function(){ensureHome();ensureSidebar()},0)});
document.addEventListener('pst:modules-ready',function(){setTimeout(boot,0)},{once:true});
window.addEventListener('focus',syncOnReturn);
document.addEventListener('visibilitychange',syncOnReturn);
window.addEventListener('popstate',function(){if(location.hash==='#kompanite-eu')open();else renderSidebar()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)},{once:true});else setTimeout(boot,0);
window.PSTEUCompaniesV1={version:'v3-albanian-decision-workbench',open:open,refresh:function(){return load(true)},newCompany:openIntake,snapshot:function(){return{rows:state.rows.slice(),selected:state.selected,error:state.error,loaded:state.loaded,filter:state.filter,stage:state.stage}}};
})();
