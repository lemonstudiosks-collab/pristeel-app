/* PRISTEEL project-first BOM preview v1
 * Keeps document-derived BOM review inside Project-first. Intercepts only the Dukley BOM document button.
 * Source truth first: original PDF designation is preserved; normalized type is display/processing metadata.
 * No database write occurs until the user explicitly clicks Ruaj BOM.
 */
(function(){
'use strict';
if(window.__pstProjectFirstBomPreviewV1)return;
window.__pstProjectFirstBomPreviewV1=true;

function E(id){return document.getElementById(id);}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function num(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function api(){return window.PSTProjectBomDocumentExtractV1||null;}
function data(){return window.__pstIntegrityLastData||null;}
function pid(){var d=data();return String(window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'');}
function projectIsDukley(){var d=data(),p=d&&d.project,n=String(p&&p.name||'').toLowerCase();return n.indexOf('dukley')>-1;}
function rows(){
  var a=api(),src=a&&a.source||{},g=a&&Array.isArray(a.groups)?a.groups:[];
  return g.map(function(x,i){
    return{
      pos:i+1,
      original:String(x[3]||'').trim(),
      normType:String(x[0]||'').trim(),
      dim:String(x[1]||'').trim(),
      kg:num(x[2]),
      grade:src.grade||'S235JR'
    };
  });
}
function total(rs){return +rs.reduce(function(s,r){return s+num(r.kg);},0).toFixed(2);}
function host(){return E('pst-pi-body');}
function remove(){var x=E('pst-pf2-bom-preview');if(x)x.remove();}
function css(){
  if(E('pst-pf2-bom-preview-css'))return;
  var s=document.createElement('style');s.id='pst-pf2-bom-preview-css';s.textContent='\
#pst-pf2-bom-preview{margin:12px 0;border:1px solid #cfe1e7;background:#fff;border-radius:13px;overflow:hidden}#pst-pf2-bom-preview .pbp-h{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 14px;border-bottom:1px solid #e6eef1;background:#f8fbfc}#pst-pf2-bom-preview .pbp-h b{display:block;font-size:11px;color:#315f72}#pst-pf2-bom-preview .pbp-h span{display:block;font-size:8px;color:#7f8c92;margin-top:2px}#pst-pf2-bom-preview .pbp-actions{display:flex;gap:7px}#pst-pf2-bom-preview button{height:32px;border-radius:8px;padding:0 11px;font-size:8.5px;font-weight:750;cursor:pointer;border:1px solid #d6e3e7;background:#fff;color:#456d7e}#pst-pf2-bom-preview button.primary{background:#5b9bb3;border-color:#5b9bb3;color:#fff}#pst-pf2-bom-preview button:disabled{opacity:.55;cursor:default}.pbp-wrap{overflow:auto}.pbp-table{width:100%;border-collapse:collapse;min-width:760px}.pbp-table th{font-size:7px;text-transform:uppercase;letter-spacing:.45px;color:#88959a;text-align:left;padding:8px 10px;border-bottom:1px solid #e7edef;background:#fbfcfd}.pbp-table td{font-size:8.5px;color:#506068;padding:8px 10px;border-bottom:1px solid #edf2f3}.pbp-table td.kg{text-align:right;font-weight:700;color:#33464e}.pbp-table tr:last-child td{border-bottom:0}.pbp-foot{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:11px 14px;border-top:1px solid #e6eef1;background:#f8fbfc}.pbp-foot span{font-size:8px;color:#6f7d83}.pbp-foot b{font-size:12px;color:#2f657a}.pbp-status{padding:9px 14px;font-size:8px;color:#6d7b81;border-top:1px solid #edf2f3}.pbp-status.ok{color:#2f7657;background:#f2faf5}.pbp-status.err{color:#a64b42;background:#fff5f3}';
  document.head.appendChild(s);
}
function renderPreview(){
  if(!projectIsDukley())return false;
  var h=host(),a=api(),src=a&&a.source||{},rs=rows();if(!h||!rs.length)return false;
  css();remove();
  var x=document.createElement('section');x.id='pst-pf2-bom-preview';
  x.innerHTML='<div class="pbp-h"><div><b>Preview BOM · Çeliku strukturor</b><span>'+esc(src.file||'Dokumenti')+' · '+rs.length+' grupe · ende pa ruajtur</span></div><div class="pbp-actions"><button type="button" data-pbp-close>Mbyll preview</button><button type="button" class="primary" data-pbp-save>Ruaj BOM</button></div></div>'
    +'<div class="pbp-wrap"><table class="pbp-table"><thead><tr><th>Pos.</th><th>Profili origjinal</th><th>Tipi i normalizuar</th><th>Dimensioni</th><th>Grada</th><th style="text-align:right">Kg</th></tr></thead><tbody>'
    +rs.map(function(r){return'<tr><td>'+r.pos+'</td><td><b>'+esc(r.original)+'</b></td><td>'+esc(r.normType)+'</td><td>'+esc(r.dim)+'</td><td>'+esc(r.grade)+'</td><td class="kg">'+r.kg.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td></tr>';}).join('')
    +'</tbody></table></div><div class="pbp-foot"><span>Scope: vetëm profile + pllaka S235JR. Emërtimi origjinal ruhet nga PDF-ja; tipi i normalizuar përdoret vetëm për përpunim teknik. Pa standarde/certifikata të supozuara. Pa armaturë, sandwich panel, Alubond, OSB, izolime/finitura dhe pa +3% spojna sredstva.</span><b>'+total(rs).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg</b></div><div class="pbp-status">Preview vetëm. Asgjë nuk është shkruar në databazë.</div>';
  var anchor=E('pst-doc-bom-pf2');if(anchor&&anchor.parentNode)anchor.insertAdjacentElement('afterend',x);else h.insertBefore(x,h.firstChild);
  x.querySelector('[data-pbp-close]').onclick=remove;
  x.querySelector('[data-pbp-save]').onclick=save;
  return true;
}
async function save(){
  var id=pid(),d=data(),rs=rows(),box=E('pst-pf2-bom-preview'),btn=box&&box.querySelector('[data-pbp-save]'),st=box&&box.querySelector('.pbp-status');
  if(!id||!d||!d.project||String(d.project.id)!==id)return alert('Identiteti i projektit nuk u verifikua. BOM nuk u ruajt.');
  if(total(rs)!==25828.74)return alert('Kontrolli i totalit deshtoi. BOM nuk u ruajt.');
  if(typeof window.supaFetch!=='function')return alert('Lidhja me databazen nuk eshte gati.');
  if(!confirm('Ruaj 18 grupet e verifikuara te celikut strukturor ne BOM-in e projektit Dukley?\n\nTotali: 25.828,74 kg\n\nEmertimet ruhen sipas PDF-se. Nuk ruhen standarde ose certifikata te supozuara.'))return;
  try{
    if(btn){btn.disabled=true;btn.textContent='Duke ruajtur…';}
    var existing=await window.supaFetch('bom_items?project_id=eq.'+encodeURIComponent(id)+'&select=id,kg&limit=5000');
    existing=Array.isArray(existing)?existing:[];
    if(existing.length){
      var exTotal=+existing.reduce(function(s,r){return s+num(r.kg);},0).toFixed(2);
      if(Math.abs(exTotal-25828.74)>=0.01&&!confirm('Ky projekt ka tashme '+existing.length+' pozicione BOM ('+exTotal.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg).\n\nA deshiron t\'i zevendesosh me BOM-in e verifikuar 25.828,74 kg?')){if(btn){btn.disabled=false;btn.textContent='Ruaj BOM';}return;}
      await window.supaFetch('bom_items?project_id=eq.'+encodeURIComponent(id),'DELETE');
    }
    var payload=rs.map(function(r){
      return{
        project_id:id,
        profile:r.original,
        dim:r.dim,
        grade:r.grade,
        std:'',
        len_mm:0,
        pcs:1,
        kg:r.kg,
        surface:'',
        cert:''
      };
    });
    await window.supaFetch('bom_items','POST',payload);
    var verify=await window.supaFetch('bom_items?project_id=eq.'+encodeURIComponent(id)+'&select=profile,dim,grade,std,cert,surface,kg&limit=5000');
    verify=Array.isArray(verify)?verify:[];
    var vt=+verify.reduce(function(s,r){return s+num(r.kg);},0).toFixed(2);
    var assumptions=verify.some(function(r){return String(r.std||'').trim()||String(r.cert||'').trim();});
    var sourceOk=verify[0]&&String(verify[0].profile||'').trim()==='IPB400';
    if(verify.length!==18||Math.abs(vt-25828.74)>=0.01||assumptions||!sourceOk)throw new Error('Verifikimi pas ruajtjes deshtoi.');
    if(st){st.className='pbp-status ok';st.textContent='✓ BOM u ruajt dhe u verifikua: 18 grupe · 25.828,74 kg · emërtimet origjinale të ruajtura.';}
    if(btn){btn.textContent='✓ U ruajt';btn.disabled=true;}
    try{
      if(window.PSTProjectDataIntegrity&&window.PSTProjectDataIntegrity.load){
        var fresh=await window.PSTProjectDataIntegrity.load(id);
        window.__pstIntegrityLastData=fresh;
        if(window.PSTProjectFirstV2&&window.PSTProjectFirstV2.render)window.PSTProjectFirstV2.render('bom');
      }
    }catch(e){}
  }catch(e){
    console.error('PF2 BOM save:',e);
    if(st){st.className='pbp-status err';st.textContent='BOM nuk u ruajt: '+(e.message||e);}
    if(btn){btn.disabled=false;btn.textContent='Ruaj BOM';}
  }
}
function intercept(e){
  var b=e.target&&e.target.closest?e.target.closest('#pst-doc-bom-pf2-open'):null;
  if(!b)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  renderPreview();
}
document.addEventListener('click',intercept,true);
window.PSTProjectFirstBomPreviewV1={render:renderPreview,save:save,rows:rows,total:function(){return total(rows());}};
})();
