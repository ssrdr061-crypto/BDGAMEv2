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

  var SURUM = "insaat-5";

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

  /* ── KAYNAK → ELMAS KURU ──
     BITIR dugmesi SUREYI satin alir; kaynak eksikse eksigi de elmasa
     cevirir. Kur uretim hiziyla TERS orantili: enerji dakikada 150,
     et 500 uretiliyor — esit saysaydik enerjiyle bitirmek bedavaya
     gelirdi. Sayilar: 1 elmas kac kaynak eder. */
  var ELMAS_KUR = { et: 600, odun: 500, demir: 450, su: 300, enerji: 200 };
  var BITIR_DK_ELMAS = 20;   /* index.html BITIR_ELMAS_DK ile ayni */

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
  /* Kaynak DISINDAKI butun kapilar. BITIR kaynak eksigini elmasla
     kapatabildigi icin kaynak denetimi ayri tutuldu; kapi kurallari
     (sira, kale tavani, kale kapisi) elmasla asilamaz. */
  function kapiDenetle(id, hedef) {
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
    return { olur: true, sebep: "" };
  }

  function denetle(id, hedef) {
    var d = kapiDenetle(id, hedef);
    if (!d.olur) return d;

    var b = bedel(id, hedef);
    var eks = eksikKaynaklar(b.kaynaklar);
    if (eks.length) {
      return { olur: false, sebep: "Yetersiz: " +
               eks.map(function (k) { return K_ADI[k]; }).join(", ") };
    }
    return { olur: true, sebep: "" };
  }

  /* ── BITIR MALIYETI ──
     Doner: { elmas, sure, kaynak, eksik:{k:adet} }
     sure  = gereken dakika x BITIR_DK_ELMAS
     kaynak= eksik her kaynagin kendi kuruyla elmas karsiligi */
  function bitirMaliyeti(id, hedef) {
    var b = bedel(id, hedef);
    if (!b) return null;
    var cuzdan = (state && state.kaynaklar) || {};
    var sureE = Math.max(1, Math.ceil(b.dk)) * BITIR_DK_ELMAS;
    var kaynakE = 0, eksik = {};
    Object.keys(b.kaynaklar).forEach(function (k) {
      var acik = b.kaynaklar[k] - (cuzdan[k] || 0);
      if (acik > 0) {
        eksik[k] = acik;
        kaynakE += Math.ceil(acik / (ELMAS_KUR[k] || 500));
      }
    });
    return { elmas: sureE + kaynakE, sure: sureE, kaynak: kaynakE, eksik: eksik };
  }

  function elmasVar() {
    try { return (state && state.diamonds) || 0; } catch (e) { return 0; }
  }

  /* Baslamamis yukseltmeyi ANINDA bitirir. Elindeki kaynak duser,
     acigi elmas kapatir, ustune sure elmasi alinir. Kuyruga hic
     girmez — bu yuzden SIRA_SAYI dolu olsa bile calisir mi? Hayir:
     kapiDenetle sira kontrolunu de yapiyor, kural bozulmasin diye
     bilerek oyle birakildi. */
  function bitirHemen(id) {
    if (!kurDurum()) return { ok: false, sebep: "Hazır değil." };
    bitenleriIsle();

    var hedef = seviye(id) + 1;
    var d = kapiDenetle(id, hedef);
    if (!d.olur) return { ok: false, sebep: d.sebep };

    var m = bitirMaliyeti(id, hedef);
    if (!m) return { ok: false, sebep: "Tablo bulunamadı." };
    if (elmasVar() < m.elmas) {
      return { ok: false, sebep: "Yeterli elmasın yok. Gereken: 💎 " + sayi(m.elmas) };
    }

    var b = bedel(id, hedef);
    Object.keys(b.kaynaklar).forEach(function (k) {
      var d2 = Math.min(state.kaynaklar[k] || 0, b.kaynaklar[k]);
      state.kaynaklar[k] = (state.kaynaklar[k] || 0) - d2;
      if (state.kaynaklar[k] < 0) state.kaynaklar[k] = 0;
    });
    state.diamonds = elmasVar() - m.elmas;
    state.binaSv[id] = Math.min(TAVAN, hedef);

    yaz();
    tazele();
    return { ok: true, sebep: "" };
  }

  /* Suren insaati elmasla aninda bitirir — yalniz KALAN sure odenir,
     kaynak zaten baslarken dusmustu. */
  function bitirSuren(id) {
    var i = kuyrukta(id);
    if (!i) return { ok: false, sebep: "İnşaat yok." };
    var kalan = kalanMs(id);
    var maliyet = Math.max(1, Math.ceil(kalan / 60000)) * BITIR_DK_ELMAS;
    if (elmasVar() < maliyet) {
      return { ok: false, sebep: "Yeterli elmasın yok. Gereken: 💎 " + sayi(maliyet) };
    }
    state.diamonds = elmasVar() - maliyet;
    i.bitis = Date.now() - 1;
    bitenleriIsle();
    yaz();
    tazele();
    return { ok: true, sebep: "" };
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
    /* Tam ekran karartma; kart ORTADA. z-index 45 — kaleici acikken
       nav-dock 40'a cikiyor, altinda kalmasin diye. */
    '.ins-modal{position:fixed;inset:0;z-index:45;' +
      'display:flex;align-items:center;justify-content:center;padding:16px;' +
      'background:rgba(0,20,45,.55);opacity:0;transition:opacity .18s ease;' +
      'font-family:"Baloo 2","Nunito",sans-serif;pointer-events:none;}' +
    '.ins-modal.acik{opacity:1;}' +

    '.ins-modal .ins-kart{pointer-events:auto;width:100%;max-width:400px;' +
      'max-height:84vh;display:flex;flex-direction:column;overflow:hidden;' +
      'background:linear-gradient(180deg,#1fa3ea,#0e6fc0);' +
      'border:1px solid rgba(190,240,255,.85);border-radius:16px;' +
      'box-shadow:0 2px 6px rgba(0,20,45,.3);color:#eaf7ff;' +
      'transform:scale(.94);opacity:0;' +
      'transition:transform .2s cubic-bezier(.2,.9,.3,1),opacity .2s ease;}' +
    '.ins-modal.acik .ins-kart{transform:scale(1);opacity:1;}' +

    /* ── BASLIK SERIDI ── */
    '.ins-modal .ins-baslik{position:relative;flex:0 0 auto;padding:11px 44px 10px;' +
      'background:rgba(0,20,45,.28);border-bottom:1px solid rgba(190,240,255,.18);}' +
    '.ins-modal .ins-bas{font-size:17px;font-weight:800;text-align:center;' +
      'text-shadow:0 1px 2px rgba(0,20,45,.55);}' +
    '.ins-modal .ins-kapat{position:absolute;top:8px;right:10px;width:28px;height:28px;' +
      'border:none;border-radius:8px;background:#e03b47;color:#ffffff;' +
      'font-size:15px;line-height:1;cursor:pointer;font-family:inherit;}' +

    /* Kaydirma GOVDEDE. Tuzak 26: overflow yatayda da kirpar, bu yuzden
       govde icinde tasan sus yok. */
    '.ins-modal .ins-govde{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;' +
      'padding:12px 12px 12px;}' +

    /* ── SEVIYE ROZETLERI ── */
    '.ins-modal .ins-rozetler{display:flex;align-items:center;justify-content:center;' +
      'gap:12px;margin:2px 0 8px;}' +
    '.ins-modal .ins-roz{width:46px;height:46px;border-radius:12px;' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;' +
      'background:rgba(0,20,45,.30);color:#cfeaff;' +
      'border:1px solid rgba(190,240,255,.20);' +
      'text-shadow:0 1px 2px rgba(0,20,45,.55);}' +
    '.ins-modal .ins-roz.hedef{background:#3fbf6a;color:#ffffff;border-color:rgba(255,255,255,.35);}' +
    '.ins-modal .ins-ok{font-size:18px;font-weight:800;color:#5ef08c;}' +

    '.ins-modal .ins-cubuk{height:9px;border-radius:6px;overflow:hidden;' +
      'background:rgba(0,20,45,.30);margin:0 0 12px;}' +
    '.ins-modal .ins-cubuk i{display:block;height:100%;background:#3fbf6a;border-radius:6px;}' +

    /* ── BOLUM BASLIGI ── */
    '.ins-modal .ins-bolum{font-size:13.5px;font-weight:800;text-align:center;' +
      'padding:6px 8px;border-radius:10px;margin:10px 0 6px;' +
      'background:rgba(0,20,45,.24);color:#cfeaff;' +
      'text-shadow:0 1px 2px rgba(0,20,45,.55);}' +

    /* ── SATIR (bonus ve gereksinim ortak) ── */
    '.ins-modal .ins-satir{display:flex;align-items:center;gap:8px;' +
      'padding:7px 8px;border-radius:10px;margin-bottom:4px;' +
      'background:rgba(0,20,45,.16);}' +
    '.ins-modal .ins-satir .ins-sol{flex:1 1 auto;min-width:0;font-size:13.5px;' +
      'font-weight:700;color:#cfeaff;}' +
    '.ins-modal .ins-satir .ins-sag{flex:0 0 auto;font-size:14px;font-weight:800;' +
      'color:#ffffff;font-variant-numeric:tabular-nums;}' +
    '.ins-modal .ins-satir .ins-sag b{color:#5ef08c;font-weight:800;}' +
    '.ins-modal .ins-satir .ins-mik{flex:1 1 auto;font-size:14.5px;font-weight:800;' +
      'color:#ffffff;font-variant-numeric:tabular-nums;' +
      'text-shadow:0 1px 2px rgba(0,20,45,.55);}' +
    '.ins-modal .ins-satir.eksik .ins-mik{color:#ff6b6b;}' +
    '.ins-modal .ins-satir .ins-tik{flex:0 0 auto;font-size:15px;font-weight:800;' +
      'color:#5ef08c;}' +
    '.ins-modal .ins-satir.eksik .ins-tik{color:#ff6b6b;}' +
    '.ins-modal .ins-satir .ins-ust{flex:0 0 30px;height:30px;line-height:30px;' +
      'font-size:22px;text-align:center;}' +
    '.ins-modal img.ins-sim{width:28px;height:28px;object-fit:contain;' +
      'vertical-align:-7px;display:inline-block;}' +

    '.ins-modal .ins-not{font-size:12.5px;line-height:1.45;color:#ffd0d2;margin:6px 0 2px;' +
      'text-align:center;}' +
    '.ins-modal .ins-bilgi{font-size:12.5px;line-height:1.45;color:#cfeaff;margin:6px 0 2px;' +
      'text-align:center;font-variant-numeric:tabular-nums;}' +

    /* ── DUGMELER ── */
    '.ins-modal .ins-dugmeler{display:flex;gap:8px;margin-top:12px;}' +
    '.ins-modal .ins-btn{flex:1 1 0;min-width:0;border:none;border-radius:12px;' +
      'padding:9px 6px;font-family:inherit;font-size:15px;font-weight:800;' +
      'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px;' +
      'text-shadow:0 1px 2px rgba(0,20,45,.35);' +
      'transition:transform .09s ease,filter .09s ease;}' +
    '.ins-modal .ins-btn small{font-size:12px;font-weight:700;opacity:.92;' +
      'font-variant-numeric:tabular-nums;}' +
    '.ins-modal .ins-btn:active{transform:scale(.96);filter:brightness(.93);}' +
    '.ins-modal .ins-btn[disabled]{opacity:.45;cursor:default;}' +
    '.ins-modal .ins-btn[disabled]:active{transform:none;filter:none;}' +
    '.ins-modal .ins-yesil{background:#3fbf6a;color:#ffffff;}' +
    '.ins-modal .ins-sari{background:#ffd257;color:#3a2600;text-shadow:none;}' +
    '.ins-modal .ins-geri{font-size:26px;font-weight:800;color:#ffd257;text-align:center;' +
      'margin:6px 0 4px;font-variant-numeric:tabular-nums;}';

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
    /* SINIF ZORUNLU. Butun CSS ".ins-modal" ile yazili; id yalniz
       kaleici.js'in emniyet agi paneli bulabilsin diye duruyor
       (butonuGuncelle -> "#insaatModal"). Sinif dusunce element
       stilsiz kalir: position static, tam boy blok, gorunmez. */
    kok.className = "ins-modal";
    kok.dataset.bina = id;
    kok.innerHTML = '<div class="ins-kart">' +
                      '<div class="ins-baslik">' +
                        '<div class="ins-bas"></div>' +
                        '<button class="ins-kapat" type="button">✕</button>' +
                      '</div>' +
                      '<div class="ins-govde"></div>' +
                    '</div>';

    document.body.appendChild(kok);
    _kok = kok;

    kok.querySelector(".ins-kapat").addEventListener("click", function () {
      /* Panel kaleici tuvalindeki GELISTIR dugmesinin tam ustune
         aciliyor; o dokunustan arta kalan hayalet tik ✕'e denk
         gelebiliyor (Tuzak 29). Ilk 400 ms kapatma calismaz. */
      if (Date.now() - acilis < 400) return;
      kapat();
    });

    /* Karartmaya dokunmak kapatir. Karta dokunmak kapatmaz —
       e.target kok'un KENDISI ise bosluga basilmis demektir. */
    kok.addEventListener("click", function (e) {
      if (e.target !== kok) return;
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
    kok.style.pointerEvents = "none";
    setTimeout(function () { kok.style.pointerEvents = ""; }, 400);

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
    var basEl = kok.querySelector(".ins-bas");
    if (basEl) basEl.textContent = ADLAR[id] || id;

    var sv = seviye(id);
    var hedef = sv + 1;
    var h = "";

    /* ── İNŞAAT SÜRÜYOR ── */
    var isi = kuyrukta(id);
    if (isi) {
      var toplamMs = Math.max(1, (bedel(id, isi.hedef) || { dk: 1 }).dk * 60000);
      var gecen = Math.max(0, Math.min(1, 1 - kalanMs(id) / toplamMs));
      h += rozetler(sv, isi.hedef, gecen * 100);
      h += '<div class="ins-geri">' + sureYaz(kalanMs(id)) + '</div>';
      var bm = Math.max(1, Math.ceil(kalanMs(id) / 60000)) * BITIR_DK_ELMAS;
      h += '<div class="ins-dugmeler">' +
             '<button class="ins-btn ins-sari" data-is="hizlandir">⏩ HIZLANDIR</button>' +
             '<button class="ins-btn ins-yesil" data-is="bitirSuren"' +
               (elmasVar() >= bm ? "" : " disabled") + '>BİTİR' +
               '<small>💎 ' + sayi(bm) + '</small></button>' +
           '</div>';
      govde.innerHTML = h;
      bagla(govde, id);
      return;
    }

    /* ── TAVAN ── */
    if (sv >= TAVAN) {
      h += rozetler(sv, sv, 100);
      h += '<div class="ins-bilgi">Sv' + TAVAN + " — en yüksek seviye</div>";
      govde.innerHTML = h;
      return;
    }

    h += rozetler(sv, hedef, (sv / TAVAN) * 100);

    var b = bedel(id, hedef);
    if (!b) { govde.innerHTML = h; return; }

    /* ── YÜKSELTME BONUSU ──
       Yalniz OLCULEBILEN bonus yazilir. Kisla / Arastirma / Ana Kale'nin
       seviyesi henuz hicbir sayiya bagli degil; uydurma satir yazmak
       yerine bolum hic acilmaz. */
    var simdiki = dkUretim(id, sv);
    if (simdiki > 0) {
      var artis = dkUretim(id, hedef) - simdiki;
      h += '<div class="ins-bolum">Yükseltme Bonusu</div>';
      h += satir("Üretim / dk", sayi(simdiki) + " <b>+" + sayi(artis) + "</b>");
      h += satir("Saatlik üretim", sayi(simdiki * 60) +
                 " <b>+" + sayi(artis * 60) + "</b>");
    }

    /* ── GEREKENLER ── */
    h += '<div class="ins-bolum">Gerekenler</div>';

    /* Bina kapilari once: kaynak bulsan da bunlar asilmaz. */
    if (id === "kale") {
      var kk = kaleKapisi(hedef);
      var muaf = muafKisla(hedef);
      h += kapiSatiri("🏰", ADLAR[muaf] + " Sv" + (hedef - 1) + " kalabilir", !kk);
      if (kk) h += '<div class="ins-not">' + kk + "</div>";
    } else {
      var kt = kaleTavani(id, hedef);
      h += kapiSatiri("🏰", "Ana Kale Sv" + Math.max(1, hedef - 1), !kt);
      if (kt) h += '<div class="ins-not">' + kt + "</div>";
    }

    var cuzdan = state.kaynaklar || {};
    Object.keys(b.kaynaklar).forEach(function (k) {
      var gerek = b.kaynaklar[k];
      if (!gerek) return;
      var var_ = cuzdan[k] || 0;
      var yeter = var_ >= gerek;
      h += '<div class="ins-satir' + (yeter ? "" : " eksik") + '">' +
             '<span class="ins-ust">' + simge(k) + "</span>" +
             '<span class="ins-mik">' + kisaSayi(var_) + " / " + kisaSayi(gerek) + "</span>" +
             '<span class="ins-tik">' + (yeter ? "✔" : "✖") + "</span>" +
           "</div>";
    });

    /* ── DÜĞMELER ── */
    var d = denetle(id, hedef);
    var kd = kapiDenetle(id, hedef);
    var m = bitirMaliyeti(id, hedef);
    var bitirOlur = kd.olur && m && elmasVar() >= m.elmas;

    if (!d.olur && d.sebep && d.sebep.indexOf("Yetersiz") !== 0 &&
        d.sebep.indexOf("Önce") !== 0 && d.sebep.indexOf("Ana Kale") !== 0) {
      h += '<div class="ins-not">' + d.sebep + "</div>";
    }

    h += '<div class="ins-dugmeler">' +
           '<button class="ins-btn ins-sari" data-is="bitir"' +
             (bitirOlur ? "" : " disabled") + '>BİTİR' +
             '<small>💎 ' + (m ? sayi(m.elmas) : "-") + "</small></button>" +
           '<button class="ins-btn ins-yesil" data-is="basla"' +
             (d.olur ? "" : " disabled") + ">GELİŞTİR" +
             "<small>⏱ " + dkYaz(b.dk) + "</small></button>" +
         "</div>";

    govde.innerHTML = h;
    bagla(govde, id);
  }

  /* İki rozet + ok + ilerleme çubuğu. yuzde 0-100. */
  function rozetler(sv, hedef, yuzde) {
    var y = Math.max(0, Math.min(100, yuzde || 0));
    return '<div class="ins-rozetler">' +
             '<span class="ins-roz">' + sv + "</span>" +
             '<span class="ins-ok">➜</span>' +
             '<span class="ins-roz hedef">' + hedef + "</span>" +
           "</div>" +
           '<div class="ins-cubuk"><i style="width:' + y.toFixed(1) + '%"></i></div>';
  }

  function satir(sol, sag) {
    return '<div class="ins-satir">' +
             '<span class="ins-sol">' + sol + "</span>" +
             '<span class="ins-sag">' + sag + "</span>" +
           "</div>";
  }

  function kapiSatiri(ikon, metin, tamam) {
    return '<div class="ins-satir' + (tamam ? "" : " eksik") + '">' +
             '<span class="ins-ust">' + ikon + "</span>" +
             '<span class="ins-mik" style="font-size:13px">' + metin + "</span>" +
             '<span class="ins-tik">' + (tamam ? "✔" : "✖") + "</span>" +
           "</div>";
  }

  function bagla(govde, id) {
    var b1 = govde.querySelector('[data-is="basla"]');
    if (b1) b1.addEventListener("click", function () {
      var r = baslat(id);
      if (!r.ok) { uyar(r.sebep); return; }
      ciz(id);
    });

    var b3 = govde.querySelector('[data-is="bitir"]');
    if (b3) b3.addEventListener("click", function () {
      var r = bitirHemen(id);
      if (!r.ok) { uyar(r.sebep); return; }
      ciz(id);
    });

    var b4 = govde.querySelector('[data-is="bitirSuren"]');
    if (b4) b4.addEventListener("click", function () {
      var r = bitirSuren(id);
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
    bitirMaliyeti: bitirMaliyeti,
    bitirHemen: bitirHemen,
    bitirSuren: bitirSuren,
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
