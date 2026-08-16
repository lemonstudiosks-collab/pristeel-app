/* PRISTEEL: shared, non-blocking dashboard action controls */
(function(){
'use strict';
if(window.__pstDashboardActionControlsV2Loaded)return;
window.__pstDashboardActionControlsV2Loaded=true;

var TABLE='dashboard_action_states';
var states={};
var loaded=false;
var observer=null;
var applying=false;
var pending={};

var style=document.createElement('style');
style.id='pst-dashboard-action-controls-v2-style';
style.textContent=`
.pst-action{position:relative}
.pst-action-controls{display:flex;align-items:center;gap:5px;flex-shrink:0;margin-left:2px}
.pst-action-control{border:1px solid #E1E4E6;background:#fff;color:#747B81;border-radius:7px;padding:4px 7px;font-size:9px;font-weight:700;line-height:1.1;cursor:pointer;white-space:nowrap;transition:background .14s,border-color .14s,color .14s,opacity .14s}
.pst-action-control:hover{background:#F3F5F5;border-color:#CDD2D5;color:#303438}
.pst-action-control.done:hover{background:#EAF5EF;border-color:#CBE5D6;color:#2F7657}
.pst-action-control.dismiss:hover{background:#F9ECEA;border-color:#E8CCC8;color:#A64B42}
.pst-action-control.source{color:#3F7F98;border-color:#CFE0E7;background:#F8FBFC}
.pst-action-control.source:hover{background:#EDF6F9;border-color:#B8D4DF;color:#2F6E86}
.pst-action-control:disabled{opacity:.45;cursor:wait}
.pst-action-removing{opacity:0;transform:translateX(10px);transition:opacity .16s,transform .16s}
#pst-action-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:4000;display:flex;align-items:center;gap:12px;background:#25292C;color:#fff;border-radius:10px;padding:10px 12px 10px 14px;box-shadow:0 8px 28px rgba(20,25,28,.22);font-size:11px}
#pst-action-toast.error{background:#8E3227}
#pst-action-toast button{border:0;background:transparent;color:#F0B785;font-size:10px;font-weight:750;cursor:pointer;padding:2px 3px}
@media(max-width:760px){.pst-action{align-items:flex-start}.pst-action-controls{flex-direction:column;align-items:stretch}.pst-action-control{padding:4px 6px}.pst-action-tag{display:none}}
`;
document.head.appendChild(style);

function parse(value,fallback){try{return JSON.parse(value||'');}catch(e){return fallback;}}
function arr(value){return Array.isArray(value)?value:[];}
function escQuery(value){return encodeURIComponent(String(value||''));}
function currentUser(){
  try{
    var session=parse(localStorage.getItem('pristeel_session'),'')||{};
    return session.email||'';
  }catch(e){return '';}
}
function hash(text){
  text=String(text||'');
  var h=2166136261;
  for(var i=0;i<text.length;i++){
    h^=text.charCodeAt(i);
    h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);
  }
  return (h>>>0).toString(36);
}
function actionData(row){
  var title=row.querySelector('.pst-action-title');
  var meta=row.querySelector('.pst-action-meta');
  var tag=row.querySelector('.pst-action-tag');
  var normalized=[
    row.getAttribute('onclick')||'',
    title?title.textContent:'',
    meta?meta.textContent:'',
    tag?tag.textContent:''
  ].join('|').toLowerCase().replace(/\s+/g,' ').trim();
  return{
    key:'a_'+hash(normalized),
    title:title?String(title.textContent||'').trim():'',
    meta:meta?String(meta.textContent||'').trim():'',
    type:tag?String(tag.textContent||'').trim():'',
    sourceRef:row.getAttribute('onclick')||''
  };
}
function sourceUrl(row){
  if(!row)return'';
  var meta=row.querySelector('.pst-action-meta');
  var text=String(meta?meta.textContent:'');
  var match=text.match(/https:\/\/[^\s<>"']+/i);
  if(!match)return'';
  var candidate=String(match[0]||'').replace(/[\]\)}>.,;]+$/g,'');
  try{
    var parsedUrl=new URL(candidate,window.location&&window.location.href||undefined);
    return parsedUrl.protocol==='https:'?parsedUrl.href:'';
  }catch(e){return'';}
}
function toast(label,options){
  options=options||{};
  var old=document.getElementById('pst-action-toast');if(old)old.remove();
  var el=document.createElement('div');
  el.id='pst-action-toast';
  if(options.error)el.classList.add('error');
  el.innerHTML='<span></span>'+(options.undo?'<button type="button">Zhbëj</button>':'');
  el.querySelector('span').textContent=label;
  if(options.undo)el.querySelector('button').addEventListener('click',options.undo);
  document.body.appendChild(el);
  setTimeout(function(){if(el.parentNode)el.remove();},options.error?6500:5000);
  return el;
}
function withTimeout(promise,ms,label){
  var timer;
  return Promise.race([
    promise,
    new Promise(function(_,reject){timer=setTimeout(function(){reject(new Error(label||'Kërkesa zgjati shumë.'));},ms);})
  ]).finally(function(){clearTimeout(timer);});
}
function db(path,method,body){
  if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Lidhja me databazën nuk është gati.'));
  return withTimeout(window.supaFetch(path,method,body),8000,'Databaza nuk u përgjigj brenda 8 sekondave.');
}
async function fetchStates(){
  var rows=await db(TABLE+'?select=action_key,state,updated_at&order=updated_at.desc&limit=5000');
  var next={};
  arr(rows).forEach(function(row){if(row&&row.action_key)next[row.action_key]=row;});
  states=next;
  loaded=true;
  apply();
}
async function saveState(data,state){
  var payload={
    action_key:data.key,
    state:state,
    action_type:data.type||null,
    title:data.title||null,
    meta:data.meta||null,
    source_ref:data.sourceRef||null,
    updated_by:currentUser()||null,
    updated_at:new Date().toISOString()
  };
  try{
    await db(TABLE,'POST',payload);
  }catch(firstError){
    await db(TABLE+'?action_key=eq.'+escQuery(data.key),'PATCH',{
      state:payload.state,
      action_type:payload.action_type,
      title:payload.title,
      meta:payload.meta,
      source_ref:payload.source_ref,
      updated_by:payload.updated_by,
      updated_at:payload.updated_at
    });
  }
  states[data.key]=payload;
}
async function deleteState(key){
  await db(TABLE+'?action_key=eq.'+escQuery(key),'DELETE');
  delete states[key];
}
function ensureEmpty(){
  var host=document.getElementById('pst-action-list');if(!host)return;
  if(host.querySelector('.pst-action'))return;
  if(!host.querySelector('.pst-action-controls-empty')){
    var empty=document.createElement('div');
    empty.className='pst-empty pst-action-controls-empty';
    empty.textContent='Nuk ka veprime urgjente për momentin.';
    host.appendChild(empty);
  }
}
function removeOptimistically(row){
  var parent=row.parentNode;
  var next=row.nextSibling;
  row.classList.add('pst-action-removing');
  setTimeout(function(){if(row.parentNode)row.remove();ensureEmpty();},170);
  return function restore(){
    row.classList.remove('pst-action-removing');
    if(!row.parentNode&&parent){
      var empty=parent.querySelector('.pst-action-controls-empty');if(empty)empty.remove();
      if(next&&next.parentNode===parent)parent.insertBefore(row,next);else parent.appendChild(row);
    }
    row.querySelectorAll('.pst-action-control').forEach(function(btn){btn.disabled=false;});
  };
}
async function store(row,state){
  var data=actionData(row);
  if(pending[data.key])return;
  pending[data.key]=true;
  row.querySelectorAll('.pst-action-control').forEach(function(btn){btn.disabled=true;});
  var restore=removeOptimistically(row);

  try{
    await saveState(data,state);
    toast(state==='completed'?'Veprimi u shënua si i kryer në platformë.':'Veprimi u hoq nga lista në platformë.',{
      undo:async function(){
        try{
          await deleteState(data.key);
          var old=document.getElementById('pst-action-toast');if(old)old.remove();
          if(typeof window.pstV2RenderDashboard==='function')await window.pstV2RenderDashboard();
          await fetchStates();
        }catch(err){toast('Zhbërja dështoi: '+(err.message||err),{error:true});}
      }
    });
  }catch(err){
    delete states[data.key];
    restore();
    toast('Veprimi nuk u ruajt: '+(err.message||err),{error:true});
  }finally{
    delete pending[data.key];
  }
}
function button(label,kind,row){
  var btn=document.createElement('button');
  btn.type='button';
  btn.className='pst-action-control '+kind;
  btn.textContent=label;
  btn.title=kind==='done'?'Shënoje veprimin si të kryer':'Hiqe këtë veprim si të parëndësishëm';
  btn.addEventListener('click',function(event){
    event.preventDefault();event.stopPropagation();
    store(row,kind==='done'?'completed':'dismissed');
  });
  return btn;
}
function sourceButton(url){
  var btn=document.createElement('button');
  btn.type='button';
  btn.className='pst-action-control source';
  btn.textContent='Burimi';
  btn.title='Hap burimin zyrtar në tab të ri';
  btn.addEventListener('click',function(event){
    event.preventDefault();event.stopPropagation();
    window.open(url,'_blank','noopener,noreferrer');
  });
  return btn;
}
function apply(){
  if(applying||!loaded)return;
  applying=true;
  try{
    var host=document.getElementById('pst-action-list');if(!host)return;
    host.querySelectorAll(':scope > .pst-action').forEach(function(row){
      var data=actionData(row);
      if(states[data.key]){row.remove();return;}
      var old=row.querySelector('.pst-action-controls');
      if(old)return;
      var controls=document.createElement('span');
      controls.className='pst-action-controls';
      controls.appendChild(button('Kryer','done',row));
      controls.appendChild(button('Hiqe','dismiss',row));
      var url=sourceUrl(row);if(url)controls.appendChild(sourceButton(url));
      row.appendChild(controls);
    });
    ensureEmpty();
  }finally{applying=false;}
}
function start(){
  var host=document.getElementById('pst-action-list');
  if(!host)return false;
  if(observer)observer.disconnect();
  observer=new MutationObserver(function(){setTimeout(apply,0);});
  observer.observe(host,{childList:true,subtree:false});
  fetchStates().catch(function(err){
    loaded=false;
    toast('Nuk u ngarkuan veprimet nga Supabase: '+(err.message||err),{error:true});
  });
  return true;
}
window.PSTDashboardActionControlsV2={sourceUrl:sourceUrl};
var tries=0,timer=setInterval(function(){if(start()||++tries>160)clearInterval(timer);},250);
window.addEventListener('pst-dashboard-rendered',function(){fetchStates().catch(function(){});});
})();