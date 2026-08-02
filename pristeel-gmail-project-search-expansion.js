/* PRISTEEL — zgjeron kërkimin Gmail për ofertat e njohura të projektit SSP Camera Poles */
(function(){
'use strict';
if(window.__pstGmailProjectSearchExpansion)return;
window.__pstGmailProjectSearchExpansion=true;

var tries=0;
var timer=setInterval(function(){
  var A=window.PSTEmail;
  if(!A||typeof A.gmail!=='function'){
    if(++tries>80)clearInterval(timer);
    return;
  }
  clearInterval(timer);
  if(A.gmail.__pstExpanded)return;

  var original=A.gmail;
  var suppliers=['tsotas@biomek.gr','biomek@biomek.gr','info@zincometal.gr'];

  function projectQuery(q){
    var x=String(q||'').toLowerCase();
    return x.indexOf('camera pole')>-1||x.indexOf('17s-25')>-1||x.indexOf('smartct')>-1||x.indexOf('shtyll')>-1||x.indexOf('bazament')>-1;
  }

  function expandSearchPath(path){
    if(String(path||'').indexOf('/messages?')!==0)return path;
    try{
      var u=new URL('https://local.invalid'+path);
      var q=u.searchParams.get('q')||'';
      if(!projectQuery(q)||q.indexOf('PST_GREECE_EXPANDED')>-1)return path;
      var extra=['CCTV','Biomek','Greece','Greek','Zincometal'];
      suppliers.forEach(function(e){extra.push('from:'+e);extra.push('to:'+e);});
      var marker=' PST_GREECE_EXPANDED';
      if(/}\s*$/.test(q))q=q.replace(/}\s*$/,' '+extra.join(' ')+' }'+marker);
      else q+=' {'+extra.join(' ')+'}'+marker;
      u.searchParams.set('q',q);
      return u.pathname+'?'+u.searchParams.toString();
    }catch(e){return path;}
  }

  function headersText(result){
    var hs=result&&result.payload&&result.payload.headers||[];
    return hs.map(function(h){return String(h.name||'')+': '+String(h.value||'');}).join('\n').toLowerCase();
  }

  A.gmail=async function(path,token){
    var expanded=expandSearchPath(path);
    var result=await original.call(A,expanded,token);
    if(/\/messages\/[^/?]+\?format=full/.test(String(path||''))){
      var text=headersText(result);
      var greek=suppliers.some(function(e){return text.indexOf(e)>-1;})||text.indexOf('p26/21659')>-1;
      if(greek)result.snippet=String(result.snippet||'')+' Camera Pole CCTV Biomek Greece SSP 17S-25';
    }
    return result;
  };
  A.gmail.__pstExpanded=true;
},100);
})();
