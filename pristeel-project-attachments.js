/* PRISTEEL — importimi i attachment-eve të emailave të lidhur me projektin */
(function(){
'use strict';

var A=null,current={pid:'',token:'',attachments:[]};
var css=document.createElement('style');
css.textContent=`
.pfa-bg{position:fixed;inset:0;background:rgba(26,26,25,.42);z-index:1450;display:flex;align-items:center;justify-content:center;padding:22px}
.pfa-modal{width:min(720px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 16px 48px rgba(26,26,25,.2)}
.pfa-hd{display:flex;justify-content:space-between;gap:12px;padding:17px 19px;border-bottom:1px solid var(--border)}.pfa-title{font-size:15px;font-weight:700}.pfa-sub{font-size:10.5px;color:var(--text3);margin-top:3px}.pfa-x{border:0;background:none;font-size:21px;color:var(--text3);cursor:pointer}
.pfa-body{padding:16px 19px}.pfa-att{display:flex;align-items:flex-start;gap:9px;padding:8px 9px;border:1px solid var(--border);border-radius:8px;margin:5px 0}.pfa-att input{margin-top:3px}.pfa-main{flex:1;min-width:0}.pfa-name{font-size:11.5px;font-weight:620;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pfa-meta{font-size:10px;color:var(--text3);margin-top:2px}.pfa-empty{font-size:11px;color:var(--text3);font-style:italic;padding:10px 0}.pfa-state{font-size:11px;color:var(--text3);min-height:17px;margin-top:11px}.pfa-prog{height:4px;background:var(--bg3);display:none;margin-top:6px;overflow:hidden}.pfa-prog.on{display:block}.pfa-prog i{display:block;height:100%;width:0;background:var(--bronze)}.pfa-ft{display:flex;justify-content:flex-end;gap:7px;padding:13px 19px;border-top:1px solid var(--border)}
`;
document.head.appendChild(css);

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function header(payload,name){var hs=(payload&&payload.headers)||[];name=String(name||'').toLowerCase();for(var i=0;i<hs.length;i++)if(String(hs[i].name||'').toLowerCase()===name)return hs[i].value||'';return'';}
function email(s){var m=String(s||'').match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);return m?m[0].toLowerCase():'';}
function fmtBytes(n){n=parseInt(n||0,10);if(!n)return'';if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(n<10240?1:0)+' KB';return(n/1048576).toFixed(1)+' MB';}
function setState(s,c){var e=document.getElementById('pfa-state');if(e){e.textContent=s||'';e.style.color=c||'var(--text3)';}}
function progress(on,p){var a=document.getElementById('pfa-prog'),b=document.getElementById('pfa-fill');if(a)a.classList.toggle('on',!!on);if(b)b.style.width=(p||0)+'%';}
function close(){var e=document.getElementById('pfa-bg');if(e)e.remove();}
function collect(part,message,out){
  if(!part)return;
  var disposition=header({headers:part.headers||[]},'Content-Disposition').toLowerCase();
  if(part.filename&&part.body&&(part.body.attachmentId||part.body.data))out.push({
    key:message.id+':'+(part.body.attachmentId||part.filename+':'+out.length),messageId:message.id,
    attachmentId:part.body.attachmentId||'',inlineData:part.body.data||'',filename:part.filename,
    mimeType:part.mimeType||'application/octet-stream',size:part.body.size||0,
    sender:header(message.payload,'From'),date:header(message.payload,'Date'),inline:disposition.indexOf('inline')>-1
  });
  (part.parts||[]).forEach(function(x){collect(x,message,out);});
}
function bytes(data){var s=String(data||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var bin=atob(s),a=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;}
async function toFile(x){var data=x.inlineData;if(!data){var r=await A.gmail('/messages/'+encodeURIComponent(x.messageId)+'/attachments/'+encodeURIComponent(x.attachmentId),current.token);data=r.data||'';}return new File([bytes(data)],x.filename,{type:x.mimeType});}

function render(){
  var rows=current.attachments.length?current.attachments.map(function(x){return '<label class="pfa-att"><input class="pfa-check" type="checkbox" data-key="'+esc(x.key)+'"'+(x.inline?'':' checked')+'><span class="pfa-main"><span class="pfa-name">'+esc(x.filename)+'</span><span class="pfa-meta">'+esc(email(x.sender)||x.sender)+(x.size?' · '+fmtBytes(x.size):'')+(x.inline?' · inline':'')+'</span></span></label>';}).join(''):'<div class="pfa-empty">Nuk u gjetën attachment-e në emailat e lidhur me këtë projekt.</div>';
  document.body.insertAdjacentHTML('beforeend','<div class="pfa-bg" id="pfa-bg"><div class="pfa-modal"><div class="pfa-hd"><div><div class="pfa-title">Importo skedarët e emailave</div><div class="pfa-sub">Vetëm attachment-et e emailave hyrës të lidhur me këtë projekt.</div></div><button class="pfa-x" id="pfa-close">×</button></div><div class="pfa-body">'+rows+'<div class="pfa-state" id="pfa-state">Zgjidh skedarët që dëshiron të ruash.</div><div class="pfa-prog" id="pfa-prog"><i id="pfa-fill"></i></div></div><div class="pfa-ft"><button class="btn btn-sm" id="pfa-cancel">Anulo</button><button class="btn btn-sm btn-primary" id="pfa-import"'+(current.attachments.length?'':' disabled')+'>Importo të zgjedhurat</button></div></div></div>');
  document.getElementById('pfa-close').onclick=close;document.getElementById('pfa-cancel').onclick=close;document.getElementById('pfa-import').onclick=runImport;
}

async function runImport(){
  var button=document.getElementById('pfa-import');if(button.disabled)return;button.disabled=true;button.textContent='Duke importuar…';
  try{
    var keys=Array.prototype.slice.call(document.querySelectorAll('.pfa-check:checked')).map(function(e){return e.getAttribute('data-key');});
    var chosen=current.attachments.filter(function(x){return keys.indexOf(x.key)>-1;});
    if(!chosen.length)throw new Error('Zgjidh së paku një skedar.');
    var files=[];progress(true,5);
    for(var i=0;i<chosen.length;i++){setState('Po shkarkohet '+(i+1)+'/'+chosen.length+': '+chosen[i].filename);files.push(await toFile(chosen[i]));progress(true,5+Math.round((i+1)/chosen.length*35));}
    var result=await window.PSTDriveImport.importFiles(current.pid,files,function(x){
      if(x.phase==='upload'){var pct=40+Math.round(((x.index-1)+(x.percent||0)/100)/Math.max(x.total,1)*60);progress(true,pct);setState('Po ruhet '+x.index+'/'+x.total+': '+x.name+' ('+(x.percent||0)+'%)');}
      else if(x.phase==='skip')setState(x.message);
      else if(x.message)setState(x.message);
    });
    progress(true,100);setState(result.uploaded+' skedarë u importuan'+(result.skipped?' · '+result.skipped+' ekzistonin tashmë.':'.'),'var(--green-text)');
    button.textContent='Përfundoi';
    if(typeof window.pstDriveRefresh==='function')window.pstDriveRefresh(current.pid);
  }catch(e){setState(e.message,'var(--red-text)');button.disabled=false;button.textContent='Importo të zgjedhurat';progress(false,0);}
}

window.pstImportProjectEmailFiles=async function(pid){
  if(document.getElementById('pfa-bg'))return;
  current={pid:String(pid),token:'',attachments:[]};A=window.PSTEmail;
  try{
    if(!A||!window.PSTDriveImport)throw new Error('Modulet Gmail/Drive nuk janë gati.');
    current.token=await A.auth();
    var rows=await supaFetch('project_emails?project_id=eq.'+encodeURIComponent(pid)+'&direction=eq.incoming&has_attachments=eq.true&select=gmail_message_id&order=sent_at.desc&limit=500');
    var ids=(rows||[]).map(function(x){return x.gmail_message_id;}).filter(function(x,i,a){return x&&a.indexOf(x)===i;});
    var messages=await A.map(ids,5,function(id){return A.gmail('/messages/'+encodeURIComponent(id)+'?format=full',current.token);});
    messages.forEach(function(m){collect(m.payload,m,current.attachments);});
    var seen={};current.attachments=current.attachments.filter(function(x){if(seen[x.key])return false;seen[x.key]=1;return true;});
    render();
  }catch(e){alert('Importimi i skedarëve: '+e.message);}
};

function wrap(){
  if(typeof window.pstProjectEmailsSection!=='function'||window.pstProjectEmailsSection.__pfa)return false;
  var original=window.pstProjectEmailsSection;
  window.pstProjectEmailsSection=function(p){
    var html=original.apply(this,arguments),id=String(p.id);
    return html.replace('<button class="btn btn-sm" onclick="pstEmailLoad', '<button class="btn btn-sm" onclick="pstImportProjectEmailFiles(\''+id+'\')">Importo skedarët</button><button class="btn btn-sm" onclick="pstEmailLoad');
  };
  window.pstProjectEmailsSection.__pfa=true;return true;
}
var tries=0,t=setInterval(function(){if(wrap()||++tries>60)clearInterval(t);},300);

})();
