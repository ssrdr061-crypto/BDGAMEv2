/*  ═══════════════════════════════════════════════════════════
    IKONLAR.JS — YETENEK İKONLARI
    SÜRÜM: 1.0

    15 yetenek ikonunu SVG olarak üretir ve HERO_STATS içindeki
    boş `icon: ""` alanlarını doldurur. AYRI GÖRSEL DOSYASI YOK —
    ikonlar koddan çizilir, GitHub'a tek bu dosyayı yüklemen yeter.

    KURULUM (index.html, heroes.js'ten SONRA):
        <script src="heroes.js"></script>
        <script src="ikonlar.js"></script>     ← BUNU EKLE

    NE NEREDE
      1) PALET      → kahraman başına renk. Rengi buradan değiştir.
      2) KALIP      → madalyon çerçevesi (hepsi ortak)
      3) SEMBOLLER  → 15 yeteneğin çizimi
      4) DAĞITIM    → hangi ikon hangi yeteneğe gidiyor

    İKON DEĞİŞTİRME: DAGITIM tablosundaki sembol adını değiştir, yeter.
    Sıralama HERO_STATS'taki abilities dizisiyle aynıdır.
    ═══════════════════════════════════════════════════════════ */
(function () {
"use strict";

/* ── 1) PALET ─────────────────────────────────────────────
   a = en açık ton (vurgu), b = ana renk, c = koyu ton + zemin ışıması */
const PAL = {
  buz:    { a:"#eaf9ff", b:"#66d9ff", c:"#1b6fa8" },  /* HALVORSEN */
  celik:  { a:"#f6fafd", b:"#b8ccdc", c:"#4f6d86" },  /* STELLİN   */
  ates:   { a:"#ffe7a6", b:"#ff9330", c:"#b52c17" },  /* MİKİAN    */
  komuta: { a:"#fff2c4", b:"#f2bf46", c:"#9c5017" },  /* İVANOVNA  */
  elek:   { a:"#f0e2ff", b:"#a97bff", c:"#4b2a9e" },  /* REVOLİA   */
};

/* ── 2) KALIP — madalyon çerçevesi ───────────────────────
   Tüm ikonlar bunun içinde çizilir, uyumu sağlayan şey budur. */
function medal(p, glyph) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128">' +
    '<defs>' +
      '<radialGradient id="bg" cx=".5" cy=".36" r=".75">' +
        '<stop offset="0" stop-color="' + p.c + '"/>' +
        '<stop offset=".58" stop-color="#0a2440"/>' +
        '<stop offset="1" stop-color="#03101d"/>' +
      '</radialGradient>' +
      '<linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#fff5cd"/><stop offset=".42" stop-color="#e2b64d"/>' +
        '<stop offset=".74" stop-color="#8d5c1a"/><stop offset="1" stop-color="#ffe08a"/>' +
      '</linearGradient>' +
      '<linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + p.a + '"/>' +
        '<stop offset=".52" stop-color="' + p.b + '"/>' +
        '<stop offset="1" stop-color="' + p.c + '"/>' +
      '</linearGradient>' +
    '</defs>' +
    '<circle cx="32" cy="32" r="30" fill="url(#bg)" stroke="url(#rim)" stroke-width="3.2"/>' +
    '<circle cx="32" cy="32" r="26.6" fill="none" stroke="#02101c" stroke-width="1.1" opacity=".75"/>' +
    '<path d="M13 22a23 23 0 0 1 38 0" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="3.4" stroke-linecap="round"/>' +
    '<g fill="url(#gl)" stroke="#04121f" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">' +
      glyph(p) +
    '</g>' +
  '</svg>';
}

function uri(p, glyph) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(medal(p, glyph));
}

/* ── 3) SEMBOLLER ────────────────────────────────────────
   Ortak parçalar: KALKAN gövdesi birkaç ikonda tekrar eder. */
const KALKAN = 'M32 12l15 5v13c0 10.5-6.4 16.6-15 19.6C23.4 46.6 17 40.5 17 30V17z';

const SEM = {
  /* HALVORSEN — birlik canı: kalkan üstünde kar tanesi */
  kutup: p => '<path d="' + KALKAN + '"/>' +
    '<g fill="none" stroke="' + p.a + '" stroke-width="2.3"><path d="M32 21v18M24.2 25.5l15.6 9M39.8 25.5l-15.6 9"/></g>' +
    '<g fill="' + p.a + '" stroke="none"><circle cx="32" cy="21" r="1.9"/><circle cx="24.2" cy="34.5" r="1.9"/><circle cx="39.8" cy="34.5" r="1.9"/></g>',

  /* HALVORSEN — rakibi dondurma: buzdan dikenler */
  engel: p => '<path d="M32 8l7 26H25z"/><path d="M18 20l6 14H12z"/><path d="M46 20l6 14H40z"/>' +
    '<path d="M11 34h42v6H11z"/>' +
    '<g fill="none" stroke="' + p.a + '" stroke-width="1.8"><path d="M32 15v14M18 25v9M46 25v9"/></g>',

  /* HALVORSEN — savunma: buz kaplı kalkan */
  zirh: p => '<path d="' + KALKAN + '"/>' +
    '<g fill="none" stroke="' + p.a + '" stroke-width="2"><path d="M32 14v34M20 22l24 8M44 22l-24 8"/></g>',

  /* STELLİN — saldırı+savunma: kalkan ve kılıç */
  durus: p => '<path d="' + KALKAN + '"/>' +
    '<g fill="' + p.a + '" stroke="#04121f" stroke-width="1.4">' +
      '<path d="M30.4 17h3.2l1.1 18-2.7 5.4-2.7-5.4z"/>' +
      '<rect x="24.5" y="16" width="15" height="3.2" rx="1.6"/>' +
    '</g>',

  /* STELLİN — hasar yansıtma: kalkandan geri dönen ok */
  yansima: p => '<path d="' + KALKAN + '"/>' +
    '<g fill="none" stroke="' + p.a + '" stroke-width="2.8" stroke-linecap="round"><path d="M23 36c1-10 9-14 16-11"/></g>' +
    '<path d="M45 20l1.5 9.5-9-3z" fill="' + p.a + '" stroke="#04121f" stroke-width="1.2"/>',

  /* MİKİAN — ateş büyüsü: alev topu */
  atesbuyusu: p => '<path d="M32 7c9 10 15 15 15 24a15 15 0 0 1-30 0c0-6.5 3.6-10 6.6-14.4C24.8 21 26.6 23.4 29 25c-1.6-8 1-13 3-18z"/>' +
    '<path d="M32 26c4 5 6.5 7.5 6.5 11.5a6.5 6.5 0 0 1-13 0c0-3.5 3.5-6.5 6.5-11.5z" fill="' + p.a + '" stroke="none" opacity=".9"/>',

  /* MİKİAN — yasak büyü: kafatası */
  yasak: p => '<path d="M32 10c10.5 0 17 7.2 17 15.6 0 6-3 9.4-5.2 11.4V44H20.2v-7C18 35 15 31.6 15 25.6 15 17.2 21.5 10 32 10z"/>' +
    '<g fill="#04121f" stroke="none"><circle cx="25" cy="27" r="4.4"/><circle cx="39" cy="27" r="4.4"/><path d="M29.6 34h4.8L32 40z"/></g>' +
    '<g fill="' + p.a + '" stroke="none" opacity=".85"><circle cx="26.4" cy="25.6" r="1.5"/><circle cx="40.4" cy="25.6" r="1.5"/></g>' +
    '<path d="M22 47h20v4H22z"/>',

  /* İVANOVNA — ordu düzeni: komutan sancağı */
  disiplin: p => '<rect x="17" y="9" width="4" height="45" rx="2"/>' +
    '<path d="M21 11h26l-6.5 9.5L47 30H21z"/>' +
    '<path d="M33 15.5l1.8 3.8 4.2.5-3.1 2.9.9 4.1-3.8-2.1-3.8 2.1.9-4.1-3.1-2.9 4.2-.5z" fill="' + p.a + '" stroke="none"/>',

  /* İVANOVNA — yaralı dönüşü: kalp ve dönüş oku */
  sevgili: p => '<path d="M32 51C22 44 12 37 12 27.5A9.5 9.5 0 0 1 32 22a9.5 9.5 0 0 1 20 5.5C52 37 42 44 32 51z"/>' +
    '<g fill="none" stroke="' + p.a + '" stroke-width="2.8" stroke-linecap="round"><path d="M25 33a8 8 0 1 0 3-7"/></g>' +
    '<path d="M25.5 20.5l3 7-8 .5z" fill="' + p.a + '" stroke="none"/>',

  /* İVANOVNA — istihbarat: göz */
  istihbarat: p => '<path d="M32 17c12.5 0 20.5 9.6 22.5 15-2 5.4-10 15-22.5 15S11.5 37.4 9.5 32C11.5 26.6 19.5 17 32 17z"/>' +
    '<circle cx="32" cy="32" r="9" fill="' + p.c + '" stroke="#04121f" stroke-width="1.5"/>' +
    '<circle cx="32" cy="32" r="4" fill="#04121f" stroke="none"/>' +
    '<circle cx="29" cy="29" r="1.7" fill="' + p.a + '" stroke="none"/>',

  /* İVANOVNA pasifi — Gölge Manevrası: yer değiştiren kale */
  golge: p => '<g opacity=".38"><path d="M14 30h20v20H14z"/><path d="M12 22h6v8h-6zM21 22h6v8h-6zM30 22h6v8h-6z"/></g>' +
    '<path d="M30 30h22v20H30z"/><path d="M28 21h7v9h-7zM38 21h7v9h-7zM48 21h7v9h-7z"/>' +
    '<path d="M37 38h8v12h-8z" fill="' + p.c + '"/>' +
    '<g fill="none" stroke="' + p.a + '" stroke-width="2.4" stroke-linecap="round"><path d="M17 15c6-5 14-5 20 0"/></g>',

  /* REVOLİA — elektrik akımı: yıldırım */
  akim: p => '<path d="M36 7L19 35h10l-4 22 21-30H34z"/>' +
    '<path d="M34.5 14l-9 16h6l-2 10 10-14h-7z" fill="' + p.a + '" stroke="none" opacity=".75"/>',

  /* REVOLİA — robot güçlendirme: dişli ve yıldırım */
  yukleme: p => '<path d="M32 8l4.4 4.6 6.3-.6 1.5 6.2 5.8 2.6-2 6 2 6-5.8 2.6-1.5 6.2-6.3-.6L32 46l-4.4-5-6.3.6-1.5-6.2-5.8-2.6 2-6-2-6 5.8-2.6 1.5-6.2 6.3.6z"/>' +
    '<circle cx="32" cy="27" r="10" fill="' + p.c + '" stroke="#04121f" stroke-width="1.4"/>' +
    '<path d="M34 19l-7 10h4.5l-2 8 8-11h-5z" fill="' + p.a + '" stroke="none"/>' +
    '<path d="M22 50h20v5H22z"/>',

  /* REVOLİA — yıldırım fırtınası: bulut ve şimşekler */
  firtina: p => '<path d="M20.5 34A8.5 8.5 0 0 1 23 17.6a11.5 11.5 0 0 1 21.6 3.2A7.4 7.4 0 0 1 43.5 34z"/>' +
    '<g fill="' + p.a + '" stroke="#04121f" stroke-width="1.2">' +
      '<path d="M27 36l-5 10h4l-3 8 9-12h-4.5l3-6z"/>' +
      '<path d="M41 36l-5 10h4l-3 8 9-12h-4.5l3-6z"/>' +
    '</g>',

  /* REVOLİA pasifi — Robot Kopyalama: çoğalan robot */
  kopya: p => '<g opacity=".38"><rect x="12" y="16" width="24" height="22" rx="6"/></g>' +
    '<rect x="24" y="24" width="28" height="24" rx="7"/>' +
    '<path d="M38 16v8" stroke="' + p.a + '" stroke-width="2.4"/><circle cx="38" cy="14.5" r="3" fill="' + p.a + '"/>' +
    '<g fill="#04121f" stroke="none"><rect x="30" y="31" width="6.5" height="6.5" rx="2"/><rect x="39.5" y="31" width="6.5" height="6.5" rx="2"/></g>' +
    '<g fill="' + p.a + '" stroke="none"><rect x="31" y="32" width="2.4" height="2.4" rx="1"/><rect x="40.5" y="32" width="2.4" height="2.4" rx="1"/></g>' +
    '<path d="M31 42h14v3H31z" fill="' + p.c + '" stroke="none"/>',
};

/* ── 4) DAĞITIM ──────────────────────────────────────────
   ab: abilities dizisiyle aynı sırada • pas: pasif yetenek */
const DAGITIM = {
  buz_savascisi: { pal:"buz",    ab:["kutup","engel","zirh"] },
  celik_savasci: { pal:"celik",  ab:["durus","yansima"] },
  ates_buyucusu: { pal:"ates",   ab:["atesbuyusu","yasak"] },
  ivanovna:      { pal:"komuta", ab:["disiplin","sevgili","istihbarat"], pas:"golge" },
  revolia:       { pal:"elek",   ab:["akim","yukleme","firtina"],        pas:"kopya" },
};

/* ── UYGULA ── heroes.js yüklenmiş olmalı */
function uygula() {
  if (typeof HERO_STATS === "undefined") return false;

  Object.keys(DAGITIM).forEach(heroId => {
    const h = HERO_STATS[heroId];
    const d = DAGITIM[heroId];
    if (!h || !d) return;
    const p = PAL[d.pal];

    (h.abilities || []).forEach((ab, i) => {
      const ad = d.ab[i];
      if (ad && SEM[ad] && !ab.icon) ab.icon = uri(p, SEM[ad]);
    });

    if (h.passive && d.pas && SEM[d.pas] && !h.passive.icon) {
      h.passive.icon = uri(p, SEM[d.pas]);
    }
  });

  /* dışarıdan tek tek çağırmak istersen: yetenekIkonu("elek","akim") */
  window.yetenekIkonu = (palet, sembol) =>
    (PAL[palet] && SEM[sembol]) ? uri(PAL[palet], SEM[sembol]) : "";

  return true;
}

if (!uygula()) document.addEventListener("DOMContentLoaded", uygula);

})();
