/* kaleici.js — Kale içi sahnesi
   Tek dosya. index.html'e sadece <script src="kaleici.js"></script> eklenir.
   Zemin ve binalar AYNI canvas'a çizilir; DOM/canvas karışımı yok.
   Binalar herkeste sabit — hiçbir kayıt tutulmaz, Firebase'e yazılmaz.
*/
(function () {
  'use strict';

  var SURUM = 'kaleici-49';

  /* ══════════ GEÇİCİ TEŞHİS KATMANI — ?tani=1 ══════════
     Konsol yok, showToast kapalı. Bu blok ekranın üstüne siyah bir
     şerit koyar; egitimAc'ın her adımını ve YAKALANMAMIŞ HATALARI
     oraya yazar. İş bitince bu bloğu ve TANI(...) çağrılarını sil. */
  var TANI_ACIK = (typeof location !== 'undefined' &&
                   location.search.indexOf('tani=1') >= 0);
  var taniKutu = null, taniSatir = 0;

  function TANI(mesaj) {
    if (!TANI_ACIK) return;
    if (!taniKutu) {
      taniKutu = document.createElement('div');
      taniKutu.id = 'kaleiciTani';
      taniKutu.style.cssText =
        'position:fixed;left:0;right:0;top:0;z-index:99999;max-height:42vh;' +
        'overflow:auto;background:rgba(0,0,0,.86);color:#7CFC7C;' +
        'font:600 11px/1.35 monospace;padding:6px 8px;white-space:pre-wrap;' +
        'pointer-events:auto';
      taniKutu.addEventListener('click', function () { taniKutu.textContent = ''; });
      document.body.appendChild(taniKutu);
      window.addEventListener('error', function (ev) {
        TANI('!! HATA: ' + (ev.message || '') + ' @ ' +
             (ev.filename || '').split('/').pop() + ':' + (ev.lineno || ''));
      });
      window.addEventListener('unhandledrejection', function (ev) {
        TANI('!! SOZ HATASI: ' + (ev.reason && (ev.reason.message || ev.reason)));
      });

      /* NABIZ: sayfa yaşıyorsa saniyede bir saat ilerler. Durursa
         sayfa gerçekten kilitlenmiştir (JS bloklanmış / bellek).
         İlerliyor ama dokunuş yazılmıyorsa sorun dokunuşta. */
      var nabizKutu = document.createElement('div');
      nabizKutu.style.cssText =
        'position:fixed;right:4px;bottom:96px;z-index:99999;' +
        'background:rgba(0,0,0,.86);color:#7CFC7C;font:700 11px/1.3 monospace;' +
        'padding:3px 6px;pointer-events:none';
      document.body.appendChild(nabizKutu);
      var n = 0;
      setInterval(function () {
        n++;
        var bel = '';
        try {
          if (performance && performance.memory) {
            bel = '\n' + Math.round(performance.memory.usedJSHeapSize / 1048576) + '/' +
                  Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB';
          }
        } catch (e) {}
        nabizKutu.style.whiteSpace = 'pre';
        nabizKutu.textContent = 'nabiz ' + n + bel;
      }, 1000);

      /* KAPATMAYI KİM ÇAĞIRIYOR? closeOverlayPanel sarılır, çağrı
         yığınının ilk iki satırı ekrana yazılır. Panel açılır açılmaz
         kapanıyorsa suçlu burada görünür. */
      setTimeout(function () {
        if (typeof window.closeOverlayPanel === 'function' && !window._kapatSarildi) {
          window._kapatSarildi = true;
          var asil = window.closeOverlayPanel;
          window.closeOverlayPanel = function (el) {
            var iz = '';
            try { iz = (new Error().stack || '').split('\n').slice(1, 4).join(' | '); } catch (e) {}
            TANI('KAPAT cagrildi: ' + (el && el.id) + '  <<< ' + iz);
            return asil.apply(this, arguments);
          };
          TANI('closeOverlayPanel sarildi');
        }
        if (typeof window.openOverlayPanel === 'function' && !window._acSarildi) {
          window._acSarildi = true;
          var asilAc = window.openOverlayPanel;
          window.openOverlayPanel = function (k) {
            TANI('AC cagrildi: ' + k);
            return asilAc.apply(this, arguments);
          };
        }
      }, 1200);

      /* DOKUNUŞ İZİ: pencere düzeyinde, capture evresinde — belgeden
         de önce çalışır. Dört olay birden dinleniyor; hangisinin
         geldiğini görürsek yutan katmanı buluruz. */
      function tarif(t) {
        if (!t) return '(yok)';
        var sn = (t.className && t.className.baseVal !== undefined)
                 ? t.className.baseVal : (t.className || '');
        return '<' + (t.tagName || '?').toLowerCase() + '>' +
               (t.id ? ' #' + t.id : '') +
               (sn ? ' .' + String(sn).trim().split(/\s+/).slice(0, 2).join('.') : '');
      }
      ['pointerdown', 'touchstart', 'mousedown', 'click'].forEach(function (tur) {
        window.addEventListener(tur, function (ev) {
          TANI(tur + ': ' + tarif(ev.target));
        }, true);
      });

      /* EN ÜSTTEKİ ELEMAN: ekranın ortasında ve sağ üst köşede (✕'in
         olduğu yerde) hit-test. Beklenmedik bir katman oturuyorsa
         burada görünür — dokunuşu yutan odur. */
      var ustKutu = document.createElement('div');
      ustKutu.style.cssText =
        'position:fixed;left:0;right:0;bottom:0;z-index:99999;' +
        'background:rgba(0,0,0,.86);color:#FFD257;font:700 10px/1.3 monospace;' +
        'padding:3px 6px;pointer-events:none;white-space:pre-wrap';
      document.body.appendChild(ustKutu);
      setInterval(function () {
        try {
          var w = window.innerWidth, h = window.innerHeight;
          ustKutu.textContent =
            'orta : ' + tarif(document.elementFromPoint(w / 2, h / 2)) + '\n' +
            'sagust: ' + tarif(document.elementFromPoint(w - 40, h * 0.22));
        } catch (e) { ustKutu.textContent = 'hit-test hata'; }
      }, 700);
    }
    taniSatir++;
    taniKutu.textContent += (taniSatir + '. ' + mesaj + '\n');
    taniKutu.scrollTop = taniKutu.scrollHeight;
  }
  window.KALEICI_TANI = TANI;

  /* ══════════ KARA KUTU — donma yerini bulur ══════════
     Sayfa kilitlendiğinde ekrana yazamayız: boyama yapılamaz.
     Bu yüzden her kritik fonksiyonun ADI çağrılmadan ÖNCE
     localStorage'a yazılır. Oyun donunca sekmeyi kapat, ?tani=1
     ile tekrar aç — şeridin ilk satırı en son hangi fonksiyonun
     İÇİNDE kalındığını söyler. Sadece ?tani=1 ile çalışır. */
  var KK = 'kaleiciKaraKutu';

  function karaKutuYaz(m) {
    try { localStorage.setItem(KK, m); } catch (e) {}
  }

  function karaKutuKur() {
    if (!TANI_ACIK) return;

    var onceki = '';
    try { onceki = localStorage.getItem(KK) || ''; } catch (e) {}
    if (onceki) TANI('>>> ONCEKI OTURUM SON IS: ' + onceki);

    var ADLAR = ['renderTroopsPanel', 'renderTroopQueue', 'applyFinishedTraining',
                 'renderHospitalPanel', 'renderChestUI', 'applyStaminaRegen',
                 'renderStamina', 'renderBattleMap', 'renderInventory',
                 'renderRankPanel', 'openOverlayPanel', 'closeOverlayPanel',
                 'maybeResetChests', 'applyFinishedHospitalRecoveries',
                 'hizlandirmaPenceresi', 'renderBattleLogPanel'];

    ADLAR.forEach(function (ad) {
      var f = window[ad];
      if (typeof f !== 'function' || f.__sarildi) return;
      var sarmal = function () {
        karaKutuYaz('ICINDE: ' + ad + ' @' + new Date().toLocaleTimeString());
        var r = f.apply(this, arguments);
        karaKutuYaz('bitti: ' + ad);
        return r;
      };
      sarmal.__sarildi = true;
      try { window[ad] = sarmal; TANI(ad + ' sarildi'); } catch (e) {}
    });

    /* Saniyelik nabız da diske yazılır: ölüm ANI böyle anlaşılır */
    setInterval(function () {
      try {
        var v = localStorage.getItem(KK) || '';
        if (v.indexOf('ICINDE:') !== 0) karaKutuYaz('bos @' + new Date().toLocaleTimeString());
      } catch (e) {}
    }, 1000);
  }
  /* Kutu, sarmalayıcıların kurulabilmesi için açılışta hazırlanır */
  if (TANI_ACIK) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { TANI('tani acik — ' + SURUM); });
    } else { TANI('tani acik — ' + SURUM); }
  }

  var CFG = {
    grid: 13,
    zeminPay: 8,      // bina alanının dışına çizilen dolgu karo sayısı
    tileW: 64,
    tileH: 46,         // yüksek = daha dik bakış
    zoom: 1.0,
    zoomMin: 0.6,
    zoomMax: 2.20,
    karoUzak: 9.0,     // en uzakta ekran genişliğinde kaç karo görünsün
    karoYakin: 3.5,    // en yakında kaç karo
    karoAcilis: 6.0    // açılışta kaç karo
  };

  /* Bina görselinin taban genişliğine oranı — 1.00 = taban kadar geniş.
     Bina başına ince ayar: BINALAR içindeki 'olcek' ve 'dy' (piksel). */
  var GORSEL_PAY = 0.90;

  /* ---- Binalar: konum = sol üst karo, en/boy = kapladığı karo ----
     gorsel: kök dizindeki .webp dosya adı. Dosya yoksa emojiye döner.  */
  var BINALAR = [
    /* 2x2 · görsel boyu 3x3'teki gibi kalsın diye olcek 0.66 → 0.99
       (genişlik karo sayısıyla çarpılıyor: 2 x 0.99 = 3 x 0.66) */
    { id: 'kale',      ad: 'Ana Kale',         emoji: '🏰', gorsel: 'anakale.webp',       gx: -2, gy: 6,  en: 2, boy: 2, olcek: 0.99 },
    { id: 'sovalye',   ad: 'Savunucu Kışlası', emoji: '⚔️', gorsel: 'savunucukisla.webp', gx: 2,  gy: 6,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'asker',     ad: 'Koruyucu Kışlası', emoji: '🛡️', gorsel: 'koruyucukisla.webp', gx: 2,  gy: 3,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'robot',     ad: 'Nişancı Kışlası',  emoji: '🤖', gorsel: 'nisancikisla.webp',  gx: 2,  gy: 9,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'arastirma', ad: 'Araştırma',        emoji: '🔬', gorsel: 'arastirma.webp',     gx: -4, gy: 3,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'fuze',      ad: 'Füze Merkezi',     emoji: '🚀', gorsel: 'fuzemerkezi.webp',   gx: -1, gy: 3,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'konuk',     ad: 'Konuk Evleri',     emoji: '🏘️', gorsel: 'konukevleri.webp',   gx: -6, gy: 1,  en: 2, boy: 2, olcek: 0.60 },
    { id: 'oyun',      ad: 'Oyun Merkezi',     emoji: '🎲', gorsel: 'oyunmerkezi.webp',   gx: 5,  gy: 8,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'ittifak',   ad: 'İttifak Binası',   emoji: '🤝', gorsel: 'ittifakbinasi.webp', gx: 5,  gy: 5,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'hastane',   ad: 'Hastane',          emoji: '🏥', gorsel: 'hastanebina.webp',   gx: -7, gy: 7,  en: 2, boy: 2, olcek: 0.66 },

    { id: 'odun',      ad: 'Odun',             emoji: '🪵', gorsel: 'odunuretim.webp',    gx: -2, gy: 11, en: 1, boy: 1, olcek: 0.66 },
    { id: 'demir',     ad: 'Demir',            emoji: '⛏️', gorsel: 'demiruretim.webp',   gx: 0,  gy: 11, en: 1, boy: 1, olcek: 0.66 },
    { id: 'su',        ad: 'Su',               emoji: '💧', gorsel: 'suuretim.webp',      gx: -1, gy: 13, en: 1, boy: 1, olcek: 0.66 },
    { id: 'enerji',    ad: 'Enerji',           emoji: '⚡', gorsel: 'enerjiuretim.webp',  gx: -3, gy: 13, en: 1, boy: 1, olcek: 0.66 },
    { id: 'ahir',      ad: 'Ahır',             emoji: '🐄', gorsel: 'ahiruretim.webp',    gx: -4, gy: 11, en: 1, boy: 1, olcek: 0.66 }
  ];


  /* ---- SÜSLER: dağlar ----
     Bina değildir: oyuncu göremez, seçemez, taşıyamaz; Firebase'e
     yazılmaz. Yalnız ayar paneli açıkken listede görünür ve sürüklenir.
     Görsel dosyası yoksa hiç çizilmez (emojiye düşmez). */
  /* Değerler ?dagayar=1 panelinden dialandı, buraya kalıcı yazıldı.
     dag_05 kaldırıldı (Serdar). Kimlikler boşluklu ilerler; yeniden
     numaralamak eski ekran görüntüleriyle notları uyumsuz kılardı. */
  var SUSLER = [
    { id: 'dag_01', ad: 'Dağ A', emoji: '⛰️', gorsel: 'dag1.webp', gx:   3, gy:  -3, en: 3, boy: 3, olcek: 2.06, dy:  200, dondur:  5, sus: true },
    { id: 'dag_02', ad: 'Dağ B', emoji: '⛰️', gorsel: 'dag2.webp', gx:   9, gy:   4, en: 3, boy: 3, olcek: 2.32, dy:   32, sus: true },
    { id: 'dag_03', ad: 'Dağ C', emoji: '⛰️', gorsel: 'dag3.webp', gx:  10, gy:   5, en: 3, boy: 3, olcek: 1.88, dy:   58, sus: true },
    { id: 'dag_04', ad: 'Dağ D', emoji: '⛰️', gorsel: 'dag1.webp', gx:   9, gy:   9, en: 3, boy: 3, olcek: 2.32, dy:  108, dondur:  5, sus: true },
    { id: 'dag_06', ad: 'Dağ F', emoji: '⛰️', gorsel: 'dag3.webp', gx:  -4, gy:  18, en: 3, boy: 3, olcek: 0.66, dy:  -10, dondur: -5, sus: true },
    { id: 'dag_07', ad: 'Dağ G', emoji: '⛰️', gorsel: 'dag1.webp', gx:  -4, gy:  18, en: 3, boy: 3, olcek: 1.74, dy: -178, sus: true },
    { id: 'dag_08', ad: 'Dağ H', emoji: '⛰️', gorsel: 'dag2.webp', gx:  -7, gy:  16, en: 3, boy: 3, olcek: 1.86, dy: -176, sus: true },
    { id: 'dag_09', ad: 'Dağ I', emoji: '⛰️', gorsel: 'dag3.webp', gx: -11, gy:   9, en: 3, boy: 3, olcek: 1.76, dy:  -36, sus: true },
    { id: 'dag_10', ad: 'Dağ J', emoji: '⛰️', gorsel: 'dag1.webp', gx: -12, gy:   4, en: 3, boy: 3, olcek: 2.04, dy:   -2, sus: true },
    { id: 'dag_11', ad: 'Dağ K', emoji: '⛰️', gorsel: 'dag2.webp', gx: -12, gy:  -1, en: 3, boy: 3, olcek: 2.54, dy:   -6, sus: true },
    { id: 'dag_12', ad: 'Dağ L', emoji: '⛰️', gorsel: 'dag3.webp', gx:  -8, gy:  -4, en: 3, boy: 3, olcek: 1.84, dy:  -18, dondur: -5, sus: true },
    { id: 'dag_13', ad: 'Dağ M', emoji: '⛰️', gorsel: 'dag1.webp', gx:  -4, gy:  -5, en: 3, boy: 3, olcek: 1.84, dy:    8, sus: true },
    { id: 'dag_14', ad: 'Dağ N', emoji: '⛰️', gorsel: 'dag2.webp', gx:  -1, gy:  -5, en: 3, boy: 3, olcek: 1.60, dy:   54, sus: true },
    { id: 'dag_15', ad: 'Dağ O', emoji: '⛰️', gorsel: 'dag3.webp', gx:   0, gy:  -5, en: 3, boy: 3, olcek: 1.38, dy:   88, sus: true },
    { id: 'dag_16', ad: 'Dağ P', emoji: '⛰️', gorsel: 'dag1.webp', gx:   4, gy:  -3, en: 3, boy: 3, olcek: 1.68, dy:   60, sus: true }
  ];



  /* Çizim, dokunuş ve ayar listesi bunu okur; kayıt yalnız BINALAR'ı. */
  function tumYapilar() { return BINALAR.concat(SUSLER); }

  /* ── KIŞLA → BİRLİK AİLESİ ──
     Kışlanın EĞİT düğmesi ayrı bir eğitim ekranı AÇMAZ; oyunun kendi
     Birlikler panelini (#panel-troops) açar ve o ailenin sekmesine
     geçer. Tek ekran, tek kaynak: stat/fiyat/kuyruk ileride değişince
     iki yerde birden düzeltme gerekmez.
     Anahtarlar Firebase kimlikleridir, ADLARLA karıştırma. */
  var KISLA_AILE = { sovalye: 'knight', asker: 'soldier', robot: 'robot' };

  /* ---- Görsel yükleyici: dosya yoksa sessizce emojiye düşülür ---- */
  var GORSELLER = {};

  function gorselYukle() {
    var liste = tumYapilar();
    for (var i = 0; i < liste.length; i++) {
      (function (b) {
        if (!b.gorsel || GORSELLER[b.id]) return;
        var im = new Image();
        GORSELLER[b.id] = { im: im, hazir: false };
        im.onload = function () {
          var g = GORSELLER[b.id];
          g.kutu = saydamKenariOlc(im);
          g.hazir = true;
          kareIste();
        };
        im.onerror = function () { GORSELLER[b.id].hazir = false; };
        im.src = b.gorsel;
      })(liste[i]);
    }
  }

  /* Şeffaf kenar boşluğunu ölçer → her bina aynı hizaya oturur.
     Ölçülemezse (okuma engellenirse) tüm görsel kullanılır. */
  function saydamKenariOlc(im) {
    var w = im.naturalWidth, h = im.naturalHeight;
    var tam = { sx: 0, sy: 0, sw: w, sh: h };
    try {
      var c = document.createElement('canvas');
      var en = 256, k = en / Math.max(w, h);
      c.width = Math.max(1, Math.round(w * k));
      c.height = Math.max(1, Math.round(h * k));
      var cx = c.getContext('2d');
      cx.drawImage(im, 0, 0, c.width, c.height);
      var d = cx.getImageData(0, 0, c.width, c.height).data;
      var x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
      for (var y = 0; y < c.height; y++) {
        for (var x = 0; x < c.width; x++) {
          if (d[(y * c.width + x) * 4 + 3] > 12) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < x0 || y1 < y0) return tam;
      return {
        sx: Math.max(0, Math.floor(x0 / k)),
        sy: Math.max(0, Math.floor(y0 / k)),
        sw: Math.min(w, Math.ceil((x1 - x0 + 1) / k)),
        sh: Math.min(h, Math.ceil((y1 - y0 + 1) / k))
      };
    } catch (e) { return tam; }
  }

  /* Ekranda görünen ad. Seviye şimdilik hep 1; seviye sistemi gelince
     yalnız bu fonksiyon değişir, bina listesindeki 'ad' alanları temiz kalır. */
  function binaSeviyesi(b) {
    try {
      if (window.INSAAT && typeof window.INSAAT.seviye === 'function' &&
          window.INSAAT.gelistirilebilir(b.id)) {
        return window.INSAAT.seviye(b.id);
      }
    } catch (e) {}
    return b.sv || 1;
  }

  function binaAdi(b) {
    if (b.sus) return b.ad;
    var ek = '';
    try {
      if (window.INSAAT && window.INSAAT.kuyrukta && window.INSAAT.kuyrukta(b.id)) ek = ' \u23F3';
    } catch (e) {}
    return binaSeviyesi(b) + '. Sv ' + b.ad + ek;
  }

  function binaGorseli(b) {
    var g = GORSELLER[b.id];
    return (g && g.hazir && g.im.naturalWidth > 0) ? g : null;
  }

  /* ---- Stil: en az sayıda kural, 3B yok ---- */
  var CSS =
    /* ── KATMAN SIRASI — KÖK ÇÖZÜM ──
       Kaleiçi katmanı ARTIK #worldScreen'in İÇİNDE duruyor (kur()).
       Eskiden body'de z-index 9000 ile en üstteydi; menülerin açtığı
       her pencere (#worldScreen içindeki .overlay-panel, body'deki
       #heroDetailOverlay/#kahramanListesi, mağaza, buff, gelistir...)
       onun ARKASINDA kalıyordu. Panelleri tek tek taşımak yerine
       kaleiçi aşağı indi: 30.
         harita/çubuklar < 30 kaleiçi < 40 menü şeritleri
         < 50 overlay-panel < 60 savaş < body katmanları
       Böylece taşıma sistemi tamamen kalktı. */
    '#kaleici{position:fixed;inset:0;z-index:30;display:none;' +
      'background:#7fae5c;font-family:"Baloo 2",sans-serif;touch-action:none}' +
    '#kaleici.acik{display:block}' +
    /* Menü şeritleri kaleiçinin üstünde kalsın (normalde 20-21) */
    'body.kaleici-acik .hud-top,body.kaleici-acik .hud-kaynak,' +
      'body.kaleici-acik .nav-dock{z-index:40}' +
    /* Kaleiçi açıkken giriş düğmesi görünmesin — body'de, üste biner */
    'body.kaleici-acik #kaleiciGir{display:none}' +
    /* Kapat düğmesi ve sürüm yazısı üst panelin altına iner */
    'body.kaleici-acik #kaleiciKapat{top:84px}' +
    '#kaleiciTuval{position:absolute;left:0;top:0;width:100%;height:100%;display:block}' +
    '#kaleiciKapat{position:absolute;left:10px;top:10px;z-index:2;' +
      'padding:5px 11px;border:none;border-radius:9px;background:#1d3f63;color:#eaf6ff;' +
      'font:600 12.5px/1 "Baloo 2",sans-serif;text-shadow:0 1px 2px rgba(0,20,45,.55);' +
      'box-shadow:none;transition:transform .09s,filter .09s}' +
    '#kaleiciKapat:active{transform:scale(.96);filter:brightness(.93)}' +
    '#kaleiciPanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;' +
      'display:none;min-width:200px;padding:18px 20px;border-radius:14px;' +
      'background:#12304e;color:#eaf6ff;text-align:center;' +
      'box-shadow:none}' +
    '#kaleiciPanel.acik{display:block}' +
    '#kaleiciPanel h3{margin:0 0 6px;font:700 20px/1.2 "Baloo 2",sans-serif;' +
      'text-shadow:0 1px 2px rgba(0,20,45,.55)}' +
    '#kaleiciPanel p{margin:0 0 14px;font:400 14px/1.3 "Baloo 2",sans-serif;opacity:.8}' +
    '#kaleiciPanel button{padding:8px 20px;border:none;border-radius:10px;' +
      'background:#2f6ea8;color:#eaf6ff;font:600 15px/1 "Baloo 2",sans-serif;' +
      'box-shadow:none;transition:transform .09s,filter .09s}' +
    '#kaleiciPanel button:active{transform:scale(.96);filter:brightness(.93)}' +
    '#kaleiciGir{position:fixed;left:10px;bottom:108px;z-index:18;display:none;' +
      'padding:5px 10px;border:none;border-radius:9px;background:rgba(29,63,99,.9);color:#eaf6ff;' +
      'font:600 12.5px/1 "Baloo 2",sans-serif;text-shadow:0 1px 2px rgba(0,20,45,.55);' +
      'box-shadow:none;transition:transform .09s,filter .09s}' +
    '#kaleiciGir.acik{display:block}' +
    '#kaleiciGir:active{transform:scale(.96);filter:brightness(.93)}' +
    /* Kışladan girilen birlik paneli tek ailede kilitli — oklar anlamsız */
    '#panel-troops.kisla-kilit #uvPrev,#panel-troops.kisla-kilit #uvNext,' +
      '#panel-troops.kisla-kilit #uvDots{display:none}' +
    /* Kışladan girilen ekranda üstteki Birlikler/İstatistik sekmeleri
       görünmez — o kapılar alttaki Birlikler tuşunda duruyor. */
    '#panel-troops.kisla-kilit .tp-tabs{display:none}';


  var katman, tuval, ctx, panel, panelAd, girBtn;
  var camX = 0, camY = 0;          // kameranın dünya koordinatı
  var secili = null;               // seçili bina
  var secimZaman = 0;              // seçim anı (yanıp sönme için)
  var SECIM_DONGU = 1600;          // yanıp sönme periyodu (ms)
  var eb = 1;                       // aygıt piksel oranı
  var kareIstendi = false;

  /* ---- Izgara → dünya (karo merkezi) ---- */
  function dunya(gx, gy) {
    return { x: (gx - gy) * CFG.tileW / 2, y: (gx + gy) * CFG.tileH / 2 };
  }
  /* ---- Dünya → ızgara ---- */
  function izgara(wx, wy) {
    var a = wx / (CFG.tileW / 2), b = wy / (CFG.tileH / 2);
    return { gx: Math.round((b + a) / 2), gy: Math.round((b - a) / 2) };
  }
  /* ---- Dünya → ekran ---- */
  function ekran(wx, wy) {
    return {
      x: tuval.width / (2 * eb) + (wx - camX) * CFG.zoom,
      y: tuval.height / (2 * eb) + (wy - camY) * CFG.zoom
    };
  }

  /* ================= ZEMİN DOKUSU =================
     Eşkenar dörtgen karo ızgarası kaldırıldı. Zemin artık ana haritadaki
     çimen algoritmasının sade kopyasıyla boyanıyor: tohumlu gürültüden
     doğan leke + geniş ışık dalgası + doygunluk. Görsel dosya yok.
     harita.js'e DOKUNULMADI; oradaki kod aynen duruyor. */
  var ZCFG = {
    /* Çimen biraz kısıldı: 82,192,58 gözü yoruyordu. Doygunluk da
       1.22 → 1.10. Daha yeşil isteniyorsa ikisini birlikte arttır. */
    renk: [72, 172, 62],
    koyu: 0.24, acik: 0.24,
    isik: 0.32,
    lekeYatay: 2.4,
    /* Leke sıklığı. Ana haritada ekranda onlarca karo görünüyor, burada
       6 tane; aynı frekansla tek bir lekenin ortasında kalıyorduk ve
       zemin düz yeşil görünüyordu. Büyüt = desen sıklaşır. */
    siklik: 3.6,
    doygunluk: 1.10,
    adim: 12,              // kaç dünya pikselinde bir örnek alınır
    seed: 20260803,

    /* ---- DENİZ ----
       Sahne bir ADA. Merkezden uzaklık yarıçapı geçince kıyı, sonra
       sığ su, sonra derin deniz gelir. Sınır gürültüyle kırıştırılır,
       yoksa cetvelle çizilmiş daire olur.
       merkez/yaricap DÜNYA pikselidir (ızgara değil). */
    ada: {
      mx: -240, my: 172,   // ada merkezi (dünya)
      /* Kara sınırı ?dagayar=1 panelinden dialandı. Dağların yerleri
         de değiştiği için bu sayı artık dağ halkasına göre elle
         ayarlanmış değerdir, hesapla türetilmez. */
      yaricap: 570,        // kara sınırı  (?dagayar=1 ile dialandı)
      /* ── GEZİNME SINIRI ──
         DİKKAT — İKİ FARKLI ÖLÇÜ, karıştırılırsa hep fazla açılır:

         sol/sag/ust = GÖRÜNTÜNÜN KENARI bu noktayı geçemez.
           Kameranın kendisi değil. Kamera sınırı buradan her karede
           yarım ekran çıkarılarak bulunur, böylece zoom değişse de
           kenar aynı yerde durur. Önceki sürümde bunlar kamera
           sınırıydı ve ekran yarım ekran daha ötesini gösteriyordu.
           Değerler dağ kutusundan: sol 496 · sağ 464 · üst 431.

         alt = KAMERANIN inebileceği en dip nokta (kenar değil).
           Aşağıda deniz görünmesi İSTENİYOR, oraya deniz işleri
           gelecek; o yüzden bu yön bilerek serbest bırakıldı.

         Hepsi ada merkezine göre, dünya pikselinde. ?dagayar=1. */
      gez: { sol: 500, sag: 470, ust: 435, alt: 620 },
      dalga: 0.085,        // kıyının kırışma miktarı
      kiyi: 0.052,         // kum bandı genişliği (yarıçap oranı)
      /* Kum yalnız ÖNE bakan kıyıda. İzometride yukarı dönen kıyı
         kameraya sırtını döner; orada kumsal görünmemeli. */
      kumOn: 0.55,         // ön tarafta kum gücü eşiği
      kumArka: -0.10,      // bu yönün ötesinde kum tamamen biter
      sig: 0.10            // sığ su bandı
    },
    kumRenk:  [226, 208, 156],
    sigRenk:  [104, 198, 206],
    derinRenk:[ 24,  86, 142],
    kopukRenk:[238, 251, 255]
  };

  function zHash(ix, iy) {
    var n = Math.sin(ix * 12.9898 + iy * 78.233 + ZCFG.seed) * 43758.5453123;
    return n - Math.floor(n);
  }
  function zNoise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = x - ix, fy = y - iy;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    var a = zHash(ix, iy), b = zHash(ix + 1, iy);
    var c = zHash(ix, iy + 1), d = zHash(ix + 1, iy + 1);
    return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
  }
  function zYum(t) { return t * t * (3 - 2 * t); }
  function zKaris(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function zAc(c, t)  { return [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t]; }
  function zKoy(c, t) { return [c[0] * (1 - t), c[1] * (1 - t), c[2] * (1 - t)]; }

  /* Ada maskesi: 0 = tam kara · 1 = kara sınırı · >1 = deniz.
     Sınır iki ayrı frekanslı gürültüyle kırıştırılır (büyük girinti +
     küçük tırtık), böylece kıyı elle çizilmiş gibi durur. */
  function adaOran(wx, wy) {
    var A = ZCFG.ada;
    var dx = wx - A.mx, dy = wy - A.my;
    var r = Math.sqrt(dx * dx + dy * dy) / A.yaricap;
    var aci = Math.atan2(dy, dx);
    /* açıya göre örneklenen gürültü — kıyı boyunca sürekli, dikişsiz */
    var kir = (zNoise(Math.cos(aci) * 2.2 + 61, Math.sin(aci) * 2.2 + 19) - 0.5) * 2
            + (zNoise(Math.cos(aci) * 6.5 + 7,  Math.sin(aci) * 6.5 + 83) - 0.5) * 0.9;
    return r + kir * A.dalga;
  }

  /* Kum gücü — kıyının hangi yöne baktığına göre 0..1.
     ny = +1 kıyı kameraya bakıyor (ön/alt) · -1 sırtı dönük (arka/üst). */
  function kumGucu(wx, wy) {
    var A = ZCFG.ada;
    var dy = (wy - A.my) / (A.yaricap * 0.80);
    var dx = (wx - A.mx) / A.yaricap;
    var ny = dy;
    /* yanlarda (dx büyük, dy≈0) kum yarı yarıya kalsın */
    ny += (1 - Math.min(1, Math.abs(dx))) * 0 + Math.abs(dx) * 0.22;
    var g = (ny - A.kumArka) / (A.kumOn - A.kumArka);
    g = Math.max(0, Math.min(1, g));
    /* kıyı boyunca hafif düzensizlik — cetvelle kesilmiş gibi durmasın */
    g *= 0.86 + zNoise(wx * 0.008 + 3, wy * 0.008 + 47) * 0.28;
    return Math.max(0, Math.min(1, zYum(g)));
  }

  /* Deniz rengi. Beş katman: derinlik geçişi · uzun dalga hatları ·
     ince kırışıklık · gezinen parıltı · kıyı köpüğü.
     kw = o noktadaki kum bandı genişliği (köpük ona göre kayar). */
  function denizRengi(wx, wy, t, kw) {
    var A = ZCFG.ada;
    if (kw === undefined) kw = A.kiyi;
    var d = (t - (1 + kw)) / A.sig;               // 0 = kıyı, 1 = derin
    var k = Math.max(0, Math.min(1, d));
    k = zYum(k);
    var c = zKaris(ZCFG.sigRenk, ZCFG.derinRenk, k);

    /* 1. Uzun dalga hatları — kıyıya paralel, geniş ve yumuşak */
    var band = zNoise(wx * 0.009 + 13, wy * 0.021 + 51) * 0.62
             + zNoise(wx * 0.026 + 71, wy * 0.060 + 29) * 0.38;
    var dg = Math.sin((t * 52) + band * 6.2) * 0.5 + 0.5;
    dg = dg * dg * (3 - 2 * dg);                  // tepeleri sivrilt
    c = zKaris(c, zAc(c, 0.62), dg * 0.17 * (1 - k * 0.5));
    c = zKaris(c, zKoy(c, 0.34), (1 - dg) * 0.13);

    /* 2. İnce kırışıklık — yüzey dokusu, dalgaların üstüne biner */
    var kr = zNoise(wx * 0.085 + 101, wy * 0.190 + 7) * 0.6
           + zNoise(wx * 0.210 + 43,  wy * 0.470 + 61) * 0.4;
    c = zKaris(c, zAc(c, 0.5), Math.max(0, kr - 0.56) * 0.42);
    c = zKaris(c, zKoy(c, 0.22), Math.max(0, 0.44 - kr) * 0.30);

    /* 3. Derinlerde koyu akıntı lekeleri — düz mavilik kırılır */
    var ak = zNoise(wx * 0.013 + 211, wy * 0.030 + 137);
    c = zKaris(c, zKoy(c, 0.28), Math.max(0, ak - 0.55) * 0.5 * k);

    /* 4. Geniş parıltı — suyun üstünde gezinen ışık */
    var pr = zNoise(wx * 0.005 + 5, wy * 0.005 + 91);
    c = zKaris(c, [255, 255, 255], Math.max(0, (pr - 0.56)) * 0.40);

    /* 5. Kıyı köpüğü — karaya en yakın şerit, dalgalarla tırtıklı */
    var merkez = 1 + kw * 0.9 + 0.006;
    var genis = kw * 0.85 + 0.014;
    var kop = 1 - Math.min(1, Math.abs(t - merkez) / genis);
    if (kop > 0) {
      var kd = zNoise(wx * 0.048 + 33, wy * 0.048 + 17) * 0.65
             + zNoise(wx * 0.130 + 89, wy * 0.130 + 5) * 0.35;
      kop = kop * kop;
      c = zKaris(c, ZCFG.kopukRenk, Math.min(1, kop * (0.35 + kd * 0.75)));
    }
    return c;
  }

  function zeminRengi(gx, gy, wx, wy) {
    /* ---- kara / deniz ayrımı ---- */
    var A = ZCFG.ada;
    var t = adaOran(wx, wy);
    if (t > 1) {
      var cs;
      var kg = kumGucu(wx, wy);
      var kw = A.kiyi * kg;
      if (kg > 0.02 && t < 1 + kw) {
        /* kum bandı — çimenden kuma yumuşak geçiş */
        var kt = zYum((t - 1) / kw);
        cs = zKaris(ZCFG.renk, ZCFG.kumRenk, kt * kg);
        var kn = zNoise(wx * 0.045 + 23, wy * 0.045 + 67);
        cs = zKaris(cs, zKoy(cs, 0.18), ((kn - 0.5) * 0.5 + 0.25) * kg);
      } else {
        /* Kumsuz kıyıda çimen doğrudan suya iner: dar bir sığlık şeridi */
        cs = denizRengi(wx, wy, t, kw);
        if (t < 1 + kw + 0.012) {
          var yt = zYum(Math.max(0, Math.min(1, (t - 1) / (kw + 0.012))));
          cs = zKaris(ZCFG.renk, cs, yt);
        }
      }
      var dd = ZCFG.doygunluk;
      var od = (cs[0] + cs[1] + cs[2]) / 3;
      return [Math.max(0, Math.min(255, od + (cs[0] - od) * dd)),
              Math.max(0, Math.min(255, od + (cs[1] - od) * dd)),
              Math.max(0, Math.min(255, od + (cs[2] - od) * dd))];
    }

    var c = [ZCFG.renk[0], ZCFG.renk[1], ZCFG.renk[2]];
    /* eu = ekranda yatay yön, ev = dikey yön. eu frekansı düşük →
       lekeler yatay uzar, zemin yere serilmiş gibi durur. */
    var f = ZCFG.siklik;
    var eu = (gx - gy) / ZCFG.lekeYatay * f, ev = (gx + gy) * f;

    if (ZCFG.isik > 0) {
      var sh = zNoise(eu * 0.075 + 41, ev * 0.075 + 17) * 0.65
             + zNoise(eu * 0.022 + 5,  ev * 0.022 + 29) * 0.35;
      var t = (sh - 0.5) * 1.35 * ZCFG.isik * 1.8;
      c = t < 0 ? zKaris(c, zKoy(c, 0.52), Math.min(0.70, -t))
                : zKaris(c, [255, 255, 255], Math.min(0.28, t * 0.50));
    }

    var pk = zNoise(eu * 0.070 + 77, ev * 0.070 + 13) * 0.50
           + zNoise(eu * 0.175 + 5,  ev * 0.175 + 91) * 0.32
           + zNoise(eu * 0.430 + 31, ev * 0.430 + 53) * 0.18;
    pk = zYum(pk);
    pk = pk * 0.68 + (Math.round(pk * 3) / 3) * 0.32;
    var pt = (pk - 0.5) * 2;
    if (pt < 0) c = zKaris(c, zKoy(ZCFG.renk, 0.46), Math.min(1, -pt * ZCFG.koyu * 2.2));
    else        c = zKaris(c, zAc(c, 0.42),          Math.min(1,  pt * ZCFG.acik * 2.2));

    var d2 = ZCFG.doygunluk;
    if (d2 !== 1) {
      var orta = (c[0] + c[1] + c[2]) / 3;
      c = [Math.max(0, Math.min(255, orta + (c[0] - orta) * d2)),
           Math.max(0, Math.min(255, orta + (c[1] - orta) * d2)),
           Math.max(0, Math.min(255, orta + (c[2] - orta) * d2))];
    }
    return c;
  }

  /* Alçak çözünürlüklü tampon. Ekrandan geniş üretilir; kamera tamponun
     dışına çıkana kadar yeniden hesaplanmaz — kaydırma bedava olur. */
  var zOnbellek = null;

  function zeminUret(gorW, gorH) {
    var A = ZCFG.adim;
    var pw = gorW * 1.6, ph = gorH * 1.6;
    var minX = Math.floor((camX - pw / 2) / A) * A;
    var minY = Math.floor((camY - ph / 2) / A) * A;
    var LW = Math.ceil(pw / A) + 2, LH = Math.ceil(ph / A) + 2;
    /* güvenlik: aşırı uzaklaşmada tampon şişmesin */
    if (LW > 420) LW = 420;
    if (LH > 420) LH = 420;

    var cv = document.createElement('canvas');
    cv.width = LW; cv.height = LH;
    var cx2 = cv.getContext('2d');
    var veri = cx2.createImageData(LW, LH);
    var p = veri.data;
    var yariW = CFG.tileW / 2, yariH = CFG.tileH / 2;

    for (var j = 0; j < LH; j++) {
      var wy = minY + (j + 0.5) * A;
      for (var i = 0; i < LW; i++) {
        var wx = minX + (i + 0.5) * A;
        /* kesirli ızgara — yuvarlama yok, doku karoya bağlı değil */
        var ga = wx / yariW, gb = wy / yariH;
        var c = zeminRengi((gb + ga) / 2, (gb - ga) / 2, wx, wy);
        var k = (j * LW + i) * 4;
        p[k] = c[0]; p[k + 1] = c[1]; p[k + 2] = c[2]; p[k + 3] = 255;
      }
    }
    cx2.putImageData(veri, 0, 0);

    zOnbellek = { cv: cv, LW: LW, LH: LH, A: A,
                  minX: minX, minY: minY,
                  maxX: minX + LW * A, maxY: minY + LH * A,
                  zoom: CFG.zoom, tileH: CFG.tileH };
  }

  function zeminCiz(w, h) {
    var A = ZCFG.adim;
    var gorW = w / CFG.zoom, gorH = h / CFG.zoom;
    var ob = zOnbellek;
    /* ZOOM TAMPONU BOZMAZ: tampon DÜNYA pikselinde üretiliyor (adim),
       zoom yalnız ekrana basılırken ölçek olarak giriyor. Eskiden zoom
       her değiştiğinde tampon baştan hesaplanıyordu — kıstırma sırasında
       her karede binlerce gürültü örneği, ekran takılıyordu. */
    var yenile = !ob || ob.tileH !== CFG.tileH ||
                 (camX - gorW / 2) < ob.minX + A || (camX + gorW / 2) > ob.maxX - A ||
                 (camY - gorH / 2) < ob.minY + A || (camY + gorH / 2) > ob.maxY - A;
    if (yenile) zeminUret(gorW, gorH);
    ob = zOnbellek;
    var e = ekran(ob.minX, ob.minY);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(ob.cv, 0, 0, ob.LW, ob.LH,
                  e.x, e.y, ob.LW * ob.A * CFG.zoom, ob.LH * ob.A * CFG.zoom);
  }

  function zoomSinirlariniHesapla() {
    var w = tuval.width / eb;
    var h = tuval.height / eb;
    CFG.zoomMin = w / (CFG.karoUzak * CFG.tileW);
    CFG.zoomMax = w / (CFG.karoYakin * CFG.tileW);

    /* Uzaklaşma KISITLANMIYOR: dağların üstü görünsün isteniyor.
       Denizi ekranda tutan şey zoom değil, kameranın gezinme kutusu
       (ZCFG.ada.gez) — yukarı taşma orada durduruluyor. */

    if (CFG.zoom < CFG.zoomMin) CFG.zoom = CFG.zoomMin;
    if (CFG.zoom > CFG.zoomMax) CFG.zoom = CFG.zoomMax;
  }

  /* Binaların kapladığı ızgara aralığı — kamera sınırları buna göre kurulur */
  function binaAlani() {
    var a = { x0: 0, y0: 0, x1: CFG.grid - 1, y1: CFG.grid - 1 };
    var liste = tumYapilar();
    for (var i = 0; i < liste.length; i++) {
      var b = liste[i];
      if (b.gx < a.x0) a.x0 = b.gx;
      if (b.gy < a.y0) a.y0 = b.gy;
      if (b.gx + b.en - 1 > a.x1) a.x1 = b.gx + b.en - 1;
      if (b.gy + b.boy - 1 > a.y1) a.y1 = b.gy + b.boy - 1;
    }
    return a;
  }

  /* Sahnenin dünya merkezi */
  function sahneMerkezi() {
    var a = binaAlani();
    var m1 = dunya(a.x0, a.y0), m2 = dunya(a.x1, a.y1);
    var m3 = dunya(a.x1, a.y0), m4 = dunya(a.x0, a.y1);
    return {
      x: (Math.min(m1.x, m2.x, m3.x, m4.x) + Math.max(m1.x, m2.x, m3.x, m4.x)) / 2,
      y: (Math.min(m1.y, m2.y, m3.y, m4.y) + Math.max(m1.y, m2.y, m3.y, m4.y)) / 2
    };
  }

  /* Sınırlar zoom'a bağlı: uzaklaşınca sahne ekrana sığar ve kamera
     merkeze kilitlenir — böylece yakınlaş/uzaklaşta köşeye zıplamaz. */
  /* ── KAMERA SINIRI: ADANIN İÇİ ──
     Eski sınır binaların yayılımına bakıyordu; dağlar kıyıya taşınınca
     kutu büyüdü ve kamera denize açılabilir hale geldi. Artık sınır
     ZEMİNİN kendisine bağlı: kameranın ada merkezine uzaklığı, güvenli
     kara yarıçapından ekranın yarı köşegeni çıkarılarak bulunur.
     Görüş adaya sığmıyorsa kamera merkeze kilitlenir — kenara kayıp
     bir yanda deniz göstermektense ortada durması yeğdir.
     HİÇBİR GÖRSEL KAYDIRILMADI; yalnız kameranın gezinme alanı daraldı. */
  function kameraSinirla() {
    var A = ZCFG.ada, g = A.gez;
    var yariW = (tuval.width  / eb) / (2 * CFG.zoom);
    var yariH = (tuval.height / eb) / (2 * CFG.zoom);

    /* Kenar sınırı → kamera sınırı: yarım ekran içeri çekilir.
       Ekran o yönde sınırdan genişse pay 0 olur ve kamera o eksende
       merkeze kilitlenir; kenara kayıp deniz göstermekten iyidir. */
    var sol = Math.max(0, g.sol - yariW);
    var sag = Math.max(0, g.sag - yariW);
    var ust = Math.max(0, g.ust - yariH);

    if (camX < A.mx - sol)   camX = A.mx - sol;
    if (camX > A.mx + sag)   camX = A.mx + sag;
    if (camY < A.my - ust)   camY = A.my - ust;
    if (camY > A.my + g.alt) camY = A.my + g.alt;   /* alt: kamera sınırı */
  }

  /* ── ÇİZİM DURAKLATMA — DONMANIN KÖKÜ ──
     Seçili bina varken ciz() her karede kendini yeniden çağırır
     (yanıp sönme). Üstte birlik paneli açılınca bu döngü DURMUYORDU:
     izometrik tuval + panelin kendi çizimi aynı anda dönüyor, telefon
     boğuluyor ve ekran kilitlenmiş gibi oluyordu. Panel açıkken tuval
     tamamen durur; panel kapanınca tek kare çizilir. */
  var duraklat = false;

  function kareIste() {
    if (duraklat) return;
    if (kareIstendi) return;
    kareIstendi = true;
    requestAnimationFrame(function () { kareIstendi = false; ciz(); });
  }

  function olcuAyarla() {
    eb = window.devicePixelRatio || 1;
    tuval.width = Math.round(katman.clientWidth * eb);
    tuval.height = Math.round(katman.clientHeight * eb);
    ctx.setTransform(eb, 0, 0, eb, 0, 0);
    zoomSinirlariniHesapla();
    kameraSinirla();
  }

  /* ---- Bir binanın dörtgen tabanı (dünya koordinatı) ---- */
  function taban(b) {
    var ust = dunya(b.gx, b.gy);
    var sag = dunya(b.gx + b.en - 1, b.gy);
    var alt = dunya(b.gx + b.en - 1, b.gy + b.boy - 1);
    var sol = dunya(b.gx, b.gy + b.boy - 1);
    return [
      { x: ust.x, y: ust.y - CFG.tileH / 2 },
      { x: sag.x + CFG.tileW / 2, y: sag.y },
      { x: alt.x, y: alt.y + CFG.tileH / 2 },
      { x: sol.x - CFG.tileW / 2, y: sol.y }
    ];
  }

  function dortgenCiz(nk, dolgu, kontur) {
    var p0 = ekran(nk[0].x, nk[0].y);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    for (var i = 1; i < nk.length; i++) {
      var p = ekran(nk[i].x, nk[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    if (dolgu) { ctx.fillStyle = dolgu; ctx.fill(); }
    if (kontur) { ctx.strokeStyle = kontur; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function karoDortgeni(gx, gy) {
    var m = dunya(gx, gy);
    return [
      { x: m.x, y: m.y - CFG.tileH / 2 },
      { x: m.x + CFG.tileW / 2, y: m.y },
      { x: m.x, y: m.y + CFG.tileH / 2 },
      { x: m.x - CFG.tileW / 2, y: m.y }
    ];
  }

  function ciz() {
    if (!katman || !katman.classList.contains('acik')) return;
    var w = tuval.width / eb, h = tuval.height / eb;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#6f9d4f';
    ctx.fillRect(0, 0, w, h);

    /* zemin — karo ızgarası yok, dikişsiz çimen dokusu */
    zeminCiz(w, h);

    /* taşınan binanın hedef karoları — açık beyaz silüet */
    if (tasinan) siluetCiz(tasinan);

    /* binalar — arkadan öne */
    var sirali = tumYapilar().sort(function (a, b) {
      return (a.gx + a.gy) - (b.gx + b.gy);
    });
    for (var i = 0; i < sirali.length; i++) binaCiz(sirali[i]);

    seciliAdCiz();
    if (secimCanli()) kareIste();   // yanıp sönme sürerken kare iste
  }

  /* Seçilen bina kısa süre yanıp söner — oyuncu neye dokunduğunu görür */
  function secimSaydamlik(b) {
    if (b !== secili) return 1;
    var t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - secimZaman;
    /* Yavaş ve hafif nefes alma — seçim sürdükçe devam eder */
    return 0.78 + 0.22 * (0.5 + 0.5 * Math.cos(t / SECIM_DONGU * Math.PI * 2));
  }

  function secimCanli() { return !!secili; }

  function binaSec(b) {
    if (b !== secili) { tasiModu = false; tasiDokunus = 0; }
    secili = b;
    secimZaman = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    /* Seçimde kamera OYNAMAZ. Odaklama yalnız GELİŞTİR'e basınca olur;
       binaya her dokunuşta ekranın kayması oyuncuyu yerinden ediyordu. */
    kareIste();
  }

  /* ---- Seçilen binaya kamera odaklanır ----
     Bina ekranın TAM ORTASINA değil, biraz YUKARISINA oturur:
     alt yarıyı İNŞAAT paneli kaplıyor, ortaya alırsan bina panelin
     altında kalır ve dokunduğun şey görünmez olur. */
  var odakRaf = null;

  function binayaOdakla(b, bitince) {
    var bit = function () { if (typeof bitince === 'function') bitince(); };
    if (!b || !tuval || !katman || !katman.classList.contains('acik')) { bit(); return; }
    var nk = taban(b);
    var hx = (nk[1].x + nk[3].x) / 2;
    var hy = (nk[0].y + nk[2].y) / 2;
    /* Ekran yükseklidiğinin %16'sı kadar aşağı kaydırılır →
       bina görsel olarak yukarı çıkar. Dünya birimine çevrilir. */
    var kaydir = ((tuval.height / eb) * 0.16) / CFG.zoom;
    var bx = camX, by = camY;
    var hedefX = hx, hedefY = hy + kaydir;
    if (Math.abs(hedefX - bx) < 1 && Math.abs(hedefY - by) < 1) { bit(); return; }

    if (odakRaf) { cancelAnimationFrame(odakRaf); odakRaf = null; }
    var simdi = function () {
      return (typeof performance !== 'undefined' ? performance.now() : Date.now());
    };
    var t0 = simdi(), SURE = 260;

    function adim() {
      var t = Math.min(1, (simdi() - t0) / SURE);
      var e = 1 - Math.pow(1 - t, 3);
      camX = bx + (hedefX - bx) * e;
      camY = by + (hedefY - by) * e;
      kameraSinirla();
      ciz();
      if (t < 1 && !duraklat) { odakRaf = requestAnimationFrame(adim); }
      else { odakRaf = null; bit(); }
    }
    odakRaf = requestAnimationFrame(adim);
  }

  /* Binanın EKRANDAKİ dikdörtgeni — çizim de, dokunuş isabeti de
     buradan okur. İki yerde ayrı hesaplanırsa parmak binayı ıskalar;
     taşımanın hiç tutmamasının sebebi tam olarak buydu. */
  function binaKutusu(b) {
    var nk = taban(b), g = binaGorseli(b);
    var ortaW = { x: (nk[0].x + nk[2].x) / 2, y: (nk[0].y + nk[2].y) / 2 };
    var o = ekran(ortaW.x, ortaW.y);
    if (!g) {
      var p0 = ekran(nk[0].x, nk[0].y), p1 = ekran(nk[1].x, nk[1].y);
      var p2 = ekran(nk[2].x, nk[2].y), p3 = ekran(nk[3].x, nk[3].y);
      return { x: p3.x, y: p0.y, w: p1.x - p3.x, h: p2.y - p0.y, gorsel: false };
    }
    var k = g.kutu;
    var gen = (nk[1].x - nk[3].x) * CFG.zoom * GORSEL_PAY * (b.olcek || 1);
    var yuk = gen * (k.sh / k.sw);
    /* HİZA: görselin MERKEZİ, kapladığı karo alanının merkezine oturur.
       Eskiden alt kenar tabanın en alt köşesine yaslanıyordu; görselin
       kendi boyu uzadıkça bina karodan aşağı taşıyor, hepsi kaymış
       görünüyordu. Bina başına ince ayar yine dx/dy (piksel). */
    return {
      x: o.x - gen / 2 + (b.dx || 0) * CFG.zoom,
      y: o.y - yuk / 2 + (b.dy || 0) * CFG.zoom,
      w: gen, h: yuk, gorsel: true
    };
  }

  /* Taşınan binanın oturacağı karolar — açık beyaz silüet */
  function siluetCiz(b) {
    for (var y = 0; y < b.boy; y++) {
      for (var x = 0; x < b.en; x++) {
        dortgenCiz(karoDortgeni(b.gx + x, b.gy + y),
                   'rgba(255,255,255,.42)', 'rgba(255,255,255,.85)');
      }
    }
  }

  function binaCiz(b) {
    var g = binaGorseli(b);
    var kut = binaKutusu(b);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (g) {
      var k = g.kutu;
      var sap = secimSaydamlik(b);
      if (sap < 1) ctx.globalAlpha = sap;
      /* DÖNDÜRME: yalnız 'dondur' alanı olan yapılarda çalışır (süsler).
         Kutunun MERKEZİ etrafında döner; köşeden döndürseydik dağ
         yerinden kayardı. Alan yoksa tek fazladan işlem bile yapılmaz. */
      if (b.dondur) {
        var mx0 = kut.x + kut.w / 2, my0 = kut.y + kut.h / 2;
        ctx.save();
        ctx.translate(mx0, my0);
        ctx.rotate(b.dondur * Math.PI / 180);
        ctx.drawImage(g.im, k.sx, k.sy, k.sw, k.sh,
                      -kut.w / 2, -kut.h / 2, kut.w, kut.h);
        ctx.restore();
      } else {
        ctx.drawImage(g.im, k.sx, k.sy, k.sw, k.sh, kut.x, kut.y, kut.w, kut.h);
      }
      ctx.globalAlpha = 1;
    } else {
      /* Süsün görseli yoksa hiç çizilmez — ekranda emoji dağ istemiyoruz */
      if (b.sus) return;
      /* Görsel yoksa emoji + soluk taban (dosya eksikse bina kaybolmasın) */
      var nk = taban(b);
      dortgenCiz(nk, 'rgba(241,245,239,.55)', 'rgba(255,255,255,.55)');
      var o = { x: kut.x + kut.w / 2, y: kut.y + kut.h / 2 };
      var boyut = (b.en >= 3 ? 46 : b.en === 2 ? 32 : 20) * CFG.zoom;
      ctx.font = boyut + 'px "Baloo 2",sans-serif';
      ctx.fillText(b.emoji, o.x, o.y - boyut * 0.12);
    }
  }

  /* ---- Seçili binanın adı — binaların üstünde, çerçeveli ---- */
  function seciliAdCiz() {
    if (!secili) { tasiSimge.r = 0; egitBtn.w = 0; gelBtn.w = 0; return; }
    var b = secili;
    var kut = binaKutusu(b);
    var o = { x: kut.x + kut.w / 2 };

    var boy = Math.max(15, 19 * CFG.zoom);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 ' + boy + 'px "Baloo 2",sans-serif';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    /* Çerçeve ince ve siyah — sarı kalın kontur görseli eziyordu */
    ctx.lineWidth = Math.max(1.5, boy * 0.09);
    ctx.strokeStyle = '#000000';
    var ad = binaAdi(b);
    var yaziY = kut.y - boy * 0.45;
    ctx.strokeText(ad, o.x, yaziY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ad, o.x, yaziY);

    /* Taşıma düğmesi — tabanın SOL ALT köşesinde.
       1. dokunuş hazırlar (sarı halka), 2. dokunuş taşımayı açar. */
    var nk = taban(b);
    var solW = ekran(nk[3].x, nk[3].y);
    var altW = ekran(nk[2].x, nk[2].y);
    var sr = boy * (tasiModu ? 0.95 : 0.62);
    tasiSimge.x = (solW.x + altW.x) / 2;
    tasiSimge.y = (solW.y + altW.y) / 2;
    tasiSimge.r = sr;
    tasiSimgesiCiz(tasiSimge.x, tasiSimge.y, sr, tasiModu, tasiDokunus);

    egitDugmesiCiz(b, kut, nk, boy);
    gelistirDugmesiCiz(b, kut, nk, boy);
  }

  /* ---- EĞİT düğmesi — yalnız üç kışlada, tabanın ALT köşesinde ----
     Taşıma simgesi sol alt kenarda; bu alt köşede, çakışmaz. */
  function egitDugmesiCiz(b, kut, nk, boy) {
    egitBtn.w = 0;
    if (!KISLA_AILE[b.id]) return;

    var alt = ekran(nk[2].x, nk[2].y);
    var yuk = Math.max(20, boy * 1.30);
    var gen = Math.max(52, boy * 3.05);
    var x = alt.x - gen / 2;
    var y = alt.y - yuk * 0.30;

    egitBtn.x = x; egitBtn.y = y; egitBtn.w = gen; egitBtn.h = yuk;

    var r = yuk * 0.34;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + gen, y, x + gen, y + yuk, r);
    ctx.arcTo(x + gen, y + yuk, x, y + yuk, r);
    ctx.arcTo(x, y + yuk, x, y, r);
    ctx.arcTo(x, y, x + gen, y, r);
    ctx.closePath();
    ctx.fillStyle = egitBasili ? '#e0a800' : '#ffc61a';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 ' + Math.max(11, yuk * 0.60) + 'px "Baloo 2",sans-serif';
    ctx.fillText('EĞİT', x + gen / 2, y + yuk * 0.54);
    ctx.restore();
  }

  /* ---- GELİŞTİR düğmesi ----
     Geliştirilebilir her binada var. Kışlalarda EĞİT'in bir boy
     ALTINA iner (yan yana koyunca ikisi de daralıp okunmuyordu),
     diğer binalarda EĞİT'in yerine geçer. Taşıma simgesi sol alt
     kenarda kalır, çakışmaz. */
  function gelistirDugmesiCiz(b, kut, nk, boy) {
    gelBtn.w = 0;
    if (b.sus) return;
    try {
      if (!(window.INSAAT && window.INSAAT.gelistirilebilir(b.id))) return;
    } catch (e) { return; }

    var alt = ekran(nk[2].x, nk[2].y);
    var yuk = Math.max(20, boy * 1.30);
    var gen = Math.max(52, boy * 3.05);
    var x = alt.x - gen / 2;
    var y = alt.y - yuk * 0.30;

    /* Kışlada EĞİT zaten burada — bir boy aşağı kay. */
    if (KISLA_AILE[b.id]) y += yuk + Math.max(4, yuk * 0.22);

    gelBtn.x = x; gelBtn.y = y; gelBtn.w = gen; gelBtn.h = yuk;

    /* Sürüyorsa mavi + geri sayım, değilse yeşil + GELİŞTİR */
    var kalan = 0;
    try { kalan = window.INSAAT.kalanMs(b.id) || 0; } catch (e) {}

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    /* ── İNŞAAT SÜRÜYOR: KUTU YOK ──
       Kutucuk süreyi kısaltmaya zorluyordu ("21d"). Kutu kalkınca
       genişlik derdi biter, tam süre yazılabilir. Okunurluk arka
       plandan değil, yazının kendi ince siyah konturundan gelir.
       Dokunuş alanı (gelBtn) DEĞİŞMEDİ — kutu görsel, kutu değil. */
    if (kalan > 0) {
      var yzi = 'İnşaat için: ' + tamSure(kalan);
      var pnt = Math.max(11, yuk * 0.52);
      ctx.font = '500 ' + pnt + 'px "Baloo 2",sans-serif';
      /* Yazı taşarsa küçült. Sınır kutunun 1.6 katı: kutu artık
         çizilmediği için biraz taşması sorun değil. */
      var sinir = gen * 2.4;
      while (pnt > 9 && ctx.measureText(yzi).width > sinir) {
        pnt -= 0.5;
        ctx.font = '500 ' + pnt + 'px "Baloo 2",sans-serif';
      }
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.lineWidth = Math.max(1.2, pnt * 0.13);
      ctx.strokeStyle = 'rgba(0,0,0,.85)';
      /* Kutu cizilmedigi icin yazi kutunun ORTASINA degil, ust
         ucuna yakin oturur — EĞİT'e bir tik yaklasir. */
      var yy = y + yuk * 0.32;
      ctx.strokeText(yzi, x + gen / 2, yy);
      ctx.fillStyle = gelBasili ? '#cfe6f5' : '#ffffff';
      ctx.fillText(yzi, x + gen / 2, yy);
      ctx.restore();
      return;
    }

    /* ── GELİŞTİR: yeşil kutu duruyor ── */
    var r = yuk * 0.34;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + gen, y, x + gen, y + yuk, r);
    ctx.arcTo(x + gen, y + yuk, x, y + yuk, r);
    ctx.arcTo(x, y + yuk, x, y, r);
    ctx.arcTo(x, y, x + gen, y, r);
    ctx.closePath();
    ctx.fillStyle = gelBasili ? '#35a55c' : '#3fbf6a';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 ' + Math.max(11, yuk * 0.54) + 'px "Baloo 2",sans-serif';
    ctx.fillText('GELİŞTİR', x + gen / 2, y + yuk * 0.54);
    ctx.restore();
  }

  /* Tam süre: en büyük iki birim yazılır, saniye hep görünür ki
     sayacın işlediği belli olsun.
     2g 5s · 1s 45dk 23sn · 45dk 13sn · 13sn */
  function tamSure(ms) {
    var t = Math.max(0, Math.round(ms / 1000));
    var g  = Math.floor(t / 86400);
    var sa = Math.floor((t % 86400) / 3600);
    var dk = Math.floor((t % 3600) / 60);
    var sn = t % 60;
    if (g  > 0) return g + 'g ' + sa + 's ' + dk + 'dk';
    if (sa > 0) return sa + 's ' + dk + 'dk ' + sn + 'sn';
    if (dk > 0) return dk + 'dk ' + sn + 'sn';
    return sn + 'sn';
  }

  function gelistirdeMi(px, py) {
    if (!secili || !gelBtn.w) return false;
    var pay = 8;
    return px >= gelBtn.x - pay && px <= gelBtn.x + gelBtn.w + pay &&
           py >= gelBtn.y - pay && py <= gelBtn.y + gelBtn.h + pay;
  }

  /* Dokunuş EĞİT düğmesinin üstünde mi (parmak payı ile) */
  function egitteMi(px, py) {
    if (!secili || !egitBtn.w) return false;
    var pay = 8;
    return px >= egitBtn.x - pay && px <= egitBtn.x + egitBtn.w + pay &&
           py >= egitBtn.y - pay && py <= egitBtn.y + egitBtn.h + pay;
  }

  /* ---- Birlikler panelini aç ve ilgili ailenin ekranına geç ----
     Panel #worldScreen içinde z-index 50, kaleiçi 30 → üste biner,
     kaleiçiyi kapatmaya gerek yok. Aile geçişi rol düğmesinin kendi
     kapısından yapılır (go()); iki seçici hep aynı kalır. */
  function egitimAc(aile) {
    /* KİLİT: panel o ailede kalsın — kaydırma ve oklar aile değiştirmez.
       index.html'deki go() ve troops.js'in onOpen'ı bu bayrağı okur.
       Panel açılmadan ÖNCE kurulmalı. */
    window.KISLA_KILIT = aile;

    /* Kaleiçi KAPANMAZ. Kapatıp geri açmak, panel kapanırken kale
       dışındaki haritayı bir kare gösterip göze çarpan bir sıçrama
       yaratıyordu. Katman yerinde kalır, yalnız çizimi durur: seçim
       bırakılır (yanıp sönme biter), tuval boşuna dönmez.
       (Donma zaten burada değildi — sebep gözcü döngüsüydü, aşağıda.) */
    TANI('EGIT basildi -> ' + aile + ' (' + SURUM + ')');

    secili = null; tasiModu = false; tasiDokunus = 0; egitBtn.w = 0; gelBtn.w = 0;
    duraklat = true;

    try {
      if (typeof openOverlayPanel === 'function') {
        openOverlayPanel('troops');
        TANI('openOverlayPanel bitti');
      } else {
        TANI('!! openOverlayPanel YOK');
      }
    } catch (e) {
      TANI('!! openOverlayPanel PATLADI: ' + (e && e.message));
      window.KISLA_KILIT = null; duraklat = false; return;
    }

    var panel = document.getElementById('panel-troops');
    if (panel) panel.classList.add('kisla-kilit');
    TANI('panel active=' + (panel && panel.classList.contains('active')));

    /* Panel açılışı TroopViewer.show() zincirini kurar; aileAc kilitten
       bağımsız tek kapıdır, aynı karede çağrılabilir. */
    if (window.TroopViewer && typeof window.TroopViewer.aileAc === 'function') {
      try {
        window.TroopViewer.aileAc(aile);
        TANI('aileAc bitti');
      } catch (e) { TANI('!! aileAc PATLADI: ' + (e && e.message)); }
    } else {
      TANI('!! TroopViewer.aileAc YOK (index.html eski mi?)');
    }
    kilitIzle();
    TANI('egitimAc tamam');
  }

  /* Panel kapanınca kilit kalkar. Alt menüdeki Birlikler düğmesiyle
     açılan panel kilitsizdir; bayrak orada kalsaydı kaydırma ölürdü. */
  /* Panel kapandı → tuval uyanır. Katman hiç kapanmadığı için
     kamerayı geri kurmaya gerek yok, bozulmadı. */
  function kaleiciyeDon() {
    duraklat = false;
    if (katman && katman.classList.contains('acik')) kareIste();
  }

  var kilitGozcu = null;
  function kilitIzle() {
    var panel = document.getElementById('panel-troops');
    if (!panel || kilitGozcu) return;
    /* ── DONMANIN KÖKÜ (kaleici-36'da düzeltildi) ──
       Bu gözcü panelin sınıfını izliyor. Callback'in İÇİNDE sınıf
       silmek yeni bir nitelik değişimi doğurur ve gözcüyü yeniden
       uyandırır: classList.remove, sınıf zaten yok olsa bile niteliği
       baştan yazar. Kapatınca sonsuz döngü oluşuyor, ana iş parçacığı
       kilitleniyordu — ✕'e basar basmaz oyun donuyordu.
       Çözüm: yapılacak iş kalmadıysa sınıfa DOKUNMADAN çık. */
    kilitGozcu = new MutationObserver(function () {
      if (panel.classList.contains('active')) return;

      var isVar = !!window.KISLA_KILIT ||
                  panel.classList.contains('kisla-kilit') ||
                  duraklat;
      if (!isVar) return;                 // döngüyü kıran satır

      window.KISLA_KILIT = null;
      if (panel.classList.contains('kisla-kilit')) {
        panel.classList.remove('kisla-kilit');
      }
      duraklat = false;
      TANI('panel kapandi -> kaleiciye donuluyor');
      /* Gözcü mikro görev sırasında çalışır; kaleiçiyi açmak ağır bir
         iştir, sıradan çıkıp normal göreve bırakılır. */
      setTimeout(kaleiciyeDon, 0);
    });
    kilitGozcu.observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  /* Dokunuş taşıma düğmesinin üstünde mi (parmak payı ile) */
  function simgedeMi(px, py) {
    if (!secili || !tasiSimge.r) return false;
    var pay = Math.max(tasiSimge.r * 1.6, 22);
    return Math.abs(px - tasiSimge.x) <= pay && Math.abs(py - tasiSimge.y) <= pay;
  }

  /* Dört yönlü ok. hazir=1 → ilk dokunuş yapıldı, bir dokunuş daha bekliyor */
  function tasiSimgesiCiz(x, y, r, etkin, hazir) {
    var u = r * 0.5, b = r * 0.22;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.fillStyle = etkin ? 'rgba(255,198,26,.92)'
                  : (hazir ? 'rgba(255,198,26,.45)' : 'rgba(10,28,48,.55)');
    ctx.fill();
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var a = i * Math.PI / 2;
      var kx = Math.cos(a), ky = Math.sin(a);
      var px = -Math.sin(a), py = Math.cos(a);
      ctx.moveTo(kx * u, ky * u);
      ctx.lineTo(kx * (u - b) + px * b, ky * (u - b) + py * b);
      ctx.lineTo(kx * (u - b) - px * b, ky * (u - b) - py * b);
      ctx.closePath();
    }
    ctx.rect(-b * 0.55, -b * 0.55, b * 1.1, b * 1.1);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, r * 0.20);
    ctx.strokeStyle = etkin ? '#7a4d00' : '#ffc61a';
    ctx.stroke();
    ctx.fillStyle = etkin ? '#4a2f00' : '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  /* ---- Dokunulan noktadaki bina ----
     Önce GÖRSEL dikdörtgenine bakılır, öndeki bina kazanır. Eskiden
     yalnız taban karosuna bakılıyordu; ölçekler 1'in üstünde olduğu
     için parmak gövdeye basınca hiçbir bina bulunamıyordu. */
  function binaBul(sx, sy) {
    var kaynak = BINALAR;   /* süsler seçilemez/taşınamaz */
    var sirali = kaynak.slice().sort(function (a, b) {
      return (b.gx + b.gy) - (a.gx + a.gy);     // önden arkaya
    });
    for (var i = 0; i < sirali.length; i++) {
      if (sirali[i].sus && !binaGorseli(sirali[i])) continue;
      var k = binaKutusu(sirali[i]);
      if (sx >= k.x && sx <= k.x + k.w && sy >= k.y && sy <= k.y + k.h) return sirali[i];
    }
    /* Görselin dışına düşen dokunuş için taban karosu yedeği */
    var d = dunyaya(sx, sy), g = izgara(d.x, d.y);
    for (var j = 0; j < kaynak.length; j++) {
      var b = kaynak[j];
      if (g.gx >= b.gx && g.gx < b.gx + b.en && g.gy >= b.gy && g.gy < b.gy + b.boy) return b;
    }
    return null;
  }

  /* ---- Dokunma: kaydırma + iki parmak yakınlaştırma ---- */
  var parmaklar = {}, parmakSayisi = 0, kistirma = false;
  var sonX = 0, sonY = 0, kaydi = false, basX = 0, basY = 0;
  var ilkMesafe = 0, ilkZoom = 1;
  var tasinan = null, tasiKay = { x: 0, y: 0 };   // sürüklenen bina
  var tasiSimge = { x: 0, y: 0, r: 0 };            // taşıma düğmesinin ekran yeri
  var egitBtn = { x: 0, y: 0, w: 0, h: 0 };        // EĞİT düğmesinin ekran yeri
  var egitBasili = false;                          // parmak EĞİT üstünde indi
  var gelBtn  = { x: 0, y: 0, w: 0, h: 0 };        // GELİŞTİR düğmesinin ekran yeri
  var gelBasili = false;                           // parmak GELİŞTİR üstünde indi
  var tasiModu = false;                            // taşıma açık mı
  var tasiDokunus = 0;                             // düğmeye kaç kez dokunuldu

  function mesafe() {
    var k = Object.keys(parmaklar);
    if (k.length < 2) return 0;
    var a = parmaklar[k[0]], b = parmaklar[k[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /* İki parmağın orta noktası — tuvale göre piksel */
  function orta() {
    var k = Object.keys(parmaklar);
    if (k.length < 2) return null;
    var a = parmaklar[k[0]], b = parmaklar[k[1]];
    var r = tuval.getBoundingClientRect();
    return { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
  }

  /* Ekran pikselini dünya koordinatına çevirir */
  function dunyaya(sx, sy) {
    return {
      x: (sx - tuval.width / (2 * eb)) / CFG.zoom + camX,
      y: (sy - tuval.height / (2 * eb)) / CFG.zoom + camY
    };
  }

  function bas(e) {
    tuval.setPointerCapture && tuval.setPointerCapture(e.pointerId);
    parmaklar[e.pointerId] = { x: e.clientX, y: e.clientY };
    parmakSayisi = Object.keys(parmaklar).length;
    if (parmakSayisi === 1) {
      sonX = basX = e.clientX; sonY = basY = e.clientY;
      kaydi = false; kistirma = false;
      tasinan = null;
      /* Taşıma yalnızca seçili binanın taşıma simgesinden başlar. */
      var r0 = tuval.getBoundingClientRect();
      var px = e.clientX - r0.left, py = e.clientY - r0.top;
      /* Sol alttaki taşıma düğmesi: iki dokunuşta taşıma açılır,
         açıkken bir dokunuş kapatır. */
      /* EĞİT düğmesi taşıma simgesinden ÖNCE bakılır; ikisi ayrı
         köşede ama parmak payları kesişirse eğitim kazansın. */
      if (secili && egitteMi(px, py)) {
        egitBasili = true;
        kaydi = true;              // bırakınca seçim/kaydırma tetiklenmesin
        kareIste();
        return;
      }

      if (secili && gelistirdeMi(px, py)) {
        gelBasili = true;
        kaydi = true;
        kareIste();
        return;
      }

      if (secili && simgedeMi(px, py)) {
        if (tasiModu) { tasiModu = false; tasiDokunus = 0; }
        else {
          tasiDokunus++;
          if (tasiDokunus >= 2) { tasiModu = true; tasiDokunus = 0; }
        }
        kaydi = true;                 // bırakınca seçim değişmesin
        kareIste();
        return;
      }

      var bulunan = binaBul(px, py);
      var hedef = null;
      if (bulunan && bulunan === secili && tasiModu) hedef = bulunan;
      if (hedef) {
        tasinan = hedef;
        var d0 = dunyaya(px, py);
        var g0 = izgara(d0.x, d0.y);
        tasiKay.x = hedef.gx - g0.gx;   // basılan karo ile sol üst arası fark
        tasiKay.y = hedef.gy - g0.gy;
      }
    } else if (parmakSayisi >= 2) {
      tasinan = null;
      kistirma = true;
      ilkMesafe = mesafe();
      ilkZoom = CFG.zoom;
    }
  }

  function hareket(e) {
    if (!parmaklar[e.pointerId]) return;
    parmaklar[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (parmakSayisi >= 2) {
      var m = mesafe();
      if (ilkMesafe > 0 && m > 0) {
        var o = orta();
        /* Zoom öncesi: parmakların altındaki dünya noktası */
        var once = o ? dunyaya(o.x, o.y) : null;
        var z = ilkZoom * (m / ilkMesafe);
        CFG.zoom = Math.max(CFG.zoomMin, Math.min(CFG.zoomMax, z));
        /* Aynı dünya noktası aynı parmak altında kalsın — kayma olmaz */
        if (once) {
          var sonra = dunyaya(o.x, o.y);
          camX += once.x - sonra.x;
          camY += once.y - sonra.y;
        }
        kameraSinirla();
        kareIste();
      }
      return;
    }
    if (Math.abs(e.clientX - basX) > 6 || Math.abs(e.clientY - basY) > 6) kaydi = true;

    /* EĞİT düğmesine basılıyken harita kaymaz */
    if (egitBasili || gelBasili) { sonX = e.clientX; sonY = e.clientY; return; }

    /* Ayar modu: bina sürükleniyorsa harita kaymaz, bina karo değiştirir */
    if (tasinan) {
      var rt = tuval.getBoundingClientRect();
      var dt = dunyaya(e.clientX - rt.left, e.clientY - rt.top);
      var gt = izgara(dt.x, dt.y);
      var yx = gt.gx + tasiKay.x, yy = gt.gy + tasiKay.y;
      if (yx !== tasinan.gx || yy !== tasinan.gy) {
        tasinan.gx = yx; tasinan.gy = yy;
        kareIste();
      }
      sonX = e.clientX; sonY = e.clientY;
      return;
    }

    var dx = e.clientX - sonX, dy = e.clientY - sonY;
    sonX = e.clientX; sonY = e.clientY;
    camX -= dx / CFG.zoom;
    camY -= dy / CFG.zoom;
    kameraSinirla();
    kareIste();
  }

  function birak(e) {
    var vardi = !!parmaklar[e.pointerId];
    delete parmaklar[e.pointerId];
    parmakSayisi = Object.keys(parmaklar).length;

    /* İKİ PARMAKTAN BİRİ KALKTI → kalan parmak kaydırmayı devralır.
       sonX/sonY kalkan parmağın son yerinde kalırsa ilk harekette
       aradaki bütün mesafe tek karede kameraya biniyor: "bırakınca
       başka yere atıyor" belirtisi buydu. Referansı kalan parmağa
       taşı, kıstırma bitene kadar da yeni zoom başlangıcı ver. */
    if (parmakSayisi === 1) {
      var kalanId = Object.keys(parmaklar)[0];
      var kalan = parmaklar[kalanId];
      sonX = kalan.x; sonY = kalan.y;
      basX = kalan.x; basY = kalan.y;
      kaydi = true;            // bırakınca bina seçimi tetiklenmesin
      ilkMesafe = 0;
    }

    if (parmakSayisi === 0) {
      /* EĞİT: parmak DÜĞMENİN ÜSTÜNDE kalktıysa aç. Kaydırıp
         dışarıda bırakırsa hiçbir şey olmaz. */
      if (egitBasili) {
        egitBasili = false;
        var re = tuval.getBoundingClientRect();
        var acilacak = secili && egitteMi(e.clientX - re.left, e.clientY - re.top)
                     ? KISLA_AILE[secili.id] : null;
        kistirma = false;
        kareIste();
        /* Panel açılışı bu dokunuşun kalan olaylarını yutmasın */
        if (acilacak) setTimeout(function () { egitimAc(acilacak); }, 0);
        return;
      }

      /* GELİŞTİR: parmak düğmenin üstünde kalktıysa paneli aç. */
      if (gelBasili) {
        gelBasili = false;
        var rg = tuval.getBoundingClientRect();
        var gAc = secili && gelistirdeMi(e.clientX - rg.left, e.clientY - rg.top)
                ? secili.id : null;
        kistirma = false;
        kareIste();
        var gHedef = secili;
        if (gAc) setTimeout(function () {
          /* Odaklama BURADA yapılır — seçimde değil. Kamera binaya
             oturduktan SONRA panel açılır, yoksa panel açıkken kayan
             kamera görünmez bir işe 60 fps harcar. */
          binayaOdakla(gHedef, function () {
            /* İNŞAAT paneli açıkken tuval DÖNMEYE DEVAM EDİYORDU.
               ciz() seçili bina varken her karede kendini yeniden
               çağırıyor (yanıp sönme); EĞİT'te duraklat=true ile
               durduruluyordu, GELİŞTİR'de durdurulmuyordu. Tam ekran
               zemin boyaması panelin altında 60 fps dönünce telefon
               boğuluyor. Panel kapanınca butonuGuncelle emniyet ağı
               (400 ms) duraklatmayı kendiliğinden kaldırır. */
            if (odakRaf) { cancelAnimationFrame(odakRaf); odakRaf = null; }
            duraklat = true;
            try { if (window.INSAAT) window.INSAAT.ac(gAc); } catch (er) {}
          });
        }, 0);
        return;
      }

      if (tasinan) {
        var tt = tasinan; tasinan = null; kistirma = false;
        if (!kaydi) binaSec(tt);   // sürüklemeden bıraktıysa sadece seçim
        else { kameraSinirla(); yerlesimYaz(); }
        kareIste();
        return;
      }
      if (vardi && !kaydi && !kistirma) {
        var r = tuval.getBoundingClientRect();
        var b = binaBul(e.clientX - r.left, e.clientY - r.top);
        binaSec(b);   // boşluğa dokunulursa seçim kalkar
      }
      kistirma = false;
    }
  }

  function panelAc(b) {
    panelAd.textContent = b.emoji + '  ' + binaAdi(b);
    panel.classList.add('acik');
  }
  function panelKapat() { panel.classList.remove('acik'); }


  /* ================= Yerleşim kaydı (Firebase) =================
     Yalnızca gx/gy kaydedilir. Ölçek ve kaydırma tasarım verisidir,
     kodda sabittir — oyuncuya göre değişmez. */
  var YERLESIM_KOK = 'kaleYerlesim';
  var yerlesimYazZaman = null, yerlesimOkundu = false;

  function fbVar() {
    return (typeof firebaseDb !== 'undefined') && !!firebaseDb;
  }

  function oyuncuAnahtari() {
    if (typeof currentUsername !== 'string' || !currentUsername) return null;
    if (typeof toFirebaseKey !== 'function') return null;
    return toFirebaseKey(currentUsername.toLowerCase());
  }

  function binaBulId(id) {
    for (var i = 0; i < BINALAR.length; i++) {
      if (BINALAR[i].id === id) return BINALAR[i];
    }
    return null;
  }

  function yerlesimOku() {
    if (yerlesimOkundu) return;
    var k = oyuncuAnahtari();
    if (!fbVar()) return;
    if (!k) return;
    yerlesimOkundu = true;
    try {
      firebaseDb.ref(YERLESIM_KOK + '/' + k).once('value').then(function (snap) {
        var v = snap && snap.val();
        if (!v) return;
        for (var id in v) {
          if (!Object.prototype.hasOwnProperty.call(v, id)) continue;
          var b = binaBulId(id), y = v[id];
          if (!b || !y) continue;
          if (typeof y.gx === 'number') b.gx = y.gx;
          if (typeof y.gy === 'number') b.gy = y.gy;
        }
        var o = sahneMerkezi();
        camX = o.x; camY = o.y;
        kameraSinirla();
        kareIste();
      }).catch(function () {});
    } catch (e) {}
  }

  /* Taşıma bitince yazar; art arda taşımalarda tek yazıya toplanır */
  function yerlesimYaz() {
    var k = oyuncuAnahtari();
    if (!fbVar()) return;
    if (!k) return;
    if (yerlesimYazZaman) clearTimeout(yerlesimYazZaman);
    yerlesimYazZaman = setTimeout(function () {
      yerlesimYazZaman = null;
      var veri = {};
      for (var i = 0; i < BINALAR.length; i++) {
        veri[BINALAR[i].id] = { gx: BINALAR[i].gx, gy: BINALAR[i].gy };
      }
      try {
        firebaseDb.ref(YERLESIM_KOK + '/' + k).set(veri).catch(function () {});
      } catch (e) {}
    }, 600);
  }

  /* ---- Kurulum ---- */
  function kur() {
    if (document.getElementById('kaleici')) return;

    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    katman = document.createElement('div');
    katman.id = 'kaleici';
    katman.innerHTML =
      '<canvas id="kaleiciTuval"></canvas>' +
      '<button id="kaleiciKapat">← Haritaya dön</button>' +
      '<div id="kaleiciPanel"><h3 id="kaleiciPanelAd"></h3>' +
      '<p>Bu bina henüz bağlanmadı.</p><button id="kaleiciPanelKapat">Kapat</button></div>';
    /* worldScreen varsa ONUN içine: katman sırası oradaki panellerle
       aynı bağlamda hesaplansın diye (yukarıdaki CSS notu). */
    (document.getElementById('worldScreen') || document.body).appendChild(katman);

    tuval = document.getElementById('kaleiciTuval');
    ctx = tuval.getContext('2d');
    panel = document.getElementById('kaleiciPanel');
    panelAd = document.getElementById('kaleiciPanelAd');

    document.getElementById('kaleiciKapat').addEventListener('click', kapat);
    document.getElementById('kaleiciPanelKapat').addEventListener('click', panelKapat);

    tuval.addEventListener('pointerdown', bas);
    tuval.addEventListener('pointermove', hareket);
    tuval.addEventListener('pointerup', birak);
    tuval.addEventListener('pointercancel', birak);

    window.addEventListener('resize', function () {
      if (katman.classList.contains('acik')) { olcuAyarla(); kareIste(); }
    });

    girBtn = document.createElement('button');
    girBtn.id = 'kaleiciGir';
    girBtn.textContent = '🏰 Kale içi';
    girBtn.addEventListener('click', ac);
    document.body.appendChild(girBtn);

    gorselYukle();
    butonuIzle();
    setTimeout(karaKutuKur, 1500);
  }

  /* Giriş ekranı kapalıysa VE önde açık bir panel yoksa buton görünür.
     Panel açıkken tamamen gizlenir, hiçbir şeyin üstüne binmez. */
  function butonuGuncelle() {
    var g = document.getElementById('loginScreen');
    var oyunda = !g || getComputedStyle(g).display === 'none';
    /* İNŞAAT paneli .overlay-panel değil, body'ye ekli ayrı bir
       katman. Listeye yazılmazsa emniyet ağı 400 ms sonra
       duraklatmayı kaldırır ve tuval panelin altında yeniden döner. */
    var panelAcik = !!document.querySelector(
      '.overlay-panel.active, #seferOnayModal, .sefer-onay-modal, #insaatModal');

    /* Savaş penceresi (#battleArena / arazi paneli aynı kabuğu kullanır)
       display:none ile açılıp kapandığı için sınıfla anlaşılmıyor;
       görünür olanı var mı diye bakıyoruz. */
    if (!panelAcik) {
      var arenalar = document.querySelectorAll('.battle-arena-overlay');
      for (var i = 0; i < arenalar.length; i++) {
        if (getComputedStyle(arenalar[i]).display !== 'none') { panelAcik = true; break; }
      }
    }

    if (girBtn) girBtn.classList.toggle('acik', oyunda && !panelAcik);

    /* EMNİYET AĞI: panel kapandığı halde duraklama bir sebeple
       kalkmadıysa tuval sonsuza kadar ölü kalırdı. 400 ms'de bir
       kontrol edilir — gözcü kaçırsa bile kaleiçi kendine gelir. */
    if (duraklat && !panelAcik) {
      window.KISLA_KILIT = null;
      kaleiciyeDon();
    }
  }

  function butonuIzle() {
    butonuGuncelle();
    setInterval(butonuGuncelle, 400);
  }

  function ac() {
    kur();
    duraklat = false;
    panelKapat();
    katman.classList.add('acik');
    document.body.classList.add('kaleici-acik');
    secili = null;
    if (!oyuncuAnahtari()) yerlesimOkundu = false;   // adı henüz gelmediyse tekrar dene
    yerlesimOku();
    var o = sahneMerkezi();
    camX = o.x; camY = o.y;
    parmaklar = {}; parmakSayisi = 0; kistirma = false;
    olcuAyarla();
    CFG.zoom = (tuval.width / eb) / (CFG.karoAcilis * CFG.tileW);
    zoomSinirlariniHesapla();
    kameraSinirla();
    ciz();
  }

  function kapat() {
    duraklat = false;
    panelKapat();
    secili = null; tasinan = null; tasiModu = false; tasiDokunus = 0;
    document.body.classList.remove('kaleici-acik');
    if (katman) katman.classList.remove('acik');
    tuvaliBosalt();
  }

  /* ── BELLEK: tuvali gerçekten bırak ──
     display:none tuvalin belleğini BOŞALTMAZ. Tam ekran tuval
     aygıt piksel oranıyla çarpılıyor (720×1600 @2× ≈ 18 MB), üstüne
     tarayıcı bir de GPU kopyası tutuyor. Kaleiçi kapalıyken bu yer
     boşuna dolu duruyordu; Eğitim ekranı 18 katmanlı görselleriyle
     üstüne binince telefon çöküyordu.
     Ölçüyü 1×1'e indirmek belleği anında geri verir. Yeniden
     açılışta ac() → olcuAyarla() ölçüyü tekrar kurar. */
  function tuvaliBosalt() {
    if (!tuval) return;
    try {
      if (ctx) ctx.clearRect(0, 0, tuval.width, tuval.height);
      tuval.width = 1;
      tuval.height = 1;
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', kur);
  } else {
    kur();
  }


  /* ═══════════════════════════════════════════════════════════
     DAĞ AYAR PANELİ — GEÇİCİ  (?dagayar=1)
     ÜÇ SATIR: dağ seçimi · alan sekmeleri · tek sürgü.
     Altı sürgü aynı anda duruyordu, ekranın yarısını kaplıyor ve
     ayarlanan dağ görünmüyordu — ayar paneli işe yaramıyordu.
     Şimdi hangi alan seçiliyse yalnız o sürgü var.
     Dialanınca YAZDIR'a basılır, çıkan satırlar SUSLER'e yapıştırılır
     ve bu blok silinir. Kalıcı kod değil.
     ═══════════════════════════════════════════════════════════ */
  (function dagAyarPaneli() {
    if (!/[?&]dagayar=1/.test(location.search || '')) return;

    var sec = 0, alan = 0;
    var kok = null, ustBilgi = null, cikti = null;
    var dagSurgu = null, aSurgu = null, aDeger = null, sekmeler = [];

    function s() { return SUSLER[sec]; }

    /* Ayarlanabilir alanlar — tek tablo, başka yerde tekrarı yok */
    var ALANLAR = [
      { ad: 'gx',  az: -24,  cok: 24,   adim: 1,
        oku: function () { return s().gx; },
        yaz: function (v) { s().gx = Math.round(v); } },
      { ad: 'gy',  az: -24,  cok: 24,   adim: 1,
        oku: function () { return s().gy; },
        yaz: function (v) { s().gy = Math.round(v); } },
      { ad: 'ölç', az: 0.10, cok: 3.00, adim: 0.02, ondalik: 2,
        oku: function () { return s().olcek || 1; },
        yaz: function (v) { s().olcek = Math.max(0.05, Math.round(v * 100) / 100); } },
      { ad: 'dy',  az: -200, cok: 200,  adim: 2,
        oku: function () { return s().dy || 0; },
        yaz: function (v) { s().dy = Math.round(v); } },
      { ad: '°',   az: -180, cok: 180,  adim: 5,
        oku: function () { return s().dondur || 0; },
        yaz: function (v) { s().dondur = Math.round(v); } },
      { ad: 'R',   az: 100,  cok: 900,  adim: 10,
        oku: function () { return ZCFG.ada.yaricap; },
        yaz: function (v) { ZCFG.ada.yaricap = Math.max(50, Math.round(v)); } },
      /* Kameranın gezinme kutusu — hangi yönde ne kadar açılabilsin */
      { ad: 'Kn↑',  az: 0, cok: 1200, adim: 10,
        oku: function () { return ZCFG.ada.gez.ust; },
        yaz: function (v) { ZCFG.ada.gez.ust = Math.max(0, Math.round(v)); kameraSinirla(); } },
      { ad: 'Km↓',  az: 0, cok: 1200, adim: 10,
        oku: function () { return ZCFG.ada.gez.alt; },
        yaz: function (v) { ZCFG.ada.gez.alt = Math.max(0, Math.round(v)); kameraSinirla(); } },
      { ad: 'Kn←',  az: 0, cok: 1200, adim: 10,
        oku: function () { return ZCFG.ada.gez.sol; },
        yaz: function (v) { ZCFG.ada.gez.sol = Math.max(0, Math.round(v)); kameraSinirla(); } },
      { ad: 'Kn→',  az: 0, cok: 1200, adim: 10,
        oku: function () { return ZCFG.ada.gez.sag; },
        yaz: function (v) { ZCFG.ada.gez.sag = Math.max(0, Math.round(v)); kameraSinirla(); } }
    ];

    function stil() {
      if (document.getElementById('dagAyarCSS')) return;
      var st = document.createElement('style');
      st.id = 'dagAyarCSS';
      st.textContent =
        '#dagAyar{position:fixed;left:0;right:0;bottom:0;z-index:99998;' +
          'background:rgba(3,16,38,.80);color:#eaf7ff;padding:2px 6px 4px;' +
          'font:11px/1.15 "Baloo 2",monospace;transition:transform .16s ease;}' +
        '#dagAyar.kapali{transform:translateY(calc(100% - 22px));}' +
        '#dagAyar .da-sat{display:flex;align-items:center;gap:4px;margin:2px 0;}' +
        '#dagAyar .da-sat .et{flex:0 0 auto;opacity:.8;font-size:10px;}' +
        '#dagAyar .dg{flex:0 0 46px;text-align:right;font-size:11px;' +
          'font-variant-numeric:tabular-nums;font-weight:800;}' +
        '#dagAyar b{flex:0 0 auto;font-size:11px;}' +
        '#dagAyar input[type=range]{flex:1 1 auto;min-width:0;height:18px;margin:0;' +
          'accent-color:#3fbf6a;background:transparent;}' +
        '#dagAyar button{border:none;border-radius:5px;background:#22488f;color:#fff;' +
          'font:800 11px "Baloo 2",sans-serif;padding:2px 6px;cursor:pointer;}' +
        '#dagAyar button.sk{background:rgba(255,255,255,.10);padding:2px 7px;}' +
        '#dagAyar button.sk.acik{background:#3fbf6a;}' +
        '#dagAyar button.ana{background:#3fbf6a;}' +
        '#dagAyar textarea{display:none;width:100%;height:96px;margin-top:4px;' +
          'font:10px monospace;background:#08182f;color:#cfeaff;' +
          'border:1px solid #2a5a94;border-radius:5px;}';
      document.head.appendChild(st);
    }

    function dugme(ad, fn, sinif) {
      var b = document.createElement('button');
      b.textContent = ad;
      if (sinif) b.className = sinif;
      b.addEventListener('click', function (e) { e.stopPropagation(); fn(); tazele(); });
      return b;
    }

    function yaz(v) {
      ALANLAR[alan].yaz(v);
      zOnbellek = null;
      kareIste();
    }

    function kur() {
      stil();
      kok = document.createElement('div');
      kok.id = 'dagAyar';

      /* 1. SATIR — dağ seçimi + odak + katla */
      var r1 = document.createElement('div');
      r1.className = 'da-sat';
      ustBilgi = document.createElement('b');
      dagSurgu = document.createElement('input');
      dagSurgu.type = 'range';
      dagSurgu.min = 0; dagSurgu.max = SUSLER.length - 1; dagSurgu.step = 1;
      dagSurgu.addEventListener('input', function () {
        sec = parseInt(dagSurgu.value, 10) || 0;
        odakla(); tazele();
      });
      r1.appendChild(ustBilgi);
      r1.appendChild(dagSurgu);
      r1.appendChild(dugme('◎', odakla));
      r1.appendChild(dugme('▾', function () { kok.classList.toggle('kapali'); }));
      kok.appendChild(r1);

      /* 2. SATIR — hangi alan ayarlanıyor */
      var r2 = document.createElement('div');
      r2.className = 'da-sat';
      ALANLAR.forEach(function (a, i) {
        var b = dugme(a.ad, function () { alan = i; }, 'sk');
        sekmeler.push(b);
        r2.appendChild(b);
      });
      r2.appendChild(dugme('YAZ', yazdir, 'ana'));
      kok.appendChild(r2);

      /* 3. SATIR — seçili alanın tek sürgüsü */
      var r3 = document.createElement('div');
      r3.className = 'da-sat';
      aSurgu = document.createElement('input');
      aSurgu.type = 'range'; aSurgu.step = 1;
      aSurgu.addEventListener('input', function () {
        var a = ALANLAR[alan];
        yaz(a.az + (parseInt(aSurgu.value, 10) || 0) * a.adim);
        degerYaz();
      });
      aDeger = document.createElement('span');
      aDeger.className = 'dg';
      r3.appendChild(dugme('−', function () { yaz(ALANLAR[alan].oku() - ALANLAR[alan].adim); }));
      r3.appendChild(aSurgu);
      r3.appendChild(dugme('+', function () { yaz(ALANLAR[alan].oku() + ALANLAR[alan].adim); }));
      r3.appendChild(aDeger);
      kok.appendChild(r3);

      cikti = document.createElement('textarea');
      cikti.readOnly = true;
      kok.appendChild(cikti);

      document.body.appendChild(kok);
      tazele();
    }

    function odakla() { try { binayaOdakla(s()); } catch (e) {} }

    function degerYaz() {
      var a = ALANLAR[alan], d = a.oku();
      aDeger.textContent = a.ondalik ? d.toFixed(a.ondalik) : d;
    }

    function yazdir() {
      var sat = SUSLER.map(function (b) {
        return "    { id: '" + b.id + "', ad: '" + b.ad + "', emoji: '" + b.emoji +
               "', gorsel: '" + b.gorsel + "', gx: " + b.gx + ", gy: " + b.gy +
               ", en: " + b.en + ", boy: " + b.boy +
               ", olcek: " + (b.olcek || 1) +
               (b.dy ? ", dy: " + b.dy : "") +
               (b.dondur ? ", dondur: " + b.dondur : "") +
               ", sus: true }";
      }).join(',\n');
      cikti.style.display = 'block';
      var g = ZCFG.ada.gez;
      cikti.value = 'yaricap: ' + ZCFG.ada.yaricap +
                    '\ngez: { sol: ' + g.sol + ', sag: ' + g.sag +
                    ', ust: ' + g.ust + ', alt: ' + g.alt + ' }\n\n' + sat;
      cikti.focus(); cikti.select();
    }

    function tazele() {
      if (!kok) return;
      ustBilgi.textContent = s().id;
      dagSurgu.value = sec;
      sekmeler.forEach(function (b, i) {
        b.className = 'sk' + (i === alan ? ' acik' : '');
      });
      var a = ALANLAR[alan];
      aSurgu.min = 0;
      aSurgu.max = Math.round((a.cok - a.az) / a.adim);
      var n = Math.round((a.oku() - a.az) / a.adim);
      aSurgu.value = Math.max(0, Math.min(+aSurgu.max, n));
      degerYaz();
      zOnbellek = null;
      kareIste();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', kur);
    } else {
      setTimeout(kur, 0);
    }
  })();

  window.KALEICI = { SURUM: SURUM, CFG: CFG, BINALAR: BINALAR, GORSELLER: GORSELLER,
                    ac: ac, kapat: kapat, ciz: ciz, gorselYukle: gorselYukle,
                    SUSLER: SUSLER, ZCFG: ZCFG,
                    binaAdi: binaAdi, binaKutusu: binaKutusu,
                    binaSeviyesi: binaSeviyesi,
                    yerlesimOku: yerlesimOku, yerlesimYaz: yerlesimYaz };
})();
