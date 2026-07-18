/* ═══════════════════════════════════════════════════════════
   PRISTEEL — GOOGLE DRIVE
   Dosje automatike për projekt · ngarkim file-sh · listim
   Modul i pavarur. Instalimi: <script src="pristeel-drive.js"></script>
   ═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

var ROOT_FOLDER_NAME = 'PRISTEEL — Projektet';
var SCOPE = 'https://www.googleapis.com/auth/drive';

// ── CSS ─────────────────────────────────────────────────────
var css = document.createElement('style');
css.textContent = `
.dv-box{background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:12px}
.dv-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap}
.dv-title{font-size:12px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:var(--text2)}
.dv-drop{border:1.5px dashed var(--border2);border-radius:9px;padding:18px 14px;text-align:center;
  cursor:pointer;background:var(--bg2);transition:all .16s ease}
.dv-drop:hover,.dv-drop.over{border-color:var(--bronze);background:var(--bronze-bg)}
.dv-drop input{display:none}
.dv-drop svg{width:24px;height:24px;stroke:var(--text3);fill:none;stroke-width:1.6;display:block;margin:0 auto 7px}
.dv-drop:hover svg{stroke:var(--bronze)}
.dv-dt{font-size:12.5px;font-weight:620;color:var(--text)}
.dv-ds{font-size:10.5px;color:var(--text3);margin-top:3px}
.dv-f{display:flex;align-items:center;gap:10px;padding:8px 11px;border:1px solid var(--border);
  border-radius:8px;margin-bottom:5px;background:#fff;transition:all .15s ease}
.dv-f:hover{border-color:var(--border2);box-shadow:var(--sh-1)}
.dv-fi{width:26px;height:26px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;
  justify-content:center;font-size:10px;font-weight:700;background:var(--bg3);color:var(--text2)}
.dv-fb{flex:1;min-width:0}
.dv-fn{font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dv-fm{font-size:10px;color:var(--text3);margin-top:1px}
.dv-fa{flex-shrink:0;font-size:10.5px;color:var(--text3);cursor:pointer;padding:3px 9px;
  border-radius:5px;border:1px solid transparent;transition:all .14s ease;text-decoration:none}
.dv-f:hover .dv-fa{color:var(--bronze);border-color:var(--border2)}
.dv-fa:hover{background:var(--bronze);color:#fff!important;border-color:var(--bronze)}
.dv-empty{font-size:11.5px;color:var(--text3);font-style:italic;padding:10px 2px}
.dv-prog{height:3px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-top:8px;display:none}
.dv-prog.on{display:block}
.dv-prog-f{height:3px;background:var(--bronze);border-radius:2px;transition:width .3s ease;width:0%}
.dv-st{font-size:10.5px;color:var(--text3);margin-top:6px;min-height:13px}
`;
document.head.appendChild(css);

// ── OAUTH ───────────────────────────────────────────────────
var _tok = null, _tokExp = 0;

function gKeys(){
  return {
    cid: localStorage.getItem('pristeel_gclient') || '',
    key: localStorage.getItem('pristeel_gapikey') || ''
  };
}

function getToken(cb, err){
  if(_tok && Date.now() < _tokExp){ cb(_tok); return; }
  var k = gKeys();
  if(!k.cid){
    if(err) err('Mungon Google Client ID — Cilësimet.');
    return;
  }
  if(typeof google === 'undefined' || !google.accounts){
    if(err) err('Google Identity nuk u ngarkua.');
    return;
  }
  try{
    var tc = google.accounts.oauth2.initTokenClient({
      client_id: k.cid,
      scope: SCOPE,
      callback: function(r){
        if(r && r.access_token){
          _tok = r.access_token;
          _tokExp = Date.now() + ((r.expires_in||3600)-60)*1000;
          cb(_tok);
        } else if(err) err('Autorizimi dështoi.');
      }
    });
    tc.requestAccessToken();
  }catch(e){ if(err) err(e.message); }
}

function drive(path, opts){
  opts = opts || {};
  return new Promise(function(res, rej){
    getToken(function(tok){
      fetch('https://www.googleapis.com/drive/v3'+path, {
        method: opts.method || 'GET',
        headers: Object.assign({ Authorization:'Bearer '+tok }, opts.headers || {}),
        body: opts.body
      }).then(function(r){
        return r.text().then(function(t){
          if(!r.ok) rej(new Error('Drive '+r.status+': '+t.slice(0,200)));
          else res(t ? JSON.parse(t) : {});
        });
      }).catch(rej);
    }, rej);
  });
}

// ── DOSJET ──────────────────────────────────────────────────
async function findOrCreateFolder(name, parentId){
  var q = "name='"+name.replace(/'/g,"\\'")+"' and mimeType='application/vnd.google-apps.folder' and trashed=false";
  if(parentId) q += " and '"+parentId+"' in parents";
  var r = await drive('/files?q='+encodeURIComponent(q)+'&fields=files(id,name,webViewLink)&pageSize=1');
  if(r.files && r.files.length) return r.files[0];
  var body = { name:name, mimeType:'application/vnd.google-apps.folder' };
  if(parentId) body.parents = [parentId];
  return await drive('/files?fields=id,name,webViewLink', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
}

async function ensureProjectFolder(proj){
  if(proj.drive_folder_id){
    return { id: proj.drive_folder_id, webViewLink: proj.drive_folder_url };
  }
  var root = await findOrCreateFolder(ROOT_FOLDER_NAME, null);
  var safe = (proj.name||'Projekt').replace(/[\\/:*?"<>|]/g,'-').slice(0,90);
  var folder = await findOrCreateFolder(safe, root.id);
  var url = folder.webViewLink || ('https://drive.google.com/drive/folders/'+folder.id);
  if(typeof supaFetch === 'function' && proj.id){
    supaFetch('projects?id=eq.'+proj.id, 'PATCH', {
      drive_folder_id: folder.id, drive_folder_url: url
    }).catch(function(){});
  }
  return { id: folder.id, webViewLink: url };
}

// ── NGARKIMI ────────────────────────────────────────────────
function uploadFile(file, folderId, onProgress){
  return new Promise(function(res, rej){
    getToken(function(tok){
      var meta = { name: file.name, parents: [folderId] };
      var boundary = '-------pst'+Date.now();
      var reader = new FileReader();
      reader.onload = function(){
        var b64 = reader.result.split(',')[1];
        var body =
          '--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'
          + JSON.stringify(meta) + '\r\n'
          + '--'+boundary+'\r\nContent-Type: '+(file.type||'application/octet-stream')
          + '\r\nContent-Transfer-Encoding: base64\r\n\r\n' + b64 + '\r\n'
          + '--'+boundary+'--';
        var xhr = new XMLHttpRequest();
        xhr.open('POST','https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size,mimeType');
        xhr.setRequestHeader('Authorization','Bearer '+tok);
        xhr.setRequestHeader('Content-Type','multipart/related; boundary='+boundary);
        xhr.upload.onprogress = function(e){
          if(e.lengthComputable && onProgress) onProgress(Math.round(e.loaded/e.total*100));
        };
        xhr.onload = function(){
          if(xhr.status>=200 && xhr.status<300){
            try{ res(JSON.parse(xhr.responseText)); }catch(e){ rej(e); }
          } else rej(new Error('Upload '+xhr.status+': '+xhr.responseText.slice(0,200)));
        };
        xhr.onerror = function(){ rej(new Error('Rrjeti dështoi')); };
        xhr.send(body);
      };
      reader.onerror = function(){ rej(new Error('Leximi i file-it dështoi')); };
      reader.readAsDataURL(file);
    }, rej);
  });
}

async function listFolder(folderId){
  var q = "'"+folderId+"' in parents and trashed=false";
  var r = await drive('/files?q='+encodeURIComponent(q)
    +'&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=100');
  return r.files || [];
}

// ── UI ──────────────────────────────────────────────────────
function ext(name){
  var m = String(name||'').match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase().slice(0,4) : '?';
}
function sz(b){
  b = parseInt(b||0,10);
  if(!b) return '';
  if(b < 1024) return b+' B';
  if(b < 1048576) return Math.round(b/1024)+' KB';
  return (b/1048576).toFixed(1)+' MB';
}
function esc(s){ return String(s||'').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

window.pstDriveSection = function(proj){
  var pid = proj.id;
  return '<div class="dv-box" id="dv-'+pid+'">'
    +'<div class="dv-hd">'
      +'<span class="dv-title">Google Drive</span>'
      +'<span style="display:flex;gap:6px">'
        +'<button class="btn btn-sm" onclick="pstDriveOpen(\''+pid+'\')">Hap dosjen</button>'
        +'<button class="btn btn-sm" onclick="pstDriveRefresh(\''+pid+'\')">Rifresko</button>'
      +'</span>'
    +'</div>'
    +'<div class="dv-drop" id="dvdrop-'+pid+'" onclick="document.getElementById(\'dvin-'+pid+'\').click()">'
      +'<input type="file" id="dvin-'+pid+'" multiple onchange="pstDriveUpload(\''+pid+'\',this.files)">'
      +'<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
      +'<div class="dv-dt">Ngarko dokumente</div>'
      +'<div class="dv-ds">Tërhiq ose kliko · ruhen në dosjen e projektit</div>'
    +'</div>'
    +'<div class="dv-prog" id="dvprog-'+pid+'"><div class="dv-prog-f" id="dvprogf-'+pid+'"></div></div>'
    +'<div class="dv-st" id="dvst-'+pid+'"></div>'
    +'<div id="dvlist-'+pid+'" style="margin-top:10px"><div class="dv-empty">Kliko "Rifresko" për të parë dokumentet.</div></div>'
  +'</div>';
};

function st(pid, msg, col){
  var e = document.getElementById('dvst-'+pid);
  if(e){ e.textContent = msg||''; e.style.color = col || 'var(--text3)'; }
}

async function getProj(pid){
  if(typeof supaFetch !== 'function') throw new Error('supaFetch mungon');
  var r = await supaFetch('projects?id=eq.'+pid+'&select=id,name,drive_folder_id,drive_folder_url');
  if(!r || !r.length) throw new Error('Projekti nuk u gjet');
  return r[0];
}

window.pstDriveOpen = async function(pid){
  try{
    st(pid,'Duke hapur dosjen…');
    var p = await getProj(pid);
    var f = await ensureProjectFolder(p);
    st(pid,'');
    window.open(f.webViewLink || ('https://drive.google.com/drive/folders/'+f.id), '_blank');
  }catch(e){ st(pid, e.message, 'var(--red-text)'); }
};

window.pstDriveRefresh = async function(pid){
  var el = document.getElementById('dvlist-'+pid);
  if(el) el.innerHTML = '<div class="dv-empty">Duke ngarkuar…</div>';
  try{
    var p = await getProj(pid);
    var f = await ensureProjectFolder(p);
    var files = await listFolder(f.id);
    if(!el) return;
    el.innerHTML = files.length
      ? files.map(function(x){
          var d = x.modifiedTime ? new Date(x.modifiedTime).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
          return '<div class="dv-f">'
            +'<div class="dv-fi">'+ext(x.name)+'</div>'
            +'<div class="dv-fb"><div class="dv-fn">'+esc(x.name)+'</div>'
            +'<div class="dv-fm">'+[sz(x.size), d].filter(Boolean).join(' · ')+'</div></div>'
            +'<a class="dv-fa" href="'+x.webViewLink+'" target="_blank">Hap →</a>'
          +'</div>';
        }).join('')
      : '<div class="dv-empty">Dosja është bosh.</div>';
    st(pid,'');
  }catch(e){
    if(el) el.innerHTML = '<div class="dv-empty" style="color:var(--red-text)">'+esc(e.message)+'</div>';
  }
};

window.pstDriveUpload = async function(pid, files){
  if(!files || !files.length) return;
  var pr = document.getElementById('dvprog-'+pid);
  var pf = document.getElementById('dvprogf-'+pid);
  try{
    st(pid,'Duke përgatitur dosjen…');
    var p = await getProj(pid);
    var f = await ensureProjectFolder(p);
    if(pr) pr.classList.add('on');
    for(var i=0;i<files.length;i++){
      st(pid,'Duke ngarkuar '+(i+1)+'/'+files.length+': '+files[i].name);
      await uploadFile(files[i], f.id, function(pct){ if(pf) pf.style.width = pct+'%'; });
      if(pf) pf.style.width = '100%';
    }
    if(pr) pr.classList.remove('on');
    if(pf) pf.style.width = '0%';
    st(pid, files.length+' file u ngarkuan.', 'var(--green-text)');
    pstDriveRefresh(pid);
    var inp = document.getElementById('dvin-'+pid);
    if(inp) inp.value = '';
  }catch(e){
    if(pr) pr.classList.remove('on');
    st(pid, e.message, 'var(--red-text)');
  }
};

// ── INTEGRIMI NË PASQYRËN E PROJEKTIT ───────────────────────
function injectIntoOverview(){
  if(typeof window.renderOverviewModal !== 'function') return false;
  if(window.renderOverviewModal.__dv) return true;
  var orig = window.renderOverviewModal;
  window.renderOverviewModal = function(id, p){
    orig.apply(this, arguments);
    try{
      var body = document.getElementById('ov-body');
      if(!body || document.getElementById('dv-'+id)) return;
      var secs = body.querySelectorAll('.ov-sec');
      var host = document.createElement('div');
      host.innerHTML = window.pstDriveSection({id:id, name:(p&&p.name)||''});
      if(secs.length >= 2) secs[1].parentNode.insertBefore(host.firstChild, secs[1]);
      else body.appendChild(host.firstChild);
      // drag & drop
      var dz = document.getElementById('dvdrop-'+id);
      if(dz){
        dz.addEventListener('dragover', function(e){ e.preventDefault(); dz.classList.add('over'); });
        dz.addEventListener('dragleave', function(){ dz.classList.remove('over'); });
        dz.addEventListener('drop', function(e){
          e.preventDefault(); dz.classList.remove('over');
          if(e.dataTransfer.files.length) window.pstDriveUpload(id, e.dataTransfer.files);
        });
      }
    }catch(e){ console.error('drive inject', e); }
  };
  window.renderOverviewModal.__dv = true;
  return true;
}

// ── INIT ────────────────────────────────────────────────────
function init(){
  var tries = 0;
  var iv = setInterval(function(){
    if(injectIntoOverview() || ++tries > 25) clearInterval(iv);
  }, 400);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 700); });
} else {
  setTimeout(init, 700);
}

})();
