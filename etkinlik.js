/* etkinlik.js — ETKİNLİKLER: TAKVİM + GÖREV + COİN + KUTU
   ═══════════════════════════════════════════════════════════════
   NE VAR
   1) Kale içindeyken sağ üstte "Etkinlikler" düğmesi (#etkIkon).
      Görünürlük saf CSS: `body.kaleici-acik`. JS ile aç/kapa yok.
   2) Takvim PENCERESİ (#etkEkran): UTC saati, Pzt…Paz şeridi,
      ızgara üstünde etkinlik çubuğu.
   3) Çubuğa basınca GÖREV PENCERESİ (#etkGorev):
        · yenilenmeye kalan süre (her gün 00:00 UTC)
        · 4 toplama görevi → her biri COİN verir
        · coin rayı üstünde 5 kutu; eşiği geçince açılır
      Günde 5 kutu = 5 eşik; ertesi gün hepsi sıfırlanır.

   GÖRÜNÜM KURALI
   İkisi de EKRANI KAPLAMAZ; oyunun diğer panelleri gibi ortada
   duran karttır (en fazla 360px, yüksekliği içeriğe göre).
   Renkler tema.js'in --km değişkenlerinden gelir — burada yeni
   bir tema tanımlanmaz, açık zemin YOKTUR.

   ÜÇ AYAR NOKTASI — hepsi dosyanın başında:
     GOREVLER  → hedefler ve görev başına coin
     KUTULAR   → eşik (kaç coin) ve o kutunun ödülleri
     ETKINLIKLER → takvimdeki gün aralığı (1=Pzt … 7=Paz, UTC)

   ÖDÜLLER KUTULAR tablosunda; türler ve gittikleri yer:
     elmas  → state.diamonds
     esya   → state.inventory[ad]  (ad, magaza.js'teki `name` ile
              BİREBİR aynı olmalı)
     parca  → state.heroShards.mor (gelistir.js'in ortak havuzu)
     kaynak → state.kaynaklar[k]
   Simgeler GORSEL tablosundaki .webp dosyalarından gelir.

   İLERLEME NEREDEN SAYILIYOR
   Yalnız haritadan TOPLAMA seferiyle kaleye giren yük. sefer.js
   `seferiBitir` içinde, yük depoya yazıldığı anda haber verilir
   (`ETKINLIK.toplamaBildir`). Üretim ve ganimet sayılmaz.

   KAYIT
   `state.etkinlik` içinde, hesabın kendi kaydında; sunucu yok.
   DİKKAT: index.html'de `const state = ...` — window.state boştur,
   çıplak `state` ile okunur.

   HAREKET
   Web Animations; CSS keyframe/transition yok.
   ═══════════════════════════════════════════════════════════════ */
(function etkinlikMenusu() {
  "use strict";

  var SURUM = "etkinlik-3";

  /* ── 1) TAKVİM TANIMI ─────────────────────────────────────── */
  var ETKINLIKLER = [
    {
      id: "hosgeldin",
      ad: "Hoşgeldin Etkinliği",
      ikon: "🎉",
      renk1: "#f2b52a",
      renk2: "#d98f12",
      basGun: 1,
      bitGun: 7,
      aciklama: "Yeni gelen komutanlar için karşılama etkinliği. " +
                "Görevler her gün 00:00 UTC'de yenilenir."
    }
  ];

  /* ── 2) GÖREVLER ──────────────────────────────────────────── */
  var GOREVLER = [
    { id: "odun",   kaynak: "odun",   hedef: 50000, coin: 40, ad: "50.000 odun topla" },
    { id: "su",     kaynak: "su",     hedef: 50000, coin: 40, ad: "50.000 su topla" },
    { id: "enerji", kaynak: "enerji", hedef: 25000, coin: 40, ad: "25.000 enerji topla" },
    { id: "et",     kaynak: "et",     hedef: 25000, coin: 40, ad: "25.000 et topla" }
  ];

  /* ── 3) KUTULAR — eşik + ödüller ──────────────────────────
     Ödül satırı dört türden biri:
       { tur:"elmas",  miktar:300 }
       { tur:"esya",   ad:"5 Dakika Hızlandırma", adet:5 }
       { tur:"parca",  adet:1 }                → state.heroShards.mor
       { tur:"kaynak", kaynak:"odun", miktar:5000 }
     Görseller GORSEL tablosundan; dosya açılmazsa emojiye döner. */
  var KUTULAR = [
    { esik: 20,  oduller: [ { tur: "elmas", miktar: 300 },
                            { tur: "esya", ad: "5 Dakika Hızlandırma", adet: 5 } ] },
    { esik: 40,  oduller: [ { tur: "elmas", miktar: 600 },
                            { tur: "esya", ad: "5 Dakika Hızlandırma", adet: 10 } ] },
    { esik: 80,  oduller: [ { tur: "elmas", miktar: 900 },
                            { tur: "esya", ad: "5 Dakika Hızlandırma", adet: 20 } ] },
    { esik: 120, oduller: [ { tur: "elmas", miktar: 1500 },
                            { tur: "esya", ad: "5 Dakika Hızlandırma", adet: 20 },
                            { tur: "parca", adet: 1 } ] },
    { esik: 160, oduller: [ { tur: "elmas", miktar: 1500 },
                            { tur: "esya", ad: "5 Dakika Hızlandırma", adet: 20 },
                            { tur: "parca", adet: 2 } ] }
  ];

  /* Ödül görselleri — adlar oyunun kendi dosyalarından:
     elmas.webp (index.html HUD), 5dkhiz.webp (magaza.js),
     morparca.webp (gelistir.js). */
  var GORSEL = {
    elmas: "elmas.webp",
    parca: "morparca.webp",
    esya: { "5 Dakika Hızlandırma": "5dkhiz.webp",
            "1 Saat Hızlandırma":   "1shiz.webp",
            "3 Saat Hızlandırma":   "3shiz.webp" }
  };

  var GUN_KISA = ["Pzt", "Sal", "Çrş", "Prş", "Cum", "Cts", "Paz"];
  var HAYALET_MS = 350;
  var KUTU_KAPALI = "gunlukkutukapali.webp";
  var KUTU_ACIK   = "gunlukkutuacik.webp";

  var ekran = null, gorevEkran = null, saatEl = null;
  var saatSayac = 0, gorevSayac = 0;
  var acik = false, gorevAcik = false;

  /* ═══ TARİH (hepsi UTC) ═══ */
  function haftaBasi(simdi) {
    var g = simdi.getUTCDay();
    var kaydir = (g === 0 ? 6 : g - 1);
    return Date.UTC(simdi.getUTCFullYear(), simdi.getUTCMonth(), simdi.getUTCDate() - kaydir);
  }
  function gunTarihi(bas, i) { return new Date(bas + i * 86400000); }
  function ikiHane(n) { return (n < 10 ? "0" : "") + n; }
  function tarihKisa(d) { return ikiHane(d.getUTCMonth() + 1) + "/" + ikiHane(d.getUTCDate()); }
  function tarihUzun(d) {
    return d.getUTCFullYear() + "-" + ikiHane(d.getUTCMonth() + 1) + "-" + ikiHane(d.getUTCDate());
  }
  function saatYazisi(d) {
    return "UTC " + tarihUzun(d) + " " + ikiHane(d.getUTCHours()) + ":" +
           ikiHane(d.getUTCMinutes()) + ":" + ikiHane(d.getUTCSeconds());
  }
  function bugunIndeks(simdi) { var g = simdi.getUTCDay(); return g === 0 ? 6 : g - 1; }
  function yenilenmeyeKalan() {
    var n = new Date();
    var ertesi = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1);
    var s = Math.floor(Math.max(0, ertesi - n.getTime()) / 1000);
    return ikiHane(Math.floor(s / 3600)) + ":" + ikiHane(Math.floor(s / 60) % 60) + ":" + ikiHane(s % 60);
  }
  function sayiYaz(n) { return Math.round(n || 0).toLocaleString("tr-TR"); }

  /* ═══ DURUM ═══
     index.html'de `const state` — window.state boş kalır, çıplak
     ada bakılır (sefer.js de böyle yapıyor). */
  function oyunDurumu() { return (typeof state !== "undefined") ? state : null; }

  function durum() {
    var s = oyunDurumu();
    if (!s) return null;
    var bugun = tarihUzun(new Date());
    if (!s.etkinlik || s.etkinlik.gun !== bugun) {
      s.etkinlik = { gun: bugun, toplanan: {}, alinan: {}, coin: 0, kutular: {} };
    }
    if (!s.etkinlik.toplanan) s.etkinlik.toplanan = {};
    if (!s.etkinlik.alinan)   s.etkinlik.alinan   = {};
    if (!s.etkinlik.kutular)  s.etkinlik.kutular  = {};
    if (typeof s.etkinlik.coin !== "number") s.etkinlik.coin = 0;
    return s.etkinlik;
  }

  function kaydet() {
    if (typeof persistCurrentState === "function") {
      try { persistCurrentState(); } catch (e) {}
    }
  }

  /* sefer.js buraya haber verir: toplama yükü depoya girdi. */
  function toplamaBildir(yuk) {
    var d = durum();
    if (!d || !yuk) return;
    var degisti = false;
    Object.keys(yuk).forEach(function (k) {
      var m = Math.max(0, Math.round(yuk[k] || 0));
      if (m <= 0) return;
      d.toplanan[k] = (d.toplanan[k] || 0) + m;
      degisti = true;
    });
    if (!degisti) return;
    kaydet();
    if (gorevAcik) gorevCiz();
  }

  /* ═══ STİL ═══
     Renkler tema.js'in --km değişkenlerinden. ID'li seçiciler,
     sonradan eklenen kurallar ezemesin diye. */
  function stilBas() {
    if (document.getElementById("etkinlikStil")) return;
    var st = document.createElement("style");
    st.id = "etkinlikStil";
    st.textContent = [
      /* ── Kale içi ikonu ── */
      "#etkIkon{position:fixed; right:10px; top:84px; z-index:45; display:none;",
      "  flex-direction:column; align-items:center; gap:2px;",
      "  background:none; border:none; padding:0; cursor:pointer;",
      "  font-family:'Baloo 2','Nunito',sans-serif;}",
      "body.kaleici-acik #etkIkon{display:flex;}",
      "#etkIkon .etk-i-kutu{width:44px; height:44px; display:flex; align-items:center; justify-content:center;",
      "  font-size:23px; border-radius:13px;",
      "  background:linear-gradient(180deg,#f7fbff,#cfe4f7);",
      "  border:1px solid var(--km-kenar); box-shadow:0 2px 6px rgba(0,20,45,.3);}",
      "#etkIkon .etk-i-yazi{font-weight:700; font-size:11px; color:#e8f4ff;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#etkIkon:active{transform:scale(.96); filter:brightness(.93);}",

      /* ── Pencere kabı: ekranı KAPLAMAZ, ortada kart ── */
      "#etkEkran,#etkGorev{position:fixed; inset:0; display:none;",
      "  align-items:center; justify-content:center; padding:16px;",
      "  background:rgba(2,10,26,.55);",
      "  font-family:'Baloo 2','Nunito',sans-serif;}",
      "#etkEkran{z-index:970;} #etkGorev{z-index:972;}",
      "#etkEkran.acik,#etkGorev.acik{display:flex;}",
      "#etkEkran .etk-kart,#etkGorev .etk-kart{width:100%; max-width:360px;",
      "  max-height:82vh; display:flex; flex-direction:column; overflow:hidden;",
      "  border-radius:20px; border:1px solid var(--km-kenar);",
      "  background:linear-gradient(180deg,var(--km-1) 0%,var(--km-2) 52%,var(--km-3) 100%);",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3);}",
      "#etkEkran .etk-baslik,#etkGorev .etk-baslik{display:flex; align-items:center; gap:8px;",
      "  padding:11px 12px 9px; border-bottom:1px solid rgba(160,215,255,.22);",
      "  color:#f2fbff; font-size:16px; font-weight:800;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#etkEkran .etk-baslik span,#etkGorev .etk-baslik span{flex:1; min-width:0;}",
      "#etkEkran .etk-kapat,#etkGorev .etk-kapat{background:none; border:none; color:#dceaf8;",
      "  font-size:18px; line-height:1; padding:2px 4px; cursor:pointer;}",
      "#etkEkran .etk-kapat:active,#etkGorev .etk-kapat:active{transform:scale(.96); filter:brightness(.93);}",
      "#etkEkran .etk-govde,#etkGorev .etk-govde{flex:1; overflow-y:auto; padding:10px 12px 14px;}",
      "#etkEkran .etk-ust,#etkGorev .etk-ust{padding:6px 12px; color:#cfe4f7;",
      "  font-size:12px; font-weight:700; font-variant-numeric:tabular-nums;",
      "  border-bottom:1px solid rgba(160,215,255,.16);}",

      /* ── Takvim ── */
      "#etkEkran .etk-gunler{display:grid; grid-template-columns:repeat(7,1fr); gap:3px; margin-bottom:8px;}",
      "#etkEkran .etk-gun{border-radius:8px; padding:4px 0; text-align:center;",
      "  background:rgba(255,255,255,.10); color:#eaf4ff;",
      "  font-size:10.5px; font-weight:700; line-height:1.2; font-variant-numeric:tabular-nums;}",
      "#etkEkran .etk-gun.bugun{background:linear-gradient(180deg,#f7c948,#e09b12); color:#23180a;}",
      "#etkEkran .etk-gun small{display:block; font-size:10px; opacity:.85;}",
      "#etkEkran .etk-izgara{position:relative; border-radius:10px; overflow:hidden;",
      "  background:rgba(255,255,255,.06); border:1px solid rgba(160,215,255,.18);}",
      "#etkEkran .etk-sutunlar{position:absolute; inset:0; display:grid;",
      "  grid-template-columns:repeat(7,1fr); pointer-events:none;}",
      "#etkEkran .etk-sutun{border-right:1px solid rgba(160,215,255,.12);}",
      "#etkEkran .etk-sutun:last-child{border-right:none;}",
      "#etkEkran .etk-sutun.bugun{background:rgba(247,201,72,.14);}",
      "#etkEkran .etk-satirlar{position:relative; display:grid; gap:7px; padding:8px 0;",
      "  grid-template-columns:repeat(7,1fr);}",
      "#etkEkran .etk-cubuk{display:flex; align-items:center; justify-content:center; gap:5px;",
      "  min-height:32px; border-radius:8px; padding:0 6px; cursor:pointer;",
      "  color:#2a1c05; font-size:12.5px; font-weight:800;}",
      "#etkEkran .etk-cubuk:active{transform:scale(.96); filter:brightness(.93);}",
      "#etkEkran .etk-dip{color:#a9c6e0; font-size:10.5px; font-weight:700;",
      "  text-align:center; padding:9px 4px 0;}",

      /* ── Kutu rayı: tek sıra, sıkı ── */
      "#etkGorev .etk-kutular{display:grid; grid-template-columns:repeat(5,1fr); gap:2px;",
      "  align-items:end;}",
      "#etkGorev .etk-kutu{display:flex; flex-direction:column; align-items:center; gap:1px;",
      "  background:none; border:none; padding:0; cursor:pointer; font-family:inherit;}",
      "#etkGorev .etk-kutu img{width:34px; height:34px; object-fit:contain; display:block;}",
      "#etkGorev .etk-kutu.kilitli img{filter:brightness(.62) saturate(.68);}",
      "#etkGorev .etk-kutu .etk-k-esik{color:#cfe4f7; font-size:11px; font-weight:700;",
      "  font-variant-numeric:tabular-nums;}",
      "#etkGorev .etk-kutu.acilabilir .etk-k-esik{color:#ffe07a;}",
      "#etkGorev .etk-kutu.acilmis .etk-k-esik{color:#8ce07f;}",
      "#etkGorev .etk-kutu:active{transform:scale(.96); filter:brightness(.93);}",
      "#etkGorev .etk-ray{position:relative; height:9px; border-radius:999px; margin:5px 2px 0;",
      "  background:rgba(255,255,255,.16); overflow:hidden;}",
      "#etkGorev .etk-ray i{position:absolute; left:0; top:0; bottom:0; width:0;",
      "  background:linear-gradient(180deg,#f7c948,#e09b12);}",
      "#etkGorev .etk-coin{color:#ffe07a; font-size:12.5px; font-weight:800; text-align:center;",
      "  padding:6px 0 10px; font-variant-numeric:tabular-nums;}",

      /* ── Görev satırı: tek satır, şerit yok ── */
      "#etkGorev .etk-satir{display:flex; align-items:center; gap:9px;",
      "  border-radius:11px; padding:8px 9px; margin-bottom:7px;",
      "  background:rgba(255,255,255,.09); border:1px solid rgba(160,215,255,.18);}",
      "#etkGorev .etk-s-sol{flex:1; min-width:0;}",
      "#etkGorev .etk-s-ad{color:#f2fbff; font-size:13px; font-weight:700; line-height:1.25;}",
      "#etkGorev .etk-s-ad em{font-style:normal; color:#a9c6e0; font-variant-numeric:tabular-nums;}",
      "#etkGorev .etk-s-odul{color:#ffe07a; font-size:11.5px; font-weight:700; margin-top:2px;",
      "  font-variant-numeric:tabular-nums;}",
      "#etkGorev .etk-s-btn{flex:0 0 auto; min-width:72px; padding:7px 10px; border:none;",
      "  border-radius:9px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;",
      "  background:linear-gradient(180deg,#8ce07f,#3ba648); color:#0e3315;}",
      "#etkGorev .etk-s-btn:active{transform:scale(.96); filter:brightness(.93);}",
      "#etkGorev .etk-s-btn[disabled]{background:rgba(255,255,255,.14); color:#8fa9c2; cursor:default;}",
      "#etkGorev .etk-g-uyari{color:#ffd0d0; font-size:12.5px; font-weight:700;",
      "  text-align:center; padding:16px 8px;}",

      /* ── Ödül penceresi ── */
      "#etkPop{position:fixed; inset:0; z-index:978; display:none;",
      "  align-items:center; justify-content:center; padding:18px;",
      "  background:rgba(2,10,26,.72); font-family:'Baloo 2','Nunito',sans-serif;}",
      "#etkPop.acik{display:flex;}",
      "#etkPop .etk-p-kutu{width:100%; max-width:300px; border-radius:18px; padding:16px 14px;",
      "  border:1px solid var(--km-kenar); color:#eaf4ff;",
      "  background:linear-gradient(180deg,var(--km-1) 0%,var(--km-2) 52%,var(--km-3) 100%);",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3);}",
      "#etkPop .etk-p-ad{font-size:16px; font-weight:800; text-align:center;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#etkPop .etk-p-alt{font-size:11.5px; font-weight:700; text-align:center; margin-top:3px;",
      "  color:#f7c948; font-variant-numeric:tabular-nums;}",
      "#etkPop .etk-p-liste{margin:10px 0 2px;}",
      "#etkPop .etk-p-oge{display:flex; align-items:center; gap:8px; padding:6px 2px;",
      "  border-bottom:1px solid rgba(160,215,255,.16); font-size:13px; font-weight:700;}",
      "#etkPop .etk-p-oge:last-child{border-bottom:none;}",
      "#etkPop .etk-p-oge .etk-p-gor{width:34px; height:34px; object-fit:contain;",
      "  flex:0 0 34px; display:block; border-radius:8px;",
      "  background:rgba(255,255,255,.10); padding:2px;}",
      "#etkPop .etk-p-oge .etk-p-em{width:34px; flex:0 0 34px; text-align:center; font-size:20px;}",
      "#etkPop .etk-p-oge .etk-p-ad2{flex:1; min-width:0;}",
      "#etkPop .etk-p-oge b{margin-left:auto; font-variant-numeric:tabular-nums;}",
      "#etkPop .etk-p-btn{display:block; width:100%; margin-top:12px; padding:9px; border:none;",
      "  border-radius:11px; background:linear-gradient(180deg,#f7c948,#e09b12); color:#23180a;",
      "  font-family:inherit; font-size:14px; font-weight:800; cursor:pointer;}",
      "#etkPop .etk-p-btn:active{transform:scale(.96); filter:brightness(.93);}"
    ].join("\n");
    document.head.appendChild(st);
  }

  /* ═══ İSKELET ═══ */
  function iskelet() {
    if (document.getElementById("etkEkran")) return;

    var btn = document.createElement("button");
    btn.id = "etkIkon";
    btn.type = "button";
    btn.innerHTML = '<span class="etk-i-kutu">📋</span><span class="etk-i-yazi">Etkinlikler</span>';
    btn.addEventListener("click", ac);
    document.body.appendChild(btn);

    ekran = document.createElement("div");
    ekran.id = "etkEkran";
    ekran.innerHTML =
      '<div class="etk-kart">' +
        '<div class="etk-baslik"><span>🗓️ Etkinlikler</span>' +
        '<button class="etk-kapat" type="button" id="etkKapat">✕</button></div>' +
        '<div class="etk-ust" id="etkSaat"></div>' +
        '<div class="etk-govde">' +
          '<div class="etk-gunler" id="etkGunler"></div>' +
          '<div class="etk-izgara">' +
            '<div class="etk-sutunlar" id="etkSutunlar"></div>' +
            '<div class="etk-satirlar" id="etkSatirlar"></div>' +
          '</div>' +
          '<div class="etk-dip">Saatler UTC. Görevler her gün 00:00\'da yenilenir.</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ekran);
    ekran.querySelector("#etkKapat").addEventListener("click", kapat);
    ekran.addEventListener("click", function (e) { if (e.target === ekran) kapat(); });
    saatEl = ekran.querySelector("#etkSaat");

    gorevEkran = document.createElement("div");
    gorevEkran.id = "etkGorev";
    gorevEkran.innerHTML =
      '<div class="etk-kart">' +
        '<div class="etk-baslik"><span id="etkGAd">Etkinlik</span>' +
        '<button class="etk-kapat" type="button" id="etkGKapat">✕</button></div>' +
        '<div class="etk-ust">Yenilenme: <b id="etkGSayac">--:--:--</b></div>' +
        '<div class="etk-govde" id="etkGAlan"></div>' +
      '</div>';
    document.body.appendChild(gorevEkran);
    gorevEkran.querySelector("#etkGKapat").addEventListener("click", gorevKapat);
    gorevEkran.addEventListener("click", function (e) { if (e.target === gorevEkran) gorevKapat(); });

    var pop = document.createElement("div");
    pop.id = "etkPop";
    pop.innerHTML = '<div class="etk-p-kutu" id="etkPopKutu"></div>';
    document.body.appendChild(pop);
    pop.addEventListener("click", function (e) { if (e.target === pop) popKapat(); });
  }

  /* ═══ TAKVİM ÇİZİMİ ═══ */
  function ciz() {
    var simdi = new Date();
    var bas = haftaBasi(simdi);
    var bugun = bugunIndeks(simdi);

    var gunler = ekran.querySelector("#etkGunler");
    var sutunlar = ekran.querySelector("#etkSutunlar");
    var satirlar = ekran.querySelector("#etkSatirlar");
    gunler.innerHTML = ""; sutunlar.innerHTML = ""; satirlar.innerHTML = "";

    for (var i = 0; i < 7; i++) {
      var d = gunTarihi(bas, i);
      var g = document.createElement("div");
      g.className = "etk-gun" + (i === bugun ? " bugun" : "");
      g.innerHTML = GUN_KISA[i] + "<small>" + tarihKisa(d) + "</small>";
      gunler.appendChild(g);

      var s = document.createElement("div");
      s.className = "etk-sutun" + (i === bugun ? " bugun" : "");
      sutunlar.appendChild(s);
    }

    ETKINLIKLER.forEach(function (e, sira) {
      var cubuk = document.createElement("div");
      cubuk.className = "etk-cubuk";
      cubuk.style.gridColumn = e.basGun + " / " + (e.bitGun + 1);
      cubuk.style.background = "linear-gradient(180deg," + e.renk1 + "," + e.renk2 + ")";
      cubuk.innerHTML = '<span class="etk-c-ikon"></span><span class="etk-c-ad"></span>';
      cubuk.querySelector(".etk-c-ikon").textContent = e.ikon;
      cubuk.querySelector(".etk-c-ad").textContent = e.ad;
      cubuk.addEventListener("click", function () { gorevAc(e); });
      satirlar.appendChild(cubuk);

      if (cubuk.animate) {
        cubuk.animate(
          [{ opacity: 0, transform: "translateX(-12px)" }, { opacity: 1, transform: "translateX(0)" }],
          { duration: 300, delay: 80 + sira * 60, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }
        );
      }
    });
  }

  function saatiYaz() { if (saatEl) saatEl.textContent = saatYazisi(new Date()); }

  /* ═══ GÖREV PENCERESİ ═══ */
  function gorevAc(e) {
    iskelet();
    gorevEkran.querySelector("#etkGAd").textContent = e.ikon + " " + e.ad;
    gorevCiz();
    gorevEkran.classList.add("acik");
    gorevAcik = true;
    gorevEkran.style.pointerEvents = "none";
    setTimeout(function () { if (gorevEkran) gorevEkran.style.pointerEvents = ""; }, HAYALET_MS);
    var kart = gorevEkran.querySelector(".etk-kart");
    if (kart && kart.animate) {
      kart.animate(
        [{ opacity: 0, transform: "translateY(14px) scale(.96)" },
         { opacity: 1, transform: "translateY(0) scale(1)" }],
        { duration: 260, easing: "cubic-bezier(.16,1,.3,1)" }
      );
    }
    clearInterval(gorevSayac);
    gorevSayac = setInterval(function () {
      var el = gorevEkran.querySelector("#etkGSayac");
      if (el) el.textContent = yenilenmeyeKalan();
      var d = durum();
      if (d && d.gun !== tarihUzun(new Date())) gorevCiz();
    }, 1000);
    var sayacEl = gorevEkran.querySelector("#etkGSayac");
    if (sayacEl) sayacEl.textContent = yenilenmeyeKalan();
  }

  function gorevKapat() {
    if (!gorevAcik) return;
    gorevAcik = false;
    clearInterval(gorevSayac);
    popKapat();
    gorevEkran.classList.remove("acik");
  }

  function gorevCiz() {
    var alan = gorevEkran.querySelector("#etkGAlan");
    if (!alan) return;
    var d = durum();
    if (!d) {
      alan.innerHTML = '<div class="etk-g-uyari">Oyun verisi henüz yüklenmedi. ' +
                       'Kaleye girip tekrar dene.</div>';
      return;
    }
    alan.innerHTML = "";

    /* ── Kutular: tek sıra, altında dolan ray ── */
    var enBuyuk = KUTULAR[KUTULAR.length - 1].esik || 1;
    var kutular = document.createElement("div");
    kutular.className = "etk-kutular";
    KUTULAR.forEach(function (k, i) {
      var acildi = !!d.kutular[i];
      var acilabilir = !acildi && d.coin >= k.esik;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "etk-kutu " + (acildi ? "acilmis" : (acilabilir ? "acilabilir" : "kilitli"));
      b.innerHTML = '<img alt=""><span class="etk-k-esik"></span>';
      b.querySelector("img").src = acildi ? KUTU_ACIK : KUTU_KAPALI;
      b.querySelector(".etk-k-esik").textContent = k.esik;
      b.addEventListener("click", function () { kutuyaBas(i); });
      kutular.appendChild(b);

      if (acilabilir && b.animate) {
        b.animate(
          [{ transform: "translateY(0)" }, { transform: "translateY(-3px)" },
           { transform: "translateY(0)" }],
          { duration: 1500, iterations: Infinity, easing: "ease-in-out" }
        );
      }
    });
    alan.appendChild(kutular);

    var ray = document.createElement("div");
    ray.className = "etk-ray";
    ray.innerHTML = "<i></i>";
    alan.appendChild(ray);
    ray.querySelector("i").style.width =
      (Math.max(0, Math.min(1, d.coin / enBuyuk)) * 100) + "%";

    var coinEl = document.createElement("div");
    coinEl.className = "etk-coin";
    coinEl.textContent = "🪙 " + sayiYaz(d.coin) + " / " + sayiYaz(enBuyuk) + " coin";
    alan.appendChild(coinEl);

    /* ── Görev satırları: tek satır, ilerleme başlıkta ── */
    GOREVLER.forEach(function (g) {
      var simdiki = Math.min(d.toplanan[g.kaynak] || 0, g.hedef);
      var tamam = simdiki >= g.hedef;
      var alindi = !!d.alinan[g.id];

      var satir = document.createElement("div");
      satir.className = "etk-satir";
      satir.innerHTML =
        '<div class="etk-s-sol">' +
          '<div class="etk-s-ad"></div>' +
          '<div class="etk-s-odul"></div>' +
        '</div>' +
        '<button class="etk-s-btn" type="button"></button>';

      var ad = satir.querySelector(".etk-s-ad");
      ad.textContent = g.ad + " ";
      var em = document.createElement("em");
      em.textContent = "(" + sayiYaz(simdiki) + " / " + sayiYaz(g.hedef) + ")";
      ad.appendChild(em);
      satir.querySelector(".etk-s-odul").textContent = "🪙 " + g.coin + " coin";

      var btn = satir.querySelector(".etk-s-btn");
      btn.textContent = alindi ? "Alındı" : "Topla";
      btn.disabled = alindi || !tamam;
      if (!alindi && tamam) {
        btn.addEventListener("click", function () { gorevTopla(g); });
      }
      alan.appendChild(satir);
    });
  }

  function gorevTopla(g) {
    var d = durum();
    if (!d || d.alinan[g.id]) return;
    if ((d.toplanan[g.kaynak] || 0) < g.hedef) return;
    d.alinan[g.id] = true;
    d.coin = (d.coin || 0) + g.coin;
    kaydet();
    gorevCiz();
    if (typeof showToast === "function") {
      try { showToast("🪙 +" + g.coin + " coin"); } catch (e) {}
    }
  }

  /* ═══ KUTU ═══ */
  function odulYazisi(o) {
    if (o.tur === "elmas") {
      return { ikon: "💎", gorsel: GORSEL.elmas, ad: "Elmas", adet: o.miktar };
    }
    if (o.tur === "parca") {
      return { ikon: "🟣", gorsel: GORSEL.parca, ad: "Mor Parça", adet: o.adet };
    }
    if (o.tur === "kaynak") {
      var bilgi = (window.DUGUM && window.DUGUM.KAYNAK && window.DUGUM.KAYNAK[o.kaynak]) || null;
      return { ikon: (bilgi && bilgi.ikon) || "📦", gorsel: bilgi && bilgi.gorsel,
               ad: (bilgi && bilgi.ad) || o.kaynak, adet: o.miktar };
    }
    return { ikon: "⏩", gorsel: GORSEL.esya[o.ad] || null, ad: o.ad, adet: o.adet };
  }

  /* Görsel varsa <img>, dosya açılmazsa emojiye döner (dugum.js'in
     kaynakSimge'siyle aynı yol — ekran boş kalmaz). */
  function odulSimge(y) {
    if (!y.gorsel) {
      var em = document.createElement("span");
      em.className = "etk-p-em";
      em.textContent = y.ikon;
      return em;
    }
    var im = document.createElement("img");
    im.className = "etk-p-gor";
    im.src = y.gorsel;
    im.alt = "";
    im.onerror = function () {
      im.onerror = null;
      var s2 = document.createElement("span");
      s2.className = "etk-p-em";
      s2.textContent = y.ikon;
      im.replaceWith(s2);
    };
    return im;
  }

  function kutuyaBas(i) {
    var d = durum();
    if (!d) return;
    var k = KUTULAR[i];
    var acildi = !!d.kutular[i];
    if (!acildi && d.coin >= k.esik) { kutuAc(i); return; }
    popListe(
      acildi ? "Kutu açıldı" : k.esik + " coin kutusu",
      acildi ? "Bu kutunun ödülleri alındı." : "Açmak için " + k.esik + " coin gerekir.",
      k.oduller
    );
  }

  function kutuAc(i) {
    var d = durum();
    var k = KUTULAR[i];
    if (!d || d.kutular[i] || d.coin < k.esik) return;
    d.kutular[i] = true;

    var s = oyunDurumu();
    if (!s) return;
    if (!s.kaynaklar) s.kaynaklar = {};
    if (!s.inventory) s.inventory = {};

    k.oduller.forEach(function (o) {
      if (o.tur === "elmas") {
        s.diamonds = (s.diamonds || 0) + Math.max(0, Math.round(o.miktar || 0));
      } else if (o.tur === "kaynak") {
        s.kaynaklar[o.kaynak] = (s.kaynaklar[o.kaynak] || 0) + Math.max(0, Math.round(o.miktar || 0));
      } else if (o.tur === "esya") {
        s.inventory[o.ad] = (s.inventory[o.ad] || 0) + Math.max(0, Math.round(o.adet || 0));
      } else if (o.tur === "parca") {
        /* Mor parça ORTAK havuzda: gelistir.js state.heroShards.mor
           okuyor, başka bir anahtar yok. */
        if (!s.heroShards || typeof s.heroShards !== "object") s.heroShards = {};
        s.heroShards.mor = (s.heroShards.mor || 0) + Math.max(0, Math.round(o.adet || 0));
      }
    });

    if (typeof renderDiamonds === "function")  { try { renderDiamonds(); } catch (e) {} }
    if (typeof renderKaynaklar === "function") { try { renderKaynaklar(); } catch (e) {} }
    if (typeof renderInventory === "function") { try { renderInventory(); } catch (e) {} }
    kaydet();

    gorevCiz();
    popListe("🎁 Kutu açıldı!", "Ödüller hesabına eklendi.", k.oduller);
  }

  /* ═══ ÖDÜL PENCERESİ ═══ */
  function popListe(baslik, altYazi, oduller) {
    var pop = document.getElementById("etkPop");
    if (!pop) return;
    var kutu = pop.querySelector("#etkPopKutu");
    kutu.innerHTML = '<div class="etk-p-ad"></div><div class="etk-p-alt"></div>' +
                     '<div class="etk-p-liste"></div>' +
                     '<button class="etk-p-btn" type="button">Tamam</button>';
    kutu.querySelector(".etk-p-ad").textContent = baslik;
    kutu.querySelector(".etk-p-alt").textContent = altYazi;

    var liste = kutu.querySelector(".etk-p-liste");
    oduller.forEach(function (o) {
      var y = odulYazisi(o);
      var satir = document.createElement("div");
      satir.className = "etk-p-oge";
      satir.innerHTML = '<span class="etk-p-ad2"></span><b></b>';
      satir.insertBefore(odulSimge(y), satir.firstChild);
      satir.querySelector(".etk-p-ad2").textContent = y.ad;
      satir.querySelector("b").textContent = "x" + sayiYaz(y.adet);
      liste.appendChild(satir);
    });

    kutu.querySelector(".etk-p-btn").addEventListener("click", popKapat);
    pop.classList.add("acik");
    if (kutu.animate) {
      kutu.animate(
        [{ opacity: 0, transform: "translateY(12px) scale(.96)" },
         { opacity: 1, transform: "translateY(0) scale(1)" }],
        { duration: 240, easing: "cubic-bezier(.16,1,.3,1)" }
      );
    }
  }

  function popKapat() {
    var pop = document.getElementById("etkPop");
    if (pop) pop.classList.remove("acik");
  }

  /* ═══ TAKVİM AÇ / KAPAT ═══ */
  function ac() {
    iskelet();
    if (acik) return;
    ciz();
    saatiYaz();
    ekran.classList.add("acik");
    acik = true;
    ekran.style.pointerEvents = "none";
    setTimeout(function () { if (ekran) ekran.style.pointerEvents = ""; }, HAYALET_MS);
    var kart = ekran.querySelector(".etk-kart");
    if (kart && kart.animate) {
      kart.animate(
        [{ opacity: 0, transform: "translateY(14px) scale(.96)" },
         { opacity: 1, transform: "translateY(0) scale(1)" }],
        { duration: 260, easing: "cubic-bezier(.16,1,.3,1)" }
      );
    }
    clearInterval(saatSayac);
    saatSayac = setInterval(saatiYaz, 1000);
  }

  function kapat() {
    if (!acik) return;
    acik = false;
    clearInterval(saatSayac);
    gorevKapat();
    ekran.classList.remove("acik");
  }

  /* ═══ BAŞLAT ═══ */
  function baslat() { stilBas(); iskelet(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", baslat);
  } else {
    baslat();
  }

  window.ETKINLIK = {
    SURUM: SURUM,
    ac: ac, kapat: kapat,
    liste: ETKINLIKLER,
    gorevler: GOREVLER,
    kutular: KUTULAR,
    toplamaBildir: toplamaBildir,
    tani: function () {
      var simdi = new Date();
      var bas = haftaBasi(simdi);
      var d = durum();
      return {
        surum: SURUM,
        utc: saatYazisi(simdi),
        yenilenmeye: yenilenmeyeKalan(),
        haftaBasi: tarihUzun(new Date(bas)),
        durumVar: !!d,
        gun: d ? d.gun : null,
        coin: d ? d.coin : null,
        toplanan: d ? d.toplanan : null,
        alinan: d ? Object.keys(d.alinan) : null,
        acilanKutular: d ? Object.keys(d.kutular) : null
      };
    }
  };
})();
