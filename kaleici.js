/* kaleici.js — Kale içi sahnesi
   Tek dosya. index.html'e sadece <script src="kaleici.js"></script> eklenir.
   Zemin ve binalar AYNI canvas'a çizilir; DOM/canvas karışımı yok.
   Binalar herkeste sabit — hiçbir kayıt tutulmaz, Firebase'e yazılmaz.
*/
(function () {
  'use strict';

  var SURUM = 'kaleici-6';

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

  /* ---- Binalar: konum = sol üst karo, en/boy = kapladığı karo ---- */
  var BINALAR = [
    { id: 'kale',      ad: 'Ana Kale',        emoji: '🏰', gx: 4, gy: 4, en: 3, boy: 3 },
    { id: 'sovalye',   ad: 'Savunucu Kışlası', emoji: '⚔️', gx: 1, gy: 4, en: 2, boy: 2 },
    { id: 'asker',     ad: 'Koruyucu Kışlası', emoji: '🛡️', gx: 4, gy: 1, en: 2, boy: 2 },
    { id: 'robot',     ad: 'Nişancı Fabrikası', emoji: '🤖', gx: 7, gy: 4, en: 2, boy: 2 },
    { id: 'arastirma', ad: 'Araştırma',       emoji: '🔬', gx: 4, gy: 7, en: 2, boy: 2 },
    { id: 'fuze',      ad: 'Füze Merkezi',    emoji: '🚀', gx: 1, gy: 1, en: 2, boy: 2 },
    { id: 'konuk',     ad: 'Konuk Evleri',    emoji: '🏘️', gx: 7, gy: 7, en: 2, boy: 2 },
    { id: 'oyun',      ad: 'Oyun Merkezi',    emoji: '🎲', gx: 7, gy: 1, en: 2, boy: 2 },

    { id: 'odun',      ad: 'Odun',            emoji: '🪵', gx: 1, gy: 7, en: 1, boy: 1 },
    { id: 'demir',     ad: 'Demir',           emoji: '⛏️', gx: 2, gy: 8, en: 1, boy: 1 },
    { id: 'su',        ad: 'Su',              emoji: '💧', gx: 0, gy: 2, en: 1, boy: 1 },
    { id: 'enerji',    ad: 'Enerji',          emoji: '⚡', gx: 9, gy: 2, en: 1, boy: 1 },
    { id: 'atolye',    ad: 'Atölye',          emoji: '🔧', gx: 9, gy: 6, en: 1, boy: 1 },
    { id: 'degirmen',  ad: 'Değirmen',        emoji: '🌾', gx: 6, gy: 9, en: 1, boy: 1 }
  ];

  /* ---- Stil: en az sayıda kural, 3B yok ---- */
  var CSS =
    '#kaleici{position:fixed;inset:0;z-index:9000;display:none;' +
      'background:#7fae5c;font-family:"Baloo 2",sans-serif;touch-action:none}' +
    '#kaleici.acik{display:block}' +
    '#kaleiciTuval{position:absolute;left:0;top:0;width:100%;height:100%;display:block}' +
    '#kaleiciKapat{position:absolute;left:12px;top:12px;z-index:2;' +
      'padding:8px 16px;border:none;border-radius:10px;background:#1d3f63;color:#eaf6ff;' +
      'font:600 15px/1 "Baloo 2",sans-serif;text-shadow:0 1px 2px rgba(0,20,45,.55);' +
      'box-shadow:0 2px 6px rgba(0,20,45,.3);transition:transform .09s,filter .09s}' +
    '#kaleiciKapat:active{transform:scale(.96);filter:brightness(.93)}' +
    '#kaleiciSurum{position:absolute;right:12px;top:16px;z-index:2;' +
      'color:rgba(255,255,255,.75);font:500 12px/1 "Baloo 2",sans-serif}' +
    '#kaleiciPanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;' +
      'display:none;min-width:200px;padding:18px 20px;border-radius:14px;' +
      'background:#12304e;color:#eaf6ff;text-align:center;' +
      'box-shadow:0 2px 6px rgba(0,20,45,.3)}' +
    '#kaleiciPanel.acik{display:block}' +
    '#kaleiciPanel h3{margin:0 0 6px;font:700 20px/1.2 "Baloo 2",sans-serif;' +
      'text-shadow:0 1px 2px rgba(0,20,45,.55)}' +
    '#kaleiciPanel p{margin:0 0 14px;font:400 14px/1.3 "Baloo 2",sans-serif;opacity:.8}' +
    '#kaleiciPanel button{padding:8px 20px;border:none;border-radius:10px;' +
      'background:#2f6ea8;color:#eaf6ff;font:600 15px/1 "Baloo 2",sans-serif;' +
      'box-shadow:0 2px 6px rgba(0,20,45,.3);transition:transform .09s,filter .09s}' +
    '#kaleiciPanel button:active{transform:scale(.96);filter:brightness(.93)}' +
    '#kaleiciGir{position:fixed;left:10px;bottom:108px;z-index:18;display:none;' +
      'padding:5px 10px;border:none;border-radius:9px;background:rgba(29,63,99,.9);color:#eaf6ff;' +
      'font:600 12.5px/1 "Baloo 2",sans-serif;text-shadow:0 1px 2px rgba(0,20,45,.55);' +
      'box-shadow:0 2px 6px rgba(0,20,45,.3);transition:transform .09s,filter .09s}' +
    '#kaleiciGir.acik{display:block}' +
    '#kaleiciGir:active{transform:scale(.96);filter:brightness(.93)}';

  var katman, tuval, ctx, panel, panelAd, girBtn;
  var camX = 0, camY = 0;          // kameranın dünya koordinatı
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

  function kameraSinirla() {
    var s = CFG.grid - 1;
    var enX = s * CFG.tileW / 2;
    if (camX < -enX) camX = -enX;
    if (camX > enX) camX = enX;
    var enY = s * CFG.tileH;
    if (camY < 0) camY = 0;
    if (camY > enY) camY = enY;
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

    /* zemin — aynı renkler tek çizimde, kenar çizgisi yok (hız için) */
    var p = CFG.zeminPay;
    var yollar = [[], []];
    for (var gy = -p; gy < CFG.grid + p; gy++) {
      for (var gx = -p; gx < CFG.grid + p; gx++) {
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
  }

  function binaCiz(b) {
    var nk = taban(b);
    dortgenCiz(nk, '#f1f5ef', 'rgba(255,255,255,.55)');

    var ortaW = { x: (nk[0].x + nk[2].x) / 2, y: (nk[0].y + nk[2].y) / 2 };
    var o = ekran(ortaW.x, ortaW.y);
    var boyut = (b.en >= 3 ? 46 : b.en === 2 ? 32 : 20) * CFG.zoom;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = boyut + 'px "Baloo 2",sans-serif';
    ctx.fillText(b.emoji, o.x, o.y - boyut * 0.12);

    var yaziBoy = Math.max(10, 12 * CFG.zoom);
    var altY = ekran(nk[2].x, nk[2].y).y + yaziBoy * 0.9;
    ctx.font = '600 ' + yaziBoy + 'px "Baloo 2",sans-serif';
    ctx.fillStyle = 'rgba(0,20,45,.55)';
    ctx.fillText(b.ad, o.x, altY + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(b.ad, o.x, altY);
  }

  /* ---- Dokunulan noktadaki bina ---- */
  function binaBul(sx, sy) {
    var wx = (sx - tuval.width / (2 * eb)) / CFG.zoom + camX;
    var wy = (sy - tuval.height / (2 * eb)) / CFG.zoom + camY;
    var g = izgara(wx, wy);
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

  function mesafe() {
    var k = Object.keys(parmaklar);
    if (k.length < 2) return 0;
    var a = parmaklar[k[0]], b = parmaklar[k[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function bas(e) {
    tuval.setPointerCapture && tuval.setPointerCapture(e.pointerId);
    parmaklar[e.pointerId] = { x: e.clientX, y: e.clientY };
    parmakSayisi = Object.keys(parmaklar).length;
    if (parmakSayisi === 1) {
      sonX = basX = e.clientX; sonY = basY = e.clientY;
      kaydi = false; kistirma = false;
    } else if (parmakSayisi === 2) {
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
        var z = ilkZoom * (m / ilkMesafe);
        CFG.zoom = Math.max(CFG.zoomMin, Math.min(CFG.zoomMax, z));
        kameraSinirla();
        kareIste();
      }
      return;
    }
    var dx = e.clientX - sonX, dy = e.clientY - sonY;
    sonX = e.clientX; sonY = e.clientY;
    if (Math.abs(e.clientX - basX) > 6 || Math.abs(e.clientY - basY) > 6) kaydi = true;
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
      if (vardi && !kaydi && !kistirma) {
        var r = tuval.getBoundingClientRect();
        var b = binaBul(e.clientX - r.left, e.clientY - r.top);
        if (b) panelAc(b);
      }
      kistirma = false;
    }
  }

  function panelAc(b) {
    panelAd.textContent = b.emoji + '  ' + b.ad;
    panel.classList.add('acik');
  }
  function panelKapat() { panel.classList.remove('acik'); }

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

    butonuIzle();
  }

  /* Giriş ekranı kapalıysa VE önde açık bir panel yoksa buton görünür.
     Panel açıkken tamamen gizlenir, hiçbir şeyin üstüne binmez. */
  function butonuGuncelle() {
    var g = document.getElementById('loginScreen');
    var oyunda = !g || getComputedStyle(g).display === 'none';
    var panelAcik = !!document.querySelector(
      '.overlay-panel.active, #seferOnayModal, .sefer-onay-modal');
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
    var o = dunya((CFG.grid - 1) / 2, (CFG.grid - 1) / 2);
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

  window.KALEICI = { SURUM: SURUM, CFG: CFG, BINALAR: BINALAR, ac: ac, kapat: kapat, ciz: ciz };
})();
