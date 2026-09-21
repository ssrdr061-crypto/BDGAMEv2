/* sisgecis.js — KALE İÇİNDEN HARİTAYA SİS GEÇİŞİ
   ═══════════════════════════════════════════════════════════════
   NE YAPAR
   Kale içinden dünya haritasına dönerken ekranı kısa bir sis
   kaplar, geçiş sisin arkasında olur, sonra sis dağılır. Oyuncu
   kesme değil, içinden geçilen bir perde görür.

   NEDEN CSS KEYFRAME DEĞİL, WEB ANIMATIONS
   index.html'de `@media (prefers-reduced-motion:reduce)` bütün CSS
   animasyon ve geçişlerini .01ms'ye indiriyor. Bu cihazda o ayar
   açık — CSS ile yazılsaydı geçiş hiç görünmezdi. Web Animations
   o kuraldan etkilenmiyor.

   NEDEN KASMIYOR
   · Yalnız `transform` ve `opacity` canlandırılıyor. İkisi de
     derleyici katmanında çalışır; yerleşim (layout) ve boyama
     (paint) her karede tekrarlanmaz.
   · `filter:blur` YOK. Blur ölçek değişince her karede yeniden
     rasterleşir, telefonda en pahalı iş odur. Yumuşaklık bunun
     yerine radial-gradient'in geniş geçişlerinden geliyor —
     bir kez boyanır, sonra yalnız taşınır.
   · Perde üç katman; her biri tek bir div. Parçacık, tuval, döngü
     yok.
   · Bitince katman display:none olur ve `will-change` kaldırılır
     (bırakılırsa tarayıcı belleği boşuna tutar).

   NASIL KULLANILIR
     SISGECIS.oynat(function () { ... });
   Geri çağrı sis EN YOĞUNKEN çalışır — yani ekran değişimi
   görünmez. Sis bir kez kurulur, sonraki geçişlerde aynı düğümler
   kullanılır.

   EMNİYET
   Animasyon desteklenmiyorsa ya da bir yerde hata çıkarsa geri
   çağrı YİNE ÇALIŞIR (try/catch + `element.animate` denetimi).
   Geçiş süslemedir; oyunu kilitlemesine izin verilmez.
   ═══════════════════════════════════════════════════════════════ */
(function sisGecis() {
  "use strict";

  var SURUM = "sisgecis-1";

  var GIRIS_MS = 300;   /* sis toplanıp ekranı kaplar */
  var CIKIS_MS = 480;   /* sis dağılır */

  var kap = null;       /* #sisGecis */
  var katmanlar = [];   /* üç sis levhası */
  var perde = null;     /* düz beyazımsı örtü — boşlukları doldurur */
  var calisiyor = false;

  /* Her levhanın kendi deseni, kendi yönü ve kendi hızı var;
     üçü aynı anda aynı yöne gitseydi tek parça bir duvar gibi
     dururdu. Ölçekler 1'den büyür → sis izleyiciye doğru gelir. */
  var LEVHALAR = [
    {
      desen:
        "radial-gradient(58% 42% at 22% 38%, rgba(236,244,252,.96), rgba(236,244,252,0) 70%)," +
        "radial-gradient(46% 36% at 74% 26%, rgba(214,230,246,.90), rgba(214,230,246,0) 72%)," +
        "radial-gradient(52% 40% at 52% 78%, rgba(228,238,250,.88), rgba(228,238,250,0) 74%)",
      basla: { x: -14, y: 6, o: 0.72 },
      bit:   { x: 16, y: -8, o: 1.52 }
    },
    {
      desen:
        "radial-gradient(50% 38% at 78% 62%, rgba(244,249,255,.94), rgba(244,249,255,0) 70%)," +
        "radial-gradient(44% 34% at 30% 74%, rgba(206,224,242,.88), rgba(206,224,242,0) 73%)," +
        "radial-gradient(40% 30% at 58% 18%, rgba(232,241,251,.84), rgba(232,241,251,0) 75%)",
      basla: { x: 18, y: -5, o: 0.80 },
      bit:   { x: -20, y: 9, o: 1.64 }
    },
    {
      desen:
        "radial-gradient(64% 46% at 50% 50%, rgba(252,253,255,.92), rgba(252,253,255,0) 68%)," +
        "radial-gradient(38% 30% at 14% 66%, rgba(220,232,246,.82), rgba(220,232,246,0) 74%)",
      basla: { x: 4, y: 14, o: 0.90 },
      bit:   { x: -6, y: -16, o: 1.88 }
    }
  ];

  function destekVar() {
    return !!(document.body && document.body.animate);
  }

  function kur() {
    if (kap) return;

    var st = document.createElement("style");
    st.id = "sisGecisStil";
    st.textContent = [
      /* z-index: kale katmanı 30, paneller 50, postalar 970.
         Perde hepsinin üstünde ama tıklamayı yutmuyor. */
      "#sisGecis{position:fixed; inset:0; z-index:9500; display:none;",
      "  pointer-events:none; overflow:hidden; contain:strict;}",
      "#sisGecis.acik{display:block;}",
      "#sisGecis .sg-perde{position:absolute; inset:0; opacity:0;",
      "  background:linear-gradient(180deg, rgba(222,235,248,.92) 0%,",
      "    rgba(238,245,252,.96) 45%, rgba(214,229,245,.92) 100%);}",
      /* Levhalar ekrandan geniş: ölçeklenip kayarken kenardan
         boşluk görünmesin. */
      "#sisGecis .sg-kat{position:absolute; left:-30%; top:-30%;",
      "  width:160%; height:160%; opacity:0;",
      "  background-repeat:no-repeat; background-size:100% 100%;}"
    ].join("\n");
    document.head.appendChild(st);

    kap = document.createElement("div");
    kap.id = "sisGecis";
    kap.setAttribute("aria-hidden", "true");

    perde = document.createElement("div");
    perde.className = "sg-perde";
    kap.appendChild(perde);

    LEVHALAR.forEach(function (L) {
      var d = document.createElement("div");
      d.className = "sg-kat";
      d.style.backgroundImage = L.desen;
      kap.appendChild(d);
      katmanlar.push(d);
    });

    document.body.appendChild(kap);
  }

  function willChange(ac) {
    var d = ac ? "transform, opacity" : "";
    if (perde) perde.style.willChange = ac ? "opacity" : "";
    katmanlar.forEach(function (k) { k.style.willChange = d; });
  }

  function bitir() {
    calisiyor = false;
    willChange(false);
    if (kap) kap.classList.remove("acik");
  }

  /* fn: sis en yoğunken çalışacak iş (ekran değişimi).
     Bir kez çalışır; iki kere çağrılmaması için bayrakla korunur. */
  function oynat(fn) {
    var yapildi = false;
    function isiYap() {
      if (yapildi) return;
      yapildi = true;
      try { if (typeof fn === "function") fn(); } catch (e) {}
    }

    /* Destek yoksa ya da geçiş zaten oynuyorsa: iş beklemez. */
    if (!destekVar() || calisiyor) { isiYap(); return; }

    try {
      kur();
      calisiyor = true;
      willChange(true);
      kap.classList.add("acik");

      var bitenler = 0, toplam = katmanlar.length + 1;
      function birBitti() { if (++bitenler >= toplam) bitir(); }

      /* GİRİŞ — sis toplanır. */
      var giris = [];
      giris.push(perde.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: GIRIS_MS, easing: "cubic-bezier(.32,0,.24,1)", fill: "forwards" }
      ));
      katmanlar.forEach(function (k, i) {
        var L = LEVHALAR[i];
        giris.push(k.animate(
          [
            { opacity: 0, transform: "translate3d(" + (-L.basla.x) + "%," + (-L.basla.y) + "%,0) scale(" + (L.basla.o * 0.92) + ")" },
            { opacity: 1, transform: "translate3d(" + L.basla.x + "%," + L.basla.y + "%,0) scale(" + L.basla.o + ")" }
          ],
          { duration: GIRIS_MS, easing: "cubic-bezier(.32,0,.24,1)", fill: "forwards" }
        ));
      });

      /* Ekran değişimi sis kapandığı anda; sonra çıkış başlar.
         Zamanlayıcı DEĞİL animasyonun kendi bitişi kullanılıyor —
         setTimeout kare atlarsa değişim sisin dışında görünürdü. */
      giris[0].finished.then(function () {
        isiYap();
        /* Bir kare bekle: kapanan ekranın son çizimi bitsin, çıkış
           sisin arkasında tam yeni sahneyle başlasın. */
        requestAnimationFrame(function () {
          perde.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: CIKIS_MS, easing: "cubic-bezier(.4,0,.5,1)", fill: "forwards" }
          ).finished.then(birBitti, birBitti);

          katmanlar.forEach(function (k, i) {
            var L = LEVHALAR[i];
            k.animate(
              [
                { opacity: 1, transform: "translate3d(" + L.basla.x + "%," + L.basla.y + "%,0) scale(" + L.basla.o + ")" },
                { opacity: 0, transform: "translate3d(" + L.bit.x + "%," + L.bit.y + "%,0) scale(" + L.bit.o + ")" }
              ],
              { duration: CIKIS_MS, easing: "cubic-bezier(.4,0,.5,1)", fill: "forwards" }
            ).finished.then(birBitti, birBitti);
          });
        });
      }, function () { isiYap(); bitir(); });

      /* EMNİYET AĞI: sekme arka plana atılırsa animasyonlar
         duraklar ve `finished` gelmez. Perde ekranda kalmasın. */
      setTimeout(function () {
        isiYap();
        if (calisiyor) bitir();
      }, GIRIS_MS + CIKIS_MS + 900);
    } catch (e) {
      isiYap();
      bitir();
    }
  }

  window.SISGECIS = { SURUM: SURUM, oynat: oynat };
})();
