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

   ÖDÜL UÇUŞU (window.ODUL_UCUS): "Al"a basılınca elmaslar HUD sayacına,
   parçalar çantaya uçar. Ödül VERME mantığına dokunmaz — grant() aynen
   çalışır, uçuş yalnız görsel katmandır. Modül burada tanımlıdır ki
   günlük ödül penceresi de aynı motoru kullanabilsin.
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

  /* ═══════════════════════════════════════════════════════════════════
     ÖDÜL UÇUŞU MOTORU
     ───────────────────────────────────────────────────────────────────
     TUZAK: prefers-reduced-motion tüm CSS animasyonunu öldürüyor, bu
     yüzden hareket rAF + Web Animations ile yazıldı, CSS keyframe YOK.
     TUZAK: renderDiamonds() her çağrıda persistCurrentState() yapıyor;
     uçuş sırasında sayaç DOĞRUDAN yazılır, tazeleme sona bırakılır.
     TUZAK: panel uçuş başlamadan kapanıyor — konumlar kapanmadan ÖNCE
     getBoundingClientRect ile alınıp saklanır.
     ═══════════════════════════════════════════════════════════════════ */
  var ODUL_UCUS = (function () {
    var KAT_ID = "odulUcusKat";

    function kat() {
      var k = document.getElementById(KAT_ID);
      if (!k) {
        k = document.createElement("div");
        k.id = KAT_ID;
        k.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:10050;overflow:visible";
        document.body.appendChild(k);
      }
      return k;
    }

    function azHareket() {
      try { return matchMedia("(prefers-reduced-motion: reduce)").matches; }
      catch (e) { return false; }
    }

    /* Ögeden de, saklanmış noktadan da konum alır. */
    function nokta(x) {
      if (!x) return null;
      if (typeof x.x === "number" && typeof x.y === "number") return { x: x.x, y: x.y };
      if (typeof x.getBoundingClientRect !== "function") return null;
      var r = x.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    /* Çıkış yavaş, varış hızlı — sayaca çekilme hissi buradan gelir. */
    function egriYap(us) {
      return function (t) { return t * t * (3 - 2 * t) * 0.10 + Math.pow(t, us) * 0.90; };
    }
    var EGRI = egriYap(3.6);

    function geriTepme(t) {
      var c = 2.2;
      return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    }

    function bezier(a, k, b, t) {
      var u = 1 - t;
      return { x: u * u * a.x + 2 * u * t * k.x + t * t * b.x,
               y: u * u * a.y + 2 * u * t * k.y + t * t * b.y };
    }

    function nabiz(el, guc) {
      if (!el || typeof el.animate !== "function") return;
      /* .elmas-gor mutlak konumlu ve translate(-50%,-50%) ile ortalı —
         ölçek verirken o dönüşüm korunmalı, yoksa simge yerinden fırlar. */
      var mutlak = false;
      try { mutlak = getComputedStyle(el).position === "absolute"; } catch (e) {}
      var t = mutlak ? "translate(-50%,-50%) " : "";
      try {
        el.animate(
          [{ transform: t + "scale(1)", filter: "brightness(1)" },
           { transform: t + "scale(" + (1 + 0.22 * guc) + ")", filter: "brightness(" + (1 + 0.35 * guc) + ")", offset: 0.32 },
           { transform: t + "scale(" + (1 - 0.04 * guc) + ")", offset: 0.66 },
           { transform: t + "scale(1)", filter: "brightness(1)" }],
          { duration: 260 + 120 * guc, easing: "cubic-bezier(.2,.8,.3,1)" });
      } catch (e) {}
    }

    function nabizKutu(el, guc) {
      if (!el || typeof el.animate !== "function") return;
      try {
        el.animate(
          [{ transform: "scale(1)" },
           { transform: "scale(" + (1 + 0.16 * guc) + ")", offset: 0.3 },
           { transform: "scale(1)" }],
          { duration: 280, easing: "cubic-bezier(.2,.8,.3,1)" });
      } catch (e) {}
    }

    function halka(p, renk) {
      var d = document.createElement("div");
      var r = renk || "rgba(255,211,92,.7)";
      d.style.cssText = "position:fixed;left:0;top:0;width:10px;height:10px;border-radius:50%;" +
        "pointer-events:none;z-index:10049;box-shadow:0 0 0 2px " + r + ",0 0 18px 6px " + r;
      d.style.transform = "translate(" + (p.x - 5) + "px," + (p.y - 5) + "px)";
      document.body.appendChild(d);
      if (typeof d.animate !== "function") { setTimeout(function () { d.remove(); }, 400); return; }
      var a = d.animate(
        [{ opacity: 0.85, width: "10px", height: "10px",
           transform: "translate(" + (p.x - 5) + "px," + (p.y - 5) + "px)" },
         { opacity: 0, width: "56px", height: "56px",
           transform: "translate(" + (p.x - 28) + "px," + (p.y - 28) + "px)" }],
        { duration: 420, easing: "cubic-bezier(.15,.7,.3,1)" });
      a.onfinish = function () { d.remove(); };
    }

    /* o = { kaynak, hedef, adet, boy, icerik(), sure, sac, gecikme, us,
            yukari, renk, varista(n,son,top), bitti() }
       kaynak/hedef: DOM ögesi VEYA {x,y} noktası. */
    function ucur(o) {
      var kaynak = nokta(o.kaynak), hedef = nokta(o.hedef);
      if (!kaynak || !hedef) { if (o.bitti) o.bitti(); return; }

      var az = azHareket();
      var adet = Math.max(1, az ? Math.min(5, o.adet || 8) : (o.adet || 8));
      var boy = o.boy || 30;
      var yukari = (o.yukari === undefined) ? 130 : o.yukari;
      var eg = o.us ? egriYap(o.us) : EGRI;
      var K = kat();

      var par = [];
      for (var i = 0; i < adet; i++) {
        var el = document.createElement("div");
        el.style.cssText = "position:absolute;left:0;top:0;will-change:transform;opacity:0;" +
          "width:" + boy + "px;height:" + boy + "px;margin-left:" + (-boy / 2) + "px;margin-top:" + (-boy / 2) + "px";
        el.innerHTML = o.icerik(i);
        var ic = el.firstElementChild;
        if (ic) { ic.style.display = "block"; ic.style.width = "100%"; ic.style.height = "100%"; }
        K.appendChild(el);

        var aci = Math.random() * Math.PI * 2;
        var yay = 34 + Math.random() * 52;
        var sacil = { x: kaynak.x + Math.cos(aci) * yay, y: kaynak.y + Math.sin(aci) * yay * 0.7 };
        var kum = { x: (sacil.x + hedef.x) / 2 + (Math.random() - 0.5) * 90,
                    y: Math.min(sacil.y, hedef.y) - yukari - Math.random() * 40 };

        par.push({
          el: el, sacil: sacil, kum: kum,
          bek: i * (az ? 20 : (o.gecikme || 30)),
          sac: az ? 90 : (o.sac || 160),
          ucus: (az ? 500 : (o.sure || 800)) + Math.random() * 150,
          don: (Math.random() - 0.5) * 520,
          vardi: false
        });
      }

      var varan = 0, t0 = performance.now();

      (function adim(now) {
        var gecen = now - t0, kalan = false;
        for (var j = 0; j < par.length; j++) {
          var p = par[j];
          if (p.vardi) continue;
          kalan = true;
          var t = gecen - p.bek;
          if (t < 0) continue;

          if (t < p.sac) {
            var k = geriTepme(t / p.sac);
            var sx = kaynak.x + (p.sacil.x - kaynak.x) * k;
            var sy = kaynak.y + (p.sacil.y - kaynak.y) * k;
            var s0 = 0.55 + 0.65 * Math.min(1, t / p.sac * 1.4);
            p.el.style.opacity = "1";
            p.el.style.transform = "translate(" + sx + "px," + sy + "px) scale(" + s0 + ")";
            continue;
          }

          var u = Math.min(1, (t - p.sac) / p.ucus);
          var e = eg(u);
          var nk = bezier(p.sacil, p.kum, hedef, e);
          var s = 1.15 - 0.62 * e;
          p.el.style.opacity = u > 0.93 ? String((1 - u) / 0.07) : "1";
          p.el.style.transform =
            "translate(" + nk.x + "px," + nk.y + "px) rotate(" + (p.don * e) + "deg) scale(" + s + ")";

          if (u >= 1) {
            p.vardi = true; p.el.remove(); varan++;
            halka(hedef, o.renk);
            if (o.varista) { try { o.varista(varan, varan === par.length, par.length); } catch (er) {} }
          }
        }
        if (kalan) requestAnimationFrame(adim);
        else if (o.bitti) { try { o.bitti(); } catch (er) {} }
      })(performance.now());
    }

    /* HUD elmas kutusu ve çanta düğmesi — seçiciler index.html'den. */
    function hudElmasKutu() { return document.querySelector(".hud-top .diamond-pill .elmas-kutu"); }
    function hudElmasGor()  { return document.querySelector(".hud-top .diamond-pill .elmas-gor"); }
    function hudSayac()     { return document.getElementById("diamondAmount"); }
    function cantaBtn()     { return document.querySelector('.dock-btn[data-panel="inventory"]'); }

    /* Elmas uçuşu + sayacın uçuşla aynı ritimde işlenmesi.
       basla/bitis: sayacın uçuş boyunca gideceği aralık. */
    function elmaslar(kaynak, basla, bitis, fmt, bitti) {
      var kutu = hudElmasKutu(), gor = hudElmasGor(), sayac = hudSayac();
      var hedef = kutu || sayac;
      if (!hedef) { if (bitti) bitti(); return; }
      var gorselSrc = gor && gor.getAttribute("src") ? gor.getAttribute("src") : "elmas.webp";
      var bicim = fmt || function (n) { return String(n); };
      if (sayac) sayac.textContent = bicim(basla);

      ucur({
        kaynak: kaynak, hedef: hedef, adet: 14, boy: 30, yukari: 130,
        sure: 900, sac: 160, us: 4.6, gecikme: 25,
        icerik: function () {
          return '<img src="' + gorselSrc + '" alt="" ' +
                 'onerror="this.onerror=null;this.replaceWith(document.createTextNode(\'💎\'))">';
        },
        varista: function (n, son, top) {
          nabiz(gor, son ? 1 : 0.45);
          nabizKutu(sayac ? sayac.parentElement : null, son ? 0.8 : 0.3);
          if (sayac) sayac.textContent = bicim(son ? bitis : Math.round(basla + (bitis - basla) * (n / top)));
        },
        bitti: bitti
      });
    }

    /* Parça uçuşu — çantaya, daha alçak yay ve daha kısa süre. */
    function parcalar(kaynak, gorselSrc, adet, renk) {
      var hedef = cantaBtn();
      if (!hedef) return;
      ucur({
        kaynak: kaynak, hedef: hedef, adet: Math.max(3, Math.min(6, adet || 5)),
        boy: 34, yukari: 90, renk: renk,
        icerik: function () {
          return gorselSrc
            ? '<img src="' + gorselSrc + '" alt="" onerror="this.style.display=\'none\'">'
            : '<div style="width:100%;height:100%;border-radius:9px;background:#a06ad8"></div>';
        },
        varista: function (n, son) { nabizKutu(hedef, son ? 1 : 0.4); }
      });
    }

    return { ucur: ucur, elmaslar: elmaslar, parcalar: parcalar, nokta: nokta, nabizKutu: nabizKutu };
  })();

  window.ODUL_UCUS = ODUL_UCUS;

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
      #welcomeBack .wc-parca{ display:flex;align-items:center;justify-content:center;gap:8px;
        margin:2px auto 0; width:fit-content; padding:8px 14px; border-radius:12px;
        background:rgba(255,255,255,.12); border:1px solid rgba(190,240,255,.20);
        box-shadow:0 2px 6px rgba(0,20,45,.3); }
      #welcomeBack .wc-parca img{ width:44px;height:44px;object-fit:contain; }
      #welcomeBack .wc-parca b{ font-weight:900;font-size:18px;color:#fff;
        font-variant-numeric:tabular-nums;
        text-shadow:0 1px 2px rgba(0,20,45,.55); }
    `;
    document.head.appendChild(st);
  }

  /* Parça kutucuğu. Görsel adı tek yerden: gelistir.js parcaGorseli().
     Etiket yazılmaz — görselin yanında yalnız adet durur (×5). */
  function parcaKutusu(cfg) {
    if (!cfg.parca || !(cfg.parca.adet > 0)) return "";
    var g = "";
    try {
      if (typeof window.parcaGorseli === "function") g = window.parcaGorseli(cfg.parca.anahtar) || "";
    } catch (e) {}
    return '<div class="wc-parca">' +
      (g ? '<img src="' + g + '" alt="" onerror="this.style.display=\'none\'">' : '') +
      '<b>×' + cfg.parca.adet + '</b></div>';
  }

  /* Paneli kurar. cfg = { gift, giftName, steps, claim, parca } */
  function buildAndShow(state, api, cfg) {
    if (!state || !cfg) return;
    if (document.getElementById("welcomeBack")) return;
    ensureCSS();

    var steps = cfg.steps, idx = 0, alindi = false;

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

    /* Uçuşun çıkış noktaları panel kapanmadan ÖNCE alınır. */
    function ucusNoktalari() {
      var elmasEl = bodyEl.querySelector(".wc-gift .elmas-kutu") || bodyEl.querySelector(".wc-gift");
      var parcaEl = bodyEl.querySelector(".wc-parca img") || bodyEl.querySelector(".wc-parca");
      var parcaSrc = "";
      try {
        if (cfg.parca && typeof window.parcaGorseli === "function")
          parcaSrc = window.parcaGorseli(cfg.parca.anahtar) || "";
        if (!parcaSrc && parcaEl && parcaEl.tagName === "IMG")
          parcaSrc = parcaEl.getAttribute("src") || "";
      } catch (e) {}
      return {
        elmas: ODUL_UCUS.nokta(elmasEl),
        parca: ODUL_UCUS.nokta(bodyEl.querySelector(".wc-parca") || parcaEl),
        parcaSrc: parcaSrc
      };
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

    /* "Al" — ödül aynen verilir, üstüne uçuş binder. */
    function alVeUcur() {
      if (alindi) return;
      alindi = true;
      var nk = ucusNoktalari();
      var kutu = back.querySelector(".wc-box");
      if (kutu && typeof kutu.animate === "function") {
        kutu.animate([{ transform: "scale(1)", opacity: 1 },
                      { transform: "scale(1.03)", opacity: 1, offset: 0.18 },
                      { transform: "scale(.86)", opacity: 0 }],
                     { duration: 380, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
      }

      grant();  /* ödül mantığı olduğu gibi — sayaç burada nihai değere gider */

      var bitis = state.diamonds || 0;
      var basla = bitis - cfg.gift;
      ODUL_UCUS.elmaslar(nk.elmas, basla, bitis,
        function (n) { return fmtOf(api, n); },
        function () { if (api) { try { api.renderDiamonds && api.renderDiamonds(); } catch (e) {} } });

      if (cfg.parca && cfg.parca.adet > 0 && nk.parca) {
        setTimeout(function () {
          ODUL_UCUS.parcalar(nk.parca, nk.parcaSrc, cfg.parca.adet, "rgba(160,106,216,.75)");
        }, 260);
      }
    }

    nextEl.onclick = function () {
      if (idx < steps.length - 1) { idx++; render(); return; }
      alVeUcur();
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

  /* ═══════════════════════════════════════════════════════════════════
     GÜNLÜK ÖDÜL PENCERESİ (index.html) — aynı motor
     ───────────────────────────────────────────────────────────────────
     index.html'e DOKUNULMAZ. "Al" düğmesinin kendi dinleyicisi doğrudan
     gunlukOdulAl referansına bağlı olduğu için sarmalama işe yaramaz;
     bunun yerine belge üzerinde YAKALAMA evresinde dinlenir — bizim kod
     önce çalışıp konumları alır, ardından asıl işleyici pencereyi kapatır.
     Elmas ZATEN sandığa dokunulduğunda verilmiştir; sayaç geri sarılıp
     uçuşla birlikte yeniden işlenir.
     ═══════════════════════════════════════════════════════════════════ */
  function sayiOku(metin) {
    var s = String(metin || "").replace(/[^0-9]/g, "");
    return s ? parseInt(s, 10) : 0;
  }

  function gunlukUcusBagla() {
    document.addEventListener("click", function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest("#gunlukPopAl") : null;
      if (!btn || btn.disabled) return;
      var pop = document.getElementById("gunlukPop");
      if (!pop) return;

      /* Konumlar pencere kapanmadan alınır. */
      var elmasKutu = pop.querySelector(".elmas-kutu");
      var elmasSatir = elmasKutu && elmasKutu.closest ? elmasKutu.closest(".gp-satir") : null;
      var elmasAdet = elmasSatir ? sayiOku(elmasSatir.textContent) : 0;
      var elmasNk = ODUL_UCUS.nokta(elmasKutu);

      var secili = pop.querySelector(".gunluk-parca-sec.secili");
      /* KIRPMA TUZAĞI: konum KUTUDAN alınır, resimden değil.
         GÖRSEL TUZAĞI: kutuda iki img var — ilki nadirlik ÇERÇEVESİ
         (turuncu/mor arka), ikincisi parçanın kendisi. querySelector
         çerçeveyi verir, o yüzden görsel tek doğruluk kaynağından
         okunur: gelistir.js parcaGorseli(anahtar). */
      var parcaNk = ODUL_UCUS.nokta(secili);
      var parcaSrc = "";
      try {
        var anahtar = secili ? secili.dataset.parca : "";
        if (anahtar && typeof window.parcaGorseli === "function")
          parcaSrc = window.parcaGorseli(anahtar) || "";
      } catch (e) {}
      var etiket = pop.querySelector(".gp-etiket");
      var parcaAdet = etiket ? (sayiOku(etiket.textContent) || 1) : 1;

      /* Asıl işleyici (gunlukOdulAl) bu turdan sonra çalışır. */
      setTimeout(function () {
        /* 7 günlük şerit HUD'ı kapattığı için uçuşun ineceği yer
           görünmez kalıyordu — ödül alındıktan sonra şerit kapatılır. */
        try {
          if (typeof window.closeDailyRewardModal === "function") window.closeDailyRewardModal();
          else {
            var ov = document.getElementById("dailyRewardOverlay");
            if (ov) ov.style.display = "none";
          }
        } catch (e) {}

        setTimeout(function () {
          if (elmasNk && elmasAdet > 0) {
            var sayac = document.getElementById("diamondAmount");
            var bitis = sayac ? sayiOku(sayac.textContent) : 0;
            ODUL_UCUS.elmaslar(elmasNk, Math.max(0, bitis - elmasAdet), bitis,
              function (n) { return (typeof window.fmt === "function") ? window.fmt(n) : String(n); });
          }
          if (parcaNk) {
            setTimeout(function () {
              ODUL_UCUS.parcalar(parcaNk, parcaSrc, parcaAdet, "rgba(160,106,216,.75)");
            }, 260);
          }
        }, 140);
      }, 0);
    }, true);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", gunlukUcusBagla);
  else gunlukUcusBagla();


  /* ═══════════════════════════════════════════════════════════════════
     ŞANS SANDIĞI — GERÇEK 3B (three.js)
     ───────────────────────────────────────────────────────────────────
     index.html'e DOKUNULMAZ. Panel açılınca #chestEl içine kendi tuvali
     kurulur; gorsel4.webp (#chestSvg), svg parlaması (#chestGlow),
     ✨ (#chestSparkle) ve alttaki tutar satırı (#chestResult) gizlenir —
     tutarı artık efektin kendi yazısı gösterir.
     Ödül mantığı openChest()'te; buraya dokunulmaz. Tutar, oyunun
     yazdığı #chestResult metninden OKUNUR (gizli ama dolu kalır).
     Yükleme sırası: three.js rehber.js'ten SONRA gelir — bu yüzden
     THREE'ye yalnız panel açıldığında, çalışma anında bakılır.
     ═══════════════════════════════════════════════════════════════════ */
  var SANDIK3B = (function () {
    var kuruldu = false, calisiyor = false, rafId = 0;
    var cizer, sahne, kamera, kap, tuval, yaziEl;
    var sandik, govde, kapak, huzmeKap, anaHuzme, yanHuzmeler = [];
    var icIsik, mHuzme, mHale, elmaslar = [], icElmaslar = [];
    var rtSahne, rtA, rtB, kareSahne, kareKamera, kareMesh;
    var shParlak, shBulanik, shBirlestir;
    var durum = "kapali", t0 = 0, sacildi = false;
    var huzmeT = -1, huzmeGuc = 0, vurusGuc = 1, huzmeVurus = -9999;
    var kademe = "orta", elmasDoku = null;
    /* İNCE AYAR için tutulan canlı referanslar (?sandikayar=1 paneli
       bunlara yazar; panel yokken hiçbir etkisi olmaz). */
    var isikOrtam, isikYari, isikAna, matAhsap = [], matMetal = [];
    var ELMAS_RENK = 0x7fe3ff;
    var SARS = 300, ACILMA = 560, KAPAK_ACI = -2.05;

    var KADEME = {
      dusuk:  { adet: 8,  guc: 4.2, ic: 5,  huzme: 0.16, yan: 0, punto: 34 },
      orta:   { adet: 20, guc: 5.4, ic: 11, huzme: 0.36, yan: 4, punto: 44 },
      yuksek: { adet: 40, guc: 6.9, ic: 18, huzme: 0.62, yan: 9, punto: 60 }
    };
    function kademeSec(tutar) {
      if (tutar >= 10000) return "yuksek";
      if (tutar >= 3000) return "orta";
      return "dusuk";
    }

    /* ── Dokular: kodla çizilir, dosya gerekmez ────────────────── */
    function ahsapDoku(taban) {
      var c = document.createElement("canvas"); c.width = c.height = 512;
      var x = c.getContext("2d");
      x.fillStyle = taban; x.fillRect(0, 0, 512, 512);
      for (var i = 0; i < 190; i++) {
        var y = Math.random() * 512;
        x.strokeStyle = "rgba(" + (Math.random() < 0.5 ? "88,52,22," : "224,182,126,") +
                        (0.04 + Math.random() * 0.10) + ")";
        x.lineWidth = 0.4 + Math.random() * 1.3;
        x.beginPath(); x.moveTo(0, y);
        for (var px = 0; px <= 512; px += 16)
          x.lineTo(px, y + Math.sin((px + i * 20) / 34) * 3.5 + (Math.random() - 0.5) * 1.6);
        x.stroke();
      }
      var t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
      return t;
    }

    function metalDoku(taban, koyu) {
      var c = document.createElement("canvas"); c.width = c.height = 256;
      var x = c.getContext("2d");
      var g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, koyu); g.addColorStop(0.18, taban);
      g.addColorStop(0.45, "#cfd6db"); g.addColorStop(0.72, taban);
      g.addColorStop(1, koyu);
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      for (var i = 0; i < 260; i++) {
        var y = Math.random() * 256;
        x.strokeStyle = "rgba(" + (Math.random() < 0.5 ? "40,52,62," : "232,240,246,") +
                        (0.03 + Math.random() * 0.10) + ")";
        x.lineWidth = 0.4 + Math.random() * 1.1;
        x.beginPath(); x.moveTo(0, y); x.lineTo(256, y + (Math.random() - 0.5) * 2); x.stroke();
      }
      x.fillStyle = "rgba(120,160,190,.10)"; x.fillRect(0, 0, 256, 256);
      var t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
      return t;
    }

    function huzmeDoku() {
      var c = document.createElement("canvas"); c.width = 16; c.height = 256;
      var x = c.getContext("2d");
      var g = x.createLinearGradient(0, 256, 0, 0);
      g.addColorStop(0, "rgba(190,240,255,.55)");
      g.addColorStop(0.30, "rgba(150,225,255,.30)");
      g.addColorStop(0.70, "rgba(120,215,255,.10)");
      g.addColorStop(1, "rgba(120,215,255,0)");
      x.fillStyle = g; x.fillRect(0, 0, 16, 256);
      var yan = x.createLinearGradient(0, 0, 16, 0);
      yan.addColorStop(0, "rgba(0,0,0,1)"); yan.addColorStop(0.5, "rgba(0,0,0,0)");
      yan.addColorStop(1, "rgba(0,0,0,1)");
      x.globalCompositeOperation = "destination-out";
      x.fillStyle = yan; x.fillRect(0, 0, 16, 256);
      return new THREE.CanvasTexture(c);
    }

    function haleDoku() {
      var c = document.createElement("canvas"); c.width = c.height = 128;
      var x = c.getContext("2d");
      var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(190,240,255,.65)");
      g.addColorStop(1, "rgba(120,220,255,0)");
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }

    function yedekElmasDoku() {
      var c = document.createElement("canvas"); c.width = c.height = 128;
      var x = c.getContext("2d");
      var g = x.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, "#cdf6ff"); g.addColorStop(1, "#3aa8e0");
      x.fillStyle = g;
      x.beginPath(); x.moveTo(26, 20); x.lineTo(102, 20); x.lineTo(124, 48);
      x.lineTo(64, 112); x.lineTo(4, 48); x.closePath(); x.fill();
      return new THREE.CanvasTexture(c);
    }

    /* ── Sahne ─────────────────────────────────────────────────── */
    function kutu(g, y, d, mat, x, yy, z) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(g, y, d), mat);
      m.position.set(x, yy, z);
      m.castShadow = true; m.receiveShadow = true;
      return m;
    }

    function kurulum(chestEl) {
      kap = document.createElement("div");
      kap.className = "s3b-kap";
      /* Tuval yukarı doğru uzar (hüzmeye yer), aşağıda kısa kalır. */
      kap.style.cssText = "position:absolute;left:-18%;right:-18%;top:-55%;bottom:-2%;" +
                          "pointer-events:none;z-index:2";
      chestEl.style.position = chestEl.style.position || "relative";
      chestEl.appendChild(kap);

      yaziEl = document.createElement("div");
      yaziEl.className = "s3b-yazi";
      yaziEl.style.cssText = "position:absolute;left:0;right:0;top:16%;display:flex;" +
        "align-items:center;justify-content:center;gap:8px;opacity:0;pointer-events:none;" +
        "font-family:'Baloo 2','Nunito',sans-serif;font-weight:800;color:#8ce3ff;" +
        "font-variant-numeric:tabular-nums;z-index:3;" +
        "text-shadow:0 0 14px rgba(140,227,255,.9),0 0 38px rgba(90,200,255,.55)," +
        "0 2px 4px rgba(0,20,45,.6)";
      kap.appendChild(yaziEl);

      sahne = new THREE.Scene();
      kamera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      /* Konum olcule() içinde en-boy oranına göre hesaplanır. */
      kamera.position.set(0, 2.5, 7.0);
      kamera.lookAt(0, 0.95, 0);

      cizer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      cizer.setPixelRatio(Math.min(devicePixelRatio, 2));
      cizer.toneMapping = THREE.ACESFilmicToneMapping;
      cizer.toneMappingExposure = 1.12;
      cizer.shadowMap.enabled = true;
      cizer.shadowMap.type = THREE.PCFSoftShadowMap;
      tuval = cizer.domElement;
      tuval.style.cssText = "width:100%;height:100%;display:block";
      kap.appendChild(tuval);

      isikOrtam = new THREE.AmbientLight(0xffffff, 0.85);
      sahne.add(isikOrtam);
      isikYari = new THREE.HemisphereLight(0xbcd8f0, 0x3a2410, 0.5);
      sahne.add(isikYari);
      var ana = new THREE.DirectionalLight(0xfff4e2, 0.55);
      isikAna = ana;
      ana.position.set(2.4, 5.2, 3.4);
      ana.castShadow = true;
      ana.shadow.mapSize.set(1024, 1024);
      ana.shadow.camera.near = 1; ana.shadow.camera.far = 20;
      ana.shadow.camera.left = -4; ana.shadow.camera.right = 4;
      ana.shadow.camera.top = 4; ana.shadow.camera.bottom = -4;
      ana.shadow.bias = -0.0016;
      sahne.add(ana);

      var zemin = new THREE.Mesh(new THREE.PlaneGeometry(14, 14),
                                 new THREE.ShadowMaterial({ opacity: 0.34 }));
      zemin.rotation.x = -Math.PI / 2;
      zemin.position.y = -0.92;
      zemin.receiveShadow = true;
      sahne.add(zemin);

      var dokuAcik = ahsapDoku("#8a5424"), dokuKoyu = ahsapDoku("#64381a");
      var mAhsap = new THREE.MeshStandardMaterial({ map: dokuAcik, roughness: 1, metalness: 0 });
      var mAhsapK = new THREE.MeshStandardMaterial({ map: dokuKoyu, roughness: 1, metalness: 0 });
      var mMetal = new THREE.MeshStandardMaterial({
        map: metalDoku("#9aa3aa", "#5d666d"), roughness: 0.62, metalness: 0 });
      var mMetalK = new THREE.MeshStandardMaterial({
        map: metalDoku("#7c858c", "#454d54"), roughness: 0.7, metalness: 0 });

      matAhsap.length = 0; matMetal.length = 0;
      matAhsap.push(mAhsap, mAhsapK);
      matMetal.push(mMetal, mMetalK);

      sandik = new THREE.Group();
      sahne.add(sandik);

      var EN = 2.6, YU = 1.15, DE = 1.6, KAL = 0.13, tahtaY = YU / 3;
      govde = new THREE.Group();
      for (var i = 0; i < 3; i++) {
        var y = -YU / 2 + tahtaY * (i + 0.5);
        var mt = i % 2 ? mAhsapK : mAhsap;
        govde.add(kutu(EN, tahtaY * 0.9, KAL, mt, 0, y, DE / 2 - KAL / 2));
        govde.add(kutu(EN, tahtaY * 0.9, KAL, mt, 0, y, -DE / 2 + KAL / 2));
        govde.add(kutu(KAL, tahtaY * 0.9, DE - KAL * 2, mt, EN / 2 - KAL / 2, y, 0));
        govde.add(kutu(KAL, tahtaY * 0.9, DE - KAL * 2, mt, -EN / 2 + KAL / 2, y, 0));
      }
      govde.add(kutu(EN - KAL * 2, KAL, DE - KAL * 2, mAhsapK, 0, -YU / 2 + KAL / 2, 0));
      [-1, 1].forEach(function (sx) {
        [-1, 1].forEach(function (sz) {
          govde.add(kutu(0.15, YU * 0.98, 0.15, mAhsapK, sx * (EN / 2 - 0.07), 0, sz * (DE / 2 - 0.07)));
          govde.add(kutu(0.32, 0.14, 0.32, mAhsapK, sx * (EN / 2 - 0.22), -YU / 2 - 0.05, sz * (DE / 2 - 0.22)));
        });
      });
      govde.add(kutu(EN * 1.05, 0.11, DE * 1.05, mAhsapK, 0, -YU / 2 + 0.015, 0));
      govde.add(kutu(EN * 1.03, 0.09, DE * 1.03, mAhsapK, 0, YU / 2 - 0.03, 0));
      govde.position.y = -0.3;
      sandik.add(govde);

      [-0.72, 0.72].forEach(function (x) {
        [1, -1].forEach(function (sz) {
          sandik.add(kutu(0.2, YU * 1.02, 0.05, mMetal, x, govde.position.y, sz * (DE / 2 + 0.025)));
        });
        [-0.32, 0.32].forEach(function (yy) {
          var pp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 18, 14), mMetalK);
          pp.position.set(x, govde.position.y + yy, DE / 2 + 0.05);
          pp.castShadow = true;
          sandik.add(pp);
        });
      });

      var KAPAK_R = DE / 2;
      var mentese = new THREE.Group();
      mentese.position.set(0, govde.position.y + YU / 2, -DE / 2);
      sandik.add(mentese);
      kapak = new THREE.Group();
      mentese.add(kapak);

      var mKapak = new THREE.MeshStandardMaterial({
        map: dokuAcik, roughness: 1, metalness: 0, side: THREE.DoubleSide });
      matAhsap.push(mKapak);
      var kubbe = new THREE.Mesh(
        new THREE.CylinderGeometry(KAPAK_R, KAPAK_R, EN, 56, 1, true, 0, Math.PI), mKapak);
      kubbe.rotation.z = Math.PI / 2;
      kubbe.position.set(0, 0, KAPAK_R);
      kubbe.castShadow = true; kubbe.receiveShadow = true;
      kapak.add(kubbe);
      kapak.add(kutu(EN, 0.1, KAPAK_R * 2, mAhsapK, 0, -0.02, KAPAK_R));
      [-1, 1].forEach(function (s2) {
        var mUc = new THREE.MeshStandardMaterial({
          map: dokuKoyu, roughness: 1, metalness: 0, side: THREE.DoubleSide });
        matAhsap.push(mUc);
        var k = new THREE.Mesh(new THREE.CircleGeometry(KAPAK_R, 48, 0, Math.PI), mUc);
        k.rotation.y = s2 > 0 ? Math.PI / 2 : -Math.PI / 2;
        k.position.set(s2 * EN / 2, 0, KAPAK_R);
        k.castShadow = true;
        kapak.add(k);
      });
      [-0.72, 0.72].forEach(function (x) {
        var mb = new THREE.MeshStandardMaterial({
          map: metalDoku("#9aa3aa", "#5d666d"), roughness: 0.62, metalness: 0,
          side: THREE.DoubleSide });
        matMetal.push(mb);
        var b = new THREE.Mesh(
          new THREE.CylinderGeometry(KAPAK_R + 0.03, KAPAK_R + 0.03, 0.2, 56, 1, true, 0, Math.PI), mb);
        b.rotation.z = Math.PI / 2;
        b.position.set(x, 0, KAPAK_R);
        b.castShadow = true;
        kapak.add(b);
      });
      kapak.add(kutu(EN, 0.14, 0.14, mAhsapK, 0, 0.02, KAPAK_R * 2 - 0.02));
      var boru = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, EN * 0.96, 22), mMetalK);
      boru.rotation.z = Math.PI / 2;
      boru.castShadow = true;
      kapak.add(boru);

      icIsik = new THREE.PointLight(ELMAS_RENK, 0, 8);
      icIsik.position.set(0, govde.position.y + 0.2, 0);
      sahne.add(icIsik);

      /* Hüzmeler — sandığın ağzının ÜSTÜNDEN başlar, sprite olarak. */
      mHuzme = new THREE.SpriteMaterial({
        map: huzmeDoku(), color: ELMAS_RENK, transparent: true, toneMapped: false,
        blending: THREE.AdditiveBlending, depthWrite: false });
      mHale = new THREE.SpriteMaterial({
        map: haleDoku(), transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, toneMapped: false, opacity: 0.45 });

      huzmeKap = new THREE.Group();
      huzmeKap.position.set(0, govde.position.y + YU / 2 + 0.05, 0);
      sandik.add(huzmeKap);

      function huzmeSprite(gen, boy, don) {
        var m = mHuzme.clone();
        m.rotation = don || 0;
        var sp = new THREE.Sprite(m);
        sp.center.set(0.5, 0);
        sp.scale.set(gen, boy, 1);
        return sp;
      }
      anaHuzme = huzmeSprite(1.5, 6.4, 0);
      huzmeKap.add(anaHuzme);
      for (var j = 0; j < 9; j++) {
        var tt = (j - 4) / 4;
        var h = huzmeSprite(0.42, 4.6 + Math.random() * 1.4, tt * 0.55);
        h.position.x = tt * 0.28;
        h.userData.faz = Math.random() * 6.28;
        h.userData.gen = 0.42;
        h.userData.boy = h.scale.y;
        h.visible = false;
        huzmeKap.add(h);
        yanHuzmeler.push(h);
      }

      /* Elmas görseli: oyunun kendi dosyası. */
      elmasDoku = yedekElmasDoku();
      var mSp = new THREE.SpriteMaterial({ map: elmasDoku, transparent: true, depthWrite: false });
      new THREE.TextureLoader().load("elmas.webp",
        function (t) { mSp.map = t; mSp.needsUpdate = true; }, undefined, function () {});
      window.__s3bElmasMat = mSp;

      icDoldur();
      bloomKur();
      olcule();
    }

    function elmasSprite(boy) {
      var sp = new THREE.Sprite(window.__s3bElmasMat);
      sp.scale.setScalar(boy);
      return sp;
    }

    function icDoldur() {
      icElmaslar.forEach(function (e) { sandik.remove(e); });
      icElmaslar.length = 0;
      var n = (KADEME[kademe] || KADEME.orta).ic;
      var tabanY = govde.position.y - 1.15 / 2 + 0.22;
      for (var i = 0; i < n; i++) {
        var sp = elmasSprite(0.34 + Math.random() * 0.16);
        sp.position.set((Math.random() - 0.5) * 1.9, tabanY + Math.random() * 0.16,
                        (Math.random() - 0.5) * 1.0);
        sandik.add(sp);
        icElmaslar.push(sp);
      }
    }

    function elmasSac() {
      var k = KADEME[kademe] || KADEME.orta;
      for (var i = 0; i < k.adet; i++) {
        var sp = elmasSprite(0.32 + Math.random() * 0.18);
        sp.position.set((Math.random() - 0.5) * 0.9, govde.position.y + 0.3,
                        (Math.random() - 0.5) * 0.6);
        sahne.add(sp);
        elmaslar.push({
          m: sp, donHiz: (Math.random() - 0.5) * 9,
          hiz: new THREE.Vector3((Math.random() - 0.5) * 3.9, k.guc + Math.random() * 3.3,
                                 (Math.random() - 0.5) * 2.4),
          omur: 0
        });
      }
    }

    /* ── Bloom ─────────────────────────────────────────────────── */
    function bloomKur() {
      rtSahne = new THREE.WebGLRenderTarget(1, 1);
      rtA = new THREE.WebGLRenderTarget(1, 1);
      rtB = new THREE.WebGLRenderTarget(1, 1);
      kareSahne = new THREE.Scene();
      kareKamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      var vs = "varying vec2 v; void main(){ v=uv; gl_Position=vec4(position.xy,0.,1.); }";
      shParlak = new THREE.ShaderMaterial({
        uniforms: { t: { value: null }, esik: { value: 0.88 } },
        vertexShader: vs,
        fragmentShader: "uniform sampler2D t; uniform float esik; varying vec2 v;" +
          "void main(){ vec4 c=texture2D(t,v); float l=dot(c.rgb,vec3(.2126,.7152,.0722));" +
          "float k=smoothstep(esik,esik+.35,l); gl_FragColor=vec4(c.rgb*k,1.); }"
      });
      shBulanik = new THREE.ShaderMaterial({
        uniforms: { t: { value: null }, yon: { value: new THREE.Vector2(1, 0) } },
        vertexShader: vs,
        fragmentShader: "uniform sampler2D t; uniform vec2 yon; varying vec2 v;" +
          "void main(){ vec4 s=vec4(0.);" +
          "s+=texture2D(t,v-yon*4.)*.05; s+=texture2D(t,v-yon*3.)*.09;" +
          "s+=texture2D(t,v-yon*2.)*.12; s+=texture2D(t,v-yon)*.15;" +
          "s+=texture2D(t,v)*.18; s+=texture2D(t,v+yon)*.15;" +
          "s+=texture2D(t,v+yon*2.)*.12; s+=texture2D(t,v+yon*3.)*.09;" +
          "s+=texture2D(t,v+yon*4.)*.05; gl_FragColor=s; }"
      });
      shBirlestir = new THREE.ShaderMaterial({
        uniforms: { taban: { value: null }, hale: { value: null }, guc: { value: 0.5 } },
        vertexShader: vs,
        fragmentShader: "uniform sampler2D taban; uniform sampler2D hale; uniform float guc;" +
          "varying vec2 v; void main(){ vec4 a=texture2D(taban,v); vec4 b=texture2D(hale,v);" +
          "gl_FragColor=vec4(a.rgb+b.rgb*guc, a.a); }",
        transparent: true
      });
      kareMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shParlak);
      kareSahne.add(kareMesh);
    }

    function kareCiz(mat, hedef) {
      kareMesh.material = mat;
      cizer.setRenderTarget(hedef || null);
      cizer.render(kareSahne, kareKamera);
    }

    function bloomCiz() {
      cizer.setRenderTarget(rtSahne);
      cizer.clear();
      cizer.render(sahne, kamera);
      shParlak.uniforms.t.value = rtSahne.texture;
      kareCiz(shParlak, rtA);
      var g = rtA.width, y = rtA.height;
      shBulanik.uniforms.t.value = rtA.texture;
      shBulanik.uniforms.yon.value.set(1.7 / g, 0); kareCiz(shBulanik, rtB);
      shBulanik.uniforms.t.value = rtB.texture;
      shBulanik.uniforms.yon.value.set(0, 1.7 / y); kareCiz(shBulanik, rtA);
      shBulanik.uniforms.t.value = rtA.texture;
      shBulanik.uniforms.yon.value.set(3.4 / g, 0); kareCiz(shBulanik, rtB);
      shBulanik.uniforms.t.value = rtB.texture;
      shBulanik.uniforms.yon.value.set(0, 3.4 / y); kareCiz(shBulanik, rtA);
      shBirlestir.uniforms.taban.value = rtSahne.texture;
      shBirlestir.uniforms.hale.value = rtA.texture;
      cizer.setRenderTarget(null);
      kareCiz(shBirlestir, null);
    }

    /* ── İNCE AYAR ──────────────────────────────────────────────
       Varsayılanlar mevcut görünümün BİREBİR aynısıdır; panel
       açılmazsa hiçbir şey değişmez. `?sandikayar=1` paneli bu
       nesneye yazar, `uygula()` sahneye işler. */
    var AYAR = {
      kamYatay: 0,          /* derece — sağa/sola dönüş */
      kamYukseklik: 0.34,   /* mesafenin katı — yukarı/aşağı bakış */
      kamMesafe: 1.00,      /* hesaplanan mesafenin katı — yakın/uzak */
      kamBakis: 0.95,       /* kameranın baktığı yükseklik */
      isikAci: 35.2,        /* derece — ana ışığın yönü */
      isikYuk: 5.20,
      isikUzak: 4.16,
      isikGuc: 0.55,
      ortamGuc: 0.85,
      yariGuc: 0.50,
      pozlama: 1.12,        /* toneMappingExposure */
      ahsapRenk: "#ffffff", /* doku ÜZERİNE çarpan ton */
      metalRenk: "#ffffff",
      icRenk: "#7fe3ff"
    };

    function uygula() {
      if (!cizer) return;
      cizer.toneMappingExposure = AYAR.pozlama;
      if (isikAna) {
        var ia = THREE.MathUtils.degToRad(AYAR.isikAci);
        isikAna.position.set(Math.sin(ia) * AYAR.isikUzak, AYAR.isikYuk,
                             Math.cos(ia) * AYAR.isikUzak);
        isikAna.intensity = AYAR.isikGuc;
      }
      if (isikOrtam) isikOrtam.intensity = AYAR.ortamGuc;
      if (isikYari) isikYari.intensity = AYAR.yariGuc;
      matAhsap.forEach(function (m) { if (m) m.color.set(AYAR.ahsapRenk); });
      matMetal.forEach(function (m) { if (m) m.color.set(AYAR.metalRenk); });
      if (icIsik) icIsik.color.set(AYAR.icRenk);
      olcule();                       /* kamera ayarları burada işler */
    }

    function olcule() {
      if (!kap || !cizer) return;
      var g = kap.clientWidth || 300, y = kap.clientHeight || 300;
      cizer.setSize(g, y, false);
      var pr = Math.min(devicePixelRatio, 2);
      rtSahne.setSize(Math.max(2, g * pr), Math.max(2, y * pr));
      rtA.setSize(Math.max(2, Math.floor(g * pr / 2)), Math.max(2, Math.floor(y * pr / 2)));
      rtB.setSize(Math.max(2, Math.floor(g * pr / 2)), Math.max(2, Math.floor(y * pr / 2)));
      kamera.aspect = g / y;

      /* ÇERÇEVELEME: tuval dar olunca yatay görüş açısı daralır ve
         sandık ekranı doldurur. Kamera mesafesi en-boy oranına göre
         hesaplanır — sandığın yarı genişliği (1.45) + pay sığsın. */
      var yariFov = THREE.MathUtils.degToRad(kamera.fov) / 2;
      var yatay = 2.15 / (Math.tan(yariFov) * kamera.aspect);
      var dikey = 2.60 / Math.tan(yariFov);
      var mesafe = Math.max(6.4, Math.min(16, Math.max(yatay, dikey))) * AYAR.kamMesafe;
      var ka = THREE.MathUtils.degToRad(AYAR.kamYatay);
      kamera.position.set(Math.sin(ka) * mesafe, mesafe * AYAR.kamYukseklik,
                          Math.cos(ka) * mesafe);
      kamera.lookAt(0, AYAR.kamBakis, 0);

      kamera.updateProjectionMatrix();
    }

    /* ── Ödül yazısı ───────────────────────────────────────────── */
    function yaziGoster(tutar) {
      var k = KADEME[kademe] || KADEME.orta;
      var elmasHtml = "";
      try { if (typeof window.ELMAS === "function") elmasHtml = window.ELMAS("sandik3b"); } catch (e) {}
      var sayi = (typeof window.fmt === "function") ? window.fmt(tutar) : String(tutar);
      yaziEl.innerHTML = '<span>' + sayi + '</span>' +
        (elmasHtml || '<img src="elmas.webp" alt="" style="width:1em;height:1em">');
      yaziEl.style.fontSize = k.punto + "px";

      var gel = 380, dur = 1000, git = 520, top = gel + dur + git;
      var o1 = gel / top, o2 = (gel + dur) / top;
      yaziEl.getAnimations().forEach(function (a) { a.cancel(); });
      yaziEl.animate(
        [{ opacity: 0, transform: "translateY(30px) scale(.5)", offset: 0 },
         { opacity: 1, transform: "translateY(-2px) scale(1.2)", offset: o1 * 0.62 },
         { opacity: 1, transform: "translateY(0) scale(1)", offset: o1 },
         { opacity: 1, transform: "translateY(0) scale(1)", offset: o2 },
         { opacity: 0, transform: "translateY(-46px) scale(.92)", offset: 1 }],
        { duration: top, easing: "cubic-bezier(.2,.9,.25,1)" });
    }

    /* ── Açılış ────────────────────────────────────────────────── */
    function agirlikli(t) {
      if (t < 0.72) { var u = t / 0.72; return 1 - Math.pow(1 - u, 3); }
      var v = (t - 0.72) / 0.28;
      return 1 + Math.sin(v * Math.PI) * 0.055 * (1 - v);
    }

    /* Kapağı ve gövdeyi ANINDA kapalı hâle döndürür. */
    function hemenKapat() {
      if (kapak) kapak.rotation.x = 0;
      if (sandik) { sandik.scale.set(1, 1, 1); sandik.position.x = 0; sandik.rotation.z = 0; }
      if (icIsik) icIsik.intensity = 0;
      huzmeT = -1; sacildi = false;
      elmaslar.forEach(function (e) { sahne.remove(e.m); });
      elmaslar.length = 0;
      durum = "kapali";
    }

    /* Dokunma anı: ödül 850 ms sonra geliyor, ama sandık HEMEN
       titremeye başlar — bekleme hissi buradan doğuyordu. */
    function tetikle() {
      hemenKapat();
      durum = "bekliyor";
      t0 = performance.now();
      window.__s3bTutar = 0;
    }

    /* Tutar geldi: titreme zaten sürüyorsa doğrudan açılışa geçilir. */
    function ac(tutar) {
      kademe = kademeSec(tutar);
      icDoldur();
      window.__s3bTutar = tutar;
      var now = performance.now();
      /* Titreme yeterince sürdüyse baştan sarma yok — kapak hemen kalkar. */
      t0 = (durum === "bekliyor" && now - t0 >= SARS) ? now - SARS : now;
      durum = "aciliyor";
      sacildi = false;
    }

    function sifirla() {
      durum = "kapali"; sacildi = false; huzmeT = -1;
      if (!kapak) return;
      kapak.rotation.x = 0;
      sandik.position.x = 0; sandik.rotation.z = 0; sandik.scale.set(1, 1, 1);
      icIsik.intensity = 0;
      elmaslar.forEach(function (e) { sahne.remove(e.m); });
      elmaslar.length = 0;
    }

    function huzmeGuncelle(dt, now) {
      var k = KADEME[kademe] || KADEME.orta;
      huzmeGuc = k.huzme;
      if (huzmeT < 0) {
        anaHuzme.visible = false;
        yanHuzmeler.forEach(function (h) { h.visible = false; });
        return;
      }
      huzmeT += dt;
      var yuksek = kademe === "yuksek";
      var sure = yuksek ? 2.8 : 0.95;
      var u = Math.min(1, huzmeT / sure);
      var siddet = u < 0.06 ? (u / 0.06) : Math.pow(1 - (u - 0.06) / 0.94, 1.4);

      anaHuzme.visible = siddet > 0.01;
      mHuzme.opacity = Math.min(1, siddet * (0.35 + huzmeGuc) *
        (yuksek ? (0.75 + Math.abs(Math.sin(now / 120)) * 0.35) : 1));
      var gen = 1.5 * (0.55 + huzmeGuc) * vurusGuc * (yuksek ? 1.35 : 1);
      anaHuzme.scale.set(gen, 6.4 * (0.75 + huzmeGuc * 0.5), 1);
      anaHuzme.material.opacity = mHuzme.opacity;

      yanHuzmeler.forEach(function (h, i) {
        h.visible = i < k.yan && siddet > 0.02;
        if (!h.visible) return;
        var f = (0.5 + Math.abs(Math.sin(now / 260 + h.userData.faz)) * 0.9) * vurusGuc;
        h.scale.set(h.userData.gen * f, h.userData.boy * (0.8 + f * 0.3), 1);
        h.material.opacity = mHuzme.opacity * 0.8;
      });

      if (yuksek) {
        if (now > (window.__s3bSonraki || 0) && u < 0.93) {
          huzmeVurus = now;
          window.__s3bSonraki = now + 220 + Math.random() * 320;
        }
        var vv = Math.max(0, 1 - (now - huzmeVurus) / 340);
        vurusGuc = 1 + vv * vv * 1.9;
      } else vurusGuc = 1;

      if (u >= 1) huzmeT = -1;
    }

    var sonKare = 0;
    function dongu(now) {
      if (!calisiyor) return;
      var dt = Math.min(0.05, (now - sonKare) / 1000);
      sonKare = now;
      sandik.rotation.y = -0.28;

      if (durum === "bekliyor") {
        /* Ödül gelene kadar titremeye devam — en fazla 2 sn. */
        var b = now - t0;
        sandik.position.x = Math.sin(b / 22) * 0.045 * Math.max(0.35, 1 - b / 1200);
        if (b > 2000) { sandik.position.x = 0; durum = "kapali"; }
      }

      if (durum === "aciliyor") {
        var gec = now - t0;
        if (gec < SARS) {
          sandik.position.x = Math.sin(gec / 22) * 0.045 * (1 - gec / SARS);
        } else {
          sandik.position.x = 0;
          var es = Math.max(0, 1 - (gec - SARS) / 420);
          var q = Math.sin((1 - es) * Math.PI) * 0.06 * es;
          sandik.scale.set(1 - q, 1 + q * 1.6, 1 - q);
          var u = Math.min(1, (gec - SARS) / ACILMA);
          kapak.rotation.x = KAPAK_ACI * agirlikli(u);
          icIsik.intensity = huzmeGuc * 2.2 * Math.min(1, u * 2.2);
          if (!sacildi && u > 0.18) {
            sacildi = true;
            elmasSac();
            huzmeT = 0; window.__s3bSonraki = 0;
            yaziGoster(window.__s3bTutar || 0);
            if (kademe === "yuksek")
              [170, 360, 620, 980, 1400].forEach(function (ms) {
                setTimeout(function () { if (durum !== "kapali") elmasSac(); }, ms);
              });
          }
          if (u >= 1) { durum = "acik"; window.__s3bAcikT = now; }
        }
      }
      if (durum === "acik") {
        icIsik.intensity = huzmeGuc * (1.1 + Math.sin(now / 140) * 0.25);
        /* Gösteri bitince kapak KENDİ KAPANIR — eskiden açık kalıyor
           ve ikinci dokunuş hiçbir şey yapmıyordu. */
        if (now - (window.__s3bAcikT || now) > 2000) {
          durum = "kapaniyor"; window.__s3bKapatT = now;
        }
      }

      if (durum === "kapaniyor") {
        var ku = Math.min(1, (now - (window.__s3bKapatT || now)) / 480);
        var e2 = 1 - Math.pow(1 - ku, 3);
        kapak.rotation.x = KAPAK_ACI * (1 - e2);
        icIsik.intensity = huzmeGuc * 1.1 * (1 - e2);
        if (ku >= 1) {
          kapak.rotation.x = 0;
          icIsik.intensity = 0;
          durum = "kapali";
          sandik.scale.set(1, 1, 1);
        }
      }

      for (var i = elmaslar.length - 1; i >= 0; i--) {
        var e = elmaslar[i];
        e.hiz.y -= 21.4 * dt;
        e.m.position.addScaledVector(e.hiz, dt);
        e.m.material.rotation += e.donHiz * dt;
        if (e.m.position.y < -0.78) { e.m.position.y = -0.78; e.hiz.y *= -0.42; e.hiz.multiplyScalar(0.82); }
        e.omur += dt;
        if (e.omur > 4) { sahne.remove(e.m); elmaslar.splice(i, 1); }
      }

      huzmeGuncelle(dt, now);
      bloomCiz();
      rafId = requestAnimationFrame(dongu);
    }

    /* ── Panelin devralınması ──────────────────────────────────── */
    function sil(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

    /* ESKİ SANDIĞIN TEMİZLİĞİ — THREE'den BAĞIMSIZ.
       Eskiden temizlik WebGL kurulumunun içindeydi; THREE hazır
       değilken kurulum yarıda kalıyor, eski sandık ekranda kalıyordu.
       Artık ayrı ve her çağrıda güvenle tekrarlanabilir. */
    function eskiyiKaldir() {
      var chestEl = document.getElementById("chestEl");
      if (!chestEl) return false;

      sil(document.getElementById("chestSvg"));
      sil(document.getElementById("chestSparkle"));
      var glow = document.getElementById("chestGlow");
      if (glow) sil(glow.ownerSVGElement || glow);
      /* Kutunun içinde bizim tuvalimiz dışında ne varsa gider —
         panel yeniden çizilirse de aynı sonuç. */
      Array.prototype.slice.call(chestEl.children).forEach(function (c) {
        if (!c.classList || !c.classList.contains("s3b-kap")) sil(c);
      });
      return true;
    }

    function stilEkle() {
      if (document.getElementById("s3bStil")) return;
      var st = document.createElement("style");
      st.id = "s3bStil";
      st.textContent =
        "#panel-chest .overlay-card{overflow:visible !important;padding-bottom:14px !important}" +
        "#panel-chest .chest-zone{padding-top:4px !important;gap:6px !important}" +
        "#panel-chest #chestEl{width:70% !important;max-width:260px !important;" +
          "height:200px !important;margin:8px auto 2px !important;position:relative !important;" +
          "overflow:visible !important;filter:none !important;animation:none !important;" +
          "background:none !important}" +
        "#panel-chest .chest-meta{margin-bottom:0 !important}" +
        "#panel-chest .chest-result{margin:0 !important;visibility:hidden !important;" +
          "height:0 !important;overflow:hidden !important}" +
        "#panel-chest #chestSvg,#panel-chest .chest-svg," +
        "#panel-chest #chestGlow,#panel-chest .chest-glow-burst," +
        "#panel-chest #chestSparkle,#panel-chest .chest-sparkle{display:none !important}";
      document.head.appendChild(st);
    }

    function devral() {
      stilEkle();
      if (!eskiyiKaldir()) return false;          /* panel henüz yok */
      if (typeof THREE === "undefined") return false;  /* WebGL sonra */
      var chestEl = document.getElementById("chestEl");
      if (!kuruldu) {
        /* Artık kalmış bir tuval varsa yenisini üstüne koyma. */
        var eskiKap = chestEl.querySelector(".s3b-kap");
        if (eskiKap) sil(eskiKap);
        kurulum(chestEl);
        kuruldu = true;
      } else if (kap && kap.parentNode !== chestEl) {
        chestEl.appendChild(kap);                 /* panel yeniden çizilmişse */
      }
      return true;
    }

    function basla() {
      if (!devral()) return;
      if (calisiyor) return;
      calisiyor = true;
      olcule();
      sonKare = performance.now();
      rafId = requestAnimationFrame(dongu);
    }

    function dur() {
      calisiyor = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      sifirla();
    }

    /* ── ISITMA — sahne panel AÇILMADAN ÖNCE kurulur ────────────
       Kurulum eskiden ilk açılışta yapılıyordu: ahşap/metal
       dokularının çizimi, WebGLRenderer + gölge haritası + bloom
       hedefleri ve gölgeci derlemesi panel açıldıktan SONRA
       çalışıyor, sandık yarım saniye geç geliyordu. Artık oyun
       boştayken kurulur ve gizliyken bir kare çizilerek gölgeciler
       derlenir; panel açıldığında ilk karede hazırdır.
       three.js rehber.js'ten SONRA yüklendiği için THREE gelene
       kadar tekrar denenir. */
    var isindi = false, isitmaDeneme = 0;
    function isit() {
      if (isindi) return;
      if (typeof THREE === "undefined" || !document.getElementById("chestEl") || !devral()) {
        if (++isitmaDeneme < 40) setTimeout(isit, 250);   /* ~10 sn boyunca dener */
        return;
      }
      isindi = true;
      /* Panel gizliyken kutu 0 ölçülür (gizli kapsayıcı 0). Isıtma
         karesi sabit ölçüyle çizilir; gerçek ölçü açılışta
         olcule() ile verilir. */
      try {
        cizer.setSize(300, 300, false);
        rtSahne.setSize(300, 300);
        rtA.setSize(150, 150);
        rtB.setSize(150, 150);
        kamera.aspect = 1;
        kamera.updateProjectionMatrix();
        bloomCiz();
        sifirla();
      } catch (e) {}
    }

    function isitmaPlanla() {
      if (window.requestIdleCallback) requestIdleCallback(isit, { timeout: 3000 });
      else setTimeout(isit, 1200);
    }

    /* Panel görünürlüğü izlenir: açıkken çizer, kapanınca durur —
       kapalı panelde WebGL döngüsü pil yakmasın. Devralma BAŞARISIZ
       olursa (THREE henüz yok) her turda yeniden denenir. */
    function panelAcikMi() {
      var p = document.getElementById("panel-chest");
      if (!p) return false;
      var g = getComputedStyle(p);
      return g.display !== "none" && g.visibility !== "hidden";
    }

    function panelDurum() {
      if (panelAcikMi()) {
        if (!calisiyor) basla();                 /* başarısızsa tekrar dener */
        else if (document.getElementById("chestSvg")) eskiyiKaldir();
      } else if (calisiyor) {
        dur();
      }
    }

    function gozle() {
      eskiyiKaldir();      /* açılışta, panel açılmadan da temizle */

      /* PANEL AÇILIŞI ANINDA YAKALANIR.
         Eskiden yalnız 300 ms'lik yoklama vardı: panel açıldıktan
         sonra bir tur beklenip ANCAK ONDAN SONRA kurulum başlıyordu.
         Panel `.active` sınıfıyla açıldığı için sınıf değişimi
         doğrudan dinlenir; yoklama yalnız yedek olarak kalır.
         (Panelin kendi sınıfına burada DOKUNULMUYOR — sonsuz döngü
         riski yok.) */
      var panelEl = document.getElementById("panel-chest");
      if (panelEl && window.MutationObserver) {
        new MutationObserver(panelDurum)
          .observe(panelEl, { attributes: true, attributeFilter: ["class", "style"] });
      }

      setInterval(panelDurum, 300);

      /* Sandığa dokunulunca: oyunun openChest'i ödülü verir, biz
         yalnız görsel katmanı sürüyoruz. Tutar 880 ms sonra
         #chestResult'a yazılıyor, oradan okunur. */
      document.addEventListener("click", function (ev) {
        var t = ev.target && ev.target.closest ? ev.target.closest("#chestEl") : null;
        if (!t || !calisiyor) return;
        tetikle();                          /* her basışta anında sıfırla */
        var r0 = document.getElementById("chestResult");
        var onceki = r0 ? r0.textContent : "";
        var dene = 0;
        var bak = setInterval(function () {
          var r = document.getElementById("chestResult");
          var metin = r ? r.textContent : "";
          if (metin && metin !== onceki) {
            clearInterval(bak);
            var tutar = parseInt(String(metin).replace(/[^0-9]/g, ""), 10) || 0;
            if (tutar > 0) ac(tutar);
          } else if (++dene > 25) clearInterval(bak);   /* ~2 sn sonra vazgeç */
        }, 80);
      }, true);

      /* Eski sandık herhangi bir yolla DOM'a geri eklenirse anında
         silinir — hangi kodun eklediğini beklemeye gerek kalmaz. */
      var chestEl0 = document.getElementById("chestEl");
      if (chestEl0 && window.MutationObserver) {
        new MutationObserver(function () {
          if (document.getElementById("chestSvg") ||
              document.getElementById("chestSparkle") ||
              chestEl0.querySelector("svg")) eskiyiKaldir();
        }).observe(chestEl0, { childList: true });
      }

      addEventListener("resize", function () { if (calisiyor) olcule(); });
    }

    /* Stil HEMEN basılır — DOM hazır olmasını beklersek eski sandık
       yarım saniye ekranda kalıyor. CSS önce gelirse hiç boyanmaz. */
    if (document.head) stilEkle();
    else document.addEventListener("DOMContentLoaded", stilEkle);

    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", gozle);
    else gozle();

    /* Isıtma sayfa yükü bittikten sonra, boşta başlar — açılış
       akışını yavaşlatmasın. */
    if (document.readyState === "complete") isitmaPlanla();
    else addEventListener("load", isitmaPlanla);

    return { basla: basla, dur: dur, ac: ac, sifirla: sifirla, isit: isit,
             AYAR: AYAR, uygula: uygula, kuruldumu: function () { return kuruldu; } };
  })();

  window.SANDIK3B = SANDIK3B;

  /* ═══════════════════════════════════════════════════════════════════
     SANDIK İNCE AYAR PANELİ — yalnız ?sandikayar=1 ile açılır.
     Sürgüler SANDIK3B.AYAR'a yazar, her harekette uygula() çağrılır;
     model canlı değişir. Alttaki kutuda güncel değerler kod olarak
     durur — kopyalanıp bana verilir, sabitler dosyaya işlenir.
     TANI PANELİ: iş bitince bu blok SİLİNİR.
     ═══════════════════════════════════════════════════════════════════ */
  (function sandikAyarPaneli() {
    if (!/[?&]sandikayar=1/.test(location.search)) return;

    var A = SANDIK3B.AYAR;
    var VARSAYILAN = JSON.parse(JSON.stringify(A));

    var SURGU = {
      kamera: [
        ["kamYatay", "Sağ / Sol", -180, 180, 1],
        ["kamYukseklik", "Yukarı / Aşağı", -0.6, 1.6, 0.01],
        ["kamMesafe", "Yakın / Uzak", 0.5, 2.0, 0.01],
        ["kamBakis", "Bakış yüksekliği", -1, 3, 0.01]
      ],
      isik: [
        ["isikAci", "Işık yönü", -180, 180, 1],
        ["isikYuk", "Işık yüksekliği", -2, 12, 0.1],
        ["isikUzak", "Işık uzaklığı", 0.5, 12, 0.1],
        ["isikGuc", "Ana ışık gücü", 0, 3, 0.01],
        ["ortamGuc", "Ortam ışığı", 0, 3, 0.01],
        ["yariGuc", "Gök/yer ışığı", 0, 3, 0.01],
        ["pozlama", "Pozlama", 0.3, 2.5, 0.01]
      ],
      renk: [
        ["ahsapRenk", "Ahşap tonu", "renk"],
        ["metalRenk", "Metal tonu", "renk"],
        ["icRenk", "İç ışık", "renk"]
      ]
    };

    function el(t, s, ic) {
      var e = document.createElement(t);
      if (s) e.style.cssText = s;
      if (ic != null) e.textContent = ic;
      return e;
    }

    var kutu = el("div",
      "position:fixed;left:6px;top:56px;width:186px;z-index:99999;" +
      "background:rgba(4,16,34,.93);border:1px solid #2f6da8;border-radius:10px;" +
      "padding:6px 7px 7px;font-family:'Baloo 2',sans-serif;color:#e8f4ff;" +
      "font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,20,45,.3);" +
      "user-select:none");

    var bas = el("div", "display:flex;align-items:center;gap:4px;margin-bottom:4px");
    var basYazi = el("span", "flex:1;font-size:11px;color:#8ce3ff", "SANDIK AYAR");
    var kucult = el("button",
      "background:#12406e;color:#e8f4ff;border:0;border-radius:6px;width:22px;height:20px;" +
      "font-weight:800;line-height:1", "–");
    bas.appendChild(basYazi); bas.appendChild(kucult);
    kutu.appendChild(bas);

    var govde = el("div", "");
    kutu.appendChild(govde);

    var sekmeSatir = el("div", "display:flex;gap:3px;margin-bottom:5px");
    var alan = el("div", "max-height:44vh;overflow-y:auto");
    govde.appendChild(sekmeSatir);
    govde.appendChild(alan);

    var cikti = el("textarea",
      "width:100%;height:74px;margin-top:5px;background:#03101f;color:#8ce3ff;" +
      "border:1px solid #235e94;border-radius:6px;font-size:9px;font-family:monospace;" +
      "font-variant-numeric:tabular-nums;padding:4px;box-sizing:border-box");
    cikti.readOnly = true;
    govde.appendChild(cikti);

    var altSatir = el("div", "display:flex;gap:4px;margin-top:4px");
    function dugme(yazi, renk) {
      var b = el("button",
        "flex:1;background:" + renk + ";color:#fff;border:0;border-radius:6px;" +
        "padding:5px 0;font-weight:800;font-size:10px;font-family:inherit", yazi);
      b.addEventListener("touchstart", function () {
        b.style.transform = "scale(.96)"; b.style.filter = "brightness(.93)";
      });
      ["touchend", "touchcancel", "mouseup", "mouseleave"].forEach(function (o) {
        b.addEventListener(o, function () { b.style.transform = ""; b.style.filter = ""; });
      });
      return b;
    }
    var kopyaBtn = dugme("Kopyala", "#1d7a3f");
    var sifirBtn = dugme("Sıfırla", "#8a3030");
    altSatir.appendChild(kopyaBtn); altSatir.appendChild(sifirBtn);
    govde.appendChild(altSatir);

    var uyari = el("div", "margin-top:4px;font-size:9px;color:#ffcf7a;line-height:1.25", "");
    govde.appendChild(uyari);

    function ciktiYaz() {
      var satir = [];
      Object.keys(VARSAYILAN).forEach(function (k) {
        var v = A[k];
        satir.push("  " + k + ": " + (typeof v === "number" ? (Math.round(v * 100) / 100) : '"' + v + '"'));
      });
      cikti.value = "AYAR = {\n" + satir.join(",\n") + "\n};";
    }

    function degisti() {
      SANDIK3B.uygula();
      ciktiYaz();
      uyari.textContent = SANDIK3B.kuruldumu()
        ? "" : "Sandık panelini aç — model orada çizilir.";
    }

    function sekmeCiz(ad) {
      alan.innerHTML = "";
      SURGU[ad].forEach(function (s) {
        var anahtar = s[0], etiket = s[1];
        var satir = el("div", "margin-bottom:6px");
        var basl = el("div",
          "display:flex;justify-content:space-between;font-size:10px;color:#e8f4ff;" +
          "font-variant-numeric:tabular-nums");
        var ad2 = el("span", "", etiket);
        var deg = el("span", "color:#8ce3ff", "");
        basl.appendChild(ad2); basl.appendChild(deg);
        satir.appendChild(basl);

        if (s[2] === "renk") {
          var ci = document.createElement("input");
          ci.type = "color"; ci.value = A[anahtar];
          ci.style.cssText = "width:100%;height:24px;border:0;background:none;padding:0";
          deg.textContent = A[anahtar];
          ci.addEventListener("input", function () {
            A[anahtar] = ci.value; deg.textContent = ci.value; degisti();
          });
          satir.appendChild(ci);
        } else {
          var r = document.createElement("input");
          r.type = "range"; r.min = s[2]; r.max = s[3]; r.step = s[4];
          r.value = A[anahtar];
          r.style.cssText = "width:100%;margin:2px 0 0";
          deg.textContent = A[anahtar];
          r.addEventListener("input", function () {
            A[anahtar] = parseFloat(r.value);
            deg.textContent = r.value;
            degisti();
          });
          satir.appendChild(r);
        }
        alan.appendChild(satir);
      });
    }

    [["kamera", "Kamera"], ["isik", "Işık"], ["renk", "Renk"]].forEach(function (s, i) {
      var b = el("button",
        "flex:1;border:0;border-radius:6px;padding:4px 0;font-size:10px;font-weight:800;" +
        "font-family:inherit;background:#12406e;color:#9fc6ea", s[1]);
      b.dataset.ad = s[0];
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(sekmeSatir.children, function (o) {
          o.style.background = "#12406e"; o.style.color = "#9fc6ea";
        });
        b.style.background = "#1f6fb0"; b.style.color = "#fff";
        sekmeCiz(s[0]);
      });
      sekmeSatir.appendChild(b);
      if (i === 0) setTimeout(function () { b.click(); }, 0);
    });

    kopyaBtn.addEventListener("click", function () {
      cikti.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      if (!ok && navigator.clipboard) navigator.clipboard.writeText(cikti.value);
      kopyaBtn.textContent = "Kopyalandı";
      setTimeout(function () { kopyaBtn.textContent = "Kopyala"; }, 1200);
    });

    sifirBtn.addEventListener("click", function () {
      Object.keys(VARSAYILAN).forEach(function (k) { A[k] = VARSAYILAN[k]; });
      var acik = sekmeSatir.querySelector("button[style*='1f6fb0']");
      sekmeCiz(acik ? acik.dataset.ad : "kamera");
      degisti();
    });

    var kapali = false;
    kucult.addEventListener("click", function () {
      kapali = !kapali;
      govde.style.display = kapali ? "none" : "";
      kucult.textContent = kapali ? "+" : "–";
      kutu.style.width = kapali ? "auto" : "186px";
    });

    function tak() {
      document.body.appendChild(kutu);
      ciktiYaz();
      uyari.textContent = "Sandık panelini aç — model orada çizilir.";
    }
    if (document.body) tak();
    else document.addEventListener("DOMContentLoaded", tak);
  })();

  window.REHBER = {
    maybeWelcome: maybeWelcome,
    maybeDaily: maybeDaily,
    showWelcome: function (state, api) { buildAndShow(state, api, WELCOME_CFG); },
  };

  console.log("[rehber.js] Rehberlik merkezi yuklendi ✔");
})();
