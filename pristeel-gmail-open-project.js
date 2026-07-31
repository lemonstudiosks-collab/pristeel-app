/* PRISTEEL — hap pasqyrën e projektit nga Gmail intake */
(function(){
'use strict';

var params=new URLSearchParams(window.location.search);
if(params.get('gmail_intake')!=='1')return;

var messageId=params.get('gmail_message_id')||'';

function setStatus(msg,color){
  var el=document.getElementById('pgi-status');
  if(el){
    el.textContent=msg||'';
    el.style.color=color||'var(--text3)';
  }
}

async function resolveProjectId(){
  var select=document.getElementById('pgi-existing');
  var selected=select&&select.value?String(select.value):'';
  if(selected)return selected;
  if(!messageId||typeof window.supaFetch!=='function')return '';
  var rows=await window.supaFetch(
    'project_emails?gmail_message_id=eq.'+encodeURIComponent(messageId)
    +'&project_id=not.is.null&select=project_id&limit=1'
  );
  return rows&&rows[0]&&rows[0].project_id?String(rows[0].project_id):'';
}

function closeIntake(){
  var modal=document.getElementById('pgi-bg');
  if(modal)modal.remove();
  try{
    var url=new URL(window.location.href);
    ['gmail_intake','gmail_message_id','gmail_thread_id','subject','from'].forEach(function(key){
      url.searchParams.delete(key);
    });
    history.replaceState({},'',url.toString());
  }catch(e){}
}

function patchButton(){
  var footer=document.querySelector('.pgi-ft');
  if(!footer)return false;
  var buttons=footer.querySelectorAll('button');
  var openButton=null;
  for(var i=0;i<buttons.length;i++){
    if(String(buttons[i].textContent||'').trim()==='Hap projektin'){
      openButton=buttons[i];
      break;
    }
  }
  if(!openButton)return false;
  if(openButton.dataset.pstOpenFixed==='1')return true;

  openButton.dataset.pstOpenFixed='1';
  openButton.onclick=async function(){
    if(openButton.disabled)return;
    var oldText=openButton.textContent;
    openButton.disabled=true;
    openButton.textContent='Duke hapur…';
    try{
      var projectId=await resolveProjectId();
      if(!projectId)throw new Error('Nuk u gjet projekti i lidhur me këtë email.');
      if(typeof window.openOverview!=='function')throw new Error('Pasqyra e projektit nuk është gati. Rifresko faqen dhe provo përsëri.');
      closeIntake();
      window.openOverview(projectId);
    }catch(err){
      openButton.disabled=false;
      openButton.textContent=oldText;
      setStatus((err&&err.message)||'Projekti nuk u hap.','var(--red-text)');
    }
  };
  return true;
}

var tries=0;
var timer=setInterval(function(){
  if(patchButton()||++tries>240)clearInterval(timer);
},250);

var observer=new MutationObserver(function(){
  if(patchButton())observer.disconnect();
});
observer.observe(document.documentElement,{childList:true,subtree:true});

})();
