import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const SA_JSON=Deno.env.get("GOOGLE_SA_JSON")||"";
const GMAIL_USER=Deno.env.get("GMAIL_USER")||"";
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-pppp-cron-secret","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Content-Type":"application/json"};
const INTERNAL=new Set([GMAIL_USER,"sales@prissteel.com","arianit.vllahiu@prissteel.com","oltian.vllahiu@prissteel.com",...(Deno.env.get("PRISTEEL_INTERNAL_EMAILS")||"").split(/[;,\s]+/)].map(x=>String(x||"").trim().toLowerCase()).filter(Boolean));
const J=(v:any,s=200)=>new Response(JSON.stringify(v),{status:s,headers:CORS});
function b64url(input:Uint8Array|string){const bytes=typeof input==="string"?new TextEncoder().encode(input):input;let bin="";for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function pemToArrayBuffer(pem:string){const body=pem.replace(/-----BEGIN PRIVATE KEY-----/,"").replace(/-----END PRIVATE KEY-----/,"").replace(/\s+/g,"");const bin=atob(body);const buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);return buf.buffer;}
let cached:{token:string,exp:number}|null=null;
async function authorized(req:Request){const provided=req.headers.get("x-pppp-cron-secret")||"";if(!provided)return false;const {data,error}=await db.rpc("gmail_tracker_cron_authorized",{provided});return !error&&data===true;}
async function token(){const now=Math.floor(Date.now()/1000);if(cached&&cached.exp>now+60)return cached.token;if(!SA_JSON||!GMAIL_USER)throw new Error("Google Gmail environment is not configured");const sa=JSON.parse(SA_JSON);const claim={iss:sa.client_email,sub:GMAIL_USER,scope:"https://www.googleapis.com/auth/gmail.readonly",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600};const unsigned=`${b64url(JSON.stringify({alg:"RS256",typ:"JWT"}))}.${b64url(JSON.stringify(claim))}`;const key=await crypto.subtle.importKey("pkcs8",pemToArrayBuffer(sa.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);const sig=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(unsigned)));const jwt=`${unsigned}.${b64url(sig)}`;const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});const data=await r.json();if(!r.ok)throw new Error(`Google token ${r.status}: ${JSON.stringify(data).slice(0,300)}`);cached={token:data.access_token,exp:now+(data.expires_in||3600)};return cached.token;}
async function gmail(path:string){const t=await token();const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}${path}`,{headers:{Authorization:`Bearer ${t}`}});const raw=await r.text();if(!r.ok)throw new Error(`Gmail ${r.status}: ${raw.slice(0,400)}`);return raw?JSON.parse(raw):{};}
function hv(headers:any[],name:string){return String((headers||[]).find((x:any)=>String(x?.name||"").toLowerCase()===name.toLowerCase())?.value||"");}
function emails(raw:string){return [...new Set((String(raw||"").toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/g)||[]))];}
function email(raw:string){return emails(raw)[0]||"";}
function fromName(raw:string,addr:string){return String(raw||"").replace(/<[^>]+>/g,"").replace(/[\"<>]/g,"").replace(addr,"").trim();}
function decode(data:string){try{let s=String(data||"").replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";const bin=atob(s);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new TextDecoder().decode(bytes);}catch{return "";}}
function stripHtml(v:string){return String(v||"").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<br\s*\/?\s*>/gi,"\n").replace(/<\/p\s*>/gi,"\n").replace(/<\/div\s*>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'");}
function collect(part:any,out:{mime:string,text:string}[]){if(!part)return;const mime=String(part.mimeType||"").toLowerCase(),filename=String(part.filename||"").trim(),data=String(part.body?.data||"");if(!filename&&data&&(mime==="text/plain"||mime==="text/html"||!mime))out.push({mime:mime||"text/plain",text:decode(data)});for(const child of part.parts||[])collect(child,out);}
function body(payload:any,fallback:string){const parts:{mime:string,text:string}[]=[];collect(payload,parts);let v=parts.filter(x=>x.mime==="text/plain"&&x.text.trim()).map(x=>x.text).join("\n\n").trim();if(!v)v=parts.filter(x=>x.mime==="text/html"&&x.text.trim()).map(x=>stripHtml(x.text)).join("\n\n").trim();return (v||String(fallback||"")).replace(/\r\n/g,"\n").replace(/\n{4,}/g,"\n\n\n").trim().slice(0,30000);}
function hasAttachment(part:any):boolean{if(!part)return false;if(String(part.filename||"").trim())return true;return (part.parts||[]).some((x:any)=>hasAttachment(x));}
async function listIds(days:number,maxTotal:number){const out:string[]=[];let page="";do{const q=`newer_than:${days}d -label:chats`;const data=await gmail(`/messages?maxResults=500&q=${encodeURIComponent(q)}${page?`&pageToken=${encodeURIComponent(page)}`:""}`);for(const m of data.messages||[]){if(m?.id&&!out.includes(String(m.id)))out.push(String(m.id));if(out.length>=maxTotal)break;}page=out.length>=maxTotal?"":String(data.nextPageToken||"");}while(page);return out;}
async function existing(ids:string[]){const set=new Set<string>();for(let i=0;i<ids.length;i+=200){const chunk=ids.slice(i,i+200);const {data,error}=await db.from("project_emails").select("gmail_message_id").in("gmail_message_id",chunk);if(error)throw error;for(const r of data||[])if(r.gmail_message_id)set.add(String(r.gmail_message_id));}return set;}
async function row(id:string){const full=await gmail(`/messages/${encodeURIComponent(id)}?format=full`);const hs=full.payload?.headers||[];const fromRaw=hv(hs,"From"),from=email(fromRaw),subject=hv(hs,"Subject")||"(pa subjekt)";const internalMs=Number(full.internalDate||0),headerMs=Date.parse(hv(hs,"Date"));const sentAt=internalMs>0?new Date(internalMs).toISOString():Number.isFinite(headerMs)?new Date(headerMs).toISOString():new Date().toISOString();const thread=String(full.threadId||"");if(!thread)throw new Error(`Message ${id} has no threadId`);const now=new Date().toISOString();return{gmail_message_id:String(full.id||id),gmail_thread_id:thread,rfc822_message_id:hv(hs,"Message-ID")||null,from_email:from||null,from_name:fromName(fromRaw,from)||null,to_emails:emails(hv(hs,"To")),cc_emails:emails(hv(hs,"Cc")),subject,snippet:body(full.payload,String(full.snippet||"")),sent_at:sentAt,direction:INTERNAL.has(from)?"outgoing":"incoming",has_attachments:hasAttachment(full.payload),gmail_url:`https://mail.google.com/mail/u/0/#all/${encodeURIComponent(thread)}`,match_method:"fast-ingest-v2",match_confidence:0,needs_review:false,review_reason:null,body_hydrated_at:now,body_hydration_method:"fast-ingest-v2",updated_at:now};}
async function mapLimit<T,R>(items:T[],limit:number,fn:(x:T)=>Promise<R>){const out=new Array<R>(items.length);let cur=0;async function worker(){while(true){const i=cur++;if(i>=items.length)return;out[i]=await fn(items[i]);}}await Promise.all(Array.from({length:Math.min(limit,Math.max(1,items.length))},worker));return out;}

async function reconcileTed(req:Request,days:number,inserted:number){
  if(inserted<=0)return null;
  const secret=req.headers.get("x-pppp-cron-secret")||"";
  if(!secret)return{ok:false,skipped:true,reason:"missing_cron_secret"};
  const limit=Math.min(100,Math.max(20,inserted*2));
  try{
    const r=await fetch(`${SUPABASE_URL}/functions/v1/gmail-ted-sales-reconciler?days=${days}&limit=${limit}`,{
      method:"GET",
      headers:{
        "x-pppp-cron-secret":secret,
        "Authorization":req.headers.get("Authorization")||"",
        "apikey":req.headers.get("apikey")||""
      }
    });
    const body=await r.text();
    let data:any=null;try{data=JSON.parse(body)}catch{data={raw:body.slice(0,500)}}
    return{ok:r.ok,status:r.status,limit,result:data};
  }catch(e){
    return{ok:false,error:String((e as any)?.message||e).slice(0,500),limit};
  }
}

Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(!(await authorized(req)))return J({ok:false,error:"unauthorized"},401);try{const u=new URL(req.url);let payload:any={};if(req.method==="POST")try{payload=await req.json();}catch{}const days=Math.min(2,Math.max(1,Number(u.searchParams.get("days")||payload.days||1)));const maxTotal=Math.min(1000,Math.max(100,Number(u.searchParams.get("max")||payload.max||500)));const maxNew=Math.min(100,Math.max(1,Number(u.searchParams.get("max_new")||payload.max_new||50)));const ids=await listIds(days,maxTotal),known=await existing(ids),fresh=ids.filter(id=>!known.has(id)).slice(0,maxNew);const rows=await mapLimit(fresh,5,row);let inserted=0;for(let i=0;i<rows.length;i+=50){const chunk=rows.slice(i,i+50);if(!chunk.length)continue;const {data,error}=await db.from("project_emails").upsert(chunk,{onConflict:"gmail_message_id",ignoreDuplicates:true}).select("gmail_message_id");if(error)throw error;inserted+=(data||[]).length;}const ted_reconcile=await reconcileTed(req,days,inserted);return J({ok:true,listed:ids.length,existing:known.size,new_messages:fresh.length,inserted,days,max_new:maxNew,ted_reconcile});}catch(e){console.error("pppp-gmail-fast-ingest-v2",e);return J({ok:false,error:String((e as any)?.message||e).slice(0,1000)},500);}});
