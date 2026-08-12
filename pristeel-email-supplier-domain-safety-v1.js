/* PRISTEEL Gmail supplier-domain safety v1
 * Additive safety layer over PSTEmail.profiles().
 * Supplier/subcontractor partner email domains are multi-project by nature and
 * must not become project-owner emails that earn email-unique/email-shared score.
 * Project/reference/thread evidence remains untouched.
 */
(function(){
'use strict';
if(window.PSTEmailSupplierDomainSafetyV1)return;

var installed=false;
function A(v){return Array.isArray(v)?v:[];}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function email(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function domain(v){var e=email(v),i=e.lastIndexOf('@');return i>-1?e.slice(i+1):'';}
function namesOf(p){return [p&&p.name].concat(A(p&&p.aliases)).map(norm).filter(function(x){return x.length>=4;});}
function companyMatches(company,names){var c=norm(company);if(!c)return false;return names.some(function(n){return c===n||c.indexOf(n)>-1||n.indexOf(c)>-1;});}
async function supplierDomains(){
 var partners=[],contacts=[];
 if(typeof window.supaFetch!=='function')return{};
 try{partners=await window.supaFetch('partners?relation=cs.{supplier}&select=name,aliases,relation&limit=5000');}catch(e){}
 try{contacts=await window.supaFetch('contacts?email=not.is.null&select=company,email,kind&limit=5000');}catch(e){}
 var partnerNames=[];A(partners).forEach(function(p){partnerNames=partnerNames.concat(namesOf(p));});
 partnerNames=partnerNames.filter(function(x,i,a){return a.indexOf(x)===i;});
 var out={};
 A(contacts).forEach(function(c){
   var d=domain(c&&c.email);if(!d)return;
   if(String(c&&c.kind||'').toLowerCase()==='supplier'||companyMatches(c&&c.company,partnerNames))out[d]=1;
 });
 return out;
}
function filterProfiles(profiles,domains){
 A(profiles).forEach(function(p){
   var removed=[];
   p.emails=A(p.emails).filter(function(e){if(domains[domain(e)]){removed.push(e);return false;}return true;});
   p.supplier_emails=A(p.supplier_emails).concat(removed).filter(function(x,i,a){return x&&a.indexOf(x)===i;});
 });
 return profiles;
}
function install(){
 if(installed)return true;
 var P=window.PSTEmail;if(!P||typeof P.profiles!=='function')return false;
 if(P.profiles.__pstSupplierDomainSafety){installed=true;return true;}
 var base=P.profiles;
 P.profiles=async function(){var profiles=await base.apply(this,arguments),domains=await supplierDomains();P.supplierDomains=domains;return filterProfiles(profiles,domains);};
 P.profiles.__pstSupplierDomainSafety=true;P.profiles.__base=base;installed=true;return true;
}
function schedule(){[0,50,120,300,700,1400].forEach(function(ms){setTimeout(function(){if(!installed)install();},ms);});}
install();schedule();document.addEventListener('pst:modules-ready',function(){install();},{once:true});
window.PSTEmailSupplierDomainSafetyV1={install:install,supplierDomains:supplierDomains,filterProfiles:filterProfiles,companyMatches:companyMatches,domain:domain,_state:function(){return{installed:installed};}};
})();