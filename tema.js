/* ═══════════════════════════════════════════════════════════════
   tema.js — OYUNUN GÖRÜNÜM VE ARAYÜZ DOSYASI
   ---------------------------------------------------------------
   Burada SADECE görünüm ve genel arayüz davranışı vardır.
   Oyun mantığıyla (savaş, füze, mağaza, birlik) hiç ilgisi yoktur;
   bu dosyayı silsen oyun aynen çalışır, sadece eski görünümüne döner.

   KURULUM — birleştiricide EN SON gömülmeli:
       <script src="tema.js"></script>

   İÇİNDEKİLER
     1) Tek tip şablon (mağaza kartı görünümü)
     2) Üst HUD  — elmas ve can rozetleri
     3) Harita   — bölge ve canavar etiketleri
     4) Savaş ekranı görünümü
     5) Can potu baloncuğu
     6) Çanta paneli
     7) Çıkış / onay pencereleri
     8) Genel arayüz düzeltmeleri (sürükleme kilidi, mağaza baloncuğu)
   ═══════════════════════════════════════════════════════════════ */
(function () {
"use strict";

/* ── AYAR: haritada kaç pikselden sonrası "kaydırma" sayılsın ──
   Küçültürsen daha hassas olur (yanlış tıklama azalır ama gerçek
   tıklamalar da yutulabilir), büyütürsen tam tersi. */
const DRAG_PX = 12;

/* ═══════════════════════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════════════════════ */
(function injectCSS() {
  const st = document.createElement("style");
  st.id = "temaStyles";
  st.textContent = `
/* ═══════════════════════════════════════════════════════════════
   TEK TİP ŞABLON — magaza.js'teki mağaza kartıyla birebir aynı.
   Bu üç değeri değiştirirsen tüm oyunun görünümü değişir.
   ═══════════════════════════════════════════════════════════════ */
.battle-arena,
.backup-modal,
.pvp-pop,
#panel-inventory .overlay-card,
#panel-rank .overlay-card{
  background:
    radial-gradient(ellipse 100% 50% at 50% 0%, rgba(170,240,255,.5), transparent 72%),
    radial-gradient(ellipse 80% 40% at 50% 105%, rgba(8,45,80,.55), transparent 75%),
    linear-gradient(180deg, #1fa3ea, #0e6fc0) !important;
  border:3px solid rgba(190,240,255,.85) !important;
  box-shadow:0 0 26px rgba(120,225,255,.45), inset 0 3px 0 rgba(255,255,255,.45) !important;
}

/* ── savaş ekranı: mağaza şablonuna uydurma ── */
.battle-arena-top-bar{
  background:transparent !important;
}
.battle-arena .power-compare-box,
.battle-arena .troop-select-box,
.battle-arena .battle-log{
  background:linear-gradient(180deg, rgba(34,72,143,.62), rgba(13,34,70,.72)) !important;
  border:2px solid rgba(190,240,255,.38) !important;
  border-radius:14px !important;
  box-shadow:inset 0 2px 3px rgba(150,205,255,.25), 0 4px 10px rgba(0,20,45,.35) !important;
}
.battle-arena .troop-select-title,
.battle-arena .power-compare-label{
  color:#fff !important; text-shadow:0 2px 4px rgba(0,40,70,.6) !important;
}
.battle-arena .battle-log,
.battle-arena .troop-select-top .t-name{
  color:#eaf7ff !important; text-shadow:0 1px 2px rgba(0,30,55,.5);
}
.battle-arena .troop-select-summary{
  color:#cfeaff !important; border-top-color:rgba(190,240,255,.28) !important;
}
.battle-arena .troop-select-top .t-count,
.battle-arena .troop-select-summary b{
  color:#ffd257 !important;
}

/* ═══════════════════════════════════════════════════════════════
   ÜST HUD — GENEL CAN ROZETİ
   Bar kaldırıldı; yerine ❤️ + yüzde. Kutu artık içeriği kadar dar
   ve mağazayla aynı açık mavi tonda.
   ═══════════════════════════════════════════════════════════════ */
#staminaPill .stamina-bar-track{ display:none !important; }
#staminaPill{
  flex:0 0 auto !important;
  margin:0 4px !important;
  padding:6px 13px !important;
  background:#2DC9FC !important;
  color:#0d2a36 !important;
  border:1px solid rgba(0,0,0,.22) !important;
  font-weight:800 !important;
}
#staminaPill #staminaText{
  color:#0d2a36 !important; font-weight:800; letter-spacing:.2px;
}

/* ── ELMAS ROZETİ: mağazayla aynı açık mavi ── */
.hud-pill.diamond-pill{
  background:#2DC9FC !important;
  color:#0d2a36 !important;
  border:1px solid rgba(0,0,0,.22) !important;
  font-weight:800 !important;
}
.hud-pill.diamond-pill .amount{ color:#0d2a36 !important; font-weight:800 !important; }

/* ── HARİTA: bölge yazıları kaldırıldı ── */
.map-zone-label{ display:none !important; }

/* ── SAVAŞ GÜNLÜĞÜ: aç/paylaş butonları + sohbet mektubu ── */
.tema-share-btn, .tema-open-btn{
  flex:1; border:none; cursor:pointer; border-radius:10px;
  padding:8px 6px; font-family:'Baloo 2','Nunito',sans-serif;
  font-weight:800; font-size:12px; color:#fff;
  box-shadow:0 3px 0 #0a2a63, inset 0 1px 0 rgba(255,255,255,.25);
  text-shadow:0 1px 2px rgba(0,20,50,.5);
  -webkit-tap-highlight-color:transparent; transition:transform .07s, box-shadow .07s;
}
.tema-open-btn{ background:linear-gradient(180deg,#5ec46a,#1f6631); box-shadow:0 3px 0 #14431f,inset 0 1px 0 rgba(255,255,255,.25); }
.tema-share-btn{ background:linear-gradient(180deg,#3b74e8,#12408f); }
.tema-share-btn:active, .tema-open-btn:active{ transform:translateY(3px); }
.tema-letter{
  border:none; cursor:pointer; border-radius:10px; padding:9px 14px;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:13px; color:#fff;
  background:linear-gradient(180deg,#f0a93b,#c47012);
  box-shadow:0 3px 0 #7a4708, inset 0 1px 0 rgba(255,255,255,.3);
  -webkit-tap-highlight-color:transparent;
}
.tema-letter:active{ transform:translateY(2px); box-shadow:0 1px 0 #7a4708; }

/* ═══════════════════════════════════════════════════════════════
   SAVAŞ PANELİ — SADELEŞTİRME
   ═══════════════════════════════════════════════════════════════ */

/* güç karşılaştırma kutusu tamamen kaldırıldı */
.battle-arena .power-compare-box,
.battle-arena #enemyPowerPreview{ display:none !important; }

/* birlik özeti (96 birlik · ⚔️+288 ... + HALVORSEN...) kaldırıldı */
.battle-arena .troop-select-summary{ display:none !important; }

/* Şövalye / Asker / Robot → hepsi BÜYÜK HARF */
.battle-arena .troop-select-top .t-name{ text-transform:uppercase !important; }

/* "🦸 Komutan Seç" başlığı kaldırıldı */
.battle-arena .troop-select-box .troop-select-title:first-child{ display:none !important; }

/* ── kalın font: tüm savaş paneli ── */
.battle-arena,
.battle-arena *{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important;
  letter-spacing:0 !important;
}
.battle-arena .troop-select-title,
.battle-arena .battle-btn{ font-weight:900 !important; }


/* ── SAVAŞA GİR: tam kırmızı, doygun ── */
.battle-arena .battle-btn{
  background:linear-gradient(180deg,#ff3b3b,#c50f0f) !important;
  border:2px solid rgba(255,170,170,.75) !important;
  color:#fff !important; font-size:16px !important;
  padding:14px 40px !important; border-radius:14px !important;
  box-shadow:0 5px 0 #7d0606, 0 8px 18px rgba(140,0,0,.4),
             inset 0 1px 0 rgba(255,255,255,.35) !important;
  text-shadow:0 2px 3px rgba(90,0,0,.5) !important;
}
.battle-arena .battle-btn:active{ transform:translateY(4px); box-shadow:0 1px 0 #7d0606 !important; }
.battle-arena .battle-btn:disabled{ filter:saturate(.3) brightness(.7); }

/* ── BİRLİK SATIRLARI: yazı ve görsel büyük, satır aynı yükseklikte ── */
.battle-arena .troop-select-row{ margin-bottom:6px !important; gap:0 !important; }
.battle-arena .troop-select-top{
  font-size:15.5px !important; gap:10px !important;
  margin-bottom:-2px !important; align-items:center !important;
}
.battle-arena .troop-select-top .t-name{ font-size:15.5px !important; }
.battle-arena .troop-select-top .t-count{ font-size:14.5px !important; }
.battle-arena .troop-select-top .t-icon{ display:flex; align-items:center; }
/* görsel büyütüldü, kutu/çerçeve kaldırıldı — PNG doğrudan görünüyor */
.battle-arena .unit-photo-box{
  width:42px !important; height:42px !important; flex:0 0 42px !important;
  background:none !important; border:none !important;
  border-radius:0 !important; box-shadow:none !important;
}
.battle-arena .unit-photo{ object-fit:contain !important; }
.battle-arena .troop-slider{ margin-top:0 !important; }

/* ── "kalesine yürüyorsun" kutusu: boşken gizle ── */
.battle-arena .battle-log:empty{ display:none !important; }

/* ── HARİTA: canavar isimleri kaldırıldı (kaleler ve hazine kalsın) ── */
.map-node[data-idx] .node-label{ display:none !important; }

/* ═══════════════════════════════════════════════════════════════
   CAN POTU BALONCUĞU — sadece "Kullan" butonu
   ═══════════════════════════════════════════════════════════════ */
.stamina-potion-popup{
  background:transparent !important;
  border:none !important;
  box-shadow:none !important;
  padding:0 !important;
  gap:0 !important;
}
.stamina-potion-popup .spp-label{ display:none !important; }
.stamina-potion-popup .spp-btn{
  background:linear-gradient(180deg, #4fd8ff, #1fa3ea) !important;
  border:2px solid rgba(190,240,255,.85) !important;
  color:#fff !important;
  font-family:'Baloo 2',sans-serif !important; font-weight:900 !important;
  font-size:13.5px !important; letter-spacing:.3px;
  padding:9px 24px 11px !important; border-radius:13px !important;
  text-shadow:0 2px 3px rgba(0,40,70,.5);
  box-shadow:0 4px 0 #0e6fc0, 0 6px 14px rgba(0,20,45,.4),
             inset 0 1px 0 rgba(255,255,255,.45) !important;
}
.stamina-potion-popup .spp-btn:active{ transform:translateY(3px); box-shadow:0 1px 0 #0e6fc0 !important; }
.stamina-potion-popup .spp-btn:disabled{ filter:saturate(.3) brightness(.75); }

/* ═══════════════════════════════════════════════════════════════
   ÇANTA PANELİ — mağaza şablonu
   ═══════════════════════════════════════════════════════════════ */
#panel-inventory,
#panel-inventory *{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important;
}
#panel-inventory h2{
  color:#fff !important; font-weight:900 !important;
  text-shadow:0 2px 4px rgba(0,40,70,.6) !important;
}
#panel-inventory .desc{
  color:#eaf7ff !important; text-shadow:0 1px 2px rgba(0,30,55,.5) !important;
}
#panel-inventory .stat-card{
  background:linear-gradient(180deg, #3d7ccc 0%, #22488f 55%, #152e5e 100%) !important;
  border:2px solid rgba(190,240,255,.45) !important;
  border-radius:14px !important;
  box-shadow:0 5px 0 #0b1c3a, inset 0 2px 3px rgba(150,205,255,.5) !important;
}
#panel-inventory .stat-card .num{ color:#fff !important; font-weight:900 !important; }
#panel-inventory .stat-card .lbl{ color:#bfe6ff !important; }

/* eşya kartları — mağaza kartıyla aynı model */
#panel-inventory .inv-card,
#panel-inventory .shop-card,
#panel-inventory .inv-row{
  background:linear-gradient(180deg, #3d7ccc 0%, #22488f 55%, #152e5e 100%) !important;
  border:2px solid rgba(190,240,255,.45) !important;
  border-radius:14px !important;
  box-shadow:0 5px 0 #0b1c3a, 0 8px 14px rgba(0,20,45,.4),
             inset 0 2px 3px rgba(150,205,255,.45) !important;
  color:#eaf7ff !important;
}
#panel-inventory .inv-card .icon-box,
#panel-inventory .shop-card .icon-box{
  background:linear-gradient(180deg, #ffd257, #f0932b) !important;
  border:none !important; border-radius:10px !important;
  box-shadow:inset 0 3px 0 rgba(255,255,255,.6),
             inset 0 -5px 8px rgba(140,60,0,.45),
             0 3px 6px rgba(0,15,40,.45) !important;
}
#panel-inventory .qty{
  color:#fff !important; font-weight:900 !important;
  text-shadow:-2px -1px 0 #1d3a63, 2px -1px 0 #1d3a63, -2px 2px 0 #1d3a63,
              2px 2px 0 #1d3a63, 0 -2px 0 #1d3a63, 0 2px 0 #1d3a63,
              -2px 0 0 #1d3a63, 2px 0 0 #1d3a63, 0 3px 0 #142a4a !important;
}
#panel-inventory .slot-tag{
  background:rgba(255,255,255,.2) !important;
  border:1px solid rgba(190,240,255,.55) !important;
  color:#eaf7ff !important;
}
#panel-inventory .inv-use-btn{
  background:linear-gradient(180deg,#6ee07f,#2cab44) !important;
  border:none !important; color:#fff !important;
  font-weight:900 !important; font-size:11px !important;
  padding:5px 14px 7px !important; border-radius:9px !important;
  box-shadow:0 3px 0 #1c7d31, inset 0 1px 0 rgba(255,255,255,.5) !important;
  text-shadow:0 1px 2px rgba(0,60,20,.5) !important;
}
#panel-inventory .inv-use-btn:active{ transform:translateY(2px); box-shadow:0 0 0 #1c7d31 !important; }
#panel-inventory .empty-state{ color:#dff2ff !important; }
/* eşyalar satır değil KUTUCUK olarak dizilsin */
#panel-inventory .inv-list{
  display:grid !important;
  grid-template-columns:repeat(3, 1fr) !important;
  gap:10px !important;
  align-items:start !important;
}
#panel-inventory .inv-card,
#panel-inventory .shop-card,
#panel-inventory .inv-row{
  flex-direction:column !important;
  align-items:center !important;
  justify-content:flex-start !important;
  text-align:center !important;
  gap:5px !important;
  padding:9px 6px 10px !important;
  min-height:0 !important;
  aspect-ratio:1 / 1.12 !important;      /* kareye yakın kutucuk */
  cursor:pointer;
}
#panel-inventory .inv-card .icon-box,
#panel-inventory .shop-card .icon-box{
  flex:0 0 46px !important; width:46px !important; height:46px !important;
}
#panel-inventory .card-mid{ width:100%; min-width:0; }
#panel-inventory .item-name{
  font-size:10.5px !important; line-height:1.12 !important; color:#fff !important;
  white-space:normal !important; overflow:hidden;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
}
/* uzun açıklamalar kutucukta yer kaplamasın */
#panel-inventory .item-bonus,
#panel-inventory .slot-tag{ display:none !important; }
/* "Kullan" butonu kaldırıldı — kullanım için kutucuğa tıklanır (mağaza mantığı) */
#panel-inventory .inv-use-btn{ display:none !important; }
#panel-inventory .card-right{
  width:100%; display:flex; flex-direction:column;
  align-items:center; gap:2px; margin-top:auto;
}

/* başlık ORTALI + BÜYÜK HARF */
#panel-inventory h2{
  text-align:center !important; justify-content:center !important;
  text-transform:uppercase !important; padding-right:0 !important;
  font-size:22px !important; margin-top:2px !important;
}
/* "Sahip olduğun elmaslar..." açıklaması gizlendi */
#panel-inventory .desc{ display:none !important; }

/* elmas/eşya özet kutuları → yalnızca 💎 rozeti kalsın */
#panel-inventory .inv-summary{
  display:flex !important; justify-content:center !important; margin:6px 0 14px !important;
}
#panel-inventory .inv-summary .stat-card:nth-child(2){ display:none !important; } /* "Farklı Eşya" kutusu kaldırıldı */
#panel-inventory .inv-summary .stat-card{
  flex:0 0 auto !important; padding:8px 20px !important; border-radius:14px !important;
}
#panel-inventory .inv-summary .stat-card .lbl{ display:none !important; } /* "TOPLAM ELMAS" yazısı yok */
#panel-inventory .inv-summary .stat-card .num{ font-size:22px !important; }
#panel-inventory .inv-summary .stat-card .num::before{ content:"💎 "; }

/* ═══════════════════════════════════════════════════════════════
   MARKET (MAĞAZA) — başlık ortalı, X kırmızı kare, kalın font
   ═══════════════════════════════════════════════════════════════ */
#panel-shop h2{
  text-align:center !important; justify-content:center !important;
  font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:900 !important;
  font-size:22px !important; padding-right:0 !important;
  text-transform:uppercase !important;
  color:#fff !important; text-shadow:0 2px 4px rgba(0,40,70,.6) !important;
}
#panel-shop .desc{ text-align:center !important; }
#panel-shop .shop-refresh-band{ text-align:center !important; }

/* ═══════════════════════════════════════════════════════════════
   GİRİŞ EKRANI — oyunun açık mavi teması
   ═══════════════════════════════════════════════════════════════ */
#loginScreen .field input{
  background:rgba(255,255,255,.18) !important;
  border:2px solid rgba(190,240,255,.85) !important;
  border-radius:14px !important;
  color:#fff !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:15px !important;
  text-shadow:0 1px 3px rgba(0,20,45,.7) !important;
}
#loginScreen .field input::placeholder{ color:rgba(255,255,255,.85) !important; font-weight:700 !important; }
#loginScreen .field input:focus{
  background:rgba(255,255,255,.28) !important;
  border-color:#2DC9FC !important;
  box-shadow:0 0 0 3px rgba(45,201,252,.35) !important;
  outline:none !important;
}
#loginScreen .login-btn{
  background:linear-gradient(180deg,#4fd8ff,#1fa3ea) !important;
  border:2px solid rgba(190,240,255,.9) !important;
  border-radius:15px !important;
  color:#fff !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:900 !important; font-size:17px !important; letter-spacing:.5px;
  text-shadow:0 2px 3px rgba(0,40,70,.5) !important;
  box-shadow:0 5px 0 #0e6fc0, 0 8px 18px rgba(0,20,45,.4), inset 0 1px 0 rgba(255,255,255,.45) !important;
  transition:transform .08s, box-shadow .08s !important;
}
#loginScreen .login-btn:active{ transform:translateY(4px) !important; box-shadow:0 1px 0 #0e6fc0 !important; }
#loginScreen .login-switch a{ color:#2DC9FC !important; font-weight:900 !important; }

/* ── ALT MENÜ (dock): panellerdeki ince açık-mavi çerçeve ── */
.nav-dock{
  border-top:3px solid rgba(190,240,255,.85) !important;
  box-shadow:0 -2px 12px rgba(120,225,255,.35), inset 0 2px 0 rgba(255,255,255,.4) !important;
  border-radius:16px 16px 0 0 !important;
}

/* ── ÜST HUD KUTULARI: aynı açık-mavi çerçeve ── */
.hud-pill, .user-pill{
  border:2px solid rgba(190,240,255,.85) !important;
  box-shadow:0 4px 12px rgba(0,20,45,.35), inset 0 1px 0 rgba(255,255,255,.45) !important;
}

/* ═══════════════════════════════════════════════════════════════
   SANDIK AÇ + SAVAŞ GÜNLÜĞÜ — oyunun açık mavi teması
   ═══════════════════════════════════════════════════════════════ */
#panel-chest .overlay-card,
#panel-battlelog .overlay-card{
  background:
    radial-gradient(ellipse 100% 50% at 50% 0%, rgba(170,240,255,.5), transparent 72%),
    radial-gradient(ellipse 80% 40% at 50% 105%, rgba(8,45,80,.55), transparent 75%),
    linear-gradient(180deg, #1fa3ea, #0e6fc0) !important;
  border:3px solid rgba(190,240,255,.85) !important;
  box-shadow:0 0 26px rgba(120,225,255,.45), inset 0 3px 0 rgba(255,255,255,.45) !important;
}
#panel-chest, #panel-chest *,
#panel-battlelog, #panel-battlelog *{
  font-family:'Baloo 2','Nunito',sans-serif !important;
}
#panel-chest h2, #panel-battlelog h2{
  color:#fff !important; font-weight:900 !important; text-transform:uppercase !important;
  text-shadow:0 2px 4px rgba(0,40,70,.6) !important;
}
#panel-chest .desc, #panel-battlelog .desc{
  color:#eaf7ff !important; font-weight:800 !important; text-shadow:0 1px 2px rgba(0,30,55,.5) !important;
}

/* sandık ilerleme çubuğu */
#panel-chest .chest-progress, #panel-chest [class*="progress"]{
  background:rgba(0,10,26,.4) !important; border:1px solid rgba(190,240,255,.4) !important;
}

/* savaş günlüğü kayıtları — mavi kart */
#panel-battlelog .log-entry{
  background:linear-gradient(180deg, rgba(34,72,143,.62), rgba(13,34,70,.75)) !important;
  border:2px solid rgba(190,240,255,.3) !important;
  border-radius:12px !important;
  box-shadow:inset 0 2px 3px rgba(150,205,255,.2) !important;
  color:#eaf7ff !important;
}
#panel-battlelog .log-entry.log-win{ border-left:4px solid #5ec46a !important; }
#panel-battlelog .log-entry.log-loss{ border-left:4px solid #e05a5a !important; }
#panel-battlelog .log-entry-enemy, #panel-battlelog .log-entry-stats{
  color:#eaf7ff !important; font-weight:800 !important;
}
#panel-battlelog .log-entry-time{ color:#bfe6ff !important; }
#panel-battlelog .log-clear-btn{
  background:linear-gradient(180deg,#e05a5a,#a81f1f) !important;
  border:2px solid rgba(255,190,190,.6) !important; color:#fff !important;
  font-weight:900 !important; border-radius:12px !important;
  text-shadow:0 2px 3px rgba(90,0,0,.4) !important;
  box-shadow:0 4px 0 #6e1212, inset 0 1px 0 rgba(255,255,255,.3) !important;
}
#panel-battlelog .log-clear-btn:active{ transform:translateY(3px) !important; box-shadow:0 1px 0 #6e1212 !important; }

/* ═══════════════════════════════════════════════════════════════
   HASTANE — açık mavi tema (diğer panellerle aynı)
   ═══════════════════════════════════════════════════════════════ */
#panel-hospital .overlay-card{
  background:
    radial-gradient(ellipse 100% 50% at 50% 0%, rgba(170,240,255,.5), transparent 72%),
    radial-gradient(ellipse 80% 40% at 50% 105%, rgba(8,45,80,.55), transparent 75%),
    linear-gradient(180deg, #1fa3ea, #0e6fc0) !important;
  border:3px solid rgba(190,240,255,.85) !important;
  box-shadow:0 0 26px rgba(120,225,255,.45), inset 0 3px 0 rgba(255,255,255,.45) !important;
}
#panel-hospital, #panel-hospital *{ font-family:'Baloo 2','Nunito',sans-serif !important; }
#panel-hospital h2, #panel-hospital h3{
  color:#fff !important; font-weight:900 !important; text-transform:uppercase !important;
  text-shadow:0 2px 4px rgba(0,40,70,.6) !important;
}
#panel-hospital .desc, #panel-hospital .empty-state,
#panel-hospital .hospital-empty{
  color:#eaf7ff !important; font-weight:800 !important; text-shadow:0 1px 2px rgba(0,30,55,.5) !important;
}
#panel-hospital .hospital-row, #panel-hospital .hospital-unit-row{
  background:linear-gradient(180deg, rgba(34,72,143,.62), rgba(13,34,70,.75)) !important;
  border:2px solid rgba(190,240,255,.3) !important; border-radius:12px !important;
  color:#eaf7ff !important;
}
#panel-hospital .hospital-confirm-btn{
  background:linear-gradient(180deg,#4fd8ff,#1fa3ea) !important;
  border:2px solid rgba(190,240,255,.9) !important; color:#fff !important;
  font-weight:900 !important; border-radius:14px !important;
  text-shadow:0 2px 3px rgba(0,40,70,.5) !important;
  box-shadow:0 4px 0 #0e6fc0, inset 0 1px 0 rgba(255,255,255,.4) !important;
}
#panel-hospital .hospital-confirm-btn:active{ transform:translateY(3px) !important; box-shadow:0 1px 0 #0e6fc0 !important; }

/* ═══════════════════════════════════════════════════════════════
   BİRLİK (TROOPS) PANELİ — .uv-viewer kullanır, .overlay-card DEĞİL
   Görsel/istatistik korunur; panel çerçevesi + Eğit butonu temaya.
   ═══════════════════════════════════════════════════════════════ */
#panel-troops{
  border:3px solid rgba(190,240,255,.85) !important;
  box-shadow:0 0 26px rgba(120,225,255,.45), inset 0 3px 0 rgba(255,255,255,.45) !important;
  border-radius:18px !important; overflow:hidden !important;
}
#panel-troops .troop-train-btn{
  background:linear-gradient(180deg,#ffd257,#f0932b) !important;
  border:2px solid rgba(255,220,150,.7) !important; color:#3a2408 !important;
  font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:900 !important;
  border-radius:14px !important; text-shadow:0 1px 0 rgba(255,255,255,.4) !important;
  box-shadow:0 4px 0 #a8641a, inset 0 1px 0 rgba(255,255,255,.5) !important;
}
#panel-troops .troop-train-btn:active{ transform:translateY(3px) !important; box-shadow:0 1px 0 #a8641a !important; }
#panel-troops .troop-train-btn:disabled{ filter:saturate(.3) brightness(.8) !important; }

/* ═══════════════════════════════════════════════════════════════
   KAHRAMAN DETAY — mavi tema çerçevesi + "Geliştir" butonu mavi
   ═══════════════════════════════════════════════════════════════ */
#heroDetailOverlay{
  border:3px solid rgba(190,240,255,.85) !important;
  box-shadow:inset 0 0 0 3px rgba(190,240,255,.4), inset 0 0 40px rgba(120,225,255,.3),
             0 0 26px rgba(120,225,255,.45) !important;
  border-radius:18px !important; overflow:hidden !important;
}
#heroDetailOverlay #hdBuyBtn{
  background:linear-gradient(180deg,#4fd8ff,#1fa3ea) !important;
  border:2px solid rgba(190,240,255,.9) !important; color:#fff !important;
  font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:900 !important;
  border-radius:14px !important; text-shadow:0 2px 3px rgba(0,40,70,.5) !important;
  box-shadow:0 5px 0 #0e6fc0, inset 0 1px 0 rgba(255,255,255,.4) !important;
}
#heroDetailOverlay #hdBuyBtn:active{ transform:translateX(-50%) translateY(3px) !important; box-shadow:0 2px 0 #0e6fc0 !important; }


/* ═══════════════════════════════════════════════════════════════
   GÜNLÜK GİRİŞ ÖDÜLÜ — oyunun açık mavi teması
   (sandık görseline dokunulmuyor, sadece panel/başlık/buton) ── */
.daily-reward-banner{
  background:
    radial-gradient(ellipse 100% 50% at 50% 0%, rgba(170,240,255,.5), transparent 72%),
    radial-gradient(ellipse 80% 40% at 50% 105%, rgba(8,45,80,.55), transparent 75%),
    linear-gradient(180deg, #1fa3ea, #0e6fc0) !important;
  border:3px solid rgba(190,240,255,.85) !important;
  box-shadow:0 0 26px rgba(120,225,255,.45), inset 0 3px 0 rgba(255,255,255,.45),
             0 25px 60px -10px rgba(0,20,45,.7) !important;
}
.daily-reward-banner-top{
  font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:900 !important;
  color:#fff !important; text-shadow:0 2px 4px rgba(0,40,70,.6) !important;
}
.daily-reward-sub{ color:#eaf7ff !important; font-weight:800 !important;
  text-shadow:0 1px 2px rgba(0,30,55,.5) !important; }
.daily-reward-close-btn{
  background:linear-gradient(180deg,#4fd8ff,#1fa3ea) !important;
  border:2px solid rgba(190,240,255,.9) !important;
  border-radius:14px !important; color:#fff !important;
  font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:900 !important;
  text-shadow:0 2px 3px rgba(0,40,70,.5) !important;
  box-shadow:0 4px 0 #0e6fc0, inset 0 1px 0 rgba(255,255,255,.4) !important;
}
.daily-reward-close-btn:active{ transform:translateY(3px) !important; box-shadow:0 1px 0 #0e6fc0 !important; }

/* ═══════════════════════════════════════════════════════════════
   ÇIKIŞ / ONAY PENCERELERİ — oyunun mavi teması
   ═══════════════════════════════════════════════════════════════ */
.backup-modal{
  border-radius:18px !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
}
.backup-modal h3{
  font-family:'Baloo 2',sans-serif !important; font-weight:900 !important;
  color:#fff !important; text-shadow:0 2px 4px rgba(0,40,70,.6) !important;
  font-size:18px !important;
}
.backup-modal p,
.backup-modal label,
.backup-modal small{
  font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:800 !important;
  color:#eaf7ff !important; text-shadow:0 1px 2px rgba(0,30,55,.5) !important;
}
.backup-modal input{
  background:rgba(0,10,26,.45) !important;
  border:2px solid rgba(190,240,255,.5) !important;
  color:#fff !important; font-weight:800 !important;
  border-radius:10px !important;
}
.backup-modal button,
.backup-modal .logout-confirm-btn,
.backup-modal .login-btn{
  font-family:'Baloo 2',sans-serif !important; font-weight:900 !important;
  border-radius:12px !important; color:#fff !important;
  text-shadow:0 2px 3px rgba(0,0,0,.4) !important;
  border:2px solid rgba(190,240,255,.5) !important;
  background:linear-gradient(180deg, #3d7ccc, #1a3a75) !important;
  box-shadow:0 4px 0 #0e2246, inset 0 1px 0 rgba(255,255,255,.28) !important;
}
.backup-modal button:active{ transform:translateY(3px); box-shadow:0 1px 0 #0e2246 !important; }
.backup-modal .logout-confirm-btn.yes,
.backup-modal button.danger{
  background:linear-gradient(180deg, #e05a5a, #a81f1f) !important;
  box-shadow:0 4px 0 #6e1212, inset 0 1px 0 rgba(255,255,255,.28) !important;
}

/* ── KAPAT (X) BUTONLARI — kırmızı kare, panel köşesinde SABİT ──
   .overlay-card scroll ediyor; buton ona bağlı kalırsa kayıyordu.
   .overlay-panel ise scroll ETMEYEN dış katman (fixed, inset:0).
   Butonu ona göre absolute konumluyoruz → scroll'dan etkilenmez,
   panelin sağ üst köşesinde durur, içeriğe binmez. */
.overlay-panel.active{ position:fixed !important; }
.overlay-panel.active .overlay-close{
  position:absolute !important;
  top:12px !important; right:14px !important;
  left:auto !important; bottom:auto !important; margin:0 !important;
  z-index:200 !important;
  width:38px !important; height:38px !important; padding:0 !important;
  border-radius:10px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  font-size:0 !important; line-height:0 !important;
  background:linear-gradient(180deg,#f03434,#c00d0d) !important;
  border:2px solid rgba(255,220,220,.9) !important;
  box-shadow:0 4px 10px rgba(120,0,0,.4) !important;
}
/* kartın üst boşluğunu koru ki başlık X'in altına girmesin */
.overlay-panel.active .overlay-card{ padding-top:20px !important; }
/* ── SAVAŞ PANELİ: yukarı genişlet + X köşeye gömülü (market gibi) ──
   #battleArena scroll etmeyen dış katman (fixed). .battle-arena panel
   kartı; onu relative yapıp X'i tam köşesine absolute oturtuyoruz.
   max-height artırılarak panel yukarı doğru genişletiliyor. */
#battleArena{ position:fixed !important; }
.battle-arena{
  position:relative !important;
  max-height:92vh !important;      /* daha yukarı genişlesin */
  padding-top:16px !important;
}
.battle-arena-top-bar{ display:none !important; }
#mapBackBtn{
  position:absolute !important;
  top:12px !important; right:14px !important;
  left:auto !important; bottom:auto !important; margin:0 !important;
  z-index:50 !important;
  width:38px !important; height:38px !important; padding:0 !important;
  border-radius:10px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  font-size:0 !important; line-height:0 !important;
  background:linear-gradient(180deg,#f03434,#c00d0d) !important;
  border:2px solid rgba(255,220,220,.9) !important;
  box-shadow:0 4px 10px rgba(120,0,0,.4) !important;
}

/* ── "... ile karşı karşıyasın" / savaş sonucu kutusu tamamen kaldırıldı ── */
.battle-arena .battle-log,
#battleLog,
.battle-arena .battle-report,
.battle-arena .battle-reward{ display:none !important; }
.overlay-panel.active .overlay-close::after,
#battleArena .map-back-btn::after{
  content:"✕"; font-size:22px !important; font-weight:900; color:#fff;
  line-height:1; -webkit-text-stroke:1px #fff;
}
.overlay-panel.active .overlay-close:active,
#battleArena .map-back-btn:active{ transform:scale(.92) !important; }

`;
  document.head.appendChild(st);
})();

/* ═══════════════════════════════════════════════════════════════
   ARAYÜZ DÜZELTMELERİ
   ═══════════════════════════════════════════════════════════════ */
/* ── HARİTA SÜRÜKLEME KİLİDİ ───────────────────────────────────
   Oyunun bindTap'i doğrudan "pointerup" dinliyor ve parmağın
   hareket edip etmediğine bakmıyor. Bu yüzden haritada kaydırma
   yapıp parmağını bir kalenin/canavarın üstünde kaldırınca
   yanlışlıkla tıklama sayılıyordu.

   Aşağıdaki koruma, parmak DRAG_PX pikselden fazla hareket
   ettiyse olayı yakalama aşamasında durdurur — yani olay hiçbir
   düğüme ulaşmaz. Sadece harita alanında çalışır, arayüzün geri
   kalanına dokunmaz. Eşik değeri dosyanın en üstündeki DRAG_PX. */

function installMapDragGuard() {
  const scroller = document.getElementById("battleMapScroll");
  if (!scroller || scroller.dataset.pvpDragGuard) return;
  scroller.dataset.pvpDragGuard = "1";

  let sx = 0, sy = 0, moved = false, down = false;

  const start = (x, y) => { sx = x; sy = y; moved = false; down = true; };
  const move  = (x, y) => {
    if (!down) return;
    if (Math.abs(x - sx) > DRAG_PX || Math.abs(y - sy) > DRAG_PX) moved = true;
  };
  const block = (e) => {
    if (!moved) return;
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.cancelable) e.preventDefault();
  };

  /* Her yeni dokunuş bayrakları SIFIRDAN başlatır — böylece
     kaydırmadan sonraki ilk dokunuş yutulmaz (tek tık yeter). */
  scroller.addEventListener("pointerdown", e => start(e.clientX, e.clientY), true);
  scroller.addEventListener("pointermove", e => move(e.clientX, e.clientY),  true);
  scroller.addEventListener("pointerup",   e => { block(e); down = false; }, true);
  scroller.addEventListener("pointercancel", () => { down = false; moved = false; }, true);

  scroller.addEventListener("touchstart", e => {
    if (e.touches && e.touches[0]) start(e.touches[0].clientX, e.touches[0].clientY);
  }, true);
  scroller.addEventListener("touchmove", e => {
    if (e.touches && e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
  }, true);
  scroller.addEventListener("touchend", () => { down = false; }, true);

  /* click, pointerup'tan hemen sonra gelir — onu da sustur ve bayrağı temizle */
  scroller.addEventListener("click", e => {
    block(e);
    moved = false;
  }, true);
}


/* ═══════════════════════════════════════════════════════════════
   SAVAŞ RAPORU — MEKTUP + GÜNCEL ARAYÜZLE AÇILAN PENCERE
   ---------------------------------------------------------------
   • Savaş günlüğündeki her PvP raporunda "📢 Eyalet sohbetinde paylaş"
   • Paylaşınca sohbete DÜZ METİN değil, [RAPOR]{json} etiketli bir
     kayıt gider → sohbet render'ı bunu "📜 Savaş Raporu" mektubuna
     çevirir → tıklayınca aynı açık-mavi arayüzle açılır.
   • Hem günlükteki hem sohbetteki mektup aynı pencereyi kullanır.
   ═══════════════════════════════════════════════════════════════ */
const REPORT_TAG = "[RAPOR]";

function heroImgOf(name) {
  /* HERO_STATS'te ada göre id bul, HERO_IMG'den görseli getir */
  if (typeof HERO_STATS === "undefined") return null;
  const id = Object.keys(HERO_STATS).find(k => HERO_STATS[k] && HERO_STATS[k].name === name);
  if (id && typeof HERO_IMG !== "undefined" && HERO_IMG[id]) return HERO_IMG[id];
  return null;
}

function heroIdOf(name) {
  if (typeof HERO_STATS === "undefined") return "";
  return Object.keys(HERO_STATS).find(k => HERO_STATS[k] && HERO_STATS[k].name === name) || "";
}

function heroChip(name) {
  const img = heroImgOf(name);
  const id = heroIdOf(name);
  const inner = img ? `<img src="${img}" alt="">` : `<span class="rep-hemoji">🦸</span>`;
  /* Ölçüler her kahraman için AYRI CSS değişkeninde — ?ayar=1 ile ayarlanır */
  return `<div class="rep-hchip">
    <div class="rep-hpor" data-h="${id}">${inner}</div>
    <div class="rep-hname">${name}</div>
  </div>`;
}

/* savaşa sürülen birlikler — eğitim panelindeki kafa kutucuğu biçimi.
   .rep-por[data-i] kadrajı ?ayar=1 tuner'ından gelen değişkenleri kullanır. */
function unitChips(troopsObj) {
  const t = troopsObj || {};
  const sira = ["knight","soldier","robot"];
  const out = sira.filter(uid => (t[uid] || 0) > 0).map(uid => {
    const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[uid] : null;
    const im = (d && d.img) ? `<img src="${d.img}" alt="">` : "";
    const n  = (typeof fmt === "function") ? fmt(t[uid]) : String(t[uid]);
    return `<div class="rp-unit">
      <div class="rep-por" data-i="${sira.indexOf(uid)}">${im}</div>
      <span class="rp-ucap">${n}</span>
    </div>`;
  });
  return out.join("") || '<span class="rp-dash">—</span>';
}

/* rapor verisini pencerede göster (açık-mavi güncel arayüz) */

/* ═══════════════════════════════════════════════════════════════
   SAVAŞ RAPORU — SAYFALI
   Sayfa 1: özet (VS, kahramanlar, birlikler, 💎/tur)
   Sayfa 2: birlik dökümü — iki taraflı, ortada etiket
   Ayrı pencere: "Savaş Detayları" (kahraman yetenekleri, aynalı)

   RENK KURALI — okuyana göredir, satırın tarafına göre DEĞİL.
   Kendi tarafımda: Ölen kırmızı, Yaralı turuncu, vuruşlar siyah.
   Rakip tarafında: Öldürdü kırmızı, Yaraladı turuncu, kayıplar siyah.
   Eski "Öldürdü hep yeşil" mantığı kaldırıldı: rakibin BENİ öldürdüğü
   sayı benim raporumda yeşil görünüyordu. Savunan aynı raporu açtığında
   renkler kendiliğinden yer değiştirir.
   ═══════════════════════════════════════════════════════════════ */

/* Raporu okuyan taraf: saldıran mıyım? Ad eşleşmezse (sohbetten gelen
   yabancı rapor) saldıran gözünden gösterilir. */
function benSaldiranMi(r) {
  const ben = (typeof currentUsername !== "undefined" && currentUsername) ? currentUsername : "";
  if (!ben) return true;
  const sad = String(r.attackerName || ""), svd = String(r.defenderName || "");
  if (sad && sad === ben) return true;
  if (svd && svd === ben) return false;
  return true;
}

/* tip → renk sınıfı. benimTarafim: bu sütun benim tarafım mı?
   Benim tarafım: Ölen kırmızı · Yaralı turuncu · Öldürdü YEŞİL (benim
   kazancım). Rakip tarafı: Öldürdü kırmızı · Yaraladı turuncu (bana
   verdiği zayiat). Gerisi siyah. */
function rpRenk(tip, benimTarafim) {
  if (benimTarafim) {
    if (tip === "olen") return "rp-kirmizi";
    if (tip === "yarali") return "rp-turuncu";
    if (tip === "oldurdu") return "rp-yesil";
    return "";
  }
  return tip === "oldurdu" ? "rp-kirmizi" : (tip === "yaraladi" ? "rp-turuncu" : "");
}

/*  ── SAYFA 1: TOPLAM ÖZET ──
    Birlik kutucuklarının hemen altında, ortalanmış dört satır:
    BİRLİKLER / ÖLEN / YARALANAN / HAYATTA KALANLAR.
    Solda saldıranın, sağda savunanın TOPLAMI (birlik ayrımı yok;
    tür bazlı döküm zaten sayfa 2'de).

    Hayatta kalan = götürülen − ölen − yaralı. Ayrı bir alan olarak
    kaydedilmiyor, o yüzden burada çıkarılıyor; negatif çıkmasın diye
    sıfırda kesiliyor (eski raporlarda kayıp alanı eksik olabilir).
    Satır/renk sınıfları sayfa 2 ile AYNI (.rp-krs-*) — yeni bir
    görünüm uydurulmadı, ikisi hep aynı kalır.                        */
function ozetHTML(r) {
  const f = (n) => (typeof fmt === "function") ? fmt(n || 0) : String(n || 0);
  const benS = benSaldiranMi(r);
  const sira = ["knight", "soldier", "robot"];

  const toplam = (o) => sira.reduce((s, u) => s + ((o && o[u]) || 0), 0);
  const kayip  = (L, k) => sira.reduce((s, u) => s + ((L && L[k] && L[k][u]) || 0), 0);

  const AT = r.attackerTroops || {}, DT = r.defenderTroops || {};
  const AL = r.attackerLosses || {}, DL = r.defenderLosses || {};

  const aGiden = toplam(AT), dGiden = toplam(DT);
  if (aGiden <= 0 && dGiden <= 0) return "";      /* veri yoksa blok hiç çizilmez */

  const aOlen = kayip(AL, "killed"),  dOlen = kayip(DL, "killed");
  const aYar  = kayip(AL, "wounded"), dYar  = kayip(DL, "wounded");
  const kalan = (giden, olen, yar) => Math.max(0, giden - olen - yar);

  const SATIR = [
    { tip: "",       ad: "BİRLİKLER",        sol: aGiden, sag: dGiden },
    { tip: "olen",   ad: "ÖLEN",             sol: aOlen,  sag: dOlen },
    { tip: "yarali", ad: "YARALANAN",        sol: aYar,   sag: dYar },
    { tip: "",       ad: "HAYATTA KALANLAR", sol: kalan(aGiden, aOlen, aYar), sag: kalan(dGiden, dOlen, dYar) },
  ];

  return `<div class="rp-ozet">` + SATIR.map(s => `
      <div class="rp-krs-satir">
        <span class="rp-krs-sol ${s.tip ? rpRenk(s.tip, benS) : ""}">${f(s.sol)}</span>
        <span class="rp-krs-orta">${s.ad}</span>
        <span class="rp-krs-sag ${s.tip ? rpRenk(s.tip, !benS) : ""}">${f(s.sag)}</span>
      </div>`).join("") + `</div>`;
}

/* ── SAYFA 2: birlik dökümü ── */
function unitDetailHTML(r) {
  const AD = { knight: "Şövalye", soldier: "Asker", robot: "Robot" };
  const f = (n) => (typeof fmt === "function") ? fmt(n || 0) : String(n || 0);
  const benS = benSaldiranMi(r);

  const AL = r.attackerLosses || {}, DL = r.defenderLosses || {};
  const AA = r.attackerAttribution || {}, DA = r.defenderAttribution || {};
  const sy = (o, k, u) => (o && o[k] && o[k][u]) || 0;          /* kayıplar */
  const vr = (o, u, k) => (o && o[u] && o[u][k]) || 0;          /* verilen zayiat */

  const OLCU = [
    { tip: "yarali",   ad: "Yaralı",   sol: u => sy(AL, "wounded", u), sag: u => sy(DL, "wounded", u) },
    { tip: "olen",     ad: "Ölen",     sol: u => sy(AL, "killed", u),  sag: u => sy(DL, "killed", u) },
    { tip: "oldurdu",  ad: "Öldürdü",  sol: u => vr(AA, u, "killed"),  sag: u => vr(DA, u, "killed") },
    { tip: "yaraladi", ad: "Yaraladı", sol: u => vr(AA, u, "wounded"), sag: u => vr(DA, u, "wounded") },
  ];

  const ids = ["knight", "soldier", "robot"].filter(u =>
    OLCU.some(o => o.sol(u) || o.sag(u)));
  if (!ids.length) return `<div class="rp-note">Bu savaşta kayıt altına alınmış birlik dökümü yok.</div>`;

  const blok = ids.map(u => {
    const satir = OLCU.map(o => `
      <div class="rp-krs-satir">
        <span class="rp-krs-sol ${rpRenk(o.tip, benS)}">${f(o.sol(u))}</span>
        <span class="rp-krs-orta">${o.ad}</span>
        <span class="rp-krs-sag ${rpRenk(o.tip, !benS)}">${f(o.sag(u))}</span>
      </div>`).join("");
    /* Başlıkta yazı yok: iki tarafa da o birliğin kafa kutucuğu konur —
       aynı kadraj birlik seçicide ve raporun özet sayfasında kullanılıyor
       (.rep-por[data-i]), yeni bir görsel ölçüsü uydurulmadı. */
    const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[u] : null;
    const im = (d && d.img) ? `<img src="${d.img}" alt="${AD[u] || u}">` : "";
    const i = ["knight", "soldier", "robot"].indexOf(u);
    const kafa = `<div class="rep-por" data-i="${i}">${im}</div>`;
    return `<div class="rp-krs-blok">
        <div class="rp-krs-baslik">${kafa}<span class="rp-krs-cizgi"></span>${kafa}</div>
        ${satir}
      </div>`;
  }).join("");

  return `
    <div class="rp-krs-ust">
      <span class="rp-krs-taraf${benS ? " rp-krs-ben" : ""}">${r.attackerName || "Saldıran"}</span>
      <span class="rp-krs-taraf${benS ? "" : " rp-krs-ben"}">${r.defenderName || "Savunan"}</span>
    </div>
    ${blok}`;
}

/* ── SAVAŞ DETAYLARI: kahraman yetenekleri ──
   Yetenekler kahramana göre gruplanır; iki taraf yan yana eşleşir.
   Karşılıksız kalan taraf BOŞ bırakılır (kahraman sayıları eşit olmak
   zorunda değil). Tetiklenme sayısı `heroFx.attacker/defender`, öldürme
   `attackerKills/defenderKills` alanlarından gelir — ayrı bir hesap
   yapılmaz. Eski "KAHRAMAN YETENEKLERİ" yazı tablosu iptal edildi. */
const RP_AB_ANAHTAR = {
  enemy_freeze_turns: "freeze", damage_reflect_pct: "reflect",
  enemy_instant_casualty: "instant", periodic_def_reduce_pct: "periodic",
  power_gap_cap: "gapCap"
};

/* yetenek ikonunu heroes.js'ten bul (kahraman + başlık ile) */
function rpYetenekIkon(heroId, title) {
  if (typeof HERO_STATS === "undefined" || !HERO_STATS[heroId]) return "";
  const h = HERO_STATS[heroId];
  const ab = (h.abilities || []).find(a => a && a.title === title);
  if (ab && ab.icon && !String(ab.icon).includes("{{")) return ab.icon;
  if (h.passive && h.passive.icon) return h.passive.icon;
  return "";
}

/* Yeteneğin kısa açıklaması — heroes.js'teki descTemplate.
   {value}/{value2}/{chance} savaşa giren kahramanın O ANKİ seviyesinden
   gelir: `sources` içindeki v/v2/chance savaş anında yazılmıştır. Kayıtta
   yoksa (eski kayıt veya PvE yolu) seviye 1 değerine düşülür. */
function rpYetenekAciklama(heroId, title, s) {
  if (typeof HERO_STATS === "undefined" || !HERO_STATS[heroId]) return "";
  const ab = (HERO_STATS[heroId].abilities || []).find(a => a && a.title === title);
  if (!ab || !ab.descTemplate) return "";
  const sec = (kayit, dizi) => (typeof kayit === "number") ? kayit
    : (((ab[dizi] || [])[0] !== undefined) ? ab[dizi][0] : "");
  const v  = sec(s && s.v,      "valuesByLevel");
  const v2 = sec(s && s.v2,     "valuesByLevel2");
  const ch = sec(s && s.chance, "chanceByLevel");
  return String(ab.descTemplate)
    .split("{value2}").join("%" + v2)
    .split("{value}").join("%" + v)
    .split("{chance}").join("%" + ch);
}

function rpHeroAdi(heroId, yedek) {
  if (typeof HERO_STATS !== "undefined" && HERO_STATS[heroId] && HERO_STATS[heroId].name)
    return HERO_STATS[heroId].name;
  return yedek || "—";
}

/* abList → [{heroId, ad, satirlar:[{ikon,title,aciklama,tetik,olum}]}] */
function rpYetenekGruplari(abList, used, kills) {
  const harita = new Map();
  (abList || []).forEach(m => {
    const k = RP_AB_ANAHTAR[m.type];
    const tetik = (k && used && used[k]) ? used[k] : 0;
    const olum = (kills && kills[m.type]) ? kills[m.type] : 0;
    (m.sources || []).forEach(s => {
      const id = s.heroId || "";
      const ad = rpHeroAdi(id, s.heroName);
      const bas = s.title || m.title || m.type;
      if (!harita.has(id)) harita.set(id, { heroId: id, ad: ad, satirlar: [] });
      harita.get(id).satirlar.push({
        ikon: rpYetenekIkon(id, bas),
        title: bas,
        aciklama: rpYetenekAciklama(id, bas, s),
        tetik: tetik, olum: olum,
        /* SAYILABİLİR Mİ? Yalnız RP_AB_ANAHTAR'daki beş tür (dondurma,
           yansıma, anında kayıp, periyodik kırma, güç farkı) bir "an"
           yaşar ve sayılabilir. Geri kalanlar (saldırı/savunma/can
           yüzdeleri, yaralı dönüşü, robot güçlendirme) ordu kurulurken
           statlara işlenir; tetiklenme diye bir anları yoktur.
           Onlara "—" yazılınca yetenek ÇALIŞMIYOR sanılıyordu. */
        sayilir: !!k
      });
    });
  });
  return Array.from(harita.values());
}

function savasDetaylariAc(r) {
  document.getElementById("temaAbBack")?.remove();
  const fx = r.heroFx || {};
  const f = (n) => (typeof fmt === "function") ? fmt(n) : String(n);
  const A = rpYetenekGruplari(fx.attackerAbilities, fx.attacker, fx.attackerKills);
  const D = rpYetenekGruplari(fx.defenderAbilities, fx.defender, fx.defenderKills);

  /* Açıklamalar HTML özniteliğine gömülmez (tırnak/açı kaçışı sorunu):
     dizide tutulur, ikon yalnız sırasını taşır. */
  const ACIK = [];
  const esc = (t) => String(t == null ? "" : t)
    .split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");

  /* Sürekli etkili yetenekler sayı yerine "✓ Aktif" gösterir. */
  const tetikYazi = (s) => {
    if (!s) return "";
    if (s.tetik) return f(s.tetik);
    return s.sayilir ? "—" : '<span class="sd-aktif">✓ Aktif</span>';
  };

  const n = Math.max(A.length, D.length);
  let govde = "";
  for (let i = 0; i < n; i++) {
    const a = A[i] || null, d = D[i] || null;
    const sat = Math.max(a ? a.satirlar.length : 0, d ? d.satirlar.length : 0);
    let satirlar = "";
    for (let j = 0; j < sat; j++) {
      const x = a && a.satirlar[j], y = d && d.satirlar[j];
      /* dokunulabilir ikon: sırasını data-ac ile taşır */
      const kut = (s) => {
        if (!s) return `<span class="sd-ab sd-ab-yok"></span>`;
        const idx = ACIK.push({ title: s.title, aciklama: s.aciklama }) - 1;
        const ic = s.ikon ? `<img src="${s.ikon}" alt="">` : `<span class="sd-ab-bos">◈</span>`;
        return `<span class="sd-ab sd-ab-tik" data-ac="${idx}" role="button">${ic}</span>`;
      };
      satirlar += `
        <div class="sd-sarmal">
          <div class="sd-satir">
            ${kut(x)}
            <span class="sd-n">${tetikYazi(x)}</span>
            <span class="sd-n">${x ? (x.olum ? f(x.olum) : "—") : ""}</span>
            <span class="sd-ayrac"></span>
            <span class="sd-n">${y ? (y.olum ? f(y.olum) : "—") : ""}</span>
            <span class="sd-n">${tetikYazi(y)}</span>
            ${kut(y)}
          </div>
          <div class="sd-ac" hidden></div>
        </div>`;
    }
    govde += `
      <div class="sd-blok">
        <div class="sd-bas">
          <div class="sd-bas-sol">${a ? a.ad : ""}</div>
          <div class="sd-bas-sag">${d ? d.ad : ""}</div>
        </div>
        <div class="sd-sutun">
          <span class="sd-sb">Tetiklendi</span><span class="sd-sb">Öldürme</span>
          <span class="sd-ayrac"></span>
          <span class="sd-sb">Öldürme</span><span class="sd-sb">Tetiklendi</span>
        </div>
        ${satirlar}
      </div>`;
  }
  if (!n) govde = `<div class="rp-note">Bu savaşta kahraman yeteneği kullanılmadı.</div>`;

  const back = document.createElement("div");
  back.id = "temaAbBack";
  back.className = "sd-back";
  back.innerHTML = `
    <div class="rp-box sd-box">
      <button id="sdClose" class="rp-close">✕</button>
      <div class="rp-ttl">⚔️ SAVAŞ DETAYLARI</div>
      <div class="sd-govde">${govde}</div>
      <div class="rp-note">Yeteneğin ne yaptığını görmek için görseline dokun.</div>
    </div>`;
  document.body.appendChild(back);
  back.addEventListener("click", e => { if (e.target === back) back.remove(); });
  back.querySelector("#sdClose").onclick = () => back.remove();

  /* ikon → açıklama. Tek panel açık kalır; pencere içinde BAŞKA HERHANGİ
     bir yere (kutunun kendisi dahil) dokunmak açık açıklamayı kapatır. */
  const hepsiniKapat = () => {
    back.querySelectorAll(".sd-ac").forEach(k => { k.hidden = true; });
    back.querySelectorAll(".sd-ab-tik").forEach(k => k.classList.remove("sd-ab-acik"));
  };
  back.addEventListener("click", (e) => {
    const ik = e.target.closest(".sd-ab-tik");
    if (!ik) { hepsiniKapat(); return; }           /* boşluk / açıklama / başlık */
    const kutu = ik.closest(".sd-sarmal").querySelector(".sd-ac");
    const veri = ACIK[parseInt(ik.dataset.ac, 10)] || {};
    const zaten = !kutu.hidden && kutu.dataset.ac === ik.dataset.ac;
    hepsiniKapat();
    if (zaten) return;                              /* aynı ikon = kapat */
    kutu.dataset.ac = ik.dataset.ac;
    kutu.innerHTML = `<b>${esc(veri.title || "Yetenek")}</b>` +
      `<span>${esc(veri.aciklama || "Açıklama henüz eklenmedi.")}</span>`;
    kutu.hidden = false;
    ik.classList.add("sd-ab-acik");
  });
}

function openReportModal(r) {
  document.getElementById("temaReportBack")?.remove();
  const f = (n)=> (typeof fmt==="function")?fmt(n):String(n);

  const attacker = r.attackerName || "Saldıran";
  const defender = r.defenderName || "Savunan";
  const win = !!r.attackerWon;

  const back=document.createElement("div");
  back.id="temaReportBack";
  back.style.cssText="position:fixed;inset:0;z-index:9998;background:rgba(2,8,22,.6);"+
    "backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:18px;"+
    "font-family:'Baloo 2','Nunito',sans-serif";
  back.innerHTML=`
    <div class="rp-box">
      <button id="repClose" class="rp-close">✕</button>

      <div class="rp-ttl">📜 <span id="rpBaslik">SAVAŞ RAPORU</span></div>

      <!-- SAYFA 1: özet -->
      <div class="rp-sayfa" id="rpSayfa1">
        <div class="rp-sonuc ${win?'rp-win':'rp-lose'}">
          ${win?'🏆 SALDIRAN KAZANDI':'🛡️ SAVUNAN KAZANDI'}
        </div>

        <div class="rp-vs">
          <div class="rp-vs-side">
            <div class="rp-castle">🏰</div>
            <div class="rp-name">${attacker}</div>
            <div class="rp-role">SALDIRAN</div>
          </div>
          <div class="rp-vs-mid">VS</div>
          <div class="rp-vs-side">
            <div class="rp-castle">🏰</div>
            <div class="rp-name">${defender}</div>
            <div class="rp-role">SAVUNAN</div>
          </div>
        </div>

        ${(r.attackerCommanders&&r.attackerCommanders.length)||(r.defenderCommanders&&r.defenderCommanders.length)?`
        <div class="rp-cols rp-cols-hero">
          <div class="rp-col">
            <div class="rp-chips">${(r.attackerCommanders||[]).map(heroChip).join("")||'<span class="rp-dash">—</span>'}</div>
          </div>
          <div class="rp-col">
            <div class="rp-chips">${(r.defenderCommanders||[]).map(heroChip).join("")||'<span class="rp-dash">—</span>'}</div>
          </div>
        </div>`:''}

        <div class="rp-div"></div>
        <div class="rp-cols rp-cols-troop">
          <div class="rp-col"><div class="rp-chips">${unitChips(r.attackerTroops)}</div></div>
          <div class="rp-col"><div class="rp-chips">${unitChips(r.defenderTroops)}</div></div>
        </div>

        ${ozetHTML(r)}

        <div class="rp-foot">
          <span>💎 ${win?'+':''}${f(r.diamonds||0)}</span>
          <span class="rp-turn">⏱️ ${r.turns||0} tur</span>
        </div>
      </div>

      <!-- SAYFA 2: birlik dökümü -->
      <div class="rp-sayfa" id="rpSayfa2" hidden>
        ${unitDetailHTML(r)}
      </div>

      <div class="rp-alt">
        <button class="rp-ok" id="rpOkSol" hidden>‹</button>
        <button class="rp-detail-btn" id="rpAbBtn">SAVAŞ DETAYLARI</button>
        <button class="rp-ok" id="rpOkSag">›</button>
      </div>
    </div>`;
  document.body.appendChild(back);
  back.addEventListener("click",e=>{ if(e.target===back) back.remove(); });
  document.getElementById("repClose").onclick=()=>back.remove();

  /* sayfa geçişi — akordeon değil, yatay sayfa */
  const s1 = back.querySelector("#rpSayfa1"), s2 = back.querySelector("#rpSayfa2");
  const okS = back.querySelector("#rpOkSol"), okG = back.querySelector("#rpOkSag");
  const bas = back.querySelector("#rpBaslik");
  function sayfa(no) {
    s1.hidden = (no !== 1); s2.hidden = (no !== 2);
    okS.hidden = (no === 1); okG.hidden = (no === 2);
    bas.textContent = (no === 1) ? "SAVAŞ RAPORU" : "BİRLİK DÖKÜMÜ";
  }
  okG.onclick = () => sayfa(2);
  okS.onclick = () => sayfa(1);

  /* parmakla geçiş — kutu dikey de kaydığı için hareket ayrıştırılır:
     yatay yol 45 px'i aşmalı VE dikeyin en az 1.5 katı olmalı. Aksi
     hâlde dokunuşa karışılmaz, normal aşağı-yukarı kaydırma bozulmaz. */
  const kutu = back.querySelector(".rp-box");
  let bx = 0, by = 0, izle = false;
  kutu.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) { izle = false; return; }
    bx = e.touches[0].clientX; by = e.touches[0].clientY; izle = true;
  }, { passive: true });
  kutu.addEventListener("touchend", (e) => {
    if (!izle) return;
    izle = false;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - bx, dy = t.clientY - by;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    sayfa(dx < 0 ? 2 : 1);                 /* sola sürükle → döküm, sağa → özet */
  }, { passive: true });

  back.querySelector("#rpAbBtn").onclick = () => savasDetaylariAc(r);
}

/* günlük kaydından paylaşılabilir rapor objesi üret */
function entryToReport(entry) {
  if (entry.role === "attacker") {
    return {
      attackerWon: entry.win,
      attackerName: entry.myName, defenderName: entry.enemyPlainName,
      attackerCommanders: entry.myCommanders||[], defenderCommanders: entry.enemyCommanders||[],
      attackerLosses: entry.myLosses||null, defenderLosses: entry.enemyLosses||null,
      attackerTroops: entry.usedTroops||null, defenderTroops: entry.enemyTroops||null,
      diamonds: entry.diamondDelta||0, turns: entry.turns||0,
      attackerAttribution: entry.myAttribution||null,
      defenderAttribution: entry.enemyAttribution||null,
      heroFx: entry.heroFx||null,
    };
  }
  /* SAVUNAN gözünden: "saldıran" karşı taraftır */
  return {
    attackerWon: !entry.win,
    attackerName: entry.enemyPlainName, defenderName: entry.myName,
    attackerCommanders: entry.enemyCommanders||[],
    defenderCommanders: entry.myCommanders||[],
    attackerTroops: entry.enemyTroops||null,
    defenderTroops: entry.usedTroops||null,
    attackerLosses: entry.enemyLosses||null,
    defenderLosses: entry.myLosses||null,
    diamonds: entry.diamondsLost||0, turns: entry.turns||0,
    attackerAttribution: entry.enemyAttribution||null,
    defenderAttribution: entry.myAttribution||null,
    heroFx: entry.heroFx||null,
  };
}

/* raporu sohbete MEKTUP olarak gönder (düz metin değil, etiketli json) */
function shareReportToChat(entry) {
  const report = entryToReport(entry);
  if (typeof firebaseReady !== "undefined" && firebaseReady && typeof firebaseDb !== "undefined" && firebaseDb) {
    firebaseDb.ref("chat").push({
      name: (typeof currentUsername !== "undefined" && currentUsername) ? currentUsername : "Oyuncu",
      text: REPORT_TAG + JSON.stringify(report),
      at: Date.now(),
    }).then(()=>{ if(typeof showToast==="function") showToast("📜 Rapor eyalet sohbetinde paylaşıldı!"); })
      .catch((e)=>{ console.warn("[tema] paylaşım:",e); if(typeof showToast==="function") showToast("Şu an paylaşılamadı, tekrar dene."); });
  } else {
    if(typeof showToast==="function") showToast("Paylaşım için internet gerekli.");
  }
}

/* ── SOHBET: [RAPOR] mesajlarını mektuba çevir ── */
function fixChatStrip() {
  const strip = document.getElementById("chatStripText");
  if (!strip) return;
  if ((strip.textContent||"").indexOf(REPORT_TAG) !== -1) {
    const nameEl = strip.querySelector(".cs-name");
    strip.innerHTML = (nameEl ? nameEl.outerHTML + " " : "") + "📜 Savaş Raporu paylaştı";
  }
}

function hookChatReports() {
  fixChatStrip();
  const box = document.getElementById("chatMessages");
  if (!box || box.dataset.repHooked) return;
  box.dataset.repHooked = "1";

  const convert = () => {
    fixChatStrip();
    box.querySelectorAll(".chat-msg").forEach(msg => {
      if (msg.dataset.repDone) return;
      const bodyEl = msg.querySelector(".cm-body");
      if (!bodyEl) return;
      const txt = bodyEl.textContent || "";
      const i = txt.indexOf(REPORT_TAG);
      if (i === -1) return;
      msg.dataset.repDone = "1";
      let data = null;
      try { data = JSON.parse(txt.slice(i + REPORT_TAG.length)); } catch(e){ return; }
      bodyEl.innerHTML = `<button class="tema-letter">📜 Savaş Raporu — <b>aç</b></button>`;
      bodyEl.querySelector(".tema-letter").addEventListener("click", ()=>openReportModal(data));
    });
  };
  convert();
  new MutationObserver(convert).observe(box, {childList:true});
}

let _shareEntries = [];
function hookBattleLog() {
  const orig = window.renderBattleLogPanel;
  if (typeof orig !== "function" || orig.__temaWrapped) return;
  const wrapped = function () {
    const r = orig.apply(this, arguments);
    try { decorateLogWithShare(); } catch (e) {}
    return r;
  };
  wrapped.__temaWrapped = true;
  window.renderBattleLogPanel = wrapped;
}

function decorateLogWithShare() {
  const listEl = document.getElementById("battleLogHistoryList");
  if (!listEl) return;
  const history = (typeof state === "object" && state && state.battleLogHistory) ? state.battleLogHistory : [];
  const entries = listEl.querySelectorAll(".log-entry");
  _shareEntries = [];
  entries.forEach((el, i) => {
    const entry = history[i];
    if (!entry || !entry.pvp || el.querySelector(".tema-share-btn")) return;
    _shareEntries[i] = entry;
    /* günlükte: aç + paylaş */
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:6px;margin-top:8px";
    wrap.innerHTML =
      `<button class="tema-open-btn" data-idx="${i}">📜 Aç</button>`+
      `<button class="tema-share-btn" data-idx="${i}">📢 Paylaş</button>`;
    el.appendChild(wrap);
  });
  if (!listEl.dataset.shareHooked) {
    listEl.dataset.shareHooked = "1";
    listEl.addEventListener("click", (e) => {
      const openB = e.target.closest(".tema-open-btn");
      const shareB = e.target.closest(".tema-share-btn");
      if (openB) { const en=_shareEntries[parseInt(openB.dataset.idx,10)]; if(en) openReportModal(entryToReport(en)); }
      if (shareB) { const en=_shareEntries[parseInt(shareB.dataset.idx,10)]; if(en) shareReportToChat(en); }
    });
  }
}


/* ── SAVAŞ X BUTONU: overlay'e taşı (scroll etmeyen katman) ──
   Buton normalde .battle-arena (scroll eden kutu) içinde. Onu bir
   üst kata (#battleArena overlay) taşıyoruz; böylece panel içeriği
   kaydırılsa bile buton sabit köşede kalıyor, hiçbir şeyin üstüne
   binmiyor. İşlevi (backToMap) aynı kalıyor. */
function relocateBackButton() {
  const arena = document.querySelector("#battleArena .battle-arena");
  const btn = document.getElementById("mapBackBtn");
  if (!arena || !btn) return;
  if (btn.parentElement === arena) return;
  arena.appendChild(btn);   /* panelin (.battle-arena) doğrudan çocuğu yap */
}

/* ── BAŞLIKLARI DÜZELT: Mağaza→MARKET, Çanta ortalı büyük harf ── */
function fixTitles() {
  const shopH2 = document.querySelector("#panel-shop h2");
  if (shopH2 && !shopH2.dataset.fixed) {
    shopH2.dataset.fixed = "1";
    shopH2.textContent = "🏪 MARKET";
  }
  const invH2 = document.querySelector("#panel-inventory h2");
  if (invH2 && !invH2.dataset.fixed) {
    invH2.dataset.fixed = "1";
    invH2.textContent = "🎒 ÇANTA";
  }
}

/* ── TANK GÜDÜSÜ BUG'I ──────────────────────────────────────────
   Mağaza açılınca bir ürünün bilgi baloncuğu kendiliğinden açık
   geliyordu. Panel her açıldığında ve düzenli olarak DOM'daki açık
   baloncukları temizliyoruz (cleanShopPopups zaten yapıyor ama
   panel AÇIKKEN de takıldığı için burada da süpürüyoruz). */
function sweepStuckPopups() {
  const shop = document.getElementById("panel-shop");
  const shopOpen = shop && shop.classList.contains("active");
  if (!shopOpen) {
    document.querySelectorAll(".shop-info-pop, .shop-qty-pop").forEach(p => p.remove());
  }
}

/* ── ÇANTA: kutucuğa TIKLAYINCA kullan (Kullan butonu kaldırıldı) ──
   Can potu kartına dokununca useStaminaPotion() çağrılır.
   Diğer eşyalar için şimdilik kullanım yok (mağaza mantığı gibi
   ileride eklenebilir). */
function hookInventoryTap() {
  const list = document.getElementById("invList");
  if (!list || list.dataset.tapHooked) return;
  list.dataset.tapHooked = "1";
  list.addEventListener("click", (e) => {
    const card = e.target.closest(".inv-card, .shop-card");
    if (!card) return;
    /* can potu kartı mı? içindeki gizli Kullan butonundan anla */
    const useBtn = card.querySelector(".inv-use-btn");
    if (useBtn && typeof useStaminaPotion === "function") {
      useStaminaPotion();
    }
  });
}
function hookStaminaPill() {
  const orig = window.renderStamina;
  if (typeof orig !== "function" || orig.__pvpWrapped) return;
  const wrapped = function () {
    const r = orig.apply(this, arguments);
    try {
      const st = (typeof state === "object" && state) ? state.stamina : null;
      const txt = document.getElementById("staminaText");
      if (st && txt && st.max > 0) {
        txt.textContent = "❤️ %" + Math.round((st.current / st.max) * 100);
      }
    } catch (e) {}
    return r;
  };
  wrapped.__pvpWrapped = true;
  window.renderStamina = wrapped;
  try { wrapped(); } catch (e) {}
}


/* Mağaza kapatılınca açık kalan bilgi baloncuğu DOM'da kalıyor ve
   panel tekrar açıldığında "seçili" gibi görünüyordu. Mağaza kapalıyken
   kalıntıları temizliyoruz. */
function cleanShopPopups() {
  const panel = document.getElementById("panel-shop");
  const open = panel && getComputedStyle(panel).display !== "none";
  if (open) return;
  document.querySelectorAll(".shop-info-pop, .shop-qty-pop").forEach(p => p.remove());
}

/* mağaza her açıldığında da temizle */
function hookOpenPanel() {
  const orig = window.openOverlayPanel;
  if (typeof orig !== "function" || orig.__pvpWrapped) return;
  const wrapped = function (name) {
    document.querySelectorAll(".shop-info-pop, .shop-qty-pop").forEach(p => p.remove());
    return orig.apply(this, arguments);
  };
  wrapped.__pvpWrapped = true;
  window.openOverlayPanel = wrapped;
}

/* ═══════════════════════════════════════════════════════════════
   BAŞLAT
   ═══════════════════════════════════════════════════════════════ */
function tick() {
  hookStaminaPill();
  hookOpenPanel();
  hookBattleLog();
  hookChatReports();
  killBattleLog();
  relocateBackButton();
  cleanShopPopups();
  sweepStuckPopups();
  fixTitles();
  hookInventoryTap();
  installMapDragGuard();
}

/* ── SAVAŞ SONUÇ KUTUSUNU SUSTUR ──────────────────────────────
   #battleLog'a yazılan sonuç metnini gizli tutuyoruz. tick() zaten
   2.5 sn'de bir çalışıp temizliyor; savaş sonucu toast + günlük +
   mektupta olduğu için burada göstermeye gerek yok. */
function killBattleLog() {
  const log = document.getElementById("battleLog");
  if (!log) return;
  log.style.display = "none";
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { tick(); setInterval(tick, 2500); });
} else {
  tick(); setInterval(tick, 2500);
}

/* ═══════════════════════════════════════════════════════════════
   İNCE AYAR MENÜSÜ (geçici — ayarları bulunca kaldırılabilir)
   ---------------------------------------------------------------
   Savaş panelindeki X butonuna 2 saniye BASILI tutunca açılır.
   Kaydırıcılarla X'in konumunu/boyutunu ve panelin yüksekliğini
   canlı ayarlarsın; değerler ekranda görünür. "Değerleri kopyala"
   ile bana yapıştırırsın, ben sabitlerim.
   ═══════════════════════════════════════════════════════════════ */
(function tuner(){
  const S = { top:12, right:14, size:38, radius:10, padTop:16, maxH:92 };

  function applyTune(){
    let el = document.getElementById("temaTuneStyle");
    if(!el){ el=document.createElement("style"); el.id="temaTuneStyle"; document.head.appendChild(el); }
    el.textContent = `
      .battle-arena{ max-height:${S.maxH}vh !important; padding-top:${S.padTop}px !important; }
      #mapBackBtn{
        top:${S.top}px !important; right:${S.right}px !important;
        width:${S.size}px !important; height:${S.size}px !important;
        border-radius:${S.radius}px !important;
      }
      #mapBackBtn::after{ font-size:${Math.round(S.size*0.58)}px !important; }
    `;
    const box=document.getElementById("tuneVals");
    if(box) box.textContent =
      `top:${S.top} right:${S.right} size:${S.size} radius:${S.radius} padTop:${S.padTop} maxH:${S.maxH}`;
  }

  function openTuner(){
    if(document.getElementById("temaTuner")) return;
    const rows=[
      ["top","Yukarıdan",0,80],["right","Sağdan",0,80],
      ["size","Boyut",24,60],["radius","Köşe",0,20],
      ["padTop","Panel üst boşluk",0,60],["maxH","Panel yükseklik %",70,98],
    ];
    const d=document.createElement("div");
    d.id="temaTuner";
    d.style.cssText="position:fixed;left:10px;right:10px;bottom:10px;z-index:9999;background:#12203a;border:2px solid #4fd8ff;border-radius:14px;padding:12px 14px;font-family:sans-serif;color:#eaf4ff;box-shadow:0 10px 30px rgba(0,0,0,.6)";
    d.innerHTML=
      `<div style="font-weight:800;font-size:13px;margin-bottom:8px">🎛️ X & Panel Ayarı</div>`+
      rows.map(([k,lbl,mn,mx])=>
        `<div style="display:flex;align-items:center;gap:8px;margin:5px 0;font-size:12px">
           <span style="flex:0 0 120px">${lbl}</span>
           <input type="range" min="${mn}" max="${mx}" value="${S[k]}" data-k="${k}" style="flex:1">
           <span id="tv_${k}" style="flex:0 0 34px;text-align:right;font-weight:700">${S[k]}</span>
         </div>`).join("")+
      `<div id="tuneVals" style="margin-top:8px;font-size:11px;color:#9db2d0;word-break:break-all"></div>
       <div style="display:flex;gap:8px;margin-top:10px">
         <button id="tuneCopy" style="flex:1;padding:9px;border:none;border-radius:9px;background:#3b74e8;color:#fff;font-weight:800">Değerleri kopyala</button>
         <button id="tuneClose" style="flex:0 0 70px;padding:9px;border:none;border-radius:9px;background:#c00d0d;color:#fff;font-weight:800">Kapat</button>
       </div>`;
    document.body.appendChild(d);
    d.querySelectorAll("input[type=range]").forEach(inp=>{
      inp.addEventListener("input",()=>{
        S[inp.dataset.k]=parseInt(inp.value,10);
        document.getElementById("tv_"+inp.dataset.k).textContent=inp.value;
        applyTune();
      });
    });
    document.getElementById("tuneCopy").onclick=()=>{
      const t=`top:${S.top} right:${S.right} size:${S.size} radius:${S.radius} padTop:${S.padTop} maxH:${S.maxH}`;
      if(navigator.clipboard) navigator.clipboard.writeText(t);
      if(typeof showToast==="function") showToast("Kopyalandı: "+t);
    };
    document.getElementById("tuneClose").onclick=()=>d.remove();
    applyTune();
  }

  /* X'e 2 sn basılı tut → tuner açılır */
  function armLongPress(){
    const btn=document.getElementById("mapBackBtn");
    if(!btn || btn.dataset.tuneArmed) return;
    btn.dataset.tuneArmed="1";
    let t=null;
    const start=()=>{ t=setTimeout(openTuner,2000); };
    const cancel=()=>{ if(t) clearTimeout(t); };
    btn.addEventListener("pointerdown",start);
    btn.addEventListener("pointerup",cancel);
    btn.addEventListener("pointerleave",cancel);
  }
  setInterval(armLongPress,2000);
})();


/* ═══ GÜÇ SIRALAMASI (RANK) PANELİ — çerçeve + fontlar ═══ */
(function rankStyles(){
  if(document.getElementById("rankThemeCss")) return;
  var s=document.createElement("style"); s.id="rankThemeCss";
  s.textContent=`
    #panel-rank .rank-list{ display:flex; flex-direction:column; gap:8px; margin-top:10px;
      max-height:60vh; overflow-y:auto; padding:2px 2px 4px; }
    #panel-rank .rank-row{ display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:14px;
      background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.06));
      border:2px solid rgba(190,240,255,.4); color:#fff;
      font-family:'Baloo 2','Nunito',sans-serif;
      box-shadow:0 2px 8px rgba(0,20,45,.3); }
    #panel-rank .rank-pos{ min-width:36px; text-align:center; font-weight:900; font-size:18px;
      text-shadow:0 1px 3px rgba(0,20,45,.5); }
    #panel-rank .rank-name{ flex:1; font-weight:800; font-size:15px; text-shadow:0 1px 3px rgba(0,20,45,.6);
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    #panel-rank .rank-power{ font-weight:900; font-size:14px; color:#d6f2ff; white-space:nowrap;
      text-shadow:0 1px 3px rgba(0,20,45,.5); }
    #panel-rank .rank-gold{ background:linear-gradient(180deg,#ffd858,#e79c00); border-color:#fff2b0;
      box-shadow:0 4px 14px rgba(231,156,0,.55); }
    #panel-rank .rank-gold .rank-name, #panel-rank .rank-gold .rank-power, #panel-rank .rank-gold .rank-pos{ color:#3a2900; text-shadow:none; }
    #panel-rank .rank-silver{ background:linear-gradient(180deg,#f4f8fc,#c1cddc); border-color:#ffffff;
      box-shadow:0 4px 12px rgba(150,170,190,.5); }
    #panel-rank .rank-silver .rank-name, #panel-rank .rank-silver .rank-power, #panel-rank .rank-silver .rank-pos{ color:#28323f; text-shadow:none; }
    #panel-rank .rank-bronze{ background:linear-gradient(180deg,#e8ad7c,#bc7135); border-color:#ffdcba;
      box-shadow:0 4px 12px rgba(150,90,40,.5); }
    #panel-rank .rank-bronze .rank-name, #panel-rank .rank-bronze .rank-power, #panel-rank .rank-bronze .rank-pos{ color:#3a2210; text-shadow:none; }
    #panel-rank .rank-me{ outline:2px solid #2DC9FC; outline-offset:1px; }
    #panel-rank .rank-loading, #panel-rank .rank-empty{ text-align:center; padding:16px; color:#d6f2ff;
      font-family:'Baloo 2','Nunito',sans-serif; font-weight:700; }
    #panel-rank .overlay-card h2{ font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:900 !important;
      text-align:center !important; color:#fff !important; text-shadow:0 2px 4px rgba(0,40,70,.6) !important; margin:2px 0 6px !important; }
    #panel-rank .overlay-card .desc{ display:none !important; }
    #rankDockBtn{ padding-top:5px !important; }
  `;
  document.head.appendChild(s);
})();

/* NOT: "HOŞ GELDİN PAKETİ" (Revolia hoş geldin akışı + 1.5M elmas) artık rehber.js'te yönetiliyor. */


/* ═══════════════════════════════════════════════════════════════
   9) BİRLİK PANELİ v2 + SAVAŞ RAPORU
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const s = document.createElement("style");
  s.id = "troopPanelV2";
  s.textContent = `
/* ── PANEL: ekranın ortasında kart ── */
#panel-troops{
  /* HİZA: kahraman kartıyla aynı — heroes.js → HERO_UI.kartUst/kartAlt/kartKenar
     Orada bir değer değiştirirsen buradaki padding'i de aynı yap. */
  align-items:stretch !important; justify-content:center !important;
  padding:60px 12px 70px !important;
  /* tema.js'in panelin dışına çizdiği çerçeve/karartı kalkıyor */
  border:0 !important; border-radius:0 !important; box-shadow:none !important; overflow:visible !important;
}

#panel-troops .uv-viewer{
  width:100% !important; max-width:420px !important;
  height:100% !important;
  background:
    radial-gradient(ellipse 100% 50% at 50% 0%, rgba(170,240,255,.5), transparent 72%),
    radial-gradient(ellipse 80% 40% at 50% 105%, rgba(8,45,80,.55), transparent 75%),
    linear-gradient(180deg,#1fa3ea,#0e6fc0) !important;
  border:3px solid rgba(190,240,255,.85) !important;
  border-radius:22px !important;
  box-shadow:0 10px 34px rgba(0,0,0,.55), inset 0 3px 0 rgba(255,255,255,.45) !important;
  overflow:hidden !important;
}

/* ÖNEMLİ: bölümlerin kendi koyu zemini kalkıyor — panelin mavisi görünsün */
#panel-troops .unit-screen,
#panel-troops .us-knight,
#panel-troops .us-soldier,
#panel-troops .us-robot{
  background:transparent !important;
  padding:44px 12px 0 !important;
}
#panel-troops .stage{
  background:transparent !important;
  border:0 !important; border-radius:0 !important; box-shadow:none !important;
  padding-top:22px !important;
  overflow:visible !important;      /* kırpma yok — görsel serbest hareket eder */
  z-index:1 !important;
}
/* sekmeler ve kapat, görselin üstünde kalsın */
#panel-troops .tp-tabs{ z-index:55 !important; }
#panel-troops .uv-title{ z-index:54 !important; }
#panel-troops .uv-portraits{ position:relative !important; z-index:20 !important; }
#panel-troops .stats{ position:relative !important; z-index:20 !important; }
#panel-troops .us-soldier .spot{ opacity:.3 !important; }
#panel-troops .us-knight .dust{ display:none !important; }

/* oklar yok — parmakla kaydırma */
#panel-troops .uv-arrow{ display:none !important; }

/* ── SEKMELER: tek parça hap ── */
#panel-troops .tp-tabs{
  top:10px !important; left:12px !important; right:56px !important;
  gap:0 !important; padding:3px !important;
  background:rgba(4,32,60,.35) !important;
  border:1px solid rgba(190,240,255,.28) !important;
  border-radius:999px !important;
  pointer-events:auto !important;
}
#panel-troops .tp-tab{
  flex:1 1 0 !important; text-align:center !important;
  padding:5px 4px !important; line-height:1.15 !important;
  border:0 !important; border-radius:999px !important;
  background:transparent !important; box-shadow:none !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:14px !important;
  color:rgba(255,255,255,.72) !important; text-shadow:none !important;
  backdrop-filter:none !important;
}
#panel-troops .tp-tab.active{
  background:#fff !important; color:#0e6fc0 !important;
  box-shadow:0 2px 6px rgba(0,30,60,.28) !important;
}

/* ── BAŞLIK: sahnenin içinde ── */
#panel-troops .uv-title{
  top:40px !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:24px !important; letter-spacing:.5px !important;
  color:#fff !important; text-shadow:0 2px 5px rgba(0,40,70,.6) !important;
}

/* noktalar kaldırıldı — yerini portre seçici aldı */
#panel-troops .uv-dots{ display:none !important; }


/* ── KAPAT ── */
/* .uv-close kaldırıldı — birlik panelinin ✕'i artık savaş raporuyla
   aynı düğme (.overlay-close), stilini oradan alıyor. */

/* ── GÖRSELLER: boya göre ölçek, kırpılma yok ── */
#panel-troops .us-knight .knight-wrap{
  width:auto !important; height:78% !important;
  left:50% !important; bottom:14px !important; transform:translateX(-50%) !important;
}
#panel-troops .us-knight .knight-sway{ height:100% !important; }
#panel-troops .us-knight .knight{
  height:100% !important; width:auto !important; max-width:64vw !important;
  margin:0 auto !important; object-fit:contain !important;
}
#panel-troops .us-soldier .soldier-wrap{
  width:auto !important; height:78% !important;
  left:50% !important; bottom:14px !important; transform:translateX(-50%) !important;
}
#panel-troops .us-soldier .soldier{
  height:100% !important; width:auto !important; max-width:64vw !important;
  margin:0 auto !important; object-fit:contain !important;
}
#panel-troops .us-robot .hero-img{
  position:absolute !important; left:50% !important; top:auto !important;
  bottom:14px !important; transform:translateX(-50%) !important;
  height:76% !important; width:auto !important; max-width:64vw !important;
}
#panel-troops .ground-shadow{ display:none !important; }
#panel-troops .robot-fx{ background:transparent !important; }

/* ── İSTATİSTİKLER: bar yok, düz satır ── */
#panel-troops .stats{
  background:transparent !important; border-top:0 !important; box-shadow:none !important;
  padding:6px 4px calc(6px + env(safe-area-inset-bottom,0)) !important;
}
#panel-troops .stats-grid{
  display:flex !important; flex-direction:column !important; gap:2px !important;
  max-width:520px !important; margin:0 auto !important;
}
#panel-troops .stat-row{
  display:flex !important; align-items:center !important; gap:10px !important;
  padding:7px 12px !important; border:0 !important; border-radius:10px !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:700 !important; font-size:15px !important;
  color:#fff !important; text-shadow:0 1px 3px rgba(0,40,70,.6) !important;
  background:transparent !important;
}
#panel-troops .stat-row:nth-child(odd){ background:rgba(4,32,60,.22) !important; }
#panel-troops .stat-ico{
  width:22px !important; height:auto !important; flex:none !important;
  font-size:17px !important; text-align:center !important; line-height:1 !important;
  background:none !important; border:0 !important; border-radius:0 !important;
  display:inline-block !important; filter:none !important;
}
#panel-troops .stat-name{
  flex:1 !important; font-size:16px !important; font-weight:700 !important;
  text-transform:none !important; letter-spacing:0 !important; color:#fff !important;
}
#panel-troops .stat-val{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:18px !important; color:#fff !important;
  font-variant-numeric:tabular-nums !important;
}
#panel-troops .bar{ display:none !important; }

/* ── PORTRE SEÇİCİ (3 birlik) ── */
#panel-troops .uv-portraits{
  display:flex !important; justify-content:center !important; gap:9px !important;
  margin:2px 0 10px !important;
}
#panel-troops .uv-portrait{
  width:62px !important; height:62px !important; flex:none !important;
  padding:0 !important; overflow:hidden !important; cursor:pointer !important;
  border-radius:16px !important;
  background:transparent !important;
  border:2px solid rgba(190,240,255,.45) !important;
  box-shadow:none !important;
  transition:border-color .15s, box-shadow .15s, transform .15s;
  -webkit-tap-highlight-color:transparent;
}
#panel-troops .uv-portrait img{
  width:200% !important; height:auto !important; display:block !important;
  margin:-4% 0 0 -50% !important; pointer-events:none;
}
#panel-troops .uv-portrait span{
  display:flex; align-items:center; justify-content:center;
  width:100%; height:100%; font-size:24px;
}
#panel-troops .uv-portrait.is-active{
  border-color:#ffd257 !important;
  box-shadow:0 0 0 2px rgba(255,210,87,.35), 0 4px 10px rgba(0,25,50,.4) !important;
  transform:translateY(-2px) !important;
}

/* ── ADET ÇUBUĞU: − / kutu / + / sürgü ── */
#panel-troops .unit-qty-bar{
  display:flex !important; align-items:center !important; gap:8px !important;
  margin:8px 8px 0 !important;
}
#panel-troops .uq-btn{
  width:38px !important; height:38px !important; flex:none !important;
  border-radius:11px !important; cursor:pointer !important;
  background:linear-gradient(180deg,#ffd257,#f0932b) !important;
  border:2px solid rgba(255,220,150,.7) !important; color:#3a2408 !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:21px !important; line-height:1 !important;
  box-shadow:0 3px 0 #a8641a, inset 0 1px 0 rgba(255,255,255,.5) !important;
}
#panel-troops .uq-btn:active{ transform:translateY(2px) !important; box-shadow:0 1px 0 #a8641a !important; }
#panel-troops .uq-input{
  width:62px !important; flex:none !important; text-align:center !important;
  padding:8px 4px !important; border-radius:11px !important;
  background:rgba(255,255,255,.18) !important;
  border:2px solid rgba(190,240,255,.7) !important; color:#fff !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:16px !important; outline:none !important;
  -moz-appearance:textfield;
}
#panel-troops .uq-input::-webkit-outer-spin-button,
#panel-troops .uq-input::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
#panel-troops .uv-qty-slider{
  flex:1 !important; width:auto !important; height:24px !important;
  writing-mode:horizontal-tb !important; direction:ltr !important;
  -webkit-appearance:auto !important; appearance:auto !important;
  accent-color:#ffd257 !important; cursor:pointer !important;
}

/* ── İKİ BUTON: Anında / Üret ── */
#panel-troops .unit-train-bar{
  display:flex !important; align-items:stretch !important; gap:8px !important;
  position:static !important; height:auto !important; margin:6px 8px 0 !important;
  background:transparent !important; border:0 !important; padding:0 !important; overflow:visible !important;
}
#panel-troops .unit-instant-btn,
#panel-troops .unit-train-btn{
  position:static !important; flex:1 1 0 !important; width:auto !important; height:auto !important;
  display:flex !important; flex-direction:column !important;
  align-items:center !important; justify-content:center !important; gap:0 !important;
  padding:5px 6px !important; border-radius:14px !important; cursor:pointer !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  text-transform:none !important; letter-spacing:.3px !important;
}
#panel-troops .unit-instant-btn{
  background:linear-gradient(180deg,#ffd257,#f0932b) !important;
  border:2px solid rgba(255,220,150,.7) !important; color:#3a2408 !important;
  text-shadow:0 1px 0 rgba(255,255,255,.4) !important;
  box-shadow:0 4px 0 #a8641a, inset 0 1px 0 rgba(255,255,255,.5) !important;
}
#panel-troops .unit-instant-btn:active{ transform:translateY(3px) !important; box-shadow:0 1px 0 #a8641a !important; }
#panel-troops .unit-train-btn{
  background:linear-gradient(180deg,#4fd8ff,#1fa3ea) !important;
  border:2px solid rgba(190,240,255,.9) !important; color:#fff !important;
  text-shadow:0 2px 3px rgba(0,40,70,.5) !important;
  box-shadow:0 4px 0 #0e6fc0, inset 0 1px 0 rgba(255,255,255,.45) !important;
}
#panel-troops .unit-train-btn:active{ transform:translateY(3px) !important; box-shadow:0 1px 0 #0e6fc0 !important; }
#panel-troops .utb-top{ font-weight:800 !important; font-size:17px !important; line-height:1.12 !important; }
#panel-troops .utb-sub{ font-weight:700 !important; font-size:12px !important; line-height:1.12 !important; opacity:.9 !important; }

/* ── EĞİTİM SÜRÜYOR ── */
#panel-troops .utb-training{
  flex:1 !important; display:flex !important; flex-direction:column !important;
  align-items:center !important; justify-content:center !important;
  padding:6px 8px !important; border-radius:14px !important;
  background:rgba(4,32,60,.3) !important; border:2px solid rgba(190,240,255,.35) !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:15px !important; color:#dff4ff !important;
}
#panel-troops .unit-train-timer{ font-weight:700 !important; font-size:12.5px !important; opacity:.9 !important; }
#panel-troops .unit-speedup-btn{
  flex:none !important;
  font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:800 !important;
  font-size:13px !important; color:#3a2408 !important;
  background:linear-gradient(180deg,#ffd257,#f0932b) !important;
  border:2px solid rgba(255,220,150,.7) !important; border-radius:12px !important;
  padding:8px 12px !important; cursor:pointer !important;
  box-shadow:0 3px 0 #a8641a, inset 0 1px 0 rgba(255,255,255,.5) !important;
}

/* troops.js kendi ✕ butonunu ekliyor, ana kodda da biri var — biri gizlenir */
#panel-troops .tp-close{ display:none !important; }

/* ── Birlik geçişi anında olsun (yumuşak geçiş "yenileniyor" hissi veriyordu) ── */
#panel-troops .unit-screen{ transition:none !important; }

/* ── HİZA: KAHRAMAN KARTIYLA BİREBİR AYNI ──
   Değerler heroes.js → HERO_UI.kartUst / kartAlt / kartKenar ile aynı.
   Orada bir değeri değiştirirsen buradaki padding'i de aynı yap.
   NOT: Bu blok dosyanın en sonunda olduğu için yukarıdaki
   #panel-troops kurallarını EZER — ölçüyü buradan ayarla. */
#panel-troops{ padding:60px 12px 70px !important; align-items:stretch !important; }
#panel-troops .uv-viewer{
  height:100% !important;
  max-width:420px !important;
  border-radius:22px !important;
  border:3px solid rgba(190,240,255,.85) !important;
  box-shadow:0 10px 34px rgba(0,0,0,.55), inset 0 3px 0 rgba(255,255,255,.45) !important;
}

/* ── İNCE AYAR — değerler CSS değişkeni, canlı ayar paneli bunları değiştirir ── */
#panel-troops .uv-portrait{
  width:var(--tp-box,44px) !important; height:var(--tp-box,44px) !important;
  border-radius:calc(var(--tp-box,44px) * .27) !important;
}

/* ŞÖVALYE */
#panel-troops .us-knight .knight-wrap{
  height:var(--tp-k-h,126%) !important; bottom:var(--tp-k-b,-55px) !important;
  left:50% !important; transform:translateX(calc(-50% + var(--tp-k-x,0px))) !important;
}
#panel-troops .uv-portrait[data-i="0"] img{
  width:var(--tp-kp-w,150%) !important;
  margin:var(--tp-kp-t,-29%) 0 0 var(--tp-kp-l,-26%) !important;
}

/* ASKER */
#panel-troops .us-soldier .soldier-wrap{
  height:var(--tp-a-h,116%) !important; bottom:var(--tp-a-b,-36px) !important;
  left:50% !important; transform:translateX(calc(-50% + var(--tp-a-x,-5px))) !important;
}
#panel-troops .uv-portrait[data-i="1"] img{
  width:var(--tp-ap-w,130%) !important;
  margin:var(--tp-ap-t,-16%) 0 0 var(--tp-ap-l,-21%) !important;
}

/* ROBOT */
#panel-troops .us-robot .hero-img{
  height:var(--tp-r-h,116%) !important; bottom:var(--tp-r-b,-44px) !important;
  left:50% !important; transform:translateX(calc(-50% + var(--tp-r-x,-4px))) !important;
}
#panel-troops .uv-portrait[data-i="2"] img{
  width:var(--tp-rp-w,140%) !important;
  margin:var(--tp-rp-t,-10%) 0 0 var(--tp-rp-l,-18%) !important;
}

/* ── canlı ayar paneli (sadece ?ayar=1 ile) — küçük, köşede ── */
#tpTuner{
  position:fixed; right:8px; bottom:8px; z-index:9999;
  width:min(268px, 76vw); max-height:44vh; overflow:auto;
  background:rgba(12,20,34,.93); border:1px solid #2b4260; border-radius:12px;
  padding:7px 8px; font-family:'Baloo 2',sans-serif; color:#e8f4ff;
  box-shadow:0 6px 20px rgba(0,0,0,.55); backdrop-filter:blur(4px);
}
#tpTuner.min{ max-height:34px; overflow:hidden; width:auto; }
#tpTuner.top{ bottom:auto; top:8px; }
#tpTuner .tt-head{ display:flex; gap:4px; align-items:center; margin-bottom:5px; }
#tpTuner .tt-head b{ font-size:11px; color:#ffd257; flex:1; white-space:nowrap; }
#tpTuner button{ border:0; border-radius:7px; padding:5px 7px; cursor:pointer;
  font-family:inherit; font-weight:800; font-size:10.5px; background:#26364f; color:#cfe8ff; }
#tpTuner button.on{ background:#ffd257; color:#3a2408; }
#tpTuner .tt-tabs{ display:flex; gap:3px; margin-bottom:5px; }
#tpTuner .tt-tabs button{ flex:1; padding:5px 2px; font-size:10px; }
#tpTuner .tt-row{ display:flex; align-items:center; gap:5px; margin:2px 0; }
#tpTuner .tt-row label{ width:56px; flex:none; font-size:10px; color:#a9c3e0; font-weight:700; }
#tpTuner .tt-row input{ flex:1; accent-color:#ffd257; height:16px; }
#tpTuner .tt-row span{ width:40px; text-align:right; font-size:10.5px; font-weight:800; color:#7fd8ff; }
#tpTuner textarea{ width:100%; height:52px; margin-top:5px; background:#0b1220;
  border:1px solid #2b4260; border-radius:7px; color:#9fe8ff;
  font:9.5px/1.4 ui-monospace,monospace; padding:5px; }



/* ═══ SAVAŞ RAPORU ═══ */
.rep-sides{ display:flex; gap:8px; margin-bottom:10px; }
.rep-side{ flex:1 1 0; min-width:0; background:rgba(4,32,60,.22);
  border:1px solid rgba(190,240,255,.18); border-radius:12px; padding:8px; }
.rep-side-ttl{ font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:12px;
  color:#9fe8ff; margin-bottom:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rep-line{ display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px; }
.rep-line:last-child{ margin-bottom:0; }
.rep-unit{ display:flex; flex-direction:column; align-items:center; gap:2px; }
.rep-por{
  width:38px; height:38px; overflow:hidden; border-radius:11px;
  background:rgba(255,255,255,.08); border:1.5px solid rgba(190,240,255,.4);
}
.rep-por img{ display:block; height:auto; }
.rep-por[data-i="0"] img{ width:var(--tp-kp-w,150%); margin:var(--tp-kp-t,-29%) 0 0 var(--tp-kp-l,-26%); }
.rep-por[data-i="1"] img{ width:var(--tp-ap-w,130%); margin:var(--tp-ap-t,-16%) 0 0 var(--tp-ap-l,-21%); }
.rep-por[data-i="2"] img{ width:var(--tp-rp-w,140%); margin:var(--tp-rp-t,-10%) 0 0 var(--tp-rp-l,-18%); }
.rep-por-hero{ border-color:#ffd257; }
.rep-por-hero img{ width:190%; margin:-8% 0 0 -45%; }
.rep-cap{ font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:11px;
  color:#e8f4ff; max-width:52px; text-align:center; overflow:hidden;
  text-overflow:ellipsis; white-space:nowrap; }
.rep-empty{ font-size:11.5px; color:rgba(255,255,255,.45); font-weight:700; }
.rep-sec-ttl{ font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:12.5px;
  color:#ffd257; margin:10px 0 6px; }
.rep-loss{ display:flex; gap:10px; }
.rep-loss > div{ flex:1 1 0; min-width:0; }
.rep-loss-lbl{ display:block; font-family:'Baloo 2','Nunito',sans-serif;
  font-weight:800; font-size:11.5px; margin-bottom:4px; }
.rep-hero-block{ display:flex; gap:9px; align-items:flex-start; margin-bottom:8px;
  background:rgba(4,32,60,.18); border-radius:10px; padding:7px; }
.rep-hero-head{ flex:none; }
.rep-ab-list{ flex:1; min-width:0; }
.rep-ab{ display:flex; gap:6px; align-items:baseline; font-size:11.5px; line-height:1.45;
  font-family:'Baloo 2','Nunito',sans-serif; }
.rep-ab span{ flex:1; min-width:0; color:#cfe8ff; font-weight:700; }
.rep-ab b{ flex:none; color:#7fffa8; font-weight:800; font-size:11px; text-align:right; }
.rep-ab-none{ color:rgba(255,255,255,.4); font-weight:700; font-size:11.5px; }

/* ═══ GÜNLÜK LİSTESİ + RAPOR PENCERESİ ═══ */
.log-entry-actions{ margin-top:8px; }
.log-open-btn{
  width:100%; padding:9px; border:2px solid rgba(190,240,255,.6); border-radius:11px;
  background:linear-gradient(180deg,#4fd8ff,#1fa3ea); color:#fff; cursor:pointer;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:14px;
  text-shadow:0 2px 3px rgba(0,40,70,.5);
  box-shadow:0 3px 0 #0e6fc0, inset 0 1px 0 rgba(255,255,255,.45);
}
.log-open-btn:active{ transform:translateY(2px); box-shadow:0 1px 0 #0e6fc0; }

#logReportModal{
  position:fixed; inset:0; z-index:9998; background:rgba(2,8,22,.74);
  display:flex; align-items:center; justify-content:center; padding:16px 12px;
  font-family:'Baloo 2','Nunito',sans-serif;
}
#logReportModal .lrm-box{
  position:relative; width:min(430px,96vw); max-height:86vh; overflow:auto;
  background:
    radial-gradient(ellipse 100% 50% at 50% 0%, rgba(170,240,255,.5), transparent 72%),
    linear-gradient(180deg,#1fa3ea,#0e6fc0);
  border:3px solid rgba(190,240,255,.85); border-radius:20px;
  padding:14px 14px 18px; color:#fff;
  box-shadow:0 0 26px rgba(120,225,255,.45), inset 0 3px 0 rgba(255,255,255,.45);
}
#logReportModal .lrm-close{
  position:absolute; top:10px; right:10px; width:38px; height:38px; border-radius:11px;
  border:2px solid rgba(255,190,190,.75); cursor:pointer;
  background:linear-gradient(180deg,#ff6b6b,#e03131); color:#fff;
  font-size:17px; font-weight:800; line-height:1;
  box-shadow:0 3px 0 #a01b1b, inset 0 1px 0 rgba(255,255,255,.4);
}
#logReportModal .lrm-ttl{
  font-weight:800; font-size:17px; margin:2px 46px 12px 2px;
  text-shadow:0 2px 4px rgba(0,40,70,.6);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

/* ═══ RAPORDAKİ KAHRAMAN KARTI (ayarlanabilir) ═══ */
.rep-hchip{ display:flex; flex-direction:column; align-items:center; gap:3px;
  width:calc(var(--rh-box,52px) + 4px); }
.rep-hpor{
  width:var(--rh-box,52px); height:var(--rh-box,52px);
  border-radius:calc(var(--rh-box,45px) * .15); overflow:hidden;
  background:linear-gradient(180deg,#3d7ccc,#152e5e);
  border:2px solid rgba(190,240,255,.5);
  display:block;                 /* flex DEĞİL — görsel kutudan taşıp yakınlaşabilsin */
  position:relative;
}
.rep-hpor .rep-hemoji{ display:flex; align-items:center; justify-content:center;
  width:100%; height:100%; }
.rep-hpor img{ width:var(--rh-w,100%); height:auto; display:block;
  margin:var(--rh-t,0%) 0 0 var(--rh-l,0%); }

/* her kahraman ayrı ayarlanır */
.rep-hpor[data-h="buz_savascisi"]{ width:var(--rh-buz_savascisi-box,50px); height:var(--rh-buz_savascisi-box,50px); border-radius:calc(var(--rh-buz_savascisi-box,50px) * .15); }
.rep-hpor[data-h="buz_savascisi"] img{ width:var(--rh-buz_savascisi-w,187%); margin:var(--rh-buz_savascisi-t,-11%) 0 0 var(--rh-buz_savascisi-l,-44%); }
.rep-hpor[data-h="celik_savasci"]{ width:var(--rh-celik_savasci-box,50px); height:var(--rh-celik_savasci-box,50px); border-radius:calc(var(--rh-celik_savasci-box,50px) * .15); }
.rep-hpor[data-h="celik_savasci"] img{ width:var(--rh-celik_savasci-w,167%); margin:var(--rh-celik_savasci-t,-38%) 0 0 var(--rh-celik_savasci-l,-33%); }
.rep-hpor[data-h="ates_buyucusu"]{ width:var(--rh-ates_buyucusu-box,50px); height:var(--rh-ates_buyucusu-box,50px); border-radius:calc(var(--rh-ates_buyucusu-box,50px) * .15); }
.rep-hpor[data-h="ates_buyucusu"] img{ width:var(--rh-ates_buyucusu-w,222%); margin:var(--rh-ates_buyucusu-t,-22%) 0 0 var(--rh-ates_buyucusu-l,-69%); }
.rep-hpor[data-h="ivanovna"]{ width:var(--rh-ivanovna-box,50px); height:var(--rh-ivanovna-box,50px); border-radius:calc(var(--rh-ivanovna-box,50px) * .15); }
.rep-hpor[data-h="ivanovna"] img{ width:var(--rh-ivanovna-w,227%); margin:var(--rh-ivanovna-t,-13%) 0 0 var(--rh-ivanovna-l,-62%); }
.rep-hpor[data-h="revolia"]{ width:var(--rh-revolia-box,50px); height:var(--rh-revolia-box,50px); border-radius:calc(var(--rh-revolia-box,50px) * .15); }
.rep-hpor[data-h="revolia"] img{ width:var(--rh-revolia-w,277%); margin:var(--rh-revolia-t,-40%) 0 0 var(--rh-revolia-l,-83%); }
.rep-hemoji{ font-size:20px; }
.rep-hname{ font-size:9px; font-weight:800; color:#eaf7ff; text-align:center; line-height:1.1; }

/* kendi raporumdaki kahraman portresi de aynı ayarları kullansın */
.rep-por-hero[data-h="buz_savascisi"]{ width:var(--rh-buz_savascisi-box,50px) !important; height:var(--rh-buz_savascisi-box,50px) !important; border-radius:calc(var(--rh-buz_savascisi-box,50px) * .15) !important; }
.rep-por-hero[data-h="buz_savascisi"] img{ width:var(--rh-buz_savascisi-w,187%) !important; margin:var(--rh-buz_savascisi-t,-11%) 0 0 var(--rh-buz_savascisi-l,-44%) !important; }
.rep-por-hero[data-h="celik_savasci"]{ width:var(--rh-celik_savasci-box,50px) !important; height:var(--rh-celik_savasci-box,50px) !important; border-radius:calc(var(--rh-celik_savasci-box,50px) * .15) !important; }
.rep-por-hero[data-h="celik_savasci"] img{ width:var(--rh-celik_savasci-w,167%) !important; margin:var(--rh-celik_savasci-t,-38%) 0 0 var(--rh-celik_savasci-l,-33%) !important; }
.rep-por-hero[data-h="ates_buyucusu"]{ width:var(--rh-ates_buyucusu-box,50px) !important; height:var(--rh-ates_buyucusu-box,50px) !important; border-radius:calc(var(--rh-ates_buyucusu-box,50px) * .15) !important; }
.rep-por-hero[data-h="ates_buyucusu"] img{ width:var(--rh-ates_buyucusu-w,222%) !important; margin:var(--rh-ates_buyucusu-t,-22%) 0 0 var(--rh-ates_buyucusu-l,-69%) !important; }
.rep-por-hero[data-h="ivanovna"]{ width:var(--rh-ivanovna-box,50px) !important; height:var(--rh-ivanovna-box,50px) !important; border-radius:calc(var(--rh-ivanovna-box,50px) * .15) !important; }
.rep-por-hero[data-h="ivanovna"] img{ width:var(--rh-ivanovna-w,227%) !important; margin:var(--rh-ivanovna-t,-13%) 0 0 var(--rh-ivanovna-l,-62%) !important; }
.rep-por-hero[data-h="revolia"]{ width:var(--rh-revolia-box,50px) !important; height:var(--rh-revolia-box,50px) !important; border-radius:calc(var(--rh-revolia-box,50px) * .15) !important; }
.rep-por-hero[data-h="revolia"] img{ width:var(--rh-revolia-w,277%) !important; margin:var(--rh-revolia-t,-40%) 0 0 var(--rh-revolia-l,-83%) !important; }

#tpTuner .tt-sub{ margin-top:-2px; }
#tpTuner .tt-sub button{ font-size:9.5px; padding:4px 2px; }

/* ═══ PVP RAPORU — KESE KAĞIDI ═══ */
:root{
  --rp-kagit:#bd9660; --rp-kagit-alt:#94703f;
  --rp-murekkep:#33230f; --rp-murekkep-2:#584021;
  --rp-altin:#6d420f; --rp-muhur:#8e2418;
  --rp-kenar:.6; --rp-burusuk:.28;
  --rp-lif:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23f)' opacity='0.105'/%3E%3C/svg%3E");
}
.rp-box{
  position:relative; width:min(380px,94vw); max-height:88vh;
  overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain;
  touch-action:pan-y;
  border-radius:14px; padding:16px 15px 15px; color:var(--rp-murekkep);
  background-color:var(--rp-kagit);
  background-image:
    linear-gradient(112deg, rgba(255,255,255,calc(var(--rp-burusuk) * .5)) 0 1px, transparent 1px 42%,
      rgba(0,0,0,calc(var(--rp-burusuk) * .13)) 42% 43%, transparent 43%),
    linear-gradient(-67deg, rgba(255,255,255,calc(var(--rp-burusuk) * .42)) 0 1px, transparent 1px 68%,
      rgba(0,0,0,calc(var(--rp-burusuk) * .1)) 68% 69%, transparent 69%),
    radial-gradient(ellipse 120% 90% at 50% 45%, transparent 52%, rgba(80,48,16,var(--rp-kenar)) 100%),
    var(--rp-lif),
    linear-gradient(168deg, color-mix(in srgb, var(--rp-kagit) 88%, #fff) 0%, var(--rp-kagit) 38%, var(--rp-kagit-alt) 100%);
  background-size:auto,auto,auto,180px 180px,auto;
  border:2px solid color-mix(in srgb, var(--rp-kagit-alt) 76%, #3a2a14);
  box-shadow:0 10px 26px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.32),
    inset 0 -2px 6px rgba(90,55,18,.28);
}
.rp-box::before{ content:""; position:absolute; inset:3px; border-radius:11px;
  pointer-events:none; border:1px dashed rgba(90,58,24,.22); }
.rp-close{
  position:absolute; top:10px; right:10px; width:34px; height:34px; border:none;
  border-radius:50%; color:#ffe9d8; font-weight:800; font-size:16px; cursor:pointer; z-index:2;
  background:radial-gradient(circle at 35% 30%, color-mix(in srgb,var(--rp-muhur) 70%,#ff9d7a), var(--rp-muhur) 70%);
  box-shadow:0 2px 6px rgba(60,10,0,.5), inset 0 -2px 4px rgba(0,0,0,.3), inset 0 2px 3px rgba(255,255,255,.25);
}
.rp-ttl{ text-align:center; font-weight:800; font-size:17px; margin:2px 0 10px;
  letter-spacing:.5px; color:var(--rp-murekkep); text-shadow:0 1px 0 rgba(255,255,255,.4); }
.rp-sonuc{ text-align:center; font-weight:800; font-size:14.5px; margin-bottom:14px;
  color:var(--rp-altin); text-shadow:0 1px 0 rgba(255,255,255,.35); }
.rp-lose{ color:var(--rp-muhur); }

.rp-vs{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:12px; }
.rp-vs-side{ flex:1; text-align:center; }
.rp-vs-mid{ flex:0 0 auto; font-weight:800; font-size:19px; color:var(--rp-murekkep-2); }
.rp-castle{ width:58px; height:58px; margin:0 auto; border-radius:10px;
  background:rgba(255,255,255,.22);
  border:2px dashed color-mix(in srgb, var(--rp-murekkep) 45%, transparent);
  display:flex; align-items:center; justify-content:center; font-size:24px; }
.rp-name{ font-weight:800; font-size:12px; margin-top:5px; color:var(--rp-altin); }
.rp-role{ font-size:10px; font-weight:600; color:var(--rp-murekkep-2); letter-spacing:.4px; }
.rp-sec{ font-size:11px; font-weight:800; color:var(--rp-murekkep-2); margin:13px 0 7px;
  padding-bottom:5px; letter-spacing:.6px;
  border-bottom:1px solid color-mix(in srgb, var(--rp-murekkep) 30%, transparent); }
.rp-cols{ display:flex; gap:10px; }
.rp-col{ flex:1 1 0; min-width:0; }
.rp-chips{ display:flex; flex-wrap:wrap; justify-content:center; gap:5px; }
.rp-dash{ color:var(--rp-murekkep-2); font-size:12px; font-weight:800; }
.rp-nolost{ color:var(--rp-altin); font-weight:800; font-size:11px; }
.rp-tchip{ display:inline-block; padding:5px 7px; border-radius:7px; margin:1px;
  font-size:10.5px; font-weight:800; white-space:nowrap; color:var(--rp-murekkep);
  background:rgba(255,255,255,.28);
  border:1px solid color-mix(in srgb, var(--rp-murekkep) 32%, transparent); }

/* kahramanlar ile birlikler arasındaki ayırıcı */
.rp-div{ height:1px; margin:12px 0 8px;
  background:color-mix(in srgb, var(--rp-murekkep) 30%, transparent); }

/* savaşa sürülen birlikler — kafa kutusu + altında sayı */
.rp-unit{ display:flex; flex-direction:column; align-items:center; gap:2px; }
.rp-ucap{ font-size:11px; font-weight:800; color:var(--rp-murekkep); }
.rp-box .rp-cols-troop .rep-por{
  background:rgba(255,255,255,.22) !important;
  border:2px solid color-mix(in srgb, var(--rp-murekkep) 45%, transparent) !important;
}
.rp-foot{ display:flex; justify-content:space-around; font-weight:800; font-size:13px;
  background:rgba(255,255,255,.22);
  border:1px solid color-mix(in srgb, var(--rp-murekkep) 26%, transparent);
  border-radius:9px; padding:9px; margin-top:13px; color:var(--rp-murekkep); }
.rp-turn{ color:var(--rp-murekkep-2); }

/* ── DETAY bölümü ── */
.rp-detail-btn{
  width:100%; margin-top:10px; padding:10px; cursor:pointer;
  border:1.5px solid color-mix(in srgb, var(--rp-murekkep) 40%, transparent);
  border-radius:9px; background:rgba(255,255,255,.28);
  color:var(--rp-murekkep); font-family:inherit; font-weight:800;
  font-size:12.5px; letter-spacing:1px;
}
.rp-detail-btn:active{ background:rgba(255,255,255,.4); }
.rp-detail{ margin-top:10px; }
.rp-dttl{ font-size:11px; font-weight:800; color:var(--rp-murekkep-2);
  margin:12px 0 6px; padding-bottom:4px;
  border-bottom:1px solid color-mix(in srgb, var(--rp-murekkep) 22%, transparent); }
.rp-dsub{ font-size:10.5px; font-weight:800; color:var(--rp-murekkep-2); margin:8px 0 3px; }
.rp-tbl{ width:100%; border-collapse:collapse; font-size:10.5px; color:var(--rp-murekkep); }
.rp-tbl th{ font-weight:800; font-size:9.5px; text-align:left; padding:3px 4px;
  color:var(--rp-murekkep-2); border-bottom:1px solid color-mix(in srgb, var(--rp-murekkep) 20%, transparent); }
.rp-tbl td{ padding:4px; border-bottom:1px solid color-mix(in srgb, var(--rp-murekkep) 10%, transparent);
  font-weight:700; }
.rp-tbl .rp-r{ text-align:right; font-variant-numeric:tabular-nums; }
.rp-tbl-ab td{ font-size:10px; line-height:1.35; }
.rp-tbl-ab td:first-child{ font-weight:800; white-space:nowrap; }
.rp-g{ color:#1f7a34; }
.rp-y{ color:#9a6a10; }
.rp-note{ font-size:9.5px; color:var(--rp-murekkep-2); opacity:.85;
  margin-top:5px; line-height:1.4; font-weight:700; }

/* kahraman kutuları kağıda otursun (sadece bu pencerede) */
.rp-box .rep-hpor{
  background:linear-gradient(180deg, color-mix(in srgb, var(--rp-kagit-alt) 70%, #6b4a22), #4a3418) !important;
  border-color:color-mix(in srgb, var(--rp-murekkep) 55%, transparent) !important;
  box-shadow:0 2px 4px rgba(70,44,14,.35);
}

/* ── kahraman isimleri kaldırıldı ── */
.rep-hname{ display:none !important; }
.rep-hchip{ width:auto !important; gap:0 !important; }

/* ── KAHRAMANLAR: alt alta ── */
.rp-cols-hero{ display:flex; gap:12px; }
.rp-cols-hero .rp-col{ flex:1 1 0; min-width:0; }
.rp-cols-hero .rp-chips{
  flex-direction:column !important; gap:7px !important;
}
/* saldıran sola, savunan sağa — kenara yapışık */
.rp-cols-hero .rp-col:first-child .rp-chips{ align-items:flex-start !important; padding-left:0; }
.rp-cols-hero .rp-col:last-child  .rp-chips{ align-items:flex-end   !important; padding-right:0; }
.rp-cols-troop .rp-col:first-child .rp-chips{ justify-content:flex-start !important; padding-left:0; }
.rp-cols-troop .rp-col:last-child  .rp-chips{ justify-content:flex-end   !important; padding-right:0; }

/* ── BİRLİKLER: yan yana, 3'e 3 sığsın ── */
.rp-cols-troop .rp-chips{ gap:8px !important; }
/* kenarlara doğru taşır — panel iç boşluğunu kısmen yok sayar */
.rp-cols-hero, .rp-cols-troop{ margin-left:-9px; margin-right:-9px; }
  `;
  document.head.appendChild(s);

  function measureDock() {
    const d = document.querySelector(".nav-dock");
    if (d) document.documentElement.style.setProperty("--tp-dock-h", d.offsetHeight + "px");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", measureDock);
  else measureDock();
  window.addEventListener("resize", measureDock);
  window.addEventListener("orientationchange", () => setTimeout(measureDock, 200));

  /* Panel her açıldığında yeniden ölç. Ölçüm ilk açılışta yapılırsa ve o an
     alt şerit henüz çizilmemişse panel yanlış boyutta kalıyordu — bu yüzden
     iki hesapta farklı görünüyordu. */
  document.addEventListener("click", (e) => {
    if (e.target && e.target.closest && e.target.closest("[data-panel='troops']")) {
      setTimeout(measureDock, 60);
      setTimeout(measureDock, 320);
    }
  }, true);

  /* ═══ CANLI AYAR PANELİ — adres sonuna ?ayar=1 ekleyince açılır ═══ */
  if (/[?&]ayar=1/.test(location.search)) {
    const P = ["k", "a", "r", "hx"];                 /* şövalye, asker, robot, rapor kahramanı */
    const AD = ["Şövalye", "Asker", "Robot", "Rapor kah."];
    const VARSAYILAN = {
      box: 44,
      k: { h: 126, b: -55, x: 0,  pw: 150, pl: -26, pt: -29 },
      a: { h: 116, b: -36, x: -5, pw: 130, pl: -21, pt: -16 },
      r: { h: 116, b: -44, x: -4, pw: 140, pl: -18, pt: -10 },
      hx:{ h: 52,  b: 0,   x: 0,  pw: 100, pl: 0,   pt: 0 }
    };
    const HERO_IDS  = ["buz_savascisi", "celik_savasci", "ates_buyucusu", "ivanovna", "revolia"];
    const HERO_ADI  = ["Halvorsen", "Stellin", "Mikian", "İvanovna", "Revolia"];
    const S = JSON.parse(JSON.stringify(VARSAYILAN));
    /* her kahramanın kendi rapor kutusu ayarı */
    const HERO_VARS = {
      buz_savascisi: { h: 50, pw: 187, pl: -44, pt: -11 },
      celik_savasci: { h: 50, pw: 167, pl: -33, pt: -38 },
      ates_buyucusu: { h: 50, pw: 222, pl: -69, pt: -22 },
      ivanovna:      { h: 50, pw: 227, pl: -62, pt: -13 },
      revolia:       { h: 50, pw: 277, pl: -83, pt: -40 }
    };
    S.hero = JSON.parse(JSON.stringify(HERO_VARS));
    let cur = 0;
    let curHero = 0;

    const kok = document.documentElement;
    function uygula() {
      kok.style.setProperty("--tp-box", S.box + "px");
      /* rapor kahramanı ayrı değişken kümesi kullanır */
      HERO_IDS.forEach(id => {
        const c = S.hero[id];
        kok.style.setProperty(`--rh-${id}-box`, c.h + "px");
        kok.style.setProperty(`--rh-${id}-w`,   c.pw + "%");
        kok.style.setProperty(`--rh-${id}-l`,   c.pl + "%");
        kok.style.setProperty(`--rh-${id}-t`,   c.pt + "%");
      });

      ["k", "a", "r"].forEach(p => {
        const c = S[p];
        kok.style.setProperty(`--tp-${p}-h`, c.h + "%");
        kok.style.setProperty(`--tp-${p}-b`, c.b + "px");
        kok.style.setProperty(`--tp-${p}-x`, c.x + "px");
        kok.style.setProperty(`--tp-${p}p-w`, c.pw + "%");
        kok.style.setProperty(`--tp-${p}p-l`, c.pl + "%");
        kok.style.setProperty(`--tp-${p}p-t`, c.pt + "%");
      });
      yaz();
    }
    function yaz() {
      let t = "portre kutusu: " + S.box + "px\n";
      ["k", "a", "r"].forEach((p, i) => {
        const c = S[p];
        t += `\n${AD[i]}\n  büyük: ${c.h}% | ${c.b}px | ${c.x}px\n  portre: ${c.pw}% | ${c.pl}% | ${c.pt}%\n`;
      });
      t += "\nRAPOR KAHRAMAN KUTULARI\n";
      HERO_IDS.forEach((id, i) => {
        const c = S.hero[id];
        t += `  ${HERO_ADI[i]}: kutu ${c.h}px | yakın ${c.pw}% | yatay ${c.pl}% | dikey ${c.pt}%\n`;
      });
      const o = document.getElementById("ttOut");
      if (o) o.value = t;
    }

    const ALAN = [
      ["h",  "Boyut",       30, 260, "%"],
      ["b",  "Dikey ↑↓",  -260, 260, "px"],
      ["x",  "Yatay ←→",  -200, 200, "px"],
      ["pw", "P. yakın",    60, 500, "%"],
      ["pl", "P. yatay",  -300, 150, "%"],
      ["pt", "P. dikey",  -300, 150, "%"]
    ];

    const box = document.createElement("div");
    box.id = "tpTuner";
    box.innerHTML =
      `<div class="tt-head"><b>⚙ Birlik ayarı</b>
         <button id="ttCopy">📋 Kopyala</button>
         <button id="ttReset">Sıfırla</button>
         <button id="ttPos">↕</button>
         <button id="ttMin">▼</button>
       </div>
       <div class="tt-tabs" id="ttUnitTabs">${AD.map((a, i) => `<button data-u="${i}"${i === 0 ? ' class="on"' : ""}>${a}</button>`).join("")}</div>
       <div class="tt-row"><label>Kutu</label><input type="range" id="ttBox" min="34" max="90" step="1"><span id="ttBoxV"></span></div>
       <div class="tt-tabs tt-sub" id="ttHeroTabs" style="display:none;flex-wrap:wrap"></div>
       <div id="ttFields"></div>
       <textarea id="ttOut" readonly></textarea>`;
    document.body.appendChild(box);

    const alanlar = document.getElementById("ttFields");
    alanlar.innerHTML = ALAN.map(([k, ad, mn, mx, br]) =>
      `<div class="tt-row"><label>${ad}</label>
         <input type="range" data-k="${k}" min="${mn}" max="${mx}" step="1">
         <span data-v="${k}"></span></div>`).join("");

    const heroTabs = document.getElementById("ttHeroTabs");
    heroTabs.innerHTML = HERO_ADI.map((a, i) =>
      `<button data-h="${i}"${i === 0 ? ' class="on"' : ""} style="flex:1 1 30%">${a}</button>`).join("");
    heroTabs.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => { curHero = parseInt(b.dataset.h, 10); sync(); });
    });

    function aktifKume() {
      return (P[cur] === "hx") ? S.hero[HERO_IDS[curHero]] : S[P[cur]];
    }

    function sync() {
      const c = aktifKume();
      ALAN.forEach(([k, , , , br]) => {
        const inp = alanlar.querySelector(`[data-k="${k}"]`);
        const sp  = alanlar.querySelector(`[data-v="${k}"]`);
        if (!inp || !sp) return;
        const deger = (typeof c[k] === "number") ? c[k] : 0;
        inp.value = deger; sp.textContent = deger + br;
      });
      document.getElementById("ttBox").value = S.box;
      document.getElementById("ttBoxV").textContent = S.box + "px";
      document.getElementById("ttUnitTabs").querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === cur));
      /* rapor kahramanında sadece kutu + portre ayarları anlamlı */
      const raporMu = (P[cur] === "hx");
      heroTabs.style.display = raporMu ? "flex" : "none";
      heroTabs.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === curHero));
      ["b", "x"].forEach(k => {
        const r = alanlar.querySelector(`[data-k="${k}"]`);
        if (r && r.parentElement) r.parentElement.style.display = raporMu ? "none" : "";
      });
      const hRow = alanlar.querySelector('[data-k="h"]');
      if (hRow && hRow.parentElement) {
        hRow.parentElement.querySelector("label").textContent = raporMu ? "Kutu (px)" : "Boyut";
      }
      uygula();
    }

    alanlar.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", () => {
        const k = inp.dataset.k;
        aktifKume()[k] = parseInt(inp.value, 10);
        const br = (ALAN.find(a => a[0] === k) || [])[4] || "";
        alanlar.querySelector(`[data-v="${k}"]`).textContent = inp.value + br;
        uygula();
      });
    });
    document.getElementById("ttBox").addEventListener("input", e => {
      S.box = parseInt(e.target.value, 10);
      document.getElementById("ttBoxV").textContent = S.box + "px";
      uygula();
    });
    document.getElementById("ttUnitTabs").querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => { cur = parseInt(b.dataset.u, 10) || 0; sync(); });
    });
    document.getElementById("ttPos").addEventListener("click", () => {
      box.classList.toggle("top");
    });
    document.getElementById("ttMin").addEventListener("click", e => {
      box.classList.toggle("min");
      e.target.textContent = box.classList.contains("min") ? "▲" : "▼";
    });
    document.getElementById("ttReset").addEventListener("click", () => {
      Object.assign(S, JSON.parse(JSON.stringify(VARSAYILAN)));
      S.hero = JSON.parse(JSON.stringify(HERO_VARS));
      sync();
    });
    document.getElementById("ttCopy").addEventListener("click", async e => {
      const ta = document.getElementById("ttOut");
      try { await navigator.clipboard.writeText(ta.value); }
      catch (_) { ta.removeAttribute("readonly"); ta.select(); document.execCommand("copy"); ta.setAttribute("readonly", ""); }
      const o = e.target.textContent; e.target.textContent = "✔"; setTimeout(() => e.target.textContent = o, 1200);
    });

    sync();
  }

})();

/* ── DIŞA AÇ: GÜNLÜKTEKİ "Aç" DÜĞMESİ BUNA BAĞLI ──────────────
   Bu dosyanın tamamı bir IIFE içinde; buradaki fonksiyonlar
   window'a KENDİLİĞİNDEN çıkmaz. Bu satır olmayınca
   index.html'deki openLogReportModal ilk şartında dönüyor ve
   "📜 Aç" düğmesi HİÇBİR ŞEY yapmadan ölüyordu (OKU-BENİ Tuzak 29).
   Uyarı showToast ile veriliyor, o da bu cihazda görünmediği için
   hata tamamen sessiz kalıyordu. SİLME. */
window.openReportModal = openReportModal;

console.log("[tema.js] Görünüm dosyası yüklendi ✔");
})();


/* ═══════════════════════════════════════════════════════════════
   12) KOYU MAVİ TEMA  —  "tp-row" rengi tüm oyuna
   ---------------------------------------------------------------
   Oyunun eski açık mavisi (#1fa3ea → #0e6fc0) yerine, birlik
   kartındaki (.tp-row) koyu mavi gradyan kullanılır:

        #3d7ccc  →  #22488f  →  #152e5e

   Bu blok DOSYANIN EN SONUNDA durmalı. Hiçbir eski satırı silmez;
   sadece üstüne yazar. Eski görünüme dönmek için bu bloğu sil.

   Kapsam: panel gövdeleri (mağaza, çanta, sandık, hastane, sıralama,
   savaş günlüğü, rapor, kale kutucuğu, kahraman seçici, birlik
   paneli), üst HUD rozetleri, alt menü çubuğu, füze onay paneli
   ve bildirim baloncuğu.

   ── AYAR ──
   Tek bir renk değiştirmek istersen aşağıdaki :root değişkenlerini
   düzenle; tüm blok onlardan besleniyor.
   ═══════════════════════════════════════════════════════════════ */
(function koyuMaviTema() {
"use strict";

const st = document.createElement("style");
st.id = "temaKoyuMavi";
st.textContent = `
:root{
  --km-1:#3d7ccc;          /* gradyanın üstü   */
  --km-2:#22488f;          /* ortası           */
  --km-3:#152e5e;          /* altı             */
  --km-dip:#0b1c3a;        /* 3B kalınlık / dip gölgesi */
  --km-parlak:rgba(150,205,255,.55);  /* üst iç parlama */
  --km-kenar:rgba(160,215,255,.60);   /* çerçeve        */
  --km-yazi:#eaf4ff;       /* koyu zeminde okunan yazı */
}

/* ── PANEL GÖVDESİ ────────────────────────────────────────────
   Üstte hafif bir ışık, altta derinlik, arada üç duraklı gradyan.
   Birlik kartıyla aynı ailede ama panel büyük olduğu için ışık
   biraz daha yayvan. */
.overlay-card,
#panel-shop .overlay-card,
#panel-inventory .overlay-card,
#panel-rank .overlay-card,
#panel-chest .overlay-card,
#panel-battlelog .overlay-card,
#panel-hospital .overlay-card,
.battle-arena,
.backup-modal,
.pvp-pop,
.daily-reward-banner,
.hpk-modal,
#welcomeBack .wc-box,
#logReportModal .lrm-box,
#panel-troops .uv-viewer,
.tp-screen{
  background:
    radial-gradient(ellipse 115% 55% at 50% -6%, rgba(130,200,255,.30), transparent 68%),
    radial-gradient(ellipse 90% 45% at 50% 106%, rgba(3,10,26,.55), transparent 74%),
    linear-gradient(180deg, var(--km-1) 0%, var(--km-2) 52%, var(--km-3) 100%) !important;
  border-color:var(--km-kenar) !important;
  box-shadow:
    0 0 26px rgba(20,60,120,.5),
    inset 0 3px 0 var(--km-parlak),
    inset 0 -14px 26px rgba(0,10,30,.45) !important;
}

/* Kahraman ekranı zeminsizdi, öyle kalsın (yukarıdaki kural onu da
   yakalıyordu, burada geri alıyoruz). */
#panel-hero .overlay-card{
  background:none !important; border:none !important; box-shadow:none !important;
}

/* Birlikler sekmesinin zemini panelin içinde duruyor; çerçeve ve
   dış gölge istemiyor. */
.tp-screen{
  border:0 !important;
  box-shadow:inset 0 -14px 26px rgba(0,10,30,.4) !important;
}

/* ── ARKA PLAN KARARTISI KALDIRILDI ──────────────────────────
   Panel açıkken haritanın üstüne serilen koyu perde
   (rgba(5,4,10,.72)) kalktı; harita net görünüyor.
   Geri istersen bu kuralı sil. */
.overlay-panel{ background:transparent !important; }

/* ── ORTALANMIŞ PANELLER ─────────────────────────────────────
   Hastane, sandık, mağaza ve çanta artık birlik paneli
   (#panel-troops) ile aynı yerleşimde. Eskiden ekranın altına
   yapışık, sadece üst köşeleri yuvarlak birer çekmeceydiler;
   şimdi ortalanmış, dört köşesi yuvarlak, üstten ve alttan
   boşluklu kartlar.

   Boşluk değerleri birlik paneliyle BİREBİR aynı tutuldu
   (60px üst / 70px alt) — birini değiştirirsen diğerlerini de
   değiştir, yoksa paneller arası geçişte kart zıplar. */
#panel-hospital,
#panel-chest,
#panel-shop,
#panel-inventory{
  align-items:center !important;
  justify-content:center !important;
  padding:60px 12px 70px !important;
}
#panel-hospital .overlay-card,
#panel-chest .overlay-card,
#panel-shop .overlay-card,
#panel-inventory .overlay-card{
  width:100% !important;
  max-width:420px !important;
  max-height:100% !important;
  border-radius:22px !important;
  border-top:3px solid var(--km-kenar) !important;
}

/* ── MAĞAZA: SABİT BOY, TEK KAYDIRMA, SÜRGÜ YOK ──────────────
   Üç sorun birden çözülüyor:

   1) SEKME DEĞİŞİNCE BOY OYNUYORDU. Kart içeriği kadar
      uzuyordu; "Tümü" uzun, "İksir" kısa olduğu için panel her
      sekmede zıplıyordu. Artık kartın boyu SABİT (height:100%),
      içerik az da olsa çok da olsa aynı kalıyor.

   2) İÇ İÇE İKİ KAYDIRMA VARDI. Hem kart hem ürün ızgarası
      ayrı ayrı kayıyordu; ızgara sıkışınca kartlar üst üste
      biniyordu. Artık ızgara serbest (overflow:visible), tek
      kaydırma kartın kendisinde.

   3) YAN SÜRGÜ KALDIRILDI. Parmakla kaydırma zaten çalışıyor,
      görünen çubuk yer kaplıyordu. */
#panel-shop .overlay-card{
  display:block !important;
  height:100% !important;
  max-height:100% !important;
  overflow-y:auto !important;
  scrollbar-width:none !important;
  -ms-overflow-style:none !important;
}
#panel-shop .shop-grid{
  height:auto !important;
  max-height:none !important;
  overflow:visible !important;
  align-content:start !important;
  align-items:start !important;
  /* satırlar içeriği kadar yükseklik alsın — ezilip kartların
     üst üste binmesinin sebebi buydu */
  grid-auto-rows:max-content !important;
  gap:10px !important;
}

/* Kaydırma çubuklarını gizle — dört panelde de parmakla kayıyor */
#panel-shop .overlay-card::-webkit-scrollbar,
#panel-inventory .overlay-card::-webkit-scrollbar,
#panel-hospital .overlay-card::-webkit-scrollbar,
#panel-chest .overlay-card::-webkit-scrollbar,
#panel-shop .shop-grid::-webkit-scrollbar,
.tp-list::-webkit-scrollbar{
  width:0 !important; height:0 !important; display:none !important;
}
#panel-inventory .overlay-card,
#panel-hospital .overlay-card,
#panel-chest .overlay-card,
.tp-list{
  scrollbar-width:none !important;
  -ms-overflow-style:none !important;
}

/* ── ÜST HUD: DÜZ ŞERİT ──────────────────────────────────────
   Eskiden ayrı ayrı hap kutucuklarıydı. Artık alt menü (.nav-dock)
   ile aynı mantıkta tek parça bir çubuk: kutular kalkıyor, içerik
   doğrudan şeridin üstünde duruyor, aralarına ince ayraç giriyor.

   Şerit ARTIK OPAK olduğu için pointer-events:auto verildi —
   yoksa şeridin üstünden haritayı sürükleyebiliyordun. */
.hud-top{
  display:flex !important;
  align-items:center !important;
  justify-content:space-between !important;
  gap:0 !important;
  pointer-events:auto !important;
  padding:calc(3px + env(safe-area-inset-top,0)) 8px 4px !important;
  background:linear-gradient(180deg, var(--km-1) 0%, var(--km-2) 55%, var(--km-3) 100%) !important;
  border-bottom:1px solid var(--km-kenar) !important;
  border-radius:0 0 13px 13px !important;
  box-shadow:0 4px 12px rgba(0,15,40,.42), inset 0 -1px 0 var(--km-parlak) !important;
}

/* kutuları söküyoruz — geriye sadece ikon + yazı kalıyor.
   YAZI BOYUTU VE KALINLIĞI SABİT (14px / 800); şerit yalnızca
   dolgudan daraldı, harflere dokunulmadı. */
.hud-top .hud-pill,
.hud-pill,
.hud-pill.diamond-pill,
.user-pill,
#staminaPill,
#mslHudPill{
  pointer-events:auto !important;
  background:none !important;
  border:none !important;
  box-shadow:none !important;
  border-radius:0 !important;
  padding:1px 8px !important;
  margin:0 !important;
  color:var(--km-yazi) !important;
  font-size:14px !important;
  font-weight:800 !important;
  line-height:1.25 !important;
  text-shadow:0 2px 3px rgba(0,10,30,.75) !important;
}
.hud-pill.diamond-pill .amount,
#staminaPill #staminaText,
.user-pill #currentUserLabel{
  color:var(--km-yazi) !important;
}

/* can rozeti ortada esnemesin, diğerleri gibi içeriği kadar dursun */
#staminaPill.hud-pill-center{
  flex:0 0 auto !important;
  justify-content:center !important;
}

/* ince ayraç — ilk öğe hariç hepsinin soluna */
.hud-top > *:not(:first-child){
  border-left:1px solid rgba(160,215,255,.25) !important;
}

/* uzun kullanıcı adı şeridi taşırmasın */
.hud-pill-right{
  min-width:0 !important;
  overflow:hidden !important;
  text-overflow:ellipsis !important;
  white-space:nowrap !important;
}
.user-pill:hover{ color:#fff !important; }

/* ── CAN ROZETİ ──────────────────────────────────────────────
   ❤️ %100 geri geldi ve şeritteki diğer öğelerle aynı biçimde.
   İçindeki eski çubuk (.stamina-bar-track) tema.js'in başında
   zaten gizli; sadece kalp + yüzde görünüyor. Rozete basınca
   can potu baloncuğu açılmaya devam ediyor. */

/* ── ALT MENÜ (harita dock çubuğu) ───────────────────────────── */
.nav-dock{
  background:linear-gradient(180deg, var(--km-1) 0%, var(--km-2) 45%, var(--km-3) 100%) !important;
  border-top:2px solid var(--km-kenar) !important;
  box-shadow:0 -6px 18px rgba(0,15,40,.5), inset 0 2px 0 var(--km-parlak) !important;
}
.dock-btn{ color:var(--km-yazi) !important; }
.dock-icon{ filter:drop-shadow(0 3px 5px rgba(0,5,20,.7)) !important; }

/* ── FÜZE ONAY PANELİ (missile.js) ───────────────────────────
   Eskiden parlak camgöbeği zemin + siyah yazıydı. Zemin koyulaşınca
   yazı ve butonlar da açığa çevrildi, yoksa okunmuyor. */
.msl-confirm-panel{
  background:
    radial-gradient(ellipse 115% 55% at 50% -6%, rgba(130,200,255,.28), transparent 68%),
    linear-gradient(180deg, var(--km-1) 0%, var(--km-2) 52%, var(--km-3) 100%) !important;
  border:3px solid var(--km-kenar) !important;
  box-shadow:
    0 10px 40px rgba(0,10,30,.55),
    inset 0 3px 0 var(--km-parlak) !important;
}
.msl-confirm-msg{
  color:var(--km-yazi) !important;
  text-shadow:0 2px 4px rgba(0,10,30,.6) !important;
}
.msl-cbtn-ok{
  background:linear-gradient(180deg,#ffd257,#f0932b) !important;
  color:#3a2408 !important;
  box-shadow:0 4px 0 #a8641a, inset 0 1px 0 rgba(255,255,255,.5) !important;
}
.msl-cbtn-ok:active{ box-shadow:0 1px 0 #a8641a !important; }
.msl-cbtn-cancel{
  background:rgba(255,255,255,.16) !important;
  color:var(--km-yazi) !important;
  border:2px solid rgba(160,215,255,.4) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.25) !important;
}

/* ── BİLDİRİM BALONCUĞU (toast) ─────────────────────────────── */
#toast{
  background:linear-gradient(180deg, var(--km-1), var(--km-2) 55%, var(--km-3)) !important;
  border:2px solid var(--km-kenar) !important;
  box-shadow:
    0 10px 30px -8px rgba(0,10,30,.6),
    inset 0 1px 0 var(--km-parlak) !important;
}

/* ── SEKME ÇUBUKLARI ────────────────────────────────────────
   Pasif sekmeler koyu zeminde silikleşiyordu, biraz açıldı.
   Aktif sekme beyaz kalıyor — koyu zeminde kontrastı iyi. */
.tp-tab,
#panel-shop .shop-tab{
  background:linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,.05)) !important;
  border-color:rgba(160,215,255,.45) !important;
  color:#cfe8ff !important;
}
.tp-tab.active,
#panel-shop .shop-tab.active{
  background:linear-gradient(180deg,#ffffff,#cfeefb) !important;
  color:#1a3a75 !important;
}

/* ── KAYDIRMA ÇUBUKLARI ─────────────────────────────────────── */
.tp-list::-webkit-scrollbar-thumb,
#panel-shop .shop-grid::-webkit-scrollbar-thumb{
  background:linear-gradient(180deg,#6fa8e0,#2a5596) !important;
}

/* ── KART İÇİ KARTLAR ───────────────────────────────────────
   Panel koyulaşınca içindeki .tp-row / .shop-card2 / .hpk-card
   kartları zemine karışıyordu; üstlerini bir tık açıyoruz ki
   panelden ayrışsınlar. */
.tp-row,
.shop-card2,
.hpk-card{
  background:linear-gradient(180deg, #4a8bd8 0%, #2a5596 55%, #1a3a70 100%) !important;
}

/* ── MAVİ BUTON AİLESİ ───────────────────────────────────────
   Oyundaki tüm açık mavi butonlar (#4fd8ff → #1fa3ea) burada.
   Koyu panelin üstünde "basılabilir" kalsınlar diye tepe tonu
   panelden bir tık AÇIK, altındaki 3B kalınlık ise koyu.
   Bunlar: hastane "Tedaviyi Onayla", birlik "Üret", kahraman
   "Satın Al", günlük ödül kapat, savaş günlüğü aç, can potu,
   hoş geldin "Devam", giriş ekranı "Giriş Yap". */
#panel-hospital .hospital-confirm-btn,
#panel-troops .unit-train-btn,
#heroDetailOverlay #hdBuyBtn,
.daily-reward-close-btn,
.log-open-btn,
.stamina-potion-popup .spp-btn,
#welcomeBack .wc-next,
#loginScreen .login-btn{
  background:linear-gradient(180deg,#5a9ce0 0%,#3568b4 55%,#22488f 100%) !important;
  border:2px solid rgba(170,220,255,.75) !important;
  color:#ffffff !important;
  text-shadow:0 2px 3px rgba(0,15,40,.65) !important;
  box-shadow:
    0 5px 0 #0f2a55,
    0 8px 18px rgba(0,15,40,.45),
    inset 0 1px 0 rgba(170,220,255,.55) !important;
}
#panel-hospital .hospital-confirm-btn:active,
#panel-troops .unit-train-btn:active,
#heroDetailOverlay #hdBuyBtn:active,
.daily-reward-close-btn:active,
.log-open-btn:active,
.stamina-potion-popup .spp-btn:active,
#welcomeBack .wc-next:active,
#loginScreen .login-btn:active{
  box-shadow:0 1px 0 #0f2a55 !important;
}
/* "Satın Al" ortalanmış duruyor; :active dönüşümünü bozmayalım */
#heroDetailOverlay #hdBuyBtn:active{ box-shadow:0 2px 0 #0f2a55 !important; }

/* ── GİRİŞ EKRANI ────────────────────────────────────────────
   Kutucuklar fotoğrafın üstünde duruyor. Çerçeveyi koyulaştırdık
   ama içini de koyulaştırmak gerekti; yoksa açık çerçeve gidince
   kutular arka plandaki kayaya karışıyordu. */
#loginScreen .field input{
  background:linear-gradient(180deg, rgba(61,124,204,.72), rgba(21,46,94,.80)) !important;
  border:2px solid rgba(130,185,245,.75) !important;
  box-shadow:
    inset 0 2px 0 rgba(160,215,255,.30),
    0 4px 12px rgba(0,10,30,.45) !important;
}
#loginScreen .field input::placeholder{ color:rgba(215,235,255,.75) !important; }
#loginScreen .field input:focus{
  background:linear-gradient(180deg, rgba(74,139,216,.82), rgba(26,58,112,.86)) !important;
  border-color:#8fc4ff !important;
  box-shadow:0 0 0 3px rgba(90,156,224,.40),
             inset 0 2px 0 rgba(160,215,255,.35) !important;
}
/* "Kayıt ol" bağlantısı eski camgöbeğiydi, aileye alındı */
#loginScreen .login-switch a{ color:#9fd0ff !important; }

/* ── KAHRAMAN KARTI: KAPAT BUTONU + OKLAR ────────────────────
   Kapat butonu gri yuvarlaktı; panellerdeki kırmızı kare X ile
   aynı yapıldı. Oklar kaldırıldı, yerine parmakla kaydırma
   geldi (aşağıdaki kahramanKaydir bloğu).

   Butonun kendi stili HTML'in içine gömülü (inline style), o
   yüzden buradaki her satır !important olmak zorunda. */
#heroDetailOverlay #hdClose{
  top:12px !important; right:12px !important;
  width:38px !important; height:38px !important;
  padding:0 !important;
  border-radius:10px !important;
  background:linear-gradient(180deg,#f03434,#c00d0d) !important;
  border:2px solid rgba(255,220,220,.9) !important;
  box-shadow:0 4px 10px rgba(120,0,0,.4) !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  font-size:0 !important;
  line-height:0 !important;
  color:#fff !important;
}
#heroDetailOverlay #hdClose::after{
  content:"✕";
  font-size:22px; font-weight:900; color:#fff; line-height:1;
  -webkit-text-stroke:1px #fff;
}
#heroDetailOverlay #hdClose:active{ transform:scale(.92) !important; }

/* Oklar gizlendi — silinmediler, çünkü kaydırma onların
   tıklamasını tetikliyor (geçiş mantığı tek yerde kalsın). */
#heroDetailOverlay #hdPrev,
#heroDetailOverlay #hdNext{ display:none !important; }
`;

function ekle() {
  /* magaza.js, missile.js ve rehber.js kendi stillerini tema.js'ten
     SONRA ekliyor. Kurallar zaten !important, ama etiketi en sona
     tekrar taşımak garanti olsun diye. */
  document.head.appendChild(st);
}
ekle();
window.addEventListener("load", ekle);
setTimeout(ekle, 1500);

console.log("[tema.js] Koyu mavi tema uygulandı ✔");
})();


/* ═══════════════════════════════════════════════════════════════
   13) KAHRAMAN KARTINDA PARMAKLA GEÇİŞ
   ---------------------------------------------------------------
   Sağ/sol okları yerine kaydırma. Sola kaydır → sonraki kahraman,
   sağa kaydır → önceki.

   EŞİK = görselin yarısı. Kahraman görseli kartın ortasında durur;
   parmağını görselin ortasına kadar götürünce geçiş olur. Görsel
   bulunamazsa kartın yarısına düşülür.

   Geçişi kendim yapmıyorum: gizlenmiş #hdPrev / #hdNext
   butonlarının click'ini tetikliyorum. Böylece heroes.js'teki açma
   mantığı tek yerde kalıyor; ileride orası değişirse burası
   kendiliğinden uyar.

   ── AYAR ──
   DIKEY_PAY : yatay hareket, dikeyin kaç katı olmalı (yukarı/aşağı
               kaydırırken kahraman değişmesin diye)
   ═══════════════════════════════════════════════════════════════ */
(function kahramanKaydir() {
"use strict";

const DIKEY_PAY = 1.4;

let x0 = 0, y0 = 0, izliyor = false;

function kart() {
  const o = document.getElementById("heroDetailOverlay");
  if (!o) return null;
  /* DİKKAT: burada offsetParent KULLANMA. Kart position:fixed olduğu
     için offsetParent her zaman null döner ve kontrol hep başarısız
     olur (ilk sürümdeki hata buydu, kaydırma hiç çalışmıyordu). */
  if (o.offsetWidth === 0) return null;
  if (getComputedStyle(o).display === "none") return null;
  return o;
}

/* Görselin yarı genişliği. Karttaki görselleri gezip object-fit'i
   "contain" olanı buluyoruz — arka plan görseli "cover" olduğu için
   elenir.
   DİKKAT: style ATTRIBUTE'una göre seçme (img[style*="..."]) burada
   çalışmaz; stil cssText ile atandığı için tarayıcı onu boşluklu
   biçimde ("object-fit: contain") saklıyor ve eşleşme tutmuyordu. */
function esik(o) {
  let g = 0;
  o.querySelectorAll("img").forEach(im => {
    if (getComputedStyle(im).objectFit !== "contain") return;
    const w = im.getBoundingClientRect().width;
    if (w > g) g = w;
  });
  return (g > 40 ? g : o.clientWidth) / 2;
}

document.addEventListener("touchstart", e => {
  izliyor = false;
  if (e.touches.length !== 1) return;
  const o = kart();
  if (!o || !o.contains(e.target)) return;
  x0 = e.touches[0].clientX;
  y0 = e.touches[0].clientY;
  izliyor = true;
}, { passive: true });

document.addEventListener("touchend", e => {
  if (!izliyor) return;
  izliyor = false;

  const o = kart();
  if (!o) return;

  const t = e.changedTouches[0];
  const dx = t.clientX - x0;
  const dy = t.clientY - y0;
  if (Math.abs(dx) < esik(o)) return;
  if (Math.abs(dx) < Math.abs(dy) * DIKEY_PAY) return;

  const btn = o.querySelector(dx < 0 ? "#hdNext" : "#hdPrev");
  if (!btn) return;

  /* Kısa bir sönme, geçiş sert olmasın. openHeroDetail kartın
     style'ını baştan yazdığı için opacity kendiliğinden geri gelir. */
  o.style.transition = "opacity .12s ease";
  o.style.opacity = "0";
  setTimeout(() => btn.click(), 120);
}, { passive: true });

document.addEventListener("touchcancel", () => { izliyor = false; }, { passive: true });

console.log("[tema.js] Kahraman kartı kaydırma açık ✔");
})();


/* ═══════════════════════════════════════════════════════════════
   13) SALDIRI PANELİ HİZASI  —  diğer panellerle aynı dikdörtgen
   ---------------------------------------------------------------
   Savaş paneli (#battleArena) ekranın altına yapışıktı; mağaza,
   çanta, kahraman ve birlik panelleriyle aynı yerleşime alındı:

        üstten 60px · alttan 70px · yanlardan 12px
        en fazla 420px · köşe 22px

   Ölçüyü değiştirirsen 12. bloktaki "ORTALANMIŞ PANELLER"
   değerlerini de aynı yap, yoksa paneller arası geçişte zıplar.
   Bu blok DOSYANIN EN SONUNDA durmalı.
   ═══════════════════════════════════════════════════════════════ */
(function saldiriPaneliHizasi() {
"use strict";

const st = document.createElement("style");
st.id = "temaSaldiriHiza";
st.textContent = `
#battleArena{
  align-items:center !important;
  justify-content:center !important;
  padding:60px 12px 70px !important;
}
#battleArena .battle-arena{
  width:100% !important;
  max-width:420px !important;
  max-height:100% !important;
  border-radius:22px !important;
  padding:20px 14px 16px !important;
  overflow-y:auto !important;
  scrollbar-width:none !important;
}
#battleArena .battle-arena::-webkit-scrollbar{ width:0 !important; display:none !important; }

/* ── ARKA PLAN KARARTISI KALDIRILDI ── */
.battle-arena-overlay{ background:transparent !important; }

/* ── PANEL İÇİNDEKİ İKİNCİ KUTU KALDIRILDI ───────────────────
   Çerçeve gitmişti ama tema.js'in üst bloğundaki İÇ GÖLGE
   (box-shadow: inset ...) dikdörtgeni çizmeye devam ediyordu;
   asıl "kutu görüntüsü" oydu. Zemin + çerçeve + gölge hepsi kapalı. */
#battleArena .troop-select-box,
#battleArena .power-compare-box,
#battleArena #enemyPowerPreview,
#battleArena #troopSelectList,
#battleArena #heroPicker{
  background:none !important; background-image:none !important;
  border:0 !important; outline:0 !important;
  box-shadow:none !important;
  border-radius:0 !important; padding:0 !important;
  max-width:none !important; margin:0 !important;
}
#battleArena .battle-arena{ gap:10px !important; }

/* ── KAPAT (X): panelin sağ üst köşesine, çapraz taşkın ────────
   Panelin kendisi artık kaydırmıyor (yoksa X kırpılıyordu);
   kaydırma birlik listesine devredildi. */
#battleArena .battle-arena{ overflow:visible !important; }
#battleArena .troop-select-box{
  flex:1 1 auto !important; min-height:0 !important;
  width:100% !important; overflow-y:auto !important;
  scrollbar-width:none !important;
}
#battleArena .troop-select-box::-webkit-scrollbar{ width:0 !important; display:none !important; }
#battleArena #mapBackBtn{
  top:-15px !important; right:-13px !important;
  border-radius:12px !important;
  box-shadow:0 4px 12px rgba(120,0,0,.5) !important;
}

/* ── SALDIR: kutu daraldı, yazı büyük harf ── */
#battleArena .battle-btn{
  padding:11px 16px !important;
  min-width:0 !important; width:auto !important;
  text-transform:uppercase !important;
  letter-spacing:.6px !important;
  font-weight:800 !important;
  -webkit-text-stroke:.75px #fff !important;   /* Baloo 2'de 800 üstü yok; kalınlık kontur ile */
  text-shadow:0 2px 3px rgba(90,0,0,.55) !important;
}
#battleArena .troop-select-title{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:13px !important;
  color:#ffd257 !important; margin-bottom:8px !important;
}

/* ── BİRLİK SATIRI ───────────────────────────────────────────
   Düzen: solda KAFA kutucuğu (satırın tamamı kadar), sağda üstte
   ad + sayı, altta − sürgü + . Böylece satır alçalıyor, panel
   gereksiz uzamıyor.

   Kırpma oranları birlik eğitim ekranındakiyle aynı
   (tema.js 11. blok: --tp-kp-w / -l / -t). Birini değiştirirsen
   diğerini de değiştir ki iki ekran aynı görünsün. */
#troopSelectList .troop-select-row{
  display:flex !important; flex-direction:row !important;
  align-items:center !important; gap:10px !important;
  margin-bottom:10px !important;
}
#troopSelectList .t-right{ flex:1 1 auto !important; min-width:0 !important; }
#troopSelectList .troop-select-top{
  display:flex !important; align-items:center !important;
  gap:8px !important; margin-bottom:4px !important;
}
#troopSelectList .t-icon{
  position:relative; flex:0 0 46px !important;
  width:46px !important; height:46px !important;
  border-radius:12px !important; overflow:hidden !important;
  background:linear-gradient(180deg, rgba(150,205,255,.20), rgba(8,30,62,.55)) !important;
  border:2px solid rgba(160,215,255,.45) !important;
  box-shadow:inset 0 2px 0 rgba(255,255,255,.25), 0 3px 6px rgba(0,10,30,.45) !important;
}
#troopSelectList .t-icon img.t-head{
  display:block; position:absolute; top:0; left:0;
  width:150%; margin:-29% 0 0 -26%;
}
#troopSelectList .t-icon[data-unit="soldier"] img.t-head{ width:130%; margin:-16% 0 0 -21%; }
#troopSelectList .t-icon[data-unit="robot"]   img.t-head{ width:140%; margin:-10% 0 0 -18%; }
#troopSelectList .t-name{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:13.5px !important; letter-spacing:.3px !important;
}
#troopSelectList .t-count{
  margin-left:auto !important;
  display:flex !important; align-items:center !important; gap:3px !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:13.5px !important; color:#ffd257 !important;
}
/* elle sayı girilen kutucuk — rakamı alacak kadar, fazlası değil */
#troopSelectList .t-num{
  box-sizing:content-box !important;
  width:1ch; height:18px; padding:0 2px; text-align:center;
  border-radius:6px; outline:none;
  background:rgba(6,20,44,.6) !important;
  border:1.5px solid rgba(160,215,255,.45) !important;
  color:#fff !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:13px !important;
  -webkit-appearance:none; appearance:none;
  -webkit-tap-highlight-color:transparent;
}
#troopSelectList .t-num:focus{
  border-color:#8fc4ff !important;
  box-shadow:0 0 0 3px rgba(90,156,224,.35) !important;
}
#troopSelectList .t-max{ color:#ffd257 !important; white-space:nowrap; }

/* ── SÜRGÜNÜN İKİ YANINDA − / + ─────────────────────────────── */
#troopSelectList .t-slider-row{
  display:flex !important; align-items:center !important; gap:8px !important;
}
#troopSelectList .t-slider-row .troop-slider{ flex:1 1 auto !important; min-width:0 !important; margin:0 !important; }
#troopSelectList .t-step{
  flex:0 0 auto; width:28px; height:28px; border-radius:8px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  background:linear-gradient(180deg,#5a9ce0 0%,#3568b4 55%,#22488f 100%);
  border:2px solid rgba(170,220,255,.75);
  color:#fff; font-family:'Baloo 2','Nunito',sans-serif;
  font-weight:800; font-size:17px; line-height:1;
  text-shadow:0 2px 3px rgba(0,15,40,.65);
  box-shadow:0 3px 0 #0f2a55, inset 0 1px 0 rgba(170,220,255,.55);
  -webkit-tap-highlight-color:transparent; touch-action:none; user-select:none;
}
#troopSelectList .t-step:active{ transform:translateY(2px); box-shadow:0 1px 0 #0f2a55; }

/* ── SAVAŞ GÜNLÜĞÜ + GÜÇ SIRALAMASI HİZASI ──────────────────
   12. bloktaki "ORTALANMIŞ PANELLER" listesine bu ikisi
   girmemişti; alta yapışık duruyorlardı. Ölçüler birebir aynı. */
#panel-battlelog,
#panel-rank{
  align-items:center !important;
  justify-content:center !important;
  padding:60px 12px 70px !important;
}
#panel-battlelog .overlay-card,
#panel-rank .overlay-card{
  width:100% !important;
  max-width:420px !important;
  height:100% !important;
  max-height:100% !important;
  border-radius:22px !important;
  border-top:3px solid var(--km-kenar) !important;
  overflow-y:auto !important;
  scrollbar-width:none !important;
}
#panel-battlelog .overlay-card::-webkit-scrollbar,
#panel-rank .overlay-card::-webkit-scrollbar{ width:0 !important; display:none !important; }

/* ── KAHRAMAN ÇIKARMA: kare ✕ yerine yuvarlak − , köşeye taşkın ──
   Yuva overflow:hidden'dı, düğme kırpılıyordu; portrenin kendisine
   köşe yarıçapı verilip yuva serbest bırakıldı. */
#heroPicker, #heroPicker .hpk-slots, #heroPicker .hpk-slot{ overflow:visible !important; }
/* düğme dışarı taştığı için satırın çevresinde pay bırakılıyor;
   yoksa panelin kaydırma alanı düğmeyi kesiyor */
#heroPicker .hpk-slots{ padding:11px 11px 4px !important; box-sizing:border-box !important; }
#heroPicker .hpk-slot .hpk-portrait{ border-radius:12px !important; }
#heroPicker .hpk-x{
  top:-9px !important; right:-9px !important;
  width:28px !important; height:28px !important;
  border-radius:50% !important;
  border:2px solid rgba(255,225,225,.92) !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  font-size:0 !important; line-height:0 !important;
  box-shadow:0 3px 7px rgba(120,0,0,.5) !important;
}
#heroPicker .hpk-x::before{
  content:"\u2212";
  font-family:'Baloo 2','Nunito',sans-serif;
  font-size:22px; font-weight:800; line-height:1; color:#fff;
  text-shadow:0 1px 2px rgba(90,0,0,.6);
}
`;
document.head.appendChild(st);

console.log("[tema.js] Saldırı paneli hizası uygulandı ✔");
})();


/* ═══════════════════════════════════════════════════════════════
   14) EĞİTİM KUTUSU — sade hâli
   Üstte kuyruğun toplam süresi, altta adet. Yazı beyaz, kutu ince.
   ═══════════════════════════════════════════════════════════════ */
(function egitimKutusu() {
"use strict";
const st = document.createElement("style");
st.id = "temaEgitimKutusu";
st.textContent = `
#panel-troops .utb-training{
  padding:4px 8px !important;
  gap:0 !important;
  border-width:2px !important;
  border-color:rgba(190,240,255,.30) !important;
  color:#fff !important;
  line-height:1.15 !important;
}
#panel-troops .unit-train-timer{
  font-size:14.5px !important; font-weight:800 !important;
  color:#fff !important; opacity:1 !important;
  text-shadow:0 2px 3px rgba(0,20,45,.6) !important;
  white-space:nowrap !important;
}
#panel-troops .unit-train-count{
  font-size:12.5px !important; font-weight:800 !important;
  color:#fff !important; opacity:.9 !important;
  text-shadow:0 1px 2px rgba(0,20,45,.6) !important;
}
#panel-troops .unit-speedup-btn{ padding:7px 11px !important; }
`;
document.head.appendChild(st);
})();


/* ═══════════════════════════════════════════════════════════════
   15) ÜST MENÜ — TEK GÖVDE, SABİT BOY
   ---------------------------------------------------------------
   Kaynak kutusu DOM'da üst menünün içine alınır; menü iki satıra
   sarar ama TEK gövde görünür: tek zemin, tek çerçeve, çizgi yok.

   ── NEDEN HER SEÇİCİ `html body` İLE BAŞLIYOR ──
   Bu dosyanın üst bölümleri de `.hud-top{ ... !important }` yazıyor.
   İki kural da !important olunca kazananı SIRALAMA belirler ve o
   bölümler bazı durumlarda buradan SONRA ekleniyor — ilk denemede
   yazı boyu ile genişliğin çalışıp dolgu, yükseklik ve kalınlık
   ayarlarının çalışmamasının sebebi tam olarak buydu. `html body`
   öneki seçici ağırlığını yükseltir; sıralama ne olursa olsun
   buradaki kural kazanır. Ölçü değişkenlerinin işlemesi buna
   bağlıdır, kaldırma.

   ── BOY SABİT ──
   Menünün yüksekliği yazıya göre BÜYÜMEZ; `--hud-h` ne diyorsa odur,
   içerik dikeyde ortalanır. Harflerin altındaki ölü boşluğu da
   `--hud-lh` (satır yüksekliği) keser.

   index.html'e dokunulmaz; bu dosya silinirse eski hâl geri gelir.
   ═══════════════════════════════════════════════════════════════ */
(function ustMenuTekGovde() {
"use strict";

const st = document.createElement("style");
st.id = "temaUstMenuTekGovde";
st.textContent = `
html body .hud-top{
  box-sizing:border-box !important;
  display:flex !important;
  flex-wrap:wrap !important;
  align-content:center !important;
  align-items:center !important;
  row-gap:var(--hud-gap, -2px) !important;
  height:calc(var(--hud-h, 48px) + env(safe-area-inset-top,0)) !important;
  min-height:0 !important;
  padding:calc(env(safe-area-inset-top,0) + var(--hud-pt, 10px))
          var(--hud-px, 1.5px)
          var(--hud-pb, 10.5px) !important;
  width:var(--hud-w, 100%) !important;
  margin:0 auto !important;
  background:linear-gradient(180deg,
      var(--km-1) 0%, var(--km-2) 48%, var(--km-3) 100%) !important;
  border-radius:0 0 var(--hud-r, 12.5px) var(--hud-r, 12.5px) !important;
  overflow:hidden !important;
  pointer-events:auto !important;
}

/* Kaynak satırı: rozet değil, satır. Ayraç ve kendi zemini yok. */
html body .hud-top > .hud-kaynak{
  flex:0 0 100% !important;
  order:9 !important;
  position:static !important;
  transform:none !important;
  display:flex !important;
  justify-content:space-around !important;
  align-items:center !important;
  gap:0 !important;
  margin:0 !important;
  padding:0 !important;
  background:none !important;
  border:none !important;
  border-radius:0 !important;
  box-shadow:none !important;
  pointer-events:auto !important;
}
html body .hud-top > .hud-kaynak::before,
html body .hud-top > .hud-kaynak::after{ content:none !important; }

html body .hud-top .kaynak-oge{
  display:flex !important;
  align-items:center !important;
  background:none !important;
  border:none !important;
  border-radius:0 !important;
  margin:0 !important;
  padding:0 var(--hud-ara, 4px) !important;
  flex:1 1 0 !important;
  justify-content:center !important;
  gap:5px !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-size:var(--hud-f2, 14px) !important;
  font-weight:var(--hud-fw, 900) !important;
  line-height:var(--hud-lh, 1.45) !important;
  letter-spacing:.2px !important;
  color:#f2fbff !important;
  text-shadow:0 1px 2px rgba(0,12,32,.85) !important;
}
html body .hud-top .kaynak-ikon{
  font-size:var(--hud-ik, 15px) !important;
  line-height:var(--hud-lh, 1.45) !important;
  filter:drop-shadow(0 1px 1px rgba(0,12,32,.7)) !important;
}

/* Üst satır — aynı değişkenlerden beslenir */
html body .hud-top .hud-pill,
html body .hud-top #mslHudPill,
html body .hud-top #staminaPill{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-size:var(--hud-f1, 15.5px) !important;
  font-weight:var(--hud-fw, 900) !important;
  line-height:var(--hud-lh, 1.45) !important;
  margin:0 !important;
  padding:0 var(--hud-ara, 4px) !important;
  color:#f2fbff !important;
  text-shadow:0 1px 2px rgba(0,12,32,.85) !important;
}
html body .hud-top .hud-pill.diamond-pill .amount,
html body .hud-top #staminaPill #staminaText,
html body .hud-top .user-pill #currentUserLabel{
  font-size:var(--hud-f1, 15.5px) !important;
  font-weight:var(--hud-fw, 900) !important;
  line-height:var(--hud-lh, 1.45) !important;
  color:#f2fbff !important;
}
`;
document.head.appendChild(st);

/* Kutuyu menünün son çocuğu yap; yeniden çizen kod geri koyarsa
   bekçi tekrar taşır (aynıysa hiçbir şey yapmaz). */
function tasi() {
  const ust = document.querySelector(".hud-top");
  const kay = document.getElementById("hudKaynak");
  if (!ust || !kay) return;
  if (kay.parentElement !== ust) ust.appendChild(kay);
}
function baslat() {
  tasi();
  const govde = document.getElementById("worldScreen") || document.body;
  if (govde && window.MutationObserver) {
    new MutationObserver(tasi).observe(govde, { childList: true });
  }
  setTimeout(tasi, 500);
  setTimeout(tasi, 2000);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", baslat);
} else { baslat(); }
})();


/* ═══════════════════════════════════════════════════════════════
   16) ÜST MENÜ İNCE AYAR PANELİ
   ---------------------------------------------------------------
   AÇMAK İÇİN: adresin sonuna  ?menu=1  ekle.

   Her satırda [−] sürgü [+] var: sürgü kaba, düğmeler tek adım
   ilerletir (yazılarda çeyrek piksel), basılı tutunca hızlanır.
   KAYDET dedikten sonra ?menu=1 olmadan da geçerli olur.

   Menü boyu yazıya göre BÜYÜMEZ — "Menü yüksekliği" ne diyorsa
   odur. Harflerin altındaki boşluğu "Satır yüksekliği" keser.
   ═══════════════════════════════════════════════════════════════ */
(function ustMenuAyarPaneli() {
"use strict";

const ANAHTAR = "hudMenuAyar";

/* [değişken, etiket, en az, en çok, adım, birim, varsayılan] */
const ALANLAR = [
  ["--hud-h",  "Menü yüksekliği",   30, 130, 1,    "px", 48],
  ["--hud-f1", "Üst satır yazı",     8,  26, 0.25, "px", 15.5],
  ["--hud-f2", "Kaynak yazı",        8,  26, 0.25, "px", 14],
  ["--hud-ik", "Kaynak ikon",        8,  28, 0.25, "px", 15],
  ["--hud-fw", "Yazı kalınlığı",   400, 900, 100,  "",  900],
  ["--hud-lh", "Satır yüksekliği", 0.7, 1.8, 0.05, "",  1.45],
  ["--hud-gap","Satır arası",       -8,  20, 0.5,  "px", -2],
  ["--hud-pt", "Üst boşluk",         0,  24, 0.5,  "px", 10],
  ["--hud-pb", "Alt boşluk",         0,  24, 0.5,  "px", 10.5],
  ["--hud-px", "Yan boşluk",         0,  28, 0.5,  "px", 1.5],
  ["--hud-ara","Öğe aralığı",        0,  20, 0.5,  "px", 4],
  ["--hud-w",  "Menü genişliği",    55, 100, 0.5,  "%",  100],
  ["--hud-r",  "Köşe yuvarlaklığı",  0,  30, 0.5,  "px", 12.5],
];

function yuvarla(v, adim) {
  return Math.round(Math.round(v / adim) * adim * 100) / 100;
}
function varsayilan() {
  const o = {};
  ALANLAR.forEach(a => { o[a[0]] = a[6]; });
  return o;
}
function oku() {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    if (!ham) return varsayilan();
    return Object.assign(varsayilan(), JSON.parse(ham));
  } catch (e) { return varsayilan(); }
}
function yaz(s) {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(s)); return true; }
  catch (e) { return false; }
}
function uygula(s) {
  const kok = document.documentElement;
  ALANLAR.forEach(a => {
    const v = (s[a[0]] != null) ? s[a[0]] : a[6];
    kok.style.setProperty(a[0], v + a[5]);
  });
}

const S = oku();
uygula(S);

if (!/[?&]menu=1/.test(location.search || "")) return;

function kur() {
  if (document.getElementById("hudAyarPanel")) return;

  const st = document.createElement("style");
  st.textContent = `
#hudAyarPanel{
  position:fixed; left:6px; right:6px; bottom:6px; z-index:99999;
  background:#0e141c; border:2px solid #2f5f7a; border-radius:14px;
  color:#e8f3ff; font-family:'Baloo 2',sans-serif; font-size:13px;
  box-shadow:0 10px 30px rgba(0,0,0,.6); overflow:hidden;
}
#hudAyarPanel .hap-bas{
  display:flex; align-items:center; gap:8px;
  padding:7px 10px; background:#16222e; font-weight:900; font-size:14px;
}
#hudAyarPanel .hap-bas button{ margin-left:auto; min-width:38px; }
#hudAyarPanel button{
  font-family:'Baloo 2',sans-serif; font-weight:900; font-size:13px;
  border:1px solid #37708f; background:#1d3242; color:#e8f3ff;
  border-radius:9px; padding:5px 9px; line-height:1;
}
#hudAyarPanel button:active{ background:#2a4a60; }
#hudAyarPanel .hap-govde{ max-height:44vh; overflow-y:auto; padding:4px 10px 8px; }
#hudAyarPanel.kapali .hap-govde,
#hudAyarPanel.kapali .hap-alt,
#hudAyarPanel.kapali #hapBilgi{ display:none; }
#hudAyarPanel .hap-satir{ margin:6px 0; }
#hudAyarPanel .hap-etiket{
  display:flex; justify-content:space-between; font-weight:900; margin-bottom:1px;
}
#hudAyarPanel .hap-deger{ color:#7fd8ff; }
#hudAyarPanel .hap-kol{ display:flex; align-items:center; gap:7px; }
#hudAyarPanel .hap-kol button{ width:38px; text-align:center; font-size:16px; padding:4px 0; }
#hudAyarPanel input[type=range]{ flex:1; accent-color:#4fb3e8; height:24px; min-width:0; }
#hudAyarPanel .hap-alt{ display:flex; gap:6px; padding:7px 10px; background:#16222e; }
#hudAyarPanel .hap-alt button{ flex:1; }
#hudAyarPanel #hapBilgi{
  background:#12303f; color:#bff0ff; padding:0 10px; text-align:center;
  font-weight:800; font-size:12.5px; line-height:1.6;
}
`;
  document.head.appendChild(st);

  const p = document.createElement("div");
  p.id = "hudAyarPanel";

  let ic = `<div class="hap-bas">🎛️ Üst menü ince ayar
      <button id="hapKapat">–</button></div><div class="hap-govde">`;
  ALANLAR.forEach(a => {
    const v = (S[a[0]] != null) ? S[a[0]] : a[6];
    ic += `<div class="hap-satir">
        <div class="hap-etiket"><span>${a[1]}</span>
          <span class="hap-deger" id="d${a[0]}">${v}${a[5]}</span></div>
        <div class="hap-kol">
          <button data-az="${a[0]}">−</button>
          <input type="range" id="r${a[0]}" min="${a[2]}" max="${a[3]}"
                 step="${a[4]}" value="${v}">
          <button data-cok="${a[0]}">+</button>
        </div>
      </div>`;
  });
  ic += `</div><div id="hapBilgi"></div>
    <div class="hap-alt">
      <button id="hapKaydet">KAYDET</button>
      <button id="hapKopyala">KOPYALA</button>
      <button id="hapSifirla">SIFIRLA</button>
    </div>`;
  p.innerHTML = ic;
  document.body.appendChild(p);

  function bilgi(yazi) {
    const el = document.getElementById("hapBilgi");
    el.textContent = yazi;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ""; }, 3000);
  }

  function ayarla(ad, yeni) {
    const a = ALANLAR.find(x => x[0] === ad);
    const v = Math.min(a[3], Math.max(a[2], yuvarla(yeni, a[4])));
    S[ad] = v;
    document.getElementById("r" + ad).value = v;
    document.getElementById("d" + ad).textContent = v + a[5];
    uygula(S);
  }

  ALANLAR.forEach(a => {
    document.getElementById("r" + a[0]).addEventListener("input", (e) => {
      ayarla(a[0], parseFloat(e.target.value));
    });
  });

  /* +/− : tek dokunuş bir adım, basılı tutunca hızlanır */
  let tekrar = null;
  function bas(ad, yon) {
    const a = ALANLAR.find(x => x[0] === ad);
    const adim = () => ayarla(ad, S[ad] + yon * a[4]);
    adim();
    clearInterval(tekrar);
    const gecikme = setTimeout(() => { tekrar = setInterval(adim, 70); }, 380);
    const birak = () => { clearTimeout(gecikme); clearInterval(tekrar); };
    document.addEventListener("pointerup", birak, { once: true });
    document.addEventListener("pointercancel", birak, { once: true });
  }
  p.addEventListener("pointerdown", (e) => {
    const b = e.target.closest ? e.target.closest("button") : null;
    if (!b) return;
    if (b.dataset.az)  { e.preventDefault(); bas(b.dataset.az, -1); }
    if (b.dataset.cok) { e.preventDefault(); bas(b.dataset.cok, +1); }
  });

  document.getElementById("hapKapat").addEventListener("click", () => {
    p.classList.toggle("kapali");
    document.getElementById("hapKapat").textContent =
      p.classList.contains("kapali") ? "+" : "–";
  });
  document.getElementById("hapKaydet").addEventListener("click", () => {
    bilgi(yaz(S) ? "Kaydedildi — ?menu=1 olmadan da geçerli."
                 : "KAYDEDİLEMEDİ — telefon deposu engelliyor.");
  });
  document.getElementById("hapSifirla").addEventListener("click", () => {
    const v = varsayilan();
    ALANLAR.forEach(a => ayarla(a[0], v[a[0]]));
    try { localStorage.removeItem(ANAHTAR); } catch (e) {}
    bilgi("Varsayılana döndü.");
  });
  document.getElementById("hapKopyala").addEventListener("click", () => {
    const metin = JSON.stringify(S);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(metin)
        .then(() => bilgi("Panoya kopyalandı."))
        .catch(() => bilgi(metin));
    } else { bilgi(metin); }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", kur);
} else { kur(); }
})();

/* ═══════════════════════════════════════════════════════════════
   RAPOR — SAYFA OKLARI, İKİ TARAFLI DÖKÜM, SAVAŞ DETAYLARI
   Dosya sonunda ayrı IIFE: sıralamada en son eklendiği için
   yukarıdaki rapor kurallarını ezer (Tuzak 27 — sıralama kazanır).
   ═══════════════════════════════════════════════════════════════ */
(function raporSayfaStil() {
"use strict";
const st = document.createElement("style");
st.id = "temaRaporSayfa";
st.textContent = `
/* ── renkler: okuyana göre ── */
.rp-box .rp-kirmizi{ color:#b8231f !important; }
.rp-box .rp-turuncu{ color:#b5710c !important; }
.rp-box .rp-yesil{ color:#1f7a34 !important; }

/* ── kutu biraz daha geniş ve uzun: oklar içeriğe binmesin ── */
.rp-box{ position:relative; width:min(410px,96vw) !important; max-height:90vh !important; }

/* ── alt satır: iki köşede oklar, ortada Savaş Detayları ── */
.rp-alt{ display:flex; align-items:center; gap:6px; margin-top:10px; }
.rp-alt .rp-detail-btn{ flex:1 1 auto; margin-top:0 !important; }
.rp-alt .rp-ok{
  flex:0 0 30px; background:none; border:0; padding:0; cursor:pointer;
  font-family:inherit; font-weight:800; font-size:32px; line-height:1;
  color:color-mix(in srgb, var(--rp-murekkep) 55%, transparent);
}
.rp-alt .rp-ok:active{ color:var(--rp-murekkep); }
.rp-alt .rp-ok[hidden]{ visibility:hidden; display:block; }  /* köşe yeri korunur */

/* "✓ Aktif": sürekli etkili yetenekler. Sayı değil, o yüzden daha
   küçük ve yeşil — sayı sütunlarıyla karışmasın. */
.sd-aktif{ color:#1f7a34; font-size:11px; font-weight:800; white-space:nowrap; }

/* ── SAYFA 2: iki taraflı karşılaştırma ── */
.rp-krs-ust{
  display:flex; justify-content:space-between; gap:8px;
  font-size:11px; font-weight:800; color:var(--rp-murekkep-2);
  padding:0 4px 6px; margin-bottom:4px;
  border-bottom:1px solid color-mix(in srgb, var(--rp-murekkep) 22%, transparent);
}
.rp-krs-taraf{ max-width:45%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rp-krs-ben{ color:var(--rp-murekkep); }
.rp-krs-blok{ margin-bottom:14px; }
/* başlık: yazı yok — iki tarafta da o birliğin kafa kutucuğu */
.rp-krs-baslik{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px; margin:8px 0 4px;
}
.rp-krs-cizgi{
  flex:1 1 auto; height:1px;
  background:color-mix(in srgb, var(--rp-murekkep) 22%, transparent);
}
.rp-box .rp-krs-baslik .rep-por{
  flex:0 0 auto;
  background:rgba(255,255,255,.22) !important;
  border:2px solid color-mix(in srgb, var(--rp-murekkep) 45%, transparent) !important;
}
.rp-krs-satir{
  display:flex; align-items:center; padding:5px 4px;
  border-bottom:1px solid color-mix(in srgb, var(--rp-murekkep) 10%, transparent);
  font-weight:800; font-size:12px; color:var(--rp-murekkep);
  font-variant-numeric:tabular-nums;
}
.rp-krs-satir:nth-child(odd){ background:rgba(255,255,255,.14); }
.rp-krs-sol{ flex:1 1 0; text-align:left; }
.rp-krs-sag{ flex:1 1 0; text-align:right; }
.rp-krs-orta{
  flex:0 0 auto; font-size:10.5px; font-weight:800;
  color:var(--rp-murekkep-2); padding:0 10px; white-space:nowrap;
}

/* Sayfa 1'deki toplam özet — satırları sayfa 2 ile aynı (.rp-krs-*),
   sadece kendi çerçevesi ve üst boşluğu var. */
.rp-ozet{
  margin:8px 2px 0;
  border-radius:10px; overflow:hidden;
  border:1px solid color-mix(in srgb, var(--rp-murekkep) 14%, transparent);
}
.rp-ozet .rp-krs-satir:last-child{ border-bottom:0; }

/* ── SAVAŞ DETAYLARI penceresi ── */
.sd-back{
  position:fixed; inset:0; z-index:9999; background:rgba(2,8,22,.62);
  backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center;
  padding:18px; font-family:'Baloo 2','Nunito',sans-serif;
}
.sd-box{ max-height:82vh; overflow:auto; }
.sd-blok{ margin-bottom:12px; }
.sd-bas{
  display:flex; border-radius:9px; overflow:hidden;
  font-size:12px; font-weight:800; color:#fff;
}
.sd-bas-sol{ flex:1 1 0; padding:6px 9px; background:linear-gradient(90deg,#2f74c8,#3f8bdc); }
.sd-bas-sag{ flex:1 1 0; padding:6px 9px; text-align:right; background:linear-gradient(90deg,#c33f3f,#a82626); }
.sd-sutun, .sd-satir{ display:flex; align-items:center; gap:4px; padding:4px 2px; }
.sd-sutun{
  font-size:9.5px; font-weight:800; color:var(--rp-murekkep-2);
  border-bottom:1px solid color-mix(in srgb, var(--rp-murekkep) 20%, transparent);
}
.sd-sb{ flex:1 1 0; text-align:center; }
.sd-satir{
  border-bottom:1px solid color-mix(in srgb, var(--rp-murekkep) 10%, transparent);
  font-size:12px; font-weight:800; color:var(--rp-murekkep);
  font-variant-numeric:tabular-nums;
}
.sd-n{ flex:1 1 0; text-align:center; }
.sd-ayrac{ flex:0 0 1px; align-self:stretch;
  background:color-mix(in srgb, var(--rp-murekkep) 22%, transparent); margin:0 4px; }
/* yetenek ikonu — kahraman görselinden belirgin küçük */
.sd-ab{
  flex:0 0 28px; width:28px; height:28px; border-radius:7px; overflow:hidden;
  display:flex; align-items:center; justify-content:center;
  background:rgba(0,0,0,.18);
  border:1px solid color-mix(in srgb, var(--rp-murekkep) 35%, transparent);
}
.sd-ab img{ width:100%; height:100%; object-fit:cover; }
.sd-ab-bos{ font-size:13px; color:var(--rp-murekkep-2); }
.sd-ab-yok{ background:none; border:0; }
.sd-ab-tik{ cursor:pointer; }
.sd-ab-tik:active{ transform:scale(.92); }
.sd-ab-acik{ border-color:var(--rp-murekkep); box-shadow:0 0 0 2px rgba(255,255,255,.35); }
/* ikona dokununca AÇILIR PENCERE YOK: açıklama satırın üstünde,
   ortada belirir. Akışa girmediği için alttaki satırlar aşağı itilmez —
   ölçüp hizalamak yerine sarmalın içine konuldu (Tuzak 28). */
.sd-sarmal{ position:relative; }
.sd-ac{
  position:absolute; left:50%; top:50%;
  transform:translate(-50%,-50%); z-index:3;
  /* TEK STANDART ÖLÇÜ: metne göre değişmez, hepsi aynı genişlikte ve
     dar. Değişken genişlik (max-content) her yetenekte farklı boyda
     kutu üretiyordu; sabit genişlik hem kırpar hem hizayı korur. */
  width:min(205px, calc(100% - 32px));
  padding:6px 9px 7px; border-radius:9px;
  background:color-mix(in srgb, var(--rp-kagit) 92%, #000);
  border:1px solid color-mix(in srgb, var(--rp-murekkep) 45%, transparent);
  box-shadow:0 4px 12px rgba(30,16,4,.35);
  font-size:10px; line-height:1.35; font-weight:700; color:var(--rp-murekkep);
  text-align:left; text-wrap:balance;   /* son satır tek kelime kalıp boşluk bırakmasın */
}
.sd-ac[hidden]{ display:none; }
/* başlık büyür ama kutu büyümez: satır aralığı ve alt boşluk kısıldı */
.sd-ac b{ display:block; font-size:12.5px; line-height:1.2; margin-bottom:2px; }
`;
document.head.appendChild(st);
})();

/* ═══════════════════════════════════════════════════════════════
   SAVAŞ EKRANI — İNCE AYAR (dosya sonunda ayrı IIFE)
   Sıralamada en son eklendiği için yukarıdaki kuralları ezer
   (Tuzak 2: sondaki kazanır).

   Üç küçük değişiklik:
     1) SAVAŞA GİR düğmesi biraz daralır (yan boşluk 40 → 30 px).
        Yükseklik ve yazı boyutu AYNI kalır.
     2) Panel biraz uzar (92vh → 96vh) — komutan sırası ve birlik
        satırları daha rahat sığsın.
     3) Güçlendirme kutucuğu incelir: YAZI BOYUTLARI DEĞİŞMEZ,
        yalnız iç boşluk/kenarlık kısılır ve kutu ✕ düğmesinin
        altına iner; böylece kahraman kartlarındaki (–) çıkarma
        düğmelerinin üstüne binmez.
   ═══════════════════════════════════════════════════════════════ */
(function savasEkraniInceAyar() {
"use strict";
const st = document.createElement("style");
st.id = "temaSavasInceAyar";
st.textContent = `
.battle-arena .battle-btn{ padding:14px 30px !important; }
.battle-arena{ max-height:96vh !important; }
`;
document.head.appendChild(st);
})();

/* ═══════════════════════════════════════════════════════════════
   SAVAŞ GÜNLÜĞÜ — ÖDÜL KUTUCUĞU (dosya sonunda ayrı IIFE)
   Canavardan düşen kaynak "📜 Aç"ın yanında hediye düğmesi olarak
   çıkıyordu ama hiçbir stili yoktu: tarayıcının gri varsayılan
   düğmesi görünüyordu. Turuncu kutucuk + kaynak görseli + miktar.
   Alınmış ödül soluk ve tıklanamaz görünür.
   ═══════════════════════════════════════════════════════════════ */
(function odulKutucugu() {
"use strict";
const st = document.createElement("style");
st.id = "temaOdulKutucuk";
st.textContent = `
/* ── KAYIT SATIRI: KUTU DEĞİL, ÇİZGİ ──
   Her rapor için ayrı büyük kart çiziliyordu. Kart kaldırıldı,
   yerine alta ince bir ayırıcı çizgi kondu. Sonuncuda çizgi yok. */
/* Seçici #panel-battlelog ile yazılmak ZORUNDA: baloncuğu çizen kural
   (bu dosyanın 437. satırı) o kimlikle tanımlı ve sade .log-entry'yi
   ezip geçiyordu. */
#panel-battlelog .log-entry,
#panel-battlelog .log-entry.log-win,
#panel-battlelog .log-entry.log-loss{
  background:none !important; box-shadow:none !important;
  border:0 !important; border-radius:0 !important;
  border-left:0 !important;
  padding:9px 2px 9px !important; margin:0 !important;
  border-bottom:1px solid rgba(190,225,255,.22) !important;
}
#panel-battlelog .log-entry:last-child{ border-bottom:0 !important; }

/* Aç + ödül TEK SATIRDA ve AYNI EBATTA. Aç eskiden %100 genişlikti,
   ödülü alt satıra itiyordu. İkisi de içeriği kadar yer kaplar;
   ölçüler (yükseklik, yazı, köşe) eşitlenir — renk ve gölge
   tasarımlarına dokunulmaz. */
.log-entry-actions{ display:flex; align-items:center; gap:8px; flex-wrap:nowrap; }
.log-entry-actions .log-open-btn,
.log-entry-actions .log-gift-btn{
  flex:0 0 auto; width:auto !important; min-width:112px;
  height:38px; box-sizing:border-box;
  display:inline-flex; align-items:center; justify-content:center;
  padding:0 12px !important; border-radius:11px !important;
  font-size:13px !important;
}
.log-gift-btn{
  display:inline-flex; align-items:center; gap:5px;
  border:2px solid #ffd9a1 !important; border-radius:11px;
  padding:5px 11px; cursor:pointer;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:13px;
  color:#fff !important;
  background:linear-gradient(180deg,#f7a83a 0%,#e2820f 55%,#b95f06 100%) !important;
  box-shadow:0 3px 0 #8a4604, 0 5px 10px rgba(120,60,0,.35),
             inset 0 1px 0 rgba(255,235,200,.55) !important;
  text-shadow:0 1px 2px rgba(90,40,0,.55);
}
.log-gift-btn:active{ transform:translateY(2px); box-shadow:0 1px 0 #8a4604 !important; }
/* Alınmış ödül: kutucuk kalır, söner. */
.log-gift-btn.alindi{
  filter:saturate(.25) brightness(.85);
  box-shadow:none !important; cursor:default;
}
`;
document.head.appendChild(st);
})();

/* ═══════════════════════════════════════════════════════════════
   YAKINLAŞTIRMA KİLİDİ (dosya sonunda ayrı IIFE)
   Yakınlaştırma SADECE haritaya aittir. Tarayıcının kendi zoom'u
   panelleri, birlik ekranını ve alt menüyü de büyütüyordu.

   Üç katman:
     1) index.html'deki viewport meta (maximum-scale / user-scalable)
     2) touch-action: iki parmak hareketi tarayıcıya gitmesin.
        DEĞER SEÇİMİ ÖNEMLİ — "manipulation" pinch'e İZİN VERİR,
        bize gereken "pan-x pan-y".
     3) JS kalkanı: telefonun erişilebilirlik ayarındaki "yakınlaştırmayı
        zorla" seçeneği meta etiketini yok sayar; iki parmak dokunuşu ve
        çift dokunuş orada da engellenir.

   HARİTA MUAF: #battleMapWrap kendi `touch-action:none` kuralını
   korur ve kendi iki parmak kodunu çalıştırır (index.html, touchmove
   → zoomAtPoint). Aşağıdaki kalkan harita içinden gelen dokunuşa
   KARIŞMAZ — karışsaydı haritanın yakınlaştırması da ölürdü.
   ═══════════════════════════════════════════════════════════════ */
(function zoomKilidi() {
"use strict";

const st = document.createElement("style");
st.id = "temaZoomKilit";
st.textContent = `
html, body{ touch-action:pan-x pan-y; }
/* Panellerin içi de kilitli: kart, liste ve ızgaralar yalnız kayar. */
.overlay-panel, .overlay-card, .battle-arena, .nav-dock,
#appScreen, #loginScreen{ touch-action:pan-x pan-y; }
/* Harita ve kendi sürgüleri dokunma yönetimini kendileri yapar. */
.battle-map-wrap, #battleMapWrap,
.hospital-slider, .hsm-slider, .troop-slider{ touch-action:none; }
`;
document.head.appendChild(st);

/* Harita içinden mi geldi? Harita kendi yakınlaştırmasını yapar. */
function haritadaMi(t) {
  return !!(t && t.closest && t.closest("#battleMapWrap, .battle-map-wrap"));
}

/* iOS Safari: pinch `gesture*` olayları üretir, touch-action tutmaz. */
["gesturestart", "gesturechange", "gestureend"].forEach(ad => {
  document.addEventListener(ad, e => {
    if (haritadaMi(e.target)) return;
    e.preventDefault();
  }, { passive: false });
});

/* Android/masaüstü: iki parmak hareketi haritanın dışındaysa yut. */
document.addEventListener("touchmove", e => {
  if (e.touches && e.touches.length > 1 && !haritadaMi(e.target)) {
    e.preventDefault();
  }
}, { passive: false });

/* NOT — ÇİFT DOKUNUŞ ENGELİ KALDIRILDI.
   Burada "300 ms içinde gelen ikinci dokunuşu iptal et" diye bir
   kalkan vardı. touchend'de preventDefault çağırmak o dokunuşun
   CLICK olayını da iptal ediyor; arka arkaya basılan düğmeler
   (ör. paneli açıp hemen "Aç"a basmak) çalışmıyordu.
   Çift dokunuşla yakınlaştırmayı yukarıdaki `touch-action` zaten
   kapatıyor — ayrı bir kalkana gerek yok. Geri EKLEME. */

/* Masaüstü: Ctrl + tekerlek yakınlaştırması (harita kendi işler). */
document.addEventListener("wheel", e => {
  if ((e.ctrlKey || e.metaKey) && !haritadaMi(e.target)) e.preventDefault();
}, { passive: false });

})();

/* ═══════════════════════════════════════════════════════════════
   SAVAŞ GÜNLÜĞÜ — KAYDIRMA ÇUBUĞU GİZLİ (dosya sonunda ayrı IIFE)
   Liste zaten parmakla kaydırılıyor; çubuk yalnız yer kaplıyordu.
   Kaydırma ÇALIŞMAYA DEVAM EDER, sadece çubuk çizilmez.
   ═══════════════════════════════════════════════════════════════ */
(function gunlukCubukGizle() {
"use strict";
const st = document.createElement("style");
st.id = "temaGunlukCubuk";
st.textContent = `
#panel-battlelog .log-list, #battleLogHistoryList{
  scrollbar-width:none !important;      /* Firefox */
  -ms-overflow-style:none !important;   /* eski Edge */
}
#panel-battlelog .log-list::-webkit-scrollbar,
#battleLogHistoryList::-webkit-scrollbar{
  width:0 !important; height:0 !important; display:none !important;
}
`;
document.head.appendChild(st);
})();


/* ═══════════════════════════════════════════════════════════════
   BİRLİK PANELİ — ROL SEÇİCİ + DERLİ TOPLU STAT/ADET ÇUBUĞU
   (dosya sonunda ayrı IIFE — üstteki şablon dizgisine dokunulmadı)

   · Solda alt alta Savunma / Güç / Nişan düğmeleri
   · Stat listesi 4 satır oldu (Güç eklendi): fontlar AYNI kaldı,
     sadece satır aralığı/dolgusu daraltıldı
   · − / kutu / + daha düzgün ebatta, sürgü kendi satırına indi
   ═══════════════════════════════════════════════════════════════ */
(function birlikPaneliRolVeDuzen() {
"use strict";
const st = document.createElement("style");
st.id = "temaBirlikRol";
st.textContent = `
/* ── ROL SEÇİCİ ── */
#panel-troops .uv-roles{
  position:absolute !important; left:8px !important; top:33% !important;
  transform:translateY(-50%) !important; z-index:30 !important;
  display:flex !important; flex-direction:column !important; gap:6px !important;
}
/* "Birlikler" sekmesindeyken gizlen */
#unitViewer.tp-off .uv-roles{ display:none !important; }
#panel-troops .uv-role{
  width:50px !important; padding:4px 2px 3px !important; cursor:pointer !important;
  display:flex !important; flex-direction:column !important;
  align-items:center !important; gap:1px !important;
  border-radius:12px !important;
  background:rgba(4,32,60,.32) !important;
  border:2px solid rgba(190,240,255,.4) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.25) !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  -webkit-tap-highlight-color:transparent;
  transition:border-color .15s, transform .15s, box-shadow .15s;
}
#panel-troops .uv-role .uvr-ico{ font-size:16px !important; line-height:1 !important; }
#panel-troops .uv-role .uvr-txt{
  font-size:9px !important; font-weight:800 !important; letter-spacing:0 !important;
  line-height:1.1 !important;
  color:#dff4ff !important; text-shadow:0 1px 2px rgba(0,30,55,.55) !important;
}
#panel-troops .uv-role.is-active{
  border-color:#ffd257 !important; background:rgba(255,210,87,.18) !important;
  box-shadow:0 0 0 2px rgba(255,210,87,.3), 0 4px 10px rgba(0,25,50,.35) !important;
  transform:translateX(2px) !important;
}
#panel-troops .uv-role.is-active .uvr-txt{ color:#fff !important; }

/* ── STATLAR: 4 satır sığsın — font AYNI, boşluk daraldı ── */
#panel-troops .stats{
  padding:4px 4px calc(4px + env(safe-area-inset-bottom,0)) !important;
}
#panel-troops .stats-grid{ gap:1px !important; }
#panel-troops .stat-row{
  padding:4px 12px !important; gap:9px !important; border-radius:9px !important;
}
#panel-troops .uv-portraits{ margin:0 0 6px !important; }
/* Güç satırı (kale gücüne katkı): çerçeve/zemin YOK — sarı kutu
   "seçili" gibi duruyordu. Sadece rakam altın renkte kalıyor.
   :nth-child(odd) ile aynı özgüllük için çift sınıf yazıldı. */
#panel-troops .stat-row.stat-row-power{
  background:transparent !important;
  box-shadow:none !important;
}
#panel-troops .stat-row.stat-row-power .stat-val{ color:#ffd257 !important; }

/* ── ADET ÇUBUĞU: − / kutu / + ortada, sürgü kendi satırında ── */
#panel-troops .unit-qty-bar{
  flex-wrap:wrap !important; justify-content:center !important;
  gap:7px !important; margin:8px 10px 0 !important;
}
#panel-troops .uq-btn{
  width:30px !important; height:30px !important;
  font-size:17px !important; border-radius:9px !important;
  box-shadow:0 2px 0 #a8641a, inset 0 1px 0 rgba(255,255,255,.5) !important;
}
#panel-troops .uq-input{
  width:52px !important; padding:5px 2px !important;
  font-size:15px !important; border-radius:9px !important;
  border-width:2px !important;
}
#panel-troops .uv-qty-slider{
  flex:1 1 100% !important; order:9 !important; width:100% !important;
  height:20px !important; margin:2px 2px 0 !important;
}

/* ── ÜRET / ANINDA: alt satır ASLA alta taşmasın ──
   "1 sa 40 dk" iki satıra düşünce düğme uzuyordu. Metin tek satıra
   kilitlendi, taşarsa font kendiliğinden ufalır (kutuda yer var). */
#panel-troops .unit-instant-btn,
#panel-troops .unit-train-btn{
  padding:6px 4px !important; min-height:52px !important;
}
#panel-troops .utb-sub{
  white-space:nowrap !important; font-size:11px !important;
  letter-spacing:0 !important; opacity:.92 !important;
}
#panel-troops .utb-top{ white-space:nowrap !important; }
`;
document.head.appendChild(st);
})();

/* ══════════════════════════════════════════════════════════════
   BİRLİK EKRANI — SON RÖTUŞLAR
   ------------------------------------------------------------
   1) Statlar (Saldırı/Can/Savunma/Güç) 4'lü yan yana kutucuk.
      Eskiden alt alta 4 geniş satırdı, dikeyde çok yer yiyordu.
   2) Güç rakamı da beyaz — altın renk "seçili/özel" gibi duruyordu.
   3) Rol düğmeleri (Savunma/Güç/Nişan) KARE. Yazı ve emoji boyutu
      aynı kaldı, sadece kutunun yüksekliği genişliğine eşitlendi.
   4) ROBOT KAYMASI DÜZELTMESİ — önemli:
      Robot görseli `translateX(-50%)` ile ortalanıyor, ama
      index.html'deki `floaty` animasyonu her karede `translateY`
      yazıp bu ortalamayı KOMPLE siliyordu. Animasyon devreye
      girince robot kendi genişliğinin yarısı kadar sağa fırlıyor
      ve animasyon sonsuz döndüğü için bir daha geri gelmiyordu.
      Çözüm: ortalamayı da İÇİNDE taşıyan yeni bir animasyon.
      Ders: transform animasyonu, aynı öğedeki transform kuralının
      tamamını ezer — ikisini bölüştüremezsin, tek yerde yaz.
   ══════════════════════════════════════════════════════════════ */
(function birlikSonRotus(){
"use strict";
const st = document.createElement("style");
st.id = "temaBirlikSonRotus";
st.textContent = `

/* ── 1) STATLAR: 4'lü yan yana ── */
#panel-troops .stats-grid{
  display:grid !important;
  grid-template-columns:repeat(4,1fr) !important;
  gap:6px !important;
  flex-direction:row !important;
  max-width:520px !important; margin:0 auto !important;
}
#panel-troops .stat-row,
#panel-troops .stat-row:nth-child(odd),
#panel-troops .stat-row.stat-row-power{
  display:grid !important;
  grid-template-columns:auto auto !important;
  justify-content:center !important;
  justify-items:center !important; align-content:center !important;
  gap:1px !important;
  padding:6px 2px !important;
  border-radius:10px !important;
  background:rgba(4,32,60,.22) !important;
  text-align:center !important;
}
#panel-troops .stat-ico{
  grid-column:1 !important; grid-row:1 !important;
  width:auto !important; font-size:16px !important;
  line-height:1 !important; text-align:center !important;
}
#panel-troops .stat-name{
  grid-column:2 !important; grid-row:1 !important;
  flex:none !important; font-size:12px !important;
  white-space:nowrap !important; line-height:1.1 !important;
  opacity:.92 !important;
}
#panel-troops .stat-val{
  grid-column:1 / -1 !important; grid-row:2 !important;
  font-size:20px !important; line-height:1.05 !important;
  min-width:0 !important; text-align:center !important;
}

/* ── 2) Güç rakamı: diğerleri gibi BEYAZ ── */
#panel-troops .stat-row.stat-row-power .stat-val{ color:#fff !important; }

/* ── 3) Rol düğmeleri: KARE (yazı/emoji boyutu değişmedi) ── */
#panel-troops .uv-role{
  width:50px !important; height:50px !important;
  padding:0 2px !important;
  justify-content:center !important;
  box-sizing:border-box !important;
}

/* ── 4) Robot ortada kalsın: süzülme + ortalama TEK transform'da ── */
@keyframes robotSuzul{
  0%,100%{ transform:translateX(calc(-50% + var(--tp-r-x,-4px))) translateY(0); }
  50%    { transform:translateX(calc(-50% + var(--tp-r-x,-4px))) translateY(-14px); }
}
#panel-troops .us-robot .hero-img{
  animation:robotSuzul 4s ease-in-out infinite !important;
  left:50% !important;
  transform:translateX(calc(-50% + var(--tp-r-x,-4px))) !important;
}
`;
document.head.appendChild(st);
})();

/* ══════════════════════════════════════════════════════════════
   BİRLİK EKRANI — DÜĞME SADELEŞTİRME
   1) "Anında" ve "Üret" düğmelerinin altındaki kalın 3B kenar
      kaldırıldı (0 4px 0 / 0 5px 0 gölgeler). Yerine yumuşak,
      ince bir gölge kaldı. Basınca aşağı zıplama da yok.
   2) Rol düğmesi (Savunma/Güç/Nişan) seçilince artık büyümüyor /
      kaymıyor — sarı çerçeve ve zemin zaten yeterli işaret.
   Not: 3B gölge iki ayrı yerde tanımlıydı (birlik bloğu + ortak
   mavi düğme bloğu). Bu blok dosyanın SONUNDA olduğu için
   ikisini de eziyor; ikisini ayrı ayrı silmeye gerek yok.
   ══════════════════════════════════════════════════════════════ */
(function birlikDugmeSade(){
"use strict";
const st = document.createElement("style");
st.id = "temaBirlikDugmeSade";
st.textContent = `

#panel-troops .unit-instant-btn{
  box-shadow:0 2px 6px rgba(0,20,45,.28) !important;
}
#panel-troops .unit-train-btn{
  box-shadow:0 2px 6px rgba(0,20,45,.32) !important;
}
#panel-troops .unit-instant-btn:active,
#panel-troops .unit-train-btn:active{
  transform:none !important;
  box-shadow:0 1px 3px rgba(0,20,45,.3) !important;
  filter:brightness(.94) !important;
}

/* Rol düğmesi seçiliyken yerinden oynamasın */
#panel-troops .uv-role,
#panel-troops .uv-role.is-active{
  transform:none !important;
  transition:border-color .15s, background-color .15s !important;
}
`;
document.head.appendChild(st);
})();
