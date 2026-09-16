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

   IZGARADAKİ 8 DÜĞMEDEN ÜÇÜ ARTIK ÇALIŞIYOR:
     Savaş     → Seferberlik / Bireysel / Etkinlikler sekmeleri,
                 Oto-Katıl ayarı. Çarpışma ÜRETEN sistem henüz yok,
                 o yüzden liste normalde boştur (referanstaki boş
                 durum). Kapı hazır: ITTIFAK.carpismaAc().
     Sandıklar → anahtar çubuğu + Ganimet Sandığı / İttifak Hediyesi
                 sekmeleri, Topla / Tümünü Al, günlük ganimet tavanı,
                 isimsiz hediye seçeneği.
     Mağaza    → İttifak Jetonu ile Bugün / Hafta katalogları,
                 dönem sayacı, oyuncu başına stok, seviyeyle açılan
                 kilitli satırlar.
   Kalan beşi (Bölge, Çarpışma, Teknoloji, Güç Sıralamaları, Yardım)
   hâlâ "Yakında" der; yerleri duruyor ki sıra onlara gelince ekran
   yeniden kurulmasın.

   EKONOMİ — İKİ KAYNAK
   İttifak ilerlemesi ASIL OLARAK ÜCRETLİ PAKETLERE aittir:
     paketAlindi()   → GERÇEK PARA. Tam oran + TÜM üyelere hediye.
                       ŞU AN HİÇBİR YERDEN ÇAĞRILMIYOR: oyunda ücretli
                       satın alma sistemi yok. Kapı bilerek açık.
     elmasHarcandi() → OYUN İÇİ ELMAS (magaza.js buyItem kancası).
                       Bedelin yalnız %10'u sayaca yazılır, HEDİYE
                       AÇMAZ — elmas oyun içinden kazanılıyor, tam
                       oranla saymak seviyeyi bedavaya tavana taşırdı.
   İki sayaç:
     sayac.tec     → künyedeki SEVİYE çubuğu (mağaza kilitlerini açar)
     sayac.anahtar → Sandıklar ekranının tepesindeki çubuk; dolunca
                     sıfırlanır ve herkese bir Ganimet Sandığı düşer
                     (kaynağı ne olursa olsun)
   Sandık kaydı BİR TANEDİR, her üye `toplayan` altına kendini
   yazarak bir kez toplar.
   Jeton oyuncunun kendi kaydındadır: state.ittifakJeton.

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
       basvurular:{ oyuncuAnahtari:{ad,at} },
       sayac:{ anahtar, tec },
       sandiklar:{ id:{tur,sebep,kim,jeton,at,toplayan:{oyuncuAnahtari:true}} },
       carpismalar:{ id:{tur,ad,kim,at,biter,katilan:{oyuncuAnahtari:{ad,at}}} } }
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
     · SEFERBERLİK ÇAĞRISI ÜRETEN sistem — Savaş ekranı çağrıları
       gösteriyor ve katılmayı biliyor, ama çağrıyı AÇAN yer henüz
       bağlanmadı (haritadaki saldırı akışına bağlanacak).
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
  var _uyeBilgi = {};      /* oyuncuAnahtarı → { guc, sv, gorulme } */
  var _uyeArama = "";      /* Üyeler ekranındaki arama kutusu */
  var _kapaliRutbe = {};   /* katlanmış rütbe grupları: { R4:true } */

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

      /* ÜYE KARTLARININ VERİSİ AYNI OKUMADAN ÇIKAR.
         Üyeler ekranı güç, kale seviyesi ve son görülme istiyor;
         üçü de `accounts` içinde. İkinci bir okuma açmak, aynı
         düğümü panel başına iki kez indirmek olurdu. Kendi
         satırımı canlı `state`ten kurarım — bulut kaydım birkaç
         saniye geride olabilir ve oyuncu kendi gücünü yanlış
         görmek gibi bir hatayı hemen fark eder. */
      var bk = benKey();
      _uyeBilgi = {};
      Object.keys(_benim.uyeler || {}).forEach(function (uk) {
        var kaynak = (bk && uk === bk && st()) ? st()
                   : ((hesaplar[uk] || {}).state || null);
        var guc = 0;
        try {
          if (kaynak && typeof computePlayerPower === "function") {
            guc = computePlayerPower(kaynak) || 0;
          }
        } catch (e) {}
        _uyeBilgi[uk] = {
          guc: guc,
          sv: kaynak ? (Number(kaynak.kaleSeviye) || 1) : 0,
          gorulme: (bk && uk === bk)
            ? Date.now()
            : (Number((hesaplar[uk] || {}).lastSeen) || 0)
        };
      });
      if (bitince) bitince();
    }).catch(function (e) {
      console.warn("[ittifak] güç okunamadı:", e);
      _gucBilgi = null;
      _uyeBilgi = {};
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
        "padding:calc(8px + env(safe-area-inset-top)) 11px calc(8px + env(safe-area-inset-bottom));}" +
      "#panel-ittifak .it-govde{box-sizing:border-box;}" +
      /* Panel zemini referanstaki doygun maviye çekilir. tema.js
         `.overlay-card` arka planını !important ile veriyor, bu
         yüzden burada da !important şart — yoksa kural sessizce
         yutulur ve panel eski lacivertte kalır. */
      "#panel-ittifak .overlay-card{background:" +
        "linear-gradient(180deg,#2f8fe4 0%,#1a6ecd 46%,#1057b6 100%) !important;" +
        "border:0 !important;}" +

      /* BAŞLIK SOLA YASLI. h2 flex:1 ile tüm satırı kaplayınca yazı
         bir şeridin üstünde duruyormuş gibi görünüyordu; artık kendi
         genişliği kadar yer kaplıyor ve oka yapışık duruyor. Sağdaki
         düğmeyi `margin-left:auto` iter, araya boşluk konmaz. */
      ".it-bas{display:flex;align-items:center;gap:4px;margin-bottom:6px;flex:0 0 auto;}" +
      /* Geri oku: referanstaki kalın açık mavi ok. Kutusu yok,
         simgenin kendisi düğmedir; dokunma alanı 40px'te tutuldu. */
      "#panel-ittifak .it-geri{flex:0 0 34px;width:34px;height:34px;border:0;padding:0;" +
        "margin-left:-4px;" +
        "background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;}" +
      "#panel-ittifak .it-geri svg{width:27px;height:27px;fill:#8ddcff;" +
        "filter:drop-shadow(0 2px 3px rgba(0,25,60,.55));}" +
      "#panel-ittifak .it-geri:active svg{fill:#c4edff;transform:scale(.92);}" +
      "#panel-ittifak .it-bas h2{flex:0 1 auto;min-width:0;margin:0;text-align:left;" +
        "padding:0;font-family:'Baloo 2',sans-serif;font-weight:900;font-size:19px;" +
        "line-height:1.2;color:#fff;text-shadow:0 2px 4px rgba(0,25,60,.55);" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".it-bas-sag{flex:0 0 auto;margin-left:auto;display:flex;align-items:center;}" +
      ".it-bas-bilgi{width:27px;height:27px;border:0;cursor:pointer;border-radius:8px;" +
        "background:linear-gradient(180deg,#5cb8ef,#2f7fd0);color:#fff;" +
        "font-family:'Baloo 2',sans-serif;font-weight:900;font-size:15px;line-height:1;" +
        "padding:0;box-shadow:0 2px 4px rgba(0,25,60,.35);}" +
      "#panel-ittifak .overlay-close{display:none !important;}" +

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

      /* ═══ KÜNYE — referans düzeni ════════════════════════════
         Ölçüler dar telefona göre: 360 px genişlikte 2 sütunluk
         ızgara ve 5 satırlık künye taşmadan sığar. Yazı boyları
         punto punto denendi; küçültmeden önce ızgaranın sığdığını
         doğrula. */
      /* IZGARAYI KALAN YERE YAYMAYI DENEDİK, GERİ ALINDI.
         Düğmeleri ekran boyuna göre esnetince uzun ekranda kocaman,
         kısa ekranda cılız oluyorlardı — kutucukların boyu sabit
         kalmalı. Ekrana sığdırma işi artık ÇERÇEVEDEN alınıyor:
         panel kenar boşluğu, başlık şeridi ve künye biraz daraldı,
         kutucuklar kendi boyunda kaldı. */
      ".ik-kunye{display:flex;align-items:flex-start;gap:9px;margin-bottom:8px;}" +
      /* Flama referanstaki turuncu arma: alt ucu çentikli kalkan. */
      ".ik-flama{flex:0 0 72px;width:72px;height:84px;display:flex;" +
        "align-items:center;justify-content:center;" +
        "background:linear-gradient(180deg,#ffb03a,#f2681b 62%,#d8430c);" +
        "clip-path:polygon(0 0,100% 0,100% 74%,50% 100%,0 74%);" +
        "filter:drop-shadow(0 3px 5px rgba(0,25,60,.45));}" +
      ".ik-flama span{font-family:'Baloo 2',sans-serif;font-weight:900;font-size:18px;" +
        "color:#fff;text-shadow:0 2px 3px rgba(120,40,0,.75);padding-bottom:14px;" +
        "max-width:68px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".ik-sag{flex:1 1 auto;min-width:0;}" +
      ".ik-ad{font-family:'Baloo 2',sans-serif;font-weight:900;font-size:15px;" +
        "color:#fff;text-shadow:0 2px 3px rgba(0,25,60,.7);margin-bottom:4px;" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      /* Künye kutusu: zeminden biraz koyu, satırlar ince çizgiyle
         ayrık (referanstaki iç panel). */
      ".ik-bilgi{border-radius:11px;padding:2px 9px;" +
        "background:rgba(6,45,105,.42);box-shadow:inset 0 0 0 1px rgba(150,205,255,.22);}" +
      ".ik-satir{display:flex;align-items:center;gap:6px;padding:2.5px 0;font-size:11.5px;" +
        "border-top:1px solid rgba(150,205,255,.16);}" +
      ".ik-satir:first-child{border-top:0;}" +
      ".ik-ikon{flex:0 0 auto;font-size:12px;}" +
      ".ik-etiket{flex:0 0 auto;color:#d6ecff;font-weight:700;" +
        "text-shadow:0 1px 2px rgba(0,25,60,.55);}" +
      ".ik-deger{flex:1 1 auto;min-width:0;text-align:right;color:#fff;font-weight:800;" +
        "font-variant-numeric:tabular-nums;text-shadow:0 1px 2px rgba(0,25,60,.55);" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".ik-bekle{opacity:.55;}" +

      /* Seviye çubuğu: rozet çubuğun sol ucuna BİNER, o yüzden
         sarmal position:relative ve çubuk soldan boşluklu. */
      ".ik-sv{position:relative;display:flex;align-items:center;margin-bottom:8px;" +
        "padding-left:5px;}" +
      ".ik-svno{position:absolute;left:0;top:50%;transform:translateY(-50%);z-index:2;" +
        "width:28px;height:28px;border-radius:50%;display:flex;align-items:center;" +
        "justify-content:center;background:linear-gradient(180deg,#4aa6ee,#1f6bc4);" +
        "box-shadow:0 0 0 3px #9fdcff,0 2px 4px rgba(0,25,60,.5);color:#fff;" +
        "font-family:'Baloo 2',sans-serif;font-weight:900;font-size:14px;}" +
      ".ik-cubuk{flex:1 1 auto;position:relative;height:20px;border-radius:10px;" +
        "margin-left:20px;background:#0c3f86;overflow:hidden;" +
        "box-shadow:inset 0 2px 4px rgba(0,15,45,.55);}" +
      ".ik-dolu{height:100%;background:linear-gradient(180deg,#8bef52,#38b02c);}" +
      ".ik-svyazi{position:absolute;inset:0;display:flex;align-items:center;" +
        "justify-content:center;font-family:'Baloo 2',sans-serif;font-weight:800;" +
        "font-size:12px;color:#fff;font-variant-numeric:tabular-nums;" +
        "text-shadow:0 1px 2px rgba(0,25,60,.85);}" +

      /* Duyuru: açık kutu, düzenleme düğmesi sağ ALT köşede.
         (Eski "sadece R4 düzenler" ipucu satırı kalktı — referansta
         yok ve kutuyu iki katına çıkarıyordu.) */
      ".ik-duyuru{position:relative;padding:10px 42px 10px 12px;border-radius:12px;" +
        "margin-bottom:8px;min-height:52px;" +
        "background:linear-gradient(180deg,#f7faff,#dde6f2);" +
        "box-shadow:0 2px 6px rgba(0,25,60,.3);}" +
      ".ik-duyuru-metin{font-family:'Baloo 2',sans-serif;font-weight:700;font-size:13.5px;" +
        "color:#22304a;line-height:1.45;white-space:pre-wrap;word-break:break-word;}" +
      ".ik-solgun{color:#7b89a1;}" +
      ".ik-duzen{position:absolute;right:9px;bottom:9px;width:30px;height:30px;border:0;" +
        "cursor:pointer;border-radius:8px;color:#fff;font-size:15px;font-weight:900;" +
        "line-height:1;padding:0;background:linear-gradient(180deg,#4fb0ec,#2277cd);" +
        "box-shadow:0 2px 4px rgba(0,25,60,.35);}" +

      /* ═══ IZGARA — referanstaki açık mavi haplar ══════════════
         Simge SOLDA kendi açık şeridinde, yazı kalan alanda
         ORTALANIR. Şerit ayrı bir öğe değil: ::before ile çizilen
         eğik bir dilim, böylece düğme tek kutu kalır. */
      ".ik-izgara{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;}" +
      /* 3B ALT KENAR YOK. Buraya bir zamanlar "0 3px 0" sert gölge
         konmuştu (düğmeye kalınlık veren kabartma); istenmedi.
         Yalnız yumuşak bir düşüm gölgesi kaldı. */
      ".ik-dugme{position:relative;display:flex;align-items:center;gap:6px;border:0;" +
        "cursor:pointer;border-radius:14px;padding:0 10px 0 0;height:58px;min-width:0;" +
        "overflow:hidden;background:linear-gradient(180deg,#63c7f6,#3695e2);" +
        "box-shadow:0 2px 5px rgba(0,25,60,.22);}" +
      ".ik-dugme::before{content:'';position:absolute;left:0;top:0;bottom:0;width:74px;" +
        "background:linear-gradient(180deg,#8fdcff,#5ab4ef);" +
        "clip-path:polygon(0 0,100% 0,78% 100%,0 100%);}" +
      ".ik-dugme:active{filter:brightness(.93);}" +
      ".ik-dikon{position:relative;z-index:1;flex:0 0 58px;text-align:center;font-size:25px;" +
        "line-height:1;filter:drop-shadow(0 2px 3px rgba(0,25,60,.45));}" +
      ".ik-dad{position:relative;z-index:1;flex:1 1 auto;min-width:0;text-align:center;" +
        "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:13.5px;color:#fff;" +
        "line-height:1.1;text-shadow:0 2px 3px rgba(0,30,70,.6);}" +

      /* ═══ ALT BAR — Üyeler / Zafer / Ayarlar ══════════════════ */
      ".ik-altbar{display:flex;gap:10px;justify-content:center;padding-top:2px;}" +
      ".ik-alt{flex:0 1 110px;min-width:0;display:flex;flex-direction:column;" +
        "align-items:center;gap:3px;border:0;cursor:pointer;background:none;padding:4px 2px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:12.5px;color:#fff;" +
        "text-shadow:0 2px 3px rgba(0,25,60,.6);}" +
      ".ik-alt span{width:40px;height:40px;border-radius:50%;display:flex;" +
        "align-items:center;justify-content:center;font-size:21px;" +
        "background:linear-gradient(180deg,#8fdcff,#3695e2);" +
        "box-shadow:0 2px 5px rgba(0,25,60,.22);}" +
      ".ik-alt:active span{filter:brightness(.93);}" +

      /* KISA EKRAN EMNİYETİ. Ölçüler ~680 px'lik içerik alanına göre
         oturtuldu (Android'de tarayıcı çubukları düşünce kalan yer
         bu). Daha kısa ekranlarda kaydırma çıkmasın diye çerçeve bir
         tık daha daralır — kutucuklar burada da neredeyse aynı
         kalır, kısılan yer künye ve duyuru. */
      "@media (max-height:660px){" +
        ".ik-flama{width:64px;height:74px;}" +
        ".ik-flama span{font-size:16px;padding-bottom:12px;}" +
        ".ik-satir{padding:1.5px 0;}" +
        ".ik-duyuru{min-height:38px;padding-top:9px;padding-bottom:9px;}" +
        ".ik-dugme{height:53px;}" +
        ".ik-alt span{width:36px;height:36px;font-size:19px;}" +
      "}" +

      /* ═══ ÜYELER ═════════════════════════════════════════════ */
      ".iu-ara{display:flex;gap:7px;align-items:center;margin-bottom:8px;}" +
      ".iu-giris{flex:1 1 auto;min-width:0;box-sizing:border-box;border:0;border-radius:11px;" +
        "padding:10px 12px;font-family:'Baloo 2',sans-serif;font-weight:700;font-size:13px;" +
        "color:#eaf4ff;background:rgba(6,45,105,.45);" +
        "box-shadow:inset 0 0 0 1px rgba(150,205,255,.3);}" +
      ".iu-giris::placeholder{color:#a9cdee;}" +
      ".iu-ara-btn{flex:0 0 40px;width:40px;height:40px;border:0;cursor:pointer;" +
        "border-radius:11px;font-size:16px;padding:0;" +
        "background:linear-gradient(180deg,#63c7f6,#3695e2);" +
        "box-shadow:0 2px 4px rgba(0,25,60,.35);}" +
      ".iu-cevrimici{align-self:center;margin:0 auto 9px;padding:5px 18px;border-radius:13px;" +
        "background:rgba(6,45,105,.45);font-family:'Baloo 2',sans-serif;font-weight:800;" +
        "font-size:12.5px;color:#eaf4ff;text-shadow:0 1px 2px rgba(0,25,60,.55);" +
        "width:max-content;}" +
      /* Grup başlığı: dokunulunca grup katlanır. */
      ".iu-grup{display:flex;align-items:center;gap:8px;cursor:pointer;" +
        "padding:7px 11px;border-radius:11px;margin:9px 0 7px;" +
        "background:linear-gradient(180deg,#2e7fd4,#1a5cb0);" +
        "box-shadow:0 2px 5px rgba(0,25,60,.3);}" +
      ".iu-grup b{flex:1 1 auto;min-width:0;font-family:'Baloo 2',sans-serif;" +
        "font-weight:800;font-size:13px;color:#fff;" +
        "text-shadow:0 1px 2px rgba(0,25,60,.55);" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".iu-rozet{flex:0 0 auto;padding:1px 8px;border-radius:7px;" +
        "background:linear-gradient(180deg,#ffb03a,#ef7b16);color:#fff;" +
        "font-family:'Baloo 2',sans-serif;font-weight:900;font-size:11px;" +
        "font-style:normal;text-shadow:0 1px 2px rgba(120,50,0,.6);}" +
      ".iu-say{flex:0 0 auto;font-family:'Baloo 2',sans-serif;font-weight:800;" +
        "font-size:11.5px;color:#cfe6ff;}" +
      ".iu-ok{flex:0 0 auto;font-size:15px;color:#cfe6ff;line-height:1;" +
        "transform:translateY(-2px);transition:transform .15s ease;}" +
      ".iu-ok.kapali{transform:rotate(-90deg);}" +
      ".iu-izgara{display:grid;grid-template-columns:1fr 1fr;gap:7px;}" +
      ".iu-izgara.tek{grid-template-columns:1fr;}" +
      /* Üye kutucuğu: solda yüz + altında son görülme, sağda ad ve
         iki istatistik. Lider kartı altın çerçeveli. */
      ".iu-kart{display:flex;align-items:center;gap:7px;padding:6px;border-radius:11px;" +
        "min-width:0;background:linear-gradient(180deg,#6fcdf7,#3b9ae4);" +
        "box-shadow:0 2px 5px rgba(0,25,60,.3);}" +
      ".iu-izgara.iu-lider .iu-kart{background:linear-gradient(180deg,#fff6de,#ffe3a6);" +
        "box-shadow:0 0 0 3px #f5a623,0 2px 6px rgba(0,25,60,.35);}" +
      ".iu-izgara.iu-lider .iu-ad{color:#3a2a06;text-shadow:none;}" +
      ".iu-izgara.iu-lider .iu-stat{color:#6a5216;}" +
      ".iu-kart.ben{box-shadow:0 0 0 2px #b9ef76,0 2px 5px rgba(0,25,60,.3);}" +
      ".iu-avatar{flex:0 0 42px;width:42px;text-align:center;}" +
      ".iu-yuz{display:flex;align-items:center;justify-content:center;width:42px;height:42px;" +
        "border-radius:9px;font-size:21px;background:rgba(8,50,110,.35);" +
        "box-shadow:inset 0 0 0 1px rgba(255,255,255,.3);}" +
      ".iu-durum{display:block;margin-top:2px;font-family:'Baloo 2',sans-serif;" +
        "font-weight:800;font-size:8.5px;color:#0f3a72;line-height:1.1;" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".iu-durum.iu-yesil{color:#1c7a1c;}" +
      ".iu-orta{flex:1 1 auto;min-width:0;}" +
      ".iu-ad{font-family:'Baloo 2',sans-serif;font-weight:900;font-size:13px;color:#fff;" +
        "text-shadow:0 1px 2px rgba(0,25,60,.5);" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".iu-stat{display:flex;flex-wrap:wrap;gap:2px 8px;margin-top:2px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:10.5px;color:#eaf6ff;" +
        "font-variant-numeric:tabular-nums;}" +
      ".iu-islem{flex:0 0 auto;display:flex;flex-direction:column;gap:3px;}" +
      ".iu-min{width:23px;height:20px;border:0;cursor:pointer;border-radius:6px;" +
        "font-size:11px;font-weight:900;line-height:1;padding:0;color:#fff;" +
        "background:linear-gradient(180deg,#2f7fd0,#1b5399);}" +
      ".iu-min.iu-kirmizi{background:linear-gradient(180deg,#e85a5a,#b02b2b);}" +
      ".iu-min.iu-yesilds{background:linear-gradient(180deg,#57c94f,#2e9a37);}" +
      ".iu-bos{padding:10px;text-align:center;font-family:'Baloo 2',sans-serif;" +
        "font-weight:700;font-size:11.5px;color:#bcdcfb;" +
        "text-shadow:0 1px 2px rgba(0,25,60,.5);}" +

      /* ═══ YÖNET — hap düğmeler ═══════════════════════════════ */
      ".iz-izgara{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;}" +
      ".iz-cikis{margin-top:14px;}" +
      ".iz-hap{display:flex;align-items:center;gap:6px;border:0;cursor:pointer;" +
        "border-radius:999px;padding:0 12px 0 6px;height:52px;min-width:0;" +
        "background:linear-gradient(180deg,#6fcdf7,#3b9ae4);" +
        "box-shadow:0 2px 5px rgba(0,25,60,.22);}" +
      ".iz-hap:active{filter:brightness(.93);}" +
      ".iz-ikon{flex:0 0 38px;width:38px;height:38px;border-radius:50%;display:flex;" +
        "align-items:center;justify-content:center;font-size:19px;" +
        "background:rgba(255,255,255,.26);}" +
      ".iz-ad{flex:1 1 auto;min-width:0;text-align:center;font-family:'Baloo 2',sans-serif;" +
        "font-weight:800;font-size:13px;color:#fff;line-height:1.1;" +
        "text-shadow:0 2px 3px rgba(0,30,70,.55);}" +
      /* Sönük ikili: referansta da açılmamış. Dokunulamaz ve öyle
         GÖRÜNÜR — çalışır gibi durup hiçbir şey yapmasın diye. */
      ".iz-hap.sonuk{background:linear-gradient(180deg,#8ba3ba,#61798f);cursor:default;}" +
      ".iz-hap.sonuk .iz-ad{color:#e6eef6;opacity:.75;}" +
      ".iz-hap.sonuk:active{filter:none;}" +
      ".iz-hap.iz-turuncu{background:linear-gradient(180deg,#ff9b34,#f05c0c);}" +

      /* ═══ SAVAŞ · SANDIKLAR · MAĞAZA — ORTAK ═════════════════
         Üç ekran da künyeyle aynı sarmalı kullanır: gövde kayar,
         alt düğme (Oto-Katıl / Tümünü Al / sekme çubuğu) dipte
         durur. `.iy-govde` min-height:0 OLMADAN flex sütununda
         kaymaz — liste uzayınca alt düğme ekrandan taşardı. */
      ".iy-sarmal{display:flex;flex-direction:column;min-height:0;}" +
      "#panel-ittifak .it-govde > .iy-sarmal{flex:1 1 auto;}" +
      ".iy-sarmal > *{flex:0 0 auto;}" +
      ".iy-govde{flex:1 1 auto !important;min-height:0;overflow-y:auto;" +
        "padding:2px 1px;}" +
      ".iy-sekmeler{display:flex;gap:5px;margin-bottom:8px;}" +
      ".iy-sekme{position:relative;flex:1 1 0;min-width:0;border:0;cursor:pointer;" +
        "border-radius:11px;padding:9px 4px;font-family:'Baloo 2',sans-serif;" +
        "font-weight:800;font-size:12px;line-height:1;color:#dff0ff;" +
        "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" +
        "background:linear-gradient(180deg,#3d7ccc,#22488f);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".iy-sekme.secili{background:linear-gradient(180deg,#f4f8ff,#d7e7fb);" +
        "color:#123a70;text-shadow:none;}" +
      ".iy-sekme:active{filter:brightness(.93);}" +
      /* Boş durum: referanstaki gibi solgun arma + tek satır. */
      ".iy-bos{display:flex;flex-direction:column;align-items:center;" +
        "justify-content:center;gap:10px;padding:48px 12px;text-align:center;}" +
      ".iy-bos-ikon{width:76px;height:76px;object-fit:contain;opacity:.22;}" +
      ".iy-bos span{font-family:'Baloo 2',sans-serif;font-weight:700;" +
        "font-size:13px;color:#cfe4ff;text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".iy-altbilgi{font-size:10.5px;font-weight:700;color:#cfe4ff;" +
        "text-align:center;line-height:1.3;padding:6px 4px 5px;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      /* Dipteki geniş düğme: Oto-Katıl ve Tümünü Al ortak. */
      ".iy-oto{position:relative;display:block;width:100%;border:0;cursor:pointer;" +
        "border-radius:12px;padding:11px 8px;font-family:'Baloo 2',sans-serif;" +
        "font-weight:900;font-size:14px;color:#eaf4ff;" +
        "background:linear-gradient(180deg,#4f9fe0,#2c68ad);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".iy-oto.acik{background:linear-gradient(180deg,#57c94f,#2e9a37);" +
        "text-shadow:0 1px 2px rgba(0,40,10,.45);}" +
      ".iy-oto.sonuk{background:linear-gradient(180deg,#b9c4d2,#8d9aab);}" +
      ".iy-oto:active{filter:brightness(.93);}" +
      ".iy-nokta{position:absolute;top:6px;right:8px;width:9px;height:9px;" +
        "border-radius:50%;background:#e8342d;box-shadow:0 0 0 2px rgba(255,255,255,.55);}" +

      /* ═══ KÜNYE IZGARASINDAKİ ROZET ══════════════════════════ */
      ".ik-dugme{position:relative;}" +
      ".ik-rozet,.is-rozet{position:absolute;top:-5px;right:-4px;min-width:17px;" +
        "height:17px;padding:0 4px;border-radius:9px;background:#e8342d;color:#fff;" +
        "font-family:'Baloo 2',sans-serif;font-weight:900;font-size:10px;" +
        "font-style:normal;line-height:17px;text-align:center;" +
        "box-shadow:0 0 0 2px rgba(255,255,255,.5);}" +
      ".is-sekmeler .iy-sekme{overflow:visible;}" +
      ".is-rozet{top:-6px;right:2px;}" +

      /* ═══ JETON — İTTİFAK PARA BİRİMİ ════════════════════════
         Simge tek yerde: satırda, kesede ve fiyat düğmesinde aynı
         daire çizilir, üç ayrı görünüm ayrışmasın. */
      /* Jetonun ARKASINDAKİ KAP KALKTI (maviye boyalı daireydi) —
         paranın kendisi çiziliyor ve o kap kadar büyük. */
      ".it-jeton{display:inline-block;width:18px;height:18px;margin-right:4px;" +
        "vertical-align:-4px;background:url('" + JETON_SVG + "') center/contain no-repeat;}" +
      /* Fiyat düğmesi dar; orada bir tık küçük durur. */
      ".im-fiyat .it-jeton{width:15px;height:15px;margin-right:3px;vertical-align:-3px;}" +
      ".it-jeton-sayi{font-family:'Baloo 2',sans-serif;font-weight:900;" +
        "font-size:13px;color:#fff;text-shadow:0 1px 2px rgba(0,20,45,.6);}" +

      /* ═══ SANDIKLAR ══════════════════════════════════════════ */
      ".is-tepe{padding:8px 10px 10px;border-radius:14px;margin-bottom:8px;" +
        "background:linear-gradient(180deg,#5db4ec,#2a74c4);" +
        "box-shadow:0 2px 8px rgba(0,20,45,.35);text-align:center;}" +
      ".is-sandik{width:84px;height:84px;object-fit:contain;display:block;" +
        "margin:0 auto 6px;filter:drop-shadow(0 3px 5px rgba(0,20,45,.45));}" +
      ".is-cubuk-satir{display:flex;align-items:center;gap:6px;}" +
      ".is-anahtar{flex:0 0 auto;font-size:15px;" +
        "filter:drop-shadow(0 1px 2px rgba(0,20,45,.5));}" +
      ".is-cubuk{flex:1 1 auto;position:relative;height:17px;border-radius:9px;" +
        "background:rgba(0,20,45,.42);overflow:hidden;}" +
      ".is-dolu{height:100%;background:linear-gradient(180deg,#8ff06a,#3aa83a);}" +
      ".is-cubuk span{position:absolute;inset:0;display:flex;align-items:center;" +
        "justify-content:center;font-family:'Baloo 2',sans-serif;font-weight:800;" +
        "font-size:11px;color:#fff;text-shadow:0 1px 2px rgba(0,20,45,.85);}" +
      ".is-bilgi{flex:0 0 22px;width:22px;height:22px;border:0;cursor:pointer;" +
        "border-radius:50%;background:#1d4f92;color:#fff;font-weight:900;" +
        "font-size:13px;line-height:1;padding:0;}" +
      ".is-serit{display:flex;align-items:center;gap:8px;padding:8px 9px;" +
        "border-radius:11px;margin-bottom:8px;" +
        "background:linear-gradient(180deg,#2e73bd,#1d4f92);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".is-serit span{flex:1 1 auto;min-width:0;font-family:'Baloo 2',sans-serif;" +
        "font-weight:800;font-size:11.5px;color:#eaf4ff;line-height:1.25;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".is-git{flex:0 0 auto;border:0;cursor:pointer;border-radius:9px;" +
        "padding:7px 14px;font-family:'Baloo 2',sans-serif;font-weight:800;" +
        "font-size:12px;color:#123a70;" +
        "background:linear-gradient(180deg,#bfe6ff,#7fc4f0);}" +
      ".is-satir{display:flex;align-items:center;gap:8px;padding:7px 8px;" +
        "border-radius:12px;margin-bottom:7px;" +
        "background:linear-gradient(180deg,#fbfdff,#e6eef8);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".is-satir.alindi{opacity:.62;}" +
      ".is-ikon{flex:0 0 46px;width:46px;text-align:center;}" +
      ".is-ikon img{width:38px;height:38px;object-fit:contain;display:block;margin:0 auto;}" +
      ".is-saat{display:block;font-family:'Baloo 2',sans-serif;font-weight:800;" +
        "font-size:9.5px;color:#3d4a63;font-variant-numeric:tabular-nums;}" +
      ".is-odul{flex:0 0 auto;display:flex;align-items:center;" +
        "font-family:'Baloo 2',sans-serif;font-weight:900;font-size:12.5px;" +
        "color:#14203a;}" +
      ".is-sinir{text-align:center;font-family:'Baloo 2',sans-serif;font-weight:800;" +
        "font-size:11.5px;color:#cfe4ff;padding:7px 4px 6px;" +
        "border-top:1px solid rgba(190,225,255,.28);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".is-isimsiz{display:flex;align-items:center;gap:7px;padding:8px 4px 7px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:700;font-size:11.5px;" +
        "color:#cfe4ff;cursor:pointer;text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".is-isimsiz input{width:17px;height:17px;accent-color:#3aa83a;cursor:pointer;}" +

      /* ═══ İTTİFAK MAĞAZASI ═══════════════════════════════════ */
      ".im-bas{display:flex;align-items:center;gap:8px;margin-bottom:8px;}" +
      ".im-bas > span{flex:1 1 auto;min-width:0;font-family:'Baloo 2',sans-serif;" +
        "font-weight:900;font-size:15px;color:#eaf4ff;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".im-kese{flex:0 0 auto;display:flex;align-items:center;padding:4px 10px;" +
        "border-radius:13px;background:linear-gradient(180deg,#2e73bd,#1d4f92);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".im-yenilenme{text-align:center;font-family:'Baloo 2',sans-serif;" +
        "font-weight:800;font-size:12px;color:#eaf4ff;margin-bottom:8px;" +
        "padding:5px 4px;border-radius:9px;background:rgba(13,45,90,.42);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);}" +
      ".im-yenilenme b{color:#ffd257;font-variant-numeric:tabular-nums;}" +
      ".im-izgara{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}" +
      ".im-kart{position:relative;display:flex;flex-direction:column;" +
        "align-items:center;gap:3px;padding:8px 5px 0;border-radius:13px;" +
        "overflow:hidden;background:linear-gradient(180deg,#fbfdff,#dbe7f6);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".im-kart.bitti{filter:saturate(.25) brightness(.94);}" +
      ".im-indirim{position:absolute;top:3px;left:3px;z-index:2;padding:1px 6px;" +
        "border-radius:8px;background:linear-gradient(180deg,#57c94f,#2e9a37);" +
        "color:#fff;font-family:'Baloo 2',sans-serif;font-weight:900;" +
        "font-size:9.5px;font-style:normal;" +
        "text-shadow:0 1px 2px rgba(0,40,10,.5);}" +
      ".im-kutu{position:relative;width:64%;aspect-ratio:1/1;display:flex;" +
        "align-items:center;justify-content:center;}" +
      ".im-gorsel{max-width:100%;max-height:100%;object-fit:contain;" +
        "filter:drop-shadow(0 2px 3px rgba(0,20,45,.35));}" +
      ".im-emoji{font-size:26px;line-height:1;}" +
      ".im-adet{position:absolute;right:0;bottom:0;padding:0 5px;border-radius:6px;" +
        "background:rgba(10,30,60,.72);color:#fff;font-family:'Baloo 2',sans-serif;" +
        "font-weight:800;font-size:10px;font-style:normal;}" +
      ".im-kalan{font-family:'Baloo 2',sans-serif;font-weight:800;font-size:11px;" +
        "color:#25334d;}" +
      ".im-fiyat{width:100%;margin-top:2px;border:0;cursor:pointer;" +
        "display:flex;align-items:center;justify-content:center;" +
        "padding:6px 2px;font-family:'Baloo 2',sans-serif;font-weight:900;" +
        "font-size:12px;color:#fff;background:linear-gradient(180deg,#1a3a75,#0e2246);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.7);}" +
      ".im-fiyat:active{filter:brightness(.92);}" +
      ".im-fiyat.kapali{background:linear-gradient(180deg,#8d9aab,#68748a);" +
        "cursor:not-allowed;}" +
      /* Kilitli grup: kartlar KALIR, üstüne kırmızı örtü biner —
         oyuncu neyin kilitli olduğunu görsün (referans düzeni). */
      ".im-kilitli{position:relative;margin-top:9px;border-radius:13px;" +
        "overflow:hidden;}" +
      ".im-kilitli .im-izgara{opacity:.5;}" +
      ".im-kilitli::after{content:'';position:absolute;inset:0;" +
        "background:rgba(214,36,92,.42);pointer-events:none;}" +
      ".im-kilit-yazi{position:absolute;inset:0;z-index:2;display:flex;" +
        "align-items:center;justify-content:center;text-align:center;padding:0 10px;" +
        "font-family:'Baloo 2',sans-serif;font-weight:900;font-size:12.5px;" +
        "color:#fff;text-shadow:0 2px 4px rgba(90,0,30,.85);pointer-events:none;}" +
      ".im-altsekme{display:flex;gap:6px;padding-top:7px;}" +
      ".im-altsekme button{flex:1 1 0;border:0;cursor:pointer;border-radius:11px;" +
        "padding:10px 4px;font-family:'Baloo 2',sans-serif;font-weight:800;" +
        "font-size:13px;color:#dff0ff;" +
        "background:linear-gradient(180deg,#3d7ccc,#22488f);" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);}" +
      ".im-altsekme button.secili{background:linear-gradient(180deg,#f4f8ff,#d7e7fb);" +
        "color:#123a70;text-shadow:none;}";
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
    /* BAŞLIK TEK YERDE. Eskiden her alt ekran kendi geri-başlık
       satırını gövdenin İÇİNE çiziyordu; referansta başlık panelin
       tepesinde durur ve yalnız yazısı değişir. İki ayrı başlık
       çizmek satırı da iki kez kaydırıyordu. */
    panel.innerHTML =
      '<div class="overlay-card">' +
        '<div class="it-bas">' +
          '<button class="it-geri" id="itBasGeri" aria-label="Geri">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true">' +
              '<path d="M12.6 3.6 3.1 11.2a1 1 0 0 0 0 1.6l9.5 7.6c.7.5 1.7 0 1.7-.8v-3.9h5.3c.8 0 1.4-.6 1.4-1.4V9.7c0-.8-.6-1.4-1.4-1.4h-5.3V4.4c0-.8-1-1.3-1.7-.8Z"/>' +
            "</svg></button>" +
          '<h2 id="itBasAd">İttifak</h2>' +
          '<div class="it-bas-sag" id="itBasSag"></div>' +
        "</div>" +
        '<div class="it-sekmeler" id="itSekmeler"></div>' +
        '<div class="it-govde" id="itGovde"></div>' +
      "</div>";
    kap.appendChild(panel);

    panel.addEventListener("click", function (e) {
      if (e.target === panel || (e.target.closest && e.target.closest("[data-close]"))) { kapat(); return; }
      if (e.target.closest && e.target.closest("#itBasGeri")) { geriGit(); return; }
      if (e.target.closest && e.target.closest("#itBasBilgi")) {
        uyar("İttifak seviyesi ücretli paket alımlarıyla yükselir; " +
             "elmas harcaması da düşük oranda katkı verir. Seviye, " +
             "İttifak Mağazası'ndaki kilitli satırları açar.");
      }
    });
    document.getElementById("itGovde").addEventListener("click", govdeDokunus);
  }

  /* Görünüm → başlık yazısı. Üye değilken tek başlık vardır. */
  var BASLIK = {
    ana: "İttifak", uyeler: "İttifak Üyeleri", ayarlar: "Yönet",
    savas: "Savaş", sandik: "Sandıklar", magaza: "Mağaza"
  };

  function basligiCiz() {
    var ad = document.getElementById("itBasAd");
    var sag = document.getElementById("itBasSag");
    if (!ad || !sag) return;
    var g = _benim ? _gorunum : "ana";
    ad.textContent = _benim ? (BASLIK[g] || "İttifak") : "İttifak";

    /* Sağ köşe: mağazada jeton kesesi, başka yerde bilgi düğmesi.
       Referansta künyede "!" durur, mağazada bakiye. */
    if (_benim && (g === "magaza" || g === "sandik")) {
      /* Sandıklar'da da durur: toplanan jetonlar oraya uçuyor,
         varacağı yer görünmezse uçuş anlamsız kalırdı. */
      sag.innerHTML = '<div class="im-kese">' + jetonRozetiHTML() + "</div>";
    } else if (_benim && g === "ana") {
      sag.innerHTML = '<button class="it-bas-bilgi" id="itBasBilgi">!</button>';
    } else {
      sag.innerHTML = "";
    }
  }

  /* Geri oku: alt ekrandaysa künyeye, künyedeyse paneli kapatır.
     Referansta da ✕ yoktur, çıkış aynı oktan olur. */
  function geriGit() {
    if (_benim && _gorunum !== "ana") {
      _gorunum = "ana";
      sayacDurdur();
      govdeCiz();
      return;
    }
    kapat();
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
    basligiCiz();
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

    isimsizBagla();
    uyeAramaBagla();

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
    if (_gorunum === "savas")   return savasEkraniHTML();
    if (_gorunum === "sandik")  return sandikEkraniHTML();
    if (_gorunum === "magaza")  return magazaEkraniHTML();
    return anaEkranHTML();
  }

  /* ── GÖRÜNÜM 1: ANA KÜNYE ─────────────────────────────────── */
  function anaEkranHTML() {
    var it = _benim;
    var sayi = uyeSayisi(it);

    /* Künye satırı: küçük beyaz simge + etiket solda, değer sağda.
       Simgeler emoji — oyunun kendi künye ikonları yok. */
    function bilgi(ikon, etiket, deger) {
      return '<div class="ik-satir">' +
               '<span class="ik-ikon">' + ikon + "</span>" +
               '<span class="ik-etiket">' + etiket + ":</span>" +
               '<span class="ik-deger">' + deger + "</span>" +
             "</div>";
    }
    /* Güç ve sıra ayrı bir okumadan gelir; gelene kadar "…" durur.
       Sıfır yazmak yanlış olurdu — 0 güç gerçek bir değer. */
    var gucYazi  = _gucBilgi ? sayiBicim(_gucBilgi.guc) : '<span class="ik-bekle">…</span>';
    var siraYazi = _gucBilgi ? String(_gucBilgi.sira)   : '<span class="ik-bekle">…</span>';

    var sv = seviyeBilgi(sayac().tec);
    var svYazi = (sv.ust > sv.alt)
      ? (sayiBicim(sayac().tec - sv.alt) + "/" + sayiBicim(sv.ust - sv.alt))
      : "MAKS";

    var h = '<div class="ik-sarmal">' +
      '<div class="ik-kunye">' +
        '<div class="ik-flama"><span>' + kacar(it.etiket) + "</span></div>" +
        '<div class="ik-sag">' +
          '<div class="ik-ad">[' + kacar(it.etiket) + "]" + kacar(it.ad) + "</div>" +
          '<div class="ik-bilgi">' +
            bilgi("🛡️", "İttifak Lideri", kacar(it.kurucu || "—")) +
            bilgi("✊", "Güç", gucYazi) +
            bilgi("🏆", "Sıra", siraYazi) +
            bilgi("👤", "Üyeler", sayi + "/" + UYE_SINIRI) +
            bilgi("💬", "Dil", kacar(it.dil || "Tüm diller")) +
          "</div>" +
        "</div>" +
      "</div>";

    /* Seviye çubuğu: rozet çubuğun SOL UCUNA BİNER (referans düzeni),
       o yüzden çubuk kendi kapsayıcısında ve rozet mutlak konumlu. */
    h += '<div class="ik-sv">' +
      '<div class="ik-svno">' + sv.sv + "</div>" +
      '<div class="ik-cubuk"><div class="ik-dolu" style="width:' +
        (sv.oran * 100).toFixed(2) + '%"></div>' +
        '<span class="ik-svyazi">' + svYazi + "</span></div>" +
    "</div>";

    var duyuru = String(it.manifesto || "").trim();
    h += '<div class="ik-duyuru">' +
      '<div class="ik-duyuru-metin' + (duyuru ? "" : " ik-solgun") + '">' +
        (duyuru ? kacar(duyuru) : "İttifak henüz hiçbir duyuru yayınlamadı.") +
      "</div>" +
      '<button class="ik-duzen" data-yakinda="Duyuru düzenleme">⇄</button>' +
    "</div>";

    /* Üçüncü alan doluysa düğme O GÖRÜNÜMÜ açar; boşsa "Yakında"
       der. Sıradaki sistem geldiğinde yalnız görünüm adı yazılır.
       Dördüncü alan kırmızı rozet sayısıdır. */
    var bekleyenSandik = toplanmamisSayi("ganimet") + toplanmamisSayi("hediye");
    var IZGARA = [
      ["⚔️", "Savaş", "savas"],   ["🎁", "Sandıklar", "sandik", bekleyenSandik],
      ["🚩", "Bölge"],            ["💥", "Çarpışma"],
      ["🏪", "Mağaza", "magaza"], ["🔬", "Teknoloji"],
      ["🏆", "Güç<br>Sıralamaları"], ["🤝", "Yardım"]
    ];
    h += '<div class="ik-izgara">' + IZGARA.map(function (g) {
      var kapi = g[2]
        ? ('data-gorunum="' + g[2] + '"')
        : ('data-yakinda="' + kacar(String(g[1]).replace(/<br>/g, " ")) + '"');
      var rozet = (g[3] > 0)
        ? ('<i class="ik-rozet">' + (g[3] > 99 ? "99+" : g[3]) + "</i>") : "";
      return '<button class="ik-dugme" ' + kapi + ">" +
               '<span class="ik-dikon">' + g[0] + "</span>" +
               '<span class="ik-dad">' + g[1] + "</span>" + rozet +
             "</button>";
    }).join("") + "</div>";

    h += '<div class="ik-altbar">' +
      '<button class="ik-alt" data-gorunum="uyeler"><span>👥</span>Üyeler</button>' +
      '<button class="ik-alt" data-yakinda="Zafer"><span>🏅</span>Zafer</button>' +
      '<button class="ik-alt" data-gorunum="ayarlar"><span>⚙️</span>Ayarlar</button>' +
    "</div></div>";

    return h;
  }

  /* ── GÖRÜNÜM 2: ÜYELER ───────────────────────────────────────
     Referans düzeni: arama kutusu, çevrimiçi sayacı, sonra RÜTBE
     GRUPLARI. Lider (R5) tek başına GENİŞ bir kart; altındaki her
     rütbe kendi başlık satırında ("R4 · Yönetici · 0/1 · ▾") ve
     başlığa dokununca grup katlanır. Üyeler iki sütunlu kutucuk.

     GRUP BAŞLIĞI BOŞ GRUPTA DA DURUR — referansta da öyle: "R4 0/1"
     satırı kimse yokken de görünür, çünkü o satır aynı zamanda
     rütbenin KONTENJANINI söyler. Boş bırakınca oyuncu R4'ün var
     olduğunu hiç öğrenemiyordu.

     Kart verisi (güç, kale sv, son görülme) gucHesapla() içinde
     `accounts` okunurken toplanır; burada ikinci bir okuma yoktur.
     Veri gelmeden önce "…" yazar. */

  var RUTBE_KONTENJAN = { R5: 1, R4: 1, R3: 54, R2: 50, R1: 50 };

  function gorulmeYazi(ms) {
    var n = Number(ms) || 0;
    if (!n) return "";
    var f = Date.now() - n;
    if (f < 5 * 60 * 1000) return "Çevrimiçi";
    var dk = Math.floor(f / 60000);
    if (dk < 60) return dk + " dakika önce";
    var sa = Math.floor(dk / 60);
    if (sa < 24) return sa + " saat önce";
    return Math.floor(sa / 24) + " gün önce";
  }

  /* 2.600.000 → "2,6M" (referanstaki kısa biçim). */
  function gucKisa(n) {
    n = Number(n) || 0;
    if (n >= 1000000) {
      var m = n / 1000000;
      return (m >= 10 ? Math.round(m) : (Math.round(m * 10) / 10))
               .toString().replace(".", ",") + "M";
    }
    return sayiBicim(n);
  }

  function uyeKartiHTML(u, benMi, lider, yetki, benimR) {
    var bilgi = _uyeBilgi[u.key] || null;
    var gorulme = bilgi ? gorulmeYazi(bilgi.gorulme) : "";
    var cevrimici = (gorulme === "Çevrimiçi");
    var no = rutbeNo(u.rutbe);

    var dugmeler = "";
    /* Rütbe yalnız Lider'in elinde; R5 verilemez (tek lider kuralı),
       bu yüzden terfi tavanı R4'tür. */
    if (!benMi && lider && no < 5) {
      if (no < 4) dugmeler += '<button class="iu-min" data-terfi="' + kacar(u.key) + '">▲</button>';
      if (no > 1) dugmeler += '<button class="iu-min" data-indir="' + kacar(u.key) + '">▼</button>';
    }
    if (!benMi && yetki && no < rutbeNo(benimR)) {
      dugmeler += '<button class="iu-min iu-kirmizi" data-at="' + kacar(u.key) + '">✕</button>';
    }

    return '<div class="iu-kart' + (benMi ? " ben" : "") +
             (cevrimici ? " acik" : "") + '">' +
      '<div class="iu-avatar">' +
        '<span class="iu-yuz">' + RUTBE_SIMGE[u.rutbe] + "</span>" +
        (gorulme ? '<span class="iu-durum' + (cevrimici ? " iu-yesil" : "") + '">' +
                     gorulme + "</span>" : "") +
      "</div>" +
      '<div class="iu-orta">' +
        '<div class="iu-ad">' + kacar(u.ad) + (benMi ? " (sen)" : "") + "</div>" +
        '<div class="iu-stat"><span>✊ ' +
          (bilgi ? gucKisa(bilgi.guc) : "…") + "</span>" +
          '<span>🏰 Sv. ' + (bilgi && bilgi.sv ? bilgi.sv : "…") + "</span></div>" +
      "</div>" +
      (dugmeler ? '<div class="iu-islem">' + dugmeler + "</div>" : "") +
    "</div>";
  }

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

    var ara = _uyeArama.trim().toLowerCase();
    var suzulmus = ara
      ? uyeler.filter(function (u) { return u.ad.toLowerCase().indexOf(ara) >= 0; })
      : uyeler;

    var cevrimici = uyeler.filter(function (u) {
      var b = _uyeBilgi[u.key];
      return b && gorulmeYazi(b.gorulme) === "Çevrimiçi";
    }).length;

    var h = '<div class="ik-sarmal">' +
      '<div class="iu-ara">' +
        '<input class="iu-giris" id="itUyeArama" placeholder="Lütfen adıyla ara" value="' +
          kacar(_uyeArama) + '">' +
        '<button class="iu-ara-btn" id="itUyeAraBtn">🔍</button>' +
      "</div>" +
      '<div class="iu-cevrimici">Çevrimiçi: ' + cevrimici + "/" + uyeler.length + "</div>";

    h += '<div class="iy-govde">';

    /* Başvurular referansta yok ama SİLİNMEZ: onaylanmayı bekleyen
       başvuru başka hiçbir ekranda görünmüyor. Listenin en üstünde,
       kendi başlığıyla durur. */
    var basv = Object.keys(it.basvurular || {});
    if (yetki && basv.length) {
      h += '<div class="iu-grup"><span class="iu-rozet">!</span>' +
             "<b>Başvurular</b><span class=\"iu-say\">" + basv.length + "</span></div>";
      h += '<div class="iu-izgara tek">' + basv.map(function (bk) {
        var b = it.basvurular[bk] || {};
        return '<div class="iu-kart">' +
          '<div class="iu-avatar"><span class="iu-yuz">👤</span></div>' +
          '<div class="iu-orta"><div class="iu-ad">' + kacar(b.ad || bk) + "</div>" +
            '<div class="iu-stat"><span>Katılmak istiyor</span></div></div>' +
          '<div class="iu-islem">' +
            '<button class="iu-min iu-yesilds" data-onay="' + kacar(bk) + '">✓</button>' +
            '<button class="iu-min iu-kirmizi" data-ret="' + kacar(bk) + '">✕</button>' +
          "</div></div>";
      }).join("") + "</div>";
    }

    /* Lider ayrı: referansta altın çerçeveli TEK GENİŞ kart. */
    var liderler = suzulmus.filter(function (u) { return u.rutbe === "R5"; });
    if (liderler.length) {
      h += '<div class="iu-izgara tek iu-lider">' + liderler.map(function (u) {
        return uyeKartiHTML(u, u.key === k, lider, yetki, benimR);
      }).join("") + "</div>";
    }

    ["R4", "R3", "R2", "R1"].forEach(function (r) {
      var grup = suzulmus.filter(function (u) { return u.rutbe === r; });
      /* Arama açıkken boş grup başlığı gösterilmez — arama sonucu
         ekranı başlık listesine çevirirdi. */
      if (ara && !grup.length) return;
      var kapali = !!_kapaliRutbe[r];
      h += '<div class="iu-grup" data-rutbe="' + r + '">' +
        '<span class="iu-rozet">' + r + "</span>" +
        "<b>" + kacar(RUTBE_AD[r]) + "</b>" +
        '<span class="iu-say">👤 ' + grup.length + "/" + (RUTBE_KONTENJAN[r] || 0) + "</span>" +
        '<span class="iu-ok' + (kapali ? " kapali" : "") + '">⌄</span>' +
      "</div>";
      if (kapali) return;
      if (!grup.length) {
        h += '<div class="iu-bos">Bu rütbede kimse yok.</div>';
        return;
      }
      h += '<div class="iu-izgara">' + grup.map(function (u) {
        return uyeKartiHTML(u, u.key === k, lider, yetki, benimR);
      }).join("") + "</div>";
    });

    if (ara && !suzulmus.length) {
      h += '<div class="iy-bos"><img class="iy-bos-ikon" src="ittifakikon.webp" alt="">' +
           "<span>Aramaya uyan üye yok.</span></div>";
    }

    h += "</div></div>";
    return h;
  }

  /* ── GÖRÜNÜM 3: AYARLAR ───────────────────────────────────── */
  /* ── GÖRÜNÜM 3: YÖNET ────────────────────────────────────────
     Referans düzeni: iki sütunlu hap düğmeler, en altta turuncu
     "İttifaktan Çık". İki düğme (İttifak İlişkileri, İttifak
     Oylaması) referansta da SÖNÜK durur — orada da açılmamış
     özellikler. Burada da sönük ve dokunulamaz bırakıldı:
     çalışır gibi gösterip "Yakında" demek daha kötü olurdu.

     Lider için çıkış düğmesi "İttifakı Dağıt"tır — lider ayrılırsa
     ittifak sahipsiz kalır, liderlik devri henüz yok. */
  function ayarlarEkraniHTML() {
    var lider = liderMiyim();

    var HAPLAR = [
      ["📋", "İttifak Kaydı",     "yakinda"],
      ["🔔", "Mesaj",             "yakinda"],
      ["📄", "İttifak Listesi",   "yakinda"],
      ["🏆", "Sıralama",          "yakinda"],
      ["📝", "İttifak İlişkileri", "sonuk"],
      ["🗳️", "İttifak Oylaması",  "sonuk"]
    ];

    var h = '<div class="ik-sarmal"><div class="iy-govde">' +
      '<div class="iz-izgara">' + HAPLAR.map(function (x) {
        var sonuk = (x[2] === "sonuk");
        return '<button class="iz-hap' + (sonuk ? " sonuk" : "") + '"' +
          (sonuk ? " disabled" : ' data-yakinda="' + kacar(x[1]) + '"') + ">" +
          '<span class="iz-ikon">' + x[0] + "</span>" +
          '<span class="iz-ad">' + x[1] + "</span>" +
        "</button>";
      }).join("") + "</div>";

    h += '<div class="iz-izgara iz-cikis">' +
      (lider
        ? '<button class="iz-hap iz-turuncu" id="itDagitBtn">' +
            '<span class="iz-ikon">🚪</span><span class="iz-ad">İttifakı Dağıt</span></button>'
        : '<button class="iz-hap iz-turuncu" id="itAyrilBtn">' +
            '<span class="iz-ikon">🚪</span><span class="iz-ad">İttifaktan Çık</span></button>') +
    "</div>";

    return h + "</div></div>";
  }

  function tarihYazi(ms) {
    var n = Number(ms) || 0;
    if (!n) return "—";
    try { return new Date(n).toLocaleDateString("tr-TR"); } catch (e) { return "—"; }
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

  /* ══════════════════════════════════════════════════════════════
     İTTİFAK EKONOMİSİ — JETON · ANAHTAR · SEVİYE
     ──────────────────────────────────────────────────────────────
     TEK KAYNAK: oyuncu MAĞAZADAN paket aldıkça (magaza.js →
     buyItem) harcadığı elmas ittifaka iki ayrı sayaca yazılır:

       sayac.tec      → İTTİFAK TECRÜBESİ. Künyedeki seviye
                        çubuğunu doldurur; seviye İttifak
                        Mağazası'ndaki kilitli satırları açar.
       sayac.anahtar  → SANDIK ÇUBUĞU (Sandıklar ekranının tepesi).
                        ANAHTAR_HEDEF'e varınca sıfırlanır ve TÜM
                        üyelere bir Ganimet Sandığı düşer.

     Alan başına iki ödül var, karıştırma:
       · İttifak Hediyesi → paketi ALAN kişi yüzünden herkese düşer,
         jetonu paketin BEDELİNE göre değişir (bedel / HEDIYE_BOLEN).
       · Ganimet Sandığı  → çubuk dolunca düşer, jetonu sabittir.

     Jeton oyuncunun KENDİ kaydında durur (state.ittifakJeton);
     sandık kaydı buluttadır ve her üye onu BİR KEZ toplar
     (sandiklar/{id}/toplayan/{oyuncuAnahtari}).

     İKİ SAYAÇ NEDEN `sayac` ALTINDA: ittifak düğümünün tamamı
     hiçbir yerde .set() ile yazılmıyor (bkz. dosya başı ".set()
     TUZAĞI"). `sayac` tek parça olduğu için transaction ile
     güvenle yazılabilir — aynı anda iki üye paket alsa bile
     ilerleme kaybolmaz.
     ══════════════════════════════════════════════════════════════ */

  var JETON_ADI            = "İttifak Jetonu";

  /* JETON SİMGESİ TEK KAYNAK. Hem CSS'teki simge hem toplama
     uçuşundaki parçacık BU veri-adresinden çizilir; iki ayrı çizim
     kaçınılmaz olarak ayrışırdı. Emoji DEĞİL: emojinin rengi yazı
     tipine bağlı, "gri olsun" denince dayatılamıyor. */
  var JETON_SVG = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<circle cx="16" cy="16" r="15" fill="#a9b4c2"/>' +
      '<circle cx="16" cy="16" r="12.4" fill="#dde4ec"/>' +
      '<path d="M16 8.8l2.1 4.4 4.8.6-3.5 3.3.9 4.8L16 19.6l-4.3 2.3.9-4.8-3.5-3.3 4.8-.6z"' +
        ' fill="#93a1b1"/>' +
    "</svg>");
  var ANAHTAR_HEDEF        = 75000;   /* sandık çubuğu bu kadar birikimle dolar */
  var GANIMET_JETON        = 500;     /* çubuk dolunca HER ÜYEYE düşen jeton  */
  var HEDIYE_BOLEN         = 100;     /* hediye jetonu = paket bedeli / 100   */
  var HEDIYE_MIN           = 10;
  var HEDIYE_MAX           = 300;
  /* Günlük ganimet tavanı, tek sandığın ödülünden BÜYÜK olmalı.
     Ödül 500'e çıkınca 500'lük tavan, aynı gün dolan ikinci çubuğu
     sessizce yutuyordu: sandık listede "Topla" diye duruyor ama
     dokununca hiçbir şey vermiyordu. Dört sandıklık pay bırakıldı. */
  var GUNLUK_GANIMET_SINIRI = 2000;   /* oyuncu başına günlük ganimet jetonu */
  var SANDIK_OMRU_MS       = 24 * 60 * 60 * 1000;
  var SANDIK_SINIRI        = 50;      /* listede tutulan en fazla sandık      */

  /* Seviye eşikleri: SV_ESIK[n] = (n+1). seviyeye geçmek için gereken
     TOPLAM tecrübe. Sv1 → Sv2 için 40.000 (referans ekrandaki sayı).
     Sonu geldiğinde seviye tavanda kalır, çubuk dolu görünür. */
  var SV_ESIK = [0, 40000, 110000, 220000, 380000, 600000, 900000,
                 1300000, 1800000, 2400000];

  function sayac() {
    var s = (_benim && _benim.sayac) ? _benim.sayac : null;
    return {
      anahtar: s ? (Number(s.anahtar) || 0) : 0,
      tec:     s ? (Number(s.tec)     || 0) : 0
    };
  }

  /* Tecrübeden seviye: { sv, alt, ust, oran } */
  function seviyeBilgi(tec) {
    tec = Number(tec) || 0;
    var sv = 1;
    while (sv < SV_ESIK.length && tec >= SV_ESIK[sv]) sv++;
    var alt = SV_ESIK[sv - 1] || 0;
    var ust = (sv < SV_ESIK.length) ? SV_ESIK[sv] : alt;   /* tavan: ust===alt */
    var oran = (ust > alt) ? ((tec - alt) / (ust - alt)) : 1;
    return { sv: sv, alt: alt, ust: ust, oran: Math.max(0, Math.min(1, oran)) };
  }
  function ittifakSeviyesi() { return seviyeBilgi(sayac().tec).sv; }

  /* ── OYUNCU TARAFI: JETON ─────────────────────────────────────
     `state` içinde durur, hesapla birlikte buluta gider
     (persistCurrentState tüm state'i yazar). defaultState'e
     eklenmesi GEREKMEZ: startSessionFor state'i önce tamamen
     boşaltıyor, o yüzden alan hesaplar arasında sızmaz. */
  function jeton() {
    var s = st();
    return s ? (Number(s.ittifakJeton) || 0) : 0;
  }
  function jetonEkle(n) {
    var s = st();
    if (!s) return;
    s.ittifakJeton = Math.max(0, jeton() + (Number(n) || 0));
    yaz();
  }

  /* Günlük ganimet tavanı — oyuncu başına, yerel güne göre. */
  function bugunAnahtari() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function ganimetBugun() {
    var s = st();
    if (!s || !s.itGanimet || s.itGanimet.gun !== bugunAnahtari()) return 0;
    return Number(s.itGanimet.toplam) || 0;
  }
  function ganimetEkle(n) {
    var s = st();
    if (!s) return;
    if (!s.itGanimet || s.itGanimet.gun !== bugunAnahtari()) {
      s.itGanimet = { gun: bugunAnahtari(), toplam: 0 };
    }
    s.itGanimet.toplam = (Number(s.itGanimet.toplam) || 0) + (Number(n) || 0);
  }

  /* ── SADECE KENDİ İTTİFAKIMI TAZELE ───────────────────────────
     tazele() tüm `ittifaklar` düğümünü okur; sandık toplama ya da
     mağaza alımı sonrası bu gereksiz pahalıdır. Burada yalnız tek
     ittifak okunur ve _liste'deki kopyası da yerine konur — iki
     yerde farklı kayıt kalmasın. */
  function benimiTazele(bitince) {
    if (!_benim || !bulutVar()) { if (bitince) bitince(); return; }
    var id = _benim.id;
    kok().child(id).once("value").then(function (snap) {
      var v = snap.val();
      if (v) {
        v.id = id;
        _benim = v;
        for (var i = 0; i < _liste.length; i++) {
          if (_liste[i].id === id) { _liste[i] = v; break; }
        }
      }
      if (bitince) bitince();
    }).catch(function (e) {
      console.warn("[ittifak] tazelenemedi:", e);
      if (bitince) bitince();
    });
  }

  /* ══════════════════════════════════════════════════════════════
     SANDIKLAR — VERİ
     ══════════════════════════════════════════════════════════════ */

  /* Bulut kaydı:
       sandiklar/{id} = { tur, sebep, kim, jeton, at, toplayan:{} }
     tur    → "hediye" | "ganimet"
     kim    → paketi alan oyuncunun adı ("" ise isimsiz gönderildi)
     sebep  → hediye için paket adı, ganimet için "" (sabit metin)
     toplayan → her üye kendini BİR KEZ yazar; kayıt herkes için
                tektir, 50 üyeye 50 kayıt açılmaz. */
  function sandikListesi(tur) {
    var s = (_benim && _benim.sandiklar) ? _benim.sandiklar : {};
    var simdi = Date.now();
    return Object.keys(s).map(function (id) {
      var x = s[id] || {};
      return {
        id: id, tur: x.tur || "ganimet", sebep: x.sebep || "",
        kim: x.kim || "", jeton: Number(x.jeton) || 0,
        at: Number(x.at) || 0,
        toplandi: !!(x.toplayan && benKey() && x.toplayan[benKey()])
      };
    }).filter(function (x) {
      if (tur && x.tur !== tur) return false;
      /* Ömrü dolmuş kayıt listede görünmez; silmesi ayrı iş
         (sandikBudama) — okuma yazmaya bağlı kalmasın. */
      return !x.at || (simdi - x.at) < SANDIK_OMRU_MS;
    }).sort(function (a, b) { return b.at - a.at; });
  }

  function toplanmamisSayi(tur) {
    return sandikListesi(tur).filter(function (x) { return !x.toplandi; }).length;
  }

  /* Sandık aç — TÜM üyelere tek kayıt. */
  function sandikAc(id, kayit) {
    if (!bulutVar()) return;
    kok().child(id).child("sandiklar").push(kayit)
      .catch(function (e) { console.warn("[ittifak] sandık açılamadı:", e); });
  }

  /* Ömrü dolmuş kayıtları sil. Sessizdir: başarısız olursa ekranda
     hiçbir şey değişmez, liste zaten onları göstermiyor. */
  function sandikBudama() {
    if (!_benim || !bulutVar()) return;
    var s = _benim.sandiklar || {};
    var simdi = Date.now();
    var sil = Object.keys(s).filter(function (k) {
      var at = Number((s[k] || {}).at) || 0;
      return at && (simdi - at) > SANDIK_OMRU_MS;
    });
    /* Liste tavanı: en eskiden başlayarak fazlalık da düşer. */
    var kalan = Object.keys(s).length - sil.length;
    if (kalan > SANDIK_SINIRI) {
      Object.keys(s).filter(function (k) { return sil.indexOf(k) < 0; })
        .sort(function (a, b) {
          return (Number((s[a] || {}).at) || 0) - (Number((s[b] || {}).at) || 0);
        })
        .slice(0, kalan - SANDIK_SINIRI)
        .forEach(function (k) { sil.push(k); });
    }
    sil.forEach(function (k) {
      kok().child(_benim.id).child("sandiklar").child(k).remove().catch(function () {});
    });
  }

  /* Tek sandık topla.
     ÇİFT TOPLAMA KİLİDİ: `toplayan/{ben}` düğümüne transaction ile
     yazılır ve dolu ise iptal edilir. İki sekme aynı anda "Topla"ya
     bassa bile jeton bir kez verilir. */
  function sandikTopla(sid, bitince) {
    var k = benKey();
    if (!_benim || !k || !bulutVar()) { if (bitince) bitince(false, 0); return; }
    var kayit = (_benim.sandiklar || {})[sid];
    if (!kayit) { if (bitince) bitince(false, 0); return; }

    var kazanc = Number(kayit.jeton) || 0;
    var ganimetMi = (kayit.tur === "ganimet");

    if (ganimetMi) {
      var kalan = GUNLUK_GANIMET_SINIRI - ganimetBugun();
      if (kalan <= 0) { if (bitince) bitince(false, 0, "sinir"); return; }
      if (kazanc > kalan) kazanc = kalan;
    }

    kok().child(_benim.id).child("sandiklar").child(sid)
      .child("toplayan").child(k)
      .transaction(function (mevcut) {
        if (mevcut) return;            /* zaten toplanmış → iptal */
        return true;
      })
      .then(function (sonuc) {
        if (!sonuc.committed) { if (bitince) bitince(false, 0); return; }
        if (!kayit.toplayan) kayit.toplayan = {};
        kayit.toplayan[k] = true;      /* yerel kopya da bilsin */
        jetonEkle(kazanc);
        if (ganimetMi) ganimetEkle(kazanc);
        yaz();
        if (bitince) bitince(true, kazanc);
      })
      .catch(function (e) {
        console.warn("[ittifak] sandık toplanamadı:", e);
        uyar(hataMetni(e, "Sandık toplanamadı"));
        if (bitince) bitince(false, 0);
      });
  }

  /* Tümünü Al — TEK TEK, SIRAYLA.
     Paralel toplamak cazip ama YANLIŞ: günlük ganimet tavanı
     `ganimetBugun()` ile alım ANINDA okunuyor; hepsi aynı anda
     başlarsa hepsi aynı (eski) toplamı görür ve tavan aşılır.
     Sıralı akışta her adım bir öncekinin kazancını görmüş olur. */
  function sandikHepsiniTopla(tur, cikis) {
    var bekleyen = sandikListesi(tur).filter(function (x) { return !x.toplandi; });
    if (!bekleyen.length) { uyar("Toplanacak sandık yok."); return; }
    var oncekiJeton = jeton();
    var toplam = 0, sinirDoldu = false, i = 0;

    function sonraki() {
      if (i >= bekleyen.length) {
        /* Tavan tam dolarak durduğunda toplanan jeton VARDIR; o
           yüzden iki haber birbirini ELEMEZ, aynı satırda verilir —
           yoksa oyuncu neden yarıda kaldığını hiç öğrenemezdi. */
        if (toplam > 0) {
          uyar("🪙 " + sayiBicim(toplam) + " " + JETON_ADI + " toplandı!" +
               (sinirDoldu ? " Günlük ganimet sınırına ulaştın." : ""));
        } else if (sinirDoldu) {
          uyar("Günlük ganimet sınırına ulaştın.");
        }
        govdeCiz();
        /* Uçuş sandık başına değil, TOPLAM üzerinden bir kez —
           on sandıkta on ayrı akış ekranı karmakarışık ediyordu. */
        if (toplam > 0) jetonUcusu(cikis, oncekiJeton, toplam);
        return;
      }
      sandikTopla(bekleyen[i++].id, function (oldu, kazanc, sebep) {
        if (oldu) toplam += kazanc;
        if (sebep === "sinir") { sinirDoldu = true; i = bekleyen.length; }
        sonraki();
      });
    }
    sonraki();
  }

  /* ══════════════════════════════════════════════════════════════
     PAKET ALIMI — EKONOMİNİN TEK GİRİŞ KAPISI
     magaza.js'teki buyItem sarmalanır (bkz. magazaBagla). Oyuncu
     kaç elmas harcadıysa o kadar tecrübe + o kadar anahtar yazılır.
     ══════════════════════════════════════════════════════════════ */
  /* ── İKİ AYRI KAYNAK, TEK BORU ────────────────────────────────
     İttifak ilerlemesi ASIL OLARAK ÜCRETLİ PAKETLERE aittir
     (referans oyundaki "X, Günlük Teklifler satın aldı" satırı).
     Oyun içi elmas harcaması aynı şey DEĞİLDİR: elmas zaten oyun
     içinden kazanılıyor, onu tam oranla saymak ittifak seviyesini
     ücretli paket hiç alınmadan tavana taşırdı.

       paketAlindi()   → GERÇEK PARA. Tam oran + TÜM ÜYELERE hediye.
       elmasHarcandi() → OYUN İÇİ ELMAS. Bedelin yalnız %ELMAS_KATKI
                         kadarı sayaca yazılır, HEDİYE AÇILMAZ.

     Ganimet Sandığı ikisinden de gelebilir — o çubuğun dolmasına
     bağlı, kaynağına değil.

     DİKKAT: paketAlindi ŞU AN HİÇBİR YERDEN ÇAĞRILMIYOR. Oyunda
     gerçek para ile satın alma sistemi yok (ne IAP, ne ödeme
     sağlayıcısı). Kapı bilerek açık duruyor: o sistem geldiğinde
     satın alma başarıyla bittiği yerden bu işlevi çağırmak yeter,
     sandık/jeton/seviye/mağaza tarafında hiçbir şey değişmez. */

  var ELMAS_KATKI = 0.10;   /* oyun içi elmasın ittifaka geçen payı */

  /* GERÇEK PARA ile alınan paket. */
  function paketAlindi(paketAdi, bedel) {
    ekonomiyeYaz(bedel, paketAdi || "paket");
  }

  /* OYUN İÇİ elmas harcaması — düşük oran, hediye yok. */
  function elmasHarcandi(bedel) {
    ekonomiyeYaz(Math.round((Number(bedel) || 0) * ELMAS_KATKI), null);
  }

  /* `hediye` doluysa paket adıdır ve tüm üyelere İttifak Hediyesi
     açılır; null ise yalnız sayaçlar ilerler. */
  function ekonomiyeYaz(miktar, hediye) {
    miktar = Math.max(0, Math.round(Number(miktar) || 0));
    if (!miktar || !_benim || !bulutVar()) return;

    var id = _benim.id;
    var ben = benAd() || "Bir üye";
    var isimsiz = !!(st() && st().itIsimsizHediye);

    /* Çubuğun dolduğunu transaction'ın SON çalışmasından öğreniriz.
       Firebase güncelleme işlevini birden çok kez çalıştırabilir;
       işlenen (commit edilen) değer HER ZAMAN son çalışmanınkidir,
       bu yüzden bayrağı orada kurmak doğrudur. */
    var doldu = false;

    kok().child(id).child("sayac").transaction(function (m) {
      m = m || {};
      var a = (Number(m.anahtar) || 0) + miktar;
      doldu = false;
      if (a >= ANAHTAR_HEDEF) { a -= ANAHTAR_HEDEF; doldu = true; }
      return { anahtar: a, tec: (Number(m.tec) || 0) + miktar };
    }).then(function (sonuc) {
      if (!sonuc.committed) return;

      if (hediye) {
        sandikAc(id, {
          tur: "hediye",
          sebep: hediye,
          kim: isimsiz ? "" : ben,
          jeton: Math.max(HEDIYE_MIN,
                   Math.min(HEDIYE_MAX, Math.round(miktar / HEDIYE_BOLEN))),
          at: saat(),
          toplayan: {}
        });
      }

      if (doldu) {
        sandikAc(id, {
          tur: "ganimet", sebep: "", kim: "",
          jeton: GANIMET_JETON, at: saat(), toplayan: {}
        });
      }

      /* Panel açıksa ekran kendiliğinden tazelensin. */
      if (panel && panel.classList.contains("active")) {
        benimiTazele(function () { if (_benim) govdeCiz(); });
      }
    }).catch(function (e) {
      console.warn("[ittifak] ittifak ilerlemesi yazılamadı:", e);
    });
  }

  /* magaza.js'teki buyItem'ı sarmalar. ittifak.js index.html'de
     magaza.js'ten SONRA yüklenir, o yüzden kapı hazırdır.
     Alım BAŞARISIZ olsa bile (limit dolu, elmas yetmedi) buyItem
     sessizce döner — bu yüzden elması ÖNCE ve SONRA okuyup GERÇEK
     harcamayı ölçüyoruz. Fiyatı burada yeniden hesaplamak
     (fiyat × adet) limit kırpmasını ıskalardı. */
  function magazaBagla() {
    var orij = window.buyItem;
    if (typeof orij !== "function" || orij.__ittifakWrapped) return;
    var sarmal = function (idx, count) {
      var s = st();
      var once = s ? (Number(s.diamonds) || 0) : 0;
      var sonuc = orij.apply(this, arguments);
      try {
        var sonra = s ? (Number(s.diamonds) || 0) : 0;
        var harcanan = once - sonra;
        var urun = (typeof shopItems !== "undefined" && shopItems[idx]) ? shopItems[idx] : null;
        /* FÜZE DIŞARIDA — bilerek. buyItem füzeyi buluta yazar ve
           yazma düşerse elması SONRADAN, eşzamansız olarak iade
           eder. Biz elması burada, iade gelmeden ölçüyoruz: füzeyi
           saysaydık 400.000'lik bir alım ittifaka hediye açar, sonra
           oyuncunun elması geri gelir ve hediye ortada kalırdı. */
        if (harcanan > 0 && _benim && !(urun && urun.isMissile)) {
          /* elmasHarcandi — paketAlindi DEĞİL. Elmas oyun içinden
             kazanılıyor; hediye sandığı açtırması ve tam oranla
             sayılması ittifak seviyesini ücretsiz tavana taşırdı. */
          elmasHarcandi(harcanan);
        }
      } catch (e) { console.warn("[ittifak] paket kancası:", e); }
      return sonuc;
    };
    sarmal.__ittifakWrapped = true;
    window.buyItem = sarmal;
  }

  /* ══════════════════════════════════════════════════════════════
     İTTİFAK MAĞAZASI — KATALOG
     ──────────────────────────────────────────────────────────────
     Ürünün KENDİSİ burada TANIMLANMAZ: `urun` alanı magaza.js'teki
     shopItems adıyla eşleşir, görsel ve simge oradan okunur. İki
     yerde ayrı ürün tanımı olsaydı fiyat/görsel kaçınılmaz olarak
     ayrışırdı. Buradaki `bedel` JETON'dur, elmas değil.

     Alanlar:
       urun    → shopItems içindeki ad (BİREBİR aynı olmalı)
       adet    → bir alımda çantaya düşen sayı
       bedel   → jeton fiyatı
       kalan   → DÖNEM başına oyuncu başına alım hakkı
       indirim → yalnız rozet yazısı (0 ise rozet çizilmez)
       sv      → bu satırın açılması için gereken İTTİFAK SEVİYESİ

     Füze BİLEREK YOK: buluttaki füze sayacına yazılıyor ve geri
     alma yolu ayrı — jetonla satılması ayrı bir iş.
     ══════════════════════════════════════════════════════════════ */
  var MAGAZA = {
    gun: [
      { urun: "Tecrübe Kitabı",         adet: 1, bedel: 30,  kalan: 10, indirim: 70 },
      { urun: "5 Dakika Hızlandırma",   adet: 1, bedel: 40,  kalan: 5,  indirim: 40 },
      { urun: "Demir Sandığı",          adet: 1, bedel: 60,  kalan: 5,  indirim: 0  },
      { urun: "Su Sandığı",             adet: 1, bedel: 60,  kalan: 5,  indirim: 0  },
      { urun: "1 Saat Hızlandırma",     adet: 1, bedel: 260, kalan: 2,  indirim: 40 },
      { urun: "Can Potu",               adet: 1, bedel: 300, kalan: 2,  indirim: 0  },
      { urun: "İntikal Hızlandırma %25", adet: 1, bedel: 120, kalan: 2, indirim: 0, sv: 5 },
      { urun: "Kalkan (6 Saat)",        adet: 1, bedel: 700, kalan: 1,  indirim: 0, sv: 5 },
      { urun: "Mor Kahraman Parçası",   adet: 1, bedel: 900, kalan: 1,  indirim: 0, sv: 5 }
    ],
    hafta: [
      { urun: "Kalkan (6 Saat)",        adet: 2, bedel: 600,  kalan: 2, indirim: 70 },
      { urun: "3 Saat Hızlandırma",     adet: 1, bedel: 500,  kalan: 1, indirim: 40 },
      { urun: "Mor Kahraman Parçası",   adet: 1, bedel: 800,  kalan: 1, indirim: 70 },
      { urun: "STELLİN Parçası",        adet: 1, bedel: 1500, kalan: 1, indirim: 0, sv: 7 },
      { urun: "İVANOVNA Parçası",       adet: 1, bedel: 1500, kalan: 1, indirim: 0, sv: 7 },
      { urun: "REVOLİA Parçası",        adet: 1, bedel: 1500, kalan: 1, indirim: 0, sv: 7 }
    ]
  };

  /* ── DÖNEMLER ─────────────────────────────────────────────────
     Gün YEREL gece yarısında, hafta YEREL pazartesi 00:00'da
     yenilenir. Alım sayaçları dönem damgasıyla saklanır; damga
     değişince sayaç kendiliğinden sıfırdan başlar, ayrı bir
     "sıfırla" işine gerek kalmaz. */
  function gunBitisi() {
    var d = new Date();
    d.setHours(24, 0, 0, 0);
    return d.getTime();
  }
  function haftaBitisi() {
    var d = new Date();
    var gun = (d.getDay() + 6) % 7;          /* 0 = pazartesi */
    d.setHours(0, 0, 0, 0);
    return d.getTime() + (7 - gun) * 24 * 60 * 60 * 1000;
  }
  function donemDamgasi(tur) {
    return (tur === "hafta") ? String(haftaBitisi()) : String(gunBitisi());
  }
  function alimSayaci(tur) {
    var s = st();
    if (!s) return {};
    var alan = (tur === "hafta") ? "itMagazaHafta" : "itMagazaGun";
    var kutu = s[alan];
    if (!kutu || kutu.damga !== donemDamgasi(tur)) {
      kutu = { damga: donemDamgasi(tur), al: {} };
      s[alan] = kutu;
    }
    if (!kutu.al) kutu.al = {};
    return kutu.al;
  }
  function alinan(tur, anahtar) { return Number(alimSayaci(tur)[anahtar]) || 0; }
  function alimYaz(tur, anahtar, n) {
    var al = alimSayaci(tur);
    al[anahtar] = (Number(al[anahtar]) || 0) + n;
    yaz();
  }

  /* Katalog satırının benzersiz anahtarı — aynı ürün iki sekmede
     ayrı satır olabildiği için ad tek başına yetmez. */
  function magazaAnahtari(tur, i) { return tur + ":" + i; }

  function urunTanimi(ad) {
    try {
      if (typeof getItemDef === "function") return getItemDef(ad);
    } catch (e) {}
    return null;
  }

  /* Ürün görseli: önce shopItems'in kendi görseli, parçalarda
     gelistir.js'in PARCA kapısı, ikisi de yoksa emoji. */
  function urunGorselHTML(tan) {
    if (!tan) return '<span class="im-emoji">🎁</span>';
    var g = tan.gorsel || "";
    if (!g && tan.isParca && window.PARCA && typeof window.PARCA.gorsel === "function") {
      g = window.PARCA.gorsel(tan.parcaKey) || "";
    }
    if (g) return '<img class="im-gorsel" src="' + kacar(g) + '" alt="">';
    return '<span class="im-emoji">' + kacar(tan.icon || "🎁") + "</span>";
  }

  /* ── SATIN ALMA ───────────────────────────────────────────────
     İttifak Mağazası'nın tüm ürünleri ÇANTAYA düşer (katalogda
     füze yok, kaynak paketleri de magaza.js'te çantaya düşüyor),
     bu yüzden buyItem'ın dallanması burada TEKRARLANMAZ:
     envantere yaz, çantayı çiz, bitti. */
  function magazaAl(tur, i) {
    var kayit = (MAGAZA[tur] || [])[i];
    if (!kayit) return;
    var tan = urunTanimi(kayit.urun);
    if (!tan) { uyar("Bu ürün mağazada tanımlı değil."); return; }

    var gerekenSv = Number(kayit.sv) || 0;
    if (gerekenSv && ittifakSeviyesi() < gerekenSv) {
      uyar("Açmak için İttifak Sv. " + gerekenSv + " düzeyine ulaş.");
      return;
    }

    var anahtar = magazaAnahtari(tur, i);
    var kaldi = kayit.kalan - alinan(tur, anahtar);
    if (kaldi <= 0) { uyar("Bu ürünün stoğu bitti. Mağaza yenilenince tekrar alabilirsin."); return; }
    if (jeton() < kayit.bedel) {
      uyar("Yeterli " + JETON_ADI + "'n yok (🪙 " + sayiBicim(kayit.bedel) + ").");
      return;
    }

    var s = st();
    if (!s) return;
    jetonEkle(-kayit.bedel);
    alimYaz(tur, anahtar, 1);
    if (!s.inventory) s.inventory = {};
    s.inventory[tan.name] = (Number(s.inventory[tan.name]) || 0) + kayit.adet;
    if (typeof renderInventory === "function") renderInventory();
    yaz();
    uyar("🪙 " + kayit.adet + "x " + tan.name + " çantana eklendi!");
    govdeCiz();
  }

  /* ══════════════════════════════════════════════════════════════
     EKRANLAR — SAVAŞ · SANDIKLAR · MAĞAZA
     Üçü de künyedeki ızgara düğmelerinden açılır (data-gorunum).
     ══════════════════════════════════════════════════════════════ */

  var _savasSekme  = "seferberlik";
  var _sandikSekme = "ganimet";
  var _magazaSekme = "gun";

  function jetonRozetiHTML() {
    return '<span class="it-jeton"></span><span class="it-jeton-sayi">' +
           sayiBicim(jeton()) + "</span>";
  }

  function sureBicimKisa(ms) {
    ms = Math.max(0, Number(ms) || 0);
    var sn = Math.floor(ms / 1000);
    var g  = Math.floor(sn / 86400); sn -= g * 86400;
    var sa = Math.floor(sn / 3600);  sn -= sa * 3600;
    var dk = Math.floor(sn / 60);    sn -= dk * 60;
    function ik(n) { return (n < 10 ? "0" : "") + n; }
    return (g ? (g + "g ") : "") + ik(sa) + ":" + ik(dk) + ":" + ik(sn);
  }

  function saatYazi(ms) {
    var n = Number(ms) || 0;
    if (!n) return "—";
    try {
      var d = new Date(n);
      function ik(x) { return (x < 10 ? "0" : "") + x; }
      return ik(d.getHours()) + ":" + ik(d.getMinutes()) + ":" + ik(d.getSeconds());
    } catch (e) { return "—"; }
  }

  /* ── SAVAŞ ────────────────────────────────────────────────────
     Üç sekme referanstaki gibi: Seferberlik (ittifak çağrıları),
     Bireysel (tek başına çarpışmalar), Etkinlikler.

     ÇARPIŞMA ÜRETEN SİSTEM HENÜZ YOK — liste `carpismalar`
     düğümünü okur ve düğüm boşken referanstaki boş durumu
     gösterir. Çağrı açacak kapı hazır: ITTIFAK.carpismaAc().
     Oto-Katıl AYARI ÇALIŞIR: hem oyuncunun kaydına hem üye
     kaydına yazılır, böylece çağrı sistemi geldiğinde kimin
     otomatik katılacağını buluttan okuyabilir. */
  function carpismaListesi(tur) {
    var c = (_benim && _benim.carpismalar) ? _benim.carpismalar : {};
    var simdi = Date.now();
    return Object.keys(c).map(function (id) {
      var x = c[id] || {};
      return {
        id: id, tur: x.tur || "seferberlik", ad: x.ad || "Çarpışma",
        kim: x.kim || "", at: Number(x.at) || 0,
        biter: Number(x.biter) || 0,
        katilan: x.katilan ? Object.keys(x.katilan).length : 0
      };
    }).filter(function (x) {
      if (x.tur !== tur) return false;
      return !x.biter || x.biter > simdi;
    }).sort(function (a, b) { return b.at - a.at; });
  }

  function otoKatilAcik() {
    var s = st();
    return !!(s && s.itOtoKatil);
  }
  function otoKatilDegistir() {
    var s = st();
    if (!s) return;
    s.itOtoKatil = !s.itOtoKatil;
    yaz();
    /* Üye kaydına da yazılır: çağrıyı açan taraf kimin otomatik
       katılacağını buluttan okuyabilsin. Yazma düşerse ayar yerel
       olarak yine geçerlidir — ekran buna bakar. */
    var k = benKey();
    if (_benim && k && bulutVar()) {
      uyeYolu(k).child("oto").set(!!s.itOtoKatil).catch(function (e) {
        console.warn("[ittifak] oto-katıl yazılamadı:", e);
      });
    }
    uyar(s.itOtoKatil ? "Oto-Katıl açıldı." : "Oto-Katıl kapatıldı.");
    govdeCiz();
  }

  function savasEkraniHTML() {
    var S = [
      { id: "seferberlik", ad: "Seferberlik" },
      { id: "bireysel",    ad: "Bireysel" },
      { id: "etkinlik",    ad: "Etkinlikler" }
    ];
    var h = "";
    h += '<div class="iy-sekmeler">' + S.map(function (s) {
      return '<button class="iy-sekme' + (s.id === _savasSekme ? " secili" : "") +
             '" data-savas-sekme="' + s.id + '">' + s.ad + "</button>";
    }).join("") + "</div>";

    var liste = carpismaListesi(_savasSekme);
    h += '<div class="iy-govde">';
    if (!liste.length) {
      h += '<div class="iy-bos">' +
             '<img class="iy-bos-ikon" src="ittifakikon.webp" alt="">' +
             "<span>Henüz gösterilecek çarpışma yok.</span>" +
           "</div>";
    } else {
      h += liste.map(function (c) {
        var kalan = c.biter ? sureBicimKisa(c.biter - Date.now()) : "";
        return '<div class="it-satir">' +
          '<div class="it-flama">⚔️</div>' +
          '<div class="it-orta">' +
            '<div class="it-ad">' + kacar(c.ad) + "</div>" +
            '<div class="it-alt">' + kacar(c.kim || "İttifak") +
              " · 👤 " + c.katilan + (kalan ? (" · ⏳ " + kalan) : "") + "</div>" +
          "</div>" +
          '<button class="it-dugme it-kucuk" data-carpisma="' + kacar(c.id) + '">Katıl</button>' +
        "</div>";
      }).join("");
    }
    h += "</div>";

    var acik = otoKatilAcik();
    h += '<div class="iy-altbilgi">Etkinleştirildikten sonra ittifakının açtığı ' +
         "Seferberlik çağrılarına otomatik katılırsın.</div>" +
         '<button class="iy-oto' + (acik ? " acik" : "") + '" id="itOtoKatil">' +
           "Oto-Katıl" + (acik ? " · Açık" : "") +
           (acik ? "" : '<i class="iy-nokta"></i>') +
         "</button>";
    return '<div class="ik-sarmal iy-sarmal">' + h + "</div>";
  }

  function carpismayaKatil(cid) {
    var k = benKey();
    if (!_benim || !k || !bulutVar()) return;
    kok().child(_benim.id).child("carpismalar").child(cid)
      .child("katilan").child(k).set({ ad: benAd() || k, at: saat() })
      .then(function () {
        uyar("Çarpışmaya katıldın.");
        benimiTazele(govdeCiz);
      })
      .catch(function (e) {
        uyar(hataMetni(e, "Katılınamadı"));
        console.warn("[ittifak]", e);
      });
  }

  /* ── SANDIKLAR ────────────────────────────────────────────────
     Tepede anahtar çubuğu (paket alımlarıyla dolar), altında iki
     sekme ve her sekmenin toplanmamış sayısı kırmızı rozette. */
  function sandikEkraniHTML() {
    var sy = sayac();
    var oran = Math.max(0, Math.min(1, sy.anahtar / ANAHTAR_HEDEF));
    var ganimetBekleyen = toplanmamisSayi("ganimet");
    var hediyeBekleyen  = toplanmamisSayi("hediye");

    var h = "";

    h += '<div class="is-tepe">' +
      '<img class="is-sandik" src="gunlukkutukapali.webp" alt="">' +
      '<div class="is-cubuk-satir">' +
        '<span class="is-anahtar">🔑</span>' +
        '<div class="is-cubuk"><div class="is-dolu" style="width:' +
          (oran * 100).toFixed(2) + '%"></div>' +
          "<span>" + sayiBicim(sy.anahtar) + "/" + sayiBicim(ANAHTAR_HEDEF) + "</span></div>" +
        '<button class="is-bilgi" data-bilgi="anahtar">!</button>' +
      "</div>" +
    "</div>";

    function rozet(n) { return n > 0 ? ('<i class="is-rozet">' + (n > 99 ? "99+" : n) + "</i>") : ""; }
    h += '<div class="iy-sekmeler is-sekmeler">' +
      '<button class="iy-sekme' + (_sandikSekme === "ganimet" ? " secili" : "") +
        '" data-sandik-sekme="ganimet">Ganimet Sandığı' + rozet(ganimetBekleyen) + "</button>" +
      '<button class="iy-sekme' + (_sandikSekme === "hediye" ? " secili" : "") +
        '" data-sandik-sekme="hediye">İttifak Hediyesi' + rozet(hediyeBekleyen) + "</button>" +
    "</div>";

    /* Hediye sekmesinin "Git"i HENÜZ BİR YERE GİTMİYOR: İttifak
       Hediyesi'ni ücretli paket alımı açar ve o sistem oyunda yok.
       Mağazaya yollamak yanlış olurdu — oyuncu elmasla alışveriş
       yapıp hediye beklerdi, oysa elmas hediye açmaz. */
    h += '<div class="is-serit">' +
      "<span>" + (_sandikSekme === "ganimet"
        ? ("Anahtar çubuğu dolunca tüm üyelere " + sayiBicim(GANIMET_JETON) +
           " jetonluk Ganimet Sandığı düşer")
        : "Ücretli paket alan üye TÜM ittifaka bir İttifak Hediyesi kazandırır") +
      "</span>" +
      (_sandikSekme === "ganimet"
        ? '<button class="is-git" data-git="magaza">Git</button>'
        : '<button class="is-git" data-yakinda="Ücretli paketler">Git</button>') +
    "</div>";

    var liste = sandikListesi(_sandikSekme);
    h += '<div class="iy-govde">';
    if (!liste.length) {
      h += '<div class="iy-bos"><img class="iy-bos-ikon" src="ittifakikon.webp" alt="">' +
           "<span>Bekleyen sandık yok.</span></div>";
    } else {
      h += liste.map(function (x) {
        var baslik = (x.tur === "ganimet") ? "Ganimet Sandığı" : "İttifak Hediyesi";
        var alt = (x.tur === "ganimet")
          ? "Anahtar çubuğu doldu"
          : (kacar(x.kim || "Bir üye") + ', "' + kacar(x.sebep || "paket") + '" satın aldı');
        return '<div class="is-satir' + (x.toplandi ? " alindi" : "") + '">' +
          '<div class="is-ikon">' +
            '<img src="' + (x.tur === "ganimet" ? "gunlukkutukapali.webp" : "gunlukkutuacik.webp") + '" alt="">' +
            '<span class="is-saat">' + saatYazi(x.at) + "</span>" +
          "</div>" +
          '<div class="it-orta">' +
            '<div class="it-ad">' + baslik + "</div>" +
            '<div class="it-alt">' + alt + "</div>" +
          "</div>" +
          '<div class="is-odul"><span class="it-jeton"></span>' + sayiBicim(x.jeton) + "</div>" +
          (x.toplandi
            ? '<button class="it-dugme it-kapali it-kucuk" disabled>Alındı</button>'
            : '<button class="it-dugme it-kucuk" data-topla="' + kacar(x.id) + '">Topla</button>') +
        "</div>";
      }).join("");
    }
    h += "</div>";

    if (_sandikSekme === "ganimet") {
      h += '<div class="is-sinir">Günlük Ganimet Sandığı Sınırı: ' +
             sayiBicim(ganimetBugun()) + "/" + sayiBicim(GUNLUK_GANIMET_SINIRI) + "</div>";
    } else {
      h += '<label class="is-isimsiz"><input type="checkbox" id="itIsimsiz"' +
             ((st() && st().itIsimsizHediye) ? " checked" : "") +
             ">İsimsiz İttifak Hediyesi Gönder</label>";
    }
    h += '<button class="iy-oto' + (toplanmamisSayi(_sandikSekme) ? " acik" : " sonuk") +
         '" id="itHepsiniAl">Tümünü Al</button>';

    return '<div class="ik-sarmal iy-sarmal">' + h + "</div>";
  }

  /* ── İTTİFAK MAĞAZASI ─────────────────────────────────────────
     Üç sütunlu ızgara; kilitli satırlar referanstaki gibi kırmızı
     örtü + kilit yazısıyla ÜSTÜNE biner (kartlar kaldırılmaz,
     oyuncu neyin kilitli olduğunu görsün). */
  function magazaEkraniHTML() {
    var tur = _magazaSekme;
    var katalog = MAGAZA[tur] || [];
    var sv = ittifakSeviyesi();
    var bitis = (tur === "hafta") ? haftaBitisi() : gunBitisi();

    var h = '<div class="im-yenilenme">Yenilenme: 🕐 <b id="itMagazaSayac">' +
         sureBicimKisa(bitis - Date.now()) + "</b></div>";

    /* Açık satırlar ile kilitli satırlar ayrı ızgaralarda: kilit
       örtüsü YALNIZ kendi ızgarasını kaplasın. */
    var acik = [], kilitli = [];
    katalog.forEach(function (k, i) {
      ((Number(k.sv) || 0) > sv ? kilitli : acik).push({ k: k, i: i });
    });

    function kartHTML(kayit, i, kilit) {
      var tan = urunTanimi(kayit.urun);
      var anahtar = magazaAnahtari(tur, i);
      var kaldi = kayit.kalan - alinan(tur, anahtar);
      var bitti = kaldi <= 0;
      return '<div class="im-kart' + (bitti && !kilit ? " bitti" : "") + '">' +
        (kayit.indirim ? '<i class="im-indirim">-%' + kayit.indirim + "</i>" : "") +
        '<div class="im-kutu">' + urunGorselHTML(tan) +
          (kayit.adet > 1 ? '<i class="im-adet">' + kayit.adet + "</i>" : "") +
        "</div>" +
        '<div class="im-kalan">Kalan: ' + Math.max(0, kaldi) + "</div>" +
        '<button class="im-fiyat' + (bitti || kilit ? " kapali" : "") + '"' +
          (kilit || bitti ? " disabled" : (' data-magaza="' + tur + ":" + i + '"')) + ">" +
          '<span class="it-jeton"></span>' + sayiBicim(kayit.bedel) +
        "</button>" +
      "</div>";
    }

    h += '<div class="iy-govde">';
    if (acik.length) {
      h += '<div class="im-izgara">' +
           acik.map(function (x) { return kartHTML(x.k, x.i, false); }).join("") +
        "</div>";
    }
    if (kilitli.length) {
      var gerek = kilitli.reduce(function (a, x) { return Math.max(a, Number(x.k.sv) || 0); }, 0);
      h += '<div class="im-kilitli">' +
        '<div class="im-izgara">' +
          kilitli.map(function (x) { return kartHTML(x.k, x.i, true); }).join("") +
        "</div>" +
        '<div class="im-kilit-yazi">🔒 Açmak için İttifak Sv. ' + gerek + " düzeyine ulaş</div>" +
      "</div>";
    }
    if (!acik.length && !kilitli.length) {
      h += '<div class="iy-bos"><img class="iy-bos-ikon" src="ittifakikon.webp" alt="">' +
           "<span>Bu sekmede ürün yok.</span></div>";
    }
    h += "</div>";

    h += '<div class="im-altsekme">' +
      '<button class="' + (tur === "gun" ? "secili" : "") + '" data-magaza-sekme="gun">Bugün</button>' +
      '<button class="' + (tur === "hafta" ? "secili" : "") + '" data-magaza-sekme="hafta">Hafta</button>' +
    "</div>";

    return '<div class="ik-sarmal iy-sarmal">' + h + "</div>";
  }

  /* ── GERİ SAYIM ───────────────────────────────────────────────
     Mağaza sayacı saniyede bir GÜNCELLENİR ama ekran YENİDEN
     ÇİZİLMEZ: tam çizim her saniyede bir kaydırma konumunu ve
     dokunma durumunu bozardı. Yalnız tek metin düğümü değişir. */
  var _sayacZm = null;
  function sayacBaslat() {
    sayacDurdur();
    _sayacZm = setInterval(function () {
      var el = document.getElementById("itMagazaSayac");
      if (!el) { sayacDurdur(); return; }
      var bitis = (_magazaSekme === "hafta") ? haftaBitisi() : gunBitisi();
      var kalan = bitis - Date.now();
      if (kalan <= 0) { govdeCiz(); return; }   /* dönem bitti → stok tazelenir */
      el.textContent = sureBicimKisa(kalan);
    }, 1000);
  }
  function sayacDurdur() {
    if (_sayacZm) { clearInterval(_sayacZm); _sayacZm = null; }
  }


  /* ── DOKUNUŞ — tek kapı ───────────────────────────────────── */
  function govdeDokunus(e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var kb = t.closest("[data-katilim]");
    if (kb) { kurKatilim = kb.dataset.katilim; govdeCizKoru(); return; }

    var gb = t.closest("[data-gorunum]");
    if (gb) {
      _gorunum = gb.dataset.gorunum;
      govdeCiz();
      /* Geri sayım YALNIZ mağaza ekranında döner. */
      if (_gorunum === "magaza") sayacBaslat(); else sayacDurdur();
      return;
    }

    /* ── ÜYELER: rütbe grubunu katla / aç ── */
    var rg = t.closest("[data-rutbe]");
    if (rg) {
      var r = rg.dataset.rutbe;
      _kapaliRutbe[r] = !_kapaliRutbe[r];
      govdeCiz();
      return;
    }

    /* ── SAVAŞ ── */
    var ss = t.closest("[data-savas-sekme]");
    if (ss) { _savasSekme = ss.dataset.savasSekme; govdeCiz(); return; }
    if (t.closest("#itOtoKatil")) { otoKatilDegistir(); return; }

    /* ── SANDIKLAR ── */
    var sk = t.closest("[data-sandik-sekme]");
    if (sk) { _sandikSekme = sk.dataset.sandikSekme; govdeCiz(); return; }
    if (t.closest("#itHepsiniAl")) {
      sandikHepsiniTopla(_sandikSekme, ogeNoktasi(t.closest("#itHepsiniAl")));
      return;
    }
    if (t.closest("[data-bilgi]")) {
      uyar("Çubuk ücretli paket alımlarıyla dolar; mağazadan yapılan " +
           "elmas harcaması da %" + Math.round(ELMAS_KATKI * 100) +
           " oranında katkı verir. Dolunca TÜM üyelere " +
           sayiBicim(GANIMET_JETON) + " İttifak Jetonu düşer.");
      return;
    }
    var gt = t.closest("[data-git]");
    if (gt) { magazayaGit(); return; }
    var tp = t.closest("[data-topla]");
    if (tp) {
      var cikis = ogeNoktasi(tp.closest(".is-satir") || tp);
      var oncekiJeton = jeton();
      sandikTopla(tp.dataset.topla, function (oldu, kazanc, sebep) {
        if (oldu) uyar("🪙 " + sayiBicim(kazanc) + " " + JETON_ADI + " alındı!");
        else if (sebep === "sinir") uyar("Günlük ganimet sınırına ulaştın.");
        govdeCiz();
        if (oldu && kazanc > 0) jetonUcusu(cikis, oncekiJeton, kazanc);
      });
      return;
    }

    /* ── İTTİFAK MAĞAZASI ── */
    var ms = t.closest("[data-magaza-sekme]");
    if (ms) { _magazaSekme = ms.dataset.magazaSekme; govdeCiz(); sayacBaslat(); return; }
    var ma = t.closest("[data-magaza]");
    if (ma) {
      var p = String(ma.dataset.magaza).split(":");
      magazaAl(p[0], Number(p[1]));
      return;
    }

    var cb = t.closest("[data-carpisma]");
    if (cb) { carpismayaKatil(cb.dataset.carpisma); return; }

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

  /* ── TOPLAMA UÇUŞU ───────────────────────────────────────────
     Jetonlar sandık satırından başlığın kesesine akar.

     MOTOR OYUNUN KENDİSİNİN: rehber.js'teki window.ODUL_UCUS.
     Günlük ödül ve keşif ödülü zaten onunla uçuyor; jeton da aynı
     yoldan geçsin ki oyunda iki ayrı uçuş hissi olmasın. (Bir ara
     burada elle yazılmış ikinci bir animasyon vardı — sökülüp
     atıldı. odul-efekt.js'teki üçüncü motor ise index.html'e hiç
     bağlı değil, ondan uzak durulur.)

     ÇIKIŞ NOKTASI ÖNCEDEN ALINIR: govdeCiz() satırı yeniden çiziyor,
     eski düğüm DOM'dan düşüyor. Sonradan ölçmeye kalksak uçuş
     ekranın sol üstünden başlardı.

     Sayaç geri sarılıp parçacıklar VARDIKÇA işletilir; sayı tek
     hamlede zıplarsa akış görülmez, uçuş da anlamsız kalır. */
  function jetonUcusu(kaynak, onceki, kazanc) {
    var kese = panel ? panel.querySelector(".im-kese") : null;
    var sayacEl = kese ? kese.querySelector(".it-jeton-sayi") : null;
    if (!sayacEl) return;

    var E = window.ODUL_UCUS;
    /* Motor yoksa ya da çıkış ölçülemediyse: uçuş yok, sayı doğru.
       Efekt süslemedir, doğruluk değil. */
    if (!E || typeof E.ucur !== "function" || !kaynak) {
      sayacEl.textContent = sayiBicim(onceki + kazanc);
      return;
    }

    sayacEl.textContent = sayiBicim(onceki);          /* geri sar */
    var adet = Math.max(5, Math.min(10, Math.round(kazanc / 60)));

    E.ucur({
      kaynak: kaynak, hedef: kese,
      adet: adet, boy: 26, yukari: 95, sure: 780, gecikme: 28,
      icerik: function () {
        return '<img src="' + JETON_SVG + '" alt="">';
      },
      varista: function (varan, son, toplam) {
        sayacEl.textContent = sayiBicim(onceki + Math.round(kazanc * varan / toplam));
        if (typeof E.nabizKutu === "function") E.nabizKutu(kese, son ? 1 : 0.4);
      },
      /* Son değer BURADA da yazılır: yuvarlama yüzünden parçacık
         payları toplamı kazancı tam tutturmayabilir. */
      bitti: function () { sayacEl.textContent = sayiBicim(onceki + kazanc); }
    });
  }

  /* Bir ögenin ekran ortası — uçuşun çıkış noktası. */
  function ogeNoktasi(el) {
    if (!el || !el.getBoundingClientRect) return null;
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* Oyunun KENDİ mağaza panelini açar (Sandıklar ekranındaki "Git").
     Paneli burada YENİDEN KURMAYIZ — openOverlayPanel tek kapıdır. */
  function magazayaGit() {
    kapat();
    if (typeof window.openOverlayPanel === "function") window.openOverlayPanel("shop");
    else uyar("Mağaza açılamadı.");
  }

  /* İsimsiz hediye kutusu: onay kutusu "change" ile çalışır, gövdenin
     tıklama kapısıyla değil. Her çizimden sonra yeniden bağlanır. */
  function isimsizBagla() {
    var el = document.getElementById("itIsimsiz");
    if (!el || el.dataset.bagli) return;
    el.dataset.bagli = "1";
    el.addEventListener("change", function () {
      var s = st();
      if (!s) return;
      s.itIsimsizHediye = !!el.checked;
      yaz();
      uyar(el.checked
        ? "Hediyelerin bundan sonra isimsiz gönderilecek."
        : "Hediyelerinde adın görünecek.");
    });
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

  /* Üyeler ekranındaki arama. İttifak aramasıyla aynı kalıp:
     yeniden çizim odağı öldürmesin diye imleç yeri geri konur. */
  function uyeAramaBagla() {
    var el = document.getElementById("itUyeArama");
    if (!el || el.dataset.bagli) return;
    el.dataset.bagli = "1";
    el.addEventListener("input", function () {
      _uyeArama = el.value;
      var yer = el.selectionStart;
      govdeCiz();
      var yeni = document.getElementById("itUyeArama");
      if (yeni) {
        yeni.focus();
        try { yeni.setSelectionRange(yer, yer); } catch (e) {}
        uyeAramaBagla();
      }
    });
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

    /* Hayalet dokunma kalkanı — kural index.html'de (hayaletKalkani).
       Kendi kopyasını tutmaz: kalkanın süresi bir gün değişirse tek
       yerde değişsin. Yardımcı yoksa (dosya tek başına yüklendiyse)
       aynı işi yerinde yapar. */
    if (typeof window.hayaletKalkani === "function") {
      window.hayaletKalkani(panel);
    } else {
      clearTimeout(panel._hayaletZm);
      panel.style.pointerEvents = "none";
      panel._hayaletZm = setTimeout(function () { panel.style.pointerEvents = ""; }, 350);
    }

    _yukleniyor = true;
    _uyeArama = "";
    _kapaliRutbe = {};
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
      if (_benim) {
        gucHesapla(function () { if (_benim && _gorunum === "ana") govdeCiz(); });
        /* Ömrü dolmuş sandıklar burada bir kez süpürülür; ekran
           beklemez, liste onları zaten göstermiyordu. */
        sandikBudama();
      }
    });

    var kart = panel.querySelector(".overlay-card");
    if (kart && !kapaliHareket()) {
      kart.animate([{ opacity: 0, transform: "translateY(18px)" },
                    { opacity: 1, transform: "translateY(0)" }],
                   { duration: 240, easing: "cubic-bezier(.2,.85,.3,1)" });
    }
  }

  function kapat() {
    sayacDurdur();
    if (panel) panel.classList.remove("active");
  }

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

  function baslat() { stilBas(); iskelet(); dockBagla(); magazaBagla(); }

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

    /* İttifak parası — başka dosyalar okuyup harcayabilsin diye. */
    jeton: jeton,
    jetonEkle: jetonEkle,
    seviye: ittifakSeviyesi,

    /* ÜCRETLİ PAKET KAPISI — gerçek para ile satın alma sistemi
       kurulduğunda, alım BAŞARIYLA bittiği yerden çağır:
         ITTIFAK.paketAlindi("Günlük Teklifler", bedel)
       Tam oranla sayaca yazar ve TÜM üyelere İttifak Hediyesi açar.
       Şu an hiçbir yerden çağrılmıyor (oyunda ücretli alım yok). */
    paketAlindi: paketAlindi,

    /* Oyun içi elmas harcaması — düşük oranlı katkı, hediye yok.
       magaza.js'teki buyItem bunu kendiliğinden çağırır. */
    elmasHarcandi: elmasHarcandi,
    ELMAS_KATKI: ELMAS_KATKI,

    /* ÇARPIŞMA AÇ — Savaş ekranının Seferberlik/Bireysel/Etkinlik
       listeleri bu kayıtları gösterir. Çağrı ÜRETEN sistem henüz
       yok; kapı burada ki geldiğinde ekran yeniden kurulmasın.
         tur   → "seferberlik" | "bireysel" | "etkinlik"
         ad    → listede görünen başlık
         sureMs→ çağrının açık kalma süresi */
    carpismaAc: function (tur, ad, sureMs) {
      if (!_benim || !bulutVar()) return null;
      var simdi = Date.now();
      return kok().child(_benim.id).child("carpismalar").push({
        tur: tur || "seferberlik",
        ad: String(ad || "Çarpışma").slice(0, 48),
        kim: benAd() || "",
        /* `at` ve `biter` AYNI SAATTEN gelmeli: liste ikisini de
           yerel saatle karşılaştırıyor (sıralama ve süre dolumu).
           Biri sunucu damgası olsaydı saatler ayrışırdı. */
        at: simdi,
        biter: simdi + (Number(sureMs) || 10 * 60 * 1000),
        katilan: {}
      });
    },
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
