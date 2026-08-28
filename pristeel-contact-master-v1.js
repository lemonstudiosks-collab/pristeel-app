/* PRISTEEL Contact Master v3
 * Read-only relationship register over canonical PPPP contacts.
 * Primary source: pppp_contact_master_v1. Safe fallback: contacts.
 * Business categories are first-class direct controls, not a role dropdown.
 */
(function(){
'use strict';
if(window.__pstContactMasterV3)return;
window.__pstContactMasterV3=true;
window.__pstContactMasterV2=true;
window.__pstContactMasterV1=true;

var cache={rows:[],filtered:[],active:null,loading:null,error:'',source:'master',category:'all',manufacturerNames:new Set(),manufacturersLoaded:false,manufacturersLoading:null};
function A(v){if(Array.isArray(v))return v;if(typeof v==='string'&&v.trim()){try{var x=JSON.parse(v);return Array.isArray(x)?x:[];}catch(e){}}return[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function D(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function since(v){var d=v?new Date(v):null;if(!d||isNaN(d.getTime()))return'Pa aktivitet';var n=Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));return n===0?'Sot':n===1?'Dje':'Para '+n+' ditësh';}
function safeUrl(v){try{var u=new URL(String(v||''));return u.protocol==='https:'?u.href:'';}catch(e){return'';}}
function ensurePage(){var p=document.getElementById('page-workspace-contacts');if(p)return p;var content=document.querySelector('.content');if(!content)return null;p=document.createElement('div');p.id='page-workspace-contacts';p.className='page';p.style.display='none';content.appendChild(p);return p;}
function applyContactIdentity(){var b=document.body;if(!b)return;b.dataset.pstSection='contacts';b.style.setProperty('--pst-section-accent','#4F9686');b.style.setProperty('--pst-section-deep','#397366');b.style.setProperty('--pst-section-soft','#EAF5F2');b.style.setProperty('--pst-section-line','#B9D8D0');b.style.setProperty('--pst-section-wash','#F5FAF8');try{if(window.PSTSectionThemeV1&&window.PSTSectionThemeV1.setSection)window.PSTSectionThemeV1.setSection('contacts');}catch(e){}}
function activate(){var p=ensurePage();if(!p)return null;document.querySelectorAll('.page').forEach(function(x){if(x!==p){x.classList.remove('active');x.style.display='none';}});p.classList.add('active');p.style.display='block';document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')==='contacts');});applyContactIdentity();return p;}
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
function kindLabel(v){var n=N(v);if(n.indexOf('supplier')>-1||n.indexOf('furnitor')>-1)return'Furnitor';if(n.indexOf('partner')>-1)return'Partner';if(n.indexOf('client')>-1||n.indexOf('klient')>-1)return'Klient';return v||'Kontakt';}
function nameOf(r){return r.person||r.email||r.company||'Kontakt';}
function projectCount(r){return A(r.projects).length;}
function isClient(r){var k=N(r&&r.kind);return k.indexOf('client')>-1||k.indexOf('klient')>-1;}
function isSupplier(r){var k=N(r&&r.kind);return k.indexOf('supplier')>-1||k.indexOf('furnitor')>-1;}
function isManufacturer(r){return !!r&&cache.manufacturerNames.has(N(r.company));}
function categoryCounts(){var c={all:cache.rows.length,client:0,supplier:0,manufacturer:0};cache.rows.forEach(function(r){if(isClient(r))c.client++;if(isSupplier(r))c.supplier++;if(isManufacturer(r))c.manufacturer++;});return c;}
function businessCard(k,label){return'<button type="button" class="pcm-business-card'+(k==='all'?' active':'')+'" data-pcm-business="'+k+'"><span>'+label+'</span><b data-pcm-business-count>0</b></button>';}
function syncCategoryCards(){var p=document.getElementById('page-workspace-contacts');if(!p)return;var c=categoryCounts();p.querySelectorAll('[data-pcm-business]').forEach(function(b){var k=b.getAttribute('data-pcm-business');b.classList.toggle('active',k===cache.category);var n=b.querySelector('[data-pcm-business-count]');if(n)n.textContent=k==='manufacturer'&&!cache.manufacturersLoaded?'…':String(c[k]||0);});}
function setCategory(k){cache.category=['all','client','supplier','manufacturer'].indexOf(k)>-1?k:'all';renderList();}

function renderShell(){
 var p=activate();if(!p)return null;
 p.innerHTML='<div class="pcm-page"><header class="pcm-head"><div><span>MARRËDHËNIET</span><h1>Kontaktet</h1><p>Një identitet për Gmail, HubSpot, Bitrix24 dhe projektet e PRISTEEL.</p></div><div class="pcm-head-actions"><button type="button" data-pcm-refresh>Rifresko</button><button type="button" data-pcm-classic>Pamja klasike</button></div></header><div class="pcm-toolbar"><label class="pcm-search-compact"><span>Kërko</span><input id="pcm-search" placeholder="Emër, kompani, email, rol…"></label><div class="pcm-business-cards" data-pcm-native="1">'+businessCard('all','Të gjithë')+businessCard('client','Klientë')+businessCard('supplier','Furnitorë')+businessCard('manufacturer','Prodhues')+'</div><label class="pcm-source-compact"><span>Burimi</span><select id="pcm-source"><option value="">Të gjitha</option><option value="gmail">Gmail</option><option value="hubspot">HubSpot</option><option value="bitrix24">Bitrix24</option></select></label></div><section class="pcm-card"><div class="pcm-card-head"><div><b>Regjistri i kontakteve</b><small id="pcm-count">Duke ngarkuar…</small></div></div><div id="pcm-list"><div class="pcm-empty">Duke ngarkuar kontaktet…</div></div></section></div>';
 bindShell(p);syncCategoryCards();return p;
}
function renderError(){
 var h=document.getElementById('pcm-list'),c=document.getElementById('pcm-count');if(c)c.textContent='Gabim gjatë ngarkimit';if(h)h.innerHTML='<div class="pcm-error"><b>Kontaktet nuk u ngarkuan.</b><span>'+E(cache.error||'Gabim i panjohur')+'</span><button type="button" data-pcm-retry>Provo përsëri</button></div>';var b=h&&h.querySelector('[data-pcm-retry]');if(b)b.onclick=function(){load(true);};
}
function renderList(){
 if(cache.error){renderError();return;}
 var h=document.getElementById('pcm-list');if(!h)return;
 var text=N((document.getElementById('pcm-search')||{}).value),source=N((document.getElementById('pcm-source')||{}).value),mode=cache.category;
 cache.filtered=cache.rows.filter(function(r){var src=sourceNames(r),hay=N([r.person,r.company,r.email,r.role,r.country].join(' ')),business=mode==='all'||(mode==='client'&&isClient(r))||(mode==='supplier'&&isSupplier(r))||(mode==='manufacturer'&&isManufacturer(r));return(!text||hay.indexOf(text)>-1)&&business&&(!source||src.indexOf(source)>-1);});
 var c=document.getElementById('pcm-count');
 if(c)c.textContent=cache.filtered.length+' kontakte · '+cache.rows.length+' gjithsej'+(cache.source==='contacts'?' · burim rezervë':'');
 syncCategoryCards();
 if(!cache.filtered.length){h.innerHTML='<div class="pcm-empty">'+(cache.rows.length?'Nuk u gjet asnjë kontakt me këto filtra.':'Nuk ka kontakte të regjistruara.')+'</div>';return;}
 h.innerHTML='<div class="pcm-table-wrap"><table class="pcm-table"><thead><tr><th>Kontakti</th><th>Kompania / roli</th><th>Burimet</th><th>Projektet</th><th>Aktiviteti</th></tr></thead><tbody>'+cache.filtered.map(function(r){return'<tr tabindex="0" data-pcm-id="'+E(r.contact_id)+'"><td><b>'+E(nameOf(r))+'</b><small>'+E(r.email||'Pa email')+'</small></td><td><b>'+E(r.company||'—')+'</b><small>'+E([kindLabel(r.kind),r.role,isManufacturer(r)?'Prodhues':''].filter(Boolean).join(' · '))+'</small></td><td><div class="pcm-sources">'+(sourceBadges(r)||'<span class="pcm-source">Manual</span>')+'</div></td><td><b>'+projectCount(r)+'</b><small>'+Number(r.project_email_count||0)+' emaila projekti</small></td><td><b>'+E(since(r.last_seen_at||r.last_contact))+'</b><small>'+E(D(r.last_seen_at||r.last_contact))+'</small></td></tr>';}).join('')+'</tbody></table></div>';
 h.querySelectorAll('[data-pcm-id]').forEach(function(row){var openRow=function(){var id=row.getAttribute('data-pcm-id'),r=cache.rows.find(function(x){return String(x.contact_id)===String(id);});if(r)openDetail(r);};row.onclick=openRow;row.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openRow();}};});
}
function initials(v){var p=String(v||'').trim().split(/\s+/).filter(Boolean);return((p[0]||'?').charAt(0)+(p.length>1?p[p.length-1].charAt(0):'')).toUpperCase().slice(0,2);}
function latestProject(r){var ps=A(r.projects).slice();ps.sort(function(a,b){return new Date(b.last_seen||0)-new Date(a.last_seen||0);});return ps[0]||null;}
function relationshipCopy(r){
 var pc=projectCount(r),emails=Number(r.project_email_count||0),last=r.last_seen_at||r.last_contact,when=since(last),kind=kindLabel(r.kind),company=r.company||'',lead=kind+(company?' te '+company:'');
 var detail=pc?pc+' projekte të lidhura':'pa projekt të lidhur';if(emails)detail+=' · '+emails+' emaila projekti';detail+=' · kontakti i fundit '+when.toLowerCase()+'.';
 return{lead:lead,detail:detail};
}
function projectRows(r){var ps=A(r.projects).slice();if(!ps.length)return'<div class="pcm-empty small">Nuk ka projekt të lidhur në këtë burim.</div>';ps.sort(function(a,b){return new Date(b.last_seen||0)-new Date(a.last_seen||0);});return ps.map(function(p){return'<button type="button" class="pcm-project" data-project="'+E(p.project_id)+'"><span><b>'+E(p.name||'Projekt')+'</b><small>'+E([p.role,p.email_count?String(p.email_count)+' emaila':'',p.last_seen?'aktiv '+since(p.last_seen).toLowerCase():''].filter(Boolean).join(' · '))+'</small></span><i>›</i></button>';}).join('');}
function sourceRows(r){var ss=A(r.sources);if(!ss.length)return'<div class="pcm-empty small">Kontakt manual pa burim të jashtëm.</div>';return ss.map(function(s){var u=safeUrl(s.external_url),label=String(s.source||'Burim');return'<div class="pcm-source-row"><div><b>'+E(label==='gmail'?'Gmail':label==='hubspot'?'HubSpot':label==='bitrix24'?'Bitrix24':label)+'</b><small>'+E([s.external_id?'ID '+s.external_id:'',s.last_seen?'parë '+D(s.last_seen):''].filter(Boolean).join(' · '))+'</small></div>'+(u?'<a target="_blank" rel="noopener" href="'+E(u)+'">Hap</a>':'')+'</div>';}).join('');}
function ensureModal(){var m=document.getElementById('pcm-modal');if(m)return m;m=document.createElement('div');m.id='pcm-modal';m.innerHTML='<div class="pcm-backdrop"></div><aside class="pcm-panel"><button type="button" class="pcm-close">×</button><div id="pcm-detail"></div></aside>';document.body.appendChild(m);m.querySelector('.pcm-backdrop').onclick=closeDetail;m.querySelector('.pcm-close').onclick=closeDetail;return m;}
function closeDetail(){var m=document.getElementById('pcm-modal');if(m)m.classList.remove('open');}
function renderDetail(r,pending){
 var m=ensureModal(),h=m.querySelector('#pcm-detail'),pc=projectCount(r),emails=Number(r.project_email_count||0),rel=relationshipCopy(r),lp=latestProject(r),phone=String(r.phone||'').trim(),email=String(r.email||'').trim();
 h.innerHTML='<div class="pcm-profile">'
  +'<div class="pcm-avatar">'+E(initials(nameOf(r)))+'</div><div class="pcm-profile-copy"><span class="pcm-eyebrow">'+E([kindLabel(r.kind),r.role,isManufacturer(r)?'Prodhues':''].filter(Boolean).join(' · '))+'</span><h2>'+E(nameOf(r))+'</h2><p>'+E(r.company||'Kontakt PRISTEEL')+'</p></div></div>'
  +'<div class="pcm-primary-actions">'+(email?'<a class="primary" href="mailto:'+E(email)+'">Shkruaj email</a>':'')+(phone?'<a href="tel:'+E(phone)+'">Telefono</a>':'')+(lp&&lp.project_id?'<button type="button" data-project="'+E(lp.project_id)+'">Hap projektin e fundit</button>':'')+'</div>'
  +'<section class="pcm-relationship"><span>MARRËDHËNIA ME PRISTEEL</span><b>'+E(rel.lead)+'</b><p>'+E(rel.detail)+'</p></section>'
  +'<div class="pcm-detail-grid"><section><span>Projektet</span><b>'+pc+'</b></section><section><span>Emaila projekti</span><b>'+emails+'</b></section><section><span>Kontakti i fundit</span><b>'+E(since(r.last_seen_at||r.last_contact))+'</b><small>'+E(D(r.last_seen_at||r.last_contact))+'</small></section><section><span>Kontakt</span><b>'+E(email||phone||'—')+'</b><small>'+E(email&&phone?phone:'')+'</small></section></div>'
  +(pending?'<div class="pcm-detail-refreshing">PPPP po rifreskon projektet dhe komunikimin e fundit…</div>':'')
  +'<section class="pcm-detail-section pcm-projects-section"><h3>Projektet</h3>'+projectRows(r)+'</section>'
  +'<section class="pcm-detail-section pcm-sources-section"><h3>Burimet e të dhënave</h3>'+sourceRows(r)+'</section>'
  +'<div class="pcm-detail-actions"><button type="button" data-pcm-close>Mbyll</button></div>';
 h.querySelectorAll('[data-project]').forEach(function(b){b.onclick=function(){closeDetail();var id=b.getAttribute('data-project');if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);};});
 var close=h.querySelector('[data-pcm-close]');if(close)close.onclick=closeDetail;
 return h;
}
function updateCachedRow(fresh){
 var id=String(fresh&&fresh.contact_id||'');if(!id)return;
 var i=cache.rows.findIndex(function(x){return String(x.contact_id||x.id)===id;});if(i>-1)cache.rows[i]=normalizeRow(fresh);
 var j=cache.filtered.findIndex(function(x){return String(x.contact_id||x.id)===id;});if(j>-1)cache.filtered[j]=normalizeRow(fresh);
}
async function openDetail(r){
 r=normalizeRow(r||{});cache.active=r;var m=ensureModal();renderDetail(r,true);m.classList.add('open');
 var id=String(r.contact_id||r.id||'');if(!id)return;
 try{
   var rows=await fetchArray('pppp_contact_master_v1?contact_id=eq.'+encodeURIComponent(id)+'&select=contact_id,kind,company,person,email,phone,country,role,last_contact,sources,projects,project_email_count,last_seen_at&limit=1'),fresh=rows[0]&&normalizeRow(rows[0]);
   if(!fresh)return;
   if(String(cache.active&&cache.active.contact_id||'')!==id)return;
   cache.active=fresh;updateCachedRow(fresh);renderDetail(fresh,false);renderList();
 }catch(err){
   var h=document.getElementById('pcm-detail'),loading=h&&h.querySelector('.pcm-detail-refreshing');if(loading)loading.textContent='Nuk u arrit të rifreskohen lidhjet. Po shfaqen të dhënat e fundit të ruajtura.';
   console.warn('PPPP contact detail refresh:',err);
 }
}
function bindShell(p){var s=p.querySelector('#pcm-search'),src=p.querySelector('#pcm-source');[s,src].forEach(function(x){if(x){x.oninput=renderList;x.onchange=renderList;}});p.querySelectorAll('[data-pcm-business]').forEach(function(b){b.onclick=function(){setCategory(b.getAttribute('data-pcm-business'));};});var ref=p.querySelector('[data-pcm-refresh]');if(ref)ref.onclick=function(){load(true);loadManufacturers(true);};var classic=p.querySelector('[data-pcm-classic]');if(classic)classic.onclick=function(){var L=window.__pstWorkspaceLegacy;if(L&&typeof L.showPage==='function')L.showPage('contacts');else if(typeof window.showPage==='function')window.showPage('contacts');};}

async function fetchArray(path){if(typeof window.supaFetch!=='function')throw new Error('Lidhja me databazën nuk është gati.');var rows=await window.supaFetch(path);if(!Array.isArray(rows))throw new Error('Databaza ktheu format të papritur.');return rows;}
async function loadPrimary(){return fetchArray('pppp_contact_master_v1?select=contact_id,kind,company,person,email,phone,country,role,last_contact,sources,projects,project_email_count,last_seen_at&order=last_seen_at.desc.nullslast&limit=2000');}
async function loadFallback(){var rows=await fetchArray('contacts?select=id,kind,company,person,email,phone,country,role,last_contact,hubspot_id,hubspot_url&order=last_contact.desc.nullslast&limit=2000');return rows.map(function(r){r=Object.assign({_fallback:true},r);return normalizeRow(r);});}
async function loadManufacturers(force){if(cache.manufacturersLoading&&!force)return cache.manufacturersLoading;if(cache.manufacturersLoaded&&!force)return;cache.manufacturersLoading=(async function(){try{var ps=await fetchArray('partners?select=name,aliases,relation&limit=1000');cache.manufacturerNames.clear();ps.forEach(function(r){var rel=A(r.relation).map(N);if(rel.indexOf('manufacturer')<0)return;[r.name].concat(A(r.aliases)).forEach(function(x){x=N(x);if(x)cache.manufacturerNames.add(x);});});cache.manufacturersLoaded=true;}catch(e){console.warn('Contact manufacturer categories:',e);}finally{cache.manufacturersLoading=null;}renderList();})();return cache.manufacturersLoading;}
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
async function open(){renderShell();var jobs=[load(true),loadManufacturers(false)];await Promise.allSettled(jobs);renderList();try{if(window.PSTTaskSourceActionsV1&&window.PSTTaskSourceActionsV1.decorate)window.PSTTaskSourceActionsV1.decorate();}catch(e){}return true;}
function intercept(){document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('#pst-ws-sidebar .pst-ws-navbtn[data-key="contacts"]'):null;if(!b)return;e.preventDefault();e.stopImmediatePropagation();open();},true);document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDetail();});}

function css(){if(document.getElementById('pcm-css-v3'))return;var old=document.getElementById('pcm-css');if(old)old.remove();var s=document.createElement('style');s.id='pcm-css-v3';s.textContent=`
#page-workspace-contacts{background:#F5FAF8!important;min-height:100vh}.pcm-page{position:relative;padding:24px 30px 50px;max-width:1500px;margin:auto;border-top:8px solid #4F9686}.pcm-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}.pcm-head>div>span,.pcm-eyebrow{font-size:9px;font-weight:800;letter-spacing:1.2px;color:#397366}.pcm-head h1{margin:4px 0 3px;font-size:25px;color:#263A43}.pcm-head p{margin:0;color:#7A888E;font-size:11px}.pcm-head-actions{display:flex;gap:8px}.pcm-head-actions button,.pcm-detail-actions button,.pcm-detail-actions a{height:36px;padding:0 12px;border:1px solid #B9D8D0;border-radius:9px;background:#EAF5F2;color:#397366;font-size:10px;font-weight:750;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}.pcm-head-actions button:hover{background:#DDEFEA;border-color:#4F9686}.pcm-toolbar{display:flex;align-items:stretch;gap:9px;flex-wrap:wrap;margin-bottom:14px}.pcm-toolbar label{display:flex;align-items:center;gap:8px;border:1px solid #B9D8D0;background:#fff;border-radius:11px;padding:0 11px}.pcm-toolbar label>span{font-size:8px;font-weight:800;color:#397366;text-transform:uppercase}.pcm-toolbar input,.pcm-toolbar select{flex:1;min-width:0;height:48px;border:0;outline:0;background:transparent;color:#3A4C54;font-size:11px}.pcm-search-compact{flex:0 1 300px!important;min-width:240px!important;max-width:300px!important}.pcm-source-compact{flex:0 0 165px!important;min-width:155px!important;margin-left:auto}.pcm-business-cards{display:flex;gap:8px;flex:1 1 auto;min-width:520px}.pcm-business-card{min-width:122px;height:50px;padding:0 12px;border:1px solid #B9D8D0;border-radius:11px;background:#fff;color:#397366;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:10.5px;font-weight:780;cursor:pointer;box-shadow:inset 0 3px 0 #4F9686,0 2px 8px rgba(42,67,77,.035)}.pcm-business-card:hover{background:#EAF5F2;border-color:#4F9686}.pcm-business-card.active{background:#4F9686;border-color:#4F9686;color:#fff;box-shadow:0 5px 14px rgba(57,115,102,.16)}.pcm-business-card b{min-width:25px;height:25px;padding:0 6px;border-radius:999px;background:#EAF5F2;color:#397366;display:inline-flex;align-items:center;justify-content:center;font-size:9px}.pcm-business-card.active b{background:#fff;color:#397366}.pcm-card{background:#fff;border:1px solid #CFE2DD;border-radius:16px;overflow:hidden;box-shadow:0 6px 18px rgba(42,67,77,.04)}.pcm-card-head{padding:13px 16px;border-bottom:1px solid #E1ECE9}.pcm-card-head b{display:block;font-size:13px;color:#34464E}.pcm-card-head small{display:block;font-size:9px;color:#89969C;margin-top:2px}.pcm-table-wrap{overflow:auto}.pcm-table{width:100%;border-collapse:collapse}.pcm-table th{font-size:8px;text-transform:uppercase;letter-spacing:.65px;color:#6E807F;text-align:left;padding:10px 13px;background:#F5FAF8}.pcm-table td{padding:12px 13px;border-top:1px solid #E8F0EE;vertical-align:middle;color:#52636B}.pcm-table tbody tr{cursor:pointer}.pcm-table tbody tr:hover{background:#F0F8F5}.pcm-table td b{display:block;font-size:11px;color:#34474F}.pcm-table td small{display:block;font-size:8.7px;color:#7C8E8B;margin-top:2px}.pcm-sources{display:flex;gap:4px;flex-wrap:wrap}.pcm-source{display:inline-flex;padding:3px 7px;border-radius:999px;background:#F0F4F5;color:#66777E;font-size:7.5px;font-weight:800}.pcm-source.gmail{background:#EEF5F8;color:#3F7F98}.pcm-source.hubspot{background:#FFF3E9;color:#9B672F}.pcm-source.bitrix24{background:#EEF2FB;color:#526FA5}.pcm-empty{padding:24px;color:#849198;font-size:10px}.pcm-empty.small{padding:10px 0}.pcm-error{padding:28px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;color:#7E4B46}.pcm-error b{font-size:13px}.pcm-error span{font-size:10px;color:#8A6662}.pcm-error button{margin-top:5px;height:34px;border:1px solid #B9D8D0;border-radius:9px;background:#EAF5F2;color:#397366;padding:0 12px;cursor:pointer}.pcm-backdrop{position:absolute;inset:0;background:rgba(24,39,46,.38);backdrop-filter:blur(3px)}#pcm-modal{display:none;position:fixed;inset:0;z-index:11000}#pcm-modal.open{display:block}.pcm-panel{position:absolute;top:0;right:0;width:min(640px,94vw);height:100%;overflow:auto;background:#fff;box-shadow:-22px 0 60px rgba(25,43,52,.2);padding:26px 28px 32px}.pcm-close{position:absolute;right:18px;top:18px;width:36px;height:36px;border:0;border-radius:10px;background:#EAF5F2;color:#397366;font-size:23px;cursor:pointer}.pcm-profile{display:flex;align-items:center;gap:14px;padding-right:48px}.pcm-avatar{width:54px;height:54px;border-radius:16px;background:#DFF0EB;color:#397366;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:850;letter-spacing:.4px;flex:0 0 auto}.pcm-profile-copy{min-width:0}.pcm-profile-copy h2{font-size:24px;color:#263A43;margin:3px 0 2px}.pcm-profile-copy p{font-size:11px;color:#78888F;margin:0}.pcm-primary-actions{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.pcm-primary-actions a,.pcm-primary-actions button{height:38px;padding:0 13px;border:1px solid #B9D8D0;border-radius:10px;background:#fff;color:#397366;font-size:10px;font-weight:780;text-decoration:none;display:inline-flex;align-items:center;cursor:pointer}.pcm-primary-actions .primary{background:#4F9686;border-color:#4F9686;color:#fff}.pcm-relationship{border:1px solid #CFE2DD;background:linear-gradient(135deg,#F4FAF8,#fff);border-radius:14px;padding:14px 15px;margin-bottom:12px}.pcm-relationship span{display:block;font-size:7.5px;letter-spacing:.7px;font-weight:850;color:#397366}.pcm-relationship b{display:block;font-size:13px;color:#314950;margin-top:4px}.pcm-relationship p{font-size:10.5px;line-height:1.5;color:#708087;margin:4px 0 0}.pcm-detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.pcm-detail-grid section{border:1px solid #E1EBE8;background:#FBFDFC;border-radius:10px;padding:10px}.pcm-detail-grid span{display:block;font-size:7px;text-transform:uppercase;color:#869690}.pcm-detail-grid b{display:block;font-size:10.5px;color:#40545D;margin-top:3px;overflow-wrap:anywhere}.pcm-detail-grid small{display:block;font-size:7.8px;color:#829096;margin-top:2px}.pcm-detail-refreshing{margin-top:10px;padding:8px 10px;border-radius:9px;background:#F0F7F5;color:#5D7F77;font-size:8.5px}.pcm-detail-section{margin-top:18px}.pcm-detail-section h3{font-size:9px;color:#53656D;text-transform:uppercase;letter-spacing:.75px;margin:0 0 7px}.pcm-project{width:100%;display:flex;align-items:center;gap:10px;border:1px solid #DCEAE6;background:#fff;border-radius:11px;padding:11px 12px;margin-top:7px;text-align:left;cursor:pointer}.pcm-project:hover{background:#F0F8F5;border-color:#B9D8D0}.pcm-project span{flex:1;min-width:0}.pcm-project b{display:block;font-size:10.8px;color:#344950}.pcm-project small{display:block;font-size:8.6px;color:#83918F;margin-top:3px}.pcm-project i{font-size:18px;color:#4F9686}.pcm-sources-section{border-top:1px solid #E8EFED;padding-top:15px}.pcm-source-row{display:flex;align-items:center;gap:8px;padding:6px 0;border:0;border-bottom:1px solid #F0F3F2}.pcm-source-row>div{flex:1;min-width:0}.pcm-source-row b{display:block;font-size:9.5px;color:#56666C}.pcm-source-row small{display:block;font-size:7.8px;color:#96A19F;margin-top:1px}.pcm-source-row a{font-size:8.5px;color:#397366;text-decoration:none}.pcm-detail-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.pcm-detail-actions a{background:#4F9686;border-color:#4F9686;color:#fff}@media(max-width:1100px){.pcm-business-cards{min-width:100%;order:3}.pcm-source-compact{margin-left:0}}@media(max-width:700px){.pcm-search-compact{max-width:none!important;flex:1 1 100%!important}.pcm-business-cards{display:grid;grid-template-columns:1fr 1fr;min-width:100%}.pcm-source-compact{flex:1 1 100%!important}.pcm-head{align-items:flex-start;flex-direction:column}.pcm-panel{padding:22px 18px 28px}.pcm-detail-grid{grid-template-columns:1fr 1fr}.pcm-primary-actions>*{flex:1 1 auto;justify-content:center}}
`;document.head.appendChild(s);}
css();intercept();
window.PSTContactMasterV1={open:open,refresh:function(){return Promise.allSettled([load(true),loadManufacturers(true)]);},close:closeDetail,snapshot:function(){return cache.rows.slice();},state:cache,load:load,setCategory:setCategory};
window.PSTContactMasterV2=window.PSTContactMasterV1;
window.PSTContactMasterV3=window.PSTContactMasterV1;
document.addEventListener('pst:modules-ready',function(){if(document.querySelector('#pst-ws-sidebar [data-key="contacts"].active'))open();},{once:true});
})();
