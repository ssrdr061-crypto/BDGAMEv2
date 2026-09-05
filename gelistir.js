/* ═══════════════════════════════════════════════════════════════
   gelistir.js — KAHRAMAN GELİŞTİRME

   TEK KAVRAM: SEVİYE. Yıldızlar seviyenin göstergesidir, ayrı bir
   sayı değildir. Sv3 kahramanın kartında 3 yıldız dolu görünür.
   Tek doğruluk kaynağı: state.heroLevels[id]

   PARÇA
     mor      → HALVORSEN · MİKİAN · ROBERT · FRANKLY · YU-NEEB
                için ORTAK havuz — state.heroShards.mor
     turuncu  → STELLİN · İVANOVNA · REVOLİA için ŞAHSA ÖZEL
                state.heroShards.celik_savasci / .ivanovna / .revolia

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
  /* Nadirlik ARTIK BURADA YAZILI DEĞİL — heroes.js KAHRAMAN kapısından
     türer. Üç ayrı dosyada tekrarlanıyordu ve biri unutulunca kahraman
     yanlış parça havuzuna düşüyordu. */
  const NADIRLIK = (typeof KAHRAMAN !== "undefined")
    ? KAHRAMAN.tablo(id => KAHRAMAN.nadirlik(id))
    : {};

  /* Parça kutucuğunun rengi türe göre değişir; BAR her zaman SARI. */
  const RENK = {
    mor: { ana: "#a855f7", koyu: "#6b21a8", ad: "Mor Parça",
           arka: "gorsel23.webp" },
    ssr: { ana: "#f97316", koyu: "#9a3412", ad: "Turuncu Parça",
           arka: "gorsel22.webp" }
  };

  /* Parça görselleri — kahramana göre. Dosya adları KÜÇÜK HARF,
     Türkçe karakter yok (aksi halde sunucuda sessizce bulunamaz). */
  /*  PARÇA GÖRSELLERİ — TEK DOĞRULUK KAYNAĞI.
      Anahtar = parçanın saklandığı anahtar: mor ORTAK, turuncular
      kahramanın KİMLİĞİ (celik_savasci gibi). Dosya adı ile kimlik
      aynı değildir — STELLİN'in kimliği celik_savasci, dosyası
      stellinparca.webp. Bu yüzden bir süre tabloda unutulmuştu.
      Mağaza artık kendi listesini tutmuyor, buradan okuyor.        */
  const PARCA_GORSEL = {
    mor:           "morparca.webp",
    celik_savasci: "stellinparca.webp",
    ivanovna:      "ivanovnaparca.webp",
    revolia:       "revoliaparca.webp"
  };
  function parcaGorseli(id) { return PARCA_GORSEL[parcaAnahtari(id)] || ""; }

  /*  ── PARÇA KUTUCUĞU — ÇERÇEVE + PARÇA, TEK YERDEN ──────────────
      Arkada nadirlik çerçevesi (mor → gorsel23, turuncu → gorsel22),
      üstünde parçanın kendi görseli. Mağaza kartı, geliştirme
      penceresi ve günlük giriş şeridi bu kapıdan geçer; çerçeve
      kuralı ikinci bir yerde tekrarlanmaz.

      anahtar: "mor" | kahraman kimliği | ya da yalnız nadirlik
      ("ssr") — o zaman içerik konmaz, boş çerçeve döner (günlük
      giriş şeridi gibi hangi parçanın geleceği belli olmayan yer).  */
  function parcaNadirligi(anahtar) {
    return (anahtar === "mor") ? "mor" : "ssr";
  }

  function parcaKutusu(anahtar, boy) {
    const r = RENK[parcaNadirligi(anahtar)] || RENK.mor;
    const g = PARCA_GORSEL[anahtar] || "";
    const olcu = (typeof boy === "number") ? (boy + "px") : (boy || "100%");
    return '<span style="display:inline-block;position:relative;flex:0 0 auto;' +
             'width:' + olcu + ';height:' + olcu + ';border-radius:12px;overflow:hidden;' +
             'background:linear-gradient(180deg,' + r.ana + ',' + r.koyu + ');">' +
             '<img src="' + r.arka + '" alt="" style="position:absolute;inset:0;' +
               'width:100%;height:100%;object-fit:cover;" ' +
               'onerror="this.style.display=\'none\'">' +
             (g ? '<img src="' + g + '" alt="" style="position:absolute;inset:0;' +
                    'width:100%;height:100%;object-fit:contain;" ' +
                    'onerror="this.style.display=\'none\'">'
                : '<span style="position:absolute;inset:0;display:flex;' +
                    'align-items:center;justify-content:center;font-size:' +
                    'calc(' + olcu + ' * .55);color:#fff;">\u25C6</span>') +
           '</span>';
  }

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

  /*  ÖDÜL PARÇASI ÇANTAYA — havuza DEĞİL.
      Parça hangi kahramana harcanacağına oyuncu karar verir; ödül
      doğrudan havuza yazılırsa o karar elinden alınır ve oyuncu
      "parçam nereye gitti" diye sorar. Mağazadan alınan parça zaten
      çantaya düşüyordu, ödüller de artık aynı yoldan geçer:
      çanta → "Kullan" → havuz.
      Ürün adı mağazadan `parcaKey` üzerinden bulunur; mağaza yüklü
      değilse havuza yazmaya düşer, ödül hiçbir şekilde kaybolmaz. */
  function parcaUrunAdi(anahtar) {
    try {
      if (typeof shopItems === "undefined" || !Array.isArray(shopItems)) return null;
      const it = shopItems.find(x => x && x.isParca && x.parcaKey === anahtar);
      return it ? it.name : null;
    } catch (e) { return null; }
  }

  function parcaCantayaEkle(anahtar, adet) {
    const s = S(); if (!s || !(adet > 0)) return false;
    const ad = parcaUrunAdi(anahtar);
    if (!ad) { parcaEkleAnahtar(anahtar, adet); return false; }
    if (!s.inventory || typeof s.inventory !== "object") s.inventory = {};
    s.inventory[ad] = Math.floor((s.inventory[ad] || 0) + adet);
    kaydet();
    if (typeof renderInventory === "function") renderInventory();
    return true;
  }

  /*  Çantada o parçadan kaç tane var. Ürün adı mağazadan gelir;
      mağaza yüklü değilse 0 döner (düğme de çizilmez).            */
  function cantadakiParca(anahtar) {
    const s = S(); if (!s || !s.inventory) return 0;
    const ad = parcaUrunAdi(anahtar);
    if (!ad) return 0;
    return Math.max(0, Math.floor(s.inventory[ad] || 0));
  }

  /* Doğrudan anahtarla ekleme — havuza YAZAR. Ödüllerde kullanma;
     onlar için parcaCantayaEkle(). */
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

    /* Seviye atlama efekti. Efekt oynarsa toast BASILMAZ — ikisi
       üst üste binerse iki ayrı bildirim görünür. Efekt açılamazsa
       (THREE yoksa) eski toast yolu aynen çalışır. */
    let efektOynadi = false;
    if (window.YILDIZ_EFEKTI && typeof YILDIZ_EFEKTI.oynat === "function") {
      efektOynadi = YILDIZ_EFEKTI.oynat(id, sv, sv + 1) === true;
    }
    if (!efektOynadi) {
      const h = (typeof HERO_STATS !== "undefined") ? HERO_STATS[id] : null;
      toast(`${(h && h.name) || "Kahraman"} Sv${sv + 1} oldu!`);
    }
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

  /*  Yıldız (parça) geliştirme çubuğu VARSAYILAN OLARAK KAPALI.
      Yerinde yalnız küçük bir ok kutusu durur; basılınca çubuk ve
      yanındaki ↑ açılır. Ekran kalabalık görünmesin diye.
      Panel her açıldığında kapalıya döner. */
  let gelisAcik = false;

  /*  Ok ve kitap görselleri. Dosya yoksa `onerror` yedeği devreye
      girer ve kırık resim yerine yazı işareti görünür — bu yüzden
      dosya yüklenmeden de ekran bozulmaz. */
  const OK_GORSEL    = "ok.webp";
  const KITAP_GORSEL = "kitap.webp";

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

    aktifSekme = "yetenek";
    gelisAcik = false;
    kutucuklar(true);

    const p = document.createElement("div");
    p.id = PANEL_ID;
    /* Arka plan YOK — kahraman görseli hiç örtülmez.
       Panel yalnız düğmeleri taşır, görselin altına oturur. */
    const sahipli = sahip(id);
    /* Alt sekme şeridi (#hdTabs) bottom:0'da duruyor. Panel yalnız %3
       yukarıdaydı, şerit paneli örtüyordu. Şeridin boyu ÖLÇÜLÜR —
       sabit yazılsaydı şeridin yüksekliği değişince yine çakışırdı.
       Ölçü 0 dönerse (henüz çizilmediyse) 46px'e düşer (Tuzak 22). */
    const seritYuk = (document.getElementById("hdTabs") || {}).offsetHeight || 46;
    p.style.cssText =
      "position:absolute;left:12px;right:12px;z-index:8;" +
      "bottom:" + (sahipli ? `calc(3% + ${seritYuk}px)` : `calc(4% + ${seritYuk + 12}px)`) + ";" +
      "box-sizing:border-box;color:#eaf6ff;background:none;border:none;" +
      "display:flex;flex-direction:column;";

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
        <div style="font-size:12.5px;color:#cbe4ff;">${ad}</div>
        <div style="font-size:12.5px;white-space:nowrap;">${sag}</div>
      </div>`;
  }

  function sekmeYetenek(id) {
    const k = yetenekKiyas(id);
    if (!k.length) return `<div style="padding:16px 0;text-align:center;color:#9fb6c9;font-size:13px;">Yetenek yok.</div>`;
    /* Yetenek seviyesi kahramanın seviyesiyle aynıdır — ayrı bir
       yetenek seviyesi kavramı yok, `valuesByLevel` doğrudan kahraman
       seviyesinden okunuyor. */
    const svEtiket = `<span style="font-weight:700;font-size:11px;color:#e8f4ff;` +
                     `text-shadow:0 1px 2px rgba(0,20,45,.55);` +
                     `font-variant-numeric:tabular-nums;margin-left:6px;">Sv.${seviye(id)}</span>`;
    let out = "";
    k.forEach(x => { if (x.simdi != null) out += satirHTML(x.ad + (x.ek || "") + svEtiket, x.simdi, x.sonra, true); });
    return out;
  }

  function sekmeStat(id) {
    /*  TEK GERÇEK KAYNAK: statSatirlari() + kapasite().
        Eskiden burada `state.hero` okunuyordu — o OYUNCUNUN statıydı,
        kahramana ait değildi ve savaşta hiçbir yere girmiyordu, yani
        ekranda yalan bir sayı duruyordu. Kaldırıldı. Aşağıdaki
        yüzdeler `HERO_STATS[id].bonuses` üzerinden gelir ve savaşta
        `statUygula()` ile birebir aynı değerlerdir.                  */
    const sv    = seviye(id);
    const ileri = Math.min(MAX_SV, sv + 1);
    const artar = ileri > sv;

    const simdi = statSatirlari(id, sv);
    if (!simdi.length) {
      return `<div style="padding:16px 0;text-align:center;color:#9fb6c9;font-size:13px;">Stat bonusu yok.</div>`;
    }
    const sonra = artar ? statSatirlari(id, ileri) : [];
    const sonraHaritasi = {};
    sonra.forEach(x => { sonraHaritasi[x.anahtar] = x.yuzde; });

    let out = "";
    simdi.forEach(x => {
      const s2 = artar ? sonraHaritasi[x.anahtar] : null;
      /* satirHTML'in 4. parametresi `yuzde` — "%" önekini KENDİSİ
         koyar. Değerin başına ayrıca "%" eklenirse "%%25" çıkar. */
      out += satirHTML(x.ad, x.yuzde, (s2 != null ? s2 : null), true);
    });

    /*  Sefer kapasitesi YILDIZA DEĞİL tecrübe seviyesine bağlıdır.
        `sv` bu fonksiyonda yıldızdır; buraya geçirilirse kapasite
        yanlış çıkar — ayrı okunur. */
    const tsv    = tecrubeSeviyesi(id);
    const tIleri = Math.min(MAX_TSV, tsv + 1);
    const kSimdi = kapasite(id, tsv);
    const kSonra = (tIleri > tsv) ? kapasite(id, tIleri) : null;
    out += satirHTML(`Sefer Kapasitesi <span style="color:#9fb6c9;">(Tecrübe Sv.${tsv})</span>`,
                     kSimdi.toLocaleString("tr-TR"),
                     (kSonra != null ? kSonra.toLocaleString("tr-TR") : null),
                     false);

    out += `<div style="padding:10px 2px 0;font-size:11.5px;color:#7f96a8;line-height:1.5;">
              Bu yüzdeler yalnız <b>${aileAdi(id)}</b> birliklerine işler.
            </div>`;
    return out;
  }

  /* Kahramanın bağlı olduğu ailenin oyuncuya görünen adı. */
  function aileAdi(id) {
    const b = bonusTanimi(id);
    const a = b && b.aile;
    return a === "knight"  ? "Savunucu"
         : a === "soldier" ? "Koruyucu"
         : a === "robot"   ? "Nişancı" : "kendi ailesine ait";
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

    /*  YILDIZ YALNIZ SAHİPLİ KAHRAMANDA.
        Eskiden sahiplik bakılmadan çiziliyordu: kilitli kahramanın
        seviyesi varsayılan 1 olduğu için kartta bir yıldız DOLU
        görünüyordu — oyuncu almadığı kahramanın seviyesini görüyordu.
        Satın alınmadan yıldız hiç çıkmaz. */
    let yildiz = "";
    if (sahip(id)) {
      for (let i = 0; i < MAX_SV; i++) {
        yildiz += `<span style="color:${i < sv ? "#ffd257" : "rgba(255,255,255,.30)"};
                     font-size:30px;filter:drop-shadow(0 1px 3px rgba(0,20,45,.8));">★</span>`;
      }
    }

    /* ── SARI HAP MODELİ ──────────────────────────────────────
       Tek düğme: içinde hem "GELİŞTİR" hem parça sayacı var.
       Ayrı ilerleme çubuğu + ayrı "Sv..'e Yükselt" düğmesi YOK —
       ikisi tek hapta birleşti. Yanındaki turuncu ↑ parça penceresini
       açar. Hap parça yetmese de SARI kalır; yetmiyorsa dolgu
       oranı azalır ve basınca uyarı verir. */
    /*  SAHİPSİZ KAHRAMAN → geliştirme çubuğu YOK.
        Aynı yerde SATIN AL düğmesi durur. Eskiden çubuk çiziliyor,
        heroes.js'in ayrı "Satın Al" düğmesi de onun üstüne biniyordu:
        iki düğme üst üste görünüyordu. Satın alma mantığı burada
        TEKRARLANMAZ — heroes.js'teki tek kopya çağrılır.            */
    const alt = !sahip(id)
      ? `<button id="glsSatinAl" style="display:block;margin:0 auto;
              width:auto;height:38px;padding:0 26px;white-space:nowrap;
              border:none;border-radius:19px;font-family:${YAZI};
              font-size:14px;font-weight:800;color:#20140a;
              background:${TEMA.sari};box-shadow:0 2px 6px rgba(0,20,45,.3);
              cursor:pointer;">
           Satın Al  ${ELMAS("gelistir")} ${(h.price || 0).toLocaleString("tr-TR")}
         </button>`
      : sonSeviye
      ? `<div id="glsGelisKap" style="display:${gelisAcik ? "block" : "none"};
              text-align:center;padding:10px;border-radius:14px;
              background:${TEMA.sari};
              color:#20140a;font-weight:800;font-size:13.5px;
              font-family:${YAZI};">En yüksek seviye</div>`
      : `<div id="glsGelisKap" style="display:${gelisAcik ? "flex" : "none"};
              align-items:center;justify-content:center;gap:9px;">
           <button id="glsYukselt" style="flex:0 1 auto;height:26px;padding:0 22px;
                   border:none;border-radius:13px;position:relative;overflow:hidden;
                   background:rgba(60,38,10,.55);cursor:pointer;">
             <span style="position:absolute;inset:0 auto 0 0;width:${oran}%;
                          background:${TEMA.sari};"></span>
             <!--  Metin AKIŞTA durur (position:absolute DEĞİL): düğmenin
                   genişliğini yazının kendisi belirlesin diye. Dolgu şeridi
                   absolute kalır, altta; metin z-index ile üstünde durur.
                   "GELİŞTİR" yazısı kaldırıldı, yalnız sayaç kaldı; yazı
                   beyaz, sarı dolgu üstünde okunabilmesi için koyu gölge. -->
             <span style="position:relative;z-index:1;display:flex;align-items:center;
                          justify-content:center;font-size:12.5px;font-weight:800;
                          font-family:${YAZI};color:#ffffff;text-shadow:${TEMA.golge};
                          white-space:nowrap;height:100%;
                          font-variant-numeric:tabular-nums;">
               ${Math.min(eldeki, bedel)} / ${bedel}
             </span>
           </button>
           <button id="glsArti" style="flex:0 0 auto;width:34px;height:34px;padding:0;
                   border:none;border-radius:10px;font-family:${YAZI};font-size:18px;
                   font-weight:800;line-height:34px;text-align:center;color:#20140a;
                   display:flex;align-items:center;justify-content:center;cursor:pointer;
                   background:${TEMA.sari};">↑</button>
         </div>`;

    /*  ── OK KUTUSU ────────────────────────────────────────────
        GELİŞTİR çubuğunu açıp kapatır. Görsel `<button>` içinde:
        düğmenin padding'i 0, görselin display'i block olmalı, aksi
        halde altta satır boşluğu kalır ve kutu kare olmaz.
        Sahipsiz kahramanda çizilmez — orada Satın Al duruyor.      */
    /*  Sarı kutu KALDIRILDI: zemin yok, çerçeve yok, yalnız ok.
        Görsel `contain` ile oturur (cover kırpardı), kutu 34→28px.  */
    const okKutu = !sahip(id) ? "" : `
      <button id="glsOkKutu" style="flex:0 0 auto;width:28px;height:28px;padding:0;
              margin-left:8px;border:none;border-radius:0;background:transparent;
              cursor:pointer;display:flex;align-items:center;justify-content:center;
              overflow:visible;font-family:${YAZI};font-size:18px;font-weight:800;
              color:${TEMA.sari};line-height:1;letter-spacing:0;">
        <img id="glsOkGor" src="${OK_GORSEL}" alt=""
             style="width:100%;height:100%;display:block;object-fit:contain;">
      </button>`;

    /* ── TECRÜBE SATIRI — YILDIZDAN AYRI ──────────────────────
       Kitapla TECRÜBE seviyesi yükseltir (kapasite+güç); üstteki sarı
       hap parçayla YILDIZ yükseltir. İkisi ayrı kaynağı harcar.
       YILDIZ ÇUBUĞU AÇIKKEN ÇİZİLMEZ (`gelisAcik`): iki hap alt alta
       gelince ekran kalabalıklaşıyordu. Ok kapalıyken burada durur.
       Sahipsiz kahramanda hiç çizilmez.                            */
    let tecrube = "";
    if (sahip(id) && !gelisAcik) {
      const d = tecrubeDurumu(id);
      if (d.sonSeviye) {
        tecrube = `<div style="margin-top:8px;text-align:center;padding:9px;
                        border-radius:14px;background:#5bb9e6;color:#0d2036;
                        font-family:${YAZI};font-weight:800;font-size:13px;">
                     Tecrübe Sv.${MAX_TSV} — en yüksek
                   </div>`;
      } else {
        const gerekenK = Math.ceil((d.gereken - d.birikmis) / KITAP_EXP);
        const eldeK    = kitapSayisi();
        const oranK    = gerekenK > 0
          ? Math.min(100, Math.round(eldeK / gerekenK * 100)) : 0;
        tecrube = `
          <div style="display:flex;align-items:center;justify-content:center;
                      gap:9px;margin-top:8px;">
            <button id="glsTecYukselt" style="flex:0 1 auto;height:40px;padding:0 16px;
                    border:none;border-radius:20px;position:relative;overflow:hidden;
                    background:rgba(10,40,70,.55);cursor:pointer;">
              <span style="position:absolute;inset:0 auto 0 0;width:${oranK}%;
                           background:#5bb9e6;"></span>
              <!--  İki satır: üstte YÜKSELT, altta sayı + kitap görseli.
                    Görsel SABİT genişlikli kutuda durur ki ölçüsü
                    değişince yanındaki sayının yeri kaymasın. -->
              <span style="position:relative;z-index:1;display:flex;
                           flex-direction:column;align-items:center;justify-content:center;
                           gap:2px;font-size:13.5px;font-weight:800;line-height:1;
                           font-family:${YAZI};color:#0d2036;white-space:nowrap;height:100%;
                           font-variant-numeric:tabular-nums;">
                <span style="line-height:1;">YÜKSELT</span>
                <span style="display:flex;align-items:center;justify-content:center;
                             gap:5px;line-height:1;">
                  ${gerekenK}
                  <span style="flex:0 0 16px;width:16px;height:16px;display:flex;
                               align-items:center;justify-content:center;font-size:12px;">
                    <img id="glsKitapGor" src="${KITAP_GORSEL}" alt=""
                         style="width:100%;height:100%;display:block;object-fit:contain;">
                  </span>
                </span>
              </span>
            </button>
          </div>`;
      }
    }

    /* Üst satır: YALNIZ yıldızlar, ortada. Ad/parça/seviye ibaresi
       kaldırıldı — ekranın tepesinde kahraman adı zaten yazıyor. */
    /*  Yıldızların SOLUNDA tecrübe seviyesi. Yıldız sayısı parçadan,
        bu sayı kitaptan gelir — ikisi ayrı ilerlemedir, yan yana
        durmaları karışıklık değil, bilerek. */
    const tecSv = sahip(id)
      ? `<span id="glsTecSv" style="font-family:${YAZI};font-size:15px;font-weight:800;
                 color:#eaf6ff;text-shadow:${TEMA.golge};letter-spacing:0;
                 margin-right:8px;font-variant-numeric:tabular-nums;
                 position:relative;top:3px;
                 ">Sv.${tecrubeSeviyesi(id)}</span>`
      : "";

    /*  Ok kutusu yıldızlarla AYNI SATIRDA, sağ uçta. Ayrı satırdaysa
        yıldızlarla hizası şaşıyordu. */
    p.innerHTML = `
      <div style="display:flex;justify-content:center;align-items:center;
                  padding-bottom:8px;letter-spacing:2px;">${tecSv}${yildiz}${okKutu}</div>
      ${alt}
      ${tecrube}
    `;

    const satBtn = p.querySelector("#glsSatinAl");
    if (satBtn) satBtn.onclick = e => {
      e.stopPropagation();
      if (typeof window.hdSatinAl === "function") window.hdSatinAl();
    };

    const btn = p.querySelector("#glsYukselt");
    if (btn) btn.onclick = e => {
      e.stopPropagation();
      if (yukselt(id)) { ciz(p, id); yenile(); }
    };

    const arti = p.querySelector("#glsArti");
    if (arti) arti.onclick = e => { e.stopPropagation(); parcaPenceresi(id, p); };

    /*  Görsel yedekleri: dosya sunucuda yoksa `onerror` çalışır ve
        kırık resim yerine yazı işareti kalır. `src` çalışma anında
        DEĞİŞTİRİLMEZ — bir kare eski görsel gösterme tuzağı. */
    const okGor = p.querySelector("#glsOkGor");
    if (okGor) okGor.onerror = () => {
      const b = okGor.parentNode;
      okGor.remove();
      if (b) b.textContent = gelisAcik ? "▲" : "▼";
    };
    const kitGor = p.querySelector("#glsKitapGor");
    if (kitGor) kitGor.onerror = () => {
      const b = kitGor.parentNode;
      kitGor.remove();
      if (b) b.textContent = "📘";
    };

    const okBtn = p.querySelector("#glsOkKutu");
    if (okBtn) okBtn.onclick = e => {
      e.stopPropagation();
      gelisAcik = !gelisAcik;
      ciz(p, id);
    };

    const tec = p.querySelector("#glsTecYukselt");
    if (tec) tec.onclick = e => {
      e.stopPropagation();
      if (tecrubeYukselt(id)) { ciz(p, id); yenile(); }
    };
  }

  /* ── PARÇA PENCERESİ — "+" düğmesi açar ─────────────────────
     Mağazanın satın alma penceresi düzeni: solda ikon, sağda ad,
     altta açıklama. Kapatma yalnız dışarı dokunarak. */
  const PP_ID = "glsParcaKat";

  function parcaPenceresi(id, panel) {
    const eski = document.getElementById(PP_ID);
    if (eski) eski.remove();

    const h = HERO_STATS[id];
    const n = nadirlik(id);
    const r = RENK[n];

    const kat = document.createElement("div");
    kat.id = PP_ID;
    kat.style.cssText =
      "position:fixed;inset:0;z-index:9100;display:flex;" +
      "align-items:center;justify-content:center;padding:18px;" +
      "background:rgba(2,10,24,.60);";
    document.body.appendChild(kat);

    const kutu = document.createElement("div");
    kutu.style.cssText =
      "width:min(330px,90vw);box-sizing:border-box;color:#eaf6ff;" +
      `background:linear-gradient(180deg,${TEMA.ust} 0%,${TEMA.orta} 55%,${TEMA.alt} 100%);` +
      `border:1px solid ${TEMA.kenar};border-radius:16px;padding:15px;` +
      `font-family:${YAZI};box-shadow:0 2px 6px rgba(0,20,45,.3);`;
    kat.appendChild(kutu);

    /* Dışarı dokunma kapatır — dinleyici GECİKMELİ bağlanır, yoksa
       "+" düğmesinin kendi dokunuşu pencereyi anında kapatır (Tuzak 35). */
    setTimeout(() => {
      kat.addEventListener("pointerup", e => { if (e.target === kat) kat.remove(); });
    }, 0);

    const ciz2 = () => {
      const sv = seviye(id);
      const sonSeviye = sv >= MAX_SV;
      const bedel = maliyet(id);
      const eldeki = parcaSayisi(id);
      const yeter = !sonSeviye && eldeki >= bedel;
      const eksik = Math.max(0, bedel - eldeki);

      const cantada = cantadakiParca(parcaAnahtari(id));

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
                  background:${se ? "rgba(255,255,255,.16)" : "transparent"};
                  color:${se ? TEMA.yazi : TEMA.solgun};
                  border-bottom:2px solid ${se ? TEMA.sari : "transparent"};">
            ${x.ad}
          </button>`;
      });

      const icerik = aktifSekme === "stat" ? sekmeStat(id)
                   : aktifSekme === "taki" ? sekmeTaki()
                   : sekmeYetenek(id);

      kutu.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          ${parcaKutusu(parcaAnahtari(id), 56)}
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:800;color:${TEMA.sari};">${h.name} · Sv${sv}</div>
            <div style="font-size:12px;color:#cbe4ff;">
              ${r.ad} · elinde ${eldeki}
              ${sonSeviye ? "" : ` · gereken ${bedel}`}
            </div>
          </div>
        </div>

        <div style="display:flex;margin-top:11px;
                    border-bottom:1px solid rgba(190,240,255,.18);">${sekmeBar}</div>

        <div style="max-height:34vh;overflow-y:auto;-webkit-overflow-scrolling:touch;
                    padding:4px 2px 6px;">${icerik}</div>

        ${eksik ? `<div style="margin-top:8px;font-size:12px;color:#ffb08a;">
                     ${eksik} parça eksik.</div>` : ""}

        <button id="ppYukselt" style="width:100%;margin-top:11px;padding:11px;border:none;
                border-radius:11px;font-weight:800;font-size:15px;font-family:inherit;
                font-family:${YAZI};text-shadow:${TEMA.golge};
                background:${yeter
                  ? `linear-gradient(180deg,${TEMA.sari},${TEMA.sariKoyu})`
                  : "rgba(255,255,255,.10)"};
                color:${yeter ? "#20140a" : TEMA.solgun};">
          ${sonSeviye ? "En yüksek seviye" : `Sv${sv + 1}'e Yükselt`}
        </button>

        ${cantada ? `<button id="ppCanta" style="width:100%;margin-top:7px;padding:10px;
                border:none;border-radius:11px;font-weight:800;font-size:13.5px;
                font-family:${YAZI};text-shadow:${TEMA.golge};
                background:linear-gradient(180deg,${TEMA.sari},${TEMA.sariKoyu});
                color:#20140a;">
          Çantandaki ${cantada} parçayı kullan
        </button>` : ""}

        <button id="ppMagaza" style="width:100%;margin-top:7px;padding:10px;border:none;
                border-radius:11px;font-weight:800;font-size:13.5px;font-family:inherit;
                font-family:${YAZI};background:rgba(255,255,255,.10);color:${TEMA.yazi};">
          Mağazadan parça al
        </button>
      `;

      Array.prototype.forEach.call(kutu.querySelectorAll(".glsSekme"), b => {
        b.onclick = e => { e.stopPropagation(); aktifSekme = b.dataset.k; ciz2(); };
      });

      const y = kutu.querySelector("#ppYukselt");
      if (y) y.onclick = e => {
        e.stopPropagation();
        if (yukselt(id)) {
          ciz2();
          if (panel) ciz(panel, id);
          yenile();
        }
      };
      /*  Çantadan havuza aktarım TEK YOLDAN geçer: parcaPaketiKullan.
          İkinci bir aktarma kodu yazılmaz — çanta düşümü ve havuz
          eklemesi orada birlikte kapanıyor.                        */
      const c = kutu.querySelector("#ppCanta");
      if (c) c.onclick = e => {
        e.stopPropagation();
        const ad = parcaUrunAdi(parcaAnahtari(id));
        if (!ad) return;
        parcaPaketiKullan(ad);
        ciz2();
        if (panel) ciz(panel, id);
        yenile();
      };

      const m = kutu.querySelector("#ppMagaza");
      if (m) m.onclick = e => {
        e.stopPropagation();
        kat.remove();
        const hd = document.getElementById("heroDetailOverlay");
        if (hd) hd.style.display = "none";
        if (typeof openOverlayPanel === "function") openOverlayPanel("shop");
        else toast("Mağaza sekmesinden parça alabilirsin.");
      };
    };
    ciz2();
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
    const id = hd.dataset.hero;
    if (!id) return;

    /*  GÜÇ YAZISI — heroes.js çiziyor, seviye burada değişiyor.
        Yıldız şeridi kontrolünden ÖNCE yapılır: #hdStars her ekranda
        yok, oraya takılıp erken dönersek güç hiç tazelenmez. */
    const gd = hd.querySelector("#hdGucDeger");
    if (gd) gd.textContent = (kahramanGucu(id) || 0).toLocaleString("tr-TR");

    const st = hd.querySelector("#hdStars");
    if (!st) return;
    const sv = seviye(id);
    Array.prototype.forEach.call(st.children, (s, i) => {
      s.style.color = i < sv ? "#ffd700" : "#444";
    });
  }

  /* ── TEST HİLESİ — ?parca=1 · ?kitap=1 ──────────────────────
     İŞ BİTİNCE SİLİNİR. ?kitap=1 çantaya 200 Tecrübe Kitabı koyar. */
  function kitapHilesi() {
    try {
      if (location.search.indexOf("kitap=1") === -1) return;
      const s = S(); if (!s) return;
      const ad = kitapUrunAdi();
      if (!ad) { toast("Test: Tecrübe Kitabı ürünü bulunamadı."); return; }
      if (!s.inventory || typeof s.inventory !== "object") s.inventory = {};
      s.inventory[ad] = Math.floor((s.inventory[ad] || 0) + 200);
      kaydet();
      if (typeof renderInventory === "function") renderInventory();
      toast("Test: 200 Tecrübe Kitabı eklendi.");
    } catch (e) {}
  }
  window.addEventListener("load", () => setTimeout(kitapHilesi, 1600));

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

  /* ══════════════════════════════════════════════════════════════
     KAHRAMAN STAT BONUSLARI
     Tanım TEK YERDE: heroes.js → HERO_STATS[id].bonuses
       { aile, artis, taban:{ atk, def, hp, olum } }
     Sv1'de `taban` geçerlidir, her seviye üstüne +`artis` puan biner.
     Bonus YALNIZ kahramanın kendi ailesine işler; aynı aileden iki
     kahraman varsa yüzdeler TOPLANIR.
     ══════════════════════════════════════════════════════════════ */
  const STAT_ADI = { atk: "Saldırı", def: "Savunma", hp: "Sağlık", olum: "Öldürücülük" };

  function bonusTanimi(id) {
    try {
      if (typeof HERO_STATS === "undefined") return null;
      const h = HERO_STATS[id];
      return (h && h.bonuses && h.bonuses.taban) ? h.bonuses : null;
    } catch (e) { return null; }
  }

  /* Verilen kahramanın seviyeye göre yüzdeleri: { aile, atk, def, hp, olum } */
  function statBonusu(id, sv) {
    const b = bonusTanimi(id);
    if (!b) return null;
    const seviyeNo = Math.max(1, Math.min(MAX_SV, sv || seviye(id) || 1));
    const ek = (seviyeNo - 1) * (b.artis || 0);
    const out = { aile: b.aile || null };
    Object.keys(STAT_ADI).forEach(k => {
      const t = b.taban[k];
      if (typeof t === "number") out[k] = t + ek;
    });
    return out;
  }

  /* ══════════════════════════════════════════════════════════════
     TECRÜBE (EXP) — YILDIZDAN AYRI İKİNCİ İLERLEME
     Yıldız (heroLevels, 1–5) parçadan gelir ve SAVAŞ YÜZDELERİNİ
     belirler. Tecrübe seviyesi (heroExp'ten türer, 1–50) Tecrübe
     Kitabı'ndan gelir ve SEFER KAPASİTESİ ile GÜCÜ belirler.
     İkisi birbirine karışmaz.

     TEK DOĞRULUK KAYNAĞI: state.heroExp[id] — kahramanın toplam
     tecrübesi. Seviye ayrıca SAKLANMAZ, her seferinde bu sayıdan
     hesaplanır; iki alan tutulsaydı zamanla birbirinden ayrışırdı.

     Bir seviyeden diğerine gereken kitap sayısı artar:
       Sv1→2 = 2 · Sv10→11 = 15 · Sv35→36 = 50 · Sv49→50 = 69
     Tepeye kadar toplam 1.744 kitap.
     ══════════════════════════════════════════════════════════════ */
  const MAX_TSV       = 50;    /* tecrübe seviyesi tavanı        */
  const KITAP_EXP     = 500;   /* bir kitabın verdiği tecrübe    */
  const KITAP_TABAN   = 2;     /* Sv1→2 için kitap sayısı        */
  const KITAP_ARTIS   = 1.4;   /* her seviyede eklenen kitap     */

  /* sv → sv+1 için gereken kitap. Tavanda 0. */
  function gerekliKitap(sv) {
    if (!(sv >= 1) || sv >= MAX_TSV) return 0;
    return KITAP_TABAN + Math.round((sv - 1) * KITAP_ARTIS);
  }

  /* sv → sv+1 için gereken tecrübe. Tavanda 0. */
  function gerekliExp(sv) { return gerekliKitap(sv) * KITAP_EXP; }

  function expHavuzu() {
    const s = S(); if (!s) return {};
    if (!s.heroExp || typeof s.heroExp !== "object") s.heroExp = {};
    return s.heroExp;
  }

  function toplamExp(id) {
    const v = Math.floor(expHavuzu()[id] || 0);
    return v > 0 ? v : 0;
  }

  /* Verilen tecrübe sayısının karşılığı olan seviye. SAF fonksiyon:
     başka oyuncunun verisi için de kullanılır (sıralama ekranı). */
  function expSeviyesi(exp) {
    let kalan = Math.floor(exp || 0);
    if (!(kalan > 0)) return 1;
    let sv = 1;
    while (sv < MAX_TSV) {
      const g = gerekliExp(sv);
      if (g <= 0 || kalan < g) break;
      kalan -= g; sv++;
    }
    return sv;
  }

  /* Kahramanın tecrübe durumu: { sv, birikmis, gereken, sonSeviye } */
  function tecrubeDurumu(id) {
    let kalan = toplamExp(id), sv = 1;
    while (sv < MAX_TSV) {
      const g = gerekliExp(sv);
      if (g <= 0 || kalan < g) break;
      kalan -= g; sv++;
    }
    return { sv: sv, birikmis: kalan, gereken: gerekliExp(sv),
             sonSeviye: sv >= MAX_TSV };
  }

  function tecrubeSeviyesi(id) { return tecrubeDurumu(id).sv; }

  /* ── TECRÜBE KİTABI ─────────────────────────────────────────
     Kitap ÇANTADA durur (state.inventory), havuza girmez. Ürün adı
     mağazadan `isExpKitap` bayrağıyla bulunur; burada ikinci bir
     tablo tutulmaz. Mağaza yüklü değilse kitap yok sayılır. */
  function kitapUrunAdi() {
    try {
      if (typeof shopItems === "undefined" || !Array.isArray(shopItems)) return null;
      const it = shopItems.find(x => x && x.isExpKitap);
      return it ? it.name : null;
    } catch (e) { return null; }
  }

  function kitapSayisi() {
    const s = S(); if (!s) return 0;
    const ad = kitapUrunAdi(); if (!ad) return 0;
    return Math.max(0, Math.floor((s.inventory && s.inventory[ad]) || 0));
  }

  /* Bir seviye atlatır. Tam yetecek kadar kitap harcanır, fazlası
     çantada kalır. Yetmiyorsa hiç harcanmaz. */
  function tecrubeYukselt(id) {
    const s = S(); if (!s) return false;
    if (!sahip(id)) { toast("Bu kahraman senin değil."); return false; }

    const d = tecrubeDurumu(id);
    if (d.sonSeviye) { toast("Bu kahraman en yüksek tecrübe seviyesinde."); return false; }

    const ad = kitapUrunAdi();
    if (!ad) { toast("Tecrübe Kitabı bulunamadı."); return false; }

    const gereken = Math.ceil((d.gereken - d.birikmis) / KITAP_EXP);
    const eldeki  = kitapSayisi();
    if (eldeki < gereken) {
      toast(`Yeterli kitabın yok. ${gereken} gerekiyor, elinde ${eldeki} var.`);
      return false;
    }

    if (!s.inventory || typeof s.inventory !== "object") s.inventory = {};
    s.inventory[ad] = eldeki - gereken;
    if (s.inventory[ad] <= 0) delete s.inventory[ad];

    const h = expHavuzu();
    h[id] = toplamExp(id) + gereken * KITAP_EXP;
    kaydet();

    if (typeof renderInventory === "function") renderInventory();
    const hh = (typeof HERO_STATS !== "undefined") ? HERO_STATS[id] : null;
    toast(`${(hh && hh.name) || "Kahraman"} tecrübe Sv${d.sv + 1} oldu!`);
    return true;
  }

  /* Kahramanın gösterilen gücü. Taban güç heroes.js'te, seviye
     çarpanı burada: Sv50'de taban × 5. */
  const GUC_KAT = 4;
  function kahramanGucu(id, sv) {
    let taban = 0;
    try { if (typeof KAHRAMAN !== "undefined") taban = KAHRAMAN.guc(id) || 0; } catch (e) {}
    if (!taban) return 0;
    let s2 = Math.floor(sv || tecrubeSeviyesi(id) || 1);
    if (s2 < 1) s2 = 1;
    if (s2 > MAX_TSV) s2 = MAX_TSV;
    return Math.round(taban * (1 + (s2 - 1) / (MAX_TSV - 1) * GUC_KAT));
  }

  /* ══════════════════════════════════════════════════════════════
     BİRLİK KAPASİTESİ — SEFER TAVANI
     Oyuncu artık ordusunun tamamını tek seferde süremez. Savaşa
     götürülebilecek birlik sayısının tavanı:

         TABAN_KAPASITE + seçili kahramanların kapasiteleri

     Kahraman kapasitesi nadirlik + TECRÜBE SEVİYESİNDEN gelir
     (yıldızdan DEĞİL — yıldız yalnız savaş yüzdelerini belirler):
       mor  : 20.000, her seviye +653   → Sv1 20.000 · Sv50 51.997
       ssr  : 25.000, her seviye +858   → Sv1 25.000 · Sv50 67.042
     Tavan bilerek eskisiyle aynı bırakıldı; değişen tek şey, aynı
     tavana 5 basamak yerine 50 basamakta çıkılması.

     KADEME FARK ETMEZ: Sv1 şövalye de Sv6 dev robot da 1 yer kaplar.
     (Kademeye göre yer maliyeti istenirse birimYeri() içi değişir,
     çağıran yerlerin hiçbiri değişmez.)

     Tavan YALNIZ saldırıya/sefere çıkarken geçerlidir. Savunmada
     tavan yoktur — kalede duran ordunun tamamı savunur.
     ══════════════════════════════════════════════════════════════ */
  const TABAN_KAPASITE = 5000;      /* herkeste var, kahramansız da */

  const KAPASITE = {
    mor: { taban: 20000, artis: 653 },
    ssr: { taban: 25000, artis: 858 }
  };

  /* Tek kahramanın açtığı kapasite. `sv` TECRÜBE seviyesidir (1–50);
     verilmezse kahramanın kendi tecrübe seviyesi okunur. Buraya
     yıldız seviyesi geçirilirse kapasite olduğundan düşük çıkar. */
  function kapasite(id, sv) {
    const k = KAPASITE[nadirlik(id)] || KAPASITE.mor;
    const seviyeNo = Math.max(1, Math.min(MAX_TSV, sv || tecrubeSeviyesi(id) || 1));
    return k.taban + (seviyeNo - 1) * k.artis;
  }

  /* Bir birliğin kapladığı yer. Şimdilik hepsi 1. */
  function birimYeri(unitId) { return 1; }

  /* Sefere çıkarken geçerli TOPLAM tavan.
     `idler` verilmezse savaşa seçili komutanlar okunur. */
  function savasKapasitesi(idler) {
    let liste = idler;
    if (!Array.isArray(liste)) {
      try {
        liste = (typeof selectedCommanders !== "undefined" && Array.isArray(selectedCommanders))
              ? selectedCommanders : [];
      } catch (e) { liste = []; }
    }
    let top = TABAN_KAPASITE;
    liste.filter(Boolean).forEach(id => { top += kapasite(id); });
    return top;
  }

  /* Seçilen birlik nesnesinin kapladığı toplam yer. */
  function kullanilanYer(secim) {
    let top = 0;
    Object.keys(secim || {}).forEach(u => {
      const n = secim[u] || 0;
      if (n > 0) top += n * birimYeri(u);
    });
    return top;
  }

  /* Kahraman ekranındaki STAT sekmesi için satırlar */
  function statSatirlari(id, sv) {
    const s = statBonusu(id, sv);
    if (!s) return [];
    return Object.keys(STAT_ADI)
      .filter(k => typeof s[k] === "number")
      .map(k => ({ anahtar: k, ad: STAT_ADI[k], yuzde: s[k] }));
  }

  /* Savaş motoru (pvp.js / pve.js) — birim statlarına uygular.
     `seviyeler` verilirse oradan okunur (savunanın seviyeleri savaş
     paketiyle taşınır); verilmezse KENDİ seviyemiz kullanılır.
     Haritada kahraman yoksa Sv1 sayılır, kendi seviyemize düşmez. */
  function statUygula(units, skins, seviyeler) {
    if (!Array.isArray(units) || !Array.isArray(skins)) return;
    const toplam = {};   /* aile → { atk, def, hp, olum } */
    skins.filter(Boolean).forEach(id => {
      const sv = (seviyeler && typeof seviyeler === "object")
        ? (Number(seviyeler[id]) || 1)
        : seviye(id);
      const s = statBonusu(id, sv);
      if (!s || !s.aile) return;
      const t = toplam[s.aile] || (toplam[s.aile] = { atk: 0, def: 0, hp: 0, olum: 0 });
      Object.keys(STAT_ADI).forEach(k => { if (typeof s[k] === "number") t[k] += s[k]; });
    });
    if (!Object.keys(toplam).length) return;

    /* AİLE ÇÖZÜMÜ — pvp.js'teki AILE() bir IIFE'nin İÇİNDE tanımlı,
       yani buradan görünmez. Eskiden `typeof AILE === "function"`
       her zaman false dönüyor, aile null kalıyor ve bonusların
       HİÇBİRİ uygulanmıyordu (öldürücülük dahil). Aile artık
       troops.js'ten okunuyor — o global. */
    const aileBul = (uid) => {
      if (typeof birlikAilesi === "function") return birlikAilesi(uid);
      if (typeof UNIT_TYPES !== "undefined" && UNIT_TYPES[uid] && UNIT_TYPES[uid].aile)
        return UNIT_TYPES[uid].aile;
      return String(uid).replace(/[0-9]+$/, "") || uid;
    };
    units.forEach(u => {
      const t = toplam[aileBul(u.unitId)];
      if (!t) return;
      /* YUVARLAMA YOK: taban değerler küçük (savunma 5, saldırı 2).
         Math.round burada %20'lik bonusu sıfıra indiriyor, bir sonraki
         bonusu da şişiriyordu. Ondalık taşınır, yuvarlama yalnızca
         ekrana yazarken yapılır. */
      if (t.atk)  u.atk  = Math.max(0.1, u.atk  * (1 + t.atk  / 100));
      if (t.def)  u.def  = Math.max(0,   u.def  * (1 + t.def  / 100));
      if (t.hp)   u.hp   = Math.max(0.1, u.hp   * (1 + t.hp   / 100));
      if (t.olum) u.olum = (u.olum || 0) * (1 + t.olum / 100);
    });
  }

  /* ── DIŞA AÇILAN KAPILAR ────────────────────────────────────── */
  window.acGelistirme      = ac;             /* heroes.js Geliştir düğmesi  */
  window.kapatGelistirme   = kapat;
  window.kahramanSeviyesi  = seviye;         /* index.html + kahramanlar.js */
  window.kahramanStatBonusu    = statBonusu;    /* pvp.js / rapor            */
  window.kahramanStatSatirlari = statSatirlari; /* heroes.js STAT sekmesi    */
  window.kahramanStatUygula    = statUygula;    /* pvp.js / pve.js           */
  window.kahramanNadirlik  = nadirlik;
  window.kahramanParcasi   = parcaSayisi;
  window.parcaEkle         = parcaEkleAnahtar;     /* havuza yazar */
  window.parcaCantayaEkle  = parcaCantayaEkle;     /* çantaya yazar (ödüller) */
  window.parcaGorseli      = parcaGorseli;   /* günlük giriş / rehber kutucukları */
  /* Çerçeveli parça kutucuğu — mağaza, günlük giriş ve geliştirme
     penceresi bunu kullanır. Çerçeve kuralı başka yerde yazılmaz. */
  window.PARCA = {
    gorsel:   function (anahtar) { return PARCA_GORSEL[anahtar] || ""; },
    cerceve:  function (anahtar) { const r = RENK[parcaNadirligi(anahtar)] || RENK.mor; return r.arka; },
    nadirlik: parcaNadirligi,
    kutu:     parcaKutusu
  };
  window.parcaPaketiKullan = parcaPaketiKullan; /* günlük giriş / mağaza / canavar */
  window.glsYildizTazele   = glsYildizTazele;
  window.kahramanKapasitesi = kapasite;      /* heroes.js STAT sekmesi   */
  /* ── TECRÜBE KAPILARI ────────────────────────────────────────
     `kahramanTecrubeSeviyesi(id)` KENDİ hesabımızı okur.
     `expSeviyesi(exp)` saf hesaptır — başka oyuncunun verisi için
     (sıralama ekranı) bu kullanılır.                              */
  window.kahramanTecrubeSeviyesi = tecrubeSeviyesi;
  window.kahramanTecrubeDurumu   = tecrubeDurumu;
  window.expSeviyesi             = expSeviyesi;
  window.kahramanGucu            = kahramanGucu;
  window.GELISTIR_MAX_TSV        = MAX_TSV;
  window.GELISTIR_KITAP_EXP      = KITAP_EXP;
  window.savasKapasitesi    = savasKapasitesi; /* troops.js birlik seçici */
  window.kullanilanYer      = kullanilanYer;
  window.birimYeri          = birimYeri;
  window.TABAN_KAPASITE     = TABAN_KAPASITE;
  window.GELISTIR_MAX_SV   = MAX_SV;
})();


/* ═══════════════════════════════════════════════════════════════
   YILDIZ SEVİYE ATLAMA EFEKTİ

   Kapı:  YILDIZ_EFEKTI.oynat(id, eskiSv, yeniSv) → true / false
          false dönerse çağıran eski toast yolunu kullanır.

   · Yıldız sayısı, kadraj ve zamanlama SEVİYEDEN türer. Elle sayı yok.
   · Stat adı ve formülü burada YAZILMAZ; kahramanStatSatirlari(id, sv)
     eski ve yeni seviye için iki kez okunur, yalnız DEĞİŞENLER çizilir.
     Kapasite listede yoktur — o tecrübe seviyesine bağlı.
   · Tüm hareket rAF ile. @keyframes yok: prefers-reduced-motion
     cihazda CSS animasyonunu öldürüyor.
   · THREE bu dosyadan SONRA yükleniyor, bu yüzden sahne ilk oynatışta
     kurulur, dosya yüklenirken değil.
   ═══════════════════════════════════════════════════════════════ */
window.YILDIZ_EFEKTI = (function () {

  const MAX_SV_EF = 5;
  const FOV = 34, UCUS_SURE = 1040;
  const OLCEK = 0.82, YENI_OLCEK = OLCEK * 1.55;

  let kuruldu = false, calisiyor = false;
  let katman, akisTuval, actx, cv, ren, sah, kam, grup, yer, kutu, flas, adEl, statKap;
  let GEO = null, ENV = null, halka = null, halkaMat = null;
  let ARALIK = 2.35, GORUS_GENISLIK = 10.2, GORUS_YUKSEK = 10, BASLANGIC_Y = -10;
  let yildizlar = [], YENI = null, satir = [];
  let AG = 0, AY = 0;
  let T = {}, STAT_AR = [], SON = 3400, t0 = 0, oncekiZaman = 0;
  let gosterilen = 3, yeniSira = 3;
  const SERIT = [];

  /* ── Biçim ──────────────────────────────────────────────────── */
  function stilKur() {
    if (document.getElementById("yeStil")) return;
    const st = document.createElement("style");
    st.id = "yeStil";                       /* benzersiz — tema.js kuralı */
    st.textContent =
      "#yeKatman{position:fixed;left:0;top:0;width:100%;height:100%;" +
        "z-index:2147482500;display:none}" +
      "#yeAkis,#yeSahne{position:absolute;left:0;top:0;display:block}" +
      "#yeSahne{pointer-events:none}" +
      "#yeZemin{position:absolute;left:0;top:0;width:100%;height:100%;" +
        "background:radial-gradient(circle at 50% 40%,#2a1c10 0%,#0d0803 78%)}" +
      "#yePerde{position:absolute;left:0;top:0;width:100%;height:100%;display:flex;" +
        "align-items:center;justify-content:center;pointer-events:none}" +
      "#yeFlas{position:absolute;left:0;top:0;width:100%;height:100%;" +
        "background:#fff6dc;opacity:0;pointer-events:none}" +
      "#yeKutu{width:min(92vw,420px);text-align:center;opacity:0;" +
        "font-family:'Baloo 2',system-ui,sans-serif}" +
      "#yeBaslik{font-weight:800;font-size:13px;letter-spacing:2.4px;color:#e8c88a;margin-bottom:4px}" +
      "#yeAd{font-weight:800;font-size:31px;line-height:1.1;margin-bottom:10px;" +
        "background:linear-gradient(180deg,#ffffff 0%,#ffdc9a 100%);" +
        "-webkit-background-clip:text;background-clip:text;color:transparent;" +
        "filter:drop-shadow(0 2px 6px rgba(40,18,0,.75))}" +
      "#yeYer{height:150px}" +
      "#yeStatlar{margin-top:12px;display:flex;flex-direction:column;gap:9px;align-items:center}" +
      "#yeStatlar .ye-s{display:grid;grid-template-columns:1fr 78px 22px 78px;align-items:center;" +
        "gap:6px;width:min(82vw,336px);opacity:0}" +
      "#yeStatlar .ye-ad{text-align:left;font-weight:600;font-size:15px;color:#d8c3a4;" +
        "text-shadow:0 1px 2px rgba(30,14,0,.7)}" +
      "#yeStatlar .ye-eski{font-weight:700;font-size:19px;color:#fff;" +
        "font-variant-numeric:tabular-nums;text-shadow:0 1px 3px rgba(30,14,0,.8)}" +
      "#yeStatlar .ye-ok{font-weight:700;font-size:17px;color:#a08765}" +
      "#yeStatlar .ye-yeni{font-weight:800;font-size:21px;font-variant-numeric:tabular-nums;" +
        "background:linear-gradient(180deg,#b6ffc6 0%,#2fd968 100%);" +
        "-webkit-background-clip:text;background-clip:text;color:transparent;" +
        "filter:drop-shadow(0 1px 4px rgba(0,45,15,.85))}";
    document.head.appendChild(st);
  }

  function dugumKur() {
    katman = document.createElement("div");
    katman.id = "yeKatman";
    katman.innerHTML =
      '<div id="yeZemin"></div><canvas id="yeAkis"></canvas><canvas id="yeSahne"></canvas>' +
      '<div id="yePerde"><div id="yeKutu">' +
        '<div id="yeBaslik">SEVİYE ATLADI</div><div id="yeAd"></div>' +
        '<div id="yeYer"></div><div id="yeStatlar"></div>' +
      '</div></div><div id="yeFlas"></div>';
    document.body.appendChild(katman);

    akisTuval = katman.querySelector("#yeAkis");
    actx      = akisTuval.getContext("2d");
    cv        = katman.querySelector("#yeSahne");
    yer       = katman.querySelector("#yeYer");
    kutu      = katman.querySelector("#yeKutu");
    flas      = katman.querySelector("#yeFlas");
    adEl      = katman.querySelector("#yeAd");
    statKap   = katman.querySelector("#yeStatlar");

    /* Dokununca atlanır. Oyuncu bu ekranı yüzlerce kez görecek. */
    katman.addEventListener("pointerdown", bitir);
  }

  /* ── Ölçü: tek kaynak documentElement ────────────────────────
     innerHeight uygulama içi tarayıcıda şişik geliyor,
     getBoundingClientRect ise tuvalin kendi ölçüsünü verdiği için
     geri besleme döngüsü kuruyor. */
  function ekranOlcu() {
    const d = document.documentElement;
    return { g: Math.max(1, d.clientWidth), y: Math.max(1, d.clientHeight) };
  }

  function akisOlcule() {
    const o = Math.min(devicePixelRatio, 2), e = ekranOlcu();
    AG = e.g; AY = e.y;
    akisTuval.style.width = AG + "px"; akisTuval.style.height = AY + "px";
    akisTuval.width = AG * o; akisTuval.height = AY * o;
    actx.setTransform(o, 0, 0, o, 0, 0);
  }

  function seritKur() {
    SERIT.length = 0;
    const adet = AG < 420 ? 46 : 64;
    for (let i = 0; i < adet; i++) {
      SERIT.push({ x: Math.random(), y: Math.random() * 1.4,
                   boy: 0.10 + Math.random() * 0.30, kal: 1.2 + Math.random() * 4.6,
                   hiz: 0.30 + Math.random() * 0.95, sic: Math.random() });
    }
  }

  function akisCiz(guc, dt) {
    actx.clearRect(0, 0, AG, AY);
    if (guc <= 0.002) return;
    actx.globalCompositeOperation = "lighter";
    for (let i = 0; i < SERIT.length; i++) {
      const s = SERIT[i];
      s.y -= s.hiz * dt * (0.35 + guc * 1.15);
      if (s.y + s.boy < 0) { s.y = 1 + Math.random() * 0.35; s.x = Math.random(); }
      const px = s.x * AG, py = s.y * AY, pb = s.boy * AY;
      const g = actx.createLinearGradient(0, py, 0, py + pb);
      const renk = "rgba(255," + Math.round(205 + s.sic * 50) + "," +
                   Math.round(150 + s.sic * 105) + ",";
      const yog = (0.30 * guc).toFixed(3);
      g.addColorStop(0, renk + "0)");
      g.addColorStop(0.42, renk + yog + ")");
      g.addColorStop(0.62, renk + yog + ")");
      g.addColorStop(1, renk + "0)");
      actx.strokeStyle = g; actx.lineWidth = s.kal; actx.lineCap = "round";
      actx.beginPath(); actx.moveTo(px, py); actx.lineTo(px, py + pb); actx.stroke();
    }
    actx.globalCompositeOperation = "source-over";
  }

  /* ── Ortam yansıması: altın hissini veren şey ışık değil bu ── */
  function ortamDoku() {
    const c = document.createElement("canvas"); c.width = 16; c.height = 128;
    const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0.00, "#ffffff"); g.addColorStop(0.32, "#fff0c8");
    g.addColorStop(0.52, "#c08f3e"); g.addColorStop(0.74, "#3a2a16");
    g.addColorStop(1.00, "#0d0803");
    x.fillStyle = g; x.fillRect(0, 0, 16, 128);
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
  }

  /* İlk uç TEPEDE (+PI/2). Eksi olursa yıldız baş aşağı durur. */
  function yildizGeo() {
    const dis = 1.0, ic = 0.455, uc = 5, sh = new THREE.Shape();
    for (let i = 0; i < uc * 2; i++) {
      const r = (i % 2 === 0) ? dis : ic;
      const a = (Math.PI / uc) * i + Math.PI / 2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) sh.moveTo(px, py); else sh.lineTo(px, py);
    }
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: 0.18, bevelEnabled: true, bevelThickness: 0.17,
      bevelSize: 0.125, bevelSegments: 4, curveSegments: 2
    });
    g.center();
    return g;
  }

  function malzeme() {
    return new THREE.MeshStandardMaterial({
      color: 0xffc233, metalness: 1.0, roughness: 0.23,
      envMap: ENV, envMapIntensity: 1.7,
      emissive: 0x4a2600, emissiveIntensity: 0.38
    });
  }

  function sahneKur() {
    ren = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
    ren.setPixelRatio(Math.min(devicePixelRatio, 2));
    sah = new THREE.Scene();
    kam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
    grup = new THREE.Group(); sah.add(grup);

    ENV = ortamDoku();
    GEO = yildizGeo();

    sah.add(new THREE.AmbientLight(0xd8c0a0, 0.55));
    const ana = new THREE.DirectionalLight(0xffffff, 2.0);
    ana.position.set(2.4, 3.2, 6.0); sah.add(ana);
    const ark = new THREE.DirectionalLight(0xffb44d, 1.5);
    ark.position.set(-3, -1.4, -2.6); sah.add(ark);
    sah.add(new THREE.HemisphereLight(0xfff0d0, 0x1a0f04, 0.9));

    halkaMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true,
                 opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    halka = new THREE.Mesh(new THREE.RingGeometry(0.60, 0.80, 52), halkaMat);
    halka.position.set(0, 0, -0.5);
    grup.add(halka);
  }

  /* Kadraj yıldız sayısından: en dıştaki kenara değmesin. */
  function kadrajKur() {
    ARALIK = (gosterilen >= 5) ? 2.15 : 2.35;
    GORUS_GENISLIK = 2 * (((gosterilen - 1) / 2) * ARALIK + YENI_OLCEK) + 1.2;
  }

  function olcule() {
    const e = ekranOlcu(), g = e.g, y = e.y;
    cv.style.width = g + "px"; cv.style.height = y + "px";
    ren.setSize(g, y, false);
    kam.aspect = g / y;
    const yari = Math.tan(FOV * Math.PI / 360);
    kam.position.set(0, 0, GORUS_GENISLIK / (2 * yari * kam.aspect));
    kam.updateProjectionMatrix();

    GORUS_YUKSEK = GORUS_GENISLIK / kam.aspect;
    const bpp = GORUS_YUKSEK / y;
    const r = yer.getBoundingClientRect();
    grup.position.y = (y / 2 - (r.top + r.height / 2)) * bpp;
    BASLANGIC_Y = -GORUS_YUKSEK / 2 - grup.position.y - 1.6;
  }

  function siraKur() {
    yildizlar.forEach(function (m) { grup.remove(m); m.material.dispose(); });
    yildizlar = [];
    kadrajKur();
    for (let i = 0; i < gosterilen; i++) {
      const m = new THREE.Mesh(GEO, malzeme());
      m.position.x = (i - (gosterilen - 1) / 2) * ARALIK;
      m.userData.temelX = m.position.x;
      m.userData.yeni = (i === yeniSira - 1);
      m.userData.girisAr = [340 + i * 160, 600 + i * 160];
      m.scale.setScalar(0.0001);
      grup.add(m);
      yildizlar.push(m);
    }
    YENI = yildizlar[yeniSira - 1];
    halka.position.x = YENI.userData.temelX;
    zamanKur(Math.max(1060, (600 + (gosterilen - 2) * 160) + 140));
  }

  function zamanKur(bas) {
    const ob = bas + UCUS_SURE;
    T = { akisAc: [0, 620], ad: [160, 520], ucus: [bas, ob],
          otur: [ob, ob + 300], sarsinti: [ob, ob + 580],
          flas: [ob - 5, ob + 320], halka: [ob + 5, ob + 600],
          akisKis: [ob + 300, ob + 1180] };
    STAT_AR = [];
    const sb = ob + 460;
    for (let i = 0; i < satir.length; i++) STAT_AR.push([sb + i * 90, sb + i * 90 + 250]);
    SON = Math.max(ob + 1240, sb + satir.length * 90 + 360);
  }

  /* ── Statlar: adı ve formülü burada yazılmaz, kapıdan okunur ── */
  function degisenStatlar(id, eskiSv, yeniSv) {
    if (typeof window.kahramanStatSatirlari !== "function") return [];
    const a = window.kahramanStatSatirlari(id, eskiSv) || [];
    const b = window.kahramanStatSatirlari(id, yeniSv) || [];
    const eskiHarita = {};
    a.forEach(function (r) { eskiHarita[r.anahtar] = r.yuzde; });
    return b.filter(function (r) {
        return typeof eskiHarita[r.anahtar] === "number" && eskiHarita[r.anahtar] !== r.yuzde;
      }).map(function (r) {
        return { ad: r.ad, eski: eskiHarita[r.anahtar], yeni: r.yuzde };
      });
  }

  function statlariCiz(liste) {
    statKap.innerHTML = "";
    liste.forEach(function (d) {
      const el = document.createElement("div");
      el.className = "ye-s";
      el.innerHTML = '<span class="ye-ad"></span><span class="ye-eski"></span>' +
                     '<span class="ye-ok">&#8594;</span><span class="ye-yeni"></span>';
      el.querySelector(".ye-ad").textContent   = d.ad;
      el.querySelector(".ye-eski").textContent = "+%" + d.eski;
      el.querySelector(".ye-yeni").textContent = "+%" + d.yeni;
      statKap.appendChild(el);
    });
    satir = [].slice.call(statKap.querySelectorAll(".ye-s"));
    satir.forEach(function (s) { s.style.opacity = 0; });
  }

  /* ── Eğriler ────────────────────────────────────────────────── */
  const yumusa = function (t) { return 1 - Math.pow(1 - t, 3); };
  const suzul  = function (t) { return 1 - Math.pow(1 - t, 2.1); };
  const geriSicra = function (t) { const c = 2.6;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const dinSicra  = function (t) { const c = 1.5;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  function aralik(now, ar) {
    if (!ar) return 0;
    if (now <= ar[0]) return 0;
    if (now >= ar[1]) return 1;
    return (now - ar[0]) / (ar[1] - ar[0]);
  }

  function bitir() {
    if (!calisiyor) return;
    calisiyor = false;
    katman.style.display = "none";
    if (actx) actx.clearRect(0, 0, AG, AY);
  }

  function kare(zaman) {
    if (!calisiyor) return;
    if (!t0) { t0 = zaman; oncekiZaman = zaman; }
    const n = zaman - t0;
    const dt = Math.min((zaman - oncekiZaman) / 1000, 0.05);
    oncekiZaman = zaman;

    const guc = yumusa(aralik(n, T.akisAc)) * (1 - yumusa(aralik(n, T.akisKis)) * 0.72);
    akisCiz(guc, dt);

    const a = yumusa(aralik(n, T.ad));

    yildizlar.forEach(function (m) {
      if (m.userData.yeni) return;
      const gv = aralik(n, m.userData.girisAr);
      if (gv <= 0) { m.scale.setScalar(0.0001); }
      else if (gv < 1) {
        m.scale.setScalar(OLCEK * dinSicra(gv));
        m.position.y = Math.sin(gv * Math.PI) * 0.11;
        m.rotation.y = (1 - gv) * 0.7;
      } else { m.scale.setScalar(OLCEK); m.rotation.y = 0; m.position.y = 0; }
    });

    const u = aralik(n, T.ucus);
    if (u > 0 && u < 1) {
      const e = suzul(u);
      YENI.position.y = BASLANGIC_Y * (1 - e);
      YENI.scale.setScalar(0.10 + e * (YENI_OLCEK * 1.28 - 0.10));
      YENI.rotation.y = (1 - u) * Math.PI * 9.0;
      YENI.rotation.z = (1 - u) * 0.30;
    }

    const o = aralik(n, T.otur);
    if (o > 0) {
      const e = geriSicra(o);
      YENI.position.y = 0;
      YENI.rotation.y = (1 - o) * 0.22;
      YENI.rotation.z = 0;
      YENI.scale.setScalar(YENI_OLCEK * 1.28 + (YENI_OLCEK - YENI_OLCEK * 1.28) * e);
    }

    const s = aralik(n, T.sarsinti);
    let kutuSars = 0;
    if (s > 0 && s < 1) {
      const sonme = Math.pow(1 - s, 1.7);
      kutuSars = Math.sin(s * 27) * 10.5 * sonme;
      yildizlar.forEach(function (m, i) {
        if (m === YENI) return;
        const mesafe = Math.abs(i - (yeniSira - 1));
        const kat = 1 / mesafe;
        const gec = Math.max(0, s - (mesafe - 1) * 0.09);
        m.position.y = Math.sin(gec * 24) * -0.20 * sonme * kat;
        m.position.x = m.userData.temelX + Math.sin(gec * 19) * -0.12 * sonme * kat;
        m.rotation.z = Math.sin(gec * 22) * -0.12 * sonme * kat;
      });
    } else if (s >= 1) {
      yildizlar.forEach(function (m) {
        if (m !== YENI) { m.position.y = 0; m.position.x = m.userData.temelX; m.rotation.z = 0; }
      });
    }

    kutu.style.opacity = a.toFixed(3);
    kutu.style.transform = "translateY(" + ((1 - a) * 16 + kutuSars).toFixed(2) + "px)";

    const f = aralik(n, T.flas);
    flas.style.opacity = (f > 0 && f < 1) ? (Math.pow(1 - f, 3) * 0.55).toFixed(3) : 0;

    const h = aralik(n, T.halka);
    if (h > 0 && h < 1) {
      const e = yumusa(h);
      halka.scale.setScalar(0.30 + e * 3.6);
      halkaMat.opacity = (1 - e) * 0.85;
    } else { halkaMat.opacity = 0; }

    STAT_AR.forEach(function (ar, i) {
      const v = yumusa(aralik(n, ar));
      satir[i].style.opacity = v.toFixed(3);
      satir[i].style.transform = "translateY(" + ((1 - v) * 10).toFixed(2) + "px)";
    });

    ren.render(sah, kam);
    if (n < SON) requestAnimationFrame(kare); else bitir();
  }

  function oynat(id, eskiSv, yeniSv) {
    if (typeof THREE === "undefined") return false;   /* sessiz yedek yol yok */
    if (calisiyor) return false;

    yeniSv = Math.max(1, Math.min(MAX_SV_EF, Number(yeniSv) || 0));
    eskiSv = Math.max(1, Math.min(MAX_SV_EF, Number(eskiSv) || (yeniSv - 1)));
    if (yeniSv <= eskiSv) return false;

    try {
      if (!kuruldu) { stilKur(); dugumKur(); sahneKur(); kuruldu = true; }

      adEl.textContent = (window.KAHRAMAN && KAHRAMAN.ad) ? KAHRAMAN.ad(id) : String(id);
      statlariCiz(degisenStatlar(id, eskiSv, yeniSv));

      gosterilen = yeniSv; yeniSira = yeniSv;
      katman.style.display = "block";
      akisOlcule(); seritKur();
      siraKur();
      olcule();

      yildizlar.forEach(function (m) {
        m.scale.setScalar(0.0001); m.position.y = 0;
        m.position.x = m.userData.temelX; m.rotation.z = 0;
      });
      YENI.position.y = BASLANGIC_Y;
      kutu.style.opacity = 0;
      flas.style.opacity = 0;

      calisiyor = true; t0 = 0;
      requestAnimationFrame(kare);
      return true;
    } catch (e) {
      calisiyor = false;
      if (katman) katman.style.display = "none";
      return false;
    }
  }

  addEventListener("resize", function () {
    if (!calisiyor) return;
    akisOlcule(); seritKur(); olcule();
  });

  return { oynat: oynat, kapat: bitir };
})();
