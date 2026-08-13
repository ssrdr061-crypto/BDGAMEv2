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

  bosluk_x: 8,      /* kartlar arası YATAY boşluk (px)  */
  bosluk_y: 8,      /* kartlar arası DİKEY boşluk (px)  */
  ic_yan:   10,     /* ızgaranın sağ/sol iç boşluğu (px) */
  ic_ust:   10,     /* ızgaranın üst/alt iç boşluğu (px) */

  kart_gen: 100,    /* kartın yuvayı doldurma oranı — GENİŞLİK % */
  kart_yuk: 100,    /* kartın yuvayı doldurma oranı — YÜKSEKLİK % */
  kart_r:   13,     /* kart köşe yuvarlaklığı (px) */
  kart_dx:  0,      /* tüm kartları yatay kaydır (px) */
  kart_dy:  0,      /* tüm kartları dikey kaydır (px)  */

  isim_bs:  10,     /* kahraman adı yazı boyutu (px) */
  sv_bs:    9.5,    /* "Sv. 1" yazı boyutu (px)      */
  yildiz_bs: 8,     /* yıldız boyutu (px)            */

  portre_dx: 0,     /* TÜM portreleri kaydır (px) — tek tek ayar: KLIST_KART */
  portre_dy: 0,
  portre_s:  1,     /* TÜM portrelerin büyütmesi */

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
    3) KLIST_KART — KAHRAMAN BAŞINA PORTRE İNCE AYARI
    Global portre ayarının ÜSTÜNE biner.
      dx / dy → piksel kaydırma (dy eksi = yukarı)
      s       → büyütme çarpanı
      poz     → object-position (varsayılan "top center")
    ───────────────────────────────────────────── */
const KLIST_KART = {
  /* örnek:  buz_savascisi: { dy: -6, s: 1.08 },  */
};


/* ══════════════════════════════════════════════
   BURADAN AŞAĞISI MOTOR — ayar için yukarısı yeter
   ══════════════════════════════════════════════ */

/* Çalışma kopyası: 🎛 editörü bunu değiştirir, KLIST_UI bozulmaz */
const KV = Object.assign({}, KLIST_UI);

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
  border:2px solid rgba(160,215,255,.45);
  background:linear-gradient(180deg, rgba(96,150,215,.55) 0%, rgba(24,58,112,.85) 60%, rgba(9,26,58,.95) 100%);
  box-shadow:inset 0 2px 3px rgba(150,205,255,.4), 0 4px 8px rgba(0,15,40,.45);
  transition:transform .1s;
  -webkit-tap-highlight-color:transparent;
}
.klist-card:active{ transform:scale(.96); }
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
  background:linear-gradient(180deg, transparent, rgba(3,8,20,.92));
}
.klist-name{
  font-weight:900; color:#fff; line-height:1.15;
  text-shadow:0 1px 3px rgba(0,0,0,.85);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.klist-lv{ font-weight:800; color:#ffe9a8; line-height:1.2; text-shadow:0 1px 2px rgba(0,0,0,.8); }
.klist-stars{ letter-spacing:.5px; line-height:1.1; margin-top:1px; }

/* ── SAHİP OLUNMAYAN KAHRAMAN: tamamen gri ── */
.klist-card.locked{ border-color:rgba(150,175,205,.35); }
.klist-card.locked .klist-portrait{ filter:grayscale(1) brightness(.5); }
.klist-card.locked .klist-name{ color:#c9d6e6; }
.klist-lock{
  position:absolute; inset:0; z-index:4; display:flex;
  flex-direction:column; align-items:center; justify-content:center; gap:3px;
  background:rgba(2,8,22,.30);
}
.klist-lock span{ font-size:22px; filter:drop-shadow(0 2px 4px rgba(0,0,0,.7)); }
.klist-price{ font-size:9.5px; font-weight:900; color:#ffe9a8; text-shadow:0 1px 3px rgba(0,0,0,.85); }

/* ── BOŞ YUVA (ileride doldurulacak) ── */
.klist-card.empty{
  border:2px dashed rgba(160,215,255,.35);
  background:linear-gradient(180deg, rgba(40,80,140,.35), rgba(9,26,58,.55));
  cursor:default; display:flex; align-items:center; justify-content:center;
}
.klist-card.empty:active{ transform:none; }
.klist-card.empty b{ font-size:26px; font-weight:900; color:rgba(200,225,255,.35); }

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
  if (!id) return `<div class="klist-card empty"><b>＋</b></div>`;

  const h = HERO_STATS[id];
  const cfg = (typeof HERO_3D !== "undefined") ? HERO_3D[id] : null;
  const k = Object.assign({ dx: 0, dy: 0, s: 1, poz: "top center" }, KLIST_KART[id] || {});
  const img = (typeof HERO_IMG !== "undefined") ? HERO_IMG[id] : null;
  const sahip = _klistSahip(id);

  const dx = KV.portre_dx + k.dx, dy = KV.portre_dy + k.dy, sc = KV.portre_s * k.s;

  const portre = img
    ? `<img class="klist-portrait" src="${img}" alt="${h.name}" draggable="false"
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

  const kilit = sahip ? "" :
    `<div class="klist-lock"><span>🔒</span>
       <div class="klist-price">💎 ${(h.price || 0).toLocaleString("tr-TR")}</div></div>`;

  return `
    <div class="klist-card ${sahip ? "" : "locked"}" data-hero="${id}"
         style="width:${KV.kart_gen}%;height:${KV.kart_yuk}%;border-radius:${KV.kart_r}px;
                transform:translate(${KV.kart_dx}px,${KV.kart_dy}px);">
      ${portre}
      <div class="klist-spec">${h.specialtyIcon || "⚔️"}</div>
      ${kilit}
      <div class="klist-foot">
        <div class="klist-name" style="font-size:${KV.isim_bs}px;">${h.name}</div>
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
    c.onclick = () => { if (typeof openHeroDetail === "function") openHeroDetail(c.dataset.hero); };
  });

  ov.querySelector("#klistBuy").onclick = () => {
    let hedef = ids[0];
    if (KV.alBtnHedef === "ilk_sahipsiz") {
      const bos = ids.find(id => !_klistSahip(id));
      if (bos) hedef = bos;
    }
    if (hedef && typeof openHeroDetail === "function") openHeroDetail(hedef);
  };

  if (_ktAcik) _klistTunerCiz();
}


/*  ─────────────────────────────────────────────
    🎛 CANLI AYAR MENÜSÜ
    Her satır: – / değer / + . Değiştirdiğin an ekran yenilenir.
    "📋 Kopyala" → KLIST_UI bloğunu panoya alır, dosyanın başına yapıştır.
    ───────────────────────────────────────────── */
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
  { k: "isim_bs",   ad: "İsim yazı boyutu",  adim: 0.5, min: 6,  max: 22 },
  { k: "sv_bs",     ad: "Sv. yazı boyutu",   adim: 0.5, min: 6,  max: 20 },
  { k: "yildiz_bs", ad: "Yıldız boyutu",     adim: 0.5, min: 4,  max: 20 },
  { k: "portre_dx", ad: "Portre ↔ (hepsi)",  adim: 1,   min: -60, max: 60 },
  { k: "portre_dy", ad: "Portre ↕ (hepsi)",  adim: 1,   min: -60, max: 60 },
  { k: "portre_s",  ad: "Portre büyütme",    adim: 0.02, min: .5, max: 2.5 }
];

/* Ayar şeridinin durumu (ekran yenilense de korunur) */
let _ktAcik = false;   /* şerit açık mı            */
let _ktIdx  = 0;       /* hangi ayar seçili        */
let _ktUst  = false;   /* şerit üstte mi (⇅ ile)   */

/* 🎛 düğmesi: aç/kapat */
function _klistTunerAc() {
  _ktAcik = !_ktAcik;
  if (_ktAcik) _klistTunerCiz();
  else { const t = document.getElementById("klistTuner"); if (t) t.style.display = "none"; }
}

/* Şeridi çiz — SADECE İKİ SATIR, kartların üstünü kapatmaz */
function _klistTunerCiz() {
  const t = document.getElementById("klistTuner");
  if (!t) return;
  const f = _KLIST_ALANLAR[_ktIdx];

  t.className = _ktUst ? "kt-ust" : "kt-alt";
  t.innerHTML = `
    <div class="kt-line">
      <button class="kt-nav" id="ktPrev">‹</button>
      <span class="kt-lbl">${f.ad}</span>
      <button class="kt-nav" id="ktNext">›</button>
    </div>
    <div class="kt-line">
      <button class="kt-b" id="ktMinus">–</button>
      <span class="kt-val">${KV[f.k]}</span>
      <button class="kt-b" id="ktPlus">+</button>
      <button class="kt-copy" id="ktCopy">📋 Kopyala</button>
      <button class="kt-move" id="ktMove" title="Şeridi taşı">⇅</button>
      <button class="kt-close" id="ktClose">✕</button>
    </div>
    <div class="kt-out" id="ktOut"></div>`;
  t.style.display = "block";

  const degistir = yon => {
    let v = KV[f.k] + f.adim * yon;
    v = Math.max(f.min, Math.min(f.max, Math.round(v * 100) / 100));
    KV[f.k] = v;
    renderKahramanListesi();     /* ekran canlı değişir, şerit yerinde kalır */
  };
  t.querySelector("#ktMinus").onclick = () => degistir(-1);
  t.querySelector("#ktPlus").onclick  = () => degistir(1);

  t.querySelector("#ktPrev").onclick = () => {
    _ktIdx = (_ktIdx - 1 + _KLIST_ALANLAR.length) % _KLIST_ALANLAR.length; _klistTunerCiz();
  };
  t.querySelector("#ktNext").onclick = () => {
    _ktIdx = (_ktIdx + 1) % _KLIST_ALANLAR.length; _klistTunerCiz();
  };
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

function _klistDegerMetni() {
  return `── kahramanlar.js → KLIST_UI ──
  sutun: ${KV.sutun},  satir: ${KV.satir},
  bosluk_x: ${KV.bosluk_x},  bosluk_y: ${KV.bosluk_y},
  ic_yan: ${KV.ic_yan},  ic_ust: ${KV.ic_ust},
  kart_gen: ${KV.kart_gen},  kart_yuk: ${KV.kart_yuk},
  kart_r: ${KV.kart_r},  kart_dx: ${KV.kart_dx},  kart_dy: ${KV.kart_dy},
  isim_bs: ${KV.isim_bs},  sv_bs: ${KV.sv_bs},  yildiz_bs: ${KV.yildiz_bs},
  portre_dx: ${KV.portre_dx},  portre_dy: ${KV.portre_dy},  portre_s: ${KV.portre_s},`;
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
}

/* Kahraman ekranı kapanınca (satın alma olmuş olabilir) liste tazelensin */
document.addEventListener("click", e => {
  if (!e.target || !e.target.closest) return;
  if (e.target.closest("#hdClose")) {
    const ov = document.getElementById("kahramanListesi");
    if (ov && ov.style.display !== "none") setTimeout(renderKahramanListesi, 0);
  }
}, true);
