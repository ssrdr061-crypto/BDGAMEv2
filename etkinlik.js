/* etkinlik.js — ETKİNLİKLER: TAKVİM + GÖREV + COİN + KUTU
   ═══════════════════════════════════════════════════════════════
   NE VAR
   1) Kale içindeyken sağ üstte "Etkinlikler" düğmesi (#etkIkon).
      Görünürlük saf CSS: `body.kaleici-acik`. JS ile aç/kapa yok.
   2) Haftalık takvim ekranı (#etkEkran): canlı UTC saati,
      Pzt…Paz gün şeridi, ızgara üstünde etkinlik çubuğu.
   3) Çubuğa basınca GÖREV EKRANI (#etkGorev):
        · yenilenmeye kalan süre (her gün 00:00 UTC)
        · 4 toplama görevi → her biri COİN verir
        · coin çubuğu üstünde 5 kutu; eşiği geçince açılır
      Günde 5 kutu = 5 eşik; ertesi gün hepsi sıfırlanır.

   ÜÇ AYAR NOKTASI — hepsi dosyanın başında, başka yerde yok:
     GOREVLER  → hedefler ve görev başına coin
     KUTULAR   → eşik (kaç coin) ve o kutunun ödülleri
     ETKINLIKLER → takvimdeki gün aralığı (1=Pzt … 7=Paz, UTC)

   ÖDÜL TABLOSU GEÇİCİDİR. Aşağıdaki miktarlar örnektir, senin
   yazacağın değerlerle değiştirilecek. Ödül satırı üç türden biri:
     { tur:"elmas",  miktar:50 }
     { tur:"kaynak", kaynak:"odun", miktar:5000 }   (odun/et/demir/su/enerji)
     { tur:"esya",   ad:"5 Dakika Hızlandırma", adet:2 }
   Eşya adı magaza.js'teki `name` ile BİREBİR aynı olmalı; çanta
   eşyayı adına göre saklıyor (state.inventory[ad]).

   İLERLEME NEREDEN SAYILIYOR
   Yalnız haritadan TOPLAMA seferiyle kaleye giren yük. sefer.js
   `seferiBitir` içinde, yük depoya yazıldığı anda buraya haber
   veriyor (`ETKINLIK.toplamaBildir`). Üretim, ganimet ve hediye
   sayılmaz — sayacın tek kapısı orası.

   KAYIT
   Sayaçlar `state.etkinlik` içinde, hesabın kendi kaydında durur;
   persistCurrentState() ile yazılır. Sunucu gerekmez.

   HAREKET
   Web Animations; CSS keyframe/transition yok.
   ═══════════════════════════════════════════════════════════════ */
(function etkinlikMenusu() {
  "use strict";

  var SURUM = "etkinlik-2";

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

  /* ── 2) GÖREVLER — hedef ve coin ──────────────────────────── */
  var GOREVLER = [
    { id: "odun",   kaynak: "odun",   hedef: 50000, coin: 40, ad: "50.000 odun topla" },
    { id: "su",     kaynak: "su",     hedef: 50000, coin: 40, ad: "50.000 su topla" },
    { id: "enerji", kaynak: "enerji", hedef: 25000, coin: 40, ad: "25.000 enerji topla" },
    { id: "et",     kaynak: "et",     hedef: 25000, coin: 40, ad: "25.000 et topla" }
  ];

  /* ── 3) KUTULAR — eşik + ödüller (MİKTARLAR GEÇİCİ) ───────── */
  var KUTULAR = [
    { esik: 20,  oduller: [ { tur: "kaynak", kaynak: "et",   miktar: 3000 },
                            { tur: "elmas",  miktar: 10 } ] },
    { esik: 40,  oduller: [ { tur: "kaynak", kaynak: "odun", miktar: 5000 },
                            { tur: "esya",   ad: "5 Dakika Hızlandırma", adet: 2 } ] },
    { esik: 80,  oduller: [ { tur: "kaynak", kaynak: "su",   miktar: 8000 },
                            { tur: "elmas",  miktar: 25 } ] },
    { esik: 120, oduller: [ { tur: "esya",   ad: "1 Saat Hızlandırma", adet: 1 },
                            { tur: "kaynak", kaynak: "demir", miktar: 4000 } ] },
    { esik: 160, oduller: [ { tur: "elmas",  miktar: 60 },
                            { tur: "esya",   ad: "3 Saat Hızlandırma", adet: 1 },
                            { tur: "kaynak", kaynak: "enerji", miktar: 6000 } ] }
  ];

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
    return "UTC Saati " + tarihUzun(d) + " " + ikiHane(d.getUTCHours()) + ":" +
           ikiHane(d.getUTCMinutes()) + ":" + ikiHane(d.getUTCSeconds());
  }
  function bugunIndeks(simdi) { var g = simdi.getUTCDay(); return g === 0 ? 6 : g - 1; }
  /* Bir sonraki 00:00 UTC'ye kalan süre */
  function yenilenmeyeKalan() {
    var n = new Date();
    var ertesi = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1);
    var ms = Math.max(0, ertesi - n.getTime());
    var s = Math.floor(ms / 1000);
    return ikiHane(Math.floor(s / 3600)) + ":" + ikiHane(Math.floor(s / 60) % 60) + ":" + ikiHane(s % 60);
  }
  function sayiYaz(n) { return Math.round(n || 0).toLocaleString("tr-TR"); }

  /* ═══ DURUM ═══
     state.etkinlik = { gun, toplanan:{}, alinan:{}, coin, kutular:{} }
     Gün değişince sayaçlar sıfırlanır. */
  /* index.html'de `const state = defaultState();` diye tanımlı.
     const global NESNEYE yazılmaz — window.state HER ZAMAN undefined.
     sefer.js gibi çıplak `state` üzerinden okunur. */
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

  /* sefer.js buraya haber verir: toplama seferi yükü depoya girdi. */
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

  /* ═══ STİL ═══ */
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
      "#etkIkon .etk-i-kutu{width:46px; height:46px; display:flex; align-items:center; justify-content:center;",
      "  font-size:24px; border-radius:13px;",
      "  background:linear-gradient(180deg,#f7fbff,#cfe4f7);",
      "  border:1px solid var(--km-kenar); box-shadow:0 2px 6px rgba(0,20,45,.3);}",
      "#etkIkon .etk-i-yazi{font-weight:700; font-size:11px; color:#e8f4ff;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#etkIkon:active{transform:scale(.96); filter:brightness(.93);}",

      /* ── Ortak tam ekran ── */
      "#etkEkran,#etkGorev{position:fixed; inset:0; display:none; flex-direction:column;",
      "  font-family:'Baloo 2','Nunito',sans-serif;",
      "  background:linear-gradient(180deg,var(--km-2) 0%,var(--km-3) 100%);}",
      "#etkEkran{z-index:970;} #etkGorev{z-index:972;}",
      "#etkEkran.acik,#etkGorev.acik{display:flex;}",
      "#etkEkran .etk-baslik,#etkGorev .etk-baslik{display:flex; align-items:center; gap:10px;",
      "  padding:calc(env(safe-area-inset-top,0) + 10px) 12px 10px;",
      "  background:linear-gradient(180deg,var(--km-1),var(--km-2));",
      "  color:#f2fbff; font-size:19px; font-weight:800;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#etkEkran .etk-geri,#etkGorev .etk-geri{background:none; border:none; color:#f2fbff;",
      "  font-size:24px; line-height:1; padding:2px 6px; cursor:pointer;}",
      "#etkEkran .etk-geri:active,#etkGorev .etk-geri:active{transform:scale(.96); filter:brightness(.93);}",
      "#etkEkran .etk-saat{padding:7px 10px; text-align:center; color:#eaf4ff;",
      "  font-size:14px; font-weight:800; font-variant-numeric:tabular-nums;",
      "  background:rgba(255,255,255,.10); border-bottom:1px solid rgba(160,215,255,.25);}",

      /* ── Gün şeridi ── */
      "#etkEkran .etk-gunler{display:grid; grid-template-columns:repeat(7,1fr); gap:4px; padding:8px 8px 6px;}",
      "#etkEkran .etk-gun{border-radius:10px; padding:5px 0; text-align:center;",
      "  background:rgba(255,255,255,.12); color:#eaf4ff;",
      "  font-size:11.5px; font-weight:800; line-height:1.25; font-variant-numeric:tabular-nums;}",
      "#etkEkran .etk-gun.bugun{background:linear-gradient(180deg,#f7c948,#e09b12); color:#23180a;}",
      "#etkEkran .etk-gun small{display:block; font-size:11px; opacity:.85; font-weight:700;}",

      /* ── Takvim ızgarası ── */
      "#etkEkran .etk-alan{flex:1; overflow-y:auto; padding:0 8px 16px;}",
      "#etkEkran .etk-etiket{color:#cfe4f7; font-size:12px; font-weight:800; padding:4px 2px 6px;}",
      "#etkEkran .etk-izgara{position:relative; border-radius:12px; overflow:hidden;",
      "  background:rgba(255,255,255,.07); border:1px solid rgba(160,215,255,.22);}",
      "#etkEkran .etk-sutunlar{position:absolute; inset:0; display:grid;",
      "  grid-template-columns:repeat(7,1fr); pointer-events:none;}",
      "#etkEkran .etk-sutun{border-right:1px solid rgba(160,215,255,.14);}",
      "#etkEkran .etk-sutun:last-child{border-right:none;}",
      "#etkEkran .etk-sutun.bugun{background:rgba(247,201,72,.16);}",
      "#etkEkran .etk-satirlar{position:relative; display:grid; gap:10px; padding:12px 0;",
      "  grid-template-columns:repeat(7,1fr);}",
      "#etkEkran .etk-cubuk{display:flex; align-items:center; justify-content:center; gap:7px;",
      "  min-height:38px; border-radius:9px; padding:0 8px; cursor:pointer;",
      "  color:#2a1c05; font-size:13.5px; font-weight:800;",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3);}",
      "#etkEkran .etk-cubuk:active{transform:scale(.96); filter:brightness(.93);}",
      "#etkEkran .etk-cubuk .etk-c-ikon{font-size:17px;}",
      "#etkEkran .etk-dip{color:#bcd6ef; font-size:11.5px; font-weight:700; text-align:center; padding:12px 6px 0;}",

      /* ── GÖREV EKRANI ──────────────────────────────────────
         Takvim koyu, görev ekranı AÇIK zemin: referanstaki gibi
         beyaz-mavi kart üstünde okunur yazı. Ölçüler tek ailede:
         başlık 14.5, yardımcı 12, rakamlar tabular. */
      "#etkGorev{background:linear-gradient(180deg,#e6f1fb 0%,#c3dcf1 100%) !important;}",
      "#etkGorev .etk-g-yenile{display:flex; align-items:center; gap:6px;",
      "  padding:8px 12px; background:#bcd8ee;",
      "  border-bottom:1px solid rgba(30,70,120,.18);}",
      "#etkGorev .etk-g-yenile .etk-y-pil{display:inline-flex; align-items:center; gap:6px;",
      "  padding:4px 11px; border-radius:999px;",
      "  background:linear-gradient(180deg,#4d95d8,#2f6fb4);",
      "  color:#f2fbff; font-size:12.5px; font-weight:700;",
      "  font-variant-numeric:tabular-nums;}",
      "#etkGorev .etk-g-alan{flex:1; overflow-y:auto; padding:14px 12px 22px;}",

      /* ── Kutu yolu ── */
      "#etkGorev .etk-yol{position:relative; display:grid; grid-template-columns:repeat(5,1fr);",
      "  grid-template-rows:auto 22px auto; align-items:center;",
      "  padding:6px 4px 4px; margin-bottom:14px;}",
      "#etkGorev .etk-kutu{display:flex; flex-direction:column; align-items:center; gap:1px;",
      "  background:none; border:none; padding:0; cursor:pointer; font-family:inherit;}",
      "#etkGorev .etk-kutu img{width:42px; height:42px; object-fit:contain; display:block;}",
      "#etkGorev .etk-kutu.kilitli img{filter:brightness(.72) saturate(.65);}",
      "#etkGorev .etk-kutu .etk-k-esik{color:#1d3f6e; font-size:12px; font-weight:700;",
      "  font-variant-numeric:tabular-nums;}",
      "#etkGorev .etk-kutu .etk-k-ok{color:#7ea6cd; font-size:9px; line-height:1;}",
      "#etkGorev .etk-kutu.acilabilir .etk-k-esik{color:#b8730a;}",
      "#etkGorev .etk-kutu.acilmis .etk-k-esik{color:#2fa563;}",
      "#etkGorev .etk-kutu:active{transform:scale(.96); filter:brightness(.93);}",
      "#etkGorev .etk-ray{grid-column:1 / -1; grid-row:2; position:relative;",
      "  height:13px; border-radius:999px; background:#a9c6e0;",
      "  box-shadow:inset 0 1px 2px rgba(20,50,90,.28);}",
      "#etkGorev .etk-ray i{position:absolute; left:0; top:0; bottom:0; width:0;",
      "  border-radius:999px; background:linear-gradient(180deg,#f7c948,#e09b12);}",
      "#etkGorev .etk-coin-pil{display:flex; align-items:center; justify-content:center; gap:6px;",
      "  margin:0 auto 16px; padding:5px 14px; border-radius:999px; width:max-content;",
      "  background:linear-gradient(180deg,#ffffff,#dfecf8);",
      "  border:1px solid rgba(30,70,120,.18);",
      "  color:#1d3f6e; font-size:13.5px; font-weight:700;",
      "  font-variant-numeric:tabular-nums;}",

      /* ── Görev kartı ── */
      "#etkGorev .etk-satir{border-radius:14px; padding:11px 12px 12px; margin-bottom:10px;",
      "  background:linear-gradient(180deg,#ffffff,#e2eefa);",
      "  border:1px solid rgba(30,70,120,.14);",
      "  box-shadow:0 2px 6px rgba(0,20,45,.12);}",
      "#etkGorev .etk-s-ad{color:#1d3f6e; font-size:14.5px; font-weight:700; line-height:1.3;}",
      "#etkGorev .etk-s-ad em{font-style:normal; color:#5a7fa8; font-weight:700;",
      "  font-variant-numeric:tabular-nums;}",
      "#etkGorev .etk-s-alt{display:flex; align-items:center; gap:10px; margin-top:9px;}",
      "#etkGorev .etk-s-oduller{display:flex; gap:7px; flex:1; min-width:0;}",
      "#etkGorev .etk-oduc{position:relative; width:42px; height:42px; border-radius:10px;",
      "  display:flex; align-items:center; justify-content:center; font-size:20px;",
      "  background:linear-gradient(180deg,#f7fbff,#d9e7f5);",
      "  border:1px solid rgba(30,70,120,.16);}",
      "#etkGorev .etk-oduc b{position:absolute; right:2px; bottom:1px;",
      "  font-size:10.5px; font-weight:700; color:#1d3f6e;",
      "  text-shadow:0 1px 0 #fff; font-variant-numeric:tabular-nums;}",
      "#etkGorev .etk-s-btn{flex:0 0 auto; min-width:96px; padding:9px 14px; border:none;",
      "  border-radius:12px; font-family:inherit; font-size:14.5px; font-weight:700; cursor:pointer;",
      "  background:linear-gradient(180deg,#8ce07f,#3ba648); color:#0e3315;",
      "  box-shadow:0 2px 0 #2b7c35;}",
      "#etkGorev .etk-s-btn:active{transform:translateY(1px) scale(.99); filter:brightness(.95);",
      "  box-shadow:0 1px 0 #2b7c35;}",
      "#etkGorev .etk-s-btn[disabled]{background:linear-gradient(180deg,#dfe9f3,#c3d4e4);",
      "  color:#7d95ad; box-shadow:none; cursor:default;}",
      "#etkGorev .etk-s-bar{height:6px; border-radius:3px; margin-top:9px;",
      "  background:#c8d9e9; overflow:hidden;}",
      "#etkGorev .etk-s-bar i{display:block; height:100%; width:0;",
      "  background:linear-gradient(180deg,#8ce07f,#3ba648);}",
      "#etkGorev .etk-g-uyari{color:#9b2f2f; font-size:13px; font-weight:700; text-align:center; padding:20px 8px;}",

      /* ── Ortak açılır pencere ── */
      "#etkPop{position:fixed; inset:0; z-index:978; display:none;",
      "  align-items:center; justify-content:center; padding:18px;",
      "  background:rgba(2,10,26,.72); font-family:'Baloo 2','Nunito',sans-serif;}",
      "#etkPop.acik{display:flex;}",
      "#etkPop .etk-p-kutu{width:100%; max-width:330px; border-radius:20px; padding:18px 16px;",
      "  border:1px solid var(--km-kenar); color:#eaf4ff;",
      "  background:linear-gradient(180deg,var(--km-1) 0%,var(--km-2) 52%,var(--km-3) 100%);",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3);}",
      "#etkPop .etk-p-ad{font-size:19px; font-weight:800; text-align:center;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#etkPop .etk-p-alt{font-size:12.5px; font-weight:800; text-align:center; margin-top:4px;",
      "  color:#f7c948; font-variant-numeric:tabular-nums;}",
      "#etkPop .etk-p-metin{font-size:13.5px; font-weight:600; line-height:1.45; margin:12px 0 4px;}",
      "#etkPop .etk-p-liste{margin:12px 0 4px;}",
      "#etkPop .etk-p-oge{display:flex; align-items:center; gap:9px; padding:8px 2px;",
      "  border-bottom:1px solid rgba(160,215,255,.18); font-size:14px; font-weight:800;}",
      "#etkPop .etk-p-oge:last-child{border-bottom:none;}",
      "#etkPop .etk-p-oge span:first-child{font-size:18px;}",
      "#etkPop .etk-p-oge b{margin-left:auto; font-variant-numeric:tabular-nums;}",
      "#etkPop .etk-p-btn{display:block; width:100%; margin-top:14px; padding:10px; border:none; border-radius:12px;",
      "  background:linear-gradient(180deg,#f7c948,#e09b12); color:#23180a;",
      "  font-family:inherit; font-size:15px; font-weight:800; cursor:pointer;}",
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
      '<div class="etk-baslik"><button class="etk-geri" type="button" id="etkGeri">←</button>' +
      '<span>Etkinlikler</span></div>' +
      '<div class="etk-saat" id="etkSaat"></div>' +
      '<div class="etk-gunler" id="etkGunler"></div>' +
      '<div class="etk-alan">' +
        '<div class="etk-etiket">Etkinlikler</div>' +
        '<div class="etk-izgara">' +
          '<div class="etk-sutunlar" id="etkSutunlar"></div>' +
          '<div class="etk-satirlar" id="etkSatirlar"></div>' +
        '</div>' +
        '<div class="etk-dip">Saatler UTC\'dir. Görevler her gün 00:00 UTC\'de yenilenir.</div>' +
      '</div>';
    document.body.appendChild(ekran);
    ekran.querySelector("#etkGeri").addEventListener("click", kapat);
    saatEl = ekran.querySelector("#etkSaat");

    gorevEkran = document.createElement("div");
    gorevEkran.id = "etkGorev";
    gorevEkran.innerHTML =
      '<div class="etk-baslik"><button class="etk-geri" type="button" id="etkGGeri">←</button>' +
      '<span id="etkGAd">Etkinlik</span></div>' +
      '<div class="etk-g-yenile"><span class="etk-y-pil">🕗 Yenilenme: ' +
        '<b id="etkGSayac">--:--:--</b></span></div>' +
      '<div class="etk-g-alan" id="etkGAlan"></div>';
    document.body.appendChild(gorevEkran);
    gorevEkran.querySelector("#etkGGeri").addEventListener("click", gorevKapat);

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
          [{ opacity: 0, transform: "translateX(-14px)" }, { opacity: 1, transform: "translateX(0)" }],
          { duration: 320, delay: 90 + sira * 70, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }
        );
      }
    });
  }

  function saatiYaz() { if (saatEl) saatEl.textContent = saatYazisi(new Date()); }

  /* ═══ GÖREV EKRANI ═══ */
  function gorevAc(e) {
    iskelet();
    gorevEkran.querySelector("#etkGAd").textContent = e.ikon + " " + e.ad;
    gorevCiz();
    gorevEkran.classList.add("acik");
    gorevAcik = true;
    gorevEkran.style.pointerEvents = "none";
    setTimeout(function () { if (gorevEkran) gorevEkran.style.pointerEvents = ""; }, HAYALET_MS);
    if (gorevEkran.animate) {
      gorevEkran.animate(
        [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 280, easing: "cubic-bezier(.16,1,.3,1)" }
      );
    }
    clearInterval(gorevSayac);
    gorevSayac = setInterval(function () {
      var el = gorevEkran.querySelector("#etkGSayac");
      if (el) el.textContent = yenilenmeyeKalan();
      /* Gün döndüyse ekran kendini yeniler */
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
    function bitir() { if (!gorevAcik && gorevEkran) gorevEkran.classList.remove("acik"); }
    if (gorevEkran.animate) {
      var a = gorevEkran.animate(
        [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(16px)" }],
        { duration: 180, easing: "cubic-bezier(.4,0,.9,.3)" }
      );
      a.onfinish = bitir;
    } else bitir();
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

    /* ── KUTU YOLU ──
       Referanstaki gibi: kutular rayın bir üstünde bir altında,
       her biri kendi eşiğini gösterir. Izgara 5 sütun, 3 satır:
       üst kutular 1. satır, ray 2., alt kutular 3. satır. */
    var enBuyuk = KUTULAR[KUTULAR.length - 1].esik || 1;
    var yol = document.createElement("div");
    yol.className = "etk-yol";

    var ray = document.createElement("div");
    ray.className = "etk-ray";
    ray.innerHTML = "<i></i>";
    yol.appendChild(ray);

    KUTULAR.forEach(function (k, i) {
      var acildi = !!d.kutular[i];
      var acilabilir = !acildi && d.coin >= k.esik;
      var ust = (i % 2 === 0);

      var b = document.createElement("button");
      b.type = "button";
      b.className = "etk-kutu " + (ust ? "ust " : "alt ") +
                    (acildi ? "acilmis" : (acilabilir ? "acilabilir" : "kilitli"));
      b.style.gridColumn = (i + 1);
      b.style.gridRow = ust ? 1 : 3;
      b.innerHTML = ust
        ? '<img alt=""><span class="etk-k-esik"></span><span class="etk-k-ok">▼</span>'
        : '<span class="etk-k-ok">▲</span><img alt=""><span class="etk-k-esik"></span>';
      b.querySelector("img").src = acildi ? KUTU_ACIK : KUTU_KAPALI;
      b.querySelector(".etk-k-esik").textContent = k.esik;
      b.addEventListener("click", function () { kutuyaBas(i); });
      yol.appendChild(b);

      if (acilabilir && b.animate) {
        b.animate(
          [{ transform: "translateY(0)" }, { transform: "translateY(-4px)" },
           { transform: "translateY(0)" }],
          { duration: 1500, iterations: Infinity, easing: "ease-in-out" }
        );
      }
    });
    alan.appendChild(yol);

    var oran = Math.max(0, Math.min(1, d.coin / enBuyuk));
    ray.querySelector("i").style.width = (oran * 100) + "%";

    var coinPil = document.createElement("div");
    coinPil.className = "etk-coin-pil";
    coinPil.textContent = "🪙 " + sayiYaz(d.coin) + " / " + sayiYaz(enBuyuk) + " coin";
    alan.appendChild(coinPil);

    /* ── GÖREV KARTLARI ──
       İlerleme başlığın içinde (0 / 50.000) — referansta da öyle;
       ayrı satır yazınca kart iki katı uzuyordu. */
    GOREVLER.forEach(function (g) {
      var simdiki = Math.min(d.toplanan[g.kaynak] || 0, g.hedef);
      var tamam = simdiki >= g.hedef;
      var alindi = !!d.alinan[g.id];

      var satir = document.createElement("div");
      satir.className = "etk-satir";
      satir.innerHTML =
        '<div class="etk-s-ad"></div>' +
        '<div class="etk-s-alt">' +
          '<div class="etk-s-oduller">' +
            '<div class="etk-oduc">🪙<b></b></div>' +
          '</div>' +
          '<button class="etk-s-btn" type="button"></button>' +
        '</div>' +
        '<div class="etk-s-bar"><i></i></div>';

      var ad = satir.querySelector(".etk-s-ad");
      ad.textContent = g.ad + " ";
      var ilerleme = document.createElement("em");
      ilerleme.textContent = "(" + sayiYaz(simdiki) + " / " + sayiYaz(g.hedef) + ")";
      ad.appendChild(ilerleme);

      satir.querySelector(".etk-oduc b").textContent = g.coin;
      satir.querySelector(".etk-s-bar i").style.width =
        Math.min(100, (simdiki / g.hedef) * 100) + "%";

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
    var simdiki = d.toplanan[g.kaynak] || 0;
    if (simdiki < g.hedef) return;
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
    if (o.tur === "elmas")  return { ikon: "💎", ad: "Elmas", adet: o.miktar };
    if (o.tur === "kaynak") {
      var bilgi = (window.DUGUM && window.DUGUM.KAYNAK && window.DUGUM.KAYNAK[o.kaynak]) || null;
      return { ikon: (bilgi && bilgi.ikon) || "📦",
               ad: (bilgi && bilgi.ad) || o.kaynak, adet: o.miktar };
    }
    return { ikon: "⏩", ad: o.ad, adet: o.adet };
  }

  function kutuyaBas(i) {
    var d = durum();
    if (!d) return;
    var k = KUTULAR[i];
    var acildi = !!d.kutular[i];
    if (!acildi && d.coin >= k.esik) { kutuAc(i); return; }
    /* Kilitli ya da açılmış: içeriği göster */
    popListe(
      acildi ? "Kutu açıldı" : k.esik + " coin kutusu",
      acildi ? "Bu kutunun ödülleri alındı." : "Bu kutuyu açmak için " + k.esik + " coin gerekir.",
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
      }
    });

    if (typeof renderDiamonds === "function")  { try { renderDiamonds(); } catch (e) {} }
    if (typeof renderKaynaklar === "function") { try { renderKaynaklar(); } catch (e) {} }
    if (typeof renderInventory === "function") { try { renderInventory(); } catch (e) {} }
    kaydet();

    gorevCiz();
    popListe("🎁 Kutu açıldı!", "Ödüller çantana ve deponuna eklendi.", k.oduller);
  }

  /* ═══ AÇILIR PENCERE ═══ */
  function popListe(baslik, altYazi, oduller) {
    var pop = document.getElementById("etkPop");
    if (!pop) return;
    var kutu = pop.querySelector("#etkPopKutu");
    var html = '<div class="etk-p-ad"></div><div class="etk-p-alt"></div><div class="etk-p-liste">';
    kutu.innerHTML = html + '</div><button class="etk-p-btn" type="button">Tamam</button>';
    kutu.querySelector(".etk-p-ad").textContent = baslik;
    kutu.querySelector(".etk-p-alt").textContent = altYazi;

    var liste = kutu.querySelector(".etk-p-liste");
    oduller.forEach(function (o) {
      var y = odulYazisi(o);
      var satir = document.createElement("div");
      satir.className = "etk-p-oge";
      satir.innerHTML = "<span></span><span></span><b></b>";
      var s = satir.querySelectorAll("span");
      s[0].textContent = y.ikon;
      s[1].textContent = y.ad;
      satir.querySelector("b").textContent = sayiYaz(y.adet);
      liste.appendChild(satir);
    });

    kutu.querySelector(".etk-p-btn").addEventListener("click", popKapat);
    pop.classList.add("acik");
    if (kutu.animate) {
      kutu.animate(
        [{ opacity: 0, transform: "translateY(14px) scale(.96)" },
         { opacity: 1, transform: "translateY(0) scale(1)" }],
        { duration: 260, easing: "cubic-bezier(.16,1,.3,1)" }
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
    if (ekran.animate) {
      ekran.animate(
        [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 280, easing: "cubic-bezier(.16,1,.3,1)" }
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
    function bitir() { if (!acik && ekran) ekran.classList.remove("acik"); }
    if (ekran.animate) {
      var a = ekran.animate(
        [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(16px)" }],
        { duration: 180, easing: "cubic-bezier(.4,0,.9,.3)" }
      );
      a.onfinish = bitir;
    } else bitir();
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
        acilanKutular: d ? Object.keys(d.kutular) : null,
        etkinlikler: ETKINLIKLER.map(function (e) {
          return e.ad + " " + tarihUzun(gunTarihi(bas, e.basGun - 1)) +
                 " → " + tarihUzun(gunTarihi(bas, e.bitGun - 1));
        })
      };
    }
  };
})();
