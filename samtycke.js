// Samtycke till besöksstatistik (Linus 2026-11-24). Samma fil på spekt.se, outreach.spekt.se (och aimotorn.se),
// foretagsdata.spekt.se och education.spekt.se.
//
// - Google Analytics laddas först när besökaren har tryckt Godkänn statistik, eller direkt om hon redan har godkänt.
//   Nej tack laddar ingenting. Valet sparas i localStorage ("spekt-samtycke": "ja" eller "nej") på den här sajten.
// - Kakorna gäller bara sajten där samtycket gavs (cookie_domain = sajtens eget namn). Inga annonsfunktioner.
// - En länk med data-samtycke (i sidfoten: Kakor och statistik) öppnar rutan igen. Säger man Nej tack efter att ha
//   godkänt tas Google Analytics-kakorna bort och sidan laddas om.
// - Mätnings-id: aimotorn.se har ett eget, alla andra sajter samma.
// - Länken till integritetssidan: data-integritet på script-taggen, annars /integritet.
(function () {
  "use strict";
  var NYCKEL = "spekt-samtycke";
  var namn = location.hostname.replace(/^www\./, "");
  var ID = namn === "aimotorn.se" ? "G-D2LD2YNR09" : "G-C29NEYLQYK";
  var skript = document.currentScript;
  var INTEGRITET = (skript && skript.getAttribute("data-integritet")) || "/integritet";
  var laddad = false;
  var ruta = null;

  function las() { try { return localStorage.getItem(NYCKEL); } catch (e) { return null; } }
  function spara(v) { try { localStorage.setItem(NYCKEL, v); } catch (e) { /* utan lagring gäller valet bara den här sidan */ } }

  function laddaStatistik() {
    if (laddad) return;
    laddad = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("js", new Date());
    window.gtag("config", ID, { cookie_domain: location.hostname, allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ID);
    document.head.appendChild(s);
  }

  function taBortKakor() {
    var delar = location.hostname.split(".");
    var domaner = [""];
    for (var i = 0; i < delar.length - 1; i++) domaner.push(delar.slice(i).join("."));
    document.cookie.split(";").forEach(function (k) {
      var n = k.split("=")[0].trim();
      if (!/^_ga/.test(n)) return;
      domaner.forEach(function (d) {
        document.cookie = n + "=; Max-Age=0; path=/" + (d ? "; domain=" + d : "");
        if (d) document.cookie = n + "=; Max-Age=0; path=/; domain=." + d;
      });
    });
  }

  function stil() {
    if (document.getElementById("spekt-samtycke-stil")) return;
    var css =
      ".spekt-samtycke{position:fixed;z-index:2147483000;left:16px;right:16px;bottom:16px;max-width:520px;box-sizing:border-box;" +
      "padding:14px 16px;background:var(--kort,#FDFCF9);color:var(--text,#17223A);border:1px solid var(--linje-stark,#B8B2A4);" +
      "border-radius:var(--radius-md,8px);box-shadow:0 6px 24px rgba(0,0,0,.14);font-family:var(--font-sans,system-ui,sans-serif);" +
      "font-size:14px;line-height:1.45}" +
      ".spekt-samtycke p{margin:0 0 10px}" +
      ".spekt-samtycke a{color:var(--lank,var(--text,#17223A));text-decoration:underline}" +
      ".spekt-samtycke-lage{color:var(--text-svag,#555E70);font-size:13px}" +
      ".spekt-samtycke-knappar{display:flex;flex-wrap:wrap;gap:8px}" +
      ".spekt-samtycke-knappar button{flex:1 1 140px;min-height:40px;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer;" +
      "background:var(--kort,#FDFCF9);color:var(--text,#17223A);border:1.5px solid var(--text,#17223A);border-radius:var(--radius-full,999px)}" +
      ".spekt-samtycke-knappar button:hover{background:var(--yta-tonad,#EFEBE2)}" +
      ".spekt-samtycke-knappar button:focus-visible{outline:2px solid var(--fokus,#17223A);outline-offset:2px}" +
      "@media (min-width:640px){.spekt-samtycke{right:auto;left:24px;bottom:24px}}" +
      "@media print{.spekt-samtycke{display:none}}";
    var el = document.createElement("style");
    el.id = "spekt-samtycke-stil";
    el.textContent = css;
    document.head.appendChild(el);
  }

  function stang() { if (ruta) { ruta.remove(); ruta = null; } }

  function valj(v) {
    var forut = las() === "ja" || laddad;
    spara(v);
    stang();
    if (v === "ja") { laddaStatistik(); return; }
    if (forut) { taBortKakor(); location.reload(); }
  }

  function visa(fokus) {
    if (ruta) { if (fokus) ruta.querySelector("button").focus(); return; }
    stil();
    var v = las();
    ruta = document.createElement("div");
    ruta.className = "spekt-samtycke";
    ruta.setAttribute("role", "region");
    ruta.setAttribute("aria-label", "Kakor och statistik");
    var text = document.createElement("p");
    text.appendChild(document.createTextNode("Får vi mäta besöken med Google Analytics? Det sätter kakor, och vi ser vilka sidor som används. "));
    var lank = document.createElement("a");
    lank.href = INTEGRITET + "#kakor";
    lank.textContent = "Läs mer";
    text.appendChild(lank);
    ruta.appendChild(text);
    if (v === "ja" || v === "nej") {
      var lage = document.createElement("p");
      lage.className = "spekt-samtycke-lage";
      lage.textContent = v === "ja" ? "Du har godkänt statistik." : "Du har sagt nej till statistik.";
      ruta.appendChild(lage);
    }
    var knappar = document.createElement("div");
    knappar.className = "spekt-samtycke-knappar";
    [["nej", "Nej tack"], ["ja", "Godkänn statistik"]].forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = k[1];
      b.setAttribute("data-val", k[0]);
      b.addEventListener("click", function () { valj(k[0]); });
      knappar.appendChild(b);
    });
    ruta.appendChild(knappar);
    document.body.appendChild(ruta);
    if (fokus) knappar.querySelector("button").focus();
  }

  function start() {
    var v = las();
    if (v === "ja") laddaStatistik();
    else if (v !== "nej") visa(false);
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-samtycke]") : null;
      if (!t) return;
      e.preventDefault();
      visa(true);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
