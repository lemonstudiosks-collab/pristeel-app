/* PRISTEEL Utilities: floating focus radio */
(function(){
'use strict';
if(window.__pstUtilitiesLoaded)return;
window.__pstUtilitiesLoaded=true;

var STATIONS=[
  {id:'piano',label:'Piano Flow',sub:'Piano e qetë',url:'https://peacefulpiano.stream.publicradio.org/peacefulpiano.mp3'},
  {id:'relax',label:'Modern Focus',sub:'Piano & ambient',url:'https://relax.stream.publicradio.org/relax.mp3'},
  {id:'chamber',label:'Violin Calm',sub:'Violinë & çelo',url:'https://chambermusic.stream.publicradio.org/chambermusic.mp3'},
  {id:'favorites',label:'Quiet Classics',sub:'Klasike e zgjedhur',url:'https://favorites.stream.publicradio.org/favorites.mp3'},
  {id:'lullabies',label:'Deep Calm',sub:'Qetësi e thellë',url:'https://lullabies.stream.publicradio.org/lullabies.mp3'},
  {id:'groove',label:'Soft Chill',sub:'Chill modern',url:'https://ice5.somafm.com/groovesalad-128-mp3',alt:'https://ice2.somafm.com/groovesalad-128-mp3'},
  {id:'ambient',label:'Ambient Blue',sub:'Ambient i qetë',url:'https://ice5.somafm.com/dronezone-128-mp3',alt:'https://ice6.somafm.com/dronezone-128-mp3'}
];

var audio=new Audio();
audio.preload='none';
var current=null,playing=false,triedAlt=false;
try{audio.volume=Math.max(0,Math.min(1,Number(localStorage.getItem('pst_radio_volume')||0.42)));}catch(e){audio.volume=.42;}

function iconPlay(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2L18.8 12 8 5.4z"/></svg>';}
function iconPause(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></svg>';}
function iconMusic(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18.2a3.2 3.2 0 1 1-2-3V6.7l10-2v10.5a3.2 3.2 0 1 1-2-3V8.1L9 9.3v8.9z"/></svg>';}
function stationById(id){for(var i=0;i<STATIONS.length;i++)if(STATIONS[i].id===id)return STATIONS[i];return STATIONS[0];}
function currentIndex(){for(var i=0;i<STATIONS.length;i++)if(current&&STATIONS[i].id===current.id)return i;return 0;}
function setText(id,text){var el=document.getElementById(id);if(el)el.textContent=text;}
function save(){try{if(current)localStorage.setItem('pst_radio_station',current.id);localStorage.setItem('pst_radio_volume',String(audio.volume));}catch(e){}}

var style=document.createElement('style');style.id='pst-focus-radio-css';style.textContent=`
#pst-radio-fab{position:fixed;right:22px;bottom:22px;z-index:2147481200;width:48px;height:48px;border:1px solid rgba(255,255,255,.85);border-radius:16px;background:linear-gradient(145deg,#6EAFC5,#3F7F98);color:#fff;box-shadow:0 13px 34px rgba(45,88,105,.28),inset 0 1px 0 rgba(255,255,255,.24);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.18s ease;backdrop-filter:blur(10px)}
#pst-radio-fab:hover{transform:translateY(-2px);box-shadow:0 17px 40px rgba(45,88,105,.34)}#pst-radio-fab svg{width:22px;height:22px;fill:currentColor}.pst-radio-pulse{position:absolute;right:5px;top:5px;width:8px;height:8px;border-radius:50%;background:#BFE9D6;border:2px solid #4F90A8;opacity:0}.pst-radio-pulse.on{opacity:1;box-shadow:0 0 0 4px rgba(191,233,214,.18)}
#pst-focus-radio{position:fixed;right:22px;bottom:80px;z-index:2147481199;width:315px;border:1px solid #DCE7EA;border-radius:18px;background:rgba(255,255,255,.97);box-shadow:0 24px 65px rgba(34,62,73,.22);overflow:hidden;backdrop-filter:blur(18px);opacity:0;transform:translateY(8px) scale(.98);pointer-events:none;transition:.18s ease;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#26363D}
#pst-focus-radio.open{opacity:1;transform:none;pointer-events:auto}.pst-r-head{padding:15px 16px 12px;background:linear-gradient(160deg,#F8FCFD,#EEF7FA);border-bottom:1px solid #E2ECEF;display:flex;justify-content:space-between;align-items:center}.pst-r-brand b{display:block;font-size:12px;letter-spacing:.1px}.pst-r-brand span{display:block;font-size:8px;color:#819198;margin-top:2px;letter-spacing:.35px}.pst-r-close{width:28px;height:28px;border:0;border-radius:9px;background:transparent;color:#87969C;font-size:19px;cursor:pointer}.pst-r-close:hover{background:#EAF3F6;color:#486E7D}
.pst-r-now{padding:16px;display:grid;grid-template-columns:52px minmax(0,1fr);gap:12px;align-items:center}.pst-r-disc{width:52px;height:52px;border-radius:16px;background:radial-gradient(circle at 35% 35%,#A9D2DF 0 8%,#6EAFC5 9% 26%,#4A879F 27% 48%,#315F72 49% 100%);box-shadow:inset 0 0 0 5px rgba(255,255,255,.14),0 7px 20px rgba(63,127,152,.18);position:relative}.pst-r-disc:after{content:'';position:absolute;inset:20px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.22)}.pst-r-disc.playing{animation:pstDisc 8s linear infinite}@keyframes pstDisc{to{transform:rotate(360deg)}}.pst-r-label{font-size:8px;color:#7F9097;text-transform:uppercase;letter-spacing:.75px;font-weight:800}.pst-r-title{font-size:14px;font-weight:780;margin-top:3px;color:#2C3B42}.pst-r-sub{font-size:9px;color:#819096;margin-top:2px}.pst-r-status{font-size:8px;color:#5E8797;margin-top:6px;min-height:11px}
.pst-r-controls{padding:0 16px 14px;display:grid;grid-template-columns:36px 48px 36px 1fr;gap:7px;align-items:center}.pst-r-btn{height:36px;border:1px solid #D9E6EA;border-radius:11px;background:#fff;color:#456C7C;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px}.pst-r-btn:hover{background:#F2F8FA}.pst-r-main{height:48px;border:0;border-radius:15px;background:linear-gradient(145deg,#67A8C0,#3F7F98);color:#fff;box-shadow:0 8px 18px rgba(63,127,152,.23)}.pst-r-main svg{width:18px;height:18px;fill:currentColor}.pst-r-volume{display:flex;align-items:center;gap:7px;padding-left:4px}.pst-r-volume span{font-size:10px;color:#8A999F}.pst-r-volume input{width:100%;accent-color:#5B9BB3}
.pst-r-list{border-top:1px solid #E7EEF0;padding:8px}.pst-r-station{width:100%;border:0;background:transparent;border-radius:10px;padding:9px 10px;display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:9px;align-items:center;text-align:left;cursor:pointer}.pst-r-station:hover{background:#F3F8FA}.pst-r-station.active{background:#EAF5F8}.pst-r-dot{width:7px;height:7px;border-radius:50%;background:#C8D6DB}.pst-r-station.active .pst-r-dot{background:#5B9BB3;box-shadow:0 0 0 3px #DDEEF3}.pst-r-station b{font-size:9.5px;color:#33454D}.pst-r-station small{display:block;font-size:7.5px;color:#8B979C;margin-top:1px}.pst-r-tag{font-size:7px;color:#71858D;background:#EDF3F5;border-radius:999px;padding:3px 6px}
@media(max-width:650px){#pst-focus-radio{right:12px;bottom:72px;width:min(315px,calc(100vw - 24px))}#pst-radio-fab{right:12px;bottom:14px}}
`;document.head.appendChild(style);

function renderList(){var host=document.getElementById('pst-r-list');if(!host)return;host.innerHTML=STATIONS.map(function(s){return '<button class="pst-r-station'+(current&&current.id===s.id?' active':'')+'" data-radio-id="'+s.id+'"><i class="pst-r-dot"></i><span><b>'+s.label+'</b><small>'+s.sub+'</small></span><em class="pst-r-tag">LIVE</em></button>';}).join('');}
function sync(){var main=document.getElementById('pst-r-main');if(main)main.innerHTML=playing?iconPause():iconPlay();var disc=document.getElementById('pst-r-disc');if(disc)disc.classList.toggle('playing',playing);var pulse=document.getElementById('pst-radio-pulse');if(pulse)pulse.classList.toggle('on',playing);if(current){setText('pst-r-title',current.label);setText('pst-r-sub',current.sub);}renderList();}
function status(t){setText('pst-r-status',t);}
function load(st,useAlt){current=st;triedAlt=!!useAlt;audio.src=(useAlt&&st.alt)?st.alt:st.url;audio.load();save();sync();status('Gati për dëgjim');}
async function play(){if(!current)load(stationById('piano'));try{status('Duke u lidhur…');await audio.play();playing=true;sync();status('Duke luajtur');}catch(e){playing=false;sync();status('Kliko përsëri ose provo një stacion tjetër');}}
function pause(){audio.pause();playing=false;sync();status('Në pauzë');}
function choose(id){var resume=playing;pause();load(stationById(id));if(resume)play();}
function step(dir){var i=(currentIndex()+dir+STATIONS.length)%STATIONS.length;choose(STATIONS[i].id);}

function build(){if(document.getElementById('pst-radio-fab'))return;var fab=document.createElement('button');fab.id='pst-radio-fab';fab.title='Focus Radio';fab.innerHTML=iconMusic()+'<i class="pst-radio-pulse" id="pst-radio-pulse"></i>';document.body.appendChild(fab);var panel=document.createElement('div');panel.id='pst-focus-radio';panel.innerHTML='<div class="pst-r-head"><div class="pst-r-brand"><b>Focus Radio</b><span>Piano · violinë · chill · ambient</span></div><button class="pst-r-close" id="pst-r-close">×</button></div><div class="pst-r-now"><div class="pst-r-disc" id="pst-r-disc"></div><div><div class="pst-r-label">Tani</div><div class="pst-r-title" id="pst-r-title"></div><div class="pst-r-sub" id="pst-r-sub"></div><div class="pst-r-status" id="pst-r-status">Gati për dëgjim</div></div></div><div class="pst-r-controls"><button class="pst-r-btn" id="pst-r-prev" title="Stacioni paraprak">‹</button><button class="pst-r-btn pst-r-main" id="pst-r-main" title="Play / Pause"></button><button class="pst-r-btn" id="pst-r-next" title="Stacioni tjetër">›</button><label class="pst-r-volume"><span>VOL</span><input id="pst-r-volume" type="range" min="0" max="1" step="0.01" value="'+audio.volume+'"></label></div><div class="pst-r-list" id="pst-r-list"></div>';document.body.appendChild(panel);
  fab.onclick=function(){panel.classList.toggle('open');};document.getElementById('pst-r-close').onclick=function(){panel.classList.remove('open');};document.getElementById('pst-r-main').onclick=function(){playing?pause():play();};document.getElementById('pst-r-prev').onclick=function(){step(-1);};document.getElementById('pst-r-next').onclick=function(){step(1);};document.getElementById('pst-r-volume').oninput=function(){audio.volume=Number(this.value);save();};panel.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-radio-id]');if(b)choose(b.getAttribute('data-radio-id'));});
  var saved='piano';try{saved=localStorage.getItem('pst_radio_station')||saved;}catch(e){}load(stationById(saved));sync();
}

audio.addEventListener('playing',function(){playing=true;sync();status('Duke luajtur');});
audio.addEventListener('pause',function(){if(!audio.ended){playing=false;sync();}});audio.addEventListener('waiting',function(){status('Duke ngarkuar…');});audio.addEventListener('error',function(){if(current&&current.alt&&!triedAlt){var resume=playing;load(current,true);if(resume)play();return;}playing=false;sync();status('Ky stacion nuk u lidh. Provo një tjetër.');});
window.pstRadioToggle=function(){playing?pause():play();};window.pstRadioChange=choose;window.PSTFocusRadio={play:play,pause:pause,choose:choose,stations:STATIONS};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();