/* PRISTEEL — Kompanitë EU v1
 * Pipeline i veçantë për klientë të drejtpërdrejtë në Evropë.
 * Nuk krijon projekt, kontakt, draft ose dërgim emaili.
 */
(function(){
'use strict';
if(window.__pstEUCompaniesV1)return;
window.__pstEUCompaniesV1=true;

var VIEW='pppp_eu_direct_operational_v1';
var state={rows:[],loading:false,loaded:false,error:'',query:'',selected:''};

function S(v){return String(v==null?'':v)}
function A(v){return Array.isArray(v)?v:[]}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
function D(v){if(!v)return'—';try{return new Date(v).toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'})}catch(e){return S(v)}}
function selected(){return state.rows.find(function(r){return S(r.id)===S(state.selected)})||null}
function hideOthers(page){document.querySelectorAll('.page').forEach(function(p){if(p===page)return;p.classList.remove('active');p.style.display='none'})}
function setRoute(active){try{if(active){if(location.hash!=='#kompanite-eu')history.pushState({pst:'kompanite-eu'},'',location.pathname+location.search+'#kompanite-eu')}else if(location.hash==='#kompanite-eu')history.replaceState({},'',location.pathname+location.search)}catch(e){}}

function typeLabel(v){
 var m={gc_gu:'Kontraktor i përgjithshëm',epc_industrial:'Kontraktor EPC / industrial',industrial_contractor:'Kontraktor industrial',developer:'Zhvillues',manufacturer:'Prodhues',steel_contractor:'Kontraktor çeliku',other_direct_client:'Klient i drejtpërdrejtë'};
 return m[S(v)]||'Kompani';
}
function stageLabel(v){
 var m={found:'Gjetur',verified:'Verifikuar',contact_ready:'Kontakt gati',draft_ready:'Draft gati',contacted:'Kontaktuar',replied:'Përgjigjur',qualified:'E kualifikuar',closed:'Mbyllur'};
 return m[S(v)]||S(v||'—');
}
function scopeLabel(v){
 var m={fabricated_steel_package:'Paketa çeliku të fabrikuar',external_production_capacity:'Kapacitet prodhues shtesë',overflow_capacity:'Kapacitet për ngarkesë kulmore',fabrication_to_drawings:'Prodhim sipas vizatimeve',selected_subcontract_package:'Paketa të përzgjedhura nënkontraktimi',technical_coordination:'Koordinim teknik',material_procurement:'Prokurim materiali'};
 return m[S(v)]||S(v).replace(/_/g,' ');
}
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
 css();
 var p=document.getElementById('page-eu-companies');if(p)return p;
 var host=document.querySelector('.content')||document.body;
 p=document.createElement('div');p.id='page-eu-companies';p.className='page';p.style.display='none';
 p.innerHTML='<div class="pst-eu-page"><div class="pst-eu-top"><button class="pst-eu-btn" type="button" data-eu-back>← Kthehu</button></div><header class="pst-eu-head"><div><div class="pst-eu-eye">ZHVILLIM DIREKT NË EVROPË</div><h1>Kompanitë EU</h1><p>Klientë të drejtpërdrejtë për paketa çeliku të fabrikuar, kapacitet prodhues dhe nënkontraktim. Tenderët, blerësit e lëndës së parë dhe përfaqësimet mbeten në modulet e tyre.</p></div><div class="pst-eu-summary" data-eu-summary></div></header><div data-eu-error></div><div data-eu-body></div></div>';
 host.appendChild(p);
 p.querySelector('[data-eu-back]').onclick=back;
 p.addEventListener('input',function(e){if(e.target&&e.target.matches('[data-eu-search]')){state.query=e.target.value;renderList()}});
 p.addEventListener('click',function(e){
  var row=e.target.closest('[data-eu-id]');if(row){state.selected=row.dataset.euId;render();try{window.scrollTo(0,0)}catch(_){}return}
  if(e.target.closest('[data-eu-list-back]')){state.selected='';render();return}
  if(e.target.closest('[data-eu-refresh]')){load(true);return}
 });
 return p;
}

function filtered(){
 var q=N(state.query);if(!q)return state.rows;
 return state.rows.filter(function(r){return N([r.company_name,r.company_domain_normalized,r.country,r.contact_name,r.contact_email,typeLabel(r.company_type),A(r.business_scope).map(scopeLabel).join(' ')].join(' ')).indexOf(q)>-1});
}
function summary(){
 var all=state.rows.filter(function(r){return !r.archived_at}),contacted=all.filter(function(r){return ['contacted','replied','qualified'].indexOf(r.stage)>-1}).length,review=all.filter(function(r){return r.routing_state==='review'}).length;
 return '<b>'+all.length+'</b> kompani · '+contacted+' kontaktuar'+(review?' · '+review+' për shqyrtim':'');
}
function contactText(r){return r.contact_email||r.contact_name||'Kontakt ende i paplotë'}
function fitText(r){var s=A(r.business_scope).map(scopeLabel).filter(Boolean);return s.length?s.slice(0,2).join(' · '):(r.why_relevant||'Paketa çeliku / kapacitet prodhues')}

function renderList(){
 var p=ensurePage(),body=p.querySelector('[data-eu-body]'),rows=filtered();
 p.querySelector('[data-eu-summary]').innerHTML=summary();
 p.querySelector('[data-eu-error]').innerHTML=state.error?'<div class="pst-eu-error">'+E(state.error)+'</div>':'';
 body.innerHTML='<div class="pst-eu-tools"><input class="pst-eu-search" data-eu-search type="search" value="'+E(state.query)+'" placeholder="Kërko kompani, vend, person ose email"><button class="pst-eu-btn" type="button" data-eu-refresh>'+(state.loading?'Duke rifreskuar…':'Rifresko')+'</button></div>'+
  '<div class="pst-eu-table"><div class="pst-eu-headrow"><span>Kompania</span><span>Vendi / lloji</span><span>Mundësia për PriSteel</span><span>Kontakti</span><span>Gjendja</span></div>'+
  (rows.length?rows.map(function(r){return '<button type="button" class="pst-eu-row" data-eu-id="'+E(r.id)+'"><span><b>'+E(r.company_name)+'</b><small>'+E(r.company_domain_normalized||'')+(r.record_origin==='historike_gc'?' · histori e mëparshme':'')+'</small></span><span><b>'+E(r.country||'—')+'</b><small>'+E(typeLabel(r.company_type))+'</small></span><span><b>'+E(fitText(r))+'</b><small>'+E(r.why_relevant||'')+'</small></span><span><b>'+E(contactText(r))+'</b><small>'+E(r.contact_role||stageLabel(r.stage))+'</small></span><span><i class="pst-eu-chip '+guardClass(r.outreach_guard)+'">'+E(guardLabel(r.outreach_guard))+'</i><small>'+E(stageLabel(r.stage))+'</small></span></button>';}).join(''):'<div class="pst-eu-empty">'+(state.loading?'Duke ngarkuar kompanitë…':'Nuk u gjet kompani me këtë kërkim.')+'</div>')+
  '</div>';
}
function renderDetail(r){
 var p=ensurePage(),body=p.querySelector('[data-eu-body]'),conflicts=A(r.routing_conflicts),scopes=A(r.business_scope).map(scopeLabel);
 p.querySelector('[data-eu-summary]').innerHTML=summary();
 p.querySelector('[data-eu-error]').innerHTML=state.error?'<div class="pst-eu-error">'+E(state.error)+'</div>':'';
 body.innerHTML='<div class="pst-eu-detail"><div class="pst-eu-detail-top"><div><button class="pst-eu-btn" type="button" data-eu-list-back>← Kthehu te lista</button><div class="pst-eu-eye" style="margin-top:14px">'+E(typeLabel(r.company_type))+'</div><h2>'+E(r.company_name)+'</h2><div class="pst-eu-detail-meta">'+E(r.country||'')+(r.company_website?' · <a href="'+E(r.company_website)+'" target="_blank" rel="noopener">Hap faqen e kompanisë</a>':'')+'</div></div><i class="pst-eu-chip '+guardClass(r.outreach_guard)+'">'+E(guardLabel(r.outreach_guard))+'</i></div>'+
 '<div class="pst-eu-detail-grid">'+
 '<section class="pst-eu-section"><h3>Pse na intereson</h3><p>'+E(r.why_relevant||fitText(r))+'</p>'+(scopes.length?'<div class="pst-eu-tags" style="margin-top:9px">'+scopes.map(function(x){return'<span>'+E(x)+'</span>'}).join('')+'</div>':'')+'</section>'+
 '<section class="pst-eu-section"><h3>Kontakti</h3><div class="pst-eu-kv"><span>Personi</span><span>'+E(r.contact_name||'—')+'</span><span>Roli</span><span>'+E(r.contact_role||'—')+'</span><span>Emaili</span><span>'+E(r.contact_email||'—')+'</span><span>Gjendja</span><span>'+E(stageLabel(r.stage))+'</span></div></section>'+
 '<section class="pst-eu-section"><h3>Kontrolli kundër duplikimit</h3><p>'+(conflicts.length?'Kjo kompani gjendet edhe te: <b>'+E(conflicts.map(routeLabel).join(' · '))+'</b>. Mos përgatit kontaktim tjetër pa shqyrtim.':'Nuk u gjet përplasje me Mundësitë, Blerësit e çelikut ose Përfaqësime.')+'</p></section>'+
 '<section class="pst-eu-section"><h3>Historiku i kontaktimit</h3><div class="pst-eu-kv"><span>Mbrojtja</span><span>'+E(guardLabel(r.outreach_guard))+'</span><span>Kontakti i fundit</span><span>'+E(D(r.last_outbound_at||r.contact_master_last_contact||r.last_contact_at))+'</span><span>Draft aktiv</span><span>'+(r.has_active_draft?'Po':'Jo')+'</span><span>Në regjistrin e kontakteve</span><span>'+(r.known_in_contact_master?'Po':'Jo')+'</span></div></section>'+
 '<section class="pst-eu-section full"><h3>Burimi dhe verifikimi</h3><div class="pst-eu-kv"><span>Burimi</span><span>'+E(r.source_name||r.discovery_source||'—')+'</span><span>Verifikuar</span><span>'+E(D(r.last_verified_at))+'</span><span>Çelësi</span><span>'+E(r.source_key||'—')+'</span><span>Origjina</span><span>'+E(r.record_origin==='historike_gc'?'Punë e mëparshme e integruar':'Regjistri canonical i modulit')+'</span></div></section>'+
 '</div></div>';
}
function render(){var r=selected();if(r)renderDetail(r);else renderList();renderHome()}

async function load(force){
 if(state.loading)return;
 if(state.loaded&&!force){render();return}
 if(typeof window.supaFetch!=='function'){state.error='Lidhja me PPPP nuk është gati.';render();return}
 state.loading=true;state.error='';render();
 try{
  state.rows=A(await window.supaFetch(VIEW+'?select=*&archived_at=is.null&order=priority_score.desc.nullslast,updated_at.desc&limit=500'));
  state.loaded=true;
  if(state.selected&&!state.rows.some(function(r){return S(r.id)===S(state.selected)}))state.selected='';
 }catch(e){state.error=S(e&&e.message||e)}
 state.loading=false;render();
}

function ensureHome(){
 var home=document.getElementById('pst-home-launchpad-v1'),lanes=home&&home.querySelector('.pst-morning-lanes'),opportunities=lanes&&lanes.querySelector('.pst-morning-lane.opportunities');if(!home||!lanes||!opportunities)return false;
 var card=document.getElementById('pst-eu-companies-home-v1');if(!card){card=document.createElement('section');card.id='pst-eu-companies-home-v1';card.onclick=open}
 var rep=document.getElementById('pst-representations-home-v1');
 if(card.parentNode!==lanes){if(rep&&rep.parentNode===lanes)lanes.insertBefore(card,rep.nextSibling);else lanes.insertBefore(card,opportunities.nextSibling)}
 renderHome();return true;
}
function renderHome(){
 var card=document.getElementById('pst-eu-companies-home-v1');if(!card)return;
 var rows=state.rows.filter(function(r){return !r.archived_at}),review=rows.filter(function(r){return r.routing_state==='review'}).length;
 card.innerHTML='<button class="pst-eu-home" type="button"><div class="pst-eu-home-inner"><div><div class="pst-eu-home-eye">KOMPANITË EU</div><div class="pst-eu-home-title">Klientë të drejtpërdrejtë</div><div class="pst-eu-home-sub">Çelik i fabrikuar · kapacitet prodhues · nënkontraktim</div></div><div class="pst-eu-home-count"><b>'+rows.length+'</b><span>'+(review?review+' për shqyrtim':'kompani')+'</span></div></div></button>';
}
function open(){var p=ensurePage();hideOthers(p);p.style.display='block';p.classList.add('active');setRoute(true);try{window.scrollTo(0,0)}catch(e){}load(true);return true}
function back(){if(state.selected){state.selected='';render();return}setRoute(false);try{var n=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1;if(n&&typeof n.openHome==='function'){n.openHome();return}}catch(e){}try{if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('home')}catch(e){}}
function boot(){ensurePage();ensureHome();if(location.hash==='#kompanite-eu')open();else load(false)}
document.addEventListener('pst:native-home-ready',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:modules-ready',function(){setTimeout(boot,0)},{once:true});
window.addEventListener('popstate',function(){if(location.hash==='#kompanite-eu')open()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)},{once:true});else setTimeout(boot,0);
window.PSTEUCompaniesV1={open:open,refresh:function(){return load(true)},snapshot:function(){return{rows:state.rows.slice(),selected:state.selected,error:state.error,loaded:state.loaded}}};
})();
