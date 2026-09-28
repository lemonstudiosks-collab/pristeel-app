import crypto from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const MODE=String(process.env.DISCOVERY_MODE||process.env.SYNC_MODE||'preview').toLowerCase();
const LIMIT=Math.min(12,Math.max(1,Number(process.env.REPRESENTATION_DISCOVERY_LIMIT||10)));
const NEWS_RSS='https://news.google.com/rss/search';
const QUERY='(Kosovo OR "Western Balkans") ("US company" OR American) (expands OR investment OR distributor OR "local partner") when:7d';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const decode=v=>clean(String(v??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>'));

export function extractCompanyName(title){
  var t=clean(title).replace(/\s+[|]\s+.*$/,'');
  var m=t.match(/^(.{2,90}?)\s+(?:announces?|expands?|enters?|launches?|invests?|seeks?|partners?|targets?|plans?)\b/i);
  if(!m)m=t.match(/^([^:–—-]{2,70})\s*[:–—-]\s*/);
  var name=clean(m&&m[1]);
  if(!name||/^(kosovo|western balkans|business|company|market|report|news)$/i.test(name))return null;
  return name.replace(/^(?:US|U\.S\.)\s+/i,'').slice(0,120)||null;
}

export function parseNewsRss(xml){
  const rows=[];
  for(const m of String(xml??'').matchAll(/<item>([\s\S]*?)<\/item>/gi)){
    const item=m[1],pick=tag=>decode(item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]);
    rows.push({url:pick('link'),title:pick('title'),published:pick('pubDate'),source:pick('source')});
  }
  return rows;
}

export function normalizeArticles(payload,limit=LIMIT){
  const rows=Array.isArray(payload)?payload:Array.isArray(payload?.articles)?payload.articles:[];
  const seen=new Set(),out=[];
  for(const article of rows){
    const url=clean(article?.url),title=clean(article?.title);
    if(!url||!title||seen.has(url))continue;
    seen.add(url);
    const company=extractCompanyName(title),text=title.toLowerCase();
    let score=55;if(company)score+=10;if(/kosovo/.test(text))score+=12;if(/market entry|seeking distributor|local partner|expands into|investment/.test(text))score+=10;
    out.push({
      source_key:'news-rss:'+crypto.createHash('sha256').update(url).digest('hex').slice(0,32),
      source_name:clean(article?.source)||'Public news RSS',source_url:url,title,company_name:company,company_domain:null,country_code:'US',score:Math.min(100,score),
      reasons:['Sinjal publik për Kosovë/Ballkanin Perëndimor','Kërkim i fokusuar te kompani amerikane','Kërkon verifikim njerëzor të kompanisë dhe domenit'],
      evidence:{query_focus:'US companies',published_at:clean(article?.published)||null,automatic_outreach:false}
    });
    if(out.length>=limit)break;
  }
  return out;
}

export function newsRssUrl(){var u=new URL(NEWS_RSS);u.searchParams.set('q',QUERY);u.searchParams.set('hl','en-US');u.searchParams.set('gl','US');u.searchParams.set('ceid','US:en');return u.toString()}

async function fetchText(url){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),30000);
  try{var r=await fetch(url,{headers:{Accept:'application/rss+xml,application/xml;q=0.9','User-Agent':'PriSteel-PPPP-Representation-Discovery/1.0 (+https://prissteel.com)'},signal:c.signal});if(!r.ok)throw new Error(`Public news RSS HTTP ${r.status}`);return r.text()}finally{clearTimeout(timer)}
}

async function registerBatch(access,signals){
  const r=await fetch(`${access.supabaseUrl}/rest/v1/rpc/pppp_register_representation_market_signals_v1`,{method:'POST',headers:{apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken||access.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({p_payloads:signals})});
  const raw=await r.text();if(!r.ok)throw new Error(`Discovery RPC failed: HTTP ${r.status} ${raw.slice(0,400)}`);return raw?JSON.parse(raw):{};
}

async function main(){
  const signals=normalizeArticles(parseNewsRss(await fetchText(newsRssUrl())));
  var result={mode:MODE,source:'Public news RSS',query_window:'7d',fetched_candidates:signals.length,writes:0,active_records_created:0,projects_created:0,outbound_created:0};
  if(MODE==='apply'&&signals.length){const access=await resolveSupabaseWorkflowAccess();await registerBatch(access,signals);result.writes=signals.length;result.auth_mode=access.authMode}
  await mkdir('tmp',{recursive:true});await writeFile('tmp/representation-market-entry-discovery.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e?.stack||e);process.exitCode=1});
