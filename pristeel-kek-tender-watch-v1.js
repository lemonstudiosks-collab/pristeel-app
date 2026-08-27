/* PRISTEEL — Tender Monitor v3
 * Review-first intake for steel-relevant KRPP, APP Albania and TED notices.
 * No tender is promoted to a project automatically.
 */
(function(){
'use strict';
if(window.__pstKekTenderWatchV1)return;
window.__pstKekTenderWatchV1=true;

var rows=[];
var pageId='page-kek-tenders';
var navKey='kek-tenders';

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function n(v){return String(v==null?'':v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function dateText(v){var d=v?new Date(v+'T00:00:00'):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function catLabel(v){return v==='raw_material'?'Lëndë e parë':v==='steel_structure'?'Strukturë çeliku':'Për shqyrtim';}
function statusLabel(v){return({new:'E re',review:'Në shqyrtim',ignored:'Anashkaluar',promoted:'Projekt'})[v]||v||'—';}
function payload(row){return row&&row.payload&&typeof row.payload==='object'?row.payload:{};}
function source(row){var s=String(payload(row).source||'KEK').toUpperCase();if(s==='TED')return'TED';if(s==='APP_AL'||s==='APP')return'APP_AL';return'KRPP';}
function phase(row){return payload(row).notice_phase==='award'?'award':'opportunity';}
function sourceLabel(row){var s=source(row);return s==='TED'?'EU · TED':s==='APP_AL'?'Shqipëri · APP':'Kosovë · KRPP';}
function sourceButton(row){var s=source(row);return s==='TED'?'TED ↗':s==='APP_AL'?'APP ↗':'KRPP ↗';}
function sourceClass(row){var s=source(row);return s==='TED'?'ted':s==='APP_AL'?'app':'krpp';}
function codeLabel(row){var s=source(row);return s==='TED'||s==='APP_AL'?'CPV':'FPP';}
function url(row){return row.detail_url||row.source_url||'';}
function db(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path,method,body);}

function addCss(){
 if(document.getElementById('pst-kek-tender-css'))return;
 var s=document.createElement('style');s.id='pst-kek-tender-css';s.textContent=`
#${pageId}{color:#252B2F}.pst-kek-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding-bottom:16px;border-bottom:1px solid #DEE7EA;margin-bottom:17px;flex-wrap:wrap}.pst-kek-eye{font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:#8B969C;font-weight:760}.pst-kek-title{font-size:22px;font-weight:780;letter-spacing:-.35px;margin-top:4px}.pst-kek-sub{font-size:12px;color:#7D898F;margin-top:4px;max-width:720px}.pst-kek-actions{display:flex;gap:7px;flex-wrap:wrap}.pst-kek-btn{border:1px solid #DDE7EB;background:#fff;color:#536067;border-radius:9px;padding:7px 10px;font-size:10.5px;font-weight:700;cursor:pointer}.pst-kek-btn:hover{border-color:#BFDDE8;background:#F7FBFC}.pst-kek-btn.primary{background:#3F7F98;color:#fff;border-color:#3F7F98}.pst-kek-btn.danger{color:#934239}.pst-kek-filter{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.pst-kek-filter input,.pst-kek-filter select{height:35px;border:1px solid #DDE7EB;border-radius:9px;background:#fff;padding:0 10px;font-size:11px}.pst-kek-filter input{min-width:240px;flex:1}.pst-kek-card{background:#fff;border:1px solid #DEE7EA;border-radius:13px;overflow:hidden}.pst-kek-table{width:100%;border-collapse:collapse}.pst-kek-table th{background:#F8FAFB;color:#8B969C;font-size:8px;text-transform:uppercase;letter-spacing:.55px;text-align:left;padding:9px 10px;border-bottom:1px solid #DEE7EA}.pst-kek-table td{padding:10px;border-bottom:1px solid #EDF1F3;vertical-align:top;font-size:11px;color:#536067}.pst-kek-table tr:last-child td{border-bottom:0}.pst-kek-table tr:hover td{background:#FAFCFD}.pst-kek-name{font-size:12px;font-weight:740;color:#252B2F;line-height:1.35;max-width:520px}.pst-kek-meta{font-size:9.8px;color:#8B969C;margin-top:3px}.pst-kek-chip{display:inline-flex;border-radius:99px;padding:3px 7px;font-size:8.5px;font-weight:760;white-space:nowrap;margin-right:4px}.pst-kek-chip.raw_material{background:#EAF5F8;color:#3F7F98}.pst-kek-chip.steel_structure{background:#EAF5EF;color:#2F7657}.pst-kek-chip.possible{background:#FAF2E3;color:#8A6227}.pst-kek-chip.source{background:#F0F3F5;color:#536067}.pst-kek-chip.source.ted{background:#EEF1FA;color:#455B9A}.pst-kek-chip.source.app{background:#EEF7F1;color:#387457}.pst-kek-chip.source.krpp{background:#F2F5F6;color:#52636A}.pst-kek-chip.award{background:#F5F0EA;color:#825E39}.pst-kek-score{font-weight:800;color:#252B2F}.pst-kek-reason{font-size:9.5px;color:#8B969C;margin-top:3px;max-width:260px}.pst-kek-empty{padding:30px;text-align:center;color:#8B969C;font-size:11.5px}.pst-kek-rowacts{display:flex;gap:5px;justify-content:flex-end;flex-wrap:wrap}.pst-kek-navbtn svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round}@media(max-width:950px){.pst-kek-card{overflow-x:auto}.pst-kek-table{min-width:1050px}}
`;
 document.head.appendChild(s);
}

function ensurePage(){var p=document.getElementById(pageId);if(p)return p;var content=document.querySelector('.content');if(!content)return null;p=document.createElement('div');p.id=pageId;p.className='page';p.style.display='none';content.appendChild(p);return p;}
function setNavActive(){document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')===navKey);});}
function activate(){var p=ensurePage();if(!p)return null;document.querySelectorAll('.page').forEach(function(x){if(x!==p){x.classList.remove('active');x.style.display='none';}});p.classList.add('active');p.style.display='block';setNavActive();window.scrollTo({top:0,behavior:'auto'});return p;}
function icon(){return '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/><path d="m16.5 15 1.5 1.5 3-3"/></svg>';}
function installNav(){
 var nav=document.querySelector('#pst-ws-sidebar .pst-ws-nav')||document.querySelector('.pst-ws-nav');if(!nav)return;
 var existing=nav.querySelector('[data-key="'+navKey+'"]');if(existing){var span=existing.querySelector('span');if(span)span.textContent='Tenderat';return;}
 var apps=nav.querySelector('[data-key="apps"]');var b=document.createElement('button');b.type='button';b.className='pst-ws-navbtn pst-kek-navbtn';b.setAttribute('data-key',navKey);b.innerHTML=icon()+'<span>Tenderat</span><b class="pst-ws-badge" id="pst-kek-nav-badge"></b>';b.onclick=function(){window.pstWsKekTenders();};if(apps)nav.insertBefore(b,apps);else nav.appendChild(b);
}
function addAppsTile(){
 var grid=document.querySelector('#page-workspace-apps .pst-ws-appgrid');if(!grid)return;var old=grid.querySelector('[data-pst-kek-app]');if(old){var name=old.querySelector('.pst-ws-app-name');var sub=old.querySelector('.pst-ws-app-sub');if(name)name.textContent='Tenderat';if(sub)sub.textContent='Monitorimi automatik KRPP + APP Shqipëri + TED për çelik';return;}
 var b=document.createElement('button');b.className='pst-ws-app';b.setAttribute('data-pst-kek-app','1');b.onclick=function(){window.pstWsKekTenders();};b.innerHTML='<div class="pst-ws-app-icon">'+icon()+'</div><div class="pst-ws-app-name">Tenderat</div><div class="pst-ws-app-sub">Monitorimi automatik KRPP + APP Shqipëri + TED për çelik</div>';grid.insertBefore(b,grid.firstChild);
}
function installLegacyRegistration(){
 try{
  if(typeof window.pageMeta==='object')window.pageMeta['kek-tenders']={title:'Tenderat',sub:'Monitorimi automatik KRPP + APP + TED'};
  if(typeof window.PAGE_NAV==='object')window.PAGE_NAV['kek-tenders']='Tenderat';
  if(typeof window.PAGE_ICON==='object'&&!window.PAGE_ICON['kek-tenders'])window.PAGE_ICON['kek-tenders']=icon();
  if(Array.isArray(window.MODULES)){var m=window.MODULES.find(function(x){return Array.isArray(x.pages)&&(x.pages.indexOf('rfq')>-1||x.pages.indexOf('suppliers')>-1);});if(m&&m.pages.indexOf('kek-tenders')<0){var i=m.pages.indexOf('rfq');m.pages.splice(i<0?0:i,0,'kek-tenders');}}
 }catch(e){console.warn('Tender monitor registration:',e);}
}

function pageShell(){
 var p=ensurePage();if(!p)return;
 p.innerHTML='<div class="pst-kek-head"><div><div class="pst-kek-eye">PUBLIC STEEL TENDER MONITOR · AUTOMATIK</div><div class="pst-kek-title">Tenderat e çelikut</div><div class="pst-kek-sub">Mundësitë nga KRPP në Kosovë, APP në Shqipëri dhe TED në BE mblidhen automatikisht. Rezultatet e dhënies ruhen veç si market intelligence. Projekti krijohet vetëm pasi ta aprovojmë ne.</div></div><div class="pst-kek-actions"><button class="pst-kek-btn" onclick="pstKekLoad()">Rifresko listën</button><button class="pst-kek-btn" onclick="window.open(\'https://e-prokurimi.rks-gov.net\',\'_blank\')">KRPP ↗</button><button class="pst-kek-btn" onclick="window.open(\'https://app.gov.al/eksportimi-i-procedurave-te-publikuara/\',\'_blank\')">APP ↗</button><button class="pst-kek-btn" onclick="window.open(\'https://ted.europa.eu\',\'_blank\')">TED ↗</button></div></div><div class="pst-kek-filter"><input id="pst-kek-search" placeholder="Kërko titull, numër, FPP/CPV ose blerës" oninput="pstKekRender()"><select id="pst-kek-source" onchange="pstKekRender()"><option value="all">Të gjitha burimet</option><option value="KRPP">Kosovë · KRPP</option><option value="APP_AL">Shqipëri · APP</option><option value="TED">EU · TED</option></select><select id="pst-kek-phase" onchange="pstKekRender()"><option value="opportunity">Mundësi aktive</option><option value="award">Rezultate / awards</option><option value="all">Mundësi + rezultate</option></select><select id="pst-kek-category" onchange="pstKekRender()"><option value="all">Të gjitha kategoritë</option><option value="raw_material">Lëndë e parë</option><option value="steel_structure">Struktura çeliku</option><option value="possible">Për shqyrtim</option></select><select id="pst-kek-status" onchange="pstKekRender()"><option value="open">Të hapura</option><option value="new">Vetëm të reja</option><option value="review">Në shqyrtim</option><option value="promoted">Të kthyera në projekt</option><option value="ignored">Të anashkaluara</option><option value="all">Të gjitha</option></select></div><div class="pst-kek-card"><div id="pst-kek-list" class="pst-kek-empty">Duke ngarkuar tenderat…</div></div>';
}

function handoffFinalOpportunities(force){
 var X=window.PSTProjectCentricWorkflowV1;
 if(X&&typeof X.loadOpportunities==='function'){Promise.resolve(X.loadOpportunities(!!force)).catch(function(e){console.warn('PPPP Opportunities handoff:',e);});return true;}
 return false;
}
window.pstWsKekTenders=function(){
 activate();
 if(handoffFinalOpportunities(true))return true;
 pageShell();window.pstKekLoad();
 [0,80,250,700].forEach(function(ms){setTimeout(function(){handoffFinalOpportunities(true);},ms);});
 return true;
};
window.pstKekLoad=async function(){
 var h=document.getElementById('pst-kek-list');if(h)h.innerHTML='<div class="pst-kek-empty">Duke ngarkuar tenderat…</div>';
 try{
  rows=await db('kek_tender_watch?select=*&order=published_date.desc,relevance_score.desc&limit=2000');rows=Array.isArray(rows)?rows:[];
  var badge=document.getElementById('pst-kek-nav-badge');if(badge){var c=rows.filter(function(r){return phase(r)==='opportunity'&&(r.status==='new'||r.status==='review');}).length;badge.textContent=String(c);badge.style.display=c?'inline-flex':'none';}
  window.pstKekRender();
 }catch(e){if(h)h.innerHTML='<div class="pst-kek-empty">Tabela e tenderëve nuk u ngarkua: '+esc(e.message)+'</div>';}
};
window.pstKekRender=function(){
 var h=document.getElementById('pst-kek-list');if(!h)return;
 var q=n((document.getElementById('pst-kek-search')||{}).value||'');var src=(document.getElementById('pst-kek-source')||{}).value||'all';var ph=(document.getElementById('pst-kek-phase')||{}).value||'opportunity';var cat=(document.getElementById('pst-kek-category')||{}).value||'all';var st=(document.getElementById('pst-kek-status')||{}).value||'open';
 var list=rows.filter(function(r){
  var okStatus=st==='all'||(st==='open'?(r.status==='new'||r.status==='review'):r.status===st);var okCat=cat==='all'||r.category===cat;var okSrc=src==='all'||source(r)===src;var okPhase=ph==='all'||phase(r)===ph;var okQ=!q||n([r.title,r.authority,r.procurement_no,r.publication_no,r.fpp,r.fpp_description].join(' ')).indexOf(q)>-1;return okStatus&&okCat&&okSrc&&okPhase&&okQ;
 });
 if(!list.length){h.innerHTML='<div class="pst-kek-empty">Nuk ka tenderë që përputhen me filtrin.</div>';return;}
 h.innerHTML='<table class="pst-kek-table"><thead><tr><th>Tenderi</th><th>Burimi</th><th>Kategoria</th><th>Relevanca</th><th>Publikuar</th><th>Afati</th><th>Statusi</th><th></th></tr></thead><tbody>'+list.map(function(r){
  var reasons=Array.isArray(r.match_reasons)?r.match_reasons.join(' · '):'';var isAward=phase(r)==='award';var srcName=sourceLabel(r);var meta=esc(r.procurement_no)+(r.fpp?' · '+codeLabel(r)+' '+esc(r.fpp):'')+(r.authority?' · '+esc(r.authority):'');
  var actions=(url(r)?'<button class="pst-kek-btn" onclick="pstKekOpenSource(\''+esc(r.id)+'\')">'+sourceButton(r)+'</button>':'');
  if(r.status==='promoted'&&r.project_id)actions+='<button class="pst-kek-btn primary" onclick="pstKekOpenProject(\''+esc(r.project_id)+'\')">Hap projektin</button>';
  else{actions+='<button class="pst-kek-btn" onclick="pstKekSetStatus(\''+esc(r.id)+'\',\'review\')">Shqyrto</button>';if(!isAward)actions+='<button class="pst-kek-btn primary" onclick="pstKekPromote(\''+esc(r.id)+'\')">Krijo projekt</button>';actions+='<button class="pst-kek-btn danger" onclick="pstKekSetStatus(\''+esc(r.id)+'\',\'ignored\')">Anashkalo</button>';}
  return '<tr><td><div class="pst-kek-name">'+esc(r.title)+'</div><div class="pst-kek-meta">'+meta+'</div></td><td><span class="pst-kek-chip source '+sourceClass(r)+'">'+srcName+'</span>'+(isAward?'<span class="pst-kek-chip award">Rezultat</span>':'')+'</td><td><span class="pst-kek-chip '+esc(r.category)+'">'+esc(catLabel(r.category))+'</span></td><td><div class="pst-kek-score">'+esc(r.relevance_score)+'%</div><div class="pst-kek-reason">'+esc(reasons)+'</div></td><td>'+dateText(r.published_date)+'</td><td>'+dateText(r.deadline)+'</td><td>'+esc(statusLabel(r.status))+'</td><td><div class="pst-kek-rowacts">'+actions+'</div></td></tr>';
 }).join('')+'</tbody></table>';
};
window.pstKekOpenSource=function(id){var r=rows.find(function(x){return x.id===id;});if(r&&url(r))window.open(url(r),'_blank');};
window.pstKekSetStatus=async function(id,status){try{await db('kek_tender_watch?id=eq.'+encodeURIComponent(id),'PATCH',{status:status,updated_at:new Date().toISOString()});var r=rows.find(function(x){return x.id===id;});if(r)r.status=status;window.pstKekRender();}catch(e){alert('Gabim: '+e.message);}};
window.pstKekOpenProject=function(id){if(typeof window.pstReleaseOpenProject==='function')window.pstReleaseOpenProject(id);else if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);else if(typeof window.loadProject==='function')window.loadProject(id);};
window.pstKekPromote=async function(id){
 var r=rows.find(function(x){return x.id===id;});if(!r)return;if(phase(r)==='award'){alert('Rezultatet/award notices ruhen vetëm si market intelligence dhe nuk krijojnë projekt.');return;}
 try{
  var existing=await db('projects?ref=eq.'+encodeURIComponent(r.procurement_no)+'&select=id,name,ref&limit=2');var project=Array.isArray(existing)&&existing[0]?existing[0]:null;var src=source(r);var p=payload(r);
  if(project){if(!confirm('Ky numër prokurimi ekziston tashmë si projekt: '+(project.name||r.procurement_no)+'.\n\nTa lidhim tenderin me projektin ekzistues?'))return;}
  else{
   if(!confirm('Të krijohet projekt i ri nga ky tender '+sourceLabel(r)+'?\n\n'+r.title+'\n'+r.procurement_no))return;
   await db('projects','POST',{name:r.title,client:r.authority||(src==='TED'?'TED':src==='APP_AL'?'APP Albania':'KRPP'),ref:r.procurement_no,location:src==='KRPP'?'Kosovë':src==='APP_AL'?'Shqipëri':(p.country||''),deadline:r.deadline||'',status:'pritje',pipeline_stage:'rfq_in',notes:'Burimi: '+sourceLabel(r)+'\nSource key: '+(r.source_key||'—')+'\nNumri i publikimit: '+(r.publication_no||'—')+'\n'+codeLabel(r)+': '+(r.fpp||'—')+'\nKategoria automatike: '+catLabel(r.category)+' ('+r.relevance_score+'%)\nArsyet e relevancës: '+(Array.isArray(r.match_reasons)&&r.match_reasons.length?r.match_reasons.join(' · '):'—')+'\nURL: '+(url(r)||'—')});
   var created=await db('projects?ref=eq.'+encodeURIComponent(r.procurement_no)+'&select=id,name,ref&order=created_at.desc&limit=1');project=Array.isArray(created)&&created[0]?created[0]:null;if(!project)throw new Error('Projekti u ruajt, por nuk u gjet për lidhje. Rifresko listën para se të provosh përsëri.');
  }
  await db('kek_tender_watch?id=eq.'+encodeURIComponent(r.id),'PATCH',{status:'promoted',project_id:project.id,updated_at:new Date().toISOString()});r.status='promoted';r.project_id=project.id;window.pstKekRender();if(confirm('Projekti u lidh me tenderin. Ta hapim tani?'))window.pstKekOpenProject(project.id);
 }catch(e){alert('Nuk u krijua projekti: '+e.message);}
};

function init(){addCss();ensurePage();installLegacyRegistration();installNav();addAppsTile();document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn[data-key="apps"]'):null;if(b)setTimeout(addAppsTile,30);},true);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,0);},{once:true});else setTimeout(init,0);
})();