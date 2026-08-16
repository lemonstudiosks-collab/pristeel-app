function s(v){return String(v==null?'':v);} 
function ext(name){const m=s(name).toLowerCase().match(/\.([a-z0-9]{1,10})$/);return m?m[1]:'';}
function imageType(name,mime){const e=ext(name),m=s(mime).toLowerCase();return m.startsWith('image/')||['png','jpg','jpeg','webp','bmp','tif','tiff','gif'].includes(e);}
function likelySignature(name,size){const n=s(name).toLowerCase();const generic=/^(?:image\d{0,4}|outlook-[^.]+|logo|signature|sig)[._-]/.test(n)||/^(?:image\d{0,4}|logo|signature)\.(?:png|jpe?g|gif|webp)$/i.test(n);return generic&&Number(size||0)>0&&Number(size)<100*1024;}

// Local OCR primary switch, 2026-08-16.
// The export name is intentionally kept for compatibility with the existing
// project-document-intake v10 import. This module performs NO Google Vision
// token request and NO Vision API call. Eligible scans/images are deferred to
// the guarded local OCR queue, where the Mac mini Tesseract worker processes
// the archived source and returns OCR text with trust_tier='ocr'.
export async function ocrWithGoogleVision(bytes,{name='',mime=''}={}){
  if(!(bytes instanceof Uint8Array)||!bytes.length){
    return {text:'',method:'local-tesseract-pending-v1',status:'review',error:'Empty OCR source.',trust_tier:'ocr'};
  }
  const e=ext(name),m=s(mime).toLowerCase(),isPdf=e==='pdf'||m.includes('pdf');
  if(!isPdf&&imageType(name,mime)&&likelySignature(name,bytes.length)){
    return {text:'',method:'image-signature-noise-v1',status:'metadata_noise',error:'Small generic image attachment classified as likely signature/logo.',trust_tier:'metadata'};
  }
  if(!isPdf&&!imageType(name,mime)){
    return {text:'',method:'local-tesseract-pending-v1',status:'review',error:'Source is not an OCR-supported PDF/image.',trust_tier:'ocr'};
  }
  return {
    text:'',
    method:'local-tesseract-pending-v1',
    status:'needs_ocr',
    error:'Queued for local OCR worker; Google Vision is disabled for PPPP OCR.',
    trust_tier:'ocr',
    ocr_metadata:{provider:'local-tesseract',mode:'queued'}
  };
}
