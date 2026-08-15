/* ═══════════════════════════════════════════════════════════════
   tani.js — GEÇİCİ TANI DOSYASI  (SURUM: "tani-1")
   ---------------------------------------------------------------
   AMAÇ: Kale seferi hedefe vardığında savaş GERÇEKTEN çalışıyor mu?
   Birlikler neden ölmüyor / hastaneye düşmüyor?

   NASIL: pvp.js'e HİÇ DOKUNULMADI. sefer.js savaşı
   `window.PVP.savasiCalistir()` diye çağırıyor. Biz o kapıyı
   sarıyoruz: çağrının öncesini ve sonrasını ölçüp ekrana yazıyoruz.

   ÇIKTI: showToast DEĞİL — ekranın üstünde siyah bir kutu.
   Kutuya dokununca kapanır.

   İŞ BİTİNCE: index.html'den script satırını sil, bu dosyayı at.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const SURUM = "tani-1";
  const BIRLIKLER = ["knight", "soldier", "robot"];

  /* ── EKRAN KUTUSU ──────────────────────────────────────────── */
  let _kutu = null;
  function kutu() {
    if (_kutu && _kutu.isConnected) return _kutu;
    const d = document.createElement("div");
    d.id = "taniKutu";
    d.style.cssText =
      "position:fixed; left:8px; right:8px; top:8px; z-index:2147483647;" +
      "max-height:52vh; overflow:auto; -webkit-overflow-scrolling:touch;" +
      "background:rgba(0,10,22,.94); color:#dff3ff; border:1px solid rgba(190,240,255,.20);" +
      "border-radius:12px; padding:10px 12px; font:12px/1.45 monospace;" +
      "box-shadow:0 2px 6px rgba(0,20,45,.3); white-space:pre-wrap; word-break:break-word;";
    d.addEventListener("click", () => d.remove());
    document.body.appendChild(d);
    _kutu = d;
    return d;
  }
  function yaz(satir) {
    const d = kutu();
    const t = new Date();
    const s = ("0" + t.getHours()).slice(-2) + ":" +
              ("0" + t.getMinutes()).slice(-2) + ":" +
              ("0" + t.getSeconds()).slice(-2);
    d.textContent += (d.textContent ? "\n" : "") + s + "  " + satir;
    d.scrollTop = d.scrollHeight;
    try { console.log("[TANI] " + satir); } catch (e) {}
  }

  /* ── YARDIMCI ──────────────────────────────────────────────── */
  function sayi(v) { return (typeof v === "number" && isFinite(v)) ? v : 0; }

  /* Hem {knight:3} hem {knight:[{...},{...}]} biçimini toplar */
  function topla(m) {
    let n = 0;
    Object.keys(m || {}).forEach(k => {
      const v = m[k];
      n += Array.isArray(v) ? v.length : sayi(Number(v));
    });
    return n;
  }
  function dokum(m) {
    const p = [];
    BIRLIKLER.forEach(u => {
      const v = (m || {})[u];
      const n = Array.isArray(v) ? v.length : sayi(Number(v));
      if (n > 0) p.push(u + ":" + n);
    });
    return p.length ? p.join(" ") : "yok";
  }
  function ordu() {
    if (typeof state === "undefined" || !state || !state.troops) return "state.troops YOK";
    return dokum(state.troops);
  }
  function hastaneSayisi() {
    if (typeof state === "undefined" || !state) return "?";
    return Array.isArray(state.hospital) ? state.hospital.length : "dizi değil";
  }

  /* ── KAPIYI SAR ────────────────────────────────────────────── */
  function sar() {
    if (!window.PVP || typeof window.PVP.savasiCalistir !== "function") return false;
    if (window.PVP.savasiCalistir._taniSarildi) return true;

    const gercek = window.PVP.savasiCalistir;

    const sarmal = async function () {
      yaz("──────── KALE SAVAŞI ÇAĞRILDI ────────");

      /* 1) Hedef doğru mu? */
      const e = (typeof currentEnemy !== "undefined") ? currentEnemy : null;
      yaz("hedef        : " + (e ? (e.name || "adsız") : "YOK") +
          " | isPlayer=" + (e ? String(!!e.isPlayer) : "-"));
      if (!e || !e.isPlayer) yaz("  ⚠ KAPI 1: hedef oyuncu değil → savaş HİÇ başlamaz.");

      /* 2) Genel can */
      let can = "?";
      if (typeof state !== "undefined" && state && state.stamina) {
        can = sayi(state.stamina.current) + "/" + sayi(state.stamina.max);
        if (sayi(state.stamina.current) <= 0) {
          yaz("  ⚠ KAPI 2: GENEL CAN 0 → savaş sessizce iptal. SEBEP BU OLABİLİR.");
        }
      } else {
        yaz("  ⚠ state.stamina yok — savaş içinde hata verebilir.");
      }
      yaz("genel can    : " + can);

      /* 3) Bekleme süresi (ayar 0 ise hiç devreye girmez) */
      const bekleAyar = (window.PVP.config && window.PVP.config.attackCooldownMs) || 0;
      yaz("bekleme ayarı: " + bekleAyar + " ms" + (bekleAyar === 0 ? " (kapalı)" : ""));

      /* 4) Savaşa götürülen birlik */
      const sec = (typeof selectedTroopsForBattle !== "undefined") ? selectedTroopsForBattle : null;
      yaz("seçilen      : " + dokum(sec) + "  (toplam " + topla(sec) + ")");
      yaz("kaledeki ordu: " + ordu());
      yaz("hastane      : " + hastaneSayisi() + " kayıt");
      if (topla(sec) <= 0) yaz("  ⚠ KAPI 3: seçili birlik 0 → savaş HİÇ başlamaz.");

      /* 5) sonSonuc'u sıfırla ki sonrasında kesin ölçelim */
      window.PVP.sonSonuc = null;

      /* 6) ASIL SAVAŞ */
      let patladi = null;
      const t0 = Date.now();
      try {
        await gercek.apply(this, arguments);
      } catch (err) {
        patladi = err;
      }
      const sure = Date.now() - t0;

      /* 7) SONUÇ */
      if (patladi) {
        yaz("💥 SAVAŞ HATA VERDİ: " + (patladi && patladi.message ? patladi.message : patladi));
        yaz("   → pvp.js'teki _running kilidi TRUE kaldı.");
        yaz("   → Bundan sonraki BÜTÜN kale savaşları sessizce atlanır.");
        yaz("   → Sayfayı yenilemeden test etme.");
      }

      const ss = window.PVP.sonSonuc;
      yaz("savaş süresi : " + sure + " ms");

      if (!ss) {
        yaz("❌ SONUÇ YOK (sonSonuc = null)");
        yaz("   Savaş simülasyonu ÇALIŞMADI. Ordu kayıpsız geri dönecek.");
        if (!patladi) {
          yaz("   Yukarıdaki KAPI uyarılarına bak. Hiçbiri yoksa sebep");
          yaz("   pvp.js'teki _running kilidinin takılı kalmasıdır.");
        }
      } else {
        yaz("✅ SONUÇ VAR");
        yaz("   ölen   : " + dokum(ss.killed)  + "  (toplam " + topla(ss.killed)  + ")");
        yaz("   yaralı : " + dokum(ss.wounded) + "  (toplam " + topla(ss.wounded) + ")");
        if (topla(ss.killed) === 0 && topla(ss.wounded) === 0) {
          yaz("   ⚠ Savaş çalıştı ama KAYIP SIFIR. Sebep savaş matematiği:");
          yaz("     rakip çok zayıfsa hiç hasar alamazsın.");
        }
      }
      yaz("savaş sonrası ordu: " + ordu());
      yaz("──────────────────────────────────────");
    };

    sarmal._taniSarildi = true;
    window.PVP.savasiCalistir = sarmal;
    return true;
  }

  /* ── YARALI KAPISI DA İZLENSİN ─────────────────────────────────
     sefer.js sendWoundedToHospital'ı sarıp yaralıyı yakalıyor.
     Biz de onun ÜSTÜNE binip "çağrıldı mı" görüyoruz. Zinciri
     bozmuyoruz: gelen çağrıyı aynen alta geçiriyoruz. */
  function hastaneSar() {
    if (typeof window.sendWoundedToHospital !== "function") return false;
    if (window.sendWoundedToHospital._taniSarildi) return true;
    const alt = window.sendWoundedToHospital;
    const s = function (liste) {
      yaz("🏥 hastaneye gönderim çağrıldı: " + dokum(liste) + " (toplam " + topla(liste) + ")");
      return alt.apply(this, arguments);
    };
    s._taniSarildi = true;
    window.sendWoundedToHospital = s;
    return true;
  }

  /* ── BAŞLAT ────────────────────────────────────────────────────
     pvp.js ve sefer.js yüklenmiş olmalı. Hazır değillerse
     kısa aralıklarla bekleriz (en fazla 15 sn). */
  let deneme = 0;
  const iv = setInterval(function () {
    deneme++;
    const a = sar();
    const b = hastaneSar();
    if ((a && b) || deneme > 150) {
      clearInterval(iv);
      yaz("tani.js hazır (" + SURUM + ")  ·  savaş kapısı=" + a + "  hastane kapısı=" + b);
      yaz("Şimdi bir kaleye ORDU GÖNDER. Ordu varınca buraya yazacak.");
      yaz("(Kutuya dokununca kapanır.)");
    }
  }, 100);

  window.TANI = { yaz: yaz, SURUM: SURUM };
})();
