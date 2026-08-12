const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div class="content"><div id="page-home" class="page" style="display:block"></div></div>
<div id="pst-ws-sidebar"><div class="pst-ws-nav"><button class="pst-ws-navbtn" data-key="home"><span>Home</span></button><button class="pst-ws-navbtn" data-key="apps"><span>Apps</span></button></div></div>
<div id="page-workspace-apps" class="page"><div class="pst-ws-appgrid"></div></div>
</body></html>`,{url:'https://example.test/',runScripts:'outside-only'});
const {window}=dom;
let writes=0;
window.supaFetch=function(path,method){if(method&&method!=='GET')writes++;return Promise.resolve([]);};
window.scrollTo=function(){};
window.confirm=function(){return false;};
window.alert=function(){};
window.MODULES=[{id:'procurement',pages:['import','rfq','suppliers']}];
window.pageMeta={};window.PAGE_NAV={};window.PAGE_ICON={};

const code=fs.readFileSync('pristeel-kek-tender-watch-v1.js','utf8');
vm.runInContext(code,dom.getInternalVMContext());
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

setTimeout(async()=>{
  try{
    assert.strictEqual(writes,0,'module init must not write to Supabase');
    assert.ok(window.document.querySelector('[data-key="kek-tenders"]'),'workspace navigation button should be added');
    assert.ok(window.document.querySelector('[data-pst-kek-app]'),'Apps tile should be added');
    assert.strictEqual(typeof window.pstWsKekTenders,'function');
    window.pstWsKekTenders();
    await new Promise(r=>setTimeout(r,0));
    assert.ok(window.document.getElementById('page-kek-tenders'));
    assert.strictEqual(writes,0,'opening review page must remain read-only');
    assert.ok(window.MODULES[0].pages.includes('kek-tenders'),'legacy procurement module should register the page');
    console.log('KEK tender watch smoke: OK');
  }catch(err){console.error(err);process.exitCode=1;}
},10);
