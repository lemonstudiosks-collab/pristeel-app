import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SA_JSON = Deno.env.get("GOOGLE_SA_JSON") || "";
const GMAIL_USER = (Deno.env.get("GMAIL_USER") || "").toLowerCase();
const db = createClient(SUPABASE_URL, SERVICE_KEY);
const H = {"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"x-pppp-cron-secret,content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const INTERNAL = new Set([GMAIL_USER,"sales@prissteel.com","arianit.vllahiu@prissteel.com","oltian.vllahiu@prissteel.com",...(Deno.env.get("PRISTEEL_INTERNAL_EMAILS")||"").split(/[;,\s]+/)].map(x=>String(x||"").trim().toLowerCase()).filter(Boolean));
const T=(v:any,n=50000)=>String(v??"").trim().slice(0,n);
const E=(v:any)=>(T(v,1000).toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/)||[""])[0];
const day=(v:any)=>{const d=new Date(v); return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):new Date().toISOString().slice(0,10)};
const plusDays=(d:string,n:number)=>{const x=new Date(d+"T00:00:00Z");x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const norm=(v:any)=>T(v,12000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const stop=new Set(["germany","austria","france","denmark","structural","steelworks","construction","metalworking","works","work","stahlbau","stahlbauarbeiten","neubau","gmbh","projekt","project","zusatzliche","fertigungskapazitat","prissteel"]);
const tokens=(v:any)=>[...new Set(norm(v).split(" ").filter(x=>x.length>=5&&!stop.has(x)))];

function b64url(input:Uint8Array|string){const bytes=typeof input==="string"?new TextEncoder().encode(input):input;let bin="";for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function pemBuf(pem:string){const body=pem.replace(/-----BEGIN PRIVATE KEY-----/,"").replace(/-----END PRIVATE KEY-----/,"").replace(/\s+/g,"");const bin=atob(body),buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);return buf.buffer}
let cached:{token:string,exp:number}|null=null;
async function token(){const now=Math.floor(Date.now()/1000);if(cached&&cached.exp>now+60)return cached.token;if(!SA_JSON||!GMAIL_USER)throw new Error("Gmail service account not configured");const sa=JSON.parse(SA_JSON),scope="https://www.googleapis.com/auth/gmail.readonly";const h={alg:"RS256",typ:"JWT"},c={iss:sa.client_email,sub:GMAIL_USER,scope,aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600};const unsigned=`${b64url(JSON.stringify(h))}.${b64url(JSON.stringify(c))}`;const key=await crypto.subtle.importKey("pkcs8",pemBuf(sa.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);const sig=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(unsigned)));const jwt=`${unsigned}.${b64url(sig)}`;const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});const j=await r.json();if(!r.ok)throw new Error(`token ${r.status}: ${JSON.stringify(j)}`);cached={token:j.access_token,exp:now+(j.expires_in||3600)};return cached.token}
async function gmailMessage(id:string){const tk=await token();const fields="id,threadId,internalDate,labelIds,payload(headers)";const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=X-PPPP-Outreach-ID&metadataHeaders=X-PPPP-Action-ID&metadataHeaders=Auto-Submitted&fields=${encodeURIComponent(fields)}`,{headers:{Authorization:`Bearer ${tk}`}});const txt=await r.text();if(r.status===404)return null;if(!r.ok)throw new Error(`Gmail ${id} ${r.status}: ${txt}`);return JSON.parse(txt)}
function hdr(m:any,name:string){return T((m?.payload?.headers||[]).find((x:any)=>String(x?.name||"").toLowerCase()===name.toLowerCase())?.value,3000)}
async function auth(req:Request){const provided=req.headers.get("x-pppp-cron-secret")||"";if(!provided)return false;const {data,error}=await db.rpc("gmail_tracker_cron_authorized",{provided});return !error&&data===true}

function scoreTender(k:any,subject:string,snippet:string){const corpus=norm(`${subject} ${snippet}`);const pub=norm(k.publication_no||"");if(pub&&corpus.includes(pub))return 100;const ts=tokens(k.title||"");let score=0;for(const x of ts)if(corpus.includes(x))score++;const authTokens=tokens(k.authority||"");for(const x of authTokens)if(corpus.includes(x))score+=0.5;return score}
async function candidateTenders(row:any,external:string,meta:any,direction:string){
  const thread=T(row.gmail_thread_id,200);
  const outreachId=T(hdr(meta,"X-PPPP-Outreach-ID"),200);
  const actionId=T(hdr(meta,"X-PPPP-Action-ID"),200);
  const allowedStatuses=direction==="incoming"?["sent"]:["draft_created","sent"];

  if(outreachId){
    const q=await db.from("pppp_opportunity_outreach_registry_v1")
      .select("id,tender_watch_id,recipient_email,status,action_id")
      .eq("outreach_id",outreachId).in("status",allowedStatuses).limit(5);
    if(q.error)throw q.error;
    const ids=[...new Set((q.data||[]).map((x:any)=>T(x.tender_watch_id,80)).filter(Boolean))];
    if(ids.length===1)return{ids,primary:ids[0],method:"ted-registry-outreach-id-v2",confidence:100};
    if(ids.length>1)return{ids:[],primary:null,method:"ambiguous-registry-outreach-id-v2",confidence:0};
  }

  if(actionId&&direction==="outgoing"){
    const q=await db.from("pppp_opportunity_outreach_registry_v1")
      .select("id,tender_watch_id,recipient_email,status,action_id")
      .eq("action_id",actionId).in("status",allowedStatuses).limit(50);
    if(q.error)throw q.error;
    const same=(q.data||[]).filter((x:any)=>!external||E(x.recipient_email)===E(external));
    const ids=[...new Set(same.map((x:any)=>T(x.tender_watch_id,80)).filter(Boolean))];
    if(ids.length===1)return{ids,primary:ids[0],method:"ted-registry-action-id-recipient-v2",confidence:100};
  }

  if(thread){
    const q=await db.from("pppp_opportunity_outreach_registry_v1")
      .select("id,tender_watch_id,recipient_email,status,action_id")
      .eq("gmail_thread_id",thread).in("status",allowedStatuses).limit(50);
    if(q.error)throw q.error;
    const rows=q.data||[];
    const scoped=direction==="outgoing"&&external?rows.filter((x:any)=>E(x.recipient_email)===E(external)):rows;
    const ids=[...new Set(scoped.map((x:any)=>T(x.tender_watch_id,80)).filter(Boolean))];
    if(ids.length===1)return{ids,primary:ids[0],method:"ted-registry-thread-v2",confidence:100};
    if(ids.length>1)return{ids:[],primary:null,method:"ambiguous-registry-thread-v2",confidence:0};

    const h=await db.from("outreach_contacts")
      .select("tender_watch_id,contact_email,status,source")
      .eq("gmail_thread_id",thread)
      .eq("source","ted_award_sales")
      .not("tender_watch_id","is",null)
      .limit(50);
    if(h.error)throw h.error;
    const hist=[...new Set((h.data||[]).map((x:any)=>T(x.tender_watch_id,80)).filter(Boolean))];
    if(hist.length===1)return{ids:hist,primary:hist[0],method:"ted-outreach-thread-history-v2",confidence:98};
    if(hist.length>1)return{ids:[],primary:null,method:"ambiguous-ted-history-thread-v2",confidence:0};
  }

  if(external){
    const re=await db.from("pppp_opportunity_outreach_registry_v1")
      .select("tender_watch_id,recipient_email,status")
      .ilike("recipient_email",external).eq("status","sent").not("tender_watch_id","is",null).limit(50);
    if(re.error)throw re.error;
    const ids=[...new Set((re.data||[]).map((x:any)=>T(x.tender_watch_id,80)).filter(Boolean))];
    if(ids.length===1)return{ids,primary:ids[0],method:"ted-registry-recipient-v6",confidence:96};
    if(ids.length>1)return{ids:[],primary:null,method:"ambiguous-registry-recipient-v6",confidence:0};

    const oh=await db.from("outreach_contacts")
      .select("tender_watch_id,contact_email,status,source")
      .ilike("contact_email",external).eq("source","ted_award_sales").not("tender_watch_id","is",null).limit(50);
    if(oh.error)throw oh.error;
    const hist=[...new Set((oh.data||[]).map((x:any)=>T(x.tender_watch_id,80)).filter(Boolean))];
    if(hist.length===1)return{ids:hist,primary:hist[0],method:"ted-outreach-recipient-history-v6",confidence:94};
    if(hist.length>1)return{ids:[],primary:null,method:"ambiguous-ted-recipient-history-v6",confidence:0};
  }

  return{ids:[],primary:null,method:"no-canonical-ted-identity-v6",confidence:0};
}

function deliveryFailure(meta:any,row:any){
  const from=E(hdr(meta,"From"));
  const subject=T(row?.subject||hdr(meta,"Subject"),1000).toLowerCase();
  const snippet=T(row?.snippet,4000).toLowerCase();
  const daemon=/^(mailer-daemon|postmaster)@/i.test(from);
  const subjectDsn=/(delivery status notification|delivery failure|mail delivery failed|undeliverable|returned mail|failure notice|message blocked)/i.test(subject);
  const smtpFailure=/(recipient address rejected|address not found|user unknown|mailbox unavailable|message blocked|\b550\b|\b5\.[0-9]\.[0-9]\b)/i.test(snippet);
  return daemon||subjectDsn||smtpFailure;
}
function failedRecipient(row:any){
  const corpus=T((row?.subject||"")+" "+(row?.snippet||""),6000);
  const found=(corpus.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig)||[])
    .map((x:string)=>E(x))
    .filter((x:string)=>x&&!INTERNAL.has(x)&&!/^(mailer-daemon|postmaster)@/i.test(x));
  return found[0]||"";
}

function autoTarget(payload:any,direction:string){const names=Array.isArray(payload?.winner?.names)?payload.winner.names.filter(Boolean):[];const single=names.length<=1;return{company_name:single?(payload?.winner?.name||names[0]||null):null,company_type:single?(payload?.winner?.company_type||"unknown"):"unknown",cooperation_angle:payload?.cooperation_angle||null,outreach_kind:direction==="incoming"?"reply":"auto_detected"}}
async function touchOutreach(tenderId:string,email:string,row:any,direction:string){const q=await db.from("outreach_contacts").select("*").eq("tender_watch_id",tenderId).ilike("contact_email",email).order("updated_at",{ascending:false}).limit(1);if(q.error)throw q.error;const existing=q.data?.[0]||null;const d=day(row.sent_at),now=new Date().toISOString();if(direction==="incoming"){if(existing){const u=await db.from("outreach_contacts").update({status:"Replied",replied:true,closed:false,follow_up_date:null,gmail_thread_id:row.gmail_thread_id,gmail_message_id:row.gmail_message_id,updated_at:now}).eq("id",existing.id);if(u.error)throw u.error;return}const k=await db.from("kek_tender_watch").select("payload").eq("id",tenderId).single();if(k.error)throw k.error;const target=autoTarget(k.data?.payload||{},direction);const ins=await db.from("outreach_contacts").insert({tender_watch_id:tenderId,...target,company_domain:email.split("@")[1]||null,contact_email:email,country:k.data?.payload?.winner?.country||null,status:"Replied",bounced:false,replied:true,meeting:false,closed:false,follow_up_date:null,gmail_thread_id:row.gmail_thread_id,gmail_message_id:row.gmail_message_id,source:"ted_award_sales",created_at:now,updated_at:now});if(ins.error)throw ins.error;return}if(existing){const patch:any={status:"Sent",bounced:false,closed:false,follow_up_date:plusDays(d,7),gmail_thread_id:row.gmail_thread_id,gmail_message_id:row.gmail_message_id,updated_at:now};if(!existing.touch_1)patch.touch_1=d;else if(d>existing.touch_1&&!existing.touch_2)patch.touch_2=d;else if(d>(existing.touch_2||existing.touch_1)&&!existing.touch_3)patch.touch_3=d;else if(existing.touch_3&&d>existing.touch_3)patch.touch_3=d;const u=await db.from("outreach_contacts").update(patch).eq("id",existing.id);if(u.error)throw u.error;return}const k=await db.from("kek_tender_watch").select("payload").eq("id",tenderId).single();if(k.error)throw k.error;const target=autoTarget(k.data?.payload||{},direction);const ins=await db.from("outreach_contacts").insert({tender_watch_id:tenderId,...target,company_domain:email.split("@")[1]||null,contact_email:email,country:k.data?.payload?.winner?.country||null,touch_1:d,status:"Sent",bounced:false,replied:false,meeting:false,closed:false,follow_up_date:plusDays(d,7),gmail_thread_id:row.gmail_thread_id,gmail_message_id:row.gmail_message_id,source:"ted_award_sales",created_at:now,updated_at:now});if(ins.error)throw ins.error}
async function touchBounce(tenderId:string,email:string,row:any){
  const q=await db.from("outreach_contacts").select("*").eq("tender_watch_id",tenderId).ilike("contact_email",email).order("updated_at",{ascending:false}).limit(1);
  if(q.error)throw q.error;
  const existing=q.data?.[0]||null,now=new Date().toISOString();
  if(existing){
    const u=await db.from("outreach_contacts").update({
      status:"Bounced",bounced:true,replied:false,closed:false,follow_up_date:null,
      gmail_thread_id:row.gmail_thread_id,gmail_message_id:row.gmail_message_id,
      outreach_kind:"bounce",updated_at:now
    }).eq("id",existing.id);
    if(u.error)throw u.error;
    return;
  }
  const k=await db.from("kek_tender_watch").select("payload").eq("id",tenderId).single();
  if(k.error)throw k.error;
  const target=autoTarget(k.data?.payload||{},"outgoing");
  const ins=await db.from("outreach_contacts").insert({
    tender_watch_id:tenderId,...target,company_domain:email.split("@")[1]||null,contact_email:email,
    country:k.data?.payload?.winner?.country||null,status:"Bounced",bounced:true,replied:false,
    meeting:false,closed:false,follow_up_date:null,gmail_thread_id:row.gmail_thread_id,
    gmail_message_id:row.gmail_message_id,source:"ted_award_sales",outreach_kind:"bounce",
    created_at:now,updated_at:now
  });
  if(ins.error)throw ins.error;
}
async function updateTenderBounce(tenderId:string,email:string,row:any){
  const q=await db.from("kek_tender_watch").select("id,status,payload").eq("id",tenderId).single();
  if(q.error)throw q.error;
  const p=q.data.payload||{},old=p.outreach||{},d=day(row.sent_at);
  p.outreach={...old,status:"bounced",bounced:true,replied:false,follow_up_date:null,last_bounce_at:row.sent_at,
    bounce_gmail_message_id:row.gmail_message_id,gmail_thread_id:row.gmail_thread_id,
    contact_email:email,source:"gmail-ted-sales-reconciler-v6-canonical"};
  p.human_action_required=true;p.next_check_on=d;
  const patch:any={payload:p,updated_at:new Date().toISOString()};
  if(q.data.status!=="ignored")patch.status="review";
  const u=await db.from("kek_tender_watch").update(patch).eq("id",tenderId);
  if(u.error)throw u.error;
}

async function updateTender(tenderId:string,email:string,row:any,direction:string){const q=await db.from("kek_tender_watch").select("id,status,payload").eq("id",tenderId).single();if(q.error)throw q.error;const p=q.data.payload||{},old=p.outreach||{},d=day(row.sent_at);if(direction==="incoming"){p.outreach={...old,status:"replied",replied:true,last_reply_at:row.sent_at,reply_gmail_message_id:row.gmail_message_id,gmail_thread_id:row.gmail_thread_id,contact_email:email,source:"gmail-ted-sales-reconciler-v6-canonical"};p.human_action_required=true;p.next_check_on=d}else{p.outreach={...old,status:"sent",replied:old.replied===true,last_sent_at:row.sent_at,gmail_message_id:row.gmail_message_id,gmail_thread_id:row.gmail_thread_id,contact_email:email,follow_up_date:plusDays(d,7),source:"gmail-ted-sales-reconciler-v6-canonical"};p.human_action_required=false;p.next_check_on=plusDays(d,7)}const patch:any={payload:p,updated_at:new Date().toISOString()};if(q.data.status!=="ignored")patch.status="review";const u=await db.from("kek_tender_watch").update(patch).eq("id",tenderId);if(u.error)throw u.error}

async function removeInvalid(row:any,kind:string){const del=await db.from("project_emails").delete().eq("id",row.id).is("project_id",null);if(del.error)throw del.error;return{kind,id:row.gmail_message_id}}
async function markEmailReview(row:any,reason:string,method:string){
  const u=await db.from("project_emails").update({
    direction:"incoming",needs_review:true,review_reason:reason,match_method:method,match_confidence:0,updated_at:new Date().toISOString()
  }).eq("id",row.id).is("project_id",null);
  if(u.error)throw u.error;
}
async function linkRow(row:any,meta:any){
  const labels=new Set((meta?.labelIds||[]).map((x:any)=>String(x)));
  if(labels.has("DRAFT"))return removeInvalid(row,"draft_removed");
  const from=E(hdr(meta,"From")),sent=labels.has("SENT");
  if(INTERNAL.has(from)&&!sent)return removeInvalid(row,"unsent_internal_removed");

  if(deliveryFailure(meta,row)){
    const failed=failedRecipient(row);
    if(!failed){
      await markEmailReview(row,"Gmail delivery failure detected, but failed recipient could not be extracted.","ted-bounce-recipient-missing-v6");
      return{kind:"unmatched_bounce",id:row.gmail_message_id,method:"ted-bounce-recipient-missing-v6"};
    }
    const c=await candidateTenders(row,failed,meta,"incoming");
    if(!c.ids.length){
      await markEmailReview(row,"Gmail delivery failure detected for "+failed+", but no unique TED outreach identity could be resolved.",c.method||"ted-bounce-unmatched-v6");
      return{kind:"unmatched_bounce",id:row.gmail_message_id,recipient:failed,method:c.method||"ted-bounce-unmatched-v6"};
    }
    for(const tid of c.ids){
      const ins=await db.from("tender_email_links").upsert({
        tender_watch_id:tid,gmail_message_id:row.gmail_message_id,gmail_thread_id:row.gmail_thread_id,
        link_method:c.method,confidence:c.confidence,created_at:new Date().toISOString()
      },{onConflict:"tender_watch_id,gmail_message_id",ignoreDuplicates:true});
      if(ins.error)throw ins.error;
      await touchBounce(tid,failed,row);
      await updateTenderBounce(tid,failed,row);
    }
    const u=await db.from("project_emails").update({
      direction:"incoming",tender_watch_id:c.primary,match_method:c.method,match_confidence:c.confidence,
      needs_review:false,review_reason:null,updated_at:new Date().toISOString()
    }).eq("id",row.id).is("project_id",null);
    if(u.error)throw u.error;
    return{kind:"bounce_linked",id:row.gmail_message_id,recipient:failed,tenders:c.ids,primary:c.primary,method:c.method};
  }

  const direction=sent?"outgoing":"incoming";
  const external=direction==="outgoing"
    ?[...(row.to_emails||[]),...(row.cc_emails||[])].map(E).find((x:string)=>x&&!INTERNAL.has(x))||""
    :(!INTERNAL.has(from)?from:"");
  if(!external)return{kind:"no_external_party",id:row.gmail_message_id};
  if(row.direction!==direction){
    const u=await db.from("project_emails").update({direction,updated_at:new Date().toISOString()}).eq("id",row.id);
    if(u.error)throw u.error;
  }
  const c=await candidateTenders(row,external,meta,direction);
  if(!c.ids.length){
    if(c.confidence>0&&c.method!=="none"){
      const reason=c.method.startsWith("ted-payload")
        ?"Possible TED award match from recipient email, but project evidence is insufficient"
        :"Multiple TED opportunities share this contact; review required";
      const u=await db.from("project_emails").update({
        needs_review:true,review_reason:reason,match_method:c.method,match_confidence:c.confidence,updated_at:new Date().toISOString()
      }).eq("id",row.id).is("project_id",null);
      if(u.error)throw u.error;
      return{kind:"ambiguous",id:row.gmail_message_id,method:c.method};
    }
    return{kind:"unmatched",id:row.gmail_message_id};
  }
  for(const tid of c.ids){
    const ins=await db.from("tender_email_links").upsert({
      tender_watch_id:tid,gmail_message_id:row.gmail_message_id,gmail_thread_id:row.gmail_thread_id,
      link_method:c.method,confidence:c.confidence,created_at:new Date().toISOString()
    },{onConflict:"tender_watch_id,gmail_message_id",ignoreDuplicates:true});
    if(ins.error)throw ins.error;
    await touchOutreach(tid,external,row,direction);
    await updateTender(tid,external,row,direction);
  }
  const u=await db.from("project_emails").update({
    tender_watch_id:c.primary,match_method:c.method,match_confidence:c.confidence,
    needs_review:false,review_reason:null,updated_at:new Date().toISOString()
  }).eq("id",row.id).is("project_id",null);
  if(u.error)throw u.error;
  return{kind:direction==="incoming"?"reply_linked":"sent_linked",id:row.gmail_message_id,tenders:c.ids,primary:c.primary,method:c.method};
}

async function run(days=3,limit=300){const safeDays=Math.max(1,Math.min(14,Number(days)||3)),safeLimit=Math.max(20,Math.min(1000,Number(limit)||300)),since=new Date(Date.now()-safeDays*86400000).toISOString();const q=await db.from("project_emails").select("id,gmail_message_id,gmail_thread_id,project_id,tender_watch_id,direction,from_email,to_emails,cc_emails,subject,snippet,sent_at,match_method").is("project_id",null).is("tender_watch_id",null).gte("sent_at",since).order("sent_at",{ascending:false}).limit(safeLimit);if(q.error)throw q.error;const summary:any={checked:(q.data||[]).length,drafts_removed:0,unsent_internal_removed:0,sent_linked:0,replies_linked:0,bounces_linked:0,unmatched_bounces:0,ambiguous:0,unmatched:0,skipped:0,errors:0,items:[]};for(const row of q.data||[]){try{const meta=await gmailMessage(row.gmail_message_id);if(!meta){summary.skipped++;continue}const r=await linkRow(row,meta);if(r.kind==="draft_removed")summary.drafts_removed++;else if(r.kind==="unsent_internal_removed")summary.unsent_internal_removed++;else if(r.kind==="sent_linked")summary.sent_linked++;else if(r.kind==="reply_linked")summary.replies_linked++;else if(r.kind==="bounce_linked")summary.bounces_linked++;else if(r.kind==="unmatched_bounce")summary.unmatched_bounces++;else if(r.kind==="ambiguous")summary.ambiguous++;else if(r.kind==="unmatched")summary.unmatched++;else summary.skipped++;summary.items.push(r)}catch(e){summary.errors++;summary.items.push({id:row.gmail_message_id,error:T((e as any)?.message||e,500)})}}return summary}

Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:H});if(!(await auth(req)))return new Response(JSON.stringify({ok:false,error:"unauthorized"}),{status:401,headers:H});try{const u=new URL(req.url);const out=await run(Number(u.searchParams.get("days")||3),Number(u.searchParams.get("limit")||300));return new Response(JSON.stringify({ok:true,version:6,...out}),{headers:H})}catch(e){return new Response(JSON.stringify({ok:false,error:T((e as any)?.message||e,1000)}),{status:500,headers:H})}});
