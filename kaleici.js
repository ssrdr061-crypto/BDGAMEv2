/* kaleici.js — Kale içi sahnesi
   Tek dosya. index.html'e sadece <script src="kaleici.js"></script> eklenir.
   Zemin ve binalar AYNI canvas'a çizilir; DOM/canvas karışımı yok.
   Binalar herkeste sabit — hiçbir kayıt tutulmaz, Firebase'e yazılmaz.
*/
(function () {
  'use strict';

  var SURUM = 'kaleici-20';

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
    { id: 'kale',      ad: 'Ana Kale',         emoji: '🏰', gorsel: 'anakale.webp',       gx: -2, gy: 6,  en: 3, boy: 3, olcek: 0.92 },
    { id: 'sovalye',   ad: 'Savunucu Kışlası', emoji: '⚔️', gorsel: 'savunucukisla.webp', gx: 2,  gy: 6,  en: 2, boy: 2, olcek: 0.80 },
    { id: 'asker',     ad: 'Koruyucu Kışlası', emoji: '🛡️', gorsel: 'koruyucukisla.webp', gx: 2,  gy: 3,  en: 2, boy: 2, olcek: 0.80 },
    { id: 'robot',     ad: 'Nişancı Kışlası',  emoji: '🤖', gorsel: 'nisancikisla.webp',  gx: 2,  gy: 9,  en: 2, boy: 2, olcek: 0.79 },
    { id: 'arastirma', ad: 'Araştırma',        emoji: '🔬', gorsel: 'arastirma.webp',     gx: -4, gy: 3,  en: 2, boy: 2, olcek: 0.81 },
    { id: 'fuze',      ad: 'Füze Merkezi',     emoji: '🚀', gorsel: 'fuzemerkezi.webp',   gx: -1, gy: 3,  en: 2, boy: 2, olcek: 0.80 },
    { id: 'konuk',     ad: 'Konuk Evleri',     emoji: '🏘️', gorsel: 'konukevleri.webp',   gx: -6, gy: 1,  en: 2, boy: 2, olcek: 0.50 },
    { id: 'oyun',      ad: 'Oyun Merkezi',     emoji: '🎲', gorsel: 'oyunmerkezi.webp',   gx: 5,  gy: 8,  en: 2, boy: 2, olcek: 0.81 },
    { id: 'ittifak',   ad: 'İttifak Binası',   emoji: '🤝', gorsel: 'ittifakbinasi.webp', gx: 5,  gy: 5,  en: 2, boy: 2, olcek: 0.80 },
    { id: 'hastane',   ad: 'Hastane',          emoji: '🏥', gorsel: 'hastanebina.webp',   gx: -7, gy: 7,  en: 2, boy: 2, olcek: 1.30 },

    { id: 'odun',      ad: 'Odun',             emoji: '🪵', gorsel: 'odunuretim.webp',    gx: -2, gy: 11, en: 1, boy: 1, olcek: 0.79 },
    { id: 'demir',     ad: 'Demir',            emoji: '⛏️', gorsel: 'demiruretim.webp',   gx: 0,  gy: 11, en: 1, boy: 1, olcek: 0.80 },
    { id: 'su',        ad: 'Su',               emoji: '💧', gorsel: 'suuretim.webp',      gx: -1, gy: 13, en: 1, boy: 1, olcek: 0.80 },
    { id: 'enerji',    ad: 'Enerji',           emoji: '⚡', gorsel: 'enerjiuretim.webp',  gx: -3, gy: 13, en: 1, boy: 1, olcek: 0.80 },
    { id: 'ahir',      ad: 'Ahır',             emoji: '🐄', gorsel: 'ahiruretim.webp',    gx: -4, gy: 11, en: 1, boy: 1, olcek: 0.79 }
  ];


  /* ---- Görsel yükleyici: dosya yoksa sessizce emojiye düşülür ---- */
  var GORSELLER = {};

  function gorselYukle() {
    for (var i = 0; i < BINALAR.length; i++) {
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
      })(BINALAR[i]);
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
    /* Kapat düğmesi ve sürüm yazısı üst panelin altına iner */
    'body.kaleici-acik #kaleiciKapat{top:104px}' +
    'body.kaleici-acik #kaleiciSurum{top:108px}' +
    '#kaleiciTuval{position:absolute;left:0;top:0;width:100%;height:100%;display:block}' +
    '#kaleiciKapat{position:absolute;left:12px;top:12px;z-index:2;' +
      'padding:8px 16px;border:none;border-radius:10px;background:#1d3f63;color:#eaf6ff;' +
      'font:600 15px/1 "Baloo 2",sans-serif;text-shadow:0 1px 2px rgba(0,20,45,.55);' +
      'box-shadow:none;transition:transform .09s,filter .09s}' +
    '#kaleiciKapat:active{transform:scale(.96);filter:brightness(.93)}' +
    '#kaleiciSurum{position:absolute;right:12px;top:16px;z-index:4;' +
      'padding:4px 6px;color:rgba(255,255,255,.75);' +
      'font:500 12px/1 "Baloo 2",sans-serif}' +
    '#kaleiciSurum:active{filter:brightness(1.4)}' +
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

    /* ---- Ayar paneli (?ayar=1) — iş bitince bu blok ve AYAR kodu silinir ---- */
    '#kaleiciAyar{display:none;position:absolute;left:10px;right:10px;bottom:118px;z-index:5;' +
      'padding:7px 9px;border-radius:10px;background:rgba(10,28,48,.82);' +
      '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:#dbeaf7;' +
      'font:500 11px/1.2 "Baloo 2",sans-serif;box-shadow:none}' +
    '#kaleiciAyar.acik{display:block}' +
    '#kaleiciAyar.kapali .ka-govde{display:none}' +
    '#kaleiciAyar .ka-ust{display:flex;align-items:center;gap:6px}' +
    '#kaleiciAyar select{flex:1;min-width:0;padding:3px 5px;border:none;border-radius:6px;' +
      'background:rgba(255,255,255,.08);color:#dbeaf7;' +
      'font:600 11.5px/1 "Baloo 2",sans-serif}' +
    '#kaleiciAyar .ka-kat{padding:3px 8px;border:none;border-radius:6px;' +
      'background:rgba(255,255,255,.10);color:#dbeaf7;font:600 11px/1 "Baloo 2",sans-serif}' +
    '#kaleiciAyar .ka-satir{display:flex;align-items:center;gap:7px;margin-top:3px}' +
    '#kaleiciAyar .ka-ad{width:44px;flex:none;opacity:.7;font-size:10.5px}' +
    '#kaleiciAyar .ka-deg{width:42px;flex:none;text-align:right;opacity:.9;' +
      'font-variant-numeric:tabular-nums;font-weight:600;font-size:10.5px}' +
    '#kaleiciAyar input[type=range]{flex:1;min-width:0;height:16px;accent-color:#6fb6ee;' +
      'background:transparent}' +
    '#kaleiciAyar .ka-alt{display:flex;gap:6px;margin-top:6px}' +
    '#kaleiciAyar .ka-alt button{flex:1;padding:4px 0;border:none;border-radius:6px;' +
      'background:rgba(255,255,255,.10);color:#dbeaf7;' +
      'font:600 11px/1 "Baloo 2",sans-serif}' +
    '#kaleiciAyar .ka-alt button:active{filter:brightness(1.3)}' +
    '#kaleiciAyar .ka-ipucu{margin-top:5px;opacity:.55;font-size:10px}' +
    '#kaleiciAyar textarea{width:100%;box-sizing:border-box;margin-top:5px;height:60px;' +
      'border:none;border-radius:6px;padding:5px;background:rgba(0,0,0,.35);color:#cfe6ff;' +
      'font:500 10px/1.3 monospace;display:none}' +
    '#kaleiciAyar.metin textarea{display:block}';

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
    renk: [82, 192, 58],   // çimen taban rengi (harita.js zeminRenk.cimen)
    koyu: 0.24, acik: 0.24,
    isik: 0.32,
    lekeYatay: 2.4,
    /* Leke sıklığı. Ana haritada ekranda onlarca karo görünüyor, burada
       6 tane; aynı frekansla tek bir lekenin ortasında kalıyorduk ve
       zemin düz yeşil görünüyordu. Büyüt = desen sıklaşır. */
    siklik: 3.6,
    doygunluk: 1.22,
    adim: 12,              // kaç dünya pikselinde bir örnek alınır
    seed: 20260803
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

  function zeminRengi(gx, gy) {
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
        var c = zeminRengi((gb + ga) / 2, (gb - ga) / 2);
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
    for (var i = 0; i < BINALAR.length; i++) {
      var b = BINALAR[i];
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
    var sirali = BINALAR.slice().sort(function (a, b) {
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
    secili = b;
    if (b && ayarGorunur() && ayarSecim) { ayarSecim.value = b.id; ayarTazele(); }
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
    if (!secili) return;
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
  }

  /* ---- Dokunulan noktadaki bina ----
     Önce GÖRSEL dikdörtgenine bakılır, öndeki bina kazanır. Eskiden
     yalnız taban karosuna bakılıyordu; ölçekler 1'in üstünde olduğu
     için parmak gövdeye basınca hiçbir bina bulunamıyordu. */
  function binaBul(sx, sy) {
    var sirali = BINALAR.slice().sort(function (a, b) {
      return (b.gx + b.gy) - (a.gx + a.gy);     // önden arkaya
    });
    for (var i = 0; i < sirali.length; i++) {
      var k = binaKutusu(sirali[i]);
      if (sx >= k.x && sx <= k.x + k.w && sy >= k.y && sy <= k.y + k.h) return sirali[i];
    }
    /* Görselin dışına düşen dokunuş için taban karosu yedeği */
    var d = dunyaya(sx, sy), g = izgara(d.x, d.y);
    for (var j = 0; j < BINALAR.length; j++) {
      var b = BINALAR[j];
      if (g.gx >= b.gx && g.gx < b.gx + b.en && g.gy >= b.gy && g.gy < b.gy + b.boy) return b;
    }
    return null;
  }

  /* ---- Dokunma: kaydırma + iki parmak yakınlaştırma ---- */
  var parmaklar = {}, parmakSayisi = 0, kistirma = false;
  var sonX = 0, sonY = 0, kaydi = false, basX = 0, basY = 0;
  var ilkMesafe = 0, ilkZoom = 1;
  var tasinan = null, tasiKay = { x: 0, y: 0 };   // sürüklenen bina

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
      /* İlk dokunuş binayı SEÇER. Seçili binaya ikinci kez basıp
         sürüklemek onu taşır — ayrı bir taşıma düğmesi yok. */
      var bulunan = binaBul(px, py);
      var hedef = null;
      if (bulunan && (bulunan === secili || ayarGorunur())) hedef = bulunan;
      if (hedef) {
        tasinan = hedef;
        var d0 = dunyaya(px, py);
        var g0 = izgara(d0.x, d0.y);
        tasiKay.x = hedef.gx - g0.gx;   // basılan karo ile sol üst arası fark
        tasiKay.y = hedef.gy - g0.gy;
        if (ayarGorunur()) binaSec(hedef);
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


  /* ================= AYAR PANELİ — GEÇİCİ (?ayar=1) =================
     İnce ayar bitince: bu blok, CSS'teki #kaleiciAyar kuralları ve
     kur() içindeki ayarKur() çağrısı silinir. ================= */
  /* Panel her zaman kurulur; sürüm yazısına (sağ üst) dokunmak açar/kapar.
     ?ayar=1 ile açılışta görünür gelir. */
  var AYAR_ACIK = /[?&]ayar=1/.test(location.search);
  var ayarKutu, ayarSecim, ayarSurgu = {}, ayarDeger = {}, ayarMetin;

  /* Panel görünürken HERHANGİ bir bina sürüklenebilir; kapalıyken
     yalnız seçili bina taşınır. */
  function ayarGorunur() {
    return !!(ayarKutu && ayarKutu.classList.contains('acik'));
  }

  function ayarAcKapa() {
    if (!ayarKutu) return;
    ayarKutu.classList.toggle('acik');
    if (ayarGorunur() && secili && ayarSecim) { ayarSecim.value = secili.id; ayarTazele(); }
  }

  var AYAR_SURGULER = [
    { ad: 'olcek', etiket: 'Ölçek', min: 10, max: 300, adim: 1, bol: 100, vars: 1 },
    { ad: 'dx',    etiket: 'Yatay', min: -80, max: 80, adim: 1, bol: 1,   vars: 0 },
    { ad: 'dy',    etiket: 'Dikey', min: -80, max: 80, adim: 1, bol: 1,   vars: 0 }
  ];

  function ayarSeciliBina() {
    for (var i = 0; i < BINALAR.length; i++) {
      if (BINALAR[i].id === ayarSecim.value) return BINALAR[i];
    }
    return BINALAR[0];
  }

  function ayarTazele() {
    var b = ayarSeciliBina();
    for (var i = 0; i < AYAR_SURGULER.length; i++) {
      var t = AYAR_SURGULER[i];
      var v = (b[t.ad] === undefined ? t.vars : b[t.ad]);
      ayarSurgu[t.ad].value = Math.round(v * t.bol);
      ayarDeger[t.ad].textContent = (t.bol === 1) ? String(Math.round(v)) : v.toFixed(2);
    }
    ayarSurgu.pay.value = Math.round(GORSEL_PAY * 100);
    ayarDeger.pay.textContent = GORSEL_PAY.toFixed(2);
    ayarSurgu.egim.value = CFG.tileH;
    ayarDeger.egim.textContent = String(CFG.tileH);
  }

  function ayarMetniUret() {
    var aci = Math.round(Math.asin(Math.min(1, CFG.tileH / CFG.tileW)) * 180 / Math.PI);
    var s = 'GORSEL_PAY = ' + GORSEL_PAY.toFixed(2) + '  ·  tileW = ' + CFG.tileW +
            '  ·  tileH = ' + CFG.tileH + '  ·  bakış ≈ ' + aci + '°\n';
    for (var i = 0; i < BINALAR.length; i++) {
      var b = BINALAR[i], par = [];
      par.push('gx: ' + b.gx + ', gy: ' + b.gy);
      if (b.olcek !== undefined && b.olcek !== 1) par.push('olcek: ' + b.olcek.toFixed(2));
      if (b.dx) par.push('dx: ' + Math.round(b.dx));
      if (b.dy) par.push('dy: ' + Math.round(b.dy));
      s += b.id + ' → ' + par.join(', ') + '\n';
    }
    return s;
  }

  function ayarSatir(t) {
    return '<div class="ka-satir"><span class="ka-ad">' + t.etiket + '</span>' +
      '<input type="range" id="ka-' + t.ad + '" min="' + t.min + '" max="' + t.max +
      '" step="' + t.adim + '"><span class="ka-deg" id="kad-' + t.ad + '">-</span></div>';
  }

  function ayarKur() {
    if (document.getElementById('kaleiciAyar')) return;

    var sec = '';
    for (var i = 0; i < BINALAR.length; i++) {
      sec += '<option value="' + BINALAR[i].id + '">' + binaAdi(BINALAR[i]) + '</option>';
    }

    var satirlar = '';
    for (var j = 0; j < AYAR_SURGULER.length; j++) satirlar += ayarSatir(AYAR_SURGULER[j]);

    ayarKutu = document.createElement('div');
    ayarKutu.id = 'kaleiciAyar';
    ayarKutu.innerHTML =
      '<div class="ka-ust"><select id="kaSec">' + sec + '</select>' +
      '<button class="ka-kat" id="kaKat">▾</button></div>' +
      '<div class="ka-govde">' + satirlar +
      ayarSatir({ ad: 'pay', etiket: 'Genel', min: 20, max: 300, adim: 1 }) +
      ayarSatir({ ad: 'egim', etiket: 'Eğim', min: 20, max: 64, adim: 1 }) +
      '<div class="ka-ipucu">Binaya dokun → seç · sürükle → karo değiştir · ' +
      'sağ üstteki sürüm yazısı bu paneli kapatır</div>' +
      '<div class="ka-alt"><button id="kaSifirla">Sıfırla</button>' +
      '<button id="kaMetin">Değerler</button>' +
      '<button id="kaKopya">Kopyala</button></div>' +
      '<textarea id="kaCikti" readonly></textarea></div>';
    if (AYAR_ACIK) ayarKutu.classList.add('acik');
    katman.appendChild(ayarKutu);

    ayarSecim = document.getElementById('kaSec');
    ayarMetin = document.getElementById('kaCikti');

    var adlar = ['olcek', 'dx', 'dy', 'pay', 'egim'];
    for (var k = 0; k < adlar.length; k++) {
      ayarSurgu[adlar[k]] = document.getElementById('ka-' + adlar[k]);
      ayarDeger[adlar[k]] = document.getElementById('kad-' + adlar[k]);
    }

    /* Sürgülere dokunuş sahneye sızmasın */
    ayarKutu.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

    ayarSecim.addEventListener('change', ayarTazele);

    for (var m = 0; m < AYAR_SURGULER.length; m++) {
      (function (t) {
        ayarSurgu[t.ad].addEventListener('input', function () {
          var b = ayarSeciliBina();
          var v = Number(this.value) / t.bol;
          b[t.ad] = v;
          ayarDeger[t.ad].textContent = (t.bol === 1) ? String(Math.round(v)) : v.toFixed(2);
          kareIste();
        });
      })(AYAR_SURGULER[m]);
    }

    ayarSurgu.pay.addEventListener('input', function () {
      GORSEL_PAY = Number(this.value) / 100;
      ayarDeger.pay.textContent = GORSEL_PAY.toFixed(2);
      kareIste();
    });

    ayarSurgu.egim.addEventListener('input', function () {
      CFG.tileH = Number(this.value);
      ayarDeger.egim.textContent = String(CFG.tileH);
      kameraSinirla();
      kareIste();
    });

    document.getElementById('kaKat').addEventListener('click', function () {
      ayarKutu.classList.toggle('kapali');
      this.textContent = ayarKutu.classList.contains('kapali') ? '▴' : '▾';
    });

    document.getElementById('kaSifirla').addEventListener('click', function () {
      var b = ayarSeciliBina();
      b.olcek = 1; b.dx = 0; b.dy = 0;
      ayarTazele();
      kareIste();
    });

    document.getElementById('kaKopya').addEventListener('click', function () {
      var m = ayarMetniUret();
      ayarKutu.classList.add('metin');
      ayarMetin.value = m;
      var tamam = false;
      try {
        ayarMetin.removeAttribute('readonly');
        ayarMetin.select();
        ayarMetin.setSelectionRange(0, m.length);
        tamam = document.execCommand && document.execCommand('copy');
        ayarMetin.setAttribute('readonly', 'readonly');
      } catch (e2) {}
      try {
        if (navigator.clipboard) { navigator.clipboard.writeText(m); tamam = true; }
      } catch (e3) {}
      this.textContent = tamam ? 'Kopyalandı' : 'Seç ve kopyala';
      var dgm = this;
      setTimeout(function () { dgm.textContent = 'Kopyala'; }, 1600);
    });

    document.getElementById('kaMetin').addEventListener('click', function () {
      ayarKutu.classList.toggle('metin');
      if (ayarKutu.classList.contains('metin')) {
        ayarMetin.value = ayarMetniUret();
        try { navigator.clipboard && navigator.clipboard.writeText(ayarMetin.value); } catch (e) {}
      }
    });

    ayarTazele();
  }


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
  var TASINAN_PANELLER = ['.hud-top', '.hud-kaynak', '.nav-dock'];
  var panelYerleri = [];

  function panelleriTasi() {
    if (panelYerleri.length) return;
    for (var i = 0; i < TASINAN_PANELLER.length; i++) {
      var el = document.querySelector(TASINAN_PANELLER[i]);
      if (!el || !el.parentNode) continue;
      panelYerleri.push({ el: el, ebeveyn: el.parentNode, sonraki: el.nextSibling });
      katman.appendChild(el);
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
      '<div id="kaleiciSurum">' + SURUM + '</div>' +
      '<div id="kaleiciPanel"><h3 id="kaleiciPanelAd"></h3>' +
      '<p>Bu bina henüz bağlanmadı.</p><button id="kaleiciPanelKapat">Kapat</button></div>';
    document.body.appendChild(katman);

    tuval = document.getElementById('kaleiciTuval');
    ctx = tuval.getContext('2d');
    panel = document.getElementById('kaleiciPanel');
    panelAd = document.getElementById('kaleiciPanelAd');

    document.getElementById('kaleiciKapat').addEventListener('click', kapat);
    document.getElementById('kaleiciSurum').addEventListener('click', ayarAcKapa);
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
    ayarKur();
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
    secili = null; tasinan = null;
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
                    ZCFG: ZCFG, binaAdi: binaAdi, binaKutusu: binaKutusu,
                    yerlesimOku: yerlesimOku, yerlesimYaz: yerlesimYaz };
})();
