/* PRISTEEL - zgjeron kerkimin Gmail per ofertuesit e projektit SSP Camera Poles */
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
  var suppliers=[
    'tsotas@biomek.gr',
    'biomek@biomek.gr',
    'info@zincometal.gr',
    'sales@zincometal.gr'
  ];

  function projectQuery(q){
    var x=String(q||'').toLowerCase();
    return x.indexOf('camera pole')>-1||
      x.indexOf('steel poles')>-1||
      x.indexOf('rfq - steel poles')>-1||
      x.indexOf('17s-25')>-1||
      x.indexOf('smartct')>-1||
      x.indexOf('shtyll')>-1||
      x.indexOf('bazament')>-1;
  }

  function expandSearchPath(path){
    if(String(path||'').indexOf('/messages?')!==0)return path;
    try{
      var u=new URL('https://local.invalid'+path);
      var q=u.searchParams.get('q')||'';
      if(!projectQuery(q))return path;
      var extra=[
        '"RFQ - Steel poles"',
        '"Steel poles"',
        '"Camera Pole"',
        'CCTV',
        'Biomek',
        'Zincometal',
        'P26/21659'
      ];
      suppliers.forEach(function(e){extra.push('from:'+e);extra.push('to:'+e);});
      q+=' {'+extra.join(' ')+'}';
      u.searchParams.set('q',q);
      return u.pathname+'?'+u.searchParams.toString();
    }catch(e){return path;}
  }

  function headersText(result){
    var hs=result&&result.payload&&result.payload.headers||[];
    return hs.map(function(h){return String(h.name||'')+': '+String(h.value||'');}).join('\n').toLowerCase();
  }

  function belongsToSspSupplierFlow(result){
    var text=headersText(result)+'\n'+String(result&&result.snippet||'').toLowerCase();
    if(suppliers.some(function(e){return text.indexOf(e)>-1;}))return true;
    return /subject:\s*(re:\s*)?rfq\s*-\s*steel poles|camera pole|cctv pole|17s[- ]25|p26\/21659|zincometal|biomek/.test(text);
  }

  A.gmail=async function(path,token){
    var expanded=expandSearchPath(path);
    var result=await original.call(A,expanded,token);
    if(/\/messages\/[^/?]+\?format=full/.test(String(path||''))&&belongsToSspSupplierFlow(result)){
      result.snippet=String(result.snippet||'')+' SSP Smart City Camera Poles 17S-25 Steel poles Albania supplier quotation';
    }
    return result;
  };
  A.gmail.__pstExpanded=true;
},100);
})();
