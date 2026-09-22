/* PRISTEEL DACH Steel Buyers v1
 * Dedicated direct-steel-supply channel for Germany, Austria and Switzerland.
 * v1 is presentation/read-only: no schema writes, no outbound execution.
 * It reads only shared outbound rows with source=DACH_STEEL_BUYER.
 */
(function(){
'use strict';
if(window.__pstDachSteelSalesV1)return;
window.__pstDachSteelSalesV1=true;

var SOURCE='DACH_STEEL_BUYER';
var state={rows:[],loaded:false,loading:false,error:'',filter:'all',lastLoadedAt:0};
function A(v){return Array.isArray(v)?v:[]}
function S(v){return String(v==null?'':v)}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
function T(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.getTime():0}
function D(v){var t=T(v);return t?new Date(t).toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—'}
function isSupp(r){return !!S(r&&r.suppression_reason).trim()||N(r&&r.status)==='suppressed'}
function isSent(r){return !!T(r&&r.sent_at)||N(r&&r.status)==='sent'}
function isReply(r){return !!T(r&&r.replied_at)||N(r&&r.status)==='replied'}
function isReady(r){return !isSent(r)&&!isSupp(r)&&!!S(r&&r.recipient_email).trim()}
function targetKey(r){return N(r&&r.company_name)||N(r&&r.company_domain)||N(r&&r.recipient_email)||S(r&&r.id)}
function uniq(rows){var x={};A(rows).forEach(function(r){var k=targetKey(r);if(k)x[k]=1});return Object.keys(x).length}
function summary(){
 var rows=A(state.rows);
 return {
  targets:uniq(rows),
  ready:rows.filter(isReady).length,
  approval:rows.filter(function(r){return isReady(r)&&r.approved_for_send!==true}).length,
  sent:rows.filter(isSent).length,
  replies:rows.filter(isReply).length,
  latest:rows.slice().sort(function(a,b){return T(b.updated_at||b.created_at)-T(a.updated_at||a.created_at)})[0]||null
 };
}
function css(){
 if(document.getElementById('pst-dach-steel-sales-v1-css'))return;
 var s=document.createElement('style');s.id='pst-dach-steel-sales-v1-css';s.textContent=`
#pst-dach-steel-sales-card-v1{margin:14px 0 16px;border:1px solid #d9e5e7;border-radius:18px;background:linear-gradient(118deg,#f5fafb 0%,#fff 60%,#f8f4ea 100%);box-shadow:0 9px 26px rgba(45,72,80,.055);overflow:hidden}
.pst-dss-home{width:100%;border:0;background:transparent;padding:20px 22px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(420px,.9fr) auto;gap:20px;align-items:center;text-align:left;color:#26383f;cursor:pointer}
.pst-dss-home:hover{background:rgba(255,255,255,.48)}
.pst-dss-eye{font-size:9px;font-weight:850;letter-spacing:.14em;color:#4a8597}.pst-dss-title{font-size:20px;font-weight:760;letter-spacing:-.35px;margin-top:4px}.pst-dss-sub{font-size:11px;line-height:1.5;color:#738087;margin-top:5px;max-width:650px}.pst-dss-chip{display:inline-flex;margin-top:9px;padding:4px 8px;border-radius:999px;background:#edf4f4;color:#4e707a;font-size:9px;font-weight:780}
.pst-dss-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}.pst-dss-stat{padding:9px 10px;border-left:1px solid #e2e9e9}.pst-dss-stat:first-child{border-left:0}.pst-dss-stat b{display:block;font-size:17px;color:#2e4a54;line-height:1}.pst-dss-stat span{display:block;margin-top:4px;font-size:8px;font-weight:760;text-transform:uppercase;color:#8a9599;white-space:nowrap}.pst-dss-cta{white-space:nowrap;color:#39788d;font-size:11px;font-weight:800}
.pst-dss-current{padding:9px 22px 11px;border-top:1px solid #e7eceb;background:rgba(255,255,255,.5);font-size:9.5px;color:#768388}.pst-dss-current b{color:#405d67}
#page-dach-steel-sales{background:#f7f6f3!important;min-height:100vh;color:#293a40}.pst-dss-page{max-width:1420px;margin:0 auto;padding:25px 28px 54px}.pst-dss-head{display:flex;justify-content:space-between;gap:18px;margin-bottom:15px}.pst-dss-head small{font-size:9px;font-weight:850;letter-spacing:.13em;color:#738b93}.pst-dss-head h1{margin:4px 0 0;font-size:28px}.pst-dss-head p{margin:5px 0 0;max-width:760px;color:#748086;font-size:11px;line-height:1.5}.pst-dss-actions{display:flex;gap:7px}.pst-dss-actions button{height:37px;padding:0 12px;border:1px solid #d6e1e3;border-radius:10px;background:#fff;color:#52666e;font-size:10px;font-weight:760;cursor:pointer}
.pst-dss-rule{margin-bottom:13px;padding:11px 13px;border:1px solid #dde8e9;border-radius:13px;background:#f2f8f8}.pst-dss-rule b{display:block;font-size:10px;color:#396c7c}.pst-dss-rule span{display:block;margin-top:2px;font-size:9px;line-height:1.45;color:#74858b}
.pst-dss-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-bottom:13px}.pst-dss-kpi{border:1px solid #e1e5e3;border-radius:13px;background:#fff;padding:13px 14px}.pst-dss-kpi b{display:block;font-size:21px;color:#304a53}.pst-dss-kpi span{display:block;margin-top:4px;font-size:8.5px;font-weight:780;text-transform:uppercase;color:#8a9498}
.pst-dss-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:11px}.pst-dss-tab{border:1px solid #dde5e6;border-radius:999px;background:#fff;padding:7px 11px;font-size:9.5px;font-weight:760;color:#687a81;cursor:pointer}.pst-dss-tab.on{background:#3f8298;border-color:#3f8298;color:#fff}
.pst-dss-panel{border:1px solid #e1e5e3;border-radius:15px;background:#fff;overflow:hidden}.pst-dss-panel-head{display:flex;justify-content:space-between;padding:13px 15px;border-bottom:1px solid #eaeeec}.pst-dss-panel-head b{font-size:11px}.pst-dss-panel-head span{font-size:9px;color:#879297}.pst-dss-row{display:grid;grid-template-columns:minmax(220px,1.3fr) minmax(190px,1fr) minmax(150px,.8fr) 110px 110px;gap:11px;align-items:center;padding:12px 15px;border-bottom:1px solid #eef0ee}.pst-dss-row:last-child{border-bottom:0}.pst-dss-row b{display:block;font-size:11px}.pst-dss-row small{display:block;margin-top:2px;font-size:8.5px;color:#8a9599;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-dss-status{display:inline-flex;justify-self:start;padding:4px 7px;border-radius:999px;background:#eff5f5;color:#52727c;font-size:8.5px;font-weight:800}.pst-dss-status.sent{background:#eef4ea;color:#58754b}.pst-dss-status.reply{background:#e8f3ea;color:#34654a}.pst-dss-status.supp{background:#f6eeee;color:#895b5b}.pst-dss-empty{padding:42px 22px;text-align:center;color:#7e888c}.pst-dss-empty b{display:block;font-size:15px;color:#3a4c52}.pst-dss-empty span{display:block;margin-top:5px;font-size:10px;line-height:1.5}
@media(max-width:1050px){.pst-dss-home{grid-template-columns:1fr}.pst-dss-cta{justify-self:start}.pst-dss-stats{max-width:720px}.pst-dss-row{grid-template-columns:1.3fr 1fr 120px 100px}.pst-dss-project{display:none}}
@media(max-width:700px){.pst-dss-home{padding:17px}.pst-dss-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-dss-stat{border-left:0;border-top:1px solid #e2e9e9}.pst-dss-page{padding:18px 13px 38px}.pst-dss-head{flex-direction:column}.pst-dss-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-dss-row{grid-template-columns:1fr auto}.pst-dss-recipient,.pst-dss-project,.pst-dss-date{display:none}}
`;document.head.appendChild(s);
}
async function load(force){
 if(state.loading)return state.rows;if(state.loaded&&!force)return state.rows;
 if(typeof window.supaFetch!=='function'){state.error='Databaza nuk është gati.';state.loaded=true;return[]}
 state.loading=true;state.error='';
 try{
  var path='pppp_outbound_queue_v1?source=eq.'+encodeURIComponent(SOURCE)+'&select=id,source,source_key,company_name,company_domain,project_title,recipient_email,recipient_name,contact_role,status,suppression_reason,approved_for_send,human_send_required,sent_at,replied_at,bounced_at,created_at,updated_at&order=updated_at.desc&limit=250';
  state.rows=A(await window.supaFetch(path));state.loaded=true;state.lastLoadedAt=Date.now();
 }catch(e){state.rows=[];state.error=S(e&&e.message||e);state.loaded=true}
 state.loading=false;renderHome();renderPage();return state.rows;
}
function ensureHome(){
 css();var home=document.getElementById('pst-home-launchpad-v1'),grid=home&&home.querySelector('.pst-launch-grid');if(!home||!grid)return false;
 var card=document.getElementById('pst-dach-steel-sales-card-v1');
 if(!card){
  card=document.createElement('section');card.id='pst-dach-steel-sales-card-v1';
  card.innerHTML='<button class="pst-dss-home" type="button"><div><div class="pst-dss-eye">STEEL BUYERS DACH</div><div class="pst-dss-title">Furnizo blerësit e çelikut në DACH</div><div class="pst-dss-sub">Kanal ekskluziv për shitje direkte të materialit: plates, beams, profiles dhe hollow sections. Jo fabrication outreach dhe jo GC outreach i përgjithshëm.</div><span class="pst-dss-chip">GERMANY · AUSTRIA · SWITZERLAND · STEEL SUPPLY</span></div><div class="pst-dss-stats" data-dss-stats></div><span class="pst-dss-cta">Hap Steel Buyers →</span></button><div class="pst-dss-current" data-dss-current></div>';
  grid.parentNode.insertBefore(card,grid);card.querySelector('button').onclick=open;
 }
 renderHome();load(false);return true;
}
function renderHome(){
 var a=document.querySelector('#pst-dach-steel-sales-card-v1 [data-dss-stats]'),c=document.querySelector('#pst-dach-steel-sales-card-v1 [data-dss-current]');if(!a||!c)return;
 var x=summary(),p=[[x.targets,'Targets'],[x.ready,'Kontakt gati'],[x.approval,'Për aprovim'],[x.sent,'Dërguar'],[x.replies,'Përgjigje']];
 a.innerHTML=p.map(function(v){return '<span class="pst-dss-stat"><b>'+E(v[0])+'</b><span>'+E(v[1])+'</span></span>'}).join('');
 if(state.error){c.innerHTML='<b>Status:</b> kanali nuk u lexua · '+E(state.error);return}
 if(!x.targets){c.innerHTML='<b>Status:</b> asnjë target aktiv ende. Hapi i parë është discovery + qualification i kompanive që blejnë material çeliku.';return}
 var r=x.latest||{};c.innerHTML='<b>Target aktual:</b> '+E(r.company_name||r.company_domain||r.recipient_email||'Buyer')+(r.project_title?' · '+E(r.project_title):'')+' · '+E(status(r));
}
function ensurePage(){
 css();var page=document.getElementById('page-dach-steel-sales');if(page)return page;
 var host=document.querySelector('.content')||document.body;page=document.createElement('div');page.id='page-dach-steel-sales';page.className='page';page.style.display='none';
 page.innerHTML='<div class="pst-dss-page"><header class="pst-dss-head"><div><small>PRISTEEL · DIRECT STEEL SUPPLY</small><h1>Steel Buyers DACH</h1><p>Vetëm kompani në DE / AT / CH të cilave PriSteel synon t’u shesë material çeliku. Ky kanal nuk përzien fabrication outreach, partneritete ose GC outreach të përgjithshëm.</p></div><div class="pst-dss-actions"><button data-dss-refresh>Rifresko</button><button data-dss-back>← Ballina</button></div></header><div class="pst-dss-rule"><b>RREGULLI I KANALIT</b><span>Company hyn këtu vetëm me evidence se mund të blejë steel material. Kontakti dhe dërgimi përdorin shared PPPP outbound; asnjë email nuk dërgohet pa approval njerëzor.</span></div><div class="pst-dss-kpis" data-dss-kpis></div><div class="pst-dss-tabs"><button class="pst-dss-tab on" data-dss-filter="all">Të gjitha</button><button class="pst-dss-tab" data-dss-filter="ready">Gati për kontakt</button><button class="pst-dss-tab" data-dss-filter="sent">Dërguar</button><button class="pst-dss-tab" data-dss-filter="replied">Përgjigje</button></div><section class="pst-dss-panel"><div class="pst-dss-panel-head"><b>Buyer outreach channel</b><span data-dss-updated></span></div><div data-dss-list></div></section></div>';
 host.appendChild(page);
 page.onclick=function(e){var f=e.target.closest('[data-dss-filter]');if(f){state.filter=f.getAttribute('data-dss-filter');renderPage();return}if(e.target.closest('[data-dss-refresh]')){state.loaded=false;load(true);return}if(e.target.closest('[data-dss-back]'))back()};
 return page;
}
function status(r){if(isSupp(r))return'Bllokuar';if(isReply(r))return'Përgjigje';if(isSent(r))return'Dërguar';if(r&&r.approved_for_send===true)return'Aprovuar';if(isReady(r))return'Për aprovim';return'Në përgatitje'}
function cls(r){return isSupp(r)?'supp':isReply(r)?'reply':isSent(r)?'sent':''}
function rows(){var r=A(state.rows);if(state.filter==='ready')return r.filter(isReady);if(state.filter==='sent')return r.filter(isSent);if(state.filter==='replied')return r.filter(isReply);return r}
function renderPage(){
 var page=document.getElementById('page-dach-steel-sales');if(!page)return;var x=summary(),k=page.querySelector('[data-dss-kpis]'),list=page.querySelector('[data-dss-list]'),u=page.querySelector('[data-dss-updated]');
 k.innerHTML=[[x.targets,'Targets'],[x.ready,'Kontakt gati'],[x.approval,'Për aprovim'],[x.sent,'Dërguar'],[x.replies,'Përgjigje']].map(function(v){return '<div class="pst-dss-kpi"><b>'+E(v[0])+'</b><span>'+E(v[1])+'</span></div>'}).join('');
 page.querySelectorAll('[data-dss-filter]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-dss-filter')===state.filter)});u.textContent=state.lastLoadedAt?'Përditësuar '+new Date(state.lastLoadedAt).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'}):'';
 if(state.loading){list.innerHTML='<div class="pst-dss-empty"><b>Duke lexuar kanalin…</b><span>Vetëm '+E(SOURCE)+'; pa full scan.</span></div>';return}
 if(state.error){list.innerHTML='<div class="pst-dss-empty"><b>Kanali nuk u lexua</b><span>'+E(state.error)+'</span></div>';return}
 var rr=rows();if(!rr.length){list.innerHTML='<div class="pst-dss-empty"><b>'+E(state.filter==='all'?'Ende nuk ka Steel Buyers aktivë.':'Nuk ka rreshta në këtë gjendje.')+'</b><span>Kur të fillojmë discovery dhe qualification, vetëm buyer-at e çelikut do të hyjnë këtu.</span></div>';return}
 list.innerHTML=rr.map(function(r){return '<div class="pst-dss-row"><div><b>'+E(r.company_name||r.company_domain||'Buyer pa emër')+'</b><small>'+E([r.company_domain,r.contact_role].filter(Boolean).join(' · ')||'Steel buyer target')+'</small></div><div class="pst-dss-recipient"><b>'+E(r.recipient_name||r.recipient_email||'Kontakt në kërkim')+'</b><small>'+E(r.recipient_email||'Pa recipient të konfirmuar')+'</small></div><div class="pst-dss-project"><b>'+E(r.project_title||'Furnizim çeliku')+'</b><small>'+E(r.source_key||'')+'</small></div><span class="pst-dss-status '+cls(r)+'">'+E(status(r))+'</span><div class="pst-dss-date"><b>'+E(D(r.updated_at||r.created_at))+'</b><small>aktiviteti</small></div></div>'}).join('');
}
function back(){
 try{var n=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1;if(n&&typeof n.openHome==='function'){n.openHome();return}}catch(e){}
 try{if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('home');return}}catch(e){}
}
function open(){
 var page=ensurePage();document.querySelectorAll('.page').forEach(function(p){if(p!==page){p.classList.remove('active');p.style.display='none'}});page.style.display='block';page.classList.add('active');renderPage();load(false);try{window.scrollTo(0,0)}catch(e){}
}
function boot(){css();ensurePage();ensureHome()}
document.addEventListener('pst:native-home-ready',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:modules-ready',function(){setTimeout(boot,0)},{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)},{once:true});else setTimeout(boot,0);
window.PSTDachSteelSalesV1={source:SOURCE,open:open,refresh:function(){state.loaded=false;return load(true)},snapshot:function(){return{source:SOURCE,summary:summary(),rows:A(state.rows).slice(),filter:state.filter,error:state.error}}};
})();