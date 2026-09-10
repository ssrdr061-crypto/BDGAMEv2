/* guchud.js — ÜST MENÜ GÜÇ SATIRI + BİRLEŞİK İNCE AYAR PANELİ
   ═══════════════════════════════════════════════════════════════
   NE YAPAR
   1) Üst menüye (.hud-top) İKİNCİ SATIR ekler: ✊ + toplam güç.
   2) Tek panelde HEM güç satırını HEM üst menü şeridinin kendisini
      ayarlar (?guc=1).

   ── KIRPMA SORUNU: İKİ AYRI KIRPICI VARDI ──
   Güç satırı boyu küçültülünce yazı alttan/üstten kesiliyordu.
   Sebep tek değil, İKİ tane:
     a) Güç satırının kendisi: sabit `height` + `overflow:hidden`.
        Kutu 4px olunca 20px'lik yazı kesiliyordu.
     b) tema.js bölüm 15: `.hud-top{ overflow:hidden !important }`.
        Satırı yukarı/aşağı kaydırınca menü gövdesinin dışına taşan
        kısım görünmez oluyordu — "görünmeyen kırpılmış alan" hissi
        tam olarak buydu.
   ÇÖZÜM: (a) satırdan overflow kalktı, `height` yerine yerleşimi
   belirleyen ölçü kaldı, yazı asla kesilmez. (b) menü kırpması
   panelden AÇ/KAPA edilebilir (--guc-kirp), varsayılan KAPALI —
   yani artık her yöne özgürce kaydırılabilir.

   ── SERBEST HİZA ──
   Yatay hiza (sol/orta/sağ) + yatay kaydırma (--guc-x) + dikey
   kaydırma (--guc-kay). Kaydırmalar `transform` ile yapılır:
   yerleşimi bozmaz, menü boyunu değiştirmez, sadece görsel yer
   değiştirir. İstediğin noktaya koyabilirsin.

   ── ÜST SATIR NEDEN YUKARI ÇIKIYOR ──
   tema.js `.hud-top`u `flex-wrap:wrap` + `align-content:center`
   yapmış. Menü, satırların ihtiyacından AZ uzatılınca (menü uzaması
   < güç satırı boyu) iki satırlık blok yukarı kayar; üst satır
   kendiliğinden yukarı çıkar. Elle padding oynanmaz — oynansaydı
   "Üst boşluk" sürgüsü bozulurdu.

   ── AYARLAR NEREYE YAZILIYOR (tema.js ile UYUM) ──
   Güç alanları  → localStorage "hudGucAyar"
   Menü alanları → localStorage "hudMenuAyar"  ← tema.js'in KENDİ
   anahtarı. Aynı yere yazıldığı için tema.js açılışta bunları
   uygular; ?menu=1 paneli de aynı değerleri gösterir. İki panel
   birbiriyle kavga etmez, ikinci bir kayıt yolu açılmaz.

   ── NEDEN SEÇİCİLER `html body #worldScreen` İLE BAŞLIYOR ──
   tema.js `html body .hud-top{...!important}` yazıyor (ağırlık
   0,1,2). #worldScreen öneki ağırlığı 1,1,2 yapar; dosya sırası ne
   olursa olsun buradaki kural kazanır. Kaldırma.

   GÜÇ DEĞERİ tek kaynaktan: computePlayerPower(state).
   ═══════════════════════════════════════════════════════════════ */
(function gucHud() {
  "use strict";

  var SURUM = "guchud-3";

  /* İkon: webp basmak istersen dosya adını yaz, boş ise emoji. */
  var IKON_GORSEL = "gucikon.webp";
  var IKON_EMOJI  = "✊";

  var TAZELE_MS = 1000;    /* güç kaç ms'de bir okunur */
  var SAYIM_MS  = 620;     /* artışta sayma süresi */

  var satir = null, ikonEl = null, degerEl = null;
  var sonDeger = null, sayimIptal = null;

  /* ── 0) AYAR ALANLARI ────────────────────────────────────────
     [değişken, etiket, en az, en çok, adım, birim, varsayılan]
     Aralıklar bilerek GENİŞ: kısıtlamak yerine serbest bırakıldı. */

  var GUC_ALAN = [
    ["--guc-buyume","Menü uzaması",      0,  60, 0.5,  "px", 16],
    ["--guc-h",     "Güç satırı boyu",   0,  60, 0.5,  "px", 17],
    ["--guc-ust",   "Üst satır kayması",-30, 30, 0.5,  "px", 0],
    ["--guc-kay",   "Güç dikey kayma",  -40, 40, 0.5,  "px", 3],
    ["--guc-x",     "Güç yatay kayma", -200,200, 1,    "px", -10],
    ["--guc-f",     "Güç yazı boyu",     6,  30, 0.25, "px", 14.25],
    ["--guc-ik",    "Güç ikon boyu",     6,  34, 0.25, "px", 22.25],
    ["--guc-ara",   "İkon–yazı arası",   0,  20, 0.5,  "px", 0]
  ];

  /* tema.js'in kendi alanları — aynı adlar, aynı birimler.
     Alt sınırlar bilerek düşürüldü (şeridi kısaltabilmek için). */
  var MENU_ALAN = [
    ["--hud-h",  "Menü yüksekliği",   18, 130, 0.5,  "px", 30.5],
    ["--hud-w",  "Menü genişliği",    40, 100, 0.5,  "%",  100],
    ["--hud-r",  "Köşe yuvarlaklığı",  0,  40, 0.5,  "px", 9.5],
    ["--hud-pt", "Üst boşluk",         0,  30, 0.5,  "px", 9],
    ["--hud-pb", "Alt boşluk",         0,  30, 0.5,  "px", 11.5],
    ["--hud-px", "Yan boşluk",         0,  40, 0.5,  "px", 0],
    ["--hud-gap","Satır arası",      -20,  24, 0.5,  "px", -4.5],
    ["--hud-ara","Öğe aralığı",        0,  24, 0.5,  "px", 1.5],
    ["--hud-f1", "Üst satır yazı",     6,  28, 0.25, "px", 13.25],
    ["--hud-f2", "Kaynak yazı",        6,  28, 0.25, "px", 12],
    ["--hud-ik", "Kaynak ikon",        6,  32, 0.25, "px", 14.5],
    ["--hud-fw", "Yazı kalınlığı",   300, 900, 100,  "",   900],
    ["--hud-lh", "Satır yüksekliği", 0.6, 2.2, 0.05, "",   1.6]
  ];

  /* Seçmeli alanlar (sürgü değil, düğme grubu). */
  var SECMELI = [
    ["--guc-hiza", "Güç hizası", [
      ["flex-start", "sol"], ["center", "orta"], ["flex-end", "sağ"]
    ], "center"],
    ["--guc-kirp", "Menü kırpması", [
      ["visible", "kapalı"], ["hidden", "açık"]
    ], "visible"]
  ];

  var GUC_KEY  = "hudGucAyar";
  var MENU_KEY = "hudMenuAyar";     /* tema.js ile ORTAK */

  function varsayilan(alanlar, secmeli) {
    var o = {};
    alanlar.forEach(function (a) { o[a[0]] = a[6]; });
    (secmeli || []).forEach(function (s) { o[s[0]] = s[3]; });
    return o;
  }
  function oku(anahtar, alanlar, secmeli) {
    var v = varsayilan(alanlar, secmeli);
    try {
      var ham = localStorage.getItem(anahtar);
      if (ham) return Object.assign(v, JSON.parse(ham));
    } catch (e) {}
    return v;
  }
  function yazAyar(anahtar, s) {
    try { localStorage.setItem(anahtar, JSON.stringify(s)); return true; }
    catch (e) { return false; }
  }
  /* Sürgüler birim ister, seçmeliler ham CSS değeri. */
  function uygulaBir(ad, deger, birim) {
    document.documentElement.style.setProperty(ad, deger + (birim || ""));
  }
  function uygulaHepsi() {
    GUC_ALAN.forEach(function (a) { uygulaBir(a[0], GUC[a[0]], a[5]); });
    MENU_ALAN.forEach(function (a) { uygulaBir(a[0], MENU[a[0]], a[5]); });
    SECMELI.forEach(function (s) { uygulaBir(s[0], GUC[s[0]], ""); });
  }

  var GUC  = oku(GUC_KEY,  GUC_ALAN, SECMELI);
  var MENU = oku(MENU_KEY, MENU_ALAN, null);
  uygulaHepsi();

  /* ── 1) STİL ─────────────────────────────────────────────────── */
  function stilKur() {
    if (document.getElementById("temaGucSatir")) return;
    var st = document.createElement("style");
    st.id = "temaGucSatir";
    st.textContent = [
      /* Menü boyu = tema boyu + UZAMA. --hud-h'e dokunulmaz.
         Kırpma artık değişkende: varsayılan visible → taşan hiçbir
         şey gizlenmez, satır her yöne serbest kaydırılabilir. */
      "html body #worldScreen .hud-top{",
      "  height:calc(var(--hud-h, 30.5px) + var(--guc-buyume, 16px)",
      "              + env(safe-area-inset-top,0)) !important;",
      "  overflow:var(--guc-kirp, visible) !important;",
      "}",

      /* Üst satır ince ayarı — yalnız görsel, yerleşim değişmez. */
      "html body #worldScreen .hud-top > *:not(#hudGucSatir):not(#hudKaynak){",
      "  transform:translateY(var(--guc-ust, 0px)) !important;",
      "}",

      /* GÜÇ SATIRI
         · overflow YOK  → yazı asla kesilmez
         · height yerleşim payıdır; yazı ondan büyükse taşar, kesilmez
         · min-width:0 + flex:0 0 100% → tam satır
         · transform ile serbest konum (yerleşimi bozmaz) */
      "html body #worldScreen .hud-top > #hudGucSatir{",
      "  flex:0 0 100% !important;",
      "  order:8 !important;",
      "  box-sizing:border-box !important;",
      "  display:flex !important;",
      "  align-items:center !important;",
      "  justify-content:var(--guc-hiza, center) !important;",
      "  gap:var(--guc-ara, 0px) !important;",
      "  height:var(--guc-h, 17px) !important;",
      "  min-height:0 !important;",
      "  margin:0 !important;",
      "  padding:0 var(--hud-px, 0px) !important;",
      "  transform:translate(var(--guc-x, -10px), var(--guc-kay, 3px)) !important;",
      "  overflow:visible !important;",
      "  background:none !important; border:none !important;",
      "  box-shadow:none !important; pointer-events:none !important;",
      "}",
      "html body #worldScreen .hud-top > #hudGucSatir::before,",
      "html body #worldScreen .hud-top > #hudGucSatir::after{ content:none !important; }",

      /* İkon + sayı: üst satırla aynı yazı ailesi ve gölge.
         line-height:1 → harf kutusu yazıdan büyük olmaz, satır boyu
         küçüldüğünde ortalama şaşmaz. */
      "html body #worldScreen .hud-top #hudGucIkon{",
      "  display:flex !important; align-items:center !important;",
      "  flex:0 0 auto !important;",
      "  font-size:var(--guc-ik, 22.25px) !important;",
      "  line-height:1 !important;",
      "  filter:drop-shadow(0 1px 1px rgba(0,12,32,.7)) !important;",
      "}",
      "html body #worldScreen .hud-top #hudGucIkon img{",
      "  width:var(--guc-ik, 22.25px) !important; height:var(--guc-ik, 22.25px) !important;",
      "  object-fit:contain !important; display:block !important; background:none !important;",
      "}",
      "html body #worldScreen .hud-top #hudGucDegerHud{",
      "  flex:0 0 auto !important;",
      "  font-family:'Baloo 2','Nunito',sans-serif !important;",
      "  font-size:var(--guc-f, 14.25px) !important;",
      "  font-weight:var(--hud-fw, 900) !important;",
      "  line-height:1 !important;",
      "  letter-spacing:.2px !important;",
      "  color:#f2fbff !important;",
      "  text-shadow:0 1px 2px rgba(0,12,32,.85) !important;",
      "  font-variant-numeric:tabular-nums !important;",
      "  white-space:nowrap !important;",
      "}"
    ].join("\n");
    document.head.appendChild(st);
  }

  /* ── 2) DEĞER ────────────────────────────────────────────────── */
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
      if (typeof computePlayerPower === "function") return computePlayerPower(durum()) || 0;
    } catch (e) {}
    return 0;
  }

  /* ── 3) SATIRI KUR ───────────────────────────────────────────── */
  function satirKur() {
    var ust = document.querySelector("#worldScreen .hud-top");
    if (!ust) return;

    var v = document.getElementById("hudGucSatir");
    if (v) {
      if (v.parentElement !== ust) ust.appendChild(v);
      satir = v;
      ikonEl = document.getElementById("hudGucIkon");
      degerEl = document.getElementById("hudGucDegerHud");
      return;
    }

    satir = document.createElement("div");
    satir.id = "hudGucSatir";
    satir.innerHTML = '<span id="hudGucIkon"></span><span id="hudGucDegerHud">0</span>';
    ust.appendChild(satir);

    ikonEl  = satir.querySelector("#hudGucIkon");
    degerEl = satir.querySelector("#hudGucDegerHud");

    if (IKON_GORSEL) {
      var im = document.createElement("img");
      im.src = IKON_GORSEL; im.alt = "";
      im.onerror = function () { im.remove(); ikonEl.textContent = IKON_EMOJI; };
      ikonEl.appendChild(im);
    } else {
      ikonEl.textContent = IKON_EMOJI;
    }
    sonDeger = null;
    tazele(false);
  }

  /* ── 4) TAZELE + HAREKET ─────────────────────────────────────── */
  function yaz(n) { if (degerEl) degerEl.textContent = bicim(n); }

  function nabiz() {
    if (!degerEl || !degerEl.animate) return;
    degerEl.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.16)" }, { transform: "scale(1)" }],
      { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" });
  }
  function say(bas, son) {
    if (sayimIptal) { sayimIptal(); sayimIptal = null; }
    if (!window.requestAnimationFrame || bas === son) { yaz(son); return; }
    var t0 = 0, dur = false, kim = 0;
    sayimIptal = function () { dur = true; cancelAnimationFrame(kim); };
    function adim(t) {
      if (dur) return;
      if (!t0) t0 = t;
      var o = Math.min(1, (t - t0) / SAYIM_MS);
      yaz(bas + (son - bas) * (1 - Math.pow(1 - o, 3)));
      if (o < 1) kim = requestAnimationFrame(adim);
      else { sayimIptal = null; yaz(son); }
    }
    kim = requestAnimationFrame(adim);
  }
  function tazele(animasyonlu) {
    if (!degerEl) return;
    var g = gucOku();
    if (sonDeger === g) return;
    if (sonDeger === null || !animasyonlu) { yaz(g); sonDeger = g; return; }
    var eski = sonDeger;
    sonDeger = g;
    if (g > eski) { say(eski, g); nabiz(); } else { yaz(g); }
  }

  /* ── 5) İNCE AYAR PANELİ (?guc=1) ─────────────────────────────
     Oyunun önünü kapatmasın diye: sekmeli (tek seferde kısa liste),
     KATLANABİLİR (başlığa dokun → sadece başlık kalır), üst/alt
     taşınabilir, yarı saydam zemin. */
  var SEKME = "guc";
  var katli = false;

  function aktifAlanlar() { return SEKME === "guc" ? GUC_ALAN : MENU_ALAN; }
  function aktifDepo()    { return SEKME === "guc" ? GUC : MENU; }

  function panelKur() {
    if (document.getElementById("gucAyarPanel")) return;

    var st = document.createElement("style");
    st.id = "gucAyarPanelStil";
    st.textContent = [
      "#gucAyarPanel{position:fixed;left:6px;right:6px;z-index:99999;",
      " background:rgba(10,16,23,.90);-webkit-backdrop-filter:blur(7px);",
      " backdrop-filter:blur(7px);border:1px solid #2f5f7a;border-radius:13px;",
      " color:#e8f3ff;font-family:'Baloo 2',sans-serif;font-size:12px;overflow:hidden;",
      " box-shadow:0 6px 22px rgba(0,0,0,.45);}",
      "#gucAyarPanel[data-yer=alt]{bottom:6px;top:auto;}",
      "#gucAyarPanel[data-yer=ust]{top:calc(env(safe-area-inset-top,0) + 6px);bottom:auto;}",

      "#gucAyarPanel .gp-bas{display:flex;align-items:center;gap:5px;padding:5px 7px;",
      " background:rgba(22,34,46,.95);}",
      "#gucAyarPanel .gp-sek{display:flex;gap:3px;flex:1;min-width:0;}",
      "#gucAyarPanel .gp-sek button{flex:1;padding:5px 4px;border:0;border-radius:8px;",
      " background:#1d2c3a;color:#9fc4dc;font-weight:900;font-size:11.5px;",
      " font-family:inherit;}",
      "#gucAyarPanel .gp-sek button.acik{background:#2f7fa8;color:#fff;}",
      "#gucAyarPanel .gp-ikon{width:27px;height:27px;flex:0 0 27px;border:0;border-radius:8px;",
      " background:#1d2c3a;color:#cfe6f5;font-size:14px;line-height:1;font-family:inherit;}",

      "#gucAyarPanel .gp-govde{padding:3px 7px 5px;max-height:34vh;overflow:auto;",
      " overscroll-behavior:contain;}",
      "#gucAyarPanel[data-katli=e] .gp-govde,",
      "#gucAyarPanel[data-katli=e] .gp-not,",
      "#gucAyarPanel[data-katli=e] .gp-alt{display:none;}",

      "#gucAyarPanel .gp-satir{display:flex;align-items:center;gap:5px;margin:3px 0;}",
      "#gucAyarPanel .gp-ad{flex:0 0 96px;font-size:11px;opacity:.88;line-height:1.15;}",
      "#gucAyarPanel input[type=range]{flex:1;min-width:0;height:22px;accent-color:#3f9fd0;}",
      "#gucAyarPanel .gp-dg{width:24px;height:24px;flex:0 0 24px;border-radius:7px;",
      " border:1px solid #2f5f7a;background:#16222e;color:#e8f3ff;font-size:14px;",
      " line-height:1;font-weight:900;font-family:inherit;padding:0;}",
      "#gucAyarPanel .gp-dgr{flex:0 0 50px;text-align:right;font-size:11px;",
      " font-variant-numeric:tabular-nums;opacity:.95;}",

      "#gucAyarPanel .gp-sec{display:flex;align-items:center;gap:5px;margin:4px 0;}",
      "#gucAyarPanel .gp-sec .gp-kut{display:flex;gap:3px;flex:1;}",
      "#gucAyarPanel .gp-sec .gp-kut button{flex:1;padding:5px 3px;border:1px solid #2f5f7a;",
      " border-radius:7px;background:#16222e;color:#9fc4dc;font-size:11px;font-weight:900;",
      " font-family:inherit;}",
      "#gucAyarPanel .gp-sec .gp-kut button.acik{background:#2f7fa8;color:#fff;border-color:#2f7fa8;}",

      "#gucAyarPanel .gp-alt{display:flex;gap:6px;padding:6px 7px;background:rgba(22,34,46,.95);}",
      "#gucAyarPanel .gp-alt button{flex:1;padding:7px;border-radius:9px;border:0;",
      " font-weight:900;font-size:12px;font-family:inherit;background:#2f7fa8;color:#fff;}",
      "#gucAyarPanel .gp-alt button.gp-sil{background:#5a2f3a;}",
      "#gucAyarPanel .gp-alt button.gp-kopya{background:#2f7a55;}",
      "#gucAyarPanel .gp-not{font-size:10.5px;opacity:.6;padding:0 7px 5px;line-height:1.3;}",
      /* Kopyalanan metin: pano çalışmazsa elle seçilebilsin diye
         GÖRÜNÜR kutuya da yazılır (mobil tarayıcıda pano izni
         reddedilebiliyor — o zaman kullanıcı basılı tutup seçer). */
      "#gucAyarPanel .gp-cikti{display:none;margin:4px 7px 6px;padding:6px;",
      " background:#0a1017;border:1px solid #2f5f7a;border-radius:8px;",
      " color:#cfe6f5;font-family:ui-monospace,Menlo,Consolas,monospace;",
      " font-size:10.5px;line-height:1.45;white-space:pre-wrap;word-break:break-all;",
      " -webkit-user-select:all;user-select:all;max-height:22vh;overflow:auto;}",
      "#gucAyarPanel[data-cikti=e] .gp-cikti{display:block;}"
    ].join("");
    document.head.appendChild(st);

    var p = document.createElement("div");
    p.id = "gucAyarPanel";
    p.setAttribute("data-yer", "alt");
    p.setAttribute("data-katli", "h");
    p.innerHTML =
      '<div class="gp-bas">' +
        '<div class="gp-sek">' +
          '<button data-sekme="guc">✊ Güç satırı</button>' +
          '<button data-sekme="menu">▤ Üst menü</button>' +
        '</div>' +
        '<button class="gp-ikon" data-is="yer" title="Üst/alt">⇕</button>' +
        '<button class="gp-ikon" data-is="katla" title="Katla">▾</button>' +
      '</div>' +
      '<div class="gp-govde" id="gpGovde"></div>' +
      '<div class="gp-not" id="gpNot"></div>' +
      '<div class="gp-cikti" id="gpCikti"></div>' +
      '<div class="gp-alt">' +
        '<button class="gp-kaydet">KAYDET</button>' +
        '<button class="gp-kopya">📋 KOPYALA</button>' +
        '<button class="gp-sil">SIFIRLA</button>' +
      '</div>';
    document.body.appendChild(p);

    ciz();

    p.addEventListener("input", function (e) {
      var s = e.target;
      if (s.tagName === "INPUT") slaytla(Number(s.dataset.i), Number(s.value));
    });

    p.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;

      if (b.dataset.sekme) { SEKME = b.dataset.sekme; ciz(); return; }

      if (b.dataset.is === "katla") {
        katli = !katli;
        p.setAttribute("data-katli", katli ? "e" : "h");
        b.textContent = katli ? "▴" : "▾";
        return;
      }
      if (b.dataset.is === "yer") {
        p.setAttribute("data-yer", p.getAttribute("data-yer") === "alt" ? "ust" : "alt");
        return;
      }
      if (b.dataset.sec != null) {
        var sc = SECMELI[Number(b.dataset.sec)];
        GUC[sc[0]] = b.dataset.deger;
        uygulaBir(sc[0], b.dataset.deger, "");
        ciz();
        return;
      }
      if (b.classList.contains("gp-kaydet")) {
        var ok = yazAyar(GUC_KEY, GUC) && yazAyar(MENU_KEY, MENU);
        b.textContent = ok ? "KAYDEDİLDİ" : "KAYDEDİLEMEDİ";
        setTimeout(function () { b.textContent = "KAYDET"; }, 1200);
        return;
      }
      if (b.classList.contains("gp-kopya")) { kopyala(b); return; }

      if (b.classList.contains("gp-sil")) {
        if (SEKME === "guc") {
          GUC = varsayilan(GUC_ALAN, SECMELI);
          try { localStorage.removeItem(GUC_KEY); } catch (er) {}
        } else {
          MENU = varsayilan(MENU_ALAN, null);
          try { localStorage.removeItem(MENU_KEY); } catch (er) {}
        }
        uygulaHepsi(); ciz();
        return;
      }
      if (b.dataset.i != null && b.dataset.y) {
        var i = Number(b.dataset.i), a = aktifAlanlar()[i];
        slaytla(i, aktifDepo()[a[0]] + Number(b.dataset.y) * a[4]);
      }
    });
  }

  /* ── AYARLARI DIŞARI VER ──────────────────────────────────────
     Ekrandaki rakamları tek tek okuyup yazmak zorunda kalmamak
     için: bütün değerler tek metne dökülür, panoya kopyalanır ve
     AYRICA görünür kutuya yazılır (pano izni verilmezse elle
     seçilebilsin). Metin doğrudan koda gömülebilecek biçimdedir. */
  function ayarMetni() {
    var s = [SURUM + " — ayarlar"];
    s.push("[GÜÇ]");
    SECMELI.forEach(function (sc) { s.push("  " + sc[0] + ": " + GUC[sc[0]]); });
    GUC_ALAN.forEach(function (a) { s.push("  " + a[0] + ": " + GUC[a[0]] + a[5]); });
    s.push("[ÜST MENÜ]");
    MENU_ALAN.forEach(function (a) { s.push("  " + a[0] + ": " + MENU[a[0]] + a[5]); });
    return s.join("\n");
  }

  function kopyala(dugme) {
    var metin = ayarMetni();
    var p = document.getElementById("gucAyarPanel");
    var kutu = document.getElementById("gpCikti");
    if (kutu) { kutu.textContent = metin; p.setAttribute("data-cikti", "e"); }

    function bitti(basarili) {
      dugme.textContent = basarili ? "✓ KOPYALANDI" : "↓ AŞAĞIDAN SEÇ";
      setTimeout(function () { dugme.textContent = "📋 KOPYALA"; }, 1600);
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(metin).then(function () { bitti(true); },
                                                  function () { bitti(false); });
        return;
      }
    } catch (e) {}
    bitti(false);
  }

  function slaytla(i, v) {
    var a = aktifAlanlar()[i], depo = aktifDepo();
    v = Math.max(a[2], Math.min(a[3], Math.round(v / a[4]) * a[4]));
    v = Math.round(v * 1000) / 1000;
    depo[a[0]] = v;
    uygulaBir(a[0], v, a[5]);
    var g = document.getElementById("gpD" + i);
    if (g) g.textContent = v + a[5];
    var s = document.querySelector('#gucAyarPanel input[data-i="' + i + '"]');
    if (s && Number(s.value) !== v) s.value = v;
  }

  function ciz() {
    var p = document.getElementById("gucAyarPanel");
    if (!p) return;

    p.querySelectorAll(".gp-sek button").forEach(function (b) {
      b.classList.toggle("acik", b.dataset.sekme === SEKME);
    });

    var alanlar = aktifAlanlar(), depo = aktifDepo(), h = [];

    if (SEKME === "guc") {
      SECMELI.forEach(function (sc, si) {
        h.push('<div class="gp-sec"><span class="gp-ad">' + sc[1] + '</span><div class="gp-kut">');
        sc[2].forEach(function (se) {
          h.push('<button data-sec="' + si + '" data-deger="' + se[0] + '"' +
                 (GUC[sc[0]] === se[0] ? ' class="acik"' : '') + '>' + se[1] + '</button>');
        });
        h.push('</div></div>');
      });
    }

    alanlar.forEach(function (a, i) {
      h.push('<div class="gp-satir">',
        '<span class="gp-ad">' + a[1] + '</span>',
        '<button class="gp-dg" data-i="' + i + '" data-y="-1">−</button>',
        '<input type="range" data-i="' + i + '" min="' + a[2] + '" max="' + a[3] +
          '" step="' + a[4] + '" value="' + depo[a[0]] + '">',
        '<button class="gp-dg" data-i="' + i + '" data-y="1">+</button>',
        '<span class="gp-dgr" id="gpD' + i + '">' + depo[a[0]] + a[5] + '</span>',
        '</div>');
    });

    document.getElementById("gpGovde").innerHTML = h.join("");
    document.getElementById("gpNot").textContent = (SEKME === "guc")
      ? '"Menü uzaması" güç satırı boyundan küçükse üst satır yukarı kayar. Kırpma kapalıyken hiçbir şey kesilmez.'
      : 'Bu sekme tema.js ile aynı kayda yazar; ?menu=1 paneli de bu değerleri gösterir.';
  }

  /* ── 6) BAŞLAT ───────────────────────────────────────────────── */
  function baslat() {
    stilKur();
    satirKur();
    setInterval(function () { tazele(true); }, TAZELE_MS);

    var govde = document.getElementById("worldScreen") || document.body;
    if (govde && window.MutationObserver) {
      new MutationObserver(function () { satirKur(); }).observe(govde, { childList: true });
    }
    setTimeout(satirKur, 500);
    setTimeout(satirKur, 2000);

    if (/[?&](guc|ayar)=1/.test(location.search || "")) panelKur();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", baslat);
  } else { baslat(); }

  window.GUCHUD = {
    surum: SURUM,
    tazele: function () { tazele(true); },
    panel:  function () { panelKur(); }      /* konsoldan da açılır */
  };
})();
