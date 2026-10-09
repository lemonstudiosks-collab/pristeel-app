import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://awqfpnzqwfjrjefoktgd.supabase.co';
const VERSION='winner-contact-v6-delivery-recovery';
const FREE_EMAIL_DOMAINS=new Set([
  'gmail.com','googlemail.com','yahoo.com','yahoo.de','outlook.com','hotmail.com','hotmail.de','live.com','icloud.com',
  'gmx.de','gmx.net','web.de','freenet.de','t-online.de','aol.com','proton.me','protonmail.com','poczta.onet.pl'
]);
const LEGAL_WORDS=new Set(['gmbh','mbh','co','kg','ag','se','srl','sro','sp','zoo','sa','sas','sasu','ltd','limited','inc','llc','bv','nv','oy','ab','aps','as','doo','d.o.o','gesellschaft','gesellschaftmbh','gruppe','group','company','unternehmen']);
const CONTACT_WORDS=/kontakt|contact|contacts|impressum|imprint|ansprech|team|about|unternehmen|firma|contatti|contacto|contactez|nous-contacter|uber-uns|ueber-uns/i;
const PURPOSE_RULES=[
  [/^(einkauf|procurement|purchasing|supplier|lieferant)/i,'procurement',100],
  [/^(angebot|angebote|kalkulation|tender|ausschreibung|vergabe|estimating)/i,'tender',96],
  [/^(vertrieb|sales|commercial|business|bd)/i,'sales',92],
  [/^(info|office|kontakt|contact|mail|hello|sekretariat)/i,'general',78]
];

const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const unique=arr=>[...new Set((arr||[]).filter(Boolean))];
const TED_LANGUAGE_PREFIXES=new Set(['DE','DEU','GER','FR','FRA','EN','ENG','IT','ITA','NL','NLD','ES','SPA','PT','POR','PL','POL','CS','CZE','SK','SLK','HU','HUN','RO','RON','BG','BUL','DA','DAN','SV','SWE','FI','FIN','ET','EST','LV','LAV','LT','LIT','EL','GRE']);
function canonicalWinnerName(v){const s=text(v),m=s.match(/^([A-Z]{2,3})_(.+)$/);return m&&TED_LANGUAGE_PREFIXES.has(m[1].toUpperCase())?text(m[2]):s;}
function canonicalNames(values){return unique((values||[]).map(canonicalWinnerName));}
function multilingualDuplicateArtifact(w){if(String(w?.identity_version||'')==='ted-winner-canonical-v2')return false;const raw=unique([...(Array.isArray(w?.raw_names)?w.raw_names:[]),...(Array.isArray(w?.names)?w.names:[]),w?.name]);return raw.length>canonicalNames(raw).length;}
const DIRECTORY_DOMAINS=/(^|\.)(linkedin\.com|facebook\.com|instagram\.com|moneyhouse\.ch|local\.ch|search\.ch|xing\.com)$|(^|\.)(northdata|kompass|europages|indeed)\./i;
function safeUrl(v){try{const u=new URL(text(v));return /^https?:$/.test(u.protocol)?u:null;}catch{return null;}}
function domainOfUrl(v){const u=safeUrl(v);return u?u.hostname.toLowerCase().replace(/^www\./,''):'';}
function emailDomain(v){const m=text(v).toLowerCase().match(/@([^\s>]+)$/);return m?m[1].replace(/[>,.;]+$/,''):'';}
function placeholderEmail(v){const d=emailDomain(v);return !d||/(^|\.)(example\.(com|org|net)|yourdomain\.[a-z]{2,}|yourcompany\.[a-z]{2,}|company\.com)$/i.test(d);}
function safeDraftEmailContact(c){
 return !!(c&&c.type==='email'&&c.value&&c.draft_eligible!==false&&c.do_not_contact!==true&&String(c.company_attribution||'').toLowerCase()!=='external_domain'&&String(c.confidence||'').toLowerCase()!=='low'&&!placeholderEmail(c.value));
}
function corporateEmail(v){const d=emailDomain(v);return !!d&&!FREE_EMAIL_DOMAINS.has(d)&&!placeholderEmail(v);}
const GENERIC_COMPANY_WORDS=new Set(['stahl','stahlbau','stahlbauschlosserei','metall','metallbau','schlosserei','bau','construction','engineering','service','services','technik','technical','industrie','industrial','werk','werke','kunst']);
function companyTokens(name){return unique(norm(name).replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(x=>x.length>=4&&!LEGAL_WORDS.has(x)));}
function distinctiveCompanyTokens(name){return companyTokens(name).filter(x=>!GENERIC_COMPANY_WORDS.has(x));}
function domainMatchesCompany(domain,name){const d=norm(domain).replace(/[^a-z0-9]/g,'');return distinctiveCompanyTokens(name).some(t=>t.length>=4&&d.includes(t.replace(/[^a-z0-9]/g,'')));}
function emailIdentityMatchesCompany(email,name){const local=norm(text(email).split('@')[0]||'').replace(/[^a-z0-9]/g,''),domain=norm(emailDomain(email)).replace(/[^a-z0-9]/g,'');return distinctiveCompanyTokens(name).some(t=>{const k=t.replace(/[^a-z0-9]/g,'');return k.length>=4&&(local.includes(k)||domain.includes(k));});}
function pageMatchesCompany(html,url,name){const h=norm(String(html||'').replace(/<[^>]+>/g,' '));const d=domainOfUrl(url);const tokens=distinctiveCompanyTokens(name);if(domainMatchesCompany(d,name))return true;return tokens.some(t=>t.length>=5&&h.includes(t));}
function enrichmentNeedsRepair(w){const e=w&&w.contact_enrichment;if(!e||typeof e!=='object')return false;for(const o of Array.isArray(e.organizations)?e.organizations:[]){const name=text(o?.name||w?.name),d=domainOfUrl(o?.official_website)||text(o?.domain).toLowerCase();if(d&&!domainMatchesCompany(d,name))return true;}return false;}
function trustedSeedEmails(w){const all=winnerEmails(w);if(Array.isArray(w?.ted_declared_emails))return unique(w.ted_declared_emails.map(text).filter(Boolean));const e=w?.contact_enrichment;if(!e)return all;const ted=new Set();for(const o of Array.isArray(e.organizations)?e.organizations:[])for(const c of Array.isArray(o?.contacts)?o.contacts:[])if(c?.type==='email'&&String(c?.source_type||'').toUpperCase()==='TED')ted.add(text(c.value).toLowerCase());return all.filter(x=>ted.has(text(x).toLowerCase()));}
function trustedSeedWebsites(w){if(Array.isArray(w?.ted_declared_websites))return unique(w.ted_declared_websites.map(text).filter(Boolean));return winnerWebsites(w);}
function daysSince(iso){const t=Date.parse(iso||'');return Number.isFinite(t)?Math.floor((Date.now()-t)/86400000):99999;}
function sourceWinner(row){const p=row?.payload&&typeof row.payload==='object'?row.payload:{};return p.winner&&typeof p.winner==='object'?p.winner:{};}
function winnerNames(w){return canonicalNames([...(Array.isArray(w.names)?w.names:[]),...(Array.isArray(w.raw_names)?w.raw_names:[]),w.name]);}
function winnerEmails(w){return unique([...(Array.isArray(w.emails)?w.emails:[]),w.email].map(text).filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)));}
function winnerWebsites(w){return unique([...(Array.isArray(w.websites)?w.websites:[]),w.website].map(text).filter(Boolean));}
function winnerContacts(w){return unique([...(Array.isArray(w.contacts)?w.contacts:[]),w.contact_point].map(text).filter(Boolean));}
function winnerCities(w){return unique([...(Array.isArray(w.cities)?w.cities:[]),w.city].map(text).filter(Boolean));}
function winnerCountries(w){return unique([...(Array.isArray(w.countries)?w.countries:[]),w.country].map(text).filter(Boolean));}
function contactPurpose(email){const local=text(email).split('@')[0]||'';for(const [re,purpose,score] of PURPOSE_RULES)if(re.test(local))return{purpose,score};return{purpose:'person',score:86};}
function contactKey(c){return `${c.type}:${String(c.value||'').toLowerCase()}`;}
function addContact(list,c){if(!c||!c.value)return;const k=contactKey(c);const old=list.find(x=>contactKey(x)===k);if(!old){list.push(c);return;}if(Number(c.score||0)>Number(old.score||0)||c.source_type==='official_website'&&c.company_attribution==='official_domain_match')Object.assign(old,c);}
function stripTags(v){return text(String(v||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' '));}
function decodeHtml(v){return String(v||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
function extractEmails(html){const out=[];const raw=decodeHtml(String(html||''));for(const m of raw.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)){const e=m[0].toLowerCase();if(!/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(e))out.push(e);}return unique(out);}
function extractTelLinks(html){const out=[];for(const m of String(html||'').matchAll(/href=["']tel:([^"']+)["']/gi)){const v=decodeURIComponent(m[1]).replace(/\s+/g,' ').trim();if(v)out.push(v);}return unique(out);}
function extractLinks(html,base){const out=[];for(const m of String(html||'').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){try{const href=decodeHtml(m[1]);if(/^mailto:|^tel:/i.test(href))continue;const u=new URL(href,base);if(!/^https?:$/.test(u.protocol))continue;out.push({url:u.href,text:stripTags(m[2])});}catch{}}return out;}
function candidateContactPages(html,base){const host=domainOfUrl(base);const seen=new Set(),out=[];for(const x of extractLinks(html,base)){if(domainOfUrl(x.url)!==host)continue;if(!CONTACT_WORDS.test(`${x.url} ${x.text}`))continue;const clean=x.url.split('#')[0];if(seen.has(clean))continue;seen.add(clean);out.push(clean);if(out.length>=5)break;}return out;}
function hasContactForm(html,url){const raw=String(html||''),u=norm(url);return /<form\b/i.test(raw)&&(/(message|nachricht|email|e-mail|contact|kontakt|anfrage|request)/i.test(raw)||/(contact|kontakt|anfrage)/.test(u));}
async function fetchText(url,{fetchImpl=fetch,timeoutMs=8000}={}){const response=await fetchImpl(url,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (compatible; PRISTEEL-Procurement-Research/1.0; +https://prissteel.com)','Accept':'text/html,application/xhtml+xml;q=0.9,*/*;q=0.7'},signal:AbortSignal.timeout(timeoutMs)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const ct=String(response.headers?.get?.('content-type')||'');if(ct&&!/html|text/i.test(ct))throw new Error('non-html');return{html:await response.text(),url:response.url||url};}
function ddgResultUrls(html){const out=[];for(const m of String(html||'').matchAll(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["']/gi)){let href=decodeHtml(m[1]);try{const u=new URL(href,'https://html.duckduckgo.com');const encoded=u.searchParams.get('uddg');if(encoded)href=decodeURIComponent(encoded);}catch{}const u=safeUrl(href);if(!u)continue;const d=domainOfUrl(u.href);if(!d||/duckduckgo\.com$/.test(d))continue;out.push(u.href);}return unique(out).slice(0,8);}
async function searchCompanyEvidence(name,country,{fetchImpl=fetch,searchEnabled=true}={}){if(!searchEnabled)return null;const q=encodeURIComponent(`"${name}" ${country||''} official contact`);let listing=null;try{const {html}=await fetchText(`https://html.duckduckgo.com/html/?q=${q}`,{fetchImpl,timeoutMs:9000});for(const u of ddgResultUrls(html)){try{const d=domainOfUrl(u);if(DIRECTORY_DOMAINS.test(d))continue;const page=await fetchText(u,{fetchImpl,timeoutMs:7000});if(!pageMatchesCompany(page.html,page.url,name))continue;if(domainMatchesCompany(d,name))return{...page,kind:'official',source:'web_search'};if(!listing)listing={...page,kind:'listing',source:'web_search'};}catch{}}}catch{}return listing;}
function listingEmailsForCompany(html,name){return extractEmails(html).filter(email=>emailIdentityMatchesCompany(email,name));}
function seedAssignments(w,names){const emails=trustedSeedEmails(w),websites=trustedSeedWebsites(w),out=new Map(names.map(n=>[n,{emails:[],websites:[],contact_points:[]}])) ;
 if(names.length===1){out.get(names[0]).emails.push(...emails);out.get(names[0]).websites.push(...websites);out.get(names[0]).contact_points.push(...winnerContacts(w));return out;}
 for(const site of websites){const d=domainOfUrl(site);const matches=names.filter(n=>domainMatchesCompany(d,n));if(matches.length===1)out.get(matches[0]).websites.push(site);}
 for(const email of emails){const d=emailDomain(email);const matches=names.filter(n=>domainMatchesCompany(d,n));if(matches.length===1)out.get(matches[0]).emails.push(email);}
 return out;
}
function unassignedTedContacts(w,assignments){const usedEmails=new Set(),usedWebsites=new Set();for(const a of assignments.values()){a.emails.forEach(x=>usedEmails.add(x.toLowerCase()));a.websites.forEach(x=>usedWebsites.add(x));}return{emails:winnerEmails(w).filter(x=>!usedEmails.has(x.toLowerCase())),websites:winnerWebsites(w).filter(x=>!usedWebsites.has(x))};}

export function classifyDeliveryFailure(evidence){
 const body=String(evidence?.snippet||'').split(/Original Message Headers|Original Message Details/i)[0],s=(String(evidence?.subject||'')+' '+body).toLowerCase();
 if(/\b4\.\d\.\d\b|mailbox full|temporar|try again later/.test(s))return'temporary';
 if(/\b5\.7\.\d+\b|message blocked|access denied|security policy|antispam|sender not allowed|external senders.*not.*permitted|relay access denied/.test(s))return'blocked';
 if(/\b5\.1\.1\b|address not found|user unknown|unknown user|mailbox unavailable|no such user|recipient.*does not exist/.test(s))return'invalid_address';
 return'unknown';
}
export function winnerDeliveryFeedback(row,failures=[]){
 const w=sourceWinner(row),orgs=w.contact_enrichment?.organizations||[],emails=unique([...winnerEmails(w),...(row.payload?.winner_contacts||[]).map(c=>c.email||c.value),...orgs.flatMap(o=>(o.contacts||[]).filter(c=>c.type==='email').map(c=>c.value))]).map(x=>x.toLowerCase()),domains=unique([...winnerWebsites(w).map(domainOfUrl),...orgs.map(o=>text(o.domain)),...emails.filter(corporateEmail).map(emailDomain)]);
 return failures.filter(f=>{const e=text(f.contact_email||f.recipient_email).toLowerCase();return e&&(emails.includes(e)||domains.includes(emailDomain(e)));}).map(f=>({...f,email:text(f.contact_email||f.recipient_email).toLowerCase(),kind:f.kind||classifyDeliveryFailure(f.evidence)}));
}
export function recoverDeliveryContacts(row,enrichment,feedback,at=new Date().toISOString()){
 const w=sourceWinner(row),old=w.contact_recovery||{},failed=unique([...(old.failed_emails||[]),...feedback.map(f=>f.email)]),blocked=unique([...(old.blocked_domains||[]),...feedback.filter(f=>f.kind==='blocked').map(f=>emailDomain(f.email)).filter(d=>d&&!FREE_EMAIL_DOMAINS.has(d))]);
 const organizations=(enrichment?.organizations||[]).map(o=>({...o,contacts:(o.contacts||[]).map(c=>{const e=text(c.value).toLowerCase(),stop=c.type==='email'&&(failed.includes(e)||blocked.includes(emailDomain(e)));return stop?{...c,draft_eligible:false,do_not_contact:true,delivery_failure:true}:c;})}));
 const safe=organizations.flatMap(o=>o.contacts).filter(c=>safeDraftEmailContact(c)&&c.source_type==='official_website'&&c.source_url&&!c.do_not_contact);
 const complete=organizations.length>0&&organizations.every(o=>o.research_completed===true),attempts=Number(old.attempts||0)+1;
 const status=safe.length?'recovered':blocked.length?'suppressed':complete?'unreachable':attempts>=2?'unverified':'research_pending';
 const recovery={version:'ted-delivery-recovery-v1',status,active:status==='recovered',failed_emails:failed,blocked_domains:blocked,checked_at:at,attempts,next_retry_at:status==='research_pending'?new Date(Date.parse(at)+7*86400000).toISOString():null,evidence:feedback.map(f=>({email:f.email,kind:f.kind,gmail_message_id:f.gmail_message_id||null})),replacement_emails:safe.map(c=>c.value)};
 return {...enrichment,organizations,delivery_recovery:recovery};
}

async function researchOrganization({name,city='',country='',seed,fetchImpl=fetch,searchEnabled=true}){
 const contacts=[],sources=[],listingPages=[];let officialWebsite='';let verified=false;let homepage=null,researchCompleted=false;
 for(const email of seed.emails||[]){const p=contactPurpose(email);addContact(contacts,{type:'email',value:email,purpose:p.purpose,source_type:'TED',source_url:null,confidence:'high',score:Math.max(88,p.score),company_attribution:'ted_winner_organization',draft_eligible:true});}
 for(const point of seed.contact_points||[])addContact(contacts,{type:'person',value:point,purpose:'contact_point',source_type:'TED',source_url:null,confidence:'high',score:90});
 const siteSeeds=unique([...(seed.websites||[]),...(seed.emails||[]).filter(corporateEmail).map(e=>`https://${emailDomain(e)}`)]);
 for(const site of siteSeeds){try{const p=await fetchText(site,{fetchImpl}),d=domainOfUrl(p.url);if(domainMatchesCompany(d,name)){homepage=p;officialWebsite=p.url;verified=true;sources.push({type:'official_website',url:p.url,confidence:'high'});break;}if(pageMatchesCompany(p.html,p.url,name)){listingPages.push(p);sources.push({type:'third_party_listing',url:p.url,confidence:'medium'});}}catch{}}
 if(!homepage){const found=await searchCompanyEvidence(name,[city,country].filter(Boolean).join(' '),{fetchImpl,searchEnabled});if(found?.kind==='official'){homepage=found;officialWebsite=found.url;verified=true;sources.push({type:'web_search_verified_site',url:found.url,confidence:'medium'});}else if(found?.kind==='listing'){listingPages.push(found);sources.push({type:'third_party_listing',url:found.url,confidence:'medium'});}}
 if(homepage){
  let failedPages=0;const pages=[homepage];for(const url of candidateContactPages(homepage.html,homepage.url)){try{pages.push(await fetchText(url,{fetchImpl}));}catch{failedPages++;}}researchCompleted=failedPages===0;
  const officialDomain=domainOfUrl(officialWebsite);
  for(const page of pages){
    for(const email of extractEmails(page.html)){
      const ed=emailDomain(email),sameDomain=ed===officialDomain||ed.endsWith(`.${officialDomain}`);
      const p=contactPurpose(email);
      addContact(contacts,{type:'email',value:email,purpose:p.purpose,source_type:'official_website',source_url:page.url,confidence:sameDomain?'high':'low',score:(sameDomain?15:-30)+p.score,company_attribution:sameDomain?'official_domain_match':'external_domain',draft_eligible:sameDomain});
    }
    for(const phone of extractTelLinks(page.html))addContact(contacts,{type:'phone',value:phone,purpose:'general',source_type:'official_website',source_url:page.url,confidence:'high',score:76,company_attribution:'official_website'});
    if(hasContactForm(page.html,page.url))addContact(contacts,{type:'contact_form',value:page.url,purpose:'contact_form',source_type:'official_website',source_url:page.url,confidence:'high',score:84,company_attribution:'official_website',draft_eligible:false});
  }
  addContact(contacts,{type:'website',value:officialWebsite,purpose:'company',source_type:'official_website',source_url:officialWebsite,confidence:verified?'high':'medium',score:75,company_attribution:'official_website'});
 }
 for(const page of listingPages){for(const email of listingEmailsForCompany(page.html,name)){const p=contactPurpose(email);addContact(contacts,{type:'email',value:email,purpose:p.purpose,source_type:'third_party_listing',source_url:page.url,confidence:'medium',score:Math.max(84,p.score),company_attribution:'third_party_listing_name_match',draft_eligible:true});}}
 contacts.sort((a,b)=>Number(b.score||0)-Number(a.score||0));
 return{name,city:city||null,country:country||null,official_website:officialWebsite||null,domain:domainOfUrl(officialWebsite)||null,verified,research_completed:researchCompleted,contacts:contacts.slice(0,14),sources:unique(sources.map(x=>JSON.stringify(x))).map(x=>JSON.parse(x))};
}
export async function enrichWinnerPayload(row,{fetchImpl=fetch,searchEnabled=true}={}){
 const w=sourceWinner(row),names=winnerNames(w);if(!names.length)return null;
 const assignments=seedAssignments(w,names);const cities=winnerCities(w),countries=winnerCountries(w),organizations=[];
 for(let i=0;i<names.length;i++){const name=names[i];organizations.push(await researchOrganization({name,city:cities[i]||cities[0]||'',country:countries[i]||countries[0]||'',seed:assignments.get(name)||{emails:[],websites:[],contact_points:[]},fetchImpl,searchEnabled}));}
 const unassigned=unassignedTedContacts(w,assignments);const contactCount=organizations.reduce((n,o)=>n+o.contacts.filter(c=>['email','phone','person','contact_form'].includes(c.type)).length,0);
 return{version:VERSION,status:contactCount?'found':organizations.some(o=>o.official_website)?'partial':'not_found',researched_at:new Date().toISOString(),organizations,unassigned_ted_contacts:unassigned,contact_count:contactCount,search_method:searchEnabled?'ted_plus_public_web':'ted_plus_official_domain'};
}
export function mergeWinnerWithEnrichment(w,enrichment){
 const source=w&&typeof w==='object'?w:{};const recovery=enrichment?.delivery_recovery||source.contact_recovery;const out={...source,contact_enrichment:enrichment,...(recovery?{contact_recovery:recovery}:{})};const names=winnerNames(source);const orgs=Array.isArray(enrichment?.organizations)?enrichment.organizations:[];
 if(names.length===1&&orgs.length){const org=orgs[0],contacts=Array.isArray(org.contacts)?org.contacts:[],safe=contacts.filter(c=>safeDraftEmailContact(c)&&(!recovery||c.source_type==='official_website')),evidenceTed=new Set(contacts.filter(c=>c&&c.type==='email'&&String(c.source_type||'').toUpperCase()==='TED').map(c=>text(c.value).toLowerCase())),declared=Array.isArray(source.ted_declared_emails)?unique(source.ted_declared_emails.map(text).filter(Boolean)):winnerEmails(source).filter(x=>evidenceTed.has(text(x).toLowerCase())),bestEmail=safe[0],bestPerson=contacts.find(c=>c.type==='person');out.emails=unique([...declared,...safe.map(c=>c.value)]);out.email=bestEmail?.value||(!recovery?declared[0]:null)||null;const declaredSites=Array.isArray(source.ted_declared_websites)?unique(source.ted_declared_websites.map(text).filter(Boolean)):winnerWebsites(source).filter(x=>domainMatchesCompany(domainOfUrl(x),source.name));out.websites=unique([...(org.official_website?[org.official_website]:[]),...declaredSites]);out.website=org.official_website||declaredSites[0]||null;if(bestPerson&&!out.contact_point)out.contact_point=bestPerson.value;}
 else if(names.length>1){out.email=null;out.website=null;out.contact_point=null;}
 if(recovery){const denied=new Set((recovery.failed_emails||[]).map(x=>text(x).toLowerCase()));const blocked=new Set(recovery.blocked_domains||[]);out.emails=(out.emails||[]).filter(e=>!denied.has(text(e).toLowerCase())&&!blocked.has(emailDomain(e)));if(out.email&&(denied.has(text(out.email).toLowerCase())||blocked.has(emailDomain(out.email))))out.email=null;if(recovery.active===false){out.email=null;out.emails=[];}}
 return out;
}
async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await response.text();if(!response.ok)throw new Error(`${method} ${path} failed: HTTP ${response.status} ${raw.slice(0,700)}`);return raw?JSON.parse(raw):[];}
async function patchRow(access,row,enrichment){const payload={...(row.payload||{}),winner:mergeWinnerWithEnrichment(sourceWinner(row),enrichment)};if(enrichment.delivery_recovery&&String(payload.outreach?.status||'').toLowerCase()==='bounced'){payload.human_action_required=false;payload.next_check_on=null;payload.outreach={...payload.outreach,follow_up_date:null,delivery_recovery_status:enrichment.delivery_recovery.status};}await rest({...access,path:`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,method:'PATCH',body:{payload,updated_at:new Date().toISOString()},prefer:'return=minimal'});}
async function writeSummary(summary){await mkdir('tmp',{recursive:true});await writeFile('tmp/ted-winner-contact-enrichment.json',JSON.stringify(summary,null,2));}
export async function runTedWinnerContactEnrichment({mode=process.env.SYNC_MODE||'preview',minScore=Number(process.env.TED_CONTACT_MIN_SCORE||85),maxRows=Number(process.env.TED_CONTACT_MAX_ROWS||12),refreshDays=Number(process.env.TED_CONTACT_REFRESH_DAYS||30),searchEnabled=String(process.env.TED_CONTACT_WEB_SEARCH||'1')!=='0',fetchImpl=fetch,supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'',bearerToken='',recoveryOnly=String(process.env.TED_CONTACT_RECOVERY_ONLY||'0')==='1'}={}){
 if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
 const access=apiKey?{supabaseUrl,apiKey,bearerToken:bearerToken||apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});
 const raw=await rest({...access,path:`kek_tender_watch?select=id,title,relevance_score,status,published_date,payload&relevance_score=gte.${encodeURIComponent(minScore)}&order=published_date.desc&limit=1600`});
 const legacyFailures=await rest({...access,path:'outreach_contacts?select=id,tender_watch_id,contact_email,gmail_message_id,updated_at&or=(bounced.eq.true,status.ilike.bounced)&order=updated_at.desc&limit=1000'});
 const registryFailures=await rest({...access,path:'pppp_opportunity_outreach_registry_v1?select=id,tender_watch_id,recipient_email,gmail_message_id,bounced_at,status&status=eq.bounced&limit=1000'});
 const failures=[...(Array.isArray(legacyFailures)?legacyFailures:[]),...(Array.isArray(registryFailures)?registryFailures:[])],ids=unique(failures.map(f=>f.gmail_message_id)).filter(id=>/^[a-zA-Z0-9_-]+$/.test(id)).slice(0,1000),evidence=[];
 for(let i=0;i<ids.length;i+=80)evidence.push(...await rest({...access,path:'project_emails?select=gmail_message_id,subject,snippet&gmail_message_id=in.('+ids.slice(i,i+80).join(',')+')&limit=1000'}));
 const byMessage=new Map(evidence.map(x=>[x.gmail_message_id,x]));failures.forEach(f=>f.evidence=byMessage.get(f.gmail_message_id)||null);
 const failureTenders=unique(failures.map(f=>f.tender_watch_id)).filter(id=>/^[a-f0-9-]{36}$/i.test(id)&&!raw.some(r=>r.id===id));
 if(failureTenders.length)raw.push(...await rest({...access,path:'kek_tender_watch?select=id,title,relevance_score,status,published_date,payload&source_url=not.is.null&id=in.('+failureTenders.slice(0,200).join(',')+')&limit=200'}));
 const candidates=(Array.isArray(raw)?raw:[]).filter(r=>{const p=r?.payload||{};const w=p.winner||{};if(String(p.source||'').toUpperCase()!=='TED'||p.notice_phase!=='award'||!winnerNames(w).length||r.status==='ignored')return false;const old=w.contact_enrichment,feedback=winnerDeliveryFeedback(r,failures),recovery=w.contact_recovery;if(feedback.length){const known=new Set((recovery?.evidence||[]).map(x=>x.gmail_message_id).filter(Boolean)),fresh=feedback.some(f=>f.gmail_message_id&&!known.has(f.gmail_message_id));return !recovery||fresh||recovery.status==='research_pending'&&Date.parse(recovery.next_retry_at||0)<=Date.now();}if(recoveryOnly||recovery?.active===false)return false;return !old||multilingualDuplicateArtifact(w)||enrichmentNeedsRepair(w)||daysSince(old.researched_at)>=refreshDays;}).sort((a,b)=>{const af=winnerDeliveryFeedback(a,failures).length,bf=winnerDeliveryFeedback(b,failures).length;if(!!af!==!!bf)return bf-af;const aw=sourceWinner(a),bw=sourceWinner(b),ao=aw.contact_enrichment,bo=bw.contact_enrichment,ap=!ao?0:(winnerEmails(aw).length?2:1),bp=!bo?0:(winnerEmails(bw).length?2:1);return ap-bp||Number(b.relevance_score||0)-Number(a.relevance_score||0)||String(b.published_date||'').localeCompare(String(a.published_date||''));}).slice(0,Math.max(0,maxRows));
 const results=[];
 for(const row of candidates){let enrichment;try{enrichment=await enrichWinnerPayload(row,{fetchImpl,searchEnabled});const feedback=winnerDeliveryFeedback(row,failures);if(enrichment&&feedback.length)enrichment=recoverDeliveryContacts(row,enrichment,feedback);if(enrichment&&mode==='apply')await patchRow(access,row,enrichment);results.push({id:row.id,title:row.title,status:enrichment?.status||'not_found',delivery_recovery:enrichment?.delivery_recovery||null,organizations:(enrichment?.organizations||[]).map(o=>({name:o.name,website:o.official_website,contacts:o.contacts.filter(c=>['email','phone','person','contact_form'].includes(c.type)).map(c=>({type:c.type,value:c.value,purpose:c.purpose,confidence:c.confidence,company_attribution:c.company_attribution||null,draft_eligible:c.draft_eligible===true}))})),unassigned_ted_contacts:enrichment?.unassigned_ted_contacts||{}});}catch(e){results.push({id:row.id,title:row.title,status:'error',error:String(e?.message||e)});}}
 const summary={mode,version:VERSION,recovery_only:recoveryOnly,auth_mode:access.authMode||'service_key',minimum_score:minScore,max_rows:maxRows,refresh_days:refreshDays,web_search:searchEnabled,candidates:candidates.length,found:results.filter(x=>x.status==='found').length,partial:results.filter(x=>x.status==='partial').length,not_found:results.filter(x=>x.status==='not_found').length,errors:results.filter(x=>x.status==='error').length,results};await writeSummary(summary);console.log(`TED winner contact enrichment ${mode}: candidates=${summary.candidates}, found=${summary.found}, partial=${summary.partial}, errors=${summary.errors}.`);return summary;
}
const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct)runTedWinnerContactEnrichment().catch(async error=>{try{await writeSummary({error:String(error?.message||error),mode:process.env.SYNC_MODE||'preview'});}catch{}console.error(error?.message||error);process.exit(1);});
