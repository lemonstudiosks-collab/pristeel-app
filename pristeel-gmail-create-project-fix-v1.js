/* PRISTEEL Gmail create-project fix v1
 * Adds an explicit create-project path when Gmail intake only suggests an existing project.
 * A thread with a real existing relation stays protected because that mode has no project selector.
 * Uses the existing intake save path after project creation, so email/thread/attachment linking remains centralized.
 */
(function(){
'use strict';
if(window.__pstGmailCreateProjectFixV1)return;
window.__pstGmailCreateProjectFixV1=true;

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function text(selector){var e=document.querySelector(selector);return e?String(e.textContent||'').trim():'';}
function status(msg,bad){var e=document.getElementById('pgi2-status');if(!e)return;e.textContent=msg;e.className='pgi2-status'+(bad?' bad':'');}

function inferSubject(){return text('#pgi2-bg .pgi2-mail b').replace(/^\s*((re|fw|fwd|wg|aw)\s*:\s*)+/i,'').trim().slice(0,180);}
function inferClient(){var raw=text('#pgi2-bg .pgi2-mail span').split('·')[0].trim();return raw;}

function renderForm(host){
  if(document.getElementById('pgi2-extra-create-form'))return;
  var box=document.createElement('div');
  box.id='pgi2-extra-create-form';
  box.className='pgi2-create';
  box.innerHTML='<div class="pgi2-grid">'
    +'<label class="wide"><span>Emri i projektit</span><input id="pgi2-extra-name" value="'+esc(inferSubject())+'"></label>'
    +'<label><span>Klienti</span><input id="pgi2-extra-client" value="'+esc(inferClient())+'"></label>'
    +'<label><span>Referenca</span><input id="pgi2-extra-ref"></label>'
    +'<label><span>Lokacioni</span><input id="pgi2-extra-location"></label>'
    +'<label><span>Afati</span><input id="pgi2-extra-deadline" type="date"></label>'
    +'<label class="wide"><span>Shënime</span><textarea id="pgi2-extra-notes">Projekt i krijuar nga Gmail.</textarea></label>'
    +'</div><div style="display:flex;justify-content:flex-end;gap:7px;margin-top:10px">'
    +'<button type="button" class="pgi2-btn" id="pgi2-extra-cancel">Anulo</button>'
    +'<button type="button" class="pgi2-btn primary" id="pgi2-extra-submit">Krijo dhe bashkëngjit</button>'
    +'</div>';
  host.appendChild(box);
  document.getElementById('pgi2-extra-cancel').onclick=function(){box.remove();};
  document.getElementById('pgi2-extra-submit').onclick=createAndAttach;
}

async function createAndAttach(){
  var name=String((document.getElementById('pgi2-extra-name')||{}).value||'').trim();
  if(!name){status('Shkruaj emrin e projektit.',true);return;}
  var submit=document.getElementById('pgi2-extra-submit');if(submit)submit.disabled=true;
  try{
    if(typeof window.supaFetch!=='function')throw new Error('Databaza nuk është gati.');
    status('Duke krijuar projektin…');
    var payload={
      name:name,
      client:String((document.getElementById('pgi2-extra-client')||{}).value||'').trim(),
      ref:String((document.getElementById('pgi2-extra-ref')||{}).value||'').trim(),
      location:String((document.getElementById('pgi2-extra-location')||{}).value||'').trim(),
      deadline:String((document.getElementById('pgi2-extra-deadline')||{}).value||''),
      notes:String((document.getElementById('pgi2-extra-notes')||{}).value||'').trim(),
      deal_type:'full'
    };
    var rows=await window.supaFetch('projects','POST',payload);
    var project=Array.isArray(rows)&&rows[0];
    if(!project||!project.id)throw new Error('Projekti nuk u krijua.');

    var select=document.getElementById('pgi2-project');
    if(!select)throw new Error('Thread-i u ndryshua gjatë krijimit. Hape përsëri emailin.');
    var option=document.createElement('option');option.value=String(project.id);option.textContent=project.name+(project.client?' — '+project.client:'');select.insertBefore(option,select.firstChild);select.value=String(project.id);select.dispatchEvent(new Event('change',{bubbles:true}));
    status('Projekti u krijua. Duke lidhur thread-in dhe skedarët…');
    var save=document.getElementById('pgi2-save');
    if(!save)throw new Error('Butoni i lidhjes nuk u gjet.');
    document.getElementById('pgi2-extra-create-form')?.remove();
    save.click();
  }catch(e){status(String(e&&e.message||e),true);if(submit)submit.disabled=false;}
}

function decorate(){
  var modal=document.getElementById('pgi2-bg');if(!modal)return false;
  var select=document.getElementById('pgi2-project');if(!select)return false;
  if(document.getElementById('pgi2-toggle-create')||document.getElementById('pgi2-extra-toggle-create'))return true;
  var section=select.closest('.pgi2-section');if(!section)return false;
  var title=section.querySelector('.pgi2-section-title');
  if(!title){title=document.createElement('div');title.className='pgi2-section-title';title.innerHTML='<b>Projekti destinacion</b>';section.insertBefore(title,section.firstChild);}
  var button=document.createElement('button');button.type='button';button.className='pgi2-link';button.id='pgi2-extra-toggle-create';button.textContent='Krijo projekt të ri';
  title.appendChild(button);
  button.onclick=function(){var existing=document.getElementById('pgi2-extra-create-form');if(existing){existing.remove();return;}renderForm(section);};
  return true;
}

function wrapOpen(){
  var api=window.PSTGmailIntakeV2;if(!api||typeof api.open!=='function'||api.open.__pstCreateFix)return false;
  var original=api.open;
  api.open=async function(){var result=await original.apply(this,arguments);[0,80,220,500].forEach(function(ms){setTimeout(decorate,ms);});return result;};
  api.open.__pstCreateFix=true;
  return true;
}

function init(){wrapOpen();decorate();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,0);},{once:true});else setTimeout(init,0);
document.addEventListener('pst:modules-ready',init);
window.PSTGmailCreateProjectFixV1={decorate:decorate};
})();
