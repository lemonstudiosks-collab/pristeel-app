// ══════════════════════════════════════════════
// OUTREACH — pipeline prospektimi DACH (tabela outreach_contacts)
// ══════════════════════════════════════════════
var _outreach=[], _ocStatus='all';
async function loadOutreach(){
  var el=document.getElementById('outreach-list'); if(!el) return;
  el.innerHTML='<div class="hub-load">Duke ngarkuar…</div>';
  try{
    _outreach=await supaFetch('outreach_contacts?order=follow_up_date.asc.nullslast,master_no.asc&limit=2000')||[];
    renderOutreachStats();
    renderOutreach();
  }catch(e){ el.innerHTML='<div class="hub-none">Tabela "outreach_contacts" mungon ose gabim: '+e.message+'</div>'; }
}
function ocFilter(val){
  _ocStatus=val;
  document.querySelectorAll('#oc-status-tabs .seg-btn').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-k')===val); });
  renderOutreach();
}
function ocCountryFlag(cc){
  var m={DE:'🇩🇪',AT:'🇦🇹',CH:'🇨🇭',HR:'🇭🇷',TR:'🇹🇷',GR:'🇬🇷',MK:'🇲🇰',SI:'🇸🇮',NL:'🇳🇱',LU:'🇱🇺',PL:'🇵🇱',IT:'🇮🇹',AL:'🇦🇱',DK:'🇩🇰',BE:'🇧🇪',XK:'🇽🇰',MNE:'🇲🇪',ME:'🇲🇪',FR:'🇫🇷',CZ:'🇨🇿',BG:'🇧🇬'};
  return m[cc]||'';
}
function ocStatusColor(s){
  var m={Sent:'#5A6472',Replied:'#0F6E56',Meeting:'#6B4E9E',Scheduled:'#A65F2E',Bounced:'#B23B3B','Not Relevant':'#9AA1A8','Not Contacted':'#9AA1A8'};
  return m[s]||'#5A6472';
}
function renderOutreachStats(){
  var el=document.getElementById('oc-stats'); if(!el) return;
  var total=_outreach.length;
  var by=function(s){return _outreach.filter(function(c){return c.status===s;}).length;};
  var today=new Date().toISOString().slice(0,10);
  var overdue=_outreach.filter(function(c){return c.follow_up_date && c.follow_up_date<=today && c.status==='Sent';}).length;
  var cells=[['Gjithsej',total,'all'],['Sent',by('Sent'),'Sent'],['Replied',by('Replied'),'Replied'],['Meeting',by('Meeting'),'Meeting'],['Bounced',by('Bounced'),'Bounced'],['Follow-up i kaluar',overdue,'__overdue']];
  el.innerHTML=cells.map(function(c,i){
    return '<div onclick="ocStatClick(\''+c[2]+'\')" style="flex:1;min-width:90px;padding:12px 14px;cursor:pointer;'+(i?'border-left:1px solid var(--border)':'')+'" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">'
      +'<div style="font-size:19px;font-weight:680;color:'+(c[0]==='Follow-up i kaluar'&&c[1]>0?'#B23B3B':'var(--text)')+';letter-spacing:-.3px">'+c[1]+'</div>'
      +'<div style="font-size:9.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--text3);font-weight:600;margin-top:2px">'+c[0]+'</div>'
    +'</div>';
  }).join('');
}
function ocStatClick(val){
  var cb=document.getElementById('oc-overdue-only');
  if(val==='__overdue'){
    if(cb) cb.checked=true;
    ocFilter('all');
  } else {
    if(cb) cb.checked=false;
    ocFilter(val);
  }
}
function renderOutreach(){
  var el=document.getElementById('outreach-list'); if(!el) return;
  var q=((document.getElementById('oc-search')||{}).value||'').toLowerCase();
  var overdueOnly=(document.getElementById('oc-overdue-only')||{}).checked;
  var today=new Date().toISOString().slice(0,10);
  var list=_outreach.filter(function(c){
    if(_ocStatus!=='all' && c.status!==_ocStatus) return false;
    if(overdueOnly && !(c.follow_up_date && c.follow_up_date<=today && c.status==='Sent')) return false;
    if(!q) return true;
    return ((c.company_domain||'')+' '+(c.contact_email||'')+' '+(c.notes||'')+' '+(c.country||'')).toLowerCase().indexOf(q)>-1;
  });
  if(!list.length){ el.innerHTML='<div class="hub-none">Asnjë rezultat.'+(q?' Ndrysho kërkimin.':'')+'</div>'; return; }
  var h='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="text-align:left;border-bottom:1px solid var(--border)">'
      +'<th style="padding:8px 10px;color:var(--text3);font-size:10px;text-transform:uppercase;font-weight:600">Kompania</th>'
      +'<th style="padding:8px 10px;color:var(--text3);font-size:10px;text-transform:uppercase;font-weight:600">Email</th>'
      +'<th style="padding:8px 10px;color:var(--text3);font-size:10px;text-transform:uppercase;font-weight:600">Vendi</th>'
      +'<th style="padding:8px 10px;color:var(--text3);font-size:10px;text-transform:uppercase;font-weight:600">Statusi</th>'
      +'<th style="padding:8px 10px;color:var(--text3);font-size:10px;text-transform:uppercase;font-weight:600">Follow-up</th>'
      +'<th style="padding:8px 10px;color:var(--text3);font-size:10px;text-transform:uppercase;font-weight:600">Shënime</th>'
    +'</tr></thead><tbody>';
  h+=list.map(function(c){
    var fu=c.follow_up_date;
    var overdue=fu && fu<=today && c.status==='Sent';
    return '<tr onclick="openOutreachModal('+c.id+')" style="cursor:pointer;border-bottom:1px solid var(--border)" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">'
      +'<td style="padding:8px 10px;font-weight:600;color:var(--text)">'+(c.company_domain||'—')+'</td>'
      +'<td style="padding:8px 10px;color:var(--text2)">'+(c.contact_email||'—')+'</td>'
      +'<td style="padding:8px 10px">'+ocCountryFlag(c.country)+' '+(c.country||'')+'</td>'
      +'<td style="padding:8px 10px"><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:650;color:#fff;background:'+ocStatusColor(c.status)+'">'+(c.status||'—')+'</span></td>'
      +'<td style="padding:8px 10px;'+(overdue?'color:#B23B3B;font-weight:700':'color:var(--text3)')+'">'+(fu||'—')+(overdue?' ⚠':'')+'</td>'
      +'<td style="padding:8px 10px;color:var(--text3);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+String(c.notes||'').replace(/"/g,'&quot;')+'">'+(c.notes||'')+'</td>'
    +'</tr>';
  }).join('');
  h+='</tbody></table></div>';
  el.innerHTML=h;
}
function closeOutreachModal(){ var m=document.getElementById('outreach-modal'); if(m) m.remove(); }
function ocSaveField(id,field,val){
  var patch={}; patch[field]=val;
  supaFetch('outreach_contacts?id=eq.'+id,'PATCH',patch).then(function(){
    var c=_outreach.find(function(x){return x.id===id;}); if(c) c[field]=val;
    renderOutreachStats(); renderOutreach();
  }).catch(function(e){alert('Gabim: '+e.message);});
}
function openOutreachModal(id){
  var c=_outreach.find(function(x){return x.id===id;}); if(!c){alert('Nuk u gjet.');return;}
  var bg=document.createElement('div'); bg.className='pst-modal-bg'; bg.id='outreach-modal';
  bg.onclick=function(e){ if(e.target===bg) closeOutreachModal(); };
  var statusOpts=['Sent','Replied','Meeting','Scheduled','Bounced','Not Relevant','Not Contacted'];
  var selHtml='<select onchange="ocSaveField('+id+',\'status\',this.value)" style="width:100%;font-size:12.5px;padding:6px 9px;border:1px solid var(--border);border-radius:6px">'
    +statusOpts.map(function(s){return '<option value="'+s+'"'+(c.status===s?' selected':'')+'>'+s+'</option>';}).join('')+'</select>';
  var body='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">'
      +'<div style="font-size:15px;font-weight:700">'+(c.company_domain||'(pa domain)')+'</div>'
    +'</div>'
    +'<label class="lbl">Email kontakti</label>'
    +'<input type="text" value="'+String(c.contact_email||'').replace(/"/g,'&quot;')+'" onchange="ocSaveField('+id+',\'contact_email\',this.value)" style="width:100%;font-size:12.5px;padding:6px 9px;border:1px solid var(--border);border-radius:6px;margin-bottom:9px">'
    +'<label class="lbl">Vendi</label>'
    +'<input type="text" value="'+String(c.country||'').replace(/"/g,'&quot;')+'" onchange="ocSaveField('+id+',\'country\',this.value)" style="width:100%;font-size:12.5px;padding:6px 9px;border:1px solid var(--border);border-radius:6px;margin-bottom:9px">'
    +'<label class="lbl">Statusi</label>'+selHtml
    +'<div style="display:flex;gap:14px;margin:10px 0">'
      +['replied','meeting','closed'].map(function(f){
        return '<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text2);cursor:pointer;text-transform:capitalize">'
          +'<input type="checkbox" '+(c[f]?'checked':'')+' onchange="ocSaveField('+id+',\''+f+'\',this.checked)"> '+f+'</label>';
      }).join('')
    +'</div>'
    +'<label class="lbl">Touch 1</label>'
    +'<input type="date" value="'+(c.touch_1||'')+'" onchange="ocSaveField('+id+',\'touch_1\',this.value||null)" style="width:100%;font-size:12.5px;padding:6px 9px;border:1px solid var(--border);border-radius:6px;margin-bottom:9px">'
    +'<label class="lbl">Touch 2</label>'
    +'<input type="date" value="'+(c.touch_2||'')+'" onchange="ocSaveField('+id+',\'touch_2\',this.value||null)" style="width:100%;font-size:12.5px;padding:6px 9px;border:1px solid var(--border);border-radius:6px;margin-bottom:9px">'
    +'<label class="lbl">Follow-up (data e ardhshme)</label>'
    +'<input type="date" value="'+(c.follow_up_date||'')+'" onchange="ocSaveField('+id+',\'follow_up_date\',this.value||null)" style="width:100%;font-size:12.5px;padding:6px 9px;border:1px solid var(--border);border-radius:6px;margin-bottom:9px">'
    +'<label class="lbl">Shënime</label>'
    +'<textarea onchange="ocSaveField('+id+',\'notes\',this.value)" style="width:100%;min-height:80px;font-size:12px;padding:7px 9px;border:1px solid var(--border);border-radius:6px;resize:vertical">'+String(c.notes||'').replace(/</g,'&lt;')+'</textarea>'
    +'<div style="display:flex;gap:8px;margin-top:12px">'
      +(c.contact_email?'<button class="btn btn-sm" onclick="window.open(\'https://mail.google.com/mail/?view=cm&authuser=arianit.vllahiu%40prissteel.com&to='+encodeURIComponent(c.contact_email)+'\',\'_blank\')">✉ Dërgo Email</button>':'')
    +'</div>';
  bg.innerHTML='<div class="pst-modal" style="max-width:560px"><div class="pst-modal-hd"><div><div style="font-size:14px;font-weight:650">Kontakti — Outreach</div></div><span class="pst-modal-x" onclick="closeOutreachModal()">✕</span></div>'
    +'<div class="pst-modal-bd">'+body+'</div></div>';
  document.body.appendChild(bg);
}

async function loadHub(){
  await autoGenerateFollowups();
  loadTasks();
  var elP=document.getElementById('hub-projects'), elA=document.getElementById('hub-agenda'), elI=document.getElementById('hub-inbox');
  if(!elP) return;
  var today=new Date(); today.setHours(0,0,0,0);
  var dEl=document.getElementById('hub-date');
  if(dEl) dEl.textContent=today.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long'});
  try{
    var res=await Promise.all([
      supaFetch('projects?order=created_at.desc&limit=40').catch(function(){return[];}),
      supaFetch('documents_registry?series=eq.QUO&order=created_at.desc&limit=60').catch(function(){return[];}),
      supaFetch('offers?limit=250').catch(function(){return[];}),
      supaFetch('bom_items?select=project_id,kg&limit=2000').catch(function(){return[];}),
      supaFetch('invoices_out?limit=100').catch(function(){return[];}),
      supaFetch('rfq_log?limit=120').catch(function(){return[];}),
      supaFetch('project_docs?select=id,project_id,doc_type,title,status&limit=200').catch(function(){return[];}),
      supaFetch('offers_inbox?processed=eq.false&select=id,sender,subject,received_at&order=received_at.desc&limit=8').catch(function(){return[];}),
      supaFetch('offers_inbox?select=id,sender,subject,received_at,processed&order=received_at.desc&limit=300').catch(function(){return[];}),
      supaFetch('bank_guarantees?limit=30').catch(function(){return[];})
    ]);
    var projs=res[0]||[], quotes=res[1]||[], offs=res[2]||[], boms=res[3]||[],
        invs=res[4]||[], rfqs=res[5]||[], docs=res[6]||[], inbox=res[7]||[], allEmails=res[8]||[], gars=res[9]||[];

    var bomKg={}, bomN={};
    boms.forEach(function(b){ if(!b.project_id) return;
      bomKg[b.project_id]=(bomKg[b.project_id]||0)+(parseFloat(b.kg)||0);
      bomN[b.project_id]=(bomN[b.project_id]||0)+1; });

    var pipeline=0, urgentList=[];
    var cards=projs.map(function(p){
      var q=quotes.filter(function(x){return x.project_id===p.id;});
      var myOffer=q.length?q[0]:null;
      var so=offs.filter(function(x){return x.project_id===p.id;});
      var priced=so.filter(function(x){return (parseFloat(x.total_eur)||0)>0||(parseFloat(x.price_kg)||0)>0;});
      var silent=so.filter(function(x){return (parseFloat(x.total_eur)||0)===0&&(parseFloat(x.price_kg)||0)===0;});
      var pr=rfqs.filter(function(x){return x.project_id===p.id;});
      var pn=(p.name||'').toLowerCase().slice(0,10);
      var pkw=(p.name||'').toLowerCase().split(/[\s\-—]+/).filter(function(w){return w.length>4;});
      var pinv=invs.filter(function(x){
        var pj=(x.project||'').toLowerCase();
        if(pj.indexOf(pn)>-1) return true;
        return pkw.some(function(w){ return pj.indexOf(w)>-1; });
      });
      var pdocs=docs.filter(function(x){return x.project_id===p.id;});
      var paid=pinv.filter(function(x){return x.paid;});
      var kg=bomKg[p.id]||0;

      var supDomains=pr.map(function(x){var e=(x.supplier_email||'').split('@')[1]; return e?e.toLowerCase():null;}).filter(Boolean);
      var clientKw=((p.client||'').split(/[,(]/)[0]||'').toLowerCase().trim();
      var pemails=allEmails.filter(function(m){
        var s=(m.sender||'').toLowerCase();
        if(supDomains.some(function(d){return s.indexOf(d)>-1;})) return true;
        if(clientKw&&clientKw.length>4&&s.indexOf(clientKw.split(' ')[0])>-1) return true;
        return false;
      }).slice(0,5);

      var cSteel=null,cZinc=null,cTrans=null;
      so.forEach(function(o){
        var okg=parseFloat(o.qty_kg)||kg, pk=parseFloat(o.price_kg)||0, zk=parseFloat(o.zinc_kg)||0, te=parseFloat(o.transport_eur)||0;
        if(pk>0&&okg>0){var v=pk*okg; if(cSteel===null||v<cSteel)cSteel=v;}
        if(zk>0&&okg>0){var z=zk*okg; if(cZinc===null||z<cZinc)cZinc=z;}
        if(te>0&&(cTrans===null||te<cTrans))cTrans=te;
      });
      var sell=myOffer?(parseFloat(myOffer.total_eur)||0):0;
      var cost=(cSteel||0)+(cZinc||0)+(cTrans||0);
      var brk=myOffer&&myOffer.revenue_breakdown?myOffer.revenue_breakdown:null;
      var missing=[];
      if(brk){ if(brk.zinc>0&&!cZinc)missing.push('zinktim'); if(brk.transport>0&&!cTrans)missing.push('transport'); }
      if(!cSteel) missing.unshift('celik');
      var marg=(sell>0&&cost>0&&!missing.length)?((sell-cost)/sell*100):null;
      if(sell>0&&!paid.length) pipeline+=sell;

      var st={bom:kg>0, rfq:pr.length>0||so.length>0, kosto:priced.length>0&&!missing.length, oferte:!!myOffer, pagese:paid.length>0};
      var nowIdx=PJ_STEPS.length;
      for(var i2=0;i2<PJ_STEPS.length;i2++){ if(!st[PJ_STEPS[i2].k]){ nowIdx=i2; break; } }

      var rows=[];
      if(kg>0) rows.push({i:'\u2699',t:'<b>'+(bomN[p.id]||0)+' pozicione</b> \u00B7 '+hFmt(kg)+' kg'});
      if(myOffer){
        var os=myOffer.offer_state||{};
        var age=myOffer.created_at?hDays(today,new Date(myOffer.created_at)):0;
        rows.push({i:'\u25CF',t:'<b>'+myOffer.doc_nr+'</b> \u2014 '+hFmt(myOffer.total_eur)+' \u20AC \u00B7 derguar '+(myOffer.created_at?new Date(myOffer.created_at).toLocaleDateString('de-DE'):'')+(age>=7?' \u00B7 '+age+' dite pa pergjigje':''),
          w:age>=14,
          a:'Ndjekje', f:"followupQuote('"+myOffer.doc_nr+"','"+encodeURIComponent(myOffer.client||'')+"','"+encodeURIComponent(os.em||'')+"','"+(myOffer.total_eur||'')+"','"+myOffer.created_at+"','"+encodeURIComponent(os.lang||'de')+"','"+encodeURIComponent(myOffer.project||'')+"')"});
      }
      priced.forEach(function(o){
        var bits=[];
        if(parseFloat(o.price_kg)>0) bits.push(parseFloat(o.price_kg).toFixed(2).replace('.',',')+' \u20AC/kg');
        if(parseFloat(o.zinc_kg)>0) bits.push('zinktim '+parseFloat(o.zinc_kg).toFixed(2).replace('.',','));
        if(parseFloat(o.transport_eur)>0) bits.push('transport '+hFmt(o.transport_eur)+' \u20AC');
        rows.push({i:'\u25AA',t:'<b>'+(o.supplier||'').split('(')[0].trim()+'</b> \u2014 '+(bits.join(' \u00B7 ')||hFmt(o.total_eur)+' \u20AC')});
      });
      silent.forEach(function(o){
        var rr=pr.filter(function(x){return (x.supplier_name||'').slice(0,8)===(o.supplier||'').slice(0,8);})[0];
        var ag=rr&&rr.sent_at?hDays(today,new Date(rr.sent_at)):null;
        rows.push({i:'\u25CB',w:ag!==null&&ag>=3,t:'<b>'+(o.supplier||'').split('(')[0].trim()+'</b> \u2014 pa cmim'+(ag!==null?' \u00B7 '+ag+' dite':''),
          a:rr?'Perkujto':'', f:rr?"sendFollowup('"+rr.id+"','"+rr.supplier_email+"','"+(rr.lang||'en')+"','"+encodeURIComponent(rr.project_name||'')+"','"+rr.sent_at+"')":''});
      });
      if(missing.length&&sell>0) rows.push({i:'\u26A0',w:true,t:'<b>Marzha e panjohur</b> \u2014 mungon kosto e '+missing.join(' dhe ')});
      pinv.forEach(function(iv){
        rows.push({i:iv.paid?'\u2713':'\u25B3',t:'<b>'+iv.invoice_nr+'</b> \u2014 '+hFmt(iv.gross_amount||iv.total_price)+' \u20AC \u00B7 '+(iv.paid?'paguar '+(iv.paid_date?new Date(iv.paid_date).toLocaleDateString('de-DE'):''):'e hapur')});
      });
      pdocs.filter(function(d){return d.doc_type==='kontrate'||d.doc_type==='nenkontrate';}).forEach(function(d){
        rows.push({i:'\u25A0',t:'<b>'+d.title+'</b> \u00B7 '+(d.status||'')});
      });
      gars.filter(function(g){ return g.project_id===p.id || (g.project||'').toLowerCase().indexOf(pn)>-1; }).forEach(function(g){
        var gd=g.expiry_date?hDays(new Date(g.expiry_date), today):null;
        rows.push({i:'\u25C7', w:gd!==null&&gd<=30,
          t:'<b>Garanci bankare</b> \u2014 '+hFmt(g.amount_guaranteed)+' \u20AC \u00B7 '+(g.bank_name||'')
            +(g.expiry_date?' \u00B7 skadon '+new Date(g.expiry_date).toLocaleDateString('de-DE')+(gd!==null?' ('+gd+' dite)':''):'')});
      });
      (window.PST_DEADLINES||[]).forEach(function(dl){
        if(!dl.project||(p.name||'').toUpperCase().indexOf(dl.project.toUpperCase())===-1) return;
        var dd=hDays(new Date(dl.date), today);
        if(dd<-30||dd>60) return;
        if(dd<=7) urgentList.push({t:dl.title,p:p.name,d:dd});
        rows.push({i:'\u25C6',w:dd<=7,t:'<b>'+dl.title+'</b> \u2014 '+(dd>=0?dd+' dite':'skaduar')+' \u00B7 '+dl.detail,
          a:'Kalendar', f:"addToCalendar('"+hEsc(dl.title)+"','"+hEsc(dl.detail)+"','"+new Date(dl.date).toISOString()+"')"});
      });

      var mCol=marg===null?'var(--text3)':(marg<6?'#A33':(marg<10?'var(--text2)':'var(--green-text)'));
      return '<div class="pj" id="pj-'+p.id+'">'
        +'<div class="pj-head" onclick="document.getElementById(\'pj-'+p.id+'\').classList.toggle(\'open\')">'
          +'<div style="min-width:0"><div class="pj-name">'+(p.name||'Pa emer')+'</div>'
          +'<div class="pj-client">'+((p.client||'').split(',')[0])+(kg>0?' \u00B7 '+hFmt(kg)+' kg':'')+'</div></div>'
          +'<div style="text-align:right;flex-shrink:0">'
            +(sell>0?'<div class="pj-val">'+hFmt(sell)+' \u20AC</div>':'<div class="pj-val" style="color:var(--text3)">\u2014</div>')
            +'<div class="pj-margin" style="color:'+mCol+'">'+(marg!==null?'marzha '+marg.toFixed(1).replace('.',',')+'%':(missing.length&&sell>0?'marzha e panjohur':'&nbsp;'))+'</div>'
          +'</div></div>'
        +'<div class="pj-flow">'+PJ_STEPS.map(function(s,i3){
            var cls=st[s.k]?'done':(i3===nowIdx?'now':'');
            return '<div class="pj-step '+cls+'"><div class="pj-dot"></div><div class="pj-lbl">'+s.l+'</div></div>';
          }).join('')+'</div>'
        +'<div class="pj-body">'
        +(pemails.length?'<div style="font-size:10px;font-weight:700;letter-spacing:.5px;color:var(--text3);margin:2px 0 6px">EMAILAT E LIDHUR ('+pemails.length+')</div>'
          +pemails.map(function(m){
            var from=(m.sender||'').replace(/<.*/,'').replace(/"/g,'').trim()||m.sender;
            return '<div class="pj-row"><span class="pj-row-ico">✉</span><span class="pj-row-txt"><b>'+from+'</b> — '+(m.subject||'')+'</span></div>';
          }).join('')+'<div style="margin-bottom:10px"></div>':'')
        +(rows.length?rows.map(function(r){
            return '<div class="pj-row"><span class="pj-row-ico">'+r.i+'</span>'
              +'<span class="pj-row-txt'+(r.w?' pj-warn':'')+'">'+r.t+'</span>'
              +(r.a&&r.f?'<span class="pj-row-act" onclick="event.stopPropagation();'+r.f.replace(/"/g,'&quot;')+'">'+r.a+' \u2192</span>':'')
            +'</div>';
          }).join(''):'<div class="hub-none">Ende pa aktivitet.</div>')
        +'<div style="font-size:10px;font-weight:700;letter-spacing:.5px;color:var(--text3);margin:12px 0 6px">SHËNIME</div>'
        +'<textarea id="pj-notes-'+p.id+'" placeholder="Shto shënim për këtë projekt…" style="width:100%;min-height:50px;font-size:11.5px;padding:7px 9px;border:1px solid var(--border);border-radius:7px;resize:vertical" onclick="event.stopPropagation()">'+(p.notes||'')+'</textarea>'
        +'<div style="margin-top:6px"><button class="btn btn-sm" onclick="event.stopPropagation();saveProjectNotes(\''+p.id+'\')">Ruaj shënimin</button></div>'
        +'<div style="margin-top:9px;display:flex;gap:7px">'
        +'<button class="btn btn-sm" onclick="event.stopPropagation();loadProject(\''+p.id+'\')" title="Hap hapësirën e punës (BOM, RFQ, Çmimet, Oferta) për të vazhduar punën në këtë projekt">Puno me projektin</button>'
        +'<button class="btn btn-sm" onclick="event.stopPropagation();openOverview(\''+p.id+'\')" title="Hap pasqyrën e plotë të projektit: të gjitha ofertat, faturat, dokumentet dhe marzha, vetëm për këtë projekt">Pasqyra</button></div>'
        +'</div></div>';
    });
    elP.innerHTML=cards.length?cards.join(''):'<div class="hub-none">Ende pa projekte.</div>';

    var hl=document.getElementById('hub-headline'), hs=document.getElementById('hub-sub');
    if(hl){
      if(urgentList.length){ hl.textContent=urgentList[0].t;
        hs.textContent=urgentList[0].p+' \u00B7 '+(urgentList[0].d>=0?urgentList[0].d+' dite':'ka skaduar')+(urgentList.length>1?' \u2014 dhe '+(urgentList.length-1)+' te tjera':''); }
      else if(inbox.length){ hl.textContent=inbox.length+' dokumente presin analize';
        hs.textContent='Ofertat e furnitoreve nuk hyjne ne llogaritje derisa te analizohen.'; }
      else { hl.textContent='Asgje urgjente'; hs.textContent='Kohe e mire per te kontaktuar bleres te rinj.'; }
    }
    var hst=document.getElementById('hub-stats');
    if(hst){
      var paidTot=invs.filter(function(i4){return i4.paid;}).reduce(function(s,i5){return s+(parseFloat(i5.gross_amount)||parseFloat(i5.total_price)||0);},0);
      var openQuotes=quotes.filter(function(q2){return (q2.followup_status||'open')==='open';});
      var openQuotesVal=openQuotes.reduce(function(s,q3){return s+(parseFloat(q3.total_eur)||0);},0);
      var todayMs=today.getTime();
      var overdueInv=invs.filter(function(i6){
        if(i6.paid) return false;
        var due=i6.due_date?new Date(i6.due_date):(i6.date?new Date(i6.date):null);
        if(!due) return false;
        if(!i6.due_date) due.setDate(due.getDate()+parseDueDays(i6.payment_terms));
        return due.getTime()<todayMs;
      });
      var overdueVal=overdueInv.reduce(function(s,i7){return s+(parseFloat(i7.gross_amount)||parseFloat(i7.total_price)||0);},0);
      var expiringGuars=(gars||[]).filter(function(g2){
        if(!g2.expiry_date||g2.status!=='aktive') return false;
        var d3=hDays(new Date(g2.expiry_date),today);
        return d3>=0&&d3<=30;
      });
      hst.innerHTML='<div><div class="hub-stat-v">'+hFmt(pipeline)+' \u20AC</div><div class="hub-stat-l">Në pritje</div></div>'
        +'<div><div class="hub-stat-v">'+hFmt(paidTot)+' \u20AC</div><div class="hub-stat-l">Arkëtuar</div></div>'
        +'<div><div class="hub-stat-v">'+projs.length+'</div><div class="hub-stat-l">Projekte</div></div>'
        +'<div style="cursor:pointer" onclick="showPage(\'offer-archive\')" title="Oferta ende pa vendim (fituar/humbur)"><div class="hub-stat-v" style="color:'+(openQuotes.length?'var(--bronze)':'inherit')+'">'+openQuotes.length+'</div><div class="hub-stat-l">Oferta pa vendim'+(openQuotesVal?' · '+hFmt(openQuotesVal)+' €':'')+'</div></div>'
        +'<div style="cursor:pointer" onclick="showPage(\'invoices\')" title="Fatura të papaguara me afat të kaluar"><div class="hub-stat-v" style="color:'+(overdueInv.length?'var(--red-text)':'inherit')+'">'+overdueInv.length+'</div><div class="hub-stat-l">Fatura të vonuara'+(overdueVal?' · '+hFmt(overdueVal)+' €':'')+'</div></div>'
        +'<div style="cursor:pointer" onclick="showPage(\'finance\')" title="Garanci bankare që skadojnë brenda 30 ditësh"><div class="hub-stat-v" style="color:'+(expiringGuars.length?'var(--red-text)':'inherit')+'">'+expiringGuars.length+'</div><div class="hub-stat-l">Garanci që skadojnë</div></div>';
    }

    if(elA){
      var ev=[];
      (window.PST_DEADLINES||[]).forEach(function(dl){
        var dd=hDays(new Date(dl.date), today);
        if(dd>=-3&&dd<=45) ev.push({date:new Date(dl.date),t:dl.title,s:(dl.project||'')+' \u00B7 '+dl.detail,u:dd<=7});
      });
      quotes.forEach(function(qq){
        if(!qq.created_at) return;
        var ag2=hDays(today,new Date(qq.created_at));
        if(ag2>=7) ev.push({date:new Date(today.getTime()+86400000),
          t:'Ndjekje: '+(qq.client||'').split(' ')[0]+' \u2014 '+qq.doc_nr,
          s:hFmt(qq.total_eur)+' \u20AC \u00B7 '+ag2+' dite pa pergjigje', u:ag2>=21});
      });
      if(_gCalToken){ var gcalEv=await fetchGoogleCalendarEvents(); ev=ev.concat(gcalEv); }
      ev.sort(function(a,b){return a.date-b.date;});
      elA.innerHTML=ev.length?ev.slice(0,7).map(function(e){
        return '<div class="ag'+(e.u?' urgent':'')+'">'
          +'<div class="ag-when"><div class="ag-d">'+e.date.getDate()+'</div>'
          +'<div class="ag-m">'+e.date.toLocaleDateString('de-DE',{month:'short'}).replace('.','')+'</div></div>'
          +'<div class="ag-body"><div class="ag-t">'+e.t+'</div><div class="ag-s">'+e.s+'</div></div></div>';
      }).join(''):'<div class="hub-none">Asnje afat ne 45 ditet e ardhshme.</div>';
    }
    if(elI){
      elI.innerHTML=inbox.length?inbox.map(function(r){
        var from=(r.sender||'').replace(/<.*/,'').replace(/"/g,'').trim()||r.sender;
        return '<div class="ib"><span style="opacity:.55">\u25AB</span><div class="ib-body">'
          +'<div class="ib-from">'+from+'</div><div class="ib-sub">'+(r.subject||'')+'</div></div>'
          +'<span class="pj-row-act" onclick="qAnalyzeOffer(\''+r.id+'\',\''+hEsc(r.subject)+'\',\''+hEsc(r.sender)+'\')">Analizo</span></div>';
      }).join(''):'<div class="hub-none">Inbox-i i paster.</div>';
    }
  }catch(e){ elP.innerHTML='<div class="hub-none" style="color:#A33">Gabim: '+e.message+'</div>'; }
}
