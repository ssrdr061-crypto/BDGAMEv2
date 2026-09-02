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
     Canavar artık TEK GÖVDE DEĞİL, oyuncu ordusuyla aynı cinsten
     bir birlik listesidir. Kaynak `enemy.bilesim` (dugum.js):
     { knight4: 800, soldier4: 800, robot4: 800 } gibi.

     Statlar HAM `UNIT_TYPES`'tan okunur — `ISTATISTIK` katmanı
     BİLEREK atlanır: o katman oyuncunun araştırma ve kale
     bonuslarıdır, canavarın onlarla işi yoktur.

     Kısmi hasarlı düğüm: `enemy.kalan / enemy.birlik` oranıyla her
     aile ölçeklenir. Oran 0'a yaklaşsa bile var olan aile en az 1
     birlikle durur, yoksa canavar sıfır orduyla doğar.

     GERİYE UYUM: `bilesim` taşımayan eski çağrı noktaları için
     (stat/attack/maxHp taşıyan düz nesne) tek birimlik sentetik
     liste üretilir; davranış eskisi gibidir. */
  function canavarKur(enemy) {
    const bilesim = (enemy && enemy.bilesim) || null;
    const toplam  = Math.max(0, Math.round(say(enemy && enemy.birlik, 0)));
    const kalan   = (enemy && typeof enemy.kalan === "number")
                      ? Math.max(0, enemy.kalan) : toplam;
    const oran    = (toplam > 0) ? Math.min(1, kalan / toplam) : 1;

    const birimler = [];
    if (bilesim) {
      SAF_SIRASI().forEach(uid => {
        const tam = Math.max(0, Math.round(say(bilesim[uid], 0)));
        if (tam <= 0) return;
        const n = Math.max(1, Math.round(tam * oran));
        const d = UT()[uid] || {};
        birimler.push({
          unitId: uid,
          count: n,
          start: n,
          atk:   say(d.attack, 1),
          def:   say(d.defense, 0),
          olum:  say(d.olum, 0),
          hpEach: Math.max(1, Math.round(say(d.hp, 1))),
          artik: 0,
          dusen: 0,
        });
      });
    }
    if (birimler.length) return birimler;

    /* ── ESKİ BİÇİM YEDEĞİ ── */
    const st = enemy && enemy.stat;
    const n  = Math.max(1, Math.round(say(enemy && enemy.birlik, 0)));
    if (st && say(st.hp, 0) > 0) {
      return [{
        unitId: "canavar", count: n, start: n,
        atk:  Math.max(0, say(st.attack, 1)),
        def:  Math.max(0, say(st.defense, 0)),
        olum: 0,
        hpEach: Math.max(1, Math.round(say(st.hp, 1))),
        artik: 0, dusen: 0,
      }];
    }
    return [{
      unitId: "canavar", count: 1, start: 1,
      atk:  Math.max(1, say(enemy && enemy.attack, 1)),
      def:  Math.max(0, say(enemy && enemy.defense, 0)),
      olum: 0,
      hpEach: Math.max(1, Math.round(say(enemy && enemy.maxHp, 1))),
      artik: 0, dusen: 0,
    }];
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

    /* Üstünlük çemberi (troops.js → CEMBER). Kaynak artık HER İKİ
       tarafta da gerçek bir birlik kimliğidir — canavarın da ailesi
       vardır. "front" yalnız sahipsiz hasar içindir (yansıma, anında
       yok etme); o çarpansız kalır. */
    const kaynak = (srcKey === "front" || srcKey === "enemy")
      ? "" : AILE(srcKey);
    const carpani = (fam) => {
      try {
        if (typeof cemberCarpani === "function") return cemberCarpani(kaynak, fam);
      } catch (e) {}
      return 1;
    };

    /* `sira` AİLE listesidir; bir ailenin birden çok kademesi olabilir.
       Ön safta önce ALT kademeler kırılır. */
    const hedefler = [];
    sira.forEach(fam => {
      const c = carpani(fam);
      birimler.filter(x => AILE(x.unitId) === fam)
              .sort((p, q) => KADEME_NO(p.unitId) - KADEME_NO(q.unitId))
              .forEach(x => hedefler.push({ u: x, carp: c }));
    });

    for (const h of hedefler) {
      if (kalan <= 0) break;
      if (orduSayi(birimler) <= taban) break;
      const u = h && h.u;
      if (!u || u.count <= 0) continue;

      /* Çember: hasarı çarpmak yerine birim canının maliyetini böl —
         havuz sıradaki aileye şişmeden geçsin. */
      const can = Math.max(1, Math.round(u.hpEach / (h.carp || 1)));

      /* Bu tipe verilebilecek en fazla hasar */
      const tavan = u.count * can - u.artik;
      const verilen = Math.min(kalan, tavan);
      kalan -= verilen;

      u.artik += verilen;
      let dusen = Math.floor(u.artik / can);

      /* Yenilgi eşiğini aşma: fazlası boşa gider */
      const yer = orduSayi(birimler) - taban;
      if (dusen > yer) dusen = Math.max(0, yer);

      if (dusen > 0) {
        u.count -= dusen;
        u.dusen += dusen;
        u.artik -= dusen * can;
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

    /* Kahraman stat bonusları (gelistir.js) — buff ile aynı noktada */
    if (typeof window.kahramanStatUygula === "function") {
      let _skins = [];
      try {
        if (typeof selectedCommanders !== "undefined" && Array.isArray(selectedCommanders)) {
          _skins = selectedCommanders.filter(Boolean);
        } else if (typeof state !== "undefined" && state && Array.isArray(state.selectedCommanders)) {
          _skins = state.selectedCommanders.filter(Boolean);
        }
      } catch (e) {}
      /*  KÖK HATA: kahramanStatUygula `u.hp` alanına yazar, ama
          PvE birimlerinde can alanının adı `hpEach`. Bonus var
          olmayan bir alana yazılıp kayboluyordu — canavar savaşında
          kahramanın CAN bonusu hiç işlemiyordu (pvp.js'te işliyor).
          Alanı geçici olarak açıp sonucu geri yazıyoruz.          */
      birimler.forEach(u => { u.hp = u.hpEach; });
      window.kahramanStatUygula(birimler, _skins);
      birimler.forEach(u => {
        u.hpEach = Math.max(1, Math.round(u.hp));
        delete u.hp;
      });
    }

    const baslangicSayi = orduSayi(birimler);
    const combinedMaxHp = Math.max(1, orduCan(birimler));

    /* ── RAPOR STAT DÖKÜMÜ ────────────────────────────────────────
       Biçim pvp.js `_orduStat` ile BİREBİR aynıdır; tema.js'teki
       `statKarsiHTML` iki motoru da aynı kodla okusun diye.
       `atk/def/hp/olum` savaşta kullanılan GERÇEK stat (istatistik
       katmanı + buff + kahraman bonusu işlenmiş), `t*` troops.js'teki
       HAM taban. Rapor ikisini oranlayıp "+%kaç" üretir.

       Ölçüm BURADA alınır — savaş turları başlamadan önce, tıpkı
       pvp.js'te olduğu gibi. Sonra alınsaydı ölen birlikler dökümden
       düşer, yüzdeler ordu büyüklüğüne göre kayardı.

       SAVUNAN TARAF BOŞ: canavarın ailesi yoktur, Savunucu/Koruyucu/
       Nişancı satırlarında sağ sütun "—" görünür. Nesne yine de
       verilir; `statKarsiHTML` iki taraf da yoksa hiç çizmiyor.    */
    /* Canavar ordusu BURADA kurulur — `_statOzet` aşağıda hem
       sayısını hem birlik dökümünü okuyor. Tanım daha aşağıdaydı ve
       `const` ölü bölgesi yüzünden her canavar savaşı burada
       "Cannot access ... before initialization" ile çöküyordu; sefer
       varışı bu istisnayla askıda kalıyordu. Kullanımdan ÖNCE
       tanımlanmalı. */
    const cBirimler  = canavarKur(enemy);
    const cBaslangic = orduSayi(cBirimler);

    const _statOzet = {
      attacker: {
        sayi: baslangicSayi,
        birimler: birimler.filter(u => (u.start || 0) > 0).map(u => {
          const d = UT()[u.unitId] || {};
          return {
            unitId: u.unitId,
            aile: AILE(u.unitId),
            ad: d.name || u.unitId,
            sayi: u.start,
            atk:  Math.round((u.atk    || 0) * 100) / 100,
            def:  Math.round((u.def    || 0) * 100) / 100,
            hp:   Math.round((u.hpEach || 0) * 100) / 100,
            olum: Math.round((u.olum   || 0) * 100) / 100,
            tatk:  d.attack  || 0,
            tdef:  d.defense || 0,
            thp:   d.hp      || 0,
            tolum: d.olum    || 0
          };
        })
      },
      /* SAVUNAN TARAF ARTIK DOLU: canavarın da aileleri var, rapor
         sağ sütunu çizebiliyor. Canavarda araştırma/kale bonusu
         yoktur, o yüzden gerçek stat ile ham taban AYNIDIR —
         yüzdeler doğal olarak "—" görünür. */
      defender: {
        sayi: cBaslangic,
        birimler: cBirimler.filter(u => (u.start || 0) > 0).map(u => {
          const d = UT()[u.unitId] || {};
          return {
            unitId: u.unitId,
            aile: AILE(u.unitId),
            ad: d.name || u.unitId,
            sayi: u.start,
            atk:  Math.round((u.atk    || 0) * 100) / 100,
            def:  Math.round((u.def    || 0) * 100) / 100,
            hp:   Math.round((u.hpEach || 0) * 100) / 100,
            olum: Math.round((u.olum   || 0) * 100) / 100,
            tatk:  d.attack  || 0,
            tdef:  d.defense || 0,
            thp:   d.hp      || 0,
            tolum: d.olum    || 0
          };
        })
      }
    };

    /*  KAHRAMAN YILDIZLARI — pvp.js ile BİREBİR AYNI BİÇİM.
        Rapor (tema.js heroChip/heroSvOf) yıldızları
        `statlar.attacker.seviyeler` haritasından okur: { heroId: sv }.
        PvE bu alanı hiç yazmıyordu, o yüzden canavar raporlarında
        yıldızlar çizilmiyordu. Canavarın kahramanı yok, savunan
        tarafta harita boş kalır.                                   */
    const _kendiSv = (typeof state !== "undefined" && state.heroLevels &&
                      typeof state.heroLevels === "object") ? state.heroLevels : {};
    const _atkSkins = (typeof selectedCommanders !== "undefined" &&
                       Array.isArray(selectedCommanders))
      ? selectedCommanders.filter(Boolean) : [];
    _statOzet.attacker.seviyeler = _atkSkins.reduce(function (o, id) {
      o[id] = Math.floor(_kendiSv[id] || 1); return o;
    }, {});
    _statOzet.defender.seviyeler = {};

    /* Yenilgi eşiği: ordunun %55'inden fazlası düşemez */
    const taban = Math.max(0, Math.ceil(baslangicSayi * (1 - PVE.yenilgiEsigi)));

    /* ── KAHRAMAN YETENEKLERİ (eski motordaki davranış korunuyor) ── */
    /* "Artan Aşk" mevcut bir yeteneğin değerini katlar — yetenek
       listesi okunmadan önce büyütülür. */
    const ab = (BF ? BF.yetenekleriBuyut(hero.heroAbilities || []) : (hero.heroAbilities || []));
    const bul = t => ab.find(a => a.type === t);
    let f;

    /* Canavar ordusu. Denge çarpanları ve kahraman debuff'ları
       BİRİM BAŞINA statlara uygulanır; ordu değerleri her turda
       ayakta kalan birlikten yeniden hesaplanır. */
    cBirimler.forEach(u => {
      u.atk = Math.max(0, u.atk * PVE.canavarAtkCarpani);
      u.def = Math.max(0, u.def * PVE.canavarDefCarpani);
    });

    const debuffs = {};
    if ((f = bul("enemy_def_shred_pct")) && f.v
        && Math.random() * 100 < (((f.effect && f.effect.chance) != null) ? f.effect.chance
                                  : (f.chance != null ? f.chance : 100))) {
      cBirimler.forEach(u => { u.def *= (1 - f.v / 100); });
      debuffs.defShred = f.v;
    }
    if ((f = bul("enemy_hp_atk_reduce_pct"))) {
      const hpR = f.v || 0;
      const atkR = (f.v2 != null ? f.v2 : f.v) || 0;
      cBirimler.forEach(u => {
        u.hpEach *= (1 - hpR / 100);
        u.atk    *= (1 - atkR / 100);
      });
      debuffs.hpReduce = hpR; debuffs.atkReduce = atkR;
    }
    cBirimler.forEach(u => {
      u.atk    = sifirAlti(Math.round(u.atk));
      u.def    = sifirAlti(Math.round(u.def));
      u.hpEach = Math.max(1, Math.round(u.hpEach));
    });

    const enemyMaxHp = Math.max(1, orduCan(cBirimler));

    /* CANAVARIN DA YENİLGİ EŞİĞİ VAR — oyuncununkiyle aynı oran.
       Ordusunun %55'i düşünce canavar bozulur; kalan birlik
       haritadan kalkar (dugum.js canavarYen düğümü tümden tüketir,
       kısmi kalıntı bırakmaz). */
    const cTaban = Math.max(0, Math.ceil(cBaslangic * (1 - PVE.yenilgiEsigi)));

    /* Ordu değerleri listeden türer — ayrı sayaç tutulmaz, böylece
       can çubuğu ile birlik sayısı ayrışamaz. */
    const canavarCan  = () => orduCanKalan(cBirimler);
    const canavarAdet = () => orduSayi(cBirimler);
    const canavarAtk  = () => Math.max(1, orduAtk(cBirimler));
    const canavarDef  = () => orduDef(cBirimler);

    /* ── ÖLDÜRME KAYDI ────────────────────────────────────────────
       Hasar artık KAYNAK BİRLİK BAŞINA dağıtıldığı için kimin kaç
       tane düşürdüğü tahmin edilmiyor, sayılıyor. */
    const _attrib  = {};   /* oyuncu birliği → düşürdüğü canavar   */
    const _attribD = {};   /* canavar birliği → düşürdüğü oyuncu   */

    function _yaz(tablo, uid, alan, n) {
      if (n <= 0) return;
      if (!tablo[uid]) tablo[uid] = { killed: 0, wounded: 0 };
      tablo[uid][alan] += n;
    }

    /* Bir orduyu, saldıran ordunun her birliği adına AYRI AYRI
       vurur. Böylece hedef sırası (HEDEF_SIRASI) ve üstünlük
       çemberi gerçekten işler, öldürme kaydı da kesin olur.
       Pay dağıtımında yuvarlama artığı SON birliğe yazılır ki
       toplam hasar birebir tutsun. */
    function dagitKaynakli(hedefOrdu, kaynakOrdu, dmg, hedefTaban, kayit) {
      if (dmg <= 0) return 0;
      const liste = kaynakOrdu.filter(u => u.count > 0 && u.atk > 0);
      const toplamPay = liste.reduce((s, u) => s + u.atk * u.count, 0);
      if (!liste.length || toplamPay <= 0) {
        return hasariDagit(hedefOrdu, "front", dmg, hedefTaban);
      }
      let kalanDmg = dmg, dusen = 0;
      liste.forEach((u, i) => {
        if (kalanDmg <= 0) return;
        const pay = (i === liste.length - 1)
          ? kalanDmg
          : Math.min(kalanDmg, Math.round(dmg * (u.atk * u.count) / toplamPay));
        if (pay <= 0) return;
        kalanDmg -= pay;
        const d = hasariDagit(hedefOrdu, u.unitId, pay, hedefTaban);
        if (d > 0) { dusen += d; if (kayit) kayit(u.unitId, d); }
      });
      return dusen;
    }

    /* Çelik Yansıması: belirli bir AİLENİN saldırısını arttırır.
       Aile adı yetenek tanımından okunur, burada sabit yazılmaz. */
    if ((f = bul("family_atk_pct")) && f.v) {
      const _fam = (f.effect && f.effect.family) || "";
      birimler.forEach(u => {
        if (AILE(u.unitId) === _fam) u.atk = Math.max(1, u.atk * (1 + f.v / 100));
      });
    }

    /* Yasak Büyüler: can üzerinden hesaplanır, sahipsiz hasar olarak
       canavar ordusuna dağıtılır (birlik düşürür, canı buharlaştırmaz). */
    let instantKilled = 0;
    if ((f = bul("enemy_instant_casualty")) && f.v) {
      instantKilled = Math.round(enemyMaxHp * f.v / 100);
    }
    if ((f = bul("enemy_family_hp_reduce")) && f.v) {
      const sans = ((f.effect && f.effect.chance) != null ? f.effect.chance
                   : (f.chance != null ? f.chance : 100));
      if (Math.random() * 100 < sans) {
        instantKilled += Math.round(enemyMaxHp * f.v / 100);
      }
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
      const onunGuc  = orduAtk(cBirimler) + orduDef(cBirimler)
                     + Math.round(enemyMaxHp / 4);
      if (onunGuc >= benimGuc * (1 + gap / 100)) gucFarkiAzalt = f.v || 0;
    }

    if (instantKilled > 0) {
      hasariDagit(cBirimler, "front", instantKilled, cTaban);
    }
    enemyHp = canavarCan();

    /* ── SAVAŞ DÖNGÜSÜ ── */
    const rounds = [];
    let turn = 0;
    let toplamVerilen = instantKilled;
    let toplamAlinan = 0;

    while (orduSayi(cBirimler) > cTaban
           && orduSayi(birimler) > taban
           && turn < PVE.maxTur) {
      turn++;

      if (perPct > 0 && turn % perHer === 0) {
        cBirimler.forEach(u => { u.def = sifirAlti(Math.round(u.def * (1 - perPct / 100))); });
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
      if (BF && BF.hasarCarpanlari) {
        /* Buff artık AİLE bazında. Canavar tek hedef olduğu için
           hedef dağıtımı yok; toplam hasar, ailelerin saldırı
           paylarıyla ağırlıklandırılarak çarpılır. Buffsuz ailelerin
           katkısı olduğu gibi kalır. */
        const mc = BF.hasarCarpanlari(turn);
        if (mc && hamAtk > 0) {
          let agirlik = 0;
          birimler.forEach(u => {
            const c = mc[AILE(u.unitId)] || 1;
            agirlik += (u.atk * u.count) * c;
          });
          /* kahramanın kendi saldırısı buffsuz kalır */
          const birlikAtk = birimler.reduce((t, u) => t + u.atk * u.count, 0);
          agirlik += Math.max(0, hamAtk - birlikAtk);
          const rc = agirlik / hamAtk;
          if (rc !== 1) vurus.dmg = Math.max(1, Math.round(vurus.dmg * rc));
        }
      }
      dagitKaynakli(cBirimler, birimler, vurus.dmg, cTaban,
                    (uid, n) => _yaz(_attrib, uid, "killed", n));
      enemyHp = canavarCan();
      toplamVerilen += vurus.dmg;
      rounds.push({
        side: "hero", dmg: vurus.dmg, isUlti: vurus.isUlti,
        enemyHpAfter: enemyHp, heroHpAfter: orduCanKalan(birimler),
      });
      if (orduSayi(cBirimler) <= cTaban) break;

      /* ── CANAVAR VURUŞU ── */
      if (donukTur > 0) {
        donukTur--;
        rounds.push({
          side: "enemy", dmg: 0, frozen: true,
          enemyHpAfter: enemyHp, heroHpAfter: orduCanKalan(birimler),
        });
        continue;
      }

      /* Birliklerin savunması artık gerçekten sayılıyor.
         CANAVARIN ÖLDÜRÜCÜLÜĞÜ: birim listesine geçtiği için artık
         canavarın da `olum` değeri var — oyuncununkiyle aynı formül,
         savunmanın bir kısmını yok sayar. */
      const cHamAtk = canavarAtk();
      const cDelme  = olumDelme(orduOlum(cBirimler, cHamAtk));
      const savunma = orduDef(birimler) + say(hero.defense, 0);
      const gelen = hasarHesapla(cHamAtk, savunma,
                                 say(enemy.ultiChance, 0),
                                 say(enemy.ultiMultiplier, 1.8),
                                 cDelme);

      let inc = gelen.dmg;
      if (gucFarkiAzalt > 0) inc = Math.round(inc * (1 - gucFarkiAzalt / 100));
      /* ALINAN hasar buffu artık AİLE bazında: hasarı kısmak yerine
         hedef ailenin canı bu tur geçici yükseltilir. Can birim
         bazında tutulduğu için tek aileye uygulanabilir; sayı yalnız
         azaldığından canı geri düşürmek ölmüş birliği diriltmez. */
      let _kalkan = null;
      if (BF && BF.alinanCarpanlari) {
        const ac = BF.alinanCarpanlari(turn);
        if (ac) {
          _kalkan = [];
          birimler.forEach(u => {
            const o = ac[AILE(u.unitId)];
            if (!o || o >= 1 || o <= 0) return;
            _kalkan.push({ u: u, hp: u.hpEach });
            u.hpEach = Math.max(1, Math.round(u.hpEach / o));
          });
          if (!_kalkan.length) _kalkan = null;
        }
      }

      /* Canavarın her ailesi KENDİ hedef sırasıyla vurur — artık
         sınıfsız "front" değil. PvE'de oyuncu birliği ölmez,
         yaralanır; kayıt da `wounded` olarak tutulur. */
      dagitKaynakli(birimler, cBirimler, inc, taban,
                    (uid, n) => _yaz(_attribD, uid, "wounded", n));
      /* Can eski değerine dönerken biriken artık hasar da kırpılır.
         Kırpılmazsa `tavan = count*hpEach - artik` eksiye düşebilir
         ve hasar hesabı ters işler. */
      if (_kalkan) _kalkan.forEach(g => {
        g.u.hpEach = g.hp;
        if (g.u.artik >= g.u.hpEach) g.u.artik = g.u.hpEach - 1;
      });
      toplamAlinan += inc;

      if (yansimaPct > 0 && inc > 0) {
        const y = Math.max(1, Math.round(inc * yansimaPct / 100));
        hasariDagit(cBirimler, "front", y, cTaban);
        enemyHp = canavarCan();
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
       Zafer için İKİ şart: canavar BOZULACAK (ordusunun %55'i
       düşecek) VE senin ordunun %55'inden fazlası düşmemiş olacak.
       Oyuncu önce vurduğu için ikisi aynı turda dolarsa zafer
       oyuncunundur. */
    const dusenToplam = baslangicSayi - orduSayi(birimler);
    const kayipOrani = baslangicSayi > 0 ? dusenToplam / baslangicSayi : 0;
    const canavarBozuldu = orduSayi(cBirimler) <= cTaban;
    const win = canavarBozuldu && (kayipOrani <= PVE.yenilgiEsigi);

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

    /* ── KİM KAÇ TANE DÜŞÜRDÜ ─────────────────────────────────────
       ARTIK TAHMİN YOK. Hasar her tur kaynak birlik başına ayrı
       dağıtıldığı için (`dagitKaynakli`), düşen sayısı doğrudan
       `hasariDagit`in dönüşünden sayıldı. Eski sürümde bu, saldırı
       payına göre ORANLANIYORDU — canavar tek gövde olduğu için
       başka yolu yoktu.

       Canavarın yaralısı yoktur (hastanesi yok): canavar tarafında
       düşen birlik `killed`, oyuncu tarafında `wounded` sayılır. */
    const _canavarOlen = Math.max(0, cBaslangic - orduSayi(cBirimler));

    /* Savunanın (canavarın) birlik dökümü — rapor ekranı bunu
       `defenderTroops` / `defenderLosses` üzerinden çizer. */
    const _defTroops = {};
    const _defLosses = { killed: {}, wounded: {} };
    cBirimler.forEach(u => {
      if ((u.start || 0) <= 0) return;
      _defTroops[u.unitId] = (_defTroops[u.unitId] || 0) + u.start;
      if (u.dusen > 0) _defLosses.killed[u.unitId] = u.dusen;
    });

    /* Buff tek kullanımlıktır: savaş çözüldü, tüketildi. */
    if (BF) BF.savasBitti();

    return {
      /* ── RAPOR ALANLARI (pvp.js ile aynı adlar) ── */
      statlar: _statOzet,
      attackerAttribution: _attrib,
      defenderAttribution: _attribD,

      /* Rapor ekranı (tema.js ozetHTML / unitDetailHTML) savunan
         sütununu BUNLARDAN çizer. Eskiden hiç verilmiyordu; canavar
         raporunda sağ sütun bu yüzden 0/0/0 görünüyordu. */
      defenderTroops: _defTroops,
      defenderLosses: _defLosses,

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
        canavarBirlik: cBaslangic,
        canavarKalan: canavarAdet(),
        canavarOlen: _canavarOlen,
        canavarTaban: cTaban,
        canavarBozuldu: canavarBozuldu,
        canavarBilesim: _defTroops,
        baslangicSayi, dusenToplam,
        kayipYuzde: Math.round(kayipOrani * 100),
        yenilgiEsigi: Math.round(PVE.yenilgiEsigi * 100),
        esikSebebi: (canavarBozuldu && !win) ? "kayip_esigi_asildi" : null,
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
