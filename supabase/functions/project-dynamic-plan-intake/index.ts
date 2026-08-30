import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { unzipSync } from "npm:fflate@0.8.2";
import { XMLParser } from "npm:fast-xml-parser@4.5.0";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SA_JSON=Deno.env.get("GOOGLE_SA_JSON")!;
const GMAIL_USER=Deno.env.get("GMAIL_USER")!;
const SOURCE_BUCKET='project-source-files';
const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-pppp-cron-secret","Access-Control-Allow-Methods":"POST, GET, OPTIONS"};
const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:"@_",textNodeName:"#text",parseTagValue:false});

function s(v:any){return String(v??"").trim();}
function arr<T>(v:T|T[]|undefined|null):T[]{return v==null?[]:Array.isArray(v)?v:[v];}
function colNum(ref:string){let n=0;for(const ch of (ref.match(/^[A-Z]+/i)?.[0]||"").toUpperCase())n=n*26+ch.charCodeAt(0)-64;return n;}
function rowNum(ref:string){return Number(ref.match(/\d+$/)?.[0]||0);}
function dec(data:Uint8Array){return new TextDecoder().decode(data);}
function xml(bytes:Record<string,Uint8Array>,name:string){const b=bytes[name];return b?parser.parse(dec(b)):null;}
function textRun(si:any){if(si==null)return"";if(typeof si.t==='string')return si.t;if(si.t&&typeof si.t['#text']==='string')return si.t['#text'];return arr(si.r).map((r:any)=>typeof r?.t==='string'?r.t:s(r?.t?.['#text'])).join('');}
function sharedStrings(z:any){return arr(z?.sst?.si).map(textRun);}
function cellValue(c:any,shared:string[]){const t=s(c?.['@_t']),raw=s(c?.v);if(t==='s'&&raw!==''&&shared[Number(raw)]!=null)return shared[Number(raw)];if(t==='inlineStr')return textRun(c?.is);return raw;}
function styleFillMap(z:any){const xfs=arr(z?.styleSheet?.cellXfs?.xf),out=new Map<number,number>();xfs.forEach((x:any,i:number)=>out.set(i,Number(x?.['@_fillId']||0)));return out;}
function planHeader(v:string){const m=s(v).toUpperCase().match(/^(?:JAVA|WEEK|WOCHE|JAVE)\s*([0-9]{1,3})$/);return m?Number(m[1]):null;}
function parsePlan(raw:Uint8Array){
  const bytes=unzipSync(raw);
  const sh=xml(bytes,'xl/worksheets/sheet1.xml');
  if(!sh)throw new Error('sheet1.xml missing');
  const shared=sharedStrings(xml(bytes,'xl/sharedStrings.xml'));
  const fillMap=styleFillMap(xml(bytes,'xl/styles.xml'));
  const rows=arr(sh?.worksheet?.sheetData?.row);
  const matrix=new Map<number,Map<number,{value:string,style:number,fill:number,ref:string}>>();
  for(const r of rows){const rn=Number(r?.['@_r']||0);const map=new Map();for(const c of arr(r?.c)){const ref=s(c?.['@_r']);const cn=colNum(ref),style=Number(c?.['@_s']||0);map.set(cn,{value:cellValue(c,shared),style,fill:fillMap.get(style)||0,ref});}matrix.set(rn,map);}
  let headerRow=0,weekCols=new Map<number,number>();
  for(const [rn,cells] of matrix){const found:[number,number][]=[];for(const [cn,c] of cells){const w=planHeader(c.value);if(w!=null)found.push([cn,w]);}if(found.length>=3){headerRow=rn;weekCols=new Map(found);break;}}
  if(!headerRow||weekCols.size<3)throw new Error('dynamic plan week header not found');
  const firstWeek=Math.min(...weekCols.keys());
  const phases:any[]=[];
  for(let rn=headerRow+1;rn<=headerRow+60;rn++){
    const cells=matrix.get(rn);if(!cells)continue;
    let label='';for(let cn=1;cn<firstWeek;cn++){const v=s(cells.get(cn)?.value);if(v){label=v;break;}}
    if(!label)continue;
    const active:number[]=[];
    for(const [cn,w] of weekCols){const c=cells.get(cn);if(c&&c.fill>0)active.push(w);}
    if(active.length)phases.push({name:label,week_start:Math.min(...active),week_end:Math.max(...active)});
  }
  if(!phases.length)throw new Error('dynamic plan activity fills not found');
  return {document_type:'dynamic_plan',preliminary:true,relative_schedule:true,header_row:headerRow,week_count:weekCols.size,last_active_week:Math.max(...phases.map(x=>x.week_end)),phases};
}
function b64url(input:Uint8Array|string){const bytes=typeof input==='string'?new TextEncoder().encode(input):input;let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function pem(p:string){const x=p.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s+/g,'');const bin=atob(x),b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return b.buffer;}
let token:{v:string,exp:number}|null=null;
async function gmailToken(){const now=Math.floor(Date.now()/1000);if(token&&token.exp>now+60)return token.v;const sa=JSON.parse(SA_JSON),head={alg:'RS256',typ:'JWT'},claim={iss:sa.client_email,sub:GMAIL_USER,scope:'https://www.googleapis.com/auth/gmail.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600},u=`${b64url(JSON.stringify(head))}.${b64url(JSON.stringify(claim))}`,key=await crypto.subtle.importKey('pkcs8',pem(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']),sig=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(u))),jwt=`${u}.${b64url(sig)}`,r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth-type:jwt-bearer',assertion:jwt})}),j=await r.json();if(!r.ok)throw new Error(`Google token ${r.status}`);token={v:j.access_token,exp:now+(j.expires_in||3600)};return token.v;}
function decodeB64Url(data:string){let x=s(data).replace(/-/g,'+').replace(/_/g,'/');while(x.length%4)x+='=';const bin=atob(x),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
async function gmailAttachment(messageId:string,attachmentId:string){const t=await gmailToken(),u=`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,r=await fetch(u,{headers:{Authorization:`Bearer ${t}`}}),j=await r.json();if(!r.ok)throw new Error(`Gmail attachment ${r.status}: ${JSON.stringify(j).slice(0,300)}`);const b=decodeB64Url(j.data||'');if(!b.length)throw new Error('empty attachment');return b;}
async function authorized(req:Request){const provided=req.headers.get('x-pppp-cron-secret')||'';if(!provided)return false;const {data,error}=await db.rpc('gmail_tracker_cron_authorized',{provided});return !error&&data===true;}
function summary(plan:any){return plan.phases.map((p:any)=>`${p.name}: Java ${p.week_start}${p.week_end!==p.week_start?'-'+p.week_end:''}`).join('\n');}
function safeName(name:string){return (s(name)||'attachment.xlsx').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,' ').trim();}
async function sha256Hex(bytes:Uint8Array){const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));return Array.from(digest).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function archiveSource(link:any,bytes:Uint8Array,now:string){
  const mime=s(link.attachment_mime_type)||XLSX_MIME;
  const path=`${link.project_id}/gmail/${link.gmail_message_id}/${link.id}-${safeName(link.attachment_name)}`;
  const hash=await sha256Hex(bytes);
  const {error}=await db.storage.from(SOURCE_BUCKET).upload(path,bytes,{contentType:mime,upsert:false});
  if(error&&!/(already exists|duplicate|exists)/i.test(String(error.message||error)))throw error;
  return {attachment_mime_type:mime,attachment_size_bytes:bytes.byteLength,content_sha256:hash,storage_backend:'supabase-storage',storage_bucket:SOURCE_BUCKET,storage_path:path,archived_at:now,archive_method:'gmail-storage-v1'};
}
async function processOne(link:any){
  const b=await gmailAttachment(link.gmail_message_id,link.attachment_id),now=new Date().toISOString();
  const archive=s(link.storage_path)?{}:await archiveSource(link,b,now);
  if(Object.keys(archive).length){const {error:archiveError}=await db.from('project_attachment_links').update({...archive,updated_at:now}).eq('id',link.id);if(archiveError)throw archiveError;}
  const storagePath=s(link.storage_path)||String((archive as any).storage_path||'');
  const alreadyAnalyzed=s(link.analysis_method)==='xlsx-dynamic-plan-v1'||s(link.extracted_data?.document_type)==='dynamic_plan';
  if(alreadyAnalyzed)return {id:link.id,project_id:link.project_id,name:link.attachment_name,archive_only:true,analysis_preserved:true,storage_path:storagePath};
  const plan=parsePlan(b);
  const existing=(link.extracted_data&&typeof link.extracted_data==='object')?link.extracted_data:{};
  const merged={...existing,...plan,dynamic_plan:plan,source_email:link.gmail_message_id,dynamic_plan_status:'parsed'};
  const {error}=await db.from('project_attachment_links').update({analysis_status:'analyzed',analysis_method:'xlsx-dynamic-plan-v1',extracted_text:`PLANI DINAMIK\n${summary(plan)}`,extracted_data:merged,analysis_confidence:.99,analysis_error:null,analyzed_at:now,updated_at:now}).eq('id',link.id);if(error)throw error;
  const ref=`DYNAMIC_PLAN:${link.id}`;
  const {data:task}=await db.from('tasks').select('id,status').eq('source','dynamic_plan_auto').eq('source_ref',ref).limit(1);
  const detail=`Plani dinamik u lexua automatikisht nga ${link.attachment_name}.\n${summary(plan)}\nPlan relativ ndaj pikës së nisjes; kërkon aprovim njerëzor para përdorimit si afat kontraktual.`;
  if(task?.length){const {error:taskError}=await db.from('tasks').update({title:'Aprovo planin dinamik — '+(link.attachment_name||'projekti'),detail,due_date:new Date().toISOString().slice(0,10),priority:'e larte'}).eq('id',task[0].id);if(taskError)throw taskError;}else{const {error:taskError}=await db.from('tasks').insert({project_id:link.project_id,title:'Aprovo planin dinamik — '+(link.attachment_name||'projekti'),detail,due_date:new Date().toISOString().slice(0,10),priority:'e larte',status:'hapur',source:'dynamic_plan_auto',source_ref:ref,category:'intern'});if(taskError)throw taskError;}
  const marker=`dynamic-plan:${link.id}`;
  const {data:pa}=await db.from('project_analyses').select('id').eq('project_id',String(link.project_id)).contains('analysis',{event_source_ref:marker}).limit(1);
  if(!pa?.length){await db.from('project_analyses').insert({project_id:String(link.project_id),status:'complete',engine:'dynamic_plan_rules',model:'xlsx-style-gantt-v1',analysis:{event_source_ref:marker,executive_summary:`U lexua automatikisht plani dinamik: ${plan.phases.length} faza, Java 0-${plan.last_active_week}.`,current_stage:'client_offer',health:{label:'plan për aprovim',score:86,reason:'Plani ekziston dhe është strukturuar; duhet aprovuar para se të përdoret në ofertë.'},confidence:{score:99,reason:'Javët u nxorën nga header-i dhe qelizat e ngjyrosura të XLSX.'},recommendation:{decision:'human_gate_schedule','label':'Aprovo planin dinamik','reason':'Afatet janë tani të lexuara; aprovimi njerëzor mbetet i detyrueshëm.',source_ids:['D1']},next_actions:[{text:'Verifiko fazat dhe aprovo planin dinamik para finalizimit të ofertës.',owner:'PRISTEEL',priority:'high',status:'open',source_ids:['D1']}],risks:[{text:'Plani është relativ dhe preliminar; mos e trajto si datë kontraktuale pa pikënisje të konfirmuar.',severity:'high',status:'open',source_ids:['D1']}],requirements:[{text:summary(plan),status:'confirmed',category:'schedule',priority:'high',source_ids:['D1']}],missing_information:[],changes_since_last:[{text:'Plani dinamik u lexua dhe u strukturua automatikisht.',status:'confirmed',source_ids:['D1']}],deadlines:[],decisions:[],assumptions:[],scope:[]},source_manifest:[{id:'D1',type:'attachment',label:link.attachment_name,meta:{attachment_link_id:link.id,gmail_message_id:link.gmail_message_id}}],source_counts:{dynamic_plans:1},created_at:now});}
  await db.from('projects').update({updated_at:now}).eq('id',link.project_id);
  return {id:link.id,project_id:link.project_id,name:link.attachment_name,phases:plan.phases,last_active_week:plan.last_active_week,storage_path:storagePath};
}
async function markReviewRequired(link:any,e:any){
  const now=new Date().toISOString(),reason=String(e).slice(0,600),existing=(link.extracted_data&&typeof link.extracted_data==='object')?link.extracted_data:{};
  const merged={...existing,dynamic_plan_status:'review_required',dynamic_plan_error:reason,dynamic_plan_checked_at:now,source_email:link.gmail_message_id};
  const {error}=await db.from('project_attachment_links').update({extracted_data:merged,updated_at:now}).eq('id',link.id);if(error)throw error;
  const ref=`DYNAMIC_PLAN_REVIEW:${link.id}`,detail=`PPPP e identifikoi ${link.attachment_name} si kandidat për plan dinamik, por struktura XLSX nuk përputhet me parser-in e sigurt. Arsye: ${reason}. Dokumenti nuk do të riprovohet pafund; kërkohet review njerëzor.`;
  const {error:taskError}=await db.from('tasks').upsert({project_id:link.project_id,title:'Rishiko planin dinamik — '+(link.attachment_name||'projekti'),detail,due_date:new Date().toISOString().slice(0,10),priority:'larte',status:'hapur',source:'dynamic_plan_review',source_ref:ref,category:'intern'},{onConflict:'source,source_ref'});if(taskError)throw taskError;
  return {id:link.id,project_id:link.project_id,name:link.attachment_name,review_required:true,reason};
}
async function run(limit=10){
  const {data,error}=await db.from('project_attachment_links').select('id,gmail_message_id,attachment_id,attachment_name,attachment_mime_type,project_id,extracted_data,analysis_method,storage_path,created_at').not('project_id','is',null).ilike('attachment_name','%.xlsx').order('created_at',{ascending:false}).limit(100);if(error)throw error;
  const candidates=(data||[]).filter((x:any)=>{if(!/(plan|dinamik|schedule|timeline)/i.test(s(x.attachment_name)))return false;if(s(x.extracted_data?.dynamic_plan_status)==='review_required')return false;const needsAnalysis=s(x.analysis_method)!=='xlsx-dynamic-plan-v1'&&s(x.extracted_data?.document_type)!=='dynamic_plan';const needsArchive=!s(x.storage_path);return needsAnalysis||needsArchive;}).slice(0,Math.max(1,Math.min(20,Number(limit)||10)));
  const items=[];for(const x of candidates){try{items.push(await processOne(x));}catch(e){if(/dynamic plan (?:week header|activity fills) not found|sheet1\.xml missing/i.test(String(e))){try{items.push(await markReviewRequired(x,e));}catch(e2){items.push({id:x.id,name:x.attachment_name,error:String(e2)});}}else items.push({id:x.id,name:x.attachment_name,error:String(e)});}}
  return {candidates:candidates.length,processed:items.filter((x:any)=>!x.error).length,errors:items.filter((x:any)=>x.error).length,items};
}
Deno.serve(async(req:Request)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(!(await authorized(req)))return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:{...cors,'Content-Type':'application/json'}});try{const u=new URL(req.url);const limit=Number(u.searchParams.get('limit')||10);const res=await run(limit);return new Response(JSON.stringify({ok:true,...res}),{headers:{...cors,'Content-Type':'application/json'}});}catch(e){return new Response(JSON.stringify({ok:false,error:String(e)}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}});