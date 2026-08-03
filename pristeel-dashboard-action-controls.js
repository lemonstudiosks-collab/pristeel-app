/* PRISTEEL: kontrolle per mbylljen ose largimin e veprimeve ne dashboard */
(function(){
'use strict';
if(window.__pstDashboardActionControlsLoaded)return;
window.__pstDashboardActionControlsLoaded=true;

var STORAGE_KEY='pst_dashboard_action_states_v1';
var MAX_AGE=365*24*60*60*1000;
var observer=null;
var applying=false;
var lastChange=null;

var style=document.createElement('style');
style.id='pst-dashboard-action-controls-style';
style.textContent=`
.pst-action{position:relative}
.pst-action-controls{display:flex;align-items:center;gap:5px;flex-shrink:0;margin-left:2px}
.pst-action-control{border:1px solid #E1E4E6;background:#fff;color:#747B81;border-radius:7px;padding:4px 7px;font-size:9px;font-weight:700;line-height:1.1;cursor:pointer;white-space:nowrap;transition:background .14s,border-color .14s,color .14s}
.pst-action-control:hover{background:#F3F5F5;border-color:#CDD2D5;color:#303438}
.pst-action-control.done:hover{background:#EAF5EF;border-color:#CBE5D6;color:#2F7657}
.pst-action-control.dismiss:hover{background:#F9ECEA;border-color:#E8CCC8;color:#A64B42}
.pst-action-removing{opacity:0;transform:translateX(10px);transition:opacity .16s,transform .16s}
#pst-action-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:4000;display:flex;align-items:center;gap:12px;background:#25292C;color:#fff;border-radius:10px;padding:10px 12px 10px 14px;box-shadow:0 8px 28px rgba(20,25,28,.22);font-size:11px}
#pst-action-toast button{border:0;background:transparent;color:#F0B785;font-size:10px;font-weight:750;cursor:pointer;padding:2px 3px}
@media(max-width:760px){.pst-action{align-items:flex-start}.pst-action-controls{flex-direction:column;align-items:stretch}.pst-action-control{padding:4px 6px}.pst-action-tag{display:none}}
`;
document.head.appendChild(style);

function parse(value){try{return JSON.parse(value||'{}');}catch(e){return {};}}
function readStates(){
  var states={};
  try{states=parse(localStorage.getItem(STORAGE_KEY));}catch(e){}
  var now=Date.now(),changed=false;
  Object.keys(states).forEach(function(key){
    var at=Number(states[key]&&states[key].at||0);
    if(!at||now-at>MAX_AGE){delete states[key];changed=true;}
  });
  if(changed)writeStates(states);
  return states;
}
function writeStates(states){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(states||{}));}catch(e){}}
function hash(text){
  text=String(text||'');
  var h=2166136261;
  for(var i=0;i<text.length;i++){
    h^=text.charCodeAt(i);
    h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);
  }
  return (h>>>0).toString(36);
}
function actionKey(row){
  var title=row.querySelector('.pst-action-title');
  var meta=row.querySelector('.pst-action-meta');
  var tag=row.querySelector('.pst-action-tag');
  return 'a_'+hash([
    row.getAttribute('onclick')||'',
    title?title.textContent:'',
    meta?meta.textContent:'',
    tag?tag.textContent:''
  ].join('|').toLowerCase().replace(/\s+/g,' ').trim());
}
function showToast(label,key,previous){
  var old=document.getElementById('pst-action-toast');if(old)old.remove();
  lastChange={key:key,previous:previous};
  var toast=document.createElement('div');
  toast.id='pst-action-toast';
  toast.innerHTML='<span>'+label+'</span><button type="button">Zhbëj</button>';
  toast.querySelector('button').addEventListener('click',function(){
    var states=readStates();
    if(lastChange&&lastChange.key===key){
      if(previous)states[key]=previous;else delete states[key];
      writeStates(states);
    }
    toast.remove();
    if(typeof window.pstV2RenderDashboard==='function')window.pstV2RenderDashboard();
  });
  document.body.appendChild(toast);
  setTimeout(function(){if(toast.parentNode)toast.remove();},5000);
}
function store(row,state){
  var key=actionKey(row),states=readStates(),previous=states[key]||null;
  states[key]={state:state,at:Date.now()};
  writeStates(states);
  row.classList.add('pst-action-removing');
  showToast(state==='completed'?'Veprimi u shënua si i kryer.':'Veprimi u hoq nga lista.',key,previous);
  setTimeout(function(){
    if(row.parentNode)row.remove();
    ensureEmpty();
  },170);
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
  if(applying)return;applying=true;
  try{
    var host=document.getElementById('pst-action-list');if(!host)return;
    var states=readStates();
    host.querySelectorAll(':scope > .pst-action').forEach(function(row){
      var key=actionKey(row);
      if(states[key]){row.remove();return;}
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
  apply();
  if(observer)observer.disconnect();
  observer=new MutationObserver(function(){setTimeout(apply,0);});
  observer.observe(host,{childList:true,subtree:false});
  return true;
}
var tries=0,timer=setInterval(function(){if(start()||++tries>160)clearInterval(timer);},250);
window.addEventListener('pst-dashboard-rendered',apply);
})();
