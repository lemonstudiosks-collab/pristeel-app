/* PRISTEEL RFQ buyer request context v1
 * Keeps RFQ context limited to the original external buyer request.
 * Does not use project.notes/thread summaries and does not change supplier routing.
 */
(function(){
'use strict';
if(window.__pstRfqBuyerRequestContextV1)return;
window.__pstRfqBuyerRequestContextV1=true;

var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com'];
function A(v){return Array.isArray(v)?v:[];}
function email(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function field(m){return String(m&&(m.body_text||m.body||m.text||m.snippet)||'');}
function when(m){var t=new Date((m&&m.sent_at)||(m&&m.created_at)||0).getTime();return isFinite(t)?t:0;}
function externalIncoming(m){
  if(!m)return false;
  var dir=String(m.direction||'').toLowerCase();
  if(dir==='outgoing'||dir==='sent')return false;
  var from=email(m.from_email||m.sender||m.from||'');
  if(from){
    if(INTERNAL.indexOf(from)>-1)return false;
    if(/^(no-?reply|mailer-daemon|postmaster|dmarc|calendar-notification)@/i.test(from))return false;
    return true;
  }
  return dir==='incoming'||dir==='inbound'||dir==='received';
}
function clean(v){
  var t=String(v||'')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/\r/g,'')
    .replace(/\u00a0/g,' ');

  // Stop before quoted/forwarded history.
  t=t.split(/\n\s*[-_]{2,}\s*(?:Original Message|Forwarded message|Ursprüngliche Nachricht|Poruka prosleđena|Prosleđena poruka)/i)[0];
  t=t.split(/\n\s*(?:On|Am|Dana|Më datën|Me daten).{0,220}(?:wrote|schrieb|napisao|je napisao|shkroi):/i)[0];
  t=t.split(/\n\s*(?:From|Von|Od|Nga):\s*[^\n]+\n\s*(?:Sent|Gesendet|Poslato|Dërguar|Derguar|Date|Datum):/i)[0];

  var lines=t.split('\n').map(function(x){return x.replace(/^\s*>+\s?/,'').replace(/[ \t]+/g,' ').trim();});
  while(lines.length&&!lines[0])lines.shift();
  while(lines.length&&!lines[lines.length-1])lines.pop();

  // Salutation is not project information when embedded in our RFQ.
  if(lines.length&&/^(poštovani|postovani|dear|guten tag|hallo|hello|pershendetje|përshëndetje)\b.*[,!]?$/.test(lines[0].toLowerCase()))lines.shift();
  while(lines.length&&!lines[0])lines.shift();

  // Remove the sender signature, but only when there is meaningful request text above it.
  var close=-1;
  for(var i=0;i<lines.length;i++){
    if(/^(s poštovanjem|s postovanjem|srdačan pozdrav|srdacan pozdrav|pozdrav|mit freundlichen grüßen|mit freundlichen gruessen|kind regards|best regards|regards|me respekt|faleminderit)\s*[,!.]?$/.test(lines[i].toLowerCase())){close=i;break;}
  }
  if(close>0&&lines.slice(0,close).join(' ').trim().length>=30)lines=lines.slice(0,close);

  // Remove mail header lines if a provider included them in the body payload.
  lines=lines.filter(function(x){return !/^\s*(from|von|od|nga|sent|gesendet|poslato|dërguar|derguar|to|an|za|për|per|subject|betreff|predmet|subjekti):/i.test(x);});
  return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,4800);
}
function buyerRequest(d){
  var mails=A(d&&d.emails).filter(externalIncoming).sort(function(a,b){return when(a)-when(b);});
  for(var i=0;i<mails.length;i++){
    var txt=clean(field(mails[i]));
    if(txt.length>=12)return txt;
  }
  return '';
}
function apply(){
  var box=document.getElementById('pst-pf2-rfq-draft');
  var ta=box&&box.querySelector('[data-prfq-context]');
  if(!ta||ta.getAttribute('data-pst-buyer-request-cleaned')==='1')return false;
  var d=window.__pstIntegrityLastData||null;
  var txt=buyerRequest(d);
  ta.setAttribute('data-pst-buyer-request-cleaned','1');
  ta.value=txt;
  ta.dispatchEvent(new Event('input',{bubbles:true}));
  var note=box.querySelector('.prfq-note');
  if(note)note.textContent='Vetem kerkesa origjinale hyrese e bleresit. Thread summary, pergjigjet tona dhe quoted replies nuk perfshihen. Mund ta redaktosh para hapjes ne Gmail.';
  return true;
}
function schedule(){[20,180,500,1100,1800].forEach(function(ms){setTimeout(apply,ms);});}
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="procurement"],[data-prfq-open]');
  if(t)schedule();
},true);
document.addEventListener('pst:bom-saved',schedule,false);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.PSTRfqBuyerRequestContextV1={apply:apply,buyerRequest:buyerRequest,clean:clean,_test:{externalIncoming:externalIncoming}};
})();
