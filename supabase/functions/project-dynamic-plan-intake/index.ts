import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { unzipSync } from "npm:fflate@0.8.2";
import { XMLParser } from "npm:fast-xml-parser@4.5.0";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SA_JSON=Deno.env.get("GOOGLE_SA_JSON")!;
const GMAIL_USER=Deno.env.get("GMAIL_USER")!;
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-pppp-cron-secret","Access-Control-Allow-Methods":"POST, GET, OPTIONS"};
const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:"@_",textNodeName:"#text",parseTagValue:false});

function s(v:any){return String(v??"").trim();}
function arr<T>(v:T|T[]|undefined|null):T[]{return v==null?[]:Array.isArray(v)?v:[v];}
function colNum(ref:string){let n=0;for(const ch of (ref.match(/^[A-Z]+/i)?.[0]||"").toUpperCase())n=n*26+ch.charCodeAt(0)-64;return n;}
function dec(data:Uint8Array){return new TextDecoder().decode(data);}
function xml(bytes:Record<string,Uint8Array>,name:string){const b=bytes[name];return b?parser.parse(dec(b)):null;}
function textRun(si:any){if(si==null)return"";if(typeof si.t==='string')return si.t;if(si.t&&typeof si.t['#text']==='string')return si.t['#text'];return arr(si.r).map((r:any)=>typeof r?.t==='string'?r.t:s(r?.t?.['#text'])).join('');}
function sharedStrings(z:any){return arr(z?.sst?.si).map(textRun);}
function cellValue(c:any,shared:string[]){const t=s(c?.['@_t']),raw=s(c?.v);if(t==='s'&&raw!==''&&shared[Number(raw)]!=null)return shared[Number(raw)];if(t==='inlineStr')return textRun(c?.is);return raw;}
function styleFillMap(z:any){const xfs=arr(z?.styleSheet?.cellXfs?.xf),out=new Map<number,number>();xfs.forEach((x:any,i:number)=>out.set(i,Number(x?.['@_fillId']||0)));return out;}
function planHeader(v:string){const m=s(v).toUpperCase().match(/^(?:JAVA|WEEK|WOCHE|JAVE)\s*([0-9]{1,3})$/);return m?Number(m[1]):null;}
function parsePlan(raw:Uint8Array){
  const bytes=unzipSync(raw),sh=xml(bytes,'xl/worksheets/sheet1.xml');if(!sh)throw new Error('sheet1.xml missing');
  const shared=sharedStrings(xml(bytes,'xl/sharedStrings.xml')),fillMap=styleFillMap(xml(bytes,'xl/styles.xml')),rows=arr(sh?.worksheet?.sheetData?.row),matrix=new Map<number,Map<number,{value:string,style:number,fill:number,ref:string}>>();
  for(const r of rows){const rn=Number(r?.['@_r']||0),map=new Map();for(const c of arr(r?.c)){const ref=s(c?.['@_r']),cn=colNum(ref),style=Number(c?.['@_s']||0);map.set(cn,{value:cellValue(c,shared),style,fill:fillMap.get(style)||0,ref});}matrix.set(rn,map);}
  let headerRow=0,weekCols=new Map<number,number>();for(const [rn,cells] of matrix){const found:[number,number][]=[];for(const [cn,c] of cells){const w=planHeader(c.value);if(w!=null)found.push([cn,w]);}if(found.length>=3){headerRow=rn;weekCols=new Map(found);break;}}
  if(!headerRow||weekCols.size<3)throw new Error('dynamic plan week header not found');
  const firstWeek=Math.min(...weekCols.keys()),phases:any[]=[];
  for(let rn=headerRow+1;rn<=headerRow+60;rn++){const cells=matrix.get(rn);if(!cells)continue;let label='';for(let cn=1;cn<firstWeek;cn++){const v=s(cells.get(cn)?.value);if(v){label=v;break;}}if(!label)continue;const active:number[]=[];for(const [cn,w] of weekCols){const c=cells.get(cn);if(c&&c.fill>0)active.push(w);}if(active.length)phases.push({name:label,week_start:Math.min(...active),week_end:Math.max(...active)});}
  if(!phases.length)throw new Error('dynamic plan activity fills not found');
  return {document_type:'dynamic_plan',preliminary:true,relative_schedule:true,header_row:headerRow,week_count:weekCols.size,last_active_week:Math.max(...phases.map(x=>x.week_end)),phases};
}
function b64url(input:Uint8Array|string){const bytes=typeof input==='string'?new TextEncoder().encode(input):input;let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function pem(p:string){const x=p.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s+/g,'');const bin=atob(x),b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return b.buffer;}
let token:{v:string,exp:number}|null=null;
async function gmailToken(){const now=Math.floor(Date.now()/1000);if(token&&token.exp>now+60)return token.v;const sa=JSON.parse(SA_JSON),head={alg:'RS256',typ:'JWT'},claim={iss:sa.client_email,sub:GMAIL_USER,scope:'https://www.googleapis.com/auth/gmail.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600},u=`${b64url(JSON.stringify(head))}.${b64url(JSON.stringify(claim))}`,key=await crypto.subtle.importKey('pkcs8',pem(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']),sig=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(u))),jwt=`${u}.${b64url(sig)}`,r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth-type:jwt-bearer',assertion:jwt})});
  if(!r.ok){const retry=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})}),j=await retry.json();if(!retry.ok)throw new Error(`Google token ${retry.status}`);token={v:j.access_token,exp:now+(j.expires_in||3600)};return token.v;}
  const j=await r.json();token={v:j.access_token,exp:now+(j.expires_in||3600)};return token.v;
}
function decodeB64Url(data:string){let x=s(data).replace(/-/g,'+').replace(/_/g,'/');while(x.length%4)x+='=';const bin=atob(x),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
async function gmailAttachment(messageId:string,attachmentId:string){const t=await gmailToken(),u=`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,r=await fetch(u,{headers:{Authorization:`Bearer ${t}`}}),j=await r.json();if(!r.ok)throw new Error(`Gmail attachment ${r.status}: ${JSON.stringify(j).slice(0,300)}`);const b=decodeB64Url(j.data||'');if(!b.length)throw new Error('empty attachment');return b;}
async function authorized(req:Request){const provided=req.headers.get('x-pppp-cron-secret')||'';if(!provided)return false;const {data,error}=await db.rpc('gmail_tracker_cron_authorized',{provided});return !error&&data===true;}
function summary(plan:any){return plan.phases.map((p:any)=>`${p.name}: Java ${p.week_start}${p.week_end!==p.week_start?'-'+p.week_end:''}`).join('\n');}
async function processOne(link:any){
  const b=await gmailAttachment(link.gmail_message_id,link.attachment_id),plan=parsePlan(b),now=new Date().toISOString(),existing=(link.extracted_data&&typeof link.extracted_data==='object')?link.extracted_data:{},merged={...existing,...plan,dynamic_plan:plan,source_email:link.gmail_message_id};
  const {error}=await db.from('project_attachment_links').update({analysis_status:'analyzed',analysis_method:'xlsx-dynamic-plan-v1',extracted_text:`PLANI DINAMIK\n${summary(plan)}`,extracted_data:merged,analysis_confidence:.99,analysis_error:null,analyzed_at:now,updated_at:now}).eq('id',link.id);if(error)throw error;
  await db.from('projects').update({updated_at:now}).eq('id',link.project_id);
  return {id:link.id,project_id:link.project_id,name:link.attachment_name,phases:plan.phases,last_active_week:plan.last_active_week};
}
async function run(limit=10){
  const {data,error}=await db.from('project_attachment_links').select('id,gmail_message_id,attachment_id,attachment_name,project_id,extracted_data,analysis_method,created_at').not('project_id','is',null).ilike('attachment_name','%.xlsx').order('created_at',{ascending:false}).limit(100);if(error)throw error;
  const candidates=(data||[]).filter((x:any)=>/(plan|dinamik|schedule|timeline)/i.test(s(x.attachment_name))&&s(x.analysis_method)!=='xlsx-dynamic-plan-v1'&&s(x.extracted_data?.document_type)!=='dynamic_plan').slice(0,Math.max(1,Math.min(20,Number(limit)||10))),items=[];for(const x of candidates){try{items.push(await processOne(x));}catch(e){items.push({id:x.id,name:x.attachment_name,error:String(e)});}}
  return {candidates:candidates.length,processed:items.filter((x:any)=>!x.error).length,errors:items.filter((x:any)=>x.error).length,items};
}
Deno.serve(async(req:Request)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(!(await authorized(req)))return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:{...cors,'Content-Type':'application/json'}});try{const u=new URL(req.url),limit=Number(u.searchParams.get('limit')||10),res=await run(limit);return new Response(JSON.stringify({ok:true,...res}),{headers:{...cors,'Content-Type':'application/json'}});}catch(e){return new Response(JSON.stringify({ok:false,error:String(e)}),{status:500,headers:{...cors,'Content-Type':'application/json'}});}});
