import { draftMessage, contactAllowed, blocked } from "./commercial.mjs";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const U=Deno.env.get("SUPABASE_URL")||"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const A=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SA=Deno.env.get("GOOGLE_SA_JSON")||"";
const GU=(Deno.env.get("GMAIL_USER")||"").toLowerCase();
const db=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const V="pppp-druseidt-commercial-v1";
const C={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const t=(v:any,n=12000)=>String(v==null?"":v).replace(/\r/g,"").trim().slice(0,n);
const em=(v:any)=>t(v,320).toLowerCase();
const res=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...C,"Cache-Control":"no-store"}});
const uuid=(v:any)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t(v,80));
const esc=(v:any)=>String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const arr=(v:any)=>Array.isArray(v)?v:[];

function safeEmail(v:any){
  const e=em(v),m=e.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  if(!m)throw new Error("valid_contact_email_required");
  if(e.endsWith("@prissteel.com"))throw new Error("internal_recipient_not_allowed");
  if(/^(jobs|careers|career|hr|privacy|gdpr|press|media|noreply|no-reply)@/i.test(e))throw new Error("unsafe_recipient_localpart");
  return e;
}
function b64u(input:Uint8Array|string){
  const bytes=typeof input==="string"?new TextEncoder().encode(input):input;let b="";
  for(const x of bytes)b+=String.fromCharCode(x);
  return btoa(b).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function pem(p:string){
  const s=p.replace(/-----BEGIN PRIVATE KEY-----/,"").replace(/-----END PRIVATE KEY-----/,"").replace(/\s+/g,"");
  const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer;
}
function b64(v:string){let b="";for(const x of new TextEncoder().encode(v))b+=String.fromCharCode(x);return btoa(b);}
function mh(v:any){const s=t(v,500).replace(/[\r\n]+/g," ");return /[^\x20-\x7E]/.test(s)?"=?UTF-8?B?"+b64(s)+"?=":s;}

const tokenCache=new Map<string,{token:string;exp:number}>();
async function token(scope="https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.readonly"){
  const now=Math.floor(Date.now()/1000),cached=tokenCache.get(scope);if(cached&&cached.exp>now+60)return cached.token;
  if(!SA||!GU)throw new Error("gmail_service_account_missing");
  const sa=JSON.parse(SA),h={alg:"RS256",typ:"JWT"},cl={iss:sa.client_email,sub:GU,scope,aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600};
  const u=b64u(JSON.stringify(h))+"."+b64u(JSON.stringify(cl));
  const k=await crypto.subtle.importKey("pkcs8",pem(sa.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const sg=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",k,new TextEncoder().encode(u)));
  const jwt=u+"."+b64u(sg);
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});
  const d=await r.json();if(!r.ok)throw new Error("gmail_token_"+r.status);
  const fresh={token:d.access_token,exp:now+(d.expires_in||3600)};tokenCache.set(scope,fresh);return fresh.token;
}
async function user(auth:string){
  if(!A)throw new Error("supabase_anon_key_missing");
  const c=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const q=await c.auth.getUser();if(q.error||!q.data?.user)throw new Error("unauthorized");return q.data.user;
}
async function gmailGet(path:string){
  const tk=await token(),r=await fetch("https://gmail.googleapis.com/gmail/v1/users/"+encodeURIComponent(GU)+path,{headers:{Authorization:"Bearer "+tk}});
  let d:any={};try{d=await r.json();}catch{}
  if(!r.ok)throw new Error("gmail_read_"+r.status);return d;
}
async function draftExists(id:any){
  const x=t(id,500);if(!x)return false;
  try{await gmailGet("/drafts/"+encodeURIComponent(x)+"?format=minimal");return true;}catch{return false;}
}
async function findExistingDraft(recipient:any,subject:string){
  const e=safeEmail(recipient),clean=t(subject,300).replace(/"/g,""),q=encodeURIComponent('to:'+e+' subject:"'+clean+'" newer_than:7d');
  try{
    const x=await gmailGet("/drafts?maxResults=10&q="+q+"&fields=drafts(id,message(id,threadId)),resultSizeEstimate");
    const hit=Array.isArray(x?.drafts)&&x.drafts.length?x.drafts[0]:null;if(!hit?.id)return null;
    const full=await gmailGet("/drafts/"+encodeURIComponent(hit.id)+"?format=minimal");
    return{draft_id:t(full?.id||hit.id,500),message_id:t(full?.message?.id||hit?.message?.id,500),thread_id:t(full?.message?.threadId||hit?.message?.threadId,500)};
  }catch{return null;}
}
async function recentSentTo(recipient:any,days=30){
  const e=safeEmail(recipient),q=encodeURIComponent("in:sent to:"+e+" newer_than:"+Math.max(1,Math.min(60,days))+"d");
  const x=await gmailGet("/messages?maxResults=5&q="+q+"&fields=messages(id,threadId),resultSizeEstimate");
  return Array.isArray(x?.messages)&&x.messages.length?x.messages[0]:null;
}
let sigCache:{html:string,exp:number}|null=null;
async function gmailSignature(){
  const now=Math.floor(Date.now()/1000);if(sigCache&&sigCache.exp>now+60)return sigCache.html;
  try{
    const tk=await token("https://www.googleapis.com/auth/gmail.settings.basic");
    const r=await fetch("https://gmail.googleapis.com/gmail/v1/users/"+encodeURIComponent(GU)+"/settings/sendAs",{headers:{Authorization:"Bearer "+tk}});
    const d=await r.json();if(!r.ok)throw new Error("gmail_signature_read_"+r.status);
    const rows=Array.isArray(d?.sendAs)?d.sendAs:[];
    const p=rows.find((x:any)=>em(x?.sendAsEmail)==="arianit.vllahiu@prissteel.com")||rows.find((x:any)=>x?.isDefault)||rows[0]||null;
    const html=t(p?.signature||"",20000);sigCache={html,exp:now+900};return html;
  }catch{sigCache={html:"",exp:now+300};return"";}
}
async function createDraft(to:string,subject:string,plain:string,html:string,headers:Record<string,string>,threadId=""){
  const head=["To: "+mh(to),"Subject: "+mh(subject),...Object.entries(headers).map(x=>x[0]+": "+mh(x[1])),"MIME-Version: 1.0"];
  const alt="alt_"+crypto.randomUUID().replace(/-/g,"");
  const raw=[...head,'Content-Type: multipart/alternative; boundary="'+alt+'"',"","--"+alt,"Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: 8bit","",plain,"","--"+alt,"Content-Type: text/html; charset=UTF-8","Content-Transfer-Encoding: 8bit","",html,"","--"+alt+"--",""].join("\r\n");
  const tk=await token(),r=await fetch("https://gmail.googleapis.com/gmail/v1/users/"+encodeURIComponent(GU)+"/drafts",{method:"POST",headers:{Authorization:"Bearer "+tk,"Content-Type":"application/json"},body:JSON.stringify({message:{raw:b64u(raw),...(threadId?{threadId}:{})}})});
  const d=await r.json();if(!r.ok)throw new Error("gmail_draft_"+r.status+":"+t(JSON.stringify(d),500));
  return{draft_id:t(d?.id,500),message_id:t(d?.message?.id,500),thread_id:t(d?.message?.threadId,500)};
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("",{headers:C});
 if(req.method!=="POST")return res({ok:false,error:"method_not_allowed"},405);
 let claim:any=null,leadId="";
 try{
  const auth=req.headers.get("Authorization")||"",body=await req.json();
  if(auth==="Bearer "+S && body.controlled_command_id){
   const receipt=await db.from("pppp_chatgpt_command_receipts").select("status,action_type").eq("command_id",t(body.controlled_command_id,160)).single();
   if(receipt.error||receipt.data?.status!=="processing"||receipt.data?.action_type!=="druseidt_outreach_draft")return res({ok:false,error:"controlled_command_required"},403);
   if(body.mode==="supplier_request")throw new Error("supplier_request_requires_human_operator");
  }else{
   await user(auth);
   const caller=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
   const role=await caller.rpc("is_admin");if(role.error||role.data!==true)return res({ok:false,error:"authorized_operator_required"},403);
  }
  const id=t(body.lead_id,80),request=body.mode==="supplier_request";
  if(!uuid(id))throw new Error("valid_lead_id_required");leadId=id;
  const detail=await db.rpc("pppp_druseidt_lead_detail_v1",{p_id:id});if(detail.error)throw detail.error;
  const lead=detail.data?.lead;if(!lead)throw new Error("lead_not_found");
  if(blocked(lead))throw new Error("SPIE outreach blocked");
  let contact:any;
  if(request){
   const tr=await db.from("pppp_representation_targets_v1").select("contact_name,contact_role,contact_email,gmail_thread_id,company_domain_normalized").eq("id",lead.target_id).single();
   if(tr.error||tr.data?.company_domain_normalized!=="druseidt.de")throw new Error("canonical_target_required");
   contact={name:tr.data.contact_name,role:tr.data.contact_role,email:tr.data.contact_email,verification_status:"VERIFIED",source_url:"https://mail.google.com/mail/u/0/#all/"+tr.data.gmail_thread_id};
  }else contact=(detail.data.contacts||[]).find((x:any)=>String(x.id||x.email)===String(body.contact_key));
  if(!contact||!contactAllowed(contact))throw new Error("verified_published_contact_required");
  const message=draftMessage(lead,contact,request),recipient=safeEmail(contact.email);
  const slot=request?"supplier_draft":"client_draft",existing=lead.communications?.[slot];
  if(existing?.draft_id){
   // Fail closed if Gmail cannot verify a previously created draft. Never silently recreate.
   const live=await gmailGet("/drafts/"+encodeURIComponent(existing.draft_id)+"?format=minimal");
   return res({ok:true,existing:true,...existing,gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+live.message?.threadId});
  }
  const history=await db.from("pppp_outbound_queue_v1").select("id,status,gmail_draft_id,gmail_thread_id,tender_watch_id,project_key").eq("recipient_email",recipient).in("status",["draft_ready","sent","replied","approved","planned"]).limit(20);
  if(history.error)throw history.error;
  if((history.data||[]).some((x:any)=>lead.tender_watch_id&&x.tender_watch_id===lead.tender_watch_id))return res({ok:false,error:"existing_shared_outbound_review_required",history:history.data},409);
  const projectQuery=request?' subject:"'+t(lead.context.reference||lead.context.title,300).replace(/["\\]/g,"")+'"':"";
  const query=encodeURIComponent("(to:"+recipient+" OR from:"+recipient+") -in:trash"+projectQuery);
  const mhistory=await gmailGet("/messages?maxResults=20&q="+query+"&fields=messages(id,threadId),resultSizeEstimate");
  let threadId=lead.communications?.[request?"supplier_thread_id":"thread_id"]||"",replyHeaders:any={};
  const seen=new Set<string>((mhistory.messages||[]).map((x:any)=>x.threadId));
  if(!threadId && seen.size){
   const candidates:any[]=[];
   for(const hit of (mhistory.messages||[]).slice(0,10)){
    const mail=await gmailGet("/messages/"+hit.id+"?format=metadata&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=X-PPPP-Druseidt-Lead");
    const hs=mail.payload?.headers||[],get=(n:string)=>t(hs.find((x:any)=>x.name.toLowerCase()===n.toLowerCase())?.value,1000);
    if(get("X-PPPP-Druseidt-Lead")===id||(lead.kind==="direct"&&!request)||(lead.context.reference&&get("Subject").includes(lead.context.reference)))candidates.push({thread_id:hit.threadId,subject:get("Subject"),message_id:get("Message-ID")});
   }
   const threads=[...new Set(candidates.map(x=>x.thread_id))];
   if(threads.length!==1)return res({ok:false,error:"gmail_continuity_review_required",threads:[...seen]},409);
   threadId=threads[0];message.subject=candidates[0].subject||message.subject;
   if(candidates[0].message_id)replyHeaders={"In-Reply-To":candidates[0].message_id,References:candidates[0].message_id};
  }else if(threadId){
   const thread=await gmailGet("/threads/"+encodeURIComponent(threadId)+"?format=metadata&metadataHeaders=Message-ID&metadataHeaders=Subject");
   const latest=(thread.messages||[]).at(-1),hs=latest?.payload?.headers||[];
   const mid=hs.find((x:any)=>x.name.toLowerCase()==="message-id")?.value;
   if(!mid)throw new Error("thread_reply_headers_missing");
   message.subject=hs.find((x:any)=>x.name.toLowerCase()==="subject")?.value||message.subject;
   replyHeaders={"In-Reply-To":mid,References:mid};
  }
  // Search actual Gmail drafts and recover only the exact lead identity.
  const ds=await gmailGet("/drafts?maxResults=30&q="+encodeURIComponent("to:"+recipient));
  for(const hit of ds.drafts||[]){
   const draft=await gmailGet("/drafts/"+hit.id+"?format=metadata");
   const h=draft.message?.payload?.headers||[];
   if(h.some((x:any)=>x.name.toLowerCase()==="x-pppp-druseidt-lead"&&x.value===id)){
    const recovered={draft_id:hit.id,message_id:draft.message.id,thread_id:draft.message.threadId,recipient};
    const up=await db.from("pppp_druseidt_leads_v1").update({communications:{...lead.communications,[slot]:recovered,...(!request?{thread_id:recovered.thread_id,recipient}:{supplier_thread_id:recovered.thread_id})},pipeline:request?lead.pipeline:"DRAFT READY",updated_at:new Date().toISOString()}).eq("id",id).eq("fingerprint",lead.fingerprint);
    if(up.error)throw up.error;
    return res({ok:true,existing:true,...recovered,gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+recovered.thread_id});
   }
   if(t(draft.message?.snippet,1000).includes(lead.context.reference||lead.context.title))return res({ok:false,error:"existing_project_draft_review_required"},409);
  }
  const cl=await db.rpc("pppp_druseidt_draft_claim_v1",{p_id:id,p_fingerprint:lead.fingerprint,p_request:request});if(cl.error)throw cl.error;
  claim=cl.data;if(claim.existing)return res({ok:true,existing:true,...claim.draft});
  const sig=await gmailSignature(),html="<div>"+esc(message.plain).replace(/\n/g,"<br>")+"</div>"+sig;
  const draft=await createDraft(recipient,message.subject,message.plain,html,{"X-PPPP-Druseidt-Lead":id,"X-PPPP-Druseidt-Mode":request?"supplier_request":"customer",...replyHeaders},threadId);
  const comm={...lead.communications,[slot]:{...draft,recipient,subject:message.subject},...(!request?{thread_id:draft.thread_id,recipient}:{supplier_thread_id:draft.thread_id})};
  const up=await db.from("pppp_druseidt_leads_v1").update({communications:comm,pipeline:request?"REQUEST TO DRUSEIDT READY":"DRAFT READY",history:[...(lead.history||[]),{at:new Date().toISOString(),action:request?"supplier_draft_created":"client_draft_created",draft_id:draft.draft_id,human_send_required:true}],updated_at:new Date().toISOString()}).eq("id",id).eq("fingerprint",lead.fingerprint).eq("communications->"+slot+"->>claim",claim.claim).select("id").single();
  if(up.error)throw up.error;
  return res({ok:true,existing:false,...draft,recipient,subject:message.subject,external_email_sent:false,human_send_required:true,gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+draft.thread_id});
 }catch(e){
  // A Gmail-created draft may survive a failed DB update; preflight recovers it by exact lead header.
  console.error(V,e);return res({ok:false,error:t((e as any)?.message||e,900)},409);
 }
});
