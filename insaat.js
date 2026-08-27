/* ═══════════════════════════════════════════════════════════════
   insaat.js — BİNA GELİŞTİRME (Sv1 → Sv10)
   ---------------------------------------------------------------
   Kaleiçindeki binaların seviyesini yükseltir. Tek doğruluk
   kaynağı bu dosyadır: maliyet, süre, üretim çarpanı ve açılış
   kuralları başka hiçbir yerde yazılı değildir.

   VERİ
     state.binaSv   { odun:1, ahir:1, ... }  bina → seviye
     state.insaat   [ { id, hedef, bitis } ] en fazla İKİ SIRA

   Bitmiş inşaat GİRİŞTE işlenir: oyuncu oyunda olmasa da süre
   akar (uretim.js ile aynı mantık). Sunucu tarafı yok.

   ÜÇ İNCE NOKTA
     1) state.binaSv ve state.insaat hesap kaydına da yazılmalı
        (index.html → compactStateForExport). Yazılmazsa her
        girişte seviyeler 1'e döner.
     2) Ana Kale EN SONA kalır: diğer binalar onu çeker. Kapı
        kuralı kaleKapisi() içinde, tek yerde.
     3) Kışlalarda ÜÇLÜ DÖNGÜ muafiyeti var — her Ana Kale
        seviyesinde üç kışladan biri bir seviye geride kalabilir.
        Muaf olan kışla sabit sırayla döner, oyuncu seçmez.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SURUM = "insaat-1";

  var TAVAN     = 10;    /* en yüksek seviye */
  var SIRA_SAYI = 2;     /* aynı anda kaç inşaat sürebilir */

  /* ── GELİŞTİRİLEBİLİR BİNALAR ──
     Anahtarlar kaleici.js'teki BINALAR[].id ile birebir aynı
     olmak ZORUNDA; ayrışırsa düğme çıkar ama hiçbir şey olmaz. */
  var TIP = {
    kale:      "kale",
    odun:      "kaynak", ahir:  "kaynak", demir: "kaynak",
    su:        "kaynak", enerji: "kaynak",
    sovalye:   "kisla",  asker:  "kisla",  robot: "kisla",
    arastirma: "kisla",
  };

  /* Hangi bina hangi kaynağı üretir. Ahır et üretir — bina adı
     ile kaynak adı burada ayrışır, tek eşleme noktası budur. */
  var URETTIGI = {
    odun: "odun", ahir: "et", demir: "demir", su: "su", enerji: "enerji",
  };

  /* ── KAYNAK BİNASI: ana kaynak %60, yan kaynak %40 ── */
  var ODEME = {
    odun:   { ana: "demir", yan: "et" },
    ahir:   { ana: "odun",  yan: "su" },
    demir:  { ana: "odun",  yan: "enerji" },
    su:     { ana: "demir", yan: "odun" },
    enerji: { ana: "demir", yan: "su" },
  };

  /* ── TABLOLAR ──
     Dizi indeksi HEDEF seviyedir: [2] = Sv1'den Sv2'ye geçiş.
     0 ve 1 kullanılmaz, boş bırakıldı. */

  /* Kaynak binası — { ana, yan, dk } */
  var T_KAYNAK = [
    null, null,
    { ana:     6000, yan:     4000, dk:    6 },
    { ana:    15600, yan:    10400, dk:   15 },
    { ana:    38400, yan:    25600, dk:   36 },
    { ana:    96000, yan:    64000, dk:   75 },
    { ana:   240000, yan:   160000, dk:  165 },
    { ana:   600000, yan:   400000, dk:  360 },
    { ana:  1500000, yan:  1000000, dk:  900 },
    { ana:  3720000, yan:  2480000, dk: 1980 },
    { ana:  9360000, yan:  6240000, dk: 4680 },
  ];

  /* Kışla + Araştırma — beş kaynakla birden ödenir */
  var T_KISLA = [
    null, null,
    { odun:    11700, demir:    11700, et:     7800, su:     5850, enerji:    1950, dk:    9 },
    { odun:    29000, demir:    29000, et:    19500, su:    14600, enerji:    4900, dk:   22 },
    { odun:    72000, demir:    72000, et:    48000, su:    36000, enerji:   12000, dk:   55 },
    { odun:   180000, demir:   180000, et:   120000, su:    90000, enerji:   30000, dk:  110 },
    { odun:   450000, demir:   450000, et:   300000, su:   225000, enerji:   75000, dk:  240 },
    { odun:  1125000, demir:  1125000, et:   750000, su:   562000, enerji:  187000, dk:  540 },
    { odun:  2790000, demir:  2790000, et:  1860000, su:  1395000, enerji:  465000, dk: 1320 },
    { odun:  7020000, demir:  7020000, et:  4680000, su:  3510000, enerji: 1170000, dk: 3000 },
    { odun: 17550000, demir: 17550000, et: 11700000, su:  8775000, enerji: 2925000, dk: 7020 },
  ];

  /* Ana Kale — kışlanın yaklaşık 1,33 katı */
  var T_KALE = [
    null, null,
    { odun:    15600, demir:    15600, et:    10400, su:     7800, enerji:    2600, dk:   12 },
    { odun:    39000, demir:    39000, et:    26000, su:    19500, enerji:    6500, dk:   27 },
    { odun:    96000, demir:    96000, et:    64000, su:    48000, enerji:   16000, dk:   66 },
    { odun:   240000, demir:   240000, et:   160000, su:   120000, enerji:   40000, dk:  135 },
    { odun:   600000, demir:   600000, et:   400000, su:   300000, enerji:  100000, dk:  300 },
    { odun:  1500000, demir:  1500000, et:  1000000, su:   750000, enerji:  250000, dk:  660 },
    { odun:  3720000, demir:  3720000, et:  2480000, su:  1860000, enerji:  620000, dk: 1620 },
    { odun:  9360000, demir:  9360000, et:  6240000, su:  4680000, enerji: 1560000, dk: 3600 },
    { odun: 23400000, demir: 23400000, et: 15600000, su: 11700000, enerji: 3900000, dk: 8460 },
  ];

  /* Her seviyede üretim bu kadar katlanır (Sv1 = 1.00) */
  var URETIM_ARTIS = 1.45;

  /* ── KIŞLA MUAFİYETİ — SABİT ÜÇLÜ DÖNGÜ ──
     Ana Kale'yi Sv N'ye çıkarırken bu kışla Sv N-1 kalabilir.
     Diğer ikisi Sv N olmak ZORUNDA. Araştırma dahil değil.  */
  var MUAF_SIRA = ["robot", "sovalye", "asker"];   /* Nişancı → Savunucu → Koruyucu */
  function muafKisla(hedefSv) {
    return MUAF_SIRA[(hedefSv - 2) % MUAF_SIRA.length];
  }

  var ADLAR = {
    kale: "Ana Kale", odun: "Odun", ahir: "Ahır", demir: "Demir",
    su: "Su", enerji: "Enerji", arastirma: "Araştırma",
    sovalye: "Savunucu Kışlası", asker: "Koruyucu Kışlası", robot: "Nişancı Kışlası",
  };
  var K_EMOJI = { odun: "🪵", et: "🍖", demir: "⛓️", su: "💧", enerji: "⚡" };
  var K_ADI   = { odun: "Odun", et: "Et", demir: "Demir", su: "Su", enerji: "Enerji" };

  /* ═══════════════════════════════════════════════════════════
     DURUM
     ═══════════════════════════════════════════════════════════ */

  function hazir() {
    return (typeof state !== "undefined" && state && typeof state === "object");
  }

  function kurDurum() {
    if (!hazir()) return false;
    if (!state.binaSv || typeof state.binaSv !== "object") state.binaSv = {};
    Object.keys(TIP).forEach(function (id) {
      var v = state.binaSv[id];
      if (typeof v !== "number" || !isFinite(v) || v < 1) state.binaSv[id] = 1;
      if (state.binaSv[id] > TAVAN) state.binaSv[id] = TAVAN;
    });
    if (!Array.isArray(state.insaat)) state.insaat = [];
    return true;
  }

  function seviye(id) {
    if (!kurDurum()) return 1;
    return state.binaSv[id] || 1;
  }

  /* ═══════════════════════════════════════════════════════════
     TABLO OKUMA
     ═══════════════════════════════════════════════════════════ */

  /* Bir yükseltmenin bedeli: { kaynaklar:{...}, dk:N } */
  function bedel(id, hedef) {
    var t = TIP[id];
    if (!t || hedef < 2 || hedef > TAVAN) return null;

    if (t === "kaynak") {
      var s = T_KAYNAK[hedef];
      var o = ODEME[id];
      if (!s || !o) return null;
      var k = {};
      k[o.ana] = s.ana;
      k[o.yan] = (k[o.yan] || 0) + s.yan;
      return { kaynaklar: k, dk: s.dk };
    }

    var tab = (t === "kale") ? T_KALE : T_KISLA;
    var r = tab[hedef];
    if (!r) return null;
    return {
      kaynaklar: {
        odun: r.odun, demir: r.demir, et: r.et, su: r.su, enerji: r.enerji,
      },
      dk: r.dk,
    };
  }

  /* Bina seviyesinin üretime katkısı — uretim.js bunu çağırır. */
  function uretimCarpani(kaynakId) {
    var binaId = null;
    Object.keys(URETTIGI).forEach(function (b) {
      if (URETTIGI[b] === kaynakId) binaId = b;
    });
    if (!binaId) return 1;
    return Math.pow(URETIM_ARTIS, seviye(binaId) - 1);
  }

  /* ═══════════════════════════════════════════════════════════
     KAPILAR — yükseltme yapılabilir mi
     ═══════════════════════════════════════════════════════════ */

  /* Ana Kale kapısı: diğer binalar hedef seviyeye yetişmiş mi.
     Döner: null (geçti) veya engel metni. */
  function kaleKapisi(hedef) {
    var muaf = muafKisla(hedef);
    var eksik = [];

    Object.keys(TIP).forEach(function (id) {
      if (id === "kale") return;
      var gerek = (id === muaf) ? (hedef - 1) : hedef;
      if (gerek < 1) gerek = 1;
      if (seviye(id) < gerek) eksik.push(ADLAR[id] + " Sv" + gerek);
    });

    if (!eksik.length) return null;
    return "Önce şunlar gerekli: " + eksik.join(" · ");
  }

  /* Diğer binalar Ana Kale'yi EN FAZLA BİR SEVİYE geçebilir.
     ── TUZAK: BU +1 OLMAZSA OYUN KİLİTLENİR ──
     Kale kapısı "hepsi Sv N olsun" der. Tavan da "kaleyi geçemez"
     deseydi, kale Sv1 iken hiçbir bina Sv2'ye çıkamaz, hiçbiri
     çıkmadığı için kale de Sv2 olamazdı. Binalar önce bir seviye
     öne geçer, kale sonra onları yakalar — istenen sıra budur. */
  function kaleTavani(id, hedef) {
    if (id === "kale") return null;
    if (hedef <= seviye("kale") + 1) return null;
    return "Ana Kale Sv" + seviye("kale") + ". Önce Ana Kale'yi Sv" +
           (hedef - 1) + " yap.";
  }

  /* Kaynak yeterli mi → eksik kaynakların listesi (boşsa yeterli) */
  function eksikKaynaklar(kay) {
    var cuzdan = (hazir() && state.kaynaklar) || {};
    var eksik = [];
    Object.keys(kay).forEach(function (k) {
      var var_ = cuzdan[k] || 0;
      if (var_ < kay[k]) eksik.push(k);
    });
    return eksik;
  }

  /* Tam denetim. Döner: { olur:bool, sebep:"" } */
  function denetle(id, hedef) {
    if (!kurDurum())            return { olur: false, sebep: "Oyun verisi hazır değil." };
    if (!TIP[id])               return { olur: false, sebep: "Bu bina geliştirilemez." };
    if (hedef > TAVAN)          return { olur: false, sebep: "En yüksek seviyede." };
    if (kuyrukta(id))           return { olur: false, sebep: "Bu bina zaten inşaatta." };
    if (state.insaat.length >= SIRA_SAYI)
      return { olur: false, sebep: "İnşaat sırası dolu (" + SIRA_SAYI + "/" + SIRA_SAYI + ")." };

    var t = kaleTavani(id, hedef);
    if (t) return { olur: false, sebep: t };

    if (id === "kale") {
      var kk = kaleKapisi(hedef);
      if (kk) return { olur: false, sebep: kk };
    }

    var b = bedel(id, hedef);
    if (!b) return { olur: false, sebep: "Tablo bulunamadı." };

    var eks = eksikKaynaklar(b.kaynaklar);
    if (eks.length) {
      return { olur: false, sebep: "Yetersiz: " +
               eks.map(function (k) { return K_ADI[k]; }).join(", ") };
    }
    return { olur: true, sebep: "" };
  }

  /* ═══════════════════════════════════════════════════════════
     KUYRUK
     ═══════════════════════════════════════════════════════════ */

  function kuyrukta(id) {
    if (!kurDurum()) return null;
    for (var i = 0; i < state.insaat.length; i++) {
      if (state.insaat[i].id === id) return state.insaat[i];
    }
    return null;
  }

  function kalanMs(id) {
    var i = kuyrukta(id);
    if (!i) return 0;
    return Math.max(0, i.bitis - Date.now());
  }

  /* Bitmiş inşaatları uygular. Döner: tamamlanan bina adları. */
  function bitenleriIsle() {
    if (!kurDurum()) return [];
    var simdi = Date.now();
    var bitti = [];
    state.insaat = state.insaat.filter(function (i) {
      if (i.bitis > simdi) return true;
      var eski = state.binaSv[i.id] || 1;
      /* Hedef seviye kaydın içinde: iki tur birden atlanamaz. */
      state.binaSv[i.id] = Math.min(TAVAN, Math.max(eski, i.hedef || eski + 1));
      bitti.push(ADLAR[i.id] || i.id);
      return false;
    });
    if (bitti.length) yaz();
    return bitti;
  }

  /* Yükseltmeyi başlat. Döner: { ok:bool, sebep:"" } */
  function baslat(id) {
    if (!kurDurum()) return { ok: false, sebep: "Hazır değil." };
    bitenleriIsle();

    var hedef = seviye(id) + 1;
    var d = denetle(id, hedef);
    if (!d.olur) return { ok: false, sebep: d.sebep };

    var b = bedel(id, hedef);
    Object.keys(b.kaynaklar).forEach(function (k) {
      state.kaynaklar[k] = (state.kaynaklar[k] || 0) - b.kaynaklar[k];
      if (state.kaynaklar[k] < 0) state.kaynaklar[k] = 0;
    });

    state.insaat.push({ id: id, hedef: hedef, bitis: Date.now() + b.dk * 60000 });
    yaz();
    tazele();
    return { ok: true, sebep: "" };
  }

  function yaz() {
    try { if (typeof persistCurrentState === "function") persistCurrentState(); } catch (e) {}
  }

  function tazele() {
    try { if (typeof renderKaynaklar === "function") renderKaynaklar(); } catch (e) {}
    try { if (window.KALEICI && typeof window.KALEICI.ciz === "function") window.KALEICI.ciz(); } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════
     BİÇİMLENDİRME
     ═══════════════════════════════════════════════════════════ */

  function sayi(n) {
    try { return Number(n || 0).toLocaleString("tr-TR"); }
    catch (e) { return String(n || 0); }
  }

  function sureYaz(ms) {
    var t = Math.max(0, Math.round(ms / 1000));
    var g = Math.floor(t / 86400);
    var sa = Math.floor((t % 86400) / 3600);
    var dk = Math.floor((t % 3600) / 60);
    var sn = t % 60;
    var iki = function (n) { return String(n).padStart(2, "0"); };
    if (g > 0)  return g + "g " + sa + "s " + iki(dk) + "d";
    if (sa > 0) return sa + ":" + iki(dk) + ":" + iki(sn);
    return dk + ":" + iki(sn);
  }

  function dkYaz(dk) {
    if (dk < 60) return dk + " dk";
    if (dk < 1440) {
      var sa = Math.floor(dk / 60), k = dk % 60;
      return sa + " sa" + (k ? " " + k + " dk" : "");
    }
    var g = Math.floor(dk / 1440), ks = Math.round((dk % 1440) / 60);
    return g + " gün" + (ks ? " " + ks + " sa" : "");
  }

  /* Kaynak simgesi — dugum.js'in görselini kullanır, yoksa emoji.
     HTML bağlamı olduğu için GÖRSEL basılır (Simge/Görsel kuralı). */
  function simge(k) {
    try {
      if (typeof kaynakSimge === "function") {
        var s = kaynakSimge(k);
        if (s) return s;
      }
    } catch (e) {}
    return K_EMOJI[k] || "";
  }

  /* ═══════════════════════════════════════════════════════════
     PANEL
     ═══════════════════════════════════════════════════════════ */

  var CSS =
    '#insaatModal{position:fixed;inset:0;z-index:9600;display:flex;' +
      'align-items:center;justify-content:center;background:rgba(4,14,28,.62);' +
      'font-family:"Baloo 2","Nunito",sans-serif;}' +
    '#insaatModal .ins-kart{width:min(88vw,360px);max-height:82vh;overflow-y:auto;' +
      'background:linear-gradient(180deg,#123049,#0d2438);border:1px solid rgba(190,240,255,.20);' +
      'border-radius:14px;padding:16px 14px 14px;position:relative;' +
      'box-shadow:0 2px 6px rgba(0,20,45,.3);color:#eaf6ff;}' +
    '#insaatModal .ins-kapat{position:absolute;top:8px;right:10px;width:28px;height:28px;' +
      'border:none;border-radius:8px;background:rgba(255,255,255,.10);color:#eaf6ff;' +
      'font-size:15px;line-height:1;cursor:pointer;}' +
    '#insaatModal .ins-bas{font-size:17px;font-weight:800;margin:0 26px 2px 0;' +
      'text-shadow:0 1px 2px rgba(0,20,45,.55);}' +
    '#insaatModal .ins-sv{font-size:13px;font-weight:700;color:#9fd6ef;margin-bottom:10px;' +
      'font-variant-numeric:tabular-nums;}' +
    '#insaatModal .ins-satir{display:flex;align-items:center;gap:8px;padding:5px 8px;' +
      'border-radius:8px;background:rgba(255,255,255,.05);margin-bottom:5px;font-size:14px;' +
      'font-variant-numeric:tabular-nums;}' +
    '#insaatModal .ins-satir .ins-ad{flex:1 1 auto;color:#cfe6f5;}' +
    '#insaatModal .ins-satir .ins-mik{font-weight:800;}' +
    '#insaatModal .ins-satir.eksik .ins-mik{color:#ff8b8f;}' +
    '#insaatModal .ins-sure{margin:9px 0 4px;font-size:14px;font-weight:700;color:#ffd76a;' +
      'font-variant-numeric:tabular-nums;}' +
    '#insaatModal .ins-not{font-size:12.5px;line-height:1.45;color:#ffb3b6;margin:8px 0 2px;}' +
    '#insaatModal .ins-bilgi{font-size:12.5px;line-height:1.45;color:#9fd6ef;margin:8px 0 2px;}' +
    '#insaatModal .ins-dugmeler{display:flex;gap:8px;margin-top:12px;}' +
    '#insaatModal .ins-btn{flex:1 1 0;border:none;border-radius:10px;padding:11px 8px;' +
      'font-family:inherit;font-size:14.5px;font-weight:800;cursor:pointer;' +
      'text-shadow:0 1px 2px rgba(0,20,45,.35);' +
      'transition:transform .09s ease,filter .09s ease;}' +
    '#insaatModal .ins-btn:active{transform:scale(.96);filter:brightness(.93);}' +
    '#insaatModal .ins-btn[disabled]{opacity:.45;cursor:default;}' +
    '#insaatModal .ins-btn[disabled]:active{transform:none;filter:none;}' +
    '#insaatModal .ins-yesil{background:#3fbf6a;color:#08331b;}' +
    '#insaatModal .ins-sari{background:#ffc61a;color:#3a2600;}' +
    '#insaatModal .ins-geri{font-size:26px;font-weight:800;color:#ffd76a;text-align:center;' +
      'margin:14px 0 4px;font-variant-numeric:tabular-nums;}';

  function stilBas() {
    if (document.getElementById("insaatCSS")) return;
    var st = document.createElement("style");
    st.id = "insaatCSS";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  var _sayac = null;

  function kapat() {
    var m = document.getElementById("insaatModal");
    if (m) m.remove();
    if (_sayac) { clearInterval(_sayac); _sayac = null; }
  }

  function ac(id) {
    if (!TIP[id]) return;
    if (!kurDurum()) return;
    bitenleriIsle();
    stilBas();
    kapat();

    var kok = document.createElement("div");
    kok.id = "insaatModal";
    kok.dataset.bina = id;
    kok.innerHTML = '<div class="ins-kart"><button class="ins-kapat" type="button">✕</button>' +
                    '<div class="ins-govde"></div></div>';

    /* Hayalet tıklama koruması — düğme pointerup ile tetikleniyor,
       parmak kalkınca aynı noktaya bir click daha geliyor. */
    kok.style.pointerEvents = "none";
    setTimeout(function () { kok.style.pointerEvents = ""; }, 350);

    document.body.appendChild(kok);

    kok.querySelector(".ins-kapat").addEventListener("click", kapat);
    kok.addEventListener("click", function (e) { if (e.target === kok) kapat(); });

    ciz(id);

    _sayac = setInterval(function () {
      if (!document.body.contains(kok)) { clearInterval(_sayac); _sayac = null; return; }
      var i = kuyrukta(id);
      if (i) {
        var g = kok.querySelector(".ins-geri");
        if (g) g.textContent = sureYaz(kalanMs(id));
        if (kalanMs(id) <= 0) { bitenleriIsle(); tazele(); ciz(id); }
      }
    }, 1000);
  }

  /* Panel içeriğini YERİNDE tazeler — kaydırma korunur. */
  function ciz(id) {
    var kok = document.getElementById("insaatModal");
    if (!kok) return;
    var govde = kok.querySelector(".ins-govde");
    if (!govde) return;

    var sv = seviye(id);
    var hedef = sv + 1;
    var ad = ADLAR[id] || id;
    var h = '<div class="ins-bas">' + ad + '</div>';

    /* ── İNŞAAT SÜRÜYOR ── */
    var isi = kuyrukta(id);
    if (isi) {
      h += '<div class="ins-sv">Sv' + sv + ' → Sv' + isi.hedef + ' · inşaatta</div>';
      h += '<div class="ins-geri">' + sureYaz(kalanMs(id)) + '</div>';
      h += '<div class="ins-dugmeler">' +
             '<button class="ins-btn ins-sari" data-is="hizlandir">⏩ HIZLANDIR</button>' +
           '</div>';
      govde.innerHTML = h;
      bagla(govde, id);
      return;
    }

    /* ── TAVAN ── */
    if (sv >= TAVAN) {
      h += '<div class="ins-sv">Sv' + TAVAN + ' — en yüksek seviye</div>';
      govde.innerHTML = h;
      return;
    }

    h += '<div class="ins-sv">Sv' + sv + ' → Sv' + hedef + '</div>';

    var b = bedel(id, hedef);
    if (!b) { govde.innerHTML = h; return; }

    var cuzdan = state.kaynaklar || {};
    Object.keys(b.kaynaklar).forEach(function (k) {
      var gerek = b.kaynaklar[k];
      if (!gerek) return;
      var yeter = (cuzdan[k] || 0) >= gerek;
      h += '<div class="ins-satir' + (yeter ? "" : " eksik") + '">' +
             simge(k) +
             '<span class="ins-ad">' + K_ADI[k] + '</span>' +
             '<span class="ins-mik">' + sayi(gerek) + '</span>' +
           '</div>';
    });

    h += '<div class="ins-sure">⏱ ' + dkYaz(b.dk) + '</div>';

    /* Üretim kazancı — yalnız kaynak binalarında */
    if (URETTIGI[id]) {
      var art = Math.round((URETIM_ARTIS - 1) * 100);
      h += '<div class="ins-bilgi">Üretim +%' + art + '</div>';
    }

    /* Ana Kale kapısı — hangi bina eksik, açıkça yaz */
    if (id === "kale") {
      var kk = kaleKapisi(hedef);
      var muaf = muafKisla(hedef);
      h += '<div class="ins-bilgi">Bu seviyede ' + ADLAR[muaf] +
           ' Sv' + (hedef - 1) + ' kalabilir.</div>';
      if (kk) h += '<div class="ins-not">' + kk + '</div>';
    } else {
      var kt = kaleTavani(id, hedef);
      if (kt) h += '<div class="ins-not">' + kt + '</div>';
    }

    var d = denetle(id, hedef);
    if (!d.olur && d.sebep && d.sebep.indexOf("Önce") !== 0 && d.sebep.indexOf("Ana Kale") !== 0) {
      h += '<div class="ins-not">' + d.sebep + '</div>';
    }

    h += '<div class="ins-dugmeler">' +
           '<button class="ins-btn ins-yesil" data-is="basla"' + (d.olur ? "" : " disabled") + '>' +
             'GELİŞTİR</button>' +
         '</div>';

    govde.innerHTML = h;
    bagla(govde, id);
  }

  function bagla(govde, id) {
    var b1 = govde.querySelector('[data-is="basla"]');
    if (b1) b1.addEventListener("click", function () {
      var r = baslat(id);
      if (!r.ok) { uyar(r.sebep); return; }
      ciz(id);
    });

    var b2 = govde.querySelector('[data-is="hizlandir"]');
    if (b2) b2.addEventListener("click", function () {
      if (typeof hizlandirmaPenceresi === "function") {
        hizlandirmaPenceresi(id, "insaat");
      } else {
        uyar("Hızlandırma penceresi yüklenmedi.");
      }
    });
  }

  /* Bildirimler kapalı (Tuzak 48) — görünmesi gereken uyarı
     showToastForce ile gider. */
  function uyar(m) {
    if (!m) return;
    try {
      if (typeof showToastForce === "function") { showToastForce(m); return; }
      if (typeof showToast === "function") { showToast(m); return; }
    } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════
     GİRİŞ İŞLEMESİ — oyuncu yokken de süre akar
     ═══════════════════════════════════════════════════════════ */

  function turAt() {
    if (!hazir()) return;
    var bitti = bitenleriIsle();
    if (bitti.length) {
      tazele();
      uyar("🏗️ Tamamlandı: " + bitti.join(", "));
      var m = document.getElementById("insaatModal");
      if (m) {
        /* Açık panel hangi binaya aitse onu yeniden çiz */
        var acikId = m.dataset.bina;
        if (acikId) ciz(acikId);
      }
    }
  }

  setInterval(turAt, 10000);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(turAt, 1500); });
  } else {
    setTimeout(turAt, 1500);
  }

  /* ═══════════════════════════════════════════════════════════
     DIŞ KAPILAR
     ═══════════════════════════════════════════════════════════ */

  window.INSAAT = {
    SURUM: SURUM,
    TAVAN: TAVAN,
    SIRA_SAYI: SIRA_SAYI,
    TIP: TIP,
    ADLAR: ADLAR,

    ac: ac,
    kapat: kapat,
    seviye: seviye,
    bedel: bedel,
    denetle: denetle,
    baslat: baslat,
    kuyrukta: kuyrukta,
    kalanMs: kalanMs,
    bitenleriIsle: bitenleriIsle,
    uretimCarpani: uretimCarpani,
    gelistirilebilir: function (id) { return !!TIP[id]; },
    kurDurum: kurDurum,

    /* hizlandirmaPenceresi bu üç kapıyı kullanır */
    kuyruk: function (id) {
      var i = kuyrukta(id);
      return i ? [i] : [];
    },
    toplamMs: function (id) {
      var i = kuyrukta(id);
      if (!i) return 1;
      var b = bedel(i.id, i.hedef);
      return b ? b.dk * 60000 : 1;
    },
    bittiUygula: function () { bitenleriIsle(); tazele(); },

    /* hizlandirmaPenceresi suresi kisaltmak icin bunu cagirir.
       Alan adi 'bitis' — hastane/egitim 'finishAt' kullanir, o yuzden
       kisaltmayi disaridan degil BURADAN yapiyoruz. */
    kisalt: function (id, ms) {
      var i = kuyrukta(id);
      if (!i) return;
      i.bitis = Math.max(Date.now(), i.bitis - ms);
      bitenleriIsle();
      yaz();
      tazele();
      var m = document.getElementById("insaatModal");
      if (m && m.dataset.bina) ciz(m.dataset.bina);
    },

    tani: function () {
      kurDurum();
      return { surum: SURUM, seviyeler: state.binaSv, kuyruk: state.insaat };
    },
  };
})();
