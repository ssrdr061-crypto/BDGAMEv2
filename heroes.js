/*  ═══════════════════════════════════════════════════════════
    HEROES.JS — KAHRAMAN YÖNETİM DOSYASI
    SÜRÜM: 2.1   (sürümü buradan takip et, dosya adı hep heroes.js kalsın)
    TÜM AYARLAR BU DOSYADAN YAPILIR. Ana koda dokunma!

    BÖLÜMLER:
      1) HERO_UI     → Kutucukların ve açıklama panelinin yeri/boyutu/rengi
      2) HERO_STATS  → Kahraman bilgileri + YETENEKLER (abilities)
      3) HERO_3D     → 3D model, ışık ve YILDIZ ayarları
      4) heroSkins   → Kahraman sırası (menüde geçiş sırası)
    ═══════════════════════════════════════════════════════════ */


/*  ─────────────────────────────────────────────
    1) HERO_UI — GENEL GÖRÜNÜM AYARLARI
    ───────────────────────────────────────────── */
const HERO_UI = {

  /* ── KART GEOMETRİSİ — ÖLÇÜ REFERANSI ──
     Kahraman kartının ekranda kapladığı yer. Birlik menüsü de
     BU DEĞERLERE göre ayarlandı (tema.js → "#panel-troops").
     Burada bir şey değiştirirsen tema.js'te aynı değeri de değiştir,
     yoksa iki menü arasındaki hiza kayar. */
  kartUst:        "60px",    /* üstten boşluk — elmas paneli açıkta kalsın */
  kartAlt:        "70px",    /* alttan boşluk — dock'un üstünde dursun     */
  kartKenar:      "12px",    /* sağ/sol boşluk                            */
  kartMaxGenislik:"420px",   /* en fazla genişlik                         */
  kartRadius:     "22px",    /* köşe yuvarlaklığı (dört köşe)             */
  kartCerceve:    "1px solid rgba(160,215,255,.60)",   /* tema kenarı — 3B/gölge yok */
  kartTamEkran:   false,     /* true = eski tam ekran görünüm             */

  /* YETENEK KUTUCUKLARI (kahramanın altındaki 2 kutu) */
  boxes: {
    bottom: "-10px",    /* Ekranın ALTINDAN yüksekliği. Artır = yukarı çıkar  */
    gap:    "8px",      /* İki kutu arasındaki boşluk                          */
    width:  "50px",     /* Kutu genişliği                                      */
    height: "50px",     /* Kutu yüksekliği                                     */
    radius: "12px",     /* Köşe yuvarlaklığı (0 = keskin köşe)                 */
    border: "1px solid rgba(255,255,255,.35)",  /* Kenarlık                    */
    bg:     "rgba(0,0,0,.35)",                  /* Kutu arkaplan rengi         */
    box1: { dx: -70, dy: -80 },  /* 1. kutunun ek kaydırması (🎛 editörden)   */
    box2: { dx: 75,  dy: -85 },  /* 2. kutunun ek kaydırması (🎛 editörden)   */
    box3: { dx: 0,   dy: -80 }   /* 3. kutu (ortadaki) ek kaydırması           */
  },

  /* ── SATIN AL / GELİŞTİR BUTONU ──
     Kahraman detay ekranının altındaki buton. */
  buyBtn: {
    bottom: "2.5%",      /* alttan uzaklık (biraz aşağı alındı, çerçeveye yapışmadan) */
    width: "64%",        /* buton genişliği */
    height: "46px",
    fontSize: "16px",
    dx: 0, dy: 0         /* ek kaydırma */
  },

  /* AÇIKLAMA PANELİ (kutuya tıklayınca açılan yazı kutusu) */
  panel: {
    bottom:   "125px",  /* Ekranın ALTINDAN yüksekliği. Artır = yukarı çıkar   */
    maxWidth: "80%",    /* Maksimum genişlik                                   */
    fontSize: "12px",   /* Yazı boyutu                                         */
    bg:       "rgba(0,0,0,.8)",                 /* Panel arkaplan rengi        */
    border:   "1px solid rgba(255,255,255,.25)",/* Panel kenarlığı             */
    valueColor: "#ffd700", /* Seviyeye göre değişen SAYININ rengi              */
    dx: 0, dy: 65        /* Panelin ek kaydırması (🎛 editörden gelir)         */
  }
};

/*  ─────────────────────────────────────────────
    HERO_UI_BY_HERO — KAHRAMAN BAŞINA UI İNCE AYARI
    Global HERO_UI'ın ÜSTÜNE biner; sadece belirtilen değerler değişir.
    (🎛 editöründe her kahraman için ayarlanan değerler buraya kalıcılaştırıldı.)
    Burada olmayan bir kahraman global HERO_UI değerlerini kullanır.
    ───────────────────────────────────────────── */
const HERO_UI_BY_HERO = {
  /* BOŞ = beş kahraman da yukarıdaki HERO_UI değerlerini kullanır,
     yani yetenek kutuları hepsinde AYNI hizada.
     Tek bir kahramanı ayrı ayarlamak istersen buraya ekle, örn:
       revolia: { boxes: { box2: { dx: 80, dy: -85 } } }
     Eski kahraman başına ayarlar bilerek kaldırıldı — hiza bozuluyordu. */
};


/*  ─────────────────────────────────────────────
    2) HERO_STATS — KAHRAMANLAR ve YETENEKLERİ
    NOT: Kahramanların atk/def/hp gibi statları YOK.
    Sadece "bonuses" (bonus özellikler) olacak — sonra doldurulacak.

    YETENEK NASIL DOLDURULUR?
      icon          → Kutuda görünecek resim. Boş ("") bırakılırsa ikon çizilmez.
                      gibi placeholder veya doğrudan dosya yolu yazılabilir.
      title         → Yeteneğin adı (panelde başlıkta görünür)
      descTemplate  → Açıklama metni. {value} yazdığın yere, kahraman
                      seviyesine göre aşağıdaki listeden sayı gelir ve
                      RENKLİ gösterilir.
      valuesByLevel → [Sv1, Sv2, Sv3, Sv4, Sv5] → her seviye için ELLE
                      girdiğin değerler.

      ÖRNEK:
      descTemplate: "Düşman %50 gücün üstündeyse savunma {value} artar."
      valuesByLevel: [10, 25, 40, 55, 70]
      → Seviye 1'de "%10", seviye 2'de "%25" yazar (renkli).
    ───────────────────────────────────────────── */
const HERO_STATS = {

  /* ═══ 1. KAHRAMAN — BUZ SAVAŞÇISI ═══ */
  buz_savascisi: {
    name: "HALVORSEN",
    specialty: "Savunma",
    specialtyIcon: "🛡️",
    desc: "Buz zırhı ile rakiplerin saldırılarını hafifletir.",
    bonuses: {},   /* Bonus özellikler buraya gelecek (sonra doldurulacak) */
    color: "#4fd1e8",
    price: 280000,          /* Satın alma bedeli (elmas) — buradan ayarla */
    upgradeCosts: [0, 0, 0, 0],   /* Seviye 2-3-4-5 geliştirme bedelleri (sonra doldurulacak) */

    abilities: [
      {
        icon: "yetenek_kutup.webp",
        title: "Kutup Dayanıklılığı",
        descTemplate: "Soğuk havalarda hayatta kalma bilgisini kullanarak birlik sağlığını {value} arttırır.",
        valuesByLevel: [7, 13, 18, 22, 26],
        effect: { type: "troop_hp_pct" }
      },
      {
        icon: "yetenek_engel.webp",
        title: "Buz Engelleri",
        descTemplate: "Buzdan engeller yapma becerisiyle rakibi ayakta durmakta zorlaştırır: savaşın başında rakip {value} tur boyunca saldıramaz.",
        /* Seviye 1-2: 1 tur garanti • Seviye 3-4: %40 ihtimalle 2 tur (tutmazsa 1 tur) • Seviye 5: 2 tur garanti */
        valuesByLevel: [1, 1, 2, 2, 2],           /* donma turu */
        chanceByLevel: [100, 100, 40, 40, 100],   /* 2 turun gelme ihtimali; tutmazsa 1 tur uygulanır */
        effect: { type: "enemy_freeze_turns", fallbackTurns: 1 }
      },
      {
        icon: "yetenek_zirh.webp",
        title: "Buz Zırhı",
        descTemplate: "Birliklerin vücut direncini arttırarak tüm birliğin savunmasını {value} yükseltir.",
        valuesByLevel: [8, 12, 15, 18, 25],
        effect: { type: "troop_def_pct" }
      }
    ]
  },

  /* ═══ 2. KAHRAMAN — ÇELİK SAVAŞÇI ═══ */
  celik_savasci: {
    name: "STELLİN",
    specialty: "Denge",
    specialtyIcon: "⚡",
    desc: "Saldırı ve savunmayı dengeli kullanan savaşçı.",
    bonuses: {},   /* Bonus özellikler buraya gelecek (sonra doldurulacak) */
    color: "#e8c84f",
    price: 300000,          /* Satın alma bedeli (elmas) — buradan ayarla */
    upgradeCosts: [0, 0, 0, 0],   /* Seviye 2-3-4-5 geliştirme bedelleri (sonra doldurulacak) */

    abilities: [
      {
        icon: "yetenek_durus.webp",
        title: "Çelik Duruş",
        descTemplate: "Çeliğin eşsiz sertliğiyle oluşturduğu kalkan ve kılıca dayanarak birliklerin saldırı ve savunma oranını aynı anda {value} arttırır.",
        valuesByLevel: [15, 20, 23, 29, 32],
        effect: { type: "troop_atk_def_pct" }
      },
      {
        icon: "yetenek_yansima.webp",
        title: "Çelik Yansıması",
        descTemplate: "Birliklerine ördüğü çelik zırhlar sayesinde düşmandan alınan her hasarın {value} kadarı rakibe geri yansır.",
        valuesByLevel: [8, 11, 14, 17, 20],
        /* Yansıyan hasar rakibin savunmasını DELER (savunma hesabına girmez) —
           kendi saldırısının geri tepmesi olduğu için kalkan onu engellemez. */
        effect: { type: "damage_reflect_pct", piercing: true }
      }
    ]
  },

  /* ═══ 3. KAHRAMAN — ATEŞ BÜYÜCÜSÜ ═══ */
  ates_buyucusu: {
    name: "MİKİAN",
    specialty: "Saldırı",
    specialtyIcon: "⚔️",
    desc: "Alev büyüleriyle düşmanlara büyük hasar verir.",
    bonuses: {},   /* Bonus özellikler buraya gelecek (sonra doldurulacak) */
    color: "#e2585c",
    price: 350000,          /* Satın alma bedeli (elmas) — buradan ayarla */
    upgradeCosts: [0, 0, 0, 0],   /* Seviye 2-3-4-5 geliştirme bedelleri (sonra doldurulacak) */

    abilities: [
      {
        icon: "yetenek_atesbuyusu.webp",
        title: "Ateş Büyüsü",
        descTemplate: "Geleneksel olarak öğrendiği tüm metotları deneyerek ateş büyüsü oluşturur ve {chance} ihtimalle rakibin savunmasını {value} yıpratır.",
        valuesByLevel: [30, 33, 36, 41, 45],
        chance: 75,   /* her seviyede sabit ihtimal */
        effect: { type: "enemy_def_shred_pct" }
      },
      {
        icon: "yetenek_yasak.webp",
        title: "Yasak Büyüler",
        descTemplate: "Büyü kitabındaki en büyük büyüleri denemeye kalkar; düşman birliklerinin {value} kadarını hemen öldürür, {value2} kadarını hastaneye düşürür.",
        valuesByLevel:  [6, 9, 12, 15, 19],    /* öldürülen % */
        valuesByLevel2: [12, 13, 14, 15, 16],  /* hastaneye düşen % */
        effect: { type: "enemy_instant_casualty" }
      }
    ]
  },

  /* ═══ 4. KAHRAMAN — İVANOVNA ═══ */
  ivanovna: {
    name: "İVANOVNA",
    specialty: "Denge",
    specialtyIcon: "⚡",
    desc: "Disiplin ve istihbaratla orduyu savaşa hazırlayan komutan.",
    bonuses: {},   /* Bonus özellikler buraya gelecek (sonra doldurulacak) */
    color: "#b06fe0",
    price: 650000,          /* Satın alma bedeli (elmas) — buradan ayarla */
    upgradeCosts: [0, 0, 0, 0],   /* Seviye 2-3-4-5 geliştirme bedelleri (sonra doldurulacak) */

    abilities: [
      {
        icon: "yetenek_disiplin.webp",
        title: "Demir Disiplin",
        descTemplate: "Ordu içinde harika bir düzen sağlayarak birlikleri agresifleştirir; {value} saldırı, {value2} savunma ve %35 can bonusu sağlar.",
        valuesByLevel:  [20, 35, 38, 42, 50],  /* saldırı % */
        valuesByLevel2: [20, 35, 38, 42, 50],  /* savunma % */
        effect: { type: "troop_atk_def_hp_pct", hpFlatPct: 35 }  /* can bonusu her seviyede sabit %35 */
      },
      {
        icon: "yetenek_sevgili.webp",
        title: "Birliklerin Sevgilisi",
        descTemplate: "Birlikler tarafından en çok sevilen komutan olduğundan, yaralanan birliklerin {value} kadarı hızlıca savaşa geri döner ve çarpışmaya devam eder.",
        valuesByLevel: [20, 20, 20, 20, 20],   /* her seviyede sabit %20 */
        effect: { type: "wounded_return_pct" }
      },
      {
        icon: "yetenek_istihbarat.webp",
        title: "Derin İstihbarat",
        descTemplate: "Derin istihbarat bilgilerini kullanır: düşmanın gücü seninkinden %50 veya daha fazlaysa, aradaki güç farkını {value} seviyesine kadar düşürür.",
        /* DİKKAT: Bu yetenekte KÜÇÜK sayı = DAHA GÜÇLÜ etki (fark daha çok kapanır).
           Bu yüzden seviye arttıkça değer DÜŞER (15 → 10). */
        valuesByLevel: [15, 14, 13, 12, 10],
        effect: { type: "power_gap_cap", triggerGapPct: 50 }
      }
    ],

    /* PASİF YETENEK — detay ekranında ✕ butonunun altında yuvarlak kutu olarak görünür */
    passive: {
      icon: "yetenek_golge.webp",
      title: "Gölge Manevrası",
      desc: "Kale roket saldırısı aldığında %40 ihtimalle kalenin yerini füze gelmeden otomatik olarak değiştirir.",
      effect: { type: "castle_relocate_on_missile", chance: 40 }
    }
  },

  revolia: {
    name: "REVOLİA",
    specialty: "Elektrik",
    specialtyIcon: "🤖",
    desc: "Elektriğin gücünü kuşanan robot komutan; rakibi zayıflatır, robotları güçlendirir.",
    color: "#4fd1e8",
    price: 400000,          /* Satın alma bedeli (elmas) — buradan ayarla */
    upgradeCosts: [0, 0, 0, 0],   /* Seviye 2-3-4-5 geliştirme bedelleri (sonra doldurulacak) */
    bonuses: {},   /* Bonus özellikler buraya gelecek (sonra doldurulacak) */
    abilities: [
      {
        icon: "yetenek_akim.webp",
        title: "Elektrik Akımı",
        descTemplate: "Düşmanlara yüklü elektrik akımı göndererek rakip birlik canını {value}, saldırısını {value2} azaltır.",
        valuesByLevel:  [17, 18, 19, 20, 25],  /* rakip can azaltma %    */
        valuesByLevel2: [18, 19, 20, 21, 26],  /* rakip saldırı azaltma % */
        effect: { type: "enemy_hp_atk_reduce_pct" }
      },
      {
        icon: "yetenek_yukleme.webp",
        title: "Aşırı Yükleme",
        descTemplate: "Ordudaki robot birliklerinin saldırı ve can istatistiğini {value} arttırır.",
        valuesByLevel: [30, 34, 36, 38, 40],
        effect: { type: "robot_atk_hp_pct", troopType: "robot" }
      },
      {
        icon: "yetenek_firtina.webp",
        title: "Yıldırım Fırtınası",
        descTemplate: "Elektriğin sınırlarını zorlar: her 2 turda bir rakibin tüm birliklerine yıldırım indirir ve o tur rakibin savunmasını {value} azaltır.",
        /* Her seviyede sabit %30 — birikmez, sadece yıldırım turunda uygulanır, sonraki tur savunma normale döner. */
        valuesByLevel: [30, 30, 30, 30, 30],
        effect: { type: "periodic_def_reduce_pct", everyTurns: 2 }
      }
    ],

    /* PASİF YETENEK — detay ekranında ✕ butonunun altında yuvarlak kutu olarak görünür */
    passive: {
      icon: "yetenek_kopya.webp",
      title: "Robot Kopyalama",
      desc: "Sahip olunan robotlar kopyalanarak kale savunmasında 2 katı kadar çoğalır.",
      /* Sadece KALE SAVUNMASINDA: robot sayısı hesapta 2 ile çarpılır, gerçek envanter değişmez. */
      effect: { type: "defense_robot_multiplier", multiplier: 2, troopType: "robot" }
    }
  }
};




/*  ─────────────────────────────────────────────
    2.b) SAVAŞ ETKİ OKUYUCU
    Savaş mekaniği kurulunca ana kod bu fonksiyonu çağıracak.
    Verilen kahraman + seviye için tüm yetenek etkilerini
    hazır sayılarla döndürür. Ana koda dokunmadan buradaki
    değerleri değiştirmen yeterli olacak.
    ───────────────────────────────────────────── */
function getHeroBattleEffects(skinId, level) {
  const h = HERO_STATS[skinId];
  if (!h) return [];
  const lv = Math.max(1, Math.min(5, level || 1)) - 1;
  return (h.abilities || []).map(ab => ({
    type:    ab.effect ? ab.effect.type : null,
    value:   (ab.valuesByLevel  || [])[lv] ?? 0,
    value2:  (ab.valuesByLevel2 || [])[lv] ?? 0,
    chance:  (ab.chanceByLevel  || [])[lv] ?? (ab.chance ?? 100),
    extra:   ab.effect || {}
  })).filter(e => e.type);
}

/*  ─────────────────────────────────────────────
    3) HERO_3D — 3D MODEL, IŞIK ve YILDIZLAR

    YILDIZ AYARLARI (stars satırı):
      max    → toplam yıldız sayısı
      filled → dolu yıldız sayısı
      size   → yıldız boyutu
      color  → dolu yıldız rengi
      posY   → yıldızların YUKARIDAN yüzde konumu.
               Küçült = yukarı çıkar, büyüt = aşağı iner.
               (Örn: "60%" panelle çakışmayı önler)
    ───────────────────────────────────────────── */
const HERO_3D = {
  buz_savascisi: {
    model: {
      position: { x: 0, y: -0.24, z: -0.4 },
      rotation: { x: 34, y: 0 },
      scale: 0.76
    },
    lighting: {
      main:    { intensity: 1.5, color: "#ffffff" },
      ambient: { intensity: 0.4, color: "#b0b0d0" },
      back:    { intensity: 1.2, color: "#4fd1e8" },
      hemi:    { intensity: 1.3, color: "#ddeeff" }
    },
    stars: { max: 5, filled: 0, size: "38px", color: "#ffd700", posY: "8.2%" }
  },
  ates_buyucusu: {
    model: {
      position: { x: 0, y: 0.08, z: -0.4 },
      rotation: { x: 37, y: 0 },
      scale: 0.76
    },
    lighting: {
      main:    { intensity: 1.5, color: "#ffffff" },
      ambient: { intensity: 0.8, color: "#b0b0d0" },
      back:    { intensity: 0.8, color: "#4fd1e8" },
      hemi:    { intensity: 0.5, color: "#ddeeff" }
    },
    stars: { max: 5, filled: 0, size: "38px", color: "#ffd700", posY: "8.2%" }
  },
  celik_savasci: {
    model: {
      position: { x: -0.02, y: 0.02, z: -0.4 },
      rotation: { x: 43, y: 0 },
      scale: 0.78
    },
    lighting: {
      main:    { intensity: 1.5, color: "#ffffff" },
      ambient: { intensity: 0.8, color: "#b0b0d0" },
      back:    { intensity: 0.8, color: "#4fd1e8" },
      hemi:    { intensity: 0.5, color: "#ddeeff" }
    },
    stars: { max: 5, filled: 0, size: "38px", color: "#ffd700", posY: "8.2%" }
  },
  ivanovna: {
    model: {
      position: { x: 0.04, y: -0.02, z: -0.44 },
      rotation: { x: 34, y: 0 },
      scale: 0.74
    },
    lighting: {
      main:    { intensity: 1.5, color: "#ffffff" },
      ambient: { intensity: 0.8, color: "#b0b0d0" },
      back:    { intensity: 0.8, color: "#4fd1e8" },
      hemi:    { intensity: 0.5, color: "#ddeeff" }
    },
    stars: { max: 5, filled: 0, size: "38px", color: "#ffd700", posY: "8.2%" }
  }
,

  revolia: {
    model: {
      position: { x: 0, y: -0.24, z: -0.4 },
      rotation: { x: 33, y: 0 },
      scale: 0.92
    },
    lighting: {
      main:    { intensity: 1.5, color: "#ffffff" },
      ambient: { intensity: 0.8, color: "#b0b0d0" },
      back:    { intensity: 1.0, color: "#4fd1e8" },
      hemi:    { intensity: 0.5, color: "#ddeeff" }
    },
    stars: { max: 5, filled: 0, size: "38px", color: "#ffd700", posY: "8.2%" }
  }
};


/*  ─────────────────────────────────────────────
    4) heroSkins — KAHRAMAN SIRASI
    Menüdeki ‹ › oklarıyla geçiş bu sırayla olur.
    Sırayı değiştirmek için satırların yerini değiştir.
    ───────────────────────────────────────────── */
const heroSkins = [
  { id: "buz_savascisi",  name: "HALVORSEN" },
  { id: "celik_savasci",  name: "STELLİN" },
  { id: "ates_buyucusu",  name: "MİKİAN" },
  { id: "ivanovna",       name: "İVANOVNA" },
  { id: "revolia",        name: "REVOLİA" }
];


/*  ─────────────────────────────────────────────
    5) KAHRAMAN EKRAN FONKSİYONLARI
    Ana koddan taşındı. Kahraman detay ekranı ve
    savaş öncesi komutan seçme paneli burada.
    ─────────────────────────────────────────────

    Savaşa götürülen komutanlar (liste — çok komutan sistemi):
    MAX_KOMUTAN sayısını artırırsan (örn. 3) sistem otomatik uyum sağlar. */
const MAX_KOMUTAN = 3;   /* SAVAŞA KAÇ KOMUTAN GÖTÜRÜLEBİLİR — buradan değiştir */

/* ── KOMUTAN KATEGORİSİ: her birlik ailesinden EN FAZLA 1 komutan ──
   HALVORSEN · STELLİN  → Savunucu
   MİKİAN    · İVANOVNA → Koruyucu
   REVOLİA              → Nişancı
   Kimlikler pvp.js'teki HERO_CATEGORY ile birebir aynı olmalı; orası
   hedef sırasını, burası seçim kuralını belirler. Yeni kahraman
   eklenirse İKİ YERE de yazılmalı — yazılmazsa kategorisiz sayılır
   ve kural ona işlemez. */
const KOMUTAN_AILESI = {
  buz_savascisi: "knight",   /* HALVORSEN */
  celik_savasci: "knight",   /* STELLİN   */
  ates_buyucusu: "soldier",  /* MİKİAN    */
  ivanovna:      "soldier",  /* İVANOVNA  */
  revolia:       "robot",    /* REVOLİA   */
};
const KOMUTAN_AILE_ADI = { knight: "Savunucu", soldier: "Koruyucu", robot: "Nişancı" };

function komutanAilesi(id) { return KOMUTAN_AILESI[id] || null; }

/* Kart üstündeki uygunluk rozeti — AİLEDEN gelir, TEK YER burasıdır.
   Savunucu 🛡️ · Koruyucu ❤️ · Nişancı ⚔️ */
const AILE_ROZETI = { knight: "🛡️", soldier: "❤️", robot: "⚔️" };
function komutanRozeti(id) { return AILE_ROZETI[komutanAilesi(id)] || "⚔️"; }
window.komutanRozeti = komutanRozeti;

/* Bu aileden listede zaten seçili olan komutan (varsa) döner.
   `hariç` verilirse o kimlik sayılmaz. */
function ayniAileden(liste, aile, haric) {
  if (!aile) return null;
  return (liste || []).find(x => x && x !== haric && komutanAilesi(x) === aile) || null;
}

/* Kuralı ihlal eden kayıtlı seçimleri süz: her aileden LİSTEDEKİ İLKİ
   kalır, sonrakiler düşer. Kategorisiz kahraman dokunulmaz. */
function komutanlariSuz(liste) {
  const gorulen = {};
  return (liste || []).filter(id => {
    const a = komutanAilesi(id);
    if (!a) return true;
    if (gorulen[a]) return false;
    gorulen[a] = true;
    return true;
  });
}
let selectedCommanders = [];

/*  SAVAŞ MOTORU NOTU (motor yazılırken okunacak):
    Savaş etkileri selectedCommanders listesindeki TÜM komutanlardan
    getHeroBattleEffects(id, seviye) ile toplanır. Aynı tip etkilerin
    toplama/tavan kuralları motor tasarımında belirlenecek. */

/* ── KAHRAMAN DETAY EKRANI (dock'taki kahraman butonu bunu açar) ── */
function openHeroDetail(skinId) {
  const h = HERO_STATS[skinId];
  const cfg = (typeof HERO_3D !== "undefined") ? HERO_3D[skinId] : null;
  if (!h || !cfg) { showToast("Kahraman verisi bulunamadı."); return; }

  let ov = document.getElementById("heroDetailOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "heroDetailOverlay";
    ov.style.cssText = "position:fixed;inset:0;background:#000;z-index:400;display:flex;flex-direction:column;";
    document.body.appendChild(ov);
  }

  /* ── KART GÖRÜNÜMÜ ──
     Dört tarafı boşluklu, ortalanmış kart. İçerideki öğeler kabuğa
     göre konumlandığı için hepsi kendiliğinden uyar.
     Dev gölge, kartın dışını karartır (ayrı element gerekmez). */
  {
    const U0 = HERO_UI;
    if (U0.kartTamEkran) {
      ov.style.cssText = "position:fixed;inset:0;background:#000;z-index:400;display:flex;flex-direction:column;";
    } else {
      ov.style.cssText =
        "position:fixed;left:50%;transform:translateX(-50%);" +
        "top:" + (U0.kartUst || "60px") + ";bottom:" + (U0.kartAlt || "70px") + ";" +
        "width:calc(100% - " + (U0.kartKenar || "12px") + " * 2);" +
        "max-width:" + (U0.kartMaxGenislik || "420px") + ";" +
        "background:#000;z-index:400;display:flex;flex-direction:column;" +
        "border:" + (U0.kartCerceve || "none") + ";" +
        "border-radius:" + (U0.kartRadius || "22px") + ";" +
        "overflow:hidden;box-sizing:border-box;" +
        "box-shadow:0 0 0 9999px rgba(5,4,10,.72);";   /* dış karartma; kart gölgesi yok */
    }
  }
  ov.innerHTML = `
    <button id="hdClose" style="position:absolute;top:12px;right:12px;z-index:10;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.6);border:1px solid #555;color:#fff;font-size:18px;">✕</button>
    <button id="hdBuyBtn" style="position:absolute;left:50%;bottom:4%;transform:translateX(-50%);z-index:10;width:64%;height:46px;font-size:16px;font-weight:800;border-radius:12px;border:2px solid #d4af37;background:linear-gradient(180deg,#f0c94f,#b8860b);color:#1b1430;box-shadow:0 4px 14px rgba(0,0,0,.5);"></button>
    ${h.passive ? `<button id="hdPassive" style="position:absolute;top:58px;right:12px;z-index:10;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.4);color:#fff;font-size:14px;overflow:hidden;">${h.passive.icon ? `<img src="${h.passive.icon}" style="width:100%;height:100%;object-fit:cover;">` : "◈"}</button>` : ""}
    <button id="hdTune" style="position:absolute;top:12px;left:12px;z-index:10;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.6);border:1px solid #555;color:#fff;font-size:16px;">⚙</button>
    <button id="hdUiTune" style="position:absolute;top:12px;left:56px;z-index:10;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.6);border:1px solid #d4af37;color:#d4af37;font-size:16px;">🎛</button>
    <div id="hdUiPanel" style="display:none;position:absolute;top:56px;left:8px;z-index:21;background:rgba(0,0,0,.9);border:1px solid #d4af37;border-radius:10px;padding:10px;font-size:12px;color:#fff;max-width:230px;">
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
        <button class="uiTgt" data-t="box1" style="padding:6px 8px;">Kutu 1</button>
        <button class="uiTgt" data-t="box2" style="padding:6px 8px;">Kutu 2</button>
        <button class="uiTgt" data-t="box3" style="padding:6px 8px;">Kutu 3</button>
        <button class="uiTgt" data-t="boxes" style="padding:6px 8px;">İkisi</button>
        <button class="uiTgt" data-t="panel" style="padding:6px 8px;">Panel</button>
        <button class="uiTgt" data-t="stars" style="padding:6px 8px;">Yıldız</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,44px);gap:4px;margin-bottom:6px;">
        <button class="uiMv" data-x="-1" data-y="-1" style="padding:8px;">↖</button>
        <button class="uiMv" data-x="0"  data-y="-1" style="padding:8px;">▲</button>
        <button class="uiMv" data-x="1"  data-y="-1" style="padding:8px;">↗</button>
        <button class="uiMv" data-x="-1" data-y="0"  style="padding:8px;">◀</button>
        <span style="text-align:center;line-height:32px;" id="uiTgtLabel">Kutu 1</span>
        <button class="uiMv" data-x="1"  data-y="0"  style="padding:8px;">▶</button>
        <button class="uiMv" data-x="-1" data-y="1"  style="padding:8px;">↙</button>
        <button class="uiMv" data-x="0"  data-y="1"  style="padding:8px;">▼</button>
        <button class="uiMv" data-x="1"  data-y="1"  style="padding:8px;">↘</button>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <button id="uiGrow" style="flex:1;padding:8px;">Büyüt</button>
        <button id="uiShrink" style="flex:1;padding:8px;">Küçült</button>
      </div>
      <button id="uiShowVals" style="width:100%;padding:8px;background:#d4af37;color:#000;border:none;border-radius:6px;font-weight:700;">Değerleri Göster</button>
      <button id="uiCopyVals" style="width:100%;margin-top:4px;padding:8px;background:#2DC9FC;color:#000;border:none;border-radius:6px;font-weight:700;">📋 Kopyala</button>
      <div id="uiVals" style="margin-top:6px;font-family:monospace;font-size:10px;color:#2DC9FC;white-space:pre-wrap;word-break:break-all;user-select:text;-webkit-user-select:text;"></div>
    </div>
    <div id="hdTunePanel" style="display:none;position:absolute;top:56px;left:8px;z-index:20;background:rgba(0,0,0,.85);border:1px solid #555;border-radius:10px;padding:10px;font-size:12px;color:#fff;">
      <div style="display:grid;grid-template-columns:repeat(3,44px);gap:4px;margin-bottom:6px;">
        <span></span><button class="hdT" data-k="y" data-v="0.1" style="padding:8px;">▲</button><span></span>
        <button class="hdT" data-k="x" data-v="-0.1" style="padding:8px;">◀</button>
        <button class="hdT" data-k="z" data-v="0.2" style="padding:8px;">＋</button>
        <button class="hdT" data-k="x" data-v="0.1" style="padding:8px;">▶</button>
        <span></span><button class="hdT" data-k="y" data-v="-0.1" style="padding:8px;">▼</button>
        <button class="hdT" data-k="z" data-v="-0.2" style="padding:8px;">－</button>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <button class="hdT" data-k="s" data-v="0.1" style="flex:1;padding:8px;">Büyüt</button>
        <button class="hdT" data-k="s" data-v="-0.1" style="flex:1;padding:8px;">Küçült</button>
      </div>
      <button id="hdFine" style="width:100%;padding:8px;margin-bottom:6px;background:#333;color:#fff;border:1px solid #666;border-radius:6px;">🔬 İnce ayar: KAPALI</button>
      <div style="font-size:10px;color:#aaa;margin-bottom:2px;">Eğim / Döndürme</div>
      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <button class="hdR" data-k="x" data-v="-5" style="flex:1;padding:8px;">⤴ Yukarı baksın</button>
        <button class="hdR" data-k="x" data-v="5" style="flex:1;padding:8px;">⤵ Aşağı eğilsin</button>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <button class="hdR" data-k="y" data-v="-10" style="flex:1;padding:8px;">↺ Sola dön</button>
        <button class="hdR" data-k="y" data-v="10" style="flex:1;padding:8px;">↻ Sağa dön</button>
      </div>
      <button id="hdShowVals" style="width:100%;padding:8px;background:#d4af37;color:#000;border:none;border-radius:6px;font-weight:700;">Değerleri Göster</button>
      <button id="hdCopyVals" style="width:100%;margin-top:4px;padding:8px;background:#2DC9FC;color:#000;border:none;border-radius:6px;font-weight:700;">📋 Kopyala</button>
      <div id="hdVals" style="margin-top:6px;font-family:monospace;font-size:11px;color:#2DC9FC;word-break:break-all;user-select:text;-webkit-user-select:text;"></div>
    </div>
    <button id="hdPrev" style="position:absolute;top:50%;left:8px;transform:translateY(-50%);z-index:10;width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,.6);border:1px solid #555;color:#fff;font-size:20px;">‹</button>
    <button id="hdNext" style="position:absolute;top:50%;right:8px;transform:translateY(-50%);z-index:10;width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,.6);border:1px solid #555;color:#fff;font-size:20px;">›</button>
    <div id="hdName" style="position:absolute;top:16px;left:50%;transform:translateX(-50%);z-index:5;font-size:18px;font-weight:800;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.9);">${h.name}</div>
    <div id="hdStars" style="position:absolute;left:50%;transform:translateX(-50%);top:${cfg.stars.posY};display:flex;gap:4px;z-index:5;"></div>
    <div id="hdBoxes" style="position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:center;gap:8px;padding:14px;z-index:5;"></div>`;
  ov.style.display = "flex";
  ov.dataset.hero = skinId;   /* gelistir.js yıldızları tazelerken okur */

  // Arkaplan (video veya resim)
  const bg = (typeof HERO_BG !== "undefined") ? HERO_BG[skinId] : null;
  if (bg) {
    const bgEl = bg.type === "video"
      ? Object.assign(document.createElement("video"), { src: bg.data, autoplay: true, loop: true, muted: true, playsInline: true })
      : Object.assign(document.createElement("img"), { src: bg.data });
    bgEl.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;";
    ov.insertBefore(bgEl, ov.firstChild);
    if (bg.type === "video") bgEl.play().catch(()=>{});
  }

  // Kahramanlar arası geçiş
  const idx = heroSkins.findIndex(s => s.id === skinId);
  const prevId = heroSkins[(idx - 1 + heroSkins.length) % heroSkins.length].id;
  const nextId = heroSkins[(idx + 1) % heroSkins.length].id;
  /* 3B kaldırıldığı için temizlenecek sahne yok; çağrılar dursun diye boş bırakıldı */
  const cleanup = () => {};
  ov.querySelector("#hdPrev").onclick = () => { cleanup(); openHeroDetail(prevId); };
  ov.querySelector("#hdNext").onclick = () => { cleanup(); openHeroDetail(nextId); };

  // Yıldızlar
  const stEl = ov.querySelector("#hdStars");
  /* Dolu yıldız sayısı = kahramanın SEVİYESİ (gelistir.js).
     cfg.stars.filled artık kullanılmaz — tek kaynak state.heroLevels. */
  const _svYildiz = (typeof window.kahramanSeviyesi === "function")
    ? window.kahramanSeviyesi(skinId) : 1;
  for (let i = 0; i < cfg.stars.max; i++) {
    const s = document.createElement("span");
    s.textContent = "★";
    s.style.cssText = `font-size:${cfg.stars.size};color:${i < _svYildiz ? cfg.stars.color : "#444"};filter:drop-shadow(0 1px 3px rgba(0,0,0,.7));`;
    stEl.appendChild(s);
  }

  // ── YETENEK KUTUCUKLARI ──
  // Kalıcı ayarlar heroes.js → HERO_UI. Ekran üstü canlı ayar: 🎛 butonu.
  const UI_DEF = {
    boxes: { bottom: "20px", gap: "8px", width: "90px", height: "90px", radius: "12px", border: "1px solid rgba(255,255,255,.35)", bg: "rgba(0,0,0,.35)", box1: { dx: 0, dy: 0 }, box2: { dx: 0, dy: 0 }, box3: { dx: 0, dy: 0 } },
    panel: { bottom: "125px", maxWidth: "80%", fontSize: "13px", bg: "rgba(0,0,0,.8)", border: "1px solid rgba(255,255,255,.25)", valueColor: "#ffd700", dx: 0, dy: 0 }
  };
  const SRC = (typeof HERO_UI !== "undefined") ? HERO_UI : UI_DEF;
  // Çalışma kopyası (editör bunu değiştirir, orijinal HERO_UI bozulmaz)
  const U = JSON.parse(JSON.stringify(UI_DEF));
  Object.assign(U.boxes, SRC.boxes || {}); Object.assign(U.panel, SRC.panel || {});
  U.boxes.box1 = Object.assign({ dx: 0, dy: 0 }, (SRC.boxes || {}).box1);
  U.boxes.box2 = Object.assign({ dx: 0, dy: 0 }, (SRC.boxes || {}).box2);
  U.boxes.box3 = Object.assign({ dx: 0, dy: 0 }, (SRC.boxes || {}).box3);
  U.buyBtn = Object.assign({ bottom: "4%", width: "64%", height: "46px", fontSize: "16px", dx: 0, dy: 0 }, SRC.buyBtn);
  /* ── KAHRAMAN BAŞINA UI İNCE AYARI ──
     Global U'nun üstüne, o kahramana özel (HERO_UI_BY_HERO) değerleri biner. */
  const perHero = (typeof HERO_UI_BY_HERO !== "undefined") ? (HERO_UI_BY_HERO[skinId] || null) : null;
  if (perHero) {
    if (perHero.boxes) {
      ["box1", "box2", "box3"].forEach(b => { if (perHero.boxes[b]) Object.assign(U.boxes[b], perHero.boxes[b]); });
      Object.keys(perHero.boxes).forEach(k => { if (!["box1", "box2", "box3"].includes(k)) U.boxes[k] = perHero.boxes[k]; });
    }
    if (perHero.panel)  Object.assign(U.panel,  perHero.panel);
    if (perHero.buyBtn) Object.assign(U.buyBtn, perHero.buyBtn);
  }
  let starDy = 0, starSize = parseInt(cfg.stars.size) || 44;
  let modelAPI = null; // 3D model yüklenince (aşağıda) doldurulur

  const heroLevel = 1; // TODO: kahraman seviyesi sistemi kurulunca buradan okunacak
  const abilities = h.abilities || [];

  const panel = document.createElement("div");
  panel.id = "hdAbilityPanel";
  ov.appendChild(panel);

  const bxEl = ov.querySelector("#hdBoxes");
  const boxEls = [];
  abilities.forEach((ab, i) => {
    const box = document.createElement("div");
    if (ab.icon && !ab.icon.includes("{{")) {
      box.innerHTML = `<img src="${ab.icon}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
    }
    box.onclick = () => {
      if (panel.dataset.open === String(i)) { panel.style.display = "none"; panel.dataset.open = ""; return; }
      const lv = heroLevel - 1;
      const wrap = v => `<span style="color:${U.panel.valueColor};font-weight:800;">%${v}</span>`;
      const val  = (ab.valuesByLevel  || [])[lv] ?? "";
      const val2 = (ab.valuesByLevel2 || [])[lv] ?? "";
      const chc  = (ab.chanceByLevel  || [])[lv] ?? (ab.chance ?? "");
      const desc = (ab.descTemplate || "")
        .replaceAll("{value}",  wrap(val))
        .replaceAll("{value2}", wrap(val2))
        .replaceAll("{chance}", wrap(chc));
      panel.innerHTML = `<div style="font-weight:800;margin-bottom:4px;">${ab.title || "Yetenek " + (i + 1)}</div><div>${desc || "Açıklama henüz eklenmedi."}</div>`;
      panel.style.display = "block";
      panel.dataset.open = String(i);
    };
    bxEl.appendChild(box);
    boxEls.push(box);
  });

  // Tüm stilleri U'dan uygular — editör her değişiklikte bunu çağırır
  function applyUi() {
    bxEl.style.bottom = U.boxes.bottom;
    bxEl.style.gap = U.boxes.gap;
    boxEls.forEach((box, i) => {
      const o = i === 0 ? U.boxes.box1 : (i === 1 && boxEls.length > 2 ? U.boxes.box3 : U.boxes.box2);
      box.style.cssText = `width:${U.boxes.width};height:${U.boxes.height};border-radius:${U.boxes.radius};border:${U.boxes.border};background:${U.boxes.bg};display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;transform:translate(${o.dx}px,${o.dy}px);`;
    });
    const wasOpen = panel.style.display === "block";
    panel.style.cssText = `display:${wasOpen ? "block" : "none"};position:absolute;bottom:${U.panel.bottom};left:50%;transform:translate(calc(-50% + ${U.panel.dx}px),${U.panel.dy}px);z-index:6;max-width:${U.panel.maxWidth};padding:10px 14px;border-radius:10px;background:${U.panel.bg};border:${U.panel.border};color:#fff;font-size:${U.panel.fontSize};text-align:center;`;
    const stEl2 = ov.querySelector("#hdStars");
    stEl2.style.transform = `translateX(-50%) translateY(${starDy}px)`;
    stEl2.querySelectorAll("span").forEach(s => s.style.fontSize = starSize + "px");
  }

  // ── 🎛 CANLI UI EDİTÖRÜ ──
  const uiPanel = ov.querySelector("#hdUiPanel");
  ov.querySelector("#hdUiTune").onclick = () => {
    uiPanel.style.display = uiPanel.style.display === "none" ? "block" : "none";
  };
  let uiTarget = "box1";
  const tgtNames = { box1: "Kutu 1", box2: "Kutu 2", box3: "Kutu 3", boxes: "Hepsi", panel: "Panel", stars: "Yıldız", model: "Kahraman" };
  ov.querySelectorAll(".uiTgt").forEach(b => b.onclick = () => {
    uiTarget = b.dataset.t;
    ov.querySelector("#uiTgtLabel").textContent = tgtNames[uiTarget];
    if (uiTarget === "panel" && panel.dataset.open === undefined || uiTarget === "panel" && panel.style.display !== "block") {
      panel.innerHTML = `<div style="font-weight:800;margin-bottom:4px;">Örnek Başlık</div><div>Panel konum ayarı için örnek metin.</div>`;
      panel.style.display = "block"; panel.dataset.open = "edit";
    }
  });
  const STEP = 5;
  const px = v => parseInt(v) || 0;
  ov.querySelectorAll(".uiMv").forEach(b => b.onclick = () => {
    const dx = +b.dataset.x * STEP, dy = +b.dataset.y * STEP;
    if (uiTarget === "model") {
      if (!modelAPI) return;
      modelAPI.off.x = Math.round((modelAPI.off.x + dx * 0.01) * 1000) / 1000;
      modelAPI.off.y = Math.round((modelAPI.off.y - dy * 0.01) * 1000) / 1000; // ▲ = yukarı
      modelAPI.applyOff();
      return;
    }
    if (uiTarget === "box1") { U.boxes.box1.dx += dx; U.boxes.box1.dy += dy; }
    else if (uiTarget === "box2") { U.boxes.box2.dx += dx; U.boxes.box2.dy += dy; }
    else if (uiTarget === "box3") { U.boxes.box3.dx += dx; U.boxes.box3.dy += dy; }
    else if (uiTarget === "boxes") { U.boxes.bottom = (px(U.boxes.bottom) - dy) + "px"; U.boxes.box1.dx += dx; U.boxes.box2.dx += dx; }
    else if (uiTarget === "panel") { U.panel.dx += dx; U.panel.dy += dy; }
    else if (uiTarget === "stars") { starDy += dy; }
    applyUi();
  });
  ov.querySelector("#uiGrow").onclick = () => {
    if (uiTarget === "model") { if (modelAPI) { modelAPI.off.s = Math.round((modelAPI.off.s + 0.05) * 100) / 100; modelAPI.applyOff(); } return; }
    if (uiTarget === "panel") U.panel.fontSize = (px(U.panel.fontSize) + 1) + "px";
    else if (uiTarget === "stars") starSize += 2;
    else { U.boxes.width = (px(U.boxes.width) + STEP) + "px"; U.boxes.height = (px(U.boxes.height) + STEP) + "px"; }
    applyUi();
  };
  ov.querySelector("#uiShrink").onclick = () => {
    if (uiTarget === "model") { if (modelAPI) { modelAPI.off.s = Math.max(0.1, Math.round((modelAPI.off.s - 0.05) * 100) / 100); modelAPI.applyOff(); } return; }
    if (uiTarget === "panel") U.panel.fontSize = Math.max(8, px(U.panel.fontSize) - 1) + "px";
    else if (uiTarget === "stars") starSize = Math.max(10, starSize - 2);
    else { U.boxes.width = Math.max(20, px(U.boxes.width) - STEP) + "px"; U.boxes.height = Math.max(20, px(U.boxes.height) - STEP) + "px"; }
    applyUi();
  };
  ov.querySelector("#uiShowVals").onclick = () => {
    const stEl2 = ov.querySelector("#hdStars");
    const newPosY = ((stEl2.offsetTop + starDy) / ov.clientHeight * 100).toFixed(1) + "%";
    const modelTxt = modelAPI
      ? `── heroes.js → HERO_3D → model ──
position: { x: ${modelAPI.off.x}, y: ${modelAPI.off.y}, z: ${modelAPI.off.z} }, scale: ${modelAPI.off.s}
`
      : "";
    ov.querySelector("#uiVals").textContent =
`── heroes.js → HERO_UI ──
boxes:
  bottom: "${U.boxes.bottom}", gap: "${U.boxes.gap}",
  width: "${U.boxes.width}", height: "${U.boxes.height}",
  box1: { dx: ${U.boxes.box1.dx}, dy: ${U.boxes.box1.dy} },
  box2: { dx: ${U.boxes.box2.dx}, dy: ${U.boxes.box2.dy} },
  box3: { dx: ${U.boxes.box3.dx}, dy: ${U.boxes.box3.dy} }
panel:
  bottom: "${U.panel.bottom}", fontSize: "${U.panel.fontSize}",
  dx: ${U.panel.dx}, dy: ${U.panel.dy}
── heroes.js → HERO_3D → stars ──
size: "${starSize}px", posY: "${newPosY}"
${modelTxt}`;
  };

  ov.querySelector("#uiCopyVals").onclick = () => {
    const btn = ov.querySelector("#uiCopyVals");
    const txt = ov.querySelector("#uiVals").textContent || "";
    if (!txt) { btn.textContent = "Önce 'Değerleri Göster'"; setTimeout(()=>btn.textContent="📋 Kopyala", 1500); return; }
    const done = ok => { btn.textContent = ok ? "✅ Kopyalandı" : "✘ Kopyalanamadı"; setTimeout(()=>btn.textContent="📋 Kopyala", 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(()=>done(true)).catch(()=>{
        const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText="position:fixed;opacity:0;";
        document.body.appendChild(ta); ta.focus(); ta.select();
        let ok=false; try{ ok=document.execCommand("copy"); }catch(e){}
        ta.remove(); done(ok);
      });
    } else {
      const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText="position:fixed;opacity:0;";
      document.body.appendChild(ta); ta.focus(); ta.select();
      let ok=false; try{ ok=document.execCommand("copy"); }catch(e){}
      ta.remove(); done(ok);
    }
  };

  applyUi();

  /* ── SATIN AL / GELİŞTİR ── */
  const buyBtn = ov.querySelector("#hdBuyBtn");
  /* HERO_UI → buyBtn ayarlarını uygula (U burada artık tanımlı) */
  if (U.buyBtn) {
    buyBtn.style.bottom = U.buyBtn.bottom;
    buyBtn.style.width = U.buyBtn.width;
    buyBtn.style.height = U.buyBtn.height;
    buyBtn.style.fontSize = U.buyBtn.fontSize;
    /* ORTALAMA transform ile YAPILMAZ: tema.js basma efekti transform'u
       scale(.96) ile ezince düğme sağa kayıyordu. Ortalama artık left ile. */
    const _gen = parseFloat(U.buyBtn.width) || 64;
    buyBtn.style.left = ((100 - _gen) / 2) + "%";
    buyBtn.style.transform = `translate(${U.buyBtn.dx || 0}px, ${U.buyBtn.dy || 0}px)`;
  }
  const refreshBuyBtn = () => {
    const owned = (state.ownedHeroSkins || []).includes(skinId);
    /* Sahip olunan kahramanda alt düğme YOK — geliştirme paneli
       zaten ekranın altında duruyor (gelistir.js).
       Sistem kapalıyken eski davranış: "Geliştir" yazar. */
    const glsAcik = (typeof window.GELISTIR_ACIK === "function") && window.GELISTIR_ACIK();
    buyBtn.style.display = (owned && glsAcik) ? "none" : "";
    buyBtn.textContent = owned
      ? "Geliştir"
      : `Satın Al  💎 ${(h.price || 0).toLocaleString("tr-TR")}`;
  };
  buyBtn.onclick = () => {
    const owned = (state.ownedHeroSkins || []).includes(skinId);
    if (owned) {
      if (typeof window.GELISTIR_ACIK === "function" && window.GELISTIR_ACIK()) {
        window.acGelistirme(skinId);
      } else if (typeof showToast === "function") {
        showToast("Geliştirme sistemi yakında!");
      }
      refreshBuyBtn();
      return;
    }
    const price = h.price || 0;
    if ((state.diamonds || 0) < price) {
      if (typeof showToast === "function") showToast(`Yeterli elmasın yok. ${h.name} için 💎 ${price.toLocaleString("tr-TR")} gerekiyor.`);
      return;
    }
    state.diamonds -= price;
    if (!state.ownedHeroSkins) state.ownedHeroSkins = [];
    state.ownedHeroSkins.push(skinId);
    if (typeof renderDiamonds === "function") renderDiamonds();
    if (typeof persistCurrentState === "function") persistCurrentState();
    if (typeof showToast === "function") showToast(`${h.name} artık senin komutanın! ⚔️`);
    refreshBuyBtn();
  };
  refreshBuyBtn();
  window.glsBtnTazele = refreshBuyBtn;

  /* ── GELİŞTİRME PANELİ — ekran açılır açılmaz gelir ── */
  if (typeof window.acGelistirme === "function") {
    setTimeout(() => window.acGelistirme(skinId), 0);   /* Tuzak 35 */
  }

  const passBtn = ov.querySelector("#hdPassive");
  if (passBtn) passBtn.onclick = () => {
    if (panel.dataset.open === "passive") { panel.style.display = "none"; panel.dataset.open = ""; return; }
    panel.innerHTML = `<div style="font-weight:800;margin-bottom:4px;">${h.passive.title || "Pasif Yetenek"}</div><div>${h.passive.desc || ""}</div>`;
    panel.style.display = "block";
    panel.dataset.open = "passive";
  };

  ov.querySelector("#hdClose").onclick = () => {
    ov.style.display = "none";
    cleanup();
  };

  // Kahraman görseli (WebP) — HERO_IMG'den
  const heroImg = (typeof HERO_IMG !== "undefined") ? HERO_IMG[skinId] : null;
  if (heroImg) {
    const vw0 = ov.clientWidth, vh0 = ov.clientHeight;
    let cw0 = vw0, ch0 = vw0 * 16 / 9;
    if (ch0 > vh0) { ch0 = vh0; cw0 = vh0 * 9 / 16; }
    const imEl = document.createElement("img");
    imEl.src = heroImg;
    imEl.style.cssText = `position:absolute;left:50%;top:50%;width:${cw0}px;height:${ch0}px;object-fit:contain;z-index:1;pointer-events:none;`;
    const bgRef = ov.querySelector("video,img");
    ov.insertBefore(imEl, bgRef ? bgRef.nextSibling : ov.firstChild);

    /* ── Ayar modu (görsel) — 3D ile aynı birimler, heroes.js'e aynı formatta yazılır ── */
    const off = { x: cfg.model.position.x, y: cfg.model.position.y, z: cfg.model.position.z, s: cfg.model.scale,
                  rx: cfg.model.rotation.x, ry: cfg.model.rotation.y };
    const pxPerUnit = ch0 / 3.3; // 3D sahnedeki ~1 birim ≈ ekranda bu kadar px
    const applyOff = () => {
      imEl.style.transform =
        `translate(-50%,-50%) translate(${off.x * pxPerUnit}px, ${-off.y * pxPerUnit}px) perspective(700px) rotateX(${off.rx - 33}deg) rotate(${off.ry}deg) scale(${off.s})`;
    };
    modelAPI = { off, applyOff }; // 🎛 canlı editörün "Kahraman" hedefi bunu kullanır
    ov.querySelector("#hdTune").onclick = () => {
      const p = ov.querySelector("#hdTunePanel");
      p.style.display = p.style.display === "none" ? "block" : "none";
    };
    const showVals = () => {
      ov.querySelector("#hdVals").textContent =
        `position:{x:${off.x},y:${off.y},z:${off.z}}, rotation:{x:${off.rx},y:${off.ry}}, scale:${off.s}`;
    };
    let fineMode = false;
    const fineBtn = ov.querySelector("#hdFine");
    if (fineBtn) fineBtn.onclick = () => {
      fineMode = !fineMode;
      fineBtn.textContent = fineMode ? "🔬 İnce ayar: AÇIK" : "🔬 İnce ayar: KAPALI";
      fineBtn.style.background = fineMode ? "#d4af37" : "#333";
      fineBtn.style.color = fineMode ? "#000" : "#fff";
    };
    ov.querySelectorAll(".hdT").forEach(btn => {
      btn.onclick = () => {
        const k = btn.dataset.k, v = parseFloat(btn.dataset.v) * (fineMode ? 0.2 : 1);
        off[k] = Math.round((off[k] + v) * 1000) / 1000;
        applyOff(); showVals();
      };
    });
    ov.querySelectorAll(".hdR").forEach(btn => {
      btn.onclick = () => {
        const k = btn.dataset.k === "x" ? "rx" : "ry", v = parseFloat(btn.dataset.v) * (fineMode ? 0.2 : 1);
        off[k] = Math.round((off[k] + v) * 10) / 10;
        applyOff(); showVals();
      };
    });
    ov.querySelector("#hdShowVals").onclick = showVals;
    const copyBtn = ov.querySelector("#hdCopyVals");
    if (copyBtn) copyBtn.onclick = () => {
      showVals();
      const txt = ov.querySelector("#hdVals").textContent;
      const done = () => { copyBtn.textContent = "✓ Kopyalandı"; setTimeout(() => copyBtn.textContent = "📋 Kopyala", 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done).catch(() => {
          /* eski tarayıcı yedeği */
          const ta = document.createElement("textarea");
          ta.value = txt; document.body.appendChild(ta);
          ta.select(); document.execCommand("copy");
          document.body.removeChild(ta); done();
        });
      } else {
        const ta = document.createElement("textarea");
        ta.value = txt; document.body.appendChild(ta);
        ta.select(); document.execCommand("copy");
        document.body.removeChild(ta); done();
      }
    };
    showVals();
    applyOff();
    return;
  }
  /* 3B model desteği kaldırıldı — kahramanlar artık WebP görsel.
     Eskiden burada three.js ile GLB yükleyen ~115 satır vardı; HERO_GLB
     boş olduğu için o kod zaten hiç çalışmıyordu. Yukarıdaki HERO_IMG
     bloğu her kahraman için return ediyor, buraya düşülmüyor. */
  if (!heroImg) console.warn("[heroes.js] Görsel yok:", skinId);
}


/* ═══════════════════════════════════════════════════════════════
   SAVAŞ ÖNCESİ KOMUTAN SEÇME PANELİ  (yenilendi)
   ---------------------------------------------------------------
   • Savaş ekranında MAX_KOMUTAN kadar boş "yuva" görünür.
   • Bir yuvaya dokununca, sahip olduğun TÜM kahramanlar
     PNG'li bir ızgara halinde açılır; tek tek seçip atarsın.
   • Portreler HERO_IMG'den gelir (birleştiricinin 9. kartına
     buz_savascisi.png gibi dosyaları yükle). Görsel yoksa
     kahramanın uzmanlık simgesi gösterilir.
   ═══════════════════════════════════════════════════════════════ */

/* ── portre üretici: önce PNG, yoksa simge ── */
function heroPortraitHTML(id, cls) {
  const h = HERO_STATS[id];
  if (!h) return "";
  const img = (typeof HERO_IMG !== "undefined") ? HERO_IMG[id] : null;
  if (img) return `<img class="${cls}" src="${img}" alt="${h.name}" draggable="false">`;
  return `<div class="${cls} hpk-noimg" style="background:${h.color}22;color:${h.color};">${h.specialtyIcon || "🦸"}</div>`;
}

/*  ─────────────────────────────────────────────
    HPK_KART — SAVAŞ YUVASININ KART AYARI

    Savaş ekranındaki komutan yuvaları artık Kahramanlar menüsündeki
    kartın AYNISINI çizer. Kartın kendisi kahramanlar.js'in
    _klistKartHTML() fonksiyonundan gelir; zemin (KLIST_ZEMIN),
    kademe (KLIST_KADEME), portre kaydırma/büyütme (KLIST_KART) ve
    siliklik oradan okunur — burada TEKRAR YAZILMAZ. Kahramanın
    duruşunu düzeltmek istersen kahramanlar.js → KLIST_KART'a git,
    iki menü birden düzelir.

    Burada yalnız savaş ekranına özgü ölçüler var.
    ───────────────────────────────────────────── */
/*  ── HPK_YUVA — YUVANIN ÖLÇÜSÜ (tek yer) ──────────────────────
    ESKİ HALİ SİLİNDİ. Önceden "aspect-ratio: 3/4" yazıyordu; yani
    yükseklik, panelin o anki genişliğinden HESAPLANIYORDU. Kahraman
    eklenince panelin içeriği uzuyor, kaydırma alanı değişiyor,
    genişlik bir tık oynuyor ve yükseklik onunla birlikte yeniden
    hesaplanıyordu — menü her seferinde zıplıyordu.

    Artık yükseklik SABİT PİKSEL. İçerikten, kaydırmadan, portrenin
    ne zaman yüklendiğinden bağımsız. Hiç kıpırdamaz.

    Boyu değiştirmek istersen SADECE `yukseklik` sayısını değiştir.
    119 sayısı ÖLÇÜLEREK bulundu: kahraman menüsündeki kart
    100 en × 133 boy, yani tam 3'e 4. Savaş panelinin iç boşlukları
    (12 + 14 + 11) düşünce yuvaya ~89 genişlik kalıyor; aynı oranı
    tutturan boy 119'dur. Genişlik değişirse bu sayı da değişmeli.
    ───────────────────────────────────────────────────────────── */
const HPK_YUVA = {
  yukseklik: 119,   /* yuvanın SABİT boyu (px) — asıl ayar bu */
  bosluk:      9,   /* yuvalar arası boşluk (px) */
  pay_yan:    11,   /* satırın sağ/sol iç boşluğu (px) — − düğmesi taşıyor */
  pay_ust:    11,   /* satırın üst iç boşluğu (px)     — − düğmesi taşıyor */
  kose:       14    /* boş yuvanın köşe yuvarlaklığı (px) */
};

const HPK_KART = {
  sv_bs:     12,       /* "Sv. 1" yazı boyutu (px) — 0 = listedeki değer  */
  yildiz_bs: 17,       /* yıldız boyutu (px)      — 0 = listedeki değer  */
  specGoster: true     /* sol üstteki uzmanlık rozeti                    */
};

/* ── panel CSS (bir kez enjekte edilir) ── */
(function injectPickerCSS() {
  if (document.getElementById("hpkStyles")) return;
  const st = document.createElement("style");
  st.id = "hpkStyles";
  st.textContent = `
/* ── yuvalar ── */
/* Oyunun kendi #heroPicker kuralı display:flex — bu, yuva kutusunun
   genişliğini içeriğe göre hesaplattığı için kutular birbirini eziyordu.
   Burada blok yapıp tam genişliği garantiye alıyoruz. */
#heroPicker.hero-picker-row{
  display:block !important;
  overflow-x:visible !important;
}
/* Izgara: sütunlar eşit böler, yükseklik SABİT.
   flex + aspect-ratio bilerek kullanılmadı — bkz. HPK_YUVA notu. */
.hpk-slots{
  display:grid;
  grid-auto-flow:column; grid-auto-columns:1fr;
  gap:${HPK_YUVA.bosluk}px; width:100%;
  padding:${HPK_YUVA.pay_ust}px ${HPK_YUVA.pay_yan}px 4px;
  box-sizing:border-box;
}
.hpk-slot{
  position:relative;
  min-width:0;
  height:${HPK_YUVA.yukseklik}px;         /* SABİT — hesaplanmaz */
  min-height:${HPK_YUVA.yukseklik}px;
  max-height:${HPK_YUVA.yukseklik}px;
  border-radius:${HPK_YUVA.kose}px; cursor:pointer; box-sizing:border-box;
  background:linear-gradient(180deg, rgba(255,255,255,.16), rgba(8,45,80,.35));
  border:2px dashed rgba(190,240,255,.6);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:4px; transition:transform .1s, border-color .15s, box-shadow .15s;
  -webkit-tap-highlight-color:transparent;
}
.hpk-slot:active{ transform:scale(.97); }
/* DOLU YUVA: görünümün tamamı içindeki .klist-card'a aittir.
   Yuvanın kendi zemini/çerçevesi kapatılır, yoksa kartın altından
   ikinci bir kutu görünür. */
.hpk-slot.filled{
  background:none !important; border:0 !important; box-shadow:none !important;
  padding:0 !important;
}
/* Liste kartı savaş yuvasının içinde: yuvayı tam doldurur */
.hpk-slot .klist-card{
  width:100% !important; height:100% !important;
  transform:none !important;          /* listedeki ızgara kaydırması burada geçersiz */
  cursor:pointer;
}
.hpk-slot .klist-lv{ ${HPK_KART.sv_bs ? `font-size:${HPK_KART.sv_bs}px !important;` : ""} }
.hpk-slot .klist-stars{ ${HPK_KART.yildiz_bs ? `font-size:${HPK_KART.yildiz_bs}px !important;` : ""} }
${HPK_KART.specGoster ? "" : ".hpk-slot .klist-spec{ display:none !important; }"}
.hpk-plus{ font-size:38px; font-weight:900; color:rgba(235,250,255,.85); line-height:1;
  text-shadow:0 2px 5px rgba(0,30,55,.55); }
.hpk-hint{ display:none; }
.hpk-num{ display:none; }
.hpk-slot img.hpk-portrait, .hpk-slot .hpk-portrait{
  position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; object-position:top center;
}
.hpk-portrait.hpk-noimg{
  display:flex; align-items:center; justify-content:center; font-size:34px;
}
.hpk-slot .hpk-cap{
  display:none;                      /* savaş ekranında kahraman adı gösterilmez */
}
.hpk-x{
  position:absolute; top:5px; right:5px; z-index:4;
  width:24px; height:24px; border:none; border-radius:7px;   /* KARE köşe */
  background:linear-gradient(180deg,#f03434,#c00d0d); color:#fff;
  font-size:14px; font-weight:900; line-height:24px; text-align:center;
  cursor:pointer; padding:0; -webkit-tap-highlight-color:transparent;
  box-shadow:0 2px 5px rgba(120,0,0,.4), inset 0 1px 0 rgba(255,255,255,.35);
}
.hpk-x:active{ transform:scale(.9); }
.hpk-empty-msg{ font-size:12px; color:var(--ink-dim); padding:6px 0; }

/* ── seçim penceresi ── */
/* Arka plan NE KARARTILIR NE BULANIKLAŞTIRILIR ve dokunuşları
   YUTMAZ (pointer-events:none). Savaş paneli açık ve tıklanabilir
   kalır: yanlış kahraman seçildiyse oyuncu yuvadaki ✕ düğmesine
   hemen basabilir, pencereyi kapatmasına gerek kalmaz.
   Pencere aşağıda durur ki üstteki yuvalar görünsün.
   Dışarı dokununca kapatma işi CSS'e değil, openHeroPickModal
   içindeki dinleyiciye aittir (zemin artık dokunuş almıyor). */
.hpk-back{
  position:fixed; inset:0; z-index:340;
  background:none; pointer-events:none;
  display:flex; align-items:flex-end; justify-content:center;
  padding:16px 16px 9vh;
  animation:hpkFade .15s ease;
}
@keyframes hpkFade{ from{opacity:0} to{opacity:1} }
@keyframes hpkPop{ from{opacity:0; transform:translateY(14px) scale(.95)} to{opacity:1; transform:none} }
.hpk-modal{
  pointer-events:auto;   /* zemin dokunuş almıyor, pencere alıyor */
  width:min(420px,94vw); max-height:66vh; display:flex; flex-direction:column;
  border-radius:18px; overflow:hidden;
  /* magaza.js ile birebir aynı şablon */
  background:
    radial-gradient(ellipse 100% 50% at 50% 0%, rgba(170,240,255,.5), transparent 72%),
    radial-gradient(ellipse 80% 40% at 50% 105%, rgba(8,45,80,.55), transparent 75%),
    linear-gradient(180deg, #1fa3ea, #0e6fc0);
  border:2px solid rgba(190,240,255,.5);
  box-shadow:0 2px 6px rgba(0,20,45,.3);
  font-family:'Baloo 2',sans-serif; color:#eaf4ff;
  animation:hpkPop .18s cubic-bezier(.2,.9,.3,1.3);
}
/* Başlık şeridi ve ✕ düğmesi KALDIRILDI — pencere yalnız kartlardan
   ibaret. Kapatma: dışarıya dokunmak. Kurallar duruyor ki eski bir
   kayıttan gelen artık düğüm ekranda görünmesin. */
.hpk-top{ display:none !important; }
.hpk-close{ display:none !important; }
.hpk-grid{
  display:grid; grid-template-columns:repeat(3,1fr); gap:9px;
  padding:14px 13px 16px; overflow-y:auto; -webkit-overflow-scrolling:touch;
}
/*  KART: kendi kutusu YOK. Görünümün tamamı içindeki .klist-card'a
    aittir — kahraman menüsüyle birebir aynı kart. Buraya zemin,
    çerçeve veya gölge yazarsan kartın altından ikinci bir kutu
    görünür (savaş yuvasında da aynı kural geçerli). */
.hpk-card{
  position:relative; aspect-ratio:3/4; min-width:0;
  background:none; border:0; box-shadow:none; padding:0;
  cursor:pointer; -webkit-tap-highlight-color:transparent;
  transition:transform .09s;
}
.hpk-card:active{ transform:scale(.96); }
/* Liste kartı pencerenin içinde: hücreyi tam doldurur */
.hpk-card .klist-card{
  width:100% !important; height:100% !important;
  transform:none !important;          /* listedeki ızgara kaydırması burada geçersiz */
  cursor:pointer;
}
.hpk-card .klist-lv{ ${HPK_KART.sv_bs ? `font-size:${HPK_KART.sv_bs}px !important;` : ""} }
.hpk-card .klist-stars{ ${HPK_KART.yildiz_bs ? `font-size:${HPK_KART.yildiz_bs}px !important;` : ""} }
${HPK_KART.specGoster ? "" : ".hpk-card .klist-spec{ display:none !important; }"}
/* Zaten yuvada olan kahraman: ince beyaz kenar, kart görünümü bozulmaz */
.hpk-card.chosen .klist-card{
  border:2px solid rgba(255,255,255,.9) !important;
  box-shadow:0 0 12px rgba(190,240,255,.55) !important;
}
.hpk-card .hpk-cap{ display:none; }
.hpk-badge{ display:none; }
.hpk-spec{ display:none; }
.hpk-note{
  padding:0 14px 14px; font-size:10.5px; font-weight:700;
  color:#dff2ff; text-align:center; line-height:1.45;
  text-shadow:0 1px 2px rgba(0,30,55,.6);
}
`;
  document.head.appendChild(st);
})();

/*  ── KART KÖPRÜSÜ ──
    Savaş yuvasının içeriğini kahramanlar.js'in kart üreticisinden alır:
    zemin, kademe rengi, portre ayarı, siliklik, uzmanlık rozeti,
    seviye ve yıldızlar tek elden gelir.

    kahramanlar.js heroes.js'ten SONRA yüklenir; bu yüzden fonksiyon
    çağrı ANINDA aranır (yükleme anında değil). Dosya hiç yoksa veya
    sırası bozulursa eski düz portreye düşer — savaş ekranı kırılmaz.

    data-hero özniteliği bilerek silinir: kahramanlar.js o özniteliğe
    kendi listesi içinde tıklama bağlıyor, savaş ekranında kartın
    tıklaması yuvaya aittir.                                          */
function hpkKartHTML(id) {
  if (typeof _klistKartHTML === "function") {
    try {
      return _klistKartHTML(id).replace(/\sdata-hero="[^"]*"/, "");
    } catch (e) {
      console.warn("[heroes.js] Kart çizilemedi, düz portreye dönüldü:", e);
    }
  }
  return heroPortraitHTML(id, "hpk-portrait");
}

/* ── hangi yuva için seçim yapılıyor ── */
let _hpkTargetSlot = 0;

/*  ── YOLDAKİ KAHRAMANLAR ──
    Her kahramandan bir tane var; yolda olan bir orduyla giden kahraman
    ikinci bir sefere verilemez. Ayrı bir liste TUTULMAZ — tek doğru
    kaynak sefer kayıtlarıdır (`SEFER.benimkiler()`), her kayıtta
    `komutanlar` yazılı. Ordu dönünce kayıt silindiği için kahraman
    kendiliğinden serbest kalır.
    sefer.js yoksa veya bir hata olursa boş liste döner — kilit
    devreye girmez, oyun eski gibi çalışır.                          */
function seferdekiKomutanlar() {
  const out = [];
  try {
    if (!window.SEFER || typeof window.SEFER.benimkiler !== "function") return out;
    window.SEFER.benimkiler().forEach(x => {
      const k = x && x.s && x.s.komutanlar;
      if (!Array.isArray(k)) return;
      k.forEach(id => { if (id && out.indexOf(id) === -1) out.push(id); });
    });
  } catch (e) {
    console.warn("[heroes.js] Seferdeki kahramanlar okunamadı:", e);
  }
  return out;
}

/* ── ANA FONKSİYON: yuvaları çiz ── */
function renderHeroPickerForBattle() {
  const el = document.getElementById("heroPicker");
  if (!el) return;

  const owned = (state.ownedHeroSkins || []).filter(id => HERO_STATS[id]);
  if (owned.length === 0) {
    el.innerHTML = `<div class="hpk-empty-msg">Henüz kahraman satın almadın. Mağazadan kahraman edinebilirsin.</div>`;
    return;
  }

  /* önceki seçimi state'ten geri yükle (kalıcı olsun, her savaşta sıfırlanmasın) */
  if ((!selectedCommanders || selectedCommanders.length === 0) && Array.isArray(state.selectedCommanders)) {
    selectedCommanders = state.selectedCommanders.slice();
  }

  /* elde olmayan komutanları listeden temizle */
  selectedCommanders = selectedCommanders.filter(id => owned.indexOf(id) !== -1);

  /* Aile başına tek komutan kuralı — kural konmadan önce kaydedilmiş
     seçimler ihlal içerebilir (örn. MİKİAN + İVANOVNA birlikte).
     Fazlası sessizce düşer, listedeki İLKİ kalır. */
  selectedCommanders = komutanlariSuz(selectedCommanders);

  /* YOLDA OLANI YUVADAN DÜŞÜR — yuva boş "+" görünür, tekrar
     gönderilemez. Ordu dönünce kahraman yeniden seçilebilir. */
  const yolda = seferdekiKomutanlar();
  if (yolda.length) {
    selectedCommanders = selectedCommanders.filter(id => yolda.indexOf(id) === -1);
  }

  let html = `<div class="hpk-slots">`;
  for (let i = 0; i < MAX_KOMUTAN; i++) {
    const id = selectedCommanders[i];
    if (id) {
      html += `
        <div class="hpk-slot filled" data-slot="${i}">
          ${hpkKartHTML(id)}
          <button class="hpk-x" data-remove="${i}" title="Çıkar">✕</button>
        </div>`;
    } else {
      html += `
        <div class="hpk-slot" data-slot="${i}">
          <div class="hpk-plus">+</div>
        </div>`;
    }
  }
  html += `</div>`;
  el.innerHTML = html;

  el.querySelectorAll(".hpk-slot").forEach(slot => {
    slot.addEventListener("click", (e) => {
      if (e.target.closest(".hpk-x")) return;      /* ✕ butonu ayrı çalışır */
      openHeroPickModal(parseInt(slot.dataset.slot, 10));
    });
  });
  el.querySelectorAll(".hpk-x").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.remove, 10);
      selectedCommanders.splice(i, 1);
      refreshAfterCommanderChange();
    });
  });
}

/* ── SEÇİM PENCERESİ: sahip olunan tüm kahramanlar ──
   Pencere seçim yapıldığında KAPANMAZ; listesi yenilenir ve dolan
   ailenin kahramanları listeden düşer. Böylece oyuncu üç yuvayı
   pencereyi kapatmadan doldurabilir.

   Arka plan karartılmaz ve dokunuşları YUTMAZ (pointer-events:none):
   savaş paneli açık kalır, yanlış kahraman seçildiyse oyuncu yuvadaki
   ✕ düğmesine hemen basabilir.

   KAPANIR: boşluğa dokununca ya da bütün yuvalar dolunca.
   KAPANMAZ: pencerenin kendisi, yuvalar ve ✕ düğmesi — oyuncu ✕
   yerine yanlışlıkla kahramanın üstüne bassa da pencere durur.      */
function hpkBosYuva() {
  for (let i = 0; i < MAX_KOMUTAN; i++) if (!selectedCommanders[i]) return i;
  return -1;
}

/* Pencerede gösterilecek kahramanlar:
   • yolda olan çıkmaz
   • ailesi başka bir komutanla dolmuşsa çıkmaz (hedef yuvadaki hariç) */
function hpkListe(slotIndex) {
  const tumu = (state.ownedHeroSkins || []).filter(id => HERO_STATS[id]);
  const yolda = seferdekiKomutanlar();
  const yuvadaki = selectedCommanders[slotIndex] || null;
  return tumu.filter(id => {
    if (yolda.indexOf(id) !== -1) return false;
    if (id === yuvadaki) return true;
    return !ayniAileden(selectedCommanders, komutanAilesi(id), yuvadaki);
  });
}

function hpkGridCiz(back, slotIndex) {
  const grid = back.querySelector(".hpk-grid");
  if (!grid) return;
  const owned = hpkListe(slotIndex);

  /* KART: kahraman menüsündekiyle AYNI kart (hpkKartHTML → kahramanlar.js). */
  grid.innerHTML = owned.map(id => {
    const at = selectedCommanders.indexOf(id);
    return `
      <div class="hpk-card ${at !== -1 ? "chosen" : ""}" data-pick="${id}">
        ${hpkKartHTML(id)}
      </div>`;
  }).join("");

  grid.querySelectorAll(".hpk-card").forEach(card => {
    card.addEventListener("click", () => assignCommander(card.dataset.pick, _hpkTargetSlot));
  });
}

/* Pencere açıkken listeyi tazele (kahraman eklendi/çıkarıldı). */
function hpkTazele() {
  const back = document.getElementById("hpkBack");
  if (!back) return;
  if (!hpkListe(_hpkTargetSlot).length) { closeHeroPickModal(); return; }
  hpkGridCiz(back, _hpkTargetSlot);
}

let _hpkDisDokunus = null;

function openHeroPickModal(slotIndex) {
  closeHeroPickModal();
  _hpkTargetSlot = slotIndex;

  if (!(state.ownedHeroSkins || []).filter(id => HERO_STATS[id]).length) {
    if (typeof showToast === "function") showToast("Hiç kahramanın yok.");
    return;
  }
  if (!hpkListe(slotIndex).length) {
    if (typeof showToast === "function") showToast("Seçilebilecek kahraman yok.");
    return;
  }

  const back = document.createElement("div");
  back.className = "hpk-back";
  back.id = "hpkBack";
  back.innerHTML = `<div class="hpk-modal"><div class="hpk-grid"></div></div>`;
  document.body.appendChild(back);
  hpkGridCiz(back, slotIndex);

  /* PENCERE BOYU İLK AÇILIŞTA KİLİTLENİR.
     Kahraman seçilince liste kısalıyor; pencere alta yaslı olduğu
     için kısalan kutu aşağı kayıyor ve ekranda zıplıyordu. İlk
     ölçülen yükseklik sabitlenirse pencere hep aynı yerde durur.
     Liste sonradan uzarsa grid zaten kendi içinde kayıyor. */
  const grid = back.querySelector(".hpk-grid");
  if (grid) {
    const y = grid.offsetHeight;
    if (y > 0) grid.style.height = y + "px";
  }

  /* Dışarı dokunma dinleyicisi. setTimeout(0): pencereyi AÇAN dokunuş
     hâlâ yayılıyor; hemen bağlanırsa pencere açıldığı anda kapanır. */
  setTimeout(() => {
    if (!document.getElementById("hpkBack")) return;
    _hpkDisDokunus = (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      /* pencerenin kendisi, yuvalar ve ✕ → kapatmaz */
      if (t.closest(".hpk-modal, .hpk-slot, .hpk-x")) return;
      closeHeroPickModal();
    };
    document.addEventListener("click", _hpkDisDokunus, true);
  }, 0);
}

function closeHeroPickModal() {
  const b = document.getElementById("hpkBack");
  if (b) b.remove();
  if (_hpkDisDokunus) {
    document.removeEventListener("click", _hpkDisDokunus, true);
    _hpkDisDokunus = null;
  }
}

/* ── kahramanı yuvaya ata (gerekirse yer değiştir) ── */
function assignCommander(heroId, slotIndex) {
  if (!HERO_STATS[heroId]) return;

  /* Pencere açıkken o kahraman yola çıkmış olabilir — son kontrol. */
  if (seferdekiKomutanlar().indexOf(heroId) !== -1) {
    if (typeof showToast === "function") showToast("Bu kahraman şu an yolda.");
    closeHeroPickModal();
    renderHeroPickerForBattle();
    return;
  }

  /* listeyi MAX_KOMUTAN uzunluğunda sabit bir diziye çevir */
  const slots = [];
  for (let i = 0; i < MAX_KOMUTAN; i++) slots.push(selectedCommanders[i] || null);

  const already = slots.indexOf(heroId);

  /* AİLE BAŞINA TEK KOMUTAN. Aynı aileden ikincisi seçilmeye
     çalışılırsa seçim DEĞİŞMEZ, uyarı verilir. Kendi yuvasına tekrar
     dokunmak (çıkarma) ve yuva değiştirme bu kurala takılmaz. */
  if (already === -1) {
    const aile = komutanAilesi(heroId);
    const cakisan = ayniAileden(slots, aile, slots[slotIndex]);
    if (cakisan) {
      const adi = (HERO_STATS[cakisan] && HERO_STATS[cakisan].name) || cakisan;
      if (typeof showToast === "function") {
        showToast((KOMUTAN_AILE_ADI[aile] || "Bu") + " yuvası dolu — önce " + adi + " komutanını çıkar.");
      }
      /* Pencere kapanmaz; liste zaten bu kahramanı göstermiyor
         olmalıydı — buraya düşmek bir emniyet frenidir. */
      return;
    }
  }

  if (already === slotIndex) {          /* aynı yuvaya tekrar dokunuldu → çıkar */
    slots[slotIndex] = null;
  } else if (already !== -1) {          /* başka yuvadaysa → yer değiştir */
    slots[already] = slots[slotIndex];
    slots[slotIndex] = heroId;
  } else {                              /* boş atama */
    slots[slotIndex] = heroId;
  }

  selectedCommanders = slots.filter(Boolean);

  /* Pencere AÇIK KALIR. Hedef yuva bir sonraki boş yuvaya kayar ki
     ikinci seçim ilkinin üstüne yazmasın. Boş yuva kalmadıysa iş
     bitmiştir → kapat. */
  const bos = hpkBosYuva();
  _hpkTargetSlot = bos;
  if (bos === -1) closeHeroPickModal();

  refreshAfterCommanderChange();
}

function refreshAfterCommanderChange() {
  /* seçimi kalıcı olarak state'e kaydet */
  state.selectedCommanders = selectedCommanders.slice();
  if (typeof persistCurrentState === "function") persistCurrentState();
  renderHeroPickerForBattle();
  hpkTazele();                 /* pencere açıksa listesi yenilensin */
  if (typeof updateTroopSelectSummary === "function") updateTroopSelectSummary();
  if (typeof renderEnemyPowerPreview === "function") renderEnemyPowerPreview();
}

/* Kahraman varlıkları — dosya yolları (düz mod, klasörsüz) */
const HERO_IMG = {"ates_buyucusu": "hero_ates_buyucusu.webp", "buz_savascisi": "hero_buz_savascisi.webp", "celik_savasci": "hero_celik_savasci.webp", "ivanovna": "hero_ivanovna.webp", "revolia": "hero_revolia.webp"};
const HERO_BG = {"ates_buyucusu": {"data": "herobg_ates_buyucusu.webp", "type": "image"}, "buz_savascisi": {"data": "herobg_buz_savascisi.webp", "type": "image"}, "celik_savasci": {"data": "herobg_celik_savasci.webp", "type": "image"}, "ivanovna": {"data": "herobg_ivanovna.webp", "type": "image"}, "revolia": {"data": "herobg_revolia.webp", "type": "image"}};
