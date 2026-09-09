/* etkinlik.js — ETKİNLİKLER EKRANI + KALE İÇİ İKONU (1. aşama)
   ═══════════════════════════════════════════════════════════════
   NE VAR
   · Kale içindeyken sağ üstte "Etkinlikler" düğmesi (#etkIkon).
     Yalnız kale içinde görünür — görünürlük `body.kaleici-acik`
     sınıfına bağlı, JS ile açıp kapatma yok.
   · Tam ekran Etkinlikler penceresi (#etkEkran):
       – canlı UTC saati
       – haftanın 7 günü (Pzt…Paz) + tarihleri, bugün vurgulu
       – ızgara üstünde etkinlik çubuğu
   · Şimdilik TEK etkinlik: Hoşgeldin Etkinliği, HER HAFTA tekrar.
     Çubuğa basınca açıklama + bu haftaki tarih aralığı çıkar.
     (Görev/ödül içeriği 2. aşamada.)

   TARİH — TEK DOĞRULUK KAYNAĞI
   Aşağıdaki ETKINLIKLER dizisi. Gün numaraları UTC haftasına göre
   1=Pazartesi … 7=Pazar. Etkinliğin gününü değiştirmek için
   `basGun` / `bitGun` yeter, başka yerde tarih hesabı yoktur.
   Saat de UTC — referanstaki gibi, oyuncu saat diliminden bağımsız.

   HAREKET
   Açılış/kapanış ve çubukların gelişi Web Animations ile;
   CSS keyframe/transition yok (prefers-reduced-motion öldürürdü).
   ═══════════════════════════════════════════════════════════════ */
(function etkinlikMenusu() {
  "use strict";

  var SURUM = "etkinlik-1";

  /* ── ETKİNLİK TANIMI ──────────────────────────────────────────
     basGun/bitGun: 1=Pzt … 7=Paz (UTC). Her hafta tekrarlar. */
  var ETKINLIKLER = [
    {
      id: "hosgeldin",
      ad: "Hoşgeldin Etkinliği",
      ikon: "🎉",
      renk1: "#f2b52a",
      renk2: "#d98f12",
      basGun: 1,
      bitGun: 7,
      aciklama: "Yeni gelen komutanlar için haftalık karşılama etkinliği. " +
                "Her hafta Pazartesi başlar, Pazar gecesi biter."
    }
  ];

  var GUN_KISA = ["Pzt", "Sal", "Çrş", "Prş", "Cum", "Cts", "Paz"];
  var HAYALET_MS = 350;

  var ekran = null, saatEl = null, saatSayac = 0, acik = false;

  /* ── 1) UTC HAFTA HESABI ──────────────────────────────────────
     Haftanın başı: Pazartesi 00:00 UTC. getUTCDay() 0=Pazar. */
  function haftaBasi(simdi) {
    var g = simdi.getUTCDay();
    var kaydir = (g === 0 ? 6 : g - 1);
    return Date.UTC(
      simdi.getUTCFullYear(), simdi.getUTCMonth(), simdi.getUTCDate() - kaydir
    );
  }
  function gunTarihi(bas, indeks) { return new Date(bas + indeks * 86400000); }
  function ikiHane(n) { return (n < 10 ? "0" : "") + n; }
  function tarihKisa(d) { return ikiHane(d.getUTCMonth() + 1) + "/" + ikiHane(d.getUTCDate()); }
  function tarihUzun(d) {
    return d.getUTCFullYear() + "-" + ikiHane(d.getUTCMonth() + 1) + "-" + ikiHane(d.getUTCDate());
  }
  function saatYazisi(d) {
    return "UTC Saati " + tarihUzun(d) + " " +
           ikiHane(d.getUTCHours()) + ":" + ikiHane(d.getUTCMinutes()) + ":" + ikiHane(d.getUTCSeconds());
  }
  /* bugün: 0=Pzt … 6=Paz */
  function bugunIndeks(simdi) { var g = simdi.getUTCDay(); return g === 0 ? 6 : g - 1; }

  /* ── 2) STİL ──────────────────────────────────────────────────
     Renkler tema.js'in --km değişkenlerinden; ID'li seçici
     kullanıldığı için sonradan eklenen kurallar ezemez. */
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

      /* ── Tam ekran ── */
      "#etkEkran{position:fixed; inset:0; z-index:970; display:none;",
      "  flex-direction:column; font-family:'Baloo 2','Nunito',sans-serif;",
      "  background:linear-gradient(180deg,var(--km-2) 0%,var(--km-3) 100%);}",
      "#etkEkran.acik{display:flex;}",
      "#etkEkran .etk-baslik{display:flex; align-items:center; gap:10px;",
      "  padding:calc(env(safe-area-inset-top,0) + 10px) 12px 10px;",
      "  background:linear-gradient(180deg,var(--km-1),var(--km-2));",
      "  color:#f2fbff; font-size:19px; font-weight:800;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#etkEkran .etk-geri{background:none; border:none; color:#f2fbff;",
      "  font-size:24px; line-height:1; padding:2px 6px; cursor:pointer;}",
      "#etkEkran .etk-geri:active{transform:scale(.96); filter:brightness(.93);}",
      "#etkEkran .etk-saat{padding:7px 10px; text-align:center; color:#eaf4ff;",
      "  font-size:14px; font-weight:800; font-variant-numeric:tabular-nums;",
      "  background:rgba(255,255,255,.10); border-bottom:1px solid rgba(160,215,255,.25);}",

      /* ── Gün şeridi ── */
      "#etkEkran .etk-gunler{display:grid; grid-template-columns:repeat(7,1fr); gap:4px; padding:8px 8px 6px;}",
      "#etkEkran .etk-gun{border-radius:10px; padding:5px 0; text-align:center;",
      "  background:rgba(255,255,255,.12); color:#eaf4ff;",
      "  font-size:11.5px; font-weight:800; line-height:1.25;",
      "  font-variant-numeric:tabular-nums;}",
      "#etkEkran .etk-gun.bugun{background:linear-gradient(180deg,#f7c948,#e09b12); color:#23180a;}",
      "#etkEkran .etk-gun small{display:block; font-size:11px; opacity:.85; font-weight:700;}",

      /* ── Izgara ── */
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
      "#etkEkran .etk-cubuk{grid-row:auto; display:flex; align-items:center; justify-content:center; gap:7px;",
      "  min-height:38px; border-radius:9px; padding:0 8px; cursor:pointer;",
      "  color:#2a1c05; font-size:13.5px; font-weight:800;",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3);}",
      "#etkEkran .etk-cubuk:active{transform:scale(.96); filter:brightness(.93);}",
      "#etkEkran .etk-cubuk .etk-c-ikon{font-size:17px;}",
      "#etkEkran .etk-dip{color:#bcd6ef; font-size:11.5px; font-weight:700; text-align:center; padding:12px 6px 0;}",

      /* ── Detay penceresi ── */
      "#etkDetay{position:fixed; inset:0; z-index:975; display:none;",
      "  align-items:center; justify-content:center; padding:18px;",
      "  background:rgba(2,10,26,.72); font-family:'Baloo 2','Nunito',sans-serif;}",
      "#etkDetay.acik{display:flex;}",
      "#etkDetay .etk-d-kutu{width:100%; max-width:330px; border-radius:20px; padding:18px 16px;",
      "  border:1px solid var(--km-kenar); color:#eaf4ff;",
      "  background:linear-gradient(180deg,var(--km-1) 0%,var(--km-2) 52%,var(--km-3) 100%);",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3);}",
      "#etkDetay .etk-d-ad{font-size:20px; font-weight:800; text-align:center;",
      "  text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#etkDetay .etk-d-tarih{font-size:12.5px; font-weight:800; text-align:center; margin-top:4px;",
      "  color:#f7c948; font-variant-numeric:tabular-nums;}",
      "#etkDetay .etk-d-metin{font-size:13.5px; font-weight:600; line-height:1.45; margin:12px 0 16px;}",
      "#etkDetay .etk-d-kapat{display:block; width:100%; padding:10px; border:none; border-radius:12px;",
      "  background:linear-gradient(180deg,#f7c948,#e09b12); color:#23180a;",
      "  font-family:inherit; font-size:15px; font-weight:800; cursor:pointer;}",
      "#etkDetay .etk-d-kapat:active{transform:scale(.96); filter:brightness(.93);}"
    ].join("\n");
    document.head.appendChild(st);
  }

  /* ── 3) İSKELET ───────────────────────────────────────────────
     İkon emoji ile çiziliyor; .webp geldiğinde yalnız .etk-i-kutu
     içeriği değişir. Olmayan dosyaya sessiz bağ kurulmadı. */
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
        '<div class="etk-dip">Saatler UTC\'dir. Etkinlikler her hafta yenilenir.</div>' +
      '</div>';
    document.body.appendChild(ekran);
    ekran.querySelector("#etkGeri").addEventListener("click", kapat);
    saatEl = ekran.querySelector("#etkSaat");

    var det = document.createElement("div");
    det.id = "etkDetay";
    det.innerHTML =
      '<div class="etk-d-kutu">' +
      '<div class="etk-d-ad" id="etkDAd"></div>' +
      '<div class="etk-d-tarih" id="etkDTarih"></div>' +
      '<div class="etk-d-metin" id="etkDMetin"></div>' +
      '<button class="etk-d-kapat" type="button" id="etkDKapat">Kapat</button></div>';
    document.body.appendChild(det);
    det.querySelector("#etkDKapat").addEventListener("click", detayKapat);
    det.addEventListener("click", function (e) { if (e.target === det) detayKapat(); });
  }

  /* ── 4) ÇİZİM ─────────────────────────────────────────────────── */
  function ciz() {
    var simdi = new Date();
    var bas = haftaBasi(simdi);
    var bugun = bugunIndeks(simdi);

    var gunler = ekran.querySelector("#etkGunler");
    var sutunlar = ekran.querySelector("#etkSutunlar");
    var satirlar = ekran.querySelector("#etkSatirlar");
    gunler.innerHTML = "";
    sutunlar.innerHTML = "";
    satirlar.innerHTML = "";

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
      cubuk.addEventListener("click", function () { detayAc(e, bas); });
      satirlar.appendChild(cubuk);

      if (cubuk.animate) {
        cubuk.animate(
          [{ opacity: 0, transform: "translateX(-14px)" },
           { opacity: 1, transform: "translateX(0)" }],
          { duration: 320, delay: 90 + sira * 70, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }
        );
      }
    });
  }

  function saatiYaz() { if (saatEl) saatEl.textContent = saatYazisi(new Date()); }

  /* ── 5) AÇ / KAPAT ────────────────────────────────────────────── */
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
        [{ opacity: 0, transform: "translateY(16px)" },
         { opacity: 1, transform: "translateY(0)" }],
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
    detayKapat();
    function bitir() { if (!acik && ekran) ekran.classList.remove("acik"); }
    if (ekran.animate) {
      var a = ekran.animate(
        [{ opacity: 1, transform: "translateY(0)" },
         { opacity: 0, transform: "translateY(16px)" }],
        { duration: 180, easing: "cubic-bezier(.4,0,.9,.3)" }
      );
      a.onfinish = bitir;
    } else bitir();
  }

  function detayAc(e, haftaBas) {
    var kutu = document.getElementById("etkDetay");
    if (!kutu) return;
    var d1 = gunTarihi(haftaBas, e.basGun - 1);
    var d2 = gunTarihi(haftaBas, e.bitGun - 1);
    document.getElementById("etkDAd").textContent = e.ikon + "  " + e.ad;
    document.getElementById("etkDTarih").textContent =
      tarihUzun(d1) + " 00:00  →  " + tarihUzun(d2) + " 23:59 UTC";
    document.getElementById("etkDMetin").textContent = e.aciklama;
    kutu.classList.add("acik");
    var ic = kutu.querySelector(".etk-d-kutu");
    if (ic && ic.animate) {
      ic.animate(
        [{ opacity: 0, transform: "translateY(14px) scale(.96)" },
         { opacity: 1, transform: "translateY(0) scale(1)" }],
        { duration: 260, easing: "cubic-bezier(.16,1,.3,1)" }
      );
    }
  }

  function detayKapat() {
    var kutu = document.getElementById("etkDetay");
    if (kutu) kutu.classList.remove("acik");
  }

  /* ── 6) BAŞLAT ────────────────────────────────────────────────── */
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
    tani: function () {
      var simdi = new Date();
      var bas = haftaBasi(simdi);
      return {
        surum: SURUM,
        utc: saatYazisi(simdi),
        haftaBasi: tarihUzun(new Date(bas)),
        bugunIndeks: bugunIndeks(simdi),
        ikonVar: !!document.getElementById("etkIkon"),
        ekranVar: !!document.getElementById("etkEkran"),
        etkinlikler: ETKINLIKLER.map(function (e) {
          return e.ad + " " + tarihUzun(gunTarihi(bas, e.basGun - 1)) +
                 " → " + tarihUzun(gunTarihi(bas, e.bitGun - 1));
        })
      };
    }
  };
})();
