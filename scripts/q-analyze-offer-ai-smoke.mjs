import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('pristeel-procurement.html','utf8');
function assert(condition,message){if(!condition)throw new Error(`Q ANALYZE OFFER AI SMOKE FAILED: ${message}`);}
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

const fn=extractFunction(html,'async function qAnalyzeOffer(');
assert(!fn.includes('https://api.groq.com/openai/v1/chat/completions'),'qAnalyzeOffer still contains direct Groq endpoint.');
assert(!fn.includes("localStorage.getItem('pristeel_apikey')"),'qAnalyzeOffer still reads the legacy AI key directly.');
assert(fn.includes('window.PSTAI'),'qAnalyzeOffer does not resolve PSTAI.');
assert(fn.includes('ai.hasApiKey()'),'qAnalyzeOffer does not check PSTAI availability.');
assert(fn.includes('ai.requestJson'),'qAnalyzeOffer does not use PSTAI.requestJson.');

const pdfBase64=Buffer.from('synthetic-pdf').toString('base64');
const defaultParsed={
  supplier:'AI Supplier',fabrication_total:1200,transport_cost:200,total_weight_kg:1000,
  price_per_kg:1.2,price_currency:'EUR',delivery_weeks:4,incoterms:'EXW',
  incoterms_location:'Prishtina',certification:'EN 10204 3.1',validity_days:30,
  notes:'Test note',confidence:'high',positions:[{desc:'Beam',qty:2,unit:'pc',unit_price:600,total:1200}]
};

async function runScenario({hasKey=true,requestResult=defaultParsed,requestError=null,promptValue='1',projects=[{id:'p-1',name:'Project One',client:'Client A'}],pdfText='Steel offer document with sufficient text for analysis.',inboxRow={file_base64:pdfBase64,file_name:'offer.pdf'}}={}){
  const alerts=[]; const requests=[]; const calls=[]; let inboxLoads=0;
  const button={textContent:'Analizo',disabled:false};
  const context={
    console,Uint8Array,Array,Date,Math,JSON,parseInt,parseFloat,
    event:{target:button},
    alert:(msg)=>alerts.push(String(msg)),
    prompt:()=>promptValue,
    atob:(value)=>Buffer.from(String(value),'base64').toString('binary'),
    pdfjsLib:{getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[{str:pdfText}]})})})})},
    supaFetch:async(path,method='GET',body)=>{
      calls.push({path,method,body});
      if(path.startsWith('offers_inbox?id=eq.')&&path.includes('select=file_base64'))return inboxRow?[inboxRow]:[];
      if(path.startsWith('projects?'))return projects;
      if(path==='offers'&&method==='POST')return [{id:'offer-1'}];
      if(path.startsWith('offers_inbox?id=eq.')&&method==='PATCH')return [{}];
      return [];
    },
    qGuessProjectMatch:()=>({match:projects[0]||null}),
    qGuessSupplierName:()=> 'Supplier Guess',
    loadQInbox:()=>{inboxLoads++;},
    PSTAI:{
      hasApiKey:()=>hasKey,
      requestJson:async(options)=>{requests.push(options);if(requestError)throw requestError;return requestResult;}
    }
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(`${fn}\nthis.__run=qAnalyzeOffer;`,context);
  await context.__run('inbox-1','Offer subject','sales@example.com');
  return {alerts,requests,calls,button,inboxLoads};
}

const missing=await runScenario({hasKey:false});
assert(missing.alerts[0]==='Mungon Groq API Key — shko te Cilësimet fillimisht.','missing-key alert changed.');
assert(missing.requests.length===0,'missing-key path must not request AI.');

const success=await runScenario();
assert(success.requests.length===1,'success path should make one AI request.');
const req=success.requests[0];
assert(req.model==='llama-3.1-8b-instant','model changed.');
assert(req.max_tokens===3000,'token budget changed.');
assert(req.temperature===0,'temperature changed.');
assert(req.response_format&&req.response_format.type==='json_object','JSON response contract missing.');
assert(Array.isArray(req.messages)&&req.messages.length===2,'message structure changed.');
assert(req.messages[0].content==='You are a steel procurement AI. Respond with valid JSON only. Never merge or average line items.','system prompt changed.');
assert(req.messages[1].content.includes('Steel offer document with sufficient text'),'document text missing from AI prompt.');
const offerCall=success.calls.find(c=>c.path==='offers'&&c.method==='POST');
assert(!!offerCall,'success path did not persist supplier offer.');
assert(offerCall.body.project_id==='p-1','project link changed.');
assert(offerCall.body.supplier==='AI Supplier','supplier mapping changed.');
assert(offerCall.body.price_kg===1.2,'price/kg calculation changed.');
assert(offerCall.body.total_eur===1400,'offer total calculation changed.');
assert(offerCall.body.qty_kg===1000,'weight mapping changed.');
assert(offerCall.body.transport_eur===200,'transport mapping changed.');
assert(Array.isArray(offerCall.body.positions)&&offerCall.body.positions.length===1,'positions mapping changed.');
const patchCall=success.calls.find(c=>c.path.startsWith('offers_inbox?id=eq.inbox-1')&&c.method==='PATCH');
assert(patchCall&&patchCall.body.processed===true&&patchCall.body.project_id==='p-1','inbox processed/project update changed.');
assert(success.inboxLoads===1,'success path should reload inbox once.');
assert(success.button.textContent==='Analizo'&&success.button.disabled===false,'button was not restored after success.');
assert(success.alerts.some(x=>x.includes('U regjistrua te projekti "Project One"')),'success alert changed.');

const noFile=await runScenario({inboxRow:null});
assert(noFile.alerts.includes('Nuk u gjet file-i i bashkangjitur.'),'missing-file alert changed.');
assert(noFile.requests.length===0,'missing-file path must not request AI.');
assert(noFile.button.textContent==='Analizo'&&!noFile.button.disabled,'button was not restored after missing file.');

const cancelled=await runScenario({promptValue:null});
assert(cancelled.requests.length===0,'cancelled project selection must not request AI.');
assert(cancelled.button.textContent==='Analizo'&&!cancelled.button.disabled,'button was not restored after project-selection cancel.');

const err=new Error('synthetic-ai-error');
const failed=await runScenario({requestError:err});
assert(failed.alerts.includes('Gabim gjatë analizës: synthetic-ai-error'),'AI failure no longer reaches existing outer error alert.');
assert(!failed.calls.some(c=>c.path==='offers'&&c.method==='POST'),'failed AI request must not create offer.');
assert(failed.button.textContent==='Analizo'&&!failed.button.disabled,'button was not restored after AI failure.');

const nullResult=await runScenario({requestResult:null});
assert(nullResult.alerts.some(x=>x.startsWith('Gabim gjatë analizës: ')),'null structured result should follow legacy outer-error behavior.');
assert(!nullResult.calls.some(c=>c.path==='offers'&&c.method==='POST'),'null structured result must not create offer.');

console.log('qAnalyzeOffer AI smoke passed');
