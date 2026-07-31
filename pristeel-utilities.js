/* PRISTEEL Utilities: radio dhe kursi EUR/USD */
(function(){
'use strict';

if(window.__pstUtilitiesLoaded)return;
window.__pstUtilitiesLoaded=true;

var STATIONS=[
  {id:'chillout',label:'Chillout · Antenne',url:'https://stream.chillout.de/chillout/stream/mp3'},
  {id:'groove',label:'Chill · Groove Salad',url:'https://ice5.somafm.com/groovesalad-128-mp3',alt:'https://ice2.somafm.com/groovesalad-128-mp3'},
  {id:'classic',label:'Chill Classic · Groove Salad',url:'https://ice5.somafm.com/gsclassic-128-mp3',alt:'https://ice2.somafm.com/gsclassic-128-mp3'},
  {id:'piano',label:'Piano/Classical · Swiss Classic',url:'https://stream.srg-ssr.ch/srgssr/rsc_de/mp3/128'},
  {id:'bar',label:'Chill Bar · Secret Agent',url:'https://ice5.somafm.com/secretagent-128-mp3',alt:'https://ice6.somafm.com/secretagent-128-mp3'},
  {id:'ambient',label:'Ambient · Drone Zone',url:'https://ice5.somafm.com/dronezone-128-mp3',alt:'https://ice6.somafm.com/dronezone-128-mp3'},
  {id:'soft',label:'Soft Chill · Lush',url:'https://ice5.somafm.com/lush-128-mp3',alt:'https://ice2.somafm.com/lush-128-mp3'},
  {id:'deep',label:'Deep Focus · Deep Space One',url:'https://ice5.somafm.com/deepspaceone-128-mp3',alt:'https://ice2.somafm.com/deepspaceone-128-mp3'}
];
var audio=new Audio();
audio.preload='none';
var current=null,playing=false,triedAlt=false;

var style=document.createElement('style');
style.id='pst-utilities-style';
style.textContent=`
#pst-utilities{border:1px solid #E4E7E9;background:#FAFBFB;border-radius:11px;padding:9px;margin:8px 0 10px}
.pst-util-fx{display:flex;align-items:center;gap:8px;padding:2px 2px 8px;border-bottom:1px solid #E7EAEC;cursor:pointer}
.pst-util-fx-icon{width:26px;height:26px;border-radius:8px;background:#EAF2F7;color:#3D6F8E;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800}
.pst-util-fx-main{flex:1;min-width:0}.pst-util-fx-pair{font-size:8px;color:#969CA1;text-transform:uppercase;letter-spacing:.55px;font-weight:750}.pst-util-fx-rate{font-size:12px;font-weight:750;color:#2E3337;margin-top:1px}.pst-util-fx-meta{font-size:7.5px;color:#A0A5A9;text-align:right;line-height:1.35}
.pst-util-radio{display:grid;grid-template-columns:30px minmax(0,1fr);gap:7px;align-items:center;padding-top:8px}
.pst-radio-play{width:30px;height:30px;border:0;border-radius:9px;background:#F7EDE5;color:#A65F2E;display:flex;align-items:center;justify-content:center;cursor:pointer}
.pst-radio-play:hover{background:#F2E2D6}.pst-radio-play svg{width:14px;height:14px;fill:currentColor}
.pst-radio-play.playing{background:#A65F2E;color:#fff}.pst-radio-play.error{background:#F9ECEA;color:#A64B42}
.pst-radio-main{min-width:0}.pst-radio-title{display:flex;align-items:center;gap:6px;font-size:8px;text-transform:uppercase;letter-spacing:.55px;color:#969CA1;font-weight:750;margin-bottom:3px}
.pst-radio-bars{display:flex;align-items:flex-end;gap:1.5px;height:8px}.pst-radio-bars i{display:block;width:2px;height:3px;border-radius:2px;background:#A65F2E}.pst-radio-play.playing~.pst-radio-main .pst-radio-bars i:nth-child(1){animation:pstBar .7s infinite alternate}.pst-radio-play.playing~.pst-radio-main .pst-radio-bars i:nth-child(2){animation:pstBar .9s .2s infinite alternate}.pst-radio-play.playing~.pst-radio-main .pst-radio-bars i:nth-child(3){animation:pstBar .6s .1s infinite alternate}
@keyframes pstBar{to{height:8px}}
#pst-radio-select{width:100%;border:0;background:transparent;color:#34393D;font-size:9.5px;font-weight:650;padding:0;outline:none;cursor:pointer;text-overflow:ellipsis}
.pst-radio-status{font-size:7.5px;color:#9BA1A6;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:980px){#pst-utilities{padding:6px}.pst-util-fx-main,.pst-util-fx-meta,.pst-radio-main{display:none}.pst-util-fx{justify-content:center;border-bottom:0;padding:2px}.pst-util-radio{display:flex;justify-content:center;padding-top:6px}.pst-util-fx-icon{width:30px;height:30px}}
`;
document.head.appendChild(style);

function stationById(id){return STATIONS.find(function(s){return s.id===id;})||STATIONS[0];}
function setStatus(text){var el=document.getElementById('pst-radio-status');if(el)el.textContent=text;}
function playIcon(isPlaying){return isPlaying?'<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>':'<svg viewBox="0 0 24 24"><path d="M7 4.8v14.4L19 12 7 4.8z"/></svg>';}
function syncButton(){var b=document.getElementById('pst-radio-play');if(!b)return;b.innerHTML=playIcon(playing);b.classList.toggle('playing',playing);b.classList.remove('error');b.title=playing?'Ndale radion':'Luaj radion';}
function loadStation(st,preferAlt){
  current=st;triedAlt=!!preferAlt;
  audio.src=(preferAlt&&st.alt)?st.alt:st.url;
  audio.load();
  try{localStorage.setItem('pst_radio_station',st.id);}catch(e){}
  setStatus('Gati për dëgjim');
}
async function startRadio(){
  if(!current)loadStation(stationById('chillout'));
  try{
    setStatus('Duke u lidhur…');
    await audio.play();
    playing=true;syncButton();setStatus('Duke luajtur');
  }catch(err){
    playing=false;syncButton();setStatus('Safari nuk e nisi stream-in. Kliko përsëri.');
  }
}
function stopRadio(){audio.pause();playing=false;syncButton();setStatus('Në pauzë');}
window.pstRadioToggle=function(){if(playing)stopRadio();else startRadio();};
window.pstRadioChange=function(id){var st=stationById(id),resume=playing;stopRadio();loadStation(st);if(resume)startRadio();};

audio.addEventListener('playing',function(){playing=true;syncButton();setStatus('Duke luajtur');});
audio.addEventListener('pause',function(){if(!audio.ended){playing=false;syncButton();}});
audio.addEventListener('waiting',function(){setStatus('Duke ngarkuar…');});
audio.addEventListener('error',function(){
  if(current&&current.alt&&!triedAlt){var resume=playing;loadStation(current,true);if(resume)startRadio();return;}
  playing=false;syncButton();var b=document.getElementById('pst-radio-play');if(b)b.classList.add('error');setStatus('Ky kanal nuk u lidh. Provo një tjetër.');
});

function build(){
  var sidebar=document.getElementById('pst-v2-sidebar');
  if(!sidebar||document.getElementById('pst-utilities'))return !!sidebar;
  var search=sidebar.querySelector('.pst-v2-search');
  var box=document.createElement('div');box.id='pst-utilities';
  box.innerHTML='<div class="pst-util-fx" title="Kurs orientues ditor i ECB"><div class="pst-util-fx-icon">€$</div><div class="pst-util-fx-main"><div class="pst-util-fx-pair">EUR / USD</div><div class="pst-util-fx-rate" id="pst-eurusd-rate">Duke ngarkuar…</div></div><div class="pst-util-fx-meta" id="pst-eurusd-meta">ECB<br>ditor</div></div>'
    +'<div class="pst-util-radio"><button class="pst-radio-play" id="pst-radio-play" onclick="pstRadioToggle()">'+playIcon(false)+'</button><div class="pst-radio-main"><div class="pst-radio-title">Radio <span class="pst-radio-bars"><i></i><i></i><i></i></span></div><select id="pst-radio-select" onchange="pstRadioChange(this.value)">'+STATIONS.map(function(s){return '<option value="'+s.id+'">'+s.label+'</option>';}).join('')+'</select><div class="pst-radio-status" id="pst-radio-status">Gati për dëgjim</div></div></div>';
  sidebar.insertBefore(box,search||sidebar.lastChild);
  var saved='chillout';try{saved=localStorage.getItem('pst_radio_station')||saved;}catch(e){}
  var select=document.getElementById('pst-radio-select');if(select)select.value=stationById(saved).id;
  loadStation(stationById(saved));syncButton();loadFx();
  return true;
}

function showFx(rate,date){
  var r=document.getElementById('pst-eurusd-rate');var m=document.getElementById('pst-eurusd-meta');
  if(r)r.textContent='1 € = '+Number(rate).toFixed(4)+' $';
  if(m)m.innerHTML='ECB<br>'+String(date||'ditor');
  try{localStorage.setItem('pst_eurusd_cache',JSON.stringify({rate:Number(rate),date:date,ts:Date.now()}));}catch(e){}
}
async function loadFx(){
  try{
    var res=await fetch('https://api.frankfurter.dev/v2/rates?quotes=USD&providers=ECB',{cache:'no-store'});
    if(!res.ok)throw new Error('FX '+res.status);
    var data=await res.json();var row=Array.isArray(data)?data.find(function(x){return x.quote==='USD'&&x.base==='EUR';}):null;
    if(!row||!row.rate)throw new Error('EUR/USD mungon');
    showFx(row.rate,row.date);
  }catch(err){
    try{var cached=JSON.parse(localStorage.getItem('pst_eurusd_cache')||'null');if(cached&&cached.rate){showFx(cached.rate,cached.date);return;}}catch(e){}
    var r=document.getElementById('pst-eurusd-rate');var m=document.getElementById('pst-eurusd-meta');if(r)r.textContent='Pa lidhje';if(m)m.innerHTML='ECB<br>provo më vonë';
  }
}
window.pstRefreshFx=loadFx;

var tries=0,timer=setInterval(function(){if(build()||++tries>160)clearInterval(timer);},250);
setInterval(loadFx,6*60*60*1000);

})();
