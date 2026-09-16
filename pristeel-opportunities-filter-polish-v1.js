/* PRISTEEL Opportunities Mindmap v4
 * Final presentation/filter owner for the visible Opportunities surface.
 * Reuses Project-Centric Workflow state/actions; adds no database writes and sends nothing.
 */
(function(){
'use strict';
if(window.__pstOpportunitiesMindmapV4)return;
window.__pstOpportunitiesMindmapV4=true;
window.__pstOpportunitiesFilterPolishV1=true;

var VERSION='20260916-mindmap4';
var view='mindmap',field='all',filtersOpen=true,api=null,state=null,observer=null,scheduled=false;
var SOURCE_ORDER=['TED','KRPP','APP_AL','MCA_KOSOVO','KCF','RCF','EBRD_ECEPP','WORLD_BANK','UNGM','UNDP_KOSOVO','EU_OFFICE_KOSOVO'];
var SOURCE_LABELS={TED:'TED',KRPP:'KRPP',APP_AL:'APP',MCA_KOSOVO:'MCA Kosovo',KCF:'KCF',RCF:'RCF',EBRD_ECEPP:'EBRD',WORLD_BANK:'World Bank',UNGM:'UNGM',UNDP_KOSOVO:'UNDP Kosovo',EU_OFFICE_KOSOVO:'EU Office Kosovo'};
var SOURCE_ICONS={TED:'★',KRPP:'▣',APP_AL:'▤',MCA_KOSOVO:'◆',KCF:'◇',RCF:'↗',EBRD_ECEPP:'▥',WORLD_BANK:'◎',UNGM:'◉',UNDP_KOSOVO:'◌',EU_OFFICE_KOSOVO:'✦'};
var FIELDS=[
 {id:'construction',label:'Ndërtim',icon:'▦',re:/\b(construction|ndertim|ndërtim|building|buildings|bau|hochbau|steel|çelik|celik|metal|structur|konstrukt|hall|roof|çati|cati|facade|fasad|weld|fabricat|montag|renov|rehabilit)/i},
 {id:'infrastructure',label:'Infrastrukturë',icon:'╱╲',re:/\b(infrastruct|road|rrug|highway|motorway|rail|hekurudh|bridge|urë|ure|tunnel|airport|port|water|ujësjell|ujesjell|sewer|kanaliz|pipeline|transport network)/i},
 {id:'energy',label:'Energji',icon:'ϟ',re:/\b(energy|energji|electric|elektr|power|solar|photovolta|\bpv\b|wind|battery|bess|substation|transformer|grid|transmission|distribution)/i},
 {id:'supply',label:'Furnizim',icon:'⬡',re:/\b(supply|furniz|procurement|purchase|blerje|material|equipment|pajis|delivery|dorëzim|dorezim|goods|product)/i},
 {id:'services',label:'Shërbime',icon:'♙',re:/\b(service|shërbim|sherbim|consult|design|projektim|engineering|inxhinier|supervision|mbikëqyr|mbikeqyr|study|audit|maintenance|mirëmbajt|mirembajt)/i},
 {id:'other',label:'Të tjera',icon:'•••',re:null}
];
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function norm(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function rowText(r){var p=r&&r.payload&&typeof r.payload==='object'?r.payload:{};return [r&&r.title,r&&r.description,r&&r.authority,r&&r.procurement_no,r&&r.publication_no,r&&r.cpv,r&&r.cpv_code,A(r&&r.match_reasons).join(' '),p.title,p.description,p.cpv,p.cpv_code,p.cpv_description,p.scope,p.category].map(S).join(' ');}
function classifyField(r){var t=rowText(r);for(var i=0;i<FIELDS.length-1;i++)if(FIELDS[i].re.test(t))return FIELDS[i].id;return'other';}
function fieldMeta(id){return FIELDS.find(function(x){return x.id===id;})||FIELDS[FIELDS.length-1];}
function currentApi(){api=window.PSTProjectCentricWorkflowV1||api;state=api&&api._state||state;return api;}
function sourceOf(r){var x=currentApi(),fn=x&&x._test&&x._test.tenderSource;return fn?fn(r):S(r&&r.source_key||r&&r.payload&&r.payload.source||'KRPP').toUpperCase();}
function lifecycleOf(r){var x=currentApi(),fn=x&&x._test&&x._test.opportunityLifecycle,l=fn?fn(r):'new';return l==='draft'?'waiting':l;}
function baseRows(){var x=currentApi();if(!x||!state)return[];var rows=A(state.rows),test=x._test||{};if(typeof test.tenderVisible==='function')rows=rows.filter(test.tenderVisible);if(typeof test.dedupeOpportunities==='function')rows=test.dedupeOpportunities(rows);return rows;}
function currentRows(){var x=currentApi();if(!x)return[];try{if(x._test&&typeof x._test.opportunityRows==='function')return A(x._test.opportunityRows());}catch(e){}return baseRows();}
function counts(){var rows=baseRows(),life={new:0,waiting:0,replied:0,all:rows.length},sources={},fields={};SOURCE_ORDER.forEach(function(k){sources[k]=0;});FIELDS.forEach(function(f){fields[f.id]=0;});rows.forEach(function(r){var l=lifecycleOf(r),src=sourceOf(r),f=classifyField(r);if(life[l]!=null)life[l]++;if(sources[src]!=null)sources[src]++;if(fields[f]!=null)fields[f]++;});return{life:life,sources:sources,fields:fields,total:rows.length};}
function loadWaitingBridge(){if(window.__pstOpportunitiesWaitingBridgeV1||document.querySelector('script[data-pst-opportunities-waiting-bridge]'))return;var b=document.createElement('script');b.src='pristeel-opportunities-waiting-bridge-v1.js?v=20260913-waiting1';b.defer=true;b.setAttribute('data-pst-opportunities-waiting-bridge','1');b.onload=function(){schedule();};document.head.appendChild(b);}
function installCss(){var old=document.getElementById('pst-opportunities-filter-polish-v1-css');if(old)old.remove();var s=document.createElement('style');s.id='pst-opportunities-filter-polish-v1-css';s.textContent=`
#page-kek-tenders .pst-kek-head{display:none!important}
#page-kek-tenders #pst-opportunities-focus{max-width:1460px!important;margin:0 auto!important;padding:18px 20px 28px!important;border:0!important;background:transparent!important;box-shadow:none!important}
#pst-opportunities-focus>header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:18px!important;margin:0 0 10px!important;padding:0!important}
.pst-opp-v4-head-left{display:flex;align-items:center;gap:18px;min-width:0}.pst-opp-v4-back{height:42px;padding:0 15px;border:1px solid #E2D5D0;border-radius:13px;background:#fff;color:#A45E4F;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}.pst-opp-v4-back:hover{background:#FFF8F5;border-color:#D6B7AC}.pst-opp-v4-title span{display:none}.pst-opp-v4-title h2{margin:0!important;font-size:25px!important;letter-spacing:-.03em!important;color:#203640!important}.pst-opp-v4-title p{margin:3px 0 0!important;font-size:11px!important;color:#74868D!important;max-width:760px!important}.pst-opp-v4-view{display:inline-flex;padding:3px;border:1px solid #DEE8EB;border-radius:14px;background:#F8FBFC}.pst-opp-v4-view button{height:34px;padding:0 13px;border:0;border-radius:10px;background:transparent;color:#657982;font-size:11px;font-weight:750;cursor:pointer}.pst-opp-v4-view button.on{background:#E8F4F8;color:#2F7893;box-shadow:0 2px 7px rgba(47,120,147,.08)}
#pst-pcw-opportunity-tools{display:flex!important;align-items:center!important;gap:10px!important;margin:10px 0 12px!important}#pst-pcw-opportunity-tools label{height:48px!important;flex:1!important;display:flex!important;align-items:center!important;gap:10px!important;padding:0 14px!important;border:1px solid #DCE7EB!important;border-radius:15px!important;background:#fff!important;box-shadow:0 2px 8px rgba(38,69,82,.025)!important}#pst-pcw-opportunity-tools label>span{font-size:0!important}#pst-pcw-opportunity-tools label>span:before{content:'⌕';font-size:20px;color:#5E7C89}#pst-pcw-opportunity-search{height:44px!important;flex:1!important;border:0!important;outline:0!important;background:transparent!important;font-size:13px!important;color:#2D4651!important}.pst-opp-v4-filter-toggle{height:48px;padding:0 16px;border:1px solid #DCE7EB;border-radius:15px;background:#fff;color:#385461;font-size:11px;font-weight:800;cursor:pointer}.pst-opp-v4-filter-toggle.on{background:#EDF7FA;border-color:#A8CDD8;color:#2F7893}
#pst-pcw-lifecycle-tabs,#pst-pcw-opportunity-tabs{display:none!important}
#pst-opp-v4-map{