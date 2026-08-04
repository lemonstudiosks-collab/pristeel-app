/* PRISTEEL project list status actions — safe renderer hook */
(function(){
'use strict';
if(window.__pstProjectStatusActionsLoaded)return;
window.__pstProjectStatusActionsLoaded=true;

var BLUE='#5B9BB3',BLUE_DARK='#326F87',GREEN='#2F7657',RED='#A64B42',AMBER='#9B6A22';
var saving=false;
var wrapped=false;

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function arr(v){return Array.isArray(v)?v:[];}
function currentUser(){try{var s=JSON.parse(localStorage.getItem('pristeel_session')||'{}');return s.email||'admin';}catch(e){return'admin';}}
function toast(text,error){var old=document.getElementById('pst-status-toast');if(old)old.remove();var e=document.createElement('div');e.id='pst-status-toast';e.className=error?'error':'';e.textContent=text;document.body.appendChild(e);setTimeout(function(){if(e.parentNode)e.remove();},5200);}
function closeMenus(){document.querySelectorAll('.pst-status-menu.open').forEach(function(m){m.classList.remove('open');});}
function closeModal(){if(saving)return;var e=document.getElementById('pst-status-modal-bg');if(e)e.remove();}
function errorText(text){var e=document.getElementById('pst-status-error');if(!e)return;e.textContent=text||'';e.style.display=text?'block':'none';}

function addCss(){
 if(document.getElementById('pst-project-status-actions-css'))return;
 var s=document.createElement('style');
 s.id='pst-project-status-actions-css';
 s.textContent=`
.pst-status-actions{display:flex;align-items:center;justify-content:flex-end;gap:5px;white-space:nowrap;position:relative}.pst-status-btn{height:29px;border:1px solid #D8E1E5;border-radius:8px;background:#fff;color:#556168;padding:0 9px;font-size:9.5px;font-weight:730;cursor:pointer}.pst-status-btn:hover{background:#F5FAFC;border-color:#BFDDE8;color:${BLUE_DARK}}.pst-status-btn.lost{color:${RED};border-color:#E4C1BD}.pst-status-btn.lost:hover{background:#F9ECEA}.pst-status-btn.delay{color:${AMBER};border-color:#E6D3AE}.pst-status-btn.delay:hover{background:#FAF2E3}.pst-status-btn.more{width:31px;padding:0;font-size:15px;line-height:1}.pst-status-menu{display:none;position:absolute;right:0;top:34px;z-index:3500;width:150px;background:#fff;border:1px solid #DDE5E8;border-radius:10px;padding:5px;box-shadow:0 14px 38px rgba(28,42,48,.18)}.pst-status-menu.open{display:block}.pst-status-menu button{width:100%;height:32px;border:0;border-radius:7px;background:#fff;text-align:left;padding:0 10px;font-size:10px;color:#465158;cursor:pointer}.pst-status-menu button:hover{background:#F2F8FA;color:${BLUE_DARK}}.pst-status-menu button.won{color:${GREEN}}.pst-status-menu button.archive{color:#6D7378}.pst-status-modal-bg{position:fixed;inset:0;z-index:4600;background:rgba(24,31,35,.48);display:flex;align-items:center;justify-content:center;padding:20px}.pst-status-modal{width:min(570px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 26px 75px rgba(20,27,31,.3)}.pst-status-modal-hd{display:flex;justify-content:space-between;gap:14px;padding:18px 20px;border-bottom:1px solid #E6EAEC}.pst-status-modal-title{font-size:15px;font-weight:780;color:#242B2F}.pst-status-modal-sub{font-size:10.5px;color:#7C878D;margin-top:4px;line-height:1.45}.pst-status-x{border:0;background:#F4F6F7;border-radius:9px;width:32px;height:32px;font-size:19px;color:#657077;cursor:pointer}.pst-status-modal-body{padding:18px 20px}.pst-status-field{margin-bottom:14px}.pst-status-label{display:block;font-size:9.5px;font-weight:760;letter-spacing:.5px;text-transform:uppercase;color:#727D83;margin-bottom:6px}.pst-status-input,.pst-status-select,.pst-status-text{width:100%;border:1px solid #D9E1E4;border-radius:9px;background:#fff;padding:10px 11px;font:inherit;font-size:11.5px;color:#2C3438;outline:none}.pst-status-text{min-height:105px;resize:vertical;line-height:1.5}.pst-status-input:focus,.pst-status-select:focus,.pst-status-text:focus{border-color:${BLUE};box-shadow:0 0 0 3px rgba(91,155,179,.12)}.pst-status-check{display:flex;align-items:flex-start;gap:8px;font-size:10.5px;color:#606B71;line-height:1.45}.pst-status-check input{margin-top:2px}.pst-status-error{display:none;margin-top:12px;padding:9px 10px;border-radius:8px;background:#F9ECEA;color:#8E3227;font-size:10.5px}.pst-status-modal-ft{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #E6EAEC}.pst-status-cancel,.pst-status-save{height:36px;border-radius:9px;padding:0 14px;font-size:10.5px;font-weight:750;cursor:pointer}.pst-status-cancel{background:#fff;border:1px solid #D9E1E4;color:#59646A}.pst-status-save{border:0;background:linear-gradient(135deg,#67A8C0,#3F7F98);color:#fff}.pst-status-save.lost{background:${RED}}.pst-status-save:disabled{opacity:.55;cursor:wait}#pst-status-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:4700;background:#252C30;color:#fff;border-radius:10px;padding:10px 14px;font-size:11px;box-shadow:0 9px 30px rgba(20,26,30,.24)}#pst-status-toast.error{background:#8E3227}
@media(max-width:900px){.pst-status-btn.lost,.pst-status-btn.delay{display:none}.pst-status-actions{gap:4px}}
`;
 document.head.appendChild(s);
}

async function getProject(id){if(typeof window.supaFetch!=='function')throw new Error('Lidhja me databazën nuk është gati.');var r=await window.supaFetch('projects?id=eq.'+enc(id)+'&select=*&limit=1');return arr(r)[0]||null;}
async function logStatus(project,status,reason){try{await window.supaFetch('dismissed_items','POST',{item_type:status==='humbur'?'project_loss':'project_status',item_ref:'project-status:'+project.id+':'+Date.now(),project_id:project.id,label:project.name||'Projekt',reason:reason||status,dismissed_by:currentUser()});}catch(e){console.warn('PRISTEEL status log:',e);}}
async function archiveTasks(project,reason){
 var tasks=[];try{tasks=arr(await window.supaFetch('tasks?project_id=eq.'+enc(project.id)+'&status=eq.hapur&select=*&limit=500'));}catch(e){return 0;}
 var count=0,stamp=new Date().toISOString();
 for(var i=0;i<tasks.length;i++){
  try{
   try{await window.supaFetch('task_archive','POST',{task_id:tasks[i].id,project_id:project.id,title:tasks[i].title||'Detyrë e projektit',detail:tasks[i].detail||'',category:tasks[i].category||'intern',reason:reason,archived_by:currentUser()});}catch(_e){}
   await window.supaFetch('tasks?id=eq.'+enc(tasks[i].id),'PATCH',{status:'arkivuar',done_at:stamp});count++;
  }catch(e){console.warn('PRISTEEL archive task:',e);}
 }
 return count;
}
async function refreshProjects(){closeMenus();if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('projects');return;}if(typeof window.pstReleaseRenderProjects==='function')window.pstReleaseRenderProjects();}
async function patchProject(project,status,extra,reason){var body={status:status};Object.keys(extra||{}).forEach(function(k){body[k]=extra[k];});await window.supaFetch('projects?id=eq.'+enc(project.id),'PATCH',body);await logStatus(project,status,reason);}

async function quickStatus(id,status,label){
 closeMenus();if(saving)return;
 try{
  var p=await getProject(id);if(!p)throw new Error('Projekti nuk u gjet.');
  var question=status==='fituar'?'Ta shënosh projektin si të fituar?':status==='arkivuar'?'Ta arkivosh projektin?':status==='aktiv'?'Ta kthesh projektin si aktiv?':'Ta vendosësh projektin në pritje?';
  if(!window.confirm(question))return;
  saving=true;await patchProject(p,status,{},label);toast('Statusi u ndryshua në “'+label+'”.');refreshProjects();
 }catch(e){toast('Ndryshimi dështoi: '+(e.message||e),true);}finally{saving=false;}
}

function modalShell(title,sub,body,saveLabel,lost){
 closeModal();var bg=document.createElement('div');bg.id='pst-status-modal-bg';bg.className='pst-status-modal-bg';
 bg.onclick=function(e){if(e.target===bg)closeModal();};
 bg.innerHTML='<div class="pst-status-modal"><div class="pst-status-modal-hd"><div><div class="pst-status-modal-title">'+esc(title)+'</div><div class="pst-status-modal-sub">'+esc(sub)+'</div></div><button type="button" class="pst-status-x">×</button></div><div class="pst-status-modal-body">'+body+'<div id="pst-status-error" class="pst-status-error"></div></div><div class="pst-status-modal-ft"><button type="button" class="pst-status-cancel">Anulo</button><button type="button" id="pst-status-save" class="pst-status-save'+(lost?' lost':'')+'">'+esc(saveLabel)+'</button></div></div>';
 document.body.appendChild(bg);bg.querySelector('.pst-status-x').onclick=closeModal;bg.querySelector('.pst-status-cancel').onclick=closeModal;return bg;
}

async function openLost(id){
 closeMenus();
 try{
  var p=await getProject(id);if(!p)throw new Error('Projekti nuk u gjet.');
  var body='<div class="pst-status-field"><label class="pst-status-label">Arsyeja kryesore</label><select id="pst-status-lost-category" class="pst-status-select"><option value="">Zgjidh arsyen…</option><option>Projekti iu dha një konkurrenti</option><option>Çmimi ynë ishte më i lartë</option><option>Afati i dorëzimit</option><option>Kërkesat teknike ose kapaciteti</option><option>Klienti e anuloi projektin</option><option>Klienti nuk u përgjigj</option><option>Arsye tjetër</option></select></div><div class="pst-status-field"><label class="pst-status-label">Shpjegimi</label><textarea id="pst-status-lost-detail" class="pst-status-text" placeholder="P.sh. Blerësi konfirmoi se projekti iu dha një kompanie tjetër."></textarea></div><label class="pst-status-check"><input id="pst-status-lost-archive" type="checkbox" checked><span>Arkivo detyrat e hapura të projektit, që të mos vazhdojnë të shfaqen si të vonuara.</span></label>';
  var bg=modalShell('Shëno projektin si të humbur',p.name||'Projekt',body,'Ruaj si të humbur',true);
  bg.querySelector('#pst-status-save').onclick=async function(){
   if(saving)return;var cat=String((document.getElementById('pst-status-lost-category')||{}).value||'').trim(),detail=String((document.getElementById('pst-status-lost-detail')||{}).value||'').trim();
   if(!cat){errorText('Zgjidh arsyen kryesore.');return;}if(detail.length<5){errorText('Shkruaj një shpjegim të shkurtër.');return;}
   saving=true;var b=this;b.disabled=true;b.textContent='Duke ruajtur…';
   try{var reason=cat+' — '+detail;await patchProject(p,'humbur',{},reason);var n=0;if((document.getElementById('pst-status-lost-archive')||{}).checked)n=await archiveTasks(p,'Projekti u mbyll si i humbur: '+reason);saving=false;closeModal();toast('Projekti u shënua si i humbur.'+(n?' U arkivuan '+n+' detyra.':''));refreshProjects();}
   catch(e){saving=false;b.disabled=false;b.textContent='Ruaj si të humbur';errorText(e.message||String(e));}
  };
 }catch(e){toast('Nuk u hap veprimi: '+(e.message||e),true);}
}

async function openDelayed(id){
 closeMenus();
 try{
  var p=await getProject(id);if(!p)throw new Error('Projekti nuk u gjet.');
  var body='<div class="pst-status-field"><label class="pst-status-label">Data e re e pritshme</label><input id="pst-status-delay-date" type="date" class="pst-status-input" value="'+esc(p.deadline||'')+'"></div><div class="pst-status-field"><label class="pst-status-label">Arsyeja / shënimi</label><textarea id="pst-status-delay-detail" class="pst-status-text" placeholder="P.sh. Blerësi e ka shtyrë vendimin deri në muajin tjetër."></textarea></div>';
  var bg=modalShell('Shtyje projektin',p.name||'Projekt',body,'Ruaj shtyrjen',false);
  bg.querySelector('#pst-status-save').onclick=async function(){
   if(saving)return;var date=String((document.getElementById('pst-status-delay-date')||{}).value||''),detail=String((document.getElementById('pst-status-delay-detail')||{}).value||'').trim();
   if(!date){errorText('Vendos datën e re.');return;}if(detail.length<5){errorText('Shkruaj arsyen e shtyrjes.');return;}
   saving=true;var b=this;b.disabled=true;b.textContent='Duke ruajtur…';
   try{await patchProject(p,'shtyre',{deadline:date},'Shtyrë deri më '+date+' — '+detail);saving=false;closeModal();toast('Projekti u shty deri më '+new Date(date+'T12:00:00').toLocaleDateString('sq-AL')+'.');refreshProjects();}
   catch(e){saving=false;b.disabled=false;b.textContent='Ruaj shtyrjen';errorText(e.message||String(e));}
  };
 }catch(e){toast('Nuk u hap veprimi: '+(e.message||e),true);}
}

window.pstProjectQuickStatus=quickStatus;
window.pstProjectMarkLost=openLost;
window.pstProjectMarkDelayed=openDelayed;

function projectIdFromRow(row){var v=row.getAttribute('onclick')||'',m=v.match(/pstReleaseOpenProject\(['\"]([^'\"]+)/);return m?m[1]:'';}
function actionHtml(id){return '<div class="pst-status-actions"><button type="button" class="pst-status-btn" data-act="open" data-id="'+esc(id)+'">Hap</button><button type="button" class="pst-status-btn lost" data-act="lost" data-id="'+esc(id)+'">Humbur</button><button type="button" class="pst-status-btn delay" data-act="delay" data-id="'+esc(id)+'">Shtyrë</button><button type="button" class="pst-status-btn more" data-act="menu" aria-label="Më shumë">⋯</button><div class="pst-status-menu"><button type="button" class="won" data-act="status" data-status="fituar" data-label="Fituar" data-id="'+esc(id)+'">Fituar</button><button type="button" data-act="status" data-status="aktiv" data-label="Aktiv" data-id="'+esc(id)+'">Aktiv</button><button type="button" data-act="status" data-status="pritje" data-label="Në pritje" data-id="'+esc(id)+'">Në pritje</button><button type="button" class="archive" data-act="status" data-status="arkivuar" data-label="Arkivuar" data-id="'+esc(id)+'">Arkivo</button></div></div>';}

/* Idempotent. Crucially, it never rewrites existing nodes on every DOM mutation. */
function augment(){
 addCss();
 var host=document.getElementById('pst-release-project-list');if(!host)return;
 var th=host.querySelector('thead th:last-child');if(th&&th.textContent.trim()!=='Veprime')th.textContent='Veprime';
 host.querySelectorAll('tbody tr').forEach(function(row){
  var id=projectIdFromRow(row);if(!id)return;
  var cell=row.querySelector('td:last-child');if(!cell||cell.querySelector('.pst-status-actions'))return;
  cell.innerHTML=actionHtml(id);cell.style.minWidth='250px';
 });
 var filter=document.getElementById('pst-release-project-filter');
 if(filter&&!filter.querySelector('option[value="delayed"]'))filter.insertAdjacentHTML('beforeend','<option value="delayed">Të shtyra</option><option value="archived">Të arkivuara</option>');
}
function filterCustomRows(mode){var host=document.getElementById('pst-release-project-list');if(!host)return;host.querySelectorAll('tbody tr').forEach(function(row){var badge=row.querySelector('.pst-ws-status'),t=String(badge&&badge.textContent||'').toLowerCase();var ok=mode==='delayed'?t.indexOf('shtyr')>-1:t.indexOf('arkiv')>-1;row.style.display=ok?'':'none';});}
function wrapRenderer(){
 var base=window.pstReleaseRenderProjects;
 if(typeof base!=='function'||base.__pstStatusActions)return false;
 window.pstReleaseRenderProjects=function(){
  var f=document.getElementById('pst-release-project-filter'),mode=f&&f.value;
  if(mode==='delayed'||mode==='archived'){
   f.value='all';var result=base.apply(this,arguments);f.value=mode;
   setTimeout(function(){augment();filterCustomRows(mode);},0);return result;
  }
  var result=base.apply(this,arguments);setTimeout(augment,0);return result;
 };
 window.pstReleaseRenderProjects.__pstStatusActions=true;
 wrapped=true;
 return true;
}

document.addEventListener('click',function(e){
 var b=e.target.closest('[data-act]');if(!b)return;
 var host=b.closest('#pst-release-project-list');if(!host)return;
 e.preventDefault();e.stopPropagation();
 var act=b.dataset.act,id=b.dataset.id;
 if(act==='open'){if(typeof window.pstReleaseOpenProject==='function')window.pstReleaseOpenProject(id);return;}
 if(act==='lost'){openLost(id);return;}
 if(act==='delay'){openDelayed(id);return;}
 if(act==='menu'){var m=b.parentNode.querySelector('.pst-status-menu'),was=m.classList.contains('open');closeMenus();if(!was)m.classList.add('open');return;}
 if(act==='status'){quickStatus(id,b.dataset.status,b.dataset.label);}
},true);
document.addEventListener('click',function(e){if(!e.target.closest('.pst-status-actions'))closeMenus();});

addCss();
var attempts=0;
var timer=setInterval(function(){
 attempts++;
 if(wrapRenderer()){clearInterval(timer);augment();return;}
 if(attempts>=120)clearInterval(timer);
},100);
/* No document-wide MutationObserver here. It was the source of the page freeze. */
})();