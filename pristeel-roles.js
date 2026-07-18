/* ═══════════════════════════════════════════════════════════
   PRISTEEL — ROLET (RBAC)
   Shfaq rolin · fsheh veprimet për viewer · menaxhim për admin
   Instalimi: <script src="pristeel-roles.js"></script>
   ═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

var ROLE_LBL = {
  admin:'Administrator', sales:'Shitje', procurement:'Prokurim',
  finance:'Financa', viewer:'Vetëm shikim'
};
var ROLE_DESC = {
  admin:'Qasje e plotë, menaxhon përdoruesit',
  sales:'Oferta, klientë, fatura dalëse',
  procurement:'BOM, RFQ, furnitorë, oferta hyrëse',
  finance:'Fatura, garanci, kosto, tatime',
  viewer:'Sheh gjithçka, nuk ndryshon asgjë'
};

var css = document.createElement('style');
css.textContent = `
.rl-badge{display:inline-flex;align-items:center;gap:5px;font-size:9.5px;font-weight:700;
  letter-spacing:.6px;text-transform:uppercase;padding:3px 9px;border-radius:20px;
  background:var(--bg3);color:var(--text2);white-space:nowrap}
.rl-badge.admin{background:var(--bronze-bg);color:var(--bronze)}
.rl-badge.viewer{background:var(--bg3);color:var(--text3)}
.rl-lock{opacity:.4;pointer-events:none;filter:grayscale(1)}
.rl-bar{display:flex;align-items:center;gap:9px;padding:9px 14px;background:var(--bg2);
  border:1px solid var(--border);border-radius:9px;margin-bottom:14px;font-size:11.5px;color:var(--text2)}
.rl-bar svg{width:14px;height:14px;stroke:var(--text3);fill:none;stroke-width:2;flex-shrink:0}
.rl-u{display:flex;align-items:center;gap:11px;padding:10px 13px;border:1px solid var(--border);
  border-radius:9px;margin-bottom:7px;background:#fff;transition:all .15s ease}
.rl-u:hover{border-color:var(--border2);box-shadow:var(--sh-1)}
.rl-av{width:32px;height:32px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;
  justify-content:center;font-size:12px;font-weight:700;background:var(--bg2);color:var(--text2)}
.rl-ub{flex:1;min-width:0}
.rl-un{font-size:12.5px;font-weight:620;color:var(--text)}
.rl-ue{font-size:10.5px;color:var(--text3);margin-top:1px}
.rl-sel{flex-shrink:0;font-size:11.5px;padding:5px 9px;border:1px solid var(--border);
  border-radius:7px;background:#fff;color:var(--text);cursor:pointer}
.rl-sel:hover{border-color:var(--border2)}
.rl-note{font-size:11px;color:var(--text3);line-height:1.6;margin-top:12px;
  padding-top:11px;border-top:1px solid var(--border)}
`;
document.head.appendChild(css);

var myRole = null, myEmail = null, allUsers = [];

function jwtPayload(tok){
  try{
    var p = tok.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(decodeURIComponent(escape(atob(p))));
  }catch(e){ return null; }
}

async function loadRole(){
  if(typeof supaFetch !== 'function' || typeof authGetSession !== 'function') return;
  var s = authGetSession();
  if(!s || !s.access_token) return;
  var jp = jwtPayload(s.access_token);
  myEmail = (jp && jp.email) || s.email || '';
  try{
    var r = await supaFetch('user_roles?select=role,full_name,email&limit=1');
    myRole = (r && r[0] && r[0].role) || 'viewer';
  }catch(e){ myRole = 'viewer'; }
  applyRole();
}

function canWrite(){ return myRole && myRole !== 'viewer'; }
function isAdmin(){ return myRole === 'admin'; }

function applyRole(){
  // Badge te topbar
  var tb = document.querySelector('.topbar .flex.gap-8');
  if(tb && !document.getElementById('rl-badge')){
    var b = document.createElement('span');
    b.id = 'rl-badge';
    b.className = 'rl-badge ' + (myRole||'viewer');
    b.textContent = ROLE_LBL[myRole] || myRole || '—';
    b.title = ROLE_DESC[myRole] || '';
    tb.insertBefore(b, tb.firstChild);
  }
  // Footer
  var ft = document.querySelector('.sidebar-footer');
  if(ft && myEmail && ft.innerHTML.indexOf('rl-role-ft') === -1){
    ft.innerHTML += '<br><span id="rl-role-ft" style="font-size:9.5px;letter-spacing:.4px">'
      + (ROLE_LBL[myRole]||'') + '</span>';
  }
  // Viewer: bllokoj veprimet
  if(!canWrite()) lockUI();
}

function lockUI(){
  var sels = [
    '.btn-primary','.btn-success','.btn-danger',
    'button[onclick*="save"]','button[onclick*="Save"]',
    'button[onclick*="add"]','button[onclick*="Add"]',
    'button[onclick*="del"]','button[onclick*="Del"]',
    'button[onclick*="newProject"]','button[onclick*="generateRfqs"]'
  ];
  var n = 0;
  sels.forEach(function(s){
    document.querySelectorAll(s).forEach(function(el){
      if(el.classList.contains('rl-lock')) return;
      if(el.id === 'rl-badge') return;
      el.classList.add('rl-lock');
      el.title = 'Vetëm shikim — nuk ke të drejtë ndryshimi';
      n++;
    });
  });
  // Banner
  var c = document.querySelector('.content');
  if(c && !document.getElementById('rl-bar')){
    var bar = document.createElement('div');
    bar.id = 'rl-bar';
    bar.className = 'rl-bar';
    bar.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/>'
      +'<path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
      +'<span>Llogari <b>vetëm për shikim</b> — mund të shohësh çdo të dhënë, por jo ta ndryshosh.</span>';
    c.insertBefore(bar, c.firstChild);
  }
}

// Rilidh bllokimin kur ndërrohet faqja
function watchPages(){
  if(typeof window.showPage !== 'function' || window.showPage.__rl) return false;
  var orig = window.showPage;
  window.showPage = function(p){
    orig.apply(this, arguments);
    if(myRole && !canWrite()) setTimeout(lockUI, 180);
    if(p === 'settings' && isAdmin()) setTimeout(renderUsers, 250);
  };
  window.showPage.__rl = true;
  return true;
}

// ── PANELI I PËRDORUESVE (admin) ────────────────────────────
function ini(s){
  var p = String(s||'?').trim().split(/\s+/);
  return ((p[0]||'?')[0] + (p[1]?p[1][0]:'')).toUpperCase();
}
function esc(s){ return String(s||'').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

async function renderUsers(){
  if(!isAdmin()) return;
  var pg = document.getElementById('page-settings');
  if(!pg) return;
  var card = document.getElementById('rl-users-card');
  if(!card){
    card = document.createElement('div');
    card.className = 'card';
    card.id = 'rl-users-card';
    card.innerHTML = '<div class="card-title">Përdoruesit dhe rolet</div>'
      +'<div id="rl-users"><div style="font-size:12px;color:var(--text3)">Duke ngarkuar…</div></div>'
      +'<div class="rl-note"><b>Administrator</b> — qasje e plotë, menaxhon rolet<br>'
      +'<b>Shitje / Prokurim / Financa</b> — lexojnë gjithçka, shkruajnë në modulet e tyre<br>'
      +'<b>Vetëm shikim</b> — sheh çdo të dhënë, nuk ndryshon asgjë<br><br>'
      +'Përdoruesit e rinj krijohen te Supabase → Authentication → Users. '
      +'Marrin automatikisht rolin "Vetëm shikim".</div>';
    pg.insertBefore(card, pg.firstChild);
  }
  var el = document.getElementById('rl-users');
  try{
    allUsers = await supaFetch('user_roles?select=user_id,email,role,full_name&order=role.asc,email.asc');
    el.innerHTML = (allUsers||[]).map(function(u){
      var nm = u.full_name || (u.email||'').split('@')[0];
      return '<div class="rl-u">'
        +'<div class="rl-av">'+ini(nm)+'</div>'
        +'<div class="rl-ub"><div class="rl-un">'+esc(nm)+'</div>'
        +'<div class="rl-ue">'+esc(u.email||'')+'</div></div>'
        +'<select class="rl-sel" onchange="pstSetRole(\''+u.user_id+'\',this.value)">'
        + Object.keys(ROLE_LBL).map(function(r){
            return '<option value="'+r+'"'+(u.role===r?' selected':'')+'>'+ROLE_LBL[r]+'</option>';
          }).join('')
        +'</select></div>';
    }).join('') || '<div style="font-size:12px;color:var(--text3)">Asnjë përdorues.</div>';
  }catch(e){
    el.innerHTML = '<div style="font-size:12px;color:var(--red-text)">'+esc(e.message)+'</div>';
  }
}

window.pstSetRole = async function(uid, role){
  try{
    await supaFetch('user_roles?user_id=eq.'+uid, 'PATCH', { role: role, updated_at: new Date().toISOString() });
    if(uid === (jwtPayload((authGetSession()||{}).access_token||'')||{}).sub){
      alert('Roli yt u ndryshua — faqja do të rifreskohet.');
      location.reload();
    }
  }catch(e){ alert('Gabim: '+e.message); }
};

// ── INIT ────────────────────────────────────────────────────
function init(){
  var tries = 0;
  var iv = setInterval(function(){
    watchPages();
    if(typeof authGetSession === 'function' && authGetSession()){
      clearInterval(iv);
      loadRole();
    } else if(++tries > 40) clearInterval(iv);
  }, 400);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 900); });
} else {
  setTimeout(init, 900);
}

})();
