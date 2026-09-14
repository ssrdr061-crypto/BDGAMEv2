/* kalkanrozet.js — ÜST SOLDA KALKAN ROZETİ + SÜRE PENCERESİ
   ═══════════════════════════════════════════════════════════════
   NE YAPAR
   Kalende kalkan AÇIKKEN üst şeridin altında, sol köşede küçük bir
   kalkan düğmesi belirir. Dokununca altında bir pencere açılır:
   "Şehrini saldırılardan korur" + kalkan satırı + geri sayım.
   Kalkan bitince düğme de pencere de kendiliğinden kaybolur.

   TEK DOĞRULUK KAYNAĞI
   Süreyi burada HESAPLAMIYORUZ. `window.kalkanKalanMs()` (index.html)
   tek okuma kapısıdır — haritadaki kubbe (tema.js), saldırı kilidi
   (pvp.js) ve sefer varışı da aynı kapıdan sorar. Biçim de kendi
   kopyamız değil, `saatBicim()` (index.html, 00:00:00). İkisi de
   yoksa rozet çizilmez / süre "--:--:--" kalır; ikinci bir hesap
   ya da ikinci bir biçimlendirici AÇILMAZ.

   YER — NEDEN ÖLÇÜLEREK KONULUYOR
   Üst şeridin boyu sabit değil: guchud.js güç satırını, tema.js de
   şeridin kendisini ayar panelinden büyütüp küçültebiliyor. Sabit
   bir `top` yazmak, şerit uzayınca rozeti şeridin altına gömerdi.
   Rozetin üst kenarı her saniye `.hud-top`un ÖLÇÜLEN alt kenarından
   türetilir. Ayrıca kaleiçindeki "← Haritaya dön" düğmesi
   (#kaleiciKapat) soldaki aynı sütunda duruyor: rozet ona binmesin
   diye, o düğme görünürken rozet onun üstünde kalacak şekilde
   yukarı çekilir (ARA kadar boşluk bırakarak).
   Tuzak 19/20: position:fixed → offsetParent null, ölçü
   getBoundingClientRect ile alınır.

   Z-SIRASI 41: kaleiçi tuvalinin (30) ÜSTÜNDE, paneller (50),
   savaş alanı (60) ve kahraman ekranının (400) ALTINDA — yani
   kaleiçinde görünür, bir panel açılınca onun altında kalır.

   Tuzak 21 (hayalet tıklama): pencere açıldıktan sonraki ilk
   HAYALET_MS boyunca tıklamaya kapalıdır.
   Tuzak 11: CSS animasyonu yok — prefers-reduced-motion hepsini
   öldürürdü, zaten hareketli bir şey yapmıyoruz.

   GERİ DÖNÜŞ TEK HAMLE: index.html'deki <script src="kalkanrozet.js">
   satırını sil. Başka hiçbir dosyaya dokunulmadı.
   ═══════════════════════════════════════════════════════════════ */
(function kalkanRozet() {
  "use strict";

  var SURUM = "kalkanrozet-3";

  /* BOY tek kaynak: rozetin ölçüsünü, köşesini ve komşularıyla
     arasını belirleyen tek sayı. Değiştirince yerleşim kendiliğinden
     düzelir, ikinci bir yerde piksel düzeltmesi gerekmez. */
  var BOY       = 21;    /* rozetin kenarı, px (30 → %70) */
  var CERCEVE   = 1.5;   /* beyaz ince çerçevenin kalınlığı, px */
  var SOL       = 10;    /* ekranın sol kenarından uzaklık */
  var ARA       = 4;     /* üst şeritle ve komşu düğmeyle arası */
  var HAYALET_MS = 350;  /* pencere açıldıktan sonra tıklamaya kapalı süre */
  var TAZELE_MS = 1000;

  var GORSEL = "kalkan.webp";
  var EMOJI  = "🛡️";

  var rozet = null, pencere = null, sureEl = null;
  var acik = false, hayaletBitis = 0;

  /* ── STİL ──────────────────────────────────────────────────────
     Seçiciler ID'li: tema.js `!important`li kurallar yazıyor ve
     bazıları gecikmeli ekleniyor (Tuzak 38). ID ağırlığı sıralamadan
     bağımsız kazandırır, ezme yarışına girilmez. */
  function stilYaz() {
    if (document.getElementById("kalkanRozetStil")) return;
    var s = document.createElement("style");
    s.id = "kalkanRozetStil";
    s.textContent = [
      /* ÇERÇEVE TEK KAT: kalkan.webp 902x902 KARE ve kendi koyu
         çerçevesini taşıyor; altına ikinci bir KUTU çizilmez
         (hızlandırma kutucuğundaki aynı kök). Referanstaki beyaz
         ince hat kutunun `border`ı olarak veriliyor ve görselin
         dışında kalır — `box-sizing:border-box` sayesinde rozetin
         dış ölçüsü BOY'u aşmaz, görsel de kenarın altına girmez.
         Kare görsel kare kutuyu contain ile tam doldurur, kesilmez. */
      "#kalkanRozet{",
      "  position:fixed; left:" + SOL + "px; top:52px; z-index:41;",
      "  box-sizing:border-box;",
      "  width:" + BOY + "px; height:" + BOY + "px; padding:0;",
      "  display:none; align-items:center; justify-content:center;",
      "  background:none; color:#e9f6ff;",
      "  border:" + CERCEVE + "px solid rgba(255,255,255,.92);",
      "  border-radius:" + Math.round(BOY / 4) + "px; overflow:hidden;",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3);",
      "  font-family:'Baloo 2','Nunito',sans-serif; font-size:" + Math.round(BOY * .62) + "px; line-height:1;",
      "  cursor:pointer; -webkit-tap-highlight-color:transparent;",
      "}",
      "#kalkanRozet.acik{display:flex;}",
      "#kalkanRozet:active{transform:scale(.96); filter:brightness(.93);}",
      "#kalkanRozet img{width:100%; height:100%; object-fit:cover; background:none; display:block;}",

      "#kalkanPencere{",
      "  position:fixed; left:" + SOL + "px; top:90px; z-index:41;",
      "  display:none; width:274px; max-width:calc(100vw - " + (SOL * 2) + "px);",
      "  box-sizing:border-box; padding:11px 12px 12px;",
      "  background:rgba(233,246,255,.96); color:#0d2a36;",
      "  border:1px solid rgba(0,20,45,.12); border-radius:14px;",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3);",
      "  font-family:'Baloo 2','Nunito',sans-serif;",
      "}",
      "#kalkanPencere.acik{display:block;}",
      "#kalkanPencere .kr-bas{font-size:13.5px; font-weight:800; margin:0 0 9px; line-height:1.25;}",
      "#kalkanPencere .kr-satir{",
      "  display:flex; align-items:center; gap:9px;",
      "  background:rgba(0,20,45,.07); border-radius:10px; padding:7px 9px;",
      "}",
      "#kalkanPencere .kr-gor{width:28px; height:28px; flex:0 0 28px; display:flex; align-items:center; justify-content:center; font-size:17px; line-height:1;}",
      "#kalkanPencere .kr-gor img{width:28px; height:28px; object-fit:contain; background:none; display:block;}",
      "#kalkanPencere .kr-ad{flex:1 1 auto; font-size:13px; font-weight:800;}",
      "#kalkanPencere .kr-sure{",
      "  font-size:14px; font-weight:900; font-variant-numeric:tabular-nums;",
      "  letter-spacing:.2px;",
      "}",
      "#kalkanPencere .kr-bonus{",
      "  display:block; width:100%; margin:10px 0 0; padding:8px 10px;",
      "  background:#2DC9FC; color:#0d2a36; border:none; border-radius:10px;",
      "  font-family:'Baloo 2','Nunito',sans-serif; font-size:13.5px; font-weight:900;",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3); cursor:pointer;",
      "  -webkit-tap-highlight-color:transparent;",
      "}",
      "#kalkanPencere .kr-bonus:active{transform:scale(.96); filter:brightness(.93);}",

      /* ── ŞEHİR BONUSU EKRANI ────────────────────────────────────
         Tam ekran, çanta/market kalıbı: başlık ve sekmeler ÜSTTE
         sabit, yalnız liste kayar. Kaydırma kutusu SADECE listede —
         Tuzak 13 gereği kapsayıcıya `overflow` vermek yatayda da
         kırpar. z=50: paneller hizasında, savaş alanının (60) ve
         kahraman ekranının (400) altında. */
      /* RENKLER TEMADAN OKUNUR, KOPYALANMAZ: tema.js `koyuMaviTema`
         bloğu `--km-1/2/3` ve `--km-yazi` değişkenlerini :root'a
         yazıyor ve panellerin (çanta, market, sandık…) gövdesi de
         aynı üç duraklı gradyandan besleniyor. Buraya sayı yazmak
         ikinci bir palet açardı; tema değişince bu ekran da döner.
         Yedek değerler yalnız tema.js hiç yüklenmediyse devreye
         girer. */
      "#sehirBonusu{",
      "  position:fixed; inset:0; z-index:50; display:none;",
      "  flex-direction:column;",
      "  background:linear-gradient(180deg, var(--km-1,#3d7ccc) 0%, var(--km-2,#22488f) 52%, var(--km-3,#152e5e) 100%);",
      "  color:var(--km-yazi,#eaf4ff);",
      "  font-family:'Baloo 2','Nunito',sans-serif;",
      "}",
      "#sehirBonusu.acik{display:flex;}",
      "#sehirBonusu .sb-bas{",
      "  flex:0 0 auto; display:flex; align-items:center; gap:10px;",
      "  padding:10px 12px 8px;",
      "}",
      "#sehirBonusu .sb-geri{",
      "  width:34px; height:34px; flex:0 0 34px; padding:0;",
      "  background:rgba(3,16,38,.30); color:var(--km-yazi,#eaf4ff); border:none; border-radius:10px;",
      "  font-size:20px; font-weight:900; line-height:1; cursor:pointer;",
      "  -webkit-tap-highlight-color:transparent;",
      "}",
      "#sehirBonusu .sb-geri:active{transform:scale(.96); filter:brightness(.93);}",
      "#sehirBonusu .sb-baslik{font-size:17px; font-weight:900; text-shadow:0 1px 2px rgba(0,20,45,.55);}",
      "#sehirBonusu .sb-sekmeler{flex:0 0 auto; display:flex; gap:6px; padding:0 12px 8px;}",
      "#sehirBonusu .sb-sekme{",
      "  flex:1 1 0; min-width:0; padding:7px 4px 8px; border:none; border-radius:10px 10px 0 0;",
      "  background:rgba(3,16,38,.30); color:#cfe6f7;",
      "  font-family:inherit; font-size:12.5px; font-weight:800; cursor:pointer;",
      "  -webkit-tap-highlight-color:transparent;",
      "}",
      "#sehirBonusu .sb-sekme.secili{background:rgba(233,246,255,.95); color:#134a86;}",
      "#sehirBonusu .sb-liste{",
      "  flex:1 1 auto; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch;",
      "  padding:8px 12px 16px; display:flex; flex-direction:column; gap:8px;",
      "}",
      "#sehirBonusu .sb-kart{",
      "  display:flex; align-items:center; gap:10px; padding:9px 10px;",
      "  background:rgba(3,16,38,.30); color:var(--km-yazi,#eaf4ff); border-radius:12px;",
      "  border:1px solid rgba(160,215,255,.20);",
      "  box-shadow:0 2px 6px rgba(0,20,45,.3);",
      "}",
      "#sehirBonusu .sb-kart.sb-pasif{opacity:.58;}",
      "#sehirBonusu .sb-gor{",
      "  width:44px; height:44px; flex:0 0 44px; box-sizing:border-box;",
      "  display:flex; align-items:center; justify-content:center;",
      "  border:1.5px solid rgba(255,255,255,.92); border-radius:10px; overflow:hidden;",
      "  background:rgba(3,16,38,.35); font-size:22px; line-height:1;",
      "}",
      "#sehirBonusu .sb-gor img{width:100%; height:100%; object-fit:cover; background:none; display:block;}",
      "#sehirBonusu .sb-metin{flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:2px;}",
      "#sehirBonusu .sb-ad{font-size:14px; font-weight:900;}",
      "#sehirBonusu .sb-not{font-style:normal; font-size:11.5px; font-weight:700; opacity:.78; line-height:1.25;}",
      "#sehirBonusu .sb-sure{",
      "  margin-top:3px; align-self:flex-start; padding:2px 9px; border-radius:999px;",
      "  background:#2fbf5a; color:#06240f; font-style:normal;",
      "  font-size:13px; font-weight:900; font-variant-numeric:tabular-nums;",
      "}",
      "#sehirBonusu .sb-sure.sb-sure-yok{background:rgba(3,16,38,.45); color:var(--km-yazi,#eaf4ff);}",
      "#sehirBonusu .sb-sag{flex:0 0 auto; font-size:11.5px; font-weight:800; opacity:.7;}"
    ].join("\n");
    document.head.appendChild(s);
  }

  /* Görsel açılmazsa emojiye döner (Emoji ↔ görsel kuralı: burası
     innerHTML, o yüzden görsel; onerror düz metne düşürür). */
  function gorselHTML(dosya, yedek) {
    var d = dosya || GORSEL, y = yedek || EMOJI;
    return '<img src="' + d + '" alt="" ' +
           'onerror="this.onerror=null;this.replaceWith(document.createTextNode(\'' + y + '\'))">';
  }

  /* ── ŞEHİR BONUSU LİSTESİ ────────────────────────────────────
     TEK TABLO. `aktif:true` olan satır oyunda GERÇEKTEN var; geri
     kalanlar referans ekrandaki yerlerini tutuyor ve "Yakında"
     yazıyor — sahte bir etki uygulamıyorlar, dokunuşa da kapalılar.
     Bir bonus gerçekten yazıldığı gün burada `aktif:true` yapılır ve
     `deger` işlevi eklenir; ekranda başka hiçbir yer değişmez.

     GÖRSEL YOK — BİLEREK. Yalnız Kalkan'ın kendi görseli var
     (kalkan.webp, gerçek eşyanın kendisi). Kalan satırlara oyunun
     ilgisiz dosyalarından görsel atanmaz; kutu BOŞ çerçeve olarak
     durur. O bonusun kendi çizimi geldiği gün satıra `gor:"dosya.webp"`
     yazmak yeter. */
  var BONUS = [
    { sekme:"savas",  ad:"Kalkan",              not:"Şehrini tüm düşman saldırılarına karşı korur.", gor:GORSEL, emoji:EMOJI, aktif:true },
    { sekme:"savas",  ad:"Gözetleme Önleyen",   not:"Şehrine yönelik gözetleme girişimlerini önler." },
    { sekme:"savas",  ad:"Birlik Öldürücülüğü", not:"Tüm birliklerin öldürücülüğünü artırır." },
    { sekme:"savas",  ad:"Birlik Saldırısı",    not:"Tüm birliklerin saldırısını artırır." },
    { sekme:"savas",  ad:"Birlik Savunması",    not:"Tüm birliklerin savunmasını artırır." },
    { sekme:"savas",  ad:"Birlik Sağlığı",      not:"Tüm birliklerin sağlığını artırır." },
    { sekme:"savas",  ad:"Düşman Saldırısı",    not:"Düşman birlik saldırısını azaltır." },
    { sekme:"savas",  ad:"Düşman Savunması",    not:"Düşman birlik savunmasını azaltır." },
    { sekme:"buyume", ad:"Rastgele Işınlayıcı", not:"Şehrini haritada başka bir konuma ışınlar." },
    { sekme:"buyume", ad:"Toplama Hızı",        not:"Her türden kaynağı toplama hızını artırır." },
    { sekme:"buyume", ad:"Eğitim Kapasitesi",   not:"Tek seferde eğitebileceğin birlik sayısını artırır." }
  ];

  var SEKMELER = [{ k:"savas", et:"Savaşlar" }, { k:"buyume", et:"Büyüme" }];
  var bonusKat = null, bonusSekme = "savas", bonusAcik = false, bonusSureEl = null;

  function bonusListeYaz() {
    var liste = bonusKat.querySelector(".sb-liste");
    var html = "";
    for (var i = 0; i < BONUS.length; i++) {
      var b = BONUS[i];
      if (b.sekme !== bonusSekme) continue;
      html +=
        '<div class="sb-kart' + (b.aktif ? " sb-aktif" : " sb-pasif") + '">' +
          '<span class="sb-gor">' + (b.gor ? gorselHTML(b.gor, b.emoji) : "") + '</span>' +
          '<span class="sb-metin">' +
            '<b class="sb-ad">' + b.ad + '</b>' +
            '<i class="sb-not">' + b.not + '</i>' +
            (b.aktif ? '<i class="sb-sure">--:--:--</i>' : "") +
          '</span>' +
          '<span class="sb-sag">' + (b.aktif ? "" : "Yakında") + '</span>' +
        '</div>';
    }
    liste.innerHTML = html;
    bonusSureEl = liste.querySelector(".sb-sure");
    bonusSureYaz();
  }

  /* Kalkan satırının süresi de rozetle AYNI kapıdan gelir. */
  function bonusSureYaz() {
    if (!bonusSureEl) return;
    var ms = kalanMs();
    var yeni = ms > 0 ? bicim(ms) : "Kalkanın yok";
    if (bonusSureEl.textContent !== yeni) bonusSureEl.textContent = yeni;
    bonusSureEl.className = "sb-sure" + (ms > 0 ? "" : " sb-sure-yok");
  }

  function bonusSekmeYaz() {
    var d = bonusKat.querySelectorAll(".sb-sekme");
    for (var i = 0; i < d.length; i++)
      d[i].classList.toggle("secili", d[i].dataset.k === bonusSekme);
  }

  function bonusKur() {
    if (bonusKat) return;
    bonusKat = document.createElement("div");
    bonusKat.id = "sehirBonusu";
    bonusKat.innerHTML =
      '<div class="sb-bas">' +
        '<button class="sb-geri" type="button" aria-label="Geri">←</button>' +
        '<span class="sb-baslik">Şehir Bonusu</span>' +
      '</div>' +
      '<div class="sb-sekmeler">' +
        SEKMELER.map(function (s) {
          return '<button class="sb-sekme" type="button" data-k="' + s.k + '">' + s.et + '</button>';
        }).join("") +
      '</div>' +
      '<div class="sb-liste"></div>';
    document.body.appendChild(bonusKat);

    bonusKat.querySelector(".sb-geri").addEventListener("click", function (e) {
      e.stopPropagation();
      bonusKapat();
    });
    bonusKat.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest(".sb-sekme") : null;
      if (!t || t.dataset.k === bonusSekme) return;
      bonusSekme = t.dataset.k;
      bonusSekmeYaz();
      bonusListeYaz();
    });
  }

  function bonusAc() {
    bonusKur();
    bonusAcik = true;
    kapat();                     /* baloncuk kapanır, iki pencere üst üste durmaz */
    bonusKat.classList.add("acik");
    bonusSekmeYaz();
    bonusListeYaz();
  }

  function bonusKapat() {
    bonusAcik = false;
    if (bonusKat) bonusKat.classList.remove("acik");
  }

  function kur() {
    if (rozet) return;
    stilYaz();

    rozet = document.createElement("button");
    rozet.id = "kalkanRozet";
    rozet.type = "button";
    rozet.title = "Kalkan açık";
    rozet.innerHTML = gorselHTML();
    document.body.appendChild(rozet);

    pencere = document.createElement("div");
    pencere.id = "kalkanPencere";
    pencere.innerHTML =
      '<div class="kr-bas">Şehrini saldırılardan korur</div>' +
      '<div class="kr-satir">' +
        '<span class="kr-gor">' + gorselHTML() + '</span>' +
        '<span class="kr-ad">Kalkan</span>' +
        '<span class="kr-sure">--:--:--</span>' +
      '</div>' +
      '<button class="kr-bonus" type="button">Şehir Bonusu</button>';
    document.body.appendChild(pencere);
    sureEl = pencere.querySelector(".kr-sure");

    pencere.querySelector(".kr-bonus").addEventListener("click", function (e) {
      e.stopPropagation();
      bonusAc();
    });

    rozet.addEventListener("click", function (e) {
      e.stopPropagation();
      acik ? kapat() : ac();
    });

    /* Pencerenin kendi içine dokunmak kapatmaz; dışına dokunmak
       kapatır. Hayalet tıklama penceresi geçmeden dış dokunuş
       sayılmaz (Tuzak 21). */
    document.addEventListener("click", function (e) {
      if (!acik) return;
      if (Date.now() < hayaletBitis) return;
      if (e.target && e.target.closest && e.target.closest("#kalkanPencere")) return;
      if (e.target && e.target.closest && e.target.closest("#kalkanRozet")) return;
      kapat();
    }, true);
  }

  function ac() {
    acik = true;
    hayaletBitis = Date.now() + HAYALET_MS;
    pencere.classList.add("acik");
    yerlestir();
  }

  function kapat() {
    acik = false;
    if (pencere) pencere.classList.remove("acik");
  }

  /* Kalan süre — TEK KAPI. Kapı yoksa 0 döner, rozet çizilmez. */
  function kalanMs() {
    try {
      if (typeof window.kalkanKalanMs === "function") return Number(window.kalkanKalanMs()) || 0;
    } catch (e) {}
    return 0;
  }

  /* Biçim de tek kaynaktan (index.html saatBicim). İkinci bir
     biçimlendirici yazılmaz; yoksa yer tutucu kalır. */
  function bicim(ms) {
    try { if (typeof saatBicim === "function") return saatBicim(ms); } catch (e) {}
    return "--:--:--";
  }

  function sureYaz(ms) {
    var yeni = bicim(ms);
    if (sureEl && sureEl.textContent !== yeni) sureEl.textContent = yeni;
  }

  /* Rozetin ve pencerenin dikey yeri her tazelemede ÖLÇÜLEREK
     bulunur — üst şeridin boyu ayar panellerinden değişebiliyor. */
  function yerlestir() {
    if (!rozet) return;
    var ust = 52;
    try {
      var hud = document.querySelector(".hud-top");
      if (hud) {
        var r = hud.getBoundingClientRect();
        if (r.height > 0) ust = r.bottom + ARA;
      }
    } catch (e) {}

    /* Kaleiçindeki "← Haritaya dön" soldaki aynı sütunda: rozet
       onun ÜSTÜNDE kalır, binme olmaz. */
    try {
      var kapatBtn = document.getElementById("kaleiciKapat");
      if (kapatBtn) {
        var k = kapatBtn.getBoundingClientRect();
        if (k.height > 0) ust = Math.min(ust, k.top - ARA - BOY);
      }
    } catch (e) {}

    if (ust < 0) ust = 0;
    rozet.style.top = ust + "px";
    if (pencere) pencere.style.top = (ust + BOY + 8) + "px";
  }

  function tazele() {
    var ms = kalanMs();
    /* Bir panel (çanta, market, kışla…) ya da savaş alanı açıkken rozet
       görünmez. Yalnız z-sırasına güvenmek yetmiyor: paneller farklı
       kaplarda ve bazıları kendi yığın bağlamını kuruyor, ölçtüğümde
       rozet panelin ÜSTÜNDE kalıyordu. Açık panel doğrudan sorulur. */
    var panelAcik = false;
    try {
      panelAcik = !!document.querySelector(".overlay-panel.active");
      var arena = document.getElementById("battleArena");
      if (arena && getComputedStyle(arena).display !== "none") panelAcik = true;
      if (bonusAcik) panelAcik = true;   /* kendi tam ekranımız da panel sayılır */
    } catch (e) {}

    if (bonusAcik) bonusSureYaz();       /* Şehir Bonusu açıkken Kalkan satırı sayar */

    var gorunur = ms > 0 && !panelAcik && document.body.classList.contains("world-active");

    if (!rozet) { if (!gorunur) return; kur(); }

    if (gorunur) {
      rozet.classList.add("acik");
      yerlestir();
      if (acik) sureYaz(ms);
    } else {
      rozet.classList.remove("acik");
      if (acik) kapat();
    }
  }

  function basla() {
    tazele();
    setInterval(tazele, TAZELE_MS);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", basla);
  else basla();

  window.KALKAN_ROZET = { SURUM: SURUM, tazele: tazele, ac: ac, kapat: kapat,
                          bonusAc: bonusAc, bonusKapat: bonusKapat };
})();
