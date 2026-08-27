const T=(v,n=6000)=>String(v??'').trim().slice(0,n);
const N=(v)=>T(v,1000).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();

export function dateRange(v){
 const raw=T(v,9000);
 const m=raw.match(/\b(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)\s*[–—-]\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})\b/);
 return m?m[1]+' – '+m[2]:'';
}
export function scheduleAttachments(rows){
 return (rows||[]).filter(x=>/(plan|schedule|timeline|fertigungs|ablauf)/i.test(T(x?.attachment_name,500))||/(fabrication activity|welding steel beam|start welding|transport)/i.test(T(x?.extracted_text,12000)));
}
export function scheduleHighlights(rows){
 const out=[];
 for(const x of scheduleAttachments(rows)){
  const raw=T(x?.extracted_text,24000);
  for(const spec of [
    ['Saldimi i pllakës kryesore',/Start welding main plate[^\n]*?(\d{2}\/\d{2}\/\d{2})[^\n]*?(\d{2}\/\d{2}\/\d{2})/i],
    ['Saldimi i pllakës bazë',/Start welding base plate[^\n]*?(\d{2}\/\d{2}\/\d{2})[^\n]*?(\d{2}\/\d{2}\/\d{2})/i],
    ['Transporti',/Transport[^\n]*?(\d{2}\/\d{2}\/\d{2})[^\n]*?(\d{2}\/\d{2}\/\d{2})/i]
  ]){
   const m=raw.match(spec[1]);if(m)out.push({label:spec[0],start:m[1],finish:m[2],attachment_id:x.id,file_name:x.attachment_name});
  }
 }
 return out;
}
export function deterministicAnalyze(event,project,attachments){
 const dir=N(event?.direction),incoming=dir==='incoming',outgoing=dir==='outgoing',raw=T(event?.snippet,9000);
 const hasPlan=scheduleAttachments(attachments).length>0||/(plan pune|plan prodh|plan dinamik|schedule|fertigungsablauf|fabrication schedule|production plan|work plan)/i.test(raw);
 const hasVisit=/(vizit|visit|besichtigung|vor ort|factory|fabrik)/i.test(raw);
 const asks=incoming&&(/\?/.test(raw)||/(bitte|können sie|koennen sie|mund|me bejne te ditur|më bëjnë të ditur|njoftoni|teilen sie|sagen sie|si e ka me te pershtatshme|si e ka më të përshtatshme|let me know|please let|could you|when would|which phase|which period)/i.test(raw));
 const range=dateRange(raw),execution=N(project?.operational_state)==='execution'||/production|execution/.test(N(project?.pipeline_stage));
 let result={action_required:false,priority:'medium',category:'other',summary:'U regjistrua komunikim i ri në projekt.',next_action:'',workflow_state:'no_change',confidence:88,supersedes_prior_event_actions:false};
 if(outgoing&&hasVisit&&hasPlan){
  result={action_required:false,priority:'medium',category:'execution_update',summary:'PRISTEEL i dërgoi klientit planin aktual të prodhimit'+(range?' dhe propozoi periudhën '+range:'')+' për vizitën në fabrikë. Tani pritet konfirmimi i datës nga klienti.',next_action:'Prit konfirmimin e datës së vizitës nga klienti.',workflow_state:'wait_for_client',confidence:99,supersedes_prior_event_actions:true};
 }else if(incoming&&hasVisit&&hasPlan){
  result={action_required:asks,priority:asks?'high':'medium',category:'supplier_update',summary:'U pranua plan i ri prodhimi dhe kërkesë për koordinimin e vizitës së klientit në fabrikë.',next_action:asks?'Koordino me klientin fazën ose datën e vizitës dhe kthe përgjigje.':'',workflow_state:asks?'action_required':'no_change',confidence:98,supersedes_prior_event_actions:asks};
 }else if(outgoing){
  result={action_required:false,priority:'low',category:execution?'execution_update':'other',summary:'PRISTEEL dërgoi përgjigje për “'+T(event?.subject,220)+'”. Komunikimi i fundit është trajtuar dhe tani pritet pala tjetër.',next_action:'Prit përgjigjen e palës tjetër.',workflow_state:'wait_for_client',confidence:94,supersedes_prior_event_actions:true};
 }else if(asks){
  result={action_required:true,priority:'high',category:'client_request',summary:'U pranua kërkesë e re që kërkon përgjigje: '+T(event?.subject,220)+'.',next_action:'Shqyrto emailin e ri dhe përgjigju kërkesës.',workflow_state:'action_required',confidence:94,supersedes_prior_event_actions:true};
 }else if(incoming&&event?.has_attachments){
  result={action_required:false,priority:'low',category:'supplier_update',summary:'U pranua dokumentacion i ri për projektin në emailin “'+T(event?.subject,220)+'”.',next_action:'',workflow_state:'no_change',confidence:91,supersedes_prior_event_actions:false};
 }
 return{result,model:'pppp-deterministic-email-v2',response_id:null,provider:'deterministic'};
}
