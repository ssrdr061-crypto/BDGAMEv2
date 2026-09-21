/* profil.js — ŞEF PROFİLİ: üst sağdaki avatar çerçevesi + profil ekranı
   ═══════════════════════════════════════════════════════════════
   NE YAPAR
   1) Üst şeridin sağındaki 👤 emojisinin yerine FOTOĞRAF ÇERÇEVESİ
      koyar. Oyuncu kendi fotoğrafını yükleyebilir.
   2) Çerçeveye dokununca "Şef Profili" tam ekranı açılır: büyük
      görsel, ad, kimlik, güç, kale seviyesi, ittifak, dayanıklılık
      şeridi ve dört düğme (Görünümler · Birlikler · Liderlik
      Tablosu · Ayarlar).
   3) Alt menüdeki 🏆 sıralama düğmesi kaldırıldı; sıralama artık
      bu ekrandaki "Liderlik Tablosu" düğmesinden açılıyor.
      PANELİN KENDİSİNE DOKUNULMADI — `#panel-rank` ve onu dolduran
      kod aynen duruyor, yalnız KAPI değişti.

   ── DEĞERLER NEREDEN GELİYOR (hepsi mevcut kapılardan) ──
   güç      → `computePlayerPower(state)`   (sıralamanın okuduğu aynı işlev)
   seviye   → `kaleSeviyesi()`
   ittifak  → `ITTIFAK.benim()`             (kısayol; bulut değil)
   dayanık. → `state.stamina`               (üst şeritteki aynı sayaç)
   ad       → `currentUsername`
   İkinci bir hesap ya da ikinci bir sayaç AÇILMADI.

   ── OYUNDA OLMAYAN ALANLAR ──
   "Öldürme" ve "Eyalet" oyunda YOK. Referans ekranda oldukları için
   satırları çizilir ama sönük ve "—" ile — birlik Nitelikler
   ekranındaki HIZ/YÜK ile aynı kalıp. O veri yazıldığı gün burada
   hiçbir şey değiştirmeden dolarlar. Uydurma sayı yazılmaz.
   "Görünümler" de aynı sebeple pasif.

   ── FOTOĞRAF NEREDE DURUYOR ──
   localStorage `bdProfilFoto_<hesap>`, **state'e YAZILMAZ**:
   (a) Tuzak 7 — `compactStateForExport`a girmeyen alan her girişte
       sıfırlanır, girseydi de her kayıtta buluta yüz kilobayt
       taşınırdı;
   (b) fotoğraf oyunun verisi değil, o telefonun tercihi.
   Yüklenen görsel canvas ile KARE kırpılıp FOTO_BOY'a küçültülür ve
   JPEG olarak saklanır — ham dosya megabaytlarca olabilir,
   localStorage dolunca oyunun KAYDI da yazılamaz (Tuzak 6).

   GERİ DÖNÜŞ: index.html'den <script src="profil.js"> satırını sil
   (avatar yerine yine 👤 emojisi gelir, profil ekranı kaybolur) ve
   alt menüdeki sıralama düğmesini geri koy — o satır index.html'de
   yorum olarak duruyor.
   ═══════════════════════════════════════════════════════════════ */
(function profilEkrani() {
  "use strict";

  var SURUM = "profil-1";

  var FOTO_BOY  = 256;   /* saklanan fotoğrafın kenarı, px */
  var FOTO_KALITE = 0.82;
  var HAYALET_MS = 350;

  var kat = null, fotoInput = null, pilAvatar = null;
  var acik = false, hayaletBitis = 0;

  function anahtar() {
    var ad = "";
    try { ad = (typeof currentUsername !== "undefined" && currentUsername) ? String(currentUsername) : ""; }
    catch (e) {}
    return "bdProfilFoto_" + ad.toLowerCase();
  }

  function fotoOku() {
    try { return localStorage.getItem(anahtar()) || ""; } catch (e) { return ""; }
  }

  function fotoYaz(veri) {
    try { localStorage.setItem(anahtar(), veri); return true; }
    catch (e) {
      /* Depo dolu: sessizce yutulursa oyuncu "yükledim ama gelmedi"
         der. Bildirimler kapalı olduğu için showToastForce (Tuzak 9). */
      try { if (typeof showToastForce === "function") showToastForce("Fotoğraf kaydedilemedi — telefon deposu dolu olabilir.", 4000); } catch (e2) {}
      return false;
    }
  }

  /* ── DEĞER KAPILARI — hepsi mevcut işlevler, ikinci hesap yok ── */
  function guc() {
    try { if (typeof computePlayerPower === "function") return computePlayerPower(state); } catch (e) {}
    return null;
  }
  function seviye() {
    try { if (typeof kaleSeviyesi === "function") return kaleSeviyesi(); } catch (e) {}
    return null;
  }
  function ittifak() {
    try {
      if (window.ITTIFAK && typeof window.ITTIFAK.benim === "function") {
        var i = window.ITTIFAK.benim();
        if (i && i.ad) return i;
      }
    } catch (e) {}
    return null;
  }
  function dayaniklilik() {
    try { if (state && state.stamina) return state.stamina; } catch (e) {}
    return null;
  }
  function ad() {
    try { return (typeof currentUsername !== "undefined" && currentUsername) ? currentUsername : ""; }
    catch (e) { return ""; }
  }
  /* Ekrandaki ad ittifak etiketiyle gösterilir — haritadaki ve
     sohbetteki yazımla aynı olsun diye. Etiket ITTIFAK'tan gelir. */
  function tamAd() {
    var i = ittifak();
    return (i && i.etiket ? "[" + i.etiket + "]" : "") + ad();
  }
  function sayi(n) {
    if (n === null || n === undefined || !isFinite(n)) return "—";
    try { if (typeof fmt === "function") return fmt(Math.floor(n)); } catch (e) {}
    return String(Math.floor(n));
  }

  /* ── STİL ─────────────────────────────────────────────────────
     Renkler tema.js `koyuMaviTema` bloğunun --km-* değişkenlerinden
     okunur; ikinci palet açılmaz (Tuzak 38: sayıyla ezme yarışına
     girmek yerine temanın kendi kaynağına bağlanıyoruz). */
  function stilYaz() {
    if (document.getElementById("profilStil")) return;
    var s = document.createElement("style");
    s.id = "profilStil";
    s.textContent = [
      /* ÜST ŞERİTTEKİ ÇERÇEVE. Kutu kare, fotoğraf kareyi `cover` ile
         tam doldurur; fotoğraf yokken içeride ince bir kişi çizimi
         durur (emoji değil — çerçevenin içinde emoji kirli duruyor). */
      /* BOY = ŞERİDİN ÖLÇÜLEN BOYU (bkz. boyAyarla).
         Değişkenden (--hud-h + --guc-buyume) hesaplamayı DENEDİK,
         tutmadı: şeridin gerçek yüksekliğini o iki değişken tek
         başına vermiyor. Ölçü artık getBoundingClientRect'ten
         geliyor, yükseklik/genişlik JS ile yazılıyor.

         ÇAPA .hud-top OLMAK ZORUNDA: kutu akışta kalsaydı üst satırı
         kendi boyuna zorlar, şerit uzardı. Ama guchud.js şeridin
         DOĞRUDAN ÇOCUKLARINA transform veriyor; transform'lu öğe
         kendisi çapa olur — kutu bu yüzden #logoutBtn'e göre
         konumlanıp aşağı kaymış ve sağ kenara yapışmıştı (ölçüldü).
         Çözüm: #logoutBtn'in transform'u kapatılır, tek çapa
         .hud-top kalır. O düğme artık yalnız yer ayıran boş pay,
         kayması gereken bir içeriği yok. */
      "html body #worldScreen .hud-top{ position:relative !important; }",
      "html body #worldScreen .hud-top #profilAvatar{",
      "  position:absolute !important;",
      "  right:var(--pa-sag, 7px) !important;",
      "  flex:none !important; transform:none !important; z-index:3 !important;",
      "  border-radius:10px !important; border-width:2px !important;",
      "}",
      /* #logoutBtn artık kutuyu TAŞIMAZ, yerini AYIRIR. Genişliği de
         boyAyarla yazar (kutu kadar + boşluk). Ayraç çizgisi
         kaldırıldı, ad yazısı gizlendi (pay kutu kadar dar, yazı
         çerçevenin altından sızıyordu; ad profil ekranında duruyor). */
      "html body #worldScreen .hud-top > #logoutBtn{",
      "  transform:none !important;",
      "  padding:0 !important; border-left:none !important; min-width:0 !important;",
      "  overflow:visible !important;",
      "}",
      "html body #worldScreen .hud-top > #logoutBtn #currentUserLabel{ display:none !important; }",
      "#profilAvatar{",
      "  display:inline-flex; align-items:center; justify-content:center;",
      "  box-sizing:border-box; width:22px; height:22px; padding:0;",
      "  border:1.5px solid rgba(255,255,255,.92); border-radius:7px;",
      "  background:rgba(3,16,38,.35); overflow:hidden; flex:0 0 22px;",
      "  cursor:pointer; -webkit-tap-highlight-color:transparent;",
      "}",
      "#profilAvatar img{width:100%; height:100%; object-fit:cover; display:block; background:none;}",
      "#profilAvatar svg{width:70%; height:70%; display:block; fill:rgba(233,246,255,.85);}",
      "#profilAvatar:active{transform:scale(.96); filter:brightness(.93);}",

      "#profilEkran{",
      "  position:fixed; inset:0; z-index:50; display:none;",
      "  flex-direction:column;",
      "  background:linear-gradient(180deg, var(--km-1,#3d7ccc) 0%, var(--km-2,#22488f) 52%, var(--km-3,#152e5e) 100%);",
      "  color:var(--km-yazi,#eaf4ff);",
      "  font-family:'Baloo 2','Nunito',sans-serif;",
      "}",
      "#profilEkran.acik{display:flex;}",
      "#profilEkran .pr-bas{flex:0 0 auto; display:flex; align-items:center; gap:10px; padding:10px 12px 6px;}",
      "#profilEkran .pr-geri{",
      "  width:34px; height:34px; flex:0 0 34px; padding:0; border:none; border-radius:10px;",
      "  background:rgba(3,16,38,.30); color:var(--km-yazi,#eaf4ff);",
      "  font-size:20px; font-weight:900; line-height:1; cursor:pointer;",
      "  -webkit-tap-highlight-color:transparent;",
      "}",
      "#profilEkran .pr-geri:active{transform:scale(.96); filter:brightness(.93);}",
      "#profilEkran .pr-baslik{font-size:17px; font-weight:900; text-shadow:0 1px 2px rgba(0,20,45,.55);}",

      /* BÜYÜK GÖRSEL. Referansta oyuncunun karakteri duruyor; bizde
         oyuncu karakteri YOK, o yüzden yüklenen fotoğraf büyütülür.
         Fotoğraf yoksa "Fotoğraf yükle" yazan boş çerçeve durur —
         yerine ilgisiz bir oyun görseli konmaz. */
      "#profilEkran .pr-sahne{",
      "  flex:1 1 auto; min-height:0; display:flex; align-items:center; justify-content:center;",
      "  padding:6px 12px;",
      "}",
      "#profilEkran .pr-buyuk{",
      "  box-sizing:border-box; width:min(58vw,210px); aspect-ratio:1/1;",
      "  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;",
      "  border:2px solid rgba(255,255,255,.92); border-radius:18px; overflow:hidden;",
      "  background:rgba(3,16,38,.30); box-shadow:0 2px 6px rgba(0,20,45,.3);",
      "  color:rgba(233,246,255,.75); font-size:12.5px; font-weight:800;",
      "  cursor:pointer; -webkit-tap-highlight-color:transparent;",
      "}",
      "#profilEkran .pr-buyuk img{width:100%; height:100%; object-fit:cover; display:block; background:none;}",
      "#profilEkran .pr-buyuk svg{width:46%; height:46%; fill:rgba(233,246,255,.55);}",

      "#profilEkran .pr-kart{",
      "  flex:0 0 auto; margin:0 12px; padding:10px;",
      "  display:flex; gap:10px;",
      "  background:rgba(3,16,38,.30); border:1px solid rgba(160,215,255,.20);",
      "  border-radius:14px; box-shadow:0 2px 6px rgba(0,20,45,.3);",
      "}",
      "#profilEkran .pr-sol{flex:0 0 76px; display:flex; flex-direction:column; align-items:center; gap:6px;}",
      "#profilEkran .pr-kucuk{",
      "  box-sizing:border-box; width:62px; height:62px;",
      "  display:flex; align-items:center; justify-content:center;",
      "  border:1.5px solid rgba(255,255,255,.92); border-radius:12px; overflow:hidden;",
      "  background:rgba(3,16,38,.35); cursor:pointer;",
      "}",
      "#profilEkran .pr-kucuk img{width:100%; height:100%; object-fit:cover; display:block; background:none;}",
      "#profilEkran .pr-kucuk svg{width:60%; height:60%; fill:rgba(233,246,255,.75);}",
      "#profilEkran .pr-yukle{",
      "  width:100%; padding:5px 4px; border:none; border-radius:9px;",
      "  background:#2DC9FC; color:#0d2a36; font-family:inherit;",
      "  font-size:11px; font-weight:900; cursor:pointer;",
      "  -webkit-tap-highlight-color:transparent;",
      "}",
      "#profilEkran .pr-yukle:active{transform:scale(.96); filter:brightness(.93);}",
      "#profilEkran .pr-sag{flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:4px;}",
      "#profilEkran .pr-ad{",
      "  padding:5px 9px; border-radius:9px; background:rgba(3,16,38,.40);",
      "  font-size:14px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;",
      "}",
      "#profilEkran .pr-satirlar{display:grid; grid-template-columns:1fr auto; gap:2px 10px; font-size:12.5px; font-weight:800;}",
      "#profilEkran .pr-s{display:flex; align-items:center; gap:6px; min-width:0;}",
      "#profilEkran .pr-s b{font-weight:900; font-variant-numeric:tabular-nums;}",
      "#profilEkran .pr-s.pr-yok{opacity:.55;}",
      "#profilEkran .pr-cubuk{",
      "  margin-top:2px; height:16px; border-radius:999px; overflow:hidden;",
      "  background:rgba(3,16,38,.45); position:relative;",
      "}",
      "#profilEkran .pr-cubuk i{position:absolute; left:0; top:0; bottom:0; background:#2fbf5a; display:block;}",
      "#profilEkran .pr-cubuk span{",
      "  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;",
      "  font-size:11.5px; font-weight:900; font-variant-numeric:tabular-nums;",
      "  color:#eaf4ff; text-shadow:0 1px 2px rgba(0,20,45,.55);",
      "}",

      "#profilEkran .pr-dugmeler{",
      "  flex:0 0 auto; display:grid; grid-template-columns:repeat(4,1fr); gap:6px;",
      "  padding:10px 12px calc(12px + env(safe-area-inset-bottom,0px));",
      "}",
      "#profilEkran .pr-d{",
      "  display:flex; flex-direction:column; align-items:center; gap:4px;",
      "  padding:8px 3px; border:none; border-radius:12px;",
      "  background:rgba(3,16,38,.30); color:var(--km-yazi,#eaf4ff);",
      "  font-family:inherit; font-size:10.5px; font-weight:800; line-height:1.15;",
      "  cursor:pointer; -webkit-tap-highlight-color:transparent;",
      "}",
      "#profilEkran .pr-d svg{width:22px; height:22px; fill:currentColor;}",
      "#profilEkran .pr-d:active{transform:scale(.96); filter:brightness(.93);}",
      "#profilEkran .pr-d[disabled]{opacity:.45; cursor:default;}",
      "#profilEkran .pr-d[disabled]:active{transform:none; filter:none;}"
    ].join("\n");
    document.head.appendChild(s);
  }

  /* ── SİMGELER — satır içi SVG, tek renk, düz çizim (emoji yok) ── */
  var SIM = {
    kisi:  '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.5-8 5.5V22h16v-2.5c0-3-3.6-5.5-8-5.5Z"/></svg>',
    gorun: '<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 4.4 3.4 8.3 8 9 4.6-.7 8-4.6 8-9V6l-8-3Zm0 4 1.3 2.9 3.2.3-2.4 2.1.7 3.1L12 13.8 9.2 15.4l.7-3.1-2.4-2.1 3.2-.3L12 7Z"/></svg>',
    birlik:'<svg viewBox="0 0 24 24"><path d="M3 5h18v2.5H3V5Zm0 5.75h18v2.5H3v-2.5ZM3 16.5h18V19H3v-2.5Z"/></svg>',
    kupa:  '<svg viewBox="0 0 24 24"><path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.6A5 5 0 0 1 13 14.9V17h3v2H8v-2h3v-2.1a5 5 0 0 1-2.4-2.9H8a4 4 0 0 1-4-4V5h3V3Zm0 4H6v1a2 2 0 0 0 1 1.7V7Zm10 0v2.7A2 2 0 0 0 18 8V7h-1Z"/></svg>',
    ayar:  '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 4c0 .6-.05 1.2-.14 1.7l2 1.55-2 3.46-2.36-.95a7.6 7.6 0 0 1-2.9 1.7L15.2 22H8.8l-.4-2.54a7.6 7.6 0 0 1-2.9-1.7l-2.36.95-2-3.46 2-1.55a7.9 7.9 0 0 1 0-3.4l-2-1.55 2-3.46 2.36.95a7.6 7.6 0 0 1 2.9-1.7L8.8 2h6.4l.4 2.54c1.07.35 2.05.93 2.9 1.7l2.36-.95 2 3.46-2 1.55c.09.5.14 1.1.14 1.7Z"/></svg>'
  };

  function gorselKutu(veri) {
    return veri ? '<img src="' + veri + '" alt="">' : SIM.kisi;
  }

  /* ── ÜST ŞERİTTEKİ ÇERÇEVE ────────────────────────────────────
     #logoutBtn'in içindeki 👤 metin düğümü kaldırılır, yerine kutu
     konur. Ad yazısı (#currentUserLabel) ve düğmenin kendisi
     DURUR — onu besleyen kod (startSessionFor) değişmedi. Düğmenin
     eski işi (çıkış onayı) profildeki "Ayarlar"a taşındı. */
  /* ── KUTU BOYU = ŞERİT BOYU ───────────────────────────────────
     Şeridin yüksekliği CSS'te tek bir değişkenden okunamıyor:
     guchud.js, tema.js ve güvenli alan payı üst üste biniyor.
     O yüzden ölçülür. clientHeight DOLGU KUTUSUDUR — absolute
     konumun "top"u da ona göredir, ikisi aynı kutu; üstten ve
     alttan 3'er px pay bırakılır, kutu kare olur.
     PAY = kutu + sağ boşluk + 3px; #logoutBtn akışta bu kadar yer
     tutar ki şeritteki diğer öğeler çerçevenin altına girmesin. */
  function boyAyarla() {
    var ust = document.querySelector("#worldScreen .hud-top");
    var pil = document.getElementById("logoutBtn");
    if (!ust || !pilAvatar) return;
    var h = ust.clientHeight;
    if (!h) return;                       /* henüz çizilmemiş */
    var boy = Math.max(18, Math.round((h - 6) * 10) / 10);
    var sag = 7;
    pilAvatar.style.width  = boy + "px";
    pilAvatar.style.height = boy + "px";
    pilAvatar.style.top    = Math.round((h - boy) / 2 * 10) / 10 + "px";
    pilAvatar.style.right  = sag + "px";
    if (pil) {
      pil.style.flex = "0 0 " + (boy + sag + 3) + "px";
      /* guchud.js şeridin doğrudan çocuklarına transform yazıyor ve
         o seçicinin özgüllüğü daha yüksek (:not(#id) kimlik sayılır)
         — CSS'ten kapatmak yetmedi, ölçüldü: kutu 11px şerit dışına
         taşıyordu. Satır içi !important tek kazanan yol. Transform
         kalkmazsa #logoutBtn kendisi çapa olur, kutu şeride değil
         düğmeye göre yerleşir. */
      pil.style.setProperty("transform", "none", "important");
    }
  }

  function pilKur() {
    var pil = document.getElementById("logoutBtn");
    if (!pil || pil.dataset.profil) return false;
    pil.dataset.profil = "1";
    stilYaz();

    for (var i = pil.childNodes.length - 1; i >= 0; i--) {
      var n = pil.childNodes[i];
      if (n.nodeType === 3) pil.removeChild(n);     /* 👤 ve boşluklar */
    }

    pilAvatar = document.createElement("span");
    pilAvatar.id = "profilAvatar";
    pilAvatar.innerHTML = gorselKutu(fotoOku());
    pil.insertBefore(pilAvatar, pil.firstChild);

    boyAyarla();
    if (window.ResizeObserver) {
      var ust = document.querySelector("#worldScreen .hud-top");
      if (ust) new ResizeObserver(boyAyarla).observe(ust);
    }
    window.addEventListener("resize", boyAyarla);
    window.addEventListener("orientationchange", boyAyarla);
    setTimeout(boyAyarla, 300);
    setTimeout(boyAyarla, 1500);

    /* Çıkış onayı yerine profil açılır. ESKİ DİNLEYİCİ SİLİNMEZ,
       önüne geçilir — ama dinleyici DÜĞMENİN ÜSTÜNE konamaz:
       index.html `safeBind` ile aynı düğmeye DAHA ÖNCE bağlanmış ve
       bir öğenin kendi dinleyicileri, yakalama/köpürme fark etmeden
       BAĞLANMA SIRASINA göre çalışır — sonradan eklenen
       `stopImmediatePropagation` ona yetişemez (ölçüldü: çıkış
       penceresi yine açılıyordu). Kapı bu yüzden `document`ın
       yakalama evresinde: orası düğmenin kendi dinleyicilerinden
       ÖNCE çalışır. */
    /* VE OLAY "click" DEĞİL: `safeBind` PointerEvent varsa
       **pointerup** bağlıyor (index.html safeBind). Yalnız click'i
       durdurmak çıkış penceresini engellemiyordu — ölçüldü, pencere
       yine açılıyordu. İkisi de durdurulur: pointerup'ta profil
       açılır, hemen ardından gelen click sessizce yutulur. */
    ["pointerup", "click"].forEach(function (tur) {
      document.addEventListener(tur, function (e) {
        if (!e.target || !e.target.closest) return;
        if (!e.target.closest("#logoutBtn")) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        if (tur === "pointerup") ac();
      }, true);
    });
    return true;
  }

  function pilTazele() {
    if (pilAvatar) pilAvatar.innerHTML = gorselKutu(fotoOku());
  }

  /* ── FOTOĞRAF SEÇME ───────────────────────────────────────────
     Kare kırpılır ve küçültülür; ham dosya saklanmaz. */
  function fotoSec() {
    if (!fotoInput) {
      fotoInput = document.createElement("input");
      fotoInput.type = "file";
      fotoInput.accept = "image/*";
      fotoInput.style.display = "none";
      document.body.appendChild(fotoInput);
      fotoInput.addEventListener("change", function () {
        var f = fotoInput.files && fotoInput.files[0];
        fotoInput.value = "";
        if (f) fotoIsle(f);
      });
    }
    fotoInput.click();
  }

  function fotoIsle(dosya) {
    var okuyucu = new FileReader();
    okuyucu.onload = function () {
      var im = new Image();
      im.onload = function () {
        try {
          var k = Math.min(im.naturalWidth, im.naturalHeight);   /* kare kırpma */
          var sx = (im.naturalWidth  - k) / 2;
          var sy = (im.naturalHeight - k) / 2;
          var c = document.createElement("canvas");
          c.width = c.height = FOTO_BOY;
          c.getContext("2d").drawImage(im, sx, sy, k, k, 0, 0, FOTO_BOY, FOTO_BOY);
          var veri = c.toDataURL("image/jpeg", FOTO_KALITE);
          if (fotoYaz(veri)) { pilTazele(); ekranTazele(); }
        } catch (e) {
          try { if (typeof showToastForce === "function") showToastForce("Fotoğraf işlenemedi.", 4000); } catch (e2) {}
        }
      };
      im.onerror = function () {
        try { if (typeof showToastForce === "function") showToastForce("Bu dosya bir görsel değil.", 4000); } catch (e2) {}
      };
      im.src = okuyucu.result;
    };
    okuyucu.readAsDataURL(dosya);
  }

  /* ── EKRAN ────────────────────────────────────────────────────── */
  function ekranKur() {
    if (kat) return;
    stilYaz();
    kat = document.createElement("div");
    kat.id = "profilEkran";
    kat.innerHTML =
      '<div class="pr-bas">' +
        '<button class="pr-geri" type="button" aria-label="Geri">←</button>' +
        '<span class="pr-baslik">Şef Profili</span>' +
      '</div>' +
      '<div class="pr-sahne"><div class="pr-buyuk" data-foto></div></div>' +
      '<div class="pr-kart">' +
        '<div class="pr-sol">' +
          '<div class="pr-kucuk" data-foto></div>' +
          '<button class="pr-yukle" type="button">Fotoğraf</button>' +
        '</div>' +
        '<div class="pr-sag">' +
          '<div class="pr-ad"></div>' +
          '<div class="pr-satirlar"></div>' +
          '<div class="pr-cubuk"><i></i><span></span></div>' +
        '</div>' +
      '</div>' +
      '<div class="pr-dugmeler">' +
        '<button class="pr-d" type="button" data-is="gorunum" disabled>' + SIM.gorun  + '<span>Görünümler</span></button>' +
        '<button class="pr-d" type="button" data-is="birlik">'            + SIM.birlik + '<span>Birlikler</span></button>' +
        '<button class="pr-d" type="button" data-is="siralama">'          + SIM.kupa   + '<span>Liderlik Tablosu</span></button>' +
        '<button class="pr-d" type="button" data-is="ayar">'              + SIM.ayar   + '<span>Ayarlar</span></button>' +
      '</div>';
    document.body.appendChild(kat);

    kat.querySelector(".pr-geri").addEventListener("click", function (e) {
      e.stopPropagation(); kapat();
    });
    kat.addEventListener("click", function (e) {
      if (Date.now() < hayaletBitis) return;          /* Tuzak 21 */
      if (e.target.closest(".pr-yukle") || e.target.closest("[data-foto]")) { fotoSec(); return; }
      var d = e.target.closest(".pr-d");
      if (!d || d.disabled) return;
      dugme(d.dataset.is);
    });
  }

  /* Düğmeler MEVCUT kapıları çağırır; ikinci bir açılış yolu
     yazılmadı. Sıralama paneli de alt menüdekiyle aynı panel. */
  function dugme(is) {
    if (is === "birlik") {
      kapat();
      try { if (typeof openOverlayPanel === "function") openOverlayPanel("troops"); } catch (e) {}
    } else if (is === "siralama") {
      kapat();
      try { if (typeof openOverlayPanel === "function") openOverlayPanel("rank"); } catch (e) {}
    } else if (is === "ayar") {
      kapat();
      try { if (typeof showLogoutConfirm === "function") showLogoutConfirm(); } catch (e) {}
    }
  }

  function satir(etiket, deger, yok) {
    return '<span class="pr-s' + (yok ? " pr-yok" : "") + '">' + etiket +
           ' <b>' + deger + '</b></span>';
  }

  function ekranTazele() {
    if (!kat) return;
    var foto = fotoOku();
    var kutular = kat.querySelectorAll("[data-foto]");
    for (var i = 0; i < kutular.length; i++) {
      var ic = foto ? '<img src="' + foto + '" alt="">' : SIM.kisi;
      if (!foto && kutular[i].classList.contains("pr-buyuk")) ic += "<span>Fotoğraf yükle</span>";
      if (kutular[i].innerHTML !== ic) kutular[i].innerHTML = ic;
    }

    kat.querySelector(".pr-ad").textContent = tamAd();

    var it = ittifak();
    var sv = seviye();
    kat.querySelector(".pr-satirlar").innerHTML =
      satir("Güç",      sayi(guc())) +
      satir("Kale",     (sv === null ? "—" : "Sv. " + sv)) +
      satir("Öldürme",  "—", true) +
      satir("İttifak",  (it ? it.ad : "—"), !it) +
      satir("Kimlik",   (ad() || "—")) +
      satir("Eyalet",   "—", true);

    var st = dayaniklilik();
    var dolu = kat.querySelector(".pr-cubuk i");
    var yazi = kat.querySelector(".pr-cubuk span");
    if (st && st.max > 0) {
      dolu.style.width = Math.max(0, Math.min(100, (st.current / st.max) * 100)) + "%";
      yazi.textContent = Math.floor(st.current) + "/" + Math.floor(st.max);
    } else {
      dolu.style.width = "0%";
      yazi.textContent = "—";
    }
  }

  function ac() {
    ekranKur();
    acik = true;
    hayaletBitis = Date.now() + HAYALET_MS;
    ekranTazele();
    kat.classList.add("acik");
  }

  function kapat() {
    acik = false;
    if (kat) kat.classList.remove("acik");
  }

  /* Ekran açıkken değerler canlı kalsın (güç ve dayanıklılık
     oyunun kendi zamanlayıcılarıyla değişiyor). */
  function tik() {
    if (!pilAvatar) pilKur();
    if (acik) ekranTazele();
  }

  function basla() {
    pilKur();
    setInterval(tik, 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", basla);
  else basla();

  window.PROFIL = { SURUM: SURUM, ac: ac, kapat: kapat, tazele: ekranTazele };
})();
