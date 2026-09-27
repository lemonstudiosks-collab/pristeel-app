import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")||"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const A=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SA=Deno.env.get("GOOGLE_SA_JSON")||"";
const GU=(Deno.env.get("GMAIL_USER")||"").toLowerCase();
const db=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const V="pppp-dach-steel-draft-generator-v23-canonical-material-copy-v4";
const SRC="DACH_STEEL_BUYER";
const C={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const t=(v:any,n=12000)=>String(v==null?"":v).replace(/\r/g,"").trim().slice(0,n);
const em=(v:any)=>t(v,320).toLowerCase();
const nm=(v:any)=>t(v,500).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const res=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...C,"Cache-Control":"no-store"}});
const uuid=(v:any)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t(v,80));
const dom=(v:any)=>{const e=em(v),i=e.lastIndexOf("@");return i>0?e.slice(i+1):"";};
const local=(v:any)=>(em(v).split("@")[0]||"").replace(/\+.*/,"");
const badLocal=new Set(["jobs","careers","career","hr","humanresources","recruiting","privacy","gdpr","webmaster","press","presse","media","marketing","newsletter","noreply","no-reply","donotreply","dpo","security","abuse"]);
const badDom=new Set(["gmail.com","googlemail.com","hotmail.com","outlook.com","live.com","yahoo.com","icloud.com","aol.com","example.com","example.org","example.net"]);
const recover=new Set(["gmail_draft_missing","gmail_draft_stale","draft_missing","draft_stale"]);
const SIG_LOGO_B64="";

function safe(v:any){const e=em(v),d=dom(e);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))throw new Error("valid_recipient_email_required");if(d==="prissteel.com")throw new Error("internal_recipient_not_allowed");if(badLocal.has(local(e)))throw new Error("unsafe_recipient_localpart");if(badDom.has(d))throw new Error("personal_or_test_recipient_domain_not_allowed");return e;}
function b64u(input:Uint8Array|string){const bytes=typeof input==="string"?new TextEncoder().encode(input):input;let b="";for(const x of bytes)b+=String.fromCharCode(x);return btoa(b).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function pem(p:string){const s=p.replace(/-----BEGIN PRIVATE KEY-----/,"").replace(/-----END PRIVATE KEY-----/,"").replace(/\s+/g,"");const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer;}
function b64(v:string){let b="";for(const x of new TextEncoder().encode(v))b+=String.fromCharCode(x);return btoa(b);}
function mh(v:any){const s=t(v,500).replace(/[\r\n]+/g," ");return /[^\x20-\x7E]/.test(s)?"=?UTF-8?B?"+b64(s)+"?=":s;}
let tc:{token:string;exp:number}|null=null;
async function token(){
 const now=Math.floor(Date.now()/1000);if(tc&&tc.exp>now+60)return tc.token;if(!SA||!GU)throw new Error("gmail_service_account_missing");
 const sa=JSON.parse(SA),h={alg:"RS256",typ:"JWT"},cl={iss:sa.client_email,sub:GU,scope:"https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.readonly",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600};
 const u=b64u(JSON.stringify(h))+"."+b64u(JSON.stringify(cl)),k=await crypto.subtle.importKey("pkcs8",pem(sa.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]),sg=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",k,new TextEncoder().encode(u))),jwt=u+"."+b64u(sg);
 const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})}),d=await r.json();if(!r.ok)throw new Error("gmail_token_"+r.status);tc={token:d.access_token,exp:now+(d.expires_in||3600)};return tc.token;
}

let stc:{token:string;exp:number}|null=null;
let sgc:{html:string;exp:number}|null=null;
async function settingsToken(){
 const now=Math.floor(Date.now()/1000);if(stc&&stc.exp>now+60)return stc.token;if(!SA||!GU)throw new Error("gmail_service_account_missing");
 const sa=JSON.parse(SA),h={alg:"RS256",typ:"JWT"},cl={iss:sa.client_email,sub:GU,scope:"https://www.googleapis.com/auth/gmail.settings.basic",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600};
 const u=b64u(JSON.stringify(h))+"."+b64u(JSON.stringify(cl)),k=await crypto.subtle.importKey("pkcs8",pem(sa.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]),sg=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",k,new TextEncoder().encode(u))),jwt=u+"."+b64u(sg);
 const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});
 let d:any={};try{d=await r.json();}catch{}
 if(!r.ok)throw new Error("gmail_settings_token_"+r.status);
 stc={token:d.access_token,exp:now+(d.expires_in||3600)};return stc.token;
}
async function gmailSignature(){
 const now=Math.floor(Date.now()/1000);if(sgc&&sgc.exp>now+60)return sgc.html;
 try{
  const tk=await settingsToken(),r=await fetch("https://gmail.googleapis.com/gmail/v1/users/"+encodeURIComponent(GU)+"/settings/sendAs",{headers:{Authorization:"Bearer "+tk}});
  let d:any={};try{d=await r.json();}catch{}
  if(!r.ok)throw new Error("gmail_signature_read_"+r.status);
  const rows=Array.isArray(d?.sendAs)?d.sendAs:[],preferred=rows.find((x:any)=>em(x?.sendAsEmail)==="arianit.vllahiu@prissteel.com")||rows.find((x:any)=>x?.isDefault)||rows.find((x:any)=>x?.isPrimary)||null;
  const html=t(preferred?.signature||"",20000);
  sgc={html,exp:now+900};return html;
 }catch(e){console.warn(V,"gmail signature fallback",e);sgc={html:"",exp:now+300};return"";}
}
async function gmail(path:string){
 const tk=await token(),r=await fetch("https://gmail.googleapis.com/gmail/v1/users/"+encodeURIComponent(GU)+path,{headers:{Authorization:"Bearer "+tk}});
 let d:any={};try{d=await r.json();}catch{}
 if(!r.ok)throw new Error("gmail_read_"+r.status+":"+t(JSON.stringify(d),500));
 return d;
}
function hv(headers:any[],name:string){const n=name.toLowerCase();return t((headers||[]).find((x:any)=>String(x?.name||"").toLowerCase()===n)?.value,1000);}
function mb(v:any){const s=t(v,1000),m=s.match(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i);return em(m?.[0]||s);}
function when(m:any){const n=Number(m?.internalDate||0);return n>0?new Date(n).toISOString():null;}
function normSubject(v:any){return nm(v).replace(/^\s*(re|fw|fwd|aw|wg)\s*:\s*/i,"").replace(/\s+/g," ").trim();}
function projectTokens(tg:any){
 const stop=new Set(["stahlbau","stahlbauarbeiten","stahlkonstruktionen","projekt","project","sanierung","arbeiten","construction","konstruktionen"]);
 return normSubject(tg?.project_title||"").split(/[^a-z0-9äöüß]+/i).filter((x:string)=>x.length>=5&&!stop.has(x)).slice(0,10);
}
function sameProject(subject:any,tg:any){
 const s=normSubject(subject),ref=nm(tg?.project_reference||"");
 if(ref&&s.includes(ref))return true;
 const tok=projectTokens(tg);if(!tok.length)return false;
 let hit=0;for(const x of tok)if(s.includes(x))hit++;
 return hit>=Math.min(2,tok.length);
}
async function threadLifecycle(threadId:any){
 const id=t(threadId,500);if(!id)return{sent:null,reply:null,messages:[]};
 const d=await gmail("/threads/"+encodeURIComponent(id)+"?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&fields=id,messages(id,threadId,internalDate,labelIds,payload(headers))");
 const msgs=(d?.messages||[]).map((m:any)=>({id:t(m?.id,500),thread_id:t(m?.threadId,500),at:when(m),labels:Array.isArray(m?.labelIds)?m.labelIds:[],from:mb(hv(m?.payload?.headers,"From")),to:mb(hv(m?.payload?.headers,"To")),subject:hv(m?.payload?.headers,"Subject")})).sort((a:any,b:any)=>String(a.at||"").localeCompare(String(b.at||"")));
 const sent=msgs.filter((m:any)=>m.labels.includes("SENT")||m.from===GU).slice(-1)[0]||null;
 const reply=sent?msgs.filter((m:any)=>m.from&&m.from!==GU&&m.at&&String(m.at)>String(sent.at||"")).slice(-1)[0]||null:null;
 return{sent,reply,messages:msgs};
}
async function recentSentTo(recipient:any,days:number){
 const e=safe(recipient),d=Math.max(1,Math.min(60,Math.floor(days||30))),q=encodeURIComponent("in:sent to:"+e+" newer_than:"+d+"d");
 const x=await gmail("/messages?maxResults=10&q="+q+"&fields=messages(id,threadId),resultSizeEstimate");
 const rows=Array.isArray(x?.messages)?x.messages:[];
 if(!rows.length)return null;
 const m=rows[0],meta=await gmail("/messages/"+encodeURIComponent(m.id)+"?format=metadata&metadataHeaders=To&metadataHeaders=From&metadataHeaders=Subject&fields=id,threadId,internalDate,labelIds,payload(headers)");
 return{id:t(meta?.id,500),thread_id:t(meta?.threadId||m?.threadId,500),at:when(meta),subject:hv(meta?.payload?.headers,"Subject"),to:mb(hv(meta?.payload?.headers,"To")),from:mb(hv(meta?.payload?.headers,"From"))};
}
async function recentSentToDomain(domain:any,days:number){
 const d=nm(domain),n=Math.max(1,Math.min(60,Math.floor(days||14)));if(!d)return null;
 const q=encodeURIComponent("in:sent newer_than:"+n+"d "+d),x=await gmail("/messages?maxResults=20&q="+q+"&fields=messages(id,threadId),resultSizeEstimate");
 for(const m of Array.isArray(x?.messages)?x.messages:[]){
  const meta=await gmail("/messages/"+encodeURIComponent(m.id)+"?format=metadata&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Bcc&metadataHeaders=Subject&fields=id,threadId,internalDate,labelIds,payload(headers)");
  const rec=[hv(meta?.payload?.headers,"To"),hv(meta?.payload?.headers,"Cc"),hv(meta?.payload?.headers,"Bcc")].join(" ").toLowerCase();
  if(rec.includes("@"+d))return{id:t(meta?.id,500),thread_id:t(meta?.threadId||m?.threadId,500),at:when(meta),subject:hv(meta?.payload?.headers,"Subject")};
 }
 return null;
}
async function applyLifecycle(tg:any,q:any,life:any){
 const sent=life?.sent,reply=life?.reply;if(!sent)return null;
 const now=new Date().toISOString(),status=reply?"replied":"sent";
 let replyClass:any=null;
 if(reply){const rc=await db.rpc("pppp_outreach_reply_classification_v2",{p_subject:reply.subject||"",p_snippet:""});if(!rc.error)replyClass=rc.data;}
 const payload={...(q?.payload&&typeof q.payload==="object"?q.payload:{}),gmail_reconciled_at:now,gmail_sent_message_id:sent.id,gmail_sent_thread_id:sent.thread_id||q.gmail_thread_id};
 if(reply){payload.gmail_reply_message_id=reply.id;payload.gmail_reply_at=reply.at;payload.reply_classification=replyClass;}
 const qu=await db.from("pppp_outbound_queue_v1").update({
  status,sent_at:q.sent_at||sent.at||now,replied_at:reply?.at||q.replied_at||null,gmail_thread_id:sent.thread_id||q.gmail_thread_id,
  workflow_state:status,delivered_at:q.delivered_at||sent.at||now,
  reply_classification:replyClass?.category||q.reply_classification||null,reply_evidence:replyClass?.evidence||q.reply_evidence||{},
  suppression_reason:null,approved_for_send:false,payload,updated_at:now
 }).eq("id",q.id).select("*").single();
 if(qu.error)throw qu.error;
 const next=reply?"Buyer replied — review the Gmail thread and classify whether an RFQ/BOQ was received.":"Waiting for buyer reply / RFQ. Do not send another cold outreach while cooldown is active.";
 const tu=await db.from("pppp_dach_steel_targets_v1").update({outreach_status:status,workflow_state:status,reply_classification:replyClass?.category||tg.reply_classification||null,reply_evidence:replyClass?.evidence||tg.reply_evidence||{},next_action:next,updated_at:now}).eq("id",tg.id);
 if(tu.error)throw tu.error;
 return qu.data;
}
async function syncLifecycle(){
 const qr=await db.from("pppp_outbound_queue_v1").select("*").eq("source",SRC).not("gmail_thread_id","is",null).in("status",["candidate","planned","stale","sent","replied"]).order("updated_at",{ascending:false}).limit(60);
 if(qr.error)throw qr.error;
 let checked=0,sent=0,replied=0,errors=0;
 for(const q of qr.data||[]){
  try{
   const tr=await db.from("pppp_dach_steel_targets_v1").select("*").eq("id",q.source_record_id).maybeSingle();if(tr.error||!tr.data)continue;
   const life=await threadLifecycle(q.gmail_thread_id);checked++;
   if(life.sent){
    await applyLifecycle(tr.data,q,life);
    if(life.reply)replied++;else sent++;
   }
  }catch(e){errors++;console.error(V,"sync row",q?.id,e);}
 }
 return{checked,sent,replied,errors,ted_opportunities_touched:false};
}
async function user(auth:string){if(!A)throw new Error("supabase_anon_key_missing");const c=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}}),q=await c.auth.getUser();if(q.error||!q.data?.user)throw new Error("unauthorized");return q.data.user;}
async function draft(to:string,subject:string,body:string,h:Record<string,string>,htmlBody=""){
 const head=["To: "+mh(to),"Subject: "+mh(subject),...Object.entries(h).map(x=>x[0]+": "+mh(x[1])),"MIME-Version: 1.0"];
 let raw="";
 if(htmlBody){
  const alt="alt_"+crypto.randomUUID().replace(/-/g,"");
  if(SIG_LOGO_B64&&htmlBody.includes("cid:prissteel-signature-logo")){
   const rel="rel_"+crypto.randomUUID().replace(/-/g,""),logo=SIG_LOGO_B64.replace(/(.{76})/g,"$1\r\n");
   raw=[...head,'Content-Type: multipart/related; boundary="'+rel+'"',"","--"+rel,'Content-Type: multipart/alternative; boundary="'+alt+'"',"","--"+alt,"Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: 8bit","",body,"","--"+alt,"Content-Type: text/html; charset=UTF-8","Content-Transfer-Encoding: 8bit","",htmlBody,"","--"+alt+"--","--"+rel,'Content-Type: image/png; name="prissteel-signature-logo.png"',"Content-Transfer-Encoding: base64",'Content-ID: <prissteel-signature-logo>','Content-Disposition: inline; filename="prissteel-signature-logo.png"',"",logo,"--"+rel+"--",""].join("\r\n");
  }else{
   raw=[...head,'Content-Type: multipart/alternative; boundary="'+alt+'"',"","--"+alt,"Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: 8bit","",body,"","--"+alt,"Content-Type: text/html; charset=UTF-8","Content-Transfer-Encoding: 8bit","",htmlBody,"","--"+alt+"--",""].join("\r\n");
  }
 }else{
  raw=[...head,"Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: 8bit","",body,""].join("\r\n");
 }
 const tk=await token(),r=await fetch("https://gmail.googleapis.com/gmail/v1/users/"+encodeURIComponent(GU)+"/drafts",{method:"POST",headers:{Authorization:"Bearer "+tk,"Content-Type":"application/json"},body:JSON.stringify({message:{raw:b64u(raw)}})}),d=await r.json();if(!r.ok)throw new Error("gmail_draft_"+r.status+":"+t(JSON.stringify(d),500));return{draft_id:t(d?.id,500),message_id:t(d?.message?.id,500),thread_id:t(d?.message?.threadId,500)};
}
async function del(id:string){if(!id)return;try{const tk=await token();await fetch("https://gmail.googleapis.com/gmail/v1/users/"+encodeURIComponent(GU)+"/drafts/"+encodeURIComponent(id),{method:"DELETE",headers:{Authorization:"Bearer "+tk}});}catch{}}
const signature=["Arianit Vllahiu","Head of Business Development","+383 (0) 44 244 699","arianit.vllahiu@prissteel.com","www.prissteel.com"].join("\n");
const htmlEsc=(v:any)=>String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const canonicalSignatureHtml='<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin-top:12px"><div style="font-size:18px;line-height:1.25;font-weight:700">Arianit Vllahiu</div><div style="font-size:16px;line-height:1.35">Head of Business Development</div><div style="height:8px"></div><div style="font-size:15px;line-height:1.55"><a href="tel:+38344244699">+383 (0) 44 244 699</a><br><a href="mailto:arianit.vllahiu@prissteel.com">arianit.vllahiu@prissteel.com</a><br><a href="https://www.prissteel.com">www.prissteel.com</a></div></div>'

function mat(tg:any){const m=tg?.material_scope&&typeof tg.material_scope==="object"?tg.material_scope:{},a=Array.isArray(m.line_items)?m.line_items:[];if(a.length)return a.slice(0,30).map((x:any)=>{const n=[t(x?.family,100),t(x?.designation,180)].filter(Boolean).join(" · ")||"Steel material",sp=[t(x?.grade,80),t(x?.standard,120),t(x?.dimension||x?.dimensions,160)].filter(Boolean).join(" / "),q=x?.qty!=null?String(x.qty)+(x?.unit?" "+x.unit:""):(x?.tonnes!=null?String(x.tonnes)+" t":"");return "- "+n+(sp?" | "+sp:"")+(q?" | "+q:"");});return t(tg?.steel_scope,4000).split(/;\s*/).filter(Boolean).map((x:string)=>"- "+x);}
function buyerLang(tg:any){
 const c=t(tg?.country,3).toUpperCase();
 return ["DE","AT","CH"].includes(c)?"de":["HR","ME","RS"].includes(c)?"bcs":"en";
}
function contactTier(email:any,name:any,role:any){
 const lp=local(email),r=nm(role),person=t(name,200);
 if(!em(email)||badLocal.has(lp)||/(marketing|press|presse|media|career|karriere|recruit|human resources|personalwesen|\bhr\b)/.test(r))return"F";
 if(/(einkauf|procurement|purchas|sourcing|beschaffung|ausschreibung|tender|vergabe|stahl|steel|material|supply|sales|verkauf|anfrage|rfq|quote|quotation)/.test(lp))return"C";
 if(/^(info|office|contact|kontakt|hello|mail|admin|sekretariat|zentrale|general)$/.test(lp))return"E";
 if(person&&/(einkauf|procurement|purchas|sourcing|beschaffung|material|supply|buyer)/.test(r))return"A";
 if(/(einkauf|procurement|purchas|sourcing|beschaffung|material|supply|buyer)/.test(r))return"C";
 if(person&&/(project|projekt|technical|technik|commercial|kaufm|construction|bauleit|geschäfts|manag|director|leiter)/.test(r))return"B";
 return person||/^[a-z]+[._-][a-z]+$/.test(lp)?"D":"E";
}
function tierScore(v:string){return v==="A"?95:v==="B"?82:v==="C"?70:v==="D"?55:v==="E"?25:0;}
function specificFacts(tg:any){
 const saved=Array.isArray(tg?.personalization_facts)?tg.personalization_facts:[],evidence=Array.isArray(tg?.evidence)?tg.evidence:[];
 const candidates=[...saved,tg?.project_title,tg?.why_now,tg?.steel_scope,...evidence.map((x:any)=>x&&typeof x==="object"?(x.claim||x.title||x.label||""):x)];
 const out:string[]=[];
 for(const value of candidates){const fact=externalFact(value);if(!fact||/@[a-z0-9.-]+\.[a-z]{2,}/i.test(fact))continue;if(!out.some(x=>nm(x)===nm(fact)))out.push(t(fact,1000));if(out.length>=4)break;}
 return out;
}
function targetQualification(tg:any,contact:any){
 const facts=specificFacts(tg),band=t(tg?.score_band,20).toUpperCase();
 const hasCompanyFit=tg?.company_fit_score!==null&&tg?.company_fit_score!==undefined&&t(tg.company_fit_score,20)!=="";
 const companyFit=hasCompanyFit&&Number.isFinite(Number(tg.company_fit_score))?Number(tg.company_fit_score):(band==="A1"?92:band==="A2"?82:band==="B1"?72:58);
 const timingText=nm(tg?.procurement_timing),award=t(tg?.award_date,40)?new Date(tg.award_date):null,recentAward=!!(award&&!Number.isNaN(award.getTime())&&award.getTime()>=Date.now()-120*86400000);
 const hasTiming=tg?.commercial_timing_score!==null&&tg?.commercial_timing_score!==undefined&&t(tg.commercial_timing_score,20)!=="";
 const timing=hasTiming&&Number.isFinite(Number(tg.commercial_timing_score))?Number(tg.commercial_timing_score):(/(now|current|immediate|active|0.?3)/.test(timingText)?85:recentAward?65:t(tg?.project_title,500)?50:35);
 const timingClass=t(tg?.timing_classification,80)||(/(now|current|immediate|active|0.?3)/.test(timingText)?"active_procurement":recentAward?"post_award_window":t(tg?.project_title,500)?"future_supplier_qualification":"unknown");
 const evidenceCount=Array.isArray(tg?.evidence)?tg.evidence.length:0;
 const hasEvidence=tg?.message_evidence_score!==null&&tg?.message_evidence_score!==undefined&&t(tg.message_evidence_score,20)!=="";
 const messageEvidence=hasEvidence&&Number.isFinite(Number(tg.message_evidence_score))?Number(tg.message_evidence_score):(facts.length>=2?78:evidenceCount>=2?70:35);
 const tier=contactTier(contact?.email,contact?.person,contact?.role),contactQuality=tierScore(tier);
 const reasons=[companyFit<65?"company_fit_below_65":"",contactQuality<50?"contact_quality_below_50":"",messageEvidence<60?"message_evidence_below_60":"",facts.length<2?"fewer_than_two_specific_facts":"",timing<35?"commercial_timing_below_35":""].filter(Boolean);
 const readiness=Math.round(companyFit*.32+timing*.24+contactQuality*.28+messageEvidence*.16);
 const workflow=companyFit>=65&&contactQuality<50?"strong_company_contact_gap":reasons.length===0?"ready_for_outreach":companyFit<65?"disqualified":"research_required";
 return{facts,companyFit,timing,timingClass,messageEvidence,tier,contactQuality,reasons,readiness,workflow};
}
async function qualifyTarget(tg:any,contact:any){
 const payload={
  email:em(contact?.email||""),
  person:t(contact?.person||"",240),
  role:t(contact?.role||"",240),
  source:t(contact?.source||"",120),
  quality:t(contact?.quality||"",80)
 };
 const q=await db.rpc("pppp_dach_steel_refresh_intelligence_v1",{p_target_id:tg.id,p_contact:payload});
 if(q.error)throw q.error;
 const up=await db.from("pppp_dach_steel_targets_v1").select("*").eq("id",tg.id).single();
 if(up.error)throw up.error;
 return up.data;
}
function externalFact(v:any){
 const raw=t(v,2000).replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim(),s=nm(raw);
 if(!raw||/^[-–—]+$/.test(raw)||raw.length>160||/(unknown|company profile|unternehmensprofil|outreach|readiness|draft only|draft vetem|human approval|internal|workflow|personalization|company fit|\bscore\b|pergatit draft|mos e dergo|do not send|prepare (?:a )?draft)/.test(s))return"";
 if(/(?:^|\s)[-•]\s+.+(?:\s[-•]\s+.+){1,}/.test(raw))return"";
 return raw;
}
function materialCategory(tg:any){
 const p=Array.isArray(tg?.products)?tg.products:[],scope=tg?.material_scope&&typeof tg.material_scope==="object"?tg.material_scope:{},lines=Array.isArray(scope.line_items)?scope.line_items:[];
 const raw=[...p,...lines.map((x:any)=>x?.family||x?.product||x?.name),tg?.steel_scope].map(externalFact).find(Boolean)||"structural steel material";
 return t(raw,90);
}
function shortAnchor(v:any,fallback:any){const s=t(v,500).replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();if(!s)return t(fallback,72);return t(s.length<=68?s:(s.match(/\b(?:VOB\s*)?\d{1,3}-[0-9O]{2,4}\b|\b[A-Z]{1,6}[_-]\d{2,}(?:[\/_-]\d+)*\b/i)?.[0]||fallback),72);}
function buyerTextV2(tg:any,signatureHtml="",contact:any={}){
 const lang=buyerLang(tg),de=lang==="de",bcs=lang==="bcs",facts=specificFacts(tg).map(externalFact).filter(Boolean).slice(0,2),motion=t(tg?.outreach_motion||"material_buyer",80),project=externalFact(tg?.project_title),company=t(tg?.company_name,180),category=materialCategory(tg),anchor=shortAnchor(project,company||category),sig=signatureHtml||canonicalSignatureHtml;
 const future=motion==="future_supplier_qualification"||t(tg?.timing_classification,80)==="future_supplier_qualification",capacity=motion==="external_production_capacity",offerModel=future?"future_supplier_qualification":capacity?"external_production_capacity":"material_supply";
 const subject=future?(de?company+" – Lieferantenqualifizierung Stahl | PRISTEEL":bcs?company+" – kvalifikacija dobavljača čelika | PRISTEEL":company+" – future steel supplier qualification | PRISTEEL"):capacity?(de?anchor+" – externe Fertigungskapazität | PRISTEEL":bcs?anchor+" – vanjski proizvodni kapacitet | PRISTEEL":anchor+" – external fabrication capacity | PRISTEEL"):(de?anchor+" – Stahlmaterial | PRISTEEL":bcs?anchor+" – čelični materijal | PRISTEEL":anchor+" – steel material | PRISTEEL");
 const person=t(contact?.person,120),hello=de?(person?"Guten Tag "+person+",":"Guten Tag,"):bcs?(person?"Poštovani "+person+",":"Poštovani,"):(person?"Dear "+person+",":"Hello,");
 const context=project?(de?"ich melde mich bezüglich "+project+".":bcs?"javljam Vam se u vezi sa "+project+".":"I am reaching out regarding "+project+"."):(de?"ich melde mich, weil "+company+" mit "+category+" arbeitet.":bcs?"javljam Vam se jer "+company+" radi sa kategorijom "+category+".":"I am reaching out because "+company+" works with "+category+".");
 const capability=future?(de?"Für künftige Stahlmaterialpakete kann PRISTEEL als technischer und kaufmännischer Ansprechpartner für klar definierte Beschaffungsumfänge eingebunden werden.":bcs?"Za buduće pakete čeličnog materijala PRISTEEL može biti jedna tehnička i komercijalna kontakt tačka.":"For future steel-material packages, PRISTEEL can act as one technical and commercial sourcing point for clearly defined scopes."):capacity?(de?"Wenn Sie externe Fertigung für klar definierte Pakete nutzen, kann PRISTEEL Build-to-Print-Fertigung, Oberflächenschutz, Qualitätsdokumentation und DAP-Lieferung koordinieren.":bcs?"Ako koristite vanjsku proizvodnju za jasno definisane pakete, PRISTEEL može koordinirati build-to-print proizvodnju, zaštitu, dokumentaciju i DAP isporuku.":"If you use external fabrication for defined packages, PRISTEEL can coordinate build-to-print fabrication, surface treatment, quality documentation and DAP delivery."):(de?"PRISTEEL koordiniert "+category+" aus qualifizierten Bezugsquellen in Südosteuropa, einschließlich EN 10204 3.1-Dokumentation, optionalem Zuschnitt bzw. Grundbearbeitung und DAP-Lieferung über einen Ansprechpartner.":bcs?"PRISTEEL koordinira "+category+" iz kvalifikovanih izvora u Jugoistočnoj Evropi, uključujući EN 10204 3.1 dokumentaciju, opciono rezanje/osnovnu obradu i DAP isporuku.":"PRISTEEL coordinates "+category+" from qualified sources in Southeast Europe, including EN 10204 3.1 documentation, optional cutting/basic processing and DAP delivery through one commercial contact.");
 const credibility=de?"Wo vertraglich erforderlich, kann die Leistung über Bankgarantien der ProCredit Bank abgesichert werden.":bcs?"Kada je potrebno, ugovorno izvršenje može biti podržano bankarskim garancijama preko ProCredit Bank.":"Where required, contractual performance can be supported by bank guarantees through ProCredit Bank.";
 const cta=future?(de?"Wer ist bei Ihnen für die Qualifizierung künftiger Lieferanten für Stahlmaterial zuständig?":bcs?"Ko je kod Vas zadužen za kvalifikaciju budućih dobavljača čeličnog materijala?":"Who handles qualification of future steel-material suppliers in your organization?"):capacity?(de?"Nutzen Sie bei Kapazitätsspitzen externe Fertigung für klar abgegrenzte Pakete?":bcs?"Koristite li vanjsku proizvodnju za jasno odvojene pakete?":"Do you use external fabrication for clearly defined packages when internal capacity is constrained?"):(de?"Wenn Sie diese Materialkategorie einkaufen, senden Sie uns gerne eine aktuelle RFQ oder Materialliste mit Lieferort.":bcs?"Ako nabavljate ovu kategoriju materijala, pošaljite nam aktuelni RFQ ili listu materijala i mjesto isporuke.":"If you purchase this material category, send us one current RFQ or material list and the delivery point.");
 const close=de?"Mit freundlichen Grüßen":bcs?"Srdačan pozdrav,":"Kind regards",paras=[hello,context,capability,credibility,cta,close],plainBody=[...paras,"",signature].join("\n\n"),htmlBody='<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.55">'+paras.map((x:string)=>'<p>'+htmlEsc(x)+'</p>').join('')+sig+'</div>',recipientRole=person?(/(einkauf|procurement|purchas|sourcing|beschaffung|material|buyer)/.test(nm(contact?.role))?"named_procurement":"named_general"):(/^(info|office|contact|kontakt|hello|mail|admin)$/.test(local(contact?.email))?"generic_inbox":"functional_procurement");
 return{subject,plain_body:plainBody,body:plainBody,html_body:htmlBody,offer_model:offerModel,company_role:"material_buyer",recipient_role:recipientRole,selected_public_facts:facts,copy_policy_version:"pppp-material-copy-policy-v4",approach_mode:future?"future_supplier_qualification":capacity?"external_production_capacity":"material_buyer",language:lang,personalization_facts:facts};
}
function supplierText(tg:any,c:any){const p=t(tg?.project_title||tg?.company_name,500),m=mat(tg),ind=tg?.quote_readiness!=="M3",de=nm(c?.contact_language).startsWith("de");if(de){const subject=(ind?"Indikative RFQ":"RFQ")+" | "+p,body=["Guten Tag,","",'wir prüfen derzeit die Stahlmaterialbeschaffung für das Projekt „'+p+'“.',"",ind?"Die nachstehenden Mengen basieren derzeit auf veröffentlichten Projektinformationen und sind bis zum Erhalt der finalen BOQ / Materialliste als indikativ zu behandeln:":"Die nachstehenden Positionen basieren auf der verfügbaren Materialliste:","",...m,"","Bitte teilen Sie uns – soweit mit den verfügbaren Angaben möglich – Preis / Einheitspreise, Verfügbarkeit, Lieferzeit, Materialzeugnis EN 10204 3.1, Ursprungsland, Incoterm, Angebotsgültigkeit und Zahlungsbedingungen mit.","",ind?"Die finale Anfrage mit bestätigten Güten, Abmessungen und Mengen folgt nach Erhalt der aktuellen BOQ.":"Bitte kennzeichnen Sie technische Abweichungen eindeutig.","","Mit freundlichen Grüßen",signature].join("\n");return{subject,body};}const subject=(ind?"Indicative RFQ":"RFQ")+" | "+p,body=["Dear Sir or Madam,","",'we are currently reviewing the steel material procurement for the project “'+p+'”.',"",ind?"The quantities below are based on published project information and must be treated as indicative until the final BOQ / material list is received:":"The positions below are based on the available material list:","",...m,"","Please provide, where possible with the currently available information, your price / unit prices, availability, lead time, EN 10204 3.1 certification, country of origin, Incoterm, quotation validity and payment terms.","",ind?"A final RFQ with confirmed grades, dimensions and quantities will follow after receipt of the current BOQ.":"Please identify any technical deviations clearly.","","Kind regards,",signature].join("\n");return{subject,body};}
function requirement(tg:any){const m=tg?.material_scope&&typeof tg.material_scope==="object"?tg.material_scope:{},a=Array.isArray(m.line_items)?m.line_items:[],f:string[]=[],g:string[]=[],s:string[]=[];for(const x of a){const z=[[x?.family,f],[x?.grade,g],[x?.standard,s]] as any;for(const y of z){const v=t(y[0],140);if(v&&!y[1].includes(v))y[1].push(v);}}return{family:f[0]||"structural steel",product_type:f[0]||"structural steel",description:t(tg?.steel_scope,5000),grades:g,standards:s};}

async function buyerContact(tg:any){
 const q=await db.rpc("pppp_dach_steel_contact_intelligence_v1",{p_target_id:tg.id});
 if(q.error)throw q.error;
 const r=q.data&&typeof q.data==="object"?q.data:{};
 const sel=r.selected&&typeof r.selected==="object"?r.selected:{};
 return {
  email:em(sel.email||""),
  person:t(sel.person||"",240),
  role:t(sel.role||"",240),
  source:t(sel.source||"",120),
  quality:t(sel.quality||sel.contact_kind||"",80),
  tier:t(sel.tier||"",20),
  score:Number(sel.contact_quality_score||0),
  contact_quality_score:Number(sel.contact_quality_score||0),
  outreach_allowed:sel.outreach_allowed===true,
  company_domain:t(r.company_domain||tg?.company_domain||"",240),
  candidates:Array.isArray(r.candidates)?r.candidates:[]
 };
}
function contactCandidates(tg:any,contact:any){
 const rows=[contact,...(Array.isArray(contact?.candidates)?contact.candidates:[])],out:any[]=[];
 for(const raw of rows){
  const email=em(raw?.email||raw?.recipient_email||"");if(!email||out.some(x=>x.email===email))continue;
  if(tg?.company_domain&&nm(tg.company_domain)!==nm(dom(email)))continue;
  if(raw?.outreach_allowed===false)continue;
  const person=t(raw?.person||raw?.name||raw?.recipient_name||"",240),role=t(raw?.role||raw?.contact_role||"",240);
  const score=Number(raw?.contact_quality_score??raw?.score??0);
  const tier=t(raw?.tier||"",20)||(score>=90?"A":score>=80?"B":score>=70?"C":score>=50?"D":"F");
  if(score<50)continue;
  out.push({email,person,role,source:t(raw?.source||contact?.source||"public",120),quality:t(raw?.quality||raw?.contact_kind||tier,80),contact_kind:t(raw?.contact_kind||"",80),tier,score,contact_quality_score:score,outreach_allowed:true,source_url:t(raw?.source_url||"",1000)});
 }
 return out.sort((a,b)=>b.score-a.score);
}
function selectedContact(tg:any,contact:any,b:any){
 const rows=contactCandidates(tg,contact),requested=em(b?.recipient_email||"");
 if(!requested)return rows[0]||null;
 const chosen=rows.find(x=>x.email===requested);if(!chosen)throw new Error("selected_contact_not_verified_for_target");
 return {...chosen,person:t(b?.recipient_name||chosen.person,240),role:t(b?.contact_role||chosen.role,240)};
}
async function routingConflicts(tg:any){
 const domain=nm(tg?.company_domain||dom(tg?.canonical_contact_email||""));if(!domain)return[];
 const conflicts:string[]=[];
 const eu=await db.from("pppp_eu_direct_targets_v1").select("id").eq("company_domain_normalized",domain).is("archived_at",null).limit(1);
 if(!eu.error&&(eu.data||[]).length)conflicts.push("Kompanitë EU");
 const rep=await db.from("pppp_representation_targets_v1").select("id").eq("company_domain_normalized",domain).is("archived_at",null).limit(1);
 if(!rep.error&&(rep.data||[]).length)conflicts.push("Përfaqësime");
 const opp=await db.from("pppp_opportunity_company_profiles_v1").select("id,domain").eq("domain",domain).limit(1);
 if(!opp.error&&(opp.data||[]).length)conflicts.push("Mundësitë");
 return conflicts;
}
function relevance(tg:any,contact:any){
 const base=tg?.score_band==="A1"?95:tg?.score_band==="A2"?85:tg?.score_band==="B1"?72:tg?.score_band==="B2"?62:45;
 return Math.max(0,Math.min(100,base+Math.min(5,Math.floor(Number(contact?.score||0)/30))));
}
async function supplierCandidate(tg:any,e:string){const q=await db.rpc("pppp_chatgpt_supplier_intelligence_v1",{p_requirement:requirement(tg),p_project_id:uuid(tg?.project_id)?tg.project_id:null,p_min_qualified:3,p_threshold:70,p_limit:20});if(q.error)throw q.error;const rr=Array.isArray(q.data?.requirements)?q.data.requirements[0]:null,a=Array.isArray(rr?.candidates)?rr.candidates:[],c=a.find((x:any)=>em(x?.email)===e);if(!c)throw new Error("supplier_not_in_current_intelligence_candidates");if(!c.strict_fit&&!c.review_fit)throw new Error("supplier_candidate_not_fit_for_draft");return c;}
async function guards(tg:any,q:any,e:string){
 if(tg?.company_domain&&nm(tg.company_domain)!==nm(dom(e)))throw new Error("recipient_domain_mismatch");
 if(q?.sent_at)throw new Error("buyer_outreach_already_sent");
 if(q?.replied_at)throw new Error("buyer_already_replied");
 if(q?.bounced_at)throw new Error("buyer_recipient_bounced");
 if(q?.approved_for_send)throw new Error("existing_outreach_already_approved");
 const sp=t(q?.suppression_reason,120);if(sp&&!recover.has(sp))throw new Error("outbound_suppressed:"+sp);
 const gg=await db.rpc("pppp_global_communication_guard_v1",{p_recipient_email:e,p_company_domain:tg?.company_domain||dom(e),p_exclude_source:SRC,p_exclude_source_record_id:tg?.id||null,p_exclude_queue_id:q?.id||null});
 if(gg.error)throw gg.error;
 if(!gg.data?.ok)throw new Error("global_communication_guard:"+t(gg.data?.reason||"blocked",160));
 const p=await db.from("pppp_outbound_policy_v1").select("recipient_cooldown_days,domain_cooldown_days").eq("id","global").maybeSingle();if(p.error)throw p.error;
 const rd=Math.max(1,Number(p.data?.recipient_cooldown_days||30)),dd=Math.max(1,Number(p.data?.domain_cooldown_days||14)),rc=new Date(Date.now()-rd*86400000).toISOString(),dc=new Date(Date.now()-dd*86400000).toISOString(),d=dom(e);

 if(q?.gmail_thread_id){
  const life=await threadLifecycle(q.gmail_thread_id);
  if(life.sent){await applyLifecycle(tg,q,life);throw new Error("gmail_sent_history_exists");}
 }
 const gh=await recentSentTo(e,rd);
 if(gh){
  if(sameProject(gh.subject,tg)){
   const life={sent:{id:gh.id,thread_id:gh.thread_id,at:gh.at},reply:null};
   await applyLifecycle(tg,q,life);
   throw new Error("gmail_sent_history_exists");
  }
  throw new Error("gmail_recipient_cooldown_active");
 }
 const ghd=await recentSentToDomain(d,dd);
 if(ghd)throw new Error("gmail_domain_cooldown_active");

 let a=db.from("pppp_outbound_queue_v1").select("id").eq("recipient_email",e).not("sent_at","is",null).gte("sent_at",rc).limit(1);if(q?.id)a=a.neq("id",q.id);const ar=await a;if(ar.error)throw ar.error;if((ar.data||[]).length)throw new Error("recipient_cooldown_active");
 let b=db.from("pppp_outbound_queue_v1").select("id").not("sent_at","is",null).gte("sent_at",dc).or("company_domain.eq."+d+",recipient_email.ilike.%@"+d).limit(1);if(q?.id)b=b.neq("id",q.id);const br=await b;if(br.error)throw br.error;if((br.data||[]).length)throw new Error("domain_cooldown_active");
 let x=db.from("pppp_outbound_queue_v1").select("id").is("sent_at",null).in("status",["candidate","planned"]).or("recipient_email.eq."+e+",company_domain.eq."+d).limit(1);if(q?.id)x=x.neq("id",q.id);const xr=await x;if(xr.error)throw xr.error;if((xr.data||[]).length)throw new Error("cross_source_active_outreach_conflict");
}
async function buyerPreview(tg:any,b:any){
 const resolved=await buyerContact(tg),contact=selectedContact(tg,resolved,b);if(!contact)throw new Error("buyer_contact_required");
 const qi=await db.rpc("pppp_dach_steel_target_intelligence_v1",{p_target_id:tg.id,p_contact:{email:contact.email,person:contact.person||null,role:contact.role||null,source:contact.source||null,quality:contact.quality||null}});
 if(qi.error)throw qi.error;
 const q=qi.data&&typeof qi.data==="object"?qi.data:{};
 const enriched={...tg,company_fit_score:q.company_fit_score,commercial_timing_score:q.commercial_timing_score,timing_classification:q.timing_classification,message_evidence_score:q.message_evidence_score,contact_quality_score:q.contact_quality_score,contact_tier:q.contact_tier,outreach_readiness_score:q.outreach_readiness_score,workflow_state:q.workflow_state,readiness_reasons:Array.isArray(q.readiness_reasons)?q.readiness_reasons:[],personalization_facts:Array.isArray(q.personalization_facts)?q.personalization_facts:[]};
 const copy=buyerTextV2(enriched,canonicalSignatureHtml,contact);
 return{contact,contacts:contactCandidates(tg,resolved),routing_conflicts:await routingConflicts(tg),workflow_state:q.workflow_state,readiness_reasons:Array.isArray(q.readiness_reasons)?q.readiness_reasons:[],readiness_score:Number(q.outreach_readiness_score||0),intelligence_gaps:Array.isArray(q.intelligence_gaps)?q.intelligence_gaps:[],...copy,body:copy.plain_body};
}
async function buyerDraft(tg:any,u:any,b:any){
  const resolved=await buyerContact(tg),chosen=selectedContact(tg,resolved,b);if(!chosen)throw new Error("buyer_contact_required");
  const recipient=em(chosen.email);
  const z=await db.from("pppp_outbound_queue_v1").select("*").eq("source",SRC).eq("source_record_id",tg.id).eq("touch_no",1).eq("recipient_email",recipient).maybeSingle();
  if(z.error)throw z.error;
  let q=z.data||null;
  const contact={...resolved,...chosen,email:recipient};
 if(!recipient)throw new Error("buyer_contact_required");
 const e=safe(recipient);
 tg=await qualifyTarget(tg,{...contact,email:e,person:q?.recipient_name||contact.person,role:q?.contact_role||contact.role});
 const tier=t(tg?.contact_tier,20)||"F",contactScore=Number(tg?.contact_quality_score||0),facts=specificFacts(tg);
 if(t(tg?.outreach_engine_version,20)!=="v2")throw new Error("outreach_v2_candidate_required");
 if(t(tg?.workflow_state,80)!=="ready_for_outreach")throw new Error("outreach_v2_readiness_blocked:"+t(tg?.workflow_state||"missing_state",80)+":"+((Array.isArray(tg?.readiness_reasons)?tg.readiness_reasons:[]).join(",")||"qualification_incomplete"));
 if(Number(tg?.company_fit_score||0)<65)throw new Error("outreach_v2_company_fit_below_65");
 if(Number(tg?.commercial_timing_score||0)<35)throw new Error("outreach_v2_timing_below_35");
 if(contactScore<50)throw new Error("outreach_v2_contact_quality_below_50:"+tier);
 if(Number(tg?.message_evidence_score||0)<60||facts.length<2)throw new Error("outreach_v2_requires_two_specific_facts");
 await guards(tg,q,e);
 const sig=canonicalSignatureHtml,ct=buyerTextV2(tg,sig,contact),d=await draft(e,ct.subject,ct.body,{
  "X-PPPP-DACH-Target-ID":t(tg.id,80),
  "X-PPPP-DACH-Source-Key":t(tg.source_key,500),
  "X-PPPP-DACH-Mode":ct.approach_mode
 },ct.html_body||"");
 try{
   const now=new Date().toISOString(),key=SRC+":"+tg.id+":1:"+e,score=relevance(tg,contact),
  payload={
   ...(q?.payload&&typeof q.payload==="object"?q.payload:{}),
   approach_mode:ct.approach_mode,target_source_key:tg.source_key,subject:ct.subject,
   quote_readiness:tg.quote_readiness,why_now:tg.why_now,steel_scope:tg.steel_scope,country:tg.country,
   contact_resolution:{email:e,person:contact.person||null,role:contact.role||null,source:contact.source||null,quality:contact.quality||null,score:contact.score||0},
   outreach_engine_version:"v2",outreach_motion:ct.approach_mode,pristeel_offer_model:ct.offer_model,personalization_facts:ct.personalization_facts,
   draft_generated_by:V,draft_generated_by_user:u.id,draft_generated_at:now
  };
  let row:any;
  if(q){
   const up=await db.from("pppp_outbound_queue_v1").update({
    source_key:key,project_key:tg.source_key,project_title:tg.project_title,company_name:tg.company_name,
    company_domain:tg.company_domain||contact.company_domain||dom(e),recipient_email:e,
    recipient_name:q.recipient_name||contact.person||tg.company_name,
    contact_role:q.contact_role||contact.role||"Einkauf / Projektleitung",
    relevance_score:Math.max(Number(q.relevance_score||0),score),priority_score:Math.max(Number(q.priority_score||0),score),
    gmail_draft_id:d.draft_id,gmail_draft_message_id:d.message_id,gmail_thread_id:d.thread_id,
    status:"candidate",workflow_state:"draft_created",outreach_engine_version:"v2",outreach_motion:ct.approach_mode,
    company_fit_score:tg.company_fit_score,commercial_timing_score:tg.commercial_timing_score,contact_quality_score:contactScore,
    message_evidence_score:tg.message_evidence_score,outreach_readiness_score:tg.outreach_readiness_score,contact_tier:tier,
    timing_classification:tg.timing_classification,personalization_facts:ct.personalization_facts,readiness_reasons:[],
    suppression_reason:null,planned_date:null,planned_at:null,planned_rank:null,
    approved_for_send:false,human_send_required:true,source_updated_at:tg.updated_at,payload,updated_at:now
   }).eq("id",q.id).select("*").single();
   if(up.error)throw up.error;row=up.data;
  }else{
   const ins=await db.from("pppp_outbound_queue_v1").insert({
    source:SRC,source_record_id:tg.id,source_key:key,touch_no:1,
    project_key:tg.source_key,project_title:tg.project_title,company_name:tg.company_name,
    company_domain:tg.company_domain||contact.company_domain||dom(e),
    recipient_email:e,recipient_name:contact.person||tg.company_name,
    contact_role:contact.role||"Einkauf / Projektleitung",
    relevance_score:score,priority_score:score,
    gmail_draft_id:d.draft_id,gmail_draft_message_id:d.message_id,gmail_thread_id:d.thread_id,
    status:"candidate",workflow_state:"draft_created",outreach_engine_version:"v2",outreach_motion:ct.approach_mode,
    company_fit_score:tg.company_fit_score,commercial_timing_score:tg.commercial_timing_score,contact_quality_score:contactScore,
    message_evidence_score:tg.message_evidence_score,outreach_readiness_score:tg.outreach_readiness_score,contact_tier:tier,
    timing_classification:tg.timing_classification,personalization_facts:ct.personalization_facts,readiness_reasons:[],
    suppression_reason:null,approved_for_send:false,human_send_required:true,
    source_updated_at:tg.updated_at,payload,updated_at:now
   }).select("*").single();
   if(ins.error)throw ins.error;row=ins.data;
  }
  const tu=await db.from("pppp_dach_steel_targets_v1").update({
   company_domain:tg.company_domain||contact.company_domain||dom(e),
   canonical_contact_email:e,canonical_contact_name:contact.person||null,canonical_contact_role:contact.role||null,
   contact_tier:tier,contact_quality_score:contactScore,outreach_engine_version:"v2",workflow_state:"draft_created",
   outreach_motion:ct.approach_mode,pristeel_offer_model:ct.offer_model,personalization_facts:ct.personalization_facts,
   contact_status:"found",outreach_status:"queued",outbound_source_key:key,
   next_action:"Review Gmail draft and shared outbound preflight; sending remains human-approved.",updated_at:now
  }).eq("id",tg.id);
  if(tu.error)throw tu.error;
  if(q?.gmail_draft_id&&q.gmail_draft_id!==d.draft_id)await del(q.gmail_draft_id);
  return{
   created:true,queue:row,draft:d,recipient:e,recipient_name:contact.person||tg.company_name,
   contact_role:contact.role||null,contact_source:contact.source||null,contact_quality:contact.quality||null,
   subject:ct.subject,gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+encodeURIComponent(d.thread_id||d.message_id)
  };
 }catch(err){await del(d.draft_id);throw err;}
}
function followupText(tg:any,contact:any){
 const lang=buyerLang(tg),person=t(contact?.person,240),hello=lang==="de"?(person?"Guten Tag "+person+",":"Guten Tag,"):lang==="bcs"?(person?"Poštovani "+person+",":"Poštovani,"):(person?"Dear "+person+",":"Hello,");
 const subject=(lang==="de"?"Kurze Nachfrage: ":lang==="bcs"?"Kratki podsjetnik: ":"Quick follow-up: ")+t(tg?.project_title||tg?.company_name,500);
 const body=lang==="de"?[hello,"","ich wollte kurz nachfragen, ob meine Nachricht zu Ihrer Beschaffung von Stahlmaterial die richtige Ansprechperson erreicht hat.","","Falls aktuell ein RFQ oder eine Materialliste offen ist, prüfen wir diese gerne. Falls eine andere Person zuständig ist, wäre ich für eine Weiterleitung dankbar.","","Mit freundlichen Grüßen","",signature].join("\n"):
  lang==="bcs"?[hello,"","želio bih samo kratko provjeriti da li je moja poruka o nabavci čeličnog materijala stigla do odgovorne osobe.","","Ako trenutno postoji otvoren RFQ ili lista materijala, rado ćemo je pregledati. Ako je zadužena druga osoba, bili bismo zahvalni za prosljeđivanje.","","Srdačan pozdrav,","",signature].join("\n"):
  [hello,"","I wanted to briefly follow up and check whether my message about your steel-material procurement reached the right person.","","If you currently have an open RFQ or material list, we would be glad to review it. If another colleague is responsible, I would appreciate a referral.","","Kind regards,","",signature].join("\n");
 return{subject,body,html_body:""};
}
async function followupDraft(tg:any,b:any,u:any){
 const resolved=await buyerContact(tg),contact=selectedContact(tg,resolved,b);if(!contact)throw new Error("buyer_contact_required");
 const e=safe(contact.email),firstQ=await db.from("pppp_outbound_queue_v1").select("*").eq("source",SRC).eq("source_record_id",tg.id).eq("touch_no",1).eq("recipient_email",e).maybeSingle();
 if(firstQ.error)throw firstQ.error;const first=firstQ.data;if(!first?.sent_at)throw new Error("followup_requires_confirmed_first_send");if(first.replied_at||nm(first.status)==="replied")throw new Error("followup_blocked_reply_exists");
 const life=first.gmail_thread_id?await threadLifecycle(first.gmail_thread_id):null;if(life?.reply){await applyLifecycle(tg,first,life);throw new Error("followup_blocked_reply_exists");}
 if(Date.now()-new Date(first.sent_at).getTime()<7*86400000)throw new Error("followup_not_due_before_7_days");
 const prior=await db.from("pppp_outbound_queue_v1").select("*").eq("source",SRC).eq("source_record_id",tg.id).eq("touch_no",2).eq("recipient_email",e).maybeSingle();if(prior.error)throw prior.error;if(prior.data?.gmail_draft_id)return{created:false,reused:true,queue:prior.data,gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+encodeURIComponent(prior.data.gmail_thread_id||prior.data.gmail_draft_message_id)};
 const copy=followupText(tg,contact),d=await draft(e,copy.subject,copy.body,{"X-PPPP-DACH-Target-ID":t(tg.id,80),"X-PPPP-DACH-Mode":"human_reviewed_followup"});
 try{
  const now=new Date().toISOString(),key=SRC+":"+tg.id+":2:"+e,ins=await db.from("pppp_outbound_queue_v1").insert({source:SRC,source_record_id:tg.id,source_key:key,touch_no:2,project_key:tg.source_key,project_title:tg.project_title,company_name:tg.company_name,company_domain:tg.company_domain||dom(e),recipient_email:e,recipient_name:contact.person||tg.company_name,contact_role:contact.role||"Purchasing / Procurement",relevance_score:relevance(tg,contact),priority_score:relevance(tg,contact),gmail_draft_id:d.draft_id,gmail_draft_message_id:d.message_id,gmail_thread_id:d.thread_id,status:"candidate",workflow_state:"followup_draft_created",outreach_engine_version:"v2",outreach_motion:"human_reviewed_followup",suppression_reason:null,approved_for_send:false,human_send_required:true,payload:{first_queue_id:first.id,first_sent_at:first.sent_at,followup_due_after_days:7,draft_generated_by:V,draft_generated_by_user:u.id,draft_generated_at:now},updated_at:now}).select("*").single();
  if(ins.error)throw ins.error;return{created:true,queue:ins.data,draft:d,subject:copy.subject,gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+encodeURIComponent(d.thread_id||d.message_id)};
 }catch(err){await del(d.draft_id);throw err;}
}
async function existingSupplierRfq(tg:any,recipient:any){
 const e=safe(recipient);
 if(uuid(tg?.project_id)){
  const q=await db.from("rfq_log").select("id,status,subject,sent_at,created_at").eq("project_id",tg.project_id).eq("supplier_email",e).in("status",["planned","draft","draft_review","sent"]).order("created_at",{ascending:false}).limit(1);
  if(q.error)throw q.error;
  const row=(q.data||[])[0];
  if(row)return{kind:(row.sent_at||nm(row.status)==="sent")?"sent":"registered",source:"rfq_log",id:row.id,subject:row.subject||null};
 }
 const query=encodeURIComponent("{in:sent in:drafts} to:"+e+" newer_than:180d");
 const x=await gmail("/messages?maxResults=20&q="+query+"&fields=messages(id,threadId),resultSizeEstimate");
 for(const m of Array.isArray(x?.messages)?x.messages:[]){
  const meta=await gmail("/messages/"+encodeURIComponent(m.id)+"?format=metadata&metadataHeaders=To&metadataHeaders=From&metadataHeaders=Subject&fields=id,threadId,internalDate,labelIds,payload(headers)");
  const subject=hv(meta?.payload?.headers,"Subject");
  if(!sameProject(subject,tg))continue;
  const labels=Array.isArray(meta?.labelIds)?meta.labelIds:[];
  if(labels.includes("SENT"))return{kind:"sent",source:"gmail",id:t(meta?.id,500),thread_id:t(meta?.threadId||m?.threadId,500),subject,at:when(meta)};
  if(labels.includes("DRAFT"))return{kind:"draft",source:"gmail",id:t(meta?.id,500),thread_id:t(meta?.threadId||m?.threadId,500),subject,at:when(meta)};
 }
 return null;
}
async function supplierDraft(tg:any,b:any,u:any){
 const e=safe(b?.supplier_email),c=await supplierCandidate(tg,e),supplierName=t(c?.name||b?.supplier_name,300);
 if(!uuid(tg?.project_id))throw new Error("supplier_rfq_gate_blocked:client_signal_or_project_required");
 const rfqMode=nm(b?.rfq_mode)==="requote"?"requote":(tg.quote_readiness==="M3"?"firm":"budgetary");
 const gate=await db.rpc("pppp_supplier_rfq_gate_v1",{p_project_id:tg.project_id,p_supplier_name:supplierName,p_supplier_email:e,p_rfq_mode:rfqMode});
 if(gate.error)throw gate.error;
 if(!gate.data?.allowed)throw new Error("supplier_rfq_gate_blocked:"+t(gate.data?.reason||"not_allowed",180));
 const existing=await existingSupplierRfq(tg,e);
 if(existing?.kind==="sent")throw new Error("supplier_rfq_already_sent_for_target");
 if(existing?.kind==="registered")throw new Error("supplier_rfq_already_registered_for_project");
 if(existing?.kind==="draft")return{created:false,reused:true,delegated_to_project_workflow:true,project_id:tg.project_id,recipient:e,supplier_name:supplierName,subject:existing.subject||null,rfq_mode:rfqMode,gate,gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+encodeURIComponent(existing.thread_id||existing.id),created_by:u.id};
 return{created:false,delegated_to_project_workflow:true,project_id:tg.project_id,recipient:e,supplier_name:supplierName,rfq_mode:rfqMode,gate,message:"Supplier fit is confirmed. Create/review the supplier RFQ from the canonical Project workflow so it is logged, reconciled and protected by the Supplier RFQ Gate.",created_by:u.id};
}

async function promoteProject(tg:any,b:any,u:any){
 if(b?.confirm_project_create!==true)throw new Error("project_promotion_confirmation_required");
 if(tg?.project_id){
  const existing=await db.from("projects").select("id,name,client,business_ref,status,pipeline_stage,business_type").eq("id",tg.project_id).maybeSingle();
  if(existing.error)throw existing.error;
  return{created:false,project_id:tg.project_id,project:existing.data||null,already_promoted:true};
 }
 const oq=await db.from("pppp_outbound_queue_v1").select("*").eq("source",SRC).eq("source_record_id",tg.id).order("updated_at",{ascending:false}).limit(1).maybeSingle();
 if(oq.error)throw oq.error;
 const q=oq.data||null,hasReply=!!(q&&(q.replied_at||nm(q.status)==="replied"));
 if(!hasReply||!q?.gmail_thread_id)throw new Error("buyer_reply_required_before_project_promotion");
 const threadRows=await db.from("project_emails").select("id,project_id,gmail_message_id,direction").eq("gmail_thread_id",q.gmail_thread_id).limit(100);
 if(threadRows.error)throw threadRows.error;
 const existingProjects=[...new Set((threadRows.data||[]).map((x:any)=>t(x?.project_id,80)).filter(Boolean))];
 if(existingProjects.length)throw new Error("gmail_thread_already_linked_to_project:"+existingProjects[0]);
 const name=t(b?.project_name||tg?.project_title||((tg?.company_name||"Buyer")+" – Material RFQ"),500);
 if(!name)throw new Error("project_name_required");
 const reference=t(b?.project_reference||tg?.project_reference||"",250)||null;
 const commandId="material-trade-promote:"+t(tg.id,80);
 const notes=t(
  "Created from Material Trade after confirmed buyer reply/RFQ. "+
  "Target source key: "+t(tg.source_key,500)+". "+
  "Gmail thread: "+t(q.gmail_thread_id,160)+". "+
  (tg.steel_scope?"Steel scope: "+t(tg.steel_scope,2600):""),
  5000
 );
 const cr=await db.rpc("pppp_chatgpt_create_project_v1",{
  p_command_id:commandId,
  p_name:name,
  p_client:t(tg.company_name,500)||null,
  p_reference:reference,
  p_location:t(tg.country,20)||null,
  p_deadline:null,
  p_notes:notes||null,
  p_deal_type:"trading",
  p_business_type:"trading",
  p_source:"pppp_ui",
  p_metadata:{
   origin:"material_trade",
   target_id:tg.id,
   target_source_key:tg.source_key,
   outbound_queue_id:q.id,
   gmail_thread_id:q.gmail_thread_id,
   gmail_reply_at:q.replied_at||null,
   created_by_user:u?.id||null
  }
 });
 if(cr.error)throw cr.error;
 const projectId=t(cr.data?.project_id,80);
 if(!uuid(projectId))throw new Error("project_create_verification_failed");
 const now=new Date().toISOString();
 const pe=await db.from("project_emails").update({
  project_id:projectId,
  suggested_project_id:null,
  match_method:"material_trade_promotion",
  match_confidence:100,
  needs_review:false,
  review_reason:null,
  updated_at:now
 }).eq("gmail_thread_id",q.gmail_thread_id).is("project_id",null).select("id,gmail_message_id,direction");
 if(pe.error)throw pe.error;
 const tu=await db.from("pppp_dach_steel_targets_v1").update({
  project_id:projectId,
  target_status:"project_promoted",
  next_action:"Project created from confirmed buyer RFQ/reply. Continue in Projects.",
  updated_at:now
 }).eq("id",tg.id).select("id,project_id,target_status").single();
 if(tu.error)throw tu.error;
 const payload={...(q.payload&&typeof q.payload==="object"?q.payload:{}),promoted_project_id:projectId,promoted_at:now,promotion_command_id:commandId,project_email_links:(pe.data||[]).map((x:any)=>x.id)};
 const qu=await db.from("pppp_outbound_queue_v1").update({payload,updated_at:now}).eq("id",q.id);
 if(qu.error)throw qu.error;
 const pv=await db.from("projects").select("id,name,client,business_ref,status,pipeline_stage,business_type").eq("id",projectId).single();
 if(pv.error)throw pv.error;
 return{created:cr.data?.created===true,project_id:projectId,project:pv.data,target_status:"project_promoted",linked_project_emails:(pe.data||[]).length,gmail_thread_id:q.gmail_thread_id,human_confirmation:true};
}

Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:C});if(req.method!=="POST")return res({ok:false,error:"method_not_allowed"},405);try{
 const cron=t(req.headers.get("x-pppp-cron-secret")||"",500);
 let internalOk=false;
 if(cron){const az=await db.rpc("gmail_tracker_cron_authorized",{provided:cron});internalOk=!az.error&&az.data===true;}
 const au=req.headers.get("Authorization")||"";
 let u:any={id:"internal-draft-refresh"};
 if(!internalOk){if(!au.toLowerCase().startsWith("bearer "))return res({ok:false,error:"unauthorized"},401);u=await user(au);}
 let b:any={};try{b=await req.json();}catch{}const id=t(b?.target_id,80),mode=nm(b?.mode);
  if(internalOk&&mode!=="refresh"&&mode!=="sync")return res({ok:false,error:"internal_mode_not_allowed"},403);if(mode!=="sync"&&!uuid(id))return res({ok:false,error:"valid_target_id_required"},400);if(mode==="sync"){const x=await syncLifecycle();return res({ok:true,version:V,mode,...x,human_send_required:true,external_email_sent:false});}if(!["buyer","preview","followup","supplier","suppliers","contact","contacts","refresh","promote"].includes(mode))return res({ok:false,error:"unsupported_mode"},400);const q=await db.from("pppp_dach_steel_targets_v1").select("*").eq("id",id).maybeSingle();if(q.error)throw q.error;if(!q.data)return res({ok:false,error:"dach_target_not_found"},404);if(["closed","rejected"].includes(t(q.data.target_status,40)))return res({ok:false,error:"dach_target_not_active"},409);if(mode==="contact"){const cr=await buyerContact(q.data),qualified=await qualifyTarget(q.data,cr);return res({ok:true,version:V,mode,target_id:q.data.id,target_source_key:q.data.source_key,contact:{...cr,tier:qualified.contact_tier,score:qualified.contact_quality_score},contacts:contactCandidates(q.data,cr),routing_conflicts:await routingConflicts(q.data),workflow_state:qualified.workflow_state,readiness_reasons:qualified.readiness_reasons||[],human_send_required:true,external_email_sent:false});}if(mode==="contacts"){const cr=await buyerContact(q.data);return res({ok:true,version:V,mode,target_id:q.data.id,contacts:contactCandidates(q.data,cr),routing_conflicts:await routingConflicts(q.data),human_send_required:true,external_email_sent:false});}if(mode==="preview"){const pv=await buyerPreview(q.data,b);return res({ok:true,version:V,mode,target_id:q.data.id,...pv,human_send_required:true,external_email_sent:false});}if(mode==="followup"){const fu=await followupDraft(q.data,b,u);return res({ok:true,version:V,mode,target_id:q.data.id,...fu,human_send_required:true,external_email_sent:false});}if(mode==="promote"){const pr=await promoteProject(q.data,b,u);return res({ok:true,version:V,mode,target_id:q.data.id,target_source_key:q.data.source_key,human_send_required:true,external_email_sent:false,...pr});}if(mode==="suppliers"){const si=await db.rpc("pppp_chatgpt_supplier_intelligence_v1",{p_requirement:requirement(q.data),p_project_id:null,p_min_qualified:3,p_threshold:70,p_limit:8});if(si.error)throw si.error;return res({ok:true,version:V,mode,target_id:q.data.id,target_source_key:q.data.source_key,supplier_intelligence:si.data||{},human_send_required:true,external_email_sent:false});}const r=(mode==="buyer"||mode==="refresh")?await buyerDraft(q.data,u,b):await supplierDraft(q.data,b,u);return res({ok:true,version:V,mode,target_id:q.data.id,target_source_key:q.data.source_key,human_send_required:true,external_email_sent:false,...r});}catch(e){const m=t((e as any)?.message||e,1000),s=m==="unauthorized"?401:/required|invalid|not_allowed/.test(m)?400:/cooldown|conflict|suppressed|already|bounced|not_active|not_due|reply_exists/.test(m)?409:500;console.error(V,e);return res({ok:false,error:m,human_send_required:true,external_email_sent:false,version:V},s);}});

