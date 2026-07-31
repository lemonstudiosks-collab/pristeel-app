/* PRISTEEL — gjen klientin e jashtëm nga i gjithë Gmail thread-i */
(function(){
'use strict';

var params=new URLSearchParams(window.location.search);
if(params.get('gmail_intake')!=='1')return;

function emailFrom(s){
  var m=String(s||'').match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);
  return m?m[0].toLowerCase():'';
}
function header(payload,name){
  var hs=(payload&&payload.headers)||[];
  name=String(name||'').toLowerCase();
  for(var i=0;i<hs.length;i++){
    if(String(hs[i].name||'').toLowerCase()===name)return hs[i].value||'';
  }
  return '';
}
function cleanName(s){
  return String(s||'').replace(/<[^>]+>/g,'').replace(/["']/g,'').trim();
}
function companyFrom(from){
  var name=cleanName(from),mail=emailFrom(from);
  var marked=name.match(/[\[(]([^\])]+)[\])]/);
  if(marked&&marked[1])return marked[1].trim().slice(0,120);
  var domain=(mail.split('@')[1]||'').toLowerCase();
  var root=(domain.split('.')[0]||'').replace(/[-_]+/g,' ').trim();
  var generic={gmail:1,outlook:1,hotmail:1,yahoo:1,icloud:1,protonmail:1};
  if(root&&!generic[root]){
    return root.replace(/\b\w/g,function(c){return c.toUpperCase();}).slice(0,120);
  }
  return name.slice(0,120);
}

async function applyClient(){
  var field=document.getElementById('pgi-client');
  var A=window.PSTEmail;
  var threadId=params.get('gmail_thread_id')||'';
  if(!field||!A||!threadId)return false;
  try{
    var token=await A.auth();
    var thread=await A.gmail('/threads/'+encodeURIComponent(threadId)+'?format=full',token);
    var messages=thread.messages||[];
    for(var i=messages.length-1;i>=0;i--){
      var from=header(messages[i].payload,'From');
      var mail=emailFrom(from);
      if(mail&&!A.isInternal(mail)){
        var company=companyFrom(from);
        if(company)field.value=company;
        return true;
      }
    }
  }catch(e){
    console.warn('Nuk u gjet klienti i jashtëm nga thread-i:',e);
  }
  return false;
}

var tries=0;
var timer=setInterval(function(){
  if(document.getElementById('pgi-client')&&window.PSTEmail){
    clearInterval(timer);
    applyClient();
  }else if(++tries>80){
    clearInterval(timer);
  }
},250);

})();
