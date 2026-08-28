/*  ═══════════════════════════════════════════════════════════
    TROOPS.JS — BİRLİK YÖNETİM DOSYASI
    SÜRÜM: 1.7   (sürümü buradan takip et, dosya adı hep troops.js kalsın)
    BİRLİKLERLE İLGİLİ TÜM AYARLAR BU DOSYADAN YAPILIR. Ana koda dokunma!

    BÖLÜMLER:
      1) UNIT_TYPES        → Birlik tanımları (isim, ikon, maliyet, süre, statlar, görsel)
      2) Görsel yardımcıları (unitImgFill, unitImg)
      3) Eğitim sistemi     (trainUnit, kuyruk, hızlandırma, panel)
      4) Savaş birlik seçimi (selectedTroopsForBattle, seçici, özet, roster)
      5) Panel görünümü    (sekme çubuğu + birlik listesi ekranı)

    NOT: Bu dosya heroes.js'ten SONRA, ana koddan ÖNCE yüklenir.
    state, showToast gibi ana kod fonksiyonlarını çalışma anında kullanır.
    ═══════════════════════════════════════════════════════════ */

/*  ─────────────────────────────────────────────
    1) BİRLİK TANIMLARI
    Yeni birlik eklemek için buraya yeni satır ekle;
    menü, eğitim ve savaş seçici otomatik uyum sağlar.
    attack/defense/hp: birim başına stat
    cost: elmas maliyeti • trainMinutes: eğitim süresi (dk)
    modelScale: eğitim ekranındaki 3B modelin boyu (1 = normal,
                0.8 = %20 küçük). Model çerçeveden taşıyorsa düşür.
                ÇALIŞMASI İÇİN ana HTML'de tek satırlık düzenleme
                gerekir — dosyanın en altındaki nota bak.
    ───────────────────────────────────────────── */
const UNIT_TYPES = {
  knight:  { id: "knight",  name: "Savunucu", icon: "🛡️", cost: 100,  trainMinutes: 2,  attack: 2, defense: 5, hp: 7, olum: 1, power: 5,  level: 1, aile: "knight",  kademe: 1, role: "savunma", modelScale: 0.80, /* görsel: KADEME_GORSEL tablosunda */
             kaynak: { et: 6,  su: 2, demir: 9  } },
  soldier: { id: "soldier", name: "Koruyucu", icon: "🪖", cost: 150,  trainMinutes: 3,  attack: 5, defense: 3, hp: 6, olum: 3, power: 7,  level: 1, aile: "soldier", kademe: 1, role: "guc",     modelScale: 0.80, /* görsel: KADEME_GORSEL tablosunda */
             kaynak: { et: 12, su: 3, demir: 12 } },
  robot:   { id: "robot",   name: "Nişancı",  icon: "🤖", cost: 200,  trainMinutes: 4,  attack: 9, defense: 4, hp: 3, olum: 5, power: 10, level: 1, aile: "robot",   kademe: 1, role: "nisan",   modelScale: 0.60, /* robot 2D: bu değer işlemez, aşağıdaki CSS geçerli */ /* görsel: KADEME_GORSEL tablosunda */
             kaynak: { su: 5, demir: 15, enerji: 5 } },
};

/*  ─────────────────────────────────────────────
    1.a1) KADEMELER (Sv2 – Sv6)
    Yukarıdaki üç birlik Sv1'dir ve KİMLİKLERİ DEĞİŞMEZ
    ("knight", "soldier", "robot") — kayıtlı ordular, hastane
    kayıtları ve savaş günlükleri bu yüzden bozulmaz.

    Üst kademeler buradan OTOMATİK üretilir:
        knight2 … knight6 · soldier2 … robot6
    Elle yazılmaz, aşağıdaki sayıları değiştirmen yeter.

    GÖRSELLER: şimdilik Sv1'in görselini kullanır. Kademelere
    ayrı görsel çizince KADEME_GORSEL tablosunu doldur, başka
    hiçbir yeri değiştirmen gerekmez.
    ───────────────────────────────────────────── */
const KADEME_SAYISI = 6;

/*  ── KADEME AÇILIŞI — TEK DOĞRULUK KAYNAĞI ──
    Bir kademenin eğitilebilmesi için o ailenin KIŞLASI kaç
    seviyede olmalı. Dizinin sırası kademedir: 1. kademe Sv1'de,
    2. kademe Sv3'te, ... 6. kademe Sv10'da açılır.
    Kışla seviyesi insaat.js'te (state.binaSv); burada ikinci bir
    seviye kaydı TUTULMAZ.                                        */
const KADEME_ACILIS = [1, 3, 5, 7, 9, 10];

/*  Aile → kışla binası. kaleici.js KISLA_AILE'nin tersi;
    kimlikler Firebase anahtarı olduğu için asla değişmez.        */
const AILE_KISLA = { knight: "sovalye", soldier: "asker", robot: "robot" };

/*  Bu kademe için gereken kışla seviyesi */
function kademeKislaSv(kademe) {
  return KADEME_ACILIS[(kademe || 1) - 1] || 99;
}

/*  Ailenin kışlasının şu anki seviyesi. insaat.js yoksa 1 döner —
    oyun kilitlenmez, yalnız üst kademeler kapalı kalır.          */
function kislaSeviyesi(aile) {
  try {
    const b = AILE_KISLA[aile];
    if (b && window.INSAAT && typeof window.INSAAT.seviye === "function") {
      return window.INSAAT.seviye(b) || 1;
    }
  } catch (e) {}
  return 1;
}

function kademeAcikMi(aile, kademe) {
  return kislaSeviyesi(aile) >= kademeKislaSv(kademe);
}

/*  Kilit yazısı için kışlanın adı — insaat.js ADLAR'dan okunur. */
function kislaAdi(aile) {
  try {
    const b = AILE_KISLA[aile];
    if (b && window.INSAAT && window.INSAAT.ADLAR) return window.INSAAT.ADLAR[b];
  } catch (e) {}
  return "Kışla";
}

const KADEME = {
  /*  Her kademede eklenen sabit sayı — AİLEYE GÖRE FARKLI.
      Birlikler yükseldikçe kendi karakterlerinde uzmanlaşır:
        Savunucu → savunma ve cana ağırlık verir (tanklaşır)
        Nişancı  → saldırı ve öldürücülüğe ağırlık verir (delicileşir)
        Koruyucu → dört yöne dengeli, ama toplamda bir tık az (16'ya 18)
      Sayıları değiştirmek yeterli, başka hiçbir yeri elleme.       */
  STAT_ARTIS: {
    knight:  { attack: 3, defense: 6, hp: 6, olum: 3 },   /* toplam 18 */
    soldier: { attack: 4, defense: 4, hp: 4, olum: 4 },   /* toplam 16 */
    robot:   { attack: 6, defense: 3, hp: 3, olum: 6 },   /* toplam 18 */
  },

  MALIYET_KAT: 1.8,   /* elmas maliyeti her kademede bu katsayıyla artar  */
  SURE_KAT:    1.8,   /* eğitim süresi                                    */
  KAYNAK_KAT:  1.8,   /* et/su/demir/enerji                               */
  GUC_KAT:     1.8,   /* sıralamadaki güç puanı                           */
};

/*  ─────────────────────────────────────────────
    BİRLİK GÖRSELLERİ — 18 dosyanın TEK KAYNAĞI
    Dosya adı = birlik adının sade hâli: küçük harf,
    Türkçe harf yok (ş→s, ç→c, ı→i, ğ→g, ü→u, ö→o),
    boşluksuz. Tablo boşsa o kademe görselsiz kalır.
    ───────────────────────────────────────────── */
const KADEME_GORSEL = {
  /* Savunucu */
  knight1:  "sovalye.webp",              /* Şövalye            */
  knight2:  "suvari.webp",               /* Süvari             */
  knight3:  "yeniceri.webp",             /* Yeniçeri           */
  knight4:  "asker.webp",                /* Asker              */
  knight5:  "robot.webp",                /* Robot              */
  knight6:  "devrobot.webp",             /* Dev Robot          */

  /* Koruyucu */
  soldier1: "mizrakci.webp",             /* Mızrakçı           */
  soldier2: "savasfili.webp",            /* Savaş Fili         */
  soldier3: "topcu.webp",                /* Topçu              */
  soldier4: "tank.webp",                 /* Tank               */
  soldier5: "saldirihelikopteri.webp",   /* Saldırı Helikopteri*/
  soldier6: "supertank.webp",            /* Süper Tank         */

  /* Nişancı */
  robot1:   "okcu.webp",                 /* Okçu               */
  robot2:   "savasarabasi.webp",         /* Savaş Arabası      */
  robot3:   "tufekci.webp",              /* Tüfekçi            */
  robot4:   "havanbirligi.webp",         /* Havan Birliği      */
  robot5:   "savasucagi.webp",           /* Savaş Uçağı        */
  robot6:   "fuzesistemi.webp",          /* Füze Sistemi       */
};

/* Sv1 görselleri de aynı tablodan okunur (iki yerde tutulmasın) */
["knight", "soldier", "robot"].forEach(tid => {
  const g = KADEME_GORSEL[tid + "1"];
  if (g) UNIT_TYPES[tid].img = g;
});

/*  ─────────────────────────────────────────────
    BİRLİK ADLARI — 18 ismin TEK KAYNAĞI
    Sıra Sv1'den Sv6'ya. Aile adları (Savunucu/Koruyucu/Nişancı)
    bunlardan ayrıdır; onlar rol düğmelerinde ve istatistik
    ekranında kalır (UNIT_ROLES).
    Bir ismi değiştireceksen SADECE burayı düzenle — ekranlar,
    savaş raporu, hastane ve toast'lar def.name okuduğu için
    kendiliğinden değişir.
    ───────────────────────────────────────────── */
const KADEME_ADI = {
  knight:  ["Şövalye", "Süvari",      "Yeniçeri", "Asker",           "Robot",        "Dev Robot"],
  soldier: ["Mızrakçı",      "Savaş Fili", "Topçu", "Tank",          "Saldırı Helikopteri", "Süper Tank"],
  robot:   ["Okçu",          "Savaş Arabası",  "Tüfekçi",  "Havan Birliği",  "Savaş Uçağı",  "Füze Sistemi"],
};

/* Sv1 adlarını da bu tablodan al (iki yerde ad tutulmasın) */
["knight", "soldier", "robot"].forEach(tid => {
  const ad = (KADEME_ADI[tid] || [])[0];
  if (ad) UNIT_TYPES[tid].name = ad;
});

(function kademeleriUret() {
  const tabanlar = ["knight", "soldier", "robot"];
  tabanlar.forEach(tid => {
    const t = UNIT_TYPES[tid];
    for (let lv = 2; lv <= KADEME_SAYISI; lv++) {
      const k = lv - 1;                       /* Sv1'den kaç basamak yukarı */
      const a = KADEME.STAT_ARTIS[tid] || { attack: 3, defense: 3, hp: 3, olum: 3 };
      const id = tid + lv;

      const kaynak = {};
      Object.keys(t.kaynak || {}).forEach(r => {
        kaynak[r] = Math.round((t.kaynak[r] || 0) * Math.pow(KADEME.KAYNAK_KAT, k));
      });

      UNIT_TYPES[id] = {
        id, name: (KADEME_ADI[tid] || [])[lv - 1] || t.name, icon: t.icon,
        cost:         Math.round(t.cost * Math.pow(KADEME.MALIYET_KAT, k)),
        trainMinutes: Math.round(t.trainMinutes * Math.pow(KADEME.SURE_KAT, k)),
        attack:  (t.attack  || 0) + k * a.attack,
        defense: (t.defense || 0) + k * a.defense,
        hp:      (t.hp      || 0) + k * a.hp,
        olum:    (t.olum    || 0) + k * a.olum,
        power:   Math.round((t.power || 0) * Math.pow(KADEME.GUC_KAT, k)),
        level: lv, aile: tid, kademe: lv,
        role: t.role, modelScale: t.modelScale,
        img: KADEME_GORSEL[id] || t.img,
        kaynak,
      };
    }
  });
})();

/* Bir birliğin ailesi (knight/soldier/robot). Bonuslar kademeye
   değil AİLEYE işler: Sv1 de Sv6 da aynı araştırmadan yararlanır. */
function birlikAilesi(unitId) {
  const d = UNIT_TYPES[unitId];
  return (d && d.aile) || unitId;
}

/* Bir ailenin kademeleri, Sv1'den Sv6'ya sıralı. */
function aileKademeleri(aile) {
  return Object.values(UNIT_TYPES)
    .filter(d => d.aile === aile)
    .sort((a, b) => (a.kademe || 1) - (b.kademe || 1));
}

/*  ─────────────────────────────────────────────
    1.a2) BİRLİK BAŞINA KAYNAK — UNIT_TYPES.kaynak
    Yukarıdaki `kaynak` alanı TEK BİRLİK için gereken kaynaktır.
    Toplam = birim × adet. Yeni kaynak türü eklemek için sadece
    o birliğin nesnesine alan ekle; ekran ve sınır kendiliğinden
    uyum sağlar (KAYNAK_IKON'a ikonunu eklemeyi unutma).

    Bir birlikte OLMAYAN kaynak hiç istenmez — robot et yemez,
    bu yüzden robotun listesinde `et` yok, ekranda da çıkmaz.

    NOT: "Anında" üretim şu an kaynak ALMAZ, sadece elmas alır.
    Test aşaması için bilinçli bırakıldı. Kaynak alması istenirse
    trainUnitInstant içindeki işaretli bloğun yorumu kaldırılır.
    ───────────────────────────────────────────── */
const KAYNAK_IKON = { et: "🍖", demir: "⛓️", su: "💧", enerji: "⚡" };

/* Tek birlik için değil, İSTENEN ADET için toplam kaynak. */
function kaynakMaliyet(unitId, count) {
  const def = UNIT_TYPES[unitId];
  const n = Math.max(1, count || 1);
  const out = {};
  if (!def || !def.kaynak) return out;
  Object.keys(def.kaynak).forEach(k => { out[k] = (def.kaynak[k] || 0) * n; });
  return out;
}

/* Elmas VE kaynak birlikte bakılarak en fazla kaç birlik üretilebilir.
   "Yetmiyorsa yettiği kadar" kuralı buradan gelir: kaydırma çubuğunun
   üst sınırı bu sayıdır, oyuncu ödeyemeyeceği bir adede hiç çıkamaz. */
function maxUretilebilir(unitId, tavan) {
  const def = UNIT_TYPES[unitId];
  if (!def) return 1;
  const ust = (typeof tavan === "number" && tavan > 0) ? tavan : 500;

  let en = ust;

  /* elmas */
  if (def.cost > 0) {
    en = Math.min(en, Math.floor((state.diamonds || 0) / def.cost));
  }
  /* kaynaklar */
  const kay = (state && state.kaynaklar) || {};
  if (def.kaynak) {
    Object.keys(def.kaynak).forEach(k => {
      const gerek = def.kaynak[k] || 0;
      if (gerek > 0) en = Math.min(en, Math.floor((kay[k] || 0) / gerek));
    });
  }
  return Math.max(1, en);      /* çubuk hep en az 1 göstersin */
}

/* Ödeme yapılabilir mi? (adet dahil) */
function kaynakYeterli(unitId, count) {
  const gerek = kaynakMaliyet(unitId, count);
  const kay = (state && state.kaynaklar) || {};
  return Object.keys(gerek).every(k => (kay[k] || 0) >= gerek[k]);
}

/* Kaynağı düş. Çağırmadan ÖNCE kaynakYeterli ile bak. */
function kaynakDus(unitId, count) {
  const gerek = kaynakMaliyet(unitId, count);
  if (!state.kaynaklar) state.kaynaklar = { et: 0, demir: 0, su: 0, enerji: 0 };
  Object.keys(gerek).forEach(k => {
    state.kaynaklar[k] = Math.max(0, (state.kaynaklar[k] || 0) - gerek[k]);
  });
}

/*  Kısa sayı — 10200 → "10.2K". Eğitim ekranındaki kaynak sütunu dar,
    tam sayı yazılınca rakamlar birlik görselinin üstüne taşıyordu.
    1000'in altı olduğu gibi yazılır.                                */
function kisaSayi(n) {
  n = Math.round(Number(n) || 0);
  if (n < 1000) return String(n);
  if (n < 1000000) {
    const b = n / 1000;
    return (b >= 100 ? Math.round(b) : (Math.round(b * 10) / 10)).toString().replace(".", ",") + "K";
  }
  const m = n / 1000000;
  return (m >= 100 ? Math.round(m) : (Math.round(m * 10) / 10)).toString().replace(".", ",") + "M";
}

/*  ─────────────────────────────────────────────
    1.a) ROLLER — eğitim ekranının solundaki üç düğme
    Savunucu → Şövalye · Koruyucu → Asker · Nişancı → Robot
    Düğmeye basınca o birliğin ekranı gelir. Yeni birlik/rol
    eklersen sadece UNIT_TYPES'ı ve bu listeyi düzenle.
    ───────────────────────────────────────────── */
const UNIT_ROLES = [
  { id: "savunma", label: "Savunucu", icon: "🛡️", unit: "knight"  },
  { id: "guc",     label: "Koruyucu", icon: "⚔️", unit: "soldier" },
  { id: "nisan",   label: "Nişancı", icon: "🎯", unit: "robot"   },
];

/*  Ekranda görünen ad = birliğin kendi adı ("Tüfekçi").
    Her kademenin ayrı adı olduğu için başa "3.Sv" eklenmiyor;
    kademe zaten sağ üstteki rozette yazıyor.                       */
function unitAdi(x) {
  const d = (typeof x === "string") ? UNIT_TYPES[x] : x;
  if (!d) return "";
  return d.name;
}

/*  power: birliğin KALE GÜCÜNE kattığı puan. Sıralama ekranındaki
    TROOP_POWER bu alandan türetilir — değeri sadece burada değiştir. */

/*  ─────────────────────────────────────────────
    1.b) SÜRE BİÇİMLENDİRME
    Eğitim artık SIRALI: birlikler teker teker çıkar, bu yüzden
    süreler saatleri bulabiliyor. index.html'deki formatRemaining
    saat göstermiyor (250:00 gibi yazardı), o yüzden burada kendi
    biçimleyicilerimiz var.
    ───────────────────────────────────────────── */

/* Dakikadan okunur metin — "4 sa 10 dk" / "25 dk" */
function sureDk(dakika) {
  const d = Math.max(0, Math.round(dakika));
  const sa = Math.floor(d / 60), kalan = d % 60;
  if (sa > 0) return kalan > 0 ? `${sa} sa ${kalan} dk` : `${sa} sa`;
  return `${d} dk`;
}

/* Milisaniyeden geri sayım — "4 sa 09 dk" / "12:30" */
function sureMs(ms) {
  const top = Math.max(0, Math.ceil(ms / 1000));
  const sa = Math.floor(top / 3600);
  const dk = Math.floor((top % 3600) / 60);
  const sn = top % 60;
  if (sa > 0) return `${sa} sa ${dk.toString().padStart(2, "0")} dk`;
  return `${dk}:${sn.toString().padStart(2, "0")}`;
}

function unitImgFill(def){
  return (def && def.img) ? `<img class="unit-photo" src="${def.img}" alt="">` : (def ? def.icon : "\ud83e\udd96");
}
function unitImg(def, size){
  size = size || 26;
  return (def && def.img)
    ? `<span class="unit-photo-box" style="width:${size}px;height:${size}px;flex:0 0 ${size}px;"><img class="unit-photo" src="${def.img}" alt=""></span>`
    : (def ? def.icon : "\ud83e\udd96");
}

/*  ── 3) EĞİTİM SİSTEMİ ── */
/* ── ANINDA ÜRETİM ──────────────────────────────────────────────
   Beklemeden birlik verir. Fiyatı normal maliyetin katıdır.
   Dengeyi buradan ayarla: 3 = üç katı. */
const INSTANT_COST_MULT = 3;

function instantCostFor(unitId, count) {
  const def = UNIT_TYPES[unitId];
  if (!def) return 0;
  return Math.round(def.cost * (count || 1) * INSTANT_COST_MULT);
}

function trainUnitInstant(unitId, count) {
  count = count || 1;
  const def = UNIT_TYPES[unitId];
  if (!def) return;
  /* ANINDA: şimdilik SADECE elmas alır, kaynak almaz (test kolaylığı).
     Kaynak da alması istenirse: aşağıya kaynakYeterli kontrolü ve
     kaynakDus(unitId, count) eklemek yeterli — başka yeri değişmez. */
  const enFazlaElmas = (UNIT_TYPES[unitId].cost * INSTANT_COST_MULT > 0)
    ? Math.floor((state.diamonds || 0) / (UNIT_TYPES[unitId].cost * INSTANT_COST_MULT))
    : count;
  if (enFazlaElmas < count) count = Math.max(1, enFazlaElmas);

  const totalCost = instantCostFor(unitId, count);
  if (state.diamonds < totalCost) {
    showToast(`Yeterli elmasın yok. ${count} ${def.name} anında üretmek ${fmt(totalCost)} elmas.`);
    return;
  }
  state.diamonds -= totalCost;
  state.troops[unitId] = (state.troops[unitId] || 0) + count;
  renderDiamonds();
  updateShopButtons();
  renderTroopsPanel();
  if (typeof persistCurrentState === "function") { try { persistCurrentState(); } catch (e) {} }
  showToast(`⚡ ${count} ${def.name} anında hazır!`);
}

function trainUnit(unitId, count) {
  count = count || 1;
  const def = UNIT_TYPES[unitId];
  if (!def) return;

  /* "Yetmiyorsa yettiği kadar": adet, ödenebilir en yüksek sayıya
     kırpılır. Çubuğun üst sınırı zaten bunu engelliyor ama arada
     kaynak harcayan başka bir iş (sefer dönüşü, başka sekme) araya
     girebilir — burada ikinci kez bakılıyor.                       */
  const enFazla = maxUretilebilir(unitId, count);
  if (enFazla < count) count = enFazla;

  const totalCost = def.cost * count;
  if (state.diamonds < totalCost || !kaynakYeterli(unitId, count)) {
    const g = kaynakMaliyet(unitId, count);
    const liste = Object.keys(g).map(k => `${KAYNAK_IKON[k] || ""} ${fmt(g[k])}`).join(" · ");
    showToast(`Yeterli kaynağın yok. ${count} ${def.name} için 💎 ${fmt(totalCost)}${liste ? " · " + liste : ""} gerekiyor.`);
    return;
  }
  state.diamonds -= totalCost;
  kaynakDus(unitId, count);
  if (typeof renderKaynaklar === "function") { try { renderKaynaklar(); } catch (e) {} }

  /* SIRALI EĞİTİM: birlikler teker teker çıkar. Yeni sipariş, o
     birlik türünün kuyruğundaki son işin ARKASINA eklenir.
     Farklı türler birbirini beklemez (her türün kendi kuyruğu var). */
  const birimMs = def.trainMinutes * 60 * 1000;
  let sonBitis = Date.now();
  state.trainingQueue.forEach(j => {
    if (j.unitId === unitId && j.finishAt > sonBitis) sonBitis = j.finishAt;
  });
  for (let i = 0; i < count; i++) {
    sonBitis += birimMs;
    state.trainingQueue.push({ unitId, finishAt: sonBitis });
  }

  renderDiamonds();
  updateShopButtons();
  renderTroopsPanel();
  showToast(count === 1
    ? `${def.name} eğitime başladı (${sureDk(def.trainMinutes)}).`
    : `${count} ${def.name} eğitime başladı (toplam ${sureDk(def.trainMinutes * count)}).`);
}

function getTotalTroopStats() {
  let attack = 0, defense = 0, hp = 0, count = 0;
  Object.keys(state.troops).forEach(unitId => {
    const n = state.troops[unitId] || 0;
    const def = UNIT_TYPES[unitId];
    if (!def || n <= 0) return;
    attack += def.attack * n;
    defense += def.defense * n;
    hp += def.hp * n;
    count += n;
  });
  return { attack, defense, hp, count };
}

function renderTroopsPanel() {
  applyFinishedTraining();
  const panel = document.getElementById("panel-troops");
  if (!panel) return;

  if (!document.getElementById("owned_knight")) return;

  if (!panel.dataset.tplBound) { bindTroopsTemplate(); panel.dataset.tplBound = "1"; }

  const totals = getTotalTroopStats();
  setTroopText("power_attack", totals.attack);
  setTroopText("power_defense", totals.defense);
  setTroopText("power_hp", totals.hp);

  Object.values(UNIT_TYPES).forEach(def => {
    setTroopText("owned_" + def.id, "x" + (state.troops[def.id] || 0));
    setTroopText(def.id + "_atk", def.attack);
    setTroopText(def.id + "_def", def.defense);
    setTroopText(def.id + "_hp", def.hp);
    setTroopText(def.id + "_cost", fmt(def.cost));

    const affordableMax = ensure(Math.floor(state.diamonds / def.cost));
    const sliderMax = clamp(affordableMax, 1, 50);
    const current = Math.min(troopTrainSelection[def.id] || 1, sliderMax);
    troopTrainSelection[def.id] = current;

    const slider = document.getElementById("troopTrainSlider_" + def.id);
    if (slider) {
      slider.min = 1;
      slider.max = sliderMax;
      slider.value = current;
      slider.disabled = (affordableMax === 0);
    }
    const btn = document.getElementById(def.id + "_btn");
    if (btn) btn.disabled = (affordableMax === 0);

    setTroopText(def.id + "_qty", current);
    setTroopText(def.id + "_total", fmt(def.cost * current));
    /* süre, seçilen ADET kadar birliğin TOPLAM süresi */
    setTroopText(def.id + "_time", sureDk(def.trainMinutes * current));
  });

  renderTroopQueue();
}

function setTroopText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function bindTroopsTemplate() {
  Object.values(UNIT_TYPES).forEach(def => {
    const slider = document.getElementById("troopTrainSlider_" + def.id);
    if (slider) {
      slider.addEventListener("input", () => {
        const v = ensure(parseInt(slider.value, 10) || 1, 1);
        troopTrainSelection[def.id] = v;
        setTroopText(def.id + "_qty", v);
        setTroopText(def.id + "_total", fmt(def.cost * v));
        setTroopText(def.id + "_time", sureDk(def.trainMinutes * v));
      });
    }
    const minus = document.getElementById(def.id + "_minus");
    const plus  = document.getElementById(def.id + "_plus");
    if (minus) bindTap(minus, () => stepTroopQty(def.id, -1));
    if (plus)  bindTap(plus,  () => stepTroopQty(def.id, 1));
    const btn = document.getElementById(def.id + "_btn");
    if (btn) bindTap(btn, () => trainUnit(def.id, troopTrainSelection[def.id] || 1));
  });
}

function stepTroopQty(unitId, delta) {
  const slider = document.getElementById("troopTrainSlider_" + unitId);
  if (!slider || slider.disabled) return;
  const min = parseInt(slider.min, 10) || 1;
  const max = parseInt(slider.max, 10) || 1;
  const v = clamp((parseInt(slider.value, 10) || 1) + delta, min, max);
  slider.value = v;
  troopTrainSelection[unitId] = v;
  const def = UNIT_TYPES[unitId];
  setTroopText(unitId + "_qty", v);
  setTroopText(unitId + "_total", fmt(def.cost * v));
  setTroopText(unitId + "_time", sureDk(def.trainMinutes * v));
}

function renderTroopQueue() {
  const banner = document.getElementById("train_area");
  const hasTraining = !!(state.trainingQueue && state.trainingQueue.length > 0);

  if (banner) banner.style.display = hasTraining ? "none" : "";

  const byUnit = hasTraining ? groupBy(state.trainingQueue, j => j.unitId) : {};
  const speedUpCount = Object.keys(state.inventory || {})
    .filter(ad => /Hızlandırma/i.test(ad) && /\d+\s*(Dakika|Saat|Gün)/i.test(ad))
    .reduce((t, ad) => t + (state.inventory[ad] || 0), 0);

  ["knight", "soldier", "robot"].forEach(unitId => {
    const slot = document.getElementById("train_" + unitId);
    if (!slot) return;
    const group = byUnit[unitId];
    if (!group || group.length === 0) {
      slot.style.display = "none";
      slot.innerHTML = "";
      slot.dataset.imza = "";      /* tekrar açılınca yeniden kurulsun */
      return;
    }
    const def = UNIT_TYPES[unitId];
    group.sort((a, b) => a.finishAt - b.finishAt);
    /* TOPLAM kalan süre = kuyruktaki SON birliğin bitişine kalan.
       (Eskiden group[0] kullanılıyordu; o sadece sıradaki tek
        birliğin süresiydi, tüm kuyruğunki değil.) */
    const remaining = group[group.length - 1].finishAt - Date.now();
    slot.style.display = "flex";

    /* ── TİTREME ÖNLEME ──
       Bu fonksiyon saniyede bir çalışıyor. Eskiden her turda
       innerHTML baştan yazılıyordu: <img> yeniden yaratılıyor,
       giriş animasyonu tekrar oynuyor ve kutucuk gözle görülür
       şekilde titriyordu.

       Artık iskelet YALNIZCA bir kez kuruluyor; sonraki turlarda
       sadece değişen iki metin (adet ve geri sayım) güncelleniyor. */
    const imza = unitId + ":" + group.length;
    if (slot.dataset.imza !== imza) {
      slot.dataset.imza = imza;
      slot.innerHTML = `
        <div class="q-img">${unitImgFill(def)}</div>
        <div class="q-info">
          <span class="q-count">x${group.length}</span>
          <button class="q-timer speedup-trigger" data-unit="${unitId}"
                  title="${speedUpCount > 0 ? 'Hızlandırmak için tıkla' : 'Mağazadan ⏩ Hızlandırma satın al'}">
            ${sureMs(remaining)} ⏩
          </button>
        </div>`;
      /* Dinleyici BURAYA bağlanmaz: bu iskelet saniyede bir yeniden
         yazılabiliyor ve bağ kopuyordu. index.html'deki belge düzeyi
         dinleyici .speedup-trigger'ı data-unit üzerinden yakalar. */
    } else {
      const sayacEl = slot.querySelector(".q-timer");
      if (sayacEl) {
        const yeniMetin = sureMs(remaining) + " ⏩";
        if (sayacEl.textContent.trim() !== yeniMetin) sayacEl.textContent = yeniMetin;
      }
    }
  });
}

let troopTrainSelection = {};

function useSpeedUpOnTrainingGroup(unitId) {
  /* Artık hızlandırma PENCERESİ açılır: elindeki hızlandırmalar
     listelenir, kaç tane kullanacağını seçersin ve pencere açık
     kalır. Eski davranış (her dokunuşta sessizce tek eşya) yedek
     olarak duruyor — pencere yoksa oyun kırılmasın. */
  if (typeof hizlandirmaPenceresi === "function") {
    hizlandirmaPenceresi(unitId, "egitim");
    return;
  }
  useSpeedUpOnGroup(
    state.trainingQueue.filter(j => j.unitId === unitId),
    [applyFinishedTraining, renderTroopsPanel, renderInventory],
    true);   /* zincirli: kuyruğun tamamı 5 dk öne kayar */
}

/*  ── 4) SAVAŞ BİRLİK SEÇİMİ ── */
let selectedTroopsForBattle = { knight: 0, soldier: 0, robot: 0 };

/* Sayı kutucuğu içindeki rakam kadar genişler — boşluk kalmaz.
   "ch" birimi yazı tipindeki "0" genişliğidir, o yüzden birebir oturur. */
function tNumBoyutla(kutu) {
  if (!kutu) return;
  const n = Math.max(1, String(kutu.value || "").replace(/[^0-9]/g, "").length);
  kutu.style.width = n + "ch";
}

function renderTroopSelector() {
  applyFinishedTraining();
  const listEl = document.getElementById("troopSelectList");
  const summaryEl = document.getElementById("troopSelectSummary");
  if (!listEl || !summaryEl) return;

  renderHeroPickerForBattle();

  const owned = Object.values(UNIT_TYPES).filter(def => (state.troops[def.id] || 0) > 0);
  if (owned.length === 0) {
    listEl.innerHTML = emptyState("🪖", 'Henüz birliğin yok. "Birlikler" menüsünden eğitebilirsin.', "10px");
    summaryEl.textContent = "";
    return;
  }

  listEl.innerHTML = owned.map(def => {
    const max = state.troops[def.id] || 0;
    const current = Math.min(selectedTroopsForBattle[def.id] || 0, max);
    return `
      <div class="troop-select-row" data-unit="${def.id}">
        <span class="t-icon" data-unit="${def.id}">${def.img ? `<img class="t-head" src="${def.img}" alt="">` : (def.icon || "")}</span>
        <div class="t-right">
        <div class="troop-select-top">
          <span class="t-name">${def.name}</span>
          <span class="t-count" id="troopCount_${def.id}">
            <input type="text" class="t-num" inputmode="numeric" pattern="[0-9]*"
                   data-unit="${def.id}" value="${current}" maxlength="7">
            <span class="t-max">/ ${max}</span>
          </span>
        </div>
        <div class="t-slider-row">
          <button type="button" class="t-step" data-unit="${def.id}" data-d="-1">−</button>
          <input type="range" class="troop-slider" id="troopSlider_${def.id}"
                 min="0" max="${max}" step="1" value="${current}" data-unit="${def.id}">
          <button type="button" class="t-step" data-unit="${def.id}" data-d="1">+</button>
        </div>
        </div>
      </div>`;
  }).join("");

  listEl.querySelectorAll(".troop-slider").forEach(slider => {
    slider.addEventListener("input", () => {
      const unitId = slider.dataset.unit;
      selectedTroopsForBattle[unitId] = parseInt(slider.value, 10);
      /* yazarken kutuyu ezme: sadece odakta değilse güncelle */
      const satir = slider.closest(".troop-select-row");
      const kutu = satir ? satir.querySelector(".t-num") : null;
      if (kutu && document.activeElement !== kutu) kutu.value = slider.value;
      if (kutu) tNumBoyutla(kutu);
      updateTroopSelectSummary();
      renderEnemyPowerPreview();
    });
  });

  /* ── ELLE SAYI GİRME ──────────────────────────────────────────
     "0 / 9" içindeki 0 artık bir kutucuk: tıklayıp istediğin sayıyı
     yazabilirsin. Sürgüyle çift yönlü bağlı; sınırı aşan değer
     birlik sayısına kırpılır. */
  listEl.querySelectorAll(".t-num").forEach(kutu => {
    tNumBoyutla(kutu);
    const unitId = kutu.dataset.unit;
    const satir2 = kutu.closest(".troop-select-row");
    const s = satir2 ? satir2.querySelector(".troop-slider") : null;
    if (!s) return;
    const enCok = parseInt(s.max, 10) || 0;

    function uygula(duzelt) {
      let v = parseInt(String(kutu.value).replace(/[^0-9]/g, ""), 10);
      if (!isFinite(v)) v = 0;
      v = Math.max(0, Math.min(enCok, v));
      if (duzelt) kutu.value = v;
      if ((parseInt(s.value, 10) || 0) !== v) {
        s.value = v;
        s.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    kutu.addEventListener("input", () => { tNumBoyutla(kutu); uygula(false); });
    kutu.addEventListener("blur",  () => { uygula(true); tNumBoyutla(kutu); });
    kutu.addEventListener("focus", () => setTimeout(() => kutu.select(), 0));
    kutu.addEventListener("click", (e) => e.stopPropagation());
    kutu.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); kutu.blur(); } });
  });

  /* ── − / + düğmeleri ──────────────────────────────────────────
     Basılı tutunca hızlanarak sayar (443 robotu tek tek tıklamamak
     için). Sürgünün "input" olayını taklit ediyor, böylece sayaç,
     özet ve güç önizlemesi kendiliğinden güncelleniyor. */
  listEl.querySelectorAll(".t-step").forEach(btn => {
    const yon = parseInt(btn.dataset.d, 10) || 1;
    let tekrar = null, hiz = 220, adim = 1;

    function uygula() {
      const satir3 = btn.closest(".troop-select-row");
      const s = satir3 ? satir3.querySelector(".troop-slider") : null;
      if (!s) return;
      const enCok = parseInt(s.max, 10) || 0;
      const yeni = Math.max(0, Math.min(enCok, (parseInt(s.value, 10) || 0) + yon * adim));
      if (yeni === parseInt(s.value, 10)) return;
      s.value = yeni;
      s.dispatchEvent(new Event("input", { bubbles: true }));
    }
    function basla(e) {
      e.preventDefault(); e.stopPropagation();
      hiz = 220; adim = 1; uygula();
      const tik = () => {
        uygula();
        hiz = Math.max(45, hiz - 30);
        if (hiz <= 90) adim = Math.min(25, adim + 1);
        tekrar = setTimeout(tik, hiz);
      };
      tekrar = setTimeout(tik, 420);
    }
    function bitir() { if (tekrar) { clearTimeout(tekrar); tekrar = null; } }

    btn.addEventListener("pointerdown", basla);
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btn.addEventListener(ev, bitir));
  });

  updateTroopSelectSummary();
}

function updateTroopSelectSummary() {
  const summaryEl = document.getElementById("troopSelectSummary");
  if (!summaryEl) return;
  let attack = 0, defense = 0, hp = 0, count = 0;
  Object.keys(selectedTroopsForBattle).forEach(unitId => {
    const n = selectedTroopsForBattle[unitId] || 0;
    const def = UNIT_TYPES[unitId];
    if (!def || n <= 0) return;
    attack += def.attack * n; defense += def.defense * n; hp += def.hp * n; count += n;
  });

  const cmds = (typeof selectedCommanders !== "undefined" ? selectedCommanders : []).map(id => HERO_STATS[id]).filter(Boolean);
  const cmdPart = cmds.length ? " + " + cmds.map(c => `<span style="color:${c.color};">${c.specialtyIcon} ${c.name}</span>`).join(", ") : "";
  if (count === 0 && cmds.length === 0) {
    summaryEl.innerHTML = `Tek başına gidiyorsun.`;
  } else {
    summaryEl.innerHTML = `<b>${count}</b> birlik · ⚔️+${attack} 🛡️+${defense} ❤️+${hp}${cmdPart}`;
  }
}

function buildTroopRoster(selectedTroops) {
  const roster = [];
  Object.keys(selectedTroops || {}).forEach(unitId => {
    const n = ensure(Math.min(selectedTroops[unitId] || 0, state.troops[unitId] || 0));
    const def = UNIT_TYPES[unitId];
    if (!def || n <= 0) return;
    for (let i = 0; i < n; i++) {
      roster.push({ unitId, hpEach: def.hp });
    }
  });
  return roster;
}


/*  ═══════════════════════════════════════════════════════════
    5) BİRLİK PANELİ GÖRÜNÜMÜ — SEKMELİ EKRAN
    #panel-troops'a bir sekme çubuğu ekler:
      Sekme 1 "Eğitim"    → mevcut 3B görüntüleyici (dokunulmadı)
      Sekme 2 "Birlikler" → birlik PNG'si + x{adet} + Geliştir
    Renkler ve font magaza.js ile birebir aynıdır.
    ═══════════════════════════════════════════════════════════ */

/* ── 1) GÖRÜNÜM ──────────────────────────────────────────────── */
(function () {
  const st = document.createElement("style");
  st.textContent = `
/* sekme çubuğu — mağazadaki .shop-tab ile aynı hap stili */
.tp-tabs{
  position:absolute; z-index:40;
  top:calc(10px + env(safe-area-inset-top,0)); left:0; right:0;
  display:flex; justify-content:center; gap:8px;
  pointer-events:none;
}
.tp-tab{
  pointer-events:auto; flex-shrink:0; cursor:pointer;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:12px;
  color:#dff4ff; padding:4px 16px; border-radius:16px;
  background:linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.06));
  border:1px solid rgba(190,240,255,.45);
  text-shadow:0 1px 2px rgba(0,30,55,.5);
  backdrop-filter:blur(3px);
  transition:all .15s ease;
  -webkit-tap-highlight-color:transparent;
}
.tp-tab:hover{ border-color:#fff; color:#fff; }
.tp-tab.active{
  background:linear-gradient(180deg,#ffffff,#cfeefb);
  color:#0e6fc0; border-color:#fff; text-shadow:none;
  box-shadow:none;
}
/* sonradan sembol eklemek için: <span class="tp-ico">🛡️</span> */
.tp-tab .tp-ico{ margin-right:4px; }

/* sekme çubuğu için mevcut başlık/noktaları aşağı it */
#panel-troops .uv-title{ top:calc(44px + env(safe-area-inset-top,0)); }
#panel-troops .uv-dots { top:calc(72px + env(safe-area-inset-top,0)); }

/* eğitim ekranındaki "x{miktar}" yazısı kaldırıldı */
#panel-troops .uv-troop-count{ display:none !important; }

/* ROBOT 2D'dir (3B model değil, düz PNG) → modelScale ona işlemez,
   boyu buradan ayarlanır. Orijinali min(50vh,440px) idi.
   Küçültmek için sayıları düşür, büyütmek için yükselt. */
#panel-troops .us-robot .hero-img{
  height:min(38vh, 330px) !important;
}

/* NOT: Modelleri küçültmek için canvas'a CSS scale VERME — canvas zaten
   kendi alt kenarında kırptığı için ayaklar kesik kalır. Bunun yerine ana
   HTML'de "const scale = 2.0 / maxDim;" satırındaki 2.0 değerini düşür. */

/* eğitim sekmesi pasifken görüntüleyiciyi gizle */
#unitViewer.tp-off .unit-screen{ visibility:hidden; pointer-events:none; }
#unitViewer.tp-off .uv-title,
#unitViewer.tp-off .uv-dots,
#unitViewer.tp-off .uv-arrow{ display:none; }

/* ── 2. sekme ekranı ── */
.tp-screen{
  position:absolute; inset:0; z-index:30;
  display:none; flex-direction:column;
  padding:calc(52px + env(safe-area-inset-top,0)) 12px 14px;
  background:
    linear-gradient(180deg, #1fa3ea, #0e6fc0);
}
.tp-screen.is-active{ display:flex; }

.tp-list{
  display:flex; flex-direction:column; gap:8px;
  overflow-y:auto; padding:4px 2px 10px;
  scrollbar-width:thin; scrollbar-color:#5bb9e6 transparent;
}
.tp-list::-webkit-scrollbar{ width:8px; }
.tp-list::-webkit-scrollbar-thumb{ background:linear-gradient(180deg,#7fd0f2,#3d9fd6); border-radius:8px; }
.tp-list::-webkit-scrollbar-track{ background:rgba(0,0,0,.15); }

/* ── birlik satırı (mağaza kartı ile aynı gövde) ── */
.tp-row{
  position:relative;
  display:flex; align-items:center; gap:9px;
  padding:5px 9px;
  border-radius:12px;
  background:linear-gradient(180deg, #3d7ccc 0%, #22488f 55%, #152e5e 100%);
  box-shadow:none;
  animation:tpRowIn .3s cubic-bezier(.2,1.2,.35,1) backwards;
}
@keyframes tpRowIn{
  from{ opacity:0; transform:translateY(16px) scale(.94); }
  to  { opacity:1; transform:translateY(0) scale(1); }
}

/* birlik görseli — tabla yok, sadece PNG */
.tp-img{
  position:relative; flex:0 0 54px;
  width:54px; height:54px;
  display:flex; align-items:center; justify-content:center;
}
.tp-img img{
  width:100%; height:100%; object-fit:contain;
  filter:drop-shadow(0 3px 4px rgba(0,10,30,.55));
}
.tp-img .tp-emoji{ font-size:34px; filter:drop-shadow(0 3px 4px rgba(0,10,30,.55)); }

.tp-mid{ flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:0; }
.tp-name{
  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:15px;
  color:#a8e7ff; letter-spacing:1.6px; text-transform:uppercase;
  line-height:1.15;
  text-shadow:0 1px 0 #12305a, 0 2px 3px rgba(0,10,30,.8);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

/* kalın 3B rakam — mağazadaki .sc-left konturu */
.tp-count, .tp-up{
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; color:#fff;
  text-shadow:
    -2px -1px 0 #1d3a63, 2px -1px 0 #1d3a63,
    -2px 2px 0 #1d3a63, 2px 2px 0 #1d3a63,
    0 -2px 0 #1d3a63, 0 2px 0 #1d3a63,
    -2px 0 0 #1d3a63, 2px 0 0 #1d3a63,
    0 3px 0 #142a4a;
}
.tp-count{
  font-size:23px; line-height:1.05; white-space:nowrap;
  letter-spacing:.5px;
  -webkit-text-stroke:1.2px #1d3a63;
  paint-order:stroke fill;
}

/* Geliştir butonu — mağazadaki yeşil .sc-buy */
.tp-up{
  flex:0 0 auto; border:none; cursor:pointer;
  background:linear-gradient(180deg,#6ee07f,#2cab44);
  font-size:12px; letter-spacing:.4px;
  border-radius:9px; padding:7px 16px;
  box-shadow:none;
  transition:transform .06s, box-shadow .06s, filter .1s;
  white-space:nowrap;
  text-shadow:
    -1px -1px 0 #1c6e31, 1px -1px 0 #1c6e31,
    -1px 1px 0 #1c6e31, 1px 1px 0 #1c6e31,
    0 2px 0 #145425;
  -webkit-tap-highlight-color:transparent;
}
.tp-up:hover{ filter:brightness(1.08); }
.tp-up:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none; }

/* sahip olunmayan birlik */
.tp-row.tp-none{ filter:saturate(.35) brightness(.8); }
.tp-row.tp-none .tp-up{ opacity:.5; cursor:not-allowed; }

/* kırmızı kapatma butonu */
.tp-close{
  position:absolute; z-index:45;
  top:calc(8px + env(safe-area-inset-top,0)); right:12px;
  width:36px; height:36px; border:none; cursor:pointer;
  border-radius:11px;
  background:linear-gradient(180deg,#ff7b6b,#e03a2c);
  box-shadow:none;
  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:18px; color:#fff;
  display:flex; align-items:center; justify-content:center; line-height:1;
  text-shadow:0 2px 0 #8e1a11;
  transition:transform .06s, box-shadow .06s, filter .1s;
  -webkit-tap-highlight-color:transparent;
}
.tp-close:hover{ filter:brightness(1.08); }
.tp-close:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none; }

.tp-empty{
  text-align:center; color:#eaf4ff; padding:24px 10px;
  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:13px;
  text-shadow:0 1px 3px rgba(0,30,55,.6);
}
`;
  document.head.appendChild(st);
})();

/* ── 2) KOD ──────────────────────────────────────────────────── */
const TroopTabs = (function () {

  /* "Eğitim" sekme DÜĞMESİ kaldırıldı — eğitim ekranına artık kaleiçindeki
     kışlalardan giriliyor, panel açılışında zaten varsayılan ekran o
     (onOpen → show("train")). Ekranın kendisi ve show("train") duruyor. */
  const TABS = [
    { key: "units", icon: "",  label: "Birlikler" },
  ];

  let active = "train";
  let built = false;
  let tickTimer = null;

  function $(id) { return document.getElementById(id); }
  function money(n) { return (typeof fmt === "function") ? fmt(n) : String(n); }
  function tap(el, fn) { (typeof bindTap === "function") ? bindTap(el, fn) : el.addEventListener("click", fn); }

  /* sekme çubuğunu ve 2. ekranı bir kez kur */
  function build() {
    if (built) return;
    const panel = $("panel-troops");
    const viewer = $("unitViewer");
    if (!panel || !viewer) return;

    const bar = document.createElement("div");
    bar.className = "tp-tabs";
    bar.innerHTML = TABS.map(t =>
      `<button class="tp-tab${t.key === active ? " active" : ""}" data-tab="${t.key}">
         ${t.icon ? `<span class="tp-ico">${t.icon}</span>` : ""}${t.label}
       </button>`).join("");
    viewer.appendChild(bar);
    bar.querySelectorAll(".tp-tab").forEach(btn => tap(btn, () => show(btn.dataset.tab)));

    const screen = document.createElement("div");
    screen.className = "tp-screen";
    screen.id = "tpUnitsScreen";
    screen.innerHTML =
      `<button class="tp-close" id="tpCloseBtn" aria-label="Kapat">✕</button>
       <div class="tp-list" id="tpUnitsList"></div>`;
    viewer.appendChild(screen);

    /* kapatma — bindTap "pointerup" kullandığı için .click() işe yaramaz,
       bu yüzden closeOverlayPanel'i doğrudan çağırıyoruz */
    function doClose() {
      if (typeof closeOverlayPanel === "function") closeOverlayPanel(panel);
      else panel.classList.remove("active");
    }
    const myBtn = screen.querySelector("#tpCloseBtn");
    myBtn.addEventListener("pointerup", doClose);
    myBtn.addEventListener("click", doClose);

    /* panelin kendi ✕ butonuna yedek bağlantı (closeOverlayPanel
       tekrar çağrılsa da zararsız: sadece .active sınıfını kaldırır) */
    panel.querySelectorAll("[data-close]").forEach(b => {
      b.addEventListener("click", doClose);
    });

    built = true;
  }

  function show(key) {
    build();
    active = key;
    const viewer = $("unitViewer");
    const screen = $("tpUnitsScreen");
    if (!viewer || !screen) return;

    viewer.querySelectorAll(".tp-tab").forEach(b =>
      b.classList.toggle("active", b.dataset.tab === key));

    const onUnits = (key === "units");
    viewer.classList.toggle("tp-off", onUnits);
    screen.classList.toggle("is-active", onUnits);

    clearInterval(tickTimer);
    if (onUnits) { render(); tickTimer = setInterval(refreshCounts, 1000); }
  }

  /* birlik listesi */
  function render() {
    const list = $("tpUnitsList");
    if (!list || typeof UNIT_TYPES === "undefined") return;
    if (typeof applyFinishedTraining === "function") applyFinishedTraining();

    /* 18 birlik var ama hepsini listelemek anlamsız: sahip olunanlar
       ve her ailenin Sv1'i görünür, boş kademeler gizlenir. */
    const defs = Object.values(UNIT_TYPES).filter(def =>
      (def.kademe || 1) === 1 ||
      kademeAcikMi(def.aile, def.kademe || 1) ||
      ((state.troops && state.troops[def.id]) || 0) > 0);
    if (!defs.length) { list.innerHTML = `<div class="tp-empty">Tanımlı birlik yok.</div>`; return; }

    list.innerHTML = defs.map((def, i) => {
      const n = (state.troops && state.troops[def.id]) || 0;
      const pic = def.img
        ? `<img src="${def.img}" alt="${def.name}">`
        : `<span class="tp-emoji">${def.icon || "🪖"}</span>`;
      return `
        <div class="tp-row${n > 0 ? "" : " tp-none"}" data-unit="${def.id}" style="animation-delay:${i * 0.05}s">
          <div class="tp-img">${pic}</div>
          <div class="tp-mid">
            <div class="tp-name">${unitAdi(def)}</div>
            <div class="tp-count" data-count="${def.id}">${money(n)}</div>
          </div>
          <button class="tp-up" data-unit="${def.id}">Geliştir</button>
        </div>`;
    }).join("");

    list.querySelectorAll(".tp-up").forEach(btn =>
      tap(btn, () => upgrade(btn.dataset.unit)));
  }

  /* sadece rakamları tazele (DOM'u yeniden çizmeden) */
  function refreshCounts() {
    const list = $("tpUnitsList");
    if (!list) return;
    list.querySelectorAll("[data-count]").forEach(el => {
      const n = (state.troops && state.troops[el.dataset.count]) || 0;
      const txt = money(n);          /* baştaki "x" kaldırıldı */
      if (el.textContent !== txt) el.textContent = txt;
      el.closest(".tp-row").classList.toggle("tp-none", n <= 0);
    });
  }

  /* ── GELİŞTİRME ──
     Birliklerde henüz seviye sistemi yok (heroes.js'teki gibi).
     Seviye/maliyet tablosu belirlenince gövdesi buraya yazılacak. */
  function upgrade(unitId) {
    const def = UNIT_TYPES[unitId];
    if (!def) return;
    if ((state.troops && state.troops[unitId]) > 0) {
      if (typeof showToast === "function") showToast(`${def.name} geliştirme sistemi yakında!`);
    } else {
      if (typeof showToast === "function") showToast(`Önce ${def.name} eğitmelisin.`);
    }
  }

  /* Panel nereden açıldıysa oraya düşer:
       kaleiçindeki kışladan  → Eğitim ekranı (window.KISLA_KILIT dolu)
       alttaki Birlikler tuşu → doğrudan Birlikler listesi
     Eğitim'in sekme DÜĞMESİ yok; ekrana yalnız kışladan giriliyor. */
  function onOpen()  { build(); show(window.KISLA_KILIT ? "train" : "units"); }
  function onClose() { clearInterval(tickTimer); }

  return { onOpen, onClose, show, render };
})();


/* ── OYUNA BAĞLANMA ──────────────────────────────────────────
   Bu dosya ana koddan ÖNCE yüklendiği için openOverlayPanel'i
   sarmalayamayız; panelin açılışını DOM üzerinden izliyoruz. */
document.addEventListener("DOMContentLoaded", function () {
  const panel = document.getElementById("panel-troops");
  if (!panel) return;
  let wasOpen = panel.classList.contains("active");
  new MutationObserver(() => {
    const isOpen = panel.classList.contains("active");
    if (isOpen === wasOpen) return;
    wasOpen = isOpen;
    isOpen ? TroopTabs.onOpen() : TroopTabs.onClose();
  }).observe(panel, { attributes: true, attributeFilter: ["class"] });
  if (wasOpen) TroopTabs.onOpen();
});

/*  ═══════════════════════════════════════════════════════════
    GEREKLİ TEK SEFERLİK HTML DÜZENLEMESİ

    Yukarıdaki "modelScale" ayarının çalışması için ana HTML'de
    3B yükleyicideki şu satırı (yaklaşık 4746. satır):

        const scale = 2.0 / maxDim;

    bununla değiştir:

        const uS = (typeof UNIT_TYPES !== "undefined" && UNIT_TYPES[unit]
                    && UNIT_TYPES[unit].modelScale) || 1;
        const scale = (2.0 * uS) / maxDim;

    Bu düzenlemeyi bir kez yaptıktan sonra tüm birlik boyutlarını
    sadece bu dosyadan (modelScale değerini değiştirerek) ayarlarsın.
    ═══════════════════════════════════════════════════════════ */
