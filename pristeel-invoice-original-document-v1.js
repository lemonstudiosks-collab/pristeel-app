/* PRISTEEL — Invoice Original Document v1
 * Original-first viewer for incoming and outgoing invoices.
 * Never prints a synthetic metadata sheet as if it were the invoice.
 */
(function(){
'use strict';
if(window.__pstInvoiceOriginalDocumentV1)return;
window.__pstInvoiceOriginalDocumentV1=true;

var active={type:null,id:null,row:null,original:null,blobUrl:null};

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function safeHttpUrl(v){var s=String(v||'').trim();return /^https?:\/\//i.test(s)?s:'';}
function firstUrl(text){
  var all=String(text||'').match(/https?:\/\/[^\s<>"']+/ig)||[];
  all=all.map(function(x){return x.replace(/[),.;]+$/g,'');});
  return all.find(function(x){return /drive\.google\.com|\.pdf(?:$|[?#])|\.(?:png|jpe?g|webp)(?:$|[?#])/i.test(x);})||all[0]||'';
}
function driveId(url){
  var s=String(url||'');
  var m=s.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);if(m)return m[1];
  m=s.match(/[?&]id=([^&#]+)/i);return m?m[1]:'';
}
function drivePreview(url){var id=driveId(url);return id?'https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview':url;}
function dataParts(value,fallbackMime){
  var raw=String(value||'');
  var m=raw.match(/^data:([^;,]+)?;base64,(.*)$/s);
  return m?{mime:m[1]||fallbackMime||'application/pdf',base64:m[2]}:{mime:fallbackMime||'application/pdf',base64:raw};
}
function b64Blob(value,mime){
  var p=dataParts(value,mime),bin=atob(p.base64),arr=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  return new Blob([arr],{type:p.mime});
}
function isImageMime(mime,url){return /^image\//i.test(String(mime||''))||/\.(png|jpe?g|gif|webp|bmp)(?:$|[?#])/i.test(String(url||''));}

function resolveOriginal(row,type){
  row=row||{};
  if(row.file_base64){
    return {kind:'base64',name:row.file_name||((type==='out'?row.invoice_nr:row.supplier_invoice_nr)||'fatura')+'.pdf',mime:row.file_type||'application/pdf',base64:row.file_base64};
  }
  var structured=safeHttpUrl(row.attachment_url||row.file_url||'');
  if(structured){
    return {kind:'url',name:row.attachment_filename||row.file_name||'Fatura origjinale',mime:row.attachment_type||row.file_type||'',url:structured,viewerUrl:drivePreview(structured)};
  }
  var noteUrl=safeHttpUrl(firstUrl(row.notes));
  if(noteUrl){
    return {kind:'url',name:row.file_name||'Fatura origjinale',mime:row.file_type||'',url:noteUrl,viewerUrl:drivePreview(noteUrl),legacyNotesUrl:true};
  }
  return null;
}

function revokeActive(){if(active.blobUrl){try{URL.revokeObjectURL(active.blobUrl);}catch(e){}active.blobUrl=null;}}
function makeView(original){
  if(!original)return null;
  if(original.kind==='base64'){
    revokeActive();
    active.blobUrl=URL.createObjectURL(b64Blob(original.base64,original.mime));
    return {viewerUrl:active.blobUrl,openUrl:active.blobUrl,mime:original.mime};
  }
  return {viewerUrl:original.viewerUrl||original.url,openUrl:original.url,mime:original.mime};
}
function formatDate(v){if(!v)return'—';var d=new Date(String(v).slice(0,10)+'T00:00:00');return isNaN(d.getTime())?'—':d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}
function money(row,type){var x=type==='out'?(row.gross_amount||row.total_price||0):(row.gross_amount||row.amount||0);return Number(x||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(row.currency||'EUR');}
function number(row,type){return type==='out'?(row.invoice_nr||'—'):(row.supplier_invoice_nr||'—');}
function party(row,type){return type==='out'?(row.client||'—'):(row.supplier||'—');}

function addCss(){
 if(document.getElementById('pst-invoice-original-css'))return;
 var s=document.createElement('style');s.id='pst-invoice-original-css';s.textContent='\
.pst-iod-bg{position:fixed;inset:0;z-index:99998;background:rgba(24,32,36,.52);display:flex;align-items:center;justify-content:center;padding:18px}.pst-iod-modal{width:min(1180px,96vw);height:min(900px,94vh);background:#fff;border-radius:14px;box-shadow:0 22px 70px rgba(15,25,30,.28);display:flex;flex-direction:column;overflow:hidden}.pst-iod-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:14px 17px;border-bottom:1px solid #e2e8eb}.pst-iod-title{font-size:14px;font-weight:780;color:#252b2f}.pst-iod-meta{font-size:10.5px;color:#7d898f;margin-top:4px;line-height:1.45}.pst-iod-close{border:0;background:transparent;font-size:23px;color:#7d898f;cursor:pointer;line-height:1}.pst-iod-body{flex:1;min-height:0;background:#eef2f4;padding:12px}.pst-iod-frame{width:100%;height:100%;border:0;background:#fff;border-radius:8px}.pst-iod-imgwrap{width:100%;height:100%;overflow:auto;background:#fff;border-radius:8px;display:flex;justify-content:center;align-items:flex-start}.pst-iod-img{max-width:100%;height:auto;display:block}.pst-iod-missing{height:100%;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;text-align:center;padding:34px}.pst-iod-missingbox{max-width:620px}.pst-iod-missingtitle{font-size:16px;font-weight:780;color:#252b2f}.pst-iod-missingsub{font-size:12px;line-height:1.6;color:#7d898f;margin-top:8px}.pst-iod-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 15px;border-top:1px solid #e2e8eb;background:#fff;flex-wrap:wrap}.pst-iod-note{font-size:10px;color:#8b969c}.pst-iod-actions{display:flex;gap:7px;flex-wrap:wrap}.pst-iod-btn{border:1px solid #dbe4e8;background:#fff;border-radius:8px;padding:7px 11px;font-size:11px;font-weight:700;color:#536067;cursor:pointer}.pst-iod-btn.primary{background:#3f7f98;border-color:#3f7f98;color:#fff}.pst-iod-btn.success{color:#2f7657}.pst-iod-btn:hover{background:#f7fafb}.pst-iod-btn.primary:hover{background:#356f86}@media(max-width:700px){.pst-iod-bg{padding:6px}.pst-iod-modal{width:100%;height:97vh}.pst-iod-meta{font-size:9.5px}}';document.head.appendChild(s);
}
function close(){var el=document.getElementById('inv-detail-modal');if(el)el.remove();revokeActive();active={type:null,id:null,row:null,original:null,blobUrl:null};}
function render(row,type,id){
  addCss();close();
  var original=resolveOriginal(row,type);active.type=type;active.id=id;active.row=row;active.original=original;
  var view=original?makeView(original):null;
  var bg=document.createElement('div');bg.id='inv-detail-modal';bg.className='pst-iod-bg';bg.onclick=function(e){if(e.target===bg)close();};
  var title=(type==='out'?'Fatura jonë':'Fatura e furnitorit')+' · '+number(row,type);
  var meta=party(row,type)+' · '+formatDate(row.date||row.issue_date)+' · '+money(row,type)+(row.project?' · '+row.project:'');
  var body='';
  if(original){
    if(isImageMime(view.mime,view.viewerUrl))body='<div class="pst-iod-imgwrap"><img class="pst-iod-img" src="'+esc(view.viewerUrl)+'" alt="Fatura origjinale"></div>';
    else body='<iframe class="pst-iod-frame" src="'+esc(view.viewerUrl)+'" title="Fatura origjinale"></iframe>';
  }else{
    body='<div class="pst-iod-missing"><div class="pst-iod-missingbox"><div class="pst-iod-missingtitle">Origjinali i faturës nuk është ruajtur</div><div class="pst-iod-missingsub">Ky regjistrim ka vetëm të dhëna financiare në PPPP. Platforma nuk do të gjenerojë më një faqe përmbledhëse dhe ta paraqesë si faturë. Për kopje fizike / ATK bashkëngjit PDF-në ose imazhin origjinal një herë; pastaj PPPP do të hapë dhe printojë gjithmonë atë dokument.</div></div></div>';
  }
  var originalActions=original?'<button class="pst-iod-btn" onclick="pstInvoiceOpenOriginal()">Hap origjinalin</button><button class="pst-iod-btn primary" onclick="pstInvoicePrintOriginal()">Printo origjinalin</button>':'<input id="pst-iod-upload" type="file" accept="application/pdf,image/*" style="display:none" onchange="pstInvoiceAttachOriginal(this.files&&this.files[0])"><button class="pst-iod-btn primary" onclick="document.getElementById(\'pst-iod-upload\').click()">Bashkëngjit origjinalin</button>';
  var paidAction=(type==='in'&&!row.paid&&typeof window.markInvoiceInPaid==='function')?'<button class="pst-iod-btn success" onclick="pstInvoiceMarkPaidFromViewer()">Shëno Paguar</button>':'';
  bg.innerHTML='<div class="pst-iod-modal" role="dialog" aria-modal="true"><div class="pst-iod-head"><div><div class="pst-iod-title">'+esc(title)+'</div><div class="pst-iod-meta">'+esc(meta)+'</div></div><button class="pst-iod-close" aria-label="Mbyll" onclick="closeInvoiceDetail()">×</button></div><div class="pst-iod-body">'+body+'</div><div class="pst-iod-foot"><div class="pst-iod-note">'+(original?'Po shfaqet dokumenti origjinal. Printimi hap po këtë dokument, jo një summary të PPPP-së.':'Nuk ka printim derisa të ruhet dokumenti origjinal.')+'</div><div class="pst-iod-actions">'+paidAction+originalActions+'</div></div></div>';
  document.body.appendChild(bg);
}
async function fetchRow(type,id){
  if(typeof window.supaFetch!=='function')throw new Error('Databaza nuk është gati.');
  var table=type==='out'?'invoices_out':'invoices_in';
  var rows=await window.supaFetch(table+'?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');
  return Array.isArray(rows)&&rows[0]?rows[0]:null;
}
async function loadAndRender(type,id){
  try{var row=await fetchRow(type,id);if(!row){alert('Fatura nuk u gjet.');return;}render(row,type,id);}catch(e){alert('Fatura nuk u hap: '+e.message);}
}
function openOriginal(){
  if(!active.original)return;
  var view=makeView(active.original);if(!view||!view.openUrl)return;
  window.open(view.openUrl,'_blank','noopener');
}
async function printById(type,id){
  try{
    var row=(active.row&&String(active.id)===String(id)&&active.type===type)?active.row:await fetchRow(type,id);
    var original=resolveOriginal(row,type);if(!original){alert('Origjinali i faturës nuk është ruajtur. Nuk ka dokument të vlefshëm për printim.');return;}
    var prev=active.original;active.original=original;openOriginal();active.original=prev;
  }catch(e){alert('Origjinali nuk u hap për printim: '+e.message);}
}
function validOriginalFile(file){return !!file&&(/application\/pdf/i.test(file.type)||/^image\//i.test(file.type)||/\.(pdf|png|jpe?g|webp)$/i.test(file.name||''));}
async function attachOriginal(file){
  if(!file||!active.row||!active.id)return;
  if(!validOriginalFile(file)){alert('Lejohen vetëm PDF ose imazhe të faturës origjinale.');return;}
  if(file.size>12*1024*1024){alert('Skedari është më i madh se 12 MB. Ruaje/kompresoje PDF-në dhe provo përsëri.');return;}
  if(!confirm('Ta bashkëngjisim këtë dokument si origjinalin e faturës '+number(active.row,active.type)+'?'))return;
  try{
    var data=await new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){resolve(r.result);};r.onerror=function(){reject(new Error('Skedari nuk u lexua.'));};r.readAsDataURL(file);});
    var table=active.type==='out'?'invoices_out':'invoices_in';
    await window.supaFetch(table+'?id=eq.'+encodeURIComponent(active.id),'PATCH',{file_name:file.name,file_type:file.type||'application/pdf',file_base64:data});
    active.row.file_name=file.name;active.row.file_type=file.type||'application/pdf';active.row.file_base64=data;
    var row=active.row,type=active.type,id=active.id;
    render(row,type,id);
    try{if(type==='out'&&typeof window.loadInvoicesOut==='function')window.loadInvoicesOut();if(type==='in'&&typeof window.loadInvoicesIn==='function')window.loadInvoicesIn();}catch(e){}
  }catch(e){alert('Origjinali nuk u ruajt: '+e.message);}
}

window.closeInvoiceDetail=close;
window.openInvoiceDetail=function(type,id){return loadAndRender(type,id);};
window.printInvoiceDetail=function(type,id){return printById(type,id);};
window.pstInvoiceOpenOriginal=openOriginal;
window.pstInvoicePrintOriginal=function(){if(!active.original){alert('Origjinali i faturës nuk është ruajtur.');return;}openOriginal();};
window.pstInvoiceAttachOriginal=attachOriginal;
window.pstInvoiceMarkPaidFromViewer=function(){if(active.type==='in'&&active.id&&typeof window.markInvoiceInPaid==='function'){if(confirm('Ta shënojmë këtë faturë si të paguar?')){window.markInvoiceInPaid(active.id);close();}}};
window.pstInvoiceOriginalDocument={resolveOriginal:resolveOriginal,drivePreview:drivePreview,firstUrl:firstUrl,validOriginalFile:validOriginalFile};
})();
