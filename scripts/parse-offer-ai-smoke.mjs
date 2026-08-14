import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition,message){if(!condition)throw new Error(`PARSE OFFER AI SMOKE FAILED: ${message}`);}

function extractFunction(source,needle){
  const start=source.indexOf(needle);if(start<0)throw new Error(`Missing ${needle}`);
  const brace=source.indexOf('{',start);let depth=0,quote='',escaped=false,lineComment=false,blockComment=false,end=-1;
  for(let i=brace;i<source.length;i++){
    const ch=source[i],nx=source[i+1]||'';
    if(lineComment){if(ch==='\n')lineComment=false;continue;}
    if(blockComment){if(ch==='*'&&nx==='/'){blockComment=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='/'&&nx==='/'){lineComment=true;i++;continue;}
    if(ch==='/'&&nx==='*'){blockComment=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
  }
  if(end<0)throw new Error(`Unclosed ${needle}`);
  return source.slice(start,end);
}

const html=fs.readFileSync('pristeel-procurement.html','utf8');
const fnSource=extractFunction(html,'async function parseOffer()');
assert(!fnSource.includes('api.groq.com/openai/v1/chat/completions'),'direct Groq endpoint remains in parseOffer.');
assert(!fnSource.includes('pristeel_apikey'),'direct legacy AI key remains in parseOffer.');
assert(fnSource.includes("Mungon API Key — shko te Cilësimet."),'missing-key message changed.');
assert(fnSource.includes("⚠ Nuk u lexua saktë — provo të ngjitësh tekstin manualisht."),'response-failure warning changed.');
assert(fnSource.includes("document.getElementById('pdf-status').textContent='Gabim: '+err.message"),'outer error status changed.');

function makeElement(value=''){
  const classes=new Set();
  return {
    value,
    textContent:'',
    style:{width:'',borderColor:''},
    classList:{
      add(name){classes.add(name);},
      remove(name){classes.delete(name);},
      contains(name){return classes.has(name);}
    }
  };
}

async function runScenario({text='Supplier quotation text with steel items',supplier='Supplier A',cat='fabrication',hasKey=true,requestImpl,projectId=null}){
  const elements={
    'pdf-text':makeElement(text),
    'pdf-supplier':makeElement(supplier),
    'pdf-cat':makeElement(cat),
    'pdf-parsing':makeElement(),
    'pdf-prog':makeElement(),
    'pdf-status':makeElement(),
    'pdf-drop':makeElement(),
    'pdf-dz-title':makeElement('Tërhiq ofertën PDF këtu ose kliko')
  };
  const alerts=[];
  const offers=[];
  const requests=[];
  const renders=[];
  const cloud=[];
  const timers=[];
  const ai={
    hasApiKey(){return hasKey;},
    async requestJson(options){requests.push(options);return requestImpl?requestImpl(options):{};}
  };
  const context={
    console,
    window:{PSTAI:ai},
    document:{getElementById(id){if(!elements[id])elements[id]=makeElement();return elements[id];}},
    alert(message){alerts.push(String(message));},
    offers,
    _curProjId:projectId,
    supaFetch(...args){cloud.push(args);return Promise.resolve({});},
    renderOffers(){renders.push(true);},
    setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},
    Date
  };
  vm.createContext(context);
  vm.runInContext(fnSource,context,{filename:'parseOffer-inline.js'});
  await context.parseOffer();
  return {elements,alerts,offers,requests,renders,cloud,timers};
}

let result=await runScenario({text:'abc',requestImpl(){throw new Error('AI must not run');}});
assert(result.alerts[0]==='Ngjit tekstin e ofertës ose ngarko skedar PDF/TXT.','short-text validation changed.');
assert(result.requests.length===0,'short-text validation should prevent AI request.');

result=await runScenario({supplier:'',requestImpl(){throw new Error('AI must not run');}});
assert(result.alerts[0]==='Shkruaj emrin e furnitorit.','supplier validation changed.');
assert(result.requests.length===0,'missing supplier should prevent AI request.');

result=await runScenario({hasKey:false});
assert(result.requests.length===0,'missing AI route should not issue a request.');
assert(result.elements['pdf-status'].textContent==='Mungon API Key — shko te Cilësimet.','missing-key status changed.');

const payload={
  supplier:'Parsed Supplier',
  offer_ref:'Q-42',
  contact_person:'Jane Doe',
  fabrication_total:1000,
  transport_cost:200,
  total_weight_kg:500,
  price_per_kg:2,
  price_currency:'EUR',
  delivery_weeks:5,
  delivery_terms:'5 weeks',
  incoterms:'FCA',
  incoterms_location:'Skopje',
  certification:'EN 10204 3.1',
  material_standard:'EN 10025',
  steel_grades:'S355JR',
  validity_days:30,
  payment_terms:'30% advance, 70% before loading',
  inclusions:['galvanizing'],
  exclusions:['installation'],
  notes:'test note',
  confidence:'high',
  positions:[{desc:'HEA 300',qty:500,unit:'kg',unit_price:2,total:1000}]
};
result=await runScenario({requestImpl:async()=>payload});
assert(result.requests.length===1,'successful parseOffer should issue exactly one AI request.');
const req=result.requests[0];
assert(req.model==='llama-3.1-8b-instant','parseOffer model changed.');
assert(req.max_tokens===3000,'parseOffer token budget changed.');
assert(req.temperature===0,'parseOffer temperature changed.');
assert(req.response_format&&req.response_format.type==='json_object','parseOffer structured response request missing.');
assert(Array.isArray(req.messages)&&req.messages.length===2,'parseOffer message count changed.');
assert(req.messages[0].content==='You are a steel procurement AI. Respond with valid JSON only. Never merge or average line items.','parseOffer system prompt changed.');
assert(req.messages[1].content.includes('Supplier: Supplier A'),'parseOffer prompt lost supplier context.');
assert(result.offers.length===1,'successful parseOffer did not append one offer.');
assert(result.offers[0].supplier==='Parsed Supplier','parsed supplier was not preserved.');
assert(result.offers[0].priceKg===2,'price/kg calculation changed.');
assert(result.offers[0].totalEur===1200,'grand total calculation changed.');
assert(result.offers[0].inco==='FCA','incoterms mapping changed.');
assert(result.offers[0].positions===undefined,'local offer shape unexpectedly gained positions field.');
assert(result.renders.length===1,'successful parseOffer did not render offers once.');
assert(result.cloud.length===0,'no-project scenario should not persist to cloud.');
assert(result.elements['pdf-status'].textContent.includes('projekti s\'është ruajtur në cloud'),'no-project success warning changed.');
assert(result.timers.length===1&&result.timers[0].ms===2000,'post-success reset timer changed.');

result=await runScenario({projectId:'project-1',requestImpl:async()=>payload});
assert(result.cloud.length===1,'saved-project scenario did not persist the parsed offer.');
assert(result.cloud[0][0]==='offers'&&result.cloud[0][1]==='POST','offer persistence route changed.');
assert(result.cloud[0][2].project_id==='project-1','offer persistence project id changed.');
assert(Array.isArray(result.cloud[0][2].positions)&&result.cloud[0][2].positions.length===1,'parsed positions were not persisted.');

for(const code of ['HTTP','EMPTY','INVALID_JSON']){
  result=await runScenario({requestImpl:async()=>{const e=new Error(`synthetic-${code}`);e.pstAiCode=code;throw e;}});
  assert(result.offers.length===0,`${code} response failure should not append an offer.`);
  assert(result.renders.length===0,`${code} response failure should not render offers.`);
  assert(result.elements['pdf-status'].textContent==='⚠ Nuk u lexua saktë — provo të ngjitësh tekstin manualisht.',`${code} response warning changed.`);
}

result=await runScenario({requestImpl:async()=>null});
assert(result.offers.length===0,'null structured result should not append an offer.');
assert(result.elements['pdf-status'].textContent==='⚠ Nuk u lexua saktë — provo të ngjitësh tekstin manualisht.','null structured result should use the existing parse warning.');

result=await runScenario({requestImpl:async()=>{throw new Error('synthetic-network-error');}});
assert(result.offers.length===0,'network failure should not append an offer.');
assert(result.elements['pdf-status'].textContent==='Gabim: synthetic-network-error','network failure no longer reaches outer error status.');

console.log('PPPP parseOffer AI smoke');
console.log('Input validation and missing-key UI: OK');
console.log('Explicit request contract and offer mapping: OK');
console.log('Cloud persistence branch: OK');
console.log('HTTP/EMPTY/INVALID_JSON response warning: OK');
console.log('Network outer-error behavior: OK');
