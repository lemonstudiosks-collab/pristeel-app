/* PRISTEEL relation-aware Gmail attachment importer
 * Reads both project_emails.project_id and project_email_links. No email relation is rewritten.
 */
(function(){
'use strict';
if(window.__pstAttachmentRelationsV2)return;
window.__pstAttachmentRelationsV2=true;

var A=null,current={pid:'',token:'',attachments:[]};
function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function header(payload,name){var hs=(payload&&payload.headers)||[];name=String(name||'').toLowerCase();for(var i=0;i<hs.length;i++)if(String(hs[i].name||'').toLowerCase()===name)return hs[i].value||'';return'';}
function email(s){var m=String(s||'').match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);return m?m[0].toLowerCase():'';}
function fmtBytes(n){n=parseInt(n||0,10);if(!n)return'';if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(n<10240?1:0)+' KB';return(n/1048576).toFixed(1)+' MB';}
function close(){var e=document.getElementById('pfa2-bg');if(e)e.remove();}
function stateText(s,c){var e=document.getElementById('pfa2-state');if(e){e.textContent=s||'';e.style.color=c||'#7D898F';}}
function progress(on,p){var a=document.getElementById('pfa2-prog'),b=document.getElementById('pfa2-fill');if(a)a.style.display=on?'block':'none';if(b)b.style.width=(p||0)+'%';}
function collect(part,message,out){
  if(!part)return;
  var disposition=header({headers:part.headers||[]},'Content-Disposition').toLowerCase();
  if(part.filename&&part.body&&(part.body.attachmentId||part.body.data))out.push({
    key:message.id+':'+(part.body.attachmentId||part.filename+':'+out.length),messageId:message.id,
    attachmentId:part.body.attachmentId||'',inlineData:part.body.data||'',filename:part.filename,
    mimeType:part.mimeType||'application/octet-stream',size:part.body.size||0,
    sender:header(message.payload,'From'),date:header(message.payload,'Date'),inline:disposition.indexOf('inline')>-1
  });
  arr(part.parts).forEach(function(x){collect(x,message,out);});
}
function bytes(data){var s=String(data||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var bin=atob(s),a=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;}
async function toFile(x){var data=x.inlineData;if(!data){var r=await A.gmail('/messages/'+enc(x.messageId)+'/attachments/'+enc(x.attachmentId),current.token);data=r.data||'';}return new File([bytes(data)],x.filename,{type:x.mimeType});}
async function messageIds(pid){
  var out=[];
  try{var direct=await supaFetch('project_emails?project_id=eq.'+enc(pid)+'&select=gmail_message_id&order=sent_at.desc&limit=1500');out=out.concat(arr(direct).map(function(x){return x.gmail_message_id;}));}catch(e){}
  try{var links=await supaFetch('project_email_links?project_id=eq.'+enc(pid)+'&select=gmail_message_id&order=created_at.desc&limit=3000');out=out.concat(arr(links).map(function(x){return x.gmail_message_id;}));}catch(e){}
  return out.filter(function(x,i,a){return x&&a.indexOf(x)===i;});
}
function style(){if(document.getElementById('pfa2-style'))return;var s=document.createElement('style');s.id='pfa2-style';s.textContent=`
.pfa2-bg{position:fixed;inset:0;background:rgba(25,36,42,.44);z-index:6200;display:flex;align-items:center;justify-content:center;padding:22px}.pfa2-modal{width:min(760px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:15px;box-shadow:0 24px 70px rgba(20,34,40,.25)}.pfa2-hd{display:flex;justify-content:space-between;gap:12px;padding:17px 19px;border-bottom:1px solid #E4EBEE}.pfa2-title{font-size:15px;font-weight:750}.pfa2-sub{font-size:10px;color:#819097;margin-top:3px}.pfa2-x{border:0;background:none;font-size:21px;color:#829097;cursor:pointer}.pfa2-body{padding:15px 19px}.pfa2-att{display:flex;align-items:flex-start;gap:9px;padding:9px;border:1px solid #DFE7EA;border-radius:9px;margin:6px 0}.pfa2-att:hover{border-color:#BFDDE8;background:#FAFDFE}.pfa2-att input{margin-top:3px}.pfa2-main{flex:1;min-width:0}.pfa2-name{display:block;font-size:11px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pfa2-meta{display:block;font-size:9px;color:#829097;margin-top:2px}.pfa2-empty{font-size:10px;color:#859198;font-style:italic;padding:14px 0}.pfa2-state{font-size:10px;color:#7D898F;min-height:17px;margin-top:11px}.pfa2-prog{height:4px;background:#EDF2F4;display:none;margin-top:6px;overflow:hidden;border-radius:3px}.pfa2-prog i{display:block;height:100%;width:0;background:#5B9BB3}.pfa2-ft{display:flex;justify-content:flex-end;gap:7px;padding:13px 19px;border-top:1px solid #E4EBEE}.pfa2-btn{height:34px;border:1px solid #DCE6EA;border-radius:9px;background:#fff;color:#59666D;padding:0 12px;font-size:9.5px;font-weight:730;cursor:pointer}.pfa2-btn.primary{border:0;background:linear-gradient(135deg,#67A8C0,#3F7F98);color:#fff}.pfa2-btn:disabled{opacity:.5;cursor:wait}
`;document.head.appendChild(s);}
function render(){
  style();var old=document.getElementById('pfa2-bg');if(old)old.remove();
  var rows=current.attachments.length?current.attachments.map(function(x){return'<label class="pfa2-att"><input class="pfa2-check" type="checkbox" data-key="'+esc(x.key)+'"'+(x.inline?'':' checked')+'><span class="pfa2-main"><span class="pfa2-name">'+esc(x.filename)+'</span><span class="pfa2-meta">'+esc(email(x.sender)||x.sender)+(x.size?' · '+fmtBytes(x.size):'')+(x.inline?' · inline':'')+'</span></span></label>';}).join(''):'<div class="pfa2-empty">Nuk u gjetën attachment-e në emailat e lidhur me këtë projekt.</div>';
  document.body.insertAdjacentHTML('beforeend','<div class="pfa2-bg" id="pfa2-bg"><div class="pfa2-modal"><div class="pfa2-hd"><div><div class="pfa2-title">Importo skedarët e emailave</div><div class="pfa2-sub">Lexohen emailat e lidhur direkt dhe emailat e lidhur përmes project_email_links.</div></div><button class="pfa2-x" id="pfa2-close">×</button></div><div class="pfa2-body">'+rows+'<div class="pfa2-state" id="pfa2-state">Zgjidh skedarët që dëshiron të ruash në dosjen e projektit.</div><div class="pfa2-prog" id="pfa2-prog"><i id="pfa2-fill"></i></div></div><div class="pfa2-ft"><button class="pfa2-btn" id="pfa2-cancel">Anulo</button><button class="pfa2-btn primary" id="pfa2-import"'+(current.attachments.length?'':' disabled')+'>Importo të zgjedhurat</button></div></div></div>');
  document.getElementById('pfa2-close').onclick=close;document.getElementById('pfa2-cancel').onclick=close;document.getElementById('pfa2-import').onclick=runImport;
}
async function runImport(){
  var button=document.getElementById('pfa2-import');if(!button||button.disabled)return;button.disabled=true;button.textContent='Duke importuar…';
  try{
    var keys=Array.prototype.slice.call(document.querySelectorAll('.pfa2-check:checked')).map(function(e){return e.getAttribute('data-key');});
    var chosen=current.attachments.filter(function(x){return keys.indexOf(x.key)>-1;});if(!chosen.length)throw new Error('Zgjidh së paku një skedar.');
    var files=[];progress(true,5);
    for(var i=0;i<chosen.length;i++){stateText('Po shkarkohet '+(i+1)+'/'+chosen.length+': '+chosen[i].filename);files.push(await toFile(chosen[i]));progress(true,5+Math.round((i+1)/chosen.length*35));}
    var result=await window.PSTDriveImport.importFiles(current.pid,files,function(x){if(x.phase==='upload'){var pct=40+Math.round(((x.index-1)+(x.percent||0)/100)/Math.max(x.total,1)*60);progress(true,pct);stateText('Po ruhet '+x.index+'/'+x.total+': '+x.name+' ('+(x.percent||0)+'%)');}else if(x.message)stateText(x.message);});
    progress(true,100);stateText(result.uploaded+' skedarë u importuan'+(result.skipped?' · '+result.skipped+' ekzistonin tashmë.':'.'),'#2F7657');button.textContent='Përfundoi';
    if(typeof window.pstDriveRefresh==='function')window.pstDriveRefresh(current.pid);
    if(typeof window.pstPiRefresh==='function')setTimeout(window.pstPiRefresh,500);
  }catch(e){stateText(e.message||String(e),'#A64B42');button.disabled=false;button.textContent='Importo të zgjedhurat';progress(false,0);}
}
window.pstImportProjectEmailFiles=async function(pid){
  if(document.getElementById('pfa2-bg'))return;
  current={pid:String(pid),token:'',attachments:[]};A=window.PSTEmail;
  try{
    if(!A||!window.PSTDriveImport)throw new Error('Modulet Gmail/Drive nuk janë gati.');
    current.token=await A.auth();var ids=await messageIds(pid);
    if(!ids.length){render();return;}
    var messages=await A.map(ids,5,function(id){return A.gmail('/messages/'+enc(id)+'?format=full',current.token);});
    messages.forEach(function(m){collect(m.payload,m,current.attachments);});
    var seen={};current.attachments=current.attachments.filter(function(x){if(seen[x.key])return false;seen[x.key]=1;return true;});render();
  }catch(e){alert('Importimi i skedarëve: '+(e.message||e));}
};
style();
})();
