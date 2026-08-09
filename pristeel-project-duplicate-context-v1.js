/* PRISTEEL duplicate project context v1
 * Read-only duplicate awareness inside Project Workspace.
 * Never merges, deletes, reassigns or mutates project data.
 */
(function(){
'use strict';
if(window.__pstProjectDuplicateContextV1)return;
window.__pstProjectDuplicateContextV1=true;

var state={seq:0,current:''};
function A(v){return Array.isArray(v)?v:[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function db(q){if(typeof window.supaFetch!=='function')return Promise.resolve([]);return window.supaFetch(q).then(A).catch(function(){return[];});}
function key(p){return [N(p&&p.name),N(p&&p.client),N(p&&(p.ref||p.reference))].join('|');}
function date(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'pa datë';}
function css(){if(document.getElementById('pst-pdc-css'))return;var s=document.createElement('style');s.id='pst-pdc-css';s.textContent='.pst-pdc{max-width:1450px;margin:0 auto 10px;border:1px solid #E8C98F;background:#FFF8E9;border-radius:12px;padding:11px 13px;color:#69502B}.pst-pdc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.pst-pdc-head b{font-size:10.5px}.pst-pdc-head span{display:block;font-size:8.5px;margin-top:2px;color:#876A3E}.pst-pdc-list{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.pst-pdc-item{display:flex;align-items:center;gap:9px;border:1px solid #E8D7B4;background:#fff;border-radius:9px;padding:7px 8px;min-width:250px}.pst-pdc-item.current{border-color:#70AFC5;background:#F4FBFD}.pst-pdc-main{flex:1;min-width:0}.pst-pdc-main b{display:block;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-pdc-main small{display:block;font-size:7.5px;color:#7E8A90;margin-top:2px}.pst-pdc-count{font-size:8px;font-weight:750;color:#3F7F98;white-space:nowrap}.pst-pdc-open{height:28px;border:1px solid #CDE0E7;border-radius:7px;background:#fff;color:#3F7F98;padding:0 8px;font-size:7.5px;font-weight:750;cursor:pointer}.pst-pdc-open:hover{background:#EAF5F8}.pst-pdc-tag{font-size:7px;border-radius:999px;padding:2px 6px;background:#EEF2F4;color:#67747B;white-space:nowrap}';document.head.appendChild(s);}
function remove(){var x=document.getElementById('pst-pdc');if(x)x.remove();}
async function counts(id){var r=await Promise.all([
 db('project_emails?project_id=eq.'+enc(id)+'&select=id&limit=5000'),
 db('project_email_links?project_id=eq.'+enc(id)+'&select=id&limit=5000')
]);return{emails:A(r[0]).length,links:A(r[1]).length};}
function host(){var page=document.getElementById('page-workspace-project');if(!page||page.style.display==='none')return null;return page.querySelector('.pst-pi-tabs')||document.getElementById('pst-pi-body');}
async function inspect(id){id=String(id||window.__pstCurrentProjectId||window._curProjId||'');if(!id)return false;var seq=++state.seq;state.current=id;remove();var rows=await db('projects?select=id,name,client,ref,reference,status,created_at,drive_folder_id&order=created_at.asc&limit=5000');if(seq!==state.seq)return false;var cur=rows.filter(function(p){return String(p.id)===id;})[0];if(!cur)return false;var k=key(cur),dups=rows.filter(function(p){return key(p)===k;});if(dups.length<2)return false;var details=[];for(var i=0;i<dups.length;i++){var c=await counts(dups[i].id);details.push({p:dups[i],c:c});}if(seq!==state.seq)return false;css();var anchor=host();if(!anchor)return false;var box=document.createElement('div');box.id='pst-pdc';box.className='pst-pdc';box.innerHTML='<div class="pst-pdc-head"><div><b>Ky projekt ka '+dups.length+' rekorde me të njëjtin emër / klient / referencë</b><span>Vetëm diagnostikim. Asgjë nuk bashkohet ose zhvendoset automatikisht.</span></div></div><div class="pst-pdc-list">'+details.map(function(x){var p=x.p,current=String(p.id)===id;return '<div class="pst-pdc-item'+(current?' current':'')+'"><div class="pst-pdc-main"><b>'+E(p.name||'Projekt')+'</b><small>ID '+E(String(p.id).slice(0,8))+' · '+E(p.status||'pa status')+' · '+E(date(p.created_at))+' · '+(p.drive_folder_id?'Drive':'pa Drive')+'</small></div><span class="pst-pdc-count">'+x.c.emails+' emaila · '+x.c.links+' lidhje</span>'+(current?'<span class="pst-pdc-tag">KY REKORD</span>':'<button class="pst-pdc-open" data-pdc-open="'+E(p.id)+'">Hap</button>')+'</div>';}).join('')+'</div>';
anchor.parentNode.insertBefore(box,anchor);
box.querySelectorAll('[data-pdc-open]').forEach(function(b){b.onclick=function(){var target=b.getAttribute('data-pdc-open');if(window.PSTProjectIdentityLockV1&&typeof window.PSTProjectIdentityLockV1.remember==='function')window.PSTProjectIdentityLockV1.remember(target,true);if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(target);};});return true;}
function schedule(id){[80,320,700].forEach(function(ms){setTimeout(function(){var current=String(window.__pstCurrentProjectId||window._curProjId||'');if(!current||current===String(id))inspect(id);},ms);});}
function wrap(){var base=window.pstOpenProjectWorkspace;if(typeof base!=='function'||base.__pdc)return false;async function f(id){var r=await base.apply(this,arguments);schedule(id);return r;}f.__pdc=true;f.__base=base;window.pstOpenProjectWorkspace=f;return true;}
function install(){if(!wrap())setTimeout(wrap,250);var id=window.__pstCurrentProjectId||window._curProjId;if(id)schedule(id);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
document.addEventListener('pst:modules-ready',function(){setTimeout(install,50);setTimeout(install,450);},{once:true});
window.PSTProjectDuplicateContextV1={inspect:inspect,remove:remove};
})();
