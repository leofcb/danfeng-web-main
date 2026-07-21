// AUTO-GENERATED from 项目页模板_CreekWaters_v5.html — v5 视觉忠实移植，作用域前缀 .cwv5 防污染全站。
// 勿手改：源=v5 模板 <style>，经机械加前缀（.cwv5 作用域根，CSS 变量落在 .cwv5 由子孙 var() 继承）。
// 重生成：node /tmp/scopecss.mjs <v5.html> components/projectLandingV5.styles.js
export const V5_CSS = String.raw`
.cwv5{
  --danfeng-red:#C02830; --red-deep:#9E2028;
  --gold:#A88858; --gold-bright:#c2a06a; --gold-deep:#7d6540; --gold-tint:#EFE7D8;
  --oil-black:#0E0E10; --ink:#1a1611; --ink-soft:#4c463c; --muted:#8b8478; --muted-2:#a49c8e;
  --ivory:#FAF7F2; --ivory-2:#F3ECE0; --ivory-3:#EDE4D5; --white:#FFFFFF;
  --line:rgba(168,136,88,.30); --line-strong:rgba(168,136,88,.5); --line-soft:rgba(26,22,17,.10);
  --sans:"Noto Sans SC","Poppins",system-ui,sans-serif;
  --latin:"Poppins",system-ui,sans-serif;
  --display:"Poppins","Noto Sans SC",system-ui,sans-serif;
  --num:"Poppins",system-ui,sans-serif;
  --maxw:1240px; --pad:clamp(1.4rem,4vw,4rem);
}
.cwv5 *{box-sizing:border-box;margin:0;padding:0}
.cwv5{scroll-behavior:smooth}
.cwv5{font-family:var(--sans);background:var(--ivory);color:var(--ink-soft);line-height:1.75;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.cwv5 a{color:inherit;text-decoration:none}
.cwv5 img{max-width:100%;display:block}
.cwv5 em{font-style:normal;color:var(--danfeng-red)}
.cwv5 .wrap{max-width:var(--maxw);margin:0 auto;padding:0 var(--pad)}
.cwv5 .eyebrow{font-family:var(--latin);font-size:11.5px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold-deep);font-weight:600;display:inline-flex;align-items:center;gap:13px}
.cwv5 .eyebrow::before{content:"";width:32px;height:1px;background:var(--gold)}
.cwv5 .btn{font-family:var(--sans);font-weight:600;font-size:14.5px;border:none;cursor:pointer;border-radius:3px;transition:.25s;display:inline-flex;align-items:center;justify-content:center;gap:9px;letter-spacing:.02em}
.cwv5 .btn .arrow{transition:.25s}
.cwv5 .btn:hover .arrow{transform:translateX(4px)}
.cwv5 .btn-red{background:var(--danfeng-red);color:#fff;padding:15px 28px}
.cwv5 .btn-red:hover{background:var(--red-deep);transform:translateY(-2px);box-shadow:0 12px 26px -12px rgba(192,40,48,.5)}
.cwv5 .btn-gold{background:var(--gold);color:#fff;padding:15px 28px}
.cwv5 .btn-gold:hover{background:var(--gold-deep)}
.cwv5 .btn-ghost{background:transparent;color:var(--ink);padding:15px 24px;border:1px solid var(--line)}
.cwv5 .btn-ghost:hover{border-color:var(--gold);color:var(--gold-deep)}
.cwv5 .btn-dark{background:var(--ink);color:var(--ivory);padding:15px 26px}
.cwv5 .btn-dark:hover{background:#000}
.cwv5 .btn.full{width:100%}
.cwv5 .reveal{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.cwv5 .reveal.in{opacity:1;transform:none}
.cwv5 .h2{font-family:var(--display);font-weight:700;font-size:clamp(26px,3.4vw,42px);line-height:1.15;color:var(--ink);letter-spacing:.02em;margin-top:13px}
.cwv5 .sec{padding:clamp(64px,8.5vw,120px) 0;position:relative}
.cwv5 .sec-head{max-width:760px;margin-bottom:50px}
.cwv5 .sec-head p{color:var(--muted);font-size:15.5px;font-weight:300;margin-top:12px}
.cwv5 .imgframe{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--line-soft);background:var(--ivory-3);box-shadow:0 22px 50px -32px rgba(26,22,17,.4)}
.cwv5 .imgframe img{width:100%;height:100%;object-fit:cover}
.cwv5 .imgcap{position:absolute;left:0;right:0;bottom:0;padding:24px 16px 11px;font-size:10.5px;letter-spacing:.04em;color:rgba(255,255,255,.9);background:linear-gradient(0deg,rgba(14,14,16,.72),transparent)}
.cwv5 nav{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(250,247,242,.72);backdrop-filter:blur(16px);border-bottom:1px solid transparent;transition:.3s}
.cwv5 nav.scrolled{background:rgba(250,247,242,.95);border-bottom:1px solid var(--line-soft)}
.cwv5 .nav-inner{display:flex;align-items:center;justify-content:space-between;height:70px;max-width:var(--maxw);margin:0 auto;padding:0 var(--pad)}
.cwv5 .brand{display:flex;align-items:center;gap:11px}
.cwv5 .brand .mk{width:33px;height:33px;flex-shrink:0}
.cwv5 .brand .bt{line-height:1.08}
.cwv5 .brand .bt .en{font-family:var(--latin);font-weight:700;font-size:15px;letter-spacing:.03em;color:var(--ink)}
.cwv5 .brand .bt .cn{font-size:10px;letter-spacing:.3em;color:var(--gold-deep);font-weight:400}
.cwv5 .nav-links{display:flex;gap:24px}
.cwv5 .nav-links a{font-size:13.5px;color:var(--muted);transition:.2s;font-weight:400}
.cwv5 .nav-links a:hover{color:var(--ink)}
.cwv5 .nav-cta{display:flex;gap:10px;align-items:center}
@media(max-width:980px){
.cwv5 .nav-links{display:none}}
.cwv5 .hero{padding:104px 0 44px;background:var(--ivory)}
.cwv5 .hero-inner{display:grid;grid-template-columns:1fr 1.04fr;gap:52px;align-items:center;min-height:calc(78vh - 104px)}
.cwv5 .hero-left{display:flex;flex-direction:column;justify-content:center;padding:24px 0 24px 0}
.cwv5 .hero-tag{display:inline-block;align-self:flex-start;font-size:11.5px;letter-spacing:.36em;color:var(--gold-deep);border:1px solid var(--line);border-radius:30px;padding:8px 18px;margin-bottom:26px}
.cwv5 .hero h1{font-family:var(--display);font-weight:800;font-size:clamp(40px,5.2vw,68px);line-height:1.06;color:var(--ink);letter-spacing:.02em}
.cwv5 .hero h1 em{display:block;font-size:.5em;font-weight:600;color:var(--gold-deep);margin-top:10px}
.cwv5 .hero-en{font-family:var(--latin);font-size:14px;letter-spacing:.12em;color:var(--muted);font-weight:500;margin:16px 0 0;text-transform:uppercase}
.cwv5 .hero-tagline{font-size:16px;line-height:1.8;color:var(--ink-soft);font-weight:300;max-width:520px;margin:18px 0 30px}
.cwv5 .hero-cta-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:0}
.cwv5 .hero-right{position:relative;display:flex;align-items:center}
.cwv5 .hero-right .imgframe{position:relative;inset:auto;width:100%;aspect-ratio:3/2;height:auto;border-radius:16px;box-shadow:0 22px 50px -32px rgba(26,22,17,.4)}
@media(max-width:900px){
.cwv5 .hero{padding:96px 0 32px}
.cwv5 .hero-inner{grid-template-columns:1fr;min-height:0;gap:26px}
.cwv5 .hero-left{padding:0}
.cwv5 .hero-right .imgframe{aspect-ratio:16/10;border-radius:14px}}
/* —— 首屏左栏紧凑四格（CTA 下方 · 2×2 · v5 眉标+数值语言 · 轻量无重底色 · 仅顶线+细分隔）——
   起售价红字 + 护栏小字；四格令左栏底边≈右图(3:2)底边对齐（±16px 目标） */
.cwv5 .hero-stats{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:30px;border-top:1px solid var(--line-strong)}
.cwv5 .hs{padding:15px 20px 15px 0;border-bottom:1px solid var(--line-soft)}
.cwv5 .hs:nth-child(odd){border-right:1px solid var(--line-soft);padding-right:20px}
.cwv5 .hs:nth-child(even){padding-left:20px}
.cwv5 .hs:nth-last-child(-n+2){border-bottom:none}
.cwv5 .hs-k{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-family:var(--latin);margin-bottom:6px}
.cwv5 .hs-v{font-size:16px;color:var(--ink);font-weight:700;line-height:1.35}
.cwv5 .hs.price .hs-v{color:var(--danfeng-red)}
.cwv5 .hs-n{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--gold-deep);font-weight:400;margin-top:5px;letter-spacing:0}
.cwv5 .hs-n .lk{width:10px;height:10px}
@media(max-width:900px){
.cwv5 .hero-stats{margin-top:24px}}
/* —— 全宽信息带（收束版 · 原 keyband+facts 并成一行 · 单行 6 格 / 移动端 2 列网格（付款结构不入带，户型价格章已含））—— */
.cwv5 .facts{background:var(--white);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.cwv5 .facts-in{display:grid;grid-template-columns:repeat(6,1fr);gap:0}
.cwv5 .fact{padding:24px 20px;border-right:1px solid var(--line-soft)}
.cwv5 .fact:last-child{border-right:none}
.cwv5 .fact .fk{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-family:var(--latin);margin-bottom:7px}
.cwv5 .fact .fv{font-size:15.5px;color:var(--ink);font-weight:600;line-height:1.4}
.cwv5 .fact .fv small{display:block;font-size:11px;color:var(--muted);font-weight:400;margin-top:3px}
.cwv5 .fact .lockn{font-size:10.5px;color:var(--gold-deep);margin-top:5px}
@media(max-width:820px){
.cwv5 .facts-in{grid-template-columns:1fr 1fr}
.cwv5 .fact{border-bottom:1px solid var(--line-soft)}
.cwv5 .fact:nth-child(2n){border-right:none}}
.cwv5 .ov-inner{display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:center}
.cwv5 .ov-text p{font-size:16px;color:var(--ink-soft);font-weight:300;margin-bottom:16px;line-height:1.9}
.cwv5 .ov-text p .lead{color:var(--ink);font-weight:400}
.cwv5 .ov-stats{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.cwv5 .ov-stat{background:var(--white);border:1px solid var(--line-soft);border-radius:12px;padding:22px 20px}
.cwv5 .ov-stat .n{font-family:var(--num);font-size:30px;font-weight:700;color:var(--gold-deep);line-height:1;letter-spacing:-.02em}
.cwv5 .ov-stat .n span{font-family:var(--sans);font-size:13px;color:var(--gold-deep);margin-left:5px;font-weight:400;letter-spacing:0}
.cwv5 .ov-stat .l{font-size:12.5px;color:var(--ink-soft);margin-top:9px;line-height:1.5}
@media(max-width:900px){
.cwv5 .ov-inner{grid-template-columns:1fr;gap:36px}}
.cwv5 .alt{background:var(--ivory-2)}
.cwv5 .mp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.cwv5 .mp-card{background:var(--white);border:1px solid var(--line-soft);border-radius:14px;padding:28px 24px;min-height:214px;display:flex;flex-direction:column;transition:.3s}
.cwv5 .mp-card:hover{border-color:var(--line);transform:translateY(-4px);box-shadow:0 20px 40px -28px rgba(26,22,17,.35)}
.cwv5 .mp-card .ic{font-size:23px;margin-bottom:auto}
.cwv5 .mp-card-tag{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-deep);font-family:var(--latin);margin-bottom:11px}
.cwv5 .mp-card-title{font-family:var(--display);font-size:16.5px;color:var(--ink);font-weight:600;line-height:1.35;margin-bottom:9px}
.cwv5 .mp-card-desc{font-size:12.5px;color:var(--muted);line-height:1.7;font-weight:300}
.cwv5 .mp-wide{margin-top:22px}
.cwv5 .mp-wide .imgframe{height:clamp(280px,38vw,440px)}
@media(max-width:900px){
.cwv5 .mp-grid{grid-template-columns:1fr 1fr}}
.cwv5 .unit-hero{display:grid;grid-template-columns:1fr 1fr;gap:52px;align-items:center;margin-bottom:44px}
.cwv5 .unit-text p{color:var(--ink-soft);font-size:15.5px;font-weight:300;margin-bottom:15px;max-width:520px}
.cwv5 .unit-hero .imgframe{height:430px}
.cwv5 .floors{display:grid;grid-template-columns:repeat(5,1fr);gap:13px;margin-bottom:44px}
.cwv5 .floor{background:var(--white);border:1px solid var(--line-soft);border-radius:12px;padding:22px 20px;transition:.3s}
.cwv5 .floor:hover{border-color:var(--line)}
.cwv5 .floor.ph{background:linear-gradient(165deg,#fff,var(--gold-tint));border-color:var(--line)}
.cwv5 .floor-num{font-family:var(--num);font-size:28px;font-weight:700;color:var(--gold-deep);line-height:1;letter-spacing:-.02em}
.cwv5 .floor-num span{font-family:var(--sans);font-size:12px;color:var(--gold-deep);margin-left:5px;font-weight:400;letter-spacing:0}
.cwv5 .floor-name{font-size:13.5px;color:var(--ink);font-weight:600;margin:12px 0 10px}
.cwv5 .floor-list{list-style:none}
.cwv5 .floor-list li{display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:7px 0;border-top:1px dashed var(--line);color:var(--ink-soft)}
.cwv5 .floor-list li span:last-child{color:var(--gold-deep);font-family:var(--latin);font-size:11.5px;text-align:right}
.cwv5 .fin-inner{display:grid;grid-template-columns:1fr 1fr;gap:52px;align-items:center}
.cwv5 .fin-inner .imgframe{height:440px;order:-1}
.cwv5 .fin-list{list-style:none}
.cwv5 .fin-list li{padding:14px 0;border-top:1px solid var(--line-soft);display:flex;gap:14px;align-items:flex-start}
.cwv5 .fin-list li:first-child{border-top:none}
.cwv5 .fin-list li .fi{font-size:17px;flex-shrink:0}
.cwv5 .fin-list li b{display:block;color:var(--ink);font-size:14.5px;font-weight:600;margin-bottom:2px}
.cwv5 .fin-list li span{font-size:13px;color:var(--muted);font-weight:300;line-height:1.6}
@media(max-width:900px){
.cwv5 .unit-hero,.cwv5 .fin-inner{grid-template-columns:1fr}
.cwv5 .floors{grid-template-columns:1fr 1fr}
.cwv5 .unit-hero .imgframe,.cwv5 .fin-inner .imgframe{height:300px}}
.cwv5 .am-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
.cwv5 .am{background:var(--white);border:1px solid var(--line-soft);border-radius:12px;padding:20px 22px;display:flex;align-items:center;gap:15px;transition:.3s}
.cwv5 .am:hover{border-color:var(--line)}
.cwv5 .am .ai{font-size:21px;flex-shrink:0}
.cwv5 .am .at{font-size:13.5px;color:var(--ink);font-weight:500;line-height:1.5}
.cwv5 .am-band{margin-top:22px}
.cwv5 .am-band .imgframe{height:clamp(280px,36vw,420px)}
@media(max-width:820px){
.cwv5 .am-grid{grid-template-columns:1fr 1fr}}
.cwv5 .loc-inner{display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:center}
.cwv5 .loc-inner .imgframe{min-height:400px;background:var(--white);display:flex;align-items:center}
.cwv5 .loc-inner .imgframe img{object-fit:contain;padding:12px}
.cwv5 .dist-list{list-style:none}
.cwv5 .dist-list li{display:flex;align-items:center;gap:16px;padding:13px 0;border-bottom:1px solid var(--line-soft)}
.cwv5 .dist-list li .dm{font-family:var(--num);font-size:19px;color:var(--gold-deep);font-weight:700;min-width:96px;letter-spacing:-.02em}
.cwv5 .dist-list li .dl{font-size:14px;color:var(--ink-soft)}
.cwv5 .conn{margin-top:20px;font-size:12.5px;color:var(--muted);line-height:1.8;font-weight:300}
.cwv5 .conn b{color:var(--gold-deep);font-weight:500}
@media(max-width:900px){
.cwv5 .loc-inner{grid-template-columns:1fr}}
.cwv5 .link-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.cwv5 .linkcard{background:var(--white);border:1px solid var(--line-soft);border-radius:16px;padding:30px;display:flex;flex-direction:column;transition:.3s}
.cwv5 .linkcard:hover{border-color:var(--line);box-shadow:0 24px 50px -30px rgba(26,22,17,.35)}
.cwv5 .linkcard .lc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
.cwv5 .linkcard .lc-eye{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-family:var(--latin)}
.cwv5 .linkcard .lc-name{font-family:var(--display);font-size:24px;color:var(--ink);font-weight:700;margin-top:5px}
.cwv5 .linkcard .lc-cn{font-size:12.5px;color:var(--gold-deep);margin-top:2px}
.cwv5 .maple{font-size:15px;text-align:right;white-space:nowrap}
.cwv5 .maple .tier{display:block;font-size:10px;color:var(--gold-deep);font-family:var(--latin);letter-spacing:.05em;margin-top:6px;border:1px solid var(--line);border-radius:20px;padding:3px 9px}
.cwv5 .hot{font-size:10.5px;color:#fff;background:var(--danfeng-red);border-radius:20px;padding:4px 11px;letter-spacing:.05em;white-space:nowrap}
.cwv5 .lc-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px}
.cwv5 .lc-chip{font-size:11.5px;padding:5px 11px;background:var(--ivory-2);border:1px solid var(--line-soft);border-radius:16px;color:var(--gold-deep)}
.cwv5 .lc-chip b{color:var(--ink)}
.cwv5 .linkcard .lc-blurb{font-size:13.5px;color:var(--ink-soft);line-height:1.75;font-weight:300;flex:1}
.cwv5 .linkcard .lc-link{margin-top:18px;font-size:13.5px;color:var(--danfeng-red);font-weight:600;display:inline-flex;align-items:center;gap:7px;border-top:1px solid var(--line-soft);padding-top:15px}
.cwv5 .linkcard .lc-link:hover{gap:11px}
.cwv5 .ctag{font-size:11px;color:var(--muted-2);font-weight:400;margin-left:5px}
@media(max-width:820px){
.cwv5 .link-grid{grid-template-columns:1fr}}
.cwv5 .cta{background:var(--oil-black);color:var(--ivory);position:relative;overflow:hidden}
.cwv5 .cta::after{content:"";position:absolute;top:-30%;right:-8%;width:420px;height:420px;background:radial-gradient(circle,rgba(168,136,88,.16),transparent 66%)}
.cwv5 .cta-in{position:relative;z-index:2;text-align:center;max-width:760px;margin:0 auto}
.cwv5 .cta .eyebrow{color:var(--gold-bright);justify-content:center}
.cwv5 .cta .eyebrow::before{background:var(--gold)}
.cwv5 .cta h2{font-family:var(--display);font-size:clamp(27px,3.6vw,42px);color:#fff;font-weight:700;line-height:1.24;margin:16px 0 16px}
.cwv5 .cta p{color:rgba(237,231,222,.8);font-size:15.5px;font-weight:300;margin-bottom:34px}
.cwv5 .cta-paths{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:left}
.cwv5 .cpath{background:rgba(255,255,255,.05);border:1px solid rgba(168,136,88,.28);border-radius:14px;padding:24px 22px;display:flex;flex-direction:column;transition:.3s}
.cwv5 .cpath:hover{border-color:var(--gold);background:rgba(255,255,255,.08)}
.cwv5 .cpath.primary{background:linear-gradient(165deg,rgba(192,40,48,.18),rgba(255,255,255,.04));border-color:rgba(192,40,48,.5)}
.cwv5 .cpath .ci{font-size:24px;margin-bottom:14px}
.cwv5 .cpath h4{font-family:var(--display);font-size:16px;color:#fff;font-weight:600;margin-bottom:7px}
.cwv5 .cpath p{font-size:12.5px;color:rgba(237,231,222,.62);font-weight:300;margin-bottom:18px;line-height:1.6;flex:1}
.cwv5 .cpath .cbtn{font-size:13.5px;font-weight:600;color:#1a140b;background:var(--gold);border-radius:3px;padding:12px 16px;text-align:center;transition:.25s}
.cwv5 .cpath.primary .cbtn{background:var(--danfeng-red);color:#fff}
.cwv5 .cpath .cbtn:hover{filter:brightness(1.08)}
.cwv5 .cpath .cqr{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.cwv5 .cpath .cqr .qr{width:52px;height:52px;border-radius:6px;background:repeating-conic-gradient(#0e0e10 0 25%,#fff 0 50%) 0/12px 12px;border:3px solid #fff;flex-shrink:0}
.cwv5 .cpath .cqr small{font-size:11px;color:rgba(237,231,222,.6)}
@media(max-width:820px){
.cwv5 .cta-paths{grid-template-columns:1fr}}
.cwv5 footer{background:var(--ivory);border-top:1px solid var(--line-soft);padding:44px 0 54px}
.cwv5 .foot-in{display:flex;justify-content:space-between;gap:36px;flex-wrap:wrap}
.cwv5 .foot-brand{display:flex;align-items:center;gap:11px}
.cwv5 .foot-brand .fb-t{font-family:var(--display);font-size:16px;color:var(--ink);font-weight:700}
.cwv5 .foot-tag{font-family:var(--latin);font-size:11.5px;color:var(--gold-deep);letter-spacing:.05em;margin-top:6px}
.cwv5 .foot-tag2{font-size:11.5px;color:var(--muted);margin-top:3px}
.cwv5 .foot-disc{max-width:640px;font-size:11px;color:var(--muted);line-height:1.75}
.cwv5 .foot-disc .lic{color:var(--ink-soft);font-family:var(--latin);letter-spacing:.03em}
.cwv5 .notes{background:var(--ivory-2);color:var(--ink);padding:56px 0}
.cwv5 .notes .nlead{color:var(--muted);font-size:13.5px;margin-bottom:22px;max-width:860px}
.cwv5 .maptable{width:100%;border-collapse:collapse;font-size:12.5px;background:var(--white);border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.04)}
.cwv5 .maptable th{background:var(--ivory-3);text-align:left;padding:11px 15px;font-family:var(--latin);font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--gold-deep)}
.cwv5 .maptable td{padding:10px 15px;border-top:1px solid var(--line-soft);color:var(--ink-soft);vertical-align:top}
.cwv5 .maptable td:first-child{font-weight:600;color:var(--ink);white-space:nowrap}
.cwv5 .maptable code{font-family:var(--latin);font-size:11px;background:var(--ivory-3);padding:2px 6px;border-radius:4px;color:var(--gold-deep)}
.cwv5 .guard-note{margin-top:18px;background:var(--white);border-left:3px solid var(--gold);border-radius:8px;padding:15px 20px;font-size:12.5px;color:var(--ink-soft);line-height:1.7}
.cwv5 .guard-note b{color:var(--gold-deep)}
`;

// ——（补充块，非 v5 原样）——
// 1) 中和 globals.css 泛类名（.hero/.foot-brand/.nav-links）向 .cwv5 内泄漏的少量属性，
//    保 v5 视觉忠实；2) emoji→SVG 图标尺寸（解剖冲突#7 禁 emoji，SVG 需显式尺寸）。
export const V5_SUPPLEMENT = String.raw`
.cwv5 .hero{position:relative;overflow:visible}
.cwv5 .hero h1{margin:0}
.cwv5 .foot-brand{max-width:none}
.cwv5 .nav-links{align-items:center}
.cwv5 .mp-card .ic{display:flex;align-items:center}
.cwv5 .mp-card .ic svg{width:26px;height:26px;color:var(--gold-deep)}
.cwv5 .am .ai{width:22px;height:22px;color:var(--gold-deep)}
.cwv5 .fin-list li .fi{display:inline-flex}
.cwv5 .fin-list li .fi svg{width:19px;height:19px;color:var(--gold-deep)}
.cwv5 .cpath .ci{display:inline-flex}
.cwv5 .cpath .ci svg{width:26px;height:26px;color:var(--gold-bright)}
.cwv5 .lk{width:12px;height:12px;flex:0 0 auto}

/* ============================================================
   LEO 十段框架新章补样式（v5 象牙白语言 · 作用域锁 .cwv5，禁再创作）
   段 3 核心亮点 · 段 5 产品细节 · 段 8 社区参考价带（护栏）
   ============================================================ */
/* —— 段 3 · 核心亮点：编号排版卡（金号 + 墨字，与 ov-stat/floor 同族）—— */
.cwv5 .hl-grid{list-style:none;display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.cwv5 .hl-item{background:var(--white);border:1px solid var(--line-soft);border-left:3px solid var(--gold);
  border-radius:14px;padding:24px 26px;display:flex;gap:18px;align-items:flex-start;transition:.3s}
.cwv5 .hl-item:hover{border-color:var(--line);border-left-color:var(--gold);transform:translateY(-3px);box-shadow:0 20px 40px -28px rgba(26,22,17,.35)}
.cwv5 .hl-num{font-family:var(--num);font-size:26px;font-weight:800;color:var(--gold-deep);line-height:1;flex-shrink:0;min-width:38px;letter-spacing:-.02em}
.cwv5 .hl-text{font-size:14.5px;color:var(--ink-soft);line-height:1.75;font-weight:300}
@media(max-width:820px){
.cwv5 .hl-grid{grid-template-columns:1fr}}

/* —— 段 5 · 产品细节：楼书解读块（图文两栏交替 / 纯文本金线卡，与 fin-inner 同族）—— */
.cwv5 .pdx-list{display:flex;flex-direction:column;gap:clamp(28px,4vw,52px)}
.cwv5 .pdx-block{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,4vw,52px);align-items:center}
.cwv5 .pdx-block.pdx-rev .pdx-media{order:2}
.cwv5 .pdx-block.pdx-textonly{grid-template-columns:1fr}
.cwv5 .pdx-block .imgframe{height:clamp(280px,34vw,420px)}
.cwv5 .pdx-idx{font-family:var(--latin);font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:10px}
.cwv5 .pdx-title{font-family:var(--display);font-size:clamp(20px,2.4vw,27px);color:var(--ink);font-weight:700;line-height:1.25;margin-bottom:14px}
.cwv5 .pdx-text{font-size:15px;color:var(--ink-soft);line-height:1.9;font-weight:300}
.cwv5 .pdx-block.pdx-textonly .pdx-body{background:var(--white);border-left:3px solid var(--gold);border-radius:0 12px 12px 0;padding:24px 28px}
@media(max-width:900px){
.cwv5 .pdx-block,.cwv5 .pdx-block.pdx-rev{grid-template-columns:1fr}
.cwv5 .pdx-block.pdx-rev .pdx-media{order:-1}}

/* —— 段 8 · 社区参考价带（护栏）——公开行情参考表 + 锁标 + 来源/免责 —— */
.cwv5 .cm-price{margin:8px 0 26px}
.cwv5 .cm-price-h{font-family:var(--display);font-size:16px;color:var(--ink);font-weight:600;
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.cwv5 .cm-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-family:var(--latin);
  letter-spacing:.04em;color:var(--gold-deep);background:var(--gold-tint);border:1px solid var(--line-soft);border-radius:20px;padding:4px 11px}
.cwv5 .cm-badge .lk{width:11px;height:11px}
.cwv5 .cm-table{width:100%;border-collapse:collapse;font-size:12.5px;background:var(--white);border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.04)}
.cwv5 .cm-table th{background:var(--ivory-3);text-align:left;padding:11px 15px;font-family:var(--latin);
  font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--gold-deep)}
.cwv5 .cm-table td{padding:10px 15px;border-top:1px solid var(--line-soft);color:var(--ink-soft)}
.cwv5 .cm-table td.lat{color:var(--ink);font-family:var(--latin)}
.cwv5 .cm-src{font-size:11px;color:var(--muted);line-height:1.7;margin-top:12px}

/* ============================================================
   LEO 七点优化补样式（2026-07-12 · v5 象牙白语言 · 作用域锁 .cwv5）
   点① 首屏关键信息面板 · 点② 首屏右图横版 · 点④ 地段地图嵌入 ·
   点⑥ 付款计划块 + 指导价格汇总行 · 点⑦ CTA 双路径
   ============================================================ */
/* 点①② 首屏收束（2026-07-12 收束版）：旧左区信息面板 .hero-keyinfo/.hki + 右图悬浮价签 .hero-badge
   + 独立关键信息带 .keyband 均已删除；改为左栏 CTA 下方紧凑四格 .hero-stats（起售价唯一处）+
   Hero 正下方全宽 6 格信息带 .facts。首屏对齐（align-items:center）、右图 3:2 圆角，样式见上方基础 hero 段。 */

/* —— 点④ 地段位置：免密钥 Google Maps 嵌入（16:9 白框 + 说明）+ 可选片区素材带 —— */
.cwv5 .loc-map{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--line-soft);
  background:var(--ivory-3);box-shadow:0 22px 50px -32px rgba(26,22,17,.4)}
.cwv5 .loc-embed{display:block;width:100%;aspect-ratio:4/3;border:0}
.cwv5 .loc-embed-cap{padding:10px 14px;font-size:10.5px;letter-spacing:.03em;color:var(--muted);
  background:var(--white);border-top:1px solid var(--line-soft)}
.cwv5 .loc-band{margin-top:26px}
.cwv5 .loc-band .imgframe{height:clamp(260px,34vw,400px)}
@media(max-width:900px){
.cwv5 .loc-embed{aspect-ratio:1/1}}

/* —— 点⑥ 付款计划块（阶梯卡 · 金号百分比 · 与 floors 同族）+ 指导价格汇总行 —— */
.cwv5 .pay-block{margin-top:8px}
.cwv5 .pay-head{font-family:var(--display);font-size:16px;color:var(--ink);font-weight:600;
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.cwv5 .pay-struct{font-family:var(--num);font-size:12px;letter-spacing:.06em;color:var(--gold-deep);
  background:var(--gold-tint);border:1px solid var(--line-soft);border-radius:20px;padding:4px 12px}
.cwv5 .pay-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
.cwv5 .pay-step{background:var(--white);border:1px solid var(--line-soft);border-top:3px solid var(--gold);
  border-radius:12px;padding:20px 18px;transition:.3s}
.cwv5 .pay-step:hover{border-color:var(--line);border-top-color:var(--gold)}
.cwv5 .pay-pct{font-family:var(--num);font-size:28px;font-weight:800;color:var(--gold-deep);line-height:1;letter-spacing:-.02em}
.cwv5 .pay-stage{font-size:13.5px;color:var(--ink);font-weight:600;margin:11px 0 4px}
.cwv5 .pay-note{font-size:11.5px;color:var(--muted);font-weight:300;line-height:1.6}
.cwv5 .price-sum{margin-top:26px;background:linear-gradient(165deg,#fff,var(--gold-tint));
  border:1px solid var(--line);border-radius:14px;padding:22px 26px;
  display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.cwv5 .price-sum .ps-k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--gold-deep);font-family:var(--latin)}
.cwv5 .price-sum .ps-v{font-family:var(--display);font-size:clamp(22px,3vw,30px);color:var(--danfeng-red);
  font-weight:700;display:inline-flex;align-items:center;gap:8px;line-height:1.15;letter-spacing:-.01em}
.cwv5 .price-sum .ps-v .lk{width:15px;height:15px;color:var(--gold-deep)}
.cwv5 .price-sum .ps-n{font-size:11.5px;color:var(--muted);line-height:1.7;font-weight:300}
@media(max-width:820px){
.cwv5 .pay-steps{grid-template-columns:1fr}}

/* —— 点⑦ CTA 双路径（去 WhatsApp → 两栏；移动端仍单列）—— */
.cwv5 .cta-paths-2{grid-template-columns:repeat(2,1fr);max-width:760px;margin-left:auto;margin-right:auto}
@media(max-width:820px){
.cwv5 .cta-paths-2{grid-template-columns:1fr}}
`;

// ============================================================
// V5_DETAIL_SUPPLEMENT — 开发商页 / 社区页 v5 象牙白对齐增量样式（新增段，不动上方 v5 原样）。
// ------------------------------------------------------------
// 全部作用域锁在 .cwv5 内：把详情页沿用的深色 .pd-*/.dev-*/.cd-*/.rd-cm-*/pcard/comm-card
// 翻成象牙白（详情页 v5 对齐规格 §1–§4）。注意：严禁泄漏到列表页——所有选择器均 .cwv5 前缀。
// 深色专有 token（--panel/--paper/--cream-text/--muted-d/--ink-2/--red）在此逐处改取 .cwv5 象牙白 token。
// ============================================================
export const V5_DETAIL_SUPPLEMENT = String.raw`
/* —— 通用：返回弱链接 · 评级分数墨色（§1.5 / §2.1）—— */
.cwv5 .pd-back{display:inline-block;font-size:13px;color:var(--muted);margin-bottom:20px}
.cwv5 .pd-back:hover{color:var(--gold-deep)}
.cwv5 .mpl-score,.cwv5 .mpl-score-mini{color:var(--ink)}
.cwv5 .mpl-model{color:var(--gold-deep)}

/* —— 开发商 Hero 左栏 logo（§4.1）——克制品牌标识，浅底衬托 —— */
.cwv5 .dev-logo-hero{height:40px;width:auto;object-fit:contain;margin-bottom:16px;
  background:var(--white);border:1px solid var(--line-soft);border-radius:8px;padding:5px 8px}

/* —— 开发商 Hero 右栏：评级大徽标白卡（§2.1）—— */
.cwv5 .dev-hero-right{display:flex;align-items:center;justify-content:center;padding:24px 0 24px 40px}
.cwv5 .dev-hero-badge{position:relative;width:100%;max-width:400px;background:var(--white);border:1px solid var(--line);
  border-radius:18px;box-shadow:0 24px 50px -30px rgba(26,22,17,.4);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:44px 32px;text-align:center}
.cwv5 .dhb-score{font-family:var(--num);font-weight:800;font-size:44px;color:var(--ink);
  display:flex;align-items:baseline;gap:8px;margin-top:8px;justify-content:center;letter-spacing:-.02em}
.cwv5 .dhb-score em{font-style:normal;font-size:14px;color:var(--gold-deep);font-weight:600}
.cwv5 .dhb-conf{font-size:12px;color:var(--muted)}
.cwv5 .dhb-src{font-size:10.5px;color:var(--muted-2);font-family:var(--latin);margin-top:12px}
.cwv5 .dev-nr-badge{display:inline-block;font-weight:700;font-size:16px;color:var(--ink-soft);
  background:var(--ivory-2);border:1px solid var(--line);border-radius:8px;padding:10px 20px;letter-spacing:.04em}
.cwv5 .dev-stale-badge{color:var(--gold-deep);background:var(--gold-tint);border-color:var(--line)}
@media(max-width:900px){
.cwv5 .dev-hero-right{padding:0}
.cwv5 .dhb-score{font-size:28px}}

/* —— ② 关键数据仪表（§2.2）—— */
.cwv5 .dev-dash{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.cwv5 .dev-dash-cell{background:var(--white);border:1px solid var(--line-soft);border-radius:12px;padding:22px 20px}
.cwv5 .ddc-v{font-family:var(--num);font-size:30px;font-weight:700;color:var(--gold-deep);line-height:1.1;letter-spacing:-.02em}
.cwv5 .ddc-l{font-size:12.5px;color:var(--ink-soft);margin-top:9px;font-weight:600}
.cwv5 .ddc-s{font-size:11px;color:var(--muted);margin-top:4px}
.cwv5 .dev-dash-src,.cwv5 .dev-dash-note{font-size:11px;color:var(--muted-2);font-family:var(--latin);margin-top:8px}
.cwv5 .dev-subh{font-family:var(--display);font-size:17px;color:var(--ink);margin:26px 0 12px}
@media(max-width:900px){
.cwv5 .dev-dash{grid-template-columns:1fr 1fr}}

/* —— ① 评级面板（§2.3）——本就象牙白孤岛，仅描边/背景对齐 —— */
.cwv5 .dev-rate-embed{display:flex;flex-direction:column;gap:14px}
.cwv5 .dev-radar-box{background:var(--white);border:1px solid var(--line-soft);border-radius:12px;padding:22px 20px 16px;text-align:center}
.cwv5 .dev-radar-cap{font-size:11.5px;color:var(--muted);margin-top:10px}
.cwv5 .report-doc__devrate{background:var(--white);border:1px solid var(--line-soft);border-radius:14px;padding:22px 22px}
.cwv5 .dev-mtd-link{align-self:flex-start;font-size:13px;color:var(--gold-deep)}
.cwv5 .dev-mtd-link:hover{color:var(--gold)}

/* —— ③ Track Record + 简介（§2.4）—— */
.cwv5 .dev-track{list-style:none;display:flex;flex-direction:column;gap:9px;margin:0 0 16px;padding:0}
.cwv5 .dev-track li{position:relative;padding-left:18px;font-size:14px;color:var(--ink-soft);line-height:1.7}
.cwv5 .dev-track li::before{content:"";position:absolute;left:0;top:10px;width:6px;height:6px;border-radius:50%;background:var(--gold)}
.cwv5 .dev-blurb{background:var(--white);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;
  padding:15px 20px;color:var(--ink-soft);font-size:14px;line-height:1.8}

/* —— ④ 在售项目降级（§2.5）—— */
.cwv5 .dev-noproj{background:var(--white);border:1px solid var(--line-soft);border-radius:12px;
  padding:22px 24px;display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.cwv5 .dev-noproj p{font-size:13.5px;color:var(--ink-soft)}
.cwv5 .dev-onboard{font-family:var(--latin);font-size:12.5px;color:var(--gold-deep);
  background:var(--ivory-2);border:1px solid var(--line-soft);border-radius:6px;padding:8px 12px}
.cwv5 .dev-proj-all{margin-top:22px}

/* —— ⑤ 活跃社区 chips（§2.6）—— */
.cwv5 .dev-comm-chips{display:flex;flex-wrap:wrap;gap:9px}
.cwv5 .dev-comm-chip{font-size:13px;color:var(--ink-soft);border:1px solid var(--line);border-radius:18px;padding:7px 14px;transition:.18s}
.cwv5 .dev-comm-chip:hover{border-color:var(--gold);color:var(--gold-deep)}

/* —— 社区 Hero 右栏：实景图 imgframe / 象牙白兜底 + 参考价 badge（§3.1 / §4.2）—— */
.cwv5 .comm-hero-right{position:relative;display:flex;align-items:stretch;padding:24px 0 24px 40px}
.cwv5 .comm-hero-media{position:relative;width:100%;border-radius:18px;overflow:hidden;
  border:1px solid var(--line-soft);box-shadow:0 22px 50px -32px rgba(26,22,17,.4)}
.cwv5 .comm-hero-media .pdr-gallery{width:100%;gap:8px}
.cwv5 .comm-hero-media .pdr-gmain{border-radius:0;border:none;background:var(--ivory-3);aspect-ratio:4/3}
.cwv5 .comm-hero-media .pdr-gcap{font-size:12px}
.cwv5 .comm-hero-media .pdr-gthumbs{padding:0 8px 8px}
.cwv5 .comm-hero-media .pdr-gthumb{border-color:var(--line-soft)}
.cwv5 .comm-hero-media .pdr-gthumb.on{border-color:var(--gold)}
.cwv5 .cch-bar{position:absolute;top:0;left:0;right:0;height:4px;z-index:2}
.cwv5 .cch-mp{background:linear-gradient(90deg,var(--gold),var(--gold-bright))}
.cwv5 .cch-dld{background:linear-gradient(90deg,var(--red-deep),var(--danfeng-red))}
.cwv5 .comm-hero-art{position:relative;overflow:hidden;background:var(--ivory-3);border:1px solid var(--line-soft);border-radius:18px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:360px;width:100%;text-align:center;padding:32px}
.cwv5 .pd-art-name{font-family:var(--display);font-size:28px;color:var(--ink);line-height:1.25;letter-spacing:.01em}
.cwv5 .comm-hero-art .cha-cn{font-size:15px;color:var(--gold-deep);margin-top:2px}
.cwv5 .pd-art-src{font-size:10.5px;color:var(--muted-2);font-family:var(--latin)}
.cwv5 .comm-hero-badge{position:absolute;right:-22px;bottom:40px;left:auto;z-index:3}
.cwv5 .comm-hero-badge .hbn{display:inline-flex;align-items:center;gap:5px}
@media(max-width:900px){
.cwv5 .comm-hero-right{padding:0}
.cwv5 .comm-hero-art{min-height:320px}
.cwv5 .comm-hero-badge{right:auto;left:10px}}

/* —— 社区 Hero 护栏文案（§3.1）—— */
.cwv5 .cd-guard{font-size:11.5px;color:var(--muted);margin-top:14px;line-height:1.6;max-width:640px}

/* —— ② 片区画像 + 户型参考价表（§3.2）——CommunityProfile 未被 .report-doc 包裹，
   故此处重新声明 --rd-* 为象牙白，令其内 .rd-cm-* 全部解析为浅底 —— */
.cwv5 .report-doc__comm{--rd-ink:#1a1611;--rd-muted:#8b8478;--rd-faint:#a49c8e;--rd-gold:#7d6540;
  --rd-gold-soft:#A88858;--rd-red:#C02830;--rd-red-deep:#9E2028;--rd-line:rgba(26,22,17,.10);--rd-card:#fff;
  background:var(--white);border:1px solid var(--line-soft);border-radius:14px;padding:22px 24px;margin:0}
.cwv5 .rd-cm-blurb{color:var(--ink-soft)}
.cwv5 .rd-cm-tag{color:var(--gold-deep);background:var(--ivory-2);border:1px solid var(--line-soft)}
.cwv5 .rd-cm-grid>div .dl,.cwv5 .rd-cm-grid .dl{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-deep);font-family:var(--latin)}
.cwv5 .rd-cm-grid p{color:var(--ink-soft);font-size:12.5px}
.cwv5 .rd-cm-table{width:100%;border-collapse:collapse;font-size:12.5px;background:var(--white);border-radius:10px;overflow:hidden}
.cwv5 .rd-cm-table th{background:var(--ivory-3);text-align:left;padding:11px 15px;font-family:var(--latin);
  font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--gold-deep)}
.cwv5 .rd-cm-table td{padding:10px 15px;border-top:1px solid var(--line-soft);border-bottom:none;color:var(--ink-soft)}
.cwv5 .rd-cm-table td.lat{color:var(--ink)}
.cwv5 .rd-cm-badge{color:var(--gold-deep);background:var(--gold-tint);border:1px solid var(--line-soft)}
.cwv5 .rd-cm-src{color:var(--muted-2)}
/* 降级形态：白卡 + 虚线（§3.2）—— */
.cwv5 .cd-degrade{font-size:12.5px;color:var(--muted);margin-top:14px;padding:12px 16px;
  border:1px dashed var(--line);border-radius:8px;background:var(--white)}
.cwv5 .cd-degrade-box{background:var(--white);border:1px solid var(--line-soft);border-radius:12px;padding:24px}
.cwv5 .cd-degrade-box .cd-idline{font-size:14px;color:var(--ink);font-weight:600;margin-bottom:8px}
.cwv5 .cd-degrade-box p{font-size:13px;color:var(--ink-soft);margin-bottom:16px;line-height:1.6}
.cwv5 .cd-market-only{margin-top:20px}

/* —— ④ 社区在售项目降级 / ⑤ 活跃开发商 chips（§3.3 / §3.4）—— */
.cwv5 .cd-noproj{background:var(--white);border:1px solid var(--line-soft);border-radius:12px;padding:24px}
.cwv5 .cd-noproj p{font-size:13px;color:var(--ink-soft);line-height:1.7;margin-bottom:16px}
.cwv5 .cd-noproj-cta{display:flex;gap:12px;flex-wrap:wrap}
.cwv5 .cd-dev-chips{display:flex;flex-wrap:wrap;gap:10px}
.cwv5 .cd-dev-chip{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-soft);
  background:var(--white);border:1px solid var(--line);border-radius:20px;padding:8px 15px;transition:.18s}
.cwv5 .cd-dev-chip:hover{border-color:var(--gold);color:var(--gold-deep)}
.cwv5 .cd-dev-chip.is-nr{opacity:.85;cursor:default}
.cwv5 .cd-dev-chip .cddc-name{font-weight:500;color:var(--ink)}
.cwv5 .cd-dev-chip .cddc-count{font-size:11px;color:var(--muted-2);font-family:var(--latin)}

/* —— §1.3 ProjectCard 网格象牙白覆盖（作用域锁 .cwv5，绝不外泄列表页）—— */
.cwv5 .pcard{background:var(--white);border-color:var(--line-soft);border-left-color:var(--gold)}
.cwv5 .pcard-media{background:var(--ivory-3);border-bottom-color:var(--line-soft)}
.cwv5 .pcard-name{color:var(--ink)}
.cwv5 .pcard-cn{color:var(--gold-deep)}
.cwv5 .pcard-loc,.cwv5 .pcard-meta,.cwv5 .pcard-m,.cwv5 .pcard-m b{color:var(--ink-soft)}
.cwv5 .pcard-m em{color:var(--muted)}
.cwv5 .pcard-emi{color:var(--muted-2)}
.cwv5 .pcard-div{background:var(--line-soft)}
.cwv5 .pcard-price{color:var(--danfeng-red)}
.cwv5 .pcard-price.tbd{color:var(--muted)}
.cwv5 .pcard-tag{background:var(--ivory-2);border-color:var(--line-soft);color:var(--gold-deep)}
.cwv5 .pcard:hover{border-color:var(--line);box-shadow:0 20px 40px -28px rgba(26,22,17,.35)}
.cwv5 .pcard .pc-btn-red{background:var(--danfeng-red);color:#fff}
.cwv5 .pcard .pc-btn-red:hover{background:var(--red-deep)}
.cwv5 .pcard .pc-btn-ghost{border-color:var(--line);color:var(--ink)}
.cwv5 .pcard .pc-btn-ghost:hover{border-color:var(--gold);color:var(--gold-deep)}

/* —— §1.4 CommunityCard 网格象牙白覆盖 —— */
.cwv5 .comm-card{background:var(--white);border-color:var(--line-soft)}
.cwv5 .comm-card:hover{border-color:var(--line);box-shadow:0 20px 40px -28px rgba(26,22,17,.35)}
.cwv5 .comm-name{color:var(--ink)}
.cwv5 .comm-cn{color:var(--gold-deep)}
.cwv5 .cc-sub{color:var(--muted-2)}
.cwv5 .cc-blurb{color:var(--ink-soft)}
.cwv5 .cc-blurb-thin{color:var(--muted)}
.cwv5 .comm-tag{background:var(--ivory-2);border-color:var(--line-soft);color:var(--gold-deep)}
.cwv5 .cc-media{background:var(--ivory-3);border-bottom-color:var(--line-soft)}
.cwv5 .cc-mp .cc-bar{background:linear-gradient(90deg,var(--gold),var(--gold-bright))}
.cwv5 .cc-dld .cc-bar{background:linear-gradient(90deg,var(--red-deep),var(--danfeng-red))}
.cwv5 .cc-hot{color:#fff;background:var(--danfeng-red)}
.cwv5 .cc-data{border-top-color:var(--line-soft)}
.cwv5 .cc-d{color:var(--ink-soft)}
.cwv5 .cc-d em{color:var(--muted)}
.cwv5 .cc-d-price{color:var(--gold-deep)}
.cwv5 .cc-d-roi{color:var(--ink-soft)}
.cwv5 .cc-d-proj b{color:var(--gold-deep)}
.cwv5 .comm-card .pc-btn-red{background:var(--danfeng-red);color:#fff}
.cwv5 .comm-card .pc-btn-red:hover{background:var(--red-deep)}
.cwv5 .comm-card .pc-btn-ghost{border-color:var(--line);color:var(--ink)}
.cwv5 .comm-card .pc-btn-ghost:hover{border-color:var(--gold);color:var(--gold-deep)}
`;

// ============================================================
// V5_DEV_CONTENT_SUPPLEMENT — 开发商详情页「内容层」（品牌故事 / 发展里程碑 /
// 代表作品 / 业务版图）v5 象牙白样式。仅当 content/developers/<slug>.json 存在时
// 渲染；作用域全锁 .cwv5，与既有 .dev-* 区块节奏统一（编号排版语言、金线点睛）。
// ============================================================
export const V5_DEV_CONTENT_SUPPLEMENT = String.raw`
/* —— 品牌故事：象牙白长文卡 + 首字下沉金饰线 —— */
.cwv5 .dev-story{background:var(--white);border:1px solid var(--line-soft);border-radius:14px;
  padding:26px 30px;color:var(--ink-soft);font-size:15px;line-height:1.95;position:relative}
.cwv5 .dev-story::before{content:"";position:absolute;left:0;top:26px;bottom:26px;width:3px;
  background:linear-gradient(180deg,var(--gold),transparent);border-radius:3px}
.cwv5 .dev-story p{margin:0;text-indent:0}

/* —— 发展里程碑：编号时间线（金色年号 + 竖轴节点）—— */
.cwv5 .dev-mile{list-style:none;margin:0;padding:0;position:relative}
.cwv5 .dev-mile::before{content:"";position:absolute;left:88px;top:8px;bottom:8px;width:1px;background:var(--line)}
.cwv5 .dev-mile-item{position:relative;display:grid;grid-template-columns:76px 1fr;gap:26px;padding:0 0 22px}
.cwv5 .dev-mile-item:last-child{padding-bottom:0}
.cwv5 .dev-mile-year{font-family:var(--num);font-weight:800;font-size:17px;color:var(--gold-deep);
  text-align:right;line-height:1.5;padding-top:1px;white-space:nowrap}
.cwv5 .dev-mile-body{position:relative;padding-left:26px}
.cwv5 .dev-mile-body::before{content:"";position:absolute;left:-4.5px;top:6px;width:11px;height:11px;
  border-radius:50%;background:var(--white);border:2px solid var(--gold)}
.cwv5 .dev-mile-t{font-family:var(--display);font-size:15.5px;color:var(--ink);font-weight:600;margin-bottom:5px}
.cwv5 .dev-mile-d{font-size:13.5px;color:var(--ink-soft);line-height:1.75}
@media(max-width:640px){
.cwv5 .dev-mile::before{left:64px}
.cwv5 .dev-mile-item{grid-template-columns:56px 1fr;gap:18px}
.cwv5 .dev-mile-year{font-size:15px}}

/* —— 代表作品：卡片网格（可互链 → 金线上浮态）—— */
.cwv5 .dev-flag-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.cwv5 .dev-flag-card{display:block;background:var(--white);border:1px solid var(--line-soft);
  border-left:3px solid var(--line);border-radius:12px;padding:20px 22px;transition:.18s}
.cwv5 .dev-flag-card.is-link{border-left-color:var(--gold);cursor:pointer}
.cwv5 a.dev-flag-card.is-link:hover{border-color:var(--line);border-left-color:var(--gold);
  box-shadow:0 18px 38px -28px rgba(26,22,17,.4);transform:translateY(-2px)}
.cwv5 .dev-flag-name{font-family:var(--display);font-size:17px;color:var(--ink);font-weight:600;line-height:1.3}
.cwv5 .dev-flag-cn{font-size:13px;color:var(--gold-deep);margin-top:2px}
.cwv5 .dev-flag-pos{font-size:13px;color:var(--ink-soft);line-height:1.7;margin-top:10px}
.cwv5 .dev-flag-link{display:inline-block;margin-top:11px;font-size:12px;color:var(--gold-deep);font-family:var(--latin)}
.cwv5 a.dev-flag-card.is-link:hover .dev-flag-link{color:var(--gold)}
@media(max-width:640px){
.cwv5 .dev-flag-grid{grid-template-columns:1fr}}

/* —— 业务版图：金饰左线段落卡（与 dev-blurb 同族，稍宽松）—— */
.cwv5 .dev-biz{background:var(--white);border-left:3px solid var(--gold);border-radius:0 10px 10px 0;
  padding:20px 24px;color:var(--ink-soft);font-size:14.5px;line-height:1.9}
.cwv5 .dev-biz p{margin:0}
`;

