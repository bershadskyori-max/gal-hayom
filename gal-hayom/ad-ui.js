// Shows the sponsor card from ad.js under the daily summary, with a details panel.
(function(){
var A = window.AD; if(!A) return;
var st = document.createElement("style");
st.textContent = [
".ad-card{position:relative;border-radius:24px;overflow:hidden;background:#000;color:#fff;border:1px solid rgba(255,255,255,.14);",
"display:grid;grid-template-columns:auto 1fr;gap:4px 14px;align-items:center;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.25);animation:rise .6s cubic-bezier(.2,.9,.25,1) both}",
".ad-card::before{content:'';position:absolute;inset:0;background:radial-gradient(80% 120% at 0% 0%,rgba(79,230,204,.18),transparent 60%);pointer-events:none}",
".ad-card img{width:118px;height:auto;grid-row:span 2;position:relative}",
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
"@media (max-width:420px){.ad-card img{width:96px}}"
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
card.innerHTML = '<span class="ad-tag">מודעה</span><img src="' + A.logo + '" alt="' + esc(A.name) + '">' +
'<p><b>' + esc(A.tagline) + '.</b> ' + esc(A.short) + '</p><button type="button">לפרטים נוספים</button>';
var ai = document.querySelector("#viewF .ai");
if(ai) ai.insertAdjacentElement("afterend", card); else return;
var btn = card.querySelector("button");

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
