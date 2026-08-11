import fs from 'node:fs';
import { recoverFailedVcards, sleep } from './bitrix-carddav-fetch-recovery.mjs';
import { makeSourceRow, safeUpsertSourceRows } from './contact-provenance-common.mjs';
import { resolveBitrixEmailGroups } from './bitrix-contact-email-resolver.mjs';

const host = process.env.BITRIX_HOST || 'b24-cl53os.bitrix24.com';
const login = process.env.BITRIX_LOGIN || 'sales@prissteel.com';
const bitrixPassword = process.env.BITRIX_APP_PASSWORD || '';
const ppppEmail = process.env.PPPP_SYNC_EMAIL || '';
const ppppPassword = process.env.PPPP_SYNC_PASSWORD || '';

if (!bitrixPassword || !ppppEmail || !ppppPassword) {
  console.log('Bitrix provenance skipped: required credentials are not configured.');
  process.exit(0);
}

const base = `https://${host}`;
const bitrixAuth = 'Basic ' + Buffer.from(`${login}:${bitrixPassword}`).toString('base64');
const crmBook = `${base}/bitrix/groupdav.php/s1/${encodeURIComponent(login)}/addressbook/crmContacts/`;
const xmlDecode = (s='') => s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const hrefs = (xml='') => [...xml.matchAll(/<(?:[a-z]+:)?href[^>]*>([\s\S]*?)<\/(?:[a-z]+:)?href>/gi)].map(m => xmlDecode(m[1].trim()));
const abs = h => /^https?:\/\//i.test(h) ? h : new URL(h, base).href;
const unfold = (s='') => s.replace(/\r?\n[ \t]/g,'');
const qp = (s='') => s.replace(/=([0-9A-F]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));
const cleanVal = (v='') => v.replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\').trim();

function decodeProp(line) {
  const p = line.indexOf(':');
  if (p < 0) return null;
  const left=line.slice(0,p),raw=line.slice(p+1),parts=left.split(';'),name=parts.shift(),params=parts.join(';').toUpperCase();
  let value=raw;
  if(params.includes('ENCODING=QUOTED-PRINTABLE'))value=qp(value);
  else if(params.includes('ENCODING=B')||params.includes('ENCODING=BASE64')){try{value=Buffer.from(value,'base64').toString('utf8');}catch{}}
  return { name:name.toUpperCase(), value:cleanVal(value) };
}

function parseVcard(text, href) {
  const props=unfold(text).split(/\r?\n/).map(decodeProp).filter(Boolean);
  const vals=n=>props.filter(p=>p.name===n).map(p=>p.value).filter(Boolean);
  const first=n=>vals(n)[0]||'';
  let person=first('FN');
  if(!person){const n=first('N').split(';');person=[n[1],n[0]].filter(Boolean).join(' ').trim();}
  const company=first('ORG').split(';').filter(Boolean).join(' · ');
  const email=first('EMAIL').trim().toLowerCase();
  const bitrix_id=(String(href).match(/\/([^/]+)\.vcf(?:\?|$)/i)||[])[1]||'';
  return {email,bitrix_id,person,company,vcard_kind:first('KIND')};
}

async function bfetch(url, opt={}) {
  let last;
  for (let attempt=0; attempt<3; attempt++) {
    try {
      const response = await fetch(url, { ...opt, headers:{ Authorization:bitrixAuth, 'User-Agent':'PRISTEEL-PPPP-Bitrix-Provenance/1.0', ...(opt.headers||{}) } });
      const body = await response.text();
      if (response.ok || response.status === 207) return body;
      last = new Error(`${opt.method||'GET'} ${url} -> ${response.status}`);
      if (![408,425,429,500,502,503,504].includes(response.status)) throw last;
    } catch (error) { last = error; }
    await sleep(1200 * (attempt + 1));
  }
  throw last || new Error(`GET ${url} failed`);
}

async function mapLimit(items, limit, fn) {
  let cursor=0;
  const out=new Array(items.length);
  async function worker() {
    while (true) {
      const i=cursor++;
      if (i>=items.length) return;
      try { out[i]=await fn(items[i],i); }
      catch (error) { out[i]={__error:String(error?.message||error),__item:items[i]}; }
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,Math.max(1,items.length))},worker));
  return out;
}

function readSupabaseConfig() {
  const html = fs.readFileSync('pristeel-procurement.html','utf8');
  const um = html.match(/var\s+_SB_URL\s*=\s*['\"]([^'\"]+)['\"]/);
  const km = html.match(/var\s+_SB_KEY\s*=\s*['\"]([^'\"]+)['\"]/);
  if (!um || !km) throw new Error('Could not read PPPP Supabase config.');
  return {url:um[1],key:km[1]};
}

async function ppppSession() {
  const cfg=readSupabaseConfig();
  const response=await fetch(`${cfg.url}/auth/v1/token?grant_type=password`,{
    method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},
    body:JSON.stringify({email:ppppEmail,password:ppppPassword})
  });
  const body=await response.text();
  if (!response.ok) throw new Error(`PPPP auth failed: HTTP ${response.status}`);
  const session=JSON.parse(body);
  if (!session.access_token) throw new Error('PPPP auth returned no access token.');
  return {...cfg,token:session.access_token};
}

async function readLocalContacts(cfg) {
  const all=[];
  for (let offset=0; offset<20000; offset+=1000) {
    const response=await fetch(`${cfg.url}/rest/v1/contacts?select=id,email&limit=1000&offset=${offset}`,{
      headers:{apikey:cfg.key,Authorization:`Bearer ${cfg.token}`}
    });
    const body=await response.text();
    if (!response.ok) throw new Error(`PPPP provenance read failed: HTTP ${response.status}`);
    const rows=body?JSON.parse(body):[];
    all.push(...rows);
    if (rows.length<1000) return all;
  }
  throw new Error('Guard stopped Bitrix provenance: more than 20000 PPPP contacts.');
}

try {
  const propfind='<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getetag/><d:getcontenttype/></d:prop></d:propfind>';
  const xml=await bfetch(crmBook,{method:'PROPFIND',headers:{Depth:'1','Content-Type':'application/xml; charset=utf-8'},body:propfind});
  const cardHrefs=[...new Set(hrefs(xml).filter(h=>/\.vcf(?:\?|$)/i.test(h)))];
  if (cardHrefs.length<1 || cardHrefs.length>5000) throw new Error(`Unexpected Bitrix vCard count ${cardHrefs.length}.`);

  const fetchOne=async h=>parseVcard(await bfetch(abs(h)),h);
  const firstPass=await mapLimit(cardHrefs,3,fetchOne);
  const recovered=await recoverFailedVcards(firstPass,cardHrefs,fetchOne,{cooldownMs:10000,pauseMs:1500,attempts:6});
  const parsed=recovered.rows.filter(x=>x&&!x.__error);
  const resolved=resolveBitrixEmailGroups(parsed);

  const cfg=await ppppSession();
  const local=await readLocalContacts(cfg);
  const localGroups=new Map();
  for (const row of local) {
    const email=String(row.email||'').trim().toLowerCase();
    if (!email) continue;
    if (!localGroups.has(email)) localGroups.set(email,[]);
    localGroups.get(email).push(row);
  }

  const seenAt=new Date().toISOString();
  const sourceRows=[];
  let skippedAmbiguous=resolved.unresolvedDuplicates.length;
  for (const [email,b] of resolved.byEmail) {
    const pgroup=localGroups.get(email)||[];
    if (pgroup.length!==1) {
      skippedAmbiguous++;
      continue;
    }
    sourceRows.push(makeSourceRow({
      contactId:pgroup[0].id,
      email,
      source:'bitrix24',
      externalId:b.bitrix_id,
      seenAt
    }));
  }

  const result=await safeUpsertSourceRows({
    supabaseUrl:cfg.url,
    apiKey:cfg.key,
    bearerToken:cfg.token,
    rows:sourceRows
  });

  if (result.available===false) {
    console.log('Bitrix provenance ready but inactive: run supabase/contact-sources-provenance.sql first.');
  } else if (result.available===null) {
    console.log(`Bitrix provenance warning: ${result.error}`);
  } else {
    console.log(`Bitrix provenance updated: ${result.upserted} source link(s); company/contact groups safely collapsed: ${resolved.resolvedDuplicates.length}; ambiguous skipped: ${skippedAmbiguous}.`);
  }
} catch (error) {
  console.log(`Bitrix provenance warning: ${String(error?.message||error)}`);
  process.exit(0);
}
