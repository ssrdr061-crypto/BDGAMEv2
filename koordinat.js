/* ============================================================
   koordinat.js — KOORDİNAT ÇEVRİMİ İÇİN TEK KAPI
   ------------------------------------------------------------
   AŞAMA 1a — BU DOSYA HENÜZ HİÇBİR ŞEYİ DEĞİŞTİRMEZ.
   Sadece window.KOORD'u tanımlar. Oyunun mevcut hesapları
   olduğu yerde duruyor; bu kapı onların BİREBİR aynısını
   hesaplayıp doğrulanmayı bekliyor. Bağlama işi Aşama 1b.

   ── NEDEN VAR ──
   Oyunda şu an ÜÇ ayrı koordinat birimi dolaşıyor:

     1) YÜZDE 0–100      → canavarlar (enemies[].mapX / mapY)
     2) OYUN ÖLÇEĞİ 0–30 → kaleler, koordinat kutusu, sohbette
                           paylaşılan konum, füze kaydı, sefer
     3) KARO 0–140       → yalnız çizim (harita.js, 141×141)

   Aralarındaki çevrim index.html'de altı ayrı yere ELLE
   yazılmış: `(e.mapX / 100) * 30`, `(gx / COORD_GRID) * 100`,
   `gx * ORAN` ... Biri güncellenip diğeri unutulduğunda hata
   SESSİZ oluyor (kale alakasız yere düşüyor, füze kayıyor).
   OKU-BENI'deki "ızgara boyutu üç ayrı yerde sabitti" uyarısı
   tam olarak bunu anlatıyor.

   Bu dosya o çevrimlerin TEK adresi. Buradan sonra hiçbir
   dosyaya 4.7, 141, /100*30 gibi bir sayı GÖMÜLMEZ.

   ── SAYILAR NEREDEN GELİYOR ──
   Karo sayısı ve oran, harita.js'ten CANLI okunur (HARITA.CFG.grid
   ve HARITA.ORAN). harita.js henüz yüklenmemişse yedek değerler
   kullanılır. Böylece ızgara boyu değişirse burası kendiliğinden
   uyar; iki yerde ayrı ayrı güncellenmesi gerekmez.

   Yükleme sırası: firebase'den hemen sonra, diğer her şeyden
   önce. İçinde DOM veya harita bağımlılığı YOKTUR; harita.js'e
   yalnız çağrı anında bakar.
   ============================================================ */
(function () {
"use strict";

/* ── YEDEK DEĞERLER ──
   harita.js yüklenmeden çağrı gelirse kullanılır. harita.js'teki
   CFG.grid ve index.html'deki COORD_GRID ile AYNI olmalı; tani()
   ayrıştıklarında uyarır. */
const YEDEK_KARO   = 141;   /* harita.js → CFG.grid */
const YEDEK_OLCEK  = 30;    /* index.html → COORD_GRID */

/* Izgaranın karo sayısı (bir kenardaki karo adedi). */
function karoSayisi() {
  const H = window.HARITA;
  if (H && H.CFG && typeof H.CFG.grid === "number" && H.CFG.grid > 0) return H.CFG.grid;
  return YEDEK_KARO;
}

/* Oyunun eski ölçeği (0..30). */
function olcek() {
  return (typeof COORD_GRID === "number" && COORD_GRID > 0) ? COORD_GRID : YEDEK_OLCEK;
}

/* Oyun ölçeği → karo çarpanı. harita.js'in ORAN'ıyla AYNI sayı.
   Öncelik harita.js'te: ikisi ayrışırsa çizim ile mantık ayrışır,
   o yüzden kaynak tek olmalı. */
function oran() {
  const H = window.HARITA;
  if (H && typeof H.ORAN === "number" && H.ORAN > 0) return H.ORAN;
  return karoSayisi() / olcek();
}

/* ── ÇEVRİMLER ──
   Hepsi ondalık korur; yuvarlama İSTENDİĞİNDE yapılır. Aşama 4'e
   kadar kale konumları ondalık kalacağı için erken yuvarlamak
   veriyi bozar. */

/* 0–30 ölçeği → karo (ondalık) */
function olcektenKaro(g) { return g * oran(); }

/* karo → 0–30 ölçeği */
function karodanOlcek(k) { return k / oran(); }

/* yüzde 0–100 → karo */
function yuzdedenKaro(p) { return (p / 100) * karoSayisi(); }

/* yüzde 0–100 → 0–30 ölçeği.
   index.html'deki `(e.mapX / 100) * 30` ifadesinin birebir aynısı. */
function yuzdedenOlcek(p) { return (p / 100) * olcek(); }

/* 0–30 ölçeği → yüzde 0–100.
   index.html'deki `(gx / COORD_GRID) * 100` ifadesinin aynısı. */
function olcektenYuzde(g) { return (g / olcek()) * 100; }

/* karo → yüzde 0–100. Eski yüzde tabanlı CSS konumlandırması
   (harita.js devre dışıyken devreye giren yedek) için. */
function karodanYuzde(k) { return (k / karoSayisi()) * 100; }

/* Karoyu tam sayıya oturt ve ızgara dışına taşmasını engelle. */
function karoyaOturt(k) {
  const son = karoSayisi() - 1;
  return Math.max(0, Math.min(son, Math.round(k)));
}

/* İki nokta arası mesafe, KARO cinsinden.
   birim: "olcek" (0–30, varsayılan) | "karo" | "yuzde" */
function mesafeKaro(ax, ay, bx, by, birim) {
  let a1 = ax, a2 = ay, b1 = bx, b2 = by;
  if (birim === "yuzde") {
    a1 = yuzdedenKaro(ax); a2 = yuzdedenKaro(ay);
    b1 = yuzdedenKaro(bx); b2 = yuzdedenKaro(by);
  } else if (birim !== "karo") {
    a1 = olcektenKaro(ax); a2 = olcektenKaro(ay);
    b1 = olcektenKaro(bx); b2 = olcektenKaro(by);
  }
  return Math.hypot(b1 - a1, b2 - a2);
}

/* Bir noktayı üç birimde birden göster — teşhis ve gelecek
   aşamalarda karşılaştırma için. */
function ucBirim(g30x, g30y) {
  return {
    olcek: { x: Math.round(g30x * 10) / 10, y: Math.round(g30y * 10) / 10 },
    karo:  { x: karoyaOturt(olcektenKaro(g30x)), y: karoyaOturt(olcektenKaro(g30y)) },
    yuzde: { x: Math.round(olcektenYuzde(g30x) * 10) / 10,
             y: Math.round(olcektenYuzde(g30y) * 10) / 10 }
  };
}

/* ═══════════════════════════════════════════════════════════
   DOĞRULAMA
   Kapının, oyunun HÂLİHAZIRDAKİ hesaplarıyla aynı sonucu verip
   vermediğini sınar. Aşama 1b'de bağlamadan önce buradan geçmesi
   şart. Konsola: KOORD.dogrula()
   ═══════════════════════════════════════════════════════════ */
function dogrula() {
  const sonuc = [];
  const ekle = (ad, beklenen, bulunan) => {
    const fark = Math.abs(beklenen - bulunan);
    sonuc.push({ sinav: ad, beklenen: beklenen, bulunan: bulunan,
                 gecti: fark < 1e-9 });
  };

  const O = olcek(), K = karoSayisi();

  /* index.html'de canavarlar için elle yazılan ifade */
  [0, 9, 44, 76, 94].forEach(p => {
    ekle(`yüzde ${p} → ölçek  [(p/100)*${O}]`, (p / 100) * O, yuzdedenOlcek(p));
  });

  /* index.html'de işaret/düğüm konumu için elle yazılan ifade */
  [0, 5.3, 15, 29.9].forEach(g => {
    ekle(`ölçek ${g} → yüzde  [(g/${O})*100]`, (g / O) * 100, olcektenYuzde(g));
  });

  /* harita.js'in çizim çarpanı */
  const H = window.HARITA;
  if (H && typeof H.ORAN === "number") {
    [0, 5.3, 15, 30].forEach(g => {
      ekle(`ölçek ${g} → karo  [g*ORAN]`, g * H.ORAN, olcektenKaro(g));
    });
  } else {
    sonuc.push({ sinav: "harita.js ORAN", beklenen: "yüklü", bulunan: "YOK", gecti: false });
  }

  /* Gidiş-dönüş kaybı olmamalı */
  [0.1, 5.3, 17.7, 29.9].forEach(g => {
    ekle(`gidiş-dönüş ${g}`, g, karodanOlcek(olcektenKaro(g)));
  });

  /* AŞAMA 2 DENETİMİ: canavarların hepsi tam sayı karoda mı?
     Biri yüzde kalmışsa haritada kayar; sessiz kalmasın. */
  try {
    if (typeof enemies !== "undefined" && Array.isArray(enemies)) {
      const bozuk = enemies.filter(e =>
        !e || typeof e.kx !== "number" || typeof e.ky !== "number" ||
        e.kx !== Math.floor(e.kx) || e.ky !== Math.floor(e.ky));
      sonuc.push({ sinav: `canavarlar tam sayı karoda (${enemies.length} adet)`,
                   beklenen: 0, bulunan: bozuk.length, gecti: bozuk.length === 0 });
      if (bozuk.length) console.warn("[koordinat] karosuz canavarlar:", bozuk.map(x => x && x.name));
    }
  } catch (e) {}

  /* AŞAMA 3 DENETİMİ: karoya oturtma kayıpsız mı?
     ölçek → karo → ölçek → karo aynı karoyu vermeli. Vermezse
     kale taşırken silüet bir kare kayar. */
  try {
    let sapan = 0;
    for (let k = 0; k < karoSayisi(); k += 7) {
      if (karoyaOturt(olcektenKaro(karodanOlcek(k))) !== k) sapan++;
    }
    sonuc.push({ sinav: "karoya oturtma kayıpsız", beklenen: 0, bulunan: sapan, gecti: sapan === 0 });
  } catch (e) {}

  const kalan = sonuc.filter(x => !x.gecti);
  console.log(`[koordinat] ${sonuc.length - kalan.length}/${sonuc.length} sınav geçti`);
  if (kalan.length) { console.warn("[koordinat] GEÇEMEYENLER:"); console.table(kalan); }
  else console.log("[koordinat] ✅ kapı, oyunun mevcut hesaplarıyla birebir aynı");

  console.log(`[koordinat] karo sayısı=${K}  ölçek=${O}  oran=${oran()}`);
  return { toplam: sonuc.length, gecen: sonuc.length - kalan.length, kalan: kalan };
}

/* Durum özeti — neyin nereden okunduğunu gösterir. */
function tani() {
  const H = window.HARITA;
  const r = {
    karoSayisi: karoSayisi(),
    karoKaynagi: (H && H.CFG && typeof H.CFG.grid === "number") ? "harita.js CFG.grid" : "YEDEK (" + YEDEK_KARO + ")",
    olcek: olcek(),
    olcekKaynagi: (typeof COORD_GRID === "number") ? "index.html COORD_GRID" : "YEDEK (" + YEDEK_OLCEK + ")",
    oran: oran(),
    oranKaynagi: (H && typeof H.ORAN === "number") ? "harita.js ORAN" : "hesaplandı (karo/ölçek)",
    uyumlu: !!(H && typeof H.ORAN === "number" && Math.abs(H.ORAN - karoSayisi() / olcek()) < 1e-9),
    kalen: null
  };
  try {
    if (typeof state !== "undefined" && state && state.castle && typeof state.castle.gx === "number") {
      r.kalen = ucBirim(state.castle.gx, state.castle.gy);
    }
  } catch (e) {}

  console.log("[koordinat] TANI", r);
  if (!r.uyumlu) console.warn("[koordinat] ⚠️ harita.js ORAN ile karo/ölçek hesabı AYRIŞMIŞ — çizim ile mantık kayar!");
  return r;
}

/* ═══════════════════════════════════════════════════════════
   OTOMATİK SINAV
   Geliştirici telefonla çalışıyor; konsol açmak zorunda kalmasın.
   Sayfa yüklendikten sonra kapı kendini sınar:
     · sapma VARSA  → ekrana kırmızı uyarı düşer (sessiz kalmaz)
     · sapma YOKSA  → hiçbir şey olmaz (yalnız ?ayar=1 ile onay)
   Sınav harita.js yüklendikten sonra çalışmalı; o yüzden
   yükleme sonrası kısa bir gecikmeyle tetiklenir.
   ═══════════════════════════════════════════════════════════ */
function otomatikSinav() {
  const r = dogrula();
  const ayarModu = (typeof location !== "undefined") &&
                   /[?&]ayar=1/.test(location.search || "");

  if (r.kalan.length) {
    const mesaj = `⚠️ KOORDİNAT SAPMASI: ${r.kalan.length}/${r.toplam} sınav başarısız — ` +
                  `çizim ile mantık ayrışmış olabilir!`;
    if (typeof showToast === "function") showToast(mesaj, 9000);
    else if (typeof alert === "function") alert(mesaj);
    return;
  }
  const t = tani();
  if (!t.uyumlu) {
    const m = "⚠️ KOORDİNAT: harita.js oranı ile karo/ölçek hesabı uyuşmuyor!";
    if (typeof showToast === "function") showToast(m, 9000);
    return;
  }
  if (ayarModu && typeof showToast === "function") {
    showToast(`✅ Koordinat kapısı sağlam — ${r.gecen}/${r.toplam} sınav geçti ` +
              `(karo ${t.karoSayisi}, oran ${Math.round(t.oran * 1000) / 1000})`, 6000);
  }
}

if (typeof window !== "undefined") {
  const baslat = () => setTimeout(otomatikSinav, 2500);
  if (document.readyState === "complete") baslat();
  else window.addEventListener("load", baslat);
}

window.KOORD = {
  /* okuma */
  karoSayisi: karoSayisi, olcek: olcek, oran: oran,
  /* çevrim */
  olcektenKaro: olcektenKaro, karodanOlcek: karodanOlcek,
  yuzdedenKaro: yuzdedenKaro, yuzdedenOlcek: yuzdedenOlcek,
  olcektenYuzde: olcektenYuzde, karodanYuzde: karodanYuzde,
  karoyaOturt: karoyaOturt, mesafeKaro: mesafeKaro, ucBirim: ucBirim,
  /* teşhis */
  dogrula: dogrula, tani: tani,
};

})();
