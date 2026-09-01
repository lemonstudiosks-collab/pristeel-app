/* PPPP English Platform Chrome v1
 * Presentation-only language normalizer for legacy-rendered UI chrome.
 * Does not translate business records, email bodies, project names or user-authored content.
 */
(function(){
'use strict';
if(window.__pstPlatformLanguageEnV1)return;window.__pstPlatformLanguageEnV1=true;
function S(v){return String(v==null?'':v);}
var X={
'Mundësitë':'Opportunities','Projektet':'Projects','Partnerët':'Partners','Financat':'Finance','Financa':'Finance','Sistemi':'System','Krijo':'Create','Rifresko':'Refresh','Kërko':'Search','Mbyll':'Close','Anulo':'Cancel','Ruaj':'Save','Shto':'Add','Fshi':'Delete','Shqyrto':'Review','Kryer':'Done','Hap':'Open','Hap projektin':'Open project','Të gjitha projektet':'All projects','Projekt i ri':'New project','Dublikatat':'Duplicates','Aktiviteti i fundit':'Latest activity','Afati':'Deadline','Klienti':'Client','Referenca':'Reference','Përshkrimi':'Description','Listë':'List','Faza':'Stage','Statusi':'Status','Aktiviteti':'Activity','Veprime':'Actions','Të gjithë':'All','Të gjitha':'All','Burimi':'Source','Kontaktet':'Contacts','Klientë':'Clients','Furnitorë':'Suppliers','Prodhues':'Manufacturers','Kompania':'Company','Vendi':'Country','Vlera':'Value','Përditësuar':'Updated','Veprime të tjera':'More actions',
'Përmbledhja':'Summary','Komunikimi':'Communication','Skedarët':'Files','Prokurimi':'Procurement','Komercialja':'Commercial','Ekzekutimi':'Execution','Detyrat':'Tasks','Gjendja':'Status','Hapi i radhës':'Next step','Dosja':'Folder','Dokumentet':'Documents','Dokument':'Document','Dokument i ri':'New document','Qendra e Dokumenteve':'Document Center','Regjistri':'Registry','Regjistri i kontakteve':'Contact registry','Të gjitha llojet':'All types','Pamja klasike':'Classic view',
'Aktiv':'Active','Aktive':'Active','Në realizim':'In execution','Në pritje':'Waiting','Në pritje të klientit':'Waiting for client','Në pritje të furnitorit':'Waiting for supplier','Në pritje të brendshme':'Waiting internally','Kërkon veprim':'Action required','Kërkon vëmendje':'Needs attention','Pa veprim':'No action','Konfirmuar':'Confirmed','Fituar':'Won','Humbur':'Lost','Shtyrë':'Postponed','Arkivuar':'Archived','Realizuar':'Completed','Mbyllur':'Closed','Vonuar':'Overdue','Urgjente':'Urgent','Mesatare':'Medium','E lartë':'High',
'Kërkesë':'RFQ','Në analizë':'Technical review','Prodhuesi':'Manufacturer','Çmimi':'Pricing','Ofertë':'Offer','Oferta':'Offers','Ofertat':'Offers','Prodhim':'Production','Auditim':'Audit','Dorëzim':'Delivery','Pa afat':'No deadline','Pa aktivitet':'No activity','Sot':'Today','Dje':'Yesterday','Nesër':'Tomorrow',
'Emailat e projektit':'Project emails','Kontaktet e projektit':'Project contacts','Skedarët e projektit':'Project files','Emaila me attachment':'Emails with attachments','Kontrollo Gmail':'Check Gmail','Hap Drive':'Open Drive','Importo nga Gmail':'Import from Gmail','Kërkesat e dalluara:':'Detected requirements:','kontroll manual':'manual review','Prodhuesit fiks':'Fixed manufacturers','Furnitorë sipas aftësisë':'Suppliers by capability','Nuk ka BOM':'No BOM','Pozicionet BOM':'BOM positions','Routing paraprak':'Preliminary routing','Përgatit / hap RFQ':'Prepare / open RFQ','Oferta furnitorësh':'Supplier offers','Ofertat tona':'Our offers','Ofertë e re':'New offer','Krijo / edito ofertë':'Create / edit offer','Faturat dalëse':'Outgoing invoices','Faturat hyrëse':'Supplier invoices','Garancitë bankare':'Bank guarantees','Nota K/D':'Credit / debit notes','Krijo faturë draft':'Create draft invoice','Detyrë':'Task','hapur':'open','Pa fazë':'No stage',
'Faturat':'Invoices','Faturë':'Invoice','Pagesat':'Payments','Shpenzimet':'Expenses','Raportet':'Reports','Shpenzime operative':'Operating expenses','Tatimet':'Taxes','Mjete financiare':'Finance tools','Kosto të tjera':'Other costs','Mjete të tjera':'More tools','Nota kreditore':'Credit notes','Nota debitore':'Debit notes','Paguar':'Paid','Për pagesë':'Due','Në pritje pagese':'Awaiting payment','Faturë e re':'New invoice','Raport financiar':'Financial report',
'Publikuar':'Published','Kompania':'Company','Lane / angle':'Lane / angle','Gjendja':'State','Kontakti':'Contact','Touches':'Touches','Follow-up':'Follow-up','Projekt':'Project','Me kontakt':'With contact','Outreach aktiv':'Active outreach','Promoted në projekt':'Promoted to project','Çdo outreach status':'Any outreach status','Çdo gjendje':'Any state','Të gjitha lane':'All lanes','Pa kontakt':'No contact','Dërguar':'Sent','Përgjigjur':'Replied','Takim':'Meeting','Hap Gmail':'Open Gmail',
'Duke ngarkuar…':'Loading…','Duke lexuar…':'Loading…','Duke sinkronizuar…':'Syncing…','Nuk ka të dhëna.':'No data.','Nuk ka të dhëna të regjistruara.':'No registered data.','Nuk ka aktivitet.':'No activity.','Nuk ka email.':'No email.','Asnjë projekt':'No projects','Pa emër':'Unnamed','Pa kategori':'No category'
};
var P=[
['Nuk ka të dhëna të regjistruara.','No registered data.'],['Nuk ka të dhëna.','No data.'],['Nuk ka aktivitet.','No activity.'],['Nuk ka email.','No email.'],
['Ky projekt përdor një dosje permanente Google Drive.','This project uses one permanent Google Drive folder.'],['Dosja Drive mungon.','The Drive folder is missing.'],
['Prodhues i listës së mbyllur','Fixed-list manufacturer'],['Nuk u gjet përputhje e sigurt.','No reliable match was found.'],
['RRUGA PA BOM','NO-BOM PATH'],['Përdor të dhënat e emailit/projektit dhe vazhdo direkt në draft RFQ.','Use the email/project data and continue directly to an RFQ draft.'],['Vazhdo te RFQ','Continue to RFQ'],
['Review BOM para RFQ','Review BOM before RFQ'],['pozicione janë të regjistruara.','positions are registered.'],['BOM duhet kontrolluar nga njeriu para përdorimit për RFQ.','The BOM must be reviewed by a person before it is used for an RFQ.'],
['RFQ krijohet si draft','RFQ is created as a draft'],['Platforma përgatit tekstin, gjuhën, afatin dhe follow-up-in. User-i e kontrollon para dërgimit.','The platform prepares the text, language, deadline and follow-up. A user reviews it before sending.'],
['Krahasim + marzh + aprovim','Comparison + margin + approval'],['Drafti mund të ruhet dhe editohet. Oferta finale dhe dërgimi kërkojnë veprim eksplicit të njeriut.','The draft can be saved and edited. The final offer and sending require an explicit human action.'],
['Fillon pas konfirmimit të blerësit','Starts after buyer confirmation'],['Konfirmimi te furnitori/prodhuesi dhe njoftimet përgatiten si draft. Dërgimi mbetet human-gated.','Supplier/manufacturer confirmations and notices are prepared as drafts. Sending remains human-gated.'],
['Financat finalizohen vetëm me miratim','Finance is finalized only with approval'],['Fatura, nota K/D dhe veprimet e garancisë mund të përgatiten si draft, por jo të konsiderohen finale pa njeri.','Invoices, credit/debit notes and guarantee actions can be prepared as drafts, but are not final without human approval.'],
['PPPP ruajti punë të pambyllur','PPPP saved unfinished work'],['Rikthe','Restore'],['Mbaje për më vonë','Keep for later'],
['Po sinkronizohet…','Syncing…'],['Sinkronizuar Sot','Synced today'],['Sinkronizuar Dje','Synced yesterday'],['Sinkronizuar ','Synced '],
['PPPP po punon','PPPP is working'],['Hapi i sugjeruar','Suggested next step'],['Update-i u ruajt.','Update saved.']
];
function translate(root){
 root=root||document;
 try{
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n;
  while((n=w.nextNode())){
   var p=n.parentElement;if(!p||/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/i.test(p.tagName))continue;
   var raw=n.nodeValue,trim=S(raw).trim();if(!trim)continue;
   if(X[trim]){n.nodeValue=raw.replace(trim,X[trim]);continue;}
   var out=raw;P.forEach(function(x){if(out.indexOf(x[0])>-1)out=out.split(x[0]).join(x[1]);});if(out!==raw)n.nodeValue=out;
  }
  Array.prototype.forEach.call(root.querySelectorAll?root.querySelectorAll('option'):[],function(o){var t=S(o.textContent).trim();if(X[t])o.textContent=X[t];});
  Array.prototype.forEach.call(root.querySelectorAll?root.querySelectorAll('input,textarea'):[],function(el){var ph=S(el.getAttribute('placeholder'));if(!ph)return;if(/^Kërko projekt/i.test(ph))el.setAttribute('placeholder','Search project, client, reference or description');else if(/Çfarë po ndodh me STACON/i.test(ph))el.setAttribute('placeholder','E.g. What is happening with STACON?');else if(/^Kërko/i.test(ph))el.setAttribute('placeholder',ph.replace(/^Kërko/i,'Search'));});
  var nav={home:'Home',tenders:'Opportunities',projects:'Projects',contacts:'Partners',finance:'Finance',apps:'System'};Object.keys(nav).forEach(function(k){var b=document.querySelector('#pst-ws-canonical-nav .pst-ws-navbtn[data-key="'+k+'"]');if(!b)return;var s=b.querySelector('.pst-nav-label')||b.querySelector('span');if(s)s.textContent=nav[k];});
 }catch(e){}
}
function run(){translate(document);}
function burst(){[0,80,240,650,1400,2800].forEach(function(ms){setTimeout(run,ms);});}
document.addEventListener('pst:modules-ready',burst,{once:true});
document.addEventListener('pst:home-canonical-rendered',burst);
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav button,[onclick],[data-pm-open],[data-pm-filter],[data-pf2-tab],[data-pf2-action],button,a'):null;if(t)burst();},true);
window.addEventListener('pageshow',burst,{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',burst,{once:true});else burst();
window.PSTPlatformLanguageEnV1={apply:run,burst:burst,translate:translate};
})();
