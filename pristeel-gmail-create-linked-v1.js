/* PRISTEEL Gmail create-from-linked v1
 * Explicitly allows a user to create a NEW project from a Gmail thread that
 * is currently linked elsewhere. The old relation is changed only after a
 * confirmation and only after the new project has been created successfully.
 */
(function(){
'use strict';
if(window.__pstGmailCreateLinkedV1)return;
window.__pstGmailCreateLinkedV1=true;
var captured={mid:'',tid:'',subject:'',from:''},busy=false;
function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function b64Bytes(data){var s=String(data||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var b=atob(s),out=new Uint8Array(b.length);for(var i=0;i<b.length;i++)out[i]=b.charCodeAt(i);return out;}
function target(){
  var u=null;
  try{u=new URL(window.__pstPendingGmailIntakeTarget||location.href,location.href);}catch(e){}
  return{
    mid:captured.mid||(u&&u.searchParams.get('gmail_message_id'))||'',
    tid:captured.tid||(u&&u.searchParams.get('gmail_thread_id'))||'',
    subject:captured.subject||(u&&u.searchParams.get('subject'))||'',
    from:captured.from||(u&&u.searchParams.get('from'))||''
  };
}
function db(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path,method,body);}
function status(msg,bad){var e=document.getElementById('pgi2-status');if(e){e.textContent=msg;e.className='pgi2-status'+(bad?' bad':'');}}
function linkedName(){var b=document.querySelector('#pgi2-bg .pgi2-banner.ok strong');return b?String(b.textContent||'').trim():'projektin ekzistues';}
function selectedKeys(){var m={};document.querySelectorAll('#pgi2-bg .pgi2-file:checked').forEach(function(x){m[x.value]=1;});return m;}
function header(payload,name){var hs=arr(payload&&payload.headers),k=String(name||'').toLowerCase();for(var i=0;i<hs.length;i++)if(String(hs[i].name||'').toLowerCase()===k)return hs[i].value||'';return'';}
function collect(part,message,out){if(!part)return;var filename=String(part.filename||'').trim();if(filename&&part.body&&(part.body.attachmentId||part.body.data))out.push({key:message.id+':'+(part.body.attachmentId||filename+':'+out.length),messageId:message.id,attachmentId:part.body.attachmentId||'',inlineData:part.body.data||'',filename:filename,mimeType:part.mimeType||'application/octet-stream'});arr(part.parts).forEach(function(ch){collect(ch,message,out);});}
async function attachmentFile(a,token){var data=a.inlineData;if(!data){var r=await window.PSTEmail.gmail('/messages/'+enc(a.messageId)+'/attachments/'+enc(a.attachmentId),token);data=r&&r.data||'';}return new File([b64Bytes(data)],a.filename,{type:a.mimeType||'application/octet-stream'});}
async function reassignMessage(message,newProjectId,token){
  var meta=await window.PSTEmail.message(message.id,token);
  var rows=arr(await db('project_emails?gmail_message_id=eq.'+enc(meta.gmail_message_id)+'&select=id,project_id&limit=10'));
  if(rows.length){
    for(var i=0;i<rows.length;i++)await db('project_emails?id=eq.'+enc(rows[i].id),'PATCH',{project_id:newProjectId,suggested_project_id:newProjectId,match_method:'gmail-create-new-reassigned',match_confidence:100,needs_review:false,updated_at:new Date().toISOString()});
  }else{
    await db('project_emails','POST',[Object.assign({},meta,{project_id:newProjectId,suggested_project_id:newProjectId,match_method:'gmail-create-new',match_confidence:100,needs_review:false,updated_at:new Date().toISOString()})]);
  }
  try{await db('project_email_links?gmail_message_id=eq.'+enc(meta.gmail_message_id),'DELETE');}catch(e){}
  await db('project_email_links','POST',{project_id:newProjectId,gmail_message_id:meta.gmail_message_id,gmail_thread_id:meta.gmail_thread_id,link_method:'gmail-create-new-reassigned',confidence:100,created_at:new Date().toISOString()});
}
function formHtml(){var t=target(),subject=t.subject||((document.querySelector('#pgi2-bg .pgi2-mail b')||{}).textContent||'');var from=t.from||((document.querySelector('#pgi2-bg .pgi2-mail span')||{}).textContent||'').split(' · ')[0];return '<div id="pst-gcl-form" class="pgi2-create" style="margin-top:9px"><div class="pgi2-grid"><label class="wide"><span>Emri i projektit</span><input id="pst-gcl-name" value="'+esc(subject.replace(/^\s*((re|fw|fwd|wg|aw)\s*:\s*)+/i,''))+'"></label><label><span>Klienti</span><input id="pst-gcl-client" value="'+esc(from)+'"></label><label><span>Referenca</span><input id="pst-gcl-ref"></label><label><span>Lokacioni</span><input id="pst-gcl-location"></label><label><span>Afati</span><input id="pst-gcl-deadline" type="date"></label><label class="wide"><span>Shënime</span><textarea id="pst-gcl-notes">Projekt i krijuar nga Gmail thread.</textarea></label></div><div style="display:flex;justify-content:flex-end;gap:7px;margin-top:10px"><button type="button" class="pgi2-btn" id="pst-gcl-cancel">Anulo</button><button type="button" class="pgi2-btn primary" id="pst-gcl-create">Krijo projekt të ri dhe zhvendos thread-in</button></div></div>';}
async function create(){
  if(busy)return;
  var t=target(),name=((document.getElementById('pst-gcl-name')||{}).value||'').trim();
  if(!name){status('Shkruaj emrin e projektit.',true);return;}
  if(!t.mid){status('Nuk u gjet ID e emailit. Mbylle dhe hape përsëri nga Gmail / Inbox.',true);return;}
  if(!window.confirm('Ky thread është aktualisht i lidhur me “'+linkedName()+'”.\n\nDo të krijohet projekt i ri dhe ky thread do të zhvendoset te projekti i ri. Vazhdo?'))return;
  busy=true;var btn=document.getElementById('pst-gcl-create');if(btn)btn.disabled=true;
  try{
    status('Duke krijuar projektin e ri…');
    var payload={name:name,client:((document.getElementById('pst-gcl-client')||{}).value||'').trim(),ref:((document.getElementById('pst-gcl-ref')||{}).value||'').trim(),location:((document.getElementById('pst-gcl-location')||{}).value||'').trim(),deadline:(document.getElementById('pst-gcl-deadline')||{}).value||'',notes:((document.getElementById('pst-gcl-notes')||{}).value||'').trim(),deal_type:'full'};
    var created=arr(await db('projects','POST',payload));if(!created[0])throw new Error('Projekti nuk u krijua.');var p=created[0];
    var token=await window.PSTEmail.auth();var meta=await window.PSTEmail.message(t.mid,token);var tid=t.tid||meta.gmail_thread_id;var thread=await window.PSTEmail.gmail('/threads/'+enc(tid)+'?format=full',token);var messages=arr(thread&&thread.messages);
    for(var i=0;i<messages.length;i++){status('Duke zhvendosur emailin '+(i+1)+'/'+messages.length+' te projekti i ri…');await reassignMessage(messages[i],p.id,token);}
    var wanted=selectedKeys(),atts=[];messages.forEach(function(m){collect(m.payload,m,atts);});var chosen=atts.filter(function(a){return wanted[a.key];});
    if(chosen.length&&window.PSTDriveImport&&window.PSTDriveImport.importFiles){var files=[];for(var j=0;j<chosen.length;j++){status('Duke importuar skedarin '+(j+1)+'/'+chosen.length+'…');files.push(await attachmentFile(chosen[j],token));}await window.PSTDriveImport.importFiles(p.id,files,function(x){if(x&&x.message)status(x.message);});}
    if(typeof window.pstSyncProjectContacts==='function')try{await window.pstSyncProjectContacts(p.id);}catch(e){}
    status('Projekti i ri u krijua dhe thread-i u zhvendos me sukses.');
    var host=document.getElementById('pgi2-result');if(host)host.innerHTML='<div class="pgi2-result"><b>U krijua: '+esc(p.name||name)+'</b><span>'+messages.length+' emaila u lidhën me projektin e ri'+(chosen.length?' · '+chosen.length+' skedarë u importuan':'')+'.</span><div class="pgi2-result-actions"><button class="pgi2-btn primary" id="pst-gcl-open">Hap projektin</button></div></div>';
    var form=document.getElementById('pst-gcl-form');if(form)form.remove();var open=document.getElementById('pst-gcl-open');if(open)open.onclick=function(){if(window.PSTGmailIntakeV3&&window.PSTGmailIntakeV3.close)window.PSTGmailIntakeV3.close();if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(p.id);};
  }catch(e){status(String(e&&e.message||e),true);}finally{busy=false;if(btn)btn.disabled=false;}
}
function decorate(){
  var modal=document.getElementById('pgi2-bg');if(!modal)return;
  if(document.getElementById('pgi2-toggle-create')||document.getElementById('pst-gcl-toggle'))return;
  var titles=modal.querySelectorAll('.pgi2-section-title'),destTitle=titles&&titles[0];if(!destTitle)return;
  var b=document.createElement('button');b.type='button';b.className='pgi2-link';b.id='pst-gcl-toggle';b.textContent='Krijo projekt të ri';destTitle.appendChild(b);
  b.onclick=function(){var existing=document.getElementById('pst-gcl-form');if(existing){existing.remove();b.textContent='Krijo projekt të ri';return;}var sec=destTitle.parentElement;sec.insertAdjacentHTML('beforeend',formHtml());b.textContent='Mbylle krijimin';document.getElementById('pst-gcl-cancel').onclick=function(){var f=document.getElementById('pst-gcl-form');if(f)f.remove();b.textContent='Krijo projekt të ri';};document.getElementById('pst-gcl-create').onclick=create;};
}
function schedule(){[0,80,220,500].forEach(function(ms){setTimeout(decorate,ms);});}
document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('.pst-gli-intake');if(b){captured.mid=b.getAttribute('data-mid')||'';captured.tid=b.getAttribute('data-tid')||'';var row=b.closest('.pst-ws-action');captured.subject=((row&&row.querySelector('.pst-ws-action-title'))||{}).textContent||'';captured.from=((row&&row.querySelector('.pst-ws-action-meta'))||{}).textContent||'';schedule();}},true);
document.addEventListener('pst:gmail-intake-request',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.PSTGmailCreateLinkedV1={decorate:decorate};
})();