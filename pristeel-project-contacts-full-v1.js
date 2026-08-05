/* PRISTEEL full project contacts v1
 * Shows only contacts related to the current project and enriches them with all available saved fields.
 * No observers, intervals, project-open wrappers or destructive writes.
 */
(function(){
'use strict';
if(window.__pstProjectContactsFullV1)return;
window.__pstProjectContactsFullV1=true;

var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com','prissteel@gmail.com'];
var SYSTEM=/(^|[._-])(no-?reply|mailer-daemon|postmaster|notifications?|dmarc|calendar-notification)([._-]|@|$)/i;
var busy=false;

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function email(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function external(v){var e=email(v);return !!(e&&INTERNAL.indexOf(e)<0&&!SYSTEM.test(e));}
function nonempty(v){return v!==null&&v!==undefined&&String(v).trim()!==''&&String(v)!=='[object Object]';}
function first(){for(var i=0;i<arguments.length;i++)if(nonempty(arguments[i]))return arguments[i];return'';}
function initials(v){var p=String(v||'?').trim().split(/\s+/);return ((p[0]||'?')[0]+(p[1]?p[1][0]:'')).toUpperCase();}
function prettyEmailName(e){return String(e||'').split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});}
function db(path){if(typeof window.supaFetch!=='function')return Promise.resolve([]);return window.supaFetch(path).then(arr).catch(function(e){console.warn('PRISTEEL full contacts:',path,e);return[];});}
function merge(target,source,prefer){Object.keys(source||{}).forEach(function(k){var v=source[k];if(!nonempty(v))return;if(prefer||!nonempty(target[k]))target[k]=v;});return target;}
function contactName(c){return first(c.name,c.person,c.full_name,c.contact_name,[c.first_name,c.last_name].filter(nonempty).join(' '),prettyEmailName(c.email));}
function company(c){return first(c.company,c.company_name,c.organization,c.organisation,c.account_name);}
function role(c){return first(c.role,c.job_title,c.position,c.title,c.function);}
function phone(c){return first(c.phone,c.mobile,c.telephone,c.phone_number,c.mobile_phone,c.work_phone);}
function address(c){return first(c.address,c.street_address,c.street,[c.city,c.postal_code].filter(nonempty).join(' '));}
function website(c){return first(c.website,c.website_url,c.company_website);}
function linkedin(c){return first(c.linkedin_url,c.linkedin,c.linkedin_profile);}
function hubspot(c){return first(c.hubspot_url,c.hs_url,c.crm_url);}
function current(){var d=window.__pstIntegrityLastData||null,p=d&&d.project;return{data:d,id:String(p&&p.id||window.__pstCurrentProjectId||'')};}
function baseContacts(data){
  var map={};
  function add(row,prefer){var e=email(row&&row.email);if(!external(e))return;var c=map[e]||(map[e]={email:e});merge(c,row||{},!!prefer);c.email=e;}
  arr(data&&data.contacts).forEach(function(c){add(c,false);});
  arr(data&&data.emails).forEach(function(m){
    if(external(m.from_email))add({email:m.from_email,name:m.from_name,last_seen:m.sent_at,source:'project_email'},false);
    arr(m.to_emails).forEach(function(e){add({email:e,last_seen:m.sent_at,source:'project_email'},false);});
    arr(m.cc_emails).forEach(function(e){add({email:e,last_seen:m.sent_at,source:'project_email',role:'CC'},false);});
  });
  return map;
}
function inEmails(emails){return emails.map(function(e){return'"'+String(e).replace(/"/g,'')+'"';}).join(',');}
async function loadContacts(){
  var c=current(),data=c.data,pid=c.id;if(!data||!pid)return[];
  var map=baseContacts(data),projectRows=await db('project_contacts?project_id=eq.'+enc(pid)+'&select=*&limit=3000');
  projectRows.forEach(function(row){var e=email(row.email);if(!external(e))return;var item=map[e]||(map[e]={email:e});merge(item,row,true);item.email=e;item.__projectSaved=true;});
  var emails=Object.keys(map),globalRows=[];
  for(var i=0;i<emails.length;i+=30){globalRows=globalRows.concat(await db('contacts?email=in.('+inEmails(emails.slice(i,i+30))+')&select=*&limit=3000'));}
  globalRows.forEach(function(row){var e=email(row.email);if(!map[e])return;var merged={};merge(merged,row,true);merge(merged,map[e],true);merged.email=e;map[e]=merged;});
  return Object.keys(map).map(function(e){var x=map[e];x.email=e;x.name=contactName(x);return x;}).filter(function(x){return x.status!=='inactive'&&x.status!=='hidden';}).sort(function(a,b){return Number(!!b.is_primary)-Number(!!a.is_primary)||Number(b.email_count||b.count||0)-Number(a.email_count||a.count||0)||contactName(a).localeCompare(contactName(b));});
}
function link(url,label){if(!nonempty(url))return'';var u=String(url);if(!/^https?:\/\//i.test(u))u='https://'+u;return'<a class="pst-pcf-link" href="'+esc(u)+'" target="_blank">'+esc(label)+'</a>';}
function field(label,value,html){if(!nonempty(value))return'';return'<div class="pst-pcf-field"><span>'+esc(label)+'</span><b>'+(html||esc(value))+'</b></div>';}
function card(c){
  var nm=contactName(c),co=company(c),rl=role(c),ph=phone(c),addr=address(c),web=website(c),li=linkedin(c),hs=hubspot(c),mail='<a href="mailto:'+esc(c.email)+'">'+esc(c.email)+'</a>',tel=ph?'<a href="tel:'+esc(ph)+'">'+esc(ph)+'</a>':'';
  var fields='';
  fields+=field('Email',c.email,mail);
  fields+=field('Telefon',ph,tel);
  fields+=field('Kompania',co);
  fields+=field('Roli',rl);
  fields+=field('Adresa',addr);
  fields+=field('Qyteti',c.city);
  fields+=field('Kodi postar',first(c.postal_code,c.zip));
  fields+=field('Shteti',c.country);
  fields+=field('Website',web,link(web,'Hap website-in'));
  fields+=field('LinkedIn',li,link(li,'Hap LinkedIn'));
  fields+=field('HubSpot / CRM',hs,link(hs,'Hap kontaktin'));
  fields+=field('Lloji',first(c.kind,c.contact_type,c.type));
  fields+=field('Kontakt primar',c.is_primary?'Po':'');
  fields+=field('Emaila në projekt',first(c.email_count,c.count));
  fields+=field('Kontakti i fundit',first(c.last_seen,c.updated_at));
  fields+=field('Shënime',first(c.notes,c.note,c.description));
  return'<article class="pst-pcf-card"><div class="pst-pcf-top"><div class="pst-pcf-avatar">'+esc(initials(nm))+'</div><div class="pst-pcf-head"><h3>'+esc(nm)+(c.is_primary?' <i>Primar</i>':'')+'</h3><p>'+esc([rl,co].filter(nonempty).join(' · ')||'Kontakt i projektit')+'</p></div><a class="pst-pcf-mail" href="mailto:'+esc(c.email)+'">Dërgo email</a></div><div class="pst-pcf-grid">'+fields+'</div></article>';
}
function css(){if(document.getElementById('pst-project-contacts-full-css'))return;var s=document.createElement('style');s.id='pst-project-contacts-full-css';s.textContent='\
.pst-pcf-wrap{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:4px 2px}.pst-pcf-card{border:1px solid #DDE8EC;border-radius:13px;background:#fff;padding:13px;min-width:0}.pst-pcf-top{display:flex;align-items:center;gap:10px;padding-bottom:11px;border-bottom:1px solid #EDF2F4}.pst-pcf-avatar{width:38px;height:38px;border-radius:11px;background:#EAF5F8;color:#3F7F98;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:780;flex:0 0 auto}.pst-pcf-head{flex:1;min-width:0}.pst-pcf-head h3{font-size:12px;color:#20272B;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-pcf-head h3 i{font-style:normal;font-size:7px;background:#EAF5EF;color:#2F7657;border-radius:999px;padding:2px 6px}.pst-pcf-head p{font-size:9px;color:#7E8A90;margin:3px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-pcf-mail,.pst-pcf-link{color:#3F7F98;text-decoration:none}.pst-pcf-mail{font-size:8px;font-weight:720;border:1px solid #CDE1E8;border-radius:8px;padding:6px 8px;white-space:nowrap}.pst-pcf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;padding-top:11px}.pst-pcf-field{min-width:0}.pst-pcf-field span{display:block;font-size:7px;letter-spacing:.45px;text-transform:uppercase;color:#9AA4A9;font-weight:750;margin-bottom:2px}.pst-pcf-field b{display:block;font-size:9px;color:#4E5B62;font-weight:610;line-height:1.45;overflow-wrap:anywhere}.pst-pcf-empty{padding:25px;text-align:center;color:#879299;font-size:9.5px}@media(max-width:950px){.pst-pcf-wrap{grid-template-columns:1fr}}@media(max-width:600px){.pst-pcf-grid{grid-template-columns:1fr}}';document.head.appendChild(s);}
function contactsCard(){return arr(Array.prototype.slice.call(document.querySelectorAll('.pst-pi-card'))).filter(function(card){var h=card.querySelector('.pst-pi-hd b');return h&&String(h.textContent||'').trim()==='Kontaktet';})[0]||null;}
async function render(){
  if(busy)return;var cardEl=contactsCard();if(!cardEl)return;busy=true;css();
  var body=cardEl.querySelector('.pst-pi-body'),small=cardEl.querySelector('.pst-pi-hd small');if(body)body.innerHTML='<div class="pst-pcf-empty">Duke mbledhur të dhënat e kontakteve të projektit…</div>';
  try{var rows=await loadContacts();if(small)small.textContent=rows.length+' kontakte vetëm nga projekti aktual, të pasuruara me regjistrin global';if(body)body.innerHTML=rows.length?'<div class="pst-pcf-wrap">'+rows.map(card).join('')+'</div>':'<div class="pst-pcf-empty">Nuk ka kontakte të jashtme të lidhura me këtë projekt.</div>';}
  catch(e){console.error('PRISTEEL full project contacts:',e);if(body)body.innerHTML='<div class="pst-pcf-empty">Kontaktet nuk u ngarkuan: '+esc(e&&e.message||e)+'</div>';}
  finally{busy=false;}
}
function relevantClick(target){
  var stat=target&&target.closest?target.closest('.pst-pi-stat'):null;if(stat){var label=stat.querySelector('span');if(String(label&&label.textContent||'').trim()==='Kontakte')return true;}
  var tab=target&&target.closest?target.closest('.pst-pi-tab'):null;return !!(tab&&String(tab.textContent||'').trim()==='Komunikimi');
}
document.addEventListener('click',function(event){if(relevantClick(event.target))setTimeout(render,0);});
window.pstProjectContactsFullRefresh=render;
})();
