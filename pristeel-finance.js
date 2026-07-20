/* ═══════════════════════════════════════════════════════════
   PRISTEEL — FINANCAT
   Faturat (statuse) · Shpenzimet operative · Tatimet ATK
   Instalimi: <script src="pristeel-finance.js"></script>
   ═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

function n(v){ var x=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(x)?0:x; }
function eur(v){ return (parseFloat(v)||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }
function esc(s){ return String(s==null?'':s).replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function today(){ return new Date().toISOString().slice(0,10); }

// ── KATEGORITE E SHPENZIMEVE ───────────────────────────────
var EXP_CATS=[
  {v:'rryma',    n:'Rryma',              ic:'⚡', c:'#E8A33D'},
  {v:'uji',      n:'Uji',                ic:'💧', c:'#4E93C4'},
  {v:'nafta',    n:'Nafta / karburant',  ic:'⛽', c:'#8D6E63'},
  {v:'qira',     n:'Qiraja',             ic:'🏢', c:'#7A4E9E'},
  {v:'telefon',  n:'Telefon / internet', ic:'📞', c:'#0C7C7C'},
  {v:'mirembajtje',n:'Mirëmbajtje',      ic:'🔧', c:'#546E7A'},
  {v:'sherbime', n:'Shërbime (kontabilitet, juridike)', ic:'📋', c:'#5D4037'},
  {v:'transport',n:'Transport / logjistikë', ic:'🚚', c:'#2E7D32'},
  {v:'sigurime', n:'Sigurime',           ic:'🛡️', c:'#455A64'},
  {v:'tjera',    n:'Të tjera',           ic:'📦', c:'#78909C'}
];

// ── LLOJET E TATIMEVE (ATK Kosovë) ─────────────────────────
var TAX_TYPES=[
  {v:'tvsh', n:'TVSH', c:'#A65F2E',
   desc:'Deklarim mujor · afati: 20 e muajit pasues', rate:'18% / 8% / 0% eksport'},
  {v:'tatim_fitimi', n:'Tatimi mbi Fitimin e Korporatave', c:'#0F6E56',
   desc:'Këste tremujore + deklarim vjetor (31 mars)', rate:'10% mbi fitimin neto'},
  {v:'tatim_paga', n:'Tatimi në Paga', c:'#185FA5',
   desc:'Deklarim mujor · afati: 15 e muajit pasues', rate:'0% / 4% / 8% / 10%'},
  {v:'kontribute_pensionale', n:'Kontributet Pensionale', c:'#534AB7',
   desc:'Deklarim mujor · afati: 15 e muajit pasues', rate:'5% punëdhënës + 5% punëmarrës'},
  {v:'tatim_qira', n:'Tatimi në Qira', c:'#993556',
   desc:'Mbajtje në burim · afati: 15 e muajit pasues', rate:'9% (ose 10%)'},
  {v:'tatim_burim', n:'Tatimi i Mbajtur në Burim', c:'#B8461F',
   desc:'Për shërbime/interesa/dividendë', rate:'sipas llojit'}
];

// ── HUB-I I FINANCAVE ──────────────────────────────────────
var FIN_TILES=[
  {id:'inv',   n:'Faturat',              d:'Të gjitha faturat me statuse pagese', c:'#185FA5', ic:'🧾'},
  {id:'exp',   n:'Shpenzimet operative', d:'Rryma, uji, nafta, qiraja, shërbimet', c:'#A65F2E', ic:'📊'},
  {id:'atk',   n:'Tatimet (ATK)',        d:'TVSH, fitimi, pagat, kontributet',    c:'#0F6E56', ic:'🏛️'},
  {id:'tax',   n:'Përmbledhja Tatimore', d:'Vlerësim orientues i detyrimeve',     c:'#2E7D32', ic:'📈'},
  {id:'aging', n:'Afatet e Pagesave',    d:'Çka duhet paguar dhe kur',            c:'#B8461F', ic:'⏰'},
  {id:'bg',    n:'Garanci Bankare',      d:'Garancitë aktive dhe skadimet',       c:'#534AB7', ic:'🏦'},
  {id:'oc',    n:'Kosto të tjera',       d:'Kosto operative të ndryshme',         c:'#5D4037', ic:'💼'}
];

window.finShowHub=function(){
  var hub=document.getElementById('fin-hub'), tabs=document.getElementById('fin-tabs');
  if(hub) hub.style.display='';
  if(tabs) tabs.style.display='none';
  ['inv','exp','atk','tax','aging','bg','oc'].forEach(function(v){
    var el=document.getElementById('fin-view-'+v); if(el) el.style.display='none';
  });
  var g=document.getElementById('fin-hub-grid'); if(!g) return;
  g.innerHTML=FIN_TILES.map(function(t){
    return '<div onclick="finSwitchTab(\''+t.id+'\')" title="'+t.n+'"'
      +' style="position:relative;border:2.5px solid '+t.c+';border-radius:12px;padding:16px;cursor:pointer;background:#fff;'
      +'transition:box-shadow .15s,transform .1s;min-height:110px;display:flex;flex-direction:column"'
      +' onmouseover="this.style.boxShadow=\'0 5px 18px rgba(30,40,50,.14)\';this.style.transform=\'translateY(-1px)\'"'
      +' onmouseout="this.style.boxShadow=\'none\';this.style.transform=\'none\'">'
      +'<div style="position:absolute;top:0;left:0;right:0;height:5px;background:'+t.c+';border-radius:9px 9px 0 0"></div>'
      +'<div style="font-size:22px;margin:6px 0 8px">'+t.ic+'</div>'
      +'<div style="font-size:13.5px;font-weight:650;color:var(--text)">'+t.n+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:3px;line-height:1.4">'+t.d+'</div>'
      +'</div>';
  }).join('')
  +'<a href="https://edeklarimi.atk-ks.org/" target="_blank" rel="noopener"'
    +' style="position:relative;border:2.5px dashed #0F6E56;border-radius:12px;padding:16px;background:#F7FBF9;'
    +'min-height:110px;display:flex;flex-direction:column;text-decoration:none;transition:box-shadow .15s"'
    +' onmouseover="this.style.boxShadow=\'0 5px 18px rgba(30,40,50,.14)\'" onmouseout="this.style.boxShadow=\'none\'">'
    +'<div style="font-size:22px;margin:6px 0 8px">🔗</div>'
    +'<div style="font-size:13.5px;font-weight:650;color:#0F6E56">Portali ATK — EDI</div>'
    +'<div style="font-size:11px;color:var(--text3);margin-top:3px;line-height:1.4">Hap e-deklarimin në dritare të re</div>'
  +'</a>';
};

// ── FATURAT ────────────────────────────────────────────────
var _invAll=[], _invFilter='all';
window.finInvFilter=function(f){ _invFilter=f; renderInvoices(); };

async function loadAllInvoices(){
  var list=document.getElementById('fin-inv-list');
  if(list) list.innerHTML='<div style="color:var(--text3);font-size:12px">Duke ngarkuar…</div>';
  try{
    var res=await Promise.all([
      supaFetch('invoices_out?select=*&order=date.desc').catch(function(){return [];}),
      supaFetch('invoices_in?select=*&order=date.desc').catch(function(){return [];})
    ]);
    var out=(res[0]||[]).map(function(x){
      return {kind:'out', id:x.id, nr:x.invoice_nr||'', party:x.client||'', date:x.date,
              due:x.due_date, amount:n(x.gross_amount)||n(x.total_price), paid:!!x.paid,
              paid_date:x.paid_date, project:x.project||''};
    });
    var inn=(res[1]||[]).map(function(x){
      return {kind:'in', id:x.id, nr:x.supplier_invoice_nr||'', party:x.supplier||'', date:x.date,
              due:x.due_date, amount:n(x.amount), paid:!!x.paid,
              paid_date:x.paid_date, project:x.project||''};
    });
    _invAll=out.concat(inn).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
    renderInvoices();
  }catch(e){
    if(list) list.innerHTML='<div style="color:var(--red-text);font-size:12px">Gabim: '+esc(e.message)+'</div>';
  }
}

function invStatus(iv){
  if(iv.paid) return {k:'paid', n:'E paguar', c:'#2E7D32', bg:'#E8F5E9'};
  if(iv.due && iv.due < today()) return {k:'overdue', n:'Me vonesë', c:'#C62828', bg:'#FFEBEE'};
  return {k:'unpaid', n:'E papaguar', c:'#E8A33D', bg:'#FFF8E1'};
}

function renderInvoices(){
  var list=document.getElementById('fin-inv-list'), sum=document.getElementById('fin-inv-sum');
  if(!list) return;
  var f=_invFilter;
  var rows=_invAll.filter(function(iv){
    var st=invStatus(iv).k;
    return f==='all' || st===f;
  });
  // Permbledhje
  if(sum){
    var tot={paid:0,unpaid:0,overdue:0}, cnt={paid:0,unpaid:0,overdue:0};
    _invAll.forEach(function(iv){ var k=invStatus(iv).k; tot[k]+=iv.amount; cnt[k]++; });
    sum.innerHTML=[
      {k:'paid',   n:'Të paguara',  c:'#2E7D32'},
      {k:'unpaid', n:'Të papaguara',c:'#E8A33D'},
      {k:'overdue',n:'Me vonesë',   c:'#C62828'}
    ].map(function(s){
      return '<div style="border:2px solid '+s.c+';border-radius:10px;padding:11px 13px;background:#fff">'
        +'<div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px">'+s.n+'</div>'
        +'<div style="font-size:17px;font-weight:700;color:'+s.c+';margin-top:3px">'+eur(tot[s.k])+'</div>'
        +'<div style="font-size:10.5px;color:var(--text3)">'+cnt[s.k]+' faturë(a)</div></div>';
    }).join('');
  }
  if(!rows.length){ list.innerHTML='<div style="color:var(--text3);font-size:12px;padding:10px 0">Asnjë faturë në këtë kategori.</div>'; return; }
  list.innerHTML='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="text-align:left;color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.5px">'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Statusi</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Lloji</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Nr.</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Palë</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Data</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Afati</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border);text-align:right">Shuma</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)"></th></tr></thead><tbody>'
    +rows.map(function(iv){
      var st=invStatus(iv);
      var late=(!iv.paid&&iv.due&&iv.due<today())?Math.floor((new Date(today())-new Date(iv.due))/86400000):0;
      return '<tr style="border-bottom:1px solid var(--border)">'
        +'<td style="padding:7px 8px"><span style="background:'+st.bg+';color:'+st.c+';font-size:10px;font-weight:600;padding:3px 8px;border-radius:5px;white-space:nowrap">'+st.n+(late?' ('+late+'d)':'')+'</span></td>'
        +'<td style="padding:7px 8px;color:var(--text3);font-size:11px">'+(iv.kind==='out'?'Dalëse':'Hyrëse')+'</td>'
        +'<td style="padding:7px 8px">'+esc(iv.nr)+'</td>'
        +'<td style="padding:7px 8px">'+esc(iv.party)+'</td>'
        +'<td style="padding:7px 8px;color:var(--text3)">'+(iv.date||'')+'</td>'
        +'<td style="padding:7px 8px;color:'+(late?'#C62828':'var(--text3)')+'">'+(iv.due||'—')+'</td>'
        +'<td style="padding:7px 8px;text-align:right;font-weight:650">'+eur(iv.amount)+'</td>'
        +'<td style="padding:7px 8px">'+(iv.paid
            ?'<span style="font-size:10px;color:var(--text3)">'+(iv.paid_date||'')+'</span>'
            :'<button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="finMarkPaid(\''+iv.kind+'\',\''+iv.id+'\')">Shëno paguar</button>')
        +'</td></tr>';
    }).join('')+'</tbody></table></div>';
}

window.finMarkPaid=async function(kind,id){
  if(!confirm('A jeni i sigurt që kjo faturë është paguar sot?')) return;
  var tbl=kind==='out'?'invoices_out':'invoices_in';
  try{
    await supaFetch(tbl+'?id=eq.'+id,'PATCH',{paid:true,paid_date:today()});
    loadAllInvoices();
  }catch(e){ alert('Gabim: '+e.message); }
};

// ── SHPENZIMET OPERATIVE ───────────────────────────────────
window.expOpenForm=function(){
  var f=document.getElementById('exp-form'); if(!f) return;
  f.style.display='';
  f.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">'
    +'<div><label class="lbl">Kategoria *</label><select id="exp-cat">'
      +EXP_CATS.map(function(c){return '<option value="'+c.v+'">'+c.ic+' '+c.n+'</option>';}).join('')+'</select></div>'
    +'<div><label class="lbl">Furnitori</label><input type="text" id="exp-sup" placeholder="p.sh. KEDS"></div>'
    +'<div><label class="lbl">Nr. faturës</label><input type="text" id="exp-nr"></div>'
    +'<div><label class="lbl">Data *</label><input type="date" id="exp-date" value="'+today()+'"></div>'
    +'<div><label class="lbl">Afati i pagesës</label><input type="date" id="exp-due"></div>'
    +'<div><label class="lbl">Shuma bruto (€) *</label><input type="number" id="exp-amt" step="0.01" placeholder="0.00"></div>'
    +'<div><label class="lbl">TVSH %</label><select id="exp-vat"><option value="0">0%</option><option value="8">8%</option><option value="18" selected>18%</option></select></div>'
    +'<div><label class="lbl">Statusi</label><select id="exp-paid"><option value="false">E papaguar</option><option value="true">E paguar</option></select></div>'
    +'</div>'
    +'<div style="margin-top:10px"><label class="lbl">Shënime</label><input type="text" id="exp-notes" placeholder="Periudha, konsumi, etj."></div>'
    +'<div style="margin-top:11px;display:flex;gap:8px">'
      +'<button class="btn btn-primary btn-sm" onclick="expSave()">Ruaj shpenzimin</button>'
      +'<button class="btn btn-sm" onclick="document.getElementById(\'exp-form\').style.display=\'none\'">Anulo</button>'
    +'</div>';
};

window.expSave=async function(){
  var amt=n(document.getElementById('exp-amt').value);
  if(!amt){ alert('Shkruaj shumën.'); return; }
  if(!confirm('A jeni i sigurt që doni ta ruani këtë shpenzim?')) return;
  var vatRate=n(document.getElementById('exp-vat').value);
  var net=vatRate>0 ? +(amt/(1+vatRate/100)).toFixed(2) : amt;
  var rec={
    category:document.getElementById('exp-cat').value,
    supplier:document.getElementById('exp-sup').value||null,
    invoice_nr:document.getElementById('exp-nr').value||null,
    date:document.getElementById('exp-date').value||today(),
    due_date:document.getElementById('exp-due').value||null,
    amount:amt, vat_rate:vatRate, vat_amount:+(amt-net).toFixed(2), net_amount:net,
    paid:document.getElementById('exp-paid').value==='true',
    paid_date:document.getElementById('exp-paid').value==='true'?today():null,
    deductible:true,
    notes:document.getElementById('exp-notes').value||null
  };
  try{
    await supaFetch('expenses','POST',rec);
    document.getElementById('exp-form').style.display='none';
    loadExpenses();
  }catch(e){ alert('Gabim: '+e.message); }
};

async function loadExpenses(){
  var list=document.getElementById('fin-exp-list'), sum=document.getElementById('fin-exp-sum');
  if(list) list.innerHTML='<div style="color:var(--text3);font-size:12px">Duke ngarkuar…</div>';
  try{
    var rows=await supaFetch('expenses?select=*&order=date.desc&limit=300');
    if(sum){
      var byCat={}, total=0, unpaid=0;
      (rows||[]).forEach(function(r){
        byCat[r.category]=(byCat[r.category]||0)+n(r.amount);
        total+=n(r.amount);
        if(!r.paid) unpaid+=n(r.amount);
      });
      sum.innerHTML='<div style="border:2px solid #A65F2E;border-radius:10px;padding:11px 13px;background:#fff">'
        +'<div style="font-size:10px;color:var(--text3);text-transform:uppercase">Totali</div>'
        +'<div style="font-size:17px;font-weight:700;color:#A65F2E;margin-top:3px">'+eur(total)+'</div></div>'
        +'<div style="border:2px solid #E8A33D;border-radius:10px;padding:11px 13px;background:#fff">'
        +'<div style="font-size:10px;color:var(--text3);text-transform:uppercase">Të papaguara</div>'
        +'<div style="font-size:17px;font-weight:700;color:#E8A33D;margin-top:3px">'+eur(unpaid)+'</div></div>'
        +'<div style="border:2px solid #2E7D32;border-radius:10px;padding:11px 13px;background:#fff">'
        +'<div style="font-size:10px;color:var(--text3);text-transform:uppercase">Regjistrime</div>'
        +'<div style="font-size:17px;font-weight:700;color:#2E7D32;margin-top:3px">'+(rows||[]).length+'</div></div>';
    }
    if(!rows||!rows.length){ if(list) list.innerHTML='<div style="color:var(--text3);font-size:12px;padding:10px 0">Asnjë shpenzim i regjistruar ende.</div>'; return; }
    if(list) list.innerHTML='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
      +'<thead><tr style="text-align:left;color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.5px">'
      +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Kategoria</th>'
      +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Furnitori</th>'
      +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Data</th>'
      +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Afati</th>'
      +'<th style="padding:7px 8px;border-bottom:1px solid var(--border);text-align:right">Neto</th>'
      +'<th style="padding:7px 8px;border-bottom:1px solid var(--border);text-align:right">TVSH</th>'
      +'<th style="padding:7px 8px;border-bottom:1px solid var(--border);text-align:right">Bruto</th>'
      +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Statusi</th>'
      +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)"></th></tr></thead><tbody>'
      +rows.map(function(r){
        var cat=EXP_CATS.filter(function(c){return c.v===r.category;})[0]||{n:r.category,ic:'📦',c:'#78909C'};
        var late=(!r.paid&&r.due_date&&r.due_date<today());
        return '<tr style="border-bottom:1px solid var(--border)">'
          +'<td style="padding:7px 8px"><span style="color:'+cat.c+';font-weight:600">'+cat.ic+' '+esc(cat.n)+'</span></td>'
          +'<td style="padding:7px 8px">'+esc(r.supplier||'—')+'</td>'
          +'<td style="padding:7px 8px;color:var(--text3)">'+(r.date||'')+'</td>'
          +'<td style="padding:7px 8px;color:'+(late?'#C62828':'var(--text3)')+'">'+(r.due_date||'—')+'</td>'
          +'<td style="padding:7px 8px;text-align:right">'+eur(r.net_amount)+'</td>'
          +'<td style="padding:7px 8px;text-align:right;color:var(--text3)">'+eur(r.vat_amount)+'</td>'
          +'<td style="padding:7px 8px;text-align:right;font-weight:650">'+eur(r.amount)+'</td>'
          +'<td style="padding:7px 8px">'+(r.paid
              ?'<span style="background:#E8F5E9;color:#2E7D32;font-size:10px;font-weight:600;padding:3px 8px;border-radius:5px">Paguar</span>'
              :'<span style="background:'+(late?'#FFEBEE':'#FFF8E1')+';color:'+(late?'#C62828':'#E8A33D')+';font-size:10px;font-weight:600;padding:3px 8px;border-radius:5px">'+(late?'Vonesë':'Papaguar')+'</span>')+'</td>'
          +'<td style="padding:7px 8px">'+(!r.paid?'<button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="expMarkPaid(\''+r.id+'\')">Paguar</button>':'')
          +' <button class="btn btn-sm" style="font-size:10px;padding:3px 6px" onclick="expDelete(\''+r.id+'\')">✕</button></td></tr>';
      }).join('')+'</tbody></table></div>';
  }catch(e){
    if(list) list.innerHTML='<div style="color:var(--red-text);font-size:12px">Gabim: '+esc(e.message)+'</div>';
  }
}
window.expMarkPaid=async function(id){
  if(!confirm('A jeni i sigurt që ky shpenzim është paguar sot?')) return;
  try{ await supaFetch('expenses?id=eq.'+id,'PATCH',{paid:true,paid_date:today()}); loadExpenses(); }
  catch(e){ alert('Gabim: '+e.message); }
};
window.expDelete=async function(id){
  if(!confirm('A jeni i sigurt që doni ta fshini këtë shpenzim? Ky veprim nuk kthehet.')) return;
  try{ await supaFetch('expenses?id=eq.'+id,'DELETE'); loadExpenses(); }
  catch(e){ alert('Gabim: '+e.message); }
};

// ── TATIMET ATK ────────────────────────────────────────────
window.atkOpenForm=function(preType){
  var f=document.getElementById('atk-form'); if(!f) return;
  f.style.display='';
  var y=new Date().getFullYear();
  f.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">'
    +'<div><label class="lbl">Lloji i tatimit *</label><select id="atk-type">'
      +TAX_TYPES.map(function(t){return '<option value="'+t.v+'"'+(preType===t.v?' selected':'')+'>'+t.n+'</option>';}).join('')+'</select></div>'
    +'<div><label class="lbl">Viti *</label><input type="number" id="atk-year" value="'+y+'"></div>'
    +'<div><label class="lbl">Periudha *</label><input type="text" id="atk-period" placeholder="p.sh. Janar 2026 / TM1 2026"></div>'
    +'<div><label class="lbl">Afati i pagesës *</label><input type="date" id="atk-due"></div>'
    +'<div><label class="lbl">Shuma (€) *</label><input type="number" id="atk-amt" step="0.01" placeholder="0.00"></div>'
    +'<div><label class="lbl">Statusi</label><select id="atk-paid"><option value="false">E papaguar</option><option value="true">E paguar</option></select></div>'
    +'<div><label class="lbl">Nr. referencës</label><input type="text" id="atk-ref"></div>'
    +'</div>'
    +'<div style="margin-top:10px"><label class="lbl">Shënime</label><input type="text" id="atk-notes"></div>'
    +'<div style="margin-top:11px;display:flex;gap:8px">'
      +'<button class="btn btn-primary btn-sm" onclick="atkSave()">Ruaj detyrimin</button>'
      +'<button class="btn btn-sm" onclick="document.getElementById(\'atk-form\').style.display=\'none\'">Anulo</button>'
    +'</div>';
};

window.atkSave=async function(){
  var amt=n(document.getElementById('atk-amt').value);
  var period=document.getElementById('atk-period').value;
  var due=document.getElementById('atk-due').value;
  if(!period||!due){ alert('Plotëso periudhën dhe afatin e pagesës.'); return; }
  if(!confirm('A jeni i sigurt që doni ta ruani këtë detyrim tatimor?')) return;
  var isPaid=document.getElementById('atk-paid').value==='true';
  var rec={
    tax_type:document.getElementById('atk-type').value,
    period_year:parseInt(document.getElementById('atk-year').value,10)||new Date().getFullYear(),
    period_label:period, due_date:due, amount:amt,
    paid:isPaid, paid_date:isPaid?today():null, paid_amount:isPaid?amt:0,
    reference_nr:document.getElementById('atk-ref').value||null,
    notes:document.getElementById('atk-notes').value||null
  };
  try{
    await supaFetch('tax_obligations','POST',rec);
    document.getElementById('atk-form').style.display='none';
    loadTaxObligations();
  }catch(e){ alert('Gabim: '+e.message); }
};

async function loadTaxObligations(){
  var types=document.getElementById('fin-atk-types'), list=document.getElementById('fin-atk-list');
  var rows=[];
  try{ rows=await supaFetch('tax_obligations?select=*&order=due_date.desc&limit=300')||[]; }catch(e){}
  // Katroret e llojeve te tatimeve
  if(types){
    types.innerHTML=TAX_TYPES.map(function(t){
      var mine=rows.filter(function(r){return r.tax_type===t.v;});
      var unpaid=mine.filter(function(r){return !r.paid;});
      var unpaidSum=unpaid.reduce(function(s,r){return s+n(r.amount);},0);
      var overdue=unpaid.filter(function(r){return r.due_date&&r.due_date<today();}).length;
      return '<div onclick="atkOpenForm(\''+t.v+'\')" title="Regjistro detyrim për '+t.n+'"'
        +' style="position:relative;border:2.5px solid '+t.c+';border-radius:11px;padding:13px;cursor:pointer;background:#fff;transition:box-shadow .15s"'
        +' onmouseover="this.style.boxShadow=\'0 4px 14px rgba(30,40,50,.13)\'" onmouseout="this.style.boxShadow=\'none\'">'
        +'<div style="position:absolute;top:0;left:0;right:0;height:4px;background:'+t.c+';border-radius:8px 8px 0 0"></div>'
        +'<div style="font-size:12.5px;font-weight:650;color:'+t.c+';margin-top:5px;line-height:1.25">'+t.n+'</div>'
        +'<div style="font-size:10px;color:var(--text3);margin-top:4px;line-height:1.35">'+t.desc+'</div>'
        +'<div style="font-size:10px;color:var(--text2);margin-top:3px;font-weight:600">'+t.rate+'</div>'
        +(unpaidSum>0
          ?'<div style="margin-top:7px;padding-top:7px;border-top:1px solid var(--border);font-size:11px">'
            +'<span style="color:'+(overdue?'#C62828':'#E8A33D')+';font-weight:700">'+eur(unpaidSum)+'</span>'
            +'<span style="color:var(--text3)"> papaguar'+(overdue?' · '+overdue+' me vonesë':'')+'</span></div>'
          :'<div style="margin-top:7px;padding-top:7px;border-top:1px solid var(--border);font-size:10.5px;color:var(--text3)">Klikoni për të regjistruar</div>')
        +'</div>';
    }).join('');
  }
  if(!list) return;
  if(!rows.length){ list.innerHTML='<div style="color:var(--text3);font-size:12px;padding:10px 0">Asnjë detyrim i regjistruar ende. Kliko një katror lart për të filluar.</div>'; return; }
  list.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 8px">Detyrimet e regjistruara</div>'
    +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="text-align:left;color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.5px">'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Tatimi</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Periudha</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Afati</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border);text-align:right">Shuma</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)">Statusi</th>'
    +'<th style="padding:7px 8px;border-bottom:1px solid var(--border)"></th></tr></thead><tbody>'
    +rows.map(function(r){
      var t=TAX_TYPES.filter(function(x){return x.v===r.tax_type;})[0]||{n:r.tax_type,c:'#78909C'};
      var late=(!r.paid&&r.due_date&&r.due_date<today());
      var days=late?Math.floor((new Date(today())-new Date(r.due_date))/86400000):0;
      return '<tr style="border-bottom:1px solid var(--border)">'
        +'<td style="padding:7px 8px;color:'+t.c+';font-weight:600">'+esc(t.n)+'</td>'
        +'<td style="padding:7px 8px">'+esc(r.period_label||'')+'</td>'
        +'<td style="padding:7px 8px;color:'+(late?'#C62828':'var(--text3)')+'">'+(r.due_date||'')+'</td>'
        +'<td style="padding:7px 8px;text-align:right;font-weight:650">'+eur(r.amount)+'</td>'
        +'<td style="padding:7px 8px">'+(r.paid
            ?'<span style="background:#E8F5E9;color:#2E7D32;font-size:10px;font-weight:600;padding:3px 8px;border-radius:5px">Paguar '+(r.paid_date||'')+'</span>'
            :'<span style="background:'+(late?'#FFEBEE':'#FFF8E1')+';color:'+(late?'#C62828':'#E8A33D')+';font-size:10px;font-weight:600;padding:3px 8px;border-radius:5px">'+(late?'Vonesë '+days+'d':'Papaguar')+'</span>')+'</td>'
        +'<td style="padding:7px 8px">'+(!r.paid?'<button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="atkMarkPaid(\''+r.id+'\','+n(r.amount)+')">Paguar</button>':'')
        +' <button class="btn btn-sm" style="font-size:10px;padding:3px 6px" onclick="atkDelete(\''+r.id+'\')">✕</button></td></tr>';
    }).join('')+'</tbody></table></div>';
}
window.atkMarkPaid=async function(id,amt){
  if(!confirm('A jeni i sigurt që ky detyrim është paguar sot?')) return;
  try{ await supaFetch('tax_obligations?id=eq.'+id,'PATCH',{paid:true,paid_date:today(),paid_amount:amt}); loadTaxObligations(); }
  catch(e){ alert('Gabim: '+e.message); }
};
window.atkDelete=async function(id){
  if(!confirm('A jeni i sigurt që doni ta fshini këtë detyrim? Ky veprim nuk kthehet.')) return;
  try{ await supaFetch('tax_obligations?id=eq.'+id,'DELETE'); loadTaxObligations(); }
  catch(e){ alert('Gabim: '+e.message); }
};

// ── NDERRIMI I PAMJEVE ─────────────────────────────────────
var _origFinSwitch=window.finSwitchTab;
window.finSwitchTab=function(tab){
  var hub=document.getElementById('fin-hub'), tabs=document.getElementById('fin-tabs');
  if(hub) hub.style.display='none';
  if(tabs) tabs.style.display='flex';
  ['inv','exp','atk','tax','aging','bg','oc'].forEach(function(v){
    var el=document.getElementById('fin-view-'+v); if(el) el.style.display=(v===tab)?'':'none';
  });
  if(tab==='inv') loadAllInvoices();
  else if(tab==='exp') loadExpenses();
  else if(tab==='atk') loadTaxObligations();
  else if(typeof _origFinSwitch==='function'){
    // pamjet e vjetra (tax/aging/bg/oc) kane logjiken e tyre
    try{ _origFinSwitch(tab); }catch(e){}
  }
};

// Kur hapet moduli i financave, shfaq hub-in
var _origShowPage=window.showPage;
if(typeof _origShowPage==='function' && !_origShowPage.__fin){
  window.showPage=function(p){
    _origShowPage.apply(this,arguments);
    if(p==='finance') setTimeout(function(){ if(typeof finShowHub==='function') finShowHub(); },60);
  };
  window.showPage.__fin=true;
}

})();
