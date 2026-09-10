/* guchud.js — ÜST MENÜ GÜÇ PUANI SATIRI
   ═══════════════════════════════════════════════════════════════
   NE YAPAR
   Üst menüye (.hud-top) İKİNCİ SATIR ekler: ✊ + toplam güç puanı.
   Referans oyundaki gibi veriler yukarı kayar, altta güç satırı
   açılır. Satır tam genişlik kaplar; menü gövdesi tektir — güç
   satırının kendi zemini, çerçevesi, ayracı YOKTUR.

   ÜST SATIR NASIL YUKARI ÇIKIYOR (kök çözüm)
   tema.js bölüm 15 `.hud-top`u `flex-wrap:wrap` + `align-content:
   center` yapıyor; #hudKaynak zaten `flex:0 0 100%` ile ikinci
   satır olarak tasarlanmış (kaynakhud.js onu panele çevirdiği için
   şu an boş duruyor). Yani ikinci satır ALTYAPISI HAZIR:
   menünün boyunu büyütüp tam genişlik bir kutu eklemek yetiyor —
   `align-content:center` iki satırı BLOK olarak ortaladığı için
   üst satır kendiliğinden yukarı kayıyor. Elle `padding-top`
   oynanmıyor; oynansaydı ?menu=1 panelindeki "Üst boşluk" sürgüsü
   bozulurdu.

   ÖLÇÜLER TEMA DEĞİŞKENLERİNİ EZMİYOR
   Menü boyu artık `calc(var(--hud-h) + var(--guc-h))`. --hud-h'e
   dokunulmaz; ?menu=1 paneli aynen çalışır, güç satırının payı
   ayrı bir değişkende (--guc-h) durur.

   ── NEDEN SEÇİCİLER `html body #worldScreen` İLE BAŞLIYOR ──
   tema.js `html body .hud-top{...!important}` yazıyor (ağırlık
   0,1,2). Buradaki #worldScreen öneki ağırlığı 1,1,2 yapar; dosya
   sırası ne olursa olsun boy kuralı kazanır. Kaldırma.

   GÜÇ DEĞERİ
   Tek kaynaktan: index.html -> computePlayerPower(state). Burada
   İKİNCİ BİR HESAP YOK — birlik/kahraman/bina gücü değişince bu
   satır kendiliğinden doğru olur.

   HAREKET
   Değer artınca sayı sayarak yükselir + hafif nabız atar. Web
   Animations ile yazıldı; CSS keyframe yok (prefers-reduced-motion
   hepsini öldürürdü, oysa burada hareket bilgi taşıyor).

   İNCE AYAR: adresin sonuna  ?guc=1  ekle → sürgülü panel açılır.
   KAYDET dedikten sonra ?guc=1 olmadan da geçerli olur.
   ═══════════════════════════════════════════════════════════════ */
(function gucHud() {
  "use strict";

  var SURUM = "guchud-1";

  /* İkon: webp koymak istersen dosya adını yaz (örn "guc.webp"),
     boş bırakılırsa emoji kullanılır. Tek yer burası. */
  var IKON_GORSEL = "";
  var IKON_EMOJI  = "✊";      /* ✊ */

  var TAZELE_MS  = 1000;           /* güç kaç ms'de bir okunur */
  var SAYIM_MS   = 620;            /* artışta sayma süresi */

  var satir = null, ikonEl = null, degerEl = null;
  var sonDeger = null;             /* ekranda yazan sayı */
  var sayimIptal = null;

  /* ── 0) AYAR DEĞİŞKENLERİ ────────────────────────────────────
     [değişken, etiket, en az, en çok, adım, birim, varsayılan] */
  var ALANLAR = [
    ["--guc-buyume","Menü uzaması",    0,  46, 0.5,  "px", 15],
    ["--guc-h",   "Güç satırı boyu",   0,  46, 0.5,  "px", 19],
    ["--guc-ust", "Üst satır kayması",-14, 14, 0.5,  "px", 0],
    ["--guc-f",   "Güç yazı boyu",     8,  26, 0.25, "px", 14],
    ["--guc-ik",  "Güç ikon boyu",     8,  28, 0.25, "px", 15],
    ["--guc-sol", "Soldan boşluk",     0,  40, 0.5,  "px", 10],
    ["--guc-ara", "İkon–yazı arası",   0,  16, 0.5,  "px", 5],
    ["--guc-kay", "Güç satırı kayması",-14,14, 0.5,  "px", 0]
  ];
  var ANAHTAR = "hudGucAyar";

  function varsayilan() {
    var o = {};
    ALANLAR.forEach(function (a) { o[a[0]] = a[6]; });
    return o;
  }
  function ayarOku() {
    try {
      var ham = localStorage.getItem(ANAHTAR);
      if (!ham) return varsayilan();
      return Object.assign(varsayilan(), JSON.parse(ham));
    } catch (e) { return varsayilan(); }
  }
  function ayarYaz(s) {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(s)); return true; }
    catch (e) { return false; }
  }
  function ayarUygula(s) {
    var kok = document.documentElement;
    ALANLAR.forEach(function (a) {
      var v = (s[a[0]] != null) ? s[a[0]] : a[6];
      kok.style.setProperty(a[0], v + a[5]);
    });
  }

  var AYAR = ayarOku();
  ayarUygula(AYAR);

  /* ── 1) STİL ─────────────────────────────────────────────────── */
  function stilKur() {
    if (document.getElementById("temaGucSatir")) return;
    var st = document.createElement("style");
    st.id = "temaGucSatir";
    st.textContent = [
      /* Menü boyu: tema boyu + UZAMA payı. --hud-h'e dokunulmaz.
         DİKKAT — uzama, güç satırı boyundan KASITLI OLARAK KÜÇÜK:
         .hud-top `align-content:center` olduğu için iki satır blok
         hâlinde ortalanır; gövde satırların ihtiyacından az uzayınca
         blok yukarı kayar ve ÜST SATIR KENDİLİĞİNDEN YUKARI ÇIKAR —
         istenen "veriler bir tık yukarı" davranışı budur. Uzamayı
         güç satırı boyuna eşitlersen menü sadece AŞAĞI doğru büyür,
         üst satır yerinde kalır. */
      "html body #worldScreen .hud-top{",
      "  height:calc(var(--hud-h, 48px) + var(--guc-buyume, 15px)",
      "              + env(safe-area-inset-top,0)) !important;",
      "}",

      /* Üst satırın ek nüansı: yalnız GÖRSEL kaydırma (yerleşim
         değişmez), yukarıdaki otomatik kaymanın üstüne ince ayar. */
      "html body #worldScreen .hud-top > *:not(#hudGucSatir):not(#hudKaynak){",
      "  transform:translateY(var(--guc-ust, 0px)) !important;",
      "}",

      /* Güç satırı: tam genişlik, kendi zemini yok — menü tek gövde. */
      "html body #worldScreen .hud-top > #hudGucSatir{",
      "  flex:0 0 100% !important;",
      "  order:8 !important;",           /* #hudKaynak order:9 → onun üstünde */
      "  box-sizing:border-box !important;",
      "  display:flex !important;",
      "  align-items:center !important;",
      "  justify-content:flex-start !important;",
      "  gap:var(--guc-ara, 5px) !important;",
      "  height:var(--guc-h, 20px) !important;",
      "  min-height:0 !important;",
      "  margin:0 !important;",
      "  padding:0 var(--hud-px, 1.5px) 0",
      "          calc(var(--hud-px, 1.5px) + var(--guc-sol, 10px)) !important;",
      "  transform:translateY(var(--guc-kay, 0px)) !important;",
      "  background:none !important;",
      "  border:none !important;",
      "  box-shadow:none !important;",
      "  pointer-events:none !important;",
      "  overflow:hidden !important;",
      "}",
      "html body #worldScreen .hud-top > #hudGucSatir::before,",
      "html body #worldScreen .hud-top > #hudGucSatir::after{ content:none !important; }",

      /* İkon ve sayı: üst satırla AYNI yazı ailesi ve gölgesi. */
      "html body #worldScreen .hud-top #hudGucIkon{",
      "  display:flex !important; align-items:center !important;",
      "  font-size:var(--guc-ik, 15px) !important;",
      "  line-height:var(--hud-lh, 1.45) !important;",
      "  filter:drop-shadow(0 1px 1px rgba(0,12,32,.7)) !important;",
      "}",
      "html body #worldScreen .hud-top #hudGucIkon img{",
      "  width:var(--guc-ik, 15px) !important;",
      "  height:var(--guc-ik, 15px) !important;",
      "  object-fit:contain !important; display:block !important;",
      "  background:none !important;",
      "}",
      "html body #worldScreen .hud-top #hudGucDegerHud{",
      "  font-family:'Baloo 2','Nunito',sans-serif !important;",
      "  font-size:var(--guc-f, 14px) !important;",
      "  font-weight:var(--hud-fw, 900) !important;",
      "  line-height:var(--hud-lh, 1.45) !important;",
      "  letter-spacing:.2px !important;",
      "  color:#f2fbff !important;",
      "  text-shadow:0 1px 2px rgba(0,12,32,.85) !important;",
      "  font-variant-numeric:tabular-nums !important;",
      "  white-space:nowrap !important;",
      "}"
    ].join("\n");
    document.head.appendChild(st);
  }

  /* ── 2) SAYI BİÇİMİ ──────────────────────────────────────────
     Referanstaki gibi ayraçlı tam sayı (106.856). Çok büyürse
     M/B'ye düşer ki satır taşmasın. */
  function bicim(n) {
    n = Number(n) || 0;
    if (n < 1e7) return Math.round(n).toLocaleString("tr-TR");
    if (n < 1e9) return (n / 1e6).toFixed(1).replace(".", ",") + "M";
    return (n / 1e9).toFixed(1).replace(".", ",") + "B";
  }

  function durum() {
    try { return (typeof state !== "undefined" && state) ? state : null; }
    catch (e) { return null; }
  }
  function gucOku() {
    try {
      if (typeof computePlayerPower === "function") {
        return computePlayerPower(durum()) || 0;
      }
    } catch (e) {}
    return 0;
  }

  /* ── 3) SATIRI KUR ───────────────────────────────────────────── */
  function satirKur() {
    var ust = document.querySelector("#worldScreen .hud-top");
    if (!ust) return;

    var v = document.getElementById("hudGucSatir");
    if (v) {                                  /* yeniden çizildiyse geri koy */
      if (v.parentElement !== ust) ust.appendChild(v);
      satir = v;
      ikonEl = document.getElementById("hudGucIkon");
      degerEl = document.getElementById("hudGucDegerHud");
      return;
    }

    satir = document.createElement("div");
    satir.id = "hudGucSatir";
    satir.innerHTML = '<span id="hudGucIkon"></span>' +
                      '<span id="hudGucDegerHud">0</span>';
    ust.appendChild(satir);

    ikonEl  = satir.querySelector("#hudGucIkon");
    degerEl = satir.querySelector("#hudGucDegerHud");

    if (IKON_GORSEL) {
      var im = document.createElement("img");
      im.src = IKON_GORSEL;
      im.alt = "";
      im.onerror = function () {
        im.remove();
        ikonEl.textContent = IKON_EMOJI;
      };
      ikonEl.appendChild(im);
    } else {
      ikonEl.textContent = IKON_EMOJI;
    }

    sonDeger = null;
    tazele(false);
  }

  /* ── 4) DEĞERİ TAZELE + HAREKET ──────────────────────────────── */
  function yaz(n) {
    if (degerEl) degerEl.textContent = bicim(n);
  }

  function nabiz() {
    if (!degerEl || !degerEl.animate) return;
    degerEl.animate(
      [{ transform: "scale(1)" },
       { transform: "scale(1.16)" },
       { transform: "scale(1)" }],
      { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" }
    );
  }

  /* Sayı sayarak yükselir. Süre bitene kadar her karede yazılır;
     yeni artış gelirse öncekini iptal eder (üst üste binmesin). */
  function say(bas, son) {
    if (sayimIptal) { sayimIptal(); sayimIptal = null; }
    if (!window.requestAnimationFrame || bas === son) { yaz(son); return; }

    var t0 = 0, durduruldu = false, kimlik = 0;
    sayimIptal = function () { durduruldu = true; cancelAnimationFrame(kimlik); };

    function adim(t) {
      if (durduruldu) return;
      if (!t0) t0 = t;
      var o = Math.min(1, (t - t0) / SAYIM_MS);
      var e = 1 - Math.pow(1 - o, 3);              /* easeOutCubic */
      yaz(bas + (son - bas) * e);
      if (o < 1) kimlik = requestAnimationFrame(adim);
      else { sayimIptal = null; yaz(son); }
    }
    kimlik = requestAnimationFrame(adim);
  }

  function tazele(animasyonlu) {
    if (!degerEl) return;
    var g = gucOku();
    if (sonDeger === g) return;

    if (sonDeger === null || !animasyonlu) { yaz(g); sonDeger = g; return; }

    var eski = sonDeger;
    sonDeger = g;
    if (g > eski) { say(eski, g); nabiz(); }
    else { yaz(g); }
  }

  /* ── 5) BAŞLAT ───────────────────────────────────────────────── */
  function baslat() {
    stilKur();
    satirKur();

    setInterval(function () { tazele(true); }, TAZELE_MS);

    /* Menü yeniden çizilirse satır geri konur (aynıysa iş yapmaz). */
    var govde = document.getElementById("worldScreen") || document.body;
    if (govde && window.MutationObserver) {
      new MutationObserver(function () { satirKur(); })
        .observe(govde, { childList: true });
    }
    setTimeout(satirKur, 500);
    setTimeout(satirKur, 2000);

    if (/[?&]guc=1/.test(location.search || "")) panelKur();
  }

  /* ── 6) İNCE AYAR PANELİ (?guc=1) ────────────────────────────── */
  function panelKur() {
    if (document.getElementById("gucAyarPanel")) return;

    var st = document.createElement("style");
    st.textContent = [
      "#gucAyarPanel{position:fixed;left:6px;right:6px;bottom:6px;z-index:99999;",
      " background:#0e141c;border:1px solid #2f5f7a;border-radius:14px;color:#e8f3ff;",
      " font-family:'Baloo 2',sans-serif;font-size:13px;overflow:hidden;}",
      "#gucAyarPanel .gap-bas{display:flex;align-items:center;gap:8px;padding:7px 10px;",
      " background:#16222e;font-weight:900;font-size:14px;}",
      "#gucAyarPanel .gap-govde{padding:6px 10px 9px;max-height:46vh;overflow:auto;}",
      "#gucAyarPanel .gap-satir{display:flex;align-items:center;gap:6px;margin:5px 0;}",
      "#gucAyarPanel .gap-ad{flex:0 0 108px;font-size:12px;opacity:.9;}",
      "#gucAyarPanel input[type=range]{flex:1;min-width:0;}",
      "#gucAyarPanel .gap-dg{width:26px;height:26px;flex:0 0 26px;border-radius:8px;",
      " border:1px solid #2f5f7a;background:#16222e;color:#e8f3ff;font-size:15px;",
      " font-weight:900;line-height:1;}",
      "#gucAyarPanel .gap-dgr{flex:0 0 54px;text-align:right;font-variant-numeric:tabular-nums;}",
      "#gucAyarPanel .gap-alt{display:flex;gap:8px;padding:8px 10px;background:#16222e;}",
      "#gucAyarPanel .gap-alt button{flex:1;padding:8px;border-radius:10px;border:0;",
      " font-weight:900;font-size:13px;background:#2f7fa8;color:#fff;}",
      "#gucAyarPanel .gap-alt button.gap-sil{background:#5a2f3a;}"
    ].join("");
    document.head.appendChild(st);

    var p = document.createElement("div");
    p.id = "gucAyarPanel";
    var ic = ['<div class="gap-bas">✊ Güç satırı ayarı</div><div class="gap-govde">'];

    ALANLAR.forEach(function (a, i) {
      ic.push(
        '<div class="gap-satir">',
        '<span class="gap-ad">' + a[1] + '</span>',
        '<button class="gap-dg" data-i="' + i + '" data-y="-1">−</button>',
        '<input type="range" data-i="' + i + '" min="' + a[2] + '" max="' + a[3] +
          '" step="' + a[4] + '" value="' + AYAR[a[0]] + '">',
        '<button class="gap-dg" data-i="' + i + '" data-y="1">+</button>',
        '<span class="gap-dgr" id="gapD' + i + '">' + AYAR[a[0]] + a[5] + '</span>',
        '</div>'
      );
    });
    ic.push('</div><div class="gap-alt">',
            '<button class="gap-kaydet">KAYDET</button>',
            '<button class="gap-sil">SIFIRLA</button></div>');
    p.innerHTML = ic.join("");
    document.body.appendChild(p);

    function guncelle(i, v) {
      var a = ALANLAR[i];
      v = Math.max(a[2], Math.min(a[3], Math.round(v / a[4]) * a[4]));
      v = Math.round(v * 100) / 100;
      AYAR[a[0]] = v;
      ayarUygula(AYAR);
      var g = p.querySelector('#gapD' + i);
      if (g) g.textContent = v + a[5];
      var s = p.querySelector('input[data-i="' + i + '"]');
      if (s && Number(s.value) !== v) s.value = v;
    }

    p.addEventListener("input", function (e) {
      var s = e.target;
      if (s.tagName === "INPUT") guncelle(Number(s.dataset.i), Number(s.value));
    });
    p.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.classList.contains("gap-kaydet")) {
        ayarYaz(AYAR);
        b.textContent = "KAYDEDİLDİ";
        setTimeout(function () { b.textContent = "KAYDET"; }, 1200);
        return;
      }
      if (b.classList.contains("gap-sil")) {
        AYAR = varsayilan();
        ayarUygula(AYAR);
        ALANLAR.forEach(function (a, i) { guncelle(i, AYAR[a[0]]); });
        try { localStorage.removeItem(ANAHTAR); } catch (er) {}
        return;
      }
      if (b.dataset.i != null) {
        var i = Number(b.dataset.i);
        guncelle(i, AYAR[ALANLAR[i][0]] + Number(b.dataset.y) * ALANLAR[i][4]);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", baslat);
  } else { baslat(); }

  window.GUCHUD = { surum: SURUM, tazele: function () { tazele(true); } };
})();
