/* ═══════════════════════════════════════════════════════════════
   kale2x2.js — KALE ARTIK 2×2 KARO
   ---------------------------------------------------------------
   Kayıttaki kx/ky kalenin SOL ÜST karosudur (koordinat.js'e bak).
   Kale (kx,ky) · (kx+1,ky) · (kx,ky+1) · (kx+1,ky+1) karolarını
   kaplar, görsel merkezi kx+0.5 / ky+0.5'tir.

   NEDEN AYRI DOSYA: index.html'in 13 satır içi script'ine
   dokunmadan çalışabilen her şey burada. Üst düzey fonksiyonlar
   window üzerinde durduğu için dışarıdan DEVRALINABİLİR.

   Burada olmayan (index.html'de elle değişen) tek yer: kale taşıma
   bloğu — cellFree / kareCerceveGoster / updateGhost bir fonksiyonun
   İÇİNDE kapalı durduğu için dışarıdan görünmüyorlar.

   YÜKLEME SIRASI: karo.js'ten SONRA. Devralınan fonksiyonlar
   index.html içinde tanımlı, yani biz çalışırken hazır olmalılar.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const SURUM = "kale2x2-1";

  function K() { return window.KOORD; }
  function hazir() { return !!(K() && typeof K().kaleSolUst === "function"); }

  /* ── GÖRÜNÜM ──────────────────────────────────────────────────
     Kale ALAN olarak dört karo, GÖRSEL olarak tek karo boyunda
     kalıyor — büyütülünce haritayı eziyordu. Yani tek değişiklik
     kaymadır: resim dört karonun tam ortasına oturur.

     Düğüm hâlâ SOL ÜST karonun üstüne yerleşiyor (data-cx/cy'ye
     dokunmadık — koordinat kutusu ve diğer her şey doğru kalsın
     diye). Görsel merkez ise yarım karo sağ ve yarım karo aşağıda.
     İzometride bu ikisi TOPLANIR ve yatay bileşenleri birbirini
     götürür:
          ekran x = (kx − ky) × karo/2  → +0.5, +0.5 → DEĞİŞMEZ
          ekran y = (kx + ky) × boy/2   → +0.5, +0.5 → +yarım boy
     Yani tek yapılacak şey DÜZ AŞAĞI kaydırmak. Karo yüksekliği 32
     olduğuna göre yarısı 16px; düğümün kendi ölçeği 0.64 olduğu için
     içeride 16 ÷ 0.64 = 25px yazılır ve zoom ile kendiliğinden
     ölçeklenir.

     DİKKAT: harita.js her karede düğümün transform'unu baştan
     yazıyor. Bu yüzden kaydırma düğümün KENDİSİNE değil,
     İÇİNDEKİ iki parçaya veriliyor. */
  (function stil() {
    if (document.getElementById("kale2x2Stil")) return;
    const st = document.createElement("style");
    st.id = "kale2x2Stil";
    st.textContent = `
.map-node.castle-node .node-ring{  transform:translateY(25px); }
.map-node.castle-node .node-label{ transform:translateY(25px); }
`;
    document.head.appendChild(st);
  })();

  /* ── ENGEL LİSTESİ ────────────────────────────────────────────
     Eski liste noktaları 0..30 ölçeğinde ve TÜRSÜZ topluyordu;
     hepsine tek bir mesafe eşiği uygulanıyordu. 2×2'de bu yanlış
     cevap verir: kale bir ALAN kaplar, tek nokta değildir.

     Artık liste KARO cinsinden ve türlü:
       kale:true  → 2×2, alan-alan çakışması sınanır
       kale:false → tek karo (canavar, kaynak), kale onu örtüyor mu
     _kaleEngelleri ile _kareBosMu her zaman BİRLİKTE devralınır;
     biri eski biçimde kalırsa liste sessizce yanlış okunur. */
  function engelleri() {
    const out = [];
    const benim = (typeof currentUsername === "string" && currentUsername)
      ? currentUsername.toLowerCase() : null;

    /* Canavarlar ve kaynak arazileri — tek karo. */
    try {
      if (window.DUGUM && DUGUM.haritaDugumleri) {
        DUGUM.haritaDugumleri().forEach(d => {
          if (d && typeof d.kx === "number") out.push({ kx: d.kx, ky: d.ky, kale: false });
        });
      }
    } catch (e) {}
    try {
      if (typeof enemies !== "undefined" && Array.isArray(enemies)) {
        enemies.forEach(e => {
          if (e && typeof e.kx === "number") out.push({ kx: e.kx, ky: e.ky, kale: false });
        });
      }
    } catch (e) {}

    /* Başka oyuncuların kaleleri — 2×2. Kendi kalemiz engel değil. */
    try {
      if (typeof otherCastles !== "undefined" && Array.isArray(otherCastles)) {
        otherCastles.forEach(c => {
          if (!c || !c.castle) return;
          if (benim && String(c.name || "").toLowerCase() === benim) return;
          const k = K().kaleKaro(c.castle);
          if (k) out.push({ kx: k.kx, ky: k.ky, kale: true });
        });
      }
    } catch (e) {}

    return out;
  }

  /* Sol üst karosu (kx,ky) olan bir kale buraya sığar mı? */
  function bosMu(kx, ky, engel) {
    if (!hazir()) return true;
    const s = K().kaleSolUst(kx, ky);
    const liste = engel || engelleri();
    for (let i = 0; i < liste.length; i++) {
      const t = liste[i];
      if (typeof t.kx !== "number") continue;
      if (t.kale) {
        if (K().kaleCakisirMi(s.kx, s.ky, t.kx, t.ky, 0)) return false;
      } else {
        if (K().kaleKaplarMi(s.kx, s.ky, t.kx, t.ky)) return false;
      }
    }
    return true;
  }

  /* Hedef doluysa çevresinde genişleyen halkalarda boş yer ara.
     Eski sürümün son karoya kadar izin veren sınırı 2×2'de kaleyi
     ızgaranın dışına taşırıyordu; sınır kaleSolUst'a bırakıldı. */
  function enYakinBos(kx, ky, engel) {
    const liste = engel || engelleri();
    if (bosMu(kx, ky, liste)) {
      const s = K().kaleSolUst(kx, ky);
      return { kx: s.kx, ky: s.ky, kaydi: (s.kx !== kx || s.ky !== ky) };
    }
    const son = K().karoSayisi() - K().KALE_BOY;
    for (let r = 1; r <= 12; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;   /* yalnız halkanın kenarı */
          const nx = kx + dx, ny = ky + dy;
          if (nx < 0 || ny < 0 || nx > son || ny > son) continue;
          if (bosMu(nx, ny, liste)) return { kx: nx, ky: ny, kaydi: true };
        }
      }
    }
    return { kx: kx, ky: ky, kaydi: false };   /* bulunamadı — yerinde bırak */
  }

  /* ── FÜZE HEDEFİ ──────────────────────────────────────────────
     pvp.js füzeye kalenin SOL ÜST karosunu veriyor; füze oraya
     vurunca kalenin sol üst köşesinde patlıyor, ortasında değil.
     missile.js'e dokunmadan, dışa açtığı kapıda hedefi kalenin
     merkezine kaydırıyoruz. Kayıt biçimi değişmiyor: gönderilen
     sayı yine 0..30 ölçeğinde bir konum. */
  function merkezeKaydir(tx, ty) {
    if (!hazir()) return { tx: tx, ty: ty };
    try {
      const k = K().kaleKaro({ gx: tx, gy: ty });
      if (!k) return { tx: tx, ty: ty };
      const m = K().kaleMerkez(k.kx, k.ky);
      return { tx: K().karodanOlcek(m.kx), ty: K().karodanOlcek(m.ky) };
    } catch (e) { return { tx: tx, ty: ty }; }
  }

  function fuzeyiDevral() {
    const api = window.MISSILE_API;
    if (!api || typeof api.open !== "function" || api._2x2) return false;

    ["open", "fire"].forEach(ad => {
      const eski = api[ad];
      if (typeof eski !== "function") return;
      api[ad] = function (hedefAd, tx, ty) {
        const m = merkezeKaydir(tx, ty);
        return eski.call(api, hedefAd, m.tx, m.ty);
      };
    });
    api._2x2 = true;
    return true;
  }

  /* ── DEVRALMA ─────────────────────────────────────────────────
     index.html'deki üç fonksiyon window üzerinde duruyor; üzerlerine
     yazmak yeterli. Çağıran yerler (kaleyiKaroyaGocur) isimle
     çağırdığı için bizimkini bulur. */
  function devral() {
    if (!hazir()) return false;
    if (typeof window._kaleEngelleri !== "function") return false;
    fuzeyiDevral();
    if (window._kaleEngelleri._2x2) return true;

    const y1 = function () { return engelleri(); };
    const y2 = function (kx, ky, engel) { return bosMu(kx, ky, engel); };
    const y3 = function (kx, ky, engel) { return enYakinBos(kx, ky, engel); };
    y1._2x2 = y2._2x2 = y3._2x2 = true;

    window._kaleEngelleri  = y1;
    window._kareBosMu      = y2;
    window._enYakinBosKare = y3;
    return fuzeyiDevral() || true;
  }

  (function kur() {
    let kalan = 60;
    const t = setInterval(() => {
      if (devral() || --kalan <= 0) {
        clearInterval(t);
        if (kalan <= 0) console.warn("[kale2x2] bağlanamadı — eski tek karo kuralı sürüyor");
      }
    }, 250);

    /* missile.js kendi kapısını geç açabiliyor; onu ayrı izliyoruz.
       Aynı işi iki kez yapmaz: api._2x2 damgası bunu engelliyor. */
    let fk = 60;
    const tf = setInterval(() => {
      if (fuzeyiDevral() || --fk <= 0) clearInterval(tf);
    }, 250);
  })();

  /* Teşhis — ekrana yazmaz, sorulunca cevap verir. */
  window.KALE2X2 = {
    SURUM: SURUM,
    bosMu: bosMu,
    engelleri: engelleri,
    tani: function () {
      const r = {
        surum: SURUM,
        kaleBoy: hazir() ? K().KALE_BOY : "koordinat.js ESKİ",
        devralindi: !!(window._kaleEngelleri && window._kaleEngelleri._2x2),
        engelSayisi: engelleri().length,
        kalem: null
      };
      try {
        const k = K().kaleKaro(state && state.castle);
        if (k) r.kalem = { solUst: k, karolar: K().kaleKarolari(k.kx, k.ky), merkez: K().kaleMerkez(k.kx, k.ky) };
      } catch (e) {}
      console.log("[kale2x2] TANI", r);
      return r;
    }
  };
})();
