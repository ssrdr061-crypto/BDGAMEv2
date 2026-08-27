/* kaleici.js — Kale içi sahnesi
   Tek dosya. index.html'e sadece <script src="kaleici.js"></script> eklenir.
   Zemin ve binalar AYNI canvas'a çizilir; DOM/canvas karışımı yok.
   Binalar herkeste sabit — hiçbir kayıt tutulmaz, Firebase'e yazılmaz.
*/
(function () {
  'use strict';

  var SURUM = 'kaleici-26';

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
    { id: 'kale',      ad: 'Ana Kale',         emoji: '🏰', gorsel: 'anakale.webp',       gx: -2, gy: 6,  en: 3, boy: 3, olcek: 0.66 },
    { id: 'sovalye',   ad: 'Savunucu Kışlası', emoji: '⚔️', gorsel: 'savunucukisla.webp', gx: 2,  gy: 6,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'asker',     ad: 'Koruyucu Kışlası', emoji: '🛡️', gorsel: 'koruyucukisla.webp', gx: 2,  gy: 3,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'robot',     ad: 'Nişancı Kışlası',  emoji: '🤖', gorsel: 'nisancikisla.webp',  gx: 2,  gy: 9,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'arastirma', ad: 'Araştırma',        emoji: '🔬', gorsel: 'arastirma.webp',     gx: -4, gy: 3,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'fuze',      ad: 'Füze Merkezi',     emoji: '🚀', gorsel: 'fuzemerkezi.webp',   gx: -1, gy: 3,  en: 2, boy: 2, olcek: 0.66 },
    { id: 'konuk',     ad: 'Konuk Evleri',     emoji: '🏘️', gorsel: 'konukevleri.webp',   gx: -6, gy: 1,  en: 2, boy: 2, olcek: 0.66 },
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
  var SUSLER = [
    { id: 'dag_01', ad: 'Dağ A', emoji: '⛰️', gorsel: 'dag1.webp', gx: 6, gy: -1, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_02', ad: 'Dağ B', emoji: '⛰️', gorsel: 'dag2.webp', gx: 9, gy: 3, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_03', ad: 'Dağ C', emoji: '⛰️', gorsel: 'dag3.webp', gx: 10, gy: 7, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_04', ad: 'Dağ D', emoji: '⛰️', gorsel: 'dag1.webp', gx: 9, gy: 11, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_05', ad: 'Dağ E', emoji: '⛰️', gorsel: 'dag2.webp', gx: 7, gy: 15, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_06', ad: 'Dağ F', emoji: '⛰️', gorsel: 'dag3.webp', gx: 4, gy: 17, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_07', ad: 'Dağ G', emoji: '⛰️', gorsel: 'dag1.webp', gx: 0, gy: 17, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_08', ad: 'Dağ H', emoji: '⛰️', gorsel: 'dag2.webp', gx: -5, gy: 16, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_09', ad: 'Dağ I', emoji: '⛰️', gorsel: 'dag3.webp', gx: -8, gy: 14, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_10', ad: 'Dağ J', emoji: '⛰️', gorsel: 'dag1.webp', gx: -11, gy: 10, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_11', ad: 'Dağ K', emoji: '⛰️', gorsel: 'dag2.webp', gx: -12, gy: 6, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_12', ad: 'Dağ L', emoji: '⛰️', gorsel: 'dag3.webp', gx: -11, gy: 2, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_13', ad: 'Dağ M', emoji: '⛰️', gorsel: 'dag1.webp', gx: -9, gy: -2, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_14', ad: 'Dağ N', emoji: '⛰️', gorsel: 'dag2.webp', gx: -6, gy: -4, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_15', ad: 'Dağ O', emoji: '⛰️', gorsel: 'dag3.webp', gx: -2, gy: -4, en: 3, boy: 3, olcek: 0.66, sus: true },
    { id: 'dag_16', ad: 'Dağ P', emoji: '⛰️', gorsel: 'dag1.webp', gx: 3, gy: -3, en: 3, boy: 3, olcek: 0.66, sus: true }
  ];


  /* Çizim, dokunuş ve ayar listesi bunu okur; kayıt yalnız BINALAR'ı. */
  function tumYapilar() { return BINALAR.concat(SUSLER); }

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
  function binaAdi(b) {
    if (b.sus) return b.ad;
    return (b.sv || 1) + '. Sv ' + b.ad;
  }

  function binaGorseli(b) {
    var g = GORSELLER[b.id];
    return (g && g.hazir && g.im.naturalWidth > 0) ? g : null;
  }

  /* ---- Stil: en az sayıda kural, 3B yok ---- */
  var CSS =
    '#kaleici{position:fixed;inset:0;z-index:9000;display:none;' +
      'background:#7fae5c;font-family:"Baloo 2",sans-serif;touch-action:none}' +
    '#kaleici.acik{display:block}' +
    /* Kaleiçi açıkken paneller bu katmana taşınır (aşağıdaki panelleriTasi) */
    '#kaleici .hud-top,#kaleici .hud-kaynak,#kaleici .nav-dock{z-index:40}' +
    /* Taşınan pencereler menü şeritlerinin de üstünde kalmalı */
    '#kaleici .overlay-panel{z-index:60}' +
    '#kaleici .battle-arena-overlay{z-index:60}' +
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
    '#kaleiciGir:active{transform:scale(.96);filter:brightness(.93)}';


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
      yaricap: 560,        // kara sınırı
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
    var yenile = !ob || ob.zoom !== CFG.zoom || ob.tileH !== CFG.tileH ||
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
    CFG.zoomMin = w / (CFG.karoUzak * CFG.tileW);
    CFG.zoomMax = w / (CFG.karoYakin * CFG.tileW);
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
  function kameraSinirla() {
    var a = binaAlani();
    var m = sahneMerkezi();
    var yariW = (tuval.width / eb) / (2 * CFG.zoom);
    var yariH = (tuval.height / eb) / (2 * CFG.zoom);
    /* Yayılımın yarısı + gezinme payı */
    var sahneW = (a.x1 - a.x0 + a.y1 - a.y0) * CFG.tileW / 4 + CFG.tileW * 2;
    var sahneH = (a.x1 - a.x0 + a.y1 - a.y0) * CFG.tileH / 4 + CFG.tileH * 3;
    var sapX = Math.max(0, sahneW - yariW);
    var sapY = Math.max(0, sahneH - yariH);
    if (camX < m.x - sapX) camX = m.x - sapX;
    if (camX > m.x + sapX) camX = m.x + sapX;
    if (camY < m.y - sapY) camY = m.y - sapY;
    if (camY > m.y + sapY) camY = m.y + sapY;
  }

  function kareIste() {
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
    kareIste();
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
    var alt = ekran(nk[2].x, nk[2].y);
    return {
      x: o.x - gen / 2 + (b.dx || 0) * CFG.zoom,
      y: alt.y - yuk + (b.dy || 0) * CFG.zoom,
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
      ctx.drawImage(g.im, k.sx, k.sy, k.sw, k.sh, kut.x, kut.y, kut.w, kut.h);
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
    if (!secili) { tasiSimge.r = 0; return; }
    var b = secili;
    var kut = binaKutusu(b);
    var o = { x: kut.x + kut.w / 2 };

    var boy = Math.max(15, 19 * CFG.zoom);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 ' + boy + 'px "Baloo 2",sans-serif';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(2, boy * 0.17);
    ctx.strokeStyle = '#ffc61a';
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
    } else if (parmakSayisi === 2) {
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
    if (parmakSayisi === 0) {
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

  /* ---- Oyunun üst/alt panelleri ----
     #worldScreen position:fixed olduğu için kendi yığın bağlamını açar;
     z-index ile üste alınamazlar. Bu yüzden kaleiçi açıkken DOM'da bu
     katmana taşınır, kapanınca tam eski yerlerine geri konur. ---- */
  /* Menü şeritleri TEK tane. Menülerin AÇTIĞI pencereler (.overlay-panel:
     sandık · çanta · mağaza · kahraman · birlik · günlük · hastane ·
     sıralama) da #worldScreen'in içinde duruyor; taşınmazlarsa
     düğmeye basılıyor, panel .active oluyor ama kaleiçi katmanının
     ARKASINDA kalıyor — "menü açılmıyor" belirtisi buydu.
     Hepsi normalde display:none; taşınmaları görüntüyü değiştirmez. */
  var TASINAN_PANELLER = ['.hud-top', '.hud-kaynak', '.nav-dock'];
  var TASINAN_COKLU    = ['.overlay-panel', '.battle-arena-overlay'];
  var panelYerleri = [];

  function panelYerineAl(el) {
    if (!el || !el.parentNode || el.parentNode === katman) return;
    panelYerleri.push({ el: el, ebeveyn: el.parentNode, sonraki: el.nextSibling });
    katman.appendChild(el);
  }

  function panelleriTasi() {
    if (panelYerleri.length) return;
    for (var i = 0; i < TASINAN_PANELLER.length; i++) {
      panelYerineAl(document.querySelector(TASINAN_PANELLER[i]));
    }
    for (var j = 0; j < TASINAN_COKLU.length; j++) {
      var liste = document.querySelectorAll(TASINAN_COKLU[j]);
      for (var k = 0; k < liste.length; k++) panelYerineAl(liste[k]);
    }
  }

  function panelleriGeriKoy() {
    for (var i = panelYerleri.length - 1; i >= 0; i--) {
      var y = panelYerleri[i];
      try {
        if (y.sonraki && y.sonraki.parentNode === y.ebeveyn) y.ebeveyn.insertBefore(y.el, y.sonraki);
        else y.ebeveyn.appendChild(y.el);
      } catch (e) {}
    }
    panelYerleri = [];
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
    document.body.appendChild(katman);

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
  }

  /* Giriş ekranı kapalıysa VE önde açık bir panel yoksa buton görünür.
     Panel açıkken tamamen gizlenir, hiçbir şeyin üstüne binmez. */
  function butonuGuncelle() {
    var g = document.getElementById('loginScreen');
    var oyunda = !g || getComputedStyle(g).display === 'none';
    var panelAcik = !!document.querySelector(
      '.overlay-panel.active, #seferOnayModal, .sefer-onay-modal');

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
  }

  function butonuIzle() {
    butonuGuncelle();
    setInterval(butonuGuncelle, 400);
  }

  function ac() {
    kur();
    panelKapat();
    katman.classList.add('acik');
    document.body.classList.add('kaleici-acik');
    panelleriTasi();
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
    panelKapat();
    secili = null; tasinan = null; tasiModu = false; tasiDokunus = 0;
    panelleriGeriKoy();
    document.body.classList.remove('kaleici-acik');
    if (katman) katman.classList.remove('acik');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', kur);
  } else {
    kur();
  }

  window.KALEICI = { SURUM: SURUM, CFG: CFG, BINALAR: BINALAR, GORSELLER: GORSELLER,
                    ac: ac, kapat: kapat, ciz: ciz, gorselYukle: gorselYukle,
                    SUSLER: SUSLER, ZCFG: ZCFG,
                    binaAdi: binaAdi, binaKutusu: binaKutusu,
                    yerlesimOku: yerlesimOku, yerlesimYaz: yerlesimYaz };
})();
