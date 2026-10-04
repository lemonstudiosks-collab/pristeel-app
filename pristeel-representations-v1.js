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
var CAPITAL=[['unknown','E panjohur'],['good','E mirë'],['review','Për shqyrtim'],['poor','E dobët']];
var TARGET_TYPES=[['lead_epc_candidate','Kandidat për EPC / konsorcium drejtues'],['oem_specialist_partner','Partner OEM / specialist'],['representation','Përfaqësim']];
var REL_TYPES=[['joint_venture','JV'],['consortium','Konsorcium'],['subcontractor','Nënkontraktor'],['supplier','Furnitor'],['representative','Përfaqësues'],['distributor','Distributor'],['implementation_partner','Partner implementimi'],['local_partner','Partner lokal'],['other','Tjetër'],['unknown','E panjohur']];
var REL_STATUS=[['current','Aktuale'],['historical','Historike'],['unknown','E panjohur']];
var REL_VERIFY=[['unknown','E panjohur'],['review','Për verifikim'],['verified','E verifikuar']];
var state={rows:[],relationships:[],opportunities:[],opportunityLinks:[],loaded:false,loading:false,opportunitiesLoaded:false,opportunitiesLoading:false,error:'',selected:'',view:'list',returnTo:'',inlineHost:null,query:'',stage:'',country:'',sector:'',capital:'',sort:'priority',editor:null,draftBusy:{},draftResult:{},previousPageId:'',previousScrollY:0};

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
function representationRows(){return state.rows.filter(function(r){return !r.archived_at&&S(r.target_type)==='representation'})}
function uniq(key){return Array.from(new Set(representationRows().map(function(r){return S(r[key]).trim()}).filter(Boolean))).sort(function(a,b){return a.localeCompare(b,'sq')})}
function selected(){return state.rows.find(function(r){return !r.archived_at&&S(r.id)===S(state.selected)})||null}
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
body:has(#page-representations.active) .app-shell{display:block!important;grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:none!important}
body:has(#page-representations.active) .app-shell>.sidebar,body:has(#page-representations.active) .app-shell>aside.sidebar{display:none!important;visibility:hidden!important;flex:0 0 0!important;width:0!important;min-width:0!important;max-width:0!important;border:0!important;overflow:hidden!important}
body:has(#page-representations.active) .app-shell>.main,body:has(#page-representations.active) .app-shell>main.main{display:block!important;flex:1 1 100%!important;width:100%!important;max-width:none!important;min-width:0!important;margin-left:0!important}
body:has(#page-representations.active) .content{width:100%!important;max-width:none!important;margin-left:0!important;margin-right:0!important;padding-left:18px!important;padding-right:18px!important}
body:has(#page-representations.active) .topbar,body:has(#page-representations.active) #pst-global-page-backbar{display:none!important}
.pst-rep-page{width:100%;max-width:none;margin:0;padding:10px 0 50px;color:var(--rep-text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
.pst-rep-page button,.pst-rep-page input,.pst-rep-page select,.pst-rep-page textarea{font-family:inherit}
.pst-rep-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:7px}.pst-rep-eye{font-size:7.8px;font-weight:850;letter-spacing:.12em;text-transform:uppercase;color:#6f857e}.pst-rep-head h1{margin:1px 0 2px;font-size:24px;letter-spacing:-.45px}.pst-rep-head p{margin:0;color:#70817c;font-size:10px;line-height:1.3}.pst-rep-actions{display:flex;gap:8px;flex-wrap:wrap}.pst-rep-btn{border:1px solid var(--rep-line);background:#fff;color:var(--rep-dark);border-radius:10px;padding:9px 12px;font-size:10.5px;font-weight:800;cursor:pointer}.pst-rep-btn.primary{background:var(--rep);border-color:var(--rep);color:#fff}.pst-rep-btn.danger{color:#9b423b;border-color:#e7c9c5}.pst-rep-btn:disabled{opacity:.5;cursor:not-allowed}
.pst-rep-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.pst-rep-kpi{background:#fff;border:1px solid var(--rep-line);border-radius:13px;padding:13px 15px}.pst-rep-kpi b{display:block;font-size:23px;color:var(--rep-dark)}.pst-rep-kpi span{font-size:9.5px;color:#7b8b86}
.pst-rep-controls{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:7px;position:relative}.pst-rep-control{position:relative}.pst-rep-control-toggle{min-width:145px;display:flex;align-items:center;justify-content:space-between;gap:12px}.pst-rep-control-toggle span{font-size:9px;font-weight:650;color:#758780}.pst-rep-control-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:45;min-width:250px;max-height:68vh;overflow:auto;background:#fff;border:1px solid var(--rep-line);border-radius:12px;padding:8px;box-shadow:0 14px 38px rgba(36,59,53,.14)}.pst-rep-control-menu[hidden]{display:none!important}.pst-rep-control-menu.filters{min-width:330px}.pst-rep-pipeline{display:grid;gap:5px}.pst-rep-pipe{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--rep-line);background:#fff;border-radius:9px;padding:8px 10px;font-size:9.5px;color:#61746e;cursor:pointer;text-align:left}.pst-rep-pipe.on{background:var(--rep-soft);border-color:#acc6bb;color:var(--rep-dark);font-weight:850}.pst-rep-pipe b{margin-left:5px}.pst-rep-toolbar{display:grid;grid-template-columns:1fr;gap:7px}.pst-rep-toolbar input,.pst-rep-toolbar select{height:38px;border:1px solid var(--rep-line);border-radius:10px;background:#fff;padding:0 11px;font-size:10.5px;color:#425952}
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
#page-representations .pst-rep-page{width:100%;max-width:none;margin:0;padding-bottom:64px}
#page-representations .pst-rep-topline{display:flex;align-items:center;justify-content:flex-start;margin-bottom:4px}
#page-representations .pst-rep-back-primary{background:#4b9fbd;border-color:#4b9fbd;color:#fff;box-shadow:0 5px 12px rgba(56,132,160,.14);padding:6px 10px;min-height:30px;border-radius:9px}
#page-representations .pst-rep-back-primary:hover{background:#3f8eaa;border-color:#3f8eaa}
#page-representations .pst-rep-intro{margin-bottom:4px}

#page-representations .pst-rep-head{align-items:center;margin-bottom:5px}
#page-representations .pst-rep-head p{font-size:10px;max-width:1120px;line-height:1.3}
#page-representations .pst-rep-actions .pst-rep-btn{min-height:30px;display:inline-flex;align-items:center;justify-content:center}
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
#page-representations .pst-dossier{display:grid;gap:10px;width:100%}
#page-representations .pst-dossier-nav{display:flex;align-items:center;justify-content:space-between;gap:12px}
#page-representations .pst-dossier-nav small{font-size:9px;color:#7d8e88;text-transform:uppercase;letter-spacing:.09em;font-weight:800}
#page-representations .pst-dossier-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:11px 14px;border:1px solid var(--rep-line);border-radius:16px;background:linear-gradient(135deg,#fff 0%,#f5faf7 100%)}
#page-representations .pst-dossier-eye{font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:850;color:#6b8279}
#page-representations .pst-dossier-hero h2{margin:2px 0 2px;font-size:22px;line-height:1.08;color:#1f3b32;letter-spacing:-.5px}
#page-representations .pst-dossier-meta{font-size:11px;color:#687d75;line-height:1.5}
#page-representations .pst-dossier-meta a{color:#2f6d5a;text-decoration:none;font-weight:760}
#page-representations .pst-dossier-badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
#page-representations .pst-dossier-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;max-width:520px}
#page-representations .pst-dossier-actions .pst-rep-btn{min-height:31px;padding:6px 10px}
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
#page-representations .pst-dossier .pst-rep-quick{grid-template-columns:repeat(3,minmax(0,1fr));align-items:end;min-width:0;width:100%;max-width:100%}
#page-representations .pst-dossier .pst-rep-quick label:last-child{grid-column:auto!important}
#page-representations .pst-dossier-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
#page-representations .pst-dossier-summary-item{border:1px solid #e7eeeb;border-radius:11px;background:#fbfcfb;padding:11px 12px;min-width:0}
#page-representations .pst-dossier-summary-item>b{display:block;margin-bottom:6px;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#6f837b}
#page-representations .pst-dossier-summary-item p{font-size:10.5px;line-height:1.45}
#page-representations .pst-dossier-summary-item .pst-dossier-list{font-size:10.2px;line-height:1.45}
#page-representations .pst-dossier-contact-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start}
#page-representations .pst-dossier-fold-inline{margin-top:12px;border-top:1px solid #e8efeb;padding-top:10px}
#page-representations .pst-dossier-fold-inline>summary,#page-representations .pst-dossier-fold>summary{cursor:pointer;font-size:10px;font-weight:800;color:#2d6f5a}
#page-representations .pst-dossier-fold-inline>summary::-webkit-details-marker,#page-representations .pst-dossier-fold>summary::-webkit-details-marker{display:none}
#page-representations .pst-dossier-fold-inline>summary:before,#page-representations .pst-dossier-fold>summary:before{content:'+';display:inline-block;width:15px;color:#4b8a76}
#page-representations .pst-dossier-fold-inline[open]>summary:before,#page-representations .pst-dossier-fold[open]>summary:before{content:'−'}
#page-representations .pst-dossier-details-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:14px}
#page-representations .pst-dossier-details-grid>div{min-width:0}


/* Përfaqësime dossier v10 — compact overview + expandable operational modules */
#page-representations .pst-dossier-overview{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(420px,.95fr);gap:12px;align-items:stretch}
#page-representations .pst-dossier-side{display:grid;grid-template-rows:auto auto;gap:12px;min-width:0}
#page-representations .pst-dossier-main-card{border:1px solid var(--rep-line);border-radius:15px;background:#fff;padding:16px 18px;min-width:0;box-shadow:0 1px 0 rgba(35,65,55,.015)}
#page-representations .pst-dossier-main-title{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
#page-representations .pst-dossier-main-title h3{margin:1px 0 0;font-size:13px;text-transform:none;letter-spacing:0;color:#243f36}
#page-representations .pst-dossier-main-icon{width:30px;height:30px;flex:0 0 30px;border-radius:9px;display:grid;place-items:center;background:#eaf4fb;color:#2474a9;font-size:15px;font-weight:900}
#page-representations .pst-dossier-company-card .pst-dossier-highlight{font-size:12.5px!important;line-height:1.5!important}
#page-representations .pst-dossier-company-card .pst-dossier-compact{margin-top:10px}
#page-representations .pst-dossier-stage-card{padding-bottom:14px}
#page-representations .pst-dossier-stage-card .pst-rep-quick{margin-top:3px}
#page-representations .pst-dossier-project-card{padding-bottom:13px}
#page-representations .pst-dossier-project-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
#page-representations .pst-dossier-project-title{display:flex;align-items:center;gap:9px;min-width:0}
#page-representations .pst-dossier-project-title h3{margin:0;font-size:12.5px;text-transform:none;letter-spacing:0;color:#243f36;overflow-wrap:anywhere}
#page-representations .pst-dossier-link-btn{border:0;background:transparent;padding:4px 0;color:#29705a;font-size:9.5px;font-weight:800;cursor:pointer;white-space:nowrap}
#page-representations .pst-dossier-project-card .pst-dossier-metrics{margin:0;gap:0}
#page-representations .pst-dossier-project-card .pst-dossier-metric{border:0;border-radius:0;background:transparent;padding:7px 10px;border-left:1px solid #e8efeb}
#page-representations .pst-dossier-project-card .pst-dossier-metric:first-child{border-left:0;padding-left:0}
#page-representations .pst-dossier-metric-row{display:flex;align-items:center;gap:7px}
#page-representations .pst-dossier-metric-icon{width:23px;height:23px;flex:0 0 23px;border-radius:7px;display:grid;place-items:center;background:#edf6f2;color:#2e7c64;font-size:11px;font-weight:900}
#page-representations .pst-dossier-modules{display:grid;gap:7px;margin-top:2px}
#page-representations .pst-dossier-module{border:1px solid var(--rep-line);border-radius:13px;background:#fff;overflow:hidden;min-width:0}
#page-representations .pst-dossier-module>summary{list-style:none;display:grid;grid-template-columns:34px minmax(160px,auto) minmax(0,1fr) 22px;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;user-select:none}
#page-representations .pst-dossier-module>summary::-webkit-details-marker{display:none}
#page-representations .pst-dossier-module>summary:hover{background:#fbfcfc}
#page-representations .pst-dossier-module-title{font-size:11.5px;font-weight:850;color:#253f36;line-height:1.25}
#page-representations .pst-dossier-module-desc{font-size:9.5px;color:#82918c;line-height:1.35;overflow-wrap:anywhere}
#page-representations .pst-dossier-module-icon{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-weight:900;font-size:14px}
#page-representations .pst-dossier-module-icon.gmail{background:#fff0ef;color:#d93025}
#page-representations .pst-dossier-module-icon.strategy{background:#edf8f2;color:#24865f}
#page-representations .pst-dossier-module-icon.project{background:#eef5ff;color:#2775be}
#page-representations .pst-dossier-module-icon.jv{background:#f3efff;color:#6e4bc8}
#page-representations .pst-dossier-module-icon.commercial{background:#fff3e7;color:#d5791d}
#page-representations .pst-dossier-module-icon.notes{background:#fff7dc;color:#b78100}
#page-representations .pst-dossier-chevron{justify-self:end;color:#71857d;font-size:17px;line-height:1;transition:transform .15s ease}
#page-representations .pst-dossier-module[open] .pst-dossier-chevron{transform:rotate(180deg)}
#page-representations .pst-dossier-module-body{border-top:1px solid #edf1ef;padding:15px 17px 17px;min-width:0}
#page-representations .pst-dossier-module.gmail{border-color:#efc9c6}
#page-representations .pst-dossier-module.gmail>summary{background:#fff8f7}
#page-representations .pst-dossier-module.gmail[open]>summary{background:#fff3f1}
#page-representations .pst-dossier-gmail-layout{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:22px;align-items:start}
#page-representations .pst-dossier-gmail-side{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start}
#page-representations .pst-dossier-gmail-action .pst-rep-btn{background:#fff;color:#2474a9;border-color:#c9dce7;white-space:nowrap}
#page-representations .pst-dossier-gmail-action .pst-rep-btn:hover{background:#f6fbfd}
#page-representations .pst-dossier-section-title{margin:0 0 9px;font-size:10.5px;color:#2a493e}
#page-representations .pst-dossier-module-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
#page-representations .pst-dossier-module-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
#page-representations .pst-dossier-module .pst-dossier-summary{margin:0}
#page-representations .pst-dossier-module .pst-dossier-unknowns{margin-top:10px}
#page-representations .pst-rep-btn.gmail-action:before{content:'✉';margin-right:5px}
#page-representations .pst-rep-btn.danger{color:#a64038;border-color:#e3b7b2;background:#fff}
#page-representations .pst-rep-btn.danger:hover{background:#fff7f6}
@media(max-width:1200px){
 #page-representations .pst-dossier-overview{grid-template-columns:minmax(0,1fr)}
 #page-representations .pst-dossier-side{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:auto}
 #page-representations .pst-dossier-gmail-layout{grid-template-columns:minmax(0,1fr)}
}
@media(max-width:860px){
 #page-representations .pst-dossier-side{grid-template-columns:minmax(0,1fr)}
 #page-representations .pst-dossier-module>summary{grid-template-columns:32px minmax(0,1fr) 22px}
 #page-representations .pst-dossier-module-desc{grid-column:2/3;margin-top:-4px}
 #page-representations .pst-dossier-chevron{grid-column:3;grid-row:1/3}
 #page-representations .pst-dossier-project-card .pst-dossier-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
 #page-representations .pst-dossier-project-card .pst-dossier-metric:nth-child(3){border-left:0}
 #page-representations .pst-dossier-gmail-side{grid-template-columns:minmax(0,1fr)}
 #page-representations .pst-dossier-module-grid,#page-representations .pst-dossier-module-grid.three{grid-template-columns:minmax(0,1fr)}
}
@media(max-width:560px){
 #page-representations .pst-dossier-project-card .pst-dossier-metrics{grid-template-columns:minmax(0,1fr)}
 #page-representations .pst-dossier-project-card .pst-dossier-metric{border-left:0;border-top:1px solid #edf1ef;padding:8px 0}
 #page-representations .pst-dossier-project-card .pst-dossier-metric:first-child{border-top:0}
}


/* Përfaqësime profile containment: keep every dossier element inside the viewport. */
body:has(#page-representations.active){overflow-x:hidden}
body:has(#page-representations.active) .app-shell,
body:has(#page-representations.active) .main,
body:has(#page-representations.active) .content,
#page-representations{width:100%;max-width:100%;min-width:0;overflow-x:hidden;box-sizing:border-box}
#page-representations *,
#page-representations *::before,
#page-representations *::after{box-sizing:border-box}

#page-representations .pst-rep-page,
#page-representations .pst-rep-profile-view,
#page-representations [data-rep-detail],
#page-representations .pst-dossier,
#page-representations .pst-dossier-grid,
#page-representations .pst-dossier-grid>*,
#page-representations .pst-dossier-card,
#page-representations .pst-dossier-summary-item,
#page-representations .pst-dossier-contact-grid>*,
#page-representations .pst-dossier-details-grid>*,
#page-representations .pst-dossier .pst-rep-quick>*,
#page-representations .pst-dossier-hero>*,
#page-representations .pst-dossier-actions,
#page-representations .pst-dossier-badges{min-width:0;max-width:100%}

#page-representations .pst-dossier-grid,
#page-representations .pst-dossier-summary,
#page-representations .pst-dossier-contact-grid,
#page-representations .pst-dossier-details-grid,
#page-representations .pst-dossier .pst-rep-quick{width:100%;max-width:100%}

#page-representations .pst-dossier-split,
#page-representations .pst-dossier-details-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
#page-representations .pst-dossier-contact{grid-template-columns:115px minmax(0,1fr)}
#page-representations .pst-dossier-compact{grid-template-columns:180px minmax(0,1fr)}

#page-representations .pst-dossier-highlight,
#page-representations .pst-dossier-pitch,
#page-representations .pst-dossier-contact,
#page-representations .pst-dossier-subbox,
#page-representations .pst-dossier-metric,
#page-representations .pst-dossier-summary-item,
#page-representations .pst-dossier-card p,
#page-representations .pst-dossier-card li,
#page-representations .pst-dossier-card a,
#page-representations .pst-dossier-card b,
#page-representations .pst-dossier-card strong,
#page-representations .pst-dossier-rel>*,
#page-representations .pst-dossier-compact>*,
#page-representations .pst-rep-cell-title,
#page-representations .pst-rep-cell-sub,
#page-representations .pst-rep-next{overflow-wrap:anywhere;word-break:break-word;white-space:normal}

#page-representations .pst-dossier-hero,
#page-representations .pst-dossier-badges,
#page-representations .pst-dossier-actions{flex-wrap:wrap}
#page-representations .pst-dossier-actions .pst-rep-btn,
#page-representations .pst-dossier-actions button,
#page-representations .pst-dossier-actions a{max-width:100%;white-space:normal}

#page-representations input,
#page-representations select,
#page-representations textarea{width:100%;max-width:100%;min-width:0}

@media(max-width:1200px){
 #page-representations .pst-dossier-grid{grid-template-columns:minmax(0,1fr)}
 #page-representations .pst-dossier-card,
 #page-representations .pst-dossier-card.span-6,
 #page-representations .pst-dossier-card.span-8,
 #page-representations .pst-dossier-card.span-12{grid-column:1/-1}
 #page-representations .pst-dossier-summary,
 #page-representations .pst-dossier-contact-grid,
 #page-representations .pst-dossier-details-grid,
 #page-representations .pst-dossier .pst-rep-quick{grid-template-columns:minmax(0,1fr)}
 #page-representations .pst-dossier .pst-rep-quick label:last-child{grid-column:1!important}
}

@media(max-width:1180px){
 #page-representations .pst-rep-table-head,#page-representations .pst-rep-row{grid-template-columns:minmax(190px,1.2fr) 65px minmax(180px,1fr) minmax(180px,1fr) minmax(200px,1.2fr) 150px}
 #page-representations .pst-rep-table-head>*:last-child,#page-representations .pst-rep-row>*:last-child{display:none}
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
 #page-representations .pst-dossier-summary,#page-representations .pst-dossier-contact-grid,#page-representations .pst-dossier-details-grid{grid-template-columns:1fr}
 #page-representations .pst-dossier .pst-rep-quick{grid-template-columns:1fr}#page-representations .pst-dossier .pst-rep-quick label:last-child{grid-column:1!important}
 #page-representations .pst-dossier-rel{grid-template-columns:1fr;gap:3px}
 #page-representations .pst-dossier-compact{grid-template-columns:115px minmax(0,1fr)}
}
`;document.head.appendChild(s);
}
function ensurePage(){
 css();dossierCss();var p=document.getElementById('page-representations');if(p)return p;
 var host=document.querySelector('.content')||document.body;p=document.createElement('div');p.id='page-representations';p.className='page';p.style.display='none';
 p.innerHTML='<div class="pst-rep-page"><div class="pst-rep-topline"><button class="pst-rep-btn pst-rep-back-primary" data-rep-back>← Kthehu</button></div><header class="pst-rep-head pst-rep-intro"><div><div class="pst-rep-eye">DY DEGË PUNE · PËRFAQËSI · TENDERË / JV</div><h1>Përfaqësime</h1><p>Menaxho veçmas kompanitë që duam t’i përfaqësojmë në Kosovë dhe partnerët që na duhen për tenderë, JV ose konsorcium.</p></div></header><div class="pst-rep-controls"><div class="pst-rep-control"><button class="pst-rep-btn pst-rep-control-toggle" type="button" data-rep-toggle="pipeline" aria-expanded="false">Fazat <span data-rep-pipeline-summary>Të gjitha</span></button><div class="pst-rep-control-menu" data-rep-menu="pipeline" hidden><div class="pst-rep-pipeline" data-rep-pipeline></div></div></div><div class="pst-rep-control"><button class="pst-rep-btn pst-rep-control-toggle" type="button" data-rep-toggle="filters" aria-expanded="false">Filtra <span data-rep-filter-summary>Kërkim & renditje</span></button><div class="pst-rep-control-menu filters" data-rep-menu="filters" hidden><div class="pst-rep-toolbar"><input data-rep-search type="search" placeholder="Kërko kompani ose domen…"><select data-rep-country></select><select data-rep-sector></select><select data-rep-capital></select><select data-rep-sort><option value="priority">Prioriteti më i lartë</option><option value="updated">Përditësuar së fundi</option><option value="due">Veprimi i radhës më afër</option><option value="company">Kompania A–Z</option></select></div></div></div></div><div class="pst-rep-list-view" data-rep-list-view><main class="pst-rep-card pst-rep-index"><div class="pst-rep-table-head"><span>Kompania</span><span>Vendi</span><span>Produktet / sektori</span><span>Pse Kosova</span><span>Modeli / territori</span><span>Kontakti</span><span>Statusi</span></div><div data-rep-list></div></main></div><section class="pst-rep-profile-view" data-rep-profile-view hidden><div data-rep-detail></div></section></div>';
 host.appendChild(p);
 p.querySelector('[data-rep-back]').onclick=back;
 p.querySelectorAll('[data-rep-toggle]').forEach(function(btn){btn.onclick=function(){var name=btn.getAttribute('data-rep-toggle'),menu=p.querySelector('[data-rep-menu="'+name+'"]'),opening=menu&&menu.hidden;p.querySelectorAll('[data-rep-menu]').forEach(function(x){x.hidden=true});p.querySelectorAll('[data-rep-toggle]').forEach(function(x){x.setAttribute('aria-expanded','false')});if(menu&&opening){menu.hidden=false;btn.setAttribute('aria-expanded','true')}}});
 p.querySelector('[data-rep-search]').oninput=function(){state.query=this.value;render()};
 [['country','[data-rep-country]'],['sector','[data-rep-sector]'],['capital','[data-rep-capital]'],['sort','[data-rep-sort]']].forEach(function(x){p.querySelector(x[1]).onchange=function(){state[x[0]]=this.value;render()}});
 function openRow(r){if(!r)return;state.selected=r.dataset.repId;state.view='profile';render();try{window.scrollTo({top:0,behavior:'smooth'})}catch(_){try{window.scrollTo(0,0)}catch(__){}}}
 p.querySelector('[data-rep-list]').addEventListener('click',function(e){openRow(e.target.closest('[data-rep-id]'))});
 p.querySelector('[data-rep-list]').addEventListener('keydown',function(e){if(e.key!=='Enter'&&e.key!==' ')return;var r=e.target.closest('[data-rep-id]');if(!r)return;e.preventDefault();openRow(r)});
 p.querySelector('[data-rep-pipeline]').addEventListener('click',function(e){var b=e.target.closest('[data-rep-pipe]');if(!b)return;state.stage=b.dataset.repPipe;var menu=p.querySelector('[data-rep-menu="pipeline"]'),toggle=p.querySelector('[data-rep-toggle="pipeline"]');if(menu)menu.hidden=true;if(toggle)toggle.setAttribute('aria-expanded','false');render()});
 p.querySelector('[data-rep-detail]').addEventListener('click',detailClick);
 p.querySelector('[data-rep-detail]').addEventListener('change',detailChange);
 return p;
}
function activeRows(){return representationRows()}
function filtered(){
 var q=N(state.query),rows=representationRows().filter(function(r){
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
 if(r.capital_fit==='poor')out.push('Përshtatja financiare i dobët');
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
var SQ_TEXT={
 'Global T&D EPC contractor with turnkey transmission-line, substation and EHV cabling capabilities.':'Kontraktor global EPC për T&D, me kapacitete për linja transmetimi, nënstacione dhe kabllo EHV me çelës në dorë.',
 'Global infrastructure EPC company with integrated engineering, procurement, manufacturing and execution capabilities in Power T&D.':'Kompani globale EPC e infrastrukturës, me kapacitete të integruara në inxhinieri, prokurim, prodhim dhe ekzekutim në transmetim dhe shpërndarje të energjisë.',
 'Power Transmission & Distribution EPC':'EPC për transmetim dhe shpërndarje të energjisë',
 'Transmission lines, substations and EHV cabling':'Linja transmetimi, nënstacione dhe kabllo EHV',
 'Transmission lines, substations and underground cabling':'Linja transmetimi, nënstacione dhe kabllo nëntokësore',
 'Substations, transmission lines and grid infrastructure':'Nënstacione, linja transmetimi dhe infrastrukturë e rrjetit',
 'High-voltage lines, substations and lattice towers':'Linja të tensionit të lartë, nënstacione dhe shtylla rrjetë',
 'Power infrastructure EPC':'EPC për infrastrukturë energjetike',
 'Power transmission infrastructure':'Infrastrukturë e transmetimit të energjisë',
 'Transmission system operators, utilities and IFI-funded grid projects.':'Operatorë të sistemit të transmetimit, ndërmarrje energjetike dhe projekte të rrjetit të financuara nga IFI.',
 'Technical fit for transmission-line, substation and steel-structure components of KOSTT Transmission Grid Strengthening, EBRD Project 55387.':'Përshtatje teknike për komponentët e linjave të transmetimit, nënstacioneve dhe strukturave të çelikut në projektin KOSTT Transmission Grid Strengthening, EBRD 55387.',
 'Direct regional fit for KOSTT Transmission Grid Strengthening, EBRD Project 55387.':'Përshtatje e drejtpërdrejtë rajonale për projektin KOSTT Transmission Grid Strengthening, EBRD 55387.',
 'Technical fit for KOSTT Transmission Grid Strengthening, EBRD Project 55387, subject to confirming project/package size appetite.':'Përshtatje teknike për KOSTT Transmission Grid Strengthening, EBRD 55387, duke verifikuar interesin për madhësinë e projektit/paketës.',
 'Project-specific fit for KOSTT Transmission Grid Strengthening, EBRD Project 55387.':'Përshtatje specifike për projektin KOSTT Transmission Grid Strengthening, EBRD 55387.',
 'KOSTT 55387 is approved by EBRD and covers rehabilitation/upgrading of HV substations, transformers and transmission assets, including a new underground double-circuit cable.':'KOSTT 55387 është miratuar nga EBRD dhe përfshin rehabilitimin/përmirësimin e nënstacioneve HV, transformatorëve dhe aseteve të transmetimit, përfshirë një kabllo të re nëntokësore me qark të dyfishtë.',
 'KOSTT 55387 is approved by EBRD and includes 110 kV substation upgrades, transformers and transmission-network rehabilitation.':'KOSTT 55387 është miratuar nga EBRD dhe përfshin përmirësime të nënstacioneve 110 kV, transformatorë dhe rehabilitim të rrjetit të transmetimit.',
 'KOSTT 55387 is approved by EBRD and includes HV substation, transformer and transmission-network renewal.':'KOSTT 55387 është miratuar nga EBRD dhe përfshin rinovimin e nënstacioneve HV, transformatorëve dhe rrjetit të transmetimit.',
 'KOSTT 55387 is approved by EBRD and includes HV substation, transformer, transmission-network and underground-cable investments.':'KOSTT 55387 është miratuar nga EBRD dhe përfshin investime në nënstacione HV, transformatorë, rrjet transmetimi dhe kabllo nëntokësore.',
 'Strong T&D EPC fit for transmission lines, substations and EHV cabling.':'Përshtatje e fortë EPC/T&D për linja transmetimi, nënstacione dhe kabllo EHV.',
 'Strong regional T&D fit for HV substations, transmission lines and consortium execution.':'Përshtatje e fortë rajonale T&D për nënstacione HV, linja transmetimi dhe ekzekutim në konsorcium.',
 'Very strong fit for HV lines, substations, underground cable work and related power infrastructure.':'Përshtatje shumë e fortë për linja HV, nënstacione, punime me kabllo nëntokësore dhe infrastrukturë energjetike përkatëse.',
 'Large global T&D EPC with end-to-end line, substation and underground-cabling capability.':'EPC global i madh në T&D, me kapacitete të plota për linja, nënstacione dhe kabllo nëntokësore.',
 'Global EPC rather than established Kosovo-local operator.':'EPC global, jo operator i vendosur lokalisht në Kosovë.',
 'Deep Western Balkans footprint including Bosnia and Herzegovina, Serbia, Montenegro, North Macedonia, Croatia and Slovenia.':'Prani e thellë në Ballkanin Perëndimor, përfshirë Bosnjë e Hercegovinën, Serbinë, Malin e Zi, Maqedoninë e Veriut, Kroacinë dhe Slloveninë.',
 'European/SEE contractor with relevant cross-border transmission experience.':'Kontraktor evropian/SEE me përvojë relevante në transmetim ndërkufitar.',
 'Group has European operating presence, including Croatia through the wider group structure; exact Western Balkans commercial ownership requires verification.':'Grupi ka prani operative në Evropë, përfshirë Kroacinë përmes strukturës më të gjerë të grupit; përgjegjësia komerciale për Ballkanin Perëndimor duhet verifikuar.',
 'Cost-efficient localisation: KEC retains EPC, engineering, qualifications and guarantees; PriSteel provides a Kosovo execution layer where economically useful.':'Lokalizim me kosto efikase: KEC mban EPC-në, inxhinierinë, kualifikimet dhe garancitë; PriSteel ofron shtresën e ekzekutimit në Kosovë aty ku ka kuptim ekonomik.',
 'Not a Balkan market-entry pitch. ELNOS already knows the region; PriSteel must offer a Kosovo-specific execution/interface advantage.':'Jo prezantim për hyrje në Ballkan. ELNOS e njeh rajonin; PriSteel duhet të ofrojë avantazh konkret në ekzekutim dhe ndërfaqe lokale në Kosovë.',
 'Do not pitch PriSteel as replacing Electromontaj tower manufacturing. Focus on avoiding duplicated local setup and providing Kosovo execution support.':'PriSteel nuk duhet prezantuar si zëvendësim i prodhimit të shtyllave të Electromontaj. Fokusi duhet të jetë shmangia e strukturës lokale të dyfishtë dhe mbështetja e ekzekutimit në Kosovë.',
 'Lower KPILs cost and complexity of entering/executing in Kosovo while KPIL retains EPC, engineering, qualifications, specialist electrical scope and guarantees.':'Të ulet kostoja dhe kompleksiteti i hyrjes/ekzekutimit të KPIL në Kosovë, ndërsa KPIL mban EPC-në, inxhinierinë, kualifikimet, pjesën specialistike elektrike dhe garancitë.',
 'Kosovo market and tender intelligence':'Informacion për tregun dhe tenderët në Kosovë',
 'local sourcing':'furnizim lokal',
 'fabrication network':'rrjet fabrikimi',
 'logistics':'logjistikë',
 'site subcontractor coordination':'koordinim i nënkontraktorëve në kantier',
 'local project interface':'ndërfaqe lokale e projektit',
 'Kosovo-specific project intelligence':'informacion specifik për projektin në Kosovë',
 'local fabrication where useful':'fabrikim lokal aty ku është i dobishëm',
 'site resources/subcontractors':'resurse dhe nënkontraktorë lokalë në kantier',
 'Kosovo interface and coordination':'ndërfaqe dhe koordinim në Kosovë',
 'Kosovo local civil/site support':'mbështetje lokale civile dhe në kantier në Kosovë',
 'secondary/local fabrication where useful':'fabrikim dytësor/lokal aty ku është i dobishëm',
 'local material procurement':'prokurim lokal i materialeve',
 'workforce/subcontractor coordination':'koordinim i fuqisë punëtore dhe nënkontraktorëve',
 'Kosovo interface':'ndërfaqe lokale në Kosovë',
 'Kosovo market-entry/execution platform':'platformë lokale për hyrje dhe ekzekutim në Kosovë',
 'tender intelligence':'informacion për tenderët',
 'local sourcing and fabrication':'furnizim dhe fabrikim lokal',
 'subcontractor coordination':'koordinim i nënkontraktorëve',
 'site support':'mbështetje në kantier',
 'future Kosovo T&D pipeline':'pipeline i ardhshëm T&D në Kosovë',
 'Exact KOSTT packages and qualification criteria are not yet public':'Paketat e sakta të KOSTT dhe kriteret e kualifikimit ende nuk janë publike',
 'Correct international/Europe T&D decision-maker still to verify':'Personi vendimmarrës për T&D ndërkombëtare/evropiane ende duhet verifikuar',
 'No assumption that local sourcing is cheaper until package/BOQ is known':'Nuk supozojmë se furnizimi lokal është më i lirë pa u njohur paketa/BOQ',
 'ELNOS can be both partner candidate and competitor':'ELNOS mund të jetë njëkohësisht kandidat për partneritet dhe konkurrent',
 'Strong regional capability reduces the value of a generic representation proposition':'Kapaciteti i fortë rajonal e zvogëlon vlerën e një propozimi të përgjithshëm për përfaqësim',
 'Kosovo relationship history must be checked before outreach':'Historiku i marrëdhënieve në Kosovë duhet kontrolluar para kontaktimit',
 'Own manufacturing weakens a generic fabrication pitch':'Prodhimi i vet e dobëson një ofertë të përgjithshme për fabrikim',
 'Exact package structure is not public':'Struktura e saktë e paketave ende nuk është publike',
 'Need current Kosovo/Balkan relationship check':'Duhet kontrolluar gjendja aktuale e marrëdhënieve në Kosovë/Ballkan',
 'KOSTT package size may be small relative to KPILs global portfolio':'Madhësia e paketës KOSTT mund të jetë e vogël krahasuar me portofolin global të KPIL',
 'Need to identify Europe/Balkans T&D decision-maker':'Duhet identifikuar vendimmarrësi T&D për Evropë/Ballkan',
 'Exact procurement packages and qualification rules are not yet public':'Paketat e sakta të prokurimit dhe rregullat e kualifikimit ende nuk janë publike',
 'Corporate contact — route to International T&D':'Kontakt qendror — për t’u drejtuar te T&D Ndërkombëtare',
 'Elnos Group HQ — route to Transmission & Substations':'Selia e Elnos Group — për t’u drejtuar te Transmetimi & Nënstacionet',
 'Central office — route to International HV Projects':'Zyra qendrore — për t’u drejtuar te Projektet Ndërkombëtare HV',
 'Business Enquiries — route to T&D International / BD International':'Kërkesa biznesi — për t’u drejtuar te T&D / Zhvillimi i Biznesit Ndërkombëtar',
 'Operator-selected active candidate for KOSTT / EBRD 55387.':'Kandidat aktiv për KOSTT / EBRD 55387, i përzgjedhur nga ne.',
 'No email is authorized or sent by this registration.':'Asnjë email nuk autorizohet ose dërgohet nga ky regjistrim.',
 'No public evidence found of a Kosovo office or established local partner in the screening performed so far; absence of public evidence is not proof of no relationship.':'Nuk u gjet evidencë publike për zyrë në Kosovë ose partner lokal të vendosur në kontrollin e deritanishëm; mungesa e evidencës publike nuk provon se nuk ka marrëdhënie.',
 'No Kosovo office identified in the current public screening; project-level Kosovo relationships still require verification.':'Nuk u identifikua zyrë në Kosovë në kontrollin publik aktual; marrëdhëniet në nivel projekti në Kosovë ende duhet verifikuar.',
 'No public Prania në Kosovë identified in the current screening; absence of public evidence is not proof of no relationship.':'Nuk u identifikua prani publike në Kosovë në kontrollin aktual; mungesa e evidencës publike nuk provon se nuk ka marrëdhënie.',
 'No public evidence of a Kosovo office/partner was found in the current screening check; absence of public evidence is not proof of no relationship.':'Nuk u gjet evidencë publike për zyrë/partner në Kosovë në kontrollin aktual; mungesa e evidencës publike nuk provon se nuk ka marrëdhënie.',
 'No public Prania në Kosovë found in the current screening check. KPIL group has a European operating footprint through its wider group structure; exact responsibility for Kosovo/Western Balkans must be verified.':'Nuk u gjet prani publike e KPIL në Kosovë në kontrollin aktual. Grupi ka prani operative evropiane përmes strukturës së tij më të gjerë; përgjegjësia e saktë për Kosovën/Ballkanin Perëndimor duhet verifikuar.',
 'Official group footprint includes Bosnia and Herzegovina, Serbia, Montenegro, North Macedonia, Croatia and Slovenia. No Kosovo office was identified in the current public screening; this does not rule out project-level relationships.':'Prania zyrtare e grupit përfshin Bosnjë e Hercegovinën, Serbinë, Malin e Zi, Maqedoninë e Veriut, Kroacinë dhe Slloveninë. Nuk u identifikua zyrë në Kosovë; kjo nuk përjashton marrëdhënie në nivel projekti.',
 'Active KOSTT 55387 lead-EPC candidate selected for project-specific comparison. PriSteel value thesis: Kosovo interface, local sourcing/fabrication/logistics and site support; verify exact package structure before outreach.':'Kandidat aktiv lead-EPC për KOSTT 55387, i përzgjedhur për krahasim specifik të projektit. Vlera e PriSteel: ndërfaqe lokale në Kosovë, furnizim/fabrikim/logjistikë dhe mbështetje në kantier; struktura e paketave duhet verifikuar para kontaktimit.',
 'Active KOSTT 55387 candidate. PriSteel value must be Kosovo-specific local execution/interface, sourcing and site coordination rather than a generic Balkan-entry pitch.':'Kandidat aktiv për KOSTT 55387. Vlera e PriSteel duhet të jetë ekzekutim/ndërfaqe lokale në Kosovë, furnizim dhe koordinim në kantier, jo një prezantim i përgjithshëm për hyrje në Ballkan.',
 'Active KOSTT 55387 candidate. PriSteel thesis should focus on Kosovo interface, local sourcing/fabrication where useful, logistics and site support rather than duplicating Electromontaj\'s own tower-manufacturing capabilities.':'Kandidat aktiv për KOSTT 55387. Qasja e PriSteel duhet të fokusohet në ndërfaqen lokale në Kosovë, furnizim/fabrikim aty ku ka kuptim, logjistikë dhe mbështetje në kantier, pa dyfishuar kapacitetet e Electromontaj për prodhimin e shtyllave.',
 'Active KOSTT 55387 candidate. Approach thesis is Kosovo-local execution/interface, tender intelligence, sourcing/fabrication, logistics and site support while KPIL retains EPC/engineering/qualification responsibility. Confirm project appetite because KPIL is a very large group.':'Kandidat aktiv për KOSTT 55387. Qasja është ekzekutim/ndërfaqe lokale në Kosovë, informacion për tenderin, furnizim/fabrikim, logjistikë dhe mbështetje në kantier, ndërsa KPIL mban përgjegjësinë EPC/inxhinieri/kualifikim. Duhet konfirmuar interesi për projektin sepse KPIL është grup shumë i madh.',
 'Prior research found a competitive international transmission tender benchmark; retain as internal signal and re-verify before external use.':'Kërkimi i mëparshëm gjeti një benchmark konkurrues në një tender ndërkombëtar transmetimi; të mbahet si sinjal i brendshëm dhe të riverifikohet para përdorimit të jashtëm.',
 'Prior research found a close price benchmark to KEC in a Moldova transmission tender, but the JV bid was non-responsive; treat price only as an internal historical signal.':'Kërkimi i mëparshëm gjeti një benchmark çmimi të afërt me KEC në një tender transmetimi në Moldavi, por oferta e JV ishte jo-responsive; çmimi të trajtohet vetëm si sinjal historik i brendshëm.',
 'Electromontaj has its own steel lattice tower production/testing capability.':'Electromontaj ka kapacitet të vetin për prodhim dhe testim të shtyllave rrjetë prej çeliku.',
 'Prior research identified current consortium precedent with Dalekovod and Kodar on the 400 kV Bitola–Ohrid–Albania-border project.':'Kërkimi i mëparshëm identifikoi precedent aktual konsorciumi me Dalekovod dhe Kodar në projektin 400 kV Bitola–Ohër–kufiri me Shqipërinë.',
 'We believe KEC’s international T&D EPC capability could be combined effectively with PriSteel’s Kosovo-based sourcing, logistics, site support and local execution coordination for this opportunity.':'Kapaciteti ndërkombëtar EPC/T&D i KEC mund të kombinohet me furnizimin lokal, logjistikën, mbështetjen në kantier dhe koordinimin e ekzekutimit nga PriSteel në Kosovë.',
 'Given Elnos Group’s strong regional high-voltage experience, PriSteel could add a Kosovo-specific local layer for sourcing, logistics, site resources and project coordination.':'Duke pasur parasysh përvojën e fortë rajonale të Elnos Group në tension të lartë, PriSteel mund të shtojë shtresën lokale në Kosovë për furnizim, logjistikë, resurse në kantier dhe koordinim projekti.',
 'Electromontaj’s high-voltage EPC and manufacturing capabilities could be complemented by PriSteel with Kosovo-specific local sourcing, logistics, site support and execution coordination where useful.':'Kapacitetet EPC dhe prodhuese të Electromontaj në tension të lartë mund të plotësohen nga PriSteel me furnizim lokal, logjistikë, mbështetje në kantier dhe koordinim ekzekutimi në Kosovë aty ku është e dobishme.',
 'PriSteel could provide KPIL with a practical Kosovo execution and market interface, supporting local sourcing, logistics, subcontractor coordination and site activities without requiring a full local setup from the outset.':'PriSteel mund t’i ofrojë KPIL një ndërfaqe praktike për tregun dhe ekzekutimin në Kosovë, me furnizim lokal, logjistikë, koordinim të nënkontraktorëve dhe aktivitete në kantier pa kërkuar ngritje të plotë lokale që në fillim.',
 'Complete the KEC × KOSTT 55387 playbook and identify the correct T&D decision-maker after procurement/package details emerge.':'Plotëso analizën KEC × KOSTT 55387 dhe identifiko vendimmarrësin e duhur T&D sapo të publikohen detajet e prokurimit/paketave.',
 'Verify Kosovo relationship history and build the ELNOS-specific PriSteel scope for KOSTT 55387 before outreach.':'Verifiko historikun e marrëdhënieve në Kosovë dhe përcakto fushën specifike të PriSteel për ELNOS në KOSTT 55387 para kontaktimit.',
 'Build Electromontaj × KOSTT 55387 scope split and verify Kosovo/Balkan relationships before outreach.':'Përcakto ndarjen e fushës Electromontaj × KOSTT 55387 dhe verifiko marrëdhëniet në Kosovë/Ballkan para kontaktimit.',
 'Identify the Europe/Balkans T&D owner, confirm project appetite, and complete the KPIL × KOSTT 55387 playbook before outreach.':'Identifiko përgjegjësin T&D për Evropë/Ballkan, konfirmo interesin për projektin dhe plotëso analizën KPIL × KOSTT 55387 para kontaktimit.',
 'turnkey transmission lines':'linja transmetimi me çelës në dorë','AIS substations':'nënstacione AIS','GIS substations':'nënstacione GIS',
 'EHV underground cabling':'kabllo nëntokësore EHV','transmission towers':'shtylla transmetimi','AIS substations up to 400 kV':'nënstacione AIS deri në 400 kV',
 'GIS substation works':'punime në nënstacione GIS','HVDC installation works':'punime instalimi HVDC','transmission lines':'linja transmetimi',
 'electrical infrastructure':'infrastrukturë elektrike','high-voltage transmission lines':'linja transmetimi të tensionit të lartë',
 '110–400 kV substations':'nënstacione 110–400 kV','steel lattice towers':'shtylla rrjetë prej çeliku','tower testing':'testim i shtyllave','underground cabling':'kabllo nëntokësore'
};
function sqText(v){var s=S(v).trim();return SQ_TEXT[s]||s}
function sqList(v){return A(v).map(sqText)}
function fitLabel(v){return v==='verified'?'E verifikuar':v==='review'?'Për shqyrtim':v==='rejected'?'E refuzuar':v==='unknown'?'E panjohur':sqText(v)}
function classLabel(v){return v==='active_project_partner_candidate'?'Kandidat aktiv për partneritet projekti':v==='active_project_partner_candidate_and_competitor'?'Kandidat aktiv dhe konkurrent i mundshëm':sqText(v)}
function outreachLabel(v){return v==='not_authorized'?'Kontaktimi ende i paautorizuar':v==='authorized'?'Kontaktimi i autorizuar':sqText(v)}
function modelLabel(v){var x=MODELS.find(function(i){return i[0]===v});return x?x[1]:sqText(v)}
function targetTypeLabel(v){var x=TARGET_TYPES.find(function(i){return i[0]===v});return x?x[1]:sqText(v)}

function render(){
 var p=ensurePage(),act=activeRows();
 var counts={};act.forEach(function(r){counts[r.stage]=(counts[r.stage]||0)+1});
 p.querySelector('[data-rep-pipeline]').innerHTML='<button class="pst-rep-pipe '+(!state.stage?'on':'')+'" data-rep-pipe=""><span>Të gjitha</span><b>'+act.length+'</b></button>'+STAGES.map(function(x){return'<button class="pst-rep-pipe '+(state.stage===x[0]?'on':'')+'" data-rep-pipe="'+x[0]+'"><span>'+E(x[1])+'</span><b>'+(counts[x[0]]||0)+'</b></button>'}).join('');
 var pipeSummary=p.querySelector('[data-rep-pipeline-summary]');if(pipeSummary)pipeSummary.textContent=state.stage?stageLabel(state.stage):'Të gjitha';
 p.querySelector('[data-rep-country]').innerHTML='<option value="">Të gjitha vendet</option>'+uniq('country').map(function(v){return'<option'+(state.country===v?' selected':'')+'>'+E(v)+'</option>'}).join('');
 p.querySelector('[data-rep-sector]').innerHTML='<option value="">Të gjithë sektorët</option>'+uniq('sector').map(function(v){return'<option'+(state.sector===v?' selected':'')+'>'+E(v)+'</option>'}).join('');
 p.querySelector('[data-rep-capital]').innerHTML=opts(CAPITAL,state.capital,'Të gjitha përshtatjet financiare');
 p.querySelector('[data-rep-sort]').value=state.sort;
 var filterCount=[state.query,state.country,state.sector,state.capital,state.sort!=='priority'?state.sort:''].filter(Boolean).length,filterSummary=p.querySelector('[data-rep-filter-summary]');if(filterSummary)filterSummary.textContent=filterCount?filterCount+' aktivë':'Kërkim & renditje';
 var listView=p.querySelector('[data-rep-list-view]'),profileView=p.querySelector('[data-rep-profile-view]'),rows=filtered(),list=p.querySelector('[data-rep-list]'),controls=p.querySelector('.pst-rep-controls'),intro=p.querySelector('.pst-rep-intro'),switcher=p.querySelector('[data-rep-switch]');
 if(state.view==='profile'&&!selected())state.view='list';
 listView.hidden=state.view==='profile';profileView.hidden=state.view!=='profile';if(controls)controls.style.display=state.view==='profile'?'none':'';if(intro)intro.style.display=state.view==='profile'?'none':'';if(switcher)switcher.style.display=state.view==='profile'?'none':'';
 if(state.loading)list.innerHTML='<div class="pst-rep-empty"><b>Duke lexuar listën…</b></div>';
 else if(state.error)list.innerHTML='<div class="pst-rep-empty"><b>Nuk u lexuan kompanitë</b>'+E(state.error)+'</div>';
 else if(!rows.length)list.innerHTML='<div class="pst-rep-empty"><b>Nuk ka ende kompani për Përfaqësi në Kosovë</b><span>Kompanitë e tenderëve, JV dhe konsorciumeve shfaqen vetëm në Degën 2.</span></div>';
 else list.innerHTML=rows.map(function(r){
  var tech=sqText(r.product_summary||r.product_category||r.sector||'—'),
      why=sqText(r.why_kosovo||r.market_evidence||r.strategic_fit_notes||'—'),
      model=[modelLabel(r.target_model||'unknown'),r.target_territory].filter(Boolean).join(' · '),
      contact=r.contact_email?r.contact_email:'Kontakti mungon';
  return '<div class="pst-rep-row" data-rep-id="'+E(r.id)+'" role="button" tabindex="0" aria-label="Hap dosjen e '+E(r.company_name)+'">'
   +'<div class="pst-rep-company"><b>'+E(r.company_name)+'</b><small>'+E(r.company_domain_normalized||r.company_website||r.source_key)+'</small></div>'
   +'<span><span class="pst-rep-cell-title">'+E(r.country||'—')+'</span><span class="pst-rep-cell-sub">'+E(short(r.headquarters,42))+'</span></span>'
   +'<span><span class="pst-rep-cell-title">'+E(short(tech,92))+'</span><span class="pst-rep-cell-sub">'+E(short(sqText(r.product_category||r.sector),65))+'</span></span>'
   +'<span><span class="pst-rep-cell-title">'+E(short(why,100))+'</span><span class="pst-rep-cell-sub">'+E(kosovoLabel(r.kosovo_presence))+'</span></span>'
   +'<span><span class="pst-rep-cell-title">'+E(short(model||'—',100))+'</span><span class="pst-rep-cell-sub">'+E(capitalLabel(r.capital_fit))+'</span></span>'
   +'<span><span class="pst-rep-cell-title">'+E(contact)+'</span><span class="pst-rep-cell-sub">'+E(short(sqText(r.contact_role),58))+'</span></span>'
   +'<span><i class="pst-rep-chip">'+E(stageLabel(r.stage))+'</i></span></div>';
 }).join('');
 if(!selected()&&rows.length)state.selected=rows[0].id;
 if(state.view==='profile')renderDetail();else profileView.querySelector('[data-rep-detail]').innerHTML='';
 renderHome();
 if(state.inlineHost&&state.inlineHost.isConnected&&selected())renderDetail(state.inlineHost);
}

function facts(pairs){return'<div class="pst-rep-facts">'+pairs.map(function(x){return'<span>'+E(x[0])+'</span><span>'+E(x[1]==null||x[1]===''?'—':x[1])+'</span>'}).join('')+'</div>'}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null}catch(e){return null}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow()}catch(e){return sessionNow()}}
function gmailDraftUrl(r){return r&&r.gmail_thread_id?'https://mail.google.com/mail/u/0/#drafts/'+encodeURIComponent(r.gmail_thread_id):''}
function gmailThreadUrl(r){return r&&r.gmail_thread_id?'https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(r.gmail_thread_id):''}
function draftButton(r,variant){
 var busy=!!state.draftBusy[S(r&&r.id)],inline=variant==='inline',cls='pst-rep-btn '+(inline?'gmail-inline':'primary gmail-action');
 if(r&&r.gmail_draft_id&&r.gmail_thread_id)return '<button class="'+cls+'" data-rep-act="open-draft">Hap draftin në Gmail</button>';
 if(r&&r.target_type==='representation')return '<button class="pst-rep-btn" disabled title="Teksti i outreach për përfaqësi duhet aprovuar para krijimit të draftit">Draft për përfaqësi — tekst për aprovim</button>';
 if(r&&r.contact_email)return '<button class="'+cls+'" data-rep-act="create-draft"'+(busy?' disabled':'')+'>'+(busy?'Duke krijuar draft…':'Krijo draft në Gmail')+'</button>';
 return '<button class="pst-rep-btn" disabled>Kontakti mungon</button>';
}
async function callRepresentationDraft(r){
 var id=S(r&&r.id);if(!id||state.draftBusy[id])return;
 state.draftBusy[id]=true;state.draftResult[id]=null;renderDetail();
 try{
  var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Lidhja me sistemin nuk është gati.');
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
function openRepresentationThread(r){
 var u=gmailThreadUrl(r);if(!u){toast('Nuk ka bisedë Gmail të regjistruar për këtë kompani.',true);return}
 window.open(u,'_blank','noopener');
}
function moduleHead(kind,icon,title,desc){
 return '<summary><span class="pst-dossier-module-icon '+kind+'" aria-hidden="true">'+icon+'</span><span class="pst-dossier-module-title">'+E(title)+'</span><span class="pst-dossier-module-desc">'+E(desc)+'</span><span class="pst-dossier-chevron" aria-hidden="true">⌄</span></summary>';
}
function renderRepresentationDetail(host){
 var h=host||ensurePage().querySelector('[data-rep-detail]'),r=selected();if(!h)return;
 if(!r){h.innerHTML='<div class="pst-rep-empty"><b>Zgjidh një kompani për përfaqësim</b></div>';return}
 var rels=relationshipsFor(r.id),warn=warnings(r),products=A(r.products),sourceLink=r.source_url||r.company_website||'',contactLink=r.contact_source||'',
     model=modelLabel(r.target_model||'unknown'),gmailError=state.draftResult[S(r.id)]&&state.draftResult[S(r.id)].error?state.draftResult[S(r.id)].error:'';

 h.innerHTML='<div class="pst-dossier">'
  +'<header class="pst-dossier-hero"><div><div class="pst-dossier-eye">PËRFAQËSI NË KOSOVË · PROFIL I KOMPANISË</div><h2>'+E(r.company_name)+'</h2><div class="pst-dossier-meta">'+E([r.headquarters,r.country,'Target për përfaqësim'].filter(Boolean).join(' · '))+(r.company_website?' · <a href="'+E(r.company_website)+'" target="_blank" rel="noopener">'+E(r.company_domain_normalized||r.company_domain||'Faqja e internetit')+' ↗</a>':'')+'</div><div class="pst-dossier-badges"><span class="pst-rep-chip">'+E(stageLabel(r.stage))+'</span><span class="pst-rep-chip">'+E(model)+'</span><span class="pst-rep-chip neutral">'+E(kosovoLabel(r.kosovo_presence))+'</span></div></div><div class="pst-dossier-actions">'+draftButton(r)+'<button class="pst-rep-btn" data-rep-act="edit">✎ Edito kompaninë</button><button class="pst-rep-btn danger" data-rep-act="archive">▢ Arkivo / Mbylle</button></div></header>'
  +(warn.length?'<div class="pst-rep-warn"><b>Kërkon vëmendje:</b> '+E(warn.join(' · '))+'</div>':'')
  +'<div class="pst-dossier-overview">'
   +'<section class="pst-dossier-main-card pst-dossier-company-card"><div class="pst-dossier-main-title"><span class="pst-dossier-main-icon" aria-hidden="true">▦</span><div><h3>Kush është kompania</h3></div></div><p class="pst-dossier-highlight">'+E(sqText(r.manufacturer_description||r.product_summary||'—'))+'</p>'+(r.product_summary&&r.product_summary!==r.manufacturer_description?'<p>'+E(sqText(r.product_summary))+'</p>':'')+'<div class="pst-dossier-tags">'+products.map(function(x){return'<span class="pst-dossier-tag">'+E(sqText(x))+'</span>'}).join('')+'</div>'+compactRows([['Sektori',sqText(r.sector)],['Kategoria',sqText(r.product_category)],['Konsumatorët potencialë',sqText(r.potential_customer_types)]])+(sourceLink?'<a class="pst-dossier-source" href="'+E(sourceLink)+'" target="_blank" rel="noopener">Hap burimin e kompanisë →</a>':'')+'</section>'
   +'<div class="pst-dossier-side">'
    +'<section class="pst-dossier-main-card pst-dossier-stage-card"><div class="pst-dossier-main-title"><span class="pst-dossier-main-icon" aria-hidden="true">◎</span><div><h3>Faza dhe veprimi</h3></div></div><div class="pst-rep-quick"><label>Faza<select data-rep-quick="stage">'+opts(STAGES,r.stage)+'</select></label><label>Afati<input data-rep-quick="next_action_due" type="date" value="'+E(r.next_action_due||'')+'"></label><label>Veprimi i radhës<input data-rep-quick="next_action" value="'+E(r.next_action||'')+'" placeholder="Veprimi i radhës"></label></div></section>'
    +'<section class="pst-dossier-main-card pst-dossier-project-card"><div class="pst-dossier-project-head"><div class="pst-dossier-project-title"><span class="pst-dossier-main-icon" aria-hidden="true">◇</span><h3>Mundësia e përfaqësimit</h3></div></div><div class="pst-dossier-metrics">'
      +'<div class="pst-dossier-metric"><div class="pst-dossier-metric-row"><span class="pst-dossier-metric-icon">M</span><div><span>Modeli</span><b>'+E(model)+'</b></div></div></div>'
      +'<div class="pst-dossier-metric"><div class="pst-dossier-metric-row"><span class="pst-dossier-metric-icon">K</span><div><span>Territori</span><b>'+E(r.target_territory||'Kosovo')+'</b></div></div></div>'
      +'<div class="pst-dossier-metric"><div class="pst-dossier-metric-row"><span class="pst-dossier-metric-icon">€</span><div><span>Kapitali</span><b>'+E(capitalLabel(r.capital_fit))+'</b></div></div></div>'
      +'<div class="pst-dossier-metric"><div class="pst-dossier-metric-row"><span class="pst-dossier-metric-icon">◎</span><div><span>Prania në Kosovë</span><b>'+E(kosovoLabel(r.kosovo_presence))+'</b></div></div></div>'
    +'</div></section>'
   +'</div>'
  +'</div>'
  +'<div class="pst-dossier-modules">'
   +'<details class="pst-dossier-module gmail" data-rep-module="gmail" open>'+moduleHead('gmail','✉','Gmail & Kontaktimi','Drafti, statusi i kontaktimit dhe biseda në Gmail')+'<div class="pst-dossier-module-body"><div class="pst-dossier-gmail-layout"><div><h4 class="pst-dossier-section-title">Kontaktet kryesore</h4><div class="pst-dossier-contact"><span>Emri</span><span>'+E(r.contact_name||'—')+'</span><span>Roli</span><span>'+E(sqText(r.contact_role||'—'))+'</span><span>Email</span><span>'+(r.contact_email?'<a href="mailto:'+E(r.contact_email)+'">'+E(r.contact_email)+'</a>':'—')+'</span><span>Telefoni</span><span>'+E(r.contact_phone||'—')+'</span><span>Burimi</span><span>'+(contactLink?'<a href="'+E(contactLink)+'" target="_blank" rel="noopener">Kontakt zyrtar</a>':'—')+'</span><span>Kontakti i fundit</span><span>'+E(r.last_contact_at?D(r.last_contact_at):'Asnjë kontakt i regjistruar')+'</span></div></div><div class="pst-dossier-gmail-side"><div><h4 class="pst-dossier-section-title">Qasja e kontaktimit</h4><div class="pst-dossier-pitch">'+E(sqText(r.strategic_fit_notes||r.why_kosovo||'Ende nuk ka qasje të strukturuar.'))+'</div><div style="margin-top:12px">'+compactRows([['Veprimi i radhës',sqText(r.next_action)],['Drafti në Gmail',r.gmail_draft_id?'I krijuar':'Nuk është krijuar'],['Biseda në Gmail',r.gmail_thread_id||'—']])+'</div></div><div class="pst-dossier-gmail-action">'+draftButton(r,'inline')+'</div></div></div>'+(gmailError?'<div class="pst-rep-warn"><b>Drafti nuk u krijua:</b> '+E(gmailError)+'</div>':'')+'</div></details>'
   +'<details class="pst-dossier-module" data-rep-module="strategy">'+moduleHead('strategy','◎','Përshtatja & Strategjia','Pse kjo kompani ka kuptim për tregun e Kosovës')+'<div class="pst-dossier-module-body"><div class="pst-dossier-summary"><div class="pst-dossier-summary-item"><b>Pse Kosova</b><p>'+E(sqText(r.why_kosovo||'Ende pa arsyetim të strukturuar.'))+'</p></div><div class="pst-dossier-summary-item"><b>Evidenca e tregut</b><p>'+E(sqText(r.market_evidence||'Ende pa evidencë të regjistruar.'))+'</p></div><div class="pst-dossier-summary-item"><b>Qasja e PriSteel</b><p>'+E(sqText(r.strategic_fit_notes||'Ende pa qasje të përcaktuar.'))+'</p></div></div><div style="margin-top:14px">'+compactRows([['Klientët potencialë',sqText(r.potential_customer_types)],['Tenderë / projekte relevante',sqText(r.relevant_tenders_or_projects)]])+'</div></div></details>'
   +'<details class="pst-dossier-module" data-rep-module="commercial">'+moduleHead('commercial','▥','Modeli & kushtet e përfaqësimit','Territori, ekskluziviteti, kapitali dhe kushtet komerciale')+'<div class="pst-dossier-module-body"><div class="pst-dossier-details-grid"><div><h4 class="pst-dossier-section-title">Modeli operativ</h4>'+compactRows([['Modeli',model],['Territori i synuar',r.target_territory||'Kosovo'],['Prania në Kosovë',kosovoLabel(r.kosovo_presence)],['Partner ekzistues',r.existing_partner_name],['Shënime për partnerin',r.existing_partner_notes],['Kërkohet stok',yesNoUnknown(r.stock_required)],['Blerje minimale',yesNoUnknown(r.minimum_purchase_required)],['Financim lokal',yesNoUnknown(r.local_financing_required)],['Risk kreditor',yesNoUnknown(r.credit_risk_required)],['Kërkesa kapitale',r.estimated_capital_requirement],['Përshtatja financiare',capitalLabel(r.capital_fit)],['Shënime financiare',r.capital_notes]])+'</div><div><h4 class="pst-dossier-section-title">Kushtet komerciale</h4>'+compactRows([['Komision i propozuar',r.proposed_commission_pct==null?'—':r.proposed_commission_pct+'%'],['Komision i dakorduar',r.agreed_commission_pct==null?'—':r.agreed_commission_pct+'%'],['Pagesë fikse',r.proposed_retainer],['Ekskluziviteti',r.exclusivity_status],['Marrëveshja',r.agreement_status],['Territori i dakorduar',r.territory_agreed],['Shënime komerciale',r.commercial_notes]])+'</div></div></div></details>'
   +'<details class="pst-dossier-module" data-rep-module="jv">'+moduleHead('jv','●●','Prania & marrëdhëniet lokale / rajonale','Distributorë, përfaqësues, partnerë ose histori relevante në Kosovë/Ballkan')+'<div class="pst-dossier-module-body"><div class="pst-dossier-module-grid"><div><h4 class="pst-dossier-section-title">Prania e regjistruar</h4>'+compactRows([['Kosovë',kosovoLabel(r.kosovo_presence)],['Ballkan / rajon',sqText(r.balkans_presence_notes)],['Partner ekzistues',r.existing_partner_name],['Shënime',sqText(r.existing_partner_notes)]])+'</div><div><h4 class="pst-dossier-section-title">Lidhjet e regjistruara</h4>'+(rels.length?'<div>'+rels.map(function(x){return'<div class="pst-dossier-rel"><b>'+E(x.related_company_name)+'</b><span>'+E(relLabel(REL_TYPES,x.relationship_type))+'</span><span>'+E(relLabel(REL_STATUS,x.relationship_status))+'</span><span>'+E([x.related_company_country,x.project_or_tender||x.project_reference,x.relationship_scope,relLabel(REL_VERIFY,x.verification_status)].filter(Boolean).join(' · '))+'</span></div>'}).join('')+'</div>':'<div class="pst-dossier-empty">Nuk ka ende lidhje të regjistruara.</div>')+'<div style="margin-top:10px"><button class="pst-rep-btn" data-rep-act="add-relationship">+ Shto lidhje lokale / rajonale</button></div></div></div></div></details>'
   +'<details class="pst-dossier-module" data-rep-module="sources">'+moduleHead('project','▤','Historiku & burimet','Burimi, verifikimi dhe evidenca e regjistruar')+'<div class="pst-dossier-module-body"><div class="pst-dossier-details-grid"><div><h4 class="pst-dossier-section-title">Burimet</h4>'+compactRows([['Burimi kryesor',r.source_name],['URL e burimit',r.source_url],['Çelësi i burimit',r.source_key],['Verifikuar',r.last_verified_at?D(r.last_verified_at):'—'],['Krijuar',r.created_at?D(r.created_at):'—'],['Përditësuar',r.updated_at?D(r.updated_at):'—']])+'</div><div><h4 class="pst-dossier-section-title">Integriteti</h4>'+compactRows([['Kontrolli i identitetit',r.identity_review_status],['Shënime të identitetit',r.identity_review_notes],['ID e komandës',r.created_source_command_id],['Arsyeja e prioritetit',r.priority_reason]])+'</div></div></div></details>'
   +'<details class="pst-dossier-module" data-rep-module="notes">'+moduleHead('notes','✎','Shënime & next actions','Shënime të brendshme dhe veprimet e radhës')+'<div class="pst-dossier-module-body"><div class="pst-dossier-module-grid"><div><h4 class="pst-dossier-section-title">Veprimi i radhës</h4>'+compactRows([['Veprimi',sqText(r.next_action)],['Afati',r.next_action_due?D(r.next_action_due):'—'],['Statusi',stageLabel(r.stage)],['Prioriteti',r.priority_score==null?'—':r.priority_score+'/100']])+'</div><div><h4 class="pst-dossier-section-title">Shënime të brendshme</h4><div class="pst-dossier-subbox"><span>'+E(sqText(r.notes||'Nuk ka shënime të regjistruara.'))+'</span></div></div></div></div></details>'
  +'</div>'
 +'</div>';
}
function renderJvDetail(host){
 var h=host||ensurePage().querySelector('[data-rep-detail]'),r=selected();if(!h)return;
 if(!r){h.innerHTML='<div class="pst-rep-empty"><b>Zgjidh një kompani JV / EPC</b></div>';return}
 var l=targetLink(r.id)||{},fit=targetFit(r.id),o=targetOpportunity(r.id)||{},factsObj=O(o.fact_evidence),rels=relationshipsFor(r.id),warn=warnings(r),
     risks=A(fit.risks),values=A(fit.pristeel_value),products=A(r.products),projectLabel=o.project_name||fit.project||'Projekt / tender i lidhur',
     role=targetTypeLabel(l.candidate_role||r.target_type||'lead_epc_candidate'),
     approval=factsObj.approval_date||'',grant=O(factsObj.danish_grant).value,ebrd=O(factsObj.ebrd_finance).value,
     unknowns=[['Paketat e prokurimit',o.procurement_packages&&A(o.procurement_packages).length?A(o.procurement_packages).join(' · '):'Ende të papublikuara'],['Kriteret e kualifikimit',o.qualification_criteria||'Ende të papublikuara'],['Rregullat për JV / konsorcium',o.jv_consortium_rules||'Ende të papublikuara'],['Afati i tenderit',o.tender_deadline?D(o.tender_deadline):'Ende i papublikuar'],['Garancia e ofertës',o.bid_guarantee||'Ende e papublikuar'],['Garancia e ekzekutimit',o.performance_guarantee||'Ende e papublikuar'],['Vizita e detyrueshme në terren',o.mandatory_site_visit===true?'Po':o.mandatory_site_visit===false?'Jo':'Ende e papublikuar']],
     sourceLink=r.source_url||r.company_website||'',contactLink=r.contact_source||'',
     outreach=outreachLabel(fit.outreach_status||''),projectRef=o.tender_reference||'—',
     gmailError=state.draftResult[S(r.id)]&&state.draftResult[S(r.id)].error?state.draftResult[S(r.id)].error:'',
     threadAction=r.gmail_thread_id?'<button class="pst-rep-btn" data-rep-act="open-thread">Hap bisedën në Gmail</button>':'';

 h.innerHTML='<div class="pst-dossier">'
  +'<header class="pst-dossier-hero"><div><div class="pst-dossier-eye">TENDERË · JV · KONSORCIUM · PROFIL I KOMPANISË</div><h2>'+E(r.company_name)+'</h2><div class="pst-dossier-meta">'+E([r.headquarters,r.country,role].filter(Boolean).join(' · '))+(r.company_website?' · <a href="'+E(r.company_website)+'" target="_blank" rel="noopener">'+E(r.company_domain_normalized||r.company_domain||'Faqja e internetit')+' ↗</a>':'')+'</div><div class="pst-dossier-badges"><span class="pst-rep-chip">'+E(stageLabel(r.stage))+'</span>'+(o.project_name?'<span class="pst-rep-chip">'+E(projectRef)+'</span>':'')+(l.company_fit_status?'<span class="pst-rep-chip warn">Përshtatja: '+E(fitLabel(l.company_fit_status))+'</span>':'')+(r.kosovo_presence?'<span class="pst-rep-chip neutral">'+E(kosovoLabel(r.kosovo_presence))+'</span>':'')+'</div></div><div class="pst-dossier-actions">'+draftButton(r)+threadAction+'<button class="pst-rep-btn" data-rep-act="edit">✎ Edito kompaninë</button><button class="pst-rep-btn danger" data-rep-act="archive">▢ Arkivo / Mbylle</button></div></header>'
  +(warn.length?'<div class="pst-rep-warn"><b>Kërkon vëmendje:</b> '+E(warn.join(' · '))+'</div>':'')
  +'<div class="pst-dossier-overview">'
   +'<section class="pst-dossier-main-card pst-dossier-company-card"><div class="pst-dossier-main-title"><span class="pst-dossier-main-icon" aria-hidden="true">▦</span><div><h3>Kush është kompania</h3></div></div><p class="pst-dossier-highlight">'+E(sqText(r.manufacturer_description||r.product_summary||'—'))+'</p>'+(r.product_summary&&r.product_summary!==r.manufacturer_description?'<p>'+E(sqText(r.product_summary))+'</p>':'')+'<div class="pst-dossier-tags">'+products.map(function(x){return'<span class="pst-dossier-tag">'+E(sqText(x))+'</span>'}).join('')+'</div>'+compactRows([['Sektori',sqText(r.sector)],['Kategoria',sqText(r.product_category)],['Konsumatorët tipikë',sqText(r.potential_customer_types)]])+(sourceLink?'<a class="pst-dossier-source" href="'+E(sourceLink)+'" target="_blank" rel="noopener">Hap burimin e kompanisë →</a>':'')+'</section>'
   +'<div class="pst-dossier-side">'
    +'<section class="pst-dossier-main-card pst-dossier-stage-card"><div class="pst-dossier-main-title"><span class="pst-dossier-main-icon" aria-hidden="true">◎</span><div><h3>Faza dhe veprimi</h3></div></div><div class="pst-rep-quick"><label>Faza<select data-rep-quick="stage">'+opts(STAGES,r.stage)+'</select></label><label>Afati<input data-rep-quick="next_action_due" type="date" value="'+E(r.next_action_due||'')+'"></label><label>Veprimi i radhës<input data-rep-quick="next_action" value="'+E(r.next_action||'')+'" placeholder="Veprimi i radhës"></label></div></section>'
    +'<section class="pst-dossier-main-card pst-dossier-project-card"><div class="pst-dossier-project-head"><div class="pst-dossier-project-title"><span class="pst-dossier-main-icon" aria-hidden="true">▤</span><h3>Projekti i lidhur · '+E(projectLabel)+'</h3></div><button class="pst-dossier-link-btn" data-rep-act="open-module" data-rep-module="project">Shiko detajet →</button></div><div class="pst-dossier-metrics">'
      +'<div class="pst-dossier-metric"><div class="pst-dossier-metric-row"><span class="pst-dossier-metric-icon">€</span><div><span>Vlera totale</span><b>'+E(money(o.total_project_value,o.currency))+'</b></div></div></div>'
      +'<div class="pst-dossier-metric"><div class="pst-dossier-metric-row"><span class="pst-dossier-metric-icon">E</span><div><span>Financimi EBRD</span><b>'+E(ebrd?money(ebrd,'EUR'):'—')+'</b></div></div></div>'
      +'<div class="pst-dossier-metric"><div class="pst-dossier-metric-row"><span class="pst-dossier-metric-icon">✦</span><div><span>Granti</span><b>'+E(grant?money(grant,'EUR'):'—')+'</b></div></div></div>'
      +'<div class="pst-dossier-metric"><div class="pst-dossier-metric-row"><span class="pst-dossier-metric-icon">□</span><div><span>Miratuar</span><b>'+E(approval||'—')+'</b></div></div></div>'
    +'</div></section>'
   +'</div>'
  +'</div>'
  +'<div class="pst-dossier-modules">'
   +'<details class="pst-dossier-module gmail" data-rep-module="gmail" open>'+moduleHead('gmail','✉','Gmail & Kontaktimi','Drafti, komunikimi, thread-i dhe statusi i kontaktimit')+'<div class="pst-dossier-module-body"><div class="pst-dossier-gmail-layout"><div><h4 class="pst-dossier-section-title">Kontaktet kryesore</h4><div class="pst-dossier-contact"><span>Emri</span><span>'+E(r.contact_name||'—')+'</span><span>Roli</span><span>'+E(sqText(r.contact_role||'—'))+'</span><span>Email</span><span>'+(r.contact_email?'<a href="mailto:'+E(r.contact_email)+'">'+E(r.contact_email)+'</a>':'—')+'</span><span>Telefoni</span><span>'+E(r.contact_phone||'—')+'</span><span>Burimi</span><span>'+(contactLink?'<a href="'+E(contactLink)+'" target="_blank" rel="noopener">Kontakt zyrtar</a>':'—')+'</span><span>Kontakti i fundit</span><span>'+E(r.last_contact_at?D(r.last_contact_at):'Asnjë kontakt i regjistruar')+'</span></div></div><div class="pst-dossier-gmail-side"><div><h4 class="pst-dossier-section-title">Statusi i komunikimit</h4><div class="pst-dossier-pitch">'+E(sqText(fit.external_pitch||'Ende nuk ka mesazh të jashtëm të strukturuar.'))+'</div><div style="margin-top:12px">'+compactRows([['Statusi i kontaktimit',outreach||stageLabel(r.stage)],['Faza e kompanisë',stageLabel(r.stage)],['Veprimi i radhës',sqText(l.next_action||r.next_action)],['Drafti në Gmail',r.gmail_draft_id?'I regjistruar':'Nuk është krijuar'],['Thread në Gmail',r.gmail_thread_id?'I regjistruar':'—']])+'</div></div><div class="pst-dossier-gmail-action">'+draftButton(r,'inline')+(r.gmail_thread_id?'<button class="pst-rep-btn" data-rep-act="open-thread">Hap bisedën</button>':'')+'</div></div></div>'+(gmailError?'<div class="pst-rep-warn"><b>Drafti nuk u krijua:</b> '+E(gmailError)+'</div>':'')+'</div></details>'
   +'<details class="pst-dossier-module" data-rep-module="strategy">'+moduleHead('strategy','◎','Përshtatja & Strategjia','Përshtatja teknike, roli në JV dhe qasja jonë ndaj kompanisë')+'<div class="pst-dossier-module-body"><div class="pst-dossier-summary"><div class="pst-dossier-summary-item"><b>Përshtatja teknike</b><p>'+E(sqText(fit.technical_fit||r.why_kosovo||'Ende pa vlerësim të plotë.'))+'</p></div><div class="pst-dossier-summary-item"><b>Çfarë sjell PriSteel</b>'+listHtml(sqList(values),'Vlera e PriSteel nuk është strukturuar ende.')+'</div><div class="pst-dossier-summary-item"><b>Qasja ndaj kompanisë</b><p>'+E(sqText(fit.approach_thesis||r.strategic_fit_notes||'Ende pa qasje të përcaktuar.'))+'</p></div></div><div class="pst-dossier-module-grid" style="margin-top:14px"><div><h4 class="pst-dossier-section-title">Prani & historik rajonal</h4><div class="pst-dossier-split"><div class="pst-dossier-subbox"><b>Kosovë</b><span>'+E(sqText(fit.kosovo_presence||r.balkans_presence_notes||kosovoLabel(r.kosovo_presence)))+'</span></div><div class="pst-dossier-subbox"><b>Rajoni</b><span>'+E(sqText(fit.regional_position||r.balkans_presence_notes||'Nuk ka të dhëna të tjera të regjistruara.'))+'</span></div></div>'+(fit.consortium_intelligence?'<div class="pst-dossier-subbox" style="margin-top:10px"><b>JV / konsorcium / precedent</b><span>'+E(sqText(fit.consortium_intelligence))+'</span></div>':'')+'</div><div><h4 class="pst-dossier-section-title">Rreziqe & sinjale historike</h4>'+listHtml(sqList(risks),'Nuk ka rreziqe specifike të regjistruara.')+(fit.historical_price_signal?'<div class="pst-dossier-subbox" style="margin-top:10px"><b>Sinjal historik çmimi / tenderi</b><span>'+E(sqText(fit.historical_price_signal))+'</span></div>':'')+(fit.manufacturing_note?'<div class="pst-dossier-subbox" style="margin-top:10px"><b>Kapacitet prodhues</b><span>'+E(sqText(fit.manufacturing_note))+'</span></div>':'')+'</div></div></div></details>'
   +'<details class="pst-dossier-module" data-rep-module="project">'+moduleHead('project','▤','Detajet e tenderit / projektit','Përshkrimi, kriteret, financimi, dokumentet dhe afatet')+'<div class="pst-dossier-module-body"><div class="pst-dossier-module-grid"><div><h4>Fusha e projektit</h4><p>'+E(sqText(o.scope||'—'))+'</p></div><div><h4>Financimi / statusi</h4><p>'+E(sqText(o.financing||'—'))+'</p><p>'+E(sqText(o.procurement_stage||'—'))+'</p><p style="margin-top:8px"><b>'+E(projectRef)+'</b></p></div></div><div class="pst-dossier-unknowns">'+unknowns.map(function(x){return'<div class="pst-dossier-unknown"><b>'+E(x[0])+'</b><span>'+E(x[1])+'</span></div>'}).join('')+'</div>'+(o.official_source?'<a class="pst-dossier-source" href="'+E(o.official_source)+'" target="_blank" rel="noopener">Hap burimin zyrtar →</a>':'')+'</div></details>'
   +'<details class="pst-dossier-module" data-rep-module="jv">'+moduleHead('jv','●●','JV / partnerë lokalë & rajonalë','Partnerët, konsorciumet dhe lidhjet e regjistruara')+'<div class="pst-dossier-module-body">'+(rels.length?'<div>'+rels.map(function(x){return'<div class="pst-dossier-rel"><b>'+E(x.related_company_name)+'</b><span>'+E(relLabel(REL_TYPES,x.relationship_type))+'</span><span>'+E(relLabel(REL_STATUS,x.relationship_status))+'</span><span>'+E([x.related_company_country,x.project_or_tender||x.project_reference,x.relationship_scope,relLabel(REL_VERIFY,x.verification_status)].filter(Boolean).join(' · '))+'</span></div>'}).join('')+'</div>':'<div class="pst-dossier-empty">Nuk ka ende lidhje të regjistruara.</div>')+'<div style="margin-top:10px"><button class="pst-rep-btn" data-rep-act="add-relationship">+ Shto JV / partner lokal</button></div></div></details>'
   +'<details class="pst-dossier-module" data-rep-module="commercial">'+moduleHead('commercial','▥','Statusi, historiku & burimet','Roli në projekt, verifikimi, prioriteti dhe evidenca')+'<div class="pst-dossier-module-body"><div class="pst-dossier-details-grid"><div><h4 class="pst-dossier-section-title">Statusi i kompanisë</h4>'+compactRows([['Roli në projekt',role],['Përshtatja',fitLabel(l.company_fit_status||'unknown')],['Klasifikimi',classLabel(fit.classification||'')],['Përzgjedhur nga ne',fit.operator_selected===true?'Po':fit.operator_selected===false?'Jo':'—'],['Data e përzgjedhjes',fit.selection_date||'—'],['Statusi i kontaktimit',outreach||'—'],['Prioriteti',r.priority_score==null?'—':r.priority_score+'/100'],['Arsyeja',r.priority_reason]])+'</div><div><h4 class="pst-dossier-section-title">Historiku & burimet</h4>'+compactRows([['Pse Kosova',sqText(r.why_kosovo)],['Evidenca e tregut',sqText(r.market_evidence)],['Tenderë / projekte relevante',sqText(r.relevant_tenders_or_projects)],['Shënime për Ballkanin',sqText(r.balkans_presence_notes)],['Burimi kryesor',r.source_name],['Çelësi i burimit',r.source_key],['Verifikuar',r.last_verified_at?D(r.last_verified_at):'—'],['Përditësuar',r.updated_at?D(r.updated_at):'—']])+'</div></div></div></details>'
   +'<details class="pst-dossier-module" data-rep-module="notes">'+moduleHead('notes','✎','Shënime & next actions','Shënime të brendshme dhe veprimet e radhës')+'<div class="pst-dossier-module-body"><div class="pst-dossier-module-grid"><div><h4 class="pst-dossier-section-title">Veprimi i radhës</h4>'+compactRows([['Veprimi',sqText(l.next_action||r.next_action)],['Afati',r.next_action_due?D(r.next_action_due):'—'],['Statusi',stageLabel(r.stage)],['Përshtatja',fitLabel(l.company_fit_status||'unknown')]])+'</div><div><h4 class="pst-dossier-section-title">Shënime të brendshme</h4><div class="pst-dossier-subbox"><span>'+E(sqText(r.notes||'Nuk ka shënime të regjistruara.'))+'</span></div></div></div></div></details>'
  +'</div>'
 +'</div>';
}
function renderDetail(host){
 var r=selected();
 if(r&&S(r.target_type)!=='representation')return renderJvDetail(host);
 return renderRepresentationDetail(host);
}

async function loadOpportunities(force){
 if(state.opportunitiesLoading)return state.opportunities;
 if(state.opportunitiesLoaded&&!force)return state.opportunities;
 if(typeof window.supaFetch!=='function')return state.opportunities;
 state.opportunitiesLoading=true;
 try{
  var path='pppp_representation_opportunities_v1?select=*&archived_at=is.null&order=updated_at.desc&limit=80';
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
  state.loaded=true;if(state.selected&&!state.rows.some(function(r){return !r.archived_at&&S(r.id)===S(state.selected)})){state.selected='';state.view='list';state.returnTo=''}
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
 if(a.dataset.repAct==='open-thread')openRepresentationThread(r);
 if(a.dataset.repAct==='open-module'){
  var key=a.dataset.repModule||'',root=(state.inlineHost&&state.inlineHost.isConnected)?state.inlineHost:ensurePage().querySelector('[data-rep-detail]'),d=root&&root.querySelector('details[data-rep-module="'+key+'"]');
  if(d){d.open=true;try{d.scrollIntoView({behavior:'smooth',block:'start'})}catch(_){try{d.scrollIntoView()}catch(__){}}}
 }
}
function detailChange(e){
 var k=e.target&&e.target.dataset&&e.target.dataset.repQuick,r=selected();if(!k||!r)return;
 var payload={};payload[k]=nullable(e.target.value);
 if(k==='stage'&&payload.stage==='represented'&&!window.confirm('Konfirmon vendimin njerëzor që PriSteel e përfaqëson këtë kompani?')){e.target.value=r.stage;return}
 patchRow(r.id,payload,'Procesi u përditësua');
}
async function archive(r){
 var reason=window.prompt('Arsyeja për mbyllje/arkivim:','');if(!S(reason).trim())return;
 await patchRow(r.id,{stage:'closed',archive_reason:S(reason).trim(),archived_at:new Date().toISOString()},'Kompania u mbyll dhe u arkivua');
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
 +field('rep-rel-source-url','URL e burimit','url','','two')
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
 if(verify==='verified'&&!sourceUrl){toast('Për statusin E verifikuar duhet URL e burimit',true);return}
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
 m.innerHTML='<div class="pst-rep-dialog"><div class="pst-rep-dialog-head"><h2>'+(r.id?'Edito kompaninë':'Kompani e re')+'</h2><button class="pst-rep-btn" data-rep-close>Mbyll</button></div><form class="pst-rep-form" data-rep-form>'
 +'<section class="pst-rep-form-section"><h3>Identiteti</h3><div class="pst-rep-grid">'
 +field('rep-company-name','Emri i kompanisë *','text',r.company_name,'two')+field('rep-country','Vendi','text',r.country)
 +field('rep-target-type','Lloji i targetit','select',null,'',opts(TARGET_TYPES,r.target_type||'representation'))
 +field('rep-company-domain','Domeni zyrtar','text',r.company_domain)+field('rep-company-website','Faqja e internetit','url',r.company_website)+field('rep-headquarters','Selia','text',r.headquarters)
 +field('rep-source-key','Çelësi i burimit *','text',r.source_key,'two',null,'rep:de:example.com')+field('rep-source-name','Emri i burimit','text',r.source_name)
 +field('rep-source-url','URL e burimit','url',r.source_url,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Profili i biznesit</h3><div class="pst-rep-grid">'
 +field('rep-sector','Sektori','text',r.sector)+field('rep-product-category','Kategoria e produkteve','text',r.product_category)+field('rep-size-band','Madhësia e kompanisë','text',r.size_band)
 +field('rep-product-summary','Produktet / përmbledhja','textarea',r.product_summary||A(r.products).join(', '),'full')
 +field('rep-manufacturer-description','Përshkrimi i prodhuesit','textarea',r.manufacturer_description,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Pse PriSteel / Kosovë</h3><div class="pst-rep-grid">'
 +field('rep-why-kosovo','Pse Kosova','textarea',r.why_kosovo,'full')+field('rep-market-evidence','Evidenca e tregut','textarea',r.market_evidence,'full')
 +field('rep-relevant-projects','Tenderë / projekte relevante','textarea',r.relevant_tenders_or_projects,'full')
 +field('rep-customer-types','Llojet e klientëve potencialë','textarea',r.potential_customer_types,'full')
 +field('rep-strategic-fit','Shënime për përshtatjen strategjike','textarea',r.strategic_fit_notes,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Prania & modeli</h3><div class="pst-rep-grid">'
 +field('rep-kosovo-presence','Prania në Kosovë','select',null,'',opts(PRESENCE,r.kosovo_presence||'unknown'))
 +field('rep-target-model','Modeli i bashkëpunimit','select',null,'',opts(MODELS,r.target_model||'unknown'))
 +field('rep-target-territory','Territori i synuar','text',r.target_territory||'Kosovo')
 +field('rep-existing-partner','Partneri ekzistues','text',r.existing_partner_name)+field('rep-existing-partner-notes','Shënime për partnerin','textarea',r.existing_partner_notes,'two')
 +field('rep-balkans-presence','Shënime për praninë në Ballkan','textarea',r.balkans_presence_notes,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Përshtatja / rreziku financiar</h3><div class="pst-rep-grid">'
 +field('rep-capital-fit','Përshtatja financiare','select',null,'',opts(CAPITAL,r.capital_fit||'unknown'))
 +field('rep-stock-required','Kërkohet stok','select',null,'',boolOptions(r.stock_required))
 +field('rep-minimum-purchase','Blerje minimale','select',null,'',boolOptions(r.minimum_purchase_required))
 +field('rep-local-financing','Financim lokal','select',null,'',boolOptions(r.local_financing_required))
 +field('rep-credit-risk','Rrezik kreditor','select',null,'',boolOptions(r.credit_risk_required))
 +field('rep-capital-requirement','Kërkesa e vlerësuar për kapital','text',r.estimated_capital_requirement)
 +field('rep-capital-notes','Shënime financiare','textarea',r.capital_notes,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Kontakt & proces</h3><div class="pst-rep-grid">'
 +field('rep-contact-name','Emri i kontaktit','text',r.contact_name)+field('rep-contact-role','Roli','text',r.contact_role)+field('rep-contact-email','Email','email',r.contact_email)
 +field('rep-contact-phone','Telefoni','text',r.contact_phone)+field('rep-linkedin','LinkedIn URL','url',r.linkedin_url)+field('rep-contact-source','Burimi i kontaktit','text',r.contact_source)
 +field('rep-stage','Faza','select',null,'',opts(STAGES,r.stage||'found'))+field('rep-priority','Prioriteti 0–100','number',r.priority_score)+field('rep-next-due','Afati i veprimit të radhës','date',r.next_action_due)
 +field('rep-priority-reason','Arsyeja e prioritetit','textarea',r.priority_reason,'full')+field('rep-next-action','Veprimi i radhës','textarea',r.next_action,'full')+field('rep-notes','Shënime','textarea',r.notes,'full')+'</div></section>'
 +'<section class="pst-rep-form-section"><h3>Kushtet komerciale (kur avancon)</h3><div class="pst-rep-grid">'
 +field('rep-proposed-commission','Komisioni i propozuar %','number',r.proposed_commission_pct)+field('rep-agreed-commission','Komisioni i dakorduar %','number',r.agreed_commission_pct)+field('rep-proposed-retainer','Pagesa fikse e propozuar','number',r.proposed_retainer)
 +field('rep-exclusivity','Statusi i ekskluzivitetit','text',r.exclusivity_status)+field('rep-agreement','Statusi i marrëveshjes','text',r.agreement_status)+field('rep-territory-agreed','Territori i dakorduar','text',r.territory_agreed)
 +field('rep-commercial-notes','Shënime komerciale','textarea',r.commercial_notes,'full')+'</div></section>'
 +'<div class="pst-rep-form-foot"><button type="button" class="pst-rep-btn" data-rep-close>Anulo</button><button type="submit" class="pst-rep-btn primary">Ruaj kompaninë</button></div></form></div>';
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
 if(!payload.company_name){toast('Emri i kompanisë është i detyrueshëm',true);return}
 if(payload.stage==='represented'&&(!existing.id||existing.stage!=='represented')&&!window.confirm('Konfirmon vendimin njerëzor që PriSteel e përfaqëson këtë kompani?'))return;
 var submit=document.querySelector('#pst-rep-modal [type="submit"]');if(submit)submit.disabled=true;
 try{
  if(existing.id)await window.supaFetch(TABLE+'?id=eq.'+encodeURIComponent(existing.id),'PATCH',payload);
  else await window.supaFetch(TABLE,'POST',payload);
  document.getElementById('pst-rep-modal').remove();toast(existing.id?'Kompania u përditësua':'Kompania u krijua');await load(true);
 }catch(e){
  var msg=S(e&&e.message||e);if(/duplicate|unique|23505/i.test(msg))msg='Kjo kompani/domen duket se ekziston. Nuk u krijua rekord i dytë; kërkohet shqyrtimi i kompanisë ekzistuese.';
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
 card.innerHTML='<button class="pst-rep-home" type="button"><div class="pst-rep-home-head"><div><div class="pst-rep-home-eye">PËRFAQËSIME</div><div class="pst-rep-home-title">Prodhues ndërkombëtarë</div><div class="pst-rep-home-sub">Zhvillim tregu, kontakte dhe negocim.</div></div><span class="pst-rep-home-open">Hap →</span></div><div class="pst-rep-home-stats">'+[[act.length,'Kompani'],[contacted.length,'Kontaktuar'],[meet.length,'Takime'],[represented.length,'Aktive']].map(function(x){return'<span class="pst-rep-home-stat"><b>'+x[0]+'</b><span>'+x[1]+'</span></span>'}).join('')+'</div></button>';
}
function removeSystemCard(){var x=document.getElementById('pst-representations-system-card');if(x)x.remove()}
function open(){
 var p=ensurePage(),prev=document.querySelector('.page.active');
 document.body.classList.add('pst-global-fullwidth-shell');
 if(prev&&prev!==p){state.previousPageId=prev.id||'';try{state.previousScrollY=Number(window.scrollY||0)}catch(e){state.previousScrollY=0}}
 hideOthers(p);p.style.display='block';p.classList.add('active');setRoute(true);try{window.scrollTo(0,0)}catch(e){}load(true);return true;
}
function back(){
 if(state.view==='profile'){
  var ret=state.returnTo;state.returnTo='';state.view='list';render();
  if(ret==='opportunities'&&window.PSTRepresentationOpportunitiesV2&&typeof window.PSTRepresentationOpportunitiesV2.open==='function'){setTimeout(function(){window.PSTRepresentationOpportunitiesV2.open()},0)}
  try{window.scrollTo({top:0,behavior:'smooth'})}catch(_){try{window.scrollTo(0,0)}catch(__){}}return
 }
 var p=document.getElementById('page-representations'),prev=state.previousPageId?document.getElementById(state.previousPageId):null;
 if(prev&&prev!==p){
  document.body.classList.remove('pst-global-fullwidth-shell');
  if(p){p.classList.remove('active');p.style.display='none'}
  prev.style.display='block';prev.classList.add('active');
  try{if(window.history&&window.history.length>1)window.history.back();else setRoute(false)}catch(e){setRoute(false)}
  try{window.scrollTo(0,state.previousScrollY||0)}catch(e){}
  return;
 }
 document.body.classList.remove('pst-global-fullwidth-shell');
 try{if(window.history&&window.history.length>1){window.history.back();return}}catch(e){}
}
function boot(){ensurePage();removeSystemCard();ensureHome();if(location.hash==='#perfaqesime')open();else load(false)}
document.addEventListener('pst:native-home-ready',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:modules-ready',function(){setTimeout(boot,0)},{once:true});
window.addEventListener('popstate',function(){if(location.hash==='#perfaqesime')open();else document.body.classList.remove('pst-global-fullwidth-shell')});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)},{once:true});else setTimeout(boot,0);
window.PSTRepresentationsV1={open:open,openTarget:function(id,returnTo){var r=state.rows.find(function(x){return !x.archived_at&&S(x.id)===S(id)});if(!r){toast('Kompania nuk u gjet në Përfaqësime.',true);return false}state.inlineHost=null;state.selected=S(id);state.returnTo=S(returnTo||'');state.view='profile';render();try{window.scrollTo({top:0,behavior:'smooth'})}catch(_){try{window.scrollTo(0,0)}catch(__){}}return true},renderTargetInto:function(id,host){var r=state.rows.find(function(x){return !x.archived_at&&S(x.id)===S(id)});if(!r||!host)return false;state.selected=S(id);state.inlineHost=host;renderDetail(host);host.onclick=detailClick;host.onchange=detailChange;return true},clearInlineHost:function(){state.inlineHost=null},refresh:function(){return load(true)},loadOpportunities:function(force){return loadOpportunities(!!force)},snapshot:function(){return{rows:state.rows.slice(),relationships:state.relationships.slice(),opportunities:state.opportunities.slice(),opportunityLinks:state.opportunityLinks.slice(),selected:state.selected,view:state.view,returnTo:state.returnTo,error:state.error,loaded:state.loaded,opportunitiesLoaded:state.opportunitiesLoaded}}};
})();


