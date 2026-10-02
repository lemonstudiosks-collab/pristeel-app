/* PRISTEEL Home Launcher v4
 * Calm, module-first Home. The existing Home owners remain loaded for compatibility,
 * but this is the final desktop Home presentation.
 */
(function(){
'use strict';
if(window.__pstHomeLauncherV5)return;
window.__pstHomeLauncherV5=true;
window.__pstHomeLauncherV4=true;
var V='20261002-launcher7-sidebarfix1',clockTimer=0,weatherBusy=false;

function S(v){return String(v==null?'':v)}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function A(v){return Array.isArray(v)?v:[]}
function active(){
 var p=document.getElementById('page-workspace-home');if(!p||p.hidden)return false;
 if(p.style&&p.style.display==='none')return false;
 try{var cs=window.getComputedStyle?window.getComputedStyle(p):null;if(cs&&(cs.display==='none'||cs.visibility==='hidden'))return false}catch(e){}
 if(p.classList.contains('active'))return true;
 var homeNav=document.querySelector('#pst-ws-canonical-nav [data-key="home"].active,#side-nav .active,[data-page="home"].active');
 return !!homeNav;
}
function nav(){return window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1||null}
function svg(p){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>'}
var I={
 search:svg('<circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 4.4 4.4"/>'),
 news:svg('<rect x="4" y="3.5" width="14" height="17" rx="2"/><path d="M7 7h8M7 10.5h8M7 14h5"/><path d="M18 7h2v11a2 2 0 0 1-2 2"/>'),
 calc:svg('<rect x="5" y="2.5" width="14" height="19" rx="2"/><rect x="8" y="5.5" width="8" height="3"/><path d="M8 12h1m3 0h1m3 0h1M8 15.5h1m3 0h1m3 0h1M8 19h1m3 0h1m3 0h1"/>'),
 clock:svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>'),
 weather:svg('<path d="M7.5 17.5h9.2a3.3 3.3 0 0 0 .2-6.6A5.1 5.1 0 0 0 7.4 9a4.3 4.3 0 0 0 .1 8.5Z"/><path d="M16.4 4.3v-2M20.1 5.9l1.4-1.4M21.6 9.5h2"/>'),
 opportunities:svg('<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/>'),
 representations:svg('<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 20c.2-4.1 2-6.4 5.2-6.4 2.1 0 3.7 1 4.5 2.8M13.5 14.5c1-.8 2.1-1.2 3.5-1.2 2.7 0 4.2 2.1 4.4 5.7"/>'),
 direct:svg('<path d="M5 21V5h9v16M14 9h5v12"/><path d="M8 8h3M8 12h3M8 16h3M16 12h1M16 16h1"/>'),
 buyers:svg('<path d="M4 21V9l5 3V8l5 3V4h6v17z"/><path d="M8 17h2m4 0h2"/>'),
 projects:svg('<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/>'),
 partners:svg('<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.2-4.3 2.2-6.7 5.5-6.7s5.3 2.4 5.5 6.7M16 8h5M18.5 5.5v5"/>'),
 finance:svg('<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3.5 10h17M7 14h5"/>'),
 currency:svg('<path d="M7 8.5h7M7 15.5h7"/><path d="M17.5 6.5c-1-1-2.2-1.5-3.8-1.5-3.4 0-5.7 2.7-5.7 7s2.3 7 5.7 7c1.6 0 2.8-.5 3.8-1.5"/>'),
 steel:svg('<path d="M4 7h16l-3 4H7zM4 13h16l-3 4H7z"/>'),
 arrow:svg('<path d="m9 6 6 6-6 6"/>'),
 close:svg('<path d="M6 6l12 12M18 6 6 18"/>')
};
function gmail(){return '<svg class="phl-gmail" viewBox="0 0 32 24"><path fill="#4285F4" d="M2 5.3 6 8.2V22H2z"/><path fill="#34A853" d="M26 8.2 30 5.3V22h-4z"/><path fill="#EA4335" d="M2 5.3 5.2 2.8 16 10.8 26.8 2.8 30 5.3 16 15.7z"/><path fill="#C5221F" d="M26.8 2.8 30 5.3 16 15.7 13.8 14.1z"/></svg>'}
function icon(k,top){return '<span class="'+(top?'phl-top-icon':'phl-card-icon')+'">'+(k==='gmail'?gmail():(I[k]||''))+'</span>'}

function route(k){
 try{document.body.classList.remove('pst-home-launcher-active')}catch(e){}
 var n=nav();
 try{if(n&&typeof n.syncSidebar==='function')n.syncSidebar(k)}catch(e){}
 try{
  if(k==='opportunities'&&n&&n.openOpportunities)return n.openOpportunities();
  if(k==='representations'){if(n&&n.openRepresentations)return n.openRepresentations();if(window.PSTRepresentationsV1&&window.PSTRepresentationsV1.open)return window.PSTRepresentationsV1.open()}
  if(k==='direct'&&window.PSTEUCompaniesV1&&window.PSTEUCompaniesV1.open)return window.PSTEUCompaniesV1.open();
  if(k==='buyers'&&window.PSTDachSteelSalesV3&&window.PSTDachSteelSalesV3.open)return window.PSTDachSteelSalesV3.open();
  if(k==='projects'&&n&&n.openProjects)return n.openProjects();
  if(k==='partners'&&n&&n.openPartners)return n.openPartners();
  if(k==='finance'&&n&&n.openFinance)return n.openFinance();
  if(k==='daily'&&n&&n.route)return n.route('daily');
 }catch(e){console.warn('PRISTEEL Home route',k,e)}
 return false;
}
function search(q){
 q=S(q).trim();
 try{if(window.PSTSearchStableV2&&window.PSTSearchStableV2.open){window.PSTSearchStableV2.open(q);return true}}catch(e){}
 try{if(typeof window.pstOpenSearch==='function'){window.pstOpenSearch(q);return true}}catch(e){}
 try{if(typeof window.openCmdK==='function'){window.openCmdK(q);return true}}catch(e){}
 return false;
}
function openGmail(){try{window.open('https://mail.google.com/mail/u/0/#inbox','PRISTEEL_GMAIL','noopener');return true}catch(e){return false}}

function dateText(d){try{return d.toLocaleDateString('sq-AL',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}catch(e){return''}}
function clock(){
 var r=document.getElementById('pst-home-launcher-v4'),d=new Date();
 if(r){var t=r.querySelector('[data-time]'),x=r.querySelector('[data-date]');if(t)t.textContent=d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});if(x)x.textContent=dateText(d)}
 clearTimeout(clockTimer);clockTimer=setTimeout(clock,(60-d.getSeconds())*1000-d.getMilliseconds()+100);
}
function weatherLabel(c){c=Number(c);if(c===0)return'Diell';if(c<=3)return'Vranësira';if(c===45||c===48)return'Mjegull';if((c>=51&&c<=67)||(c>=80&&c<=82))return'Shi';if(c>=71&&c<=77)return'Borë';if(c>=95)return'Stuhí';return'Moti'}
function weather(force){
 if(weatherBusy)return;weatherBusy=true;
 fetch('https://api.open-meteo.com/v1/forecast?latitude=42.6629&longitude=21.1655&current=temperature_2m,weather_code&timezone=Europe%2FBelgrade',{cache:force?'no-store':'default'})
 .then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})
 .then(function(j){var r=document.getElementById('pst-home-launcher-v4'),c=j&&j.current||{};if(!r)return;var t=r.querySelector('[data-temp]'),d=r.querySelector('[data-weather]');if(t&&isFinite(Number(c.temperature_2m)))t.textContent=Math.round(Number(c.temperature_2m))+'°C';if(d)d.textContent=weatherLabel(c.weather_code)+' · Prishtinë'})
 .catch(function(){var r=document.getElementById('pst-home-launcher-v4'),d=r&&r.querySelector('[data-weather]');if(d)d.textContent='Prishtinë'})
 .finally(function(){weatherBusy=false});
}

function modal(title,sub,body){
 var old=document.getElementById('phl-modal');if(old)old.remove();
 var m=document.createElement('div');m.id='phl-modal';m.className='phl-modal-bg';
 m.innerHTML='<section class="phl-modal"><header><div><h2>'+E(title)+'</h2>'+(sub?'<p>'+E(sub)+'</p>':'')+'</div><button type="button" data-close>'+I.close+'</button></header><div class="phl-modal-body">'+body+'</div></section>';
 document.body.appendChild(m);m.onclick=function(e){if(e.target===m||e.target.closest('[data-close]'))m.remove()};return m;
}
function calcValue(input){
 var s=S(input).replace(/\s+/g,''),nums=[],ops=[],i=0,expectNum=true;
 function prec(o){return o==='+'||o==='-'?1:o==='*'||o==='/'?2:0}
 function apply(){var o=ops.pop(),b=nums.pop(),a=nums.pop();if(a==null||b==null)throw 0;nums.push(o==='+'?a+b:o==='-'?a-b:o==='*'?a*b:a/b)}
 while(i<s.length){
  var ch=s[i];
  if((ch>='0'&&ch<='9')||ch==='.'||(ch==='-'&&expectNum)){
   var j=i+1;while(j<s.length&&((s[j]>='0'&&s[j]<='9')||s[j]==='.'))j++;
   var n=Number(s.slice(i,j));if(!isFinite(n))throw 0;nums.push(n);i=j;expectNum=false;continue;
  }
  if(ch==='('){ops.push(ch);i++;expectNum=true;continue}
  if(ch===')'){while(ops.length&&ops[ops.length-1]!=='(')apply();if(ops.pop()!=='(')throw 0;i++;expectNum=false;continue}
  if('+-*/'.indexOf(ch)>-1){while(ops.length&&ops[ops.length-1]!=='('&&prec(ops[ops.length-1])>=prec(ch))apply();ops.push(ch);i++;expectNum=true;continue}
  throw 0;
 }
 while(ops.length){if(ops[ops.length-1]==='(')throw 0;apply()}
 if(nums.length!==1||!isFinite(nums[0]))throw 0;return nums[0];
}
function calculator(){
 var keys=['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','⌫','='];
 var m=modal('Kalkulatori','Llogaritje të shpejta pa dalë nga PRISTEEL.','<div class="phl-calc"><input data-display value="0" readonly><div>'+keys.map(function(k){return'<button type="button" data-key="'+E(k)+'">'+E(k)+'</button>'}).join('')+'</div></div>'),expr='',display=m.querySelector('[data-display]');
 function show(){display.value=expr||'0'}
 m.addEventListener('click',function(e){var b=e.target.closest('[data-key]');if(!b)return;var k=b.dataset.key;if(k==='C'){expr='';return show()}if(k==='⌫'){expr=expr.slice(0,-1);return show()}if(k==='±'){if(expr)expr=expr[0]==='-'?expr.slice(1):'-'+expr;return show()}if(k==='%'){if(expr)expr='('+expr+')/100';return show()}if(k==='='){try{var x=expr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');var v=calcValue(x);expr=String(Math.round(v*100000000)/100000000)}catch(_){expr=''}return show()}expr+=k;show()});
}
function currency(){
 var m=modal('Kursi i valutave','Kurs aktual me bazë EUR. Burimi: Frankfurter / ECB.','<div class="phl-state">Duke marrë kursin aktual…</div>');
 fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,TRY',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(j){
  var b=m.querySelector('.phl-modal-body'),rs=j&&j.rates||{},codes=['USD','GBP','CHF','TRY'];
  b.innerHTML='<div class="phl-rate-top"><b>1 EUR</b><span>'+E(j.date||'')+'</span></div><div class="phl-rates">'+codes.map(function(c){return'<div><span>'+c+'</span><b>'+E(rs[c]==null?'—':Number(rs[c]).toFixed(4))+'</b></div>'}).join('')+'</div>';
 }).catch(function(){var b=m.querySelector('.phl-modal-body');if(b)b.innerHTML='<div class="phl-state">Kursi nuk mund të merret tani.</div>'});
}
function steel(){
 var m=modal('Çmimet e çelikut','Referenca të brendshme PPPP nga ofertat e fundit; jo kuotime bursiere live.','<div class="phl-state">Duke ngarkuar referencat…</div>');
 if(typeof window.supaFetch!=='function'){m.querySelector('.phl-modal-body').innerHTML='<div class="phl-state">PPPP nuk është ende gati.</div>';return}
 window.supaFetch('price_history?select=work_type,our_price_kg,project_name,country,quoted_at&our_price_kg=not.is.null&order=quoted_at.desc&limit=10').then(function(rows){
  rows=A(rows);var b=m.querySelector('.phl-modal-body');if(!rows.length){b.innerHTML='<div class="phl-state">Nuk ka referenca të regjistruara.</div>';return}
  b.innerHTML='<div class="phl-prices">'+rows.map(function(r){return'<div><span><b>'+E(r.work_type||'Çelik')+'</b><small>'+E(r.project_name||'')+(r.country?' · '+E(r.country):'')+'</small></span><strong>'+E(Number(r.our_price_kg).toFixed(3))+' €/kg</strong><em>'+E(r.quoted_at||'')+'</em></div>'}).join('')+'</div>';
 }).catch(function(){var b=m.querySelector('.phl-modal-body');if(b)b.innerHTML='<div class="phl-state">Referencat nuk mund të ngarkohen tani.</div>'});
}
function mainCard(k,t,s){return'<button type="button" class="phl-main-card" data-open="'+k+'">'+icon(k,false)+'<span class="phl-main-copy"><b>'+E(t)+'</b><small>'+E(s)+'</small></span><i>'+I.arrow+'</i></button>'}
function smallCard(k,t,s){return'<button type="button" class="phl-small-card" data-open="'+k+'">'+icon(k,false)+'<span><b>'+E(t)+'</b><small>'+E(s)+'</small></span><i>'+I.arrow+'</i></button>'}
function html(){
 return'<div class="phl-shell"><header class="phl-top">'
  +'<div class="phl-brand"><span class="phl-mark">P</span><span><b>PRISTEEL</b><small>PPPP</small></span></div>'
  +'<nav>'
   +'<button type="button" data-gmail>'+icon('gmail',true)+'<b>Gmail</b></button>'
   +'<button type="button" data-open="daily">'+icon('news',true)+'<b>Gazeta PPPP</b></button>'
   +'<button type="button" data-tool="calc">'+icon('calc',true)+'<b>Kalkulatori</b></button>'
   +'<div class="phl-meta">'+icon('clock',true)+'<span><b data-time>--:--</b><small data-date>—</small></span></div>'
   +'<button type="button" class="phl-meta" data-weather-refresh>'+icon('weather',true)+'<span><b data-temp>—°C</b><small data-weather>Prishtinë</small></span></button>'
  +'</nav></header>'
  +'<main><section class="phl-intro"><h1>Mirësevini në PRISTEEL</h1><p>Zgjidh modulin ose kërko në platformë.</p></section>'
  +'<form class="phl-search" data-search-form>'+I.search+'<input data-search placeholder="Kërko projekt, kompani, tender, ofertë, furnitor…"><kbd>Ctrl K</kbd><button>'+I.arrow+'</button></form>'
  +'<section class="phl-main-grid">'
   +mainCard('opportunities','Mundësitë','Tenderë dhe lead-e për shqyrtim.')
   +mainCard('representations','Përfaqësime','Zhvillim tregu, kontakte dhe përfaqësime.')
   +mainCard('direct','Klientë të drejtpërdrejtë','Fabrication, kapacitet prodhues dhe nënkontraktim.')
   +mainCard('buyers','Blerësit e çelikut','Blerës materiali, RFQ dhe furnizim çeliku.')
  +'</section>'
  +'<section class="phl-secondary"><h2>Module dhe mjete tjera</h2><div>'
   +smallCard('projects','Projektet','Projektet dhe gjendja e tyre.')
   +smallCard('partners','Partnerët','Partnerë, furnitorë dhe kontakte.')
   +smallCard('finance','Financa','Fatura, pagesa dhe raportim.')
   +smallCard('currency','Kursi','Kursi aktual i valutave.')
   +smallCard('steel','Çmimet e çelikut','Referenca çmimesh PPPP.')
  +'</div></section></main></div>';
}
function css(){
 if(document.getElementById('pst-home-launcher-v4-css'))return;
 var s=document.createElement('style');s.id='pst-home-launcher-v4-css';s.textContent=[
'body.pst-home-launcher-active .app-shell,body.pst-home-launcher-active #app-shell-root{display:block!important;grid-template-columns:minmax(0,1fr)!important}',
'body.pst-home-launcher-active .app-shell>.sidebar,body.pst-home-launcher-active .app-shell>aside.sidebar,body.pst-home-launcher-active #app-sidebar,body.pst-home-launcher-active #pst-v2-sidebar,body.pst-home-launcher-active #pst-ws-sidebar,body.pst-home-launcher-active .topbar,body.pst-home-launcher-active #pst-global-page-backbar{display:none!important;width:0!important;min-width:0!important;max-width:0!important}',
'body.pst-home-launcher-active #app-shell-root>.main,body.pst-home-launcher-active .app-shell>.main,body.pst-home-launcher-active .content{width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;padding:0!important}',
'body.pst-home-launcher-active #page-workspace-home{display:block!important;visibility:visible!important;opacity:1!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important}',
'body.pst-home-launcher-active #page-workspace-home>#pst-native-home-v4,body.pst-home-launcher-active #page-workspace-home>.pst-ws-home,body.pst-home-launcher-active #page-workspace-home>#pst-home-launchpad-v1{display:none!important}',
'body.pst-home-launcher-active #page-workspace-home>#pst-home-launcher-v4{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:20!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important}',
'body:not(.pst-home-launcher-active) .app-shell>.sidebar,body:not(.pst-home-launcher-active) .app-shell>aside.sidebar{padding-top:12px!important;box-sizing:border-box!important}',
'#pst-home-launcher-v4{min-height:100vh;background:#f7f6f2;color:#172436;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}',
'#pst-home-launcher-v4 *{box-sizing:border-box}',
'.phl-top{min-height:92px;display:flex;align-items:center;justify-content:space-between;gap:26px;padding:14px clamp(28px,4vw,66px);background:#fff;border-bottom:1px solid #dedfdc}',
'.phl-brand{display:flex;align-items:center;gap:12px}.phl-mark{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:#4e9db5;color:#fff;font-size:19px;font-weight:850}.phl-brand b{display:block;font-size:21px;letter-spacing:-.4px}.phl-brand small{display:block;margin-top:1px;color:#7e898e;font-size:10px;font-weight:800;letter-spacing:.16em}',
'.phl-top nav{display:flex;align-items:center}.phl-top nav>button,.phl-meta{min-height:58px;display:flex;align-items:center;gap:10px;padding:0 16px;border:0;border-left:1px solid #e2e3e0;background:transparent;color:#263b49;text-align:left}.phl-top nav>button{cursor:pointer}.phl-top nav>button:hover,.phl-top nav>button:focus-visible{background:#f3f4f2;outline:0}.phl-top nav>*:first-child{border-left:0}.phl-top nav b{font-size:13px;white-space:nowrap}.phl-top nav small{display:block;margin-top:2px;font-size:10px;color:#78858a;white-space:nowrap}',
'.phl-top-icon{width:36px;height:36px;min-width:36px;display:grid;place-items:center}.phl-top-icon>svg:not(.phl-gmail){width:25px;height:25px;fill:none;stroke:#315e72;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}.phl-gmail{width:27px;height:21px}.phl-meta{min-width:178px}.phl-meta b{font-size:19px!important}.phl-meta:last-child{min-width:158px}',
'.phl-shell main{width:min(1500px,calc(100% - 72px));margin:0 auto;padding:54px 0 48px}.phl-intro{text-align:center;margin-bottom:25px}.phl-intro h1{margin:0;font-size:44px;line-height:1.08;letter-spacing:-1.5px}.phl-intro p{margin:10px 0 0;font-size:15px;color:#6f7b80}',
'.phl-search{width:min(960px,100%);height:64px;margin:0 auto 38px;display:grid;grid-template-columns:28px minmax(0,1fr) auto 44px;align-items:center;gap:12px;padding:0 10px 0 20px;border:1px solid #d9dcda;border-radius:18px;background:#fff;box-shadow:0 5px 18px rgba(37,51,61,.035)}.phl-search>svg{width:24px;height:24px;fill:none;stroke:#376f86;stroke-width:1.8}.phl-search input{height:100%;min-width:0;border:0;outline:0;background:transparent;font-size:16px;color:#213541}.phl-search input::placeholder{color:#9ba3a6}.phl-search kbd{border:1px solid #e1e3e1;border-radius:8px;background:#f6f7f5;padding:5px 7px;font:11px/1 sans-serif;color:#7b858a}.phl-search button{width:40px;height:40px;border:0;border-radius:12px;background:#f0f3f3;color:#315f75;display:grid;place-items:center;cursor:pointer}.phl-search button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2}',
'.phl-main-grid{width:min(1180px,100%);margin:0 auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.phl-main-card{min-height:158px;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto 1fr;gap:14px;padding:20px;border:1px solid #d9dcda;border-radius:18px;background:#fff;color:#1e3140;text-align:left;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.phl-main-card:hover,.phl-main-card:focus-visible{transform:translateY(-2px);border-color:#a9c7d1;box-shadow:0 10px 24px rgba(35,54,65,.065);outline:0}',
'.phl-card-icon{width:46px;height:46px;display:grid;place-items:center;border:1px solid #e1e4e2;border-radius:13px;background:#f8f9f7;color:#367991}.phl-card-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}.phl-main-copy{align-self:end}.phl-main-copy b{display:block;font-size:19px;line-height:1.18;letter-spacing:-.35px}.phl-main-copy small{display:block;margin-top:6px;color:#6f7d82;font-size:11.5px;line-height:1.4}.phl-main-card>i{align-self:start;width:32px;height:32px;display:grid;place-items:center;border:1px solid #e0e3e1;border-radius:50%;color:#315e72}.phl-main-card>i svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2}',
'.phl-secondary{width:min(1180px,100%);margin:28px auto 0;padding-top:17px;border-top:1px solid #d9dcda}.phl-secondary h2{margin:0 0 10px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7d898e}.phl-secondary>div{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.phl-small-card{min-height:88px;display:grid;grid-template-columns:38px minmax(0,1fr) 16px;align-items:center;gap:10px;padding:13px 14px;border:1px solid #dfe1df;border-radius:14px;background:#fff;color:#263a48;text-align:left;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.phl-small-card:hover,.phl-small-card:focus-visible{transform:translateY(-1px);border-color:#aec8d0;box-shadow:0 8px 18px rgba(35,54,65,.055);outline:0}.phl-small-card .phl-card-icon{width:38px;height:38px;border-radius:11px}.phl-small-card .phl-card-icon svg{width:19px;height:19px}.phl-small-card b{display:block;font-size:13px}.phl-small-card small{display:block;margin-top:3px;color:#79858a;font-size:9.5px;line-height:1.35}.phl-small-card>i{color:#47798c}.phl-small-card>i svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2}',
'.phl-modal-bg{position:fixed;inset:0;z-index:2147482000;display:grid;place-items:center;padding:24px;background:rgba(18,29,36,.24);backdrop-filter:blur(8px)}.phl-modal{width:min(640px,96vw);max-height:86vh;overflow:auto;border:1px solid #d9dcda;border-radius:22px;background:#fff;box-shadow:0 28px 80px rgba(22,37,47,.2)}.phl-modal>header{display:flex;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid #e5e6e4}.phl-modal h2{margin:0;font-size:23px}.phl-modal p{margin:5px 0 0;color:#79858a;font-size:11px;line-height:1.45}.phl-modal header button{width:36px;height:36px;border:1px solid #e1e3e1;border-radius:50%;background:#fff;color:#53676f;cursor:pointer}.phl-modal header button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8}.phl-modal-body{padding:22px 24px}.phl-state{padding:26px;text-align:center;color:#7b878b;font-size:12px}',
'.phl-calc{max-width:360px;margin:auto}.phl-calc input{width:100%;height:64px;border:1px solid #dde0de;border-radius:14px;padding:0 16px;text-align:right;font-size:28px;background:#fafaf8}.phl-calc>div{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.phl-calc button{height:50px;border:1px solid #e0e2df;border-radius:12px;background:#fff;font-size:16px;color:#2d4552;cursor:pointer}.phl-calc button:hover{background:#f4f6f5}',
'.phl-rate-top{display:flex;justify-content:space-between;margin-bottom:12px}.phl-rate-top b{font-size:18px}.phl-rate-top span{font-size:10px;color:#859095}.phl-rates{display:grid;grid-template-columns:repeat(2,1fr);border:1px solid #e0e3e1;border-radius:14px;overflow:hidden}.phl-rates>div{padding:16px;border-right:1px solid #e7e8e6;border-bottom:1px solid #e7e8e6}.phl-rates>div:nth-child(2n){border-right:0}.phl-rates>div:nth-last-child(-n+2){border-bottom:0}.phl-rates span{font-size:10px;color:#7f8b90}.phl-rates b{display:block;margin-top:4px;font-size:20px}.phl-prices{border:1px solid #e1e3e1;border-radius:14px;overflow:hidden}.phl-prices>div{display:grid;grid-template-columns:minmax(0,1fr) auto 88px;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid #e8e9e7}.phl-prices>div:last-child{border-bottom:0}.phl-prices b{font-size:12px}.phl-prices small{display:block;margin-top:3px;color:#849095;font-size:9.5px}.phl-prices strong{font-size:13px;color:#2f667b}.phl-prices em{font-style:normal;font-size:9.5px;color:#8a9498;text-align:right}',
'@media(max-width:1260px){.phl-top{align-items:flex-start}.phl-top nav{flex-wrap:wrap;justify-content:flex-end}.phl-top nav>button,.phl-meta{min-height:52px;padding:0 12px}.phl-main-grid{grid-template-columns:repeat(2,1fr)}.phl-secondary>div{grid-template-columns:repeat(3,1fr)}}',
'@media(max-width:760px){.phl-top{display:block;padding:14px 16px}.phl-top nav{margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr)}.phl-top nav>*{border-left:0!important;border-top:1px solid #e4e5e3!important}.phl-shell main{width:calc(100% - 24px);padding:30px 0 90px}.phl-intro h1{font-size:32px}.phl-search{height:58px;grid-template-columns:24px 1fr 40px}.phl-search kbd{display:none}.phl-main-grid,.phl-secondary>div{grid-template-columns:1fr}.phl-main-card{min-height:142px}.phl-small-card{min-height:82px}}'
 ].join('');
 document.head.appendChild(s);
}
function bind(r){
 if(r.dataset.bound==='1')return;r.dataset.bound='1';
 r.addEventListener('click',function(e){
  if(e.target.closest('[data-gmail]'))return void openGmail();
  var t=e.target.closest('[data-tool]');if(t&&t.dataset.tool==='calc')return void calculator();
  if(e.target.closest('[data-weather-refresh]'))return void weather(true);
  var o=e.target.closest('[data-open]');if(!o)return;var k=o.dataset.open;if(k==='currency')currency();else if(k==='steel')steel();else route(k);
 });
 var f=r.querySelector('[data-search-form]');if(f)f.onsubmit=function(e){e.preventDefault();var i=r.querySelector('[data-search]');search(i&&i.value||'')};
}
function mount(){
 css();
 if(!active()){try{document.body.classList.remove('pst-home-launcher-active')}catch(e){}return false}
 var page=document.getElementById('page-workspace-home');if(!page)return false;
 try{document.body.classList.add('pst-home-launcher-active')}catch(e){}
 try{var n=nav();if(n&&typeof n.syncSidebar==='function')n.syncSidebar('home')}catch(e){}
 var r=document.getElementById('pst-home-launcher-v4');
 if(!r){r=document.createElement('section');r.id='pst-home-launcher-v4';page.insertBefore(r,page.firstChild||null)}
 else if(r.parentNode!==page)page.insertBefore(r,page.firstChild||null);
 if(r.dataset.v!==V){r.dataset.v=V;r.innerHTML=html()}
 bind(r);clock();weather(false);return true;
}
function schedule(){(window.requestAnimationFrame||function(f){return setTimeout(f,0)})(mount)}
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:native-home-ready',schedule);
document.addEventListener('pst:page-opened',schedule);
document.addEventListener('pst:modules-ready',function(){schedule();setTimeout(schedule,100);setTimeout(schedule,350);setTimeout(schedule,900)},{once:true});
window.addEventListener('pageshow',schedule);
window.addEventListener('focus',schedule);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.PSTHomeLauncherV5=window.PSTHomeLauncherV4={version:V,render:mount,openModule:route,openSearch:search};
})();