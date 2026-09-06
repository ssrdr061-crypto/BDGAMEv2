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
      try { if (parcaEl && parcaEl.tagName === "IMG") parcaSrc = parcaEl.getAttribute("src") || ""; } catch (e) {}
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
      var parcaImg = secili ? secili.querySelector("img") : null;
      /* KIRPMA TUZAĞI: parça görseli kutusunun dışına taşıyor, resmin
         kendi rect'i ekran dışına düşebiliyor. Konum KUTUDAN alınır. */
      var parcaNk = ODUL_UCUS.nokta(secili || parcaImg);
      var parcaSrc = parcaImg ? (parcaImg.getAttribute("src") || "") : "";
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

  window.REHBER = {
    maybeWelcome: maybeWelcome,
    maybeDaily: maybeDaily,
    showWelcome: function (state, api) { buildAndShow(state, api, WELCOME_CFG); },
  };

  console.log("[rehber.js] Rehberlik merkezi yuklendi ✔");
})();
