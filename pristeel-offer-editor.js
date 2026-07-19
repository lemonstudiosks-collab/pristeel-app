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
.oe-combo{position:relative}
.oe-drop{display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);
  border-radius:8px;margin-top:3px;max-height:230px;overflow-y:auto;z-index:50;box-shadow:0 8px 24px rgba(20,25,30,.14)}
.oe-drop.on{display:block}
.oe-drop-item{padding:7px 11px;font-size:12.5px;cursor:pointer;display:flex;align-items:center;gap:7px}
.oe-drop-item:hover{background:var(--bg2)}
.oe-drop-c{color:var(--text3);font-size:11px}
.oe-drop-new{color:var(--bronze);font-weight:600;border-top:1px solid var(--border)}
.oe-drop-empty{padding:9px 11px;font-size:12px;color:var(--text3)}
.oe-flag{font-size:15px;line-height:1}
.oe-kindbtn{width:30px;height:30px;border:1.5px solid var(--border);border-radius:7px;background:#fff;
  cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--text3);
  transition:all .12s ease}
.oe-kindbtn:hover{border-color:var(--bronze);color:var(--bronze)}
.oe-kindbtn.set{border-color:var(--bronze);background:var(--bronze-bg);color:var(--bronze);font-weight:700}
.oe-calcrow.hidden{display:none}
.oe-calcbox{background:var(--bg2);border:1px solid var(--border);border-radius:9px;padding:12px 14px;margin:2px 0 8px}
.oe-calcgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;align-items:end}
@media(max-width:900px){.oe-calcgrid{grid-template-columns:repeat(3,1fr)}}
.oe-calcgrid label{display:block;font-size:9.5px;letter-spacing:.4px;text-transform:uppercase;color:var(--text3);font-weight:600;margin-bottom:3px}
.oe-calcgrid input,.oe-calcgrid select{width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px}
.oe-calcres{margin-top:9px;padding-top:9px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:12px}
.oe-calcres b{font-size:14px;color:var(--bronze)}
`;
document.head.appendChild(css);

// ── GJENDJA ─────────────────────────────────────────────────
var S = { id:null, projectId:null, pos:[], suppliers:[], projects:[] };

var COUNTRIES = [
  {c:'XK',n:'Kosovë',f:'🇽🇰'},
  {c:'AL',n:'Shqipëri',f:'🇦🇱'},
  {c:'MK',n:'Maqedoni e Veriut',f:'🇲🇰'},
  {c:'RS',n:'Serbi',f:'🇷🇸'},
  {c:'ME',n:'Mali i Zi',f:'🇲🇪'},
  {c:'BA',n:'Bosnjë dhe Hercegovinë',f:'🇧🇦'},
  {c:'HR',n:'Kroaci',f:'🇭🇷'},
  {c:'SI',n:'Slloveni',f:'🇸🇮'},
  {c:'BG',n:'Bullgari',f:'🇧🇬'},
  {c:'RO',n:'Rumani',f:'🇷🇴'},
  {c:'GR',n:'Greqi',f:'🇬🇷'},
  {c:'TR',n:'Turqi',f:'🇹🇷'},
  {c:'DE',n:'Gjermani',f:'🇩🇪'},
  {c:'AT',n:'Austri',f:'🇦🇹'},
  {c:'CH',n:'Zvicër',f:'🇨🇭'},
  {c:'IT',n:'Itali',f:'🇮🇹'},
  {c:'FR',n:'Francë',f:'🇫🇷'},
  {c:'NL',n:'Holandë',f:'🇳🇱'},
  {c:'BE',n:'Belgjikë',f:'🇧🇪'},
  {c:'LU',n:'Luksemburg',f:'🇱🇺'},
  {c:'GB',n:'Mbretëria e Bashkuar',f:'🇬🇧'},
  {c:'IE',n:'Irlandë',f:'🇮🇪'},
  {c:'PL',n:'Poloni',f:'🇵🇱'},
  {c:'CZ',n:'Çeki',f:'🇨🇿'},
  {c:'SK',n:'Sllovaki',f:'🇸🇰'},
  {c:'HU',n:'Hungari',f:'🇭🇺'},
  {c:'UA',n:'Ukrainë',f:'🇺🇦'},
  {c:'RU',n:'Rusi',f:'🇷🇺'},
  {c:'ES',n:'Spanjë',f:'🇪🇸'},
  {c:'PT',n:'Portugali',f:'🇵🇹'},
  {c:'SE',n:'Suedi',f:'🇸🇪'},
  {c:'NO',n:'Norvegji',f:'🇳🇴'},
  {c:'DK',n:'Danimarkë',f:'🇩🇰'},
  {c:'FI',n:'Finlandë',f:'🇫🇮'},
  {c:'CN',n:'Kinë',f:'🇨🇳'},
  {c:'IN',n:'Indi',f:'🇮🇳'},
  {c:'US',n:'ShBA',f:'🇺🇸'},
  {c:'AE',n:'Emiratet e Bashkuara Arabe',f:'🇦🇪'},
  {c:'EG',n:'Egjipt',f:'🇪🇬'},
  {c:'SA',n:'Arabia Saudite',f:'🇸🇦'}
];

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
     +'<div class="oe-f oe-combo"><label>Furnitori</label>'
       +'<input id="oe-sup-q" autocomplete="off" placeholder="Shkruaj për të kërkuar…" oninput="pstSupFilter()" onfocus="pstSupFilter()" onblur="setTimeout(function(){var d=document.getElementById(\'oe-sup-drop\');if(d)d.classList.remove(\'on\');},180)">'
       +'<input type="hidden" id="oe-sup">'
       +'<div class="oe-drop" id="oe-sup-drop"></div>'
       +'<div class="oe-hint">Kërko te lista, ose shkruaj emër të ri për ta regjistruar</div></div>'
     +'<div class="oe-f"><label>Projekti</label><select id="oe-proj"></select></div>'
   +'</div>'
   +'<div class="oe-newsup" id="oe-newsup">'
     +'<div class="oe-g oe-g3">'
       +'<div class="oe-f"><label>Emri i furnitorit *</label><input id="ns-name" placeholder="p.sh. Makstil AD"></div>'
       +'<div class="oe-f oe-combo"><label>Vendi</label>'
         +'<input id="ns-country-q" autocomplete="off" placeholder="Kërko shtetin…" oninput="pstCountryFilter(\'ns\')" onfocus="pstCountryFilter(\'ns\')" onblur="setTimeout(function(){var d=document.getElementById(\'ns-country-drop\');if(d)d.classList.remove(\'on\');},180)">'
         +'<input type="hidden" id="ns-country">'
         +'<div class="oe-drop" id="ns-country-drop"></div></div>'
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
     +'<th style="width:3%"></th><th style="width:29%">Përshkrimi</th><th style="width:11%">Sasia</th><th style="width:8%">Njësia</th>'
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
     +'<div class="oe-f oe-combo"><label>Prejardhja</label>'
       +'<input id="oe-origin-q" autocomplete="off" placeholder="Kërko shtetin…" oninput="pstCountryFilter(\'oe-origin\')" onfocus="pstCountryFilter(\'oe-origin\')" onblur="setTimeout(function(){var d=document.getElementById(\'oe-origin-drop\');if(d)d.classList.remove(\'on\');},180)">'
       +'<input type="hidden" id="oe-origin">'
       +'<div class="oe-drop" id="oe-origin-drop"></div></div>'
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

// ── POZICIONET ────────────────────────────────────────────────
var KIND_LABELS = {other:'—', plate:'Pllakë', ihprofile:'Profil I/H', hollow:'Tub/Kuti', angle:'Kënd', flat:'Sheshtë'};
var KIND_ICON = {other:'•', plate:'▭', ihprofile:'I', hollow:'▢', angle:'∟', flat:'▬'};

function rowHtml(p, i){
  var orig = n(p.price_orig != null ? p.price_orig : p.unit_price);
  var neg  = n(p.price_neg  != null ? p.price_neg  : orig);
  var tot  = n(p.qty) * neg;
  var kind = (p.spec && p.spec.kind) || 'other';
  return '<tr>'
    +'<td><div class="oe-kindbtn'+(kind!=='other'?' set':'')+'" title="Zgjidh llojin (pllakë, profil, tub…)" onclick="pstToggleCalc('+i+')">'+KIND_ICON[kind]+'</div></td>'
    +'<td><input value="'+esc(p.desc)+'" oninput="pstPos('+i+',\'desc\',this.value)" placeholder="Përshkrimi"></td>'
    +'<td><input class="num" value="'+(p.qty||'')+'" oninput="pstPos('+i+',\'qty\',this.value)" placeholder="0"></td>'
    +'<td><input value="'+esc(p.unit)+'" oninput="pstPos('+i+',\'unit\',this.value)" placeholder="kg"></td>'
    +'<td><input class="num" value="'+(orig||'')+'" oninput="pstPos('+i+',\'price_orig\',this.value)" placeholder="0.00"></td>'
    +'<td><input class="num" value="'+(neg||'')+'" oninput="pstPos('+i+',\'price_neg\',this.value)" placeholder="0.00"></td>'
    +'<td class="oe-tot" id="oe-t'+i+'">'+fmt(tot,2)+'</td>'
    +'<td><span class="oe-del" onclick="pstDelPos('+i+')">×</span></td>'
  +'</tr>'
  +'<tr class="oe-calcrow hidden" id="oe-calcrow'+i+'"><td></td><td colspan="7">'+calcBoxHtml(p,i)+'</td></tr>';
}

function calcBoxHtml(p, i){
  var s = p.spec || {kind:'other'};
  var kindOpts = ['other','plate','ihprofile','hollow','angle','flat'].map(function(k){
    return '<option value="'+k+'"'+(s.kind===k?' selected':'')+'>'+KIND_LABELS[k]+'</option>';
  }).join('');
  var dens = s.dens!=null ? s.dens : 7.85;
  var f = '<div class="oe-calcbox"><div class="oe-calcgrid">'
    +'<div><label>Lloji</label><select onchange="pstSpecKind('+i+',this.value)">'+kindOpts+'</select></div>';

  if(s.kind==='plate'){
    f += '<div><label>Grada</label><input value="'+esc(s.grade||'')+'" oninput="pstSpec('+i+',\'grade\',this.value)" placeholder="S355J2"></div>'
      +'<div><label>L (mm)</label><input class="num" value="'+(s.L||'')+'" oninput="pstSpec('+i+',\'L\',this.value)" placeholder="12000"></div>'
      +'<div><label>W (mm)</label><input class="num" value="'+(s.W||'')+'" oninput="pstSpec('+i+',\'W\',this.value)" placeholder="2500"></div>'
      +'<div><label>T (mm)</label><input class="num" value="'+(s.T||'')+'" oninput="pstSpec('+i+',\'T\',this.value)" placeholder="10"></div>'
      +'<div><label>Copë</label><input class="num" value="'+(s.pcs||'')+'" oninput="pstSpec('+i+',\'pcs\',this.value)" placeholder="1"></div>';
  } else if(s.kind==='ihprofile'){
    f += '<div><label>Profili</label><select onchange="pstSpec('+i+',\'profile\',this.value)">'
        +['HEA','HEB','HEM','IPE','IPN','UPN','UPE'].map(function(x){return '<option'+(s.profile===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div>'
      +'<div><label>Dimensioni</label><input value="'+esc(s.dim||'')+'" oninput="pstSpec('+i+',\'dim\',this.value)" placeholder="200"></div>'
      +'<div><label>Grada</label><input value="'+esc(s.grade||'')+'" oninput="pstSpec('+i+',\'grade\',this.value)" placeholder="S355JR"></div>'
      +'<div><label>Gjatësia (mm)</label><input class="num" value="'+(s.length||'')+'" oninput="pstSpec('+i+',\'length\',this.value)" placeholder="6000"></div>'
      +'<div><label>Copë</label><input class="num" value="'+(s.pcs||'')+'" oninput="pstSpec('+i+',\'pcs\',this.value)" placeholder="1"></div>';
  } else if(s.kind==='hollow'){
    f += '<div><label>Forma</label><select onchange="pstSpec('+i+',\'forma\',this.value)">'
        +'<option value="rect"'+(s.forma!=='round'?' selected':'')+'>Drejtkëndore/Katrore</option>'
        +'<option value="round"'+(s.forma==='round'?' selected':'')+'>Rrumbullak</option></select></div>'
      +(s.forma==='round'
        ? '<div><label>OD (mm)</label><input class="num" value="'+(s.OD||'')+'" oninput="pstSpec('+i+',\'OD\',this.value)" placeholder="114.3"></div>'
        : '<div><label>H×W (mm)</label><input value="'+esc(s.HW||'')+'" oninput="pstSpec('+i+',\'HW\',this.value)" placeholder="100x100"></div>')
      +'<div><label>Trashësia t (mm)</label><input class="num" value="'+(s.t||'')+'" oninput="pstSpec('+i+',\'t\',this.value)" placeholder="4"></div>'
      +'<div><label>Grada</label><input value="'+esc(s.grade||'')+'" oninput="pstSpec('+i+',\'grade\',this.value)" placeholder="S355"></div>'
      +'<div><label>Gjatësia (mm)</label><input class="num" value="'+(s.length||'')+'" oninput="pstSpec('+i+',\'length\',this.value)" placeholder="6000"></div>'
      +'<div><label>Copë</label><input class="num" value="'+(s.pcs||'')+'" oninput="pstSpec('+i+',\'pcs\',this.value)" placeholder="1"></div>';
  } else if(s.kind==='angle'){
    f += '<div><label>Krahët a×b (mm)</label><input value="'+esc(s.AB||'')+'" oninput="pstSpec('+i+',\'AB\',this.value)" placeholder="100x100"></div>'
      +'<div><label>Trashësia t (mm)</label><input class="num" value="'+(s.t||'')+'" oninput="pstSpec('+i+',\'t\',this.value)" placeholder="10"></div>'
      +'<div><label>Grada</label><input value="'+esc(s.grade||'')+'" oninput="pstSpec('+i+',\'grade\',this.value)" placeholder="S355"></div>'
      +'<div><label>Gjatësia (mm)</label><input class="num" value="'+(s.length||'')+'" oninput="pstSpec('+i+',\'length\',this.value)" placeholder="6000"></div>'
      +'<div><label>Copë</label><input class="num" value="'+(s.pcs||'')+'" oninput="pstSpec('+i+',\'pcs\',this.value)" placeholder="1"></div>';
  } else if(s.kind==='flat'){
    f += '<div><label>Gjerësia W (mm)</label><input class="num" value="'+(s.W||'')+'" oninput="pstSpec('+i+',\'W\',this.value)" placeholder="100"></div>'
      +'<div><label>Trashësia T (mm)</label><input class="num" value="'+(s.T||'')+'" oninput="pstSpec('+i+',\'T\',this.value)" placeholder="10"></div>'
      +'<div><label>Grada</label><input value="'+esc(s.grade||'')+'" oninput="pstSpec('+i+',\'grade\',this.value)" placeholder="S355"></div>'
      +'<div><label>Gjatësia (mm)</label><input class="num" value="'+(s.length||'')+'" oninput="pstSpec('+i+',\'length\',this.value)" placeholder="6000"></div>'
      +'<div><label>Copë</label><input class="num" value="'+(s.pcs||'')+'" oninput="pstSpec('+i+',\'pcs\',this.value)" placeholder="1"></div>';
  }
  if(s.kind!=='other'){
    f += '<div><label>Densiteti kg/dm³</label><input class="num" value="'+dens+'" oninput="pstSpec('+i+',\'dens\',this.value)" placeholder="7.85"></div>';
  }
  f += '</div>';
  if(s.kind!=='other'){
    var w = calcSpecWeight(s);
    f += '<div class="oe-calcres"><span>Pesha e llogaritur: <b>'+fmt(w.perPc,1)+' kg/copë</b> × '+(s.pcs||0)+' copë</span>'
      + '<span style="display:flex;gap:8px;align-items:center"><b>'+fmt(w.total,1)+' kg total</b>'
      + '<button class="btn btn-primary btn-sm" onclick="pstApplySpec('+i+')">Apliko te pozicioni</button></span></div>';
  }
  f += '</div>';
  return f;
}

// densiteti: çeliku 7.85 kg/dm3 = 7.85e-6 kg/mm3
function calcSpecWeight(s){
  var dens = (s.dens!=null && s.dens!=='') ? n(s.dens) : 7.85;
  var k = dens*1e-6, pcs = n(s.pcs)||0, perPc=0;
  if(s.kind==='plate'){
    perPc = n(s.L)*n(s.W)*n(s.T)*k;
  } else if(s.kind==='ihprofile'){
    var wpm = kgPerM(s.profile, s.dim); // kg/m nga tabela ekzistuese e BOM-it
    perPc = wpm ? wpm*(n(s.length)/1000) : 0;
  } else if(s.kind==='hollow'){
    var t=n(s.t);
    if(s.forma==='round'){
      var od=n(s.OD);
      var area = Math.PI*Math.max(od-t,0)*t; // mm2, formule e thjeshtuar per profil rrumbullak bosh
      perPc = area*n(s.length)*k;
    } else {
      var hw=(s.HW||'').toLowerCase().split('x').map(function(x){return parseFloat(x)||0;});
      var H=hw[0]||0, W=hw[1]||hw[0]||0;
      var area2 = 2*t*(H+W-2*t); // mm2, formule e thjeshtuar per RHS/SHS
      perPc = Math.max(area2,0)*n(s.length)*k;
    }
  } else if(s.kind==='angle'){
    var ab=(s.AB||'').toLowerCase().split('x').map(function(x){return parseFloat(x)||0;});
    var a=ab[0]||0, b=ab[1]||ab[0]||0, ta=n(s.t);
    var areaA = ta*(a+b-ta); // mm2, formule e thjeshtuar per profil kendor (L)
    perPc = Math.max(areaA,0)*n(s.length)*k;
  } else if(s.kind==='flat'){
    perPc = n(s.W)*n(s.T)*n(s.length)*k;
  }
  perPc = +perPc.toFixed(2);
  return { perPc:perPc, total:+(perPc*pcs).toFixed(1) };
}

function specDesc(s){
  if(s.kind==='plate') return 'Pllakë'+(s.grade?' '+s.grade:'')+' '+(s.L||0)+'×'+(s.W||0)+'×'+(s.T||0)+' mm';
  if(s.kind==='ihprofile') return (s.profile||'')+' '+(s.dim||'')+(s.grade?' — '+s.grade:'')+' · L='+(s.length||0)+'mm';
  if(s.kind==='hollow') return (s.forma==='round'?'Tub Ø'+(s.OD||0):'Kuti '+(s.HW||''))+' × t'+(s.t||0)+'mm'+(s.grade?' — '+s.grade:'')+' · L='+(s.length||0)+'mm';
  if(s.kind==='angle') return 'Kënd '+(s.AB||'')+' × t'+(s.t||0)+'mm'+(s.grade?' — '+s.grade:'')+' · L='+(s.length||0)+'mm';
  if(s.kind==='flat') return 'Sheshtë '+(s.W||0)+'×'+(s.T||0)+'mm'+(s.grade?' — '+s.grade:'')+' · L='+(s.length||0)+'mm';
  return '';
}

window.pstToggleCalc = function(i){
  var row = document.getElementById('oe-calcrow'+i);
  if(!row) return;
  row.classList.toggle('hidden');
};
window.pstSpecKind = function(i, kind){
  if(!S.pos[i]) return;
  S.pos[i].spec = S.pos[i].spec || {};
  S.pos[i].spec.kind = kind;
  refreshRow(i);
};
window.pstSpec = function(i, k, v){
  if(!S.pos[i]) return;
  S.pos[i].spec = S.pos[i].spec || {kind:'other'};
  S.pos[i].spec[k] = v;
  if(k==='forma'){ refreshRow(i); return; } // ndryshon vete fushat (OD kunder H×W), duhet rirendero
  updateCalcResult(i);
};
function updateCalcResult(i){
  var s = S.pos[i] && S.pos[i].spec;
  if(!s || s.kind==='other') return;
  var row = document.getElementById('oe-calcrow'+i); if(!row) return;
  var res = row.querySelector('.oe-calcres'); if(!res) return;
  var w = calcSpecWeight(s);
  res.innerHTML = '<span>Pesha e llogaritur: <b>'+fmt(w.perPc,1)+' kg/copë</b> × '+(s.pcs||0)+' copë</span>'
    + '<span style="display:flex;gap:8px;align-items:center"><b>'+fmt(w.total,1)+' kg total</b>'
    + '<button class="btn btn-primary btn-sm" onclick="pstApplySpec('+i+')">Apliko te pozicioni</button></span>';
}
function refreshRow(i){
  var wrap = document.getElementById('oe-calcrow'+i);
  var wasOpen = wrap && !wrap.classList.contains('hidden');
  renderRows();
  var newWrap = document.getElementById('oe-calcrow'+i);
  if(newWrap && wasOpen) newWrap.classList.remove('hidden');
}
window.pstApplySpec = function(i){
  if(!S.pos[i] || !S.pos[i].spec) return;
  var s = S.pos[i].spec;
  var w = calcSpecWeight(s);
  S.pos[i].qty = w.total;
  S.pos[i].unit = 'kg';
  var d = specDesc(s);
  if(d) S.pos[i].desc = d;
  renderRows();
};

function renderRows(){
  var el = document.getElementById('oe-rows');
  if(!el) return;
  el.innerHTML = S.pos.map(function(p,i){ return rowHtml(p,i); }).join('');
  pstCalc();
}

window.pstAddPos = function(){
  S.pos.push({desc:'',qty:'',unit:'kg',price_orig:'',price_neg:''});
  renderRows();
  setTimeout(function(){
    var rows = document.querySelectorAll('#oe-rows tr:not(.oe-calcrow)');
    var last = rows[rows.length-1];
    var inp = last && last.querySelector('input');
    if(inp) inp.focus();
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

// ── FURNITORI: KËRKIM LIVE (BASHKON contacts + partners) ────
function renderSupDrop(q){
  var drop = document.getElementById('oe-sup-drop');
  if(!drop) return;
  q = (q||'').toLowerCase().trim();
  var list = S.suppliers.filter(function(x){ return !q || x.company.toLowerCase().indexOf(q)>-1; }).slice(0,80);
  var html = list.map(function(x){
    return '<div class="oe-drop-item" onmousedown="pstSupPick('+JSON.stringify(x.company).replace(/"/g,'&quot;')+')">'
      + esc(x.company) + (x.country?' <span class="oe-drop-c">('+esc(x.country)+')</span>':'') + '</div>';
  }).join('');
  html += '<div class="oe-drop-item oe-drop-new" onmousedown="pstSupNew()">+ Furnitor i ri'+(q?': "'+esc(document.getElementById('oe-sup-q').value)+'"':'…')+'</div>';
  drop.innerHTML = html || '<div class="oe-drop-empty">Asnjë përputhje — shto si të ri më poshtë</div>';
  drop.classList.add('on');
}
window.pstSupFilter = function(){ renderSupDrop(document.getElementById('oe-sup-q').value); };
window.pstSupPick = function(name){
  document.getElementById('oe-sup').value = name;
  document.getElementById('oe-sup-q').value = name;
  document.getElementById('oe-sup-drop').classList.remove('on');
  document.getElementById('oe-newsup').classList.remove('on');
};
window.pstSupNew = function(){
  var typed = (document.getElementById('oe-sup-q').value||'').trim();
  document.getElementById('oe-sup').value = '';
  document.getElementById('oe-sup-drop').classList.remove('on');
  document.getElementById('oe-newsup').classList.add('on');
  document.getElementById('ns-name').value = typed;
  setTimeout(function(){ document.getElementById('ns-name').focus(); },40);
};
window.pstCancelNewSupplier = function(){
  document.getElementById('oe-newsup').classList.remove('on');
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
      country:((document.getElementById('ns-country').value||'').trim() || (document.getElementById('ns-country-q').value||'').trim())||null,
      notes:(document.getElementById('ns-cat').value||'').trim()||null
    };
    await supaFetch('contacts','POST',rec);
    await loadSuppliers();
    document.getElementById('oe-sup').value = name;
    document.getElementById('oe-sup-q').value = name;
    document.getElementById('oe-newsup').classList.remove('on');
    ['ns-name','ns-person','ns-email','ns-phone','ns-cat'].forEach(function(id){
      var e=document.getElementById(id); if(e) e.value='';
    });
    var nc=document.getElementById('ns-country'), ncq=document.getElementById('ns-country-q');
    if(nc) nc.value=''; if(ncq) ncq.value='';
    msg('Furnitori "'+name+'" u shtua.','ok');
  }catch(e){ msg('Gabim: '+e.message,'err'); }
};

async function loadSuppliers(){
  var byName = {};
  try{
    var a = await supaFetch("contacts?kind=eq.supplier&select=company,person,country&order=company.asc&limit=1000") || [];
    a.forEach(function(x){ if(x.company) byName[x.company.trim().toLowerCase()] = {company:x.company.trim(), country:x.country||''}; });
  }catch(e){}
  try{
    var b = await supaFetch("partners?relation=cs.{supplier}&select=name,country&order=name.asc&limit=1000") || [];
    b.forEach(function(x){
      if(!x.name) return;
      var k = x.name.trim().toLowerCase();
      if(!byName[k]) byName[k] = {company:x.name.trim(), country:x.country||''};
      else if(!byName[k].country && x.country) byName[k].country = x.country;
    });
  }catch(e){}
  S.suppliers = Object.keys(byName).map(function(k){ return byName[k]; }).sort(function(a,b){ return a.company.localeCompare(b.company); });
}

// ── SHTETET: KËRKIM LIVE (me flamuj, Kosova gjithmonë e përfshirë) ──
function renderCountryDrop(prefix, q){
  var drop = document.getElementById(prefix+'-country-drop');
  if(!drop) return;
  q = (q||'').toLowerCase().trim();
  var list = COUNTRIES.filter(function(x){ return !q || x.n.toLowerCase().indexOf(q)>-1 || x.c.toLowerCase().indexOf(q)>-1; });
  drop.innerHTML = list.map(function(x){
    return '<div class="oe-drop-item" onmousedown="pstCountryPick(\''+prefix+'\',\''+x.c+'\')">'
      + '<span class="oe-flag">'+x.f+'</span> '+esc(x.n)+' <span class="oe-drop-c">('+x.c+')</span></div>';
  }).join('') || '<div class="oe-drop-empty">Asnjë përputhje</div>';
  drop.classList.add('on');
}
window.pstCountryFilter = function(prefix){ renderCountryDrop(prefix, document.getElementById(prefix+'-country-q').value); };
window.pstCountryPick = function(prefix, code){
  var ctry = COUNTRIES.filter(function(x){ return x.c===code; })[0];
  if(!ctry) return;
  var hidden = document.getElementById(prefix==='oe-origin'?'oe-origin':'ns-country');
  var visible = document.getElementById(prefix+'-country-q');
  // 'ns-country' (furnitori i ri) ruan kodin (si te dhënat ekzistuese te 'contacts'); 'oe-origin' ruan emrin (si te dhënat ekzistuese te 'offers')
  hidden.value = prefix==='oe-origin' ? ctry.n : ctry.c;
  visible.value = ctry.f+' '+ctry.n;
  document.getElementById(prefix+'-country-drop').classList.remove('on');
};

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
      document.getElementById('oe-sup').value = supName;
      document.getElementById('oe-sup-q').value = supName;
      document.getElementById('oe-proj').value  = o.project_id||'';
      document.getElementById('oe-zinc').value   = o.zinc_kg||'';
      document.getElementById('oe-transp').value = o.transport_eur||'';
      document.getElementById('oe-qty').value    = o.qty_kg||'';
      document.getElementById('oe-vat').value    = o.vat_pct||'';
      document.getElementById('oe-weeks').value  = o.delivery_weeks||'';
      document.getElementById('oe-inco').value   = o.incoterms||'';
      document.getElementById('oe-cert').value   = o.cert||'';
      document.getElementById('oe-origin').value = o.origin||'';
      var origCtry = COUNTRIES.filter(function(x){ return x.n===o.origin||x.c===o.origin; })[0];
      document.getElementById('oe-origin-q').value = origCtry ? (origCtry.f+' '+origCtry.n) : (o.origin||'');
      document.getElementById('oe-notes').value  = o.notes||'';
      document.getElementById('oe-sub').textContent =
        (o.created_at ? 'Krijuar '+new Date(o.created_at).toLocaleDateString('de-DE') : '');

      S.pos = Array.isArray(o.positions) ? o.positions.map(function(p){
        return {
          desc: p.desc||p.description||'',
          qty:  p.qty||p.quantity||'',
          unit: p.unit||'',
          price_orig: p.price_orig!=null ? p.price_orig : (p.unit_price||''),
          price_neg:  p.price_neg !=null ? p.price_neg  : (p.unit_price||p.price_orig||''),
          spec: p.spec || null
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
  var sup = (document.getElementById('oe-sup').value||'').trim() || (document.getElementById('oe-sup-q').value||'').trim();
  if(!sup){ msg('Shkruaj ose zgjidh furnitorin.','err'); return; }

  var pos = S.pos.filter(function(p){ return (p.desc||'').trim() || n(p.qty); })
    .map(function(p){
      var po = n(p.price_orig), pn = n(p.price_neg)||po;
      return { desc:(p.desc||'').trim(), qty:n(p.qty), unit:(p.unit||'').trim(),
               price_orig:po, price_neg:pn, total_orig:n(p.qty)*po, total_neg:n(p.qty)*pn,
               spec: p.spec||null };
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
    origin: ((document.getElementById('oe-origin').value||'').trim() || (document.getElementById('oe-origin-q').value||'').trim()) || null,
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
