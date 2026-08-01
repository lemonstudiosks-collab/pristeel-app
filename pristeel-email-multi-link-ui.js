/* PRISTEEL Gmail: lidh nje email me nje projekt shtese */
(function(){
'use strict';

if(window.__pstEmailMultiLinkUiLoaded)return;
window.__pstEmailMultiLinkUiLoaded=true;

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function q(v){return encodeURIComponent(String(v==null?'':v));}
function arr(v){return Array.isArray(v)?v:[];}

window.pstEmailLinkOther=async function(id,currentPid){
  if(typeof window.pstEmailRelationsReady!=='function'||!await window.pstEmailRelationsReady(true)){
    alert('Ekzekuto fillimisht SQL-në e lidhjeve Gmail në Supabase.');
    return;
  }
  try{
    var messages=await supaFetch('project_emails?id=eq.'+id+'&select=*&limit=1');
    var message=messages&&messages[0];
    if(!message)throw new Error('Emaili nuk u gjet.');
    var projects=await supaFetch('projects?select=id,name,client,status&order=created_at.desc&limit=500');
    var links=await supaFetch('project_email_links?gmail_message_id=eq.'+q(message.gmail_message_id)+'&select=project_id&limit=100');
    var linked=arr(links).map(function(x){return String(x.project_id);});
    var available=arr(projects).filter(function(p){return linked.indexOf(String(p.id))<0;});
    if(!available.length){alert('Ky email është tashmë i lidhur me të gjitha projektet e disponueshme.');return;}

    var bg=document.createElement('div');
    bg.className='pst-modal-bg';
    bg.id='pst-email-other-project-modal';
    bg.innerHTML='<div class="pst-modal" style="max-width:520px"><div class="pst-modal-hd"><div><div style="font-size:14px;font-weight:700">Lidhe emailin edhe me një projekt</div><div style="font-size:10.5px;color:var(--text3);margin-top:3px">Lidhja aktuale nuk hiqet.</div></div><span class="pst-modal-x" data-close="1">×</span></div><div class="pst-modal-bd"><div style="font-size:11px;color:var(--text2);margin-bottom:10px">'+esc(message.subject||'(pa subjekt)')+'</div><select id="pst-email-other-project-select" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;background:#fff">'
      +available.map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.name||'Pa emër')+(p.client?' · '+esc(p.client):'')+'</option>';}).join('')
      +'</select><div style="display:flex;justify-content:flex-end;gap:7px;margin-top:14px"><button class="btn btn-sm" data-close="1">Anulo</button><button class="btn btn-primary btn-sm" id="pst-email-other-project-confirm">Lidhe</button></div></div></div>';
    document.body.appendChild(bg);
    bg.querySelectorAll('[data-close="1"]').forEach(function(x){x.addEventListener('click',function(){bg.remove();});});
    document.getElementById('pst-email-other-project-confirm').addEventListener('click',async function(){
      var select=document.getElementById('pst-email-other-project-select');
      var targetPid=select&&select.value;
      if(!targetPid)return;
      var btn=this;btn.disabled=true;btn.textContent='Duke lidhur…';
      try{
        await window.pstAddEmailProjectLink(message,targetPid,'manual-multi-project',100);
        await supaFetch('project_emails?id=eq.'+id,'PATCH',{match_method:'manual-multi-project',needs_review:false,review_reason:null,updated_at:new Date().toISOString()});
        bg.remove();
        if(typeof window.pstSyncProjectContacts==='function'){
          window.pstSyncProjectContacts(currentPid);
          window.pstSyncProjectContacts(targetPid);
        }
        if(typeof window.pstEmailLoad==='function')await window.pstEmailLoad(currentPid);
      }catch(err){btn.disabled=false;btn.textContent='Lidhe';alert('Gabim: '+err.message);}
    });
  }catch(e){alert('Gabim: '+e.message);}
};

function decorate(pid){
  var host=document.getElementById('pem-list-'+pid);if(!host)return;
  host.querySelectorAll('.pem-thread').forEach(function(thread){
    if(thread.querySelector('.pst-email-link-other'))return;
    var unlink=Array.prototype.find.call(thread.querySelectorAll('.pem-link'),function(btn){return /pstEmailUnlink\(/.test(btn.getAttribute('onclick')||'');});
    if(!unlink)return;
    var match=(unlink.getAttribute('onclick')||'').match(/pstEmailUnlink\((\d+),/);
    if(!match)return;
    var btn=document.createElement('button');
    btn.className='pem-link pst-email-link-other';
    btn.textContent='Lidhe edhe…';
    btn.addEventListener('click',function(ev){ev.stopPropagation();window.pstEmailLinkOther(match[1],pid);});
    unlink.parentNode.insertBefore(btn,unlink);
  });
}

function wrapLoad(){
  if(typeof window.pstEmailLoad!=='function')return false;
  if(window.pstEmailLoad.__pstMultiLink)return true;
  var original=window.pstEmailLoad;
  window.pstEmailLoad=async function(pid){
    var result=await original.apply(this,arguments);
    setTimeout(function(){decorate(String(pid));},30);
    return result;
  };
  window.pstEmailLoad.__pstMultiLink=true;
  return true;
}

var tries=0,timer=setInterval(function(){if(wrapLoad()||++tries>120)clearInterval(timer);},250);

})();
