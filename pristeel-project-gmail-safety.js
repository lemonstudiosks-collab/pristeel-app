/* PRISTEEL - sigurimi i autorizimit Drive dhe filtrimi i skedareve te pasigurte */
(function(){
'use strict';
if(window.__pstProjectGmailSafetyLoaded)return;
window.__pstProjectGmailSafetyLoaded=true;

var replayImportClick=false;

var css=document.createElement('style');
css.textContent='\
.pgc-att-review{background:#FFF9F0!important;opacity:.68}\
.pgc-att-review .pgc-att-meta{color:#A66A24!important}\
.pgc-safety-note{margin:8px 0 10px;padding:9px 11px;border:1px solid #F0D7B4;border-radius:11px;background:#FFF9F0;color:#76552F;font-size:10.5px;line-height:1.45}\
';
document.head.appendChild(css);

function norm(v){
  return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

function isSspContext(){
  var q=document.getElementById('pgc-query');
  var sub=document.getElementById('pgc-sub');
  var text=norm((q&&q.value)+' '+(sub&&sub.textContent));
  return /ssp|smart city|smartct|camera pole|steel poles|17s 25|shtyll/.test(text);
}

function isStrongProjectFile(name){
  var n=norm(name);
  return /17s 25|pst ssp sc 001 2026|camera pole|cctv pole|shtyll|bazament|foundation|piles|erection|montim|quotation|quote|offer|oferta|contract|kontrat|boq|material list poles|technical drawing pole|zincometal|biomek|eurosteel|r t group/.test(n);
}

function isClearlyUnrelated(name){
  var n=norm(name);
  if(isStrongProjectFile(n))return false;
  return /brochure|presentation|product line|training course|campaign|osint|newsint|almaty|gravicon|kek|mass profiler|data base|database/.test(n)
    || (/smart city/.test(n)&&!/ssp|camera|pole|17s 25|contract|quotation|offer/.test(n));
}

function markUncertainFiles(){
  if(!isSspContext())return;
  var changed=0;
  document.querySelectorAll('.pgc-att-row').forEach(function(row){
    var nameEl=row.querySelector('.pgc-att-name');
    var box=row.querySelector('.pgc-attachment');
    if(!nameEl||!box)return;
    var unrelated=isClearlyUnrelated(nameEl.textContent||'');
    if(unrelated){
      box.checked=false;
      row.classList.add('pgc-att-review');
      row.setAttribute('data-pst-review','1');
      var meta=row.querySelector('.pgc-att-meta');
      if(meta&&meta.textContent.indexOf('nuk u zgjodh automatikisht')<0){
        meta.textContent+=' · i pasigurt, nuk u zgjodh automatikisht';
      }
      changed++;
    }else{
      row.classList.remove('pgc-att-review');
      row.removeAttribute('data-pst-review');
    }
  });

  var results=document.getElementById('pgc-results');
  if(!results)return;
  var old=document.getElementById('pgc-safety-note');
  if(changed>0){
    if(!old){
      var sections=results.querySelectorAll('.pgc-sec');
      var target=null;
      sections.forEach(function(s){if(norm(s.textContent).indexOf('skedaret')>-1)target=s;});
      if(target){
        old=document.createElement('div');
        old.id='pgc-safety-note';
        old.className='pgc-safety-note';
        target.insertAdjacentElement('afterend',old);
      }
    }
    if(old)old.textContent=changed+' skedarë të përgjithshëm ose të pasigurt u hoqën nga përzgjedhja automatike. Mund t’i zgjedhësh manualisht vetëm pasi t’i verifikosh.';
  }else if(old){
    old.remove();
  }
}

function setStatus(message,type){
  var status=document.getElementById('pgc-status');
  if(!status)return;
  status.textContent=message;
  status.className='pgc-status'+(type?' '+type:'');
}

document.addEventListener('click',function(ev){
  var btn=ev.target&&ev.target.closest&&ev.target.closest('#pgc-import');
  if(!btn||replayImportClick||btn.dataset.pstDriveAuthorized==='1')return;
  if(!window.PSTDriveImport||typeof window.PSTDriveImport.authorize!=='function')return;

  ev.preventDefault();
  ev.stopPropagation();
  ev.stopImmediatePropagation();
  btn.disabled=true;
  setStatus('Po hapet autorizimi i Google Drive…','');

  var auth;
  try{
    auth=window.PSTDriveImport.authorize();
  }catch(e){
    btn.disabled=false;
    setStatus('Gabim: '+String(e&&e.message||e),'err');
    return;
  }

  Promise.resolve(auth).then(function(){
    btn.dataset.pstDriveAuthorized='1';
    btn.disabled=false;
    setStatus('Google Drive u autorizua. Po vazhdon lidhja dhe importimi…','ok');
    replayImportClick=true;
    btn.click();
    setTimeout(function(){replayImportClick=false;},0);
  }).catch(function(e){
    btn.disabled=false;
    setStatus('Gabim: '+String(e&&e.message||e),'err');
  });
},true);

var observer=new MutationObserver(function(){
  if(document.getElementById('pgc-results'))setTimeout(markUncertainFiles,40);
});
observer.observe(document.documentElement,{childList:true,subtree:true});
setInterval(markUncertainFiles,900);
})();
