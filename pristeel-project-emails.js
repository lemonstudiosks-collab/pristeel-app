/* PRISTEEL email modules bootstrap */
(function(){
'use strict';
var files=['pristeel-email-core.js','pristeel-email-outreach.js','pristeel-email-project.js'];
function load(i){
  if(i>=files.length)return;
  var s=document.createElement('script');
  s.src=files[i];
  s.defer=true;
  s.onload=function(){load(i+1);};
  s.onerror=function(){console.error('Nuk u ngarkua moduli:',files[i]);};
  document.head.appendChild(s);
}
load(0);
})();