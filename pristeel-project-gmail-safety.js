/* PRISTEEL - autorizimi Drive dhe filtrimi i skedareve te pasigurte */
(function(){
'use strict';
if(window.__pstProjectGmailSafetyLoaded)return;
window.__pstProjectGmailSafetyLoaded=true;

var replayImportClick=false;
var css=document.createElement('style');
css.textContent='\
.pgc-att-review{background:#FFF9F0!important;opacity:.66}\
.pgc-att-review .pgc-att-meta{color:#A66A24!important}\
.pgc-safety-note{margin:8px 0 10px;padding:9px 11px;border:1px solid #F0D7B4;border-radius:11px;background:#FFF9F0;color:#76552F;font-size:10.5px;line-height:1.45}\
';
document.head.appendChild(css);

function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function contextText(){var q=document.getElementById('pgc-query'),sub=document.getElementById('pgc-sub');return norm((q&&q.value)+' '+(sub&&sub.textContent));}
function isSspContext(){return /ssp|smart city|smartct|camera pole|steel poles|17s 25|shtyll/.test(contextText());}
function isStrongProjectFile(name){
  var n=norm(name);
  return /17s 25|pst ssp sc 001 2026|camera pole|cctv pole|shtyll|bazament|foundation|pile|erection|montim|installation|fabrication|quotation|quote|offer|oferta|contract|kontrat|boq|material list poles|technical drawing pole|zincometal|biomek|eurosteel|r t group|risk analysis|comparison/.test(n);
}
function isClearlyUnrelated(name){
  var n=norm(name);
  if(isStrongProjectFile(n))return false;
  if(/data\s*base|database|brochure|presentation|product line|training course|campaign|osint|newsint|almaty|gravicon|\bkek\b|mass profiler|course overview/.test(n))return true;
  if(/smart city/.test(n)&&!/ssp|camera|pole|17s 25|contract|quotation|offer|foundation|civil|installation/.test(n))return true;
  return false;
}
function annotate(row,unrelated){
  var box=row.querySelector('.pgc-attachment'),meta=row.querySelector('.pgc-att-meta');
  if(!box)return;
  if(unrelated){
    box.checked=false;box.dataset.pstBlocked='1';row.classList.add('pgc-att-review');row.dataset.pstReview='1';
    if(meta){meta.textContent=meta.textContent.replace(/\s*·\s*i pasigurt, nuk u zgjodh automatikisht/g,'')+' · i pasigurt, nuk u zgjodh automatikisht';}
  }else{
    delete box.dataset.pstBlocked;row.classList.remove('pgc-att-review');delete row.dataset.pstReview;
  }
}
function markUncertainFiles(){
  var ssp=isSspContext(),changed=0;
  document.querySelectorAll('.pgc-att-row').forEach(function(row){
    var nameEl=row.querySelector('.pgc-att-name');if(!nameEl)return;
    var unrelated=isClearlyUnrelated(nameEl.textContent||'');
    if(unrelated&&(ssp||/brochure|training|presentation|campaign|database|data base/.test(norm(nameEl.textContent)))){annotate(row,true);changed++;}
    else annotate(row,false);
  });
  var results=document.getElementById('pgc-results');if(!results)return changed;
  var old=document.getElementById('pgc-safety-note');
  if(changed>0){
    if(!old){
      var target=null;document.querySelectorAll('#pgc-results .pgc-sec').forEach(function(s){if(norm(s.textContent).indexOf('skedaret')>-1)target=s;});
      if(target){old=document.createElement('div');old.id='pgc-safety-note';old.className='pgc-safety-note';target.insertAdjacentElement('afterend',old);}
    }
    if(old)old.textContent=changed+' skedarë të përgjithshëm ose të pasigurt u hoqën nga përzgjedhja automatike.';
  }else if(old)old.remove();
  return changed;
}
function setStatus(message,type){var status=document.getElementById('pgc-status');if(status){status.textContent=message;status.className='pgc-status'+(type?' '+type:'');}}

document.addEventListener('change',function(ev){
  var box=ev.target;if(!box||!box.classList||!box.classList.contains('pgc-attachment'))return;
  if(box.dataset.pstBlocked==='1'&&box.checked){box.checked=false;setStatus('Ky skedar është shënuar si i pasigurt. Verifikoje para se ta zgjedhësh manualisht.','err');}
},true);

document.addEventListener('click',function(ev){
  var btn=ev.target&&ev.target.closest&&ev.target.closest('#pgc-import');
  if(!btn||replayImportClick||btn.dataset.pstDriveAuthorized==='1')return;
  markUncertainFiles();
  if(!window.PSTDriveImport||typeof window.PSTDriveImport.authorize!=='function')return;
  ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
  btn.disabled=true;setStatus('Po hapet autorizimi i Google për Gmail dhe Drive…','');
  var auth;
  try{auth=window.PSTDriveImport.authorize();}
  catch(e){btn.disabled=false;setStatus('Gabim: '+String(e&&e.message||e),'err');return;}
  Promise.resolve(auth).then(function(){
    markUncertainFiles();btn.dataset.pstDriveAuthorized='1';btn.disabled=false;
    setStatus('Google Drive u autorizua. Po vazhdon importimi…','ok');
    replayImportClick=true;btn.click();setTimeout(function(){replayImportClick=false;},0);
  }).catch(function(e){btn.disabled=false;setStatus('Gabim: '+String(e&&e.message||e),'err');});
},true);

var observer=new MutationObserver(function(){if(document.getElementById('pgc-results'))setTimeout(markUncertainFiles,20);});
observer.observe(document.documentElement,{childList:true,subtree:true});
setInterval(markUncertainFiles,500);
})();
