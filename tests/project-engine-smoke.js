(function(){
'use strict';
var E=typeof require==='function'?require('../pristeel-project-engine-v1.js'):this.PSTProjectEngineV1;
function ok(v,m){if(!v)throw new Error(m);}
function eq(a,b,m){if(a!==b)throw new Error(m+' (expected '+b+', got '+a+')');}
function project(id,status,operational,pipeline,name){return{id:id,name:name||id,ref:id,status:status,operational_state:operational,pipeline_stage:pipeline,client:name==='STACON'?'STACON':'Client '+id};}

var stacon=E.buildDossier({
  project:project('38bdf772-d73e-47b2-9d0f-6020e105aa62','Fituar','execution','production_control','STACON'),
  bom:[{id:'bom-1',description:'Steel baseline'}],
  ourOffers:[{id:'our-1',document_nr:'D-22/26',total_eur:87375,currency:'EUR',status:'sent',created_at:'2026-04-01'}],
  supplierOffers:[{id:'sector',supplier_name:'Sector Construction',total_eur:85200},{id:'euro-offer',supplier_name:'Eurosteel',total_eur:84608.40}],
  supplierDecisions:[{id:'decision-1',decision_type:'selected_producer',supplier_name:'Eurosteel',status:'active',created_at:'2026-04-10'}],
  contracts:[
    {id:'client-contract',type:'sales contract',counterparty:'STACON',status:'signed',amount:87375,currency:'EUR',signed_at:'2026-04-12'},
    {id:'supplier-contract',type:'producer subcontract',supplier_name:'Eurosteel',status:'signed',amount:84608.40,currency:'EUR',signed_at:'2026-04-13'}
  ],
  invoicesOut:[{id:'out-1',invoice_nr:'ADV-STACON',gross_amount:26212.50,currency:'EUR',paid:true,paid_date:'2026-05-01'}],
  invoicesIn:[{id:'in-1',invoice_nr:'ADV-EUROSTEEL',gross_amount:25382.52,currency:'EUR',paid:true,paid_date:'2026-05-02'}],
  guarantees:[{id:'g-1',status:'issued',amount:8737.50}],
  projectRequirements:[{id:'quality-1',title:'Quality documents approval',status:'review'}],
  tasks:[{id:'task-1',title:'Approve production quality documents',detail:'Client approval is required before factory inspection.',status:'hapur',source:'execution_release_readiness',priority:'high',due_at:'2026-09-02'}],
  emails:[{gmail_message_id:'mail-1',subject:'Please confirm quality document approval',sent_at:'2026-08-29'}]
});
eq(stacon.lifecycle.code,'EXECUTION','STACON lifecycle');
eq(stacon.lifecycle.pre_award_editable,false,'execution pre-award workflow must be read-only');
eq(stacon.bom_baseline.historical,true,'execution BOM must be historical');
eq(stacon.selected_producer.name,'Eurosteel','selected producer');
eq(stacon.commercial_baseline.amount,87375,'client commercial baseline');
eq(stacon.supplier_contractual_value.amount,84608.40,'supplier contractual value');
eq(stacon.invoices_out[0].paid,true,'client advance paid');
eq(stacon.invoices_in[0].paid,true,'supplier advance paid');
eq(stacon.next_action.title,'Approve production quality documents','execution next action comes from real task');
ok(stacon.supplier_offers.some(function(x){return x.supplier_name==='Sector Construction';}),'historical supplier evidence retained');

var pre=E.buildDossier({project:project('11111111-1111-4111-8111-111111111111','Aktiv','analysis','rfq_in','Tender'),bom:[{id:'b'}],tasks:[{id:'t',title:'Send approved RFQ',status:'hapur',source:'rfq'}],emails:[{id:'pre-mail',subject:'Tender request'}],files:[{id:'pre-doc',file_name:'Tender.pdf'}],invoicesOut:[{id:'pre-invoice',gross_amount:100}]});
eq(pre.lifecycle.code,'PRE_AWARD','pre-award lifecycle');
eq(pre.lifecycle.pre_award_editable,true,'pre-award remains editable');
eq(pre.next_action.title,'Send approved RFQ','pre-award next action');

var waiting=E.buildDossier({project:project('22222222-2222-4222-8222-222222222222','Në pritje','waiting','client_decision','Waiting'),ourOffers:[{id:'o',total_eur:100,status:'sent'}],emails:[{gmail_message_id:'m',subject:'Offer sent',sent_at:'2026-08-01'}]});
eq(waiting.lifecycle.code,'WAITING','waiting lifecycle');
eq(waiting.next_action.title,'Needs confirmation','waiting must not invent follow-up');

var closed=E.buildDossier({project:project('33333333-3333-4333-8333-333333333333','Mbyllur','closed','archive','Closed'),contracts:[{id:'c',type:'sales contract',status:'signed',amount:100}],invoicesIn:[{id:'i',gross_amount:70,paid:true}]});
eq(closed.lifecycle.code,'CLOSED','closed lifecycle');
eq(closed.actual_costs.complete,true,'closed paid costs complete');

eq(stacon.project.id,'38bdf772-d73e-47b2-9d0f-6020e105aa62','switching preserves first dossier');
eq(pre.project.id,'11111111-1111-4111-8111-111111111111','switching preserves second dossier');
ok(stacon.tasks!==pre.tasks&&stacon.communications!==pre.communications&&stacon.documents!==pre.documents&&stacon.invoices_out!==pre.invoices_out,'project dossier collections must not leak');
eq(stacon.communications[0].subject,'Please confirm quality document approval','STACON communication must survive switching');
eq(pre.communications[0].subject,'Tender request','pre-award communication must remain isolated');
eq(stacon.next_action.title,'Approve production quality documents','STACON next action must survive switching');

var candidate=E.normalizeEvent({type:'email_received',payload:{subject:'New inquiry'}});
eq(candidate.requires_project_confirmation,true,'unresolved event becomes human-confirmed project candidate');

if(typeof console!=='undefined'&&console.log)console.log('project-engine-smoke: ok');
else if(typeof print==='function')print('project-engine-smoke: ok');
}).call(typeof globalThis!=='undefined'?globalThis:this);