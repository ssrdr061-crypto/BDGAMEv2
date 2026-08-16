/* ============================================================
   sefer.js — BİRLİK SEVKİYATI (İNTİKAL)
   ------------------------------------------------------------
   Saldırılar ANINDA çözülmez: ordu haritada yürür, hedefe varır,
   çarpışır ve geri döner.

   ── GERÇEĞİN KAYNAĞI YERELDİR ──────────────────────────────
   İLK SÜRÜMÜN HATASI: sayaç, çizgi ve "en fazla 3" sınırı
   Firebase'in `seferler` düğümünü geri yollamasına bağlıydı.
   Yankı gelmeyince liste boş kaldı; ordu kaleden düşüldü ama
   ekranda hiçbir şey belirmedi, sınır da çalışmadı. Üstelik
   dinleyiciye hata geri çağırması konmamıştı — izin hatası bile
   sessiz kalıyordu.

   ARTIK: kendi seferlerim `_yerel`de + localStorage'da tutulur.
   Firebase'e YAZILIR (diğer oyuncular görsün diye) ama okumaya
   BAĞIMLI DEĞİLDİR. Bulut hiç cevap vermese bile kendi ordunu
   görürsün, sayaç işler, sınır uygulanır, birlikler geri döner.
   Buluttan gelen yalnız BAŞKALARININ seferleridir.
   Her yazma hatası konsola VE ekrana düşer; sessiz başarısızlık
   yok. Durum için: konsola `SEFER.tani()` yaz.

   Araya girdiği tek yer SALDIR düğmesidir; onu `document`
   üzerinde CAPTURE aşamasında yakalar — pvp.js'in ve
   index.html'in dinleyicileri hiç tetiklenmez. Bir aksilikte
   SALDIR yine yutulur ve sebep ekrana yazılır (bilinçli:
   sessizce eski anlık savaşa düşmek hatayı gizler).

   Varışta savaşı OYUNUN KENDİ fonksiyonları çözer:
     - kale    → window.PVP.savasiCalistir()   (pvp.js)
     - canavar → startBattle()                 (index.html)
   Savaş matematiği burada KOPYALANMAZ.

   Dönen mevcut TAHMİN DEĞİL:
     ölen   → window.PVP.sonSonuc.killed (pvp.js yayınlar)
     yaralı → sendWoundedToHospital'a giden liste (yakalanır)
   Yaralı savaş anında hastaneye girmez; orduyla eve yürür.
   ============================================================ */
(function () {
"use strict";

/* ═══════════════════════════════════════════════════════════
   1) AYARLAR
   ═══════════════════════════════════════════════════════════ */
const AYAR = {
  KOK: "seferler",
  /* HIZ — HARİTADA GÖZÜNLE SAYDIĞIN KARO cinsinden.
     Harita 141×141 görsel karo; oyunun kendi koordinatı ise 0–30
     ölçeğinde ondalıklı bir DÜNYA ölçüsü (iki ayrı ızgara değil,
     bir ızgara + bir ölçek). Çevrim harita.js'teki ORAN'dan
     OKUNUR — buraya 4.7 gibi bir sayı GÖMÜLMEZ. Gömülürse
     ızgara boyu değiştiğinde hata sessiz olur. */
  SANIYE_PER_GORSEL_KARO: 5.3,   /* ≈ 25 sn / mantıksal karo */
  /* EN KISA İNTİKAL — 1 karoluk yürüyüş bu kadar sürer.
     5,3 sn'lik karo hızı bunun altında kaldığı için komşu karoya
     gitmek pratikte HEP bu sayı kadar sürer. 15.000'di, 7.000
     yapıldı: yakın hedeflere gidiş gelişi hızlandırır. */
  MIN_SURE_MS: 7000,
  CARPISMA_BEKLE_MS: 2000,
  MAX_SEFER: 3,
  KAYIT_OMRU_MS: 2 * 60 * 60 * 1000,
  YAY: 0,                   /* yol kavisi. 0 = DÜZ ÇİZGİ */

  /* HIZLANDIRMA — elmas karşılığı kalan süreyi kısaltır.
     Bedel ve oran TEK YERDE; menüdeki yazı da buradan okunur,
     iki ayrı sayı ayrışmasın. */
  HIZ_BEDEL: 2000,          /* elmas */
  HIZ_ORANI: 0.25,          /* kalan sürenin %25'i silinir */
};

const BIRLIKLER = ["knight", "soldier", "robot"];

/* ═══════════════════════════════════════════════════════════
   2) İÇ DURUM
   _yerel  → KENDİ seferlerim (gerçeğin kaynağı)
   _uzak   → başkalarının seferleri (yalnız gösterim)
   ═══════════════════════════════════════════════════════════ */
let _yerel   = {};
let _uzak    = {};
let _silinen = new Set();

let _ref = null, _benKey = null;
let _isleniyor = new Set();
let _kaleKonum = null;
let _sonKapi = 0, _panelKilit = 0, _rafId = null;
let _svg = null, _yolGrup = null;
let _yaraliYakala = false, _yakalanan = null;
let _bulutHata = null;      /* son bulut hatası — tani() gösterir */

/* ═══════════════════════════════════════════════════════════
   3) YARDIMCILAR
   ═══════════════════════════════════════════════════════════ */
function fbHazir() { return (typeof firebaseDb !== "undefined") && !!firebaseDb; }
function benKey() {
  if (typeof currentUsername !== "string" || !currentUsername) return null;
  if (typeof toFirebaseKey !== "function") return null;
  return toFirebaseKey(currentUsername.toLowerCase());
}
function toast(msg, ms) { if (typeof showToast === "function") showToast(msg, ms); }
function izgara() { return (typeof COORD_GRID === "number") ? COORD_GRID : 30; }
function bekle(ms) { return new Promise(r => setTimeout(r, ms)); }
function toplam(b) { return BIRLIKLER.reduce((a, k) => a + ((b || {})[k] || 0), 0); }

function fmtSure(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  /* Bir dakikanın altı SANİYE yazılır: 15 sn artık "00.15d" değil
     "15s". Dakika üstü eskisi gibi dd.ss biçiminde. */
  if (t < 60) return t + "s";
  const dk = Math.floor(t / 60), sn = t % 60;
  return String(dk).padStart(2, "0") + "." + String(sn).padStart(2, "0") + "d";
}
/* Oyun ölçüsü (0–30) → görsel karo. harita.js dışa açıyor;
   yoksa aynı formülün yedeği (141/30). */
function oran() {
  const H = window.HARITA;
  return (H && typeof H.ORAN === "number" && H.ORAN > 0) ? H.ORAN : (141 / 30);
}
function gorselKaroMesafesi(fx, fy, tx, ty) {
  return Math.hypot(tx - fx, ty - fy) * oran();
}
function sureHesapla(fx, fy, tx, ty) {
  const karo = gorselKaroMesafesi(fx, fy, tx, ty);
  return Math.max(AYAR.MIN_SURE_MS, Math.round(karo * AYAR.SANIYE_PER_GORSEL_KARO * 1000));
}
function gecerli(s) {
  return !!s && typeof s.gidisAt === "number" && typeof s.sureMs === "number" &&
         typeof s.fx === "number" && typeof s.tx === "number";
}

/* ── HAYALET SEFER KALKANI ──
   `seferler/{id}` kaydını yalnız SAHİBİ silebilir (Firebase kuralı).
   Sahip oyundan çıkıp bir daha girmezse kayıt bulutta ÖLÜ kalır ve
   herkesin haritasında sonsuza dek duran bir ordu + akan kesik
   çizgi olarak çizilir — "her girişte aynı bug".

   Çözüm iki katmanlı:
     · GÖSTERİM: ömrü dolmuş kayıt hiç çizilmez (aşağıdaki filtre).
     · TEMİZLİK: sahibi bir daha girdiğinde tik() onu bitirip
       buluttan siler.
   Ömür kaydın KENDİ süresinden hesaplanır, sabit bir saatten değil:
   uzun bir toplama seferi 2 saati aşabilir ve sabit eşik onu
   yolun ortasında keserdi. */
const BAYAT_PAY_MS = 10 * 60 * 1000;   /* sekme uykuda kalırsa diye pay */

function tahminiBitis(s) {
  const gidisBitis = (s.gidisAt || 0) + (s.sureMs || 0);
  const topla = s.toplaSureMs || 0;
  const donus = s.donusSureMs || s.sureMs || 0;
  if (s.durum === "donus") return (s.donusAt || gidisBitis) + donus;
  if (s.durum === "topla") return (s.toplaAt || gidisBitis) + topla + donus;
  return gidisBitis + topla + donus;
}
function omruDoldu(s) {
  return Date.now() > tahminiBitis(s) + BAYAT_PAY_MS;
}

function evre(s) {
  const now = Date.now();

  /* ── TOPLAMA EVRESİ ──
     Ordu araziye vardı ve orada DURUYOR. Konum sabit (tx,ty); ilerleme
     toplanan kaynağın oranıdır, yol değil. Çizim katmanı bunu görünce
     orduyu hedefin üstünde bekletir. */
  if (s.durum === "topla") {
    const sure = s.toplaSureMs || 0;
    const p = sure > 0 ? (now - s.toplaAt) / sure : 1;
    return { ad: "topla", p: Math.max(0, Math.min(1, p)), bitti: p >= 1,
             kalanMs: Math.max(0, s.toplaAt + sure - now),
             ax: s.tx, ay: s.ty, bx: s.tx, by: s.ty };
  }

  if (s.durum === "donus") {
    const sure = s.donusSureMs || s.sureMs;
    const p = sure > 0 ? (now - s.donusAt) / sure : 1;
    return { ad: "donus", p: Math.max(0, Math.min(1, p)), bitti: p >= 1,
             kalanMs: Math.max(0, s.donusAt + sure - now),
             ax: s.donusFx, ay: s.donusFy, bx: s.fx, by: s.fy };
  }
  const p = s.sureMs > 0 ? (now - s.gidisAt) / s.sureMs : 1;
  return { ad: "gidis", p: Math.max(0, Math.min(1, p)), bitti: p >= 1,
           kalanMs: Math.max(0, s.gidisAt + s.sureMs - now),
           ax: s.fx, ay: s.fy, bx: s.tx, by: s.ty };
}

/* Çizilecek TÜM seferler: benimkiler yerelden, ötekiler buluttan */
function hepsi() {
  const out = [];
  Object.keys(_yerel).forEach(id => { if (gecerli(_yerel[id])) out.push({ id, s: _yerel[id] }); });
  const bk = benKey();
  Object.keys(_uzak).forEach(id => {
    const s = _uzak[id];
    if (!gecerli(s)) return;
    if (s.sahip === bk) return;          /* benimki yerelden geliyor */
    if (omruDoldu(s)) return;            /* hayalet: sahibi silemedi */
    out.push({ id, s });
  });
  return out;
}
function benimkiler() {
  return Object.keys(_yerel).filter(id => gecerli(_yerel[id])).map(id => ({ id, s: _yerel[id] }));
}

/* ═══════════════════════════════════════════════════════════
   4) KALICILIK — localStorage + Firebase (yazma tek yönlü)
   ═══════════════════════════════════════════════════════════ */
function depoAnahtari() { const k = benKey(); return k ? "sefer_" + k : null; }

function yereliKaydet() {
  const a = depoAnahtari(); if (!a) return;
  try { localStorage.setItem(a, JSON.stringify(_yerel)); }
  catch (e) { console.error("[sefer] yerel kayıt:", e); }
}
function yereliYukle() {
  const a = depoAnahtari(); if (!a) return;
  try {
    const ham = localStorage.getItem(a);
    _yerel = ham ? (JSON.parse(ham) || {}) : {};
  } catch (e) { console.error("[sefer] yerel okuma:", e); _yerel = {}; }
}

/* Buluta yaz — BEST EFFORT. Başarısızlık seferi durdurmaz,
   sadece başkaları göremez. Hata SESSİZ KALMAZ. */
function bulutaYaz(id, kayit) {
  if (!fbHazir()) { _bulutHata = "firebaseDb yok"; return; }
  try {
    firebaseDb.ref(AYAR.KOK + "/" + id).set(temizVeri(kayit))
      .then(() => { _bulutHata = null; })
      .catch(err => {
        _bulutHata = String(err && err.message || err);
        console.error("[sefer] buluta yazılamadı:", err);
        toast("⚠️ Sefer buluta yazılamadı — diğer oyuncular göremeyecek.", 4000);
      });
  } catch (err) {
    _bulutHata = String(err && err.message || err);
    console.error("[sefer] buluta yazılamadı (senkron):", err);
    toast("⚠️ Sefer buluta yazılamadı — konsola bak.", 4000);
  }
}
function buluttanSil(id) {
  if (!fbHazir()) return;
  try { firebaseDb.ref(AYAR.KOK + "/" + id).remove().catch(() => {}); } catch (e) {}
}

/* Firebase undefined kabul etmez; sync hata fırlatır. */
function temizVeri(x) {
  if (x === undefined || x === null) return null;
  if (Array.isArray(x)) { const a = x.map(temizVeri).filter(v => v !== null); return a.length ? a : null; }
  if (typeof x === "object") {
    const o = {};
    Object.keys(x).forEach(k => { const v = temizVeri(x[k]); if (v !== null) o[k] = v; });
    return Object.keys(o).length ? o : null;
  }
  return x;
}

/* Seferi yerelde güncelle → kaydet → buluta yansıt */
function seferYaz(id, kayit) {
  _yerel[id] = kayit;
  yereliKaydet();
  bulutaYaz(id, kayit);
  hudCiz(); dongu();
}
function seferSil(id) {
  delete _yerel[id];
  _silinen.add(id);
  yereliKaydet();
  buluttanSil(id);
  hudCiz();
}

/* ═══════════════════════════════════════════════════════════
   5) BİRLİK DEFTERİ
   ═══════════════════════════════════════════════════════════ */
function birlikDus(b) {
  if (typeof state === "undefined" || !state.troops) return;
  BIRLIKLER.forEach(k => state.troops[k] = Math.max(0, (state.troops[k] || 0) - ((b || {})[k] || 0)));
  tazele();
}
function birlikEkle(b) {
  if (typeof state === "undefined" || !state.troops) return;
  BIRLIKLER.forEach(k => state.troops[k] = (state.troops[k] || 0) + ((b || {})[k] || 0));
  tazele();
}
function tazele() {
  ["renderTroopsPanel", "renderHospitalPanel", "persistCurrentState"]
    .forEach(f => { if (typeof window[f] === "function") { try { window[f](); } catch (e) {} } });
}

/* ═══════════════════════════════════════════════════════════
   6) YARALI YAKALAMA
   sendWoundedToHospital DEĞİŞTİRİLMEZ, sarılır. Savaş anında
   yaralılar hastaneye girmez; listesi eve taşınır.
   ═══════════════════════════════════════════════════════════ */
const _gercekHastane = (typeof window.sendWoundedToHospital === "function")
  ? window.sendWoundedToHospital : null;

if (_gercekHastane && !_gercekHastane._seferSarildi) {
  const sarmal = function (liste) {
    if (_yaraliYakala) { _yakalanan = liste || {}; return; }
    return _gercekHastane.apply(this, arguments);
  };
  sarmal._seferSarildi = true;
  window.sendWoundedToHospital = sarmal;
}
if (!_gercekHastane) console.error("[sefer] sendWoundedToHospital bulunamadı — yaralılar eve taşınamaz!");

function yaraliSayilari(liste) {
  const o = {};
  Object.keys(liste || {}).forEach(uid => {
    const v = liste[uid];
    o[uid] = Array.isArray(v) ? v.length : (Number(v) || 0);
  });
  return o;
}

/* ═══════════════════════════════════════════════════════════
   7) HEDEF ÇÖZÜMÜ
   ═══════════════════════════════════════════════════════════ */
function hedefBilgisi(e) {
  if (!e) return null;

  /* buildDefender mapX/mapY'yi 0 yazar; koordinat otherCastles'ta.
     Bu yüzden isPlayer kontrolü mapX'ten ÖNCE gelmeli. */
  if (e.isPlayer) {
    const ad = String(e.name || "").toLowerCase();
    let kale = null;
    if (typeof otherCastles !== "undefined" && Array.isArray(otherCastles)) {
      const c = otherCastles.find(x => x && String(x.name || "").toLowerCase() === ad);
      if (c && c.castle && typeof c.castle.gx === "number") kale = c.castle;
    }
    if (!kale) return null;
    return { tur: "kale", ad: e.name,
             key: e.accKey || (typeof toFirebaseKey === "function" ? toFirebaseKey(ad) : null),
             gx: kale.gx, gy: kale.gy };
  }

  /* Canavar konumu TAM SAYI KARO (kx/ky). Çevrim koordinat.js'te. */
  if (typeof e.kx === "number" && typeof e.ky === "number") {
    return { tur: "canavar", ad: e.name, key: null,
             gx: window.KOORD.karodanOlcek(e.kx), gy: window.KOORD.karodanOlcek(e.ky) };
  }

  /* Kaynak noktaları eklendiğinde gx/gy taşıyorsa buraya düşer. */
  if (typeof e.gx === "number" && typeof e.gy === "number") {
    return { tur: "kaynak", ad: e.name || "Kaynak", key: null, gx: e.gx, gy: e.gy };
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   8) SEFERİ BAŞLAT
   ═══════════════════════════════════════════════════════════ */
function seferBaslat() {
  const bk = benKey();
  if (!bk) { toast("Oturum yok — sefer gönderilemiyor."); return; }
  if (typeof currentEnemy === "undefined" || !currentEnemy) { toast("Önce haritadan bir hedef seç."); return; }
  if (typeof state === "undefined" || !state.castle || typeof state.castle.gx !== "number") {
    toast("Önce kalen olmalı."); return;
  }

  const h = hedefBilgisi(currentEnemy);
  if (!h) { toast("Bu hedefin koordinatı çözülemedi — sefer gönderilemiyor."); return; }
  if (h.tur === "kale" && h.key === bk) { toast("Kendi kalene sefer düzenleyemezsin."); return; }

  const acik = benimkiler().length;
  if (acik >= AYAR.MAX_SEFER) {
    toast(`Aynı anda en fazla ${AYAR.MAX_SEFER} intikal gönderebilirsin (${acik}/${AYAR.MAX_SEFER} yolda).`);
    return;
  }

  const secili = {};
  BIRLIKLER.forEach(k => {
    const istenen = Math.floor(Math.max(0, ((typeof selectedTroopsForBattle !== "undefined"
                      ? selectedTroopsForBattle[k] : 0) || 0)));
    secili[k] = Math.min(istenen, Math.max(0, (state.troops || {})[k] || 0));
  });
  if (toplam(secili) <= 0) { toast("Yanına en az 1 birlik almalısın!"); return; }

  const fx = state.castle.gx, fy = state.castle.gy;
  const sureMs = sureHesapla(fx, fy, h.gx, h.gy);
  const id = bk + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

  const kayit = {
    sahip: bk,
    sahipAd: (typeof currentUsername === "string" ? currentUsername : "Oyuncu"),
    tur: h.tur, hedefAd: h.ad, hedefKey: h.key || null,
    /* KOORDİNAT BİRİMİ: oyunun kendi 0–30 ölçüsü — Firebase'deki
       kale verisiyle, ekranKonumu ile ve koordinat kutusuyla AYNI
       dil. Görsel karoya çevirmek ikinci bir çevrim noktası
       yaratırdı; mesafe ayrıca gorselKaro alanında yazılı. */
    birim: "oyun30",
    fx: fx, fy: fy, tx: h.gx, ty: h.gy,
    gorselKaro: Math.round(gorselKaroMesafesi(fx, fy, h.gx, h.gy) * 10) / 10,
    sureMs: sureMs, gidisAt: Date.now(),
    durum: "gidis", iptal: false,
    birlikler: secili,
    komutanlar: (typeof selectedCommanders !== "undefined" && Array.isArray(selectedCommanders))
                  ? selectedCommanders.filter(Boolean) : [],
  };

  /* Birlikler kaleden düşülür ve sefer YERELDE kesinleşir.
     Bulut yazması başarısız olsa bile sefer yürür ve geri döner. */
  birlikDus(secili);
  seferYaz(id, kayit);

  toast(`⚔️ Ordun ${h.ad} üzerine yola çıktı — ${fmtSure(sureMs)}`);
  if (typeof backToMap === "function") backToMap();
}

/* ═══════════════════════════════════════════════════════════
   9) SALDIR DÜĞMESİNİ YAKALA (capture)
   ═══════════════════════════════════════════════════════════ */
function kapi(e) {
  const btn = e.target && e.target.closest ? e.target.closest("#battleBtn") : null;
  if (!btn) return;

  e.stopImmediatePropagation();
  e.preventDefault();

  const now = Date.now();
  if (now - _sonKapi < 700) return;   /* pointerup + click art arda gelir */
  _sonKapi = now;

  try { seferBaslat(); }
  catch (err) {
    console.error("[sefer] başlatılamadı:", err);
    toast("Sefer başlatılamadı: " + (err && err.message ? err.message : "bilinmeyen hata"), 5000);
  }
}
document.addEventListener("pointerup", kapi, true);
document.addEventListener("click",     kapi, true);

/* ═══════════════════════════════════════════════════════════
   10) ZAMAN MOTORU
   Çizim ve sayaç ARTIK BURADAN da sürülür — bulut dinleyicisine
   bağlı değil. (İlk sürümün asıl kırılma noktası buydu.)
   ═══════════════════════════════════════════════════════════ */
function tik() {
  const k = benKey();
  if (!k) return;

  if (_benKey !== k) {          /* giriş / hesap değişimi */
    _benKey = k;
    _kaleKonum = null;
    _silinen.clear();
    yereliYukle();
    dinle();
  }

  isinlanmaDenetimi();

  benimkiler().forEach(({ id, s }) => {
    if (_isleniyor.has(id)) return;
    const ev = evre(s);

    /* ── ÖNCE EVRE İLERLETİLİR, SONRA ÖMÜR BAKILIR ──
       Oyunu kapatıp saatler sonra girsen bile sefer buradan sırayla
       çözülür: varış → toplama → dönüş → kaleye giriş. Her tik bir
       evre ilerletir, birkaç saniyede tamamlanır ve GANİMET GELİR.
       Ömür denetimi bu satırların ALTINDA olmalı; üstte olsaydı geç
       giren oyuncunun tamamlanabilir seferi yükü alınmadan
       kapatılırdı. */
    if (ev.ad === "gidis" && ev.bitti) { varisiIsle(id, s); return; }
    if (ev.ad === "topla" && ev.bitti) { toplamayiBitir(id, s); return; }
    if (ev.ad === "donus" && ev.bitti) { seferiBitir(id, s); return; }

    /* Buraya düşen kayıt ilerleyemiyor demektir (bozuk durum, eksik
       alan). Ömrü de dolmuşsa sessizce kapatılır ve buluttan silinir
       — başkalarının haritasındaki hayalet ordu böyle temizlenir. */
    if (omruDoldu(s) || Date.now() - s.gidisAt > AYAR.KAYIT_OMRU_MS) {
      seferiBitir(id, s, true); return;
    }

    /* Uzun toplamalarda işgal kilidi düşmesin — dugum.js kilidi
       yenilenmezse ölü sayıyor (20 dk). Dakikada bir tazelenir. */
    if (ev.ad === "topla" && window.DUGUM && s.slotId) {
      if (!s._sonTazele || Date.now() - s._sonTazele > 60000) {
        s._sonTazele = Date.now();
        try { DUGUM.isgalTazele(s.slotId); } catch (e) {}
      }
    }
  });

  hudCiz();
  dongu();
}

/* Varış → duraklama → savaş → dönüş */
async function varisiIsle(id, s) {
  _isleniyor.add(id);
  try {
    /* Çarpışma beklemesi SAVAŞ içindir. Toplama seferinde savaş yok;
       beklemek adın haritada 2 sn geç belirmesine yol açıyordu. */
    if (s.tur !== "topla") await bekle(AYAR.CARPISMA_BEKLE_MS);
    const gonderilen = s.birlikler || {};

    birlikEkle(gonderilen);            /* savaş kaybı bunlardan düşecek */
    _panelKilit = Date.now() + 12000;
    _yaraliYakala = true; _yakalanan = null;
    if (window.PVP) window.PVP.sonSonuc = null;

    /* ── TOPLAMA VARIŞI ──
       Savaş yok. Ordu araziye yerleşir, toplama evresine geçer.
       Bu dal varisiIsle'nin geri kalanını (savaş kaybı sayımı,
       dönüş kaydı) ÇALIŞTIRMAZ; erken çıkar. */
    if (s.tur === "topla") {
      birlikDus(gonderilen);     /* yukarıda eklenmişti, geri al */
      _yaraliYakala = false; _panelKilit = 0;
      _isleniyor.delete(id);
      await toplamayaBasla(id, s);
      return;
    }

    if (!s.iptal) {
      if (s.tur === "kale")         await kaleSavasi(s);
      else if (s.tur === "canavar") await canavarSavasi(s);
    }

    _yaraliYakala = false;
    _panelKilit = 0;

    /* ── DÖNEN MEVCUT: SAYIM, TAHMİN DEĞİL ── */
    const yaraliListe = _yakalanan || {};
    const yarali = yaraliSayilari(yaraliListe);
    const olen = (window.PVP && window.PVP.sonSonuc && window.PVP.sonSonuc.killed)
                   ? window.PVP.sonSonuc.killed : {};
    _yakalanan = null;

    const saglam = {};
    BIRLIKLER.forEach(u => {
      saglam[u] = Math.max(0, (gonderilen[u] || 0) - (olen[u] || 0) - (yarali[u] || 0));
    });
    birlikDus(saglam);   /* sağlamlar tekrar yola; net etki sıfır */

    const guncel = Object.assign({}, s, {
      durum: "donus", donusAt: Date.now(), donusSureMs: s.sureMs,
      donusFx: s.tx, donusFy: s.ty,
      birlikler: saglam, yaralilar: yaraliListe
    });
    seferYaz(id, guncel);
  } catch (err) {
    console.error("[sefer] varış işlenemedi:", err);
    toast("Varış işlenemedi — konsola bak.", 5000);
    _yaraliYakala = false; _panelKilit = 0;
  }
  _isleniyor.delete(id);
}

async function kaleSavasi(s) {
  if (!window.PVP || typeof window.PVP.savasiCalistir !== "function" ||
      typeof window.PVP.savunanKur !== "function") {
    toast("Savaş çözülemedi — pvp.js güncel değil.", 5000);
    console.error("[sefer] PVP.savasiCalistir / savunanKur yok");
    return;
  }
  if (!fbHazir()) { toast("Bağlantı yok — savaş çözülemedi."); return; }

  const snap = await firebaseDb.ref("accounts/" + s.hedefKey).get();
  if (!snap.exists()) { toast(`${s.hedefAd} bulunamadı, ordun geri dönüyor.`); return; }

  const acc = snap.val();
  const kale = (acc.state || {}).castle;

  /* SAVUNAN IŞINLANDIYSA çarpışma olmaz */
  /* Karo üzerinden karşılaştır: kale kaydı artık kx/ky tutuyor,
     eski kayıtlar da kaleKaro ile karoya çevriliyor. */
  const kkale = window.KOORD.kaleKaro(kale);
  const khedef = window.KOORD.kaleKaro({ gx: s.tx, gy: s.ty });
  if (!kkale || !khedef || kkale.kx !== khedef.kx || kkale.ky !== khedef.ky) {
    toast(`🏰 ${s.hedefAd} ışınlanmış! Ordun boş araziye vardı, geri dönüyor.`, 4500);
    return;
  }

  currentEnemy = window.PVP.savunanKur(acc, s.hedefAd);
  selectedTroopsForBattle = Object.assign({}, s.birlikler);
  if (Array.isArray(s.komutanlar) && typeof selectedCommanders !== "undefined") {
    selectedCommanders = s.komutanlar.slice();
  }
  await window.PVP.savasiCalistir();
}

async function canavarSavasi(s) {
  if (typeof enemies === "undefined" || typeof startBattle !== "function") {
    toast("Savaş çözülemedi."); return;
  }
  /* SLOT İLE EŞLEŞTİR — ada göre aramak ARTIK YANLIŞ.
     Haritada aynı adlı 10 tane "Goril Sv.1" var; ada bakan arama
     rastgele birini seçer ve ordu yanlış canavarla savaşır.
     slotId benzersizdir. */
  let e = null;
  if (s.slotId) e = enemies.find(x => x && x.slotId === s.slotId);
  if (!e) e = enemies.find(x => x && x.name === s.hedefAd);   /* eski kayıtlar */
  if (!e) { toast(`${s.hedefAd} yerinde yok — ordun eli boş dönüyor.`); return; }
  currentEnemy = e;
  selectedTroopsForBattle = Object.assign({}, s.birlikler);
  if (Array.isArray(s.komutanlar) && typeof selectedCommanders !== "undefined") {
    selectedCommanders = s.komutanlar.slice();
  }
  await startBattle();
}


/* ═══════════════════════════════════════════════════════════
   10b) TOPLAMA SEFERİ
   Akış: kaleden yürü → araziye yerleş → topla → yükle → dön.
   Savaş yok; yükün kendisi ödüldür.

   İŞGAL: düğüm KALKIŞTA rezerve edilir, varışta değil. Sebep:
   ordu 20 dakika yürüyüp vardığında araziyi başkası kapmış
   olursa sefer boşa gider. Whiteout'ta da yola çıkıldığı anda
   nokta kilitlenir.
   ═══════════════════════════════════════════════════════════ */

/* Bir ordunun taşıma kapasitesi — dugum.js'ten. Tek kaynak orası;
   burada 100/70/50 gibi sayı GÖMÜLMEZ. */
function orduKapasitesi(birlikler) {
  if (window.DUGUM && typeof DUGUM.orduKapasitesi === "function") {
    return DUGUM.orduKapasitesi(birlikler);
  }
  return 0;
}

/* Araziye varıldı: toplama evresini başlat. */
async function toplamayaBasla(id, s) {
  const D = window.DUGUM;
  if (!D) { toast("Toplama çözülemedi — dugum.js yok."); donuseGec(id, s, {}); return; }

  const d = D.dugum(s.slotId);
  if (!d || d.tur !== "arazi") {
    toast(`${s.hedefAd} tükenmiş — ordun eli boş dönüyor.`, 4000);
    donuseGec(id, s, {});
    return;
  }

  /* Kilit hâlâ bizde mi? Kalkışta aldık ama düşmüş olabilir.
     `isgalAd` varış öncesi boştur (ad gizli), o yüzden burada
     REZERVASYONA bakılır — yoksa kapılmış arazi serbest sanılır. */
  if (d.isgalRezerve && !d.benimMi) {
    toast(`${d.isgalAd || "Bir oyuncu"} araziyi kapmış — ordun geri dönüyor.`, 4000);
    donuseGec(id, s, {});
    return;
  }
  if (!d.benimMi) {
    const r = await D.isgalAl(s.slotId);
    if (!r.ok) { toast(r.sebep || "Arazi meşgul.", 4000); donuseGec(id, s, {}); return; }
  }

  const plan = D.toplamaPlani(s.slotId, s.birlikler || {});
  if (!plan || plan.alinacak <= 0) {
    toast("Arazide alınacak kaynak kalmamış.", 4000);
    try { await D.isgalBirak(s.slotId); } catch (e) {}
    donuseGec(id, s, {});
    return;
  }

  seferYaz(id, Object.assign({}, s, {
    durum: "topla",
    toplaAt: Date.now(),
    toplaSureMs: plan.sureMs,
    kaynak: plan.kaynak,
    hedefMiktar: plan.alinacak,
  }));

  /* Harita tazelensin: arazinin altında adım belirsin.
     Düğümler canvas'ta olduğu için listeyi geçersiz kılmak şart. */
  try { if (window.HARITA && HARITA.dugumTazele) HARITA.dugumTazele(); } catch (e) {}
  toast(`⛏️ Ordun ${s.hedefAd} arazisinde toplamaya başladı — ${fmtSure(plan.sureMs)}`, 4500);
}

/* Toplama süresi doldu: kaynağı araziden düş, yükü orduya bindir. */
async function toplamayiBitir(id, s) {
  _isleniyor.add(id);
  try {
    const D = window.DUGUM;
    let yuk = {};

    if (D && s.slotId) {
      /* GERÇEKTEN ALINAN, PLANLANAN DEĞİL. Biz toplarken arazi
         tükenmiş olabilir (baskın, başka olay); tuket ne verirse o. */
      const r = await D.tuket(s.slotId, s.hedefMiktar || 0);
      const alinan = (r && r.alinan) || 0;
      if (alinan > 0) yuk[s.kaynak] = alinan;
      try { await D.isgalBirak(s.slotId); } catch (e) {}
      /* Kilit düştü: adım haritadan kalksın. */
      try { if (window.HARITA && HARITA.dugumTazele) HARITA.dugumTazele(); } catch (e) {}
    }
    donuseGec(id, s, yuk);
  } catch (err) {
    console.error("[sefer] toplama bitirilemedi:", err);
    toast("Toplama bitirilemedi — konsola bak.", 5000);
    donuseGec(id, s, {});
  }
  _isleniyor.delete(id);
}

/* Ortak dönüş geçişi — yükle birlikte. */
function donuseGec(id, s, yuk) {
  seferYaz(id, Object.assign({}, s, {
    durum: "donus", donusAt: Date.now(), donusSureMs: s.sureMs,
    donusFx: s.tx, donusFy: s.ty,
    yuk: yuk || {},
  }));
}

/* ── TOPLAMA SEFERİNİ BAŞLAT ──
   index.html'deki arazi paneli bunu çağırır:
     SEFER.toplamaBaslat(slotId, {knight:10, soldier:0, robot:0}, ["ivanovna"])

   KOMUTANLAR: üçüncü parametre verilmezse ekrandaki seçim
   (selectedCommanders) kullanılır — savaş seferiyle aynı davranış.
   Kayıttaki liste dönüşte selectedCommanders'a geri yüklenir; ileride
   toplayan orduya baskın bağlanınca savaşı bu komutanlar verecek. */
async function toplamaBaslat(slotId, birlikler, komutanlar) {
  const bk = benKey();
  if (!bk) { toast("Oturum yok — sefer gönderilemiyor."); return false; }
  if (!window.DUGUM) { toast("dugum.js yüklü değil."); return false; }
  if (typeof state === "undefined" || !state.castle || typeof state.castle.gx !== "number") {
    toast("Önce kalen olmalı."); return false;
  }

  const d = DUGUM.dugum(slotId);
  if (!d || d.tur !== "arazi") { toast("Bu arazi artık haritada yok."); return false; }

  /* ── AYNI ARAZİYE İKİNCİ ORDU YOK ──
     dugum.js'teki işgal kilidi asıl bekçi; bu ikinci bir emniyet.
     Bulut yazması başarısız olup yerel kilide düşüldüğünde kilit
     cihazlar arası paylaşılmaz — ama kendi seferlerimi HER ZAMAN
     yerelde görürüm. Bu yüzden kendi çift göndermemi burada
     kesiyorum, buluta hiç bakmadan. */
  const zatenGiden = benimkiler().find(x => x.s && x.s.slotId === slotId);
  if (zatenGiden) {
    const ev = evre(zatenGiden.s);
    toast(ev.ad === "topla"
      ? "Bu arazide zaten bir ordun topluyor."
      : "Bu araziye zaten bir ordun yolda.", 4000);
    return false;
  }

  /* SEFER SINIRI — toplama da 3 intikale DAHİL. Kaynak için ayrı
     bir slot açılmaz; savaş ve toplama aynı havuzu paylaşır. */
  const acik = benimkiler().length;
  if (acik >= AYAR.MAX_SEFER) {
    toast(`Aynı anda en fazla ${AYAR.MAX_SEFER} intikal gönderebilirsin (${acik}/${AYAR.MAX_SEFER} yolda).`);
    return false;
  }

  const secili = {};
  BIRLIKLER.forEach(k => {
    const istenen = Math.floor(Math.max(0, (birlikler || {})[k] || 0));
    secili[k] = Math.min(istenen, Math.max(0, (state.troops || {})[k] || 0));
  });
  if (toplam(secili) <= 0) { toast("Yanına en az 1 birlik almalısın!"); return false; }
  if (orduKapasitesi(secili) <= 0) { toast("Bu ordunun taşıma kapasitesi yok."); return false; }

  /* Süre ÖNCE hesaplanır: kilidin damgası ordunun VARIŞ anıdır.
     Arazi yine şimdi rezerve edilir (yolda kapılmasın) ama haritada
     adım ancak ordu vardığında belirir — bkz. dugum.js isgalAl. */
  const fx = state.castle.gx, fy = state.castle.gy;
  const h = { gx: window.KOORD.karodanOlcek(d.kx), gy: window.KOORD.karodanOlcek(d.ky) };
  const sureMs = sureHesapla(fx, fy, h.gx, h.gy);

  const r = await DUGUM.isgalAl(slotId, sureMs);
  if (!r.ok) { toast(r.sebep || "Bu arazi şu an müsait değil.", 4000); return false; }

  const id = bk + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

  const kayit = {
    sahip: bk,
    sahipAd: (typeof currentUsername === "string" ? currentUsername : "Oyuncu"),
    tur: "topla",
    hedefAd: d.ad + " Sv." + d.seviye,
    hedefKey: null,
    slotId: slotId,
    birim: "oyun30",
    fx: fx, fy: fy, tx: h.gx, ty: h.gy,
    gorselKaro: Math.round(gorselKaroMesafesi(fx, fy, h.gx, h.gy) * 10) / 10,
    sureMs: sureMs, gidisAt: Date.now(),
    durum: "gidis", iptal: false,
    birlikler: secili,
    komutanlar: Array.isArray(komutanlar)
      ? komutanlar.filter(Boolean)
      : ((typeof selectedCommanders !== "undefined" && Array.isArray(selectedCommanders))
          ? selectedCommanders.filter(Boolean) : []),
  };

  birlikDus(secili);
  seferYaz(id, kayit);

  toast(`⛏️ Ordun ${kayit.hedefAd} arazisine yola çıktı — ${fmtSure(sureMs)}`, 4500);
  return true;
}

/* Kaleye döndü: sağlamlar orduya, yaralılar hastaneye */
function seferiBitir(id, s, sessiz) {
  _isleniyor.add(id);
  birlikEkle(s.birlikler || {});

  /* ── YÜKÜ BOŞALT ──
     Toplama seferi kaynakla döner. Depo state.kaynaklar; harcama
     yeri henüz yok, şimdilik birikir. */
  let yukYazi = "";
  const yuk = s.yuk || null;
  if (yuk && typeof state !== "undefined") {
    if (!state.kaynaklar) state.kaynaklar = {};
    Object.keys(yuk).forEach(k => {
      const m = Math.max(0, Math.round(yuk[k] || 0));
      if (m <= 0) return;
      state.kaynaklar[k] = (state.kaynaklar[k] || 0) + m;
      const bilgi = (window.DUGUM && DUGUM.KAYNAK[k]) || null;
      yukYazi += ` +${m}${bilgi ? " " + bilgi.ikon : ""}`;
    });
    if (yukYazi) {
      if (typeof renderKaynaklar === "function") { try { renderKaynaklar(); } catch (e) {} }
      if (typeof persistCurrentState === "function") { try { persistCurrentState(); } catch (e) {} }
    }
  }

  const yarali = s.yaralilar || null;
  if (yarali && _gercekHastane) {
    try { _gercekHastane(yarali); tazele(); }
    catch (e) { console.error("[sefer] hastane:", e); }
  }

  if (!sessiz) {
    const n = toplam(s.birlikler || {});
    const y = toplam(yaraliSayilari(yarali || {}));
    toast(`🏰 Ordun kaleye döndü (${n} birlik)` + yukYazi +
          (y > 0 ? ` — ${y} yaralı hastaneye alındı` : "") + ".", 4000);
  }
  seferSil(id);
  _isleniyor.delete(id);
}

/* ═══════════════════════════════════════════════════════════
   11) IŞINLANMA — kendi kalen taşınırsa seferler anında iptal
   doCastleMove IIFE içinde kapalı, adıyla yakalanamıyor; kale
   koordinatının değişmesi izleniyor.
   ═══════════════════════════════════════════════════════════ */
function isinlanmaDenetimi() {
  if (typeof state === "undefined" || !state.castle || typeof state.castle.gx !== "number") return;
  const simdi = { gx: state.castle.gx, gy: state.castle.gy };
  if (!_kaleKonum) { _kaleKonum = simdi; return; }
  if (_kaleKonum.gx === simdi.gx && _kaleKonum.gy === simdi.gy) return;

  _kaleKonum = simdi;
  const liste = benimkiler();
  if (!liste.length) return;
  liste.forEach(({ id, s }) => {
    /* Toplayan ordu da geri geliyor; arazi kilidi açık kalmasın. */
    if (s.durum === "topla" && window.DUGUM && s.slotId) {
      try { DUGUM.isgalBirak(s.slotId); } catch (e) {}
    }
    seferiBitir(id, s, true);
  });
  toast("🌀 Işınlandın — yoldaki ordularının hepsi kaleye geri döndü.", 4000);
}

/* ═══════════════════════════════════════════════════════════
   12) GERİ ÇAĞIRMA
   ═══════════════════════════════════════════════════════════ */
function geriCagir(id) {
  const s = _yerel[id];
  if (!s) return;
  if (s.durum === "donus") { toast("Bu ordu zaten dönüş yolunda."); return; }

  /* ── TOPLARKEN GERİ ÇAĞIRMA ──
     Ordu arazide duruyor; yolun ortasında değil. O ana kadar
     toplanan kadarını yükleyip hedeften geri döner ve işgali
     bırakır — yoksa arazi 20 dakika kilitli kalırdı. */
  if (s.durum === "topla") {
    const gecenT = Math.max(0, Date.now() - (s.toplaAt || Date.now()));
    const oran = s.toplaSureMs > 0 ? Math.min(1, gecenT / s.toplaSureMs) : 1;
    const kismi = Math.floor((s.hedefMiktar || 0) * oran);

    (async () => {
      let yuk = {};
      try {
        if (window.DUGUM && kismi > 0) {
          const r = await DUGUM.tuket(s.slotId, kismi);
          if (r && r.alinan > 0) yuk[s.kaynak] = r.alinan;
        }
        if (window.DUGUM) await DUGUM.isgalBirak(s.slotId);
      } catch (e) { console.error("[sefer] geri çağırma:", e); }
      donuseGec(id, s, yuk);
      toast(`↩️ Ordun toplamayı bırakıp dönüyor (${kismi > 0 ? "kısmi yük alındı" : "eli boş"}).`, 4000);
    })();
    return;
  }

  const now = Date.now();
  const gecen = Math.max(0, Math.min(now - s.gidisAt, s.sureMs));
  const p = s.sureMs > 0 ? gecen / s.sureMs : 1;

  seferYaz(id, Object.assign({}, s, {
    durum: "donus", iptal: true, donusAt: now,
    donusSureMs: Math.max(3000, gecen),
    donusFx: s.fx + (s.tx - s.fx) * p,
    donusFy: s.fy + (s.ty - s.fy) * p
  }));
  toast("↩️ Ordu geri çağrıldı.");
}

/* ═══════════════════════════════════════════════════════════
   13) BULUT DİNLEME — YALNIZ BAŞKALARINI GÖRMEK İÇİN
   Hata geri çağırması VAR: izin/bağlantı sorunu sessiz kalmaz.
   ═══════════════════════════════════════════════════════════ */
function dinle() {
  if (!fbHazir() || _ref) return;
  _ref = firebaseDb.ref(AYAR.KOK);
  _ref.on("value",
    snap => {
      _uzak = snap.val() || {};
      _bulutHata = null;

      /* Başka cihazdan başlatılmış kendi seferimi devral */
      const bk = benKey();
      Object.keys(_uzak).forEach(id => {
        const s = _uzak[id];
        if (s && s.sahip === bk && gecerli(s) && !_yerel[id] && !_silinen.has(id)) {
          _yerel[id] = s;
          yereliKaydet();
          /* Ömrü dolmuşsa tik() bir sonraki turda bitirip buluttan
             siler — hayalet kalıcı olarak temizlenmiş olur. */
        }
      });
      hudCiz(); dongu();
    },
    err => {
      _bulutHata = String(err && err.message || err);
      console.error("[sefer] bulut okunamadı:", err);
      toast("⚠️ Seferler buluttan okunamıyor — kendi ordunu görürsün, başkalarınınkini göremezsin.", 5000);
    }
  );
}

/* ═══════════════════════════════════════════════════════════
   14) ÇİZİM
   #battleMap içine ayrı SVG katmanı. renderBattleMap innerHTML'i
   silince katman kopar; her karede geri takılır (missile.js
   deseni). Döngü yalnız sefer varken döner.
   ═══════════════════════════════════════════════════════════ */
const NS = "http://www.w3.org/2000/svg";

function katmaniHazirla() {
  const mapEl = document.getElementById("battleMap");
  if (!mapEl) return null;
  if (!_svg) {
    _svg = document.createElementNS(NS, "svg");
    _svg.setAttribute("id", "seferKatman");
    _svg.style.cssText = "position:absolute; left:0; top:0; width:100%; height:100%;" +
                         "overflow:visible; pointer-events:none; z-index:4;";
    _yolGrup = document.createElementNS(NS, "g");
    _svg.appendChild(_yolGrup);
  }
  if (_svg.parentNode !== mapEl) mapEl.appendChild(_svg);
  return _svg;
}

/* TEK GEÇİT: harita.js'in ekranKonumu'u. Yoksa yüzdeye düşer. */
function ekran(gx, gy) {
  const H = window.HARITA;
  if (H && typeof H.ekranKonumu === "function") {
    const p = H.ekranKonumu(gx, gy);
    if (p) return { x: p.x, y: p.y };
  }
  const mapEl = document.getElementById("battleMap");
  const w = mapEl ? mapEl.clientWidth : 0, h = mapEl ? mapEl.clientHeight : 0;
  return { x: (gx / izgara()) * w, y: (gy / izgara()) * h };
}

/* ── ÇİZİM ARTIK BURADA DEĞİL ──
   Sefer yolları ve ordu işaretçileri harita.js tarafından ZEMİNLE
   AYNI KAREDE canvas'a çiziliyor (cizSeferler).

   NEDEN TAŞINDI: bu dosya kendi requestAnimationFrame döngüsünü
   döndürüyordu. Her karede SVG yolu yeniden hesaplanıyor, DOM'da
   işaretçi aranıyor, stil yazılıyordu — üstelik haritanın kendi
   çizimiyle AYRI zamanlarda. İki döngü aynı anda dönünce hem kare
   hızı düşüyor hem de çizgi haritadan bir kare geride kalıp
   kaydırma sırasında kayıyordu ("çizgi ekranı oynatırken kayıyor").

   Artık tek döngü var: harita.js çizerken sefer verisini de okur.
   Kayma matematiksel olarak imkânsız — ikisi aynı pan/zoom
   değerini aynı karede kullanıyor.

   Bu işlev korunuyor çünkü kod içinde birçok yerden çağrılıyor;
   yaptığı iş yalnız haritadan yeni bir kare istemek. */
function dongu() {
  /* Eski sürümden kalan SVG/DOM artıkları sayfada durabilir
     (önbellekten açılan sekme). Bir kez süpürülür. */
  if (!dongu._suprldu) {
    dongu._suprldu = true;
    try {
      const eskiKat = document.getElementById("seferKatman");
      if (eskiKat && eskiKat.parentNode) eskiKat.parentNode.removeChild(eskiKat);
      document.querySelectorAll(".sefer-ordu").forEach(el => el.remove());
    } catch (e) {}
  }
  /* ÜST katman istenir, zemin DEĞİL. cizIste zemini yeniden
     çizdirir; sefer animasyonu için o çok pahalı. */
  try {
    if (window.HARITA && HARITA.cizUstIste) HARITA.cizUstIste();
  } catch (e) {}
}
function temizle() {
  if (_yolGrup) _yolGrup.innerHTML = "";
  if (_svg && _svg.parentNode) _svg.parentNode.removeChild(_svg);
  document.querySelectorAll(".sefer-ordu").forEach(el => el.remove());
}

/* ESKİ SVG ÇİZİMİ — ARTIK ÇAĞRILMIYOR.
   harita.js/cizSeferler onun yerini aldı. Gövdesi silinmedi ki
   canvas yolunda bir aksilik çıkarsa karşılaştırma yapılabilsin;
   ama hiçbir yerden çağrılmıyor. */
function _eskiSvgCizimi(liste) {
  if (!katmaniHazirla()) return;
  const mapEl = document.getElementById("battleMap");
  const bk = benKey();
  const gorulen = new Set();

  liste.forEach(({ id, s }) => {
    const ev = evre(s);
    if (ev.bitti && ev.ad === "donus") return;
    if (typeof ev.ax !== "number" || typeof ev.bx !== "number") return;

    const a = ekran(ev.ax, ev.ay);
    const b = ekran(ev.bx, ev.by);
    /* YAY=0 → düz çizgi. Kavis istenirse kontrol noktası kalkar. */
    const c = { x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * AYAR.YAY };
    const u = 1 - ev.p;
    const nokta = { x: u * u * a.x + 2 * u * ev.p * c.x + ev.p * ev.p * b.x,
                    y: u * u * a.y + 2 * u * ev.p * c.y + ev.p * ev.p * b.y };

    const benim  = s.sahip === bk;
    const banaMi = s.tur === "kale" && s.hedefKey === bk;
    const renk = banaMi ? "#ff5a4a" : benim ? "#5ad2ff" : "#e0b24a";
    gorulen.add(id);

    let yol = _yolGrup.querySelector('[data-sefer="' + id + '"]');
    if (!yol) {
      yol = document.createElementNS(NS, "path");
      yol.setAttribute("data-sefer", id);
      yol.setAttribute("fill", "none");
      yol.setAttribute("stroke-linecap", "round");
      yol.setAttribute("stroke-dasharray", "10 12");
      _yolGrup.appendChild(yol);
    }
    yol.setAttribute("d", `M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`);
    yol.setAttribute("stroke", renk);
    yol.setAttribute("stroke-width", benim ? 3 : 2);
    yol.setAttribute("opacity", benim ? 0.9 : 0.55);
    yol.setAttribute("stroke-dashoffset", String(-((Date.now() / 45) % 22)));

    let ordu = mapEl.querySelector('.sefer-ordu[data-sefer="' + id + '"]');
    if (!ordu) {
      ordu = document.createElement("div");
      ordu.className = "sefer-ordu";
      ordu.dataset.sefer = id;
      ordu.innerHTML = '<span class="sefer-ordu-ikon">⚔️</span><span class="sefer-ordu-ad"></span>';
      mapEl.appendChild(ordu);
    }
    if (ordu.parentNode !== mapEl) mapEl.appendChild(ordu);
    ordu.style.left = nokta.x + "px";
    ordu.style.top  = nokta.y + "px";
    ordu.style.setProperty("--sefer-renk", renk);
    ordu.classList.toggle("sefer-donus", ev.ad === "donus");
    /* ── ARAZİDE TOPLARKEN: SADECE İSİM ──
       Ordu arazinin üstünde DURUYOR. Oraya kılıç ikonu + geri sayım
       baloncuğu basınca düğümün kendi görseli ve adı okunmaz oluyor.
       Toplarken işaretçi yalnızca OYUNCU ADI'na iner:
         kendim  → altın
         başkası → kırmızı (düşman olduğu bir bakışta anlaşılsın)
       Süre zaten sol üstteki sefer listesinde yazıyor.

       Yürürken eski davranış korunur: kılıç + kalan süre. Orada
       üst üste binen bir şey yok ve ikisi de bilgi taşıyor. */
    const topluyor = (ev.ad === "topla");
    ordu.classList.toggle("sefer-topluyor", topluyor);
    ordu.classList.toggle("sefer-benim", benim);

    const ikonEl = ordu.querySelector(".sefer-ordu-ikon");
    if (ikonEl) ikonEl.style.display = topluyor ? "none" : "";

    const adEl = ordu.querySelector(".sefer-ordu-ad");
    if (adEl) {
      if (topluyor) {
        adEl.textContent = benim
          ? ((typeof currentUsername === "string" && currentUsername) ? currentUsername : "Ordun")
          : (s.sahipAd || "Düşman");
      } else {
        adEl.textContent = benim ? fmtSure(ev.kalanMs) : (s.sahipAd || "");
      }
    }
  });

  _yolGrup.querySelectorAll("[data-sefer]").forEach(el => {
    if (!gorulen.has(el.dataset.sefer)) el.remove();
  });
  document.querySelectorAll(".sefer-ordu").forEach(el => {
    if (!gorulen.has(el.dataset.sefer)) el.remove();
  });
}

/* ═══════════════════════════════════════════════════════════
   15) SOL ÜST SAYAÇ
   ═══════════════════════════════════════════════════════════ */
/* ── HUD NEREYE EKLENİR ───────────────────────────────────────
   ÖNEMLİ: kutu doğrudan <body>'ye ekleniyordu, paneller ise
   #appScreen'in İÇİNDE. İkisi ayrı yığın (stacking) dallarında
   olduğu için panelin z-index'i kutuyu örtmüyordu; z-index'i 120'ye
   çıkarmak bile yetmedi, çünkü karşılaştırma panelin kendi
   z-index'iyle değil #appScreen'inkiyle yapılıyordu. Kahraman
   ekranının kutuyu örtmesinin sebebi de buydu: o da body'ye ekli
   (heroes.js, z-index:400) — yani kutuyla AYNI dalda.

   Çözüm: kutuyu da #appScreen'in içine koy. Artık panellerle aynı
   dalda ve z-index:40 < 50 olduğu için panel açılınca kendiliğinden
   arkada kalır. Kutu GİZLENMEZ, sadece arkaya düşer. */
function hudEl() {
  const kap = document.getElementById("appScreen") || document.body;
  let el = document.getElementById("seferHud");
  if (!el) { el = document.createElement("div"); el.id = "seferHud"; }
  if (el.parentElement !== kap) kap.appendChild(el);
  return el;
}
function hudCiz() {
  const el = hudEl();
  const liste = benimkiler();
  if (!liste.length) { el.style.display = "none"; el.innerHTML = ""; return; }

  const wrap = document.getElementById("battleMapWrap");
  el.style.display = (wrap && wrap.style.display !== "none") ? "flex" : "none";

  /* TEK SATIR: süre · hedef · hızlandırma simgesi.
     Kutu BÜTÜN olarak tek bağlantıdır — içindeki ⏩ bir DÜĞME DEĞİL,
     sadece simge. Nereye dokunulursa dokunulsun aynı pencere açılır. */
  el.innerHTML = liste.map((x, i) => {
    const ev = evre(x.s);
    const yuzde = Math.round(Math.max(0, Math.min(1, ev.p)) * 100);
    return `<div class="sefer-satir" data-sefer="${x.id}">
      <span class="sefer-dolgu" style="width:${yuzde}%"></span>
      <span class="sefer-sure">${fmtSure(ev.kalanMs)}</span>
      <span class="sefer-hedef">${String(x.s.hedefAd || "").slice(0, 10)}</span>
      <span class="sefer-hiz" aria-hidden="true">⏩</span>
    </div>`;
  }).join("");

  el.querySelectorAll(".sefer-satir").forEach(row => {
    const f = () => satirTiklandi(row.dataset.sefer);
    if (typeof bindTap === "function") bindTap(row, f); else row.onclick = f;
  });
}

/* Kutucuğun TEK bağlantısı: her zaman HIZLANDIR penceresi. */
function satirTiklandi(id) {
  if (!_yerel[id]) return;
  hizlandirSor(id);
}

function geriCagirSor(id) {
  const s = _yerel[id];
  if (!s) return;
  if (s.durum === "donus") { toast("Ordu zaten dönüş yolunda."); return; }
  onayPenceresi("GERİ ÇAĞIR",
    `<b>${String(s.hedefAd || "")}</b> üzerine giden <b>${toplam(s.birlikler || {})}</b> birliğin geri çağrılsın mı?` +
    `<br><span class="sefer-onay-not">Ordu bulunduğu noktadan yürüyerek dönecek; gittiği yol kadar süre alır.</span>`,
    "Geri Çağır", () => geriCagir(id));
}

function fmtSayi(n) {
  return (typeof fmt === "function") ? fmt(n) : String(n);
}

/* ── ÇANTADAKİ HIZLANDIRMA ÜRÜNLERİ ──
   Mağazadan alınan "İntikal Hızlandırma %25/%50" envantere düşer.
   Oranı ürünün ADINDAN değil magaza.js'teki tanımından okuruz;
   fiyat/oran orada değişirse burası kendiliğinden uyar. */
const HIZ_URUNLERI = ["İntikal Hızlandırma %25", "İntikal Hızlandırma %50"];

function urunOrani(ad) {
  try {
    const u = (typeof shopItems !== "undefined" ? shopItems : []).find(x => x && x.name === ad);
    if (u && typeof u.hizOran === "number") return u.hizOran;
  } catch (e) {}
  const m = String(ad).match(/%(\d+)/);          /* yedek: addan oku */
  return m ? (parseInt(m[1], 10) / 100) : 0;
}
/* Ürünün görseli de magaza.js'ten okunur — dosya adı burada
   ikinci kez yazılmaz. Görsel yoksa çanta emojisine düşer. */
function urunGorseli(ad) {
  try {
    const u = (typeof shopItems !== "undefined" ? shopItems : []).find(x => x && x.name === ad);
    if (u && u.gorsel) return u.gorsel;
  } catch (e) {}
  return "";
}
function cantada(ad) {
  return (typeof state !== "undefined" && state && state.inventory)
    ? (state.inventory[ad] || 0) : 0;
}
/* Çantadaki hızlandırma ürünleri, pencerede SEÇİLEBİLİR KUTUCUK olarak.
   Görsel olduğu gibi kutuyu doldurur, adet köşede rozet olur. */
function cantaKutulari() {
  return HIZ_URUNLERI.map(ad => {
    const n = cantada(ad);
    if (n <= 0) return null;
    return { ad: ad, gorsel: urunGorseli(ad), adet: n,
             oran: Math.round(urunOrani(ad) * 100) };
  }).filter(Boolean);
}

/* İntikal kutucuğunun TEK penceresi. Üstte çantadaki ürün kutucukları,
   altta küçük düğmeler: Geri Çağır · Kullan · elmasla hızlandır. */
function hizlandirSor(id) {
  const s = _yerel[id];
  if (!s) return;

  onayPenceresi("", "",
    `${fmtSayi(AYAR.HIZ_BEDEL)} 💎`,
    () => { hizlandir(id); seferBittiyseKapat(id); },
    { kutular: cantaKutulari(),
      kullanFn: (ad) => urunleHizlandir(id, ad),
      kapatX: true, solKirmizi: true,
      solEtiket: "Geri Çağır", solFn: () => geriCagirSor(id), kalici: true });
}

/* Sefer varmış/silinmişse açık kalan pencereyi kapat. */
function seferBittiyseKapat(id) {
  setTimeout(() => {
    if (_yerel[id]) return;
    const m = document.getElementById("seferOnayModal");
    if (m) m.remove();
  }, 60);
}

/* Ürünle hızlandırma: elmas ALINMAZ, çantadan bir adet düşer. */
function urunleHizlandir(id, ad) {
  if (cantada(ad) <= 0) { toast("Çantanda kalmamış."); return; }
  const oran = urunOrani(ad);
  if (oran <= 0) { toast("Ürün tanımı okunamadı."); return; }

  if (!sureyiKis(id, oran)) return;

  state.inventory[ad] = cantada(ad) - 1;
  if (state.inventory[ad] <= 0) delete state.inventory[ad];
  ["renderInventory", "persistCurrentState"].forEach(f => {
    if (typeof window[f] === "function") { try { window[f](); } catch (e) {} }
  });
  toast(`🎒 ${ad} kullanıldı.`, 3500);
}

/* ═══════════════════════════════════════════════════════════
   15c) HIZLANDIRMA
   Süre alanlarına DOKUNULMAZ; yalnız evrenin BAŞLANGIÇ damgası
   geriye çekilir. Böylece kalan süre kısalır ama toplam süre,
   ilerleme oranı ve konum hesabı aynı formülle çalışmaya devam
   eder — ikinci bir zaman hesabı doğmaz.
   ═══════════════════════════════════════════════════════════ */
/* Süre kısaltmanın TEK GÖVDESİ — elmasla da ürünle de burası
   çalışır. Süre alanlarına dokunulmaz, yalnız evrenin başlangıç
   damgası geriye çekilir. true dönerse iş oldu. */
function sureyiKis(id, oran) {
  const s = _yerel[id];
  if (!s) return false;

  const ev = evre(s);
  if (ev.kalanMs <= 1000) { toast("Bu sefer zaten varmak üzere."); return false; }

  const kazanc = Math.round(ev.kalanMs * oran);
  if (ev.ad === "topla")      s.toplaAt -= kazanc;
  else if (ev.ad === "donus") s.donusAt -= kazanc;
  else                        s.gidisAt -= kazanc;

  seferYaz(id, s);
  toast(`⚡ Sefer hızlandı — ${fmtSure(kazanc)} kısaldı.`, 3500);
  hudCiz();
  dongu();
  return true;
}

/* Elmasla hızlandırma */
function hizlandir(id) {
  const s = _yerel[id];
  if (!s) return;

  const bedel = AYAR.HIZ_BEDEL;
  const elmas = (typeof state !== "undefined" && state) ? (state.diamonds || 0) : 0;
  if (elmas < bedel) {
    toast(`Yetersiz elmas — hızlandırma ${fmtSayi(bedel)} 💎.`, 4000);
    return;
  }

  if (!sureyiKis(id, AYAR.HIZ_ORANI)) return;   /* iş olmadıysa elmas gitmez */

  state.diamonds = elmas - bedel;
  ["renderDiamonds", "updateShopButtons", "persistCurrentState"].forEach(f => {
    if (typeof window[f] === "function") { try { window[f](); } catch (e) {} }
  });
}

/* ═══════════════════════════════════════════════════════════
   16) ONAY PENCERESİ — gövde oyunun kendi .overlay-card'ı
   ═══════════════════════════════════════════════════════════ */
function onayPenceresi(baslik, mesajHTML, onayEtiket, cb, sec) {
  const eski = document.getElementById("seferOnayModal");
  if (eski) eski.remove();

  sec = sec || {};
  const kutuListe = Array.isArray(sec.kutular) ? sec.kutular : [];
  const kullanFn  = (typeof sec.kullanFn === "function") ? sec.kullanFn : null;
  const solEtiket = sec.solEtiket || "Vazgeç";
  const solFn     = (typeof sec.solFn === "function") ? sec.solFn : null;

  const kutuHTML = kutuListe.map((k, i) =>
    `<button class="som-kutu${i === 0 ? " secili" : ""}" type="button" data-kutu="${i}">` +
      (k.gorsel ? `<img src="${k.gorsel}" alt="">` : `<span class="som-kutu-emoji">🎒</span>`) +
      `<span class="som-kutu-adet">${k.adet}</span>` +
    `</button>`
  ).join("");

  const kok = document.createElement("div");
  kok.id = "seferOnayModal";
  kok.className = "sefer-onay-modal";
  kok.innerHTML = `
    <div class="overlay-card som-card${baslik ? "" : " som-card-sade"}">
      ${sec.kapatX ? `<button class="som-x" type="button" aria-label="Kapat">✕</button>` : ""}
      ${baslik ? `<h2 class="som-title">${baslik}</h2>` : ""}
      ${mesajHTML ? `<div class="som-msg">${mesajHTML}</div>` : ""}
      ${kutuHTML ? `<div class="som-kutular">${kutuHTML}</div>` : ""}
      <div class="som-actions">
        <button class="som-btn ${sec.solKirmizi ? "som-btn-kirmizi" : "som-btn-no"}" type="button">${solEtiket}</button>
        ${kutuHTML && kullanFn ? `<button class="som-btn som-btn-kullan" type="button">Kullan</button>` : ""}
        <button class="som-btn som-btn-yes" type="button">${onayEtiket}</button>
      </div>
    </div>`;
  document.body.appendChild(kok);

  /* Hayalet tıklama: dokunuşla açılan pencere click'i yiyordu. */
  kok.style.pointerEvents = "none";
  setTimeout(() => { kok.style.pointerEvents = ""; }, 350);

  const kapat = () => kok.remove();
  /* kapatMi=false: pencere AÇIK kalır — arka arkaya hızlandırmak için. */
  const cagir = (f, kapatMi) => {
    if (kapatMi !== false) kapat();
    try { f(); } catch (e) { console.error(e); }
  };

  let secili = 0;
  kok.querySelectorAll("[data-kutu]").forEach(b => {
    b.onclick = () => {
      secili = parseInt(b.dataset.kutu, 10);
      kok.querySelectorAll("[data-kutu]").forEach(x => x.classList.remove("secili"));
      b.classList.add("secili");
    };
  });

  const kullanBtn = kok.querySelector(".som-btn-kullan");
  if (kullanBtn) kullanBtn.onclick = () => {
    const k = kutuListe[secili];
    if (k) cagir(() => kullanFn(k.ad), !sec.kalici); else kapat();
  };

  const xBtn = kok.querySelector(".som-x");
  if (xBtn) xBtn.onclick = kapat;

  kok.querySelector(".som-btn-no, .som-btn-kirmizi").onclick = () => { solFn ? cagir(solFn) : kapat(); };
  kok.querySelector(".som-btn-yes").onclick = () => cagir(cb, !sec.kalici);
  kok.addEventListener("click", e => { if (e.target === kok) kapat(); });
}

/* ═══════════════════════════════════════════════════════════
   17) backToMap KİLİDİ
   PvE'nin galibiyet dalı 4.2 sn sonra backToMap() çağırıp
   haritayı zorla açıyordu. Fonksiyon değiştirilmiyor, sarılıyor.
   ═══════════════════════════════════════════════════════════ */
(function backToMapSar() {
  if (typeof window.backToMap !== "function") return;
  const eski = window.backToMap;
  if (eski._seferSarildi) return;
  const yeni = function () {
    if (Date.now() < _panelKilit) return;
    return eski.apply(this, arguments);
  };
  yeni._seferSarildi = true;
  window.backToMap = yeni;
})();

/* ═══════════════════════════════════════════════════════════
   18) STİL
   ═══════════════════════════════════════════════════════════ */
(function stil() {
  if (document.getElementById("seferStil")) return;
  const st = document.createElement("style");
  st.id = "seferStil";
  st.textContent = `
.sefer-ordu{
  position:absolute; transform:translate(-50%,-50%);
  display:flex; flex-direction:column; align-items:center; gap:1px;
  pointer-events:none; z-index:900; will-change:left,top;
}
.sefer-ordu-ikon{
  font-size:19px; line-height:1;
  filter:drop-shadow(0 0 6px var(--sefer-renk, #5ad2ff));
  animation:seferSalin 1.1s ease-in-out infinite;
}
.sefer-ordu.sefer-donus .sefer-ordu-ikon{ opacity:.7; }
.sefer-ordu-ad{
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800;
  font-size:10px; line-height:1; color:#fff; white-space:nowrap;
  padding:1px 5px; border-radius:7px;
  background:rgba(8,16,28,.72);
  border:1px solid var(--sefer-renk, #5ad2ff);
  text-shadow:0 1px 2px rgba(0,0,0,.7);
}
@keyframes seferSalin{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-3px); } }

/* Toplama halindeki işaretçi — yalnız ad. Düğümün altına otursun,
   üstünü kapatmasın. */
.sefer-ordu.sefer-topluyor{ transform:translate(-50%, 14px); }
.sefer-ordu.sefer-topluyor .sefer-ordu-ad{
  font-size:11px; font-weight:800; padding:2px 8px;
  color:#e2585c; border-color:rgba(226,88,92,.65);
  background:rgba(8,12,18,.88);
}
.sefer-ordu.sefer-topluyor.sefer-benim .sefer-ordu-ad{
  color:#e9cf7c; border-color:rgba(212,175,55,.65);
}

#seferHud{
  position:fixed; left:8px; top:96px; z-index:40;
  display:flex; flex-direction:column; gap:5px;
}
/* TEK SATIR ve İNCE — oyunun mavi teması (mağaza/panel şablonu).
   Eski hâli üç satırdı, koyu laciverttti ve haritanın köşesini
   kapatıyordu. */
/* Zemin YARI SAYDAM (%50) ama renk oyunun kendi mavisi — aynı
   #2fb0ee → #0e6fc0 geçişi, sadece alfası düşük. Böylece harita
   altından görünür, kutu haritayı boğmaz. */
.sefer-satir{
  /* SABİT GENİŞLİK: süre "15s" ile "02.05d" arasında gidip gelirken
     kutunun her saniye büyüyüp küçülmesini engeller.
     3B YOK: çerçeve ve inset parlaklık kaldırıldı, tek yumuşak gölge. */
  width:124px; box-sizing:border-box;
  position:relative; overflow:hidden;
  display:flex; align-items:center; gap:5px;
  padding:3px 7px; border-radius:9px;
  background:linear-gradient(180deg, rgba(47,176,238,.5), rgba(14,111,192,.5));
  border:none;
  box-shadow:0 2px 6px rgba(0,20,45,.3);
  font-family:'Baloo 2','Nunito',sans-serif; color:#fff; cursor:pointer;
  text-shadow:0 1px 2px rgba(0,20,45,.55);
  -webkit-tap-highlight-color:transparent;
  transition:transform .09s ease, filter .09s ease;
}
.sefer-satir:active{ transform:scale(.96); filter:brightness(.93); }
/* Yol alındıkça soldan sağa dolan yeşil şerit — ayrı süre çubuğu
   koymamak için kutunun KENDİ zemininde. Metinler üstünde kalır. */
.sefer-dolgu{
  position:absolute; left:0; top:0; bottom:0; z-index:0;
  background:linear-gradient(180deg, rgba(88,214,120,.75), rgba(38,158,84,.75));
  pointer-events:none;
}
.sefer-sure, .sefer-hedef, .sefer-hiz{ position:relative; z-index:1; }
.sefer-sure{ flex:0 0 42px; font-size:12px; font-weight:800; letter-spacing:.2px; }
.sefer-hedef{ flex:1 1 auto; min-width:0; font-size:12px; font-weight:700; opacity:.85;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
/* Hızlandırma SİMGESİ — düğme değil, zemini/çerçevesi yok. */
.sefer-hiz{
  flex:0 0 auto; font-size:13px; line-height:1; opacity:.95;
  pointer-events:none;
}

.sefer-onay-modal{
  /* Ekranın ALTINDA açılır, arka plan KARARMAZ. */
  position:fixed; inset:0; z-index:9999;
  display:flex; align-items:flex-end; justify-content:center;
  background:transparent; padding:0 18px 96px;
}
.sefer-onay-modal .som-card-sade{ padding-top:34px; }
/* Sağ üst kapatma — küçük, çerçevesiz. */
.sefer-onay-modal .som-x{
  position:absolute; right:9px; top:8px; z-index:2;
  width:28px; height:28px; padding:0; border:none; outline:none; border-radius:9px;
  background:rgba(10,28,52,.45); color:#eaf6ff; cursor:pointer;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:14px; line-height:28px;
  -webkit-tap-highlight-color:transparent;
  transition:transform .09s ease, filter .09s ease;
}
.sefer-onay-modal .som-x:active{ transform:scale(.96); filter:brightness(.93); }
.sefer-onay-modal .som-card{ max-width:300px; border-radius:18px; padding:16px 14px;
  border:1px solid rgba(190,240,255,.14); box-shadow:0 2px 6px rgba(0,20,45,.3); }
/* .overlay-card h2 display:flex — text-align burada işe yaramaz */
.sefer-onay-modal .som-title{
  justify-content:center; font-size:20px; letter-spacing:.2px;
  text-transform:none; padding-right:0; margin:0 0 10px;
}
.sefer-onay-modal .som-msg{
  font-family:'Baloo 2','Nunito',sans-serif; font-size:14px;
  line-height:1.4; text-align:center; margin:0 0 12px;
}
.sefer-onay-modal .sefer-onay-not{ font-size:12px; opacity:.75; }
.sefer-onay-modal .som-actions{ display:flex; gap:8px; justify-content:center; }
/* Düğmeler: çerçevesiz, kalın alt kenar yok, basma tepkisi zıplama değil. */
.sefer-onay-modal .som-btn{
  flex:0 1 auto; min-width:86px; padding:7px 10px; border-radius:10px; cursor:pointer;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:13px;
  white-space:nowrap;
  color:#fff; border:none; outline:none;
  box-shadow:0 2px 6px rgba(0,20,45,.3);
  -webkit-tap-highlight-color:transparent;
  transition:transform .09s ease, filter .09s ease;
}
.sefer-onay-modal .som-btn:active{ transform:scale(.96); filter:brightness(.93); }
.sefer-onay-modal .som-actions-dikey{ flex-direction:column; margin-bottom:8px; }
.sefer-onay-modal .som-actions-dikey .som-btn{ flex:1 1 auto; width:100%; }
.sefer-onay-modal .som-btn-canta{ background:linear-gradient(180deg,#f0c34f,#d1901a); }
.sefer-onay-modal .som-btn-kullan{ background:linear-gradient(180deg,#f0c34f,#d1901a); }
/* Çanta kutucukları: görsel kutuyu doldurur, adet köşede. */
.sefer-onay-modal .som-kutular{
  display:flex; gap:10px; justify-content:center; margin:0 0 12px;
}
.sefer-onay-modal .som-kutu{
  position:relative; width:62px; height:62px; padding:0;
  border:none; outline:none; border-radius:12px; cursor:pointer;
  background:rgba(10,28,52,.55); overflow:hidden;
  box-shadow:0 2px 6px rgba(0,20,45,.3);
  -webkit-tap-highlight-color:transparent;
  transition:transform .09s ease, filter .09s ease;
}
.sefer-onay-modal .som-kutu:active{ transform:scale(.96); filter:brightness(.93); }
.sefer-onay-modal .som-kutu.secili{ box-shadow:0 0 0 2px #f5d271, 0 2px 6px rgba(0,20,45,.3); }
.sefer-onay-modal .som-kutu img{ width:100%; height:100%; object-fit:cover; display:block; }
.sefer-onay-modal .som-kutu-emoji{ font-size:26px; line-height:62px; }
.sefer-onay-modal .som-kutu-adet{
  position:absolute; right:3px; bottom:2px;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:12px; color:#fff;
  text-shadow:0 1px 2px rgba(0,20,45,.9);
}
/* Çanta düğmesindeki ürün görseli. Düğme basılınca görsel de
   düğmeyle birlikte küçülür — ayrı bir tepki kuralı gerekmez. */
.sefer-onay-modal .som-actions-dikey .som-btn-canta{
  display:flex; align-items:center; justify-content:center; gap:7px;
}
.sefer-onay-modal .som-canta-img{
  width:26px; height:26px; object-fit:contain; flex-shrink:0;
  filter:drop-shadow(0 1px 2px rgba(0,20,45,.35));
}
.sefer-onay-modal .som-btn-no{ background:linear-gradient(180deg,#5a6b80,#3b4859); }
.sefer-onay-modal .som-btn-kirmizi{ background:linear-gradient(180deg,#f0645c,#c0342c); }
.sefer-onay-modal .som-btn-yes{ background:linear-gradient(180deg,#4fd8ff,#1fa3ea); }
.sefer-onay-modal .som-btn:hover{ filter:brightness(1.08); }
`;
  document.head.appendChild(st);
})();

/* ═══════════════════════════════════════════════════════════
   19) ÇALIŞTIR + TEŞHİS
   ═══════════════════════════════════════════════════════════ */
setInterval(tik, 1000);

/* Konsola `SEFER.tani()` yaz: nerede takıldığını söyler. */
function tani() {
  const r = {
    oturum: benKey(),
    firebase: fbHazir(),
    bulutHata: _bulutHata,
    dinleyici: !!_ref,
    kendiSeferSayisi: benimkiler().length,
    baskalarininSeferi: Object.keys(_uzak).length,
    haritaEkranKonumu: !!(window.HARITA && window.HARITA.ekranKonumu),
    pvpKapilari: !!(window.PVP && window.PVP.savasiCalistir && window.PVP.savunanKur),
    hastaneSarmali: !!_gercekHastane,
    seferler: _yerel,
  };
  console.log("[sefer] TANI", r);
  return r;
}

/* Kayıp birlikleri elle geri koymak için (ilk sürümde kaybolanlar):
   SEFER.iadeEt({knight:100, soldier:50}) */
function iadeEt(b) {
  birlikEkle(b || {});
  toast("Birlikler kaleye eklendi.");
  return (typeof state !== "undefined") ? state.troops : null;
}

window.SEFER = {
  SURUM: "canvas-11",          /* rozet bunu gösterir; yükleme doğrulaması */
  AYAR: AYAR, tani: tani, iadeEt: iadeEt,
  liste: hepsi, benimkiler: benimkiler,
  /* harita.js canvas çizimi için — evre ve süre biçimi tek yerde
     kalsın, oraya kopyalanmasın. */
  evre: evre, fmtSure: fmtSure,
  geriCagir: geriCagir, baslat: seferBaslat,
  toplamaBaslat: toplamaBaslat,
  orduKapasitesi: orduKapasitesi,
};

})();
