/* olcu.js — TAKILMA ÖLÇER (ekranda, konsolsuz)
   ═══════════════════════════════════════════════════════════════
   NE İŞE YARAR
   Oyun birkaç saniyede bir takılıyor ama hangi kodun takıldığı
   belli değil. Bu dosya her zamanlayıcı geri çağrısının (setInterval
   / setTimeout / requestAnimationFrame) NE KADAR SÜRDÜĞÜNÜ ölçer ve
   en pahalı olanları EKRANA yazar. Telefonda konsol olmadığı için
   tanı çıktısı ekrana gider, showToast'a değil.

   AÇMAK: adresin sonuna ?olcu=1 ekle. Başka hiçbir durumda tek satır
   bile çalışmaz — dosya en başta çıkar, oyuna maliyeti sıfırdır.

   NASIL SUÇLUYU BULUR
   Zamanlayıcı KURULURKEN çağrı yığınından "dosya:satır" alınır. Yani
   listede "tema.js:2196" gibi gerçek kaynak görünür; anonim
   fonksiyonlarda bile hangi satırın kurduğu bellidir.

   KARE ATLAMA ayrı ölçülür: rAF ile kareler arası boşluk izlenir,
   40 ms'yi aşan her boşluk sayılır. Liste "5 saniyede toplam ms"
   gösterir — bir iş 2.5 sn'de bir 300 ms sürüyorsa listenin tepesine
   çıkar ve kare atlama sayısıyla örtüşür.

   KOPYALA düğmesi listeyi panoya alır; ölçümü yazı olarak
   gönderebilirsin.

   ÖLÇERİN KENDİ MALİYETİ: geri çağrı başına iki performance.now()
   ve bir toplama. Panel saniyede bir, 5 saniyelik pencerede
   güncellenir.
   ═══════════════════════════════════════════════════════════════ */
(function olcer() {
  "use strict";

  if (!/[?&]olcu=1/.test(location.search || "")) return;

  var PENCERE_MS = 5000;   /* kaç saniyelik toplam gösterilsin */
  var YAVAS_KARE = 40;     /* bu ms'yi aşan kare boşluğu "atlama"  */
  var SATIR      = 7;      /* listede kaç satır                    */

  var kayit = Object.create(null);   /* "dosya:satır" → ölçüm        */
  var atlama = 0, enKotuKare = 0;
  var pencereBas = performance.now();
  var sonRapor = "(ölçülüyor…)";

  /* Zamanlayıcının KURULDUĞU yer. Yığının olcu.js'e ait olmayan ilk
     satırı alınır; oradan "dosya:satır" ayıklanır. */
  function kaynak() {
    var y;
    try { y = new Error().stack || ""; } catch (e) { return "?"; }
    var s = y.split("\n");
    for (var i = 1; i < s.length; i++) {
      var t = s[i];
      if (t.indexOf("olcu.js") !== -1) continue;
      /* Dosya adıyla satır arasında sürüm damgası var:
         ".../tema.js?s=48:2196:20" — sorgu dizisi atlanmazsa hiçbir
         satır eşleşmez ve liste "?" ile dolar (ölçüldü). */
      var m = t.match(/([\w.\-]+\.(?:js|html))(?:\?[^:\s)]*)?:(\d+)/);
      if (m) return m[1] + ":" + m[2];
    }
    return "?";
  }

  function yaz(kim, tur, sure) {
    var k = kayit[kim];
    if (!k) k = kayit[kim] = { toplam: 0, sayi: 0, en: 0, tur: tur };
    k.toplam += sure; k.sayi++;
    if (sure > k.en) k.en = sure;
  }

  /* Geri çağrıyı ölçen sarmal. Hata yutulmaz — finally ile ölçülür,
     oyunun kendi hatası olduğu gibi yukarı çıkar. */
  function sar(fn, kim, tur) {
    return function () {
      var t0 = performance.now();
      try { return fn.apply(this, arguments); }
      finally { yaz(kim, tur, performance.now() - t0); }
    };
  }

  var asilInt = window.setInterval, asilTo = window.setTimeout;
  var asilRaf = window.requestAnimationFrame;

  window.setInterval = function (fn, ms) {
    if (typeof fn !== "function") return asilInt.apply(window, arguments);
    var a = [].slice.call(arguments, 2);
    return asilInt.apply(window, [sar(fn, kaynak() + " ~" + (ms | 0) + "ms", "int"), ms].concat(a));
  };
  window.setTimeout = function (fn, ms) {
    if (typeof fn !== "function") return asilTo.apply(window, arguments);
    var a = [].slice.call(arguments, 2);
    return asilTo.apply(window, [sar(fn, kaynak(), "to"), ms].concat(a));
  };
  window.requestAnimationFrame = function (fn) {
    if (typeof fn !== "function") return asilRaf.apply(window, arguments);
    return asilRaf.call(window, sar(fn, "raf " + kaynak(), "raf"));
  };

  /* ── KARE BOŞLUĞU ──
     Ölçerin kendi rAF'i SARILMAZ (asilRaf ile kurulur), yoksa
     listede kendini sayar. */
  var sonKare = performance.now();
  function kare(t) {
    var d = t - sonKare; sonKare = t;
    if (d > YAVAS_KARE) { atlama++; if (d > enKotuKare) enKotuKare = d; }
    asilRaf.call(window, kare);
  }
  asilRaf.call(window, kare);

  /* ── PANEL ── */
  var kut, gov;
  function panelKur() {
    if (kut) return;
    var st = document.createElement("style");
    st.textContent =
      "#olcuKutu{position:fixed;left:6px;top:calc(env(safe-area-inset-top,0px) + 56px);" +
      "z-index:99999;max-width:min(92vw,360px);padding:7px 8px;border-radius:9px;" +
      "background:rgba(4,10,22,.90);border:1px solid #2f5f7a;color:#dff0ff;" +
      "font:700 10.5px/1.35 ui-monospace,Menlo,Consolas,monospace;" +
      "white-space:pre;overflow:auto;max-height:52vh;}" +
      "#olcuKutu b{color:#ffd257;font-weight:900;}" +
      "#olcuKutu button{margin-top:6px;padding:4px 9px;border:0;border-radius:7px;" +
      "background:#2f7fa8;color:#fff;font:900 11px/1 inherit;}";
    document.head.appendChild(st);

    kut = document.createElement("div");
    kut.id = "olcuKutu";
    gov = document.createElement("div");
    var dug = document.createElement("button");
    dug.type = "button";
    dug.textContent = "KOPYALA";
    dug.onclick = function () {
      var t = sonRapor;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(t);
        } else {
          var a = document.createElement("textarea");
          a.value = t; document.body.appendChild(a); a.select();
          document.execCommand("copy"); a.remove();
        }
        dug.textContent = "KOPYALANDI";
        asilTo.call(window, function () { dug.textContent = "KOPYALA"; }, 1200);
      } catch (e) { dug.textContent = "OLMADI"; }
    };
    kut.appendChild(gov); kut.appendChild(dug);
    document.body.appendChild(kut);
  }

  function raporla() {
    var gecen = performance.now() - pencereBas;
    if (gecen < PENCERE_MS) return;

    var liste = [];
    for (var k in kayit) liste.push([k, kayit[k]]);
    liste.sort(function (a, b) { return b[1].toplam - a[1].toplam; });

    var sn = (gecen / 1000).toFixed(1);
    var satirlar = ["ÖLÇÜM " + sn + " sn",
                    "kare atlama: " + atlama + "  en kötü: " + enKotuKare.toFixed(0) + " ms",
                    "—— toplam ms · kez · en uzun ——"];
    for (var i = 0; i < liste.length && i < SATIR; i++) {
      var d = liste[i][1];
      satirlar.push(d.toplam.toFixed(0).padStart(5) + " " +
                    String(d.sayi).padStart(4) + "x " +
                    d.en.toFixed(0).padStart(4) + "  " + liste[i][0]);
    }
    sonRapor = satirlar.join("\n");
    gov.textContent = sonRapor;

    kayit = Object.create(null);
    atlama = 0; enKotuKare = 0;
    pencereBas = performance.now();
  }

  function baslat() {
    panelKur();
    asilInt.call(window, raporla, 1000);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", baslat);
  } else { baslat(); }
})();
