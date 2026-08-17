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
  SURUM: 2,

  /* Öldürücülük rakibin savunmasının en fazla yüzde kaçını
     yok sayabilir. %100 olursa savunma anlamsızlaşır. */
  OLUM_TAVAN: 75,

  /* delme% = öldürücülük × BU (tavanla sınırlı) */
  OLUM_CARPAN: 1.5,

  /* Araştırmada bir dalın her seviyesi kaç yüzde verir. */
  ARASTIRMA_ADIM: 2,

  /* Kale seviyesi başına tüm birliklere kaç yüzde. */
  KALE_ADIM: 1,
};

/*  NOT: Birliklerin taban değerleri ve kademe artışı artık
    troops.js'tedir (UNIT_TYPES + KADEME). Burada ikinci bir
    tablo tutulmaz — tek doğruluk kaynağı kuralı.              */

/*  ─────────────────────────────────────────────
    2) İSTATİSTİK LİSTESİ
    Yeni istatistik eklemek istersen buraya satır ekle;
    ekran ve hesap kendiliğinden uyum sağlar.
    ───────────────────────────────────────────── */
const STATLAR = [
  { key: "saldiri", ad: "Saldırı"     },
  { key: "savunma", ad: "Savunma"     },
  { key: "can",     ad: "Sağlık"      },
  { key: "olum",    ad: "Öldürücülük" },
];

/*  Ekranda birlik adı DEĞİL rol adı yazar (Savunucu Saldırı gibi).
    Rol adları troops.js → UNIT_ROLES.label'dan gelir, burada
    ikinci bir liste tutulmaz.                                    */
function rolSembol(unitId) {
  if (typeof UNIT_ROLES !== "undefined") {
    const r = UNIT_ROLES.find(x => x.unit === unitId);
    if (r && r.icon) return r.icon;
  }
  const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[unitId] : null;
  return (d && d.icon) || "";
}

function rolAdi(unitId) {
  if (typeof UNIT_ROLES !== "undefined") {
    const r = UNIT_ROLES.find(x => x.unit === unitId);
    if (r) return r.label;
  }
  const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[unitId] : null;
  return (d && d.name) || unitId;
}

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

/*  Ekranda kademeler DEĞİL aileler listelenir. 18 birlik olsa da
    bonus 3 role aittir → 3 aile × 4 istatistik = 12 satır.      */
function aileler() {
  if (typeof UNIT_ROLES !== "undefined") return UNIT_ROLES.map(r => r.unit);
  return birlikler().filter(id => (UNIT_TYPES[id].kademe || 1) === 1);
}

function birlikler() {
  return (typeof UNIT_TYPES !== "undefined") ? Object.keys(UNIT_TYPES) : [];
}

/*  ─────────────────────────────────────────────
    4) KATMAN 1 — TABAN
    ───────────────────────────────────────────── */

/* Birliğin kademesi (Sv kaçıncı). Kademe tanımından gelir. */
function seviye(unitId) {
  const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[unitId] : null;
  return (d && (d.kademe || d.level)) || 1;
}

/* Bir birliğin ailesi. Bonuslar kademeye değil AİLEYE işler:
   Sv1 şövalye de Sv6 şövalye de aynı "Savunucu" bonusunu alır. */
function aile(unitId) {
  if (typeof birlikAilesi === "function") return birlikAilesi(unitId);
  const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[unitId] : null;
  return (d && d.aile) || unitId;
}

/* Kademesine göre ham değerler — doğrudan troops.js'ten. */
function taban(unitId) {
  const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[unitId] : null;
  const out = bosStat();
  if (!d) return out;
  out.saldiri = d.attack  || 0;
  out.savunma = d.defense || 0;
  out.can     = d.hp      || 0;
  out.olum    = d.olum    || 0;
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
     Anahtar AİLEDİR (knight/soldier/robot), kademe değil —
     bir araştırma o ailenin bütün kademelerine işler.
     Sayı o dalın SEVİYESİdir, yüzde değil.
     Yüzde = seviye × ARASTIRMA_ADIM.
     (2. adımda araştırma binası bu alanı yazacak.)            */
  {
    id: "arastirma", ad: "Araştırma", ikon: "🔬",
    hesapla(unitId) {
      const out = bosStat();
      const st = S();
      const dal = st && st.arastirma && st.arastirma[aile(unitId)];
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
/* düz liste — kart/kutucuk yok, kaydırma çubuğu gizli */
.ist-list{
  display:flex; flex-direction:column;
  overflow-y:auto; padding:2px 4px 14px;
  scrollbar-width:none; -ms-overflow-style:none;
}
.ist-list::-webkit-scrollbar{ width:0; height:0; display:none; }

.ist-satir{
  display:flex; align-items:center; gap:8px;
  padding:3px 4px;
  border-bottom:1px solid rgba(160,215,255,.14);
  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:18px;
  color:#ffffff; text-shadow:none;
}
/* sembol yuvası — her grubun İLK satırında dolu, diğerlerinde boş.
   Boşken de yer kapladığı için yazılar hizada kalır. */
.ist-sembol{ flex:0 0 26px; text-align:center; font-size:17px; }

.ist-etiket{ flex:1 1 auto; min-width:0; }

/* sağdaki rakam — sağ kenardan içeri alındı, sabit genişlikte
   hizalı duruyor. Daha sola almak için margin-right'ı büyüt. */
.ist-deger{ flex:0 0 auto; min-width:52px; text-align:right; margin-right:26px; }
`;
  document.head.appendChild(el);
}

/*  Bir rolün dört satırı:  "Savunucu Saldırı ........ +%0"
    BU EKRAN OYUNCUNUN EKRANIDIR — birliğin ham değerini değil,
    hesapta BİRİKMİŞ BONUS YÜZDESİNİ gösterir. Ham taban değerler
    birliğe aittir (seviye atlayınca değişir), yüzde ise oyuncunun
    kalıcı ilerlemesidir. İki oyuncuyu karşılaştıran şey budur.
    Ham değerler yine hesaplanır (birim/ordu) ama burada yazmaz.  */
function grupHTML(unitId) {
  const rol = rolAdi(unitId);
  const h = havuz(unitId);

  const sembol = rolSembol(unitId);

  const satirlar = STATLAR.map((s, i) => `
      <div class="ist-satir">
        <span class="ist-sembol">${i === 0 ? sembol : ""}</span>
        <span class="ist-etiket">${rol} ${s.ad}</span>
        <span class="ist-deger">+%${sayi(h[s.key])}</span>
      </div>`).join("");

  return satirlar;
}

/* Tam sayıysa tam yazar, değilse tek ondalık (5,4 gibi). */
function sayi(v) {
  const n = Math.round((Number(v) || 0) * 10) / 10;
  return (n % 1 === 0) ? String(n) : String(n).replace(".", ",");
}

function ciz() {
  const liste = document.getElementById("istList");
  if (!liste || typeof UNIT_TYPES === "undefined") return;
  liste.innerHTML = aileler().map(grupHTML).join("");
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
  btn.innerHTML = 'İstatistik';
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
