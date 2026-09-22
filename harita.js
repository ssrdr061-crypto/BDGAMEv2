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
   Zemin görseli KULLANILMIYOR. Renk matematikten üretilir.
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

    /* ── KAMERA KENAR KİLİDİ (karo) ──
       Kameranın merkezinin harita kenarından en az kaç karo İÇERİDE
       kalacağı. 0 = merkez her karoya gidebilir.

       ESKİDEN bu pay ekran yarıçapından hesaplanıyordu (yatay + dikey
       toplanarak) ve telefonda 10-19 karoyu bulan bir bant oluyordu.
       Sonuç: kenara yakın bir koordinat PAYLAŞILDIĞINDA kamera oraya
       hiç varamıyor, erken duruyordu — ekranın ortasında bambaşka bir
       karo kalıyor, nişangah kenarda kalıyor ya da hiç görünmüyordu.
       "Arkadaşım paylaştığım konumda beni bulamıyor" hatası buydu.

       Bedeli: haritanın tam köşesine gidilince ekranın bir kısmı boş
       (lacivert) kalır. İşlevi kaybetmektense boşluk görünsün.
       Boşluğu azaltmak istersen bu sayıyı büyüt — ama büyüttüğün
       karo kadar kenar yeniden ULAŞILMAZ olur. */
    kameraKenarPayi: 0,

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

    /* Geçiş bandı genişliği. ARTIK YUMUŞAMA PAYIDIR, geçişin kendisi
       değil. Geniş tutulursa iki biyomun rengi ORTALANIR ve sınırda
       çamurlu bir ara ton çıkar (yeşil+kırmızı = kahve-gri; göz bunu
       arazi değil, çimenin üstüne atılmış GÖLGE diye okur). Geçiş
       bunun yerine `serpme` ile yapılıyor; buradaki değer sadece her
       beneğin kenarını tırtıklı bırakmayacak kadar (~2 karo). */
    /* 0.007 → 0.002: geçişler "kesin" istendi. Bu bant iki biyomun
       rengini ORTALIYOR; dar tutulunca sınır tek bir yumuşak çizgiye
       iner (zemin 10 px'te bir örneklendiği için yine de pürüzsüz). */
    gecisBandi: 0.013,

    /* ── SINIR YUMUŞAKLIĞI (boyalı zemin) ──
       Biyom sınırının yarı genişliği, DÜNYA PİKSELİ (karo 128 px).
       gecisBandi yalnız ESKİ yolda (boya.acik=false) geçerli; boyalı
       zemin sınırı piksel cinsinden hesaplıyor (chunkUretBoya'da
       "BİYOM SINIRI, PİKSEL CİNSİNDEN"). 2-6 = keskin, kenarı
       tırtıksız · 30+ = yumuşak geçiş. */
    sinirYumusak: 2,    /* panelde ayarlandı (?zeminayar=2), dosyaya sabitlendi */

    /* ── SERPME GEÇİŞ (benekler) ──
       Sınır çizgisi renk karıştırarak değil, biyom DEĞERİNİ ince
       gürültüyle oynatarak geçiliyor. Sonuç: lav çimenin içine tek
       karoluk benekler halinde girer, çimen lavın içine girer; her
       nokta ya tam lav ya tam çimendir, ara çamur rengi hiç oluşmaz.
       Aynısı kar ↔ çimen sınırında da çalışır.

       genislik: beneklerin saçıldığı bandın eni. u birimi;
         0.022 ≈ 6 karo, 0.055 ≈ 15 karo. KÜÇÜKSE sınır kopmaz,
         sadece kıvrılır — "geçiş sert" belirtisi budur. Parça parça
         ada isteniyorsa bu sayı büyütülür.
       kaba/orta/ince: üç gürültü katmanının sıklığı (büyük sayı =
         küçük desen). Kaba katman sınırın genel şeklini bozar, orta
         katman kenardan parçalar kopartır, ince katman kopan
         parçaların kenarını tırtıklar.
         2.0'ı aşma: zemin `zeminAdim` (10 dünya pikseli) aralıkla
         örneklendiği için daha küçük desen örneklemeye takılır,
         bulanıklaşıp yine gri bir pusa döner.
       pay: üç katmanın ağırlığı, toplamı 1 olmalı. */
    serpme: {
      /* 0.055 → 0.012: ÖLÇÜLEREK. 0.055'te sınır ~15 karoluk bir
         benek bandına dağılıyordu, geçiş "belirsiz" görünüyordu.
         0'da sınır cetvelle çekilmiş gibi dümdüz oluyor (sinirDalgasi
         çok iri dalga). 0.012 sınırı kesin bırakıp kenarını hafif
         kırıyor. ?zeminayar=1 → "Sınır pürüzü" ile canlı ayarlanır. */
      genislik: 0.046,
      kaba: 0.30, orta: 0.80, ince: 1.70,
      pay: [0.45, 0.34, 0.21],
    },

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
    /* ── ZEMİN RENKLERİ ──
       Doku görseli YOK. Zemin, biyom değerinden hesaplanan düz renkle
       boyanır; üstüne aynı rengin koyu/parlak parçaları bindirilir.
       Görsel dosya olmadığı için indirme, decode ve dikiş derdi yok. */
    zeminRenk: {
      kar:   [224, 234, 245],
      cimen: [ 82, 192,  58],
      lav:   [186,  60,  36],
    },

    /* ── ÇİMEN = KALEİÇİ DOKUSU ──
       Çimen bölgesi artık kaleici.js'teki ZCFG ayarlarıyla boyanır:
       daha kısık yeşil, daha düşük doygunluk, daha SIK leke deseni.
       Kar ve lav bu ayardan hiç etkilenmez — karışım biyom
       ağırlığıyla (w[1]) yapılır, sınır bandında yumuşak geçer.
       kaleici.js'e DOKUNULMADI. */
    cimenKale: {
      renk: [72, 172, 62],
      koyu: 0.24, acik: 0.24,
      isik: 0.32,
      siklik: 3.6,        // 1 = eski harita deseni · 3.6 = kaleiçi
      /* 1.10 → 1.04: yukarıdaki doygunluk notunun aynısı. Grade
         katmanı çimeni zaten canlandırıyor. */
      doygunluk: 1.04,
    },

    /* Leke gücü GENEL çarpanı. 0 = tek düze renk. Bölge başına
       ayrı ayar aşağıda (lekeAyar); bu sayı hepsini birden kısar. */
    leke: 1.0,

    /* ── DOYGUNLUK ──
       Işık dalgası beyaza, leke katmanı griye karıştırıyor; ikisi
       birden zemini soluklaştırıyordu. Taban renkleri doyurulsaydı
       lekelerin kendisi aşırı doygun çıkardı. Bu yüzden doygunluk
       EN SONDA, bütün katmanlar bindikten sonra bir kez toplanır.
       1 = dokunma · 1.2 civarı canlı · 1.5 üstü poster gibi.
       YALNIZ kar ve lav için geçerli — çimenin kendi doygunluğu
       cimenKale.doygunluk. Yansıma kapandıktan sonra kar/lav soluk
       kaldığı için 1.22 → 1.34.

       1.34 → 1.18 (atmosfer katmanı geldi): grade katmanı soft-light
       ile kontrastı zaten açıyor. İkisi üst üste binince lav turuncu,
       çimen zehir yeşili çıkıyordu — doygunluk boyaya değil IŞIĞA
       bırakıldı. Atmosferi kapatırsan (?atmos=0) burayı 1.34'e geri
       al, yoksa harita soluk görünür. */
    doygunluk: 1.18,

    /* ── LAVIN KENDİ DOYGUNLUĞU ──
       Lav taban rengi [186,60,36] zaten çok doygun bir kırmızı.
       Üstüne kar/lav ortak doygunluğu (1.18) binince arazi neon
       turuncuya kaçıyor ve çimen sınırında göz alıyordu.

       Karışım biyom ağırlığıyla yapılır (aşağıda w[2]): saf karda
       `doygunluk`, saf lavda bu değer geçerli, sınır bandında ikisi
       yumuşak geçer. Ayrı bir `if` ile kesilseydi sınırda görünür bir
       renk sıçraması olurdu.

       1 = dokunma · <1 soldur · >1 canlandır.

       ÖLÇÜLDÜ, TAHMİN DEĞİL: 0.95 ile başlandı (lav soluklaşsın diye),
       ekranda bakılınca lav fazla ölü kaldı ve 1.29'a çıkarıldı —
       kar/lav ortak doygunluğunun (1.18) da üstünde. Ayrı bir ayar
       olmasının asıl faydası bu: lav artık kardan BAĞIMSIZ. */
    doygunlukLav: 1.29,

    /* ── BÖLGE BAŞINA LEKE KARAKTERİ ──
       koyu = koyu parçaların gücü · acik = açık parçaların gücü
       Lav yalnız kararır (acik düşük), çimen iki yönlü, kar koyu
       lekelerinde turkuaza çalar. */
    lekeAyar: {
      kar:   { koyu: 0.34, acik: 0.10 },
      cimen: { koyu: 0.24, acik: 0.24 },
      lav:   { koyu: 0.38, acik: 0.08 },
    },

    /* Kar bölgesinin koyu lekelerinin rengi. Beyazın grisi yerine
       turkuaza çalan koyu bir ton — buz gölgesi hissi. */
    karGolgeRenk: [74, 128, 138],

    /* ── IŞIK YANSIMASI ──
       Zemin parçalarının ÜSTÜNE, EKRAN uzayında çizilen geniş bir
       aydınlık leke + kenarlarda hafif karartı.

       NEDEN EKRAN UZAYINDA: dünya uzayına konsaydı parça önbelleğini
       geçersiz kılardı ve kaydırırken ışık zeminle birlikte kayıp
       "leke" gibi görünürdü. Ekrana sabitlenince göz onu ışık kaynağı
       olarak okur, arazi deseni olarak değil.

       guc: 0 = kapalı. x/y: ekranın oranı (0-1), sol üst köşe 0,0.
       koseKarart: köşelerin kararma miktarı, hacim hissi verir. */
    yansima: {
      /* 0 = KAPALI. Beyaz radial parlama zeminin üstünü soluklaştırıyordu
         ("harita kaleiçine göre beyaz yoğun" belirtisi). Kaleiçi sahnesinde
         böyle bir katman yok; harita da onunla eşitlendi. */
      guc: 0.00,
      x: 0.735,
      y: 0.424,
      yaricap: 1.05,
      koseKarart: 0.00,
    },

    /* Geniş yumuşak ışık/gölge dalgası. 0 = kapalı. */
    isik: 0.32,

    /* ═══════════════════════════════════════════════════════════════
       BOYALI ZEMİN — referans oyundaki "elle boyanmış kar" görünümü
       ---------------------------------------------------------------
       NEDEN: eski yol (ışık + leke) sürekli bir gürültüyü renge
       çeviriyordu; sonuç her yerde biraz koyu, biraz açık bir
       "duman"dı. Referansta ise zemin BİRKAÇ DÜZ TONDAN oluşur:
       büyük, yumuşak kenarlı yığınlar üst üste biner ve her yığının
       ışığa bakan kenarı parlar, arkası hafif gölgelenir. Göz bunu
       "kar yığını" diye okur.

       NASIL:
         1. Yükseklik alanı: tek düşük frekanslı gürültü.
         2. Kademe: iki eşikte yumuşak smoothstep → 3 düz ton
            (alt / orta / üst). `yum` kenarın ne kadar yumuşak olduğu.
         3. Kabartı: aynı alan ışık yönünde biraz kaydırılıp
            çıkarılır → yığının bir kenarı parlar, öbürü gölgelenir.
            Görsel dosya yok, dikiş yok, her cihazda birebir aynı.
         4. İç ton: ton içinde çok hafif geçiş (fırça hissi).

       ALAN TÜM BİYOMLARDA ORTAK, yalnız PALET değişir. Böylece
       kar↔çimen↔lav sınırında yığınlar kesilmeden devam eder.

       GERİ DÖNÜŞ TEK SATIR: acik:false → eski ışık+leke yoluna döner
       (o kod silinmedi, aşağıda duruyor).
       NOT: acik iken çimen de bu yoldan boyanır, yani harita çimeni
       artık kaleiçi zeminiyle (kaleici.js) birebir aynı değil.
       ?zeminayar=1 panelinden canlı ayarlanır. */
    /* TELEFONDA ÖLÇÜLDÜ (?zeminayar=2 → KOPYALA):
       esik1 (0.10) < esik2 (0.34) → zemin artık ÜÇ tondan oluşuyor
       (alt/orta/üst), önceki ayarda esik1 = esik2 olduğu için orta
       ton hiç kullanılmıyordu.
       kabarti 0.27 → kenar parlaması/gölgesi AÇIK; dolayısıyla
       isikAci (0) ve kaydir (0.1) artık gerçekten iş yapıyor.
       icTon 0.80 → ton içi fırça geçişi en yumuşak ucunda.
       Bölge ayarlarında keskinlik 8: ton kenarı `yum`un sekizde
       birine iniyor, yani kenarlar çok keskin — yumuşaklık artık
       kenardan değil icTon'dan geliyor. */
    boya: {
      acik:    true,
      siklik:  0.090,   /* yığın boyu: küçük = iri yığın            */
      ayrinti: 0.19,    /* ikinci katmanın payı: kenar kıvrımı      */
      esik1:   0.10,    /* alt → orta tona geçiş                    */
      esik2:   0.34,    /* orta → üst tona geçiş                    */
      yum:     0.073,   /* kenar yumuşaklığı                        */
      kabarti: 0.27,    /* kenar parlaması / gölgesi gücü           */
      isikAci: 0,       /* ışığın geldiği yön, ızgara açısı         */
      kaydir:  0.1,     /* kabartı kaydırması, karo                 */
      icTon:   0.80,    /* ton içi fırça geçişi                     */
      /* Piksel döngüsünün çözünürlüğü (0.3-1). 1 = parçanın tam
         çözünürlüğü; düşürmek hızlandırır, kenarları yumuşatır. */
      kalite:  1,
      /* ── KAT ÇİZGİSİ (KONTUR) ──
         SORUN: ton kenarları eşikte keskin olsa da icTon her tonun
         İÇİNE ayrıca sürekli bir degrade bindiriyor; göz o yüzden
         katları değil tek bir yumuşak yıkama görüyor. Katın nerede
         bittiği belli olmuyordu.

         NE YAPAR: her eşiğin tam üstüne ince bir çizgi çizer —
         eşiğin ALTINDA gölge rengine, ÜSTÜNDE parlak renge doğru.
         Yani bir teras basamağı: altı koyu, üstü ışıklı. Harita
         konturu gibi okunur, kat sınırı ortaya çıkar.

         KAT: esik1/esik2 yalnız iki çizgi verir. `kat` > 0 ise
         aralara eşit aralıklı o kadar çizgi daha konur (n ekseninde
         (i+1)/(kat+1)), yani arazi kat kat teraslanır.

         MALİYETSİZ: hepsi renk tablosunda (LUT) pişiyor, piksel
         döngüsüne tek bir işlem bile eklemiyor.

         ÇÖZÜNÜRLÜK SINIRI: tablo kabartı açıkken 256 basamak, yani
         n ekseninde en küçük adım ~0.004. `en` bunun altına inerse
         çizgi basamaklanır; panelde alt sınır 0.004.
         ?zeminayar=4 → ÇİZGİ sekmesinden ayarlanır. */
      hat: {
        /* KAPALI: eşik çevresine binen koyu/parlak halka zemini
           çamurlu gösteriyordu, istenmedi. Motor duruyor, tek
           bayrakla geri gelir — ?zeminayar=4 başlığındaki
           ÇİZGİ AÇIK/KAPALI düğmesi. */
        acik:   false,
        en:     0.020,  /* çizginin yarı kalınlığı, n birimi        */
        koyu:   0.55,   /* eşiğin ALTINDA gölgeye çekme (0..1)      */
        parlak: 0.30,   /* eşiğin ÜSTÜNDE parlağa çekme (0..1)      */
        kat:    0,      /* esik1/esik2 dışında kaç ara çizgi        */
      },
      /* ── BÖLGE BAŞINA AYAR ──
         keskinlik: ton kenarının keskinliği, `yum`un BÖLENİ
           (1 = genel ayar, 3 = üç kat keskin, 0.5 = iki kat yumuşak).
         doygunluk: 1 = dokunma · canlilik: 0 = dokunma (soluk
           renkleri daha çok doyurur) · parlaklik: -0.5..0.5 ·
         kontrast: 1 = dokunma.
         Renk ayarları piksele değil PALETE uygulanır (maliyetsiz).
         desenOlcek: leke BOYU (sıklığın çarpanı, 1 = genel ayar;
           büyük = daha küçük/sık leke) · esikKay: koyu ton alanının
           kayması (eksi = zemin açılır, artı = koyulaşır).
         BU İKİSİ NEDEN VAR: üç biyom zaten ayrı gürültü alanından
         besleniyordu ama leke BOYU ve KOYULUK DAĞILIMI üçünde de
         aynıydı; aynı boy ve aynı ağırlıktaki lekeler sınırın iki
         yanında tek arazinin devamı gibi okunuyordu. Ölçülerin
         ayrılması ile her zeminin kendi çukur karakteri oluyor. */
      bolge: {
        kar:   { keskinlik: 8, doygunluk: 1.47, canlilik:  0.41, parlaklik:  0.16, kontrast: 0.77,
                 desenOlcek: 1.00, esikKay:  0.00 },
        cimen: { keskinlik: 8, doygunluk: 1.10, canlilik: -0.20, parlaklik: -0.23, kontrast: 0.97,
                 desenOlcek: 1.55, esikKay: -0.05 },
        lav:   { keskinlik: 8, doygunluk: 1.05, canlilik: -0.50, parlaklik: -0.24, kontrast: 0.88,
                 desenOlcek: 0.68, esikKay:  0.04 },
      },

      /* ── GEÇİŞ KIYISI ──
         İki zemin sınırda birbirine KOYU tonlarıyla dayanıyordu;
         sınır çamur gibi duruyordu. Artık sınırın iki yanında `en`
         dünya pikseli genişliğinde bir şerit, o pikselin KENDİ
         biyomunun PARLAK tonuna çekiliyor — her zemin kendi
         sınırını kendi açık rengiyle çiziyor.
         acik:false ya da guc:0 → eski hâl. */
      gecis: { acik: true, en: 34, guc: 0.52 },
      /* Palet: [gölge, alt, orta, üst, parlak] — RGB.
         Kar paleti referans AI görselinden örneklendi, biraz daha
         doyurularak (lila/sıcak). */
      palet: {
        kar:   [[140,146,196],[184,190,226],[206,206,234],[228,224,242],[250,244,250]],
        cimen: [[ 44,104, 52],[ 70,146, 60],[ 92,172, 70],[120,194, 84],[172,222,120]],
        /* Lav: parlak turuncu yerine "bölüm bölüm" bordo ve doygun
           kırmızı. Gölge ve alt ton panelde koyulaştırıldı (neredeyse
           siyah bordo), böylece lav alanı kar/çimenin yanında daha
           ağır duruyor. Parlak kenar turuncuya kaçmasın diye kırmızıda
           tutuldu — eskisi (226,128,78) alanı "parlıyor" gösteriyordu. */
        lav:   [[ 64,  0,  0],[122,  9,  9],[138, 26, 32],[174, 32, 32],[198, 62, 54]],
      },
    },

    /* ═══════════════════════════════════════════════════════════════
       RÖLYEF — BÜYÜK ÖLÇEKLİ YÜKSEKLİK VE YÖNLÜ IŞIK
       ---------------------------------------------------------------
       NEDEN: CFG.boya zemini üç düz tona ayırıyor ama harita yine de
       KÂĞIT GİBİ DÜZ duruyordu. Sebebi, boyanın gördüğü tek alanın
       yığın deseni olması: o desen küçük ölçekli, yani gözün "arazi
       yükseliyor" diye okuyacağı geniş bir eğim hiç yok.

       NE YAPAR: yığın deseninden BAĞIMSIZ, ÇOK DÜŞÜK frekanslı ikinci
       bir yükseklik alanı üretir (bir dalga boyu ~26 karo) ve zemini
       bu alanın EĞİMİNE göre aydınlatır. Işığa bakan geniş yamaçlar
       açılır, arka yüzler koyulaşır. Yığınlar yerinde kalır, üstlerine
       harita ölçeğinde bir ışık biner — 3B hissi buradan gelir.

       BOYA.KABARTI'DAN FARKI: kabarti, TON kenarında birkaç piksellik
       bir parlama/gölge (yığının kenarı). Rölyef ise onlarca karoluk
       yamaç. İkisi aynı anda açık olabilir, biri diğerinin yerine
       geçmez.

       BİYOM BAŞINA AYRI: kar, çimen ve lav için ÜÇ ayrı yükseklik
       alanı üretilir; piksel rengini hangi biyomdan alıyorsa
       gölgesini de onun alanından alır. Tek alan kullanıldığında bir
       çukur kar ile çimenin üstünden kesintisiz geçiyor, iki bölge
       aynı arazinin devamıymış gibi duruyordu. Alanlar birbirinden
       çok uzak başlangıç noktalarından üretildiği için desenleri
       ilgisizdir; sınırda gölge de renkle birlikte değişir.

       NASIL ÖLÇÜLÜR: eğim, yükseklik alanının ışık yönünde `kaydir`
       karo kaydırılmış değeriyle farkı alınarak bulunuyor. Merkezi
       farkla eğim hesaplamak yerine bu seçildi çünkü fark, tamponun
       çözünürlüğünden (CFG.zeminAdim) BAĞIMSIZ: aynı ayar her zoom
       kovasında aynı gölgeyi verir. Merkezi fark kullanılsaydı `guc`
       zoom'a göre değişirdi.

       MALİYET: piksel başına TEK bilineer örnek (gölge çarpanı alçak
       çözünürlükte pişirilir). Alan çok düşük frekanslı olduğu için
       alçak çözünürlükte örneklemek kayıpsız — FV ile aynı gerekçe.

       TELEFONDA ÖLÇÜLDÜ (?zeminayar=3 → KOPYALA): kaydir 1 karoya
       indirildi, yani yamaç gölgesi (guc) neredeyse kapalı; görünen
       kabartmanın büyük kısmı artık KAPALI ALAN'dan (ao 0.39)
       geliyor — tepeler açık, çukurlar koyu. Yönlü ışık şu an ince
       bir kenar vurgusu. Yamaç gölgesini geri istersen önce kaydir'i
       büyüt (6-18), guc'u sonra ayarla; kaydir küçükken guc'u
       yükseltmek yalnız gürültüyü sertleştirir.

       ?zeminayar=3 → kendi panelinden canlı ayarlanır. */
    rolyef: {
      /* KAPALI: geniş yamaç gölgesi zemini dalgalı/mermer damarlı
         gösteriyordu, istenmedi. Motor duruyor, tek bayrakla geri
         gelir — ?zeminayar=3 başlığındaki AÇIK/KAPALI düğmesi. */
      acik:    false,
      siklik:  0.038,  /* dalga boyu: küçük sayı = geniş tepeler      */
      ayrinti: 0.27,   /* ikinci katmanın payı: yamaçların kıvrımı    */
      isikAci: 337,    /* IŞIK YÖNÜ — EKRAN açısı, ızgara değil.
                          0 = sağdan, 90 = yukarıdan. boya.isikAci
                          ızgara açısıdır, ikisi aynı sayı değildir. */
      kaydir:  1,      /* eğim ölçüm mesafesi, karo                   */
      guc:     0.71,   /* yamaç ışığı/gölgesi şiddeti                 */
      ao:      0.39,   /* çukurları karart, tepeleri aç (kapalı alan) */
      tavan:   0.35,   /* en çok ±%35 parlaklık oynaması — GÜVENLİK
                          FRENİ. Bu ayarlarda 141x141'in tamamında bir
                          kez bile dayanmıyor (ölçüldü); tepe değerler
                          0.84..1.16 çarpanında kalıyor. Yalnız guc
                          veya ao panelden çok yükseltilirse devreye
                          girer ve rengin patlamasını engeller. */
    },

    /* ═══════════════════════════════════════════════════════════════
       ATMOSFER — sahnenin ORTAK IŞIĞI
       ---------------------------------------------------------------
       NEDEN VAR: zeminRengi() her pikseli KENDİ BAŞINA boyuyor. Biyom
       rengi + gürültü + doygunluk; hepsi yerel. Ortada sahnenin
       tamamına ait bir ışık yok, bu yüzden harita "boyanmış" duruyor,
       "aydınlatılmış" durmuyor. Kaleler de zemine yapıştırılmış gibi
       görünüyor — altlarında temas gölgesi yok.

       Bu blok üç şeyi ekler, üçü de AYRI AYRI kapatılabilir:
         golge  → her kalenin/düğümün altına yere yapışık elips
         vinyet → kenarlara doğru soğuyan/karararak derinleşen hava
         grade  → sahnenin tamamına tek bir ışık tonu (soft-light)

       CANLI AYAR: konsoldan değer değiştirip
         HARITA.atmosferUygula(); HARITA.cizUstIste();
       yazman yeter — sayfayı yenilemeye gerek yok.

       TAMAMEN KAPATMA: adresin sonuna ?atmos=0 ekle. Dosyaya
       dokunmadan eski görünüme döner; şüphelendiğinde ilk bakılacak
       yer burasıdır. */
    atmosfer: {
      acik: !/[?&]atmos=0/.test(location.search || ""),

      /* ── TEMAS GÖLGESİ ──
         Cismin zemine DEĞDİĞİ yerde koyu, uzaklaştıkça dağılan elips.
         Yuvarlak değil YASSI: izometride yer düzlemi ekranda 2:1
         eziktir, yuvarlak gölge cismi havada asılı gösterir.

         Eski `filter:drop-shadow` bunu YAPAMAZ — o, sprite'ın
         SİLUETİNİ kopyalayıp kaydırır; yani gölge de kule gibi dik
         durur. index.html'deki o satır kaldırıldı, yerine bu geldi. */
      golge: {
        /* İKİ AYRI GÜÇ, tek `guc` DEĞİL: kale gölgesi kapatıldı ama
           düğüm gölgesi duruyor. Tek anahtar olsaydı birini kapatmak
           öbürünü de söndürürdü. 0 = o taraf tamamen kapalı. */
        dugumGuc: 0.55,        /* kaynak arazisi + canavar (canvas) */
        kaleGuc:  0,           /* KALELER — KAPALI, istenerek.
                                  Kale sprite'larının kendi çizimlerinde
                                  zaten dipte koyu bir taban var; altına
                                  ikinci bir elips gelince gölge çift
                                  görünüyordu. Denemek istersen 0.55
                                  yaz, ölçüler aşağıda hazır duruyor. */
        renk: [3, 11, 26],     /* gölge lacivert; saf siyah ölü durur  */

        /* CANVAS DÜĞÜMLERİ (kaynak arazisi + canavar).
           Sayılar ÇARPANDIR: düğüm yarıçapı r ile çarpılır, böylece
           yakınlaştırmayla birlikte büyür. */
        dugumEn:  1.06,        /* elipsin yarı genişliği = r × bu */
        dugumBoy: 0.40,        /* elipsin yarı yüksekliği = r × bu */
        dugumDy:  0.70,        /* düğüm merkezinden aşağı kayma = r × bu */

        /* DOM KALELERİ. Sayılar .node-avatar kutusunun YÜZDESİ.
           Neden yüzde: kale kutusu seviyeye göre 132–252 px ve her
           seviyenin kendi dy kayması var (index.html). Yüzde yazılınca
           gölge o tabloyu OKUMADAN hepsine birden oturur — ikinci bir
           ölçü tablosu tutulmaz, yeni seviye eklenince düzeltme gerekmez.

           kaleY = 82.5 NEREDEN: kale görselleri 1024x683 ve
           object-fit:contain ile KARE kutuya oturuyor. Kutunun alt-üst
           %16.7'si boş kalıyor, resmin kendi alt boşluğu ise %0-1.
           Yani sprite'ın TABANI kutunun %83'ünde. Ölçüldü (5 görselin
           alfa sınırı: %82.6 – %83.4), ortalaması alındı. */
        kaleEn:   56,          /* elips genişliği = kutu eni × %       */
        kaleOran: 2.7,         /* genişlik / yükseklik (yassılık)      */
        kaleY:    83,          /* elips merkezi = kutu boyu × %        */
      },

      /* ── VİNYET: LOŞLUK + SOĞUK HAVA ──
         Referans oyunlardaki "loş" his PARLAMADAN değil KARARMADAN
         geliyor: merkez olduğu gibi kalır, kenarlar koyulaşıp maviye
         çalar. Göz bunu hacim diye okur.

         DİKKAT — bu katman EKRANA sabit, dünyaya değil. Dünyaya
         konsaydı kaydırırken zeminle birlikte kayar ve ışık değil
         "leke" gibi görünürdü. (Aynı sebeple CFG.yansima da ekran
         uzayındaydı; o beyaz parlamaydı ve zemini soluklaştırdığı
         için kapatılmıştı — bu onun tersi, karartma.)

         ic: bu orana kadar HİÇ dokunma. Küçültürsen karartma ortaya
         doğru sürünür ve harita kirli görünür. 0.40'ın altına inme. */
      vinyet: {
        /* KAPALI (0). Denendi ve ekranda bakılarak kapatıldı: grade
           katmanı sahneye zaten ortak bir ton veriyor, üstüne kenar
           karartması binince harita dar bir tünelden bakılıyormuş gibi
           duruyordu. Aşağıdaki ic/enX/enY/merkezY güc 0 iken HİÇBİR
           ŞEY YAPMAZ; açmak istersen guc'ü 0.4-0.6 arası dene. */
        guc:      0.00,        /* 0 = kapalı · en kenardaki koyuluk */
        renk:     "6,18,44",   /* R,G,B — gece mavisi               */
        ic:       0.25,        /* temiz merkezin yarıçapı (0-1)     */
        enX:      87,          /* elipsin genişliği, ekranın %'si   */
        enY:      68,          /* elipsin yüksekliği, ekranın %'si  */
        merkezY:  44,          /* elips merkezi, ekran boyunun %'si */
      },

      /* ── GRADE: SAHNENİN ORTAK IŞIĞI ──
         soft-light karıştırma: altındaki rengi EZMEZ, eğer. Açık
         yerleri biraz daha açar, koyu yerleri biraz daha koyar ve
         hepsini aynı tonun altına sokar. Düz bir renk katmanı
         (normal karışım) bunun yerine her şeyi soluklaştırırdı —
         "haritanın üstü beyaz" hatası tam olarak oydu.

         ust/alt: üstte serin gökyüzü ışığı, altta koyu zemin
         yansıması. İkisi arasındaki fark haritaya derinlik verir.

         kip: soft-light yerine "overlay" yazarsan kontrast sertleşir,
         "normal" yazarsan düz tül olur (önerilmez). */
      grade: {
        guc:      1,                          /* 0 = kapalı */
        kip:      "soft-light",
        ustRenk:  "rgba(128,186,255,.26)",
        altRenk:  "rgba(8,20,52,.34)",
      },

      /* ── ZEMİN TANESİ ──
         Zemin 10 dünya pikselinde bir örneklenip (zeminAdim) bilineer
         BÜYÜTÜLÜYOR. Yani en ince ayrıntı bile 10 px bulanık. Yakından
         bakınca arazi değil, yeşil bir duman gibi duruyor — "doku
         basit/çocuksu" hissinin asıl kaynağı bu.

         zeminAdim'i küçültmek doğru çözüm DEĞİL: örnek sayısı karesiyle
         artar (10→5 dört kat), her örnek ~10 gürültü çağrısı demek ve
         ilk kaydırmada telefon donar. Bunun yerine hazır bir TANE
         deseni parçanın üstüne tek fillRect ile basılıyor — maliyeti
         parça başına bir çağrı, görsel kazancı büyük.

         Desen DÜNYA uzayında: parçanın içine pişirildiği ve dünya
         koordinatına hizalandığı için kaydırırken zeminle birlikte
         gider, yakınlaştırınca zeminle birlikte büyür. Ekrana sabit
         olsaydı "kirli cam" gibi görünürdü.

         VARSAYILAN 0 — YANİ KAPALI. 0.22 ile denendi ve ekran
         "pürüzlü" göründüğü için kapatıldı: tane bulanıklığı
         kırıyordu ama telefonda kum kağıdı gibi duruyordu. Kod
         duruyor çünkü zeminin bulanıklığı hâlâ gerçek bir sorun ve
         doğru ayarı bulmak tek sayı meselesi — ?isik=1 panelindeki
         "Tane" sürgüsüyle canlı denenebilir. Kalıcı olarak istemezsen
         söyle, bloğu ve chunkUret'teki çağrıyı tamamen sileyim.

         guc: 0 = kapalı. 0.30 üstü kum kağıdı gibi olur.
         genlik: tanenin koyu/açık genliği (0-127).
         boy: desen karesinin dünya pikseli cinsinden eni. 16'ya
           bölünebilmeli — kaba katman 16'lık bloklardan üretiliyor,
           bölünmezse desenin eki dikiş olarak görünür. */
      doku: {
        guc:    0,
        genlik: 127,
        boy:    128,
      },
    },

    /* ── DESEN EKSENİ ──
       ESKİ HALİ: `lekeYatay: 2.4` — gürültü (gx-gy) ekseninde, yani
       ekranın YATAYINDA 2.4 kat eziliyordu. Gerekçesi "desen yuvarlak
       olursa harita dik bir duvar gibi görünür" idi; gerekçe doğru ama
       ÇARE FAZLAYDI ve hesap iki kez uygulanıyordu:

       İzometrik izdüşüm YATAY EZMEYİ ZATEN KENDİ YAPIYOR. Izgarada
       yuvarlak bir leke ekrana 2:1 yatık bir elips olarak düşer
       (gridToWorld: x=(gx-gy)·64, y=(gx+gy)·32). Üstüne bir de 2.4
       eklenince ekrandaki uzama ~4.8 kata çıkıyordu — leke değil,
       ekranı baştan başa kesen YATAY BANTLAR oluşuyordu. Referans
       oyunlarda ise arazi dokusu DERİNLİĞE, yani ekranda aşağı doğru
       gider.

       YENİ HALİ: yön bir açıyla seçiliyor, ızgara uzayında:
         45  = (gx+gy) → ekranda DÜZ AŞAĞI, derinlik yönü
          0  = gx ekseni → ekranda sağ-aşağı
         90  = gy ekseni → ekranda sol-aşağı
        135  = (gx-gy) → ekranda DÜZ YANA (eski davranış)

       uzat: o yöndeki uzama. 1 = yönsüz (ızgarada yuvarlak; ekranda
       izdüşümün kendi 2:1'i yine de uygular, yani zemin düz durur).
       3'ü aşma, yine bant olur.

       ?isik=1 panelinde "Desen açı / Desen uzat" ile canlı denenir. */
    /* ÖLÇÜLDÜ: 45/2.6 ile başlandı, ekranda 84/1.3'e getirildi.
       84 ≈ gy ekseni, yani desen ekranda SOL-AŞAĞI doğru, karo
       köşegenine yakın gidiyor. Uzatma 1.3'e inince şerit hissi
       kalkıyor; izdüşümün kendi 2:1'i zaten yeterli yatıklığı
       veriyor. */
    lekeAci:  84,
    lekeUzat: 1.3,

    /* ── DÜĞÜM ETİKETİ İNCE AYAR ──
       Kaynak/canavar düğümünün altındaki "kutucuk + isim" şeridi.
       Sayılar ÇARPANDIR, piksel değil: düğüm yarıçapı (r) zoom ile
       değiştiği için piksel yazılsaydı uzaklaşınca şerit düğümden
       kopardı. Tek istisna kutuDy — o punto cinsinden ince kaydırma.

       `?etiket=1` paneli bu kutuyu canlı sürüyor (tema.js). */
    etiket: {
      punto:   0.54,   /* yazı boyu = r × bu                       */
      yaziY:   1.33,   /* ismin düğüme uzaklığı = r × bu           */
      yaziX:  -0.02,   /* ismin yatay kayması = r × bu             */
      /* GÖRSEL ÖLÇÜSÜ YAZIYA BAĞLI DEĞİL — bilerek. Punto'ya
         bağlıyken yazıyı büyütmek kutucuğu da büyütüyordu, ikisi
         ayrı ayarlanamıyordu. İkisi de r (düğüm yarıçapı) üzerinden
         hesaplanır, yani birbirinden bağımsız ama zoom'la uyumlu. */
      kutuEn:  2.67,   /* görsel genişliği = r × bu                */
      kutuBoy: 1.34,   /* görsel yüksekliği = r × bu               */
      kutuDx: -0.69,   /* görsel–isim yatay boşluk = r × bu        */
      kutuDy: -0.26,   /* görselin dikey ince kayması = r × bu     */
    },

    /* Zemin kaç dünya pikselinde bir örneklenir. Küçültürsen daha
       ince detay ama daha yavaş pişirme. 8-16 arası mantıklı. */
    zeminAdim: 10,

    /* ── Chunk (parça) önbelleği ──
       CHUNK x CHUNK'lık bir bölge BİR KEZ boyanıp saklanır, sonra tek
       drawImage ile ekrana basılır. 8 = 64 karoluk parça; telefon
       belleğini zorlamayacak kadar küçük.

       onbellekBoyu: bellekte tutulacak parça sayısı. Artırırsan
       kaydırma daha akıcı ama RAM artar. */
    CHUNK: 8,
    /* ── KARE BAŞINA PİŞİRME BÜTÇESİ ──
       ÖLÇÜLDÜ (telefon, ?olcu=1): kareIste'nin karesi 12.8 saniyede
       99 kez koştu, TOPLAM 10994 ms — kare başına ortalama 111 ms,
       en kötüsü 1006 ms. Çizimin kendisi ucuz (masaüstünde sıcak
       önbellekte 11-16 ms); pahalı olan PARÇA PİŞİRME. Kaydırırken
       görüş alanına giren her yeni parça AYNI KAREDE pişiyordu, yani
       bir karede 5-6 parça = saniyelik donma.

       ARTIK: bir karede en çok `kareParca` parça pişer. Pişmemiş
       parçanın yerine o bölgenin düz biyom rengi basılır ve bir kare
       daha istenir — zemin birkaç kare içinde dolar, ekran donmaz.
       İş toplamı aynı, KAREYE YAYILDI.

       0 yazarsan eski davranış (hepsi tek karede) geri gelir. */
    kareParca: 1,
    /* Pişmemiş parçanın yerine basılan bulanık katmanın ölçeği.
       0 = kapalı (düz renk). Ayrıntı: ciz() içindeki KABA. */
    kabaOlcek: 0.35,
    onbellekBoyu: 48,
    /* Toplam piksel bütçesi (~4 bayt/piksel → 60e6 ≈ 240 MB üst sınır
       değil, TAVAN; normalde ekranda 4-8 parça dolaşır). */
    onbellekPiksel: 60e6,

    /* ── ZEMİN ÇÖZÜNÜRLÜĞÜ ──
       tavan: parça ölçeğinin üst sınırı. 1 = eski bulanık zemin,
         2 = dpr 2 telefonda zoom 1'e kadar tam net, 3 = yakınken de
         tam net. ÖLÇÜLDÜ: 2.5'te ilk çizim eski yolla aynı sürede
         (~150 ms masaüstü), 3'te ~%60 daha uzun. Yavaşsa 2'ye çek.
       carpan: gereken yoğunluğun çarpanı (1 = ekran pikseline eşit).
       ?zeminayar=2 → "Genel" sekmesinden canlı. */
    /* TAVAN 3 → 2 → 1 (ÖLÇÜLDÜ, İKİ TUR).
       Telefonda tavan 2 ile de kasıyordu: ?olcu=1 kaydırırken kare
       başına 120-180 ms gösterdi. Masaüstünde 60 karelik kaydırmanın
       TOPLAM maliyeti:
         tavan 2 → 1331 ms (en kötü kare 759, ortanca 8)
         tavan 1 →  105 ms (en kötü kare  10, ortanca 0)
       12 kat. Üç sebep birden düzeliyor:
         · Parça pikseli ölçeğin karesiyle artar: 2 → 1, dörtte bir.
         · Tek ölçek kovası kalır (s hep 1); parçalar birbirini atıp
           yeniden pişmez, tarayıcı tuvalleri yeniden yüklemez —
           arada gelen 800 ms'lik drawImage sıçraması da buradan
           geliyordu.
         · Kaba katman devreye girmez (kabaVar = s > 1), yani hızlı
           kaydırırken "harita bozuluyor" diye görülen iki katmanlı
           geçiş ortadan kalkar.
       BEDELİ: zemin dpr 2 telefonda dünya pikselinde pişip
       büyütülüyor, yani bir tık yumuşak. Zemin zaten yumuşak boyalı
       bir yüzey olduğu için kabul edildi. Keskinlik istenirse tek
       sayı: tavan 2.

       ESKİ NOT (tavan 3 → 2): tavan 3'te kaydırma sırasında kareler
       tekrar tekrar 155-309 ms'ye çıkıyordu; 2'de en kötü ikinci ve
       üçüncü kare 11 ms, ortanca 5 ms (aynı 40 karelik kaydırma
       ölçümü). İki sebep: (1) parça pikseli ölçeğin KARESİYLE artar,
       3 → 2 piksel sayısını 2.25 kat azaltır; (2) her ölçek kovası
       ayrı önbellek anahtarıdır, tavan yükseldikçe kova sayısı artar
       ve parçalar birbirini atıp yeniden pişmeye başlar.
       Bedeli: en yakın zoom'da zemin bir tık yumuşak. */
    zeminHD: { tavan: 1, carpan: 1 },

    /* Eski düz-renk yedeği. Zemin artık zeminRenk'ten boyandığı için
       KULLANILMIYOR; düğüm/kale kodu okuyor olabilir diye duruyor. */
    karoRenk: {
      kar:   "#cfe4f2",
      cimen: "#5f9e4a",
      lav:   "#8c3126",
    },

    /* ── Hata ayıklama ──
       fpsGoster: sol üstteki "60 fps · 1024 karo · 5 düğüm" rozeti.
       Kapalı; adres sonuna ?fps=1 eklersen o oturumda açılır, yani
       performans şüphesinde dosyaya dokunmadan bakabilirsin. */
    fpsGoster: /[?&]fps=1/.test(location.search || ""),
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

  /* PAY: parça canvas'ının her yanına eklenen boşluk (dünya pikseli).
     Komşu parçalar arasında saç teli boşluk kalmasın diye. */
  const PAY = 1;

  /* ═════════════════════════════════════════════════════════════════════
     ZEMİN TANESİ DESENİ

     BİR KEZ üretilen, kendi kendine EKLENEBİLEN (seamless) gri bir
     kare. Parçanın üstüne "overlay" ile basılır: gri 128 hiçbir şey
     yapmaz, koyusu karartır, açığı aydınlatır. Yani zeminin RENGİNİ
     bozmaz, yalnız ona tane verir.

     DİKİŞSİZLİK NASIL SAĞLANIYOR: kaba katmanlar küçük bir NxN
     ızgaradan yumuşatılarak büyütülüyor ve ızgara komşusu aranırken
     (x+1) YERİNE (x+1) % N okunuyor. Yani desenin sağ kenarı sol
     kenarıyla, alt kenarı üst kenarıyla matematiksel olarak sürekli.
     Bu sarmalama olmasaydı desenin eki ince bir çizgi olarak görünür,
     harita satranç tahtasına dönerdi.

     İLK DENEMEDE BLOK KULLANILMIŞTI (her piksel kendi 16'lık bloğunun
     değerini okuyordu). Dikişsizdi ama gözle görülür bir MOZAİK
     çıkardı — 16 pikselin tamamı aynı tonda kalıyordu. Süzme şart;
     dikişi de sarmalama çözüyor. Blok yaklaşımına dönme.

     Üç katman NİYE: tek piksellik saf gürültü televizyon karıncası
     gibi durur. Geniş katman lekeyi, orta katman tane öbeğini, tek
     piksellik katman da keskinliği verir. Üçü toplanınca göz bunu
     arazi dokusu diye okur. */
  let _dokuDesen = null;
  let _dokuImza  = null;   /* atmosferUygula bununla gereksiz pişirmeyi eler */

  /* NxN'lik rastgele ızgaradan PxP'lik YUMUŞAK ve SARMALANAN alan.
     Dönen değerler -0.5 … +0.5. */
  function sarmalGurultu(P, N) {
    const g = new Float32Array(N * N);
    for (let i = 0; i < g.length; i++) g[i] = Math.random() - 0.5;

    const out = new Float32Array(P * P);
    const olcek = N / P;
    for (let y = 0; y < P; y++) {
      const fy = y * olcek;
      const y0 = fy | 0, y1 = (y0 + 1) % N;
      const ty = fy - y0, sy = ty * ty * (3 - 2 * ty);   /* smoothstep */
      for (let x = 0; x < P; x++) {
        const fx = x * olcek;
        const x0 = fx | 0, x1 = (x0 + 1) % N;
        const tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
        const ust = g[y0 * N + x0] + (g[y0 * N + x1] - g[y0 * N + x0]) * sx;
        const alt = g[y1 * N + x0] + (g[y1 * N + x1] - g[y1 * N + x0]) * sx;
        out[y * P + x] = ust + (alt - ust) * sy;
      }
    }
    return out;
  }

  function dokuKaresi() {
    if (_dokuDesen) return _dokuDesen;
    const D = CFG.atmosfer.doku;
    const P = Math.max(16, D.boy | 0);
    const A = Math.max(0, Math.min(127, D.genlik));

    const cv2 = document.createElement("canvas");
    cv2.width = cv2.height = P;
    const c = cv2.getContext("2d");
    const im = c.createImageData(P, P);
    const px = im.data;

    const kaba = sarmalGurultu(P, Math.max(2, P >> 4));   /* geniş leke */
    const orta = sarmalGurultu(P, Math.max(4, P >> 2));   /* tane öbeği */

    for (let i = 0, n = P * P; i < n; i++) {
      /* Kaba katmanların genliği düşük tutuluyor: yüksek olsaydı tane
         değil, zeminin üstüne serilmiş ikinci bir leke katmanı olurdu
         — zaten CFG.leke o işi yapıyor. Buranın işi KESKİNLİK. */
      const v = kaba[i] * 0.34 + orta[i] * 0.34 + (Math.random() - 0.5) * 0.32;
      const g = Math.max(0, Math.min(255, 128 + v * 2 * A));
      const k = i * 4;
      px[k] = px[k + 1] = px[k + 2] = g;
      px[k + 3] = 255;
    }
    c.putImageData(im, 0, 0);
    _dokuDesen = { cv: cv2, P };
    return _dokuDesen;
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

  /* ── İKİ AYRI CANVAS ──
     ZEMİN (cv): pahalı ama NADİREN değişir — yalnız kaydırma,
       yakınlaştırma ve pencere boyu değişince yeniden çizilir.
     ÜST KATMAN (uv): ucuz ama SIK değişir — düğümler, sefer
       yolları, akan kesik çizgi. Saniyede 60 kez çizilebilir.

     NEDEN AYRI: ilk denemede ikisi tek canvas'taydı. Yürüyen bir
     ordunun çizgisini oynatmak, her karede BÜTÜN ZEMİNİ yeniden
     çizdiriyordu — 1024 karoda kare hızı 6'ya düştü. Zemin sabit
     durunca aynı animasyon neredeyse bedava. */
  let uv = null, uctx = null;
  let ustIstendi = false, ustDonguId = null;

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

    /* Üst katman zeminin ÜSTÜNDE, DOM düğümlerin (kaleler) ALTINDA.
       #battleMap z-index:5 olduğu için 1 uygun. */
    uv = document.createElement("canvas");
    uv.id = "isoUst";
    uv.style.cssText =
      "position:absolute; inset:0; width:100%; height:100%; " +
      "display:block; pointer-events:none; z-index:1;";
    scroll.insertBefore(uv, mapEl);

    ctx  = cv.getContext("2d", { alpha: false });
    uctx = uv.getContext("2d");           /* saydam olmalı */
    boyutlandir();
    return true;
  }

  function boyutlandir() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;

    const eskiDpr = dpr;
    dpr = Math.min(window.devicePixelRatio || 1, 2);  // 3x'te bellek boşuna şişiyor
    cv.width  = Math.round(r.width  * dpr);
    cv.height = Math.round(r.height * dpr);
    if (uv) { uv.width = cv.width; uv.height = cv.height; }

    /* ── DPR DEĞİŞTİYSE PARÇA ÖNBELLEĞİ ÇÖPE ────────────────────
       Parçaların çözünürlüğü olcekKovasi(zoom) ile seçiliyor ve o
       hesap `dpr`yi kullanıyor. dpr burada değişiyor ama önbellek
       DOKUNULMADAN duruyordu: eski dpr ile pişmiş parçalar yeni
       ölçekte ekrana gerilip BULANIK çıkıyordu.

       İlk açılışta dpr 1 ile başlıyor; canvas yerleşene kadar
       çizilen parçalar 1x pişiyor, sonra dpr 2 oluyor ve o bulanık
       parçalar önbellekte kalıyor. Belirtisi şuydu: harita düz
       girişte yumuşak/bulanık, ?zeminayar=1 ile girince net —
       çünkü panel açılışta onbellegiBosalt() çağırıp hepsini
       yeniden pişirtiyordu. Panelin "düzeltmesi" bu yan etkiydi.

       Aynı şey telefon döndürüldüğünde ve pencere boyu
       değiştiğinde de geçerli. */
    if (eskiDpr !== dpr) onbellegiBosalt();

    ciz();
    cizUst();
  }

  /* ═════════════════════════════════════════════════════════════════════
     ÇİZİM — CULLING BURADA

     20.000 karonun tamamı ASLA çizilmez. Ekranda görünen dünya
     dikdörtgeninin dört köşesi ızgara koordinatına çevrilir, sadece o
     aralık taranır. Bu yüzden maliyet harita boyutundan bağımsızdır:
     141x141 ile 500x500 aynı hızda çalışır.
     ═════════════════════════════════════════════════════════════════════ */

  let sonKare = 0, fps = 0, fpsSayac = 0, fpsZaman = 0;
  let sonCizilenKaro = 0;
  let kurtarmaKilidi = false;

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

  /* ── ÖLÇEK KOVASI ──
     ESKİ: zoom > 1.2 ? 2 : 1 — ekranın piksel yoğunluğunu (dpr)
     hesaba katmıyordu. dpr 2'li telefonda zoom 1'de her parça pikseli
     ekranda 2×2 piksele gerilip bulanık duruyordu ("harita 480p"
     şikâyeti). Şimdi ekranda GEREKEN yoğunluk (zoom × dpr) hesaplanıp
     yarımlık adımlara yuvarlanıyor, CFG.zeminHD.tavan ile sınırlı.
     Tavan 1 yapılırsa eski düşük çözünürlüğe döner (yavaş telefon). */
  function olcekKovasi(zoom) {
    const H = CFG.zeminHD || {};
    const gerek = zoom * (dpr || 1) * (H.carpan || 1);
    const tavan = Math.max(1, H.tavan || 2);
    return Math.max(1, Math.min(tavan, Math.ceil(gerek * 2 - 0.3) / 2));
  }

  /* Yüksek ölçekte parça küçülür: aynı karo sayısında piksel sayısı
     ölçeğin karesiyle büyüyor, küçük parça hem ilk çizimi hızlı
     tutar hem de ekran dışında boşuna piksel üretmez. */
  function chunkBoyu(s) { return s >= 2 ? Math.max(2, CFG.CHUNK >> 1) : CFG.CHUNK; }

  let onbellekPiksel = 0;

  function chunkAl(cx, cy, s) {
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
    onbellekPiksel += par.px || 0;

    /* Bellek sınırı: hem parça SAYISI hem toplam PİKSEL. Yüksek
       çözünürlükte tek parça 8-10 milyon piksel olabiliyor; yalnız
       sayıya bakılsaydı telefon belleği şişerdi. */
    const butce = CFG.onbellekPiksel || 60e6;
    while (onbellek.size > 1 &&
           (onbellek.size > CFG.onbellekBoyu || onbellekPiksel > butce)) {
      const ilk = onbellek.keys().next().value;
      onbellekPiksel -= onbellek.get(ilk).px || 0;
      onbellek.delete(ilk);
    }
    return par;
  }

  /* ── ZEMİN RENGİ ──────────────────────────────────────────────────
     Bir dünya noktasının rengini döndürür. Doku yok; renk üç
     katmandan doğar:
       1. Biyom rengi   — biyomDeger'den, sınırlarda yumuşak karışım
       2. Leke          — aynı rengin koyu/açık parçaları (orta frekans)
       3. Işık          — geniş, yumuşak aydınlık/gölge dalgası
     Üçü de tohumlu gürültüden gelir → her cihazda birebir aynı. */

  function renkKaris(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t];
  }
  function renkAc(c, t)  { return [c[0] + (255 - c[0]) * t,
                                   c[1] + (255 - c[1]) * t,
                                   c[2] + (255 - c[2]) * t]; }
  function renkKoy(c, t) { return [c[0] * (1 - t), c[1] * (1 - t), c[2] * (1 - t)]; }
  function yumusat(t)    { return t * t * (3 - 2 * t); }

  /* ── SERPME SAPMASI ──
     Biyom değerine eklenen ince gürültü. Sınır bandı dar tutulduğu
     için bu sapma, sınırı "kaydırmak" yerine ONU BENEKLERE AYIRIR.
     Ham ızgara koordinatında örneklenir, lekeEkseni'nden GEÇMEZ:
     benekler karo ölçüsünde kalsın, yöne göre uzayıp şeride
     dönüşmesin. */
  function serpmeSapma(gx, gy) {
    const S = CFG.serpme;
    if (!S || S.genislik <= 0) return 0;
    const p = S.pay;
    const n = smoothNoise(gx * S.kaba + 613, gy * S.kaba + 271) * p[0]
            + smoothNoise(gx * S.orta +  97, gy * S.orta + 149) * p[1]
            + smoothNoise(gx * S.ince + 331, gy * S.ince +  59) * p[2];
    return (n - 0.5) * S.genislik;
  }

  /* Biyom ağırlıkları [kar, cimen, lav] — toplamı 1.
     Sınır bandında iki biyom karışır. Hem RENK hem LEKE AYARI aynı
     ağırlıkla harmanlanır; yoksa sınırda leke karakteri zıplar. */
  function biyomAgirlik(v) {
    const b = CFG.gecisBandi;
    if (v > CFG.esikKar - b && v < CFG.esikKar + b) {
      const t = yumusat((v - (CFG.esikKar - b)) / (2 * b));
      return [1 - t, t, 0];
    }
    if (v > CFG.esikCimen - b && v < CFG.esikCimen + b) {
      const t = yumusat((v - (CFG.esikCimen - b)) / (2 * b));
      return [0, 1 - t, t];
    }
    if (v < CFG.esikKar)   return [1, 0, 0];
    if (v < CFG.esikCimen) return [0, 1, 0];
    return [0, 0, 1];
  }

  /* ── KALEİÇİ ÇİMENİ ──
     kaleici.js'teki kara zemin hesabının birebir aynısı, harita'nın
     kendi gürültü fonksiyonuyla (smoothNoise) — dikiş ve önbellek
     uyumu bozulmasın diye. Yalnız çimen için çağrılır. */
  /* ── DESEN EKSENİ ──
     Izgara hücresini, desenin uzayacağı yöne göre döndürülmüş bir
     (u,v) çerçevesine taşır. u = uzama yönü (bu yüzden BÖLÜNÜR:
     örnek koordinatı sıkışınca desen o yönde UZAR), v = ona dik yön.

     KOK2 çarpanı: (gx±gy) biçimindeki eski eksenler ham gx,gy'ye göre
     √2 uzundu. Çarpan olmasaydı yeni eksen aynı sayılarla ~%40 daha
     iri desen üretir, CFG'deki bütün frekanslar yeniden ayarlanmak
     zorunda kalırdı. Eski ölçeği korur.

     İKİ ÇAĞIRAN VAR (cimenKaleRengi ve zeminRengi) — hesap tek yerde
     durmalı, yoksa çimen ile kar/lav ayrı yönlere bakar ve sınırda
     desen kırılır. */
  const KOK2 = Math.SQRT2;
  let _ekAci = null, _ekCos = 1, _ekSin = 0;

  function lekeEkseni(gx, gy, f) {
    if (_ekAci !== CFG.lekeAci) {         /* cos/sin piksel başına değil */
      _ekAci = CFG.lekeAci;
      const r = _ekAci * Math.PI / 180;
      _ekCos = Math.cos(r); _ekSin = Math.sin(r);
    }
    const uzat = CFG.lekeUzat > 0.01 ? CFG.lekeUzat : 1;
    const k = KOK2 * (f || 1);
    return {
      u: ( gx * _ekCos + gy * _ekSin) * k / uzat,
      v: (-gx * _ekSin + gy * _ekCos) * k,
    };
  }

  function cimenKaleRengi(gx, gy) {
    const Z = CFG.cimenKale;
    let c = [Z.renk[0], Z.renk[1], Z.renk[2]];

    const e  = lekeEkseni(gx, gy, Z.siklik);
    const eu = e.u, ev = e.v;

    if (Z.isik > 0) {
      const sh = smoothNoise(eu * 0.075 + 41, ev * 0.075 + 17) * 0.65
               + smoothNoise(eu * 0.022 + 5,  ev * 0.022 + 29) * 0.35;
      const t = (sh - 0.5) * 1.35 * Z.isik * 1.8;
      c = t < 0 ? renkKaris(c, renkKoy(c, 0.52), Math.min(0.70, -t))
                : renkKaris(c, [255, 255, 255], Math.min(0.28, t * 0.50));
    }

    let pk = smoothNoise(eu * 0.070 + 77, ev * 0.070 + 13) * 0.50
           + smoothNoise(eu * 0.175 + 5,  ev * 0.175 + 91) * 0.32
           + smoothNoise(eu * 0.430 + 31, ev * 0.430 + 53) * 0.18;
    pk = yumusat(pk);
    pk = pk * 0.68 + (Math.round(pk * 3) / 3) * 0.32;
    const pt = (pk - 0.5) * 2;
    if (pt < 0) c = renkKaris(c, renkKoy(Z.renk, 0.46), Math.min(1, -pt * Z.koyu * 2.2));
    else        c = renkKaris(c, renkAc(c, 0.42),       Math.min(1,  pt * Z.acik * 2.2));

    const d = Z.doygunluk;
    if (d !== 1) {
      const orta = (c[0] + c[1] + c[2]) / 3;
      c = [Math.max(0, Math.min(255, orta + (c[0] - orta) * d)),
           Math.max(0, Math.min(255, orta + (c[1] - orta) * d)),
           Math.max(0, Math.min(255, orta + (c[2] - orta) * d))];
    }
    return c;
  }

  /* ── BOYALI ZEMİN ──────────────────────────────────────────────────
     Ayrıntı ve neden: CFG.boya'nın başında. Yükseklik alanı biyomdan
     BAĞIMSIZ (tek hesap), palet biyom ağırlığıyla karışır — sınır
     bandında yığınlar kesilmez, yalnız renkleri kayar. */
  function kademe(a, b, x) {
    if (x <= a) return 0;
    if (x >= b) return 1;
    const t = (x - a) / (b - a);
    return t * t * (3 - 2 * t);
  }

  /* Boya yükseklik alanının HAM değeri (0..1). Eşikleme ve renk
     BURADA YAPILMAZ — chunkUretBoya bu sayıyı alçak çözünürlükte
     örnekler, çözünürlük yükseltildikten SONRA eşikler. Keskinliğin
     sırrı bu sıra (aşağıda "NEDEN ALAN, RENK DEĞİL"). */
  /* olc: BİYOM BAŞINA DESEN ÖLÇEĞİ (bkz. CFG.boya.bolge.*.desenOlcek).
     Sıklığı çarpar: 1'den büyük = daha küçük/sık leke. Üç biyom
     yalnız başlangıç noktasıyla ayrılınca desenler ilgisiz oluyordu
     ama BOYLARI aynı kalıyordu; göz aynı boy lekeyi tek arazinin
     devamı diye okuyor. Ölçek de ayrılınca her zeminin kendi leke
     boyu oluyor. */
  function boyaGurultu(gx, gy, olc) {
    const B = CFG.boya, f = B.siklik * (olc || 1);
    const e = lekeEkseni(gx, gy, 1);
    return smoothNoise(e.u * f + 151,      e.v * f + 307)      * (1 - B.ayrinti)
         + smoothNoise(e.u * f * 2.7 + 19, e.v * f * 2.7 + 83) * B.ayrinti;
  }

  /* Rölyef yükseklik alanı (0..1). Ayrıntı ve neden: CFG.rolyef.
     lekeEkseni KULLANILMAZ — o eksen yığın desenini biyom yönünde
     uzatmak için var; rölyefin tepeleri uzatılırsa arazi taranmış
     gibi çizgilenir (denendi). Burada ham ızgara ekseni kullanılıyor,
     tepeler her yöne eşit yayılıyor. */
  function rolyefYuksek(gx, gy) {
    const R = CFG.rolyef, f = R.siklik, a2 = R.ayrinti || 0;
    return smoothNoise(gx * f + 911, gy * f + 577) * (1 - a2)
         + smoothNoise(gx * f * 2.3 + 433, gy * f * 2.3 + 199) * a2;
  }

  /* ── BÖLGE BAŞINA RENK AYARI ──
     Doygunluk / canlılık / parlaklık / kontrast pikselde değil
     PALETTE uygulanır: piksel rengi zaten paletin karışımı olduğu
     için sonuç aynıdır, maliyet parça başına 15 renk. Dönen dizi:
     [biyom(3)][ton(5)][kanal(3)] düz Float32Array. */
  const BIYOM_AD = ["kar", "cimen", "lav"];
  function paletHazirla() {
    const B = CFG.boya, P = B.palet, out = new Float32Array(45);
    for (let b = 0; b < 3; b++) {
      const ad = BIYOM_AD[b];
      const Z = (B.bolge && B.bolge[ad]) || {};
      const par = Z.parlaklik || 0, kon = Z.kontrast == null ? 1 : Z.kontrast;
      const doy = Z.doygunluk == null ? 1 : Z.doygunluk, can = Z.canlilik || 0;
      for (let t = 0; t < 5; t++) {
        let r = P[ad][t][0], g = P[ad][t][1], bl = P[ad][t][2];
        r += par * 255; g += par * 255; bl += par * 255;
        r = 128 + (r - 128) * kon; g = 128 + (g - 128) * kon; bl = 128 + (bl - 128) * kon;
        let o = (r + g + bl) / 3;
        r = o + (r - o) * doy; g = o + (g - o) * doy; bl = o + (bl - o) * doy;
        /* Canlılık: soluk renkleri çok, zaten doygun olanları az doyurur */
        if (can) {
          o = (r + g + bl) / 3;
          const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
          const sat = mx > 0 ? (mx - mn) / mx : 0;
          const k = 1 + can * (1 - sat);
          r = o + (r - o) * k; g = o + (g - o) * k; bl = o + (bl - o) * k;
        }
        const i = (b * 5 + t) * 3;
        out[i]     = Math.max(0, Math.min(255, r));
        out[i + 1] = Math.max(0, Math.min(255, g));
        out[i + 2] = Math.max(0, Math.min(255, bl));
      }
    }
    return out;
  }

  function zeminRengi(gx, gy) {
    const R = CFG.zeminRenk, A = CFG.lekeAyar;
    /* Serpme YALNIZ boyamada. biyom()/biyomKarisim() ham değeri
       okumaya devam eder — kale/düğüm arazisi kaymasın. */
    const v = biyomDeger(gx, gy) + serpmeSapma(gx, gy);
    const w = biyomAgirlik(v);

    /* Saf çimen: kar/lav hesabına hiç girme */
    if (w[1] >= 0.999) return cimenKaleRengi(gx, gy);

    /* 1. Biyom rengi */
    let c = [
      R.kar[0] * w[0] + R.cimen[0] * w[1] + R.lav[0] * w[2],
      R.kar[1] * w[0] + R.cimen[1] * w[1] + R.lav[1] * w[2],
      R.kar[2] * w[0] + R.cimen[2] * w[1] + R.lav[2] * w[2],
    ];

    /* ── DESEN EKSENİ ──
       eu = desenin UZADIĞI yön, ev = ona dik yön. Yönü CFG.lekeAci
       belirler (varsayılan 84° ≈ gy ekseni = ekranda sol-aşağı).
       Ayrıntı ve eski "yatay ezme" hikâyesi CFG.lekeAci'nin başında. */
    const e  = lekeEkseni(gx, gy, 1);
    const eu = e.u, ev = e.v;

    /* 2. Işık — geniş, yumuşak dalga */
    if (CFG.isik > 0) {
      const sh = smoothNoise(eu * 0.075 + 41, ev * 0.075 + 17) * 0.65
               + smoothNoise(eu * 0.022 + 5,  ev * 0.022 + 29) * 0.35;
      const t = (sh - 0.5) * 1.35 * CFG.isik * 1.8;
      c = t < 0 ? renkKaris(c, renkKoy(c, 0.52), Math.min(0.70, -t))
                : renkKaris(c, [255, 255, 255], Math.min(0.28, t * 0.50));
    }

    /* 3. Leke — parça parça koyu/açık, bölgeye göre karakter */
    if (CFG.leke > 0) {
      let pk = smoothNoise(eu * 0.070 + 77, ev * 0.070 + 13) * 0.50
             + smoothNoise(eu * 0.175 + 5,  ev * 0.175 + 91) * 0.32
             + smoothNoise(eu * 0.430 + 31, ev * 0.430 + 53) * 0.18;
      pk = yumusat(pk);
      /* Kısmi basamaklama: "parça" olarak okunsun, düz gradyan olmasın */
      pk = pk * 0.68 + (Math.round(pk * 3) / 3) * 0.32;

      const pt = (pk - 0.5) * 2;

      if (pt < 0) {
        const g = A.kar.koyu * w[0] + A.cimen.koyu * w[1] + A.lav.koyu * w[2];
        /* Koyu hedef: kar turkuaza, diğerleri kendi renginin koyusuna */
        const kk = CFG.karGolgeRenk;
        const kc = renkKoy(R.cimen, 0.46);
        const kl = renkKoy(R.lav,   0.52);
        const hedef = [
          kk[0] * w[0] + kc[0] * w[1] + kl[0] * w[2],
          kk[1] * w[0] + kc[1] * w[1] + kl[1] * w[2],
          kk[2] * w[0] + kc[2] * w[1] + kl[2] * w[2],
        ];
        c = renkKaris(c, hedef, Math.min(1, -pt * g * CFG.leke * 2.2));
      } else {
        const g = A.kar.acik * w[0] + A.cimen.acik * w[1] + A.lav.acik * w[2];
        c = renkKaris(c, renkAc(c, 0.42), Math.min(1, pt * g * CFG.leke * 2.2));
      }
    }

    /* 4. Doygunluk — gri eksenden UZAKLAŞTIRMA.
       Parlaklık (üç kanalın ortalaması) sabit kalır, yalnız kanal
       farkları büyür. Böylece ışık ve gölge dengesi bozulmaz, renk
       canlanır. Kırpma şart: doygunluk 1'in üstündeyken kanal
       0-255 dışına taşabilir ve taşan kanal renk atlatır. */
    /* Lav payı kadar doygunlukLav'a kayılır; w[2]=0 ise saf
       CFG.doygunluk, w[2]=1 ise saf CFG.doygunlukLav. */
    const d = CFG.doygunluk + (CFG.doygunlukLav - CFG.doygunluk) * w[2];
    if (d !== 1) {
      const orta = (c[0] + c[1] + c[2]) / 3;
      c = [
        Math.max(0, Math.min(255, orta + (c[0] - orta) * d)),
        Math.max(0, Math.min(255, orta + (c[1] - orta) * d)),
        Math.max(0, Math.min(255, orta + (c[2] - orta) * d)),
      ];
    }

    /* Sınır bandı: çimen payı kadar kaleiçi çimeni karıştır.
       w[1] = 0 ise saf kar/lav, 1 ise yukarıda zaten dönmüştük. */
    if (w[1] > 0.001) c = renkKaris(c, cimenKaleRengi(gx, gy), w[1]);

    return c;
  }

  /* ── PARÇA ÜRETİMİ ────────────────────────────────────────────────
     Eskiden burada karo karo doku basılıyordu. Artık parçanın dünya
     dikdörtgeni ALÇAK ÇÖZÜNÜRLÜKTE boyanıp yumuşatılarak büyütülüyor.

     NEDEN alçak çözünürlük: her ekran pikseli için gürültü hesaplamak
     telefonda pahalı. zeminAdim dünya pikselinde bir örnek alınıp
     bilineer büyütülüyor — zaten yumuşak bir alan olduğu için fark
     edilmiyor, maliyet ~100 kat düşüyor.

     KENAR PAYI: tampon her yanda 1 hücre TAŞKIN örnekleniyor. Yoksa
     büyütme sırasında komşu parçanın kenarıyla arasında ince çizgi
     kalıyordu (bilineer, sınırdaki pikselin komşusunu bulamıyor). */
  function chunkUret(cx, cy, s) {
    const C  = chunkBoyu(s);
    const tw = CFG.tileW, th = CFG.tileH;

    const gx0 = cx * C, gx1 = gx0 + C - 1;
    const gy0 = cy * C, gy1 = gy0 + C - 1;

    const minX = gridToWorld(gx0, gy1).x - PAY;
    const maxX = gridToWorld(gx1, gy0).x + tw + PAY;
    const minY = gridToWorld(gx0, gy0).y - PAY;
    const maxY = gridToWorld(gx1, gy1).y + th + PAY;

    const w = maxX - minX, h = maxY - minY;

    /* Boyalı zemin kendi yolundan gider (alan örnekle → keskin boya) */
    const c2 = document.createElement("canvas");
    c2.width  = Math.ceil(w * s);
    c2.height = Math.ceil(h * s);
    const x2  = c2.getContext("2d");
    x2.imageSmoothingEnabled = true;
    x2.imageSmoothingQuality = "high";

    if (CFG.boya && CFG.boya.acik) {
      chunkUretBoya(x2, minX, minY, w, h, s);
      x2.setTransform(s, 0, 0, s, 0, 0);
    } else {
      chunkUretEski(x2, minX, minY, w, h, s);
    }

    tamamla(x2, minX, minY, w, h, s, gx0, gx1, gy0, gy1, tw, th);
    return { cv: c2, x: minX, y: minY, w, h, px: c2.width * c2.height };
  }

  /* ── ESKİ YOL (CFG.boya.acik = false) ──
     Renk alçak çözünürlükte hesaplanıp BÜYÜTÜLÜR. Geri dönüş için
     duruyor; boyalı zeminde kullanılmaz. */
  function chunkUretEski(x2, minX, minY, w, h, s) {
    /* ── alçak çözünürlüklü tampon ── */
    const A  = Math.max(4, CFG.zeminAdim);
    const LW = Math.ceil(w / A), LH = Math.ceil(h / A);

    const lo   = document.createElement("canvas");
    lo.width   = LW + 2;
    lo.height  = LH + 2;
    const lx   = lo.getContext("2d");
    const veri = lx.createImageData(LW + 2, LH + 2);
    const p    = veri.data;

    for (let j = 0; j < LH + 2; j++) {
      const wy = minY + (j - 1 + 0.5) * A;
      for (let i = 0; i < LW + 2; i++) {
        const wx = minX + (i - 1 + 0.5) * A;
        const g  = worldToGrid(wx, wy);
        const c  = zeminRengi(g.gx, g.gy);
        const k  = (j * (LW + 2) + i) * 4;
        p[k]     = c[0];
        p[k + 1] = c[1];
        p[k + 2] = c[2];
        p[k + 3] = 255;
      }
    }
    lx.putImageData(veri, 0, 0);

    /* ── parça canvas'ına yumuşatarak büyüt ── */
    x2.setTransform(s, 0, 0, s, 0, 0);
    x2.drawImage(lo, 1, 1, w / A, h / A, 0, 0, w, h);
  }

  /* ═════════════════════════════════════════════════════════════════════
     BOYALI ZEMİN — KESKİN PARÇA ÜRETİMİ

     NEDEN ALAN, RENK DEĞİL: eski yol RENGİ 10 dünya pikselinde bir
     hesaplayıp büyütüyordu. Renk büyütülünce iki arazinin ya da iki
     tonun sınırı 10 px'lik basamaklar halinde bulanıklaşır — "144p
     geçiş" şikâyetinin kök sebebi buydu. Burada ise alçak
     çözünürlükte yalnız SAYILAR (biyom değeri + boya gürültüsü)
     örneklenir; bunlar yumuşak alanlar olduğu için büyütülmeleri
     kayıpsızdır. Eşikleme ve renk, parçanın KENDİ çözünürlüğünde,
     her pikselde yapılır. Sınır artık piksel keskinliğinde bir eğri
     (yazı fontlarının "mesafe alanı" hilesiyle aynı fikir).

     MALİYET: gürültü yine alçak çözünürlükte (pahalı kısım aynı);
     piksel döngüsü yalnız çarpma/toplama. CFG.boya.kalite < 1 ise
     döngü daha küçük tamponda koşar ve sonra büyütülür. */
  /* ── RENK TABLOSU (LUT) ──
     Tek bir biyomun rengi yalnız iki sayıya bağlı: boya gürültüsü n
     ve (kabartı açıksa) kaydırılmış gürültü nk. O halde renk her
     piksel için yeniden hesaplanmaz; ayarlar değişince BİR KEZ
     tabloya dökülür, piksel döngüsü yalnız tablodan okur. Piksel
     döngüsünü ~3 kat hızlandıran adım bu.
     K: tablo çözünürlüğü. 1024 (kabartısız) / 256×256 (kabartılı);
     en keskin ayarda bile basamak görünmeyecek kadar ince. */
  let _lut = null, _lutImza = "";
  function lutAl() {
    const B = CFG.boya;
    const imza = JSON.stringify(B);
    if (_lut && imza === _lutImza) return _lut;

    const kab = B.kabarti > 0;
    const K = kab ? 256 : 1024, KK = kab ? K * K : K;
    const lut = new Uint8ClampedArray(3 * KK * 3);
    const PAL = paletHazirla();
    const bol = B.bolge || {};
    const _E1 = B.esik1, _E2 = B.esik2, IC = B.icTon, KB = B.kabarti * 2;

    /* Kat çizgisi eşikleri: iki ton eşiği + `kat` kadar eşit aralıklı
       ara çizgi. Ayrıntı ve neden: CFG.boya.hat. */
    const HT = B.hat || {};
    const HTa = !!HT.acik && (HT.en || 0) > 0 &&
                ((HT.koyu || 0) > 0 || (HT.parlak || 0) > 0);
    const HTen = HT.en || 0, HTk = HT.koyu || 0, HTp = HT.parlak || 0;
    const HES = [];
    if (HTa) {
      HES.push(_E1, _E2);
      const kat = Math.max(0, Math.min(24, Math.round(HT.kat || 0)));
      for (let i = 0; i < kat; i++) HES.push((i + 1) / (kat + 1));
    }

    for (let b = 0; b < 3; b++) {
      const _z = bol[BIYOM_AD[b]] || {};
      const kk = _z.keskinlik || 1;
      const y = Math.max(0.0005, B.yum / kk);
      /* esikKay: BİYOM BAŞINA eşik kaydırması. Eksi = koyu ton alanı
         küçülür (zemin açılır), artı = büyür. Desen ölçeğiyle
         birlikte her zemine kendi karakterini verir; ölçek lekenin
         BOYUNU, bu KOYULUK DAĞILIMINI ayırır. */
      const kay = _z.esikKay || 0;
      const E1 = _E1 + kay, E2 = _E2 + kay;
      const o = b * 15;
      const kad = function (e, x) {
        if (x <= e - y) return 0;
        if (x >= e + y) return 1;
        const t = (x - e + y) / (2 * y);
        return t * t * (3 - 2 * t);
      };
      for (let ai = 0; ai < K; ai++) {
        const n = ai / (K - 1);
        const t1 = kad(E1, n), t2 = kad(E2, n);
        let br = PAL[o + 3] + (PAL[o + 6] - PAL[o + 3]) * t1;
        let bg = PAL[o + 4] + (PAL[o + 7] - PAL[o + 4]) * t1;
        let bb = PAL[o + 5] + (PAL[o + 8] - PAL[o + 5]) * t1;
        br += (PAL[o + 9] - br) * t2; bg += (PAL[o + 10] - bg) * t2; bb += (PAL[o + 11] - bb) * t2;
        if (IC > 0) {
          const it = (n - 0.5) * 2 * IC;
          const m = Math.min(1, Math.abs(it)), hd = it > 0 ? o + 12 : o;
          br += (PAL[hd] - br) * m; bg += (PAL[hd + 1] - bg) * m; bb += (PAL[hd + 2] - bb) * m;
        }
        /* ── KAT ÇİZGİSİ ── altı gölgeye, üstü parlağa: teras basamağı */
        for (let q = 0; q < HES.length; q++) {
          const sd = n - HES[q], ad = sd < 0 ? -sd : sd;
          if (ad >= HTen) continue;
          let m = 1 - ad / HTen;
          m = m * m * (3 - 2 * m);
          const g = (sd < 0 ? HTk : HTp) * m;
          if (g <= 0) continue;
          const hd = sd < 0 ? o : o + 12;
          br += (PAL[hd] - br) * g; bg += (PAL[hd + 1] - bg) * g; bb += (PAL[hd + 2] - bb) * g;
        }
        const cN = kab ? K : 1;
        for (let ci = 0; ci < cN; ci++) {
          let r = br, g = bg, bl = bb;
          if (kab) {
            const nk = ci / (K - 1);
            const d = ((t1 + t2) - (kad(E1, nk) + kad(E2, nk))) * 0.5 * KB;
            if (d !== 0) {
              const m = Math.min(1, Math.abs(d)), hd = d > 0 ? o + 12 : o;
              r += (PAL[hd] - r) * m; g += (PAL[hd + 1] - g) * m; bl += (PAL[hd + 2] - bl) * m;
            }
          }
          const k = (b * KK + (kab ? ai * K + ci : ai)) * 3;
          lut[k] = r; lut[k + 1] = g; lut[k + 2] = bl;
        }
      }
    }
    _lut = { K, lut, pal: PAL }; _lutImza = imza;
    return _lut;
  }

  function chunkUretBoya(x2, minX, minY, w, h, s) {
    const B = CFG.boya;
    const A = Math.max(4, CFG.zeminAdim);
    const LW = Math.ceil(w / A) + 2, LH = Math.ceil(h / A) + 2;
    const N = LW * LH;

    const FV = new Float32Array(N);          /* biyom değeri + serpme  */
    /* ── BOYA DESENİ: BİYOM BAŞINA AYRI ───────────────────────────
       ÖNCE TEK ALANDI, YANLIŞTI: FN bütün haritada tek bir gürültü
       alanıydı. Kar ile çimen AYNI lekeyi paylaşıyor, yalnız farklı
       palete boyanıyordu: koskoca bir yuvarlak leke sınırdan
       kesintisiz geçip öbür zeminde devam ediyor, iki bölge tek
       arazinin devamıymış gibi duruyordu. Rölyef biyoma ayrıldıktan
       sonra ekranda görünmeye devam eden leke buydu — rölyefin
       dalga boyu ~26 karo, bu desen ise ~11 karo, yani gözün
       "çukur/kabartı" diye okuduğu asıl desen.

       ŞİMDİ: üç biyom için üç AYRI desen (aynı gürültü, birbirinden
       çok uzak başlangıç noktalarıyla → ilgisiz). Piksel, tonunu
       hangi biyomdan alıyorsa desenini de onun alanından okur.
       Leke sınırda biter, öbür tarafta bambaşka bir leke başlar.

       DİZİLİM: FN[k*3 + b] = k noktasında b biyomunun deseni. */
    const BOFS = [0, 0, 3072, 6144, 9216, 1536];
    /* Biyom başına desen ölçeği (CFG.boya.bolge.*.desenOlcek). */
    const _bol = B.bolge || {};
    const DOLC = [0, 1, 2].map(function (i) {
      const z = _bol[BIYOM_AD[i]];
      const o = z && z.desenOlcek;
      return o > 0 ? o : 1;
    });
    const FN = new Float32Array(N * 3);      /* boya gürültüsü, biyom başına */
    const kab = B.kabarti > 0;
    const FK = kab ? new Float32Array(N * 3) : null;  /* kaydırılmış gürültü */

    /* ── RÖLYEF: BİYOM BAŞINA AYRI, KABA IZGARADA ─────────────────
       ÖNCE TEK ALANDI, YANLIŞTI: rölyef bütün haritada tek bir
       yükseklik alanıydı, biyomu hiç görmüyordu. Bir çukur kar ile
       çimenin üstünden kesintisiz geçiyor, iki bölge aynı arazinin
       devamıymış gibi duruyordu. Oysa kar ile çimen ayrı bölgeler;
       çimenin çukuru kara giremez.

       ŞİMDİ: üç biyom için üç AYRI yükseklik alanı üretiliyor (aynı
       gürültü, birbirinden çok uzak başlangıç noktalarıyla, yani
       desenleri ilgisiz). Piksel, rengini hangi biyomdan alıyorsa
       gölgesini de o biyomun alanından alır. Sınırda gölge de renkle
       birlikte değişir; çukur sınırda biter.

       KABA IZGARA: rölyefin dalga boyu onlarca karo, yani alan çok
       yavaş değişiyor. Bu yüzden FV/FN'den DÖRT KAT kaba bir
       ızgarada (AR = A*4) örnekleniyor: örnek sayısı 16 kat azalıyor,
       üç biyom birden eski tek alandan DAHA UCUZ oluyor. Bilineer
       büyütme kayıpsız — FV ile aynı gerekçe. */
    const RL = CFG.rolyef || {};
    /* ao tek başına da iş yapar (yamaç ışığı kapalı, yalnız çukur
       karartma), o yüzden ikisinden biri yeterli. */
    const rol = !!RL.acik && ((RL.guc || 0) > 0 || (RL.ao || 0) > 0);

    /* Biyom başına başlangıç kaydırması. Büyük ve birbirine yakın
       olmayan sayılar: aynı gürültüden ilgisiz üç desen çıksın. */
    const ROFS = [0, 0, 4096, 1024, 2048, 7168];

    const AR = A * 4;
    const RW = rol ? Math.ceil(w / AR) + 2 : 0;
    const RH = rol ? Math.ceil(h / AR) + 2 : 0;
    /* FS[k*3 + b] = o noktada b biyomunun rengini çarpan sayı (1 = dokunma) */
    let FS = null;
    if (rol) {
      const ra = (RL.isikAci || 0) * Math.PI / 180;
      const ux = Math.cos(ra) * (RL.kaydir || 1);
      const uy = -Math.sin(ra) * (RL.kaydir || 1);
      /* Ekran (x,y) → ızgara (gx,gy): 2:1 dimetrikte gx = (x/2 + y),
         gy = (y - x/2). Sabit ölçek gerekmiyor, yön yeter. */
      const rdx = ux * 0.5 + uy;
      const rdy = uy - ux * 0.5;
      const guc = RL.guc || 0, ao = RL.ao || 0;
      const tavan = RL.tavan == null ? 0.35 : RL.tavan;

      FS = new Float32Array(RW * RH * 3);
      for (let j = 0; j < RH; j++) {
        const wy = minY + (j - 1 + 0.5) * AR;
        for (let i = 0; i < RW; i++) {
          const wx = minX + (i - 1 + 0.5) * AR;
          const g = worldToGrid(wx, wy);
          const k = (j * RW + i) * 3;
          for (let b = 0; b < 3; b++) {
            const ox = ROFS[b * 2], oy = ROFS[b * 2 + 1];
            const h1 = rolyefYuksek(g.gx + ox, g.gy + oy);
            const h2 = rolyefYuksek(g.gx + ox + rdx, g.gy + oy + rdy);
            /* Yamaç: ışık yönünde yükseliyorsa aydınlanır, alçalıyorsa
               gölgelenir. Kapalı alan: çukur koyu, tepe açık. */
            let d = (h1 - h2) * guc + (h1 - 0.5) * ao;
            if (d > tavan) d = tavan; else if (d < -tavan) d = -tavan;
            FS[k + b] = 1 + d;
          }
        }
      }
    }

    const r = (B.isikAci || 0) * Math.PI / 180;
    const kdx = Math.cos(r) * B.kaydir, kdy = Math.sin(r) * B.kaydir;

    /* ── YALNIZ GEREKEN BİYOMUN DESENİ ─────────────────────────────
       ÖLÇÜLDÜ: pişirmenin pahalı kısmı piksel döngüsü DEĞİL, gürültü
       örneklemesi. boya.kalite 1 → 0.25 (piksel sayısı 16'da bire
       iner) tam çizimi yalnız 320 ms'den 200 ms'ye indirdi; kalan
       maliyet bu döngüde.

       Her örnekte ÜÇ biyomun da deseni hesaplanıyordu (kabartı
       açıkken örnek başına 6 boyaGurultu = 12 smoothNoise = 48
       Math.sin). Oysa bir piksel rengini TEK biyomdan alır; ikinci
       biyom yalnız sınır bandında okunur.

       Artık örnek, biyom değerine (FV) göre hangi biyomları
       gerektiriyorsa yalnız onları hesaplıyor. MARJ eşiğe yakınlık
       payı: piksel döngüsünün gerçekte ihtiyaç duyduğu bant
       ~0.0002 v birimi (sinirYumusak 2 px) artı bir ızgara hücresi
       (~0.0006); 0.02 bunun ~25 katı, yani sınırda iki biyom da
       kesinlikle hazır. Hesaplanmayan gözler 0 kalır ve hiç
       okunmaz. */
    const MARJ = 0.02;
    const eKar = CFG.esikKar, eCim = CFG.esikCimen;
    for (let j = 0; j < LH; j++) {
      const wy = minY + (j - 1 + 0.5) * A;
      for (let i = 0; i < LW; i++) {
        const wx = minX + (i - 1 + 0.5) * A;
        const g = worldToGrid(wx, wy);
        const k = j * LW + i;
        const v = biyomDeger(g.gx, g.gy) + serpmeSapma(g.gx, g.gy);
        FV[k] = v;
        const yKar = v > eKar - MARJ && v < eKar + MARJ;
        const yCim = v > eCim - MARJ && v < eCim + MARJ;
        const k3 = k * 3;
        for (let b = 0; b < 3; b++) {
          const gerek = b === 0 ? (v < eKar || yKar)
                      : b === 1 ? ((v >= eKar && v < eCim) || yKar || yCim)
                                : (v >= eCim || yCim);
          if (!gerek) continue;
          const ox = BOFS[b * 2], oy = BOFS[b * 2 + 1], ol = DOLC[b];
          FN[k3 + b] = boyaGurultu(g.gx + ox, g.gy + oy, ol);
          if (kab) FK[k3 + b] = boyaGurultu(g.gx + ox + kdx, g.gy + oy + kdy, ol);
        }
      }
    }

    /* Biyom değerinin eğimi (değişim / dünya pikseli), merkezi fark.
       Kenar örneklerinde tek yönlü fark. */
    const GX = new Float32Array(N), GY = new Float32Array(N);
    for (let j = 0; j < LH; j++) {
      for (let i = 0; i < LW; i++) {
        const k = j * LW + i;
        const il = i > 0 ? k - 1 : k, ir = i < LW - 1 ? k + 1 : k;
        const ju = j > 0 ? k - LW : k, jd = j < LH - 1 ? k + LW : k;
        GX[k] = (FV[ir] - FV[il]) / (((ir - il) || 1) * A);
        GY[k] = (FV[jd] - FV[ju]) / ((((jd - ju) / LW) || 1) * A);
      }
    }

    const L = lutAl();
    const K = L.K, LUT = L.lut, K1 = K - 1, PAL = L.pal;
    /* Geçiş kıyısı: en = şeridin yarı genişliği (dünya px),
       guc = parlak tona çekme oranı (0..1). Ayrıntı: CFG.boya.gecis */
    const _GC = B.gecis || {};
    const GE = _GC.acik === false ? 0 : (_GC.en || 0);
    const GG = Math.max(0, Math.min(1, _GC.guc == null ? 0 : _GC.guc));
    const eK = CFG.esikKar, eC = CFG.esikCimen;
    const ORT = (eK + eC) / 2;
    const SY = Math.max(0.5, CFG.sinirYumusak == null ? 4 : CFG.sinirYumusak);
    const YAKIN = 0.06;                       /* eğim hesabı bu v farkının içinde */

    const q  = Math.max(0.3, Math.min(1, B.kalite || 1));
    const OW = Math.max(1, Math.ceil(w * s * q)), OH = Math.max(1, Math.ceil(h * s * q));
    const olc = s * q;                        /* çıktı pikseli / dünya pikseli */

    const hedef = q < 1 ? document.createElement("canvas") : x2.canvas;
    if (q < 1) { hedef.width = OW; hedef.height = OH; }
    const hx = q < 1 ? hedef.getContext("2d") : x2;
    const im = hx.createImageData(OW, OH);
    const px = im.data;

    /* Sütun başına alçak tampon indisi ve kesri BİR KEZ hesaplanır;
       (örnek i, dünyada minX + (i-1+0.5)·A noktasında) */
    const I0 = new Int32Array(OW), TX = new Float32Array(OW);
    for (let x = 0; x < OW; x++) {
      const fx = (x + 0.5) / olc / A + 0.5;
      let i0 = fx | 0; if (i0 > LW - 2) i0 = LW - 2;
      I0[x] = i0; TX[x] = fx - i0;
    }

    /* Rölyefin KABA ızgarası için aynı hesap (adım AR = A*4) */
    const RI0 = rol ? new Int32Array(OW) : null;
    const RTX = rol ? new Float32Array(OW) : null;
    if (rol) {
      for (let x = 0; x < OW; x++) {
        const fx = (x + 0.5) / olc / AR + 0.5;
        let i0 = fx | 0; if (i0 > RW - 2) i0 = RW - 2; if (i0 < 0) i0 = 0;
        RI0[x] = i0; RTX[x] = fx - i0;
      }
    }

    /* LUT indisi: tek biyom rengi = LUT[biyom][n][nk] */
    const KK = kab ? K * K : K;
    function ind(b, n, nk) {
      let a = (n * K1 + 0.5) | 0; if (a < 0) a = 0; else if (a > K1) a = K1;
      if (!kab) return (b * KK + a) * 3;
      let c = (nk * K1 + 0.5) | 0; if (c < 0) c = 0; else if (c > K1) c = K1;
      return (b * KK + a * K + c) * 3;
    }

    for (let y = 0; y < OH; y++) {
      const fy = (y + 0.5) / olc / A + 0.5;
      let j0 = fy | 0; if (j0 > LH - 2) j0 = LH - 2;
      const ty = fy - j0, ty1 = 1 - ty;
      const r0 = j0 * LW, r1 = r0 + LW;

      let rr0 = 0, rr1 = 0, rty = 0, rty1 = 0;
      if (rol) {
        const fyr = (y + 0.5) / olc / AR + 0.5;
        let jr = fyr | 0; if (jr > RH - 2) jr = RH - 2; if (jr < 0) jr = 0;
        rty = fyr - jr; rty1 = 1 - rty;
        rr0 = jr * RW; rr1 = rr0 + RW;
      }
      let p = y * OW * 4;
      for (let x = 0; x < OW; x++, p += 4) {
        const tx = TX[x], tx1 = 1 - tx;
        const a = r0 + I0[x], b = r1 + I0[x];
        const w00 = tx1 * ty1, w10 = tx * ty1, w01 = tx1 * ty, w11 = tx * ty;

        const v = FV[a] * w00 + FV[a + 1] * w10 + FV[b] * w01 + FV[b + 1] * w11;
        /* n/nk biyoma bağlı (FN[k*3 + b]), o yüzden biyom seçildikten
           SONRA, seçilen biyom(lar) için okunuyor. */
        const a3 = a * 3, b3 = b * 3;

        /* ── BİYOM SINIRI, PİKSEL CİNSİNDEN ──
           Biyom değeri çok YAVAŞ değişiyor (karo başına ~0.004). Bant
           v biriminde verilince (eski gecisBandi) 0.002'lik "dar" bir
           bant bile ekranda ~1 karo, yani yüzlerce piksel bulanıklık
           oluyordu — keskin ayarda bile geçişin "144p" görünmesinin
           asıl sebebi buydu. Burada v'nin yerel eğimi (değişim/px)
           hesaplanıp eşiğe PİKSEL cinsinden uzaklık bulunuyor; bant
           CFG.sinirYumusak dünya pikseli. Yazı fontlarının kenar
           yumuşatmasıyla aynı yöntem. Eğim yalnız eşiğe yakın
           piksellerde hesaplanır. */
        let b1, b2 = -1, t = 0, rim = 0;
        const e = v < ORT ? eK : eC;
        const fark = v - e;
        if (fark > -YAKIN && fark < YAKIN) {
          /* Eğim, önceden hesaplanmış GX/GY alanlarından bilineer —
             hücre içi fark alınsaydı eğim hücre sınırında SIÇRAR,
             kenar boyunca ince yatay/dikey çizgiler çıkardı (denendi). */
          const gx_ = GX[a] * w00 + GX[a + 1] * w10 + GX[b] * w01 + GX[b + 1] * w11;
          const gy_ = GY[a] * w00 + GY[a + 1] * w10 + GY[b] * w01 + GY[b + 1] * w11;
          const eg = Math.sqrt(gx_ * gx_ + gy_ * gy_) + 1e-6;
          const d = fark / eg;                     /* eşiğe uzaklık, dünya px */
          const alt = e === eK ? 0 : 1;
          if (d <= -SY)      b1 = alt;
          else if (d >= SY)  b1 = alt + 1;
          else { b1 = alt; b2 = alt + 1; t = (d + SY) / (2 * SY); }
          /* ── GEÇİŞ KIYISI ──
             Sınırın iki yanında GE dünya pikseli genişliğinde bir
             şerit, o pikselin KENDİ biyomunun PARLAK tonuna çekilir.
             İki zemin birbirine koyu tonla dayanınca sınır çamur
             gibi duruyordu; kıyı açılınca her zemin kendi sınırını
             kendi açık rengiyle çiziyor. Maliyet: yalnız eşiğe yakın
             piksellerde, birkaç çarpma. */
          if (GE > 0) {
            const ad2 = d < 0 ? -d : d;
            if (ad2 < GE) {
              let m = 1 - ad2 / GE;
              rim = m * m * (3 - 2 * m) * GG;
            }
          }
        } else {
          b1 = v < eK ? 0 : v < eC ? 1 : 2;
        }

        const n1  = FN[a3 + b1] * w00 + FN[a3 + 3 + b1] * w10
                  + FN[b3 + b1] * w01 + FN[b3 + 3 + b1] * w11;
        const nk1 = kab ? FK[a3 + b1] * w00 + FK[a3 + 3 + b1] * w10
                        + FK[b3 + b1] * w01 + FK[b3 + 3 + b1] * w11 : 0;
        const k1 = ind(b1, n1, nk1);
        let cr, cg, cb;
        if (b2 < 0) {
          cr = LUT[k1]; cg = LUT[k1 + 1]; cb = LUT[k1 + 2];
        } else {
          const n2  = FN[a3 + b2] * w00 + FN[a3 + 3 + b2] * w10
                    + FN[b3 + b2] * w01 + FN[b3 + 3 + b2] * w11;
          const nk2 = kab ? FK[a3 + b2] * w00 + FK[a3 + 3 + b2] * w10
                          + FK[b3 + b2] * w01 + FK[b3 + 3 + b2] * w11 : 0;
          t = t * t * (3 - 2 * t);
          const k2 = ind(b2, n2, nk2), u = 1 - t;
          cr = LUT[k1] * u     + LUT[k2] * t;
          cg = LUT[k1 + 1] * u + LUT[k2 + 1] * t;
          cb = LUT[k1 + 2] * u + LUT[k2 + 2] * t;
        }

        /* Kıyı açma: pikselin kendi biyomunun parlak tonuna çek.
           Sınır bandındaysa (b2 >= 0) iki parlak ton da t ile
           karışır, yoksa kıyıda ikinci bir renk sıçraması olurdu. */
        if (rim > 0) {
          const p1 = b1 * 15 + 12;
          let hr = PAL[p1], hg = PAL[p1 + 1], hb = PAL[p1 + 2];
          if (b2 >= 0) {
            const p2 = b2 * 15 + 12;
            hr += (PAL[p2] - hr) * t;
            hg += (PAL[p2 + 1] - hg) * t;
            hb += (PAL[p2 + 2] - hb) * t;
          }
          cr += (hr - cr) * rim; cg += (hg - cg) * rim; cb += (hb - cb) * rim;
        }

        /* ── RÖLYEF GÖLGESİ — SINIRDA KESİLİR ──
           Gölge, pikselin RENGİNİ aldığı biyomun alanından okunur:
           b1 (ve sınır bandında b2). Sınır bandı yalnız
           sinirYumusak (≈2 px) genişliğinde, yani gölge sınırda
           KESİLİYOR: çimenin çukuru/kabartısı kar veya lav alanına
           bir piksel bile taşmıyor. Üç alan birbirinden bağımsız
           üretildiği için de tek bir yuvarlağın devamı gibi
           görünmüyor. px bir Uint8ClampedArray, taşma kırpılır. */
        if (FS) {
          const rtx = RTX[x], rtx1 = 1 - rtx;
          const ra_ = (rr0 + RI0[x]) * 3, rb_ = (rr1 + RI0[x]) * 3;
          const q00 = rtx1 * rty1, q10 = rtx * rty1, q01 = rtx1 * rty, q11 = rtx * rty;
          let sh = FS[ra_ + b1] * q00 + FS[ra_ + 3 + b1] * q10
                 + FS[rb_ + b1] * q01 + FS[rb_ + 3 + b1] * q11;
          if (b2 >= 0) {
            const sh2 = FS[ra_ + b2] * q00 + FS[ra_ + 3 + b2] * q10
                      + FS[rb_ + b2] * q01 + FS[rb_ + 3 + b2] * q11;
            sh += (sh2 - sh) * t;
          }
          cr *= sh; cg *= sh; cb *= sh;
        }
        px[p] = cr; px[p + 1] = cg; px[p + 2] = cb;
        px[p + 3] = 255;
      }
    }
    hx.putImageData(im, 0, 0);
    if (q < 1) x2.drawImage(hedef, 0, 0, OW, OH, 0, 0, x2.canvas.width, x2.canvas.height);
  }

  /* Tane + ızgara çizgisi — iki yol için ortak son adım */
  function tamamla(x2, minX, minY, w, h, s, gx0, gx1, gy0, gy1, tw, th) {
    x2.setTransform(s, 0, 0, s, 0, 0);

    /* ── TANE ──
       Bulanık büyütmenin hemen ÜSTÜNE, ızgara çizgilerinin ALTINA.
       Burada olması şart: parçaya pişince önbelleğe girer, kaydırma
       sırasında bir daha hesaplanmaz.

       HİZALAMA: parçanın yerel (0,0) noktası dünyada (minX,minY).
       Desen kendi başına yerel koordinattan başlar, yani her parça
       deseni baştan başlatır ve parça sınırlarında görünür bir kesik
       oluşur. pattern.setTransform ile desen dünya fazına kaydırılıyor:
       yerel lx noktasında dünya (minX+lx) okunsun diye -minX kadar.
       İki komşu parça böylece aynı sonsuz desenin iki penceresi olur.

       ctx zaten setTransform(s,...) altında: desen karesi s ile
       ölçekleniyor, yani DÜNYA ölçüsünde sabit kalıyor —
       yakınlaştırınca tane de büyür, arazi dokusu gibi durur. */
    const D = CFG.atmosfer.doku;
    if (CFG.atmosfer.acik && D.guc > 0) {
      const t = dokuKaresi();
      const des = x2.createPattern(t.cv, "repeat");
      if (des) {
        /* JS'te % negatif sayıda negatif döner; iki adımda pozitife
           çekiliyor, yoksa kaydırma ters yöne kaçar. */
        const fx = ((-minX % t.P) + t.P) % t.P;
        const fy = ((-minY % t.P) + t.P) % t.P;
        /* Eski WebView'larda ikisi de olmayabilir. Yoksa hizalama
           yapılmaz — desen yine basılır, yalnız parça sınırlarında
           küçük bir kayma olur. Dokuyu tamamen kaybetmektense. */
        if (des.setTransform && typeof DOMMatrix !== "undefined") {
          des.setTransform(new DOMMatrix([1, 0, 0, 1, fx, fy]));
        }
        x2.save();
        x2.globalCompositeOperation = "overlay";
        x2.globalAlpha = D.guc;
        x2.fillStyle = des;
        x2.fillRect(0, 0, w, h);
        x2.restore();
      }
    }

    if (CFG.izgaraCizgisi) {
      x2.strokeStyle = "rgba(255,255,255,.18)";
      x2.lineWidth = 1 / s;
      for (let gy = gy0; gy <= gy1; gy++) {
        for (let gx = gx0; gx <= gx1; gx++) {
          const q = gridToWorld(gx, gy);
          const px = q.x - minX, py = q.y - minY;
          x2.beginPath();
          x2.moveTo(px + tw / 2, py);
          x2.lineTo(px + tw, py + th / 2);
          x2.lineTo(px + tw / 2, py + th);
          x2.lineTo(px, py + th / 2);
          x2.closePath();
          x2.stroke();
        }
      }
    }

  }

  /* Dokular sonradan yüklenince eski parçalar geçersiz kalır */
  function onbellegiBosalt() { onbellek.clear(); onbellekPiksel = 0; }

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
    const s = olcekKovasi(zoom);
    const C = chunkBoyu(s);
    const cx0 = Math.floor(gx0 / C), cx1 = Math.floor(gx1 / C);
    const cy0 = Math.floor(gy0 / C), cy1 = Math.floor(gy1 / C);

    let cizilen = 0;
    /* Bu karede kaç TAM parça pişirilebilir; 0 = sınırsız (eski yol) */
    let butce = (CFG.kareParca | 0) > 0 ? (CFG.kareParca | 0) : Infinity;
    let eksik = false;
    const PALd = lutAl().pal;   /* düz dolgu rengi paletten */

    /* Parçanın DÜNYA dikdörtgeni; görünürlük ve dolgu için. */
    function parcaKutu(cx, cy, C) {
      return {
        ux: gridToWorld(cx * C, cy * C + C - 1).x,
        sx: gridToWorld(cx * C + C - 1, cy * C).x + CFG.tileW,
        uy: gridToWorld(cx * C, cy * C).y,
        ay: gridToWorld(cx * C + C - 1, cy * C + C - 1).y + CFG.tileH
      };
    }
    /* EKRAN DIŞI PARÇAYI ATLA: ızgara aralığı eşkenar dörtgen ekranı
       dikdörtgen olarak sarıyor, köşelerdeki parçalar hiç görünmüyor. */
    function gorunur(q) {
      return !(q.sx < wx0 || q.ux > wx1 || q.ay < wy0 || q.uy > wy1);
    }
    function duzDoldur(cx, cy, C, q) {
      const gm = biyomDeger(cx * C + C / 2, cy * C + C / 2);
      const bi = gm < CFG.esikKar ? 0 : gm < CFG.esikCimen ? 1 : 2;
      const o = bi * 15 + 6;                       /* orta ton */
      ctx.fillStyle = "rgb(" + (PALd[o] | 0) + "," + (PALd[o + 1] | 0) +
                      "," + (PALd[o + 2] | 0) + ")";
      ctx.fillRect(q.ux, q.uy, q.sx - q.ux + 1, q.ay - q.uy + 1);
    }

    /* ── KABA KATMAN ───────────────────────────────────────────────
       Pişmemiş parçanın yerine DÜZ RENK basılıyordu; ekranda kocaman
       tek renk bloklar görünüyordu (ölçüldü, ekran görüntüsüyle
       doğrulandı). Artık o yere aynı bölgenin EN DÜŞÜK ÖLÇEKTEKİ
       (s = 1) parçası gerilerek basılıyor: piksel sayısı ölçeğin
       karesiyle azaldığı için maliyeti tam parçanın dörtte birinden
       az, görüntüsü blok değil "biraz yumuşak zemin".

       Kaba parçalar da önbellekte durur ve HER ZOOM SEVİYESİNDE aynı
       anahtarla kullanılır — bir kez pişer, sonra bedava.

       Izgarası ayrı: chunkBoyu(1) = CHUNK, tam parçalarınki ise
       s >= 2 iken CHUNK/2. Bu yüzden kendi döngüsü var. */
    /* KABA ÖLÇEK: tam parçanın ölçeğinden bağımsız, sabit ve küçük.
       Tavan 1'e indikten sonra s de 1 olduğu için eski "KABA = 1"
       kuralı kaba katmanı tamamen kapatıyordu; pişmemiş yerlere düz
       renk basılıyordu ve hızlı kaydırırken zemin "piksel piksel /
       blok blok" geliyordu (telefonda görüldü).
       0.35 → piksel sayısı tam parçanın %12'si, yani bir kaba parça
       tam parçanın sekizde biri kadar. Ekranda blok değil, bulanık
       zemin görünür ve üstüne tam parça biner. */
    const KABA = CFG.kabaOlcek > 0 ? CFG.kabaOlcek : 0.35;
    const kabaVar = s > KABA;
    /* KABA PARÇA DA UCUZ DEĞİL: ızgarası CHUNK (8 karo), tam
       parçanınki s>=2 iken CHUNK/2 (4 karo). Alan 4 kat, ölçek 1/2
       → piksel sayısı kabaca AYNI. Kare başına 3 denendi, kaydırma
       ölçümünde 359/227/182 ms sıçramaları çıktı; 1'e indirildi. */
    /* Kaba parça tam parçanın ~sekizde biri kadar; karede 2 tanesi
       bir tam parçanın dörtte biri eder. */
    let kabaButce = kabaVar ? 2 : 0;

    function kabaKatman() {
      const Ck = chunkBoyu(KABA);
      const kx0 = Math.floor(gx0 / Ck), kx1 = Math.floor(gx1 / Ck);
      const ky0 = Math.floor(gy0 / Ck), ky1 = Math.floor(gy1 / Ck);
      for (let cy = ky0; cy <= ky1; cy++) {
        for (let cx = kx0; cx <= kx1; cx++) {
          const q = parcaKutu(cx, cy, Ck);
          if (!gorunur(q)) continue;
          const hazir = onbellek.has(cx + "," + cy + "," + KABA);
          if (!hazir && kabaButce <= 0) { eksik = true; duzDoldur(cx, cy, Ck, q); continue; }
          const par = chunkAl(cx, cy, KABA);
          if (!par) continue;
          if (!hazir) kabaButce--;
          ctx.drawImage(par.cv, par.x, par.y, par.w + 1, par.h + 1);
        }
      }
    }

    /* Önce tara: tam parçalardan eksik var mı? Varsa KABA katman
       ALTA serilir, tam parçalar üstüne biner. Sıra önemli. */
    let tamEksik = false;
    for (let cy = cy0; cy <= cy1 && !tamEksik; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const q = parcaKutu(cx, cy, C);
        if (!gorunur(q)) continue;
        if (!onbellek.has(cx + "," + cy + "," + s)) { tamEksik = true; break; }
      }
    }
    if (tamEksik && kabaVar) kabaKatman();

    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const q = parcaKutu(cx, cy, C);
        if (!gorunur(q)) continue;

        /* Önbellekte yoksa PİŞECEK demektir. Bütçe bittiyse pişirme:
           altındaki kaba katman görünür, bir kare daha istenir.
           Anahtar chunkAl ile birebir aynı olmalı. */
        const hazir = onbellek.has(cx + "," + cy + "," + s);
        if (!hazir && butce <= 0) {
          eksik = true;
          if (!kabaVar) duzDoldur(cx, cy, C, q);   /* kaba katman yoksa */
          continue;
        }

        const par = chunkAl(cx, cy, s);
        if (!par) continue;
        if (!hazir) butce--;
        /* +1 px: komşu parçalar arasında saç teli boşluk kalmasın */
        ctx.drawImage(par.cv, par.x, par.y, par.w + 1, par.h + 1);
        cizilen += C * C;
      }
    }

    /* Pişmeyi bekleyen parça kaldıysa bir kare daha iste — zemin
       kare kare keskinleşir. cizIste aynı karede ikinci çizimi zaten
       engelliyor, döngüye girmez. */
    if (eksik) cizIste();

    /* ── IŞIK YANSIMASI ──
       Dünya dönüşümü sıfırlanıp EKRAN uzayına dönülüyor; yansıma
       kaydırmayla birlikte kaymasın diye. */
    const Y = CFG.yansima;
    if (Y && Y.guc > 0) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const R = Math.max(w, h) * Y.yaricap;
      const lx = w * Y.x, ly = h * Y.y;

      const g1 = ctx.createRadialGradient(lx, ly, 0, lx, ly, R);
      g1.addColorStop(0,    "rgba(255,252,238," + Y.guc.toFixed(3) + ")");
      g1.addColorStop(0.42, "rgba(255,250,235," + (Y.guc * 0.42).toFixed(3) + ")");
      g1.addColorStop(1,    "rgba(255,250,235,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      if (Y.koseKarart > 0) {
        const g2 = ctx.createRadialGradient(w / 2, h / 2, R * 0.30, w / 2, h / 2, R * 0.82);
        g2.addColorStop(0, "rgba(0,0,0,0)");
        g2.addColorStop(1, "rgba(4,10,24," + Y.koseKarart.toFixed(3) + ")");
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, w, h);
      }
    }

    /* Düğümler ve seferler ARTIK BURADA DEĞİL — üst katmanda.
       Zemin karesi pahalı; onu animasyon hızında tekrarlamak
       kare hızını dibe vuruyordu.

       ÜST KATMAN AYNI KAREDE, EŞ ZAMANLI çizilir (cizUstIste ile
       ertelenmez). Ertelenirse üst katman zeminden bir kare geride
       kalır ve kaydırma sırasında düğümler zeminin üstünde kayar —
       düzeltmeye çalıştığımız hatanın ta kendisi. */
    cizUst();

    /* Çizilen karo sayısı saklanır; göstergeyi ÜST KATMAN yazar.
       Sebep: zemin artık yalnız kaydırma/yakınlaştırmada çiziliyor.
       Sayacı burada tutmak "4 fps" gibi yanıltıcı bir değer üretir —
       oysa oyun akıcıdır, sadece zemin yeniden çizilmemiştir.
       Gerçek akıcılığı üst katman ölçer; o her karede çalışır. */
    sonCizilenKaro = cizilen;
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

  function dugumTazele() { _dugumListe = null; cizUstIste(); }

  function dugumleriAl() {
    const simdi = performance.now();
    if (_dugumListe && (simdi - _dugumZaman) < DUGUM_TAZELIK_MS) return _dugumListe;
    try {
      _dugumListe = (window.DUGUM && DUGUM.haritaDugumleri) ? DUGUM.haritaDugumleri() : [];
    } catch (e) { _dugumListe = []; }
    _dugumZaman = simdi;
    return _dugumListe;
  }

  /* Seviye rengi — 1 yeşil, 2 sarı, 3 kırmızı. Halkanın rengi ve
     görsel yüklenmediğindeki yedek rozet bunu kullanır. */
  const SV_RENK = { 1: "#5fd98a", 2: "#e8c84f", 3: "#e2585c" };

  /* ── SEVİYE KUTUCUĞU GÖRSELLERİ ──
     Dosya adları: seviye1.webp … seviye5.webp (proje köküne konur).
     Türkçe harf YOK — büyük/küçük Latin dışı ad sessizce yüklenmez.

     Tembel yükleme: bir seviye ilk kez ekrana geldiğinde istenir.
     Yüklenince cizUstIste() ile o kare yeniden çizilir; yoksa
     eski sayı rozetine düşülür, yani görsel gelmeden de harita
     bilgisiz kalmaz. */
  const SV_GORSEL = {};
  const SV_ENUST  = 5;

  function svGorsel(sv) {
    const n = Math.max(1, Math.min(SV_ENUST, (sv | 0) || 1));
    let im = SV_GORSEL[n];
    if (!im) {
      im = new Image();
      im.decoding = "async";
      im.onload  = function () { im._hazir = true; cizUstIste(); };
      im.onerror = function () { im._hata  = true; };
      im.src = "seviye" + n + ".webp";
      SV_GORSEL[n] = im;
    }
    return im._hazir ? im : null;
  }

  /* Düğümün görseli. SPRITE'A GEÇİŞ TAM OLARAK BURADAN YAPILIR:
     bu gövdeyi drawImage(sprite, x-r, y-r, r*2, r*2) ile değiştirmek
     yeterli; çağıran hiçbir yer değişmez. */
  function cizDugumGorseli(c, d, x, y, r) {
    c.font = Math.round(r * 1.5) + "px serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(d.ikon, x, y);
  }

  /* ═════════════════════════════════════════════════════════════════════
     TEMAS GÖLGESİ FIRÇASI

     Tek bir yumuşak daire BİR KEZ küçük bir canvas'a çizilip saklanır;
     her düğüm onu drawImage ile ELİPS kutusuna gererek kullanır.

     NEDEN ÖNCEDEN: createRadialGradient her çağrıda yeni bir gradyan
     nesnesi kurar. Ekranda 176 düğüm var ve üst katman saniyede 60
     kez çiziliyor — kare başına 176 gradyan telefonu dize getirir.
     Hazır fırçayla aynı iş 176 drawImage'a iner, bu bedava sayılır.

     Fırça GRİ TONLU değil, gölgenin KENDİ RENGİNDE basılır; renk
     değişince atmosferUygula() bu önbelleği düşürür. */
  let _golgeFirca = null;

  function golgeFirca() {
    if (_golgeFirca) return _golgeFirca;
    const S = 128;
    const rgb = (CFG.atmosfer.golge.renk || [3, 11, 26]).join(",");
    const cv2 = document.createElement("canvas");
    cv2.width = cv2.height = S;
    const c = cv2.getContext("2d");
    const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    /* Ortada dolu, kenarda sıfır. Aradaki basamaklar düz bir
       doğrusal solmadan daha "yere yapışık" okunuyor: göbek geniş
       kalıyor, sönüm kenara doğru hızlanıyor. */
    g.addColorStop(0.00, "rgba(" + rgb + ",1)");
    g.addColorStop(0.40, "rgba(" + rgb + ",.80)");
    g.addColorStop(0.72, "rgba(" + rgb + ",.28)");
    g.addColorStop(1.00, "rgba(" + rgb + ",0)");
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
    _golgeFirca = cv2;
    return cv2;
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

    /* Düğümün ekran noktası — iki geçiş de aynı hesabı kullansın diye
       tek yere yazıldı. Gölge ve düğüm bir piksel bile ayrışamaz. */
    function nokta(d) {
      const p = gridToWorld(d.kx, d.ky);
      return { x: (p.x + HALF_W) * zoom + panX, y: (p.y + HALF_H) * zoom + panY };
    }
    function disarida(x, y) {
      return (x < -PAY || y < -PAY || x > w + PAY || y > h + PAY);
    }

    /* ── 1. GEÇİŞ: GÖLGELER ──
       NEDEN AYRI GEÇİŞ: düğümler arkadan öne sıralı çiziliyor. Gölge
       her düğümün hemen öncesinde basılsaydı, ÖNDEKİ düğümün gölgesi
       ARKADAKİ düğümün üstüne düşerdi — komşu karolarda kaynak
       rozetlerinin yarısı kararıyordu. Bütün gölgeler önce, bütün
       düğümler sonra: gölge asla bir düğümün üstüne gelmez. */
    const GL = CFG.atmosfer.golge;
    if (CFG.atmosfer.acik && GL.dugumGuc > 0) {
      const firca = golgeFirca();
      const rx = r * GL.dugumEn, ry = r * GL.dugumBoy, dy = r * GL.dugumDy;
      c.save();
      c.globalAlpha = GL.dugumGuc;
      for (let i = 0; i < sirali.length; i++) {
        const q = nokta(sirali[i]);
        if (disarida(q.x, q.y)) continue;
        c.drawImage(firca, q.x - rx, q.y + dy - ry, rx * 2, ry * 2);
      }
      c.restore();
    }

    /* ── 2. GEÇİŞ: DÜĞÜMLER ── */
    for (let i = 0; i < sirali.length; i++) {
      const d = sirali[i];
      const q = nokta(d);
      const x = q.x, y = q.y;

      if (disarida(x, y)) continue;
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

      /* SAĞ ALT SAYI ROZETİ KALDIRILDI — seviye artık ismin SOLUNDAKİ
         kutucukta duruyor (aşağıda). İki yerde göstermek görselin
         üstünü kapatıyordu. */

      /* Etiket ve isim yalnız yeterince yakınken — uzakta okunmuyor
         zaten ve metin çizimi en pahalı iş. */
      if (r >= 13) {
        const E = CFG.etiket;
        const punto = Math.max(9, Math.round(r * E.punto));
        const yaziY = y + r * E.yaziY;
        c.font = "800 " + punto + "px " + HARITA_FONT;
        c.textBaseline = "top";

        /* ── İSİM + SEVİYE GÖRSELİ ──
           İSİM düğümün eksenine ortalanır, GÖRSEL onun soluna asılır.
           Eskiden ikisi tek şerit sayılıp birlikte ortalanıyordu;
           o zaman görseli büyütmek ismi sağa kaydırıyordu. Artık
           ismin yeri görselden bağımsız — görsel ölçüsü serbestçe
           denenebiliyor.

           SEVİYE YAZIDA TEKRARLANMAZ; d.ad zaten son eki taşımıyor. */
        const gEn = Math.round(r * E.kutuEn);
        const gBoy = Math.round(r * E.kutuBoy);
        const gorsel = svGorsel(d.seviye);

        /* CANAVARDA İSİM YOK — yalnız seviye görseli.
           Canavarın adı bilgi taşımıyor (görseli zaten ne olduğunu
           söylüyor) ve haritayı kalabalıklaştırıyordu. İsim
           basılmayınca görselin yaslanacağı bir sol kenar da yok:
           doğrudan düğümün eksenine ortalanır. */
        const isimVar = (d.tur !== "canavar");

        /* İsmin yatay kayması; görsel isme yaslı olduğu için onunla
           birlikte kayar — ikisi bir arada durur. */
        const isimX = x + r * E.yaziX;

        c.textAlign = "center";
        if (isimVar) yaziAnahat(c, d.ad, isimX, yaziY, "#ffffff", punto);

        c.textAlign = "left";
        const isimGen = isimVar ? c.measureText(d.ad).width : 0;
        const gX = isimVar
          ? (isimX - isimGen / 2 - r * E.kutuDx - gEn)
          : (isimX - gEn / 2);
        const gY = yaziY + punto / 2 - gBoy / 2 + r * E.kutuDy;

        if (gorsel) {
          c.drawImage(gorsel, gX, gY, gEn, gBoy);
        } else {
          /* YEDEK — görsel henüz yok. Aynı yerde, aynı ölçüde küçük
             bir sayı rozeti; görsel gelince kendiliğinden kaybolur. */
          const mx = gX + gEn / 2, my = gY + gBoy / 2;
          const br = Math.min(gEn, gBoy) / 2;
          c.beginPath();
          c.arc(mx, my, br, 0, Math.PI * 2);
          c.fillStyle = "#12181f";
          c.fill();
          c.lineWidth = Math.max(1, br * 0.22);
          c.strokeStyle = renk;
          c.stroke();
          c.fillStyle = renk;
          c.font = "800 " + Math.round(br * 1.35) + "px " + HARITA_FONT;
          c.textAlign = "center"; c.textBaseline = "middle";
          c.fillText(String(d.seviye), mx, my);
          /* çizim durumunu geri al */
          c.font = "800 " + punto + "px " + HARITA_FONT;
          c.textBaseline = "top";
        }

        /* İŞGAL ADI — TEK KAYNAK BURASI.
           Kendim ALTIN, başkası KIRMIZI. Sefer katmanı toplarken ad
           basmaz; iki yerden basılınca aynı yazı üst üste geliyordu.
           Ayrıca işgal kaydı buluttan HER ZAMAN gelir, karşı tarafın
           seferi gelmese bile — bu yüzden daha güvenilir kaynak.
           Bu satırda kutucuk yok, düğümün eksenine ortalanır. */
        if (d.isgalAd) {
          c.textAlign = "center";
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
  /* ── DÜĞÜM GÖRSELİNİN EKRAN KUTUSU ──
     Kale sprite'ı karodan çok daha büyük: seviyeye göre 122–198 px ve
     üstüne dy ile yukarı kaydırılmış (index.html .castle-node
     .node-avatar). Bu yüzden "karo kenarı" hâlâ resmin ta içine düşüyor
     ve sefer çizgisi kalenin gövdesinden çıkıyormuş gibi duruyordu.

     Ölçü BURADA İKİNCİ BİR TABLOYA yazılmaz — ekrandaki kutudan
     okunur (getBoundingClientRect). Kale boyunu değiştirdiğinde yol
     kendiliğinden uyar, düzeltilecek ikinci yer olmaz.
     Karoda DOM düğümü yoksa (kaynak/arazi karoları canvas'a çizilir)
     null döner; çağıran taraf karo kenarına düşer. */
  let _kutuOnbellek = null;   /* yalnız tek çizim karesi boyunca yaşar */

  function dugumEkranKutusu(gx, gy) {
    const anahtar = gx + "," + gy;
    if (_kutuOnbellek && _kutuOnbellek.has(anahtar)) return _kutuOnbellek.get(anahtar);
    let kutu = null;
    try {
      const mapEl = document.getElementById("battleMap");
      if (mapEl && uv) {
        const p = gridToWorld(gx * ORAN, gy * ORAN);
        const wx = p.x + HALF_W, wy = p.y + HALF_H;
        const liste = dugumOnbellegi(mapEl);
        for (let i = 0; i < liste.length; i++) {
          if (Math.abs(liste[i].wx - wx) > 1 || Math.abs(liste[i].wy - wy) > 1) continue;
          const el = liste[i].el;
          if (!el.isConnected || el.style.display === "none") break;
          const hedef = el.querySelector(".node-avatar") || el;
          const r = hedef.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            /* Kutu, canvas'ın kendi koordinatına çevrilir: düğüm katmanı
               ile canvas ayrı elemanlar, sol üst köşeleri çakışmayabilir. */
            const kr = uv.getBoundingClientRect();
            kutu = { x1: r.left - kr.left, y1: r.top - kr.top,
                     x2: r.right - kr.left, y2: r.bottom - kr.top };
          }
          break;
        }
      }
    } catch (e) { kutu = null; }
    if (_kutuOnbellek) _kutuOnbellek.set(anahtar, kutu);
    return kutu;
  }

  /* ── SEFER YOLU UÇ PAYI ──
     Kale görseli KARE bir PNG ve içinde şeffaf boşluk var: kutunun
     tam kenarı çatının epey yukarısında kalıyor, yol da olduğundan
     kısa duruyordu. Kutu payı bu katsayıyla kısılır.
     0.51 ekranda ölçüldü (9 Eyl, ?yolayar=1 paneliyle); panel iş
     bitince silindi. */
  const YOL_PAY_KATSAYI = 0.51;

  /* Karo merkezinden (cx,cy) yön (ux,uy) boyunca kutunun kenarına kadar
     olan uzaklık. Merkez kutunun dışında kalıyorsa (dy kaydırması
     büyükse olur) 0 döner — yol uzatılmaz, yalnız kısaltılır. */
  function kutuPayi(kutu, cx, cy, ux, uy) {
    if (!kutu) return 0;
    let t = Infinity;
    if (Math.abs(ux) > 1e-6) t = Math.min(t, Math.max((kutu.x1 - cx) / ux, (kutu.x2 - cx) / ux));
    if (Math.abs(uy) > 1e-6) t = Math.min(t, Math.max((kutu.y1 - cy) / uy, (kutu.y2 - cy) / uy));
    return (isFinite(t) && t > 0) ? t : 0;
  }

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

    /* Kutu ölçüleri tek kare boyunca saklanır: aynı kaleye iki sefer
       varsa rect bir kez okunur, her seferde yeniden değil. */
    _kutuOnbellek = new Map();

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

      /* ── UÇLARI GÖRSELİN KENARINA ÇEK ──
         Yol karo MERKEZİNDEN merkeze gidiyordu; kale sprite'ı karodan
         büyük ve dy ile kaydırılmış olduğu için çizgi hem kendi
         kalemin hem rakibin gövdesinin içinden çıkıyordu.
         İki uç da, gidiş yönü boyunca o karodaki düğüm görselinin
         KENARINA kadar geri çekilir; düğüm yoksa en az karo kenarı
         kadar (eşkenar dörtgen: |x|/HALF_W + |y|/HALF_H = 1). */
      let sx = ax, sy = ay, hx = bx, hy = by;
      const uzunluk = Math.hypot(bx - ax, by - ay);
      if (uzunluk > 0.001) {
        const ux = (bx - ax) / uzunluk, uy = (by - ay) / uzunluk;
        const bolen = Math.abs(ux) / HALF_W + Math.abs(uy) / HALF_H;
        const karoPayi = bolen > 0 ? (1 / bolen) * zoom : 0;

        let cikis = Math.max(karoPayi, kutuPayi(dugumEkranKutusu(ev.ax, ev.ay), ax, ay, ux, uy) * YOL_PAY_KATSAYI);
        let varis = Math.max(karoPayi, kutuPayi(dugumEkranKutusu(ev.bx, ev.by), bx, by, -ux, -uy) * YOL_PAY_KATSAYI);

        /* Komşu karoda iki uç birbirini geçmesin: yol sıfıra iner,
           ters dönmez. */
        const toplam = cikis + varis;
        if (toplam > uzunluk && toplam > 0) {
          const k = uzunluk / toplam;
          cikis *= k; varis *= k;
        }
        sx = ax + ux * cikis; sy = ay + uy * cikis;
        hx = bx - ux * varis; hy = by - uy * varis;
      }

      /* Ordunun anlık yeri: yol üzerinde ilerleme oranı kadar.
         TOPLARKEN ilerleme yolu değil kaynağı ölçer; ordu hedefte
         durur, o yüzden doğrudan hedef noktası alınır. */
      const t = (ev.ad === "topla") ? 1 : ev.p;
      const ox = sx + (hx - sx) * t;
      const oy = sy + (hy - sy) * t;

      /* Tümüyle ekran dışındaysa hiç çizme. */
      const disari = (x, y) => (x < -160 || y < -160 || x > w + 160 || y > h + 160);
      if (disari(sx, sy) && disari(hx, hy) && disari(ox, oy)) continue;
      sayi++;

      /* YOL — toplarken yol çizilmez, ordu zaten varmış durumda. */
      if (ev.ad !== "topla") {
        c.beginPath();
        c.moveTo(sx, sy);
        c.lineTo(hx, hy);
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
        /* Yürürken: kılıç ikonu.
           KENDİ ORDUMDA SÜRE YAZILMAZ — aynı süre sol üstteki sefer
           listesinde zaten duruyor; haritada tekrarlamak hem yazı
           çizimi maliyeti hem görsel gürültü.
           BAŞKASININ ordusunda AD yazılır: kimin ordusu olduğu
           haritadan başka yerde görünmüyor. */
        c.textBaseline = "middle";
        c.font = Math.round(punto * 1.5) + "px serif";
        c.fillText("⚔️", ox, oy);

        if (!benim && s.sahipAd) {
          c.textBaseline = "top";
          c.font = "800 " + punto + "px " + HARITA_FONT;
          yaziAnahat(c, s.sahipAd, ox, oy + punto * 0.95, renk, punto);
        }
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

  /* ═════════════════════════════════════════════════════════════════════
     ÜST KATMAN ÇİZİMİ
     Düğümler + sefer yolları. Zemine DOKUNMAZ, o yüzden saniyede
     60 kez çizilebilir. Ekranı tamamen siler ve yeniden çizer;
     görünen öge sayısı onlarla ölçüldüğü için bu ucuzdur.
     ═════════════════════════════════════════════════════════════════════ */
  function cizUst() {
    if (!uctx || !uv) return;
    ustIstendi = false;      /* bekleyen istek varsa düşür, iş burada yapıldı */

    const panX = (typeof mapPanX !== "undefined") ? mapPanX : 0;
    const panY = (typeof mapPanY !== "undefined") ? mapPanY : 0;
    const zoom = (typeof mapZoom !== "undefined") ? mapZoom : 1;
    const w = uv.width / dpr, h = uv.height / dpr;

    uctx.setTransform(1, 0, 0, 1, 0, 0);
    uctx.clearRect(0, 0, uv.width, uv.height);

    let dugumSayi = 0;
    try { dugumSayi = cizDugumler(uctx, panX, panY, zoom, w, h); } catch (e) {}
    try { cizSeferler(uctx, panX, panY, zoom, w, h); } catch (e) {}

    if (CFG.fpsGoster) {
      const simdi = performance.now();
      fpsSayac++;
      if (simdi - fpsZaman > 500) {
        fps = Math.round((fpsSayac * 1000) / (simdi - fpsZaman));
        fpsSayac = 0; fpsZaman = simdi;
      }
      sonKare = simdi;
      const el = document.getElementById("isoFps");
      if (el) el.textContent = fps + " fps · " + sonCizilenKaro + " karo · " + dugumSayi + " düğüm";
    }

    ustDonguKontrol();
  }

  function cizUstIste() {
    if (ustIstendi) return;
    ustIstendi = true;
    requestAnimationFrame(() => { ustIstendi = false; cizUst(); });
  }

  /* Yürüyen sefer varsa üst katman kendi kendine dönmeli (akan çizgi
     ve ilerleyen ordu). Sefer yoksa döngü DURUR — boşta pil yakmaz. */
  function seferVarMi() {
    try {
      const S = window.SEFER;
      if (!S || !S.liste) return false;
      const l = S.liste();
      return !!(l && l.length);
    } catch (e) { return false; }
  }

  function ustDonguKontrol() {
    const gerek = seferVarMi();
    if (gerek && !ustDonguId) {
      const adim = () => {
        ustDonguId = null;
        cizUst();                       /* kendi içinde tekrar kontrol eder */
      };
      ustDonguId = requestAnimationFrame(adim);
    } else if (!gerek && ustDonguId) {
      cancelAnimationFrame(ustDonguId);
      ustDonguId = null;
    }
  }

  /* Aynı karede iki kez çizmeyi engeller */
  function cizIste() {
    if (cizimIstendi) return;
    cizimIstendi = true;
    requestAnimationFrame(() => { cizimIstendi = false; ciz(); });
  }

  /* ── TEK KARE: ZEMİN + KALELER + EV BUTONU ──
     TİTREME SEBEBİ BUYDU: zemin (canvas) bir sonraki kareye ertelenip
     çiziliyordu, kalelerin (DOM) left/top'u ise parmak olayının TAM O
     ANINDA yazılıyordu. Parmak hareketi kare hızından sık geldiği için
     kale bir karede 2-3 kez yeni yere, zemin ise hâlâ eski yere
     denk geliyordu → kale zeminin üstünde titriyordu.

     Artık üçü de AYNI requestAnimationFrame içinde, aynı pan değeriyle
     yazılıyor. Kaydırma sırasında ikisi asla ayrışmaz.

     DİKKAT: applyMapPan buradan geçer; dugumleriYerlestir'i doğrudan
     çağıran başka bir yol eklenirse titreme geri gelir. */
  let kareIstendi = false;
  function kareIste() {
    if (kareIstendi) return;
    kareIstendi = true;
    requestAnimationFrame(() => {
      kareIstendi = false;
      evButonu();
      dugumleriYerlestir();
      ciz();
    });
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

    /* ── HARİTA KAPALIYKEN KARAR VERME ──
       Saldırı/arazi paneli açılırken battleMapWrap display:none olur.
       Kapalı elemanın genişliği ve yüksekliği 0'dır. O anda buraya
       girilirse HER kale "ekran dışı" sayılır, display:none yazılır ve
       "gorunur=false" işaretiyle bir daha dokunulmaz — panel kapanınca
       kaleler görünmez kalır, ancak oyuncu haritayı kaydırınca geri
       gelirdi. Ölçü yoksa hiçbir şey yazmadan çıkıyoruz: kaleler
       neyse o hâlde kalır. */
    if (!(gorW > 0) || !(gorH > 0)) return;

    /* Etiket kısma kaldırıldı: düğümler canvas'a taşındı, bu döngüde
       artık yalnız KALELER var (birkaç tane). Onların adı her zaman
       görünmeli — kimin kalesi olduğu haritanın temel bilgisi. */

    /* ── KONUM ARTIK left/top DEĞİL, transform ──
       MİKRO TİTREME SEBEBİ BUYDU: left/top piksel değerleri yerleşim
       (layout) üretir ve tarayıcı elemanın boyandığı kutuyu TAM
       piksele oturtur. Zemin canvas'ı ise ondalık piksel hassasiyetiyle
       kayıyor. Sonuç: harita 0.3 px kayarken kale ya hiç kaymıyor ya
       da 1 px birden zıplıyor — kale, zeminin üstünde yerinde
       titriyormuş gibi görünüyordu. Sağa-sola kaydırmada en belirgin
       haliydi, çünkü yatay yol en uzun olanı.

       transform ondalık kalır, yerleşim doğurmaz ve zeminle aynı
       hassasiyette hareket eder. translate3d ayrıca elemanı kendi
       katmanına alır; boyama yükü de düşer.

       SIRA ÖNEMLİ: önce translate3d (ekran konumu), sonra
       translate(-50%,-50%) (kendi merkezine oturtma), en sonda scale.
       Sıra bozulursa -50% ölçeklenir ve kale karodan kayar. */
    const donusumSonu = " translate(-50%,-50%) scale(" + olcek + ")";
    const liste = dugumOnbellegi(mapEl);

    /* ── ETİKET KARŞI ÖLÇEĞİ ──
       Kale düğümü zoom ile orantılı büyüyor (yukarıdaki scale). İsim
       etiketi de onun içinde olduğu için yakınlaşınca dev harflere
       dönüşüyordu. Burada etiket, kendi kutusunda TERS ölçeklenerek
       en fazla 1 katta tutulur:

         yakınlaşırken (olcek > 1) → yazı sabit kalır
         uzaklaşırken  (olcek < 1) → yazı düğümle birlikte küçülür

       Kutuya değil CSS değişkenine yazılıyor: transform'un kendisi
       CSS'te duruyor (translate + scale), buradan sadece çarpan
       geçiliyor. Yoksa satır içi transform, konumu da ezerdi.

       Değer DEĞİŞMEDİKÇE yazılmıyor — kaydırma karelerinde zoom
       sabittir, boşuna stil yazmak yeniden boyama doğurur. */
    const etK = olcek > 1 ? (1 / olcek) : 1;
    if (mapEl._etK !== etK) {
      mapEl._etK = etK;
      mapEl.style.setProperty("--et-k", etK);
    }

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
        /* index.html elemanı yüzdeli left/top ile doğuruyor; transform
           konumu onun ÜSTÜNE eklenir, sıfırlanmazsa kale kayar.
           Bir kez yazmak yeter — her karede değil. */
        d.el.style.left = "0px";
        d.el.style.top = "0px";
        d.el.style.willChange = "transform";
        d.gorunur = true;
      }
      d.el.style.transform = "translate3d(" + sx + "px," + sy + "px,0)" + donusumSonu;
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

      /* DİKKAT: Buraya kalelerdeki gibi transform YAZILMAZ.
         .coord-marker ve .coord-share'in CSS animasyonları
         (coordMarkerPulse / coordShareDrop) transform'u sürüyor ve
         CSS animasyonu satır içi stili EZER — inline transform
         yazarsak işaret animasyonun ilk karesine, yani haritanın
         köşesine sıçrar. Bu ikisi left/top ile kalacak; ikisi de
         geçici ve tek tane, titreme farkı görünmez. */
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
     ATMOSFER — TEMAS GÖLGESİ · VİNYET · ORTAK IŞIK
     ---------------------------------------------------------------------
     Ayarların tamamı CFG.atmosfer'de; buradaki iş onları ekrana
     bağlamak. Değer değiştirdikten sonra:
         HARITA.atmosferUygula(); HARITA.cizUstIste();

     KATMAN SIRASI (hepsi #battleMapScroll'un içinde):
         z0  isoGround   zemin canvas'ı
         z1  isoUst      düğümler, sefer yolları
         z5  battleMap   kaleler (DOM)
         z6  isoVinyet   loşluk — kenarlara doğru koyulaşan hava
         z7  isoGrade    ortak ışık — soft-light

     VİNYET VE GRADE NEDEN KALELERİN ÜSTÜNDE: altında kalsalardı
     kaleler sahnenin ışığından muaf olur, karanlık bir zeminin
     üstünde parlak birer çıkartma gibi dururdu — düzeltmeye
     çalıştığımız şeyin ta kendisi.

     isolation:isolate NEDEN ŞART: mix-blend-mode, elemanın KENDİ
     yığın bağlamındaki her şeyle karışır. Bağlam açılmazsa karışım
     sayfanın tamamına (panellere, HUD'a) taşar. Bu satır sahayı
     harita kutusunun içine hapseder.
     ═════════════════════════════════════════════════════════════════════ */

  /* Katmanı bir kez kurar, sonraki çağrılarda aynısını döndürür. */
  function atmosKat(ana, id, z) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      ana.appendChild(el);
    }
    if (el.parentNode !== ana) ana.appendChild(el);
    el.style.cssText =
      "position:absolute; inset:0; pointer-events:none; z-index:" + z + ";";
    return el;
  }

  function atmosferUygula() {
    const scroll = document.getElementById("battleMapScroll");
    if (!scroll) return;
    const A = CFG.atmosfer;

    /* Fırça gölgenin RENGİNİ pişirip saklıyor; renk değişmiş
       olabilir, önbelleği düşür. */
    _golgeFirca = null;

    /* Tane deseni zemin parçalarının İÇİNE pişiyor. Değişince desen
       de parçalar da düşürülmeli, yoksa konsoldan/panelden yapılan
       değişiklik ekranda görünmez.

       AMA HER ÇAĞRIDA DEĞİL: ?isik=1 paneli sürgüyü her oynattığında
       burayı çağırıyor. Koşulsuz boşaltılsaydı sürgüyü sürüklerken
       ekrandaki ~30 parça saniyede onlarca kez yeniden pişer, telefon
       kilitlenirdi. Yalnız TANE ayarları değiştiyse boşaltılır;
       vinyet/grade/gölge zaten parçaya girmiyor, onlar CSS. */
    const D = A.doku;
    /* doygunlukLav CFG.atmosfer'in DIŞINDA ama parçaya o da pişiyor:
       imzaya girmezse ?isik=1'deki lav sürgüsü ekranda hiçbir şey
       yapmaz. Zemine pişen ne varsa buraya eklenmeli. */
    const imza = (A.acik ? 1 : 0) + "|" + D.guc + "|" + D.genlik + "|" + D.boy +
                 "|" + CFG.doygunlukLav + "|" + CFG.lekeAci + "|" + CFG.lekeUzat;
    if (imza !== _dokuImza) {
      _dokuImza = imza;
      _dokuDesen = null;
      onbellegiBosalt();
      cizIste();
    }

    scroll.style.isolation = "isolate";

    const vin = atmosKat(scroll, "isoVinyet", 6);
    const gra = atmosKat(scroll, "isoGrade",  7);

    /* ── VİNYET ──
       Merkez (ic yarıçapına kadar) TAMAMEN dokunulmadan kalır; renk
       oradan dışarı doğru açılır. Ortadaki durak olmasaydı karartma
       haritanın göbeğine sürünür, zemin kirli görünürdü. */
    const V = A.vinyet;
    if (A.acik && V.guc > 0) {
      const ic  = Math.max(0, Math.min(0.95, V.ic));
      const ort = ic + (1 - ic) * 0.55;
      vin.style.display = "block";
      vin.style.background =
        "radial-gradient(ellipse " + V.enX + "% " + V.enY + "% at 50% " + V.merkezY + "%," +
        " rgba(" + V.renk + ",0) 0%," +
        " rgba(" + V.renk + ",0) " + (ic * 100).toFixed(1) + "%," +
        " rgba(" + V.renk + "," + (V.guc * 0.30).toFixed(3) + ") " + (ort * 100).toFixed(1) + "%," +
        " rgba(" + V.renk + "," + V.guc.toFixed(3) + ") 100%)";
    } else {
      vin.style.display = "none";
    }

    /* ── ORTAK IŞIK ──
       Ortadaki durak SAYDAM: soft-light saydam renkle hiçbir şey
       yapmaz, yani haritanın göbeği el değmeden kalır. Etki yalnız
       üstte (serin gök ışığı) ve altta (koyu zemin yansıması). */
    const Gr = A.grade;
    if (A.acik && Gr.guc > 0) {
      gra.style.display = "block";
      gra.style.mixBlendMode = Gr.kip;
      gra.style.opacity = String(Gr.guc);
      gra.style.background =
        "linear-gradient(180deg," + Gr.ustRenk + " 0%," +
        " rgba(0,0,0,0) 46%," + Gr.altRenk + " 100%)";
    } else {
      gra.style.display = "none";
    }

    /* ── KALELERİN TEMAS GÖLGESİ ──
       DOM kaleleri canvas'ta değil, o yüzden gölgeleri de CSS.
       Gölge .node-avatar'ın İÇİNE konur: kutunun ölçüsü ve dy
       kaydırması seviyeye göre değişiyor (index.html), gölge onun
       içinde durunca bu tabloyu okumadan hepsine birden oturur.

       z-index:-1 ŞART: ::after ağaçta img'den sonra gelir, yani
       yazılmazsa gölge kalenin ÜSTÜNE basılır. .node-avatar
       position:relative + z-index:1 taşıdığı için kendi yığın
       bağlamını açar; -1 gölgeyi img'nin altına indirir ama
       kutunun dışına (zeminin altına) DÜŞÜRMEZ.

       Yükseklik yüzdesi kutunun KARE olmasına dayanır (132x132,
       252x252 …). Kutu bir gün dikdörtgen yapılırsa burası
       aspect-ratio'ya çevrilmeli. */
    const GL = A.golge;
    let st = document.getElementById("isoAtmosStil");
    if (!st) {
      st = document.createElement("style");
      st.id = "isoAtmosStil";
      document.head.appendChild(st);
    }
    if (A.acik && GL.kaleGuc > 0) {
      const rgb = GL.renk.join(",");
      const boy = (GL.kaleEn / GL.kaleOran).toFixed(2);
      st.textContent =
        ".map-node.castle-node .node-avatar::after{" +
        "content:''; position:absolute; z-index:-1; pointer-events:none;" +
        "left:50%; top:" + GL.kaleY + "%;" +
        "width:" + GL.kaleEn + "%; height:" + boy + "%;" +
        "transform:translate(-50%,-50%);" +
        "opacity:" + GL.kaleGuc.toFixed(3) + ";" +
        "background:radial-gradient(closest-side," +
        " rgba(" + rgb + ",1) 0%," +
        " rgba(" + rgb + ",.80) 40%," +
        " rgba(" + rgb + ",.28) 72%," +
        " rgba(" + rgb + ",0) 100%);}";
    } else {
      st.textContent = "";
    }
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

      /* Ev butonu, kaleler ve zemin TEK karede birlikte yazılır.
         Ayrı ayrı çağrılırsa kaleler zeminden bir kare önde gider
         ve kaydırırken titrer. */
      kareIste();
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
         Pay artık EKRAN BOYUTUNDAN hesaplanmıyor. Eski hesap
         (yariX + yariY) telefonda 10-19 karoluk bir bant üretiyordu
         ve kenara yakın koordinatlar ULAŞILMAZ oluyordu: paylaşılan
         konuma gidilince kamera erken duruyor, ekranın ortasında
         başka bir karo kalıyordu.

         Yeni kural: merkez ızgaranın herhangi bir karosuna gidebilir.
         Kenarda ekranın bir kısmının boş kalması kabul edilir —
         koordinatın yanlış yeri göstermesi kabul edilmez. */
      const pay = Math.max(0, Math.min(G / 2, CFG.kameraKenarPayi || 0));

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

  /* ── ÇOK PARMAK KİLİDİ ──
     UÇMA SEBEBİ BUYDU: atalet kodu parmak sayısına bakmıyordu. İki
     parmakla yakınlaştırırken her iki parmağın pointermove'u da buraya
     geliyor ve "e.clientX - sonX" aslında İKİ PARMAK ARASINDAKİ
     MESAFE oluyordu. Kıstırma bitince elde kocaman sahte bir hız
     kalıyor, ilk parmak kalkar kalkmaz harita o hızla fırlıyordu.

     parmaklar: o an ekranda olan parmakların kimlikleri.
     kistirma:  bu dokunuş sırasında hiç 2 parmak oldu mu. Olduysa
                parmaklar kalkarken kayma HİÇ başlatılmaz. */
  const parmaklar = new Set();
  let kistirma = false;

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
      parmaklar.add(e.pointerId);
      akisiDurdur();

      if (parmaklar.size >= 2) {      /* ikinci parmak indi → kıstırma */
        kistirma = true;
        parmakVar = false;            /* hız ölçümü tamamen dursun */
        return;
      }

      parmakVar = true;
      sonX = e.clientX; sonY = e.clientY; sonAn = performance.now();
    }, { passive: true });

    wrap.addEventListener("pointermove", e => {
      if (!parmakVar || kistirma || parmaklar.size >= 2) return;
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

    const birak = (e) => {
      parmaklar.delete(e.pointerId);

      /* Hâlâ ekranda parmak var (kıstırmanın ilk parmağı kalktı).
         Kayma başlatma — asıl uçma buradan oluyordu. */
      if (parmaklar.size > 0) { parmakVar = false; hizX = hizY = 0; return; }

      const kistirmaydi = kistirma;
      kistirma = false;

      if (!parmakVar) { hizX = hizY = 0; return; }
      parmakVar = false;
      kenarDurdur();

      /* Bu dokunuşta yakınlaştırma yapıldıysa hiç akıtma */
      if (kistirmaydi) { hizX = hizY = 0; return; }

      /* Parmak hareketsiz bekleyip kalktıysa akıtma */
      if (performance.now() - sonAn > 90) { hizX = hizY = 0; return; }

      /* Çok küçük hızlar dokunuş sayılır, akıtma */
      if (Math.abs(hizX) < 1.5 && Math.abs(hizY) < 1.5) { hizX = hizY = 0; return; }

      akisId = requestAnimationFrame(akisAdimi);
    };

    wrap.addEventListener("pointerup", birak, { passive: true });
    wrap.addEventListener("pointercancel", birak, { passive: true });
    wrap.addEventListener("pointerleave", birak, { passive: true });

    /* HAYALET PARMAK. Tarayıcı arka plana atıldığında (başka uygulamaya
       geçme, sekme değiştirme) parmağın kalktığı haberi HİÇ gelmiyor.
       "parmaklar" listesi dolu kalıyor, "kistirma" açık kalıyor; geri
       dönünce ilk dokunuş ikinci parmak sayılıyor ve harita cevap
       vermiyor. Ekran geri geldiğinde durumu sıfırlıyoruz. */
    function parmaklariSifirla() {
      parmaklar.clear();
      kistirma = false;
      parmakVar = false;
      hizX = hizY = 0;
      if (typeof kenarDurdur === "function") { try { kenarDurdur(); } catch (e) {} }
    }
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) parmaklariSifirla();
    });
    window.addEventListener("pageshow", parmaklariSifirla);
    window.addEventListener("blur", parmaklariSifirla);
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
    atmosferUygula();
    /* Doku yükleme kaldırıldı — zemin artık düz renkle boyanıyor. */
    bagla();
    kurArayuz();
    ataletKur();
    uygulaMod();

    /* Ölçü değişince zemin YENİDEN çizilir ama düğümler kendiliğinden
       yerleşmezdi. Panel kapanıp harita yeniden görünür olduğunda
       (0 → gerçek ölçü) burası tetiklenir; kaleleri de yerleştirmek
       gerekiyor, yoksa oyuncu ekranı kaydırana kadar görünmezler. */
    window.addEventListener("resize", () => {
      boyutlandir(); cizIste(); dugumleriYerlestir();
    });
    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        boyutlandir(); cizIste(); dugumleriYerlestir();
      }).observe(document.getElementById("battleMapWrap"));
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
  /* ── UÇ PAYI KARO CİNSİNDEN (sefer.js süreyi buradan kısaltır) ──
     Çizimde yol kalenin kenarında başlayıp kenarında bitiyorsa,
     mesafe de o kenarlara göre ölçülmeli. Çizimle AYNI iki fonksiyonu
     kullanır (dugumEkranKutusu + kutuPayi), ikinci bir formül yok.
     Dönen sayı KARO'dur: bir karo, o yönde iki yarıçap eder.
     Harita henüz çizilmemişse veya düğüm bulunamazsa 0 döner; süre
     tam mesafeden hesaplanır, sefer yine çalışır. */
  function yolPayiKaro(fgx, fgy, tgx, tgy) {
    try {
      const A = ekranKonumu(fgx, fgy), B = ekranKonumu(tgx, tgy);
      const dx = B.x - A.x, dy = B.y - A.y;
      const L = Math.hypot(dx, dy);
      if (!(L > 0.001) || !(A.zoom > 0)) return 0;

      const ux = dx / L, uy = dy / L;
      const bolen = Math.abs(ux) / HALF_W + Math.abs(uy) / HALF_H;
      if (!(bolen > 0)) return 0;
      const yaricapDunya = 1 / bolen;              /* yarım karo, dünya px */
      const karoPayi = yaricapDunya * A.zoom;      /* ekran px */

      const cikis = Math.max(karoPayi,
        kutuPayi(dugumEkranKutusu(fgx, fgy), A.x, A.y, ux, uy) * YOL_PAY_KATSAYI);
      const varis = Math.max(karoPayi,
        kutuPayi(dugumEkranKutusu(tgx, tgy), B.x, B.y, -ux, -uy) * YOL_PAY_KATSAYI);

      const toplam = Math.min(cikis + varis, L);
      const karoPx = 2 * yaricapDunya * A.zoom;    /* bir karo, ekran px */
      return karoPx > 0 ? toplam / karoPx : 0;
    } catch (e) { return 0; }
  }

  window.HARITA = { CFG, ciz, cizIste, gridToWorld, worldToGrid, biyom, ortala,
                    dugumleriYerlestir, ekranKonumu, merkezle, ORAN, onbellegiBosalt,
                    dugumOnbellegiBosalt, yolPayiKaro,
                    /* canvas düğüm katmanı */
                    dugumBul, dugumTazele, cizUstIste,
                    ekranaGoreIzgara,
                    /* atmosfer — CFG.atmosfer değiştirdikten sonra çağır */
                    atmosferUygula,
                    /* Eski harita modu kaldırıldı; missile.js hâlâ soruyor,
                       cevap her zaman evet. */
                    aktifMi: function () { return true; } };
})();
