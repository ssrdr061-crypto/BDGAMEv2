/* ═══════════════════════════════════════════════════════════════════════
   gucefekt.js — EKRAN ORTASI "GÜÇ +N" ŞERİDİ

   NE YAPAR
   Kışlanın üstündeki üretim baloncuğuna dokunulup birlikler orduya
   katılınca, ekranın TAM ORTASINDA bir şerit belirir:  ✊ Güç +258
   Şerit büyüyerek girer, kısa süre durur, yükselirken saydamlaşıp
   kaybolur. Hiçbir state alanına dokunmaz — yalnız görsel katman.

   TEK GİRİŞ:  GUC_EFEKT.goster(miktar)
   Çağıran yer TEK: index.html egitimTopla(). Başka bir yerden de
   kullanmak istersen aynı kapıdan geç, ikinci bir şerit çizme.

   NEDEN CSS ANİMASYONU DEĞİL
   `prefers-reduced-motion` tüm CSS animasyonlarını öldürüyor
   (Tuzak 11) — şerit hiç görünmeden silinirdi. Bütün hareket
   requestAnimationFrame ile yapılıyor.

   GÖRÜNÜM
   3B yok: kalın alt kenar, inset kabartı, radial parlaklık yok.
   Baloo 2 · rakamda tabular-nums · text-shadow 0 1px 2px.
   İkon innerHTML'e girdiği için GÖRSEL kullanılır (gucikon.webp);
   dosya açılmazsa onerror ile ✊ emojisine döner (emoji/görsel
   ayrımı — düz metin bağlamı değil, burası innerHTML).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SURUM = "gucefekt-1";

  var IKON_GORSEL = "gucikon.webp";   /* guchud.js ile aynı dosya */
  var IKON_EMOJI  = "✊";

  /* Zamanlama (ms) — tek yer */
  var GIR  = 200;
  var DUR  = 900;
  var CIK  = 480;

  var katman = null;
  var canlilar = [];        /* üst üste binenler: [{el, dogum, sira}] */
  var raf = null;

  function stilKur() {
    if (document.getElementById("gucEfektStil")) return;
    var st = document.createElement("style");
    st.id = "gucEfektStil";
    st.textContent =
      "#gucEfektKat{position:fixed;left:0;right:0;top:0;bottom:0;" +
        "z-index:9500;pointer-events:none;overflow:hidden;}" +
      ".ge-serit{position:absolute;left:50%;top:50%;" +
        "display:flex;align-items:center;justify-content:center;gap:9px;" +
        "white-space:nowrap;padding:7px 30px;border-radius:10px;" +
        "background-color:transparent;" +
        "background-image:linear-gradient(90deg," +
          "rgba(20,64,132,0) 0%,rgba(26,92,176,.94) 17%," +
          "rgba(26,92,176,.94) 83%,rgba(20,64,132,0) 100%);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);border:none;" +
        "font-family:'Baloo 2','Nunito',sans-serif;font-weight:800;" +
        "font-size:20px;line-height:1.15;color:#fff;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);" +
        "font-variant-numeric:tabular-nums;}" +
      ".ge-ikon{width:22px;height:22px;display:block;flex:0 0 22px;" +
        "object-fit:contain;}" +
      ".ge-emoji{font-size:19px;line-height:1;}";
    document.head.appendChild(st);
  }

  function katmanKur() {
    if (katman && katman.isConnected) return katman;
    stilKur();
    katman = document.getElementById("gucEfektKat");
    if (!katman) {
      katman = document.createElement("div");
      katman.id = "gucEfektKat";
      document.body.appendChild(katman);
    }
    return katman;
  }

  function simdi() {
    return (typeof performance !== "undefined") ? performance.now() : Date.now();
  }

  function bicim(n) {
    try { return Number(n).toLocaleString("tr-TR"); }
    catch (e) { return String(n); }
  }

  /* Yumuşak giriş — sonda hafif bir taşma (aşırı zıplama yok) */
  function yumusat(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function dongu() {
    raf = null;
    var t = simdi();
    var kalan = [];

    for (var i = 0; i < canlilar.length; i++) {
      var c = canlilar[i];
      var y = t - c.dogum;
      var op, olcek, kay;

      if (y < GIR) {
        var a = yumusat(y / GIR);
        op = a;
        olcek = 0.86 + 0.14 * a;
        kay = 16 * (1 - a);
      } else if (y < GIR + DUR) {
        op = 1; olcek = 1; kay = 0;
      } else if (y < GIR + DUR + CIK) {
        var b = (y - GIR - DUR) / CIK;
        op = 1 - b;
        olcek = 1 - 0.04 * b;
        kay = -26 * b;
      } else {
        if (c.el && c.el.parentNode) c.el.parentNode.removeChild(c.el);
        continue;
      }

      /* Tuzak 12: calc(-50% + var(--x)) eksi değerde sessizce düşer.
         Yüzde ve pikseli AYRI translate() halkalarına böl. */
      c.el.style.opacity = op;
      c.el.style.transform =
        "translate(-50%,-50%) translate(0px," + (c.yuva + kay).toFixed(1) + "px)" +
        " scale(" + olcek.toFixed(3) + ")";
      kalan.push(c);
    }

    canlilar = kalan;
    if (canlilar.length) raf = requestAnimationFrame(dongu);
  }

  /* miktar: kazanılan güç (sayı). 0 ya da geçersizse hiçbir şey olmaz. */
  function goster(miktar, etiket) {
    var n = Math.round(Number(miktar) || 0);
    if (!n) return;

    var k = katmanKur();
    var el = document.createElement("div");
    el.className = "ge-serit";
    el.innerHTML =
      '<img class="ge-ikon" src="' + IKON_GORSEL + '" alt="" ' +
      'onerror="this.outerHTML=\'<span class=&quot;ge-emoji&quot;>' + IKON_EMOJI + '</span>\'">' +
      '<span>' + (etiket || "Güç") + " +" + bicim(n) + "</span>";
    el.style.opacity = "0";
    el.style.transform = "translate(-50%,-50%)";
    k.appendChild(el);

    /* Aynı anda birden fazla şerit gelirse alt alta dizilir */
    var yuva = canlilar.length * 46;
    canlilar.push({ el: el, dogum: simdi(), yuva: yuva });
    if (!raf) raf = requestAnimationFrame(dongu);
  }

  window.GUC_EFEKT = { SURUM: SURUM, goster: goster };
})();
