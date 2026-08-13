/*  ═══════════════════════════════════════════════════════════
    KAHRAMANLAR.JS — KAHRAMAN LİSTESİ EKRANI
    SÜRÜM: 1.0

    NE YAPAR?
      Alt menüdeki "Kahraman" düğmesine basınca ÖNCE bu liste açılır.
      Sahip olunan/olunmayan tüm kahramanlar ızgara halinde görünür.
      Bir karta dokununca eski kahraman ekranı (heroes.js → openHeroDetail)
      açılır. Sağ alttaki "Kahraman Al" düğmesi de aynı ekranı açar.

    ÇERÇEVE: heroes.js → HERO_UI (kartUst/kartAlt/kartKenar/kartMaxGenislik/
    kartRadius/kartCerceve) değerlerinden okunur; yani kahraman ekranıyla
    BİREBİR aynı çerçevede durur. Orayı değiştirirsen burası da uyar.

    BAĞIMLILIK: heroes.js'ten SONRA yüklenmeli.

    AYAR: aşağıdaki KLIST_UI (genel görünüm) ve KLIST_KART (kahraman
    başına görsel ince ayarı) blokları. Ana koda dokunma.
    ═══════════════════════════════════════════════════════════ */


/*  ─────────────────────────────────────────────
    1) KLIST_UI — GENEL GÖRÜNÜM
    ───────────────────────────────────────────── */
const KLIST_UI = {
  baslik:      "Kahramanlar",
  sutun:       3,        /* ızgara sütun sayısı (3 veya 4)                */
  bosluk:      "9px",    /* kartlar arası boşluk                          */
  kartRadius:  "13px",   /* kart köşe yuvarlaklığı                        */
  kartOran:    "3/4",    /* kart en/boy oranı (genişlik/yükseklik)        */
  yildizGoster: true,    /* kart altında yıldızlar görünsün mü            */
  seviyeGoster: true,    /* kart altında "Sv. 1" yazısı görünsün mü       */
  siralamaGoster: true,  /* sağ üstteki sıralama menüsü görünsün mü       */
  alBtnYazi:   "Kahraman Al",
  alBtnHedef:  "ilk_sahipsiz"  /* "ilk_sahipsiz" = ilk sahip olmadığın kahramanı açar
                                  "ilk"          = listenin ilk kahramanını açar */
};


/*  ─────────────────────────────────────────────
    2) KLIST_KART — KAHRAMAN BAŞINA GÖRSEL İNCE AYARI
    Karttaki portrenin yerini/büyüklüğünü kahraman başına düzeltmek için.
      dx / dy → piksel kaydırma (dy eksi = yukarı)
      s       → büyütme çarpanı (1 = normal)
      poz     → object-position (varsayılan "top center")
    Burada olmayan kahraman VARSAYILAN değerleri kullanır.
    (İnce ayar menüsü sonradan bu değerleri üretecek.)
    ───────────────────────────────────────────── */
const KLIST_KART_VARSAYILAN = { dx: 0, dy: 0, s: 1, poz: "top center" };
const KLIST_KART = {
  /* örnek:  buz_savascisi: { dy: -6, s: 1.08 },  */
};


/* ══════════════════════════════════════════════
   BURADAN AŞAĞISI MOTOR — ayar için yukarısı yeter
   ══════════════════════════════════════════════ */

/* ── CSS (bir kez enjekte edilir) ── */
(function injectKListCSS() {
  if (document.getElementById("klistStyles")) return;
  const st = document.createElement("style");
  st.id = "klistStyles";
  st.textContent = `
#kahramanListesi{
  font-family:'Baloo 2',sans-serif; color:#eaf4ff;
  display:flex; flex-direction:column; overflow:hidden;
  background:
    radial-gradient(ellipse 100% 45% at 50% 0%, rgba(170,240,255,.45), transparent 70%),
    radial-gradient(ellipse 80% 40% at 50% 105%, rgba(8,45,80,.55), transparent 75%),
    linear-gradient(180deg, #1fa3ea, #0e6fc0);
}
.klist-top{
  display:flex; align-items:center; gap:8px; flex:0 0 auto;
  padding:11px 12px; border-bottom:2px solid rgba(190,240,255,.35);
}
.klist-back{
  width:38px; height:34px; flex:0 0 38px; border:none; border-radius:10px;
  background:linear-gradient(180deg,#8894ad,#4a566e); color:#fff;
  font-size:20px; font-weight:900; line-height:1; cursor:pointer;
  box-shadow:0 3px 0 #2b3448; -webkit-tap-highlight-color:transparent;
}
.klist-back:active{ transform:translateY(2px); box-shadow:none; }
.klist-title{
  flex:1 1 auto; font-size:17px; font-weight:900; color:#fff;
  text-shadow:0 2px 4px rgba(0,40,70,.6); padding-left:2px;
}
.klist-sort{
  flex:0 0 auto; height:32px; max-width:44%;
  border-radius:9px; border:2px solid rgba(190,240,255,.6);
  background:rgba(8,45,80,.5); color:#eaf4ff;
  font-family:'Baloo 2',sans-serif; font-size:12px; font-weight:800;
  padding:0 6px; -webkit-appearance:none; appearance:none; cursor:pointer;
}
.klist-grid{
  flex:1 1 auto; display:grid; padding:12px 13px 14px;
  overflow-y:auto; -webkit-overflow-scrolling:touch;
}
.klist-card{
  position:relative; border-radius:13px; overflow:hidden; cursor:pointer;
  border:2px solid rgba(190,240,255,.45);
  background:linear-gradient(180deg, #3d7ccc 0%, #22488f 55%, #152e5e 100%);
  box-shadow:inset 0 2px 3px rgba(150,205,255,.5), 0 4px 8px rgba(0,20,45,.4);
  transition:transform .1s, box-shadow .15s;
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
  background:rgba(4,16,36,.62); border:1px solid rgba(190,240,255,.5);
  display:flex; align-items:center; justify-content:center; font-size:11px;
}
.klist-foot{
  position:absolute; left:0; right:0; bottom:0; z-index:3;
  padding:16px 3px 4px; text-align:center;
  background:linear-gradient(180deg, transparent, rgba(3,8,20,.92));
}
.klist-name{
  font-size:10px; font-weight:900; color:#fff; line-height:1.1;
  text-shadow:0 1px 3px rgba(0,0,0,.85);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.klist-lv{
  font-size:9.5px; font-weight:800; color:#ffe9a8; line-height:1.2;
  text-shadow:0 1px 2px rgba(0,0,0,.8);
}
.klist-stars{ font-size:8px; letter-spacing:.5px; line-height:1.1; margin-top:1px; }
.klist-card.locked .klist-portrait{ filter:grayscale(.85) brightness(.55); }
.klist-lock{
  position:absolute; inset:0; z-index:4; display:flex;
  flex-direction:column; align-items:center; justify-content:center; gap:3px;
  background:rgba(2,8,22,.34);
}
.klist-lock span{ font-size:22px; filter:drop-shadow(0 2px 4px rgba(0,0,0,.7)); }
.klist-price{
  font-size:9.5px; font-weight:900; color:#ffe9a8;
  text-shadow:0 1px 3px rgba(0,0,0,.85);
}
.klist-bottom{
  flex:0 0 auto; display:flex; align-items:center; gap:9px;
  padding:9px 12px 11px; border-top:2px solid rgba(190,240,255,.35);
  background:rgba(6,40,74,.35);
}
.klist-count{
  flex:1 1 0; height:44px; border-radius:12px;
  border:2px solid rgba(190,240,255,.45); background:rgba(8,45,80,.45);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  font-size:12px; font-weight:900; color:#eaf4ff; line-height:1.15;
}
.klist-count small{ font-size:9px; font-weight:700; color:#cfe8ff; }
.klist-buy{
  flex:1 1 0; height:44px; border-radius:12px; cursor:pointer;
  border:2px solid #d4af37; color:#1b1430;
  background:linear-gradient(180deg,#f0c94f,#b8860b);
  font-family:'Baloo 2',sans-serif; font-size:15px; font-weight:900;
  box-shadow:0 4px 0 #6d4f06; -webkit-tap-highlight-color:transparent;
}
.klist-buy:active{ transform:translateY(2px); box-shadow:none; }
.klist-empty{ padding:20px; text-align:center; font-size:12px; font-weight:700; color:#dff2ff; }
@keyframes klistPop{ from{opacity:0; transform:translateX(-50%) translateY(10px) scale(.97)} }
`;
  document.head.appendChild(st);
})();


/* ── çerçeveyi HERO_UI'dan kur (kahraman ekranıyla aynı hiza) ── */
function _klistCerceveStili() {
  const U = (typeof HERO_UI !== "undefined") ? HERO_UI : {};
  if (U.kartTamEkran) {
    return "position:fixed;inset:0;z-index:395;";
  }
  return "position:fixed;left:50%;transform:translateX(-50%);" +
    "top:" + (U.kartUst || "60px") + ";bottom:" + (U.kartAlt || "70px") + ";" +
    "width:calc(100% - " + (U.kartKenar || "12px") + " * 2);" +
    "max-width:" + (U.kartMaxGenislik || "420px") + ";" +
    "z-index:395;border:" + (U.kartCerceve || "3px solid rgba(190,240,255,.85)") + ";" +
    "border-radius:" + (U.kartRadius || "22px") + ";box-sizing:border-box;" +
    "box-shadow:0 0 0 9999px rgba(5,4,10,.72), 0 10px 34px rgba(0,0,0,.55);" +
    "animation:klistPop .18s cubic-bezier(.2,.9,.3,1.3);";
}

/* ── kahramanın seviyesi (seviye sistemi kurulunca burası okur) ── */
function _klistSeviye(id) {
  const s = (typeof state !== "undefined" && state) ? state : {};
  return (s.heroLevels && s.heroLevels[id]) || 1;
}

/* ── kahramanın gücü (index.html → HERO_POWER) ── */
function _klistGuc(id) {
  return (typeof HERO_POWER !== "undefined" && HERO_POWER[id]) ? HERO_POWER[id] : 0;
}

let _klistSirala = "guc";   /* guc | seviye | isim */

/* ── kart HTML'i ── */
function _klistKartHTML(id, sahip) {
  const h = HERO_STATS[id];
  const cfg = (typeof HERO_3D !== "undefined") ? HERO_3D[id] : null;
  const k = Object.assign({}, KLIST_KART_VARSAYILAN, KLIST_KART[id] || {});
  const img = (typeof HERO_IMG !== "undefined") ? HERO_IMG[id] : null;

  const portre = img
    ? `<img class="klist-portrait" src="${img}" alt="${h.name}" draggable="false"
         style="object-position:${k.poz};transform:translate(${k.dx}px,${k.dy}px) scale(${k.s});">`
    : `<div class="klist-portrait klist-noimg" style="background:${h.color}22;color:${h.color};">${h.specialtyIcon || "🦸"}</div>`;

  let yildiz = "";
  if (KLIST_UI.yildizGoster && cfg && cfg.stars) {
    const max = cfg.stars.max || 5, dolu = cfg.stars.filled || 0;
    let t = "";
    for (let i = 0; i < max; i++) {
      t += `<span style="color:${i < dolu ? (cfg.stars.color || "#ffd700") : "rgba(255,255,255,.28)"};">★</span>`;
    }
    yildiz = `<div class="klist-stars">${t}</div>`;
  }

  const seviye = (KLIST_UI.seviyeGoster && sahip)
    ? `<div class="klist-lv">Sv. ${_klistSeviye(id)}</div>` : "";

  const kilit = sahip ? "" :
    `<div class="klist-lock">
       <span>🔒</span>
       <div class="klist-price">💎 ${(h.price || 0).toLocaleString("tr-TR")}</div>
     </div>`;

  return `
    <div class="klist-card ${sahip ? "" : "locked"}" data-hero="${id}"
         style="aspect-ratio:${KLIST_UI.kartOran};border-radius:${KLIST_UI.kartRadius};">
      ${portre}
      <div class="klist-spec">${h.specialtyIcon || "⚔️"}</div>
      ${kilit}
      <div class="klist-foot">
        <div class="klist-name">${h.name}</div>
        ${seviye}
        ${yildiz}
      </div>
    </div>`;
}

/* ── listeyi çiz ── */
function renderKahramanListesi() {
  const ov = document.getElementById("kahramanListesi");
  if (!ov) return;

  const owned = (typeof state !== "undefined" && Array.isArray(state.ownedHeroSkins))
    ? state.ownedHeroSkins : [];

  /* sıra: heroSkins listesinden gelir, sonra seçilen ölçüte göre sıralanır */
  let ids = (typeof heroSkins !== "undefined" ? heroSkins : []).map(s => s.id)
    .filter(id => typeof HERO_STATS !== "undefined" && HERO_STATS[id]);

  const sahipmi = id => owned.indexOf(id) !== -1;
  ids.sort((a, b) => {
    /* sahip olunanlar her zaman üstte */
    if (sahipmi(a) !== sahipmi(b)) return sahipmi(a) ? -1 : 1;
    if (_klistSirala === "isim")   return HERO_STATS[a].name.localeCompare(HERO_STATS[b].name, "tr");
    if (_klistSirala === "seviye") return _klistSeviye(b) - _klistSeviye(a);
    return _klistGuc(b) - _klistGuc(a);
  });

  const kartlar = ids.length
    ? ids.map(id => _klistKartHTML(id, sahipmi(id))).join("")
    : `<div class="klist-empty">Kahraman verisi bulunamadı.</div>`;

  const sortHTML = KLIST_UI.siralamaGoster ? `
    <select class="klist-sort" id="klistSort">
      <option value="guc"    ${_klistSirala === "guc"    ? "selected" : ""}>Güç</option>
      <option value="seviye" ${_klistSirala === "seviye" ? "selected" : ""}>Seviye</option>
      <option value="isim"   ${_klistSirala === "isim"   ? "selected" : ""}>İsim</option>
    </select>` : "";

  ov.innerHTML = `
    <div class="klist-top">
      <button class="klist-back" id="klistBack">‹</button>
      <div class="klist-title">${KLIST_UI.baslik}</div>
      ${sortHTML}
    </div>
    <div class="klist-grid" id="klistGrid"
         style="grid-template-columns:repeat(${KLIST_UI.sutun},1fr);gap:${KLIST_UI.bosluk};">
      ${kartlar}
    </div>
    <div class="klist-bottom">
      <div class="klist-count">
        ${owned.filter(id => HERO_STATS[id]).length} / ${ids.length}
        <small>Kahraman</small>
      </div>
      <button class="klist-buy" id="klistBuy">${KLIST_UI.alBtnYazi}</button>
    </div>`;

  ov.querySelector("#klistBack").onclick = kapatKahramanListesi;

  const sortEl = ov.querySelector("#klistSort");
  if (sortEl) sortEl.onchange = () => { _klistSirala = sortEl.value; renderKahramanListesi(); };

  ov.querySelectorAll(".klist-card").forEach(c => {
    c.onclick = () => {
      if (typeof openHeroDetail === "function") openHeroDetail(c.dataset.hero);
    };
  });

  ov.querySelector("#klistBuy").onclick = () => {
    let hedef = ids[0];
    if (KLIST_UI.alBtnHedef === "ilk_sahipsiz") {
      const bos = ids.find(id => !sahipmi(id));
      if (bos) hedef = bos;
    }
    if (hedef && typeof openHeroDetail === "function") openHeroDetail(hedef);
  };
}

/* ── AÇ / KAPA ── */
function acKahramanListesi() {
  let ov = document.getElementById("kahramanListesi");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "kahramanListesi";
    document.body.appendChild(ov);
  }
  ov.style.cssText = _klistCerceveStili();
  ov.style.display = "flex";
  renderKahramanListesi();
}

function kapatKahramanListesi() {
  const ov = document.getElementById("kahramanListesi");
  if (ov) ov.style.display = "none";
}

/* Kahraman ekranı kapanınca liste açıksa sayılar/kilitler tazelensin.
   (openHeroDetail satın alma yapabiliyor.) */
document.addEventListener("click", e => {
  if (!e.target || !e.target.closest) return;
  if (e.target.closest("#hdClose")) {
    const ov = document.getElementById("kahramanListesi");
    if (ov && ov.style.display !== "none") setTimeout(renderKahramanListesi, 0);
  }
}, true);
