/* ═══════════════════════════════════════════════════════════════════════
   egitim.js — YENİ OYUNCU REHBERLİĞİ  (BÖLÜM 1)

   Bu bölümde olan:
     · state.egitim durumu ve kayda yazılması (index.html egt alanı)
     · ÖDÜL PENCERESİ — eğitim bitince verilen paket, kutucuklu
     · Yeni KAYIT olan oyuncu hoş geldin ödülünü aldıktan sonra
       oyuna KALEİÇİNDE başlar

   BÖLÜM 2'de gelecek: beş zorunlu adım (üretim → kahraman alma →
   kahraman ekleme → canavar saldırısı → hızlandırma) ve adımları
   kilitleyen maske.

   Yükleme sırası: gelistir.js ve kaleici.js'ten SONRA.
   Test: adres çubuğuna ?egitimodul=1 → ödül penceresi açılır.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── ÖDÜL PAKETİ — değiştirilecek TEK yer ────────────────────────────
     `esya`  → state.inventory anahtarı (magaza.js'teki ad ile BİREBİR aynı
               olmalı, yoksa çantada tanınmayan satır olarak görünür)
     `parca` → gelistir.js parça havuzu anahtarı                        */
  var ODULLER = [
    { esya: "İntikal Hızlandırma %50", adet: 5,  gorsel: "50intikal.webp", emoji: "🌀", ad: "%50 İntikal" },
    { esya: "İntikal Hızlandırma %25", adet: 5,  gorsel: "25intikal.webp", emoji: "⚡", ad: "%25 İntikal" },
    { esya: "1 Saat Hızlandırma",      adet: 20, gorsel: "1shiz.webp",     emoji: "⏩", ad: "1 Saat Hız" },
    { parca: "mor",                    adet: 5,  gorsel: "",              emoji: "🟣", ad: "Mor Parça" }
  ];

  var TOPLAM_ADIM = 5;   /* bölüm 2'de beş adım bağlanacak */

  function S() {
    try { return (typeof state !== "undefined") ? state : null; }
    catch (e) { return null; }
  }

  function kaydet() {
    if (typeof persistCurrentState === "function") persistCurrentState();
  }

  function toast(m) {
    if (typeof showToastForce === "function") showToastForce(m);
    else if (typeof showToast === "function") showToast(m);
  }

  /* ── DURUM ───────────────────────────────────────────────────────────
     adim        : tamamlanan adım sayısı (0..TOPLAM_ADIM)
     odulAlindi  : ödül paketi hesaba geçti mi
     kaleAcildi  : yeni kayıt kaleiçinde başlatıldı mı (bir kez)          */
  function durum() {
    var s = S(); if (!s) return null;
    if (!s.egitim || typeof s.egitim !== "object") {
      s.egitim = { adim: 0, odulAlindi: false, kaleAcildi: false };
    }
    return s.egitim;
  }

  function bittiMi() {
    var d = durum();
    return !!d && d.adim >= TOPLAM_ADIM;
  }

  /* ── ÖDÜL VERME ──────────────────────────────────────────────────────
     Paket bir kez verilir. Eşyalar çantaya, parça kahraman havuzuna. */
  function odulVer() {
    var s = S(), d = durum();
    if (!s || !d || d.odulAlindi) return false;
    d.odulAlindi = true;

    if (!s.inventory || typeof s.inventory !== "object") s.inventory = {};
    ODULLER.forEach(function (o) {
      if (o.esya) {
        s.inventory[o.esya] = (s.inventory[o.esya] || 0) + o.adet;
      } else if (o.parca && typeof window.parcaEkle === "function") {
        try { window.parcaEkle(o.parca, o.adet); } catch (e) {}
      }
    });

    kaydet();
    try { if (typeof renderInventory === "function") renderInventory(); } catch (e) {}
    return true;
  }

  /* ── ÖDÜL PENCERESİ ──────────────────────────────────────────────── */

  function stilKur() {
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
      /* Kutucuklar: iki sütun, hepsi AYNI yükseklikte — kayma olmasın */
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
      /* ÖDÜLÜ AL — düz yeşil, 3B yok, gölge yok. Yazı flex ile tam ortada. */
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
    stilKur();

    var kutular = ODULLER.map(function (o) {
      return '<div class="eo-oge">' +
               gorselAlani(o) +
               '<div class="eo-ad">' + o.ad + '</div>' +
               '<div class="eo-adet">×' + o.adet + '</div>' +
             '</div>';
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

    /* Hayalet tıklama: pencere kendi kendine basılmasın (ilk 350 ms). */
    arka.style.pointerEvents = "none";
    setTimeout(function () { arka.style.pointerEvents = ""; }, 350);

    arka.querySelector(".eo-al").addEventListener("click", function () {
      odulVer();
      arka.remove();
      toast("🎖️ Eğitim ödülün çantana eklendi!");
    });
  }

  /* Eğitim bitmişse ve ödül alınmamışsa pencereyi göster. */
  function odulGerekiyorsaAc() {
    var d = durum();
    if (!d || d.odulAlindi || !bittiMi()) return;
    odulPenceresi();
  }

  /* ── TANI ────────────────────────────────────────────────────────────
     ?egitimtani=1 → ekranın üstünde ne beklendiğini yazan şerit.
     Konsol yok, tanı ekrana basılır. İş bitince bu blok silinir. */
  var TANI_ACIK = location.search.indexOf("egitimtani=1") >= 0;
  function TANI(m) {
    if (!TANI_ACIK) return;
    var el = document.getElementById("egitimTani");
    if (!el) {
      el = document.createElement("div");
      el.id = "egitimTani";
      el.style.cssText = "position:fixed;left:6px;right:6px;top:6px;z-index:99999;" +
        "background:rgba(2,8,22,.9);color:#9fe6ff;font:600 11px/1.35 'Baloo 2',sans-serif;" +
        "padding:6px 8px;border-radius:8px;max-height:34vh;overflow:auto;white-space:pre-wrap;";
      document.body.appendChild(el);
    }
    el.textContent = (m + "\n" + el.textContent).slice(0, 1500);
  }

  /* ── YENİ KAYIT: OYUN KALEİÇİNDE BAŞLAR ──────────────────────────────
     Hoş geldin paneli (rehber.js) kapanana kadar beklenir; erken
     açılırsa Revolia'nın paneli kaleiçinin altında kalır.

     welcomeGiven ŞARTI YOK. Bayrak hiç yazılmazsa (hoş geldin paneli
     bir sebeple açılmadıysa) kaleiçi de hiç açılmıyordu; beklenen tek
     şey artık ekranın boş olması. 12 sn sonra panel hâlâ duruyorsa
     beklemeden açılır — oyuncu ortada kalmasın. */
  function kaleicindeBaslat() {
    var d = durum();
    if (!d || d.kaleAcildi) return;

    var deneme = 0;
    var basladi = Date.now();

    (function bekle() {
      var d2 = durum();
      if (!d2 || d2.kaleAcildi) return;

      var app = document.getElementById("appScreen");
      var appAcik = app && getComputedStyle(app).display !== "none";
      var hosGeldin = document.getElementById("welcomeBack");
      var gunluk = document.getElementById("dailyRewardOverlay");
      var gunlukAcik = gunluk && getComputedStyle(gunluk).display !== "none";
      var kaleVar = !!(window.KALEICI && typeof window.KALEICI.ac === "function");
      var sabirTasti = (Date.now() - basladi) > 12000;

      TANI("bekle#" + deneme +
           " app=" + (appAcik ? 1 : 0) +
           " hosgeldin=" + (hosGeldin ? 1 : 0) +
           " gunluk=" + (gunlukAcik ? 1 : 0) +
           " KALEICI=" + (kaleVar ? 1 : 0));

      if (appAcik && kaleVar && (sabirTasti || (!hosGeldin && !gunlukAcik))) {
        d2.kaleAcildi = true;
        kaydet();
        try {
          window.KALEICI.ac();
          TANI("KALEICI.ac() calisti");
        } catch (e) {
          TANI("!! KALEICI.ac PATLADI: " + (e && e.message));
        }
        return;
      }
      if (++deneme > 600) { TANI("!! zaman asimi"); return; }
      setTimeout(bekle, 500);
    })();
  }

  /* Girişten sonra index.html çağırır. */
  function girisSonrasi() {
    var d = durum();
    if (!d) { TANI("!! state yok"); return; }
    TANI("girisSonrasi adim=" + d.adim + " kaleAcildi=" + (d.kaleAcildi ? 1 : 0));
    /* Eğitimi hiç görmemiş YENİ oyuncu: kaleiçinde başlar.
       Eski oyuncular (eğitim bitmiş sayılır) etkilenmez. */
    if (d.adim === 0 && !d.kaleAcildi) kaleicindeBaslat();
    setTimeout(odulGerekiyorsaAc, 800);
  }

  /* Eski hesapları eğitime sokmamak için: hesabın birlikleri ya da
     kahramanı varsa eğitim tamamlanmış sayılır. index.html giriş
     akışında bir kez çağrılır. */
  function eskiHesabiIsaretle() {
    var s = S(), d = durum();
    if (!s || !d || d.adim > 0) return;
    var birlikVar = s.troops && (s.troops.knight > 0 || s.troops.soldier > 0 || s.troops.robot > 0);
    var kahramanVar = Array.isArray(s.ownedHeroSkins) && s.ownedHeroSkins.length > 0;
    if (birlikVar || kahramanVar) {
      TANI("eski hesap sayildi (birlik=" + (birlikVar ? 1 : 0) +
           " kahraman=" + (kahramanVar ? 1 : 0) + ") -> egitim atlandi");
      d.adim = TOPLAM_ADIM;
      d.odulAlindi = true;      /* geçmiş hesap ödülü almaz */
      d.kaleAcildi = true;
      kaydet();
    }
  }

  window.EGITIM = {
    TOPLAM_ADIM: TOPLAM_ADIM,
    ODULLER: ODULLER,
    durum: durum,
    bittiMi: bittiMi,
    odulVer: odulVer,
    odulPenceresi: odulPenceresi,
    girisSonrasi: girisSonrasi,
    eskiHesabiIsaretle: eskiHesabiIsaretle,
    kaleicindeBaslat: kaleicindeBaslat
  };

  /* Ödül penceresini tek başına görmek için: ?egitimodul=1 */
  if (location.search.indexOf("egitimodul=1") >= 0) {
    setTimeout(odulPenceresi, 600);
  }

  console.log("[egitim.js] Rehberlik bolum 1 yuklendi ✔");
})();
