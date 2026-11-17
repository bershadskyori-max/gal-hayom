// Shows the sponsor card from ad.js under the daily summary, with a details panel.
(function(){
var A = window.AD; if(!A) return;
var st = document.createElement("style");
st.textContent = [
".ad-card{position:relative;border-radius:24px;overflow:hidden;background:#000;color:#fff;border:1px solid rgba(255,255,255,.14);",
"display:grid;grid-template-columns:auto 1fr;gap:4px 14px;align-items:center;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.25);animation:rise .6s cubic-bezier(.2,.9,.25,1) both}",
".ad-card::before{content:'';position:absolute;inset:0;background:radial-gradient(80% 120% at 0% 0%,rgba(79,230,204,.18),transparent 60%);pointer-events:none}",
".ad-card{transform-style:preserve-3d;transition:transform .5s cubic-bezier(.2,.9,.25,1);will-change:transform;padding-bottom:26px}",
".ad-card.tilting{transition:transform .08s linear}",
".ad-logo{grid-row:span 2;position:relative;display:block;overflow:hidden;border-radius:12px;animation:adBob 4.8s ease-in-out infinite}",
".ad-logo img{width:118px;height:auto;display:block;position:relative}",
".ad-logo::after{content:'';position:absolute;inset:-20% auto -20% -60%;width:45%;transform:skewX(-20deg) translateX(-120%);",
"background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);mix-blend-mode:screen;animation:adShine 6s ease-in-out 1.2s infinite}",
"@keyframes adBob{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-4px) rotate(1.5deg)}}",
"@keyframes adShine{0%,70%{transform:skewX(-20deg) translateX(-120%)}100%{transform:skewX(-20deg) translateX(520%)}}",
".ad-waves{position:absolute;inset:auto 0 0 0;height:30px;pointer-events:none;overflow:hidden;opacity:.9}",
".ad-waves svg{position:absolute;bottom:0;width:200%;height:100%}",
".ad-waves .w1{animation:adWave 7s linear infinite;color:rgba(79,230,204,.35)}",
".ad-waves .w2{animation:adWave 11s linear infinite reverse;color:rgba(43,183,216,.22);bottom:-3px}",
"@keyframes adWave{from{transform:translateX(0)}to{transform:translateX(50%)}}",
".ad-crack{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0}",
".ad-crack path{fill:none;stroke:#fff;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:420;stroke-dashoffset:420}",
".ad-card.play .ad-crack{animation:adCrackBox 2.6s ease-out forwards}",
".ad-card.play .ad-crack path{animation:adCrack 2.6s cubic-bezier(.3,.7,.2,1) forwards}",
"@keyframes adCrackBox{0%{opacity:1}75%{opacity:1}100%{opacity:0}}",
"@keyframes adCrack{0%{stroke-dashoffset:420;stroke:#fff}35%{stroke-dashoffset:0;stroke:#fff;filter:none}55%{stroke:#fff}75%{stroke:#4fe6cc;stroke-width:3;filter:drop-shadow(0 0 6px #4fe6cc)}100%{stroke-dashoffset:0;stroke:#4fe6cc;stroke-width:0;filter:drop-shadow(0 0 10px #4fe6cc)}}",
".ad-card.play .ad-fixed{animation:adFixed 2.6s ease-out forwards}",
".ad-card>p,.ad-card>button,.ad-logo{z-index:1}",
".ad-fixed{position:absolute;top:8px;inset-inline-start:64px;font-size:11px;font-weight:800;color:#4fe6cc;opacity:0;letter-spacing:.04em}",
"@keyframes adFixed{0%,62%{opacity:0;transform:translateY(4px)}72%,88%{opacity:1;transform:none}100%{opacity:0}}",
".ad-card button{position:relative;overflow:hidden}",
".ad-card button::before{content:'';position:absolute;inset:0;border-radius:inherit;box-shadow:0 0 0 0 rgba(79,230,204,.6);animation:adPulse 2.8s ease-out 3s infinite}",
"@keyframes adPulse{0%{box-shadow:0 0 0 0 rgba(79,230,204,.55)}70%,100%{box-shadow:0 0 0 12px rgba(79,230,204,0)}}",
".ad-detail .ad-hero{position:relative;overflow:hidden}",
".ad-detail .ad-hero img{animation:adBob 4.8s ease-in-out infinite}",
"@media (prefers-reduced-motion:reduce){.ad-logo,.ad-logo::after,.ad-waves svg,.ad-card button::before,.ad-detail .ad-hero img{animation:none!important}.ad-card.play .ad-crack,.ad-card.play .ad-fixed{animation:none!important}.ad-card{transform:none!important}}",
".ad-card p{margin:0;font-size:15px;line-height:1.45;position:relative}",
".ad-card .ad-tag{position:absolute;top:8px;inset-inline-start:12px;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:rgba(255,255,255,.55)}",
".ad-card button{justify-self:start;position:relative;border:0;border-radius:99px;padding:8px 16px;min-height:40px;font-weight:800;font-size:14px;",
"background:#fff;color:#000;cursor:pointer;transition:transform 120ms ease-out}",
".ad-card button:active{transform:scale(.96)}",
"#sheetScore[hidden]{display:none!important}",
".ad-detail{display:flex;flex-direction:column;gap:14px}",
".ad-detail .ad-hero{background:#000;border-radius:18px;padding:18px;display:grid;place-items:center}",
".ad-detail .ad-hero img{width:min(280px,80%);height:auto}",
".ad-detail p{margin:0;font-size:16px;line-height:1.6}",
".ad-detail ul{margin:0;padding-inline-start:20px;display:grid;gap:6px;font-size:15.5px}",
".ad-detail .ad-links{display:flex;flex-wrap:wrap;gap:8px}",
".ad-detail .ad-links a{display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-weight:800;font-size:14px;padding:10px 16px;border-radius:99px;background:#000;color:#fff;min-height:44px}",
"@media (max-width:420px){.ad-logo img{width:96px}}"
].join("");
document.head.appendChild(st);

function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
var L = A.links || {};
var links = [];
if(L.whatsapp) links.push(['https://wa.me/' + String(L.whatsapp).replace(/\D/g,''), 'וואטסאפ']);
if(L.instagram) links.push([/^https?:/.test(L.instagram) ? L.instagram : 'https://www.instagram.com/' + String(L.instagram).replace(/^@/,''), 'אינסטגרם']);
if(L.site) links.push([L.site, 'לאתר']);
if(L.phone) links.push(['tel:' + String(L.phone).replace(/[^\d+]/g,''), 'טלפון: ' + L.phone]);

var card = document.createElement("article");
card.className = "ad-card";
card.setAttribute("aria-label", "מודעה: " + A.name);
var WAVE = '<path fill="currentColor" d="M0 18 Q25 8 50 18 T100 18 T150 18 T200 18 T250 18 T300 18 T350 18 T400 18 V40 H0Z"/>';
card.innerHTML = '<span class="ad-tag">מודעה</span><span class="ad-fixed">✓ תוקן</span>' +
'<span class="ad-logo"><img src="' + A.logo + '" alt="' + esc(A.name) + '"></span>' +
'<p><b>' + esc(A.tagline) + '.</b> ' + esc(A.short) + '</p><button type="button">לפרטים נוספים</button>' +
'<div class="ad-waves" aria-hidden="true"><svg class="w2" viewBox="0 0 400 40" preserveAspectRatio="none">' + WAVE + '</svg><svg class="w1" viewBox="0 0 400 40" preserveAspectRatio="none">' + WAVE + '</svg></div>' +
'<svg class="ad-crack" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="M-2 34 L14 40 L22 33 L33 47 L45 41 L52 55 L63 49 L72 62 L84 57 L102 68"/></svg>';
var ai = document.querySelector("#viewF .ai");
if(ai) ai.insertAdjacentElement("afterend", card); else return;
var btn = card.querySelector("button");

/* a crack runs across the card and seals itself (that's the repair), once, when the card scrolls into view */
var REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
if(!REDUCED && "IntersectionObserver" in window){
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting && e.intersectionRatio > .6){ card.classList.add("play"); io.disconnect(); } }); }, {threshold:[.6]});
  io.observe(card);
}
/* gentle 3D tilt that follows the pointer, springs back on leave */
if(!REDUCED && matchMedia("(hover:hover)").matches){
  card.addEventListener("pointermove", function(e){
    var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    card.classList.add("tilting");
    card.style.transform = "perspective(700px) rotateX(" + (-py * 6).toFixed(2) + "deg) rotateY(" + (px * 8).toFixed(2) + "deg)";
  });
  card.addEventListener("pointerleave", function(){ card.classList.remove("tilting"); card.style.transform = ""; });
}

function openAdSheet(){
lastFocus = btn;
$("sheetScore").hidden = true;
$("sheetTitle").firstChild.textContent = A.name;
$("sheetSub").textContent = A.tagline;
$("sheetBody").innerHTML = '<div class="ad-detail"><div class="ad-hero"><img src="' + A.logo + '" alt="' + esc(A.name) + '"></div>' +
'<p>' + esc(A.details) + '</p>' +
((A.services || []).length ? '<ul>' + A.services.map(function(s){ return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') +
(links.length ? '<div class="ad-links">' + links.map(function(l){ return '<a href="' + esc(l[0]) + '" target="_blank" rel="noopener">' + esc(l[1]) + '</a>'; }).join('') + '</div>'
: '<p class="tag">פרטי קשר יתווספו בקרוב.</p>') + '</div>';
sheet.style.visibility = "visible"; scrim.classList.add("on"); sheetH = sheet.getBoundingClientRect().height + 20;
if(!sheetOpen && (!sheetAnim || sheetY >= sheetH - 1)) setSheetY(sheetH);
sheetOpen = true; $("sheetBody").scrollTop = 0; animateSheet(0, 0, 1, .38);
setTimeout(function(){ $("sheetClose").focus({preventScroll:true}); }, 60);
}
btn.addEventListener("click", openAdSheet);

var origOpen = openSheet;
openSheet = function(){ $("sheetScore").hidden = false; return origOpen.apply(this, arguments); };
})();
