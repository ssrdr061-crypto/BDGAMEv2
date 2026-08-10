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

    /* Açılışta kullanılacak zoom. Büyütürsen daha yakından başlar. */
    baslangicZoom: 1.6,

    /* Kaydırma sürtünmesi: parmağı bıraktıktan sonra harita akmaya
       devam eder. 1'e yaklaştıkça daha uzun kayar, düşürdükçe daha
       çabuk durur. */
    surtunme: 0.94,

    /* Ataletin kare başına gidebileceği en fazla piksel. Bu sınır
       olmadan çok kısa dokunuşlarda hız uçuk çıkıp harita ekranın
       bir ucundan diğerine fırlıyor. */
    enYuksekHiz: 40,

    /* Kale taşırken ekran kenarında kaç piksellik bantta harita
       kendiliğinden kaysın, ve kare başına en fazla kaç piksel. */
    kenarBandi: 90,
    kenarHizi: 14,

    /* "Kaleme dön" butonunun ekran kenarından uzak duracağı mesafe.
       Üstte HUD, altta sohbet şeridi var; buton onların arkasında
       kaybolmasın diye. */
    evButonUstBosluk: 10,
    evButonAltBosluk: 70,

    /* Düğüm (kale/canavar) ölçek çarpanı. Kale CSS'te 100px;
       0.64 çarpanı onu 64px'lik karoya tam oturtur. Büyütürsen kale
       karodan taşar, küçültürsen karo içinde küçük kalır. */
    dugumOlcek: 0.64,

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
      /* Düz renk yedeği — burada da PAY kadar taşırıyoruz, yoksa
         doku yüklenmediğinde karo kenarlarında çizgiler görünüyor. */
      const d = PAY;
      x2.fillStyle = CFG.karoRenk[tip];
      x2.beginPath();
      x2.moveTo(x + tw / 2, y - d);
      x2.lineTo(x + tw + d, y + th / 2);
      x2.lineTo(x + tw / 2, y + th + d);
      x2.lineTo(x - d,      y + th / 2);
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

    /* Parçanın dünya sınırları — eşkenar dörtgen dizisinin kutusu.
       PAY kadar genişletiliyor: kenardaki karoların taşma payı canvas
       sınırında kesilirse parça sınırları boyunca ince çizgiler
       (dikdörtgen desen) görünüyordu. */
    const minX = gridToWorld(gx0, gy1).x - PAY;
    const maxX = gridToWorld(gx1, gy0).x + tw + PAY;
    const minY = gridToWorld(gx0, gy0).y - PAY;
    const maxY = gridToWorld(gx1, gy1).y + th + PAY;

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
    if (!ctx || !cv) return;

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

    /* ── DÜĞÜMLER ──
       Zemin parçalarından SONRA çizilir ki üstünde kalsınlar.
       Kendi dönüşümünü kendi kurar, o yüzden burada bir şey
       sıfırlamaya gerek yok. */
    let dugumSayi = 0;
    try { dugumSayi = cizDugumler(ctx, panX, panY, zoom, w, h); }
    catch (e) { /* düğüm çizimi zemini düşürmesin */ }

    /* Sefer yolları düğümlerin ÜSTÜNE çizilir; ordu bir kaynağın
       üzerinden geçerken çizgi kaybolmasın. */
    try { cizSeferler(ctx, panX, panY, zoom, w, h); }
    catch (e) { /* sefer çizimi zemini düşürmesin */ }

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


  /* ═════════════════════════════════════════════════════════════════════
     DÜĞÜM KATMANI — CANVAS
     ---------------------------------------------------------------------
     Kaynak arazileri ve canavarlar (dugum.js, 176 adet) ARTIK DOM DEĞİL.

     NEDEN TAŞINDI: her düğüm bir DOM elemanıydı ve pan/zoom sırasında
     tarayıcı 176 elemanın yerleşimini yeniden hesaplayıp boyuyordu.
     Ölçüm nettir: aynı 1600 karoda düğümsüz 46 fps, düğümlü 16 fps.
     Kayıp zeminden değil, düğümlerdendi.

     Artık zeminle AYNI karede, aynı canvas'a çiziliyorlar. Bir düğüm
     birkaç drawImage/fillText çağrısı; tarayıcıya sorulan bir şey yok.

     KALELER DOM'DA KALDI: birkaç tane, resim taşıyorlar ve taşıma/
     sürükleme etkileşimleri var. Onları taşımanın kazancı yok.

     GÖRSELE GEÇİŞ: şu an emoji basılıyor (ctx.fillText). Sprite'a
     geçmek için tek yer değişir — cizDugumGorseli(). Oraya drawImage
     koyunca hem PNG hem kare kare animasyon çalışır.
     ═════════════════════════════════════════════════════════════════════ */

  /* ── HARİTA YAZI TİPİ ──
     Haritaya basılan HER yazı bunu kullanır. Tek adres: değişecekse
     burası değişir, çizim yerleri değil. */
  const HARITA_FONT = "'Baloo 2','Nunito',system-ui,sans-serif";

  /* Düğüm listesi önbelleği. DUGUM.haritaDugumleri() 176 slotu dolaşır;
     bunu her karede yapmak gereksiz — liste saniyede iki kez tazelenir.
     Toplama/yenilme gibi olaylar zaten dugumTazele() ile anında bildirir. */
  let _dugumListe = null;
  let _dugumZaman = 0;
  const DUGUM_TAZELIK_MS = 500;

  function dugumTazele() { _dugumListe = null; }

  function dugumleriAl() {
    const simdi = performance.now();
    if (_dugumListe && (simdi - _dugumZaman) < DUGUM_TAZELIK_MS) return _dugumListe;
    try {
      _dugumListe = (window.DUGUM && DUGUM.haritaDugumleri) ? DUGUM.haritaDugumleri() : [];
    } catch (e) { _dugumListe = []; }
    _dugumZaman = simdi;
    return _dugumListe;
  }

  /* Seviye rengi — 1 yeşil, 2 sarı, 3 kırmızı. */
  const SV_RENK = { 1: "#5fd98a", 2: "#e8c84f", 3: "#e2585c" };

  /* Düğümün görseli. SPRITE'A GEÇİŞ TAM OLARAK BURADAN YAPILIR:
     bu gövdeyi drawImage(sprite, x-r, y-r, r*2, r*2) ile değiştirmek
     yeterli; çağıran hiçbir yer değişmez. */
  function cizDugumGorseli(c, d, x, y, r) {
    c.font = Math.round(r * 1.5) + "px serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(d.ikon, x, y);
  }

  /* Düğümleri canvas'a çizer. ciz() içinden, zemin parçalarından SONRA
     çağrılır; o noktada ctx zaten pan+zoom dönüşümünde olduğu için
     dönüşüm geçici olarak SIFIRLANIR: düğüm boyu zoom ile ölçeklenmeli
     ama yazı tipi ve çizgi kalınlığı bulanıklaşmamalı. */
  function cizDugumler(c, panX, panY, zoom, w, h) {
    const liste = dugumleriAl();
    if (!liste.length) return 0;

    c.save();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);   /* ekran pikseline dön */

    const r = 24 * zoom * CFG.dugumOlcek;   /* düğüm yarıçapı, px */
    const PAY = r * 3;
    let cizilen = 0;

    /* Derinlik sırası: ekranda aşağıdaki üste gelsin (izometri). */
    const sirali = liste.slice().sort((a, b) => (a.kx + a.ky) - (b.kx + b.ky));

    for (let i = 0; i < sirali.length; i++) {
      const d = sirali[i];
      const p = gridToWorld(d.kx, d.ky);
      const x = (p.x + HALF_W) * zoom + panX;
      const y = (p.y + HALF_H) * zoom + panY;

      if (x < -PAY || y < -PAY || x > w + PAY || y > h + PAY) continue;
      cizilen++;

      const renk = SV_RENK[d.seviye] || "#5fd98a";

      /* Halka — arazi köşeli, canavar yuvarlak. Uzaktan tür ayrımı. */
      c.beginPath();
      if (d.tur === "canavar") {
        c.arc(x, y, r, 0, Math.PI * 2);
      } else {
        const k = r * 0.9;
        c.roundRect ? c.roundRect(x - k, y - k, k * 2, k * 2, r * 0.28)
                    : c.rect(x - k, y - k, k * 2, k * 2);
      }
      c.fillStyle = "rgba(8,14,22,.62)";
      c.fill();
      c.lineWidth = Math.max(1, r * 0.09);
      c.strokeStyle = d.isgalAd ? (d.benimMi ? "#d4af37" : "#e2585c") : renk;
      c.stroke();

      cizDugumGorseli(c, d, x, y, r);

      /* Seviye rozeti — sağ altta küçük daire. */
      if (r > 9) {
        const bx = x + r * 0.78, by = y + r * 0.78, br = r * 0.34;
        c.beginPath();
        c.arc(bx, by, br, 0, Math.PI * 2);
        c.fillStyle = "#12181f";
        c.fill();
        c.lineWidth = Math.max(1, br * 0.22);
        c.strokeStyle = renk;
        c.stroke();
        c.fillStyle = renk;
        c.font = "800 " + Math.round(br * 1.35) + "px " + HARITA_FONT;
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(String(d.seviye), bx, by);
      }

      /* Etiket ve isim yalnız yeterince yakınken — uzakta okunmuyor
         zaten ve metin çizimi en pahalı iş. */
      if (r >= 13) {
        const punto = Math.max(9, Math.round(r * 0.46));
        const yaziY = y + r * 1.3;
        c.font = "800 " + punto + "px " + HARITA_FONT;
        c.textAlign = "center"; c.textBaseline = "top";
        /* SEVİYE YAZIDA TEKRARLANMAZ — rozet zaten gösteriyor.
           d.etiket "Demir Kaynağı Sv.1" gelir; son ek kırpılır. */
        yaziAnahat(c, d.ad, x, yaziY, "#e6eef6", punto);

        /* İŞGAL ADI — TEK KAYNAK BURASI.
           Kendim ALTIN, başkası KIRMIZI. Sefer katmanı toplarken ad
           basmaz; iki yerden basılınca aynı yazı üst üste geliyordu.
           Ayrıca işgal kaydı buluttan HER ZAMAN gelir, karşı tarafın
           seferi gelmese bile — bu yüzden daha güvenilir kaynak. */
        if (d.isgalAd) {
          yaziAnahat(c, d.isgalAd, x, yaziY + punto * 1.35,
                     d.benimMi ? "#e9cf7c" : "#e2585c", punto);
        }
      }
    }

    c.restore();
    return cizilen;
  }

  /* Ortalanmış yazı — ARKA PLAN KUTUSU YOK.
     Kutu her yazı için ayrı bir dolgu çağrısı demekti ve düğümün
     görselinin üstünü kapatıyordu. Okunurluk artık koyu bir
     ANAHAT ile sağlanıyor: tek strokeText, zeminden bağımsız
     okunur ve çizim maliyeti kutudan düşük. */
  function yaziAnahat(c, yazi, x, y, renk, punto) {
    c.lineWidth = Math.max(2, punto * 0.42);
    c.lineJoin = "round";
    c.miterLimit = 2;
    c.strokeStyle = "rgba(4,8,14,.92)";
    c.strokeText(yazi, x, y);
    c.fillStyle = renk;
    c.fillText(yazi, x, y);
  }

  /* ── TIKLAMA ──
     Canvas'ta eleman yok, o yüzden vuruş sınaması elle yapılır:
     ekran noktasına en yakın düğüm, yarıçap içindeyse seçilir.
     Üstteki (ekranda öndeki) düğüm önceliklidir. */
  function dugumBul(ekranX, ekranY) {
    const panX = (typeof mapPanX !== "undefined") ? mapPanX : 0;
    const panY = (typeof mapPanY !== "undefined") ? mapPanY : 0;
    const zoom = (typeof mapZoom !== "undefined") ? mapZoom : 1;
    const r = 24 * zoom * CFG.dugumOlcek;
    const liste = dugumleriAl();

    let bulunan = null, enDerin = -Infinity;
    for (let i = 0; i < liste.length; i++) {
      const d = liste[i];
      const p = gridToWorld(d.kx, d.ky);
      const x = (p.x + HALF_W) * zoom + panX;
      const y = (p.y + HALF_H) * zoom + panY;
      /* Parmak ucu 15 px'lik daireyi ıskalar. Görsel yarıçap küçükse
         bile en az 24 px'lik bir dokunma alanı bırakılır. */
      const vurus = Math.max(r * 1.15, 24);
      if (Math.hypot(ekranX - x, ekranY - y) > vurus) continue;
      const derinlik = d.kx + d.ky;
      if (derinlik > enDerin) { enDerin = derinlik; bulunan = d; }
    }
    return bulunan;
  }


  /* ═════════════════════════════════════════════════════════════════════
     SEFER KATMANI — CANVAS
     ---------------------------------------------------------------------
     Yürüyen orduların yolu ve işaretçisi. Eskiden sefer.js kendi
     requestAnimationFrame döngüsünde SVG çiziyordu; iki döngü ayrı
     zamanlarda dönünce çizgi haritadan bir kare geri kalıyor ve
     kaydırma sırasında kayıyordu.

     Artık zeminle AYNI karede, AYNI pan/zoom değeriyle çiziliyor —
     kayma matematiksel olarak imkânsız.
     ═════════════════════════════════════════════════════════════════════ */
  function cizSeferler(c, panX, panY, zoom, w, h) {
    const S = window.SEFER;
    if (!S || !S.liste) return 0;

    let liste;
    try { liste = S.liste(); } catch (e) { return 0; }
    if (!liste || !liste.length) return 0;

    const bk = (typeof currentUsername === "string" && typeof toFirebaseKey === "function")
      ? toFirebaseKey(currentUsername.toLowerCase()) : null;

    c.save();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const kayma = -((Date.now() / 45) % 22);   /* akan kesik çizgi */
    let sayi = 0;

    for (let i = 0; i < liste.length; i++) {
      const id = liste[i].id, s = liste[i].s;
      const ev = S.evre ? S.evre(s) : null;
      if (!ev || (ev.bitti && ev.ad === "donus")) continue;
      if (typeof ev.ax !== "number" || typeof ev.bx !== "number") continue;

      const benim = (s.sahip === bk);
      const renk = benim ? "#5ad2ff" : "#e2585c";

      const ax = (gridToWorld(ev.ax * ORAN, ev.ay * ORAN).x + HALF_W) * zoom + panX;
      const ay = (gridToWorld(ev.ax * ORAN, ev.ay * ORAN).y + HALF_H) * zoom + panY;
      const bx = (gridToWorld(ev.bx * ORAN, ev.by * ORAN).x + HALF_W) * zoom + panX;
      const by = (gridToWorld(ev.bx * ORAN, ev.by * ORAN).y + HALF_H) * zoom + panY;

      /* Ordunun anlık yeri: yol üzerinde ilerleme oranı kadar.
         TOPLARKEN ilerleme yolu değil kaynağı ölçer; ordu hedefte
         durur, o yüzden doğrudan hedef noktası alınır. */
      const t = (ev.ad === "topla") ? 1 : ev.p;
      const ox = ax + (bx - ax) * t;
      const oy = ay + (by - ay) * t;

      /* Tümüyle ekran dışındaysa hiç çizme. */
      const disari = (x, y) => (x < -160 || y < -160 || x > w + 160 || y > h + 160);
      if (disari(ax, ay) && disari(bx, by) && disari(ox, oy)) continue;
      sayi++;

      /* YOL — toplarken yol çizilmez, ordu zaten varmış durumda. */
      if (ev.ad !== "topla") {
        c.beginPath();
        c.moveTo(ax, ay);
        c.lineTo(bx, by);
        c.strokeStyle = renk;
        c.globalAlpha = benim ? 0.9 : 0.55;
        c.lineWidth = benim ? 3 : 2;
        c.setLineDash([12, 10]);
        c.lineDashOffset = kayma;
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 1;
      }

      /* İŞARETÇİ */
      const topluyor = (ev.ad === "topla");
      const punto = Math.max(10, Math.round(13 * Math.min(1.2, Math.max(0.7, zoom))));
      c.textAlign = "center";

      if (!topluyor) {
        /* Yürürken: kılıç + kalan süre (kendimse) ya da ad. */
        c.textBaseline = "middle";
        c.font = Math.round(punto * 1.5) + "px serif";
        c.fillText("⚔️", ox, oy - punto * 0.9);

        c.textBaseline = "top";
        c.font = "800 " + punto + "px " + HARITA_FONT;
        const yazi = benim
          ? (S.fmtSure ? S.fmtSure(ev.kalanMs) : "")
          : (s.sahipAd || "");
        if (yazi) yaziAnahat(c, yazi, ox, oy + punto * 0.3, renk, punto);
      }
      /* TOPLARKEN HİÇBİR ŞEY ÇİZİLMEZ.
         Ordu hedefte duruyor ve orada zaten düğümün görseli, adı ve
         işgal adı var. Üstüne kılıç/sayaç/ad koymak karoyu okunmaz
         yapıyordu. Toplama süresi sol üstteki sefer listesinde. */
    }

    c.restore();
    return sayi;
  }

  /* ── YAZI TİPİ YÜKLENİNCE BİR KEZ YENİDEN ÇİZ ──
     Canvas, ctx.font'a yazılan aileyi ancak YÜKLENMİŞSE kullanır.
     Baloo 2 ağdan geliyor; ilk kareler yedek yazı tipiyle çizilir ve
     font gelince ekranda kendiliğinden düzelmez (canvas kalıcıdır).
     Bu yüzden yükleme bitince tek bir kare isteniyor. */
  try {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { try { cizIste(); } catch (e) {} });
    }
  } catch (e) {}

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
  /* ── DÜĞÜM ÖNBELLEĞİ ──
     dugumleriYerlestir her kaydırma/yakınlaştırma karesinde çalışır.
     Eskiden her karede querySelectorAll çalışıp 176 elemanın
     dataset'i yeniden okunuyordu — koordinatlar DEĞİŞMEDİĞİ hâlde.
     Artık liste ve koordinatlar bir kez çıkarılıp saklanıyor;
     renderBattleMap innerHTML'i yenilediğinde geçersiz kılınıyor. */
  let _dOnbellek = null;

  function dugumOnbellegiBosalt() { _dOnbellek = null; }

  function dugumOnbellegi(mapEl) {
    /* GEÇERLİLİK DENETİMİ — eleman SAYISI yeterli değil!
       renderBattleMap katmanı innerHTML ile baştan yazıyor; sayı aynı
       kalsa bile elemanlar YENİDİR, eskiler DOM'dan kopmuştur. Sayıya
       güvenilirse konumlar koparılmış elemanlara yazılır, ekrandaki
       yeni düğümler hiç yerleşmez ve üst üste yığılır.
       Bu yüzden örnek bir elemanın hâlâ DOM'a bağlı olması aranır. */
    if (_dOnbellek && _dOnbellek.kok === mapEl &&
        _dOnbellek.sayi === mapEl.childElementCount &&
        _dOnbellek.liste.length &&
        _dOnbellek.liste[0].el.isConnected &&
        _dOnbellek.liste[_dOnbellek.liste.length - 1].el.isConnected) {
      return _dOnbellek.liste;
    }

    const liste = [];
    mapEl.querySelectorAll(".map-node").forEach(el => {
      const k = dugumKoordinati(el);
      if (!k) { el.style.display = "none"; return; }
      /* Dünya konumu zoom/pandan bağımsız — bir kez hesaplanır. */
      const p = gridToWorld(k.gx * ORAN, k.gy * ORAN);
      liste.push({ el: el, wx: p.x + HALF_W, wy: p.y + HALF_H,
                   derinlik: String(10 + Math.round((k.gx + k.gy) * 10)),
                   gorunur: null });
    });
    _dOnbellek = liste.length
      ? { kok: mapEl, sayi: mapEl.childElementCount, liste: liste }
      : null;
    return liste;
  }

  function dugumKoordinati(el) {
    if (el.dataset.cx !== undefined) {
      return { gx: parseFloat(el.dataset.cx), gy: parseFloat(el.dataset.cy) };
    }
    if (el.dataset.idx !== undefined && typeof enemies !== "undefined") {
      const e = enemies[parseInt(el.dataset.idx, 10)];
      /* Canavar konumu artık TAM SAYI KARO; çevrim koordinat.js'te. */
      if (e) return { gx: KOORD.karodanOlcek(e.kx), gy: KOORD.karodanOlcek(e.ky) };
    }
    if (el.dataset.loot !== undefined && typeof enemies !== "undefined") {
      const e = enemies.find(x => x.name === el.dataset.loot);
      /* Canavar konumu artık TAM SAYI KARO; çevrim koordinat.js'te. */
      if (e) return { gx: KOORD.karodanOlcek(e.kx), gy: KOORD.karodanOlcek(e.ky) };
    }
    return null;
  }

  /* ── TEK KARO İÇİN EKRAN KONUMU ──
     missile.js bunu çağırır (füze uçuşu + patlama). dugumleriYerlestir
     ile BİREBİR aynı matematik; ikisi ayrışırsa füze kalelerden kayar,
     o yüzden formül burada tek yerde duruyor.

     Dönen x/y, #battleMap düğüm katmanına göre PİKSELDİR — sprite'lar
     translate(-50%,-50%) kullandığı için karonun ORTASINI verir.
     kareYuksekligi: "bir kare yukarı" demek ekranda kaç px, zoom dahil. */
  function ekranKonumu(gx, gy) {
    const panX = (typeof mapPanX !== "undefined") ? mapPanX : 0;
    const panY = (typeof mapPanY !== "undefined") ? mapPanY : 0;
    const zoom = (typeof mapZoom !== "undefined") ? mapZoom : 1;

    const p = gridToWorld(gx * ORAN, gy * ORAN);
    return {
      x: (p.x + HALF_W) * zoom + panX,
      y: (p.y + HALF_H) * zoom + panY,
      zoom: zoom,
      kareYuksekligi: CFG.tileH * zoom
    };
  }

  function dugumleriYerlestir() {
    const mapEl = document.getElementById("battleMap");
    if (!mapEl) return;

    const panX = (typeof mapPanX !== "undefined") ? mapPanX : 0;
    const panY = (typeof mapPanY !== "undefined") ? mapPanY : 0;
    const zoom = (typeof mapZoom !== "undefined") ? mapZoom : 1;

    /* Düğüm boyu zoom ile TAM ORANTILI. Eskiden 0.55–1.5 arasına
       sıkıştırılıyordu; uzaklaşınca kale küçülmeyi bırakıp 4 karoyu
       kaplıyordu. Artık kale her zoom seviyesinde aynı sayıda karo
       kaplar. dugumOlcek, kalenin CSS boyunu (100px) karo genişliğine
       oturtan çarpan. */
    const olcek = zoom * CFG.dugumOlcek;

    /* ── EKRAN DIŞI KIRPMA + ÖNBELLEK ──
       Düğüm sayısı 15'ten 176'ya çıktı (dugum.js). Her karede hepsine
       stil yazmak telefonda kare hızını dibe vuruyordu: yazılan her
       left/top yeniden yerleşim ve boyama doğurur.

       İki tasarruf:
         1) Koordinatlar önbellekten okunur, dataset her kare
            ayrıştırılmaz.
         2) Yalnız EKRANDA GÖRÜNENE stil yazılır. Dışarıdaki
            display:none olur ve durumu değişmediği sürece ona bir
            daha HİÇ dokunulmaz (gorunur bayrağı). */
    const wrapEl = document.getElementById("battleMapWrap");
    const gorW = wrapEl ? wrapEl.clientWidth  : (window.innerWidth  || 0);
    const gorH = wrapEl ? wrapEl.clientHeight : (window.innerHeight || 0);
    const PAY = 140;   /* düğüm kutusu + etiket payı, piksel */

    /* Etiket kısma kaldırıldı: düğümler canvas'a taşındı, bu döngüde
       artık yalnız KALELER var (birkaç tane). Onların adı her zaman
       görünmeli — kimin kalesi olduğu haritanın temel bilgisi. */

    const donusum = "translate(-50%,-50%) scale(" + olcek + ")";
    const liste = dugumOnbellegi(mapEl);

    for (let i = 0; i < liste.length; i++) {
      const d = liste[i];
      const sx = d.wx * zoom + panX;
      const sy = d.wy * zoom + panY;

      const icerde = !(sx < -PAY || sy < -PAY || sx > gorW + PAY || sy > gorH + PAY);

      if (!icerde) {
        /* Zaten gizliyse hiçbir şey yazma — en ucuz durum budur. */
        if (d.gorunur !== false) { d.el.style.display = "none"; d.gorunur = false; }
        continue;
      }

      if (d.gorunur !== true) {
        d.el.style.display = "";
        d.el.style.zIndex = d.derinlik;   /* derinlik sabit, bir kez yeter */
        d.gorunur = true;
      }
      d.el.style.left = sx + "px";
      d.el.style.top  = sy + "px";
      d.el.style.transform = donusum;
    }

    /* SERBEST İŞARETLER — "Git" nişangahı ve koordinat paylaşma etiketi.
       Bunlar .map-node değil, ayrı ele alınıyor. index.html onları
       KONUMSUZ ve visibility:hidden doğuruyor; ilk doğru konumu burada
       alıp görünür oluyorlar. Aksi halde bir kare yanlış yerde görünüp
       sıçrıyorlardı. */
    const isaretler = [
      [".coord-marker", "activeCoordMarker"],
      [".coord-share",  "pendingShareCoord"]
    ];
    isaretler.forEach(([secici, degiskenAdi]) => {
      const el = mapEl.querySelector(secici);
      if (!el) return;

      let k = null;
      try {
        const v = (degiskenAdi === "activeCoordMarker")
          ? (typeof activeCoordMarker !== "undefined" ? activeCoordMarker : null)
          : (typeof pendingShareCoord  !== "undefined" ? pendingShareCoord  : null);
        if (v && typeof v.gx === "number") k = v;
      } catch (e) {}

      if (!k) { el.style.display = "none"; return; }

      const pm = gridToWorld(k.gx * ORAN, k.gy * ORAN);
      el.style.left = ((pm.x + HALF_W) * zoom + panX) + "px";
      el.style.top  = ((pm.y + HALF_H) * zoom + panY) + "px";
      el.style.display = "";
      el.style.visibility = "visible";
    });
  }

  /* #battleMap artık sadece düğüm (kale/canavar/sandık) katmanıdır.
     Zemini canvas çiziyor; bu eleman şeffaf bir üst kat. */
  function dugumKatmani() {
    const mapEl = document.getElementById("battleMap");
    if (!mapEl) return;
    mapEl.style.cssText =
      "position:absolute; left:0; top:0; width:100%; height:100%; " +
      "transform:none; background:none; overflow:visible; z-index:5;";
    mapEl.classList.add("iso-node-layer");
    dugumleriYerlestir();
  }

  /* Düğüm katmanının kendi stilleri. (Eski zemin gölgesi ve bölge
     etiketleri index.html'den tamamen kaldırıldı, burada gizlenmeleri
     gerekmiyor.) */
  function stilEnjekte() {
    if (document.getElementById("isoNodeStyles")) return;
    const st = document.createElement("style");
    st.id = "isoNodeStyles";
    st.textContent =
      ".battle-map.iso-node-layer .map-node{ position:absolute !important; }\n" +

      /* Düğümlerin konumunu ve ölçeğini artık JS her karede yazıyor.
         CSS'teki transform geçişi ve :hover büyütmesi bu yazımla
         yarışıyor ve kale bir anlığına büyüyüp küçülüyordu. */
      ".battle-map.iso-node-layer .map-node{ transition:none !important; }\n" +
      ".battle-map.iso-node-layer .map-node:hover{ transform:none; }\n";
    document.head.appendChild(st);
  }

  /* ═════════════════════════════════════════════════════════════════════
     OYUNA BAĞLANMA

     applyMapPan ve clampMapPan oyunun kendi fonksiyonları. Function
     declaration oldukları için window üzerinde yer alırlar → üzerlerine
     yazabiliyoruz. Orijinalleri saklanıyor; ESKİ moda geçince geri
     dönülüyor. Böylece bu dosyayı silmek dışında bir "geri alma" da var.
     ═════════════════════════════════════════════════════════════════════ */

  let eskiRender = null;
  let tweenId = null;


  function bagla() {
    /* Oyunun kendi merkezleme fonksiyonları kamerayı ESKİ 1586x992
       koordinatlarına göre konumlandırıyordu; scrollMapToBase üstelik
       requestAnimationFrame ile 180 kare boyunca tekrar deniyordu —
       yani biz ortaladıktan SONRA devreye girip kamerayı izometrik
       haritanın dışına atıyordu. İkisi de kendi ortala()'mıza
       yönlendiriliyor. */
    window.scrollMapToBase = function () { ortala(); };
    window.goToCastle      = function () { ortala(); };

    /* renderBattleMap innerHTML'i baştan yazıyor → düğümler eski
       yüzdeli konumlarına dönüyor. Her çizimden sonra yeniden
       yerleştiriyoruz. */
    eskiRender = window.renderBattleMap;
    if (eskiRender) {
      window.renderBattleMap = function () {
        const r = eskiRender.apply(this, arguments);
        dugumKatmani();
        dugumleriYerlestir();
        return r;
      };
    }

    /* ── YAKINLAŞTIRMAYI DEVRAL ──
       zoomAtPoint, zoom'u değiştiren TEK yol (hem kıstırma hem fare
       tekerleği oradan geçiyor). Kendi sürümümüzü koyuyoruz:
       parmakların ortasındaki dünya noktası sabit kalıyor ve zoom
       sınırları CFG'den geliyor. Böylece oyunun 0.5–3 sabit aralığı
       ile bizim sınırlarımız birbiriyle çekişmiyor. */
    window.zoomAtPoint = function (yeniZoom, odakX, odakY) {
      const z0 = mapZoom;
      let z1 = Math.max(CFG.minZoom, Math.min(CFG.maxZoom, yeniZoom));
      if (Math.abs(z1 - z0) < 1e-6) return;

      /* Odak noktasının altındaki dünya konumu sabit kalsın */
      const wx = (odakX - mapPanX) / z0;
      const wy = (odakY - mapPanY) / z0;

      mapZoom = z1;
      mapPanX = odakX - wx * z1;
      mapPanY = odakY - wy * z1;

      akisiDurdur();          // zoom sırasında atalet devam etmesin
      window.clampMapPan();
      window.applyMapPan();
    };

    /* ── KOORDİNATA KAYDIRMA ──
       "Git" tuşu ve kale taşıma onayı buradan geçiyor. Eski sürüm
       hedefi MAP_W/MAP_H (1586x992) üzerinden hesaplıyordu; izometrikte
       kamera alakasız bir yere uçuyordu. */
    window.panTweenToGrid = function (gx, gy, sure) {
      const wrapEl = document.getElementById("battleMapWrap");
      if (!wrapEl) return;
      const ww = wrapEl.clientWidth, wh = wrapEl.clientHeight;
      if (ww <= 0 || wh <= 0) return;

      akisiDurdur();

      const p = gridToWorld(gx * ORAN, gy * ORAN);
      const baslaX = mapPanX, baslaY = mapPanY;

      /* Hedefi kısıtlamadan geçir ki kenarda takılıp zıplamasın */
      mapPanX = ww / 2 - (p.x + HALF_W) * mapZoom;
      mapPanY = wh / 2 - (p.y + HALF_H) * mapZoom;
      window.clampMapPan();
      const hedefX = mapPanX, hedefY = mapPanY;
      mapPanX = baslaX; mapPanY = baslaY;

      const sureMs = sure || 420;
      const t0 = performance.now();

      if (tweenId) cancelAnimationFrame(tweenId);
      const adim = (simdi) => {
        const t = Math.min(1, (simdi - t0) / sureMs);
        const e = 1 - Math.pow(1 - t, 3);
        mapPanX = baslaX + (hedefX - baslaX) * e;
        mapPanY = baslaY + (hedefY - baslaY) * e;
        window.applyMapPan();
        tweenId = (t < 1) ? requestAnimationFrame(adim) : null;
      };
      tweenId = requestAnimationFrame(adim);
    };

    window.applyMapPan = function () {
      /* Kısıtlamayı BURADA da uyguluyoruz. Oyunun kıstırma kodu bazı
         yollardan mapZoom/mapPan'i değiştirip clampMapPan'i
         çağırmadan doğrudan applyMapPan'e geliyor; o durumda kamera
         kısıtsız kalıp haritanın alakasız bir yerine atlıyordu. */
      window.clampMapPan();

      /* Eski applyMapPan #battleMap'e transform basıyordu — düğüm
         katmanında bu her şeyi kaydırır, o yüzden çağrılmıyor. */
      evButonu();
      dugumleriYerlestir();
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
      const wrapEl = document.getElementById("battleMapWrap");
      if (!wrapEl) return;
      const ww = wrapEl.clientWidth, wh = wrapEl.clientHeight;
      if (ww <= 0 || wh <= 0) return;

      if (!(mapZoom > 0)) mapZoom = 1;
      if (mapZoom < CFG.minZoom) mapZoom = CFG.minZoom;
      if (mapZoom > CFG.maxZoom) mapZoom = CFG.maxZoom;

      /* Merkez her zaman mevcut pan'den türetilir. Zoom işini artık
         zoomAtPoint devraldığı için "zoom sırasında merkezi dondur"
         hilesine gerek kalmadı — o hile parmağın odak noktasıyla
         çelişip haritayı sıçratıyordu. */
      const c = worldToGrid((ww / 2 - mapPanX) / mapZoom,
                            (wh / 2 - mapPanY) / mapZoom);
      let cgx = c.gx, cgy = c.gy;

      /* ── KENAR KİLİDİ ──
         Merkezi sadece 0..G-1 arasında tutmak yetmiyor: uzaklaşınca
         ekran haritadan çok daha geniş oluyor ve kamera kenara
         dayandığında haritanın yarısı ekran dışında kalıyordu.
         Bu yüzden izin verilen merkez aralığını, o anki görüş
         alanının ızgara cinsinden yarıçapı kadar İÇERİ çekiyoruz. */
      const yariX = (ww / 2) / mapZoom / CFG.tileW;
      const yariY = (wh / 2) / mapZoom / CFG.tileH;
      const pay = Math.min(G / 2, yariX + yariY);

      const alt = pay, ust = (G - 1) - pay;

      if (alt >= ust) {
        /* Harita ekrandan küçük — ortala */
        cgx = G / 2; cgy = G / 2;
      } else {
        cgx = Math.max(alt, Math.min(ust, cgx));
        cgy = Math.max(alt, Math.min(ust, cgy));
      }

      const p = gridToWorld(cgx, cgy);
      mapPanX = ww / 2 - (p.x + HALF_W) * mapZoom;
      mapPanY = wh / 2 - (p.y + HALF_H) * mapZoom;


    };
  }

  /* ── KAMERAYI BİR NOKTAYA ANINDA OTURT ──
     panTweenToGrid'in animasyonsuz hali. Her karede çağrılabilir —
     missile.js füze takibinde bunu kullanıyor. Tween KULLANMA, her
     kare yeni bir tween başlatır ve kamera titrer. */
  function merkezle(gx, gy) {
    const wrapEl = document.getElementById("battleMapWrap");
    if (!wrapEl || !wrapEl.clientWidth) return;
    if (!(mapZoom > 0)) mapZoom = 1;

    const p = gridToWorld(gx * ORAN, gy * ORAN);
    mapPanX = wrapEl.clientWidth  / 2 - (p.x + HALF_W) * mapZoom;
    mapPanY = wrapEl.clientHeight / 2 - (p.y + HALF_H) * mapZoom;
    window.clampMapPan();
    dugumleriYerlestir();
    cizIste();
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

  /* ── EV BUTONU ──
     Kale ekran dışına çıkınca kenarda beliren "kaleme dön" ikonu.
     Oyunun kendi updateHomeBtn'i konumu eski 1586x992 haritasına göre
     hesaplıyordu; izometrikte kale görünürken bile butonu yanlış yere
     koyup gizliyordu. Aynı işi izometrik koordinatla yapıyoruz. */
  function evButonu() {
    const btn = document.getElementById("homeMapBtn");
    const wrapEl = document.getElementById("battleMapWrap");
    if (!btn || !wrapEl) return;

    if (typeof state === "undefined" || !state.castle ||
        typeof state.castle.gx !== "number") {
      btn.classList.remove("visible");
      return;
    }

    const ww = wrapEl.clientWidth, wh = wrapEl.clientHeight;
    if (ww <= 0 || wh <= 0) return;

    const p = gridToWorld(state.castle.gx * ORAN, state.castle.gy * ORAN);
    const sx = mapPanX + (p.x + HALF_W) * mapZoom;
    const sy = mapPanY + (p.y + HALF_H) * mapZoom;

    const pad = 30;
    if (sx >= pad && sx <= ww - pad && sy >= pad && sy <= wh - pad) {
      btn.classList.remove("visible");
      return;
    }

    /* Dikey sınırlar: buton üstteki HUD'un altında, alttaki sohbet
       şeridinin üstünde kalsın. Eskiden sadece kenara sıkıştırılıyordu
       ve şeritlerin arkasında kaybolabiliyordu. */
    const m  = 26;
    const ust = m + CFG.evButonUstBosluk;
    const alt = wh - m - CFG.evButonAltBosluk;

    btn.style.left = Math.max(m, Math.min(ww - m, sx)) + "px";
    btn.style.top  = Math.max(ust, Math.min(Math.max(ust, alt), sy)) + "px";
    btn.classList.add("visible");
  }

  /* ── EKRAN → IZGARA (kale taşıma için) ──
     Oyunun kendi screenToGrid'i kapalı bir fonksiyon, üzerine
     yazılamıyor. Bu yüzden index.html içinden BURAYA yönlendiriliyor.

     Dönen değer oyunun kendi ölçeğinde (0..mgrid, yani 0..30) —
     böylece cellFree, MOVE_MINDIST ve Firebase kaydı hiç değişmeden
     çalışmaya devam ediyor. Sadece dokunulan noktanın hangi hücreye
     denk geldiği izometrik olarak hesaplanıyor. */
  /* kenarPayi: kale taşımada kenara dayanmasın diye 2.5 birim içeri
     çekiliyor. Koordinat PAYLAŞMADA bu kısıtlama istenmez (haritanın
     kenarını da paylaşabilmeli), oradan 0 geçiliyor. */
  function ekranaGoreIzgara(cx, cy, mgrid, kenarPayi) {
    const wrapEl = document.getElementById("battleMapWrap");
    if (!wrapEl) return null;
    const r = wrapEl.getBoundingClientRect();
    if (!r.width || !r.height) return null;

    const zoom = (typeof mapZoom !== "undefined") ? mapZoom : 1;
    const panX = (typeof mapPanX !== "undefined") ? mapPanX : 0;
    const panY = (typeof mapPanY !== "undefined") ? mapPanY : 0;

    /* Ekran → dünya → izometrik ızgara → oyunun 0..30 ölçeği */
    const wx = (cx - r.left - panX) / zoom;
    const wy = (cy - r.top  - panY) / zoom;
    const k = worldToGrid(wx, wy);

    const M = mgrid || 30;
    let gx = k.gx / ORAN;
    let gy = k.gy / ORAN;

    const pay = (typeof kenarPayi === "number") ? kenarPayi : 2.5;
    gx = Math.max(pay, Math.min(M - pay, gx));
    gy = Math.max(pay, Math.min(M - pay, gy));

    /* ── KAREYE OTURT ──
       Dokunulan nokta artık en yakın KARONUN merkezine çekilir.
       Kale taşırken silüetin kare kare atlamasının ve paylaşılan
       koordinatın tam sayı olmasının sebebi bu.
       gx/gy hâlâ 0..30 ölçeğinde döner (kale verisi henüz o
       biçimde); ama artık bir karonun TAM karşılığıdır. Bir haneye
       yuvarlanmıyor — yuvarlansa karo geri hesaplanırken kayardı. */
    const K = window.KOORD;
    let kx, ky;
    if (K) {
      kx = K.karoyaOturt(K.olcektenKaro(gx));
      ky = K.karoyaOturt(K.olcektenKaro(gy));
      gx = K.karodanOlcek(kx);
      gy = K.karodanOlcek(ky);
    } else {
      kx = Math.round(gx * ORAN); ky = Math.round(gy * ORAN);
    }
    return { gx: gx, gy: gy, kx: kx, ky: ky };
  }

  /* ── TAŞIMA MODUNDA KENAR KAYDIRMASI ──
     Kale taşırken oyun kaydırmayı kapatıyor: parmak hayaleti sürüklüyor,
     harita sabit kalıyor. Bu yüzden kaleyi sadece o an ekranda görünen
     alana koyabiliyordun.

     Çözüm: parmak ekranın kenarına yaklaşınca harita o yöne kendiliğinden
     kaymaya başlıyor — masaüstü strateji oyunlarındaki gibi. Kenara ne
     kadar yaklaşırsan o kadar hızlı kayar. */

  let kenarId = null, kenarX = 0, kenarY = 0;

  function tasimaModuAcikMi() {
    return !!document.getElementById("castleMoveBar");
  }

  function kenarAdimi() {
    kenarId = null;
    if (!parmakVar || !tasimaModuAcikMi()) return;

    const wrap = document.getElementById("battleMapWrap");
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();

    const E = CFG.kenarBandi;
    let dx = 0, dy = 0;

    if (kenarX - r.left < E)      dx =  (E - (kenarX - r.left)) / E;
    else if (r.right - kenarX < E) dx = -(E - (r.right - kenarX)) / E;

    if (kenarY - r.top < E)        dy =  (E - (kenarY - r.top)) / E;
    else if (r.bottom - kenarY < E) dy = -(E - (r.bottom - kenarY)) / E;

    if (dx || dy) {
      mapPanX += dx * CFG.kenarHizi;
      mapPanY += dy * CFG.kenarHizi;
      window.clampMapPan();
      window.applyMapPan();
    }

    kenarId = requestAnimationFrame(kenarAdimi);
  }

  function kenarBaslat(x, y) {
    kenarX = x; kenarY = y;
    if (!kenarId && tasimaModuAcikMi()) kenarId = requestAnimationFrame(kenarAdimi);
  }

  function kenarDurdur() {
    if (kenarId) { cancelAnimationFrame(kenarId); kenarId = null; }
  }

  /* ═════════════════════════════════════════════════════════════════════
     ATALETLİ KAYDIRMA (momentum)

     Oyunun kendi kaydırma kodu parmak kalkınca haritayı ANINDA
     durduruyor. Burada parmağın son hızını ölçüp, bırakıldıktan sonra
     haritayı sürtünmeyle yavaşlayarak akıtıyoruz.

     Oyunun kendi kaydırma mantığına KARIŞMIYOR: sadece parmak
     kalktıktan sonra devreye giriyor, yani çakışma olmuyor.
     ═════════════════════════════════════════════════════════════════════ */

  let hizX = 0, hizY = 0;
  let sonX = 0, sonY = 0, sonAn = 0;
  let akisId = null, parmakVar = false;

  function akisiDurdur() {
    if (akisId) { cancelAnimationFrame(akisId); akisId = null; }
    hizX = hizY = 0;
  }

  function akisAdimi() {
    akisId = null;
    if (parmakVar) return;

    /* Yeterince yavaşladıysa dur — sonsuz kare israfı olmasın */
    if (Math.abs(hizX) < 0.15 && Math.abs(hizY) < 0.15) return;

    const oncekiX = mapPanX, oncekiY = mapPanY;
    mapPanX += hizX;
    mapPanY += hizY;
    window.clampMapPan();
    window.applyMapPan();

    /* Kenara dayandıysak o eksende hızı kes, duvara yaslanıp
       titremesin */
    if (Math.abs(mapPanX - oncekiX) < 0.01) hizX = 0;
    if (Math.abs(mapPanY - oncekiY) < 0.01) hizY = 0;

    hizX *= CFG.surtunme;
    hizY *= CFG.surtunme;

    akisId = requestAnimationFrame(akisAdimi);
  }

  function ataletKur() {
    const wrap = document.getElementById("battleMapWrap");
    if (!wrap) return;

    wrap.addEventListener("pointerdown", e => {
      parmakVar = true;
      akisiDurdur();
      sonX = e.clientX; sonY = e.clientY; sonAn = performance.now();
    }, { passive: true });

    wrap.addEventListener("pointermove", e => {
      if (!parmakVar) return;
      const simdi = performance.now();
      const dt = simdi - sonAn;
      if (dt > 0) {
        /* Kare başına piksel cinsinden hız (60 fps varsayımıyla).
           Ani sıçramaları yumuşatmak için önceki hızla harmanlıyoruz. */
        let ax = (e.clientX - sonX) / dt * 16;
        let ay = (e.clientY - sonY) / dt * 16;

        /* SINIR: dt çok küçükken (1-2 ms) bölme sonucu uçuk çıkıyor
           ve harita ekranın bir ucundan diğerine fırlıyordu. */
        const M = CFG.enYuksekHiz;
        ax = Math.max(-M, Math.min(M, ax));
        ay = Math.max(-M, Math.min(M, ay));

        hizX = hizX * 0.3 + ax * 0.7;
        hizY = hizY * 0.3 + ay * 0.7;
      }
      sonX = e.clientX; sonY = e.clientY; sonAn = simdi;
      kenarBaslat(e.clientX, e.clientY);
    }, { passive: true });

    const birak = () => {
      if (!parmakVar) return;
      parmakVar = false;
      kenarDurdur();

      /* Parmak hareketsiz bekleyip kalktıysa akıtma */
      if (performance.now() - sonAn > 90) { hizX = hizY = 0; return; }

      /* Çok küçük hızlar dokunuş sayılır, akıtma */
      if (Math.abs(hizX) < 1.5 && Math.abs(hizY) < 1.5) { hizX = hizY = 0; return; }

      akisId = requestAnimationFrame(akisAdimi);
    };

    wrap.addEventListener("pointerup", birak, { passive: true });
    wrap.addEventListener("pointercancel", birak, { passive: true });
    wrap.addEventListener("pointerleave", birak, { passive: true });
  }

  /* ═════════════════════════════════════════════════════════════════════
     FPS ROZETİ

     Buradaki ESKİ/YENİ anahtarı kaldırıldı: eski resimli harita modu
     tamamen çıkarıldı, tek harita bu. Geri alma yolu artık yalnızca
     index.html'deki <script src="harita.js"> satırını silmek DEĞİL —
     eski zemin de silindiği için o durumda harita boş kalır. Gerçek
     geri dönüş git geçmişinden alınmalı.
     ═════════════════════════════════════════════════════════════════════ */

  function kurArayuz() {
    const wrap = document.getElementById("battleMapWrap");
    if (!wrap) return;

    const kutu = document.createElement("div");
    kutu.style.cssText =
      "position:absolute; top:8px; left:8px; z-index:40; " +
      "display:flex; gap:6px; align-items:center; " +
      "font-family:'Baloo 2',sans-serif; font-weight:800; font-size:11px;";

    const fpsEl = document.createElement("span");
    fpsEl.id = "isoFps";
    fpsEl.style.cssText =
      "padding:5px 8px; border-radius:9px; background:rgba(0,10,26,.6); " +
      "color:#9fe6ff; white-space:nowrap;";
    if (!CFG.fpsGoster) fpsEl.style.display = "none";

    kutu.appendChild(fpsEl);
    wrap.appendChild(kutu);
  }

  /* Katmanları kur: canvas zemin, #battleMap üstünde düğüm katmanı. */
  function uygulaMod() {
    const mapEl = document.getElementById("battleMap");
    if (cv) cv.style.display = "block";
    if (mapEl) mapEl.style.visibility = "visible";

    dugumKatmani();

    mapZoom = Math.max(CFG.minZoom, Math.min(CFG.maxZoom, CFG.baslangicZoom));
    ortala();
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
    ataletKur();
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
  /* DIŞA AÇILAN API — burada bir ad değişirse çağıran dosya SESSİZCE
     devre dışı kalır, oyun çalışmaya devam eder. missile.js tam olarak
     böyle kırılmıştı: ekranKonumu/aktifMi hiç açılmamıştı ve füze
     aylarca eski yüzde hesabına düşüyordu. Buradan bir şey silmeden
     önce projede ADINI ARA. */
  window.HARITA = { CFG, ciz, cizIste, gridToWorld, worldToGrid, biyom, ortala,
                    dugumleriYerlestir, ekranKonumu, merkezle, ORAN, onbellegiBosalt,
                    dugumOnbellegiBosalt,
                    /* canvas düğüm katmanı */
                    dugumBul, dugumTazele,
                    ekranaGoreIzgara,
                    /* Eski harita modu kaldırıldı; missile.js hâlâ soruyor,
                       cevap her zaman evet. */
                    aktifMi: function () { return true; } };
})();
