import fs from 'node:fs';
import { recoverFailedVcards, sleep } from './bitrix-carddav-fetch-recovery.mjs';

const host = process.env.BITRIX_HOST || 'b24-cl53os.bitrix24.com';
const login = process.env.BITRIX_LOGIN || 'sales@prissteel.com';
const password = process.env.BITRIX_APP_PASSWORD || '';
const ppppEmail = process.env.PPPP_SYNC_EMAIL || '';
const ppppPassword = process.env.PPPP_SYNC_PASSWORD || '';
if (!password) { console.error('Missing BITRIX_APP_PASSWORD'); process.exit(2); }
if (!ppppEmail || !ppppPassword) { console.error('Missing PPPP_SYNC_EMAIL or PPPP_SYNC_PASSWORD'); process.exit(2); }

const base = `https://${host}`;
const auth = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
const crmBook = `${base}/bitrix/groupdav.php/s1/${encodeURIComponent(login)}/addressbook/crmContacts/`;

const xmlDecode = (s='') => s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const hrefs = (xml='') => [...xml.matchAll(/<(?:[a-z]+:)?href[^>]*>([\s\S]*?)<\/(?:[a-z]+:)?href>/gi)].map(m => xmlDecode(m[1].trim()));
const abs = h => /^https?:\/\//i.test(h) ? h : new URL(h, base).href;
const unfold = (s='') => s.replace(/\r?\n[ \t]/g,'');
const qp = (s='') => s.replace(/=([0-9A-F]{2})/gi, (_,h) => String.fromCharCode(parseInt(h,16)));
const cleanVal = (v='') => v.replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\').trim();

function decodeProp(line) {
  const p = line.indexOf(':'); if (p < 0) return null;
  const left = line.slice(0,p), raw = line.slice(p+1); const [name,...params] = left.split(';');
  const ps = params.join(';').toUpperCase(); let value = raw;
  if (ps.includes('ENCODING=QUOTED-PRINTABLE')) value = qp(value);
  else if (ps.includes('ENCODING=B') || ps.includes('ENCODING=BASE64')) { try { value = Buffer.from(value,'base64').toString('utf8'); } catch {} }
  return { name:name.toUpperCase(), value:cleanVal(value) };
}

function parseVcard(text, href) {
  const props = unfold(text).split(/\r?\n/).map(decodeProp).filter(Boolean);
  const vals = n => props.filter(p => p.name === n).map(p => p.value).filter(Boolean);
  const first = n => vals(n)[0] || '';
  let person = first('FN');
  if (!person) { const n = first('N').split(';'); person = [n[1],n[0]].filter(Boolean).join(' ').trim(); }
  const org = first('ORG').split(';').filter(Boolean).join(' · ');
  const email = first('EMAIL').trim().toLowerCase();
  const phone = first('TEL'); const role = first('TITLE'); const adr = first('ADR').split(';');
  const country = (adr[6] || '').trim(); const id = (String(href).match(/\/([^/]+)\.vcf(?:\?|$)/i)||[])[1] || '';
  return { bitrix_id:id, person, company:org, email, phone, role, country };
}

function retryable(s) { return [408,425,429,500,502,503,504].includes(s); }
async function bfetch(url, opt={}) {
  let last;
  for (let attempt=0; attempt<3; attempt++) {
    try {
      const r = await fetch(url, { ...opt, headers:{ Authorization:auth, 'User-Agent':'PRISTEEL-PPPP-Bitrix-CompleteDryRun/1.0', ...(opt.headers||{}) } });
      const t = await r.text();
      if (r.ok || r.status === 207) return t;
      const e = new Error(`${opt.method||'GET'} ${url} -> ${r.status}`); e.status = r.status; last = e;
      if (!retryable(r.status)) throw e;
    } catch (e) { last = e; if (e.status && !retryable(e.status)) throw e; }
    await sleep(1200 * (attempt + 1));
  }
  throw last || new Error(`GET ${url} failed`);
}

async function mapLimit(items, limit, fn) {
  let i=0; const out = new Array(items.length);
  async function worker() { while (true) { const x=i++; if (x>=items.length) return; try { out[x]=await fn(items[x],x); } catch(e) { out[x]={__error:String(e.message||e),__item:items[x]}; } } }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker)); return out;
}

function readSupabaseConfig() {
  const html = fs.readFileSync('pristeel-procurement.html','utf8');
  const um = html.match(/var\s+_SB_URL\s*=\s*['\"]([^'\"]+)['\"]/); const km = html.match(/var\s+_SB_KEY\s*=\s*['\"]([^'\"]+)['\"]/);
  if (!um || !km) throw new Error('Could not read PPPP Supabase config from HTML');
  return {url:um[1], key:km[1]};
}

async function getPpppContacts() {
  const {url,key} = readSupabaseConfig();
  const ar = await fetch(`${url}/auth/v1/token?grant_type=password`, {method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:ppppEmail,password:ppppPassword})});
  const at = await ar.text(); if (!ar.ok) throw new Error(`PPPP auth HTTP ${ar.status}`);
  const session = JSON.parse(at); if (!session.access_token) throw new Error('No PPPP access token');
  const r = await fetch(`${url}/rest/v1/contacts?select=id,email,company,person,kind,country,role,phone&limit=5000`, {headers:{apikey:key,Authorization:`Bearer ${session.access_token}`}});
  const txt = await r.text(); if (!r.ok) throw new Error(`PPPP contacts HTTP ${r.status}`); return JSON.parse(txt);
}

const body = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getetag/><d:getcontenttype/></d:prop></d:propfind>`;
try {
  const xml = await bfetch(crmBook,{method:'PROPFIND',headers:{Depth:'1','Content-Type':'application/xml; charset=utf-8'},body});
  const cardHrefs = [...new Set(hrefs(xml).filter(h => /\.vcf(?:\?|$)/i.test(h)))];
  const fetchOne = async h => parseVcard(await bfetch(abs(h)), h);
  const firstPass = await mapLimit(cardHrefs, 3, fetchOne);
  const recovered = await recoverFailedVcards(firstPass, cardHrefs, fetchOne, {cooldownMs:10000,pauseMs:1500,attempts:6});
  const raw = recovered.rows;
  const contacts = raw.filter(x => x && !x.__error);
  const errors = raw.filter(x => x && x.__error);
  const withEmail = contacts.filter(c => c.email);
  const byEmail = new Map(); const bitrixDup = new Set();
  for (const c of withEmail) { if (byEmail.has(c.email)) bitrixDup.add(c.email); else byEmail.set(c.email,c); }

  const ppppRows = await getPpppContacts();
  const localGroups = new Map();
  for (const c of ppppRows) { const e=String(c.email||'').trim().toLowerCase(); if (!e) continue; if (!localGroups.has(e)) localGroups.set(e,[]); localGroups.get(e).push(c); }
  const duplicateGroups = [...localGroups.entries()].filter(([,rows]) => rows.length>1);
  let matched=0,newCount=0; const kinds={client:0,supplier:0,other:0,ambiguous:0}; const newContacts=[];
  for (const [email,c] of byEmail) {
    const rows = localGroups.get(email) || [];
    if (!rows.length) { newCount++; newContacts.push(c); continue; }
    matched++;
    if (rows.length>1) kinds.ambiguous++;
    else if (rows[0].kind==='client') kinds.client++;
    else if (rows[0].kind==='supplier') kinds.supplier++;
    else kinds.other++;
  }

  const errorKinds={};
  for (const e of errors) { const m=String(e.__error||'').match(/->\s*(\d{3})/); const k=m?`HTTP ${m[1]}`:'network/other'; errorKinds[k]=(errorKinds[k]||0)+1; }
  const summary={checkedAt:new Date().toISOString(),bitrix:{vcardResources:cardHrefs.length,parsed:contacts.length,firstPassErrors:firstPass.filter(x=>x&&x.__error).length,recovered:recovered.recovered,fetchErrors:errors.length,errorKinds,uniqueEmails:byEmail.size,noEmail:contacts.filter(c=>!c.email).length,duplicateEmails:bitrixDup.size},pppp:{contacts:ppppRows.length,duplicateEmailGroups:duplicateGroups.length},comparison:{matchedByEmail:matched,newByEmail:newCount,matchedKinds:kinds,newContacts}};
  fs.mkdirSync('tmp',{recursive:true}); fs.writeFileSync('tmp/bitrix-pppp-dryrun.json',JSON.stringify(summary,null,2));

  console.log('BITRIX -> PPPP COMPLETE DRY RUN (NO WRITES)');
  console.log(`Bitrix vCards: ${cardHrefs.length}`);
  console.log(`Parsed: ${contacts.length} | first-pass errors: ${summary.bitrix.firstPassErrors} | recovered serially: ${recovered.recovered} | fetch errors remaining: ${errors.length}`);
  if (errors.length) console.log(`Fetch error types: ${Object.entries(errorKinds).map(([k,v])=>`${k}=${v}`).join(' | ')}`);
  console.log(`Unique emails: ${byEmail.size} | no email: ${summary.bitrix.noEmail} | Bitrix duplicate emails: ${bitrixDup.size}`);
  console.log(`PPPP contacts: ${ppppRows.length} | PPPP duplicate email groups: ${duplicateGroups.length}`);
  console.log(`Matched by email: ${matched} | New by email: ${newCount}`);
  console.log(`Matched kinds: client=${kinds.client} | supplier=${kinds.supplier} | other=${kinds.other} | ambiguous duplicate email=${kinds.ambiguous}`);
  if (newContacts.length) {
    console.log('NEW BITRIX CONTACTS NOT IN PPPP:');
    newContacts.slice(0,100).forEach((c,i)=>console.log(`  ${i+1}. ${c.person||'(pa emer)'} | ${c.company||'-'} | ${c.email} | Bitrix ${c.bitrix_id}`));
  } else console.log('NEW BITRIX CONTACTS NOT IN PPPP: none');
  if (errors.length) { console.error(`INCOMPLETE BITRIX READ: ${errors.length} of ${cardHrefs.length} still failed after serial recovery.`); process.exit(4); }
} catch(e) {
  console.error('Complete dry run failed:', e && e.stack ? e.stack : e); process.exit(1);
}
