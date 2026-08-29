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

  /* ── ADIMLAR — tek doğruluk kaynağı ──────────────────────────────────
     `tamam`  : adımın bittiğini anlatan koşul (saniyede bir denetlenir)
     `izin`   : bu adımda açılmasına izin verilen paneller (nav-dock
                data-panel değerleri). Boş dizi = dock tamamen kilitli.
     `elmas`  : adım başında hesapta bulunması GARANTİ edilen miktar —
                eksikse tamamlanır, böylece eğitim boyunca hiçbir şey
                oyuncunun cebinden çıkmış olmaz.                        */
  var ADIMLAR = [
    {
      ad: "uretim",
      baslik: "Ordunu kur",
      metin: "Kalendeki üç kışlaya dokun ve EĞİT ile her birinden 30 birlik üret: 30 Savunucu, 30 Koruyucu, 30 Nişancı.",
      izin: ["troops"],
      elmas: 20000,
      tamam: function (s) {
        var t = s.troops || {};
        return (t.knight || 0) >= 30 && (t.soldier || 0) >= 30 && (t.robot || 0) >= 30;
      }
    },
    {
      ad: "kahraman",
      baslik: "Komutan satın al",
      metin: "Kahraman ekranını aç ve iki komutanı satın al: HALVORSEN ve MİKİAN.",
      izin: ["hero"],
      elmas: 300000,
      tamam: function (s) {
        var o = s.ownedHeroSkins || [];
        return o.indexOf("buz_savascisi") !== -1 && o.indexOf("ates_buyucusu") !== -1;
      }
    },
    {
      ad: "kadro",
      baslik: "Komutanları kadroya ekle",
      metin: "Satın aldığın iki komutanı savaş kadrona ekle. Komutansız ordu eksik savaşır.",
      izin: ["hero", "troops"],
      elmas: 0,
      tamam: function (s) {
        var c = s.selectedCommanders || [];
        return c.indexOf("buz_savascisi") !== -1 && c.indexOf("ates_buyucusu") !== -1;
      }
    },
    {
      ad: "canavar",
      baslik: "İlk savaşın",
      metin: "Haritada kalene yakın 1. seviye bir canavar bul ve saldır.",
      izin: ["troops"],
      elmas: 0,
      tamam: function (s) {
        return (s.maxFrontierLevel || 0) >= 1 || bayrak("canavar");
      }
    },
    {
      ad: "hiz",
      baslik: "Hızlandırmayı öğren",
      metin: "Süren bir eğitimin üstündeki ⏩ kutucuğuna dokun ve BİTİR ile elmasla anında tamamla.",
      izin: ["troops"],
      elmas: 50000,
      tamam: function () { return bayrak("hiz"); }
    }
  ];

  var TOPLAM_ADIM = ADIMLAR.length;

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
      s.egitim = { adim: 0, odulAlindi: false, kaleAcildi: false, olaylar: {} };
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

  /* ── OLAY BAYRAKLARI ─────────────────────────────────────────────────
     Durumdan okunamayan adımlar (canavara saldırı, hızlandırma) oyun
     kodundan EGITIM.olay("...") ile bildirilir. */
  function bayrak(ad) {
    var d = durum();
    return !!(d && d.olaylar && d.olaylar[ad]);
  }

  function olay(ad) {
    var d = durum();
    if (!d) return;
    if (!d.olaylar || typeof d.olaylar !== "object") d.olaylar = {};
    if (d.olaylar[ad]) return;
    d.olaylar[ad] = true;
    TANI("olay: " + ad);
    denetle();
  }

  /* ── BEDAVA: adımın gerektirdiği elmas garanti edilir ──────────────── */
  function elmasGaranti(n) {
    var s = S();
    if (!s || !(n > 0)) return;
    if ((s.diamonds || 0) >= n) return;
    s.diamonds = n;
    try { if (typeof renderDiamonds === "function") renderDiamonds(); } catch (e) {}
    try { if (typeof updateShopButtons === "function") updateShopButtons(); } catch (e) {}
    kaydet();
  }

  /* ── ZORUNLU KİLİT ───────────────────────────────────────────────────
     Eğitim sürerken alt menüden yalnız o adımın paneli açılabilir.
     Dinleyici CAPTURE evresinde durur: düğmenin kendi dinleyicisi
     hiç çalışmaz (Tuzak 16). Eğitim bitince kaldırılır. */
  var kilitKuruldu = false;
  function kilitKur() {
    if (kilitKuruldu) return;
    kilitKuruldu = true;
    document.addEventListener("pointerdown", function (e) {
      var d = durum();
      if (!d || bittiMi()) return;
      var btn = e.target && e.target.closest && e.target.closest("[data-panel]");
      if (!btn) return;
      var hedef = btn.getAttribute("data-panel");
      var adim = ADIMLAR[d.adim];
      if (!adim) return;
      if (adim.izin.indexOf(hedef) !== -1) return;
      e.preventDefault();
      e.stopPropagation();
      toast("Önce Revolia'nın gösterdiği adımı tamamla.");
    }, true);
  }

  /* ── REVOLİA BALONU ──────────────────────────────────────────────── */
  function balonStil() {
    if (document.getElementById("egitimBalonCss")) return;
    var st = document.createElement("style");
    st.id = "egitimBalonCss";
    st.textContent = [
      "#egitimBalon{position:fixed;left:8px;right:8px;bottom:74px;z-index:9990;",
      "  display:flex;gap:10px;align-items:flex-start;padding:12px;",
      "  background:linear-gradient(180deg,#3d7ccc,#152e5e);",
      "  border:1px solid rgba(190,240,255,.20);border-radius:16px;",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3);",
      "  font-family:'Baloo 2','Nunito',sans-serif;color:#eaf4ff;}",
      "#egitimBalon .eb-yuz{width:64px;flex:0 0 64px;align-self:flex-end;margin-bottom:-12px;",
      "  object-fit:contain;object-position:bottom center;background:none;border:none;",
      "  border-radius:0;filter:drop-shadow(0 6px 14px rgba(0,20,45,.55));pointer-events:none;}",
      "#egitimBalon .eb-govde{flex:1 1 auto;min-width:0;}",
      "#egitimBalon .eb-ust{display:flex;justify-content:space-between;align-items:center;gap:8px;}",
      "#egitimBalon .eb-baslik{font-weight:900;font-size:13.5px;color:#ffd257;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#egitimBalon .eb-sayac{font-weight:800;font-size:11.5px;color:#a8c7e0;",
      "  font-variant-numeric:tabular-nums;}",
      "#egitimBalon .eb-metin{font-weight:700;font-size:12.5px;line-height:1.35;margin-top:3px;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}"
    ].join("\n");
    document.head.appendChild(st);
  }

  /* Ekranda bir ödül/karşılama penceresi varsa balon çekilir; yoksa
     ikisi üst üste biniyor ve alttaki düğmeye ulaşılamıyor. */
  function ustPencereVar() {
    if (document.getElementById("welcomeBack")) return true;
    if (document.getElementById("egitimOdul")) return true;
    var dr = document.getElementById("dailyRewardOverlay");
    if (dr && getComputedStyle(dr).display !== "none") return true;
    return false;
  }

  function balonCiz() {
    var d = durum();
    if (!d) return;
    if (bittiMi()) { balonKaldir(); return; }
    if (ustPencereVar()) { balonKaldir(); return; }
    balonStil();

    var adim = ADIMLAR[d.adim];
    if (!adim) return;

    var el = document.getElementById("egitimBalon");
    if (!el) {
      el = document.createElement("div");
      el.id = "egitimBalon";
      el.innerHTML =
        '<img class="eb-yuz" src="gorsel21.webp" alt="" onerror="this.style.display=\'none\'">' +
        '<div class="eb-govde">' +
          '<div class="eb-ust"><div class="eb-baslik"></div><div class="eb-sayac"></div></div>' +
          '<div class="eb-metin"></div>' +
        '</div>';
      document.body.appendChild(el);
    }
    el.querySelector(".eb-baslik").textContent = adim.baslik;
    el.querySelector(".eb-sayac").textContent = (d.adim + 1) + " / " + TOPLAM_ADIM;
    el.querySelector(".eb-metin").textContent = adim.metin;
  }

  function balonKaldir() {
    var el = document.getElementById("egitimBalon");
    if (el) el.remove();
  }

  /* ── DENETİM ─────────────────────────────────────────────────────────
     Adım koşulu sağlandıysa bir sonrakine geçilir. Son adım bitince
     ödül penceresi açılır. */
  var denetimKuruldu = false;

  function denetle() {
    var s = S(), d = durum();
    if (!s || !d) return;
    if (bittiMi()) { balonKaldir(); odulGerekiyorsaAc(); return; }

    var adim = ADIMLAR[d.adim];
    if (!adim) return;

    var bittiBu = false;
    try { bittiBu = !!adim.tamam(s); } catch (e) { bittiBu = false; }

    if (bittiBu) {
      d.adim++;
      kaydet();
      TANI("adim tamam -> " + d.adim);
      var sonraki = ADIMLAR[d.adim];
      if (sonraki) {
        elmasGaranti(sonraki.elmas);
        toast("✅ " + adim.baslik + " tamam!");
        balonCiz();
      } else {
        balonKaldir();
        toast("🎖️ Eğitim tamamlandı!");
        setTimeout(odulGerekiyorsaAc, 500);
      }
      return;
    }
    balonCiz();
  }

  function akisiBaslat() {
    var d = durum();
    if (!d || bittiMi()) { balonKaldir(); return; }
    kilitKur();
    elmasGaranti((ADIMLAR[d.adim] || {}).elmas || 0);
    balonCiz();
    if (!denetimKuruldu) {
      denetimKuruldu = true;
      setInterval(denetle, 1000);
    }
  }

  /* Girişten sonra index.html çağırır. */
  function girisSonrasi() {
    var d = durum();
    if (!d) { TANI("!! state yok"); return; }
    TANI("girisSonrasi adim=" + d.adim + " kaleAcildi=" + (d.kaleAcildi ? 1 : 0));
    /* Eğitimi hiç görmemiş YENİ oyuncu: kaleiçinde başlar.
       Eski oyuncular (eğitim bitmiş sayılır) etkilenmez. */
    if (d.adim === 0 && !d.kaleAcildi) kaleicindeBaslat();
    setTimeout(akisiBaslat, 1200);
    setTimeout(odulGerekiyorsaAc, 1600);
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
    olay: olay,
    denetle: denetle,
    akisiBaslat: akisiBaslat,
    eskiHesabiIsaretle: eskiHesabiIsaretle,
    kaleicindeBaslat: kaleicindeBaslat
  };

  /* Ödül penceresini tek başına görmek için: ?egitimodul=1 */
  if (location.search.indexOf("egitimodul=1") >= 0) {
    setTimeout(odulPenceresi, 600);
  }

  console.log("[egitim.js] Rehberlik bolum 1 yuklendi ✔");
})();
