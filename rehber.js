/* ═══════════════════════════════════════════════════════════════════════
   rehber.js — OYUN İÇİ REHBERLİK MERKEZİ
   ───────────────────────────────────────────────────────────────────────
   Paneller:
     1) HOŞ GELDİN — yeni KAYIT olan oyunculara Revolia + 5.000.000 elmas (bir kez).
     2) GÜNLÜK KEŞİF — her gün saat 17:00'de yenilenir, TÜM oyunculara Revolia +
        50.000 elmas + 5 mor kahraman parçası (oyuna girince, günde bir kez).

   Bu dosya global degiskenlere GUVENMEZ; ana kod state + api'yi ARGUMAN verir:
       window.REHBER.maybeWelcome(state, api)
       window.REHBER.maybeDaily(state, api)
   api = { fmt, renderDiamonds, updateShopButtons, persistCurrentState, showToast }
   gorsel21.webp = Revolia gorseli.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  const REVOLIA_IMG = "gorsel21.webp";
  const WELCOME_GIFT = 5000000;
  const DAILY_GIFT = 50000;
  const DAILY_PARCA = 5;            // günlük keşifte verilen mor parça adedi
  const DAILY_PARCA_ANAHTAR = "mor";
  const DAILY_HOUR = 17; // günlük ödül bu saatte (yerel) yenilenir

  function fmtOf(api, n) {
    try { return (api && typeof api.fmt === "function") ? api.fmt(n) : String(n); }
    catch (e) { return String(n); }
  }

  /* Saat 17:00 sınırlı günlük döngü kimliği. 17:00'den önce → dünkü döngü. */
  function dailyCycleId() {
    var now = new Date();
    var b = new Date(now); b.setHours(DAILY_HOUR, 0, 0, 0);
    if (now < b) b.setDate(b.getDate() - 1);
    return b.getFullYear() + "-" + (b.getMonth() + 1) + "-" + b.getDate();
  }

  function ensureCSS() {
    if (document.getElementById("welcomeCss")) return;
    var st = document.createElement("style");
    st.id = "welcomeCss";
    st.textContent = `
      #welcomeBack{ position:fixed;inset:0;z-index:9997;background:rgba(2,8,22,.72);
        display:flex;align-items:flex-end;justify-content:center;padding:0 14px 24px;
        font-family:'Baloo 2','Nunito',sans-serif; animation:wcFade .2s ease; }
      @keyframes wcFade{from{opacity:0}to{opacity:1}}
      #welcomeBack .wc-hero{ width:min(340px,80vw); max-height:52vh; object-fit:contain;
        object-position:bottom center; margin-bottom:-2px; filter:drop-shadow(0 8px 24px rgba(0,20,45,.6));
        pointer-events:none; }
      #welcomeBack .wc-box{ position:relative; width:min(400px,94vw);
          linear-gradient(180deg,#1fa3ea,#0e6fc0);
        border:1px solid rgba(190,240,255,.85); border-radius:20px; padding:16px 16px 18px;
        box-shadow:none;
        color:#fff; animation:wcPop .28s cubic-bezier(.34,1.56,.64,1); }
      @keyframes wcPop{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}
      #welcomeBack .wc-skip{ position:absolute;top:-12px;right:10px;border:none;cursor:pointer;
        background:linear-gradient(180deg,#8894ad,#4a566e);color:#fff;font-weight:800;font-size:11px;
        padding:5px 12px;border-radius:999px;box-shadow:none; }
      #welcomeBack .wc-name{ font-weight:900;font-size:15px;color:#ffd257;margin-bottom:6px;
        text-shadow:0 2px 4px rgba(0,40,70,.6); }
      #welcomeBack .wc-text{ font-weight:800;font-size:14.5px;line-height:1.4;color:#fff;
        text-shadow:0 1px 3px rgba(0,30,55,.55); min-height:66px; }
      #welcomeBack .wc-giftline{ font-weight:800;font-size:14px;line-height:1.35;color:#fff;
        text-shadow:0 1px 3px rgba(0,30,55,.55); text-align:center; margin-bottom:4px; }
      #welcomeBack .wc-gift{ text-align:center;padding:6px 0 4px; }
      #welcomeBack .wc-gift .amt{ font-weight:900;font-size:34px;color:#fff;
        text-shadow:0 3px 8px rgba(0,40,70,.6);letter-spacing:.5px; }
      #welcomeBack .wc-next{ display:block;width:100%;margin-top:12px;border:none;cursor:pointer;
        border-radius:14px;padding:13px;font-family:inherit;font-weight:900;font-size:16px;color:#fff;
        background:linear-gradient(180deg,#4fd8ff,#1fa3ea);border:1px solid rgba(190,240,255,.9);
        text-shadow:0 2px 3px rgba(0,40,70,.5);
        box-shadow:none; }
      #welcomeBack .wc-next:active{ transform:scale(.96); filter:brightness(.93);box-shadow:none; }
      #welcomeBack .wc-parca{ display:flex;align-items:center;justify-content:center;gap:10px;
        margin:2px auto 0; width:fit-content; padding:8px 14px; border-radius:12px;
        background:rgba(255,255,255,.12); border:1px solid rgba(190,240,255,.20);
        box-shadow:0 2px 6px rgba(0,20,45,.3); }
      #welcomeBack .wc-parca img{ width:44px;height:44px;object-fit:contain; }
      #welcomeBack .wc-parca b{ font-weight:900;font-size:15px;color:#fff;
        text-shadow:0 1px 2px rgba(0,20,45,.55); }
    `;
    document.head.appendChild(st);
  }

  /* Parça kutucuğu. Görsel adı tek yerden: gelistir.js parcaGorseli(). */
  function parcaKutusu(cfg) {
    if (!cfg.parca || !(cfg.parca.adet > 0)) return "";
    var g = "";
    try {
      if (typeof window.parcaGorseli === "function") g = window.parcaGorseli(cfg.parca.anahtar) || "";
    } catch (e) {}
    return '<div class="wc-parca">' +
      (g ? '<img src="' + g + '" alt="" onerror="this.style.display=\'none\'">' : '') +
      '<b>' + cfg.parca.adet + ' ' + (cfg.parca.ad || "Kahraman Parçası") + '</b></div>';
  }

  /* Paneli kurar. cfg = { gift, giftName, steps, claim, parca } */
  function buildAndShow(state, api, cfg) {
    if (!state || !cfg) return;
    if (document.getElementById("welcomeBack")) return;
    ensureCSS();

    var steps = cfg.steps, idx = 0;

    var back = document.createElement("div");
    back.id = "welcomeBack";
    back.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;width:100%;max-width:420px">' +
        '<img class="wc-hero" src="' + REVOLIA_IMG + '" alt="Revolia" onerror="this.style.display=\'none\'">' +
        '<div class="wc-box" id="welcomeBox">' +
          '<button class="wc-skip">Geç ✕</button>' +
          '<div class="wc-body"></div>' +
          '<button class="wc-next">Devam</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(back);

    var bodyEl = back.querySelector(".wc-body");
    var nextEl = back.querySelector(".wc-next");
    var skipEl = back.querySelector(".wc-skip");

    function render() {
      var step = steps[idx];
      var last = idx === steps.length - 1;
      skipEl.style.display = last ? "none" : "block";
      if (step.gift) {
        bodyEl.innerHTML =
          '<div class="wc-name">' + (cfg.giftName || "🎁 HEDİYEN HAZIR") + '</div>' +
          (step.giftText ? '<div class="wc-giftline">' + step.giftText + '</div>' : '') +
          '<div class="wc-gift"><div class="amt">' + fmtOf(api, cfg.gift) + ' ' + ELMAS("rehber") + '</div></div>' +
          parcaKutusu(cfg);
        nextEl.textContent = "Al";
      } else {
        bodyEl.innerHTML =
          '<div class="wc-name">Revolia</div>' +
          '<div class="wc-text">' + step.text + '</div>';
        nextEl.textContent = "Devam";
      }
    }

    function grant() {
      state.diamonds = (state.diamonds || 0) + cfg.gift;
      /* Ödül parçası ÇANTAYA düşer, havuza değil — hangi kahramana
         harcanacağına oyuncu karar verir. Eskiden doğrudan havuza
         yazılıyordu ve oyuncu parçayı çantada bulamıyordu. */
      if (cfg.parca && cfg.parca.adet > 0) {
        try {
          if (typeof window.parcaCantayaEkle === "function")
            window.parcaCantayaEkle(cfg.parca.anahtar, cfg.parca.adet);
          else if (typeof window.parcaEkle === "function")
            window.parcaEkle(cfg.parca.anahtar, cfg.parca.adet);
        } catch (e) {}
      }
      if (typeof cfg.claim === "function") { try { cfg.claim(state); } catch (e) {} }
      if (api) {
        try { api.renderDiamonds && api.renderDiamonds(); } catch (e) {}
        try { api.updateShopButtons && api.updateShopButtons(); } catch (e) {}
        try { api.persistCurrentState && api.persistCurrentState(); } catch (e) {}
      }
      back.remove();
      var mesaj = "🎁 +" + fmtOf(api, cfg.gift) + " 💎" +
        (cfg.parca && cfg.parca.adet > 0 ? " ve " + cfg.parca.adet + " " + (cfg.parca.ad || "parça") : "") +
        " hesabına eklendi!";
      if (api) { try { api.showToast && api.showToast(mesaj); } catch (e) {} }
    }

    nextEl.onclick = function () {
      if (idx < steps.length - 1) { idx++; render(); return; }
      grant();
    };
    skipEl.onclick = function () { idx = steps.length - 1; render(); };

    render();
  }

  /* Oyun ekranı hazır + günlük ödül penceresi kapalı + başka rehber paneli yokken göster. */
  function poll(eligible, showFn) {
    if (!eligible()) return;
    var tries = 0;
    var tick = function () {
      if (!eligible()) return;
      var app = document.getElementById("appScreen");
      var appVisible = app && getComputedStyle(app).display !== "none";
      var dr = document.getElementById("dailyRewardOverlay");
      var drOpen = dr && getComputedStyle(dr).display !== "none";
      var wb = document.getElementById("welcomeBack");
      if (appVisible && !drOpen && !wb) { showFn(); return; }
      if (++tries > 600) return; // ~5 dk güvenlik
      setTimeout(tick, 500);
    };
    setTimeout(tick, 400);
  }

  var WELCOME_CFG = {
    gift: WELCOME_GIFT,
    giftName: "🎁 HEDİYEN HAZIR",
    steps: [
      { text: "Merhaba, oyunumuza hoş geldin! Ben Revolia. Elektrik enerjisi ve üstün yazılımım ile oluşturulmuş yeni nesil Robotum." },
      { text: "Yer altı kaynaklarından yüksek miktarda elmas çıkardık; izninle bunları sana sunmak istiyorum." },
      { gift: true }
    ],
    claim: function (s) { s.welcomeGiven = true; s.welcomePending = false; }
  };

  /* Yeni kayıt: 5M hoş geldin (bir kez). */
  function maybeWelcome(state, api) {
    poll(
      function () { return state && state.welcomeGiven !== true && state.welcomePending === true; },
      function () { buildAndShow(state, api, WELCOME_CFG); }
    );
  }

  /* Günlük keşif: her gün 17:00'de yenilenir, 50.000 elmas + 5 mor parça. */
  function maybeDaily(state, api) {
    if (!state) return;
    var cfg = {
      gift: DAILY_GIFT,
      giftName: "🎁 KEŞİF ÖDÜLÜ",
      parca: { anahtar: DAILY_PARCA_ANAHTAR, adet: DAILY_PARCA, ad: "Mor Parça" },
      steps: [
        { text: "Tekrardan Merhaba! Orduna düzenli olarak sahip çıktığın için ordunuz sizin için arazide keşife çıktı..." },
        { gift: true, giftText: "Keşifte sizin için değerli elmaslar ve kahraman parçaları buldu! 🎉" }
      ],
      claim: function (s) { s.lastDailyExplore = dailyCycleId(); }
    };
    poll(
      function () { return state && state.lastDailyExplore !== dailyCycleId(); },
      function () { buildAndShow(state, api, cfg); }
    );
  }

  window.REHBER = {
    maybeWelcome: maybeWelcome,
    maybeDaily: maybeDaily,
    showWelcome: function (state, api) { buildAndShow(state, api, WELCOME_CFG); },
  };

  console.log("[rehber.js] Rehberlik merkezi yuklendi ✔");
})();
