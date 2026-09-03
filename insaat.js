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

  var SURUM = "insaat-16";

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
    /* Tesisler: kışla maliyet tablosunu kullanır ama kışla değildir —
       EĞİT düğmesi çıkmaz, muafiyet döngüsüne girmez, Ana Kale
       kapısında KENDİ eşik takvimleri vardır (KALE_ESIK). */
    ittifak:   "tesis",  hastane: "tesis",
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
    { odun: 21840, demir: 21840, et: 14560, su: 10920, enerji: 3640, dk:   12 },
    { odun: 54600, demir: 54600, et: 36400, su: 27300, enerji: 9100, dk:   27 },
    { odun: 134400, demir: 134400, et: 89600, su: 67200, enerji: 22400, dk:   66 },
    { odun: 336000, demir: 336000, et: 224000, su: 168000, enerji: 56000, dk:  135 },
    { odun: 840000, demir: 840000, et: 560000, su: 420000, enerji: 140000, dk:  300 },
    { odun: 2100000, demir: 2100000, et: 1400000, su: 1050000, enerji: 350000, dk:  660 },
    { odun: 5208000, demir: 5208000, et: 3472000, su: 2604000, enerji: 868000, dk: 1620 },
    { odun: 13104000, demir: 13104000, et: 8736000, su: 6552000, enerji: 2184000, dk: 3600 },
    { odun: 32760000, demir: 32760000, et: 21840000, su: 16380000, enerji: 5460000, dk: 8460 },
  ];

  /* ── GENEL DENGE ÇARPANLARI ──
     Tablolar (T_KAYNAK / T_KISLA / T_KALE) HAM değerlerdir; oyunda
     görünen bedel bunlarla çarpılmış halidir. Tabloları elle çarpıp
     yazmak dengeyi iki yerden ayarlamak olurdu: bir daha "hangi sayı
     ham, hangisi ölçekli" diye bakmak gerekirdi.

     Uygulandığı TEK yer bedel(). Tabloları okuyan başka kimse yok,
     yükseltme paneli de zamanlayıcı da bedel()'den geçiyor.

     MALIYET_CARPANI 6   = maliyetler %500 arttırıldı (1 + 5)
     SURE_CARPANI    3.5 = süreler %250 uzatıldı      (1 + 2,5)      */
  var MALIYET_CARPANI = 6;
  var SURE_CARPANI    = 3.5;

  /* Her seviyede üretim bu kadar katlanır (Sv1 = 1.00) */
  var URETIM_ARTIS = 1.45;

  /* ── BİNA GÜCÜ ──
     Her binanın seviyesi kale gücüne puan katar. Taban Sv1 değeri,
     çarpan tablosu seviyeye göre. İkisi de TEK YERDE burada;
     index.html -> computePlayerPower bunu INSAAT.toplamGuc() ile okur,
     dosya yüklenmemişse 0 döner ve güç eski haliyle çalışmaya devam eder.

     Ölçek: hepsi Sv1 = 49.000 · hepsi Sv10 = 4.900.000.
     Kıyas: Revolia 100.000, Sv1 Nişancı 10. */
  var GUC_TABAN = {
    kale: 10000,
    sovalye: 5000, asker: 5000, robot: 5000, arastirma: 5000,
    ittifak: 5000, hastane: 4000,
    odun: 2000, ahir: 2000, demir: 2000, su: 2000, enerji: 2000,
  };
  /* Dizi indeksi SEVİYEDİR: [1]=Sv1. Artış ~1,6-2 kat. Daha dik bir
     eğri (×2,7) Sv10'da 20 milyona çıkardı, orduyu anlamsız kılardı. */
  var GUC_KAT = [0, 1, 2, 3.5, 6, 10, 16, 25, 40, 64, 100];

  /* Tek binanın verdiği güç. */
  function binaGucu(id, sv) {
    var t = GUC_TABAN[id];
    if (!t) return 0;
    var n = Math.max(1, Math.min(TAVAN, Math.floor(sv || 1)));
    return Math.round(t * GUC_KAT[n]);
  }

  /* Bir hesabın TÜM binalarından gelen güç. Kendi durumumuz için
     argümansız çağrılır; sıralamada başka oyuncunun kaydı geçilir.
     Bulut kaydında anahtar kısaltılmıştır (bsv), ikisine de bakılır. */
  function toplamGuc(st) {
    var kaynak;
    if (st && typeof st === "object") {
      kaynak = st.binaSv || st.bsv;
    } else if (hazir()) {
      kurDurum();
      kaynak = state.binaSv;
    }
    var g = 0;
    Object.keys(GUC_TABAN).forEach(function (id) {
      var sv = (kaynak && kaynak[id]) || 1;
      g += binaGucu(id, sv);
    });
    return g;
  }

  /* ── HASTANE YARALI KAPASİTESİ ──
     Hastanenin tutabilecegi EN COK yarali asker sayisi. Dizi indeksi
     SEVIYEDIR: [1]=Sv1, [10]=Sv10. Kademe agirligi YOKTUR — Sv1 Sovalye
     de Sv6 Suvari de bir yatak kaplar.

     Bu tablo TEK YERDE burada durur. Yaraliyi hastaneye yazan uc yol
     (index.html sendWoundedToHospital, pvp.js savunan yolu, sefer.js
     donusu) buradan okur; ikinci bir tablo acilirsa bir sayi
     degistiginde savasin iki tarafi farkli kapasite hesaplar.

     Olcek notu: sefer kapasitesi tabani 5.000 ve kahramanlarla katlaniyor.
     Sv1 hastane 80.000 ile tek seferden donen ordunun yaralisini rahat
     alir; sinir orta oyunda ordu buyudukce isirmaya baslar. */
  var HASTANE_KAP = [
    0,
    80000, 130000, 250000, 300000, 450000,
    600000, 850000, 900000, 950000, 1000000,
  ];

  /* Verilen seviyenin kapasitesi. Seviye tabloda yoksa uclara kirpilir —
     kayit bozulsa bile 0 donup butun yaraliyi oldurmez. */
  function hastaneKapasite(sv) {
    var n = Math.max(1, Math.min(TAVAN, Math.floor(Number(sv) || 1)));
    return HASTANE_KAP[n] || HASTANE_KAP[1];
  }

  /* Bir HESABIN kapasitesi. Argumansiz kendi durumumuzu okur; bir state
     nesnesi verilirse onunkini. toplamGuc ile ayni desen: bulut kaydinda
     anahtar kisaltilmistir (bsv), ikisine de bakilir.

     Savunan cevrimdisiyken saldiranin istemcisi savunanin hastanesine
     yaziyor (pvp.js). Orada KENDI binaSv'imiz degil, savunanin state'i
     gecilmeli — yoksa herkes kendi hastane seviyesini karsi tarafa
     dayatir. */
  function hastaneKapasiteHesap(st) {
    var kaynak;
    if (st && typeof st === "object") {
      kaynak = st.binaSv || st.bsv;
    } else if (hazir()) {
      kurDurum();
      kaynak = state.binaSv;
    }
    return hastaneKapasite((kaynak && kaynak.hastane) || 1);
  }

  /* Hastanede SU AN kac yarali var.
     Iki bicimi de sayar: yeni kayit satir basina {adet:N} tutar, eski
     kayit her asker icin AYRI nesne acardi (temizle.js bunu duzeltiyor
     ama eski hesaplarda hala olabilir). Eski satirda adet yoktur, 1
     sayilir — yoksa eski hesaplarda hastane bos gorunur ve sinir hic
     isirmaz. */
  function hastaneDoluluk(st) {
    var kaynak;
    if (st && typeof st === "object") kaynak = st.hospital;
    else if (hazir()) kaynak = state.hospital;
    if (!Array.isArray(kaynak)) return 0;
    var n = 0;
    for (var i = 0; i < kaynak.length; i++) {
      var r = kaynak[i];
      if (!r) continue;
      var a = Number(r.adet);
      n += (isFinite(a) && a > 0) ? Math.round(a) : 1;
    }
    return n;
  }

  function hastaneBosYer(st) {
    return Math.max(0, hastaneKapasiteHesap(st) - hastaneDoluluk(st));
  }

  /* ── TEK KAPI ──
     Yaraliyi hastaneye yazan HER yol once buradan gecer. Sigan kismi
     `alinan`, sigmayan kismi `tasan` olarak doner; tasan OLUR.

     Neden tek kapi: yarali uc ayri yerden hastaneye giriyor (kendi
     savasimiz, savunan cevrimdisiyken saldiranin istemcisi, seferden
     donen ordu). Her biri kendi kirpmasini yazsaydi ikinci teslimat
     yolu acilirdi — Tuzak 8'in aynisi.

     Kirpma sirasi: haritanin ANAHTAR SIRASI. Cagiran taraf sirayi
     belirler (pvp.js SAF_SIRASI ile gecer), boylece iki tarafta ayni
     girdi ayni sonucu verir. Oranti hesabi yapilmiyor; kesirli asker
     yuvarlanirken toplam kapasiteyi asabilirdi.

     st verilmezse kendi hesabimiz okunur.                            */
  function hastaneyeSigan(st, yaraliHarita) {
    var bos = hastaneBosYer(st);
    var alinan = {}, tasan = {}, tasanToplam = 0;
    var ids = Object.keys(yaraliHarita || {});
    for (var i = 0; i < ids.length; i++) {
      var uid = ids[i];
      var n = Math.max(0, Math.round(Number(yaraliHarita[uid]) || 0));
      if (n <= 0) continue;
      var yer = Math.min(n, bos);
      if (yer > 0) { alinan[uid] = yer; bos -= yer; }
      if (n > yer) { tasan[uid] = n - yer; tasanToplam += n - yer; }
    }
    return { alinan: alinan, tasan: tasan, tasanToplam: tasanToplam, kalanBos: bos };
  }

  /* ── KIŞLA MUAFİYETİ — SABİT ÜÇLÜ DÖNGÜ ──
     Ana Kale'yi Sv N'ye çıkarmak için diğerleri Sv N-1 olmalı.
     Bu kışla bir kademe daha geride, Sv N-2 kalabilir.
     Araştırma dahil değil, oyuncu seçmez, döngü sabittir. */
  var MUAF_SIRA = ["robot", "sovalye", "asker"];   /* Nişancı → Savunucu → Koruyucu */
  function muafKisla(hedefSv) {
    return MUAF_SIRA[(hedefSv - 2) % MUAF_SIRA.length];
  }

  var ADLAR = {
    kale: "Ana Kale", odun: "Odun", ahir: "Ahır", demir: "Demir",
    su: "Su", enerji: "Enerji", arastirma: "Araştırma",
    sovalye: "Savunucu Kışlası", asker: "Koruyucu Kışlası", robot: "Nişancı Kışlası",
    ittifak: "İttifak Binası", hastane: "Hastane",
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
  /* ── ANA KALE EŞİK TAKVİMİ ──
     Ana Kale bu seviyelerdeyken ilgili tesisin bir kademe daha
     yükselmiş olması gerekir. Gereken tesis seviyesi = listede
     kalenin MEVCUT seviyesinden (hedef-1) küçük eşit kaç sayı varsa.

     ── NEDEN hedef DEĞİL de hedef-1 ──
     Tesisler de Ana Kale'yi geçemiyor. "Kale Sv2 için İttifak Sv2"
     deseydik, İttifak kale Sv1'i geçemediği için Sv2'ye çıkamaz,
     çıkamadığı için kale de Sv2 olamazdı — daha ilk adımda kilit.
     Bir kaydırma zinciri açıyor; Sv1→Sv10 simülasyonu 108 adımda
     kilitlenmeden tamamlanıyor.
     Kışlalar ve Araştırma bu tabloya girmez; onlar hep hedef-1. */
  var KALE_ESIK = {
    ittifak: [1, 2, 3, 5, 7, 9],
    hastane: [1, 2, 3, 4, 6, 8],
  };

  function tesisGereken(id, kaleHedef) {
    var L = KALE_ESIK[id];
    if (!L) return 1;
    var n = 0;
    for (var i = 0; i < L.length; i++) if (L[i] <= kaleHedef - 1) n++;
    return Math.max(1, n);
  }

  var ELMAS_KUR = { et: 600, odun: 500, demir: 450, su: 300, enerji: 200 };

  /* Bina gorseli TEK YERDE: kaleici.js -> BINALAR[].gorsel.
     Burada ikinci bir tablo tutulsaydi bir gorsel degisince iki
     yer duzeltmek gerekirdi. kaleici.js bu dosyadan SONRA yuklenir,
     o yuzden calisma aninda okunur, yukleme aninda degil. */
  function binaGorseli(id) {
    try {
      var L = window.KALEICI && window.KALEICI.BINALAR;
      if (!L) return null;
      for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i].gorsel;
    } catch (e) {}
    return null;
  }

  /* Android \u2714/\u2716'yi RENKLI EMOJI olarak cizer; CSS color
     hic tutmaz, isaretler kahverengi cikar. \uFE0E metin glifini
     zorlar, boylece yesil/kirmizi uygulanir. */
  var TIK   = "\u2713\uFE0E";
  var CARPI = "\u2715\uFE0E";

  var BINA_EMOJI = {
    kale: "🏰", odun: "🪵", ahir: "🐄", demir: "⛏️", su: "💧", enerji: "⚡",
    arastirma: "🔬", sovalye: "⚔️", asker: "🛡️", robot: "🏹",
  };

  /* Bina simgesi — kaynak simgeleriyle AYNI olcude (.ins-sim). */
  function binaSimgesi(id) {
    var d = binaGorseli(id);
    var e = BINA_EMOJI[id] || "🏠";
    if (!d) return e;
    return '<img class="ins-sim" src="' + d + '" alt="" ' +
           'onerror="this.onerror=null;this.replaceWith(' +
           "document.createTextNode('" + e + "'))\">";
  }
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

  /* Ham tablo degerini oyundaki bedele cevirir. Yuvarlama BURADA
     yapilir; panelde 1.234,5 odun gostermemek icin tam sayiya cikilir. */
  function olcekliKaynak(v) {
    var n = Number(v) || 0;
    if (n <= 0) return n;
    return Math.round(n * MALIYET_CARPANI);
  }
  function olcekliDk(v) {
    var n = Number(v) || 0;
    if (n <= 0) return n;
    return Math.max(1, Math.round(n * SURE_CARPANI));
  }

  /* Bir yükseltmenin bedeli: { kaynaklar:{...}, dk:N }
     DONEN DEGERLER OLCEKLIDIR — cagiran taraf bir daha carpmaz. */
  function bedel(id, hedef) {
    var t = TIP[id];
    if (!t || hedef < 2 || hedef > TAVAN) return null;

    if (t === "kaynak") {
      var s = T_KAYNAK[hedef];
      var o = ODEME[id];
      if (!s || !o) return null;
      var k = {};
      k[o.ana] = olcekliKaynak(s.ana);
      k[o.yan] = (k[o.yan] || 0) + olcekliKaynak(s.yan);
      return { kaynaklar: k, dk: olcekliDk(s.dk) };
    }

    /* kisla ve tesis ayni tabloyu kullanir; ayirmak icin ikinci bir
       tablo yazmak, dengeyi iki yerden ayarlamak demek olurdu. */
    var tab = (t === "kale") ? T_KALE : T_KISLA;
    var r = tab[hedef];
    if (!r) return null;
    return {
      kaynaklar: {
        odun:   olcekliKaynak(r.odun),
        demir:  olcekliKaynak(r.demir),
        et:     olcekliKaynak(r.et),
        su:     olcekliKaynak(r.su),
        enerji: olcekliKaynak(r.enerji),
      },
      dk: olcekliDk(r.dk),
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
  /* Ana Kale kapisinin SATIR SATIR hali — panel bunu cizer.
     kaleKapisi() ile AYNI kuraldan uretilir, ikinci bir kural yok. */
  function kaleKapisiListe(hedef) {
    var muaf = muafKisla(hedef);
    var liste = [];
    Object.keys(TIP).forEach(function (id) {
      if (id === "kale") return;
      var gerek;
      if (KALE_ESIK[id])      gerek = tesisGereken(id, hedef);
      else if (id === muaf)   gerek = hedef - 2;
      else                    gerek = hedef - 1;
      if (gerek < 1) gerek = 1;
      liste.push({ id: id, gerek: gerek, tamam: seviye(id) >= gerek });
    });
    return liste;
  }

  function kaleKapisi(hedef) {
    var eksik = [];
    kaleKapisiListe(hedef).forEach(function (g) {
      if (!g.tamam) eksik.push(ADLAR[g.id] + " Sv" + g.gerek);
    });
    if (!eksik.length) return null;
    return "Önce şunlar gerekli: " + eksik.join(" · ");
  }

  /* ── HİYERARŞİ: HİÇBİR BİNA ANA KALE'Yİ GEÇEMEZ ──
     Bina tavanı = Ana Kale'nin seviyesi. Ana Kale Sv N için de
     diğerleri Sv N-1 ister (kaleKapisiListe).

     KİLİTLENME NEDEN OLMUYOR — bu ikisi birbirini kilitlermiş gibi
     durur, kilitlemez:
       Kale Sv1, herkes Sv1 → kale Sv2 için gereken Sv1, sağlanmış.
       Kale Sv2 → binalar artık Sv2'ye çıkabilir.
       Hepsi Sv2 → kale Sv3 olur. Ve böyle sürer.
     Kilit ancak kale kapısı Sv N isteseydi olurdu (eski hata);
     Sv N-1 istediği için zincir her adımda kendini açıyor. */
  function kaleTavani(id, hedef) {
    if (id === "kale") return null;
    if (hedef <= seviye("kale")) return null;
    return "Ana Kale Sv" + seviye("kale") + ". Önce Ana Kale'yi Sv" +
           hedef + " yap.";
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
    /* Elmasla BITIR'de seviye ANINDA artar; 10 saniyelik turu beklemeden
       harita da degissin. Seviye degismediyse ic kapida durur. */
    try { kaleGorunumuTazele(); } catch (e) {}
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
  /* Tema ELLE taklit edilmiyor: renkler index.html'deki .overlay-card,
     .overlay-close ve .hsm-* kurallarindan alindi. Oyunun her yerinde
     ayni kart mavisi, ayni kirmizi capraz, ayni altin dugme. */
  var CSS =
    '.ins-modal{position:fixed;inset:0;z-index:45;' +
      'display:flex;align-items:center;justify-content:center;padding:18px;' +
      'background:rgba(2,10,26,.72);opacity:0;transition:opacity .18s ease;' +
      'font-family:"Baloo 2","Nunito",sans-serif;pointer-events:none;}' +
    /* KOK SEBEP: kok pointer-events:none idi, karartmaya yapilan
       dokunus tuvale gecip gidiyordu — disari basinca kapanmiyordu.
       Panel acikken kok dokunus alir; kapaliyken almaz ki tuval
       normal calissin. */
    '.ins-modal.acik{opacity:1;pointer-events:auto;}' +

    '.ins-modal .ins-kart{pointer-events:auto;position:relative;' +
      'width:100%;max-width:318px;max-height:86vh;' +
      'display:flex;flex-direction:column;overflow:hidden;' +
      'background:linear-gradient(180deg,#1fa3ea,#0e6fc0);' +
      'border:1px solid rgba(190,240,255,.85);border-radius:22px;' +
      'box-shadow:none;color:#fff;' +
      'transform:scale(.94);opacity:0;' +
      'transition:transform .2s cubic-bezier(.2,.9,.3,1),opacity .2s ease;}' +
    '.ins-modal.acik .ins-kart{transform:scale(1);opacity:1;}' +

    /* Baslik: seritsiz. .overlay-card h2 ile ayni olcu ve golge. */
    '.ins-modal .ins-baslik{position:relative;flex:0 0 auto;padding:12px 14px 6px;}' +
    '.ins-modal .ins-bas{font-size:18px;font-weight:900;text-align:center;}' +
    '.ins-modal .ins-govde{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;' +
      'padding:2px 14px 14px;}' +

    /* ── SEVIYE ROZETLERI ── kart olcusu .hsm-card-item ile ayni aile */
    '.ins-modal .ins-rozetler{display:flex;align-items:center;justify-content:center;' +
      'gap:10px;margin:0 0 6px;}' +
    '.ins-modal .ins-roz{width:36px;height:36px;border-radius:11px;' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-size:18px;font-weight:900;font-variant-numeric:tabular-nums;' +
      'background:linear-gradient(180deg,#3d7ccc 0%,#22488f 55%,#152e5e 100%);' +
      'border:none;color:#dff2ff;}' +
    '.ins-modal .ins-roz.hedef{background:linear-gradient(180deg,#5ce07a,#22a34a);' +
      'color:#fff;}' +
    '.ins-modal .ins-ok{font-size:16px;font-weight:900;color:#dff2ff;}' +

    '.ins-modal .ins-cubuk{height:6px;border-radius:9px;overflow:hidden;' +
      'background:rgba(3,16,38,.55);margin:0 0 6px;}' +
    '.ins-modal .ins-cubuk i{display:block;height:100%;' +
      'background:linear-gradient(180deg,#5ce07a,#22a34a);border-radius:9px;}' +

    '.ins-modal .ins-bolum{font-size:13px;font-weight:800;letter-spacing:.6px;' +
      'text-align:center;color:#dff2ff;margin:7px 0 3px;}' +

    /* ── SATIR ── */
    '.ins-modal .ins-satir{display:flex;align-items:center;gap:6px;' +
      'padding:1px 7px;border-radius:8px;margin-bottom:2px;' +
      'background:rgba(3,16,38,.30);' +
      'border:1px solid rgba(190,240,255,.14);}' +
    '.ins-modal .ins-satir .ins-sol{flex:1 1 auto;min-width:0;font-size:12.5px;' +
      'font-weight:800;color:#dff2ff;}' +
    '.ins-modal .ins-satir .ins-sag{flex:0 0 auto;font-size:13px;font-weight:900;' +
      'color:#fff;font-variant-numeric:tabular-nums;}' +
    '.ins-modal .ins-satir .ins-sag b{color:#5ce07a;font-weight:900;}' +
    '.ins-modal .ins-satir .ins-mik{flex:1 1 auto;font-size:12.5px;line-height:1.5;' +
      'font-weight:900;color:#fff;font-variant-numeric:tabular-nums;}' +
    '.ins-modal .ins-satir.eksik .ins-mik{color:#ff8b8f;}' +
    '.ins-modal .ins-satir .ins-mik.ins-yapi{font-size:12px;font-weight:800;}' +
    '.ins-modal .ins-satir .ins-tik{flex:0 0 auto;font-size:13px;font-weight:900;' +
      'color:#5ce07a;}' +
    '.ins-modal .ins-satir.eksik .ins-tik{color:#ff8b8f;}' +
    '.ins-modal .ins-satir .ins-ust{flex:0 0 17px;height:17px;line-height:17px;' +
      'font-size:14px;text-align:center;}' +
    '.ins-modal img.ins-sim{width:17px;height:17px;object-fit:contain;' +
      'vertical-align:-4px;display:inline-block;}' +

    '.ins-modal .ins-not{font-size:12px;line-height:1.35;color:#ffd0d2;margin:5px 0 1px;' +
      'text-align:center;}' +
    '.ins-modal .ins-bilgi{font-size:12px;line-height:1.35;color:#dff2ff;margin:5px 0 1px;' +
      'text-align:center;font-variant-numeric:tabular-nums;}' +

    /* ── DUGMELER ── olcu .hsm-btn ile ayni: 9px/6px dolgu, iki satir */
    '.ins-modal .ins-dugmeler{display:flex;gap:7px;margin-top:9px;}' +
    '.ins-modal .ins-btn{flex:1 1 0;min-width:0;border:none;border-radius:10px;' +
      'padding:5px 6px;font-family:inherit;font-size:14px;font-weight:900;' +
      'letter-spacing:.4px;line-height:1.2;color:#fff;cursor:pointer;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;' +
      'box-shadow:none;transition:transform .09s ease,filter .09s ease;}' +
    '.ins-modal .ins-btn small{font-size:12px;font-weight:900;line-height:1.15;' +
      'font-variant-numeric:tabular-nums;}' +
    '.ins-modal .ins-btn:active{transform:scale(.96);filter:brightness(.93);}' +
    '.ins-modal .ins-btn[disabled]{opacity:.45;cursor:default;}' +
    '.ins-modal .ins-btn[disabled]:active{transform:none;filter:none;}' +

    /* Altin = bitirme (.hsm-finish), mavi = ikincil (.hsm-use), yesil = onay */
    '.ins-modal .ins-altin{background:linear-gradient(180deg,#ffd257,#e0a12c);}' +
    '.ins-modal .ins-mavi{background:linear-gradient(180deg,#3d7ccc 0%,#22488f 55%,#152e5e 100%);}' +
    '.ins-modal .ins-yesil{background:linear-gradient(180deg,#5ce07a,#22a34a);}' +

    '.ins-modal .ins-geri{font-size:21px;font-weight:900;color:#ffd257;text-align:center;' +
      'margin:2px 0 0;font-variant-numeric:tabular-nums;}' +

    /* ── GEREKENLER KUTUSU ──
       Liste uzunsa panel bir ekrana sığmıyordu. Yalnız BU kutu kayar,
       panelin geri kalanı (rozetler, bonus, düğmeler) yerinde durur.
       Yükseklik TAM 7 SATIR: satır 23px + 2px ara = 25px, 7x25 = 175px.
       Satır yüksekliği burada SABİTLENİR, yoksa sekizinci satır yarım
       görünür ve "7 tane" kuralı bozulur.
       Tuzak 26: overflow-y YATAYDA da kırpar — kaydırma çubuğunun
       genişliği kadar sağdan pay bırakıldı, GİT düğmesi kesilmiyor. */
    '.ins-modal .ins-gerek{max-height:175px;overflow-y:auto;overflow-x:hidden;' +
      'padding-right:6px;}' +
    '.ins-modal .ins-gerek .ins-satir{height:23px;box-sizing:border-box;' +
      'margin-bottom:2px;}' +
    /* Çubuk: düz renk. Gölge, kabartı, yuvarlak kapak yok. Yiv listenin
       kendi boyu kadar, ayrı bir uzunluk verilmez. */
    '.ins-modal .ins-gerek::-webkit-scrollbar{width:5px;}' +
    '.ins-modal .ins-gerek::-webkit-scrollbar-track{background:rgba(3,16,38,.45);' +
      'border-radius:3px;}' +
    '.ins-modal .ins-gerek::-webkit-scrollbar-thumb{background:#bef0ff;' +
      'border-radius:3px;}' +
    '.ins-modal .ins-gerek{scrollbar-width:thin;' +
      'scrollbar-color:#bef0ff rgba(3,16,38,.45);}' +

    /* GİT: eksik satırın sağında, ✖ yerine. Aynı ölçüde durması için
       yüksekliği ✖ ile eşit (17px), satır boyunu büyütmez. */
    '.ins-modal .ins-git{flex:0 0 auto;height:17px;line-height:17px;padding:0 7px;' +
      'border:none;border-radius:6px;font-family:inherit;font-size:10.5px;' +
      'font-weight:900;letter-spacing:.3px;color:#fff;cursor:pointer;' +
      'background:#e05a5f;box-shadow:none;' +
      'transition:transform .09s ease,filter .09s ease;}' +
    '.ins-modal .ins-git:active{transform:scale(.96);filter:brightness(.93);}';

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
                      '</div>' +
                      '<div class="ins-govde"></div>' +
                    '</div>';

    document.body.appendChild(kok);
    _kok = kok;

    /* KAPATMA DUGMESI YOK — panel disina dokunmak kapatir.
       Karartmaya dokunmak kapatir. Karta dokunmak kapatmaz —
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
             '<button class="ins-btn ins-altin" data-is="bitirSuren"' +
               (elmasVar() >= bm ? "" : " disabled") + '>BİTİR' +
               '<small>' + ELMAS("insaat") + ' ' + sayi(bm) + '</small></button>' +
             '<button class="ins-btn ins-mavi" data-is="hizlandir">HIZLANDIR</button>' +
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
    h += '<div class="ins-bolum">Yükseltme Bonusu</div>';
    if (simdiki > 0) {
      var artis = dkUretim(id, hedef) - simdiki;
      h += satir("Üretim / dk", sayi(simdiki) + " <b>+" + sayi(artis) + "</b>");
      h += satir("Saatlik üretim", sayi(simdiki * 60) +
                 " <b>+" + sayi(artis * 60) + "</b>");
    }
    /* Kale gücü her binada var — kışla, tesis ve Ana Kale'de bu bölüm
       eskiden bomboş açılmıyordu, artık tek satırla da olsa doluyor. */
    /* Hastanenin OLCULEBILIR bonusu yarali kapasitesidir. Diger
       binalarda boyle bir sayi olmadigi icin satir hic acilmaz. */
    if (id === "hastane") {
      var k0 = hastaneKapasite(sv), k1 = hastaneKapasite(hedef);
      if (k1 > k0) {
        h += satir("Yaralı kapasitesi",
                   sayi(k0) + " <b>+" + sayi(k1 - k0) + "</b>");
      }
    }

    var g0 = binaGucu(id, sv), g1 = binaGucu(id, hedef);
    if (g1 > g0) {
      h += satir("Kale gücü", sayi(g0) + " <b>+" + sayi(g1 - g0) + "</b>");
    }

    /* ── GEREKENLER ── */
    h += '<div class="ins-bolum">Gerekenler</div>';

    /* Bina kapilari once: kaynak bulsan da bunlar asilmaz.
       Metin aciklama YOK — her sart kendi satirinda, gorseli ve
       ✔/✖ isaretiyle. Muaf kislanin Sv N-1 istemesi zaten satirda
       gorunuyor, ayrica cumleyle anlatmaya gerek kalmiyor. */
    h += '<div class="ins-gerek">';

    if (id === "kale") {
      kaleKapisiListe(hedef).forEach(function (g) {
        h += kapiSatiri(binaSimgesi(g.id), ADLAR[g.id] + " Sv" + g.gerek,
                        g.tamam, g.tamam ? null : ("bina:" + g.id));
      });
    } else {
      var kt = kaleTavani(id, hedef);
      h += kapiSatiri(binaSimgesi("kale"),
                      ADLAR.kale + " Sv" + hedef, !kt,
                      kt ? "bina:kale" : null);
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
             (yeter
               ? '<span class="ins-tik">' + TIK + "</span>"
               : '<button class="ins-git" data-git="kaynak:' + k + '">GİT</button>') +
           "</div>";
    });

    h += "</div>";

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
           '<button class="ins-btn ins-altin" data-is="bitir"' +
             (bitirOlur ? "" : " disabled") + '>BİTİR' +
             '<small>' + ELMAS("insaat") + ' ' + (m ? sayi(m.elmas) : "-") + "</small></button>" +
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

  /* git: null ise ✔/✖ basılır, doluysa ✖ yerine GİT düğmesi çıkar. */
  function kapiSatiri(ikon, metin, tamam, git) {
    return '<div class="ins-satir' + (tamam ? "" : " eksik") + '">' +
             '<span class="ins-ust">' + ikon + "</span>" +
             '<span class="ins-mik ins-yapi">' + metin + "</span>" +
             (git
               ? '<button class="ins-git" data-git="' + git + '">GİT</button>'
               : '<span class="ins-tik">' + (tamam ? TIK : CARPI) + "</span>") +
           "</div>";
  }

  /* ═══════════════════════════════════════════════════════════
     GİT — eksik olan neyse oyuncuyu oraya götürür
     ═══════════════════════════════════════════════════════════ */

  /* Kaynak paketi ÇANTADA duruyor mu (mağazadan alınca oraya düşer,
     canlı kaynağa girmez; oyuncunun "Kullan" demesi gerekir).
     shopItems magaza.js'te tanımlı; yüklenmemişse false döner. */
  function cantadaPaketVar(kaynakId) {
    try {
      if (typeof shopItems === "undefined" || !shopItems) return false;
      var env = (state && state.inventory) || {};
      for (var i = 0; i < shopItems.length; i++) {
        var it = shopItems[i];
        if (it.isKaynak && it.kaynakId === kaynakId && (env[it.name] || 0) > 0) return true;
      }
    } catch (e) {}
    return false;
  }

  function gitYap(hedef) {
    if (!hedef) return;
    var p = hedef.split(":");
    var tur = p[0], deger = p[1];

    if (tur === "bina") {
      /* Kamera o binaya oturur ve onun paneli açılır. Odaklama
         kaleici.js'in işi; panel kapatmayı da o üstlenir. */
      try {
        if (window.KALEICI && typeof window.KALEICI.gotur === "function") {
          if (window.KALEICI.gotur(deger)) return;
        }
      } catch (e) {}
      /* kaleici.js eski sürümse en azından panel değişsin */
      ac(deger);
      return;
    }

    if (tur === "kaynak") {
      kapat();
      try {
        if (cantadaPaketVar(deger)) {
          if (typeof renderInventory === "function") renderInventory();
          if (typeof openOverlayPanel === "function") openOverlayPanel("inventory");
          return;
        }
        /* Mağaza "Kaynaklar" sekmesi açık gelsin. activeShopCategory
           index.html'de let ile tanımlı; ada doğrudan erişilir. */
        try { activeShopCategory = "kaynak"; } catch (e2) {}
        if (typeof renderShopTabs === "function") renderShopTabs();
        if (typeof renderShop === "function") renderShop();
        if (typeof openOverlayPanel === "function") openOverlayPanel("shop");
      } catch (e3) {}
    }
  }

  function bagla(govde, id) {
    var gitler = govde.querySelectorAll("[data-git]");
    for (var i = 0; i < gitler.length; i++) {
      (function (dg) {
        dg.addEventListener("click", function (e) {
          e.stopPropagation();
          gitYap(dg.getAttribute("data-git"));
        });
      })(gitler[i]);
    }

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

  /* ── HARITADAKI KALE GORSELI ──
     Dugum kaleSeviyesi() ile cizilir, o da state.binaSv.kale'yi okur.
     GIRISTE harita bir kez ciziliyor; bulut kaydi (bsv) o an henuz
     gelmediyse seviye 1 okunuyor ve dugum oyle KALIYOR — panel Sv3
     gosterirken harita Sv1 gorunuyordu. Ustune, insaat bitip seviye
     atladiginda haritayi yeniden cizen ve buluta yayinlayan hicbir
     cagri yoktu; diger oyuncular da eski seviyeyi goruyordu.

     Cozum seviyeyi HATIRLAMAK: degistigi gorulunce bir kez cizilir
     ve yayinlanir. Degismediyse hicbir sey yapilmaz — 10 saniyede bir
     harita cizmek kare hizini oldururdu. */
  var _sonKaleSv = null;

  function kaleGorunumuTazele() {
    if (!hazir()) return;
    var sv = seviye("kale");
    if (_sonKaleSv === sv) return;
    var ilk = (_sonKaleSv === null);
    _sonKaleSv = sv;
    /* Ilk turda da calisir: giriste yanlis seviyeyle cizilmis olabilir.
       Yayin ilk turda YAPILMAZ, cunku o an kayit henuz okunuyor
       olabilir ve buluta eski seviye yazilirdi. */
    try { if (typeof renderBattleMap === "function") renderBattleMap(); } catch (e) {}
    if (ilk) return;
    try { if (typeof publishCastle === "function") publishCastle(); } catch (e) {}
  }

  function turAt() {
    if (!hazir()) return;
    var bitti = bitenleriIsle();
    if (bitti.length) {
      tazele();
      uyar("🏗️ Tamamlandı: " + bitti.join(", "));
      if (_kok && _kok.dataset.bina) ciz(_kok.dataset.bina);
    }
    kaleGorunumuTazele();
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
    kaleGorunumuTazele: kaleGorunumuTazele,

    /* index.html -> computePlayerPower bunu okur. */
    binaGucu: binaGucu,
    toplamGuc: toplamGuc,
    GUC_TABAN: GUC_TABAN,

    /* Yaralı kapasitesi. hastaneKapasite(sv) seviyeden, hastaneKapasitesi(st)
       bir hesabın state'inden okur (argümansız = kendi hesabımız). */
    hastaneKapasite: hastaneKapasite,
    hastaneKapasitesi: hastaneKapasiteHesap,
    hastaneDoluluk: hastaneDoluluk,
    hastaneBosYer: hastaneBosYer,
    hastaneyeSigan: hastaneyeSigan,
    HASTANE_KAP: HASTANE_KAP,

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
