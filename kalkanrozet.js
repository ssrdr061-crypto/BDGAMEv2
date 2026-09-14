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

  var SURUM = "kalkanrozet-1";

  var BOY       = 30;    /* rozetin kenarı, px */
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
      /* ÇİZİLMİŞ ÇERÇEVE YOK: kalkan.webp 902x902 KARE ve kendi koyu
         çerçevesini taşıyor. Altına bir kutu daha çizmek iki çerçeveyi
         üst üste bindirir (hızlandırma kutucuğundaki aynı kök).
         Kare görsel kare kutuyu contain ile tam doldurur, kesilmez. */
      "#kalkanRozet{",
      "  position:fixed; left:" + SOL + "px; top:52px; z-index:41;",
      "  width:" + BOY + "px; height:" + BOY + "px; padding:0;",
      "  display:none; align-items:center; justify-content:center;",
      "  background:none; border:none; border-radius:9px;",
      "  color:#e9f6ff;",
      /* Gölge kutuya değil GÖRSELE veriliyor: zemin saydam olduğu için
         box-shadow, görselin kendi köşesine uymayan bir dikdörtgen
         çizerdi. drop-shadow saydamlığı izler. */
      "  box-shadow:none;",
      "  font-family:'Baloo 2','Nunito',sans-serif; font-size:19px; line-height:1;",
      "  cursor:pointer; -webkit-tap-highlight-color:transparent;",
      "}",
      "#kalkanRozet.acik{display:flex;}",
      "#kalkanRozet:active{transform:scale(.96); filter:brightness(.93);}",
      "#kalkanRozet img{width:100%; height:100%; object-fit:contain; background:none; display:block;",
      "  filter:drop-shadow(0 2px 4px rgba(0,20,45,.45));}",

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
      "}"
    ].join("\n");
    document.head.appendChild(s);
  }

  /* Görsel açılmazsa emojiye döner (Emoji ↔ görsel kuralı: burası
     innerHTML, o yüzden görsel; onerror düz metne düşürür). */
  function gorselHTML() {
    return '<img src="' + GORSEL + '" alt="" ' +
           'onerror="this.onerror=null;this.replaceWith(document.createTextNode(\'' + EMOJI + '\'))">';
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
      '</div>';
    document.body.appendChild(pencere);
    sureEl = pencere.querySelector(".kr-sure");

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
  function sureYaz(ms) {
    var yeni = "--:--:--";
    try { if (typeof saatBicim === "function") yeni = saatBicim(ms); } catch (e) {}
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
    } catch (e) {}

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

  window.KALKAN_ROZET = { SURUM: SURUM, tazele: tazele, ac: ac, kapat: kapat };
})();
