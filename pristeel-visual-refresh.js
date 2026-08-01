/* PRISTEEL Visual Refresh: më pak kuti, më shumë ritëm, thellësi dhe jetë */
(function(){
'use strict';
if(window.__pstVisualRefreshLoaded)return;
window.__pstVisualRefreshLoaded=true;
document.body.classList.add('pst-alive');
var s=document.createElement('style');
s.id='pst-visual-refresh-style';
s.textContent=`
body.pst-alive{
  --pst-canvas:#F5F3F0;--pst-cream:#FBF8F4;--pst-ink:#22211F;--pst-bronze:#A65F2E;--pst-bronze2:#D39A70;
  background:
    radial-gradient(circle at 8% 4%,rgba(211,154,112,.15),transparent 24rem),
    radial-gradient(circle at 92% 8%,rgba(61,111,142,.10),transparent 28rem),
    linear-gradient(180deg,#F8F7F5 0%,#F3F4F5 100%)!important;
}
body.pst-alive .app-shell,body.pst-alive .main{background:transparent!important}
body.pst-alive .sidebar{background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(250,248,245,.96))!important;border-right:1px solid rgba(166,95,46,.12)!important;box-shadow:14px 0 38px rgba(39,33,29,.035)!important}
body.pst-alive .topbar{background:rgba(251,250,248,.88)!important;border-bottom:1px solid rgba(75,70,66,.09)!important;box-shadow:0 10px 30px rgba(31,35,38,.025)!important}
body.pst-alive .content{position:relative}
body.pst-alive .content:before{content:"";position:fixed;right:5vw;bottom:4vh;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(166,95,46,.055),transparent 70%);pointer-events:none;z-index:0}
body.pst-alive .content>*{position:relative;z-index:1}
body.pst-alive .pst-v2-brandmark{border-radius:14px 14px 14px 5px!important;background:linear-gradient(145deg,#B96A32,#8F4C22)!important;box-shadow:0 10px 20px rgba(166,95,46,.22)!important}
body.pst-alive .pst-v2-new{border-radius:14px 14px 14px 6px!important;background:linear-gradient(135deg,#B66A35,#925020)!important;box-shadow:0 10px 22px rgba(166,95,46,.18)!important;transition:transform .18s,box-shadow .18s!important}
body.pst-alive .pst-v2-new:hover{transform:translateY(-1px)!important;box-shadow:0 14px 28px rgba(166,95,46,.24)!important}
body.pst-alive .pst-v2-navitem{border-radius:13px!important;padding:10px 11px!important}
body.pst-alive .pst-v2-navitem.active{background:linear-gradient(135deg,rgba(247,237,229,.98),rgba(250,244,239,.9))!important;box-shadow:inset 3px 0 0 #A65F2E,0 6px 18px rgba(166,95,46,.06)!important}
body.pst-alive .pst-v2-search{border-radius:14px!important;background:rgba(255,255,255,.72)!important}
body.pst-alive .pst-dash-title{font-size:27px!important;letter-spacing:-.7px!important;color:var(--pst-ink)!important}
body.pst-alive .pst-dash-head{padding:4px 4px 2px}
body.pst-alive .card,body.pst-alive .pst-panel,body.pst-alive .pai-box,body.pst-alive .pga-strip{
  border-color:rgba(74,72,69,.10)!important;
  border-radius:19px 19px 19px 8px!important;
  background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(252,251,249,.96))!important;
  box-shadow:0 12px 34px rgba(30,34,37,.045),0 1px 0 rgba(255,255,255,.9) inset!important;
}
body.pst-alive .card:hover,body.pst-alive .pst-panel:hover{box-shadow:0 18px 42px rgba(30,34,37,.075)!important;transform:translateY(-1px)}
body.pst-alive .pst-kpis{gap:14px!important}
body.pst-alive .pst-kpi{position:relative;overflow:hidden;border:0!important;border-radius:20px 20px 20px 8px!important;background:linear-gradient(145deg,#fff,#FAFAF8)!important;box-shadow:0 14px 36px rgba(31,36,39,.06)!important;min-height:88px!important}
body.pst-alive .pst-kpi:after{content:"";position:absolute;right:-25px;bottom:-35px;width:90px;height:90px;border-radius:50%;background:var(--kpi-bg);opacity:.7}
body.pst-alive .pst-kpi:hover{transform:translateY(-3px)!important;box-shadow:0 20px 44px rgba(31,36,39,.10)!important}
body.pst-alive .pst-kpi-icon{border-radius:15px 15px 15px 6px!important;position:relative;z-index:1}
body.pst-alive .pst-panel-hd,body.pst-alive .pai-hd{background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(250,248,245,.7))!important;border-bottom-color:rgba(74,72,69,.08)!important}
body.pst-alive .pst-dash-btn,body.pst-alive .pai-btn,body.pst-alive .pga-btn,body.pst-alive button:not(.pst-v2-navitem):not(.pst-v2-new):not(.pai-src){border-radius:12px!important;transition:transform .15s,box-shadow .15s,border-color .15s!important}
body.pst-alive .pst-dash-btn:hover,body.pst-alive .pai-btn:hover,body.pst-alive .pga-btn:hover{transform:translateY(-1px)}
body.pst-alive .pst-dash-btn.primary,body.pst-alive .pai-btn.primary,body.pst-alive .pga-btn.primary,body.pst-alive .btn-primary{background:linear-gradient(135deg,#B66A35,#925020)!important;border-color:transparent!important;box-shadow:0 8px 20px rgba(166,95,46,.16)!important}
body.pst-alive .pst-project{position:relative;margin:5px 2px;padding:12px 12px 12px 15px!important;border-radius:16px 16px 16px 7px!important;background:rgba(255,255,255,.68);border:1px solid rgba(80,82,83,.065);transition:transform .16s,box-shadow .16s,background .16s!important}
body.pst-alive .pst-project:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 5px 5px 0;background:linear-gradient(180deg,#D39A70,#A65F2E);opacity:.7}
body.pst-alive .pst-project:hover{background:#fff!important;transform:translateX(3px)!important;box-shadow:0 10px 26px rgba(30,34,37,.065)!important}
body.pst-alive .pst-action{border-radius:14px!important;margin:2px 0}
body.pst-alive .pst-action:hover{background:linear-gradient(90deg,#FBF7F3,#F7F9FA)!important}
body.pst-alive .pst-action-tag,body.pst-alive .badge,body.pst-alive .status-badge,body.pst-alive .rl-badge{border-radius:999px!important}
body.pst-alive input,body.pst-alive select,body.pst-alive textarea{border-radius:12px!important;border-color:rgba(76,79,81,.16)!important;background:rgba(255,255,255,.86)!important;transition:border-color .15s,box-shadow .15s!important}
body.pst-alive input:focus,body.pst-alive select:focus,body.pst-alive textarea:focus{outline:none!important;border-color:rgba(166,95,46,.55)!important;box-shadow:0 0 0 4px rgba(166,95,46,.08)!important}
body.pst-alive table{border-collapse:separate!important;border-spacing:0 5px!important}
body.pst-alive table tbody tr{background:rgba(255,255,255,.72);box-shadow:0 4px 14px rgba(30,34,37,.025)}
body.pst-alive table tbody tr:hover{background:#fff;box-shadow:0 8px 22px rgba(30,34,37,.06)}
body.pst-alive table tbody td:first-child{border-radius:12px 0 0 12px}
body.pst-alive table tbody td:last-child{border-radius:0 12px 12px 0}
body.pst-alive .modal-bg,body.pst-alive [class*="modal-bg"]{backdrop-filter:blur(7px)!important;background:rgba(31,30,29,.42)!important}
body.pst-alive .modal,body.pst-alive .modal-card,body.pst-alive .modal-content,body.pst-alive [role="dialog"]{border-radius:24px!important;box-shadow:0 30px 90px rgba(18,23,27,.25)!important}
body.pst-alive #ov-body .pst-pi-shell>.pai-box{border-radius:22px 22px 22px 9px!important;background:linear-gradient(145deg,#fff,#FCF8F5)!important}
body.pst-alive .pai-card,body.pst-alive .pai-sec{border-radius:16px 16px 16px 7px!important;border-color:rgba(73,75,76,.10)!important}
body.pst-alive .pai-decision{background:linear-gradient(145deg,var(--dc-bg),rgba(255,255,255,.78))!important}
body.pst-alive .pai-empty,body.pst-alive .pst-empty{border-radius:16px!important;background:linear-gradient(145deg,#FAFBFB,#F8F6F3)!important}
body.pst-alive .page.active,body.pst-alive .pst-dash,body.pst-alive .pai-box{animation:pstAliveIn .28s ease both}
@keyframes pstAliveIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){body.pst-alive *,body.pst-alive *:before,body.pst-alive *:after{animation:none!important;transition:none!important}}
`;
document.head.appendChild(s);
})();
