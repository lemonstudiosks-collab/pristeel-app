import fs from 'node:fs';

const host=process.env.BITRIX_HOST||'b24-cl53os.bitrix24.com';
const login=process.env.BITRIX_LOGIN||'sales@prissteel.com';
const bitrixPassword=process.env.BITRIX_APP_PASSWORD||'';
const ppppEmail=process.env.PPPP_SYNC_EMAIL||'';
const ppppPassword=process.env.PPPP_SYNC_PASSWORD||'';
const mode=String(process.env.UPDATE_MODE||'preview').trim().toLowerCase();
const apply=mode==='apply';

if(!bitrixPassword||!ppppEmail||!ppppPassword){console.error('Missing required GitHub secrets.');process.exit(2);}
if(!['preview','apply'].includes(mode)){console.error(`Invalid UPDATE_MODE: ${mode}`);process.exit(2);}

const base=`https://${host}`;
const bitrixAuth='Basic '+Buffer.from(`${login}:${bitrixPassword}`).toString('base64');
const crmBook=`${base}/bitrix/groupdav.php/s1/${encodeURIComponent(login)}/addressbook/crmContacts/`;

function xmlDecode(s=''){return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');}
function hrefs(xml=''){return [...xml.matchAll(/<(?:[a-z]+:)?href[^>]*>([\s\S]*?)<\/(?:[a-z]+:)?href>/gi)].map(m=>xmlDecode(m[1].trim()));}
function abs(h){return /^https?:\/\//i.test(h)?h:new URL(h,base).href;}
function unfold(s=''){return s.replace(/\r?\n[ \t]/g,'');}
function qp(s=''){try{return s.replace(/=([0-9A-F]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));}catch{return s;}}
function cleanVal(v=''){return v.replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\').trim();}
function decodeProp(line){
  const p=line.indexOf(':'); if(p<0)return null;
  const left=line.slice(0,p), raw=line.slice(p+1); const [name,...params]=left.split(';');
  const ps=params.join(';').toUpperCase(); let value=raw;
  if(ps.includes('ENCODING=QUOTED-PRINTABLE')) value=qp(value);
  else if(ps.includes('ENCODING=B')||ps.includes('ENCODING=BASE64')){try{value=Buffer.from(value,'base64').toString('utf8');}catch{}}
  return {name:name.toUpperCase(),value:cleanVal(value)};
}
function parseVcard(text){
  const props=unfold(text).split(/\r?\n/).map(decodeProp).filter(Boolean);
  const vals=n=>props.filter(p=>p.name===n).map(p=>p.value).filter(Boolean);
  const first=n=>vals(n)[0]||'';
  let person=first('FN');
  if(!person){const n=first('N').split(';');person=[n[1],n[0]].filter(Boolean).join(' ').trim();}
  const company=first('ORG').split(';').filter(Boolean).join(' · ');
  const email=(first('EMAIL')||'').trim().toLowerCase();
  const phone=first('TEL'); const role=first('TITLE');
  const adr=first('ADR').split(';'); const country=(adr[6]||'').trim();
  return {person,company,email,phone,role,country};
}
async function bfetch(url,opt={}){
  const r=await fetch(url,{...opt,headers:{Authorization:bitrixAuth,'User-Agent':'PRISTEEL-PPPP-Bitrix-FillExisting/1.0',...(opt.headers||{})}});
  const t=await r.text(); if(!r.ok&&r.status!==207)throw new Error(`${opt.method||'GET'} ${url} -> ${r.status}`); return t;
}
async function mapLimit(items,limit,fn){
  let i=0; const out=new Array(items.length);
  async function worker(){while(true){const x=i++;if(x>=items.length)return;try{out[x]=await fn(items[x],x);}catch(e){out[x]={__error:String(e.message||e)};}}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker)); return out;
}
function readSupabaseConfig(){
  const html=fs.readFileSync('pristeel-procurement.html','utf8');
  const um=html.match(/var\s+_SB_URL\s*=\s*['"]([^'"]+)['"]/); const km=html.match(/var\s+_SB_KEY\s*=\s*['"]([^'"]+)['"]/);
  if(!um||!km)throw new Error('Could not read PPPP Supabase config.'); return {url:um[1],key:km[1]};
}
async function ppppSession(){
  const {url,key}=readSupabaseConfig();
  const r=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:ppppEmail,password:ppppPassword})});
  const txt=await r.text(); if(!r.ok)throw new Error(`PPPP auth failed: HTTP ${r.status}`);
  const session=JSON.parse(txt); if(!session.access_token)throw new Error('PPPP auth returned no access token.'); return {url,key,token:session.access_token};
}
async function getLocalContacts(cfg){
  const r=await fetch(`${cfg.url}/rest/v1/contacts?select=id,email,company,person,kind,country,role,phone&limit=5000`,{headers:{apikey:cfg.key,Authorization:`Bearer ${cfg.token}`}});
  const txt=await r.text(); if(!r.ok)throw new Error(`PPPP contacts read failed: HTTP ${r.status}`); return JSON.parse(txt);
}
async function upsertBatch(cfg,rows){
  const r=await fetch(`${cfg.url}/rest/v1/contacts?on_conflict=id`,{
    method:'POST',headers:{apikey:cfg.key,Authorization:`Bearer ${cfg.token}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify(rows)
  });
  const txt=await r.text(); if(!r.ok)throw new Error(`PPPP batch update failed: HTTP ${r.status} ${txt.slice(0,800)}`); return txt?JSON.parse(txt):[];
}
function norm(v){return String(v||'').trim().replace(/\s+/g,' ');}
function same(a,b){return norm(a).toLowerCase()===norm(b).toLowerCase();}

try{
  const propfind=`<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getetag/><d:getcontenttype/></d:prop></d:propfind>`;
  const xml=await bfetch(crmBook,{method:'PROPFIND',headers:{Depth:'1','Content-Type':'application/xml; charset=utf-8'},body:propfind});
  const cardHrefs=[...new Set(hrefs(xml).filter(h=>/\.vcf(?:\?|$)/i.test(h)))];
  const raw=await mapLimit(cardHrefs,10,async h=>parseVcard(await bfetch(abs(h))));
  const bitrix=raw.filter(x=>x&&!x.__error&&x.email);
  const bitrixByEmail=new Map(); const bitrixDup=new Set();
  for(const c of bitrix){if(bitrixByEmail.has(c.email))bitrixDup.add(c.email);else bitrixByEmail.set(c.email,c);}
  if(bitrixDup.size)throw new Error(`Guard stopped update: Bitrix contains ${bitrixDup.size} duplicate email(s).`);

  const cfg=await ppppSession(); const local=await getLocalContacts(cfg);
  const localGroups=new Map();
  for(const c of local){const e=String(c.email||'').trim().toLowerCase();if(!e)continue;if(!localGroups.has(e))localGroups.set(e,[]);localGroups.get(e).push(c);}

  const fields=['company','person','phone','role','country'];
  const candidates=[]; const conflicts=[]; let unchanged=0,skippedDuplicate=0,unmatched=0;
  for(const [email,b] of bitrixByEmail.entries()){
    const group=localGroups.get(email); if(!group){unmatched++;continue;} if(group.length!==1){skippedDuplicate++;continue;}
    const p=group[0]; const patch={}; const conflictFields=[];
    for(const f of fields){const bv=norm(b[f]); if(!bv)continue; const pv=norm(p[f]); if(!pv)patch[f]=bv; else if(!same(pv,bv))conflictFields.push(f);}
    if(conflictFields.length){conflicts.push({email,fields:conflictFields});continue;}
    if(!Object.keys(patch).length){unchanged++;continue;}
    candidates.push({local:p,patch});
  }

  console.log('BITRIX -> PPPP FILL EMPTY EXISTING CONTACT FIELDS');
  console.log(`Mode: ${apply?'APPLY':'PREVIEW ONLY'}`);
  console.log(`Bitrix unique emails: ${bitrixByEmail.size}`);
  console.log(`PPPP contacts: ${local.length}`);
  console.log(`Fill-only candidates: ${candidates.length} | unchanged: ${unchanged} | conflicts: ${conflicts.length} | unmatched: ${unmatched} | duplicate PPPP email skipped: ${skippedDuplicate}`);

  if(conflicts.length)throw new Error(`Guard stopped update: ${conflicts.length} contact(s) have conflicts.`);
  if(candidates.length>250)throw new Error(`Guard stopped update: ${candidates.length} candidates exceeds limit 250.`);

  const fieldCounts=Object.fromEntries(fields.map(f=>[f,0])); for(const c of candidates)for(const f of Object.keys(c.patch))fieldCounts[f]++;
  console.log(`Fields to fill: company=${fieldCounts.company} | person=${fieldCounts.person} | phone=${fieldCounts.phone} | role=${fieldCounts.role} | country=${fieldCounts.country}`);

  const summary={checkedAt:new Date().toISOString(),mode,ppppContacts:local.length,bitrixUniqueEmails:bitrixByEmail.size,candidates:candidates.length,unchanged,conflicts:conflicts.length,unmatched,skippedDuplicate,fieldCounts,updated:0};
  fs.mkdirSync('tmp',{recursive:true});
  if(!apply){console.log('No writes performed. Select apply to fill only currently-empty PPPP fields.');fs.writeFileSync('tmp/bitrix-pppp-fill-existing.json',JSON.stringify(summary,null,2));process.exit(0);}

  const rows=candidates.map(({local:p,patch})=>({
    id:p.id,
    email:p.email,
    company:p.company==null?'':p.company,
    person:Object.prototype.hasOwnProperty.call(patch,'person')?patch.person:p.person,
    kind:p.kind,
    phone:Object.prototype.hasOwnProperty.call(patch,'phone')?patch.phone:p.phone,
    role:Object.prototype.hasOwnProperty.call(patch,'role')?patch.role:p.role,
    country:Object.prototype.hasOwnProperty.call(patch,'country')?patch.country:p.country
  }));

  const updated=rows.length?await upsertBatch(cfg,rows):[]; summary.updated=updated.length;
  const after=await getLocalContacts(cfg); const afterById=new Map(after.map(c=>[String(c.id),c]));
  let verified=0;
  for(const {local,patch} of candidates){const a=afterById.get(String(local.id)); if(!a)continue; let ok=true; for(const [f,v] of Object.entries(patch))if(!same(a[f],v)){ok=false;break;} if(ok)verified++;}
  summary.verified=verified; fs.writeFileSync('tmp/bitrix-pppp-fill-existing.json',JSON.stringify(summary,null,2));
  console.log(`Updated rows: ${summary.updated}`); console.log(`Verified filled rows: ${verified}/${candidates.length}`);
  if(summary.updated!==candidates.length||verified!==candidates.length)throw new Error('Verification failed: not all fill-only updates were confirmed.');
  console.log('Verification: OK');
}catch(e){console.error('Existing contact fill failed:',e&&e.stack?e.stack:e);process.exit(1);}
