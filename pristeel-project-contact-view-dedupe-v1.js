/* PRISTEEL project contact view dedupe v1
 * Presentation-only: Gmail dot/+ aliases are shown as one project contact.
 * Does not delete, merge or rewrite stored contact records.
 */
(function(){
'use strict';
if(window.__pstProjectContactViewDedupeV1)return;window.__pstProjectContactViewDedupeV1=true;
function gmailKey(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@(gmail\.com|googlemail\.com)/);if(!m)return'';var p=m[0].split('@'),local=p[0].split('+')[0].replace(/\./g,'');return local+'@gmail.com';}
function card(){return [].slice.call(document.querySelectorAll('#page-workspace-project .pf2-card')).filter(function(c){var b=c.querySelector('header b');return b&&String(b.textContent||'').trim()==='Kontaktet';})[0]||null;}
function apply(){var c=card();if(!c)return false;var rows=[].slice.call(c.querySelectorAll('.pf2-line')),groups={};rows.forEach(function(r){var k=gmailKey(r.textContent);if(!k)return;groups[k]=groups[k]||[];groups[k].push(r);});Object.keys(groups).forEach(function(k){var g=groups[k];if(g.length<2)return;g.sort(function(a,b){return String(b.textContent||'').length-String(a.textContent||'').length;});g.slice(1).forEach(function(r){r.remove();});});var left=c.querySelectorAll('.pf2-line').length,h=c.querySelector('header span');if(h)h.textContent=left+' kontakte';return true;}
function schedule(){[0,80,220].forEach(function(ms){setTimeout(apply,ms);});}
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="communication"]'))schedule();},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.PSTProjectContactViewDedupeV1={apply:apply,_test:{gmailKey:gmailKey}};
})();