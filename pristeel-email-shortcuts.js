/* PRISTEEL Gmail shortcuts: Inbox, Sent dhe Drafts */
(function(){
'use strict';

if(window.__pstEmailShortcutsLoaded)return;
window.__pstEmailShortcutsLoaded=true;

var style=document.createElement('style');
style.id='pst-email-shortcuts-style';
style.textContent=`
#pst-email-shortcuts{margin:8px 0 2px;border:1px solid #E4E7E9;background:#fff;border-radius:11px;padding:8px}
.pst-email-shortcuts-title{font-size:8px;font-weight:760;letter-spacing:.75px;text-transform:uppercase;color:#969CA1;padding:1px 3px 6px}
.pst-email-shortcut{width:100%;border:0;background:transparent;border-radius:8px;padding:7px 8px;display:flex;align-items:center;gap:8px;color:#596067;font-size:10px;font-weight:650;cursor:pointer;text-align:left}
.pst-email-shortcut:hover{background:#EAF2F7;color:#3D6F8E}.pst-email-shortcut svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pst-email-shortcut span{flex:1}.pst-email-shortcut small{font-size:8px;color:#A0A5A9;font-weight:650}
@media(max-width:980px){#pst-email-shortcuts{padding:6px}.pst-email-shortcuts-title,.pst-email-shortcut span,.pst-email-shortcut small{display:none}.pst-email-shortcut{justify-content:center;padding:8px}}
`;
document.head.appendChild(style);

var ICONS={
  inbox:'<svg viewBox="0 0 24 24"><path d="M4 4h16v14H4z"/><path d="M4 13h4l2 3h4l2-3h4"/></svg>',
  sent:'<svg viewBox="0 0 24 24"><path d="m3 11 18-8-7 18-3-7-8-3z"/><path d="m11 14 4-5"/></svg>',
  drafts:'<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h6M8 17h4"/></svg>',
  mail:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>'
};

function gmailUrl(folder){
  var hash=folder==='sent'?'sent':folder==='drafts'?'drafts':'inbox';
  return 'https://mail.google.com/mail/u/0/#'+hash;
}
window.pstOpenGmailFolder=function(folder){
  var w=window.open(gmailUrl(folder),'PRISTEEL_GMAIL');
  if(w)try{w.focus();}catch(e){}
};

function buildSidebar(){
  var sidebar=document.getElementById('pst-v2-sidebar');
  if(!sidebar||document.getElementById('pst-email-shortcuts'))return !!sidebar;
  var anchor=document.getElementById('pst-utilities')||sidebar.querySelector('.pst-v2-search');
  var box=document.createElement('div');
  box.id='pst-email-shortcuts';
  box.innerHTML='<div class="pst-email-shortcuts-title">Email</div>'
    +'<button class="pst-email-shortcut" onclick="pstOpenGmailFolder(\'inbox\')">'+ICONS.inbox+'<span>Inbox</span><small>Gmail</small></button>'
    +'<button class="pst-email-shortcut" onclick="pstOpenGmailFolder(\'sent\')">'+ICONS.sent+'<span>Sent</span></button>'
    +'<button class="pst-email-shortcut" onclick="pstOpenGmailFolder(\'drafts\')">'+ICONS.drafts+'<span>Drafts</span></button>';
  sidebar.insertBefore(box,anchor||sidebar.lastChild);
  return true;
}

function buildDashboardButton(){
  var actions=document.querySelector('#page-home .pst-dash-actions');
  if(!actions||document.getElementById('pst-open-inbox-btn'))return !!actions;
  var btn=document.createElement('button');
  btn.id='pst-open-inbox-btn';
  btn.className='pst-dash-btn';
  btn.innerHTML=ICONS.mail+'Hap Inbox';
  btn.addEventListener('click',function(){window.pstOpenGmailFolder('inbox');});
  actions.insertBefore(btn,actions.firstChild);
  return true;
}

function ensure(){buildSidebar();buildDashboardButton();}
var tries=0,timer=setInterval(function(){ensure();if(++tries>240)clearInterval(timer);},250);
setInterval(ensure,1500);

})();
