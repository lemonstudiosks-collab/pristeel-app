/* ═══════════════════════════════════════════════════════════
   PRISTEEL — EDITORI I OFERTAVE
   Shto/redakto oferta me dorë · pozicione të pakufizuara ·
   furnitorë të rinj direkt nga forma · negocim me rabat
   Instalimi: <script src="pristeel-offer-editor.js"></script>
   ═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

var css = document.createElement('style');
css.textContent = `
.oe-bg{position:fixed;inset:0;background:rgba(26,26,25,.34);z-index:9200;display:none;
  align-items:flex-start;justify-content:center;padding:28px 18px;overflow-y:auto}
.oe-bg.on{display:flex}
.oe-box{background:#fff;border-radius:13px;max-width:1080px;width:100%;
  box-shadow:0 20px 60px rgba(20,25,30,.3);margin-bottom:40px}
.oe-hd{padding:16px 22px;border-bottom:1px solid var(--border);display:flex;
  justify-content:space-between;align-items:center;position:sticky;top:0;background:#fff;
  border-radius:13px 13px 0 0;z-index:5}
.oe-ht{font-size:15px;font-weight:650}
.oe-hs{font-size:11px;color:var(--text3);margin-top:2px}
.oe-x{cursor:pointer;color:var(--text3);font-size:19px;line-height:1;padding:2px 7px}
.oe-x:hover{color:var(--text)}
.oe-bd{padding:18px 22px}
.oe-sec{font-size:9.5px;letter-spacing:1.3px;text-transform:uppercase;color:var(--text3);
  font-weight:700;margin:20px 0 9px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.oe-sec:first-child{margin-top:0}
.oe-g{display:grid;gap:11px}
.oe-g3{grid-template-columns:repeat(3,1fr)}
.oe-g4{grid-template-columns:repeat(4,1fr)}
.oe-g2{grid-template-columns:1fr 1fr}
@media(max-width:820px){.oe-g3,.oe-g4,.oe-g2{grid-template-columns:1fr 1fr}}
.oe-f label{display:block;font-size:10px;letter-spacing:.5px;text-transform:uppercase;
  color:var(--text3);font-weight:600;margin-bottom:4px}
.oe-f input,.oe-f select,.oe-f textarea{width:100%;padding:7px 10px;border:1px solid var(--border);
  border-radius:7px;font-size:12.5px;color:var(--text);background:#fff;font-family:inherit}
.oe-f input:focus,.oe-f select:focus,.oe-f textarea:focus{outline:none;border-color:var(--bronze)}
.oe-f textarea{min-height:56px;resize:vertical}
.oe-hint{font-size:10px;color:var(--text3);margin-top:3px}
.oe-tbl{width:100%;border-collapse:collapse;font-size:12px}
.oe-tbl th{text-align:left;padding:7px 8px;font-size:9.5px;letter-spacing:.7px;text-transform:uppercase;
  color:var(--text3);font-weight:700;border-bottom:1px solid var(--border);white-space:nowrap}
.oe-tbl td{padding:4px 5px;border-bottom:1px solid var(--border)}
.oe-tbl input,.oe-tbl select{width:100%;padding:5px 7px;border:1px solid transparent;
  border-radius:5px;font-size:12px;background:transparent;color:var(--text);font-family:inherit}
.oe-tbl input:hover,.oe-tbl select:hover{border-color:var(--border)}
.oe-tbl input:focus,.oe-tbl select:focus{outline:none;border-color:var(--bronze);background:#fff}
.oe-tbl input.num{text-align:right}
.oe-tbl tr:hover{background:var(--bg2)}
.oe-del{cursor:pointer;color:var(--text3);font-size:15px;padding:2px 7px;border-radius:5px;line-height:1}
.oe-del:hover{color:var(--red-text);background:var(--red-bg)}
.oe-tot{font-weight:650;color:var(--text);text-align:right;white-space:nowrap;padding-right:8px}
.oe-sum{background:var(--bg2);border:1px solid var(--border);border-radius:9px;padding:13px 16px;margin-top:14px}
.oe-sr{display:flex;justify-content:space-between;font-size:12.5px;padding:4px 0}
.oe-sr.big{font-size:15px;font-weight:680;border-top:1px solid var(--border2);margin-top:7px;padding-top:9px}
.oe-sr .lb{color:var(--text2)}
.oe-sr .vl{font-weight:650;color:var(--text)}
.oe-sr .vl.save{color:var(--green-text)}
.oe-ft{padding:14px 22px;border-top:1px solid var(--border);display:flex;
  justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.oe-msg{font-size:11.5px;color:var(--text3);flex:1}
.oe-msg.err{color:var(--red-text)}
.oe-msg.ok{color:var(--green-text)}
.oe-add{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--bronze);
  cursor:pointer;padding:7px 0;font-weight:600}
.oe-add:hover{text-decoration:underline}
.oe-newsup{display:none;background:var(--bronze-bg);border:1px solid var(--bronze);
  border-radius:9px;padding:13px 15px;margin-top:9px}
.oe-newsup.on{display:block}
.oe-editbtn{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;color:var(--text3);
  cursor:pointer;padding:3px 9px;border:1px solid var(--border);border-radius:6px;
  background:#fff;transition:all .14s ease;margin-left:6px}
.oe-editbtn:hover{color:var(--bronze);border-color:var(--bronze)}
`;
document.head.appendChild(css);

// ── GJENDJA ─────────────────────────────────────────────────
var S = { id:null, projectId:null, pos:[], suppliers:[], projects:[] };

function n(v){ var x = parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(x)?0:x; }
function fmt(v,d){ return (parseFloat(v)||0).toLocaleString('de-DE',{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); }
function esc(s){ return String(s==null?'':s).replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

// ── UI ──────────────────────────────────────────────────────
var bg = document.createElement('div');
bg.className = 'oe-bg';
bg.id = 'oe-bg';
bg.onclick = function(e){ if(e.target===bg) closeEditor(); };

function shell(){
  return '<div class="oe-box" onclick="event.stopPropagation()">'
   +'<div class="oe-hd"><div><div class="oe-ht" id="oe-title">Ofertë e re</div>'
   +'<div class="oe-hs" id="oe-sub"></div></div>'
   +'<span class="oe-x" onclick="pstCloseOffer()">✕</span></div>'
   +'<div class="oe-bd">'

   +'<div class="oe-sec">Furnitori dhe projekti</div>'
   +'<div class="oe-g oe-g2">'
     +'<div class="oe-f"><label>Furnitori</label>'
       +'<select id="oe-sup" onchange="pstSupChange()"></select>'
       +'<div class="oe-hint">Zgjidh ose shto të ri</div></div>'
     +'<div class="oe-f"><label>Projekti</label><select id="oe-proj"></select></div>'
   +'</div>'
   +'<div class="oe-newsup" id="oe-newsup">'
     +'<div class="oe-g oe-g3">'
       +'<div class="oe-f"><label>Emri i furnitorit *</label><input id="ns-name" placeholder="p.sh. Makstil AD"></div>'
       +'<div class="oe-f"><label>Vendi</label><input id="ns-country" placeholder="MK"></div>'
       +'<div class="oe-f"><label>Email</label><input id="ns-email" placeholder="info@..."></div>'
     +'</div>'
     +'<div class="oe-g oe-g3" style="margin-top:10px">'
       +'<div class="oe-f"><label>Personi</label><input id="ns-person"></div>'
       +'<div class="oe-f"><label>Telefoni</label><input id="ns-phone"></div>'
       +'<div class="oe-f"><label>Kategoria</label><input id="ns-cat" placeholder="çelik, zinktim…"></div>'
     +'</div>'
     +'<div style="margin-top:11px;display:flex;gap:8px">'
       +'<button class="btn btn-primary btn-sm" onclick="pstSaveNewSupplier()">Ruaj furnitorin</button>'
       +'<button class="btn btn-sm" onclick="pstCancelNewSupplier()">Anulo</button>'
     +'</div>'
   +'</div>'

   +'<div class="oe-sec">Pozicionet</div>'
   +'<div style="overflow-x:auto"><table class="oe-tbl"><thead><tr>'
     +'<th style="width:32%">Përshkrimi</th><th style="width:11%">Sasia</th><th style="width:8%">Njësia</th>'
     +'<th style="width:12%">Çmim origjinal</th><th style="width:12%">Pas negocimit</th>'
     +'<th style="width:13%">Totali</th><th style="width:4%"></th>'
   +'</tr></thead><tbody id="oe-rows"></tbody></table></div>'
   +'<div class="oe-add" onclick="pstAddPos()">+ Shto pozicion</div>'

   +'<div class="oe-sec">Kostot shtesë dhe kushtet</div>'
   +'<div class="oe-g oe-g4">'
     +'<div class="oe-f"><label>Zinktim EUR/kg</label><input id="oe-zinc" class="num" oninput="pstCalc()" placeholder="0.00"></div>'
     +'<div class="oe-f"><label>Transport EUR</label><input id="oe-transp" class="num" oninput="pstCalc()" placeholder="0"></div>'
     +'<div class="oe-f"><label>Tonazhi kg</label><input id="oe-qty" class="num" oninput="pstCalc()" placeholder="0"></div>'
     +'<div class="oe-f"><label>TVSH %</label><input id="oe-vat" class="num" oninput="pstCalc()" placeholder="0"></div>'
   +'</div>'
   +'<div class="oe-g oe-g4" style="margin-top:11px">'
     +'<div class="oe-f"><label>Afati (javë)</label><input id="oe-weeks" class="num" placeholder="0"></div>'
     +'<div class="oe-f"><label>Incoterms</label><select id="oe-inco">'
       +'<option value="">—</option><option>EXW</option><option>FCA</option><option>FOB</option>'
       +'<option>CFR</option><option>CIF</option><option>CPT</option><option>DAP</option>'
       +'<option>DDP</option><option>DAT</option></select></div>'
     +'<div class="oe-f"><label>Certifikata</label><input id="oe-cert" placeholder="EN 1090 EXC3, 3.1…"></div>'
     +'<div class="oe-f"><label>Prejardhja</label><input id="oe-origin" placeholder="MK, TR, XK…"></div>'
   +'</div>'
   +'<div class="oe-f" style="margin-top:11px"><label>Shënime</label>'
     +'<textarea id="oe-notes" placeholder="Kushte pagese, vlefshmëria, kufizime…"></textarea></div>'

   +'<div class="oe-sum" id="oe-sum"></div>'
   +'</div>'
   +'<div class="oe-ft">'
     +'<span class="oe-msg" id="oe-msg"></span>'
     +'<span style="display:flex;gap:8px">'
       +'<button class="btn btn-sm" onclick="pstCloseOffer()">Anulo</button>'
       +'<button class="btn btn-sm" id="oe-delbtn" style="display:none" onclick="pstDeleteOffer()">Fshi</button>'
       +'<button class="btn btn-primary btn-sm" onclick="pstSaveOffer()">Ruaj ofertën</button>'
     +'</span>'
   +'</div></div>';
}

// ── POZICIONET ──────────────────────────────────────────────
function rowHtml(p, i){
  var orig = n(p.price_orig != null ? p.price_orig : p.unit_price);
  var neg  = n(p.price_neg  != null ? p.price_neg  : orig);
  var tot  = n(p.qty) * neg;
  return '<tr>'
    +'<td><input value="'+esc(p.desc)+'" oninput="pstPos('+i+',\'desc\',this.value)" placeholder="Përshkrimi"></td>'
    +'<td><input class="num" value="'+(p.qty||'')+'" oninput="pstPos('+i+',\'qty\',this.value)" placeholder="0"></td>'
    +'<td><input value="'+esc(p.unit)+'" oninput="pstPos('+i+',\'unit\',this.value)" placeholder="kg"></td>'
    +'<td><input class="num" value="'+(orig||'')+'" oninput="pstPos('+i+',\'price_orig\',this.value)" placeholder="0.00"></td>'
    +'<td><input class="num" value="'+(neg||'')+'" oninput="pstPos('+i+',\'price_neg\',this.value)" placeholder="0.00"></td>'
    +'<td class="oe-tot" id="oe-t'+i+'">'+fmt(tot,2)+'</td>'
    +'<td><span class="oe-del" onclick="pstDelPos('+i+')">×</span></td>'
  +'</tr>';
}

function renderRows(){
  var el = document.getElementById('oe-rows');
  if(!el) return;
  el.innerHTML = S.pos.map(rowHtml).join('');
  pstCalc();
}

window.pstAddPos = function(){
  S.pos.push({desc:'',qty:'',unit:'kg',price_orig:'',price_neg:''});
  renderRows();
  setTimeout(function(){
    var rows = document.querySelectorAll('#oe-rows tr');
    var last = rows[rows.length-1];
    if(last) last.querySelector('input').focus();
  }, 40);
};

window.pstDelPos = function(i){ S.pos.splice(i,1); renderRows(); };

window.pstPos = function(i, k, v){
  if(!S.pos[i]) return;
  S.pos[i][k] = (k==='desc'||k==='unit') ? v : n(v);
  if(k === 'price_orig' && !n(S.pos[i].price_neg)) S.pos[i].price_neg = n(v);
  var orig = n(S.pos[i].price_orig), neg = n(S.pos[i].price_neg) || orig;
  var t = document.getElementById('oe-t'+i);
  if(t) t.textContent = fmt(n(S.pos[i].qty)*neg, 2);
  pstCalc();
};

// ── LLOGARITJA ──────────────────────────────────────────────
window.pstCalc = function(){
  var orig=0, neg=0;
  S.pos.forEach(function(p){
    var q=n(p.qty), po=n(p.price_orig), pn=n(p.price_neg)||po;
    orig += q*po; neg += q*pn;
  });
  var zinc=n(document.getElementById('oe-zinc') && document.getElementById('oe-zinc').value);
  var qty =n(document.getElementById('oe-qty')  && document.getElementById('oe-qty').value);
  var tr  =n(document.getElementById('oe-transp')&&document.getElementById('oe-transp').value);
  var vat =n(document.getElementById('oe-vat')  && document.getElementById('oe-vat').value);
  var zincT = zinc*qty;
  var net = neg + zincT + tr;
  var vatA = net*vat/100;
  var save = orig - neg;

  var el = document.getElementById('oe-sum');
  if(!el) return;
  var h = '';
  if(orig>0 && save>0) h += '<div class="oe-sr"><span class="lb">Pozicionet (origjinal)</span><span class="vl">'+fmt(orig,2)+' €</span></div>';
  h += '<div class="oe-sr"><span class="lb">Pozicionet'+(save>0?' (pas negocimit)':'')+'</span><span class="vl">'+fmt(neg,2)+' €</span></div>';
  if(save>0) h += '<div class="oe-sr"><span class="lb">Kursim nga negocimi</span><span class="vl save">−'+fmt(save,2)+' € ('+(orig?((save/orig)*100).toFixed(1):'0')+' %)</span></div>';
  if(zincT>0) h += '<div class="oe-sr"><span class="lb">Zinktim ('+fmt(qty,0)+' kg × '+fmt(zinc,3)+')</span><span class="vl">'+fmt(zincT,2)+' €</span></div>';
  if(tr>0) h += '<div class="oe-sr"><span class="lb">Transport</span><span class="vl">'+fmt(tr,2)+' €</span></div>';
  h += '<div class="oe-sr"><span class="lb">Neto</span><span class="vl">'+fmt(net,2)+' €</span></div>';
  if(vat>0){
    h += '<div class="oe-sr"><span class="lb">TVSH '+vat+' %</span><span class="vl">'+fmt(vatA,2)+' €</span></div>';
    h += '<div class="oe-sr big"><span class="lb">Bruto</span><span class="vl">'+fmt(net+vatA,2)+' €</span></div>';
  } else {
    h += '<div class="oe-sr big"><span class="lb">Totali</span><span class="vl">'+fmt(net,2)+' €</span></div>';
  }
  if(qty>0) h += '<div class="oe-sr" style="margin-top:6px;padding-top:7px;border-top:1px solid var(--border)">'
    +'<span class="lb">Çmimi efektiv për kg</span><span class="vl">'+fmt(net/qty,3)+' €/kg</span></div>';
  el.innerHTML = h;
};

// ── FURNITORI I RI ──────────────────────────────────────────
window.pstSupChange = function(){
  var s = document.getElementById('oe-sup');
  var box = document.getElementById('oe-newsup');
  if(s.value === '__new__'){ box.classList.add('on'); setTimeout(function(){ document.getElementById('ns-name').focus(); },40); }
  else box.classList.remove('on');
};
window.pstCancelNewSupplier = function(){
  document.getElementById('oe-newsup').classList.remove('on');
  document.getElementById('oe-sup').value = '';
};
window.pstSaveNewSupplier = async function(){
  var name = (document.getElementById('ns-name').value||'').trim();
  if(!name){ msg('Emri i furnitorit është i detyrueshëm.','err'); return; }
  try{
    var rec = {
      kind:'supplier', company:name,
      person:(document.getElementById('ns-person').value||'').trim()||null,
      email:(document.getElementById('ns-email').value||'').trim()||null,
      phone:(document.getElementById('ns-phone').value||'').trim()||null,
      country:(document.getElementById('ns-country').value||'').trim()||null,
      notes:(document.getElementById('ns-cat').value||'').trim()||null
    };
    await supaFetch('contacts','POST',rec);
    await loadSuppliers();
    var s = document.getElementById('oe-sup');
    s.value = name;
    document.getElementById('oe-newsup').classList.remove('on');
    ['ns-name','ns-person','ns-email','ns-phone','ns-country','ns-cat'].forEach(function(id){
      var e=document.getElementById(id); if(e) e.value='';
    });
    msg('Furnitori "'+name+'" u shtua.','ok');
  }catch(e){ msg('Gabim: '+e.message,'err'); }
};

async function loadSuppliers(){
  try{
    var r = await supaFetch("contacts?kind=eq.supplier&select=company,person,country&order=company.asc&limit=1000");
    S.suppliers = r||[];
  }catch(e){ S.suppliers = []; }
  var s = document.getElementById('oe-sup');
  if(!s) return;
  var cur = s.value;
  var seen = {};
  s.innerHTML = '<option value="">— zgjidh —</option>'
    + S.suppliers.filter(function(x){
        if(!x.company || seen[x.company]) return false;
        seen[x.company]=1; return true;
      }).map(function(x){
        return '<option value="'+esc(x.company)+'">'+esc(x.company)+(x.country?' ('+esc(x.country)+')':'')+'</option>';
      }).join('')
    + '<option value="__new__">+ Furnitor i ri…</option>';
  if(cur) s.value = cur;
}

async function loadProjects(){
  try{
    var r = await supaFetch('projects?select=id,name,client&order=created_at.desc&limit=200');
    S.projects = r||[];
  }catch(e){ S.projects = []; }
  var s = document.getElementById('oe-proj');
  if(!s) return;
  s.innerHTML = '<option value="">— pa projekt —</option>'
    + S.projects.map(function(p){
        return '<option value="'+p.id+'">'+esc(p.name)+(p.client?' · '+esc((p.client||'').split(',')[0]):'')+'</option>';
      }).join('');
}

function msg(t, cls){
  var e = document.getElementById('oe-msg');
  if(e){ e.textContent = t||''; e.className = 'oe-msg'+(cls?' '+cls:''); }
}

// ── HAPJA ───────────────────────────────────────────────────
window.pstOpenOffer = async function(offerId, projectId){
  if(!document.getElementById('oe-bg')) document.body.appendChild(bg);
  bg.innerHTML = shell();
  bg.classList.add('on');
  S = { id:offerId||null, projectId:projectId||null, pos:[], suppliers:[], projects:[] };

  await loadSuppliers();
  await loadProjects();

  var del = document.getElementById('oe-delbtn');

  if(offerId){
    document.getElementById('oe-title').textContent = 'Redakto ofertën';
    if(del) del.style.display = '';
    try{
      var r = await supaFetch('offers?id=eq.'+offerId+'&select=*');
      var o = r && r[0];
      if(!o){ msg('Oferta nuk u gjet.','err'); return; }
      var supName = (o.supplier||'').split('(')[0].trim();
      var sel = document.getElementById('oe-sup');
      var found = Array.prototype.some.call(sel.options, function(op){ return op.value===supName; });
      if(!found && supName){
        var op = document.createElement('option');
        op.value = supName; op.textContent = supName;
        sel.insertBefore(op, sel.options[1]);
      }
      sel.value = supName;
      document.getElementById('oe-proj').value  = o.project_id||'';
      document.getElementById('oe-zinc').value   = o.zinc_kg||'';
      document.getElementById('oe-transp').value = o.transport_eur||'';
      document.getElementById('oe-qty').value    = o.qty_kg||'';
      document.getElementById('oe-vat').value    = o.vat_pct||'';
      document.getElementById('oe-weeks').value  = o.delivery_weeks||'';
      document.getElementById('oe-inco').value   = o.incoterms||'';
      document.getElementById('oe-cert').value   = o.cert||'';
      document.getElementById('oe-origin').value = o.origin||'';
      document.getElementById('oe-notes').value  = o.notes||'';
      document.getElementById('oe-sub').textContent =
        (o.created_at ? 'Krijuar '+new Date(o.created_at).toLocaleDateString('de-DE') : '');

      S.pos = Array.isArray(o.positions) ? o.positions.map(function(p){
        return {
          desc: p.desc||p.description||'',
          qty:  p.qty||p.quantity||'',
          unit: p.unit||'',
          price_orig: p.price_orig!=null ? p.price_orig : (p.unit_price||''),
          price_neg:  p.price_neg !=null ? p.price_neg  : (p.unit_price||p.price_orig||'')
        };
      }) : [];
      if(!S.pos.length && (o.price_kg || o.total_eur)){
        S.pos = [{ desc:'Çelik', qty:o.qty_kg||'', unit:'kg',
                   price_orig:o.price_kg||'', price_neg:o.price_kg||'' }];
      }
    }catch(e){ msg('Gabim: '+e.message,'err'); }
  } else {
    document.getElementById('oe-title').textContent = 'Ofertë e re';
    if(del) del.style.display = 'none';
    if(projectId) document.getElementById('oe-proj').value = projectId;
    S.pos = [{desc:'',qty:'',unit:'kg',price_orig:'',price_neg:''}];
  }
  if(!S.pos.length) S.pos = [{desc:'',qty:'',unit:'kg',price_orig:'',price_neg:''}];
  renderRows();
};

window.pstCloseOffer = closeEditor;
function closeEditor(){ var b=document.getElementById('oe-bg'); if(b) b.classList.remove('on'); }

document.addEventListener('keydown', function(e){
  var b = document.getElementById('oe-bg');
  if(e.key==='Escape' && b && b.classList.contains('on')) closeEditor();
});

// ── RUAJTJA ─────────────────────────────────────────────────
window.pstSaveOffer = async function(){
  var sup = document.getElementById('oe-sup').value;
  if(!sup || sup==='__new__'){ msg('Zgjidh furnitorin.','err'); return; }

  var pos = S.pos.filter(function(p){ return (p.desc||'').trim() || n(p.qty); })
    .map(function(p){
      var po = n(p.price_orig), pn = n(p.price_neg)||po;
      return { desc:(p.desc||'').trim(), qty:n(p.qty), unit:(p.unit||'').trim(),
               price_orig:po, price_neg:pn, total_orig:n(p.qty)*po, total_neg:n(p.qty)*pn };
    });
  if(!pos.length){ msg('Shto të paktën një pozicion.','err'); return; }

  var neg = pos.reduce(function(s,p){ return s+p.total_neg; },0);
  var zinc=n(document.getElementById('oe-zinc').value);
  var qty =n(document.getElementById('oe-qty').value);
  var tr  =n(document.getElementById('oe-transp').value);
  var net = neg + zinc*qty + tr;

  var steel = pos.filter(function(p){ return (p.unit||'').toLowerCase()==='kg'; });
  var steelKg  = steel.reduce(function(s,p){ return s+p.qty; },0);
  var steelEur = steel.reduce(function(s,p){ return s+p.total_neg; },0);
  var pkg = steelKg>0 ? steelEur/steelKg : (qty>0 ? net/qty : null);

  var rec = {
    supplier: sup,
    project_id: document.getElementById('oe-proj').value || null,
    positions: pos,
    price_kg: pkg,
    total_eur: net,
    qty_kg: qty || steelKg || null,
    zinc_kg: zinc || null,
    transport_eur: tr || null,
    vat_pct: n(document.getElementById('oe-vat').value) || null,
    delivery_weeks: parseInt(document.getElementById('oe-weeks').value,10) || null,
    incoterms: document.getElementById('oe-inco').value || null,
    cert: (document.getElementById('oe-cert').value||'').trim() || null,
    origin: (document.getElementById('oe-origin').value||'').trim() || null,
    notes: (document.getElementById('oe-notes').value||'').trim() || null
  };

  try{
    msg('Duke ruajtur…');
    if(S.id) await supaFetch('offers?id=eq.'+S.id, 'PATCH', rec);
    else await supaFetch('offers', 'POST', rec);
    msg('U ruajt.','ok');
    setTimeout(function(){
      closeEditor();
      if(typeof loadOffers==='function') loadOffers();
      else if(typeof showPage==='function') showPage('offers');
    }, 550);
  }catch(e){ msg('Gabim: '+e.message,'err'); }
};

window.pstDeleteOffer = async function(){
  if(!S.id) return;
  if(!confirm('Të fshihet kjo ofertë përfundimisht?')) return;
  try{
    await supaFetch('offers?id=eq.'+S.id, 'DELETE');
    closeEditor();
    if(typeof loadOffers==='function') loadOffers();
  }catch(e){ msg('Gabim: '+e.message,'err'); }
};

// ── BUTONAT NË FAQEN E OFERTAVE ─────────────────────────────
function addButtons(){
  var pg = document.getElementById('page-offers');
  if(!pg) return false;
  if(!document.getElementById('oe-newbtn')){
    var hd = pg.querySelector('.page-header, .card-title, h2, .flex');
    var b = document.createElement('button');
    b.id = 'oe-newbtn';
    b.className = 'btn btn-primary btn-sm';
    b.textContent = '+ Ofertë manuale';
    b.style.marginLeft = '8px';
    b.onclick = function(){ window.pstOpenOffer(null, null); };
    if(hd) hd.appendChild(b); else pg.insertBefore(b, pg.firstChild);
  }
  return true;
}

// Shto butonin "Redakto" te çdo kartë oferte
function decorateOfferCards(){
  document.querySelectorAll('[data-offer-id]').forEach(function(el){
    if(el.querySelector('.oe-editbtn')) return;
    var id = el.getAttribute('data-offer-id');
    var b = document.createElement('span');
    b.className = 'oe-editbtn';
    b.textContent = 'Redakto';
    b.onclick = function(e){ e.stopPropagation(); window.pstOpenOffer(id, null); };
    var t = el.querySelector('.card-title, .offer-title, h3, .flex');
    (t || el).appendChild(b);
  });
}

function init(){
  var t = 0;
  var iv = setInterval(function(){
    addButtons();
    decorateOfferCards();
    if(++t > 60) clearInterval(iv);
  }, 900);
  if(typeof window.showPage === 'function' && !window.showPage.__oe){
    var orig = window.showPage;
    window.showPage = function(p){
      orig.apply(this, arguments);
      if(p==='offers') setTimeout(function(){ addButtons(); decorateOfferCards(); }, 300);
    };
    window.showPage.__oe = true;
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 900); });
} else {
  setTimeout(init, 900);
}

})();
