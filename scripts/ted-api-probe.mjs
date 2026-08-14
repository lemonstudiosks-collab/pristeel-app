const response=await fetch('https://api.ted.europa.eu/v3/notices/search',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:'publication-number IN (560439-2026 562840-2026)',fields:['publication-number','notice-title','notice-type','publication-date','buyer-name','classification-cpv','deadline','place-of-performance'],page:1,limit:10,scope:'ALL',checkQuerySyntax:false,paginationMode:'PAGE_NUMBER',onlyLatestVersions:false})});
const raw=await response.text();
console.log('TED probe status',response.status);
if(!response.ok){console.log(raw.slice(0,4000));process.exit(1);}
const json=JSON.parse(raw);
console.log('TED probe top keys',Object.keys(json));
for(const [key,value] of Object.entries(json)){
 if(Array.isArray(value))console.log('array',key,'length',value.length,'sample keys',value[0]&&typeof value[0]==='object'?Object.keys(value[0]):[],'sample',JSON.stringify(value[0]||null).slice(0,3500));
 else if(value&&typeof value==='object')console.log('object',key,'keys',Object.keys(value).slice(0,30),'sample',JSON.stringify(value).slice(0,3500));
 else console.log('scalar',key,value);
}
