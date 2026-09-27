/* PRISTEEL Representations v1
 * Dedicated manufacturer-representation pipeline.
 * No Project, Partner, Supplier, Contact, contract or email side effects.
 */
(function(){
'use strict';
if(window.__pstRepresentationsV1)return;
window.__pstRepresentationsV1=true;

var TABLE='pppp_representation_targets_v1';
var REL_TABLE='pppp_representation_relationships_v1';
var STAGES=[
 ['found','Gjetur'],['verified','Verifikuar'],['contact_ready','Kontakt gati'],
 ['draft_ready','Draft gati'],['contacted','Kontaktuar'],['replied','Përgjigjur'],
 ['meeting','Takim'],['negotiation','Negocim'],['pilot','Pilot'],
 ['represented','Përfaqësojmë'],['closed','Mbyllur']
];
var PRESENCE=[
 ['unknown','E panjohur'],['none_found','Nuk u gjet prani'],['indirect','Indirekte'],
 ['distributor','Distributor'],['representative','Përfaqësues'],['own_office','Zyrë e vet']
];
var MODELS=[
 ['unknown','E panjohur'],['commercial_agent','Agjent komercial'],
 ['market_development_partner','Partner për zhvillim tregu'],
 ['distributor_no_stock','Distributor pa stock'],['distributor_with_stock','Distributor me stock'],
 ['project_based_representation','Përfaqësim sipas projektit']
];
var CAPITAL=[['unknown','E panjohur'],['good','E mirë'],['review','Për review'],['poor','E dobët']];
var TARGET_TYPES=[['lead_epc_candidate','Lead Consortium / EPC Candidate'],['oem_specialist_partner','OEM / Specialist Partner'],['representation','Representation']];
var REL_TYPES=[['joint_venture','JV'],['consortium','Konsorcium'],['subcontractor','Nënkontraktor'],['supplier','Furnitor'],['representative','Përfaqësues'],['distributor','Distributor'],['implementation_partner','Partner implementimi'],['local_partner','Partner lokal'],['other','Tjetër'],['unknown','E panjohur']];
var REL_STATUS=[['current','Aktuale'],['historical','Historike'],['unknown','E panjohur']];
var REL_VERIFY=[['unknown','E panjohur'],['review','Për verifikim'],['verified','E verifikuar']];
var state={rows:[],relationships:[],opportunities:[],opportunityLinks:[],loaded:false,loading:false,opportunitiesLoaded:false,opportunitiesLoading:false,error:'',selected:'',view:'list',query:'',stage:'',country:'',sector:'',capital:'',sort:'priority',editor:null,draftBusy:{},draftResult:{}};

function S(v){return String(v==null?'':v)}
function A(v){return Array.isArray(v)?v:[]}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
function D(v){if(!v)return'—';try{return new Date(v).toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'})}catch(e){return S(v)}}
function stageLabel(v){var x=STAGES.find(function(i){return i[0]===v});return x?x[1]:S(v||'—')}
function capitalLabel(v){var x=CAPITAL.find(function(i){return i[0]===v});return x?x[1]:S(v||'—')}
function opts(items,value,blank){
 var out=blank?'<option value="">'+E(blank)+'</option>':'';
 return out+items.map(function(i){return'<option value="'+E(i[0])+'"'+(i[0]===value?' selected':'')+'>'+E(i[1])+'</option>'}).join('');
}
function uniq(key){return Array.from(new Set(state.rows.map(function(r){return S(r[key]).trim()}).filter(Boolean))).sort(function(a,b){return a.localeCompare(b,'sq')})}
function selected(){return state.rows.find(function(r){return S(r.id)===S(state.selected)})||null}
function relationshipsFor(targetId){return state.relationships.filter(function(x){return !x.archived_at&&S(x.target_id)===S(targetId)})}
function relLabel(items,v){var x=items.find(function(i){return i[0]===v});return x?x[1]:S(v||'—')}
function boolLabel(v){return v===true?'Po':v===false?'Jo':'E panjohur'}
function parseBool(v){return v==='true'?true:v==='false'?false:null}
function val(id){var e=document.getElementById(id);return e?S(e.value).trim():''}
function nullable(v){return v===''?null:v}
function slug(v){return N(v).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)}
function normalizeDomain(v){return S(v).trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split(/[\/#:?]/)[0]}
function sourceKeyFrom(payload){var country=slug(payload.country||'xx')||'xx',domain=normalizeDomain(payload.company_domain||payload.company_website);return 'rep:'+country+':'+(domain||slug(payload.company_name)||String(Date.now()))}
function toast(msg,bad){
 var old=document.getElementById('pst-rep-toast');if(old)old.remove();
 var x=document.createElement('div');x.id='pst-rep-toast';x.className=bad?'bad':'ok';x.textContent=msg;document.body.appendChild(x);
 setTimeout(function(){x.remove()},4200);
}
function hideOthers(page){document.querySelectorAll('.page').forEach(function(p){if(p===page)return;p.classList.remove('active');p.style.display='none'})}
function setRoute(active){try{if(active){if(location.hash!=='#perfaqesime')history.pushState({pst:'perfaqesime'},'',location.pathname+location.search+'#perfaqesime')}else if(location.hash==='#perfaqesime')history.replaceState({},'',location.pathname+location.search)}catch(e){}}
function css(){
 if(document.getElementById('pst-representations-v1-css'))return;
 var s=document.createElement('style');s.id='pst-representations-v1-css';s.textContent=`
#page-representations{--rep:#496f62;--rep-dark:#274c40;--rep-soft:#edf5f1;--rep-line:#dce7e2;--rep-text:#243b35}
body:has(#page-representations.active) .topbar,body:has(#page-representations.active) #pst-global-page-backbar{display:none!important}
.pst-rep-page{max-width:1540px;margin:0 auto;padding:20px 22px 50px;color:var(--rep-text)}
.pst-rep-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.pst-rep-eye{font-size:9px;font-weight:850;letter-spacing:.14em;text-transform:uppercase;color:#6f857e}.pst-rep-head h1{margin:4px 0 3px;font-size:30px;letter-spacing:-.6px}.pst-rep-head p{margin:0;color:#70817c;font-size:11px}.pst-rep-actions{display:flex;gap:8px;flex-wrap:wrap}.pst-rep-btn{border:1px solid var(--rep-line);background:#fff;color:var(--rep-dark);border-radius:10px;padding:9px 12px;font-size:10.5px;font-weight:800;cursor:pointer}.pst-rep-btn.primary{background:var(--rep);border-color:var(--rep);color:#fff}.pst-rep-btn.danger{color:#9b423b;border-color:#e7c9c5}.pst-rep-btn:disabled{opacity:.5;cursor:not-allowed}
.pst-rep-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.pst-rep-kpi{background:#fff;border:1px solid var(--rep-line);border-radius:13px;padding:13px 15px}.pst-rep-kpi b{display:block;font-size:23px;color:var(--rep-dark)}.pst-rep-kpi span{font-size:9.5px;color:#7b8b86}
.pst-rep-controls{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px;position:relative}.pst-rep-control{position:relative}.pst-rep-control-toggle{min-width:145px;display:flex;align-items:center;justify-content:space-between;gap:12px}.pst-rep-control-toggle span{font-size:9px;font-weight:650;color:#758780}.pst-rep-control-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:45;min-width:250px;max-height:68vh;overflow:auto;background:#fff;border:1px solid var(--rep-line);border-radius:12px;padding:8px;box-shadow:0 14px 38px rgba(36,59,53,.14)}.pst-rep-control-menu[hidden]{display:none!important}.pst-rep-control-menu.filters{min-width:330px}.pst-rep-pipeline{display:grid;gap:5px}.pst-rep-pipe{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--rep-line);background:#fff;border-radius:9px;padding:8px 10px;font-size:9.5px;color:#61746e;cursor:pointer;text-align:left}.pst-rep-pipe.on{background:var(--rep-soft);border-color:#acc6bb;color:var(--rep-dark);font-weight:850}.pst-rep-pipe b{margin-left:5px}.pst-rep-toolbar{display:grid;grid-template-columns:1fr;gap:7px}.pst-rep-toolbar input,.pst-rep-toolbar select{height:38px;border:1px solid var(--rep-line);border-radius:10px;background:#fff;padding:0 11px;font-size:10.5px;color:#425952}
.pst-rep-shell{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}.pst-rep-card{border:1px solid var(--rep-line);background:#fff;border-radius:14px;overflow:hidden}.pst-rep-table-head,.pst-rep-row{display:grid;grid-template-columns:minmax(190px,1.25fr) 90px minmax(125px,.85fr) 120px 64px minmax(150px,1fr) 92px;gap:10px;align-items:center;padding:11px 13px}.pst-rep-table-head{background:#f8faf9;color:#87968f;font-size:8px;text-transform:uppercase;font-weight:850;letter-spacing:.05em}.pst-rep-row{border-top:1px solid #edf1ef;cursor:pointer;font-size:10.5px;color:#50645e}.pst-rep-row:hover,.pst-rep-row.on{background:#f3f8f5}.pst-rep-row.on{box-shadow:inset 3px 0 0 var(--rep)}.pst-rep-company b{display:block;color:#243e36;font-size:12px}.pst-rep-company small{display:block;color:#8a9994;font-size:9px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pst-rep-stage,.pst-rep-fit{display:inline-flex;border-radius:999px;padding:4px 7px;background:#edf4f1;font-size:8.8px;font-weight:800;color:#45685d}.pst-rep-fit.poor,.pst-rep-fit.review{background:#fff1df;color:#8a6327}.pst-rep-priority{font-size:16px;font-weight:850;color:#365c50}.pst-rep-next{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pst-rep-empty{padding:38px 20px;text-align:center;color:#7c8c87;font-size:11px}.pst-rep-empty b{display:block;font-size:14px;color:#425a52;margin-bottom:5px}
.pst-rep-detail{position:sticky;top:12px}.pst-rep-detail-head{padding:16px 16px 13px;border-bottom:1px solid var(--rep-line)}.pst-rep-detail-head h2{margin:0;font-size:19px}.pst-rep-detail-head p{margin:4px 0 0;color:#7b8b86;font-size:10px}.pst-rep-detail-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.pst-rep-warn{margin:12px 14px 0;padding:10px 11px;border:1px solid #edcda4;background:#fff7eb;border-radius:10px;color:#7e5c2e;font-size:10px;line-height:1.45}.pst-rep-section{padding:13px 16px;border-top:1px solid #edf1ef}.pst-rep-section h3{margin:0 0 9px;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#87968f}.pst-rep-facts{display:grid;grid-template-columns:115px 1fr;gap:7px 9px;font-size:10.5px}.pst-rep-facts span:nth-child(odd){color:#87958f}.pst-rep-facts span:nth-child(even){color:#354d45;font-weight:650;overflow-wrap:anywhere}.pst-rep-text{font-size:11px;line-height:1.5;color:#536861;white-space:pre-wrap}.pst-rep-rel-list{display:grid;gap:7px;margin-bottom:9px}.pst-rep-rel{border:1px solid var(--rep-line);border-radius:10px;padding:9px 10px;background:#fbfcfc}.pst-rep-rel b{display:block;font-size:10.5px;color:#304a42}.pst-rep-rel small{display:block;margin-top:3px;color:#798b84;font-size:9px;line-height:1.4}.pst-rep-rel .verified{color:#2f725b;font-weight:800}.pst-rep-rel .review{color:#9a6d22;font-weight:800}.pst-rep-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pst-rep-quick label{font-size:8.5px;text-transform:uppercase;color:#84938e}.pst-rep-quick select,.pst-rep-quick input{width:100%;margin-top:4px;border:1px solid var(--rep-line);border-radius:8px;padding:7px 8px;font-size:10px}
.pst-rep-modal{position:fixed;inset:0;z-index:9200;background:rgba(20,35,31,.34);display:grid;place-items:center;padding:18px}.pst-rep-dialog{width:min(1040px,100%);max-height:94vh;overflow:auto;background:#f8faf9;border-radius:16px;box-shadow:0 24px 80px rgba(15,31,26,.24)}.pst-rep-dialog-head{position:sticky;top:0;z-index:2;background:#fff;border-bottom:1px solid var(--rep-line);padding:14px 17px;display:flex;justify-content:space-between;align-items:center}.pst-rep-dialog-head h2{margin:0;font-size:18px}.pst-rep-form{padding:15px}.pst-rep-form-section{background:#fff;border:1px solid var(--rep-line);border-radius:12px;padding:13px;margin-bottom:10px}.pst-rep-form-section h3{margin:0 0 10px;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#6e827a}.pst-rep-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.pst-rep-field.full{grid-column:1/-1}.pst-rep-field.two{grid-column:span 2}.pst-rep-field label{display:block;margin-bottom:4px;font-size:8.5px;text-transform:uppercase;color:#81918b;font-weight:750}.pst-rep-field input,.pst-rep-field select,.pst-rep-field textarea{width:100%;box-sizing:border-box;border:1px solid var(--rep-line);border-radius:8px;background:#fff;padding:8px 9px;color:#334a42;font:11px/1.4 Inter,Arial,sans-serif}.pst-rep-field textarea{min-height:72px;resize:vertical}.pst-rep-form-foot{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:8px;background:#f8faf9;padding:10px 0 0}
#pst-rep-toast{position:fixed;left:50%;bottom:26px;z-index:9500;transform:translateX(-50%);border-radius:10px;padding:11px 15px;color:#fff;font-size:11px;font-weight:750;box-shadow:0 10px 35px rgba(20,30,26,.22)}#pst-rep-toast.ok{background:#355f50}#pst-rep-toast.bad{background:#9b423b}
#pst-representations-home-v1{margin:0;min-width:0}.pst-rep-home{width:100%;height:100%;border:1px solid #DDE5E6;background:#F3F8F5;border-radius:15px;padding:0;text-align:left;display:block;cursor:pointer;overflow:hidden;color:#33474F}.pst-rep-home:hover,.pst-rep-home:focus-visible{border-color:#AFCED8;box-shadow:0 8px 22px rgba(48,91,107,.09);outline:0}.pst-rep-home-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px 12px}.pst-rep-home-eye{font-size:8px;letter-spacing:.11em;text-transform:uppercase;font-weight:850;color:#668177}.pst-rep-home-title{font-size:14px;font-weight:750;color:#2C4149;margin-top:4px}.pst-rep-home-sub{font-size:10px;color:#748780;line-height:1.4;margin-top:3px}.pst-rep-home-open{color:#367A91;font-size:9.5px;font-weight:750;white-space:nowrap}.pst-rep-home-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #DDE5E6}.pst-rep-home-stat{padding:11px 8px;text-align:center;border-right:1px solid #DDE5E6}.pst-rep-home-stat:last-child{border-right:0}.pst-rep-home-stat b{display:block;font-size:17px;color:#345e50}.pst-rep-home-stat span{display:block;margin-top:3px;font-size:7.8px;color:#83928d;text-transform:uppercase;font-weight:700}
@media(max-width:1100px){.pst-rep-shell{grid-template-columns:1fr}.pst-rep-detail{position:static}.pst-rep-table-head,.pst-rep-row{grid-template-columns:minmax(180px,1.3fr) 80px 110px 105px 60px minmax(130px,.9fr)}.pst-rep-table-head>*:last-child,.pst-rep-row>*:last-child{display:none}}
@media(max-width:760px){.pst-rep-page{padding:12px 0 38px}.pst-rep-head{padding:0 12px;display:block}.pst-rep-head h1{font-size:24px}.pst-rep-actions{margin-top:12px}.pst-rep-kpis{grid-template-columns:1fr 1fr;padding:0 10px}.pst-rep-controls{padding:0 10px}.pst-rep-control{flex:1 1 0}.pst-rep-control-toggle{width:100%;min-width:0}.pst-rep-control-menu{position:static;width:100%;min-width:0;max-height:none;margin-top:6px;box-shadow:none}.pst-rep-control-menu.filters{min-width:0}.pst-rep-card{border-radius:0;border-left:0;border-right:0}.pst-rep-table-head{display:none}.pst-rep-row{grid-template-columns:1fr auto;padding:13px}.pst-rep-row>*:nth-child(n+3){display:none}.pst-rep-grid{grid-template-columns:1fr}.pst-rep-field.two,.pst-rep-field.full{grid-column:auto}.pst-rep-modal{padding:0}.pst-rep-dialog{height:100vh;max-height:100vh;border-radius:0}.pst-rep-home-stats{grid-template-columns:repeat(4,1fr)}}
`;document.head.appendChild(s);
}
function dossierCss(){
 if(document.getElementById('pst-representations-dossier-v2-css'))return;
 var s=document.createElement('style');s.id='pst-representations-dossier-v2-css';s.textContent=`
#page-representations .pst-rep-page{max-width:1660px;padding-bottom:64px}
#page-representations .pst-rep-head{align-items:center;margin-bottom:14px}
#page-representations .pst-rep-head p{font-size:12px;max-width:880px;line-height:1.5}
#page-representations .pst-rep-actions .pst-rep-btn{min-height:38px;display:inline-flex;align-items:center;justify-content:center}
#page-representations .pst-rep-list-view[hidden],#page-representations .pst-rep-profile-view[hidden]{display:none!important}
#page-representations .pst-rep-index{overflow:visible}
#page-representations .pst-rep-table-head,#page-representations .pst-rep-row{grid-template-columns:minmax(210px,1.2fr) 72px minmax(190px,1.15fr) minmax(210px,1.25fr) minmax(220px,1.35fr) minmax(165px,.9fr) 120px}
#page-representations .pst-rep-table-head{padding:12px 15px;font-size:8.5px}
#page-representations .pst-rep-row{position:relative;padding:14px 15px;min-height:72px;align-items:center;transition:background .14s ease,transform .14s ease}
#page-representations .pst-rep-row:hover{background:#f3f8f5;transform:translateY(-1px)}
#page-representations .pst-rep-row:after{content:'›';position:absolute;right:9px;top:50%;transform:translateY(-50%);font-size:20px;color:#86a198}
#page-representations .pst-rep-row>span:last-child{padding-right:12px}
#page-representations .pst-rep-company b{font-size:13px}.pst-rep-company small{font-size:9.5px}
#page-representations .pst-rep-cell-title{display:block;font-size:10.5px;font-weight:760;color:#344f46;line-height:1.35}
#page-representations .pst-rep-cell-sub{display:block;margin-top:4px;font-size:9px;color:#7c8e87;line-height:1.35}
#page-representations .pst-rep-chip{display:inline-flex;align-items:center;min-height:24px;border-radius:999px;padding:0 8px;background:#edf5f1;color:#365e51;font-size:8.7px;font-weight:820;white-space:nowrap}
#page-representations .pst-rep-chip.warn{background:#fff3e1;color:#8c6327}#page-representations .pst-rep-chip.neutral{background:#f0f2f3;color:#61706d}
#page-representations .pst-rep-profile-view{width:100%}
#page-representations .pst-dossier{display:grid;gap:14px;width:100%}
#page-representations .pst-dossier-nav{display:flex;align-items:center;justify-content:space-between;gap:12px}
#page-representations .pst-dossier-nav small{font-size:9px;color:#7d8e88;text-transform:uppercase;letter-spacing:.09em;font-weight:800}
#page-representations .pst-dossier-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:22px 24px;border:1px solid var(--rep-line);border-radius:16px;background:linear-gradient(135deg,#fff 0%,#f5faf7 100%)}
#page-representations .pst-dossier-eye{font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:850;color:#6b8279}
#page-representations .pst-dossier-hero h2{margin:6px 0 4px;font-size:30px;line-height:1.08;color:#1f3b32;letter-spacing:-.5px}
#page-representations .pst-dossier-meta{font-size:11px;color:#687d75;line-height:1.5}
#page-representations .pst-dossier-meta a{color:#2f6d5a;text-decoration:none;font-weight:760}
#page-representations .pst-dossier-badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
#page-representations .pst-dossier-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;max-width:520px}
#page-representations .pst-dossier-actions .pst-rep-btn{min-height:38px}
#page-representations .pst-dossier-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px}
#page-representations .pst-dossier-card{grid-column:span 4;border:1px solid var(--rep-line);border-radius:15px;background:#fff;padding:17px 18px;min-width:0}
#page-representations .pst-dossier-card.span-6{grid-column:span 6}#page-representations .pst-dossier-card.span-8{grid-column:span 8}#page-representations .pst-dossier-card.span-12{grid-column:1/-1}
#page-representations .pst-dossier-card h3{margin:0 0 10px;font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:#7b8f87}
#page-representations .pst-dossier-card h4{margin:0 0 6px;font-size:13px;color:#28483d}
#page-representations .pst-dossier-card p{margin:0;color:#526861;font-size:11px;line-height:1.55}
#page-representations .pst-dossier-card p+p{margin-top:9px}
#page-representations .pst-dossier-highlight{font-size:12px!important;color:#29493e!important;font-weight:690}
#page-representations .pst-dossier-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}
#page-representations .pst-dossier-tag{display:inline-flex;padding:5px 8px;border-radius:8px;background:#f1f6f3;color:#45675d;font-size:9px;font-weight:720}
#page-representations .pst-dossier-list{margin:0;padding-left:17px;color:#536861;font-size:10.8px;line-height:1.55}
#page-representations .pst-dossier-list li+li{margin-top:5px}
#page-representations .pst-dossier-split{display:grid;grid-template-columns:1fr 1fr;gap:12px}
#page-representations .pst-dossier-subbox{border:1px solid #e8efeb;border-radius:11px;background:#fbfcfb;padding:11px 12px}
#page-representations .pst-dossier-subbox b{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#7d8e88;margin-bottom:5px}
#page-representations .pst-dossier-subbox span{display:block;color:#405a51;font-size:10.5px;line-height:1.45}
#page-representations .pst-dossier-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:13px}
#page-representations .pst-dossier-metric{border:1px solid #e5ede9;border-radius:11px;padding:10px 11px;background:#fbfcfb}
#page-representations .pst-dossier-metric span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#87968f}
#page-representations .pst-dossier-metric b{display:block;margin-top:5px;font-size:12px;color:#29483e;line-height:1.35}
#page-representations .pst-dossier-unknowns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
#page-representations .pst-dossier-unknown{border-left:3px solid #d8b06f;background:#fff8ed;border-radius:8px;padding:9px 10px}
#page-representations .pst-dossier-unknown b{display:block;font-size:9px;color:#785822}#page-representations .pst-dossier-unknown span{display:block;margin-top:3px;font-size:9px;color:#8b7351;line-height:1.35}
#page-representations .pst-dossier-contact{display:grid;grid-template-columns:115px 1fr;gap:8px 10px;font-size:10.5px}
#page-representations .pst-dossier-contact span:nth-child(odd){color:#84948e}#page-representations .pst-dossier-contact span:nth-child(even){color:#344f46;font-weight:700;overflow-wrap:anywhere}
#page-representations .pst-dossier-contact a{color:#2a6e58;text-decoration:none}
#page-representations .pst-dossier-pitch{border-left:3px solid #6f9b89;background:#f4f9f6;border-radius:10px;padding:11px 12px;color:#405b51;font-size:10.7px;line-height:1.55}
#page-representations .pst-dossier-rel{display:grid;grid-template-columns:minmax(160px,1fr) 120px 120px minmax(220px,1.6fr);gap:10px;padding:10px 0;border-top:1px solid #edf1ef;font-size:10px;color:#52675f}
#page-representations .pst-dossier-rel:first-child{border-top:0}#page-representations .pst-dossier-rel b{color:#304c42}
#page-representations .pst-dossier-compact{display:grid;grid-template-columns:180px 1fr;gap:8px 12px;font-size:10.2px}
#page-representations .pst-dossier-compact span:nth-child(odd){color:#83938d}#page-representations .pst-dossier-compact span:nth-child(even){color:#354f46;font-weight:650;line-height:1.45;overflow-wrap:anywhere}
#page-representations .pst-dossier-source{display:inline-block;margin-top:8px;color:#2d6f5a;font-size:9.5px;font-weight:750;text-decoration:none}
#page-representations .pst-dossier-empty{color:#81918b;font-size:10.5px;line-height:1.5}
#page-representations .pst-dossier .pst-rep-quick{grid-template-columns:180px 180px minmax(300px,1fr);align-items:end}
#page-representations .pst-dossier .pst-rep-quick label:last-child{grid-column:auto!important}
@media(max-width:1180px){
 #page-representations .pst-rep-table-head,#page-representations .pst-rep-row{grid-template-columns:minmax(190px,1.2fr) 65px minmax(180px,1fr) minmax(180px,1fr) minmax(200px,1.2fr) 150px}
 #page-representations .pst-rep-table-head>*:last-child,#page-representations .pst-rep-row>*:last-child{display:none}
 #page-representations .pst-dossier-card{grid-column:span 6}#page-representations .pst-dossier-card.span-8{grid-column:span 12}
}
@media(max-width:760px){
 #page-representations .pst-rep-head{align-items:flex-start}
 #page-representations .pst-rep-table-head{display:none}
 #page-representations .pst-rep-row{display:grid;grid-template-columns:1fr!important;padding:14px 34px 14px 14px;gap:7px}
 #page-representations .pst-rep-row>*{display:block!important}
 #page-representations .pst-dossier-hero{display:block;padding:18px 15px}#page-representations .pst-dossier-hero h2{font-size:24px}
 #page-representations .pst-dossier-actions{justify-content:flex-start;margin-top:15px;max-width:none}
 #page-representations .pst-dossier-grid{display:block}#page-representations .pst-dossier-card{margin-bottom:10px}
 #page-representations .pst-dossier-split,#page-representations .pst-dossier-metrics,#page-representations .pst-dossier-unknowns{grid-template-columns:1fr}
 #page-representations .pst-dossier .pst-rep-quick{grid-template-columns:1fr}#page-representations .pst-dossier .pst-rep-quick label:last-child{grid-column:1!important}
 #page-representations .pst-dossier-rel{grid-template-columns:1fr;gap:3px}
 #page-representations .pst-dossier-compact{grid-template-columns:115px 1fr}
}
`;document.head.appendChild(s);
}
function ensurePage(){
 css();dossierCss();var p=document.getElementById('page-representations');if(p)return p;
 var host=document.querySelector('.content')||document.body;p=document.createElement('div');p.id='page-representations';p.className='page';p.style.display='none';
 p.innerHTML='<div class="pst-rep-page"><header class="pst-rep-head"><div><div class="pst-rep-eye">EPC · OEM · PARTNERË SPECIALISTË · PËRFAQËSIME</div><h1>Përfaqësime</h1><p>Pipeline për partnerë ndërkombëtarë dhe mundësi projekti. Asnjë email nuk krijohet ose dërgohet automatikisht.</p></div><div class="pst-rep-actions"><button class="pst-rep-btn" data-rep-back>← Kthehu</button><button class="pst-rep-btn primary" data-rep-new>+ Target i ri</button></div></header><div class="pst-rep-kpis" data-rep-kpis></div><div class="pst-rep-controls"><div class="pst-rep-control"><button class="pst-rep-btn pst-rep-control-toggle" type="button" data-rep-toggle="pipeline" aria-expanded="false">Fazat <span data-rep-pipeline-summary>Të gjitha</span></button><div class="pst-rep-control-menu" data-rep-menu="pipeline" hidden><div class="pst-rep-pipeline" data-rep-pipeline></div></div></div><div class="pst-rep-control"><button class="pst-rep-btn pst-rep-control-toggle" type="button" data-rep-toggle="filters" aria-expanded="false">Filtra <span data-rep-filter-summary>Kërkim & renditje</span></button><div class="pst-rep-control-menu filters" data-rep-menu="filters" hidden><div class="pst-rep-toolbar"><input data-rep-search type="search" placeholder="Kërko kompani ose domain…"><select data-rep-country></select><select data-rep-sector></select><select data-rep-capital></select><select data-rep-sort><option value="priority">Prioriteti më i lartë</option><option value="updated">Përditësuar së fundi</option><option value="due">Next action më afër</option><option value="company">Kompania A–Z</option></select></div></div></div></div><div class="pst-rep-list-view" data-rep-list-view><main class="pst-rep-card pst-rep-index"><div class="pst-rep-table-head"><span>Kompania</span><span>Vendi</span><span>Aftësitë</span><span>Kosovë / Ballkan</span><span>Fit për KOSTT</span><span>Kontakti</span><span>Statusi</span></div><div data-rep-list></div></main></div><section class="pst-rep-profile-view" data-rep-profile-view hidden><div data-rep-detail></div></section></div>';
 host.appendChild(p);
 p.querySelector('[data-rep-back]').onclick=back;
 p.querySelector('[data-rep-new]').onclick=function(){openEditor(null)};
 p.querySelectorAll('[data-rep-toggle]').forEach(function(btn){btn.onclick=function(){var name=btn.getAttribute('data-rep-toggle'),menu=p.querySelector('[data-rep-menu="'+name+'"]'),opening=menu&&menu.hidden;p.querySelectorAll('[data-rep-menu]').forEach(function(x){x.hidden=true});p.querySelectorAll('[data-rep-toggle]').forEach(function(x){x.setAttribute('aria-expanded','false')});if(menu&&opening){menu.hidden=false;btn.setAttribute('aria-expanded','true')}}});
 p.querySelector('[data-rep-search]').oninput=function(){state.query=this.value;render()};
 [['country','[data-rep-country]'],['sector','[data-rep-sector]'],['capital','[data-rep-capital]'],['sort','[data-rep-sort]']].forEach(function(x){p.querySelector(x[1]).onchange=function(){state[x[0]]=this.value;render()}});
 p.querySelector('[data-rep-list]').addEventListener('click',function(e){var r=e.target.closest('[data-rep-id]');if(!r)return;state.selected=r.dataset.repId;state.view='profile';render();try{window.scrollTo({top:0,behavior:'smooth'})}catch(_){try{window.scrollTo(0,0)}catch(__){}}});
 p.querySelector('[data-rep-pipeline]').addEventListener('click',function(e){var b=e.target.closest('[data-rep-pipe]');if(!b)return;state.stage=b.dataset.repPipe;var menu=p.querySelector('[data-rep-menu="pipeline"]'),toggle=p.querySelector('[data-rep-toggle="pipeline"]');if(menu)menu.hidden=true;if(toggle)toggle.setAttribute('aria-expanded','false');render()});
 p.querySelector('[data-rep-detail]').addEventListener('click',detailClick);
 p.querySelector('[data-rep-detail]').addEventListener('change',detailChange);
 return p;
}
function activeRows(){return state.rows.filter(function(r){return !r.archived_at})}
function filtered(){
 var q=N(state.query),rows=state.rows.filter(function(r){
  if(r.archived_at)return false;
  if(state.stage&&r.stage!==state.stage)return false;
  if(state.country&&S(r.country)!==state.country)return false;
  if(state.sector&&S(r.sector)!==state.sector)return false;
  if(state.capital&&S(r.capital_fit)!==state.capital)return false;
  if(q&&N([r.company_name,r.company_domain_normalized,r.company_domain,r.product_summary,r.sector,r.country].join(' ')).indexOf(q)<0)return false;
  return true;
 });
 rows.sort(function(a,b){
  if(state.sort==='company')return S(a.company_name).localeCompare(S(b.company_name),'sq');
  if(state.sort==='updated')return new Date(b.updated_at||0)-new Date(a.updated_at||0);
  if(state.sort==='due')return (S(a.next_action_due)||'9999').localeCompare(S(b.next_action_due)||'9999');
  return Number(b.priority_score==null?-1:b.priority_score)-Number(a.priority_score==null?-1:a.priority_score)||new Date(b.updated_at||0)-new Date(a.updated_at||0);
 });
 return rows;
}
function warnings(r){
 var out=[],rels=relationshipsFor(r.id);
 if(r.stock_required===true)out.push('Kërkon stock');
 if(r.minimum_purchase_required===true)out.push('Kërkon minimum purchase');
 if(r.local_financing_required===true)out.push('Kërkon financim lokal');
 if(r.credit_risk_required===true)out.push('Kërkon risk kreditor');
 if(['distributor','representative','own_office'].indexOf(r.kosovo_presence)>-1)out.push('Ka prani/partner në Kosovë');
 if(rels.some(function(x){return N(x.related_company_country)==='kosovo'&&x.relationship_status==='current'}))out.push('Ka lidhje lokale aktuale të regjistruar');
 else if(rels.some(function(x){return N(x.related_company_country)==='kosovo'&&x.verification_status==='verified'}))out.push('Ka histori të verifikuar partneriteti në Kosovë');
 if(r.capital_fit==='poor')out.push('Capital fit i dobët');
 return out;
}
function O(v){if(v&&typeof v==='object'&&!Array.isArray(v))return v;try{var x=JSON.parse(S(v));return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(e){return{}}}
function targetLink(targetId){return state.opportunityLinks.find(function(x){return !x.archived_at&&S(x.target_id)===S(targetId)})||null}
function targetOpportunity(targetId){var l=targetLink(targetId);return l?state.opportunities.find(function(o){return S(o.id)===S(l.opportunity_id)})||null:null}
function targetFit(targetId){var l=targetLink(targetId);return O(l&&l.fit_evidence)}
function short(v,n){var s=S(v).replace(/\s+/g,' ').trim();return s.length>(n||120)?s.slice(0,(n||120)-1)+'…':s}
function yesNoUnknown(v){return v===true?'Po':v===false?'Jo':'E panjohur'}
function listHtml(items,empty){items=A(items).filter(function(x){return S(x).trim()});if(!items.length)return '<div class="pst-dossier-empty">'+E(empty||'Nuk ka të dhëna të regjistruara.')+'</div>';return '<ul class="pst-dossier-list">'+items.map(function(x){return'<li>'+E(x)+'</li>'}).join('')+'</ul>'}
function compactRows(pairs){var rows=pairs.filter(function(x){return x[1]!==null&&x[1]!==undefined&&S(x[1]).trim()!==''});if(!rows.length)return'<div class="pst-dossier-empty">Nuk ka të dhëna të regjistruara.</div>';return '<div class="pst-dossier-compact">'+rows.map(function(x){return'<span>'+E(x[0])+'</span><span>'+E(x[1])+'</span>'}).join('')+'</div>'}
function money(v,c){var n=Number(v);if(!isFinite(n)||!n)return'—';try{return new Intl.NumberFormat('en-US',{style:'currency',currency:c||'EUR',maximumFractionDigits:0}).format(n)}catch(e){return n.toLocaleString('en-US')+' '+S(c||'')}}
function kosovoLabel(v){return v==='none_found'?'Nuk u gjet prani publike':v==='own_office'?'Zyrë e vet':v==='representative'?'Përfaqësues':v==='distributor'?'Distributor':v==='indirect'?'Prani indirekte':'E panjohur'}
function render(){
 var p=ensurePage(),act=activeRows(),contacted=act.filter(function(r){return ['contacted','replied','meeting','negotiation','pilot','represented'].indexOf(r.stage)>-1}),contactReady=act.filter(function(r){return !!r.contact_email}),projects=Array.from(new Set(state.opportunityLinks.filter(function(l){return !l.archived_at}).map(function(l){return l.opportunity_id}))).length;
 p.querySelector('[data-rep-kpis]').innerHTML=[[act.length,'Targete aktive'],[contactReady.length,'Me kontakt'],[projects,'Projekte / tenderë'],[contacted.length,'Kontaktuar']].map(function(x){return'<div class="pst-rep-kpi"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>'}).join('');
 var counts={};act.forEach(function(r){counts[r.stage]=(counts[r.stage]||0)+1});
 p.querySelector('[data-rep-pipeline]').innerHTML='<button class="pst-rep-pipe '+(!state.stage?'on':'')+'" data-rep-pipe=""><span>Të gjitha</span><b>'+act.length+'</b></button>'+STAGES.map(function(x){return'<button class="pst-rep-pipe '+(state.stage===x[0]?'on':'')+'" data-rep-pipe="'+x[0]+'"><span>'+E(x[1])+'</span><b>'+(counts[x[0]]||0)+'</b></button>'}).join('');
 var pipeSummary=p.querySelector('[data-rep-pipeline-summary]');if(pipeSummary)pipeSummary.textContent=state.stage?stageLabel(state.stage):'Të gjitha';
 p.querySelector('[data-rep-country]').innerHTML='<option value="">Të gjitha vendet</option>'+uniq('country').map(function(v){return'<option'+(state.country===v?' selected':'')+'>'+E(v)+'</option>'}).join('');
 p.querySelector('[data-rep-sector]').innerHTML='<option value="">Të gjithë sektorët</option>'+uniq('sector').map(function(v){return'<option'+(state.sector===v?' selected':'')+'>'+E(v)+'</option>'}).join('');
 p.querySelector('[data-rep-capital]').innerHTML=opts(CAPITAL,state.capital,'Të gjitha capital fit');
 p.querySelector('[data-rep-sort]').value=state.sort;
 var filterCount=[state.query,state.country,state.sector,state.capital,state.sort!=='priority'?state.sort:''].filter(Boolean).length,filterSummary=p.querySelector('[data-rep-filter-summary]');if(filterSummary)filterSummary.textContent=filterCount?filterCount+' aktivë':'Kërkim & renditje';
 var listView=p.querySelector('[data-rep-list-view]'),profileView=p.querySelector('[data-rep-profile-view]'),rows=filtered(),list=p.querySelector('[data-rep-list]');
 if(state.view==='profile'&&!selected())state.view='list';
 listView.hidden=state.view==='profile';profileView.hidden=state.view!=='profile';
 if(state.loading)list.innerHTML='<div class="pst-rep-empty"><b>Duke lexuar pipeline-in…</b></div>';
 else if(state.error)list.innerHTML='<div class="pst-rep-empty"><b>Nuk u lexuan targetet</b>'+E(state.error)+'</div>';
 else if(!rows.length)list.innerHTML='<div class="pst-rep-empty"><b>Nuk ka targete në këtë pamje</b><span>Ndrysho filtrat ose krijo target të ri.</span></div>';
 else list.innerHTML=rows.map(function(r){
  var link=targetLink(r.id)||{},fit=targetFit(r.id),tech=fit.technical_fit||r.product_summary||r.product_category||r.sector||'—',
      regional=fit.regional_position||r.balkans_presence_notes||kosovoLabel(r.kosovo_presence),
      kostt=fit.approach_thesis||r.strategic_fit_notes||r.why_kosovo||'—',contact=r.contact_email?r.contact_email:'Kontakti mungon';
  return '<div class="pst-rep-row" data-rep-id="'+E(r.id)+'" role="button" tabindex="0" aria-label="Hap dosjen e '+E(r.company_name)+'">'
   +'<div class="pst-rep-company"><b>'+E(r.company_name)+'</b><small>'+E(r.company_domain_normalized||r.company_website||r.source_key)+'</small></div>'
   +'<span><span class="pst-rep-cell-title">'+E(r.country||'—')+'</span><span class="pst-rep-cell-sub">'+E(short(r.headquarters,42))+'</span></span>'
   +'<span><span class="pst-rep-cell-title">'+E(short(tech,92))+'</span><span class="pst-rep-cell-sub">'+E(short(r.product_category||r.sector,65))+'</span></span>'
   +'<span><span class="pst-rep-cell-title">'+E(short(regional,92))+'</span><span class="pst-rep-cell-sub">'+E(kosovoLabel(r.kosovo_presence))+'</span></span>'
   +'<span><span class="pst-rep-cell-title">'+E(short(kostt,100))+'</span><span class="pst-rep-cell-sub">'+E(link.company_fit_status?'Fit: '+link.company_fit_status:'Kliko për dosjen e plotë')+'</span></span>'
   +'<span><span class="pst-rep-cell-title">'+E(contact)+'</span><span class="pst-rep-cell-sub">'+E(short(r.contact_role,58))+'</span></span>'
   +'<span><i class="pst-rep-chip">'+E(stageLabel(r.stage))+'</i></span></div>';
 }).join('');
 if(!selected()&&rows.length)state.selected=rows[0].id;
 if(state.view==='profile')renderDetail();else profileView.querySelector('[data-rep-detail]').innerHTML='';
 renderHome();
}

function facts(
function facts(pairs){return'<div class="pst-rep-facts">'+pairs.map(function(x){return'<span>'+E(x[0])+'</span><span>'+E(x[1]==null||x[1]===''?'—':x[1])+'</span>'}).join('')+'</div>'}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null}catch(e){return null}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow()}catch(e){return sessionNow()}}
function gmailDraftUrl(r){return r&&r.gmail_thread_id?'https://mail.google.com/mail/u/0/#drafts/'+encodeURIComponent(r.gmail_thread_id):''}
function draftButton(r){
 var busy=!!state.draftBusy[S(r&&r.id)];
 if(r&&r.gmail_draft_id&&r.gmail_thread_id)return '<button class="pst-rep-btn primary" data-rep-act="open-draft">Hap Gmail draft</button>';
 if(r&&r.contact_email)return '<button class="pst-rep-btn primary" data-rep-act="create-draft"'+(busy?' disabled':'')+'>'+(busy?'Duke krijuar draft…':'Krijo Gmail draft')+'</button>';
 return '<button class="pst-rep-btn" disabled>Kontakti mungon</button>';
}
async function callRepresentationDraft(r){
 var id=S(r&&r.id);if(!id||state.draftBusy[id])return;
 state.draftBusy[id]=true;state.draftResult[id]=null;renderDetail();
 try{
  var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
  var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();
  var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
  async function run(tk){return fetch(base+'/functions/v1/pppp-representation-draft-generator',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify({target_id:id})})}
  var resp=await run(token);if(resp.status===401){s=await refreshSession();if(s&&s.access_token)resp=await run(s.access_token)}
  var raw=await resp.text(),data=null;try{data=raw?JSON.parse(raw):null}catch(e){}
  if(!resp.ok||!data||data.ok===false){
   var reason=S(data&&(data.message||data.error)||('HTTP '+resp.status));
   if(reason.indexOf('recipient_cooldown_30d')>-1)reason='PPPP gjeti email të dërguar te ky recipient gjatë 30 ditëve të fundit. Drafti i dyfishtë u bllokua.';
   throw new Error(reason);
  }
  state.draftResult[id]=data;
  toast(data.existing?'Drafti ekzistues u gjet në Gmail':'Gmail draft u krijua. Dërgimi mbetet manual.');
  await load(true);
 }catch(e){state.draftResult[id]={error:S(e&&e.message||e)};toast(S(e&&e.message||e),true)}
 finally{state.draftBusy[id]=false;renderDetail()}
}
function openRepresentationDraft(r){
 var u=gmailDraftUrl(r);if(!u){toast('Nuk ka Gmail draft të regjistruar për këtë kompani.',true);return}
 window.open(u,'_blank','noopener');
}
function renderDetail(){
 var h=ensurePage().querySelector('[data-rep-detail]'),r=selected();if(!h)return;
 if(!r){h.innerHTML='<div class="pst-rep-empty"><b>Zgjidh një kompani</b></div>';return}
 var l=targetLink(r.id)||{},fit=targetFit(r.id),o=targetOpportunity(r.id)||{},factsObj=O(o.fact_evidence),rels=relationshipsFor(r.id),warn=warnings(r),
     risks=A(fit.risks),values=A(fit.pristeel_value),products=A(r.products),projectLabel=o.project_name||fit.project||'KOSTT Transmission Grid Strengthening',
     role=(TARGET_TYPES.find(function(x){return x[0]===(r.target_type||'representation')})||[])[1]||r.target_type||'—',
     approval=factsObj.approval_date||'',grant=O(factsObj.danish_grant).value,ebrd=O(factsObj.ebrd_finance).value,
     unknowns=[['Procurement packages',o.procurement_packages&&A(o.procurement_packages).length?A(o.procurement_packages).join(' · '):'Ende të papublikuara'],['Qualification criteria',o.qualification_criteria||'Ende të papublikuara'],['JV / consortium rules',o.jv_consortium_rules||'Ende të papublikuara'],['Tender deadline',o.tender_deadline?D(o.tender_deadline):'Ende i papublikuar'],['Bid guarantee',o.bid_guarantee||'Ende e papublikuar'],['Performance guarantee',o.performance_guarantee||'Ende e papublikuar']],
     sourceLink=r.source_url||r.company_website||'',contactLink=r.contact_source||'',
     extraStatus=[['Candidate role',l.candidate_role||role],['Company fit',l.company_fit_status||'—'],['Classification',fit.classification||'—'],['Operator selected',fit.operator_selected===true?'Po':fit.operator_selected===false?'Jo':'—'],['Selection date',fit.selection_date||'—'],['Outreach status',fit.outreach_status||'—'],['Territori',r.target_territory||'—'],['Modeli',r.target_model||'—']];
 h.innerHTML='<div class="pst-dossier">'
  +'<div class="pst-dossier-nav"><button class="pst-rep-btn" data-rep-act="close-profile">← Kompanitë candidate</button><small>Dosja e plotë e kompanisë</small></div>'
  +'<header class="pst-dossier-hero"><div><div class="pst-dossier-eye">INTELIGJENCË KOMPANIE · '+E(role)+'</div><h2>'+E(r.company_name)+'</h2><div class="pst-dossier-meta">'+E([r.headquarters,r.country].filter(Boolean).join(' · '))+(r.company_website?' · <a href="'+E(r.company_website)+'" target="_blank" rel="noopener">'+E(r.company_domain_normalized||r.company_domain||'Website')+'</a>':'')+'</div><div class="pst-dossier-badges"><span class="pst-rep-chip">'+E(stageLabel(r.stage))+'</span><span class="pst-rep-chip neutral">'+E(kosovoLabel(r.kosovo_presence))+'</span>'+(o.project_name?'<span class="pst-rep-chip">KOSTT 55387</span>':'')+(l.company_fit_status?'<span class="pst-rep-chip neutral">Fit: '+E(l.company_fit_status)+'</span>':'')+'</div></div><div class="pst-dossier-actions">'+draftButton(r)+'<button class="pst-rep-btn" data-rep-act="edit">Edito targetin</button><button class="pst-rep-btn" data-rep-act="archive">Archive / Mbylle</button></div></header>'
  +(warn.length?'<div class="pst-rep-warn"><b>Kërkon vëmendje:</b> '+E(warn.join(' · '))+'</div>':'')
  +'<div class="pst-dossier-grid">'
   +'<section class="pst-dossier-card span-8"><h3>Kush është kompania</h3><p class="pst-dossier-highlight">'+E(r.manufacturer_description||r.product_summary||'—')+'</p>'+(r.product_summary&&r.product_summary!==r.manufacturer_description?'<p>'+E(r.product_summary)+'</p>':'')+'<div class="pst-dossier-tags">'+products.map(function(x){return'<span class="pst-dossier-tag">'+E(x)+'</span>'}).join('')+'</div>'+compactRows([['Sektori',r.sector],['Kategoria',r.product_category],['Konsumatorët tipikë',r.potential_customer_types]])+(sourceLink?'<a class="pst-dossier-source" href="'+E(sourceLink)+'" target="_blank" rel="noopener">Hap burimin e kompanisë →</a>':'')+'</section>'
   +'<section class="pst-dossier-card"><h3>Pipeline & veprimi</h3><div class="pst-rep-quick"><label>Stage<select data-rep-quick="stage">'+opts(STAGES,r.stage)+'</select></label><label>Due date<input data-rep-quick="next_action_due" type="date" value="'+E(r.next_action_due||'')+'"></label><label>Next action<input data-rep-quick="next_action" value="'+E(r.next_action||'')+'" placeholder="Veprimi i radhës"></label></div></section>'
   +'<section class="pst-dossier-card"><h3>Fit teknik për KOSTT</h3><p class="pst-dossier-highlight">'+E(fit.technical_fit||r.why_kosovo||'Ende pa vlerësim të plotë.')+'</p><p>'+E(r.market_evidence||'')+'</p></section>'
   +'<section class="pst-dossier-card"><h3>Çfarë sjell PriSteel</h3>'+listHtml(values,'Vlera e PriSteel nuk është strukturuar ende.')+'</section>'
   +'<section class="pst-dossier-card"><h3>Qasja ndaj kompanisë</h3><p class="pst-dossier-highlight">'+E(fit.approach_thesis||r.strategic_fit_notes||'Ende pa approach thesis.')+'</p>'+(r.strategic_fit_notes&&r.strategic_fit_notes!==fit.approach_thesis?'<p>'+E(r.strategic_fit_notes)+'</p>':'')+'</section>'
   +'<section class="pst-dossier-card span-6"><h3>Prani & historik rajonal</h3><div class="pst-dossier-split"><div class="pst-dossier-subbox"><b>Kosovë</b><span>'+E(fit.kosovo_presence||r.balkans_presence_notes||kosovoLabel(r.kosovo_presence))+'</span></div><div class="pst-dossier-subbox"><b>Rajoni</b><span>'+E(fit.regional_position||r.balkans_presence_notes||'Nuk ka të dhëna të tjera të regjistruara.')+'</span></div></div>'+(fit.consortium_intelligence?'<div class="pst-dossier-subbox" style="margin-top:10px"><b>JV / konsorcium / precedent</b><span>'+E(fit.consortium_intelligence)+'</span></div>':'')+(r.existing_partner_name?'<div class="pst-dossier-subbox" style="margin-top:10px"><b>Partner i regjistruar</b><span>'+E(r.existing_partner_name+(r.existing_partner_notes?' · '+r.existing_partner_notes:''))+'</span></div>':'')+'</section>'
   +'<section class="pst-dossier-card span-6"><h3>Rreziqe & sinjale historike</h3>'+listHtml(risks,'Nuk ka rreziqe specifike të regjistruara.')+(fit.historical_price_signal?'<div class="pst-dossier-subbox" style="margin-top:10px"><b>Sinjal historik çmimi / tenderi</b><span>'+E(fit.historical_price_signal)+'</span></div>':'')+(fit.manufacturing_note?'<div class="pst-dossier-subbox" style="margin-top:10px"><b>Kapacitet prodhues</b><span>'+E(fit.manufacturing_note)+'</span></div>':'')+'</section>'
   +'<section class="pst-dossier-card span-12"><h3>Projekti i lidhur · '+E(projectLabel)+'</h3><div class="pst-dossier-metrics"><div class="pst-dossier-metric"><span>Vlera totale</span><b>'+E(money(o.total_project_value,o.currency))+'</b></div><div class="pst-dossier-metric"><span>Financimi EBRD</span><b>'+E(ebrd?money(ebrd,'EUR'):'—')+'</b></div><div class="pst-dossier-metric"><span>Grant Danish Fund</span><b>'+E(grant?money(grant,'EUR'):'—')+'</b></div><div class="pst-dossier-metric"><span>Miratuar</span><b>'+E(approval||'—')+'</b></div></div><div class="pst-dossier-split"><div><h4>Scope i konfirmuar</h4><p>'+E(o.scope||'—')+'</p></div><div><h4>Financimi / statusi</h4><p>'+E(o.financing||'—')+'</p><p>'+E(o.procurement_stage||'—')+'</p></div></div><div class="pst-dossier-unknowns">'+unknowns.map(function(x){return'<div class="pst-dossier-unknown"><b>'+E(x[0])+'</b><span>'+E(x[1])+'</span></div>'}).join('')+'</div>'+(o.official_source?'<a class="pst-dossier-source" href="'+E(o.official_source)+'" target="_blank" rel="noopener">Hap burimin zyrtar EBRD →</a>':'')+'</section>'
   +'<section class="pst-dossier-card span-6"><h3>Kontakti & Gmail</h3><div class="pst-dossier-contact"><span>Emri</span><span>'+E(r.contact_name||'—')+'</span><span>Roli</span><span>'+E(r.contact_role||'—')+'</span><span>Email</span><span>'+(r.contact_email?'<a href="mailto:'+E(r.contact_email)+'">'+E(r.contact_email)+'</a>':'—')+'</span><span>Telefoni</span><span>'+E(r.contact_phone||'—')+'</span><span>Burimi</span><span>'+(contactLink?'<a href="'+E(contactLink)+'" target="_blank" rel="noopener">Kontakt zyrtar</a>':'—')+'</span><span>Kontakti i fundit</span><span>'+E(r.last_contact_at?D(r.last_contact_at):'Asnjë kontakt i regjistruar')+'</span></div>'+(state.draftResult[S(r.id)]&&state.draftResult[S(r.id)].error?'<div class="pst-rep-warn"><b>Drafti nuk u krijua:</b> '+E(state.draftResult[S(r.id)].error)+'</div>':'')+'</section>'
   +'<section class="pst-dossier-card span-6"><h3>Mesazhi / pitch i jashtëm</h3><div class="pst-dossier-pitch">'+E(fit.external_pitch||'Ende nuk ka external pitch të strukturuar.')+'</div><div style="margin-top:12px">'+compactRows([['Outreach status',fit.outreach_status],['Next action',l.next_action||r.next_action],['Draft Gmail',r.gmail_draft_id?'I krijuar':'Nuk është krijuar'],['Thread Gmail',r.gmail_thread_id||'—']])+'</div></section>'
   +'<section class="pst-dossier-card span-12"><h3>JV / partnerë lokalë & rajonalë</h3>'+(rels.length?'<div>'+rels.map(function(x){return'<div class="pst-dossier-rel"><b>'+E(x.related_company_name)+'</b><span>'+E(relLabel(REL_TYPES,x.relationship_type))+'</span><span>'+E(relLabel(REL_STATUS,x.relationship_status))+'</span><span>'+E([x.related_company_country,x.project_or_tender||x.project_reference,x.relationship_scope,relLabel(REL_VERIFY,x.verification_status)].filter(Boolean).join(' · '))+'</span></div>'}).join('')+'</div>':'<div class="pst-dossier-empty">Nuk ka ende lidhje të regjistruara. Kjo do të thotë vetëm se nuk kemi regjistruar evidencë në këtë tabelë; nuk është provë se kompania nuk ka pasur marrëdhënie lokale.</div>')+'<div style="margin-top:10px"><button class="pst-rep-btn" data-rep-act="add-relationship">+ Shto JV / partner lokal</button></div></section>'
   +'<section class="pst-dossier-card span-6"><h3>Status, model & komercial</h3>'+compactRows(extraStatus.concat([['Prioriteti',r.priority_score==null?'—':r.priority_score+'/100'],['Arsyeja',r.priority_reason],['Capital fit',capitalLabel(r.capital_fit)],['Stock required',yesNoUnknown(r.stock_required)],['Minimum purchase',yesNoUnknown(r.minimum_purchase_required)],['Financim lokal',yesNoUnknown(r.local_financing_required)],['Risk kreditor',yesNoUnknown(r.credit_risk_required)],['Kërkesa kapitale',r.estimated_capital_requirement],['Komision i propozuar',r.proposed_commission_pct==null?'—':r.proposed_commission_pct+'%'],['Komision i dakorduar',r.agreed_commission_pct==null?'—':r.agreed_commission_pct+'%'],['Retainer',r.proposed_retainer],['Ekskluziviteti',r.exclusivity_status],['Marrëveshja',r.agreement_status],['Territori i dakorduar',r.territory_agreed],['Shënime komerciale',r.commercial_notes]]))+'</section>'
   +'<section class="pst-dossier-card span-6"><h3>Historiku i kërkimit & burimet</h3>'+compactRows([['Why Kosovo',r.why_kosovo],['Market evidence',r.market_evidence],['Relevant tenders / projects',r.relevant_tenders_or_projects],['Balkans notes',r.balkans_presence_notes],['Existing partner notes',r.existing_partner_notes],['Capital notes',r.capital_notes],['Notes',r.notes],['Burimi kryesor',r.source_name],['Source key',r.source_key],['Verifikuar',r.last_verified_at?D(r.last_verified_at):'—'],['Krijuar',r.created_at?D(r.created_at):'—'],['Përditësuar',r.updated_at?D(r.updated_at):'—'],['Command ID',r.created_source_command_id],['Identity review',r.identity_review_status],['Identity review notes',r.identity_review_notes]])+'</section>'
  +'</div></div>';
}

async function loadOpportunities
async function loadOpportunities(force){
 if(state.opportunitiesLoading)return state.opportunities;
 if(state.opportunitiesLoaded&&!force)return state.opportunities;
 if(typeof window.supaFetch!=='function')return state.opportunities;
 state.opportunitiesLoading=true;
 try{
  var path='pppp_representation_opportunities_v1?select=id,source_key,project_name,funding_institution,tender_reference,official_source,total_project_value,currency,status,procurement_stage,tender_deadline,scope,verification_status,last_verified_at,updated_at&archived_at=is.null&order=updated_at.desc&limit=80';
  state.opportunities=A(await window.supaFetch(path));
  state.opportunitiesLoaded=true;
 }catch(e){state.error=S(e&&e.message||e)}
 state.opportunitiesLoading=false;return state.opportunities;
}
async function load(force){
 if(state.loading)return;if(state.loaded&&!force){render();return}
 state.loading=true;state.error='';render();
 try{
  var loaded=await Promise.all([
   window.supaFetch(TABLE+'?select=*&order=priority_score.desc.nullslast,updated_at.desc&limit=500'),
   window.supaFetch(REL_TABLE+'?select=*&archived_at=is.null&order=updated_at.desc&limit=2000'),
   window.supaFetch('pppp_representation_opportunity_targets_v1?select=*&archived_at=is.null&order=updated_at.desc&limit=2000'),
   window.supaFetch('pppp_representation_opportunities_v1?select=*&archived_at=is.null&order=updated_at.desc&limit=500')
  ]);
  state.rows=A(loaded[0]);state.relationships=A(loaded[1]);state.opportunityLinks=A(loaded[2]);state.opportunities=A(loaded[3]);state.opportunitiesLoaded=true;
  state.loaded=true;if(state.selected&&!state.rows.some(function(r){return S(r.id)===S(state.selected)})){state.selected='';state.view='list'}
 }catch(e){state.error=S(e&&e.message||e)}
 state.loading=false;render();
}
async function patchRow(id,payload,msg){
 try{await window.supaFetch(TABLE+'?id=eq.'+encodeURIComponent(id),'PATCH',payload);toast(msg||'U ruajt');await load(true)}
 catch(e){toast(S(e&&e.message||e),true);throw e}
}
function detailClick(e){
 var a=e.target.closest('[data-rep-act]');if(!a)return;var r=selected();if(!r)return;
 if(a.dataset.repAct==='edit')openEditor(r);
 if(a.dataset.repAct==='archive')archive(r);
 if(a.dataset.repAct==='add-relationship')openRelationshipEditor(r);
 if(a.dataset.repAct==='create-draft')callRepresentationDraft(r);
 if(a.dataset.repAct==='open-draft')openRepresentationDraft(r);
 if(a.dataset.repAct==='close-profile'){state.view='list';render();try{window.scrollTo({top:0,behavior:'smooth'})}catch(_){try{window.scrollTo(0,0)}catch(__){}}}
}
function detailChange(e){
 var k=e.target&&e.target.dataset&&e.target.dataset.repQuick,r=selected();if(!k||!r)return;
 var payload={};payload[k]=nullable(e.target.value);
 if(k==='stage'&&payload.stage==='represented'&&!window.confirm('Konfirmon vendimin njerëzor që PriSteel e përfaqëson këtë kompani?')){e.target.value=r.stage;return}
 patchRow(r.id,payload,'Pipeline-i u përditësua');
}
async function archive(r){
 var reason=window.prompt('Arsyeja për mbyllje/arkivim:','');if(!S(reason).trim())return;
 await patchRow(r.id,{stage:'closed',archive_reason:S(reason).trim(),archived_at:new Date().toISOString()},'Targeti u mbyll dhe u arkivua');
}
function openRelationshipEditor(target){
 var m=document.createElement('div');m.className='pst-rep-modal';m.id='pst-rep-rel-modal';
 m.innerHTML='<div class="pst-rep-dialog" style="width:min(760px,100%)"><div class="pst-rep-dialog-head"><h2>Shto JV / partner lokal</h2><button class="pst-rep-btn" data-rel-close>Mbyll</button></div><form class="pst-rep-form" data-rel-form><section class="pst-rep-form-section"><h3>Lidhja e kompanisë</h3><div class="pst-rep-grid">'
 +field('rep-rel-company','Kompania lokale / rajonale *','text','','two')
 +field('rep-rel-country','Shteti','text','Kosovo')
 +field('rep-rel-type','Lloji i lidhjes','select',null,'',opts(REL_TYPES,'unknown'))
 +field('rep-rel-status','Statusi','select',null,'',opts(REL_STATUS,'unknown'))
 +field('rep-rel-verify','Verifikimi','select',null,'',opts(REL_VERIFY,'review'))
 +field('rep-rel-project','Projekti / tenderi','text','')
 +field('rep-rel-reference','Referenca','text','')
 +field('rep-rel-domain','Domain i kompanisë lokale','text','')
 +field('rep-rel-scope','Roli / scope','textarea','','full')
 +field('rep-rel-source-name','Burimi','text','')
 +field('rep-rel-source-url','Source URL','url','','two')
 +field('rep-rel-notes','Shënime','textarea','','full')
 +'</div></section><div class="pst-rep-form-foot"><button type="button" class="pst-rep-btn" data-rel-close>Anulo</button><button type="submit" class="pst-rep-btn primary">Ruaj lidhjen</button></div></form></div>';
 document.body.appendChild(m);
 m.querySelectorAll('[data-rel-close]').forEach(function(b){b.onclick=function(){m.remove()}});
 m.addEventListener('click',function(e){if(e.target===m)m.remove()});
 m.querySelector('[data-rel-form]').onsubmit=function(e){e.preventDefault();saveRelationship(target,m)};
}
async function saveRelationship(target,m){
 var company=val('rep-rel-company'),country=val('rep-rel-country')||'Kosovo',type=val('rep-rel-type')||'unknown',
     status=val('rep-rel-status')||'unknown',verify=val('rep-rel-verify')||'review',project=val('rep-rel-project'),
     sourceUrl=val('rep-rel-source-url');
 if(!company){toast('Emri i kompanisë është i detyrueshëm',true);return}
 if(verify==='verified'&&!sourceUrl){toast('Për statusin E verifikuar duhet Source URL',true);return}
 var sourceKey='reprrel:'+S(target.id)+':'+(slug(country)||'xx')+':'+(slug(company)||'company')+':'+(slug(project||type)||'relationship');
 var payload={
  target_id:target.id,opportunity_id:null,source_key:sourceKey,related_company_name:company,
  related_company_domain:nullable(val('rep-rel-domain')),related_company_country:country,
  relationship_type:type,relationship_status:status,project_or_tender:nullable(project),
  project_reference:nullable(val('rep-rel-reference')),relationship_scope:nullable(val('rep-rel-scope')),
  verification_status:verify,evidence:{source_name:nullable(val('rep-rel-source-name')),source_url:nullable(sourceUrl)},
  source_name:nullable(val('rep-rel-source-name')),source_url:nullable(sourceUrl),
  last_verified_at:verify==='verified'?new Date().toISOString():null,notes:nullable(val('rep-rel-notes')),
  created_source:'manual'
 };
 var submit=m.querySelector('[type="submit"]');if(submit)submit.disabled=true;
 try{
  await window.supaFetch(REL_TABLE,'POST',payload);
  m.remove();toast('Lidhja u regjistrua');await load(true);
 }catch(e){
  var msg=S(e&&e.message||e);if(/duplicate|unique|23505/i.test(msg))msg='Kjo lidhje duket se ekziston dhe nuk u krijua dublikatë.';
  toast(msg,true);if(submit)submit.disabled=false;
 }
}
function field(id,label,type,value,cls,options,placeholder){
 var input;
 if(type==='textarea')input='<textarea id="'+id+'" placeholder="'+E(placeholder||'')+'">'+E(value||'')+'</textarea>';
 else if(type==='select')input='<select id="'+id+'">'+options+'</select>';
 else input='<input id="'+id+'" type="'+(type||'text')+'" value="'+E(value==null?'':value)+'" placeholder="'+E(placeholder||'')+'">';
 return'<div class="pst-rep-field '+(cls||'')+'"><label for="'+id+'">'+E(label)+'</label>'+input+'</div>';
}
function boolOptions(v){return opts([['','E panjohur'],['false','Jo'],['true','Po']],v==null?'':S(v))}
function openEditor(r){
 r=r||{};state.editor=r.id||'new';var m=document.createElement('div');m.className='pst-rep-modal';m.id='pst-rep-modal';
 m.innerHTML='<div class="pst-rep-dialog"><div class="pst-rep-dialog-head"><h2>'+(r.id?'Edito targetin':'Target i ri')+'</h2><button class="pst-rep-btn" data-rep-close>Mbyll</button></div><form class="pst-rep-form" data-rep-form>'
 +'<section class="pst-rep-form-section"><h3>Identiteti</h3><div class="pst-rep-grid">'
 +field('rep-company-name','Company name *','text',r.company_name,'two')+field('rep-country','Country','text',r.country)
 +field('rep-target-type','Lloji i targetit','select',null,'',opts(TARGET_TYPES,r.target_type||'representation'))
 +field('rep-company-domain','Official domain','text',r.company_domain)+field('rep-company-website','Website','url',r.company_website)+field('rep-headquarters','Headquarters','text',r.headquarters)
 +field('rep-source-key','Source key *','text',r.source_key,'two',null,'rep:de:example.com')+field('rep-source-name','Source name','text',r.source_name)
 +field('rep-source-url','Source URL','url',r.source_url,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Business</h3><div class="pst-rep-grid">'
 +field('rep-sector','Sector','text',r.sector)+field('rep-product-category','Product category','text',r.product_category)+field('rep-size-band','Company size','text',r.size_band)
 +field('rep-product-summary','Products / summary','textarea',r.product_summary||A(r.products).join(', '),'full')
 +field('rep-manufacturer-description','Manufacturer description','textarea',r.manufacturer_description,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Pse PriSteel / Kosovë</h3><div class="pst-rep-grid">'
 +field('rep-why-kosovo','Why Kosovo','textarea',r.why_kosovo,'full')+field('rep-market-evidence','Market evidence','textarea',r.market_evidence,'full')
 +field('rep-relevant-projects','Relevant tenders / projects','textarea',r.relevant_tenders_or_projects,'full')
 +field('rep-customer-types','Potential customer types','textarea',r.potential_customer_types,'full')
 +field('rep-strategic-fit','Strategic fit notes','textarea',r.strategic_fit_notes,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Coverage & modeli</h3><div class="pst-rep-grid">'
 +field('rep-kosovo-presence','Kosovo presence','select',null,'',opts(PRESENCE,r.kosovo_presence||'unknown'))
 +field('rep-target-model','Target model','select',null,'',opts(MODELS,r.target_model||'unknown'))
 +field('rep-target-territory','Target territory','text',r.target_territory||'Kosovo')
 +field('rep-existing-partner','Existing partner','text',r.existing_partner_name)+field('rep-existing-partner-notes','Partner notes','textarea',r.existing_partner_notes,'two')
 +field('rep-balkans-presence','Balkans presence notes','textarea',r.balkans_presence_notes,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Financial fit / risk</h3><div class="pst-rep-grid">'
 +field('rep-capital-fit','Capital fit','select',null,'',opts(CAPITAL,r.capital_fit||'unknown'))
 +field('rep-stock-required','Stock required','select',null,'',boolOptions(r.stock_required))
 +field('rep-minimum-purchase','Minimum purchase','select',null,'',boolOptions(r.minimum_purchase_required))
 +field('rep-local-financing','Local financing','select',null,'',boolOptions(r.local_financing_required))
 +field('rep-credit-risk','Credit risk','select',null,'',boolOptions(r.credit_risk_required))
 +field('rep-capital-requirement','Estimated capital requirement','text',r.estimated_capital_requirement)
 +field('rep-capital-notes','Capital notes','textarea',r.capital_notes,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Kontakt & pipeline</h3><div class="pst-rep-grid">'
 +field('rep-contact-name','Contact name','text',r.contact_name)+field('rep-contact-role','Role','text',r.contact_role)+field('rep-contact-email','Email','email',r.contact_email)
 +field('rep-contact-phone','Phone','text',r.contact_phone)+field('rep-linkedin','LinkedIn URL','url',r.linkedin_url)+field('rep-contact-source','Contact source','text',r.contact_source)
 +field('rep-stage','Stage','select',null,'',opts(STAGES,r.stage||'found'))+field('rep-priority','Priority 0–100','number',r.priority_score)+field('rep-next-due','Next action due','date',r.next_action_due)
 +field('rep-priority-reason','Priority reason','textarea',r.priority_reason,'full')+field('rep-next-action','Next action','textarea',r.next_action,'full')+field('rep-notes','Notes','textarea',r.notes,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Commercial terms (kur avancon)</h3><div class="pst-rep-grid">'
 +field('rep-proposed-commission','Proposed commission %','number',r.proposed_commission_pct)+field('rep-agreed-commission','Agreed commission %','number',r.agreed_commission_pct)+field('rep-proposed-retainer','Proposed retainer','number',r.proposed_retainer)
 +field('rep-exclusivity','Exclusivity status','text',r.exclusivity_status)+field('rep-agreement','Agreement status','text',r.agreement_status)+field('rep-territory-agreed','Territory agreed','text',r.territory_agreed)
 +field('rep-commercial-notes','Commercial notes','textarea',r.commercial_notes,'full')+'</div></section>'
 +'<div class="pst-rep-form-foot"><button type="button" class="pst-rep-btn" data-rep-close>Anulo</button><button type="submit" class="pst-rep-btn primary">Ruaj targetin</button></div></form></div>';
 document.body.appendChild(m);m.querySelectorAll('[data-rep-close]').forEach(function(b){b.onclick=function(){m.remove()}});
 m.addEventListener('click',function(e){if(e.target===m)m.remove()});
 m.querySelector('[data-rep-form]').onsubmit=function(e){e.preventDefault();saveEditor(r)};
}
function formPayload(existing){
 var payload={
  company_name:val('rep-company-name'),target_type:val('rep-target-type')||'representation',country:nullable(val('rep-country')),company_domain:nullable(val('rep-company-domain')),
  company_website:nullable(val('rep-company-website')),headquarters:nullable(val('rep-headquarters')),
  source_key:val('rep-source-key'),source_name:nullable(val('rep-source-name')),source_url:nullable(val('rep-source-url')),
  sector:nullable(val('rep-sector')),product_category:nullable(val('rep-product-category')),
  product_summary:nullable(val('rep-product-summary')),products:val('rep-product-summary').split(',').map(function(x){return x.trim()}).filter(Boolean),
  manufacturer_description:nullable(val('rep-manufacturer-description')),size_band:nullable(val('rep-size-band')),
  why_kosovo:nullable(val('rep-why-kosovo')),market_evidence:nullable(val('rep-market-evidence')),
  relevant_tenders_or_projects:nullable(val('rep-relevant-projects')),potential_customer_types:nullable(val('rep-customer-types')),
  strategic_fit_notes:nullable(val('rep-strategic-fit')),kosovo_presence:val('rep-kosovo-presence')||'unknown',
  target_model:val('rep-target-model')||'unknown',target_territory:val('rep-target-territory')||'Kosovo',
  existing_partner_name:nullable(val('rep-existing-partner')),existing_partner_notes:nullable(val('rep-existing-partner-notes')),
  balkans_presence_notes:nullable(val('rep-balkans-presence')),capital_fit:val('rep-capital-fit')||'unknown',
  stock_required:parseBool(val('rep-stock-required')),minimum_purchase_required:parseBool(val('rep-minimum-purchase')),
  local_financing_required:parseBool(val('rep-local-financing')),credit_risk_required:parseBool(val('rep-credit-risk')),
  estimated_capital_requirement:nullable(val('rep-capital-requirement')),capital_notes:nullable(val('rep-capital-notes')),
  contact_name:nullable(val('rep-contact-name')),contact_role:nullable(val('rep-contact-role')),
  contact_email:nullable(val('rep-contact-email').toLowerCase()),contact_phone:nullable(val('rep-contact-phone')),
  linkedin_url:nullable(val('rep-linkedin')),contact_source:nullable(val('rep-contact-source')),
  stage:val('rep-stage')||'found',priority_score:val('rep-priority')===''?null:Number(val('rep-priority')),
  priority_reason:nullable(val('rep-priority-reason')),next_action:nullable(val('rep-next-action')),
  next_action_due:nullable(val('rep-next-due')),notes:nullable(val('rep-notes')),
  proposed_commission_pct:val('rep-proposed-commission')===''?null:Number(val('rep-proposed-commission')),
  agreed_commission_pct:val('rep-agreed-commission')===''?null:Number(val('rep-agreed-commission')),
  proposed_retainer:val('rep-proposed-retainer')===''?null:Number(val('rep-proposed-retainer')),
  exclusivity_status:nullable(val('rep-exclusivity')),agreement_status:nullable(val('rep-agreement')),
  territory_agreed:nullable(val('rep-territory-agreed')),commercial_notes:nullable(val('rep-commercial-notes'))
 };
 if(!payload.source_key)payload.source_key=sourceKeyFrom(payload);
 if(!existing)payload.created_source='manual';
 return payload;
}
async function saveEditor(existing){
 var payload=formPayload(!!existing.id);
 if(!payload.company_name){toast('Company name është i detyrueshëm',true);return}
 if(payload.stage==='represented'&&(!existing.id||existing.stage!=='represented')&&!window.confirm('Konfirmon vendimin njerëzor që PriSteel e përfaqëson këtë kompani?'))return;
 var submit=document.querySelector('#pst-rep-modal [type="submit"]');if(submit)submit.disabled=true;
 try{
  if(existing.id)await window.supaFetch(TABLE+'?id=eq.'+encodeURIComponent(existing.id),'PATCH',payload);
  else await window.supaFetch(TABLE,'POST',payload);
  document.getElementById('pst-rep-modal').remove();toast(existing.id?'Targeti u përditësua':'Targeti u krijua');await load(true);
 }catch(e){
  var msg=S(e&&e.message||e);if(/duplicate|unique|23505/i.test(msg))msg='Kjo kompani/domain duket se ekziston. Nuk u krijua rekord i dytë; kërkohet review i targetit ekzistues.';
  toast(msg,true);if(submit)submit.disabled=false;
 }
}
function ensureHome(){
 var home=document.getElementById('pst-home-launchpad-v1'),lanes=home&&home.querySelector('.pst-morning-lanes'),opportunities=lanes&&lanes.querySelector('.pst-morning-lane.opportunities');if(!home||!lanes||!opportunities)return false;
 var card=document.getElementById('pst-representations-home-v1');if(!card){card=document.createElement('section');card.id='pst-representations-home-v1';card.onclick=open}
 if(card.parentNode!==lanes||card.previousElementSibling!==opportunities)lanes.insertBefore(card,opportunities.nextElementSibling);
 renderHome();return true;
}
function renderHome(){
 var card=document.getElementById('pst-representations-home-v1');if(!card)return;
 var act=activeRows(),contacted=act.filter(function(r){return ['contacted','replied','meeting','negotiation','pilot','represented'].indexOf(r.stage)>-1}),meet=act.filter(function(r){return ['meeting','negotiation'].indexOf(r.stage)>-1}),represented=act.filter(function(r){return r.stage==='represented'});
 card.innerHTML='<button class="pst-rep-home" type="button"><div class="pst-rep-home-head"><div><div class="pst-rep-home-eye">PËRFAQËSIME</div><div class="pst-rep-home-title">Prodhues ndërkombëtarë</div><div class="pst-rep-home-sub">Market development, kontakte dhe negocim.</div></div><span class="pst-rep-home-open">Hap →</span></div><div class="pst-rep-home-stats">'+[[act.length,'Targete'],[contacted.length,'Kontaktuar'],[meet.length,'Takime'],[represented.length,'Aktive']].map(function(x){return'<span class="pst-rep-home-stat"><b>'+x[0]+'</b><span>'+x[1]+'</span></span>'}).join('')+'</div></button>';
}
function removeSystemCard(){var x=document.getElementById('pst-representations-system-card');if(x)x.remove()}
function open(){
 var p=ensurePage();hideOthers(p);p.style.display='block';p.classList.add('active');setRoute(true);try{window.scrollTo(0,0)}catch(e){}load(true);return true;
}
function back(){
 setRoute(false);try{var n=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1;if(n&&typeof n.openHome==='function'){n.openHome();return}}catch(e){}
 try{if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('home')}catch(e){}
}
function boot(){ensurePage();removeSystemCard();ensureHome();if(location.hash==='#perfaqesime')open();else load(false)}
document.addEventListener('pst:native-home-ready',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:modules-ready',function(){setTimeout(boot,0)},{once:true});
window.addEventListener('popstate',function(){if(location.hash==='#perfaqesime')open()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)},{once:true});else setTimeout(boot,0);
window.PSTRepresentationsV1={open:open,refresh:function(){return load(true)},loadOpportunities:function(force){return loadOpportunities(!!force)},snapshot:function(){return{rows:state.rows.slice(),opportunities:state.opportunities.slice(),opportunityLinks:state.opportunityLinks.slice(),selected:state.selected,view:state.view,error:state.error,loaded:state.loaded,opportunitiesLoaded:state.opportunitiesLoaded}}};
})();


