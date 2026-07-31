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

function heroChip(name) {
  const img = heroImgOf(name);
  const inner = img
    ? `<img src="${img}" style="width:100%;height:100%;object-fit:contain">`
    : `<span style="font-size:20px">🦸</span>`;
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;width:56px">
    <div style="width:52px;height:52px;border-radius:10px;overflow:hidden;
      background:linear-gradient(180deg,#3d7ccc,#152e5e);border:2px solid rgba(190,240,255,.5);
      display:flex;align-items:center;justify-content:center">${inner}</div>
    <div style="font-size:9px;font-weight:800;color:#eaf7ff;text-align:center;line-height:1.1">${name}</div>
  </div>`;
}

function troopChips(lossObj) {
  if (!lossObj) return '<span style="color:#bfe6ff">—</span>';
  const both = {};
  ["killed","wounded"].forEach(k => Object.keys(lossObj[k]||{}).forEach(uid=>{
    both[uid]=(both[uid]||0)+(lossObj[k][uid]||0);
  }));
  const ids = Object.keys(both).filter(u=>both[u]>0);
  if (!ids.length) return '<span style="color:#7fe3a6;font-weight:800">Kayıp yok 🎉</span>';
  return ids.map(uid=>{
    const d=(typeof UNIT_TYPES!=="undefined")?UNIT_TYPES[uid]:null;
    const nm=d?d.name:uid;
    return `<span style="display:inline-block;background:rgba(0,10,26,.4);border:1px solid rgba(190,240,255,.3);
      border-radius:8px;padding:3px 8px;margin:2px;font-size:11px;font-weight:800;color:#fff">${nm} ×${both[uid]}</span>`;
  }).join("");
}

/* rapor verisini pencerede göster (açık-mavi güncel arayüz) */
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
    <div style="width:min(380px,94vw);max-height:88vh;overflow-y:auto;border-radius:20px;padding:16px 15px;
      background:radial-gradient(ellipse 100% 50% at 50% 0%,rgba(170,240,255,.5),transparent 72%),
        radial-gradient(ellipse 80% 40% at 50% 105%,rgba(8,45,80,.55),transparent 75%),
        linear-gradient(180deg,#1fa3ea,#0e6fc0);
      border:3px solid rgba(190,240,255,.85);box-shadow:0 0 26px rgba(120,225,255,.45),inset 0 3px 0 rgba(255,255,255,.45);
      color:#fff;position:relative">
      <button id="repClose" style="position:absolute;top:10px;right:10px;width:34px;height:34px;border:none;
        border-radius:9px;background:linear-gradient(180deg,#f03434,#c00d0d);color:#fff;font-weight:900;
        font-size:18px;box-shadow:0 3px 8px rgba(120,0,0,.4)">✕</button>

      <div style="text-align:center;font-weight:900;font-size:17px;margin:2px 0 12px;
        text-shadow:0 2px 4px rgba(0,40,70,.6)">📜 SAVAŞ RAPORU</div>

      <div style="text-align:center;font-weight:900;font-size:15px;margin-bottom:12px;
        color:${win?'#c8ffd8':'#ffd0d0'};text-shadow:0 2px 4px rgba(0,40,70,.6)">
        ${win?'🏆 SALDIRAN KAZANDI':'🛡️ SAVUNAN KAZANDI'}
      </div>

      <!-- saldıran vs savunan -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;
        background:linear-gradient(180deg,rgba(34,72,143,.7),rgba(13,34,70,.8));
        border:2px solid rgba(190,240,255,.4);border-radius:14px;padding:12px 10px;margin-bottom:12px">
        <div style="flex:1;text-align:center">
          <div style="width:64px;height:64px;margin:0 auto;border-radius:12px;
            background:rgba(255,255,255,.12);border:2px dashed rgba(190,240,255,.6);
            display:flex;align-items:center;justify-content:center;font-size:26px">🏰</div>
          <div style="font-weight:900;font-size:12px;margin-top:5px;color:#ffd257">${attacker}</div>
          <div style="font-size:10px;font-weight:800;color:#dff2ff">SALDIRAN</div>
        </div>
        <div style="font-weight:900;font-size:20px;color:#fff;flex:0 0 auto">VS</div>
        <div style="flex:1;text-align:center">
          <div style="width:64px;height:64px;margin:0 auto;border-radius:12px;
            background:rgba(255,255,255,.12);border:2px dashed rgba(190,240,255,.6);
            display:flex;align-items:center;justify-content:center;font-size:26px">🏰</div>
          <div style="font-weight:900;font-size:12px;margin-top:5px;color:#ffd257">${defender}</div>
          <div style="font-size:10px;font-weight:800;color:#dff2ff">SAVUNAN</div>
        </div>
      </div>

      ${(r.attackerCommanders&&r.attackerCommanders.length)||(r.defenderCommanders&&r.defenderCommanders.length)?`
      <div style="background:linear-gradient(180deg,rgba(34,72,143,.62),rgba(13,34,70,.75));
        border:2px solid rgba(190,240,255,.35);border-radius:12px;padding:10px;margin-bottom:10px">
        <div style="font-size:11px;font-weight:900;color:#bfe6ff;margin-bottom:6px">🦸 KAHRAMANLAR</div>
        <div style="display:flex;justify-content:space-around;gap:8px">
          <div style="flex:1"><div style="font-size:9px;color:#dff2ff;text-align:center;margin-bottom:4px">Saldıran</div>
            <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px">
              ${(r.attackerCommanders||[]).map(heroChip).join("")||'<span style="color:#bfe6ff;font-size:10px">—</span>'}</div></div>
          <div style="flex:1"><div style="font-size:9px;color:#dff2ff;text-align:center;margin-bottom:4px">Savunan</div>
            <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px">
              ${(r.defenderCommanders||[]).map(heroChip).join("")||'<span style="color:#bfe6ff;font-size:10px">—</span>'}</div></div>
        </div>
      </div>`:''}

      <div style="background:linear-gradient(180deg,rgba(34,72,143,.62),rgba(13,34,70,.75));
        border:2px solid rgba(190,240,255,.35);border-radius:12px;padding:10px;margin-bottom:10px">
        <div style="font-size:11px;font-weight:900;color:#bfe6ff;margin-bottom:6px">💀 BİRLİK KAYIPLARI</div>
        <div style="font-size:10px;font-weight:800;color:#dff2ff;margin-bottom:3px">Saldıran:</div>
        <div style="margin-bottom:8px">${troopChips(r.attackerLosses)}</div>
        <div style="font-size:10px;font-weight:800;color:#dff2ff;margin-bottom:3px">Savunan:</div>
        <div>${troopChips(r.defenderLosses)}</div>
      </div>

      <div style="display:flex;justify-content:space-around;font-weight:900;font-size:13px;
        background:rgba(0,10,26,.35);border-radius:10px;padding:9px">
        <span>💎 ${win?'+':''}${f(r.diamonds||0)}</span>
        <span style="color:#dff2ff">⏱️ ${r.turns||0} tur</span>
      </div>
    </div>`;
  document.body.appendChild(back);
  back.addEventListener("click",e=>{ if(e.target===back) back.remove(); });
  document.getElementById("repClose").onclick=()=>back.remove();
}

/* günlük kaydından paylaşılabilir rapor objesi üret */
function entryToReport(entry) {
  if (entry.role === "attacker") {
    return {
      attackerWon: entry.win,
      attackerName: entry.myName, defenderName: entry.enemyPlainName,
      attackerCommanders: entry.myCommanders||[], defenderCommanders: entry.enemyCommanders||[],
      attackerLosses: entry.myLosses||null, defenderLosses: entry.enemyLosses||null,
      diamonds: entry.diamondDelta||0, turns: entry.turns||0,
    };
  }
  return {
    attackerWon: !entry.win,
    attackerName: entry.enemyPlainName, defenderName: entry.myName,
    attackerCommanders: [], defenderCommanders: [],
    attackerLosses: null,
    defenderLosses: entry.myLosses||null,
    diamonds: entry.diamondsLost||0, turns: entry.turns||0,
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
   9) BİRLİK PANELİ v2 — alta sabit kart, açık mavi tema, Baloo 2
      Portre seçici, "Anında / Üret" butonları, adet çubuğu.
      Yapısal HTML ana koddadır; burada SADECE görünüm vardır.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const s = document.createElement("style");
  s.id = "troopPanelV2";
  s.textContent = `
/* ── PANEL: ekranın ortasında kart ── */
#panel-troops{
  align-items:flex-end !important; justify-content:center !important;
  padding:0 8px 0 !important;
  /* tema.js'in panelin dışına çizdiği çerçeve/karartı kalkıyor */
  border:0 !important; border-radius:0 !important; box-shadow:none !important; overflow:visible !important;
}

#panel-troops .uv-viewer{
  width:100% !important; max-width:420px !important;
  height:min(88vh, 680px) !important;
  background:
    radial-gradient(ellipse 100% 50% at 50% 0%, rgba(170,240,255,.5), transparent 72%),
    radial-gradient(ellipse 80% 40% at 50% 105%, rgba(8,45,80,.55), transparent 75%),
    linear-gradient(180deg,#1fa3ea,#0e6fc0) !important;
  border:3px solid rgba(190,240,255,.85) !important;
  border-radius:22px 22px 0 0 !important;
  border-bottom:0 !important;
  box-shadow:0 -6px 26px rgba(120,225,255,.4), inset 0 3px 0 rgba(255,255,255,.45) !important;
  overflow:hidden !important;
}

/* ÖNEMLİ: bölümlerin kendi koyu zemini kalkıyor — panelin mavisi görünsün */
#panel-troops .unit-screen,
#panel-troops .us-knight,
#panel-troops .us-soldier,
#panel-troops .us-robot{
  background:transparent !important;
  padding:64px 12px 0 !important;
}
#panel-troops .stage{
  background:rgba(4,40,75,.26) !important;
  border:2px solid rgba(190,240,255,.30) !important;
  border-radius:16px !important;
  box-shadow:inset 0 2px 4px rgba(150,205,255,.20) !important;
  padding-top:46px !important;
  overflow:hidden !important;
}
#panel-troops .us-soldier .spot{ opacity:.3 !important; }
#panel-troops .us-knight .dust{ display:none !important; }

/* oklar yok — parmakla kaydırma */
#panel-troops .uv-arrow{ display:none !important; }

/* ── SEKMELER: tek parça hap ── */
#panel-troops .tp-tabs{
  top:12px !important; left:12px !important; right:64px !important;
  gap:0 !important; padding:4px !important;
  background:rgba(4,32,60,.35) !important;
  border:1px solid rgba(190,240,255,.28) !important;
  border-radius:999px !important;
  pointer-events:auto !important;
}
#panel-troops .tp-tab{
  flex:1 1 0 !important; text-align:center !important;
  padding:8px 4px !important; border:0 !important; border-radius:999px !important;
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
  top:78px !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:24px !important; letter-spacing:.5px !important;
  color:#fff !important; text-shadow:0 2px 5px rgba(0,40,70,.6) !important;
}

/* noktalar kaldırıldı — yerini portre seçici aldı */
#panel-troops .uv-dots{ display:none !important; }


/* ── KAPAT ── */
#panel-troops .uv-close{
  top:12px !important; right:12px !important;
  width:44px !important; height:44px !important; border-radius:12px !important;
  border:2px solid rgba(255,190,190,.75) !important;
  background:linear-gradient(180deg,#ff6b6b,#e03131) !important;
  box-shadow:0 4px 0 #a01b1b, inset 0 1px 0 rgba(255,255,255,.4) !important;
  z-index:60 !important;
}
#panel-troops .uv-close:active{ transform:translateY(3px) !important; box-shadow:0 1px 0 #a01b1b !important; }

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
  padding:12px 4px calc(10px + env(safe-area-inset-bottom,0)) !important;
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
  width:50px !important; height:72px !important; flex:none !important;
  padding:0 !important; overflow:hidden !important; cursor:pointer !important;
  border-radius:13px !important;
  background:rgba(255,255,255,.10) !important;
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
  position:static !important; height:auto !important; margin:9px 8px 0 !important;
  background:transparent !important; border:0 !important; padding:0 !important; overflow:visible !important;
}
#panel-troops .unit-instant-btn,
#panel-troops .unit-train-btn{
  position:static !important; flex:1 1 0 !important; width:auto !important; height:auto !important;
  display:flex !important; flex-direction:column !important;
  align-items:center !important; justify-content:center !important; gap:1px !important;
  padding:9px 6px !important; border-radius:14px !important; cursor:pointer !important;
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
#panel-troops .utb-top{ font-weight:800 !important; font-size:17px !important; }
#panel-troops .utb-sub{ font-weight:700 !important; font-size:12px !important; opacity:.9 !important; }

/* ── EĞİTİM SÜRÜYOR ── */
#panel-troops .utb-training{
  flex:1 !important; display:flex !important; flex-direction:column !important;
  align-items:center !important; justify-content:center !important;
  padding:10px 8px !important; border-radius:14px !important;
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
  `;
  document.head.appendChild(s);
})();

console.log("[tema.js] Görünüm dosyası yüklendi ✔");
})();
