import fs from 'node:fs';

function update(path,fn){const before=fs.readFileSync(path,'utf8');const after=fn(before);if(after===before)throw new Error(`No change produced for ${path}`);fs.writeFileSync(path,after,'utf8');}

update('scripts/ai-request-api-smoke.mjs',s=>{
  s=s.replaceAll("localStorage.setItem('pristeel_apikey', 'legacy-test-key');","localStorage.setItem('pristeel_groq_apikey', 'legacy-test-key');");
  s=s.replaceAll("localStorage.setItem('pristeel_apikey', '__GEMINI_COMPAT__');\n",'');
  s=s.replaceAll("localStorage.removeItem('pristeel_apikey');","localStorage.removeItem('pristeel_groq_apikey');");
  s=s.replace('Legacy compatibility key was not detected.','Dedicated Groq key was not detected.');
  s=s.replace('Missing compatibility key should report unavailable.','Missing real provider keys should report unavailable.');
  return s;
});

for(const path of ['scripts/ai-provider-routing-smoke.mjs','scripts/ai-fetch-wrapper-removal-smoke.mjs']){
  update(path,s=>{
    s=s.replaceAll("localStorage.setItem('pristeel_apikey','legacy-test-key');","localStorage.setItem('pristeel_groq_apikey','legacy-test-key');");
    s=s.replaceAll("localStorage.setItem('pristeel_apikey','__GEMINI_COMPAT__');\n",'');
    return s;
  });
}

console.log('Updated provider request/routing/wrapper smokes for real-key marker-free storage.');
