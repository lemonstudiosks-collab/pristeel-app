/* ═══════════════════════════════════════════════════════════
   PRISTEEL — MODULI "PASQYRA" (KPI Dashboard)
   Modul i pavarur. Nuk prek asnjë rresht të kodit ekzistues.
   Instalimi: një rresht <script> para </body> në pristeel-procurement.html
   ═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

// ── 1. CSS ──────────────────────────────────────────────────
var css = document.createElement('style');
css.textContent = `
.kpi-wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:12px;margin-bottom:22px}
.kpi{background:#fff;border:1px solid var(--border);border-radius:11px;padding:15px 17px;box-shadow:var(--sh-1);
     transition:all .16s ease;cursor:pointer;position:relative;overflow:hidden}
.kpi:hover{box-shadow:var(--sh-2);border-color:var(--border2);transform:translateY(-1px)}
.kpi-l{font-size:9.5px;letter-spacing:1.1px;text-transform:uppercase;color:var(--text3);font-weight:650}
.kpi-v{font-size:23px;font-weight:680;color:var(--text);letter-spacing:-.5px;line-height:1.1;margin-top:5px}
.kpi-s{font-size:10.5px;color:var(--text3);margin-top:3px}
.kpi.risk .kpi-v{color:var(--red-text)}
.kpi.risk::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--red-text)}
.kpi.act .kpi-v{color:var(--bronze)}
.kpi.act::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--bronze)}
.kpi-top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding-bottom:16px;
  border-bottom:1px solid var(--border);margin-bottom:20px;flex-wrap:wrap}
.kpi-eyebrow{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);font-weight:600;margin-bottom:5px}
.kpi-head{font-size:21px;font-weight:650;letter-spacing:-.3px;line-height:1.25}
.kpi-sub{font-size:12.5px;color:var(--text2);margin-top:4px}
.dash-sec{display:flex;justify-content:space-between;align-items:center;font-size:10px;letter-spacing:1.4px;
  text-transform:uppercase;color:var(--text3);font-weight:700;margin:24px 0 10px;padding-bottom:7px;border-bottom:1px solid var(--border)}
.dash-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:24px;align-items:start}
@media(max-width:1050px){.dash-grid{grid-template-columns:1fr}}
.al{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;
    background:#fff;box-shadow:var(--sh-1);margin-bottom:7px;transition:all .15s ease;cursor:pointer}
.al:hover{box-shadow:var(--sh-2);border-color:var(--border2)}
.al.r{border-left:3px solid var(--red-text)}
.al.b{border-left:3px solid var(--bronze)}
.al.n{border-left:3px solid var(--border2)}
.al-b{flex:1;min-width:0}
.al-t{font-size:12px;font-weight:620;color:var(--text);line-height:1.35}
.al-s{font-size:10.5px;color:var(--text3);margin-top:2px}
.al-v{flex-shrink:0;font-size:11.5px;font-weight:650;text-align:right;white-space:nowrap}
.al-v.r{color:var(--red-text)}
.bar-row{display:flex;align-items:center;gap:10px;padding:7px 0;font-size:11.5px}
.bar-lbl{width:108px;flex-shrink:0;color:var(--text2);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar-bg{flex:1;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden}
.bar-fi{height:6px;border-radius:3px;transition:width .6s cubic-bezier(.4,0,.2,1)}
.bar-n{width:70px;text-align:right;flex-shrink:0;font-weight:650;color:var(--text)}
.dash-load{font-size:12px;color:var(--text3);padding:14px 2px}
.dash-none{font-size:12px;color:var(--text3);font-style:italic;padding:12px 2px}
`;
document.head.appendChild(css);

// ── 2. FAQJA HTML ───────────────────────────────────────────
function buildPage(){
  if(document.getElementById('page-kpi')) return;
  var content = document.querySelector('.content');
  if(!content) return;
  var pg = document.createElement('div');
  pg.id = 'page-kpi';
  pg.className = 'page';
  pg.innerHTML =
    '<div class="kpi-top">'
     +'<div>'
       +'<div class="kpi-eyebrow">Pasqyra e biznesit · <span id="kpi-date"></span></div>'
       +'<div class="kpi-head" id="kpi-headline">Duke ngarkuar…</div>'
       +'<div class="kpi-sub" id="kpi-subline"></div>'
     +'</div>'
     +'<button class="btn btn-sm" onclick="loadKpi()">Rifresko</button>'
    +'</div>'
    +'<div class="kpi-wrap" id="kpi-cards"><div class="dash-load">Duke llogaritur…</div></div>'
    +'<div class="dash-grid">'
     +'<div>'
       +'<div class="dash-sec"><span>Kërkon veprim</span><span id="kpi-alert-n" style="color:var(--text3);font-weight:600"></span></div>'
       +'<div id="kpi-alerts"><div class="dash-load">Duke analizuar…</div></div>'
       +'<div class="dash-sec"><span>Projektet sipas tonazhit</span></div>'
       +'<div id="kpi-bars"><div class="dash-load">Duke ngarkuar…</div></div>'
     +'</div>'
     +'<div>'
       +'<div class="dash-sec"><span>Pipeline financiar</span></div>'
       +'<div id="kpi-fin"><div class="dash-load">Duke ngarkuar…</div></div>'
       +'<div class="dash-sec"><span>SLA — ndjekja e RFQ-ve</span></div>'
       +'<div id="kpi-sla"><div class="dash-load">Duke ngarkuar…</div></div>'
     +'</div>'
    +'</div>';
  content.appendChild(pg);
}

// ── 3. REGJISTRIMI NË NAVIGIM ───────────────────────────────
function register(){
  if(typeof pageMeta !== 'undefined' && !pageMeta.kpi){
    pageMeta.kpi = {title:'Pasqyra', sub:'KPI, alarme dhe pipeline në kohë reale'};
  }
  if(typeof PAGE_NAV !== 'undefined' && !PAGE_NAV.kpi){
    PAGE_NAV.kpi = 'Pasqyra';
  }
  if(typeof PAGE_ICON !== 'undefined' && !PAGE_ICON.kpi){
    PAGE_ICON.kpi = '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>';
  }
  if(typeof MODULES !== 'undefined'){
    for(var i=0;i<MODULES.length;i++){
      if(MODULES[i].id === 'detyrat' && MODULES[i].pages.indexOf('kpi') === -1){
        MODULES[i].pages.unshift('kpi');
        break;
      }
    }
  }
  if(typeof window.showPage === 'function' && !window.showPage.__kpiWrapped){
    var orig = window.showPage;
    window.showPage = function(p){
      orig(p);
      if(p === 'kpi'){ try{ loadKpi(); }catch(e){ console.error('loadKpi',e); } }
    };
    window.showPage.__kpiWrapped = true;
  }
}

// ── 4. NDIHMËSA ─────────────────────────────────────────────
function kFmt(n){ return (parseFloat(n)||0).toLocaleString('de-DE',{maximumFractionDigits:0}); }
function kEur(n){ return kFmt(n)+' €'; }
function kEsc(s){ return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }

// ── 5. LOGJIKA KRYESORE ─────────────────────────────────────
window.loadKpi = async function(){
  buildPage();
  var elC = document.getElementById('kpi-cards');
  if(!elC) return;
  if(typeof supaFetch !== 'function'){
    elC.innerHTML = '<div class="dash-none">Lidhja me bazën nuk është gati.</div>';
    return;
  }

  var today = new Date(); today.setHours(0,0,0,0);
  var iso = today.toISOString().slice(0,10);
  var dEl = document.getElementById('kpi-date');
  if(dEl) dEl.textContent = today.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long'});

  try{
    var res = await Promise.all([
      supaFetch('tasks?status=eq.hapur&select=id,title,due_date,priority,category,contact_email,project_id&order=due_date.asc&limit=100').catch(function(){return[];}),
      supaFetch('rfq_log?select=id,supplier_name,supplier_email,project_name,project_id,sent_at,replied_at,lang,last_followup_at,status&limit=200').catch(function(){return[];}),
      supaFetch('offers_inbox?processed=eq.false&select=id&limit=500').catch(function(){return[];}),
      supaFetch('invoices_out?select=id,invoice_nr,client,project,gross_amount,total_price,paid,paid_date,date,due_date,payment_terms&limit=200').catch(function(){return[];}),
      supaFetch('documents_registry?series=eq.QUO&select=doc_nr,project,client,total_eur,created_at,followup_status,offer_state,project_id&order=created_at.desc&limit=80').catch(function(){return[];}),
      supaFetch('projects?select=id,name,client&limit=60').catch(function(){return[];}),
      supaFetch('bom_items?select=project_id,kg&limit=3000').catch(function(){return[];}),
      supaFetch('bank_guarantees?select=id,bank_name,project,amount_guaranteed,expiry_date,status&limit=40').catch(function(){return[];}),
      supaFetch('invoices_in?select=id,supplier,amount,project,paid&limit=200').catch(function(){return[];})
    ]);

    var tasks=res[0]||[], rfqs=res[1]||[], inbox=res[2]||[], invOut=res[3]||[],
        quotes=res[4]||[], projs=res[5]||[], boms=res[6]||[], gars=res[7]||[], invIn=res[8]||[];

    var pName={}; projs.forEach(function(p){ pName[p.id]=p.name; });
    var kgBy={}; boms.forEach(function(b){ if(b.project_id) kgBy[b.project_id]=(kgBy[b.project_id]||0)+(parseFloat(b.kg)||0); });

    // Llogaritjet
    var tDue = tasks.filter(function(t){ return t.due_date && t.due_date <= iso; });
    var rfqWait = rfqs.filter(function(r){ return !r.replied_at && r.sent_at; });
    var rfqOver = rfqWait.filter(function(r){
      var base = r.last_followup_at || r.sent_at;
      return (today - new Date(base)) / 86400000 >= 7;
    });
    var unpaid = invOut.filter(function(i){ return !i.paid; });
    var unpaidSum = unpaid.reduce(function(s,i){ return s+(parseFloat(i.gross_amount)||parseFloat(i.total_price)||0); },0);
    var paidSum = invOut.filter(function(i){return i.paid;}).reduce(function(s,i){ return s+(parseFloat(i.gross_amount)||parseFloat(i.total_price)||0); },0);
    var qOpen = quotes.filter(function(q){ var s=q.followup_status||'open'; return s!=='won'&&s!=='lost'&&s!=='superseded'; });
    var pipeline = qOpen.reduce(function(s,q){ return s+(parseFloat(q.total_eur)||0); },0);
    var qSilent = qOpen.filter(function(q){ return q.created_at && (today-new Date(q.created_at))/86400000 >= 5; });
    var kgTot = Object.keys(kgBy).reduce(function(s,k){ return s+kgBy[k]; },0);
    var costIn = invIn.reduce(function(s,i){ return s+(parseFloat(i.amount)||0); },0);
    var gExp = gars.filter(function(g){ return g.status==='aktive'&&g.expiry_date&&(new Date(g.expiry_date)-today)/86400000<=30; });

    // Kartat
    var cards = [
      {l:'Pipeline i hapur', v:kEur(pipeline), s:qOpen.length+' oferta pa vendim', cls:'', go:"showPage('qendra')"},
      {l:'Detyra të vonuara', v:tDue.length, s:'nga '+tasks.length+' të hapura', cls:tDue.length?'risk':'', go:"showPage('qendra')"},
      {l:'RFQ mbi SLA', v:rfqOver.length, s:rfqWait.length+' në pritje total', cls:rfqOver.length?'risk':'', go:"showPage('rfq')"},
      {l:'Email pa analizë', v:inbox.length, s:'oferta të pashfrytëzuara', cls:inbox.length>20?'act':'', go:"showPage('qendra')"},
      {l:'Fatura të papaguara', v:kEur(unpaidSum), s:unpaid.length+' fatura të hapura', cls:unpaidSum>0?'act':'', go:"showPage('invoices')"},
      {l:'Arkëtuar', v:kEur(paidSum), s:'nga fatura të mbyllura', cls:'', go:"showPage('finance')"},
      {l:'Tonazh në BOM', v:kFmt(kgTot/1000)+' t', s:projs.length+' projekte', cls:'', go:"showPage('import')"},
      {l:'Kosto furnitorësh', v:kEur(costIn), s:invIn.length+' fatura hyrëse', cls:'', go:"showPage('invoices')"}
    ];
    elC.innerHTML = cards.map(function(c){
      return '<div class="kpi '+c.cls+'" onclick="'+c.go+'">'
        +'<div class="kpi-l">'+c.l+'</div>'
        +'<div class="kpi-v">'+c.v+'</div>'
        +'<div class="kpi-s">'+c.s+'</div></div>';
    }).join('');

    // Titulli dinamik
    var hl=document.getElementById('kpi-headline'), hs=document.getElementById('kpi-subline');
    if(hl){
      if(rfqOver.length){
        hl.textContent = rfqOver.length+' RFQ kanë kaluar afatin e ndjekjes';
        hs.textContent = 'Furnitorët heshtin mbi 7 ditë — pipeline-i bllokohet pa çmime.';
      } else if(tDue.length){
        hl.textContent = tDue.length+' detyra kërkojnë veprim sot';
        hs.textContent = 'Afatet kanë kaluar ose skadojnë sot.';
      } else if(inbox.length>20){
        hl.textContent = inbox.length+' oferta presin analizë';
        hs.textContent = 'Marzhat reale nuk llogariten derisa këto të procesohen.';
      } else if(unpaidSum>0){
        hl.textContent = kEur(unpaidSum)+' të papaguara';
        hs.textContent = unpaid.length+' fatura të hapura te klientët.';
      } else {
        hl.textContent = 'Gjithçka nën kontroll';
        hs.textContent = 'Asnjë alarm aktiv — kohë e mirë për outreach të ri.';
      }
    }

    // Alarmet
    var alerts = [];
    rfqOver.forEach(function(r){
      var d = Math.round((today - new Date(r.last_followup_at||r.sent_at))/86400000);
      alerts.push({p:1, cls:'r', t:'RFQ pa përgjigje: '+(r.supplier_name||r.supplier_email||''),
        s:(r.project_name||'')+' · dërguar '+new Date(r.sent_at).toLocaleDateString('de-DE'),
        v:d+' ditë', vc:'r',
        go: (typeof sendFollowup==='function')
          ? "sendFollowup('"+r.id+"','"+(r.supplier_email||'')+"','"+(r.lang||'en')+"','"+encodeURIComponent(r.project_name||'')+"','"+r.sent_at+"')"
          : "showPage('rfq')"});
    });
    tDue.slice(0,6).forEach(function(t){
      var d = Math.round((today - new Date(t.due_date))/86400000);
      alerts.push({p:2, cls: d>0?'r':'b', t:(t.title||'').replace('[AUTO] ',''),
        s:(pName[t.project_id]||t.category||''),
        v: d>0?('vonuar '+d+' d'):'SOT', vc: d>0?'r':'',
        go:"showPage('qendra')"});
    });
    qSilent.slice(0,5).forEach(function(q){
      var d = Math.round((today - new Date(q.created_at))/86400000);
      var os = q.offer_state || {};
      alerts.push({p:3, cls:'b', t:'Ofertë pa përgjigje: '+q.doc_nr,
        s:(q.client||'')+' · '+kEur(q.total_eur), v:d+' ditë', vc:'',
        go: (typeof followupQuote==='function')
          ? "followupQuote('"+q.doc_nr+"','"+encodeURIComponent(q.client||'')+"','"+encodeURIComponent(os.em||'')+"','"+(q.total_eur||'')+"','"+q.created_at+"','"+encodeURIComponent(os.lang||'de')+"','"+encodeURIComponent(q.project||'')+"')"
          : "showPage('oferta')"});
    });
    gExp.forEach(function(g){
      var d = Math.round((new Date(g.expiry_date) - today)/86400000);
      alerts.push({p:1, cls:'r', t:'Garanci bankare skadon: '+(g.bank_name||''),
        s:(g.project||'')+' · '+kEur(g.amount_guaranteed), v:d+' ditë', vc:'r',
        go:"showPage('finance')"});
    });
    if(inbox.length>0){
      alerts.push({p:4, cls:'n', t:inbox.length+' email me oferta pa analizë',
        s:'Marzhat reale mbeten të panjohura', v:'analizo', vc:'', go:"showPage('qendra')"});
    }
    alerts.sort(function(a,b){ return a.p-b.p; });

    var elA = document.getElementById('kpi-alerts');
    var elAn = document.getElementById('kpi-alert-n');
    if(elAn) elAn.textContent = alerts.length ? alerts.length+' pika' : '';
    if(elA){
      elA.innerHTML = alerts.length
        ? alerts.slice(0,12).map(function(a){
            return '<div class="al '+a.cls+'" onclick="'+a.go.replace(/"/g,'&quot;')+'">'
              +'<div class="al-b"><div class="al-t">'+a.t+'</div><div class="al-s">'+a.s+'</div></div>'
              +'<div class="al-v '+a.vc+'">'+a.v+'</div></div>';
          }).join('')
        : '<div class="dash-none">Asnjë alarm aktiv.</div>';
    }

    // Bars: projektet sipas tonazhit
    var pList = projs.map(function(p){ return {n:p.name, kg:kgBy[p.id]||0, id:p.id}; })
      .filter(function(x){ return x.kg>0; })
      .sort(function(a,b){ return b.kg-a.kg; })
      .slice(0,8);
    var maxKg = pList.length ? pList[0].kg : 1;
    var elB = document.getElementById('kpi-bars');
    if(elB){
      elB.innerHTML = pList.length
        ? pList.map(function(p){
            var pct = Math.max(3,(p.kg/maxKg)*100);
            var click = (typeof openOverview==='function') ? "openOverview('"+p.id+"')" : "showPage('import')";
            return '<div class="bar-row" style="cursor:pointer" onclick="'+click+'">'
              +'<div class="bar-lbl" title="'+kEsc(p.n)+'">'+(p.n||'').slice(0,17)+'</div>'
              +'<div class="bar-bg"><div class="bar-fi" style="width:'+pct+'%;background:var(--bronze)"></div></div>'
              +'<div class="bar-n">'+kFmt(p.kg/1000)+' t</div></div>';
          }).join('')
        : '<div class="dash-none">Asnjë BOM i ruajtur.</div>';
    }

    // Pipeline financiar
    var stages = [
      {l:'Ofertuar', v:pipeline, c:'var(--bronze)'},
      {l:'Faturuar', v:unpaidSum+paidSum, c:'#5C5A57'},
      {l:'Arkëtuar', v:paidSum, c:'var(--green)'}
    ];
    var maxV = Math.max.apply(null, stages.map(function(s){return s.v;})) || 1;
    var elF = document.getElementById('kpi-fin');
    if(elF){
      elF.innerHTML = stages.map(function(s){
        var pct = Math.max(3,(s.v/maxV)*100);
        return '<div class="bar-row"><div class="bar-lbl">'+s.l+'</div>'
          +'<div class="bar-bg"><div class="bar-fi" style="width:'+pct+'%;background:'+s.c+'"></div></div>'
          +'<div class="bar-n">'+kFmt(s.v/1000)+'k €</div></div>';
      }).join('')
      +'<div style="font-size:10.5px;color:var(--text3);margin-top:10px;line-height:1.6">'
      +'Konversion ofertë → faturë: <b>'+(pipeline>0?(((unpaidSum+paidSum)/pipeline)*100).toFixed(0):'0')+'%</b><br>'
      +'Arkëtim: <b>'+((unpaidSum+paidSum)>0?((paidSum/(unpaidSum+paidSum))*100).toFixed(0):'0')+'%</b> e faturuar</div>';
    }

    // SLA
    var replied = rfqs.filter(function(r){return r.replied_at;}).length;
    var slaB = [
      {l:'Me përgjigje', n:replied, c:'var(--green)'},
      {l:'Në pritje', n:Math.max(0,rfqWait.length-rfqOver.length), c:'var(--text3)'},
      {l:'Mbi 7 ditë', n:rfqOver.length, c:'var(--red-text)'}
    ];
    var maxS = Math.max.apply(null, slaB.map(function(s){return s.n;})) || 1;
    var elS = document.getElementById('kpi-sla');
    if(elS){
      elS.innerHTML = slaB.map(function(s){
        var pct = s.n ? Math.max(4,(s.n/maxS)*100) : 0;
        return '<div class="bar-row"><div class="bar-lbl">'+s.l+'</div>'
          +'<div class="bar-bg"><div class="bar-fi" style="width:'+pct+'%;background:'+s.c+'"></div></div>'
          +'<div class="bar-n">'+s.n+'</div></div>';
      }).join('')
      +'<div style="font-size:10.5px;color:var(--text3);margin-top:10px;line-height:1.6">'
      +'Norma e përgjigjes: <b>'+(rfqs.length?((replied/rfqs.length)*100).toFixed(0):'0')+'%</b><br>'
      +'SLA: 5 ditë kontakt i ri · 7 ditë post-ofertë</div>';
    }

  } catch(e){
    elC.innerHTML = '<div class="dash-none" style="color:var(--red-text)">Gabim: '+e.message+'</div>';
  }
};

// ── 6. INICIALIZIMI ─────────────────────────────────────────
function init(){
  buildPage();
  register();
  // Përditëso etiketën te "Detyrat" në ballinë
  setTimeout(function(){
    var e = document.getElementById('modstat-detyrat');
    if(e && !e.textContent.match(/Pasqyra/)) e.textContent = (e.textContent||'') + (e.textContent?' · ':'') + 'Pasqyra';
  }, 2500);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 600); });
} else {
  setTimeout(init, 600);
}

})();
