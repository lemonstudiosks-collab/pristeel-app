/* Evidence projections over canonical PPPP. No writes, guessed commitments or parallel storage. */
import { PROJECT_ID, safeLink, gmailLink, messageText, mailParty } from './data.mjs?v=20261008-compact1';
const arr = x => Array.isArray(x) ? x : [];
const str = x => String(x ?? '');
export const STAGES = [['order','Porosia'],['material','Materiali'],['production','Prodhimi'],['qa','Kontrolli / QA-QC'],['packing','Paketimi'],['documents','Dokumentet'],['ready','Gati p�r marrje'],['loading','Ngarkimi'],['transport','N� transport'],['customs','Dogana / importi'],['delivered','Dor�zuar']];
export const DOCUMENTS = [
 ['invoice','Fatura komerciale','A','PriSteel'],['packing_list','Lista e paketimit','A','PriSteel'],['delivery_note','Flet�dor�zimi','A','PriSteel'],['certificates','Certifikatat EN 10204 3.1','A','Aktiva / PriSteel'],['weight','Lista e peshave','A','Aktiva / PriSteel'],['dimensions','P�rmasat e pakove','A','Aktiva / PriSteel'],['hs','Kodet HS','A','PriSteel'],['origin','Vendi i origjin�s','A','PriSteel'],['eur1','EUR.1','A','Eksportuesi'],['instructions','Udh�zimet e transportit','A','PriSteel'],['photos','Fotografit�','A','Aktiva / PriSteel'],
 ['cmr','CMR','B','Transportuesi / Zollcon'],['mrn','Deklarata e eksportit / MRN','B','Agjenti doganor'],['transit','T1 / dokumenti i transitit','B','Agjenti doganor'],['customs','Dokumentet doganore t� importit','B','Zollcon'],['booking','Konfirmimi i rezervimit','B','Transportuesi'],['pickup','Konfirmimi i marrjes','B','Transportuesi'],['truck','Kamioni / shoferi / regjistrimi','B','Transportuesi'],['c_invoice','Fatura komerciale p�r SPIE','C','PriSteel'],['c_packing_list','Lista e paketimit p�r SPIE','C','PriSteel'],['c_delivery_note','Flet�dor�zimi p�r SPIE','C','PriSteel'],['c_certificates','Certifikatat p�r SPIE','C','PriSteel'],['pod','D�shmia e dor�zimit','C','Transportuesi / SPIE']
];
export const GROUPS = {A:'A. PriSteel  Zollcon', B:'B. Zollcon / transportuesi  PriSteel', C:'C. Dokumentet p�r SPIE'};
export function json(value){try{return typeof value==='string'?JSON.parse(value):value||{};}catch{return {};}}
export function driveId(value){const u=safeLink(value,'drive');return u.match(/\/d\/([\w-]+)/)?.[1] || (u?new URL(u).searchParams.get('id'):'') || '';}
export function identity(f){return f.content_sha256?'sha256:'+f.content_sha256:f.drive_file_id?'drive:'+f.drive_file_id:driveId(f.drive_url)?'drive:'+driveId(f.drive_url):f.gmail_message_id&&f.gmail_attachment_id?'gmail:'+f.gmail_message_id+':'+f.gmail_attachment_id:'record:'+f.id;}
export function category(f){
 const m=json(f.notes), t=str(m.category||f.doc_type).toLowerCase(), n=str(f.title||f.file_name).toLowerCase();
 const explicit={rfq:'RFQ',supplier_offer:'Oferta furnitor�sh',client_offer:'Oferta PriSteel',po:'Porosi / PO',order:'Porosi / PO',contract:'Kontrata',drawing:'Vizatime',boq:'BOQ / LV',certificate:'Certifikata',production:'Prodhim',qa:'QA/QC',transport:'Transport',customs:'Dogan�',invoice:'Fatura'};
 if(explicit[t])return explicit[t];
 if(/presentation|proposal|vorlage|kvalifikacija|nda|consortium/.test(n))return 'T� tjera';
 if(/invoice|rechnung|fatur|facture/.test(n))return 'Fatura';
 if(/packing|cmr|delivery.note|weight.list|pickup|booking|transport|proof.of.delivery/.test(n))return 'Transport';
 if(/eur.?1|mrn|transit|customs|zoll|ausfuhr|einfuhr/.test(n))return 'Dogan�';
 if(/certificate|certifikat|zeugnis|10204/.test(n))return 'Certifikata';
 if(/qa.?qc|inspection|pr�fbericht/.test(n))return 'QA/QC';
 if(/purchase.order|bestellung|bestellnummer|\bpo[-_ ]/.test(n))return 'Porosi / PO';
 if(/rahmenvertrag|contract|vertrag/.test(n))return 'Kontrata';
 if(/offer|angebot|quotation|ponuda/.test(n))return /^pristeel/i.test(n)?'Oferta PriSteel':'Oferta furnitor�sh';
 if(/boq|\blv\b|\.x83|st�ckliste/.test(n))return 'BOQ / LV';
 if(/drawing|zeichnung|muster.*3d|\.dwg|\.dxf/.test(n))return 'Vizatime';
 if(/rfq|anfrage/.test(n))return 'RFQ';
 return 'T� tjera';
}
export const CATEGORIES=['RFQ','Oferta furnitor�sh','Oferta PriSteel','Porosi / PO','Kontrata','Vizatime','BOQ / LV','Certifikata','Prodhim','QA/QC','Transport','Dogan�','Fatura','T� tjera'];
export function fileModel(data,bundle,liveDrive=[]){
 const mails=new Map(arr(bundle.emails?.rows).filter(m=>m.needs_review===false&&!m.association_pending&&(!m.project_id||m.project_id===PROJECT_ID)).map(m=>[m.gmail_message_id,m]));
 const inv=arr(data.context_facts).find(f=>f.fact_key==='spie.workspace.evidence.v1'&&f.fact_status==='observed'&&f.value?.drive_inventory?.folder_id===data.project.drive_folder_id)?.value?.drive_inventory;
 const driveFiles=liveDrive.length?liveDrive:arr(inv?.files);
 const driveNames=new Map(driveFiles.map(f=>[f.id||f.drive_file_id,f.name||f.title]));
 const raw=arr(bundle.files?.rows).map(f=>({...f,notes:json(f.notes),drive_file_id:json(f.notes).drive_file_id||driveId(f.drive_url),source:'PPPP'}));
 for(const d of driveFiles){const id=d.id||d.drive_file_id;if(!/^[\w-]+$/.test(id||''))continue;raw.push({...d,id:'drive:'+id,title:d.name||d.title,drive_file_id:id,drive_url:safeLink(d.webViewLink||d.drive_url,'drive')||'https://drive.google.com/file/d/'+id+'/view',content_sha256:d.sha256Checksum||d.content_sha256,created_at:d.modifiedTime||d.modified_at,notes:{category:d.category,revision:d.revision,revision_verified:d.revision_verified,is_latest:d.is_latest},source:liveDrive.length?'Drive':'Drive � pasqyra e ruajtur'});}
 for(const a of arr(bundle.attachments?.rows)){
  const m=mails.get(a.gmail_message_id);
  if(!m||a.project_id!==PROJECT_ID||/^(?:image\d*\.[a-z]+|logo(?:\.[a-z]+)?|icon\.[a-z]+|PRISTEEL|https?:\/\/.*)$/i.test(a.attachment_name||''))continue;
  raw.push({id:'attachment:'+a.id,title:a.attachment_name,gmail_message_id:a.gmail_message_id,gmail_thread_id:a.gmail_thread_id,gmail_attachment_id:a.attachment_id,attachment_mime_type:a.attachment_mime_type,attachment_size_bytes:a.attachment_size_bytes,drive_file_id:a.drive_file_id,drive_url:a.drive_file_id?'https://drive.google.com/file/d/'+a.drive_file_id+'/view':'',gmail_url:gmailLink(m),content_sha256:a.content_sha256,created_at:m.sent_at,party:mailParty(m),mail:m,source:a.source||'Gmail � PPPP',notes:json(a.extracted_data),analysis_status:a.analysis_status});
 }
 for(const f of arr(data.context_facts))if(f.fact_status==='observed'&&/^spie\.document\.v1\./.test(f.fact_key)&&f.value?.project_id===PROJECT_ID&&f.value?.identity_verified===true)raw.push({...f.value,id:'fact:'+f.id,source:'Dokument nga ChatGPT � bridge',created_at:f.updated_at});
 // Repeated URLs belonging to different named documents are unsafe, never a fallback.
 const linkTitles=new Map();for(const f of raw){const id=f.drive_file_id||driveId(f.drive_url);if(!id)continue;const names=linkTitles.get(id)||new Set();names.add(str(f.title||f.file_name).normalize('NFC').toLowerCase());linkTitles.set(id,names);}
 const result=[];
 for(const f of raw){
  const id=f.drive_file_id||driveId(f.drive_url),actual=driveNames.get(id),name=str(f.title||f.file_name).normalize('NFC').toLowerCase();
  if(id&&((actual&&str(actual).normalize('NFC').toLowerCase()!==name)||(!actual&&linkTitles.get(id)?.size>1))){f.link_conflict='Lidhja Drive nuk p�rputhet me identitetin e dokumentit';f.drive_url='';f.drive_file_id='';}
  f.identity=identity(f);f.category=category(f);f.notes=json(f.notes);
  // SHA or an exact Drive ID connects sources; a filename alone never proves duplicate bytes.
  const old=result.find(x=>(f.content_sha256&&f.content_sha256===x.content_sha256)||(f.drive_file_id&&f.drive_file_id===x.drive_file_id)||f.identity===x.identity);
  if(old){old.sources=[...new Set([...(old.sources||[old.source]),f.source])];for(const k of ['gmail_url','gmail_message_id','gmail_attachment_id','attachment_mime_type','attachment_size_bytes','size','mimeType','drive_url','drive_file_id','content_sha256','mail'])if(!old[k]&&f[k])old[k]=f[k];continue;}
  result.push(f);
 }
 return result.sort((a,b)=>str(b.created_at).localeCompare(str(a.created_at)));
}
// Same-name copies share one presentation row, never a content identity or approval.
export function fileGroups(files){
 const groups=new Map();
 for(const f of arr(files)){
  const title=str(f.title||f.file_name||f.doc_nr),key=[title.normalize('NFC').trim().toLowerCase(),f.category||'',f.party||''].join('|');
  const group=groups.get(key)||{key,title,category:f.category,files:[]};group.files.push(f);groups.set(key,group);
 }
 for(const group of groups.values())group.files.sort((a,b)=>str(b.created_at).localeCompare(str(a.created_at)));
 return [...groups.values()].sort((a,b)=>str(b.files[0]?.created_at).localeCompare(str(a.files[0]?.created_at)));
}
export function communicationWindow(emails,now=Date.now()){
 const sorted=arr(emails).filter(m=>(m.needs_review===false&&!m.association_pending||m.context_thread_verified===true)&&Number.isFinite(Date.parse(m.sent_at))&&Date.parse(m.sent_at)<=now).sort((a,b)=>str(b.sent_at).localeCompare(str(a.sent_at)));
 const recent=[],history=[],seen=new Set();
 for(const m of sorted){const thread=m.gmail_thread_id||m.gmail_message_id;if(Date.parse(m.sent_at)>=now-48*60*60*1000&&!seen.has(thread)&&recent.length<3){recent.push(m);seen.add(thread);}else history.push(m);}
 return {recent,history};
}
export function offerGroups(offers){
 const groups=new Map();
 for(const o of offers){
  const party=o.side==='client'?'PriSteel  SPIE':o.supplier||(/aktiva/i.test(o.title||'')||o.mail?.from_email?.endsWith('@aktiva.com.mk')?'Aktiva':'Furnitori');
  const family=o.offer_family||o.offer_ref||str(o.title).normalize('NFC').replace(/\.(xlsx?|pdf|docx?)$/i,'').replace(/\b(DAP|DDP|rev(?:ision)?\s*\d+|final|reviewed)\b|\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}/gi,'').replace(/angebot(?:sbedingungen)?|offer|quotation|conditions|terms|klarstellungen/gi,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().toLowerCase();
  const key=o.side+':'+party+':'+(o.offer_family||o.offer_ref||'project');
  const g=groups.get(key)||{key,party,side:o.side,versions:[],current:null};g.versions.push(o);groups.set(key,g);
 }
 for(const g of groups.values()){g.versions.sort((a,b)=>str(b.sent_at).localeCompare(str(a.sent_at)));g.current=g.versions.find(o=>o.is_current===true&&o.current_verified===true)||null;g.latestSent=g.versions.find(o=>o.sent&&o.kind==='offer')||null;}
 return [...groups.values()];
}
function trustedEvents(facts){return arr(facts).filter(f=>f.fact_status==='observed'&&['observed','documented','confirmed'].includes(f.evidence_status)&&/^spie\.operation\.v1\./.test(f.fact_key)&&f.value?.project_id===PROJECT_ID).sort((a,b)=>str(a.updated_at).localeCompare(str(b.updated_at)));}
export function shipments(data,model,operationFacts=[]){
 const units=new Map(), all=trustedEvents([...arr(data.context_facts),...operationFacts]);
 for(const f of all){const v=f.value;if(v.event_type!=='shipment'||!v.shipment_id)continue;const p=v.payload||{};units.set(v.shipment_id,{id:v.shipment_id,title:p.title||v.shipment_id,reference:p.reference||'',incoterm:p.incoterm||'',thread_id:p.thread_id||'',source_url:v.source_url,source_date:f.updated_at,stages:{},documents:[],events:[],...p});}
 if(model.currentRequest){const m=model.currentRequest,id='sample-'+m.gmail_thread_id;if(!units.has(id))units.set(id,{id,title:'Dy mostra � Eins�ulentrennschalter',reference:'Mostrat',thread_id:m.gmail_thread_id,source_url:gmailLink(m),source_date:m.sent_at,incoterm:'',stages:{},documents:[],events:[],sample:true});}
 for(const f of all){const v=f.value,s=units.get(v.shipment_id);if(!s)continue;s.events.push(f);const p=v.payload||{};if(v.event_type==='stage'&&STAGES.some(([id])=>id===p.stage_id))s.stages[p.stage_id]={...p,source_url:v.source_url,evidence_status:f.evidence_status,source_date:f.updated_at};if(v.event_type==='document'&&p.document_id){const old=s.documents.findIndex(d=>d.document_id===p.document_id);const d={...p,source_url:v.source_url,source_date:f.updated_at};if(old<0)s.documents.push(d);else s.documents[old]=d;}}
 for(const s of units.values()){
  const mails=arr(model.trusted).filter(m=>m.gmail_thread_id===s.thread_id&&!m.external_source).sort((a,b)=>str(b.sent_at).localeCompare(str(a.sent_at)));
  const update=mails.find(m=>mailParty(m)==='pristeel'&&/fertigungszeichnungen[\s\S]{0,180}erstellt|technical[\s\S]{0,70}drawings[\s\S]{0,60}completed/i.test(messageText(m)));
  const material=update&&/aktuell komplettieren[\s\S]{0,60}material|material[\s\S]{0,50}in preparation/i.test(messageText(update));
  s.conflicts=[];
  if(material&&s.stages.material?.status==='done'&&str(update.sent_at)>str(s.stages.material.source_date))s.conflicts.push({note:'PPPP e sh�non materialin t� kompletuar; komunikimi m� i ri deklaron se ende po kompletohet. K�rkon harmonizim njer�zor.',source_url:gmailLink(update),source_date:update.sent_at});
  if(material&&!s.stages.material)s.stages.material={status:'in_progress',owner:'Aktiva / PriSteel',note:'Pllakat jan� n� dispozicion; profilet po kontrollohen. Prodhimi pas kompletimit t� materialit.',source_url:gmailLink(update),source_date:update.sent_at,evidence_status:'documented'};
  s.technical=update?{note:'Vizatimet e prodhimit dhe p�rgatitja teknike jan� p�rfunduar.',source_url:gmailLink(update),source_date:update.sent_at}:null;
  const signals={production:/\b(?:fertigung (?:ist|wurde) abgeschlossen|production (?:is|has been) completed)\b/i,qa:/\b(?:quality inspection (?:is|has been) completed|qualit�tspr�fung (?:ist|wurde) abgeschlossen)\b/i,packing:/\b(?:packing (?:is|has been) completed|verpackung (?:ist|wurde) abgeschlossen)\b/i,ready:/\b(?:ware ist abholbereit|bauteile sind versandbereit|goods are ready for pickup)\b/i,loading:/\b(?:loading (?:is|has been) completed|verladung (?:ist|wurde) abgeschlossen)\b/i,transport:/\b(?:shipment is in transit|sendung ist unterwegs)\b/i,customs:/\b(?:customs clearance (?:is|has been) completed|zollfreigabe (?:ist|wurde) erteilt)\b/i,delivered:/\b(?:goods were delivered|ware wurde zugestellt|lieferung wurde zugestellt)\b/i};
  for(const [stage,pattern] of Object.entries(signals)){
   if(s.stages[stage])continue;
   const proof=mails.find(m=>!m.association_pending&&messageText(m).split(/[.!?\n]/).some(line=>pattern.test(line)&&!/(?:\bnot\b|noch nicht|nicht|sobald|once |if |will |werden|planned|geplant|voraussichtlich)/i.test(line)));
   if(proof)s.stages[stage]={status:stage==='transport'?'in_progress':'done',owner:proof.from_email,source_url:gmailLink(proof),source_date:proof.sent_at,note:'Status i deklaruar n� komunikimin origjinal; data reale nuk �sht� nxjerr� nga data e emailit.',actual_date:''};
  }
  s.phase=STAGES.find(([id])=>s.stages[id]?.status==='in_progress')?.[1]||[...STAGES].reverse().find(([id])=>s.stages[id]?.status==='done')?.[1]||'Fazat k�rkojn� konfirmim';
  s.stages=Object.fromEntries(STAGES.map(([id,title])=>{const r=s.stages[id]||{};return [id,{id,title,status:'unknown',owner:'',planned_date:'',actual_date:'',missing:'Pa prov� t� p�rfundimit',...r,risk:r.planned_date&&r.status!=='done'&&r.status!=='not_applicable'&&new Date(r.planned_date+'T23:59:59')<new Date()?'Afati i planifikuar ka kaluar':r.risk||''}];}));
 }
 return [...units.values()];
}
export function dossier(s,files){
 const rows=DOCUMENTS.map(([id,name,group,owner])=>({document_id:id,name,group,owner,status:'missing',required:null,note:'P�r t� konfirmuar sipas d�rges�s / incoterm-it',...s.documents.find(d=>d.document_id===id)}));
 for(const saved of s.documents)if(!rows.some(r=>r.document_id===saved.document_id))rows.push(saved);
 for(const r of rows){
  const exact=files.filter(f=>!f.link_conflict&&(f.notes.shipment_id===s.id||f.notes.shipment_reference===s.reference&&s.reference)&&(f.notes.shipping_document_type===r.document_id.replace(/^c_/, '')||r.file_identity===f.identity));
  const found=exact.length===1?exact[0]:r.file_identity?files.find(f=>f.identity===r.file_identity&&!f.link_conflict):null;
  r.file=found||null;r.conflict=exact.length>1?'Disa dokumente p�r k�t� rresht; k�rkon kontroll':'';
  if(found&&['missing','preparing'].includes(r.status)&&!found.notes.approval_required){r.status='ready';r.date=found.created_at;r.auto=true;}
  r.checked=['ready','sent','received'].includes(r.status)&&!!(r.file||r.source_url);
  if(['ready','sent','received'].includes(r.status)&&!r.checked){r.status='review';r.conflict='Mungon dokumenti ose burimi i statusit';}
 }
 return rows;
}
export function financeModel(d,files,units){
 const outgoing=arr(d.sales?.rows), incoming=arr(d.suppliers?.rows), companies=new Map();
 for(const i of incoming){const normalized=str(i.supplier).trim().toLowerCase();const key=/^aktiva(?:\s|$|[,.-])/.test(normalized)?'Aktiva':/^zollcon(?:\s|$|[,.-])/.test(normalized)?'Zollcon':str(i.supplier).trim()||'Furnitori i paidentifikuar';const rows=companies.get(key)||[];rows.push(i);companies.set(key,rows);}
 const enrich=i=>{const n=json(i.notes), matches=files.filter(f=>(n.file_identity&&f.identity===n.file_identity)||(f.notes.invoice_id===i.id)||(i.supplier_invoice_nr&&f.notes.invoice_nr===i.supplier_invoice_nr&&str(f.notes.supplier).toLowerCase()===str(i.supplier).toLowerCase()));const link=n.shipment_id&&units.find(s=>s.id===n.shipment_id);return {...i,file:matches.length===1?matches[0]:null,shipment:link||null,paymentStatus:i.paid===true?'Paguar � regjistri PPPP':i.paid===false?'Papaguar':'Pagesa e paverifikuar'};};
 return {outgoing:outgoing.map(enrich),incoming:new Map([...companies].map(([k,v])=>[k,v.map(enrich)])),guarantees:arr(d.guarantees?.rows)};
}
