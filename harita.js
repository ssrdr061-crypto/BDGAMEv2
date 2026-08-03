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
    tileW: 64,
    tileH: 32,

    /* ── Yakınlaştırma sınırları ──
       minZoom'u düşürmek haritayı uzaktan gösterir ama aynı karede
       çizilecek karo sayısını KATLAR. 0.5'in altına inmeden önce
       telefonda FPS'e bak. */
    minZoom: 0.75,
    maxZoom: 3.0,

    /* ── Biyom üretimi ──
       seed: bu sayı DEĞİŞTİRİLİRSE tüm oyuncularda harita değişir.
       Yayına çıktıktan sonra ASLA dokunma — kaleler başka arazide kalır. */
    seed: 20260803,
    frekans: 0.05,      // sınır dalgasının sıklığı
    esikKar: 0.33,      // soldan bu orana kadar KAR
    esikCimen: 0.67,    // buraya kadar ÇİMEN, sonrası LAV

    /* Sınır ne kadar kırışsın. 0 = bıçak gibi düz dikey çizgi,
       0.30 = çok dalgalı. Bantların birbirine karışmaması için
       0.20'yi aşma. */
    sinirDalgasi: 0.12,

    /* Geçiş bandı genişliği. Büyütürsen biyomlar birbirine daha uzun
       mesafede karışır (referans görseldeki gibi yumuşak), küçültürsen
       sınırlar keskinleşir. 0 yaparsan karışım tamamen kapanır. */
    gecisBandi: 0.06,

    /* ── Arazi dokuları ──
       DİKKAT: bunlar KARO değil, DÜZ DİKİŞSİZ DOKU olmalı. Yani üstten
       çekilmiş, kenarları birbirine oturan kare bir resim (örn. 1024x683
       çimen dokusu). İzometrik eşkenar dörtgene büken kod aşağıda.

       3D "kalıp" render'ları (kenarında toprak kalınlığı, altında gölge
       olanlar) KULLANILMAZ: her birinin kendi ışığı ve perspektifi var,
       yan yana dizilince kenarlarda gölge çizgileri sıralanır.

       Kendi deponuza koyun. Dış URL kullanmayın: hotlink kırılır ve
       CORS canvas'ı kirletir (tainted canvas → drawImage patlar).
       Dosya bulunamazsa düz renk kullanılır, oyun çökmez. */
    dokuDosya: {
      kar:   "doku_kar.webp",
      cimen: "doku_cimen.webp",
      lav:   "doku_lav.webp",
    },

    /* Ön-render kalitesi. 2 = karo 256x128 olarak hazırlanır, 128x64
       olarak çizilir → yakınlaştırınca net kalır. 3 yaparsan daha net
       ama bellek üç katına çıkar. */
    kalite: 2,

    /* ── Chunk (parça) önbelleği ──
       Karolar tek tek çizilmez; CHUNK x CHUNK'lık parçalar BİR KEZ
       çizilip saklanır, sonra tek drawImage ile ekrana basılır.
       8 seçildi: 64 karo tek çağrıya iniyor, parça canvas'ı da
       telefon belleğini zorlamayacak kadar küçük kalıyor.

       onbellekBoyu: bellekte tutulacak parça sayısı. Artırırsan
       kaydırma daha akıcı ama RAM artar. */
    CHUNK: 8,
    onbellekBoyu: 48,

    /* Her biyom için kaç farklı karo hazırlansın. Tek varyantta doku
       her karede birebir aynı tekrar eder ve ızgara deseni göze batar.
       4 varyant bunu büyük ölçüde kırar. */
    varyant: 9,

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

  /* ── BİYOM KONUMU ─────────────────────────────────────────────────
     Biyom artık saf gürültüden değil, karonun EKRANDAKİ YATAY
     konumundan geliyor: kar solda, çimen ortada, lav sağda.

     İzometride ekran yatay ekseni (gx - gy). Bunu 0..1 aralığına
     normalize edip eşiklerle kesiyoruz. Sınır cetvelle çizilmiş gibi
     durmasın diye üstüne hafif gürültü dalgası bindiriyoruz —
     dalga da tohumlu, yani herkeste aynı. */
  function biyomDeger(gx, gy) {
    /* (gx - gy) aralığı: -(G-1) .. +(G-1) → 0..1 */
    let u = ((gx - gy) + (G - 1)) / (2 * (G - 1));

    /* Sınırları kırıştıran dalga */
    const f = CFG.frekans;
    const dalga = smoothNoise(gx * f, gy * f) - 0.5;
    u += dalga * CFG.sinirDalgasi;

    return Math.max(0, Math.min(1, u));
  }

  function biyom(gx, gy) {
    const v = biyomDeger(gx, gy);
    if (v < CFG.esikKar)   return "kar";
    if (v < CFG.esikCimen) return "cimen";
    return "lav";
  }

  /* ── KARIŞIM (BLEND) ──────────────────────────────────────────────
     Referans görseldeki gibi kar → çimen → lav yumuşak geçsin diye,
     eşik değerinin yakınındaki karolarda İKİ doku üst üste çizilir.
     Üsttekinin saydamlığı, karonun eşiğe uzaklığına göre hesaplanır.

     Ekstra görsel gerekmez; geçiş tamamen matematikten doğar.
     Sadece sınır bandındaki karolar iki kez çizilir, yani maliyet
     haritanın küçük bir kısmında ve iki katı — ihmal edilebilir.

     Dönen değer: { alt, ust, k }
       alt = zemine çizilecek doku
       ust = üstüne saydam çizilecek doku (yoksa null)
       k   = üstteki dokunun saydamlığı (0..1)  */
  function biyomKarisim(gx, gy) {
    const v = biyomDeger(gx, gy);
    const b = CFG.gecisBandi;

    /* kar ↔ çimen sınırı */
    if (v > CFG.esikKar - b && v < CFG.esikKar + b) {
      return { alt: "kar", ust: "cimen", k: (v - (CFG.esikKar - b)) / (2 * b) };
    }
    /* çimen ↔ lav sınırı */
    if (v > CFG.esikCimen - b && v < CFG.esikCimen + b) {
      return { alt: "cimen", ust: "lav", k: (v - (CFG.esikCimen - b)) / (2 * b) };
    }

    if (v < CFG.esikKar)   return { alt: "kar",   ust: null, k: 0 };
    if (v < CFG.esikCimen) return { alt: "cimen", ust: null, k: 0 };
    return { alt: "lav", ust: null, k: 0 };
  }

  /* ═════════════════════════════════════════════════════════════════════
     KARO GÖRSELLERİ
     ═════════════════════════════════════════════════════════════════════ */

  /* ═════════════════════════════════════════════════════════════════════
     DOKUDAN İZOMETRİK KAROYA ÖN-RENDER

     Düz kare doku → izometrik eşkenar dörtgen. Her biyom için bu iş
     BİR KEZ yapılır, sonuç küçük bir canvas'ta saklanır. Çizim sırasında
     sadece hazır karo kopyalanır (drawImage), her karede yeniden
     büküm yapılmaz — asıl performans kazancı burada.

     Dönüşüm matrisi bir S x S kareyi tw x th eşkenar dörtgene taşır:
       (0,0) → üst köşe      (S,0) → sağ köşe
       (0,S) → sol köşe      (S,S) → alt köşe
     ═════════════════════════════════════════════════════════════════════ */

  const karolar = {};   // { kar: {hazir, parcalar:[canvas,...]}, ... }

  /* PAY: karo canvas'ının her yanına eklenen boşluk (dünya pikseli).
     Maskeyi dışarı taşırıyoruz ama canvas kenarı onu keserdi; bu pay
     taşan kısmın çizilebileceği yeri açıyor. Karo ekrana çizilirken
     aynı pay kadar sola/yukarı kaydırılıp o kadar büyük basılıyor,
     böylece komşularla tam opak örtüşme oluyor ve dikiş çizgisi
     kalmıyor. */
  const PAY = 1;

  function karoUret(img, tw, th, s, kaydirX, kaydirY) {
    const p = PAY * s;                       // ön-render ölçeğinde pay
    const c = document.createElement("canvas");
    c.width  = tw + 2 * p;
    c.height = th + 2 * p;
    const x = c.getContext("2d");

    x.translate(p, p);

    /* Eşkenar dörtgen maskesi, pay kadar dışarı taşkın */
    const d = p;
    x.beginPath();
    x.moveTo(tw / 2,  -d);
    x.lineTo(tw + d,   th / 2);
    x.lineTo(tw / 2,   th + d);
    x.lineTo(-d,       th / 2);
    x.closePath();
    x.clip();

    /* Kaynak dokudan kare bir bölge seç (varyant için kaydırmalı) */
    const S = Math.min(img.width, img.height);
    const sx = Math.min(img.width  - S, Math.round(kaydirX * (img.width  - S)));
    const sy = Math.min(img.height - S, Math.round(kaydirY * (img.height - S)));

    /* Kareyi dörtgene büken matris (pay kaydırması korunuyor) */
    x.transform(
      tw / (2 * S),   th / (2 * S),
     -tw / (2 * S),   th / (2 * S),
      tw / 2,         0
    );
    /* Dokuyu maskeden biraz taşkın çiz ki taşan kenar boş kalmasın */
    x.drawImage(img, sx, sy, S, S, -S * 0.03, -S * 0.03, S * 1.06, S * 1.06);

    return c;
  }

  function dokularıHazirla(ad, img) {
    const s  = CFG.kalite;
    const tw = Math.round(CFG.tileW * s);
    const th = Math.round(CFG.tileH * s);
    const parcalar = [];

    for (let i = 0; i < CFG.varyant; i++) {
      /* Varyantlar dokunun farklı bölgelerinden alınır → tekrar kırılır */
      const kx = (i % 3) * 0.45 + 0.05;
      const ky = (Math.floor(i / 3) % 3) * 0.45 + 0.05;
      parcalar.push(karoUret(img, tw, th, s, kx, ky));
    }

    karolar[ad] = { hazir: true, parcalar };
    onbellegiBosalt();
    ciz();
  }

  function karolariYukle() {
    Object.keys(CFG.dokuDosya).forEach(ad => {
      karolar[ad] = { hazir: false, parcalar: [] };

      const img = new Image();
      img.onload  = () => dokularıHazirla(ad, img);
      img.onerror = () => {
        console.warn("[harita.js] Doku yok, düz renk kullanılıyor:",
                     CFG.dokuDosya[ad]);
      };
      img.src = CFG.dokuDosya[ad];
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
  let kurtarmaKilidi = false;

  /* Tek karo çizer. saydamlik < 1 ise karışım katmanıdır.
     Doku hazır değilse düz renge düşer — oyun asla boş kalmaz. */
  function karoCiz(x2, tip, vi, x, y, tw, th, saydamlik) {
    const kayit = karolar[tip];

    if (saydamlik < 1) x2.globalAlpha = saydamlik;

    if (kayit && kayit.hazir) {
      /* Karo, PAY kadar taşkın hazırlandı: aynı kadar sola/yukarı
         kaydırıp o kadar büyük basıyoruz. Komşularla tam opak
         örtüşme oluyor, dikiş çizgisi kalmıyor. */
      x2.drawImage(kayit.parcalar[vi % kayit.parcalar.length],
                   x - PAY, y - PAY, tw + 2 * PAY, th + 2 * PAY);
    } else {
      x2.fillStyle = CFG.karoRenk[tip];
      x2.beginPath();
      x2.moveTo(x + tw / 2, y);
      x2.lineTo(x + tw,     y + th / 2);
      x2.lineTo(x + tw / 2, y + th);
      x2.lineTo(x,          y + th / 2);
      x2.closePath();
      x2.fill();
    }

    if (saydamlik < 1) x2.globalAlpha = 1;
  }

  /* ═════════════════════════════════════════════════════════════════════
     CHUNK ÖNBELLEĞİ

     CHUNK x CHUNK karoluk bir bölge, kendi küçük canvas'ına BİR KEZ
     çizilir ve saklanır. Kaydırırken o parça yeniden hesaplanmaz,
     hazır resim olarak basılır.

     Ölçek kovası: zoom sürekli değişen bir sayı, her değerine ayrı
     parça üretmek belleği patlatır. Bu yüzden zoom iki kovaya
     yuvarlanıyor (1x ve 2x). Yakınlaştırınca 2x kova devreye girer,
     görüntü net kalır.
     ═════════════════════════════════════════════════════════════════════ */

  const onbellek = new Map();

  function olcekKovasi(zoom) { return zoom > 1.2 ? 2 : 1; }

  function chunkAl(cx, cy, zoom) {
    const s = olcekKovasi(zoom);
    const anahtar = cx + "," + cy + "," + s;

    const varOlan = onbellek.get(anahtar);
    if (varOlan) {
      /* En son kullanılanı sona taşı — eskiler önce atılsın */
      onbellek.delete(anahtar);
      onbellek.set(anahtar, varOlan);
      return varOlan;
    }

    const par = chunkUret(cx, cy, s);
    onbellek.set(anahtar, par);

    /* Bellek sınırı: en eski parçaları at */
    while (onbellek.size > CFG.onbellekBoyu) {
      const ilk = onbellek.keys().next().value;
      onbellek.delete(ilk);
    }
    return par;
  }

  function chunkUret(cx, cy, s) {
    const C = CFG.CHUNK;
    const tw = CFG.tileW, th = CFG.tileH;

    const gx0 = cx * C, gx1 = gx0 + C - 1;
    const gy0 = cy * C, gy1 = gy0 + C - 1;

    /* Parçanın dünya sınırları — eşkenar dörtgen dizisinin kutusu */
    const minX = gridToWorld(gx0, gy1).x;
    const maxX = gridToWorld(gx1, gy0).x + tw;
    const minY = gridToWorld(gx0, gy0).y;
    const maxY = gridToWorld(gx1, gy1).y + th;

    const w = maxX - minX, h = maxY - minY;

    const c = document.createElement("canvas");
    c.width  = Math.ceil(w * s);
    c.height = Math.ceil(h * s);
    const x2 = c.getContext("2d");
    x2.setTransform(s, 0, 0, s, 0, 0);

    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const p = gridToWorld(gx, gy);
        const px = p.x - minX, py = p.y - minY;
        const kr = biyomKarisim(gx, gy);
        const vi = Math.floor(hash2(gx * 7 + 3, gy * 11 + 5) * CFG.varyant) % CFG.varyant;

        karoCiz(x2, kr.alt, vi, px, py, tw, th, 1);
        if (kr.ust && kr.k > 0.02) {
          karoCiz(x2, kr.ust, vi, px, py, tw, th, Math.min(1, kr.k));
        }
      }
    }

    return { cv: c, x: minX, y: minY, w, h };
  }

  /* Dokular sonradan yüklenince eski parçalar geçersiz kalır */
  function onbellegiBosalt() { onbellek.clear(); }

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
    /* +2 pay: karonun yüksekliği hücre sınırını taşar.
       DİKKAT: 0..G-1 aralığına KISITLAMIYORUZ. Izgara sınırı sadece
       OYUN kuralıdır (kale nereye kurulabilir); zemin görsel olarak
       dışarı doğru devam eder. Yoksa haritanın kenarında lacivert
       boşluk görünüyordu. */
    gx0 = Math.floor(gx0) - 2;
    gy0 = Math.floor(gy0) - 2;
    gx1 = Math.ceil(gx1) + 2;
    gy1 = Math.ceil(gy1) + 2;

    /* Güvenlik ağı: aralık boşsa kamera harita dışına kaçmış demektir.
       Bir kez ortalayıp yeniden çiziyoruz. kurtarmaKilidi sonsuz
       döngüyü engeller. */
    if (gx1 < gx0 || gy1 < gy0) {
      if (!kurtarmaKilidi) {
        kurtarmaKilidi = true;
        ortala();
        setTimeout(() => { kurtarmaKilidi = false; }, 400);
      }
      return;
    }

    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    /* ── CHUNK ÇİZİMİ ──
       Karo karo çizmek yerine hazır parçalar basılıyor. Ekranda
       ~1200 karo varsa bu 64 karo/parça hesabıyla ~20 drawImage
       demek — telefon için nefes aldırıcı fark. */
    const C = CFG.CHUNK;
    const cx0 = Math.floor(gx0 / C), cx1 = Math.floor(gx1 / C);
    const cy0 = Math.floor(gy0 / C), cy1 = Math.floor(gy1 / C);

    let cizilen = 0;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const par = chunkAl(cx, cy, zoom);
        if (!par) continue;
        /* +1 px: komşu parçalar arasında saç teli boşluk kalmasın */
        ctx.drawImage(par.cv, par.x, par.y, par.w + 1, par.h + 1);
        cizilen += C * C;
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
     ADIM D — DÜĞÜMLERİ İZOMETRİĞE OTURTMA

     Kaleler, canavarlar ve sandıklar #battleMap içinde DOM elemanı
     olarak duruyor (sadece ~50 tane, canvas'a taşımaya gerek yok).
     Eskiden yüzdeyle konumlanıyorlardı; artık her pan/zoom sonrası
     ekran pikseli olarak yeniden yerleştiriliyorlar.

     KOORDİNAT KORUNUYOR: oyunun kendi gx/gy değerleri 0..COORD_GRID
     aralığında kalıyor, Firebase'deki veriye DOKUNULMUYOR. Sadece
     çizerken ORAN ile izometrik ızgaraya ölçekleniyor. Böylece kale
     taşıma, koordinat kutusu, mesafe hesabı gibi mevcut mantık
     olduğu gibi çalışmaya devam ediyor.
     ═════════════════════════════════════════════════════════════════════ */

  const ORAN = G / 30;   // eski 30'luk ızgara → 141'lik ızgara

  /* Düğümün mantıksal koordinatını (0..30) bul */
  function dugumKoordinati(el) {
    if (el.dataset.cx !== undefined) {
      return { gx: parseFloat(el.dataset.cx), gy: parseFloat(el.dataset.cy) };
    }
    if (el.dataset.idx !== undefined && typeof enemies !== "undefined") {
      const e = enemies[parseInt(el.dataset.idx, 10)];
      if (e) return { gx: (e.mapX / 100) * 30, gy: (e.mapY / 100) * 30 };
    }
    if (el.dataset.loot !== undefined && typeof enemies !== "undefined") {
      const e = enemies.find(x => x.name === el.dataset.loot);
      if (e) return { gx: (e.mapX / 100) * 30, gy: (e.mapY / 100) * 30 };
    }
    return null;
  }

  function dugumleriYerlestir() {
    if (!aktif) return;
    const mapEl = document.getElementById("battleMap");
    if (!mapEl) return;

    const panX = (typeof mapPanX !== "undefined") ? mapPanX : 0;
    const panY = (typeof mapPanY !== "undefined") ? mapPanY : 0;
    const zoom = (typeof mapZoom !== "undefined") ? mapZoom : 1;

    /* Düğüm boyu zoom ile büyüsün ama uçlara kaçmasın */
    const olcek = Math.max(0.55, Math.min(1.5, zoom));

    mapEl.querySelectorAll(".map-node").forEach(el => {
      const k = dugumKoordinati(el);
      if (!k) { el.style.display = "none"; return; }

      const p = gridToWorld(k.gx * ORAN, k.gy * ORAN);
      /* Karonun ORTASINA otursun, üst köşesine değil */
      const sx = (p.x + HALF_W) * zoom + panX;
      const sy = (p.y + HALF_H) * zoom + panY;

      el.style.display = "";
      el.style.left = sx + "px";
      el.style.top  = sy + "px";
      el.style.transform = "translate(-50%,-50%) scale(" + olcek + ")";

      /* DERİNLİK: aşağıdaki (ekranda öndeki) düğüm üste gelsin.
         İzometride ekran derinliği gx+gy ile artar. */
      el.style.zIndex = String(10 + Math.round((k.gx + k.gy) * 10));
    });
  }

  /* #battleMap'i düğüm katmanına çevirir/geri alır */
  function dugumKatmani(ac) {
    const mapEl = document.getElementById("battleMap");
    if (!mapEl) return;

    if (ac) {
      if (!mapEl.dataset.eskiStil) mapEl.dataset.eskiStil = mapEl.style.cssText || " ";
      mapEl.style.cssText =
        "position:absolute; left:0; top:0; width:100%; height:100%; " +
        "transform:none; background:none; overflow:visible; z-index:5;";
      mapEl.classList.add("iso-node-layer");
      dugumleriYerlestir();
    } else {
      mapEl.style.cssText = (mapEl.dataset.eskiStil || "").trim();
      mapEl.classList.remove("iso-node-layer");
    }
  }

  /* Zemin karartma gölgesi (.battle-map::after) düğüm katmanında
     ekranı komple karartıyordu — kapatıyoruz. Bölge etiketleri de
     eski yüzdeli konumlarına göre yazılmıştı, gizleniyor. */
  function stilEnjekte() {
    if (document.getElementById("isoNodeStyles")) return;
    const st = document.createElement("style");
    st.id = "isoNodeStyles";
    st.textContent =
      ".battle-map.iso-node-layer::after{ display:none !important; }\n" +
      ".battle-map.iso-node-layer .map-zone-label{ display:none !important; }\n" +
      ".battle-map.iso-node-layer .map-node{ position:absolute !important; }\n";
    document.head.appendChild(st);
  }

  /* ═════════════════════════════════════════════════════════════════════
     OYUNA BAĞLANMA

     applyMapPan ve clampMapPan oyunun kendi fonksiyonları. Function
     declaration oldukları için window üzerinde yer alırlar → üzerlerine
     yazabiliyoruz. Orijinalleri saklanıyor; ESKİ moda geçince geri
     dönülüyor. Böylece bu dosyayı silmek dışında bir "geri alma" da var.
     ═════════════════════════════════════════════════════════════════════ */

  let eskiApply = null, eskiClamp = null, eskiScroll = null, eskiGo = null;
  let eskiRender = null;

  function bagla() {
    eskiApply = window.applyMapPan;
    eskiClamp = window.clampMapPan;

    /* Oyunun kendi merkezleme fonksiyonları kamerayı ESKİ 1586x992
       koordinatlarına göre konumlandırıyor. scrollMapToBase üstelik
       requestAnimationFrame ile 180 kare boyunca tekrar deniyor —
       yani biz ortaladıktan SONRA devreye girip kamerayı izometrik
       haritanın dışına atıyordu. YENİ modda ikisini de kendi
       ortala() fonksiyonumuza yönlendiriyoruz. */
    eskiScroll = window.scrollMapToBase;
    eskiGo     = window.goToCastle;

    window.scrollMapToBase = function () {
      if (aktif) { ortala(); return; }
      if (eskiScroll) eskiScroll.apply(this, arguments);
    };
    window.goToCastle = function () {
      if (aktif) { ortala(); return; }
      if (eskiGo) eskiGo.apply(this, arguments);
    };

    /* renderBattleMap innerHTML'i baştan yazıyor → düğümler eski
       yüzdeli konumlarına dönüyor. Her çizimden sonra yeniden
       yerleştiriyoruz. */
    eskiRender = window.renderBattleMap;
    if (eskiRender) {
      window.renderBattleMap = function () {
        const r = eskiRender.apply(this, arguments);
        if (aktif) { dugumKatmani(true); dugumleriYerlestir(); }
        return r;
      };
    }

    window.applyMapPan = function () {
      if (aktif) {
        /* Orijinal applyMapPan #battleMap'e transform basıyor —
           düğüm katmanında bu her şeyi kaydırır. Atlıyoruz. */
        if (typeof updateHomeBtn === "function") { try { updateHomeBtn(); } catch (e) {} }
        dugumleriYerlestir();
        cizIste();
        return;
      }
      if (eskiApply) eskiApply.apply(this, arguments);
      cizIste();
    };

    /* KRİTİK — clamp IZGARA uzayında yapılıyor, dünya dikdörtgeninde değil.

       Sebep: izometrik harita bir EŞKENAR DÖRTGEN. Onu çevreleyen
       dikdörtgenin dört köşesi BOŞTUR. Dikdörtgene göre kısıtlarsak
       kamera bu boş köşelere kayabiliyor ve ekranda hiçbir karo
       kalmıyor (ilk sürümde "0 karo" hatası tam olarak buydu).

       Artık ekranın MERKEZİ ızgara koordinatına çevriliyor, 0..G-1
       aralığına sıkıştırılıyor ve pan oradan geri hesaplanıyor.
       Böylece merkez her zaman harita üstünde kalır. */
    window.clampMapPan = function () {
      if (!aktif) { if (eskiClamp) eskiClamp.apply(this, arguments); return; }

      const wrapEl = document.getElementById("battleMapWrap");
      if (!wrapEl) return;
      const ww = wrapEl.clientWidth, wh = wrapEl.clientHeight;
      if (ww <= 0 || wh <= 0) return;

      if (!(mapZoom > 0)) mapZoom = 1;
      if (mapZoom < CFG.minZoom) mapZoom = CFG.minZoom;
      if (mapZoom > CFG.maxZoom) mapZoom = CFG.maxZoom;

      /* Ekran merkezinin dünya konumu → ızgara hücresi */
      const cwx = (ww / 2 - mapPanX) / mapZoom;
      const cwy = (wh / 2 - mapPanY) / mapZoom;
      const c = worldToGrid(cwx, cwy);

      const cgx = Math.max(0, Math.min(G - 1, c.gx));
      const cgy = Math.max(0, Math.min(G - 1, c.gy));

      /* Sıkıştırılmış merkezden pan'i geri üret */
      const p = gridToWorld(cgx, cgy);
      mapPanX = ww / 2 - (p.x + HALF_W) * mapZoom;
      mapPanY = wh / 2 - (p.y + HALF_H) * mapZoom;
    };
  }

  /* Haritayı ızgaranın ortasına götürür (ADIM B'de kale konumu henüz
     izometriğe çevrilmedi, o yüzden merkez) */
  function ortala() {
    const wrapEl = document.getElementById("battleMapWrap");
    if (!wrapEl || !wrapEl.clientWidth) return;
    if (!(mapZoom > 0)) mapZoom = 1;

    /* Varsa oyuncunun kendi kalesine, yoksa haritanın ortasına */
    let hx = G / 2, hy = G / 2;
    try {
      if (typeof state !== "undefined" && state.castle &&
          typeof state.castle.gx === "number") {
        hx = state.castle.gx * ORAN;
        hy = state.castle.gy * ORAN;
      }
    } catch (e) {}

    const p = gridToWorld(hx, hy);
    mapPanX = wrapEl.clientWidth  / 2 - (p.x + HALF_W) * mapZoom;
    mapPanY = wrapEl.clientHeight / 2 - (p.y + HALF_H) * mapZoom;
    window.clampMapPan();
    dugumleriYerlestir();
    cizIste();
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

  /* Mod değişince katmanları ayarla. YENİ modda #battleMap artık
     gizlenmiyor — düğüm katmanı olarak devam ediyor (ADIM D). */
  function uygulaMod() {
    const mapEl = document.getElementById("battleMap");
    if (cv) cv.style.display = aktif ? "block" : "none";
    if (mapEl) mapEl.style.visibility = "visible";

    dugumKatmani(aktif);

    mapZoom = aktif ? Math.max(CFG.minZoom, 1) : 1;
    if (aktif) ortala();
    else { window.clampMapPan(); window.applyMapPan(); }
  }

  /* ═════════════════════════════════════════════════════════════════════
     BAŞLAT
     ═════════════════════════════════════════════════════════════════════ */

  function baslat() {
    if (!kurCanvas()) { setTimeout(baslat, 300); return; }
    stilEnjekte();
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
  window.HARITA = { CFG, ciz, cizIste, gridToWorld, worldToGrid, biyom, ortala,
                    dugumleriYerlestir, ORAN, onbellegiBosalt };
})();
