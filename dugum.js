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

/* Birliklerin TAŞIMA KAPASİTESİ.
   Seviye parametresi şimdilik hep 1 gelir; troops.js'e birlik
   seviyeleri eklendiğinde çarpan BURADAN bağlanır, çağıran
   yerlerin hiçbiri değişmez. */
const KAPASITE = { knight: 100, soldier: 70, robot: 50 };

function kapasite(tur, seviye) {
  const temel = KAPASITE[tur] || 0;
  const s = (typeof seviye === "number" && seviye > 0) ? seviye : 1;
  /* seviye çarpanı henüz yok — 1. seviye = temel değer */
  return temel * (s === 1 ? 1 : 1);
}

/* Bir ordunun toplam taşıma kapasitesi.
   birlikler: { knight: n, soldier: n, robot: n } */
function orduKapasitesi(birlikler, seviyeler) {
  let t = 0;
  Object.keys(KAPASITE).forEach(k => {
    const adet = (birlikler || {})[k] || 0;
    const sv = (seviyeler || {})[k] || 1;
    t += adet * kapasite(k, sv);
  });
  return t;
}

/* ═══════════════════════════════════════════════════════════
   2) KAYNAK TÜRLERİ
   hiz → saniyede kaç birim toplanır. ORDUYA GÖRE DEĞİŞMEZ;
   ordunun bileşimi yalnız KAPASİTEYİ etkiler.
   ═══════════════════════════════════════════════════════════ */
const KAYNAK = {
  et:     { id: "et",     ad: "Et",     ikon: "🍖", hiz: 7 },
  demir:  { id: "demir",  ad: "Demir",  ikon: "⛓️", hiz: 5 },
  su:     { id: "su",     ad: "Su",     ikon: "💧", hiz: 3 },
  enerji: { id: "enerji", ad: "Enerji", ikon: "⚡", hiz: 2 },
};

const KAYNAK_IDLER = ["et", "demir", "su", "enerji"];

/* ═══════════════════════════════════════════════════════════
   3) ŞABLONLAR
   ═══════════════════════════════════════════════════════════ */

/* Her seviyede kaç slot açılacak. */
const SLOT_ADEDI = { 1: 10, 2: 7, 3: 5 };

/* Canavar stat çarpanı — seviye arttıkça birlik başına güç. */
const SEVIYE_CARPANI = { 1: 1.00, 2: 1.15, 3: 1.30 };

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
];

/* ── CANAVARLAR ──
   birlik[seviye] = kaç birlik. stat = BİRLİK BAŞINA saldırı /
   savunma / can — oyuncu birlikleriyle (troops.js) aynı ölçekte.
   Bütçe hepsinde 18; fark ŞEKİLDE, güçte değil. Zorluğu birlik
   SAYISI belirler, stat yalnız savaşın hissini değiştirir.
   odul[seviye] = tek vuruşta düşen kaynak (sabit rakam). */
const CANAVARLAR = [
  { id: "goril", ad: "Goril", ikon: "🦍", kaynak: "demir",
    stat: { attack: 3, defense: 7, hp: 8 },
    birlik: { 1: 25,  2: 80,   3: 250 },
    odul:   { 1: 1000, 2: 5000, 3: 15000 } },

  { id: "ayi",   ad: "Ayı",   ikon: "🐻", kaynak: "et",
    stat: { attack: 6, defense: 5, hp: 7 },
    birlik: { 1: 50,   2: 150,  3: 450 },
    odul:   { 1: 2500, 2: 5000, 3: 8000 } },

  { id: "kurt",  ad: "Kurt",  ikon: "🐺", kaynak: "su",
    stat: { attack: 9, defense: 3, hp: 6 },
    birlik: { 1: 250, 2: 430, 3: 700 },
    odul:   { 1: 200, 2: 900, 3: 1700 } },

  { id: "fil",   ad: "Fil",   ikon: "🐘", kaynak: "enerji",
    stat: { attack: 4, defense: 8, hp: 6 },
    birlik: { 1: 500, 2: 1100, 3: 2500 },
    odul:   { 1: 150, 2: 400,  3: 1300 } },
];

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
      const carp = SEVIYE_CARPANI[sv];
      _sablonlar[c.id + "|" + sv] = {
        tur: "canavar", id: c.id, seviye: sv,
        ad: c.ad, ikon: c.ikon,
        kaynak: c.kaynak,
        birlik: c.birlik[sv],
        odul: c.odul[sv],
        /* Statlar seviye çarpanıyla YUVARLANARAK sabitlenir —
           her okumada yeniden çarpılırsa savaş motoru ile
           gösterim ayrışır. */
        stat: {
          attack:  Math.round(c.stat.attack  * carp * 10) / 10,
          defense: Math.round(c.stat.defense * carp * 10) / 10,
          hp:      Math.round(c.stat.hp      * carp * 10) / 10,
        },
      };
    });
  });
})();

function sablon(id, seviye) { return _sablonlar[id + "|" + seviye] || null; }

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
  const turler = ARAZILER.map(a => a.id).concat(CANAVARLAR.map(c => c.id));
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

/* Şu anki tüm nesillerin imzası — önbellek geçerliliği için. */
function nesilImzasi() {
  return _slotlar.map(s => nesilOf(s.slotId)).join(",");
}

/* Kalelerin karo listesi. Düğüm kalenin üstüne doğmasın diye.
   Kale listesi buluttan gelir, yani tüm istemcilerde aynıdır. */
function kaleKarolari() {
  const out = [];
  try {
    if (typeof otherCastles !== "undefined" && Array.isArray(otherCastles)) {
      otherCastles.forEach(c => {
        const k = window.KOORD && window.KOORD.kaleKaro(c && c.castle);
        if (k) out.push(k);
      });
    }
  } catch (e) {}
  try {
    if (typeof state !== "undefined" && state && state.castle) {
      const k = window.KOORD && window.KOORD.kaleKaro(state.castle);
      if (k) out.push(k);
    }
  } catch (e) {}
  /* Sıralanır: liste sırası istemciden istemciye değişmesin. */
  out.sort((a, b) => (a.kx - b.kx) || (a.ky - b.ky));
  return out;
}

/* Tüm slotların konumunu bir kerede hesaplar. */
function konumlariHesapla() {
  const N = (window.KOORD ? window.KOORD.karoSayisi() : 141);
  const pay = AYAR.KENAR_PAY;
  const alan = Math.max(1, N - pay * 2);
  const kaleler = kaleKarolari();
  const yerlesik = [];
  const sonuc = {};

  const cakisiyor = (kx, ky) => {
    for (let i = 0; i < yerlesik.length; i++) {
      const p = yerlesik[i];
      if (Math.hypot(p.kx - kx, p.ky - ky) < AYAR.MIN_ARA_KARO) return true;
    }
    for (let i = 0; i < kaleler.length; i++) {
      const c = kaleler[i];
      if (Math.hypot(c.kx - kx, c.ky - ky) < AYAR.KALE_PAY_KARO) return true;
    }
    return false;
  };

  _slotlar.forEach(s => {
    const nesil = nesilOf(s.slotId);
    const rnd = uretec(karma(AYAR.TOHUM + "|" + s.slotId + "|" + nesil));

    let secilen = null;
    for (let d = 0; d < AYAR.DENEME; d++) {
      const kx = pay + Math.floor(rnd() * alan);
      const ky = pay + Math.floor(rnd() * alan);
      if (!cakisiyor(kx, ky)) { secilen = { kx: kx, ky: ky }; break; }
    }
    /* Hiç boş yer bulunamazsa son denemeyi kabul et — düğümün
       hiç doğmaması, sıkışık doğmasından kötüdür. */
    if (!secilen) {
      secilen = { kx: pay + Math.floor(rnd() * alan),
                  ky: pay + Math.floor(rnd() * alan) };
    }
    yerlesik.push(secilen);
    sonuc[s.slotId] = secilen;
  });

  return sonuc;
}

function konumlar() {
  const imza = nesilImzasi() + "#" + kaleKarolari().length;
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

  const nesil = (d && typeof d.n === "number") ? d.n : 0;

  /* Tükenmiş mi? td varsa doğuş saatini bekliyor demektir. */
  if (d && typeof d.td === "number") {
    const dogar = d.td + dogusGecikmesi(s.slotId, nesil);
    if (Date.now() < dogar) {
      return { slotId: s.slotId, bos: true, dogarAt: dogar, nesil: nesil };
    }
    /* Doğuş saati geldi: bir sonraki nesle geçmiş SAYILIR.
       Buluta yazmayı ilk dokunan oyuncu yapar (bkz. tuket/isgalAl);
       o zamana kadar herkes yeni konumu zaten hesaplayabilir. */
  }

  const k = konum(s.slotId);
  if (!k) return null;

  const kalan = (d && typeof d.k === "number" && typeof d.td !== "number")
    ? d.k
    : (sab.tur === "arazi" ? sab.miktar : sab.birlik);

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
    kaynakIkon: KAYNAK[sab.kaynak].ikon,
    hiz: sab.hiz || 0,
    miktar: sab.tur === "arazi" ? sab.miktar : 0,
    kalan: kalan,
    birlik: sab.tur === "canavar" ? sab.birlik : 0,
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

  const uygula = (d) => {
    if (!d) d = { n: nesilOf(slotId), k: (sab.tur === "arazi" ? sab.miktar : sab.birlik) };
    const kalanOnce = typeof d.k === "number" ? d.k : (sab.tur === "arazi" ? sab.miktar : sab.birlik);
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
    return Promise.resolve({ ok: true, alinan: r.alinan, bitti: r.bitti });
  }

  /* ok ARTIK "sunucu KABUL ETTİ" demek.
     Eskiden transaction gövdesi bir kez çalışır çalışmaz ok:true
     yazılıyordu; sunucu yazmayı reddetse bile çağıran "oldu"
     sanıyordu. Belirti: canavar yenildi, ödül alındı, ama düğüm
     haritada duruyor ve hiçbir hata görünmüyor. */
  let sonuc = { ok: false, calisti: false, alinan: 0, bitti: false, sebep: "" };
  return firebaseDb.ref(AYAR.KOK + "/" + slotId).transaction(mevcut => {
    const r = uygula(mevcut);
    sonuc.calisti = true;
    sonuc.alinan = r.alinan;
    sonuc.bitti  = r.bitti;
    return r.yeni;
  }).then(res => {
    const kabul = !!(res && res.committed);
    sonuc.ok = kabul;
    if (kabul) {
      durumUygulaTek(slotId, res.snapshot.val());
    } else {
      sonuc.sebep = sonuc.calisti
        ? "sunucu yazmayı kabul etmedi (kural ya da çakışma)"
        : "işlem hiç çalışmadı (yol okunamadı)";
    }
    return sonuc;
  }).catch(err => {
    _bulutHata = err && err.message ? err.message : String(err);
    sonuc.ok = false;
    sonuc.sebep = "hata: " + _bulutHata;
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
function baslat() {
  dinlemeyeBasla();
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
  SURUM: "canvas-4-varis",          /* rozet bunu gösterir; yükleme doğrulaması */

  /* okuma */
  dugumler: dugumler,
  dugum: dugum,
  haritaDugumleri: haritaDugumleri,
  doluNoktalar: doluNoktalar,
  seferHedefi: seferHedefi,

  /* hesap */
  kapasite: kapasite,
  orduKapasitesi: orduKapasitesi,
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
