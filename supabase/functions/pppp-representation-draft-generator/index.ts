import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")||"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const A=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SA=Deno.env.get("GOOGLE_SA_JSON")||"";
const GU=(Deno.env.get("GMAIL_USER")||"").toLowerCase();
const db=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const V="pppp-representation-draft-generator-v4";
const OUTREACH_SUBJECT="Kosovo / KOSTT – EBRD Project 55387 | Potential T&D cooperation";
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
async function createDraft(to:string,subject:string,plain:string,html:string,headers:Record<string,string>){
  const head=["To: "+mh(to),"Subject: "+mh(subject),...Object.entries(headers).map(x=>x[0]+": "+mh(x[1])),"MIME-Version: 1.0"];
  const alt="alt_"+crypto.randomUUID().replace(/-/g,"");
  const raw=[...head,'Content-Type: multipart/alternative; boundary="'+alt+'"',"","--"+alt,"Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: 8bit","",plain,"","--"+alt,"Content-Type: text/html; charset=UTF-8","Content-Transfer-Encoding: 8bit","",html,"","--"+alt+"--",""].join("\r\n");
  const tk=await token(),r=await fetch("https://gmail.googleapis.com/gmail/v1/users/"+encodeURIComponent(GU)+"/drafts",{method:"POST",headers:{Authorization:"Bearer "+tk,"Content-Type":"application/json"},body:JSON.stringify({message:{raw:b64u(raw)}})});
  const d=await r.json();if(!r.ok)throw new Error("gmail_draft_"+r.status+":"+t(JSON.stringify(d),500));
  return{draft_id:t(d?.id,500),message_id:t(d?.message?.id,500),thread_id:t(d?.message?.threadId,500)};
}
function money(v:any,c="EUR"){const n=Number(v);return Number.isFinite(n)&&n>0?new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:0}).format(n):"";}
function message(tg:any,op:any,link:any,sig:string){
  const fit=link?.fit_evidence&&typeof link.fit_evidence==="object"?link.fit_evidence:{};
  const project=t(op?.project_name||"KOSTT Transmission Grid Strengthening",500);
  const ref=t(op?.tender_reference||"EBRD Project ID 55387",300);
  const value=money(op?.total_project_value,op?.currency||"EUR");
  const finance=t(op?.financing,1200);
  const scope=t(op?.scope,2500);
  const pitch=t(fit?.external_pitch,1600);
  const pv=arr(fit?.pristeel_value).map((x:any)=>t(x,180)).filter(Boolean);
  const valueText=pv.length?pv.join(", "):"Kosovo project intelligence, local sourcing, logistics, site support and local execution coordination";
  const subject=OUTREACH_SUBJECT;
  const paragraphs=[
    "Dear Sir or Madam,",
    "We are contacting you regarding "+project+" ("+ref+") in Kosovo.",
    "The project has been approved by the EBRD. "+(value?"The total project cost is "+value+". ":"")+(finance?finance:""),
    "The published scope includes "+scope,
    "Detailed procurement packages, qualification criteria and tender deadlines have not yet been published. We are therefore approaching potential EPC partners at this pre-procurement stage, while there is still time to assess a suitable local execution model.",
    "PriSteel is based in Kosovo. Depending on the final package structure, we can support with "+valueText+". The intention is not to replace the EPC contractor's engineering, qualifications or guarantees, but to provide a practical Kosovo execution and commercial interface.",
    pitch?pitch:"",
    "If this opportunity is of interest, we would welcome a short introductory discussion to assess whether a project-specific cooperation model is worth developing before procurement is launched.",
    "Kind regards,"
  ].filter(Boolean);
  const plain=paragraphs.join("\n\n")+"\n\nArianit Vllahiu\nHead of Business Development\n+383 (0) 44 244 699\narianit.vllahiu@prissteel.com\nwww.prissteel.com";
  const html='<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.55">'+paragraphs.map((p,i)=>i===paragraphs.length-1?'<p>'+esc(p)+'</p>':'<p>'+esc(p)+'</p>').join("")+(sig||'<p><strong>Arianit Vllahiu</strong><br>Head of Business Development<br>+383 (0) 44 244 699<br>arianit.vllahiu@prissteel.com<br>www.prissteel.com</p>')+'</div>';
  return{subject,plain,html};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("",{headers:C});
  if(req.method!=="POST")return res({ok:false,error:"method_not_allowed"},405);
  try{
    const auth=req.headers.get("Authorization")||"";await user(auth);
    const body=await req.json().catch(()=>({})),targetId=t(body?.target_id,80),oppId=t(body?.opportunity_id,80);
    if(!uuid(targetId))return res({ok:false,error:"valid_target_id_required"},400);
    const tr=await db.from("pppp_representation_targets_v1").select("*").eq("id",targetId).is("archived_at",null).maybeSingle();
    if(tr.error||!tr.data)return res({ok:false,error:"representation_target_not_found"},404);
    const tg=tr.data,recipient=safeEmail(tg.contact_email);
    if(tg.gmail_draft_id&&await draftExists(tg.gmail_draft_id)){
      return res({ok:true,existing:true,draft_id:tg.gmail_draft_id,message_id:tg.gmail_last_message_id,thread_id:tg.gmail_thread_id,gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+encodeURIComponent(tg.gmail_thread_id||"")});
    }
    const recovered=await findExistingDraft(recipient,OUTREACH_SUBJECT);
    if(recovered){
      const now=new Date().toISOString();
      const up=await db.from("pppp_representation_targets_v1").update({
        gmail_draft_id:recovered.draft_id,gmail_last_message_id:recovered.message_id,gmail_thread_id:recovered.thread_id,
        stage:"draft_ready",next_action:"Review the Gmail draft and send manually if approved.",updated_at:now
      }).eq("id",targetId).select("id,stage,gmail_draft_id,gmail_last_message_id,gmail_thread_id").single();
      if(up.error)throw up.error;
      return res({ok:true,existing:true,recovered:true,target_id:targetId,draft_id:recovered.draft_id,message_id:recovered.message_id,thread_id:recovered.thread_id,gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+encodeURIComponent(recovered.thread_id||"")});
    }
    const sent=await recentSentTo(recipient,30);
    if(sent)return res({ok:false,error:"recipient_cooldown_30d",message:"A sent Gmail message to this recipient exists within the last 30 days."},409);

    let lq=db.from("pppp_representation_opportunity_targets_v1").select("*").eq("target_id",targetId).is("archived_at",null).order("updated_at",{ascending:false}).limit(5);
    if(uuid(oppId))lq=lq.eq("opportunity_id",oppId);
    const lr=await lq;if(lr.error)throw lr.error;
    const links=lr.data||[];if(!links.length)return res({ok:false,error:"linked_representation_opportunity_required"},409);
    const link=links[0];
    const oq=await db.from("pppp_representation_opportunities_v1").select("*").eq("id",link.opportunity_id).is("archived_at",null).maybeSingle();
    if(oq.error||!oq.data)return res({ok:false,error:"representation_opportunity_not_found"},404);
    const op=oq.data;
    const sig=await gmailSignature(),msg=message(tg,op,link,sig);
    const d=await createDraft(recipient,msg.subject,msg.plain,msg.html,{
      "X-PPPP-Representation-Target":targetId,
      "X-PPPP-Representation-Opportunity":t(op.id,80)
    });
    const now=new Date().toISOString();
    const up=await db.from("pppp_representation_targets_v1").update({
      gmail_draft_id:d.draft_id,gmail_last_message_id:d.message_id,gmail_thread_id:d.thread_id,
      stage:"draft_ready",next_action:"Review the Gmail draft and send manually if approved.",updated_at:now
    }).eq("id",targetId).select("id,stage,gmail_draft_id,gmail_last_message_id,gmail_thread_id").single();
    if(up.error)throw up.error;
    return res({ok:true,existing:false,target_id:targetId,opportunity_id:op.id,recipient,subject:msg.subject,...d,gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+encodeURIComponent(d.thread_id||"")});
  }catch(e){console.error(V,e);return res({ok:false,error:t((e as any)?.message||e,900)},400);}
});