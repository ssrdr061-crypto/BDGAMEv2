/* ═══════════════════════════════════════════════════════════════════════
   egitim.js — YENİ OYUNCU REHBERLİĞİ

   ELİNDEN TUTAN eğitim: her adımda tek bir öğe vurgulanır, oyuncu
   YALNIZ ona basabilir. Adım koşulu sağlanınca zincir kendiliğinden
   ilerler.

   PARÇA A (bu dosya): motor + kaleiçi üretim zinciri
     savunucu kışlasına odak → EĞİT → sürgü 30 → ÜRET → kapat
     aynısı koruyucu ve nişancı için.
   PARÇA B/C/D'de eklenecek: kahraman alma, canavar savaşı,
   hızlandırma ve Revolia'nın kapanış paneli.

   Hedef türleri:
     dom  → seçici ile bulunan bir eleman
     kale → kaleiçi tuvalinde çizilen EĞİT düğmesi (KALEICI kapısı)

   Yükleme sırası: gelistir.js ve kaleici.js'ten SONRA.
   Test: ?egitimodul=1 → ödül penceresi · ?egitimtani=1 → tanı şeridi
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var ADET = 30;              /* her kışladan üretilecek birlik sayısı */

  /* Kışla ekranındaki gerçek öğeler (index.html unit viewer markup'ı).
     Kilitli kademelerin hayalet çubuğu dışlanır, yoksa görünmeyen
     sürgü hedef sanılıyor ve halka hiç çizilmiyordu. */
  var SURGU_SEC = "#panel-troops .unit-qty-bar:not(.kilit-hayalet) .uv-qty-slider";
  var URET_SEC  = "#panel-troops .unit-instant-btn";   /* ⚡ Anında — süreli üretim değil */

  /* ── ÖDÜL PAKETİ — değiştirilecek TEK yer ──────────────────────────── */
  var ODULLER = [
    { esya: "İntikal Hızlandırma %50", adet: 5,  gorsel: "50intikal.webp", emoji: "🌀", ad: "%50 İntikal" },
    { esya: "İntikal Hızlandırma %25", adet: 5,  gorsel: "25intikal.webp", emoji: "⚡", ad: "%25 İntikal" },
    { esya: "1 Saat Hızlandırma",      adet: 20, gorsel: "1shiz.webp",     emoji: "⏩", ad: "1 Saat Hız" },
    { parca: "mor",                    adet: 5,  gorsel: "",              emoji: "🟣", ad: "Mor Parça" }
  ];

  function S() {
    try { return (typeof state !== "undefined") ? state : null; }
    catch (e) { return null; }
  }
  function kaydet() { if (typeof persistCurrentState === "function") persistCurrentState(); }
  function toast(m) {
    if (typeof showToastForce === "function") showToastForce(m);
    else if (typeof showToast === "function") showToast(m);
  }
  function birlik(id) {
    var s = S();
    return (s && s.troops && s.troops[id]) || 0;
  }
  /* Kuyrukta bekleyenler de sayılır — ÜRET'e basınca adım geçmeli,
     eğitim süresi boyunca oyuncu bekletilmemeli. */
  function birlikVeKuyruk(id) {
    var s = S(), k = 0;
    if (s && s.trainingQueue) {
      k = s.trainingQueue.filter(function (j) { return j.unitId === id; }).length;
    }
    return birlik(id) + k;
  }
  function panelAcik(id) {
    var p = document.getElementById(id);
    return !!p && p.classList.contains("active");
  }

  /* ── TANI  (?egitimtani=1) ─────────────────────────────────────────── */
  var TANI_ACIK = location.search.indexOf("egitimtani=1") >= 0;
  function TANI(m) {
    if (!TANI_ACIK) return;
    var el = document.getElementById("egitimTani");
    if (!el) {
      el = document.createElement("div");
      el.id = "egitimTani";
      el.style.cssText = "position:fixed;left:6px;right:6px;top:6px;z-index:99999;" +
        "background:rgba(2,8,22,.9);color:#9fe6ff;font:600 11px/1.35 'Baloo 2',sans-serif;" +
        "padding:6px 8px;border-radius:8px;max-height:30vh;overflow:auto;white-space:pre-wrap;";
      document.body.appendChild(el);
    }
    el.textContent = (m + "\n" + el.textContent).slice(0, 1500);
  }

  /* ── ZİNCİR ──────────────────────────────────────────────────────────
     hazirla : adım başlarken bir kez çalışır (kamera odaklama vb.)
     hedef   : vurgulanacak ve dokunmaya izin verilen tek öğe
     tamam   : adımın bittiğini anlatan koşul                          */
  function kislaZinciri(binaId, unitId, ad) {
    return [
      {
        anahtar: binaId + "_egit",
        metin: ad + " Kışlasının EĞİT düğmesine bas.",
        hazirla: function () {
          try {
            if (window.KALEICI && window.KALEICI.egitimOdak) window.KALEICI.egitimOdak(binaId);
          } catch (e) {}
        },
        hedef: { tip: "kale" },
        tamam: function () { return panelAcik("panel-troops"); }
      },
      {
        anahtar: binaId + "_surgu",
        metin: "Sürgüyü " + ADET + "'a çek.",
        hedef: { tip: "dom", sec: SURGU_SEC },
        tamam: function () {
          var sl = gorunurOge(SURGU_SEC);
          return !!sl && (parseInt(sl.value, 10) || 0) >= ADET;
        }
      },
      {
        anahtar: binaId + "_uret",
        metin: "⚡ Anında düğmesine bas.",
        hedef: { tip: "dom", sec: URET_SEC },
        tamam: function () { return birlik(unitId) >= ADET || birlikVeKuyruk(unitId) >= ADET; }
      },
      {
        anahtar: binaId + "_kapat",
        metin: "Ekranı ✕ ile kapat.",
        hedef: { tip: "dom", sec: "#panel-troops .overlay-close" },
        tamam: function () { return !panelAcik("panel-troops"); }
      }
    ];
  }

  /* ── KAHRAMAN ZİNCİRİ ────────────────────────────────────────────────
     Alt menü → Kahraman → kart → Satın Al → ✕ , iki kahraman için.
     Ekranlar: kahramanlar.js listesi (.klist-card[data-hero]) ve
     heroes.js detayı (#hdBuyBtn / #hdClose).                          */
  function kahramanZinciri(skinId, ad) {
    var sahipMi = function () {
      var s = S();
      return !!(s && (s.ownedHeroSkins || []).indexOf(skinId) !== -1);
    };
    return [
      {
        anahtar: skinId + "_sekme",
        metin: "Alt menüden Kahraman ekranını aç.",
        hedef: { tip: "dom", sec: '.dock-btn[data-panel="hero"]' },
        tamam: function () {
          return !!gorunurOge(".klist-card[data-hero]") || !!gorunurOge("#hdBuyBtn");
        }
      },
      {
        anahtar: skinId + "_kart",
        metin: ad + " kartına dokun.",
        hedef: { tip: "dom", sec: '.klist-card[data-hero="' + skinId + '"]' },
        tamam: function () { return !!gorunurOge("#hdBuyBtn"); }
      },
      {
        anahtar: skinId + "_al",
        metin: ad + "'ı satın al.",
        hedef: { tip: "dom", sec: "#hdBuyBtn" },
        tamam: sahipMi
      },
      {
        anahtar: skinId + "_kapat",
        metin: "Kahraman ekranını ✕ ile kapat.",
        hedef: { tip: "dom", sec: "#hdClose" },
        /* Satın alınca #hdBuyBtn display:none oluyor ama DOM'da kalıyor;
           "var mı" yerine "görünür mü" bakılır. Detay kapanmadan
           adım geçmez. */
        tamam: function () {
          return !document.getElementById("hdClose") || !gorunurOge("#hdClose");
        }
      }
    ];
  }

  var ZINCIR = []
    .concat(kislaZinciri("sovalye", "knight",  "Savunucu"))
    .concat(kislaZinciri("asker",   "soldier", "Koruyucu"))
    .concat(kislaZinciri("robot",   "robot",   "Nişancı"))
    .concat(kahramanZinciri("buz_savascisi", "HALVORSEN"))
    .concat(kahramanZinciri("ates_buyucusu", "MİKİAN"))
    .concat([{
      /* Detay kapanınca kahraman LİSTESİ ekranda kalıyor; savaş
         adımına geçmeden önce o da kapatılır. */
      anahtar: "klist_kapat",
      metin: "Kahraman listesini ✕ ile kapat.",
      hedef: { tip: "dom", sec: "#klistCloseBtn" },
      tamam: function () { return !gorunurOge("#klistCloseBtn"); }
    }])
    .concat(savasZinciri());

  /* ── SAVAŞ ZİNCİRİ ───────────────────────────────────────────────────
     Kaleiçinden haritaya çık → kaleye en yakın Sv1 düğüme odaklan ve
     dokun → Saldırıya git → üç birlik sürgüsünü sonuna çek → iki
     komutanı kadroya al → SAVAŞ.                                      */
  function savasZinciri() {
    var birlikAdimi = function (unitId, ad) {
      return {
        anahtar: "sec_" + unitId,
        metin: ad + " sürgüsünü sonuna kadar çek.",
        hedef: { tip: "dom", sec: "#troopSlider_" + unitId },
        tamam: function () {
          var sl = document.getElementById("troopSlider_" + unitId);
          if (!sl) return true;              /* o birlik listede yoksa atla */
          var mx = parseInt(sl.max, 10) || 0;
          return mx > 0 && (parseInt(sl.value, 10) || 0) >= mx;
        }
      };
    };
    var komutanAdimi = function (skinId, ad, sira) {
      return [
        {
          anahtar: "kmt_" + skinId + "_yuva",
          metin: "Boş komutan yuvasına dokun.",
          hedef: { tip: "dom", sec: "#heroPicker .hpk-slot:not(.filled)" },
          tamam: function () { return !!gorunurOge(".hpk-card[data-pick]"); }
        },
        {
          anahtar: "kmt_" + skinId + "_sec",
          metin: ad + " kartını seç.",
          hedef: { tip: "dom", sec: '.hpk-card[data-pick="' + skinId + '"]' },
          tamam: function () {
            return !!document.querySelector('#heroPicker .hpk-slot.filled:nth-child(' + sira + ')') ||
                   !gorunurOge('.hpk-card[data-pick="' + skinId + '"]');
          }
        }
      ];
    };

    return [
      {
        anahtar: "haritaya_don",
        metin: "Haritaya dön.",
        hedef: { tip: "dom", sec: "#kaleiciKapat" },
        tamam: function () { return !kaleicidiMi(); }
        /* Oyuncu zaten haritadaysa koşul en baştan doğrudur,
           adım kendiliğinden geçer. */
      },
      {
        anahtar: "canavar_sec",
        ekran: "harita",
        metin: "Işıklı 1. seviye canavara dokun.",
        hazirla: function () { enYakinCanavaraOdakla(); },
        hedef: { tip: "canavar" },
        tamam: function () { return !!gorunurOge("#araziBilgiModal .abm-btn-yes, .abm-btn-kirmizi"); }
      },
      {
        anahtar: "saldiriya_git",
        ekran: "harita",
        metin: "Saldırıya git.",
        hedef: { tip: "dom", sec: ".abm-btn-kirmizi" },
        tamam: function () { return !!gorunurOge("#battleBtn"); }
      }
    ]
    .concat([birlikAdimi("knight", "Savunucu"),
             birlikAdimi("soldier", "Koruyucu"),
             birlikAdimi("robot", "Nişancı")])
    .concat(komutanAdimi("buz_savascisi", "HALVORSEN", 1))
    .concat(komutanAdimi("ates_buyucusu", "MİKİAN", 2))
    .concat([{
      anahtar: "savas",
      metin: "SAVAŞ düğmesine bas.",
      hedef: { tip: "dom", sec: "#battleBtn" },
      /* Ordu yola çıkınca HUD'da intikal satırı belirir. */
      tamam: function () {
        return !!gorunurOge(".sefer-satir") || bayrak("canavar");
      }
    }])
    .concat(hizZinciri());
  }

  /* ── HIZLANDIRMA ─────────────────────────────────────────────────────
     İntikal kutucuğuna dokun → pencerede elmaslı düğmeye bas.
     Üç kez tekrarlanır (sefer.js: 2.000 💎 / kullanım).             */
  var HIZ_TEKRAR = 3;

  function hizZinciri() {
    var adimlar = [];
    for (var i = 1; i <= HIZ_TEKRAR; i++) {
      (function (n) {
        adimlar.push({
          anahtar: "hiz_kutucuk_" + n,
          metin: "İntikal kutucuğuna dokun. (" + n + "/" + HIZ_TEKRAR + ")",
          hedef: { tip: "dom", sec: ".sefer-satir" },
          tamam: function () {
            return !!gorunurOge("#seferOnayModal .som-btn-yes") || hizSayaci() >= n;
          }
        });
        adimlar.push({
          anahtar: "hiz_bas_" + n,
          metin: "Elmasla hızlandır. (" + n + "/" + HIZ_TEKRAR + ")",
          hedef: { tip: "dom", sec: "#seferOnayModal .som-btn-yes" },
          tamam: function () { return hizSayaci() >= n; }
        });
      })(i);
    }
    return adimlar;
  }

  var TOPLAM_ADIM = ZINCIR.length;

  /* ── DURUM ───────────────────────────────────────────────────────── */
  function durum() {
    var s = S(); if (!s) return null;
    if (!s.egitim || typeof s.egitim !== "object") {
      s.egitim = { adim: 0, odulAlindi: false, kaleAcildi: false, olaylar: {} };
    }
    if (!s.egitim.olaylar) s.egitim.olaylar = {};
    return s.egitim;
  }
  function bittiMi() {
    var d = durum();
    return !!d && d.adim >= TOPLAM_ADIM;
  }
  function olay(ad) {
    var d = durum(); if (!d) return;
    if (d.olaylar[ad]) return;
    d.olaylar[ad] = true;
    TANI("olay: " + ad);
    denetle();
  }

  /* Hızlandırma sayılır, tek bayrakla yetinilmez: eğitimde üç kez
     kullandırılıyor. sefer.js elmasla her hızlandırmada çağırır. */
  function hizSayaci() {
    var d = durum();
    return (d && d.olaylar && d.olaylar.hizSayi) || 0;
  }
  function hizArtir() {
    var d = durum(); if (!d) return;
    d.olaylar.hizSayi = hizSayaci() + 1;
    kaydet();
    TANI("hizlandirma #" + d.olaylar.hizSayi);
    denetle();
  }

  /* Adımın gerektirdiği elmas hesapta yoksa tamamlanır — eğitim
     boyunca hiçbir şey oyuncunun cebinden çıkmaz. */
  function elmasGaranti(n) {
    var s = S();
    if (!s || !(n > 0) || (s.diamonds || 0) >= n) return;
    s.diamonds = n;
    try { if (typeof renderDiamonds === "function") renderDiamonds(); } catch (e) {}
    try { if (typeof updateShopButtons === "function") updateShopButtons(); } catch (e) {}
    kaydet();
  }

  /* ── VURGU + YÖNERGE ────────────────────────────────────────────────
     Halka hedefin üstüne oturur, yönerge şeridi ekranın altındadır.
     İkisi de pointer-events:none — altındaki düğmeye basılabilsin
     (Tuzak 19).                                                       */
  function stilKur() {
    if (document.getElementById("egitimZincirCss")) return;
    var st = document.createElement("style");
    st.id = "egitimZincirCss";
    st.textContent = [
      "#egitimHalka{position:fixed;z-index:9995;pointer-events:none;border-radius:14px;",
      "  border:3px solid #ffd257;",
      "  box-shadow:0 0 0 4px rgba(255,210,87,.22), 0 0 18px 4px rgba(255,210,87,.45);",
      "  animation:egHalka 1.1s ease-in-out infinite;}",
      "@keyframes egHalka{0%,100%{box-shadow:0 0 0 4px rgba(255,210,87,.22),0 0 18px 4px rgba(255,210,87,.45);}",
      "  50%{box-shadow:0 0 0 10px rgba(255,210,87,.05),0 0 26px 8px rgba(255,210,87,.20);}}",
      "#egitimEl{position:fixed;z-index:9996;pointer-events:none;font-size:26px;line-height:1;",
      "  filter:drop-shadow(0 2px 4px rgba(0,20,45,.6));animation:egEl 1.2s ease-in-out infinite;}",
      "@keyframes egEl{0%,100%{transform:translate(0,0);}50%{transform:translate(0,-7px);}}",
      "#egitimSerit{position:fixed;left:8px;right:8px;bottom:74px;z-index:9991;",
      "  transition:none;}",
      "#egitimSerit.es-ust-konum{bottom:auto;top:76px;}",
      "#egitimSerit.es-alt-konum{bottom:74px;top:auto;}",
      "#egitimSerit{",
      "  display:flex;gap:10px;align-items:flex-end;pointer-events:none;",
      "  font-family:'Baloo 2','Nunito',sans-serif;}",
      "#egitimSerit .es-yuz{width:64px;flex:0 0 64px;object-fit:contain;object-position:bottom center;",
      "  filter:drop-shadow(0 6px 14px rgba(0,20,45,.55));}",
      "#egitimSerit .es-balon{flex:1 1 auto;min-width:0;padding:10px 12px;border-radius:16px;",
      "  background:linear-gradient(180deg,#3d7ccc,#152e5e);",
      "  border:1px solid rgba(190,240,255,.20);box-shadow:0 2px 6px rgba(0,20,45,.3);",
      "  color:#eaf4ff;}",
      "#egitimSerit .es-ust{display:flex;justify-content:space-between;align-items:center;gap:8px;}",
      "#egitimSerit .es-ad{font-weight:900;font-size:13px;color:#ffd257;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#egitimSerit .es-sayac{font-weight:800;font-size:11px;color:#a8c7e0;",
      "  font-variant-numeric:tabular-nums;}",
      "#egitimSerit .es-metin{font-weight:700;font-size:12.5px;line-height:1.35;margin-top:2px;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}"
    ].join("\n");
    document.head.appendChild(st);
  }

  /* Üstte bir ödül/karşılama penceresi varsa rehberlik çekilir. */
  function ustPencereVar() {
    if (document.getElementById("welcomeBack")) return true;
    if (document.getElementById("egitimOdul")) return true;
    var dr = document.getElementById("dailyRewardOverlay");
    if (dr && getComputedStyle(dr).display !== "none") return true;
    return false;
  }

  /* ── EN YAKIN 1. SEVİYE CANAVAR ──────────────────────────────────────
     Kaleye en yakın Sv1 canavar düğümü bulunur, kamera oraya
     oturtulur ve halka onun ekran konumuna çizilir. Düğümler tuval
     üstünde çizildiği için DOM seçicisi yok; HARITA.ekranKonumu
     karo → ekran çevirisini yapıyor.                                 */
  var _canavarSlot = null;

  function enYakinCanavar() {
    var s = S();
    if (!s || !window.DUGUM || typeof window.DUGUM.haritaDugumleri !== "function") return null;
    var kale = s.castle || {};
    var kx = kale.x, ky = kale.y;
    var liste;
    try { liste = window.DUGUM.haritaDugumleri() || []; } catch (e) { return null; }

    var en = null, enUzak = Infinity;
    liste.forEach(function (d) {
      if (d.tur !== "canavar" || d.seviye !== 1) return;
      var uz = (typeof kx === "number")
        ? Math.abs(d.kx - kx) + Math.abs(d.ky - ky)
        : 0;
      if (uz < enUzak) { enUzak = uz; en = d; }
    });
    return en;
  }

  /* DUGUM karo koordinatı verir (0–141); HARITA.merkezle ve
     ekranKonumu ise grid bekler (0–30). Çeviri ORAN ile yapılır —
     yapılmazsa kamera haritanın 4.7 katı uzağına gidip boş yeşil
     alana oturuyor. */
  function ORAN() {
    try { return (window.HARITA && window.HARITA.ORAN) || 4.7; }
    catch (e) { return 4.7; }
  }

  function enYakinCanavaraOdakla() {
    var d = enYakinCanavar();
    if (!d) { TANI("!! Sv1 canavar bulunamadi"); return; }
    _canavarSlot = d;
    var o = ORAN();
    TANI("canavar karo " + d.kx + "," + d.ky);
    try {
      if (window.HARITA && typeof window.HARITA.merkezle === "function") {
        window.HARITA.merkezle(d.kx / o, d.ky / o);
      }
    } catch (e) { TANI("!! merkezle: " + (e && e.message)); }
  }

  function canavarKutusu() {
    var d = _canavarSlot || enYakinCanavar();
    if (!d) return null;
    _canavarSlot = d;
    try {
      var o = ORAN();
      var p = window.HARITA.ekranKonumu(d.kx / o, d.ky / o);
      if (!p) return null;
      var wrap = document.getElementById("battleMapWrap");
      var r = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0 };
      var boy = Math.max(48, (p.kareYuksekligi || 40) * 1.6);
      return { x: r.left + p.x - boy / 2, y: r.top + p.y - boy / 2, w: boy, h: boy };
    } catch (e) { return null; }
  }

  /* Hedefin ekran dikdörtgeni. Bulunamazsa null. */
  function hedefKutu(hedef) {
    if (!hedef) return null;
    if (hedef.tip === "kale") {
      try {
        return (window.KALEICI && window.KALEICI.egitDugmesiEkran)
          ? window.KALEICI.egitDugmesiEkran() : null;
      } catch (e) { return null; }
    }
    if (hedef.tip === "canavar") return canavarKutusu();
    if (hedef.tip === "dom") {
      var el = gorunurOge(hedef.sec);
      if (!el) return null;
      var r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }
    return null;
  }

  /* Birlik ekranında her birim için ayrı sürgü/düğme var; yalnız açık
     sekmedekinin ölçüsü sıfırdan büyüktür. Seçiciyle eşleşenler
     arasından EKRANDA GÖRÜNENİ döndürür — gizli olanı hedeflersek
     halka hiç çizilmez. */
  function gorunurOge(sec) {
    var liste = document.querySelectorAll(sec);
    for (var i = 0; i < liste.length; i++) {
      var r = liste[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) {
        return liste[i];
      }
    }
    return null;
  }

  var sonKaydirma = 0;
  function hedefiGorunurYap(adim) {
    if (!adim.hedef || adim.hedef.tip !== "dom") return;
    if (Date.now() - sonKaydirma < 1200) return;      /* sürekli zıplamasın */
    var el = gorunurOge(adim.hedef.sec);
    if (!el) return;
    var r = el.getBoundingClientRect();
    if (r.top >= 60 && r.bottom <= window.innerHeight - 170) return;
    sonKaydirma = Date.now();
    try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
  }

  function vurguCiz(adim) {
    stilKur();
    hedefiGorunurYap(adim);
    var kutu = hedefKutu(adim.hedef);
    var halka = document.getElementById("egitimHalka");
    var el = document.getElementById("egitimEl");

    if (!kutu) {
      if (halka) halka.style.display = "none";
      if (el) el.style.display = "none";
      return;
    }
    if (!halka) {
      halka = document.createElement("div");
      halka.id = "egitimHalka";
      document.body.appendChild(halka);
    }
    if (!el) {
      el = document.createElement("div");
      el.id = "egitimEl";
      el.textContent = "👆";
      document.body.appendChild(el);
    }
    var pay = 6;
    halka.style.display = "block";
    halka.style.left = (kutu.x - pay) + "px";
    halka.style.top = (kutu.y - pay) + "px";
    halka.style.width = (kutu.w + pay * 2) + "px";
    halka.style.height = (kutu.h + pay * 2) + "px";

    el.style.display = "block";
    el.style.left = (kutu.x + kutu.w / 2 - 13) + "px";
    el.style.top = (kutu.y + kutu.h + 6) + "px";
  }

  function seritCiz(adim, sira) {
    stilKur();
    var s = document.getElementById("egitimSerit");
    if (!s) {
      s = document.createElement("div");
      s.id = "egitimSerit";
      s.innerHTML =
        '<img class="es-yuz" src="gorsel21.webp" alt="" onerror="this.style.display=\'none\'">' +
        '<div class="es-balon">' +
          '<div class="es-ust"><div class="es-ad">Revolia</div><div class="es-sayac"></div></div>' +
          '<div class="es-metin"></div>' +
        '</div>';
      document.body.appendChild(s);
    }
    s.style.display = "flex";
    s.querySelector(".es-sayac").textContent = (sira + 1) + " / " + TOPLAM_ADIM;
    s.querySelector(".es-metin").textContent = adim.metin;

    /* Konum: bu adım için elle ayarlanmış değer varsa o kullanılır,
       yoksa hedefin üstüne binmeyecek taraf kendiliğinden seçilir. */
    var ayar = konumAyari(adim.anahtar);
    if (ayar) {
      s.classList.remove("es-ust-konum", "es-alt-konum");
      if (ayar.taraf === "ust") { s.style.top = ayar.px + "px"; s.style.bottom = "auto"; }
      else { s.style.bottom = ayar.px + "px"; s.style.top = "auto"; }
    } else {
      s.style.top = ""; s.style.bottom = "";
      /* Hangi tarafta durursa hedefin ÜSTÜNE binmiyorsa orada durur.
         Eşik yerine gerçek kesişim ölçülür: şeridin kendi yüksekliği
         hesaba katılmazsa sürgü gibi ince öğelerin önüne düşüyordu. */
      var kutu = hedefKutu(adim.hedef);
      var yuk = s.getBoundingClientRect().height || 90;
      var altta = false;
      if (kutu) {
        var altSerit = { ust: window.innerHeight - 74 - yuk, alt: window.innerHeight - 74 };
        var carpisiyor = (kutu.y + kutu.h + 8) > altSerit.ust && kutu.y < altSerit.alt;
        altta = carpisiyor;
      }
      s.classList.toggle("es-ust-konum", altta);
      s.classList.toggle("es-alt-konum", !altta);
    }
  }

  /* ── İNCE AYAR (?egitimayar=1) ───────────────────────────────────────
     Her adım için Revolia şeridinin dikey yeri elle ayarlanır.
     Değerler localStorage'da tutulur, ÇIKTI ile kopyalanıp
     KONUM tablosuna kalıcı yazılır. İş bitince bu blok silinir. */
  var AYAR_ANAHTAR = "egitimSeritKonum";

  /* Kalıcı değerler buraya yazılacak (ÇIKTI'dan yapıştır). */
  var KONUM = {
    /* ornek: "sovalye_surgu": { taraf: "ust", px: 90 } */
  };

  function ayarlariOku() {
    try { return JSON.parse(localStorage.getItem(AYAR_ANAHTAR) || "{}"); }
    catch (e) { return {}; }
  }
  function ayarlariYaz(o) {
    try { localStorage.setItem(AYAR_ANAHTAR, JSON.stringify(o)); } catch (e) {}
  }
  function konumAyari(anahtar) {
    var y = ayarlariOku();
    return y[anahtar] || KONUM[anahtar] || null;
  }

  function rehberligiGizle() {
    ["egitimHalka", "egitimEl", "egitimSerit"].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) e.style.display = "none";
    });
  }
  function rehberligiKaldir() {
    ["egitimHalka", "egitimEl", "egitimSerit"].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) e.remove();
    });
  }

  /* ── KİLİT ───────────────────────────────────────────────────────────
     Eğitim sürerken YALNIZ vurgulanan öğeye basılabilir. Dinleyici
     CAPTURE evresinde durur: öğenin kendi dinleyicisi hiç çalışmaz
     (Tuzak 16). Tuval hedefinde dokunuşun EĞİT kutusu içinde olup
     olmadığına bakılır — tuval tek eleman olduğu için seçici yetmez. */
  var kilitKuruldu = false;
  var engelSayaci = 0;

  function egitimiBitir() {
    var d = durum(); if (!d) return;
    d.adim = TOPLAM_ADIM;
    kaydet();
    rehberligiKaldir();
    var b = document.getElementById("egitimAtla");
    if (b) b.remove();
    toast("Eğitim kapatıldı.");
  }

  function atlaDugmesi() {
    if (document.getElementById("egitimAtla")) return;
    var b = document.createElement("button");
    b.id = "egitimAtla";
    b.type = "button";
    b.textContent = "Eğitimi atla";
    b.style.cssText = "position:fixed;right:8px;top:76px;z-index:9997;" +
      "background:#2fa84f;border:none;border-radius:12px;color:#fff;" +
      "font-family:'Baloo 2','Nunito',sans-serif;font-weight:900;font-size:12px;" +
      "padding:9px 12px;box-shadow:none;";
    b.addEventListener("click", function (e) { e.stopPropagation(); egitimiBitir(); }, true);
    document.body.appendChild(b);
  }

  function kilitKur() {
    if (kilitKuruldu) return;
    kilitKuruldu = true;
    ["pointerdown", "pointerup", "click", "touchstart", "mousedown"].forEach(function (tur) {
      document.addEventListener(tur, function (e) {
        var d = durum();
        if (!d || bittiMi() || ustPencereVar()) return;
        if (e.target && e.target.closest && e.target.closest("#egitimAtla")) return;
        var adim = ZINCIR[d.adim];
        if (!adim || izinliMi(adim, e)) {
          /* Doğru yere dokunuldu: halka 400 ms'lik denetimi beklemeden
             ANINDA kalksın, tıklama hissi gecikmesin. */
          if (tur === "pointerdown") {
            engelSayaci = 0;
            var hl = document.getElementById("egitimHalka");
            var elx = document.getElementById("egitimEl");
            if (hl) hl.style.display = "none";
            if (elx) elx.style.display = "none";
          }
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (tur === "pointerdown") {
          toast("Işıklı yere dokun.");
          /* Hedef bir sebeple bulunamıyorsa oyuncu kilitte kalmasın:
             arka arkaya engellenen dokunuşlardan sonra çıkış düğmesi
             belirir. */
          engelSayaci++;
          if (engelSayaci >= 4) atlaDugmesi();
        }
      }, true);
    });
  }

  function izinliMi(adim, e) {
    var h = adim.hedef;
    if (!h) return true;

    if (h.tip === "dom") {
      var el = gorunurOge(h.sec);
      if (!el) return true;                 /* hedef henüz yoksa kilitleme */
      return !!(e.target && (e.target === el || (el.contains && el.contains(e.target))));
    }
    if (h.tip === "kale" || h.tip === "canavar") {
      var k = hedefKutu(h);
      if (!k) return true;
      var pay = 14, x = e.clientX, y = e.clientY;
      if (typeof x !== "number") return true;
      return x >= k.x - pay && x <= k.x + k.w + pay &&
             y >= k.y - pay && y <= k.y + k.h + pay;
    }
    return true;
  }

  /* ── DENETİM DÖNGÜSÜ ─────────────────────────────────────────────── */
  var sonHazirlanan = -1;
  var denetimKuruldu = false;

  function kaleicidiMi() {
    var k = document.getElementById("kaleici");   /* kaleici.js katman id'si */
    return !!k && k.classList.contains("acik");
  }

  function oyunEkraniAcik() {
    var app = document.getElementById("appScreen");
    return !!app && getComputedStyle(app).display !== "none";
  }

  function denetle() {
    var d = durum();
    /* Çıkış yapıldığında ya da giriş ekranındayken denetim döngüsü
       çalışmaya devam ediyor ve şerit login ekranının üstünde asılı
       kalıyordu. Oyun ekranı kapalıysa rehberlik tamamen gizlenir. */
    if (!d || !oyunEkraniAcik()) { rehberligiGizle(); return; }
    if (bittiMi()) { rehberligiKaldir(); odulGerekiyorsaAc(); return; }
    if (ustPencereVar()) { rehberligiGizle(); return; }

    var adim = ZINCIR[d.adim];
    if (!adim) return;

    /* ── EKRAN UYUŞMASI ────────────────────────────────────────────
       Adımın geçtiği ekranla oyuncunun bulunduğu ekran farklıysa
       önce oraya götürülür. Oyun kaleiçinde açıldığı için, harita
       adımında kalmış bir oyuncu kaleiçine düşüyor ve halka boş
       zemine çiziliyordu; üstelik kilit yüzünden dışarı da
       çıkamıyordu. */
    var suanki = ZINCIR[d.adim];
    var kaleGerek = !!(suanki && suanki.hedef && suanki.hedef.tip === "kale");
    var haritaGerek = !!(suanki && suanki.ekran === "harita");

    if (kaleGerek && !kaleicidiMi()) {
      try {
        if (window.KALEICI && typeof window.KALEICI.ac === "function") window.KALEICI.ac();
      } catch (e) {}
      sonHazirlanan = -1;
      rehberligiGizle();
      return;
    }
    if (haritaGerek && kaleicidiMi()) {
      var kapatBtn = document.getElementById("kaleiciKapat");
      if (kapatBtn) kapatBtn.click();
      sonHazirlanan = -1;
      rehberligiGizle();
      return;
    }

    if (sonHazirlanan !== d.adim) {
      sonHazirlanan = d.adim;
      if (typeof adim.hazirla === "function") {
        try { adim.hazirla(); } catch (e) { TANI("!! hazirla: " + (e && e.message)); }
      }
      TANI("adim " + d.adim + " · " + adim.anahtar);
    }

    surguTavaniniKilitle();

    var bitti = false;
    try { bitti = !!adim.tamam(); } catch (e) { bitti = false; }

    if (bitti) {
      d.adim++;
      kaydet();
      TANI("tamam -> " + d.adim);
      if (bittiMi()) {
        rehberligiKaldir();
        toast("🎖️ Eğitim tamamlandı!");
        setTimeout(odulGerekiyorsaAc, 500);
      }
      return;
    }

    seritCiz(adim, d.adim);
    vurguCiz(adim);
  }

  /* ── SÜRGÜ TAVANI ────────────────────────────────────────────────────
     Kaynak bol olduğu için sürgü 30'u aşabiliyordu. Eğitim sürerken
     görünür sürgünün max değeri ADET'e sabitlenir: oyuncu sonuna
     kadar çekse bile tam 30'da durur. Eğitim bitince troops.js bir
     sonraki çizimde kendi tavanını geri yazar. */
  function surguTavaniniKilitle() {
    if (bittiMi()) return;
    var sl = gorunurOge(SURGU_SEC);
    if (!sl) return;
    if ((parseInt(sl.max, 10) || 0) !== ADET) sl.max = String(ADET);
    if ((parseInt(sl.value, 10) || 0) > ADET) {
      sl.value = String(ADET);
      try { sl.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {}
    }
    /* Yanındaki sayı kutusu da aynı tavana çekilir; yoksa oyuncu
       oradan 30'un üstüne yazabiliyor. */
    var kutu = gorunurOge("#panel-troops .unit-qty-bar:not(.kilit-hayalet) .uq-input");
    if (kutu) {
      if ((parseInt(kutu.max, 10) || 0) !== ADET) kutu.max = String(ADET);
      if ((parseInt(kutu.value, 10) || 0) > ADET) {
        kutu.value = String(ADET);
        try { kutu.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {}
      }
    }
  }

  function akisiBaslat() {
    var d = durum();
    if (!d || bittiMi()) { rehberligiKaldir(); return; }
    elmasGaranti(300000);         /* zincir boyunca harcama garantisi */
    kilitKur();
    if (!denetimKuruldu) {
      denetimKuruldu = true;
      setInterval(denetle, 400);  /* vurgu kayan kamerayı takip etsin */
    }
    denetle();
  }

  /* ── ÖDÜL ────────────────────────────────────────────────────────── */
  function odulVer() {
    var s = S(), d = durum();
    if (!s || !d || d.odulAlindi) return false;
    d.odulAlindi = true;
    if (!s.inventory || typeof s.inventory !== "object") s.inventory = {};
    ODULLER.forEach(function (o) {
      if (o.esya) s.inventory[o.esya] = (s.inventory[o.esya] || 0) + o.adet;
      else if (o.parca && typeof window.parcaEkle === "function") {
        try { window.parcaEkle(o.parca, o.adet); } catch (e) {}
      }
    });
    kaydet();
    try { if (typeof renderInventory === "function") renderInventory(); } catch (e) {}
    return true;
  }

  function odulStil() {
    if (document.getElementById("egitimOdulCss")) return;
    var st = document.createElement("style");
    st.id = "egitimOdulCss";
    st.textContent = [
      "#egitimOdul{position:fixed;inset:0;z-index:9998;background:rgba(2,8,22,.78);",
      "  display:flex;align-items:center;justify-content:center;padding:16px;",
      "  font-family:'Baloo 2','Nunito',sans-serif;}",
      "#egitimOdul .eo-kutu{width:min(400px,94vw);background:linear-gradient(180deg,#3d7ccc,#152e5e);",
      "  border:1px solid rgba(190,240,255,.20);border-radius:20px;padding:18px 16px;",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3);color:#eaf4ff;}",
      "#egitimOdul .eo-baslik{font-weight:900;font-size:17px;color:#ffd257;text-align:center;",
      "  margin-bottom:4px;text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#egitimOdul .eo-alt{font-weight:700;font-size:13px;text-align:center;color:#a8c7e0;",
      "  margin-bottom:14px;}",
      "#egitimOdul .eo-izgara{display:grid;grid-template-columns:1fr 1fr;gap:10px;}",
      "#egitimOdul .eo-oge{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;",
      "  gap:6px;height:118px;padding:10px 6px;border-radius:14px;",
      "  background:rgba(255,255,255,.10);border:1px solid rgba(190,240,255,.20);}",
      "#egitimOdul .eo-gorsel{width:52px;height:52px;display:flex;align-items:center;justify-content:center;",
      "  font-size:34px;line-height:1;}",
      "#egitimOdul .eo-gorsel img{width:52px;height:52px;object-fit:contain;}",
      "#egitimOdul .eo-ad{font-weight:700;font-size:11.5px;color:#eaf4ff;text-align:center;line-height:1.2;}",
      "#egitimOdul .eo-adet{font-weight:900;font-size:14px;color:#ffd257;line-height:1;",
      "  font-variant-numeric:tabular-nums;text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#egitimOdul .eo-al{display:flex;align-items:center;justify-content:center;",
      "  width:100%;height:50px;margin-top:14px;padding:0;box-sizing:border-box;",
      "  background:#2fa84f;border:none;border-radius:14px;box-shadow:none;",
      "  font-family:'Baloo 2','Nunito',sans-serif;font-weight:900;font-size:17px;",
      "  line-height:1;color:#ffffff;cursor:pointer;text-shadow:none;",
      "  transition:transform .09s ease, filter .09s ease;}",
      "#egitimOdul .eo-al:active{transform:scale(.96);filter:brightness(.93);}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function gorselAlani(o) {
    var src = o.gorsel;
    if (!src && o.parca && typeof window.parcaGorseli === "function") {
      try { src = window.parcaGorseli(o.parca) || ""; } catch (e) { src = ""; }
    }
    if (!src) return '<div class="eo-gorsel">' + o.emoji + '</div>';
    return '<div class="eo-gorsel"><img src="' + src + '" alt="" ' +
           'onerror="this.parentNode.textContent=\'' + o.emoji + '\'"></div>';
  }

  function odulPenceresi() {
    if (document.getElementById("egitimOdul")) return;
    odulStil();
    var kutular = ODULLER.map(function (o) {
      return '<div class="eo-oge">' + gorselAlani(o) +
             '<div class="eo-ad">' + o.ad + '</div>' +
             '<div class="eo-adet">×' + o.adet + '</div></div>';
    }).join("");

    var arka = document.createElement("div");
    arka.id = "egitimOdul";
    arka.innerHTML =
      '<div class="eo-kutu">' +
        '<div class="eo-baslik">🎖️ EĞİTİM TAMAMLANDI</div>' +
        '<div class="eo-alt">Sabırla takip ettiğin için ödülün hazır.</div>' +
        '<div class="eo-izgara">' + kutular + '</div>' +
        '<button class="eo-al" type="button">ÖDÜLÜ AL</button>' +
      '</div>';
    document.body.appendChild(arka);

    arka.style.pointerEvents = "none";               /* hayalet tıklama */
    setTimeout(function () { arka.style.pointerEvents = ""; }, 350);

    arka.querySelector(".eo-al").addEventListener("click", function () {
      odulVer();
      arka.remove();
      toast("🎖️ Eğitim ödülün çantana eklendi!");
    });
  }

  function odulGerekiyorsaAc() {
    var d = durum();
    if (!d || d.odulAlindi || !bittiMi()) return;
    odulPenceresi();
  }

  /* ── YENİ KAYIT: OYUN KALEİÇİNDE BAŞLAR ──────────────────────────── */
  function kaleicindeBaslat() {
    var d = durum();
    if (!d || d.kaleAcildi) return;
    var deneme = 0, basladi = Date.now();
    (function bekle() {
      var d2 = durum();
      if (!d2 || d2.kaleAcildi) return;
      var app = document.getElementById("appScreen");
      var appAcik = app && getComputedStyle(app).display !== "none";
      var kaleVar = !!(window.KALEICI && typeof window.KALEICI.ac === "function");
      var sabirTasti = (Date.now() - basladi) > 12000;

      TANI("bekle#" + deneme + " app=" + (appAcik ? 1 : 0) +
           " ustPencere=" + (ustPencereVar() ? 1 : 0) + " KALEICI=" + (kaleVar ? 1 : 0));

      if (appAcik && kaleVar && (sabirTasti || !ustPencereVar())) {
        d2.kaleAcildi = true;
        kaydet();
        try { window.KALEICI.ac(); TANI("KALEICI.ac() calisti"); }
        catch (e) { TANI("!! KALEICI.ac: " + (e && e.message)); }
        setTimeout(akisiBaslat, 800);
        return;
      }
      if (++deneme > 600) { TANI("!! zaman asimi"); return; }
      setTimeout(bekle, 500);
    })();
  }

  /* Eski hesaplar eğitime girmez: birliği ya da kahramanı olan hesap
     tamamlanmış sayılır ve ödülü almaz. */
  /* Kurulmuş hesap eğitime alınmaz. Kontrol adım kaydından BAĞIMSIZ
     yapılır: önceden yarım kalmış bir eğitim kaydı yüzünden eski
     hesaplar kilitli kalıyordu. Ölçüt "oyuna başlamış olmak":
     savaş geçmişi, ordu ya da kahraman. */
  function kurulmusHesapMi(s) {
    if (!s) return false;
    if ((s.maxFrontierLevel || 0) > 0) return true;
    if (Array.isArray(s.ownedHeroSkins) && s.ownedHeroSkins.length > 0) return true;
    var t = s.troops || {};
    var toplam = (t.knight || 0) + (t.soldier || 0) + (t.robot || 0);
    if (toplam >= 90) return true;          /* eğitimin verdiği 3×30 */
    if ((s.chestsOpened || 0) > 0) return true;
    return false;
  }

  function eskiHesabiIsaretle() {
    var s = S(), d = durum();
    if (!s || !d || bittiMi()) return;
    if (!kurulmusHesapMi(s)) return;
    TANI("kurulmus hesap -> egitim atlandi");
    d.adim = TOPLAM_ADIM;
    if (!d.odulAlindi) d.odulAlindi = true;   /* geçmiş hesap ödül almaz */
    d.kaleAcildi = true;
    kaydet();
    rehberligiKaldir();
  }

  function girisSonrasi() {
    /* Hesap değişti: önceki oturumdan kalan adım imleci temizlenir,
       yoksa yeni hesapta hazirla() hiç çalışmıyordu. */
    sonHazirlanan = -1;
    rehberligiKaldir();
    var d = durum();
    if (!d) { TANI("!! state yok"); return; }
    TANI("giris adim=" + d.adim + " kaleAcildi=" + (d.kaleAcildi ? 1 : 0));
    if (bittiMi()) { setTimeout(odulGerekiyorsaAc, 1000); return; }
    /* Kaleiçini artık index.html giriş akışı açıyor (herkes için).
       Burada yalnız rehberlik akışı başlatılır. */
    d.kaleAcildi = true;
    setTimeout(akisiBaslat, 1400);
  }

  /* ── AYAR PANELİ ─────────────────────────────────────────────────── */
  function ayarPaneli() {
    if (document.getElementById("egitimAyar")) return;

    var st = document.createElement("style");
    st.textContent = [
      "#egitimAyar{position:fixed;right:6px;z-index:99997;width:170px;",
      "  background:rgba(2,8,22,.92);border:1px solid rgba(190,240,255,.20);",
      "  border-radius:10px;padding:7px;color:#eaf4ff;",
      "  font-family:'Baloo 2','Nunito',sans-serif;font-size:11px;}",
      "#egitimAyar.ea-ust{top:6px;bottom:auto;}",
      "#egitimAyar.ea-alt{bottom:6px;top:auto;}",
      "#egitimAyar.ea-mini .ea-govde{display:none;}",
      "#egitimAyar .ea-bas{display:flex;justify-content:space-between;align-items:center;gap:4px;}",
      "#egitimAyar .ea-ad{font-weight:900;color:#ffd257;font-size:11px;",
      "  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      "#egitimAyar .ea-sr{display:flex;gap:4px;margin-top:5px;}",
      "#egitimAyar button{flex:1 1 0;background:rgba(255,255,255,.12);color:#eaf4ff;",
      "  border:1px solid rgba(190,240,255,.20);border-radius:7px;padding:5px 0;",
      "  font-family:'Baloo 2','Nunito',sans-serif;font-weight:800;font-size:11px;cursor:pointer;}",
      "#egitimAyar button:active{filter:brightness(.9);}",
      "#egitimAyar .ea-deger{text-align:center;font-weight:900;color:#9fe6ff;margin-top:4px;",
      "  font-variant-numeric:tabular-nums;}"
    ].join("\n");
    document.head.appendChild(st);

    var p = document.createElement("div");
    p.id = "egitimAyar";
    p.className = "ea-alt";
    p.innerHTML =
      '<div class="ea-bas">' +
        '<div class="ea-ad">—</div>' +
        '<button style="flex:0 0 26px" data-k="mini">▤</button>' +
        '<button style="flex:0 0 26px" data-k="panel">⇅</button>' +
      '</div>' +
      '<div class="ea-govde">' +
        '<div class="ea-deger">—</div>' +
        '<div class="ea-sr"><button data-k="ust">ÜSTE</button><button data-k="alt">ALTA</button></div>' +
        '<div class="ea-sr"><button data-k="yukari">▲ 5</button><button data-k="asagi">▼ 5</button></div>' +
        '<div class="ea-sr"><button data-k="sifirla">SIFIRLA</button><button data-k="cikti">ÇIKTI</button></div>' +
      '</div>';
    document.body.appendChild(p);

    function suankiAnahtar() {
      var d = durum();
      var a = d && ZINCIR[d.adim];
      return a ? a.anahtar : null;
    }

    function tazele() {
      var an = suankiAnahtar();
      p.querySelector(".ea-ad").textContent = an || "—";
      var v = an ? konumAyari(an) : null;
      p.querySelector(".ea-deger").textContent =
        v ? (v.taraf === "ust" ? "üst " : "alt ") + v.px + "px" : "otomatik";
    }

    function yaz(taraf, px) {
      var an = suankiAnahtar();
      if (!an) return;
      var y = ayarlariOku();
      y[an] = { taraf: taraf, px: px };
      ayarlariYaz(y);
      sonHazirlanan = sonHazirlanan;   /* adım değişmiyor, sadece çizim */
      denetle();
      tazele();
    }

    p.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      var k = b.dataset.k;
      var an = suankiAnahtar();
      var v = an ? konumAyari(an) : null;
      var taraf = v ? v.taraf : "alt";
      var px = v ? v.px : 74;

      if (k === "mini")   { p.classList.toggle("ea-mini"); return; }
      if (k === "panel")  { p.classList.toggle("ea-ust"); p.classList.toggle("ea-alt"); return; }
      if (k === "ust")    { yaz("ust", 76); return; }
      if (k === "alt")    { yaz("alt", 74); return; }
      if (k === "yukari") { yaz(taraf, taraf === "ust" ? px - 5 : px + 5); return; }
      if (k === "asagi")  { yaz(taraf, taraf === "ust" ? px + 5 : px - 5); return; }
      if (k === "sifirla") {
        if (an) { var y = ayarlariOku(); delete y[an]; ayarlariYaz(y); denetle(); tazele(); }
        return;
      }
      if (k === "cikti") {
        var metin = JSON.stringify(ayarlariOku(), null, 2);
        try {
          navigator.clipboard.writeText(metin);
          toast("Değerler kopyalandı.");
        } catch (er) {
          prompt("Kopyala:", metin);
        }
        return;
      }
    });

    setInterval(tazele, 600);
    tazele();
  }

  if (location.search.indexOf("egitimayar=1") >= 0) {
    setTimeout(ayarPaneli, 1200);
  }

  window.EGITIM = {
    ADET: ADET,
    TOPLAM_ADIM: TOPLAM_ADIM,
    ZINCIR: ZINCIR,
    ODULLER: ODULLER,
    durum: durum,
    bittiMi: bittiMi,
    olay: olay,
    hizArtir: hizArtir,
    hizSayaci: hizSayaci,
    denetle: denetle,
    akisiBaslat: akisiBaslat,
    odulVer: odulVer,
    odulPenceresi: odulPenceresi,
    girisSonrasi: girisSonrasi,
    eskiHesabiIsaretle: eskiHesabiIsaretle,
    egitimiBitir: egitimiBitir,
    kaleicindeBaslat: kaleicindeBaslat
  };

  if (location.search.indexOf("egitimodul=1") >= 0) setTimeout(odulPenceresi, 600);
  /* Acil çıkış: ?egitimkapat=1 ile rehberlik tamamen kapanır. */
  if (location.search.indexOf("egitimkapat=1") >= 0) setTimeout(egitimiBitir, 1500);

  console.log("[egitim.js] Rehberlik zinciri yuklendi ✔ adim=" + TOPLAM_ADIM);
})();
