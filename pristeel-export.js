/* ═══════════════════════════════════════════════════════════
   PRISTEEL — EKSPORTI
   CSV/Excel nga çdo modul · raport ekzekutiv i printueshëm
   Instalimi: <script src="pristeel-export.js"></script>
   ═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

var css = document.createElement('style');
css.textContent = `
.ex-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;
  font-size:11px;font-weight:500;cursor:pointer;border:1px solid var(--border2);
  background:transparent;color:var(--text2);transition:all .15s ease;letter-spacing:.3px}
.ex-btn:hover{background:var(--bg2);color:var(--text);border-color:var(--border2)}
.ex-btn svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2}
.ex-bg{position:fixed;inset:0;background:rgba(26,26,25,.32);z-index:9100;display:none;
  align-items:center;justify-content:center;padding:24px}
.ex-bg.on{display:flex}
.ex-box{background:#fff;border-radius:13px;max-width:560px;width:100%;max-height:86vh;
  overflow:auto;box-shadow:0 18px 55px rgba(20,25,30,.26)}
.ex-hd{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;
  justify-content:space-between;align-items:center}
.ex-ht{font-size:14px;font-weight:650}
.ex-x{cursor:pointer;color:var(--text3);font-size:17px;line-height:1;padding:2px 6px}
.ex-x:hover{color:var(--text)}
.ex-bd{padding:16px 20px}
.ex-r{display:flex;align-items:center;gap:11px;padding:10px 12px;border:1px solid var(--border);
  border-radius:9px;margin-bottom:6px;cursor:pointer;transition:all .14s ease}
.ex-r:hover{border-color:var(--bronze);background:var(--bronze-bg)}
.ex-ri{width:28px;height:28px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;
  justify-content:center;font-size:10px;font-weight:700;background:var(--bg3);color:var(--text2)}
.ex-rb{flex:1;min-width:0}
.ex-rt{font-size:12.5px;font-weight:620;color:var(--text)}
.ex-rs{font-size:10.5px;color:var(--text3);margin-top:1px}
.ex-rn{flex-shrink:0;font-size:11px;font-weight:650;color:var(--text2)}
.ex-grp{font-size:9.5px;letter-spacing:1.3px;text-transform:uppercase;color:var(--text3);
  font-weight:700;margin:14px 0 7px}
.ex-grp:first-child{margin-top:0}
`;
document.head.appendChild(css);

// ── BURIMET ─────────────────────────────────────────────────
var SOURCES = [
  {g:'Operativa', k:'projects', ic:'P', t:'Projektet',
   q:'projects?select=name,client,ref,location,deadline,created_at&order=created_at.desc',
   cols:{name:'Projekti',client:'Klienti',ref:'Referenca',location:'Vendi',deadline:'Afati',created_at:'Krijuar'}},

  {g:'Operativa', k:'bom', ic:'B', t:'BOM — të gjitha pozicionet',
   q:'bom_items?select=profile,dim,grade,std,len_mm,pcs,kg,surface,cert&order=created_at.desc&limit=5000',
   cols:{profile:'Profili',dim:'Dimensioni',grade:'Grada',std:'Standardi',len_mm:'Gjatësia mm',
         pcs:'Copë',kg:'Kg',surface:'Sipërfaqja',cert:'Certifikata'}},

  {g:'Operativa', k:'tasks', ic:'D', t:'Detyrat e hapura',
   q:'tasks?status=eq.hapur&select=title,detail,due_date,priority,category,contact_email&order=due_date.asc',
   cols:{title:'Detyra',detail:'Detaje',due_date:'Afati',priority:'Prioriteti',
         category:'Kategoria',contact_email:'Kontakti'}},

  {g:'Shitje', k:'quotes', ic:'Q', t:'Ofertat tona',
   q:'documents_registry?series=eq.QUO&select=doc_nr,project,client,total_eur,created_at&order=created_at.desc',
   cols:{doc_nr:'Nr. ofertës',project:'Projekti',client:'Klienti',total_eur:'Vlera EUR',created_at:'Data'}},

  {g:'Shitje', k:'invout', ic:'F', t:'Faturat dalëse',
   q:'invoices_out?select=invoice_nr,date,client,project,net_amount,vat_amount,gross_amount,paid,paid_date,payment_terms&order=date.desc',
   cols:{invoice_nr:'Nr. faturës',date:'Data',client:'Klienti',project:'Projekti',
         net_amount:'Neto EUR',vat_amount:'TVSH EUR',gross_amount:'Bruto EUR',
         paid:'Paguar',paid_date:'Data e pagesës',payment_terms:'Kushtet'}},

  {g:'Prokurim', k:'offers', ic:'O', t:'Ofertat e furnitorëve',
   q:'offers?select=supplier,price_kg,qty_kg,zinc_kg,transport_eur,total_eur,delivery_weeks,incoterms,cert,origin&order=created_at.desc',
   cols:{supplier:'Furnitori',price_kg:'EUR/kg',qty_kg:'Kg',zinc_kg:'Zinktim EUR/kg',
         transport_eur:'Transport EUR',total_eur:'Totali EUR',delivery_weeks:'Javë',
         incoterms:'Incoterms',cert:'Certifikata',origin:'Prejardhja'}},

  {g:'Prokurim', k:'rfq', ic:'R', t:'RFQ — historiku',
   q:'rfq_log?select=supplier_name,supplier_email,project_name,sent_at,replied_at,status,followup_count&order=sent_at.desc',
   cols:{supplier_name:'Furnitori',supplier_email:'Email',project_name:'Projekti',
         sent_at:'Dërguar',replied_at:'Përgjigje',status:'Statusi',followup_count:'Ndjekje'}},

  {g:'Prokurim', k:'invin', ic:'H', t:'Faturat hyrëse',
   q:'invoices_in?select=supplier,supplier_invoice_nr,date,project,amount,currency,net_amount,paid,paid_date&order=date.desc',
   cols:{supplier:'Furnitori',supplier_invoice_nr:'Nr. i tyre',date:'Data',project:'Projekti',
         amount:'Shuma',currency:'Valuta',net_amount:'Neto EUR',paid:'Paguar',paid_date:'Data e pagesës'}},

  {g:'Financa', k:'guar', ic:'G', t:'Garancitë bankare',
   q:'bank_guarantees?select=bank_name,guarantee_type,project,amount_guaranteed,fee_rate_pct,fee_amount,issue_date,expiry_date,status&order=expiry_date.asc',
   cols:{bank_name:'Banka',guarantee_type:'Lloji',project:'Projekti',amount_guaranteed:'Garantim EUR',
         fee_rate_pct:'Komision %',fee_amount:'Komision EUR',issue_date:'Lëshuar',
         expiry_date:'Skadon',status:'Statusi'}},

  {g:'Financa', k:'costs', ic:'K', t:'Kostot operative',
   q:'other_costs?select=category,description,project,amount,date&order=date.desc',
   cols:{category:'Kategoria',description:'Përshkrimi',project:'Projekti',amount:'EUR',date:'Data'}},

  {g:'Kontakte', k:'contacts', ic:'C', t:'Kontaktet',
   q:'contacts?select=kind,company,person,role,email,phone,country,notes&order=kind.asc,company.asc&limit=3000',
   cols:{kind:'Lloji',company:'Kompania',person:'Personi',role:'Roli',
         email:'Email',phone:'Telefoni',country:'Vendi',notes:'Shënime'}},

  {g:'Kontakte', k:'partners', ic:'W', t:'Partnerët',
   q:'partners?select=name,country,city,business_type,categories,stage,importance&order=name.asc',
   cols:{name:'Emri',country:'Vendi',city:'Qyteti',business_type:'Lloji',
         categories:'Kategoritë',stage:'Faza',importance:'Rëndësia'}}
];

// ── CSV ─────────────────────────────────────────────────────
function toCsv(rows, cols){
  if(!rows || !rows.length) return '';
  var keys = Object.keys(cols);
  var head = keys.map(function(k){ return '"'+cols[k].replace(/"/g,'""')+'"'; }).join(';');
  var body = rows.map(function(r){
    return keys.map(function(k){
      var v = r[k];
      if(v === null || v === undefined) v = '';
      if(typeof v === 'boolean') v = v ? 'Po' : 'Jo';
      if(Array.isArray(v)) v = v.join(', ');
      if(typeof v === 'object') v = JSON.stringify(v);
      v = String(v);
      if(/^\d{4}-\d{2}-\d{2}T/.test(v)) v = v.slice(0,10);
      return '"'+v.replace(/"/g,'""')+'"';
    }).join(';');
  }).join('\n');
  return head+'\n'+body;
}

function download(name, content, type){
  var blob = new Blob(['\uFEFF'+content], {type:(type||'text/csv')+';charset=utf-8;'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 200);
}

function stamp(){
  var d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

window.pstExportSource = async function(key){
  var s = SOURCES.filter(function(x){ return x.k===key; })[0];
  if(!s) return;
  try{
    var rows = await supaFetch(s.q);
    if(!rows || !rows.length){ alert('Asnjë të dhënë për eksport.'); return; }
    download('PRISTEEL-'+s.k+'-'+stamp()+'.csv', toCsv(rows, s.cols));
    closeExport();
  }catch(e){ alert('Gabim: '+e.message); }
};

// ── RAPORTI EKZEKUTIV ───────────────────────────────────────
function fmt(n){ return (parseFloat(n)||0).toLocaleString('de-DE',{maximumFractionDigits:0}); }
function esc(s){ return String(s||'').replace(/</g,'&lt;'); }

window.pstExecReport = async function(){
  try{
    var today = new Date(); today.setHours(0,0,0,0);
    var iso = today.toISOString().slice(0,10);
    var r = await Promise.all([
      supaFetch('projects?select=id,name,client,deadline&order=created_at.desc').catch(function(){return[];}),
      supaFetch('bom_items?select=project_id,kg&limit=5000').catch(function(){return[];}),
      supaFetch('documents_registry?series=eq.QUO&select=doc_nr,project,client,total_eur,created_at,followup_status').catch(function(){return[];}),
      supaFetch('invoices_out?select=invoice_nr,client,gross_amount,total_price,paid').catch(function(){return[];}),
      supaFetch('invoices_in?select=supplier,amount,paid').catch(function(){return[];}),
      supaFetch('rfq_log?select=supplier_name,sent_at,replied_at').catch(function(){return[];}),
      supaFetch('tasks?status=eq.hapur&select=title,due_date').catch(function(){return[];}),
      supaFetch('bank_guarantees?select=bank_name,amount_guaranteed,expiry_date,status').catch(function(){return[];})
    ]);
    var projs=r[0]||[], boms=r[1]||[], quotes=r[2]||[], iOut=r[3]||[],
        iIn=r[4]||[], rfqs=r[5]||[], tsks=r[6]||[], gars=r[7]||[];

    var kgBy={}; boms.forEach(function(b){ if(b.project_id) kgBy[b.project_id]=(kgBy[b.project_id]||0)+(parseFloat(b.kg)||0); });
    var kgTot = Object.keys(kgBy).reduce(function(s,k){ return s+kgBy[k]; },0);
    var qOpen = quotes.filter(function(q){ var s=q.followup_status||'open'; return s!=='won'&&s!=='lost'&&s!=='superseded'; });
    var pipeline = qOpen.reduce(function(s,q){ return s+(parseFloat(q.total_eur)||0); },0);
    var paidSum = iOut.filter(function(i){return i.paid;}).reduce(function(s,i){ return s+(parseFloat(i.gross_amount)||parseFloat(i.total_price)||0); },0);
    var openSum = iOut.filter(function(i){return !i.paid;}).reduce(function(s,i){ return s+(parseFloat(i.gross_amount)||parseFloat(i.total_price)||0); },0);
    var costIn = iIn.reduce(function(s,i){ return s+(parseFloat(i.amount)||0); },0);
    var replied = rfqs.filter(function(x){return x.replied_at;}).length;
    var tDue = tsks.filter(function(t){ return t.due_date && t.due_date<=iso; });
    var gAct = gars.filter(function(g){ return g.status==='aktive'; });

    var kv = function(k,v){ return '<tr><td style="padding:6px 0;color:#8A8378">'+k+'</td>'
      +'<td style="padding:6px 0;text-align:right;font-weight:600">'+v+'</td></tr>'; };
    var sec = function(t){ return '<div style="font-size:11px;font-weight:700;letter-spacing:2px;'
      +'text-transform:uppercase;color:#1C2333;margin:22px 0 8px;padding-bottom:5px;'
      +'border-bottom:1px solid #E8E4DE">'+t+'</div>'; };

    var pTop = projs.map(function(p){ return {n:p.name, kg:kgBy[p.id]||0, c:p.client, d:p.deadline}; })
      .sort(function(a,b){ return b.kg-a.kg; }).slice(0,10);

    var html = '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;color:#1A1F2E;'
      +'font-size:12.5px;line-height:1.55;max-width:820px;margin:0 auto">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-end;'
      +'padding-bottom:16px;border-bottom:3px solid #B87333;margin-bottom:22px">'
        +'<div><div style="font-size:24px;font-weight:700;letter-spacing:3px;color:#1C2333">PRISTEEL</div>'
        +'<div style="font-size:11px;color:#8A8378;letter-spacing:1px">STEEL IS OUR BUSINESS</div></div>'
        +'<div style="text-align:right"><div style="font-size:17px;font-weight:700;letter-spacing:2px;color:#1C2333">RAPORT EKZEKUTIV</div>'
        +'<div style="font-size:12px;color:#B87333;font-weight:600;margin-top:2px">'
        + today.toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'})+'</div></div>'
      +'</div>'

      + sec('Pipeline komercial')
      +'<table style="width:100%;font-size:12.5px">'
        + kv('Oferta të hapura', qOpen.length)
        + kv('Vlera e pipeline-it', fmt(pipeline)+' EUR')
        + kv('Faturuar dhe arkëtuar', fmt(paidSum)+' EUR')
        + kv('Faturuar, ende e hapur', fmt(openSum)+' EUR')
        + kv('Konversion ofertë → faturë', (pipeline>0?(((paidSum+openSum)/pipeline)*100).toFixed(0):'0')+' %')
      +'</table>'

      + sec('Prokurimi')
      +'<table style="width:100%;font-size:12.5px">'
        + kv('Projekte aktive', projs.length)
        + kv('Tonazh total në BOM', fmt(kgTot/1000)+' t')
        + kv('RFQ të dërguara', rfqs.length)
        + kv('Me përgjigje', replied + ' (' + (rfqs.length?((replied/rfqs.length)*100).toFixed(0):'0') + ' %)')
        + kv('Kosto furnitorësh e regjistruar', fmt(costIn)+' EUR')
      +'</table>'

      + sec('Rreziqe dhe afate')
      +'<table style="width:100%;font-size:12.5px">'
        + kv('Detyra të vonuara', tDue.length)
        + kv('Garanci bankare aktive', gAct.length + (gAct.length? ' ('+fmt(gAct.reduce(function(s,g){return s+(parseFloat(g.amount_guaranteed)||0);},0))+' EUR)':''))
      +'</table>'

      + sec('Projektet sipas tonazhit')
      +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
        +'<thead><tr style="background:#1C2333;color:#fff">'
        +'<th style="padding:7px 10px;text-align:left">Projekti</th>'
        +'<th style="padding:7px 10px;text-align:left">Klienti</th>'
        +'<th style="padding:7px 10px;text-align:right">Tonazh</th>'
        +'<th style="padding:7px 10px;text-align:left">Afati</th></tr></thead><tbody>'
        + pTop.map(function(p,i){
            return '<tr style="background:'+(i%2?'#FAF8F5':'#fff')+'">'
              +'<td style="padding:6px 10px;font-weight:600">'+esc(p.n)+'</td>'
              +'<td style="padding:6px 10px">'+esc((p.c||'').split(',')[0])+'</td>'
              +'<td style="padding:6px 10px;text-align:right;font-weight:600">'+fmt(p.kg/1000)+' t</td>'
              +'<td style="padding:6px 10px">'+esc(p.d||'—')+'</td></tr>';
          }).join('')
      +'</tbody></table>'

      +'<div style="margin-top:28px;padding-top:12px;border-top:1px solid #E8E4DE;'
      +'display:flex;justify-content:space-between;font-size:10px;color:#8A8378">'
        +'<div>PRISTEEL Sh.p.k. · Prishtinë, Kosovë</div>'
        +'<div>Gjeneruar automatikisht nga Procurement Platform</div>'
      +'</div></div>';

    var w = window.open('','_blank');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8">'
      +'<title>PRISTEEL — Raport Ekzekutiv</title>'
      +'<style>body{margin:34px;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
      +'@media print{body{margin:10mm}}@page{size:A4;margin:12mm}</style></head><body>'
      + html + '</body></html>');
    w.document.close();
    setTimeout(function(){ w.print(); }, 500);
    closeExport();
  }catch(e){ alert('Gabim: '+e.message); }
};

// ── MODAL ───────────────────────────────────────────────────
var bg = document.createElement('div');
bg.className = 'ex-bg';
bg.id = 'ex-bg';
bg.onclick = function(e){ if(e.target===bg) closeExport(); };

function buildModal(){
  var grps = {};
  SOURCES.forEach(function(s){ (grps[s.g] = grps[s.g] || []).push(s); });
  var h = '<div class="ex-box" onclick="event.stopPropagation()">'
    +'<div class="ex-hd"><span class="ex-ht">Eksporto të dhëna</span>'
    +'<span class="ex-x" onclick="pstCloseExport()">✕</span></div><div class="ex-bd">'
    +'<div class="ex-grp">Raport</div>'
    +'<div class="ex-r" onclick="pstExecReport()">'
      +'<div class="ex-ri" style="background:var(--bronze-bg);color:var(--bronze)">PDF</div>'
      +'<div class="ex-rb"><div class="ex-rt">Raport ekzekutiv</div>'
      +'<div class="ex-rs">Pipeline, prokurim, rreziqe, projektet — gati për printim</div></div></div>';
  Object.keys(grps).forEach(function(g){
    h += '<div class="ex-grp">'+g+'</div>';
    grps[g].forEach(function(s){
      h += '<div class="ex-r" onclick="pstExportSource(\''+s.k+'\')">'
        +'<div class="ex-ri">'+s.ic+'</div>'
        +'<div class="ex-rb"><div class="ex-rt">'+s.t+'</div>'
        +'<div class="ex-rs">CSV · hapet direkt në Excel</div></div>'
        +'<div class="ex-rn">CSV</div></div>';
    });
  });
  h += '</div></div>';
  bg.innerHTML = h;
}

window.pstOpenExport = function(){
  if(!document.getElementById('ex-bg')) document.body.appendChild(bg);
  if(!bg.innerHTML) buildModal();
  bg.classList.add('on');
};
window.pstCloseExport = closeExport;
function closeExport(){ var b=document.getElementById('ex-bg'); if(b) b.classList.remove('on'); }

document.addEventListener('keydown', function(e){
  if(e.key==='Escape'){ closeExport(); }
});

// ── BUTONI NË TOPBAR ────────────────────────────────────────
function addButton(){
  var tb = document.querySelector('.topbar .flex.gap-8');
  if(!tb || document.getElementById('ex-topbtn')) return false;
  var b = document.createElement('button');
  b.id = 'ex-topbtn';
  b.className = 'ex-btn';
  b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
    +'<polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Eksporto';
  b.onclick = window.pstOpenExport;
  tb.appendChild(b);
  return true;
}

function init(){
  buildModal();
  if(!document.getElementById('ex-bg')) document.body.appendChild(bg);
  var t=0;
  var iv = setInterval(function(){ if(addButton() || ++t>25) clearInterval(iv); }, 400);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 800); });
} else {
  setTimeout(init, 800);
}

})();
