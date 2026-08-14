const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://example.test/',runScripts:'outside-only'});
const {window}=dom;
let writes=0;
let opened=[];
window.alert=()=>{};
window.confirm=()=>false;
window.open=(url)=>{opened.push(String(url));return {};};
window.URL.createObjectURL=()=> 'blob:https://example.test/original-invoice';
window.URL.revokeObjectURL=()=>{};
window.markInvoiceInPaid=()=>{throw new Error('payment write must not run while merely viewing');};

const rows={
  eurosteel:{
    id:'eurosteel',supplier:'Eurosteel Sh.p.k',supplier_invoice_nr:'035/2026',date:'2026-08-03',amount:2500,currency:'EUR',paid:false,
    project:'EVOSYS Laser — ANF-8915 (POROSI E KONFIRMUAR)',file_name:'',file_type:'',file_base64:'',
    notes:'Importuar manualisht. PDF në Drive: https://drive.google.com/file/d/1M6EDierf7ZsTVTXQYz83_tl-8f9E9nzF/view?usp=drivesdk'
  },
  outgoingUrl:{id:'out-url',invoice_nr:'PR-2026-0099',date:'2026-08-10',client:'Client GmbH',total_price:1000,currency:'EUR',attachment_url:'https://files.example.test/PR-2026-0099.pdf',attachment_type:'application/pdf'},
  outgoingMissing:{id:'out-missing',invoice_nr:'PR-2026-0001',date:'2026-06-25',client:'Evosys Laser GmbH',total_price:65702,currency:'EUR',notes:'financial metadata only'},
  incomingBase64:{id:'in-base64',supplier:'Steel Supplier',supplier_invoice_nr:'SUP-10',date:'2026-08-12',amount:1200,currency:'EUR',file_name:'SUP-10.pdf',file_type:'application/pdf',file_base64:'JVBERi0xLjQK'}
};
window.supaFetch=async function(path,method){
  if(method&&method!=='GET')writes++;
  if(path.startsWith('invoices_in?id=eq.eurosteel'))return [rows.eurosteel];
  if(path.startsWith('invoices_in?id=eq.in-base64'))return [rows.incomingBase64];
  if(path.startsWith('invoices_out?id=eq.out-url'))return [rows.outgoingUrl];
  if(path.startsWith('invoices_out?id=eq.out-missing'))return [rows.outgoingMissing];
  return [];
};

const code=fs.readFileSync('pristeel-invoice-original-document-v1.js','utf8');
vm.runInContext(code,dom.getInternalVMContext());

(async()=>{
  assert.strictEqual(typeof window.openInvoiceDetail,'function');
  assert.strictEqual(typeof window.printInvoiceDetail,'function');
  assert.ok(window.pstInvoiceOriginalDocument,'testable original resolver must be exposed');

  const resolved=window.pstInvoiceOriginalDocument.resolveOriginal(rows.eurosteel,'in');
  assert.ok(resolved,'Drive URL embedded in notes must count as original');
  assert.strictEqual(resolved.viewerUrl,'https://drive.google.com/file/d/1M6EDierf7ZsTVTXQYz83_tl-8f9E9nzF/preview');

  await window.openInvoiceDetail('in','eurosteel');
  let modal=window.document.getElementById('inv-detail-modal');
  assert.ok(modal,'invoice viewer modal should open');
  assert.ok(modal.textContent.includes('Fatura e furnitorit · 035/2026'));
  assert.ok(modal.textContent.includes('Printo origjinalin'));
  assert.ok(!modal.textContent.includes('Pa skedar bashkangjitur'),'legacy false missing-file message must disappear');
  const frame=modal.querySelector('iframe');
  assert.ok(frame,'Drive original must render as document viewer');
  assert.ok(frame.src.includes('/1M6EDierf7ZsTVTXQYz83_tl-8f9E9nzF/preview'));
  assert.strictEqual(writes,0,'opening an invoice must be read-only');

  opened=[];
  await window.printInvoiceDetail('in','eurosteel');
  assert.strictEqual(opened.length,1,'print action must open exactly one original document');
  assert.ok(opened[0].includes('drive.google.com/file/d/1M6EDierf7ZsTVTXQYz83_tl-8f9E9nzF/view'));
  assert.strictEqual(writes,0,'printing an invoice must not write to database');

  await window.openInvoiceDetail('out','out-url');
  modal=window.document.getElementById('inv-detail-modal');
  assert.ok(modal.querySelector('iframe').src.includes('PR-2026-0099.pdf'),'structured outgoing attachment must be displayed');
  assert.ok(modal.textContent.includes('Printo origjinalin'));

  await window.openInvoiceDetail('out','out-missing');
  modal=window.document.getElementById('inv-detail-modal');
  assert.ok(modal.textContent.includes('Origjinali i faturës nuk është ruajtur'));
  assert.ok(modal.textContent.includes('Bashkëngjit origjinalin'),'missing historical originals must be remediable explicitly');
  assert.ok(!modal.textContent.includes('Printo origjinalin'),'do not offer synthetic print when no original exists');
  assert.ok(!modal.querySelector('iframe'),'no fake invoice document may be generated');
  assert.strictEqual(writes,0,'showing the upload option must remain read-only until user explicitly confirms a file');

  assert.strictEqual(window.pstInvoiceOriginalDocument.validOriginalFile({name:'invoice.pdf',type:'application/pdf'}),true);
  assert.strictEqual(window.pstInvoiceOriginalDocument.validOriginalFile({name:'invoice.jpg',type:'image/jpeg'}),true);
  assert.strictEqual(window.pstInvoiceOriginalDocument.validOriginalFile({name:'invoice.txt',type:'text/plain'}),false);

  const b64=window.pstInvoiceOriginalDocument.resolveOriginal(rows.incomingBase64,'in');
  assert.strictEqual(b64.kind,'base64');
  assert.strictEqual(b64.mime,'application/pdf');
  assert.strictEqual(writes,0);
  console.log('Invoice original document smoke: OK');
})().catch(err=>{console.error(err);process.exitCode=1;});
