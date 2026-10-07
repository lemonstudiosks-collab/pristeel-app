/* Runs only inside the human-opened SPIE editor. Reuses existing central UI controllers. */
import * as M from './document-models.mjs?v=20261007-models1';
const C=window.__spieDocumentContext;
if(!C||window.parent===window||C.project?.id!=='c937aea1-af5e-4807-ae1e-e36864e46794')throw new Error('SPIE_EDITOR_CONTEXT_REQUIRED');
const kinds=new Set(['offer','invoice','credit_note']);
if(!kinds.has(C.kind))throw new Error('SPIE_DOCUMENT_TYPE_INVALID');
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),el=id=>document.getElementById(id),val=id=>String(el(id)?.value||'').trim();
const notify=(type,extra={})=>parent.postMessage({channel:'spie-document-editor-v1',type,kind:C.kind,...extra},location.origin);
const number=v=>Number(v)||0;
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
function projected(expected,actual){if(Array.isArray(expected))return Array.isArray(actual)&&expected.length===actual.length&&expected.every((x,i)=>projected(x,actual[i]));if(expected&&typeof expected==='object')return actual&&Object.entries(expected).every(([k,v])=>v===undefined||projected(v,actual[k]));return expected===actual;}
let saved=null,locked=false,lastModel=null,savedModel=null;
const style=document.createElement('style');style.textContent=`
body.pst-spie-editor{min-width:0!important;background:#fff!important}body.pst-spie-editor .sidebar,body.pst-spie-editor .pst-v2-sidebar,body.pst-spie-editor .topbar,body.pst-spie-editor .pst-mobile-nav,body.pst-spie-editor #page-home,body.pst-spie-editor #pst-home-workspace,body.pst-spie-editor .pst-nav,body.pst-spie-editor .pst-v2-topbar{display:none!important}
body.pst-spie-editor .main,body.pst-spie-editor .content{margin-left:0!important;padding:12px!important;width:100%!important;max-width:none!important}
body.pst-spie-editor .page{display:none!important}body.pst-spie-editor-offer #page-oferta,body.pst-spie-editor-invoice #page-invoices{display:block!important}
body.pst-spie-editor .app-shell{display:block!important}body.pst-spie-editor .main-area{margin:0!important;width:100%!important}body.pst-spie-editor #side-panel,body.pst-spie-editor #flow-bar,body.pst-spie-editor #doc-nav-bar,body.pst-spie-editor .mobile-nav{display:none!important}
body.pst-spie-editor #page-invoices>.card,body.pst-spie-editor #ivout-file,body.pst-spie-editor #ivout-file-status{display:none!important}
body.pst-spie-editor #page-title,body.pst-spie-editor #page-sub{display:none!important}
body.pst-spie-editor #inv-view-out>div{display:block!important}body.pst-spie-editor #iv-preview{overflow-x:auto!important}body.pst-spie-editor #of-pre{overflow-x:auto!important}
body.pst-spie-document-saved #of-edit-col{display:none!important}body.pst-spie-document-saved #of-preview-col{display:block!important}
#spie-model-review{padding:12px;margin:10px;border:1px solid #ddd;background:#faf9f6;font:13px Arial,sans-serif}#spie-model-review label{display:block;margin:7px 0}#spie-model-review textarea{width:100%;min-height:62px;border:1px solid #ccc;padding:8px}#spie-model-error{color:#8d2525;white-space:pre-wrap}.pst-model{max-width:794px;margin:auto}.pst-model .model-page{min-height:1040px}body.pst-spie-editor #of-pre,body.pst-spie-editor #iv-preview{max-height:none!important;padding:0!important}body.pst-spie-editor .pst-adj-bg{position:relative!important;inset:auto!important;background:white!important;padding:0!important}body.pst-spie-editor .pst-adj-modal{max-height:none!important;width:100%!important}
@media(max-width:850px){body.pst-spie-editor #inv-view-out>div{grid-template-columns:1fr!important}.pst-model{overflow:auto}}
`;document.head.append(style);document.body.classList.add('pst-spie-editor','pst-spie-editor-'+C.kind);
const owners=['pristeel-document-center-stable-v2.js','pristeel-document-adjustments-v3.js','pristeel-commercial-document-builder-v1.js','pristeel-offer-position-preservation-v1.js','pristeel-offer-number-integrity-v1.js','pristeel-invoice-identity-v1.js','pristeel-invoice-project-link-v1.js','pristeel-document-currency-v1.js'];
for(const path of owners)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=path+'?v=20261007-models1';script.onload=resolve;script.onerror=()=>reject(new Error('EDITOR_OWNER_NOT_LOADED: '+path));document.head.append(script);});
 for(let i=0;i<100;i++){if(window.PSTCommercialDocumentBuilderV1&&typeof window.pstOpenAdjustment==='function'&&typeof window.collectOfferFormState==='function')break;await sleep(200);}
if(!window.PSTCommercialDocumentBuilderV1||typeof window.pstOpenAdjustment!=='function'){notify('error',{message:'Editorët qendrorë nuk u ngarkuan.'});throw new Error('CANONICAL_EDITORS_NOT_READY');}
window.__pstCurrentProjectId=C.project.id;window._curProjId=C.project.id;
window.__pstIntegrityLastData={project:C.project,contacts:C.contacts||[],emails:C.emails||[],ourOffers:C.offers||[]};
const review=document.createElement('section');review.id='spie-model-review';
review.innerHTML='<b>Modeli zyrtar PriSteel · projekti SPIE</b><p>Numri në parapamje është propozim nga seria qendrore; regjistrimi konfirmohet vetëm pas ruajtjes dhe verifikimit.</p>'+(C.kind==='offer'?'<details><summary>Përmbajtja e ofertës</summary><label>Përfshihet<textarea id="spie-included"></textarea></label><label>Nuk përfshihet<textarea id="spie-excluded"></textarea></label><label>Kushtet komerciale dhe teknike<textarea id="spie-terms"></textarea></label><label>Hyrja e ofertës<textarea id="spie-intro"></textarea></label><label>Shënimi i revizionit<textarea id="spie-revision"></textarea></label></details>':'')+'<label>Trajtimi i TVSH-së / baza përkatëse<textarea id="spie-tax-note" placeholder="Vendos shpjegimin e kontrolluar për këtë dokument"></textarea></label><label><input type="checkbox" id="spie-commercial-approved"> Kam kontrolluar dokumentin, çmimin, valutën, TVSH-në dhe kushtet; miratoj regjistrimin.</label><div id="spie-model-error" role="alert"></div>';
document.body.prepend(review);
document.documentElement.classList.remove('pst-first-paint');
document.documentElement.classList.remove('pst-stable-booting');
document.body.style.setProperty('visibility','visible','important');
const shell=el('app-shell-root');if(shell){shell.style.setProperty('display','block','important');shell.style.setProperty('visibility','visible','important');}
for(const node of document.querySelectorAll('#app-sidebar,.sidebar,#side-panel,.side-panel,.topbar,.floating-tools,.float-dock,.right-dock,#flow-bar,#doc-nav-bar'))node.style.setProperty('display','none','important');
for(const node of document.querySelectorAll('.main,.main-area,.content')){node.style.setProperty('margin-left','0','important');node.style.setProperty('width','100%','important');node.style.setProperty('max-width','none','important');}
function fail(error){el('spie-model-error').textContent=error.message||String(error);notify('error',{message:el('spie-model-error').textContent});}
function company(){const x=typeof settings!=='undefined'?settings:{};return {company:x.company||'PRISTEEL Sh.p.k.',companyAddress:x.address||'',businessNr:x.taxNr||'',companyEmail:x.email||'',signature:[x.contact,x.title,x.company,x.email].filter(Boolean).join('\n'),logo:typeof LOGO_BASE64!=='undefined'?LOGO_BASE64:''};}
function offerData(){
 const x=company(),currency=val('pst-of-currency')||'EUR';
 let items=typeof oferPos!=='undefined'?oferPos:[];
 if(!items.length){const kg=number(val('of-kg'));items=[{desc:'Material',qty:kg,unit:'kg',price:number(val('of-pr'))}];if(number(val('of-zn')))items.push({desc:'Galvanisierung',qty:kg,unit:'kg',price:number(val('of-zn'))});if(number(val('of-tr')))items.push({desc:'Transport',qty:1,unit:'ls',price:number(val('of-tr'))});}
 return {...x,lang:val('of-lang')||'de',nr:val('of-nr'),date:val('of-date'),project:val('of-proj'),ref:val('of-ref'),client:val('of-cli'),contact:val('of-con'),email:val('of-em'),address:val('of-adr'),currency,items:items.map((p,i)=>({position:p.position||i+1,desc:p.desc,qty:p.unit==='ls'?1:p.qty,unit:p.unit,price:p.price})),incoterms:val('of-inc'),location:val('of-loc'),validity:val('of-val'),delivery:val('of-del'),notes:val('of-not'),certificate:val('of-cer'),signature:x.signature,payment:typeof buildPayPlan==='function'&&typeof payPlanText==='function'?payPlanText(buildPayPlan(),val('of-lang')):'',included:val('spie-included'),excluded:val('spie-excluded'),terms:val('spie-terms'),intro:val('spie-intro'),revision:val('spie-revision'),taxNote:val('spie-tax-note'),taxConfirmed:el('spie-commercial-approved').checked,finalized:!!saved};
}
function invoiceData(){
 const items=typeof invoiceItems!=='undefined'?invoiceItems:[],extra=typeof extraCostsOut!=='undefined'?extraCostsOut:[];
 const material=items.reduce((s,x)=>s+number(x.kg)*number(x.priceKg),0),transport=number(val('iv-transport'));
 const vatRate=val('iv-vat')==='1'?number(val('iv-vat-rate')):0,override=number(val('iv-total-override'));
 const net=override?override/(1+vatRate/100):material+transport+extra.reduce((s,x)=>s+number(x.amount),0),vat=net*vatRate/100;
 const x=typeof settings!=='undefined'?settings:{};
 const invoiceType=val('iv-type')||'standard',documentTitle=typeof INVOICE_TYPE_TITLES!=='undefined'?INVOICE_TYPE_TITLES[invoiceType]?.[val('iv-lang')||'de']:'';
 const b=typeof PST_BANK!=='undefined'?PST_BANK:{};
 const bank=[['Account holder',b.holder||x.company],['Address',b.holderAddr||x.address],['IBAN',x.iban||b.iban],['Bank',x.bankName||b.bank],['Bank address',b.bankAddr],['SWIFT / BIC',x.swift||b.swift],['Correspondent bank',b.corr],['Correspondent SWIFT',b.corrSwift],['Currency',b.cur]].filter(r=>r[1]);
 return {...company(),documentTitle,invoiceType,lang:val('iv-lang')||'de',nr:val('iv-nr'),date:val('iv-date'),project:val('iv-proj'),ref:val('iv-ref'),client:val('iv-cli'),contact:val('iv-con'),email:val('iv-em'),address:val('iv-adr'),currency:val('pst-iv-currency')||'EUR',items:items.map(x=>({desc:x.desc,qty:x.kg,unit:'kg',price:x.priceKg,amount:number(x.kg)*number(x.priceKg)})).concat(transport?[{desc:'Transport',qty:1,unit:'pauschal',price:transport,amount:transport}]:[]).concat(extra.map(x=>({desc:x.desc||x.description,qty:1,unit:'pauschal',price:x.amount,amount:x.amount}))),net,vat,gross:net+vat,vatRate,incoterms:val('iv-inc'),location:val('iv-loc'),payment:val('iv-pay'),notes:val('iv-not'),certificate:val('iv-cer'),signature:company().signature,taxNote:val('spie-tax-note'),bank,finalized:!!saved};
}
function creditData(r){const original=(window.PST_DOC_CENTER?.invoices||[]).find(x=>String(x.id)===String(r.original_invoice_id));return {...company(),lang:original?.lang||'de',nr:r.document_nr,date:r.document_date,project:r.project,client:r.client,address:r.address,contact:r.contact,currency:r.currency,originalNr:r.original_invoice_nr,reason:r.reason_text,items:r.items||[],net:r.net_amount,vat:r.vat_amount,gross:r.gross_amount,vatRate:r.vat_rate,taxNote:val('spie-tax-note'),finalized:!!saved};}
function render(){
for(const node of document.querySelectorAll('#app-sidebar,.sidebar,#side-panel,.side-panel,.topbar,.floating-tools,.float-dock,.right-dock,#flow-bar,#doc-nav-bar'))node.style.setProperty('display','none','important');
for(const node of document.querySelectorAll('.main,.content')){node.style.setProperty('margin-left','0','important');node.style.setProperty('padding-left','12px','important');node.style.setProperty('width','100%','important');}
 if(saved&&savedModel){lastModel={...savedModel,finalized:true};const target=C.kind==='offer'?el('of-pre'):C.kind==='invoice'?el('iv-preview'):document.querySelector('.pst-adj-body');if(target)target.innerHTML=C.kind==='offer'?M.offer(lastModel):C.kind==='invoice'?M.invoice(lastModel):M.creditNote(lastModel);return lastModel;}
 if(C.kind==='offer'){lastModel=offerData();if(el('of-pre'))el('of-pre').innerHTML=M.offer(lastModel);}
 if(C.kind==='invoice'){lastModel=invoiceData();if(el('iv-preview'))el('iv-preview').innerHTML=M.invoice(lastModel);}
 if(C.kind==='credit_note'&&saved){lastModel=creditData(saved);const box=document.querySelector('.pst-adj-body');if(box)box.innerHTML=M.creditNote(lastModel);}
 return lastModel;
}
for(const name of ['genOfer','genInvoiceOut']){const old=window[name];window[name]=function(...args){const r=old?.apply(this,args);render();return r;};}
const oldCollect=window.collectOfferFormState;window.collectOfferFormState=function(...args){const r=oldCollect.apply(this,args);r.pristeel_model={version:M.MODEL_VERSION,source_file_id:M.MODEL_SOURCES.offer,...offerData()};return r;};
const originalFetch=window.supaFetch;
window.supaFetch=async function(path,method,body){
 const verb=String(method||'GET').toUpperCase(),table=String(path).split('?')[0];
 if(verb==='PATCH'&&table==='documents_registry'&&saved&&new URLSearchParams(String(path).split('?')[1]).get('doc_nr')==='eq.'+(saved.doc_nr||saved.invoice_nr)&&Object.keys(body||{}).every(k=>['series','year','seq','currency','exchange_rate_to_eur','total_amount','total_eur'].includes(k)))return [saved];
 if(verb==='GET'&&['invoices_out','commercial_adjustments','documents_registry'].includes(table)&&!String(path).includes('project_id=')&&!/select=invoice_nr(?:%2C|,|&)|select=doc_nr(?:%2C|,)series(?:%2C|,)year(?:&|$)|series=eq\.[^&]+&year=eq\.|doc_nr=eq\.|invoice_nr=eq\.|document_type=eq\.[^&]+&year=eq\./.test(path))path+=String(path).includes('?')?'&project_id=eq.'+C.project.id:'?project_id=eq.'+C.project.id;
 if(verb!=='GET'){
  if(!['invoices_out','commercial_adjustments','documents_registry'].includes(table)||verb!=='POST')throw new Error('Ky editor krijon vetëm dokumente të reja. Revizioni nuk ndryshon dokumentin origjinal.');
  if(!el('spie-commercial-approved').checked||!val('spie-tax-note'))throw new Error('Kontrollo TVSH-në dhe mirato dokumentin përpara regjistrimit.');
  if(locked)throw new Error('Ruajtja është në proces.');
  const rows=Array.isArray(body)?body:[body];
  for(const r of rows){if(r.project_id&&String(r.project_id)!==C.project.id)throw new Error('Dokumenti i përket një projekti tjetër.');r.project_id=C.project.id;r.project=C.project.name;}
  if(rows.length!==1)throw new Error('Regjistro një dokument në çdo veprim.');
  const nr=rows[0].invoice_nr||rows[0].document_nr||rows[0].doc_nr;
  if('seq' in rows[0])rows[0].seq=Number(String(nr||'').split('-').pop());
  if(!nr)throw new Error('Mungon numri qendror i dokumentit.');
  const nrField=table==='invoices_out'?'invoice_nr':table==='commercial_adjustments'?'document_nr':'doc_nr';
  locked=true;notify('busy');
  try{
  const session=JSON.parse(localStorage.getItem('pristeel_session')||'null');
  if(!session?.access_token)throw new Error('SESSION_REQUIRED');
  const claims=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  const roles=await originalFetch('user_roles?user_id=eq.'+encodeURIComponent(claims.sub)+'&select=role&limit=1');
  if(!['admin','sales','procurement','finance'].includes(roles?.[0]?.role))throw new Error('Roli i kësaj llogarie nuk lejon regjistrimin e dokumenteve.');
  if(saved)throw new Error('Dokumenti është regjistruar. Për revizion krijo një dokument të ri.');
  const model=JSON.parse(JSON.stringify(C.kind==='offer'?offerData():C.kind==='invoice'?invoiceData():creditData(rows[0])));
  if(!rows[0].client||!rows[0].project||!String(rows[0].date||rows[0].document_date||model.date||''))throw new Error('Plotëso klientin, projektin dhe datën.');
  if(!String(rows[0].address||model.address||'').trim())throw new Error('Plotëso dhe kontrollo adresën e blerësit përpara regjistrimit.');
  const duplicate=await originalFetch(table+'?'+nrField+'=eq.'+encodeURIComponent(nr)+'&select=id,project_id&limit=1');
  if(duplicate?.length)throw new Error('Ky numër është regjistruar tashmë. Krijo numër të ri dhe kontrollo sërish parapamjen.');
  if(table==='commercial_adjustments'){
   const original=(window.PST_DOC_CENTER?.invoices||[]).find(x=>String(x.id)===String(rows[0].original_invoice_id));
   if(!original||String(original.project_id)!==C.project.id||original.currency!==rows[0].currency)throw new Error('Fatura origjinale ose valuta nuk përputhet me projektin.');
   const prior=await originalFetch('commercial_adjustments?original_invoice_id=eq.'+encodeURIComponent(original.id)+'&project_id=eq.'+C.project.id+'&select=gross_amount,document_type,status&limit=1000');
   if(prior.length===1000)throw new Error('Bilanci i notave kërkon kontroll në regjistrin qendror.');
   const balance=number(original.gross_amount??original.total_price)+prior.filter(r=>r.status!=='cancelled').reduce((s,r)=>s+(r.document_type==='credit_note'?-1:1)*number(r.gross_amount),0);
   if(!(number(rows[0].gross_amount)>0)||number(rows[0].gross_amount)>balance+.005)throw new Error('Nota kreditore tejkalon bilancin e faturës pas notave të mëparshme.');
   rows[0].notes=JSON.stringify({pristeel_model:{version:M.MODEL_VERSION,source_file_id:M.MODEL_SOURCES.credit_note,...model}});
  }
  if(table==='invoices_out'){
   const represented=model.items.reduce((s,x)=>s+number(x.amount),0);
   if(Math.abs(represented-model.net)>.011)throw new Error('Totali i faturës ndryshon nga pozicionet. Për këtë pilot, përputh pozicionet dhe totalin përpara regjistrimit.');
   if(Math.abs(number(rows[0].net_amount)-model.net)>.011||Math.abs(number(rows[0].gross_amount)-model.gross)>.011)throw new Error('Parapamja dhe shumat për regjistrim nuk përputhen.');
   rows[0].currency=model.currency;
   rows[0].notes=JSON.stringify({text:String(rows[0].notes||''),pristeel_model:{version:M.MODEL_VERSION,source_file_id:M.MODEL_SOURCES.invoice,...model}});
  }
  if(table==='documents_registry'){
   const total=model.items.reduce((s,x)=>s+number(x.qty)*number(x.price),0),rate=number(val('pst-of-fx'))||1;
   rows[0].currency=model.currency;rows[0].total_amount=total;rows[0].exchange_rate_to_eur=rate;rows[0].total_eur=total*rate;
   if(model.currency!=='EUR'&&!number(val('pst-of-fx')))throw new Error('Konfirmo kursin e këmbimit për valutën e ofertës.');
   rows[0].offer_state.pristeel_model={version:M.MODEL_VERSION,source_file_id:M.MODEL_SOURCES.offer,...model};
  }
   const gate=window.__pstSpieEditorSafety;
   if(!gate)throw new Error('Kontrolli i ruajtjes së editorit mungon.');
   gate.ticket={table,nr};
   const expected=JSON.parse(JSON.stringify(rows[0]));
   let result;
   try{result=await originalFetch(path,method,body);}finally{gate.ticket=null;}
   const id=result?.[0]?.id;
   if(!id)throw new Error('Ruajtja nuk ktheu identitetin e dokumentit; kontrollo regjistrin përpara çdo riprovimi.');
   const check=await originalFetch(table+'?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');
   if(check?.length!==1||String(check[0].project_id)!==C.project.id||check[0][nrField]!==nr)throw new Error('Ruajtja nuk u verifikua. Mos e dërgo dokumentin.');
   for(const key of ['currency','net_amount','vat_amount','gross_amount','total_amount'])if(rows[0][key]!=null&&String(check[0][key])!==String(rows[0][key]))throw new Error('Fusha '+key+' nuk u verifikua në regjistrin qendror.');
   for(const key of ['items','offer_state','notes'])if(expected[key]!=null&&!projected(expected[key],check[0][key]))throw new Error('Përmbajtja '+key+' nuk u verifikua.');
   saved=check[0];savedModel=model;render();document.body.classList.add('pst-spie-document-saved');
   review.querySelectorAll('input,select,textarea').forEach(x=>x.disabled=true);
   document.querySelectorAll('#page-oferta input,#page-oferta select,#page-oferta textarea,#page-invoices input,#page-invoices select,#page-invoices textarea').forEach(x=>x.disabled=true);
   document.querySelectorAll('#page-invoices .card').forEach(x=>{if(!x.contains(el('iv-preview')))x.style.setProperty('display','none','important');});
   document.querySelectorAll('[onclick*="saveOfferState"],[onclick*="saveInvoiceOut"],[onclick*="ofBackToEdit"]').forEach(x=>x.disabled=true);
   notify('saved',{id,table,nr});return result;
  }catch(e){fail(e);throw e;}finally{locked=false;notify('idle');}
 }
 return originalFetch(path,method,body);
};
window.autoLinkInvoiceToFinance=function(){throw new Error('Regjistrimi bëhet vetëm nga veprimi Mirato dhe ruaj.');};
window.printOfer=function(){render();notify('pdf');};
window.printInvoiceOut=function(){render();notify('pdf');};
window.pstPrintAdjustment=function(){render();notify('pdf');};
const oldDetail=window.pstOpenAdjustmentDetail;window.pstOpenAdjustmentDetail=function(r){oldDetail(r);if(r.document_type==='credit_note'&&saved?.id===r.id)render();};
const oldSaveInv=window.saveInvoiceOut;window.saveInvoiceOut=function(...args){if(!el('spie-commercial-approved').checked||!val('spie-tax-note')){fail(new Error('Kontrollo TVSH-në dhe mirato dokumentin.'));return;}return oldSaveInv.apply(this,args);};
if(C.kind==='credit_note'){await window.pstOpenAdjustment('credit_note','');}
else{
 window.PSTCommercialDocumentBuilderV1.fresh(C.kind,'production');await sleep(250);
 const prefix=C.kind==='offer'?'of':'iv';
 for(const [key,value] of Object.entries({proj:C.project.name,ref:C.project.ref,cli:C.project.client,date:new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Budapest'}),lang:'de'})){if(el(prefix+'-'+key))el(prefix+'-'+key).value=value||'';}
 const select=el('iv-proj-select');if(select){select.innerHTML='<option value="'+C.project.id+'">'+M.esc(C.project.name)+'</option>';select.value=C.project.id;select.disabled=true;}
 if(el(prefix+'-proj'))el(prefix+'-proj').readOnly=true;
 if(C.kind==='offer'&&typeof window.fillOfferNr==='function')await window.fillOfferNr(true);
 if(C.kind==='invoice'&&window.PSTInvoiceIdentityV1)await window.PSTInvoiceIdentityV1.fillInvoiceNr();
}
for(const name of ['saveOfferState','saveInvoiceOut','pstSaveAdjustment']){document.querySelectorAll('[onclick*="'+name+'"]').forEach(b=>b.textContent='Mirato dhe ruaj në PPPP');}
window.PSTSpieDocumentHost={render,getModel:()=>lastModel,getSaved:()=>saved,getPreview:()=>C.kind==='offer'?el('of-pre'):C.kind==='invoice'?el('iv-preview'):document.querySelector('.pst-adj-body')};
function dirty(){if(saved){saved=null;savedModel=null;el('spie-commercial-approved').checked=false;notify('dirty');}}
review.addEventListener('input',dirty);
document.addEventListener('input',e=>{if(e.target.closest('#page-oferta,#page-invoices'))dirty();});
notify('ready');
