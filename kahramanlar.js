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

    AYAR: 🎛 düğmesi (sol üst) canlı ayar menüsünü açar. Ayarladıktan
    sonra "📋 Kopyala" ile çıkan bloğu aşağıdaki KLIST_UI'ın üstüne yapıştır.
    ═══════════════════════════════════════════════════════════ */


/*  ─────────────────────────────────────────────
    1) KLIST_UI — YERLEŞİM ve ÖLÇÜLER
    (🎛 menüsünün ürettiği değerler buraya yapıştırılır)
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
  silik_bas: 58,    /* kahraman görseli alttan silikleşmeye NEREDE başlasın (% ) */
  alt_koyu:  55,    /* alttaki karartma şeridinin koyuluğu (0-100) */

  isim_bs:  11.5,   /* kahraman adı yazı boyutu (px) — isimGoster açıksa */
  sv_bs:    10,     /* "Sv. 1" yazı boyutu (px)      */
  yildiz_bs: 19,    /* yıldız boyutu (px)            */

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
const KLIST_SIRA = [
  "buz_savascisi",   /* 1 · HALVORSEN */
  "celik_savasci",   /* 2 · STELLİN   */
  "ates_buyucusu",   /* 3 · MİKİAN    */
  "ivanovna",        /* 4 · İVANOVNA  */
  "revolia"          /* 5 · REVOLİA   */
];


/*  ─────────────────────────────────────────────
    3) KLIST_KART — KAHRAMAN BAŞINA İNCE AYAR
    Genel ayarın ÜSTÜNE biner. 🎛 şeridinde 👤 ile kahraman seçip
    ayarlarsan buraya yapıştıracağın satırlar üretilir.
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

const KLIST_KADEME = {
  ivanovna:      "ss",
  revolia:       "ss",
  ates_buyucusu: "normal",   /* MİKİAN    */
  celik_savasci: "normal",   /* STELLİN   */
  buz_savascisi: "normal"    /* HALVORSEN */
};


/* ══════════════════════════════════════════════
   BURADAN AŞAĞISI MOTOR — ayar için yukarısı yeter
   ══════════════════════════════════════════════ */

/* Çalışma kopyaları: 🎛 editörü bunları değiştirir, KLIST_UI/KLIST_KART bozulmaz */
const KV = Object.assign({}, KLIST_UI);

/* Kahraman başına ayarın varsayılanı */
const KLIST_KART_VARSAYILAN = { dx: 0, dy: 0, s: 1, gen: 100, yuk: 100, kdx: 0, kdy: 0, poz: "top center" };

/* Kahramanın etkin ayarı: varsayılan → KLIST_KART → 🎛 ile yapılan canlı değişiklik */
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
  box-shadow:0 0 26px rgba(20,60,120,.5), inset 0 3px 0 var(--km-parlak,rgba(150,205,255,.55)),
             inset 0 -14px 26px rgba(0,10,30,.45);
}
.klist-top{
  position:relative; flex:0 0 auto;
  display:flex; align-items:center; padding:12px 60px 10px 12px;
  border-bottom:2px solid rgba(160,215,255,.30);
}
.klist-title{
  font-size:18px; font-weight:900; color:#fff;
  text-shadow:0 2px 4px rgba(0,40,70,.6);
}
/* Kapatma: oyunun her yerindeki kırmızı düğmenin aynısı (.overlay-close) */
.klist-x{
  position:absolute; top:10px; right:12px;
  width:38px; height:38px; border-radius:10px; z-index:5;
  background:linear-gradient(180deg,#f03434,#c00d0d);
  border:2px solid rgba(255,220,220,.9); color:#fff;
  font-size:19px; font-weight:900; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 4px 10px rgba(120,0,0,.4);
  -webkit-tap-highlight-color:transparent;
}
.klist-x:active{ transform:scale(.92); }
.klist-tune{
  position:absolute; top:14px; right:58px;
  width:30px; height:30px; border-radius:9px; z-index:5;
  background:rgba(6,26,56,.6); border:1px solid #d4af37; color:#d4af37;
  font-size:14px; cursor:pointer; -webkit-tap-highlight-color:transparent;
}
.klist-grid{
  flex:1 1 auto; display:grid; min-height:0;
  overflow-y:auto; -webkit-overflow-scrolling:touch;
}
.klist-cell{ display:flex; align-items:center; justify-content:center; min-width:0; min-height:0; }
.klist-card{
  position:relative; overflow:hidden; cursor:pointer; box-sizing:border-box;
  border:0 solid rgba(160,215,255,.45);   /* kalınlık satır içinde: KLIST_UI.kart_cer */
  background:linear-gradient(180deg, rgba(96,150,215,.55) 0%, rgba(24,58,112,.85) 60%, rgba(9,26,58,.95) 100%);
  box-shadow:0 4px 8px rgba(0,15,40,.45);
  transition:transform .1s;
  -webkit-tap-highlight-color:transparent;
}
/* Çerçeve varken eski iç parlama da gelsin */
.klist-card.cerceveli{ box-shadow:inset 0 2px 3px rgba(150,205,255,.4), 0 4px 8px rgba(0,15,40,.45); }
.klist-card:not(.empty):active{ transform:scale(.96); }
/* Zemin: kahramanın ALTINDA, kutucuğu tam doldurur, taşmaz */
.klist-card .klist-zemin{
  position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; object-position:center; z-index:0; pointer-events:none;
}
.klist-card .klist-portrait{
  position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:1;
}
/* Alttan siliklik: kahraman görseli aşağı doğru eriyip zemine karışır,
   yıldızlar temiz bir alanda kalır. Başlangıç noktası KLIST_UI.silik_bas. */
.klist-card .klist-portrait.silik{
  -webkit-mask-image:linear-gradient(180deg, #000 var(--klist-silik,58%), rgba(0,0,0,0) 100%);
          mask-image:linear-gradient(180deg, #000 var(--klist-silik,58%), rgba(0,0,0,0) 100%);
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
.kt-hedef{ color:#8fe3ff !important; }
.klist-name{
  font-weight:900; color:#fff; line-height:1.15;
  text-shadow:0 1px 3px rgba(0,0,0,.85);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.klist-lv{ font-weight:800; color:#ffe9a8; line-height:1.2; text-shadow:0 1px 2px rgba(0,0,0,.8); }
.klist-stars{ letter-spacing:.5px; line-height:1.1; margin-top:1px; }

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
  box-shadow:inset 0 2px 3px rgba(150,205,255,.22), 0 4px 8px rgba(0,15,40,.35);
  cursor:default; display:flex; align-items:center; justify-content:center;
}
.klist-card.empty b{
  font-size:30px; font-weight:900; color:rgba(200,225,255,.30);
  text-shadow:0 1px 3px rgba(0,0,0,.5);
}

.klist-bottom{
  flex:0 0 auto; display:flex; align-items:center; gap:9px;
  padding:9px 12px 11px; border-top:2px solid rgba(160,215,255,.30);
  background:rgba(4,20,45,.35);
}
.klist-count{
  flex:1 1 0; height:44px; border-radius:12px;
  border:2px solid rgba(160,215,255,.40); background:rgba(6,30,62,.5);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  font-size:13px; font-weight:900; color:#eaf4ff; line-height:1.15;
}
.klist-count small{ font-size:9px; font-weight:700; color:#bcd6f2; }
.klist-buy{
  flex:1 1 0; height:44px; border-radius:12px; cursor:pointer;
  border:2px solid #d4af37; color:#1b1430;
  background:linear-gradient(180deg,#f0c94f,#b8860b);
  font-family:'Baloo 2','Nunito',sans-serif; font-size:15px; font-weight:900;
  box-shadow:0 4px 0 #6d4f06; -webkit-tap-highlight-color:transparent;
}
.klist-buy:active{ transform:translateY(2px); box-shadow:none; }

/* ── 🎛 AYAR ŞERİDİ ──
   Ekranı kapatmaz: iki satırlık ince bir çubuk. Tek seferde TEK ayar
   görünür, ‹ › ile ayarlar arasında gezilir. ⇅ ile çubuk üste/alta taşınır. */
#klistTuner{
  position:absolute; left:6px; right:6px; z-index:30; display:none;
  background:rgba(4,14,32,.92); border:1px solid #d4af37; border-radius:12px;
  padding:6px 7px; color:#fff;
  box-shadow:0 6px 18px rgba(0,0,0,.5);
}
#klistTuner.kt-alt{ bottom:70px; }
#klistTuner.kt-ust{ top:56px; }
#klistTuner .kt-line{ display:flex; align-items:center; gap:5px; }
#klistTuner .kt-line + .kt-line{ margin-top:5px; }
#klistTuner .kt-lbl{
  flex:1 1 auto; min-width:0; text-align:center;
  font-weight:800; font-size:12px; color:#ffe9a8; line-height:1.1;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
#klistTuner .kt-val{
  flex:0 0 54px; text-align:center; font-family:monospace; font-size:15px;
  font-weight:900; color:#2DC9FC;
}
#klistTuner button{
  border:1px solid #4a6a90; background:#12294c; color:#fff;
  border-radius:9px; font-weight:900; cursor:pointer; padding:0;
  -webkit-tap-highlight-color:transparent;
}
#klistTuner button:active{ background:#1d4478; }
#klistTuner .kt-nav{ flex:0 0 34px; height:30px; font-size:16px; }
#klistTuner .kt-b{ flex:0 0 52px; height:38px; font-size:22px; }
#klistTuner .kt-copy{ flex:1 1 0; height:30px; font-size:12px; background:#2DC9FC; color:#000; border-color:#2DC9FC; }
#klistTuner .kt-move{ flex:0 0 34px; height:30px; font-size:14px; }
#klistTuner .kt-close{ flex:0 0 34px; height:30px; font-size:14px; background:#c00d0d; border-color:#c00d0d; }
#klistTuner .kt-out{
  margin-top:5px; font-family:monospace; font-size:9.5px; color:#8fe3ff;
  max-height:78px; overflow:auto; white-space:pre-wrap; word-break:break-all;
  user-select:text; -webkit-user-select:text; display:none;
}
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
  const cfg = (typeof HERO_3D !== "undefined") ? HERO_3D[id] : null;
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

  const portre = img
    ? `<img class="klist-portrait silik" src="${img}" alt="${h.name}" draggable="false"
         style="object-position:${k.poz};transform:translate(${dx}px,${dy}px) scale(${sc});">`
    : `<div class="klist-portrait klist-noimg" style="background:${h.color}22;color:${h.color};">${h.specialtyIcon || "🦸"}</div>`;

  let yildiz = "";
  if (KV.yildizGoster && cfg && cfg.stars) {
    const max = cfg.stars.max || 5, dolu = sahip ? (cfg.stars.filled || 0) : 0;
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
       <div class="klist-price">💎 ${(h.price || 0).toLocaleString("tr-TR")}</div></div>`;

  return `
    <div class="klist-card ${sahip ? "" : "locked"} ${KV.kart_cer > 0 ? "cerceveli" : ""}" data-hero="${id}"
         style="width:${gen}%;height:${yuk}%;border-radius:${KV.kart_r}px;
                border-width:${KV.kart_cer}px;
                --klist-silik:${KV.silik_bas}%; --klist-alt:${KV.alt_koyu / 100};
                transform:translate(${KV.kart_dx + k.kdx}px,${KV.kart_dy + k.kdy}px);">
      ${zemin}
      ${portre}
      <div class="klist-spec">${h.specialtyIcon || "⚔️"}</div>
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
      <button class="klist-tune" id="klistTuneBtn" title="Ayar">🎛</button>
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
    </div>
    <div id="klistTuner"></div>`;

  ov.querySelector("#klistCloseBtn").onclick = kapatKahramanListesi;
  ov.querySelector("#klistTuneBtn").onclick = () => _klistTunerAc();

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

  if (_ktAcik) _klistTunerCiz();
}


/*  ─────────────────────────────────────────────
    🎛 CANLI AYAR ŞERİDİ
    İki satır: üstte ‹ ayar adı ›, altta – değer + .
    👤 düğmesi hedefi değiştirir:
       GENEL  → tüm ızgara/kart ayarları (KLIST_UI)
       <isim> → SADECE o kahramanın kartı (KLIST_KART)
    "📋 Kopyala" → iki bloğu da panoya alır; dosyanın başına yapıştır.
    ───────────────────────────────────────────── */

/* GENEL hedefin alanları → KV (KLIST_UI) */
const _KLIST_ALANLAR = [
  { k: "sutun",     ad: "Sütun sayısı",      adim: 1,   min: 1,  max: 6 },
  { k: "satir",     ad: "Satır sayısı",      adim: 1,   min: 1,  max: 8 },
  { k: "bosluk_x",  ad: "Yatay boşluk",      adim: 1,   min: 0,  max: 40 },
  { k: "bosluk_y",  ad: "Dikey boşluk",      adim: 1,   min: 0,  max: 40 },
  { k: "ic_yan",    ad: "İç boşluk (yan)",   adim: 1,   min: 0,  max: 40 },
  { k: "ic_ust",    ad: "İç boşluk (üst)",   adim: 1,   min: 0,  max: 40 },
  { k: "kart_gen",  ad: "Kart genişliği %",  adim: 1,   min: 30, max: 100 },
  { k: "kart_yuk",  ad: "Kart yüksekliği %", adim: 1,   min: 30, max: 100 },
  { k: "kart_r",    ad: "Köşe yuvarlaklığı", adim: 1,   min: 0,  max: 40 },
  { k: "kart_dx",   ad: "Kart kaydır ↔",     adim: 1,   min: -40, max: 40 },
  { k: "kart_dy",   ad: "Kart kaydır ↕",     adim: 1,   min: -40, max: 40 },
  { k: "kart_cer",  ad: "Çerçeve kalınlığı", adim: 1,   min: 0,  max: 5 },
  { k: "silik_bas", ad: "Alt siliklik %",     adim: 2,   min: 0,  max: 100 },
  { k: "alt_koyu",  ad: "Alt karartma",       adim: 5,   min: 0,  max: 100 },
  { k: "isim_bs",   ad: "İsim yazı boyutu",  adim: 0.5, min: 6,  max: 22 },
  { k: "sv_bs",     ad: "Sv. yazı boyutu",   adim: 0.5, min: 6,  max: 20 },
  { k: "yildiz_bs", ad: "Yıldız boyutu",     adim: 0.5, min: 4,  max: 22 },
  { k: "portre_dx", ad: "Portre ↔ (hepsi)",  adim: 1,   min: -60, max: 60 },
  { k: "portre_dy", ad: "Portre ↕ (hepsi)",  adim: 1,   min: -60, max: 60 },
  { k: "portre_s",  ad: "Portre büyütme",    adim: 0.02, min: .5, max: 2.5 }
];

/* KAHRAMAN hedefinin alanları → KVK[id] (KLIST_KART) */
const _KLIST_ALANLAR_KAHRAMAN = [
  { k: "s",   ad: "Portre büyütme",   adim: 0.02, min: .4, max: 3 },
  { k: "dx",  ad: "Portre ↔",         adim: 1,    min: -80, max: 80 },
  { k: "dy",  ad: "Portre ↕",         adim: 1,    min: -80, max: 80 },
  { k: "gen", ad: "Kart genişliği %", adim: 1,    min: 30, max: 100 },
  { k: "yuk", ad: "Kart yüksekliği %",adim: 1,    min: 30, max: 100 },
  { k: "kdx", ad: "Kart kaydır ↔",    adim: 1,    min: -40, max: 40 },
  { k: "kdy", ad: "Kart kaydır ↕",    adim: 1,    min: -40, max: 40 }
];

/* Ayar şeridinin durumu (ekran yenilense de korunur) */
let _ktAcik  = false;   /* şerit açık mı                       */
let _ktIdx   = 0;       /* hangi ayar seçili                   */
let _ktUst   = false;   /* şerit üstte mi (⇅ ile)              */
let _ktHedef = 0;       /* 0 = GENEL, 1..n = KLIST_SIRA[n-1]   */

function _ktHedefId() {
  return _ktHedef === 0 ? null : KLIST_SIRA[_ktHedef - 1];
}
function _ktAlanlar() {
  return _ktHedef === 0 ? _KLIST_ALANLAR : _KLIST_ALANLAR_KAHRAMAN;
}
function _ktKap() {   /* değerlerin tutulduğu nesne */
  const id = _ktHedefId();
  return id ? _klistKartAyar(id) : KV;
}

/* 🎛 düğmesi: aç/kapat */
function _klistTunerAc() {
  _ktAcik = !_ktAcik;
  if (_ktAcik) _klistTunerCiz();
  else { const t = document.getElementById("klistTuner"); if (t) t.style.display = "none"; }
}

/* Şeridi çiz — üç satır, kartların üstünü kapatmaz */
function _klistTunerCiz() {
  const t = document.getElementById("klistTuner");
  if (!t) return;

  const alanlar = _ktAlanlar();
  if (_ktIdx >= alanlar.length) _ktIdx = 0;
  const f   = alanlar[_ktIdx];
  const kap = _ktKap();
  const id  = _ktHedefId();
  const hedefAd = id
    ? ((typeof HERO_STATS !== "undefined" && HERO_STATS[id]) ? HERO_STATS[id].name : id)
    : "GENEL (hepsi)";

  t.className = _ktUst ? "kt-ust" : "kt-alt";
  t.innerHTML = `
    <div class="kt-line">
      <button class="kt-nav" id="ktHPrev">‹</button>
      <span class="kt-lbl kt-hedef">👤 ${hedefAd}</span>
      <button class="kt-nav" id="ktHNext">›</button>
    </div>
    <div class="kt-line">
      <button class="kt-nav" id="ktPrev">‹</button>
      <span class="kt-lbl">${f.ad}</span>
      <button class="kt-nav" id="ktNext">›</button>
    </div>
    <div class="kt-line">
      <button class="kt-b" id="ktMinus">–</button>
      <span class="kt-val">${kap[f.k]}</span>
      <button class="kt-b" id="ktPlus">+</button>
      <button class="kt-copy" id="ktCopy">📋 Kopyala</button>
      <button class="kt-move" id="ktMove" title="Şeridi taşı">⇅</button>
      <button class="kt-close" id="ktClose">✕</button>
    </div>
    <div class="kt-out" id="ktOut"></div>`;
  t.style.display = "block";

  const degistir = yon => {
    let v = kap[f.k] + f.adim * yon;
    v = Math.max(f.min, Math.min(f.max, Math.round(v * 100) / 100));
    kap[f.k] = v;
    renderKahramanListesi();     /* ekran canlı değişir, şerit yerinde kalır */
  };
  t.querySelector("#ktMinus").onclick = () => degistir(-1);
  t.querySelector("#ktPlus").onclick  = () => degistir(1);

  const n = alanlar.length;
  t.querySelector("#ktPrev").onclick = () => { _ktIdx = (_ktIdx - 1 + n) % n; _klistTunerCiz(); };
  t.querySelector("#ktNext").onclick = () => { _ktIdx = (_ktIdx + 1) % n; _klistTunerCiz(); };

  const hn = KLIST_SIRA.length + 1;   /* GENEL + kahramanlar */
  t.querySelector("#ktHPrev").onclick = () => { _ktHedef = (_ktHedef - 1 + hn) % hn; _ktIdx = 0; _klistTunerCiz(); };
  t.querySelector("#ktHNext").onclick = () => { _ktHedef = (_ktHedef + 1) % hn; _ktIdx = 0; _klistTunerCiz(); };

  t.querySelector("#ktMove").onclick  = () => { _ktUst = !_ktUst; _klistTunerCiz(); };
  t.querySelector("#ktClose").onclick = () => { _ktAcik = false; t.style.display = "none"; };

  t.querySelector("#ktCopy").onclick = () => {
    const txt = _klistDegerMetni();
    const out = t.querySelector("#ktOut");
    out.textContent = txt; out.style.display = "block";
    const btn = t.querySelector("#ktCopy");
    const bitti = ok => { btn.textContent = ok ? "✅ Tamam" : "✘ Olmadı";
                          setTimeout(() => btn.textContent = "📋 Kopyala", 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => bitti(true)).catch(() => bitti(false));
    } else {
      const ta = document.createElement("textarea");
      ta.value = txt; ta.style.cssText = "position:fixed;opacity:0;";
      document.body.appendChild(ta); ta.focus(); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove(); bitti(ok);
    }
  };
}

/* Kopyalanan metin: KLIST_UI + (değişmiş) KLIST_KART satırları */
function _klistDegerMetni() {
  let kartlar = "";
  KLIST_SIRA.forEach(id => {
    const k = KVK[id];
    if (!k) return;
    const fark = [];
    Object.keys(KLIST_KART_VARSAYILAN).forEach(a => {
      if (k[a] !== KLIST_KART_VARSAYILAN[a]) {
        fark.push(`${a}: ${typeof k[a] === "string" ? `"${k[a]}"` : k[a]}`);
      }
    });
    if (fark.length) kartlar += `\n  ${id}: { ${fark.join(", ")} },`;
  });

  return `── kahramanlar.js → KLIST_UI ──
  sutun: ${KV.sutun},  satir: ${KV.satir},
  bosluk_x: ${KV.bosluk_x},  bosluk_y: ${KV.bosluk_y},
  ic_yan: ${KV.ic_yan},  ic_ust: ${KV.ic_ust},
  kart_gen: ${KV.kart_gen},  kart_yuk: ${KV.kart_yuk},
  kart_r: ${KV.kart_r},  kart_dx: ${KV.kart_dx},  kart_dy: ${KV.kart_dy},
  kart_cer: ${KV.kart_cer},  silik_bas: ${KV.silik_bas},  alt_koyu: ${KV.alt_koyu},
  isim_bs: ${KV.isim_bs},  sv_bs: ${KV.sv_bs},  yildiz_bs: ${KV.yildiz_bs},
  portre_dx: ${KV.portre_dx},  portre_dy: ${KV.portre_dy},  portre_s: ${KV.portre_s},

── kahramanlar.js → KLIST_KART ──${kartlar || "\n  (kahramana özel değişiklik yok)"}`;
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
  openHeroDetail(id);
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
