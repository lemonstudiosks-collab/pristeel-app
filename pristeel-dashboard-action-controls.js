/* PRISTEEL: shared controls for completing or dismissing dashboard actions */
(function(){
'use strict';
if(window.__pstDashboardActionControlsLoaded)return;
window.__pstDashboardActionControlsLoaded=true;

var TABLE='dashboard_action_states';
var LEGACY_KEY='pst_dashboard_action_states_v1';
var observer=null;
var applying=false;
var states={};
var loaded=false;
var loading=null;
var lastChange=null;

var style=document.createElement('style');
style.id='pst-dashboard-action-controls-style';
style.textContent=`
.pst-action{position:relative}
.pst-action-controls{display:flex;align-items:center;gap:5px;flex-shrink:0;margin-left:2px}
.pst-action-control{border:1px solid #E1E4E6;background:#fff;color:#747B81;border-radius:7px;padding:4px 7px;font-size:9px;font-weight:700;line-height:1.1;cursor:pointer;white-space:nowrap;transition:background .14s,border-color .14s,color .14s,opacity .14s}
.pst-action-control:hover{background:#F3F5F5;border-color:#CDD2D5;color:#303438}
.pst-action-control.done:hover{background:#EAF5EF;border-color:#CBE5D6;color:#2F7657}
.pst-action-control.dismiss:hover{background:#F9ECEA;border-color:#E8CCC8;color:#A64B42}
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
function toast(label,options){
  options=options||{};
  var old=document.getElementById('pst-action-toast');if(old)old.remove();
  var el=document.createElement('div');
  el.id='pst-action-toast';
  if(options.error)el.classList.add('error');
  el.innerHTML='<span></span>'+(options.undo?'<button type="button">Zhbëj</button>':'');
  el.querySelector('span').textContent=label;
  if(options.undo){
    el.querySelector('button').addEventListener('click',options.undo);
  }
  document.body.appendChild(el);
  setTimeout(function(){if(el.parentNode)el.remove();},options.error?6500:5000);
  return el;
}
function setButtonsBusy(row,busy){
  row.querySelectorAll('.pst-action-control').forEach(function(btn){btn.disabled=!!busy;});
}
async function fetchStates(){
  if(typeof window.supaFetch!=='function')throw new Error('Lidhja me databazën nuk është gati.');
  var rows=await window.supaFetch(TABLE+'?select=action_key,state,updated_at&order=updated_at.desc&limit=5000');
  var next={};
  arr(rows).forEach(function(row){if(row&&row.action_key)next[row.action_key]=row;});
  states=next;
  loaded=true;
  return states;
}
async function migrateLegacy(){
  var legacy={};
  try{legacy=parse(localStorage.getItem(LEGACY_KEY),'')||{};}catch(e){}
  var keys=Object.keys(legacy||{});
  if(!keys.length)return;

  for(var i=0;i<keys.length;i++){
    var key=keys[i],entry=legacy[key]||{};
    if(states[key])continue;
    var state=entry.state==='completed'?'completed':'dismissed';
    try{
      await window.supaFetch(TABLE,'POST',{
        action_key:key,
        state:state,
        action_type:'legacy',
        title:'Migrated dashboard action',
        meta:'Imported from browser storage',
        source_ref:'localStorage',
        updated_by:currentUser()||null,
        updated_at:new Date(Number(entry.at)||Date.now()).toISOString()
      });
      states[key]={action_key:key,state:state,updated_at:new Date().toISOString()};
    }catch(e){
      console.warn('Nuk u migrua gjendja lokale e dashboard-it:',key,e);
    }
  }
  try{localStorage.removeItem(LEGACY_KEY);}catch(e){}
}
function loadStates(force){
  if(loaded&&!force)return Promise.resolve(states);
  if(loading&&!force)return loading;
  loading=fetchStates().then(function(){return migrateLegacy();}).then(function(){
    loading=null;
    apply();
    return states;
  }).catch(function(err){
    loading=null;
    loaded=false;
    console.error('PRISTEEL dashboard action states:',err);
    throw err;
  });
  return loading;
}
async function upsertState(data,state){
  var existing=await window.supaFetch(TABLE+'?action_key=eq.'+escQuery(data.key)+'&select=action_key&limit=1');
  var payload={
    state:state,
    action_type:data.type||null,
    title:data.title||null,
    meta:data.meta||null,
    source_ref:data.sourceRef||null,
    updated_by:currentUser()||null,
    updated_at:new Date().toISOString()
  };
  if(existing&&existing.length){
    await window.supaFetch(TABLE+'?action_key=eq.'+escQuery(data.key),'PATCH',payload);
  }else{
    payload.action_key=data.key;
    await window.supaFetch(TABLE,'POST',payload);
  }
  states[data.key]=Object.assign({action_key:data.key},payload);
}
async function deleteState(key){
  await window.supaFetch(TABLE+'?action_key=eq.'+escQuery(key),'DELETE');
  delete states[key];
}
function removeRow(row){
  row.classList.add('pst-action-removing');
  setTimeout(function(){
    if(row.parentNode)row.remove();
    ensureEmpty();
  },170);
}
async function store(row,state){
  var data=actionData(row);
  setButtonsBusy(row,true);
  try{
    await upsertState(data,state);
    lastChange={key:data.key};
    removeRow(row);
    toast(state==='completed'?'Veprimi u shënua si i kryer në platformë.':'Veprimi u hoq nga lista në platformë.',{
      undo:async function(){
        try{
          await deleteState(data.key);
          var old=document.getElementById('pst-action-toast');if(old)old.remove();
          if(typeof window.pstV2RenderDashboard==='function')await window.pstV2RenderDashboard();
          await loadStates(true);
        }catch(err){toast('Zhbërja dështoi: '+(err.message||err),{error:true});}
      }
    });
  }catch(err){
    setButtonsBusy(row,false);
    toast('Nuk u ruajt në databazë: '+(err.message||err),{error:true});
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
function apply(){
  if(applying||!loaded)return;
  applying=true;
  try{
    var host=document.getElementById('pst-action-list');if(!host)return;
    host.querySelectorAll(':scope > .pst-action').forEach(function(row){
      var data=actionData(row);
      if(states[data.key]){row.remove();return;}
      if(row.querySelector('.pst-action-controls'))return;
      var controls=document.createElement('span');
      controls.className='pst-action-controls';
      controls.appendChild(button('Kryer','done',row));
      controls.appendChild(button('Hiqe','dismiss',row));
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
  loadStates(false).catch(function(err){
    toast('Duhet aktivizuar ruajtja qendrore e veprimeve në Supabase.',{error:true});
  });
  return true;
}
var tries=0,timer=setInterval(function(){if(start()||++tries>160)clearInterval(timer);},250);
window.addEventListener('pst-dashboard-rendered',function(){loadStates(true).catch(function(){});});
})();
