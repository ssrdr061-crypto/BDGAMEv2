/* ═══════════════════════════════════════════════════════════════
   insaat.js — BİNA GELİŞTİRME (Sv1 → Sv10)
   ---------------------------------------------------------------
   Kaleiçindeki binaların seviyesini yükseltir. Tek doğruluk
   kaynağı bu dosyadır: maliyet, süre, üretim çarpanı ve açılış
   kuralları başka hiçbir yerde yazılı değildir.

   VERİ
     state.binaSv   { odun:1, ahir:1, ... }  bina → seviye
     state.insaat   [ { id, hedef, bitis } ] en fazla İKİ SIRA

   Bitmiş inşaat GİRİŞTE işlenir: oyuncu oyunda olmasa da süre
   akar (uretim.js ile aynı mantık). Sunucu tarafı yok.

   ÜÇ İNCE NOKTA
     1) state.binaSv ve state.insaat hesap kaydına da yazılmalı
        (index.html → compactStateForExport). Yazılmazsa her
        girişte seviyeler 1'e döner.
     2) Ana Kale EN SONA kalır: diğer binalar onu çeker. Kapı
        kuralı kaleKapisi() içinde, tek yerde.
     3) Kışlalarda ÜÇLÜ DÖNGÜ muafiyeti var — her Ana Kale
        seviyesinde üç kışladan biri bir seviye geride kalabilir.
        Muaf olan kışla sabit sırayla döner, oyuncu seçmez.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SURUM = "insaat-3";

  var TAVAN     = 10;    /* en yüksek seviye */
  var SIRA_SAYI = 2;     /* aynı anda kaç inşaat sürebilir */

  /* ── GELİŞTİRİLEBİLİR BİNALAR ──
     Anahtarlar kaleici.js'teki BINALAR[].id ile birebir aynı
     olmak ZORUNDA; ayrışırsa düğme çıkar ama hiçbir şey olmaz. */
  var TIP = {
    kale:      "kale",
    odun:      "kaynak", ahir:  "kaynak", demir: "kaynak",
    su:        "kaynak", enerji: "kaynak",
    sovalye:   "kisla",  asker:  "kisla",  robot: "kisla",
    arastirma: "kisla",
  };

  /* Hangi bina hangi kaynağı üretir. Ahır et üretir — bina adı
     ile kaynak adı burada ayrışır, tek eşleme noktası budur. */
  var URETTIGI = {
    odun: "odun", ahir: "et", demir: "demir", su: "su", enerji: "enerji",
  };

  /* ── KAYNAK BİNASI: ana kaynak %60, yan kaynak %40 ── */
  var ODEME = {
    odun:   { ana: "demir", yan: "et" },
    ahir:   { ana: "odun",  yan: "su" },
    demir:  { ana: "odun",  yan: "enerji" },
    su:     { ana: "demir", yan: "odun" },
    enerji: { ana: "demir", yan: "su" },
  };

  /* ── TABLOLAR ──
     Dizi indeksi HEDEF seviyedir: [2] = Sv1'den Sv2'ye geçiş.
     0 ve 1 kullanılmaz, boş bırakıldı. */

  /* Kaynak binası — { ana, yan, dk } */
  var T_KAYNAK = [
    null, null,
    { ana:     6000, yan:     4000, dk:    6 },
    { ana:    15600, yan:    10400, dk:   15 },
    { ana:    38400, yan:    25600, dk:   36 },
    { ana:    96000, yan:    64000, dk:   75 },
    { ana:   240000, yan:   160000, dk:  165 },
    { ana:   600000, yan:   400000, dk:  360 },
    { ana:  1500000, yan:  1000000, dk:  900 },
    { ana:  3720000, yan:  2480000, dk: 1980 },
    { ana:  9360000, yan:  6240000, dk: 4680 },
  ];

  /* Kışla + Araştırma — beş kaynakla birden ödenir */
  var T_KISLA = [
    null, null,
    { odun:    11700, demir:    11700, et:     7800, su:     5850, enerji:    1950, dk:    9 },
    { odun:    29000, demir:    29000, et:    19500, su:    14600, enerji:    4900, dk:   22 },
    { odun:    72000, demir:    72000, et:    48000, su:    36000, enerji:   12000, dk:   55 },
    { odun:   180000, demir:   180000, et:   120000, su:    90000, enerji:   30000, dk:  110 },
    { odun:   450000, demir:   450000, et:   300000, su:   225000, enerji:   75000, dk:  240 },
    { odun:  1125000, demir:  1125000, et:   750000, su:   562000, enerji:  187000, dk:  540 },
    { odun:  2790000, demir:  2790000, et:  1860000, su:  1395000, enerji:  465000, dk: 1320 },
    { odun:  7020000, demir:  7020000, et:  4680000, su:  3510000, enerji: 1170000, dk: 3000 },
    { odun: 17550000, demir: 17550000, et: 11700000, su:  8775000, enerji: 2925000, dk: 7020 },
  ];

  /* Ana Kale — kışlanın yaklaşık 1,33 katı */
  var T_KALE = [
    null, null,
    { odun:    15600, demir:    15600, et:    10400, su:     7800, enerji:    2600, dk:   12 },
    { odun:    39000, demir:    39000, et:    26000, su:    19500, enerji:    6500, dk:   27 },
    { odun:    96000, demir:    96000, et:    64000, su:    48000, enerji:   16000, dk:   66 },
    { odun:   240000, demir:   240000, et:   160000, su:   120000, enerji:   40000, dk:  135 },
    { odun:   600000, demir:   600000, et:   400000, su:   300000, enerji:  100000, dk:  300 },
    { odun:  1500000, demir:  1500000, et:  1000000, su:   750000, enerji:  250000, dk:  660 },
    { odun:  3720000, demir:  3720000, et:  2480000, su:  1860000, enerji:  620000, dk: 1620 },
    { odun:  9360000, demir:  9360000, et:  6240000, su:  4680000, enerji: 1560000, dk: 3600 },
    { odun: 23400000, demir: 23400000, et: 15600000, su: 11700000, enerji: 3900000, dk: 8460 },
  ];

  /* Her seviyede üretim bu kadar katlanır (Sv1 = 1.00) */
  var URETIM_ARTIS = 1.45;

  /* ── KIŞLA MUAFİYETİ — SABİT ÜÇLÜ DÖNGÜ ──
     Ana Kale'yi Sv N'ye çıkarırken bu kışla Sv N-1 kalabilir.
     Diğer ikisi Sv N olmak ZORUNDA. Araştırma dahil değil.  */
  var MUAF_SIRA = ["robot", "sovalye", "asker"];   /* Nişancı → Savunucu → Koruyucu */
  function muafKisla(hedefSv) {
    return MUAF_SIRA[(hedefSv - 2) % MUAF_SIRA.length];
  }

  var ADLAR = {
    kale: "Ana Kale", odun: "Odun", ahir: "Ahır", demir: "Demir",
    su: "Su", enerji: "Enerji", arastirma: "Araştırma",
    sovalye: "Savunucu Kışlası", asker: "Koruyucu Kışlası", robot: "Nişancı Kışlası",
  };
  var K_EMOJI = { odun: "🪵", et: "🍖", demir: "⛓️", su: "💧", enerji: "⚡" };

  /* Gereksinim simgeleri UST SERITLE ayni dosyalari kullanir
     (tema.js -> kayGorsel tablosu). Eskiden dugum.js'in seti
     okunuyordu (et.webp / demir.webp / su.webp); ayni kaynak iki
     ayri gorselle cikiyordu. Tek yer burasi, dosya yoksa emoji. */
  var K_GORSEL = {
    odun: "10kodun.webp", et: "10ket.webp", demir: "5kdemir.webp",
    su: "5ksu.webp", enerji: "enerji.webp",
  };
  var K_ADI   = { odun: "Odun", et: "Et", demir: "Demir", su: "Su", enerji: "Enerji" };

  /* ═══════════════════════════════════════════════════════════
     DURUM
     ═══════════════════════════════════════════════════════════ */

  function hazir() {
    return (typeof state !== "undefined" && state && typeof state === "object");
  }

  function kurDurum() {
    if (!hazir()) return false;
    if (!state.binaSv || typeof state.binaSv !== "object") state.binaSv = {};
    Object.keys(TIP).forEach(function (id) {
      var v = state.binaSv[id];
      if (typeof v !== "number" || !isFinite(v) || v < 1) state.binaSv[id] = 1;
      if (state.binaSv[id] > TAVAN) state.binaSv[id] = TAVAN;
    });
    if (!Array.isArray(state.insaat)) state.insaat = [];
    return true;
  }

  function seviye(id) {
    if (!kurDurum()) return 1;
    return state.binaSv[id] || 1;
  }

  /* ═══════════════════════════════════════════════════════════
     TABLO OKUMA
     ═══════════════════════════════════════════════════════════ */

  /* Bir yükseltmenin bedeli: { kaynaklar:{...}, dk:N } */
  function bedel(id, hedef) {
    var t = TIP[id];
    if (!t || hedef < 2 || hedef > TAVAN) return null;

    if (t === "kaynak") {
      var s = T_KAYNAK[hedef];
      var o = ODEME[id];
      if (!s || !o) return null;
      var k = {};
      k[o.ana] = s.ana;
      k[o.yan] = (k[o.yan] || 0) + s.yan;
      return { kaynaklar: k, dk: s.dk };
    }

    var tab = (t === "kale") ? T_KALE : T_KISLA;
    var r = tab[hedef];
    if (!r) return null;
    return {
      kaynaklar: {
        odun: r.odun, demir: r.demir, et: r.et, su: r.su, enerji: r.enerji,
      },
      dk: r.dk,
    };
  }

  /* Bina seviyesinin üretime katkısı — uretim.js bunu çağırır. */
  function uretimCarpani(kaynakId) {
    var binaId = null;
    Object.keys(URETTIGI).forEach(function (b) {
      if (URETTIGI[b] === kaynakId) binaId = b;
    });
    if (!binaId) return 1;
    return Math.pow(URETIM_ARTIS, seviye(binaId) - 1);
  }

  /* ═══════════════════════════════════════════════════════════
     KAPILAR — yükseltme yapılabilir mi
     ═══════════════════════════════════════════════════════════ */

  /* Ana Kale kapısı: diğer binalar hedef seviyeye yetişmiş mi.
     Döner: null (geçti) veya engel metni. */
  function kaleKapisi(hedef) {
    var muaf = muafKisla(hedef);
    var eksik = [];

    Object.keys(TIP).forEach(function (id) {
      if (id === "kale") return;
      var gerek = (id === muaf) ? (hedef - 1) : hedef;
      if (gerek < 1) gerek = 1;
      if (seviye(id) < gerek) eksik.push(ADLAR[id] + " Sv" + gerek);
    });

    if (!eksik.length) return null;
    return "Önce şunlar gerekli: " + eksik.join(" · ");
  }

  /* Diğer binalar Ana Kale'yi EN FAZLA BİR SEVİYE geçebilir.
     ── TUZAK: BU +1 OLMAZSA OYUN KİLİTLENİR ──
     Kale kapısı "hepsi Sv N olsun" der. Tavan da "kaleyi geçemez"
     deseydi, kale Sv1 iken hiçbir bina Sv2'ye çıkamaz, hiçbiri
     çıkmadığı için kale de Sv2 olamazdı. Binalar önce bir seviye
     öne geçer, kale sonra onları yakalar — istenen sıra budur. */
  function kaleTavani(id, hedef) {
    if (id === "kale") return null;
    if (hedef <= seviye("kale") + 1) return null;
    return "Ana Kale Sv" + seviye("kale") + ". Önce Ana Kale'yi Sv" +
           (hedef - 1) + " yap.";
  }

  /* Kaynak yeterli mi → eksik kaynakların listesi (boşsa yeterli) */
  function eksikKaynaklar(kay) {
    var cuzdan = (hazir() && state.kaynaklar) || {};
    var eksik = [];
    Object.keys(kay).forEach(function (k) {
      var var_ = cuzdan[k] || 0;
      if (var_ < kay[k]) eksik.push(k);
    });
    return eksik;
  }

  /* Tam denetim. Döner: { olur:bool, sebep:"" } */
  function denetle(id, hedef) {
    if (!kurDurum())            return { olur: false, sebep: "Oyun verisi hazır değil." };
    if (!TIP[id])               return { olur: false, sebep: "Bu bina geliştirilemez." };
    if (hedef > TAVAN)          return { olur: false, sebep: "En yüksek seviyede." };
    if (kuyrukta(id))           return { olur: false, sebep: "Bu bina zaten inşaatta." };
    if (state.insaat.length >= SIRA_SAYI)
      return { olur: false, sebep: "İnşaat sırası dolu (" + SIRA_SAYI + "/" + SIRA_SAYI + ")." };

    var t = kaleTavani(id, hedef);
    if (t) return { olur: false, sebep: t };

    if (id === "kale") {
      var kk = kaleKapisi(hedef);
      if (kk) return { olur: false, sebep: kk };
    }

    var b = bedel(id, hedef);
    if (!b) return { olur: false, sebep: "Tablo bulunamadı." };

    var eks = eksikKaynaklar(b.kaynaklar);
    if (eks.length) {
      return { olur: false, sebep: "Yetersiz: " +
               eks.map(function (k) { return K_ADI[k]; }).join(", ") };
    }
    return { olur: true, sebep: "" };
  }

  /* ═══════════════════════════════════════════════════════════
     KUYRUK
     ═══════════════════════════════════════════════════════════ */

  function kuyrukta(id) {
    if (!kurDurum()) return null;
    for (var i = 0; i < state.insaat.length; i++) {
      if (state.insaat[i].id === id) return state.insaat[i];
    }
    return null;
  }

  function kalanMs(id) {
    var i = kuyrukta(id);
    if (!i) return 0;
    return Math.max(0, i.bitis - Date.now());
  }

  /* Bitmiş inşaatları uygular. Döner: tamamlanan bina adları. */
  function bitenleriIsle() {
    if (!kurDurum()) return [];
    var simdi = Date.now();
    var bitti = [];
    state.insaat = state.insaat.filter(function (i) {
      if (i.bitis > simdi) return true;
      var eski = state.binaSv[i.id] || 1;
      /* Hedef seviye kaydın içinde: iki tur birden atlanamaz. */
      state.binaSv[i.id] = Math.min(TAVAN, Math.max(eski, i.hedef || eski + 1));
      bitti.push(ADLAR[i.id] || i.id);
      return false;
    });
    if (bitti.length) yaz();
    return bitti;
  }

  /* Yükseltmeyi başlat. Döner: { ok:bool, sebep:"" } */
  function baslat(id) {
    if (!kurDurum()) return { ok: false, sebep: "Hazır değil." };
    bitenleriIsle();

    var hedef = seviye(id) + 1;
    var d = denetle(id, hedef);
    if (!d.olur) return { ok: false, sebep: d.sebep };

    var b = bedel(id, hedef);
    Object.keys(b.kaynaklar).forEach(function (k) {
      state.kaynaklar[k] = (state.kaynaklar[k] || 0) - b.kaynaklar[k];
      if (state.kaynaklar[k] < 0) state.kaynaklar[k] = 0;
    });

    state.insaat.push({ id: id, hedef: hedef, bitis: Date.now() + b.dk * 60000 });
    yaz();
    tazele();
    return { ok: true, sebep: "" };
  }

  function yaz() {
    try { if (typeof persistCurrentState === "function") persistCurrentState(); } catch (e) {}
  }

  function tazele() {
    try { if (typeof renderKaynaklar === "function") renderKaynaklar(); } catch (e) {}
    try { if (window.KALEICI && typeof window.KALEICI.ciz === "function") window.KALEICI.ciz(); } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════
     BİÇİMLENDİRME
     ═══════════════════════════════════════════════════════════ */

  function sayi(n) {
    try { return Number(n || 0).toLocaleString("tr-TR"); }
    catch (e) { return String(n || 0); }
  }

  /* Kutucuklar dar — 9.360.000 sigmaz. Ust seritteki bicimin aynisi:
     1.000 alti tam sayi, sonrasi K ve M, ondalik virgullu. */
  function kisaSayi(n) {
    n = Number(n) || 0;
    var i = n < 0 ? "-" : "";
    n = Math.abs(n);
    if (n >= 1e6) return i + (n / 1e6).toFixed(1).replace(".", ",").replace(",0", "") + "M";
    if (n >= 1e3) return i + (n / 1e3).toFixed(1).replace(".", ",").replace(",0", "") + "K";
    return i + String(Math.round(n));
  }

  /* Bir kaynak binasinin verdigi DAKIKALIK uretim. Taban uretim.js'te
     (URETIM.HIZ), her seviye URETIM_ARTIS kadar carpilir. URETIM
     yuklenmemisse 0 doner ve satir hic yazilmaz. */
  function dkUretim(binaId, sv) {
    var kay = URETTIGI[binaId];
    if (!kay) return 0;
    var taban = 0;
    try {
      if (window.URETIM && window.URETIM.HIZ) taban = window.URETIM.HIZ[kay] || 0;
    } catch (e) {}
    if (!taban) return 0;
    return Math.round(taban * Math.pow(URETIM_ARTIS, Math.max(0, sv - 1)));
  }

  function sureYaz(ms) {
    var t = Math.max(0, Math.round(ms / 1000));
    var g = Math.floor(t / 86400);
    var sa = Math.floor((t % 86400) / 3600);
    var dk = Math.floor((t % 3600) / 60);
    var sn = t % 60;
    var iki = function (n) { return String(n).padStart(2, "0"); };
    if (g > 0)  return g + "g " + sa + "s " + iki(dk) + "d";
    if (sa > 0) return sa + ":" + iki(dk) + ":" + iki(sn);
    return dk + ":" + iki(sn);
  }

  function dkYaz(dk) {
    if (dk < 60) return dk + " dk";
    if (dk < 1440) {
      var sa = Math.floor(dk / 60), k = dk % 60;
      return sa + " sa" + (k ? " " + k + " dk" : "");
    }
    var g = Math.floor(dk / 1440), ks = Math.round((dk % 1440) / 60);
    return g + " gün" + (ks ? " " + ks + " sa" : "");
  }

  /* Kaynak simgesi — HTML bağlamı olduğu için GÖRSEL basılır
     (Simge/Görsel kuralı). Dosya açılmazsa emojiye döner. */
  function simge(k) {
    var d = K_GORSEL[k];
    var e = K_EMOJI[k] || "";
    if (!d) return e;
    return '<img class="ins-sim" src="' + d + '" alt="" ' +
           'onerror="this.onerror=null;this.replaceWith(' +
           'document.createTextNode(\'' + e + '\'))">';
  }

  /* ═══════════════════════════════════════════════════════════
     PANEL
     ═══════════════════════════════════════════════════════════ */

  /* ── ALT SAYFA ──
     Panel ARTIK ekranin ortasinda degil. Alttan yukari kayarak acilir ve
     nav-dock'un HEMEN USTUNDE durur; harita gorunur kalir, karartma yok.
     `bottom` degeri acilista OLCULUP px olarak yazilir — dock gizlenince
     degisken sifira dustugu icin degiskene guvenilmiyor.
     3B yok: cerceve yok, gradient yok, tek yumusak golge. */
  var CSS =
    '.ins-modal{position:fixed;left:0;right:0;z-index:39;' +
      'font-family:"Baloo 2","Nunito",sans-serif;pointer-events:none;}' +

    /* Zemin ve cerceve MENU PANELIYLE ayni (tema.js .overlay-card):
       linear-gradient(#1fa3ea,#0e6fc0) + 1px rgba(190,240,255,.85).
       Eski #0d2438 koyu zemin buradan silindi — ezme degil, degisim. */
    '.ins-modal .ins-kart{pointer-events:auto;' +
      'max-height:62vh;overflow-y:auto;overflow-x:hidden;' +
      'background:linear-gradient(180deg,#1fa3ea,#0e6fc0);' +
      'border:1px solid rgba(190,240,255,.85);border-bottom:none;' +
      'border-radius:16px 16px 0 0;padding:14px 12px 12px;position:relative;' +
      'box-shadow:0 2px 6px rgba(0,20,45,.3);color:#eaf7ff;' +
      'transform:translateY(102%);transition:transform .22s cubic-bezier(.2,.9,.3,1);}' +
    '.ins-modal.acik .ins-kart{transform:translateY(0);}' +
    '.ins-modal .ins-kapat{position:absolute;top:10px;right:12px;width:28px;height:28px;' +
      'border:none;border-radius:8px;background:#e03b47;color:#ffffff;' +
      'font-size:15px;line-height:1;cursor:pointer;}' +

    /* Basliklar ORTALI — kapatma dugmesi mutlak konumlu, ortalamayi bozmaz */
    '.ins-modal .ins-bas{font-size:17px;font-weight:800;text-align:center;' +
      'margin:0 34px 2px;text-shadow:0 1px 2px rgba(0,20,45,.55);}' +
    '.ins-modal .ins-sv{font-size:15px;font-weight:800;color:#cfeaff;' +
      'text-align:center;margin-bottom:10px;font-variant-numeric:tabular-nums;' +
      'text-shadow:0 1px 2px rgba(0,20,45,.55);}' +
    '.ins-modal .ins-sv .ins-hedef{color:#5ef08c;font-weight:800;}' +

    /* ── GEREKSINIM KUTUCUKLARI ──
       Simge / ad / miktar UST ALTA. Yan yana yazilinca "Demir" ve
       "Enerji" bes kutuda telefona sigmiyor, ucu kirpiliyordu. */
    '.ins-modal .ins-kutular{display:flex;gap:6px;margin-bottom:10px;}' +
    '.ins-modal .ins-kutu{flex:1 1 0;min-width:0;padding:2px 0 0;text-align:center;' +
      'background:none;border:none;}' +
    '.ins-modal .ins-kutu .ins-ust{height:30px;line-height:30px;font-size:24px;}' +
    '.ins-modal .ins-kutu .ins-mik{margin-top:3px;font-size:15px;font-weight:800;' +
      'color:#ffffff;font-variant-numeric:tabular-nums;' +
      'text-shadow:0 1px 2px rgba(0,20,45,.55);}' +
    '.ins-modal .ins-kutu.eksik .ins-mik{color:#ff6b6b;}' +
    '.ins-modal img.ins-sim{width:28px;height:28px;object-fit:contain;' +
      'vertical-align:-6px;display:inline-block;}' +

    '.ins-modal .ins-sure{margin:2px 0 4px;font-size:14px;font-weight:700;color:#ffd257;' +
      'text-align:center;font-variant-numeric:tabular-nums;}' +
    '.ins-modal .ins-not{font-size:12.5px;line-height:1.45;color:#ffd0d2;margin:6px 0 2px;' +
      'text-align:center;}' +
    '.ins-modal .ins-bilgi{font-size:12.5px;line-height:1.45;color:#cfeaff;margin:6px 0 2px;' +
      'text-align:center;font-variant-numeric:tabular-nums;}' +
    '.ins-modal .ins-dugmeler{display:flex;gap:8px;margin-top:12px;}' +
    '.ins-modal .ins-btn{flex:1 1 0;border:none;border-radius:12px;padding:12px 8px;' +
      'font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;' +
      'text-shadow:0 1px 2px rgba(0,20,45,.35);' +
      'transition:transform .09s ease,filter .09s ease;}' +
    '.ins-modal .ins-btn:active{transform:scale(.96);filter:brightness(.93);}' +
    '.ins-modal .ins-btn[disabled]{opacity:.45;cursor:default;}' +
    '.ins-modal .ins-btn[disabled]:active{transform:none;filter:none;}' +
    '.ins-modal .ins-yesil{background:#3fbf6a;color:#ffffff;}' +
    '.ins-modal .ins-sari{background:#ffd257;color:#3a2600;}' +
    '.ins-modal .ins-geri{font-size:26px;font-weight:800;color:#ffd257;text-align:center;' +
      'margin:10px 0 4px;font-variant-numeric:tabular-nums;}';

  function stilBas() {
    if (document.getElementById("insaatCSS")) return;
    var st = document.createElement("style");
    st.id = "insaatCSS";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  var _sayac = null;
  var _kok = null;     /* acik panelin KENDISI — id ile aranmaz */

  /* position:fixed oldugu icin offsetParent null doner (Tuzak 31);
     olcu offsetHeight'tan alinir. Dock gizliyse 0 gelir ve panel
     ekranin dibine oturur — sabit bir sayi yazmak yanlis olurdu. */
  function dockYuksekligi() {
    try {
      var d = document.querySelector(".nav-dock");
      if (d && d.offsetHeight > 0) return d.offsetHeight;
    } catch (e) {}
    return 0;
  }

  /* ══ PANELIN KENDILIGINDEN KAYBOLMASI — KOK SEBEP ══
     Kapanis animasyonu icin eski dugum 240 ms DAHA DOM'da kaliyordu.
     O sirada acilan YENI panelin id'si de "insaatModal" oluyor ve
     document.getElementById ilk siradakini, yani OLMEKTE OLANI
     donduruyordu: ciz() icerigi olu dugume yaziyor, 240 ms sonra o
     dugum siliniyor ve panel ekrandan kayboluyordu.
     Cozum: dugum artik id ile aranmiyor (_kok), olen dugumun id'si
     de derhal siliniyor. Iki panel ayni ismi hic paylasmiyor. */
  function kapat() {
    var m = _kok;
    _kok = null;
    if (_sayac) { clearInterval(_sayac); _sayac = null; }
    if (!m) {
      /* Eski surumden kalmis basibos dugum olabilir */
      var kalinti = document.getElementById("insaatModal");
      if (kalinti && kalinti.parentNode) kalinti.remove();
      return;
    }
    m.removeAttribute("id");
    m.classList.remove("acik");
    setTimeout(function () { if (m.parentNode) m.remove(); }, 240);
  }

  function ac(id) {
    if (!TIP[id]) return;
    if (!kurDurum()) return;
    bitenleriIsle();
    stilBas();

    /* Ayni bina icin ikinci dokunus paneli YIKIP kurmaz, tazeler.
       Yikip kurmak her seferinde 240 ms'lik bir kapanis animasyonu
       baslatiyordu — "acilip kapaniyor" goruntusunun ikinci sebebi. */
    if (_kok && _kok.dataset.bina === id) { ciz(id); return; }
    kapat();

    var acilis = Date.now();
    var kok = document.createElement("div");
    kok.id = "insaatModal";
    /* KOK SEBEP: kapat() id'yi siliyor, CSS ise id'ye baglıydı — stil
       aninda dusuyor ve 240 ms boyunca odun gorseli dogal boyutunda
       tam ekran basiliyordu. Stil artik SINIFA bagli, id sadece
       eski surumlerin kalintisini bulmak icin duruyor. */
    kok.className = "ins-modal";
    kok.dataset.bina = id;
    kok.innerHTML = '<div class="ins-kart"><button class="ins-kapat" type="button">✕</button>' +
                    '<div class="ins-govde"></div></div>';

    /* Panel nav-dock'un USTUNDE dursun. Dock gizliyse olcu 0 gelir
       (Tuzak 15) — o zaman ekranin dibine oturur. position:fixed
       oldugu icin offsetParent null'dir, offsetHeight kullaniliyor. */
    kok.style.bottom = dockYuksekligi() + "px";

    document.body.appendChild(kok);
    _kok = kok;

    kok.querySelector(".ins-kapat").addEventListener("click", function () {
      /* Panel kaleici tuvalindeki GELISTIR dugmesinin tam ustune
         aciliyor; o dokunustan arta kalan hayalet tik ✕'e denk
         gelebiliyor (Tuzak 29). Ilk 400 ms kapatma calismaz. */
      if (Date.now() - acilis < 400) return;
      kapat();
    });

    ciz(id);

    /* Kayarak acilis: sinif bir sonraki karede eklenir, yoksa
       tarayici baslangic durumunu hic gormeden son hale atlar. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { kok.classList.add("acik"); });
    });

    /* Hayalet tiklama korumasi — dugme pointerup ile tetikleniyor,
       parmak kalkinca ayni noktaya bir click daha geliyor (Tuzak 29). */
    var kart = kok.querySelector(".ins-kart");
    kart.style.pointerEvents = "none";
    setTimeout(function () { kart.style.pointerEvents = ""; }, 400);

    _sayac = setInterval(function () {
      if (_kok !== kok || !kok.parentNode) { clearInterval(_sayac); _sayac = null; return; }
      var i = kuyrukta(id);
      if (i) {
        var g = kok.querySelector(".ins-geri");
        if (g) g.textContent = sureYaz(kalanMs(id));
        if (kalanMs(id) <= 0) { bitenleriIsle(); tazele(); ciz(id); }
      }
    }, 1000);
  }

  /* Panel içeriğini YERİNDE tazeler — kaydırma korunur. */
  function ciz(id) {
    var kok = _kok;
    if (!kok) return;
    var govde = kok.querySelector(".ins-govde");
    if (!govde) return;

    var sv = seviye(id);
    var hedef = sv + 1;
    var ad = ADLAR[id] || id;
    var h = '<div class="ins-bas">' + ad + '</div>';

    /* ── İNŞAAT SÜRÜYOR ── */
    var isi = kuyrukta(id);
    if (isi) {
      h += '<div class="ins-sv">Sv' + sv + ' → <span class="ins-hedef">Sv' +
           isi.hedef + '</span> · inşaatta</div>';
      h += '<div class="ins-geri">' + sureYaz(kalanMs(id)) + '</div>';
      h += '<div class="ins-dugmeler">' +
             '<button class="ins-btn ins-sari" data-is="hizlandir">⏩ HIZLANDIR</button>' +
           '</div>';
      govde.innerHTML = h;
      bagla(govde, id);
      return;
    }

    /* ── TAVAN ── */
    if (sv >= TAVAN) {
      h += '<div class="ins-sv">Sv' + TAVAN + ' — en yüksek seviye</div>';
      govde.innerHTML = h;
      return;
    }

    h += '<div class="ins-sv">Sv' + sv + ' → <span class="ins-hedef">Sv' +
         hedef + '</span></div>';

    var b = bedel(id, hedef);
    if (!b) { govde.innerHTML = h; return; }

    var cuzdan = state.kaynaklar || {};
    var kutular = "";
    Object.keys(b.kaynaklar).forEach(function (k) {
      var gerek = b.kaynaklar[k];
      if (!gerek) return;
      var yeter = (cuzdan[k] || 0) >= gerek;
      kutular += '<div class="ins-kutu' + (yeter ? "" : " eksik") + '">' +
                   '<div class="ins-ust">' + simge(k) + '</div>' +
                   '<div class="ins-mik">' + kisaSayi(gerek) + '</div>' +
                 '</div>';
    });
    if (kutular) h += '<div class="ins-kutular">' + kutular + '</div>';

    h += '<div class="ins-sure">⏱ ' + dkYaz(b.dk) + '</div>';

    /* Uretim — yalniz kaynak binalarinda. Yuzde degil GERCEK sayi:
       simdiki dakikalik uretim ve yukseltmenin getirecegi artis.
       Kisla/Arastirma/Ana Kale kaynak uretmez, satir hic yazilmaz. */
    var simdiki = dkUretim(id, sv);
    if (simdiki > 0) {
      var artis = dkUretim(id, hedef) - simdiki;
      h += '<div class="ins-bilgi">Üretim ' + sayi(simdiki) + '/dk · +' +
           sayi(artis) + '/dk</div>';
    }

    /* Ana Kale kapısı — hangi bina eksik, açıkça yaz */
    if (id === "kale") {
      var kk = kaleKapisi(hedef);
      var muaf = muafKisla(hedef);
      h += '<div class="ins-bilgi">Bu seviyede ' + ADLAR[muaf] +
           ' Sv' + (hedef - 1) + ' kalabilir.</div>';
      if (kk) h += '<div class="ins-not">' + kk + '</div>';
    } else {
      var kt = kaleTavani(id, hedef);
      if (kt) h += '<div class="ins-not">' + kt + '</div>';
    }

    var d = denetle(id, hedef);
    if (!d.olur && d.sebep && d.sebep.indexOf("Önce") !== 0 && d.sebep.indexOf("Ana Kale") !== 0) {
      h += '<div class="ins-not">' + d.sebep + '</div>';
    }

    h += '<div class="ins-dugmeler">' +
           '<button class="ins-btn ins-yesil" data-is="basla"' + (d.olur ? "" : " disabled") + '>' +
             'GELİŞTİR</button>' +
         '</div>';

    govde.innerHTML = h;
    bagla(govde, id);
  }

  function bagla(govde, id) {
    var b1 = govde.querySelector('[data-is="basla"]');
    if (b1) b1.addEventListener("click", function () {
      var r = baslat(id);
      if (!r.ok) { uyar(r.sebep); return; }
      ciz(id);
    });

    var b2 = govde.querySelector('[data-is="hizlandir"]');
    if (b2) b2.addEventListener("click", function () {
      if (typeof hizlandirmaPenceresi === "function") {
        hizlandirmaPenceresi(id, "insaat");
      } else {
        uyar("Hızlandırma penceresi yüklenmedi.");
      }
    });
  }

  /* Bildirimler kapalı (Tuzak 48) — görünmesi gereken uyarı
     showToastForce ile gider. */
  function uyar(m) {
    if (!m) return;
    try {
      if (typeof showToastForce === "function") { showToastForce(m); return; }
      if (typeof showToast === "function") { showToast(m); return; }
    } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════
     GİRİŞ İŞLEMESİ — oyuncu yokken de süre akar
     ═══════════════════════════════════════════════════════════ */

  function turAt() {
    if (!hazir()) return;
    var bitti = bitenleriIsle();
    if (bitti.length) {
      tazele();
      uyar("🏗️ Tamamlandı: " + bitti.join(", "));
      if (_kok && _kok.dataset.bina) ciz(_kok.dataset.bina);
    }
  }

  setInterval(turAt, 10000);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(turAt, 1500); });
  } else {
    setTimeout(turAt, 1500);
  }

  /* ═══════════════════════════════════════════════════════════
     DIŞ KAPILAR
     ═══════════════════════════════════════════════════════════ */

  window.INSAAT = {
    SURUM: SURUM,
    TAVAN: TAVAN,
    SIRA_SAYI: SIRA_SAYI,
    TIP: TIP,
    ADLAR: ADLAR,

    ac: ac,
    kapat: kapat,
    seviye: seviye,
    bedel: bedel,
    denetle: denetle,
    baslat: baslat,
    kuyrukta: kuyrukta,
    kalanMs: kalanMs,
    bitenleriIsle: bitenleriIsle,
    uretimCarpani: uretimCarpani,
    gelistirilebilir: function (id) { return !!TIP[id]; },
    kurDurum: kurDurum,

    /* hizlandirmaPenceresi bu üç kapıyı kullanır */
    kuyruk: function (id) {
      var i = kuyrukta(id);
      return i ? [i] : [];
    },
    toplamMs: function (id) {
      var i = kuyrukta(id);
      if (!i) return 1;
      var b = bedel(i.id, i.hedef);
      return b ? b.dk * 60000 : 1;
    },
    bittiUygula: function () { bitenleriIsle(); tazele(); },

    /* hizlandirmaPenceresi suresi kisaltmak icin bunu cagirir.
       Alan adi 'bitis' — hastane/egitim 'finishAt' kullanir, o yuzden
       kisaltmayi disaridan degil BURADAN yapiyoruz. */
    kisalt: function (id, ms) {
      var i = kuyrukta(id);
      if (!i) return;
      i.bitis = Math.max(Date.now(), i.bitis - ms);
      bitenleriIsle();
      yaz();
      tazele();
      if (_kok && _kok.dataset.bina) ciz(_kok.dataset.bina);
    },

    tani: function () {
      kurDurum();
      return { surum: SURUM, seviyeler: state.binaSv, kuyruk: state.insaat };
    },
  };
})();
