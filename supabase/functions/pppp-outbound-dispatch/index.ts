import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SA_JSON=Deno.env.get("GOOGLE_SA_JSON")!;
const GMAIL_USER=Deno.env.get("GMAIL_USER")||"arianit.vllahiu@prissteel.com";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const ENGINE="pppp-outbound-dispatch-v5-global-live-domain-guard";

const cors={
  "Access-Control-Allow-Headers":"content-type, x-pppp-cron-secret",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
  "Content-Type":"application/json"
};
const text=(v:any,max=1000)=>String(v==null?"":v).replace(/[\r\n]+/g," ").trim().slice(0,max);
const lower=(v:any)=>text(v,1000).toLowerCase();
const emailRe=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const GMAIL_SCOPE="https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.readonly";

function b64url(input:Uint8Array|string){
  const bytes=typeof input==="string"?new TextEncoder().encode(input):input;
  let bin="";for(const b of bytes)bin+=String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function pemToArrayBuffer(pem:string){
  const body=pem.replace(/-----BEGIN PRIVATE KEY-----/,"").replace(/-----END PRIVATE KEY-----/,"").replace(/\s+/g,"");
  const bin=atob(body),buf=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  return buf.buffer;
}
let cachedToken:{token:string;exp:number}|null=null;
async function gmailToken(){
  const now=Math.floor(Date.now()/1000);
  if(cachedToken&&cachedToken.exp>now+60)return cachedToken.token;
  const sa=JSON.parse(SA_JSON);
  const header={alg:"RS256",typ:"JWT"};
  const claim={iss:sa.client_email,sub:GMAIL_USER,scope:GMAIL_SCOPE,aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600};
  const unsigned=`${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key=await crypto.subtle.importKey("pkcs8",pemToArrayBuffer(sa.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const sig=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(unsigned)));
  const jwt=`${unsigned}.${b64url(sig)}`;
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(`google_token_${r.status}:${JSON.stringify(data).slice(0,300)}`);
  cachedToken={token:data.access_token,exp:now+(data.expires_in||3600)};
  return cachedToken.token;
}
async function authorizationMode(req:Request){
  const provided=req.headers.get("x-pppp-cron-secret")||"";
  if(provided){
    const {data,error}=await db.rpc("gmail_tracker_cron_authorized",{provided});
    if(!error&&data===true)return "internal_cron";
  }
  return "";
}
async function gmail(path:string,init:RequestInit={}){
  const tk=await gmailToken();
  const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}${path}`,{
    ...init,
    headers:{Authorization:`Bearer ${tk}`,"Content-Type":"application/json",...(init.headers||{})}
  });
  const raw=await r.text();
  const data=raw?JSON.parse(raw):{};
  if(!r.ok)throw new Error(`gmail_${r.status}:${JSON.stringify(data).slice(0,500)}`);
  return data;
}
function header(m:any,name:string){
  return text((m?.payload?.headers||[]).find((h:any)=>lower(h?.name)===name.toLowerCase())?.value,3000);
}
function emails(v:any){
  return (text(v,5000).match(emailRe)||[]).map((x:string)=>x.toLowerCase());
}
function emailDomain(v:string){
  const e=lower(v),i=e.lastIndexOf("@");return i>0?e.slice(i+1).replace(/^www\./,""):"";
}
async function gmailMessageMeta(id:string){
  const qs=new URLSearchParams({format:"metadata"});
  qs.append("metadataHeaders","To");
  qs.append("metadataHeaders","Cc");
  qs.append("metadataHeaders","Bcc");
  qs.append("metadataHeaders","Subject");
  return gmail("/messages/"+encodeURIComponent(id)+"?"+qs.toString());
}
async function cooldownPolicy(){
  const {data,error}=await db.from("pppp_outbound_policy_v1").select("recipient_cooldown_days,domain_cooldown_days").eq("id","global").maybeSingle();
  if(error)throw error;
  return {recipientDays:Math.max(1,Number(data?.recipient_cooldown_days||30)),domainDays:Math.max(1,Number(data?.domain_cooldown_days||14))};
}
async function recentSentToExact(recipient:string,days:number){
  const qs=new URLSearchParams({q:"in:sent to:"+recipient+" newer_than:"+days+"d",maxResults:"10"});
  const x=await gmail("/messages?"+qs.toString());
  return (x?.messages||[])[0]||null;
}
async function recentSentToDomain(domain:string,days:number){
  const d=lower(domain);if(!d)return null;
  const qs=new URLSearchParams({q:"in:sent newer_than:"+days+"d "+d,maxResults:"20"});
  const x=await gmail("/messages?"+qs.toString());
  for(const ref of x?.messages||[]){
    const m=await gmailMessageMeta(ref.id);
    const recipients=[...emails(header(m,"To")),...emails(header(m,"Cc")),...emails(header(m,"Bcc"))];
    if(recipients.some((e:string)=>emailDomain(e)===d))return ref;
  }
  return null;
}
async function markFailed(queueId:string,claimToken:string,error:any){
  try{
    await db.rpc("pppp_outbound_mark_dispatch_failed_v1",{
      p_queue_id:queueId,
      p_claim_token:claimToken,
      p_error:text(error instanceof Error?error.message:error,900)
    });
  }catch{}
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(!["GET","POST"].includes(req.method))return new Response(JSON.stringify({ok:false,error:"GET_or_POST_required"}),{status:405,headers:cors});

  const mode=await authorizationMode(req);
  if(!mode)return new Response(JSON.stringify({ok:false,error:"unauthorized"}),{status:401,headers:cors});

  try{
    const u=new URL(req.url);
    let body:any={};
    if(req.method==="POST"){try{body=await req.json();}catch{}}
    const queueId=text(body?.queue_id||u.searchParams.get("queue_id")||"",80);
    if(!queueId)return new Response(JSON.stringify({ok:false,error:"queue_id_required",dispatched:false}),{status:400,headers:cors});

    const claimToken=crypto.randomUUID();
    const {data:claim,error:claimError}=await db.rpc("pppp_outbound_claim_for_dispatch_v1",{
      p_queue_id:queueId,
      p_claim_token:claimToken
    });
    if(claimError)throw claimError;
    if(!claim?.ok){
      return new Response(JSON.stringify({ok:true,dispatched:false,reason:claim?.reason||"guard_blocked",detail:claim?.detail||null,authorization_mode:mode}),{headers:cors});
    }

    try{
      const draftId=text(claim.draft_id,250);
      const recipient=lower(claim.recipient_email);
      if(!draftId||!recipient)throw new Error("claim_missing_draft_or_recipient");

      const qs=new URLSearchParams({format:"metadata"});
      qs.append("metadataHeaders","To");
      qs.append("metadataHeaders","Subject");
      const draft=await gmail(`/drafts/${encodeURIComponent(draftId)}?${qs.toString()}`);
      const liveRecipients=emails(header(draft?.message,"To"));
      if(!liveRecipients.includes(recipient))throw new Error(`live_draft_recipient_mismatch:${recipient}`);

      const {data:qrow,error:qrowError}=await db.from("pppp_outbound_queue_v1").select("source,source_record_id,touch_no,company_domain").eq("id",queueId).single();
      if(qrowError)throw qrowError;
      if(Number(qrow?.touch_no||1)===1){
        const policy=await cooldownPolicy();
        const recent=await recentSentToExact(recipient,policy.recipientDays);
        if(recent)throw new Error("global_gmail_recipient_cooldown_active:"+recipient);
        const domain=lower(qrow?.company_domain||emailDomain(recipient));
        const domainRecent=await recentSentToDomain(domain,policy.domainDays);
        if(domainRecent)throw new Error("global_gmail_domain_cooldown_active:"+domain);
      }

      const sent=await gmail("/drafts/send",{method:"POST",body:JSON.stringify({id:draftId})});
      if(!sent?.id)throw new Error("gmail_send_missing_message_id");

      const sentAt=new Date().toISOString();
      const {data:marked,error:markError}=await db.rpc("pppp_outbound_mark_sent_v1",{
        p_queue_id:queueId,
        p_claim_token:claimToken,
        p_message_id:String(sent.id),
        p_thread_id:sent.threadId?String(sent.threadId):null,
        p_sent_at:sentAt
      });
      if(markError)throw markError;

      return new Response(JSON.stringify({
        ok:true,
        dispatched:true,
        queue_id:queueId,
        recipient_email:recipient,
        gmail_message_id:sent.id,
        gmail_thread_id:sent.threadId||null,
        sent_at:sentAt,
        canonical_update:marked,
        authorization_mode:mode
      }),{headers:cors});
    }catch(e){
      await markFailed(queueId,claimToken,e);
      throw e;
    }
  }catch(e){
    return new Response(JSON.stringify({ok:false,dispatched:false,error:text(e instanceof Error?e.message:e,1000)}),{status:500,headers:cors});
  }
});
