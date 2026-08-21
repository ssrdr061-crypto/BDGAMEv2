/* ═══════════════════════════════════════════════════════════════
   gelistir.js — KAHRAMAN GELİŞTİRME

   TEK KAVRAM: SEVİYE. Yıldızlar seviyenin göstergesidir, ayrı bir
   sayı değildir. Sv3 kahramanın kartında 3 yıldız dolu görünür.
   Tek doğruluk kaynağı: state.heroLevels[id]

   PARÇA
     mor      → HALVORSEN · STELLİN · MİKİAN için ORTAK havuz
                state.heroShards.mor
     turuncu  → İVANOVNA · REVOLİA için ŞAHSA ÖZEL
                state.heroShards.ivanovna / .revolia

   Bu dosya kahramanlar.js ve heroes.js'ten SONRA yüklenmeli.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── AYARLAR — değiştirilecek tek yer ───────────────────────── */

  const MAX_SV = 5;

  /* Sv1→2, Sv2→3, Sv3→4, Sv4→5 (mor kahraman için parça) */
  const MALIYET = [20, 40, 80, 160];

  /* Turuncu (SSR) kahramanlar bu kat kadar pahalıdır */
  const SSR_KAT = 2;

  /* Kahraman nadirliği — TEK YER burasıdır.
     Yeni kahraman eklendiğinde id'si buraya yazılır. */
  const NADIRLIK = {
    buz_savascisi: "mor",   /* HALVORSEN */
    celik_savasci: "mor",   /* STELLİN   */
    ates_buyucusu: "mor",   /* MİKİAN    */
    ivanovna:      "ssr",   /* İVANOVNA  */
    revolia:       "ssr"    /* REVOLİA   */
  };

  const RENK = {
    mor: { ana: "#a855f7", koyu: "#6b21a8", ad: "Mor Parça" },
    ssr: { ana: "#f97316", koyu: "#9a3412", ad: "Turuncu Parça" }
  };

  /* ── STATE erişimi ──────────────────────────────────────────
     index.html'de `const state` var → window.state undefined.
     Erişim her zaman bu kapıdan. */
  function S() {
    try { return (typeof state !== "undefined") ? state : null; }
    catch (e) { return null; }
  }

  function nadirlik(id) { return NADIRLIK[id] || "mor"; }

  /* Parçanın saklandığı anahtar: mor ortak, turuncu kahramana özel */
  function parcaAnahtari(id) {
    return nadirlik(id) === "ssr" ? id : "mor";
  }

  function havuz() {
    const s = S(); if (!s) return {};
    if (!s.heroShards || typeof s.heroShards !== "object") s.heroShards = {};
    return s.heroShards;
  }

  function parcaSayisi(id) {
    const h = havuz();
    return Math.max(0, Math.floor(h[parcaAnahtari(id)] || 0));
  }

  function parcaEkle(id, adet) {
    const h = havuz();
    const k = parcaAnahtari(id);
    h[k] = Math.max(0, Math.floor((h[k] || 0) + adet));
    kaydet();
    return h[k];
  }

  /* Doğrudan anahtarla ekleme — günlük giriş / mağaza / canavar için */
  function parcaEkleAnahtar(anahtar, adet) {
    const h = havuz();
    h[anahtar] = Math.max(0, Math.floor((h[anahtar] || 0) + adet));
    kaydet();
    return h[anahtar];
  }

  function seviye(id) {
    const s = S(); if (!s) return 1;
    if (!s.heroLevels || typeof s.heroLevels !== "object") s.heroLevels = {};
    const v = Math.floor(s.heroLevels[id] || 1);
    return Math.max(1, Math.min(MAX_SV, v));
  }

  function sahip(id) {
    const s = S(); if (!s) return false;
    return Array.isArray(s.ownedHeroSkins) && s.ownedHeroSkins.indexOf(id) !== -1;
  }

  /* Bir sonraki seviyenin parça bedeli. Sv5'te 0 döner. */
  function maliyet(id) {
    const sv = seviye(id);
    if (sv >= MAX_SV) return 0;
    const taban = MALIYET[sv - 1] || 0;
    return nadirlik(id) === "ssr" ? taban * SSR_KAT : taban;
  }

  function kaydet() {
    if (typeof persistCurrentState === "function") persistCurrentState();
  }

  function toast(m) {
    if (typeof showToast === "function") showToast(m);
  }

  /* ── SEVİYE ATLATMA ─────────────────────────────────────────── */
  function yukselt(id) {
    const s = S(); if (!s) return false;
    if (!sahip(id)) { toast("Bu kahraman senin değil."); return false; }

    const sv = seviye(id);
    if (sv >= MAX_SV) { toast("Bu kahraman zaten en yüksek seviyede."); return false; }

    const bedel = maliyet(id);
    const eldeki = parcaSayisi(id);
    if (eldeki < bedel) {
      toast(`Yeterli parçan yok. ${bedel} gerekiyor, elinde ${eldeki} var.`);
      return false;
    }

    parcaEkle(id, -bedel);
    if (!s.heroLevels) s.heroLevels = {};
    s.heroLevels[id] = sv + 1;
    kaydet();

    const h = (typeof HERO_STATS !== "undefined") ? HERO_STATS[id] : null;
    toast(`${(h && h.name) || "Kahraman"} Sv${sv + 1} oldu!`);
    return true;
  }

  /* ── YETENEK DEĞERLERİ — şu an / sonraki ────────────────────── */
  /* Sonuç: [{ ad, simdi, sonra }] · sonra null ise değişmiyor. */
  function yetenekKiyas(id) {
    if (typeof HERO_STATS === "undefined") return [];
    const h = HERO_STATS[id];
    if (!h || !Array.isArray(h.abilities)) return [];

    const sv = seviye(id);
    const i0 = sv - 1, i1 = sv;              /* dizi sıfırdan başlar */
    const sonSeviye = sv >= MAX_SV;

    return h.abilities.map(a => {
      if (!a) return null;
      const liste = a.valuesByLevel;
      let simdi = null, sonra = null, ek = "";

      if (Array.isArray(liste)) {
        simdi = liste[i0];
        sonra = sonSeviye ? null : liste[i1];
      } else if (typeof a.chance === "number") {
        simdi = a.chance;
        ek = " ihtimal";
      }
      if (simdi == null) return { ad: a.title || "", simdi: null, sonra: null, ek: "" };

      /* Değer düşerse de doğrudur (Derin İstihbarat 15→10) —
         "iyileşme" yorumunu yapmıyoruz, sadece sayıyı gösteriyoruz. */
      if (sonra === simdi) sonra = null;
      return { ad: a.title || "", simdi: simdi, sonra: sonra, ek: ek };
    }).filter(Boolean);
  }

  /* ── PENCERE ────────────────────────────────────────────────── */
  const KAT_ID = "glsKat";

  function kapat() {
    const k = document.getElementById(KAT_ID);
    if (k) k.remove();
  }

  function ac(id) {
    if (typeof HERO_STATS === "undefined" || !HERO_STATS[id]) {
      toast("Kahraman verisi bulunamadı.");
      return;
    }
    kapat();

    const kat = document.createElement("div");
    kat.id = KAT_ID;
    kat.style.cssText =
      "position:fixed;inset:0;z-index:460;display:flex;" +
      "align-items:center;justify-content:center;padding:16px;";
    /* Arka plan KARARMAZ — katman yalnız dışarı dokunmayı yakalar */
    kat.addEventListener("pointerup", e => { if (e.target === kat) kapat(); });

    const kutu = document.createElement("div");
    kutu.id = "glsKutu";
    kutu.style.cssText =
      "width:100%;max-width:330px;box-sizing:border-box;" +
      "background:linear-gradient(180deg,#123a5c,#0b2035);" +
      "border:1px solid rgba(190,240,255,.20);border-radius:16px;" +
      "padding:16px;color:#eaf6ff;" +
      "box-shadow:0 2px 6px rgba(0,20,45,.3);";
    kat.appendChild(kutu);
    document.body.appendChild(kat);

    ciz(kutu, id);
  }

  /* İçerik YERİNDE tazelenir → kaydırma konumu korunur */
  function ciz(kutu, id) {
    const h = HERO_STATS[id];
    const n = nadirlik(id);
    const r = RENK[n];
    const sv = seviye(id);
    const sonSeviye = sv >= MAX_SV;
    const bedel = maliyet(id);
    const eldeki = parcaSayisi(id);
    const yeter = eldeki >= bedel;

    /* Yıldız şeridi — seviyeyi gösterir */
    let yildiz = "";
    for (let i = 0; i < MAX_SV; i++) {
      yildiz += `<span style="color:${i < sv ? "#ffd700" : "rgba(255,255,255,.22)"};font-size:19px;">★</span>`;
    }

    /* Yetenek listesi */
    const kiyas = yetenekKiyas(id);
    let yet = "";
    kiyas.forEach(k => {
      if (k.simdi == null) return;
      const sag = (k.sonra != null)
        ? `<span style="color:#9fb6c9;">%${k.simdi}</span>
           <span style="color:#9fb6c9;margin:0 4px;">→</span>
           <span style="color:#ffd700;font-weight:800;">%${k.sonra}</span>`
        : `<span style="color:#9fb6c9;">%${k.simdi}${k.ek}</span>`;
      yet += `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    gap:8px;padding:7px 0;border-top:1px solid rgba(190,240,255,.10);">
          <div style="font-size:12.5px;color:#cfe6f7;">${k.ad}</div>
          <div style="font-size:12.5px;white-space:nowrap;">${sag}</div>
        </div>`;
    });

    /* Parça kutucuğu — görsel gelene kadar renkli kare */
    const parcaKare =
      `<div style="width:38px;height:38px;border-radius:9px;flex:0 0 auto;
                   background:linear-gradient(180deg,${r.ana},${r.koyu});
                   display:flex;align-items:center;justify-content:center;
                   font-size:19px;">◆</div>`;

    let dugme;
    if (sonSeviye) {
      dugme = `<div style="text-align:center;padding:11px;border-radius:11px;
                    background:rgba(255,255,255,.06);color:#9fb6c9;font-weight:800;
                    font-size:14px;">En yüksek seviye</div>`;
    } else {
      dugme = `
        <button id="glsYukselt" style="width:100%;padding:12px;border:none;border-radius:11px;
                font-weight:800;font-size:15px;font-family:inherit;
                background:${yeter ? "linear-gradient(180deg,#3fbf6a,#248c48)" : "rgba(255,255,255,.08)"};
                color:${yeter ? "#fff" : "#8ba3b5"};
                box-shadow:${yeter ? "0 2px 6px rgba(0,20,45,.3)" : "none"};">
          Sv${sv + 1}'e Yükselt
        </button>
        <div style="text-align:center;margin-top:7px;font-size:12px;
                    color:${yeter ? "#9fb6c9" : "#e8735a"};">
          ${bedel} parça gerekli · elinde ${eldeki}
        </div>`;
    }

    kutu.innerHTML = `
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:4px;">
        ${parcaKare}
        <div style="flex:1;min-width:0;">
          <div style="font-size:16px;font-weight:800;">${h.name}</div>
          <div style="font-size:11.5px;color:#9fb6c9;">${r.ad} · Seviye ${sv}</div>
        </div>
      </div>

      <div style="text-align:center;margin:8px 0 4px;letter-spacing:2px;">${yildiz}</div>

      <div style="margin-top:6px;">${yet}</div>

      <div style="margin-top:13px;">${dugme}</div>
    `;

    const btn = kutu.querySelector("#glsYukselt");
    if (btn) btn.onclick = () => {
      if (yukselt(id)) {
        ciz(kutu, id);                 /* yerinde tazele */
        yenile();                      /* kart / detay ekranı */
      }
    };
  }

  /* Açık ekranları tazele — kart listesi ve kahraman detayı */
  function yenile() {
    try {
      const ov = document.getElementById("kahramanListesi");
      if (ov && ov.style.display !== "none" &&
          typeof renderKahramanListesi === "function") renderKahramanListesi();
    } catch (e) {}
    try {
      const hd = document.getElementById("heroDetailOverlay");
      if (hd && hd.style.display !== "none" && typeof glsYildizTazele === "function") {
        glsYildizTazele();
      }
    } catch (e) {}
  }

  /* Detay ekranındaki yıldız şeridini yeniden boyar
     (heroes.js açılışta çizer, seviye değişince buradan güncellenir) */
  function glsYildizTazele() {
    const hd = document.getElementById("heroDetailOverlay");
    if (!hd) return;
    const st = hd.querySelector("#hdStars");
    if (!st) return;
    const id = hd.dataset.hero;
    if (!id) return;
    const sv = seviye(id);
    Array.prototype.forEach.call(st.children, (s, i) => {
      s.style.color = i < sv ? "#ffd700" : "#444";
    });
  }

  /* ── TEST HİLESİ — ?parca=1 ─────────────────────────────────── */
  function hile() {
    try {
      if (location.search.indexOf("parca=1") === -1) return;
      const h = havuz();
      h.mor = (h.mor || 0) + 500;
      h.ivanovna = (h.ivanovna || 0) + 500;
      h.revolia  = (h.revolia  || 0) + 500;
      kaydet();
      toast("Test: 500'er parça eklendi.");
    } catch (e) {}
  }
  window.addEventListener("load", () => setTimeout(hile, 1500));

  /* ── DIŞA AÇILAN KAPILAR ────────────────────────────────────── */
  window.acGelistirme      = ac;             /* heroes.js Geliştir düğmesi  */
  window.kapatGelistirme   = kapat;
  window.kahramanSeviyesi  = seviye;         /* index.html + kahramanlar.js */
  window.kahramanNadirlik  = nadirlik;
  window.kahramanParcasi   = parcaSayisi;
  window.parcaEkle         = parcaEkleAnahtar; /* günlük giriş / mağaza / canavar */
  window.glsYildizTazele   = glsYildizTazele;
  window.GELISTIR_MAX_SV   = MAX_SV;
})();
