/* PRISTEEL offer position preservation v1
 * Offer positions are append-first: manual/BOM/imported rows are never cleared by "Merr nga çmimet".
 * Pricing-derived rows may be refreshed in place, but only an explicit user delete removes them from the draft.
 * Supplier/source records are never modified here.
 */
(function(){
'use strict';
if(window.__pstOfferPositionPreservationV1)return;
window.__pstOfferPositionPreservationV1=true;

var removedKeys={};
function E(id){return document.getElementById(id);}
function n(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function near(a,b){return Math.abs(n(a)-n(b))<0.00001;}
function rows(){if(!Array.isArray(window.oferPos))window.oferPos=[];return window.oferPos;}
function kg(){return n((E('of-kg')||{}).value);}
function priceFor(key){
  if(key==='base')return n((E('of-pr')||{}).value);
  if(key==='zinc')return n((E('of-zn')||{}).value);
  if(key==='coat')return n((E('pst-of-coat')||E('pst-sale-coat')||{}).value);
  if(key==='transport')return n((E('of-tr')||{}).value);
  if(key==='install')return n((E('pst-of-install')||E('pst-sale-install')||{}).value);
  return 0;
}
function inferKey(p){
  if(!p)return'';
  if(p._pstKey)return String(p._pstKey);
  var d=String(p.desc||'').toLowerCase();
  if(/powder|pulver|coating|ngjyros/.test(d))return'coat';
  if(/cink|zink|galvan/.test(d))return'zinc';
  if(/transport|fracht|prevoz/.test(d))return'transport';
  if(/monta|install|montim/.test(d))return'install';
  var pr=priceFor('base');
  if(pr>0&&String(p.unit||'kg')==='kg'&&near(p.price,pr))return'base';
  return'';
}
function autoLike(p,key){
  if(!key)return false;
  if(p&&p.spec)return false;
  var q=priceFor(key);if(!(q>0)||!near(p&&p.price,q))return false;
  if(key==='transport')return String(p&&p.unit||'')==='ls'||n(p&&p.qty)===1;
  if(key==='install'&&String(p&&p.unit||'')==='ls')return true;
  var totalKg=kg();return String(p&&p.unit||'kg')==='kg'&&(!(totalKg>0)||near(p&&p.qty,totalKg));
}
function normalizeExisting(list){
  (list||[]).forEach(function(p){
    if(!p||p._pstSource)return;
    if(p.spec){p._pstSource='bom';return;}
    var key=inferKey(p);
    if(key&&autoLike(p,key)){p._pstSource='pricing-auto';p._pstKey=key;}
    else p._pstSource='manual-existing';
  });
}
function tagGenerated(list){
  var seen={};
  (list||[]).forEach(function(p,i){
    if(!p)return;
    var key=inferKey(p);
    if(!key){
      var candidates=['base','zinc','coat','transport','install'];
      for(var c=0;c<candidates.length;c++){
        var k=candidates[c];if(seen[k])continue;if(autoLike(p,k)){key=k;break;}
      }
    }
    p._pstSource='pricing-auto';
    if(key){p._pstKey=key;seen[key]=true;}
    else p._pstKey='pricing-'+i;
  });
}
function setRows(list){var a=rows();a.length=0;(list||[]).forEach(function(p){a.push(p);});if(typeof window.renderOferPos==='function')window.renderOferPos();}
function safeBuild(baseFn,args,ctx){
  var before=rows().slice();normalizeExisting(before);
  var preserved=before.filter(function(p){return p&&p._pstSource!=='pricing-auto'||p&&p._pstManualOverride;});
  var preservedOverride={};preserved.forEach(function(p){var k=inferKey(p);if(k&&p._pstManualOverride)preservedOverride[k]=true;});
  var oldCopy=before.slice();
  var result=baseFn.apply(ctx,args||[]);
  var generated=rows().slice();tagGenerated(generated);
  generated=generated.filter(function(p){var k=inferKey(p);return !(k&&removedKeys[k])&&!(k&&preservedOverride[k]);});
  var byKey={};generated.forEach(function(p){var k=inferKey(p);if(k&&!byKey[k])byKey[k]=p;});
  var used={};var merged=[];
  oldCopy.forEach(function(p){
    var k=inferKey(p);
    if(p&&p._pstSource==='pricing-auto'&&!p._pstManualOverride){
      if(k&&removedKeys[k])return;
      if(k&&byKey[k]&&!used[k]){merged.push(byKey[k]);used[k]=true;}
      return;
    }
    merged.push(p);
    if(k&&p&&p._pstManualOverride)used[k]=true;
  });
  generated.forEach(function(p){var k=inferKey(p);if(k&&used[k])return;merged.push(p);if(k)used[k]=true;});
  setRows(merged);
  return result;
}
function wrapQuick(){
  var fn=window.buildOferPosFromQuick;if(typeof fn!=='function'||fn.__pstPreservePositions)return;
  var w=function(){return safeBuild(fn,arguments,this);};w.__pstPreservePositions=true;w.__base=fn;window.buildOferPosFromQuick=w;
}
function wrapAdd(){
  var fn=window.addOferPos;if(typeof fn!=='function'||fn.__pstPreservePositions)return;
  var w=function(d){var a=rows(),len=a.length,r=fn.apply(this,arguments);for(var i=len;i<a.length;i++){if(a[i]&&!a[i]._pstSource)a[i]._pstSource='manual';}return r;};w.__pstPreservePositions=true;w.__base=fn;window.addOferPos=w;
}
function wrapUpdate(){
  var fn=window.updOferPos;if(typeof fn!=='function'||fn.__pstPreservePositions)return;
  var w=function(i){var p=rows()[+i];if(p){if(!p._pstKey)p._pstKey=inferKey(p);p._pstManualOverride=true;p._pstSource='manual-edit';}return fn.apply(this,arguments);};w.__pstPreservePositions=true;w.__base=fn;window.updOferPos=w;
}
function wrapRemove(){
  var fn=window.remOferPos;if(typeof fn!=='function'||fn.__pstPreservePositions)return;
  var w=function(i){var p=rows()[+i],k=inferKey(p);if(k&&(p&&p._pstSource==='pricing-auto'||p&&p._pstManualOverride))removedKeys[k]=true;return fn.apply(this,arguments);};w.__pstPreservePositions=true;w.__base=fn;window.remOferPos=w;
}
function needsPricingRows(){
  var wanted=['base','zinc','coat','transport','install'].filter(function(k){return priceFor(k)>0&&!removedKeys[k];});
  if(!wanted.length)return false;var have={};rows().forEach(function(p){var k=inferKey(p);if(k)have[k]=true;});return wanted.some(function(k){return !have[k];});
}
function ensurePricingRows(){if(needsPricingRows()&&typeof window.buildOferPosFromQuick==='function')window.buildOferPosFromQuick();}
function wrapBefore(name){
  var fn=window[name];if(typeof fn!=='function'||fn.__pstPreservePositions)return;
  var w=function(){ensurePricingRows();return fn.apply(this,arguments);};w.__pstPreservePositions=true;w.__base=fn;window[name]=w;
}
function wrapState(){
  var c=window.collectOfferFormState;if(typeof c==='function'&&!c.__pstPreservePositions){var cw=function(){var st=c.apply(this,arguments)||{};st.positionPreservation={removedKeys:Object.keys(removedKeys)};return st;};cw.__pstPreservePositions=true;cw.__base=c;window.collectOfferFormState=cw;}
  var a=window.applyOfferFormState;if(typeof a==='function'&&!a.__pstPreservePositions){var aw=function(st){removedKeys={};var rr=st&&st.positionPreservation&&st.positionPreservation.removedKeys||[];rr.forEach(function(k){removedKeys[String(k)]=true;});var r=a.apply(this,arguments);setTimeout(function(){normalizeExisting(rows());},0);return r;};aw.__pstPreservePositions=true;aw.__base=a;window.applyOfferFormState=aw;}
}
function wrapNew(){var fn=window.ofertaStartNewDraft;if(typeof fn!=='function'||fn.__pstPreservePositions)return;var w=function(){removedKeys={};return fn.apply(this,arguments);};w.__pstPreservePositions=true;w.__base=fn;window.ofertaStartNewDraft=w;}
function install(){wrapQuick();wrapAdd();wrapUpdate();wrapRemove();wrapState();wrapNew();wrapBefore('saveOfferState');wrapBefore('genOfer');wrapBefore('printOfer');normalizeExisting(rows());}
document.addEventListener('pst:modules-ready',install);
install();
window.PSTOfferPositionPreservationV1={install:install,ensurePricingRows:ensurePricingRows,inferKey:inferKey,removed:function(){return Object.keys(removedKeys);}};
})();