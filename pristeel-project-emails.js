/* PRISTEEL email modules bootstrap */
(function(){
'use strict';
var files=[
  'pristeel-email-core.js?v=20260731-7',
  'pristeel-gmail-auth-gate.js?v=20260731-7',
  'pristeel-email-outreach.js?v=20260731-7',
  'pristeel-email-project.js?v=20260731-7',
  'pristeel-email-daily.js?v=20260731-7',
  'pristeel-drive-import.js?v=20260731-7',
  'pristeel-project-attachments.js?v=20260731-7',
  'pristeel-gmail-intake.js?v=20260731-7',
  'pristeel-gmail-intake-client.js?v=20260731-7'
];
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
