/*  ═══════════════════════════════════════════════════════════
    KAHRAMANLAR.JS — KAHRAMAN LİSTESİ EKRANI
    SÜRÜM: 2.0   (sürümü buradan takip et, dosya adı hep kahramanlar.js)

    NE YAPAR?
      Alt menüdeki "Kahraman" düğmesine basınca ÖNCE bu liste açılır.
      3×3 = 9 yuva. İlk 5'i kahramanlar, kalan 4'ü ileride doldurulacak
      boş yuva. Bir karta dokununca kahraman ekranı (heroes.js →
      openHeroDetail) açılır. Sağ alttaki "Kahraman Al" da onu açar.

    RENK: Oyunun koyu mavi teması (tema.js → :root --km-1/2/3).
    Ayrı bir renk tanımı YOK; tema.js'te rengi değiştirirsen burası uyar.

    ÇERÇEVE: heroes.js → HERO_UI (kartUst/kartAlt/kartKenar/
    kartMaxGenislik/kartRadius/kartCerceve) — kahraman ekranıyla aynı kutu.

    BAĞIMLILIK: heroes.js'ten SONRA yüklenmeli.

    AYAR: Aşağıdaki KLIST_UI (yerleşim) ve KLIST_KART (kahraman başına
    ince ayar) blokları. Canlı ayar şeridi kaldırıldı; değerler elle yazılır.
    ═══════════════════════════════════════════════════════════ */


/*  ─────────────────────────────────────────────
    1) KLIST_UI — YERLEŞİM ve ÖLÇÜLER
    (kartların yerleşimi, ölçüsü ve yazı boyutları)
    ───────────────────────────────────────────── */
const KLIST_UI = {
  baslik:   "Kahramanlar",

  sutun:    3,      /* ızgara sütun sayısı   */
  satir:    3,      /* ızgara satır sayısı   → toplam yuva = sutun × satir */

  bosluk_x: 5,      /* kartlar arası YATAY boşluk (px)  */
  bosluk_y: 5,      /* kartlar arası DİKEY boşluk (px)  */
  ic_yan:   7,      /* ızgaranın sağ/sol iç boşluğu (px) */
  ic_ust:   1,      /* ızgaranın üst/alt iç boşluğu (px) */

  kart_gen: 99,     /* kartın yuvayı doldurma oranı — GENİŞLİK % */
  kart_yuk: 100,    /* kartın yuvayı doldurma oranı — YÜKSEKLİK % */
  kart_r:   9,      /* kart köşe yuvarlaklığı (px) */
  kart_dx:  0,      /* tüm kartları yatay kaydır (px) */
  kart_dy:  1,      /* tüm kartları dikey kaydır (px)  */

  kart_cer: 0,      /* kart çerçeve kalınlığı (px) — 0 = çerçeve YOK */
  silik_bas: 72,    /* siliklik NEREDE başlasın (%) — üstü tamamen net kalır  */
  silik_bit: 92,    /* siliklik NEREDE bitsin (%) — buradan aşağısı tamamen zemin.
                       İkisi birbirine yakın olursa geçiş dar ve keskin olur;
                       aralık açılırsa görselin daha büyük kısmı erir. */
  alt_koyu:  0,     /* alttaki KARARTMA şeridi (0-100). 0 = karartma yok:
                       görsel doğrudan zemin rengine erir (istenen görünüm).
                       Yazılar bir zemin üzerinde daha okunaklı olsun istersen
                       10-25 arası küçük bir değer yeter. */

  isim_bs:  11.5,   /* kahraman adı yazı boyutu (px) — isimGoster açıksa */
  sv_bs:    13,     /* "Sv. 1" yazı boyutu (px)      */
  yildiz_bs: 20.5,  /* yıldız boyutu (px)            */

  portre_dx: 0,     /* TÜM portreleri kaydır (px) — tek tek ayar: KLIST_KART */
  portre_dy: 0,
  portre_s:  1.08,  /* TÜM portrelerin büyütmesi */

  isimGoster:   false,  /* kart üstünde kahraman adı yazsın mı */
  yildizGoster: true,
  seviyeGoster: true,
  alBtnYazi:  "Kahraman Al",
  alBtnHedef: "ilk_sahipsiz"  /* "ilk_sahipsiz" = ilk sahip olmadığın kahraman
                                 "ilk"          = listenin ilk kahramanı */
};


/*  ─────────────────────────────────────────────
    2) KLIST_SIRA — KAHRAMAN SIRASI
    Yuvalar bu sırayla dolar. Yeni kahraman geldiğinde
    id'sini buraya ekle; boş yuvalar kendiliğinden azalır.
    ───────────────────────────────────────────── */
/* Sıra heroes.js'teki `sira` alanından türer — burada liste tutulmaz. */
const KLIST_SIRA = (typeof KAHRAMAN !== "undefined") ? KAHRAMAN.hepsi() : [];


/*  ─────────────────────────────────────────────
    3) KLIST_KART — KAHRAMAN BAŞINA İNCE AYAR
    Genel ayarın ÜSTÜNE biner; sadece o kahramanın kartını etkiler.
      s       → portre büyütme çarpanı
      dx / dy → portre kaydırma (dy eksi = yukarı)
      gen/yuk → o kahramanın kart genişliği/yüksekliği (% — genelin üstüne)
      kdx/kdy → o kahramanın kartını kaydır (px)
      poz     → object-position (varsayılan "top center")
    ───────────────────────────────────────────── */
const KLIST_KART = {
  buz_savascisi: { dx: 1,  dy: 43, s: 1.66 },
  celik_savasci: {         dy: 11, s: 1.70 },
  ates_buyucusu: { dx: -3, dy: 62, s: 2.08, gen: 98 },
  ivanovna:      { dx: -1, dy: 61, s: 1.98 },
  revolia:       { dx: 2,  dy: 69, s: 2.46 }
};


/*  ─────────────────────────────────────────────
    4) KAHRAMAN KADEMESİ ve KART ZEMİNİ

    Kartın arkasına gömülen renkli zemin görseli. Kahramanın altında,
    kutucuğun içinde durur: taşmaz (object-fit:cover + kart overflow:hidden),
    boşluk da bırakmaz.

    KLIST_ZEMIN  → kademe adı : dosya adı  (düz mod, klasörsüz)
    KLIST_KADEME → kahraman   : kademe adı
    Listede olmayan kahraman "normal" sayılır.
    Renkler ters gelirse SADECE aşağıdaki iki dosya adını yer değiştir.
    ───────────────────────────────────────────── */
const KLIST_ZEMIN = {
  ss:     "gorsel22.webp",   /* TURUNCU — SS kahramanlar */
  normal: "gorsel23.webp"    /* YEŞİL   — normal kahramanlar */
};

/*  Kart zemini nadirlikten türer. Eskiden burada ayrı bir liste
    vardı ve heroes.js'te nadirlik değişince burası unutuluyordu —
    Stellin turuncuya çıktığı halde kartı mor kalmıştı.            */
const KLIST_KADEME = (typeof KAHRAMAN !== "undefined")
  ? KAHRAMAN.tablo(id => KAHRAMAN.ssrMi(id) ? "ss" : "normal")
  : {};


/* ══════════════════════════════════════════════
   BURADAN AŞAĞISI MOTOR — ayar için yukarısı yeter
   ══════════════════════════════════════════════ */

/* Çalışma kopyaları — çizim bunlardan okur */
const KV = Object.assign({}, KLIST_UI);

/* Kahraman başına ayarın varsayılanı */
const KLIST_KART_VARSAYILAN = { dx: 0, dy: 0, s: 1, gen: 100, yuk: 100, kdx: 0, kdy: 0, poz: "top center" };

/* Kahramanın etkin ayarı: varsayılan + KLIST_KART */
const KVK = {};   /* editörün çalışma kopyası */
function _klistKartAyar(id) {
  if (!KVK[id]) KVK[id] = Object.assign({}, KLIST_KART_VARSAYILAN, KLIST_KART[id] || {});
  return KVK[id];
}

/* ── CSS (bir kez enjekte edilir) ──
   Renkler tema.js'in :root değişkenlerinden gelir; değişken yoksa
   yedek olarak aynı koyu maviler yazılıdır. */
(function injectKListCSS() {
  if (document.getElementById("klistStyles")) return;
  const st = document.createElement("style");
  st.id = "klistStyles";
  st.textContent = `
#kahramanListesi{
  font-family:'Baloo 2','Nunito',sans-serif; color:var(--km-yazi,#eaf4ff);
  display:flex; flex-direction:column; overflow:hidden;
  background:
    radial-gradient(ellipse 115% 55% at 50% -6%, rgba(130,200,255,.30), transparent 68%),
    radial-gradient(ellipse 90% 45% at 50% 106%, rgba(3,10,26,.55), transparent 74%),
    linear-gradient(180deg, var(--km-1,#3d7ccc) 0%, var(--km-2,#22488f) 52%, var(--km-3,#152e5e) 100%);
  /* 3B kaldırıldı: dış parlama ve iç kabartı yok, düz gölge. */
  box-shadow:0 2px 6px rgba(0,20,45,.3);
}
.klist-top{
  position:relative; flex:0 0 auto;
  /* Başlık ORTADA: iki yanda eşit pay bırakılıyor, yoksa sağdaki ✕
     yüzünden metin sola kaçar. Alt ayırma çizgisi kaldırıldı. */
  display:flex; align-items:center; justify-content:center;
  padding:12px 60px 10px 60px;
  border-bottom:none;
}
.klist-title{
  font-size:24px; font-weight:900; color:#fff; text-align:center;
  text-shadow:0 1px 2px rgba(0,20,45,.55);
}
/* Kapatma: oyunun her yerindeki kırmızı düğmenin aynısı (.overlay-close) */
.klist-x{
  position:absolute; top:10px; right:12px;
  width:38px; height:38px; border-radius:10px; z-index:5;
  background:linear-gradient(180deg,#f03434,#c00d0d);
  border:1px solid rgba(255,220,220,.75); color:#fff;
  font-size:19px; font-weight:900; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  box-shadow:none;
  -webkit-tap-highlight-color:transparent;
}
.klist-x:active{ transform:scale(.92); }
.klist-grid{
  flex:1 1 auto; display:grid; min-height:0;
  overflow-y:auto; -webkit-overflow-scrolling:touch;
}
.klist-cell{ display:flex; align-items:center; justify-content:center; min-width:0; min-height:0; }
.klist-card{
  position:relative; overflow:hidden; cursor:pointer; box-sizing:border-box;
  border:0 solid rgba(160,215,255,.45);   /* kalınlık satır içinde: KLIST_UI.kart_cer */
  /* ZEMİN YOK. Eskiden burada mavi bir degrade vardı; kademe görseli
     (KLIST_ZEMIN) onun ÜSTÜNE biniyor ve görselin yuvarlatılmış saydam
     köşelerinden alttaki mavi sivri uçlar halinde sızıyordu. Rengi
     kartın tamamında kademe görseli veriyor, ikinci bir zemin gereksiz.
     Görsel yüklenemezse kart şeffaf kalır — panelin rengi görünür. */
  background:transparent;
  box-shadow:none;
  transition:transform .1s;
  -webkit-tap-highlight-color:transparent;
}
/* Çerçeve varken eski iç parlama da gelsin */
.klist-card.cerceveli{ box-shadow:none; }
.klist-card:not(.empty):active{ transform:scale(.96); }
/* Zemin: kahramanın ALTINDA, kutucuğu tam doldurur, taşmaz */
.klist-card .klist-zemin{
  position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; object-position:center; z-index:0; pointer-events:none;
  /* KÖŞE TAŞIRMA: görselin kendi köşeleri yuvarlak ve SAYDAM. Birebir
     oturtulursa o saydam köşelerden arkadaki panel mavi sivri uçlar
     halinde sızıyor. Görseli biraz büyütüyoruz; kart taşanı kırptığı
     için (overflow:hidden) köşeler tamamen dolar. Hâlâ sızıyorsa bu
     sayıyı 1.14'e çıkar, fazlası kenardaki çizimi yer. */
  transform:scale(1.08);
}
/* ── PORTRE KABI ──
   DİKKAT: siliklik maskesi KABA uygulanır, görselin kendisine DEĞİL.
   Görsel büyütülüp (scale) aşağı kaydırıldığı için maske ona takılırsa
   maske de onunla birlikte büyüyüp kartın dışına iniyor ve hiçbir etki
   görünmüyordu. Kap kartla aynı ölçüdedir, hareket etmez. */
.klist-card .klist-portre-kap{
  position:absolute; inset:0; z-index:1; overflow:hidden; pointer-events:none;
}
.klist-card .klist-portre-kap.silik{
  -webkit-mask-image:linear-gradient(180deg, #000 var(--klist-silik,72%), rgba(0,0,0,0) var(--klist-silik-bit,88%));
          mask-image:linear-gradient(180deg, #000 var(--klist-silik,72%), rgba(0,0,0,0) var(--klist-silik-bit,88%));
  -webkit-mask-size:100% 100%; mask-size:100% 100%;
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
}
.klist-card .klist-portrait{
  position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
}
.klist-portrait.klist-noimg{
  display:flex; align-items:center; justify-content:center; font-size:32px;
}
.klist-spec{
  position:absolute; top:4px; left:4px; z-index:3;
  width:21px; height:21px; border-radius:7px;
  background:rgba(4,16,36,.65); border:1px solid rgba(160,215,255,.45);
  display:flex; align-items:center; justify-content:center; font-size:11px;
}
.klist-foot{
  position:absolute; left:0; right:0; bottom:0; z-index:3;
  padding:16px 3px 4px; text-align:center;
  background:linear-gradient(180deg, transparent, rgba(3,8,20,var(--klist-alt,.55)));
}
.klist-name{
  font-weight:900; color:#fff; line-height:1.15;
  text-shadow:0 1px 3px rgba(0,0,0,.85);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.klist-lv{
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; color:#fff; line-height:1.2;
  text-align:left; padding-left:5px;                 /* sol köşeye yaklaştırıldı */
  text-shadow:0 1px 2px rgba(0,0,0,.9), 0 0 4px rgba(0,0,0,.6);
}
.klist-stars{
  font-family:'Baloo 2','Nunito',sans-serif;
  letter-spacing:.5px; line-height:1.1; margin-top:1px;
  transform:translateX(-2px);                        /* sola çekildi */
  text-shadow:0 1px 2px rgba(0,0,0,.55);
}

/* ── SAHİP OLUNMAYAN KAHRAMAN: tamamen gri ── */
.klist-card.locked{ border-color:rgba(150,175,205,.35); }
.klist-card.locked .klist-portrait,
.klist-card.locked .klist-zemin{ filter:grayscale(1) brightness(.5); }
.klist-card.locked .klist-name{ color:#c9d6e6; }
.klist-lock{
  position:absolute; inset:0; z-index:4; display:flex;
  flex-direction:column; align-items:center; justify-content:center; gap:3px;
  background:rgba(2,8,22,.30);
}
.klist-lock span{ font-size:22px; filter:drop-shadow(0 2px 4px rgba(0,0,0,.7)); }
.klist-price{ font-size:9.5px; font-weight:900; color:#ffe9a8; text-shadow:0 1px 3px rgba(0,0,0,.85); }

/* ── BOŞ YUVA (ileride doldurulacak) ── */
/* Boş yuva: kahraman kartıyla AYNI kutu — sadece içi boş ve soluk.
   Ölçüsü satır içinde kart ile aynı verilir, burada sadece görünüm. */
.klist-card.empty{
  border-color:rgba(160,215,255,.28);
  background:linear-gradient(180deg, rgba(96,150,215,.28) 0%, rgba(24,58,112,.55) 60%, rgba(9,26,58,.75) 100%);
  box-shadow:none;
  cursor:default; display:flex; align-items:center; justify-content:center;
}
.klist-card.empty b{
  font-size:30px; font-weight:900; color:rgba(200,225,255,.30);
  text-shadow:0 1px 3px rgba(0,0,0,.5);
}

.klist-bottom{
  flex:0 0 auto; display:flex; align-items:center; gap:9px;
  padding:9px 12px 11px; border-top:none;
  background:rgba(4,20,45,.35);
}
.klist-count{
  flex:1 1 0; height:44px; border-radius:12px;
  border:1px solid rgba(190,240,255,.20); background:rgba(6,30,62,.5);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  font-size:13px; font-weight:900; color:#eaf4ff; line-height:1.15;
}
.klist-count small{ font-size:9px; font-weight:700; color:#bcd6f2; }
.klist-buy{
  flex:1 1 0; height:44px; border-radius:12px; cursor:pointer;
  border:none; color:#1b1430;
  background:linear-gradient(180deg,#f0c94f,#b8860b);
  font-family:'Baloo 2','Nunito',sans-serif; font-size:15px; font-weight:900;
  box-shadow:none; text-shadow:0 1px 2px rgba(0,20,45,.35);
  transition:transform .09s, filter .09s;
  -webkit-tap-highlight-color:transparent;
}
.klist-buy:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none; }

/* ── KAHRAMAN EKRANI PERDESİ ──
   tema.js'teki kaydırma bloğu geçişte kartı 120 ms boyunca saydamlaştırıyor (opacity 0).
   Kartın kararmayı kendi dev gölgesiyle (0 0 0 9999px) yaptığı için o an
   perde de kartla birlikte kayboluyor ve altından HARİTA görünüyordu.
   Çözüm: kararmayı karttan alıp ayrı bir katmana taşımak. Perde kartın
   ALTINDA (z-index 398) sabit durur, kart sönerken yerinde kalır. */
#klistPerde{
  position:fixed; inset:0; z-index:398; display:none;
  background:rgba(5,4,10,.72);
  -webkit-tap-highlight-color:transparent;
}
/* Kartın 9999px'lik kararması iptal (inline stili !important ezer) */
#heroDetailOverlay{ box-shadow:0 10px 34px rgba(0,0,0,.55) !important; }

@keyframes klistPop{ from{opacity:0; transform:translateX(-50%) translateY(10px) scale(.97)} }
`;
  document.head.appendChild(st);
})();


/* ── çerçeveyi HERO_UI'dan kur (kahraman ekranıyla aynı hiza) ── */
function _klistCerceveStili() {
  const U = (typeof HERO_UI !== "undefined") ? HERO_UI : {};
  if (U.kartTamEkran) return "position:fixed;inset:0;z-index:395;";
  return "position:fixed;left:50%;transform:translateX(-50%);" +
    "top:" + (U.kartUst || "60px") + ";bottom:" + (U.kartAlt || "70px") + ";" +
    "width:calc(100% - " + (U.kartKenar || "12px") + " * 2);" +
    "max-width:" + (U.kartMaxGenislik || "420px") + ";" +
    "z-index:395;border:" + (U.kartCerceve || "3px solid rgba(190,240,255,.85)") + ";" +
    "border-radius:" + (U.kartRadius || "22px") + ";box-sizing:border-box;" +
    "animation:klistPop .18s cubic-bezier(.2,.9,.3,1.3);";
}

function _klistSeviye(id) {
  const s = (typeof state !== "undefined" && state) ? state : {};
  return (s.heroLevels && s.heroLevels[id]) || 1;
}

function _klistSahip(id) {
  const s = (typeof state !== "undefined" && state) ? state : {};
  return Array.isArray(s.ownedHeroSkins) && s.ownedHeroSkins.indexOf(id) !== -1;
}

/* ── tek kart ── */
function _klistKartHTML(id) {
  /* BOŞ YUVA — kahraman kartıyla birebir aynı ölçü ve köşe, sadece içi boş */
  if (!id) return `
    <div class="klist-card empty"
         style="width:${KV.kart_gen}%;height:${KV.kart_yuk}%;border-radius:${KV.kart_r}px;
                border-width:2px;
                transform:translate(${KV.kart_dx}px,${KV.kart_dy}px);">
      <b>＋</b>
    </div>`;

  const h = HERO_STATS[id];
  /*  HERO_3D bir KAPI DEĞİL, yalnız ince ayar tablosudur. Eskiden
      `HERO_3D[id]` null dönünce aşağıdaki yıldız bloğu hiç
      çizilmiyordu: o tabloya yazılmamış yeni kahramanların kartında
      yıldızlar görünmüyordu. (Aynı hata openHeroDetail'de ekranı
      tamamen çökertiyordu.) Kaydı yoksa varsayılana düşer.        */
  const cfg = ((typeof HERO_3D !== "undefined") && HERO_3D[id])
           || ((typeof HERO_3D_VARSAYILAN !== "undefined") ? HERO_3D_VARSAYILAN : null);
  const k = _klistKartAyar(id);                    /* kahramana özel ayar */
  const img = (typeof HERO_IMG !== "undefined") ? HERO_IMG[id] : null;
  const sahip = _klistSahip(id);

  const dx = KV.portre_dx + k.dx, dy = KV.portre_dy + k.dy, sc = KV.portre_s * k.s;
  const gen = KV.kart_gen * (k.gen / 100);         /* kahramana özel genişlik  */
  const yuk = KV.kart_yuk * (k.yuk / 100);         /* kahramana özel yükseklik */

  const kademe = KLIST_KADEME[id] || "normal";
  const zeminSrc = KLIST_ZEMIN[kademe] || "";
  const zemin = zeminSrc
    ? `<img class="klist-zemin" src="${zeminSrc}" alt="" draggable="false">` : "";

  const icerik = img
    ? `<img class="klist-portrait" src="${img}" alt="${h.name}" draggable="false"
         style="object-position:${k.poz};transform:translate(${dx}px,${dy}px) scale(${sc});">`
    : `<div class="klist-portrait klist-noimg" style="background:${h.color}22;color:${h.color};">${h.specialtyIcon || "🦸"}</div>`;
  const portre = `<div class="klist-portre-kap ${KV.silik_bas < 100 ? "silik" : ""}">${icerik}</div>`;

  let yildiz = "";
  if (KV.yildizGoster && cfg && cfg.stars) {
    /* Dolu yıldız = SEVİYE (gelistir.js). cfg.stars.filled kullanılmaz. */
    const max = cfg.stars.max || 5;
    /* Geliştirme sistemi kapalıyken kartlar eski hâlinde kalır */
    const acik = (typeof window.GELISTIR_ACIK === "function") && window.GELISTIR_ACIK();
    const dolu = (sahip && acik) ? _klistSeviye(id) : (cfg.stars.filled || 0);
    let t = "";
    for (let i = 0; i < max; i++)
      t += `<span style="color:${i < dolu ? (cfg.stars.color || "#ffd700") : "rgba(255,255,255,.28)"};">★</span>`;
    yildiz = `<div class="klist-stars" style="font-size:${KV.yildiz_bs}px;">${t}</div>`;
  }

  const seviye = (KV.seviyeGoster && sahip)
    ? `<div class="klist-lv" style="font-size:${KV.sv_bs}px;">Sv. ${_klistSeviye(id)}</div>` : "";

  const isim = KV.isimGoster
    ? `<div class="klist-name" style="font-size:${KV.isim_bs}px;">${h.name}</div>` : "";

  const kilit = sahip ? "" :
    `<div class="klist-lock"><span>🔒</span>
       <div class="klist-price">${ELMAS("kahraman")} ${(h.price || 0).toLocaleString("tr-TR")}</div></div>`;

  return `
    <div class="klist-card ${sahip ? "" : "locked"} ${KV.kart_cer > 0 ? "cerceveli" : ""}" data-hero="${id}"
         style="width:${gen}%;height:${yuk}%;border-radius:${KV.kart_r}px;
                border-width:${KV.kart_cer}px;
                --klist-silik:${KV.silik_bas}%; --klist-silik-bit:${KV.silik_bit}%;
                --klist-alt:${KV.alt_koyu / 100};
                transform:translate(${KV.kart_dx + k.kdx}px,${KV.kart_dy + k.kdy}px);">
      ${zemin}
      ${portre}
      <div class="klist-spec">${(typeof komutanRozeti === "function") ? komutanRozeti(id) : (h.specialtyIcon || "⚔️")}</div>
      ${kilit}
      <div class="klist-foot">
        ${isim}
        ${seviye}
        ${yildiz}
      </div>
    </div>`;
}

/* ── listeyi çiz ── */
function renderKahramanListesi() {
  const ov = document.getElementById("kahramanListesi");
  if (!ov) return;

  const ids = KLIST_SIRA.filter(id => typeof HERO_STATS !== "undefined" && HERO_STATS[id]);
  const yuva = Math.max(1, KV.sutun * KV.satir);

  let hucreler = "";
  for (let i = 0; i < yuva; i++) hucreler += `<div class="klist-cell">${_klistKartHTML(ids[i] || null)}</div>`;

  const sahipSayi = ids.filter(_klistSahip).length;

  ov.innerHTML = `
    <div class="klist-top">
      <div class="klist-title">${KV.baslik}</div>
      <button class="klist-x" id="klistCloseBtn" aria-label="Kapat">✕</button>
    </div>
    <div class="klist-grid" id="klistGrid"
         style="grid-template-columns:repeat(${KV.sutun},1fr);
                grid-template-rows:repeat(${KV.satir},1fr);
                column-gap:${KV.bosluk_x}px; row-gap:${KV.bosluk_y}px;
                padding:${KV.ic_ust}px ${KV.ic_yan}px;">
      ${hucreler}
    </div>
    <div class="klist-bottom">
      <div class="klist-count">${sahipSayi} / ${ids.length}<small>Kahraman</small></div>
      <button class="klist-buy" id="klistBuy">${KV.alBtnYazi}</button>
    </div>`;

  ov.querySelector("#klistCloseBtn").onclick = kapatKahramanListesi;

  ov.querySelectorAll(".klist-card[data-hero]").forEach(c => {
    c.onclick = () => _klistKahramanAc(c.dataset.hero);
  });

  ov.querySelector("#klistBuy").onclick = () => {
    let hedef = ids[0];
    if (KV.alBtnHedef === "ilk_sahipsiz") {
      const bos = ids.find(id => !_klistSahip(id));
      if (bos) hedef = bos;
    }
    if (hedef) _klistKahramanAc(hedef);
  };

}


/* ── AÇ / KAPA ── */
function acKahramanListesi() {
  let ov = document.getElementById("kahramanListesi");
  if (!ov) { ov = document.createElement("div"); ov.id = "kahramanListesi"; document.body.appendChild(ov); }
  ov.style.cssText = _klistCerceveStili();
  ov.style.display = "flex";
  renderKahramanListesi();
}

function kapatKahramanListesi() {
  const ov = document.getElementById("kahramanListesi");
  if (ov) ov.style.display = "none";
  _klistDetayda = false;
  _klistPerdeKapat();
}

/*  ─────────────────────────────────────────────
    KAHRAMAN EKRANINA GEÇİŞ

    DİKKAT — kahraman ekranı açıkken liste GİZLENİR.
    Sebebi: tema.js'teki kaydırma bloğu (‹ › geçişi) kartı önce
    `opacity:0` yapıp 120 ms sonra öbür kahramanı çiziyor. Liste
    kartın ARKASINDA (z-index 395 < 400) açık dururken o 120 ms
    boyunca saydam kartın altından görünüyor ve "menü gelip gidiyor"
    izlenimi veriyor. Listeyi gizleyince arkada bir şey kalmıyor.
    Kahraman ekranı kapanınca liste geri açılır ve tazelenir
    (satın alma olmuş olabilir).
    ───────────────────────────────────────────── */
let _klistDetayda = false;   /* kahraman ekranı listeden mi açıldı */

function _klistKahramanAc(id) {
  if (typeof openHeroDetail !== "function") return;
  const ov = document.getElementById("kahramanListesi");
  if (ov) ov.style.display = "none";
  _klistDetayda = true;
  _klistPerdeAc();
  /*  openHeroDetail ÇÖKERSE liste gizli, perde açık kalıyordu:
      ekran kararıp kendiliğinden kapanıyor gibi görünüyor ve hata
      hiçbir yere yazılmıyor. Artık yakalanıyor: liste geri gelir ve
      hata metni ekrana basılır (telefonda konsol yok).            */
  try {
    openHeroDetail(id);
  } catch (e) {
    _klistDetayda = false;
    _klistPerdeKapat();
    if (ov) { ov.style.display = "flex"; renderKahramanListesi(); }
    _klistHataGoster(id, e);
  }
}

/* Ekran üstü hata şeridi — showToast bu projede kapalı, konsol yok. */
function _klistHataGoster(id, e) {
  let d = document.getElementById("klistHata");
  if (!d) {
    d = document.createElement("div");
    d.id = "klistHata";
    d.style.cssText =
      "position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;" +
      "background:#3a0d12;color:#ffd8dc;border:1px solid #ff6b7a;" +
      "border-radius:10px;padding:10px 12px;font-size:12px;" +
      "line-height:1.45;white-space:pre-wrap;word-break:break-word;" +
      "max-height:45vh;overflow:auto;";
    d.onclick = () => d.remove();
    document.body.appendChild(d);
  }
  const yig = (e && e.stack ? String(e.stack) : String(e && e.message || e));
  d.textContent = "KAHRAMAN AÇILAMADI: " + id + "\n" +
                  yig.split("\n").slice(0, 6).join("\n") +
                  "\n\n(kapatmak için dokun)";
}

/* ── perde ── */
let _klistPerdeSaat = null;
function _klistPerdeAc() {
  let p = document.getElementById("klistPerde");
  if (!p) { p = document.createElement("div"); p.id = "klistPerde"; document.body.appendChild(p); }
  p.style.display = "block";
  /* Kahraman ekranı başka bir yoldan kapanırsa (alt menüden başka bölüme
     geçmek gibi) perde ekranda kalmasın diye kısa aralıklarla denetlenir. */
  if (_klistPerdeSaat) clearInterval(_klistPerdeSaat);
  _klistPerdeSaat = setInterval(() => {
    const ov = document.getElementById("heroDetailOverlay");
    const acik = ov && ov.style.display !== "none" && ov.offsetWidth > 0;
    if (!acik) _klistPerdeKapat();
  }, 300);
}
function _klistPerdeKapat() {
  const p = document.getElementById("klistPerde");
  if (p) p.style.display = "none";
  if (_klistPerdeSaat) { clearInterval(_klistPerdeSaat); _klistPerdeSaat = null; }
}

/* Kahraman ekranı ✕ ile kapanınca listeye dön */
document.addEventListener("click", e => {
  if (!e.target || !e.target.closest) return;
  if (!e.target.closest("#hdClose")) return;
  if (!_klistDetayda) return;
  _klistDetayda = false;
  _klistPerdeKapat();
  setTimeout(() => {
    const ov = document.getElementById("kahramanListesi");
    if (!ov) return;
    ov.style.display = "flex";
    renderKahramanListesi();
  }, 0);
}, true);
