/* PRISTEEL RFQ buyer request context v1
 * Keeps RFQ context limited to the original external buyer/investor request.
 * Prefers the forwarded original request when the buyer only wrote a forwarding wrapper.
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
function rfqData(){var R=window.PSTProjectFirstRfqDraftV1;return (R&&R._state&&R._state.data)||window.__pstIntegrityLastData||null;}
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
function normalize(v){
  return String(v||'')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/p\s*>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/\r/g,'')
    .replace(/\u00a0/g,' ')
    .replace(/[ \t]+\n/g,'\n');
}
function forwardedSection(t){
  var re=/(?:^|\n)\s*(?:[-_]{2,}\s*)?(?:Begin forwarded message:?|Forwarded message|Original Message|Ursprüngliche Nachricht|Urspruengliche Nachricht|Prosleđena poruka|Prosledjena poruka|Poruka prosleđena|Poruka prosledjena|Прослеђена порука)(?:\s*[-_]{2,})?\s*(?=\n|$)/gi;
  var m,last=null;
  while((m=re.exec(t))!==null){last={index:m.index,end:re.lastIndex};if(re.lastIndex===m.index)re.lastIndex++;}
  if(!last)return null;
  return{wrapper:t.slice(0,last.index),body:t.slice(last.end)};
}
function forwardingWrapper(t){
  return /\b(prosledjujem|prosleđujem|prosledim|prosljedujem|prosljeđujem|forward(?:ing|ed)?|weiterleit(?:e|en|ung)?|mejl\s+od\s+investitora|mail\s+from\s+the\s+investor)\b/i.test(String(t||''));
}
function stripHeaders(lines){
  var out=[],started=false;
  for(var i=0;i<lines.length;i++){
    var x=lines[i];
    if(!started&&(!x||/^\s*(from|von|od|nga|sent|gesendet|poslato|dërguar|derguar|date|datum|to|an|za|për|per|cc|subject|betreff|predmet|subjekti):/i.test(x)))continue;
    started=true;out.push(x);
  }
  return out;
}
function cleanSegment(v){
  var t=normalize(v);
  t=t.split(/\n\s*(?:On|Am|Dana|Më datën|Me daten).{0,220}(?:wrote|schrieb|napisao|je napisao|shkroi):/i)[0];
  var lines=t.split('\n').map(function(x){return x.replace(/^\s*>+\s?/,'').replace(/[ \t]+/g,' ').trim();});
  lines=stripHeaders(lines);
  while(lines.length&&!lines[0])lines.shift();
  while(lines.length&&!lines[lines.length-1])lines.pop();
  if(lines.length&&/^(poštovani|postovani|dear|guten tag|hallo|hello|pershendetje|përshëndetje)\b.*[,!]?$/.test(lines[0].toLowerCase()))lines.shift();
  while(lines.length&&!lines[0])lines.shift();
  var close=-1;
  for(var i=0;i<lines.length;i++){
    if(/^(s poštovanjem|s postovanjem|srdačan pozdrav|srdacan pozdrav|pozdrav|mit freundlichen grüßen|mit freundlichen gruessen|kind regards|best regards|regards|me respekt|faleminderit)\s*[,!.]?$/.test(lines[i].toLowerCase())){close=i;break;}
  }
  if(close>0&&lines.slice(0,close).join(' ').trim().length>=20)lines=lines.slice(0,close);
  lines=lines.filter(function(x){return !/^\s*(from|von|od|nga|sent|gesendet|poslato|dërguar|derguar|date|datum|to|an|za|për|per|cc|subject|betreff|predmet|subjekti):/i.test(x);});
  return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,4800);
}
function clean(v){
  var t=normalize(v),f=forwardedSection(t);
  if(f&&forwardingWrapper(f.wrapper)){
    var inner=f.body,deep=forwardedSection(inner),guard=0;
    while(deep&&forwardingWrapper(deep.wrapper)&&guard++<4){inner=deep.body;deep=forwardedSection(inner);}
    var actual=cleanSegment(inner);
    if(actual.length>=12)return actual;
  }
  if(f)t=f.wrapper;
  return cleanSegment(t);
}
function buyerRequest(d){
  var mails=A(d&&d.emails).filter(externalIncoming).sort(function(a,b){return when(a)-when(b);});
  for(var i=0;i<mails.length;i++){
    var txt=clean(field(mails[i]));
    if(txt.length>=12)return txt;
  }
  return '';
}
function textarea(){var box=document.getElementById('pst-pf2-rfq-draft');return box&&box.querySelector('[data-prfq-context]');}
function userEdited(ta){return !!(ta&&ta.getAttribute('data-pst-buyer-user-edited')==='1');}
function safeContext(){
  var ta=textarea();
  if(userEdited(ta))return String(ta.value||'').trim().slice(0,4800);
  return buyerRequest(rfqData());
}
function syncState(txt){var R=window.PSTProjectFirstRfqDraftV1;if(R&&R._state)R._state.buyerContext=String(txt||'');}
function apply(force){
  var box=document.getElementById('pst-pf2-rfq-draft'),ta=box&&box.querySelector('[data-prfq-context]');
  if(!ta)return false;
  if(userEdited(ta)&&!force)return false;
  var txt=buyerRequest(rfqData());
  if(!txt)return false;
  if(!force&&ta.getAttribute('data-pst-buyer-request-cleaned')==='3'&&String(ta.value||'').trim()===txt){syncState(txt);return true;}
  ta.setAttribute('data-pst-buyer-request-cleaned','3');
  ta.value=txt;
  syncState(txt);
  ta.dispatchEvent(new Event('input',{bubbles:true}));
  var note=box.querySelector('.prfq-note');
  if(note)note.textContent='Vetem kerkesa origjinale e bleresit/investitorit. Nese emaili eshte forward, merret kerkesa brenda forwarded message, jo fjalia percjellese. Thread summary dhe pergjigjet tona nuk perfshihen.';
  return true;
}
function schedule(){[0,80,220,500,1000,1800,3000].forEach(function(ms){setTimeout(function(){apply(false);},ms);});}
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="procurement"],[data-prfq-open],#pst-pf2-rfq-draft [data-prfq-refresh]');
  if(t)schedule();
},true);
document.addEventListener('input',function(e){
  var ta=e.target&&e.target.matches&&e.target.matches('#pst-pf2-rfq-draft [data-prfq-context]')?e.target:null;
  if(!ta)return;
  if(e.isTrusted){ta.setAttribute('data-pst-buyer-user-edited','1');syncState(String(ta.value||'').trim().slice(0,4800));}
},false);
document.addEventListener('pst:bom-saved',schedule,false);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.PSTRfqBuyerRequestContextV1={apply:apply,safeContext:safeContext,buyerRequest:buyerRequest,clean:clean,_test:{externalIncoming:externalIncoming,forwardedSection:forwardedSection,forwardingWrapper:forwardingWrapper,cleanSegment:cleanSegment}};
})();
