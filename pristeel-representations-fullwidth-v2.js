/* PRISTEEL Representations full-width shell fallback.
 * Scoped only to the body class set while the Representations module is open.
 */
(function(){
'use strict';
if(document.getElementById('pst-representations-fullwidth-v2-css'))return;
var s=document.createElement('style');
s.id='pst-representations-fullwidth-v2-css';
s.textContent=[
'body.pst-global-fullwidth-shell .app-shell{display:block!important;width:100%!important;max-width:none!important;margin:0!important}',
'body.pst-global-fullwidth-shell .app-shell>.sidebar,body.pst-global-fullwidth-shell .app-shell>aside.sidebar{display:none!important;visibility:hidden!important;width:0!important;min-width:0!important;max-width:0!important;flex:0 0 0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important}',
'body.pst-global-fullwidth-shell .app-shell>.main,body.pst-global-fullwidth-shell .app-shell>main.main{display:block!important;width:100%!important;max-width:none!important;min-width:0!important;flex:1 1 100%!important;margin:0!important}',
'body.pst-global-fullwidth-shell .content{box-sizing:border-box!important;width:100%!important;max-width:none!important;margin:0!important;padding-left:14px!important;padding-right:14px!important}',
'body.pst-global-fullwidth-shell #page-representations,body.pst-global-fullwidth-shell #page-representations .pst-rep-page{box-sizing:border-box!important;width:100%!important;max-width:none!important;margin-left:0!important;margin-right:0!important}',
'body.pst-global-fullwidth-shell .topbar,body.pst-global-fullwidth-shell #pst-global-page-backbar{display:none!important}'
].join('\n');
document.head.appendChild(s);
})();