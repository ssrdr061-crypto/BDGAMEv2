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

  /* Parça kutucuğunun rengi türe göre değişir; BAR her zaman SARI. */
  const RENK = {
    mor: { ana: "#a855f7", koyu: "#6b21a8", ad: "Mor Parça",
           arka: "gorsel23.webp" },
    ssr: { ana: "#f97316", koyu: "#9a3412", ad: "Turuncu Parça",
           arka: "gorsel22.webp" }
  };

  /* Parça görselleri — kahramana göre. Dosya adları KÜÇÜK HARF,
     Türkçe karakter yok (aksi halde sunucuda sessizce bulunamaz). */
  const PARCA_GORSEL = {
    mor:      "morparca.webp",
    ivanovna: "ivanovnaparca.webp",
    revolia:  "revoliaparca.webp"
  };
  function parcaGorseli(id) { return PARCA_GORSEL[parcaAnahtari(id)] || ""; }

  /* Oyunun mavi teması (tema.js :root) — TEK YER burasıdır. */
  const TEMA = {
    ust:    "#3d7ccc",
    orta:   "#22488f",
    alt:    "#152e5e",
    kenar:  "rgba(160,215,255,.60)",
    yazi:   "#eaf4ff",
    solgun: "#a8c7e0",
    sari:   "#ffd257",
    sariKoyu: "#f0932b",
    golge:  "0 1px 2px rgba(0,20,45,.55)"
  };
  const YAZI = "'Baloo 2','Nunito',sans-serif";

  /* ── YAYIN KİLİDİ ────────────────────────────────────────────
     Sistem canlıdaki oyunculara KAPALI. Açılması için ya adres
     çubuğunda ?gelistir=1 olmalı ya da hesap adı bu listede.
     Yayına alırken: acikMi() içini `return true;` yap. */
  /* AÇIK — sistem herkese görünür.
     Tekrar kapatmak istersen: `return true;` satırını silip
     alttaki iki satırı yorumdan çıkar. */
  const IZINLI = ["moonlight"];
  function acikMi() {
    return true;
    /* if (/[?&]gelistir=1/.test(location.search)) return true;
       return IZINLI.indexOf(String((typeof currentUsername !== "undefined"
                ? currentUsername : "") || "").toLowerCase()) !== -1; */
  }
  window.GELISTIR_ACIK = acikMi;

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

  /* Çantadaki parça paketini havuza aktarır (index.html "Kullan").
     Elde kaç tane varsa HEPSİ birden kullanılır — kaynak paketi gibi. */
  function parcaPaketiKullan(ad) {
    const s = S(); if (!s) return;
    const def = (typeof getItemDef === "function") ? getItemDef(ad) : null;
    if (!def || !def.isParca) return;
    const adet = Math.floor((s.inventory && s.inventory[ad]) || 0);
    if (adet <= 0) { toast("Çantanda bu parçadan yok."); return; }
    delete s.inventory[ad];
    parcaEkleAnahtar(def.parcaKey, adet);
    if (typeof renderInventory === "function") renderInventory();
    toast(`${adet} ${def.name} kullanıldı.`);
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

  function kutucuklar(gizle) {
    /* Yetenek kutucukları ve üstteki yıldız şeridi panelle birlikte
       gösterilmez — bilgileri artık panelde duruyor. */
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

  /* Paneli çiz. Zaten açıksa içeriği tazeler (kahramanlar arası geçiş). */
  function ac(id) {
    if (!acikMi()) return;
    const eski = document.getElementById(PANEL_ID);
    if (eski) eski.remove();
    if (typeof HERO_STATS === "undefined" || !HERO_STATS[id]) {
      toast("Kahraman verisi bulunamadı.");
      return;
    }
    const ov = document.getElementById("heroDetailOverlay");
    if (!ov) { toast("Kahraman ekranı açık değil."); return; }

    kutucuklar(true);

    const p = document.createElement("div");
    p.id = PANEL_ID;
    /* Arka plan YOK — kahraman görseli hiç örtülmez.
       Panel yalnız düğmeleri taşır, görselin altına oturur. */
    const sahipli = sahip(id);
    p.style.cssText =
      "position:absolute;left:12px;right:12px;z-index:8;" +
      "bottom:" + (sahipli ? "3%" : "calc(4% + 58px)") + ";" +
      "box-sizing:border-box;color:#eaf6ff;background:none;border:none;" +
      "display:flex;flex-direction:column;";

    ov.appendChild(p);

    ciz(p, id);
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

    let yildiz = "";
    for (let i = 0; i < MAX_SV; i++) {
      yildiz += `<span style="color:${i < sv ? "#ffd257" : "rgba(255,255,255,.30)"};
                   font-size:19px;filter:drop-shadow(0 1px 3px rgba(0,20,45,.8));">★</span>`;
    }

    const alt = sonSeviye
      ? `<div style="text-align:center;padding:10px;border-radius:11px;
              background:linear-gradient(180deg,${TEMA.ust},${TEMA.alt});
              color:${TEMA.yazi};font-weight:800;font-size:13.5px;
              font-family:${YAZI};text-shadow:${TEMA.golge};">En yüksek seviye</div>`
      : `<div style="display:flex;align-items:center;gap:9px;">
           <button id="glsArti" style="flex:0 0 auto;width:38px;height:38px;padding:0;
                   border:none;border-radius:11px;font-family:${YAZI};font-size:21px;
                   font-weight:800;line-height:1;text-align:center;color:${TEMA.yazi};
                   display:flex;align-items:center;justify-content:center;
                   background:linear-gradient(180deg,${TEMA.ust},${TEMA.orta});
                   box-shadow:0 2px 6px rgba(0,20,45,.3);">+</button>
           <button id="glsYukselt" style="flex:1;min-width:0;padding:11px;border:none;
                   border-radius:12px;font-weight:800;font-size:15px;font-family:${YAZI};
                   text-shadow:${TEMA.golge};
                   background:${yeter
                     ? `linear-gradient(180deg,${TEMA.sari},${TEMA.sariKoyu})`
                     : `linear-gradient(180deg,${TEMA.ust},${TEMA.alt})`};
                   color:${yeter ? "#20140a" : TEMA.solgun};
                   box-shadow:0 2px 6px rgba(0,20,45,.3);">
             Sv${sv + 1}'e Yükselt
           </button>
         </div>`;

    /* Üst satır: YALNIZ yıldızlar, ortada. Ad/parça/seviye ibaresi
       kaldırıldı — ekranın tepesinde kahraman adı zaten yazıyor. */
    p.innerHTML = `
      <div style="display:flex;justify-content:center;align-items:center;
                  padding-bottom:8px;letter-spacing:2px;">${yildiz}</div>
      ${alt}
    `;

    const btn = p.querySelector("#glsYukselt");
    if (btn) btn.onclick = e => {
      e.stopPropagation();
      if (yukselt(id)) { ciz(p, id); yenile(); }
    };

    const arti = p.querySelector("#glsArti");
    if (arti) arti.onclick = e => { e.stopPropagation(); parcaPenceresi(id, p); };
  }

  /* ── PARÇA KULLANMA PENCERESİ — "+" düğmesi açar ────────────
     Düzen mağazanın satın alma penceresiyle aynı (ikon + ad,
     − sürgü + sayı MAX, tek düğme) ama boyaması DÜZ: kalın
     çerçeve, kabartı, parlaklık yok. Arka plan KARARMAZ.
     Çantada o parçadan yoksa pencere hiç açılmaz (uyarı çıkar). */
  const PK_ID = "glsParcaKat";

  /* Parça anahtarına karşılık gelen ÇANTA eşyasının adı.
     Tek yer burası — magaza.js'teki isParca ürünleriyle eşleşir. */
  const PAKET_ADI = {
    mor:      "Mor Kahraman Parçası",
    ivanovna: "İVANOVNA Parçası",
    revolia:  "REVOLİA Parçası"
  };

  function cantadaki(ad) {
    const s = S();
    try { return Math.floor((s && s.inventory && s.inventory[ad]) || 0); }
    catch (e) { return 0; }
  }

  /* Pencerenin biçimi — bir kez enjekte edilir. Düz. */
  function stilKur() {
    if (document.getElementById("glsKullanStil")) return;
    const st = document.createElement("style");
    st.id = "glsKullanStil";
    st.textContent = `
.glsk-kat{ position:fixed; inset:0; z-index:9100; display:flex;
  align-items:center; justify-content:center; padding:18px;
  background:transparent; }
.glsk-kutu{ width:min(330px,90vw); box-sizing:border-box; padding:15px;
  border:none; border-radius:16px; color:${TEMA.yazi};
  font-family:${YAZI}; font-weight:700;
  background:linear-gradient(180deg,${TEMA.ust} 0%,${TEMA.orta} 55%,${TEMA.alt} 100%);
  box-shadow:0 2px 6px rgba(0,20,45,.3); }
.glsk-ust{ display:flex; align-items:center; gap:11px; margin-bottom:14px; }
.glsk-ikon{ flex:0 0 52px; width:52px; height:52px; border-radius:12px;
  position:relative; overflow:hidden; border:none; }
.glsk-ikon img{ position:absolute; inset:0; width:100%; height:100%; }
.glsk-sayac{ flex:1; min-width:0; text-align:right; font-size:17px;
  font-weight:800; color:${TEMA.sari}; text-shadow:${TEMA.golge};
  font-variant-numeric:tabular-nums; }
.glsk-satir{ display:flex; align-items:center; gap:7px; }
.glsk-dg{ flex:0 0 auto; height:34px; min-width:34px; padding:0 9px;
  border:none; border-radius:10px; font-family:${YAZI};
  font-weight:800; font-size:15px; line-height:34px; color:${TEMA.yazi};
  background:rgba(255,255,255,.10); box-shadow:none;
  transition:transform .09s ease, filter .09s ease; }
.glsk-max{ font-size:12px; color:${TEMA.sari}; }
.glsk-sayi{ flex:0 0 auto; min-width:38px; height:34px; line-height:34px;
  text-align:center; border-radius:10px; font-size:14px; font-weight:800;
  background:rgba(11,28,58,.55); }
.glsk-surgu{ flex:1; min-width:0; height:34px; margin:0; padding:0;
  -webkit-appearance:none; appearance:none; background:transparent; }
.glsk-surgu::-webkit-slider-runnable-track{ height:6px; border-radius:3px;
  background:linear-gradient(90deg,${TEMA.sari} 0 var(--dolu,0%),
    rgba(11,28,58,.55) var(--dolu,0%) 100%); }
.glsk-surgu::-moz-range-track{ height:6px; border-radius:3px;
  background:linear-gradient(90deg,${TEMA.sari} 0 var(--dolu,0%),
    rgba(11,28,58,.55) var(--dolu,0%) 100%); }
.glsk-surgu::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none;
  width:18px; height:18px; margin-top:-6px; border:none; border-radius:50%;
  background:#eaf4ff; box-shadow:0 2px 6px rgba(0,20,45,.3); }
.glsk-surgu::-moz-range-thumb{ width:18px; height:18px; border:none;
  border-radius:50%; background:#eaf4ff; box-shadow:0 2px 6px rgba(0,20,45,.3); }
.glsk-git{ width:100%; margin-top:13px; padding:11px; border:none;
  border-radius:12px; font-family:${YAZI}; font-weight:800; font-size:15px;
  color:#20140a; text-shadow:none;
  background:linear-gradient(180deg,${TEMA.sari},${TEMA.sariKoyu});
  box-shadow:0 2px 6px rgba(0,20,45,.3);
  transition:transform .09s ease, filter .09s ease; }
.glsk-dg:active,.glsk-git:active{ transform:scale(.96); filter:brightness(.93); }
`;
    document.head.appendChild(st);
  }

  function parcaPenceresi(id, panel) {
    const anahtar = parcaAnahtari(id);
    const paket   = PAKET_ADI[anahtar] || "";
    const enFazla = cantadaki(paket);

    /* Çantada paket yoksa pencere açılmaz, doğrudan mağaza açılır. */
    if (enFazla <= 0) { magazaAc(); return; }

    const bedel  = maliyet(id);
    const eldeki = parcaSayisi(id);

    stilKur();
    const eski = document.getElementById(PK_ID);
    if (eski) eski.remove();

    let adet = 1;

    const kat = document.createElement("div");
    kat.id = PK_ID;
    kat.className = "glsk-kat";
    kat.innerHTML =
      '<div class="glsk-kutu">' +
        '<div class="glsk-ust">' +
          '<div class="glsk-ikon">' +
            '<img src="' + RENK[nadirlik(id)].arka + '" alt="" style="object-fit:cover" ' +
                 'onerror="this.style.display=\'none\'">' +
            '<img src="' + parcaGorseli(id) + '" alt="" style="object-fit:contain" ' +
                 'onerror="this.style.display=\'none\'">' +
          '</div>' +
          '<div class="glsk-sayac">' + Math.min(eldeki, bedel) + ' / ' + bedel + '</div>' +
        '</div>' +
        '<div class="glsk-satir">' +
          '<button class="glsk-dg" type="button" data-d="-1">−</button>' +
          '<input class="glsk-surgu" type="range" min="1" max="' + enFazla + '" value="1">' +
          '<button class="glsk-dg" type="button" data-d="1">+</button>' +
          '<div class="glsk-sayi">1</div>' +
          '<button class="glsk-dg glsk-max" type="button">MAX</button>' +
        '</div>' +
        '<button class="glsk-git" type="button">KULLAN</button>' +
      '</div>';
    document.body.appendChild(kat);

    const surgu = kat.querySelector(".glsk-surgu");
    const sayi  = kat.querySelector(".glsk-sayi");
    const git   = kat.querySelector(".glsk-git");

    function esitle() {
      adet = Math.min(enFazla, Math.max(1, adet));
      surgu.value = adet;
      sayi.textContent = adet;
      const oran = enFazla > 1 ? ((adet - 1) / (enFazla - 1)) * 100 : 100;
      surgu.style.setProperty("--dolu", oran + "%");
    }

    surgu.addEventListener("input", () => {
      adet = parseInt(surgu.value, 10) || 1; esitle();
    });
    Array.prototype.forEach.call(kat.querySelectorAll(".glsk-dg[data-d]"), b => {
      b.onclick = e => { e.stopPropagation(); adet += parseInt(b.dataset.d, 10); esitle(); };
    });
    kat.querySelector(".glsk-max").onclick = e => {
      e.stopPropagation(); adet = enFazla; esitle();
    };

    git.onclick = e => {
      e.stopPropagation();
      kullan(paket, anahtar, adet);
      kat.remove();
      if (panel) ciz(panel, id);
      yenile();
    };

    /* Dışarı dokunma kapatır — dinleyici GECİKMELİ bağlanır, yoksa
       "+" düğmesinin kendi dokunuşu pencereyi anında kapatır (Tuzak 35). */
    setTimeout(() => {
      kat.addEventListener("pointerup", ev => { if (ev.target === kat) kat.remove(); });
    }, 0);

    esitle();
  }

  /* Kahraman ekranını kapatıp mağazayı açar. */
  function magazaAc() {
    const hd = document.getElementById("heroDetailOverlay");
    if (hd) hd.style.display = "none";
    if (typeof openOverlayPanel === "function") openOverlayPanel("shop");
  }

  /* Seçilen adet kadar paketi çantadan düşer, havuza ekler. */
  function kullan(paket, anahtar, adet) {
    const s = S(); if (!s) return;
    const varOlan = cantadaki(paket);
    adet = Math.max(1, Math.min(Math.floor(adet), varOlan));
    if (adet <= 0) return;

    if (!s.inventory || typeof s.inventory !== "object") s.inventory = {};
    s.inventory[paket] = varOlan - adet;
    if (s.inventory[paket] <= 0) delete s.inventory[paket];

    parcaEkleAnahtar(anahtar, adet);        /* kaydet() içeride çağrılır */
    try { if (typeof renderInventory === "function") renderInventory(); } catch (e) {}
    toast(adet + " " + paket + " kullanıldı.");
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
  window.parcaEkle         = parcaEkleAnahtar;
  window.parcaPaketiKullan = parcaPaketiKullan; /* günlük giriş / mağaza / canavar */
  window.glsYildizTazele   = glsYildizTazele;
  window.GELISTIR_MAX_SV   = MAX_SV;
})();
