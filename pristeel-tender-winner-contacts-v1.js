/* PRISTEEL — TED Winner Contacts v1
 * Read-only UI for researched public business contacts on awarded TED records.
 * Data source: kek_tender_watch.payload.winner.contact_enrichment.
 */
(function(){
'use strict';
if(window.__pstTenderWinnerContactsV1)return;
window.__pstTenderWinnerContactsV1=true;

var rows=[],byId=new Map(),byProc=new Map(),loading=null,lastFetch=0;
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function arr(v){return Array.isArray(v)?v:[];}
function payload(r){return r&&r.payload&&typeof r.payload==='object'?r.payload:{};}
function winner(r){var w=payload(r).winner;return w&&typeof w==='object'?w:{};}
function enrichment(r){var e=winner(r).contact_enrichment;return e&&typeof e==='object'?e:null;}
function names(r){var w=winner(r),a=arr(w.names).filter(Boolean);if(w.name&&a.indexOf(w.name)<0)a.unshift(w.name);return a;}
function isAward(r){return String(payload(r).source||'').toUpperCase()==='TED'&&payload(r).notice_phase==='award';}
function uniq(a){return Array.from(new Set((a||[]).filter(Boolean).map(String)));}
function rawEmails(r){var w=winner(r);return uniq(arr(w.emails).concat(w.email?[w.email]:[]));}
function rawWebsites(r){var w=winner(r);return uniq(arr(w.websites).concat(w.website?[w.website]:[]));}
function rawPeople(r){var w=winner(r);return uniq(arr(w.contacts).concat(w.contact_point?[w.contact_point]:[]));}
function organizations(r){var e=enrichment(r);return e&&Array.isArray(e.organizations)?e.organizations:[];}
function contactCount(r){var e=enrichment(r);if(e&&Number.isFinite(Number(e.contact_count)))return Number(e.contact_count);return uniq(rawEmails(r).concat(rawPeople(r))).length;}
function safeHttp(v){var s=String(v||'').trim();return /^https?:\/\//i.test(s)?s:'';}
function rebuildMaps(){byId=new Map();byProc=new Map();rows.forEach(function(r){if(r&&r.id!=null)byId.set(String(r.id),r);if(r&&r.procurement_no)byProc.set(String(r.procurement_no),r);});}
async function refresh(force){
 if(!force&&Date.now()-lastFetch<60000&&rows.length)return rows;
 if(loading)return loading;
 if(typeof window.supaFetch!=='function')return rows;
 loading=window.supaFetch('kek_tender_watch?select=id,procurement_no,publication_no,payload&order=published_date.desc&limit=1200').then(function(r){rows=Array.isArray(r)?r:[];lastFetch=Date.now();rebuildMaps();return rows;}).catch(function(){return rows;}).finally(function(){loading=null;});
 return loading;
}
function findRow(key){var k=String(key||'');return byId.get(k)||byProc.get(k)||null;}
function purposeLabel(v){return({procurement:'Prokurim',tender:'Tender / ofertim',sales:'Shitje',general:'Kontakt i përgjithshëm',person:'Person',contact_point:'Kontakt TED',company:'Faqja zyrtare'})[v]||String(v||'Kontakt');}
function confidenceLabel(v){return v==='high'?'E verifikuar':v==='medium'?'Përputhje e mirë':'Për verifikim';}
function contactLink(c){var type=String(c&&c.type||''),value=String(c&&c.value||'');if(type==='email')return'mailto:'+encodeURIComponent(value);if(type==='phone')return'tel:'+value.replace(/[^+0-9]/g,'');if(type==='website')return safeHttp(value);return'';}
function ensureModal(){
 var old=document.getElementById('pst-twc-backdrop');if(old)return old;
 var b=document.createElement('div');b.id='pst-twc-backdrop';b.style.cssText='position:fixed;inset:0;z-index:10120;background:rgba(26,34,38,.46);display:none;align-items:center;justify-content:center;padding:18px';
 b.innerHTML='<div style="width:min(780px,96vw);max-height:88vh;overflow:auto;background:#fff;border:1px solid #DCE4E7;border-radius:15px;box-shadow:0 24px 75px rgba(0,0,0,.18);padding:20px"><div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start"><div><div style="font-size:9px;font-weight:800;letter-spacing:1px;color:#4F92AA;text-transform:uppercase">TED WINNER INTELLIGENCE</div><div id="pst-twc-title" style="font-size:18px;font-weight:760;color:#263238;margin-top:3px">Kontaktet e fituesit</div><div id="pst-twc-meta" style="font-size:10.5px;color:#7D898F;margin-top:4px"></div></div><button type="button" onclick="pstTenderWinnerContactsClose()" class="pst-kek-btn">Mbyll</button></div><div id="pst-twc-body" style="margin-top:16px"></div><div style="margin-top:16px;padding-top:10px;border-top:1px solid #EDF1F2;font-size:9.5px;color:#889399">Vetëm kontakte biznesi publike · burimi dhe confidence ruhen · nuk dërgohet email automatikisht.</div></div>';
 b.addEventListener('click',function(e){if(e.target===b)window.pstTenderWinnerContactsClose();});document.body.appendChild(b);return b;
}
function sourceLink(c){var u=safeHttp(c&&c.source_url);return u?'<a href="'+esc(u)+'" target="_blank" rel="noopener" style="color:#3F87A0;text-decoration:none">Burimi ↗</a>':'<span style="color:#9AA4A9">TED</span>';}
function contactRow(c){var href=contactLink(c),val=esc(c&&c.value||''),main=href?'<a href="'+esc(href)+'" '+(String(c.type)==='website'?'target="_blank" rel="noopener"':'')+' style="font-weight:700;color:#29434E;text-decoration:none">'+val+'</a>':'<span style="font-weight:700;color:#29434E">'+val+'</span>';return'<div style="display:grid;grid-template-columns:minmax(180px,1.4fr) 105px 105px 70px;gap:9px;align-items:center;padding:8px 0;border-top:1px solid #EEF2F3;font-size:11px">'+main+'<span style="color:#66767D">'+esc(purposeLabel(c&&c.purpose))+'</span><span style="color:#66767D">'+esc(confidenceLabel(c&&c.confidence))+'</span><span style="text-align:right;font-size:10px">'+sourceLink(c)+'</span></div>';}
function organizationCard(o){var cs=arr(o&&o.contacts),site=safeHttp(o&&o.official_website);return'<section style="border:1px solid #DFE7EA;border-radius:12px;padding:13px 14px;margin-bottom:11px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div style="font-size:13px;font-weight:800;color:#26353B">'+esc(o&&o.name||'Fitues')+'</div><div style="font-size:10px;color:#89959B;margin-top:2px">'+esc([o&&o.city,o&&o.country].filter(Boolean).join(' · '))+'</div></div>'+(site?'<a href="'+esc(site)+'" target="_blank" rel="noopener" class="pst-kek-btn">Web ↗</a>':'')+'</div>'+(cs.length?'<div style="margin-top:9px">'+cs.map(contactRow).join('')+'</div>':'<div style="font-size:11px;color:#8B969C;margin-top:10px">Nuk u gjet kontakt publik i verifikueshëm për këtë kompani.</div>')+'</section>';}
function rawBlock(r){var emails=rawEmails(r),webs=rawWebsites(r),people=rawPeople(r);if(!emails.length&&!webs.length&&!people.length)return'<div style="padding:14px;border-radius:10px;background:#F7F9FA;color:#77858B;font-size:11px">Hulumtimi automatik ende nuk ka gjetur kontakt publik të verifikueshëm.</div>';var items=[];emails.forEach(function(v){items.push('<div><b>Email TED:</b> <a href="mailto:'+esc(v)+'">'+esc(v)+'</a></div>');});webs.forEach(function(v){items.push('<div><b>Web TED:</b> <a href="'+esc(v)+'" target="_blank" rel="noopener">'+esc(v)+'</a></div>');});people.forEach(function(v){items.push('<div><b>Kontakt TED:</b> '+esc(v)+'</div>');});return'<div style="padding:12px 13px;border-radius:10px;background:#F7F9FA;font-size:11px;line-height:1.7;color:#4C5B62"><b>Të dhëna direkte nga TED</b>'+items.join('')+'</div>';}
function unassignedBlock(r){var e=enrichment(r),u=e&&e.unassigned_ted_contacts;if(!u)return'';var emails=arr(u.emails),webs=arr(u.websites);if(!emails.length&&!webs.length)return'';return'<div style="margin-top:12px;padding:11px 12px;border:1px solid #F0D7B0;background:#FFF9EF;border-radius:9px;font-size:10.5px;line-height:1.6;color:#725A34"><b>Kontakte TED pa lidhje të sigurt me një fitues:</b> '+esc(emails.concat(webs).join(' · '))+'<br>Nuk janë caktuar automatikisht te asnjë kompani.</div>';}
function renderModal(r){var b=ensureModal(),e=enrichment(r),orgs=organizations(r);document.getElementById('pst-twc-title').textContent='Kontaktet e fituesit';document.getElementById('pst-twc-meta').textContent=(r.procurement_no||'TED')+' · '+names(r).length+' kompani · '+contactCount(r)+' kontakte';var body=document.getElementById('pst-twc-body');body.innerHTML=orgs.length?orgs.map(organizationCard).join('')+unassignedBlock(r):rawBlock(r);if(e&&e.researched_at)body.innerHTML+='<div style="font-size:9.5px;color:#929CA1;margin-top:9px">Hulumtuar: '+esc(new Date(e.researched_at).toLocaleString('sq-AL'))+' · '+esc(e.version||'winner-contact')+'</div>';b.style.display='flex';}
window.pstTenderWinnerContactsClose=function(){var b=document.getElementById('pst-twc-backdrop');if(b)b.style.display='none';};
window.pstTenderWinnerContacts=async function(key){await refresh(false);var r=findRow(key);if(!r){await refresh(true);r=findRow(key);}if(!r||!isAward(r))return null;renderModal(r);return r;};
function decorate(){
 var table=document.querySelector('#pst-kek-list table');if(!table)return;
 table.querySelectorAll('tbody tr').forEach(function(tr){var m=String(tr.textContent||'').match(/TED-\d+-\d+/);if(!m)return;var r=byProc.get(m[0]);if(!r||!isAward(r)||!names(r).length)return;var acts=tr.querySelector('.pst-kek-rowacts');if(!acts||acts.querySelector('[data-pst-winner-contacts]'))return;var btn=document.createElement('button');btn.type='button';btn.className='pst-kek-btn';btn.setAttribute('data-pst-winner-contacts','1');btn.textContent='Kontaktet'+(contactCount(r)?' ('+contactCount(r)+')':'');btn.addEventListener('click',function(){window.pstTenderWinnerContacts(r.id);});acts.insertBefore(btn,acts.firstChild);
 });
}
function scheduleDecorate(){refresh(false).then(function(){setTimeout(decorate,20);setTimeout(decorate,260);});}
function installWrap(){
 if(typeof window.pstKekRender==='function'&&!window.pstKekRender.__pstWinnerContacts){var orig=window.pstKekRender;var wrapped=function(){var out=orig.apply(this,arguments);scheduleDecorate();return out;};wrapped.__pstWinnerContacts=true;window.pstKekRender=wrapped;}
 if(typeof window.pstKekLoad==='function'&&!window.pstKekLoad.__pstWinnerContacts){var load=window.pstKekLoad;var wrappedLoad=function(){var out=load.apply(this,arguments);Promise.resolve(out).finally(scheduleDecorate);return out;};wrappedLoad.__pstWinnerContacts=true;window.pstKekLoad=wrappedLoad;}
}
[400,900,1600,2800,4800,8000].forEach(function(ms){setTimeout(function(){installWrap();scheduleDecorate();},ms);});
window.addEventListener('pst:modules-ready',function(){installWrap();scheduleDecorate();});
window.PSTTenderWinnerContactsV1={refresh:refresh,decorate:decorate,contactCount:contactCount,organizations:organizations,enrichment:enrichment,renderModal:renderModal};
})();
