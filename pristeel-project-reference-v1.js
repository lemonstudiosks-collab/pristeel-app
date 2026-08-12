/* PRISTEEL canonical project reference v1
 * Additive compatibility layer around projects.business_ref.
 * Legacy projects.ref is never rewritten automatically.
 */
(function(){
'use strict';
if(window.PSTProjectReferenceV1)return;

var writesWrapped=false,emailWrapped=false;
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function tidy(v){return String(v||'').trim().replace(/\s*\/\s*/g,'/').replace(/\s*-\s*/g,'-').replace(/\s+/g,' ');}
function clean(v){
 var raw=String(v||'').trim();if(!raw)return'';
 var m;
 m=raw.match(/^(PST-[A-Z0-9]+(?:[-/][A-Z0-9]+)*)/i);if(m)return tidy(m[1]);
 m=raw.match(/^(D\s*-\s*\d+(?:\/[A-Za-z0-9-]+)+)/i);if(m)return tidy(m[1]);
 m=raw.match(/^(ANF\s*-?\s*\d+)/i);if(m)return tidy(m[1]);
 m=raw.match(/^(TED\s+LOT\s*-\s*[A-Za-z0-9-]+)/i);if(m)return tidy(m[1]);
 m=raw.match(/(?:Projekt-?\/?Auftragsnummer|Auftragsnummer)\s*:\s*([A-Za-z0-9-]{4,})/i);if(m)return tidy(m[1]);
 m=raw.match(/^Projekt\s+([0-9][A-Za-z0-9-]{3,})(?:\s*[|/·]|$)/i);if(m)return tidy(m[1]);
 var first=raw.split(/\s+(?:\||·|\+)\s+|\s+\/\s+/)[0].trim();
 if(first!==raw&&first.length<=45&&/\d/.test(first)&&!/(eur|usd|chf|gbp|kg|ton|scope|ofert|offer|preis|price)/i.test(first))return tidy(first);
 if(raw.length<=45&&/\d/.test(raw)&&!/(eur|usd|chf|gbp|kg|ton|scope|ofert|offer|preis|price|referenz)/i.test(raw))return tidy(raw);
 return'';
}
function canonical(p){
 var b=String(p&&p.business_ref||'').trim();if(b)return tidy(b);
 var c=clean(p&&(p.ref||p.reference));return c||String(p&&(p.ref||p.reference)||'').trim();
}
function key(p){return norm(p&&p.name)+'|'+norm(p&&p.client)+'|'+norm(canonical(p));}
function enrichProfile(profile,businessById){
 if(!profile||!profile.p)return profile;
 var b=String(profile.p.business_ref||businessById&&businessById[String(profile.p.id)]||'').trim();
 if(b){profile.p.business_ref=b;var refs=Array.isArray(profile.refs)?profile.refs:[];var low=b.toLowerCase();if(refs.indexOf(low)<0)refs.unshift(low);profile.refs=refs;}
 return profile;
}
function wrapEmailProfiles(){
 if(emailWrapped)return true;
 var A=window.PSTEmail;if(!A||typeof A.profiles!=='function')return false;
 var base=A.profiles;
 A.profiles=async function(){
   var profiles=await base.apply(this,arguments),by={};
   if(typeof window.supaFetch==='function')try{
     var rows=await window.supaFetch('projects?select=id,business_ref&business_ref=not.is.null&limit=5000');
     (Array.isArray(rows)?rows:[]).forEach(function(p){if(p&&p.id&&p.business_ref)by[String(p.id)]=p.business_ref;});
   }catch(e){}
   (Array.isArray(profiles)?profiles:[]).forEach(function(q){enrichProfile(q,by);});
   A.projects=(Array.isArray(profiles)?profiles:[]).map(function(q){return q.p;});
   return profiles;
 };
 A.profiles.__pstBusinessRef=true;A.profiles.__base=base;emailWrapped=true;return true;
}
function wrapProjectWrites(){
 if(writesWrapped)return true;
 var f=window.supaFetch;if(typeof f!=='function')return false;
 async function wrapped(path,method,body){
   var m=String(method||'GET').toUpperCase(),isWrite=(m==='POST'||m==='PATCH')&&/^projects(?:\?|$)/.test(String(path||''));
   if(isWrite&&body&&typeof body==='object'&&!Array.isArray(body)){
     var rec=Object.assign({},body);
     if(!Object.prototype.hasOwnProperty.call(rec,'business_ref')){
       var c=clean(rec.ref||rec.reference);if(c)rec.business_ref=c;
     }
     return f.call(this,path,method,rec);
   }
   return f.apply(this,arguments);
 }
 wrapped.__pstProjectBusinessRef=true;wrapped.__base=f;window.supaFetch=wrapped;writesWrapped=true;return true;
}
function decorateForm(){
 var input=document.getElementById('i-ref');if(!input)return false;
 var wrap=input.parentElement,label=wrap&&wrap.querySelector('label');if(label)label.textContent='Referenca / kodi i projektit';
 if(wrap&&!wrap.querySelector('[data-pst-ref-hint]')){
   var h=document.createElement('div');h.setAttribute('data-pst-ref-hint','1');h.style.cssText='font-size:9.5px;color:var(--text3);margin-top:4px;line-height:1.35';h.textContent='Vetëm kodi stabil, p.sh. D-23/26, ANF-8915, 25007HH. Çmimi, tonazhi dhe shënimet vendosen te shënimet e projektit.';wrap.appendChild(h);
 }
 return true;
}
function install(){wrapProjectWrites();wrapEmailProfiles();decorateForm();}
install();[0,80,220,600,1200].forEach(function(ms){setTimeout(install,ms);});document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTProjectReferenceV1={install:install,norm:norm,tidy:tidy,clean:clean,canonical:canonical,key:key,enrichProfile:enrichProfile,wrapEmailProfiles:wrapEmailProfiles,wrapProjectWrites:wrapProjectWrites,decorateForm:decorateForm,_state:function(){return{writesWrapped:writesWrapped,emailWrapped:emailWrapped};}};
})();