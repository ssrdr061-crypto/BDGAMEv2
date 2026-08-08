/* ============================================================
   sefer.js — BİRLİK SEVKİYATI (İNTİKAL)
   ------------------------------------------------------------
   Saldırılar artık ANINDA çözülmez: ordu haritada yürür, hedefe
   varır, çarpışır ve geri döner.

   Araya girdiği tek yer SALDIR düğmesidir; onu da `document`
   üzerinde CAPTURE aşamasında yakalar. Capture, hedef elemanın
   kendi dinleyicilerinden ÖNCE çalışır — böylece pvp.js'in ve
   index.html'in mevcut dinleyicileri hiç tetiklenmez.

   KİLİTLENME BİLİNÇLİ: bir hata olursa ya da hedefin koordinatı
   çözülemezse SALDIR yine de yutulur ve toast basılır. Sessizce
   eski anlık savaşa DÜŞMEZ — geliştirme sırasında "bazen yürüyor
   bazen ışınlanıyor" belirsizliği hatayı gizler.

   Varışta savaşı yine OYUNUN KENDİ fonksiyonları çözer:
     - kale    → window.PVP.savasiCalistir()   (pvp.js)
     - canavar → startBattle()                 (index.html)
   Savaş matematiği burada KOPYALANMAZ.

   DÖNEN ORDUNUN MEVCUDU TAHMİN DEĞİL:
     - ölen   → window.PVP.sonSonuc.killed  (pvp.js yayınlar)
     - yaralı → sendWoundedToHospital'a giden liste (aşağıda
                geçici olarak yakalanır)
   Yaralılar savaş anında hastaneye GİRMEZ; orduyla birlikte eve
   yürür, kaleye varınca hastaneye düşer.

   VERİ: Firebase'de "seferler/{id}". Herkes okur, yalnız sahibi
   yazar. Kayıtta `gidisAt` + `sureMs` durur; konum bunlardan
   HESAPLANIR, sürekli yazılmaz. Sonradan bağlanan oyuncu orduyu
   yolun ortasında görür (missile.js'in pvp_launches deseni).
   ============================================================ */
(function () {
"use strict";

/* ═══════════════════════════════════════════════════════════
   1) AYARLAR — tek yerden değiştir
   ═══════════════════════════════════════════════════════════ */
const AYAR = {
  KOK: "seferler",          /* Firebase düğümü */
  SANIYE_PER_KARO: 25,      /* 1 karo yürüyüş süresi (sn) */
  MIN_SURE_MS: 15000,       /* en kısa sefer */
  CARPISMA_BEKLE_MS: 2000,  /* hedefe varınca savaştan önceki duraklama */
  MAX_SEFER: 3,             /* aynı anda en fazla kaç intikal */
  KAYIT_OMRU_MS: 2 * 60 * 60 * 1000, /* bu kadar eskimiş kayıt çöptür */
  YAY: 0.12,                /* yolun kavis miktarı (0 = düz çizgi) */
};

/* selectedTroopsForBattle ile AYNI sıra. pvp.js'teki FRONT_ORDER
   dışa açık değil, o yüzden burada tekrar yazıldı — birim listesi
   değişirse burası da değişmeli. */
const BIRLIKLER = ["knight", "soldier", "robot"];

/* ═══════════════════════════════════════════════════════════
   2) İÇ DURUM
   ═══════════════════════════════════════════════════════════ */
let seferler    = {};        /* Firebase'den gelen TÜM seferler */
let _ref        = null;
let _benKey     = null;
let _isleniyor  = new Set(); /* aynı sefer iki kez çözülmesin */
let _kaleKonum  = null;      /* ışınlanma denetimi */
let _sonKapi    = 0;         /* SALDIR çift tetiklemesini yut */
let _panelKilit = 0;         /* savaş çözülürken backToMap'i nötrle */
let _rafId      = null;
let _svg = null, _yolGrup = null;

/* Yaralı yakalama */
let _yaraliYakala = false;
let _yakalanan    = null;

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

/* "05.32d" biçimi */
function fmtSure(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const dk = Math.floor(t / 60), sn = t % 60;
  return String(dk).padStart(2, "0") + "." + String(sn).padStart(2, "0") + "d";
}

function sureHesapla(fx, fy, tx, ty) {
  const d = Math.hypot(tx - fx, ty - fy);
  return Math.max(AYAR.MIN_SURE_MS, Math.round(d * AYAR.SANIYE_PER_KARO * 1000));
}

/* Bir seferin ŞU ANKİ evresi. Konum kayıttan değil saatten çıkar. */
function evre(s) {
  const now = Date.now();
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

function hepsi() {
  return Object.keys(seferler)
    .map(id => ({ id, s: seferler[id] }))
    .filter(x => x.s && typeof x.s.gidisAt === "number" && typeof x.s.sureMs === "number");
}
function benimkiler() {
  const k = benKey();
  return k ? hepsi().filter(x => x.s.sahip === k) : [];
}

/* ═══════════════════════════════════════════════════════════
   4) BİRLİK DEFTERİ
   Yola çıkan birlik kaleden DÜŞÜLÜR (başka sefere alınamaz,
   eğitim/hastane ekranlarında görünmez). Dönünce geri eklenir.
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
   5) YARALI YAKALAMA
   Savaş sırasında sendWoundedToHospital çağrısını geçici olarak
   kendine çeker. Yaralı hastaneye ANINDA girmez; listesi sefer
   kaydında eve taşınır ve varışta gerçek fonksiyona verilir.
   Fonksiyonun kendisi DEĞİŞTİRİLMEZ, sarılır.
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

/* {knight:[{severe:true}]} → {knight:2} */
function yaraliSayilari(liste) {
  const o = {};
  Object.keys(liste || {}).forEach(uid => {
    const v = liste[uid];
    o[uid] = Array.isArray(v) ? v.length : (Number(v) || 0);
  });
  return o;
}

/* ═══════════════════════════════════════════════════════════
   6) HEDEF ÇÖZÜMÜ
   ═══════════════════════════════════════════════════════════ */
function hedefBilgisi(e) {
  if (!e) return null;

  /* ── OYUNCU KALESİ ──
     buildDefender mapX/mapY'yi 0 yazıyor; koordinat otherCastles'ta.
     Bu yüzden isPlayer kontrolü mapX'ten ÖNCE gelmeli. */
  if (e.isPlayer) {
    const ad = String(e.name || "").toLowerCase();
    let kale = null;
    if (typeof otherCastles !== "undefined" && Array.isArray(otherCastles)) {
      const c = otherCastles.find(x => x && String(x.name || "").toLowerCase() === ad);
      if (c && c.castle && typeof c.castle.gx === "number") kale = c.castle;
    }
    if (!kale) return null;
    return {
      tur: "kale", ad: e.name,
      key: e.accKey || (typeof toFirebaseKey === "function" ? toFirebaseKey(ad) : null),
      gx: kale.gx, gy: kale.gy
    };
  }

  /* ── CANAVAR (PvE) ── mapX/mapY yüzde; harita.js ile aynı çevrim */
  if (typeof e.mapX === "number" && typeof e.mapY === "number") {
    return { tur: "canavar", ad: e.name, key: null,
             gx: (e.mapX / 100) * izgara(), gy: (e.mapY / 100) * izgara() };
  }

  /* ── KAYNAK NOKTASI ── henüz yok; gx/gy taşıyan bir hedef
     eklendiğinde sistem kendiliğinden çalışır. */
  if (typeof e.gx === "number" && typeof e.gy === "number") {
    return { tur: "kaynak", ad: e.name || "Kaynak", key: null, gx: e.gx, gy: e.gy };
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════
   7) SEFERİ BAŞLAT
   Her çıkış yolu SALDIR'ı yutar (kilitler). Eski anlık savaşa
   düşme yolu YOK — bkz. dosya başındaki not.
   ═══════════════════════════════════════════════════════════ */
function seferBaslat() {
  if (!fbHazir() || !benKey()) { toast("Bağlantı yok — sefer gönderilemiyor."); return; }
  if (typeof currentEnemy === "undefined" || !currentEnemy) { toast("Önce haritadan bir hedef seç."); return; }
  if (typeof state === "undefined" || !state.castle || typeof state.castle.gx !== "number") {
    toast("Önce kalen olmalı."); return;
  }

  const h = hedefBilgisi(currentEnemy);
  if (!h) { toast("Bu hedefin koordinatı çözülemedi — sefer gönderilemiyor."); return; }
  if (h.tur === "kale" && h.key === benKey()) { toast("Kendi kalene sefer düzenleyemezsin."); return; }
  if (benimkiler().length >= AYAR.MAX_SEFER) {
    toast(`Aynı anda en fazla ${AYAR.MAX_SEFER} intikal gönderebilirsin.`); return;
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

  const kayit = {
    sahip: benKey(),
    sahipAd: (typeof currentUsername === "string" ? currentUsername : "Oyuncu"),
    tur: h.tur, hedefAd: h.ad, hedefKey: h.key || null,
    fx: fx, fy: fy, tx: h.gx, ty: h.gy,
    sureMs: sureMs, gidisAt: Date.now(),
    durum: "gidis", iptal: false,
    birlikler: secili,
    komutanlar: (typeof selectedCommanders !== "undefined" && Array.isArray(selectedCommanders))
                  ? selectedCommanders.slice() : [],
  };

  /* Önce birlikleri kaleden düş, sonra kaydı yaz. Yazma patlarsa
     birlikleri geri koy — yoksa ordu buharlaşır. */
  birlikDus(secili);
  firebaseDb.ref(AYAR.KOK).push(kayit).catch(() => {
    birlikEkle(secili);
    toast("Sefer başlatılamadı (bağlantı hatası).");
  });

  toast(`⚔️ Ordun ${h.ad} üzerine yola çıktı — ${fmtSure(sureMs)}`);
  if (typeof backToMap === "function") backToMap();
}

/* ═══════════════════════════════════════════════════════════
   8) SALDIR DÜĞMESİNİ YAKALA (capture)
   ═══════════════════════════════════════════════════════════ */
function kapi(e) {
  const btn = e.target && e.target.closest ? e.target.closest("#battleBtn") : null;
  if (!btn) return;

  /* Düğme HER durumda yutulur: eski anlık savaş asla çalışmasın. */
  e.stopImmediatePropagation();
  e.preventDefault();

  /* pointerup + click art arda gelir; işi bir kez yap. */
  const now = Date.now();
  if (now - _sonKapi < 700) return;
  _sonKapi = now;

  try { seferBaslat(); }
  catch (err) {
    console.error("[sefer] başlatılamadı:", err);
    toast("Sefer başlatılamadı — konsola bak.");
  }
}
document.addEventListener("pointerup", kapi, true);
document.addEventListener("click",     kapi, true);

/* ═══════════════════════════════════════════════════════════
   9) ZAMAN MOTORU — varış, çarpışma, dönüş
   ═══════════════════════════════════════════════════════════ */
function tik() {
  if (!fbHazir()) return;
  const k = benKey();
  if (!k) return;
  if (_benKey !== k) { _benKey = k; _kaleKonum = null; dinle(); }

  isinlanmaDenetimi();

  benimkiler().forEach(({ id, s }) => {
    if (_isleniyor.has(id)) return;
    const ev = evre(s);

    /* Çöp kayıt: sahibi saatlerdir girmemiş olabilir */
    if (Date.now() - s.gidisAt > AYAR.KAYIT_OMRU_MS) { seferiBitir(id, s, true); return; }

    if (ev.ad === "gidis" && ev.bitti) { varisiIsle(id, s); return; }
    if (ev.ad === "donus" && ev.bitti) { seferiBitir(id, s); return; }
  });

  hudCiz();
}

/* Hedefe varıldı → kısa duraklama → savaş → dönüşe geç */
async function varisiIsle(id, s) {
  _isleniyor.add(id);
  try {
    await bekle(AYAR.CARPISMA_BEKLE_MS);

    const gonderilen = s.birlikler || {};

    /* Savaş kaybı bu birliklerden düşecek: yolcuları geçici olarak
       orduya kat. Savaştan sonra hayatta kalanlar tekrar ayrılır. */
    birlikEkle(gonderilen);

    _panelKilit = Date.now() + 12000;  /* savaş bitince panel zorla açılmasın */
    _yaraliYakala = true;              /* yaralılar hastaneye ŞİMDİ girmesin */
    _yakalanan = null;
    if (window.PVP) window.PVP.sonSonuc = null;

    if (!s.iptal) {
      if (s.tur === "kale")         await kaleSavasi(s);
      else if (s.tur === "canavar") await canavarSavasi(s);
      /* kaynak: henüz savaş yok, varıp döner */
    }

    _yaraliYakala = false;
    _panelKilit = 0;

    /* ── DÖNEN MEVCUT: TAHMİN YOK ──
       ölen  = pvp.js'in yayınladığı kesin sayı (PvE'de ölüm yok)
       yaralı = hastaneye gitmek üzere yakalanan listenin uzunluğu */
    const yaraliListe = _yakalanan || {};
    const yarali = yaraliSayilari(yaraliListe);
    const olen = (window.PVP && window.PVP.sonSonuc && window.PVP.sonSonuc.killed)
                   ? window.PVP.sonSonuc.killed : {};
    _yakalanan = null;

    const saglam = {};
    BIRLIKLER.forEach(u => {
      saglam[u] = Math.max(0, (gonderilen[u] || 0) - (olen[u] || 0) - (yarali[u] || 0));
    });

    /* Sağlamları tekrar yola çıkar. Ölen ve yaralılar savaş kodu
       tarafından zaten orduda düşüldü; net etki sıfır. */
    birlikDus(saglam);

    await firebaseDb.ref(AYAR.KOK + "/" + id).update({
      durum: "donus", donusAt: Date.now(), donusSureMs: s.sureMs,
      donusFx: s.tx, donusFy: s.ty,
      birlikler: saglam,
      yaralilar: temizVeri(yaraliListe)   /* eve varınca hastaneye girecek */
    });
  } catch (err) {
    console.error("[sefer] varış işlenemedi:", err);
    _yaraliYakala = false;
    _panelKilit = 0;
  }
  _isleniyor.delete(id);
}

/* Firebase undefined kabul etmez; boş nesne de yazılmaz. */
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

/* Kaleye vardı — SAVAŞI pvp.js çözer */
async function kaleSavasi(s) {
  if (!window.PVP || typeof window.PVP.savasiCalistir !== "function" ||
      typeof window.PVP.savunanKur !== "function") {
    console.error("[sefer] PVP.savasiCalistir / savunanKur yok — savaş atlandı");
    toast("Savaş çözülemedi (pvp.js güncel değil).");
    return;
  }
  const snap = await firebaseDb.ref("accounts/" + s.hedefKey).get();
  if (!snap.exists()) { toast(`${s.hedefAd} bulunamadı, ordun geri dönüyor.`); return; }

  const acc  = snap.val();
  const kale = (acc.state || {}).castle;

  /* SAVUNAN IŞINLANDIYSA: ordu boş araziye varır, çarpışma olmaz. */
  if (!kale || typeof kale.gx !== "number" ||
      Math.abs(kale.gx - s.tx) > 0.001 || Math.abs(kale.gy - s.ty) > 0.001) {
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

/* Canavara vardı — SAVAŞI index.html'in startBattle'ı çözer */
async function canavarSavasi(s) {
  if (typeof enemies === "undefined" || typeof startBattle !== "function") {
    toast("Savaş çözülemedi."); return;
  }
  const e = enemies.find(x => x && x.name === s.hedefAd);
  if (!e) { toast("Canavar yerinde yok, ordun geri dönüyor."); return; }
  if (typeof isEnemyActive === "function" && !isEnemyActive(e)) {
    toast(`${s.hedefAd} çoktan yenilmiş — ordun eli boş dönüyor.`); return;
  }
  currentEnemy = e;
  selectedTroopsForBattle = Object.assign({}, s.birlikler);
  if (Array.isArray(s.komutanlar) && typeof selectedCommanders !== "undefined") {
    selectedCommanders = s.komutanlar.slice();
  }
  await startBattle();
}

/* Kaleye döndü: sağlamlar orduya, yaralılar hastaneye */
function seferiBitir(id, s, sessiz) {
  _isleniyor.add(id);
  birlikEkle(s.birlikler || {});

  const yarali = s.yaralilar || null;
  if (yarali && _gercekHastane) {
    try { _gercekHastane(yarali); } catch (e) { console.error("[sefer] hastane:", e); }
    tazele();
  }

  if (!sessiz) {
    const n = toplam(s.birlikler || {});
    const y = toplam(yaraliSayilari(yarali || {}));
    let m = `🏰 Ordun kaleye döndü (${n} birlik)`;
    if (y > 0) m += ` — ${y} yaralı hastaneye alındı`;
    toast(m + ".", 4000);
  }

  firebaseDb.ref(AYAR.KOK + "/" + id).remove()
    .catch(() => {})
    .then(() => _isleniyor.delete(id));
}

/* ═══════════════════════════════════════════════════════════
   10) IŞINLANMA — kendi kalen taşınırsa seferler anında iptal
   doCastleMove IIFE içinde kapalı, ADIYLA yakalanamıyor; kale
   koordinatının değişmesi izleniyor.
   ═══════════════════════════════════════════════════════════ */
function isinlanmaDenetimi() {
  if (typeof state === "undefined" || !state.castle || typeof state.castle.gx !== "number") return;
  const simdi = { gx: state.castle.gx, gy: state.castle.gy };
  if (!_kaleKonum) { _kaleKonum = simdi; return; }          /* ilk okuma */
  if (_kaleKonum.gx === simdi.gx && _kaleKonum.gy === simdi.gy) return;

  _kaleKonum = simdi;
  const liste = benimkiler();
  if (!liste.length) return;

  liste.forEach(({ id, s }) => seferiBitir(id, s, true));
  toast("🌀 Işınlandın — yoldaki ordularının hepsi kaleye geri döndü.", 4000);
}

/* ═══════════════════════════════════════════════════════════
   11) GERİ ÇAĞIRMA — ordu bulunduğu noktadan yürüyerek döner
   ═══════════════════════════════════════════════════════════ */
function geriCagir(id) {
  const s = seferler[id];
  if (!s || s.sahip !== benKey()) return;
  if (s.durum === "donus") { toast("Bu ordu zaten dönüş yolunda."); return; }

  const now = Date.now();
  const gecen = Math.max(0, Math.min(now - s.gidisAt, s.sureMs));
  const p = s.sureMs > 0 ? gecen / s.sureMs : 1;

  firebaseDb.ref(AYAR.KOK + "/" + id).update({
    durum: "donus", iptal: true, donusAt: now,
    donusSureMs: Math.max(3000, gecen),
    donusFx: s.fx + (s.tx - s.fx) * p,
    donusFy: s.fy + (s.ty - s.fy) * p
  }).catch(() => toast("Geri çağrılamadı."));
  toast("↩️ Ordu geri çağrıldı.");
}

/* ═══════════════════════════════════════════════════════════
   12) FIREBASE DİNLEME
   ═══════════════════════════════════════════════════════════ */
function dinle() {
  if (!fbHazir() || _ref) return;
  _ref = firebaseDb.ref(AYAR.KOK);
  _ref.on("value", snap => {
    seferler = snap.val() || {};
    hudCiz();
    dongu();
  });
}

/* ═══════════════════════════════════════════════════════════
   13) ÇİZİM — akıcı yol + yürüyen ordu
   #battleMap'in içine ayrı bir SVG katmanı. renderBattleMap
   innerHTML'i silince katman kopar; her karede geri takılır
   (missile.js'in yaptığının aynısı). Döngü YALNIZ sefer varken
   döner; boştayken maliyeti sıfırdır.
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

/* Oyun koordinatı → ekran pikseli. TEK GEÇİT: harita.js'in
   ekranKonumu'u. Yoksa eski yüzde hesabına düşer. */
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

function kontrolNoktasi(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - d * AYAR.YAY };
}
function egriNokta(a, c, b, t) {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
           y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

function dongu() {
  if (_rafId) return;
  const adim = () => {
    _rafId = null;
    const liste = hepsi();
    if (!liste.length) { temizle(); return; }
    try { ciz(liste); } catch (e) { console.error("[sefer] çizim:", e); }
    _rafId = requestAnimationFrame(adim);
  };
  _rafId = requestAnimationFrame(adim);
}

function temizle() {
  if (_yolGrup) _yolGrup.innerHTML = "";
  document.querySelectorAll(".sefer-ordu").forEach(el => el.remove());
}

function ciz(liste) {
  const svg = katmaniHazirla();
  if (!svg) return;
  const mapEl = document.getElementById("battleMap");
  const bk = benKey();
  const gorulen = new Set();

  liste.forEach(({ id, s }) => {
    const ev = evre(s);
    if (ev.bitti && ev.ad === "donus") return;
    if (typeof ev.ax !== "number" || typeof ev.bx !== "number") return;

    const a = ekran(ev.ax, ev.ay);
    const b = ekran(ev.bx, ev.by);
    const c = kontrolNoktasi(a, b);
    const nokta = egriNokta(a, c, b, ev.p);

    const benim  = s.sahip === bk;
    const banaMi = s.tur === "kale" && s.hedefKey === bk;
    const renk = banaMi ? "#ff5a4a" : benim ? "#5ad2ff" : "#e0b24a";
    gorulen.add(id);

    /* ── yol ── */
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
    /* akış hissi: kesikler hedefe doğru kayar */
    yol.setAttribute("stroke-dashoffset", String(-((Date.now() / 45) % 22)));

    /* ── yürüyen ordu ── */
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
    const adEl = ordu.querySelector(".sefer-ordu-ad");
    if (adEl) adEl.textContent = benim ? fmtSure(ev.kalanMs) : (s.sahipAd || "");
  });

  _yolGrup.querySelectorAll("[data-sefer]").forEach(el => {
    if (!gorulen.has(el.dataset.sefer)) el.remove();
  });
  document.querySelectorAll(".sefer-ordu").forEach(el => {
    if (!gorulen.has(el.dataset.sefer)) el.remove();
  });
}

/* ═══════════════════════════════════════════════════════════
   14) SOL ÜST SAYAÇ PANELİ
   ═══════════════════════════════════════════════════════════ */
function hudEl() {
  let el = document.getElementById("seferHud");
  if (!el) { el = document.createElement("div"); el.id = "seferHud"; document.body.appendChild(el); }
  return el;
}

function hudCiz() {
  const el = hudEl();
  const liste = benimkiler();
  if (!liste.length) { el.style.display = "none"; el.innerHTML = ""; return; }

  /* Harita görünmüyorsa (savaş paneli / overlay açık) gizle */
  const wrap = document.getElementById("battleMapWrap");
  el.style.display = (wrap && wrap.style.display !== "none") ? "flex" : "none";

  el.innerHTML = liste.map((x, i) => {
    const ev = evre(x.s);
    const ok = ev.ad === "donus" ? "↩︎" : "⚔️";
    return `<div class="sefer-satir" data-sefer="${x.id}">
      <div class="sefer-satir-ust">${ok} Birlik ${i + 1}</div>
      <div class="sefer-satir-alt">${fmtSure(ev.kalanMs)}</div>
      <div class="sefer-satir-hedef">${String(x.s.hedefAd || "").slice(0, 12)}</div>
    </div>`;
  }).join("");

  el.querySelectorAll(".sefer-satir").forEach(row => {
    const f = () => satirTiklandi(row.dataset.sefer);
    if (typeof bindTap === "function") bindTap(row, f); else row.onclick = f;
  });
}

function satirTiklandi(id) {
  const s = seferler[id];
  if (!s) return;
  if (s.durum === "donus") { toast("Ordu dönüş yolunda."); return; }
  const n = toplam(s.birlikler || {});
  onayPenceresi(
    "GERİ ÇAĞIR",
    `<b>${String(s.hedefAd || "")}</b> üzerine giden <b>${n}</b> birliğin geri çağrılsın mı?` +
    `<br><span class="sefer-onay-not">Ordu bulunduğu noktadan yürüyerek dönecek; gittiği yol kadar süre alır.</span>`,
    "↩︎ Geri Çağır",
    () => geriCagir(id)
  );
}

/* ═══════════════════════════════════════════════════════════
   15) ONAY PENCERESİ
   Gövde oyunun kendi .overlay-card'ı, kapatma .overlay-close —
   tema elle taklit EDİLMEZ (bkz. hizlandirmaPenceresi).
   ═══════════════════════════════════════════════════════════ */
function onayPenceresi(baslik, mesajHTML, onayEtiket, cb) {
  const eski = document.getElementById("seferOnayModal");
  if (eski) eski.remove();

  const kok = document.createElement("div");
  kok.id = "seferOnayModal";
  kok.className = "sefer-onay-modal";
  kok.innerHTML = `
    <div class="overlay-card som-card">
      <button class="overlay-close som-close" type="button">✕</button>
      <h2 class="som-title">${baslik}</h2>
      <div class="som-msg">${mesajHTML}</div>
      <div class="som-actions">
        <button class="som-btn som-btn-no"  type="button">Vazgeç</button>
        <button class="som-btn som-btn-yes" type="button">${onayEtiket}</button>
      </div>
    </div>`;
  document.body.appendChild(kok);

  /* HAYALET TIKLAMA: dokunuşla açılan pencere, parmak kalkınca
     gelen click'i yiyordu. ~350 ms geçirimsiz kal. */
  kok.style.pointerEvents = "none";
  setTimeout(() => { kok.style.pointerEvents = ""; }, 350);

  const kapat = () => kok.remove();
  kok.querySelector(".som-close").onclick  = kapat;
  kok.querySelector(".som-btn-no").onclick = kapat;
  kok.querySelector(".som-btn-yes").onclick = () => { kapat(); try { cb(); } catch (e) { console.error(e); } };
  kok.addEventListener("click", e => { if (e.target === kok) kapat(); });
}

/* ═══════════════════════════════════════════════════════════
   16) backToMap KİLİDİ
   Sefer varışında savaş çözülürken kullanıcı mağazada olabilir;
   PvE'nin galibiyet dalı 4.2 sn sonra backToMap() çağırıp
   haritayı zorla açıyordu. Fonksiyon DEĞİŞTİRİLMİYOR, sarılıyor.
   (Geri düğmesi EVENTS'te asıl referansı tuttuğu için etkilenmez.)
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
   17) STİL
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

#seferHud{
  position:fixed; left:10px; top:58px; z-index:40;
  display:flex; flex-direction:column; gap:6px;
}
.sefer-satir{
  min-width:92px; padding:5px 9px; border-radius:11px;
  background:linear-gradient(180deg, rgba(14,26,42,.92), rgba(8,16,28,.92));
  border:1px solid rgba(90,210,255,.45);
  box-shadow:0 3px 10px rgba(0,0,0,.45);
  font-family:'Baloo 2','Nunito',sans-serif; color:#eaf6ff; cursor:pointer;
}
.sefer-satir-ust{ font-size:10.5px; font-weight:800; opacity:.85; line-height:1.2; }
.sefer-satir-alt{ font-size:15px; font-weight:800; line-height:1.15; color:#7fe3a6; letter-spacing:.4px; }
.sefer-satir-hedef{ font-size:9.5px; opacity:.6; line-height:1.2; }

/* ── ONAY PENCERESİ — hizlandirmaPenceresi ile aynı düzen ── */
.sefer-onay-modal{
  position:fixed; inset:0; z-index:9999;
  display:flex; align-items:center; justify-content:center;
  background:rgba(2,10,26,.72); padding:18px;
}
.sefer-onay-modal .som-card{
  max-width:340px; border-radius:22px; padding:18px 16px 18px;
}
.sefer-onay-modal .som-close{ top:12px; right:12px; }
/* .overlay-card h2 display:flex — burada text-align işe yaramaz */
.sefer-onay-modal .som-title{
  justify-content:center; font-size:22px; letter-spacing:1.6px;
  padding-right:0; margin:0 0 12px;
}
.sefer-onay-modal .som-msg{
  font-family:'Baloo 2','Nunito',sans-serif; font-size:14px;
  line-height:1.5; text-align:center; margin:0 0 16px;
}
.sefer-onay-modal .sefer-onay-not{ font-size:12px; opacity:.75; }
.sefer-onay-modal .som-actions{ display:flex; gap:10px; }
.sefer-onay-modal .som-btn{
  flex:1; padding:11px 8px; border-radius:13px; cursor:pointer;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:14px;
  color:#fff; border:2px solid rgba(255,255,255,.35);
}
.sefer-onay-modal .som-btn-no{ background:linear-gradient(180deg,#5a6b80,#3b4859); }
.sefer-onay-modal .som-btn-yes{ background:linear-gradient(180deg,#f0a234,#c0700d); }
.sefer-onay-modal .som-btn:hover{ filter:brightness(1.08); }
`;
  document.head.appendChild(st);
})();

/* ═══════════════════════════════════════════════════════════
   18) ÇALIŞTIR
   ═══════════════════════════════════════════════════════════ */
setInterval(tik, 1000);

/* Dışa açılanlar — konsoldan bakmak / ileride kaynak noktalarını
   bağlamak için. Bir adı silmeden önce projede ARA. */
window.SEFER = {
  AYAR: AYAR,
  liste: hepsi,
  benimkiler: benimkiler,
  geriCagir: geriCagir,
  baslat: seferBaslat,
};

})();
