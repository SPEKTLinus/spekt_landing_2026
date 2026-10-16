// Gemensamt beteende för spekt.se: inglidning och mobilmeny
(function () {
  var reducerad = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var alla = document.querySelectorAll(".in");
  if (reducerad || !("IntersectionObserver" in window)) {
    alla.forEach(function (e) { e.classList.add("syns"); });
    return;
  }
  var io = new IntersectionObserver(function (poster) {
    poster.forEach(function (p) {
      if (p.isIntersecting) { p.target.classList.add("syns"); io.unobserve(p.target); }
    });
  }, { threshold: 0.12 });
  alla.forEach(function (e, i) {
    e.style.transitionDelay = Math.min(i % 4 * 90, 270) + "ms";
    io.observe(e);
  });
  // om sidan laddas i bakgrunden triggar aldrig observern — visa allt ändå
  setTimeout(function () {
    alla.forEach(function (e) { e.classList.add("syns"); });
  }, 2200);
})();

(function () {
  var knapp = document.querySelector(".burgare");
  var meny = document.getElementById("mobilmeny");
  function satt(oppen) {
    knapp.setAttribute("aria-expanded", oppen ? "true" : "false");
    meny.classList.toggle("oppen", oppen);
  }
  knapp.addEventListener("click", function () {
    satt(knapp.getAttribute("aria-expanded") !== "true");
  });
  meny.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { satt(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !meny.classList.contains("oppen")) return;
    var inne = meny.contains(document.activeElement);
    satt(false);
    if (inne) knapp.focus();
  });
  // menyn hör bara till mobilläget — stäng den om fönstret breddas förbi brytpunkten
  var mobil = matchMedia("(max-width: 720px)");
  function brytpunkt() { if (!mobil.matches) satt(false); }
  if (mobil.addEventListener) mobil.addEventListener("change", brytpunkt);
  else mobil.addListener(brytpunkt);
})();
