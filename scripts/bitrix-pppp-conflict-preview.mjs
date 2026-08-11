import fs from 'node:fs';
import { recoverFailedVcards, sleep } from './bitrix-carddav-fetch-recovery.mjs';

const host=process.env.BITRIX_HOST||'b24-cl53os.bitrix24.com';
const login=process.env.BITRIX_LOGIN||'sales@prissteel.com';
const bitrixPassword=process.env.BITRIX_APP_PASSWORD||'';
const ppppEmail=process.env.PPPP_SYNC_EMAIL||'';
const ppppPassword=process.env.PPPP_SYNC_PASSWORD||'';
if(!bitrixPassword||!ppppEmail||!ppppPassword){console.error('Missing required GitHub secrets.');process.exit(2);}

const base=`https://${host}`;
const auth='Basic '+Buffer.from(`${login}:${bitrixPassword}`).toString('base64');
const crmBook=`${base}/bitrix/groupdav.php/s1/${encodeURIComponent(login)}/addressbook/crmContacts/`;
const xmlDecode=(s='')=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const hrefs=(xml='')=>[...xml.matchAll(/<(?:[a-z]+:)?href[^>]*>([\s\S]*?)<\/(?:[a-z]+:)?href>/gi)].map(m=>xmlDecode(m[1].trim()));
const abs=h=>/^https?:\/\//i.test(h)?h:new URL(h,base).href;
const unfold=(s='')=>s.replace(/\r?\n[ \t]/g,'');
const qp=(s='')=>s.replace(/=([0-9A-F]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));
const cleanVal=(v='')=>v.replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\').trim();
const norm=v=>String(v||'').trim().replace(/\s+/g,' ');
const same=(a,b)=>norm(a).toLowerCase()===norm(b).toLowerCase();

function decodeProp(line){
  const p=line.indexOf(':'); if(p<0)return null;
  const left=line.slice(0,p),raw=line.slice(p+1); const [name,...params]=left.split(';');
  const ps=params.join(';').toUpperCase(); let value=raw;
  if(ps.includes('ENCODING=QUOTED-PRINTABLE'))value=qp(value);
  else if(ps.includes('ENCODING=B')||ps.includes('ENCODING=BASE64')){try{value=Buffer.from(value,'base64').toString('utf8');}catch{}}
  return {name:name.toUpperCase(),value:cleanVal(value)};
}
function parseVcard(text,href){
  const props=unfold(text).split(/\r?\n/).map(decodeProp).filter(Boolean);
  const vals=n=>props.filter(p=>p.name===n).map(p=>p.value).filter(Boolean); const first=n=>vals(n)[0]||'';
  let person=first('FN'); if(!person){const n=first('N').split(';');person=[n[1],n[0]].filter(Boolean).join(' ').trim();}
  const company=first('ORG').split(';').filter(Boolean).join(' · ');
  const email=first('EMAIL').trim().toLowerCase(); const phone=first('TEL'); const role=first('TITLE');
  const adr=first('ADR').split(';'); const country=(adr[6]||'').trim();
  const bitrix_id=(String(href).match(/\/([^/]+)\.vcf(?:\?|$)/i)||[])[1]||'';
  return {bitrix_id,person,company,email,phone,role,country};
}
function retryable(s){return [408,425,429,500,502,503,504].includes(s);}
async function bfetch(url,opt={}){
  let last;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const r=await fetch(url,{...opt,headers:{Authorization:auth,'User-Agent':'PRISTEEL-PPPP-Bitrix-ConflictPreview/1.0',...(opt.headers||{})}});
      const t=await r.text(); if(r.ok||r.status===207)return t;
      const e=new Error(`${opt.method||'GET'} ${url} -> ${r.status}`);e.status=r.status;last=e;if(!retryable(r.status))throw e;
    }catch(e){last=e;if(e.status&&!retryable(e.status))throw e;}
    await sleep(1200*(attempt+1));
  }
  throw last||new Error(`GET ${url} failed`);
}
async function mapLimit(items,limit,fn){let i=0;const out=new Array(items.length);async function w(){while(true){const x=i++;if(x>=items.length)return;try{out[x]=await fn(items[x],x);}catch(e){out[x]={__error:String(e.message||e),__item:items[x]};}}}await Promise.all(Array.from({length:Math.min(limit,items.length)},w));return out;}
function readSupabaseConfig(){
  const html=fs.readFileSync('pristeel-procurement.html','utf8');
  const um=html.match(/var\s+_SB_URL\s*=\s*['\"]([^'\"]+)['\"]/);const km=html.match(/var\s+_SB_KEY\s*=\s*['\"]([^'\"]+)['\"]/);
  if(!um||!km)throw new Error('Could not read PPPP Supabase config.');return {url:um[1],key:km[1]};
}
async function getPpppContacts(){
  const {url,key}=readSupabaseConfig();
  const ar=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:ppppEmail,password:ppppPassword})});
  const at=await ar.text();if(!ar.ok)throw new Error(`PPPP auth HTTP ${ar.status}`);const s=JSON.parse(at);if(!s.access_token)throw new Error('No PPPP access token');
  const all=[];const pageSize=1000;
  for(let offset=0;offset<20000;offset+=pageSize){
    const r=await fetch(`${url}/rest/v1/contacts?select=id,email,company,person,kind,country,role,phone&limit=${pageSize}&offset=${offset}`,{headers:{apikey:key,Authorization:`Bearer ${s.access_token}`}});
    const txt=await r.text();if(!r.ok)throw new Error(`PPPP contacts HTTP ${r.status}`);const rows=JSON.parse(txt);all.push(...rows);if(rows.length<pageSize)return all;
  }
  throw new Error('PPPP contacts exceeded guard.');
}

try{
  const body=`<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getetag/><d:getcontenttype/></d:prop></d:propfind>`;
  const xml=await bfetch(crmBook,{method:'PROPFIND',headers:{Depth:'1','Content-Type':'application/xml; charset=utf-8'},body});
  const cardHrefs=[...new Set(hrefs(xml).filter(h=>/\.vcf(?:\?|$)/i.test(h)))];
  const fetchOne=async h=>parseVcard(await bfetch(abs(h)),h);
  const firstPass=await mapLimit(cardHrefs,3,fetchOne);
  const recovered=await recoverFailedVcards(firstPass,cardHrefs,fetchOne,{cooldownMs:10000,pauseMs:1500,attempts:6});
  const errors=recovered.rows.filter(x=>x&&x.__error);if(errors.length)throw new Error(`Incomplete Bitrix read: ${errors.length} errors remain.`);
  const bitrixContacts=recovered.rows.filter(x=>x&&!x.__error&&x.email);
  const byEmail=new Map();for(const c of bitrixContacts){if(!byEmail.has(c.email))byEmail.set(c.email,c);}
  const local=await getPpppContacts();const groups=new Map();for(const c of local){const e=String(c.email||'').trim().toLowerCase();if(!e)continue;if(!groups.has(e))groups.set(e,[]);groups.get(e).push(c);}
  const fields=['company','person','phone','role','country'];const conflicts=[];const duplicateSkipped=[];
  for(const [email,b] of byEmail){
    const g=groups.get(email)||[];if(g.length!==1){if(g.length>1)duplicateSkipped.push(email);continue;}
    const p=g[0];const diffs=[];
    for(const f of fields){const bv=norm(b[f]),pv=norm(p[f]);if(bv&&pv&&!same(bv,pv))diffs.push({field:f,pppp:pv,bitrix:bv});}
    if(diffs.length)conflicts.push({email,kind:p.kind||'',person:p.person||'',company:p.company||'',diffs});
  }
  console.log('BITRIX -> PPPP CONFLICT PREVIEW (NO WRITES)');
  console.log(`Bitrix vCards: ${cardHrefs.length} | parsed: ${bitrixContacts.length} | fetch errors remaining: 0`);
  console.log(`Conflicting contacts: ${conflicts.length} | duplicate PPPP emails skipped: ${duplicateSkipped.length}`);
  console.log('');
  console.log('CONFLICT DETAILS:');
  if(!conflicts.length)console.log('  none');
  conflicts.forEach((c,i)=>{
    console.log(`  ${i+1}. ${c.email} | ${c.person||c.company||'(pa emer)'} [${c.kind||'-'}]`);
    c.diffs.forEach(d=>console.log(`     ${d.field}: PPPP="${d.pppp}" | Bitrix="${d.bitrix}"`));
  });
  if(duplicateSkipped.length){console.log('');console.log(`DUPLICATE PPPP EMAILS SKIPPED: ${duplicateSkipped.join(', ')}`);}
  fs.mkdirSync('tmp',{recursive:true});fs.writeFileSync('tmp/bitrix-pppp-conflicts.json',JSON.stringify({checkedAt:new Date().toISOString(),conflicts,duplicateSkipped},null,2));
}catch(e){console.error('Conflict preview failed:',e&&e.stack?e.stack:e);process.exit(1);}
