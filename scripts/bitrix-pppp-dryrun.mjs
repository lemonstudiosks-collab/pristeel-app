import fs from 'node:fs';

const host=process.env.BITRIX_HOST||'b24-cl53os.bitrix24.com';
const login=process.env.BITRIX_LOGIN||'sales@prissteel.com';
const password=process.env.BITRIX_APP_PASSWORD||'';
const ppppEmail=process.env.PPPP_SYNC_EMAIL||'';
const ppppPassword=process.env.PPPP_SYNC_PASSWORD||'';
if(!password){console.error('Missing BITRIX_APP_PASSWORD');process.exit(2);}
if(!ppppEmail||!ppppPassword){console.error('Missing PPPP_SYNC_EMAIL or PPPP_SYNC_PASSWORD');process.exit(2);}
const base=`https://${host}`;
const auth='Basic '+Buffer.from(`${login}:${password}`).toString('base64');
const crmBook=`${base}/bitrix/groupdav.php/s1/${encodeURIComponent(login)}/addressbook/crmContacts/`;

function xmlDecode(s=''){return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'\"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');}
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
function parseVcard(text,href){
  const props=unfold(text).split(/\r?\n/).map(decodeProp).filter(Boolean);
  const vals=n=>props.filter(p=>p.name===n).map(p=>p.value).filter(Boolean);
  const first=n=>vals(n)[0]||'';
  let person=first('FN');
  if(!person){const n=first('N').split(';');person=[n[1],n[0]].filter(Boolean).join(' ').trim();}
  const org=first('ORG').split(';').filter(Boolean).join(' · ');
  const email=(first('EMAIL')||'').trim().toLowerCase();
  const phone=first('TEL'); const role=first('TITLE'); const adr=first('ADR').split(';');
  const country=(adr[6]||'').trim(); const id=(String(href).match(/\/([^/]+)\.vcf(?:\?|$)/i)||[])[1]||'';
  return {bitrix_id:id,person,company:org,email,phone,role,country};
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function retryableStatus(s){return [408,425,429,500,502,503,504].includes(s);}
async function bfetch(url,opt={}){
  let lastErr;
  for(let attempt=0;attempt<5;attempt++){
    try{
      const r=await fetch(url,{...opt,headers:{Authorization:auth,'User-Agent':'PRISTEEL-PPPP-Bitrix-DryRun/1.4',...(opt.headers||{})}});
      const t=await r.text();
      if(r.ok||r.status===207)return t;
      const e=new Error(`${opt.method||'GET'} ${url} -> ${r.status}`); e.status=r.status;
      if(!retryableStatus(r.status))throw e;
      lastErr=e;
      const ra=parseInt(r.headers.get('retry-after')||'',10);
      await sleep(Number.isFinite(ra)&&ra>0?ra*1000:400*(2**attempt));
    }catch(e){
      lastErr=e;
      if(e&&e.status&&!retryableStatus(e.status))throw e;
      if(attempt===4)throw e;
      await sleep(400*(2**attempt));
    }
  }
  throw lastErr||new Error(`GET ${url} failed`);
}
async function mapLimit(items,limit,fn){let i=0;const out=new Array(items.length);async function w(){while(true){const x=i++;if(x>=items.length)return;try{out[x]=await fn(items[x],x);}catch(e){out[x]={__error:String(e.message||e),__item:items[x]};}}}await Promise.all(Array.from({length:Math.min(limit,items.length)},w));return out;}

function readSupabaseConfig(){
  const html=fs.readFileSync('pristeel-procurement.html','utf8');
  const um=html.match(/var\s+_SB_URL\s*=\s*['\"]([^'\"]+)['\"]/); const km=html.match(/var\s+_SB_KEY\s*=\s*['\"]([^'\"]+)['\"]/);
  if(!um||!km)throw new Error('Could not read PPPP Supabase config from HTML'); return {url:um[1],key:km[1]};
}
async function getPpppContacts(){
  const {url,key}=readSupabaseConfig();
  const authResp=await fetch(`${url}/auth/v1/token?grant_type=password`,{
    method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:ppppEmail,password:ppppPassword})
  });
  const authText=await authResp.text();
  if(!authResp.ok){return {ok:false,stage:'auth',status:authResp.status,error:authText.slice(0,300),rows:[]};}
  let session={}; try{session=JSON.parse(authText);}catch{}
  if(!session.access_token){return {ok:false,stage:'auth',status:authResp.status,error:'No access_token returned',rows:[]};}
  const r=await fetch(`${url}/rest/v1/contacts?select=id,email,company,person,kind,country,role,phone&limit=5000`,{headers:{apikey:key,Authorization:`Bearer ${session.access_token}`}});
  const txt=await r.text(); if(!r.ok)return {ok:false,stage:'contacts',status:r.status,error:txt.slice(0,300),rows:[]};
  return {ok:true,stage:'contacts',status:r.status,rows:JSON.parse(txt)};
}

try{
  const body=`<?xml version=\"1.0\"?><d:propfind xmlns:d=\"DAV:\"><d:prop><d:getetag/><d:getcontenttype/></d:prop></d:propfind>`;
  const xml=await bfetch(crmBook,{method:'PROPFIND',headers:{Depth:'1','Content-Type':'application/xml; charset=utf-8'},body});
  const cardHrefs=[...new Set(hrefs(xml).filter(h=>/\.vcf(?:\?|$)/i.test(h)))];
  const raw=await mapLimit(cardHrefs,4,async h=>parseVcard(await bfetch(abs(h)),h));
  const contacts=raw.filter(x=>x&&!x.__error);
  const fetchErrorRows=raw.filter(x=>x&&x.__error);
  const fetchErrors=fetchErrorRows.length;
  const withEmail=contacts.filter(c=>c.email); const noEmail=contacts.filter(c=>!c.email);
  const byEmail=new Map(); const dupEmails=new Set();
  for(const c of withEmail){if(byEmail.has(c.email))dupEmails.add(c.email);else byEmail.set(c.email,c);}

  const pppp=await getPpppContacts();
  let matched=0,newCount=0,ppppDuplicateEmails=0;
  let newContacts=[]; let duplicateGroups=[];
  let matchedKindCounts={client:0,supplier:0,other:0,ambiguous:0};
  if(pppp.ok){
    const localGroups=new Map();
    for(const c of pppp.rows){const e=String(c.email||'').trim().toLowerCase();if(!e)continue;if(!localGroups.has(e))localGroups.set(e,[]);localGroups.get(e).push(c);}
    duplicateGroups=[...localGroups.entries()].filter(([,rows])=>rows.length>1).map(([email,rows])=>({email,rows:rows.map(r=>({id:r.id,person:r.person||'',company:r.company||'',kind:r.kind||''}))}));
    ppppDuplicateEmails=duplicateGroups.length;
    for(const [e,c] of byEmail.entries()){
      const rows=localGroups.get(e)||[];
      if(rows.length){matched++;if(rows.length>1) matchedKindCounts.ambiguous++;else if(rows[0].kind==='client') matchedKindCounts.client++;else if(rows[0].kind==='supplier') matchedKindCounts.supplier++;else matchedKindCounts.other++;}
      else{newCount++;newContacts.push(c);}
    }
    newContacts.sort((a,b)=>(a.person||a.company||a.email).localeCompare(b.person||b.company||b.email));
  }

  const errorKinds={};
  for(const e of fetchErrorRows){const m=String(e.__error||'').match(/->\s*(\d{3})/);const k=m?`HTTP ${m[1]}`:'network/other';errorKinds[k]=(errorKinds[k]||0)+1;}
  const summary={checkedAt:new Date().toISOString(),bitrix:{vcardResources:cardHrefs.length,parsed:contacts.length,fetchErrors,fetchErrorKinds:errorKinds,withEmail:withEmail.length,noEmail:noEmail.length,duplicateEmails:dupEmails.size,uniqueEmails:byEmail.size},pppp:{readOk:pppp.ok,stage:pppp.stage,httpStatus:pppp.status,currentContacts:pppp.ok?pppp.rows.length:null,duplicateEmails:pppp.ok?ppppDuplicateEmails:null},comparison:pppp.ok?{matchedByEmail:matched,newByEmail:newCount,matchedKindCounts}:null,preflight:pppp.ok?{ppppDuplicateGroups:duplicateGroups,newContacts}:null};
  fs.mkdirSync('tmp',{recursive:true});fs.writeFileSync('tmp/bitrix-pppp-dryrun.json',JSON.stringify(summary,null,2));
  console.log('BITRIX -> PPPP DRY RUN (NO WRITES)');
  console.log(`Bitrix vCards: ${summary.bitrix.vcardResources}`);
  console.log(`Parsed: ${summary.bitrix.parsed} | fetch errors: ${summary.bitrix.fetchErrors} | unique emails: ${summary.bitrix.uniqueEmails} | no email: ${summary.bitrix.noEmail} | Bitrix duplicate emails: ${summary.bitrix.duplicateEmails}`);
  if(fetchErrors){console.log(`Fetch error types: ${Object.entries(errorKinds).map(([k,v])=>`${k}=${v}`).join(' | ')}`);}
  if(pppp.ok){
    console.log(`PPPP contacts: ${summary.pppp.currentContacts} | PPPP duplicate emails: ${summary.pppp.duplicateEmails}`);
    console.log(`Matched by email: ${summary.comparison.matchedByEmail} | New by email: ${summary.comparison.newByEmail}`);
    console.log(`Matched kinds: client=${matchedKindCounts.client} | supplier=${matchedKindCounts.supplier} | other=${matchedKindCounts.other} | ambiguous duplicate email=${matchedKindCounts.ambiguous}`);
    console.log('');
    console.log('PPPP DUPLICATE EMAIL GROUPS:');
    if(!duplicateGroups.length)console.log('  none');
    duplicateGroups.forEach((g,i)=>console.log(`  ${i+1}. ${g.email} | ${g.rows.map(r=>`${r.person||r.company||'(pa emer)'} [${r.kind||'-'}]`).join(' || ')}`));
    console.log('');
    console.log('NEW BITRIX CONTACTS NOT IN PPPP:');
    if(!newContacts.length)console.log('  none');
    newContacts.forEach((c,i)=>console.log(`  ${i+1}. ${c.person||'(pa emer)'} | ${c.company||'-'} | ${c.email} | ${c.phone||'-'} | ${c.role||'-'} | ${c.country||'-'} | Bitrix ${c.bitrix_id}`));
  }else{console.log(`PPPP read blocked at ${pppp.stage}: HTTP ${pppp.status}.`);process.exitCode=3;}
  if(fetchErrors){console.error(`INCOMPLETE BITRIX READ: ${fetchErrors} of ${cardHrefs.length} vCards still failed after retries.`);process.exitCode=4;}
}catch(e){console.error('Dry run failed:',e&&e.stack?e.stack:e);process.exit(1);}
