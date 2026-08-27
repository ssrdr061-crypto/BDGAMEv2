/* ═══════════════════════════════════════════════════════════════
   uretim.js — KALENİN OTOMATİK KAYNAK ÜRETİMİ
   ---------------------------------------------------------------
   Oyuncu oyunda olmasa bile kaynak birikir. Sunucu tarafı yok;
   biriken miktar GİRİŞTE, geçen süreden hesaplanır.

   NASIL ÇALIŞIR
     state.uretimAt = üretimin en son işlendiği an (ms).
     Her turda "şimdi − uretimAt" kadar süre için kaynak eklenir ve
     damga ileri alınır. Oyuncu üç gün girmezse üç günlük üretimi
     tek seferde alır.

   ÜÇ İNCE NOKTA
     1) state.uretimAt hesap kaydına da yazılır (index.html'de
        compactStateForExport → uat). Yazılmasa her girişte "şimdi"
        olur ve çevrimdışı üretim hiç verilmezdi.
     2) Dakikada 500 et, saniyede 8,33 eder — tam sayı değil.
        Küsurat state.kaynaklar'a yazılmaz, bellekte KALAN olarak
        taşınır; yoksa sayaçta ondalık görünür.
     3) Saat geriye alınırsa (telefon saati, farklı cihaz) geçen
        süre eksi çıkar. O durumda üretim yapılmaz, damga
        "şimdi"ye çekilir — eksi kaynak yazılmaz.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const SURUM = "uretim-3";

  /* ── AYAR: DAKİKADA ÜRETİM ────────────────────────────────────
     Dengeyi buradan değiştir; başka hiçbir yerde bu sayılar yok. */
  /* Taban uretim (dk). 26'daki degerler %60 kisildi:
     odun 450>180 · et 500>200 · demir 400>160 · su 250>100 · enerji 150>60.
     Oranlar korundu, yalniz olcek dustu. insaat.js carpani bunun
     UZERINE biner, yani her seviyede ayni oranda dusuk. */
  const HIZ = {
    odun:   180,
    et:     200,
    demir:  160,
    su:     100,
    enerji: 60,
  };

  /* ── BİNA SEVİYESİ ÜRETİMİ ÇARPAR ──
     insaat.js yüklüyse hesabı o verir (Sv1 = 1.00, her seviye ×1.45).
     Yüklü değilse çarpan 1'dir — üretim eskisi gibi çalışır,
     dosya eksik diye kaynak durmaz. */
  function hiz(k) {
    const taban = HIZ[k] || 0;
    try {
      if (window.INSAAT && typeof window.INSAAT.uretimCarpani === "function") {
        const c = window.INSAAT.uretimCarpani(k);
        if (typeof c === "number" && isFinite(c) && c > 0) return taban * c;
      }
    } catch (e) {}
    return taban;
  }

  const IKON = { odun: "🪵", et: "🍖", demir: "⛓️", su: "💧", enerji: "⚡" };
  const AD   = { odun: "Odun", et: "Et", demir: "Demir", su: "Su", enerji: "Enerji" };

  const TUR_MS      = 10 * 1000;        /* ne sıklıkla işlensin */
  const KAYIT_MS    = 60 * 1000;        /* ne sıklıkla kaydedilsin */
  const BILDIR_MS   = 60 * 1000;        /* bu süreden uzun yokluk bildirilir */

  /* Küsurat — kayda girmez, oturum boyunca bellekte durur. */
  const kalan = { odun: 0, et: 0, demir: 0, su: 0, enerji: 0 };

  let _sonKayit = 0;
  let _ilkTurYapildi = false;

  function durumHazir() {
    return (typeof state !== "undefined" && state && typeof state === "object" &&
            typeof currentUsername === "string" && currentUsername);
  }

  function bicim(n) {
    return (typeof window.fmt === "function") ? window.fmt(n) : String(n);
  }

  /* Bir turluk üretim. Dönen değer: her kaynaktan kaç TAM birim
     eklendiği (bildirim için). */
  function isle(simdi) {
    if (!state.kaynaklar || typeof state.kaynaklar !== "object") {
      state.kaynaklar = { odun: 0, et: 0, demir: 0, su: 0, enerji: 0 };
    }

    /* İlk kez: geçmişe dönük üretim YOK, damga şimdiden başlar. */
    if (typeof state.uretimAt !== "number" || !state.uretimAt) {
      state.uretimAt = simdi;
      return null;
    }

    const gecen = simdi - state.uretimAt;
    if (gecen <= 0) { state.uretimAt = simdi; return null; }   /* saat geri alınmış */

    const dakika = gecen / 60000;
    const eklenen = {};
    let toplam = 0;

    Object.keys(HIZ).forEach(k => {
      const ham = hiz(k) * dakika + kalan[k];
      const tam = Math.floor(ham);
      kalan[k] = ham - tam;
      if (tam > 0) {
        const eski = state.kaynaklar[k];
        state.kaynaklar[k] = (typeof eski === "number" && isFinite(eski) ? eski : 0) + tam;
        eklenen[k] = tam;
        toplam += tam;
      }
    });

    state.uretimAt = simdi;
    return toplam > 0 ? { eklenen: eklenen, gecen: gecen } : null;
  }

  function tazele() {
    try { if (typeof renderKaynaklar === "function") renderKaynaklar(); } catch (e) {}
  }
  function kaydet() {
    try { if (typeof persistCurrentState === "function") persistCurrentState(); } catch (e) {}
  }

  /* Yokluğunda birikeni bir kez bildir. */
  function yoklukBildir(sonuc) {
    if (!sonuc || sonuc.gecen < BILDIR_MS) return;
    if (typeof window.showToast !== "function") return;

    const parcalar = Object.keys(sonuc.eklenen)
      .map(k => IKON[k] + " " + bicim(sonuc.eklenen[k]) + " " + AD[k]);
    if (!parcalar.length) return;

    const dk = Math.floor(sonuc.gecen / 60000);
    const sure = dk >= 60
      ? Math.floor(dk / 60) + " saat " + (dk % 60) + " dk"
      : dk + " dakika";

    window.showToast("🏭 " + sure + " boyunca üretildi: " + parcalar.join(" · "), 6500);
  }

  function tur() {
    if (!durumHazir()) return;
    const simdi = Date.now();
    const sonuc = isle(simdi);

    if (sonuc) {
      tazele();
      if (!_ilkTurYapildi) yoklukBildir(sonuc);
    }
    _ilkTurYapildi = true;

    /* Kayıt seyrek: her turda yazmak buluta gereksiz yük bindirir. */
    if (simdi - _sonKayit >= KAYIT_MS) {
      _sonKayit = simdi;
      kaydet();
    }
  }

  /* Sekme arkaplandayken tarayıcı zamanlayıcıyı yavaşlatır; geri
     dönüldüğünde birikeni hemen işle. */
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tur();
  });

  /* Sayfa kapanırken son durumu yaz — yoksa son dakikalar kaybolur. */
  window.addEventListener("pagehide", () => {
    if (!durumHazir()) return;
    isle(Date.now());
    kaydet();
  });

  setInterval(tur, TUR_MS);
  setTimeout(tur, 1500);   /* giriş tamamlanır tamamlanmaz ilk tur */

  /* Teşhis — konsola: URETIM.tani() */
  window.URETIM = {
    SURUM: SURUM,
    HIZ: HIZ,
    tur: tur,
    tani: function () {
      const r = { surum: SURUM, hiz: HIZ,
                  anlikHiz: Object.keys(HIZ).reduce((o,k)=>(o[k]=Math.round(hiz(k)),o),{}), hazir: durumHazir(), uretimAt: null,
                  bekleyenDakika: null, kaynaklar: null };
      try {
        r.uretimAt = state.uretimAt || 0;
        r.bekleyenDakika = r.uretimAt ? Math.round((Date.now() - r.uretimAt) / 60000) : null;
        r.kaynaklar = state.kaynaklar;
      } catch (e) {}
      console.log("[uretim] TANI", r);
      return r;
    }
  };
})();
