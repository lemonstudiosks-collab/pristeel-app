import fs from 'node:fs';
import { recoverFailedVcards, sleep } from './bitrix-carddav-fetch-recovery.mjs';
import { resolveBitrixEmailGroups } from './bitrix-contact-email-resolver.mjs';

const host = process.env.BITRIX_HOST || 'b24-cl53os.bitrix24.com';
const login = process.env.BITRIX_LOGIN || 'sales@prissteel.com';
const bitrixPassword = process.env.BITRIX_APP_PASSWORD || '';
const ppppEmail = process.env.PPPP_SYNC_EMAIL || '';
const ppppPassword = process.env.PPPP_SYNC_PASSWORD || '';
const mode = String(process.env.SYNC_MODE || 'preview').trim().toLowerCase();
const apply = mode === 'apply';

if (!bitrixPassword || !ppppEmail || !ppppPassword) {
  console.error('Missing required GitHub secrets.');
  process.exit(2);
}
if (!['preview','apply'].includes(mode)) {
  console.error(`Invalid SYNC_MODE: ${mode}`);
  process.exit(2);
}

const base = `https://${host}`;
const bitrixAuth = 'Basic ' + Buffer.from(`${login}:${bitrixPassword}`).toString('base64');
const crmBook = `${base}/bitrix/groupdav.php/s1/${encodeURIComponent(login)}/addressbook/crmContacts/`;

const xmlDecode = (s='') => s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const hrefs = (xml='') => [...xml.matchAll(/<(?:[a-z]+:)?href[^>]*>([\s\S]*?)<\/(?:[a-z]+:)?href>/gi)].map(m => xmlDecode(m[1].trim()));
const abs = h => /^https?:\/\//i.test(h) ? h : new URL(h, base).href;
const unfold = (s='') => s.replace(/\r?\n[ \t]/g,'');
const qp = (s='') => s.replace(/=([0-9A-F]{2})/gi, (_,h) => String.fromCharCode(parseInt(h,16)));
const cleanVal = (v='') => v.replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\').trim();
const norm = v => String(v || '').trim().replace(/\s+/g,' ');
const same = (a,b) => norm(a).toLowerCase() === norm(b).toLowerCase();

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
  const company = first('ORG').split(';').filter(Boolean).join(' · ');
  const email = first('EMAIL').trim().toLowerCase();
  const phone = first('TEL'); const role = first('TITLE'); const adr = first('ADR').split(';');
  const country = (adr[6] || '').trim(); const bitrix_id = (String(href).match(/\/([^/]+)\.vcf(?:\?|$)/i)||[])[1] || '';
  const vcard_kind = first('KIND');
  return { bitrix_id, person, company, email, phone, role, country, vcard_kind };
}

function retryable(s) { return [408,425,429,500,502,503,504].includes(s); }
async function bfetch(url, opt={}) {
  let last;
  for (let attempt=0; attempt<3; attempt++) {
    try {
      const r = await fetch(url, { ...opt, headers:{ Authorization:bitrixAuth, 'User-Agent':'PRISTEEL-PPPP-Bitrix-Sync/1.0', ...(opt.headers||{}) } });
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
  async function worker() {
    while (true) {
      const x=i++; if (x>=items.length) return;
      try { out[x] = await fn(items[x],x); }
      catch (e) { out[x] = { __error:String(e.message||e), __item:items[x] }; }
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
  return out;
}

function readSupabaseConfig() {
  const html = fs.readFileSync('pristeel-procurement.html','utf8');
  const um = html.match(/var\s+_SB_URL\s*=\s*['\"]([^'\"]+)['\"]/);
  const km = html.match(/var\s+_SB_KEY\s*=\s*['\"]([^'\"]+)['\"]/);
  if (!um || !km) throw new Error('Could not read PPPP Supabase config.');
  return { url:um[1], key:km[1] };
}

async function ppppSession() {
  const {url,key} = readSupabaseConfig();
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method:'POST', headers:{apikey:key,'Content-Type':'application/json'},
    body:JSON.stringify({email:ppppEmail,password:ppppPassword})
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`PPPP auth failed: HTTP ${r.status}`);
  const session = JSON.parse(txt);
  if (!session.access_token) throw new Error('PPPP auth returned no access token.');
  return {url,key,token:session.access_token};
}

async function getAllLocalContacts(cfg) {
  const all=[]; const pageSize=1000;
  for (let offset=0; offset<20000; offset+=pageSize) {
    const r = await fetch(`${cfg.url}/rest/v1/contacts?select=id,email,company,person,kind,country,role,phone&limit=${pageSize}&offset=${offset}`, {
      headers:{apikey:cfg.key,Authorization:`Bearer ${cfg.token}`}
    });
    const txt = await r.text();
    if (!r.ok) throw new Error(`PPPP contacts read failed: HTTP ${r.status}`);
    const rows = JSON.parse(txt); all.push(...rows);
    if (rows.length < pageSize) return all;
  }
  throw new Error('Guard stopped sync: PPPP contacts exceeded 20000 rows.');
}

async function insertBatch(cfg, rows) {
  if (!rows.length) return [];
  const r = await fetch(`${cfg.url}/rest/v1/contacts`, {
    method:'POST',
    headers:{apikey:cfg.key,Authorization:`Bearer ${cfg.token}`,'Content-Type':'application/json','Prefer':'return=representation'},
    body:JSON.stringify(rows)
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`PPPP insert failed: HTTP ${r.status} ${txt.slice(0,600)}`);
  return txt ? JSON.parse(txt) : [];
}

async function upsertBatch(cfg, rows) {
  if (!rows.length) return [];
  const r = await fetch(`${cfg.url}/rest/v1/contacts?on_conflict=id`, {
    method:'POST',
    headers:{apikey:cfg.key,Authorization:`Bearer ${cfg.token}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify(rows)
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`PPPP fill update failed: HTTP ${r.status} ${txt.slice(0,800)}`);
  return txt ? JSON.parse(txt) : [];
}

try {
  const propfind = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getetag/><d:getcontenttype/></d:prop></d:propfind>`;
  const xml = await bfetch(crmBook,{method:'PROPFIND',headers:{Depth:'1','Content-Type':'application/xml; charset=utf-8'},body:propfind});
  const cardHrefs = [...new Set(hrefs(xml).filter(h => /\.vcf(?:\?|$)/i.test(h)))];
  if (cardHrefs.length < 1 || cardHrefs.length > 5000) throw new Error(`Guard stopped sync: unexpected Bitrix vCard count ${cardHrefs.length}.`);

  const fetchOne = async h => parseVcard(await bfetch(abs(h)), h);
  const firstPass = await mapLimit(cardHrefs, 3, fetchOne);
  const recovered = await recoverFailedVcards(firstPass, cardHrefs, fetchOne, {cooldownMs:10000,pauseMs:1500,attempts:6});
  const raw = recovered.rows;
  const errors = raw.filter(x => x && x.__error);
  const contacts = raw.filter(x => x && !x.__error);
  if (errors.length) throw new Error(`Guard stopped sync: incomplete Bitrix read, ${errors.length}/${cardHrefs.length} vCards still failed.`);

  const resolved = resolveBitrixEmailGroups(contacts);
  const {byEmail,noEmail,resolvedDuplicates,unresolvedDuplicates} = resolved;
  if (unresolvedDuplicates.length) {
    const sample=unresolvedDuplicates.slice(0,5).map(x=>`${x.email} (${x.people.length} people / ${x.count} cards)`).join(', ');
    throw new Error(`Guard stopped sync: ${unresolvedDuplicates.length} genuinely ambiguous Bitrix email group(s). ${sample}`);
  }

  const cfg = await ppppSession();
  const local = await getAllLocalContacts(cfg);
  const localGroups = new Map();
  for (const c of local) {
    const e = String(c.email||'').trim().toLowerCase(); if (!e) continue;
    if (!localGroups.has(e)) localGroups.set(e,[]); localGroups.get(e).push(c);
  }

  const fields=['company','person','phone','role','country'];
  const newContacts=[]; const fillCandidates=[]; const conflicts=[];
  let unchanged=0, skippedDuplicate=0;

  for (const [email,b] of byEmail) {
    const group = localGroups.get(email) || [];
    if (!group.length) { newContacts.push(b); continue; }
    if (group.length !== 1) { skippedDuplicate++; continue; }
    const p = group[0]; const patch={}; const conflictFields=[];
    for (const f of fields) {
      const bv = norm(b[f]); if (!bv) continue;
      const pv = norm(p[f]);
      if (!pv) patch[f] = bv;
      else if (!same(pv,bv)) conflictFields.push(f);
    }
    if (conflictFields.length) conflicts.push({email,fields:conflictFields});
    if (Object.keys(patch).length) fillCandidates.push({local:p,patch});
    else unchanged++;
  }

  if (newContacts.length > 100) throw new Error(`Guard stopped sync: ${newContacts.length} new contacts exceeds safety limit 100.`);
  if (fillCandidates.length > 1000) throw new Error(`Guard stopped sync: ${fillCandidates.length} fill candidates exceeds safety limit 1000.`);

  const fieldCounts = Object.fromEntries(fields.map(f=>[f,0]));
  for (const c of fillCandidates) for (const f of Object.keys(c.patch)) fieldCounts[f]++;

  console.log('BITRIX -> PPPP SAFE CONTACT SYNC');
  console.log(`Mode: ${apply?'APPLY':'PREVIEW ONLY'}`);
  console.log(`Bitrix vCards: ${cardHrefs.length} | parsed: ${contacts.length} | recovered serially: ${recovered.recovered} | fetch errors remaining: ${errors.length}`);
  console.log(`Bitrix unique emails after safe resolve: ${byEmail.size} | no email: ${noEmail.length} | company/contact groups safely collapsed: ${resolvedDuplicates.length} | ambiguous groups: ${unresolvedDuplicates.length}`);
  console.log(`PPPP contacts before: ${local.length}`);
  console.log(`New contacts: ${newContacts.length} | fill-only existing: ${fillCandidates.length} | unchanged/no-fill: ${unchanged} | duplicate PPPP email skipped: ${skippedDuplicate}`);
  console.log(`Conflicting non-empty fields skipped: ${conflicts.length}`);
  console.log(`Fields to fill: company=${fieldCounts.company} | person=${fieldCounts.person} | phone=${fieldCounts.phone} | role=${fieldCounts.role} | country=${fieldCounts.country}`);

  const summary={checkedAt:new Date().toISOString(),mode,apply,bitrix:{vCards:cardHrefs.length,uniqueEmails:byEmail.size,recovered:recovered.recovered,noEmail:noEmail.length,resolvedDuplicateGroups:resolvedDuplicates.length,ambiguousGroups:unresolvedDuplicates.length},ppppBefore:local.length,newContacts:newContacts.length,fillCandidates:fillCandidates.length,skippedDuplicate,conflicts:conflicts.length,fieldCounts,inserted:0,updated:0,verifiedNew:0,verifiedFill:0};
  fs.mkdirSync('tmp',{recursive:true});

  if (!apply) {
    console.log('No writes performed. Run with apply after reviewing this preview.');
    fs.writeFileSync('tmp/bitrix-pppp-sync.json',JSON.stringify(summary,null,2));
    process.exit(0);
  }

  const insertRows = newContacts.map(c => ({
    kind:'client',
    company:c.company || '',
    person:c.person || null,
    email:c.email,
    phone:c.phone || null,
    role:c.role || null,
    country:c.country || null
  }));
  const inserted = await insertBatch(cfg, insertRows); summary.inserted = inserted.length;

  const fillRows = fillCandidates.map(({local:p,patch}) => ({
    id:p.id,
    email:p.email,
    company:Object.prototype.hasOwnProperty.call(patch,'company') ? patch.company : (p.company == null ? '' : p.company),
    person:Object.prototype.hasOwnProperty.call(patch,'person') ? patch.person : p.person,
    kind:p.kind,
    phone:Object.prototype.hasOwnProperty.call(patch,'phone') ? patch.phone : p.phone,
    role:Object.prototype.hasOwnProperty.call(patch,'role') ? patch.role : p.role,
    country:Object.prototype.hasOwnProperty.call(patch,'country') ? patch.country : p.country
  }));
  const updated = await upsertBatch(cfg, fillRows); summary.updated = updated.length;

  const after = await getAllLocalContacts(cfg);
  const afterGroups = new Map(); const afterById = new Map(after.map(c=>[String(c.id),c]));
  for (const c of after) { const e=String(c.email||'').trim().toLowerCase(); if (!e) continue; if (!afterGroups.has(e)) afterGroups.set(e,[]); afterGroups.get(e).push(c); }

  let verifiedNew=0;
  for (const c of newContacts) if ((afterGroups.get(c.email)||[]).length === 1) verifiedNew++;
  let verifiedFill=0;
  for (const {local:p,patch} of fillCandidates) {
    const a = afterById.get(String(p.id)); if (!a) continue;
    let ok=true; for (const [f,v] of Object.entries(patch)) if (!same(a[f],v)) {ok=false;break;}
    if (ok) verifiedFill++;
  }
  summary.verifiedNew=verifiedNew; summary.verifiedFill=verifiedFill; summary.ppppAfter=after.length;
  fs.writeFileSync('tmp/bitrix-pppp-sync.json',JSON.stringify(summary,null,2));

  console.log(`Inserted new contacts: ${summary.inserted} | verified: ${verifiedNew}/${newContacts.length}`);
  console.log(`Filled existing contacts: ${summary.updated} | verified: ${verifiedFill}/${fillCandidates.length}`);
  console.log(`PPPP contacts after: ${after.length}`);
  if (summary.inserted !== newContacts.length || verifiedNew !== newContacts.length) throw new Error('Verification failed for new contact inserts.');
  if (summary.updated !== fillCandidates.length || verifiedFill !== fillCandidates.length) throw new Error('Verification failed for fill-only updates.');
  console.log('Verification: OK');
} catch (e) {
  console.error('Safe contact sync failed:', e && e.stack ? e.stack : e);
  process.exit(1);
}
