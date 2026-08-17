import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const VERSION='ted-history-contact-v1';
const LEGAL_WORDS=new Set(['gmbh','mbh','co','kg','ag','se','srl','sro','sp','zoo','sa','sas','sasu','ltd','limited','inc','llc','bv','nv','oy','ab','aps','as','doo','d.o.o','gesellschaft','gesellschaftmbh','gruppe','group','company','unternehmen']);
const FREE_EMAIL_DOMAINS=new Set(['gmail.com','googlemail.com','yahoo.com','yahoo.de','outlook.com','hotmail.com','hotmail.de','live.com','icloud.com','gmx.de','gmx.net','web.de','freenet.de','t-online.de','aol.com','proton.me','protonmail.com']);

const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const unique=arr=>[...new Set((arr||[]).filter(Boolean).map(String))];
function payload(row){return row&&row.payload&&typeof row.payload==='object'?row.payload:{};}
function winner(row){const w=payload(row).winner;return w&&typeof w==='object'?w:{};}
function winnerNames(w){return unique([...(Array.isArray(w.names)?w.names:[]),w.name].map(text));}
function winnerEmails(w){return unique([...(Array.isArray(w.emails)?w.emails:[]),w.email].map(text).filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)));}
function winnerWebsites(w){return unique([...(Array.isArray(w.websites)?w.websites:[]),w.website].map(text).filter(Boolean));}
function emailDomain(v){const m=text(v).toLowerCase().match(/@([^\s>]+)$/);return m?m[1].replace(/[>,.;]+$/,''):'';}
function domainOfUrl(v){try{return new URL(text(v)).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}}
function companyTokens(name){return unique(norm(name).replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(x=>x.length>=3&&!LEGAL_WORDS.has(x)));}
export function companyKey(name){return companyTokens(name).join(' ');}
function domainMatchesCompany(domain,name){const d=norm(domain).replace(/[^a-z0-9]/g,'');return companyTokens(name).some(t=>t.length>=4&&d.includes(t.replace(/[^a-z0-9]/g,'')));}
function currentEnrichment(w){const e=w&&w.contact_enrichment;return e&&typeof e==='object'?e:null;}
function isTedAward(row){const p=payload(row);return String(p.source||'').toUpperCase()==='TED'&&p.notice_phase==='award';}
function sourceContacts(row,name){
 const w=winner(row),names=winnerNames(w),emails=winnerEmails(w),websites=winnerWebsites(w),out={emails:[],websites:[],points:[]};
 if(!name||!names.length)return out;
 const targetKey=companyKey(name);if(!targetKey||!names.some(n=>companyKey(n)===targetKey))return out;
 if(names.length===1){out.emails.push(...emails);out.websites.push(...websites);if(w.contact_point)out.points.push(text(w.contact_point));}
 else{
  emails.forEach(e=>{if(domainMatchesCompany(emailDomain(e),name))out.emails.push(e);});
  websites.forEach(u=>{if(domainMatchesCompany(domainOfUrl(u),name))out.websites.push(u);});
 }
 const e=currentEnrichment(w);
 if(e&&Array.isArray(e.organizations)){
  for(const org of e.organizations){if(companyKey(org&&org.name)!==targetKey)continue;
   for(const c of Array.isArray(org&&org.contacts)?org.contacts:[]){if(c&&c.source_type==='TED'&&c.type==='email'&&c.value)out.emails.push(text(c.value));if(c&&c.source_type==='TED'&&c.type==='person'&&c.value)out.points.push(text(c.value));}
  }
 }
 out.emails=unique(out.emails);out.websites=unique(out.websites);out.points=unique(out.points);return out;
}
function historicalSeedForName(row,name,historyRows){
 const currentId=String(row&&row.id||''),key=companyKey(name),emails=[],websites=[],points=[],sources=[];
 if(!key)return{emails,websites,points,sources};
 for(const hist of Array.isArray(historyRows)?historyRows:[]){if(!hist||String(hist.id||'')===currentId||!isTedAward(hist))continue;
  const hw=winner(hist);if(!winnerNames(hw).some(n=>companyKey(n)===key))continue;
  const c=sourceContacts(hist,name);if(!c.emails.length&&!c.websites.length&&!c.points.length)continue;
  c.emails.forEach(v=>emails.push(v));c.websites.forEach(v=>websites.push(v));c.points.forEach(v=>points.push(v));
  sources.push({procurement_no:hist.procurement_no||null,publication_no:hist.publication_no||null,winner_name:name});
 }
 return{emails:unique(emails),websites:unique(websites),points:unique(points),sources};
}
export function seedWinnerFromHistory(row,historyRows,seededAt=new Date().toISOString()){
 if(!row||!isTedAward(row))return{changed:false,row};
 const p={...payload(row)},w={...winner(row)},names=winnerNames(w);if(!names.length)return{changed:false,row};
 const e=currentEnrichment(w);if(e&&e.status==='found'&&Number(e.contact_count||0)>0)return{changed:false,row};
 let emails=winnerEmails(w),websites=winnerWebsites(w),points=unique([...(Array.isArray(w.contacts)?w.contacts:[]),w.contact_point].filter(Boolean)),addedEmails=[],addedWebsites=[],addedPoints=[],sources=[];
 for(const name of names){const seed=historicalSeedForName(row,name,historyRows);const multi=names.length>1;
  for(const value of seed.emails){if(multi&&!domainMatchesCompany(emailDomain(value),name))continue;if(!emails.some(x=>x.toLowerCase()===value.toLowerCase())){emails.push(value);addedEmails.push(value);}}
  for(const value of seed.websites){if(multi&&!domainMatchesCompany(domainOfUrl(value),name))continue;if(!websites.includes(value)){websites.push(value);addedWebsites.push(value);}}
  for(const value of seed.points){if(!points.includes(value)){points.push(value);addedPoints.push(value);}}
  sources.push(...seed.sources);
 }
 if(!addedEmails.length&&!addedWebsites.length&&!addedPoints.length)return{changed:false,row};
 w.emails=unique(emails);w.websites=unique(websites);w.contacts=unique(points);
 if(names.length===1){if(!w.email&&w.emails.length)w.email=w.emails[0];if(!w.website&&w.websites.length)w.website=w.websites[0];if(!w.contact_point&&w.contacts.length)w.contact_point=w.contacts[0];}
 if(e&&(e.status==='not_found'||e.status==='partial'))delete w.contact_enrichment;
 w.history_contact_seed={version:VERSION,seeded_at:seededAt,emails:unique(addedEmails),websites:unique(addedWebsites),contact_points:unique(addedPoints),sources:sources.slice(0,20)};
 p.winner=w;
 return{changed:true,row:{...row,payload:p},seed:w.history_contact_seed};
}
async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await response.text();if(!response.ok)throw new Error(`${method} ${path} failed: HTTP ${response.status} ${raw.slice(0,700)}`);return raw?JSON.parse(raw):[];}
async function patchRow(access,row){await rest({...access,path:`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,method:'PATCH',body:{payload:row.payload,updated_at:new Date().toISOString()},prefer:'return=minimal'});}
async function writeSummary(summary){await mkdir('tmp',{recursive:true});await writeFile('tmp/ted-winner-contact-history-reuse.json',JSON.stringify(summary,null,2));}
export async function runTedWinnerContactHistoryReuse({mode=process.env.SYNC_MODE||'preview',minScore=Number(process.env.TED_CONTACT_MIN_SCORE||85),maxRows=Number(process.env.TED_HISTORY_REUSE_MAX_ROWS||50),supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'',bearerToken=''}={}){
 if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
 const access=apiKey?{supabaseUrl,apiKey,bearerToken:bearerToken||apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});
 const all=await rest({...access,path:'kek_tender_watch?select=id,procurement_no,publication_no,relevance_score,status,payload&order=published_date.desc&limit=2000'});
 const ted=(Array.isArray(all)?all:[]).filter(isTedAward),targets=ted.filter(r=>Number(r.relevance_score||0)>=minScore&&r.status!=='ignored'&&winnerNames(winner(r)).length).slice(0,Math.max(0,maxRows));
 const results=[];
 for(const row of targets){const seeded=seedWinnerFromHistory(row,ted);if(!seeded.changed)continue;if(mode==='apply')await patchRow(access,seeded.row);results.push({id:row.id,procurement_no:row.procurement_no,winner_names:winnerNames(winner(row)),added_emails:seeded.seed.emails,added_websites:seeded.seed.websites,added_contact_points:seeded.seed.contact_points,sources:seeded.seed.sources});}
 const summary={mode,version:VERSION,auth_mode:access.authMode||'service_key',minimum_score:minScore,rows_scanned:targets.length,rows_seeded:results.length,results};await writeSummary(summary);console.log(`TED winner history reuse ${mode}: scanned=${summary.rows_scanned}, seeded=${summary.rows_seeded}.`);return summary;
}
const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct)runTedWinnerContactHistoryReuse().catch(async error=>{try{await writeSummary({error:String(error?.message||error),mode:process.env.SYNC_MODE||'preview'});}catch{}console.error(error?.message||error);process.exit(1);});
