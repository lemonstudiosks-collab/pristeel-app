/* PRISTEEL Project File Upload v1
 * Explicit desktop -> project Google Drive upload.
 * No polling/observers. Uploads only after user selects files and confirms.
 */
(function(){
'use strict';
if(window.__pstProjectFileUploadV1)return;
window.__pstProjectFileUploadV1=true;

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function projectId(){return String(window.__pstCurrentProjectId||window._curProjId||'');}
function fmt(n){n=Number(n||0);if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(n<10240?1:0)+' KB';return(n/1048576).toFixed(n<10485760?1:0)+' MB';}

function css(){
 if(document.getElementById('pst-pfu-css'))return;
 var s=document.createElement('style');s.id='pst-pfu-css';s.textContent=`
 .pst-pfu-open{height:35px;border:1px solid #D5E2E6!important;border-radius:9px!important;background:#fff!important;color:#456D7E!important;padding:0 12px!important;font-size:8.8px!important;font-weight:760!important;cursor:pointer}
 .pst-pfu-bg{position:fixed;inset:0;z-index:2147482500;background:rgba(30,45,52,.48);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
 .pst-pfu-modal{width:min(620px,96vw);max-height:90vh;background:#fff;border-radius:16px;box-shadow:0 28px 90px rgba(22,43,52,.26);overflow:hidden;display:flex;flex-direction:column}
 .pst-pfu-head{padding:17px 19px;border-bottom:1px solid #E1E9EC;display:flex;align-items:flex-start;justify-content:space-between;background:linear-gradient(180deg,#fff,#F7FBFC)}
 .pst-pfu-head h2{margin:0;font-size:17px;color:#20282C}.pst-pfu-head p{margin:4px 0 0;font-size:9.5px;color:#7A878D}.pst-pfu-x{border:0;background:none;color:#849096;font-size:22px;cursor:pointer}
 .pst-pfu-body{padding:17px 19px;overflow:auto}.pst-pfu-drop{border:1.5px dashed #BFD5DD;border-radius:13px;background:#F7FBFC;padding:26px 18px;text-align:center;cursor:pointer;transition:.15s}.pst-pfu-drop.drag{border-color:#5B9BB3;background:#EDF7FA}.pst-pfu-drop b{display:block;font-size:11px;color:#365868}.pst-pfu-drop span{display:block;font-size:8.5px;color:#849197;margin-top:5px}.pst-pfu-drop input{display:none}
 .pst-pfu-list{margin-top:12px;display:flex;flex-direction:column;gap:6px}.pst-pfu-file{display:flex;align-items:center;gap:9px;border:1px solid #E1E8EB;border-radius:9px;padding:8px 10px}.pst-pfu-file div{min-width:0;flex:1}.pst-pfu-file b{display:block;font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#34434A}.pst-pfu-file small{display:block;font-size:7.5px;color:#89959A;margin-top:2px}.pst-pfu-file button{border:0;background:#F2F5F6;color:#74838A;border-radius:7px;width:24px;height:24px;cursor:pointer}
 .pst-pfu-status{margin-top:12px;border-radius:10px;background:#F3F7F8;color:#68767D;padding:9px 11px;font-size:9px;line-height:1.5}.pst-pfu-status.ok{background:#ECF7F1;color:#2F7657}.pst-pfu-status.bad{background:#FBEFEE;color:#98483F}
 .pst-pfu-foot{padding:13px 19px;border-top:1px solid #E1E9EC;display:flex;justify-content:flex-end;gap:7px;background:#FBFDFE}.pst-pfu-btn{height:35px;border:1px solid #D7E3E7;border-radius:9px;background:#fff;color:#526168;padding:0 12px;font-size:9px;font-weight:720;cursor:pointer}.pst-pfu-btn.primary{border:0;background:linear-gradient(135deg,#67A8C0,#3F7F98);color:#fff}.pst-pfu-btn:disabled{opacity:.45;cursor:not-allowed}
 `;document.head.appendChild(s);
}

var files=[];
function renderFiles(){
 var host=document.getElementById('pst-pfu-list');if(!host)return;
 host.innerHTML=files.map(function(f,i){return'<div class="pst-pfu-file"><div><b>'+esc(f.name)+'</b><small>'+esc(fmt(f.size))+(f.type?' · '+esc(f.type):'')+'</small></div><button type="button" data-pfu-remove="'+i+'">×</button></div>';}).join('');
 var go=document.getElementById('pst-pfu-go');if(go)go.disabled=!files.length;
}
function add(list){Array.prototype.slice.call(list||[]).forEach(function(f){if(!f)return;var duplicate=files.some(function(x){return x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified;});if(!duplicate)files.push(f);});renderFiles();}
function status(text,type){var e=document.getElementById('pst-pfu-status');if(!e)return;e.textContent=text||'';e.className='pst-pfu-status'+(type?' '+type:'');}
function close(){var e=document.getElementById('pst-pfu-bg');if(e)e.remove();files=[];}

function open(){
 var id=projectId();if(!id){alert('Hape një projekt para se të ngarkosh skedarë.');return;}
 css();files=[];var old=document.getElementById('pst-pfu-bg');if(old)old.remove();
 document.body.insertAdjacentHTML('beforeend','<div class="pst-pfu-bg" id="pst-pfu-bg"><div class="pst-pfu-modal"><div class="pst-pfu-head"><div><h2>Ngarko skedarë te projekti</h2><p>PDF, Excel, Word, vizatime ose dokumente të tjera nga kompjuteri.</p></div><button class="pst-pfu-x" id="pst-pfu-x">×</button></div><div class="pst-pfu-body"><label class="pst-pfu-drop" id="pst-pfu-drop"><b>Zgjidh skedarët ose tërhiqi këtu</b><span>Mund të zgjedhësh disa skedarë njëherësh.</span><input id="pst-pfu-input" type="file" multiple></label><div class="pst-pfu-list" id="pst-pfu-list"></div><div class="pst-pfu-status" id="pst-pfu-status">Skedarët do të ruhen në dosjen Google Drive të këtij projekti.</div></div><div class="pst-pfu-foot"><button class="pst-pfu-btn" id="pst-pfu-cancel">Anulo</button><button class="pst-pfu-btn primary" id="pst-pfu-go" disabled>Ngarko skedarët</button></div></div></div>');
 var input=document.getElementById('pst-pfu-input'),drop=document.getElementById('pst-pfu-drop');
 document.getElementById('pst-pfu-x').onclick=close;document.getElementById('pst-pfu-cancel').onclick=close;
 input.onchange=function(){add(input.files);input.value='';};
 drop.addEventListener('dragover',function(e){e.preventDefault();drop.classList.add('drag');});
 drop.addEventListener('dragleave',function(){drop.classList.remove('drag');});
 drop.addEventListener('drop',function(e){e.preventDefault();drop.classList.remove('drag');add(e.dataTransfer&&e.dataTransfer.files);});
 document.getElementById('pst-pfu-list').onclick=function(e){var b=e.target.closest&&e.target.closest('[data-pfu-remove]');if(!b)return;files.splice(Number(b.getAttribute('data-pfu-remove')),1);renderFiles();};
 document.getElementById('pst-pfu-go').onclick=function(){upload(id);};
}

async function upload(id){
 if(!files.length)return;if(!window.PSTDriveImport||typeof window.PSTDriveImport.importFiles!=='function'){status('Moduli Google Drive nuk është gati. Rifresko platformën dhe provo përsëri.','bad');return;}
 var go=document.getElementById('pst-pfu-go'),cancel=document.getElementById('pst-pfu-cancel'),input=document.getElementById('pst-pfu-input');go.disabled=true;if(cancel)cancel.disabled=true;if(input)input.disabled=true;
 try{
  var result=await window.PSTDriveImport.importFiles(id,files,function(x){if(x&&x.message)status(x.message);});
  status(Number(result&&result.uploaded||0)+' skedarë u ngarkuan me sukses'+(result&&result.skipped?' · '+result.skipped+' ekzistonin tashmë.':'.'),'ok');
  files=[];renderFiles();
  if(typeof window.pstProjectCommandRefresh==='function')try{window.pstProjectCommandRefresh();}catch(e){}
  setTimeout(close,1200);
 }catch(e){status(String(e&&e.message||e),'bad');go.disabled=false;if(cancel)cancel.disabled=false;if(input)input.disabled=false;}
}

function inject(){
 var page=document.getElementById('page-workspace-project');if(!page||!projectId())return false;
 var box=page.querySelector('#pst-project-command-view .pst-pcv-primary');if(!box||document.getElementById('pst-pfu-open'))return false;
 var b=document.createElement('button');b.type='button';b.id='pst-pfu-open';b.className='pst-pfu-open';b.textContent='Ngarko skedarë';b.onclick=open;box.appendChild(b);return true;
}
function schedule(){[0,120,350,800,1500].forEach(function(ms){setTimeout(inject,ms);});}
css();
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-pm-open]'))schedule();},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
window.PSTProjectFileUpload={open:open,inject:inject};
schedule();
})();