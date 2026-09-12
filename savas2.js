/* ═══════════════════════════════════════════════════════════════════════
   savas2.js — YENİ SAVAŞ MOTORU  ·  PARÇA 1 (henüz oyuna BAĞLI DEĞİL)

   NEDEN YAZILDI
   Eski motorda (pvp.js rollDamage) emilim savunanın TOPLAM savunmasıydı:
       hasar = toplamSaldırı − toplamSavunma × 0,35
   Savunanın askeri çoğaldıkça emilim saldıranın toplam saldırısını geçiyor
   ve hasar sabit bir tabana (minDamagePct) çakılıyordu. O taban yüzünden
   saldıranın KALİTESİ bir yerden sonra hiç işe yaramıyordu: 30 bin Sv6 ile
   1 milyon Sv3'e saldırınca statları 30 kat yapsan bile sonuç değişmiyordu
   (ölçüldü). Kalabalık her zaman kazanıyordu.

   FORMÜL NEREDEN GELDİ — TAHMİN DEĞİL, ÖLÇÜM
   Serdar'ın Whiteout'ta yaptığı iki KONTROLLÜ savaştan çıkarıldı:
   aynı canavar (Sv5 Kutup Kurdu, 195 birlik), aynı 360 asker
   (180 Piyade + 180 Mızrakçı), tek fark birliklerin kademesi.

       Sv1 ile saldırı → 105 asker düştü  (0 ölü · 1 yaralı · 104 hafif)
       Sv3 ile saldırı →  24 asker düştü  (0 ölü · 1 yaralı ·  23 hafif)

   Bu iki sonuç tek bir bağıntıyla açıklanıyor:

       düşen asker  ∝  1 / (toplam saldırı × birim savunma × birim sağlık)

   Üç stat ÇARPILARAK işler:
     · saldırı ↑ → savaş erken biter → düşman daha az vuruş atar
     · savunma ↑ → her vuruş daha az yakar
     · sağlık  ↑ → düşen her asker daha çok hasar emer
   Çarpım hesabı: Sv1 = 900×3×4 = 10.800 · Sv3 = 1620×5×6 = 48.600
   → 4,50 kat. Raporlardaki gerçek oran 4,38 kat. Sapma %2,9.

   ÜÇLÜ KAYIP
   Whiteout'ta düşen asker üçe bölünür ve en büyük pay BEDAVA döner:
       Kayıp        → kalıcı ölü
       Yaralılar    → hastaneye gider, iyileşene kadar güç kaybı
       Hafif Yaralı → anında geri gelir, ne hastane ne güç kaybı
   Kanıt: iki savaşta da 104 ve 23 hafif yaralı var ama güç kaybı yalnız
   -3 ve -6. O da tam olarak 1 yaralı × birim gücü (Sv1 piyade 3, Sv3 6).
   Yani güç kaybı = (Kayıp + Yaralılar) × güç; hafif yaralı sayılmıyor.
   Saldırmanın orada ucuz olmasının sebebi bu.

   BOZGUN EŞİĞİ YOK — BİLEREK
   Eski motorda kaybeden hep ordusunun %75'ini yitiriyordu. Burada savaş
   can havuzu bitene kadar sürer; yumuşatma "hafif yaralı" payından gelir.
   Gerçek raporda savunanın Savaşçı'sı 0'dı ama %65'i hafif yaralıydı.

   DURUM
   Bu dosya HİÇBİR YERDEN ÇAĞRILMIYOR. index.html'e eklenmedi, pvp.js'e
   dokunulmadı. Oyun bu dosya varken de yokken de aynı çalışır.
   Bağlama işi PARÇA 2'dir ve bu parça sınanmadan yapılmaz.

   SINAMA:  SAVAS2.sinama()  → iki canavar savaşını yeniden üretir.
   ═══════════════════════════════════════════════════════════════════════ */
(function (G) {
  "use strict";

  var SURUM = "savas2-1";

  /* ── AYARLAR — TEK YER ──────────────────────────────────────────────
     Bunların hepsi ölçümle oturtulacak sayılardır; tahminle oynama.
     Hangisinin neye dayandığı yanında yazıyor.                        */
  var AYAR = {
    /* Savaşın en fazla kaç tur süreceği. Eski motorda 30'du ve savaşlar
       1 turda bitiyordu; burada tur başına hasar çok daha küçük olduğu
       için savaş gerçekten sürüyor.
       ÖLÇÜLDÜ: canavar savaşı ~65 tur, 15.000'in 1,1 milyonu öğütmesi
       ~27.500 tur. Tur maliyeti birkaç aritmetik işlem, 100 bin tur
       milisaniyeler sürüyor — sınır bilerek geniş. Dar tutulursa savaş
       yarıda kesilir ve büyük ordular hiç bitirilemez. */
    maxTur: 100000,

    /* Genel hız. Bütün hasarı ölçekler. Savaşın kazananını değiştirmez
       (iki taraf da aynı oranda hızlanır), TUR SAYISINI değiştirir — ve
       tur sayısı doğruluğu belirler: savaş az turda biterse son tur
       taşar ve kayıp şişik çıkar.
       ÖLÇÜLDÜ (canavar savaşı, gerçek 105 / 24):
           1.00 →  4 tur → 130 / 26   (%24 sapma)
           0.30 → 11 tur → 107 / 27
           0.10 → 33 tur → 107 / 25
           0.05 → 65 tur → 106 / 24   ← seçilen
           0.02 →163 tur → 106 / 24   (daha fazla incelmiyor)
       0,05'te sapma %1'in altına iniyor ve daha aşağısı bir şey
       kazandırmıyor, yalnız hesabı uzatıyor. Küçültme. */
    hasarKat: 0.05,

    /* ── TEMAS SINIRI (cephe genişliği) ──
       Bir orduda aynı anda EN FAZLA bu kadar asker vuruş yapabilir.
       Fazlası arkada bekler: canıyla orduya dayanıklılık katar ama
       vuruşa katılmaz.

       NEDEN VAR: Serdar'ın gösterdiği gerçek rapor (15.000 asker,
       1.129.475 askeri dağıtıyor) sınırsız modelle açıklanamıyor.
       Hesaplandı: sınırsızken savunanın vuruşu saldıranınkinin 75
       katı olur ve saldıran ilk turlarda erir. Savaş Detayları ekranı
       saldıranın TEK kişi olduğunu (rally değil) gösterdiğine göre,
       geriye tek açıklama kalıyor: savunanın 1,1 milyonu aynı anda
       dövüşmüyor.

       Bu sınır sayıyı değersizleştirmez — kalabalık ordu daha uzun
       dayanır, saldıran onu bitirmek için çok daha fazla tur dövüşmek
       zorunda kalır. Ama kalabalık artık hasarı KATLAMAZ, işte kalite
       ile sayının yarışabilmesinin sebebi bu.

       0 ya da Infinity yaparsan sınır kalkar (eski davranış).
       15.000, Whiteout'taki tipik sefer büyüklüğüne denk. */
    temasSiniri: 15000,

    /* ── ÜÇLÜ BÖLÜNME ──
       DİKKAT: aşağıdaki üç sayı HENÜZ DOĞRULANMADI. Elimizdeki iki
       canavar savaşı kolay geçtiği için "Kayıp" sütunu hep 0 çıktı;
       ölüm payının kuralını görebilmek için ZORLU ya da KAYBEDİLEN bir
       savaş raporu gerekiyor. Şimdilikki değerler iki uçtan kabaca
       oturtuldu (kolay savaş %0 ölü · zorlu savaş ~%30 ölü).
       Rapor gelince yalnız bu üç sayı değişecek, motorun geri kalanı
       aynı kalacak. */
    olumKat:    0.9,    /* (rakip öldürücülüğü ÷ senin sağlığın) → ölüm payı */
    olumTavan:  0.40,   /* düşenlerin en fazla bu kadarı ölür                */
    agirPay:    0.30    /* ölmeyenlerin bu kadarı AĞIR yaralı (hastanelik)   */
  };

  /* ── ORDU BİÇİMİ ──
     { birlikler: [ { id, sayi, saldiri, savunma, can, oldurucu } ] }
     Statlar ÇAĞIRANIN hesapladığı son değerlerdir: kademe tabanı ×
     (1 + araştırma/kahraman/buff yüzdeleri). Motor bonus hesaplamaz —
     tek kaynak dışarıda kalsın diye (istatistik.js).                  */

  function toplamSayi(o) {
    return o.birlikler.reduce(function (s, u) { return s + (u.sayi || 0); }, 0);
  }
  function toplamAtk(o) {
    return o.birlikler.reduce(function (s, u) { return s + (u.saldiri || 0) * (u.sayi || 0); }, 0);
  }
  function toplamCan(o) {
    return o.birlikler.reduce(function (s, u) { return s + (u.can || 0) * (u.sayi || 0); }, 0);
  }
  /* Asker başına ağırlıklı ortalama — hangi birlikten kaç tane varsa
     o kadar sayılır. Savunmanın SAYIYLA değil KALİTEYLE ölçülmesinin
     tek yeri burası; eski motorun kırılma noktası tam olarak buydu. */
  function birimOrt(o, alan) {
    var n = toplamSayi(o);
    if (n <= 0) return 0;
    return o.birlikler.reduce(function (s, u) {
      return s + (u[alan] || 0) * (u.sayi || 0);
    }, 0) / n;
  }

  /*  Vuruşa gerçekten katılan saldırı gücü.
      Ordu temas sınırından kalabalıksa fazlası arkada bekler; saldırı
      gücü sınır kadarına kırpılır. Kırpma ORANTILI yapılır: hangi
      birlikten kaç tane varsa o oranda öne çıkar. (Önce üst kademeyi
      öne sürmek istenirse yalnız bu fonksiyon değişir.) */
  function etkinAtk(o) {
    var sayi = toplamSayi(o);
    var sinir = AYAR.temasSiniri;
    var ham = toplamAtk(o);
    if (!sinir || !isFinite(sinir) || sayi <= sinir) return ham;
    return ham * (sinir / sayi);
  }

  /* Bir turda karşı tarafa giden hasar.
     Savunma BÖLEN olarak girer: iki katı savunma, yarı hasar. */
  function turHasari(vuran, hedef) {
    var savunma = Math.max(0.5, birimOrt(hedef, "savunma"));
    return etkinAtk(vuran) / savunma * AYAR.hasarKat;
  }

  /* Kaybedilen candan asker dökümü.
     düşen = kaybedilen can ÷ birim canı
     sonra Kayıp / Yaralılar / Hafif Yaralı diye üçe bölünür. */
  function dokum(ordu, kaybedilenCan, rakip) {
    var sayi = toplamSayi(ordu);
    var birimCan = birimOrt(ordu, "can") || 1;
    var dusen = Math.min(sayi, Math.round(Math.max(0, kaybedilenCan) / birimCan));

    var oldurucu = birimOrt(rakip, "oldurucu");
    var oran = Math.min(AYAR.olumTavan, (oldurucu / birimCan) * AYAR.olumKat);
    var olu   = Math.round(dusen * oran);
    var agir  = Math.round((dusen - olu) * AYAR.agirPay);
    var hafif = dusen - olu - agir;

    return {
      sayi: sayi,
      dusen: dusen,
      kayip: olu,               /* kalıcı ölü                    */
      yarali: agir,             /* hastanelik                    */
      hafifYarali: hafif,       /* bedava döner                  */
      savasci: sayi - dusen,    /* hiç dokunulmamış              */
      /* Güç kaybı yalnız kalıcı çıkanlardan: hafif yaralı sayılmaz */
      gucKaybiAdedi: olu + agir
    };
  }

  /* ── SAVAŞI ÇÖZ ──
     İki taraf EŞ ZAMANLI vurur: saldıran "önce vurma" avantajı almaz. */
  function coz(A, B) {
    var canA0 = toplamCan(A), canB0 = toplamCan(B);
    var canA = canA0, canB = canB0, tur = 0;

    while (tur < AYAR.maxTur && canA > 0 && canB > 0) {
      tur++;
      var hAB = turHasari(A, B);
      var hBA = turHasari(B, A);
      canB -= hAB;
      canA -= hBA;
    }

    return {
      surum: SURUM,
      tur: tur,
      kazandi: canA > canB,     /* A kazandıysa true */
      saldiran: dokum(A, canA0 - Math.max(0, canA), B),
      savunan:  dokum(B, canB0 - Math.max(0, canB), A)
    };
  }

  /* ═══ SINAMA — Serdar'ın iki gerçek canavar savaşı ═══
     Motorun bu iki sonucu üretmesi gerekir. Üretmiyorsa formül ya da
     kalibrasyon bozulmuş demektir; oyuna bağlanmadan önce burası
     tutmalı. Canavarın statları iki savaştan ÇÖZÜLDÜ (bilinmiyordu):
     195 birlik · saldırı 2 · savunma 5 · can 3.                      */
  function sinama() {
    var piyade = function (n, a, s, o, c) {
      return { id: "piyade", sayi: n, saldiri: a, savunma: s, oldurucu: o, can: c };
    };
    var mizrak = function (n, a, s, o, c) {
      return { id: "mizrakci", sayi: n, saldiri: a, savunma: s, oldurucu: o, can: c };
    };
    var canavar = function () {
      return { birlikler: [
        { id: "kurt", sayi: 195, saldiri: 2, savunma: 5, oldurucu: 0.2, can: 3 }
      ] };
    };

    var senaryolar = [
      { ad: "Sv1 birliklerle",
        ordu: { birlikler: [ piyade(180, 1, 4, 1, 6), mizrak(180, 4, 2, 5, 2) ] },
        gercek: { dusen: 105, kayip: 0, yarali: 1, hafifYarali: 104, savasci: 255 } },
      { ad: "Sv3 birliklerle",
        ordu: { birlikler: [ piyade(180, 3, 6, 3, 8), mizrak(180, 6, 4, 7, 4) ] },
        gercek: { dusen: 24, kayip: 0, yarali: 1, hafifYarali: 23, savasci: 336 } }
    ];

    var satirlar = [];
    senaryolar.forEach(function (s) {
      var r = coz(s.ordu, canavar());
      var m = r.saldiran;
      satirlar.push({
        senaryo: s.ad,
        motor_dusen: m.dusen, gercek_dusen: s.gercek.dusen,
        sapmaYuzde: Math.round(Math.abs(m.dusen - s.gercek.dusen) / s.gercek.dusen * 1000) / 10,
        motor_savasci: m.savasci, gercek_savasci: s.gercek.savasci,
        tur: r.tur, kazandi: r.kazandi,
        canavarDusen: r.savunan.dusen
      });
    });
    return satirlar;
  }

  G.SAVAS2 = { SURUM: SURUM, AYAR: AYAR, coz: coz, sinama: sinama,
               toplamAtk: toplamAtk, birimOrt: birimOrt };
})(typeof window !== "undefined" ? window : globalThis);
