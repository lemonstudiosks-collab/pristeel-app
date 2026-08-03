/* PRISTEEL — autorizim interaktiv Gmail për hyrjen nga add-on-i */
(function(){
'use strict';

var params=new URLSearchParams(window.location.search);
if(params.get('gmail_intake')!=='1')return;

var A=window.PSTEmail;
if(!A||typeof A.auth!=='function')return;

var TOKEN_KEY='pst_gmail_intake_token';
var EXP_KEY='pst_gmail_intake_token_exp';
var originalAuth=A.auth.bind(A);

function savedToken(){
  try{
    var token=sessionStorage.getItem(TOKEN_KEY)||'';
    var exp=parseInt(sessionStorage.getItem(EXP_KEY)||'0',10)||0;
    if(token&&Date.now()<exp-30000)return{token:token,exp:exp};
  }catch(e){}
  return null;
}

function saveToken(token){
  var exp=A.tokenExp||Date.now()+55*60*1000;
  try{
    sessionStorage.setItem(TOKEN_KEY,token);
    sessionStorage.setItem(EXP_KEY,String(exp));
  }catch(e){}
  return token;
}

A.authInteractive=async function(){
  var token=await originalAuth();
  return saveToken(token);
};

A.auth=function(){
  var saved=savedToken();
  if(saved){
    A.token=saved.token;
    A.tokenExp=saved.exp;
    return Promise.resolve(saved.token);
  }
  return Promise.reject(new Error('Autorizo Gmail-in për të ngarkuar thread-in, historikun dhe skedarët.'));
};

function setStatus(msg,color){
  var el=document.getElementById('pgi-status');
  if(el){
    el.textContent=msg||'';
    el.style.color=color||'var(--text3)';
  }
}

/* Pas autorizimit ringarkohet vetëm rrjedha e Gmail intake-it.
   Nuk rifreskohet e gjithë platforma, sepse reload-i mund ta nxjerrë
   përdoruesin nga sesioni i PRISTEEL-it. */
function restartGmailIntake(){
  return new Promise(function(resolve,reject){
    var previous=document.getElementById('pgi-bg');
    if(previous)previous.id='pgi-bg-before-auth';

    var script=document.createElement('script');
    script.src='pristeel-gmail-intake.js?reauth='+Date.now();
    script.onload=function(){
      if(previous&&previous.parentNode)previous.parentNode.removeChild(previous);

      /* Rifresko edhe zbulimin e klientit pasi modali i ri të jetë krijuar. */
      var clientScript=document.createElement('script');
      clientScript.src='pristeel-gmail-intake-client.js?reauth='+Date.now();
      clientScript.onerror=function(){console.warn('Nuk u ringarkua moduli i klientit të Gmail-it.');};
      document.head.appendChild(clientScript);
      resolve();
    };
    script.onerror=function(){
      if(previous)previous.id='pgi-bg';
      reject(new Error('Moduli i Gmail-it nuk u ringarkua. Rifresko faqen dhe provo përsëri.'));
    };
    document.head.appendChild(script);
  });
}

function injectButton(){
  if(savedToken())return true;
  var footer=document.querySelector('.pgi-ft');
  if(!footer)return false;
  if(document.getElementById('pgi-authorize'))return true;

  var create=document.getElementById('pgi-create');
  var link=document.getElementById('pgi-link-existing');
  if(create)create.disabled=true;
  if(link)link.disabled=true;

  var button=document.createElement('button');
  button.id='pgi-authorize';
  button.className='btn btn-sm btn-primary';
  button.textContent='Autorizo Gmail dhe ngarko thread-in';
  button.onclick=async function(){
    button.disabled=true;
    button.textContent='Duke autorizuar…';
    setStatus('Po hapet autorizimi Google…');
    try{
      await A.authInteractive();
      setStatus('Autorizimi u krye. Po ngarkohet thread-i…','var(--green-text)');
      await restartGmailIntake();
    }catch(err){
      button.disabled=false;
      button.textContent='Autorizo Gmail dhe ngarko thread-in';
      setStatus((err&&err.message)||'Autorizimi Gmail dështoi.','var(--red-text)');
    }
  };

  footer.insertBefore(button,footer.firstChild);
  setStatus('Kliko “Autorizo Gmail dhe ngarko thread-in” për të vazhduar.');
  return true;
}

var tries=0;
var timer=setInterval(function(){
  if(injectButton()||++tries>120)clearInterval(timer);
},250);

var observer=new MutationObserver(function(){
  if(injectButton())observer.disconnect();
});
observer.observe(document.documentElement,{childList:true,subtree:true});

})();
