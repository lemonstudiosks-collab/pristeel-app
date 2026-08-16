function s(v){return String(v==null?'':v);}
function ext(name){const m=s(name).toLowerCase().match(/\.([a-z0-9]{1,10})$/);return m?m[1]:'';}
function ascii(bytes,start=0,length=16){let out='';const end=Math.min(bytes?.length||0,start+length);for(let i=start;i<end;i++){const c=bytes[i];out+=c>=32&&c<=126?String.fromCharCode(c):'.';}return out;}
export function isDwgSource(name,mime){const e=ext(name),m=s(mime).toLowerCase();return e==='dwg'||m.includes('dwg')||m.includes('autocad');}
export function inspectDwgSource(bytes,{name='',mime=''}={}){
  if(!(bytes instanceof Uint8Array)||!bytes.length)return {text:'',method:'dwg-header-v1',status:'needs_conversion',error:'Empty DWG source; trusted CAD conversion is required.',cad_metadata:{format:'DWG',signature:null,size_bytes:0}};
  const raw=ascii(bytes,0,6),match=raw.match(/^AC\d{4}$/),signature=match?match[0]:null;
  return {text:'',method:'dwg-header-v1',status:'needs_conversion',error:signature?'DWG header verified. Geometry, dimensions and annotations require a trusted CAD conversion/parser before technical facts can be used.':'File is named/typed as DWG but the standard ACxxxx header was not verified; do not infer CAD contents.',cad_metadata:{format:'DWG',signature,size_bytes:bytes.length,header_ascii:raw,verified_header:!!signature,source_name:s(name),source_mime:s(mime)}};
}
