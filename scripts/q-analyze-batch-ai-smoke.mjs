import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('pristeel-procurement.html','utf8');
function assert(condition,message){if(!condition)throw new Error(`Q ANALYZE BATCH AI SMOKE FAILED: ${message}`);}
function extractFunction(source,needle){
  const start=source.indexOf(needle); if(start<0)throw new Error(`Missing ${needle}`);
  const brace=source.indexOf('{',start);
  let depth=0, quote='', escaped=false, lineComment=false, blockComment=false;
  for(let i=brace;i<source.length;i++){
    const ch=source[i], nx=source[i+1]||'';
    if(lineComment){if(ch==='\n')lineComment=false;continue;}
    if(blockComment){if(ch==='*'&&nx==='/'){blockComment=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='/'&&nx==='/'){lineComment=true;i++;continue;}
    if(ch==='/'&&nx==='*'){blockComment=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'){depth--;if(depth===0)return source.slice(start,i+1);}
  }
  throw new Error(`Unclosed ${needle}`);
}

const allFn=extractFunction(html,'async function qAnalyzeAll()');
const oneFn=extractFunction(html,'async function qAnalyzeOne(');
for(const [name,fn] of [['qAnalyzeAll',allFn],['qAnalyzeOne',oneFn]]){
  assert(!fn.includes('https://api.groq.com/openai/v1/chat/completions'),`${name} still contains direct Groq endpoint.`);
  assert(!fn.includes("localStorage.getItem('pristeel_apikey')"),`${name} still reads legacy AI key directly.`);
}
assert(allFn.includes('window.PSTAI'),'qAnalyzeAll does not resolve PSTAI.');
assert(allFn.includes('ai.hasApiKey()'),'qAnalyzeAll does not check PSTAI availability.');
assert(oneFn.includes('ai.requestJson'),'qAnalyzeOne does not use PSTAI.requestJson.');

const pdfBase64=Buffer.from('synthetic-pdf').toString('base64');
const project={id:'p-1',name:'Project One',client:'Client A'};
const parsed={supplier:'Steel Supplier',fabrication_total:1200,transport_cost:200,total_weight_kg:1000,delivery_weeks:4,incoterms:'EXW',certification:'EN 10204 3.1',validity_days:30,notes:'Batch test',positions:[{desc:'Beam',qty:2,unit:'pc',unit_price:600,total:1200}]};

function makeContext({hasKey=true,requestResult=parsed,requestError=null,pdfText='Steel offer document with enough text for batch analysis.',supplierGuess='Steel Supplier',inboxRows=[]}={}){
  const alerts=[]; const requests=[]; const calls=[]; let reloadInbox=0, reloadCockpit=0; let confirmed=true;
  const button={textContent:'Analizo të gjitha'};
  const context={
    console,Uint8Array,Array,Date,Math,JSON,parseInt,parseFloat,
    document:{getElementById:(id)=>id==='q-analyze-all'?button:null},
    alert:(msg)=>alerts.push(String(msg)),
    confirm:()=>confirmed,
    atob:(value)=>Buffer.from(String(value),'base64').toString('binary'),
    pdfjsLib:{getDocument:()=>({promise:Promise.resolve({numPages:10,getPage:async()=>({getTextContent:async()=>({items:[{str:pdfText}]})})})})},
    supaFetch:async(path,method='GET',body)=>{
      calls.push({path,method,body});
      if(path.startsWith('offers_inbox?processed=eq.false'))return inboxRows;
      if(path.startsWith('projects?'))return [project];
      if(path.startsWith('offers_inbox?id=eq.')&&path.includes('select=file_base64'))return [{file_base64:pdfBase64}];
      if(path==='offers'&&method==='POST')return [{id:'offer-1'}];
      if(path.startsWith('offers_inbox?id=eq.')&&method==='PATCH')return [{}];
      return [];
    },
    qGuessProjectMatch:(subject)=>subject.includes('STRONG')?{strong:true,match:project}:{strong:false,match:null},
    qGuessSupplierName:()=>supplierGuess,
    loadQInbox:()=>{reloadInbox++;},
    loadCockpit:()=>{reloadCockpit++;},
    PSTAI:{
      hasApiKey:()=>hasKey,
      requestJson:async(options)=>{requests.push(options);if(requestError)throw requestError;return requestResult;}
    }
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(`${oneFn}\n${allFn}\nthis.__all=qAnalyzeAll;this.__one=qAnalyzeOne;`,context);
  return {context,alerts,requests,calls,button,setConfirm:(v)=>{confirmed=v;},counts:()=>({reloadInbox,reloadCockpit})};
}

// Missing-key gate remains before inbox reads.
{
  const h=makeContext({hasKey:false,inboxRows:[{id:'x',subject:'STRONG',sender:'sales@example.com'}]});
  await h.context.__all();
  assert(h.alerts[0]==='Mungon Groq API Key — Cilësimet.','batch missing-key alert changed.');
  assert(h.calls.length===0,'missing-key batch path must not read inbox.');
  assert(h.requests.length===0,'missing-key batch path must not call AI.');
}

// Empty inbox behavior remains unchanged.
{
  const h=makeContext({inboxRows:[]});
  await h.context.__all();
  assert(h.alerts.includes('Asnjë dokument i paanalizuar.'),'empty-inbox alert changed.');
  assert(h.requests.length===0,'empty inbox must not call AI.');
}

// Cancelled batch confirmation performs no writes or AI requests.
{
  const h=makeContext({inboxRows:[{id:'a',subject:'STRONG RFQ',sender:'sales@example.com'}]});
  h.setConfirm(false);
  await h.context.__all();
  assert(h.requests.length===0,'cancelled batch must not call AI.');
  assert(!h.calls.some(c=>c.path==='offers'&&c.method==='POST'),'cancelled batch must not create offers.');
}

// Full batch: only strong match auto-writes; weak match remains manual.
{
  const h=makeContext({inboxRows:[
    {id:'strong-1',subject:'STRONG RFQ 123',sender:'sales@example.com',file_name:'one.pdf'},
    {id:'weak-1',subject:'General quotation',sender:'other@example.com',file_name:'two.pdf'}
  ]});
  await h.context.__all();
  assert(h.requests.length===1,'batch should call AI only for strong project match.');
  const req=h.requests[0];
  assert(req.model==='llama-3.1-8b-instant','batch model changed.');
  assert(req.max_tokens===3000,'batch token budget changed.');
  assert(req.temperature===0,'batch temperature changed.');
  assert(req.response_format&&req.response_format.type==='json_object','batch JSON response contract missing.');
  assert(req.messages[0].content==='Steel procurement AI. Valid JSON only. Never merge line items.','batch system prompt changed.');
  assert(req.messages[1].content.includes('Steel offer document with enough text'),'batch document text missing from prompt.');
  const offer=h.calls.find(c=>c.path==='offers'&&c.method==='POST');
  assert(offer,'strong match did not create offer.');
  assert(offer.body.project_id==='p-1','batch project mapping changed.');
  assert(offer.body.supplier==='Steel Supplier','batch supplier mapping changed.');
  assert(offer.body.price_kg===1.2,'batch price/kg changed.');
  assert(offer.body.total_eur===1400,'batch total calculation changed.');
  assert(offer.body.qty_kg===1000&&offer.body.transport_eur===200,'batch weight/transport mapping changed.');
  const patch=h.calls.find(c=>c.path.startsWith('offers_inbox?id=eq.strong-1')&&c.method==='PATCH');
  assert(patch&&patch.body.processed===true&&patch.body.project_id==='p-1','batch inbox PATCH changed.');
  assert(h.alerts.some(x=>x.includes('U analizuan: 1 të regjistruara automatikisht\n1 kërkojnë zgjedhje manuale')),'batch summary counts changed.');
  assert(h.button.textContent==='Analizo të gjitha','batch button was not restored.');
  const counts=h.counts();
  assert(counts.reloadInbox===1&&counts.reloadCockpit===1,'batch final reload behavior changed.');
}

// qAnalyzeOne preconditions continue returning false without writes.
{
  const h=makeContext({supplierGuess:''});
  const done=await h.context.__one('x','Subject','sender@example.com',project,h.context.PSTAI);
  assert(done===false,'untrusted supplier should return false.');
  assert(h.requests.length===0,'untrusted supplier must not call AI.');
}

// Response-level AI failures remain soft false results for the batch; transport errors still throw to qAnalyzeAll's catch.
for(const code of ['HTTP','EMPTY','INVALID_JSON']){
  const err=new Error(`synthetic-${code}`); err.pstAiCode=code;
  const h=makeContext({requestError:err});
  const done=await h.context.__one('x','Subject','sender@example.com',project,h.context.PSTAI);
  assert(done===false,`${code} should remain a soft false batch result.`);
}
{
  const h=makeContext({requestError:new Error('network-down')});
  let threw=false;
  try{await h.context.__one('x','Subject','sender@example.com',project,h.context.PSTAI);}catch(e){threw=e.message==='network-down';}
  assert(threw,'network/untyped failure should propagate to qAnalyzeAll catch.');
}
{
  const h=makeContext({requestResult:null});
  const done=await h.context.__one('x','Subject','sender@example.com',project,h.context.PSTAI);
  assert(done===false,'non-object structured result should return false.');
  assert(!h.calls.some(c=>c.path==='offers'&&c.method==='POST'),'non-object result must not create offer.');
}

console.log('qAnalyze batch AI smoke passed');
