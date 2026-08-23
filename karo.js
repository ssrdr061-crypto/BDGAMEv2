/* ═══════════════════════════════════════════════════════════════
   karo.js — HARİTADA KARO SEÇİMİ
   ---------------------------------------------------------------
   Boşluğa dokununca o karo SEÇİLİR: üstünde nefes alan bir
   ışıltı/kararma durur, tepesinde küçük bir çubuk çıkar —
   ⚡ Işınlan · 📤 Paylaş.

   NEDEN AYRI DOSYA: index.html'in 13 satır içi script'ine
   dokunmadan çalışır. handleMapTap üst düzey bir fonksiyon olduğu
   için window üzerinden DEVRALINIR.

   BAĞIMLILIKLAR (yoksa sessizce eski davranışa döner):
     window.HARITA.ekranKonumu / ekranaGoreIzgara / dugumBul
     window.KOORD
     window.KALE_TASIMA → index.html'den açılan kapı
                          { tasi, bosMu, bedel, mod }
     window.shareCoordInChat
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const SURUM = "karo-3";

  /* Seçili karo: {kx, ky} tam sayı. Yoksa null. */
  let _secili = null;
  let _svg = null, _poly = null, _cubuk = null;
  let _sonNokta = "";        /* son çizilen köşeler — boşuna DOM yazmamak için */
  let _dongu = 0;            /* rAF kimliği; seçim yokken hiç dönmez */
  let _cubukYari = 90;       /* çubuğun yarı genişliği — bir kez ölçülür  */

  function K() { return window.KOORD; }
  function H() { return window.HARITA; }
  function haritaVar() {
    return !!(H() && typeof H().ekranKonumu === "function" && K());
  }
  function harita() { return document.getElementById("battleMap"); }
  function sarmal()  { return document.getElementById("battleMapWrap"); }

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

/* Karonun tepesindeki çubuk.
   DİKKAT — position:fixed DEĞİL: çubuk haritanın kendi düğüm
   katmanının (#battleMap) İÇİNDE duruyor. Böylece harita ölçülmeden
   yerleşiyor ve paneller (kale bilgisi, savaş, mağaza) üstünde
   çizilebiliyor.

   z-index NEDEN BU KADAR BÜYÜK: harita.js her kaleye derinliğine
   göre katman numarası veriyor (10 + (gx+gy)*10), bu da haritanın
   alt tarafındaki kalelerde 400'ü aşıyor. Küçük bir sayı verilirse
   çubuk kalenin ALTINDA kalıyor. Bu numara #battleMap'in KENDİ
   katmanının içinde geçerli — dışarıdaki panellerin üstüne çıkmaz. */
#karoCubuk{
  position:absolute; z-index:99999; transform:translate(-50%,-100%);
  display:flex; gap:5px; padding:0;
  font-family:'Baloo 2','Nunito',sans-serif;
  -webkit-tap-highlight-color:transparent;
}
#karoCubuk button{
  border:none; outline:none; cursor:pointer; color:#fff;
  padding:5px 10px; border-radius:9px; white-space:nowrap;
  font-family:'Baloo 2','Nunito',sans-serif;
  font-weight:800; font-size:11.5px; line-height:1.15;
  text-shadow:0 1px 2px rgba(0,20,45,.55);
  box-shadow:none;
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
    const mapEl = harita();
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
    const mapEl = harita();
    if (!mapEl) return null;
    if (!_cubuk) {
      _cubuk = document.createElement("div");
      _cubuk.id = "karoCubuk";
      _cubuk.innerHTML =
        '<button class="kc-isin" type="button">⚡ Işınlan</button>' +
        '<button class="kc-pay"  type="button">📤 Paylaş</button>';
      _cubuk.querySelector(".kc-isin").onclick = (e) => { sus(e); isinlan(); };
      _cubuk.querySelector(".kc-pay").onclick  = (e) => { sus(e); paylas();  };

      /* Harita sarmalayıcısı pointerdown/pointerup dinliyor; bizim
         düğmemize basılınca kaydırma başlamasın ve dokunuş haritaya
         "boşluğa basıldı" diye gitmesin. */
      ["pointerdown", "pointerup", "touchstart", "touchend"].forEach(tur => {
        _cubuk.addEventListener(tur, sus);
      });
    }
    if (_cubuk.parentNode !== mapEl) mapEl.appendChild(_cubuk);
    return _cubuk;
  }
  function sus(e) { if (e) { e.stopPropagation(); } }

  /* Seçimi ekrana oturt. Harita kaydıkça yeniden çağrılır. */
  function ciz() {
    if (!_secili || !haritaVar()) { gizle(); return; }
    const mapEl = harita();
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

    /* Çubuk karonun ÜST köşesinin biraz yukarısında.
       Koordinatlar #battleMap'e göre; bu katman sarmalayıcıyla birebir
       aynı yeri kapladığı için ölçüm gerekmez — SALLANMA BURADAN
       GİDİYOR. Genişlik de her karede değil, seçim anında ölçülüyor. */
    const w = sarmal() ? sarmal().clientWidth : (window.innerWidth || 0);
    const ust = kose[0];                       /* (-0.5,-0.5) = üst köşe */
    const c = cubuk();
    if (!c) { gizle(); return; }
    c.style.display = "flex";

    const kenar = 8;
    let cx = ust.x;
    if (w) cx = Math.max(_cubukYari + kenar, Math.min(cx, w - _cubukYari - kenar));
    let cy = Math.max(34 + kenar, ust.y - 6);

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
     dışarıdan sarılan kopya hiç tetiklenmiyor (Tuzak 20). Seçim
     varken kendi karemizi çeviriyoruz; seçim yokken döngü HİÇ
     çalışmaz. */
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
    const c = cubuk();
    if (c) {                       /* genişliği burada bir kez ölç */
      c.style.display = "flex";
      const g = c.offsetWidth;
      if (g) _cubukYari = g / 2;
    }
    ciz();
    donguBaslat();
  }
  function birak() {
    if (!_secili) return;
    _secili = null;
    donguDurdur();
    gizle();
  }

  /* ── IŞINLAN ──────────────────────────────────────────────── */
  /* Artık kaleyi ANINDA taşımıyor. index.html'deki taşıma modunu
     açıyor: yarı saydam kale silüeti parmağı takip eder, ekran
     kaymaz, hedef karo boşsa yeşil doluysa kırmızı çerçevelenir ve
     altta "✕ 20.000 💎 ✓" çubuğu çıkar. Onay orada verilir. */
  function isinlan() {
    if (!_secili) return;
    const kapi = window.KALE_TASIMA;
    if (!kapi) { uyar("Taşıma şu an kullanılamıyor."); return; }

    const bedel = (typeof kapi.bedel === "number") ? kapi.bedel : 0;
    const elmas = (typeof state !== "undefined" && state) ? (state.diamonds || 0) : 0;
    if (elmas < bedel) {
      uyar(`Işınlanma ${bicim(bedel)} 💎 tutuyor, yeterli elmasın yok.`);
      return;
    }

    /* Seçili karonun EKRAN noktası — taşıma modu oradan başlasın. */
    const nokta = ekranNoktasi(_secili.kx, _secili.ky);
    const kx = _secili.kx, ky = _secili.ky;
    birak();

    if (typeof kapi.mod === "function" && nokta) {
      kapi.mod(nokta.x, nokta.y);
      return;
    }

    /* Kapı yoksa eski yol: doğrudan taşı. */
    if (typeof kapi.tasi !== "function") { uyar("Taşıma şu an kullanılamıyor."); return; }
    const g = { gx: K().karodanOlcek(kx), gy: K().karodanOlcek(ky) };
    if (typeof kapi.bosMu === "function" && !kapi.bosMu(g.gx, g.gy)) {
      uyar("Burası dolu — kale ya da canavar var.");
      return;
    }
    kapi.tasi(g);
    parlat();
  }

  /* Karo merkezinin sayfa üstündeki (client) noktası. */
  function ekranNoktasi(kx, ky) {
    if (!haritaVar()) return null;
    const mapEl = harita();
    if (!mapEl) return null;
    const p = H().ekranKonumu(K().karodanOlcek(kx), K().karodanOlcek(ky));
    if (!p) return null;
    const r = mapEl.getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  }

  /* Kale yeni yerinde bir kez parlasın. */
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

  /* ── O NOKTADA DÜĞÜM VAR MI? ──
     Kaynak ve canavar noktaları artık canvas'a çiziliyor; ortada
     basılacak bir DOM elemanı YOK. Bu yüzden "elemana basılmadı →
     boşluktur" varsayımı yanlıştı: düğüme basınca hem düğüm
     penceresi açılıyor hem altındaki karo seçiliyordu.
     Vuruş sınamasını haritanın kendisi yapar. */
  function dugumeMiBasildi(clientX, clientY) {
    const wrap = sarmal();
    if (!wrap || !H() || typeof H().dugumBul !== "function") return false;
    try {
      const r = wrap.getBoundingClientRect();
      return !!H().dugumBul(clientX - r.left, clientY - r.top);
    } catch (e) { return false; }
  }

  /* ── HARİTA DOKUNUŞUNU DEVRAL ─────────────────────────────── */
  function dokunmayiDevral() {
    const eski = window.handleMapTap;
    if (typeof eski !== "function" || eski._karoSarildi) return false;

    const yeni = function (clientX, clientY, targetEl) {
      /* Kale, ordu, işaret ya da bizim çubuğumuz — karışma. */
      if (targetEl && targetEl.closest &&
          targetEl.closest(".map-node, .loot-node, .sefer-ordu, #karoCubuk")) return;

      /* Canvas'a çizilmiş kaynak/canavar noktası — karışma, seçimi bırak. */
      if (dugumeMiBasildi(clientX, clientY)) { birak(); return; }

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

  /* ── DIŞARIYA DOKUNUNCA BIRAK ──
     Çubuk eskiden en üst katmandaydı ve kale bilgi panelinin,
     mağazanın, savaş ekranının üstüne biniyordu. Artık haritanın
     içinde duruyor (paneller üstte çizilir) ve haritanın DIŞINDA bir
     yere dokunulduğu anda seçim kendiliğinden kalkıyor. */
  function disariyiIzle() {
    document.addEventListener("pointerdown", (ev) => {
      if (!_secili) return;
      const t = ev.target;
      if (!t || !t.closest) { birak(); return; }
      if (t.closest("#karoCubuk")) return;              /* kendi düğmemiz */
      if (t.closest(".map-node")) { birak(); return; }  /* kaleye basıldı  */
      if (!t.closest("#battleMapWrap")) birak();        /* harita dışı     */
    }, true);
  }

  /* Harita ekranı kapanınca seçim de kalksın. */
  function ekraniIzle() {
    setInterval(() => {
      if (!_secili) return;
      const wrap = sarmal();
      if (!wrap || wrap.style.display === "none") birak();
    }, 1000);
  }

  /* ── KAYDIRINCA SEÇİMİ BIRAK ──
     Seçim haritaya yapışık duruyor, yani harita kayarken çubuğun da
     her karede yeniden yerleşmesi gerekiyordu. Zemin canvas'ı bir
     kare geriden geldiği için çubuk ekranda titriyordu — ve zaten
     kaydırırken seçili karoyla işi olan yok.

     Artık parmak haritada gezinmeye başlar başlamaz seçim düşüyor:
     titreme kalmıyor, çubuk ekranda peşimizden sürüklenmiyor.
     Eşik 6 px — dokunuşun kendisi seçimi hemen bozmasın diye. */
  function kaydirmayiIzle() {
    const wrap = sarmal();
    if (!wrap || wrap._karoKaydirma) return false;
    wrap._karoKaydirma = true;

    let bx = 0, by = 0, basili = false;
    const ESIK = 6;

    wrap.addEventListener("pointerdown", (e) => {
      basili = true; bx = e.clientX; by = e.clientY;
    }, true);
    const bitir = () => { basili = false; };
    wrap.addEventListener("pointerup", bitir, true);
    wrap.addEventListener("pointercancel", bitir, true);

    wrap.addEventListener("pointermove", (e) => {
      if (!basili || !_secili) return;
      if (Math.abs(e.clientX - bx) > ESIK || Math.abs(e.clientY - by) > ESIK) birak();
    }, true);
    return true;
  }

  /* ── KUR ──────────────────────────────────────────────────── */
  (function kur() {
    let kalan = 60;
    const t = setInterval(() => {
      dokunmayiDevral();
      if (window.handleMapTap && window.handleMapTap._karoSarildi) {
        clearInterval(t);
        disariyiIzle();
        kaydirmayiIzle();
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
