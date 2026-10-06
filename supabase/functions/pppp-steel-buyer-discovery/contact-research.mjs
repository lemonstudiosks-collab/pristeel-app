// Bounded official-source contact research. No inferred email addresses.
export const PROCUREMENT = /procurement|purchas|steel procurement|raw materials|material procurement|einkauf|beschaffung|senior buyer|supply chain|sourcing|category manager/i;
const FALLBACK = /commercial|operations|production|project procurement|managing director|general management|geschäftsführ/i;
const resolvedHosts=new Map();
export function officialUrl(value, domain) {
  try { const u=new URL(value);const host=u.hostname.toLowerCase().replace(/^www\./,'');
    if(u.protocol!=='https:'||u.username||u.password||u.port||host!==domain||!host.includes('.')||/^[\d.]+$|:|localhost|\.local$|\.internal$/.test(host))return '';
    return u.href;
  } catch { return ''; }
}
export function publishedContacts(html,url,domain) {
  const clean=String(html).replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');
  const out=[];
  for(const m of clean.matchAll(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi)) {
    const email=m[0].toLowerCase(),local=email.split('@')[0];
    if(email.split('@')[1]!==domain||out.some(x=>x.email===email)||/^(jobs|hr|privacy|press|presse|marketing|webmaster|noreply|no-reply|security|abuse|datenschutz|karriere)/.test(local))continue;
    const context=clean.slice(Math.max(0,m.index-350),m.index+350).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    const procurement=PROCUREMENT.test(local+' '+context),general=/^(info|office|sales|contact|kontakt|mail|zentrale)$/.test(local),fallback=FALLBACK.test(context);
    // Names are taken only from an explicit Person JSON-LD object owning this email.
    let person='',role='';
    for(const script of String(html).matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try { const walk=o=>{if(!o||typeof o!=='object')return;if(o['@type']==='Person'&&String(o.email||'').replace(/^mailto:/i,'').toLowerCase()===email){person=String(o.name||'').slice(0,160);role=String(o.jobTitle||'').slice(0,160);}Object.values(o).forEach(v=>{if(Array.isArray(v))v.forEach(walk);else if(typeof v==='object')walk(v);});};walk(JSON.parse(script[1])); }catch{}
    }
    out.push({email,person,role:role||(procurement?'Purchasing / Procurement':general?'Official company contact':fallback?'Management / Operations':'Public company contact'),score:procurement?(person?100:90):person?75:general?50:40,url,claim:(procurement?'Published procurement contact: ':'Published official company contact: ')+email});
  }
  return out.sort((a,b)=>b.score-a.score);
}
async function readOfficial(url,domain,fetcher) {
  let current=officialUrl(url,domain);if(!current)return '';
  for(let redirects=0;redirects<3;redirects++) {
    if(typeof Deno!=='undefined'&&typeof Deno.resolveDns==='function'){
      const host=new URL(current).hostname,cached=resolvedHosts.get(host);
      const addresses=cached&&cached.expires>Date.now()?cached.addresses:(await Promise.all(['A','AAAA'].map(type=>Deno.resolveDns(host,type).catch(()=>[])))).flat();
      if(!addresses.length||addresses.some(ip=>ip.includes(':')?!/^[23][0-9a-f]{3}:/i.test(ip):/^(?:0|10|127|169\.254|192\.168|192\.0\.0)\.|^172\.(?:1[6-9]|2\d|3[01])\.|^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|^(?:22[4-9]|23\d|24\d|25[0-5])\./.test(ip)))throw Error('official_website_nonpublic_address');
      resolvedHosts.set(host,{addresses,expires:Date.now()+60000});
    }
    const response=await fetcher(current,{redirect:'manual',signal:AbortSignal.timeout(3000),headers:{Accept:'text/html','User-Agent':'PriSteel public procurement contact research'}});
    if([301,302,303,307,308].includes(response.status)){current=officialUrl(new URL(response.headers.get('location')||'',current).href,domain);if(!current)return '';continue;}
    if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return '';
    const reader=response.body.getReader();let html='',size=0;const decoder=new TextDecoder();
    try { while(size<400000){const {done,value}=await reader.read();if(done)break;size+=value.length;html+=decoder.decode(value,{stream:true});} }finally{await reader.cancel();}
    return html;
  }
  return '';
}
export async function researchOfficialCompany(company,fetcher=fetch) {
  const domain=String(company.company_domain||company.official_domain||'').toLowerCase().replace(/^www\./,'');
  const root=officialUrl(company.company_website||company.website||'https://'+domain,domain);if(!root)return {contacts:[],verified:false,reason:'official_https_website_required'};
  const html=await readOfficial(root,domain,fetcher);if(!html)return {contacts:[],verified:false,reason:'official_website_unavailable'};
  const links=[];
  for(const m of html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try { const url=officialUrl(new URL(m[1],root).href,domain),label=m[1]+' '+m[2];if(url&&/procurement|purchas|einkauf|beschaffung|sourcing|contact|kontakt|team|management|impressum|about/i.test(label)&&!links.includes(url)&&url!==root)links.push(url); }catch{}
  }
  links.sort((a,b)=>Number(PROCUREMENT.test(b))-Number(PROCUREMENT.test(a)));
  const pages=await Promise.all(links.slice(0,3).map(async url=>({url,html:await readOfficial(url,domain,fetcher).catch(()=> '')})));
  const contacts=[...publishedContacts(html,root,domain),...pages.flatMap(p=>publishedContacts(p.html,p.url,domain))].sort((a,b)=>b.score-a.score).filter((c,i,a)=>a.findIndex(x=>x.email===c.email)===i).slice(0,8);
  const activityText=(html+pages.map(x=>x.html).join(' ')).replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
  const normalizeName=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const names=normalizeName(company.company_name).split(/[^a-z0-9]+/).filter(x=>x.length>=4&&!/^(gmbh|limited|ltd|group|holding|steel|industry|industries)$/.test(x));
  if(names.length&&!names.some(x=>normalizeName(activityText).includes(x)))return {contacts:[],verified:false,relevant:false,reason:'official_company_identity_review'};
  const relevant=/steel fabrication|steel construction|stahlbau|metallbau|shipbuild|shipyard|schiffbau|werft|heavy machinery|maschinenbau|structural steel|steel plate|offshore|metal fabrication/i.test(activityText);
  return {contacts,verified:true,relevant,source_url:root,claim:relevant?'Official company website describes steel-consuming fabrication, manufacturing or marine activity.':'Official company website accessible; steel procurement relevance needs review.'};
}
