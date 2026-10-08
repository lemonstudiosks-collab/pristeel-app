/* On-demand, session-bound evidence reader. No ingestion and no persistent document copies. */
import * as D from './data.mjs?v=20261008-compact1';
import {parser,worksheetRows,tableHtml} from './tracker.mjs?v=20261008-compact1';
const MAX=10*1024*1024,esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function decodeBody(payload){
 const parts=[];function walk(p){if(!p?.filename&&p?.mimeType==='text/plain'&&p.body?.data){const raw=p.body.data.replace(/-/g,'+').replace(/_/g,'/');parts.push(new TextDecoder().decode(Uint8Array.from(atob(raw.padEnd(Math.ceil(raw.length/4)*4,'=')),c=>c.charCodeAt(0))));}for(const child of p?.parts||[])walk(child);}walk(payload);
 return parts.join('\n\n').slice(0,100000);
}
async function bounded(response,max){
 const reader=response.body?.getReader();if(!reader){const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>max)throw Error('Skedari �sht� i madh; p�rdor burimin Drive.');return bytes;}
 const chunks=[];let length=0;try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>max)throw Error('Skedari tejkalon 10 MB; p�rdor burimin Drive.');chunks.push(value);}}catch(e){await reader.cancel();throw e;}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
async function request(url,kind='gmail',max=MAX){
 const session=D.session(),google=D.googleSession(kind);if(!session||!google)throw Error('Lidh '+(kind==='gmail'?'Gmail':'Drive')+' n� PPPP p�r k�t� dokument.');
 const response=await fetch(url,{method:'GET',cache:'no-store',headers:{Authorization:'Bearer '+google.token},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Burimi nuk u hap ('+response.status+').');
 const bytes=await bounded(response,max);
 if(D.session()?.access_token!==session.access_token||D.googleSession(kind)?.token!==google.token)throw Error('SESSION_CHANGED');
 return {bytes,mime:(response.headers.get('content-type')||'').split(';')[0]};
}
let active=null;
function open(title){
 if(active){active.focus();return null;}
 const dialog=document.createElement('dialog');dialog.className='evidence-reader';dialog.innerHTML='<div class="document-editor-head"><h2>'+esc(title)+'</h2><button class="btn" data-close>Mbyll</button></div><div class="evidence-body" aria-busy="true">Duke lexuar burimin.</div>';
 document.body.append(dialog);active=dialog;dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{for(const url of dialog.urls||[])URL.revokeObjectURL(url);dialog.remove();if(active===dialog)active=null;});return dialog;
}
export async function email(row){
 if(!row?.gmail_message_id)throw Error('Emaili nuk u identifikua.');
 const dialog=open(row.subject||'Email');if(!dialog)return;const body=dialog.querySelector('.evidence-body'),identity=D.session()?.access_token;
 try{
  let text=row.body_full||row.body_excerpt||'',full=!!row.body_full;
  if(!text&&D.googleSession()){
   const result=await request('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(row.gmail_message_id)+'?format=full','gmail',2*MAX),message=JSON.parse(new TextDecoder().decode(result.bytes));
   if(message.id!==row.gmail_message_id||message.threadId!==row.gmail_thread_id)throw Error('Identiteti i emailit nuk p�rputhet.');
   text=decodeBody(message.payload);full=!!text;
  }
  if(D.session()?.access_token!==identity)throw Error('SESSION_CHANGED');
  if(!dialog.open)return;
  body.innerHTML='<div class="email-meta">'+esc(row.from_name||row.from_email)+' � '+esc(new Date(row.sent_at).toLocaleString('sq-AL',{timeZone:'Europe/Budapest'}))+'</div>'+(row.body_excerpt&&!full?'<p class="notice">Tekst i verifikuar i mesazhit; historia e cituar nuk p�rfshihet. Origjinali ruhet n� Gmail.</p>':!full?'<p class="notice">Paraqitet p�rmbledhja e ruajtur. Teksti i plot� k�rkon lidhjen Gmail dhe format tekst.</p>':'')+'<pre class="email-text">'+esc(text||row.snippet||'Emaili nuk ka tekst t� lexuesh�m.')+'</pre>';
 }catch(e){if(dialog.open)body.textContent=e.message;}finally{body.setAttribute('aria-busy','false');}
}
function drivePreview(body,file){
 if(!/^[\w-]+$/.test(file.drive_file_id||''))throw Error('Mungon lidhja e verifikuar Drive p�r k�t� skedar.');
 body.innerHTML='<p class="provenance">Parapamje nga Drive; skedari q�ndron n� dosjen e projektit.</p><iframe title="Dokumenti n� Drive" class="evidence-frame" src="https://drive.google.com/file/d/'+encodeURIComponent(file.drive_file_id)+'/preview" allow="fullscreen"></iframe>';
}
export function fileAccess(file){
 if(file?.link_conflict)return 'conflict';
 const drive=/^[\w-]+$/.test(file?.drive_file_id||''),gmail=!!(file?.gmail_attachment_id&&(file?.gmail_message_id||file?.mail?.gmail_message_id));
 const large=Number(file?.size||file?.attachment_size_bytes)>MAX;
 if(drive&&(large||!D.googleSession(gmail?'gmail':'drive')))return 'drive_preview';
 if(gmail&&!D.googleSession('gmail'))return 'connect_gmail';
 if(gmail&&large)return 'large_gmail';
 return gmail||drive?'read':'missing';
}
export function fileMime(file){
 const known=file.attachment_mime_type||file.mimeType||'';
 if(known&&known!=='application/octet-stream')return known;
 const extension=String(file.title||file.file_name||'').split('.').pop().toLowerCase();
 return ({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',txt:'text/plain',csv:'text/plain',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',xls:'application/vnd.ms-excel'})[extension]||known;
}
async function spreadsheet(body,bytes,identity){
 const X=await parser(),book=X.read(bytes,{type:'array',cellFormula:false,cellStyles:false,cellHTML:false,bookVBA:false});
 if(D.session()?.access_token!==identity)throw Error('SESSION_CHANGED');
 let selected=0,page=0;
 const render=()=>{
  const name=book.SheetNames[selected],rows=worksheetRows(X,book.Sheets[name]),pages=Math.max(1,Math.ceil(rows.length/150));page=Math.min(page,pages-1);
  body.innerHTML='<label class="provenance">Fleta <select data-evidence-sheet>'+book.SheetNames.map((n,i)=>'<option value="'+i+'" '+(i===selected?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label><p class="provenance">Vlerat e ruajtura n� Excel � formulat nuk rillogariten � '+rows.length+' rreshta</p><div class="table-wrap evidence-sheet">'+tableHtml(rows.slice(page*150,(page+1)*150))+'</div><div class="document-actions"><button class="btn" data-sheet-prev '+(!page?'disabled':'')+'>M� par�</button><span class="provenance">'+(page+1)+' / '+pages+'</span><button class="btn" data-sheet-next '+(page+1>=pages?'disabled':'')+'>M� tej</button></div>';
  body.querySelector('[data-evidence-sheet]').onchange=e=>{selected=Number(e.target.value);page=0;render();};body.querySelector('[data-sheet-prev]').onclick=()=>{page--;render();};body.querySelector('[data-sheet-next]').onclick=()=>{page++;render();};
 };render();
}
export async function file(file){
 if(!file||file.link_conflict)throw Error('Dokumenti nuk ka identitet t� verifikuar.');
 if(!D.session())throw Error('SESSION_REQUIRED: Hyr n� PPPP p�r t� hapur dokumentin.');
 file={...file,gmail_message_id:file.gmail_message_id||file.mail?.gmail_message_id};
 const dialog=open(file.title||file.file_name||'Dokument');if(!dialog)return;const body=dialog.querySelector('.evidence-body'),identity=D.session()?.access_token;
 try{
  const access=fileAccess(file);
  if(access==='drive_preview'){drivePreview(body,file);return;}
  if(access==='connect_gmail'){body.innerHTML='<div class="evidence-connect"><p>Ky dokument �sht� bashk�ngjitje Gmail. Lidhja Google n� PPPP �sht� joaktive.</p><p class="muted">Pas rilidhjes, rihape k�tu; skedar�t e vegj�l lexohen brenda modulit.</p><a class="btn" href="../pristeel-procurement.html">Lidh Google n� PPPP</a></div>';return;}
  if(access==='large_gmail'){body.innerHTML='<p>Ky skedar tejkalon 10 MB dhe nuk ka kopje t� verifikuar n� Drive.</p><p class="muted">Hape bashk�ngjitjen n� burimin Gmail.</p>';const url=D.safeLink(file.gmail_url||file.source_url,'gmail');if(url)body.innerHTML+='<a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">Hap Gmail</a>';return;}
  if(access==='missing')throw Error('Dokumenti nuk ka identitet Gmail ose Drive t� verifikuar.');
  let bytes,mime=fileMime(file);
  if(file.gmail_message_id&&file.gmail_attachment_id){
   const result=await request('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(file.gmail_message_id)+'/attachments/'+encodeURIComponent(file.gmail_attachment_id),'gmail',Math.ceil(MAX*1.4));
   const attachment=JSON.parse(new TextDecoder().decode(result.bytes));if(Number(attachment.size)>MAX)throw Error('Skedari tejkalon 10 MB.');
   const raw=String(attachment.data||'').replace(/-/g,'+').replace(/_/g,'/');bytes=Uint8Array.from(atob(raw.padEnd(Math.ceil(raw.length/4)*4,'=')),c=>c.charCodeAt(0));
  }else{
   if(!/^[\w-]+$/.test(file.drive_file_id||''))throw Error('Mungon identiteti Drive.');
   const metadata=JSON.parse(new TextDecoder().decode((await request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(file.drive_file_id)+'?fields=id,name,mimeType,size','drive',20000)).bytes));
   if(metadata.id!==file.drive_file_id||metadata.name.normalize('NFC')!==String(file.title||file.file_name).normalize('NFC'))throw Error('Identiteti i dokumentit n� Drive nuk p�rputhet.');
   if(Number(metadata.size)>MAX){drivePreview(body,file);return;}mime=metadata.mimeType;
   if(!/^(application\/pdf|image\/(png|jpeg|gif|webp)|text\/plain|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel)$/.test(mime)){drivePreview(body,file);return;}
   bytes=(await request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(file.drive_file_id)+'?alt=media','drive')).bytes;
  }
  if(bytes.length>MAX)throw Error('Skedari tejkalon 10 MB.');
  if(!dialog.open)return;
  if(/(?:spreadsheetml|ms-excel)/.test(mime)){await spreadsheet(body,bytes,identity);return;}
  if(mime==='text/plain'){body.innerHTML='<pre class="email-text">'+esc(new TextDecoder().decode(bytes))+'</pre>';return;}
  const url=URL.createObjectURL(new Blob([bytes],{type:mime||'application/octet-stream'}));dialog.urls=[url];
  if(mime==='application/pdf')body.innerHTML='<iframe title="PDF" class="evidence-frame" src="'+url+'"></iframe>';
  else if(/^image\/(png|jpeg|gif|webp)$/.test(mime))body.innerHTML='<img class="evidence-image" alt="'+esc(file.title)+'" src="'+url+'">';
  else if(file.drive_file_id)drivePreview(body,file);
  else body.innerHTML='<p>Ky format nuk ka parapamje n� shfletues. Skedari mund t� shkarkohet drejtp�rdrejt k�tu.</p><a class="btn" href="'+url+'" download="'+esc(file.title||'Dokument')+'">Shkarko dokumentin</a>';
 }catch(e){if(dialog.open)body.textContent=e.message;}finally{body.setAttribute('aria-busy','false');}
}
