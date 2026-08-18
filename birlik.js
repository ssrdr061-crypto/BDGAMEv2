/* ═══════════════════════════════════════════════════════════════
   birlik.js — TEST ARACI
   Adres sonuna ?birlik=1 eklenince Eğitim panelinde bir düğme çıkar.
   Basınca knight / soldier / robot birliklerinin her birine 54.000 eklenir.
   Kaynak düşmez, kuyruğa girmez, süre beklenmez.
   Parametre yoksa bu dosya HİÇBİR ŞEY yapmaz.
   Kalıcı kod değil — test bitince index.html'deki satırı sil.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  if (!/[?&]birlik=1/.test(location.search || "")) return;

  var ADET   = 54000;
  var HEDEF  = ["knight", "soldier", "robot"];
  var SURUM  = "birlik.js v1";

  /* index.html'de "const state" olduğu için window.state undefined kalır.
     Doğru erişim: çıplak isim, try içinde. */
  function durum() {
    try { return (typeof state !== "undefined") ? state : null; }
    catch (e) { return null; }
  }

  function panelAcikMi() {
    var p = document.getElementById("panel-troops");
    return !!(p && p.classList.contains("active"));
  }

  function stilEkle() {
    if (document.getElementById("birlik-test-stil")) return;
    var s = document.createElement("style");
    s.id = "birlik-test-stil";
    s.textContent =
      'html body #birlik-test-dugme{' +
        'position:fixed;left:50%;transform:translateX(-50%);' +
        'bottom:96px;z-index:99999;' +
        'padding:10px 18px;border:none;border-radius:12px;' +
        'background:#1f6f4a;color:#eafff4;' +
        'font-family:"Baloo 2",sans-serif;font-size:15px;font-weight:600;' +
        'box-shadow:0 2px 6px rgba(0,20,45,.3);' +
        'text-shadow:0 1px 2px rgba(0,20,45,.55);' +
        'display:none;' +
      '}' +
      'html body #birlik-test-dugme:active{' +
        'transform:translateX(-50%) scale(.96);filter:brightness(.93);' +
        'transition:.09s;' +
      '}' +
      'html body #birlik-test-bilgi{' +
        'position:fixed;left:50%;transform:translateX(-50%);' +
        'bottom:150px;z-index:99999;' +
        'padding:6px 12px;border-radius:10px;' +
        'background:rgba(6,20,34,.9);color:#cfe9ff;' +
        'font-family:"Baloo 2",sans-serif;font-size:13px;' +
        'box-shadow:0 2px 6px rgba(0,20,45,.3);' +
        'display:none;pointer-events:none;' +
      '}';
    document.head.appendChild(s);
  }

  function bilgiYaz(metin) {
    var b = document.getElementById("birlik-test-bilgi");
    if (!b) return;
    b.textContent = metin;
    b.style.display = "block";
    clearTimeout(b._zaman);
    b._zaman = setTimeout(function () { b.style.display = "none"; }, 2500);
  }

  function bas() {
    var st = durum();
    if (!st) { bilgiYaz("state bulunamadı"); return; }
    if (!st.troops) st.troops = { knight: 0, soldier: 0, robot: 0 };

    for (var i = 0; i < HEDEF.length; i++) {
      var k = HEDEF[i];
      st.troops[k] = (st.troops[k] || 0) + ADET;
    }

    /* Kayıt yazılmazsa yenilemede geri gider. */
    try {
      if (typeof persistCurrentState === "function") persistCurrentState();
    } catch (e) {}

    try {
      if (typeof renderTroopsPanel === "function") renderTroopsPanel();
    } catch (e) {}

    bilgiYaz("Her birliğe +" + ADET.toLocaleString("tr-TR") + " eklendi");
  }

  function dugumKur() {
    stilEkle();

    var d = document.getElementById("birlik-test-dugme");
    if (!d) {
      d = document.createElement("button");
      d.id = "birlik-test-dugme";
      d.type = "button";
      d.textContent = "+54.000 (3 birlik)";
      d.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        bas();
      });
      document.body.appendChild(d);
    }

    if (!document.getElementById("birlik-test-bilgi")) {
      var b = document.createElement("div");
      b.id = "birlik-test-bilgi";
      document.body.appendChild(b);
    }

    return d;
  }

  function gorunurluk() {
    var d = document.getElementById("birlik-test-dugme") || dugumKur();
    d.style.display = panelAcikMi() ? "block" : "none";
  }

  function baslat() {
    dugumKur();
    gorunurluk();

    /* Panel açılıp kapandıkça düğmeyi göster/gizle. */
    var p = document.getElementById("panel-troops");
    if (p && typeof MutationObserver === "function") {
      new MutationObserver(gorunurluk).observe(p, {
        attributes: true,
        attributeFilter: ["class", "style"]
      });
    } else {
      setInterval(gorunurluk, 500);
    }

    if (window.console && console.log) console.log(SURUM + " aktif");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", baslat);
  } else {
    baslat();
  }
})();
