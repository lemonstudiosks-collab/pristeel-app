import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")||"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const A=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SA=Deno.env.get("GOOGLE_SA_JSON")||"";
const GU=(Deno.env.get("GMAIL_USER")||"").toLowerCase();
const db=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const V="pppp-dach-steel-draft-generator-v6-contact-resolution";
const SRC="DACH_STEEL_BUYER";
const C={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const t=(v:any,n=12000)=>String(v==null?"":v).replace(/\r/g,"").trim().slice(0,n);
const em=(v:any)=>t(v,320).toLowerCase();
const nm=(v:any)=>t(v,500).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const res=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...C,"Cache-Control":"no-store"}});
const uuid=(v:any)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t(v,80));
const dom=(v:any)=>{const e=em(v),i=e.lastIndexOf("@");return i>0?e.slice(i+1):"";};
const local=(v:any)=>(em(v).split("@")[0]||"").replace(/\+.*/,"");
const badLocal=new Set(["jobs","careers","career","hr","privacy","gdpr","webmaster","press","presse","media","newsletter","noreply","no-reply","donotreply","dpo","security","abuse"]);
const badDom=new Set(["gmail.com","googlemail.com","hotmail.com","outlook.com","live.com","yahoo.com","icloud.com","aol.com","example.com","example.org","example.net"]);
const recover=new Set(["gmail_draft_missing","gmail_draft_stale","draft_missing","draft_stale"]);
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
 const payload={...(q?.payload&&typeof q.payload==="object"?q.payload:{}),gmail_reconciled_at:now,gmail_sent_message_id:sent.id,gmail_sent_thread_id:sent.thread_id||q.gmail_thread_id};
 if(reply){payload.gmail_reply_message_id=reply.id;payload.gmail_reply_at=reply.at;}
 const qu=await db.from("pppp_outbound_queue_v1").update({
  status,sent_at:q.sent_at||sent.at||now,replied_at:reply?.at||q.replied_at||null,gmail_thread_id:sent.thread_id||q.gmail_thread_id,
  suppression_reason:null,approved_for_send:false,payload,updated_at:now
 }).eq("id",q.id).select("*").single();
 if(qu.error)throw qu.error;
 const next=reply?"Buyer replied — review the Gmail thread and classify whether an RFQ/BOQ was received.":"Waiting for buyer reply / RFQ. Do not send another cold outreach while cooldown is active.";
 const tu=await db.from("pppp_dach_steel_targets_v1").update({outreach_status:status,next_action:next,updated_at:now}).eq("id",tg.id);
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
 return{checked,sent,replied,errors};
}
async function user(auth:string){if(!A)throw new Error("supabase_anon_key_missing");const c=createClient(U,A,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}}),q=await c.auth.getUser();if(q.error||!q.data?.user)throw new Error("unauthorized");return q.data.user;}
async function draft(to:string,subject:string,body:string,h:Record<string,string>){
 const raw=["To: "+mh(to),"Subject: "+mh(subject),...Object.entries(h).map(x=>x[0]+": "+mh(x[1])),"MIME-Version: 1.0","Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: 8bit","",body,""].join("\r\n"),tk=await token(),r=await fetch("https://gmail.googleapis.com/gmail/v1/users/"+encodeURIComponent(GU)+"/drafts",{method:"POST",headers:{Authorization:"Bearer "+tk,"Content-Type":"application/json"},body:JSON.stringify({message:{raw:b64u(raw)}})}),d=await r.json();if(!r.ok)throw new Error("gmail_draft_"+r.status+":"+t(JSON.stringify(d),500));return{draft_id:t(d?.id,500),message_id:t(d?.message?.id,500),thread_id:t(d?.message?.threadId,500)};
}
async function del(id:string){if(!id)return;try{const tk=await token();await fetch("https://gmail.googleapis.com/gmail/v1/users/"+encodeURIComponent(GU)+"/drafts/"+encodeURIComponent(id),{method:"DELETE",headers:{Authorization:"Bearer "+tk}});}catch{}}
const signature=["Arianit Vllahiu","Head of Business Development","+383 (0) 44 244 699","arianit.vllahiu@prissteel.com","www.prissteel.com"].join("\n");
function mat(tg:any){const m=tg?.material_scope&&typeof tg.material_scope==="object"?tg.material_scope:{},a=Array.isArray(m.line_items)?m.line_items:[];if(a.length)return a.slice(0,30).map((x:any)=>{const n=[t(x?.family,100),t(x?.designation,180)].filter(Boolean).join(" · ")||"Steel material",sp=[t(x?.grade,80),t(x?.standard,120),t(x?.dimension||x?.dimensions,160)].filter(Boolean).join(" / "),q=x?.qty!=null?String(x.qty)+(x?.unit?" "+x.unit:""):(x?.tonnes!=null?String(x.tonnes)+" t":"");return "- "+n+(sp?" | "+sp:"")+(q?" | "+q:"");});return t(tg?.steel_scope,4000).split(/;\s*/).filter(Boolean).map((x:string)=>"- "+x);}
function buyerText(tg:any){const p=t(tg?.project_title||tg?.company_name,500),m=mat(tg),ind=tg?.quote_readiness!=="M3",subject=p+" – Anfrage Materialliste / RFQ | PRISTEEL",body=["Guten Tag,","",'im Zusammenhang mit dem Projekt „'+p+'“ möchten wir anfragen, ob die Materialbeschaffung für den relevanten Stahlbauumfang noch offen ist.',"","PRISTEEL kann projektbezogene Stahlmaterialien aus unserem Beschaffungsnetzwerk liefern.",ind?"Auf Grundlage der veröffentlichten Projektunterlagen haben wir derzeit folgenden voraussichtlichen Stahlumfang identifiziert:":"Auf Grundlage der verfügbaren Projektunterlagen haben wir folgenden Stahlumfang identifiziert:","",...m,"",ind?"Hinweis: Die oben genannten Mengen sind vorläufig und dienen nur zur Einordnung.":"Die Positionen entsprechen der derzeit verfügbaren Materialbasis.","","Falls die Beschaffung noch nicht abgeschlossen ist, senden Sie uns bitte die aktuelle Materialliste / BOQ sowie – soweit verfügbar – Zeichnungen und Spezifikationen. Auf dieser Grundlage erstellen wir kurzfristig ein technisches und kommerzielles Angebot.","","Sollte hierfür eine andere Person im Einkauf oder in der Projektleitung zuständig sein, wäre ich für eine Weiterleitung dankbar.","","Mit freundlichen Grüßen",signature].join("\n");return{subject,body,approach_mode:tg?.quote_readiness==="M3"?"direct_offer":"rfq_request"};}
function supplierText(tg:any,c:any){const p=t(tg?.project_title||tg?.company_name,500),m=mat(tg),ind=tg?.quote_readiness!=="M3",de=nm(c?.contact_language).startsWith("de");if(de){const subject=(ind?"Indikative RFQ":"RFQ")+" | "+p,body=["Guten Tag,","",'wir prüfen derzeit die Stahlmaterialbeschaffung für das Projekt „'+p+'“.',"",ind?"Die nachstehenden Mengen basieren derzeit auf veröffentlichten Projektinformationen und sind bis zum Erhalt der finalen BOQ / Materialliste als indikativ zu behandeln:":"Die nachstehenden Positionen basieren auf der verfügbaren Materialliste:","",...m,"","Bitte teilen Sie uns – soweit mit den verfügbaren Angaben möglich – Preis / Einheitspreise, Verfügbarkeit, Lieferzeit, Materialzeugnis EN 10204 3.1, Ursprungsland, Incoterm, Angebotsgültigkeit und Zahlungsbedingungen mit.","",ind?"Die finale Anfrage mit bestätigten Güten, Abmessungen und Mengen folgt nach Erhalt der aktuellen BOQ.":"Bitte kennzeichnen Sie technische Abweichungen eindeutig.","","Mit freundlichen Grüßen",signature].join("\n");return{subject,body};}const subject=(ind?"Indicative RFQ":"RFQ")+" | "+p,body=["Dear Sir or Madam,","",'we are currently reviewing the steel material procurement for the project “'+p+'”.',"",ind?"The quantities below are based on published project information and must be treated as indicative until the final BOQ / material list is received:":"The positions below are based on the available material list:","",...m,"","Please provide, where possible with the currently available information, your price / unit prices, availability, lead time, EN 10204 3.1 certification, country of origin, Incoterm, quotation validity and payment terms.","",ind?"A final RFQ with confirmed grades, dimensions and quantities will follow after receipt of the current BOQ.":"Please identify any technical deviations clearly.","","Kind regards,",signature].join("\n");return{subject,body};}
function requirement(tg:any){const m=tg?.material_scope&&typeof tg.material_scope==="object"?tg.material_scope:{},a=Array.isArray(m.line_items)?m.line_items:[],f:string[]=[],g:string[]=[],s:string[]=[];for(const x of a){const z=[[x?.family,f],[x?.grade,g],[x?.standard,s]] as any;for(const y of z){const v=t(y[0],140);if(v&&!y[1].includes(v))y[1].push(v);}}return{family:f[0]||"structural steel",product_type:f[0]||"structural steel",description:t(tg?.steel_scope,5000),grades:g,standards:s};}

async function buyerContact(tg:any){
 const q=await db.rpc("pppp_dach_steel_contact_resolution_v1",{p_target_id:tg.id});
 if(q.error)throw q.error;
 const r=q.data&&typeof q.data==="object"?q.data:{};
 return {
  email:em(r.email||""),
  person:t(r.person||"",240),
  role:t(r.role||"",240),
  source:t(r.source||"",120),
  quality:t(r.quality||"",80),
  score:Number(r.score||0),
  company_domain:t(r.company_domain||tg?.company_domain||"",240),
  candidates:Array.isArray(r.candidates)?r.candidates:[]
 };
}
function relevance(tg:any,contact:any){
 const base=tg?.score_band==="A1"?95:tg?.score_band==="A2"?85:tg?.score_band==="B1"?72:tg?.score_band==="B2"?62:45;
 return Math.max(0,Math.min(100,base+Math.min(5,Math.floor(Number(contact?.score||0)/30))));
}
async function supplierCandidate(tg:any,e:string){const q=await db.rpc("pppp_chatgpt_supplier_intelligence_v1",{p_requirement:requirement(tg),p_project_id:null,p_min_qualified:3,p_threshold:70,p_limit:20});if(q.error)throw q.error;const rr=Array.isArray(q.data?.requirements)?q.data.requirements[0]:null,a=Array.isArray(rr?.candidates)?rr.candidates:[],c=a.find((x:any)=>em(x?.email)===e);if(!c)throw new Error("supplier_not_in_current_intelligence_candidates");if(!c.strict_fit&&!c.review_fit)throw new Error("supplier_candidate_not_fit_for_draft");return c;}
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
async function buyerDraft(tg:any,u:any){
 const z=await db.from("pppp_outbound_queue_v1").select("*").eq("source",SRC).eq("source_record_id",tg.id).eq("touch_no",1).maybeSingle();
 if(z.error)throw z.error;
 let q=z.data||null;
 const contact=await buyerContact(tg);
 const recipient=em(q?.recipient_email||contact.email);
 if(!recipient)throw new Error("buyer_contact_required");
 const e=safe(recipient);
 await guards(tg,q,e);
 const ct=buyerText(tg),d=await draft(e,ct.subject,ct.body,{
  "X-PPPP-DACH-Target-ID":t(tg.id,80),
  "X-PPPP-DACH-Source-Key":t(tg.source_key,500),
  "X-PPPP-DACH-Mode":ct.approach_mode
 });
 try{
  const now=new Date().toISOString(),key=SRC+":"+tg.id+":1",score=relevance(tg,contact),
  payload={
   ...(q?.payload&&typeof q.payload==="object"?q.payload:{}),
   approach_mode:ct.approach_mode,target_source_key:tg.source_key,subject:ct.subject,
   quote_readiness:tg.quote_readiness,why_now:tg.why_now,steel_scope:tg.steel_scope,country:tg.country,
   contact_resolution:{email:e,person:contact.person||null,role:contact.role||null,source:contact.source||null,quality:contact.quality||null,score:contact.score||0},
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
    status:"candidate",suppression_reason:null,planned_date:null,planned_at:null,planned_rank:null,
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
    status:"candidate",suppression_reason:null,approved_for_send:false,human_send_required:true,
    source_updated_at:tg.updated_at,payload,updated_at:now
   }).select("*").single();
   if(ins.error)throw ins.error;row=ins.data;
  }
  const tu=await db.from("pppp_dach_steel_targets_v1").update({
   company_domain:tg.company_domain||contact.company_domain||dom(e),
   contact_status:"found",outreach_status:"queued",outbound_source_key:key,
   next_action:"Review Gmail draft and shared outbound preflight; sending remains human-approved.",updated_at:now
  }).eq("id",tg.id);
  if(tu.error)throw tu.error;
  return{
   created:true,queue:row,draft:d,recipient:e,recipient_name:contact.person||tg.company_name,
   contact_role:contact.role||null,contact_source:contact.source||null,contact_quality:contact.quality||null,
   subject:ct.subject,gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+encodeURIComponent(d.thread_id||d.message_id)
  };
 }catch(err){await del(d.draft_id);throw err;}
}
async function supplierDraft(tg:any,b:any,u:any){const e=safe(b?.supplier_email),c=await supplierCandidate(tg,e),ct=supplierText(tg,c),d=await draft(e,ct.subject,ct.body,{"X-PPPP-DACH-Target-ID":t(tg.id,80),"X-PPPP-DACH-Source-Key":t(tg.source_key,500),"X-PPPP-DACH-Supplier-RFQ":tg.quote_readiness==="M3"?"final":"indicative"});return{created:true,draft:d,recipient:e,supplier_name:c.name||b?.supplier_name||null,subject:ct.subject,quote_readiness:tg.quote_readiness,rfq_mode:tg.quote_readiness==="M3"?"final":"indicative",gmail_url:"https://mail.google.com/mail/u/0/#drafts/"+encodeURIComponent(d.thread_id||d.message_id),created_by:u.id};}

Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:C});if(req.method!=="POST")return res({ok:false,error:"method_not_allowed"},405);try{const au=req.headers.get("Authorization")||"";if(!au.toLowerCase().startsWith("bearer "))return res({ok:false,error:"unauthorized"},401);const u=await user(au);let b:any={};try{b=await req.json();}catch{}const id=t(b?.target_id,80),mode=nm(b?.mode);if(mode!=="sync"&&!uuid(id))return res({ok:false,error:"valid_target_id_required"},400);if(mode==="sync"){const x=await syncLifecycle();return res({ok:true,version:V,mode,...x,human_send_required:true,external_email_sent:false});}if(!["buyer","supplier","suppliers","contact"].includes(mode))return res({ok:false,error:"mode_must_be_buyer_supplier_suppliers_contact_or_sync"},400);const q=await db.from("pppp_dach_steel_targets_v1").select("*").eq("id",id).maybeSingle();if(q.error)throw q.error;if(!q.data)return res({ok:false,error:"dach_target_not_found"},404);if(["closed","rejected"].includes(t(q.data.target_status,40)))return res({ok:false,error:"dach_target_not_active"},409);if(mode==="contact"){const cr=await buyerContact(q.data);return res({ok:true,version:V,mode,target_id:q.data.id,target_source_key:q.data.source_key,contact:cr,human_send_required:true,external_email_sent:false});}if(mode==="suppliers"){const si=await db.rpc("pppp_chatgpt_supplier_intelligence_v1",{p_requirement:requirement(q.data),p_project_id:null,p_min_qualified:3,p_threshold:70,p_limit:8});if(si.error)throw si.error;return res({ok:true,version:V,mode,target_id:q.data.id,target_source_key:q.data.source_key,supplier_intelligence:si.data||{},human_send_required:true,external_email_sent:false});}const r=mode==="buyer"?await buyerDraft(q.data,u):await supplierDraft(q.data,b,u);return res({ok:true,version:V,mode,target_id:q.data.id,target_source_key:q.data.source_key,human_send_required:true,external_email_sent:false,...r});}catch(e){const m=t((e as any)?.message||e,1000),s=m==="unauthorized"?401:/required|invalid|not_allowed/.test(m)?400:/cooldown|conflict|suppressed|already|bounced|not_active/.test(m)?409:500;console.error(V,e);return res({ok:false,error:m,human_send_required:true,external_email_sent:false,version:V},s);}});
