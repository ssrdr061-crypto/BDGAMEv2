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
   3) CANAVAR ARTIK ORDUDUR. Eskiden canavar tek dev gövdeye
      indirgeniyordu (`birlik x stat / 10` ve `/ 2` gibi uydurma
      bölenlerle) ve senin verdiğin statlar savaşa neredeyse hiç
      yansımıyordu. Artık canavar da oyuncu ordusu gibi N birlikten
      oluşur, statlar BİRİM BAŞINA kullanılır, bölen yoktur ve
      canavar hasar aldıkça birlik kaybeder — yani vuruşu da
      savunması da savaş ilerledikçe zayıflar.

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

  /*  ── KADEME DESTEĞİ ────────────────────────────────────────
      troops.js 18 birlik tanımlar (3 aile × 6 kademe). Sabit
      kimlik yerine AİLEYE bakılır; böylece Sv2+ birlikler de
      savaşa girer ve hedeflenir. pvp.js ile aynı mantık.      */
  function AILE(uid) {
    const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[uid] : null;
    return (d && d.aile) || String(uid).replace(/[0-9]+$/, "") || uid;
  }
  function KADEME_NO(uid) {
    const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[uid] : null;
    return (d && (d.kademe || d.level)) || 1;
  }
  /* Kurulum sırası: aile sırası korunur, kademeler Sv1'den yukarı. */
  function SAF_SIRASI() {
    const hepsi = (typeof UNIT_TYPES !== "undefined") ? Object.keys(UNIT_TYPES) : [];
    const out = [];
    ON_SAF.forEach(fam => {
      hepsi.filter(id => AILE(id) === fam)
           .sort((a, b) => KADEME_NO(a) - KADEME_NO(b))
           .forEach(id => out.push(id));
    });
    hepsi.forEach(id => { if (out.indexOf(id) < 0) out.push(id); });
    return out;
  }
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
    SAF_SIRASI().forEach(uid => {
      const d = UT()[uid];
      const n = sayim[uid] || 0;
      if (!d || n <= 0) return;

      /*  Statların TEK KAYNAĞI istatistik katmanıdır (istatistik.js):
          taban + araştırma/kale bonusları. Katman yoksa troops.js'in
          ham değerine düşer — oyun yine çalışır.                    */
      let atk = say(d.attack, 1), def = say(d.defense, 0),
          hp  = say(d.hp, 1),     olum = say(d.olum, 0);
      if (typeof ISTATISTIK !== "undefined" && ISTATISTIK && ISTATISTIK.birim) {
        const b = ISTATISTIK.birim(uid);
        if (b) { atk = b.saldiri; def = b.savunma; hp = b.can; olum = b.olum; }
      }

      birimler.push({
        unitId: uid,
        count: n,
        start: n,
        atk: atk,
        def: def,
        olum: olum,
        /* Can buff'ı birlik canına yansır — eski motorda da böyleydi */
        hpEach: Math.max(1, Math.round(hp * (hpCarpani || 1))),
        /* Yarım kalmış hasar: bir birimi düşürmeye yetmeyen artık */
        artik: 0,
        dusen: 0,
      });
    });
    return birimler;
  }

  /* ── CANAVAR ORDUSU ───────────────────────────────────────────
     `enemy.stat` birim başına stat (seviye çarpanı düğüm şablonunda
     zaten uygulanmış), `enemy.birlik` birlik sayısı. Eski çağrı
     noktaları (stat taşımayan canavar nesnesi) için tek-gövde
     yedeği korunur — o zaman adet 1'dir, davranış eskisi gibidir. */
  function canavarKur(enemy) {
    const st = enemy && enemy.stat;
    const n  = Math.max(1, Math.round(say(enemy.birlik, 0)));
    if (st && say(st.hp, 0) > 0) {
      return {
        ordu: true, adet: n,
        atkBir: Math.max(0, say(st.attack, 1)),
        defBir: Math.max(0, say(st.defense, 0)),
        hpBir:  Math.max(1, say(st.hp, 1)),
      };
    }
    return {
      ordu: false, adet: 1,
      atkBir: Math.max(1, say(enemy.attack, 1)),
      defBir: Math.max(0, say(enemy.defense, 0)),
      hpBir:  Math.max(1, say(enemy.maxHp, 1)),
    };
  }

  function orduSayi(b)   { return b.reduce((s, u) => s + u.count, 0); }
  function orduAtk(b)    { return b.reduce((s, u) => s + u.atk * u.count, 0); }
  function orduDef(b)    { return b.reduce((s, u) => s + u.def * u.count, 0); }
  function orduCan(b)    { return b.reduce((s, u) => s + u.hpEach * u.count, 0); }

  /* ── HASAR FORMÜLÜ ────────────────────────────────────────────
     pvp.js rollDamage ile aynı: savunma hasarın bir kısmını emer,
     ne kadar yüksek olursa olsun minDamagePct kadarı geçer. */
  /*  Ordunun ağırlıklı ortalama öldürücülüğü — ağırlık, o birliğin
      saldırı payıdır: hasarı kim veriyorsa delme de ondan gelir.
      Kahramanın öldürücülüğü yoktur, payı ortalamayı seyreltir.   */
  function orduOlum(b, hamAtk) {
    if (!hamAtk || hamAtk <= 0) return 0;
    let top = 0;
    b.forEach(u => { top += say(u.olum, 0) * (u.atk * u.count); });
    return top / hamAtk;
  }

  /* Öldürücülük → rakip savunmasının yüzde kaçı yok sayılır (0–1).
     Hesap istatistik.js'te; katman yoksa aynı tavan burada uygulanır
     ki iki yerde farklı sayı oluşmasın. */
  function olumDelme(olumDeg) {
    if (!olumDeg || olumDeg <= 0) return 0;
    if (typeof ISTATISTIK !== "undefined" && ISTATISTIK && ISTATISTIK.olumCarpani) {
      return ISTATISTIK.olumCarpani(olumDeg) / 100;
    }
    return Math.min(75, olumDeg * 1.5) / 100;
  }

  function hasarHesapla(hamAtk, hedefDef, ultiSans, ultiCarpan, delme) {
    const c = pvpCfg();
    const defenseFactor = say(c.defenseFactor, 0.35);
    const minDamagePct  = say(c.minDamagePct, 0.12);
    const variance      = say(c.variance, 0.30);
    const damageScale   = say(c.damageScale, 0.35);

    if (hamAtk <= 0) return { dmg: 0, isUlti: false };

    /* Savunma emilimi, saldıranın öldürücülüğü kadar delinir. */
    const emilen = hedefDef * defenseFactor * (1 - (delme || 0));
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

    const sira = HEDEF_SIRASI[AILE(srcKey)] || HEDEF_SIRASI[srcKey] || ON_SAF;
    let kalan = dmg, dusenToplam = 0;

    /* `sira` AİLE listesidir; bir ailenin birden çok kademesi olabilir.
       Ön safta önce ALT kademeler kırılır. */
    const hedefler = [];
    sira.forEach(fam => {
      birimler.filter(x => AILE(x.unitId) === fam)
              .sort((p, q) => KADEME_NO(p.unitId) - KADEME_NO(q.unitId))
              .forEach(x => hedefler.push(x));
    });

    for (const u of hedefler) {
      if (kalan <= 0) break;
      if (orduSayi(birimler) <= taban) break;
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
    let enemyHp = 0;                     /* aşağıdaki okların gördüğü değişken */
    const hpMult = say(hero.hpMult, 1) || 1;
    const birimler = orduKur(troopRoster, hpMult);
    /* Öldürücülük sayacı — savaş raporunda gösterilir */
    const olumFx = { turlar: 0, delmeToplam: 0, kazanc: 0 };

    /* ── MAĞAZA BUFFLARI (buff.js) ────────────────────────────────
       Şans zarları savaş başında bir kez atılır. Yüzdeler taban
       (yenilgi eşiği) hesabından ÖNCE uygulanır. buff.js yoksa
       her şey eskisi gibi çalışır. */
    const BF = window.BUFF || null;
    if (BF) BF.savasBaslat();

    /* Hayalet birlik (Paralı Muhafız) eklenmeden ÖNCEKİ gerçek
       mevcut — hastaneye gidecek yaralı bunu aşamaz. */
    const gercekSayim = {};
    birimler.forEach(u => gercekSayim[u.unitId] = u.count);
    if (BF) BF.orduyaUygula(birimler);

    const baslangicSayi = orduSayi(birimler);
    const combinedMaxHp = Math.max(1, orduCan(birimler));

    /* Yenilgi eşiği: ordunun %55'inden fazlası düşemez */
    const taban = Math.max(0, Math.ceil(baslangicSayi * (1 - PVE.yenilgiEsigi)));

    /* ── KAHRAMAN YETENEKLERİ (eski motordaki davranış korunuyor) ── */
    /* "Artan Aşk" mevcut bir yeteneğin değerini katlar — yetenek
       listesi okunmadan önce büyütülür. */
    const ab = (BF ? BF.yetenekleriBuyut(hero.heroAbilities || []) : (hero.heroAbilities || []));
    const bul = t => ab.find(a => a.type === t);
    let f;

    /* Canavar ordusu. Yetenek etkileri BİRİM BAŞINA statlara
       uygulanır; ordu değerleri her turda ayakta kalan birlikten
       yeniden hesaplanır. */
    const cv = canavarKur(enemy);
    let cAtkBir = cv.atkBir * PVE.canavarAtkCarpani;
    let cDefBir = cv.defBir * PVE.canavarDefCarpani;
    let cHpBir  = cv.hpBir;

    const debuffs = {};
    if ((f = bul("enemy_def_shred_pct")) && f.v) {
      cDefBir *= (1 - f.v / 100);
      debuffs.defShred = f.v;
    }
    if ((f = bul("enemy_hp_atk_reduce_pct"))) {
      const hpR = f.v || 0;
      const atkR = (f.v2 != null ? f.v2 : f.v) || 0;
      cHpBir  *= (1 - hpR / 100);
      cAtkBir *= (1 - atkR / 100);
      debuffs.hpReduce = hpR; debuffs.atkReduce = atkR;
    }
    cAtkBir = Math.max(cv.ordu ? 0 : 1, Math.round(cAtkBir));
    cDefBir = sifirAlti(Math.round(cDefBir));
    cHpBir  = Math.max(1, Math.round(cHpBir));

    const enemyMaxHp = Math.max(1, cv.adet * cHpBir);

    /* Ayakta kalan canavar birliği, kalan candan türer — ayrı sayaç
       tutulmaz, böylece can çubuğu ile birlik sayısı ayrışamaz. */
    const canavarAdet = () => Math.ceil(sifirAlti(enemyHp) / cHpBir);
    const canavarAtk  = () => Math.max(1, canavarAdet() * cAtkBir);
    const canavarDef  = () => canavarAdet() * cDefBir;

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
      const onunGuc  = cv.adet * cAtkBir + cv.adet * cDefBir
                     + Math.round(enemyMaxHp / 4);
      if (onunGuc >= benimGuc * (1 + gap / 100)) gucFarkiAzalt = f.v || 0;
    }

    enemyHp = sifirAlti(enemyMaxHp - instantKilled);

    /* ── SAVAŞ DÖNGÜSÜ ── */
    const rounds = [];
    let turn = 0;
    let toplamVerilen = instantKilled;
    let toplamAlinan = 0;

    while (enemyHp > 0 && orduSayi(birimler) > taban && turn < PVE.maxTur) {
      turn++;

      if (perPct > 0 && turn % perHer === 0) {
        cDefBir = sifirAlti(cDefBir * (1 - perPct / 100));
        perSayi++;
      }

      /* ── OYUNCU VURUŞU ──
         Eski motorda sadece kahraman vuruyordu. Artık her birlik
         kendi saldırısıyla katkı veriyor, kahraman bir katkı daha. */
      const hamAtk = orduAtk(birimler) + say(hero.attack, 0);
      const delme  = olumDelme(orduOlum(birimler, hamAtk));
      const vurus = hasarHesapla(hamAtk, canavarDef(),
                                 say(hero.ultiChance, 0.15),
                                 say(hero.ultiMultiplier, 1.8),
                                 delme);
      /* Raporda gösterilecek: öldürücülük bu savaşta ne kazandırdı? */
      if (delme > 0) {
        olumFx.turlar++;
        olumFx.delmeToplam += delme;
        olumFx.kazanc += canavarDef() * say(pvpCfg().defenseFactor, 0.35)
                       * delme * say(pvpCfg().damageScale, 0.35);
      }
      /* Buff: ilk turlar / rastgele turlar / robot periyodu.
         Robot payı, robotların bu turdaki saldırı oranıdır. */
      if (BF) {
        /* Robot payı: TÜM robot kademelerinin bu turdaki saldırı oranı */
        const rAtk = birimler.reduce((t, u) =>
          t + (AILE(u.unitId) === "robot" ? u.atk * u.count : 0), 0);
        const pay = (hamAtk > 0) ? rAtk / hamAtk : 0;
        const rc = BF.turHasar(turn, pay);
        if (rc !== 1) vurus.dmg = Math.max(1, Math.round(vurus.dmg * rc));
      }
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
      const gelen = hasarHesapla(canavarAtk(), savunma,
                                 say(enemy.ultiChance, 0),
                                 say(enemy.ultiMultiplier, 1.8));

      let inc = gelen.dmg;
      if (gucFarkiAzalt > 0) inc = Math.round(inc * (1 - gucFarkiAzalt / 100));
      if (BF) {                                   /* kalkan / periyodik azaltma */
        const ac = BF.turAlinan(turn);
        if (ac !== 1) inc = Math.max(0, Math.round(inc * ac));
      }

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
    /* Hayalet birlikler hastaneye gitmez: yaralı sayısı, savaşa
       GERÇEKTEN götürülen mevcudu aşamaz. */
    birimler.forEach(u => {
      const sinir = gercekSayim[u.unitId] || 0;
      if (u.dusen > sinir) u.dusen = sinir;
    });

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

    /* Buff tek kullanımlıktır: savaş çözüldü, tüketildi. */
    if (BF) BF.savasBitti();

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
        canavarBirlik: cv.adet,
        canavarKalan: canavarAdet(),
        canavarStatBir: { attack: cAtkBir, defense: cDefBir, hp: cHpBir },
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
