/* PRISTEEL — Finance Receipt Inbox v1
   Isolated add-on for receipt photo/PDF intake, local OCR review and human-confirmed expense creation.
   Does not own primary navigation and does not alter Finance stability routing. */
(function(){
'use strict';

var VIEW_ID='fin-view-receipts-v1';
var TILE_ID='fin-receipts-v1-tile';
var _rows=[];
var _projects=[];
var _projectsLoaded=false;
var _pollTimer=null;
var _modalPollTimer=null;
var _activeReceiptId=null;
var _cameraStream=null;
var _visionPending={};
var _visionAutoTried={};

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function num(v){if(v==null||v==='')return null;var s=String(v).trim().replace(/\s/g,'').replace(',','.');var n=Number(s);return Number.isFinite(n)?n:null;}
function eur(v,currency){var n=num(v);if(n==null)return '—';return n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+esc(currency||'EUR');}
function dateText(v){return v?String(v).slice(0,10):'—';}
function byId(id){return document.getElementById(id);}
function currentSession(){try{return typeof authGetSession==='function'?authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{if(typeof authRefreshIfNeeded==='function')return await authRefreshIfNeeded();}catch(e){}return currentSession();}
async function edgeFetch(name,opts){
  opts=opts||{};var s=currentSession();
  if(s&&s.refresh_token&&s.expires_at&&Date.now()>=s.expires_at)s=await refreshSession();
  var token=(s&&s.access_token)?s.access_token:_SB_KEY;
  var headers=Object.assign({'apikey':_SB_KEY,'Authorization':'Bearer '+token},opts.headers||{});
  var r=await fetch(_SB_URL+'/functions/v1/'+name+(opts.query||''),{method:opts.method||'GET',headers:headers,body:opts.body});
  if(r.status===401){s=await refreshSession();if(s&&s.access_token){headers=Object.assign({},headers,{'Authorization':'Bearer '+s.access_token});r=await fetch(_SB_URL+'/functions/v1/'+name+(opts.query||''),{method:opts.method||'GET',headers:headers,body:opts.body});}}
  var j=null;try{j=await r.json();}catch(e){}if(!r.ok)throw new Error((j&&j.error)||('HTTP '+r.status));return j||{};
}
function statusMeta(s){
  var m={needs_ocr:['Në pritje OCR','#8D6E63','#F7F2EE'],ocr_queued:['Në radhë OCR','#8D6E63','#F7F2EE'],ocr_processing:['Duke lexuar','#185FA5','#EDF5FC'],review:['Për kontroll','#A65F2E','#FBF2EB'],no_text:['OCR lokal pa tekst','#B8461F','#FFF0EB'],failed:['Gabim OCR','#A33A2E','#FCEDEA'],confirmed:['Regjistruar','#2E7D32','#EAF5EC'],duplicate:['Dublikat','#5C5A57','#F3F3F2'],ignored:['Injoruar','#5C5A57','#F3F3F2']};
  var x=m[s]||[s||'—','#5C5A57','#F3F3F2'];return{label:x[0],color:x[1],bg:x[2]};
}
function canonicalCategory(v){
  v=String(v||'tjera').toLowerCase();var direct={rryma:1,uji:1,nafta:1,qira:1,telefon:1,mirembajtje:1,sherbime:1,transport:1,sigurime:1,tjera:1};
  if(direct[v])return v;if(v==='telefoni')return'telefon';if(v==='qiraja')return'qira';if(v==='parking'||v==='rruge'||v==='road'||v==='toll')return'transport';if(v==='hotel'||v==='restorant'||v==='restaurant')return'sherbime';return'tjera';
}
var CATS=[['rryma','Rryma'],['uji','Uji'],['nafta','Nafta / karburant'],['qira','Qiraja'],['telefon','Telefon / internet'],['mirembajtje','Mirëmbajtje'],['sherbime','Shërbime'],['transport','Transport / logjistikë'],['sigurime','Sigurime'],['tjera','Të tjera']];
function catOptions(selected){selected=canonicalCategory(selected);return CATS.map(function(c){return'<option value="'+c[0]+'"'+(c[0]===selected?' selected':'')+'>'+c[1]+'</option>';}).join('');}
function ensureView(){
  var page=byId('page-finance');if(!page)return null;var v=byId(VIEW_ID);if(v)return v;
  v=document.createElement('div');v.id=VIEW_ID;v.style.display='none';
  v.innerHTML='<div class="card">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap"><div><div class="card-title" style="margin:0">Kuponët dhe faturat e shpenzimeve</div><div style="font-size:11.5px;color:var(--text3);margin-top:4px">Foto/PDF → OCR lokal → lexim vizual rezervë kur duhet → kontroll njerëzor → regjistrim.</div></div>'
    +'<div style="display:flex;gap:7px;flex-wrap:wrap"><button class="btn btn-sm" onclick="finReceiptBack()">← Të gjitha financat</button><button class="btn btn-primary btn-sm" onclick="finReceiptCameraOpen()">📷 Bëj foto</button><button class="btn btn-sm" onclick="document.getElementById(\'fin-receipt-file-v1\').click()">Ngarko foto/PDF</button><button class="btn btn-sm" onclick="finReceiptReload()">Rifresko</button></div></div>'
    +'<input id="fin-receipt-camera-v1" type="file" accept="image/*" capture="environment" style="display:none" onchange="finReceiptUpload(this,\'camera\')"><input id="fin-receipt-file-v1" type="file" accept="image/*,application/pdf" style="display:none" onchange="finReceiptUpload(this,\'upload\')">'
    +'<div id="fin-receipt-msg-v1" style="display:none;margin-top:12px;padding:9px 11px;border-radius:8px;font-size:11.5px"></div><div id="fin-receipt-summary-v1" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px;margin-top:14px"></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:16px;padding-top:13px;border-top:1px solid var(--border)"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px">Inbox</div><div style="font-size:10.5px;color:var(--text3)">PPPP i lexon të dhënat; asnjë shpenzim nuk regjistrohet pa konfirmimin tënd.</div></div>'
    +'<div id="fin-receipt-list-v1" style="margin-top:8px"><div style="font-size:12px;color:var(--text3)">Duke ngarkuar…</div></div></div>';
  page.appendChild(v);return v;
}
function setReceiptSurface(open){
  var page=byId('page-finance'),hub=byId('fin-hub'),grid=byId('fin-hub-grid'),focus=byId('pst-finance-focus'),tools=byId('pst-finance-tools');
  if(page){if(open)page.setAttribute('data-pst-finance-subview','receipts');else if(page.getAttribute('data-pst-finance-subview')==='receipts')page.removeAttribute('data-pst-finance-subview');}
  if(hub)hub.style.display='';
  [focus,tools].forEach(function(el){if(!el)return;if(open){if(!el.hasAttribute('data-fin-receipt-prev-display'))el.setAttribute('data-fin-receipt-prev-display',el.style.display||'');el.style.display='none';}else if(el.hasAttribute('data-fin-receipt-prev-display')){var prev=el.getAttribute('data-fin-receipt-prev-display');if(prev)el.style.display=prev;else el.style.removeProperty('display');el.removeAttribute('data-fin-receipt-prev-display');}});
  if(grid&&!tools){if(open){if(!grid.hasAttribute('data-fin-receipt-prev-display'))grid.setAttribute('data-fin-receipt-prev-display',grid.style.display||'');grid.style.display='none';}else if(grid.hasAttribute('data-fin-receipt-prev-display')){var gp=grid.getAttribute('data-fin-receipt-prev-display');if(gp)grid.style.display=gp;else grid.style.removeProperty('display');grid.removeAttribute('data-fin-receipt-prev-display');}}
}
function injectTile(){
  var g=byId('fin-hub-grid');if(!g||byId(TILE_ID))return;var d=document.createElement('button');d.id=TILE_ID;d.type='button';d.setAttribute('title','Kuponët dhe faturat e shpenzimeve');d.setAttribute('aria-label','Hap kuponët dhe faturat e shpenzimeve');
  d.style.cssText='position:relative;border:2.5px solid #46647A;border-radius:12px;padding:16px;cursor:pointer;background:#fff;transition:box-shadow .15s,transform .1s;min-height:110px;display:flex;flex-direction:column;text-align:left;width:100%;font:inherit;color:inherit';
  d.onmouseover=function(){this.style.boxShadow='0 5px 18px rgba(30,40,50,.14)';this.style.transform='translateY(-1px)';};d.onmouseout=function(){this.style.boxShadow='none';this.style.transform='none';};
  d.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();window.finReceiptShow();});
  d.innerHTML='<div style="position:absolute;top:0;left:0;right:0;height:5px;background:#46647A;border-radius:9px 9px 0 0"></div><div style="font-size:22px;margin:6px 0 8px">📷</div><div style="font-size:13.5px;font-weight:650;color:var(--text)">Kuponët e shpenzimeve</div><div style="font-size:11px;color:var(--text3);margin-top:3px;line-height:1.4">Foto/PDF, lexim automatik dhe kontroll para regjistrimit</div>';g.appendChild(d);
}
function stopCamera(){if(_cameraStream){try{_cameraStream.getTracks().forEach(function(t){t.stop();});}catch(e){}_cameraStream=null;}}
function stopModalPolling(){if(_modalPollTimer){clearInterval(_modalPollTimer);_modalPollTimer=null;}}
function hideReceipt(){var v=byId(VIEW_ID);if(v)v.style.display='none';stopCamera();stopModalPolling();var cm=byId('fin-receipt-camera-modal-v1');if(cm)cm.style.display='none';setReceiptSurface(false);stopPolling();}
function installHubHook(){var orig=window.finShowHub;if(typeof orig==='function'&&!orig.__receiptInboxV1){var wrapped=function(){hideReceipt();var r=orig.apply(this,arguments);injectTile();return r;};wrapped.__receiptInboxV1=true;wrapped.__receiptInboxOriginal=orig;window.finShowHub=wrapped;}injectTile();ensureView();}
function showMessage(text,kind){var el=byId('fin-receipt-msg-v1');if(!el)return;var ok=kind!=='error';el.style.display='';el.style.background=ok?'#EAF5EC':'#FCEDEA';el.style.color=ok?'#2E7D32':'#A33A2E';el.textContent=text;}
function clearMessage(){var el=byId('fin-receipt-msg-v1');if(el)el.style.display='none';}
function summaryCard(label,value,color){return'<div style="border:1px solid var(--border);border-left:3px solid '+color+';border-radius:9px;padding:9px 11px;background:#fff"><div style="font-size:10px;text-transform:uppercase;color:var(--text3)">'+label+'</div><div style="font-size:18px;font-weight:700;color:'+color+';margin-top:2px">'+value+'</div></div>';}
function renderSummary(){var el=byId('fin-receipt-summary-v1');if(!el)return;var review=0,processing=0,problem=0,confirmed=0;_rows.forEach(function(r){if(r.status==='review')review++;else if(['needs_ocr','ocr_queued','ocr_processing'].indexOf(r.status)>=0)processing++;else if(r.status==='failed'||r.status==='no_text')problem++;else if(r.status==='confirmed')confirmed++;});el.innerHTML=summaryCard('Për kontroll',review,'#A65F2E')+summaryCard('Në OCR',processing,'#185FA5')+summaryCard('Kërkojnë dorë',problem,'#A33A2E')+summaryCard('Regjistruar',confirmed,'#2E7D32');}
function renderList(){
  var el=byId('fin-receipt-list-v1');if(!el)return;renderSummary();if(!_rows.length){el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:12px 0">Nuk ka kuponë në inbox. Përdor kamerën ose ngarko një foto/PDF.</div>';return;}
  el.innerHTML=_rows.map(function(r){var st=statusMeta(r.status),needs=(r.status==='review'||r.status==='failed'||r.status==='no_text');return'<div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(110px,.7fr) minmax(110px,.55fr) auto;gap:10px;align-items:center;padding:10px 8px;border-bottom:1px solid var(--border)"><div style="min-width:0"><div style="font-size:12.5px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(r.supplier||r.file_name||'Kupon')+'</div><div style="font-size:10.5px;color:var(--text3);margin-top:2px">'+esc(r.invoice_nr||'Pa nr.')+' · '+dateText(r.expense_date||r.created_at)+' · '+esc(r.source_type||'')+'</div></div><div style="font-size:12px;font-weight:650;text-align:right">'+eur(r.amount,r.currency)+'</div><div><span style="display:inline-block;background:'+st.bg+';color:'+st.color+';font-size:10px;font-weight:650;padding:3px 7px;border-radius:5px;white-space:nowrap">'+esc(st.label)+'</span>'+(r.confidence!=null?'<div style="font-size:9.5px;color:var(--text3);margin-top:2px">'+esc(r.confidence)+'% besim</div>':'')+'</div><button class="btn btn-sm" style="font-size:10.5px" onclick="finReceiptOpen(\''+esc(r.id)+'\')">'+(needs?'Kontrollo':'Hap')+'</button></div>';}).join('');
}
async function loadRows(silent){var el=byId('fin-receipt-list-v1');if(el&&!silent)el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:10px 0">Duke ngarkuar…</div>';try{_rows=await supaFetch('pppp_expense_receipt_review_v1?select=*&order=created_at.desc&limit=100')||[];renderList();startPollingIfNeeded();}catch(e){if(el)el.innerHTML='<div style="font-size:12px;color:var(--red-text);padding:10px 0">Gabim: '+esc(e.message)+'</div>';}}
function stopPolling(){if(_pollTimer){clearInterval(_pollTimer);_pollTimer=null;}}
function startPollingIfNeeded(){stopPolling();var has=_rows.some(function(r){return['needs_ocr','ocr_queued','ocr_processing'].indexOf(r.status)>=0;});if(!has)return;_pollTimer=setInterval(function(){var v=byId(VIEW_ID);if(v&&v.style.display!=='none')loadRows(true);else stopPolling();},12000);}
window.finReceiptShow=function(){var v=ensureView();if(!v)return;var tabs=byId('fin-tabs');if(tabs)tabs.style.display='none';['inv','supp','exp','atk','tax','aging','bg','oc'].forEach(function(x){var n=byId('fin-view-'+x);if(n)n.style.display='none';});setReceiptSurface(true);v.style.display='';clearMessage();loadRows(false);};
window.finReceiptBack=function(){hideReceipt();if(typeof finShowHub==='function')finShowHub();};window.finReceiptReload=function(){loadRows(false);};

async function uploadReceiptFile(f,source,input){
  if(!f)return;if(f.size>20*1024*1024){showMessage('Skedari është më i madh se 20 MB.','error');if(input)input.value='';return;}showMessage('Po ruhet kuponi dhe po dërgohet në OCR lokal…','ok');
  try{var form=new FormData();form.append('file',f,f.name||'receipt.jpg');form.append('source_type',source==='camera'?'camera':'upload');var res=await edgeFetch('pppp-expense-receipt-upload',{method:'POST',body:form});if(res.duplicate)showMessage('Ky dokument ekziston tashmë. Po hapet regjistrimi ekzistues.','ok');else if(res.warning)showMessage('Dokumenti u ruajt, por OCR nuk hyri në radhë. Mund ta plotësosh manualisht.','error');else showMessage('Dokumenti u ruajt. PPPP po e lexon; nëse OCR lokal nuk mjafton, do të provojë automatikisht leximin vizual.','ok');if(input)input.value='';await loadRows(true);var id=res&&res.receipt&&res.receipt.id;if(id)setTimeout(function(){window.finReceiptOpen(id);},150);}catch(e){showMessage('Ngarkimi dështoi: '+e.message,'error');if(input)input.value='';}
}
window.finReceiptUpload=async function(input,source){var f=input&&input.files&&input.files[0];if(!f)return;return uploadReceiptFile(f,source,input);};
function cameraShell(){var m=byId('fin-receipt-camera-modal-v1');if(m)return m;m=document.createElement('div');m.id='fin-receipt-camera-modal-v1';m.style.cssText='display:none;position:fixed;inset:0;background:rgba(26,26,25,.58);z-index:1300;padding:22px;overflow:auto';m.onclick=function(e){if(e.target===m)window.finReceiptCameraClose();};document.body.appendChild(m);return m;}
window.finReceiptCameraClose=function(){stopCamera();var m=byId('fin-receipt-camera-modal-v1');if(m)m.style.display='none';};
window.finReceiptCameraOpen=async function(){
  var fallback=byId('fin-receipt-camera-v1');if(!navigator.mediaDevices||typeof navigator.mediaDevices.getUserMedia!=='function'){if(fallback)fallback.click();return;}
  var m=cameraShell();m.innerHTML='<div style="max-width:760px;margin:0 auto;background:#fff;border-radius:13px;box-shadow:0 18px 60px rgba(0,0,0,.28);overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border)"><div><div style="font-size:14px;font-weight:700">Bëj foto të kuponit</div><div style="font-size:10.5px;color:var(--text3);margin-top:2px">Lejo kamerën në shfletues, vendose kuponin qartë në kornizë dhe shkrep foton.</div></div><button class="btn btn-sm" onclick="finReceiptCameraClose()">✕</button></div><div style="padding:14px 16px"><div style="background:#111;border-radius:10px;overflow:hidden;min-height:280px;display:flex;align-items:center;justify-content:center"><video id="fin-receipt-camera-video-v1" autoplay playsinline muted style="display:block;width:100%;max-height:62vh;object-fit:contain;background:#111"></video></div><div id="fin-receipt-camera-status-v1" style="font-size:11px;color:var(--text3);margin-top:9px">Po hapet kamera…</div><div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn btn-sm" onclick="finReceiptCameraClose()">Anulo</button><button id="fin-receipt-camera-shot-v1" class="btn btn-primary btn-sm" onclick="finReceiptCameraCapture()" disabled>📷 Shkrep foton</button></div></div></div>';m.style.display='block';
  try{stopCamera();_cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});var video=byId('fin-receipt-camera-video-v1');if(!video)throw new Error('Pamja e kamerës nuk u inicializua.');video.srcObject=_cameraStream;await video.play();var status=byId('fin-receipt-camera-status-v1'),shot=byId('fin-receipt-camera-shot-v1');if(status)status.textContent='Kamera është gati. Mbaje kuponin të palëvizshëm dhe shkrep foton.';if(shot)shot.disabled=false;}catch(e){window.finReceiptCameraClose();var denied=e&&((e.name==='NotAllowedError')||(e.name==='PermissionDeniedError'));showMessage(denied?'Kamera nuk u lejua nga shfletuesi. Lejo kamerën për PPPP ose përdor “Ngarko foto/PDF”.':'Kamera nuk mund të hapej në këtë pajisje. Përdor “Ngarko foto/PDF”.','error');}
};
window.finReceiptCameraCapture=function(){var video=byId('fin-receipt-camera-video-v1');if(!video||!video.videoWidth||!video.videoHeight){showMessage('Kamera nuk është ende gati për fotografim.','error');return;}var shot=byId('fin-receipt-camera-shot-v1');if(shot)shot.disabled=true;var canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;var ctx=canvas.getContext('2d');if(!ctx){if(shot)shot.disabled=false;showMessage('Fotografia nuk mund të përgatitej.','error');return;}ctx.drawImage(video,0,0,canvas.width,canvas.height);canvas.toBlob(function(blob){if(!blob){if(shot)shot.disabled=false;showMessage('Fotografia nuk mund të krijohej.','error');return;}var name='receipt-'+new Date().toISOString().replace(/[:.]/g,'-')+'.jpg';var file;try{file=new File([blob],name,{type:'image/jpeg',lastModified:Date.now()});}catch(e){file=blob;}window.finReceiptCameraClose();uploadReceiptFile(file,'camera',null);},'image/jpeg',0.92);};

async function loadProjects(){if(_projectsLoaded)return;_projectsLoaded=true;try{_projects=await supaFetch('projects?select=id,name&order=last_activity_at.desc&limit=250')||[];}catch(e){try{_projects=await supaFetch('projects?select=id,name&order=created_at.desc&limit=250')||[];}catch(_e){_projects=[];}}}
function projectOptions(selected){var out='<option value="">— Pa projekt —</option>';_projects.forEach(function(p){out+='<option value="'+esc(p.id)+'"'+(String(p.id)===String(selected||'')?' selected':'')+'>'+esc(p.name||p.id)+'</option>';});return out;}
async function signedPreview(id){try{return await edgeFetch('pppp-expense-receipt-upload',{query:'?id='+encodeURIComponent(id)});}catch(e){return{ok:false,error:e.message};}}
function field(label,id,value,type,extra){return'<div><label class="lbl">'+label+'</label><input id="'+id+'" type="'+(type||'text')+'" value="'+esc(value==null?'':value)+'" '+(extra||'')+'></div>';}
function modalShell(){var m=byId('fin-receipt-modal-v1');if(m)return m;m=document.createElement('div');m.id='fin-receipt-modal-v1';m.style.cssText='display:none;position:fixed;inset:0;background:rgba(26,26,25,.38);z-index:1200;padding:22px;overflow:auto';m.onclick=function(e){if(e.target===m)window.finReceiptClose();};document.body.appendChild(m);return m;}
function replaceRow(r){var found=false;_rows=_rows.map(function(x){if(String(x.id)===String(r.id)){found=true;return r;}return x;});if(!found)_rows.unshift(r);renderList();}
async function fetchReceipt(id){var rows=await supaFetch('pppp_expense_receipt_review_v1?select=*&id=eq.'+encodeURIComponent(id)+'&limit=1')||[];return rows[0]||null;}
async function runVisionFallback(id,manual){
  if(!id||_visionPending[id])return;_visionPending[id]=true;if(!manual)_visionAutoTried[id]=true;
  var note=byId('fin-receipt-vision-note-v1'),btn=byId('fin-receipt-vision-btn-v1');if(note){note.style.display='';note.textContent='PPPP po provon lexim vizual të faturës…';}if(btn)btn.disabled=true;
  try{await edgeFetch('pppp-expense-receipt-vision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({receipt_id:id})});var fresh=await fetchReceipt(id);if(fresh){replaceRow(fresh);if(String(_activeReceiptId)===String(id))await window.finReceiptOpen(id,true);}}
  catch(e){if(note){note.style.display='';note.style.color='#A33A2E';note.textContent='Leximi vizual nuk arriti: '+e.message;}if(btn)btn.disabled=false;}
  finally{delete _visionPending[id];}
}
function startModalPolling(r){
  stopModalPolling();if(!r||!_activeReceiptId)return;
  if(r.status==='no_text'&&String(r.mime_type||'').toLowerCase().indexOf('image/')===0&&!_visionAutoTried[r.id])setTimeout(function(){if(String(_activeReceiptId)===String(r.id))runVisionFallback(r.id,false);},120);
  if(['needs_ocr','ocr_queued','ocr_processing'].indexOf(r.status)<0)return;
  _modalPollTimer=setInterval(async function(){var id=_activeReceiptId;if(!id){stopModalPolling();return;}try{var fresh=await fetchReceipt(id);if(!fresh)return;replaceRow(fresh);if(fresh.status==='no_text'&&String(fresh.mime_type||'').toLowerCase().indexOf('image/')===0){stopModalPolling();await runVisionFallback(id,false);return;}if(['review','failed','confirmed'].indexOf(fresh.status)>=0){stopModalPolling();await window.finReceiptOpen(id,true);}}catch(e){}},4000);
}
window.finReceiptVisionRetry=function(){if(_activeReceiptId)runVisionFallback(_activeReceiptId,true);};
window.finReceiptOpen=async function(id,skipAuto){
  var r=_rows.filter(function(x){return String(x.id)===String(id);})[0];if(!r){r=await fetchReceipt(id);if(r)replaceRow(r);}if(!r){showMessage('Regjistrimi nuk u gjet.','error');return;}
  _activeReceiptId=r.id;await loadProjects();var signed=await signedPreview(r.id),m=modalShell(),st=statusMeta(r.status),cat=canonicalCategory(r.category),preview='';
  if(signed&&signed.url)preview=(String(r.mime_type||'').toLowerCase()==='application/pdf')?'<iframe title="Kuponi PDF" src="'+esc(signed.url)+'" style="width:100%;height:520px;border:1px solid var(--border);border-radius:8px;background:#fff"></iframe>':'<img alt="Kuponi" src="'+esc(signed.url)+'" style="display:block;max-width:100%;max-height:560px;margin:auto;border-radius:8px;border:1px solid var(--border)">';else preview='<div style="padding:18px;font-size:11px;color:var(--text3)">Pamja e dokumentit nuk mund të hapet tani.</div>';
  var editable=r.status!=='confirmed',canVision=editable&&String(r.mime_type||'').toLowerCase().indexOf('image/')===0&&(r.status==='no_text'||r.status==='failed');
  var progress=['needs_ocr','ocr_queued','ocr_processing'].indexOf(r.status)>=0?'<div style="background:#EDF5FC;color:#185FA5;border-radius:7px;padding:8px 10px;font-size:10.5px;margin-bottom:10px">PPPP po lexon faturën. Fushat do të plotësohen automatikisht sapo të përfundojë.</div>':'';
  m.innerHTML='<div style="max-width:1100px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 16px 50px rgba(0,0,0,.22);overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:14px 17px;border-bottom:1px solid var(--border)"><div><div style="font-size:14px;font-weight:700">Kontrolli i kuponit</div><div style="font-size:10.5px;color:var(--text3);margin-top:2px">'+esc(r.file_name)+' · <span style="color:'+st.color+'">'+esc(st.label)+'</span></div></div><button class="btn btn-sm" onclick="finReceiptClose()">✕</button></div>'
    +'<div style="display:grid;grid-template-columns:minmax(300px,1fr) minmax(340px,1fr);gap:16px;padding:16px"><div style="min-width:0">'+preview+'</div><div style="min-width:0">'+progress
    +(r.last_error?'<div style="background:#FCEDEA;color:#A33A2E;border-radius:7px;padding:8px 10px;font-size:10.5px;margin-bottom:10px">'+esc(r.last_error)+'</div>':'')
    +(canVision?'<div id="fin-receipt-vision-note-v1" style="background:#EDF5FC;color:#185FA5;border-radius:7px;padding:8px 10px;font-size:10.5px;margin-bottom:10px">OCR lokal nuk mjaftoi. PPPP do ta lexojë vizualisht këtë faturë dhe do t’i plotësojë fushat për kontroll.</div>':'')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">'+field('Furnitori *','fr-supplier-v1',r.supplier||'')+field('Nr. faturës / kuponit','fr-invoice-v1',r.invoice_nr||'')+field('Data *','fr-date-v1',r.expense_date||'','date')+'<div><label class="lbl">Kategoria *</label><select id="fr-category-v1">'+catOptions(cat)+'</select></div>'+field('Shuma bruto *','fr-amount-v1',r.amount==null?'':r.amount,'number','step="0.01" min="0"')+field('Neto','fr-net-v1',r.net_amount==null?'':r.net_amount,'number','step="0.01" min="0"')+field('TVSH %','fr-rate-v1',r.vat_rate==null?'':r.vat_rate,'number','step="0.01" min="0"')+field('TVSH shumë','fr-vat-v1',r.vat_amount==null?'':r.vat_amount,'number','step="0.01" min="0"')+field('Valuta','fr-currency-v1',r.currency||'EUR')+'<div><label class="lbl">Projekti</label><select id="fr-project-v1">'+projectOptions(r.project_id)+'</select></div>'+field('Targa e automjetit','fr-plate-v1',r.vehicle_plate||'')+field('Sasia','fr-qty-v1',r.quantity==null?'':r.quantity,'number','step="0.001" min="0"')+field('Njësia','fr-unit-v1',r.unit||'')+field('Çmimi / njësi','fr-unit-price-v1',r.unit_price==null?'':r.unit_price,'number','step="0.001" min="0"')+'</div>'
    +'<div style="margin-top:9px"><label class="lbl">Shënime</label><input id="fr-notes-v1" type="text" value=""></div><label style="display:flex;align-items:center;gap:7px;font-size:11px;margin-top:9px"><input id="fr-deductible-v1" type="checkbox" checked> Shpenzim i zbritshëm</label><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'
    +(editable?'<button class="btn btn-primary btn-sm" onclick="finReceiptConfirm()">Konfirmo dhe regjistro shpenzimin</button><button class="btn btn-sm" onclick="finReceiptRecalc()">Rillogarit TVSH</button>'+(canVision?'<button id="fin-receipt-vision-btn-v1" class="btn btn-sm" onclick="finReceiptVisionRetry()">Lexo përsëri me AI</button>':'')+'<button class="btn btn-sm" onclick="finReceiptIgnore()">Injoro</button>':'<span style="font-size:11px;color:#2E7D32;font-weight:650">Ky kupon është regjistruar te Shpenzimet operative.</span>')
    +'</div><div style="font-size:10px;color:var(--text3);margin-top:9px;line-height:1.45">PPPP mund të gabojë në lexim. Shpenzimi krijohet vetëm pasi t’i kontrollosh vlerat dhe të klikosh konfirmimin.</div></div></div></div>';
  m.style.display='block';startModalPolling(r);if(!skipAuto&&r.status==='no_text'&&canVision&&!_visionAutoTried[r.id])setTimeout(function(){runVisionFallback(r.id,false);},120);
};
window.finReceiptClose=function(){var m=byId('fin-receipt-modal-v1');if(m)m.style.display='none';stopModalPolling();_activeReceiptId=null;};
window.finReceiptRecalc=function(){var gross=num(byId('fr-amount-v1').value),rate=num(byId('fr-rate-v1').value)||0;if(gross==null)return;var netv=rate>0?gross/(1+rate/100):gross,vat=gross-netv;byId('fr-net-v1').value=netv.toFixed(2);byId('fr-vat-v1').value=vat.toFixed(2);};
window.finReceiptConfirm=async function(){
  if(!_activeReceiptId)return;var supplier=byId('fr-supplier-v1').value.trim(),date=byId('fr-date-v1').value,amount=num(byId('fr-amount-v1').value);if(!supplier||!date||amount==null||amount<=0){alert('Plotëso furnitorin, datën dhe shumën bruto.');return;}if(!confirm('Konfirmon që i ke kontrolluar të dhënat dhe dëshiron ta regjistrosh këtë shpenzim?'))return;
  var values={supplier:supplier,invoice_nr:byId('fr-invoice-v1').value.trim()||null,date:date,category:canonicalCategory(byId('fr-category-v1').value),amount:amount,net_amount:num(byId('fr-net-v1').value),vat_rate:num(byId('fr-rate-v1').value),vat_amount:num(byId('fr-vat-v1').value),currency:(byId('fr-currency-v1').value.trim()||'EUR').toUpperCase(),project_id:byId('fr-project-v1').value||null,vehicle_plate:byId('fr-plate-v1').value.trim()||null,quantity:num(byId('fr-qty-v1').value),unit:byId('fr-unit-v1').value.trim()||null,unit_price:num(byId('fr-unit-price-v1').value),notes:byId('fr-notes-v1').value.trim()||null,deductible:!!byId('fr-deductible-v1').checked};
  try{await supaFetch('rpc/pppp_confirm_expense_receipt_v1','POST',{p_receipt_id:_activeReceiptId,p_values:values});window.finReceiptClose();showMessage('Shpenzimi u regjistrua pas konfirmimit tënd.','ok');await loadRows(true);if(typeof loadExpenses==='function'){try{loadExpenses();}catch(e){}}}catch(e){alert('Regjistrimi dështoi: '+e.message);}
};
window.finReceiptIgnore=async function(){if(!_activeReceiptId||!confirm('Ta injorojmë këtë dokument pa krijuar shpenzim?'))return;try{await supaFetch('rpc/pppp_ignore_expense_receipt_v1','POST',{p_receipt_id:_activeReceiptId});window.finReceiptClose();showMessage('Dokumenti u injorua pa krijuar shpenzim.','ok');await loadRows(true);}catch(e){alert('Veprimi dështoi: '+e.message);}};

installHubHook();document.addEventListener('pst:modules-ready',function(){installHubHook();});setTimeout(installHubHook,250);
})();