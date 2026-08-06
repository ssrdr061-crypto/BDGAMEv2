/* ═══════════════════════════════════════════════════════════════
   pve.js — CANAVAR SAVAŞI MOTORU (PvE)
   ---------------------------------------------------------------
   Kurulum sırası (index.html sonu):
       <script src="pvp.js"></script>
       <script src="pve.js"></script>     ← BUNU EKLE
   Başka hiçbir dosyaya dokunmaz.

   ── NEDEN VAR ──
   Eski simulateBattle (index.html içinde) birlikleri sadece bir CAN
   HAVUZU sayıyordu: hasarı yalnızca kahraman veriyordu, birliklerin
   attack/defense değerleri hiç kullanılmıyordu. 100 şövalye ile
   100 robot arasındaki tek fark can oluyordu.

   Bu dosya window.simulateBattle'ı devralır ve savaşı pvp.js'in
   matematiğiyle çözer. Dönen nesne ESKİSİYLE AYNI BİÇİMDEDİR, bu
   yüzden savaş raporu ekranında hiçbir değişiklik gerekmedi.

   ── PvP'DEN KASITLI FARKLAR ──
   1) ÖLÜM YOK. Düşen her birlik hastaneye gider. (PvP'de CFG.deathPct
      kadarı kalıcı ölür.)
   2) YENİLGİ EŞİĞİ. Ordunun %55'inden fazlası düşerse canavar
      yenilmemiş sayılır — canavar ölse bile. Savaş o anda da biter,
      yani kayıp %55'i aşmaz.
   3) CANAVAR TEK VARLIKTIR. pvp.js ordu-vs-ordu çalışır ve "birliği
      olmayan savunmacı hiç vurmaz" kuralı yüzünden canavar oraya
      doğrudan verilemez. Bu yüzden hasar formülleri ödünç alınıp
      canavar tek bir varlık olarak modellenmiştir.

   ── ESKİ DAVRANIŞA DÖNÜŞ ──
   index.html'den bu satırı silmek yeterli; eski simulateBattle
   olduğu yerde duruyor ve tekrar devreye girer.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── AYARLAR ──────────────────────────────────────────────────
     Hasar formülü değerleri pvp.js'ten okunur (window.PVP.config),
     böylece dengeyi tek yerden ayarlarsın. pvp.js yüklenmemişse
     aynı varsayılanlara düşer. */
  function pvpCfg() {
    return (window.PVP && window.PVP.config) ? window.PVP.config : {};
  }

  const PVE = {
    /* Ordunun bu oranından fazlası düşerse YENİLGİ. Savaş da burada
       biter, yani kayıp bu oranı aşmaz. */
    yenilgiEsigi: 0.55,

    /* Tur sınırı. Dolarsa savaş berabere biter; canavar sağ kalırsa
       yenilgidir. */
    maxTur: 30,

    /* Canavar dengesi. PvE'yi PvP'den ayrı ayarlamak istersen bu iki
       çarpanı kullan — pvp.js'e dokunmadan. */
    canavarAtkCarpani: 1.0,
    canavarDefCarpani: 1.0,
  };

  /* Hedef önceliği — pvp.js'teki TARGET_ORDER ile AYNI olmalı.
     pvp.js onu dışa açmadığı için burada tekrar tanımlı; birini
     değiştirirsen diğerini de değiştir. */
  const ON_SAF = ["knight", "soldier", "robot"];
  const HEDEF_SIRASI = {
    knight:  ["soldier", "robot",   "knight"],
    soldier: ["robot",   "knight",  "soldier"],
    robot:   ["knight",  "soldier", "robot"],
  };

  function UT() {
    return (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES : {};
  }
  function say(v, d) {
    return (typeof v === "number" && isFinite(v)) ? v : (d || 0);
  }
  function sifirAlti(n) { return Math.max(0, n); }

  /* ── ORDU KURULUMU ────────────────────────────────────────────
     troopRoster her birlik için AYRI bir kayıt tutuyor (100 şövalye
     = 100 eleman). Bunu tipe göre sayıya çeviriyoruz; savaş tip
     bazında hesaplanır, rapor yine tek tek verilir. */
  function orduKur(troopRoster, hpCarpani) {
    const sayim = {};
    (troopRoster || []).forEach(t => {
      if (!t || !t.unitId) return;
      sayim[t.unitId] = (sayim[t.unitId] || 0) + 1;
    });

    const birimler = [];
    ON_SAF.forEach(uid => {
      const d = UT()[uid];
      const n = sayim[uid] || 0;
      if (!d || n <= 0) return;
      birimler.push({
        unitId: uid,
        count: n,
        start: n,
        atk: say(d.attack, 1),
        def: say(d.defense, 0),
        /* Can buff'ı birlik canına yansır — eski motorda da böyleydi */
        hpEach: Math.max(1, Math.round(say(d.hp, 1) * (hpCarpani || 1))),
        /* Yarım kalmış hasar: bir birimi düşürmeye yetmeyen artık */
        artik: 0,
        dusen: 0,
      });
    });
    return birimler;
  }

  function orduSayi(b)   { return b.reduce((s, u) => s + u.count, 0); }
  function orduAtk(b)    { return b.reduce((s, u) => s + u.atk * u.count, 0); }
  function orduDef(b)    { return b.reduce((s, u) => s + u.def * u.count, 0); }
  function orduCan(b)    { return b.reduce((s, u) => s + u.hpEach * u.count, 0); }

  /* ── HASAR FORMÜLÜ ────────────────────────────────────────────
     pvp.js rollDamage ile aynı: savunma hasarın bir kısmını emer,
     ne kadar yüksek olursa olsun minDamagePct kadarı geçer. */
  function hasarHesapla(hamAtk, hedefDef, ultiSans, ultiCarpan) {
    const c = pvpCfg();
    const defenseFactor = say(c.defenseFactor, 0.35);
    const minDamagePct  = say(c.minDamagePct, 0.12);
    const variance      = say(c.variance, 0.30);
    const damageScale   = say(c.damageScale, 0.35);

    if (hamAtk <= 0) return { dmg: 0, isUlti: false };

    const emilen = hedefDef * defenseFactor;
    let dmg = Math.max(hamAtk * minDamagePct, hamAtk - emilen) * damageScale;
    dmg *= (1 - variance / 2) + Math.random() * variance;

    let isUlti = false;
    if (ultiSans > 0 && Math.random() < ultiSans) {
      dmg *= (ultiCarpan || 1.8);
      isUlti = true;
    }
    return { dmg: Math.max(1, Math.round(dmg)), isUlti };
  }

  /* ── HASARI ORDUYA DAĞIT ──────────────────────────────────────
       Eski motor birlikleri dizi sırasıyla dolduruyordu: hep aynı tip
       yaralanıyordu. Artık pvp.js'teki gibi hedef önceliği var ve
       öncelikli tip biterse sıradakine TAŞAR.

       taban: ordu bu sayıya inince kırım durur (yenilgi eşiği).
              Artan hasar boşa gider, böylece eşik AŞILMAZ. */
  function hasariDagit(birimler, srcKey, dmg, taban) {
    if (dmg <= 0) return 0;

    const sira = HEDEF_SIRASI[srcKey] || ON_SAF;
    let kalan = dmg, dusenToplam = 0;

    for (const uid of sira) {
      if (kalan <= 0) break;
      if (orduSayi(birimler) <= taban) break;

      const u = birimler.find(x => x.unitId === uid);
      if (!u || u.count <= 0) continue;

      /* Bu tipe verilebilecek en fazla hasar */
      const tavan = u.count * u.hpEach - u.artik;
      const verilen = Math.min(kalan, tavan);
      kalan -= verilen;

      u.artik += verilen;
      let dusen = Math.floor(u.artik / u.hpEach);

      /* Yenilgi eşiğini aşma: fazlası boşa gider */
      const yer = orduSayi(birimler) - taban;
      if (dusen > yer) dusen = Math.max(0, yer);

      if (dusen > 0) {
        u.count -= dusen;
        u.dusen += dusen;
        u.artik -= dusen * u.hpEach;
        dusenToplam += dusen;
      }
    }
    return dusenToplam;
  }

  /* ═════════════════════════════════════════════════════════════
     ANA SİMÜLASYON
     Girdi ve çıktı biçimi eski simulateBattle ile birebir aynı.
     ═════════════════════════════════════════════════════════════ */
  function simulateBattlePvE(hero, enemy, troopRoster) {
    const hpMult = say(hero.hpMult, 1) || 1;
    const birimler = orduKur(troopRoster, hpMult);

    const baslangicSayi = orduSayi(birimler);
    const combinedMaxHp = Math.max(1, orduCan(birimler));

    /* Yenilgi eşiği: ordunun %55'inden fazlası düşemez */
    const taban = Math.max(0, Math.ceil(baslangicSayi * (1 - PVE.yenilgiEsigi)));

    /* ── KAHRAMAN YETENEKLERİ (eski motordaki davranış korunuyor) ── */
    const ab = hero.heroAbilities || [];
    const bul = t => ab.find(a => a.type === t);
    let f;

    let enemyAtk  = say(enemy.attack, 1)  * PVE.canavarAtkCarpani;
    let enemyDef  = say(enemy.defense, 0) * PVE.canavarDefCarpani;
    let enemyMaxHp = say(enemy.maxHp, 1);

    const debuffs = {};
    if ((f = bul("enemy_def_shred_pct")) && f.v) {
      enemyDef *= (1 - f.v / 100);
      debuffs.defShred = f.v;
    }
    if ((f = bul("enemy_hp_atk_reduce_pct"))) {
      const hpR = f.v || 0;
      const atkR = (f.v2 != null ? f.v2 : f.v) || 0;
      enemyMaxHp *= (1 - hpR / 100);
      enemyAtk   *= (1 - atkR / 100);
      debuffs.hpReduce = hpR; debuffs.atkReduce = atkR;
    }
    enemyAtk   = Math.max(1, Math.round(enemyAtk));
    enemyDef   = sifirAlti(Math.round(enemyDef));
    enemyMaxHp = Math.max(1, Math.round(enemyMaxHp));

    /* Yasak Büyüler: canavarın %v'si anında erir */
    let instantKilled = 0;
    if ((f = bul("enemy_instant_casualty")) && f.v) {
      instantKilled = Math.round(enemyMaxHp * f.v / 100);
    }

    /* Buz Engelleri: canavar ilk N tur donuk */
    let donukTur = 0, donukIlk = 0;
    if ((f = bul("enemy_freeze_turns"))) {
      const yedek = (f.effect && f.effect.fallbackTurns) || 1;
      const sans  = (f.chance != null ? f.chance : 100);
      donukTur = (Math.random() * 100 < sans) ? (f.v || yedek) : yedek;
      donukIlk = donukTur;
    }

    /* Çelik Yansıması */
    const yansimaPct = ((f = bul("damage_reflect_pct")) && f.v) ? f.v : 0;
    let yansimaToplam = 0;

    /* Yıldırım Fırtınası: periyodik savunma kırma */
    const perAb  = bul("periodic_def_reduce_pct");
    const perPct = (perAb && perAb.v) ? perAb.v : 0;
    const perHer = (perAb && perAb.effect && perAb.effect.everyTurns) || 2;
    let perSayi = 0;

    /* Derin İstihbarat: çok güçlü canavara karşı alınan hasar azalır */
    let gucFarkiAzalt = 0;
    if ((f = bul("power_gap_cap"))) {
      const gap = (f.effect && f.effect.triggerGapPct) || 50;
      const benimGuc = orduAtk(birimler) + orduDef(birimler)
                     + say(hero.attack, 0) + say(hero.defense, 0)
                     + Math.round(combinedMaxHp / 4);
      const onunGuc  = enemyAtk + enemyDef + Math.round(enemyMaxHp / 4);
      if (onunGuc >= benimGuc * (1 + gap / 100)) gucFarkiAzalt = f.v || 0;
    }

    let enemyHp = sifirAlti(enemyMaxHp - instantKilled);

    /* ── SAVAŞ DÖNGÜSÜ ── */
    const rounds = [];
    let turn = 0;
    let toplamVerilen = instantKilled;
    let toplamAlinan = 0;

    while (enemyHp > 0 && orduSayi(birimler) > taban && turn < PVE.maxTur) {
      turn++;

      if (perPct > 0 && turn % perHer === 0) {
        enemyDef = sifirAlti(Math.round(enemyDef * (1 - perPct / 100)));
        perSayi++;
      }

      /* ── OYUNCU VURUŞU ──
         Eski motorda sadece kahraman vuruyordu. Artık her birlik
         kendi saldırısıyla katkı veriyor, kahraman bir katkı daha. */
      const hamAtk = orduAtk(birimler) + say(hero.attack, 0);
      const vurus = hasarHesapla(hamAtk, enemyDef,
                                 say(hero.ultiChance, 0.15),
                                 say(hero.ultiMultiplier, 1.8));
      enemyHp = sifirAlti(enemyHp - vurus.dmg);
      toplamVerilen += vurus.dmg;
      rounds.push({
        side: "hero", dmg: vurus.dmg, isUlti: vurus.isUlti,
        enemyHpAfter: enemyHp, heroHpAfter: orduCanKalan(birimler),
      });
      if (enemyHp <= 0) break;

      /* ── CANAVAR VURUŞU ── */
      if (donukTur > 0) {
        donukTur--;
        rounds.push({
          side: "enemy", dmg: 0, frozen: true,
          enemyHpAfter: enemyHp, heroHpAfter: orduCanKalan(birimler),
        });
        continue;
      }

      /* Birliklerin savunması artık gerçekten sayılıyor */
      const savunma = orduDef(birimler) + say(hero.defense, 0);
      const gelen = hasarHesapla(enemyAtk, savunma,
                                 say(enemy.ultiChance, 0),
                                 say(enemy.ultiMultiplier, 1.8));

      let inc = gelen.dmg;
      if (gucFarkiAzalt > 0) inc = Math.round(inc * (1 - gucFarkiAzalt / 100));

      /* Canavar sınıfsızdır → ön saf sırasıyla vurur */
      hasariDagit(birimler, "front", inc, taban);
      toplamAlinan += inc;

      if (yansimaPct > 0 && inc > 0) {
        const y = Math.max(1, Math.round(inc * yansimaPct / 100));
        enemyHp = sifirAlti(enemyHp - y);
        yansimaToplam += y;
        toplamVerilen += y;
      }

      rounds.push({
        side: "enemy", dmg: inc, isUlti: gelen.isUlti,
        reflected: (yansimaPct > 0),
        enemyHpAfter: enemyHp, heroHpAfter: orduCanKalan(birimler),
      });
    }

    /* ── SONUÇ ──
       Zafer için İKİ şart: canavar ölecek VE ordunun %55'inden
       fazlası düşmemiş olacak. */
    const dusenToplam = baslangicSayi - orduSayi(birimler);
    const kayipOrani = baslangicSayi > 0 ? dusenToplam / baslangicSayi : 0;
    const win = (enemyHp <= 0) && (kayipOrani <= PVE.yenilgiEsigi);

    /* ── YARALILAR ──
       PvE'de ÖLÜM YOK: düşen her birlik hastaneye gider. */
    const troopsWoundedByUnit = {};
    birimler.forEach(u => {
      if (u.dusen <= 0) return;
      const liste = [];
      for (let i = 0; i < u.dusen; i++) {
        liste.push({ remainingHp: 0, maxHp: u.hpEach, severe: true });
      }
      troopsWoundedByUnit[u.unitId] = liste;
    });

    let troopsWounded = Object.values(troopsWoundedByUnit)
      .reduce((a, arr) => a + arr.length, 0);

    /* İvanovna "Birliklerin Sevgilisi": yaralıların %v'si geri döner */
    let woundedReturned = 0;
    const wr = bul("wounded_return_pct");
    if (wr && wr.v && troopsWounded > 0) {
      woundedReturned = troopsWounded - Math.round(troopsWounded * (1 - wr.v / 100));
      let kalan = woundedReturned;
      Object.keys(troopsWoundedByUnit).forEach(uid => {
        const arr = troopsWoundedByUnit[uid];
        while (kalan > 0 && arr.length > 0) { arr.shift(); kalan--; }
        if (arr.length === 0) delete troopsWoundedByUnit[uid];
      });
      troopsWounded = Object.values(troopsWoundedByUnit)
        .reduce((a, arr) => a + arr.length, 0);
    }

    const kalanCan = orduCanKalan(birimler);

    return {
      rounds, win,
      heroHpLost: 0,                 /* kahramanın kendi canı yok */
      heroHpFinal: kalanCan,
      heroMaxHpEff: combinedMaxHp,
      enemyHpFinal: enemyHp,
      turns: turn,
      totalDamageDealtToEnemy: toplamVerilen,
      totalDamageTakenByHero: 0,
      totalDamageAbsorbedByTroops: toplamAlinan,
      totalDamageTaken: toplamAlinan,

      troopsLost: 0,                 /* PvE'de kalıcı ölüm YOK */
      troopsLostByUnit: {},
      troopsWounded, troopsWoundedByUnit,

      heroUltiTriggers:  rounds.filter(r => r.side === "hero"  && r.isUlti).length,
      enemyUltiTriggers: rounds.filter(r => r.side === "enemy" && r.isUlti).length,

      enemyDebuffs: debuffs, woundedReturned, activeBuffs: ab,
      flowFx: {
        freezeTurns: donukIlk,
        reflectTotal: yansimaToplam,
        periodicCount: perSayi,
        instantKilled,
        dmgReduceVsStronger: gucFarkiAzalt,
      },

      /* Rapor ekranı kullanmıyor ama hata ayıklarken çok işe yarar */
      pveInfo: {
        baslangicSayi, dusenToplam,
        kayipYuzde: Math.round(kayipOrani * 100),
        yenilgiEsigi: Math.round(PVE.yenilgiEsigi * 100),
        esikSebebi: (enemyHp <= 0 && !win) ? "kayip_esigi_asildi" : null,
      },
    };
  }

  /* Ayakta kalan birliklerin toplam canı — rapordaki "kalan can"
     çubuğu bunu gösteriyor. */
  function orduCanKalan(birimler) {
    return birimler.reduce((s, u) => s + (u.count * u.hpEach - u.artik), 0);
  }

  /* ── DEVRAL ──
     Eski simulateBattle bir fonksiyon bildirimi olduğu için window
     üzerinde duruyor; üzerine yazıyoruz. Bu dosya kaldırılırsa eski
     davranış kendiliğinden geri gelir. */
  window.simulateBattlePvEOld = window.simulateBattle;
  window.simulateBattle = simulateBattlePvE;

  /* Konsoldan denge ayarı: PVE.ayar.yenilgiEsigi = 0.6; gibi */
  window.PVE = { ayar: PVE, simulate: simulateBattlePvE };

  console.log("[pve.js] Canavar savaşı pvp.js matematiğine bağlandı —",
              "ölüm yok, yenilgi eşiği %" + Math.round(PVE.yenilgiEsigi * 100));
})();
