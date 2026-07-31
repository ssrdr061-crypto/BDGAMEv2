/* ═══════════════════════════════════════════════════════════════════════
   rehber.js — OYUN İÇİ REHBERLİK MERKEZİ
   ───────────────────────────────────────────────────────────────────────
   Paneller:
     1) HOŞ GELDİN — yeni KAYIT olan oyunculara Revolia + 1.500.000 elmas (bir kez).
     2) GÜNLÜK KEŞİF — her gün saat 17:00'de yenilenir, TÜM oyunculara Revolia +
        30.000 elmas (oyuna girince, günde bir kez).

   Bu dosya global degiskenlere GUVENMEZ; ana kod state + api'yi ARGUMAN verir:
       window.REHBER.maybeWelcome(state, api)
       window.REHBER.maybeDaily(state, api)
   api = { fmt, renderDiamonds, updateShopButtons, persistCurrentState, showToast }
   resimler/gorsel21.webp = Revolia gorseli.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  const REVOLIA_IMG = "resimler/gorsel21.webp";
  const WELCOME_GIFT = 1500000;
  const DAILY_GIFT = 30000;
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
        background:radial-gradient(ellipse 100% 50% at 50% 0%,rgba(170,240,255,.5),transparent 72%),
          radial-gradient(ellipse 80% 40% at 50% 105%,rgba(8,45,80,.55),transparent 75%),
          linear-gradient(180deg,#1fa3ea,#0e6fc0);
        border:3px solid rgba(190,240,255,.85); border-radius:20px; padding:16px 16px 18px;
        box-shadow:0 0 26px rgba(120,225,255,.45),inset 0 3px 0 rgba(255,255,255,.45);
        color:#fff; animation:wcPop .28s cubic-bezier(.34,1.56,.64,1); }
      @keyframes wcPop{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}
      #welcomeBack .wc-skip{ position:absolute;top:-12px;right:10px;border:none;cursor:pointer;
        background:linear-gradient(180deg,#8894ad,#4a566e);color:#fff;font-weight:800;font-size:11px;
        padding:5px 12px;border-radius:999px;box-shadow:0 3px 8px rgba(0,20,45,.4); }
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
        background:linear-gradient(180deg,#4fd8ff,#1fa3ea);border:2px solid rgba(190,240,255,.9);
        text-shadow:0 2px 3px rgba(0,40,70,.5);
        box-shadow:0 5px 0 #0e6fc0,inset 0 1px 0 rgba(255,255,255,.4); }
      #welcomeBack .wc-next:active{ transform:translateY(4px);box-shadow:0 1px 0 #0e6fc0; }
    `;
    document.head.appendChild(st);
  }

  /* Paneli kurar. cfg = { gift, giftName, steps, claim } */
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
          '<div class="wc-gift"><div class="amt">' + fmtOf(api, cfg.gift) + ' 💎</div></div>';
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
      if (typeof cfg.claim === "function") { try { cfg.claim(state); } catch (e) {} }
      if (api) {
        try { api.renderDiamonds && api.renderDiamonds(); } catch (e) {}
        try { api.updateShopButtons && api.updateShopButtons(); } catch (e) {}
        try { api.persistCurrentState && api.persistCurrentState(); } catch (e) {}
      }
      back.remove();
      if (api) { try { api.showToast && api.showToast("🎁 +" + fmtOf(api, cfg.gift) + " 💎 hesabına eklendi!"); } catch (e) {} }
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

  /* Yeni kayıt: 1.5M hoş geldin (bir kez). */
  function maybeWelcome(state, api) {
    poll(
      function () { return state && state.welcomeGiven !== true && state.welcomePending === true; },
      function () { buildAndShow(state, api, WELCOME_CFG); }
    );
  }

  /* Günlük keşif: her gün 17:00'de yenilenir, 30.000 elmas. */
  function maybeDaily(state, api) {
    if (!state) return;
    var cfg = {
      gift: DAILY_GIFT,
      giftName: "🎁 KEŞİF ÖDÜLÜ",
      steps: [
        { text: "Tekrardan Merhaba! Orduna düzenli olarak sahip çıktığın için ordunuz sizin için arazide keşife çıktı..." },
        { gift: true, giftText: "Keşifte sizin için değerli elmaslar buldu! 🎉" }
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
