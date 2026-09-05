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
    gecisBandi: 0.007,

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
      genislik: 0.055,
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
      doygunluk: 1.10,
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
       kaldığı için 1.22 → 1.34. */
    doygunluk: 1.34,

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

    /* Lekeler ekranda YATAY eziliyor. İzometrik zeminde desen yuvarlak
       olursa göz onu dik bir duvar gibi okur; yatay uzayınca yere
       serilmiş gibi durur. Büyütürsen daha yatık, 1 = yuvarlak. */
    lekeYatay: 2.4,

    /* ── KABARTMA (RÖLYEF) ──
       Haritanın ısı haritası gibi durmasının kök sebebi: zeminde
       hiçbir YÜKSEKLİK bilgisi yoktu. Göz eğimi ancak sabit yönlü bir
       ışık bir yükseklik alanına vurduğunda okur. Burada görünmez bir
       yükseklik alanı üretilir; renk, KOMŞU ÖRNEKLERİN FARKINDAN
       çıkan eğime göre açılıp koyulaşır.

       PERFORMANS: eğim yeni gürültü çağırarak değil, parça tamponunda
       ZATEN yan yana duran örneklerden hesaplanır — ikinci geçiş saf
       aritmetiktir. Zemin parça parça BİR KEZ pişer, kare başına
       maliyet S I F I R artar.

       KRİTİK: yükseklik yalnız BOYAMAYA girer. `biyomDeger()`'in ham
       çıktısına dokunulmaz — dokunulsaydı hangi karonun lav olduğu
       değişir, mevcut kaleler başka arazide kalırdı.

       guc:       0 = KAPALI (ikinci geçiş hiç çalışmaz). 1 = normal.
       yukseklik: eğim kazancı. Büyürse tepeler dikleşir. zeminAdim'a
                  göre normalize edilir, örnekleme sıklığı değişse de
                  görünüm aynı kalır.
       siklik:    tepelerin büyüklüğü. KÜÇÜK sayı = BÜYÜK tepe.
                  0.6 ≈ 3 karo boyu. 2.0 üstü tümüvar deseni olur.
       gunesX/Y:  ışığın EKRAN uzayındaki yönü. (-0.55,-0.83) = sol üstten.
                  Dünya uzayına konsaydı kaydırırken ışık zeminle beraber
                  kayar, leke gibi okunurdu.
       sertlik:   eğim karşıtlığı. 1 = yumuşak, 2 = sert.
       egimYatay: yatay (çapraz) eğimin ağırlığı.
       egimDikey: dikey (aşağı yukarı) eğimin ağırlığı.
                  İkisi ayrı tutuluyor: eşitken izometrik zemin dik bir
                  duvar gibi okunabiliyor, dikeyi kısınca yere serilir.
       basamak:   0 = yumuşak. >0 ise yükseklik bu kadar kademeye
                  yuvarlanır; düzlüklerde eğim sıfırlanır, kademe
                  aralarında kontur çizgisi belirir.
       tonlama:   yüksek yer hafif açık, alçak yer hafif koyu. Eğimden
                  bağımsız, düz bir irtifa tonu. 0 = kapalı. */
    kabartma: {
      guc: 0.55,
      yukseklik: 6,
      siklik: 0.6,
      gunesX: -0.55,
      gunesY: -0.83,
      sertlik: 1.0,
      egimYatay: 1.0,
      egimDikey: 1.0,
      basamak: 0,
      tonlama: 0.12,

      /* ── AYDINLIK / KARANLIK GÜCÜ ──
         Aydınlık taraf BEYAZA KARIŞTIRILMAZ, parlaklık ÇARPILIR.
         Beyaz karıştırma doygunluğu öldürür: lavda kırmızı pembeye
         kayar ve zeminde "beyaz pus" olarak okunur. Çarpmada renk
         açısı sabit kalır, yalnız parlaklık artar — lav lav kalır.
         Kar zaten beyaza yakın olduğu için üst sınırı kendiliğinden
         kırpılır, ayrı kural gerekmez. */
      aydinlik: 0.20,
      karanlik: 0.42,
    },

    /* ── KIYI ÇİZGİSİ ──
       Biyom sınırında ince bir koyu kenar. Kar↔çimen ve çimen↔lav
       geçişi "renk kesmesi" olmaktan çıkıp sahil gibi okunur.

       Ek gürültü MALİYETİ YOK: biyom değeri (v) zaten zeminRengi
       içinde hesaplanıyor, dışarı alınıp eşiğe uzaklığına bakılıyor.

       guc:       0 = KAPALI. Çizginin genel gücü.
       kalinlik:  biyom DEĞERİ cinsinden yarı en. 0.012 ≈ 3 karo.
                  Piksel değil — zoom'la kalınlaşıp incelmez, arazinin
                  kendi özelliğidir.
       koyuluk:   kenarın ne kadar karardığı (0..1). */
    kiyi: {
      guc: 0.45,
      kalinlik: 0.012,
      koyuluk: 0.45,
    },

    /* ── KARO TONU ──
       "Harita açısı kalelere uymuyor" şikayetinin KÖKÜ burasıydı.
       Zemin karo karo çizilmiyordu: parçanın dünya dikdörtgeni
       gürültüyle boyanıp bulanıklaştırılarak büyütülüyordu. Yani
       zeminde tek bir düz çizgi, tek bir 2:1 eğimli kenar, tek bir
       köşe yoktu — her şey yuvarlak lekeydi. Kaleler ise keskin
       kenarlı ve fasetalı. Göz kalede izometri görüyor, zeminde
       hiçbir geometri görmüyordu. Açı yanlış değildi; açı YOKTU.

       Çözüm: her karo, eşkenar dörtgeni kadar bir alanı kendi sabit
       ton farkıyla kaplıyor. KENAR ÇİZGİSİ YOK — sadece ton. Göz
       kafes düzenini çizgisiz de yakalar, zemin pürüzsüz kalır.

       Kare başına maliyeti SIFIR: parça önbelleği aynen duruyor,
       dolgu yalnız pişirme sırasında bir kez yapılıyor.

       guc:        ton farkının şiddeti. 0 = KAPALI (eski düz zemin).
                   0.30 üstü mozaik gibi durur, pürüzsüzlük kaçar.
       kumeSiklik: tonların öbekleşmesi. KÜÇÜK sayı = GENİŞ öbek.
                   Öbekleşme olmasaydı tuz-biber deseni çıkardı.
       karisim:    komdan karoya sıçrama payı (0..1). 0 = tamamen
                   yumuşak öbek, 1 = her karo bağımsız zıplar.
       tasma:      komşu karolar arasında saç teli boşluk kalmasın
                   diye her dörtgen bu kadar dünya pikseli büyütülür.
                   Kenar yumuşatması yüzünden şart; 0 yapılırsa karo
                   aralarında ince ağ çıkar. */
    karoTon: {
      guc: 0.16,
      kumeSiklik: 0.22,
      karisim: 0.45,
      tasma: 0.8,
    },

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
    onbellekBoyu: 48,

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

  /* ══ İNCE AYAR: VARSAYILAN ANLIK GÖRÜNTÜSÜ ══
     `?haritaayar=1` panelindeki "SIFIRLA" bunu okur. Kayıt
     UYGULANMADAN ÖNCE alınıyor — sonra alınsaydı "varsayılan",
     geçen oturumda kaydedilen değer olurdu ve ilk haline bir daha
     hiç dönülemezdi. CFG'de fonksiyon yok, JSON kopyası yeterli. */
  const CFG_VARSAYILAN = JSON.parse(JSON.stringify(CFG));

  /* ══ İNCE AYAR: KAYITLI DEĞERLERİ GERİ YÜKLE ══
     Burası TÜRETİLMİŞ ÖLÇÜLERDEN ÖNCE çalışmak zorunda:
     HALF_W / ORIGIN_X / WORLD_W aşağıda `const` olarak BİR KEZ
     hesaplanıyor. tileW/tileH bu yüzden panelde canlı sürülemez,
     "kaydet + yenile" ile çalışır.

     Yalnız SAYI alanları yazılır ve hedefin kendisi de sayı olmalı —
     böylece bozuk/eski bir kayıt CFG'nin yapısını kıramaz. Kayıt
     yoksa hiçbir şey olmaz, oyun varsayılanlarla açılır. */
  try {
    const _kayit = JSON.parse(localStorage.getItem("bdHaritaAyar") || "null");
    if (_kayit) for (const yol in _kayit) {
      const par = yol.split(".");
      let o = CFG;
      for (let i = 0; i < par.length - 1 && o; i++) o = o[par[i]];
      const son = par[par.length - 1];
      if (o && typeof o[son] === "number" && typeof _kayit[yol] === "number") {
        o[son] = _kayit[yol];
      }
    }
  } catch (e) { /* bozuk kayıt oyunu durdurmaz */ }

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

    dpr = Math.min(window.devicePixelRatio || 1, 2);  // 3x'te bellek boşuna şişiyor
    cv.width  = Math.round(r.width  * dpr);
    cv.height = Math.round(r.height * dpr);
    if (uv) { uv.width = cv.width; uv.height = cv.height; }
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
     Izgara koordinatında örneklenir (lekeYatay uygulanmaz): benekler
     karo ölçüsünde kalsın, yatay şeritlere dönüşmesin. */
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
  function cimenKaleRengi(gx, gy) {
    const Z = CFG.cimenKale;
    let c = [Z.renk[0], Z.renk[1], Z.renk[2]];

    const f  = Z.siklik;
    const eu = (gx - gy) / CFG.lekeYatay * f;
    const ev = (gx + gy) * f;

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

  /* ── KARO TONU ──
     Karo koordinatının SAF fonksiyonu. Bu şart: parça canvas'ları
     dikdörtgen ve birbirinin üstüne binerek çiziliyor. Ton karonun
     kendisinden değil de parçadan türetilseydi, binen bölgelerde iki
     parça farklı ton üretir ve dikdörtgen sınırları görünürdü.

     İki bileşen: geniş öbekler (smoothNoise) + karodan karoya
     sıçrama (hash2). Yalnız öbek olsaydı kafes seçilmez, yalnız
     sıçrama olsaydı tuz-biber deseni çıkardı. */
  function karoTonDeger(gx, gy) {
    const T = CFG.karoTon;
    const f = T.kumeSiklik || 0.22;
    const k = smoothNoise(gx * f + 53, gy * f + 11);
    const j = hash2(gx * 1.7 + 9, gy * 1.7 + 23);
    const m = T.karisim != null ? T.karisim : 0.45;
    return k * (1 - m) + j * m;
  }

  /* ── YÜKSEKLİK ALANI ──
     Görünmez. Yalnız boyamada kullanılır; biyoma HİÇ girmez.

     DÜNYA PİKSELİ uzayında örnekleniyor, ızgara koordinatında değil.
     Sebep: ızgarada örneklenirse ekranda ezilir, tepe yuvarlak değil
     eğri çıkar. x frekansı y'nin YARISI — izometride zeminde yuvarlak
     olan şey ekranda 2:1 geniş görünür, tepe de öyle görünmeli.

     İki katman: geniş tepeler + üzerine kırışıklık. Üçüncü katman
     eklenmedi — zemin zaten zeminAdim (10 dünya piksel) aralıkla
     örnekleniyor, daha ince desen örneklemeye takılıp pusa döner. */
  function yukseklikDeger(wx, wy) {
    const K = CFG.kabartma;
    const f = (K.siklik || 0.6) * 0.01;
    const x = wx * f * 0.5;
    const y = wy * f;
    let h = smoothNoise(x + 211,       y + 137)       * 0.62
          + smoothNoise(x * 2.7 + 19,  y * 2.7 + 83)  * 0.38;
    const b = K.basamak | 0;
    if (b > 0) h = Math.round(h * b) / b;
    return h;
  }

  /* cikti verilirse ham biyom değeri (serpme dahil) oraya yazılır.
     Kıyı çizgisi bunu kullanır — yeniden hesaplanırsa serpmeSapma
     ikinci kez çağrılır ve pişirme boşuna pahalılaşır. */
  function zeminRengi(gx, gy, cikti) {
    const R = CFG.zeminRenk, A = CFG.lekeAyar;
    /* Serpme YALNIZ boyamada. biyom()/biyomKarisim() ham değeri
       okumaya devam eder — kale/düğüm arazisi kaymasın. */
    const v = biyomDeger(gx, gy) + serpmeSapma(gx, gy);
    const w = biyomAgirlik(v);
    if (cikti) cikti.v = v;

    /* Saf çimen: kar/lav hesabına hiç girme */
    if (w[1] >= 0.999) return cimenKaleRengi(gx, gy);

    /* 1. Biyom rengi */
    let c = [
      R.kar[0] * w[0] + R.cimen[0] * w[1] + R.lav[0] * w[2],
      R.kar[1] * w[0] + R.cimen[1] * w[1] + R.lav[1] * w[2],
      R.kar[2] * w[0] + R.cimen[2] * w[1] + R.lav[2] * w[2],
    ];

    /* ── İZOMETRİK EKSENLER ──
       eu = ekranda YATAY yön (gx - gy) · ev = DİKEY yön (gx + gy)
       eu frekansı düşük → lekeler yatay uzar, zemin yere serilmiş
       gibi durur. Izgara koordinatında örneklenirse yuvarlak çıkıyor
       ve harita dik bir duvar gibi görünüyor. */
    const eu = (gx - gy) / CFG.lekeYatay;
    const ev = (gx + gy);

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
    if (CFG.doygunluk !== 1) {
      const d = CFG.doygunluk;
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
    const C  = CFG.CHUNK;
    const tw = CFG.tileW, th = CFG.tileH;

    const gx0 = cx * C, gx1 = gx0 + C - 1;
    const gy0 = cy * C, gy1 = gy0 + C - 1;

    const minX = gridToWorld(gx0, gy1).x - PAY;
    const maxX = gridToWorld(gx1, gy0).x + tw + PAY;
    const minY = gridToWorld(gx0, gy0).y - PAY;
    const maxY = gridToWorld(gx1, gy1).y + th + PAY;

    const w = maxX - minX, h = maxY - minY;

    /* ── alçak çözünürlüklü tampon ──
       PADC: tamponun her yanında kaç HÜCRE fazladan örneklendiği.
       1 değil 2 — kabartma eğimi merkezi farkla (i-1, i+1) hesaplanıyor,
       yani kopyalanan bölgenin EN DIŞ sırasının da bir komşusu olmalı.
       1 kalırsa parça kenarlarında gölgesiz bir çerçeve, dolayısıyla
       komşu parçayla arasında ince çizgi kalır. */
    const A    = Math.max(4, CFG.zeminAdim);
    const PADC = 2;
    const LW = Math.ceil(w / A), LH = Math.ceil(h / A);
    const BW = LW + PADC * 2, BH = LH + PADC * 2;

    const lo   = document.createElement("canvas");
    lo.width   = BW;
    lo.height  = BH;
    const lx   = lo.getContext("2d");
    const veri = lx.createImageData(BW, BH);
    const p    = veri.data;

    const K  = CFG.kabartma || {};
    const KY = CFG.kiyi || {};
    const kabartmaAcik = (K.guc || 0) > 0;
    const kiyiAcik     = (KY.guc || 0) > 0 && (KY.kalinlik || 0) > 0;

    /* Yükseklik yalnız kabartma açıkken üretilir — kapalıyken iki
       smoothNoise çağrısı başına hiç girilmez. */
    const yuk = kabartmaAcik ? new Float32Array(BW * BH) : null;
    const cik = kiyiAcik ? { v: 0 } : null;

    /* ── 1. GEÇİŞ: renk + yükseklik + kıyı ── */
    for (let j = 0; j < BH; j++) {
      const wy = minY + (j - PADC + 0.5) * A;
      for (let i = 0; i < BW; i++) {
        const wx = minX + (i - PADC + 0.5) * A;
        const g  = worldToGrid(wx, wy);
        let   c  = zeminRengi(g.gx, g.gy, cik);
        const n  = j * BW + i;

        if (yuk) yuk[n] = yukseklikDeger(wx, wy);

        /* Kıyı: biyom değerinin eşiğe uzaklığı. Komşu gerektirmez,
           bu yüzden burada, ikinci geçişte değil. */
        if (cik) {
          const kal = KY.kalinlik;
          const d = Math.min(Math.abs(cik.v - CFG.esikKar),
                             Math.abs(cik.v - CFG.esikCimen));
          if (d < kal) {
            const t = yumusat(1 - d / kal) * KY.guc;
            c = renkKaris(c, renkKoy(c, KY.koyuluk), Math.min(1, t));
          }
        }

        const k  = n * 4;
        p[k]     = c[0];
        p[k + 1] = c[1];
        p[k + 2] = c[2];
        p[k + 3] = 255;
      }
    }

    /* ── 2. GEÇİŞ: kabartma ──
       Saf aritmetik. Tek bir gürültü çağrısı yok — eğim, birinci
       geçişte zaten doldurulmuş komşu örneklerin farkıdır. */
    if (kabartmaAcik) {
      /* zeminAdim'a göre normalize: örnekleme sıklaşınca komşu farkı
         küçülür, kazanç aynı oranda büyür — görünüm sabit kalır. */
      const kaz  = (K.yukseklik || 0) * (10 / A);
      const sx   = (K.gunesX != null ? K.gunesX : -0.55) * (K.egimYatay != null ? K.egimYatay : 1);
      const sy   = (K.gunesY != null ? K.gunesY : -0.83) * (K.egimDikey != null ? K.egimDikey : 1);
      const sert = K.sertlik || 1;
      const guc  = K.guc;
      const ton  = K.tonlama || 0;
      const gA   = (K.aydinlik != null ? K.aydinlik : 0.20);
      const gK   = (K.karanlik != null ? K.karanlik : 0.42);

      for (let j = 1; j < BH - 1; j++) {
        for (let i = 1; i < BW - 1; i++) {
          const n = j * BW + i;
          const dx = yuk[n + 1]  - yuk[n - 1];
          const dy = yuk[n + BW] - yuk[n - BW];

          /* Yüzey normali ekranda kabaca (-dx, -dy); ışıkla nokta
             çarpımı eğimin aydınlığını verir. */
          let t = -(dx * sx + dy * sy) * kaz * sert;

          /* İrtifa tonu: eğimden bağımsız düz yükseklik farkı */
          if (ton) t += (yuk[n] - 0.5) * ton;

          t *= guc;
          if (t > 1) t = 1; else if (t < -1) t = -1;
          if (t > -0.004 && t < 0.004) continue;

          /* Tek kural, iki yön: parlaklık çarpanı. Karıştırma yok,
             bu yüzden hiçbir bölgede renk gri/beyaz tarafa kaçmaz. */
          const k = n * 4;
          const m = t > 0 ? 1 + t * gA : 1 + t * gK;
          p[k]     = p[k]     * m;
          p[k + 1] = p[k + 1] * m;
          p[k + 2] = p[k + 2] * m;
        }
      }
    }

    lx.putImageData(veri, 0, 0);

    /* ── parça canvas'ına yumuşatarak büyüt ── */
    const c2 = document.createElement("canvas");
    c2.width  = Math.ceil(w * s);
    c2.height = Math.ceil(h * s);
    const x2  = c2.getContext("2d");
    x2.imageSmoothingEnabled = true;
    x2.imageSmoothingQuality = "high";
    x2.setTransform(s, 0, 0, s, 0, 0);
    x2.drawImage(lo, PADC, PADC, w / A, h / A, 0, 0, w, h);

    /* ── KARO TONU ──
       Zemin yıkamasının ÜSTÜNE, karo karo. Çizgi yok, yalnız dolgu.

       NEDEN GENİŞ ARALIK: parça canvas'ı DİKDÖRTGEN, içindeki karo
       bölgesi ise eşkenar dörtgen. Dikdörtgenin dört köşe üçgeni
       KOMŞU parçaların karolarına denk gelir ve parçalar üst üste
       binıyor. Yalnız kendi karolarını tonlasaydık binen bölgede
       tonlu/tonsuz farkı çıkar, parça sınırları dikdörtgen olarak
       görünürdü. Bu yüzden dikdörtgene değen TÜM karolar çizilir;
       ton karonun saf fonksiyonu olduğu için binen yerler birebir
       aynı çıkar. */
    const T = CFG.karoTon;
    if (T && T.guc > 0) {
      const k1 = worldToGrid(minX, minY), k2 = worldToGrid(maxX, minY);
      const k3 = worldToGrid(minX, maxY), k4 = worldToGrid(maxX, maxY);
      const tgx0 = Math.floor(Math.min(k1.gx, k2.gx, k3.gx, k4.gx)) - 1;
      const tgx1 = Math.ceil (Math.max(k1.gx, k2.gx, k3.gx, k4.gx)) + 1;
      const tgy0 = Math.floor(Math.min(k1.gy, k2.gy, k3.gy, k4.gy)) - 1;
      const tgy1 = Math.ceil (Math.max(k1.gy, k2.gy, k3.gy, k4.gy)) + 1;

      /* Taşma: kenar yumuşatması yüzünden yan yana iki dolgunun
         arasında yarım piksellik boşluk kalır ve zeminde ince ağ
         görünür. Dörtgen merkezinden dışa doğru büyütülüyor. */
      const ta = T.tasma != null ? T.tasma : 0.8;
      const olx = 1 + (2 * ta) / tw;
      const oly = 1 + (2 * ta) / th;

      for (let gy = tgy0; gy <= tgy1; gy++) {
        for (let gx = tgx0; gx <= tgx1; gx++) {
          const q  = gridToWorld(gx, gy);
          const px = q.x - minX, py = q.y - minY;
          /* Dikdörtgene değmeyeni ele — tarama kutusu geniş, çoğu boşa */
          if (px + tw < 0 || py + th < 0 || px > w || py > h) continue;

          const t = (karoTonDeger(gx, gy) - 0.5) * 2 * T.guc;
          const a = Math.abs(t);
          if (a < 0.004) continue;

          x2.fillStyle = t > 0
            ? "rgba(255,255,255," + a.toFixed(4) + ")"
            : "rgba(0,0,0,"       + a.toFixed(4) + ")";

          const cxp = px + tw / 2, cyp = py + th / 2;
          const hw  = (tw / 2) * olx, hh = (th / 2) * oly;
          x2.beginPath();
          x2.moveTo(cxp,      cyp - hh);
          x2.lineTo(cxp + hw, cyp);
          x2.lineTo(cxp,      cyp + hh);
          x2.lineTo(cxp - hw, cyp);
          x2.closePath();
          x2.fill();
        }
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

    return { cv: c2, x: minX, y: minY, w, h };
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

  /* ═════════════════════════════════════════════════════════════════════
     İNCE AYAR PANELİ — ?haritaayar=1

     GEÇİCİ. Zemin oturunca KOPYALA çıktısı CFG'ye kalıcı yazılır ve bu
     blok silinir (handoff kuralı: tanı panelleri iş bitince silinir).

     Neden bu dosyada: harita.js kendi kendini bağlar, index.html'e
     script etiketi eklemek gerekmiyor. tema.js'e de konamazdı —
     tileW/tileH kaydı CFG kurulurken, yani bu dosya açılırken
     okunmak zorunda.

     Değer değişince zemin önbelleği boşaltılıp yeniden çizilir.
     Kaydırma sırasında değil, YALNIZ kaydırıcı oynatılınca — o yüzden
     panel açıkken de oyunun kare hızı düşmez.
     ═════════════════════════════════════════════════════════════════════ */
  const AYAR_GRUP = [
    ["Karo", [
      ["karoTon.guc",        "Ton g\u00fcc\u00fc (0 = kapal\u0131)", 0, 0.40, 0.005],
      ["karoTon.kumeSiklik", "\u00d6bek geni\u015fli\u011fi",        0.03, 1.2, 0.01],
      ["karoTon.karisim",    "Karodan karoya s\u0131\u00e7rama", 0, 1, 0.01],
      ["karoTon.tasma",      "Ta\u015fma (a\u011f \u00e7\u0131karsa art\u0131r)", 0, 2.5, 0.1],
    ]],
    ["Kabartma", [
      ["kabartma.guc",        "Güç (0 = kapalı)",   0,    2,    0.01],
      ["kabartma.yukseklik",  "Yükseklik",          0,    20,   0.1 ],
      ["kabartma.siklik",     "Tepe sıklığı",       0.05, 3,    0.01],
      ["kabartma.sertlik",    "Sertlik",            0.2,  3,    0.01],
      ["kabartma.aydinlik",   "Aydınlık gücü",      0,    1,    0.01],
      ["kabartma.karanlik",   "Karanlık gücü",      0,    1,    0.01],
      ["kabartma.tonlama",    "İrtifa tonu",        0,    0.6,  0.01],
      ["kabartma.basamak",    "Basamak (0=yumuşak)",0,    12,   1   ],
    ]],
    ["Eğim", [
      ["kabartma.egimYatay",  "Yatay (çapraz) eğim", 0,  3,  0.01],
      ["kabartma.egimDikey",  "Dikey (aşağı yukarı)",0,  3,  0.01],
      ["kabartma.gunesX",     "Güneş yönü X",       -1,  1,  0.01],
      ["kabartma.gunesY",     "Güneş yönü Y",       -1,  1,  0.01],
    ]],
    ["Doku", [
      ["leke",                 "Leke gücü",          0,   2,  0.01],
      ["lekeYatay",            "Leke yataylığı",     1,   6,  0.05],
      ["isik",                 "Işık dalgası",       0,   1,  0.01],
      ["doygunluk",            "Doygunluk (kar/lav)",0.5, 2,  0.01],
      ["cimenKale.siklik",     "Çimen deseni",       0.5, 8,  0.05],
      ["cimenKale.isik",       "Çimen ışığı",        0,   1,  0.01],
      ["cimenKale.doygunluk",  "Çimen doygunluğu",   0.5, 2,  0.01],
    ]],
    ["Geçiş", [
      ["serpme.genislik", "Serpme genişliği", 0,    0.15, 0.001],
      ["serpme.kaba",     "Kaba katman",      0.05, 1.5,  0.01 ],
      ["serpme.orta",     "Orta katman",      0.1,  2,    0.01 ],
      ["serpme.ince",     "İnce katman",      0.2,  2,    0.01 ],
      ["sinirDalgasi",    "Sınır dalgası",    0,    0.30, 0.005],
      ["gecisBandi",      "Yumuşama payı",    0,    0.05, 0.001],
    ]],
    ["Kıyı", [
      ["kiyi.guc",      "Güç (0 = kapalı)", 0, 1,    0.01 ],
      ["kiyi.kalinlik", "Kalınlık",         0, 0.05, 0.001],
      ["kiyi.koyuluk",  "Koyuluk",          0, 1,    0.01 ],
    ]],
    ["Perspektif", [
      ["tileW",     "Karo eni  (YENİLE)",  64, 256, 2],
      ["tileH",     "Karo boyu (YENİLE)",  16, 160, 2],
      ["zeminAdim", "Örnekleme adımı",      4,  20, 1],
    ]],
  ];

  /* tileW/tileH canlı sürülemez: türetilmiş ölçüler dosya açılışında
     `const` olarak hesaplanıyor, ayrıca DUGUM/KOORD/sefer hepsi buna
     bağlı. Bu yollar değişince panel "YENİLE" uyarısı gösterir. */
  const AYAR_YENILEME = { tileW: 1, tileH: 1 };

  function ayarOku(kok, yol) {
    const p = yol.split(".");
    let o = kok;
    for (let i = 0; i < p.length && o != null; i++) o = o[p[i]];
    return o;
  }
  function ayarYaz(yol, v) {
    const p = yol.split(".");
    let o = CFG;
    for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
    o[p[p.length - 1]] = v;
  }

  function ayarKayitOku() {
    try { return JSON.parse(localStorage.getItem("bdHaritaAyar") || "{}") || {}; }
    catch (e) { return {}; }
  }
  function ayarKayitYaz(k) {
    try { localStorage.setItem("bdHaritaAyar", JSON.stringify(k)); } catch (e) {}
  }

  function haritaAyarPaneli() {
    if (document.getElementById("hAyarPanel")) return;

    const st = document.createElement("style");
    st.id = "hAyarStil";
    st.textContent = [
      "#hAyarPanel{position:fixed;left:8px;top:96px;width:296px;z-index:99999;",
        "background:#12263c;border:1px solid #2b4a6b;border-radius:10px;",
        "box-shadow:0 2px 6px rgba(0,20,45,.3);font-family:'Baloo 2',sans-serif;",
        "color:#e8f4ff;}",
      "#hAyarBas{display:flex;align-items:center;gap:8px;padding:8px 10px;",
        "background:#1b3654;border-radius:9px 9px 0 0;cursor:move;touch-action:none;}",
      "#hAyarBas b{flex:1;font-size:14px;font-weight:700;}",
      "#hAyarBas span{width:26px;height:26px;line-height:26px;text-align:center;",
        "background:#264a70;border-radius:6px;font-size:14px;font-weight:700;}",
      "#hAyarSek{display:flex;flex-wrap:wrap;gap:4px;padding:8px 8px 4px;}",
      "#hAyarSek button{flex:0 0 auto;padding:5px 9px;font-family:inherit;",
        "font-size:11px;font-weight:700;color:#9fc4e6;background:#1b3654;",
        "border:0;border-radius:6px;}",
      "#hAyarSek button.acik{background:#3d7ab8;color:#fff;}",
      "#hAyarGovde{max-height:46vh;overflow-y:auto;padding:2px 10px 8px;}",
      "#hAyarGovde::-webkit-scrollbar{width:0;height:0;}",
      ".hAyarSat{padding:5px 0;}",
      ".hAyarEt{display:flex;justify-content:space-between;font-size:11px;",
        "font-weight:700;color:#e8f4ff;margin-bottom:3px;}",
      ".hAyarEt i{font-style:normal;font-variant-numeric:tabular-nums;color:#8fd0ff;}",
      ".hAyarSat input{width:100%;height:22px;margin:0;background:transparent;}",
      "#hAyarAlt{display:flex;gap:6px;padding:8px 10px;border-top:1px solid #24405e;}",
      "#hAyarAlt button{flex:1;padding:8px 0;font-family:inherit;font-size:12px;",
        "font-weight:700;color:#fff;background:#3d7ab8;border:0;border-radius:7px;}",
      "#hAyarAlt button.sifir{background:#5a3b3b;}",
      "#hAyarNot{padding:0 10px 8px;font-size:11px;font-weight:700;color:#ffca6b;}",
      "#hAyarCik{width:100%;box-sizing:border-box;height:88px;margin:0 0 8px;",
        "padding:6px;font-family:monospace;font-size:10px;color:#cfe6ff;",
        "background:#0d1c2d;border:1px solid #2b4a6b;border-radius:6px;display:none;}",
      "#hAyarPanel.kapali #hAyarSek,#hAyarPanel.kapali #hAyarGovde,",
        "#hAyarPanel.kapali #hAyarAlt,#hAyarPanel.kapali #hAyarNot{display:none;}"
    ].join("");
    document.head.appendChild(st);

    const kap = document.createElement("div");
    kap.id = "hAyarPanel";
    kap.innerHTML =
      "<div id='hAyarBas'><b>Harita ince ayar</b><span id='hAyarKapa'>\u2013</span></div>" +
      "<div id='hAyarSek'></div>" +
      "<div id='hAyarNot'></div>" +
      "<div id='hAyarGovde'></div>" +
      "<textarea id='hAyarCik' readonly></textarea>" +
      "<div id='hAyarAlt'>" +
        "<button id='hAyarSif' class='sifir'>SIFIRLA</button>" +
        "<button id='hAyarKop'>KOPYALA</button>" +
      "</div>";
    document.body.appendChild(kap);

    const sekEl = kap.querySelector("#hAyarSek");
    const govEl = kap.querySelector("#hAyarGovde");
    const notEl = kap.querySelector("#hAyarNot");
    const cikEl = kap.querySelector("#hAyarCik");
    let aktif = 0;

    /* Yeniden pişirme geciktirilir: parmak kaydırıcıyı sürerken her
       ara değerde tüm parçalar yeniden pişerse panel takılır. */
    let bekle = 0;
    function tazele() {
      clearTimeout(bekle);
      bekle = setTimeout(function () {
        onbellegiBosalt();
        cizIste();
      }, 90);
    }

    function sekmeCiz() {
      sekEl.innerHTML = "";
      AYAR_GRUP.forEach(function (g, i) {
        const b = document.createElement("button");
        b.textContent = g[0];
        if (i === aktif) b.className = "acik";
        b.addEventListener("click", function () { aktif = i; sekmeCiz(); govdeCiz(); });
        sekEl.appendChild(b);
      });
    }

    function govdeCiz() {
      govEl.innerHTML = "";
      notEl.textContent = "";
      const alanlar = AYAR_GRUP[aktif][1];
      let yenilemeVar = false;

      alanlar.forEach(function (a) {
        const yol = a[0], ad = a[1], alt = a[2], ust = a[3], adim = a[4];
        if (AYAR_YENILEME[yol]) yenilemeVar = true;

        const sat = document.createElement("div");
        sat.className = "hAyarSat";
        const et = document.createElement("div");
        et.className = "hAyarEt";
        const ai = document.createElement("span"); ai.textContent = ad;
        const de = document.createElement("i");
        et.appendChild(ai); et.appendChild(de);

        const sl = document.createElement("input");
        sl.type = "range";
        sl.min = alt; sl.max = ust; sl.step = adim;
        const su = ayarOku(CFG, yol);
        sl.value = su;
        de.textContent = (+su).toFixed(adim >= 1 ? 0 : 3);

        sl.addEventListener("input", function () {
          const v = parseFloat(sl.value);
          de.textContent = v.toFixed(adim >= 1 ? 0 : 3);
          ayarYaz(yol, v);
          const k = ayarKayitOku(); k[yol] = v; ayarKayitYaz(k);
          if (!AYAR_YENILEME[yol]) tazele();
        });

        sat.appendChild(et); sat.appendChild(sl);
        govEl.appendChild(sat);
      });

      if (yenilemeVar) {
        notEl.textContent = "YENİLE yazan alanlar sayfa yenilenince uygulanır. "
                          + "Karo boyu, eninin yarısı olmalı (2:1).";
      }
    }

    /* SIFIRLA: yalnız açık sekmeyi, dosyadaki ilk değerlere döndürür. */
    kap.querySelector("#hAyarSif").addEventListener("click", function () {
      const k = ayarKayitOku();
      AYAR_GRUP[aktif][1].forEach(function (a) {
        const v = ayarOku(CFG_VARSAYILAN, a[0]);
        if (typeof v === "number") { ayarYaz(a[0], v); delete k[a[0]]; }
      });
      ayarKayitYaz(k);
      govdeCiz();
      tazele();
    });

    /* KOPYALA: yalnız DEĞİŞMİŞ alanları, CFG'ye elle yazılacak
       biçimde döker. Değişmeyenler yazılmaz — dosyadaki açıklamalar
       yerinde kalsın diye. */
    kap.querySelector("#hAyarKop").addEventListener("click", function () {
      const k = ayarKayitOku();
      const sat = [];
      for (const yol in k) {
        const v0 = ayarOku(CFG_VARSAYILAN, yol);
        if (typeof v0 === "number" && Math.abs(v0 - k[yol]) < 1e-9) continue;
        sat.push("CFG." + yol + " = " + k[yol] + ";");
      }
      const met = sat.length ? sat.join("\n") : "(değişiklik yok)";
      cikEl.style.display = "block";
      cikEl.value = met;
      cikEl.focus(); cikEl.select();
      try { navigator.clipboard && navigator.clipboard.writeText(met); } catch (e) {}
    });

    kap.querySelector("#hAyarKapa").addEventListener("click", function () {
      kap.classList.toggle("kapali");
    });

    /* Sürükleme. Kaydırıcının kendi dokunuşunu yutmasın diye yalnız
       başlıktan tutulur. */
    (function () {
      const bas = kap.querySelector("#hAyarBas");
      let sx = 0, sy = 0, bx = 0, by = 0, tut = false;
      bas.addEventListener("pointerdown", function (e) {
        tut = true; sx = e.clientX; sy = e.clientY;
        const r = kap.getBoundingClientRect(); bx = r.left; by = r.top;
        bas.setPointerCapture(e.pointerId); e.preventDefault();
      });
      bas.addEventListener("pointermove", function (e) {
        if (!tut) return;
        kap.style.left = (bx + e.clientX - sx) + "px";
        kap.style.top  = (by + e.clientY - sy) + "px";
      });
      bas.addEventListener("pointerup", function () { tut = false; });
    })();

    /* Panel üstündeki dokunuş haritaya sızmasın */
    ["pointerdown", "pointermove", "touchstart", "touchmove"].forEach(function (t) {
      kap.addEventListener(t, function (e) { e.stopPropagation(); });
    });

    sekmeCiz();
    govdeCiz();
  }

  if (/[?&]haritaayar=1/.test(location.search || "")) {
    if (document.body) haritaAyarPaneli();
    else document.addEventListener("DOMContentLoaded", haritaAyarPaneli);
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
                    dugumBul, dugumTazele, cizUstIste,
                    ekranaGoreIzgara,
                    /* Eski harita modu kaldırıldı; missile.js hâlâ soruyor,
                       cevap her zaman evet. */
                    aktifMi: function () { return true; } };
})();
