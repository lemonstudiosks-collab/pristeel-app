import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")||"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const A=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SA=Deno.env.get("GOOGLE_SA_JSON")||"";
const GU=(Deno.env.get("GMAIL_USER")||"").toLowerCase();
const db=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const V="pppp-dach-steel-draft-generator-v16-commercial-engine-v3";
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
const SIG_LOGO_B64="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";

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
  if(htmlBody.includes("cid:prissteel-signature-logo")){
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
const canonicalSignatureHtml='<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;border-collapse:collapse;margin-top:12px"><tr><td style="vertical-align:middle;padding-right:22px"><img src="cid:prissteel-signature-logo" alt="PRISTEEL" width="227" height="75" style="display:block;border:0;width:227px;height:75px"></td><td style="vertical-align:top;border-left:2px solid #2f80c9;padding-left:22px"><div style="font-size:18px;line-height:1.25;font-weight:700;color:#1f2937">Arianit Vllahiu</div><div style="font-size:16px;line-height:1.35;color:#1f2937">Head of Business Development</div><div style="height:8px;line-height:8px">&nbsp;</div><div style="font-size:15px;line-height:1.55"><a href="tel:+38344244699" style="color:#145fd7;text-decoration:underline">+383 (0) 44 244 699</a><br><a href="mailto:arianit.vllahiu@prissteel.com" style="color:#145fd7;text-decoration:underline">arianit.vllahiu@prissteel.com</a><br><a href="https://www.prissteel.com" style="color:#145fd7;text-decoration:underline">www.prissteel.com</a></div></td></tr></table>'

function mat(tg:any){const m=tg?.material_scope&&typeof tg.material_scope==="object"?tg.material_scope:{},a=Array.isArray(m.line_items)?m.line_items:[];if(a.length)return a.slice(0,30).map((x:any)=>{const n=[t(x?.family,100),t(x?.designation,180)].filter(Boolean).join(" · ")||"Steel material",sp=[t(x?.grade,80),t(x?.standard,120),t(x?.dimension||x?.dimensions,160)].filter(Boolean).join(" / "),q=x?.qty!=null?String(x.qty)+(x?.unit?" "+x.unit:""):(x?.tonnes!=null?String(x.tonnes)+" t":"");return "- "+n+(sp?" | "+sp:"")+(q?" | "+q:"");});return t(tg?.steel_scope,4000).split(/;\s*/).filter(Boolean).map((x:string)=>"- "+x);}
function buyerLang(tg:any){
 const c=t(tg?.country,3).toUpperCase();
 return ["DE","AT","CH"].includes(c)?"de":["HR","ME","RS"].includes(c)?"bcs":"en";
}
function buyerText(tg:any,signatureHtml=""){
 const project=t(tg?.project_title,500),m=mat(tg),isM3=tg?.quote_readiness==="M3",lang=buyerLang(tg),de=lang==="de",bcs=lang==="bcs",sig=signatureHtml||canonicalSignatureHtml;
 if(project&&isM3){
  const subject=de?project+" – Stahl-Lieferangebot | PRISTEEL":bcs?project+" – Ponuda čeličnog materijala | PRISTEEL":project+" – Steel material supply offer | PRISTEEL";
  const body=de
   ?["Guten Tag,","",'im Zusammenhang mit dem Projekt „'+project+'“ möchten wir Ihnen auf Basis der verfügbaren Projektunterlagen ein konkretes Stahl-Lieferangebot unterbreiten.',"",...m,"","Gerne stimmen wir die finale Materialliste, Liefertermine und Lieferadresse mit Ihnen ab.","","Mit freundlichen Grüßen","",signature].join("\n")
   :bcs
    ?["Poštovani,","",'u vezi sa projektom „'+project+'“ želimo Vam, na osnovu raspoložive projektne dokumentacije, ponuditi isporuku čeličnog materijala.',"",...m,"","Rado ćemo usaglasiti konačnu listu materijala, rokove i adresu isporuke na DAP osnovi.","","Srdačan pozdrav,","",signature].join("\n")
    :["Dear Sir or Madam,","",'regarding the project “'+project+'”, we would like to offer the steel material scope based on the available project information.',"",...m,"","We can coordinate the final material list, delivery dates and DAP delivery address with you.","","Kind regards,","",signature].join("\n");
  return{subject,body,html_body:"",approach_mode:"direct_offer",language:lang};
 }
 if(project){
  const subject=de?project+" – Anfrage Materialliste / RFQ | PRISTEEL":bcs?project+" – Upit za listu materijala / RFQ | PRISTEEL":project+" – Steel material RFQ | PRISTEEL";
  const body=de
   ?["Guten Tag,","",'im Zusammenhang mit dem Projekt „'+project+'“ möchten wir gerne anfragen, ob die Materialbeschaffung für den Stahlbauumfang noch offen ist.',"","PRISTEEL liefert Baustahl, Profile, Bleche, Rohre/Hohlprofile und weitere Stahlprodukte projektbezogen aus unserem Lieferantennetzwerk. Den Transport organisieren wir bis zu Ihrer gewünschten Lieferadresse auf Basis DAP (Incoterms® 2020).","","Sofern die Materialbeschaffung noch ganz oder teilweise offen ist, senden Sie uns bitte Ihre aktuelle RFQ bzw. Materialliste mit Güten, Abmessungen, Mengen und gewünschten Lieferterminen.","","Mit freundlichen Grüßen","",signature].join("\n")
   :bcs
    ?["Poštovani,","",'u vezi sa projektom „'+project+'“ želimo provjeriti da li je nabavka čeličnog materijala još uvijek otvorena.',"","PRISTEEL isporučuje konstrukcijski čelik, profile, limove, cijevi/šuplje profile i druge čelične proizvode putem kvalifikovane mreže dobavljača. Organizujemo i transport do željene adrese isporuke na DAP osnovi (Incoterms® 2020).","","Ako je nabavka još uvijek otvorena u cijelosti ili djelimično, molimo pošaljite nam Vaš RFQ odnosno listu materijala sa kvalitetima, dimenzijama, količinama i željenim rokovima isporuke.","","Srdačan pozdrav,","",signature].join("\n")
    :["Dear Sir or Madam,","",'regarding the project “'+project+'”, we would like to ask whether the steel material procurement is still open.',"","PRISTEEL supplies structural steel material, sections, plates, tubes/hollow sections and related steel products through our qualified supply network, including transport to your requested delivery address on a DAP basis.","","If procurement is still open in full or in part, please send us your current RFQ or material list including grades, dimensions, quantities and requested delivery dates.","","Kind regards,","",signature].join("\n");
  const html=de
   ?'<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.55"><p>Guten Tag,</p><p>im Zusammenhang mit dem Projekt „'+htmlEsc(project)+'“ möchten wir gerne anfragen, ob die Materialbeschaffung für den Stahlbauumfang noch offen ist.</p><p>PRISTEEL liefert Baustahl, Profile, Bleche, Rohre/Hohlprofile und weitere Stahlprodukte projektbezogen aus unserem Lieferantennetzwerk. Den Transport organisieren wir bis zu Ihrer gewünschten Lieferadresse auf Basis <strong>DAP (Incoterms® 2020)</strong>.</p><p>Sofern die Materialbeschaffung noch ganz oder teilweise offen ist, senden Sie uns bitte Ihre aktuelle <strong>RFQ bzw. Materialliste</strong> mit Güten, Abmessungen, Mengen und gewünschten Lieferterminen.</p><p>Mit freundlichen Grüßen</p>'+sig+'</div>'
   :bcs
    ?'<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.55"><p>Poštovani,</p><p>U vezi sa projektom „'+htmlEsc(project)+'“ želimo provjeriti da li je nabavka čeličnog materijala još uvijek otvorena.</p><p>PRISTEEL isporučuje konstrukcijski čelik, profile, limove, cijevi/šuplje profile i druge čelične proizvode putem kvalifikovane mreže dobavljača. Organizujemo i transport do željene adrese isporuke na osnovi <strong>DAP (Incoterms® 2020)</strong>.</p><p>Ako je nabavka još uvijek otvorena u cijelosti ili djelimično, molimo pošaljite nam Vaš <strong>RFQ odnosno listu materijala</strong> sa kvalitetima, dimenzijama, količinama i željenim rokovima isporuke.</p><p>Srdačan pozdrav,</p>'+sig+'</div>'
    :'<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.55"><p>Dear Sir or Madam,</p><p>Regarding the project “'+htmlEsc(project)+'”, we would like to ask whether the steel material procurement is still open.</p><p>PRISTEEL supplies structural steel material, sections, plates, tubes/hollow sections and related steel products through our qualified supply network, including transport to your requested delivery address on a <strong>DAP</strong> basis.</p><p>If procurement is still open in full or in part, please send us your current <strong>RFQ or material list</strong> including grades, dimensions, quantities and requested delivery dates.</p><p>Kind regards,</p>'+sig+'</div>';
  return{subject,body,html_body:html,approach_mode:"rfq_request",language:lang};
 }
 const subject=de?"Zusätzliche Beschaffungsquelle für Stahlmaterial | PRISTEEL":bcs?"Dodatni izvor nabavke čeličnog materijala | PRISTEEL":"Additional steel material supply source | PRISTEEL";
 const body=de
  ?["Guten Tag,","","wir möchten uns als zusätzliche Beschaffungsquelle für Stahlmaterial vorstellen. PRISTEEL liefert projektbezogen Baustahl, Profile, Bleche, Rohre/Hohlprofile und weitere Stahlprodukte aus einem qualifizierten Lieferantennetzwerk. Den Transport organisieren wir bis zu Ihrer gewünschten Lieferadresse auf Basis DAP (Incoterms® 2020).","","Wenn Sie aktuell oder regelmäßig Stahlmaterial zukaufen, senden Sie uns gerne Ihre RFQ bzw. Materialliste mit Güten, Abmessungen, Mengen und gewünschten Lieferterminen. Wir prüfen die Anfrage kurzfristig und unterbreiten Ihnen ein konkretes Lieferangebot.","","Falls der Einkauf von einer anderen Person betreut wird, wäre ich Ihnen für eine Weiterleitung dankbar.","","Mit freundlichen Grüßen","",signature].join("\n")
  :bcs
   ?["Poštovani,","","želimo predstaviti PRISTEEL kao dodatni izvor nabavke čeličnog materijala. Isporučujemo konstrukcijski čelik, profile, limove, cijevi/šuplje profile i druge čelične proizvode putem kvalifikovane mreže dobavljača. Organizujemo i transport do željene adrese isporuke na DAP osnovi (Incoterms® 2020).","","Ako trenutno ili redovno nabavljate čelični materijal, molimo pošaljite nam Vaš RFQ odnosno listu materijala sa kvalitetima, dimenzijama, količinama i željenim rokovima isporuke. Zahtjev ćemo brzo pregledati i dostaviti konkretnu ponudu za isporuku.","","Ako je za nabavku zadužena druga osoba, bili bismo zahvalni ako biste joj proslijedili ovu poruku.","","Srdačan pozdrav,","",signature].join("\n")
   :["Dear Sir or Madam,","","we would like to introduce PRISTEEL as an additional procurement source for steel material. We supply structural steel, sections, plates, tubes/hollow sections and related steel products through a qualified supply network, including transport to your requested delivery address on a DAP basis.","","If your company currently or regularly purchases steel material, please send us your RFQ or material list with grades, dimensions, quantities and requested delivery dates. We will review it promptly and provide a concrete supply quotation.","","If purchasing is handled by another colleague, I would appreciate it if you could forward this message.","","Kind regards,","",signature].join("\n");
 const html=de
  ?'<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.55"><p>Guten Tag,</p><p>wir möchten uns als zusätzliche Beschaffungsquelle für Stahlmaterial vorstellen. PRISTEEL liefert projektbezogen Baustahl, Profile, Bleche, Rohre/Hohlprofile und weitere Stahlprodukte aus einem qualifizierten Lieferantennetzwerk.</p><p>Den Transport organisieren wir bis zu Ihrer gewünschten Lieferadresse auf Basis <strong>DAP (Incoterms® 2020)</strong>.</p><p>Wenn Sie aktuell oder regelmäßig Stahlmaterial zukaufen, senden Sie uns gerne Ihre <strong>RFQ bzw. Materialliste</strong> mit Güten, Abmessungen, Mengen und gewünschten Lieferterminen.</p><p>Falls der Einkauf von einer anderen Person betreut wird, wäre ich Ihnen für eine Weiterleitung dankbar.</p><p>Mit freundlichen Grüßen</p>'+sig+'</div>'
  :bcs
   ?'<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.55"><p>Poštovani,</p><p>želimo predstaviti PRISTEEL kao dodatni izvor nabavke čeličnog materijala. Isporučujemo konstrukcijski čelik, profile, limove, cijevi/šuplje profile i druge čelične proizvode putem kvalifikovane mreže dobavljača.</p><p>Organizujemo i transport do željene adrese isporuke na osnovi <strong>DAP (Incoterms® 2020)</strong>.</p><p>Ako trenutno ili redovno nabavljate čelični materijal, molimo pošaljite nam Vaš <strong>RFQ odnosno listu materijala</strong> sa kvalitetima, dimenzijama, količinama i željenim rokovima isporuke.</p><p>Ako je za nabavku zadužena druga osoba, bili bismo zahvalni ako biste joj proslijedili ovu poruku.</p><p>Srdačan pozdrav,</p>'+sig+'</div>'
   :'<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.55"><p>Dear Sir or Madam,</p><p>We would like to introduce PRISTEEL as an additional procurement source for steel material. We supply structural steel, sections, plates, tubes/hollow sections and related steel products through a qualified supply network.</p><p>We also organize transport to your requested delivery address on a <strong>DAP</strong> basis.</p><p>If your company currently or regularly purchases steel material, please send us your <strong>RFQ or material list</strong> with grades, dimensions, quantities and requested delivery dates.</p><p>If purchasing is handled by another colleague, I would appreciate it if you could forward this message.</p><p>Kind regards,</p>'+sig+'</div>';
 return{subject,body,html_body:html,approach_mode:"rfq_request",language:lang};
}

function contactTier(email:any,name:any,role:any){
 const lp=local(email),r=nm(role),person=t(name,200);
 if(!em(email)||badLocal.has(lp)||/(marketing|press|presse|media|career|karriere|recruit|human resources|personalwesen|\bhr\b)/.test(r))return"F";
 if(/(einkauf|procurement|purchas|sourcing|beschaffung|ausschreibung|tender|vergabe)/.test(lp))return"C";
 if(/^(info|office|contact|kontakt|hello|mail|admin|sekretariat|zentrale|general)$/.test(lp))return"E";
 if(person&&/(einkauf|procurement|purchas|sourcing|beschaffung|material|supply|buyer)/.test(r))return"A";
 if(person&&/(project|projekt|technical|technik|commercial|kaufm|construction|bauleit|geschäfts|manag|director|leiter)/.test(r))return"B";
 return person||/^[a-z]+[._-][a-z]+$/.test(lp)?"D":"E";
}
function tierScore(v:string){return v==="A"?95:v==="B"?82:v==="C"?70:v==="D"?55:v==="E"?25:0;}
function specificFacts(tg:any){
 const a=Array.isArray(tg?.personalization_facts)?tg.personalization_facts.filter((x:any)=>t(x,1000)):[];
 if(a.length>=2)return a.slice(0,4).map((x:any)=>t(x,1000));
 return [tg?.project_title,tg?.why_now].filter((x:any)=>t(x,1000)).map((x:any)=>t(x,1000));
}
function buyerTextV2(tg:any,signatureHtml=""){
 const lang=buyerLang(tg),de=lang==="de",bcs=lang==="bcs",facts=specificFacts(tg),motion=t(tg?.outreach_motion||"material_buyer",80),project=t(tg?.project_title,500),company=t(tg?.company_name,500),anchor=project||facts[0]||company,sig=signatureHtml||canonicalSignatureHtml;
 if(facts.length<2)throw new Error("outreach_v2_requires_two_specific_facts");
 const future=motion==="future_supplier_qualification"||t(tg?.timing_classification,80)==="future_supplier_qualification";
 const subject=future?(de?company+" – Lieferantenqualifizierung Stahl | PRISTEEL":bcs?company+" – kvalifikacija dobavljača čelika | PRISTEEL":company+" – future steel supplier qualification | PRISTEEL"):(de?anchor+" – Stahlmaterial-Beschaffung | PRISTEEL":bcs?anchor+" – nabavka čeličnog materijala | PRISTEEL":anchor+" – steel material procurement | PRISTEEL");
 const hello=de?"Guten Tag,":bcs?"Poštovani,":"Hello,";
 const intro=future?(de?"wir verstehen, dass der aktuelle Beschaffungsumfang möglicherweise bereits abgedeckt ist. Für künftige Stahlbau- und Materialpakete möchten wir prüfen, ob PRISTEEL in Ihren Lieferantenprozess passt.":bcs?"razumijemo da je trenutni paket možda već pokriven. Za buduće pakete čeličnih konstrukcija i materijala želimo provjeriti da li PRISTEEL odgovara Vašem procesu kvalifikacije dobavljača.":"We understand the current package may already be covered. For future structural-steel and material packages, we would like to check whether PRISTEEL fits your supplier-qualification process."):(de?"wir melden uns mit Bezug auf zwei konkrete, öffentlich verifizierte Punkte:":bcs?"javljamo Vam se na osnovu dvije konkretne, javno provjerene činjenice:":"We are reaching out based on two specific, publicly verified facts:");
 const capability=de?"PRISTEEL ist die technische und kaufmännische Schnittstelle für projektbezogene Stahlbeschaffung – von Materialanforderung und Dokumentation bis zu optionaler Bearbeitung und koordinierter DAP-Lieferung.":bcs?"PRISTEEL je tehničko-komercijalna veza za projektnu nabavku čelika – od zahtjeva za materijalom i dokumentacije do opcionalne obrade i koordinirane DAP isporuke.":"PRISTEEL acts as the technical and commercial interface for project-specific steel procurement, coordinating material requirements, documentation, optional processing and DAP delivery.";
 const cta=future?(de?"Wer ist bei Ihnen für die Qualifizierung künftiger Lieferanten für Stahlmaterial zuständig?":bcs?"Ko je kod Vas zadužen za kvalifikaciju budućih dobavljača čeličnog materijala?":"Who handles qualification of future steel-material suppliers in your organization?"):(de?"Wird diese Materialkategorie von Ihnen betreut, und wäre ein Vergleichspreis für eine aktuelle Position hilfreich?":bcs?"Da li Vi vodite nabavku ove kategorije materijala i da li bi Vam koristila uporedna cijena za jednu aktuelnu poziciju?":"Is this material category handled by you, and would a benchmark quotation for one current position be useful?");
 const close=de?"Mit freundlichen Grüßen":bcs?"Srdačan pozdrav,":"Kind regards,";
 const body=[hello,"",intro,"","• "+facts[0],"• "+facts[1],"",capability,"",cta,"",close,"",signature].join("\n");
 const html='<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:14px;line-height:1.55"><p>'+htmlEsc(hello)+'</p><p>'+htmlEsc(intro)+'</p><ul><li>'+htmlEsc(facts[0])+'</li><li>'+htmlEsc(facts[1])+'</li></ul><p>'+htmlEsc(capability)+'</p><p><strong>'+htmlEsc(cta)+'</strong></p><p>'+htmlEsc(close)+'</p>'+sig+'</div>';
 return{subject,body,html_body:html,approach_mode:future?"future_supplier_qualification":"material_buyer",offer_model:future?"future_supplier_qualification":"material_supply",language:lang,personalization_facts:facts.slice(0,2)};
}
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
async function buyerDraft(tg:any,u:any){
 const z=await db.from("pppp_outbound_queue_v1").select("*").eq("source",SRC).eq("source_record_id",tg.id).eq("touch_no",1).maybeSingle();
 if(z.error)throw z.error;
 let q=z.data||null;
 const contact=await buyerContact(tg);
 const recipient=em(q?.recipient_email||contact.email);
 if(!recipient)throw new Error("buyer_contact_required");
 const e=safe(recipient);
 const tier=contactTier(e,q?.recipient_name||contact.person,q?.contact_role||contact.role),contactScore=tierScore(tier),facts=specificFacts(tg);
 if(t(tg?.outreach_engine_version,20)!=="v2")throw new Error("outreach_v2_candidate_required");
 if(t(tg?.workflow_state,80)!=="ready_for_outreach")throw new Error("outreach_v2_readiness_blocked:"+t(tg?.workflow_state||"missing_state",80));
 if(Number(tg?.company_fit_score||0)<65)throw new Error("outreach_v2_company_fit_below_65");
 if(Number(tg?.commercial_timing_score||0)<35)throw new Error("outreach_v2_timing_below_35");
 if(contactScore<50)throw new Error("outreach_v2_contact_quality_below_50:"+tier);
 if(Number(tg?.message_evidence_score||0)<60||facts.length<2)throw new Error("outreach_v2_requires_two_specific_facts");
 await guards(tg,q,e);
 const sig=canonicalSignatureHtml,ct=buyerTextV2(tg,sig),d=await draft(e,ct.subject,ct.body,{
  "X-PPPP-DACH-Target-ID":t(tg.id,80),
  "X-PPPP-DACH-Source-Key":t(tg.source_key,500),
  "X-PPPP-DACH-Mode":ct.approach_mode
 },ct.html_body||"");
 try{
  const now=new Date().toISOString(),key=SRC+":"+tg.id+":1",score=relevance(tg,contact),
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
 if(internalOk&&mode!=="refresh"&&mode!=="sync")return res({ok:false,error:"internal_mode_not_allowed"},403);if(mode!=="sync"&&!uuid(id))return res({ok:false,error:"valid_target_id_required"},400);if(mode==="sync"){const x=await syncLifecycle();return res({ok:true,version:V,mode,...x,human_send_required:true,external_email_sent:false});}if(!["buyer","supplier","suppliers","contact","refresh","promote"].includes(mode))return res({ok:false,error:"mode_must_be_buyer_supplier_suppliers_contact_refresh_promote_or_sync"},400);const q=await db.from("pppp_dach_steel_targets_v1").select("*").eq("id",id).maybeSingle();if(q.error)throw q.error;if(!q.data)return res({ok:false,error:"dach_target_not_found"},404);if(["closed","rejected"].includes(t(q.data.target_status,40)))return res({ok:false,error:"dach_target_not_active"},409);if(mode==="contact"){const cr=await buyerContact(q.data),tier=contactTier(cr.email,cr.person,cr.role),score=tierScore(tier),facts=specificFacts(q.data),ready=Number(q.data.company_fit_score||0)>=65&&Number(q.data.commercial_timing_score||0)>=35&&score>=50&&Number(q.data.message_evidence_score||0)>=60&&facts.length>=2;const up=await db.from("pppp_dach_steel_targets_v1").update({canonical_contact_email:cr.email||null,canonical_contact_name:cr.person||null,canonical_contact_role:cr.role||null,contact_tier:tier,contact_quality_score:score,workflow_state:ready?"ready_for_outreach":Number(q.data.company_fit_score||0)>=65&&score<50?"strong_company_contact_gap":"research_required",outreach_engine_version:"v2",updated_at:new Date().toISOString()}).eq("id",q.data.id);if(up.error)throw up.error;return res({ok:true,version:V,mode,target_id:q.data.id,target_source_key:q.data.source_key,contact:{...cr,tier,score},workflow_state:ready?"ready_for_outreach":"research_required",human_send_required:true,external_email_sent:false});}if(mode==="promote"){const pr=await promoteProject(q.data,b,u);return res({ok:true,version:V,mode,target_id:q.data.id,target_source_key:q.data.source_key,human_send_required:true,external_email_sent:false,...pr});}if(mode==="suppliers"){const si=await db.rpc("pppp_chatgpt_supplier_intelligence_v1",{p_requirement:requirement(q.data),p_project_id:null,p_min_qualified:3,p_threshold:70,p_limit:8});if(si.error)throw si.error;return res({ok:true,version:V,mode,target_id:q.data.id,target_source_key:q.data.source_key,supplier_intelligence:si.data||{},human_send_required:true,external_email_sent:false});}const r=(mode==="buyer"||mode==="refresh")?await buyerDraft(q.data,u):await supplierDraft(q.data,b,u);return res({ok:true,version:V,mode,target_id:q.data.id,target_source_key:q.data.source_key,human_send_required:true,external_email_sent:false,...r});}catch(e){const m=t((e as any)?.message||e,1000),s=m==="unauthorized"?401:/required|invalid|not_allowed/.test(m)?400:/cooldown|conflict|suppressed|already|bounced|not_active/.test(m)?409:500;console.error(V,e);return res({ok:false,error:m,human_send_required:true,external_email_sent:false,version:V},s);}});

