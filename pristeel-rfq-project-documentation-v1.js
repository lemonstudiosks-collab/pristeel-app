/* PRISTEEL RFQ project documentation v1
 * Adds a project-documentation download link to native Project-first RFQ drafts.
 * The original project documentation remains the technical source of truth and suppliers
 * are explicitly asked to verify PRISTEEL's BOM against it and report/correct discrepancies.
 * No Drive permissions are changed and no email is sent automatically.
 */
(function(){
'use strict';
if(window.__pstRfqProjectDocumentationV1)return;
window.__pstRfqProjectDocumentationV1=true;

function A(v){return Array.isArray(v)?v:[];}
function O(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();}return'';}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function data(){
  var R=window.PSTProjectFirstRfqDraftV1;
  return (R&&R._state&&R._state.data)||window.__pstIntegrityLastData||null;
}
function urls(v){
  var m=String(v||'').match(/https?:\/\/[^\s<>"']+/ig)||[];
  return m.map(function(x){return x.replace(/[),.;]+$/,'');});
}
function internalUrl(u){return /(?:prissteel\.com|localhost|127\.0\.0\.1|mail\.google\.com\/mail)/i.test(String(u||''));}
function urlScore(u,origin,name){
  u=String(u||'');name=String(name||'');if(!/^https?:\/\//i.test(u)||internalUrl(u))return-999;
  var s=0;
  if(origin==='buyer-email')s+=80;
  if(origin==='project-file')s+=45;
  if(origin==='project')s+=25;
  if(/(?:we\.tl|wetransfer|dropbox|sharepoint|onedrive|drive\.google\.com|mega\.|transfer|download)/i.test(u))s+=35;
  if(/\.zip(?:[?#]|$)/i.test(u)||/\.zip$/i.test(name))s+=45;
  if(/\.(?:pdf|dwg|dxf|ifc|xlsx?|rar|7z)(?:[?#]|$)/i.test(u)||/\.(?:pdf|dwg|dxf|ifc|xlsx?|rar|7z)$/i.test(name))s+=18;
  if(/drive\.google\.com\/drive\/folders\//i.test(u))s+=8;
  return s;
}
function candidate(list,u,origin,name){
  u=String(u||'').trim();if(!u||internalUrl(u)||!/^https?:\/\//i.test(u))return;
  list.push({url:u,origin:origin||'',name:name||'',score:urlScore(u,origin,name)});
}
function bestLink(d){
  d=d||data()||{};var out=[],p=d.project||{};
  A(d.emails).forEach(function(m){
    var from=String(O(m.from_email,m.sender,m.from,'')).toLowerCase();
    if(/@prissteel\.com\b/.test(from))return;
    var text=[m.body_text,m.body,m.text,m.snippet,m.subject].filter(Boolean).join('\n');
    urls(text).forEach(function(u){candidate(out,u,'buyer-email',m.subject||'');});
  });
  A(d.files).concat(A(d.projectDocs),A(d.attachmentLinks),A(d.inboxDocs),A(d.docs),A(d.drive&&d.drive.rows)).forEach(function(f){
    var u=O(f.webContentLink,f.web_view_link,f.webViewLink,f.drive_url,f.file_url,f.url,'');
    candidate(out,u,'project-file',O(f.name,f.filename,f.file_name,''));
  });
  [p.project_download_url,p.download_url,p.source_url,p.drive_folder_url].forEach(function(u){candidate(out,u,'project','');});
  if(p.drive_folder_id)candidate(out,'https://drive.google.com/drive/folders/'+p.drive_folder_id,'project','');
  out=out.filter(function(x){return x.score>-900;}).sort(function(a,b){return b.score-a.score;});
  return out.length?out[0]:null;
}
function langOf(row){
  var x=row&&row.querySelector('.prfq-lang');return String(x&&x.textContent||'EN').trim().toLowerCase();
}
function block(lang,link){
  link=String(link||'').trim();
  if(lang==='de')return 'Projektdokumentation / Download:\n'+link+'\n\nBitte prüfen Sie die oben aufgeführte BOM und die Mengen anhand der vollständigen Projektdokumentation. Sollten Sie fehlende Positionen, Mengenabweichungen oder sonstige Unstimmigkeiten feststellen, verwenden Sie bitte die korrekten Mengen in Ihrem Angebot und weisen Sie uns ausdrücklich auf die Abweichungen hin. Im Zweifel ist die Projektdokumentation maßgebend.';
  if(lang==='sr')return 'Projektna dokumentacija / Download:\n'+link+'\n\nMolimo vas da naš BOM i navedene količine proverite prema kompletnoj projektnoj dokumentaciji. Ako uočite nedostajuće pozicije, razlike u količinama ili druga odstupanja, molimo da u ponudi koristite ispravne količine i jasno nas obavestite o svim korekcijama. U slučaju neslaganja, projektna dokumentacija je merodavna.';
  if(lang==='sq')return 'Dokumentacioni i projektit / Shkarkim:\n'+link+'\n\nJu lutem kontrolloni BOM-in dhe sasitë tona kundrejt dokumentacionit të plotë të projektit. Nëse gjeni pozicione që mungojnë, dallime në sasi ose mospërputhje të tjera, ju lutem përdorni sasitë e sakta në ofertën tuaj dhe na tregoni qartë çdo korrigjim. Në rast mospërputhjeje, dokumentacioni i projektit është burimi teknik përcaktues.';
  return 'Project documentation / Download:\n'+link+'\n\nPlease verify our BOM and stated quantities against the complete project documentation. If you identify missing items, quantity differences or any other discrepancies, please use the correct quantities in your quotation and clearly flag every correction to us. In case of any discrepancy, the project documentation is the governing technical source.';
}
function stripBlock(body){
  body=String(body||'');
  return body.replace(/\n\n(?:Projektdokumentation \/ Download:|Projektna dokumentacija \/ Download:|Dokumentacioni i projektit \/ Shkarkim:|Project documentation \/ Download:)[\s\S]*?(?=\n\nBOM \/)/g,'');
}
function addBlock(body,lang,link){
  body=stripBlock(body);var b=block(lang,link);
  var marker=/\n\nBOM \/(?: Stahlmengen| količine čelika| sasite e celikut| steel quantities):/i;
  if(marker.test(body))return body.replace(marker,'\n\n'+b+'$&');
  return body+'\n\n'+b;
}
function currentLink(){
  var e=document.querySelector('#pst-pf2-rfq-draft [data-prfq-doc-link]');return String(e&&e.value||'').trim();
}
function setGmailBody(a,body){
  if(!a)return;try{var u=new URL(a.href,location.href);u.searchParams.set('body',body);a.href=u.toString();}catch(e){}
}
function patchRows(){
  var box=document.getElementById('pst-pf2-rfq-draft');if(!box)return false;
  var link=currentLink();
  box.querySelectorAll('[data-prfq-row]').forEach(function(row){
    var pre=row.querySelector('.prfq-preview'),a=row.querySelector('[data-prfq-gmail]');
    if(!pre)return;var body=addBlock(pre.textContent||'',langOf(row),link);pre.textContent=body;setGmailBody(a,body);
  });
  return true;
}
function css(){
  if(document.getElementById('pst-rfq-project-doc-css'))return;
  var s=document.createElement('style');s.id='pst-rfq-project-doc-css';s.textContent='\
.prfq-docs{padding:10px 14px;border-bottom:1px solid #e8eef0;background:#fbfdfd}.prfq-docs label{display:block;font-size:8px;font-weight:780;color:#60727a;margin-bottom:5px}.prfq-docrow{display:flex;gap:7px;align-items:center}.prfq-docrow input{flex:1;min-width:0;height:34px;border:1px solid #d8e5e9;border-radius:8px;padding:0 9px;font:8.5px/1.4 Inter,sans-serif;color:#52646c;background:#fff}.prfq-docrow a{height:34px;display:inline-flex;align-items:center;padding:0 10px;border:1px solid #d4e2e7;border-radius:8px;background:#fff;color:#3f7f98;font-size:8px;font-weight:750;text-decoration:none;white-space:nowrap}.prfq-docnote{font-size:7.5px;color:#829096;margin-top:5px;line-height:1.45}.prfq-docnote b{color:#596d75}@media(max-width:760px){.prfq-docrow{align-items:stretch;flex-direction:column}.prfq-docrow a{justify-content:center}}';document.head.appendChild(s);
}
function inject(){
  var box=document.getElementById('pst-pf2-rfq-draft');if(!box)return false;css();
  var old=box.querySelector('.prfq-docs');if(old){patchRows();return true;}
  var context=box.querySelector('.prfq-context'),list=box.querySelector('.prfq-list');if(!context&&!list)return false;
  var c=bestLink(data()),link=c&&c.url||'';
  var div=document.createElement('div');div.className='prfq-docs';
  div.innerHTML='<label>Dokumentacioni i projektit · link për shkarkim</label><div class="prfq-docrow"><input type="url" data-prfq-doc-link placeholder="Ngjit linkun e PDF / ZIP / dosjes së projektit" value="'+esc(link)+'"><a data-prfq-doc-open target="_blank" rel="noopener" href="'+esc(link||'#')+'">Hap linkun</a></div><div class="prfq-docnote"><b>Kontroll i dyfishtë:</b> prodhuesi do të kërkohet ta verifikojë BOM-in tonë kundrejt projektit dhe të korrigjojë çdo mungesë ose diferencë sasie. Linku nuk publikohet ose ndahet automatikisht nga platforma, prandaj kontrollo që furnitori ka qasje para dërgimit.</div>';
  if(list)box.insertBefore(div,list);else context.insertAdjacentElement('afterend',div);
  var inp=div.querySelector('[data-prfq-doc-link]'),open=div.querySelector('[data-prfq-doc-open]');
  inp.addEventListener('input',function(){open.href=inp.value.trim()||'#';setTimeout(patchRows,0);});
  patchRows();return true;
}
function schedule(){[0,60,180,450,900].forEach(function(ms){setTimeout(function(){inject();patchRows();},ms);});}

document.addEventListener('input',function(e){if(e.target&&e.target.matches&&e.target.matches('#pst-pf2-rfq-draft [data-prfq-context]'))setTimeout(function(){inject();patchRows();},0);},false);
document.addEventListener('click',function(e){
  var refresh=e.target&&e.target.closest&&e.target.closest('#pst-pf2-rfq-draft [data-prfq-refresh]');if(refresh){setTimeout(function(){inject();patchRows();},0);setTimeout(patchRows,80);return;}
  var tab=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="procurement"],[data-prfq-open]');if(tab){schedule();return;}
},false);
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest&&e.target.closest('#pst-pf2-rfq-draft [data-prfq-gmail]');if(!a)return;
  inject();patchRows();
  if(!currentLink()){
    e.preventDefault();e.stopPropagation();alert('Shto linkun e dokumentacionit të projektit para se të hapësh draftin në Gmail.');
  }
},true);
document.addEventListener('pst:bom-saved',schedule,false);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.PSTRfqProjectDocumentationV1={inject:inject,patchRows:patchRows,bestLink:bestLink,_test:{block:block,addBlock:addBlock,stripBlock:stripBlock,urlScore:urlScore}};
})();
