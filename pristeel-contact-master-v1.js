/* PRISTEEL Contact Master v2
 * Read-only relationship register over canonical PPPP contacts.
 * Primary source: pppp_contact_master_v1. Safe fallback: contacts.
 */
(function(){
'use strict';
if(window.__pstContactMasterV2)return;
window.__pstContactMasterV2=true;
window.__pstContactMasterV1=true;

var cache={rows:[],filtered:[],active:null,loading:null,error:'',source:'master'};
function A(v){if(Array.isArray(v))return v;if(typeof v==='string'&&v.trim()){try{var x=JSON.parse(v);return Array.isArray(x)?x:[];}catch(e){}}return[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function D(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function since(v){var d=v?new Date(v):null;if(!d||isNaN(d.getTime()))return'Pa aktivitet';var n=Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));return n===0?'Sot':n===1?'Dje':'Para '+n+' ditësh';}
function safeUrl(v){try{var u=new URL(String(v||''));return u.protocol==='https:'?u.href:'';}catch(e){return'';}}
function ensurePage(){var p=document.getElementById('page-workspace-contacts');if(p)return p;var content=document.querySelector('.content');if(!content)return null;p=document.createElement('div');p.id='page-workspace-contacts';p.className='page';p.style.display='none';content.appendChild(p);return p;}
function activate(){var p=ensurePage();if(!p)return null;document.querySelectorAll('.page').forEach(function(x){if(x!==p){x.classList.remove('active');x.style.display='none';}});p.classList.add('active');p.style.display='block';document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')==='contacts');});try{if(window.PSTSectionThemeV1&&window.PSTSectionThemeV1.setSection)window.PSTSectionThemeV1.setSection('contacts');}catch(e){}return p;}
function normalizeRow(r){
 r=r||{};
 var out=Object.assign({},r);
 if(!out.contact_id&&out.id)out.contact_id=out.id;
 if(!Array.isArray(out.sources)&&typeof out.sources!=='string'){
   out.sources=[];
   if(out.hubspot_url||out.hubspot_id)out.sources.push({source:'hubspot',external_id:out.hubspot_id||'',external_url:out.hubspot_url||'',last_seen:out.last_contact||''});
 }
 if(!out.projects)out.projects=[];
 if(out.project_email_count==null)out.project_email_count=0;
 out._fallback=!!r._fallback;
 return out;
}
function sourceNames(r){return A(r.sources).map(function(s){return String(s.source||'').toLowerCase();}).filter(Boolean);}
function sourceBadges(r){var seen={};return A(r.sources).map(function(s){var k=String(s.source||'').toLowerCase();if(!k||seen[k])return'';seen[k]=1;var label=k==='gmail'?'Gmail':k==='hubspot'?'HubSpot':k==='bitrix24'?'Bitrix24':s.source;return'<span class="pcm-source '+E(k)+'">'+E(label)+'</span>';}).join('');}
function kindLabel(v){var n=N(v);if(n.indexOf('supplier')>-1||n.indexOf('furnitor')>-1)return'Furnitor';if(n.indexOf('partner')>-1)return'Partner';if(n.indexOf('client')>-1||n.indexOf('klient')>-1)return'Klient / Lead';return v||'Kontakt';}
function nameOf(r){return r.person||r.email||r.company||'Kontakt';}
function projectCount(r){return A(r.projects).length;}

function renderShell(){
 var p=activate();if(!p)return null;
 p.innerHTML='<div class="pcm-page"><header class="pcm-head"><div><span>RELATIONSHIPS</span><h1>Kontaktet</h1><p>Një identitet për Gmail, HubSpot, Bitrix24 dhe projektet e PRISTEEL.</p></div><div class="pcm-head-actions"><button type="button" data-pcm-refresh>Rifresko</button><button type="button" data-pcm-classic>Pamja klasike</button></div></header><div class="pcm-toolbar"><label><span>Kërko</span><input id="pcm-search" placeholder="Emër, kompani, email, rol…"></label><label><span>Roli</span><select id="pcm-kind"><option value="">Të gjithë</option><option value="client">Klient / Lead</option><option value="supplier">Furnitorë</option><option value="partner">Partnerë</option></select></label><label><span>Burimi</span><select id="pcm-source"><option value="">Të gjitha</option><option value="gmail">Gmail</option><option value="hubspot">HubSpot</option><option value="bitrix24">Bitrix24</option></select></label></div><section class="pcm-card"><div class="pcm-card-head"><div><b>Contact Master</b><small id="pcm-count">Duke ngarkuar…</small></div></div><div id="pcm-list"><div class="pcm-empty">Duke ngarkuar kontaktet…</div></div></section></div>';
 bindShell(p);return p;
}
function renderError(){
 var h=document.getElementById('pcm-list'),c=document.getElementById('pcm-count');if(c)c.textContent='Gabim gjatë ngarkimit';if(h)h.innerHTML='<div class="pcm-error"><b>Kontaktet nuk u ngarkuan.</b><span>'+E(cache.error||'Gabim i panjohur')+'</span><button type="button" data-pcm-retry>Provo përsëri</button></div>';var b=h&&h.querySelector('[data-pcm-retry]');if(b)b.onclick=function(){load(true);};
}
function renderList(){
 if(cache.error){renderError();return;}
 var h=document.getElementById('pcm-list');if(!h)return;
 var text=N((document.getElementById('pcm-search')||{}).value),kind=N((document.getElementById('pcm-kind')||{}).value),source=N((document.getElementById('pcm-source')||{}).value);
 cache.filtered=cache.rows.filter(function(r){var k=N(r.kind),src=sourceNames(r),hay=N([r.person,r.company,r.email,r.role,r.country].join(' '));return(!text||hay.indexOf(text)>-1)&&(!kind||k.indexOf(kind)>-1)&&(!source||src.indexOf(source)>-1);});
 var c=document.getElementById('pcm-count');
 if(c)c.textContent=cache.filtered.length+' kontakte · '+cache.rows.length+' gjithsej'+(cache.source==='contacts'?' · burim rezervë':'');
 if(!cache.filtered.length){h.innerHTML='<div class="pcm-empty">'+(cache.rows.length?'Nuk u gjet asnjë kontakt me këto filtra.':'Nuk ka kontakte të regjistruara.')+'</div>';return;}
 h.innerHTML='<div class="pcm-table-wrap"><table class="pcm-table"><thead><tr><th>Kontakti</th><th>Kompania / roli</th><th>Burimet</th><th>Projektet</th><th>Aktiviteti</th></tr></thead><tbody>'+cache.filtered.map(function(r){return'<tr tabindex="0" data-pcm-id="'+E(r.contact_id)+'"><td><b>'+E(nameOf(r))+'</b><small>'+E(r.email||'Pa email')+'</small></td><td><b>'+E(r.company||'—')+'</b><small>'+E([kindLabel(r.kind),r.role].filter(Boolean).join(' · '))+'</small></td><td><div class="pcm-sources">'+(sourceBadges(r)||'<span class="pcm-source">Manual</span>')+'</div></td><td><b>'+projectCount(r)+'</b><small>'+Number(r.project_email_count||0)+' emaila projekti</small></td><td><b>'+E(since(r.last_seen_at||r.last_contact))+'</b><small>'+E(D(r.last_seen_at||r.last_contact))+'</small></td></tr>';}).join('')+'</tbody></table></div>';
 h.querySelectorAll('[data-pcm-id]').forEach(function(row){var openRow=function(){var id=row.getAttribute('data-pcm-id'),r=cache.rows.find(function(x){return String(x.contact_id)===String(id);});if(r)openDetail(r);};row.onclick=openRow;row.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openRow();}};});
}
function projectRows(r){var ps=A(r.projects);if(!ps.length)return'<div class="pcm-empty small">Nuk ka projekt të lidhur në këtë burim.</div>';return ps.map(function(p){return'<button type="button" class="pcm-project" data-project="'+E(p.project_id)+'"><span><b>'+E(p.name||'Projekt')+'</b><small>'+E([p.role,p.email_count?String(p.email_count)+' emaila':'',p.last_seen?D(p.last_seen):''].filter(Boolean).join(' · '))+'</small></span><i>›</i></button>';}).join('');}
function sourceRows(r){var ss=A(r.sources);if(!ss.length)return'<div class="pcm-empty small">Kontakt manual pa burim të jashtëm.</div>';return ss.map(function(s){var u=safeUrl(s.external_url),label=String(s.source||'Burim');return'<div class="pcm-source-row"><div><b>'+E(label==='gmail'?'Gmail':label==='hubspot'?'HubSpot':label==='bitrix24'?'Bitrix24':label)+'</b><small>'+E([s.external_id?'ID '+s.external_id:'',s.last_seen?'parë '+D(s.last_seen):''].filter(Boolean).join(' · '))+'</small></div>'+(u?'<a target="_blank" rel="noopener" href="'+E(u)+'">Hap</a>':'')+'</div>';}).join('');}
function ensureModal(){var m=document.getElementById('pcm-modal');if(m)return m;m=document.createElement('div');m.id='pcm-modal';m.innerHTML='<div class="pcm-backdrop"></div><aside class="pcm-panel"><button type="button" class="pcm-close">×</button><div id="pcm-detail"></div></aside>';document.body.appendChild(m);m.querySelector('.pcm-backdrop').onclick=closeDetail;m.querySelector('.pcm-close').onclick=closeDetail;return m;}
function closeDetail(){var m=document.getElementById('pcm-modal');if(m)m.classList.remove('open');}
function openDetail(r){cache.active=r;var m=ensureModal(),h=m.querySelector('#pcm-detail');h.innerHTML='<span class="pcm-eyebrow">CONTACT BRIEF</span><h2>'+E(nameOf(r))+'</h2><p class="pcm-company">'+E([r.company,r.role,kindLabel(r.kind)].filter(Boolean).join(' · '))+'</p><div class="pcm-detail-grid"><section><span>Email</span><b>'+E(r.email||'—')+'</b></section><section><span>Telefon</span><b>'+E(r.phone||'—')+'</b></section><section><span>Projektet</span><b>'+projectCount(r)+'</b></section><section><span>Kontakti i fundit</span><b>'+E(since(r.last_seen_at||r.last_contact))+'</b></section></div><section class="pcm-detail-section"><h3>Projektet e lidhura</h3>'+projectRows(r)+'</section><section class="pcm-detail-section"><h3>Identitetet / burimet</h3>'+sourceRows(r)+'</section><div class="pcm-detail-actions">'+(r.email?'<a href="mailto:'+E(r.email)+'">Email</a>':'')+'<button type="button" data-pcm-close>Mbyll</button></div>';h.querySelectorAll('[data-project]').forEach(function(b){b.onclick=function(){closeDetail();var id=b.getAttribute('data-project');if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);};});var close=h.querySelector('[data-pcm-close]');if(close)close.onclick=closeDetail;m.classList.add('open');}
function bindShell(p){var s=p.querySelector('#pcm-search'),k=p.querySelector('#pcm-kind'),src=p.querySelector('#pcm-source');[s,k,src].forEach(function(x){if(x){x.oninput=renderList;x.onchange=renderList;}});var ref=p.querySelector('[data-pcm-refresh]');if(ref)ref.onclick=function(){load(true);};var classic=p.querySelector('[data-pcm-classic]');if(classic)classic.onclick=function(){var L=window.__pstWorkspaceLegacy;if(L&&typeof L.showPage==='function')L.showPage('contacts');else if(typeof window.showPage==='function')window.showPage('contacts');};}

async function fetchArray(path){if(typeof window.supaFetch!=='function')throw new Error('Lidhja me databazën nuk është gati.');var rows=await window.supaFetch(path);if(!Array.isArray(rows))throw new Error('Databaza ktheu format të papritur.');return rows;}
async function loadPrimary(){return fetchArray('pppp_contact_master_v1?select=contact_id,kind,company,person,email,phone,country,role,last_contact,sources,projects,project_email_count,last_seen_at&order=last_seen_at.desc.nullslast&limit=2000');}
async function loadFallback(){
 var rows=await fetchArray('contacts?select=id,kind,company,person,email,phone,country,role,last_contact,hubspot_id,hubspot_url&order=last_contact.desc.nullslast&limit=2000');
 return rows.map(function(r){r=Object.assign({_fallback:true},r);return normalizeRow(r);});
}
async function load(force){
 if(cache.loading&&!force)return cache.loading;
 var h=document.getElementById('pcm-list'),c=document.getElementById('pcm-count');if(h)h.innerHTML='<div class="pcm-empty">Duke ngarkuar kontaktet…</div>';if(c)c.textContent='Duke ngarkuar…';
 cache.loading=(async function(){
   cache.error='';var rows=[];
   try{rows=(await loadPrimary()).map(normalizeRow);cache.source='master';}
   catch(primaryError){
     console.warn('PPPP Contact Master primary load:',primaryError);
     try{rows=await loadFallback();cache.source='contacts';}
     catch(fallbackError){
       console.error('PPPP Contact Master fallback load:',fallbackError);
       cache.rows=[];cache.filtered=[];cache.error=(primaryError&&primaryError.message?primaryError.message:String(primaryError))+' · '+(fallbackError&&fallbackError.message?fallbackError.message:String(fallbackError));renderError();return[];
     }
   }
   cache.rows=rows;renderList();return rows;
 })().finally(function(){cache.loading=null;});
 return cache.loading;
}
async function open(){renderShell();await load(true);try{if(window.PSTTaskSourceActionsV1&&window.PSTTaskSourceActionsV1.decorate)window.PSTTaskSourceActionsV1.decorate();}catch(e){}return true;}
function intercept(){document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('#pst-ws-sidebar .pst-ws-navbtn[data-key="contacts"]'):null;if(!b)return;e.preventDefault();e.stopImmediatePropagation();open();},true);document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDetail();});}

function css(){if(document.getElementById('pcm-css'))return;var s=document.createElement('style');s.id='pcm-css';s.textContent=`
#page-workspace-contacts{background:#F7FBFA;min-height:100vh}.pcm-page{padding:28px 30px 50px;max-width:1500px;margin:auto}.pcm-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}.pcm-head>div>span,.pcm-eyebrow{font-size:9px;font-weight:800;letter-spacing:1.2px;color:#397366}.pcm-head h1{margin:4px 0 3px;font-size:25px;color:#263A43}.pcm-head p{margin:0;color:#7A888E;font-size:11px}.pcm-head-actions{display:flex;gap:8px}.pcm-head-actions button,.pcm-detail-actions button,.pcm-detail-actions a{height:36px;padding:0 12px;border:1px solid #C4DFD8;border-radius:9px;background:#EAF5F2;color:#397366;font-size:10px;font-weight:750;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}.pcm-toolbar{display:grid;grid-template-columns:minmax(300px,1fr) 170px 170px;gap:10px;margin-bottom:13px}.pcm-toolbar label{display:flex;align-items:center;gap:8px;border:1px solid #D8E6E2;background:#fff;border-radius:11px;padding:0 11px}.pcm-toolbar label>span{font-size:8px;font-weight:800;color:#87949A;text-transform:uppercase}.pcm-toolbar input,.pcm-toolbar select{flex:1;min-width:0;height:40px;border:0;outline:0;background:transparent;color:#3A4C54;font-size:11px}.pcm-card{background:#fff;border:1px solid #D8E6E2;border-radius:16px;overflow:hidden;box-shadow:0 6px 18px rgba(42,67,77,.035)}.pcm-card-head{padding:13px 16px;border-bottom:1px solid #E7EDEF}.pcm-card-head b{display:block;font-size:13px;color:#34464E}.pcm-card-head small{display:block;font-size:9px;color:#89969C;margin-top:2px}.pcm-table-wrap{overflow:auto}.pcm-table{width:100%;border-collapse:collapse}.pcm-table th{font-size:8px;text-transform:uppercase;letter-spacing:.65px;color:#8A969C;text-align:left;padding:10px 13px;background:#FAFCFD}.pcm-table td{padding:12px 13px;border-top:1px solid #EDF1F2;vertical-align:middle;color:#52636B}.pcm-table tbody tr{cursor:pointer}.pcm-table tbody tr:hover{background:#F5FAF8}.pcm-table td b{display:block;font-size:11px;color:#34474F}.pcm-table td small{display:block;font-size:8.7px;color:#88969C;margin-top:2px}.pcm-sources{display:flex;gap:4px;flex-wrap:wrap}.pcm-source{display:inline-flex;padding:3px 7px;border-radius:999px;background:#F0F4F5;color:#66777E;font-size:7.5px;font-weight:800}.pcm-source.gmail{background:#EEF5F8;color:#3F7F98}.pcm-source.hubspot{background:#FFF3E9;color:#9B672F}.pcm-source.bitrix24{background:#EEF2FB;color:#526FA5}.pcm-empty{padding:24px;color:#849198;font-size:10px}.pcm-empty.small{padding:10px 0}.pcm-error{padding:28px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;color:#7E4B46}.pcm-error b{font-size:13px}.pcm-error span{font-size:10px;color:#8A6662}.pcm-error button{margin-top:5px;height:34px;border:1px solid #C4DFD8;border-radius:9px;background:#EAF5F2;color:#397366;padding:0 12px;cursor:pointer}.pcm-backdrop{position:absolute;inset:0;background:rgba(24,39,46,.38);backdrop-filter:blur(3px)}#pcm-modal{display:none;position:fixed;inset:0;z-index:11000}#pcm-modal.open{display:block}.pcm-panel{position:absolute;top:0;right:0;width:min(560px,92vw);height:100%;overflow:auto;background:#fff;box-shadow:-22px 0 60px rgba(25,43,52,.2);padding:24px}.pcm-close{position:absolute;right:18px;top:18px;width:36px;height:36px;border:0;border-radius:10px;background:#F1F5F6;color:#60747D;font-size:23px;cursor:pointer}.pcm-panel h2{font-size:23px;color:#263A43;margin:5px 45px 4px 0}.pcm-company{font-size:11px;color:#78888F;margin:0 0 17px}.pcm-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pcm-detail-grid section{border:1px solid #E2EAED;background:#FAFCFD;border-radius:11px;padding:11px}.pcm-detail-grid span{display:block;font-size:7.5px;text-transform:uppercase;color:#8B989E}.pcm-detail-grid b{display:block;font-size:11px;color:#40545D;margin-top:3px;overflow-wrap:anywhere}.pcm-detail-section{margin-top:15px}.pcm-detail-section h3{font-size:10px;color:#53656D;text-transform:uppercase;letter-spacing:.6px}.pcm-project,.pcm-source-row{width:100%;display:flex;align-items:center;gap:10px;border:1px solid #E5ECEE;background:#fff;border-radius:10px;padding:10px 11px;margin-top:6px;text-align:left}.pcm-project{cursor:pointer}.pcm-project:hover{background:#F6FAFB}.pcm-project span,.pcm-source-row>div{flex:1;min-width:0}.pcm-project b,.pcm-source-row b{display:block;font-size:10.5px;color:#3C4E56}.pcm-project small,.pcm-source-row small{display:block;font-size:8.5px;color:#88969C;margin-top:2px}.pcm-project i{font-size:18px;color:#6E9EAF}.pcm-source-row a{font-size:9px;color:#397366;text-decoration:none}.pcm-detail-actions{display:flex;gap:8px;margin-top:18px}.pcm-detail-actions a{background:#4F9686;border-color:#4F9686;color:#fff}@media(max-width:850px){.pcm-toolbar{grid-template-columns:1fr}.pcm-head{align-items:flex-start;flex-direction:column}.pcm-detail-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s);}
css();intercept();
window.PSTContactMasterV1={open:open,refresh:function(){return load(true);},close:closeDetail,snapshot:function(){return cache.rows.slice();},state:cache,load:load};
window.PSTContactMasterV2=window.PSTContactMasterV1;
document.addEventListener('pst:modules-ready',function(){if(document.querySelector('#pst-ws-sidebar [data-key="contacts"].active'))open();},{once:true});
})();