/* kaleici.js — Kale içi sahnesi
   Tek dosya. index.html'e sadece <script src="kaleici.js"></script> eklenir.
   Zemin ve binalar AYNI canvas'a çizilir; DOM/canvas karışımı yok.
   Binalar herkeste sabit — hiçbir kayıt tutulmaz, Firebase'e yazılmaz.
*/
(function () {
  'use strict';

  var SURUM = 'kaleici-14';

  var CFG = {
    grid: 10,
    zeminPay: 8,      // bina alanının dışına çizilen dolgu karo sayısı
    tileW: 64,
    tileH: 44,         // yüksek = daha dik bakış
    zoom: 1.0,
    zoomMin: 0.6,
    zoomMax: 2.20,
    karoUzak: 9.0,     // en uzakta ekran genişliğinde kaç karo görünsün
    karoYakin: 3.5,    // en yakında kaç karo
    karoAcilis: 6.0    // açılışta kaç karo
  };

  /* Bina görselinin taban genişliğine oranı — 1.00 = taban kadar geniş.
     Bina başına ince ayar: BINALAR içindeki 'olcek' ve 'dy' (piksel). */
  var GORSEL_PAY = 1.00;

  /* ---- Binalar: konum = sol üst karo, en/boy = kapladığı karo ----
     gorsel: kök dizindeki .webp dosya adı. Dosya yoksa emojiye döner.  */
  var BINALAR = [
    { id: 'kale',      ad: 'Ana Kale',         emoji: '🏰', gorsel: 'anakale.webp',       gx: 3, gy: 5, en: 3, boy: 3, olcek: 1.46 },
    { id: 'sovalye',   ad: 'Savunucu Kışlası', emoji: '⚔️', gorsel: 'savunucukisla.webp', gx: -2, gy: 5, en: 2, boy: 2, olcek: 1.23 },
    { id: 'asker',     ad: 'Koruyucu Kışlası', emoji: '🛡️', gorsel: 'koruyucukisla.webp', gx: -2, gy: 1, en: 2, boy: 2, olcek: 1.08 },
    { id: 'robot',     ad: 'Nişancı Kışlası',  emoji: '🤖', gorsel: 'nisancikisla.webp',  gx: -2, gy: 9, en: 2, boy: 2, olcek: 1.13 },
    { id: 'arastirma', ad: 'Araştırma',        emoji: '🔬', gorsel: 'arastirma.webp',     gx: 3, gy: -1, en: 2, boy: 2, olcek: 1.35 },
    { id: 'fuze',      ad: 'Füze Merkezi',     emoji: '🚀', gorsel: 'fuzemerkezi.webp',   gx: 13, gy: 4, en: 2, boy: 2, olcek: 1.37 },
    { id: 'konuk',     ad: 'Konuk Evleri',     emoji: '🏘️', gorsel: 'konukevleri.webp',   gx: 6, gy: -1, en: 2, boy: 2, olcek: 0.76 },
    { id: 'oyun',      ad: 'Oyun Merkezi',     emoji: '🎲', gorsel: 'oyunmerkezi.webp',   gx: -2, gy: -3, en: 2, boy: 2, olcek: 1.77 },
    { id: 'ittifak',   ad: 'İttifak Binası',   emoji: '🤝', gorsel: 'ittifakbinasi.webp', gx: 3, gy: 12, en: 2, boy: 2, olcek: 1.63 },

    { id: 'odun',      ad: 'Odun',             emoji: '🪵', gorsel: 'odunuretim.webp',    gx: 10, gy: 8, en: 1, boy: 1, olcek: 1.32 },
    { id: 'demir',     ad: 'Demir',            emoji: '⛏️', gorsel: 'demiruretim.webp',   gx: 10, gy: 6, en: 1, boy: 1, olcek: 1.42 },
    { id: 'su',        ad: 'Su',               emoji: '💧', gorsel: 'suuretim.webp',      gx: 10, gy: 0, en: 1, boy: 1, olcek: 1.45 },
    { id: 'enerji',    ad: 'Enerji',           emoji: '⚡', gorsel: 'enerjiuretim.webp',  gx: 10, gy: 2, en: 1, boy: 1, olcek: 1.45 },
    { id: 'ahir',      ad: 'Ahır',             emoji: '🐄', gorsel: 'ahiruretim.webp',    gx: 10, gy: 4, en: 1, boy: 1, olcek: 1.51 }
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

  function binaGorseli(b) {
    var g = GORSELLER[b.id];
    return (g && g.hazir && g.im.naturalWidth > 0) ? g : null;
  }

  /* ---- Stil: en az sayıda kural, 3B yok ---- */
  var CSS =
    '#kaleici{position:fixed;inset:0;z-index:9000;display:none;' +
      'background:#7fae5c;font-family:"Baloo 2",sans-serif;touch-action:none}' +
    '#kaleici.acik{display:block}' +
    '#kaleiciTuval{position:absolute;left:0;top:0;width:100%;height:100%;display:block}' +
    '#kaleiciKapat{position:absolute;left:12px;top:12px;z-index:2;' +
      'padding:8px 16px;border:none;border-radius:10px;background:#1d3f63;color:#eaf6ff;' +
      'font:600 15px/1 "Baloo 2",sans-serif;text-shadow:0 1px 2px rgba(0,20,45,.55);' +
      'box-shadow:none;transition:transform .09s,filter .09s}' +
    '#kaleiciKapat:active{transform:scale(.96);filter:brightness(.93)}' +
    '#kaleiciSurum{position:absolute;right:12px;top:16px;z-index:2;' +
      'color:rgba(255,255,255,.75);font:500 12px/1 "Baloo 2",sans-serif}' +
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
    '#kaleiciAyar{position:absolute;left:10px;right:10px;bottom:66px;z-index:5;' +
      'padding:7px 9px;border-radius:10px;background:rgba(10,28,48,.82);' +
      '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:#dbeaf7;' +
      'font:500 11px/1.2 "Baloo 2",sans-serif;box-shadow:none}' +
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

    /* zemin — ekranda görünen ızgara aralığı hesaplanır, köşeler boş kalmaz */
    var kose = [dunyaya(0, 0), dunyaya(w, 0), dunyaya(0, h), dunyaya(w, h)];
    var gxA = 1e9, gxB = -1e9, gyA = 1e9, gyB = -1e9;
    for (var q = 0; q < 4; q++) {
      var kg = izgara(kose[q].x, kose[q].y);
      if (kg.gx < gxA) gxA = kg.gx;
      if (kg.gx > gxB) gxB = kg.gx;
      if (kg.gy < gyA) gyA = kg.gy;
      if (kg.gy > gyB) gyB = kg.gy;
    }
    gxA -= 2; gxB += 2; gyA -= 2; gyB += 2;
    /* güvenlik: aşırı uzaklaşmada karo sayısını sınırla */
    if ((gxB - gxA) * (gyB - gyA) > 9000) { gxB = gxA + 95; gyB = gyA + 95; }

    var yollar = [[], []];
    for (var gy = gyA; gy <= gyB; gy++) {
      for (var gx = gxA; gx <= gxB; gx++) {
        var m = dunya(gx, gy), e = ekran(m.x, m.y);
        if (e.x < -CFG.tileW * CFG.zoom || e.x > w + CFG.tileW * CFG.zoom) continue;
        if (e.y < -CFG.tileH * CFG.zoom || e.y > h + CFG.tileH * CFG.zoom) continue;
        yollar[((gx + gy) & 1)].push(e);
      }
    }
    var yariW = CFG.tileW / 2 * CFG.zoom, yariH = CFG.tileH / 2 * CFG.zoom;
    for (var t = 0; t < 2; t++) {
      var liste = yollar[t];
      if (!liste.length) continue;
      ctx.beginPath();
      for (var i = 0; i < liste.length; i++) {
        var c = liste[i];
        ctx.moveTo(c.x, c.y - yariH);
        ctx.lineTo(c.x + yariW, c.y);
        ctx.lineTo(c.x, c.y + yariH);
        ctx.lineTo(c.x - yariW, c.y);
        ctx.closePath();
      }
      ctx.fillStyle = t === 0 ? '#8cbb66' : '#84b25f';
      ctx.fill();
    }

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
    if (b && AYAR_ACIK && ayarSecim) { ayarSecim.value = b.id; ayarTazele(); }
    secimZaman = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    kareIste();
  }

  function binaCiz(b) {
    var nk = taban(b);
    var g = binaGorseli(b);
    /* Görsel varken beyaz taban çizilmez — görselin kendi zemini var. */
    if (!g) dortgenCiz(nk, '#f1f5ef', 'rgba(255,255,255,.55)');

    var ortaW = { x: (nk[0].x + nk[2].x) / 2, y: (nk[0].y + nk[2].y) / 2 };
    var o = ekran(ortaW.x, ortaW.y);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (g) {
      /* Kırpılmış içerik tabanın alt köşesine oturur; oran korunur. */
      var k = g.kutu;
      var genislik = (nk[1].x - nk[3].x) * CFG.zoom * GORSEL_PAY * (b.olcek || 1);
      var yukseklik = genislik * (k.sh / k.sw);
      var altNokta = ekran(nk[2].x, nk[2].y);
      var dy = (b.dy || 0) * CFG.zoom;
      var dx = (b.dx || 0) * CFG.zoom;
      var sap = secimSaydamlik(b);
      if (sap < 1) ctx.globalAlpha = sap;
      ctx.drawImage(g.im, k.sx, k.sy, k.sw, k.sh,
                    o.x - genislik / 2 + dx, altNokta.y - yukseklik + dy, genislik, yukseklik);
      ctx.globalAlpha = 1;
    } else {
      var boyut = (b.en >= 3 ? 46 : b.en === 2 ? 32 : 20) * CFG.zoom;
      ctx.font = boyut + 'px "Baloo 2",sans-serif';
      ctx.fillText(b.emoji, o.x, o.y - boyut * 0.12);
    }

  }

  /* ---- Seçili binanın adı — binaların üstünde, çerçeveli ---- */
  function seciliAdCiz() {
    if (!secili) { tasiSimge.r = 0; return; }
    var b = secili, nk = taban(b);
    var g = binaGorseli(b);
    var ortaW = { x: (nk[0].x + nk[2].x) / 2, y: (nk[0].y + nk[2].y) / 2 };
    var o = ekran(ortaW.x, ortaW.y);

    /* Yazı binanın tepesinin biraz üstünde durur */
    var tepe = ekran(nk[0].x, nk[0].y).y;
    if (g) {
      var k = g.kutu;
      var gen = (nk[1].x - nk[3].x) * CFG.zoom * GORSEL_PAY * (b.olcek || 1);
      tepe = ekran(nk[2].x, nk[2].y).y - gen * (k.sh / k.sw) + (b.dy || 0) * CFG.zoom;
    }

    var boy = Math.max(15, 19 * CFG.zoom);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 ' + boy + 'px "Baloo 2",sans-serif';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(3, boy * 0.28);
    ctx.strokeStyle = '#ffc61a';
    var yaziY = tepe - boy * 0.45;
    ctx.strokeText(b.ad, o.x, yaziY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(b.ad, o.x, yaziY);

    /* Küçük taşıma simgesi — adın hemen üstünde */
    var sr = boy * 0.62;
    tasiSimge.x = o.x; tasiSimge.y = yaziY - boy * 1.15; tasiSimge.r = sr;
    tasiSimgesiCiz(tasiSimge.x, tasiSimge.y, sr);
  }

  /* Dokunuş taşıma simgesinin üstünde mi (parmak payı ile) */
  function simgedeMi(px, py) {
    if (!secili || !tasiSimge.r) return false;
    var pay = Math.max(tasiSimge.r * 1.6, 20);
    return Math.abs(px - tasiSimge.x) <= pay && Math.abs(py - tasiSimge.y) <= pay;
  }

  /* Dört yönlü ok — "bu binayı sürükleyebilirsin" */
  function tasiSimgesiCiz(x, y, r) {
    var u = r * 0.5, b = r * 0.22;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var a = i * Math.PI / 2;
      var kx = Math.cos(a), ky = Math.sin(a);
      var px = -Math.sin(a), py = Math.cos(a);
      ctx.moveTo(kx * u, ky * u);                                  // uç
      ctx.lineTo(kx * (u - b) + px * b, ky * (u - b) + py * b);    // sağ kanat
      ctx.lineTo(kx * (u - b) - px * b, ky * (u - b) - py * b);    // sol kanat
      ctx.closePath();
    }
    ctx.moveTo(-b * 0.5, -b * 0.5);
    ctx.rect(-b * 0.55, -b * 0.55, b * 1.1, b * 1.1);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, r * 0.30);
    ctx.strokeStyle = '#ffc61a';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  /* ---- Dokunulan noktadaki bina ---- */
  function binaBul(sx, sy) {
    var d = dunyaya(sx, sy);
    var g = izgara(d.x, d.y);
    for (var i = 0; i < BINALAR.length; i++) {
      var b = BINALAR[i];
      if (g.gx >= b.gx && g.gx < b.gx + b.en && g.gy >= b.gy && g.gy < b.gy + b.boy) return b;
    }
    return null;
  }

  /* ---- Dokunma: kaydırma + iki parmak yakınlaştırma ---- */
  var parmaklar = {}, parmakSayisi = 0, kistirma = false;
  var sonX = 0, sonY = 0, kaydi = false, basX = 0, basY = 0;
  var ilkMesafe = 0, ilkZoom = 1;
  var tasinan = null, tasiKay = { x: 0, y: 0 };   // sürüklenen bina
  var tasiSimge = { x: 0, y: 0, r: 0 };            // taşıma simgesinin ekran yeri

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
      var hedef = null;
      if (secili && simgedeMi(px, py)) hedef = secili;
      else if (AYAR_ACIK) hedef = binaBul(px, py);
      if (hedef) {
        tasinan = hedef;
        var d0 = dunyaya(px, py);
        var g0 = izgara(d0.x, d0.y);
        tasiKay.x = hedef.gx - g0.gx;   // basılan karo ile sol üst arası fark
        tasiKay.y = hedef.gy - g0.gy;
        if (AYAR_ACIK) binaSec(hedef);
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
    panelAd.textContent = b.emoji + '  ' + b.ad;
    panel.classList.add('acik');
  }
  function panelKapat() { panel.classList.remove('acik'); }


  /* ================= AYAR PANELİ — GEÇİCİ (?ayar=1) =================
     İnce ayar bitince: bu blok, CSS'teki #kaleiciAyar kuralları ve
     kur() içindeki ayarKur() çağrısı silinir. ================= */
  var AYAR_ACIK = /[?&]ayar=1/.test(location.search);
  var ayarKutu, ayarSecim, ayarSurgu = {}, ayarDeger = {}, ayarMetin;

  var AYAR_SURGULER = [
    { ad: 'olcek', etiket: 'Ölçek', min: 20, max: 300, adim: 1, bol: 100, vars: 1 },
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
    var s = 'GORSEL_PAY = ' + GORSEL_PAY.toFixed(2) + '  ·  tileH = ' + CFG.tileH + '\n';
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
    if (!AYAR_ACIK || document.getElementById('kaleiciAyar')) return;

    var sec = '';
    for (var i = 0; i < BINALAR.length; i++) {
      sec += '<option value="' + BINALAR[i].id + '">' + BINALAR[i].ad + '</option>';
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
      '<div class="ka-ipucu">Binaya basılı tutup sürükle → karo değiştir</div>' +
      '<div class="ka-alt"><button id="kaSifirla">Sıfırla</button>' +
      '<button id="kaMetin">Değerler</button>' +
      '<button id="kaKopya">Kopyala</button></div>' +
      '<textarea id="kaCikti" readonly></textarea></div>';
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
    if (!fbVar() || !k) return;
    yerlesimOkundu = true;
    try {
      firebaseDb.ref(YERLESIM_KOK + '/' + k).get().then(function (snap) {
        var v = snap && snap.val();
        if (!v) return;
        for (var id in v) {
          if (!Object.prototype.hasOwnProperty.call(v, id)) continue;
          var b = binaBulId(id), y = v[id];
          if (!b || !y) continue;
          if (typeof y.gx === 'number') b.gx = y.gx;
          if (typeof y.gy === 'number') b.gy = y.gy;
        }
        kameraSinirla();
        kareIste();
      }).catch(function () {});
    } catch (e) {}
  }

  /* Taşıma bitince yazar; art arda taşımalarda tek yazıya toplanır */
  function yerlesimYaz() {
    var k = oyuncuAnahtari();
    if (!fbVar() || !k) return;
    if (yerlesimYazZaman) clearTimeout(yerlesimYazZaman);
    yerlesimYazZaman = setTimeout(function () {
      yerlesimYazZaman = null;
      var veri = {};
      for (var i = 0; i < BINALAR.length; i++) {
        veri[BINALAR[i].id] = { gx: BINALAR[i].gx, gy: BINALAR[i].gy };
      }
      try { firebaseDb.ref(YERLESIM_KOK + '/' + k).set(veri).catch(function () {}); }
      catch (e) {}
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
      '<div id="kaleiciSurum">' + SURUM + '</div>' +
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
    secili = null;
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
    if (katman) katman.classList.remove('acik');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', kur);
  } else {
    kur();
  }

  window.KALEICI = { SURUM: SURUM, CFG: CFG, BINALAR: BINALAR, GORSELLER: GORSELLER,
                    ac: ac, kapat: kapat, ciz: ciz, gorselYukle: gorselYukle,
                    yerlesimOku: yerlesimOku, yerlesimYaz: yerlesimYaz };
})();
