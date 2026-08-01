/* PRISTEEL Visual Refresh: paletë e freskët blu, më pak kuti, më shumë ritëm dhe jetë */
(function(){
'use strict';
if(window.__pstVisualRefreshLoaded)return;
window.__pstVisualRefreshLoaded=true;
document.body.classList.add('pst-alive');
var s=document.createElement('style');
s.id='pst-visual-refresh-style';
s.textContent=`
body.pst-alive{
  --pst-canvas:#F2F7F9;
  --pst-cream:#F8FBFC;
  --pst-ink:#20272B;
  --pst-blue:#5B9BB3;
  --pst-blue-deep:#3E7E96;
  --pst-blue2:#A9CEDC;
  --pst-blue-pale:#EAF5F8;
  --pst-blue-wash:#F4FAFC;
  --pst-bronze:var(--pst-blue);
  --pst-bronze2:var(--pst-blue2);
  --bronze:#4F91AA;
  --bronze2:#91C3D5;
  --bronze-bg:#EAF5F8;
  --bronze-light:#CFE7EF;
  --bronze-dark:#326F87;
  --accent:#4F91AA;
  --accent-bg:#EAF5F8;
  background:
    radial-gradient(circle at 8% 4%,rgba(169,206,220,.24),transparent 24rem),
    radial-gradient(circle at 92% 8%,rgba(91,155,179,.13),transparent 28rem),
    linear-gradient(180deg,#F8FBFC 0%,#F1F6F8 100%)!important;
}
body.pst-alive .app-shell,body.pst-alive .main{background:transparent!important}
body.pst-alive .sidebar{background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(246,251,252,.97))!important;border-right:1px solid rgba(79,145,170,.14)!important;box-shadow:14px 0 38px rgba(42,72,84,.045)!important}
body.pst-alive .topbar{background:rgba(249,252,253,.9)!important;border-bottom:1px solid rgba(67,105,119,.10)!important;box-shadow:0 10px 30px rgba(42,72,84,.03)!important}
body.pst-alive .content{position:relative}
body.pst-alive .content:before{content:"";position:fixed;right:5vw;bottom:4vh;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(91,155,179,.09),transparent 70%);pointer-events:none;z-index:0}
body.pst-alive .content>*{position:relative;z-index:1}
body.pst-alive .pst-v2-brandmark{border-radius:14px 14px 14px 5px!important;background:linear-gradient(145deg,#72AEC4,#3E7E96)!important;box-shadow:0 10px 20px rgba(62,126,150,.22)!important}
body.pst-alive .pst-v2-new{border-radius:14px 14px 14px 6px!important;background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;box-shadow:0 10px 22px rgba(62,126,150,.18)!important;transition:transform .18s,box-shadow .18s!important}
body.pst-alive .pst-v2-new:hover{transform:translateY(-1px)!important;box-shadow:0 14px 28px rgba(62,126,150,.25)!important}
body.pst-alive .pst-v2-navitem{border-radius:13px!important;padding:10px 11px!important}
body.pst-alive .pst-v2-navitem.active{background:linear-gradient(135deg,rgba(230,244,249,.98),rgba(241,249,251,.94))!important;box-shadow:inset 3px 0 0 #5B9BB3,0 6px 18px rgba(62,126,150,.07)!important}
body.pst-alive .pst-v2-search{border-radius:14px!important;background:rgba(255,255,255,.78)!important}
body.pst-alive .pst-dash-title{font-size:27px!important;letter-spacing:-.7px!important;color:var(--pst-ink)!important}
body.pst-alive .pst-dash-head{padding:4px 4px 2px}
body.pst-alive .card,body.pst-alive .pst-panel,body.pst-alive .pai-box,body.pst-alive .pga-strip{
  border-color:rgba(72,113,129,.11)!important;
  border-radius:19px 19px 19px 8px!important;
  background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(248,252,253,.97))!important;
  box-shadow:0 12px 34px rgba(42,72,84,.05),0 1px 0 rgba(255,255,255,.92) inset!important;
}
body.pst-alive .card:hover,body.pst-alive .pst-panel:hover{box-shadow:0 18px 42px rgba(42,72,84,.085)!important;transform:translateY(-1px)}
body.pst-alive .pst-kpis{gap:14px!important}
body.pst-alive .pst-kpi{position:relative;overflow:hidden;border:0!important;border-radius:20px 20px 20px 8px!important;background:linear-gradient(145deg,#fff,#F8FCFD)!important;box-shadow:0 14px 36px rgba(42,72,84,.065)!important;min-height:88px!important}
body.pst-alive .pst-kpi:after{content:"";position:absolute;right:-25px;bottom:-35px;width:90px;height:90px;border-radius:50%;background:var(--kpi-bg);opacity:.62}
body.pst-alive .pst-kpi:hover{transform:translateY(-3px)!important;box-shadow:0 20px 44px rgba(42,72,84,.11)!important}
body.pst-alive .pst-kpi-icon{border-radius:15px 15px 15px 6px!important;position:relative;z-index:1}
body.pst-alive .pst-panel-hd,body.pst-alive .pai-hd{background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(243,249,251,.76))!important;border-bottom-color:rgba(72,113,129,.09)!important}
body.pst-alive .pst-dash-btn,body.pst-alive .pai-btn,body.pst-alive .pga-btn,body.pst-alive button:not(.pst-v2-navitem):not(.pst-v2-new):not(.pai-src){border-radius:12px!important;transition:transform .15s,box-shadow .15s,border-color .15s!important}
body.pst-alive .pst-dash-btn:hover,body.pst-alive .pai-btn:hover,body.pst-alive .pga-btn:hover{transform:translateY(-1px)}
body.pst-alive .pst-dash-btn.primary,body.pst-alive .pai-btn.primary,body.pst-alive .pga-btn.primary,body.pst-alive .btn-primary,body.pst-alive .pha-btn.primary,body.pst-alive .pdi-btn.primary,body.pst-alive .pdw-btn.primary{
  background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;
  border-color:transparent!important;
  color:#fff!important;
  box-shadow:0 8px 20px rgba(62,126,150,.18)!important;
}
body.pst-alive .pst-project{position:relative;margin:5px 2px;padding:12px 12px 12px 15px!important;border-radius:16px 16px 16px 7px!important;background:rgba(255,255,255,.72);border:1px solid rgba(72,113,129,.075);transition:transform .16s,box-shadow .16s,background .16s!important}
body.pst-alive .pst-project:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 5px 5px 0;background:linear-gradient(180deg,#A9CEDC,#5B9BB3);opacity:.82}
body.pst-alive .pst-project:hover{background:#fff!important;transform:translateX(3px)!important;box-shadow:0 10px 26px rgba(42,72,84,.075)!important}
body.pst-alive .pst-action{border-radius:14px!important;margin:2px 0}
body.pst-alive .pst-action:hover{background:linear-gradient(90deg,#F2F9FB,#F8FBFC)!important}
body.pst-alive .pst-action-tag,body.pst-alive .badge,body.pst-alive .status-badge,body.pst-alive .rl-badge{border-radius:999px!important}
body.pst-alive input,body.pst-alive select,body.pst-alive textarea{border-radius:12px!important;border-color:rgba(72,113,129,.17)!important;background:rgba(255,255,255,.88)!important;transition:border-color .15s,box-shadow .15s!important}
body.pst-alive input:focus,body.pst-alive select:focus,body.pst-alive textarea:focus{outline:none!important;border-color:rgba(79,145,170,.58)!important;box-shadow:0 0 0 4px rgba(79,145,170,.10)!important}
body.pst-alive table{border-collapse:separate!important;border-spacing:0 5px!important}
body.pst-alive table tbody tr{background:rgba(255,255,255,.76);box-shadow:0 4px 14px rgba(42,72,84,.03)}
body.pst-alive table tbody tr:hover{background:#fff;box-shadow:0 8px 22px rgba(42,72,84,.07)}
body.pst-alive table tbody td:first-child{border-radius:12px 0 0 12px}
body.pst-alive table tbody td:last-child{border-radius:0 12px 12px 0}
body.pst-alive .modal-bg,body.pst-alive [class*="modal-bg"]{backdrop-filter:blur(7px)!important;background:rgba(29,45,52,.40)!important}
body.pst-alive .modal,body.pst-alive .modal-card,body.pst-alive .modal-content,body.pst-alive [role="dialog"]{border-radius:24px!important;box-shadow:0 30px 90px rgba(23,47,57,.24)!important}
body.pst-alive #ov-body .pst-pi-shell>.pai-box{border-radius:22px 22px 22px 9px!important;background:linear-gradient(145deg,#fff,#F3FAFC)!important;border-color:rgba(79,145,170,.20)!important}
body.pst-alive #ov-body .pst-pi-shell:before,body.pst-alive .pha-card:before{background:linear-gradient(90deg,#5B9BB3,#A9CEDC)!important}
body.pst-alive .pst-pi-anchor-label,body.pst-alive .pai-kicker,body.pst-alive .pha-title{color:#3E7E96!important}
body.pst-alive .pha-card{border-color:rgba(79,145,170,.18)!important;background:linear-gradient(135deg,rgba(255,255,255,.97),rgba(239,248,251,.94))!important;box-shadow:0 14px 38px rgba(42,72,84,.06)!important}
body.pst-alive .pha-btn:hover,body.pst-alive .pdi-btn:hover,body.pst-alive .pdw-btn:hover{border-color:#5B9BB3!important;color:#3E7E96!important}
body.pst-alive .pha-progress i,body.pst-alive .pdi-progress i,body.pst-alive .pdw-progress i{background:linear-gradient(90deg,#5B9BB3,#A9CEDC)!important}
body.pst-alive .pai-card,body.pst-alive .pai-sec{border-radius:16px 16px 16px 7px!important;border-color:rgba(72,113,129,.11)!important}
body.pst-alive .pai-decision{background:linear-gradient(145deg,var(--dc-bg),rgba(255,255,255,.82))!important}
body.pst-alive .pai-empty,body.pst-alive .pst-empty{border-radius:16px!important;background:linear-gradient(145deg,#F8FCFD,#F1F7F9)!important}
body.pst-alive a,body.pst-alive .link,body.pst-alive [class*="link-"]{text-decoration-color:rgba(79,145,170,.45)}
body.pst-alive .page.active,body.pst-alive .pst-dash,body.pst-alive .pai-box{animation:pstAliveIn .28s ease both}
@keyframes pstAliveIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){body.pst-alive *,body.pst-alive *:before,body.pst-alive *:after{animation:none!important;transition:none!important}}
`;
document.head.appendChild(s);
})();
