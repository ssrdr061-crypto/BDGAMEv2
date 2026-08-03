/* ═══════════════════════════════════════════════════════════════════════
   harita.js — İZOMETRİK ZEMİN MOTORU  (ADIM A + ADIM B)
   ═══════════════════════════════════════════════════════════════════════

   BU DOSYA NE YAPAR
   -----------------
   Sadece ZEMİNİ çizer. Kalelere, canavarlara, sandıklara, füzeye,
   savaş sistemine HİÇ DOKUNMAZ. Amaç: geliştiricinin telefonda
   akıcılığı ölçmesi.

   NASIL KURULUR
   -------------
   index.html'in en altına, tema.js'ten SONRA tek satır ekle:

       <script src="harita.js"></script>

   Başka hiçbir dosyaya dokunma. Bu dosya kendini kendisi bağlar.

   NASIL TEST EDİLİR
   -----------------
   Haritanın sağ üstünde "ESKİ / YENİ" düğmesi çıkar. Basınca eski
   resimli harita ile yeni izometrik zemin arasında geçiş yapar.
   Yanında FPS sayacı vardır. Telefonda parmakla kaydırıp yakınlaştır,
   FPS'in kaça düştüğüne bak.

   ÖNEMLİ — NEYİN BOZUK GÖRÜNECEĞİ
   -------------------------------
   YENİ modda kaleler ve canavarlar GİZLENİR. Çünkü onların koordinatı
   hâlâ eski 30x30 düz sisteme göre; izometrik zemine oturmazlar.
   Onları taşımak ADIM D'nin işi. Bu adımda sadece zemin görülecek.

   KARO GÖRSELLERİ HENÜZ YOKSA
   ---------------------------
   Sorun değil. Görsel bulunamazsa motor karoları düz renkli eşkenar
   dörtgen olarak çizer. Performans testi için bu yeterlidir; görseller
   sonra eklenince tek satır değişmeden devreye girer.

   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ═════════════════════════════════════════════════════════════════════
     ADIM A — TÜM SABİTLER TEK YERDE

     Oyunun eski halinde ızgara boyutu ÜÇ ayrı yerde yazılıydı:
       · COORD_GRID = 30        (index.html)
       · MGRID = 30             (setupMapPanning içinde, ayrı bir sabit)
       · MAP_W = 1586 / MAP_H = 992
     Biri değişip diğeri unutulunca hata SESSİZ oluyordu — oyun çalışıyor
     ama füze hedefin biraz yanına düşüyordu. Artık tek kaynak burası.
     ═════════════════════════════════════════════════════════════════════ */

  const CFG = {
    /* ── Izgara ── */
    grid: 141,          // 141 x 141 = 19.881 karo (~20 bin)

    /* ── Karo ölçüsü (piksel) ──
       tileH her zaman tileW'nin YARISI olmalı. Klasik 2:1 izometri.
       Bu oran bozulursa gridToScreen / screenToGrid çifti tutarsızlaşır. */
    tileW: 128,
    tileH: 64,

    /* ── Yakınlaştırma sınırları ──
       minZoom'u düşürmek haritayı uzaktan gösterir ama aynı karede
       çizilecek karo sayısını KATLAR. 0.5'in altına inmeden önce
       telefonda FPS'e bak. */
    minZoom: 0.5,
    maxZoom: 3.0,

    /* ── Biyom üretimi ──
       seed: bu sayı DEĞİŞTİRİLİRSE tüm oyuncularda harita değişir.
       Yayına çıktıktan sonra ASLA dokunma — kaleler başka arazide kalır. */
    seed: 20260803,
    frekans: 0.045,     // düşük = büyük kıtalar, yüksek = kırık dökük
    esikKar: 0.38,      // bu değerin altı kar
    esikCimen: 0.72,    // bu değerin altı çimen, üstü lav

    /* ── Karo görselleri ──
       Kendi deponuza koyun. Dış URL kullanmayın: hotlink kırılır ve
       CORS canvas'ı kirletir (tainted canvas → drawImage patlar).
       Dosya bulunamazsa düz renk kullanılır, oyun çökmez. */
    karoDosya: {
      kar:   "karo_kar.png",
      cimen: "karo_cimen.png",
      lav:   "karo_lav.png",
    },

    /* Görsel yokken kullanılacak düz renkler (aynı zamanda mini-harita
       rengi olarak da işe yarar) */
    karoRenk: {
      kar:   "#cfe4f2",
      cimen: "#5f9e4a",
      lav:   "#8c3126",
    },

    /* ── Hata ayıklama ── */
    fpsGoster: true,
    izgaraCizgisi: false,   // true yaparsan karo kenarları çizilir
  };

  /* Türetilmiş ölçüler — elle yazma, hep buradan oku */
  const G = CFG.grid;
  const HALF_W = CFG.tileW / 2;
  const HALF_H = CFG.tileH / 2;
  const ORIGIN_X = (G - 1) * HALF_W;      // gx-gy negatif olabiliyor, sıfıra çekiyoruz
  const WORLD_W = G * CFG.tileW;          // 141 * 128 = 18.048 px
  const WORLD_H = G * CFG.tileH;          //  141 *  64 =  9.024 px

  /* ═════════════════════════════════════════════════════════════════════
     İZOMETRİK DÖNÜŞÜM

     Oyunun tamamı bu iki fonksiyona bağlanacak. Şu an sadece zemin
     kullanıyor; ADIM D'de kaleler, ADIM E'de füze de buraya bağlanacak.
     ═════════════════════════════════════════════════════════════════════ */

  /* Izgara hücresi → dünya pikseli (karonun ÜST köşesi) */
  function gridToWorld(gx, gy) {
    return {
      x: (gx - gy) * HALF_W + ORIGIN_X,
      y: (gx + gy) * HALF_H,
    };
  }

  /* Dünya pikseli → ızgara hücresi (ondalıklı; hücre için Math.floor) */
  function worldToGrid(wx, wy) {
    const sx = wx - ORIGIN_X - HALF_W;   // karo merkezine göre
    const sy = wy - HALF_H;
    return {
      gx: (sx / CFG.tileW) + (sy / CFG.tileH),
      gy: (sy / CFG.tileH) - (sx / CFG.tileW),
    };
  }

  /* ═════════════════════════════════════════════════════════════════════
     TOHUMLU BİYOM ÜRETİMİ

     Math.random() KULLANILMIYOR — kasıtlı. Oyun çok oyunculu; kale
     konumları Firebase'den paylaşılıyor. Rastgelelik tohumsuz olsaydı
     senin kalen bende lavda, sende çimende görünürdü.

     biyom(gx, gy) SAF bir fonksiyondur: aynı koordinat, her cihazda,
     her açılışta, sonsuza kadar aynı sonuç.
     ═════════════════════════════════════════════════════════════════════ */

  /* Koordinattan deterministik 0..1 değeri (sin-hash) */
  function hash2(ix, iy) {
    const n = Math.sin(ix * 12.9898 + iy * 78.233 + CFG.seed) * 43758.5453123;
    return n - Math.floor(n);
  }

  /* Yumuşatılmış gürültü — köşe değerlerini smoothstep ile harmanlar.
     Bu olmadan biyomlar kümelenmez, tuz-biber deseni çıkar. */
  function smoothNoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;

    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    const a = hash2(ix,     iy);
    const b = hash2(ix + 1, iy);
    const c = hash2(ix,     iy + 1);
    const d = hash2(ix + 1, iy + 1);

    return (a * (1 - ux) + b * ux) * (1 - uy)
         + (c * (1 - ux) + d * ux) * uy;
  }

  /* İki oktav: büyük kıtalar + kenarlarda doğal kırıklık.
     Tek oktavda biyom sınırları fazla düzgün, sabun köpüğü gibi duruyor. */
  function biyom(gx, gy) {
    const f = CFG.frekans;
    let v = smoothNoise(gx * f, gy * f) * 0.70
          + smoothNoise(gx * f * 3.1, gy * f * 3.1) * 0.30;

    if (v < CFG.esikKar)   return "kar";
    if (v < CFG.esikCimen) return "cimen";
    return "lav";
  }

  /* ═════════════════════════════════════════════════════════════════════
     KARO GÖRSELLERİ
     ═════════════════════════════════════════════════════════════════════ */

  const karolar = {};   // { kar: {img, hazir}, ... }

  function karolariYukle() {
    Object.keys(CFG.karoDosya).forEach(ad => {
      const kayit = { img: null, hazir: false };
      karolar[ad] = kayit;

      const img = new Image();
      img.onload  = () => { kayit.img = img; kayit.hazir = true; ciz(); };
      img.onerror = () => {
        console.warn("[harita.js] Karo görseli yok, düz renk kullanılıyor:", CFG.karoDosya[ad]);
      };
      img.src = CFG.karoDosya[ad];
    });
  }

  /* ═════════════════════════════════════════════════════════════════════
     CANVAS KURULUMU

     KRİTİK: canvas #battleMap'in İÇİNDE DEĞİL, kardeşi olarak duruyor.
     Sebep: #battleMap'e CSS transform: scale() uygulanıyor. Canvas onun
     içinde olsaydı raster olarak büyütülür, yakınlaştırınca BULANIKLAŞIRDI.
     Dışarıda durup pan/zoom'u kendi çizerek uyguluyor → her ölçekte net.
     ═════════════════════════════════════════════════════════════════════ */

  let cv = null, ctx = null, dpr = 1;
  let aktif = true;          // false = eski resimli harita
  let cizimIstendi = false;

  function kurCanvas() {
    const scroll = document.getElementById("battleMapScroll");
    const mapEl  = document.getElementById("battleMap");
    if (!scroll || !mapEl) return false;

    cv = document.createElement("canvas");
    cv.id = "isoGround";
    cv.style.cssText =
      "position:absolute; inset:0; width:100%; height:100%; " +
      "display:block; pointer-events:none; z-index:0;";
    scroll.insertBefore(cv, mapEl);

    ctx = cv.getContext("2d", { alpha: false });
    boyutlandir();
    return true;
  }

  function boyutlandir() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;

    dpr = Math.min(window.devicePixelRatio || 1, 2);  // 3x'te bellek boşuna şişiyor
    cv.width  = Math.round(r.width  * dpr);
    cv.height = Math.round(r.height * dpr);
    ciz();
  }

  /* ═════════════════════════════════════════════════════════════════════
     ÇİZİM — CULLING BURADA

     20.000 karonun tamamı ASLA çizilmez. Ekranda görünen dünya
     dikdörtgeninin dört köşesi ızgara koordinatına çevrilir, sadece o
     aralık taranır. Bu yüzden maliyet harita boyutundan bağımsızdır:
     141x141 ile 500x500 aynı hızda çalışır.
     ═════════════════════════════════════════════════════════════════════ */

  let sonKare = 0, fps = 0, fpsSayac = 0, fpsZaman = 0;

  function ciz() {
    if (!ctx || !cv || !aktif) return;

    const panX = (typeof mapPanX !== "undefined") ? mapPanX : 0;
    const panY = (typeof mapPanY !== "undefined") ? mapPanY : 0;
    const zoom = (typeof mapZoom !== "undefined") ? mapZoom : 1;

    const w = cv.width / dpr, h = cv.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a1830";
    ctx.fillRect(0, 0, w, h);

    /* Görünen dünya dikdörtgeni */
    const wx0 = (0 - panX) / zoom, wx1 = (w - panX) / zoom;
    const wy0 = (0 - panY) / zoom, wy1 = (h - panY) / zoom;

    /* Dört köşeyi ızgaraya çevir → tarama aralığı.
       Karolar eşkenar dörtgen olduğu için köşelerden hesaplamak şart;
       tek köşe alınırsa kenarlarda boşluk oluşur. */
    const k = [
      worldToGrid(wx0, wy0), worldToGrid(wx1, wy0),
      worldToGrid(wx0, wy1), worldToGrid(wx1, wy1),
    ];
    let gx0 = Infinity, gx1 = -Infinity, gy0 = Infinity, gy1 = -Infinity;
    for (const p of k) {
      if (p.gx < gx0) gx0 = p.gx;
      if (p.gx > gx1) gx1 = p.gx;
      if (p.gy < gy0) gy0 = p.gy;
      if (p.gy > gy1) gy1 = p.gy;
    }
    /* +2 pay: karonun yüksekliği hücre sınırını taşar */
    gx0 = Math.max(0, Math.floor(gx0) - 2);
    gy0 = Math.max(0, Math.floor(gy0) - 2);
    gx1 = Math.min(G - 1, Math.ceil(gx1) + 2);
    gy1 = Math.min(G - 1, Math.ceil(gy1) + 2);

    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    let cizilen = 0;
    const tw = CFG.tileW, th = CFG.tileH;

    /* Boyama sırası: gy → gx. Zemin için sıra fark etmez ama ADIM D'de
       derinlik sıralaması bu döngüye bağlanacak, şimdiden doğru sırada. */
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const p = gridToWorld(gx, gy);
        const tip = biyom(gx, gy);
        const kayit = karolar[tip];

        if (kayit && kayit.hazir) {
          ctx.drawImage(kayit.img, p.x, p.y, tw, th);
        } else {
          /* Görsel yok → düz eşkenar dörtgen */
          ctx.fillStyle = CFG.karoRenk[tip];
          ctx.beginPath();
          ctx.moveTo(p.x + HALF_W, p.y);
          ctx.lineTo(p.x + tw,     p.y + HALF_H);
          ctx.lineTo(p.x + HALF_W, p.y + th);
          ctx.lineTo(p.x,          p.y + HALF_H);
          ctx.closePath();
          ctx.fill();
        }

        if (CFG.izgaraCizgisi) {
          ctx.strokeStyle = "rgba(0,0,0,.18)";
          ctx.lineWidth = 1 / zoom;
          ctx.beginPath();
          ctx.moveTo(p.x + HALF_W, p.y);
          ctx.lineTo(p.x + tw,     p.y + HALF_H);
          ctx.lineTo(p.x + HALF_W, p.y + th);
          ctx.lineTo(p.x,          p.y + HALF_H);
          ctx.closePath();
          ctx.stroke();
        }
        cizilen++;
      }
    }

    /* FPS + çizilen karo sayısı */
    if (CFG.fpsGoster) {
      const simdi = performance.now();
      fpsSayac++;
      if (simdi - fpsZaman > 500) {
        fps = Math.round((fpsSayac * 1000) / (simdi - fpsZaman));
        fpsSayac = 0; fpsZaman = simdi;
      }
      sonKare = simdi;
      const el = document.getElementById("isoFps");
      if (el) el.textContent = fps + " fps · " + cizilen + " karo";
    }
  }

  /* Aynı karede iki kez çizmeyi engeller */
  function cizIste() {
    if (cizimIstendi) return;
    cizimIstendi = true;
    requestAnimationFrame(() => { cizimIstendi = false; ciz(); });
  }

  /* ═════════════════════════════════════════════════════════════════════
     OYUNA BAĞLANMA

     applyMapPan ve clampMapPan oyunun kendi fonksiyonları. Function
     declaration oldukları için window üzerinde yer alırlar → üzerlerine
     yazabiliyoruz. Orijinalleri saklanıyor; ESKİ moda geçince geri
     dönülüyor. Böylece bu dosyayı silmek dışında bir "geri alma" da var.
     ═════════════════════════════════════════════════════════════════════ */

  let eskiApply = null, eskiClamp = null;

  function bagla() {
    eskiApply = window.applyMapPan;
    eskiClamp = window.clampMapPan;

    window.applyMapPan = function () {
      if (eskiApply) eskiApply.apply(this, arguments);
      cizIste();
    };

    window.clampMapPan = function () {
      if (!aktif) { if (eskiClamp) eskiClamp.apply(this, arguments); return; }

      const wrapEl = document.getElementById("battleMapWrap");
      if (!wrapEl) return;
      const ww = wrapEl.clientWidth, wh = wrapEl.clientHeight;
      if (ww <= 0 || wh <= 0) return;

      if (mapZoom < CFG.minZoom) mapZoom = CFG.minZoom;
      if (mapZoom > CFG.maxZoom) mapZoom = CFG.maxZoom;

      const sw = WORLD_W * mapZoom, sh = WORLD_H * mapZoom;

      const minX = ww - sw;
      mapPanX = (minX >= 0) ? minX / 2 : Math.max(minX, Math.min(0, mapPanX));

      const minY = wh - sh;
      mapPanY = (minY >= 0) ? minY / 2 : Math.max(minY, Math.min(0, mapPanY));
    };
  }

  /* Haritayı ızgaranın ortasına götürür (ADIM B'de kale konumu henüz
     izometriğe çevrilmedi, o yüzden merkez) */
  function ortala() {
    const wrapEl = document.getElementById("battleMapWrap");
    if (!wrapEl || !wrapEl.clientWidth) return;
    const p = gridToWorld(G / 2, G / 2);
    mapPanX = wrapEl.clientWidth  / 2 - p.x * mapZoom;
    mapPanY = wrapEl.clientHeight / 2 - p.y * mapZoom;
    window.clampMapPan();
    window.applyMapPan();
  }

  /* ═════════════════════════════════════════════════════════════════════
     ESKİ / YENİ ANAHTARI + FPS ROZETİ
     ═════════════════════════════════════════════════════════════════════ */

  function kurArayuz() {
    const wrap = document.getElementById("battleMapWrap");
    if (!wrap) return;

    const kutu = document.createElement("div");
    kutu.style.cssText =
      "position:absolute; top:8px; left:8px; z-index:40; " +
      "display:flex; gap:6px; align-items:center; " +
      "font-family:'Baloo 2',sans-serif; font-weight:800; font-size:11px;";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "YENİ";
    btn.style.cssText =
      "padding:5px 10px; border-radius:9px; border:2px solid rgba(190,240,255,.6); " +
      "background:linear-gradient(180deg,#3d7ccc,#1a3a75); color:#fff; " +
      "font:inherit; box-shadow:0 3px 0 #0e2246;";

    const fpsEl = document.createElement("span");
    fpsEl.id = "isoFps";
    fpsEl.style.cssText =
      "padding:5px 8px; border-radius:9px; background:rgba(0,10,26,.6); " +
      "color:#9fe6ff; white-space:nowrap;";
    if (!CFG.fpsGoster) fpsEl.style.display = "none";

    btn.addEventListener("pointerdown", e => e.stopPropagation());
    btn.addEventListener("click", e => {
      e.stopPropagation();
      aktif = !aktif;
      btn.textContent = aktif ? "YENİ" : "ESKİ";
      uygulaMod();
    });

    kutu.appendChild(btn);
    kutu.appendChild(fpsEl);
    wrap.appendChild(kutu);
  }

  /* Mod değişince görünürlükleri ayarla.
     YENİ modda #battleMap gizlenir: içindeki kale/canavar düğümleri hâlâ
     eski düz koordinatta, izometrik zemine oturmuyorlar. ADIM D'de
     taşınacaklar. */
  function uygulaMod() {
    const mapEl = document.getElementById("battleMap");
    if (cv) cv.style.display = aktif ? "block" : "none";
    if (mapEl) mapEl.style.visibility = aktif ? "hidden" : "visible";

    mapZoom = aktif ? Math.max(CFG.minZoom, 1) : 1;
    if (aktif) ortala();
    else { window.clampMapPan(); window.applyMapPan(); }
  }

  /* ═════════════════════════════════════════════════════════════════════
     BAŞLAT
     ═════════════════════════════════════════════════════════════════════ */

  function baslat() {
    if (!kurCanvas()) { setTimeout(baslat, 300); return; }
    karolariYukle();
    bagla();
    kurArayuz();
    uygulaMod();

    window.addEventListener("resize", () => { boyutlandir(); cizIste(); });
    if (window.ResizeObserver) {
      new ResizeObserver(() => { boyutlandir(); cizIste(); })
        .observe(document.getElementById("battleMapWrap"));
    }

    console.log("[harita.js] İzometrik zemin hazır —",
      G + "x" + G, "=", G * G, "karo");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", baslat);
  } else {
    baslat();
  }

  /* Konsoldan ayar yapabilmek için dışarı aç.
     Örn: HARITA.CFG.izgaraCizgisi = true; HARITA.ciz(); */
  window.HARITA = { CFG, ciz, cizIste, gridToWorld, worldToGrid, biyom, ortala };
})();
