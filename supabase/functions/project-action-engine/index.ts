import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-pppp-cron-secret","Access-Control-Allow-Methods":"POST, GET, OPTIONS"};

function text(v:any){return String(v??"").trim();}
function norm(v:any){return text(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();}
function uniq<T>(xs:T[]){return [...new Set(xs)];}
function extractPositions(raw:string){const m=raw.match(/\bPOS\s*([0-9,;\s]{5,100})/i);if(!m)return[];return uniq((m[1].match(/\d+/g)||[]).map(Number).filter(n=>n>0&&n<10000));}
function extractMass(raw:string){const m=raw.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?)\s*kg\b/i);return m?m[1].replace(/\s/g,""):"";}
function parseLocalized(raw:any){let s=text(raw).replace(/\s/g,"");if(!s)return 0;if(s.includes(",")){s=s.replace(/\./g,"").replace(",",".");}else if((s.match(/\./g)||[]).length>1)s=s.replace(/\./g,"");const n=Number(s);return Number.isFinite(n)?n:0;}
function round2(v:any){return Math.round((Number(v)||0)*100+Number.EPSILON)/100;}
function errorText(e:any){if(e instanceof Error)return e.message;try{return JSON.stringify(e);}catch{return String(e);}}

function extractRequest(row:any){
  if(String(row.direction||"").toLowerCase()!=="incoming")return null;
  const raw=text(row.snippet),n=norm(raw),needs:string[]=[];
  const urgent=/\bhitan\b|\bhitno\b|\burgent\b|\bdringend\b|\burgjent\b|\basap\b/i.test(n);
  if(/(?:ponud\w*|offer\w*|angebot\w*|ofert\w*).{0,120}monta/i.test(n))needs.push("Ofertë për montazh");
  if(/dinamik|rok\s+(izrade|proizvodnje|za transport)|shop\s*draw|radionick|timeline|schedule|zeitplan|terminplan/i.test(n))needs.push("Plan dinamik: shop drawings, prodhim/galvanizim, transport dhe montazh");
  if(/revid\w*\s+cijen|revised\s+price|preis\w*\s+revid|revidovanu\s+rekapitul|jedinicnu\s+cijenu/i.test(n))needs.push("Revizion i çmimeve dhe rekapitulimit");
  if(/plastifik|powder\s*coat|pulverbeschicht/i.test(n))needs.push("Ndarje e scope-it të plastifikimit");
  if(/cinkov|galvaniz|feuerverzink/i.test(n))needs.push("Galvanizimi duhet të ruhet sipas kërkesës");
  if(!needs.length)return null;
  const mass=extractMass(raw);
  return{urgent,needs,positions:extractPositions(raw),mass,massKg:parseLocalized(mass)};
}
function quoteLine(lines:any[],key:string){return lines.find((x:any)=>text(x?._pstKey).toLowerCase()===key)||null;}

async function ensureQuoteRevision(row:any,project:any,r:any){
  if(!r||!r.positions?.length||!(r.massKg>0)||!r.needs.includes("Revizion i çmimeve dhe rekapitulimit")||!r.needs.includes("Ndarje e scope-it të plastifikimit"))return null;
  const {data:docs,error}=await db.from("documents_registry").select("*").eq("project_id",project.id).eq("series","QUO").order("created_at",{ascending:false}).limit(30);if(error)throw error;
  const prior=(docs||[]).find((d:any)=>text(d?.offer_state?.revision_source_ref)===text(row.gmail_message_id));
  if(prior)return{document_id:prior.id,doc_nr:prior.doc_nr,subtotal:Number(prior.offer_state?.subtotal_before_installation||prior.total_amount||prior.total_eur||0),installation_pending:prior.offer_state?.installation_price_pending===true,created:false};
  const base=(docs||[]).find((d:any)=>{const follow=text(d.followup_status).toLowerCase(),rev=text(d?.offer_state?.revision_status).toLowerCase();return ["open","sent","won"].includes(follow)&&rev!=="draft_review"&&Array.isArray(d?.offer_state?.oferPos);});
  if(!base)return null;
  const st=JSON.parse(JSON.stringify(base.offer_state||{})),lines=Array.isArray(st.oferPos)?st.oferPos:[];
  const baseLine=quoteLine(lines,"base"),zinc=quoteLine(lines,"zinc"),coat=quoteLine(lines,"coat"),transport=quoteLine(lines,"transport");
  const qty=Number(baseLine?.qty||0),basePrice=Number(baseLine?.price??baseLine?.price_neg??0),zincPrice=Number(zinc?.price??zinc?.price_neg??0),coatPrice=Number(coat?.price??coat?.price_neg??0),transportPrice=Number(transport?.price??transport?.price_neg??0);
  if(!(qty>0&&basePrice>0&&zincPrice>=0&&coatPrice>0&&r.massKg>0&&r.massKg<=qty))return null;
  const wantsInstallation=r.needs.includes("Ofertë për montazh");
  const revised=[
    {...baseLine,qty,price:basePrice,_pstSource:"revision-from-client-request",_pstManualOverride:true},
    {...(zinc||{_pstKey:"zinc",desc:"Toplo cinkovanje",unit:"kg"}),qty,price:zincPrice,_pstSource:"revision-from-client-request"},
    {...(coat||{_pstKey:"coat",desc:"Powder coating",unit:"kg"}),qty:r.massKg,price:coatPrice,desc:`Powder coating — vetëm POS ${r.positions.join(",")}`,_pstSource:"revision-from-client-request"}
  ];
  if(wantsInstallation)revised.push({_pstKey:"installation",desc:"Montaža / Installation — CIJENA ZA DOPUNU",unit:"ls",qty:1,price:0,_pstNeedsPrice:true,_pstSource:"client-request-pending-price",document_mode:"production"});
  if(transport)revised.push({...transport,qty:Number(transport.qty||1)||1,price:transportPrice,_pstSource:"revision-from-client-request"});
  const subtotal=round2(qty*basePrice+qty*zincPrice+r.massKg*coatPrice+transportPrice);
  const now=new Date(),year=now.getUTCFullYear(),month=String(now.getUTCMonth()+1).padStart(2,"0");
  const {data:lastSeq,error:seqError}=await db.from("documents_registry").select("seq").eq("series","QUO").eq("year",year).order("seq",{ascending:false}).limit(1);if(seqError)throw seqError;
  const seq=Math.max(0,Number(lastSeq?.[0]?.seq||0))+1,docNr=`PST-OFF-${year}-${month}-${String(seq).padStart(3,"0")}`;
  st.date=now.toISOString().slice(0,10);st.oferPos=revised;st.coat=String(coatPrice);st.installation=wantsInstallation?"CIJENA ZA DOPUNU — nije uključena u subtotal":"";
  st.not=`REVIZIJA ${now.toISOString().slice(0,10)}: plastifikim vetëm për POS ${r.positions.join(",")} (${r.mass} kg). Pozitat e tjera pa plastifikim, me galvanizim të ruajtur.${wantsInstallation?" Montimi është hapur për çmim.":""} Subtotal ${subtotal.toFixed(2)} EUR pa montim.`;
  st.revision_of=base.doc_nr;st.revision_source_ref=row.gmail_message_id;st.revision_status="draft_review";st.revision_reason="Client email request";st.powder_coating_positions=r.positions;st.powder_coating_qty_kg=r.massKg;st.subtotal_before_installation=subtotal;st.installation_price_pending=wantsInstallation;
  const revenue={kg:qty,steel:round2(qty*basePrice),galvanizing:round2(qty*zincPrice),powder_coating:round2(r.massKg*coatPrice),transport:round2(transportPrice),installation:null,subtotal_before_installation:subtotal};
  const payload={series:"QUO",year,seq,doc_nr:docNr,project:base.project||project.name,client:base.client||project.client||null,total_eur:subtotal,payment_plan:base.payment_plan||null,project_id:project.id,offer_state:st,revenue_breakdown:revenue,followup_status:"draft",followup_count:0,currency:base.currency||"EUR",total_amount:subtotal,exchange_rate_to_eur:Number(base.exchange_rate_to_eur||1)||1};
  const {data:inserted,error:insertError}=await db.from("documents_registry").insert(payload).select("id,doc_nr,total_amount").single();if(insertError)throw insertError;
  return{document_id:inserted.id,doc_nr:inserted.doc_nr,subtotal:Number(inserted.total_amount||subtotal),installation_pending:wantsInstallation,created:true,base_doc_nr:base.doc_nr};
}

function taskTitle(project:any,r:any,quote:any){const prefix=r.urgent?"Urgjent: ":"";if(quote?.doc_nr)return `${prefix}Drafti ${quote.doc_nr} gati — plotëso montazhin`;if(r.needs.includes("Ofertë për montazh")&&r.needs.includes("Revizion i çmimeve dhe rekapitulimit"))return `${prefix}Revido ofertën + montazhin — ${project.name}`;return `${prefix}Kërkesë e klientit — ${project.name}`;}
function taskDetail(row:any,r:any,quote:any){const lines=["Kërkesa e emailit (nxjerrje automatike e kontrolluar):",...r.needs.map((x:string)=>`• ${x}`)];if(r.positions.length)lines.push(`• Pozitat e përmendura: POS ${r.positions.join(", ")}`);if(r.mass)lines.push(`• Masa e përmendur: ${r.mass} kg`);if(quote?.doc_nr){lines.push(`• Drafti i ofertës u krijua: ${quote.doc_nr}`);lines.push(`• Subtotal pa montim: ${Number(quote.subtotal||0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} EUR`);if(quote.installation_pending)lines.push("• Montimi: çmimi për plotësim para dërgimit.");}lines.push(`• Nga: ${row.from_name||row.from_email||""}`);lines.push(`• Subject: ${row.subject||""}`);return lines.join("\n");}
async function ensureTask(row:any,project:any,r:any,quote:any){
  const due=new Date();if(!r.urgent)due.setUTCDate(due.getUTCDate()+1);
  const patch={project_id:project.id,title:taskTitle(project,r,quote),detail:taskDetail(row,r,quote),due_date:due.toISOString().slice(0,10),priority:r.urgent?"e larte":"mesatare",contact_email:row.from_email||null,category:"klient"};
  const {data,error:lookupError}=await db.from("tasks").select("id,status,source,project_id,title,category,priority").eq("source_ref",row.gmail_message_id).in("source",["email_request_auto","supplier_update_auto"]).order("created_at",{ascending:false}).limit(1);if(lookupError)throw lookupError;
  if(data?.length){
    const existing=data[0];
    const updatePatch=existing.source==="supplier_update_auto"?{...patch,title:existing.title||patch.title,category:existing.category||"furnitor",priority:r.urgent?"e larte":(existing.priority||"e larte")} : patch;
    const {error}=await db.from("tasks").update(updatePatch).eq("id",existing.id);if(error)throw error;return{action:"updated",id:existing.id};
  }
  const {data:created,error}=await db.from("tasks").insert({...patch,status:"hapur",source:"email_request_auto",source_ref:row.gmail_message_id}).select("id");if(error)throw error;
  if(!created?.length)return{action:"suppressed",id:null};
  return{action:"created",id:created[0]?.id};
}

async function ensureEventAnalysis(row:any,project:any,r:any,quote:any,task:any){
  const {data:recent,error}=await db.from("project_analyses").select("id,analysis").eq("project_id",String(project.id)).order("created_at",{ascending:false}).limit(20);if(error)throw error;
  if((recent||[]).some((x:any)=>text(x?.analysis?.event_source_ref)===text(row.gmail_message_id)))return false;
  const reqs:any[]=[];
  if(r.positions.length)reqs.push({text:`Plastifikim vetëm për POS ${r.positions.join(",")} (${r.mass} kg).`,status:"confirmed",category:"technical",priority:"critical",source_ids:["E1"]});
  if(r.needs.includes("Galvanizimi duhet të ruhet sipas kërkesës"))reqs.push({text:"Pozitat e tjera pa plastifikim, me galvanizim të ruajtur.",status:"confirmed",category:"technical",priority:"high",source_ids:["E1"]});
  const actions:any[]=[];
  if(quote?.installation_pending)actions.push({text:`Plotëso çmimin e montimit në ${quote.doc_nr}.`,owner:"PRISTEEL",priority:"critical",status:"open",source_ids:["E1","Q1"]});
  if(r.needs.some((x:string)=>x.startsWith("Plan dinamik")))actions.push({text:"Përcakto afatet: shop drawings, prodhim/galvanizim, transport, montazh dhe afatin total.",owner:"PRISTEEL",priority:"high",status:"open",source_ids:["E1"]});
  actions.push({text:quote?.doc_nr?`Verifiko ${quote.doc_nr} dhe përgatite për dërgim pasi të plotësohen pikat e hapura.`:"Përgatit revizionin e kërkuar nga klienti.",owner:"PRISTEEL",priority:"high",status:"open",source_ids:quote?["E1","Q1"]:["E1"]});
  const risks:any[]=[];
  if(quote?.installation_pending)risks.push({text:"Çmimi i montimit mungon; drafti nuk duhet dërguar si final.",severity:"critical",status:"open",source_ids:["Q1"]});
  if(r.needs.some((x:string)=>x.startsWith("Plan dinamik")))risks.push({text:"Afatet operative nuk janë plotësuar ende.",severity:"high",status:"open",source_ids:["E1"]});
  const analysis={event_source_ref:row.gmail_message_id,executive_summary:`Projekti është aktiv në ${project.pipeline_stage||project.status||"fazën aktuale"}. U pranua kërkesë e re e klientit: ${r.needs.join("; ")}.${quote?.doc_nr?` PPPP krijoi draftin ${quote.doc_nr} me subtotal ${Number(quote.subtotal).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} EUR pa montim.`:""}`,current_stage:project.pipeline_stage||project.status||"pritje",health:{label:"veprim i kërkuar",score:72,reason:"Kërkesa është identifikuar; pikat e hapura duhet të plotësohen para përgjigjes."},confidence:{score:96,reason:"Identiteti i projektit dhe kërkesat u nxorën nga emaili i lidhur."},recommendation:{decision:"vepro_tani",label:quote?.doc_nr?"Përfundo revizionin dhe montazhin":"Përpuno kërkesën e klientit",reason:"Klienti ka kërkuar ndryshime konkrete dhe përgjigje operative.",source_ids:quote?["E1","Q1","T1"]:["E1","T1"]},next_actions:actions,risks,missing_information:[...(quote?.installation_pending?[{text:"Çmimi i montimit",ask_to:"internal",priority:"critical",why_needed:"Montimi është kërkuar nga klienti dhe mbetet pa çmim.",source_ids:["E1","Q1"]}]:[]),...(r.needs.some((x:string)=>x.startsWith("Plan dinamik"))?[{text:"Afatet konkrete të planit dinamik",ask_to:"internal",priority:"high",why_needed:"Klienti kërkon afatet e realizimit.",source_ids:["E1"]}]:[])],requirements:reqs,changes_since_last:[{text:"U pranua dhe u përpunua kërkesa e re e klientit.",status:"confirmed",source_ids:["E1"]},...(quote?.doc_nr?[{text:`U krijua drafti ${quote.doc_nr}.`,status:"confirmed",source_ids:["Q1"]}]:[])],deadlines:[],decisions:[],assumptions:[],scope:[{text:`Kërkesë klienti për ${project.name}.`,status:"confirmed",source_ids:["E1"]}]};
  const manifest:any[]=[{id:"P1",type:"project",label:project.name,date:new Date().toISOString(),url:null,meta:{status:project.status,pipeline_stage:project.pipeline_stage}},{id:"E1",type:"email",label:row.subject,date:row.sent_at,url:`https://mail.google.com/mail/u/0/#all/${row.gmail_thread_id||row.gmail_message_id}`,meta:{gmail_message_id:row.gmail_message_id,from:row.from_name||row.from_email}},{id:"T1",type:"task",label:task?.id||"Client request task",date:new Date().toISOString(),url:null,meta:{task_id:task?.id||null}}];
  if(quote?.doc_nr)manifest.push({id:"Q1",type:"our_offer_revision",label:quote.doc_nr,date:new Date().toISOString(),url:null,meta:{document_id:quote.document_id,subtotal_before_installation:quote.subtotal,installation_price_pending:quote.installation_pending}});
  const {error:insertError}=await db.from("project_analyses").insert({project_id:String(project.id),status:"complete",engine:"server_event_rules",model:"deterministic-client-request-v1",analysis,source_manifest:manifest,source_counts:{event_email:1,tasks:1,quote_revision:quote?1:0},created_at:new Date().toISOString()});if(insertError)throw insertError;
  return true;
}

async function authorized(req:Request){const provided=req.headers.get("x-pppp-cron-secret")??"";if(!provided)return false;const {data,error}=await db.rpc("gmail_tracker_cron_authorized",{provided});return !error&&data===true;}

async function reconcile(days=3,limit=500){
  const since=new Date(Date.now()-Math.max(1,Math.min(14,days))*86400000).toISOString();
  const {data:rows,error}=await db.from("project_emails").select("id,gmail_message_id,gmail_thread_id,project_id,from_email,from_name,subject,snippet,sent_at,direction").not("project_id","is",null).eq("direction","incoming").gte("sent_at",since).order("sent_at",{ascending:false}).limit(Math.max(1,Math.min(1500,limit)));if(error)throw error;
  const summary:any={checked:(rows||[]).length,requests:0,tasks_created:0,tasks_updated:0,tasks_suppressed:0,quotes_created:0,analyses_created:0,items:[]};
  const projectCache=new Map<string,any>();
  for(const row of rows||[]){
    const req=extractRequest(row);if(!req)continue;summary.requests++;
    let project=projectCache.get(String(row.project_id));
    if(!project){const {data:p,error:pe}=await db.from("projects").select("id,name,client,status,pipeline_stage").eq("id",row.project_id).maybeSingle();if(pe)throw pe;if(!p)continue;project=p;projectCache.set(String(row.project_id),p);}
    const quote=await ensureQuoteRevision(row,project,req);if(quote?.created)summary.quotes_created++;
    const task=await ensureTask(row,project,req,quote);
    if(task.action==="suppressed"){
      summary.tasks_suppressed++;
      summary.items.push({gmail_message_id:row.gmail_message_id,project_id:project.id,project_name:project.name,task_action:task.action,quote:quote?{doc_nr:quote.doc_nr,created:quote.created,installation_pending:quote.installation_pending}:null,analysis_created:false});
      continue;
    }
    if(task.action==="created")summary.tasks_created++;else summary.tasks_updated++;
    const analysisCreated=await ensureEventAnalysis(row,project,req,quote,task);if(analysisCreated)summary.analyses_created++;
    summary.items.push({gmail_message_id:row.gmail_message_id,project_id:project.id,project_name:project.name,task_action:task.action,quote:quote?{doc_nr:quote.doc_nr,created:quote.created,installation_pending:quote.installation_pending}:null,analysis_created:analysisCreated});
  }
  return summary;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(!(await authorized(req)))return new Response(JSON.stringify({ok:false,error:"unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  try{const url=new URL(req.url);let payload:any={};if(req.method==="POST")try{payload=await req.json();}catch{}const days=Number(url.searchParams.get("days")??payload.days??3),limit=Number(url.searchParams.get("limit")??payload.limit??500);const res=await reconcile(days,limit);return new Response(JSON.stringify({ok:true,...res}),{headers:{...cors,"Content-Type":"application/json"}});}catch(e){const msg=errorText(e);console.error("project-action-engine error",e);return new Response(JSON.stringify({ok:false,error:msg}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}
});