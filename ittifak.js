/* ittifak.js — İTTİFAK SİSTEMİ (1. AŞAMA)
   ═══════════════════════════════════════════════════════════════
   NE VAR
   Alt menünün 5. düğmesi (eski posta yeri) #panel-ittifak açar.
   Posta artık ekranın sağ alt köşesindeki yüzen düğmede (posta.js).

   ÜYE DEĞİLSEN — üç sekme:
     İttifak Kur      → ad + etiket + manifesto + katılım biçimi,
                        bedel 400 💎
     İttifaka Katıl   → arama + liste; "Anında Katıl" ittifaklarda
                        Katıl, ötekilerde Başvur
     Davetler/Talepler→ gönderdiğin başvurular (geri çekilebilir)

   ÜYEYSEN — üç görünüm (referans oyun düzeni):
     ana     → künye (lider, güç, sıra, üye, dil) + seviye çubuğu
               + duyuru + 2x4 düğme ızgarası + alt bar
     uyeler  → başvurular, üye listesi, terfi/indirme, atma
     ayarlar → künye özeti, Ayrıl / Dağıt

   IZGARADAKİ 8 DÜĞMENİN ARKASINDA SİSTEM YOK — "Yakında" der.
   (Savaş, Sandıklar, Bölge, Çarpışma, Mağaza, Teknoloji, Yardım,
   Zafer). Yerleri şimdiden ayrıldı ki sistemler geldikçe ekran
   yeniden kurulmasın.

   RÜTBELER: R5 Lider · R4 Yönetici · R3 Kıdemli · R2 Üye · R1 Yeni
     R5: her şey (dağıt, rütbe ver, at, başvuru)
     R4: başvuru onay-ret, kendinden DÜŞÜK rütbeyi atma
     R3-R1: yalnız ayrılır
   Rütbeyi yalnız R5 değiştirir ve kimseye R5 verilemez (tek lider).
   Eski "kurucu/subay/uye" kayıtları rutbeNorm() ile okunur.

   VERİ — TEK KAYNAK BULUT
   Firebase `ittifaklar/{id}` (id = etiketin küçük harfi, bu yüzden
   etiket benzersizdir):
     { ad, adKucuk, etiket, manifesto, katilim:"aninda"|"basvuru",
       kurucu, kurulus, uyeler:{ oyuncuAnahtari:{ad,rutbe,at} },
       basvurular:{ oyuncuAnahtari:{ad,at} } }
   Oyuncu tarafında yalnız KISAYOL durur: state.ittifak =
   { id, ad, etiket, rutbe }. Çelişki olursa bulut kazanır —
   panel her açılışta buluttan tazelenir ve kısayol düzeltilir.

   DİKKAT — FIREBASE KURALI  (kurulum: ITTIFAK-KURULUM.md)
   Firebase Console → Realtime Database → Rules içine `ittifaklar`
   düğümü EKLENMEDEN hiçbir şey çalışmaz: Realtime Database, hiçbir
   kuralın kapsamadığı düğüme yazmayı varsayılan olarak reddeder.
   Belirtisi "İttifak Kur"a basınca PERMISSION_DENIED'dır.
   Yapıştırılacak kuralların tamamı: `firebase-kurallari.json`.

   Ayrıca oyuncu tarafına yeni bir alan yazılıyor: `state.ittifak`.
   Bu yüzden `accounts` kuralına "$other": validate false EKLENMEMELİ —
   eklenirse bu alan TÜM hesap kaydını reddettirir ve belirtisi
   "oyun çalışıyor ama ilerleme buluta gitmiyor" olur. Mevcut
   kurallarda böyle bir kısıt YOK, bu haliyle sorunsuz çalışır.

   DİKKAT — .set() TUZAĞI
   Hiçbir yerde ittifak düğümünün tamamı .set() ile yazılmaz;
   üye ekleme/çıkarma tek tek `.child(...).set()` / `.remove()`
   ile yapılır, yoksa yazmadığın alanlar silinir.

   DİKKAT — `state` const'tur, `window.state` boştur; çıplak okunur.

   HAREKET: rAF + Web Animations. CSS keyframe/transition yok.

   2. AŞAMADA GELECEK (burada YOK)
     · sohbetin İttifak sekmesi, postanın İttifak sekmesi
     · haritada isim etiketinin yanında [ETİKET]
     · ittifak bonusları, ittifak bölgesi, davet gönderme
   ═══════════════════════════════════════════════════════════════ */
(function ittifakSistemi() {
  "use strict";

  var SURUM = "ittifak-1";

  /* ── AYARLAR ──────────────────────────────────────────────── */
  var KURMA_BEDELI = 400;      /* 💎 */
  var UYE_SINIRI   = 50;
  var AD_MIN = 3, AD_MAX = 16;
  var ETIKET_MIN = 2, ETIKET_MAX = 4;
  var MANIFESTO_MAX = 120;

  /* ── RÜTBELER: R1..R5 ─────────────────────────────────────────
     R5 Lider · R4 Yönetici · R3 Kıdemli · R2 Üye · R1 Yeni Üye

     GERİYE DÖNÜK UYUM — SİLME.
     Bulutta ZATEN "kurucu"/"subay"/"uye" yazan kayıtlar var (bu
     sistem önce o üçlüyle yayına girdi). Okurken rutbeNorm() ile
     çevrilirler; yazarken hep R1..R5 yazılır. Eski değerleri
     tanımayı bırakırsak o ittifakların kurucusu kendi ittifakında
     yetkisiz kalır — ekranda "Yeni Üye" görünür, Dağıt düğmesi
     kaybolur. Firebase kuralı da iki biçimi birden kabul eder. */
  var RUTBE_AD = {
    R5: "Lider", R4: "Yönetici", R3: "Kıdemli Üye", R2: "Üye", R1: "Yeni Üye"
  };
  var RUTBE_SIRA = { R5: 0, R4: 1, R3: 2, R2: 3, R1: 4 };
  var RUTBE_SIMGE = { R5: "👑", R4: "🎖️", R3: "⭐", R2: "👤", R1: "🔰" };
  var RUTBE_DIZI = ["R1", "R2", "R3", "R4", "R5"];

  var ESKI_RUTBE = { kurucu: "R5", subay: "R4", uye: "R1" };

  function rutbeNorm(r) {
    if (!r) return "R1";
    if (RUTBE_AD[r]) return r;          /* zaten R1..R5 */
    return ESKI_RUTBE[r] || "R1";       /* kurucu/subay/uye */
  }
  function rutbeAdi(r) { return RUTBE_AD[rutbeNorm(r)]; }
  function rutbeNo(r) { return Number(rutbeNorm(r).slice(1)) || 1; }

  /* Düzenleme (duyuru, katılım biçimi, başvuru onayı) R4 ve üstü.
     Rütbe verme ve ittifakı dağıtma yalnız R5. */
  var DUZENLEME_ALT_SINIR = 4;

  var aktifSekme = "kur";
  var panel = null;
  var _liste = [];        /* buluttan gelen ittifaklar */
  var _benim = null;      /* üyesi olduğum ittifakın tam kaydı */
  var _yukleniyor = false;
  var _okumaHatasi = null; /* son okuma neden düştü — ekranda gösterilir */
  var _gorunum = "ana";    /* üye ekranı: "ana" | "uyeler" | "ayarlar" */
  var _gucBilgi = null;    /* { guc, sira } — accounts okunduktan sonra dolar */

  /* ── KAPILAR ──────────────────────────────────────────────── */
  function st() { return (typeof state === "object" && state) ? state : null; }
  function benAd() {
    return (typeof currentUsername === "string" && currentUsername) ? currentUsername : null;
  }
  function benKey() {
    var a = benAd();
    return a ? toFirebaseKey(a) : null;
  }
  function bulutVar() {
    return (typeof firebaseReady !== "undefined") && firebaseReady &&
           (typeof firebaseDb !== "undefined") && firebaseDb;
  }
  function kok() { return firebaseDb.ref("ittifaklar"); }
  function uyar(m) { if (typeof showToast === "function") showToast(m); }

  /* ── HATA ÇEVİRİSİ ────────────────────────────────────────────
     Firebase'in ham kodu ("PERMISSION_DENIED") oyuncuya hiçbir şey
     anlatmaz, geliştiriciyi de yanlış yere baktırır: kod sanılır,
     oysa neredeyse her zaman veritabanı KURALLARIDIR — `ittifaklar`
     düğümünü kapsayan bir kural yoksa Realtime Database yazmayı
     varsayılan olarak reddeder. Sebep burada bir kez yazılıyor ki
     bir daha aranmasın (bkz. ITTIFAK-KURULUM.md). */
  function izinHatasiMi(e) {
    var m = String((e && (e.code || e.message)) || "").toUpperCase();
    return m.indexOf("PERMISSION") >= 0 || m.indexOf("DENIED") >= 0;
  }
  function hataMetni(e, ne) {
    if (izinHatasiMi(e)) {
      return ne + ": veritabanı izni yok. Firebase kurallarına " +
             "`ittifaklar` düğümü eklenmeli (bkz. ITTIFAK-KURULUM.md).";
    }
    return ne + ": " + ((e && (e.code || e.message)) || "bilinmeyen hata");
  }
  function saat() { return (typeof sunucuSaati === "function") ? sunucuSaati() : Date.now(); }
  function yaz() { if (typeof persistCurrentState === "function") persistCurrentState(); }

  /* ── KISAYOL ──────────────────────────────────────────────── */
  function kisayol() {
    var s = st();
    return (s && s.ittifak && s.ittifak.id) ? s.ittifak : null;
  }
  function kisayolYaz(it) {
    var s = st();
    if (!s) return;
    if (!it) { delete s.ittifak; }
    else {
      var k = benKey();
      var u = (it.uyeler && k) ? it.uyeler[k] : null;
      s.ittifak = { id: it.id, ad: it.ad, etiket: it.etiket,
                     rutbe: rutbeNorm(u ? u.rutbe : "R1") };
    }
    yaz();
  }

  function benimRutbem() {
    var k = benKey();
    if (!_benim || !k || !_benim.uyeler || !_benim.uyeler[k]) return null;
    return rutbeNorm(_benim.uyeler[k].rutbe);
  }
  function liderMiyim() { return benimRutbem() === "R5"; }
  function yetkiliMi() {
    var r = benimRutbem();
    return !!r && rutbeNo(r) >= DUZENLEME_ALT_SINIR;
  }
  function uyeSayisi(it) {
    return it && it.uyeler ? Object.keys(it.uyeler).length : 0;
  }

  /* ── BULUTTAN OKU ─────────────────────────────────────────── */
  function tazele(bitince) {
    if (!bulutVar()) { _liste = []; _benim = null; if (bitince) bitince(); return; }
    _yukleniyor = true;
    kok().once("value").then(function (snap) {
      _okumaHatasi = null;
      var v = snap.val() || {};
      _liste = Object.keys(v).map(function (id) {
        var it = v[id] || {};
        it.id = id;
        return it;
      });
      var k = benKey();
      _benim = null;
      if (k) {
        for (var i = 0; i < _liste.length; i++) {
          if (_liste[i].uyeler && _liste[i].uyeler[k]) { _benim = _liste[i]; break; }
        }
      }
      /* Kısayol bulutla çelişiyorsa bulut kazanır */
      var ks = kisayol();
      if (_benim) { kisayolYaz(_benim); }
      else if (ks) { kisayolYaz(null); }
      _yukleniyor = false;
      if (bitince) bitince();
    }).catch(function (e) {
      _yukleniyor = false;
      console.warn("[ittifak] okunamadı:", e);
      _okumaHatasi = hataMetni(e, "İttifak listesi alınamadı");
      uyar(_okumaHatasi);
      if (bitince) bitince();
    });
  }

  /* ── GÜÇ ve SIRA ──────────────────────────────────────────────
     İttifakın gücü = ÜYELERİNİN GÜCÜNÜN TOPLAMI. Hesap BURADA
     YAPILMAZ — tema.js'teki RANKSEKME.ittifakGucleri() çağrılır.
     Sebep tek doğruluk kuralı: 🏆 sıralama panelindeki sayı ile bu
     ekrandaki sayı aynı işlevden gelir, ayrışamazlar. (tema.js
     index.html'de bu dosyadan ÖNCE yükleniyor, kapı hazırdır.)

     `ittifaklar` düğümü yeniden OKUNMAZ — tazele() onu zaten
     _liste'ye almıştı. Yalnız `accounts` okunur, o da panel
     açılışında bir kez. Spark planında dinleyici açılmaz.        */
  function gucHesapla(bitince) {
    if (!_benim || !bulutVar()) { _gucBilgi = null; if (bitince) bitince(); return; }
    var kapi = window.RANKSEKME && window.RANKSEKME.ittifakGucleri;
    if (typeof kapi !== "function") { _gucBilgi = null; if (bitince) bitince(); return; }

    var benimId = _benim.id;
    firebaseDb.ref("accounts").once("value").then(function (snap) {
      var hesaplar = snap.val() || {};
      var obj = {};
      for (var i = 0; i < _liste.length; i++) obj[_liste[i].id] = _liste[i];
      var sirali = kapi(hesaplar, obj) || [];
      _gucBilgi = null;
      for (var j = 0; j < sirali.length; j++) {
        if (sirali[j].id === benimId) { _gucBilgi = { guc: sirali[j].guc, sira: j + 1 }; break; }
      }
      if (bitince) bitince();
    }).catch(function (e) {
      console.warn("[ittifak] güç okunamadı:", e);
      _gucBilgi = null;
      if (bitince) bitince();
    });
  }

  /* ── STİL ─────────────────────────────────────────────────── */
  function stilBas() {
    if (document.getElementById("ittifakStil")) return;
    var s = document.createElement("style");
    s.id = "ittifakStil";
    s.textContent =
      "#panel-ittifak{align-items:stretch !important;justify-content:stretch !important;}" +
      /* box-sizing ŞART — ölçüldü, yokluğu gerçek bir hataydı.
         `height:100%` + üstteki/alttaki padding content-box'ta
         TOPLANIR: 390x860 telefonda kart 882 px oluyor, yani panel
         ekrandan 22 px taşıyordu. En alttaki öğe (Dağıt düğmesi,
         alt bar) hep kırpık kalıyordu; içerik kısa olduğu için
         uzun süre fark edilmedi. border-box ile padding yüksekliğin
         İÇİNDE kalır ve kart tam 860 px olur. */
      "#panel-ittifak .overlay-card{box-sizing:border-box !important;" +
        "width:100% !important;max-width:none !important;" +
        "height:100% !important;max-height:none !important;border-radius:0 !important;" +
        "display:flex !important;flex-direction:column !important;overflow:hidden !important;" +
        "padding:calc(12px + env(safe-area-inset-top)) 12px calc(10px + env(safe-area-inset-bottom));}" +
      "#panel-ittifak .it-govde{box-sizing:border-box;}" +
      ".it-bas{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex:0 0 auto;}" +
      /* Başlıktaki ittifak arması. Kapsayıcı h2 zaten
         display:flex + align-items:center + gap:10px (index.html),
         bu yüzden yazıyla dikey ortası kendiliğinden hizalanır —
         burada yalnız ÖLÇÜ verilir. flex:0 0 auto şart: onsuz uzun
         başlıkta arma eziliyor. object-fit:contain kareyi bozmaz.
         Ölçü 19px'lik başlık yazısına göre seçildi (30px). */
      "#panel-ittifak .it-bas-ikon{flex:0 0 auto;width:30px;height:30px;" +
        "object-fit:contain;display:block;" +
        "filter:drop-shadow(0 2px 3px rgba(0,20,45,.55));}" +
      "#panel-ittifak .it-bas h2{flex:1 1 auto;margin:0;text-align:left;" +
        "font-family:'Baloo 2',sans-serif;font-weight:900;color:var(--km-yazi);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      "#panel-ittifak .it-bas .overlay-close{position:static !important;flex:0 0 auto;}" +

      ".it-sekmeler{display:flex;gap:4px;align-items:flex-end;flex:0 0 auto;}" +
      ".it-sekme{flex:1 1 0;min-width:0;border:0;cursor:pointer;font-family:'Baloo 2',sans-serif;" +
        "font-weight:800;font-size:12px;line-height:1;padding:9px 2px 8px;" +
        "border-radius:10px 10px 0 0;color:#dff0ff;overflow:hidden;text-overflow:ellipsis;" +
        "white-space:nowrap;background:linear-gradient(180deg,#2f6cb8,#1d478f);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".it-sekme.secili{background:linear-gradient(180deg,#f4f8ff,#d7e7fb);color:#123a70;" +
        "text-shadow:none;padding-bottom:11px;}" +

      ".it-govde{flex:1 1 auto;min-height:0;overflow-y:auto;padding:8px 2px 2px;}" +
      ".it-kutu{padding:12px 10px;border-radius:12px;margin-bottom:8px;" +
        "background:linear-gradient(180deg,#fbfdff,#e6eef8);box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".it-etiketli{font-family:'Baloo 2',sans-serif;font-weight:800;font-size:12px;color:#25334d;" +
        "display:block;margin:8px 0 4px;}" +
      ".it-giris,.it-alan{width:100%;box-sizing:border-box;border:0;border-radius:9px;padding:9px 10px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:700;font-size:13px;color:#14203a;" +
        "background:#eef4fc;box-shadow:inset 0 0 0 2px rgba(20,60,110,.12);}" +
      ".it-alan{min-height:64px;resize:none;}" +
      ".it-sec{display:flex;gap:6px;margin-top:4px;}" +
      ".it-sec button{flex:1 1 0;border:0;cursor:pointer;border-radius:9px;padding:8px 4px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:12px;color:#25334d;" +
        "background:#dfe7f2;}" +
      ".it-sec button.secili{background:linear-gradient(180deg,#3d7ccc,#22488f);color:#e8f4ff;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".it-ana{display:block;width:100%;margin-top:12px;border:0;cursor:pointer;border-radius:10px;" +
        "padding:11px 8px;font-family:'Baloo 2',sans-serif;font-weight:900;font-size:14px;color:#fff;" +
        "background:linear-gradient(180deg,#f2b52a,#d98f12);text-shadow:0 1px 2px rgba(60,30,0,.45);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".it-ana.it-kapali{background:linear-gradient(180deg,#b9c4d2,#8d9aab);cursor:default;}" +
      ".it-ipucu{font-size:11.5px;color:#3d4a63;margin-top:8px;text-align:center;}" +

      ".it-satir{display:flex;align-items:center;gap:9px;padding:8px;border-radius:12px;margin-bottom:7px;" +
        "background:linear-gradient(180deg,#fbfdff,#e6eef8);box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".it-flama{flex:0 0 44px;width:44px;height:44px;border-radius:10px;display:flex;" +
        "align-items:center;justify-content:center;font-family:'Baloo 2',sans-serif;font-weight:900;" +
        "font-size:13px;color:#fff;background:linear-gradient(180deg,#3d7ccc,#22488f);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".it-orta{flex:1 1 auto;min-width:0;}" +
      ".it-ad{font-family:'Baloo 2',sans-serif;font-weight:900;font-size:13.5px;color:#14203a;" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".it-alt{font-size:11.5px;color:#3d4a63;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".it-dugme{flex:0 0 auto;border:0;cursor:pointer;border-radius:9px;padding:8px 12px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:12px;color:#fff;" +
        "background:linear-gradient(180deg,#57c94f,#2e9a37);box-shadow:0 2px 6px rgba(0,20,45,.3);" +
        "text-shadow:0 1px 2px rgba(0,40,10,.45);}" +
      ".it-dugme.it-mavi{background:linear-gradient(180deg,#3d7ccc,#22488f);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".it-dugme.it-kirmizi{background:linear-gradient(180deg,#e05a5a,#a82c2c);}" +
      ".it-dugme.it-kapali{background:linear-gradient(180deg,#b9c4d2,#8d9aab);cursor:default;}" +
      ".it-kucuk{padding:6px 9px;font-size:11px;}" +
      ".it-rutbe{font-size:11px;font-weight:800;color:#22488f;}" +
      ".it-bos{padding:26px 10px;text-align:center;color:#cfe4ff;font-family:'Baloo 2',sans-serif;" +
        "font-weight:700;font-size:13px;text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".it-baslik{font-family:'Baloo 2',sans-serif;font-weight:900;font-size:13px;color:#e8f4ff;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);margin:10px 0 6px;}" +
      ".it-uyari{font-size:11.5px;font-weight:800;margin-top:6px;}" +
      ".it-uyari.iyi{color:#1f7a33;}" +
      ".it-uyari.kotu{color:#a82c2c;}" +

      /* ═══ ÜYE EKRANI — referans düzeni ═══════════════════════
         Ölçüler dar telefona göre: 360 px genişlikte 2 sütunluk
         ızgara ve 5 satırlık künye taşmadan sığar. Yazı boyları
         punto punto denendi; küçültmeden önce ızgaranın sığdığını
         doğrula. */
      ".ik-kart{padding:10px;border-radius:14px;margin-bottom:8px;" +
        "background:linear-gradient(180deg,#2e73bd,#1d4f92);" +
        "box-shadow:0 2px 8px rgba(0,20,45,.35);}" +
      ".ik-ad{text-align:center;font-family:'Baloo 2',sans-serif;font-weight:900;" +
        "font-size:16px;color:#eaf4ff;text-shadow:0 1px 3px rgba(0,20,45,.7);" +
        "margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".ik-ust{display:flex;align-items:center;gap:10px;}" +
      /* Flama referanstaki gibi mor; köşeleri kırpılmış bayrak. */
      ".ik-flama{flex:0 0 66px;width:66px;height:76px;display:flex;" +
        "align-items:center;justify-content:center;" +
        "background:linear-gradient(180deg,#b558d6,#7d2fa8);" +
        "clip-path:polygon(0 0,100% 0,100% 100%,50% 86%,0 100%);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.4);}" +
      ".ik-flama span{font-family:'Baloo 2',sans-serif;font-weight:900;font-size:15px;" +
        "color:#fff;text-shadow:0 1px 3px rgba(40,0,60,.8);padding-bottom:8px;" +
        "max-width:58px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".ik-bilgi{flex:1 1 auto;min-width:0;}" +
      ".ik-satir{display:flex;align-items:center;gap:5px;padding:1px 0;font-size:12px;}" +
      ".ik-ikon{flex:0 0 auto;font-size:12px;}" +
      ".ik-etiket{flex:0 0 auto;color:#cfe4ff;font-weight:700;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".ik-deger{flex:1 1 auto;min-width:0;text-align:right;color:#fff;font-weight:800;" +
        "font-variant-numeric:tabular-nums;text-shadow:0 1px 2px rgba(0,20,45,.55);" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".ik-bekle{opacity:.55;}" +
      ".ik-sv{display:flex;align-items:center;gap:7px;margin-top:9px;}" +
      ".ik-svno{flex:0 0 22px;width:22px;height:22px;border-radius:50%;" +
        "display:flex;align-items:center;justify-content:center;" +
        "background:linear-gradient(180deg,#f2c14e,#d2932a);color:#4a2c00;" +
        "font-family:'Baloo 2',sans-serif;font-weight:900;font-size:12px;}" +
      ".ik-cubuk{flex:1 1 auto;position:relative;height:15px;border-radius:8px;" +
        "background:rgba(0,20,45,.4);overflow:hidden;}" +
      ".ik-dolu{height:100%;width:0;background:linear-gradient(180deg,#6fd3ff,#2f9fd8);}" +
      ".ik-svyazi{position:absolute;inset:0;display:flex;align-items:center;" +
        "justify-content:center;font-size:10.5px;font-weight:800;color:#eaf4ff;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.8);}" +

      ".ik-duyuru{padding:10px;border-radius:12px;margin-bottom:8px;" +
        "background:linear-gradient(180deg,#fbfdff,#e8eff8);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".ik-duyuru-metin{font-size:12.5px;font-weight:700;color:#1b2a44;" +
        "line-height:1.35;white-space:normal;word-break:break-word;}" +
      ".ik-solgun{color:#6b7a92;}" +
      ".ik-duyuru-alt{display:flex;align-items:center;gap:6px;margin-top:8px;" +
        "padding-top:7px;border-top:1px solid rgba(20,60,110,.14);}" +
      ".ik-duyuru-alt span{flex:1 1 auto;min-width:0;font-size:10.5px;color:#5a6a84;" +
        "line-height:1.25;}" +
      ".ik-duzen{flex:0 0 28px;width:28px;height:28px;border:0;cursor:pointer;" +
        "border-radius:8px;background:#dbe6f4;color:#25406b;font-size:14px;" +
        "font-weight:900;line-height:1;padding:0;}" +

      ".ik-izgara{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:8px;}" +
      ".ik-dugme{display:flex;align-items:center;gap:8px;border:0;cursor:pointer;" +
        "border-radius:12px;padding:11px 9px;min-width:0;text-align:left;" +
        "background:linear-gradient(180deg,#4f9fe0,#2c68ad);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".ik-dugme:active{filter:brightness(.93);}" +
      ".ik-dikon{flex:0 0 auto;font-size:19px;line-height:1;" +
        "filter:drop-shadow(0 1px 2px rgba(0,20,45,.5));}" +
      ".ik-dad{flex:1 1 auto;min-width:0;font-family:'Baloo 2',sans-serif;" +
        "font-weight:800;font-size:12px;color:#fff;line-height:1.15;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +

      /* Alt bar referanstaki gibi EKRANIN DİBİNDE dursun diye gövde
         flex sütun yapılır ve alt bara margin-top:auto verilir.
         `> *{flex:0 0 auto}` ŞART: onsuz flex sütun uzun listeleri
         (üye listesi, ittifak arama sonuçları) sıkıştırır — satırlar
         ezilir. Kısıt hem gövdenin hem sarmalayıcının çocuklarına
         ayrı ayrı gerekir. */
      "#panel-ittifak .it-govde{display:flex;flex-direction:column;}" +
      "#panel-ittifak .it-govde > *{flex:0 0 auto;}" +
      "#panel-ittifak .it-govde > .ik-sarmal{flex:1 1 auto;display:flex;" +
        "flex-direction:column;min-height:0;}" +
      ".ik-sarmal > *{flex:0 0 auto;}" +
      ".ik-sarmal > .ik-altbar{margin-top:auto;padding-top:4px;}" +
      ".ik-altbar{display:flex;gap:7px;}" +
      ".ik-alt{flex:1 1 0;min-width:0;display:flex;flex-direction:column;" +
        "align-items:center;gap:2px;border:0;cursor:pointer;border-radius:12px;" +
        "padding:8px 4px;font-family:'Baloo 2',sans-serif;font-weight:800;" +
        "font-size:11.5px;color:#eaf4ff;text-shadow:0 1px 2px rgba(0,20,45,.55);" +
        "background:linear-gradient(180deg,#3d7ccc,#22488f);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".ik-alt span{font-size:18px;line-height:1;}" +
      ".ik-alt:active{filter:brightness(.93);}" +

      ".ik-geri-bas{display:flex;align-items:center;gap:8px;margin-bottom:8px;}" +
      ".ik-geri{flex:0 0 34px;width:34px;height:34px;border:0;cursor:pointer;" +
        "border-radius:10px;background:linear-gradient(180deg,#3d7ccc,#22488f);" +
        "color:#fff;font-size:17px;font-weight:900;line-height:1;padding:0;" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".ik-geri-bas span{flex:1 1 auto;min-width:0;font-family:'Baloo 2',sans-serif;" +
        "font-weight:900;font-size:15px;color:#eaf4ff;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);overflow:hidden;" +
        "text-overflow:ellipsis;white-space:nowrap;}";
    document.head.appendChild(s);
  }

  /* ── İSKELET ──────────────────────────────────────────────── */
  function iskelet() {
    if (document.getElementById("panel-ittifak")) return;
    var komsu = document.getElementById("panel-inventory");
    var kap = (komsu && komsu.parentNode) ? komsu.parentNode : document.body;

    panel = document.createElement("div");
    panel.className = "overlay-panel";
    panel.id = "panel-ittifak";
    panel.innerHTML =
      '<div class="overlay-card">' +
        '<div class="it-bas">' +
          '<h2><img class="it-bas-ikon" src="ittifakikon.webp" alt="">' +
            "İTTİFAK</h2>" +
          '<button class="overlay-close" data-close>✕</button>' +
        "</div>" +
        '<div class="it-sekmeler" id="itSekmeler"></div>' +
        '<div class="it-govde" id="itGovde"></div>' +
      "</div>";
    kap.appendChild(panel);

    panel.addEventListener("click", function (e) {
      if (e.target === panel || (e.target.closest && e.target.closest("[data-close]"))) kapat();
    });
    document.getElementById("itGovde").addEventListener("click", govdeDokunus);
  }

  /* ── SEKMELER ─────────────────────────────────────────────── */
  function sekmeleriCiz() {
    var el = document.getElementById("itSekmeler");
    if (!el) return;
    if (_benim) { el.innerHTML = ""; el.style.display = "none"; return; }
    el.style.display = "flex";
    var S = [
      { id: "kur",    ad: "İttifak Kur" },
      { id: "katil",  ad: "İttifaka Katıl" },
      { id: "davet",  ad: "Davetler/Talepler" }
    ];
    el.innerHTML = S.map(function (s) {
      return '<button class="it-sekme' + (s.id === aktifSekme ? " secili" : "") +
             '" data-sekme="' + s.id + '">' + s.ad + "</button>";
    }).join("");
    Array.prototype.forEach.call(el.querySelectorAll(".it-sekme"), function (b) {
      b.addEventListener("click", function () {
        if (aktifSekme === b.dataset.sekme) return;
        aktifSekme = b.dataset.sekme;
        sekmeleriCiz();
        govdeCiz();
      });
    });
  }

  /* ── GÖVDE ────────────────────────────────────────────────── */
  function kacar(x) {
    return String(x == null ? "" : x)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function govdeCiz() {
    var el = document.getElementById("itGovde");
    if (!el) return;
    if (_yukleniyor) { el.innerHTML = '<div class="it-bos">Yükleniyor…</div>'; return; }
    if (!bulutVar()) {
      el.innerHTML = '<div class="it-bos">İttifak için internet bağlantısı gerekli.</div>';
      return;
    }
    /* Okuma düştüyse sebep EKRANDA yazar. Gövdenin yerine geçmez,
       ÜSTÜNE binen bir şerittir: kurallar okumayı reddedip yazmaya
       izin veriyor olabilir — o durumda "Kur" formu hâlâ işe yarar,
       formu gizlemek çalışan bir yolu kapatmak olurdu. */
    var seritHTML = _okumaHatasi
      ? '<div class="it-kutu" style="background:linear-gradient(180deg,#ffe9e9,#f7d2d2);">' +
          '<div class="it-uyari kotu" style="margin:0;">⚠️ ' + kacar(_okumaHatasi) + "</div>" +
        "</div>"
      : "";

    if (_benim) { el.innerHTML = seritHTML + ittifakEkraniHTML(); }
    else if (aktifSekme === "kur")   { el.innerHTML = seritHTML + kurHTML(); }
    else if (aktifSekme === "katil") { el.innerHTML = seritHTML + katilHTML(); }
    else                             { el.innerHTML = seritHTML + davetHTML(); }

    if (!kapaliHareket()) {
      el.animate([{ opacity: 0, transform: "translateY(8px)" },
                  { opacity: 1, transform: "translateY(0)" }],
                 { duration: 180, easing: "cubic-bezier(.2,.85,.3,1)" });
    }
  }

  function kapaliHareket() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /* ── 1) İTTİFAK KUR ───────────────────────────────────────── */
  var kurKatilim = "aninda";

  function kurHTML() {
    var elmas = (st() && st().diamonds) ? st().diamonds : 0;
    var yeter = elmas >= KURMA_BEDELI;
    return '<div class="it-kutu">' +
      '<label class="it-etiketli">İttifak Adı (' + AD_MIN + "–" + AD_MAX + " harf)</label>" +
      '<input class="it-giris" id="itAd" maxlength="' + AD_MAX + '" placeholder="Girmek için dokun">' +
      '<label class="it-etiketli">Etiket (' + ETIKET_MIN + "–" + ETIKET_MAX + " harf, benzersiz)</label>" +
      '<input class="it-giris" id="itEtiket" maxlength="' + ETIKET_MAX + '" placeholder="ABC">' +
      '<label class="it-etiketli">İttifak Manifestosu</label>' +
      '<textarea class="it-alan" id="itManifesto" maxlength="' + MANIFESTO_MAX + '"' +
        ' placeholder="Diğer savaşçılara ittifakını anlat"></textarea>' +
      '<label class="it-etiketli">Katılım</label>' +
      '<div class="it-sec" id="itKatilimSec">' +
        '<button data-katilim="aninda"' + (kurKatilim === "aninda" ? ' class="secili"' : "") +
          ">Anında Katıl</button>" +
        '<button data-katilim="basvuru"' + (kurKatilim === "basvuru" ? ' class="secili"' : "") +
          ">Başvuruyla</button>" +
      "</div>" +
      '<div class="it-uyari" id="itKurUyari"></div>' +
      '<button class="it-ana' + (yeter ? "" : " it-kapali") + '" id="itKurBtn">' +
        "İttifak Kur · 💎 " + KURMA_BEDELI + "</button>" +
      '<div class="it-ipucu">Elmasın: 💎 ' +
        ((typeof fmt === "function") ? fmt(elmas) : elmas) + "</div>" +
    "</div>";
  }

  function kur() {
    var ad = (document.getElementById("itAd") || {}).value || "";
    var etiket = (document.getElementById("itEtiket") || {}).value || "";
    var man = (document.getElementById("itManifesto") || {}).value || "";
    var uyariEl = document.getElementById("itKurUyari");
    ad = ad.trim(); etiket = etiket.trim();

    function hata(m) {
      if (uyariEl) { uyariEl.className = "it-uyari kotu"; uyariEl.textContent = m; }
      else uyar(m);
    }

    if (!benAd()) { hata("Önce giriş yapmalısın."); return; }
    if (ad.length < AD_MIN || ad.length > AD_MAX) { hata("İttifak adı " + AD_MIN + "–" + AD_MAX + " harf olmalı."); return; }
    if (etiket.length < ETIKET_MIN || etiket.length > ETIKET_MAX) { hata("Etiket " + ETIKET_MIN + "–" + ETIKET_MAX + " harf olmalı."); return; }
    if (!/^[A-Za-z0-9ÇĞİÖŞÜçğıöşü]+$/.test(etiket)) { hata("Etiket yalnız harf ve rakam içerebilir."); return; }

    var s = st();
    if (!s || (s.diamonds || 0) < KURMA_BEDELI) { hata("Yeterli elmasın yok (💎 " + KURMA_BEDELI + ")."); return; }

    var id = etiket.toLowerCase();
    var adK = ad.toLowerCase();
    for (var i = 0; i < _liste.length; i++) {
      if (_liste[i].id === id) { hata("Bu etiket kullanılıyor."); return; }
      if ((_liste[i].adKucuk || "") === adK) { hata("Bu ittifak adı kullanılıyor."); return; }
    }

    var k = benKey(), ben = benAd();
    var kayit = {
      ad: ad, adKucuk: adK, etiket: etiket, manifesto: man.trim(),
      katilim: kurKatilim, kurucu: ben, kurulus: saat(),
      uyeler: {}
    };
    kayit.uyeler[k] = { ad: ben, rutbe: "R5", at: saat() };

    if (uyariEl) { uyariEl.className = "it-uyari"; uyariEl.textContent = "Kuruluyor…"; }

    /* Etiket benzersizliği düğüm adıyla korunur: aynı anda iki kişi
       aynı etiketi alırsa ikincisi burada takılır, sessizce üstüne
       yazmaz. */
    kok().child(id).transaction(function (mevcut) {
      if (mevcut) return;            /* dolu → iptal */
      return kayit;
    }).then(function (sonuc) {
      if (!sonuc.committed) { hata("Bu etiket az önce alındı, başka bir etiket dene."); return; }
      s.diamonds = (s.diamonds || 0) - KURMA_BEDELI;
      if (typeof renderDiamonds === "function") renderDiamonds();
      kayit.id = id;
      _benim = kayit;
      kisayolYaz(kayit);
      uyar("🤝 " + ad + " kuruldu!");
      tazele(function () { sekmeleriCiz(); govdeCiz(); });
    }).catch(function (e) {
      console.warn("[ittifak] kurulamadı:", e);
      hata(hataMetni(e, "Kurulamadı"));
    });
  }

  /* ── 2) İTTİFAKA KATIL ────────────────────────────────────── */
  var arama = "";

  function katilHTML() {
    var k = benKey();
    var liste = _liste.filter(function (it) {
      if (!arama) return true;
      var a = (it.ad || "") + " " + (it.etiket || "");
      return a.toLowerCase().indexOf(arama.toLowerCase()) >= 0;
    });
    var h = '<div class="it-kutu" style="padding:8px;">' +
      '<input class="it-giris" id="itArama" placeholder="İttifak ara" value="' + kacar(arama) + '">' +
    "</div>";
    if (!liste.length) {
      return h + '<div class="it-bos">' +
        (_liste.length ? "Aramaya uyan ittifak yok." : "Henüz kurulmuş bir ittifak yok. İlkini sen kur!") +
        "</div>";
    }
    h += liste.map(function (it) {
      var sayi = uyeSayisi(it);
      var dolu = sayi >= UYE_SINIRI;
      var basvurdum = !!(it.basvurular && k && it.basvurular[k]);
      var aninda = (it.katilim !== "basvuru");
      var etiketiVar = dolu
        ? '<button class="it-dugme it-kapali" disabled>Dolu</button>'
        : (basvurdum
            ? '<button class="it-dugme it-kapali" disabled>Başvuruldu</button>'
            : '<button class="it-dugme' + (aninda ? "" : " it-mavi") +
              '" data-katil="' + kacar(it.id) + '">' + (aninda ? "Katıl" : "Başvur") + "</button>");
      return '<div class="it-satir">' +
        '<div class="it-flama">' + kacar(it.etiket) + "</div>" +
        '<div class="it-orta">' +
          '<div class="it-ad">' + kacar(it.ad) + "</div>" +
          '<div class="it-alt">👤 ' + sayi + "/" + UYE_SINIRI +
            " · " + (aninda ? "Anında katılım" : "Başvuruyla") + "</div>" +
          '<div class="it-alt">' + kacar(it.manifesto || "") + "</div>" +
        "</div>" + etiketiVar +
      "</div>";
    }).join("");
    return h;
  }

  function katilVeyaBasvur(id) {
    var it = null;
    for (var i = 0; i < _liste.length; i++) if (_liste[i].id === id) it = _liste[i];
    if (!it) return;
    var k = benKey(), ben = benAd();
    if (!k) { uyar("Önce giriş yapmalısın."); return; }
    if (_benim) { uyar("Zaten bir ittifaktasın."); return; }
    if (uyeSayisi(it) >= UYE_SINIRI) { uyar("İttifak dolu."); return; }

    if (it.katilim === "basvuru") {
      kok().child(id).child("basvurular").child(k).set({ ad: ben, at: saat() })
        .then(function () {
          uyar("Başvurun gönderildi.");
          tazele(function () { govdeCiz(); });
        })
        .catch(function (e) { uyar(hataMetni(e, "Başvuru gönderilemedi")); console.warn("[ittifak]", e); });
      return;
    }

    kok().child(id).child("uyeler").child(k).set({ ad: ben, rutbe: "R1", at: saat() })
      .then(function () {
        uyar("🤝 " + it.ad + " ittifakına katıldın!");
        tazele(function () { sekmeleriCiz(); govdeCiz(); });
      })
      .catch(function (e) { uyar(hataMetni(e, "Katılınamadı")); console.warn("[ittifak]", e); });
  }

  /* ── 3) DAVETLER / TALEPLER (üye değilken: kendi başvuruların) ── */
  function davetHTML() {
    var k = benKey();
    var bekleyen = _liste.filter(function (it) {
      return !!(it.basvurular && k && it.basvurular[k]);
    });
    if (!bekleyen.length) {
      return '<div class="it-bos">İncelenecek davet yok!</div>';
    }
    return '<div class="it-baslik">Gönderdiğin başvurular</div>' +
      bekleyen.map(function (it) {
        return '<div class="it-satir">' +
          '<div class="it-flama">' + kacar(it.etiket) + "</div>" +
          '<div class="it-orta">' +
            '<div class="it-ad">' + kacar(it.ad) + "</div>" +
            '<div class="it-alt">Yanıt bekleniyor</div>' +
          "</div>" +
          '<button class="it-dugme it-kirmizi it-kucuk" data-geri="' + kacar(it.id) + '">Geri çek</button>' +
        "</div>";
      }).join("");
  }

  function basvuruGeriCek(id) {
    var k = benKey();
    if (!k) return;
    kok().child(id).child("basvurular").child(k).remove()
      .then(function () { uyar("Başvuru geri çekildi."); tazele(function () { govdeCiz(); }); })
      .catch(function (e) { uyar(hataMetni(e, "Geri çekilemedi")); console.warn("[ittifak]", e); });
  }

  /* ══════════════════════════════════════════════════════════════
     ÜYE EKRANI — üç görünüm tek panelde
       "ana"     → ittifak künyesi + duyuru + 2x4 ızgara + alt bar
       "uyeler"  → üye listesi, başvurular, rütbe/atma işlemleri
       "ayarlar" → katılım biçimi, ayrıl / dağıt

     IZGARADAKİ 8 DÜĞMENİN ARKASINDA SİSTEM YOK — hepsi "Yakında"
     der. Bilerek: her biri (Savaş, Sandıklar, Bölge, Çarpışma,
     Mağaza, Teknoloji, Yardım, Zafer) kendi ekranı ve dengesi olan
     ayrı bir sistem. Düğmeleri şimdiden koymak, sistemler geldikçe
     yerlerinin hazır olmasını sağlar; ekran yeniden kurulmaz.

     "Üyeler" ve "Ayarlar" ÇALIŞIR durumda bırakıldı — bunlar zaten
     vardı, "Yakında"ya çevirmek çalışan bir özelliği geri almak
     olurdu.
     ══════════════════════════════════════════════════════════════ */

  /* Büyük sayıyı 106.856 biçiminde yazar (referans ekranla aynı). */
  function sayiBicim(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function ittifakEkraniHTML() {
    if (_gorunum === "uyeler")  return uyelerEkraniHTML();
    if (_gorunum === "ayarlar") return ayarlarEkraniHTML();
    return anaEkranHTML();
  }

  /* ── GÖRÜNÜM 1: ANA KÜNYE ─────────────────────────────────── */
  function anaEkranHTML() {
    var it = _benim;
    var sayi = uyeSayisi(it);

    function bilgi(ikon, etiket, deger) {
      return '<div class="ik-satir">' +
               '<span class="ik-ikon">' + ikon + "</span>" +
               '<span class="ik-etiket">' + etiket + "</span>" +
               '<span class="ik-deger">' + deger + "</span>" +
             "</div>";
    }
    /* Güç ve sıra ayrı bir okumadan gelir; gelene kadar "…" durur.
       Sıfır yazmak yanlış olurdu — 0 güç gerçek bir değer. */
    var gucYazi  = _gucBilgi ? sayiBicim(_gucBilgi.guc) : '<span class="ik-bekle">…</span>';
    var siraYazi = _gucBilgi ? ("#" + _gucBilgi.sira)   : '<span class="ik-bekle">…</span>';

    var h = '<div class="ik-sarmal"><div class="ik-kart">' +
      '<div class="ik-ad">[' + kacar(it.etiket) + "]" + kacar(it.ad) + "</div>" +
      '<div class="ik-ust">' +
        '<div class="ik-flama"><span>' + kacar(it.etiket) + "</span></div>" +
        '<div class="ik-bilgi">' +
          bilgi("🏅", "İttifak Lideri", kacar(it.kurucu || "—")) +
          bilgi("✊", "Güç", gucYazi) +
          bilgi("🏆", "Sıra", siraYazi) +
          bilgi("👤", "Üyeler", sayi + "/" + UYE_SINIRI) +
          bilgi("💬", "Dil", kacar(it.dil || "Tüm diller")) +
        "</div>" +
      "</div>" +
      /* Seviye çubuğu GÖRSELDİR: ittifak tecrübe sistemi henüz yok,
         bu yüzden hep Sv1 ve 0/40.000 gösterir. Sistem gelince
         buradaki iki sayı veriden beslenecek. */
      '<div class="ik-sv">' +
        '<div class="ik-svno">1</div>' +
        '<div class="ik-cubuk"><div class="ik-dolu"></div>' +
          '<span class="ik-svyazi">0/40.000</span></div>' +
      "</div>" +
    "</div>";

    var duyuru = String(it.manifesto || "").trim();
    h += '<div class="ik-duyuru">' +
      '<div class="ik-duyuru-metin' + (duyuru ? "" : " ik-solgun") + '">' +
        (duyuru ? kacar(duyuru) : "İttifak henüz hiçbir duyuru yayınlamadı.") +
      "</div>" +
      '<div class="ik-duyuru-alt">' +
        "<span>📝 Düzenlemeleri sadece R4 veya üstü üyeler yapabilir</span>" +
        '<button class="ik-duzen" data-yakinda="Duyuru düzenleme">⇄</button>' +
      "</div>" +
    "</div>";

    var IZGARA = [
      ["⚔️", "Savaş"],    ["🎁", "Sandıklar"],
      ["🚩", "Bölge"],    ["💥", "Çarpışma"],
      ["🏪", "Mağaza"],   ["🔬", "Teknoloji"],
      ["🏆", "Güç Sıralamaları"], ["🤝", "Yardım"]
    ];
    h += '<div class="ik-izgara">' + IZGARA.map(function (g) {
      return '<button class="ik-dugme" data-yakinda="' + kacar(g[1]) + '">' +
               '<span class="ik-dikon">' + g[0] + "</span>" +
               '<span class="ik-dad">' + g[1] + "</span>" +
             "</button>";
    }).join("") + "</div>";

    h += '<div class="ik-altbar">' +
      '<button class="ik-alt" data-gorunum="uyeler"><span>👥</span>Üyeler</button>' +
      '<button class="ik-alt" data-yakinda="Zafer"><span>🏅</span>Zafer</button>' +
      '<button class="ik-alt" data-gorunum="ayarlar"><span>⚙️</span>Ayarlar</button>' +
    "</div></div>";

    return h;
  }

  /* ── GÖRÜNÜM 2: ÜYELER ────────────────────────────────────── */
  function uyelerEkraniHTML() {
    var it = _benim;
    var benimR = benimRutbem();
    var yetki = yetkiliMi();
    var lider = liderMiyim();
    var k = benKey();

    var uyeler = Object.keys(it.uyeler || {}).map(function (uk) {
      var u = it.uyeler[uk] || {};
      return { key: uk, ad: u.ad || uk, rutbe: rutbeNorm(u.rutbe), at: u.at || 0 };
    }).sort(function (a, b) {
      var f = RUTBE_SIRA[a.rutbe] - RUTBE_SIRA[b.rutbe];
      return f !== 0 ? f : (a.at - b.at);
    });

    var h = geriBasligiHTML("Üyeler (" + uyeler.length + "/" + UYE_SINIRI + ")");

    var basv = Object.keys(it.basvurular || {});
    if (yetki && basv.length) {
      h += '<div class="it-baslik">Başvurular (' + basv.length + ")</div>";
      h += basv.map(function (bk) {
        var b = it.basvurular[bk] || {};
        return '<div class="it-satir">' +
          '<div class="it-flama">👤</div>' +
          '<div class="it-orta"><div class="it-ad">' + kacar(b.ad || bk) + "</div>" +
            '<div class="it-alt">Katılmak istiyor</div></div>' +
          '<button class="it-dugme it-kucuk" data-onay="' + kacar(bk) + '">Onayla</button>' +
          '<button class="it-dugme it-kirmizi it-kucuk" data-ret="' + kacar(bk) + '">Ret</button>' +
        "</div>";
      }).join("");
    }

    h += '<div class="it-baslik">Üyeler</div>';
    h += uyeler.map(function (u) {
      var benMi = (u.key === k);
      var no = rutbeNo(u.rutbe);
      var dugmeler = "";
      /* Rütbe yalnız Lider'in elinde; R5 verilemez (tek lider kuralı),
         bu yüzden terfi tavanı R4'tür. */
      if (!benMi && lider && no < 5) {
        if (no < 4) {
          dugmeler += '<button class="it-dugme it-mavi it-kucuk" data-terfi="' +
                      kacar(u.key) + '">▲</button>';
        }
        if (no > 1) {
          dugmeler += '<button class="it-dugme it-mavi it-kucuk" data-indir="' +
                      kacar(u.key) + '">▼</button>';
        }
      }
      if (!benMi && yetki && no < rutbeNo(benimR)) {
        dugmeler += '<button class="it-dugme it-kirmizi it-kucuk" data-at="' +
                    kacar(u.key) + '">At</button>';
      }
      return '<div class="it-satir">' +
        '<div class="it-flama">' + RUTBE_SIMGE[u.rutbe] + "</div>" +
        '<div class="it-orta"><div class="it-ad">' + kacar(u.ad) +
          (benMi ? " (sen)" : "") + "</div>" +
          '<div class="it-rutbe">' + u.rutbe + " · " + RUTBE_AD[u.rutbe] + "</div></div>" +
        dugmeler +
      "</div>";
    }).join("");

    return h;
  }

  /* ── GÖRÜNÜM 3: AYARLAR ───────────────────────────────────── */
  function ayarlarEkraniHTML() {
    var it = _benim;
    var lider = liderMiyim();

    var h = geriBasligiHTML("Ayarlar");

    h += '<div class="it-kutu">' +
      '<div class="it-ad" style="font-size:14px;">[' + kacar(it.etiket) + "]" +
        kacar(it.ad) + "</div>" +
      '<div class="it-alt" style="margin-top:4px;">Rütben: ' +
        benimRutbem() + " · " + rutbeAdi(benimRutbem()) + "</div>" +
      '<div class="it-alt">Katılım: ' +
        (it.katilim === "basvuru" ? "Başvuruyla" : "Anında katılım") + "</div>" +
      '<div class="it-alt">Kuruluş: ' + tarihYazi(it.kurulus) + "</div>" +
    "</div>";

    h += '<button class="it-ana" data-yakinda="İttifak ayarlarını düzenleme">' +
         "Ayarları Düzenle</button>";

    h += lider
      ? '<button class="it-ana" id="itDagitBtn" style="background:linear-gradient(180deg,#e05a5a,#a82c2c);">İttifakı Dağıt</button>'
      : '<button class="it-ana" id="itAyrilBtn" style="background:linear-gradient(180deg,#e05a5a,#a82c2c);">İttifaktan Ayrıl</button>';
    return h;
  }

  function tarihYazi(ms) {
    var n = Number(ms) || 0;
    if (!n) return "—";
    try { return new Date(n).toLocaleDateString("tr-TR"); } catch (e) { return "—"; }
  }

  function geriBasligiHTML(baslik) {
    return '<div class="ik-geri-bas">' +
      '<button class="ik-geri" data-gorunum="ana">←</button>' +
      "<span>" + kacar(baslik) + "</span>" +
    "</div>";
  }

  /* ── ÜYE İŞLEMLERİ ────────────────────────────────────────── */
  function uyeYolu(uk) { return kok().child(_benim.id).child("uyeler").child(uk); }

  function basvuruOnayla(bk) {
    if (!_benim || !yetkiliMi()) return;
    var b = (_benim.basvurular || {})[bk];
    if (!b) return;
    if (uyeSayisi(_benim) >= UYE_SINIRI) { uyar("İttifak dolu."); return; }
    uyeYolu(bk).set({ ad: b.ad || bk, rutbe: "R1", at: saat() })
      .then(function () { return kok().child(_benim.id).child("basvurular").child(bk).remove(); })
      .then(function () { uyar((b.ad || "Oyuncu") + " katıldı."); tazele(govdeCiz); })
      .catch(function (e) { uyar(hataMetni(e, "İşlem başarısız")); console.warn("[ittifak]", e); });
  }

  function basvuruReddet(bk) {
    if (!_benim || !yetkiliMi()) return;
    kok().child(_benim.id).child("basvurular").child(bk).remove()
      .then(function () { uyar("Başvuru reddedildi."); tazele(govdeCiz); })
      .catch(function (e) { uyar(hataMetni(e, "İşlem başarısız")); console.warn("[ittifak]", e); });
  }

  /* Rütbe değiştirme YALNIZ Lider'e (R5) ait. R5 tek kişidir:
     kimseye R5 verilemez, yoksa iki lider oluşur ve "ittifakı dağıt"
     yetkisi çoğalır. Devretme ayrı bir iş (2. aşama). */
  function rutbeVer(uk, rutbe) {
    if (!_benim || !liderMiyim()) { uyar("Rütbeyi yalnız Lider değiştirebilir."); return; }
    rutbe = rutbeNorm(rutbe);
    if (rutbe === "R5") { uyar("Liderlik devri henüz yok."); return; }
    var u = (_benim.uyeler || {})[uk];
    if (!u) return;
    if (rutbeNorm(u.rutbe) === "R5") { uyar("Liderin rütbesi değiştirilemez."); return; }
    uyeYolu(uk).child("rutbe").set(rutbe)
      .then(function () { uyar("Rütbe güncellendi."); tazele(govdeCiz); })
      .catch(function (e) { uyar(hataMetni(e, "İşlem başarısız")); console.warn("[ittifak]", e); });
  }

  function uyeAt(uk) {
    if (!_benim || !yetkiliMi()) return;
    var u = (_benim.uyeler || {})[uk];
    if (!u) return;
    var hedef = rutbeNo(u.rutbe), benim = rutbeNo(benimRutbem());
    if (hedef === 5) { uyar("Lider atılamaz."); return; }
    /* Kendinden yüksek ya da KENDİNLE AYNI rütbeyi atamazsın —
       eşit olanın atılabilmesi iki Yöneticinin birbirini sırayla
       atmasına yol açardı. */
    if (hedef >= benim) { uyar(rutbeAdi(u.rutbe) + " rütbesini atamazsın."); return; }
    uyeYolu(uk).remove()
      .then(function () { uyar((u.ad || "Üye") + " ittifaktan atıldı."); tazele(govdeCiz); })
      .catch(function (e) { uyar(hataMetni(e, "İşlem başarısız")); console.warn("[ittifak]", e); });
  }

  function ayril() {
    if (!_benim) return;
    var k = benKey();
    uyeYolu(k).remove()
      .then(function () {
        uyar("İttifaktan ayrıldın.");
        _benim = null;
        kisayolYaz(null);
        aktifSekme = "katil";
        tazele(function () { sekmeleriCiz(); govdeCiz(); });
      })
      .catch(function (e) { uyar(hataMetni(e, "Ayrılınamadı")); console.warn("[ittifak]", e); });
  }

  function dagit() {
    if (!_benim || benimRutbem() !== "kurucu") return;
    var ad = _benim.ad;
    kok().child(_benim.id).remove()
      .then(function () {
        uyar(ad + " dağıtıldı.");
        _benim = null;
        kisayolYaz(null);
        aktifSekme = "kur";
        tazele(function () { sekmeleriCiz(); govdeCiz(); });
      })
      .catch(function (e) { uyar(hataMetni(e, "Dağıtılamadı")); console.warn("[ittifak]", e); });
  }

  /* ── DOKUNUŞ — tek kapı ───────────────────────────────────── */
  function govdeDokunus(e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var kb = t.closest("[data-katilim]");
    if (kb) { kurKatilim = kb.dataset.katilim; govdeCizKoru(); return; }

    var gb = t.closest("[data-gorunum]");
    if (gb) { _gorunum = gb.dataset.gorunum; govdeCiz(); return; }

    /* Arkasında sistem olmayan düğmeler tek kapıdan geçer. */
    var yk = t.closest("[data-yakinda]");
    if (yk) { uyar("⏳ " + yk.dataset.yakinda + " — yakında!"); return; }

    if (t.closest("#itKurBtn"))    { kur(); return; }
    if (t.closest("#itAyrilBtn"))  { ayril(); return; }
    if (t.closest("#itDagitBtn"))  { dagit(); return; }

    var b;
    if ((b = t.closest("[data-katil]"))) { katilVeyaBasvur(b.dataset.katil); return; }
    if ((b = t.closest("[data-geri]")))  { basvuruGeriCek(b.dataset.geri); return; }
    if ((b = t.closest("[data-onay]")))  { basvuruOnayla(b.dataset.onay); return; }
    if ((b = t.closest("[data-ret]")))   { basvuruReddet(b.dataset.ret); return; }
    if ((b = t.closest("[data-terfi]")))  { rutbeVer(b.dataset.terfi, "subay"); return; }
    if ((b = t.closest("[data-indir]")))  { rutbeVer(b.dataset.indir, "uye"); return; }
    if ((b = t.closest("[data-at]")))     { uyeAt(b.dataset.at); return; }
  }

  /* Kur ekranı yeniden çizilirken yazılanlar kaybolmasın */
  function govdeCizKoru() {
    var ad = (document.getElementById("itAd") || {}).value;
    var et = (document.getElementById("itEtiket") || {}).value;
    var mn = (document.getElementById("itManifesto") || {}).value;
    govdeCiz();
    if (ad != null && document.getElementById("itAd")) document.getElementById("itAd").value = ad;
    if (et != null && document.getElementById("itEtiket")) document.getElementById("itEtiket").value = et;
    if (mn != null && document.getElementById("itManifesto")) document.getElementById("itManifesto").value = mn;
  }

  /* Arama kutusu her tuşta listeyi süzer (yeniden çizim odağı
     kaybettirmesin diye değer geri yazılıyor). */
  function aramaBagla() {
    var el = document.getElementById("itArama");
    if (!el || el.dataset.bagli) return;
    el.dataset.bagli = "1";
    el.addEventListener("input", function () {
      arama = el.value;
      var yer = el.selectionStart;
      govdeCiz();
      var yeni = document.getElementById("itArama");
      if (yeni) { yeni.focus(); try { yeni.setSelectionRange(yer, yer); } catch (e) {} aramaBagla(); }
    });
  }

  /* ── AÇ / KAPAT ───────────────────────────────────────────── */
  function ac() {
    stilBas();
    iskelet();
    if (!panel) return;
    if (typeof tumPanelleriKapat === "function") tumPanelleriKapat("ittifak");
    panel.classList.add("active");

    clearTimeout(panel._hayaletZm);
    panel.style.pointerEvents = "none";
    panel._hayaletZm = setTimeout(function () { panel.style.pointerEvents = ""; }, 350);

    _yukleniyor = true;
    sekmeleriCiz();
    govdeCiz();
    _gorunum = "ana";
    _gucBilgi = null;
    tazele(function () {
      if (_benim) aktifSekme = "kur";
      sekmeleriCiz();
      govdeCiz();
      aramaBagla();
      /* Güç/sıra ikinci bir okuma ister; ekran onu beklemez, gelince
         kendiliğinden tazelenir. Panel bu arada kapanmış olabilir. */
      if (_benim) gucHesapla(function () { if (_benim && _gorunum === "ana") govdeCiz(); });
    });

    var kart = panel.querySelector(".overlay-card");
    if (kart && !kapaliHareket()) {
      kart.animate([{ opacity: 0, transform: "translateY(18px)" },
                    { opacity: 1, transform: "translateY(0)" }],
                   { duration: 240, easing: "cubic-bezier(.2,.85,.3,1)" });
    }
  }

  function kapat() { if (panel) panel.classList.remove("active"); }

  /* Alt menüdeki 5. düğme index.html'de data-panel="ittifak"
     diyor; openOverlayPanel bu anahtarı tanımadığı için sarmalanır. */
  function dockBagla() {
    var orij = window.openOverlayPanel;
    if (typeof orij !== "function" || orij.__ittifakWrapped) return;
    var sarmal = function (key) {
      if (key === "ittifak") { ac(); return; }
      return orij.apply(this, arguments);
    };
    sarmal.__ittifakWrapped = true;
    window.openOverlayPanel = sarmal;
  }

  function baslat() { stilBas(); iskelet(); dockBagla(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", baslat);
  } else {
    baslat();
  }

  window.ITTIFAK = {
    SURUM: SURUM,
    ac: ac, kapat: kapat, tazele: tazele,
    BEDEL: KURMA_BEDELI, UYE_SINIRI: UYE_SINIRI,
    /* Başka dosyalar oyuncunun etiketini buradan okur (2. aşama:
       harita etiketi, sohbet kanalı). Bulut değil, kısayol döner. */
    benim: function () { return kisayol(); },
    tani: function () {
      return {
        surum: SURUM,
        bulut: bulutVar(),
        kisayol: kisayol(),
        ittifakSayisi: _liste.length,
        uyesiOldugum: _benim ? (_benim.etiket + " / " + _benim.ad + " / " + benimRutbem()) : null
      };
    }
  };
})();
