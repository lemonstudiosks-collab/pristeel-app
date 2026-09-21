/* PRISTEEL Opportunities Desk v1
 * Presentation/filter owner for the canonical Project-Centric Opportunities workflow.
 * Keeps one read path, performs no database writes and never sends outbound communication.
 */
(function(){
'use strict';
if(window.__pstOpportunitiesDeskV1)return;
window.__pstOpportunitiesDeskV1=true;
window.__pstOpportunitiesMindmapV6=true;
window.__pstOpportunitiesMindmapV5=true;
window.__pstOpportunitiesMindmapV4=true;
window.__pstOpportunitiesFilterPolishV1=true;

var VERSION='20260921-opportunity-desk2';
var density='comfortable',filtersOpen=true,api=null,state=null,observer=null,observerRoot=null,scheduled=false,decorating=false;
var SOURCES=['TED','KRPP','APP_AL','MCA_KOSOVO','KCF','RCF','EBRD_ECEPP','WORLD_BANK','UNGM','EU_OFFICE_KOSOVO'];
var LABEL={TED:'TED',KRPP:'KRPP',APP_AL:'APP',MCA_KOSOVO:'MCA Kosovo',KCF:'KCF',RCF:'RCF',EBRD_ECEPP:'EBRD',WORLD_BANK:'World Bank',UNGM:'UNGM',EU_OFFICE_KOSOVO:'EU Office Kosovo'};
var SOURCE_ICON={TED:'EU',KRPP:'KS',APP_AL:'AL',MCA_KOSOVO:'MCA',KCF:'KCF',RCF:'RCF',EBRD_ECEPP:'EB',WORLD_BANK:'WB',UNGM:'UN',EU_OFFICE_KOSOVO:'EU'};
var FIELDS=[
 {id:'construction',label:'Ndërtim',icon:'▦',re:/\b(construction|ndertim|ndërtim|building|buildings|bau|hochbau|steel|çelik|celik|metal|structur|konstrukt|hall|roof|çati|cati|facade|fasad|weld|fabricat|montag|renov|rehabilit)/i},
 {id:'infrastructure',label:'Infrastrukturë',icon:'╫',re:/\b(infrastruct|road|rrug|highway|motorway|rail|hekurudh|bridge|urë|ure|tunnel|airport|port|water|ujësjell|ujesjell|sewer|kanaliz|pipeline|transport network)/i},
 {id:'energy',label:'Energji',icon:'ϟ',re:/\b(energy|energji|electric|elektr|power|solar|photovoltaic|\bpv\b|wind|battery|bess|substation|transformer|grid|transmission|distribution)/i},
 {id:'supply',label:'Furnizim',icon:'◆',re:/\b(supply|furniz|procurement|purchase|blerje|material|equipment|pajis|delivery|dorëzim|dorezim|goods|product)/i},
 {id:'services',label:'Shërbime',icon:'♙',re:/\b(service|shërbim|sherbim|consult|design|projektim|engineering|inxhinier|supervision|mbikëqyr|mbikeqyr|study|audit|maintenance|mirëmbajt|mirembajt)/i},
 {id:'other',label:'Të tjera',icon:'•••',re:null}
];
var WINNERS=[
 {id:'gc_epc',label:'GC / EPC',hint:'klient potencial',icon:'▰'},
 {id:'other',label:'Për verifikim',hint:'rol i paqartë / konsorcium',icon:'?'},
 {id:'producer',label:'Prodhues çeliku',hint:'kapacitet / konkurrencë',icon:'⚙'}
];

function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function current(){api=window.PSTProjectCentricWorkflowV1||api;state=api&&api._state||state;return api;}
function rowText(r){var p=r&&r.payload&&typeof r.payload==='object'?r.payload:{};return[r&&r.title,r&&r.description,r&&r.authority,r&&r.procurement_no,r&&r.publication_no,r&&r.cpv,r&&r.cpv_code,A(r&&r.match_reasons).join(' '),p.title,p.description,p.cpv,p.cpv_code,p.cpv_description,p.scope,p.category].map(S).join(' ');}
function srcOf(r){var x=current(),fn=x&&x._test&&x._test.tenderSource;return fn?fn(r):S(r&&r.source_key||r&&r.payload&&r.payload.source||'KRPP').toUpperCase();}
function fieldOf(r){var x=current(),fn=x&&x._test&&x._test.opportunityField;if(typeof fn==='function')return fn(r);var t=rowText(r);for(var i=0;i<FIELDS.length-1;i++)if(FIELDS[i].re.test(t))return FIELDS[i].id;return'other';}
function winnerOf(r){var x=current(),fn=x&&x._test&&x._test.winnerGroup;if(typeof fn==='function')return fn(r);if(srcOf(r)!=='TED')return'local';var p=r&&r.payload&&typeof r.payload==='object'?r.payload:{},w=p.winner&&typeof p.winner==='object'?p.winner:{},role=S(w.company_type||(w.company_classification&&w.company_classification.company_type)||'unknown').toLowerCase();return role==='gc_epc'?'gc_epc':role==='producer'?'producer':'other';}
function lifeOf(r){var x=current(),fn=x&&x._test&&x._test.opportunityLifecycle,l=fn?fn(r):'new';return l==='draft'?'waiting':l;}
function baseRows(){var x=current();if(!x||!state)return[];var rows=A(state.rows),t=x._test||{};if(typeof t.tenderVisible==='function')rows=rows.filter(t.tenderVisible);if(typeof t.dedupeOpportunities==='function')rows=t.dedupeOpportunities(rows);return rows;}
function filteredRows(){var x=current(),fn=x&&x._test&&x._test.opportunityRows;return typeof fn==='function'?A(fn()):baseRows();}
function counts(){
 var rows=baseRows(),c={total:rows.length,local:0,award:0,life:{new:0,waiting:0,replied:0},src:{},field:{},winner:{gc_epc:0,other:0,producer:0}};
 SOURCES.forEach(function(k){c.src[k]=0;});FIELDS.forEach(function(f){c.field[f.id]=0;});
 rows.forEach(function(r){var s=srcOf(r),l=lifeOf(r),f=fieldOf(r),w=winnerOf(r);if(s==='TED')c.award++;else c.local++;if(c.life[l]!=null)c.life[l]++;if(c.src[s]!=null)c.src[s]++;if(c.field[f]!=null)c.field[f]++;if(c.winner[w]!=null)c.winner[w]++;});
 return c;
}
function loadBridge(){if(window.__pstOpportunitiesWaitingBridgeV1||document.querySelector('script[data-pst-opportunities-waiting-bridge]'))return;var b=document.createElement('script');b.src='pristeel-opportunities-waiting-bridge-v1.js?v=20260913-waiting1';b.defer=true;b.dataset.pstOpportunitiesWaitingBridge='1';document.head.appendChild(b);}
function css(){
 var old=document.getElementById('pst-opportunities-filter-polish-v1-css');if(old)old.remove();
 var s=document.createElement('style');s.id='pst-opportunities-filter-polish-v1-css';s.textContent=`
body:has(#page-kek-tenders.active) .app-shell>.sidebar{display:none!important;width:0!important;min-width:0!important;max-width:0!important;border:0!important}
body:has(#page-kek-tenders.active) .app-shell>.main{width:100%!important;max-width:none!important;min-width:0!important}
body:has(#page-kek-tenders.active) .main>.topbar{display:none!important}
body.pst-ui-v2:has(#page-kek-tenders.active) .content,body:has(#page-kek-tenders.active) .content{max-width:none!important;width:100%!important;margin:0!important;padding:18px 28px 46px!important;background:#f6f8f9!important}
body:has(#page-kek-tenders.active) #page-kek-tenders .pst-kek-layout{max-width:none!important;width:100%!important;margin:0!important}
#page-kek-tenders .pst-kek-head{display:none!important}
#page-kek-tenders #pst-opportunities-focus{max-width:1460px!important;width:100%!important;margin:0 auto!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
#pst-opportunities-focus>header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:18px!important;margin:0 0 16px!important;padding:4px 2px!important}
.pst-opp-desk-head-left{display:flex;align-items:center;gap:16px;min-width:0}.pst-opp-desk-back{display:inline-flex!important;align-items:center;justify-content:center;height:42px;padding:0 15px;border:1px solid #c7d9df;border-radius:12px;background:#fff;color:#3f7183;font-size:11px;font-weight:850;cursor:pointer;box-shadow:0 2px 8px rgba(38,67,79,.04)}.pst-opp-desk-back:hover{background:#edf5f7;border-color:#a9c9d3}.pst-opp-desk-title>span{display:block;font-size:9px;font-weight:900;letter-spacing:.13em;color:#6e8791}.pst-opp-desk-title h2{margin:3px 0 0!important;font-size:28px!important;letter-spacing:-.035em!important;color:#233a44!important}.pst-opp-desk-title p{margin:4px 0 0!important;font-size:11px!important;color:#7b8d94!important}
.pst-opp-density{display:flex;padding:3px;border:1px solid #dbe6e9;border-radius:11px;background:#fff}.pst-opp-density button{height:32px;padding:0 11px;border:0;border-radius:8px;background:transparent;color:#71828a;font-size:10px;font-weight:800;cursor:pointer}.pst-opp-density button.on{background:#edf5f7;color:#39798f}
#pst-pcw-opportunity-tools{display:flex!important;align-items:center!important;gap:10px!important;margin:0 0 14px!important}#pst-pcw-opportunity-tools label{height:50px!important;flex:1!important;display:flex!important;align-items:center!important;gap:10px!important;padding:0 15px!important;border:1px solid #dbe5e8!important;border-radius:14px!important;background:#fff!important;box-shadow:0 2px 9px rgba(38,67,79,.025)!important}#pst-pcw-opportunity-tools label>span{font-size:0!important}#pst-pcw-opportunity-tools label>span:before{content:'⌕';font-size:20px;color:#62808b}#pst-pcw-opportunity-search{height:46px!important;flex:1!important;border:0!important;outline:0!important;background:transparent!important;font-size:13px!important;color:#2f4751!important}.pst-opp-filter-toggle{height:50px;padding:0 15px;border:1px solid #dbe5e8;border-radius:14px;background:#fff;color:#536d78;font-size:10px;font-weight:850;cursor:pointer}.pst-opp-filter-toggle.on{background:#eef6f8;border-color:#bad6df;color:#35758d}
#pst-opportunities-focus:has(#pst-opp-desk) #pst-pcw-lifecycle-tabs,#pst-opportunities-focus:has(#pst-opp-desk) #pst-pcw-opportunity-tabs{display:none!important}
#pst-opp-desk{display:grid;gap:12px;margin-bottom:14px}.pst-opp-route-grid{display:grid;grid-template-columns:.72fr 1fr 1fr;gap:12px}.pst-opp-route{min-height:122px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px;border:1px solid #dce5e8;border-radius:18px;background:#fff;text-align:left;color:#314952;cursor:pointer;box-shadow:0 3px 14px rgba(42,68,78,.035);transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}.pst-opp-route:hover{border-color:#b7d1da;box-shadow:0 8px 22px rgba(42,68,78,.07)}.pst-opp-route.on{border-color:#86b8c8;box-shadow:0 0 0 3px rgba(79,151,175,.07),0 7px 20px rgba(42,68,78,.06)}.pst-opp-route.local{background:linear-gradient(145deg,#fff,#f8fbfc)}.pst-opp-route.award{background:linear-gradient(145deg,#fff,#fafaf7)}.pst-opp-route .route-copy>span{font-size:9px;font-weight:900;letter-spacing:.1em;color:#79909a}.pst-opp-route .route-copy>b{display:block;margin-top:5px;font-size:16px;color:#29434e}.pst-opp-route .route-copy>small{display:block;margin-top:6px;max-width:360px;font-size:10px;line-height:1.45;color:#7c8d94}.pst-opp-route .route-count{min-width:54px;height:54px;border-radius:15px;display:grid;place-items:center;background:#edf5f7;color:#397b91;font-size:18px;font-weight:850}.pst-opp-route.award .route-count{background:#f2f1eb;color:#756b4e}.pst-opp-route.all .route-count{background:#f0f3f4;color:#596f79}
.pst-opp-mini-stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #e0e7e9;border-radius:15px;background:#fff;overflow:hidden}.pst-opp-mini-stat{min-height:64px;display:flex;align-items:center;gap:10px;padding:10px 15px;border-right:1px solid #e8edef}.pst-opp-mini-stat:last-child{border-right:0}.pst-opp-mini-stat .ico{width:31px;height:31px;border-radius:10px;display:grid;place-items:center;background:#f0f5f6;color:#5b8190}.pst-opp-mini-stat b{display:block;font-size:15px;color:#2d4650}.pst-opp-mini-stat small{display:block;margin-top:1px;font-size:9px;color:#87969c}
.pst-opp-filter-panel{display:grid;gap:13px;padding:16px 17px;border:1px solid #dfe7e9;border-radius:16px;background:#fff}.pst-opp-filter-panel[hidden]{display:none!important}.pst-opp-filter-row{display:grid;grid-template-columns:118px minmax(0,1fr);gap:14px;align-items:start}.pst-opp-filter-label{padding-top:13px;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#7b8d94}.pst-opp-filter-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;width:100%;min-width:0}.pst-opp-chip{min-height:44px;padding:6px 9px 6px 7px;border:1px solid #dce6e9;border-radius:12px;background:#fbfcfd;color:#536b75;font-size:10px;font-weight:780;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;min-width:0;transition:border-color .14s ease,background .14s ease,box-shadow .14s ease,transform .14s ease}.pst-opp-chip:hover{border-color:#b5cfd8;background:#f6fafb;box-shadow:0 4px 12px rgba(42,68,78,.055);transform:translateY(-1px)}.pst-opp-chip.on{border-color:#8fbcc9;background:#eaf5f8;color:#2f748c;box-shadow:0 0 0 2px rgba(79,151,175,.055)}.pst-opp-chip-main{display:flex;align-items:center;gap:8px;min-width:0}.pst-opp-chip-icon{width:28px;height:28px;flex:0 0 28px;border-radius:9px;display:grid;place-items:center;background:#eef3f5;color:#587581;font-size:9px;font-weight:900;letter-spacing:-.02em}.pst-opp-chip-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pst-opp-chip .count{margin-left:auto;min-width:24px;text-align:right;font-size:10px;font-weight:900;color:#6f8791;opacity:.82}.pst-opp-chip.on .count{color:#2f748c}.pst-opp-chip[data-pst-opp-source="TED"] .pst-opp-chip-icon{background:#edf3ff;color:#315a9f}.pst-opp-chip[data-pst-opp-source="KRPP"] .pst-opp-chip-icon{background:#edf7f4;color:#2f7b6b}.pst-opp-chip[data-pst-opp-source="APP_AL"] .pst-opp-chip-icon{background:#fbefef;color:#a84d4d}.pst-opp-chip[data-pst-opp-source="WORLD_BANK"] .pst-opp-chip-icon{background:#edf6fa;color:#2c6f94}.pst-opp-chip[data-pst-opp-source="EBRD_ECEPP"] .pst-opp-chip-icon{background:#eef4f8;color:#41657c}.pst-opp-chip[data-pst-opp-source="UNGM"] .pst-opp-chip-icon{background:#eef6fb;color:#3c7799}.pst-opp-chip[data-pst-opp-source="MCA_KOSOVO"] .pst-opp-chip-icon,.pst-opp-chip[data-pst-opp-source="KCF"] .pst-opp-chip-icon,.pst-opp-chip[data-pst-opp-source="RCF"] .pst-opp-chip-icon{background:#f2f4ef;color:#667253}.pst-opp-chip[data-pst-opp-lifecycle="new"] .pst-opp-chip-icon{background:#f0f6f8;color:#49859a}.pst-opp-chip[data-pst-opp-lifecycle="waiting"] .pst-opp-chip-icon{background:#f3f4f7;color:#667a92}.pst-opp-chip[data-pst-opp-lifecycle="replied"] .pst-opp-chip-icon{background:#eef6f0;color:#5e8068}.pst-opp-chip[data-pst-opp-winner="gc_epc"] .pst-opp-chip-icon{background:#edf6f8;color:#447d90}.pst-opp-chip[data-pst-opp-winner="other"] .pst-opp-chip-icon{background:#f5f3ee;color:#84785b}.pst-opp-chip[data-pst-opp-winner="producer"] .pst-opp-chip-icon{background:#f1f3f4;color:#5f6d73}
.pst-opp-active{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-height:36px;padding:0 2px}.pst-opp-active>span{font-size:9px;font-weight:850;color:#87969c}.pst-opp-active-chip{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 9px;border-radius:999px;background:#edf4f6;color:#496974;font-size:9.5px;font-weight:800}.pst-opp-clear{height:28px;padding:0 9px;border:0;border-radius:999px;background:transparent;color:#397b91;font-size:9.5px;font-weight:850;cursor:pointer}
.pst-opp-results-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:18px 2px 9px}.pst-opp-results-head h3{margin:0;font-size:16px;color:#263f49}.pst-opp-results-head p{margin:3px 0 0;font-size:10px;color:#84939a}.pst-opp-results-head button{border:0;background:transparent;color:#397b91;font-size:10px;font-weight:850;cursor:pointer}
#pst-opportunities-list{gap:10px!important}.pst-pcw-tender{border-radius:15px!important;border:1px solid #dfe7e9!important;border-left:4px solid #87aebb!important;padding:18px 19px!important;box-shadow:0 2px 10px rgba(38,65,76,.025)!important;transform:none!important}.pst-pcw-tender:hover,.pst-pcw-tender:focus-visible{background:#fbfcfd!important;border-color:#bed1d8!important;border-left-color:#4f97af!important;box-shadow:0 7px 20px rgba(38,65,76,.065)!important;transform:none!important}.pst-pcw-tender-meta{gap:6px!important}.pst-pcw-tender-meta span{font-size:9.5px!important;font-weight:780!important;letter-spacing:0!important;background:#f3f6f7!important}.pst-pcw-tender-meta .kind{background:#eaf4f7!important;color:#397b91!important}.pst-pcw-tender h3{font-size:16px!important;margin-top:7px!important}.pst-pcw-tender p{font-size:11.5px!important;line-height:1.45!important;max-width:980px!important}.pst-pcw-tender small{font-size:10px!important}.pst-pcw-tender-open{background:#f1f6f7!important;color:#397b91!important}.pst-pcw-tender-open b{font-size:10.5px!important}.pst-pcw-life-waiting{border-left-color:#8397aa!important}.pst-pcw-life-replied{border-left-color:#6d9778!important}
.pst-opp-density-compact .pst-pcw-tender{padding:12px 15px!important;grid-template-columns:minmax(0,1fr) auto!important}.pst-opp-density-compact .pst-pcw-tender p{display:none}.pst-opp-density-compact .pst-pcw-tender h3{font-size:14px!important}.pst-opp-density-compact .pst-pcw-contact-state{margin-top:4px!important;font-size:9px!important}
@media(max-width:980px){.pst-opp-route-grid{grid-template-columns:1fr}.pst-opp-route{min-height:92px}.pst-opp-mini-stats{grid-template-columns:repeat(2,1fr)}.pst-opp-mini-stat:nth-child(2){border-right:0}.pst-opp-filter-row{grid-template-columns:1fr}.pst-opp-filter-label{padding-top:0}.pst-opp-filter-options{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-opp-desk-title p{display:none}}
@media(max-width:650px){body:has(#page-kek-tenders.active) .content{padding:12px 13px 34px!important}#pst-opportunities-focus>header{align-items:flex-start!important}.pst-opp-desk-head-left{gap:9px}.pst-opp-desk-title h2{font-size:22px!important}.pst-opp-density{display:none}.pst-opp-mini-stats{grid-template-columns:1fr}.pst-opp-mini-stat{border-right:0;border-bottom:1px solid #e8edef}.pst-opp-mini-stat:last-child{border-bottom:0}#pst-pcw-opportunity-tools{align-items:stretch!important}.pst-opp-filter-toggle{padding:0 11px}.pst-opp-filter-options{grid-template-columns:1fr}.pst-opp-chip{min-height:42px}.pst-pcw-tender{grid-template-columns:1fr!important}.pst-pcw-tender-open{justify-content:flex-end}}
`;document.head.appendChild(s);
}
function header(focus){
 var h=focus.querySelector(':scope>header');if(!h)return;
 h.innerHTML='<div class="pst-opp-desk-head-left"><button type="button" class="pst-opp-desk-back pst-opp-v4-back" data-pst-opp-back>← Kthehu</button><div class="pst-opp-desk-title"><span>PPPP · OPPORTUNITY DESK</span><h2>Mundësitë</h2><p>Tenderë për ofertim dhe fitues TED për zhvillim biznesi — në një rrjedhë të vetme pune.</p></div></div><div class="pst-opp-density"><button type="button" data-pst-opp-density="comfortable" class="'+(density==='comfortable'?'on':'')+'">Komode</button><button type="button" data-pst-opp-density="compact" class="'+(density==='compact'?'on':'')+'">Kompakte</button></div>';
}
function tools(focus){
 var t=focus.querySelector('#pst-pcw-opportunity-tools');if(!t)return;
 var b=t.querySelector('[data-pst-opp-filter-toggle]');if(!b){b=document.createElement('button');b.type='button';b.className='pst-opp-filter-toggle';b.setAttribute('data-pst-opp-filter-toggle','1');t.appendChild(b);}
 b.textContent=filtersOpen?'Filtrat · hapur':'Filtrat';b.classList.toggle('on',filtersOpen);
}
function modeButton(id,eyebrow,title,copy,n,cls){
 return'<button type="button" class="pst-opp-route '+cls+' '+(state&&state.mode===id?'on':'')+'" data-pst-opp-mode="'+id+'"><span class="route-copy"><span>'+eyebrow+'</span><b>'+title+'</b><small>'+copy+'</small></span><span class="route-count">'+Number(n||0)+'</span></button>';
}
function chip(attr,id,label,count,on,icon){return'<button type="button" class="pst-opp-chip '+(on?'on':'')+'" '+attr+'="'+E(id)+'"><span class="pst-opp-chip-main"><span class="pst-opp-chip-icon" aria-hidden="true">'+E(icon||'•')+'</span><span class="pst-opp-chip-label">'+E(label)+'</span></span>'+(count==null?'':'<span class="count">'+Number(count||0)+'</span>')+'</button>';}
function statusRow(c){return chip('data-pst-opp-lifecycle','all','Të gjitha',c.total,state&&state.lifecycle==='all','◎')+chip('data-pst-opp-lifecycle','new','Të reja',c.life.new,state&&state.lifecycle==='new','✦')+chip('data-pst-opp-lifecycle','waiting','Në pritje',c.life.waiting,state&&state.lifecycle==='waiting','◷')+chip('data-pst-opp-lifecycle','replied','Me përgjigje',c.life.replied,state&&state.lifecycle==='replied','↗');}
function sourceRow(c){var active=SOURCES.filter(function(k){return Number(c.src[k]||0)>0;});return chip('data-pst-opp-source','all','Të gjitha burimet',c.total,state&&state.source==='all','⌘')+active.map(function(k){return chip('data-pst-opp-source',k,LABEL[k]||k,c.src[k],state&&state.source===k,SOURCE_ICON[k]||'•');}).join('');}
function fieldRow(c){return chip('data-pst-opp-field','all','Të gjitha',null,state&&state.field==='all','◇')+FIELDS.map(function(f){return chip('data-pst-opp-field',f.id,f.label,c.field[f.id],state&&state.field===f.id,f.icon||'•');}).join('');}
function winnerRow(c){return chip('data-pst-opp-winner','all','Të gjithë fituesit',c.award,state&&state.winner_group==='all','◎')+WINNERS.map(function(w){return chip('data-pst-opp-winner',w.id,w.label,c.winner[w.id],state&&state.winner_group===w.id,w.icon||'•');}).join('');}
function activeFilters(){
 var out=[],source=state&&state.source||'all',life=state&&state.lifecycle||'all',field=state&&state.field||'all',winner=state&&state.winner_group||'all',mode=state&&state.mode||'all';
 if(mode==='local')out.push('Për ofertim');else if(mode==='award')out.push('TED · fitues');
 if(source!=='all')out.push(LABEL[source]||source);
 if(life!=='all')out.push(life==='new'?'Të reja':life==='waiting'?'Në pritje':life==='replied'?'Me përgjigje':'Draft');
 if(field!=='all'){var f=FIELDS.find(function(x){return x.id===field;});if(f)out.push(f.label);}
 if(winner!=='all'){var w=WINNERS.find(function(x){return x.id===winner;});if(w)out.push(w.label);}
 if(S(state&&state.query).trim())out.push('Kërkim: '+S(state.query).trim().slice(0,32));
 return out;
}
function deskHtml(c){
 var filtered=filteredRows().length,act=activeFilters();
 return'<section id="pst-opp-desk"><div class="pst-opp-route-grid">'
  +modeButton('all','Pamja e plotë','Të gjitha mundësitë','Shiko gjithë pipeline-in dhe ngushtoje me filtrat më poshtë.',c.total,'all')
  +modeButton('local','DIRECT TENDER','Për ofertim','KRPP, APP dhe burime të tjera ku PriSteel mund të vlerësojë pjesëmarrjen.',c.local,'local')
  +modeButton('award','TED AWARD SALES','Fitues për kontaktim','Tenderë të fituar ku fituesi mund të jetë klient, partner ose kapacitet B2B.',c.award,'award')
  +'</div><div class="pst-opp-mini-stats">'
  +'<div class="pst-opp-mini-stat"><span class="ico">◎</span><span><b>'+filtered+'</b><small>rezultate me filtrat aktualë</small></span></div>'
  +'<div class="pst-opp-mini-stat"><span class="ico">✧</span><span><b>'+c.life.new+'</b><small>të reja</small></span></div>'
  +'<div class="pst-opp-mini-stat"><span class="ico">◷</span><span><b>'+c.life.waiting+'</b><small>në pritje</small></span></div>'
  +'<div class="pst-opp-mini-stat"><span class="ico">↗</span><span><b>'+c.life.replied+'</b><small>me përgjigje</small></span></div>'
  +'</div><div class="pst-opp-filter-panel" '+(filtersOpen?'':'hidden')+'>'
  +'<div class="pst-opp-filter-row"><div class="pst-opp-filter-label">Statusi</div><div class="pst-opp-filter-options">'+statusRow(c)+'</div></div>'
  +'<div class="pst-opp-filter-row"><div class="pst-opp-filter-label">Burimi</div><div class="pst-opp-filter-options">'+sourceRow(c)+'</div></div>'
  +'<div class="pst-opp-filter-row"><div class="pst-opp-filter-label">Fusha</div><div class="pst-opp-filter-options">'+fieldRow(c)+'</div></div>'
  +((state&&state.mode==='local')?'':'<div class="pst-opp-filter-row"><div class="pst-opp-filter-label">Fituesi TED</div><div class="pst-opp-filter-options">'+winnerRow(c)+'</div></div>')
  +'</div><div class="pst-opp-active"><span>Filtrat aktivë</span>'+(act.length?act.map(function(x){return'<span class="pst-opp-active-chip">'+E(x)+'</span>';}).join('')+'<button type="button" class="pst-opp-clear" data-pst-opp-reset>Pastro të gjitha</button>':'<span class="pst-opp-active-chip">Pa kufizime</span>')+'</div></section>';
}
function resultHead(focus){
 var list=focus.querySelector('#pst-opportunities-list');if(!list)return;
 var rows=filteredRows(),visible=list.querySelectorAll('[data-pcw-tender]').length,h=focus.querySelector('.pst-opp-results-head');
 if(!h){h=document.createElement('div');h.className='pst-opp-results-head';list.parentNode.insertBefore(h,list);}
 h.innerHTML='<div><h3>Rezultatet</h3><p>'+rows.length+' mundësi përputhen · '+visible+' të shfaqura'+(rows.length>visible?' · përdor “Shfaq edhe” poshtë':'')+'</p></div>'+(activeFilters().length?'<button type="button" data-pst-opp-reset>Pastro filtrat</button>':'');
}
function decorate(){
 scheduled=false;var x=current(),page=document.getElementById('page-kek-tenders'),focus=page&&page.querySelector('#pst-opportunities-focus');if(!x||!state||!focus)return false;
 if(observer)observer.disconnect();decorating=true;
 try{
   css();header(focus);tools(focus);var c=counts(),desk=focus.querySelector('#pst-opp-desk');
   if(!desk){var anchor=focus.querySelector('#pst-pcw-lifecycle-tabs')||focus.querySelector('#pst-opportunities-list');var wrap=document.createElement('div');wrap.innerHTML=deskHtml(c);desk=wrap.firstChild;focus.insertBefore(desk,anchor);}
   else{var wrap2=document.createElement('div');wrap2.innerHTML=deskHtml(c);desk.replaceWith(wrap2.firstChild);}
   focus.classList.toggle('pst-opp-density-compact',density==='compact');resultHead(focus);page.dataset.pstOpportunitiesDesk='1';return true;
 }finally{decorating=false;reconnectObserver();}
}
function schedule(){if(decorating||scheduled)return;scheduled=true;setTimeout(function(){if(!document.getElementById('pst-opportunities-focus')){scheduled=false;return;}decorate();},0);}
function reconnectObserver(){if(!observer||!observerRoot||!observerRoot.isConnected)return;observer.observe(observerRoot,{childList:true,subtree:true});}
function observe(){var root=document.getElementById('pst-opportunities-focus');if(!root||typeof MutationObserver!=='function')return;if(observer)observer.disconnect();observerRoot=root;if(!observer)observer=new MutationObserver(function(){if(!decorating)schedule();});reconnectObserver();}
function reset(){current();if(api&&typeof api.applyOpportunityFilter==='function')api.applyOpportunityFilter('reset','all');schedule();}
function apply(kind,value){current();if(api&&typeof api.applyOpportunityFilter==='function'){api.applyOpportunityFilter(kind,value);schedule();return true;}return false;}
function back(){try{var N=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1;if(N&&typeof N.openHome==='function')return N.openHome();}catch(e){}try{var H=window.PSTHomeCanonicalV1;if(H&&typeof H.activateHome==='function')return H.activateHome();}catch(e){}try{if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('home');}catch(e){}return false;}
function consume(e){if(!e)return;e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();}
function click(e){
 var t=e.target&&e.target.closest?e.target:null,b;if(!t)return;current();
 if((b=t.closest('[data-pst-opp-back]'))){consume(e);back();return;}
 if((b=t.closest('[data-pst-opp-density]'))){consume(e);density=b.dataset.pstOppDensity==='compact'?'compact':'comfortable';decorate();return;}
 if((b=t.closest('[data-pst-opp-filter-toggle]'))){consume(e);filtersOpen=!filtersOpen;decorate();return;}
 if((b=t.closest('[data-pst-opp-reset]'))){consume(e);reset();return;}
 if((b=t.closest('[data-pst-opp-mode]'))){consume(e);apply('mode',b.dataset.pstOppMode||'all');return;}
 if((b=t.closest('[data-pst-opp-lifecycle]'))){consume(e);apply('lifecycle',b.dataset.pstOppLifecycle||'all');return;}
 if((b=t.closest('[data-pst-opp-source]'))){consume(e);apply('source',b.dataset.pstOppSource||'all');return;}
 if((b=t.closest('[data-pst-opp-winner]'))){consume(e);apply('winner',b.dataset.pstOppWinner||'all');return;}
 if((b=t.closest('[data-pst-opp-field]'))){consume(e);apply('field',b.dataset.pstOppField||'all');return;}
}
function boot(){
 css();loadBridge();
 (function ready(){current();if(api&&state&&document.getElementById('pst-opportunities-focus')){decorate();observe();return;}setTimeout(ready,500);})();
 document.addEventListener('click',click,true);
 document.addEventListener('input',function(e){if(e.target&&e.target.id==='pst-pcw-opportunity-search')schedule();},true);
 document.addEventListener('pst:opportunities-filter-applied',schedule);
 document.addEventListener('pst:modules-ready',schedule,{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
var exposed={version:VERSION,apply:decorate,reset:reset,state:function(){return{density:density,filtersOpen:filtersOpen};},_test:{baseRows:baseRows,filteredRows:filteredRows,counts:counts,sourceOf:srcOf,fieldOf:fieldOf,winnerOf:winnerOf,lifecycleOf:lifeOf,decorate:decorate,schedule:schedule}};
window.PSTOpportunitiesDeskV1=window.PSTOpportunitiesMindmapV6=window.PSTOpportunitiesMindmapV5=window.PSTOpportunitiesMindmapV4=exposed;
})();