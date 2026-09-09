/* kaynakhud.js — ÜST MENÜ KAYNAK DÜĞMESİ + LİSTE PANELİ
   ═══════════════════════════════════════════════════════════════
   NE YAPAR
   Üst menüde ikinci satırı kaplayan 5'li kaynak şeridi
   (#hudKaynak) artık satır değil, AÇILIR PANELDİR. Üst satıra tek
   bir düğme (#kaynakPill) konur; düğme 30 saniyede bir başka
   kaynağı gösterir (odun → et → demir → su → enerji → …), düğmeye
   basınca panel açılır ve beş kaynak alt alta listelenir:
   ikon · ad · üretim/dk · stok.

   NEDEN ŞERİDİN KENDİSİ PANEL OLDU (kök çözüm)
   #kayOdun/#kayEt/#kayDemir/#kaySu/#kayEnerji kutucuklarını
   index.html'deki renderKaynaklar() ve tema.js'teki
   ustSeridiKisalt() besliyor; tema.js ayrıca .kaynak-ikon içine
   webp görseli basıyor. Yeni bir liste ÜRETİLSEYDİ bu üç kod da
   ikinci bir yola bağlanmak zorunda kalırdı. Onun yerine var olan
   satırlar (.kaynak-oge) panelin satırları oldu: besleyen kod
   olduğu gibi çalışır, ikinci teslimat yolu açılmaz.

   Düğmedeki sayı da panelin satırından okunur (textContent),
   yeniden biçimlendirilmez — kısaltma kuralı tek yerde kalır.

   KONUM
   Panel position:fixed; yeri her açılışta düğmenin
   getBoundingClientRect'inden hesaplanır (offsetParent null olur).

   HAREKET
   Açılış/kapanış ve 30 sn'lik dönüş Web Animations ile yazıldı;
   CSS keyframe/transition yok (prefers-reduced-motion hepsini
   öldürürdü).
   ═══════════════════════════════════════════════════════════════ */
(function kaynakHud() {
  "use strict";

  var SURUM = "kaynakhud-1";

  /* Sıra: düğmenin gösterim döngüsü ve panel satır sırası */
  var KAYNAKLAR = [
    { id: "kayOdun",   anahtar: "odun",   ad: "Odun"   },
    { id: "kayEt",     anahtar: "et",     ad: "Et"     },
    { id: "kayDemir",  anahtar: "demir",  ad: "Demir"  },
    { id: "kaySu",     anahtar: "su",     ad: "Su"     },
    { id: "kayEnerji", anahtar: "enerji", ad: "Enerji" }
  ];

  var DONGU_MS   = 30000;  /* düğmedeki kaynak kaç ms'de bir değişir */
  var TAZELE_MS  = 1000;   /* düğmedeki sayı kaç ms'de bir okunur */
  var HAYALET_MS = 350;    /* panel açılırken tıklamaya kapalı süre */

  var sira    = 0;         /* düğmede o an duran kaynağın indeksi */
  var acik    = false;
  var pill    = null;      /* üst satırdaki düğme */
  var pIkon   = null;
  var pDeger  = null;
  var panel   = null;      /* = #hudKaynak */

  /* ── 1) STİL ─────────────────────────────────────────────────
     tema.js `html body .hud-top ...` önekiyle !important yazıyor.
     Burada ID'li seçici kullanılıyor: sıralama ne olursa olsun
     ağırlık daha yüksek, ezilme riski yok. */
  function stilBas() {
    if (document.getElementById("kaynakHudStil")) return;
    var st = document.createElement("style");
    st.id = "kaynakHudStil";
    st.textContent = [
      /* Şerit artık akışta değil: menü tek satıra iner. */
      'html body #hudKaynak.hud-kaynak{',
      '  position:fixed !important; left:0; top:0;',
      '  flex:0 0 auto !important; order:0 !important;',
      '  display:none !important; flex-direction:column !important;',
      '  gap:0 !important; width:214px; padding:6px !important;',
      '  background:linear-gradient(180deg,var(--km-1),var(--km-2) 55%,var(--km-3)) !important;',
      '  border:1px solid var(--km-kenar) !important; border-radius:14px !important;',
      '  box-shadow:0 2px 6px rgba(0,20,45,.3) !important;',
      '  z-index:960 !important; pointer-events:auto !important;',
      '  transform-origin:top center;',
      '}',
      'html body #hudKaynak.hud-kaynak.kh-acik{ display:flex !important; }',

      /* Satır: ikon · ad · üretim · stok */
      'html body #hudKaynak .kaynak-oge{',
      '  display:grid !important; grid-template-columns:22px 1fr auto !important;',
      '  align-items:center !important; gap:7px !important;',
      '  flex:0 0 auto !important; width:100% !important;',
      '  padding:6px 7px !important; margin:0 !important;',
      '  background:none !important; border:none !important; border-radius:9px !important;',
      '  font-family:"Baloo 2","Nunito",sans-serif !important;',
      '  font-size:13.5px !important; font-weight:800 !important; line-height:1.25 !important;',
      '  color:#f2fbff !important; text-shadow:0 1px 2px rgba(0,20,45,.55) !important;',
      '  justify-content:start !important;',
      '}',
      'html body #hudKaynak .kaynak-oge + .kaynak-oge{',
      '  border-top:1px solid rgba(160,215,255,.18) !important;',
      '}',
      'html body #hudKaynak .kaynak-ikon{',
      '  flex:0 0 22px !important; width:22px; height:22px;',
      '  display:flex !important; align-items:center; justify-content:center;',
      '  font-size:16px !important;',
      '}',
      'html body #hudKaynak .kaynak-ikon img.kay-gorsel{ width:20px !important; height:20px !important; }',
      /* Ad + üretim alt alta; ikinci satır yardımcı etiket ölçüsünde */
      'html body #hudKaynak .kh-ad{ display:block; }',
      'html body #hudKaynak .kh-uretim{',
      '  display:block; font-weight:700; font-size:11px; color:#e8f4ff; opacity:.78;',
      '  font-variant-numeric:tabular-nums;',
      '}',
      'html body #hudKaynak .kaynak-oge > [id^=kay]{',
      '  justify-self:end; font-variant-numeric:tabular-nums; font-size:14px;',
      '}',

      /* Üst satırdaki tek düğme */
      'html body #kaynakPill{',
      '  display:flex !important; align-items:center !important; gap:5px !important;',
      '  pointer-events:auto !important; cursor:pointer;',
      '  min-width:74px; justify-content:center !important;',
      '  overflow:hidden;',
      '}',
      'html body #kaynakPill .kh-p-ikon{',
      '  flex:0 0 18px; width:18px; height:18px;',
      '  display:flex; align-items:center; justify-content:center; font-size:15px;',
      '}',
      'html body #kaynakPill .kh-p-ikon img{ width:17px; height:17px; object-fit:contain; display:block; background:none; }',
      'html body #kaynakPill .kh-p-deger{ font-variant-numeric:tabular-nums; }',
      'html body #kaynakPill:active{ transform:scale(.96); filter:brightness(.93); }',

      /* Kullanıcı ADI kalktı — düğmenin kendisi (çıkış + füze
         rozetinin bağlandığı yer) duruyor, yalnız yazı gizli. */
      'html body .hud-top .user-pill #currentUserLabel{ display:none !important; }'
    ].join("\n");
    document.head.appendChild(st);
  }

  /* ── 2) ÜRETİM/DK ────────────────────────────────────────────
     Tek doğruluk kaynağı: uretim.js HIZ × INSAAT.uretimCarpani().
     İkisinden biri yoksa sayı UYDURULMAZ, "—" yazılır. */
  function uretimDk(anahtar) {
    var U = window.URETIM;
    if (!U || !U.HIZ || typeof U.HIZ[anahtar] !== "number") return null;
    var taban = U.HIZ[anahtar];
    try {
      if (window.INSAAT && typeof window.INSAAT.uretimCarpani === "function") {
        var c = window.INSAAT.uretimCarpani(anahtar);
        if (typeof c === "number" && isFinite(c) && c > 0) return taban * c;
      }
    } catch (e) {}
    return taban;
  }

  function uretimYazi(anahtar) {
    var v = uretimDk(anahtar);
    if (v === null) return "—";
    return Math.round(v).toLocaleString("tr-TR") + "/dk";
  }

  /* ── 3) SATIRLARI PANEL BİÇİMİNE GETİR ───────────────────────
     Var olan .kaynak-oge kutuları korunur; içine ad + üretim
     etiketi eklenir. Sayı <span id=kay…> olduğu yerde kalır —
     onu besleyen kodun bulduğu düğüm değişmez. */
  function satirlariHazirla() {
    KAYNAKLAR.forEach(function (k) {
      var sayi = document.getElementById(k.id);
      if (!sayi) return;
      var oge = sayi.closest(".kaynak-oge");
      if (!oge || oge.querySelector(".kh-metin")) return;

      var kutu = document.createElement("span");
      kutu.className = "kh-metin";
      kutu.innerHTML = '<span class="kh-ad"></span><span class="kh-uretim"></span>';
      kutu.querySelector(".kh-ad").textContent = k.ad;
      oge.insertBefore(kutu, sayi);              /* ikon · metin · sayı */
    });
  }

  function uretimleriTazele() {
    KAYNAKLAR.forEach(function (k) {
      var sayi = document.getElementById(k.id);
      if (!sayi) return;
      var oge = sayi.closest(".kaynak-oge");
      if (!oge) return;
      var et = oge.querySelector(".kh-uretim");
      if (et) et.textContent = uretimYazi(k.anahtar);
    });
  }

  /* ── 4) ÜST SATIRDAKİ DÜĞME ──────────────────────────────────
     .hud-pill sınıfı verilir: tema.js'in üst satır kuralları
     (renk, yazı, ayraç) olduğu gibi geçerli olur. */
  function dugmeyiKur() {
    var ust = document.querySelector(".hud-top");
    if (!ust || document.getElementById("kaynakPill")) return;
    var cikis = document.getElementById("logoutBtn");

    pill = document.createElement("div");
    pill.id = "kaynakPill";
    pill.className = "hud-pill";
    pill.setAttribute("role", "button");
    pill.innerHTML = '<span class="kh-p-ikon"></span><span class="kh-p-deger">0</span>';
    if (cikis && cikis.parentNode === ust) ust.insertBefore(pill, cikis);
    else ust.appendChild(pill);

    pIkon  = pill.querySelector(".kh-p-ikon");
    pDeger = pill.querySelector(".kh-p-deger");

    pill.addEventListener("click", function (e) {
      e.stopPropagation();
      acik ? kapat() : ac();
    });
  }

  /* Düğmenin yüzü: ikon şeridin kendi kutusundan KOPYALANIR
     (webp mi emoji mi olduğunu tema.js belirler), sayı da satırın
     kendi yazısından okunur — ikinci biçimlendirme yok. */
  function yuzuYaz(indeks, animasyonlu) {
    if (!pill) return;
    var k = KAYNAKLAR[indeks];
    var sayi = document.getElementById(k.id);
    if (!sayi) return;
    var oge = sayi.closest(".kaynak-oge");
    var kaynakIkon = oge ? oge.querySelector(".kaynak-ikon") : null;

    function bas() {
      pIkon.textContent = "";
      if (kaynakIkon) {
        var im = kaynakIkon.querySelector("img.kay-gorsel");
        if (im) {
          var kopya = document.createElement("img");
          kopya.src = im.getAttribute("src");
          kopya.alt = "";
          pIkon.appendChild(kopya);
        } else {
          pIkon.textContent = kaynakIkon.textContent;
        }
      }
      pDeger.textContent = sayi.textContent;
    }

    if (!animasyonlu || !pill.animate) { bas(); return; }
    var cik = pill.animate(
      [{ opacity: 1, transform: "translateY(0)" },
       { opacity: 0, transform: "translateY(-6px)" }],
      { duration: 170, easing: "cubic-bezier(.4,0,.9,.3)" }
    );
    cik.onfinish = function () {
      bas();
      pill.animate(
        [{ opacity: 0, transform: "translateY(7px)" },
         { opacity: 1, transform: "translateY(0)" }],
        { duration: 240, easing: "cubic-bezier(.16,1,.3,1)" }
      );
    };
  }

  function degeriTazele() {
    if (!pill) return;
    var sayi = document.getElementById(KAYNAKLAR[sira].id);
    if (sayi && pDeger.textContent !== sayi.textContent) {
      pDeger.textContent = sayi.textContent;
    }
  }

  /* ── 5) PANELİ AÇ / KAPAT ────────────────────────────────────── */
  function konumla() {
    if (!panel || !pill) return;
    var r = pill.getBoundingClientRect();
    var g = panel.offsetWidth || 214;              /* fixed → offsetWidth */
    var sol = r.left + r.width / 2 - g / 2;
    sol = Math.max(8, Math.min(sol, window.innerWidth - g - 8));
    panel.style.left = Math.round(sol) + "px";
    panel.style.top  = Math.round(r.bottom + 8) + "px";
  }

  function ac() {
    if (!panel || acik) return;
    uretimleriTazele();
    panel.classList.add("kh-acik");
    acik = true;
    konumla();
    /* Hayalet tıklama: ilk anda altındaki bir şeye basılmasın */
    panel.style.pointerEvents = "none";
    setTimeout(function () { if (panel) panel.style.pointerEvents = ""; }, HAYALET_MS);
    if (panel.animate) {
      panel.animate(
        [{ opacity: 0, transform: "translateY(-8px) scale(.96)" },
         { opacity: 1, transform: "translateY(0) scale(1)" }],
        { duration: 260, easing: "cubic-bezier(.16,1,.3,1)" }
      );
    }
    document.addEventListener("pointerdown", disaTikla, true);
  }

  function kapat() {
    if (!panel || !acik) return;
    acik = false;
    document.removeEventListener("pointerdown", disaTikla, true);
    function bitir() { if (!acik && panel) panel.classList.remove("kh-acik"); }
    if (panel.animate) {
      var a = panel.animate(
        [{ opacity: 1, transform: "translateY(0) scale(1)" },
         { opacity: 0, transform: "translateY(-8px) scale(.96)" }],
        { duration: 160, easing: "cubic-bezier(.4,0,.9,.3)" }
      );
      a.onfinish = bitir;
    } else bitir();
  }

  function disaTikla(e) {
    if (!acik) return;
    if (panel.contains(e.target) || (pill && pill.contains(e.target))) return;
    kapat();
  }

  /* ── 6) BAŞLAT ───────────────────────────────────────────────── */
  function baslat() {
    panel = document.getElementById("hudKaynak");
    if (!panel) return;                 /* şerit yoksa sessiz yol açma */
    stilBas();
    satirlariHazirla();
    uretimleriTazele();
    dugmeyiKur();
    yuzuYaz(sira, false);

    setInterval(function () {
      if (document.hidden) return;      /* arka planda dönme */
      sira = (sira + 1) % KAYNAKLAR.length;
      yuzuYaz(sira, true);
    }, DONGU_MS);

    setInterval(function () {
      degeriTazele();
      if (acik) { uretimleriTazele(); konumla(); }
    }, TAZELE_MS);

    window.addEventListener("resize", function () { if (acik) konumla(); });

    /* tema.js ikonları 600/1800/4000 ms'de basıyor — o sırada
       düğmedeki emoji görsele dönsün. */
    [800, 2000, 4200].forEach(function (ms) {
      setTimeout(function () { yuzuYaz(sira, false); }, ms);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", baslat);
  } else {
    baslat();
  }

  window.KAYNAK_HUD = {
    SURUM: SURUM,
    ac: ac, kapat: kapat,
    tani: function () {
      return {
        surum: SURUM,
        panelVar: !!document.getElementById("hudKaynak"),
        dugmeVar: !!document.getElementById("kaynakPill"),
        sira: KAYNAKLAR[sira].id,
        uretim: KAYNAKLAR.reduce(function (o, k) {
          o[k.anahtar] = uretimYazi(k.anahtar); return o;
        }, {})
      };
    }
  };
})();
