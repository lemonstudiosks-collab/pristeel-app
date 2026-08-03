/* PRISTEEL: mbyllja e projektit si i humbur, me arsye dhe arkivim te detyrave */
(function(){
'use strict';
if(window.__pstProjectLossLoaded)return;
window.__pstProjectLossLoaded=true;

var saving=false;
var installedBoardHook=false;
var lastProjectId='';

var style=document.createElement('style');
style.id='pst-project-loss-style';
style.textContent=`
.pst-loss-btn{height:34px;border:1px solid #D9B5B0;border-radius:9px;background:#FFF;color:#9B3D35;padding:0 11px;font-size:10px;font-weight:750;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.pst-loss-btn:hover{background:#F9ECEA;border-color:#C98981;color:#8E3227}
.pst-loss-btn.small{height:30px;padding:0 10px;font-size:9.5px}
.pst-loss-btn:disabled{opacity:.48;cursor:wait}
.pst-loss-bg{position:fixed;inset:0;z-index:4200;background:rgba(25,30,34,.46);display:flex;align-items:center;justify-content:center;padding:20px}
.pst-loss-modal{width:min(560px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:15px;box-shadow:0 24px 70px rgba(20,25,28,.28)}
.pst-loss-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:17px 19px;border-bottom:1px solid #E8EAEB}
.pst-loss-title{font-size:15px;font-weight:760;color:#25292C}.pst-loss-sub{font-size:10px;color:#858C91;margin-top:3px;line-height:1.45}
.pst-loss-x{border:0;background:transparent;color:#858C91;font-size:20px;cursor:pointer;padding:0 3px;line-height:1}
.pst-loss-body{padding:17px 19px}.pst-loss-label{display:block;font-size:9.5px;font-weight:750;text-transform:uppercase;letter-spacing:.55px;color:#747B81;margin:0 0 6px}
.pst-loss-select,.pst-loss-text{width:100%;border:1px solid #DDE1E3;border-radius:9px;background:#fff;color:#2E3235;font:inherit;font-size:12px;padding:10px 11px;outline:none}
.pst-loss-text{min-height:110px;resize:vertical;line-height:1.5}.pst-loss-select:focus,.pst-loss-text:focus{border-color:#A65F2E;box-shadow:0 0 0 3px rgba(166,95,46,.09)}
.pst-loss-field{margin-bottom:14px}.pst-loss-check{display:flex;align-items:flex-start;gap:8px;font-size:11px;color:#5F666B;line-height:1.45;cursor:pointer}.pst-loss-check input{margin-top:2px}
.pst-loss-note{margin-top:13px;padding:10px 11px;border-radius:9px;background:#F8F9F9;color:#747B81;font-size:10px;line-height:1.5}
.pst-loss-error{display:none;margin-top:11px;padding:9px 10px;border-radius:8px;background:#F9ECEA;color:#8E3227;font-size:10.5px;line-height:1.45}
.pst-loss-ft{display:flex;justify-content:flex-end;gap:8px;padding:14px 19px;border-top:1px solid #E8EAEB}
.pst-loss-cancel,.pst-loss-save{height:35px;border-radius:9px;padding:0 13px;font-size:10.5px;font-weight:750;cursor:pointer}
.pst-loss-cancel{border:1px solid #DDE1E3;background:#fff;color:#596067}.pst-loss-save{border:1px solid #A64B42;background:#A64B42;color:#fff}.pst-loss-save:hover{background:#8E3227}.pst-loss-save:disabled{opacity:.55;cursor:wait}
#pst-loss-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:4300;background:#25292C;color:#fff;border-radius:10px;padding:10px 14px;font-size:11px;box-shadow:0 8px 28px rgba(20,25,28,.22)}
.pst-pb-card.is-lost{display:none!important}
@media(max-width:760px){.pst-loss-btn{height:31px;padding:0 9px;font-size:9px}.pst-loss-ft{flex-direction:column-reverse}.pst-loss-cancel,.pst-loss-save{width:100%}}
`;
document.head.appendChild(style);

function arr(value){return Array.isArray(value)?value:[];}
function enc(value){return encodeURIComponent(String(value==null?'':value));}
function parse(value,fallback){try{return JSON.parse(value||'');}catch(e){return fallback;}}
function currentUser(){
  try{var session=parse(localStorage.getItem('pristeel_session'),{})||{};return session.email||'admin';}catch(e){return 'admin';}
}
function projectId(){
  var select=document.getElementById('global-proj');
  var id=select&&select.value?select.value:'';
  if(!id&&window._curProjId)id=window._curProjId;
  if(!id&&window.__pstCurrentProjectId)id=window.__pstCurrentProjectId;
  return String(id||'');
}
function projectName(){
  var select=document.getElementById('global-proj');
  if(select&&select.value&&select.selectedIndex>=0){
    var text=String(select.options[select.selectedIndex].textContent||'').trim();
    if(text&&text.indexOf('—')!==0)return text;
  }
  var title=document.querySelector('.topbar-title');
  return title?String(title.textContent||'').replace(/^\s*\d+\s*[·.-]\s*/,'').trim():'Projekt';
}
async function getProject(id){
  if(typeof window.supaFetch!=='function')throw new Error('Lidhja me databazën nuk është gati.');
  var rows=await window.supaFetch('projects?id=eq.'+enc(id)+'&select=*&limit=1');
  return arr(rows)[0]||null;
}
function finalStatus(status){return ['humbur','mbyllur','realizuar'].indexOf(String(status||'').toLowerCase())>-1;}
function toast(text){
  var old=document.getElementById('pst-loss-toast');if(old)old.remove();
  var el=document.createElement('div');el.id='pst-loss-toast';el.textContent=text;document.body.appendChild(el);
  setTimeout(function(){if(el.parentNode)el.remove();},5200);
}
function closeModal(){var bg=document.getElementById('pst-loss-bg');if(bg&&!saving)bg.remove();}
function setError(message){
  var el=document.getElementById('pst-loss-error');if(!el)return;
  el.style.display=message?'block':'none';el.textContent=message||'';
}
function reasonText(category,detail){return category+(detail?' — '+detail:'');}

async function archiveProjectTasks(project,reason){
  var tasks=[];
  try{tasks=await window.supaFetch('tasks?project_id=eq.'+enc(project.id)+'&status=eq.hapur&select=*&limit=500');}catch(e){return{count:0,failed:0,error:e};}
  var done=0,failed=0,stamp=new Date().toISOString();
  for(var i=0;i<arr(tasks).length;i++){
    var task=tasks[i];
    try{
      await window.supaFetch('task_archive','POST',{
        task_id:task.id,
        project_id:task.project_id||project.id,
        title:task.title||'Detyrë e projektit',
        detail:task.detail||'',
        category:task.category||'intern',
        reason:'Projekti u mbyll si i humbur: '+reason,
        archived_by:currentUser()
      });
      await window.supaFetch('tasks?id=eq.'+enc(task.id),'PATCH',{status:'arkivuar',done_at:stamp});
      done++;
    }catch(e){failed++;console.warn('Nuk u arkivua detyra',task.id,e);}
  }
  return{count:done,failed:failed};
}

async function saveLoss(){
  if(saving)return;
  var id=projectId(),categoryEl=document.getElementById('pst-loss-category'),detailEl=document.getElementById('pst-loss-detail'),archiveEl=document.getElementById('pst-loss-archive');
  var category=categoryEl?String(categoryEl.value||'').trim():'',detail=detailEl?String(detailEl.value||'').trim():'';
  if(!id){setError('Nuk ka projekt aktiv.');return;}
  if(!category){setError('Zgjidh arsyen kryesore të humbjes.');return;}
  if(detail.length<5){setError('Shkruaj një shpjegim të shkurtër, së paku 5 karaktere.');return;}

  saving=true;setError('');
  var save=document.getElementById('pst-loss-save');if(save){save.disabled=true;save.textContent='Duke mbyllur…';}
  var logRef='project-loss:'+id+':'+Date.now(),logged=false,previous='';
  try{
    var project=await getProject(id);
    if(!project)throw new Error('Projekti nuk u gjet.');
    if(finalStatus(project.status))throw new Error('Ky projekt është tashmë '+(project.status==='humbur'?'i humbur':'i mbyllur')+'.');
    previous=project.status||'pritje';
    var reason=reasonText(category,detail);

    await window.supaFetch('dismissed_items','POST',{
      item_type:'project_loss',
      item_ref:logRef,
      project_id:project.id,
      label:project.name||projectName(),
      reason:reason,
      dismissed_by:currentUser()
    });
    logged=true;

    try{
      await window.supaFetch('projects?id=eq.'+enc(project.id),'PATCH',{status:'humbur'});
    }catch(updateError){
      try{await window.supaFetch('dismissed_items?item_ref=eq.'+enc(logRef),'DELETE');}catch(cleanupError){}
      logged=false;
      throw updateError;
    }

    var taskResult={count:0,failed:0};
    if(archiveEl&&archiveEl.checked)taskResult=await archiveProjectTasks(project,reason);

    if(Array.isArray(window._allProjectsCache))window._allProjectsCache.forEach(function(row){if(String(row.id)===String(project.id))row.status='humbur';});
    var bg=document.getElementById('pst-loss-bg');saving=false;if(bg)bg.remove();
    if(typeof window.loadProjectList==='function')window.loadProjectList();
    if(typeof window.loadTasks==='function')window.loadTasks();
    if(typeof window.pstV2RenderDashboard==='function')window.pstV2RenderDashboard();
    if(typeof window.resetWorkspace==='function')window.resetWorkspace();
    var select=document.getElementById('global-proj');if(select)select.value='';
    if(typeof window.showPage==='function')window.showPage('import');
    toast('Projekti u mbyll si i humbur.'+(taskResult.count?' U arkivuan '+taskResult.count+' detyra.':'')+(taskResult.failed?' '+taskResult.failed+' detyra nuk u arkivuan.':''));
  }catch(error){
    saving=false;
    if(save){save.disabled=false;save.textContent='Mbyll projektin';}
    setError(error&&error.message?error.message:String(error));
    console.error('PRISTEEL project loss:',error,{logged:logged,previous:previous});
  }
}

async function openModal(){
  var id=projectId();
  if(!id){toast('Zgjidh një projekt aktiv fillimisht.');return;}
  try{
    var project=await getProject(id);
    if(!project){toast('Projekti nuk u gjet.');return;}
    if(finalStatus(project.status)){toast('Ky projekt është tashmë '+(project.status==='humbur'?'i humbur':'i mbyllur')+'.');return;}
    var old=document.getElementById('pst-loss-bg');if(old)old.remove();
    var bg=document.createElement('div');bg.id='pst-loss-bg';bg.className='pst-loss-bg';
    bg.addEventListener('click',function(event){if(event.target===bg)closeModal();});
    bg.innerHTML='<div class="pst-loss-modal">'
      +'<div class="pst-loss-hd"><div><div class="pst-loss-title">Mbyll projektin si të humbur</div><div class="pst-loss-sub">'+escapeHtml(project.name||projectName())+'<br>Projekti nuk fshihet. Ai kalon te “Të mbyllura / humbura” dhe arsyeja ruhet në platformë.</div></div><button type="button" class="pst-loss-x" aria-label="Mbyll">×</button></div>'
      +'<div class="pst-loss-body">'
        +'<div class="pst-loss-field"><label class="pst-loss-label" for="pst-loss-category">Arsyeja kryesore</label><select id="pst-loss-category" class="pst-loss-select"><option value="">Zgjidh arsyen…</option><option>Projekti iu dha një konkurrenti</option><option>Çmimi ynë ishte më i lartë</option><option>Afati i dorëzimit</option><option>Kërkesat teknike ose kapaciteti</option><option>Klienti e anuloi projektin</option><option>Klienti nuk u përgjigj</option><option>Arsye tjetër</option></select></div>'
        +'<div class="pst-loss-field"><label class="pst-loss-label" for="pst-loss-detail">Shpjegimi</label><textarea id="pst-loss-detail" class="pst-loss-text" placeholder="P.sh. Blerësi konfirmoi me email se kontrata iu dha kompanisë tjetër për shkak të çmimit."></textarea></div>'
        +'<label class="pst-loss-check"><input id="pst-loss-archive" type="checkbox" checked><span>Arkivo detyrat e hapura të këtij projekti, që të mos vazhdojnë të shfaqen si të vonuara.</span></label>'
        +'<div class="pst-loss-note">Emailat, dokumentet, BOM-i dhe ofertat mbeten të ruajtura. Ndryshon vetëm statusi i projektit dhe mbyllen ndjekjet aktive.</div>'
        +'<div id="pst-loss-error" class="pst-loss-error"></div>'
      +'</div>'
      +'<div class="pst-loss-ft"><button id="pst-loss-cancel" type="button" class="pst-loss-cancel">Anulo</button><button id="pst-loss-save" type="button" class="pst-loss-save">Mbyll projektin</button></div>'
    +'</div>';
    document.body.appendChild(bg);
    bg.querySelector('.pst-loss-x').addEventListener('click',closeModal);
    bg.querySelector('#pst-loss-cancel').addEventListener('click',closeModal);
    bg.querySelector('#pst-loss-save').addEventListener('click',saveLoss);
    setTimeout(function(){var el=document.getElementById('pst-loss-category');if(el)el.focus();},30);
  }catch(error){toast('Nuk u hap mbyllja e projektit: '+(error.message||error));}
}
function escapeHtml(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

function makeButton(id,small){
  var button=document.createElement('button');button.type='button';button.id=id;button.className='pst-loss-btn'+(small?' small':'');button.innerHTML='<span aria-hidden="true">×</span><span>Mbyll projektin</span>';button.addEventListener('click',openModal);return button;
}
function topHost(){
  var topbar=document.querySelector('.topbar');if(!topbar)return null;
  var children=topbar.children;if(children.length<2)return null;
  return children[children.length-1];
}
function addTopButton(id){
  var host=topHost();if(!host)return;
  var button=document.getElementById('pst-loss-top');
  if(!button){button=makeButton('pst-loss-top',false);var save=Array.from(host.querySelectorAll('button')).filter(function(x){return /ruaj/i.test(x.textContent||'');})[0];if(save)host.insertBefore(button,save);else host.appendChild(button);}
  button.style.display=id?'inline-flex':'none';
}
function addTaskButton(id){
  var tasks=document.getElementById('hub-tasks');if(!tasks)return;
  var header=tasks.previousElementSibling;if(!header)return;
  var actions=header.querySelector('span:last-child')||header;
  var button=document.getElementById('pst-loss-tasks');
  if(!button){button=makeButton('pst-loss-tasks',true);actions.insertBefore(button,actions.firstChild);}
  button.style.display=id?'inline-flex':'none';
}
function cleanBoard(){
  document.querySelectorAll('.pst-pb-card.is-lost').forEach(function(card){card.remove();});
  document.querySelectorAll('.pst-pb-stage').forEach(function(stage){
    var count=stage.querySelector('.pst-pb-count');if(count)count.textContent=String(stage.querySelectorAll('.pst-pb-card').length);
  });
  document.querySelectorAll('.pst-pb-phase').forEach(function(phase){
    var total=phase.querySelector('.pst-pb-phase-total'),n=phase.querySelectorAll('.pst-pb-card').length;if(total)total.textContent=n+' projekte';
  });
}
function installBoardHook(){
  if(installedBoardHook||typeof window.renderProjectBoard!=='function')return;
  installedBoardHook=true;var original=window.renderProjectBoard;
  window.renderProjectBoard=function(){var result=original.apply(this,arguments);setTimeout(cleanBoard,30);return result;};
}
function apply(){
  var id=projectId();
  if(id!==lastProjectId)lastProjectId=id;
  addTopButton(id);addTaskButton(id);installBoardHook();cleanBoard();
}
window.pstOpenProjectLoss=openModal;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setInterval(apply,700);});else setInterval(apply,700);
setTimeout(apply,0);
})();
