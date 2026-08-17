import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const VERSION='winner-contact-v1';
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
function safeUrl(v){try{const u=new URL(text(v));return /^https?:$/.test(u.protocol)?u:null;}catch{return null;}}
function domainOfUrl(v){const u=safeUrl(v);return u?u.hostname.toLowerCase().replace(/^www\./,''):'';}
function emailDomain(v){const m=text(v).toLowerCase().match(/@([^\s>]+)$/);return m?m[1].replace(/[>,.;]+$/,''):'';}
function corporateEmail(v){const d=emailDomain(v);return !!d&&!FREE_EMAIL_DOMAINS.has(d);}
function companyTokens(name){return unique(norm(name).replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(x=>x.length>=4&&!LEGAL_WORDS.has(x)));}
function domainMatchesCompany(domain,name){const d=norm(domain).replace(/[^a-z0-9]/g,'');return companyTokens(name).some(t=>t.length>=4&&d.includes(t.replace(/[^a-z0-9]/g,'')));}
function pageMatchesCompany(html,url,name){const h=norm(String(html||'').replace(/<[^>]+>/g,' '));const d=domainOfUrl(url);const tokens=companyTokens(name);if(domainMatchesCompany(d,name))return true;return tokens.some(t=>t.length>=5&&h.includes(t));}
function daysSince(iso){const t=Date.parse(iso||'');return Number.isFinite(t)?Math.floor((Date.now()-t)/86400000):99999;}
function sourceWinner(row){const p=row?.payload&&typeof row.payload==='object'?row.payload:{};return p.winner&&typeof p.winner==='object'?p.winner:{};}
function winnerNames(w){return unique([...(Array.isArray(w.names)?w.names:[]),w.name].map(text));}
function winnerEmails(w){return unique([...(Array.isArray(w.emails)?w.emails:[]),w.email].map(text).filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)));}
function winnerWebsites(w){return unique([...(Array.isArray(w.websites)?w.websites:[]),w.website].map(text).filter(Boolean));}
function winnerContacts(w){return unique([...(Array.isArray(w.contacts)?w.contacts:[]),w.contact_point].map(text).filter(Boolean));}
function winnerCities(w){return unique([...(Array.isArray(w.cities)?w.cities:[]),w.city].map(text).filter(Boolean));}
function winnerCountries(w){return unique([...(Array.isArray(w.countries)?w.countries:[]),w.country].map(text).filter(Boolean));}
function contactPurpose(email){const local=text(email).split('@')[0]||'';for(const [re,purpose,score] of PURPOSE_RULES)if(re.test(local))return{purpose,score};return{purpose:'person',score:86};}
function contactKey(c){return `${c.type}:${String(c.value||'').toLowerCase()}`;}
function addContact(list,c){if(!c||!c.value)return;const k=contactKey(c);const old=list.find(x=>contactKey(x)===k);if(!old){list.push(c);return;}if(Number(c.score||0)>Number(old.score||0))Object.assign(old,c);}
function stripTags(v){return text(String(v||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' '));}
function decodeHtml(v){return String(v||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
function extractEmails(html){const out=[];const raw=decodeHtml(String(html||''));for(const m of raw.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)){const e=m[0].toLowerCase();if(!/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(e))out.push(e);}return unique(out);}
function extractTelLinks(html){const out=[];for(const m of String(html||'').matchAll(/href=["']tel:([^"']+)["']/gi)){const v=decodeURIComponent(m[1]).replace(/\s+/g,' ').trim();if(v)out.push(v);}return unique(out);}
function extractLinks(html,base){const out=[];for(const m of String(html||'').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){try{const href=decodeHtml(m[1]);if(/^mailto:|^tel:/i.test(href))continue;const u=new URL(href,base);if(!/^https?:$/.test(u.protocol))continue;out.push({url:u.href,text:stripTags(m[2])});}catch{}}return out;}
function candidateContactPages(html,base){const host=domainOfUrl(base);const seen=new Set(),out=[];for(const x of extractLinks(html,base)){if(domainOfUrl(x.url)!==host)continue;if(!CONTACT_WORDS.test(`${x.url} ${x.text}`))continue;const clean=x.url.split('#')[0];if(seen.has(clean))continue;seen.add(clean);out.push(clean);if(out.length>=5)break;}return out;}
async function fetchText(url,{fetchImpl=fetch,timeoutMs=8000}={}){const response=await fetchImpl(url,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (compatible; PRISTEEL-Procurement-Research/1.0; +https://prissteel.com)','Accept':'text/html,application/xhtml+xml;q=0.9,*/*;q=0.7'},signal:AbortSignal.timeout(timeoutMs)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const ct=String(response.headers?.get?.('content-type')||'');if(ct&&!/html|text/i.test(ct))throw new Error('non-html');return{html:await response.text(),url:response.url||url};}
function ddgResultUrls(html){const out=[];for(const m of String(html||'').matchAll(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["']/gi)){let href=decodeHtml(m[1]);try{const u=new URL(href,'https://html.duckduckgo.com');const encoded=u.searchParams.get('uddg');if(encoded)href=decodeURIComponent(encoded);}catch{}const u=safeUrl(href);if(!u)continue;const d=domainOfUrl(u.href);if(!d||/duckduckgo\.com$/.test(d))continue;out.push(u.href);}return unique(out).slice(0,8);}
async function searchOfficialWebsite(name,country,{fetchImpl=fetch,searchEnabled=true}={}){if(!searchEnabled)return null;const q=encodeURIComponent(`"${name}" ${country||''} official contact`);try{const {html}=await fetchText(`https://html.duckduckgo.com/html/?q=${q}`,{fetchImpl,timeoutMs:9000});for(const u of ddgResultUrls(html)){try{const page=await fetchText(u,{fetchImpl,timeoutMs:7000});if(pageMatchesCompany(page.html,page.url,name))return{url:page.url,html:page.html,source:'web_search'};}catch{}}}catch{}return null;}
function seedAssignments(w,names){const emails=winnerEmails(w),websites=winnerWebsites(w),out=new Map(names.map(n=>[n,{emails:[],websites:[],contact_points:[]}])) ;
 if(names.length===1){out.get(names[0]).emails.push(...emails);out.get(names[0]).websites.push(...websites);out.get(names[0]).contact_points.push(...winnerContacts(w));return out;}
 for(const site of websites){const d=domainOfUrl(site);const matches=names.filter(n=>domainMatchesCompany(d,n));if(matches.length===1)out.get(matches[0]).websites.push(site);}
 for(const email of emails){const d=emailDomain(email);const matches=names.filter(n=>domainMatchesCompany(d,n));if(matches.length===1)out.get(matches[0]).emails.push(email);}
 return out;
}
function unassignedTedContacts(w,assignments){const usedEmails=new Set(),usedWebsites=new Set();for(const a of assignments.values()){a.emails.forEach(x=>usedEmails.add(x.toLowerCase()));a.websites.forEach(x=>usedWebsites.add(x));}return{emails:winnerEmails(w).filter(x=>!usedEmails.has(x.toLowerCase())),websites:winnerWebsites(w).filter(x=>!usedWebsites.has(x))};}
async function researchOrganization({name,city='',country='',seed,fetchImpl=fetch,searchEnabled=true}){
 const contacts=[],sources=[];let officialWebsite='';let verified=false;let homepage=null;
 for(const email of seed.emails||[]){const p=contactPurpose(email);addContact(contacts,{type:'email',value:email,purpose:p.purpose,source_type:'TED',source_url:null,confidence:'high',score:Math.max(88,p.score)});}
 for(const point of seed.contact_points||[])addContact(contacts,{type:'person',value:point,purpose:'contact_point',source_type:'TED',source_url:null,confidence:'high',score:90});
 const siteSeeds=unique([...(seed.websites||[]),...(seed.emails||[]).filter(corporateEmail).map(e=>`https://${emailDomain(e)}`)]);
 for(const site of siteSeeds){try{const p=await fetchText(site,{fetchImpl});if(pageMatchesCompany(p.html,p.url,name)||domainMatchesCompany(domainOfUrl(p.url),name)||seed.websites?.includes(site)){homepage=p;officialWebsite=p.url;verified=true;sources.push({type:'official_website',url:p.url,confidence:'high'});break;}}catch{}}
 if(!homepage){const found=await searchOfficialWebsite(name,[city,country].filter(Boolean).join(' '),{fetchImpl,searchEnabled});if(found){homepage=found;officialWebsite=found.url;verified=true;sources.push({type:'web_search_verified_site',url:found.url,confidence:'medium'});}}
 if(homepage){
  const pages=[homepage];for(const url of candidateContactPages(homepage.html,homepage.url)){try{pages.push(await fetchText(url,{fetchImpl}));}catch{}}
  for(const page of pages){for(const email of extractEmails(page.html)){const sameDomain=emailDomain(email)===domainOfUrl(officialWebsite)||emailDomain(email).endsWith(`.${domainOfUrl(officialWebsite)}`);const p=contactPurpose(email);addContact(contacts,{type:'email',value:email,purpose:p.purpose,source_type:'official_website',source_url:page.url,confidence:sameDomain?'high':'medium',score:(sameDomain?10:0)+p.score});}for(const phone of extractTelLinks(page.html))addContact(contacts,{type:'phone',value:phone,purpose:'general',source_type:'official_website',source_url:page.url,confidence:'high',score:76});}
  addContact(contacts,{type:'website',value:officialWebsite,purpose:'company',source_type:'official_website',source_url:officialWebsite,confidence:verified?'high':'medium',score:75});
 }
 contacts.sort((a,b)=>Number(b.score||0)-Number(a.score||0));
 return{name,city:city||null,country:country||null,official_website:officialWebsite||null,domain:domainOfUrl(officialWebsite)||null,verified,contacts:contacts.slice(0,14),sources:unique(sources.map(x=>JSON.stringify(x))).map(x=>JSON.parse(x))};
}
export async function enrichWinnerPayload(row,{fetchImpl=fetch,searchEnabled=true}={}){
 const w=sourceWinner(row),names=winnerNames(w);if(!names.length)return null;
 const assignments=seedAssignments(w,names);const cities=winnerCities(w),countries=winnerCountries(w),organizations=[];
 for(let i=0;i<names.length;i++){const name=names[i];organizations.push(await researchOrganization({name,city:cities[i]||cities[0]||'',country:countries[i]||countries[0]||'',seed:assignments.get(name)||{emails:[],websites:[],contact_points:[]},fetchImpl,searchEnabled}));}
 const unassigned=unassignedTedContacts(w,assignments);const contactCount=organizations.reduce((n,o)=>n+o.contacts.filter(c=>c.type==='email'||c.type==='phone'||c.type==='person').length,0);
 return{version:VERSION,status:contactCount?'found':organizations.some(o=>o.official_website)?'partial':'not_found',researched_at:new Date().toISOString(),organizations,unassigned_ted_contacts:unassigned,contact_count:contactCount,search_method:searchEnabled?'ted_plus_public_web':'ted_plus_official_domain'};
}
async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await response.text();if(!response.ok)throw new Error(`${method} ${path} failed: HTTP ${response.status} ${raw.slice(0,700)}`);return raw?JSON.parse(raw):[];}
async function patchRow(access,row,enrichment){const payload={...(row.payload||{}),winner:{...sourceWinner(row),contact_enrichment:enrichment}};await rest({...access,path:`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,method:'PATCH',body:{payload,updated_at:new Date().toISOString()},prefer:'return=minimal'});}
async function writeSummary(summary){await mkdir('tmp',{recursive:true});await writeFile('tmp/ted-winner-contact-enrichment.json',JSON.stringify(summary,null,2));}
export async function runTedWinnerContactEnrichment({mode=process.env.SYNC_MODE||'preview',minScore=Number(process.env.TED_CONTACT_MIN_SCORE||85),maxRows=Number(process.env.TED_CONTACT_MAX_ROWS||12),refreshDays=Number(process.env.TED_CONTACT_REFRESH_DAYS||30),searchEnabled=String(process.env.TED_CONTACT_WEB_SEARCH||'1')!=='0',fetchImpl=fetch,supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'',bearerToken=''}={}){
 if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
 const access=apiKey?{supabaseUrl,apiKey,bearerToken:bearerToken||apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});
 const raw=await rest({...access,path:`kek_tender_watch?select=id,title,relevance_score,status,published_date,payload&relevance_score=gte.${encodeURIComponent(minScore)}&order=published_date.desc&limit=400`});
 const candidates=(Array.isArray(raw)?raw:[]).filter(r=>{const p=r?.payload||{};const w=p.winner||{};if(String(p.source||'').toUpperCase()!=='TED'||p.notice_phase!=='award'||!winnerNames(w).length||r.status==='ignored')return false;const old=w.contact_enrichment;return !old||daysSince(old.researched_at)>=refreshDays;}).slice(0,Math.max(0,maxRows));
 const results=[];
 for(const row of candidates){let enrichment;try{enrichment=await enrichWinnerPayload(row,{fetchImpl,searchEnabled});if(enrichment&&mode==='apply')await patchRow(access,row,enrichment);results.push({id:row.id,title:row.title,status:enrichment?.status||'not_found',organizations:(enrichment?.organizations||[]).map(o=>({name:o.name,website:o.official_website,contacts:o.contacts.filter(c=>['email','phone','person'].includes(c.type)).map(c=>({type:c.type,value:c.value,purpose:c.purpose,confidence:c.confidence}))})),unassigned_ted_contacts:enrichment?.unassigned_ted_contacts||{}});}catch(e){results.push({id:row.id,title:row.title,status:'error',error:String(e?.message||e)});}}
 const summary={mode,version:VERSION,auth_mode:access.authMode||'service_key',minimum_score:minScore,max_rows:maxRows,refresh_days:refreshDays,web_search:searchEnabled,candidates:candidates.length,found:results.filter(x=>x.status==='found').length,partial:results.filter(x=>x.status==='partial').length,not_found:results.filter(x=>x.status==='not_found').length,errors:results.filter(x=>x.status==='error').length,results};await writeSummary(summary);console.log(`TED winner contact enrichment ${mode}: candidates=${summary.candidates}, found=${summary.found}, partial=${summary.partial}, errors=${summary.errors}.`);return summary;
}
const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct)runTedWinnerContactEnrichment().catch(async error=>{try{await writeSummary({error:String(error?.message||error),mode:process.env.SYNC_MODE||'preview'});}catch{}console.error(error?.message||error);process.exit(1);});
