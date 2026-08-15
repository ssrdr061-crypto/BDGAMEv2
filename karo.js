/* ═══════════════════════════════════════════════════════════════
   karo.js — HARİTADA KARO SEÇİMİ
   ---------------------------------------------------------------
   Boşluğa dokununca eskiden ✏️ + koordinat etiketi çıkıyordu.
   Artık o karo SEÇİLİR: üstünde sürekli nefes alan bir ışıltı/
   kararma durur, tepesinde tek bir çubuk çıkar — IŞINLAN · PAYLAŞ.

   NEDEN AYRI DOSYA: index.html'in 13 satır içi script'ine
   dokunmadan çalışır. handleMapTap üst düzey bir fonksiyon olduğu
   için window üzerinden DEVRALINIR; çağrı anında bizimki bulunur.

   BAĞIMLILIKLAR (hepsi yoksa sessizce eski davranışa döner):
     window.HARITA.ekranKonumu / dugumleriYerlestir
     window.KOORD
     window.KALE_TASIMA  → index.html'den açılan kapı
                           { tasi, bosMu, bedel }
     window.shareCoordInChat
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const SURUM = "karo-2";

  /* Seçili karo: {kx, ky} tam sayı. Yoksa null. */
  let _secili = null;
  let _svg = null, _poly = null, _cubuk = null;
  let _sonNokta = "";        /* son çizilen köşeler — boşuna DOM yazmamak için */
  let _dongu = 0;            /* rAF kimliği; seçim yokken hiç dönmez */

  function K() { return window.KOORD; }
  function H() { return window.HARITA; }
  function haritaVar() {
    return !!(H() && typeof H().ekranKonumu === "function" && K());
  }

  /* ── STİL ─────────────────────────────────────────────────── */
  (function stil() {
    if (document.getElementById("karoStil")) return;
    const st = document.createElement("style");
    st.id = "karoStil";
    st.textContent = `
/* Karo üstündeki nefes: içi kararır, kenarı ışıldar. */
@keyframes karoNefes{
  0%,100%{ opacity:.45; }
  50%    { opacity:.95; }
}
#karoSecim{
  position:absolute; left:0; top:0; width:100%; height:100%;
  overflow:visible; pointer-events:none; z-index:6;
}
#karoSecim polygon{
  animation:karoNefes 1.8s ease-in-out infinite;
}

/* Karonun tepesindeki çubuk — haritanın üstünde yüzer. */
#karoCubuk{
  position:fixed; z-index:940; transform:translate(-50%,-100%);
  display:flex; gap:7px; padding:0;
  font-family:'Baloo 2','Nunito',sans-serif;
  -webkit-tap-highlight-color:transparent;
}
#karoCubuk button{
  border:none; outline:none; cursor:pointer; color:#fff;
  padding:8px 13px; border-radius:11px; white-space:nowrap;
  font-family:'Baloo 2','Nunito',sans-serif;
  font-weight:800; font-size:13px;
  text-shadow:0 1px 2px rgba(0,20,45,.55);
  box-shadow:0 2px 6px rgba(0,20,45,.3);
  transition:transform .09s ease, filter .09s ease;
}
#karoCubuk button:active{ transform:scale(.96); filter:brightness(.93); }
#karoCubuk .kc-isin{ background:linear-gradient(180deg,#4fd8ff,#1fa3ea); }
#karoCubuk .kc-pay { background:linear-gradient(180deg,#5a6b80,#3b4859); }

/* Işınlanma: kale yeni yerinde bir kez parlayıp oturur. */
@keyframes karoIsinlan{
  0%  { opacity:0; transform:translate(-50%,-50%) scale(.55); filter:brightness(2.4); }
  55% { opacity:1; transform:translate(-50%,-50%) scale(1.12); filter:brightness(1.5); }
  100%{ opacity:1; transform:translate(-50%,-50%) scale(1);    filter:brightness(1); }
}
/* DİKKAT: .map-node zaten translate(-50%,-50%) kullanıyor.
   Animasyon transform'u KOMPLE ezdiği için ortalama animasyonun
   İÇİNE yazıldı; yoksa kale kendi yarı genişliği kadar kayar. */
.castle-isinla{ animation:karoIsinlan .42s cubic-bezier(.2,.9,.3,1.3); }
`;
    document.head.appendChild(st);
  })();

  /* ── ÇİZİM ────────────────────────────────────────────────── */
  const NS = "http://www.w3.org/2000/svg";

  function katman() {
    const mapEl = document.getElementById("battleMap");
    if (!mapEl) return null;
    if (!_svg) {
      _svg = document.createElementNS(NS, "svg");
      _svg.id = "karoSecim";
      _poly = document.createElementNS(NS, "polygon");
      _poly.setAttribute("stroke-width", "2.5");
      _poly.setAttribute("stroke-linejoin", "round");
      _poly.setAttribute("fill", "rgba(4,16,36,.42)");     /* kararma */
      _poly.setAttribute("stroke", "#8fe8ff");             /* ışıltı  */
      _svg.appendChild(_poly);
    }
    /* renderBattleMap innerHTML'i siler; katman koptuysa geri tak. */
    if (_svg.parentNode !== mapEl) mapEl.appendChild(_svg);
    return _svg;
  }

  function cubuk() {
    if (_cubuk && _cubuk.isConnected) return _cubuk;
    _cubuk = document.createElement("div");
    _cubuk.id = "karoCubuk";
    _cubuk.innerHTML =
      '<button class="kc-isin" type="button">⚡ Işınlan</button>' +
      '<button class="kc-pay"  type="button">📤 Paylaş</button>';
    document.body.appendChild(_cubuk);
    _cubuk.querySelector(".kc-isin").onclick = isinlan;
    _cubuk.querySelector(".kc-pay").onclick  = paylas;
    return _cubuk;
  }

  /* Seçimi ekrana oturt. Harita kaydıkça yeniden çağrılır. */
  function ciz() {
    if (!_secili || !haritaVar()) { gizle(); return; }
    const mapEl = document.getElementById("battleMap");
    const sv = katman();
    if (!mapEl || !sv) { gizle(); return; }

    /* Karo izometrik çizildiği için ekranda kare değil EŞKENAR
       DÖRTGEN görünür; dört köşe tek tek izdüşürülür. */
    const kose = [[-0.5,-0.5],[0.5,-0.5],[0.5,0.5],[-0.5,0.5]].map(([dx, dy]) => {
      const p = H().ekranKonumu(K().karodanOlcek(_secili.kx + dx),
                                K().karodanOlcek(_secili.ky + dy));
      return p ? p : null;
    });
    if (kose.some(k => !k)) { gizle(); return; }

    const nokta = kose.map(p => Math.round(p.x) + "," + Math.round(p.y)).join(" ");
    if (nokta !== _sonNokta) {                 /* değişmediyse DOM'a dokunma */
      _poly.setAttribute("points", nokta);
      _sonNokta = nokta;
    }
    sv.style.display = "block";

    /* Çubuk karonun ÜST köşesinin biraz yukarısında; ekran dışına
       taşarsa içeri çekilir (sağdaki "Paylaş" kesiliyordu). */
    const r = mapEl.getBoundingClientRect();
    const ust = kose[0];                       /* (-0.5,-0.5) = üst köşe */
    const c = cubuk();
    c.style.display = "flex";

    const yari = (c.offsetWidth || 200) / 2;
    const kenar = 8;
    let cx = r.left + ust.x;
    cx = Math.max(yari + kenar, Math.min(cx, window.innerWidth - yari - kenar));
    let cy = r.top + ust.y - 8;
    cy = Math.max((c.offsetHeight || 36) + kenar, cy);

    c.style.left = Math.round(cx) + "px";
    c.style.top  = Math.round(cy) + "px";
  }

  function gizle() {
    if (_svg) _svg.style.display = "none";
    if (_cubuk) _cubuk.style.display = "none";
    _sonNokta = "";
  }

  /* ── TAKİP DÖNGÜSÜ ──
     harita.js kaydırırken KENDİ içindeki fonksiyonu çağırıyor;
     dışarıdan sarılan kopya hiç tetiklenmiyordu ve seçim ekranda
     çakılı kalıp haritanın altından kayıyordu. Çözüm: seçim
     varken kendi karemizi çeviriyoruz. Seçim yokken döngü HİÇ
     çalışmaz, boşta harita yavaşlamaz. */
  function donguBaslat() {
    if (_dongu) return;
    const adim = () => {
      if (!_secili) { _dongu = 0; return; }
      try { ciz(); } catch (e) {}
      _dongu = requestAnimationFrame(adim);
    };
    _dongu = requestAnimationFrame(adim);
  }
  function donguDurdur() {
    if (_dongu) { cancelAnimationFrame(_dongu); _dongu = 0; }
  }

  function sec(kx, ky) {
    _secili = { kx: kx, ky: ky };
    _sonNokta = "";
    ciz();
    donguBaslat();
  }
  function birak() {
    _secili = null;
    donguDurdur();
    gizle();
  }

  /* ── IŞINLAN ──────────────────────────────────────────────── */
  function isinlan() {
    if (!_secili) return;
    const kapi = window.KALE_TASIMA;
    if (!kapi || typeof kapi.tasi !== "function") {
      uyar("Taşıma şu an kullanılamıyor.");
      return;
    }
    const g = {
      gx: K().karodanOlcek(_secili.kx),
      gy: K().karodanOlcek(_secili.ky)
    };

    if (typeof kapi.bosMu === "function" && !kapi.bosMu(g.gx, g.gy)) {
      uyar("Burası dolu — kale ya da canavar var.");
      return;
    }
    const bedel = (typeof kapi.bedel === "number") ? kapi.bedel : 0;
    const elmas = (typeof state !== "undefined" && state) ? (state.diamonds || 0) : 0;
    if (elmas < bedel) {
      uyar(`Işınlanma ${bicim(bedel)} 💎 tutuyor, yeterli elmasın yok.`);
      return;
    }

    birak();
    kapi.tasi(g);
    parlat();
  }

  /* Kale yeni yerinde bir kez parlasın. renderBattleMap düğümü
     yeniden ürettiği için sınıf bir kare SONRA takılır. */
  function parlat() {
    setTimeout(() => {
      const el = document.querySelector("#battleMap .castle-node.castle-own");
      if (!el) return;
      el.classList.remove("castle-isinla");
      void el.offsetWidth;                    /* animasyonu yeniden tetikle */
      el.classList.add("castle-isinla");
      setTimeout(() => el.classList.remove("castle-isinla"), 600);
    }, 40);
  }

  /* ── PAYLAŞ ───────────────────────────────────────────────── */
  function paylas() {
    if (!_secili) return;
    const f = window.shareCoordInChat;
    if (typeof f !== "function") { uyar("Sohbet hazır değil."); return; }
    const gx = K().karodanOlcek(_secili.kx);
    const gy = K().karodanOlcek(_secili.ky);
    birak();
    try { f(gx, gy, ""); } catch (e) { console.error(e); }
  }

  function uyar(m) {
    if (typeof window.showToast === "function") { window.showToast(m); return; }
    console.log("[karo]", m);
  }
  function bicim(n) {
    return (typeof window.fmt === "function") ? window.fmt(n) : String(n);
  }

  /* ── HARİTA DOKUNUŞUNU DEVRAL ─────────────────────────────── */
  /* Eski handleMapTap ✏️ işaretini koyuyordu. Onu hiç çağırmıyoruz;
     pendingShareCoord'a dokunulmadığı için kalem bir daha doğmaz. */
  function dokunmayiDevral() {
    const eski = window.handleMapTap;
    if (typeof eski !== "function" || eski._karoSarildi) return false;

    const yeni = function (clientX, clientY, targetEl) {
      /* Düğüm, ordu ya da bizim çubuğumuz — karışma. */
      if (targetEl && targetEl.closest &&
          targetEl.closest(".map-node, .loot-node, .sefer-ordu, #karoCubuk")) return;

      if (!haritaVar() || typeof H().ekranaGoreIzgara !== "function") {
        return eski.apply(this, arguments);    /* harita yoksa eski yol */
      }
      const g = H().ekranaGoreIzgara(clientX, clientY, 30, 0);
      if (!g) return;

      const kx = K().karoyaOturt(K().olcektenKaro(g.gx));
      const ky = K().karoyaOturt(K().olcektenKaro(g.gy));

      /* Aynı karoya ikinci dokunuş seçimi bırakır. */
      if (_secili && _secili.kx === kx && _secili.ky === ky) { birak(); return; }
      sec(kx, ky);
    };
    yeni._karoSarildi = true;
    window.handleMapTap = yeni;
    return true;
  }

  /* Harita ekranı kapanınca seçim de kalksın. */
  function ekraniIzle() {
    setInterval(() => {
      if (!_secili) return;
      const wrap = document.getElementById("battleMapWrap");
      if (!wrap || wrap.style.display === "none") birak();
    }, 1000);
  }

  /* ── KUR ──────────────────────────────────────────────────── */
  /* index.html ve harita.js bizden sonra hazır olabilir; ikisi de
     bağlanana kadar kısa aralıklarla deniyoruz. */
  (function kur() {
    let kalan = 60;
    const t = setInterval(() => {
      dokunmayiDevral();
      if (window.handleMapTap && window.handleMapTap._karoSarildi) {
        clearInterval(t);
        ekraniIzle();
      } else if (--kalan <= 0) {
        clearInterval(t);
        console.warn("[karo] bağlanamadı — eski davranış sürüyor");
      }
    }, 250);
  })();

  window.KARO = {
    SURUM: SURUM,
    sec: sec, birak: birak,
    secili: () => _secili ? { kx: _secili.kx, ky: _secili.ky } : null,
  };
})();
