/* PPPP canonical Project Engine v1
 * Pure dossier assembly plus a read-only browser loader. The UI consumes this
 * model; this module never writes business data or infers facts without evidence.
 */
(function(root,factory){
  var api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PSTProjectEngineV1=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this),function(root){
'use strict';

var LIFECYCLES=['PRE_AWARD','WAITING','AWARDED','EXECUTION','DELIVERY','CLOSED'];
var EVENT_TYPES=['email_received','email_sent','attachment_received','supplier_offer_received','client_offer_sent','contract_signed','invoice_received','invoice_issued','payment_received','payment_sent','guarantee_issued','approval_received','production_update','delivery_update'];
var PRE_AWARD_SOURCES=['project_decision_auto','supplier_update_auto','commercial_intake_review','project_discovery_auto','rfq','offer_followup'];

function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v).trim();}
function N(v){if(v==null||v==='')return null;var n=Number(String(v).replace(/\s/g,'').replace(',','.'));return isFinite(n)?n:null;}
function norm(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function first(){for(var i=0;i<arguments.length;i++)if(arguments[i]!==undefined&&arguments[i]!==null&&S(arguments[i])!=='')return arguments[i];return null;}
function ts(x){var v=first(x&&x.occurred_at,x&&x.sent_at,x&&x.paid_date,x&&x.signed_at,x&&x.updated_at,x&&x.created_at,x&&x.date);var n=v?new Date(v).getTime():0;return isFinite(n)?n:0;}
function newest(xs){return A(xs).slice().sort(function(a,b){return ts(b)-ts(a);})[0]||null;}
function source(table,row,field){return{table:table,id:row&&first(row.id,row.gmail_message_id,row.drive_file_id,row.document_nr,row.invoice_nr),field:field||null};}
function money(row){return N(row&&first(row.total_eur,row.gross_amount,row.total_amount,row.total,row.amount,row.value,row.contract_value,row.subtotal));}
function currency(row){return S(row&&first(row.currency,row.currency_code,'EUR'))||'EUR';}
function status(row){return norm(row&&first(row.status,row.state,row.payment_status,row.document_status));}
function isPaid(row){var x=status(row);return row&&((row.paid===true)||!!row.paid_date||/\b(paid|paguar|settled)\b/.test(x));}
function isOpenTask(t){var x=status(t);return !t.done_at&&!/closed|done|completed|mbyllur|cancel|archiv/.test(x);}
function isApproved(x){return /approved|confirmed|signed|accepted|active|miratuar|nenshkruar|nënshkruar/.test(status(x)+' '+text(x));}
function text(x){return norm(Object.keys(x||{}).filter(function(k){return typeof x[k]==='string';}).map(function(k){return x[k];}).join(' '));}
function unique(xs,key){var seen={};return A(xs).filter(function(x){var k=S(key(x));if(!k||seen[k])return false;seen[k]=1;return true;});}

function lifecycle(project,evidence){
  var s=norm([project.status,project.operational_state,project.pipeline_stage,project.pipeline,project.stage].join(' '));
  if(/closed|mbyllur|realizuar|archiv|cancel|humbur|lost/.test(s))return'CLOSED';
  if(/delivery|delivered|shipment|transport|acceptance|dorezim|dorëzim/.test(s))return'DELIVERY';
  if(/execution|production|factory|quality|logistic|ekzek|prodhim/.test(s))return'EXECUTION';
  if(/awarded|won|fituar|signed|confirmed/.test(s)||A(evidence.contracts).some(isApproved))return'AWARDED';
  if(/waiting|pending client|client decision|ne pritje|në pritje|external response/.test(s))return'WAITING';
  return'PRE_AWARD';
}

function selectedProducer(raw,contracts){
  var decisions=A(raw.supplierDecisions).filter(function(d){return norm(d.decision_type)==='selected producer'&&!/inactive|superseded|rejected/.test(status(d));});
  var d=newest(decisions);
  if(d)return{name:first(d.supplier_name,d.producer_name,d.value,d.evidence&&first(d.evidence.supplier_name,d.evidence.selected_producer)),source_refs:[source('project_supplier_decisions',d,'supplier_name')],confidence:'high'};
  var c=newest(A(contracts).filter(function(x){return isApproved(x)&&/supplier|producer|subcontract|production|furnitor|prodhues/.test(text(x));}));
  if(c)return{name:first(c.supplier_name,c.counterparty,c.company,c.partner_name),source_refs:[source('contracts',c,'counterparty')],confidence:'medium'};
  return{name:null,source_refs:[],confidence:'none'};
}

function contractEvidence(raw){
  return unique(A(raw.contracts).concat(A(raw.docs),A(raw.projectDocs),A(raw.attachmentLinks)).filter(function(x){return /contract|subcontract|kontrate|kontratë|marrevesh|marrëvesh/.test(text(x));}),function(x){return first(x.id,x.drive_file_id,x.file_name,x.filename,x.document_nr);});
}

function commercialBaseline(raw,contracts){
  var salesContract=newest(A(contracts).filter(function(x){return isApproved(x)&&/client|sales|sale|customer|shitje|stacon/.test(text(x));}));
  var offer=newest(A(raw.ourOffers).filter(function(x){return money(x)!==null;}));
  var row=salesContract||offer;
  return{amount:money(row),currency:currency(row),kind:salesContract?'signed_client_contract':offer?'client_offer':null,status:salesContract?'confirmed':offer?status(offer)||'recorded':'missing',source_refs:row?[source(salesContract?'contracts':'documents_registry',row,'amount')]:[]};
}

function supplierContractValue(contracts,producer,offers,decisions){
  var cs=A(contracts).filter(function(x){var t=text(x);return isApproved(x)&&/supplier|producer|subcontract|production|furnitor|prodhues/.test(t)&&(!producer.name||t.indexOf(norm(producer.name))>=0);});
  var c=newest(cs);
  if(c&&money(c)!==null)return{amount:money(c),currency:currency(c),kind:'signed_supplier_contract',source_refs:[source('contracts',c,'amount')],confidence:'high'};
  var d=newest(A(decisions).filter(function(x){return norm(x.decision_type)==='selected producer'&&!/inactive|superseded|rejected/.test(status(x));}));
  var ev=d&&d.evidence||{},dv=N(first(ev.contractual_value_eur,ev.supplier_contract_value,ev.contract_value,ev.total_eur));
  if(dv!==null)return{amount:dv,currency:first(ev.currency,'EUR'),kind:'approved_supplier_decision',source_refs:[source('project_supplier_decisions',d,'evidence.contractual_value_eur')],confidence:'high'};
  var o=newest(A(offers).filter(function(x){return producer.name&&text(x).indexOf(norm(producer.name))>=0&&money(x)!==null;}));
  return{amount:money(o),currency:currency(o),kind:o?'selected_supplier_offer':null,source_refs:o?[source('offers',o,'amount')]:[],confidence:o?'medium':'none'};
}

function normalizedInvoices(rows,table,direction){return A(rows).map(function(x){return{id:x.id||null,number:first(x.invoice_nr,x.document_nr,x.number),direction:direction,amount:money(x),currency:currency(x),issued_at:first(x.date,x.issue_date,x.created_at),due_at:first(x.due_date,x.payment_due_at),paid:isPaid(x),paid_at:first(x.paid_date,x.payment_date),counterparty:first(x.client,x.supplier,x.company,x.counterparty),source_refs:[source(table,x)]};});}

function blockers(raw,lc){
  var out=[];
  A(raw.tasks).filter(isOpenTask).forEach(function(t){
    if(lc!=='PRE_AWARD'&&PRE_AWARD_SOURCES.indexOf(norm(t.source).replace(/ /g,'_'))>=0)return;
    out.push({title:first(t.title,t.name,'Open task'),reason:first(t.detail,t.description,'Outstanding project task'),severity:first(t.priority,'normal'),due_at:first(t.due_at,t.due_date),source_refs:[source('tasks',t)]});
  });
  A(raw.projectRequirements).filter(function(x){return !isApproved(x);}).forEach(function(x){out.push({title:first(x.title,x.requirement,'Requirement needs confirmation'),reason:'Project requirement is not confirmed.',severity:'normal',due_at:first(x.due_at,x.deadline),source_refs:[source('project_requirements',x)]});});
  A(raw.bom).filter(function(x){return x.needs_review===true;}).forEach(function(x){out.push({title:'BOM evidence needs review',reason:first(x.description,x.item,'A BOM line is marked for review.'),severity:lc==='PRE_AWARD'?'normal':'low',due_at:null,source_refs:[source('bom_items',x)]});});
  A(raw.attachmentLinks).filter(function(x){return /pending|review|failed|missing/.test(norm([x.analysis_status,x.bom_status].join(' ')));}).forEach(function(x){out.push({title:'Document analysis needs review',reason:first(x.file_name,x.filename,'A linked attachment is not fully classified.'),severity:'normal',due_at:null,source_refs:[source('project_attachment_links',x)]});});
  A(raw.candidates).filter(function(x){return /review|pending/.test(status(x));}).forEach(function(x){out.push({title:'Commercial evidence needs confirmation',reason:first(x.reason,x.file_name,x.supplier_name,'A commercial candidate awaits human approval.'),severity:'normal',due_at:null,source_refs:[source(x.__table||'commercial_candidate',x)]});});
  return unique(out,function(x){return x.title+'|'+JSON.stringify(x.source_refs);});
}

function changes(raw){
  var out=[];
  function add(table,rows,kind,title){A(rows).forEach(function(x){out.push({kind:kind,title:first(x.subject,x.title,x.file_name,x.filename,x.invoice_nr,x.document_nr,title),occurred_at:first(x.sent_at,x.paid_date,x.signed_at,x.updated_at,x.created_at,x.date),source_refs:[source(table,x)]});});}
  add('project_emails',raw.emails,'communication','Project email');
  add('documents_registry',raw.docs,'document','Project document');
  add('project_docs',raw.projectDocs,'document','Project document');
  add('invoices_out',raw.invoicesOut,'finance','Outgoing invoice');
  add('invoices_in',raw.invoicesIn,'finance','Incoming invoice');
  add('project_supplier_decisions',raw.supplierDecisions,'decision','Supplier decision');
  add('tasks',A(raw.tasks).filter(function(x){return x.done_at;}),'task','Task completed');
  return out.filter(function(x){return !!x.occurred_at;}).sort(function(a,b){return new Date(b.occurred_at)-new Date(a.occurred_at);}).slice(0,20);
}

function nextAction(raw,lc,bs,inOut,inIn){
  var open=A(raw.tasks).filter(isOpenTask).filter(function(t){return lc==='PRE_AWARD'||PRE_AWARD_SOURCES.indexOf(norm(t.source).replace(/ /g,'_'))<0;}).sort(function(a,b){var pa=/urgent|high|kritik/.test(norm(a.priority))?0:1,pb=/urgent|high|kritik/.test(norm(b.priority))?0:1;return pa-pb||(new Date(first(a.due_at,a.due_date,'2999-01-01'))-new Date(first(b.due_at,b.due_date,'2999-01-01')));});
  if(open[0])return{title:first(open[0].title,'Review outstanding task'),reason:first(open[0].detail,open[0].description,'This is the highest-priority open project task.'),due_at:first(open[0].due_at,open[0].due_date),owner:first(open[0].owner_name,open[0].owner,open[0].assigned_to),source_refs:[source('tasks',open[0])],confidence:'high'};
  if(bs[0])return{title:bs[0].title,reason:bs[0].reason,due_at:bs[0].due_at,owner:null,source_refs:bs[0].source_refs,confidence:'high'};
  var unpaid=A(inOut).concat(A(inIn)).filter(function(x){return !x.paid&&x.due_at;}).sort(function(a,b){return new Date(a.due_at)-new Date(b.due_at);})[0];
  if(unpaid)return{title:unpaid.direction==='receivable'?'Confirm client payment':'Confirm supplier payment',reason:'A recorded invoice has an outstanding payment milestone.',due_at:unpaid.due_at,owner:null,source_refs:unpaid.source_refs,confidence:'high'};
  var mail=newest(raw.emails);
  if(mail&&/\?|please|confirm|approve|request|kerkoj|kërkoj|konfirm|miratim/.test(S(first(mail.subject,'')+' '+first(mail.snippet,mail.body_text,mail.body,'' )).toLowerCase()))return{title:'Review latest project communication',reason:'The latest linked communication contains a question or explicit request.',due_at:null,owner:null,source_refs:[source('project_emails',mail)],confidence:'medium'};
  return{title:'Needs confirmation',reason:'No sufficiently reliable outstanding action is present in the linked project evidence.',due_at:null,owner:null,source_refs:[],confidence:'low'};
}

function buildDossier(raw){
  raw=raw||{};var project=raw.project||{};
  if(!S(project.id))throw new Error('Project dossier requires an exact project UUID.');
  var contracts=contractEvidence(raw),lc=lifecycle(project,{contracts:contracts});
  var producer=selectedProducer(raw,contracts),baseline=commercialBaseline(raw,contracts),supplierValue=supplierContractValue(contracts,producer,raw.supplierOffers,raw.supplierDecisions);
  var outInv=normalizedInvoices(raw.invoicesOut,'invoices_out','receivable'),inInv=normalizedInvoices(raw.invoicesIn,'invoices_in','payable');
  var paidCosts=inInv.filter(function(x){return x.paid&&x.amount!==null;}).reduce(function(n,x){return n+x.amount;},0);
  var committed=supplierValue.amount;
  var expectedCost=committed!==null?committed:(inInv.length?inInv.reduce(function(n,x){return n+(x.amount||0);},0):null);
  var margin=baseline.amount!==null&&expectedCost!==null?baseline.amount-expectedCost:null;
  var bs=blockers(raw,lc);
  var historical=lc!=='PRE_AWARD'&&lc!=='WAITING';
  var dossier={
    schema_version:1,
    project:{id:S(project.id),ref:first(project.business_ref,project.ref),name:first(project.name,project.project_name),client:first(project.client,project.client_name,project.company,project.customer),status:first(project.status),operational_state:first(project.operational_state),pipeline_stage:first(project.pipeline_stage,project.pipeline),source_refs:[source('projects',project)]},
    lifecycle:{code:lc,pre_award_editable:lc==='PRE_AWARD'||lc==='WAITING',historical_pre_award:historical,source_refs:[source('projects',project,'status')]},
    current_state:{title:first(project.operational_state,project.pipeline_stage,project.status,lc),reason:'Derived from explicit project lifecycle fields and confirmed evidence.',source_refs:[source('projects',project,'operational_state')]},
    next_action:null,
    client:{name:first(project.client,project.client_name,project.company),source_refs:[source('projects',project,'client')]},
    supplier:producer,
    selected_producer:producer,
    commercial_baseline:baseline,
    contracts:contracts,
    supplier_offers:A(raw.supplierOffers),
    bom_baseline:{items:A(raw.bom),historical:historical,editable:!historical,source_refs:A(raw.bom).map(function(x){return source('bom_items',x);})},
    invoices_in:inInv,invoices_out:outInv,
    payments:outInv.concat(inInv).filter(function(x){return x.paid;}).map(function(x){return{direction:x.direction,amount:x.amount,currency:x.currency,paid_at:x.paid_at,source_refs:x.source_refs};}),
    guarantees:A(raw.guarantees),
    actual_costs:{amount:paidCosts||null,currency:'EUR',complete:lc==='CLOSED'&&inInv.every(function(x){return x.paid;}),source_refs:inInv.filter(function(x){return x.paid;}).reduce(function(a,x){return a.concat(x.source_refs);},[])},
    expected_margin:{amount:margin,currency:baseline.currency||'EUR',basis:margin===null?'insufficient_evidence':committed!==null?'client_baseline_minus_supplier_contract':'client_baseline_minus_recorded_costs',source_refs:baseline.source_refs.concat(supplierValue.source_refs)},
    supplier_contractual_value:supplierValue,
    documents:unique(A(raw.files).concat(A(raw.docs),A(raw.projectDocs),A(raw.attachmentLinks)),function(x){return first(x.id,x.drive_file_id,x.file_name,x.filename);}),
    communications:A(raw.emails),execution:{state:first(project.operational_state,project.pipeline_stage),requirements:A(raw.projectRequirements),historical_pre_award:historical},
    milestones:A(raw.milestones),tasks:A(raw.tasks),blockers:bs,recent_changes:changes(raw),
    evidence:{contacts:A(raw.contacts),bom:A(raw.bom),rfqs:A(raw.rfqs),offers:A(raw.offers),ourOffers:A(raw.ourOffers),supplierOffers:A(raw.supplierOffers),docs:A(raw.docs),projectDocs:A(raw.projectDocs),attachmentLinks:A(raw.attachmentLinks),inboxDocs:A(raw.inboxDocs),files:A(raw.files),emails:A(raw.emails),emailLinks:A(raw.emailLinks),linkedOnly:A(raw.linkedOnly),emailConflicts:A(raw.emailConflicts),mailAttachments:A(raw.mailAttachments),invoicesOut:A(raw.invoicesOut),invoicesIn:A(raw.invoicesIn),adjustments:A(raw.adjustments),guarantees:A(raw.guarantees),drive:raw.drive||{rows:[]},integration:raw.integration||{}},
    data_quality:{complete:true,issues:[],ambiguous:[]},
    event_contract:{accepted_types:EVENT_TYPES.slice(),new_project_policy:'candidate_requires_human_confirmation'}
  };
  if(!dossier.client.name)dossier.data_quality.issues.push('Client is not linked on the project record.');
  if(historical&&!producer.name)dossier.data_quality.issues.push('Selected producer is not confirmed by an active decision or signed supplier contract.');
  if(baseline.amount===null)dossier.data_quality.issues.push('Commercial baseline amount is not confirmed.');
  if(historical&&supplierValue.amount===null)dossier.data_quality.issues.push('Supplier contractual value is not confirmed.');
  if(A(raw.legacyMatches).length)dossier.data_quality.ambiguous.push('Some evidence was linked by legacy name/reference matching rather than exact project_id.');
  if(A(raw.emailConflicts).length)dossier.data_quality.issues.push(A(raw.emailConflicts).length+' email relation(s) conflict with another project_id and were excluded.');
  dossier.data_quality.complete=dossier.data_quality.issues.length===0;
  dossier.next_action=nextAction(raw,lc,bs,outInv,inInv);
  return dossier;
}

function safe(path){var fn=root.supaFetch;return typeof fn==='function'?Promise.resolve(fn(path)).then(function(x){return A(x);}).catch(function(){return[];}):Promise.resolve([]);}
function q(table,id,order){return safe(table+'?project_id=eq.'+encodeURIComponent(id)+'&select=*&'+(order||'order=created_at.desc')+'&limit=3000');}
async function loadProjectDossier(projectId){
  var id=S(projectId),base=root.PSTProjectDataIntegrity;
  if(!/^[a-f0-9]{8}-[a-f0-9-]{27,}$/i.test(id))throw new Error('Project dossier requires an exact project UUID.');
  if(!base||typeof base.load!=='function')throw new Error('Canonical project data loader is unavailable.');
  var parts=await Promise.all([base.load(id),q('tasks',id),q('project_supplier_decisions',id),q('supplier_offer_candidates',id),q('invoice_candidates',id),q('project_requirements',id),q('project_analyses',id),q('contracts',id)]);
  var raw=parts[0];
  if(!raw||!raw.project||S(raw.project.id)!==id)throw new Error('Loaded project does not match the requested UUID.');
  raw.tasks=parts[1];raw.supplierDecisions=parts[2];raw.candidates=parts[3].map(function(x){x.__table='supplier_offer_candidates';return x;}).concat(parts[4].map(function(x){x.__table='invoice_candidates';return x;}));raw.projectRequirements=parts[5];raw.projectAnalyses=parts[6];raw.contracts=parts[7];
  return buildDossier(raw);
}

function normalizeEvent(event){
  event=event||{};var type=S(event.type);
  if(EVENT_TYPES.indexOf(type)<0)throw new Error('Unsupported project event type: '+type);
  return{type:type,project_id:S(event.project_id)||null,occurred_at:first(event.occurred_at,event.created_at,new Date().toISOString()),actor:first(event.actor,event.from,event.sender),payload:event.payload||{},source_refs:A(event.source_refs),requires_project_confirmation:!S(event.project_id)};
}

return{LIFECYCLES:LIFECYCLES,EVENT_TYPES:EVENT_TYPES,buildDossier:buildDossier,loadProjectDossier:loadProjectDossier,normalizeEvent:normalizeEvent,_test:{lifecycle:lifecycle,nextAction:nextAction}};
});