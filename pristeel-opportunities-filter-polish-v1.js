/* PRISTEEL Opportunities Desk v1
 * Final presentation owner for the canonical Project-Centric Opportunities workflow.
 * Gmail-draft creation delegates to the canonical draft engine and never sends automatically.
 * Drafted/contacted companies are parked outside the active list; Projects remain RFQ-driven.
 */
(function(){
'use strict';
if(window.__pstOpportunitiesDeskV1)return;
window.__pstOpportunitiesDeskV1=true;
window.__pstOpportunitiesMindmapV6=true;
window.__pstOpportunitiesMindmapV5=true;
window.__pstOpportunitiesMindmapV4=true;
window.__pstOpportunitiesFilterPolishV1=true;

var VERSION='20260924-contacted-workdesk1';
var density='comfortable',filtersOpen=true,resultPage=null,api=null,state=null,observer=null,observerRoot=null,scheduled=false,decorating=false,selectedId='',contactedExpanded=false,sortDirection='desc';
var SOURCES=['TED','KRPP','APP_AL','MCA_KOSOVO','KCF','RCF','EBRD_ECEPP','WORLD_BANK','UNGM','EU_OFFICE_KOSOVO'];
var LABEL={TED:'TED',KRPP:'KRPP',APP_AL:'APP',MCA_KOSOVO:'MCA Kosovo',KCF:'KCF',RCF:'RCF',EBRD_ECEPP:'EBRD',WORLD_BANK:'World Bank',UNGM:'UNGM',EU_OFFICE_KOSOVO:'EU Office Kosovo'};
var SOURCE_ICON={TED:'EU',KRPP:'KS',APP_AL:'AL',MCA_KOSOVO:'MCA',KCF:'KCF',RCF:'RCF',EBRD_ECEPP:'EB',WORLD_BANK:'WB',UNGM:'UN',EU_OFFICE_KOSOVO:'EU'};
var SOURCE_ASSET={TED:'assets/source-icons/ted-eu.svg',KRPP:'assets/source-icons/krpp-kosovo.svg',APP_AL:'assets/source-icons/app-albania.svg',WORLD_BANK:'assets/source-icons/world-bank.svg'};
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
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function current(){api=window.PSTProjectCentricWorkflowV1||api;state=api&&api._state||state;return api;}
function rowText(r){var p=r&&r.payload&&typeof r.payload==='object'?r.payload:{};return[r&&r.title,r&&r.description,r&&r.authority,r&&r.procurement_no,r&&r.publication_no,r&&r.cpv,r&&r.cpv_code,A(r&&r.match_reasons).join(' '),p.title,p.description,p.cpv,p.cpv_code,p.cpv_description,p.scope,p.category].map(S).join(' ');}
function srcOf(r){var x=current(),fn=x&&x._test&&x._test.tenderSource;return fn?fn(r):S(r&&r.source_key||r&&r.payload&&r.payload.source||'KRPP').toUpperCase();}
function fieldOf(r){var x=current(),fn=x&&x._test&&x._test.opportunityField;if(typeof fn==='function')return fn(r);var t=rowText(r);for(var i=0;i<FIELDS.length-1;i++)if(FIELDS[i].re.test(t))return FIELDS[i].id;return'other';}
function winnerOf(r){var x=current(),fn=x&&x._test&&x._test.winnerGroup;if(typeof fn==='function')return fn(r);if(srcOf(r)!=='TED')return'local';var p=r&&r.payload&&typeof r.payload==='object'?r.payload:{},w=p.winner&&typeof p.winner==='object'?p.winner:{},role=S(w.company_type||(w.company_classification&&w.company_classification.company_type)||'unknown').toLowerCase();return role==='gc_epc'?'gc_epc':role==='producer'?'producer':'other';}
function lifeOf(r){var x=current(),fn=x&&x._test&&x._test.opportunityLifecycle,l=fn?fn(r):'new';return l==='draft'?'waiting':l;}
function baseRows(){var x=current();if(!x||!state)return[];var rows=A(state.rows),t=x._test||{};if(typeof t.tenderVisible==='function')rows=rows.filter(t.tenderVisible);if(typeof t.dedupeOpportunities==='function')rows=t.dedupeOpportunities(rows);if(typeof t.ownedByProject==='function')rows=rows.filter(function(r){return !t.ownedByProject(r);});return rows;}
function filteredRows(){
 var rows=baseRows(),source=S(state&&state.source||'all'),field=S(state&&state.field||'all'),winner=S(state&&state.winner_group||'all'),mode=S(state&&state.mode||'all'),q=N(state&&state.query||'');
 if(source!=='all')rows=rows.filter(function(r){return srcOf(r)===source;});
 else if(mode==='award')rows=rows.filter(function(r){return srcOf(r)==='TED';});
 else if(mode==='local')rows=rows.filter(function(r){return srcOf(r)!=='TED';});
 if(field!=='all')rows=rows.filter(function(r){return fieldOf(r)===field;});
 if(winner!=='all')rows=rows.filter(function(r){return winnerOf(r)===winner;});
 if(q)rows=rows.filter(function(r){return N(rowText(r)).indexOf(q)>-1;});
 return rows;
}
function counts(){
 var rows=baseRows(),c={total:rows.length,local:0,award:0,life:{new:0,waiting:0,replied:0},src:{},field:{},winner:{gc_epc:0,other:0,producer:0}};
 SOURCES.forEach(function(k){c.src[k]=0;});FIELDS.forEach(function(f){c.field[f.id]=0;});
 rows.forEach(function(r){var s=srcOf(r),l=lifeOf(r),f=fieldOf(r),w=winnerOf(r);if(s==='TED')c.award++;else c.local++;if(c.life[l]!=null)c.life[l]++;if(c.src[s]!=null)c.src[s]++;if(c.field[f]!=null)c.field[f]++;if(c.winner[w]!=null)c.winner[w]++;});
 return c;
}
function loadBridge(){if(window.__pstOpportunitiesWaitingBridgeV1||document.querySelector('script[data-pst-opportunities-waiting-bridge]'))return;var b=document.createElement('script');b.src='pristeel-opportunities-waiting-bridge-v1.js?v=20260913-waiting1';b.defer=true;b.dataset.pstOpportunitiesWaitingBridge='1';document.head.appendChild(b);}
function css(){
 var old=document.getElementById('pst-opportunities-filter-polish-v1-css');if(old)return;
 var s=document.createElement('style');s.id='pst-opportunities-filter-polish-v1-css';s.textContent=`
body:has(#page-kek-tenders.active) .app-shell>.sidebar{display:none!important;width:0!important;min-width:0!important;max-width:0!important;border:0!important}
body:has(#page-kek-tenders.active) .app-shell>.main{width:100%!important;max-width:none!important;min-width:0!important}
body:has(#page-kek-tenders.active) .main>.topbar{display:none!important}
body.pst-ui-v2:has(#page-kek-tenders.active) .content,body:has(#page-kek-tenders.active) .content{max-width:none!important;width:100%!important;margin:0!important;padding:18px 28px 46px!important;background:#f6f8f9!important}
body:has(#page-kek-tenders.active) #page-kek-tenders .pst-kek-layout{max-width:none!important;width:100%!important;margin:0!important}
#page-kek-tenders .pst-kek-head{display:none!important}
#page-kek-tenders #pst-opportunities-focus{max-width:1580px!important;width:100%!important;margin:0 auto!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
#pst-opportunities-focus>header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:18px!important;margin:0 0 16px!important;padding:4px 2px!important}
.pst-opp-desk-head-left{display:flex;align-items:center;gap:18px;min-width:0}.pst-opp-desk-back{display:inline-flex!important;align-items:center;justify-content:center;height:48px;padding:0 18px;border:1px solid #2f86a6;border-radius:14px;background:#3f9fc2;color:#fff!important;font-size:12px;font-weight:850;cursor:pointer;box-shadow:0 6px 16px rgba(47,134,166,.18)}.pst-opp-desk-back:hover,.pst-opp-desk-back:focus-visible{background:#2f86a6;border-color:#2f86a6;color:#fff!important;box-shadow:0 8px 20px rgba(47,134,166,.22);outline:none}.pst-opp-desk-title>span{display:block;font-size:9.5px;font-weight:900;letter-spacing:.14em;color:#4387a0}.pst-opp-desk-title h2{margin:4px 0 0!important;font-size:30px!important;letter-spacing:-.04em!important;color:#1f3945!important}.pst-opp-desk-title p{margin:5px 0 0!important;font-size:12px!important;color:#718690!important}.pst-opp-header-note{max-width:310px;padding:6px 4px 6px 0;color:#68808d;font-size:11px;line-height:1.5}.pst-opp-header-note:after{content:'';display:block;width:42px;height:2px;margin-top:9px;border-radius:999px;background:#3f9fc2}
.pst-opp-density{display:flex;padding:3px;border:1px solid #dbe6e9;border-radius:11px;background:#fff}.pst-opp-density button{height:32px;padding:0 11px;border:0;border-radius:8px;background:transparent;color:#71828a;font-size:10px;font-weight:800;cursor:pointer}.pst-opp-density button.on{background:#edf5f7;color:#39798f}
#pst-pcw-opportunity-tools{display:flex!important;align-items:center!important;gap:10px!important;margin:0 0 14px!important}#pst-pcw-opportunity-tools label{height:50px!important;flex:1!important;display:flex!important;align-items:center!important;gap:10px!important;padding:0 15px!important;border:1px solid #dbe5e8!important;border-radius:14px!important;background:#fff!important;box-shadow:0 2px 9px rgba(38,67,79,.025)!important}#pst-pcw-opportunity-tools label>span{font-size:0!important}#pst-pcw-opportunity-tools label>span:before{content:'⌕';font-size:20px;color:#62808b}#pst-pcw-opportunity-search{height:46px!important;flex:1!important;border:0!important;outline:0!important;background:transparent!important;font-size:13px!important;color:#2f4751!important}.pst-opp-filter-toggle{height:50px;padding:0 15px;border:1px solid #dbe5e8;border-radius:14px;background:#fff;color:#536d78;font-size:10px;font-weight:850;cursor:pointer}.pst-opp-filter-toggle.on{background:#eef6f8;border-color:#bad6df;color:#35758d}
#pst-opportunities-focus:has(#pst-opp-desk) #pst-pcw-lifecycle-tabs,#pst-opportunities-focus:has(#pst-opp-desk) #pst-pcw-opportunity-tabs{display:none!important}
#pst-opportunities-focus.pst-opp-dashboard #pst-pcw-opportunity-tools,#pst-opportunities-focus.pst-opp-dashboard #pst-opportunities-list,#pst-opportunities-focus.pst-opp-dashboard .pst-opp-results-head{display:none!important}
#pst-opportunities-focus.pst-opp-result-page #pst-pcw-lifecycle-tabs,#pst-opportunities-focus.pst-opp-result-page #pst-pcw-opportunity-tabs{display:none!important}
#pst-opportunities-focus.pst-opp-result-page #pst-pcw-opportunity-tools{display:flex!important;margin-top:4px!important}
#pst-opportunities-focus.pst-opp-result-page .pst-opp-filter-toggle{display:none!important}
#pst-opp-desk{display:grid;gap:14px;margin-bottom:14px}.pst-opp-route-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.pst-opp-route{min-height:132px;display:grid;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:16px;padding:18px 19px;border:1px solid #d8e5ea;border-radius:18px;background:#fff;text-align:left;color:#314952;cursor:pointer;box-shadow:0 4px 16px rgba(42,68,78,.035);transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease}.pst-opp-route:hover{border-color:#acd0dc;box-shadow:0 10px 28px rgba(42,68,78,.08);transform:translateY(-1px)}.pst-opp-route-icon{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;background:#e9f3ff;color:#1875cc;font-size:24px;font-weight:900}.pst-opp-route.local{background:linear-gradient(145deg,#fff,#f5fbf8);border-color:#d5eadf}.pst-opp-route.local .pst-opp-route-icon{background:#e6f8ed;color:#1aa45a}.pst-opp-route.award{background:linear-gradient(145deg,#fff,#fffaf2);border-color:#eadfca}.pst-opp-route.award .pst-opp-route-icon{background:#fbf0dc;color:#b57b16}.pst-opp-route .route-copy>span{font-size:9px;font-weight:900;letter-spacing:.11em;color:#78909a}.pst-opp-route .route-copy>b{display:block;margin-top:5px;font-size:17px;color:#243e49}.pst-opp-route .route-copy>small{display:block;margin-top:6px;max-width:430px;font-size:10.5px;line-height:1.45;color:#72868f}.pst-opp-route-tail{display:flex;align-items:center;gap:8px}.pst-opp-route .route-count{min-width:54px;height:54px;border-radius:16px;display:grid;place-items:center;background:#e9f3ff;color:#246fb4;font-size:18px;font-weight:900}.pst-opp-route.local .route-count{background:#e7f8ee;color:#20955a}.pst-opp-route.award .route-count{background:#f8f0df;color:#806c42}.pst-opp-route-arrow{width:34px;height:34px;border-radius:999px;display:grid;place-items:center;background:#edf5f8;color:#2e7992;font-size:22px;line-height:1}.pst-opp-route.local .pst-opp-route-arrow{background:#ddf6e9;color:#1e9257}.pst-opp-route.award .pst-opp-route-arrow{background:#f7ead0;color:#80672f}
.pst-opp-filter-panel{display:grid;gap:12px;padding:0;border:0;background:transparent}.pst-opp-filter-row{display:grid;grid-template-columns:310px minmax(0,1fr);gap:22px;align-items:center;padding:18px 20px;border:1px solid #dce7ea;border-radius:18px;background:#fff;box-shadow:0 3px 14px rgba(42,68,78,.025)}.pst-opp-filter-label{display:flex;align-items:center;gap:14px;min-width:0;color:#243e49}.pst-opp-section-icon{width:50px;height:50px;flex:0 0 50px;border-radius:15px;display:grid;place-items:center;background:#eaf4f7;color:#347e98;font-size:21px;font-weight:900}.pst-opp-filter-label b{display:block;font-size:17px;line-height:1.1;color:#233d49}.pst-opp-filter-label small{display:block;margin-top:5px;font-size:10.5px;line-height:1.35;color:#778b94}.pst-opp-filter-options{display:grid;gap:10px;width:100%;min-width:0}.pst-opp-filter-row.status .pst-opp-filter-options,.pst-opp-filter-row.winner .pst-opp-filter-options{grid-template-columns:repeat(3,minmax(0,1fr))}.pst-opp-filter-row.source .pst-opp-filter-options{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}.pst-opp-filter-row.field .pst-opp-filter-options{grid-template-columns:repeat(3,minmax(0,1fr))}.pst-opp-chip{min-height:62px;padding:8px 10px 8px 9px;border:1px solid #d9e6ea;border-radius:14px;background:#fbfcfd;color:#314f5b;font-size:11px;font-weight:830;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;min-width:0;box-shadow:0 2px 8px rgba(42,68,78,.02);transition:border-color .14s ease,background .14s ease,box-shadow .14s ease,transform .14s ease}.pst-opp-chip:hover{border-color:#acd0dc;background:#fff;box-shadow:0 7px 18px rgba(42,68,78,.07);transform:translateY(-1px)}.pst-opp-chip-main{display:flex;align-items:center;gap:10px;min-width:0}.pst-opp-chip-icon{width:40px;height:40px;flex:0 0 40px;border-radius:12px;display:grid;place-items:center;background:#eef4f6;color:#587b88;font-size:13px;font-weight:900}.pst-opp-chip-icon img{width:34px;height:34px;display:block;object-fit:contain}.pst-opp-chip-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pst-opp-chip-tail{display:flex;align-items:center;gap:7px;flex:0 0 auto}.pst-opp-chip .count{min-width:34px;height:30px;padding:0 8px;border-radius:999px;display:grid;place-items:center;background:#eef4f6;color:#55747f;font-size:10.5px;font-weight:900}.pst-opp-chip-arrow{width:28px;height:28px;border-radius:999px;display:grid;place-items:center;background:#f1f6f8;color:#3a7c92;font-size:19px;line-height:1}.pst-opp-chip[data-pst-opp-lifecycle="new"]{background:linear-gradient(145deg,#fff,#f5fbf7)}.pst-opp-chip[data-pst-opp-lifecycle="new"] .pst-opp-chip-icon{background:#e8f8ed;color:#20a55b}.pst-opp-chip[data-pst-opp-lifecycle="new"] .count{background:#e8f8ed;color:#208f53}.pst-opp-chip[data-pst-opp-lifecycle="waiting"]{background:linear-gradient(145deg,#fff,#fff9f3)}.pst-opp-chip[data-pst-opp-lifecycle="waiting"] .pst-opp-chip-icon{background:#fff0df;color:#ef8518}.pst-opp-chip[data-pst-opp-lifecycle="waiting"] .count{background:#fff0df;color:#b86b18}.pst-opp-chip[data-pst-opp-lifecycle="replied"]{background:linear-gradient(145deg,#fff,#faf7ff)}.pst-opp-chip[data-pst-opp-lifecycle="replied"] .pst-opp-chip-icon{background:#f0e8ff;color:#8151d5}.pst-opp-chip[data-pst-opp-lifecycle="replied"] .count{background:#f0e8ff;color:#7143c2}.pst-opp-chip[data-pst-opp-source="TED"] .pst-opp-chip-icon{background:#edf3ff;color:#315a9f}.pst-opp-chip[data-pst-opp-source="KRPP"] .pst-opp-chip-icon{background:#edf7f4;color:#2f7b6b}.pst-opp-chip[data-pst-opp-source="APP_AL"] .pst-opp-chip-icon{background:#fbefef;color:#a84d4d}.pst-opp-chip[data-pst-opp-source="WORLD_BANK"] .pst-opp-chip-icon{background:#edf6fa;color:#2c6f94}.pst-opp-chip[data-pst-opp-source="EBRD_ECEPP"] .pst-opp-chip-icon{background:#eef4f8;color:#41657c}.pst-opp-chip[data-pst-opp-source="UNGM"] .pst-opp-chip-icon{background:#eef6fb;color:#3c7799}.pst-opp-chip[data-pst-opp-source="MCA_KOSOVO"] .pst-opp-chip-icon,.pst-opp-chip[data-pst-opp-source="KCF"] .pst-opp-chip-icon,.pst-opp-chip[data-pst-opp-source="RCF"] .pst-opp-chip-icon{background:#f2f4ef;color:#667253}.pst-opp-chip[data-pst-opp-field="construction"] .pst-opp-chip-icon{background:#fff0e4;color:#e77819}.pst-opp-chip[data-pst-opp-field="infrastructure"] .pst-opp-chip-icon{background:#eaf2ff;color:#397bd5}.pst-opp-chip[data-pst-opp-field="energy"] .pst-opp-chip-icon{background:#e8f8ed;color:#1da85a}.pst-opp-chip[data-pst-opp-field="supply"] .pst-opp-chip-icon{background:#f1eaff;color:#7d50d0}.pst-opp-chip[data-pst-opp-field="services"] .pst-opp-chip-icon{background:#ffeaf1;color:#d85678}.pst-opp-chip[data-pst-opp-field="other"] .pst-opp-chip-icon{background:#edf2f4;color:#607b86}.pst-opp-chip[data-pst-opp-winner="gc_epc"] .pst-opp-chip-icon{background:#e9f2ff;color:#3976c7}.pst-opp-chip[data-pst-opp-winner="other"] .pst-opp-chip-icon{background:#fff2d9;color:#b47d16}.pst-opp-chip[data-pst-opp-winner="producer"] .pst-opp-chip-icon{background:#ffe9ea;color:#cc3c48}.pst-opp-guide{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;padding:15px 18px;border:1px solid #d7e8ef;border-radius:18px;background:linear-gradient(90deg,#f6fbff,#fff);color:#55727e}.pst-opp-guide-icon{width:34px;height:34px;border-radius:999px;display:grid;place-items:center;background:#2e83d0;color:#fff;font-size:16px;font-weight:900}.pst-opp-guide b{display:block;font-size:11px;color:#2b7090}.pst-opp-guide small{display:block;margin-top:3px;font-size:10px;line-height:1.4;color:#748993}.pst-opp-guide strong{padding-left:18px;border-left:1px solid #deebef;font-size:10.5px;line-height:1.45;color:#2e6479}
.pst-opp-active{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-height:36px;padding:0 2px}.pst-opp-active>span{font-size:9px;font-weight:850;color:#87969c}.pst-opp-active-chip{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 9px;border-radius:999px;background:#edf4f6;color:#496974;font-size:9.5px;font-weight:800}.pst-opp-clear{height:28px;padding:0 9px;border:0;border-radius:999px;background:transparent;color:#397b91;font-size:9.5px;font-weight:850;cursor:pointer}
.pst-opp-results-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:18px 2px 9px}.pst-opp-results-head h3{margin:0;font-size:16px;color:#263f49}.pst-opp-results-head p{margin:3px 0 0;font-size:10px;color:#84939a}.pst-opp-results-head button{border:0;background:transparent;color:#397b91;font-size:10px;font-weight:850;cursor:pointer}
#pst-opportunities-focus.pst-opp-result-page{padding-top:0!important}.pst-opp-source-title{display:flex!important;align-items:center!important;gap:10px!important}.pst-opp-source-mark{width:34px;height:34px;border-radius:10px;display:grid!important;place-items:center!important;background:#eef4f6!important;overflow:hidden;flex:0 0 34px}.pst-opp-source-mark img{width:30px;height:30px;display:block;object-fit:contain}.pst-opp-source-mark b{font-size:9px;color:#4f7180}.pst-opp-result-page .pst-opp-results-head{margin-top:14px}
#pst-opportunities-list{gap:10px!important}.pst-pcw-tender{border-radius:15px!important;border:1px solid #dfe7e9!important;border-left:4px solid #87aebb!important;padding:18px 19px!important;box-shadow:0 2px 10px rgba(38,65,76,.025)!important;transform:none!important}.pst-pcw-tender:hover,.pst-pcw-tender:focus-visible{background:#fbfcfd!important;border-color:#bed1d8!important;border-left-color:#4f97af!important;box-shadow:0 7px 20px rgba(38,65,76,.065)!important;transform:none!important}.pst-pcw-tender-meta{gap:6px!important}.pst-pcw-tender-meta span{font-size:9.5px!important;font-weight:780!important;letter-spacing:0!important;background:#f3f6f7!important}.pst-pcw-tender-meta .kind{background:#eaf4f7!important;color:#397b91!important}.pst-pcw-tender h3{font-size:16px!important;margin-top:7px!important}.pst-pcw-tender p{font-size:11.5px!important;line-height:1.45!important;max-width:980px!important}.pst-pcw-tender small{font-size:10px!important}.pst-pcw-tender-open{background:#f1f6f7!important;color:#397b91!important}.pst-pcw-tender-open b{font-size:10.5px!important}.pst-pcw-life-waiting{border-left-color:#8397aa!important}.pst-pcw-life-replied{border-left-color:#6d9778!important}
.pst-opp-density-compact .pst-pcw-tender{padding:12px 15px!important;grid-template-columns:minmax(0,1fr) auto!important}.pst-opp-density-compact .pst-pcw-tender p{display:none}.pst-opp-density-compact .pst-pcw-tender h3{font-size:14px!important}.pst-opp-density-compact .pst-pcw-contact-state{margin-top:4px!important;font-size:9px!important}
@media(max-width:1100px){.pst-opp-filter-row{grid-template-columns:250px minmax(0,1fr)}.pst-opp-filter-row.field .pst-opp-filter-options{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-opp-header-note{display:none}}@media(max-width:980px){.pst-opp-route-grid{grid-template-columns:1fr}.pst-opp-route{min-height:100px}.pst-opp-filter-row{grid-template-columns:1fr;gap:14px}.pst-opp-filter-row.status .pst-opp-filter-options,.pst-opp-filter-row.winner .pst-opp-filter-options,.pst-opp-filter-row.field .pst-opp-filter-options,.pst-opp-filter-row.source .pst-opp-filter-options{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-opp-desk-title p{display:none}.pst-opp-guide{grid-template-columns:auto minmax(0,1fr)}.pst-opp-guide strong{grid-column:2;padding-left:0;border-left:0}}
@media(max-width:650px){body:has(#page-kek-tenders.active) .content{padding:12px 13px 34px!important}#pst-opportunities-focus>header{align-items:flex-start!important}.pst-opp-desk-head-left{gap:10px}.pst-opp-desk-back{height:42px;padding:0 13px}.pst-opp-desk-title h2{font-size:23px!important}.pst-opp-density{display:none}#pst-pcw-opportunity-tools{align-items:stretch!important}.pst-opp-route{grid-template-columns:46px minmax(0,1fr) auto;padding:14px;gap:12px}.pst-opp-route-icon{width:46px;height:46px;border-radius:13px;font-size:20px}.pst-opp-route .route-copy>small{display:none}.pst-opp-route .route-count{min-width:42px;height:42px;font-size:15px}.pst-opp-route-arrow{display:none}.pst-opp-filter-row{padding:15px}.pst-opp-section-icon{width:44px;height:44px;flex-basis:44px}.pst-opp-filter-label b{font-size:16px}.pst-opp-filter-row.status .pst-opp-filter-options,.pst-opp-filter-row.winner .pst-opp-filter-options,.pst-opp-filter-row.field .pst-opp-filter-options,.pst-opp-filter-row.source .pst-opp-filter-options{grid-template-columns:1fr}.pst-opp-chip{min-height:56px}.pst-opp-guide{grid-template-columns:auto minmax(0,1fr);padding:13px}.pst-pcw-tender{grid-template-columns:1fr!important}.pst-pcw-tender-open{justify-content:flex-end}}

/* Compact Opportunity Desk: keep the work surface calm and reveal secondary filters only on demand. */
#pst-opportunities-focus>header{margin:0 0 10px!important;padding:0 2px!important;min-height:48px}
.pst-opp-desk-head-left{gap:12px}.pst-opp-desk-back{height:42px!important;padding:0 14px!important;border-radius:12px!important}
.pst-opp-desk-title h2{margin:0!important;font-size:27px!important}.pst-opp-desk-title>span,.pst-opp-desk-title p,.pst-opp-header-note{display:none!important}
#pst-opp-desk{gap:10px!important;margin-bottom:10px!important}.pst-opp-route-grid{gap:8px!important}
.pst-opp-route{min-height:58px!important;grid-template-columns:36px minmax(0,1fr) auto!important;gap:10px!important;padding:10px 12px!important;border-radius:14px!important;box-shadow:none!important;background:#fff!important}
.pst-opp-route:hover{transform:none!important;box-shadow:0 5px 14px rgba(42,68,78,.06)!important}.pst-opp-route-icon{width:36px!important;height:36px!important;border-radius:10px!important;font-size:16px!important}
.pst-opp-route .route-copy>span,.pst-opp-route .route-copy>small,.pst-opp-route-arrow{display:none!important}.pst-opp-route .route-copy>b{margin:0!important;font-size:13px!important;line-height:1.2!important}
.pst-opp-route .route-count{min-width:34px!important;height:30px!important;padding:0 8px!important;border-radius:999px!important;font-size:11px!important}
.pst-opp-status-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:8px;align-items:center}
.pst-opp-status-strip .pst-opp-chip{min-height:42px!important;padding:5px 8px!important;border-radius:12px!important;background:#fff!important;box-shadow:none!important}
.pst-opp-status-strip .pst-opp-chip-icon{width:30px!important;height:30px!important;flex-basis:30px!important;border-radius:9px!important;font-size:11px!important}
.pst-opp-status-strip .pst-opp-chip .count{height:25px!important;min-width:28px!important;font-size:9.5px!important}.pst-opp-status-strip .pst-opp-chip-arrow{display:none!important}
.pst-opp-filter-toggle{height:42px!important;min-width:82px!important;border-radius:12px!important}
.pst-opp-filter-panel{display:none!important;gap:8px!important}.pst-opp-filter-panel.is-open{display:grid!important}
.pst-opp-filter-row{grid-template-columns:110px minmax(0,1fr)!important;gap:12px!important;padding:10px 12px!important;border-radius:14px!important;box-shadow:none!important}
.pst-opp-filter-label{gap:0!important}.pst-opp-filter-label b{font-size:11px!important}.pst-opp-filter-label small,.pst-opp-section-icon{display:none!important}
.pst-opp-filter-options{gap:7px!important}.pst-opp-filter-row.source .pst-opp-filter-options{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important}.pst-opp-filter-row.field .pst-opp-filter-options,.pst-opp-filter-row.winner .pst-opp-filter-options{grid-template-columns:repeat(3,minmax(0,1fr))!important}
.pst-opp-filter-panel .pst-opp-chip{min-height:44px!important;padding:5px 7px!important;border-radius:11px!important;box-shadow:none!important}.pst-opp-filter-panel .pst-opp-chip-icon{width:30px!important;height:30px!important;flex-basis:30px!important;border-radius:9px!important}.pst-opp-filter-panel .pst-opp-chip-icon img{width:26px!important;height:26px!important}
.pst-opp-filter-panel .pst-opp-chip .count{height:24px!important;min-width:27px!important;font-size:9px!important}.pst-opp-filter-panel .pst-opp-chip-arrow{display:none!important}
.pst-opp-guide{display:none!important}
@media(max-width:760px){.pst-opp-route-grid{grid-template-columns:1fr!important}.pst-opp-status-strip{grid-template-columns:1fr 1fr!important}.pst-opp-filter-row{grid-template-columns:1fr!important}.pst-opp-filter-row.source .pst-opp-filter-options,.pst-opp-filter-row.field .pst-opp-filter-options,.pst-opp-filter-row.winner .pst-opp-filter-options{grid-template-columns:1fr!important}}

/* Contacted-company workdesk */
#pst-opportunities-focus.pst-opp-dashboard #pst-pcw-opportunity-tools,#pst-opportunities-focus.pst-opp-dashboard #pst-opportunities-list,#pst-opportunities-focus.pst-opp-dashboard .pst-opp-results-head{display:none!important}
#pst-opp-desk.pst-opp-workdesk{display:grid!important;grid-template-columns:270px minmax(560px,1fr) minmax(360px,420px)!important;gap:14px!important;margin:0!important}
.pst-opp-side,.pst-opp-work-list,.pst-opp-detail,.pst-opp-contacted{border:1px solid #dfe7e9;border-radius:16px;background:#fff;box-shadow:0 2px 10px rgba(37,66,77,.025);overflow:hidden}
.pst-opp-side{padding:14px;position:sticky;top:14px}.pst-opp-side-head{display:flex;justify-content:space-between;align-items:center;padding:0 4px 11px;border-bottom:1px solid #edf1f2}.pst-opp-side-head b{font-size:14px;color:#2d4854}.pst-opp-side-head button{border:0;background:transparent;color:#4b8da5;font-size:9.5px;font-weight:800;cursor:pointer}.pst-opp-side section{padding:11px 0;border-bottom:1px solid #edf1f2}.pst-opp-side section:last-child{border-bottom:0}.pst-opp-side h4{margin:0 4px 6px;font-size:11.5px;color:#38505a}
.pst-opp-side-item{width:100%;min-height:37px;display:grid;grid-template-columns:17px 28px minmax(0,1fr) auto;gap:7px;align-items:center;border:0;border-radius:9px;background:transparent;padding:4px 5px;text-align:left;color:#617680;cursor:pointer}.pst-opp-side-item:hover{background:#f8fafb}.pst-opp-side-item.on{background:#f3f7f8;color:#315f71}.pst-opp-side-item .check{width:15px;height:15px;border:1px solid #d0dbe0;border-radius:4px;display:grid;place-items:center;font-size:9px;color:#fff}.pst-opp-side-item.on .check{background:#83adbd;border-color:#83adbd}.pst-opp-side-item .icon{width:27px;height:27px;border-radius:8px;background:#f2f5f6;display:grid;place-items:center;font-size:10px;color:#6c858f;overflow:hidden}.pst-opp-side-item .icon img{width:21px;height:21px;filter:saturate(.55)}.pst-opp-side-item .text{font-size:10.5px;font-weight:720;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-opp-side-item .num{min-width:27px;height:23px;padding:0 5px;border-radius:999px;background:#f0f4f5;display:grid;place-items:center;font-size:9px;font-weight:800;color:#72868e}
.pst-opp-work-head{min-height:78px;padding:14px 15px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #e9eef0}.pst-opp-work-head h3{margin:0;font-size:17px;color:#2a4551}.pst-opp-work-head small{display:block;margin-top:2px;font-size:9px;color:#8a999e}.pst-opp-work-tools{display:flex;gap:7px}.pst-opp-work-tools label{height:38px;min-width:250px;border:1px solid #dce5e8;border-radius:10px;display:flex;align-items:center;gap:7px;padding:0 10px;color:#78909a;font-size:13px}.pst-opp-work-tools input{width:100%;border:0;outline:0;font-size:9.5px;color:#4d626c}.pst-opp-work-tools button{height:38px;border:1px solid #dce5e8;border-radius:10px;background:#fff;padding:0 10px;font-size:9px;color:#617781;font-weight:780;cursor:pointer;white-space:nowrap}
.pst-opp-work-cols,.pst-opp-work-row{display:grid;grid-template-columns:minmax(220px,1.55fr) minmax(90px,.7fr) minmax(90px,.65fr) 82px 70px 22px;gap:9px;align-items:center}.pst-opp-work-cols{height:36px;padding:0 12px;background:#fafcfc;border-bottom:1px solid #e9eef0;color:#8b999f;font-size:7.5px;font-weight:850}.pst-opp-work-row{width:100%;min-height:59px;padding:7px 12px;border:0;border-bottom:1px solid #edf1f2;background:#fff;text-align:left;color:#5d737d;cursor:pointer}.pst-opp-work-row:hover{background:#fafcfd}.pst-opp-work-row.selected{background:#f6f9fa;box-shadow:inset 3px 0 0 #8ab0bf}.pst-opp-work-row .main{min-width:0}.pst-opp-work-row .main b{display:block;font-size:10.8px;color:#314d58;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-opp-work-row .main small{display:block;margin-top:2px;font-size:7.8px;color:#95a0a5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-opp-work-row .source{display:flex;align-items:center;gap:5px;font-size:8.8px}.pst-opp-work-row .source i{width:25px;height:25px;border-radius:8px;background:#f2f5f6;display:grid;place-items:center;overflow:hidden}.pst-opp-work-row .source img{width:19px;height:19px;filter:saturate(.55)}.pst-opp-work-row .field,.pst-opp-work-row .date{font-size:8.7px}.pst-opp-work-row .status{padding:4px 5px;border-radius:999px;background:#eef3f1;color:#61756d;text-align:center;font-size:8px}.pst-opp-work-row .go{font-size:17px;color:#7d969f}.pst-opp-work-empty{padding:25px 15px;text-align:center;color:#8a999f;font-size:9px}
.pst-opp-work-right{display:grid;gap:14px}.pst-opp-box-title{height:47px;display:flex;align-items:center;padding:0 13px;border-bottom:1px solid #e9eef0;font-size:12.5px;font-weight:850;color:#314c57}.pst-opp-detail-head{display:flex;justify-content:space-between;gap:10px;padding:13px}.pst-opp-detail-head h3{margin:0;font-size:13.5px;color:#2f4a55}.pst-opp-detail-head small{display:block;margin-top:3px;font-size:8.3px;color:#8c9aa0;line-height:1.3}.pst-opp-detail-head>span{font-size:8px;padding:5px 7px;border-radius:8px;background:#f3f5f6;color:#71838b;white-space:nowrap}.pst-opp-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 11px;padding:0 13px 11px}.pst-opp-detail-grid small,.pst-opp-detail-desc small{display:block;font-size:7.7px;color:#909da2}.pst-opp-detail-grid b{display:block;margin-top:2px;font-size:9.2px;color:#5a7079;line-height:1.35;overflow-wrap:anywhere}.pst-opp-detail-desc{margin:0 13px 11px;padding-top:9px;border-top:1px solid #edf1f2}.pst-opp-detail-desc p{margin:4px 0 0;font-size:8.8px;line-height:1.45;color:#6a7d85}.pst-opp-detail-actions{display:flex;gap:7px;padding:11px 13px;border-top:1px solid #edf1f2}.pst-opp-draft-btn,.pst-opp-secondary-btn,.pst-opp-detail-actions a{min-height:40px;box-sizing:border-box;border-radius:9px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;font-size:9px;font-weight:820;cursor:pointer}.pst-opp-draft-btn{flex:1;border:1px solid #5795ac;background:#5795ac;color:#fff}.pst-opp-draft-btn:disabled{opacity:.45;cursor:not-allowed}.pst-opp-draft-btn span{font-size:15px}.pst-opp-secondary-btn,.pst-opp-detail-actions a{border:1px solid #dce5e8;background:#fff;color:#637983}.pst-opp-detail-empty{padding:24px 13px;color:#8d9a9f;font-size:9px}
.pst-opp-contacted-head{min-height:49px;padding:0 13px;display:flex;justify-content:space-between;align-items:center;gap:9px;border-bottom:1px solid #e9eef0}.pst-opp-contacted-head b{font-size:12px;color:#314c57}.pst-opp-contacted-head small{max-width:120px;text-align:right;font-size:7.5px;line-height:1.3;color:#81949c}.pst-opp-contact-cols,.pst-opp-contact-row{display:grid;grid-template-columns:minmax(110px,1.2fr) 82px minmax(95px,1fr) 68px 18px;gap:6px;align-items:center}.pst-opp-contact-cols{height:29px;padding:0 10px;background:#fafcfc;color:#8e9ca1;font-size:6.8px;font-weight:850}.pst-opp-contact-row{width:100%;min-height:48px;padding:6px 10px;border:0;border-bottom:1px solid #edf1f2;background:#fff;text-align:left;color:#657a83;cursor:pointer}.pst-opp-contact-row:hover{background:#fafcfd}.pst-opp-contact-row b{display:block;font-size:8.8px;color:#3a535d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-opp-contact-row small{display:block;margin-top:2px;font-size:6.8px;color:#9aa4a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-opp-contact-row>span:not(:first-child){font-size:7.4px;line-height:1.25}.pst-opp-contact-row>span.draft,.pst-opp-contact-row>span.waiting,.pst-opp-contact-row>span.replied{padding:4px;border-radius:999px;text-align:center;background:#f1f3f3}.pst-opp-contact-row>span.draft{color:#766f62}.pst-opp-contact-row>span.waiting{color:#6c7477}.pst-opp-contact-row>span.replied{background:#eef3ef;color:#61746a}.pst-opp-contact-row i{font-size:14px;color:#80969f}.pst-opp-contact-empty{padding:18px 10px;text-align:center;color:#8d9a9f;font-size:8px}.pst-opp-contact-more{width:100%;height:35px;border:0;border-top:1px solid #edf1f2;background:#fff;color:#4e8ba2;font-size:8.5px;font-weight:800;cursor:pointer}
@media(max-width:1250px){#pst-opp-desk.pst-opp-workdesk{grid-template-columns:250px minmax(560px,1fr)!important}.pst-opp-work-right{grid-column:1/-1;grid-template-columns:1fr 1fr}.pst-opp-side{position:static}}
@media(max-width:850px){#pst-opp-desk.pst-opp-workdesk{grid-template-columns:1fr!important}.pst-opp-work-right{grid-column:auto;grid-template-columns:1fr}.pst-opp-work-head{align-items:flex-start;flex-direction:column}.pst-opp-work-tools{width:100%}.pst-opp-work-tools label{min-width:0;flex:1}.pst-opp-work-cols{display:none}.pst-opp-work-row{grid-template-columns:minmax(0,1fr) auto}.pst-opp-work-row .source,.pst-opp-work-row .field,.pst-opp-work-row .date,.pst-opp-work-row .status{display:none}.pst-opp-contact-cols{display:none}.pst-opp-contact-row{grid-template-columns:minmax(0,1fr) auto}.pst-opp-contact-row>span:nth-child(2),.pst-opp-contact-row>span:nth-child(3),.pst-opp-contact-row>span:nth-child(4){display:none}}
`;document.head.appendChild(s);
}
function sourceMark(id){var asset=SOURCE_ASSET[id]||'',icon=SOURCE_ICON[id]||'•';return'<span class="pst-opp-source-mark" aria-hidden="true">'+(asset?'<img src="'+E(asset)+'" alt="" loading="eager" decoding="async">':'<b>'+E(icon)+'</b>')+'</span>';}
function categoryMeta(kind,value){
 kind=S(kind).toLowerCase();value=S(value);
 if(kind==='source'){var src=value.toUpperCase();return{kind:kind,value:src,eyebrow:'BURIMI',title:src==='ALL'?'Të gjitha burimet':(LABEL[src]||src),source:src==='ALL'?'':src};}
 if(kind==='mode'){var m=value.toLowerCase();if(m==='local')return{kind:kind,value:m,eyebrow:'DIRECT TENDER',title:'Për ofertim'};if(m==='award')return{kind:kind,value:m,eyebrow:'TED AWARD SALES',title:'Fitues për kontaktim'};return{kind:kind,value:'all',eyebrow:'PAMJA E PLOTË',title:'Të gjitha mundësitë'};}
 if(kind==='lifecycle'){var life=value.toLowerCase(),lifeLabel={all:'Të gjitha statuset',new:'Të reja',draft:'Draft gati',waiting:'Në pritje',replied:'Me përgjigje'};return{kind:kind,value:life,eyebrow:'STATUSI',title:lifeLabel[life]||life};}
 if(kind==='field'){var field=value.toLowerCase(),f=FIELDS.find(function(x){return x.id===field;});return{kind:kind,value:field,eyebrow:'FUSHA',title:field==='all'?'Të gjitha fushat':(f?f.label:field)};}
 if(kind==='winner'||kind==='winner_group'){var winner=value.toLowerCase(),w=WINNERS.find(function(x){return x.id===winner;});return{kind:'winner',value:winner,eyebrow:'FITUESI TED',title:winner==='all'?'Të gjithë fituesit TED':(w?w.label:winner)};}
 return{kind:'mode',value:'all',eyebrow:'PAMJA E PLOTË',title:'Të gjitha mundësitë'};
}
function resultTitle(meta){if(meta&&meta.source)return sourceMark(meta.source)+E(meta.title);return E(meta&&meta.title||'Mundësitë');}
function header(focus){
 var h=focus.querySelector(':scope>header');if(!h)return;
 var html='<div class="pst-opp-desk-head-left"><button type="button" class="pst-opp-desk-back pst-opp-v4-back" data-pst-opp-back>← Kthehu</button><div class="pst-opp-desk-title"><h2>Mundësitë</h2></div></div>';
 if(h.dataset.pstOppHeaderHtml!==html){h.innerHTML=html;h.dataset.pstOppHeaderHtml=html;}
}
function tools(focus){
 var t=focus.querySelector('#pst-pcw-opportunity-tools');if(!t)return;
 var b=t.querySelector('[data-pst-opp-filter-toggle]');if(b)b.remove();
}
function routeIcon(id){return id==='local'?'▤':id==='award'?'♟':'▱';}
function modeButton(id,eyebrow,title,copy,n,cls){
 return'<button type="button" class="pst-opp-route '+cls+'" data-pst-opp-mode="'+id+'"><span class="pst-opp-route-icon" aria-hidden="true">'+routeIcon(id)+'</span><span class="route-copy"><b>'+title+'</b></span><span class="pst-opp-route-tail"><span class="route-count">'+Number(n||0)+'</span></span></button>';
}
function chip(attr,id,label,count,on,icon,asset){var visual=asset?'<img src="'+E(asset)+'" alt="" loading="lazy" decoding="async">':E(icon||'•');return'<button type="button" class="pst-opp-chip '+(on?'on':'')+'" '+attr+'="'+E(id)+'"><span class="pst-opp-chip-main"><span class="pst-opp-chip-icon" aria-hidden="true">'+visual+'</span><span class="pst-opp-chip-label">'+E(label)+'</span></span><span class="pst-opp-chip-tail">'+(count==null?'':'<span class="count">'+Number(count||0)+'</span>')+'<span class="pst-opp-chip-arrow" aria-hidden="true">›</span></span></button>';}
function statusRow(c){return chip('data-pst-opp-lifecycle','new','Të reja',c.life.new,false,'✦')+chip('data-pst-opp-lifecycle','waiting','Në pritje',c.life.waiting,false,'◷')+chip('data-pst-opp-lifecycle','replied','Me përgjigje',c.life.replied,false,'✉');}
function sourceRow(c){var active=SOURCES.filter(function(k){return Number(c.src[k]||0)>0;});return active.map(function(k){return chip('data-pst-opp-source',k,LABEL[k]||k,c.src[k],false,SOURCE_ICON[k]||'•',SOURCE_ASSET[k]||'');}).join('');}
function fieldRow(c){return FIELDS.map(function(f){return chip('data-pst-opp-field',f.id,f.label,c.field[f.id],false,f.icon||'•');}).join('');}
function winnerRow(c){return WINNERS.map(function(w){return chip('data-pst-opp-winner',w.id,w.label,c.winner[w.id],false,w.icon||'•');}).join('');}
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

function O(r){return r&&r.payload&&typeof r.payload==='object'?r.payload:{};}
function W(r){var p=O(r),w=p.winner&&typeof p.winner==='object'?p.winner:{};if(!w.name&&p.winner_name)w=Object.assign({},w,{name:p.winner_name});return w;}
function winnerName(r){return S(W(r).name||'').trim();}
function winnerContacts(r){var P=window.PSTTenderPriorityActionsV2||window.PSTTenderPriorityActionsV1;if(P&&typeof P.enrichedContacts==='function')return A(P.enrichedContacts(r));var w=W(r),out=[];A(w.emails).forEach(function(x){if(x)out.push({email:S(x)});});if(w.email)out.push({email:S(w.email)});return out;}
function rawOutreachStatus(x){return S(x&&x.__pstOpportunityOriginalStatus||x&&x.status).toLowerCase();}
function outreachFor(r){return A(state&&state.outreachByTender&&state.outreachByTender[S(r&&r.id)]);}
function effectiveLane(r){
 var lane=lifeOf(r),out=outreachFor(r),sent=out.some(function(x){return S(x&&x.status).toLowerCase()==='sent';}),draft=out.some(function(x){return /^(draft_pending|draft_created)$/.test(rawOutreachStatus(x));});
 if(lane==='replied')return'replied';
 if(sent)return'waiting';
 if(draft)return'draft';
 var p=O(r),d=p.outreach_draft||p.gmail_draft,ds=S(d&&d.status).toLowerCase();
 if(d&&/^(created|scheduled)$/.test(ds))return'draft';
 return lane==='waiting'?'waiting':lane==='draft'?'draft':'new';
}
function norm(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function companyKey(r){
 if(srcOf(r)!=='TED')return'tender:'+S(r&&r.id);
 var cs=winnerContacts(r),mail=S(cs[0]&&cs[0].email).toLowerCase(),at=mail.lastIndexOf('@');
 if(at>0)return'domain:'+mail.slice(at+1).replace(/^www\./,'');
 var n=norm(winnerName(r)).replace(/[^a-z0-9]+/g,'');return n?'name:'+n:'tender:'+S(r&&r.id);
}
function companyLabel(r){return srcOf(r)==='TED'&&winnerName(r)?winnerName(r):S(r&&r.title||r&&r.authority||'Mundësi');}
function globalContactedKeys(){var out={};baseRows().forEach(function(r){if(effectiveLane(r)!=='new')out[companyKey(r)]=true;});return out;}
function rowTime(r){var m=api&&api._test&&api._test.lifecycleMeta&&api._test.lifecycleMeta(r),v=m&&m.when||r&&r.published_date||r&&r.updated_at||'';var n=Date.parse(v);return isFinite(n)?n:0;}
function activeRows(){var contacted=globalContactedKeys();return filteredRows().filter(function(r){return effectiveLane(r)==='new'&&!contacted[companyKey(r)];}).sort(function(a,b){return sortDirection==='asc'?rowTime(a)-rowTime(b):rowTime(b)-rowTime(a);});}
function contactedRows(){
 var by={};baseRows().forEach(function(r){var lane=effectiveLane(r);if(lane==='new')return;var k=companyKey(r),old=by[k],rank=lane==='replied'?3:lane==='waiting'?2:1,oldLane=old&&effectiveLane(old),oldRank=oldLane==='replied'?3:oldLane==='waiting'?2:1;if(!old||rank>oldRank||(rank===oldRank&&rowTime(r)>rowTime(old)))by[k]=r;});
 return Object.keys(by).map(function(k){return by[k];}).sort(function(a,b){return rowTime(b)-rowTime(a);});
}
function fd(v){if(!v)return'—';try{var d=new Date(v);return isNaN(d.getTime())?S(v):d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'});}catch(e){return S(v);}}
function fdt(v){if(!v)return'—';try{var d=new Date(v);return isNaN(d.getTime())?S(v):d.toLocaleString('sq-AL',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return S(v);}}
function valueLabel(r){var fn=api&&api._test&&api._test.tenderValueLabel;return typeof fn==='function'?(fn(r)||'—'):'—';}
function fieldLabel(r){var id=fieldOf(r),f=FIELDS.find(function(x){return x.id===id;});return f?f.label:'Të tjera';}
function officialUrl(r){var P=window.PSTTenderPriorityActionsV2||window.PSTTenderPriorityActionsV1,u='';try{if(P&&typeof P.officialUrl==='function')u=P.officialUrl(r)||'';}catch(e){}if(!u)u=S(r&&r.detail_url||r&&r.source_url);try{var x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:'';}catch(e){return'';}}
function filterButton(attr,id,label,count,on,icon,asset){var visual=asset?'<img src="'+E(asset)+'" alt="">':E(icon||'•');return'<button type="button" class="pst-opp-side-item '+(on?'on':'')+'" '+attr+'="'+E(id)+'"><span class="check">'+(on?'✓':'')+'</span><span class="icon">'+visual+'</span><span class="text">'+E(label)+'</span><span class="num">'+Number(count||0)+'</span></button>';}
function sideFilters(c){
 var source=S(state&&state.source||'all'),field=S(state&&state.field||'all'),winner=S(state&&state.winner_group||'all');
 var srcs=SOURCES.filter(function(k){return Number(c.src[k]||0)>0;}).map(function(k){return filterButton('data-pst-opp-source',k,LABEL[k]||k,c.src[k],source===k,SOURCE_ICON[k],SOURCE_ASSET[k]);}).join('');
 var fs=FIELDS.filter(function(f){return Number(c.field[f.id]||0)>0;}).map(function(f){return filterButton('data-pst-opp-field',f.id,f.label,c.field[f.id],field===f.id,f.icon);}).join('');
 var ws=WINNERS.map(function(w){return filterButton('data-pst-opp-winner',w.id,w.label,c.winner[w.id],winner===w.id,w.icon);}).join('');
 return'<aside class="pst-opp-side"><div class="pst-opp-side-head"><b>Filtra</b><button type="button" data-pst-opp-reset>Pastro të gjitha</button></div>'
  +'<section><h4>Burimi</h4>'+filterButton('data-pst-opp-source','all','Të gjitha',c.total,source==='all','◉')+srcs+'</section>'
  +'<section><h4>Fusha</h4>'+filterButton('data-pst-opp-field','all','Të gjitha',c.total,field==='all','▦')+fs+'</section>'
  +'<section><h4>Fituesi TED</h4>'+filterButton('data-pst-opp-winner','all','Të gjithë',c.award,winner==='all','♜')+ws+'</section></aside>';
}
function activeRow(r){var src=srcOf(r),award=src==='TED',title=award?companyLabel(r):S(r.title||r.authority),sub=award?S(r.title||''):S(r.publication_no||r.procurement_no||r.authority||''),asset=SOURCE_ASSET[src]||'',visual=asset?'<img src="'+E(asset)+'" alt="">':E(SOURCE_ICON[src]||'•');return'<button type="button" class="pst-opp-work-row '+(S(r.id)===S(selectedId)?'selected':'')+'" data-pst-opp-select="'+E(r.id)+'"><span class="main"><b>'+E(title)+'</b><small>'+E(sub)+'</small></span><span class="source"><i>'+visual+'</i>'+E(LABEL[src]||src)+'</span><span class="field">'+E(fieldLabel(r))+'</span><span class="date">'+E(fd(r.published_date||r.updated_at))+'</span><span class="status">E re</span><span class="go">›</span></button>';}
function activePanel(rows){
 var shown=rows.slice(0,60);return'<section class="pst-opp-work-list"><div class="pst-opp-work-head"><div><h3>Mundësi aktive</h3><small>'+rows.length+' mundësi që nuk janë kontaktuar ende.</small></div><div class="pst-opp-work-tools"><label>⌕ <input data-pst-opp-search value="'+E(state&&state.query||'')+'" placeholder="Kërko kompani, tender ose referencë..."></label><button type="button" data-pst-opp-sort>↕ Rendit sipas datës</button></div></div><div class="pst-opp-work-cols"><span>KOMPANIA / MUNDËSIA</span><span>BURIMI</span><span>FUSHA</span><span>DATA</span><span>STATUSI</span><span></span></div><div class="pst-opp-work-rows">'+(shown.length?shown.map(activeRow).join(''):'<div class="pst-opp-work-empty">Nuk ka mundësi aktive që përputhen me filtrat.</div>')+'</div></section>';
}
function selectedRow(){var all=baseRows(),r=all.find(function(x){return S(x.id)===S(selectedId);});if(r)return r;var a=activeRows();return a[0]||contactedRows()[0]||null;}
function detailPanel(r){
 if(!r)return'<section class="pst-opp-detail"><div class="pst-opp-box-title">Detajet e kompanisë</div><div class="pst-opp-detail-empty">Zgjidh një mundësi nga lista.</div></section>';
 selectedId=S(r.id);var award=srcOf(r)==='TED',contacts=winnerContacts(r),lane=effectiveLane(r),title=award?companyLabel(r):S(r.title||r.authority),sub=award?S(r.title||''):S(r.authority||''),p=O(r),desc=S(r.description||p.description||p.scope||'').slice(0,420),url=officialUrl(r),action='';
 if(award&&lane==='new')action='<button type="button" class="pst-opp-draft-btn" data-pst-opp-draft="'+E(r.id)+'" '+(contacts.length?'':'disabled')+'><span>✉</span>'+(contacts.length?'Krijo draft emaili':'Mungon emaili i verifikuar')+'</button>';
 else if(lane==='draft')action='<button type="button" class="pst-opp-draft-btn" data-pst-opp-gmail="drafts"><span>✉</span>Hap draftet në Gmail</button>';
 else if(lane==='waiting'||lane==='replied')action='<button type="button" class="pst-opp-draft-btn" data-pst-opp-gmail="inbox"><span>✉</span>Hap Gmail</button>';
 else action='<button type="button" class="pst-opp-secondary-btn" data-pst-opp-open="'+E(r.id)+'">Hap mundësinë</button>';
 return'<section class="pst-opp-detail"><div class="pst-opp-box-title">Detajet e kompanisë</div><div class="pst-opp-detail-head"><div><h3>'+E(title)+'</h3><small>'+E(sub)+'</small></div><span>'+E(LABEL[srcOf(r)]||srcOf(r))+'</span></div><div class="pst-opp-detail-grid"><div><small>Fusha</small><b>'+E(fieldLabel(r))+'</b></div><div><small>'+(award?'Kompania fituese':'Autoriteti')+'</small><b>'+E(award?companyLabel(r):S(r.authority||'—'))+'</b></div><div><small>Vlera</small><b>'+E(valueLabel(r))+'</b></div><div><small>Data e publikimit</small><b>'+E(fd(r.published_date||r.updated_at))+'</b></div>'+(award?'<div><small>Kontaktet e verifikuara</small><b>'+contacts.length+'</b></div>':'')+'</div>'+(desc?'<div class="pst-opp-detail-desc"><small>Përshkrimi i shkurtër</small><p>'+E(desc)+'</p></div>':'')+'<div class="pst-opp-detail-actions">'+action+(url?'<a href="'+E(url)+'" target="_blank" rel="noopener">Burimi zyrtar ↗</a>':'')+'</div></section>';
}
function contactedRow(r){var m=api&&api._test&&api._test.lifecycleMeta&&api._test.lifecycleMeta(r)||{},lane=effectiveLane(r),status=lane==='replied'?'Me përgjigje':lane==='waiting'?'Në pritje':'Draft gati',next=lane==='draft'?'Rishiko dhe dërgo draftin':lane==='waiting'?'Pritet përgjigjja':'Shqyrto përgjigjen';return'<button type="button" class="pst-opp-contact-row" data-pst-opp-select="'+E(r.id)+'"><span><b>'+E(companyLabel(r))+'</b><small>'+E(S(r.title||''))+'</small></span><span>'+E(fdt(m.when||r.updated_at||r.published_date))+'</span><span>'+E(next)+'</span><span class="'+lane+'">'+E(status)+'</span><i>›</i></button>';}
function contactedPanel(rows){var visible=contactedExpanded?rows:rows.slice(0,5);return'<section class="pst-opp-contacted"><div class="pst-opp-contacted-head"><b>Kompanitë e kontaktuara</b><small>Kalojnë te Projektet vetëm pas RFQ.</small></div><div class="pst-opp-contact-cols"><span>KOMPANIA</span><span>DATA</span><span>HAPI TJETËR</span><span>STATUSI</span><span></span></div><div>'+ (visible.length?visible.map(contactedRow).join(''):'<div class="pst-opp-contact-empty">Ende nuk ka kompani të kontaktuara.</div>') +'</div>'+(rows.length>5?'<button type="button" class="pst-opp-contact-more" data-pst-opp-contacted-toggle>'+(contactedExpanded?'Shfaq më pak':'Shiko të gjitha '+rows.length+' kompanitë')+' ›</button>':'')+'</section>';}

function sectionLabel(icon,title,copy){return'<div class="pst-opp-filter-label"><b>'+E(title)+'</b></div>';}
function deskHtml(c){
 var active=activeRows(),contacted=contactedRows(),sel=selectedRow();
 return'<section id="pst-opp-desk" class="pst-opp-workdesk">'+sideFilters(c)+'<main>'+activePanel(active)+'</main><aside class="pst-opp-work-right">'+detailPanel(sel)+contactedPanel(contacted)+'</aside></section>';
}
function resultHead(focus){
 var list=focus.querySelector('#pst-opportunities-list');if(!list)return;
 var rows=filteredRows(),visible=list.querySelectorAll('[data-pcw-tender]').length,h=focus.querySelector('.pst-opp-results-head'),label=resultPage&&resultPage.title||'';
 if(!h){h=document.createElement('div');h.className='pst-opp-results-head';list.parentNode.insertBefore(h,list);}
 var html='<div><h3>'+(resultPage?'Rezultatet · '+E(label):'Rezultatet')+'</h3><p>'+rows.length+' mundësi përputhen · '+visible+' të shfaqura'+(rows.length>visible?' · përdor “Shfaq edhe” poshtë':'')+'</p></div>';
 if(h.dataset.pstOppResultsHtml!==html){h.innerHTML=html;h.dataset.pstOppResultsHtml=html;}
}
function decorate(){
 scheduled=false;var x=current(),page=document.getElementById('page-kek-tenders'),focus=page&&page.querySelector('#pst-opportunities-focus');if(!x||!state||!focus)return false;
 if(observer)observer.disconnect();decorating=true;
 try{
   resultPage=null;css();header(focus);tools(focus);var c=counts(),desk=focus.querySelector('#pst-opp-desk'),html=deskHtml(c);
   focus.classList.add('pst-opp-dashboard');focus.classList.remove('pst-opp-result-page');
   if(!desk){var anchor=focus.querySelector('#pst-pcw-lifecycle-tabs')||focus.querySelector('#pst-opportunities-list');var wrap=document.createElement('div');wrap.innerHTML=html;desk=wrap.firstChild;desk.dataset.pstOppDeskHtml=html;focus.insertBefore(desk,anchor);}else if(desk.dataset.pstOppDeskHtml!==html){var wrap2=document.createElement('div');wrap2.innerHTML=html;var next=wrap2.firstChild;next.dataset.pstOppDeskHtml=html;desk.replaceWith(next);}
   var rh=focus.querySelector('.pst-opp-results-head');if(rh)rh.remove();page.dataset.pstOpportunitiesDesk='contacted-workdesk1';return true;
 }finally{decorating=false;reconnectObserver();}
}
function schedule(){if(decorating||scheduled)return;scheduled=true;setTimeout(function(){if(!document.getElementById('pst-opportunities-focus')){scheduled=false;return;}decorate();},0);}
function reconnectObserver(){if(!observer||!observerRoot||!observerRoot.isConnected)return;observer.observe(observerRoot,{childList:true,subtree:true});}
function stableTop(){
 function top(){try{document.documentElement.scrollTop=0;document.body.scrollTop=0;}catch(ignore){}try{window.scrollTo({top:0,left:0,behavior:'auto'});}catch(e){try{window.scrollTo(0,0);}catch(x){}}}
 top();
 var raf=window.requestAnimationFrame||function(fn){return setTimeout(fn,16);};
 raf(function(){top();raf(top);});
 /* Canonical Opportunity rendering can finish after the captured click. Re-settle
    after that hand-off so the removed category card cannot leave an 80px offset. */
 [0,80,240].forEach(function(ms){setTimeout(top,ms);});
}
function observe(){var root=document.getElementById('pst-opportunities-focus');if(!root||typeof MutationObserver!=='function')return;if(observer)observer.disconnect();observerRoot=root;if(!observer)observer=new MutationObserver(function(){if(!decorating)schedule();});reconnectObserver();}
function reset(){resultPage=null;current();if(api&&typeof api.applyOpportunityFilter==='function')api.applyOpportunityFilter('reset','all');schedule();}
function apply(kind,value){current();if(api&&typeof api.applyOpportunityFilter==='function'){api.applyOpportunityFilter(kind,value);schedule();return true;}return false;}
function openResultPage(kind,value){
 current();if(!api||typeof api.applyOpportunityFilter!=='function')return false;
 resultPage=categoryMeta(kind,value);
 api.applyOpportunityFilter('reset','all');
 if(resultPage.kind==='mode'&&resultPage.value!=='all')api.applyOpportunityFilter('mode',resultPage.value);
 else if(resultPage.kind==='source'&&resultPage.value!=='ALL')api.applyOpportunityFilter('source',resultPage.value);
 else if(resultPage.kind==='lifecycle'&&resultPage.value!=='all')api.applyOpportunityFilter('lifecycle',resultPage.value);
 else if(resultPage.kind==='field'&&resultPage.value!=='all')api.applyOpportunityFilter('field',resultPage.value);
 else if(resultPage.kind==='winner'){
   if(resultPage.value==='all')api.applyOpportunityFilter('mode','award');
   else api.applyOpportunityFilter('winner',resultPage.value);
 }
 decorate();stableTop();return true;
}
function closeResultPage(){if(!resultPage)return false;resultPage=null;current();if(api&&typeof api.applyOpportunityFilter==='function')api.applyOpportunityFilter('reset','all');decorate();stableTop();return true;}
function back(){if(resultPage)return closeResultPage();try{var N=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1;if(N&&typeof N.openHome==='function')return N.openHome();}catch(e){}try{var H=window.PSTHomeCanonicalV1;if(H&&typeof H.activateHome==='function')return H.activateHome();}catch(e){}try{if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('home');}catch(e){}return false;}
function consume(e){if(!e)return;var control=e.target&&e.target.closest?e.target.closest('button,a'):null;if(control&&typeof control.blur==='function')control.blur();e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();}
async function createDraft(id,button){
 var P=window.PSTTenderPriorityActionsV2||window.PSTTenderPriorityActionsV1;if(!P||typeof P.prepareDraft!=='function')throw new Error('Draft workflow nuk është gati.');
 if(button){button.disabled=true;button.textContent='Duke krijuar draftin…';}
 try{await P.prepareDraft(id);selectedId=S(id);if(api&&typeof api.loadOpportunities==='function')await api.loadOpportunities(true);schedule();}finally{if(button)button.disabled=false;}
}
function click(e){
 var t=e.target&&e.target.closest?e.target:null,b;if(!t)return;current();
 if((b=t.closest('[data-pst-opp-back]'))){consume(e);back();return;}
 if((b=t.closest('[data-pst-opp-reset]'))){consume(e);reset();return;}
 if((b=t.closest('[data-pst-opp-source]'))){consume(e);apply('source',b.dataset.pstOppSource||'all');return;}
 if((b=t.closest('[data-pst-opp-winner]'))){consume(e);apply('winner',b.dataset.pstOppWinner||'all');return;}
 if((b=t.closest('[data-pst-opp-field]'))){consume(e);apply('field',b.dataset.pstOppField||'all');return;}
 if((b=t.closest('[data-pst-opp-sort]'))){consume(e);sortDirection=sortDirection==='desc'?'asc':'desc';decorate();return;}
 if((b=t.closest('[data-pst-opp-select]'))){consume(e);selectedId=S(b.dataset.pstOppSelect);decorate();return;}
 if((b=t.closest('[data-pst-opp-contacted-toggle]'))){consume(e);contactedExpanded=!contactedExpanded;decorate();return;}
 if((b=t.closest('[data-pst-opp-draft]'))){consume(e);createDraft(S(b.dataset.pstOppDraft),b).catch(function(err){if(typeof window.pstToast==='function')window.pstToast(S(err&&err.message||err),'error');else alert(S(err&&err.message||err));decorate();});return;}
 if((b=t.closest('[data-pst-opp-gmail]'))){consume(e);window.open(b.dataset.pstOppGmail==='drafts'?'https://mail.google.com/mail/u/0/#drafts':'https://mail.google.com/mail/u/0/#inbox','_blank','noopener');return;}
 if((b=t.closest('[data-pst-opp-open]'))){consume(e);if(api&&typeof api.openTender==='function')api.openTender(S(b.dataset.pstOppOpen));return;}
}
function boot(){
 css();loadBridge();
 (function ready(){current();if(api&&state&&document.getElementById('pst-opportunities-focus')){decorate();observe();return;}setTimeout(ready,500);})();
 document.addEventListener('click',click,true);
 document.addEventListener('input',function(e){var el=e.target;if(el&&el.matches&&el.matches('[data-pst-opp-search]')){var pos=el.selectionStart||0;state.query=el.value||'';state.display_limit=40;if(api&&typeof api.renderOpportunities==='function')api.renderOpportunities();setTimeout(function(){var n=document.querySelector('[data-pst-opp-search]');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}}},0);}else if(el&&el.id==='pst-pcw-opportunity-search')schedule();},true);
 document.addEventListener('pst:opportunities-filter-applied',schedule);
 ['pst:tender-gmail-drafts-ready','pst:tender-gmail-draft-created','pst:opportunity-draft-state-changed'].forEach(function(name){document.addEventListener(name,function(e){var id=S(e&&e.detail&&e.detail.tender_id);if(id)selectedId=id;setTimeout(function(){if(api&&typeof api.loadOpportunities==='function')Promise.resolve(api.loadOpportunities(true)).finally(schedule);else schedule();},90);});});
 document.addEventListener('pst:modules-ready',schedule,{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
var exposed={version:VERSION,apply:decorate,reset:reset,state:function(){return{density:density,filtersOpen:filtersOpen,resultPage:resultPage,sourcePage:resultPage&&resultPage.source||''};},_test:{baseRows:baseRows,filteredRows:filteredRows,counts:counts,sourceOf:srcOf,fieldOf:fieldOf,winnerOf:winnerOf,lifecycleOf:lifeOf,decorate:decorate,schedule:schedule,categoryMeta:categoryMeta,openResultPage:openResultPage,closeResultPage:closeResultPage}};
window.PSTOpportunitiesDeskV1=window.PSTOpportunitiesMindmapV6=window.PSTOpportunitiesMindmapV5=window.PSTOpportunitiesMindmapV4=exposed;
})();
