import { researchOfficialCompany } from './contact-research.mjs';
const SHEET='1ZoU1-aqHaN0CLI_1bcAUDXtGKdm97ixvopkusB96hZ8';
const POLICY='buyer-contact-20261006-v1';
const countries=new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE CH ME RS GB NO IS'.split(' '));
const normalize=v=>String(v||'').toLowerCase().replace(/^www\./,'');
const base64=value=>btoa(String.fromCharCode(...new TextEncoder().encode(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function driveToken(env,fetcher){
  const sa=JSON.parse(env('GOOGLE_SA_JSON')||'{}'),user=env('GMAIL_USER');
  if(!sa.private_key||!user)throw Error('buyer_contact_google_service_account_missing');
  const now=Math.floor(Date.now()/1000),claims={iss:sa.client_email,sub:user,scope:'https://www.googleapis.com/auth/drive',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600};
  const unsigned=base64(JSON.stringify({alg:'RS256',typ:'JWT'}))+'.'+base64(JSON.stringify(claims));
  const keyData=Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----|\s/g,'')),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('pkcs8',keyData,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const signed=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned)));
  const assertion=unsigned+'.'+btoa(String.fromCharCode(...signed)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(5000)});
  const result=await r.json();if(!r.ok)throw Error('buyer_contact_google_token_'+r.status+':'+String(result.error||''));return result.access_token;
}
function column(index){let n=index+1,out='';while(n){n--;out=String.fromCharCode(65+n%26)+out;n=Math.floor(n/26);}return out;}
export async function appendApprovedTargets(rows,env,fetcher=fetch){
  if(!rows.length)return [];
  const token=await driveToken(env,fetcher),root='https://sheets.googleapis.com/v4/spreadsheets/'+SHEET+'/values/',headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const read=async range=>{const r=await fetcher(root+encodeURIComponent(range),{headers,signal:AbortSignal.timeout(5000)});const j=await r.json();if(!r.ok)throw Error('buyer_contact_command_sheet_read_'+r.status+':'+String(j.error?.message||''));return j.values||[];};
  const fields=(await read('Commands!A1:Z1'))[0]||[];
  for(const required of ['command_id','action_type','approval','value_json'])if(!fields.includes(required))throw Error('buyer_contact_command_sheet_header_missing:'+required);
  const idCol=column(fields.indexOf('command_id')),ids=await read('Commands!'+idCol+'2:'+idCol+'10001');
  if(ids.length>=10000)throw Error('buyer_contact_command_sheet_bounded_read_exhausted');
  const existing=new Set(ids.map(x=>x[0])),pending=rows.filter(x=>!existing.has(x.command_id));
  if(!pending.length)return [];
  const values=pending.map(row=>fields.map(field=>row[field]??''));
  const r=await fetcher(root+encodeURIComponent('Commands!A:'+column(fields.length-1))+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{method:'POST',headers,body:JSON.stringify({majorDimension:'ROWS',values}),signal:AbortSignal.timeout(5000)});
  const result=await r.json();if(!r.ok)throw Error('buyer_contact_command_sheet_append_'+r.status+':'+String(result.error?.message||''));
  if(Number(result.updates?.updatedRows)!==pending.length)throw Error('buyer_contact_command_sheet_append_verification_failed');
  return pending.map(x=>x.command_id);
}
export async function runContactWorkflow(db,env,fetcher=fetch,day=new Date().toISOString().slice(0,10)){
  // Existing daily run is the single scheduler/lock; UI never invokes research.
  const recent=await db.from('pppp_steel_buyer_discovery_runs_v1').select('payload').gte('run_date',new Date(Date.now()-30*86400000).toISOString().slice(0,10)).limit(32);
  if(recent.error)throw recent.error;
  const attempts=(recent.data||[]).flatMap(x=>x.payload?.contact_workflow?.attempts||[]),done=new Set(attempts.map(x=>x.domain));
  const recentlyChecked=[...done].filter(d=>/^[a-z0-9.-]+$/i.test(d)).slice(0,200);
  const excludeRecent=(query,field)=>recentlyChecked.length?query.not(field,'in','('+recentlyChecked.join(',')+')'):query;
  const pending=attempts.filter(x=>x.command_id),receiptIds=pending.map(x=>x.command_id);
  const verified=[],blocked=new Set();
  if(receiptIds.length){const q=await db.from('pppp_chatgpt_command_receipts').select('command_id,status,result').in('command_id',receiptIds.slice(0,200));if(q.error)throw q.error;
    for(const a of pending){const receipt=(q.data||[]).find(x=>x.command_id===a.command_id);if(receipt?.status==='succeeded')verified.push({command_id:a.command_id,status:'succeeded',target_id:receipt.result?.target_id});else blocked.add(a.domain);}
  }
  const [targetResult,candidateResult]=await Promise.all([
    excludeRecent(db.from('pppp_dach_steel_targets_v1').select('id,source_key,company_name,company_domain,company_website,country,buyer_type,contact_status,outreach_status,material_scope,evidence,canonical_contact_email,canonical_contact_name').in('contact_status',['missing','searching','found']).in('target_status',['watch','qualified','hot']),'company_domain').order('updated_at',{ascending:true}).limit(32),
    excludeRecent(db.from('pppp_steel_buyer_discovery_candidates_v1').select('id,company_name,official_domain,website,country_code,industry,evidence,routing_conflicts,status,target_id').eq('status','new').is('target_id',null),'official_domain').order('first_seen_at',{ascending:true}).limit(32)
  ]);
  if(targetResult.error)throw targetResult.error;if(candidateResult.error)throw candidateResult.error;
  if(verified.length){const ids=verified.map(x=>x.target_id).filter(Boolean);if(ids.length){const q=await db.from('pppp_dach_steel_targets_v1').select('id,company_domain,contact_status').in('id',ids);if(q.error)throw q.error;for(const v of verified)v.read_back_verified=(q.data||[]).some(x=>x.id===v.target_id);}}
  const seen=new Set(),companies=[...(targetResult.data||[]),...(candidateResult.data||[]).filter(x=>!(x.routing_conflicts||[]).length)].filter(x=>{
    const domain=normalize(x.company_domain||x.official_domain),country=String(x.country||x.country_code||'').toUpperCase();
    if(!domain||!countries.has(country)||done.has(domain)||blocked.has(domain)||seen.has(domain)||x.outreach_status==='suppressed'||(x.canonical_contact_email&&x.canonical_contact_name))return false;seen.add(domain);return true;
  }).slice(0,6);
  const domains=companies.map(x=>normalize(x.company_domain||x.official_domain));
  if(!domains.length)return {version:POLICY,attempts:[],verified,queued:[],no_paid_api:true,external_email_sent:false};
  const history=await db.from('pppp_outbound_queue_v1').select('company_domain,recipient_email,status,gmail_draft_id,sent_at,replied_at,suppression_reason').in('company_domain',domains).limit(80);if(history.error)throw history.error;
  const contacts=await db.from('pppp_contact_master_v1').select('email,person,role,sources').or(domains.map(d=>'email.ilike.%@'+d).join(',')).limit(80);if(contacts.error)throw contacts.error;
  const entries=[],commands=[];
  for(const company of companies){
    const domain=normalize(company.company_domain||company.official_domain),entry={domain,at:new Date().toISOString(),status:'researching'};entries.push(entry);
    if((history.data||[]).some(x=>normalize(x.company_domain)===domain)){entry.status='existing_communication';continue;}
    try {
      const stored=(contacts.data||[]).filter(x=>String(x.email||'').toLowerCase().endsWith('@'+domain));
      // Canonical contacts are checked before web research. Their source must be retained.
      const existingEvidence=Array.isArray(company.evidence)?company.evidence:[];
      const research=await researchOfficialCompany(company,fetcher);
      entry.status=research.verified?'checked':'website_unavailable';
      if(!research.verified||!research.relevant){entry.status='relevance_review';continue;}
      const evidenced=research.contacts;
      for(const c of stored){if(evidenced.some(x=>x.email===String(c.email).toLowerCase()))continue;
        const ev=existingEvidence.find(x=>String(x.email||'').toLowerCase()===String(c.email).toLowerCase()&&x.url);
        if(ev)evidenced.push({email:String(c.email).toLowerCase(),person:c.person||'',role:c.role||'',url:ev.url,claim:ev.claim||'Existing evidenced company contact',score:80});
      }
      const commandId=POLICY+':'+day+':'+domain;entry.command_id=commandId;entry.status=evidenced.length?'contact_found':'contact_not_found';
      const country=String(company.country||company.country_code).toUpperCase(),payload={source_key:company.source_key||'mt:'+country.toLowerCase()+':'+domain,company_name:company.company_name,company_domain:domain,company_website:company.company_website||company.website||research.source_url,country,score_band:'B1',why_now:research.claim,buyer_type:company.buyer_type||company.industry||'Steel-material buyer',contact_status:evidenced.length?'found':'missing',last_verified_at:entry.at,evidence:[...existingEvidence,{url:research.source_url,claim:research.claim},...evidenced.map(x=>({url:x.url,claim:x.claim,email:x.email,...(x.person?{person:x.person}:{}),...(x.role?{role:x.role}:{})}))],material_scope:{...(company.material_scope&&typeof company.material_scope==='object'?company.material_scope:{}),contact_research:{policy:POLICY,checked_at:entry.at,retry_after:new Date(Date.now()+30*86400000).toISOString(),contacts:evidenced.map(x=>({email:x.email,person:x.person,role:x.role,source_url:x.url}))}}};
      commands.push({command_id:commandId,action_type:'dach_steel_target',approval:'approved',source_type:'chatgpt',source:'chatgpt',requested_by:'Arianit Vllahiu — authorized Steel Buyers workflow 2026-10-06',source_ref:'buyer-contact-workflow:'+domain,value_json:JSON.stringify(payload),project_id:'',project_name:'',created_at:entry.at});
    }catch(e){entry.status='failed';entry.error=String(e?.message||e).slice(0,500);}
  }
  const queued=await appendApprovedTargets(commands,env,fetcher);
  return {version:POLICY,attempts:entries,verified,queued,verification_pending:queued.length>0,no_paid_api:true,external_email_sent:false};
}
