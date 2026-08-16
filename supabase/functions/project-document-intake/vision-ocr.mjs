const SA_JSON=Deno.env.get('GOOGLE_SA_JSON')||'';
const MAX_IMAGE_BYTES=10*1024*1024;
const MAX_FILE_BYTES=15*1024*1024;
let tokenCache=null;

function s(v){return String(v==null?'':v);}
function ext(name){const m=s(name).toLowerCase().match(/\.([a-z0-9]{1,10})$/);return m?m[1]:'';}
function base64(bytes){let out='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));return btoa(out);}
function b64url(input){const bytes=typeof input==='string'?new TextEncoder().encode(input):input;return base64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function pem(p){const x=s(p).replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s+/g,'');const bin=atob(x),b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return b.buffer;}
function imageType(name,mime){const e=ext(name),m=s(mime).toLowerCase();return m.startsWith('image/')||['png','jpg','jpeg','webp','bmp','tif','tiff','gif'].includes(e);}
function likelySignature(name,size){const n=s(name).toLowerCase();const generic=/^(?:image\d{0,4}|outlook-[^.]+|logo|signature|sig)[._-]/.test(n)||/^(?:image\d{0,4}|logo|signature)\.(?:png|jpe?g|gif|webp)$/i.test(n);return generic&&Number(size||0)>0&&Number(size)<100*1024;}
async function token(){
  const now=Math.floor(Date.now()/1000);if(tokenCache&&tokenCache.exp>now+60)return tokenCache.value;
  if(!SA_JSON)throw new Error('Google service account is unavailable');
  const sa=JSON.parse(SA_JSON),head={alg:'RS256',typ:'JWT'},claim={iss:sa.client_email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600};
  const unsigned=`${b64url(JSON.stringify(head))}.${b64url(JSON.stringify(claim))}`,key=await crypto.subtle.importKey('pkcs8',pem(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']),sig=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned))),jwt=`${unsigned}.${b64url(sig)}`;
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})}),j=await r.json();
  if(!r.ok)throw new Error(`Google Vision token ${r.status}: ${j?.error||'failed'}`);
  tokenCache={value:j.access_token,exp:now+(j.expires_in||3600)};return tokenCache.value;
}
async function post(url,body){
  const sa=JSON.parse(SA_JSON),t=await token(),headers={Authorization:`Bearer ${t}`,'Content-Type':'application/json'};if(sa.project_id)headers['x-goog-user-project']=sa.project_id;
  const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)}),raw=await r.text();let j={};try{j=raw?JSON.parse(raw):{};}catch{}
  if(!r.ok)throw new Error(`Google Vision ${r.status}: ${s(j?.error?.message||raw).slice(0,500)}`);return j;
}
function responseText(x){return s(x?.fullTextAnnotation?.text||x?.textAnnotations?.[0]?.description).trim();}
export async function ocrWithGoogleVision(bytes,{name='',mime=''}={}){
  if(!(bytes instanceof Uint8Array)||!bytes.length)return {text:'',method:'google-vision-ocr-v1',status:'review',error:'Empty OCR source.',trust_tier:'ocr'};
  const e=ext(name),m=s(mime).toLowerCase(),isPdf=e==='pdf'||m.includes('pdf');
  if(!isPdf&&imageType(name,mime)&&likelySignature(name,bytes.length))return {text:'',method:'image-signature-noise-v1',status:'metadata_noise',error:'Small generic image attachment classified as likely signature/logo.',trust_tier:'metadata'};
  if(isPdf&&bytes.length>MAX_FILE_BYTES)return {text:'',method:'google-vision-ocr-guard-v1',status:'review',error:'Scanned PDF exceeds the 15 MiB synchronous OCR limit.',trust_tier:'ocr'};
  if(!isPdf&&bytes.length>MAX_IMAGE_BYTES)return {text:'',method:'google-vision-ocr-guard-v1',status:'review',error:'Image exceeds the 10 MiB automatic OCR limit.',trust_tier:'ocr'};
  try{
    if(isPdf){
      const j=await post('https://vision.googleapis.com/v1/files:annotate',{requests:[{inputConfig:{mimeType:'application/pdf',content:base64(bytes)},features:[{type:'DOCUMENT_TEXT_DETECTION'}]}]}),file=j?.responses?.[0],pages=file?.responses||[],errors=pages.map(x=>x?.error?.message).filter(Boolean),text=pages.map(responseText).filter(Boolean).join('\n\n').trim();
      if(errors.length&&!text)return {text:'',method:'google-vision-pdf-ocr-v1',status:'review',error:errors.join('; ').slice(0,1000),trust_tier:'ocr'};
      return {text,method:'google-vision-pdf-ocr-v1',status:text?'extracted':'needs_vision',error:errors.length?errors.join('; ').slice(0,1000):null,trust_tier:'ocr',ocr_metadata:{provider:'google-vision',mode:'DOCUMENT_TEXT_DETECTION',pages:pages.length}};
    }
    const j=await post('https://vision.googleapis.com/v1/images:annotate',{requests:[{image:{content:base64(bytes)},features:[{type:'DOCUMENT_TEXT_DETECTION'}]}]}),res=j?.responses?.[0]||{},err=res?.error?.message||'',text=responseText(res);
    if(err&&!text)return {text:'',method:'google-vision-image-ocr-v1',status:'review',error:s(err).slice(0,1000),trust_tier:'ocr'};
    return {text,method:'google-vision-image-ocr-v1',status:text?'extracted':'needs_vision',error:err?s(err).slice(0,1000):null,trust_tier:'ocr',ocr_metadata:{provider:'google-vision',mode:'DOCUMENT_TEXT_DETECTION'}};
  }catch(e2){return {text:'',method:'google-vision-ocr-v1',status:'needs_ocr',error:String(e2).slice(0,1500),trust_tier:'ocr'};}
}
