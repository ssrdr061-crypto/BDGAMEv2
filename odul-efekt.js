/* ═══════════════════════════════════════════════════════════════════════
   odul-efekt.js — ÖDÜL TOPLAMA ANİMASYONLARI (motor + bağlantı, tek dosya)
   ───────────────────────────────────────────────────────────────────────
   SADECE GÖRSEL KATMAN. Ödül verme mantığına dokunulmaz:
   claimDailyReward / gunlukOdulAl / rehber.js grant() aynen çalışır,
   state'e bir tek satır bile yazılmaz.

   Bağlandığı iki yer (ikisi de ÇALIŞMA ANINDA doğar, bu yüzden
   dinleyiciler document üzerinde YAKALAMA evresinde durur):
     1) Günlük giriş — #gunlukSerit .gunluk-kutu.bugun → #gunlukPop → #gunlukPopAl
     2) Keşif ödülü  — rehber.js #welcomeBack → .wc-next ("Al")

   ELMAS SAYACI: ödül state'e BİZDEN ÖNCE yazılır ve renderDiamonds()
   rakamı hemen son değere çeker. O yüzden sayaç uçuş boyunca KİLİTLENİR
   (renderDiamonds sarmalanır; işlevi değişmez, yalnız #diamondAmount
   alanının metnini uçuş bitene kadar animasyon sahiplenir). Kilit
   bitince renderDiamonds bir kez daha çağrılır — son rakam her hâlükârda
   state'ten gelir, animasyondan değil.

   Tanı: adres satırına ?odulefekt=1  → sağ üstte kutu, ekrana basar.
   ═══════════════════════════════════════════════════════════════════════ */

var OdulEfekt = (function () {

  var AYAR = {
    klasor: '',        // görsellerin klasörü, örn: 'img/' — sonuna / koy
    katman: null       // parçacıkların ekleneceği kapsayıcı; boşsa document.body
  };

  function el(x) {
    if (!x) return null;
    return typeof x === 'string' ? document.querySelector(x) : x;
  }

  function yavas() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function katman() {
    var k = AYAR.katman ? el(AYAR.katman) : document.body;
    if (getComputedStyle(k).position === 'static') k.style.position = 'relative';
    return k;
  }

  /* Kaynak/hedef ya bir DÜĞÜM ya da {x,y} EKRAN NOKTASIDIR.
     Nokta biçimi şart: ödül penceresi "Al" basılınca oyunun kendi kodu
     tarafından anında siliniyor; koordinat tıklama anında ölçülüp
     saklanmazsa uçuşun başlangıcı kayboluyor. */
  function coz(x) {
    if (!x) return null;
    if (typeof x === 'object' && typeof x.x === 'number' && typeof x.y === 'number') {
      return { nokta: x };
    }
    var n = el(x);
    return n ? { dugum: n } : null;
  }

  function merkez(node, k) {
    var a = node.getBoundingClientRect(), b = k.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
  }

  function konum(c, k) {
    if (c.nokta) {
      var b = k.getBoundingClientRect();
      return { x: c.nokta.x - b.left, y: c.nokta.y - b.top };
    }
    return merkez(c.dugum, k);
  }

  /* Ekranda yeri olmayan hedefe (gizli panel, kapalı dock) uçurulmaz. */
  function gorunur(c) {
    if (c.nokta) return true;
    var r = c.dugum.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }

  function zipla(node, buyume, sure) {
    if (!node || yavas()) return;
    node.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(' + (buyume || 1.45) + ')' }, { transform: 'scale(1)' }],
      { duration: sure || 320, easing: 'cubic-bezier(.34,1.6,.5,1)' }
    );
  }

  /* --- sayı biçimleri --- */

  function tamBicim(n) {
    return Math.round(n).toLocaleString('tr-TR');
  }

  // 4700 -> "4,7B" | 35200000 -> "35,2M" | 2400000000 -> "2,4Mr"
  function kisaBicim(n) {
    var b = [[1e9, 'Mr'], [1e6, 'M'], [1e3, 'B']];
    for (var i = 0; i < b.length; i++) {
      if (n >= b[i][0]) {
        var v = n / b[i][0];
        return (v >= 100 ? Math.round(v) : v.toFixed(1)).toString().replace('.', ',') + b[i][1];
      }
    }
    return Math.round(n).toString();
  }

  function sayiyaCevir(metin) {
    if (metin === 0) return 0;
    if (!metin) return 0;
    var s = String(metin).trim();
    var carpan = 1;
    if (/Mr$/i.test(s)) carpan = 1e9;
    else if (/M$/i.test(s)) carpan = 1e6;
    else if (/B$/i.test(s)) carpan = 1e3;
    s = s.replace(/[^0-9,.]/g, '');
    s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n * carpan;
  }

  /* --- tek parçacık --- */

  function parcacik(kaynakDugum, gorsel, boyut, k) {
    var p;
    if (gorsel) {
      p = document.createElement('img');
      p.src = (/^(https?:|\/|data:)/.test(gorsel) ? '' : AYAR.klasor) + gorsel;
      p.alt = '';
      p.style.width = boyut + 'px';
      p.style.height = 'auto';
    } else if (kaynakDugum) {
      p = kaynakDugum.cloneNode(true);
      p.style.width = boyut + 'px';
      p.style.height = 'auto';
      p.removeAttribute('id');
    } else {
      /* Ne dosya adı ne düğüm var: sade bir ışık noktası. */
      p = document.createElement('div');
      p.style.width = boyut + 'px';
      p.style.height = boyut + 'px';
      p.style.borderRadius = '50%';
      p.style.background = 'radial-gradient(circle at 35% 30%, #fff, #7fe3ff 55%, #1fa3ea)';
    }
    p.style.position = 'absolute';
    p.style.pointerEvents = 'none';
    p.style.zIndex = 99999;
    k.appendChild(p);
    return p;
  }

  /**
   * ucur(kaynak, hedef, secenekler) -> Promise
   * kaynak/hedef: seçici, düğüm ya da {x,y} ekran noktası
   * secenekler: adet · gorsel · boyut · sayac · artis · bicim · sure ·
   *             arali · gecikme · sesVarid
   */
  function ucur(kaynak, hedef, secenekler) {
    var o = secenekler || {};
    var kc = coz(kaynak), hc = coz(hedef);
    var sayac = el(o.sayac);
    var adet = o.adet || 12;
    var artis = o.artis || 0;
    var bicimle = o.bicim === 'kisa' ? kisaBicim : tamBicim;

    if (!kc || !hc || !gorunur(kc) || !gorunur(hc)) return Promise.resolve();

    if (yavas()) {                       // hareket azaltma açık: yalnız sonuç
      if (sayac && artis) sayac.textContent = bicimle(sayiyaCevir(sayac.textContent) + artis);
      return Promise.resolve();
    }

    var k = katman();
    var bas = konum(kc, k), son = konum(hc, k);
    var sure = o.sure || 850, arali = o.arali == null ? 55 : o.arali, boyut = o.boyut || 26;
    var basDeger = sayac ? sayiyaCevir(sayac.textContent) : 0;
    var varan = 0;

    return new Promise(function (bitti) {
      for (var i = 0; i < adet; i++) {
        (function (i) {
          var p = parcacik(kc.dugum, o.gorsel, boyut, k);
          p.style.left = bas.x + 'px';
          p.style.top = bas.y + 'px';
          var dx = son.x - bas.x, dy = son.y - bas.y;
          var sapma = (Math.random() - 0.5) * 80;      // dağılma
          var yay = -40 - Math.random() * 30;          // yukarı yay

          var a = p.animate([
            { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
            { transform: 'translate(calc(-50% + ' + sapma + 'px), calc(-50% + ' + yay + 'px)) scale(1.1)', opacity: 1, offset: .25 },
            { transform: 'translate(calc(-50% + ' + (dx * .55 + sapma * .4) + 'px), calc(-50% + ' + (dy * .35 + yay * .6) + 'px)) scale(1)', opacity: 1, offset: .6 },
            { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(.35)', opacity: .75 }
          ], {
            duration: sure,
            delay: (o.gecikme || 0) + i * arali,
            easing: 'cubic-bezier(.45,.05,.25,1)',
            fill: 'forwards'
          });

          a.onfinish = function () {
            p.remove();
            varan++;
            if (hc.dugum) zipla(hc.dugum, 1.4);
            if (o.sesVarid) o.sesVarid(varan, adet);

            if (sayac && artis) {
              var bd = basDeger + artis * (varan - 1) / adet;
              var sd = basDeger + artis * varan / adet;
              var t0 = performance.now();
              (function adim(now) {
                var t = Math.min(1, (now - t0) / 220);
                sayac.textContent = bicimle(bd + (sd - bd) * t);
                if (t < 1) requestAnimationFrame(adim);
              })(performance.now());
            }
            if (varan === adet) bitti();
          };
        })(i);
      }
    });
  }

  /** topla(liste) — birden fazla ödülü SIRAYLA uçurur. */
  function topla(liste) {
    var s = Promise.resolve();
    liste.forEach(function (item) {
      s = s.then(function () { return ucur(item.kaynak, item.hedef, item); });
    });
    return s;
  }

  /** Ödül panelini yumuşakça kapatır. */
  function paneliKapat(panel, gizle) {
    var p = el(panel);
    if (!p) return Promise.resolve();
    if (yavas()) { if (gizle !== false) p.style.display = 'none'; return Promise.resolve(); }
    return new Promise(function (bitti) {
      var a = p.animate(
        [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.9)', opacity: 0 }],
        { duration: 400, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }
      );
      a.onfinish = function () { if (gizle !== false) p.style.display = 'none'; bitti(); };
    });
  }

  /** Paneli sıçrayarak açar. */
  function paneliAc(panel) {
    var p = el(panel);
    if (!p) return;
    p.style.display = '';
    if (yavas()) return;
    p.animate(
      [{ transform: 'scale(.85)', opacity: 0 }, { transform: 'scale(1.03)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 420, easing: 'cubic-bezier(.34,1.4,.5,1)', fill: 'forwards' }
    );
  }

  /** Günlük giriş kutusu: sallanır, şişer, söner; sonra bitince() çağrılır. */
  function kutuAc(kutu, bitince) {
    var k = el(kutu);
    if (!k || yavas()) { if (bitince) bitince(); return; }
    var a = k.animate([
      { transform: 'rotate(0deg) scale(1)' },
      { transform: 'rotate(-7deg) scale(1.04)', offset: .15 },
      { transform: 'rotate(7deg) scale(1.04)', offset: .3 },
      { transform: 'rotate(-5deg) scale(1.06)', offset: .45 },
      { transform: 'rotate(4deg) scale(1.08)', offset: .6 },
      { transform: 'rotate(0deg) scale(1.25)', opacity: 1, offset: .82 },
      { transform: 'rotate(0deg) scale(1.6)', opacity: 0 }
    ], { duration: 900, easing: 'ease-in-out', fill: 'forwards' });
    a.onfinish = function () { if (bitince) bitince(); };
  }

  /** Bir düğümün ekran merkezi — düğüm silinmeden ÖNCE ölçmek için. */
  function noktasi(x) {
    var n = el(x);
    if (!n) return null;
    var r = n.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  return {
    ayarla: function (a) { for (var x in a) AYAR[x] = a[x]; },
    ucur: ucur,
    topla: topla,
    zipla: zipla,
    paneliAc: paneliAc,
    paneliKapat: paneliKapat,
    kutuAc: kutuAc,
    noktasi: noktasi,
    yavas: yavas,
    tamBicim: tamBicim,
    kisaBicim: kisaBicim,
    sayiyaCevir: sayiyaCevir
  };
})();


/* ═══════════════════════════════════════════════════════════════════════
   BAĞLANTI — gerçek id/class adları
   ═══════════════════════════════════════════════════════════════════════ */
var ODUL_SECICI = {
  /* üst çubuk */
  hudElmas:      '.hud-top .diamond-pill .elmas-kutu',   // index.html 2412
  hudElmasSayi:  '#diamondAmount',                       // renderDiamonds yazar
  hudCanta:      '.dock-btn[data-panel="inventory"]',    // alt dock, çanta

  /* günlük giriş — hepsi çalışma anında doğar */
  gunlukSerit:   '#gunlukSerit',
  gunlukKutu:    '.gunluk-kutu.bugun',
  gunlukPanel:   '#gunlukPop',
  gunlukAl:      '#gunlukPopAl',
  gunlukElmas:   '#gunlukPop .gp-satir .elmas-kutu',
  gunlukParca:   '#gunlukParcaSecim .gunluk-parca-sec.secili',

  /* keşif ödülü — rehber.js */
  kesifPanel:    '#welcomeBack',
  kesifAl:       '#welcomeBack .wc-next',
  kesifHediye:   '#welcomeBack .wc-gift',
  kesifElmas:    '#welcomeBack .wc-gift .elmas-kutu',
  kesifParca:    '#welcomeBack .wc-parca img'
};

var ODUL_AYAR = {
  klasor:       '',        // görseller kök dizinde
  sayacBicimi:  'tam',     // #diamondAmount fmt() ile "1.234.567" basıyor
  elmasGorsel:  'elmas.webp',
  elmasAdet:    14,
  elmasBoyut:   26,
  parcaAdet:    5,
  parcaBoyut:   24,
  kilitTavan:   45000      // sayaç kilidi güvenlik süresi (ms)
};

(function () {
  'use strict';

  var S = ODUL_SECICI, A = ODUL_AYAR;
  OdulEfekt.ayarla({ klasor: A.klasor });

  /* ── tanı (?odulefekt=1) — ekrana basar, showToast'a değil ───────── */
  var TANI = /[?&]odulefekt=1/.test(location.search);
  var taniKutu = null;
  function tani(satir) {
    if (!TANI) return;
    if (!taniKutu) {
      taniKutu = document.createElement('div');
      taniKutu.id = 'odulEfektTani';
      taniKutu.style.cssText = 'position:fixed;top:6px;right:6px;z-index:100000;max-width:62vw;' +
        'background:rgba(2,8,22,.85);color:#e8f4ff;font:700 11px/1.35 monospace;' +
        'padding:6px 8px;border-radius:8px;pointer-events:none;white-space:pre-wrap;';
      document.body.appendChild(taniKutu);
    }
    taniKutu.textContent = (taniKutu.textContent + '\n' + satir).split('\n').slice(-14).join('\n');
  }

  /* ── sayaç kilidi ────────────────────────────────────────────────
     Ödül state'e bizden önce yazılıyor. Kilit açıkken renderDiamonds
     kendi işini yapar (invDiamonds, kaynaklar, kayıt) ama #diamondAmount
     metnini animasyon sahiplenir. */
  var kilit = false, dondurulan = null, kilitZaman = 0;

  function sayacDugum() { return document.querySelector(S.hudElmasSayi); }
  function sayacOku() {
    var e = sayacDugum();
    return e ? OdulEfekt.sayiyaCevir(e.textContent) : 0;
  }
  function sayacYaz(v) {
    var e = sayacDugum();
    if (e) e.textContent = OdulEfekt.tamBicim(v);
  }

  (function sarmala() {
    var asil = window.renderDiamonds;
    if (typeof asil !== 'function') { tani('renderDiamonds YOK — sayaç kilidi kapalı'); return; }
    window.renderDiamonds = function () {
      var e = sayacDugum();
      var onceki = e ? e.textContent : null;
      var r = asil.apply(this, arguments);
      if (kilit && e) e.textContent = (dondurulan != null) ? OdulEfekt.tamBicim(dondurulan) : onceki;
      return r;
    };
  })();

  function kilitAc(deger) {
    kilit = true; dondurulan = deger; kilitZaman = Date.now();
    sayacYaz(deger);
    tani('kilit ↓ ' + deger);
  }
  function kilitSer() { dondurulan = null; }        // uçuş sayacı devraldı
  function kilitKapat() {
    if (!kilit) return;
    kilit = false; dondurulan = null;
    if (typeof window.renderDiamonds === 'function') window.renderDiamonds();
    tani('kilit ↑ (state\'ten tazelendi)');
  }

  /* Güvenlik: pencere Al'a basılmadan kaybolursa ya da süre aşılırsa
     kilit kendi kendine açılır — rakam asla yanlış donup kalmaz. */
  setInterval(function () {
    if (!kilit) return;
    if (Date.now() - kilitZaman > A.kilitTavan) { kilitKapat(); return; }
    if (dondurulan != null &&
        !document.querySelector(S.gunlukPanel) &&
        !document.querySelector(S.kesifPanel)) kilitKapat();
  }, 700);

  /* ── yardımcılar ─────────────────────────────────────────────────── */
  function parcaGorseliniAl(anahtar) {
    try {
      if (typeof window.parcaGorseli === 'function') return window.parcaGorseli(anahtar) || '';
    } catch (e) {}
    return '';
  }

  function elmasUcusu(nokta, artis) {
    if (!nokta || !(artis > 0)) { kilitKapat(); return Promise.resolve(); }
    kilitSer();
    return OdulEfekt.ucur(nokta, S.hudElmas, {
      gorsel: A.elmasGorsel, adet: A.elmasAdet, boyut: A.elmasBoyut,
      sayac: S.hudElmasSayi, artis: artis, bicim: A.sayacBicimi
    }).then(kilitKapat, kilitKapat);
  }

  function parcaUcusu(nokta, gorsel, adet, gecikme) {
    if (!nokta || !gorsel) return Promise.resolve();
    return OdulEfekt.ucur(nokta, S.hudCanta, {
      gorsel: gorsel, adet: adet || A.parcaAdet, boyut: A.parcaBoyut,
      gecikme: gecikme || 0
    });
  }

  /* ═══ 1) GÜNLÜK GİRİŞ ══════════════════════════════════════════════
     Kutu tıklaması YAKALAMA evresinde durdurulur: önce sallanma/şişme
     oynar, sonra oyunun kendi openDailyRewardChest'i çağrılır. Ödül
     mantığı aynı fonksiyondan geçer, ikinci bir yol açılmaz. */
  var kutuOynuyor = false;
  var gunlukArtis = 0;

  document.addEventListener('click', function (ev) {
    var kutu = ev.target && ev.target.closest ? ev.target.closest(S.gunlukKutu) : null;
    if (!kutu) return;
    if (!kutu.closest(S.gunlukSerit)) return;
    if (typeof window.openDailyRewardChest !== 'function') return;  // devral, sessiz yedek yol yok
    if (OdulEfekt.yavas()) return;                                  // hareket azaltma: oyun normal aksın
    if (kutuOynuyor) { ev.preventDefault(); ev.stopPropagation(); return; }

    ev.preventDefault();
    ev.stopPropagation();
    kutuOynuyor = true;

    var eski = sayacOku();
    OdulEfekt.kutuAc(kutu, function () {
      kutuOynuyor = false;
      try { window.openDailyRewardChest(); } catch (e) { tani('openDailyRewardChest hata'); }
      var pop = document.querySelector(S.gunlukPanel);
      if (!pop) { tani('pop açılmadı'); return; }
      gunlukArtis = Math.max(0, sayacOku() - eski);
      if (gunlukArtis > 0) kilitAc(eski);
      OdulEfekt.paneliAc(pop);
      tani('günlük pop · artış ' + gunlukArtis);
    });
  }, true);

  /* "Al" — oyunun kendi gunlukOdulAl'ı pencereyi ANINDA siliyor, o
     yüzden koordinatlar ve seçilen parça tıklama anında ölçülür. */
  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest(S.gunlukAl) : null;
    if (!btn || btn.disabled) return;
    if (OdulEfekt.yavas()) return;

    var elmasNok = OdulEfekt.noktasi(S.gunlukElmas);
    var secili   = document.querySelector(S.gunlukParca);
    var parcaNok = secili ? OdulEfekt.noktasi(secili) : null;
    var parcaGor = secili ? parcaGorseliniAl(secili.dataset.parca) : '';
    var artis    = gunlukArtis;
    gunlukArtis  = 0;

    /* Oyun kendi işini bitirsin (parça çantaya, pencere kapansın),
       sonra uçuş başlasın. */
    setTimeout(function () {
      elmasUcusu(elmasNok, artis);
      if (parcaNok && parcaGor) parcaUcusu(parcaNok, parcaGor, 3, 420);
      tani('günlük Al · parça ' + (parcaGor || 'yok'));
    }, 0);
  }, true);

  /* ═══ 2) KEŞİF ÖDÜLÜ (rehber.js) ═══════════════════════════════════
     Elmas burada "Al" anında veriliyor. Artışı sabitten değil,
     tıklama öncesi/sonrası sayaç farkından okuyoruz — 50.000 rakamı
     ikinci bir yerde tekrarlanmaz, tek doğruluk kaynağı rehber.js. */
  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest(S.kesifAl) : null;
    if (!btn) return;
    if (OdulEfekt.yavas()) return;
    if (!document.querySelector(S.kesifHediye)) return;   // henüz metin adımı, hediye ekranı değil

    var eski     = sayacOku();
    var elmasNok = OdulEfekt.noktasi(S.kesifElmas) || OdulEfekt.noktasi(S.kesifHediye);
    var parcaEl  = document.querySelector(S.kesifParca);
    var parcaNok = parcaEl ? OdulEfekt.noktasi(parcaEl) : null;
    var parcaGor = parcaEl ? (parcaEl.getAttribute('src') || '') : '';

    setTimeout(function () {
      var artis = Math.max(0, sayacOku() - eski);
      if (artis > 0) kilitAc(eski);
      elmasUcusu(elmasNok, artis);
      if (parcaNok && parcaGor) parcaUcusu(parcaNok, parcaGor, A.parcaAdet, 420);
      tani('keşif Al · artış ' + artis);
    }, 0);
  }, true);

  tani('odul-efekt.js hazır');
  console.log('[odul-efekt.js] Ödül animasyon katmani yuklendi ✔');
})();
