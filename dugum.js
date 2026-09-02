/* ============================================================
   dugum.js — HARİTADAKİ DİNAMİK DÜĞÜMLER
   ------------------------------------------------------------
   Kaynak arazileri + canavarlar. Eski `enemies` dizisinin
   (index.html, 15 sabit canavar) yerini alır.

   ── TASARIM: "B MODÜLÜ" ──
   Konumlar TOHUMDAN üretilir; buluta YAZILMAZ. Her istemci aynı
   tohumdan aynı konumu hesaplar, o yüzden herkes aynı haritayı
   görür ve Firebase'e 176 kayıt yazılmaz.

   Buluta yalnız DEĞİŞEN durum yazılır:
     dugumler/{slotId} = { n, k, it, ia, iat }
       n   → nesil (kaçıncı doğuş; konumu bu belirler)
       k   → kalan kaynak miktarı
       it  → işgal eden oyuncunun anahtarı (yoksa boş)
       ia  → işgal edenin kullanıcı adı (haritada bu görünür)
       iat → işgalin başladığı zaman damgası

   Yani 176 düğümün 170'i hiç yazılmaz — sadece dokunulanlar.

   ── SLOT NEDİR ──
   Her tür+seviye için sabit sayıda "slot" vardır (Sv.1'den 10,
   Sv.2'den 7, Sv.3'ten 5). Slot ÖLMEZ; içindeki düğüm tükenince
   slot bir sonraki NESLE geçer ve o neslin konumu tohumdan
   yeniden hesaplanır. Böylece haritadaki düğüm sayısı hep sabit
   kalır ama konumlar sürekli değişir.

   ── KOORDİNAT ──
   Bu dosyada tek bir çevrim sayısı GÖMÜLÜ DEĞİLDİR. Konumlar TAM
   SAYI KARO (0..140) üretir; ölçek/yüzde gerekiyorsa window.KOORD
   üzerinden çevrilir. koordinat.js'in kuralı burada da geçerli.

   ── YÜKLEME SIRASI ──
   koordinat.js'ten SONRA, sefer.js'ten ÖNCE. firebase'e yalnız
   çağrı anında bakar; yoksa çevrimdışı çalışır (yerel durum).
   ============================================================ */
(function () {
"use strict";

/* ═══════════════════════════════════════════════════════════
   1) AYARLAR
   ═══════════════════════════════════════════════════════════ */
const AYAR = {
  KOK: "dugumler",

  /* Dünya tohumu. DEĞİŞTİRİRSEN HARİTADAKİ HER ŞEY YER DEĞİŞTİRİR.
     Tüm oyuncular aynı sayıyı kullanmak ZORUNDA — bu yüzden
     istemciye göre değişen hiçbir şeyden (tarih, kullanıcı,
     rastgele) türetilmez. */
  TOHUM: 20260810,

  /* Tükendikten sonra yeniden doğuş penceresi (3–4 dk).
     Kesin süre slot+nesilden türetilir, herkeste aynı çıkar. */
  DOGUS_MIN_MS: 3 * 60 * 1000,
  DOGUS_MAX_MS: 4 * 60 * 1000,

  /* Düğümler birbirine bu karodan yakın DOĞMAZ. */
  MIN_ARA_KARO: 4,

  /* Harita kenarından bu kadar karo içeride kalır. */
  KENAR_PAY: 6,

  /* Kaleye bu karodan yakın düğüm doğmaz. */
  KALE_PAY_KARO: 3,

  /* Bir slot için konum ararken en fazla bu kadar deneme.
     Hepsi tohumlu — deneme sayısı da herkeste aynı. */
  DENEME: 60,

  /* İşgal kaydı bu süre boyunca yenilenmezse ölü sayılır.
     (Sekmesini kapatan oyuncu düğümü sonsuza dek kilitlemesin.) */
  ISGAL_OMRU_MS: 20 * 60 * 1000,
};

/* ═══════════════════════════════════════════════════════════
   BİRLİKLERİN TAŞIMA KAPASİTESİ — TEK KAYNAK BURASI

   İki ayrı iş, iki ayrı tablo:
     KAPASITE       → araziden kaynak TOPLARKEN taşınan miktar
     YAGMA_KAPASITE → kazanılan KALE SAVAŞINDAN getirilen ganimet
   Yağma sayıları bilerek çok daha küçüktür: baskın bir arazi
   seferinin yerini tutmamalı.

   Tabloya AİLE başına Sv1 değeri yazılır; üst kademeler
   troops.js'teki KADEME.TASIMA_KAT (1,8) ile çarpılır — maliyet,
   süre ve güçle aynı basamak. Sayı değiştirmek isteyen yalnız bu
   iki tabloya dokunur.                                          */
const KAPASITE       = { knight: 100, soldier: 70, robot: 50 };
const YAGMA_KAPASITE = { knight:  10, soldier:  7, robot:  5 };

function kademeKat() {
  try {
    if (typeof KADEME !== "undefined" && KADEME && KADEME.TASIMA_KAT)
      return KADEME.TASIMA_KAT;
  } catch (e) {}
  return 1.8;   /* troops.js yoksa oyun yine yürür */
}

/* Tek bir birliğin kapasitesi. `tablo` KAPASITE ya da YAGMA_KAPASITE.
   Aile ve kademe UNIT_TYPES'tan okunur; tanım bulunamazsa birlik
   kendi ailesi ve Sv1 sayılır. */
function birimKapasitesi(tablo, unitId) {
  const d = (typeof UNIT_TYPES !== "undefined" && UNIT_TYPES)
              ? UNIT_TYPES[unitId] : null;
  const ai = (d && d.aile) || unitId;
  const kd = (d && (d.kademe || d.level)) || 1;
  const temel = (tablo || {})[ai] || 0;
  if (temel <= 0) return 0;
  return Math.round(temel * Math.pow(kademeKat(), kd - 1));
}

/* Eski imza korunuyor: `tur` artık BİRLİK KİMLİĞİDİR (knight2 de
   olabilir), `seviye` kullanılmıyor — kademe kimlikten okunur. */
function kapasite(tur, seviye) {
  return birimKapasitesi(KAPASITE, tur);
}

/* Bir ordunun toplam kapasitesi.
   TUZAK: eskiden Object.keys(KAPASITE) üzerinden dönülüyordu, yani
   yalnız üç Sv1 kimliği sayılıyordu; Sv2+ birliklerden kurulu ordu
   araziden SIFIR taşıyordu. Artık ordunun KENDİ anahtarları gezilir. */
function kapasiteTopla(tablo, birlikler) {
  let t = 0;
  Object.keys(birlikler || {}).forEach(uid => {
    const adet = Math.max(0, Math.floor(Number(birlikler[uid]) || 0));
    if (adet <= 0) return;
    t += adet * birimKapasitesi(tablo, uid);
  });
  return t;
}

function orduKapasitesi(birlikler)  { return kapasiteTopla(KAPASITE, birlikler); }

/* Kale savaşını kazanan ordunun getirebileceği kaynak miktarı.
   pvp.js bunu çağırır; oraya sayı GÖMÜLMEZ. */
function yagmaKapasitesi(birlikler) { return kapasiteTopla(YAGMA_KAPASITE, birlikler); }

/* ═══════════════════════════════════════════════════════════
   2) KAYNAK TÜRLERİ
   hiz → saniyede kaç birim toplanır. ORDUYA GÖRE DEĞİŞMEZ;
   ordunun bileşimi yalnız KAPASİTEYİ etkiler.
   ═══════════════════════════════════════════════════════════ */
/*  ikon   → EMOJİ. Yalnız METİN bağlamlarında kullanılır
             (toast, savaş günlüğü butonu, canvas yazısı).
    gorsel → oyunun kendi kaynak görseli. HTML bağlamlarında
             `kaynakSimge()` ile basılır; ölçüsü çevresindeki
             yazıya bağlıdır (.kay-sim → 1.15em), böylece
             yerine geçtiği emojiyle aynı büyüklükte durur.     */
const KAYNAK = {
  odun:   { id: "odun",   ad: "Odun",   ikon: "🪵", gorsel: "10kodun.webp", hiz: 6 },
  et:     { id: "et",     ad: "Et",     ikon: "🍖", gorsel: "et.webp",     hiz: 7 },
  demir:  { id: "demir",  ad: "Demir",  ikon: "⛓️", gorsel: "demir.webp",  hiz: 5 },
  su:     { id: "su",     ad: "Su",     ikon: "💧", gorsel: "su.webp",     hiz: 3 },
  enerji: { id: "enerji", ad: "Enerji", ikon: "⚡", gorsel: "enerji.webp", hiz: 2 },
};

/*  HTML'e basılacak kaynak simgesi. Görsel açılmazsa emojiye döner,
    yani dosya eksikse ekran boş kalmaz. */
function kaynakSimge(id) {
  const k = KAYNAK[id];
  if (!k) return "";
  if (!k.gorsel) return k.ikon;
  return '<img class="kay-sim" src="' + k.gorsel + '" alt="" ' +
         'onerror="this.onerror=null;this.replaceWith(document.createTextNode(\'' + k.ikon + '\'))">';
}

const KAYNAK_IDLER = ["odun", "et", "demir", "su", "enerji"];

/* ═══════════════════════════════════════════════════════════
   3) ŞABLONLAR
   ═══════════════════════════════════════════════════════════ */

/* Her seviyede kaç slot açılacak. */
const SLOT_ADEDI = { 1: 10, 2: 7, 3: 5 };

/* ── KAYNAK ARAZİLERİ ──
   miktar[seviye] = arazide TOPLAM kaç birim var. Ordu kapasitesi
   dolunca döner, kalan arazide durur; sıfırlanınca arazi tükenir. */
const ARAZILER = [
  { id: "et_arazi",    ad: "Et Arazisi",      ikon: "🌾", kaynak: "et",
    miktar: { 1: 4000, 2: 9000, 3: 18000 } },
  { id: "demir_maden", ad: "Demir Kaynağı",   ikon: "⛏️", kaynak: "demir",
    miktar: { 1: 2500, 2: 6000, 3: 12000 } },
  { id: "baraj",       ad: "Baraj",           ikon: "🏞️", kaynak: "su",
    miktar: { 1: 400,  2: 1100, 3: 2200 } },
  { id: "santral",     ad: "Enerji Santrali", ikon: "🏭", kaynak: "enerji",
    miktar: { 1: 250,  2: 700,  3: 1500 } },
  /* Odun 25'te eklendi. Diziye SONDAN eklendi ve TUR_SIRASI'nda da
     en sona konuldu — bkz. TUR_SIRASI notu. */
  { id: "odun_ormani", ad: "Orman",           ikon: "🌲", kaynak: "odun",
    miktar: { 1: 3500, 2: 8000, 3: 16000 } },
];

/* ── CANAVARLAR ──
   Canavarın kendi stat tablosu YOKTUR. Canavar, oyuncu ordusuyla
   AYNI CİNSTEN bir ordudur: eşit sayıda Savunucu + Koruyucu +
   Nişancı. İki kadran vardır:

     kademe  → birlik KALİTESİ (troops.js UNIT_TYPES'tan okunur)
     bilesim → AİLE BAŞINA adet; toplam birlik = 3 × bu sayı

   Böylece "Goril Sv1 basit, Fil Sv3 son duvar" ölçütü somutlaşır:
   Fil'in askeri senin en iyi askerinle aynı kalitededir (Sv6),
   üstelik 45.000'er tanedir.

   TAVAN: sefere çıkarılabilecek birlik sayısı sınırlıdır
   (gelistir.js TABAN_KAPASITE 5.000 + en çok 3 komutan, tavan
   ~206.000). Toplamlar bu tavana göre dengelendi — Fil Sv3
   toplam 135.000. Bu sayıları büyütmeden önce tavana bak.

   odul[seviye] = tek vuruşta düşen kaynak (sabit rakam). */
const CANAVAR_AILE_SIRA = ["knight", "soldier", "robot"];

const CANAVARLAR = [
  { id: "goril", ad: "Goril", ikon: "🦍", kaynak: "demir",
    kademe:  1,
    bilesim: { 1: 50,   2: 300,  3: 700 },
    odul:    { 1: 1000, 2: 5000, 3: 15000 } },

  { id: "ayi",   ad: "Ayı",   ikon: "🐻", kaynak: "et",
    kademe:  2,
    bilesim: { 1: 200,  2: 1200, 3: 2800 },
    odul:    { 1: 2500, 2: 5000, 3: 8000 } },

  { id: "kurt",  ad: "Kurt",  ikon: "🐺", kaynak: "su",
    kademe:  4,
    bilesim: { 1: 800,  2: 4800, 3: 11000 },
    odul:    { 1: 200,  2: 900,  3: 1700 } },

  { id: "fil",   ad: "Fil",   ikon: "🐘", kaynak: "enerji",
    kademe:  6,
    bilesim: { 1: 3200, 2: 19000, 3: 45000 },
    odul:    { 1: 150,  2: 400,   3: 1300 } },
];

/* Aile + kademe → birlik kimliği. Sv1'de kimlik ailenin kendisidir
   (knight/soldier/robot — bunlar Firebase veri anahtarıdır, asla
   değişmez), üstünde sayı eklenir: knight2 … robot6. */
function canavarBirimId(aile, kademe) {
  const kd = Math.max(1, Math.floor(Number(kademe) || 1));
  return kd <= 1 ? aile : (aile + kd);
}

/* Bir birliğin savaş statı. TEK KAYNAK troops.js UNIT_TYPES.
   Buraya rakam GÖMÜLMEZ; troops.js yüklenmemişse savaş zaten
   yürümez, o yüzden sıfır dönmek yerine 1/0/1 ile ayakta tutulur. */
function birimStat(unitId) {
  const d = (typeof UNIT_TYPES !== "undefined" && UNIT_TYPES)
              ? UNIT_TYPES[unitId] : null;
  if (!d) return { attack: 1, defense: 0, hp: 1 };
  return {
    attack:  Math.max(0, Number(d.attack)  || 0),
    defense: Math.max(0, Number(d.defense) || 0),
    hp:      Math.max(1, Number(d.hp)      || 1),
  };
}

/* Üç ailenin ADET AĞIRLIKLI ortalaması. Adetler eşit olduğu için
   bu düz ortalamadır, ama bileşim ileride eşitsiz olursa da
   toplam güç doğru kalsın diye ağırlıklı yazıldı.

   NEDEN ORTALAMA: pve.js şu an canavarı TEK HAVUZ olarak dövüşür
   (tek atk/def/hp × adet). Ortalama alınca havuzun TOPLAM gücü
   üç aileli ordununkiyle birebir aynı çıkar. Aile ayrımı (hedef
   sırası, üstünlük çemberi) Adım 2'de pve.js'e taşınacak; o zaman
   bu ortalama yalnız gösterim için kalır. */
function bilesimOrtalamasi(bilesim) {
  let n = 0, atk = 0, def = 0, hp = 0;
  Object.keys(bilesim || {}).forEach(uid => {
    const adet = Math.max(0, Math.floor(Number(bilesim[uid]) || 0));
    if (adet <= 0) return;
    const s = birimStat(uid);
    n += adet; atk += s.attack * adet; def += s.defense * adet; hp += s.hp * adet;
  });
  if (n <= 0) return { adet: 0, attack: 1, defense: 0, hp: 1 };
  const yuvarla = (x) => Math.round((x / n) * 10) / 10;
  return {
    adet: n,
    attack:  Math.max(0, yuvarla(atk)),
    defense: Math.max(0, yuvarla(def)),
    hp:      Math.max(1, yuvarla(hp)),
  };
}

/* Şablonları tek indekste toplar: "goril|2" → şablon + seviye */
const _sablonlar = {};
(function kurSablonlar() {
  ARAZILER.forEach(a => {
    [1, 2, 3].forEach(sv => {
      _sablonlar[a.id + "|" + sv] = {
        tur: "arazi", id: a.id, seviye: sv,
        ad: a.ad, ikon: a.ikon,
        kaynak: a.kaynak, hiz: KAYNAK[a.kaynak].hiz,
        miktar: a.miktar[sv],
      };
    });
  });
  CANAVARLAR.forEach(c => {
    [1, 2, 3].forEach(sv => {
      const adet = Math.max(0, Math.floor(Number(c.bilesim[sv]) || 0));
      const bilesim = {};
      CANAVAR_AILE_SIRA.forEach(ai => {
        bilesim[canavarBirimId(ai, c.kademe)] = adet;
      });
      _sablonlar[c.id + "|" + sv] = {
        tur: "canavar", id: c.id, seviye: sv,
        ad: c.ad, ikon: c.ikon,
        kaynak: c.kaynak,
        kademe: c.kademe,
        bilesim: bilesim,
        birlik: adet * CANAVAR_AILE_SIRA.length,
        odul: c.odul[sv],
        /* stat: kurulumda YAZILMAZ. troops.js'in yüklenmiş olmasına
           bağlıdır ve bu dosya ondan sonra yükleniyor olsa da,
           yükleme sırası değişirse sessizce 1/0/1'e düşerdi. İlk
           okumada hesaplanıp donduruluyor (aşağıda sablon()). */
        stat: null,
      };
    });
  });
})();

/* İlk erişimde statı hesaplar ve DONDURUR. Her okumada yeniden
   hesaplanırsa savaş motoruyla gösterim ayrışabilir. */
function sablon(id, seviye) {
  const s = _sablonlar[id + "|" + seviye] || null;
  if (s && s.tur === "canavar" && !s.stat) {
    const o = bilesimOrtalamasi(s.bilesim);
    s.stat = { attack: o.attack, defense: o.defense, hp: o.hp };
  }
  return s;
}

/* ═══════════════════════════════════════════════════════════
   4) TOHUMLU RASTGELE
   Aynı girdi → aynı çıktı. Her istemcide birebir aynı sonuç
   üretmek zorunda, o yüzden Math.random() BURADA KULLANILMAZ.
   ═══════════════════════════════════════════════════════════ */

/* 32-bit karma (FNV-1a türevi). Metinden tohum üretir. */
function karma(metin) {
  let h = 2166136261 >>> 0;
  const s = String(metin);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/* mulberry32 — küçük, hızlı, tekrarlanabilir üreteç. */
function uretec(tohum) {
  let a = tohum >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ═══════════════════════════════════════════════════════════
   5) SLOT LİSTESİ
   176 slot: 4 arazi + 4 canavar türü × (10 + 7 + 5).
   Slot kimliği KALICIDIR — buluttaki kaydın anahtarı budur.
   ═══════════════════════════════════════════════════════════ */
const _slotlar = [];
(function kurSlotlar() {
  /* ── TUZAK: TUR SIRASI KONUMU BELIRLER ──
     Slotlar bu sirayla yerlestirilir ve her slot kendinden ONCEKI
     slotlarin karolarina bakarak cakismadan kacinir. Siraya ortadan
     bir tur eklenirse ONDAN SONRAKI TUM DUGUMLER YER DEGISTIRIR.
     Bu yuzden sira elle sabitlendi; YENI TUR HER ZAMAN SONA EKLENIR. */
  const TUR_SIRASI = [
    "et_arazi", "demir_maden", "baraj", "santral",
    "goril", "ayi", "kurt", "fil",
    "odun_ormani",
  ];
  const _bilinen = ARAZILER.map(a => a.id).concat(CANAVARLAR.map(c => c.id));
  const turler = TUR_SIRASI.filter(t => _bilinen.indexOf(t) !== -1)
                   .concat(_bilinen.filter(t => TUR_SIRASI.indexOf(t) === -1));
  turler.forEach(tid => {
    [1, 2, 3].forEach(sv => {
      const adet = SLOT_ADEDI[sv];
      for (let i = 0; i < adet; i++) {
        _slotlar.push({ slotId: tid + "_" + sv + "_" + i, id: tid, seviye: sv });
      }
    });
  });
})();

function slotSayisi() { return _slotlar.length; }

/* ═══════════════════════════════════════════════════════════
   6) KONUM ÜRETİMİ
   konum(slotId, nesil) → { kx, ky }  (TAM SAYI KARO)

   Aynı slot+nesil her istemcide aynı karoyu verir. Nesil arttıkça
   düğüm haritanın başka bir yerinde doğar.

   Çakışma önleme: slotlar SABİT SIRAYLA yerleştirilir; her slot
   kendinden ÖNCEKİ slotların konumlarına bakar. Sıra sabit
   olduğu için sonuç da her istemcide aynıdır.
   ═══════════════════════════════════════════════════════════ */

/* Nesil haritası: { slotId: nesil }. Bulut durumundan doldurulur. */
let _nesiller = {};

/* Hesaplanmış konumların önbelleği. Nesil değişince temizlenir. */
let _konumOnbellek = null;
let _onbellekImza  = "";

function nesilOf(slotId) { return _nesiller[slotId] || 0; }

/* ── ETKİN NESİL ──
   Kayıtlı nesil, tükenmiş bir düğümde doğuş saati geldiğinde
   KENDİLİĞİNDEN artmaz: artışı buluta ilk dokunan oyuncu yazar
   (bkz. isgalAl/tuket). Konum ise nesilden türediği için, o yazma
   olana kadar herkes düğümü ESKİ nesille hesaplıyor ve canavar
   doğuş saatinde AYNI KARODA geri beliriyordu — "yendim ama
   gitmedi" şikâyetinin sebebi buydu.

   Burada nesil, saat geldiği anda +1 sayılır. Tohumlu olduğu için
   herkeste aynı saniyede aynı yeni karo çıkar; bulut yazması sonra
   geldiğinde de aynı sayıyı bulur, konum ikinci kez oynamaz. */
function etkinNesil(slotId) {
  const d = _durum[slotId];
  const n = (d && typeof d.n === "number") ? d.n : (_nesiller[slotId] || 0);
  /* Gecikme KAYITLI nesille hesaplanır — tuket/isgalAl da öyle
     yapıyor, üçü aynı saati bulmak zorunda. */
  if (d && typeof d.td === "number" && Date.now() >= d.td + dogusGecikmesi(slotId, n)) {
    return n + 1;
  }
  return n;
}

/* Şu anki tüm nesillerin imzası — önbellek geçerliliği için. */
function nesilImzasi() {
  return _slotlar.map(s => etkinNesil(s.slotId)).join(",");
}


/* Tüm slotların konumunu bir kerede hesaplar.

   KALEYE BAKMAZ. Eskiden kalelerden uzak durmaya çalışıyordu ve
   konum önbelleği kale SAYISINA bağlıydı. Oyuna girerken diğer
   oyuncuların kaleleri henüz inmemiş oluyor, düğümler boş listeye
   göre yerleşiyor; kaleler inince sayı değişiyor ve BÜTÜN konumlar
   yeniden hesaplanıyordu (hesap zincirli, ilk düğüm kayınca hepsi
   kayıyor). Belirti: düğümler bir yerde beliriyor, kayboluyor,
   toplu hâlde başka yerde yeniden beliriyor.

   Daha kötüsü: yeni bir oyuncu kaydolduğunda ya da biri kalesini
   taşıdığında herkesin düğümleri yer değiştiriyordu — yola çıkmış
   seferin hedefi altından kayıyordu.

   Artık konum yalnız tohum + slot + nesilden gelir. Bir düğüm
   doğduğu karoda ölene kadar durur. Kale/düğüm çakışması KALE
   TARAFINDA çözülür: kale taşınırken cellFree zaten bu dosyanın
   haritaDugumleri() listesine bakıyor; yeni oyuncu kaydında ise
   _doluNoktalar doluNoktalar()'ı sayıyor (index.html). */
/* ── BÖLGE TABLOSU ──
   Her slota haritada KENDİNE AİT, kalıcı bir dikdörtgen bölge verilir.
   Bölgeler çakışmadığı için çarpışma denetimine hiç gerek kalmaz:
   bir slotun nesli değişince YALNIZ o düğüm yer değiştirir, diğer
   197'si kıpırdamaz.

   ESKİ YÖNTEM NEDEN BIRAKILDI: slotlar sırayla yerleştiriliyor ve her
   slot kendinden öncekilere çarpışma bakıyordu. Tek bir slotun nesli
   artınca ondan sonraki BÜTÜN düğümler kayıyordu. Açılışta bulut
   verisi gelmeden herkes nesil 0 sanıyor, veri gelince tablo baştan
   kuruluyor ve harita zıplıyordu ("1 saniye sonra başka düğümler").
   Öldürülen canavarın yerinde başka bir canavar belirmesi de buydu.

   Bölge sırası TOHUMLU bir karıştırmayla dağıtılır; yoksa aynı türün
   22 slotu yan yana bir şerit oluştururdu. Karıştırma nesle DEĞİL
   yalnız tohuma bağlıdır — yani sabittir. */
let _bolgeOnbellek = null;

function bolgeTablosu() {
  if (_bolgeOnbellek) return _bolgeOnbellek;

  const say = _slotlar.length;
  const sut = Math.max(1, Math.ceil(Math.sqrt(say)));
  const sat = Math.max(1, Math.ceil(say / sut));

  /* Tohumlu Fisher-Yates: bölge indeksleri karışır, sonuç herkeste
     aynıdır. Math.random() BURADA KULLANILMAZ. */
  const sira = [];
  for (let i = 0; i < sut * sat; i++) sira.push(i);
  const rnd = uretec(karma(AYAR.TOHUM + "|bolge"));
  for (let i = sira.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = sira[i]; sira[i] = sira[j]; sira[j] = t;
  }

  const tablo = {};
  _slotlar.forEach((s, i) => {
    const b = sira[i];
    tablo[s.slotId] = { sut: b % sut, sat: Math.floor(b / sut) };
  });

  _bolgeOnbellek = { tablo: tablo, sutun: sut, satir: sat };
  return _bolgeOnbellek;
}

/* Tek slotun konumu — BAŞKA HİÇBİR SLOTA BAKMAZ.
   Bölge içinde MIN_ARA_KARO'luk bir iç pay bırakılır; komşu
   bölgelerin seçimleri arasındaki en küçük mesafe böylece
   bölge eni eksi iç pencere = MIN_ARA_KARO olur. */
function slotKonumu(slotId, nesil) {
  const N = (window.KOORD ? window.KOORD.karoSayisi() : 141);
  const pay = AYAR.KENAR_PAY;
  const alan = Math.max(1, N - pay * 2);

  const B = bolgeTablosu();
  const b = B.tablo[slotId];
  if (!b) return { kx: pay, ky: pay };

  const enB = alan / B.sutun;
  const boyB = alan / B.satir;
  const pencereEn  = Math.max(1, enB  - AYAR.MIN_ARA_KARO);
  const pencereBoy = Math.max(1, boyB - AYAR.MIN_ARA_KARO);
  const icPayEn  = (enB  - pencereEn)  / 2;
  const icPayBoy = (boyB - pencereBoy) / 2;

  const rnd = uretec(karma(AYAR.TOHUM + "|" + slotId + "|" + nesil));
  const kx = Math.round(pay + b.sut * enB  + icPayEn  + rnd() * pencereEn);
  const ky = Math.round(pay + b.sat * boyB + icPayBoy + rnd() * pencereBoy);

  return {
    kx: Math.max(pay, Math.min(N - pay - 1, kx)),
    ky: Math.max(pay, Math.min(N - pay - 1, ky)),
  };
}

function konumlariHesapla() {
  const sonuc = {};
  _slotlar.forEach(s => {
    sonuc[s.slotId] = slotKonumu(s.slotId, etkinNesil(s.slotId));
  });
  return sonuc;
}

function konumlar() {
  /* Damga yalnız NESİLLERİ içerir. Kale sayısı buraya girerse
     yeni bir oyuncu geldiğinde bütün konumlar yeniden hesaplanır. */
  const imza = nesilImzasi();
  if (!_konumOnbellek || _onbellekImza !== imza) {
    _konumOnbellek = konumlariHesapla();
    _onbellekImza  = imza;
  }
  return _konumOnbellek;
}

function konum(slotId) {
  const k = konumlar()[slotId];
  return k ? { kx: k.kx, ky: k.ky } : null;
}

/* ═══════════════════════════════════════════════════════════
   7) YENİDEN DOĞUŞ ZAMANI
   Tükenme anına 3–4 dk arası TOHUMLU bir süre eklenir. Süre
   slot+nesilden türetildiği için herkeste aynı saniyede doğar.
   ═══════════════════════════════════════════════════════════ */
function dogusGecikmesi(slotId, nesil) {
  const rnd = uretec(karma("doguş|" + slotId + "|" + nesil));
  const fark = AYAR.DOGUS_MAX_MS - AYAR.DOGUS_MIN_MS;
  return AYAR.DOGUS_MIN_MS + Math.floor(rnd() * fark);
}

/* ═══════════════════════════════════════════════════════════
   8) BULUT DURUMU
   Yalnız DEĞİŞEN slotlar buluta yazılır. Dokunulmamış slot
   buluta hiç uğramaz — 176 kayıt yerine yalnızca aktif olanlar.
   ═══════════════════════════════════════════════════════════ */

/* { slotId: { n, k, it, ia, iat, td } }
   n=nesil  k=kalan  it=işgalci anahtarı  ia=işgalci adı
   iat=işgal zamanı  td=tükenme damgası (yeniden doğuş sayacı) */
let _durum = {};
let _dinliyor = false;
let _bulutHata = null;

/* Teşhis için: son bulut olayı ve son tüketme işlemi (?dugum=1). */
let _sonOlay = 0;
let _olaySayisi = 0;
let _sonIslem = null;

function fbHazir() {
  return (typeof firebaseDb !== "undefined") && !!firebaseDb;
}

/* Oturum anahtarı — sefer.js'teki benKey ile BİREBİR aynı yoldan
   türetilir. İkisi ayrışırsa "kim işgal etti" ile "kimin seferi"
   uyuşmaz ve oyuncu kendi arazisine giremez. */
function benKey() {
  try {
    if (typeof currentUsername !== "string" || !currentUsername) return null;
    if (typeof toFirebaseKey !== "function") return null;
    return toFirebaseKey(currentUsername.toLowerCase());
  } catch (e) { return null; }
}

function benAd() {
  try { if (typeof currentUsername === "string" && currentUsername) return currentUsername; } catch (e) {}
  return "Oyuncu";
}

/* Buluta YAZILAMAMIŞ kendi kilitlerim.
   Firebase kuralları dugumler/ yolunu engelliyorsa isgalAl yerel
   kilide düşüyor. Ama bulut dinleyicisi sonra tüm durumu baştan
   yazınca o kilit siliniyordu — ekranda adım bir saniye görünüp
   kayboluyordu. Bu harita her bulut güncellemesinde yeniden
   uygulanır. */
let _yerelIsgal = {};

/* Buluttan gelen kaydı iç duruma alır ve nesil haritasını tazeler. */
function durumUygula(ham) {
  const bulut = ham || {};

  /* BULUT ÜSTÜNE YEREL KİLİTLERİ BİNDİR.
     Yalnızca bulutun HABERİ OLMADIĞI kilitler geri konur; bulut o
     slot için bir kayıt gönderdiyse GERÇEK odur (başkası kapmış
     olabilir) ve yerel kilit düşürülür. */
  Object.keys(_yerelIsgal).forEach(sid => {
    const y = _yerelIsgal[sid];
    if (!y) return;
    /* Süresi dolmuş yerel kilidi taşımaya gerek yok. */
    if (Date.now() - y.iat >= AYAR.ISGAL_OMRU_MS) { delete _yerelIsgal[sid]; return; }
    const b = bulut[sid];
    if (b && b.it) return;              /* bulutta bir sahip var; o geçerli */
    bulut[sid] = Object.assign({}, b || { n: nesilOf(sid) }, y);
  });

  _durum = bulut;
  const yeniNesiller = {};
  Object.keys(_durum).forEach(sid => {
    const d = _durum[sid];
    if (d && typeof d.n === "number") yeniNesiller[sid] = d.n;
  });
  _nesiller = yeniNesiller;
}

function dinlemeyeBasla() {
  if (_dinliyor || !fbHazir()) return;
  _dinliyor = true;
  try {
    firebaseDb.ref(AYAR.KOK).on("value", snap => {
      _sonOlay = Date.now(); _olaySayisi++;
      durumUygula(snap.val() || {});
      _bulutHata = null;
      tazele();
    }, err => {
      _bulutHata = err && err.message ? err.message : String(err);
      _dinliyor = false;
    });
  } catch (e) {
    _bulutHata = e && e.message ? e.message : String(e);
    _dinliyor = false;
  }
}

function slotYaz(slotId, kayit) {
  _durum[slotId] = kayit;
  if (!fbHazir()) return Promise.resolve();
  try {
    return firebaseDb.ref(AYAR.KOK + "/" + slotId).set(kayit)
      .then(() => { _bulutHata = null; })
      .catch(err => { _bulutHata = err && err.message ? err.message : String(err); });
  } catch (e) {
    _bulutHata = e && e.message ? e.message : String(e);
    return Promise.resolve();
  }
}

/* Oyunun mevcut çizim işlevlerini uyandırır. */
function tazele() {
  /* Düğümler CANVAS'a çiziliyor: harita.js'in listesi geçersiz
     kılınıp yeni bir kare istenir. renderBattleMap yalnız kale
     katmanını ilgilendiriyor ama işgal/tükenme onu da etkileyebilir
     (kale kurma engelleri), o yüzden ikisi de çağrılır. */
  try {
    if (window.HARITA && HARITA.dugumTazele) HARITA.dugumTazele();
  } catch (e) {}
  if (typeof window.renderBattleMap === "function") {
    try { window.renderBattleMap(); } catch (e) {}
  }
}

/* ═══════════════════════════════════════════════════════════
   9) DÜĞÜM OKUMA
   dugumler() → haritada ŞU AN duran düğümlerin listesi.
   Tükenmiş ve henüz doğmamış slotlar listeye girmez.
   ═══════════════════════════════════════════════════════════ */

function isgalDiri(d) {
  if (!d || !d.it) return false;
  if (typeof d.iat !== "number") return false;
  return (Date.now() - d.iat) < AYAR.ISGAL_OMRU_MS;
}

/* Ad haritada görünsün mü? Kilit diri OLMALI ve varış anı geçmiş
   olmalı. Eski kayıtlarda iat kalkış anıdır; o zaman koşul zaten
   sağlanır — geriye dönük uyumlu, göç gerekmez. */
function isgalGorunur(d) {
  if (!isgalDiri(d)) return false;
  return Date.now() >= (typeof d.iat === "number" ? d.iat : 0);
}

function slotDurumu(s) {
  const d = _durum[s.slotId] || null;
  const sab = sablon(s.id, s.seviye);
  if (!sab) return null;

  const nesil = etkinNesil(s.slotId);

  /* Tükenmiş mi? td varsa doğuş saatini bekliyor demektir.
     Doğuş SÜRESİ kayıtlı nesilden hesaplanır (etkin nesilden
     DEĞİL): etkin nesil saat gelince +1 olur, süreyi ondan
     hesaplasaydık saat de kayar ve düğüm bir daha hiç doğmazdı. */
  if (d && typeof d.td === "number") {
    const dogar = d.td + dogusGecikmesi(s.slotId, (typeof d.n === "number" ? d.n : 0));
    if (Date.now() < dogar) {
      return { slotId: s.slotId, bos: true, dogarAt: dogar, nesil: nesil };
    }
    /* Doğuş saati geldi: bir sonraki nesle geçmiş SAYILIR.
       Buluta yazmayı ilk dokunan oyuncu yapar (bkz. tuket/isgalAl);
       o zamana kadar herkes yeni konumu zaten hesaplayabilir. */
  }

  const k = konum(s.slotId);
  if (!k) return null;

  /* TUZAK: canavar birlik sayıları 33'te yeniden ölçeklendi. Bulutta
     duran `k` ESKİ ölçekte olabilir (örn. Fil Sv1'de 380, yeni toplam
     9.600). Kelepçe olmazsa dolu görünen düğüm yarı ölü doğar. */
  const tam = (sab.tur === "arazi" ? sab.miktar : sab.birlik);
  const kalan = (d && typeof d.k === "number" && typeof d.td !== "number")
    ? Math.max(0, Math.min(d.k, tam))
    : tam;

  return {
    slotId: s.slotId,
    bos: false,
    nesil: nesil,
    kx: k.kx, ky: k.ky,
    tur: sab.tur,
    id: sab.id, seviye: sab.seviye,
    ad: sab.ad, ikon: sab.ikon,
    kaynak: sab.kaynak,
    kaynakAd: KAYNAK[sab.kaynak].ad,
    /* Bu alan YALNIZ innerHTML'e basılır (arazi/canavar pencereleri),
       bu yüzden emoji değil görsel taşır. Metin gereken yerlerde
       KAYNAK[...].ikon kullanılmalı. */
    kaynakIkon: kaynakSimge(sab.kaynak),
    hiz: sab.hiz || 0,
    miktar: sab.tur === "arazi" ? sab.miktar : 0,
    kalan: kalan,
    birlik: sab.tur === "canavar" ? sab.birlik : 0,
    /* Canavarın TAM bileşimi: { knight4: 800, soldier4: 800, robot4: 800 }.
       pve.js şu an bunu kullanmıyor (tek havuz), Adım 2'de üç aileli
       orduya geçerken kaynak bu olacak. Kısmi hasarlı düğümde
       oranlamak için `kalan / birlik` çarpanı kullanılmalı. */
    bilesim: sab.tur === "canavar" ? Object.assign({}, sab.bilesim) : null,
    kademe: sab.tur === "canavar" ? (sab.kademe || 1) : 0,
    stat: sab.stat || null,
    odul: sab.tur === "canavar" ? sab.odul : 0,
    /* İşgal — haritada YALNIZ kullanıcı adı gösterilir.
       Ne topladığı, ne kadar kaldığı BAŞKASINA GÖSTERİLMEZ.

       AD YALNIZ ORDU VARDIKTAN SONRA görünür (`isgalGorunur`):
       kilit kalkışta alınır ama `iat` varış anını taşır. Kilit
       (isgalKey/benimMi/isgalRezerve) yolda da diridir — çizim
       susar, kural konuşur. */
    isgalAd: isgalGorunur(d) ? (d.ia || "") : "",
    isgalKey: isgalDiri(d) ? (d.it || "") : "",
    benimMi: isgalDiri(d) && d.it === benKey(),
    isgalRezerve: isgalDiri(d),          /* yolda olan ordu dahil */
  };
}

function dugumler() {
  const out = [];
  _slotlar.forEach(s => {
    const d = slotDurumu(s);
    if (d && !d.bos) out.push(d);
  });
  return out;
}

function dugum(slotId) {
  const s = _slotlar.find(x => x.slotId === slotId);
  if (!s) return null;
  const d = slotDurumu(s);
  return (d && !d.bos) ? d : null;
}

/* ═══════════════════════════════════════════════════════════
   10) İŞGAL — bir düğümde AYNI ANDA TEK OYUNCU
   Yarış durumu Firebase transaction ile çözülür: iki telefon
   aynı anda gönderirse yalnız biri kazanır.
   ═══════════════════════════════════════════════════════════ */

/* isgalAl(slotId, varisMs)
   ── KİLİT KALKIŞTA, AD VARIŞTA ──
   Arazi yola çıkarken rezerve edilir (yolda kapılmasın), ama
   haritada oyuncu adının o anda belirmesi yanlış bilgi veriyordu:
   ordu daha yoldayken arazi ele geçirilmiş görünüyordu.

   `iat` artık "kilidi aldığım an" değil, ORDUNUN VARACAĞI AN'dır.
   Tek alan iki işi görür ve Firebase kural biçimi DEĞİŞMEZ
   (yeni alan eklenseydi $other:false yüzünden yazma reddedilirdi):
     · kilit diriliği  → (now - iat) < ISGAL_OMRU_MS   [ileri damga
       da diridir; fark negatif olur]
     · ad görünürlüğü  → now >= iat  (slotDurumu)
   `varisMs` verilmezse damga şimdidir; ordu zaten yerindedir
   (toplamaya geçiş, canavar, eski çağrılar). */
function isgalAl(slotId, varisMs) {
  const s = _slotlar.find(x => x.slotId === slotId);
  if (!s) return Promise.resolve({ ok: false, sebep: "Düğüm yok." });

  const bk = benKey();
  if (!bk) return Promise.resolve({ ok: false, sebep: "Oturum yok." });

  const gecikme = Math.max(0, Math.round(Number(varisMs) || 0));

  const sab = sablon(s.id, s.seviye);
  const varsayilanKalan = sab.tur === "arazi" ? sab.miktar : sab.birlik;

  if (!fbHazir()) {
    /* Çevrimdışı: yerel kilit. Tek cihazda oynanıyorsa yeter. */
    const d = _durum[slotId];
    if (isgalDiri(d)) {
      return Promise.resolve({ ok: false,
        sebep: (d.it === bk ? "Buraya zaten bir ordun gitti." : (d.ia || "Bir oyuncu") + " burada topluyor.") });
    }
    const kilit = { it: bk, ia: benAd(), iat: Date.now() + gecikme };
    _yerelIsgal[slotId] = kilit;
    _durum[slotId] = Object.assign({ n: nesilOf(slotId),
                                     k: (d && typeof d.k === "number" ? d.k : varsayilanKalan) }, kilit);
    return Promise.resolve({ ok: true });
  }

  /* ── ZAMAN AŞIMI KALKANI ──
     Firebase kuralları dugumler/ yolunu engelliyorsa transaction ne
     çözülür ne reddedilir; söz sonsuza dek asılı kalır ve çağıran
     donar. 6 saniyede kesip yerel kilide düşüyoruz: oyun çalışmaya
     devam eder, sebep de ekrana yazılır. */
  const zamanAsimi = new Promise(coz => setTimeout(() => coz("_zamanasimi_"), 6000));

  const islem = firebaseDb.ref(AYAR.KOK + "/" + slotId).transaction(mevcut => {
    const simdi = Date.now();
    let d = mevcut || null;

    /* Tükenmişse ve doğuş saati geldiyse yeni nesli BURADA açarız. */
    if (d && typeof d.td === "number") {
      const dogar = d.td + dogusGecikmesi(slotId, d.n || 0);
      if (simdi < dogar) return;                    /* henüz yok — iptal */
      d = { n: (d.n || 0) + 1, k: varsayilanKalan };
    }
    if (!d) d = { n: 0, k: varsayilanKalan };

    /* ── DİRİ İŞGAL VARSA ALMA — KENDİM DE DAHİL ──
       Önceki sürüm yalnız BAŞKASINI engelliyordu. Sonuç: oyuncu
       aynı araziye üst üste üç ordu gönderebiliyordu, çünkü kilit
       zaten kendisindeydi ve kontrol onu geçiriyordu.
       Bir düğümde AYNI ANDA TEK ORDU bulunur; sahibi kim olursa
       olsun diri kilit yeni sefere kapalıdır. Kilit ancak süresi
       dolunca (ISGAL_OMRU_MS) yeniden alınabilir. */
    if (d.it && typeof d.iat === "number" &&
        (simdi - d.iat) < AYAR.ISGAL_OMRU_MS) {
      return;                                       /* iptal */
    }

    d.it = bk;
    d.ia = benAd();
    d.iat = simdi + gecikme;   /* ordunun VARACAĞI an — bkz. yukarı */
    if (typeof d.k !== "number") d.k = varsayilanKalan;
    /* 33 ölçek değişimi kelepçesi — bkz. slotDurumu. */
    else if (d.k > varsayilanKalan) d.k = varsayilanKalan;
    delete d.td;
    return d;
  }).catch(err => {
    _bulutHata = err && err.message ? err.message : String(err);
    return "_hata_";
  });

  return Promise.race([islem, zamanAsimi]).then(res => {
    if (res === "_zamanasimi_" || res === "_hata_") {
      /* Bulut cevap vermedi. Yerel kilitle devam — tek cihazda
         oynanıyorsa hiç fark etmez, çok oyunculuda çakışma riski
         var ama oyunu tamamen durdurmaktan iyidir. */
      if (res === "_zamanasimi_") _bulutHata = "dugumler/ yazılamıyor (zaman aşımı) — Firebase kurallarını denetle";
      const kilit = { it: bk, ia: benAd(), iat: Date.now() + gecikme };
      _yerelIsgal[slotId] = kilit;   /* bulut ezmesin diye ayrı tutulur */
      _durum[slotId] = Object.assign({ n: nesilOf(slotId), k: varsayilanKalan }, kilit);
      return { ok: true, yerel: true };
    }
    if (res && res.committed) {
      delete _yerelIsgal[slotId];      /* bulut sahiplendi, yedeğe gerek yok */
      durumUygulaTek(slotId, res.snapshot.val());
      return { ok: true };
    }
    const d = (res && res.snapshot) ? res.snapshot.val() : null;
    if (d && d.it === bk) return { ok: false, sebep: "Buraya zaten bir ordun gitti." };
    if (d && d.ia) return { ok: false, sebep: d.ia + " burada topluyor." };
    return { ok: false, sebep: "Bu düğüm şu an müsait değil." };
  });
}

function durumUygulaTek(slotId, kayit) {
  if (kayit) {
    _durum[slotId] = kayit;
    if (typeof kayit.n === "number") _nesiller[slotId] = kayit.n;
  } else {
    delete _durum[slotId];
    delete _nesiller[slotId];
  }
  _onbellekImza = "";   /* konum önbelleğini geçersiz kıl */
}

/* İşgali bırak — ordu dönerken veya baskında kaybedince. */
function isgalBirak(slotId) {
  delete _yerelIsgal[slotId];
  const bk = benKey();
  const d = _durum[slotId];
  if (!d || d.it !== bk) return Promise.resolve();

  const kayit = { n: d.n || 0, k: typeof d.k === "number" ? d.k : 0 };
  if (typeof d.td === "number") kayit.td = d.td;
  return slotYaz(slotId, kayit);
}

/* İşgal damgasını tazele — uzun toplamalarda kilit düşmesin. */
function isgalTazele(slotId) {
  const bk = benKey();
  const d = _durum[slotId];
  if (!d || d.it !== bk) return Promise.resolve();
  d.iat = Date.now();
  if (_yerelIsgal[slotId]) _yerelIsgal[slotId].iat = d.iat;
  return slotYaz(slotId, d);
}

/* ═══════════════════════════════════════════════════════════
   11) TÜKETME
   Arazide: toplanan miktar düşülür. Sıfırlanırsa slot tükenir.
   Canavarda: yenildiğinde slot DOĞRUDAN tükenir (kısmi yok).
   ═══════════════════════════════════════════════════════════ */

function tuket(slotId, miktar) {
  const s = _slotlar.find(x => x.slotId === slotId);
  if (!s) return Promise.resolve({ ok: false });

  const sab = sablon(s.id, s.seviye);
  const bk = benKey();

  const varsayilanK = (sab.tur === "arazi" ? sab.miktar : sab.birlik);

  const uygula = (d) => {
    /* ── TÜKENMİŞ KAYIT NORMALİZASYONU ──
       Kayıtta `td` varsa düğüm bir kez tükenmiş demektir ve `k` 0'da
       kalmıştır. Doğuş saati geçtiğinde düğüm haritaya YENİ NESİL
       olarak döner, ama buluttaki `k` yine 0'dır. Bu satırlar olmadan
       ikinci öldürmede kalan 0 okunuyor, hiçbir şey alınmıyor ve
       yalnız `td` bugüne çekiliyordu: nesil hiç ilerlemediği için
       canavar AYNI KARODA tekrar doğuyordu. isgalAl bu düzeltmeyi
       zaten yapıyor; tuket'te yoktu — "bazen siliyor bazen silmiyor,
       hep aynı yere geliyor" belirtisinin sebebi buydu. */
    if (d && typeof d.td === "number") {
      const dogar = d.td + dogusGecikmesi(slotId, d.n || 0);
      if (Date.now() < dogar) {
        /* Düğüm şu an haritada YOK. Hiçbir şey alma ve `td`'yi
           UZATMA — uzatmak doğuşu sürekli erteler. */
        return { yeni: d, alinan: 0, bitti: true };
      }
      d = { n: (d.n || 0) + 1, k: varsayilanK };
    }
    if (!d) d = { n: nesilOf(slotId), k: varsayilanK };
    /* 33 ölçek değişimi kelepçesi — bkz. slotDurumu. */
    const kalanOnce = typeof d.k === "number"
      ? Math.max(0, Math.min(d.k, varsayilanK))
      : varsayilanK;
    /* MİKTAR SAYI DEĞİLSE tamamı istenmiş sayılır. Aksi halde
       Math.min(undefined, …) NaN üretir, kalan NaN olur, "tükendi"
       koşulu asla sağlanmaz ve kural da sayı olmayan `k` yüzünden
       yazmayı geri çevirir — canavar yerinde kalır. */
    const iste = (typeof miktar === "number" && isFinite(miktar)) ? miktar : kalanOnce;
    const alinan = Math.max(0, Math.min(iste, kalanOnce));
    const kalanSonra = kalanOnce - alinan;

    const yeni = { n: d.n || 0, k: kalanSonra };
    if (kalanSonra <= 0) {
      /* Tükendi: doğuş sayacı başlar, işgal düşer. */
      yeni.td = Date.now();
      yeni.k = 0;
    } else if (d.it === bk) {
      /* Hâlâ kaynak var ve işgal bende — kilidi koru. */
      yeni.it = d.it; yeni.ia = d.ia; yeni.iat = Date.now();
    }
    return { yeni: yeni, alinan: alinan, bitti: kalanSonra <= 0 };
  };

  if (!fbHazir()) {
    const r = uygula(_durum[slotId]);
    durumUygulaTek(slotId, r.yeni);
    tazele();
    return Promise.resolve({ ok: true, alinan: r.alinan, bitti: r.bitti });
  }

  /* ok ARTIK "sunucu KABUL ETTİ" demek.
     Eskiden transaction gövdesi bir kez çalışır çalışmaz ok:true
     yazılıyordu; sunucu yazmayı reddetse bile çağıran "oldu"
     sanıyordu. Belirti: canavar yenildi, ödül alındı, ama düğüm
     haritada duruyor ve hiçbir hata görünmüyor. */
  let sonuc = { ok: false, calisti: false, alinan: 0, bitti: false, sebep: "" };
  _sonIslem = { slotId: slotId, istenen: miktar, sonuc: "gönderildi", at: Date.now() };

  /* ── ZAMAN AŞIMI KALKANI (isgalAl'daki ile aynı) ──
     Firebase kuralları `dugumler/` yolunu kapatıyorsa transaction
     ne çözülür ne reddedilir; söz SONSUZA DEK ASILI KALIR. Kalkan
     olmadan `.then` de `.catch` de hiç çalışmaz: çağıran hiçbir
     cevap almaz, uyarı basılmaz, düğüm haritada durur ve ortada
     tek bir hata belirtisi olmaz. "Canavarı yendim ama gitmedi,
     hiçbir uyarı da yok" şikâyetinin sebebi buydu.
     isgalAl'da bu kalkan vardı, burada YOKTU — bu yüzden arazi
     toplama çalışıp düğüm kaldırma sessizce ölüyordu. */
  const zamanAsimi = new Promise(coz => setTimeout(() => coz("_zamanasimi_"), 6000));

  const islem = firebaseDb.ref(AYAR.KOK + "/" + slotId).transaction(mevcut => {
    const r = uygula(mevcut);
    sonuc.calisti = true;
    sonuc.alinan = r.alinan;
    sonuc.bitti  = r.bitti;
    return r.yeni;
  }).then(res => ({ res: res })).catch(err => ({ err: err }));

  return Promise.race([islem, zamanAsimi]).then(x => {
    if (x === "_zamanasimi_") {
      /* Bulut cevap vermedi: en azından BU cihazda düğüm kalksın,
         sebep de çağırana dönsün (index.html kırmızı şeride basar). */
      const r = uygula(_durum[slotId]);
      durumUygulaTek(slotId, r.yeni);
      tazele();
      _bulutHata = "dugumler/ yanıt vermiyor (zaman aşımı) — Firebase kurallarını denetle";
      sonuc.ok = false;
      sonuc.yerel = true;
      sonuc.alinan = r.alinan;
      sonuc.bitti  = r.bitti;
      sonuc.sebep  = _bulutHata;
      _sonIslem.sonuc = "ZAMAN AŞIMI (yerel)";
      return sonuc;
    }
    if (x && x.err) {
      _bulutHata = x.err && x.err.message ? x.err.message : String(x.err);
      sonuc.ok = false;
      sonuc.sebep = "hata: " + _bulutHata;
      _sonIslem.sonuc = "HATA: " + _bulutHata;
      return sonuc;
    }
    const res = x && x.res;
    const kabul = !!(res && res.committed);
    sonuc.ok = kabul;
    if (kabul) {
      durumUygulaTek(slotId, res.snapshot.val());
      tazele();
      _sonIslem.sonuc = "TAMAM · alınan " + sonuc.alinan + (sonuc.bitti ? " · tükendi" : "");
    } else {
      _sonIslem.sonuc = "REDDEDİLDİ";
      sonuc.sebep = sonuc.calisti
        ? "sunucu yazmayı kabul etmedi (kural ya da çakışma)"
        : "işlem hiç çalışmadı (yol okunamadı)";
    }
    return sonuc;
  });
}

/* Canavarı yen: slot tükenir, ödül döner. */
function canavarYen(slotId) {
  const d = dugum(slotId);
  if (!d || d.tur !== "canavar") {
    return Promise.resolve({ ok: false, sebep: d ? ("tur=" + d.tur) : "düğüm bulunamadı" });
  }
  /* tuket'in ürettiği alinan/bitti/sebep bilgileri BURADA
     kayboluyordu; çağıran yalnız ok görüyordu. Hepsi taşınıyor. */
  return tuket(slotId, d.kalan).then(r => ({
    ok: r.ok, alinan: r.alinan, bitti: r.bitti, sebep: r.sebep,
    kalanGirdi: d.kalan,
    kaynak: d.kaynak, miktar: d.odul,
  }));
}

/* ═══════════════════════════════════════════════════════════
   12) TOPLAMA HESABI
   Süre = alinacak / hız. Ordunun bileşimi KAPASİTEYİ belirler,
   hızı DEĞİL.
   ═══════════════════════════════════════════════════════════ */
function toplamaPlani(slotId, birlikler, seviyeler) {
  const d = dugum(slotId);
  if (!d || d.tur !== "arazi") return null;

  const kap = orduKapasitesi(birlikler, seviyeler);
  const alinacak = Math.max(0, Math.min(kap, d.kalan));
  const saniye = d.hiz > 0 ? (alinacak / d.hiz) : 0;

  return {
    slotId: slotId,
    kaynak: d.kaynak,
    kaynakAd: d.kaynakAd,
    kapasite: kap,
    alinacak: Math.floor(alinacak),
    hiz: d.hiz,
    sureMs: Math.round(saniye * 1000),
    /* Kapasite dolarsa ordu ERKEN döner; arazide kaynak kalır. */
    doluDoner: alinacak >= kap && d.kalan > kap,
  };
}

/* Baskında yaralı düşünce kapasite azalır → kalan iş yeniden
   hesaplanır. Ordu AYNI YERDE kalır, sıfırdan başlamaz. */
function baskinSonrasiPlan(slotId, kalanBirlikler, seviyeler, halihazirToplanan) {
  const d = dugum(slotId);
  if (!d || d.tur !== "arazi") return null;

  const kap = orduKapasitesi(kalanBirlikler, seviyeler);
  const yer = Math.max(0, kap - (halihazirToplanan || 0));
  const alinacak = Math.max(0, Math.min(yer, d.kalan));
  const saniye = d.hiz > 0 ? (alinacak / d.hiz) : 0;

  return {
    slotId: slotId,
    kapasite: kap,
    zatenToplanan: halihazirToplanan || 0,
    alinacak: Math.floor(alinacak),
    sureMs: Math.round(saniye * 1000),
    /* Kapasite zaten dolmuşsa hemen döner. */
    hemenDon: yer <= 0,
  };
}

/* ═══════════════════════════════════════════════════════════
   13) SEFER KÖPRÜSÜ
   sefer.js'in hedefBilgisi() işlevi gx/gy taşıyan hedefi
   "kaynak" türü olarak zaten kabul ediyor. Bu işlev düğümü o
   biçime çevirir — sefer.js'e dokunmadan hedef verilebilir.
   ═══════════════════════════════════════════════════════════ */
function seferHedefi(slotId) {
  const d = dugum(slotId);
  if (!d || !window.KOORD) return null;
  return {
    name: d.ad + " Sv." + d.seviye,
    slotId: d.slotId,
    dugumTuru: d.tur,
    gx: window.KOORD.karodanOlcek(d.kx),
    gy: window.KOORD.karodanOlcek(d.ky),
    kx: d.kx, ky: d.ky,
  };
}

/* ═══════════════════════════════════════════════════════════
   14) HARİTA ÇİZİMİ İÇİN VERİ
   index.html'in renderBattleMap'i bunu okur. Kilit kural:
   BAŞKASININ düğümünde YALNIZ kullanıcı adı görünür —
   ne topladığı, ne kadar kaldığı GÖSTERİLMEZ.
   ═══════════════════════════════════════════════════════════ */
function haritaDugumleri() {
  return dugumler().map(d => ({
    slotId: d.slotId,
    kx: d.kx, ky: d.ky,
    ikon: d.ikon,
    /* ad → haritaya basılan kısa yazı (seviye YOK; rozet gösteriyor)
       etiket → panel/başlık için tam ad */
    ad: d.ad,
    etiket: d.ad + " Sv." + d.seviye,
    tur: d.tur,
    seviye: d.seviye,
    /* İşgal etiketi — sadece isim. */
    isgalAd: d.isgalAd,
    benimMi: d.benimMi,
    /* Kendi düğümüm değilse ayrıntı YOK. */
    kalan: d.benimMi ? d.kalan : null,
  }));
}

/* Dolu karo listesi — kale kurulurken üstüne denk gelmesin.
   index.html'deki _doluNoktalar bunu ÖLÇEK cinsinden bekliyor. */
function doluNoktalar() {
  if (!window.KOORD) return [];
  return dugumler().map(d => ({
    gx: window.KOORD.karodanOlcek(d.kx),
    gy: window.KOORD.karodanOlcek(d.ky),
  }));
}

/* ═══════════════════════════════════════════════════════════
   15) TEŞHİS
   Telefonda konsol açmak zor; DUGUM.tani() tek satırda özet verir.
   ═══════════════════════════════════════════════════════════ */
function tani() {
  const liste = dugumler();
  const sayim = {};
  liste.forEach(d => {
    const k = d.id + " Sv." + d.seviye;
    sayim[k] = (sayim[k] || 0) + 1;
  });

  const bekleyen = _slotlar.length - liste.length;
  const isgalli  = liste.filter(d => d.isgalAd).length;

  const r = {
    toplamSlot: _slotlar.length,
    haritada: liste.length,
    dogusBekleyen: bekleyen,
    isgalAltinda: isgalli,
    bulut: fbHazir() ? (_dinliyor ? "dinleniyor" : "bağlı değil") : "YOK (çevrimdışı)",
    bulutHata: _bulutHata,
    tohum: AYAR.TOHUM,
    karoSayisi: window.KOORD ? window.KOORD.karoSayisi() : "KOORD yok",
  };

  console.log("[dugum] TANI", r);
  console.table(sayim);

  /* Çakışma denetimi — iki düğüm üst üste düşmüş mü? */
  let cakisan = 0;
  for (let i = 0; i < liste.length; i++) {
    for (let j = i + 1; j < liste.length; j++) {
      if (Math.hypot(liste[i].kx - liste[j].kx, liste[i].ky - liste[j].ky) < AYAR.MIN_ARA_KARO) cakisan++;
    }
  }
  if (cakisan) console.warn("[dugum] ⚠️ " + cakisan + " çift birbirine çok yakın doğmuş.");
  else console.log("[dugum] ✅ çakışma yok");

  return r;
}

/* ═══════════════════════════════════════════════════════════
   16) BAŞLATMA
   ═══════════════════════════════════════════════════════════ */
/* ── TEŞHİS PANELİ  ?dugum=1 ──
   Telefonda konsol yok. Bu panel `dugumler/` yolunun OKUNABİLİR ve
   YAZILABİLİR olup olmadığını ekranda gösterir. Sorun çözülünce bu
   blok silinecek — GEÇİCİDİR. */
function tesihisPaneli() {
  if (document.getElementById("dugumTaniPanel")) return;

  const k = document.createElement("div");
  k.id = "dugumTaniPanel";
  k.style.cssText = "position:fixed;left:6px;right:6px;top:96px;z-index:99998;" +
    "background:#0d2438;color:#dff2ff;padding:10px 12px;border-radius:12px;" +
    "font:600 12px 'Baloo 2',sans-serif;box-shadow:0 2px 6px rgba(0,20,45,.3);" +
    "max-height:60vh;overflow:auto;";

  const bilgi = document.createElement("div");
  bilgi.style.cssText = "white-space:pre-wrap;line-height:1.5;";
  k.appendChild(bilgi);

  const satirlar = [];
  const kuyruk = [];
  function yaz(t) { satirlar.push(t); }
  function not(t) {
    kuyruk.push(t);
    if (kuyruk.length > 8) kuyruk.shift();
  }

  function dugmeYap(metin, isle) {
    const b = document.createElement("button");
    b.textContent = metin;
    b.style.cssText = "margin:8px 6px 0 0;padding:7px 12px;border:none;border-radius:9px;" +
      "background:#1b4b70;color:#fff;font:700 12px 'Baloo 2',sans-serif;";
    b.addEventListener("click", isle);
    k.appendChild(b);
    return b;
  }

  /* CANLI: panel saniyede bir kendini tazeler. Tek karelik bir
     görüntü yanıltıyordu — bulut kaydı 0 görünüyordu çünkü
     dinleyicinin ilk olayı henüz gelmemişti. */
  let _tik = null;
  function tazeleyici() {
    satirlar.length = 0;
    yaz("DÜĞÜM TEŞHİSİ");
    yaz("firebaseDb : " + (fbHazir() ? "var" : "YOK"));
    yaz("dinleyici  : " + (_dinliyor ? "açık" : "KAPALI"));
    yaz("bulut olayı: " + _olaySayisi + " kez" +
        (_sonOlay ? " · son " + Math.round((Date.now() - _sonOlay) / 1000) + " sn önce" : ""));
    yaz("bulutHata  : " + (_bulutHata || "yok"));
    yaz("bulut kaydı: " + Object.keys(_durum).length + " slot");
    yaz("haritada   : " + dugumler().length + " / " + _slotlar.length);
    if (_sonIslem) {
      const d = _durum[_sonIslem.slotId];
      yaz("— son tüketme —");
      yaz("slot   : " + _sonIslem.slotId);
      yaz("istenen: " + _sonIslem.istenen);
      yaz("sonuç  : " + _sonIslem.sonuc);
      yaz("kayıt  : " + (d ? JSON.stringify(d) : "YOK"));
    }
    bilgi.textContent = satirlar.join("\n") + (kuyruk.length ? "\n" + kuyruk.join("\n") : "");
  }

  /* Kesici: kural engelinde söz asılı kalır, cevap hiç gelmez. */
  function kesici(soz, sn) {
    return Promise.race([
      soz.then(v => ({ ok: true, v: v })).catch(e => ({ ok: false, e: e })),
      new Promise(c => setTimeout(() => c({ ok: false, asili: true }), sn * 1000)),
    ]);
  }

  dugmeYap("OKUMA TESTİ", function () {
    if (!fbHazir()) { not("→ okuma: firebaseDb yok"); return; }
    not("→ okuma deneniyor…");
    kesici(firebaseDb.ref(AYAR.KOK).get(), 6).then(r => {
      if (r.asili) not("→ OKUMA ASILI KALDI (kural okumayı engelliyor)");
      else if (!r.ok) not("→ OKUMA REDDEDİLDİ: " + (r.e && r.e.message ? r.e.message : r.e));
      else not("→ okuma TAMAM (" + Object.keys((r.v && r.v.val()) || {}).length + " kayıt)");
    });
  });

  dugmeYap("YAZMA TESTİ", function () {
    if (!fbHazir()) { not("→ yazma: firebaseDb yok"); return; }
    not("→ yazma deneniyor…");
    kesici(firebaseDb.ref(AYAR.KOK + "/_test").set({ n: 0, k: Date.now() }), 6).then(r => {
      if (r.asili) not("→ YAZMA ASILI KALDI (kural yazmayı engelliyor)");
      else if (!r.ok) not("→ YAZMA REDDEDİLDİ: " + (r.e && r.e.message ? r.e.message : r.e));
      else not("→ yazma TAMAM");
    });
  });

  dugmeYap("KAPAT", function () { clearInterval(_tik); k.remove(); });

  document.body.appendChild(k);
  tazeleyici();
  _tik = setInterval(tazeleyici, 1000);
}

function baslat() {
  dinlemeyeBasla();
  try {
    if (location.search.indexOf("dugum=1") !== -1) setTimeout(tesihisPaneli, 600);
  } catch (e) {}
  /* Bulut yoksa da harita dolu görünsün: nesil 0 konumları
     zaten tohumdan hesaplanıyor, ek iş gerekmiyor. */
  tazele();
}

if (typeof window !== "undefined") {
  if (document.readyState === "complete") setTimeout(baslat, 1200);
  else window.addEventListener("load", () => setTimeout(baslat, 1200));
}

/* ═══════════════════════════════════════════════════════════
   DIŞA AÇILAN KAPI
   Bu dosyanın DIŞINDAN yalnız bunlar çağrılır. İçerideki hiçbir
   değişken doğrudan okunmaz — adres tek yerden değişsin.
   ═══════════════════════════════════════════════════════════ */
window.DUGUM = {
  SURUM: "canavar-bilesim-33",      /* rozet bunu gösterir; yükleme doğrulaması */

  /* okuma */
  dugumler: dugumler,
  dugum: dugum,
  haritaDugumleri: haritaDugumleri,
  doluNoktalar: doluNoktalar,
  seferHedefi: seferHedefi,

  /* hesap */
  kapasite: kapasite,
  orduKapasitesi: orduKapasitesi,
  yagmaKapasitesi: yagmaKapasitesi,
  YAGMA_KAPASITE: YAGMA_KAPASITE,
  toplamaPlani: toplamaPlani,
  baskinSonrasiPlan: baskinSonrasiPlan,

  /* eylem */
  isgalAl: isgalAl,
  isgalBirak: isgalBirak,
  isgalTazele: isgalTazele,
  tuket: tuket,
  canavarYen: canavarYen,

  /* tanım tabloları — salt okunur kullanım için */
  KAYNAK: KAYNAK,
  kaynakSimge: kaynakSimge,
  KAYNAK_IDLER: KAYNAK_IDLER,
  ARAZILER: ARAZILER,
  CANAVARLAR: CANAVARLAR,
  sablon: sablon,
  slotSayisi: slotSayisi,

  /* teşhis */
  tani: tani,
  AYAR: AYAR,
};

})();
