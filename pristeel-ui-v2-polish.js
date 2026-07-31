/* PRISTEEL UI V2: pastrim i dashboard-it dhe triage e inbox-it */
(function(){
'use strict';

if(window.__pstUiV2PolishLoaded)return;
window.__pstUiV2PolishLoaded=true;

var INTERNAL_RE=/(^|<|\s)(sales|arianit\.vllahiu|oltian\.vllahiu)@prissteel\.com(>|\s|$)/i;
var SYSTEM_SUBJECT_RE=/(document shared with you|shared a document|dmarc|aggregate report|report domain:|results for search alert|ted notification|mail delivery|delivery status notification|undeliverable|failure notice|single-use code|security alert|automatic reply|automatische antwort|out of office)/i;
var SYSTEM_SENDER_RE=/(no-?reply|mailer-daemon|postmaster|dmarc|notifications?@|accounts?@google|microsoft account team)/i;
var triageTimer=null;
var triageBusy=false;
var wasHome=null;

var style=document.createElement('style');
style.id='pst-ui-v2-polish-style';
style.textContent=`
body.pst-ui-v2.pst-v2-home .topbar{display:none!important}
body.pst-ui-v2.pst-v2-home .content{padding-top:24px!important}
body.pst-ui-v2.pst-v2-home .main{min-height:100vh}
.pst-v2-more{border-top:1px solid #ECEEEF;padding:9px 12px;text-align:center;color:#A65F2E;font-size:9.5px;font-weight:700;cursor:pointer;background:#FCFCFC}
.pst-v2-more:hover{background:#F7EDE5}
.pst-v2-mail-kind{font-size:8px;font-weight:750;text-transform:uppercase;letter-spacing:.35px;color:#3D6F8E;background:#EAF2F7;border-radius:10px;padding:3px 6px;white-space:nowrap}
`;
document.head.appendChild(style);

function esc(v){
  return String(v==null?'':v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function arr(v){return Array.isArray(v)?v:[];}
function senderText(e){return [e&&e.from_name,e&&e.from_email,e&&e.sender,e&&e.sender_email].filter(Boolean).join(' ');}
function isOpportunity(e){
  var sender=senderText(e);
  var subject=String((e&&e.subject)||'');
  return !INTERNAL_RE.test(sender)&&!SYSTEM_SENDER_RE.test(sender)&&!SYSTEM_SUBJECT_RE.test(subject);
}
function who(e){return e.from_name||e.from_email||e.sender||e.sender_email||'Dërgues i panjohur';}
function initials(v){var p=String(v||'?').trim().split(/\s+/);return ((p[0]||'?')[0]+(p[1]?p[1][0]:'')).toUpperCase();}
function dateText(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'';}
function gmailUrl(e){return String((e&&e.gmail_url)||'');}

function setOpportunityKpi(total){
  var value=document.getElementById('pst-kpi-unmatched');
  if(!value)return;
  value.textContent=String(total);
  var card=value.closest('.pst-kpi');
  if(!card)return;
  var label=card.querySelector('.pst-kpi-label');
  var hint=card.querySelector('.pst-kpi-hint');
  if(label)label.textContent='Kërkesa pa projekt';
  if(hint)hint.textContent='Mundësi që duhen klasifikuar';
}

function renderOpportunityInbox(emails){
  var host=document.getElementById('pst-email-list');
  if(!host)return;
  var panel=host.closest('.pst-panel');
  if(panel){
    var title=panel.querySelector('.pst-panel-title');
    var sub=panel.querySelector('.pst-panel-sub');
    if(title)title.textContent='Kërkesa pa projekt';
    if(sub)sub.textContent='Emaila të jashtëm që mund të bëhen projekte';
  }
  var list=arr(emails).filter(isOpportunity).slice(0,6);
  if(!list.length){
    host.innerHTML='<div class="pst-empty">Nuk ka kërkesa të reja pa projekt.</div>';
    return;
  }
  host.innerHTML=list.map(function(e){
    var person=who(e);
    return '<div class="pst-mailrow" data-pst-opportunity="1">'
      +'<div class="pst-mail-avatar">'+esc(initials(person))+'</div>'
      +'<div class="pst-mail-main"><div class="pst-mail-subject">'+esc(e.subject||'(pa subjekt)')+'</div>'
      +'<div class="pst-mail-meta">'+esc(person)+' · '+esc(dateText(e.sent_at))+'</div></div>'
      +'<span class="pst-v2-mail-kind">Kërkesë</span>'
      +'<button class="pst-mail-open" data-url="'+esc(gmailUrl(e))+'">Hap</button></div>';
  }).join('');
  host.querySelectorAll('.pst-mail-open').forEach(function(btn){
    btn.addEventListener('click',function(ev){
      ev.stopPropagation();
      var url=btn.getAttribute('data-url')||'';
      if(typeof window.pstV2OpenMail==='function')window.pstV2OpenMail(url);
      else if(url)window.open(url,'_blank');
    });
  });
}

function cleanPriorityInbox(emails){
  var host=document.getElementById('pst-action-list');
  if(!host)return;
  host.querySelectorAll('.pst-action').forEach(function(row){
    var tag=row.querySelector('.pst-action-tag');
    if(tag&&String(tag.textContent||'').trim().toLowerCase()==='inbox')row.remove();
  });
  var list=arr(emails).filter(isOpportunity).slice(0,3);
  for(var i=list.length-1;i>=0;i--){
    var e=list[i],row=document.createElement('div');
    row.className='pst-action';
    row.style.setProperty('--ac','#3D6F8E');
    row.style.setProperty('--acbg','#EAF2F7');
    row.innerHTML='<span class="pst-action-dot"></span><div class="pst-action-main">'
      +'<div class="pst-action-title">'+esc(e.subject||'(pa subjekt)')+'</div>'
      +'<div class="pst-action-meta">'+esc(who(e))+' · kërkesë pa projekt</div></div>'
      +'<span class="pst-action-tag">Inbox</span>';
    (function(url){
      row.addEventListener('click',function(){
        if(typeof window.pstV2OpenMail==='function')window.pstV2OpenMail(url);
        else if(url)window.open(url,'_blank');
      });
    })(gmailUrl(e));
    host.insertBefore(row,host.firstChild);
  }
}

function limitRows(selector,limit,label,page){
  var rows=Array.prototype.slice.call(document.querySelectorAll(selector));
  var host=rows.length?rows[0].parentElement:null;
  if(!host)return;
  host.querySelectorAll('.pst-v2-more').forEach(function(x){x.remove();});
  rows.forEach(function(row,idx){row.style.display=idx<limit?'':'none';});
  if(rows.length>limit){
    var more=document.createElement('div');
    more.className='pst-v2-more';
    more.textContent='+'+(rows.length-limit)+' '+label;
    more.addEventListener('click',function(){if(typeof window.pstV2Go==='function')window.pstV2Go(page);});
    host.appendChild(more);
  }
}

function hideDuplicateDashboardSearch(){
  document.querySelectorAll('#page-home .pst-dash-actions .pst-dash-btn').forEach(function(btn){
    if(String(btn.textContent||'').trim()==='Kërko')btn.style.display='none';
  });
}

function hideLegacyFloatingSearch(){
  document.querySelectorAll('body *').forEach(function(el){
    if(el.closest('#pst-v2-sidebar')||el.closest('#cmdk-bg')||el.closest('.pst-modal-bg'))return;
    var text=String(el.textContent||'').trim();
    if(!/^Kërko(\s|$)/i.test(text))return;
    var cs=window.getComputedStyle(el),r=el.getBoundingClientRect();
    if(cs.position==='fixed'&&r.bottom>window.innerHeight-75&&r.width>35&&r.width<270&&r.height>20&&r.height<90){
      el.style.setProperty('display','none','important');
      el.setAttribute('data-pst-legacy-search-hidden','1');
    }
  });
}

async function refreshTriage(){
  if(triageBusy||!document.body.classList.contains('pst-v2-home'))return;
  triageBusy=true;
  hideDuplicateDashboardSearch();
  hideLegacyFloatingSearch();
  limitRows('#pst-project-list .pst-project',5,'projekte të tjera','import');
  limitRows('#pst-deadline-list .pst-deadline-row',5,'afate të tjera','import');
  if(typeof window.supaFetch!=='function'){triageBusy=false;return;}
  try{
    var emails=await window.supaFetch('project_emails?project_id=is.null&select=*&order=sent_at.desc&limit=120');
    emails=arr(emails);
    setOpportunityKpi(emails.filter(isOpportunity).length);
    renderOpportunityInbox(emails);
    cleanPriorityInbox(emails);
    var badge=document.getElementById('pst-nav-inbox-count');
    if(badge){badge.textContent=String(emails.length);badge.style.display=emails.length?'inline-flex':'none';}
  }catch(err){
    console.error('PRISTEEL inbox triage:',err);
  }finally{
    triageBusy=false;
  }
}

function scheduleTriage(delay){
  clearTimeout(triageTimer);
  triageTimer=setTimeout(refreshTriage,delay||120);
}

function syncHomeState(){
  var home=document.getElementById('page-home');
  var active=!!(home&&home.classList.contains('active'));
  document.body.classList.toggle('pst-v2-home',active);
  if(active&&wasHome!==true)scheduleTriage(150);
  wasHome=active;
}

function wrapDashboard(){
  if(typeof window.pstV2RenderDashboard!=='function')return false;
  if(window.pstV2RenderDashboard.__pstPolish)return true;
  var original=window.pstV2RenderDashboard;
  window.pstV2RenderDashboard=function(){
    var result=original.apply(this,arguments);
    Promise.resolve(result).finally(function(){scheduleTriage(80);});
    return result;
  };
  window.pstV2RenderDashboard.__pstPolish=true;
  return true;
}

function start(){
  var home=document.getElementById('page-home');
  if(!home||!wrapDashboard())return false;
  syncHomeState();
  var observer=new MutationObserver(syncHomeState);
  observer.observe(home,{attributes:true,attributeFilter:['class']});
  scheduleTriage(450);
  return true;
}

var tries=0;
var timer=setInterval(function(){
  if(start()||++tries>160)clearInterval(timer);
},250);

})();
