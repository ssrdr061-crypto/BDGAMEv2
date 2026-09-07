/* ============================================================
   sandik.js — ŞANS SANDIĞI 3B SAHNESİ  (three.js r128)
   ------------------------------------------------------------
   #chestEl içindeki gorsel4.webp'nin yerini alır. Sandık burada
   ÇİZİLİR: gövde + menteşeli kapak + kilit, gerçek ışıkla.

   NEDEN CSS DEĞİL:
     · Hacim CSS gölgesiyle taklit edilmiyor, gerçek geometri +
       ışık var (OKU-BENI "Görünüm").
     · Animasyon rAF ile; `prefers-reduced-motion` WebGL'i
       öldürmez, eski `chestRumble` keyframe'ini öldürüyordu.

   DÖNGÜ:
     Tek rAF döngüsü. Yalnız #panel-chest açıkken döner,
     panel kapanınca durur. Sahne bellekte kalır (telefonda
     WebGL bağlamını sürekli açıp kapamak daha pahalı).

   API:
     window.SANDIK3D.ac()       → titre → kapak kalk → ışık taş
     window.SANDIK3D.kapali()   → animasyon sürüyor mu (bool ters)
     window.SANDIK3D.temizle()  → sahneyi tamamen bırak

   İKİNCİ PARÇA (henüz yok): elmas saçılımı + sayaca uçuş.
   `ac()` içindeki AC_BITTI çağrısı oraya bağlanacak.
   ============================================================ */
(function () {
  "use strict";

  /* ── ölçüler / süreler ─────────────────────────────────── */
  var GOVDE_G = 2.20, GOVDE_Y = 1.00, GOVDE_D = 1.35;
  var KAPAK_R = 0.66;
  var KAPAK_ACIK = -2.05;              /* radyan, menteşe dönüşü */

  var MS_TITRE = 340;                  /* sandık titrer          */
  var MS_KAPAK = 620;                  /* kapak kalkar           */
  var MS_ACIK  = 1100;                 /* açık bekler            */
  var MS_KAPAN = 460;                  /* kapak iner             */

  /* ── sahne durumu ──────────────────────────────────────── */
  var ren = null, sah = null, kam = null;
  var kok = null, kapakPivot = null, icIsik = null, parla = null;
  var kutu = null, gozcu = null, olcuGozcu = null;
  var rafId = 0, donuyor = false;
  var evre = "kapali";                 /* kapali|titre|acilis|acik|kapanis */
  var evreT0 = 0, saat0 = 0;
  var sonG = 0, sonY = 0;
  var atiklar = [];                    /* dispose edilecekler    */

  function kutuEl() { return document.getElementById("chestEl"); }

  /* ── malzemeler ────────────────────────────────────────── */
  function mal(renk, metal, puruz, isik) {
    var m = new THREE.MeshStandardMaterial({
      color: renk, metalness: metal, roughness: puruz,
      emissive: isik || 0x000000, emissiveIntensity: isik ? 1 : 0
    });
    atiklar.push(m);
    return m;
  }
  function geo(g) { atiklar.push(g); return g; }

  /* ── parlama dokusu (katkılı sprite) ───────────────────── */
  function parlaDokusu() {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var x = c.getContext("2d");
    var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0.00, "rgba(255,252,225,1)");
    g.addColorStop(0.28, "rgba(255,232,150,.75)");
    g.addColorStop(0.60, "rgba(120,225,255,.28)");
    g.addColorStop(1.00, "rgba(120,225,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c);
    atiklar.push(t);
    return t;
  }

  /* ── sandığı kur ───────────────────────────────────────── */
  function sandikKur() {
    kok = new THREE.Group();

    var altin  = mal(0xE9B23A, 0.62, 0.34);
    var altinP = mal(0xFFD971, 0.88, 0.16);
    var koyu   = mal(0x8A5A18, 0.45, 0.55);
    var tas    = mal(0x36D6FF, 0.30, 0.10, 0x1C86AA);

    /* gövde */
    var govde = new THREE.Mesh(
      geo(new THREE.BoxGeometry(GOVDE_G, GOVDE_Y, GOVDE_D)), altin);
    govde.position.y = GOVDE_Y / 2;
    kok.add(govde);

    /* gövde kuşakları — dikey üç şerit */
    [-0.72, 0, 0.72].forEach(function (x) {
      var s = new THREE.Mesh(
        geo(new THREE.BoxGeometry(0.17, GOVDE_Y + 0.02, GOVDE_D + 0.03)), altinP);
      s.position.set(x, GOVDE_Y / 2, 0);
      kok.add(s);
    });

    /* üst kenar pervazı */
    var pervaz = new THREE.Mesh(
      geo(new THREE.BoxGeometry(GOVDE_G + 0.06, 0.11, GOVDE_D + 0.06)), altinP);
    pervaz.position.y = GOVDE_Y - 0.02;
    kok.add(pervaz);

    /* iç karanlık — kapak açılınca içerisi boş görünsün */
    var ic = new THREE.Mesh(
      geo(new THREE.BoxGeometry(GOVDE_G - 0.16, GOVDE_Y - 0.12, GOVDE_D - 0.16)),
      mal(0x1A1208, 0.05, 0.95));
    ic.position.y = GOVDE_Y / 2 + 0.08;
    kok.add(ic);

    /* ── kapak: fıçı biçimi, menteşe ARKA ALT kenarda ────── */
    kapakPivot = new THREE.Group();
    kapakPivot.position.set(0, GOVDE_Y + 0.03, -KAPAK_R);
    kok.add(kapakPivot);

    var kapakG = new THREE.CylinderGeometry(
      KAPAK_R, KAPAK_R, GOVDE_G, 24, 1, false, 0, Math.PI);
    geo(kapakG);
    var kapak = new THREE.Mesh(kapakG, altin);
    kapak.rotation.z = Math.PI / 2;     /* eksen X boyunca yatsın */
    kapak.position.set(0, 0, KAPAK_R);
    kapakPivot.add(kapak);

    /* kapak kuşakları */
    [-0.72, 0, 0.72].forEach(function (x) {
      var kg = new THREE.CylinderGeometry(
        KAPAK_R + 0.015, KAPAK_R + 0.015, 0.15, 24, 1, true, 0, Math.PI);
      geo(kg);
      var k = new THREE.Mesh(kg, altinP);
      k.rotation.z = Math.PI / 2;
      k.position.set(x, 0, KAPAK_R);
      kapakPivot.add(k);
    });

    /* kilit plakası + mavi taş — gövdenin ÖN yüzünde */
    var plaka = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.34, 0.36, 0.08)), altinP);
    plaka.position.set(0, GOVDE_Y - 0.30, GOVDE_D / 2 + 0.01);
    kok.add(plaka);

    var delik = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.09, 0.13, 0.06)), koyu);
    delik.position.set(0, GOVDE_Y - 0.34, GOVDE_D / 2 + 0.05);
    kok.add(delik);

    var gem = new THREE.Mesh(geo(new THREE.OctahedronGeometry(0.11)), tas);
    gem.position.set(0, GOVDE_Y - 0.13, GOVDE_D / 2 + 0.05);
    kok.add(gem);

    /* iç ışık — açılınca taşan sıcak parıltı */
    icIsik = new THREE.PointLight(0xFFE9A8, 0, 4.2, 2);
    icIsik.position.set(0, GOVDE_Y - 0.15, 0);
    kok.add(icIsik);

    /* kapaktan taşan parlama */
    var sm = new THREE.SpriteMaterial({
      map: parlaDokusu(), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    atiklar.push(sm);
    parla = new THREE.Sprite(sm);
    parla.position.set(0, GOVDE_Y + 0.15, 0);
    parla.scale.set(0.1, 0.1, 1);
    kok.add(parla);

    kok.position.y = -0.55;             /* çerçeveye ortala */
    sah.add(kok);
  }

  /* ── sahneyi bir kez kur ───────────────────────────────── */
  function kur() {
    if (ren || typeof THREE === "undefined") return !!ren;
    kutu = kutuEl();
    if (!kutu) return false;

    var r = kutu.getBoundingClientRect();   /* fixed → offsetParent null */
    if (r.width < 4 || r.height < 4) return false;   /* gizli kapsayıcı 0 */

    sah = new THREE.Scene();
    kam = new THREE.PerspectiveCamera(34, r.width / r.height, 0.1, 40);
    kam.position.set(0, 0.95, 5.15);
    kam.lookAt(0, 0.05, 0);

    ren = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    ren.setSize(r.width, r.height, false);
    ren.domElement.style.cssText =
      "width:100%;height:100%;display:block;background:none;";
    ren.domElement.className = "chest-tuval";
    kutu.appendChild(ren.domElement);
    sonG = r.width; sonY = r.height;

    sah.add(new THREE.HemisphereLight(0xCFE9FF, 0x1B2A4A, 0.85));
    var d = new THREE.DirectionalLight(0xFFF3D6, 1.15);
    d.position.set(2.4, 3.4, 2.6);
    sah.add(d);
    var y = new THREE.DirectionalLight(0x8FD8FF, 0.42);
    y.position.set(-2.6, 1.2, -1.8);
    sah.add(y);

    sandikKur();
    saat0 = performance.now();
    return true;
  }

  /* ── ölçü değişimi ─────────────────────────────────────── */
  function olcuTazele() {
    if (!ren || !kutu) return;
    var r = kutu.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    if (Math.abs(r.width - sonG) < 1 && Math.abs(r.height - sonY) < 1) return;
    sonG = r.width; sonY = r.height;
    kam.aspect = r.width / r.height;
    kam.updateProjectionMatrix();
    ren.setSize(r.width, r.height, false);
  }

  /* ── yumuşama eğrileri ─────────────────────────────────── */
  function cikisGeri(t) {           /* hafif taşan yükseliş */
    var c = 1.42;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }
  function girisCikis(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* ── tek kare ──────────────────────────────────────────── */
  function kare(zaman) {
    rafId = 0;
    if (!ren) return;
    olcuTazele();

    var t = (zaman - saat0) / 1000;

    /* boşta: ağırlıklı süzülme */
    var bosY = Math.sin(t * 1.5) * 0.045;
    var bosD = Math.sin(t * 0.9) * 0.10;
    kok.position.y = -0.55 + bosY;
    kok.rotation.y = bosD;
    kok.rotation.z = 0;
    kok.position.x = 0;

    var g = zaman - evreT0;

    if (evre === "titre") {
      /* sönümlenen titreme — ağırlık hissi için z ekseninde de */
      var s = 1 - g / MS_TITRE;
      if (s < 0) s = 0;
      kok.position.x = Math.sin(g * 0.075) * 0.085 * s;
      kok.rotation.z = Math.sin(g * 0.062) * 0.075 * s;
      kok.position.y += Math.abs(Math.sin(g * 0.048)) * 0.05 * s;
      if (g >= MS_TITRE) { evre = "acilis"; evreT0 = zaman; }

    } else if (evre === "acilis") {
      var o = g / MS_KAPAK; if (o > 1) o = 1;
      kapakPivot.rotation.x = KAPAK_ACIK * cikisGeri(o);
      icIsik.intensity = 3.6 * o;
      parla.material.opacity = 0.95 * o;
      var b = 0.35 + 2.35 * o;
      parla.scale.set(b, b, 1);
      if (o >= 1) { evre = "acik"; evreT0 = zaman; }

    } else if (evre === "acik") {
      var n = Math.sin(zaman * 0.012) * 0.16;
      icIsik.intensity = 3.2 + n;
      parla.material.opacity = 0.82 + n * 0.25;
      if (g >= MS_ACIK) { evre = "kapanis"; evreT0 = zaman; }

    } else if (evre === "kapanis") {
      var k = g / MS_KAPAN; if (k > 1) k = 1;
      kapakPivot.rotation.x = KAPAK_ACIK * (1 - girisCikis(k));
      icIsik.intensity = 3.2 * (1 - k);
      parla.material.opacity = 0.82 * (1 - k);
      parla.scale.set(2.7 * (1 - k) + 0.1, 2.7 * (1 - k) + 0.1, 1);
      if (k >= 1) {
        evre = "kapali";
        kapakPivot.rotation.x = 0;
        icIsik.intensity = 0;
        parla.material.opacity = 0;
      }
    }

    ren.render(sah, kam);
    if (donuyor) rafId = requestAnimationFrame(kare);
  }

  function basla() {
    if (donuyor) return;
    if (!kur()) { requestAnimationFrame(function () { basla(); }); return; }
    donuyor = true;
    if (!rafId) rafId = requestAnimationFrame(kare);
  }
  function durdur() {
    donuyor = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  /* ── panel açık mı: sınıf değişimini izle ──────────────── */
  function acikMi(p) { return p && p.classList.contains("active"); }

  function gozcuKur() {
    var p = document.getElementById("panel-chest");
    if (!p || gozcu) return;
    /* Geri çağrının İÇİNDE sınıf değiştirmiyoruz — sonsuz döngü yok. */
    gozcu = new MutationObserver(function () {
      if (acikMi(p)) basla(); else durdur();
    });
    gozcu.observe(p, { attributes: true, attributeFilter: ["class", "style"] });
    if (acikMi(p)) basla();

    if (window.ResizeObserver && kutuEl()) {
      olcuGozcu = new ResizeObserver(function () { olcuTazele(); });
      olcuGozcu.observe(kutuEl());
    }
  }

  /* ── dışa açılan yüz ───────────────────────────────────── */
  window.SANDIK3D = {
    /* Açılış dizisi. Zaten oynuyorsa yok sayılır. */
    ac: function () {
      if (!ren && !kur()) return false;
      if (evre !== "kapali") return false;
      basla();
      evre = "titre";
      evreT0 = performance.now();
      return true;
    },
    kapali: function () { return evre === "kapali"; },
    hazirMi: function () { return !!ren; },
    durdur: durdur,
    temizle: function () {
      durdur();
      if (gozcu) { gozcu.disconnect(); gozcu = null; }
      if (olcuGozcu) { olcuGozcu.disconnect(); olcuGozcu = null; }
      atiklar.forEach(function (a) { if (a && a.dispose) a.dispose(); });
      atiklar = [];
      if (ren) {
        if (ren.domElement && ren.domElement.parentNode)
          ren.domElement.parentNode.removeChild(ren.domElement);
        ren.dispose();
      }
      ren = sah = kam = kok = kapakPivot = icIsik = parla = null;
      evre = "kapali";
    }
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", gozcuKur);
  else gozcuKur();
})();
