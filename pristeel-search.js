/* ═══════════════════════════════════════════════════════════
   PRISTEEL — KËRKIMI GLOBAL (Cmd+K)
   Modul i pavarur. Nuk prek asnjë rresht të kodit ekzistues.
   Instalimi: <script src="pristeel-search.js"></script> para </body>
   ═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

// ── CSS ─────────────────────────────────────────────────────
var css = document.createElement('style');
css.textContent = `
.gs-bg{position:fixed;inset:0;background:rgba(26,26,25,.28);backdrop-filter:blur(3px);
  z-index:9000;display:none;align-items:flex-start;justify-content:center;padding:80px 20px 20px}
.gs-bg.on{display:flex}
.gs-box{background:#fff;border-radius:14px;width:100%;max-width:640px;box-shadow:0 20px 60px rgba(20,25,30,.28);
  overflow:hidden;animation:gsIn .14s ease}
@keyframes gsIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.gs-box{animation:none}}
.gs-inwrap{display:flex;align-items:center;gap:11px;padding:15px 18px;border-bottom:1px solid var(--border)}
.gs-inwrap svg{width:17px;height:17px;stroke:var(--text3);fill:none;stroke-width:2;flex-shrink:0}
#gs-input{flex:1;border:none;outline:none;font-size:15px;color:var(--text);background:transparent;padding:0}
#gs-input::placeholder{color:var(--text3)}
.gs-esc{font-size:10px;color:var(--text3);border:1px solid var(--border2);border-radius:5px;
  padding:2px 7px;font-weight:600;letter-spacing:.5px;flex-shrink:0}
.gs-body{max-height:min(60vh,480px);overflow-y:auto;padding:6px 0}
.gs-grp{font-size:9.5px;letter-spacing:1.3px;text-transform:uppercase;color:var(--text3);
  font-weight:700;padding:11px 18px 5px}
.gs-r{display:flex;align-items:center;gap:11px;padding:9px 18px;cursor:pointer;transition:background .11s ease}
.gs-r:hover,.gs-r.sel{background:var(--bg2)}
.gs-r.sel{box-shadow:inset 3px 0 0 var(--bronze)}
.gs-ic{width:28px;height:28px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;
  justify-content:center;font-size:12px;font-weight:700;background:var(--bg3);color:var(--text2)}
.gs-tx{flex:1;min-width:0}
.gs-t{font-size:12.5px;font-weight:620;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gs-s{font-size:10.5px;color:var(--text3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gs-v{flex-shrink:0;font-size:11px;font-weight:650;color:var(--text2);text-align:right;white-space:nowrap}
.gs-empty{font-size:12.5px;color:var(--text3);padding:26px 18px;text-align:center;font-style:italic}
.gs-foot{border-top:1px solid var(--border);padding:9px 18px;display:flex;gap:16px;
  font-size:10px;color:var(--text3)}
.gs-foot b{font-weight:600;color:var(--text2)}
.gs-hint{position:fixed;bottom:18px;right:18px;z-index:400;background:#fff;border:1px solid var(--border);
  border-radius:9px;padding:7px 13px;font-size:11px;color:var(--text3);box-shadow:var(--sh-2);
  cursor:pointer;transition:all .15s ease;display:flex;align-items:center;gap:7px}
.gs-hint:hover{border-color:var(--bronze);color:var(--bronze)}
.gs-hint b{font-weight:700;letter-spacing:.5px}
@media(max-width:700px){.gs-hint{display:none}}
`;
document.head.appendChild(css);

// ── HTML ────────────────────────────────────────────────────
var bg = document.createElement('div');
bg.className = 'gs-bg';
bg.id = 'gs-bg';
bg.innerHTML =
  '<div class="gs-box" onclick="event.stopPropagation()">'
   +'<div class="gs-inwrap">'
     +'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>'
     +'<input id="gs-input" type="text" placeholder="Kërko projekte, kontakte, oferta, fatura…" autocomplete="off" spellcheck="false">'
     +'<span class="gs-esc">ESC</span>'
   +'</div>'
   +'<div class="gs-body" id="gs-body">'
     +'<div class="gs-empty">Shkruaj të paktën 2 shkronja…</div>'
   +'</div>'
   +'<div class="gs-foot">'
     +'<span><b>↑↓</b> lëviz</span><span><b>Enter</b> hap</span><span><b>Esc</b> mbyll</span>'
   +'</div>'
  +'</div>';
bg.onclick = function(e){ if(e.target === bg) closeSearch(); };

var hint = document.createElement('div');
hint.className = 'gs-hint';
hint.innerHTML = '<svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Kërko <b>⌘K</b>';
hint.onclick = openSearch;

function mount(){
  if(!document.body) return;
  if(!document.getElementById('gs-bg')) document.body.appendChild(bg);
  if(!document.querySelector('.gs-hint')) document.body.appendChild(hint);
  var inp = document.getElementById('gs-input');
  if(inp && !inp.__bound){
    inp.addEventListener('input', onType);
    inp.addEventListener('keydown', onKey);
    inp.__bound = true;
  }
}

// ── GJENDJA ─────────────────────────────────────────────────
var results = [], selIdx = 0, timer = null;

function openSearch(){
  mount();
  var b = document.getElementById('gs-bg');
  if(!b) return;
  b.classList.add('on');
  var inp = document.getElementById('gs-input');
  if(inp){ inp.value=''; inp.focus(); }
  results=[]; selIdx=0;
  render([], '');
}
function closeSearch(){
  var b = document.getElementById('gs-bg');
  if(b) b.classList.remove('on');
}
window.pstOpenSearch = openSearch;

// ── SHKURTORET ──────────────────────────────────────────────
document.addEventListener('keydown', function(e){
  var b = document.getElementById('gs-bg');
  var isOpen = b && b.classList.contains('on');
  if((e.metaKey||e.ctrlKey) && (e.key==='k'||e.key==='K')){
    e.preventDefault();
    isOpen ? closeSearch() : openSearch();
    return;
  }
  if(e.key==='Escape' && isOpen){ closeSearch(); }
});

function onKey(e){
  if(e.key==='ArrowDown'){ e.preventDefault(); move(1); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); move(-1); }
  else if(e.key==='Enter'){ e.preventDefault(); go(selIdx); }
}
function move(d){
  if(!results.length) return;
  selIdx = Math.max(0, Math.min(results.length-1, selIdx+d));
  var rows = document.querySelectorAll('.gs-r');
  rows.forEach(function(r,i){ r.classList.toggle('sel', i===selIdx); });
  var cur = rows[selIdx];
  if(cur) cur.scrollIntoView({block:'nearest'});
}
function go(i){
  var r = results[i];
  if(!r) return;
  closeSearch();
  setTimeout(function(){ try{ r.action(); }catch(e){ console.error(e); } }, 60);
}

// ── KËRKIMI ─────────────────────────────────────────────────
function onType(){
  clearTimeout(timer);
  var q = (document.getElementById('gs-input').value||'').trim();
  if(q.length < 2){
    results=[]; render([], q);
    return;
  }
  timer = setTimeout(function(){ doSearch(q); }, 220);
}

function esc(s){ return String(s||'').replace(/</g,'&lt;'); }
function fmt(n){ return (parseFloat(n)||0).toLocaleString('de-DE',{maximumFractionDigits:0}); }
function ini(s){
  var p = String(s||'?').trim().split(/\s+/);
  return ((p[0]||'?')[0] + (p[1]?p[1][0]:'')).toUpperCase();
}

async function doSearch(q){
  if(typeof supaFetch !== 'function'){
    render([], q, 'Lidhja me bazën nuk është gati.');
    return;
  }
  var enc = '*' + encodeURIComponent(q) + '*';
  var out = [];

  try{
    var res = await Promise.all([
      supaFetch('projects?or=(name.ilike.'+enc+',client.ilike.'+enc+',ref.ilike.'+enc+',location.ilike.'+enc+')&limit=6').catch(function(){return[];}),
      supaFetch('contacts?or=(company.ilike.'+enc+',person.ilike.'+enc+',email.ilike.'+enc+')&limit=8').catch(function(){return[];}),
      supaFetch('documents_registry?or=(doc_nr.ilike.'+enc+',project.ilike.'+enc+',client.ilike.'+enc+')&limit=6').catch(function(){return[];}),
      supaFetch('invoices_out?or=(invoice_nr.ilike.'+enc+',client.ilike.'+enc+',project.ilike.'+enc+')&limit=5').catch(function(){return[];}),
      supaFetch('invoices_in?or=(supplier.ilike.'+enc+',supplier_invoice_nr.ilike.'+enc+',project.ilike.'+enc+')&limit=5').catch(function(){return[];}),
      supaFetch('offers?supplier.ilike.'+enc+'&limit=5').catch(function(){return[];}),
      supaFetch('tasks?status=eq.hapur&or=(title.ilike.'+enc+',detail.ilike.'+enc+')&limit=5').catch(function(){return[];}),
      supaFetch('partners?or=(name.ilike.'+enc+',country.ilike.'+enc+',city.ilike.'+enc+')&limit=5').catch(function(){return[];})
    ]);

    var projs=res[0]||[], cons=res[1]||[], docs=res[2]||[], iOut=res[3]||[],
        iIn=res[4]||[], offs=res[5]||[], tsks=res[6]||[], parts=res[7]||[];

    projs.forEach(function(p){
      out.push({g:'Projekte', ic:'P', t:p.name||'Pa emër',
        s:(p.client||'')+(p.location?' · '+p.location:''),
        v:p.ref||'',
        action:function(){
          if(typeof openOverview==='function') openOverview(p.id);
          else if(typeof loadProject==='function') loadProject(p.id);
          else showPage('import');
        }});
    });

    cons.forEach(function(c){
      out.push({g:'Kontakte', ic:ini(c.person||c.company), t:c.person||c.company||'',
        s:(c.person?c.company:'')+(c.role?' · '+c.role:'')+(c.email?' · '+c.email:''),
        v:c.kind==='supplier'?'Furnitor':'Klient',
        action:function(){
          showPage('contacts');
          setTimeout(function(){
            var sb=document.getElementById('ct-search');
            if(sb){ sb.value=c.person||c.company||''; if(typeof renderContacts==='function') renderContacts(); }
          }, 350);
        }});
    });

    docs.forEach(function(d){
      out.push({g:'Oferta / Dokumente', ic:'Q', t:d.doc_nr||'',
        s:(d.client||'')+(d.project?' · '+d.project:''),
        v:d.total_eur?fmt(d.total_eur)+' €':'',
        action:function(){
          if(d.project_id && typeof openOverview==='function') openOverview(d.project_id);
          else showPage('oferta');
        }});
    });

    iOut.forEach(function(i){
      out.push({g:'Fatura dalëse', ic:'F', t:i.invoice_nr||'',
        s:(i.client||'')+(i.project?' · '+i.project:'')+(i.paid?' · paguar':' · e hapur'),
        v:fmt(i.gross_amount||i.total_price)+' €',
        action:function(){ showPage('invoices'); }});
    });

    iIn.forEach(function(i){
      out.push({g:'Fatura hyrëse', ic:'H', t:i.supplier||'',
        s:(i.supplier_invoice_nr||'')+(i.project?' · '+i.project:''),
        v:'−'+fmt(i.amount)+' €',
        action:function(){ showPage('invoices'); setTimeout(function(){ if(typeof invSwitchTab==='function') invSwitchTab('in'); },250); }});
    });

    offs.forEach(function(o){
      out.push({g:'Oferta furnitorësh', ic:'O', t:(o.supplier||'').split('(')[0].trim(),
        s:(o.incoterms||'')+(o.delivery_weeks?' · '+o.delivery_weeks+' javë':''),
        v:o.total_eur?fmt(o.total_eur)+' €':(o.price_kg?parseFloat(o.price_kg).toFixed(2)+' €/kg':''),
        action:function(){
          if(o.project_id && typeof openOverview==='function') openOverview(o.project_id);
          else showPage('offers');
        }});
    });

    tsks.forEach(function(t){
      out.push({g:'Detyra', ic:'D', t:(t.title||'').replace('[AUTO] ',''),
        s:t.detail||'', v:t.due_date||'',
        action:function(){ showPage('qendra'); }});
    });

    parts.forEach(function(p){
      out.push({g:'Partnerë', ic:ini(p.name), t:p.name||'',
        s:[p.country,p.city,p.business_type].filter(Boolean).join(' · '),
        v:'', action:function(){ showPage('contacts'); }});
    });

    results = out;
    selIdx = 0;
    render(out, q);

  }catch(e){
    render([], q, 'Gabim: '+e.message);
  }
}

// ── RENDERIMI ───────────────────────────────────────────────
function render(list, q, err){
  var el = document.getElementById('gs-body');
  if(!el) return;

  if(err){ el.innerHTML = '<div class="gs-empty" style="color:var(--red-text)">'+esc(err)+'</div>'; return; }
  if(!q || q.length<2){ el.innerHTML = '<div class="gs-empty">Shkruaj të paktën 2 shkronja…</div>'; return; }
  if(!list.length){ el.innerHTML = '<div class="gs-empty">Asgjë e gjetur për "'+esc(q)+'"</div>'; return; }

  var h='', lastG=null;
  list.forEach(function(r,i){
    if(r.g !== lastG){ h += '<div class="gs-grp">'+r.g+'</div>'; lastG = r.g; }
    h += '<div class="gs-r'+(i===0?' sel':'')+'" data-i="'+i+'">'
       +'<div class="gs-ic">'+esc(r.ic)+'</div>'
       +'<div class="gs-tx"><div class="gs-t">'+esc(r.t)+'</div>'
       +(r.s?'<div class="gs-s">'+esc(r.s)+'</div>':'')+'</div>'
       +(r.v?'<div class="gs-v">'+esc(r.v)+'</div>':'')
       +'</div>';
  });
  el.innerHTML = h;

  el.querySelectorAll('.gs-r').forEach(function(row){
    row.onclick = function(){ go(parseInt(row.getAttribute('data-i'),10)); };
    row.onmouseenter = function(){
      selIdx = parseInt(row.getAttribute('data-i'),10);
      el.querySelectorAll('.gs-r').forEach(function(x,j){ x.classList.toggle('sel', j===selIdx); });
    };
  });
}

// ── INIT ────────────────────────────────────────────────────
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 500); });
} else {
  setTimeout(mount, 500);
}

})();
