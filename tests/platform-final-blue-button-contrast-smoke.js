'use strict';
const fs=require('fs');
const path=require('path');
const {JSDOM}=require('jsdom');
function assert(ok,msg){if(!ok)throw new Error(msg);}
(async function(){
  const dom=new JSDOM('<!doctype html><html><head></head><body><div id="page-workspace-project" class="active"><button id="vazhdo" style="background:#4F97AF;color:#355768"><span>Vazhdo</span><small>Hap ofertat</small></button><button id="summary" style="background:#4F97AF;color:#355768">Përmbledhje</button></div></body></html>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.test/'});
  const {window}=dom,doc=window.document;
  window.console=console;
  const src=fs.readFileSync(path.join(__dirname,'..','pristeel-platform-readability-v1.js'),'utf8');
  window.eval(src);
  await new Promise(r=>setTimeout(r,40));
  window.PSTPlatformReadabilityV1.finalApply(doc);
  for(const id of ['vazhdo','summary']){
    const b=doc.getElementById(id);
    assert(b.getAttribute('data-pst-dark-button')==='1',id+' must be classified as a white-text filled blue control');
    assert(window.getComputedStyle(b).color==='rgb(255, 255, 255)',id+' text must be white');
  }
  assert(window.getComputedStyle(doc.querySelector('#vazhdo span')).color==='rgb(255, 255, 255)','nested Vazhdo label must be white');
  assert(window.getComputedStyle(doc.querySelector('#vazhdo small')).color==='rgb(255, 255, 255)','nested Vazhdo hint must be white');
  window.close();
  console.log('platform final blue-button contrast smoke: ok');
})().catch(e=>{console.error(e);process.exit(1);});
