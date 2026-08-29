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
        hedef: { tip: "dom", sec: "#troopTrainSlider_" + unitId },
        tamam: function () {
          var sl = document.querySelector("#troopTrainSlider_" + unitId);
          return !!sl && (parseInt(sl.value, 10) || 0) >= ADET;
        }
      },
      {
        anahtar: binaId + "_uret",
        metin: "ÜRET düğmesine bas.",
        hedef: { tip: "dom", sec: "#" + unitId + "_btn" },
        tamam: function () { return birlikVeKuyruk(unitId) >= ADET; }
      },
      {
        anahtar: binaId + "_kapat",
        metin: "Ekranı ✕ ile kapat.",
        hedef: { tip: "dom", sec: "#panel-troops .overlay-close" },
        tamam: function () { return !panelAcik("panel-troops"); }
      }
    ];
  }

  var ZINCIR = []
    .concat(kislaZinciri("sovalye", "knight",  "Savunucu"))
    .concat(kislaZinciri("asker",   "soldier", "Koruyucu"))
    .concat(kislaZinciri("robot",   "robot",   "Nişancı"));

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

  /* Hedefin ekran dikdörtgeni. Bulunamazsa null. */
  function hedefKutu(hedef) {
    if (!hedef) return null;
    if (hedef.tip === "kale") {
      try {
        return (window.KALEICI && window.KALEICI.egitDugmesiEkran)
          ? window.KALEICI.egitDugmesiEkran() : null;
      } catch (e) { return null; }
    }
    if (hedef.tip === "dom") {
      var el = document.querySelector(hedef.sec);
      if (!el) return null;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;   /* gizli kapsayıcı: ölçü 0 */
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }
    return null;
  }

  function vurguCiz(adim) {
    stilKur();
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

    /* Şerit hedefin üstüne binerse oyuncu hedefe dokunamıyor
       (sürgü tam bu yükseklikteydi). Hedef ekranın alt yarısındaysa
       şerit yukarı taşınır. */
    var kutu = hedefKutu(adim.hedef);
    var altta = kutu ? (kutu.y + kutu.h) > (window.innerHeight * 0.55) : false;
    s.classList.toggle("es-ust-konum", altta);
    s.classList.toggle("es-alt-konum", !altta);
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
  function kilitKur() {
    if (kilitKuruldu) return;
    kilitKuruldu = true;
    ["pointerdown", "pointerup", "click", "touchstart", "mousedown"].forEach(function (tur) {
      document.addEventListener(tur, function (e) {
        var d = durum();
        if (!d || bittiMi() || ustPencereVar()) return;
        var adim = ZINCIR[d.adim];
        if (!adim || izinliMi(adim, e)) return;
        e.preventDefault();
        e.stopPropagation();
        if (tur === "pointerdown") toast("Işıklı yere dokun.");
      }, true);
    });
  }

  function izinliMi(adim, e) {
    var h = adim.hedef;
    if (!h) return true;

    if (h.tip === "dom") {
      var el = document.querySelector(h.sec);
      if (!el) return true;                 /* hedef henüz yoksa kilitleme */
      return !!(e.target && (e.target === el || (el.contains && el.contains(e.target))));
    }
    if (h.tip === "kale") {
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

  function denetle() {
    var d = durum();
    if (!d) return;
    if (bittiMi()) { rehberligiKaldir(); odulGerekiyorsaAc(); return; }
    if (ustPencereVar()) { rehberligiGizle(); return; }

    var adim = ZINCIR[d.adim];
    if (!adim) return;

    if (sonHazirlanan !== d.adim) {
      sonHazirlanan = d.adim;
      if (typeof adim.hazirla === "function") {
        try { adim.hazirla(); } catch (e) { TANI("!! hazirla: " + (e && e.message)); }
      }
      TANI("adim " + d.adim + " · " + adim.anahtar);
    }

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
  function eskiHesabiIsaretle() {
    var s = S(), d = durum();
    if (!s || !d || d.adim > 0) return;
    var birlikVar = s.troops && (s.troops.knight > 0 || s.troops.soldier > 0 || s.troops.robot > 0);
    var kahramanVar = Array.isArray(s.ownedHeroSkins) && s.ownedHeroSkins.length > 0;
    if (birlikVar || kahramanVar) {
      TANI("eski hesap -> egitim atlandi");
      d.adim = TOPLAM_ADIM;
      d.odulAlindi = true;
      d.kaleAcildi = true;
      kaydet();
    }
  }

  function girisSonrasi() {
    var d = durum();
    if (!d) { TANI("!! state yok"); return; }
    TANI("giris adim=" + d.adim + " kaleAcildi=" + (d.kaleAcildi ? 1 : 0));
    if (bittiMi()) { setTimeout(odulGerekiyorsaAc, 1000); return; }
    if (!d.kaleAcildi) kaleicindeBaslat();
    else setTimeout(akisiBaslat, 1200);
  }

  window.EGITIM = {
    ADET: ADET,
    TOPLAM_ADIM: TOPLAM_ADIM,
    ZINCIR: ZINCIR,
    ODULLER: ODULLER,
    durum: durum,
    bittiMi: bittiMi,
    olay: olay,
    denetle: denetle,
    akisiBaslat: akisiBaslat,
    odulVer: odulVer,
    odulPenceresi: odulPenceresi,
    girisSonrasi: girisSonrasi,
    eskiHesabiIsaretle: eskiHesabiIsaretle,
    kaleicindeBaslat: kaleicindeBaslat
  };

  if (location.search.indexOf("egitimodul=1") >= 0) setTimeout(odulPenceresi, 600);

  console.log("[egitim.js] Rehberlik zinciri yuklendi ✔ adim=" + TOPLAM_ADIM);
})();
