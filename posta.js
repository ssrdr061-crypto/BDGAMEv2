/* posta.js — POSTA (MESAJ KUTUSU): 5 SEKMELİ
   ═══════════════════════════════════════════════════════════════
   NE VAR
   Alt menüdeki 5. düğme (eski "Savaş Günlüğü") artık POSTA açar.
   Panel #panel-posta; üstte sekme şeridi, altında liste.

     Savaşlar  → state.battleLogHistory içindeki PvP kayıtları
     Raporlar  → state.battleLogHistory içindeki canavar kayıtları
     Sistem    → state.postaSistem  (POSTA.sistemEkle ile yazılır)
     İttifak   → BOŞ. Oyunda ittifak sistemi yok; sekme duruyor,
                 üyelik/kanal verisi doğduğunda buraya bağlanacak.
     Yıldızlı  → yıldızlanan postaların birleşik listesi

   TEK RENDER
   Savaş günlüğünün eski paneli (#panel-battlelog) ve eski
   renderBattleLogPanel() yerini bu dosya alır: window.renderBattleLogPanel
   BURAYA bağlanır, böylece buluttan günlük indiğinde index.html'in
   çağırdığı tazeleme yine çalışır. İKİNCİ liste yolu YOKTUR.

   RAPOR AÇMA / PAYLAŞMA KENDİ KODUNU YAZMAZ
     canavar raporu → openLogReportModal(entry)          (index.html)
     PvP raporu     → openReportModal(entryToReport(en)) (tema.js)
     sohbette paylaş→ shareReportToChat(entry)           (tema.js)
     ödül kutusu    → odulKutusunuAc(index)              (index.html)
   Bunların hiçbiri burada kopyalanmadı; yoksa düğme çizilmez.

   KAYIT
   Okundu / yıldız damgaları  → state.posta = { ok:{}, yz:{} }
   Sistem postaları           → state.postaSistem = [ ... ]
   Hesabın kendi state'inde durur, persistCurrentState() ile yazılır.
   DİKKAT: Firebase kuralına yeni alan eklenmeli —
   database.rules.json içinde accounts/$ad/state altına `posta` ve
   `postaSistem` yazılmazsa bulut yazması sessizce reddedilir.
   DİKKAT: index.html'de `const state = ...` → window.state boştur,
   çıplak `state` ile okunur.

   SİLME
   "Okunmuş Postaları Sil" savaş kayıtlarını gerçekten siler.
   Liste tamamen boşalıyorsa clearBattleLogHistory() çağrılır:
   boş liste ancak o fonksiyonun açtığı izinle diske/buluta yazılır
   (index.html _logSilmeIzni). Ayrı bir yazma yolu açılmadı.

   HAREKET
   rAF + Web Animations. CSS keyframe/transition yok
   (prefers-reduced-motion hepsini öldürür).

   INDEX.HTML'DE YAPILACAK TEK EKLEME
     <script src="posta.js"></script>   (tema.js'ten SONRA)
   ve artık ölü olan eski günlük bloğu silinmeli:
     · <div class="overlay-panel" id="panel-battlelog"> … </div>
     · function renderBattleLogPanel() { … }
   Bu dosya, blok hâlâ duruyorsa açılışta DOM'dan kaldırır.
   ═══════════════════════════════════════════════════════════════ */
(function postaKutusu() {
  "use strict";

  var SURUM = "posta-1";

  /* ── SEKMELER ─────────────────────────────────────────────── */
  var SEKMELER = [
    { id: "savaslar", ad: "Savaşlar", ikon: "⚔️" },
    { id: "ittifak",  ad: "İttifak",  ikon: "🤝" },
    { id: "sistem",   ad: "Sistem",   ikon: "⚙️" },
    { id: "raporlar", ad: "Raporlar", ikon: "📜" },
    { id: "yildizli", ad: "Yıldızlı", ikon: "⭐" }
  ];

  var aktifSekme = "savaslar";

  /* ── STATE KAPILARI ───────────────────────────────────────── */
  function st() {
    return (typeof state === "object" && state) ? state : null;
  }
  function damga() {
    var s = st();
    if (!s) return { ok: {}, yz: {} };
    if (!s.posta || typeof s.posta !== "object") s.posta = { ok: {}, yz: {} };
    if (!s.posta.ok) s.posta.ok = {};
    if (!s.posta.yz) s.posta.yz = {};
    return s.posta;
  }
  function sistemKayitlari() {
    var s = st();
    if (!s) return [];
    if (!Array.isArray(s.postaSistem)) s.postaSistem = [];
    return s.postaSistem;
  }
  function gunluk() {
    var s = st();
    return (s && Array.isArray(s.battleLogHistory)) ? s.battleLogHistory : [];
  }
  function yaz() {
    if (typeof persistCurrentState === "function") persistCurrentState();
  }

  /* ── POSTA NESNESİ ────────────────────────────────────────────
     Kaynak ne olursa olsun liste tek biçim çizer. `kaynakIdx`
     savaş kaydının battleLogHistory içindeki gerçek sırasıdır;
     ödül kutusu ve rapor açma o sırayı ister. */
  function logId(en, i) {
    return "l" + (en.timestamp || 0) + "-" + (en.pvp ? "p" : "c") + i;
  }
  function sistemId(k) {
    return "s" + (k.at || 0) + "-" + (k.id || "");
  }

  function temizAd(ad) {
    return String(ad || "").replace(/^[^\wÇĞİÖŞÜçğıöşü]+/, "").trim() || "Bilinmeyen";
  }

  function logPostasi(en, i) {
    var pvp = !!en.pvp;
    var kazandi = !!en.win;
    var ad = temizAd(en.enemyPlainName || en.enemyName);
    var onizleme;
    if (pvp) {
      var yon = (en.role === "defender") ? "Savunma savaşı" : "Saldırı";
      var elm = Number(en.diamondDelta || 0);
      onizleme = yon + (elm ? " · " + (elm > 0 ? "+" : "") + elm + " 💎" : "") +
                 " · " + (Number(en.turns) || 0) + " tur";
    } else {
      onizleme = "Canavar savaşı · " + (Number(en.turns) || 0) + " tur" +
                 (en.enemyCount ? " · " + en.enemyCount + " birlik" : "");
    }
    return {
      id: logId(en, i),
      tur: "log",
      sekme: pvp ? "savaslar" : "raporlar",
      kaynakIdx: i,
      en: en,
      ikonGorsel: en.enemyIcon || "",
      ikonEmoji: pvp ? (en.role === "defender" ? "🛡️" : "🏰") : "👹",
      baslik: (kazandi ? "Zafer" : "Yenilgi") + " — " + ad,
      kazandi: kazandi,
      onizleme: onizleme,
      zaman: en.timestamp || 0,
      odul: en.odul || null
    };
  }

  function sistemPostasi(k) {
    return {
      id: sistemId(k),
      tur: "sistem",
      sekme: "sistem",
      kayit: k,
      ikonGorsel: k.gorsel || "",
      ikonEmoji: k.ikon || "⚙️",
      baslik: k.baslik || "Sistem",
      kazandi: null,
      onizleme: k.metin || "",
      zaman: k.at || 0,
      odul: null
    };
  }

  /* Bütün postalar, yeni → eski */
  function tumPostalar() {
    var liste = gunluk().map(logPostasi);
    sistemKayitlari().forEach(function (k) { liste.push(sistemPostasi(k)); });
    liste.sort(function (a, b) { return b.zaman - a.zaman; });
    return liste;
  }

  function sekmeninPostalari(sekme) {
    var hepsi = tumPostalar();
    if (sekme === "yildizli") {
      var d = damga();
      return hepsi.filter(function (p) { return !!d.yz[p.id]; });
    }
    if (sekme === "ittifak") return [];
    return hepsi.filter(function (p) { return p.sekme === sekme; });
  }

  function okunmamisSayisi(sekme) {
    var d = damga();
    return sekmeninPostalari(sekme).filter(function (p) { return !d.ok[p.id]; }).length;
  }

  /* ── TARİH ────────────────────────────────────────────────── */
  function iki(n) { return (n < 10 ? "0" : "") + n; }
  function tarihYaz(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    return d.getFullYear() + "-" + iki(d.getMonth() + 1) + "-" + iki(d.getDate()) +
           " " + iki(d.getHours()) + ":" + iki(d.getMinutes()) + ":" + iki(d.getSeconds());
  }

  /* ── STİL ─────────────────────────────────────────────────────
     Panel gövdesi tema.js'in .overlay-card kuralından gelir;
     burada yalnız postaya özel parçalar tanımlanır. */
  function stilBas() {
    if (document.getElementById("postaStil")) return;
    var st2 = document.createElement("style");
    st2.id = "postaStil";
    st2.textContent =
      "#panel-posta .overlay-card{padding:14px 12px 12px;}" +
      "#panel-posta h2{font-family:'Baloo 2',sans-serif;font-weight:900;margin:0 0 10px;" +
        "text-align:center;color:var(--km-yazi);text-shadow:0 1px 2px rgba(0,20,45,.55);}" +

      /* sekme şeridi */
      ".posta-sekmeler{display:flex;gap:4px;align-items:flex-end;}" +
      ".posta-sekme{position:relative;flex:1 1 0;min-width:0;border:0;cursor:pointer;" +
        "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:12px;line-height:1;" +
        "padding:9px 2px 8px;border-radius:10px 10px 0 0;color:#dff0ff;" +
        "background:linear-gradient(180deg,#2f6cb8,#1d478f);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".posta-sekme.secili{background:linear-gradient(180deg,#f4f8ff,#d7e7fb);color:#123a70;" +
        "text-shadow:none;padding-bottom:11px;}" +
      ".posta-sekme .ps-ad{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".posta-sekme .ps-rozet{position:absolute;top:-4px;right:2px;min-width:16px;height:16px;" +
        "padding:0 4px;border-radius:9px;background:#e03a3a;color:#fff;font-size:10px;" +
        "font-weight:900;line-height:16px;font-variant-numeric:tabular-nums;" +
        "box-shadow:0 1px 3px rgba(0,20,45,.5);}" +

      /* araç şeridi */
      ".posta-arac{display:flex;gap:6px;margin:8px 0 6px;}" +
      ".posta-arac button{flex:1 1 0;border:0;cursor:pointer;border-radius:9px;padding:8px 4px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:11px;color:#e8f4ff;" +
        "background:linear-gradient(180deg,#3d7ccc,#22488f);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);text-shadow:0 1px 2px rgba(0,20,45,.55);}" +

      /* liste */
      ".posta-liste{max-height:56vh;overflow-y:auto;padding:2px;display:flex;" +
        "flex-direction:column;gap:7px;}" +
      ".posta-kart{display:flex;align-items:stretch;gap:8px;padding:8px;border-radius:12px;" +
        "background:linear-gradient(180deg,#fbfdff,#e6eef8);box-shadow:0 2px 6px rgba(0,20,45,.3);" +
        "cursor:pointer;}" +
      ".posta-kart.pk-okundu{filter:brightness(.93);}" +
      ".pk-ikon{flex:0 0 46px;width:46px;height:46px;border-radius:9px;overflow:hidden;" +
        "background:#dfe7f2;display:flex;align-items:center;justify-content:center;font-size:22px;}" +
      ".pk-ikon img{width:100%;height:100%;object-fit:cover;display:block;}" +
      ".pk-orta{flex:1 1 auto;min-width:0;}" +
      ".pk-baslik{font-family:'Baloo 2',sans-serif;font-weight:900;font-size:13.5px;color:#14203a;" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".pk-baslik.pk-yenilgi{color:#8d2626;}" +
      ".pk-onizleme{font-size:11.5px;color:#3d4a63;overflow:hidden;text-overflow:ellipsis;" +
        "white-space:nowrap;margin-top:1px;}" +
      ".pk-zaman{font-size:10.5px;color:#6a789a;font-variant-numeric:tabular-nums;margin-top:2px;}" +
      ".pk-sag{flex:0 0 42px;display:flex;flex-direction:column;align-items:center;" +
        "justify-content:space-between;}" +
      ".pk-yildiz{border:0;background:none;cursor:pointer;font-size:15px;line-height:1;padding:0;}" +
      ".pk-odul{position:relative;border:0;background:none;cursor:pointer;font-size:22px;" +
        "line-height:1;padding:0;}" +
      ".pk-odul.pk-alindi{filter:grayscale(1) brightness(.9);}" +
      ".pk-nokta{position:absolute;right:-2px;bottom:-1px;width:9px;height:9px;border-radius:50%;" +
        "background:#e03a3a;box-shadow:0 1px 3px rgba(0,20,45,.5);}" +
      ".pk-yeni{position:absolute;left:-2px;top:-2px;width:9px;height:9px;border-radius:50%;" +
        "background:#39c46a;}" +
      ".posta-bos{padding:26px 10px;text-align:center;color:#cfe4ff;font-family:'Baloo 2',sans-serif;" +
        "font-weight:700;font-size:13px;text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".posta-eylem{display:flex;gap:6px;margin-top:7px;}" +
      ".posta-eylem button{border:0;cursor:pointer;border-radius:8px;padding:6px 10px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:11.5px;color:#e8f4ff;" +
        "background:linear-gradient(180deg,#3d7ccc,#22488f);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}";
    document.head.appendChild(st2);
  }

  /* ── İSKELET ──────────────────────────────────────────────── */
  var panel = null;

  function iskelet() {
    if (document.getElementById("panel-posta")) return;

    /* Eski günlük paneli varsa AYNI kapsayıcıya konur, sonra o
       kaldırılır: iki liste yolu bir arada durmaz. */
    var eski = document.getElementById("panel-battlelog");
    var kap = (eski && eski.parentNode) ? eski.parentNode : document.body;

    panel = document.createElement("div");
    panel.className = "overlay-panel";
    panel.id = "panel-posta";
    panel.innerHTML =
      '<div class="overlay-card">' +
        '<button class="overlay-close" data-close>✕</button>' +
        "<h2>✉️ POSTA</h2>" +
        '<div class="posta-sekmeler" id="postaSekmeler"></div>' +
        '<div class="posta-arac">' +
          '<button id="postaSilBtn">🗑 Okunmuş Postaları Sil</button>' +
          '<button id="postaHepsiBtn">📩 Tümünü Oku ve Al</button>' +
        "</div>" +
        '<div class="posta-liste" id="postaListe"></div>' +
      "</div>";
    kap.appendChild(panel);

    if (eski) eski.remove();

    sekmeleriCiz();

    /* Kapatma ve zemin dokunuşu kendi dinleyicimizle: setupNav
       açılışta çalıştı, sonradan eklenen panele bağlanmadı. */
    panel.addEventListener("click", function (e) {
      if (e.target === panel || (e.target.closest && e.target.closest("[data-close]"))) kapat();
    });

    var silBtn = document.getElementById("postaSilBtn");
    var hepsiBtn = document.getElementById("postaHepsiBtn");
    if (silBtn) silBtn.addEventListener("click", okunmuslariSil);
    if (hepsiBtn) hepsiBtn.addEventListener("click", tumunuOkuVeAl);

    document.getElementById("postaListe").addEventListener("click", listeDokunus);
  }

  function sekmeleriCiz() {
    var el = document.getElementById("postaSekmeler");
    if (!el) return;
    el.innerHTML = SEKMELER.map(function (s) {
      var n = okunmamisSayisi(s.id);
      return '<button class="posta-sekme' + (s.id === aktifSekme ? " secili" : "") +
             '" data-sekme="' + s.id + '">' +
             '<span class="ps-ad">' + s.ad + "</span>" +
             (n ? '<span class="ps-rozet">' + (n > 99 ? "99+" : n) + "</span>" : "") +
             "</button>";
    }).join("");
    Array.prototype.forEach.call(el.querySelectorAll(".posta-sekme"), function (b) {
      b.addEventListener("click", function () { sekmeSec(b.dataset.sekme); });
    });
  }

  function sekmeSec(id) {
    if (!id || id === aktifSekme) return;
    aktifSekme = id;
    sekmeleriCiz();
    listeyiCiz(true);
  }

  /* ── LİSTE ────────────────────────────────────────────────── */
  function kartHTML(p, i) {
    var d = damga();
    var okundu = !!d.ok[p.id];
    var yildiz = !!d.yz[p.id];
    var ikon = p.ikonGorsel
      ? '<img src="' + p.ikonGorsel + '" alt="">'
      : "<span>" + p.ikonEmoji + "</span>";
    var odulHTML = "";
    if (p.odul) {
      var alindi = !!p.odul.alindi;
      odulHTML = '<button class="pk-odul' + (alindi ? " pk-alindi" : "") +
                 '" data-odul="' + i + '" title="Ödül">🎁' +
                 (alindi ? "" : '<span class="pk-nokta"></span>') + "</button>";
    }
    return '<div class="posta-kart' + (okundu ? " pk-okundu" : "") + '" data-idx="' + i + '">' +
             '<div class="pk-ikon">' + ikon + "</div>" +
             '<div class="pk-orta">' +
               '<div class="pk-baslik' + (p.kazandi === false ? " pk-yenilgi" : "") + '">' +
                 p.baslik + "</div>" +
               '<div class="pk-onizleme">' + p.onizleme + "</div>" +
               '<div class="pk-zaman">' + tarihYaz(p.zaman) + "</div>" +
             "</div>" +
             '<div class="pk-sag">' +
               '<button class="pk-yildiz" data-yildiz="' + i + '">' + (yildiz ? "★" : "☆") + "</button>" +
               odulHTML +
             "</div>" +
           "</div>";
  }

  var _gorunen = [];   /* ekranda duran postalar — dokunuş sırası buradan */

  function listeyiCiz(hareketli) {
    var el = document.getElementById("postaListe");
    if (!el) return;
    _gorunen = sekmeninPostalari(aktifSekme);

    if (!_gorunen.length) {
      el.innerHTML = '<div class="posta-bos">' +
        (aktifSekme === "ittifak"
          ? "İttifak sistemi henüz açılmadı."
          : "Bu sekmede posta yok.") + "</div>";
      return;
    }

    el.innerHTML = _gorunen.map(kartHTML).join("");

    if (hareketli !== false && !kapaliHareket()) {
      Array.prototype.forEach.call(el.querySelectorAll(".posta-kart"), function (k, i) {
        if (i > 9) return;                       /* uzun listede ilk 10 kart */
        k.animate(
          [{ opacity: 0, transform: "translateY(10px)" },
           { opacity: 1, transform: "translateY(0)" }],
          { duration: 220, delay: i * 28, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" }
        );
      });
    }
  }

  function kapaliHareket() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /* ── DOKUNUŞ ──────────────────────────────────────────────── */
  function listeDokunus(e) {
    var yb = e.target.closest ? e.target.closest("[data-yildiz]") : null;
    if (yb) {
      yildizDegistir(_gorunen[parseInt(yb.dataset.yildiz, 10)]);
      return;
    }
    var ob = e.target.closest ? e.target.closest("[data-odul]") : null;
    if (ob) {
      var po = _gorunen[parseInt(ob.dataset.odul, 10)];
      if (po && po.tur === "log" && typeof odulKutusunuAc === "function") {
        odulKutusunuAc(po.kaynakIdx);
        listeyiCiz(false);
      }
      return;
    }
    var kart = e.target.closest ? e.target.closest(".posta-kart") : null;
    if (kart) postayiAc(_gorunen[parseInt(kart.dataset.idx, 10)]);
  }

  function yildizDegistir(p) {
    if (!p) return;
    var d = damga();
    if (d.yz[p.id]) delete d.yz[p.id]; else d.yz[p.id] = 1;
    yaz();
    sekmeleriCiz();
    listeyiCiz(false);
  }

  function okunduIsaretle(p) {
    if (!p) return false;
    var d = damga();
    if (d.ok[p.id]) return false;
    d.ok[p.id] = 1;
    return true;
  }

  function postayiAc(p) {
    if (!p) return;
    var degisti = okunduIsaretle(p);
    if (degisti) { yaz(); sekmeleriCiz(); listeyiCiz(false); }

    if (p.tur === "log") {
      if (p.en.pvp) {
        if (typeof openReportModal === "function" && typeof entryToReport === "function") {
          openReportModal(entryToReport(p.en));
        } else if (typeof showToast === "function") {
          showToast("Rapor penceresi yüklenmedi (tema.js).");
        }
      } else if (typeof openLogReportModal === "function") {
        openLogReportModal(p.en);
      }
      return;
    }
    /* Sistem postası: metin uzun olabilir, toast yerine kart altında açılır */
    sistemMetniAc(p);
  }

  function sistemMetniAc(p) {
    var el = document.getElementById("postaListe");
    if (!el) return;
    var kart = el.querySelector('.posta-kart[data-idx="' + _gorunen.indexOf(p) + '"]');
    if (!kart) return;
    var eski = kart.querySelector(".pk-tam");
    if (eski) { eski.remove(); return; }
    var kutu = document.createElement("div");
    kutu.className = "pk-tam";
    kutu.style.cssText = "flex:1 1 100%;font-size:12px;color:#25334d;margin-top:6px;";
    kutu.textContent = (p.kayit && p.kayit.tam) ? p.kayit.tam : p.onizleme;
    kart.appendChild(kutu);
    if (!kapaliHareket()) {
      kutu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
    }
  }

  /* ── ARAÇ DÜĞMELERİ ───────────────────────────────────────── */
  function tumunuOkuVeAl() {
    var d = damga();
    var liste = sekmeninPostalari(aktifSekme);
    var okundu = 0, alinan = 0;

    liste.forEach(function (p) {
      if (!d.ok[p.id]) { d.ok[p.id] = 1; okundu++; }
    });

    /* Ödüller battleLogHistory sırası DEĞİŞMEDEN alınmalı:
       odulKutusunuAc yalnız damga yazar, diziyi kısaltmaz. */
    liste.forEach(function (p) {
      if (p.tur !== "log" || !p.odul || p.odul.alindi) return;
      if (typeof odulKutusunuAc === "function") { odulKutusunuAc(p.kaynakIdx); alinan++; }
    });

    yaz();
    sekmeleriCiz();
    listeyiCiz(false);
    if (typeof showToast === "function") {
      showToast("📩 " + okundu + " posta okundu" + (alinan ? ", " + alinan + " ödül alındı" : "") + ".");
    }
  }

  function okunmuslariSil() {
    var d = damga();
    var s = st();
    if (!s) return;
    var silinen = 0;

    /* 1) Sistem postaları */
    if (aktifSekme === "sistem" || aktifSekme === "yildizli") {
      var kalanS = sistemKayitlari().filter(function (k) {
        var id = sistemId(k);
        var sil = !!d.ok[id] && (aktifSekme !== "yildizli" || !!d.yz[id]);
        if (sil) { silinen++; delete d.ok[id]; delete d.yz[id]; }
        return !sil;
      });
      s.postaSistem = kalanS;
    }

    /* 2) Savaş kayıtları */
    if (aktifSekme !== "sistem" && aktifSekme !== "ittifak") {
      var eskiLog = gunluk();
      var kalanLog = eskiLog.filter(function (en, i) {
        var p = logPostasi(en, i);
        var buSekme = (aktifSekme === "yildizli") ? !!d.yz[p.id] : (p.sekme === aktifSekme);
        var sil = buSekme && !!d.ok[p.id];
        if (sil) { silinen++; delete d.ok[p.id]; delete d.yz[p.id]; }
        return !sil;
      });

      if (kalanLog.length !== eskiLog.length) {
        if (!kalanLog.length) {
          /* Boş liste yalnız bu kapıdan yazılabilir (izin bayrağı orada) */
          if (typeof clearBattleLogHistory === "function") clearBattleLogHistory();
        } else {
          s.battleLogHistory = kalanLog;
          if (typeof saveBattleLogLocal === "function") saveBattleLogLocal();
          if (typeof queueLogSave === "function") queueLogSave();
        }
      }
    }

    yaz();
    sekmeleriCiz();
    listeyiCiz(false);
    if (typeof showToast === "function") {
      showToast(silinen ? "🗑 " + silinen + " okunmuş posta silindi." : "Silinecek okunmuş posta yok.");
    }
  }

  /* ── SİSTEM POSTASI YAZMA KAPISI ──────────────────────────────
     Başka dosyalar bunu çağırır:
       POSTA.sistemEkle({ id:"bina", baslik:"İnşaat bitti",
                          metin:"Hastane Sv.3 tamamlandı",
                          tam:"…", ikon:"🏗️" })
     `at` verilmezse şimdiki zaman yazılır. Liste 50'de kırpılır. */
  function sistemEkle(k) {
    var s = st();
    if (!s || !k) return null;
    var kayit = {
      id: k.id || "sis",
      baslik: k.baslik || "Sistem",
      metin: k.metin || "",
      tam: k.tam || k.metin || "",
      ikon: k.ikon || "⚙️",
      gorsel: k.gorsel || "",
      at: k.at || Date.now()
    };
    var liste = sistemKayitlari();
    liste.unshift(kayit);
    if (liste.length > 50) liste.length = 50;
    yaz();
    if (panel && panel.classList.contains("active")) { sekmeleriCiz(); listeyiCiz(false); }
    return kayit;
  }

  /* ── AÇ / KAPAT ───────────────────────────────────────────── */
  function ac(sekme) {
    iskelet();
    if (!panel) return;
    if (typeof tumPanelleriKapat === "function") tumPanelleriKapat("posta");
    if (sekme) aktifSekme = sekme;
    panel.classList.add("active");

    /* Hayalet dokunma — açılış dokunuşu panele sarkmasın */
    clearTimeout(panel._hayaletZm);
    panel.style.pointerEvents = "none";
    panel._hayaletZm = setTimeout(function () { panel.style.pointerEvents = ""; }, 350);

    /* Bulut günlüğü ilk açılışta insin (eski battlelog davranışı) */
    if (!window._gunlukIndi) {
      window._gunlukIndi = true;
      if (typeof loadBattleLog === "function") loadBattleLog();
    }

    sekmeleriCiz();
    listeyiCiz(true);

    var kart = panel.querySelector(".overlay-card");
    if (kart && !kapaliHareket()) {
      kart.animate(
        [{ opacity: 0, transform: "translateY(26px) scale(.98)" },
         { opacity: 1, transform: "translateY(0) scale(1)" }],
        { duration: 260, easing: "cubic-bezier(.2,.85,.3,1)" }
      );
    }
  }

  function kapat() {
    if (panel) panel.classList.remove("active");
  }

  /* ── ALT MENÜ DÜĞMESİNİ POSTAYA BAĞLA ─────────────────────────
     setupNav dinleyiciyi `() => openOverlayPanel(btn.dataset.panel)`
     olarak kurdu; değeri TIKLAMA anında okuyor. Bu yüzden düğmenin
     data-panel'ini değiştirmek yeterli, ikinci dinleyici eklenmez. */
  function dockBagla() {
    var btn = document.querySelector('.dock-btn[data-panel="battlelog"]');
    if (btn) {
      btn.dataset.panel = "posta";
      var im = btn.querySelector("img");
      if (im) im.alt = "Posta";
    }
    var orij = window.openOverlayPanel;
    if (typeof orij === "function" && !orij.__postaWrapped) {
      var sarmal = function (key) {
        if (key === "posta") { ac(); return; }
        return orij.apply(this, arguments);
      };
      sarmal.__postaWrapped = true;
      window.openOverlayPanel = sarmal;
    }
  }

  /* Buluttan günlük indiğinde index.html bunu çağırır — tek render
     yolu olsun diye kendi tazelememize bağlıyoruz. */
  function renderBagla() {
    window.renderBattleLogPanel = function () {
      if (panel && panel.classList.contains("active")) { sekmeleriCiz(); listeyiCiz(false); }
    };
  }

  /* ═══ BAŞLAT ═══ */
  function baslat() {
    stilBas();
    iskelet();
    dockBagla();
    renderBagla();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", baslat);
  } else {
    baslat();
  }

  window.POSTA = {
    SURUM: SURUM,
    ac: ac,
    kapat: kapat,
    sekmeler: SEKMELER,
    sistemEkle: sistemEkle,
    tazele: function () { sekmeleriCiz(); listeyiCiz(false); },
    tani: function () {
      var o = { surum: SURUM, aktif: aktifSekme, panelVar: !!document.getElementById("panel-posta") };
      SEKMELER.forEach(function (s) {
        o[s.id] = sekmeninPostalari(s.id).length + " (okunmamış " + okunmamisSayisi(s.id) + ")";
      });
      return o;
    }
  };
})();
