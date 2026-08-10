/* PRISTEEL RFQ project documentation v1
 * Manages the project-documentation link field for Project-first RFQ drafts.
 * IMPORTANT: this module no longer appends text to supplier email bodies.
 * The RFQ finalizer owns the complete outbound email so the signature is always the final line.
 * No Drive permissions are changed and no email is sent automatically.
 */
(function(){
'use strict';
if(window.__pstRfqProjectDocumentationV1)return;
window.__pstRfqProjectDocumentationV1=true;

function A(v){return Array.isArray(v)?v:[];}
function O(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();}return'';}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function data(){var R=window.PSTProjectFirstRfqDraftV1;return (R&&R._state&&R._state.data)||window.__pstIntegrityLastData||null;}
function urls(v){var m=String(v||'').match(/https?:\/\/[^\s<>"']+/ig)||[];return m.map(function(x){return x.replace(/[),.;]+$/,'');});}
function badUrl(u){
  u=String(u||'').trim();
  if(!/^https?:\/\//i.test(u))return true;
  return /(?:prissteel\.com|localhost|127\.0\.0\.1|mail\.google\.com|google\.[^/]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps|google\.[^/]+\/search|bing\.com\/maps|openstreetmap\.org|facebook\.com|instagram\.com|linkedin\.com)/i.test(u);
}
function urlScore(u,origin,name){
  u=String(u||'');name=String(name||'');if(badUrl(u))return-999;var s=0;
  if(origin==='buyer-email')s+=80;if(origin==='project-file')s+=45;if(origin==='project')s+=25;
  if(/(?:we\.tl|wetransfer|dropbox|sharepoint|onedrive|drive\.google\.com|mega\.|transfer|download)/i.test(u))s+=35;
  if(/\.zip(?:[?#]|$)/i.test(u)||/\.zip$/i.test(name))s+=45;
  if(/\.(?:pdf|dwg|dxf|ifc|xlsx?|rar|7z)(?:[?#]|$)/i.test(u)||/\.(?:pdf|dwg|dxf|ifc|xlsx?|rar|7z)$/i.test(name))s+=18;
  if(/drive\.google\.com\/drive\/folders\//i.test(u))s+=8;
  return s;
}
function candidate(list,u,origin,name){u=String(u||'').trim();var score=urlScore(u,origin,name);if(score>-900)list.push({url:u,origin:origin||'',name:name||'',score:score});}
function bestLink(d){
  d=d||data()||{};var out=[],p=d.project||{};
  A(d.emails).forEach(function(m){
    var from=String(O(m.from_email,m.sender,m.from,'')).toLowerCase();if(/@prissteel\.com\b/.test(from))return;
    urls([m.body_text,m.body,m.text,m.snippet,m.subject].filter(Boolean).join('\n')).forEach(function(u){candidate(out,u,'buyer-email',m.subject||'');});
  });
  A(d.files).concat(A(d.projectDocs),A(d.attachmentLinks),A(d.inboxDocs),A(d.docs),A(d.drive&&d.drive.rows)).forEach(function(f){candidate(out,O(f.webContentLink,f.web_view_link,f.webViewLink,f.drive_url,f.file_url,f.url,''),'project-file',O(f.name,f.filename,f.file_name,''));});
  [p.project_download_url,p.download_url,p.source_url,p.drive_folder_url].forEach(function(u){candidate(out,u,'project','');});
  if(p.drive_folder_id)candidate(out,'https://drive.google.com/drive/folders/'+p.drive_folder_id,'project','');
  out.sort(function(a,b){return b.score-a.score;});return out.length?out[0]:null;
}
function currentLink(){var e=document.querySelector('#pst-pf2-rfq-draft [data-prfq-doc-link]');return String(e&&e.value||'').trim();}
function patchRows(){
  // Deliberate no-op. Email body composition belongs exclusively to pristeel-rfq-draft-finalizer-v1.js.
  return true;
}
function css(){
  if(document.getElementById('pst-rfq-project-doc-css'))return;
  var s=document.createElement('style');s.id='pst-rfq-project-doc-css';s.textContent='\
.prfq-docs{padding:10px 14px;border-bottom:1px solid #e8eef0;background:#fbfdfd}.prfq-docs label{display:block;font-size:8px;font-weight:780;color:#60727a;margin-bottom:5px}.prfq-docrow{display:flex;gap:7px;align-items:center}.prfq-docrow input{flex:1;min-width:0;height:34px;border:1px solid #d8e5e9;border-radius:8px;padding:0 9px;font:8.5px/1.4 Inter,sans-serif;color:#52646c;background:#fff}.prfq-docrow a{height:34px;display:inline-flex;align-items:center;padding:0 10px;border:1px solid #d4e2e7;border-radius:8px;background:#fff;color:#3f7f98;font-size:8px;font-weight:750;text-decoration:none;white-space:nowrap}.prfq-docnote{font-size:7.5px;color:#829096;margin-top:5px;line-height:1.45}.prfq-docnote b{color:#596d75}@media(max-width:760px){.prfq-docrow{align-items:stretch;flex-direction:column}.prfq-docrow a{justify-content:center}}';document.head.appendChild(s);
}
function inject(){
  var box=document.getElementById('pst-pf2-rfq-draft');if(!box)return false;css();
  var old=box.querySelector('.prfq-docs');if(old)return true;
  var context=box.querySelector('.prfq-context'),list=box.querySelector('.prfq-list');if(!context&&!list)return false;
  var c=bestLink(data()),link=c&&c.url||'';
  var div=document.createElement('div');div.className='prfq-docs';
  div.innerHTML='<label>Dokumentacioni i projektit · link për shkarkim</label><div class="prfq-docrow"><input type="url" data-prfq-doc-link placeholder="Ngjit linkun e PDF / ZIP / dosjes së projektit" value="'+esc(link)+'"><a data-prfq-doc-open target="_blank" rel="noopener" href="'+esc(link||'#')+'">Hap linkun</a></div><div class="prfq-docnote"><b>Dokumentacioni është burimi teknik:</b> linku futet vetëm një herë në draftin final. Kontrollo që furnitori ka qasje para dërgimit.</div>';
  if(list)box.insertBefore(div,list);else context.insertAdjacentElement('afterend',div);
  var inp=div.querySelector('[data-prfq-doc-link]'),open=div.querySelector('[data-prfq-doc-open]');
  inp.addEventListener('input',function(){open.href=inp.value.trim()||'#';var F=window.PSTRfqDraftFinalizerV1;if(F&&typeof F.finalize==='function')setTimeout(F.finalize,0);});
  return true;
}
function schedule(){[0,60,180,450,900].forEach(function(ms){setTimeout(inject,ms);});}
document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="procurement"],[data-prfq-open],#pst-pf2-rfq-draft [data-prfq-refresh]');if(t)schedule();},false);
document.addEventListener('pst:bom-saved',schedule,false);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.PSTRfqProjectDocumentationV1={inject:inject,patchRows:patchRows,bestLink:bestLink,currentLink:currentLink,_test:{badUrl:badUrl,urlScore:urlScore}};
})();
