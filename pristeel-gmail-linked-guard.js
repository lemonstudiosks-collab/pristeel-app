/* PRISTEEL — mbron nga projekte dublikatë dhe para-autorizon Drive */
(function(){
'use strict';

var params=new URLSearchParams(window.location.search);
if(params.get('gmail_intake')!=='1')return;

var messageId=params.get('gmail_message_id')||'';
var internal=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com'];
var linkedProjectId='';
var linkedProjectName='';

function setStatus(msg,color){
  var el=document.getElementById('pgi-status');
  if(el){el.textContent=msg||'';el.style.color=color||'var(--text3)';}
}

function normalizeParticipants(){
  var notes=document.getElementById('pgi-notes');
  if(!notes||notes.dataset.pstParticipants==='1')return;
  var value=String(notes.value||'');
  value=value.replace(/^Palët:\s*(.*)$/m,function(all,body){
    var parts=String(body||'').split(';').map(function(x){return x.trim();}).filter(Boolean);
    var external=parts.filter(function(x){
      var low=x.toLowerCase();
      return !internal.some(function(mail){return low.indexOf(mail)>-1;});
    });
    return 'Palët: PRISTEEL'+(external.length?'; '+external.join('; '):'');
  });
  notes.value=value;
  notes.dataset.pstParticipants='1';
}

function uncheckSignatureImages(){
  document.querySelectorAll('.pgi-att').forEach(function(row){
    var nameEl=row.querySelector('.pgi-att-name');
    var box=row.querySelector('.pgi-att-check');
    if(!nameEl||!box||box.dataset.pstReviewed==='1')return;
    var name=String(nameEl.textContent||'').trim();
    if(/^(?:image|img|logo|signature)\d*\.(?:png|jpe?g|gif|webp)$/i.test(name)){
      box.checked=false;
      var meta=row.querySelector('.pgi-att-meta');
      if(meta)meta.textContent+=' · imazh i mundshëm i nënshkrimit';
    }
    box.dataset.pstReviewed='1';
  });
}

async function authorizeDrive(button,workingText){
  if(!window.PSTDriveImport||typeof window.PSTDriveImport.authorize!=='function'){
    throw new Error('Moduli i Google Drive nuk është gati. Rifresko faqen dhe provo përsëri.');
  }
  var oldText=button.textContent;
  button.disabled=true;
  button.textContent=workingText||'Duke autorizuar Drive…';
  setStatus('Po hapet autorizimi i Google Drive…');
  try{
    await window.PSTDriveImport.authorize();
    setStatus('Google Drive u autorizua. Po vazhdon procesi…','var(--green-text)');
  }catch(err){
    button.disabled=false;
    button.textContent=oldText;
    setStatus((err&&err.message)||'Autorizimi i Google Drive dështoi.','var(--red-text)');
    throw err;
  }
}

function wrapNormalButton(button){
  if(!button||button.dataset.pstDriveWrapped==='1')return;
  var original=button.onclick;
  if(typeof original!=='function')return;
  button.dataset.pstDriveWrapped='1';
  button.onclick=async function(ev){
    if(button.disabled)return;
    var oldText=button.textContent;
    try{
      await authorizeDrive(button,'Duke autorizuar Drive…');
      button.disabled=false;
      button.textContent=oldText;
      return original.call(button,ev);
    }catch(err){}
  };
}

async function detectLinkedProject(){
  if(!messageId||typeof window.supaFetch!=='function')return;
  var rows=await window.supaFetch('project_emails?gmail_message_id=eq.'+encodeURIComponent(messageId)+'&project_id=not.is.null&select=project_id&limit=1');
  if(!rows||!rows.length)return;
  linkedProjectId=String(rows[0].project_id||'');
  if(!linkedProjectId)return;
  var projects=await window.supaFetch('projects?id=eq.'+encodeURIComponent(linkedProjectId)+'&select=id,name&limit=1');
  linkedProjectName=(projects&&projects[0]&&projects[0].name)||'';
}

function applyLinkedMode(){
  if(!linkedProjectId)return false;
  var create=document.getElementById('pgi-create');
  var link=document.getElementById('pgi-link-existing');
  var select=document.getElementById('pgi-existing');
  if(!create||!link||!select)return false;
  if(create.dataset.pstLinkedMode==='1')return true;

  select.value=linkedProjectId;
  create.dataset.pstLinkedMode='1';
  create.textContent='Importo skedarët në projektin e lidhur';
  link.style.display='none';
  create.onclick=async function(){
    if(create.disabled)return;
    try{
      await authorizeDrive(create,'Duke autorizuar Drive…');
      select.value=linkedProjectId;
      create.disabled=false;
      create.textContent='Importo skedarët në projektin e lidhur';
      link.style.display='';
      link.click();
      link.style.display='none';
    }catch(err){}
  };
  setStatus('Projekti ekziston. Zgjidh skedarët dhe kliko “Importo skedarët në projektin e lidhur”.');
  return true;
}

async function init(){
  try{
    await detectLinkedProject();
  }catch(err){
    console.warn('Kontrolli i projektit të lidhur dështoi:',err);
  }

  var tries=0;
  var timer=setInterval(function(){
    var create=document.getElementById('pgi-create');
    var link=document.getElementById('pgi-link-existing');
    if(create&&link){
      normalizeParticipants();
      uncheckSignatureImages();
      if(!applyLinkedMode()){
        wrapNormalButton(create);
        wrapNormalButton(link);
      }
      clearInterval(timer);
    }else if(++tries>120){
      clearInterval(timer);
    }
  },250);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();
