/* PRISTEEL structured fallback for supplier offers found in email
 * Deterministic extraction when no AI key is configured.
 * Never saves automatically: it only opens the existing supplier-offer editor as a draft.
 */
(function(){
'use strict';
if(window.__pstEmailOfferStructuredFallbackV1)return;window.__pstEmailOfferStructuredFallbackV1=true;
var drafts={};
function A(v){return Array.isArray(v)?v:[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function num(v){var s=String(v==null?'':v).trim().replace(/\s/g,'').replace(',','.');var n=parseFloat(s);return isFinite(n)?n:null;}
function text(m){return String(m&&(m.body_text||m.body||m.text||m.snippet)||'').replace(/\u0000/g,' ').trim();}
function supplier(m){var n=String(m&&m.from_name||'').trim();if(n)return n;var e=String(m&&m.from_email||''),d=(e.split('@')[1]||'').split('.')[0];return d?d.replace(/[-_]+/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase();}):'Furnitor';}
function baseFallback(t,m){var api=window.PSTEmailOfferIntakeV1;try{return api&&api._test&&api._test.fallback?api._test.fallback(t,m):{};}catch(e){return{};}}
function cleanDesc(v){return String(v||'').replace(/^\s*[-–•]+\s*/,'').replace(/\s+/g,' ').trim();}
function kind(desc){var n=String(desc||'').toLowerCase();if(/powder|coating|ngjyr|paint|beschicht/.test(n))return'coating';if(/zink|zinc|galvan/.test(n))return'zinc';return'base';}
function structured(t,m){
 var x=Object.assign({is_supplier_offer:true,supplier:supplier(m),currency:'EUR',positions:[],price_kg:null,total_eur:null,qty_kg:null,zinc_eur_kg:null,coating_eur_kg:null,transport_eur:null,vat_pct:null,vat_note:null,delivery_weeks:null,incoterms:null,cert:null,origin:null,payment_terms:null,validity:null,notes:'',confidence:0,warnings:[]},baseFallback(t,m)||{});
 x.supplier=x.supplier||supplier(m);x.positions=[];
 var lines=String(t||'').replace(/\r/g,'').split(/\n+/).map(function(s){return s.trim();}).filter(Boolean);
 lines.forEach(function(line){
   var q=line.match(/^\s*[-–•]?\s*(.{3,240}?)\s*:\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:€|EUR)\s*\/\s*kg\b(.*)$/i);
   if(!q)return;var d=cleanDesc(q[1]),p=num(q[2]);if(p==null)return;var k=kind(d),tail=String(q[3]||'').trim();
   x.positions.push({description:d,qty:null,unit:'kg',unit_price:p,kind:k,vat_note:/pa\s+tvsh|without\s+vat|excl\.?\s*vat/i.test(tail)?'Pa TVSH':null});
   if(k==='zinc')x.zinc_eur_kg=p;else if(k==='coating')x.coating_eur_kg=p;else if(x.price_kg==null)x.price_kg=p;
 });
 if(x.positions.length<2){
   var re=/(?:^|\n)\s*[-–•]?\s*([^:\n]{3,220}?)\s*:\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:€|EUR)\s*\/\s*kg\b([^\n]*)/gim,mm;
   while((mm=re.exec(String(t||'')))){var d2=cleanDesc(mm[1]),p2=num(mm[2]);if(p2==null||x.positions.some(function(z){return z.description===d2&&z.unit_price===p2;}))continue;var k2=kind(d2);x.positions.push({description:d2,qty:null,unit:'kg',unit_price:p2,kind:k2,vat_note:/pa\s+tvsh/i.test(mm[3]||'')?'Pa TVSH':null});if(k2==='zinc')x.zinc_eur_kg=p2;else if(k2==='coating')x.coating_eur_kg=p2;else if(x.price_kg==null)x.price_kg=p2;}
 }
 if(/\bpa\s+tvsh\b|without\s+vat|excl\.?\s*vat/i.test(t))x.vat_note='Pa TVSH';
 var cond=String(t||'').split(/\n+|(?<=[.!?])\s+/).map(function(s){return s.trim();}).filter(function(s){return /(tvsh|final|bulon|bolt|export|fatur)/i.test(s);});
 if(cond.length)x.notes=cond.slice(0,8).join('\n');
 if(x.positions.length>=3)x.confidence=Math.max(Number(x.confidence)||0,90);else if(x.positions.length>=2)x.confidence=Math.max(Number(x.confidence)||0,82);else x.confidence=Math.max(Number(x.confidence)||0,65);
 x.warnings=['Nxjerrje deterministike nga teksti i emailit. Kontrollo çdo komponent dhe kusht para ruajtjes.'];
 return x;
}
function field(label,value){return'<div class="pst-eoi-field"><span>'+E(label)+'</span><b>'+E(value==null||value===''?'—':value)+'</b></div>';}
function modal(m,x,t){
 var old=document.getElementById('pst-eoi-bg');if(old)old.remove();
 var rows=A(x.positions).map(function(p){return'<div style="display:grid;grid-template-columns:minmax(0,1fr) 120px 85px;gap:8px;padding:7px 0;border-top:1px solid #EDF1F2;font-size:8.4px"><b>'+E(p.description)+'</b><span>'+E(p.unit_price+' EUR/kg')+'</span><span>'+E(p.vat_note||'')+'</span></div>';}).join('');
 var b=document.createElement('div');b.id='pst-eoi-bg';b.className='pst-eoi-bg';
 b.innerHTML='<div class="pst-eoi-modal"><header><div><h3>Draft nga oferta në email</h3><div style="font-size:8px;color:#879399;margin-top:3px">'+E(m.subject||'')+'</div></div><button data-esf-close>×</button></header><div class="pst-eoi-body"><div class="pst-eoi-grid">'+field('Furnitori',x.supplier||supplier(m))+field('Valuta',x.currency||'EUR')+field('Çmimi bazë/kg',x.price_kg!=null?x.price_kg+' EUR/kg':'—')+field('Zinkimi',x.zinc_eur_kg!=null?x.zinc_eur_kg+' EUR/kg':'—')+field('Powder Coating',x.coating_eur_kg!=null?x.coating_eur_kg+' EUR/kg':'—')+field('TVSH',x.vat_note||(x.vat_pct!=null?x.vat_pct+'%':'—'))+field('Afati',x.delivery_weeks!=null?x.delivery_weeks+' javë':'—')+field('Incoterms',x.incoterms||'—')+field('Besueshmëria',x.confidence+'%')+'</div><div style="margin-top:11px;font-size:8.7px;color:#59686F"><b>Komponentë të çmimit: '+A(x.positions).length+'</b>'+rows+'</div>'+(x.notes?'<div style="margin-top:10px;padding:9px;border-radius:8px;background:#FFF8E9;color:#6D542B;font-size:8.3px;white-space:pre-wrap">'+E(x.notes)+'</div>':'')+'<div style="font-size:8px;color:#9B6A22;margin-top:7px">'+E(A(x.warnings).join(' · '))+'</div><div class="pst-eoi-source">'+E(String(t||'').slice(0,6000))+'</div></div><footer><button data-esf-close>Anulo</button><button class="p" data-esf-open="'+E(m.gmail_message_id||m.id||'')+'">Hap si draft ofertë</button></footer></div>';
 document.body.appendChild(b);b.addEventListener('click',function(e){if(e.target===b||e.target.closest('[data-esf-close]'))b.remove();});
}
function setVal(id,v){var el=document.getElementById(id);if(el&&v!==undefined&&v!==null&&String(v)!=='')el.value=v;}
async function openDraft(id){
 var z=drafts[String(id)],d=window.__pstIntegrityLastData,pid=String(d&&d.project&&d.project.id||window.__pstCurrentProjectId||'');if(!z||typeof window.pstOpenOffer!=='function')return;
 var bg=document.getElementById('pst-eoi-bg');if(bg)bg.remove();await window.pstOpenOffer(null,pid);var x=z.data,m=z.mail,base=x.positions.find(function(p){return p.kind==='base';})||x.positions[0];
 setVal('oe-sup',x.supplier||supplier(m));setVal('oe-sup-q',x.supplier||supplier(m));setVal('oe-proj',pid);
 if(base&&window.pstPos){window.pstPos(0,'desc',base.description||'Konstruksion metalik');window.pstPos(0,'qty',0);window.pstPos(0,'unit','kg');window.pstPos(0,'price_orig',base.unit_price||0);window.pstPos(0,'price_neg',base.unit_price||0);}
 setVal('oe-zinc',x.zinc_eur_kg);setVal('oe-weeks',x.delivery_weeks);setVal('oe-inco',x.incoterms);setVal('oe-cert',x.cert);setVal('oe-origin',x.origin);setVal('oe-origin-q',x.origin);
 var notes=[];if(x.coating_eur_kg!=null)notes.push('Powder Coating pas zinkimit: '+x.coating_eur_kg+' EUR/kg'+(x.vat_note?' · '+x.vat_note:''));if(x.vat_note)notes.push('TVSH: '+x.vat_note);if(x.notes)notes.push(x.notes);notes.push('Burimi: email "'+String(m.subject||'')+'" · '+String(m.from_email||m.from_name||'')+' · '+String(m.sent_at||m.created_at||''));notes.push('[SOURCE_EMAIL:'+String(m.gmail_message_id||m.id||'')+']');setVal('oe-notes',notes.join('\n'));
 if(window.pstCalc)window.pstCalc();var q=document.getElementById('oe-msg');if(q){q.textContent='Draft nga emaili. Sasia nuk ishte në email; kontrollo komponentët, plotëso sasinë dhe verifiko TVSH-në para ruajtjes.';q.className='oe-msg';}
}
function analyze(id){var d=window.__pstIntegrityLastData,m=A(d&&d.emails).find(function(x){return String(x.gmail_message_id||x.id||'')===String(id);});if(!m)return;var t=text(m),x=structured(t,m);drafts[String(id)]={mail:m,data:x,text:t};modal(m,x,t);}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-esf-analyze]');if(a){e.preventDefault();e.stopImmediatePropagation();var id=a.getAttribute('data-esf-analyze'),key=localStorage.getItem('pristeel_apikey')||'';if(key&&window.PSTEmailOfferIntakeV1&&window.PSTEmailOfferIntakeV1.analyze)window.PSTEmailOfferIntakeV1.analyze(id);else analyze(id);return;}var o=e.target.closest&&e.target.closest('[data-esf-open]');if(o){e.preventDefault();e.stopImmediatePropagation();openDraft(o.getAttribute('data-esf-open'));}},true);
window.PSTEmailOfferStructuredFallbackV1={structured:structured,analyze:analyze,openDraft:openDraft,_test:{structured:structured,kind:kind}};
})();
