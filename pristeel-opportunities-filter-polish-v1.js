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

var VERSION='20260924-layout-stability4';
var density='comfortable',filtersOpen=true,resultPage=null,api=null,state=null,observer=null,observerRoot=null,scheduled=false,decorating=false;
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
 var html='';
 if(resultPage){
   var n=filteredRows().length,densityHtml='<div class="pst-opp-density"><button type="button" data-pst-opp-density="comfortable" class="'+(density==='comfortable'?'on':'')+'">Komode</button><button type="button" data-pst-opp-density="compact" class="'+(density==='compact'?'on':'')+'">Kompakte</button></div>';
   html='<div class="pst-opp-desk-head-left"><button type="button" class="pst-opp-desk-back pst-opp-v4-back" data-pst-opp-back aria-label="Kthehu te dashboard-i i Mundësive">← Mundësitë</button><div class="pst-opp-desk-title"><span>PPPP · '+E(resultPage.eyebrow)+'</span><h2 class="'+(resultPage.source?'pst-opp-source-title':'')+'">'+resultTitle(resultPage)+'</h2><p>'+n+' mundësi përputhen me këtë kategori.</p></div></div>'+densityHtml;
 }else{
   html='<div class="pst-opp-desk-head-left"><button type="button" class="pst-opp-desk-back pst-opp-v4-back" data-pst-opp-back>← Kthehu</button><div class="pst-opp-desk-title"><span>PPPP · OPPORTUNITY DESK</span><h2>Mundësitë</h2><p>Zgjidh një kategori për të hapur listën përkatëse të mundësive.</p></div></div><div class="pst-opp-header-note">Çeliku lidh mundësitë me një të ardhme më të fortë.</div>';
 }
 var owned=!!h.querySelector('.pst-opp-desk-head-left')&&((!!resultPage)===!!h.querySelector('.pst-opp-density'));
 if(h.dataset.pstOppHeaderHtml!==html||!owned){h.innerHTML=html;h.dataset.pstOppHeaderHtml=html;}
}
function tools(focus){
 var t=focus.querySelector('#pst-pcw-opportunity-tools');if(!t)return;
 var b=t.querySelector('[data-pst-opp-filter-toggle]');if(b)b.remove();
}
function routeIcon(id){return id==='local'?'▤':id==='award'?'♟':'▱';}
function modeButton(id,eyebrow,title,copy,n,cls){
 return'<button type="button" class="pst-opp-route '+cls+'" data-pst-opp-mode="'+id+'"><span class="pst-opp-route-icon" aria-hidden="true">'+routeIcon(id)+'</span><span class="route-copy"><span>'+eyebrow+'</span><b>'+title+'</b><small>'+copy+'</small></span><span class="pst-opp-route-tail"><span class="route-count">'+Number(n||0)+'</span><span class="pst-opp-route-arrow" aria-hidden="true">›</span></span></button>';
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
function sectionLabel(icon,title,copy){return'<div class="pst-opp-filter-label"><span class="pst-opp-section-icon" aria-hidden="true">'+E(icon)+'</span><span><b>'+E(title)+'</b><small>'+E(copy)+'</small></span></div>';}
function deskHtml(c){
 return'<section id="pst-opp-desk"><div class="pst-opp-route-grid">'
  +modeButton('all','PAMJA E PLOTË','Të gjitha mundësitë','Hap gjithë pipeline-in e Mundësive.',c.total,'all')
  +modeButton('local','DIRECT TENDER','Për ofertim','KRPP, APP dhe burime të tjera ku PriSteel mund të vlerësojë pjesëmarrjen.',c.local,'local')
  +modeButton('award','TED AWARD SALES','Fitues për kontaktim','Tenderë të fituar ku fituesi mund të jetë klient, partner ose kapacitet B2B.',c.award,'award')
  +'</div><div class="pst-opp-filter-panel">'
  +'<div class="pst-opp-filter-row status">'+sectionLabel('◷','Statusi','Zgjidh sipas statusit aktual të mundësive.')+'<div class="pst-opp-filter-options">'+statusRow(c)+'</div></div>'
  +'<div class="pst-opp-filter-row source">'+sectionLabel('▤','Burimi','Zgjidh burimin e mundësive.')+'<div class="pst-opp-filter-options">'+sourceRow(c)+'</div></div>'
  +'<div class="pst-opp-filter-row field">'+sectionLabel('▦','Fusha','Zgjidh fushën e projektit.')+'<div class="pst-opp-filter-options">'+fieldRow(c)+'</div></div>'
  +'<div class="pst-opp-filter-row winner">'+sectionLabel('♜','Fituesi TED','Zgjidh sipas llojit të fituesit.')+'<div class="pst-opp-filter-options">'+winnerRow(c)+'</div></div>'
  +'</div><div class="pst-opp-guide"><span class="pst-opp-guide-icon" aria-hidden="true">i</span><span><b>Si funksionon?</b><small>Kliko në një kategori për të hapur vetëm listën përkatëse. Kthehu te Mundësitë për të zgjedhur një kategori tjetër.</small></span><strong>Më pak klikime.<br>Më shumë mundësi.</strong></div></section>';
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
   css();header(focus);tools(focus);var c=counts(),desk=focus.querySelector('#pst-opp-desk');
   focus.classList.toggle('pst-opp-dashboard',!resultPage);
   focus.classList.toggle('pst-opp-result-page',!!resultPage);
   if(resultPage){if(desk)desk.remove();}
   else{var html=deskHtml(c);if(!desk){var anchor=focus.querySelector('#pst-pcw-lifecycle-tabs')||focus.querySelector('#pst-opportunities-list');var wrap=document.createElement('div');wrap.innerHTML=html;desk=wrap.firstChild;desk.dataset.pstOppDeskHtml=html;focus.insertBefore(desk,anchor);}else if(desk.dataset.pstOppDeskHtml!==html){var wrap2=document.createElement('div');wrap2.innerHTML=html;var next=wrap2.firstChild;next.dataset.pstOppDeskHtml=html;desk.replaceWith(next);}}
   focus.classList.toggle('pst-opp-density-compact',density==='compact');resultHead(focus);page.dataset.pstOpportunitiesDesk='1';return true;
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
function click(e){
 var t=e.target&&e.target.closest?e.target:null,b;if(!t)return;current();
 if((b=t.closest('[data-pst-opp-back]'))){consume(e);back();return;}
 if((b=t.closest('[data-pst-opp-density]'))){consume(e);density=b.dataset.pstOppDensity==='compact'?'compact':'comfortable';decorate();return;}
 if((b=t.closest('[data-pst-opp-filter-toggle]'))){consume(e);return;}
 if((b=t.closest('[data-pst-opp-reset]'))){consume(e);reset();return;}
 if((b=t.closest('[data-pst-opp-mode]'))){consume(e);openResultPage('mode',b.dataset.pstOppMode||'all');return;}
 if((b=t.closest('[data-pst-opp-lifecycle]'))){consume(e);openResultPage('lifecycle',b.dataset.pstOppLifecycle||'all');return;}
 if((b=t.closest('[data-pst-opp-source]'))){consume(e);openResultPage('source',b.dataset.pstOppSource||'all');return;}
 if((b=t.closest('[data-pst-opp-winner]'))){consume(e);openResultPage('winner',b.dataset.pstOppWinner||'all');return;}
 if((b=t.closest('[data-pst-opp-field]'))){consume(e);openResultPage('field',b.dataset.pstOppField||'all');return;}
}
function boot(){
 css();loadBridge();
 (function ready(){current();if(api&&state&&document.getElementById('pst-opportunities-focus')){decorate();observe();return;}setTimeout(ready,500);})();
 document.addEventListener('click',click,true);
 document.addEventListener('input',function(e){if(e.target&&e.target.id==='pst-pcw-opportunity-search')schedule();},true);
 document.addEventListener('pst:opportunities-filter-applied',function(e){var d=e&&e.detail||{},kind=S(d.kind).toLowerCase();if(!resultPage&&(kind==='source'||kind==='lifecycle'))resultPage=categoryMeta(kind,d.value);schedule();});
 document.addEventListener('pst:modules-ready',schedule,{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
var exposed={version:VERSION,apply:decorate,reset:reset,state:function(){return{density:density,filtersOpen:filtersOpen,resultPage:resultPage,sourcePage:resultPage&&resultPage.source||''};},_test:{baseRows:baseRows,filteredRows:filteredRows,counts:counts,sourceOf:srcOf,fieldOf:fieldOf,winnerOf:winnerOf,lifecycleOf:lifeOf,decorate:decorate,schedule:schedule,categoryMeta:categoryMeta,openResultPage:openResultPage,closeResultPage:closeResultPage}};
window.PSTOpportunitiesDeskV1=window.PSTOpportunitiesMindmapV6=window.PSTOpportunitiesMindmapV5=window.PSTOpportunitiesMindmapV4=exposed;
})();
