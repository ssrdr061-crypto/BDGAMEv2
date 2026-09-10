/* ittifak.js — İTTİFAK SİSTEMİ (1. AŞAMA)
   ═══════════════════════════════════════════════════════════════
   NE VAR
   Alt menünün 5. düğmesi (eski posta yeri) #panel-ittifak açar.
   Posta artık ekranın sağ alt köşesindeki yüzen düğmede (posta.js).

   ÜYE DEĞİLSEN — üç sekme:
     İttifak Kur      → ad + etiket + manifesto + katılım biçimi,
                        bedel 400 💎
     İttifaka Katıl   → arama + liste; "Anında Katıl" ittifaklarda
                        Katıl, ötekilerde Başvur
     Davetler/Talepler→ gönderdiğin başvurular (geri çekilebilir)

   ÜYEYSEN — ittifak ekranı:
     etiket + ad + manifesto, üye listesi (rütbeye göre sıralı),
     kurucu/subay için başvuru onay-ret, rütbe verme, üye atma,
     Ayrıl (kurucuysan İttifakı Dağıt).

   RÜTBELER: kurucu → subay → uye. Yetkiler:
     kurucu: her şey (dağıt, rütbe ver, at, başvuru)
     subay : başvuru onay-ret, üye atma (subay/kurucuyu atamaz)
     uye   : yalnız ayrılır

   VERİ — TEK KAYNAK BULUT
   Firebase `ittifaklar/{id}` (id = etiketin küçük harfi, bu yüzden
   etiket benzersizdir):
     { ad, adKucuk, etiket, manifesto, katilim:"aninda"|"basvuru",
       kurucu, kurulus, uyeler:{ oyuncuAnahtari:{ad,rutbe,at} },
       basvurular:{ oyuncuAnahtari:{ad,at} } }
   Oyuncu tarafında yalnız KISAYOL durur: state.ittifak =
   { id, ad, etiket, rutbe }. Çelişki olursa bulut kazanır —
   panel her açılışta buluttan tazelenir ve kısayol düzeltilir.

   DİKKAT — FIREBASE KURALI
   `database.rules.json`'a `ittifaklar` düğümü ve `state.ittifak`
   alanı eklenmezse yazma SESSİZCE reddedilir ("$other" validate
   false). Kurulumdan önce eklenmeli.

   DİKKAT — .set() TUZAĞI
   Hiçbir yerde ittifak düğümünün tamamı .set() ile yazılmaz;
   üye ekleme/çıkarma tek tek `.child(...).set()` / `.remove()`
   ile yapılır, yoksa yazmadığın alanlar silinir.

   DİKKAT — `state` const'tur, `window.state` boştur; çıplak okunur.

   HAREKET: rAF + Web Animations. CSS keyframe/transition yok.

   2. AŞAMADA GELECEK (burada YOK)
     · sohbetin İttifak sekmesi, postanın İttifak sekmesi
     · haritada isim etiketinin yanında [ETİKET]
     · ittifak bonusları, ittifak bölgesi, davet gönderme
   ═══════════════════════════════════════════════════════════════ */
(function ittifakSistemi() {
  "use strict";

  var SURUM = "ittifak-1";

  /* ── AYARLAR ──────────────────────────────────────────────── */
  var KURMA_BEDELI = 400;      /* 💎 */
  var UYE_SINIRI   = 50;
  var AD_MIN = 3, AD_MAX = 16;
  var ETIKET_MIN = 2, ETIKET_MAX = 4;
  var MANIFESTO_MAX = 120;

  var RUTBE_AD = { kurucu: "Kurucu", subay: "Subay", uye: "Üye" };
  var RUTBE_SIRA = { kurucu: 0, subay: 1, uye: 2 };

  var aktifSekme = "kur";
  var panel = null;
  var _liste = [];        /* buluttan gelen ittifaklar */
  var _benim = null;      /* üyesi olduğum ittifakın tam kaydı */
  var _yukleniyor = false;

  /* ── KAPILAR ──────────────────────────────────────────────── */
  function st() { return (typeof state === "object" && state) ? state : null; }
  function benAd() {
    return (typeof currentUsername === "string" && currentUsername) ? currentUsername : null;
  }
  function benKey() {
    var a = benAd();
    return a ? toFirebaseKey(a) : null;
  }
  function bulutVar() {
    return (typeof firebaseReady !== "undefined") && firebaseReady &&
           (typeof firebaseDb !== "undefined") && firebaseDb;
  }
  function kok() { return firebaseDb.ref("ittifaklar"); }
  function uyar(m) { if (typeof showToast === "function") showToast(m); }
  function saat() { return (typeof sunucuSaati === "function") ? sunucuSaati() : Date.now(); }
  function yaz() { if (typeof persistCurrentState === "function") persistCurrentState(); }

  /* ── KISAYOL ──────────────────────────────────────────────── */
  function kisayol() {
    var s = st();
    return (s && s.ittifak && s.ittifak.id) ? s.ittifak : null;
  }
  function kisayolYaz(it) {
    var s = st();
    if (!s) return;
    if (!it) { delete s.ittifak; }
    else {
      var k = benKey();
      var u = (it.uyeler && k) ? it.uyeler[k] : null;
      s.ittifak = { id: it.id, ad: it.ad, etiket: it.etiket, rutbe: u ? u.rutbe : "uye" };
    }
    yaz();
  }

  function benimRutbem() {
    var k = benKey();
    if (!_benim || !k || !_benim.uyeler || !_benim.uyeler[k]) return null;
    return _benim.uyeler[k].rutbe || "uye";
  }
  function yetkiliMi() {
    var r = benimRutbem();
    return r === "kurucu" || r === "subay";
  }
  function uyeSayisi(it) {
    return it && it.uyeler ? Object.keys(it.uyeler).length : 0;
  }

  /* ── BULUTTAN OKU ─────────────────────────────────────────── */
  function tazele(bitince) {
    if (!bulutVar()) { _liste = []; _benim = null; if (bitince) bitince(); return; }
    _yukleniyor = true;
    kok().once("value").then(function (snap) {
      var v = snap.val() || {};
      _liste = Object.keys(v).map(function (id) {
        var it = v[id] || {};
        it.id = id;
        return it;
      });
      var k = benKey();
      _benim = null;
      if (k) {
        for (var i = 0; i < _liste.length; i++) {
          if (_liste[i].uyeler && _liste[i].uyeler[k]) { _benim = _liste[i]; break; }
        }
      }
      /* Kısayol bulutla çelişiyorsa bulut kazanır */
      var ks = kisayol();
      if (_benim) { kisayolYaz(_benim); }
      else if (ks) { kisayolYaz(null); }
      _yukleniyor = false;
      if (bitince) bitince();
    }).catch(function (e) {
      _yukleniyor = false;
      console.warn("[ittifak] okunamadı:", e);
      uyar("İttifak listesi alınamadı.");
      if (bitince) bitince();
    });
  }

  /* ── STİL ─────────────────────────────────────────────────── */
  function stilBas() {
    if (document.getElementById("ittifakStil")) return;
    var s = document.createElement("style");
    s.id = "ittifakStil";
    s.textContent =
      "#panel-ittifak{align-items:stretch !important;justify-content:stretch !important;}" +
      "#panel-ittifak .overlay-card{width:100% !important;max-width:none !important;" +
        "height:100% !important;max-height:none !important;border-radius:0 !important;" +
        "display:flex !important;flex-direction:column !important;overflow:hidden !important;" +
        "padding:calc(12px + env(safe-area-inset-top)) 12px calc(10px + env(safe-area-inset-bottom));}" +
      ".it-bas{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex:0 0 auto;}" +
      "#panel-ittifak .it-bas h2{flex:1 1 auto;margin:0;text-align:left;" +
        "font-family:'Baloo 2',sans-serif;font-weight:900;color:var(--km-yazi);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      "#panel-ittifak .it-bas .overlay-close{position:static !important;flex:0 0 auto;}" +

      ".it-sekmeler{display:flex;gap:4px;align-items:flex-end;flex:0 0 auto;}" +
      ".it-sekme{flex:1 1 0;min-width:0;border:0;cursor:pointer;font-family:'Baloo 2',sans-serif;" +
        "font-weight:800;font-size:12px;line-height:1;padding:9px 2px 8px;" +
        "border-radius:10px 10px 0 0;color:#dff0ff;overflow:hidden;text-overflow:ellipsis;" +
        "white-space:nowrap;background:linear-gradient(180deg,#2f6cb8,#1d478f);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".it-sekme.secili{background:linear-gradient(180deg,#f4f8ff,#d7e7fb);color:#123a70;" +
        "text-shadow:none;padding-bottom:11px;}" +

      ".it-govde{flex:1 1 auto;min-height:0;overflow-y:auto;padding:8px 2px 2px;}" +
      ".it-kutu{padding:12px 10px;border-radius:12px;margin-bottom:8px;" +
        "background:linear-gradient(180deg,#fbfdff,#e6eef8);box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".it-etiketli{font-family:'Baloo 2',sans-serif;font-weight:800;font-size:12px;color:#25334d;" +
        "display:block;margin:8px 0 4px;}" +
      ".it-giris,.it-alan{width:100%;box-sizing:border-box;border:0;border-radius:9px;padding:9px 10px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:700;font-size:13px;color:#14203a;" +
        "background:#eef4fc;box-shadow:inset 0 0 0 2px rgba(20,60,110,.12);}" +
      ".it-alan{min-height:64px;resize:none;}" +
      ".it-sec{display:flex;gap:6px;margin-top:4px;}" +
      ".it-sec button{flex:1 1 0;border:0;cursor:pointer;border-radius:9px;padding:8px 4px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:12px;color:#25334d;" +
        "background:#dfe7f2;}" +
      ".it-sec button.secili{background:linear-gradient(180deg,#3d7ccc,#22488f);color:#e8f4ff;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".it-ana{display:block;width:100%;margin-top:12px;border:0;cursor:pointer;border-radius:10px;" +
        "padding:11px 8px;font-family:'Baloo 2',sans-serif;font-weight:900;font-size:14px;color:#fff;" +
        "background:linear-gradient(180deg,#f2b52a,#d98f12);text-shadow:0 1px 2px rgba(60,30,0,.45);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".it-ana.it-kapali{background:linear-gradient(180deg,#b9c4d2,#8d9aab);cursor:default;}" +
      ".it-ipucu{font-size:11.5px;color:#3d4a63;margin-top:8px;text-align:center;}" +

      ".it-satir{display:flex;align-items:center;gap:9px;padding:8px;border-radius:12px;margin-bottom:7px;" +
        "background:linear-gradient(180deg,#fbfdff,#e6eef8);box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".it-flama{flex:0 0 44px;width:44px;height:44px;border-radius:10px;display:flex;" +
        "align-items:center;justify-content:center;font-family:'Baloo 2',sans-serif;font-weight:900;" +
        "font-size:13px;color:#fff;background:linear-gradient(180deg,#3d7ccc,#22488f);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".it-orta{flex:1 1 auto;min-width:0;}" +
      ".it-ad{font-family:'Baloo 2',sans-serif;font-weight:900;font-size:13.5px;color:#14203a;" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".it-alt{font-size:11.5px;color:#3d4a63;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".it-dugme{flex:0 0 auto;border:0;cursor:pointer;border-radius:9px;padding:8px 12px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:12px;color:#fff;" +
        "background:linear-gradient(180deg,#57c94f,#2e9a37);box-shadow:0 2px 6px rgba(0,20,45,.3);" +
        "text-shadow:0 1px 2px rgba(0,40,10,.45);}" +
      ".it-dugme.it-mavi{background:linear-gradient(180deg,#3d7ccc,#22488f);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".it-dugme.it-kirmizi{background:linear-gradient(180deg,#e05a5a,#a82c2c);}" +
      ".it-dugme.it-kapali{background:linear-gradient(180deg,#b9c4d2,#8d9aab);cursor:default;}" +
      ".it-kucuk{padding:6px 9px;font-size:11px;}" +
      ".it-rutbe{font-size:11px;font-weight:800;color:#22488f;}" +
      ".it-bos{padding:26px 10px;text-align:center;color:#cfe4ff;font-family:'Baloo 2',sans-serif;" +
        "font-weight:700;font-size:13px;text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".it-baslik{font-family:'Baloo 2',sans-serif;font-weight:900;font-size:13px;color:#e8f4ff;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);margin:10px 0 6px;}" +
      ".it-uyari{font-size:11.5px;font-weight:800;margin-top:6px;}" +
      ".it-uyari.iyi{color:#1f7a33;}" +
      ".it-uyari.kotu{color:#a82c2c;}";
    document.head.appendChild(s);
  }

  /* ── İSKELET ──────────────────────────────────────────────── */
  function iskelet() {
    if (document.getElementById("panel-ittifak")) return;
    var komsu = document.getElementById("panel-inventory");
    var kap = (komsu && komsu.parentNode) ? komsu.parentNode : document.body;

    panel = document.createElement("div");
    panel.className = "overlay-panel";
    panel.id = "panel-ittifak";
    panel.innerHTML =
      '<div class="overlay-card">' +
        '<div class="it-bas">' +
          "<h2>🤝 İTTİFAK</h2>" +
          '<button class="overlay-close" data-close>✕</button>' +
        "</div>" +
        '<div class="it-sekmeler" id="itSekmeler"></div>' +
        '<div class="it-govde" id="itGovde"></div>' +
      "</div>";
    kap.appendChild(panel);

    panel.addEventListener("click", function (e) {
      if (e.target === panel || (e.target.closest && e.target.closest("[data-close]"))) kapat();
    });
    document.getElementById("itGovde").addEventListener("click", govdeDokunus);
  }

  /* ── SEKMELER ─────────────────────────────────────────────── */
  function sekmeleriCiz() {
    var el = document.getElementById("itSekmeler");
    if (!el) return;
    if (_benim) { el.innerHTML = ""; el.style.display = "none"; return; }
    el.style.display = "flex";
    var S = [
      { id: "kur",    ad: "İttifak Kur" },
      { id: "katil",  ad: "İttifaka Katıl" },
      { id: "davet",  ad: "Davetler/Talepler" }
    ];
    el.innerHTML = S.map(function (s) {
      return '<button class="it-sekme' + (s.id === aktifSekme ? " secili" : "") +
             '" data-sekme="' + s.id + '">' + s.ad + "</button>";
    }).join("");
    Array.prototype.forEach.call(el.querySelectorAll(".it-sekme"), function (b) {
      b.addEventListener("click", function () {
        if (aktifSekme === b.dataset.sekme) return;
        aktifSekme = b.dataset.sekme;
        sekmeleriCiz();
        govdeCiz();
      });
    });
  }

  /* ── GÖVDE ────────────────────────────────────────────────── */
  function kacar(x) {
    return String(x == null ? "" : x)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function govdeCiz() {
    var el = document.getElementById("itGovde");
    if (!el) return;
    if (_yukleniyor) { el.innerHTML = '<div class="it-bos">Yükleniyor…</div>'; return; }
    if (!bulutVar()) {
      el.innerHTML = '<div class="it-bos">İttifak için internet bağlantısı gerekli.</div>';
      return;
    }
    if (_benim) { el.innerHTML = ittifakEkraniHTML(); }
    else if (aktifSekme === "kur")   { el.innerHTML = kurHTML(); }
    else if (aktifSekme === "katil") { el.innerHTML = katilHTML(); }
    else                             { el.innerHTML = davetHTML(); }

    if (!kapaliHareket()) {
      el.animate([{ opacity: 0, transform: "translateY(8px)" },
                  { opacity: 1, transform: "translateY(0)" }],
                 { duration: 180, easing: "cubic-bezier(.2,.85,.3,1)" });
    }
  }

  function kapaliHareket() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /* ── 1) İTTİFAK KUR ───────────────────────────────────────── */
  var kurKatilim = "aninda";

  function kurHTML() {
    var elmas = (st() && st().diamonds) ? st().diamonds : 0;
    var yeter = elmas >= KURMA_BEDELI;
    return '<div class="it-kutu">' +
      '<label class="it-etiketli">İttifak Adı (' + AD_MIN + "–" + AD_MAX + " harf)</label>" +
      '<input class="it-giris" id="itAd" maxlength="' + AD_MAX + '" placeholder="Girmek için dokun">' +
      '<label class="it-etiketli">Etiket (' + ETIKET_MIN + "–" + ETIKET_MAX + " harf, benzersiz)</label>" +
      '<input class="it-giris" id="itEtiket" maxlength="' + ETIKET_MAX + '" placeholder="ABC">' +
      '<label class="it-etiketli">İttifak Manifestosu</label>' +
      '<textarea class="it-alan" id="itManifesto" maxlength="' + MANIFESTO_MAX + '"' +
        ' placeholder="Diğer savaşçılara ittifakını anlat"></textarea>' +
      '<label class="it-etiketli">Katılım</label>' +
      '<div class="it-sec" id="itKatilimSec">' +
        '<button data-katilim="aninda"' + (kurKatilim === "aninda" ? ' class="secili"' : "") +
          ">Anında Katıl</button>" +
        '<button data-katilim="basvuru"' + (kurKatilim === "basvuru" ? ' class="secili"' : "") +
          ">Başvuruyla</button>" +
      "</div>" +
      '<div class="it-uyari" id="itKurUyari"></div>' +
      '<button class="it-ana' + (yeter ? "" : " it-kapali") + '" id="itKurBtn">' +
        "İttifak Kur · 💎 " + KURMA_BEDELI + "</button>" +
      '<div class="it-ipucu">Elmasın: 💎 ' +
        ((typeof fmt === "function") ? fmt(elmas) : elmas) + "</div>" +
    "</div>";
  }

  function kur() {
    var ad = (document.getElementById("itAd") || {}).value || "";
    var etiket = (document.getElementById("itEtiket") || {}).value || "";
    var man = (document.getElementById("itManifesto") || {}).value || "";
    var uyariEl = document.getElementById("itKurUyari");
    ad = ad.trim(); etiket = etiket.trim();

    function hata(m) {
      if (uyariEl) { uyariEl.className = "it-uyari kotu"; uyariEl.textContent = m; }
      else uyar(m);
    }

    if (!benAd()) { hata("Önce giriş yapmalısın."); return; }
    if (ad.length < AD_MIN || ad.length > AD_MAX) { hata("İttifak adı " + AD_MIN + "–" + AD_MAX + " harf olmalı."); return; }
    if (etiket.length < ETIKET_MIN || etiket.length > ETIKET_MAX) { hata("Etiket " + ETIKET_MIN + "–" + ETIKET_MAX + " harf olmalı."); return; }
    if (!/^[A-Za-z0-9ÇĞİÖŞÜçğıöşü]+$/.test(etiket)) { hata("Etiket yalnız harf ve rakam içerebilir."); return; }

    var s = st();
    if (!s || (s.diamonds || 0) < KURMA_BEDELI) { hata("Yeterli elmasın yok (💎 " + KURMA_BEDELI + ")."); return; }

    var id = etiket.toLowerCase();
    var adK = ad.toLowerCase();
    for (var i = 0; i < _liste.length; i++) {
      if (_liste[i].id === id) { hata("Bu etiket kullanılıyor."); return; }
      if ((_liste[i].adKucuk || "") === adK) { hata("Bu ittifak adı kullanılıyor."); return; }
    }

    var k = benKey(), ben = benAd();
    var kayit = {
      ad: ad, adKucuk: adK, etiket: etiket, manifesto: man.trim(),
      katilim: kurKatilim, kurucu: ben, kurulus: saat(),
      uyeler: {}
    };
    kayit.uyeler[k] = { ad: ben, rutbe: "kurucu", at: saat() };

    if (uyariEl) { uyariEl.className = "it-uyari"; uyariEl.textContent = "Kuruluyor…"; }

    /* Etiket benzersizliği düğüm adıyla korunur: aynı anda iki kişi
       aynı etiketi alırsa ikincisi burada takılır, sessizce üstüne
       yazmaz. */
    kok().child(id).transaction(function (mevcut) {
      if (mevcut) return;            /* dolu → iptal */
      return kayit;
    }).then(function (sonuc) {
      if (!sonuc.committed) { hata("Bu etiket az önce alındı, başka bir etiket dene."); return; }
      s.diamonds = (s.diamonds || 0) - KURMA_BEDELI;
      if (typeof renderDiamonds === "function") renderDiamonds();
      kayit.id = id;
      _benim = kayit;
      kisayolYaz(kayit);
      uyar("🤝 " + ad + " kuruldu!");
      tazele(function () { sekmeleriCiz(); govdeCiz(); });
    }).catch(function (e) {
      console.warn("[ittifak] kurulamadı:", e);
      hata("Kurulamadı: " + ((e && (e.code || e.message)) || "bilinmeyen hata"));
    });
  }

  /* ── 2) İTTİFAKA KATIL ────────────────────────────────────── */
  var arama = "";

  function katilHTML() {
    var k = benKey();
    var liste = _liste.filter(function (it) {
      if (!arama) return true;
      var a = (it.ad || "") + " " + (it.etiket || "");
      return a.toLowerCase().indexOf(arama.toLowerCase()) >= 0;
    });
    var h = '<div class="it-kutu" style="padding:8px;">' +
      '<input class="it-giris" id="itArama" placeholder="İttifak ara" value="' + kacar(arama) + '">' +
    "</div>";
    if (!liste.length) {
      return h + '<div class="it-bos">' +
        (_liste.length ? "Aramaya uyan ittifak yok." : "Henüz kurulmuş bir ittifak yok. İlkini sen kur!") +
        "</div>";
    }
    h += liste.map(function (it) {
      var sayi = uyeSayisi(it);
      var dolu = sayi >= UYE_SINIRI;
      var basvurdum = !!(it.basvurular && k && it.basvurular[k]);
      var aninda = (it.katilim !== "basvuru");
      var etiketiVar = dolu
        ? '<button class="it-dugme it-kapali" disabled>Dolu</button>'
        : (basvurdum
            ? '<button class="it-dugme it-kapali" disabled>Başvuruldu</button>'
            : '<button class="it-dugme' + (aninda ? "" : " it-mavi") +
              '" data-katil="' + kacar(it.id) + '">' + (aninda ? "Katıl" : "Başvur") + "</button>");
      return '<div class="it-satir">' +
        '<div class="it-flama">' + kacar(it.etiket) + "</div>" +
        '<div class="it-orta">' +
          '<div class="it-ad">' + kacar(it.ad) + "</div>" +
          '<div class="it-alt">👤 ' + sayi + "/" + UYE_SINIRI +
            " · " + (aninda ? "Anında katılım" : "Başvuruyla") + "</div>" +
          '<div class="it-alt">' + kacar(it.manifesto || "") + "</div>" +
        "</div>" + etiketiVar +
      "</div>";
    }).join("");
    return h;
  }

  function katilVeyaBasvur(id) {
    var it = null;
    for (var i = 0; i < _liste.length; i++) if (_liste[i].id === id) it = _liste[i];
    if (!it) return;
    var k = benKey(), ben = benAd();
    if (!k) { uyar("Önce giriş yapmalısın."); return; }
    if (_benim) { uyar("Zaten bir ittifaktasın."); return; }
    if (uyeSayisi(it) >= UYE_SINIRI) { uyar("İttifak dolu."); return; }

    if (it.katilim === "basvuru") {
      kok().child(id).child("basvurular").child(k).set({ ad: ben, at: saat() })
        .then(function () {
          uyar("Başvurun gönderildi.");
          tazele(function () { govdeCiz(); });
        })
        .catch(function (e) { uyar("Başvuru gönderilemedi."); console.warn("[ittifak]", e); });
      return;
    }

    kok().child(id).child("uyeler").child(k).set({ ad: ben, rutbe: "uye", at: saat() })
      .then(function () {
        uyar("🤝 " + it.ad + " ittifakına katıldın!");
        tazele(function () { sekmeleriCiz(); govdeCiz(); });
      })
      .catch(function (e) { uyar("Katılınamadı."); console.warn("[ittifak]", e); });
  }

  /* ── 3) DAVETLER / TALEPLER (üye değilken: kendi başvuruların) ── */
  function davetHTML() {
    var k = benKey();
    var bekleyen = _liste.filter(function (it) {
      return !!(it.basvurular && k && it.basvurular[k]);
    });
    if (!bekleyen.length) {
      return '<div class="it-bos">İncelenecek davet yok!</div>';
    }
    return '<div class="it-baslik">Gönderdiğin başvurular</div>' +
      bekleyen.map(function (it) {
        return '<div class="it-satir">' +
          '<div class="it-flama">' + kacar(it.etiket) + "</div>" +
          '<div class="it-orta">' +
            '<div class="it-ad">' + kacar(it.ad) + "</div>" +
            '<div class="it-alt">Yanıt bekleniyor</div>' +
          "</div>" +
          '<button class="it-dugme it-kirmizi it-kucuk" data-geri="' + kacar(it.id) + '">Geri çek</button>' +
        "</div>";
      }).join("");
  }

  function basvuruGeriCek(id) {
    var k = benKey();
    if (!k) return;
    kok().child(id).child("basvurular").child(k).remove()
      .then(function () { uyar("Başvuru geri çekildi."); tazele(function () { govdeCiz(); }); })
      .catch(function (e) { uyar("Geri çekilemedi."); console.warn("[ittifak]", e); });
  }

  /* ── ÜYE EKRANI ───────────────────────────────────────────── */
  function ittifakEkraniHTML() {
    var it = _benim;
    var benimR = benimRutbem();
    var yetki = yetkiliMi();
    var k = benKey();

    var uyeler = Object.keys(it.uyeler || {}).map(function (uk) {
      var u = it.uyeler[uk] || {};
      return { key: uk, ad: u.ad || uk, rutbe: u.rutbe || "uye", at: u.at || 0 };
    }).sort(function (a, b) {
      var f = (RUTBE_SIRA[a.rutbe] || 9) - (RUTBE_SIRA[b.rutbe] || 9);
      return f !== 0 ? f : (a.at - b.at);
    });

    var h = '<div class="it-kutu">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div class="it-flama" style="width:54px;height:54px;flex:0 0 54px;font-size:15px;">' +
          kacar(it.etiket) + "</div>" +
        '<div class="it-orta">' +
          '<div class="it-ad" style="font-size:16px;">' + kacar(it.ad) + "</div>" +
          '<div class="it-alt">👤 ' + uyeler.length + "/" + UYE_SINIRI +
            " · " + (it.katilim === "basvuru" ? "Başvuruyla" : "Anında katılım") + "</div>" +
          '<div class="it-alt">Rütben: ' + (RUTBE_AD[benimR] || "Üye") + "</div>" +
        "</div>" +
      "</div>" +
      (it.manifesto ? '<div class="it-alt" style="margin-top:8px;white-space:normal;">' +
        kacar(it.manifesto) + "</div>" : "") +
    "</div>";

    /* Bekleyen başvurular — yalnız kurucu ve subay görür */
    var basv = Object.keys(it.basvurular || {});
    if (yetki && basv.length) {
      h += '<div class="it-baslik">Başvurular (' + basv.length + ")</div>";
      h += basv.map(function (bk) {
        var b = it.basvurular[bk] || {};
        return '<div class="it-satir">' +
          '<div class="it-flama">👤</div>' +
          '<div class="it-orta"><div class="it-ad">' + kacar(b.ad || bk) + "</div>" +
            '<div class="it-alt">Katılmak istiyor</div></div>' +
          '<button class="it-dugme it-kucuk" data-onay="' + kacar(bk) + '">Onayla</button>' +
          '<button class="it-dugme it-kirmizi it-kucuk" data-ret="' + kacar(bk) + '">Ret</button>' +
        "</div>";
      }).join("");
    }

    h += '<div class="it-baslik">Üyeler</div>';
    h += uyeler.map(function (u) {
      var benMi = (u.key === k);
      var dugmeler = "";
      if (!benMi && benimR === "kurucu") {
        dugmeler += (u.rutbe === "subay")
          ? '<button class="it-dugme it-mavi it-kucuk" data-indir="' + kacar(u.key) + '">Üye yap</button>'
          : '<button class="it-dugme it-mavi it-kucuk" data-terfi="' + kacar(u.key) + '">Subay yap</button>';
      }
      if (!benMi && yetki && (benimR === "kurucu" || u.rutbe === "uye")) {
        dugmeler += '<button class="it-dugme it-kirmizi it-kucuk" data-at="' + kacar(u.key) + '">At</button>';
      }
      return '<div class="it-satir">' +
        '<div class="it-flama">' + (u.rutbe === "kurucu" ? "👑" : (u.rutbe === "subay" ? "🎖️" : "👤")) + "</div>" +
        '<div class="it-orta"><div class="it-ad">' + kacar(u.ad) + (benMi ? " (sen)" : "") + "</div>" +
          '<div class="it-rutbe">' + (RUTBE_AD[u.rutbe] || "Üye") + "</div></div>" +
        dugmeler +
      "</div>";
    }).join("");

    h += (benimR === "kurucu")
      ? '<button class="it-ana" id="itDagitBtn" style="background:linear-gradient(180deg,#e05a5a,#a82c2c);">İttifakı Dağıt</button>'
      : '<button class="it-ana" id="itAyrilBtn" style="background:linear-gradient(180deg,#e05a5a,#a82c2c);">İttifaktan Ayrıl</button>';
    return h;
  }

  /* ── ÜYE İŞLEMLERİ ────────────────────────────────────────── */
  function uyeYolu(uk) { return kok().child(_benim.id).child("uyeler").child(uk); }

  function basvuruOnayla(bk) {
    if (!_benim || !yetkiliMi()) return;
    var b = (_benim.basvurular || {})[bk];
    if (!b) return;
    if (uyeSayisi(_benim) >= UYE_SINIRI) { uyar("İttifak dolu."); return; }
    uyeYolu(bk).set({ ad: b.ad || bk, rutbe: "uye", at: saat() })
      .then(function () { return kok().child(_benim.id).child("basvurular").child(bk).remove(); })
      .then(function () { uyar((b.ad || "Oyuncu") + " katıldı."); tazele(govdeCiz); })
      .catch(function (e) { uyar("İşlem başarısız."); console.warn("[ittifak]", e); });
  }

  function basvuruReddet(bk) {
    if (!_benim || !yetkiliMi()) return;
    kok().child(_benim.id).child("basvurular").child(bk).remove()
      .then(function () { uyar("Başvuru reddedildi."); tazele(govdeCiz); })
      .catch(function (e) { uyar("İşlem başarısız."); console.warn("[ittifak]", e); });
  }

  function rutbeVer(uk, rutbe) {
    if (!_benim || benimRutbem() !== "kurucu") return;
    uyeYolu(uk).child("rutbe").set(rutbe)
      .then(function () { uyar("Rütbe güncellendi."); tazele(govdeCiz); })
      .catch(function (e) { uyar("İşlem başarısız."); console.warn("[ittifak]", e); });
  }

  function uyeAt(uk) {
    if (!_benim || !yetkiliMi()) return;
    var u = (_benim.uyeler || {})[uk];
    if (!u) return;
    if (u.rutbe === "kurucu") { uyar("Kurucu atılamaz."); return; }
    if (benimRutbem() === "subay" && u.rutbe !== "uye") { uyar("Subayı yalnız kurucu atabilir."); return; }
    uyeYolu(uk).remove()
      .then(function () { uyar((u.ad || "Üye") + " ittifaktan atıldı."); tazele(govdeCiz); })
      .catch(function (e) { uyar("İşlem başarısız."); console.warn("[ittifak]", e); });
  }

  function ayril() {
    if (!_benim) return;
    var k = benKey();
    uyeYolu(k).remove()
      .then(function () {
        uyar("İttifaktan ayrıldın.");
        _benim = null;
        kisayolYaz(null);
        aktifSekme = "katil";
        tazele(function () { sekmeleriCiz(); govdeCiz(); });
      })
      .catch(function (e) { uyar("Ayrılınamadı."); console.warn("[ittifak]", e); });
  }

  function dagit() {
    if (!_benim || benimRutbem() !== "kurucu") return;
    var ad = _benim.ad;
    kok().child(_benim.id).remove()
      .then(function () {
        uyar(ad + " dağıtıldı.");
        _benim = null;
        kisayolYaz(null);
        aktifSekme = "kur";
        tazele(function () { sekmeleriCiz(); govdeCiz(); });
      })
      .catch(function (e) { uyar("Dağıtılamadı."); console.warn("[ittifak]", e); });
  }

  /* ── DOKUNUŞ — tek kapı ───────────────────────────────────── */
  function govdeDokunus(e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var kb = t.closest("[data-katilim]");
    if (kb) { kurKatilim = kb.dataset.katilim; govdeCizKoru(); return; }

    if (t.closest("#itKurBtn"))    { kur(); return; }
    if (t.closest("#itAyrilBtn"))  { ayril(); return; }
    if (t.closest("#itDagitBtn"))  { dagit(); return; }

    var b;
    if ((b = t.closest("[data-katil]"))) { katilVeyaBasvur(b.dataset.katil); return; }
    if ((b = t.closest("[data-geri]")))  { basvuruGeriCek(b.dataset.geri); return; }
    if ((b = t.closest("[data-onay]")))  { basvuruOnayla(b.dataset.onay); return; }
    if ((b = t.closest("[data-ret]")))   { basvuruReddet(b.dataset.ret); return; }
    if ((b = t.closest("[data-terfi]")))  { rutbeVer(b.dataset.terfi, "subay"); return; }
    if ((b = t.closest("[data-indir]")))  { rutbeVer(b.dataset.indir, "uye"); return; }
    if ((b = t.closest("[data-at]")))     { uyeAt(b.dataset.at); return; }
  }

  /* Kur ekranı yeniden çizilirken yazılanlar kaybolmasın */
  function govdeCizKoru() {
    var ad = (document.getElementById("itAd") || {}).value;
    var et = (document.getElementById("itEtiket") || {}).value;
    var mn = (document.getElementById("itManifesto") || {}).value;
    govdeCiz();
    if (ad != null && document.getElementById("itAd")) document.getElementById("itAd").value = ad;
    if (et != null && document.getElementById("itEtiket")) document.getElementById("itEtiket").value = et;
    if (mn != null && document.getElementById("itManifesto")) document.getElementById("itManifesto").value = mn;
  }

  /* Arama kutusu her tuşta listeyi süzer (yeniden çizim odağı
     kaybettirmesin diye değer geri yazılıyor). */
  function aramaBagla() {
    var el = document.getElementById("itArama");
    if (!el || el.dataset.bagli) return;
    el.dataset.bagli = "1";
    el.addEventListener("input", function () {
      arama = el.value;
      var yer = el.selectionStart;
      govdeCiz();
      var yeni = document.getElementById("itArama");
      if (yeni) { yeni.focus(); try { yeni.setSelectionRange(yer, yer); } catch (e) {} aramaBagla(); }
    });
  }

  /* ── AÇ / KAPAT ───────────────────────────────────────────── */
  function ac() {
    stilBas();
    iskelet();
    if (!panel) return;
    if (typeof tumPanelleriKapat === "function") tumPanelleriKapat("ittifak");
    panel.classList.add("active");

    clearTimeout(panel._hayaletZm);
    panel.style.pointerEvents = "none";
    panel._hayaletZm = setTimeout(function () { panel.style.pointerEvents = ""; }, 350);

    _yukleniyor = true;
    sekmeleriCiz();
    govdeCiz();
    tazele(function () {
      if (_benim) aktifSekme = "kur";
      sekmeleriCiz();
      govdeCiz();
      aramaBagla();
    });

    var kart = panel.querySelector(".overlay-card");
    if (kart && !kapaliHareket()) {
      kart.animate([{ opacity: 0, transform: "translateY(18px)" },
                    { opacity: 1, transform: "translateY(0)" }],
                   { duration: 240, easing: "cubic-bezier(.2,.85,.3,1)" });
    }
  }

  function kapat() { if (panel) panel.classList.remove("active"); }

  /* Alt menüdeki 5. düğme index.html'de data-panel="ittifak"
     diyor; openOverlayPanel bu anahtarı tanımadığı için sarmalanır. */
  function dockBagla() {
    var orij = window.openOverlayPanel;
    if (typeof orij !== "function" || orij.__ittifakWrapped) return;
    var sarmal = function (key) {
      if (key === "ittifak") { ac(); return; }
      return orij.apply(this, arguments);
    };
    sarmal.__ittifakWrapped = true;
    window.openOverlayPanel = sarmal;
  }

  function baslat() { stilBas(); iskelet(); dockBagla(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", baslat);
  } else {
    baslat();
  }

  window.ITTIFAK = {
    SURUM: SURUM,
    ac: ac, kapat: kapat, tazele: tazele,
    BEDEL: KURMA_BEDELI, UYE_SINIRI: UYE_SINIRI,
    /* Başka dosyalar oyuncunun etiketini buradan okur (2. aşama:
       harita etiketi, sohbet kanalı). Bulut değil, kısayol döner. */
    benim: function () { return kisayol(); },
    tani: function () {
      return {
        surum: SURUM,
        bulut: bulutVar(),
        kisayol: kisayol(),
        ittifakSayisi: _liste.length,
        uyesiOldugum: _benim ? (_benim.etiket + " / " + _benim.ad + " / " + benimRutbem()) : null
      };
    }
  };
})();
