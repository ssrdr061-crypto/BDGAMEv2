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

/* ── KALE KAYDI: OKUMA ──
   Hangi biçimde olursa olsun bir kale kaydından KARO çıkarır.
     · yeni kayıt (kv>=2) → kx/ky doğrudan okunur
     · eski kayıt         → gx/gy (0..30) karoya çevrilir
   Böylece göç edilmemiş oyuncular da doğru yerde görünür. */
function kaleKaro(c) {
  if (!c) return null;
  if (c.kv >= 2 && typeof c.kx === "number" && typeof c.ky === "number") {
    return { kx: karoyaOturt(c.kx), ky: karoyaOturt(c.ky) };
  }
  if (typeof c.gx === "number" && typeof c.gy === "number") {
    return { kx: karoyaOturt(olcektenKaro(c.gx)), ky: karoyaOturt(olcektenKaro(c.gy)) };
  }
  return null;
}

/* ── KALE KAYDI: YAZMA (ÇİFT YAZIM) ──
   Karodan tam kayıt üretir. kx/ky GERÇEK kaynaktır; gx/gy ondan
   TÜRETİLİR ve yazılmaya devam eder — çünkü önbelleğinde eski
   sürüm kalmış istemciler yalnız gx/gy okuyor. Eski alanlar
   dolaşımdaki sürümler yenilenince (Aşama 6) silinecek. */
function kaleKayit(kx, ky) {
  const _kx = karoyaOturt(kx), _ky = karoyaOturt(ky);

  /* KAYDA YALNIZ kx/ky/kv YAZILIR. gx/gy ise SAYILAMAZ
     (non-enumerable) tanımlanır: Firebase kaydı serileştirirken
     sayılamaz alanları atlar, yani diskte tertemiz {kx,ky,kv}
     durur. Ama bellekte castle.gx hâlâ okunabildiği için oyunun
     mevcut 40 küsur okuma noktası çalışmaya devam eder ve teker
     teker, aceleye getirmeden karoya çevrilebilir.
     DİKKAT: Object.assign sayılamaz alanları KOPYALAMAZ —
     bu nesne atanırken doğrudan atanmalı, birleştirilmemeli.

     gx/gy artık oyunun HİÇBİR yerinde okunmuyor (hepsi kaleKaro'ya
     çevrildi); yalnız emniyet için duruyor. Yeni kod YAZARKEN
     bunlara güvenme — kaleKaro kullan. Buluttan gelen ham kayıtta
     bu alanlar YOKTUR. */
  const k = { kx: _kx, ky: _ky, kv: 2 };
  Object.defineProperty(k, "gx", { value: karodanOlcek(_kx), enumerable: false, writable: true, configurable: true });
  Object.defineProperty(k, "gy", { value: karodanOlcek(_ky), enumerable: false, writable: true, configurable: true });
  return k;
}

/* ═══════════════════════════════════════════════════════════
   KALE ARTIK 2×2 KARO
   -----------------------------------------------------------
   TEK KURAL: kayıttaki kx/ky kalenin SOL ÜST karosudur.
   Bu seçim bilerek yapıldı — eski kayıtlarda da kx/ky zaten
   kalenin durduğu karoydu, yani hiçbir kayıt bozulmaz; kale
   yalnızca sağ ve alt komşusuna doğru büyür.

   Kale şu dört karoyu kaplar:
       (kx  , ky  )   (kx+1, ky  )
       (kx  , ky+1)   (kx+1, ky+1)

   GÖRSEL MERKEZ tam karo değildir: kx+0.5 / ky+0.5. Kale resmi,
   panel çapası, füze hedefi ve ordu varışı hep BURAYA bakar;
   sol üst köşeye bakan her yer kaleyi yarım karo kaymış gösterir.

   KALE_BOY dışında hiçbir dosyaya "2" yazılmaz. Kale 3×3 olursa
   yalnız aşağıdaki sayı değişir.
   ═══════════════════════════════════════════════════════════ */
const KALE_BOY = 2;

function kaleBoy() { return KALE_BOY; }

/* Sol üst karoyu ızgaraya oturt: kale ızgaranın dışına TAŞMASIN.
   karoyaOturt tek karo için yazılmıştı ve son karoya kadar izin
   veriyor; 2×2 için sağ/alt kenarda bir karo pay bırakmak şart. */
function kaleSolUst(kx, ky) {
  const son = karoSayisi() - KALE_BOY;
  return {
    kx: Math.max(0, Math.min(son, Math.round(kx))),
    ky: Math.max(0, Math.min(son, Math.round(ky)))
  };
}

/* Kalenin kapladığı karoların listesi. Düğüm yerleştirme ve
   çakışma denetimi bunu kullanır. */
function kaleKarolari(kx, ky) {
  const s = kaleSolUst(kx, ky);
  const liste = [];
  for (let y = 0; y < KALE_BOY; y++) {
    for (let x = 0; x < KALE_BOY; x++) liste.push({ kx: s.kx + x, ky: s.ky + y });
  }
  return liste;
}

/* Görsel merkez — ONDALIK karo. Çizim yapan her yer bunu ister. */
function kaleMerkez(kx, ky) {
  const s = kaleSolUst(kx, ky);
  const yari = (KALE_BOY - 1) / 2;
  return { kx: s.kx + yari, ky: s.ky + yari };
}

/* Merkez, oyunun 0..30 ölçeğinde — eski hesaplara doğrudan girer. */
function kaleMerkezOlcek(kx, ky) {
  const m = kaleMerkez(kx, ky);
  return { gx: karodanOlcek(m.kx), gy: karodanOlcek(m.ky) };
}

/* Bir karo bu kalenin altında mı? Dokunma sınaması için. */
function kaleKaplarMi(kaleKx, kaleKy, kx, ky) {
  const s = kaleSolUst(kaleKx, kaleKy);
  return kx >= s.kx && kx < s.kx + KALE_BOY &&
         ky >= s.ky && ky < s.ky + KALE_BOY;
}

/* İki kale çakışıyor mu?
   bosluk: aralarında kaç karo BOŞ kalmalı (0 = bitişik durabilir).
   Mesafe hesabı DEĞİL, alan çakışması: iki kare dikdörtgen üst
   üste biniyorsa doludur. Eski `Math.hypot(...) >= 0.25` sınavı
   tek noktaya bakıyordu, 2×2'de yanlış cevap verir. */
function kaleCakisirMi(aKx, aKy, bKx, bKy, bosluk) {
  const a = kaleSolUst(aKx, aKy), b = kaleSolUst(bKx, bKy);
  const p = (typeof bosluk === "number" ? bosluk : 0);
  return Math.abs(a.kx - b.kx) < KALE_BOY + p &&
         Math.abs(a.ky - b.ky) < KALE_BOY + p;
}

/* Kalenin alanı tek karo bir engelle (canavar, kaynak, işaret)
   çakışıyor mu? */
function kaleKaroylaCakisirMi(kaleKx, kaleKy, kx, ky) {
  return kaleKaplarMi(kaleKx, kaleKy, kx, ky);
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

  /* KALE 2×2 DENETİMİ — dört ayrı karo, doğru merkez, kenardan
     taşmama ve çakışma sınavı. Biri bozulursa kale görseli ile
     kapladığı alan ayrışır; sessiz kalmasın. */
  try {
    const dort = kaleKarolari(10, 10);
    const tekil = new Set(dort.map(k => k.kx + ":" + k.ky));
    ekle("kale karo sayısı", KALE_BOY * KALE_BOY, tekil.size);

    const m = kaleMerkez(10, 10);
    ekle("kale merkezi x", 10.5, m.kx);
    ekle("kale merkezi y", 10.5, m.ky);

    /* Sağ alt köşe: sol üst en fazla (son - 1) olabilmeli. */
    const kenar = kaleSolUst(karoSayisi() + 5, karoSayisi() + 5);
    ekle("kale kenardan taşmıyor", karoSayisi() - KALE_BOY, kenar.kx);

    /* Bitişik iki kale çakışmaz, bir karo iç içe olan çakışır. */
    ekle("bitişik kaleler serbest", 0, kaleCakisirMi(10, 10, 12, 10, 0) ? 1 : 0);
    ekle("iç içe kaleler dolu",     1, kaleCakisirMi(10, 10, 11, 10, 0) ? 1 : 0);
    ekle("kale kendi karosunu kapsar", 1, kaleKaplarMi(10, 10, 11, 11) ? 1 : 0);
    ekle("kale dışı karo kapsanmaz",   0, kaleKaplarMi(10, 10, 12, 11) ? 1 : 0);
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

    /* Sohbet tekrar sayacı: kök sebep kalktı mı, rakamla görelim.
       0 değilse child_added hâlâ eski kayıtlar için tetikleniyor
       ama tekilleştirme onları yutuyor demektir. */
    setTimeout(() => {
      try {
        if (typeof _chatTekrar === "number" && _chatTekrar > 0) {
          showToast(`ℹ️ Sohbet: ${_chatTekrar} tekrar mesaj yutuldu (çizilmedi).`, 7000);
        }
      } catch (e) {}
    }, 6500);
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
  kaleKaro: kaleKaro, kaleKayit: kaleKayit,
  /* kale 2×2 */
  KALE_BOY: KALE_BOY, kaleBoy: kaleBoy,
  kaleSolUst: kaleSolUst, kaleKarolari: kaleKarolari,
  kaleMerkez: kaleMerkez, kaleMerkezOlcek: kaleMerkezOlcek,
  kaleKaplarMi: kaleKaplarMi, kaleCakisirMi: kaleCakisirMi,
  kaleKaroylaCakisirMi: kaleKaroylaCakisirMi,
  /* teşhis */
  dogrula: dogrula, tani: tani,
};

})();
