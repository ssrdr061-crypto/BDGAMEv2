/*  ═══════════════════════════════════════════════════════════
    ISTATISTIK.JS — BİRLİK İSTATİSTİK KATMANI
    SÜRÜM: 1

    BU DOSYA NE YAPAR?
    Oyundaki TEK istatistik doğruluk kaynağıdır. Hem istatistik
    ekranı hem (ilerleyen adımda) savaş motoru buradan okur.
    İki ayrı hesap yazılmadığı için "ekranda %40 yazıp savaşta
    %35 işleme" hatası oluşamaz.

    ÜÇ KATMAN:
      1) TABAN   → birliğin seviyesine göre ham değeri
      2) HAVUZ   → kaynaklardan gelen yüzdelerin TOPLAMI
      3) FİNAL   → taban × (1 + havuz/100)

    Kahraman yetenekleri ve mağaza buffları BU KATMANA GİRMEZ.
    Onlar savaş anlıktır, finalin üstüne biner (buff.js).

    NELER KAYDEDİLİR?
    Havuz hiçbir yere yazılmaz, her okumada hesaplanır. Kayda
    giren tek şey kaynakların seviyeleridir:
        state.birlikSv  = { knight:1, soldier:1, robot:1 }
        state.arastirma = { soldier:{ saldiri:3 }, ... }
        state.kaleSv    = 1
    Bu alanlar HENÜZ YOK; yokken hepsi varsayılan sayılır ve
    ekran %0 gösterir. 2. ve 3. adımda doldurulacaklar.

    YÜKLEME SIRASI: troops.js'ten SONRA yüklenmeli
    (UNIT_TYPES'ı okur).
    ═══════════════════════════════════════════════════════════ */

const ISTATISTIK = (function () {

/*  ─────────────────────────────────────────────
    1) AYARLAR — DENGE SAYILARI SADECE BURADA
    ───────────────────────────────────────────── */
const AYAR = {
  SURUM: 1,

  /* Her seviyede her istatistiğe eklenen sabit sayı.
     Sv1 asker 5/3/6/3 ise → Sv2 asker 8/6/9/6 olur. */
  SEVIYE_ARTIS: 3,

  /* ÖLDÜRÜCÜLÜK taban değerleri. Bu istatistik yeni olduğu için
     troops.js'te yok, burada duruyor. İleride istenirse
     UNIT_TYPES'a taşınabilir — o zaman sadece taban() değişir. */
  TABAN_OLUM: { knight: 1, soldier: 3, robot: 5 },

  /* Öldürücülük rakibin savunmasının en fazla yüzde kaçını
     yok sayabilir. %100 olursa savunma anlamsızlaşır. */
  OLUM_TAVAN: 75,

  /* Öldürücülüğün savunma delmeye çevrilme oranı.
     delme% = öldürücülük × BU (tavanla sınırlı). */
  OLUM_CARPAN: 1.5,

  /* Araştırmada bir dalın her seviyesi kaç yüzde verir. */
  ARASTIRMA_ADIM: 2,

  /* Kale seviyesi başına tüm birliklere kaç yüzde. */
  KALE_ADIM: 1,
};

/*  ─────────────────────────────────────────────
    2) İSTATİSTİK LİSTESİ
    Yeni istatistik eklemek istersen buraya satır ekle;
    ekran ve hesap kendiliğinden uyum sağlar.
    ───────────────────────────────────────────── */
const STATLAR = [
  { key: "saldiri", ad: "Saldırı",     ikon: "⚔️", renk: "#ff9d6b" },
  { key: "savunma", ad: "Savunma",     ikon: "🛡️", renk: "#7fd0f2" },
  { key: "can",     ad: "Sağlık",      ikon: "❤️", renk: "#ff8fa3" },
  { key: "olum",    ad: "Öldürücülük", ikon: "💀", renk: "#d3b0ff" },
];

/* Boş havuz nesnesi — {saldiri:0, savunma:0, can:0, olum:0} */
function bosStat() {
  const o = {};
  STATLAR.forEach(s => { o[s.key] = 0; });
  return o;
}

/*  ─────────────────────────────────────────────
    3) STATE ERİŞİMİ
    index.html'de "const state" olduğu için window.state
    her zaman undefined'dır. Doğru erişim kalıbı budur.
    ───────────────────────────────────────────── */
function S() {
  try { return (typeof state !== "undefined") ? state : null; }
  catch (e) { return null; }
}

function birlikler() {
  return (typeof UNIT_TYPES !== "undefined") ? Object.keys(UNIT_TYPES) : [];
}

/*  ─────────────────────────────────────────────
    4) KATMAN 1 — TABAN
    ───────────────────────────────────────────── */

/* Birliğin şu anki seviyesi. state.birlikSv henüz yoksa
   troops.js'teki level alanına, o da yoksa 1'e düşer. */
function seviye(unitId) {
  const st = S();
  const kayit = st && st.birlikSv && st.birlikSv[unitId];
  if (kayit > 0) return kayit;
  const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[unitId] : null;
  return (d && d.level) || 1;
}

/* Seviyeye göre ham değerler. Sv1 = troops.js'teki sayılar. */
function taban(unitId) {
  const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[unitId] : null;
  const out = bosStat();
  if (!d) return out;
  const ek = (seviye(unitId) - 1) * AYAR.SEVIYE_ARTIS;
  out.saldiri = (d.attack  || 0) + ek;
  out.savunma = (d.defense || 0) + ek;
  out.can     = (d.hp      || 0) + ek;
  out.olum    = (AYAR.TABAN_OLUM[unitId] || 0) + ek;
  return out;
}

/*  ─────────────────────────────────────────────
    5) KATMAN 2 — BONUS KAYNAKLARI
    Her kaynak, bir birlik için yüzde nesnesi döndürür.
    Yeni kaynak eklemek = bu listeye bir satır eklemek.
    Yüzdeler TOPLANIR (çarpılmaz).
    ───────────────────────────────────────────── */
const KAYNAKLAR = [

  /* ── ARAŞTIRMA ──────────────────────────────────────────
     Beklenen kayıt biçimi:
       state.arastirma = { soldier: { saldiri: 3, can: 1 }, ... }
     Sayı o dalın SEVİYESİdir, yüzde değil.
     Yüzde = seviye × ARASTIRMA_ADIM.
     (2. adımda araştırma binası bu alanı yazacak.)            */
  {
    id: "arastirma", ad: "Araştırma", ikon: "🔬",
    hesapla(unitId) {
      const out = bosStat();
      const st = S();
      const dal = st && st.arastirma && st.arastirma[unitId];
      if (!dal) return out;
      STATLAR.forEach(s => {
        const lv = Number(dal[s.key]) || 0;
        if (lv > 0) out[s.key] = lv * AYAR.ARASTIRMA_ADIM;
      });
      return out;
    }
  },

  /* ── KALE SEVİYESİ ──────────────────────────────────────
     Küçük ama tüm birliklere ve tüm istatistiklere işler.
     Beklenen kayıt: state.kaleSv = 4
     (3. adımda bağlanacak.)                                   */
  {
    id: "kale", ad: "Kale Seviyesi", ikon: "🏰",
    hesapla(/* unitId */) {
      const out = bosStat();
      const st = S();
      const lv = Number(st && st.kaleSv) || 1;
      const yuzde = Math.max(0, (lv - 1) * AYAR.KALE_ADIM);
      if (yuzde > 0) STATLAR.forEach(s => { out[s.key] = yuzde; });
      return out;
    }
  },
];

/*  ─────────────────────────────────────────────
    6) KATMAN 2 — HAVUZ
    ───────────────────────────────────────────── */

/* Kaynak kaynak dökümü — ekranın "nereden geliyor" listesi. */
function havuzDetay(unitId) {
  return KAYNAKLAR.map(k => ({
    id: k.id, ad: k.ad, ikon: k.ikon,
    deger: k.hesapla(unitId) || bosStat()
  }));
}

/* Tüm kaynakların TOPLAMI. Ekran da savaş da bunu okur. */
function havuz(unitId) {
  const out = bosStat();
  havuzDetay(unitId).forEach(k => {
    STATLAR.forEach(s => { out[s.key] += Number(k.deger[s.key]) || 0; });
  });
  return out;
}

/*  ─────────────────────────────────────────────
    7) KATMAN 3 — FİNAL
    Savaş motoru İLERİDE sadece bu fonksiyonu çağıracak.
    ───────────────────────────────────────────── */
function birim(unitId) {
  const t = taban(unitId);
  const h = havuz(unitId);
  const out = bosStat();
  STATLAR.forEach(s => {
    out[s.key] = t[s.key] * (1 + (h[s.key] || 0) / 100);
  });
  return out;
}

/* Bir ordunun toplamı — { knight:120, soldier:400 } biçiminde
   adet nesnesi alır. Savaş motoru bağlanınca kullanılacak. */
function ordu(adetler) {
  const out = bosStat();
  if (!adetler) return out;
  Object.keys(adetler).forEach(id => {
    const n = Number(adetler[id]) || 0;
    if (n <= 0) return;
    const b = birim(id);
    STATLAR.forEach(s => { out[s.key] += b[s.key] * n; });
  });
  return out;
}

/* Öldürücülük → rakibin savunmasının yüzde kaçı yok sayılır.
   Şu an sadece hesaplanıyor; motora 5. adımda bağlanacak. */
function olumCarpani(olumDegeri) {
  const ham = (Number(olumDegeri) || 0) * AYAR.OLUM_CARPAN;
  return Math.max(0, Math.min(AYAR.OLUM_TAVAN, ham));
}

/*  ═══════════════════════════════════════════════════════════
    8) EKRAN — birlik panelindeki 3. sekme
    troops.js'e HİÇ dokunulmaz; sekme ve ekran buradan
    enjekte edilir.
    ═══════════════════════════════════════════════════════════ */

const SEKME_ID = "istat";

function stil() {
  if (document.getElementById("istatStil")) return;
  const el = document.createElement("style");
  el.id = "istatStil";
  el.textContent = `
.ist-list{
  display:flex; flex-direction:column; gap:10px;
  overflow-y:auto; padding:4px 2px 10px;
  scrollbar-width:thin; scrollbar-color:#5bb9e6 transparent;
}
.ist-list::-webkit-scrollbar{ width:8px; }
.ist-list::-webkit-scrollbar-thumb{ background:linear-gradient(180deg,#7fd0f2,#3d9fd6); border-radius:8px; }

.ist-kart{
  border-radius:12px; padding:8px 10px 9px;
  background:linear-gradient(180deg, #3d7ccc 0%, #22488f 55%, #152e5e 100%);
  box-shadow:0 5px 0 #0b1c3a, 0 10px 16px rgba(0,20,45,.5),
             inset 0 2px 3px rgba(150,205,255,.55), inset 0 -4px 8px rgba(0,10,30,.55);
}
.ist-bas{ display:flex; align-items:center; gap:8px; margin-bottom:7px; }
.ist-bas img{ width:34px; height:34px; object-fit:contain; }
.ist-bas .ist-emoji{ font-size:26px; }
.ist-ad{
  flex:1 1 auto; min-width:0;
  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:13px;
  color:#eaf6ff; text-shadow:0 1px 2px rgba(0,20,45,.6);
}
.ist-adet{
  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:11px;
  color:#bfe6ff; background:rgba(0,20,45,.35);
  padding:2px 8px; border-radius:9px;
}
.ist-satir{
  display:flex; align-items:center; gap:6px;
  padding:3px 0; border-top:1px solid rgba(160,215,255,.16);
  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:12px;
}
.ist-satir:first-of-type{ border-top:none; }
.ist-ikon{ width:18px; text-align:center; font-size:13px; }
.ist-etiket{ flex:1 1 auto; color:#d9edff; }
.ist-taban{ color:#9fc4e6; font-size:11px; }
.ist-ok{ color:#7fa8cc; font-size:10px; }
.ist-final{ color:#fff; min-width:34px; text-align:right; }
.ist-yuzde{
  min-width:48px; text-align:right; font-size:11px;
  color:#8ef0a8;
}
.ist-yuzde.sifir{ color:#7e9ab5; }

.ist-kaynak{
  border-radius:12px; padding:8px 10px;
  background:linear-gradient(180deg, rgba(12,40,75,.85), rgba(8,26,52,.9));
  border:1px solid rgba(150,205,255,.22);
}
.ist-kaynak-bas{
  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:12px;
  color:#cfe9ff; margin-bottom:5px;
}
.ist-kaynak-satir{
  display:flex; align-items:center; gap:7px; padding:2px 0;
  font-family:'Baloo 2',sans-serif; font-weight:700; font-size:11px;
  color:#b6d6f2;
}
.ist-kaynak-satir .k-ad{ flex:1 1 auto; }
.ist-not{
  font-family:'Baloo 2',sans-serif; font-weight:700; font-size:10.5px;
  color:#9dbdd8; line-height:1.45; padding:2px 2px 0;
}
`;
  document.head.appendChild(el);
}

function kartHTML(unitId) {
  const d = UNIT_TYPES[unitId];
  const st = S();
  const adet = (st && st.troops && st.troops[unitId]) || 0;
  const t = taban(unitId), h = havuz(unitId), f = birim(unitId);

  const pic = d.img
    ? `<img src="${d.img}" alt="">`
    : `<span class="ist-emoji">${d.icon || "🪖"}</span>`;

  const ad = (typeof unitAdi === "function")
    ? unitAdi(d)
    : (seviye(unitId) + ".Sv " + d.name);

  const satirlar = STATLAR.map(s => {
    const y = h[s.key] || 0;
    const fin = Math.round(f[s.key] * 10) / 10;
    return `
      <div class="ist-satir">
        <span class="ist-ikon">${s.ikon}</span>
        <span class="ist-etiket">${s.ad}</span>
        <span class="ist-taban">${t[s.key]}</span>
        <span class="ist-ok">→</span>
        <span class="ist-final">${fin}</span>
        <span class="ist-yuzde${y > 0 ? "" : " sifir"}">${y > 0 ? "+%" + (Math.round(y * 10) / 10) : "+%0"}</span>
      </div>`;
  }).join("");

  return `
    <div class="ist-kart">
      <div class="ist-bas">
        ${pic}
        <div class="ist-ad">${ad}</div>
        <div class="ist-adet">${adet}</div>
      </div>
      ${satirlar}
    </div>`;
}

function kaynakHTML() {
  const satirlar = KAYNAKLAR.map(k => {
    /* Kaynağın genel katkısı — birlikler arasında farklıysa
       "değişken" yazar, aynıysa tek sayı gösterir. */
    const degerler = birlikler().map(u => {
      const v = k.hesapla(u) || bosStat();
      return STATLAR.map(s => v[s.key] || 0).join(",");
    });
    const hepsiAyni = degerler.every(x => x === degerler[0]);
    const ilk = k.hesapla(birlikler()[0]) || bosStat();
    const toplam = STATLAR.reduce((a, s) => a + (ilk[s.key] || 0), 0);

    let ozet;
    if (!hepsiAyni) ozet = "birliğe göre değişir";
    else if (toplam <= 0) ozet = "henüz bağlı değil";
    else ozet = "etkin";

    return `
      <div class="ist-kaynak-satir">
        <span>${k.ikon}</span>
        <span class="k-ad">${k.ad}</span>
        <span>${ozet}</span>
      </div>`;
  }).join("");

  return `
    <div class="ist-kaynak">
      <div class="ist-kaynak-bas">Bonus Kaynakları</div>
      ${satirlar}
      <div class="ist-not">
        Yüzdeler toplanır, çarpılmaz. Kahraman ve mağaza güçlendirmeleri
        bu listeye girmez — onlar savaş anında finalin üstüne biner.
      </div>
    </div>`;
}

function ciz() {
  const liste = document.getElementById("istList");
  if (!liste || typeof UNIT_TYPES === "undefined") return;
  liste.innerHTML = birlikler().map(kartHTML).join("") + kaynakHTML();
}

/* Ekranı ve sekmeyi bir kez kur. troops.js'in build()'i
   çalıştıktan SONRA çağrılır (panel açılışında). */
function kur() {
  stil();
  const viewer = document.getElementById("unitViewer");
  const bar = viewer && viewer.querySelector(".tp-tabs");
  if (!viewer || !bar) return false;
  if (bar.querySelector('[data-tab="' + SEKME_ID + '"]')) return true;

  /* sekme düğmesi */
  const btn = document.createElement("button");
  btn.className = "tp-tab";
  btn.dataset.tab = SEKME_ID;
  btn.innerHTML = '<span class="tp-ico">📊</span>İstatistik';
  bar.appendChild(btn);

  /* kendi ekranımız — troops.js'in .tp-screen kabuğunu kullanır */
  const scr = document.createElement("div");
  scr.className = "tp-screen";
  scr.id = "istScreen";
  scr.innerHTML =
    '<button class="tp-close" id="istCloseBtn" aria-label="Kapat">✕</button>' +
    '<div class="ist-list" id="istList"></div>';
  viewer.appendChild(scr);

  function ac() {
    viewer.classList.add("tp-off");
    const digeri = document.getElementById("tpUnitsScreen");
    if (digeri) digeri.classList.remove("is-active");
    scr.classList.add("is-active");
    bar.querySelectorAll(".tp-tab").forEach(b =>
      b.classList.toggle("active", b.dataset.tab === SEKME_ID));
    ciz();
  }
  btn.addEventListener("pointerup", ac);
  btn.addEventListener("click", ac);

  /* Başka sekmeye basılınca bizimkini kapat. troops.js kendi
     show()'unda .active sınıfını zaten bizden alıyor, bize
     sadece ekranı gizlemek kalıyor. */
  function digerSekme(e) {
    const t = e.target.closest && e.target.closest(".tp-tab");
    if (!t || t.dataset.tab === SEKME_ID) return;
    scr.classList.remove("is-active");
  }
  bar.addEventListener("pointerup", digerSekme);
  bar.addEventListener("click", digerSekme);

  /* kapatma düğmesi — troops.js ile aynı yol */
  function kapat() {
    const panel = document.getElementById("panel-troops");
    if (!panel) return;
    if (typeof closeOverlayPanel === "function") closeOverlayPanel(panel);
    else panel.classList.remove("active");
  }
  const kbtn = scr.querySelector("#istCloseBtn");
  kbtn.addEventListener("pointerup", kapat);
  kbtn.addEventListener("click", kapat);

  return true;
}

/* Panel açıldığında sekmeyi enjekte et. troops.js'in build()'i
   aynı olayda çalıştığı için bir tur bekliyoruz. */
document.addEventListener("DOMContentLoaded", function () {
  const panel = document.getElementById("panel-troops");
  if (!panel) return;
  function bak() {
    if (!panel.classList.contains("active")) return;
    if (!kur()) setTimeout(kur, 120);   /* build() geç kaldıysa tekrar dene */
  }
  new MutationObserver(() => setTimeout(bak, 0))
    .observe(panel, { attributes: true, attributeFilter: ["class"] });
  setTimeout(bak, 0);
});

/*  ─────────────────────────────────────────────
    9) DIŞA AÇILAN API
    ───────────────────────────────────────────── */
return {
  SURUM: AYAR.SURUM,
  AYAR, STATLAR,
  seviye, taban, havuz, havuzDetay, birim, ordu, olumCarpani,
  ciz,
};

})();

/* Konsol yok, tarayıcıdan bakmak için: window.ISTATISTIK */
window.ISTATISTIK = ISTATISTIK;
