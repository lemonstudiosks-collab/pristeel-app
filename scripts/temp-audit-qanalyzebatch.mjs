import fs from 'node:fs';
const source=fs.readFileSync('pristeel-procurement.html','utf8');
function extractFunction(source,needle){
  const start=source.indexOf(needle); if(start<0) throw new Error(`Missing ${needle}`);
  const brace=source.indexOf('{',start);
  let depth=0, quote='', escaped=false, lineComment=false, blockComment=false;
  for(let i=brace;i<source.length;i++){
    const ch=source[i], nx=source[i+1]||'';
    if(lineComment){if(ch==='\n')lineComment=false;continue;}
    if(blockComment){if(ch==='*'&&nx==='/'){blockComment=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='/'&&nx==='/'){lineComment=true;i++;continue;}
    if(ch==='/'&&nx==='*'){blockComment=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'){depth--;if(depth===0)return source.slice(start,i+1);}
  }
  throw new Error(`Unclosed ${needle}`);
}
for(const needle of ['async function qAnalyzeAll()','async function qAnalyzeOne(']){
  console.log(`=== ${needle} BEGIN ===`);
  console.log(extractFunction(source,needle));
  console.log(`=== ${needle} END ===`);
}
