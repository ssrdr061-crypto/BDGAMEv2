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

  /* ── GÖMÜLÜ PANEL ───────────────────────────────────────────
     Ayrı pencere YOK. Panel kahraman detay ekranının İÇİNE girer;
     açıkken yetenek kutucukları gizlenir, yerini bu panel alır.
     "Geliştir" düğmesi aç/kapa görevi görür. */

  const PANEL_ID = "glsPanel";
  let aktifSekme = "yetenek";      /* "stat" | "yetenek" | "taki" */

  function kutucuklar(gizle) {
    ["hdBoxes", "hdAbilityPanel", "hdStars"].forEach(x => {
      const e = document.getElementById(x);
      if (e) e.style.display = gizle ? "none" : "";
    });
  }

  function kapat() {
    const p = document.getElementById(PANEL_ID);
    if (p) p.remove();
    kutucuklar(false);
    if (typeof window.glsBtnTazele === "function") window.glsBtnTazele();
  }

  /* Aç/kapa — açıksa kapatır */
  function ac(id) {
    if (document.getElementById(PANEL_ID)) { kapat(); return; }
    if (typeof HERO_STATS === "undefined" || !HERO_STATS[id]) {
      toast("Kahraman verisi bulunamadı.");
      return;
    }
    const ov = document.getElementById("heroDetailOverlay");
    if (!ov) { toast("Kahraman ekranı açık değil."); return; }

    aktifSekme = "yetenek";
    kutucuklar(true);

    const p = document.createElement("div");
    p.id = PANEL_ID;
    /* Alttaki Geliştir düğmesinin ÜSTÜNDE durur */
    p.style.cssText =
      "position:absolute;left:10px;right:10px;bottom:calc(4% + 58px);z-index:8;" +
      "box-sizing:border-box;color:#eaf6ff;" +
      "background:linear-gradient(180deg,rgba(18,58,92,.94),rgba(11,32,53,.96));" +
      "border:1px solid rgba(190,240,255,.20);border-radius:14px;" +
      "padding:11px 12px 12px;display:flex;flex-direction:column;" +
      "max-height:56%;box-shadow:0 2px 6px rgba(0,20,45,.3);";
    ov.appendChild(p);

    ciz(p, id);
  }

  /* ── SEKME İÇERİKLERİ ───────────────────────────────────────── */

  function satirHTML(ad, simdi, sonra, yuzde) {
    const im = yuzde ? "%" : "";
    const sag = (sonra != null)
      ? `<span style="color:#9fb6c9;">${im}${simdi}</span>
         <span style="color:#9fb6c9;margin:0 5px;">→</span>
         <span style="color:#ffd700;font-weight:800;">${im}${sonra}</span>`
      : `<span style="color:#9fb6c9;">${im}${simdi}</span>`;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;
                  gap:8px;padding:7px 0;border-bottom:1px solid rgba(190,240,255,.10);">
        <div style="font-size:12.5px;color:#cfe6f7;">${ad}</div>
        <div style="font-size:12.5px;white-space:nowrap;">${sag}</div>
      </div>`;
  }

  function sekmeYetenek(id) {
    const k = yetenekKiyas(id);
    if (!k.length) return `<div style="padding:16px 0;text-align:center;color:#9fb6c9;font-size:13px;">Yetenek yok.</div>`;
    let out = "";
    k.forEach(x => { if (x.simdi != null) out += satirHTML(x.ad + (x.ek || ""), x.simdi, x.sonra, true); });
    return out;
  }

  function sekmeStat(id) {
    /* Kahraman statı şu an OYUNCUYA ait (state.hero), kahramana özel değil.
       "Seviye kadar +stat" sistemi bağlanınca artış sütunu kendiliğinden dolar. */
    const s = S() || {};
    const h = s.hero || {};
    let out = "";
    out += satirHTML("Kahraman Saldırı", Math.round(h.attack  || 0), null, false);
    out += satirHTML("Kahraman Savunma", Math.round(h.defense || 0), null, false);
    out += satirHTML("Kahraman Can",     Math.round(h.maxHp   || 0), null, false);
    out += `<div style="padding:10px 2px 0;font-size:11.5px;color:#7f96a8;line-height:1.5;">
              Seviyeye bağlı stat artışı henüz bağlanmadı.
            </div>`;
    return out;
  }

  function sekmeTaki() {
    return `<div style="padding:22px 0;text-align:center;color:#7f96a8;font-size:13px;">
              Takı sistemi yakında.
            </div>`;
  }

  /* İçerik YERİNDE tazelenir → kaydırma korunur */
  function ciz(p, id) {
    const h = HERO_STATS[id];
    const n = nadirlik(id);
    const r = RENK[n];
    const sv = seviye(id);
    const sonSeviye = sv >= MAX_SV;
    const bedel = maliyet(id);
    const eldeki = parcaSayisi(id);
    const yeter = !sonSeviye && eldeki >= bedel;
    const oran = (sonSeviye || !bedel) ? 100 : Math.min(100, Math.round(eldeki / bedel * 100));

    let yildiz = "";
    for (let i = 0; i < MAX_SV; i++) {
      yildiz += `<span style="color:${i < sv ? "#ffd700" : "rgba(255,255,255,.22)"};font-size:16px;">★</span>`;
    }

    const sekmeler = [
      { k: "stat",    ad: "İstatistik" },
      { k: "yetenek", ad: "Yetenekler" },
      { k: "taki",    ad: "Takılar"    }
    ];
    let sekmeBar = "";
    sekmeler.forEach(x => {
      const se = aktifSekme === x.k;
      sekmeBar += `
        <button class="glsSekme" data-k="${x.k}" style="flex:1;padding:8px 4px;border:none;
                font-family:inherit;font-size:12px;font-weight:800;
                background:${se ? "rgba(45,201,252,.16)" : "transparent"};
                color:${se ? "#7fd8ff" : "#8ba3b5"};
                border-bottom:2px solid ${se ? "#2DC9FC" : "transparent"};">
          ${x.ad}
        </button>`;
    });

    const icerik = aktifSekme === "stat" ? sekmeStat(id)
                 : aktifSekme === "taki" ? sekmeTaki()
                 : sekmeYetenek(id);

    /* Parça kutucuğu — görsel gelene kadar renkli kare */
    const parcaKare =
      `<div style="width:30px;height:30px;border-radius:8px;flex:0 0 auto;
                   background:linear-gradient(180deg,${r.ana},${r.koyu});
                   display:flex;align-items:center;justify-content:center;
                   font-size:15px;">◆</div>`;

    const alt = sonSeviye
      ? `<div style="text-align:center;padding:9px;border-radius:10px;
              background:rgba(255,255,255,.06);color:#9fb6c9;font-weight:800;
              font-size:13px;">En yüksek seviye</div>`
      : `<div style="display:flex;align-items:center;gap:9px;">
           ${parcaKare}
           <div style="flex:1;min-width:0;height:20px;border-radius:10px;
                       background:rgba(0,20,45,.45);position:relative;overflow:hidden;">
             <div style="position:absolute;inset:0 auto 0 0;width:${oran}%;
                         background:linear-gradient(90deg,${r.koyu},${r.ana});"></div>
             <div style="position:absolute;inset:0;display:flex;align-items:center;
                         justify-content:center;font-size:11.5px;font-weight:800;
                         color:#fff;text-shadow:0 1px 2px rgba(0,20,45,.55);">
               ${eldeki} / ${bedel}
             </div>
           </div>
           <button id="glsYukselt" style="flex:0 0 auto;padding:8px 14px;border:none;
                   border-radius:10px;font-weight:800;font-size:13px;font-family:inherit;
                   background:${yeter ? "linear-gradient(180deg,#3fbf6a,#248c48)" : "rgba(255,255,255,.08)"};
                   color:${yeter ? "#fff" : "#8ba3b5"};">
             Sv${sv + 1}
           </button>
         </div>`;

    p.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex:0 0 auto;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:14.5px;font-weight:800;">${h.name}</div>
          <div style="font-size:11px;color:#9fb6c9;">${r.ad} · Seviye ${sv}</div>
        </div>
        <div style="letter-spacing:1px;">${yildiz}</div>
      </div>

      <div style="display:flex;margin-top:9px;flex:0 0 auto;
                  border-bottom:1px solid rgba(190,240,255,.12);">${sekmeBar}</div>

      <div id="glsIcerik" style="flex:1 1 auto;overflow-y:auto;
                                 -webkit-overflow-scrolling:touch;padding:2px 2px 8px;">
        ${icerik}
      </div>

      <div style="flex:0 0 auto;padding-top:9px;">${alt}</div>
    `;

    Array.prototype.forEach.call(p.querySelectorAll(".glsSekme"), b => {
      b.onclick = e => { e.stopPropagation(); aktifSekme = b.dataset.k; ciz(p, id); };
    });

    const btn = p.querySelector("#glsYukselt");
    if (btn) btn.onclick = e => {
      e.stopPropagation();
      if (yukselt(id)) { ciz(p, id); yenile(); }
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
      if (typeof glsYildizTazele === "function") glsYildizTazele();
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
