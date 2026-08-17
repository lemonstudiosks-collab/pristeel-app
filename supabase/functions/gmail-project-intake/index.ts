import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);
const TERMINAL = new Set(["humbur","arkivuar","mbyllur","realizuar"]);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-pppp-cron-secret","Access-Control-Allow-Methods":"POST, GET, OPTIONS"};

const STOP=new Set(["project","projekti","projekt","client","customer","steel","stahl","construction","konstruktion","konstrukcija","konstrukcije","offer","offerte","ponuda","ponude","ponudu","angebot","anfrage","request","kerkese","kerkes","fertigung","produktion","italian","style","stacon","evosys","gmbh","shpk","doo","restoran","restaurant","fwd","forwarded","dokument","dokumente","celicne","celicna","konstrukciju"]);
const EQUIV:Record<string,string>={restoran:"restaurant",restauran:"restaurant",restaurante:"restaurant",montage:"montaza",montazu:"montaza",montazuom:"montaza"};
function text(v:any){return String(v??"").trim();}
function norm(v:any){return text(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim().split(" ").filter(Boolean).map(x=>EQUIV[x]||x).join(" ");}
function compact(v:any){return norm(v).replace(/\s+/g,"");}
function uniq<T>(xs:T[]){return [...new Set(xs)];}
function words(v:any){return norm(v).split(" ").filter(x=>x.length>=4&&!STOP.has(x));}
function structuredRef(v:any){const n=norm(v);return /\d/.test(n)&&compact(n).length>=6?n:"";}
function phraseSet(p:any){
  const client=new Set(words(p.client));
  const out:string[]=[];
  const add=(raw:any)=>{const xs=words(raw).filter(x=>!client.has(x));if(xs.length>=2){for(let i=0;i<xs.length-1;i++){const ph=xs[i]+" "+xs[i+1];if(compact(ph).length>=10)out.push(ph);}if(xs.length>=3){for(let i=0;i<xs.length-2;i++)out.push(xs[i]+" "+xs[i+1]+" "+xs[i+2]);}}};
  add(p.name);add(p.business_ref);for(const a of Array.isArray(p.identity_aliases)?p.identity_aliases:[])add(a);
  return uniq(out);
}
function exactPhrases(p:any){return uniq([p.business_ref,...(Array.isArray(p.identity_aliases)?p.identity_aliases:[])].map(norm).filter(x=>x.length>=8));}
function buildIndex(projects:any[]){
  const phraseCount=new Map<string,number>();
  for(const p of projects)for(const ph of phraseSet(p))phraseCount.set(ph,(phraseCount.get(ph)||0)+1);
  return projects.map(p=>({p,refs:uniq([structuredRef(p.ref),structuredRef(p.business_ref),...(Array.isArray(p.identity_aliases)?p.identity_aliases.map(structuredRef):[])].filter(Boolean)),exact:exactPhrases(p),phrases:phraseSet(p).filter(ph=>phraseCount.get(ph)===1)}));
}
function containsPhrase(hay:string,needle:string){return (` ${hay} `).includes(` ${needle} `);}
function classify(row:any,index:any[]){
  const subject=norm(row.subject), body=norm(row.snippet), corpus=`${subject} ${body}`.trim();
  const candidates:any[]=[];
  for(const item of index){let score=0,reason="";
    for(const r of item.refs){if(r&&compact(corpus).includes(compact(r))){score=100;reason=`ref:${r}`;break;}}
    if(score<100)for(const ph of item.exact){if(containsPhrase(corpus,ph)){score=98;reason=`business:${ph}`;break;}}
    if(score<98)for(const ph of item.phrases){if(containsPhrase(subject,ph)){score=96;reason=`subject_phrase:${ph}`;break;}}
    if(score<90)for(const ph of item.phrases){if(containsPhrase(body,ph)){score=90;reason=`body_phrase:${ph}`;break;}}
    if(score)candidates.push({project:item.p,score,reason});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const top=candidates[0], second=candidates[1];
  if(top&&top.score>=95&&(!second||second.score<=top.score-10))return{kind:"auto",...top,candidates};
  if(top&&top.score>=80)return{kind:"review",...top,candidates};
  return{kind:"none",score:0,reason:"no-strong-project-identity",candidates};
}
function extractPositions(raw:string){const m=raw.match(/\bPOS\s*([0-9,;\s]{5,100})/i);if(!m)return[];return uniq((m[1].match(/\d+/g)||[]).map(Number).filter(n=>n>0&&n<10000));}
function extractMass(raw:string){const m=raw.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?)\s*kg\b/i);return m?m[1].replace(/\s/g,""):"";}
function extractRequest(row:any){
  if(row.direction!=="incoming")return null;
  const raw=text(row.snippet), n=norm(raw), needs:string[]=[];
  const urgent=/\bhitan\b|\bhitno\b|\burgent\b|\bdringend\b|\burgjent\b|\basap\b/i.test(raw);
  if(/ponud\w*[^\n.]{0,60}monta|offer\w*[^\n.]{0,60}monta|angebot\w*[^\n.]{0,60}monta|ofert\w*[^\n.]{0,60}monta/i.test(raw))needs.push("Ofertë për montazh");
  if(/dinamik|rok\s+(izrade|proizvodnje|za transport)|shop\s*draw|radionick|timeline|schedule|zeitplan|terminplan/i.test(raw))needs.push("Plan dinamik: shop drawings, prodhim/galvanizim, transport dhe montazh");
  if(/revid\w*\s+cijen|revised\s+price|preis\w*\s+revid|revidovanu\s+rekapitul|jedinicnu\s+cijenu/i.test(raw))needs.push("Revizion i çmimeve dhe rekapitulimit");
  if(/plastifik|powder\s*coat|pulverbeschicht/i.test(raw))needs.push("Ndarje e scope-it të plastifikimit");
  if(/cinkov|galvaniz|feuerverzink/i.test(raw))needs.push("Galvanizimi duhet të ruhet sipas kërkesës");
  if(!needs.length)return null;
  return{urgent,needs,positions:extractPositions(raw),mass:extractMass(raw),excerpt:raw.slice(0,1400)};
}
function taskTitle(project:any,r:any){const prefix=r.urgent?"Urgjent: ":"";if(r.needs.includes("Ofertë për montazh")&&r.needs.includes("Revizion i çmimeve dhe rekapitulimit"))return `${prefix}Revido ofertën + montazhin — ${project.name}`;return `${prefix}Kërkesë e klientit — ${project.name}`;}
function taskDetail(row:any,r:any){const lines=["Kërkesa e emailit (nxjerrje automatike e kontrolluar):",...r.needs.map((x:string)=>`• ${x}`)];if(r.positions.length)lines.push(`• Pozitat e përmendura: POS ${r.positions.join(", ")}`);if(r.mass)lines.push(`• Masa e përmendur: ${r.mass} kg`);lines.push(`• Nga: ${row.from_name||row.from_email||""}`);lines.push(`• Subject: ${row.subject||""}`);return lines.join("\n");}
async function ensureLink(row:any,projectId:string,method:string,confidence:number){const {data}=await db.from("project_email_links").select("id").eq("gmail_message_id",row.gmail_message_id).eq("project_id",projectId).limit(1);if(data?.length)return false;const {error}=await db.from("project_email_links").insert({project_id:projectId,gmail_message_id:row.gmail_message_id,gmail_thread_id:row.gmail_thread_id||null,link_method:method,confidence,created_at:new Date().toISOString()});if(error)throw error;return true;}
async function ensureTask(row:any,project:any,r:any){const {data}=await db.from("tasks").select("id").eq("source","email_request_auto").eq("source_ref",row.gmail_message_id).limit(1);if(data?.length)return false;const due=new Date();if(!r.urgent)due.setUTCDate(due.getUTCDate()+1);const {error}=await db.from("tasks").insert({project_id:project.id,title:taskTitle(project,r),detail:taskDetail(row,r),due_date:due.toISOString().slice(0,10),priority:r.urgent?"e larte":"mesatare",status:"hapur",source:"email_request_auto",contact_email:row.from_email||null,category:"klient",source_ref:row.gmail_message_id});if(error)throw error;return true;}
async function authorized(req:Request){const provided=req.headers.get("x-pppp-cron-secret")??"";if(!provided)return false;const {data,error}=await db.rpc("gmail_tracker_cron_authorized",{provided});return !error&&data===true;}
async function reconcile(days=2,limit=300){
  const since=new Date(Date.now()-Math.max(1,Math.min(14,days))*86400000).toISOString();
  const {data:projects,error:pe}=await db.from("projects").select("id,name,client,ref,business_ref,identity_aliases,status").order("created_at",{ascending:false}).limit(2000);if(pe)throw pe;
  const active=(projects||[]).filter((p:any)=>!TERMINAL.has(text(p.status).toLowerCase()));const index=buildIndex(active);
  const {data:rows,error:ee}=await db.from("project_emails").select("id,gmail_message_id,gmail_thread_id,project_id,suggested_project_id,from_email,from_name,subject,snippet,sent_at,direction,match_method,match_confidence,needs_review").is("project_id",null).gte("sent_at",since).order("sent_at",{ascending:false}).limit(Math.max(1,Math.min(1000,limit)));if(ee)throw ee;
  const summary:any={checked:(rows||[]).length,linked:0,review:0,tasks_created:0,unmatched:0,items:[]};
  for(const row of rows||[]){const d=classify(row,index);if(d.kind==="auto"){
      const method="server-identity-auto-link-v2",now=new Date().toISOString();
      const {error}=await db.from("project_emails").update({project_id:d.project.id,suggested_project_id:d.project.id,match_method:method,match_confidence:d.score,needs_review:false,review_reason:null,updated_at:now}).eq("id",row.id).is("project_id",null);if(error)throw error;
      await ensureLink(row,d.project.id,method,d.score);summary.linked++;
      const req=extractRequest(row);let task=false;if(req)task=await ensureTask(row,d.project,req);if(task)summary.tasks_created++;
      summary.items.push({gmail_message_id:row.gmail_message_id,project_id:d.project.id,project_name:d.project.name,score:d.score,reason:d.reason,task_created:task,request:req?{urgent:req.urgent,needs:req.needs,positions:req.positions,mass:req.mass}:null});
    }else if(d.kind==="review"){
      const {error}=await db.from("project_emails").update({suggested_project_id:d.project.id,match_method:"server-identity-suggest-v2",match_confidence:d.score,needs_review:true,review_reason:`Project identity needs review: ${d.reason}`,updated_at:new Date().toISOString()}).eq("id",row.id).is("project_id",null);if(error)throw error;summary.review++;
    }else summary.unmatched++;
  }
  return summary;
}

Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(!(await authorized(req)))return new Response(JSON.stringify({ok:false,error:"unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});try{const url=new URL(req.url);let payload:any={};if(req.method==="POST")try{payload=await req.json();}catch{}const days=Number(url.searchParams.get("days")??payload.days??2),limit=Number(url.searchParams.get("limit")??payload.limit??300);const res=await reconcile(days,limit);return new Response(JSON.stringify({ok:true,...res}),{headers:{...cors,"Content-Type":"application/json"}});}catch(e){return new Response(JSON.stringify({ok:false,error:String(e)}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}});
