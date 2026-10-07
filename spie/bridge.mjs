/* Explicit UI approval -> existing append-only ChatGPT command sheet -> trusted worker. */
import { PROJECT_ID, session, googleSession, read, invalidate } from './data.mjs?v=20261007-dossier1';
let pending = null;
const str = x=>String(x??'');
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const PENDING_KEY='pst_spie_pending_command_v1';
function owner(){try{const t=session()?.access_token;if(!t)return '';const c=JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return c.session_id||c.sub||t;}catch{return '';}}
function persist(){try{if(pending){const {session_token,...safe}=pending;sessionStorage.setItem(PENDING_KEY,JSON.stringify(safe));}else sessionStorage.removeItem(PENDING_KEY);}catch{}}
export function pendingCommand(){if(!pending){try{pending=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');}catch{}}if(pending&&pending.session_owner!==owner()){pending=null;persist();}return pending;}
async function sheets(url,options={}){
 const g=googleSession();if(!g)throw new Error('Lidhe Google në PPPP për të ruajtur ndryshimin.');
 const s=session();if(!s)throw new Error('SESSION_REQUIRED');
 const r=await fetch(url,{...options,headers:{Authorization:'Bearer '+g.token,'Content-Type':'application/json'},signal:AbortSignal.timeout(12000)});
 if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error('Google Sheets '+r.status+': '+(d.error?.message||r.statusText));}
 if(session()?.access_token!==s.access_token)throw new Error('SESSION_CHANGED');return r.json();
}
export async function submitOperation({shipment_id,event_type,payload,source_url},explicitApproval){
 if(explicitApproval!==true)throw new Error('Kërkohet miratimi i qartë i ndryshimit.');
 if(pendingCommand())throw new Error('Ndryshimi i mëparshëm është në pritje të verifikimit; mos krijo kopje.');
 if(!/^[\w-]{1,140}$/.test(shipment_id||'')||!['shipment','stage','document'].includes(event_type))throw new Error('Identiteti i dërgesës ose lloji i ndryshimit është i pavlefshëm.');
 return submitRecord({shipment_id,event_type,payload,source_url},false);
}
export async function submitDocumentReceipt({document_id,document_nr,document_type,gmail_draft_id,gmail_message_id,gmail_thread_id,attachments},explicitApproval){
 if(explicitApproval!==true)throw new Error('Kërkohet miratimi i qartë i regjistrimit të draftit.');
 if(pendingCommand())throw new Error('Ka një komandë në pritje. Verifikoje përpara regjistrimit të draftit.');
 if(!document_id||!document_nr||!gmail_draft_id||!['offer','invoice','credit_note'].includes(document_type))throw new Error('Identitetet e dokumentit dhe draftit mungojnë.');
 return submitRecord({shipment_id:'commercial-'+document_id,event_type:'gmail_draft',payload:{document_id,document_nr,document_type,gmail_draft_id,gmail_message_id:gmail_message_id||'',gmail_thread_id:gmail_thread_id||'',attachments:attachments||[],sent:false},source_url:'https://mail.google.com/mail/u/0/#drafts/'+encodeURIComponent(gmail_message_id||gmail_draft_id)},true);
}
async function submitRecord({shipment_id,event_type,payload,source_url},commercial){
 // Read the live protocol only on an explicit write, never on every route.
 const manifest=await read('rpc/pppp_chatgpt_bridge_manifest_v1');
 if(!manifest.allowed_action_types?.includes('context_fact')||manifest.approval_required!=='approved'||!manifest.command_sheet_id||manifest.command_tab!=='Commands')throw new Error('Protokolli live nuk lejon këtë ruajtje.');
 const id='spie-ui-'+crypto.randomUUID(),value={schema_version:1,project_id:PROJECT_ID,shipment_id,event_type,payload,source_url};
 if(JSON.stringify(value).length>11000)throw new Error('Ndryshimi është shumë i madh për bridge-in.');
 const base='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(manifest.command_sheet_id)+'/values/';
 const meta=await sheets(base+encodeURIComponent('Commands!A1:Z1'));const headers=meta.values?.[0]||[];
 const row={command_id:id,created_at:new Date().toISOString(),action_type:'context_fact',approval:'approved',project_id:PROJECT_ID,project_name:'PROJEKT TENNET · SPIE',fact_key:(commercial?'spie.document.email.v1.':'spie.operation.v1.')+shipment_id+'.'+id,category:commercial?'commercial':'logistics',subject:'SPIE · '+event_type+' · '+shipment_id,value_json:JSON.stringify(value),fact_status:'observed',evidence_status:source_url?'documented':'observed',source_ref:source_url||'pppp-ui:'+id,requested_by:session()?.user?.email||'PPPP · miratim në ndërfaqe'};
 for(const key of ['command_id','action_type','approval','project_id','fact_key','value_json'])if(!headers.includes(key))throw new Error('Bridge: mungon kolona '+key);
 // Never retry an ambiguous append automatically. The stable command_id remains reviewable.
 pending={id,shipment_id,status:'submitting',fact_key:row.fact_key,value,session_owner:owner()};persist();
 try{const result=await sheets(base+encodeURIComponent('Commands!A:Z')+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{method:'POST',body:JSON.stringify({majorDimension:'ROWS',values:[headers.map(k=>str(row[k]))]})});if(result.updates?.updatedRows!==1)throw new Error('Bridge: numri i rreshtave të ruajtur nuk u verifikua.');pending.status='pending';persist();return pending;}catch(error){pending.status='uncertain';persist();throw new Error(error.message+' · Komanda '+id+' kërkon verifikim para riprovës.');}
}
export async function verifyPending(){
 if(!pendingCommand())return null;
 invalidate();const result=await read('rpc/pppp_chatgpt_command_status_v1?'+new URLSearchParams({p_command_id:pending.id,p_limit:'1'}));
 const rows=Array.isArray(result)?result:result?.commands||result?.receipts||[result];const receipt=rows.find(r=>r?.command_id===pending.id);
 if(!receipt)return pending;
 if(receipt.status==='succeeded'){
  const facts=await read('pppp_project_context_current_v?'+new URLSearchParams({project_id:'eq.'+PROJECT_ID,fact_key:'eq.'+pending.fact_key,select:'fact_key,value',limit:'1'}));
  if(facts?.length!==1||JSON.stringify(canonical(facts[0].value))!==JSON.stringify(canonical(pending.value))){
   // JSONB key order is not significant; verify the projected fields independently.
   const v=facts?.[0]?.value;if(!v||v.project_id!==PROJECT_ID||v.shipment_id!==pending.shipment_id||v.event_type!==pending.value.event_type||JSON.stringify(canonical(v.payload))!==JSON.stringify(canonical(pending.value.payload)))throw new Error('Bridge u përpunua, por leximi canonical nuk përputhet.');
  }
  const completed={...pending,status:'verified'};pending=null;persist();return completed;
 }
 pending.status=receipt.status;pending.error=receipt.error||receipt.result?.error;persist();return pending;
}

