/* Project-local entry into the existing canonical PriSteel editors. */
import * as D from './data.mjs?v=20261008-documents1';
import * as B from './bridge.mjs?v=20261008-documents1';
import * as M from './document-models.mjs?v=20261008-documents1';
const {esc}=M;
let dialog=null,frame=null,context=null,saved=null,busy=false,draftIdentity=null,composeToken='',editorOwner='',composeParentToken='';
function sessionOwner(){try{const s=D.session();return s?JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub||'':'';}catch{return '';}}
function checkOwner(){if(!editorOwner||sessionOwner()!==editorOwner)throw new Error('Sesioni ndryshoi. Mbyll editorin dhe rihap projektin.');}
const title={offer:'Ofertë PriSteel',invoice:'Faturë PriSteel',credit_note:'Notë kreditore PriSteel'};
function error(message){if(dialog)dialog.querySelector('[data-doc-status]').textContent=message;}
let savedHost=null,pdfEnginePromise=null;
function host(){return frame?.contentWindow?.PSTSpieDocumentHost||savedHost;}
export function recordAction(table,id){return `<button class="btn" data-open-saved="${esc(id)}" data-record-table="${esc(table)}">Hap dokumentin / PDF / email</button>`;}
function parsed(value){if(value&&typeof value==='object')return value;try{return JSON.parse(value||'{}');}catch{return {};}}
export async function openSaved(table,id,c){
 if(dialog){dialog.focus();return;}
 const kind=({documents_registry:'offer',invoices_out:'invoice',commercial_adjustments:'credit_note'})[table];if(!kind||!id)throw new Error('Dokumenti nuk u identifikua.');
 if(!(await D.ensureSession()))throw new Error('SESSION_REQUIRED');editorOwner=sessionOwner();
 const rows=await D.read(table+'?'+new URLSearchParams({id:'eq.'+id,project_id:'eq.'+D.PROJECT_ID,select:'*',limit:'1'}));checkOwner();
 if(rows?.length!==1||rows[0].project_id!==D.PROJECT_ID)throw new Error('Dokumenti nuk i përket SPIE.');
 const row=rows[0],model=(kind==='offer'?parsed(row.offer_state):parsed(row.notes)).pristeel_model,nr=row.doc_nr||row.invoice_nr||row.document_nr;
 if(!model||model.version!==M.MODEL_VERSION||model.nr!==nr||model.currency!==row.currency)throw new Error('Ky dokument nuk ka modelin e ruajtur dhe të verifikuar. Hap burimin origjinal.');
 const expected=kind==='offer'?model.items.reduce((total,x)=>total+Number(x.qty||0)*Number(x.price||0),0):Number(model.gross);if(!Number.isFinite(expected)||Math.abs(expected-Number(kind==='offer'?row.total_amount:row.gross_amount))>.011)throw new Error('Shuma e modelit nuk përputhet me regjistrin.');
 context=c;frame=null;draftIdentity=null;composeToken='';composeParentToken='';busy=false;saved={id,table,nr};
 dialog=document.createElement('dialog');dialog.className='commercial-document-editor';dialog.innerHTML=`<div class="document-editor-head"><h2>${esc(nr)}</h2><button class="btn" data-doc-close>Mbyll</button></div><p data-doc-status role="status">Dokumenti u lexua dhe u verifikua nga regjistri i SPIE.</p><div class="document-editor-actions"><button class="btn" data-doc-pdf>PDF</button><button class="btn" data-doc-email>Krijo draft emaili</button></div><div class="document-compose" hidden></div><div data-document-preview></div>`;
 const preview=dialog.querySelector('[data-document-preview]');preview.innerHTML=(kind==='offer'?M.offer:kind==='invoice'?M.invoice:M.creditNote)({...model,finalized:true});savedHost={render(){},getPreview:()=>preview,getModel:()=>model};
 document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-doc-close]').onclick=safeClose;dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});dialog.onclose=()=>{dialog.remove();dialog=null;context=null;saved=null;savedHost=null;busy=false;};
 dialog.querySelector('[data-doc-pdf]').onclick=()=>downloadPdf().catch(e=>error(e.message));dialog.querySelector('[data-doc-email]').onclick=showComposer;
}
async function pdfEngine(w){if(typeof w.html2pdf==='function')return;if(w!==window)throw new Error('Motori ekzistues PDF nuk u ngarkua.');if(!pdfEnginePromise)pdfEnginePromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';script.onload=resolve;script.onerror=()=>reject(new Error('Motori PDF nuk u ngarkua.'));document.head.append(script);}).catch(e=>{pdfEnginePromise=null;throw e;});await pdfEnginePromise;if(typeof w.html2pdf!=='function')throw new Error('Motori PDF nuk u ngarkua.');}
function attachHost(kind,c){
 const w=frame.contentWindow;
 if(w.__spieDocumentHostStarting)return;
 if(!D.session()){error('Sesioni PPPP nuk është aktiv. Hyr sërish në PPPP.');return;}
 w.__spieDocumentHostStarting=true;
 w.__spieDocumentContext={kind,project:c.data.project,contacts:c.data.contacts||c.contacts||[],emails:c.bundle?.emails?.rows||c.data.recent_emails||[],offers:c.bundle?.clients?.rows||[]};
 const script=w.document.createElement('script');script.type='module';script.src='spie/editor-host.mjs?v=20261008-documents1';script.onerror=()=>error('Editorët nuk u ngarkuan.');w.document.head.append(script);
}
function safeClose(){if(busy){error('Prit përfundimin e veprimit.');return;}dialog?.close();}
export function actions(kind){return `<button class="btn" data-create-document="${esc(kind)}">Krijo ${kind==='offer'?'ofertë':kind==='invoice'?'faturë':'notë kreditore'}</button>`;}
export async function open(kind,c){
 if(!title[kind])throw new Error('Lloji i dokumentit nuk mbështetet.');
 if(dialog){dialog.focus();return;}
 if(!(await D.ensureSession()))throw new Error('SESSION_REQUIRED');
 context=c;saved=null;draftIdentity=null;composeToken='';composeParentToken='';editorOwner=sessionOwner();
 const session=D.session()?.access_token;
 dialog=document.createElement('dialog');dialog.className='commercial-document-editor';
 dialog.innerHTML=`<div class="document-editor-head"><h2>${title[kind]}</h2><button class="btn" data-doc-close>Mbyll</button></div><p data-doc-status role="status">Duke hapur editorin qendror për këtë projekt…</p><div class="document-editor-actions"><button class="btn" data-doc-pdf disabled>PDF</button><button class="btn" data-doc-email disabled>Krijo draft emaili</button></div><div class="document-compose" hidden></div><iframe title="${title[kind]} · SPIE" class="document-editor-frame"></iframe>`;
 document.body.append(dialog);dialog.showModal();frame=dialog.querySelector('iframe');
 const currentFrame=frame;frame.src='../pristeel-procurement.html?spieEditor='+encodeURIComponent(kind)+'&v=20261008-documents1';
 frame.onload=()=>{
  if(frame!==currentFrame)return;
  if(D.session()?.access_token!==session){error('Sesioni ndryshoi gjatë hapjes. Hyr sërish në PPPP.');return;}
  attachHost(kind,c);
 };
 dialog.querySelector('[data-doc-close]').onclick=safeClose;
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 dialog.addEventListener('close',()=>{const changed=!!saved;dialog.remove();dialog=null;frame=null;context=null;saved=null;busy=false;if(changed)document.dispatchEvent(new CustomEvent('spie:document-closed'));});
 dialog.querySelector('[data-doc-pdf]').onclick=()=>downloadPdf().catch(e=>error(e.message));
 dialog.querySelector('[data-doc-email]').onclick=()=>showComposer();
}
window.addEventListener('message',event=>{
 if(!dialog||event.origin!==location.origin||event.source!==frame?.contentWindow||event.data?.channel!=='spie-document-editor-v1')return;
 const data=event.data;
 if(data.type==='request-context')attachHost(data.kind,context);
 if(data.type==='busy')busy=true;
 if(data.type==='idle')busy=false;
 if(data.type==='ready')error('Editorët dhe modeli zyrtar janë gati.');
 if(data.type==='error')error(data.message);
 if(data.type==='saved'){
  saved=data;error('Regjistruar në PPPP dhe verifikuar: '+data.nr);
  dialog.querySelectorAll('[data-doc-pdf],[data-doc-email]').forEach(b=>b.disabled=false);
  document.dispatchEvent(new CustomEvent('spie:document-saved',{detail:data}));
 }
 if(data.type==='dirty'){saved=null;draftIdentity=null;dialog.querySelectorAll('[data-doc-pdf],[data-doc-email]').forEach(b=>b.disabled=true);error('Dokumenti ka ndryshime të paruajtura.');}
 if(data.type==='pdf')downloadPdf().catch(e=>error(e.message));
});
async function pdf(){
 checkOwner();
 if(!saved||!host())throw new Error('Mirato dhe ruaj dokumentin përpara PDF-së ose draftit.');
 const w=frame?.contentWindow||window;host().render();
 const preview=host().getPreview();if(!preview?.querySelector('.pst-model'))throw new Error('Parapamja zyrtare nuk është gati.');
 await pdfEngine(w);
 const node=w.document.createElement('div');node.style.cssText='position:absolute;left:-10000px;top:0;width:794px;background:white';node.innerHTML=preview.innerHTML;node.querySelectorAll('.foot span:last-child').forEach(x=>x.remove());w.document.body.append(node);
 try{const worker=w.html2pdf().set({margin:[5,5,8,5],image:{type:'jpeg',quality:.98},html2canvas:{scale:1.5,useCORS:true,logging:false},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(node).toPdf();const document=await worker.get('pdf'),pages=document.internal.getNumberOfPages();document.setFontSize(7);document.setTextColor(120);for(let i=1;i<=pages;i++){document.setPage(i);document.text(i+' / '+pages,document.internal.pageSize.getWidth()-8,document.internal.pageSize.getHeight()-4,{align:'right'});}return await worker.outputPdf('blob');}finally{node.remove();}
}
async function downloadPdf(){busy=true;try{const blob=await pdf(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=saved.nr+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}finally{busy=false;}}
function showComposer(){
 if(!saved)return;
 const box=dialog.querySelector('.document-compose'),model=host().getModel();
 const mails=context.data.recent_emails||context.data.emails||context.bundle?.emails?.rows||[],threads=[...new Map(mails.filter(m=>m.project_id===D.PROJECT_ID||!m.project_id).filter(m=>/^[a-f0-9]+$/i.test(m.gmail_thread_id||'')).map(m=>[m.gmail_thread_id,m])).values()];
 const files=(context.files||[]).filter(f=>!f.link_conflict&&(f.gmail_attachment_id&&f.gmail_message_id||f.drive_file_id));
 box.hidden=false;
 box.innerHTML=`<form><h3>Draft Gmail · ${esc(saved.nr)}</h3><label>Marrësi<input name="to" type="email" required value="${esc(model.email||'')}"></label><label>Subjekti<input name="subject" required value="${esc(saved.nr+' · '+context.data.project.name)}"></label><label>Biseda Gmail<select name="thread"><option value="">Email i ri</option>${threads.map(m=>`<option value="${esc(m.gmail_thread_id)}">${esc(m.subject)}</option>`).join('')}</select></label><label>Teksti<textarea name="body" required rows="5"></textarea></label><details><summary>Bashkëngjit skedarë shtesë nga projekti</summary><p>PDF-ja e dokumentit bashkëngjitet automatikisht.</p>${files.map((f,i)=>`<label><input type="checkbox" name="attachment" value="${i}">${esc(f.title)}</label>`).join('')}</details><p data-compose-error role="alert"></p><button class="btn" type="submit">Krijo draft në Gmail</button></form>`;
 box.querySelector('textarea[name=body]').value=model.signature?'\n\n'+model.signature:'';
 box.querySelector('form').onsubmit=async event=>{
  event.preventDefault();if(busy)return;
  const form=event.currentTarget,values=new FormData(form),button=form.querySelector('[type=submit]');
  if(draftIdentity){error('Drafti është krijuar tashmë: '+draftIdentity.id);return;}
  if(B.pendingCommand()){form.querySelector('[data-compose-error]').textContent='Verifiko komandën në pritje te projekti përpara draftit të ri.';return;}
  busy=true;button.disabled=true;
  try{
   checkOwner();
   const token=await authorizeDraft(),attachments=[{name:saved.nr+'.pdf',mime:'application/pdf',bytes:new Uint8Array(await (await pdf()).arrayBuffer())}];
   for(const i of values.getAll('attachment'))attachments.push(await projectAttachment(files[Number(i)],token));
   if(attachments.reduce((n,a)=>n+a.bytes.length,0)>18000000)throw new Error('Bashkëngjitjet tejkalojnë kufirin praktik të draftit (18 MB).');
   const selected=threads.find(m=>m.gmail_thread_id===values.get('thread'));
   let replyTo='',subject=values.get('subject');if(selected){
    const readToken=D.googleSession()?.token;
    if(!readToken)throw new Error('Lidh Gmail për të verifikuar bisedën ekzistuese.');
    const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(selected.gmail_message_id)+'?format=metadata&metadataHeaders=Message-ID&metadataHeaders=Subject',{headers:{Authorization:'Bearer '+readToken}});
    if(!r.ok)throw new Error('Biseda Gmail nuk u verifikua.');const message=await r.json();
    if(message.threadId!==selected.gmail_thread_id)throw new Error('Identiteti i bisedës nuk përputhet.');
    replyTo=(message.payload?.headers||[]).find(h=>h.name.toLowerCase()==='message-id')?.value||'';
    const originalSubject=(message.payload?.headers||[]).find(h=>h.name.toLowerCase()==='subject')?.value;
    if(!originalSubject)throw new Error('Subjekti origjinal i bisedës mungon.');
    subject=/^re:/i.test(originalSubject)?originalSubject:'Re: '+originalSubject;
    if(!replyTo||/[\r\n]/.test(replyTo))throw new Error('Mungon identiteti i mesazhit për përgjigje.');
   }
   const mime=makeMime({to:values.get('to'),subject,body:values.get('body'),replyTo,attachments});
   const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({message:{raw:base64(new TextEncoder().encode(mime)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),...(selected?{threadId:selected.gmail_thread_id}:{})}})});
   if(!response.ok)throw new Error('Gmail '+response.status+': drafti nuk u konfirmua.');
   const draft=await response.json();draftIdentity=draft;
   const receipt=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts/'+encodeURIComponent(draft.id)+'?format=full',{headers:{Authorization:'Bearer '+token}});
   if(!receipt.ok)throw new Error('Drafti u krijua, por verifikimi nuk përfundoi. Mos krijo draft të dytë.');
   const verified=await receipt.json();if(verified.id!==draft.id||verified.message?.id!==draft.message?.id||(selected&&verified.message?.threadId!==selected.gmail_thread_id))throw new Error('Identiteti i draftit ose bisedës nuk u verifikua.');
   verifyDraftAttachments(verified.message,attachments);
   error('Drafti u krijua dhe u verifikua me PDF-në dhe '+(attachments.length-1)+' skedarë shtesë. Nuk është dërguar.');
   const a=document.createElement('a');a.className='evidence-link';a.target='_blank';a.rel='noopener';a.href='https://mail.google.com/mail/u/0/#drafts/'+encodeURIComponent(draft.message?.id||'');a.textContent='Hap draftin';box.append(a);
   try{const command=await B.submitDocumentReceipt({document_id:saved.id,document_nr:saved.nr,document_type:saved.table==='documents_registry'?'offer':saved.table==='invoices_out'?'invoice':'credit_note',gmail_draft_id:draft.id,gmail_message_id:draft.message?.id,gmail_thread_id:draft.message?.threadId,attachments:attachments.map(a=>({name:a.name,mime:a.mime,size:a.bytes.length}))},true);error('Drafti Gmail u verifikua. Regjistrimi në projekt është në pritje: '+command.id);document.dispatchEvent(new CustomEvent('spie:document-saved'));}
   catch(e){error('Drafti Gmail ekziston. Regjistrimi në projekt kërkon verifikim: '+e.message);}
  }catch(e){form.querySelector('[data-compose-error]').textContent=e.message;}finally{busy=false;button.disabled=!!draftIdentity;}
 };
}
function storedScopes(){return localStorage.getItem('pst_google_workspace_scopes_v2')||sessionStorage.getItem('pst_google_workspace_scopes_v2')||'';}
async function authorizeDraft(){
 checkOwner();const shared=D.googleSession();
 if(shared&&/gmail\.(compose|modify)|https:\/\/mail.google.com\//.test(storedScopes()))return shared.token;
 if(composeToken&&composeParentToken===(shared?.token||''))return composeToken;
 const w=frame?.contentWindow||window,clientId=localStorage.getItem('pristeel_gclient');
 if(!clientId||!w.google?.accounts?.oauth2)throw new Error('Lidh Gmail te PPPP për krijimin e draftit.');
 composeToken=await new Promise((resolve,reject)=>{const client=w.google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/gmail.compose',callback:r=>r.error?reject(new Error(r.error)):resolve(r.access_token),error_callback:()=>reject(new Error('Autorizimi Gmail nuk përfundoi.'))});client.requestAccessToken();});composeParentToken=shared?.token||'';checkOwner();return composeToken;
}
function base64(bytes){let result='';for(let i=0;i<bytes.length;i+=32768)result+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(result);}
export function verifyDraftAttachments(message,expected){const found=[];function walk(p){if(p?.filename)found.push({name:p.filename,mime:p.mimeType,size:Number(p.body?.size)});for(const x of p?.parts||[])walk(x);}walk(message?.payload);const key=x=>JSON.stringify([x.name,x.mime,x.size??x.bytes?.length]);if(JSON.stringify(found.map(key).sort())!==JSON.stringify(expected.map(key).sort()))throw new Error('Bashkëngjitjet e draftit nuk u verifikuan; mos krijo draft të dytë.');}
export function makeMime({to,subject,body,replyTo='',attachments=[]}){
 if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(to)||/[\r\n]/.test(subject)||/[\r\n]/.test(replyTo))throw new Error('Marrësi ose titulli është i pavlefshëm.');
 const boundary='pst_'+crypto.randomUUID(),encoded=s=>'=?UTF-8?B?'+base64(new TextEncoder().encode(s))+'?=';
 let out=`To: ${to}\r\nSubject: ${encoded(subject)}\r\nMIME-Version: 1.0\r\n`+(replyTo?`In-Reply-To: ${replyTo}\r\nReferences: ${replyTo}\r\n`:'')+`Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64(new TextEncoder().encode(body)).match(/.{1,76}/g)?.join('\r\n')||''}\r\n`;
 for(const a of attachments){const name=String(a.name).replace(/["\r\n\\]/g,'_'),mime=/^[\w.+-]+\/[\w.+-]+$/.test(a.mime)?a.mime:'application/octet-stream';out+=`--${boundary}\r\nContent-Type: ${mime}\r\nContent-Disposition: attachment; filename="${name}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64(a.bytes).match(/.{1,76}/g)?.join('\r\n')||''}\r\n`;}
 return out+`--${boundary}--\r\n`;
}
async function projectAttachment(file,compose){
 if(!file)throw new Error('Skedari i zgjedhur nuk ekziston.');const google=D.googleSession();if(!google)throw new Error('Lidh Gmail/Drive për skedarët e projektit.');
 let bytes,mime=file.attachment_mime_type||'application/octet-stream';
 if(file.gmail_attachment_id&&file.gmail_message_id){const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(file.gmail_message_id)+'/attachments/'+encodeURIComponent(file.gmail_attachment_id),{headers:{Authorization:'Bearer '+google.token}});if(!response.ok)throw new Error('Bashkëngjitja Gmail nuk u hap.');const x=await response.json(),s=String(x.data||'').replace(/-/g,'+').replace(/_/g,'/');bytes=Uint8Array.from(atob(s.padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));}
 else{if(!file.drive_file_id||file.link_conflict)throw new Error('Identiteti Drive nuk është i verifikuar.');const response=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(file.drive_file_id)+'?alt=media',{headers:{Authorization:'Bearer '+google.token}});if(!response.ok)throw new Error('Skedari Drive nuk u hap.');mime=response.headers.get('content-type')||mime;bytes=new Uint8Array(await response.arrayBuffer());}
 if(bytes.length>18000000)throw new Error('Skedari tejkalon 18 MB.');mime=String(mime).split(';')[0].trim().toLowerCase();if(!/^[\w.+-]+\/[\w.+-]+$/.test(mime))mime='application/octet-stream';return {name:file.title,mime,bytes};
}
