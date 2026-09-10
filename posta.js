/* posta.js — POSTA (MESAJ KUTUSU): 5 SEKMELİ
   ═══════════════════════════════════════════════════════════════
   NE VAR
   Posta, ekranın SAĞ ALT köşesindeki yüzen düğmeden açılır
   (#postaYuzenBtn, okunmamış rozetiyle). Alt menüdeki 5. sıra
   İttifak'a verildi. Panel #panel-posta; üstte sekme şeridi,
   ortada liste ya da detay, altta iki toplu düğme.

     Savaşlar  → state.battleLogHistory içindeki PvP kayıtları
     Raporlar  → state.battleLogHistory içindeki canavar kayıtları
     Sistem    → state.postaSistem  (POSTA.sistemEkle ile yazılır)
     İttifak   → BOŞ. Oyunda ittifak sistemi yok; sekme duruyor,
                 üyelik/kanal verisi doğduğunda buraya bağlanacak.
     Yıldızlı  → yıldızlanan postaların birleşik listesi

   İKİ EKRAN, TEK PANEL
   Liste ve DETAY sayfası aynı kartın içinde; biri gizlenir.
   Karta ya da 🎁 kutusuna dokununca detay açılır: üstte posta
   başlığı, altında açıklama, ödül kutusu + yeşil "Topla" ve
   ayrı bir "Savaş Raporunu Aç" düğmesi. Ödül ARTIK LİSTEDEN
   alınmaz, yalnız buradan. Rapor penceresi kendiliğinden açılmaz.
   Alt şerit (Okunmuş Postaları Sil · Tümünü Oku ve Al) panelin
   en altında, iki ekranda da aynı yerde durur.

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

   INDEX.HTML TARAFI (birlikte verilen dosyada YAPILDI)
     · <script src="posta.js"></script>  (etkinlik.js'ten sonra)
     · dock düğmesi data-panel="posta"
     · PANEL_ORDER'da battlelog → posta
     · silinenler: #panel-battlelog bloğu ve CSS'i,
       renderBattleLogPanel(), formatLogTime(), clearBattleLogBtn
       bağlaması, openOverlayPanel'in battlelog dalı
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
      /* TAM EKRAN: pencere içeriğe göre büyüyüp küçülmez. Başlık,
         sekmeler ve araç şeridi hep aynı yerde durur; yalnız liste
         kayar. Boş sekmede de pencere aynı boyda kalır. */
      "#panel-posta{align-items:stretch !important;justify-content:stretch !important;}" +
      "#panel-posta .overlay-card{width:100% !important;max-width:none !important;" +
        "height:100% !important;max-height:none !important;border-radius:0 !important;" +
        "display:flex !important;flex-direction:column !important;overflow:hidden !important;" +
        "padding:calc(12px + env(safe-area-inset-top)) 12px calc(10px + env(safe-area-inset-bottom));}" +
      "#panel-posta .posta-bas,#panel-posta .posta-sekmeler,#panel-posta .posta-arac{flex:0 0 auto;}" +

      /* ── SAĞ ALT KÖŞEDEKİ YÜZEN POSTA DÜĞMESİ ──
         Alt menüden çıkarıldı; sohbet şeridinin (bottom:52px)
         üstünde durur.
         48px'lik çıplak görselden 42px'lik TEMA KUTUSUNA alındı:
         zemin/çerçeve/köşe değerleri üst menüyle aynı --km-*
         değişkenlerinden gelir, tema değişince kutu da değişir. */
      "#postaYuzenBtn{position:fixed;right:10px;bottom:96px;z-index:20;width:42px;height:42px;" +
        "padding:0;cursor:pointer;border-radius:11px;" +
        "display:flex;align-items:center;justify-content:center;" +
        "background:linear-gradient(180deg,var(--km-1),var(--km-2) 55%,var(--km-3));" +
        "border:1px solid var(--km-kenar);" +
        "filter:drop-shadow(0 6px 10px rgba(0,0,0,.45));}" +
      "#postaYuzenBtn:active{transform:scale(.96);filter:brightness(.93);}" +
      "#postaYuzenBtn img{width:26px;height:26px;object-fit:contain;display:block;}" +
      "#postaYuzenBtn .py-emoji{font-size:22px;line-height:1;}" +
      "#postaYuzenBtn .py-rozet{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;" +
        "padding:0 5px;border-radius:10px;background:#e03a3a;color:#fff;font-family:'Baloo 2',sans-serif;" +
        "font-weight:900;font-size:11px;line-height:18px;font-variant-numeric:tabular-nums;" +
        "box-shadow:0 1px 3px rgba(0,20,45,.5);}" +

      /* başlık satırı: solda geri oku, ortada ad, sağda kapat */
      ".posta-bas{display:flex;align-items:center;gap:8px;margin-bottom:10px;}" +
      "#panel-posta .posta-bas h2{flex:1 1 auto;margin:0;text-align:left;}" +
      ".posta-geri{border:0;background:none;cursor:pointer;font-size:22px;line-height:1;" +
        "color:#dff0ff;padding:0 2px;visibility:hidden;}" +
      "#panel-posta .posta-bas .overlay-close{position:static !important;flex:0 0 auto;}" +
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
      ".posta-arac{display:flex;gap:6px;margin:8px 0 0;}" +
      ".posta-arac button{flex:1 1 0;border:0;cursor:pointer;border-radius:9px;padding:8px 4px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:11px;color:#e8f4ff;" +
        "background:linear-gradient(180deg,#3d7ccc,#22488f);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);text-shadow:0 1px 2px rgba(0,20,45,.55);}" +

      /* liste */
      ".posta-liste{flex:1 1 auto;min-height:0;overflow-y:auto;padding:2px;display:flex;" +
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
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +

      /* ── DETAY SAYFASI ── */
      ".posta-detay{flex:1 1 auto;min-height:0;overflow-y:auto;padding:2px;display:none;}" +
      ".pd-ust{display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;" +
        "background:linear-gradient(180deg,#fbfdff,#e6eef8);box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".pd-ikon{flex:0 0 54px;width:54px;height:54px;border-radius:10px;overflow:hidden;" +
        "background:#dfe7f2;display:flex;align-items:center;justify-content:center;font-size:26px;}" +
      ".pd-ikon img{width:100%;height:100%;object-fit:cover;display:block;}" +
      ".pd-ust-yazi{min-width:0;}" +
      ".pd-ad{font-family:'Baloo 2',sans-serif;font-weight:900;font-size:15px;color:#14203a;}" +
      ".pd-ad.pd-yenilgi{color:#8d2626;}" +
      ".pd-zaman{font-size:11px;color:#6a789a;font-variant-numeric:tabular-nums;margin-top:2px;}" +
      ".pd-metin{margin:10px 0;padding:10px;border-radius:12px;font-size:12.5px;line-height:1.45;" +
        "color:#25334d;background:linear-gradient(180deg,#fbfdff,#e6eef8);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".pd-baslik{font-family:'Baloo 2',sans-serif;font-weight:900;font-size:13px;color:#e8f4ff;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);margin:2px 0 6px;text-align:center;}" +
      ".pd-kutu{padding:12px 10px;border-radius:12px;background:linear-gradient(180deg,#fbfdff,#e6eef8);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".pd-odul-satir{display:flex;align-items:center;gap:10px;justify-content:center;}" +
      ".pd-odul{position:relative;width:64px;height:64px;border-radius:12px;background:#dfe7f2;" +
        "display:flex;align-items:center;justify-content:center;font-size:30px;" +
        "box-shadow:inset 0 0 0 2px rgba(20,60,110,.14);}" +
      ".pd-odul-adet{position:absolute;right:4px;bottom:2px;font-family:'Baloo 2',sans-serif;" +
        "font-weight:900;font-size:11px;color:#14203a;font-variant-numeric:tabular-nums;" +
        "text-shadow:0 1px 0 #fff;}" +
      ".pd-odul-ad{font-family:'Baloo 2',sans-serif;font-weight:800;font-size:13px;color:#25334d;}" +
      ".pd-topla{display:block;width:100%;margin-top:12px;border:0;cursor:pointer;border-radius:10px;" +
        "padding:11px 8px;font-family:'Baloo 2',sans-serif;font-weight:900;font-size:14px;color:#fff;" +
        "background:linear-gradient(180deg,#57c94f,#2e9a37);text-shadow:0 1px 2px rgba(0,40,10,.45);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".pd-topla.pd-alindi{background:linear-gradient(180deg,#b9c4d2,#8d9aab);cursor:default;}" +
      ".pd-rapor{display:block;width:100%;margin-top:10px;border:0;cursor:pointer;border-radius:10px;" +
        "padding:10px 8px;font-family:'Baloo 2',sans-serif;font-weight:800;font-size:13px;color:#e8f4ff;" +
        "background:linear-gradient(180deg,#3d7ccc,#22488f);text-shadow:0 1px 2px rgba(0,20,45,.55);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}";
    document.head.appendChild(st2);
  }

  /* ── İSKELET ──────────────────────────────────────────────── */
  var panel = null;

  function iskelet() {
    if (document.getElementById("panel-posta")) return;

    /* Diğer overlay panellerle AYNI kapsayıcıya konur; body'ye
       eklenirse üst katman sırası onlardan farklı olur. */
    var komsu = document.getElementById("panel-inventory");
    var kap = (komsu && komsu.parentNode) ? komsu.parentNode : document.body;

    panel = document.createElement("div");
    panel.className = "overlay-panel";
    panel.id = "panel-posta";
    panel.innerHTML =
      '<div class="overlay-card">' +
        '<div class="posta-bas">' +
          '<button class="posta-geri" id="postaGeriBtn">⬅</button>' +
          "<h2>✉️ POSTA</h2>" +
          '<button class="overlay-close" data-close>✕</button>' +
        "</div>" +
        '<div class="posta-sekmeler" id="postaSekmeler"></div>' +
        '<div class="posta-liste" id="postaListe"></div>' +
        '<div class="posta-detay" id="postaDetay"></div>' +
        '<div class="posta-arac">' +
          '<button id="postaSilBtn">🗑 Okunmuş Postaları Sil</button>' +
          '<button id="postaHepsiBtn">📩 Tümünü Oku ve Al</button>' +
        "</div>" +
      "</div>";
    kap.appendChild(panel);
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
    document.getElementById("postaDetay").addEventListener("click", detayDokunus);

    var geri = document.getElementById("postaGeriBtn");
    if (geri) geri.addEventListener("click", listeyeDon);
    gorunum("liste");
  }

  /* ── GÖRÜNÜM: liste ↔ detay ───────────────────────────────────
     İki ekran AYNI panelde durur, biri gizlenir. Ayrı bir katman
     açılmıyor; alt şerit ikisinde de aynı yerde kalıyor. */
  function gorunum(hangi) {
    var liste = document.getElementById("postaListe");
    var detay = document.getElementById("postaDetay");
    var sekme = document.getElementById("postaSekmeler");
    var geri = document.getElementById("postaGeriBtn");
    if (!liste || !detay) return;
    var detaydaMi = (hangi === "detay");
    liste.style.display = detaydaMi ? "none" : "flex";
    detay.style.display = detaydaMi ? "block" : "none";
    if (sekme) sekme.style.display = detaydaMi ? "none" : "flex";
    if (geri) geri.style.visibility = detaydaMi ? "visible" : "hidden";
  }

  function listeyeDon() {
    acikPosta = null;
    gorunum("liste");
    sekmeleriCiz();
    listeyiCiz(false);
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
    rozetTazele();
  }

  function sekmeSec(id) {
    if (!id || id === aktifSekme) return;
    acikPosta = null;
    gorunum("liste");
    aktifSekme = id;
    sekmeleriCiz();
    listeyiCiz(true);
  }

  /* ── LİSTE ────────────────────────────────────────────────── */
  function kartHTML(p, i) {
    var d = damga();
    var okundu = !!d.ok[p.id];
    var yildiz = !!d.yz[p.id];
    /* Görsel açılmazsa kırık simge kalıyordu; emojiye döner. */
    var ikon = p.ikonGorsel
      ? '<img src="' + p.ikonGorsel + '" alt="" onerror="this.onerror=null;' +
        "this.replaceWith(Object.assign(document.createElement('span')," +
        "{textContent:'" + p.ikonEmoji + "'}))\">"
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
      /* Ödül listede alınmaz; detay sayfasındaki Topla düğmesinden alınır */
      postayiAc(_gorunen[parseInt(ob.dataset.odul, 10)]);
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

  /* ── DETAY SAYFASI ────────────────────────────────────────────
     Karta ya da 🎁 kutusuna dokununca açılır. Ödül BURADAN alınır
     (Topla), savaş raporu ayrı düğmeyle açılır — sayfa açılırken
     rapor penceresi kendiliğinden gelmez. */
  var acikPosta = null;

  function detayHTML(p) {
    var aciklama;
    if (p.tur === "log") {
      var ad = temizAd(p.en.enemyPlainName || p.en.enemyName);
      aciklama = p.kazandi
        ? ad + " başarılı bir şekilde alt edildi, tebrikler!"
        : ad + " karşısında savaş kaybedildi.";
    } else {
      aciklama = (p.kayit && p.kayit.tam) ? p.kayit.tam : p.onizleme;
    }

    var odulBlok = "";
    if (p.odul) {
      var alindi = !!p.odul.alindi;
      odulBlok =
        '<div class="pd-baslik">Ödüller</div>' +
        '<div class="pd-kutu">' +
          '<div class="pd-odul-satir"><div class="pd-odul">' +
            '<span class="pd-odul-ikon">' + (p.odul.ikon || "🎁") + "</span>" +
            '<span class="pd-odul-adet">' +
              ((typeof fmt === "function") ? fmt(p.odul.miktar || 0) : (p.odul.miktar || 0)) +
            "</span></div>" +
            '<div class="pd-odul-ad">' + (p.odul.ad || "") + "</div>" +
          "</div>" +
          '<button class="pd-topla' + (alindi ? " pd-alindi" : "") + '" id="postaToplaBtn"' +
            (alindi ? " disabled" : "") + ">" + (alindi ? "Toplandı" : "Topla") + "</button>" +
        "</div>";
    }

    var raporBlok = (p.tur === "log")
      ? '<button class="pd-rapor" id="postaRaporBtn">📜 Savaş Raporunu Aç</button>'
      : "";

    return '<div class="pd-ust">' +
             '<div class="pd-ikon">' + (p.ikonGorsel
               ? '<img src="' + p.ikonGorsel + '" alt="">'
               : "<span>" + p.ikonEmoji + "</span>") + "</div>" +
             '<div class="pd-ust-yazi">' +
               '<div class="pd-ad' + (p.kazandi === false ? " pd-yenilgi" : "") + '">' + p.baslik + "</div>" +
               '<div class="pd-zaman">' + tarihYaz(p.zaman) + "</div>" +
             "</div>" +
           "</div>" +
           '<div class="pd-metin">' + aciklama + "</div>" +
           odulBlok + raporBlok;
  }

  function detayCiz() {
    var el = document.getElementById("postaDetay");
    if (!el || !acikPosta) return;
    el.innerHTML = detayHTML(acikPosta);
  }

  function postayiAc(p) {
    if (!p) return;
    if (okunduIsaretle(p)) yaz();
    acikPosta = p;
    gorunum("detay");
    detayCiz();
    var el = document.getElementById("postaDetay");
    if (el && !kapaliHareket()) {
      el.animate(
        [{ opacity: 0, transform: "translateX(18px)" },
         { opacity: 1, transform: "translateX(0)" }],
        { duration: 200, easing: "cubic-bezier(.2,.85,.3,1)" }
      );
    }
  }

  function detayDokunus(e) {
    if (!acikPosta) return;
    if (e.target.closest && e.target.closest("#postaToplaBtn")) {
      if (acikPosta.tur === "log" && typeof odulKutusunuAc === "function") {
        odulKutusunuAc(acikPosta.kaynakIdx);
        /* damga kayda yazıldı; sayfayı tazele */
        acikPosta.odul = (gunluk()[acikPosta.kaynakIdx] || {}).odul || acikPosta.odul;
        detayCiz();
      }
      return;
    }
    if (e.target.closest && e.target.closest("#postaRaporBtn")) {
      raporAc(acikPosta);
    }
  }

  function raporAc(p) {
    if (!p || p.tur !== "log") return;
    if (p.en.pvp) {
      if (typeof openReportModal === "function" && typeof entryToReport === "function") {
        openReportModal(entryToReport(p.en));
      } else if (typeof showToast === "function") {
        showToast("Rapor penceresi yüklenmedi (tema.js).");
      }
    } else if (typeof openLogReportModal === "function") {
      openLogReportModal(p.en);
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
    rozetTazele();
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

    acikPosta = null;
    gorunum("liste");
    sekmeleriCiz();
    listeyiCiz(true);

    var kart = panel.querySelector(".overlay-card");
    if (kart && !kapaliHareket()) {
      kart.animate(
        [{ opacity: 0, transform: "translateY(18px)" },
         { opacity: 1, transform: "translateY(0)" }],
        { duration: 260, easing: "cubic-bezier(.2,.85,.3,1)" }
      );
    }
  }

  function kapat() {
    if (panel) panel.classList.remove("active");
  }

  /* ── "posta" ANAHTARINI KARŞILA ───────────────────────────────
     Alt menüde posta düğmesi yok; yine de POSTA.ac() dışında
     openOverlayPanel("posta") ile açılabilsin diye sarmalanır
     (kaydırma sırası ve eski çağrılar için tek kapı). */
  function dockBagla() {
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
      else rozetTazele();          /* panel kapalıyken de rozet doğru kalsın */
    };
  }

  /* ═══ BAŞLAT ═══ */
  /* ── YÜZEN DÜĞME ──────────────────────────────────────────────
     Posta alt menüden çıktı (o yer İttifak'ın), sağ alt köşede
     duruyor. Rozet, bütün sekmelerdeki okunmamış toplamı. */
  /* Düğmenin kabı: GÖVDE DEĞİL, #appScreen.
     ── NEDEN ──
     Düğme document.body'ye ekleniyordu; #appScreen{display:none}
     iken bile gövde görünür olduğu için posta simgesi GİRİŞ ve
     YÜKLEME ekranında da duruyordu. Oyunun "açık mı" göstergesi
     tek yerde: #appScreen'in display'i (index.html 4907/4998).
     Düğmeyi onun içine koyunca ekranla birlikte kendiliğinden
     görünüp kayboluyor — ayrıca gizleme koduna, sınıfa, yoklamaya
     gerek kalmıyor. sefer.js de aynı sebeple kutusunu #appScreen'e
     taşımıştı (bkz. sefer.js 1267).
     position:fixed bozulmaz: #appScreen'de transform/filter yok,
     yani kapsayıcı blok hâlâ ekranın kendisi. */
  function kap() {
    return document.getElementById("appScreen") || document.body;
  }

  function yuzenKur() {
    var v = document.getElementById("postaYuzenBtn");
    if (v) {                       /* eski sürümden gövdede kalmışsa taşı */
      if (v.parentElement !== kap()) kap().appendChild(v);
      return;
    }
    var b = document.createElement("button");
    b.id = "postaYuzenBtn";
    b.setAttribute("aria-label", "Posta");
    b.innerHTML = '<img src="gorsel15.webp" alt="Posta" onerror="this.onerror=null;' +
      "this.replaceWith(Object.assign(document.createElement('span')," +
      "{textContent:'✉️',className:'py-emoji'}))\">" +
      '<span class="py-rozet" id="postaYuzenRozet" style="display:none"></span>';
    kap().appendChild(b);
    b.addEventListener("click", function () { ac(); });
    rozetTazele();
  }

  function rozetTazele() {
    var r = document.getElementById("postaYuzenRozet");
    if (!r) return;
    var n = 0;
    SEKMELER.forEach(function (s) {
      if (s.id === "yildizli") return;          /* yıldızlı kopya sayardı */
      n += okunmamisSayisi(s.id);
    });
    if (n > 0) { r.style.display = ""; r.textContent = (n > 99 ? "99+" : n); }
    else { r.style.display = "none"; }
  }

  function baslat() {
    stilBas();
    iskelet();
    yuzenKur();
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
