/* ═══════════════════════════════════════════════════════════════════════
   gucefekt.js — EKRAN ORTASI "GÜÇ +N" ŞERİDİ

   NE YAPAR
   Kışlanın üstündeki üretim baloncuğuna dokunulup birlikler orduya
   katılınca, ekranın TAM ORTASINDA bir şerit belirir:  ✊ Güç +258
   Şerit büyüyerek girer, içinden soldan sağa bir parlama kayar,
   kısa süre durur, yükselirken saydamlaşıp kaybolur. Hiçbir state
   alanına dokunmaz — yalnız görsel katman.

   TEK GİRİŞ:  GUC_EFEKT.goster(miktar)
   Çağıran yer TEK: index.html egitimTopla(). Başka bir yerden de
   kullanmak istersen aynı kapıdan geç, ikinci bir şerit çizme.

   ── EKRANDA TEK ŞERİT, TEK HİZA (gucefekt-2'de düzeltildi) ──
   Eskiden her çağrı YENİ bir şerit yaratıyordu ve üst üste binmesin
   diye ekrandaki canlı şerit sayısına göre 46px aşağı kaydırılıyordu
   (`yuva = canlilar.length * 46`). Sonuç: arka arkaya iki kışla
   toplarsan şeritler 0px / 46px / 92px'te çıkıyor, üstelik ilk şerit
   söndükten sonra bile ikincisi kaydırılmış yerinde kalıyordu —
   "hepsi aynı hizada gelmiyor" şikâyeti tam buydu.

   Artık ekranda AYNI ANDA EN FAZLA BİR şerit var ve yeri sabit:
   tam orta (left/top %50 + translate -%50). Şerit dururken yeni güç
   gelirse ikinci kutu çizilmez — MEVCUT şeridin sayısı toplanır,
   girişi atlanır, bekleme ve parlama baştan başlar. Böylece kaç kez
   toplarsan topla yazı hep aynı noktada belirir.
   Kayma değişkeni (`yuva`) tamamen silindi; geri koyarsan hiza da
   geri bozulur.

   NEDEN CSS ANİMASYONU DEĞİL
   `prefers-reduced-motion` tüm CSS animasyonlarını öldürüyor
   (Tuzak 11) — şerit hiç görünmeden silinirdi. Bütün hareket,
   parlama dâhil, requestAnimationFrame ile yapılıyor.

   GÖRÜNÜM
   3B yok: kalın alt kenar, inset kabartı, radial parlaklık yok.
   Baloo 2 · rakamda tabular-nums · text-shadow 0 1px 2px.
   Parlama düz beyaz bir ışık dilimidir, hafif yatıktır ve şeridin
   kendi kenar solmasıyla MASKELENİR — şeridin arka planı uçlarda
   saydam olduğu için maskesiz bırakılırsa ışık boşlukta yüzen beyaz
   bir leke gibi görünür.
   İkon innerHTML'e girdiği için GÖRSEL kullanılır (gucikon.webp);
   dosya açılmazsa onerror ile ✊ emojisine döner (emoji/görsel
   ayrımı — düz metin bağlamı değil, burası innerHTML).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SURUM = "gucefekt-2";

  var IKON_GORSEL = "gucikon.webp";   /* guchud.js ile aynı dosya */
  var IKON_EMOJI  = "✊";

  /* Zamanlama (ms) — tek yer */
  var GIR  = 200;
  var DUR  = 900;
  var CIK  = 480;

  /* Parlama: girişten şu kadar sonra başlar, şu kadar sürer.
     Toplamı (GIR + PARLA_BEK + PARLA_SURE) DUR'un bitişini geçmemeli,
     yoksa ışık şerit sönerken yolda kalır. */
  var PARLA_BEK  = 90;
  var PARLA_SURE = 560;
  var PARLA_EN   = 104;   /* ışık diliminin genişliği (px) */

  var katman = null;
  var aktif  = null;      /* ekrandaki TEK şerit: {el,parla,deger,dogum,en} */
  var raf    = null;

  function stilKur() {
    if (document.getElementById("gucEfektStil")) return;
    var st = document.createElement("style");
    st.id = "gucEfektStil";
    st.textContent =
      "#gucEfektKat{position:fixed;left:0;right:0;top:0;bottom:0;" +
        "z-index:9500;pointer-events:none;overflow:hidden;}" +
      ".ge-serit{position:absolute;left:50%;top:50%;" +
        "display:flex;align-items:center;justify-content:center;gap:9px;" +
        "white-space:nowrap;padding:7px 30px;border-radius:10px;" +
        "background-color:transparent;" +
        "background-image:linear-gradient(90deg," +
          "rgba(20,64,132,0) 0%,rgba(26,92,176,.94) 17%," +
          "rgba(26,92,176,.94) 83%,rgba(20,64,132,0) 100%);" +
        "box-shadow:0 2px 6px rgba(0,20,45,.3);border:none;" +
        "font-family:'Baloo 2','Nunito',sans-serif;font-weight:800;" +
        "font-size:20px;line-height:1.15;color:#fff;" +
        "text-shadow:0 1px 2px rgba(0,20,45,.55);" +
        "font-variant-numeric:tabular-nums;}" +
      ".ge-ikon{width:22px;height:22px;display:block;flex:0 0 22px;" +
        "object-fit:contain;}" +
      ".ge-emoji{font-size:19px;line-height:1;}" +
      /* Parlamanın penceresi: şeridin kutusunu aşmaz ve arka planla
         AYNI kenar solmasıyla maskelenir (uçlarda şerit saydam). */
      ".ge-parla-kutu{position:absolute;left:0;top:0;right:0;bottom:0;" +
        "overflow:hidden;border-radius:10px;pointer-events:none;" +
        "-webkit-mask-image:linear-gradient(90deg,transparent 0%," +
          "#000 17%,#000 83%,transparent 100%);" +
        "mask-image:linear-gradient(90deg,transparent 0%," +
          "#000 17%,#000 83%,transparent 100%);}" +
      ".ge-parla{position:absolute;top:-30%;bottom:-30%;left:0;" +
        "width:" + PARLA_EN + "px;opacity:0;" +
        /* Keskin çekirdek + geniş yumuşak etek: tek duraklı düz
           gradyan ekranda "biraz açılmış zemin" gibi görünüyor,
           ışık gibi görünmüyordu. Ortadaki dar parlak şerit onu
           hüzmeye çeviriyor. */
        "background-image:linear-gradient(90deg," +
          "rgba(255,255,255,0) 0%,rgba(255,255,255,.10) 30%," +
          "rgba(255,255,255,.30) 43%,rgba(255,255,255,.78) 50%," +
          "rgba(255,255,255,.30) 57%,rgba(255,255,255,.10) 70%," +
          "rgba(255,255,255,0) 100%);}";
    document.head.appendChild(st);
  }

  function katmanKur() {
    if (katman && katman.isConnected) return katman;
    stilKur();
    katman = document.getElementById("gucEfektKat");
    if (!katman) {
      katman = document.createElement("div");
      katman.id = "gucEfektKat";
      document.body.appendChild(katman);
    }
    return katman;
  }

  function simdi() {
    return (typeof performance !== "undefined") ? performance.now() : Date.now();
  }

  function bicim(n) {
    try { return Number(n).toLocaleString("tr-TR"); }
    catch (e) { return String(n); }
  }

  /* Yumuşak giriş — sonda hafif bir taşma (aşırı zıplama yok) */
  function yumusat(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /* Işığın kendi sönümü: yolun başında ve sonunda görünmez,
     ortada tam güç. Maske olmayan tarayıcıda da leke bırakmaz. */
  function parlaOpak(p) {
    if (p < 0.22) return p / 0.22;
    if (p > 0.78) return (1 - p) / 0.22;
    return 1;
  }

  function bitir(c) {
    if (c.el && c.el.parentNode) c.el.parentNode.removeChild(c.el);
    if (aktif === c) aktif = null;
  }

  function dongu() {
    raf = null;
    var c = aktif;
    if (!c) return;

    var y = simdi() - c.dogum;
    var op, olcek, kay;

    if (y < GIR) {
      var a = yumusat(y / GIR);
      op = a;
      olcek = 0.86 + 0.14 * a;
      kay = 16 * (1 - a);
    } else if (y < GIR + DUR) {
      op = 1; olcek = 1; kay = 0;
    } else if (y < GIR + DUR + CIK) {
      var b = (y - GIR - DUR) / CIK;
      op = 1 - b;
      olcek = 1 - 0.04 * b;
      kay = -26 * b;
    } else {
      bitir(c);
      return;
    }

    /* Tuzak 12: calc(-50% + var(--x)) eksi değerde sessizce düşer.
       Yüzde ve pikseli AYRI translate() halkalarına böl. */
    c.el.style.opacity = op;
    c.el.style.transform =
      "translate(-50%,-50%) translate(0px," + kay.toFixed(1) + "px)" +
      " scale(" + olcek.toFixed(3) + ")";

    /* ── PARLAMA ──
       Şeridin sol kenarının dışından girip sağ kenarının dışına çıkar.
       Yol uzunluğu şeridin ÖLÇÜLEN eni üzerinden; Tuzak 19 gereği
       offsetWidth (position:fixed katmanda offsetParent null olur). */
    if (c.parla) {
      var pz = y - GIR - PARLA_BEK;
      if (pz >= 0 && pz < PARLA_SURE) {
        var p = pz / PARLA_SURE;
        var x = -PARLA_EN + p * (c.en + PARLA_EN);
        c.parla.style.opacity = parlaOpak(p).toFixed(3);
        c.parla.style.transform =
          "translate(" + x.toFixed(1) + "px,0px) skewX(-16deg)";
      } else if (c.parla.style.opacity !== "0") {
        c.parla.style.opacity = "0";
      }
    }

    raf = requestAnimationFrame(dongu);
  }

  function yaziYaz(c, etiket) {
    c.el.innerHTML =
      '<span class="ge-parla-kutu"><span class="ge-parla"></span></span>' +
      '<img class="ge-ikon" src="' + IKON_GORSEL + '" alt="" ' +
      'onerror="this.outerHTML=\'<span class=&quot;ge-emoji&quot;>' + IKON_EMOJI + '</span>\'">' +
      '<span>' + (etiket || "Güç") + " +" + bicim(c.deger) + "</span>";
    c.parla = c.el.querySelector(".ge-parla");
    c.en = c.el.offsetWidth || 0;      /* Tuzak 19 */
  }

  /* miktar: kazanılan güç (sayı). 0 ya da geçersizse hiçbir şey olmaz. */
  function goster(miktar, etiket) {
    var n = Math.round(Number(miktar) || 0);
    if (!n) return;

    katmanKur();

    /* Şerit hâlâ ekrandaysa İKİNCİSİ ÇİZİLMEZ: sayı toplanır, giriş
       atlanır (dogum GIR kadar geriye alınır), bekleme ve parlama
       baştan başlar. Yer değişmez. */
    if (aktif && aktif.el && aktif.el.isConnected) {
      aktif.deger += n;
      yaziYaz(aktif, etiket);
      aktif.dogum = simdi() - GIR;
      if (!raf) raf = requestAnimationFrame(dongu);
      return;
    }

    var el = document.createElement("div");
    el.className = "ge-serit";
    el.style.opacity = "0";
    el.style.transform = "translate(-50%,-50%)";
    katman.appendChild(el);

    aktif = { el: el, parla: null, deger: n, dogum: simdi(), en: 0 };
    yaziYaz(aktif, etiket);
    if (!raf) raf = requestAnimationFrame(dongu);
  }

  window.GUC_EFEKT = { SURUM: SURUM, goster: goster };
})();
