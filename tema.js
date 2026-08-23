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
.backup-modal,
.pvp-pop,
#panel-inventory .overlay-card,
#panel-rank .overlay-card{
  background:
    linear-gradient(180deg, #1fa3ea, #0e6fc0) !important;
  border:1px solid rgba(190,240,255,.85) !important;
  box-shadow:none !important;
}

/* SAVAŞ MENÜSÜ: aynı zemin, DÜZ çerçeve.
   Ortak listeden bilerek çıkarıldı — kalın kenar, dış parlama ve
   inset kabartı yalnız bu ekranda kaldırılıyor, mağaza/çanta/sıralama
   eski görünümünde kalıyor. */
.battle-arena{
  background:
    linear-gradient(180deg, #1fa3ea, #0e6fc0) !important;
  border:1px solid rgba(190,240,255,.20) !important;
  box-shadow:none !important;
}

/* ── savaş ekranı: mağaza şablonuna uydurma ── */
.battle-arena-top-bar{
  background:transparent !important;
}
.battle-arena .power-compare-box,
.battle-arena .troop-select-box,
.battle-arena .battle-log{
  background:linear-gradient(180deg, rgba(34,72,143,.62), rgba(13,34,70,.72)) !important;
  border:1px solid rgba(190,240,255,.20) !important;
  border-radius:14px !important;
  box-shadow:none !important;
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
  box-shadow:none;
  text-shadow:0 1px 2px rgba(0,20,50,.5);
  -webkit-tap-highlight-color:transparent; transition:transform .07s, box-shadow .07s;
}
.tema-open-btn{ background:linear-gradient(180deg,#5ec46a,#1f6631); box-shadow:none; }
.tema-share-btn{ background:linear-gradient(180deg,#3b74e8,#12408f); }
.tema-share-btn:active, .tema-open-btn:active{ transform:scale(.96); filter:brightness(.93); }
.tema-letter{
  border:none; cursor:pointer; border-radius:10px; padding:9px 14px;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:13px; color:#fff;
  background:linear-gradient(180deg,#f0a93b,#c47012);
  box-shadow:none;
  -webkit-tap-highlight-color:transparent;
}
.tema-letter:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none; }

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
  border:1px solid rgba(255,170,170,.75) !important;
  color:#fff !important; font-size:16px !important;
  padding:14px 40px !important; border-radius:14px !important;
  box-shadow:none !important;
  text-shadow:0 2px 3px rgba(90,0,0,.5) !important;
}
.battle-arena .battle-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }
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
  border:1px solid rgba(190,240,255,.85) !important;
  color:#fff !important;
  font-family:'Baloo 2',sans-serif !important; font-weight:900 !important;
  font-size:13.5px !important; letter-spacing:.3px;
  padding:9px 24px 11px !important; border-radius:13px !important;
  text-shadow:0 2px 3px rgba(0,40,70,.5);
  box-shadow:none !important;
}
.stamina-potion-popup .spp-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }
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
  border:1px solid rgba(190,240,255,.45) !important;
  border-radius:14px !important;
  box-shadow:none !important;
}
#panel-inventory .stat-card .num{ color:#fff !important; font-weight:900 !important; }
#panel-inventory .stat-card .lbl{ color:#bfe6ff !important; }

/* eşya kutucukları — mağaza kartıyla aynı model.
   ÇERÇEVE YOK: index.html'deki .shop-card kuralı 2px kenar veriyor
   (mağaza paneli onu kullanıyor, oradan silinemez), burada kapatılıyor. */
#panel-inventory .inv-card,
#panel-inventory .shop-card,
#panel-inventory .inv-row{
  background:linear-gradient(180deg, #3d7ccc 0%, #22488f 55%, #152e5e 100%) !important;
  border:none !important;
  border-radius:14px !important;
  box-shadow:none !important;
  color:#eaf7ff !important;
}
#panel-inventory .inv-card .icon-box,
#panel-inventory .shop-card .icon-box{
  background:linear-gradient(180deg, #ffd257, #f0932b) !important;
  border:none !important; border-radius:10px !important;
  box-shadow:none !important;
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
  box-shadow:none !important;
  text-shadow:0 1px 2px rgba(0,60,20,.5) !important;
}
#panel-inventory .inv-use-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }
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
/* DÜZ: çerçeve, kalın alt kenar ve gölge yok. index.html'deki iki blok ve
   aşağıdaki girisDuzles ile BİREBİR aynı — dördü ayrışırsa giriş ekranı
   yükleme sırasında görünüm değiştirir. */
#loginScreen .field input{
  background:linear-gradient(180deg, rgba(61,124,204,.72), rgba(21,46,94,.80)) !important;
  border:none !important;
  border-radius:13px !important;
  color:#fff !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:15px !important;
  text-shadow:none !important;
  box-shadow:none !important;
}
#loginScreen .field input::placeholder{ color:rgba(215,235,255,.75) !important; font-weight:700 !important; text-shadow:none !important; }
#loginScreen .field input:focus{
  background:rgba(255,255,255,.30) !important;
  border:none !important;
  box-shadow:none !important;
  outline:none !important;
}
#loginScreen .login-btn{
  background:linear-gradient(180deg,#5a9ce0 0%,#3568b4 55%,#22488f 100%) !important;
  border:none !important;
  border-radius:13px !important;
  color:#fff !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:900 !important; font-size:17px !important; letter-spacing:.5px;
  text-shadow:0 1px 2px rgba(0,20,45,.55) !important;
  box-shadow:none !important;
  transition:transform .09s, filter .09s !important;
}
#loginScreen .login-btn:active{ transform:scale(.98) !important; filter:brightness(.93) !important; box-shadow:none !important; }
#loginScreen .login-switch a{ color:#2DC9FC !important; font-weight:900 !important; }

/* ── ALT MENÜ (dock): panellerdeki ince açık-mavi çerçeve ── */
.nav-dock{
  border-top:1px solid rgba(190,240,255,.85) !important;
  box-shadow:none !important;
  border-radius:16px 16px 0 0 !important;
}

/* ── ÜST HUD KUTULARI: aynı açık-mavi çerçeve ── */
.hud-pill, .user-pill{
  border:1px solid rgba(190,240,255,.85) !important;
  box-shadow:none !important;
}

/* ═══════════════════════════════════════════════════════════════
   SANDIK AÇ + SAVAŞ GÜNLÜĞÜ — oyunun açık mavi teması
   ═══════════════════════════════════════════════════════════════ */
#panel-chest .overlay-card,
#panel-battlelog .overlay-card{
  background:
    linear-gradient(180deg, #1fa3ea, #0e6fc0) !important;
  border:1px solid rgba(190,240,255,.85) !important;
  box-shadow:none !important;
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
  border:1px solid rgba(190,240,255,.3) !important;
  border-radius:12px !important;
  box-shadow:none !important;
  color:#eaf7ff !important;
}
#panel-battlelog .log-entry.log-win{ border-left:1px solid #5ec46a !important; }
#panel-battlelog .log-entry.log-loss{ border-left:1px solid #e05a5a !important; }
#panel-battlelog .log-entry-enemy, #panel-battlelog .log-entry-stats{
  color:#eaf7ff !important; font-weight:800 !important;
}
#panel-battlelog .log-entry-time{ color:#bfe6ff !important; }
#panel-battlelog .log-clear-btn{
  background:linear-gradient(180deg,#e05a5a,#a81f1f) !important;
  border:1px solid rgba(255,190,190,.6) !important; color:#fff !important;
  font-weight:900 !important; border-radius:12px !important;
  text-shadow:0 2px 3px rgba(90,0,0,.4) !important;
  box-shadow:none !important;
}
#panel-battlelog .log-clear-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }

/* ═══════════════════════════════════════════════════════════════
   HASTANE — açık mavi tema (diğer panellerle aynı)
   ═══════════════════════════════════════════════════════════════ */
#panel-hospital .overlay-card{
  background:
    linear-gradient(180deg, #1fa3ea, #0e6fc0) !important;
  border:1px solid rgba(190,240,255,.85) !important;
  box-shadow:none !important;
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
  border:1px solid rgba(190,240,255,.3) !important; border-radius:12px !important;
  color:#eaf7ff !important;
}
#panel-hospital .hospital-confirm-btn{
  background:linear-gradient(180deg,#4fd8ff,#1fa3ea) !important;
  border:1px solid rgba(190,240,255,.9) !important; color:#fff !important;
  font-weight:900 !important; border-radius:14px !important;
  text-shadow:0 2px 3px rgba(0,40,70,.5) !important;
  box-shadow:none !important;
}
#panel-hospital .hospital-confirm-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }

/* ═══════════════════════════════════════════════════════════════
   BİRLİK (TROOPS) PANELİ — .uv-viewer kullanır, .overlay-card DEĞİL
   Görsel/istatistik korunur; panel çerçevesi + Eğit butonu temaya.
   ═══════════════════════════════════════════════════════════════ */
#panel-troops{
  border:1px solid rgba(190,240,255,.85) !important;
  box-shadow:none !important;
  border-radius:18px !important; overflow:hidden !important;
}
#panel-troops .troop-train-btn{
  background:linear-gradient(180deg,#ffd257,#f0932b) !important;
  border:1px solid rgba(255,220,150,.7) !important; color:#3a2408 !important;
  font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:900 !important;
  border-radius:14px !important; text-shadow:0 1px 0 rgba(255,255,255,.4) !important;
  box-shadow:none !important;
}
#panel-troops .troop-train-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }
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
    linear-gradient(180deg, #1fa3ea, #0e6fc0) !important;
  border:1px solid rgba(190,240,255,.85) !important;
  box-shadow:none !important;
}
.daily-reward-banner-top{
  font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:900 !important;
  color:#fff !important; text-shadow:0 2px 4px rgba(0,40,70,.6) !important;
}
.daily-reward-sub{ color:#eaf7ff !important; font-weight:800 !important;
  text-shadow:0 1px 2px rgba(0,30,55,.5) !important; }
.daily-reward-close-btn{
  background:linear-gradient(180deg,#4fd8ff,#1fa3ea) !important;
  border:1px solid rgba(190,240,255,.9) !important;
  border-radius:14px !important; color:#fff !important;
  font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:900 !important;
  text-shadow:0 2px 3px rgba(0,40,70,.5) !important;
  box-shadow:none !important;
}
.daily-reward-close-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }

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
  border:1px solid rgba(190,240,255,.5) !important;
  color:#fff !important; font-weight:800 !important;
  border-radius:10px !important;
}
.backup-modal button,
.backup-modal .logout-confirm-btn,
.backup-modal .login-btn{
  font-family:'Baloo 2',sans-serif !important; font-weight:900 !important;
  border-radius:12px !important; color:#fff !important;
  text-shadow:0 2px 3px rgba(0,0,0,.4) !important;
  border:1px solid rgba(190,240,255,.5) !important;
  background:linear-gradient(180deg, #3d7ccc, #1a3a75) !important;
  box-shadow:0 4px 0 #0e2246, inset 0 1px 0 rgba(255,255,255,.28) !important;
}
.backup-modal button:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }
.backup-modal .logout-confirm-btn.yes,
.backup-modal button.danger{
  background:linear-gradient(180deg, #e05a5a, #a81f1f) !important;
  box-shadow:none !important;
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
  border:1px solid rgba(255,220,220,.9) !important;
  box-shadow:none !important;
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
  border:1px solid rgba(255,220,220,.9) !important;
  box-shadow:none !important;
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

function heroChip(name, sv) {
  const img = heroImgOf(name);
  const id = heroIdOf(name);
  const inner = img ? `<img src="${img}" alt="">` : `<span class="rep-hemoji">🦸</span>`;
  /* Arka plan kahraman kartındakiyle aynı görsel (heroes.js) */
  let arka = "";
  try {
    if (typeof heroArkaPlan === "function" && id) {
      arka = `background-image:url('${heroArkaPlan(id)}');background-size:cover;background-position:center;`;
    }
  } catch (e) {}
  /* Yıldızlar: dolu = kahramanın seviyesi. Seviye gelmezse çizilmez. */
  let yildiz = "";
  const n = Math.max(0, Math.min(5, Math.floor(sv || 0)));
  if (n > 0) {
    let s = "";
    for (let i = 0; i < 5; i++) s += `<span class="${i < n ? "rp-y-dolu" : "rp-y-bos"}">★</span>`;
    yildiz = `<div class="rep-hstars">${s}</div>`;
  }
  /* Ölçüler her kahraman için AYRI CSS değişkeninde — ?ayar=1 ile ayarlanır */
  return `<div class="rep-hchip">
    <div class="rep-hpor" data-h="${id}" style="${arka}">${inner}</div>
    ${yildiz}
    <div class="rep-hname">${name}</div>
  </div>`;
}

/* Bir kahraman ADI için seviye — rapor içindeki seviyeler haritasından */
function heroSvOf(name, harita) {
  if (!harita) return 0;
  const id = heroIdOf(name);
  return id && harita[id] != null ? harita[id] : 0;
}

/* ── KARŞILIKLI STATLAR (rapor sayfa 1 üstü) ──────────────────
   Birlik toplamları savaş başındaki değerlerdir: buff ve kahraman
   bonusları uygulandıktan SONRA, tur döngüsünden ÖNCE alınır. */
function statKarsiHTML(r) {
  const s = r && r.statlar;
  if (!s || !s.attacker || !s.defender) return "";
  const A = s.attacker, D = s.defender;

  let out = `<div class="rp-st-liste">`;

  /* ── AİLE BAZINDA DÖKÜM ───────────────────────────────────────
     En baştaki toplam satırları (BİRLİK / SALDIRI / SAVUNMA /
     ÖLDÜRÜCÜLÜK) KALDIRILDI — aynı bilgi aşağıda aile aile veriliyor,
     iki kez yazmak raporu şişiriyordu.

     Kahraman bonusları AYRI SATIR DEĞİL: değerler pvp.js'te savaş
     başında, bonuslar işlendikten SONRA ölçülüyor. Birlik canı %5 +
     kahraman %5 ise buradaki sayı %10'luk hâli taşır.

     Değerler YÜZDE olarak yazılır (Whiteout mantığı): birimin ham
     tabanına göre ne kadar güçlendiği. Ordu büyüklüğü sonucu
     etkilemez. */
  const AILELER = [
    { k: "knight",  ad: "Savunucu" },
    { k: "soldier", ad: "Koruyucu" },
    { k: "robot",   ad: "Nişancı"  }
  ];

  /* Ailenin yüzdesi: SAVAŞTA kullanılan stat ÷ troops.js'teki ham taban.
     Kademeler farklı tabana sahip olduğu için tek tek değil, adetle
     ağırlıklandırılıp toplu oranlanır. Ordu büyüklüğü sadeleşir:
     3 asker de 60 bin asker de aynı yüzdeyi verir. */
  const aileYuzde = (birimler, aile) => {
    let sayi = 0;
    const son = { atk: 0, def: 0, hp: 0, olum: 0 };
    const tab = { atk: 0, def: 0, hp: 0, olum: 0 };
    (birimler || []).forEach(u => {
      if (u.aile !== aile) return;
      const n = Math.max(0, u.sayi || 0);
      if (!n) return;
      sayi += n;
      /* Ham taban kayıtta yoksa (eski raporlar) troops.js'ten okunur;
         yoksa tab 0 kalır ve her satır "+%0" görünürdü. */
      const d = (typeof UNIT_TYPES !== "undefined" && u.unitId) ? (UNIT_TYPES[u.unitId] || {}) : {};
      son.atk  += (u.atk  || 0) * n;  tab.atk  += (u.tatk  || d.attack  || 0) * n;
      son.def  += (u.def  || 0) * n;  tab.def  += (u.tdef  || d.defense || 0) * n;
      son.hp   += (u.hp   || 0) * n;  tab.hp   += (u.thp   || d.hp      || 0) * n;
      son.olum += (u.olum || 0) * n;  tab.olum += (u.tolum || d.olum    || 0) * n;
    });
    if (!sayi) return null;   /* o ailede hiç birlik yok → "—" */
    const oran = (k) => tab[k] > 0 ? Math.round((son[k] / tab[k] - 1) * 1000) / 10 : 0;
    /* DEĞER de döner: birliğin savaşta kullandığı gerçek stat (adetle
       ağırlıklı ortalama). Yalnız yüzde yazılınca bonusu olmayan satır
       "%0" görünüyor, birliğin o statı hiç yokmuş gibi duruyordu. */
    const deger = (k) => Math.round((son[k] / sayi) * 10) / 10;
    return {
      atk: oran("atk"),  def: oran("def"),  hp: oran("hp"),  olum: oran("olum"),
      vAtk: deger("atk"), vDef: deger("def"), vHp: deger("hp"), vOlum: deger("olum")
    };
  };

  AILELER.forEach(ai => {
    const a = aileYuzde(A.birimler, ai.k);
    const d = aileYuzde(D.birimler, ai.k);
    if (!a && !d) return;   /* iki tarafta da yoksa satır yazma */
    [
      { k: "def",  ad: ai.ad + " Savunması"    },
      { k: "atk",  ad: ai.ad + " Saldırısı"    },
      { k: "hp",   ad: ai.ad + " Sağlığı"      },
      { k: "olum", ad: ai.ad + " Öldürücülüğü" }
    ].forEach(st => {
      const av = a ? a[st.k] : null;
      const dv = d ? d[st.k] : null;
      const vk = "v" + st.k.charAt(0).toUpperCase() + st.k.slice(1);
      const aVal = a ? a[vk] : null;
      const dVal = d ? d[vk] : null;
      const nk = (n) => String(n).replace(".", ",");
      /* Bonus VARSA yüzde yazılır. Bonus YOKSA "%0" yerine birliğin
         HAM DEĞERİ yazılır — "%0" satırı, birliğin o statı hiç
         yokmuş gibi gösteriyordu (Savunucu Öldürücülüğü hep %0). */
      const yaz = (v, val) => {
        if (val === null) return "—";
        if (v > 0) return "+%" + nk(v);
        if (v < 0) return "%" + nk(v);
        return "%" + nk(val);
      };
      /* Kıyas SAYI üzerinden: metin kıyaslansaydı "+%468,6" < "+%9"
         çıkar, renkler ters olurdu (Tuzak 49). */
      const ka = (av === null || dv === null) ? "" :
                 (av > dv ? "rp-st-ust" : (av < dv ? "rp-st-alt" : ""));
      const kd = (av === null || dv === null) ? "" :
                 (dv > av ? "rp-st-ust" : (dv < av ? "rp-st-alt" : ""));
      out += `<div class="rp-st-row">
        <span class="rp-st-v ${ka}">${yaz(av, aVal)}</span>
        <span class="rp-st-k">${st.ad}</span>
        <span class="rp-st-v ${kd}">${yaz(dv, dVal)}</span>
      </div>`;
    });
  });

  return out + `</div>`;
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
      <div class="rep-por" data-i="${sira.indexOf(uid)}" data-kad="${(typeof KADEME_NO === "function" ? KADEME_NO(uid) : 1)}">${im}</div>
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
  const AD = { knight: "Savunucu", soldier: "Koruyucu", robot: "Nişancı" };
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
  /* Döküm yoksa bile İSTATİSTİKLER bölümü yazılır — o yüzden burada
     erken çıkılmaz, sadece blok yerine not konur. */
  const bosNot = !ids.length
    ? `<div class="rp-note">Bu savaşta kayıt altına alınmış birlik dökümü yok.</div>` : "";

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
    const kad = (typeof KADEME_NO === "function") ? KADEME_NO(u) : 1;
    const kafa = `<div class="rep-por" data-i="${i}" data-kad="${kad}">${im}</div>`;
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
    ${bosNot}${blok}`;
}

/* İSTATİSTİKLER bölümü — sayfa 1'in EN ALTI, HAYATTA KALANLAR
   özetinin hemen altında. Eskiden sayfanın üstündeydi; oraya
   sığmıyor, satırlar birbirine giriyordu. */
function statBolumuHTML(r) {
  const govde = statKarsiHTML(r);
  if (!govde) return "";
  return `<div class="rp-st-bolum">
      <div class="rp-st-baslik">İSTATİSTİKLER</div>
      ${govde}
    </div>`;
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
  enemy_family_hp_reduce: "familyHp",
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
    /* Pasif engel satırı (pvp.js → yetenekEngeli) kendi sayısını TAŞIR;
       `used` sayaçlarında karşılığı yoktur. */
    const tetik = (typeof m.tetik === "number") ? m.tetik
                : ((k && used && used[k]) ? used[k] : 0);
    const olum = (kills && kills[m.type]) ? kills[m.type] : 0;
    (m.sources || []).forEach(s => {
      const id = s.heroId || "";
      const ad = rpHeroAdi(id, s.heroName);
      const bas = s.title || m.title || m.type;
      if (!harita.has(id)) harita.set(id, { heroId: id, ad: ad, satirlar: [] });
      /* Mağaza güçlendirmeleri (pvp.js → magazaSatirlari) kendi
         görselini ve açıklamasını TAŞIR; HERO_STATS'te karşılıkları
         yoktur, orada aranırsa boş döner. Taşıyorsa onu kullan. */
      harita.get(id).satirlar.push({
        ikon: m.ikon || rpYetenekIkon(id, bas),
        title: bas,
        aciklama: m.aciklama || rpYetenekAciklama(id, bas, s),
        tetik: tetik, olum: olum,
        /* SAYILABİLİR Mİ? Yalnız RP_AB_ANAHTAR'daki beş tür (dondurma,
           yansıma, anında kayıp, periyodik kırma, güç farkı) bir "an"
           yaşar ve sayılabilir. Geri kalanlar (saldırı/savunma/can
           yüzdeleri, yaralı dönüşü, robot güçlendirme) ordu kurulurken
           statlara işlenir; tetiklenme diye bir anları yoktur.
           Onlara "—" yazılınca yetenek ÇALIŞMIYOR sanılıyordu. */
        /* Mağaza buff'ı: şans zarı tuttuysa "✓ Aktif", tutmadıysa "—".
           `sayilir` tam olarak bu ayrımı yapıyor, ayrı alan gerekmez. */
        sayilir: (m.type === "magaza_buff") ? !m.aktif
               : (typeof m.tetik === "number") ? true : !!k
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
            <div class="rp-chips">${(r.attackerCommanders||[]).map(n=>heroChip(n,heroSvOf(n,(r.statlar&&r.statlar.attacker||{}).seviyeler))).join("")||'<span class="rp-dash">—</span>'}</div>
          </div>
          <div class="rp-col">
            <div class="rp-chips">${(r.defenderCommanders||[]).map(n=>heroChip(n,heroSvOf(n,(r.statlar&&r.statlar.defender||{}).seviyeler))).join("")||'<span class="rp-dash">—</span>'}</div>
          </div>
        </div>`:''}

        <div class="rp-div"></div>
        <div class="rp-cols rp-cols-troop">
          <div class="rp-col"><div class="rp-chips">${unitChips(r.attackerTroops)}</div></div>
          <div class="rp-col"><div class="rp-chips">${unitChips(r.defenderTroops)}</div></div>
        </div>

        ${ozetHTML(r)}

        ${statBolumuHTML(r)}

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
      statlar: entry.statlar||null,
      rolTers: false,
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
    statlar: entry.statlar||null,
    rolTers: false,
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
    d.style.cssText="position:fixed;left:10px;right:10px;bottom:10px;z-index:9999;background:#12203a;border:1px solid #4fd8ff;border-radius:14px;padding:12px 14px;font-family:sans-serif;color:#eaf4ff;box-shadow:0 10px 30px rgba(0,0,0,.6)";
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
      border:1px solid rgba(190,240,255,.4); color:#fff;
      font-family:'Baloo 2','Nunito',sans-serif;
      box-shadow:none; }
    #panel-rank .rank-pos{ min-width:36px; text-align:center; font-weight:900; font-size:18px;
      text-shadow:0 1px 3px rgba(0,20,45,.5); }
    #panel-rank .rank-name{ flex:1; font-weight:800; font-size:15px; text-shadow:0 1px 3px rgba(0,20,45,.6);
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    #panel-rank .rank-power{ font-weight:900; font-size:14px; color:#d6f2ff; white-space:nowrap;
      text-shadow:0 1px 3px rgba(0,20,45,.5); }
    #panel-rank .rank-gold{ background:linear-gradient(180deg,#ffd858,#e79c00); border-color:#fff2b0;
      box-shadow:none; }
    #panel-rank .rank-gold .rank-name, #panel-rank .rank-gold .rank-power, #panel-rank .rank-gold .rank-pos{ color:#3a2900; text-shadow:none; }
    #panel-rank .rank-silver{ background:linear-gradient(180deg,#f4f8fc,#c1cddc); border-color:#ffffff;
      box-shadow:none; }
    #panel-rank .rank-silver .rank-name, #panel-rank .rank-silver .rank-power, #panel-rank .rank-silver .rank-pos{ color:#28323f; text-shadow:none; }
    #panel-rank .rank-bronze{ background:linear-gradient(180deg,#e8ad7c,#bc7135); border-color:#ffdcba;
      box-shadow:none; }
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
    linear-gradient(180deg,#1fa3ea,#0e6fc0) !important;
  border:1px solid rgba(190,240,255,.85) !important;
  border-radius:22px !important;
  box-shadow:none !important;
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
  box-shadow:none !important;
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
  background-color:transparent !important;
  border:1px solid rgba(190,240,255,.45) !important;
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
  box-shadow:none !important;
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
  border:1px solid rgba(255,220,150,.7) !important; color:#3a2408 !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:21px !important; line-height:1 !important;
  box-shadow:none !important;
}
#panel-troops .uq-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }
#panel-troops .uq-input{
  width:62px !important; flex:none !important; text-align:center !important;
  padding:8px 4px !important; border-radius:11px !important;
  background:rgba(255,255,255,.18) !important;
  border:1px solid rgba(190,240,255,.7) !important; color:#fff !important;
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
  border:1px solid rgba(255,220,150,.7) !important; color:#3a2408 !important;
  text-shadow:0 1px 0 rgba(255,255,255,.4) !important;
  box-shadow:none !important;
}
#panel-troops .unit-instant-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }
#panel-troops .unit-train-btn{
  background:linear-gradient(180deg,#4fd8ff,#1fa3ea) !important;
  border:1px solid rgba(190,240,255,.9) !important; color:#fff !important;
  text-shadow:0 2px 3px rgba(0,40,70,.5) !important;
  box-shadow:none !important;
}
#panel-troops .unit-train-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }
#panel-troops .utb-top{ font-weight:800 !important; font-size:17px !important; line-height:1.12 !important; }
#panel-troops .utb-sub{ font-weight:700 !important; font-size:12px !important; line-height:1.12 !important; opacity:.9 !important; }

/* ── EĞİTİM SÜRÜYOR ── */
#panel-troops .utb-training{
  flex:1 !important; display:flex !important; flex-direction:column !important;
  align-items:center !important; justify-content:center !important;
  padding:6px 8px !important; border-radius:14px !important;
  background:rgba(4,32,60,.3) !important; border:1px solid rgba(190,240,255,.35) !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:15px !important; color:#dff4ff !important;
}
#panel-troops .unit-train-timer{ font-weight:700 !important; font-size:12.5px !important; opacity:.9 !important; }
#panel-troops .unit-speedup-btn{
  flex:none !important;
  font-family:'Baloo 2','Nunito',sans-serif !important; font-weight:800 !important;
  font-size:13px !important; color:#3a2408 !important;
  background:linear-gradient(180deg,#ffd257,#f0932b) !important;
  border:1px solid rgba(255,220,150,.7) !important; border-radius:12px !important;
  padding:8px 12px !important; cursor:pointer !important;
  box-shadow:none !important;
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
  border:1px solid rgba(190,240,255,.85) !important;
  box-shadow:none !important;
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
  box-shadow:none; backdrop-filter:blur(4px);
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
  background-color:rgba(255,255,255,.08); border:1.5px solid rgba(190,240,255,.4);
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
  width:100%; padding:9px; border:1px solid rgba(190,240,255,.6); border-radius:11px;
  background:linear-gradient(180deg,#4fd8ff,#1fa3ea); color:#fff; cursor:pointer;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:14px;
  text-shadow:0 2px 3px rgba(0,40,70,.5);
  box-shadow:none;
}
.log-open-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none; }

#logReportModal{
  position:fixed; inset:0; z-index:9998; background:rgba(2,8,22,.74);
  display:flex; align-items:center; justify-content:center; padding:16px 12px;
  font-family:'Baloo 2','Nunito',sans-serif;
}
#logReportModal .lrm-box{
  position:relative; width:min(430px,96vw); max-height:86vh; overflow:auto;
  background:
    linear-gradient(180deg,#1fa3ea,#0e6fc0);
  border:1px solid rgba(190,240,255,.85); border-radius:20px;
  padding:14px 14px 18px; color:#fff;
  box-shadow:none;
}
#logReportModal .lrm-close{
  position:absolute; top:10px; right:10px; width:38px; height:38px; border-radius:11px;
  border:1px solid rgba(255,190,190,.75); cursor:pointer;
  background:linear-gradient(180deg,#ff6b6b,#e03131); color:#fff;
  font-size:17px; font-weight:800; line-height:1;
  box-shadow:none;
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
  border:1px solid rgba(190,240,255,.5);
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
  --rp-kenar:.6;   /* --rp-burusuk kaldırıldı: buruşuk kağıt efekti silindi */
  --rp-lif:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23f)' opacity='0.105'/%3E%3C/svg%3E");
}
.rp-box{
  position:relative; width:min(380px,94vw); max-height:88vh;
  overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain;
  touch-action:pan-y;
  border-radius:14px; padding:16px 15px 15px; color:var(--rp-murekkep);
  background-color:var(--rp-kagit);
  /* Buruşuk kağıt taklidi (112° ve -67° çapraz gradyanlar) KALDIRILDI —
     ekranın ortasında gezen açık/koyu bloklar onlardı. Geriye kağıt
     rengi + ince lif dokusu kalıyor.
     background-size artık 2 görsel için 2 ölçü taşıyor; eskiden 4
     görsele 5 ölçü yazılıydı, kayan liste yüzünden zemin gradyanı
     180px'lik karelere bölünüp tekrarlıyordu. */
  background-image:
    var(--rp-lif),
    linear-gradient(168deg, color-mix(in srgb, var(--rp-kagit) 88%, #fff) 0%, var(--rp-kagit) 38%, var(--rp-kagit-alt) 100%);
  background-size:180px 180px, auto;
  border:1px solid color-mix(in srgb, var(--rp-kagit-alt) 76%, #3a2a14);
  box-shadow:none;
}
.rp-box::before{ content:""; position:absolute; inset:3px; border-radius:11px;
  pointer-events:none; border:1px dashed rgba(90,58,24,.22); }
.rp-close{
  position:absolute; top:10px; right:10px; width:34px; height:34px; border:none;
  border-radius:50%; color:#ffe9d8; font-weight:800; font-size:16px; cursor:pointer; z-index:2;
  background:radial-gradient(circle at 35% 30%, color-mix(in srgb,var(--rp-muhur) 70%,#ff9d7a), var(--rp-muhur) 70%);
  box-shadow:none;
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
  border:1px dashed color-mix(in srgb, var(--rp-murekkep) 45%, transparent);
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
  background-color:rgba(255,255,255,.22) !important;
  border:1px solid color-mix(in srgb, var(--rp-murekkep) 45%, transparent) !important;
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
  /* DİKKAT: background kısayolunu YAZMA — kahramanın arka plan
     görseli satır içi stille geliyor, kısayol onu da siler. */
  background-color:#4a3418 !important;
  background-image:linear-gradient(180deg, color-mix(in srgb, var(--rp-kagit-alt) 70%, #6b4a22), #4a3418);
  border-color:color-mix(in srgb, var(--rp-murekkep) 55%, transparent) !important;
  box-shadow:none;
}

/* ── kahraman isimleri kaldırıldı ── */
.rep-hname{ display:none !important; }
/* Kutucuk YAN YANA: portre + yıldızlar. Savunan tarafta ters çevrilir,
   böylece yıldızlar iki tarafta da içe bakar. */
.rep-hchip{
  width:auto !important; gap:6px !important;
  flex-direction:row !important; align-items:center !important;
}
.rp-cols-hero .rp-col:last-child .rep-hchip{ flex-direction:row-reverse !important; }
.rep-hstars{ display:flex; gap:1px; line-height:1; }
.rep-hstars span{ font-size:11px; filter:none; }
.rp-y-dolu{ color:#e0a41f; }
.rp-y-bos{ color:color-mix(in srgb, var(--rp-murekkep) 30%, transparent); }

/* ── KARŞILIKLI STATLAR (sayfa 2'nin en altı) ──
   Kural: sayılar kenara YAPIŞMAZ, ad tek satıra sıkıştırılmaz —
   uzun ad ikinci satıra iner, satır yüksekliği kendiliğinden büyür. */
.rp-st-bolum{ margin:16px 0 2px; }
.rp-st-baslik{
  font-size:11px; font-weight:800; letter-spacing:.6px;
  color:var(--rp-murekkep-2); padding:0 4px 6px;
  border-bottom:1px solid color-mix(in srgb, var(--rp-murekkep) 22%, transparent);
  margin-bottom:4px;
}
.rp-st-liste{
  margin:0; padding:0; background:none; border:none;
  border-radius:10px; overflow:hidden;
  font-family:'Baloo 2','Nunito',sans-serif;
}
.rp-st-row{
  display:flex; align-items:center; gap:8px;
  padding:8px 10px; font-size:13px;
  border-bottom:1px solid color-mix(in srgb, var(--rp-murekkep) 10%, transparent);
}
/* bir koyu bir açık şerit — sayfa 2'deki döküm satırlarıyla aynı dil */
.rp-st-row:nth-child(odd){ background:rgba(255,255,255,.14); }
.rp-st-row:last-child{ border-bottom:0; }
.rp-st-k{
  flex:1 1 auto; min-width:0; text-align:center;
  font-size:11.5px; font-weight:800; line-height:1.2;
  letter-spacing:.2px; color:var(--rp-murekkep-2);
}
.rp-st-v{
  flex:0 0 27%; text-align:center;
  font-weight:800; font-variant-numeric:tabular-nums;
  font-size:14px; color:var(--rp-murekkep);
}
.rp-st-ust{ color:#1f7a34; }
.rp-st-alt{ color:#a33; }
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
    const AD = ["Savunucu", "Koruyucu", "Nişancı", "Rapor kah."];
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
    linear-gradient(180deg, var(--km-1) 0%, var(--km-2) 52%, var(--km-3) 100%) !important;
  border-color:var(--km-kenar) !important;
  box-shadow:none !important;
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
  box-shadow:none !important;
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
  border-top:1px solid var(--km-kenar) !important;
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
  box-shadow:none !important;
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
  border-top:1px solid var(--km-kenar) !important;
  box-shadow:none !important;
}
.dock-btn{ color:var(--km-yazi) !important; }
.dock-icon{ filter:drop-shadow(0 3px 5px rgba(0,5,20,.7)) !important; }

/* ── FÜZE ONAY PANELİ (missile.js) ───────────────────────────
   Eskiden parlak camgöbeği zemin + siyah yazıydı. Zemin koyulaşınca
   yazı ve butonlar da açığa çevrildi, yoksa okunmuyor. */
.msl-confirm-panel{
  background:
    linear-gradient(180deg, var(--km-1) 0%, var(--km-2) 52%, var(--km-3) 100%) !important;
  border:1px solid var(--km-kenar) !important;
  box-shadow:none !important;
}
.msl-confirm-msg{
  color:var(--km-yazi) !important;
  text-shadow:0 2px 4px rgba(0,10,30,.6) !important;
}
.msl-cbtn-ok{
  background:linear-gradient(180deg,#ffd257,#f0932b) !important;
  color:#3a2408 !important;
  box-shadow:none !important;
}
.msl-cbtn-ok:active{ box-shadow:none !important; }
.msl-cbtn-cancel{
  background:rgba(255,255,255,.16) !important;
  color:var(--km-yazi) !important;
  border:1px solid rgba(160,215,255,.4) !important;
  box-shadow:none !important;
}

/* ── BİLDİRİM BALONCUĞU (toast) ─────────────────────────────── */
#toast{
  background:linear-gradient(180deg, var(--km-1), var(--km-2) 55%, var(--km-3)) !important;
  border:1px solid var(--km-kenar) !important;
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
  border:1px solid rgba(170,220,255,.75) !important;
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
  border:1px solid rgba(130,185,245,.75) !important;
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
  border:1px solid rgba(255,220,220,.9) !important;
  box-shadow:none !important;
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

/* Oklar GÖRÜNÜR — kaydırma da bunların tıklamasını tetikler,
   geçiş mantığı tek yerde kalır. Düz biçim: kontur/kabartı yok. */
#heroDetailOverlay #hdPrev,
#heroDetailOverlay #hdNext{
  display:flex !important; align-items:center !important;
  justify-content:center !important;
  top:50% !important; width:24px !important; height:34px !important;
  border:none !important; border-radius:10px !important;
  background:rgba(4,16,38,.45) !important;
  color:#eaf4ff !important; font-family:'Baloo 2','Nunito',sans-serif !important;
  font-size:18px !important; font-weight:800 !important; line-height:1 !important;
  padding:0 !important; box-shadow:none !important;
}
#heroDetailOverlay #hdPrev{ left:4px !important; }
#heroDetailOverlay #hdNext{ right:4px !important; }
#heroDetailOverlay #hdPrev:active,
#heroDetailOverlay #hdNext:active{
  transform:translateY(-50%) scale(.96) !important; filter:brightness(.93) !important;
}
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
/* EŞİK artık görselin yarısı DEĞİL, sabit ve küçük: 40px.
   Eskiden kartın yarısı kadar sürüklemek gerekiyordu. */
const ESIK = 40;
function esik() { return ESIK; }

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
  if (Math.abs(dx) < esik()) return;
  if (Math.abs(dx) < Math.abs(dy) * DIKEY_PAY) return;

  const btn = o.querySelector(dx < 0 ? "#hdNext" : "#hdPrev");
  if (!btn) return;

  /* Sönme YOK. Eskiden opacity 0'a çekilip 120ms sonra geçiliyordu;
     kart o sırada baştan kuruluyordu ve "kapanıp açılıyor" gibi
     görünüyordu. Artık yalnız içerik değişiyor, geçiş kesintisiz. */
  btn.click();
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
/* Panel yukarı alındı: üstteki pay küçüldü, alttaki büyüdü.
   Böylece köşeye taşan ✕ düğmesine yer kalıyor, kırpılmıyor. */
#battleArena{
  align-items:center !important;
  justify-content:center !important;
  padding:26px 12px 104px !important;
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
   (box-shadow:none;
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
/*  KIRPMA KALDIRILDI. Buradaki overflow-y:auto, kutunun YATAYDA da
    kırpmasına yol açıyordu: kahraman kartlarının köşesindeki −
    düğmesi kutunun dışına taşar ve sağdaki kartta kesiliyordu.
    Kaydırma zaten gerekmiyor — panelin iç boşlukları kısaltıldıktan
    sonra içerik ekrana sığıyor.                                    */
#battleArena .troop-select-box{
  flex:1 1 auto !important; min-height:0 !important;
  width:100% !important; overflow:visible !important;
}
#battleArena #mapBackBtn{
  top:-15px !important; right:-13px !important;
  border-radius:12px !important;
  box-shadow:none !important;
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
  background:rgba(255,255,255,.06) !important;
  border:1px solid rgba(190,240,255,.20) !important;
  box-shadow:none !important;
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
  border:none;
  color:#fff; font-family:'Baloo 2','Nunito',sans-serif;
  font-weight:800; font-size:17px; line-height:1;
  text-shadow:0 1px 2px rgba(0,20,45,.55);
  box-shadow:none;
  transition:transform .09s, filter .09s;
  -webkit-tap-highlight-color:transparent; touch-action:none; user-select:none;
}
#troopSelectList .t-step:active{ transform:scale(.96); filter:brightness(.93); }

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
  border-top:1px solid var(--km-kenar) !important;
  overflow-y:auto !important;
  scrollbar-width:none !important;
}
#panel-battlelog .overlay-card::-webkit-scrollbar,
#panel-rank .overlay-card::-webkit-scrollbar{ width:0 !important; display:none !important; }

/* ── KAHRAMAN ÇIKARMA: kare ✕ yerine yuvarlak − , köşeye taşkın ──
   Yuva overflow:hidden'dı, düğme kırpılıyordu; portrenin kendisine
   köşe yarıçapı verilip yuva serbest bırakıldı. */
#heroPicker, #heroPicker .hpk-slots, #heroPicker .hpk-slot{ overflow:visible !important; }
/* Satırın iç boşluğu buradan KALDIRILDI — artık heroes.js → HPK_YUVA
   (pay_yan / pay_ust) tek sahibi. İki yerde tutulursa ayrışır. */
#heroPicker .hpk-slot .hpk-portrait{ border-radius:12px !important; }
#heroPicker .hpk-x{
  top:-9px !important; right:-9px !important;
  width:28px !important; height:28px !important;
  border-radius:50% !important;
  border:1px solid rgba(255,225,225,.45) !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  font-size:0 !important; line-height:0 !important;
  box-shadow:none !important;
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
  background:#0e141c; border:1px solid #2f5f7a; border-radius:14px;
  color:#e8f3ff; font-family:'Baloo 2',sans-serif; font-size:13px;
  box-shadow:none; overflow:hidden;
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
  background-color:rgba(255,255,255,.22) !important;
  border:1px solid color-mix(in srgb, var(--rp-murekkep) 45%, transparent) !important;
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
  box-shadow:none;
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
  border:1px solid #ffd9a1 !important; border-radius:11px;
  padding:5px 11px; cursor:pointer;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:13px;
  color:#fff !important;
  background:linear-gradient(180deg,#f7a83a 0%,#e2820f 55%,#b95f06 100%) !important;
  box-shadow:none !important;
  text-shadow:0 1px 2px rgba(90,40,0,.55);
}
.log-gift-btn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none !important; }
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
  border:1px solid rgba(190,240,255,.4) !important;
  box-shadow:none !important;
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
  box-shadow:none !important;
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
  box-shadow:none !important;
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
   DÜĞME SADELEŞTİRME + KAYNAK GEREKSİNİMİ
   1) Kalın 3B alt kenar (0 4px 0 / 0 5px 0) tüm ortak düğmelerden
      kaldırıldı: birlik "Anında"/"Üret", hastane "Tedaviyi Onayla",
      kahraman "Satın Al", günlük ödül kapat, günlük "Aç", can potu,
      "Devam" ve giriş ekranı "Giriş Yap".
      Basınca zıplama yok; yerine hafif koyulaşma var.
   2) Rol düğmesi seçilince büyümüyor/kaymıyor.
   3) Adet çubuğu (− / kutu / +) SOLA yaslandı; kaynak gereksinimi
      aynı satırda, hemen sağında. Zemin, kutu, çerçeve YOK —
      sadece emoji + sayı.
   Bu blok dosyanın SONUNDA olduğu için önceki tanımları ezer.
   ══════════════════════════════════════════════════════════════ */
(function dugmeSadeVeKaynak(){
"use strict";
const st = document.createElement("style");
st.id = "temaDugmeSadeKaynak";
st.textContent = `

/* ── 1) 3B kenar yok ── */
#panel-troops .unit-instant-btn{ box-shadow:none !important; }
#panel-troops .unit-speedup-btn{ box-shadow:none !important; }
#panel-troops .uq-btn{ box-shadow:none !important; }
#panel-troops .unit-speedup-btn:active,
#panel-troops .uq-btn:active{
  transform:none !important;
  box-shadow:none !important;
  filter:brightness(.94) !important;
}
#panel-troops .unit-train-btn,
#panel-hospital .hospital-confirm-btn,
#heroDetailOverlay #hdBuyBtn,
.daily-reward-close-btn,
.log-open-btn,
.stamina-potion-popup .spp-btn,
#welcomeBack .wc-next,
#loginScreen .login-btn{
  box-shadow:0 2px 6px rgba(0,20,45,.32) !important;
}
#panel-troops .unit-instant-btn:active,
#panel-troops .unit-train-btn:active,
#panel-hospital .hospital-confirm-btn:active,
#heroDetailOverlay #hdBuyBtn:active,
.daily-reward-close-btn:active,
.log-open-btn:active,
.stamina-potion-popup .spp-btn:active,
#welcomeBack .wc-next:active,
#loginScreen .login-btn:active{
  transform:none !important;
  box-shadow:0 1px 3px rgba(0,20,45,.3) !important;
  filter:brightness(.94) !important;
}

/* ── 2) Rol düğmeleri: ÇERÇEVESİZ ──
   Kutu, zemin ve gölge kalktı; sadece emoji + yazı duruyor.
   Bir tık daha sola ve bir tık daha küçük. Seçili olan artık
   çerçeveyle değil, SARI yazı ve tam parlaklıkla belli oluyor. */
#panel-troops .uv-roles{ left:2px !important; gap:4px !important; }
#panel-troops .uv-role,
#panel-troops .uv-role.is-active{
  width:44px !important; height:44px !important;
  background:none !important; background-color:transparent !important;
  border:0 !important; box-shadow:none !important;
  transform:none !important;
  transition:opacity .15s, color .15s !important;
  opacity:.75 !important;
}
#panel-troops .uv-role.is-active{ opacity:1 !important; }
#panel-troops .uv-role.is-active .uvr-txt{ color:#ffd257 !important; }

/* ── 3) ADET ÇUBUĞU SOLA YASLI + KAYNAK AYNI SATIRDA ──
   Alta düşme sorunu: satır flex-wrap:wrap ve kaynak kutusu kendi
   doğal genişliğini istiyordu; rakam bir hane büyüyünce (24→30)
   satır taşıp alta atlıyordu. Çözüm flex:1 1 0 — kaynak kutusu
   ARTAN yeri alır, kendi genişliğini dayatmaz, asla taşırmaz.
   İçerideki üç kaynak da kalan yere eşit dağılır, çerçeve dolu
   kullanılmış olur. */
#panel-troops .unit-qty-bar{
  justify-content:flex-start !important;
  align-items:center !important;
  gap:5px !important;
  margin:8px 6px 0 !important;
}
#panel-troops .uq-input{ width:46px !important; }
#panel-troops .uv-res{
  flex:1 1 0 !important; min-width:0 !important;
  display:flex !important; align-items:center !important;
  justify-content:space-evenly !important;
  gap:4px !important; margin-left:6px !important;
  background:none !important; background-color:transparent !important;
  border:0 !important; box-shadow:none !important; padding:0 !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  pointer-events:none !important;
  white-space:nowrap !important;
}
#panel-troops .uv-res-oge{
  display:flex !important; align-items:center !important; gap:4px !important;
  background:none !important; background-color:transparent !important;
  border:0 !important; box-shadow:none !important; padding:0 !important;
  border-radius:0 !important;
}
#panel-troops .uv-res .uvr-em{
  font-size:16px !important; line-height:1 !important;
  background:none !important; border:0 !important;
}
#panel-troops .uv-res .uvr-mik{
  font-size:14px !important; font-weight:800 !important; color:#fff !important;
  text-shadow:0 1px 2px rgba(0,25,50,.7) !important;
  white-space:nowrap !important;
  background:none !important; border:0 !important;
}
/* kaynağı yetmeyen satır */
#panel-troops .uv-res-oge.yok .uvr-mik{ color:#ff8a8a !important; }
`;
document.head.appendChild(st);
})();

/* ══════════════════════════════════════════════════════════════
   HIZLANDIRMA PENCERESİ — İNCELTME
   Başlık, "Hızlandırma" etiketi ve "Hızlandırma Süresi" satırı
   index.html'den TAMAMEN silindi (gizlenmedi). Burada kalanlar:
   dış çerçevenin 3B kabartması, düğmelerin kalın alt kenarı,
   iç boşluklar ve fontlar.
   Yeşil çubuk artık canlı doluyor (hesabı index.html'de).
   ══════════════════════════════════════════════════════════════ */
(function hizlandirPenceresiSade(){
"use strict";
const st = document.createElement("style");
st.id = "temaHizlandirSade";
st.textContent = `

/* pencere gövdesi: 3B kabartma yok, daha dar */
.hosp-speed-modal .hsm-card{
  max-width:320px !important;
  padding:14px 12px 12px !important;
  border-width:1px !important;
  box-shadow:none !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
}
.hosp-speed-modal, .hosp-speed-modal *{
  font-family:'Baloo 2','Nunito',sans-serif !important;
}

/* süre çubuğu: kapatma düğmesinin altına girmesin */
.hosp-speed-modal .hsm-bar{
  margin:2px 0 10px !important;
  width:calc(100% - 52px) !important;
}
.hosp-speed-modal .hsm-bar-fill{
  width:0%; transition:width .5s linear !important;
}
.hosp-speed-modal .hsm-bar-txt{
  text-shadow:none !important; -webkit-text-stroke:0 !important;
  font-weight:800 !important;
}

/* "5 dk" kutucuğu: dış 3B yok, biraz küçük, görsel kutuyu doldurur */
.hosp-speed-modal .hsm-cards{ margin:0 0 4px !important; }
.hosp-speed-modal .hsm-card-item{
  flex:0 0 64px !important; height:64px !important;
  box-shadow:none !important;
  border-radius:12px !important;
  overflow:hidden !important;
  padding:0 !important;
}
.hosp-speed-modal .hsm-card-item.is-active{
  box-shadow:0 0 0 2px rgba(255,210,87,.35) !important;
}
.hosp-speed-modal .hsm-ci-img{
  position:absolute !important; inset:0 !important;
  width:100% !important; height:100% !important;
  object-fit:cover !important; display:block !important;
  pointer-events:none !important;
}
/* sahip olunan adet: beyaz, okunaklı, ezik değil */
.hosp-speed-modal .hsm-ci-count{
  right:5px !important; bottom:3px !important;
  color:#fff !important; font-size:13px !important; font-weight:800 !important;
  letter-spacing:.2px !important; line-height:1.1 !important;
  text-shadow:0 1px 3px rgba(0,10,30,.95), 0 0 6px rgba(0,10,30,.8) !important;
}

/* mağazadaki sarı kutu: görsel varsa kutuyu komple doldurur */
.shop-card2 .sc-icon .sc-img,
.bd-buy-icon .sc-img{
  width:100% !important; height:100% !important;
  object-fit:cover !important; display:block !important;
  border-radius:8px !important; position:relative !important;
}

/* − ve + : 3B yok */
.hosp-speed-modal .hsm-pick{ margin-top:10px !important; }
.hosp-speed-modal .hsm-step{
  box-shadow:none !important;
}
.hosp-speed-modal .hsm-step:active{
  transform:none !important;
  box-shadow:none !important;
  filter:brightness(.94) !important;
}

/* eylem düğmeleri: ince, çerçevesiz, 3B'siz */
.hosp-speed-modal .hsm-actions{ margin-top:10px !important; gap:8px !important; }
.hosp-speed-modal .hsm-btn{
  padding:6px 6px !important; border:0 !important;
  border-radius:10px !important; letter-spacing:.4px !important;
  box-shadow:none !important;
  text-shadow:none !important;
}
.hosp-speed-modal .hsm-finish{ font-size:15px !important; }
.hosp-speed-modal .hsm-finish small{ font-size:13px !important; text-shadow:none !important; }
.hosp-speed-modal .hsm-use{ font-size:14px !important; }
.hosp-speed-modal .hsm-quick{
  margin-top:8px !important; font-size:14px !important; padding:6px !important;
}
.hosp-speed-modal .hsm-btn:active{
  transform:none !important;
  box-shadow:none !important;
  filter:brightness(.94) !important;
}
`;
document.head.appendChild(st);
})();

/* ══════════════════════════════════════════════════════════════
   "BİRLİKLER" SEKMESİ — SADELEŞTİRME
   1) Sekme çubuğunun arkasındaki koyu mavi hap kalktı; sadece
      seçili sekmenin beyaz kalıbı duruyor.
   2) Birlik satırlarının kutusu kalktı (zemin + 3B alt kenar).
      Satırlar arası ince bir çizgi kaldı, hepsi birbirine
      girmesin diye.
   3) Rakamın başındaki "x" troops.js'te silindi; buradaki kalın
      koyu kontur (text-stroke + 8 yönlü gölge) da kaldırıldı.
   4) Birlik adı: Baloo 2, büyük harf, düz beyaz — konturu yok.
   5) GÖRSEL: tam boy değil, sadece KAFA. Görsel büyütülüp üstten
      hizalanıyor, kutu taşanı kırpıyor.
      Kafa ortalanmıyorsa iki değişkeni oynat:
        --tp-kafa    → yakınlaştırma (büyütürsen daha yakın)
        --tp-kafa-y  → dikey odak (küçültürsen daha yukarı)
      Robotun kafası diğerlerinden yukarıda, onun için ayrı değer.
   6) "Geliştir": 3B alt kenar ve yazıdaki kalın kontur kaldırıldı.
   ══════════════════════════════════════════════════════════════ */
(function birliklerSekmesiSade(){
"use strict";
const st = document.createElement("style");
st.id = "temaBirliklerSade";
st.textContent = `

/* ── 1) Sekme çubuğu: arka hap yok ── */
#panel-troops .tp-tabs{
  background:none !important; background-color:transparent !important;
  border:0 !important; box-shadow:none !important;
  backdrop-filter:none !important;
  padding:3px 0 !important;
}
#panel-troops .tp-tab,
.tp-tab{
  background:none !important; background-color:transparent !important;
  border:0 !important; box-shadow:none !important;
  color:rgba(255,255,255,.72) !important; text-shadow:none !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:15px !important;
  letter-spacing:.2px !important;
}
#panel-troops .tp-tab.active,
.tp-tab.active{
  background:#fff !important; background-color:#fff !important;
  color:#0e6fc0 !important;
  box-shadow:none !important;
}

/* ── 2) Birlik satırı: kutu yok ── */
#panel-troops .tp-row{
  background:none !important; background-color:transparent !important;
  border:0 !important;
  box-shadow:none !important;
  border-radius:0 !important;
  padding:4px 6px !important;
  border-bottom:1px solid rgba(190,240,255,.14) !important;
}
#panel-troops .tp-row:last-child{ border-bottom:0 !important; }

/* ── 3) Rakam: kontur yok ── */
#panel-troops .tp-count{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:23px !important;
  color:#fff !important;
  -webkit-text-stroke:0 !important;
  text-shadow:0 1px 3px rgba(0,20,45,.5) !important;
  letter-spacing:.3px !important;
}

/* ── 4) Birlik adı ── */
#panel-troops .tp-name{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:15px !important;
  text-transform:uppercase !important; letter-spacing:1.1px !important;
  color:#cdeeff !important;
  text-shadow:0 1px 3px rgba(0,20,45,.5) !important;
}

/* ── 5) KAFA: eğitim ekranındaki portre kutusunun AYNISI ──
   Yuvarlak değil, köşeleri yumuşak kare + ince çerçeve.
   Kırpma değerleri .uv-portrait ile birebir aynı alındı, böylece
   iki ekranda kafalar tıpatıp aynı duruyor. */
#panel-troops .tp-img{
  flex:0 0 44px !important; width:44px !important; height:44px !important;
  display:block !important;
  overflow:hidden !important;
  border-radius:12px !important;
  background:transparent !important;
  border:1px solid rgba(190,240,255,.45) !important;
  box-shadow:none !important;
}
#panel-troops .tp-img img{
  height:auto !important; display:block !important;
  object-fit:unset !important; transform:none !important;
  filter:none !important; pointer-events:none !important;
}
#panel-troops .tp-row[data-unit="knight"] .tp-img img{
  width:150% !important; margin:-29% 0 0 -26% !important;
}
#panel-troops .tp-row[data-unit="soldier"] .tp-img img{
  width:130% !important; margin:-16% 0 0 -21% !important;
}
#panel-troops .tp-row[data-unit="robot"] .tp-img img{
  width:140% !important; margin:-10% 0 0 -18% !important;
}

/* ── 5b) Satırlar biraz daha sola ── */
#panel-troops .tp-screen{ padding-left:6px !important; padding-right:10px !important; }
#panel-troops .tp-list{ padding-left:0 !important; }
#panel-troops .tp-row{ padding-left:2px !important; }

/* ── 6) Geliştir düğmesi ── */
#panel-troops .tp-up{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:12.5px !important;
  color:#fff !important;
  text-shadow:0 1px 2px rgba(0,40,20,.45) !important;
  -webkit-text-stroke:0 !important;
  box-shadow:none !important;
  border:0 !important;
}
#panel-troops .tp-up:active{
  transform:none !important;
  box-shadow:none !important;
  filter:brightness(.94) !important;
}
`;
document.head.appendChild(st);
})();

/* ══════════════════════════════════════════════════════════════
   3B KATMAN TEMİZLİĞİ + DOKUNMA TEPKİSİ
   1) Birlik paneli ve mağaza panelinin çerçevesindeki kabartma
      (kalın açık kenar + üstteki beyaz `inset` çizgi) kaldırıldı.
      Çerçeve inceldi, gölge yumuşadı.
   2) Mağaza kartlarının 3B alt kenarı ve iç kabartması kalktı.
   3) Mağaza yazılarındaki 8 yönlü koyu kontur kaldırıldı; yerine
      tek, ince bir gölge kaldı. Rakamlar artık "kabartma" değil.
   4) DOKUNMA TEPKİSİ: basılan düğme/kart içindeki görselle
      birlikte hafifçe küçülüp koyulaşıyor (.96 ölçek, 90 ms).
      Görsel ayrı bir katman değil, kutunun içinde olduğu için
      ölçek onu da kapsıyor — "baskı uygulanmış" hissi buradan
      geliyor. Değeri sertleştirmek istersen .96'yı düşür.
   ══════════════════════════════════════════════════════════════ */
(function ucBoyutTemizligi(){
"use strict";
const st = document.createElement("style");
st.id = "temaUcBoyutTemizlik";
st.textContent = `

/* ── 1) PANEL ÇERÇEVELERİ ── */
#panel-troops .uv-viewer,
#panel-shop .overlay-card{
  border-width:2px !important;
  border-color:rgba(190,240,255,.5) !important;
  box-shadow:none !important;
}
#panel-shop .overlay-card{
  border-top-width:2px !important;
}

/* ── 2) MAĞAZA KARTLARI ── */
.shop-card2{
  box-shadow:none !important;
}
.shop-card2 .sc-icon{
  box-shadow:none !important;
}
.shop-card2 .sc-icon::before{ display:none !important; }
.shop-card2 .sc-price{
  box-shadow:none !important;
}

/* ── 3) MAĞAZA YAZILARI: kontur yok ── */
.shop-card2 .sc-left,
.shop-card2 .sc-price,
.shop-card2 .sc-tag,
.shop-card2 .sc-badge,
#panel-shop .shop-tier-header{
  -webkit-text-stroke:0 !important;
  text-shadow:0 1px 2px rgba(0,20,45,.55) !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
}

/* ── 4) DOKUNMA TEPKİSİ ── */
.shop-card2,
.hosp-speed-modal .hsm-card-item,
#panel-troops .uv-portrait,
#panel-troops .tp-up,
#panel-troops .uq-btn,
.hosp-speed-modal .hsm-step,
.hosp-speed-modal .hsm-btn{
  transition:transform .09s ease, filter .09s ease !important;
  -webkit-tap-highlight-color:transparent;
}
.shop-card2:active,
.hosp-speed-modal .hsm-card-item:active,
#panel-troops .uv-portrait:active,
#panel-troops .tp-up:active,
#panel-troops .uq-btn:active,
.hosp-speed-modal .hsm-step:active,
.hosp-speed-modal .hsm-btn:active{
  transform:scale(.96) !important;
  filter:brightness(.93) !important;
}
/* "Anında" ve "Üret": aynı tepki, zıplama yok */
#panel-troops .unit-instant-btn,
#panel-troops .unit-train-btn,
#panel-troops .unit-speedup-btn{
  transition:transform .09s ease, filter .09s ease !important;
}
#panel-troops .unit-instant-btn:active,
#panel-troops .unit-train-btn:active,
#panel-troops .unit-speedup-btn:active{
  transform:scale(.97) !important;
  filter:brightness(.93) !important;
}
/* ── 5) SATIN AL PENCERESİ ── */
.bd-buy-box{
  border-width:2px !important;
  border-color:rgba(160,215,255,.5) !important;
  box-shadow:none !important;
}
.bd-buy-head{
  border-bottom-width:1px !important;
  text-shadow:0 1px 2px rgba(0,15,40,.55) !important;
}
.bd-buy-icon{
  box-shadow:none !important;
  overflow:hidden !important;
}
.bd-buy-name,
.bd-buy-desc,
.bd-qnum,
.bd-buy-go,
.bd-qmax,
.bd-qbtn{
  text-shadow:0 1px 2px rgba(0,15,40,.5) !important;
  -webkit-text-stroke:0 !important;
}
.bd-buy-go{ text-shadow:none !important; }
.bd-qbtn,
.bd-qmax,
.bd-buy-go{
  box-shadow:none !important;
  border-width:0 !important;
}
.bd-buy-x{ box-shadow:none !important; }
.bd-qbtn,
.bd-qmax,
.bd-buy-go,
.bd-buy-x{
  transition:transform .09s ease, filter .09s ease !important;
  -webkit-tap-highlight-color:transparent;
}
.bd-qbtn:active,
.bd-qmax:active,
.bd-buy-go:active,
.bd-buy-x:active{
  transform:scale(.96) !important;
  box-shadow:none !important;
  filter:brightness(.93) !important;
}
/* ── 6) HASTANE: birlik listesiyle aynı sadelik ── */
#panel-hospital .overlay-card{
  border-width:2px !important;
  border-color:rgba(190,240,255,.5) !important;
  box-shadow:none !important;
}
#panel-hospital .hospital-heal-card,
#panel-hospital .hospital-queue-card{
  background:none !important; background-color:transparent !important;
  border:0 !important; box-shadow:none !important; border-radius:0 !important;
  padding:6px 2px !important;
  border-bottom:1px solid rgba(190,240,255,.14) !important;
}
#panel-hospital .hospital-heal-card:last-child,
#panel-hospital .hospital-queue-card:last-child{ border-bottom:0 !important; }

/* yaralı sayısı: kırmızı, okunaklı */
#panel-hospital .t-count{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:19px !important;
  color:#ff6b6b !important;
  -webkit-text-stroke:0 !important;
  text-shadow:0 1px 3px rgba(0,20,45,.55) !important;
  letter-spacing:.2px !important;
}
#panel-hospital .hospital-heal-top{ margin-bottom:2px !important; }

/* yazılar tek font, kontursuz */
#panel-hospital .hq-input,
#panel-hospital .hq-max,
#panel-hospital .hospital-queue-title,
#panel-hospital .hospital-confirm-btn{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  -webkit-text-stroke:0 !important;
  text-shadow:0 1px 2px rgba(0,20,45,.5) !important;
}
#panel-hospital .hospital-confirm-btn{ text-shadow:none !important; border:0 !important; }
#panel-hospital .hospital-confirm-btn,
#panel-hospital .hospital-speed-btn{
  box-shadow:none !important;
  transition:transform .09s ease, filter .09s ease !important;
}
#panel-hospital .hospital-confirm-btn:active,
#panel-hospital .hospital-speed-btn:active{
  transform:scale(.96) !important;
  box-shadow:none !important;
  filter:brightness(.93) !important;
}
/* tedavide olanlar: adet kırmızı, isim yok */
#panel-hospital .hosp-adet{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:19px !important;
  color:#ff6b6b !important; background:none !important;
  border:0 !important; padding:0 !important; margin:0 !important;
  -webkit-text-stroke:0 !important;
  text-shadow:0 1px 3px rgba(0,20,45,.55) !important;
}
#panel-hospital .hospital-heal-total-time{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  -webkit-text-stroke:0 !important;
  text-shadow:0 1px 2px rgba(0,20,45,.5) !important;
}
#panel-hospital .hosp-queue-row{
  background:none !important; border:0 !important; box-shadow:none !important;
  border-bottom:1px solid rgba(190,240,255,.14) !important;
  border-radius:0 !important; padding:6px 2px !important;
}
#panel-hospital .hosp-queue-row:last-child{ border-bottom:0 !important; }
`;
document.head.appendChild(st);
})();

/* ═══════════════════════════════════════════════════════════════
   SAVAŞ / CANAVAR / ARAZİ PANELLERİ — ORTAK GÖRÜNÜM DÜZENİ

   Üç panel de #battleArena id'sini kullanır. Yerleşim kuralları
   ORTAKTIR; ayrılan tek şey düğme rengidir:
     arazi (data-arazi="1") → TURUNCU
     savaş / canavar        → KIRMIZI
   Düğme biçimi (dar kutu, 3B alt kenar yok, basınca küçülme)
   üçünde de aynıdır.
   ═══════════════════════════════════════════════════════════════ */
(function savasPanelDuzen(){
  const st = document.createElement("style");
  st.id = "savasPanelDuzenStyle";
  st.textContent = `

/* 1) Panelin ekrandaki yeri — alt sınırı kahraman menüsüyle aynı hizada */
#battleArena{ padding:65px 12px 53px !important; }

/* 2) Üst kenar ✕'i içine alacak kadar uzun, ✕ tamamen içeride */
#battleArena .battle-arena{ padding-top:42px !important; }
#battleArena #mapBackBtn{
  top:0px !important; right:6px !important;
  width:36px !important; height:36px !important;
  border-radius:10px !important;
  box-shadow:none !important;
}
#battleArena #mapBackBtn::after{ font-size:20px !important; }

/* 3) Birlik satırları aşağı alındı */
#battleArena #troopSelectList{ margin-top:12px !important; }

/* 4) Kum saati satırı düğmeye yaklaştırıldı (yalnız arazi panelinde var) */
#battleArena .arazi-sure-satir{ margin:-13px 0 -4px !important; }

/* 5) DÜĞME BİÇİMİ — üç panelde de ortak.
      Kalın 3B alt kenar (box-shadow:none; oyunun düz/sade kuralı. */
#battleArena .battle-arena .battle-btn{
  color:#fff !important;
  font-size:15px !important;
  padding:7px 24px !important;
  border-radius:13px !important;
  box-shadow:none !important;
  text-shadow:0 1px 2px rgba(0,20,45,.55) !important;
  -webkit-text-stroke:0 !important;
  transition:transform .09s, filter .09s !important;
}
#battleArena .battle-arena .battle-btn:active{
  transform:scale(.96) !important;
  filter:brightness(.93) !important;
  box-shadow:none !important;
}

/* 6) RENK — tek ayrılan yer */
/* savaş ve canavar: KIRMIZI */
#battleArena .battle-arena .battle-btn{
  background:linear-gradient(180deg,#ff3b3b,#c50f0f) !important;
  border:1px solid rgba(255,170,170,.75) !important;
}
/* arazi toplama: TURUNCU */
#battleArena[data-arazi="1"] .battle-arena .battle-btn{
  background:linear-gradient(180deg,#ffa62e,#e8720d) !important;
  border:1px solid rgba(255,220,175,.7) !important;
}

/* 7) Kahraman kartındaki çıkarma düğmesi — her ekranda küçük */
#heroPicker .hpk-x{
  top:-7px !important; right:-7px !important;
  width:22px !important; height:22px !important;
  border-width:1px !important;
  box-shadow:none !important;
}
#heroPicker .hpk-x::before{ font-size:17px !important; }
`;
  document.head.appendChild(st);
})();

/* ── ÇANTA GÖRSELLERİ ──
   Mağazadaki .sc-img kuralı yalnız .shop-card2 kabına yazılıydı;
   çanta .icon-box kullandığı için görsel boyutsuz kalıyor ve
   kutuya sığmayıp kırpılıyordu. */
(function () {
  const s = document.createElement("style");
  s.textContent =
    "#panel-inventory .icon-box{ position:relative; overflow:hidden; }" +
    "#panel-inventory .icon-box .sc-img{" +
    "  width:100%; height:100%; object-fit:cover;" +
    "  display:block; border-radius:8px; position:relative;" +
    "}";
  document.head.appendChild(s);
})();
/* ── ÇANTA SADELEŞTİRME ── */
(function () {
  const s = document.createElement("style");
  s.textContent =
    /* elmas bilgi kutusu gitsin */
    "#panel-inventory .inv-summary{ display:none !important; }" +
    /* kalın 3B alt kenar yerine tek yumuşak gölge */
    "#panel-inventory .inv-card," +
    "#panel-inventory .shop-card," +
    "#panel-inventory .inv-row{" +
    "  box-shadow:none !important;" +
    "  position:relative !important;" +
    "  padding:8px 6px 8px !important;" +
    "  aspect-ratio:1 / 1.12 !important;" +
    "  overflow:hidden !important;" +
    "}" +
    /* adet kutucuğun İÇİNDE, altta ortalı */
    "#panel-inventory .card-right{" +
    "  position:static !important;" +
    "  width:100% !important; margin-top:4px !important;" +
    "  display:flex !important; justify-content:center !important;" +
    "}" +
    /* yazı konturu yok, tek ince gölge */
    "#panel-inventory .qty{" +
    "  font-size:15px !important;" +
    "  text-shadow:0 1px 2px rgba(0,20,45,.55) !important;" +
    "}" +
    /* isim yazısı gitsin, sadece adet kalsın */
    "#panel-inventory .item-name{ display:none !important; }" +
    /* boş kalan orta kutu yer kaplamasın */
    "#panel-inventory .card-mid{ display:none !important; }" +
    "#panel-inventory .inv-card," +
    "#panel-inventory .shop-card{ gap:2px !important; }";
  document.head.appendChild(s);
})();
/* ═══════════════════════════════════════════════════════════════
   SAVAŞ GÜNLÜĞÜ — 3B TEMİZLİĞİ
   Görünüm kuralı: kalın alt kenar, kontur, inset kabartı ve
   zıplayan basma tepkisi yok. Eski satırlar silinmedi; dosyanın
   sonundaki bu blok aynı özgüllükle ezer.
   ═══════════════════════════════════════════════════════════════ */
(function gunlukDuzles() {
  const st = document.createElement("style");
  st.id = "gunlukDuzStil";
  st.textContent = `
/* Panelin kendisi: radial parlaklık, 3px çerçeve ve dış ışıma yok */
#panel-battlelog .overlay-card{
  background:linear-gradient(180deg, var(--km-1, #1fa3ea), var(--km-3, #0e6fc0)) !important;
  border:1px solid rgba(190,240,255,.20) !important;
  box-shadow:none !important;
}
#panel-battlelog h2{
  text-shadow:0 1px 2px rgba(0,20,45,.55) !important;
  -webkit-text-stroke:0 !important;
}
#panel-battlelog .desc{ text-shadow:0 1px 2px rgba(0,20,45,.55) !important; }

/* Kayıt kartı: kutu içinde kutu yok — sadece ayırıcı çizgi */
#panel-battlelog .log-entry{
  background:none !important;
  border:none !important;
  border-bottom:1px solid rgba(190,240,255,.14) !important;
  border-radius:0 !important;
  box-shadow:none !important;
  padding-left:0 !important;
}
#panel-battlelog .log-entry.log-win,
#panel-battlelog .log-entry.log-loss{ border-left:none !important; }

/* Aç düğmesi: kalın alt kenar ve inset kalktı */
#panel-battlelog .log-open-btn{
  background:linear-gradient(180deg,#4fd8ff,#1fa3ea) !important;
  border:none !important;
  box-shadow:none !important;
  text-shadow:0 1px 2px rgba(0,20,45,.55) !important;
  transition:transform .09s, filter .09s !important;
}
#panel-battlelog .log-open-btn:active{
  transform:scale(.96) !important; filter:brightness(.93) !important;
  box-shadow:none !important;
}

/* Ödül düğmesi: aynı sadeleştirme, rengi korunuyor */
#panel-battlelog .log-gift-btn{
  background:linear-gradient(180deg,#f7a83a,#c86a08) !important;
  border:none !important;
  box-shadow:none !important;
  text-shadow:0 1px 2px rgba(0,20,45,.55) !important;
  transition:transform .09s, filter .09s !important;
}
#panel-battlelog .log-gift-btn:active{
  transform:scale(.96) !important; filter:brightness(.93) !important;
  box-shadow:none !important;
}
#panel-battlelog .log-gift-btn.alindi{ box-shadow:none !important; }

/* Günlüğü temizle düğmesi */
#panel-battlelog .log-clear-btn{
  border:none !important;
  box-shadow:none !important;
  text-shadow:0 1px 2px rgba(0,20,45,.55) !important;
  transition:transform .09s, filter .09s !important;
}
#panel-battlelog .log-clear-btn:active{
  transform:scale(.96) !important; filter:brightness(.93) !important;
  box-shadow:none !important;
}

/* Kapat ✕ — sadece bu panelde düzleşir */
#panel-battlelog .overlay-close{
  box-shadow:none !important;
  transition:transform .09s, filter .09s !important;
}
#panel-battlelog .overlay-close:active{
  transform:scale(.96) !important; filter:brightness(.93) !important;
  box-shadow:none !important;
}
`;
  document.head.appendChild(st);
})();

/* ═══════════════════════════════════════════════════════════════
   GİRİŞ EKRANI — 3B TEMİZLİĞİ
   Kutular fotoğrafın üstünde durduğu için zemin KORUNUYOR;
   kalkan sadece kabartı: kalın çerçeve, inset parlaklık ve
   zıplayan basma tepkisi.
   ═══════════════════════════════════════════════════════════════ */
(function girisDuzles() {
  const st = document.createElement("style");
  st.id = "girisDuzStil";
  st.textContent = `
/* index.html'deki iki blokla BİREBİR aynı tutulacak — üç yer ayrışırsa
   giriş ekranı yine üç ayrı görünüm arasında gidip gelir. */
#loginScreen .field input{
  border:none !important;
  border-radius:13px !important;
  box-shadow:none !important;
  text-shadow:none !important;
}
#loginScreen .field input:focus{
  border:none !important;
  background:rgba(255,255,255,.30) !important;
  box-shadow:none !important;
}
#loginScreen .field input::placeholder{ text-shadow:none !important; }

#loginScreen .login-btn{
  border:none !important;
  border-radius:13px !important;
  box-shadow:none !important;
  text-shadow:0 1px 2px rgba(0,20,45,.55) !important;
  -webkit-text-stroke:0 !important;
  transition:transform .09s, filter .09s !important;
}
#loginScreen .login-btn:active{
  transform:scale(.98) !important;
  filter:brightness(.93) !important;
  box-shadow:none !important;
}

#loginScreen .login-switch a{ text-shadow:0 1px 2px rgba(0,20,45,.55) !important; }
`;
  document.head.appendChild(st);
})();

/* ═══════════════════════════════════════════════════════════════
   KOORDİNAT ÖLÇÜMÜ  —  ?olcum=1
   ---------------------------------------------------------------
   Paylaşılan konumun neden başka yeri gösterdiğini bulmak için.
   Hiçbir davranışı DEĞİŞTİRMEZ; sadece zincirin her halkasında
   hangi karonun geçtiğini ekrana yazar. Adres çubuğuna ?olcum=1
   eklenmediği sürece tamamen ölüdür.

   Zincirin halkaları:
     1) DOKUNDUM   → haritada parmağın indiği karo
     2) GÖNDERDİM  → sohbete yazılan karo (kayda giden kx/ky)
     3) OKUDUM     → gelen mesajdan çıkarılan karo
     4) HEDEF      → kameraya verilen karo
     5) VARDIM     → animasyon bitince ekranın TAM ORTASINDAKİ karo

   HANGİ SATIR SAPIYORSA HATA ORADA:
     1≠2 → paylaşma yazımı bozuk (index.html shareCoordInChat)
     2≠3 → kayıt/okuma birimi bozuk (parseCoordFromText)
     3≠4 → openSharedCoord çevrimi bozuk
     4≠5 → kamera hedefe varamıyor (harita.js kenar kilidi / clampMapPan)

   Ölçüm bitince BU BLOK SİLİNİR. Kalıcı kod değildir.
   ═══════════════════════════════════════════════════════════════ */
(function olcumBlogu() {
  "use strict";
  if (!/[?&]olcum=1/.test(location.search || "")) return;

  var kutu = null;
  var satirlar = [];

  function kutuyuKur() {
    if (kutu) return kutu;
    kutu = document.createElement("div");
    kutu.id = "koordOlcum";
    kutu.style.cssText =
      "position:fixed; left:6px; right:6px; top:6px; z-index:99999;" +
      "max-height:42vh; overflow:auto; padding:8px 10px;" +
      "background:rgba(4,14,32,.92); color:#cfe6ff;" +
      "font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;" +
      "border:1px solid rgba(120,190,255,.45); border-radius:10px;" +
      "white-space:pre-wrap; -webkit-user-select:text; user-select:text;";
    kutu.addEventListener("click", function () { satirlar = []; ciz(); });
    document.body.appendChild(kutu);
    return kutu;
  }

  function ciz() {
    kutuyuKur().textContent =
      "KOORDİNAT ÖLÇÜMÜ (dokun = temizle)\n" +
      (satirlar.length ? satirlar.join("\n") : "— henüz kayıt yok —");
  }

  function yaz(etiket, metin) {
    var s = new Date();
    var saat = ("0" + s.getMinutes()).slice(-2) + ":" + ("0" + s.getSeconds()).slice(-2);
    satirlar.push(saat + "  " + etiket + "  " + metin);
    if (satirlar.length > 40) satirlar = satirlar.slice(-40);
    ciz();
  }

  /* Ölçek (0..30) → karo, tek yerden. */
  function karo(g) {
    try { return window.KOORD.karoyaOturt(window.KOORD.olcektenKaro(g)); }
    catch (e) { return "?"; }
  }
  function ck(gx, gy) { return karo(gx) + "," + karo(gy); }

  /* Ekranın tam ortasındaki karo — kameranın gerçekte nerede
     durduğunu ölçer. Haritanın kendi çevrimini kullanır ki
     ölçüm ile oyun aynı matematiği paylaşsın. */
  function ekranOrtasiKaro() {
    try {
      var w = document.getElementById("battleMapWrap");
      if (!w || !window.HARITA || !HARITA.ekranaGoreIzgara) return null;
      var r = w.getBoundingClientRect();
      var k = HARITA.ekranaGoreIzgara(r.left + r.width / 2, r.top + r.height / 2, 30, 0);
      return k ? (k.kx + "," + k.ky) : null;
    } catch (e) { return null; }
  }

  function zoomYaz() {
    try { return " [zoom " + (Math.round(mapZoom * 100) / 100) + "]"; }
    catch (e) { return ""; }
  }

  /* ── HALKALARI SAR ──
     Özgün işlevler aynen çağrılır; sadece önüne/arkasına ölçüm
     eklenir. Biri yoksa o halka sessizce atlanır. */
  function sar() {
    /* 1) DOKUNDUM */
    if (typeof window.handleMapTap === "function" && !window.handleMapTap._olcum) {
      var eskiTap = window.handleMapTap;
      window.handleMapTap = function (cx, cy, hedef) {
        var s = eskiTap.apply(this, arguments);
        try {
          if (window.pendingShareCoord) {
            yaz("1 DOKUNDUM ", ck(pendingShareCoord.gx, pendingShareCoord.gy) + zoomYaz());
          }
        } catch (e) {}
        return s;
      };
      window.handleMapTap._olcum = 1;
    }

    /* 2) GÖNDERDİM */
    if (typeof window.shareCoordInChat === "function" && !window.shareCoordInChat._olcum) {
      var eskiPay = window.shareCoordInChat;
      window.shareCoordInChat = function (gxIn, gyIn, kimin) {
        try {
          var acik = (typeof gxIn === "number" && typeof gyIn === "number");
          var g = acik ? { gx: gxIn, gy: gyIn } : window.pendingShareCoord;
          if (g) yaz("2 GÖNDERDİM", ck(g.gx, g.gy) + (acik ? "  (kale penceresinden)" : "  (harita dokunuşundan)"));
        } catch (e) {}
        return eskiPay.apply(this, arguments);
      };
      window.shareCoordInChat._olcum = 1;
    }

    /* 3) OKUDUM */
    if (typeof window.parseCoordFromText === "function" && !window.parseCoordFromText._olcum) {
      var eskiOku = window.parseCoordFromText;
      window.parseCoordFromText = function (m) {
        var s = eskiOku.apply(this, arguments);
        try {
          if (s && m && typeof m === "object" && m._olcumYazildi !== true) {
            m._olcumYazildi = true;
            yaz("3 OKUDUM   ", ck(s.gx, s.gy) +
                "  (kayıt kv=" + m.kv + " kx=" + m.kx + " ky=" + m.ky + ")" +
                "  metin: " + String(m.text || "").slice(0, 30));
          }
        } catch (e) {}
        return s;
      };
      window.parseCoordFromText._olcum = 1;
    }

    /* 4) HEDEF + 5) VARDIM */
    if (typeof window.goToCoord === "function" && !window.goToCoord._olcum) {
      var eskiGit = window.goToCoord;
      window.goToCoord = function (gx, gy) {
        var hedef = ck(gx, gy);
        yaz("4 HEDEF    ", hedef + zoomYaz());
        var s = eskiGit.apply(this, arguments);
        /* Kaydırma animasyonu ~420ms; bitmesini bekle. */
        setTimeout(function () {
          var v = ekranOrtasiKaro();
          if (!v) { yaz("5 VARDIM   ", "ölçülemedi"); return; }
          var a = hedef.split(","), b = v.split(",");
          var dx = Math.abs(+a[0] - +b[0]), dy = Math.abs(+a[1] - +b[1]);
          var sapma = (dx <= 1 && dy <= 1) ? "  ✅ tutuyor" : "  ❌ SAPMA " + dx + "," + dy + " karo";
          yaz("5 VARDIM   ", v + sapma);
        }, 900);
        return s;
      };
      window.goToCoord._olcum = 1;
    }
  }

  function baslat() {
    ciz();
    yaz("hazır", "haritaya dokun → ✏️ ile paylaş → mesaja dokun");
    sar();
    /* index.html blokları geç yüklenirse diye birkaç kez dene. */
    var n = 0;
    var t = setInterval(function () { sar(); if (++n > 20) clearInterval(t); }, 500);
  }

  if (document.readyState === "complete") setTimeout(baslat, 600);
  else window.addEventListener("load", function () { setTimeout(baslat, 600); });
})();

/* ═══════════════════════════════════════════════════════════════
   GÖRSEL ARKASI KARARTIYI KALDIR
   ---------------------------------------------------------------
   Oyundaki .webp görsellerin siluetine siyah bir gölge basılıyordu
   (filter: drop-shadow(... rgba(0,0,0,.5)) gibi). Küçük görsellerde
   bu gölge, resmin arkasında bir kirlilik/karartı olarak okunuyordu.

   BURADA YALNIZ SİYAH/LACİVERT GÖLGELER SÖNDÜRÜLÜR.
   Renkli parlamalar (robotun mavi ışığı, taşıma hayaletinin kırmızı
   uyarısı, füzenin turuncu izi, seferin renk halkası) BİLEREK
   bırakıldı — onlar süs değil, bilgi taşıyor.

   NEDEN BURADA: kurallar index.html, troops.js, kahramanlar.js ve
   rehber.js'e dağılmış durumda. Hepsini tek tek düzenlemek dört
   dosyaya dokunmak demekti; tema.js zaten en sonda yüklendiği için
   buradan ezmek tek dosyada kalıyor.

   `html body` öneki: tema.js'in yükleme sırası değişse bile
   özgüllük garanti olsun diye (bkz. dosyanın başındaki not).

   GERİ ALMAK İÇİN: bu bloğun tamamını sil, gölgeler geri gelir.
   ═══════════════════════════════════════════════════════════════ */
(function golgeleriSondur() {
  const st = document.createElement("style");
  st.id = "golgeSondur";
  st.textContent = `
/* ── HARİTA ── */
html body .map-node.castle-node .castle-avatar img{ filter:none !important; }

/* ── ALT MENÜ VE YÜZEN BUTONLAR (üçü de <img>) ── */
html body .dock-icon{ filter:none !important; }
html body .floating-chest-btn{ filter:none !important; }
html body .floating-hospital-btn{ filter:none !important; }

/* ── SANDIK EKRANI (gorsel4.webp) ── */
html body .chest{ filter:none !important; }

/* ── BİRLİK GÖRSELLERİ ── */
html body .tp-img img{ filter:none !important; }
html body .us-knight .knight{ filter:none !important; }
html body .us-soldier .soldier{ filter:none !important; }

/* Robot: siyah gölge gitti, MAVİ PARLAMA kaldı. Bu yüzden
   "none" değil, gölgenin sadece renkli yarısı yeniden yazıldı. */
html body .us-robot .hero-img{ filter:drop-shadow(0 0 22px rgba(56,214,255,.55)) !important; }

/* ── KARŞILAMA GÖRSELİ ── */
html body #welcomeBack .wc-hero{ filter:none !important; }

/* ── BİLEREK DIŞARIDA BIRAKILANLAR — buraya kural EKLEME ──
   Bunların hiçbiri yüklenmiş görsel değil; gölgeleri süs değil,
   okunurluk sağlıyor:
     · kale taşıma hayaleti  (#castleMoveGhost img)
     · kilit ikonu           (.klist-lock span)
     · ✏️ paylaşma işareti    (.coord-share-icon)
     · kaynak ikonları       (.hud-top .kaynak-ikon)
     · günlük ödül sandığı   (.daily-reward-chest — SVG çizim)
     · mağaza ikonları       (.shop-card2 .sc-emoji)
     · birlik listesi emojisi (.tp-img .tp-emoji)
     · kahraman yıldızları   (#hdStars span) */
`;
  const ekle = () => document.head.appendChild(st);
  if (document.head) ekle();
  else document.addEventListener("DOMContentLoaded", ekle);
})();

/* ═══════════════════════════════════════════════════════════════
   HASTANE SÜRE + DOLGU · KISA SAYI · KULLANIM TEPKİSİ
   index.html'e dokunmadan, oradaki fonksiyonların üstüne sarılarak.
   ═══════════════════════════════════════════════════════════════ */
(function hastaneVeSayiBlogu() {
  "use strict";

  /* DİKKAT: index.html'de `const state = ...` yazıyor. `const` ile
     tanımlanan değişken window'a YAZILMAZ; `window.state` her zaman
     undefined'dır. Doğrusu değişkeni ADIYLA okumaktır. */
  function durum() {
    try { return (typeof state !== "undefined" && state) ? state : null; }
    catch (e) { return null; }
  }
  function birimSure(unitId) {
    try { if (typeof iyilesmeSuresiMs === "function") return iyilesmeSuresiMs(unitId); }
    catch (e) {}
    return 0;
  }

  /* ── 1) SÜRE: "5s 57d 7sn" ── */
  function sureKisa(ms) {
    var t = Math.max(0, Math.round(ms / 1000));
    var sa = Math.floor(t / 3600), dk = Math.floor((t % 3600) / 60), sn = t % 60;
    var p = [];
    if (sa > 0) p.push(sa + "s");
    if (dk > 0) p.push(dk + "d");
    if (sn > 0 || !p.length) p.push(sn + "sn");
    return p.join(" ");
  }

  /* ── 2) SAYI: 10.3K · 100.2K · 1.5M ── */
  function sayiKisa(n) {
    n = Number(n) || 0;
    var i = n < 0 ? "-" : "";
    n = Math.abs(n);
    if (n >= 1e9) return i + (n / 1e9).toFixed(1).replace(".", ",") + "B";
    if (n >= 1e6) return i + (n / 1e6).toFixed(1).replace(".", ",") + "M";
    if (n >= 1e4) return i + (n / 1e3).toFixed(1).replace(".", ",") + "K";
    if (n >= 1e3) return i + (n / 1e3).toFixed(1).replace(".", ",") + "K";
    return i + String(Math.round(n));
  }

  /* Üst şeritteki dört kaynak + elmas sayacı kısaltılır.
     Çanta/panel içindeki sayılara DOKUNULMAZ. */
  var KAYNAK_ID = ["kayEt", "kayDemir", "kaySu", "kayEnerji"];
  function ustSeridiKisalt() {
    var s = durum();
    if (!s) return;
    var k = s.kaynaklar || {};
    var esle = { kayEt: "et", kayDemir: "demir", kaySu: "su", kayEnerji: "enerji" };
    KAYNAK_ID.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = sayiKisa(k[esle[id]] || 0);
    });
    var d = document.getElementById("diamondAmount");
    if (d) d.textContent = sayiKisa(s.diamonds || 0);
  }

  /* ── 3) HASTANE: kalan süre yazısı + dolan yeşil şerit ── */
  function hastaneyiSusle() {
    var kuyruk = document.getElementById("hospitalQueueList");
    var s = durum();
    if (!kuyruk || !s || !Array.isArray(s.hospital)) return;
    var simdi = Date.now();

    kuyruk.querySelectorAll(".hosp-queue-row").forEach(function (satir) {
      var isaret = satir.querySelector("[data-unit]");
      if (!isaret) return;
      var unitId = isaret.dataset.unit;

      var grup = s.hospital.filter(function (p) {
        return p.unitId === unitId && p.confirmed;
      });
      if (!grup.length) return;

      var bitis = grup.reduce(function (m, p) { return Math.max(m, p.finishAt || 0); }, 0);
      var kalan = Math.max(0, bitis - simdi);

      /* Toplam süre = adet × birim iyileşme süresi. Hızlandırma
         yapılınca kalan düşer, toplam sabit kalır → şerit sıçrar. */
      var adet = grup.reduce(function (t, p) { return t + (p.adet || 0); }, 0);
      var birim = birimSure(unitId);
      var toplam = Math.max(1, adet * birim);
      var oran = Math.max(0, Math.min(1, 1 - (kalan / toplam)));

      var yazi = satir.querySelector(".hospital-heal-total-time");
      if (yazi) yazi.textContent = sureKisa(kalan);

      var dolgu = satir.querySelector(".hosp-dolgu");
      if (!dolgu) {
        dolgu = document.createElement("i");
        dolgu.className = "hosp-dolgu";
        satir.insertBefore(dolgu, satir.firstChild);
      }
      dolgu.style.width = (oran * 100).toFixed(2) + "%";
    });
  }

  /* ── 4) index.html fonksiyonlarının üstüne sarma ── */
  function sar(ad, sonra) {
    var eski = window[ad];
    if (typeof eski !== "function" || eski._temaSarildi) return;
    var yeni = function () {
      var r = eski.apply(this, arguments);
      try { sonra(); } catch (e) {}
      return r;
    };
    yeni._temaSarildi = true;
    window[ad] = yeni;
  }

  function kur() {
    window.TEMA_EK = "tema-ek-2";
    sar("renderKaynaklar", ustSeridiKisalt);
    sar("renderDiamonds", ustSeridiKisalt);
    sar("renderHospitalPanel", hastaneyiSusle);
    ustSeridiKisalt();
    /* Saniyelik tazeleme: hastane satırları her tik yeniden çiziliyor,
       şeridi de o hızda güncelleriz. */
    setInterval(function () {
      try { hastaneyiSusle(); ustSeridiKisalt(); } catch (e) {}
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(kur, 300); });
  } else {
    setTimeout(kur, 300);
  }

  /* ── 5) HIZLANDIRMA KUTUCUĞU KULLANIM TEPKİSİ ──
     KULLAN / HIZLI KULLAN'a basınca seçili kartın görseli kısa süre
     kararıp toparlanır. Eğitim ve hastane pencerelerinin ikisinde de. */
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".hsm-use, .hsm-quick");
    if (!b) return;
    var kok = b.closest(".hosp-speed-modal");
    if (!kok) return;
    var kart = kok.querySelector(".hsm-card-item.is-active") || kok.querySelector(".hsm-card-item");
    if (!kart) return;
    kart.classList.remove("kullanildi");
    void kart.offsetWidth;
    kart.classList.add("kullanildi");
  }, true);

  /* ── 6) STİL ── */
  var st = document.createElement("style");
  st.textContent = `
/* Hastane satırında dolan yeşil şerit — intikal kutucuğundaki ile
   aynı fikir, ayrı bir süre çubuğu koymamak için. */
html body #panel-hospital .hosp-queue-row{ position:relative; overflow:hidden; }
html body #panel-hospital .hosp-dolgu{
  position:absolute; left:0; top:0; bottom:0; z-index:0; width:0;
  background:linear-gradient(180deg, rgba(88,214,120,.55), rgba(38,158,84,.55));
  pointer-events:none;
}
html body #panel-hospital .hosp-queue-row > *:not(.hosp-dolgu){ position:relative; z-index:1; }

/* "Tüm yaralılar tedaviye alındı" satırındaki ✅ kaldırıldı. */
html body #hospitalPendingList .empty-state .icon{ display:none !important; }

/* Hızlandırma kartı kullanıldı tepkisi. */
html body .hsm-card-item.kullanildi{ animation:hsmKullanildi .34s ease; }
@keyframes hsmKullanildi{
  0%{ transform:scale(1); filter:brightness(1); }
  22%{ transform:scale(.88); filter:brightness(.45); }
  60%{ transform:scale(1.04); filter:brightness(1.18); }
  100%{ transform:scale(1); filter:brightness(1); }
}
`;
  var ekle2 = function () { document.head.appendChild(st); };
  if (document.head) ekle2();
  else document.addEventListener("DOMContentLoaded", ekle2);
})();

/* ══════════════════════════════════════════════════════════════
   KADEME SEÇİCİ — kafa kutucukları (2026-08)
   ------------------------------------------------------------
   Kutucuklar artık BİRLİK seçici değil, KADEME seçici (Sv1…Sv6).
   Bu iki şeyi değiştirdi:

   1) KIRPMA ARTIK SIRAYA GÖRE DEĞİL. Eskiden kırpma
      .uv-portrait[data-i="0/1/2"] ile yazılıydı — 0 şövalyenin,
      1 askerin, 2 robotun kadrajıydı. Kutucuklar tek bir ailenin
      kademelerini gösterdiği için o sıra anlamını yitirdi:
      robot ekranındayken 0. kutucuk şövalye kadrajıyla kırpıyor,
      robotun kafası yamuk çıkıyordu.
      Çözüm: kırpma [data-unit="knight|soldier|robot"] ile yazıldı.
      DEĞİŞKENLER AYNI (--tp-kp-* vb.) — ?ayar=1 ayar paneli ve
      hastanedeki .hospital-face aynı değerleri okumaya devam eder.

   2) Sv2+ henüz üretilemiyor: görsel karartılır, üretim çubuğu
      yerine kilit yazısı çıkar.
   ══════════════════════════════════════════════════════════════ */
(function kademeSecici(){
"use strict";
const st = document.createElement("style");
st.id = "temaKademeSecici";
st.textContent = `

/* ── 1) KIRPMA: sıraya göre değil, AİLEYE göre ── */
#panel-troops .uv-portrait[data-unit="knight"] img{
  width:var(--tp-kp-w,150%) !important;
  margin:var(--tp-kp-t,-29%) 0 0 var(--tp-kp-l,-26%) !important;
}
#panel-troops .uv-portrait[data-unit="soldier"] img{
  width:var(--tp-ap-w,130%) !important;
  margin:var(--tp-ap-t,-16%) 0 0 var(--tp-ap-l,-21%) !important;
}
#panel-troops .uv-portrait[data-unit="robot"] img{
  width:var(--tp-rp-w,140%) !important;
  margin:var(--tp-rp-t,-10%) 0 0 var(--tp-rp-l,-18%) !important;
}

/* 6 kutucuk yan yana sığsın — biraz daralt ve aralarını kıs */
#panel-troops .uv-portraits{ gap:5px !important; }
#panel-troops .uv-portrait{
  position:relative !important;
  width:calc(var(--tp-box,44px) * .86) !important;
  height:calc(var(--tp-box,44px) * .86) !important;
}

/* köşedeki seviye rakamı */
#panel-troops .uv-portrait .kp-sv{
  position:absolute !important; right:1px; bottom:0;
  width:auto !important; height:auto !important;
  display:block !important;
  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:10px !important;
  color:#fff; line-height:1;
  padding:1px 3px; border-radius:6px;
  background:rgba(6,20,40,.72);
  pointer-events:none;
}

/*  Kilitli kademe kutucuğunun soluklaştırması BURADAN KALDIRILDI.
    Eskiden yalnız GÖRSEL soluklaşıyordu; kutuya arka plan gelince
    arka plan pırıl pırıl, birlik soluk kalıyordu. Yeni yer: dosya
    sonundaki birlikKutuArkaPlan bloğu — orada görsel ve arka plan
    birlikte, aynı değerle soluklaşır, kademe numarası ise net
    kalır (numara filtrenin dışında tutuldu).                      */

/* ── 2) Sv2+ karartması BURADAN KALDIRILDI ──
   Eskiden karartma .stage'e, yani sahnenin tamamına, kademeye
   basıldıktan SONRA sınıf eklenerek uygulanıyordu. Tarayıcı önce
   görseli renkli boyuyor, filtre katmanını bir kare sonra kuruyordu
   → kilitli birliğe basınca bir an renkli görünüp kararıyordu.
   Yeni yer: dosya sonundaki kademeKatmanlari bloğu. Orada karartma
   Sv2+ görselinin KENDİSİNE kalıcı yazılı; görsel daha ekrana
   gelmeden karanlık duruyor, basınca yalnız görünür oluyor.        */

/*  Kilitli kademede de adet çubuğu basılır ama GÖRÜNMEZ:
    yer kaplamaya devam eder, böylece kademeler arasında gezerken
    panel yüksekliği hiç değişmez (aşağı yukarı zıplama olmaz).   */
#panel-troops .unit-qty-bar.kilit-hayalet{
  visibility:hidden !important;
  pointer-events:none !important;
}

/*  Kilit kutusu üretim düğmeleriyle AYNI iki satırlı yapıda —
    üstte başlık, altta açıklama. Yüksekliği .unit-train-btn ile
    eşleşsin diye aynı dizilim ve dolgu kullanılır.               */
#panel-troops .utb-kilit{
  flex:1 1 auto;
  display:flex !important; flex-direction:column !important;
  align-items:center !important; justify-content:center !important;
  gap:1px;
  font-family:'Baloo 2',sans-serif; color:#cfe3f5;
  padding:8px 10px;
  border-radius:16px;
  background:linear-gradient(180deg, rgba(20,45,80,.85), rgba(10,26,50,.9));
  border:1px solid rgba(160,210,255,.28);
}
#panel-troops .utb-kilit .utb-top{ font-weight:800; font-size:15px; }
#panel-troops .utb-kilit .utb-sub{ font-weight:700; font-size:11.5px; opacity:.75; }
`;
document.head.appendChild(st);
})();

/* ══════════════════════════════════════════════════════════════
   EĞİTİM EKRANI — ROZET VE STAT KUTULARI (2026-08)
   ------------------------------------------------------------
   · Güç, stat satırından çıkıp SAĞ ÜST köşeye taşındı; üstünde
     birliğin kademesi yazıyor. İkisi de sarı.
   · Stat satırının 4. kutusu artık ÖLDÜRÜCÜLÜK.
   · Stat kutularındaki emojiler kaldırıldı.
   ══════════════════════════════════════════════════════════════ */
(function egitimRozet(){
"use strict";
const st = document.createElement("style");
st.id = "temaEgitimRozet";
st.textContent = `

/* ── sağ üst rozet: ✕ düğmesinin altında, alt alta iki kutu ──
   Kutular STAT KUTULARIYLA aynı: aynı zemin (rgba(4,32,60,.22)),
   aynı köşe yarıçapı, aynı dolgu ve aynı yazı boyutları.
   Üstteki "6.Sv" tek satır, alttaki "Güç" etiket + değer olarak
   altlı üstlü — stat kutusundaki gibi.
   Stat satırının içine konunca 4. kutunun üstüne biniyordu;
   artık .unit-screen'in doğrudan çocuğu.

   DİKKAT: .unit-screen'e position:relative YAZILMAZ. O element
   zaten position:absolute + inset:0 ile paneli kaplıyor; relative
   yapılınca kaplama çöker ve ekrandaki her şey yukarı yığılır.
   Absolute olduğu için rozete kapsayıcılık zaten yapıyor.        */
#panel-troops .uv-rozet{
  position:absolute; z-index:26;
  top:calc(96px + env(safe-area-inset-top,0)); right:14px;
  display:flex; flex-direction:column; gap:6px;
  pointer-events:none;
  font-family:'Baloo 2','Nunito',sans-serif;
}
#panel-troops .uv-rozet .uvr-kutu{
  min-width:66px;
  display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:1px;
  padding:6px 8px;
  border-radius:10px;
  background:rgba(4,32,60,.22);
  box-shadow:none;
  text-align:center;
}
#panel-troops .uv-rozet .uvr-et{
  font-weight:700; font-size:12px; line-height:1.1;
  color:#ffd257; opacity:.92;
  text-shadow:0 1px 3px rgba(0,40,70,.6);
}
#panel-troops .uv-rozet .uvr-dg{
  font-weight:800; font-size:20px; line-height:1.05;
  color:#ffd257; font-variant-numeric:tabular-nums;
  text-shadow:0 1px 3px rgba(0,40,70,.6);
}
/* seviye kutusu tek satır — yüksekliği diğeriyle eşitlenir */
#panel-troops .uv-rozet .uvr-kutu.uvr-sv{ padding:11px 8px; }

/* ── stat kutuları: emoji yok ── */
#panel-troops .stats-grid .stat-ico{ display:none !important; }
#panel-troops .stats-grid .stat-name{ font-size:12px !important; }
`;
document.head.appendChild(st);
})();


/* ═══════════════════════════════════════════════════════════════
   ÇANTA · KAYNAK PAKETİ KULLANMA PENCERESİ

   SORUN: Çantadaki kaynak paketlerine (Et/Demir/Su Sandığı, Enerji
   Hücresi) dokununca hiçbir şey olmuyordu. İki sebep üst üste
   binmişti:
     1) Bu dosyanın üst kısmı çantadaki "Kullan" düğmesini
        gizliyor (#panel-inventory .inv-use-btn{display:none}).
     2) Kutucuğa dokunma dinleyicisi eşya ne olursa olsun
        useStaminaPotion() çağırıyordu — kaynak paketinde "Çantanda
        can potu yok" diyip susuyordu.

   ÇÖZÜM: Kaynak paketine dokunulunca MAĞAZADAKİ SATIN ALMA
   PENCERESİNİN AYNISI açılır. Aynı sınıflar kullanılıyor
   (.bd-buy-mask / .bd-buy-box / .bd-q-row ...), yani görünüm
   birebir mağazanınki; mağaza penceresinin biçimi değişirse bu da
   kendiliğinden değişir. Tek farkı: elmas değil ADET kullanılır ve
   düğme "kullan" der.

   Yakalama (capture) evresinde dinliyoruz ki yukarıdaki eski
   dinleyiciye hiç sıra gelmesin — o dosyaya dokunmadan yolu
   kesiyoruz.
   ═══════════════════════════════════════════════════════════════ */
(function cantaKaynakKullan() {
  "use strict";

  var _esc = null;

  function sayiYaz(n) {
    try { if (typeof fmt === "function") return fmt(n); } catch (e) {}
    return String(n);
  }

  function tanim(ad) {
    try { return (typeof getItemDef === "function") ? getItemDef(ad) : null; }
    catch (e) { return null; }
  }

  /* Kartın hangi eşya olduğunu, içindeki GİZLİ Kullan düğmesinin
     data-item'ından okuyoruz — isim etiketi kırpılmış olabilir. */
  function kartAdi(kart) {
    var b = kart.querySelector(".inv-use-btn");
    if (b && b.dataset && b.dataset.item) return b.dataset.item;
    var n = kart.querySelector(".item-name");
    return n ? n.textContent.trim() : "";
  }

  function elde(ad) {
    try { return (state.inventory && state.inventory[ad]) || 0; } catch (e) { return 0; }
  }

  function kaynakAdi(ad) { return String(ad).replace(/ (Sandığı|Hücresi)$/, ""); }

  function simge(d) {
    try { if (typeof itemIconSVG === "function") return itemIconSVG(d); } catch (e) {}
    return d.emoji || d.icon || "";
  }

  function aciklama(d) {
    try { if (typeof shopItemDesc === "function") return shopItemDesc(d) || ""; } catch (e) {}
    return "Kullanınca +" + sayiYaz(d.miktar) + " " + kaynakAdi(d.name) + " verir.";
  }

  function kapat() {
    var m = document.querySelector(".bd-buy-mask");
    if (m) m.remove();
    if (_esc) { document.removeEventListener("keydown", _esc); _esc = null; }
  }

  /* Seçilen adet kadar paketi kaynağa çevirir. index.html'deki
     kaynakPaketiKullan HEPSİNİ birden harcıyor; burada adet
     seçilebildiği için kendi hesabımızı yapıyoruz. */
  function kullan(d, adet) {
    var ad = d.name;
    var varOlan = elde(ad);
    adet = Math.max(1, Math.min(adet, varOlan));
    if (adet <= 0) { return; }

    if (!state.kaynaklar || typeof state.kaynaklar !== "object") {
      state.kaynaklar = { et: 0, demir: 0, su: 0, enerji: 0 };
    }
    var k = d.kaynakId;
    var eski = state.kaynaklar[k];
    var toplam = (d.miktar || 0) * adet;
    state.kaynaklar[k] = (typeof eski === "number" && isFinite(eski) ? eski : 0) + toplam;

    state.inventory[ad] = varOlan - adet;
    if (state.inventory[ad] <= 0) delete state.inventory[ad];

    try { if (typeof renderKaynaklar === "function") renderKaynaklar(); } catch (e) {}
    try { if (typeof renderInventory === "function") renderInventory(); } catch (e) {}
    try { if (typeof persistCurrentState === "function") persistCurrentState(); } catch (e) {}
    try {
      if (typeof showToast === "function") {
        showToast((d.emoji || "") + " +" + sayiYaz(toplam) + " " + kaynakAdi(ad) + " eklendi!");
      }
    } catch (e) {}
  }

  function pencere(d) {
    kapat();
    try { if (typeof closeShopPopups === "function") closeShopPopups(); } catch (e) {}

    var enFazla = Math.max(1, elde(d.name));
    var adet = 1;

    var mask = document.createElement("div");
    mask.className = "bd-buy-mask";
    mask.innerHTML =
      '<div class="bd-buy-box">' +
        '<div class="bd-buy-head">' +
          '<span>Kullan</span>' +
          '<button class="bd-buy-x" type="button">✕</button>' +
        '</div>' +
        '<div class="bd-buy-body">' +
          '<div class="bd-buy-top">' +
            '<div class="bd-buy-icon">' + simge(d) + '</div>' +
            '<div class="bd-buy-txt">' +
              '<div class="bd-buy-name">' + d.name + '</div>' +
              '<div class="bd-buy-desc">' + aciklama(d) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="bd-q-row">' +
            '<button class="bd-qbtn" type="button" data-d="-1">−</button>' +
            '<input class="bd-q-range" type="range" min="1" max="' + enFazla + '" value="1">' +
            '<button class="bd-qbtn" type="button" data-d="1">+</button>' +
            '<div class="bd-qnum">1</div>' +
            '<button class="bd-qmax" type="button">MAX</button>' +
          '</div>' +
          '<button class="bd-buy-go" type="button"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);

    var range = mask.querySelector(".bd-q-range");
    var num   = mask.querySelector(".bd-qnum");
    var go    = mask.querySelector(".bd-buy-go");

    function esitle() {
      adet = Math.min(enFazla, Math.max(1, adet));
      range.value = adet;
      num.textContent = adet;
      var pct = enFazla > 1 ? ((adet - 1) / (enFazla - 1)) * 100 : 100;
      range.style.setProperty("--fill", pct + "%");
      /* Mağazada düğmede toplam FİYAT yazar; burada kazanılacak
         toplam KAYNAK yazıyor — aynı yerde, aynı biçimde. */
      go.textContent = (d.emoji || "") + " +" + sayiYaz((d.miktar || 0) * adet);
      go.disabled = false;
    }

    range.addEventListener("input", function () {
      adet = parseInt(range.value, 10) || 1; esitle();
    });
    mask.querySelectorAll(".bd-qbtn").forEach(function (b) {
      b.addEventListener("click", function () {
        adet += parseInt(b.dataset.d, 10); esitle();
      });
    });
    mask.querySelector(".bd-qmax").addEventListener("click", function () {
      adet = enFazla; esitle();
    });
    mask.querySelector(".bd-buy-x").addEventListener("click", kapat);
    mask.addEventListener("click", function (e) { if (e.target === mask) kapat(); });
    go.addEventListener("click", function () {
      var n = adet;
      kapat();
      kullan(d, n);
    });
    _esc = function (e) { if (e.key === "Escape") kapat(); };
    document.addEventListener("keydown", _esc);

    esitle();
  }

  /* CAPTURE: çantadaki kaynak kutucuğuna dokunma buradan öteye
     geçmez, eski can-potu dinleyicisi hiç çalışmaz. Diğer eşyalar
     (can potu vb.) eskisi gibi akar. */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var kart = t.closest("#invList .inv-card, #invList .shop-card");
    if (!kart) return;

    var d = tanim(kartAdi(kart));
    if (!d || !d.isKaynak) return;

    e.stopPropagation();
    e.preventDefault();
    pencere(d);
  }, true);
})();

/* ═══════════════════════════════════════════════════════════════
   3B TEMİZLİĞİ — ÜST ŞERİT · ALT MENÜ · GİRİŞ EKRANI

   Bu üç yerde kalan kabartma izleri kaldırılıyor:
     • dış düşen gölge (0 4px 12px, 0 -6px 18px ...)
     • içeri kabartı (inset ... rgba(255,255,255,...))
     • kalın alt kenar (0 5px 0 renk) ve basınca zıplama
   Geriye tek ince çerçeve ve düz zemin kalıyor.

   Yazı gölgeleri KORUNDU: üst şerit haritanın üstünde duruyor,
   gölge kalkarsa rakamlar lavın üstünde okunmaz oluyor.

   Eski satırlar silinmedi; dosyanın sonundaki bu blok aynı
   özgüllükle (ve !important ile) onları eziyor.
   ═══════════════════════════════════════════════════════════════ */
(function menuGirisDuzles() {
  var st = document.createElement("style");
  st.id = "menuGirisDuzStil";
  st.textContent = `
/* ── ÜST ŞERİT ── */
html body .hud-top{
  box-shadow:none !important;
  border-bottom:1px solid rgba(190,240,255,.20) !important;
}
html body .hud-top .hud-pill,
html body .hud-pill, html body .user-pill,
html body .hud-pill.diamond-pill,
html body #staminaPill, html body #mslHudPill,
html body .hud-top .kaynak-oge{
  box-shadow:none !important;
  border:none !important;
}

/* ── ALT MENÜ ── */
html body .nav-dock{
  box-shadow:none !important;
  border-top:1px solid rgba(190,240,255,.20) !important;
}
html body .dock-icon{ filter:none !important; }
html body .dock-btn{ box-shadow:none !important; }

/* ── GİRİŞ EKRANI ── */
html body #loginScreen .field input,
html body #loginScreen .field input:focus{
  box-shadow:none !important;
  border:none !important;          /* çerçeve tamamen kalktı */
}
/* Çerçeve yokken "hangi kutudayım" belirsizleşmesin diye
   odaklanınca zemin biraz açılıyor — çizgi yerine ton farkı. */
html body #loginScreen .field input:focus{
  background:rgba(255,255,255,.30) !important;
}
html body #loginScreen .login-btn,
html body #loginScreen .login-btn:active{
  box-shadow:none !important;
  border:none !important;          /* çerçeve tamamen kalktı */
}
html body #loginScreen .login-btn:active{
  transform:scale(.98) !important;   /* zıplama yok, hafif basma */
  filter:brightness(.93) !important;
}
`;

  /* ── NEDEN İKİ KAT KORUMA ──
     1) `html body` öneki: bu dosyanın 15. bölümü (ustMenuTekGovde)
        aynı gerekçeyle bu öneki kullanıyor. Önek olmadan, sonradan
        eklenen sıradan bir `.hud-top{...!important}` kuralı bizi
        ezebiliyor.
     2) SONA TAŞIMA: bir stil, sayfa açıldıktan SONRA (zamanlayıcıyla
        ya da bir olayla) eklenirse başlığın en sonuna girer ve eşit
        ağırlıkta bizi geçer. Oyun açılırken menülerin önce düz,
        bir saniye sonra kabartmalı görünmesinin sebebi buydu.
        Aynı düğümü yeniden appendChild etmek onu KOPYALAMAZ, sona
        TAŞIR — birkaç kez tekrarlayıp en sonda kalmayı garantiliyoruz. */
  function sonaTasi() {
    try { document.head.appendChild(st); } catch (e) {}
  }
  sonaTasi();
  [400, 1200, 2500, 5000].forEach(function (ms) { setTimeout(sonaTasi, ms); });
  document.addEventListener("DOMContentLoaded", sonaTasi);
  window.addEventListener("load", sonaTasi);
})();


/*  ÇANTA · GÜÇLENDİRME BALONCUĞU — KALDIRILDI.
    Buradaki baloncuk ("Savaş ekranındaki yeşil kutucuktan
    hazırlanır.") artık buff.js'teki açıklama penceresiyle
    değiştirildi; ikisi aynı anda çıkıyor, alt alta iki kutu
    görünüyordu. Ezme değil, kök silindi — çantadaki güçlendirme
    dokunuşunu tek yer (buff.js) karşılıyor.                     */


/* ══════════════════════════════════════════════════════════════
   EĞİTİM EKRANI — KADEME GÖRSEL KATMANLARI
   ------------------------------------------------------------
   Sahnedeki görsel artık değişmiyor; altı kademenin görseli üst
   üste duruyor ve yalnız biri açık. Böylece kademe geçişinde
   dosya indirme/çözme olmuyor: takılma ve "bir an eski görsel
   renkli görünüyor" sıçraması bu yüzden bitiyor.
   ══════════════════════════════════════════════════════════════ */
(function kademeKatmanlari(){
"use strict";
const st = document.createElement("style");
st.id = "temaKademeKatman";
st.textContent = `
#panel-troops .unit-screen .stage img.kad-katman{ display:none !important; }
#panel-troops .unit-screen .stage img.kad-katman.kad-acik{ display:block !important; }

/*  KİLİTLİ KADEME KARARTMASI — KALICI, ÖNCEDEN HAZIR.
    Sv2-Sv6 henüz üretilemiyor; karartma bu görsellerin üstünde
    en baştan duruyor. Katman sahneye kurulduğu anda karanlık,
    ekrana gelene kadar da öyle bekliyor. Oyuncu bastığında hiçbir
    hesap yapılmıyor, sadece görünür oluyor — renkli hâli hiç
    boyanmadığı için kararma diye bir olay yaşanmıyor.
    Sv1 (data-kad-k="1") her zaman açıktır, dışarıda bırakılır.    */
#panel-troops .unit-screen .stage img.kad-katman:not([data-kad-k="1"]){
  filter:grayscale(.85) brightness(.42) !important;
}

/*  Zemin gölgesi ve toz görselin içinde değil, sahnenin ayrı
    parçaları. Eski kural sahnenin tamamını karartırken bunlar da
    kararıyordu; aynı görüntü korunsun diye ayrıca yazılıyor.
    Bunlarda sıçrama olmaz: ikisi de zaten koyu ve soluktur.       */
#panel-troops .unit-screen.kademe-kilit .ground-shadow,
#panel-troops .unit-screen.kademe-kilit .dust{
  filter:grayscale(.85) brightness(.42) !important;
}
`;
document.head.appendChild(st);

/*  Gizli duran görseli tarayıcı çözmez: dosya inmiştir ama resim
    hâlâ paketli bekler, ilk gösterimde o an açılır — ilk dokunuşta
    hissedilen takılma budur. Aşağıda 18 birliğin görseli sayfa
    yerleştikten sonra sessizce çözülür. DOM'a hiçbir şey eklenmez,
    tek seferliktir, oyun açılışını bekletmez.                     */
function kademeGorselleriniCoz(){
  if (typeof UNIT_TYPES === "undefined") return;
  const gorulen = {};
  Object.keys(UNIT_TYPES).forEach(function (id) {
    const d = UNIT_TYPES[id];
    if (!d || !d.img || gorulen[d.img]) return;
    gorulen[d.img] = 1;
    const im = new Image();
    im.decoding = "async";
    im.src = d.img;
    if (im.decode) im.decode().catch(function(){});   /* dosya yoksa sessiz */
  });
}
if (document.readyState === "complete") setTimeout(kademeGorselleriniCoz, 2500);
else window.addEventListener("load", function () {
  setTimeout(kademeGorselleriniCoz, 2500);
}, { once: true });
})();

/* ══════════════════════════════════════════════════════════════
   KAYNAK SİMGELERİ + DÜĞÜM PENCERELERİ
   ------------------------------------------------------------
   1) `.kay-sim` — emoji yerine basılan kaynak görselinin ölçüsü.
      Ölçü `em` cinsindendir: hangi yazının içine girerse onun
      boyunu alır, yani yerine geçtiği emojiyle aynı büyüklükte
      görünür. Görselin adı troops.js ve dugum.js'te tanımlı.
   2) Arazi/canavar pencereleri (.abm-*) düz görünüme çekildi.
      Gövde `.overlay-card`'ın kalın kenarını ve dış parlamasını
      miras alıyordu; o kural mağaza/çanta panellerinde de
      kullanıldığı için silinemez, bu yüzden PANEL kuralı burada
      yazılıyor — yeni bir kural yığını değil, bu pencerenin
      kendi tek tanımı.
   ══════════════════════════════════════════════════════════════ */
(function kaynakSimgeVeDugumPencere(){
"use strict";
const st = document.createElement("style");
st.id = "temaKaynakSimge";
st.textContent = `
.kay-sim{
  display:inline-block; width:1.15em; height:1.15em;
  object-fit:contain; vertical-align:-.2em;
}

/* düğüm pencereleri: kalın kenar, dış parlama, iç kabartı YOK */
.arazi-bilgi-modal .abm-card{
  border:1px solid rgba(190,240,255,.20) !important;
  box-shadow:none !important;
}
/* içerideki kutucuk (arazide kalan / ödül) */
.arazi-bilgi-modal .abm-kalan{
  border:1px solid rgba(190,240,255,.20) !important;
  box-shadow:none !important;
}
/* düğmeler: çerçevesiz, düz gölge, basınca küçülme */
.arazi-bilgi-modal .abm-btn{
  border:none !important;
  box-shadow:none !important;
  text-shadow:0 1px 2px rgba(0,20,45,.55) !important;
  transition:transform .09s, filter .09s !important;
}
.arazi-bilgi-modal .abm-btn:active{
  transform:scale(.96) !important; filter:brightness(.93) !important;
}
/* ✕ düğmesi */
.arazi-bilgi-modal .abm-close{
  border:none !important;
  box-shadow:none !important;
}
`;
document.head.appendChild(st);
})();

/* ══════════════════════════════════════════════════════════════
   BİRLİK KAFA KUTUCUĞU — KADEME ARKA PLANI
   ------------------------------------------------------------
   Kafa kutucuğunun kullanıldığı HER YER aynı arka planı alır:
     · birlik menüsündeki kademe seçiciler (.uv-portrait)
     · savaş raporunda savaşa sürülen birlikler (.rep-por)
     · raporun karşılıklı stat başlıkları (.rp-krs-baslik .rep-por)

   Sv1 mavi (birlik1arkaplan.webp) · Sv2 kırmızı (birlik2arkaplan.webp).
   Sv3-Sv6 şimdilik arka plansız — kural yalnız 1 ve 2'yi seçer.

   ARKA PLAN NEDEN ::before?
   Kutunun kendi background alanına konsaydı, kilitli kademeyi
   soluklaştıran filtre ya arka planı atlardı (arka plan pırıl
   pırıl, birlik soluk) ya da kutuya verilince kademe numarasını
   da soluklaştırırdı. Ayrı katman olunca üçü bağımsız:
     ::before → arka plan   ·   img → birlik   ·   .kp-sv → numara
   Kilitliyken ilk ikisi AYNI değerle soluklaşır, numara net kalır.

   DİKKAT (Tuzak 50): arka plan RENGİNİ yazan kurallarda background
   kısayolu kullanılamaz — kısayol buradaki görseli de siler. Bu
   yüzden dosyadaki dört kural background-color'a çevrildi
   (.uv-portrait · .rep-por · rp-cols-troop · rp-krs-baslik).

   Kademe bilgisi işaretlemeden gelir:
     · .uv-portrait → data-kademe (index.html üretiyor)
     · .rep-por     → data-kad    (unitChips ve karşılıklı başlık)
   ══════════════════════════════════════════════════════════════ */
(function birlikKutuArkaPlan(){
"use strict";
const st = document.createElement("style");
st.id = "temaBirlikKutuArka";
st.textContent = `
/*  Arka plan katmanı. Kutu zaten overflow:hidden, taşma olmaz.
    Ölçü kutuya bağlı: kutucuk büyürse arka plan onunla ölçeklenir. */
html body #panel-troops .uv-portrait,
html body .rep-por{ position:relative !important; }

html body #panel-troops .uv-portrait[data-kademe="1"]::before,
html body #panel-troops .uv-portrait[data-kademe="2"]::before,
html body .rep-por[data-kad="1"]::before,
html body .rep-por[data-kad="2"]::before{
  content:"";
  position:absolute; inset:0;
  background-size:cover; background-position:center;
  background-repeat:no-repeat;
  pointer-events:none;
  z-index:0;
}
html body #panel-troops .uv-portrait[data-kademe="1"]::before,
html body .rep-por[data-kad="1"]::before{
  background-image:url("birlik1arkaplan.webp");
}
html body #panel-troops .uv-portrait[data-kademe="2"]::before,
html body .rep-por[data-kad="2"]::before{
  background-image:url("birlik2arkaplan.webp");
}

/*  Birlik görseli ve kademe numarası arka planın ÜSTÜNDE durur. */
html body #panel-troops .uv-portrait img,
html body #panel-troops .uv-portrait > span,
html body .rep-por img{ position:relative !important; z-index:1 !important; }
html body #panel-troops .uv-portrait .kp-sv{ z-index:2 !important; }

/*  KİLİTLİ KADEME — arka plan ve birlik BİRLİKTE soluklaşır.
    Seçili olan biraz daha okunur tutulur (eski değerler korundu).
    Numara .kp-sv filtreye girmez, net kalır.                      */
html body #panel-troops .uv-portrait.kp-kilit img,
html body #panel-troops .uv-portrait.kp-kilit::before{
  filter:grayscale(1) brightness(.6) !important;
}
html body #panel-troops .uv-portrait.kp-kilit.is-active img,
html body #panel-troops .uv-portrait.kp-kilit.is-active::before{
  filter:grayscale(.55) brightness(.8) !important;
}

/*  Kahraman portresi birlik değildir — data-kad taşımaz, hiçbir
    kurala girmez. Niyet açık dursun diye yazılıyor.               */
html body .rep-por-hero::before{ background-image:none !important; }

/* ── HASTANE ve SAVAŞ PANELİ ──
   Bu iki ekranda kutucuk kademe numarası taşımaz; birliğin
   KİMLİĞİNİ taşır (data-unit). Kimlik biçimi index.html
   kademeId() ile belirlenir: Sv1 = "knight" · Sv2 = "knight2".
   Kademeyi kimlikten okuduğumuz için işaretlemeye dokunmadan
   aynı arka planlar buraya da geliyor.                           */
html body .hospital-face,
html body #troopSelectList .t-icon{ position:relative !important; }

html body .hospital-face[data-unit="knight"]::before,
html body .hospital-face[data-unit="soldier"]::before,
html body .hospital-face[data-unit="robot"]::before,
html body #troopSelectList .t-icon[data-unit="knight"]::before,
html body #troopSelectList .t-icon[data-unit="soldier"]::before,
html body #troopSelectList .t-icon[data-unit="robot"]::before{
  content:"";
  position:absolute; inset:0;
  background-image:url("birlik1arkaplan.webp");
  background-size:cover; background-position:center;
  background-repeat:no-repeat;
  pointer-events:none; z-index:0;
}

html body .hospital-face[data-unit="knight2"]::before,
html body .hospital-face[data-unit="soldier2"]::before,
html body .hospital-face[data-unit="robot2"]::before,
html body #troopSelectList .t-icon[data-unit="knight2"]::before,
html body #troopSelectList .t-icon[data-unit="soldier2"]::before,
html body #troopSelectList .t-icon[data-unit="robot2"]::before{
  content:"";
  position:absolute; inset:0;
  background-image:url("birlik2arkaplan.webp");
  background-size:cover; background-position:center;
  background-repeat:no-repeat;
  pointer-events:none; z-index:0;
}

/*  Birlik görseli arka planın üstünde kalsın.                    */
html body .hospital-face img,
html body .hospital-face .hosp-emoji,
html body #troopSelectList .t-icon img.t-head{
  position:relative !important; z-index:1 !important;
}
`;
document.head.appendChild(st);
})();

/* ══════════════════════════════════════════════════════════════
   SAVAŞ PANELİ — BUFF BOYU · ORDU KAYITLARI · AİLE YÜZDELERİ
   ------------------------------------------------------------
   1) BUFF kutucuğu SAVAŞ düğmesiyle aynı boyda. Kutucuk satır
      kabının içinde absolute duruyordu, sabit 62px yüksekliği
      vardı. top/bottom'a sıfır verilince yüksekliği satırın
      kendisinden, yani düğmeden alır. Genişlik dokunulmadı.
      İçerik ufaltıldı, yoksa alçalan kutuya sığmıyor.
   2) Ordu kayıt yuvaları (1·2·3) ve 💾 düğmesi — troops.js.
   3) Aile yüzdeleri şeridi — küçük kutucuklar, rakamlarla
      aynı hizada, satırı büyütmüyor.
   ══════════════════════════════════════════════════════════════ */
(function savasPaneliKayitVeYuzde(){
"use strict";
const st = document.createElement("style");
st.id = "temaOrduKayit";
st.textContent = `
/* ── 1) BUFF = SAVAŞ boyu ── */
html body #battleArena #buffKutu{
  top:0 !important; bottom:0 !important;
  height:auto !important;
  transform:none !important;
  border-radius:11px !important;
  padding:2px !important;
  gap:0 !important;
}
html body #battleArena #buffKutu:active{
  transform:scale(.96) !important; filter:brightness(.93) !important;
}
html body #battleArena #buffKutu .bk-ico{ font-size:15px !important; }
html body #battleArena #buffKutu .bk-yazi{ font-size:8px !important; }
html body #battleArena #buffKutu .bk-rozet{
  width:17px !important; height:17px !important;
  top:-6px !important; right:-6px !important; font-size:10px !important;
}

/* ── 2) ORDU KAYIT YUVALARI ──
   Üç küçük kutucuk, panelin en üstünde, tek satır. */
html body #battleArena .ok-serit{
  display:flex !important; justify-content:center !important;
  gap:7px !important; margin:0 0 9px !important;
}
html body #battleArena .ok-yuva{
  width:30px; height:26px; padding:0;
  display:flex; align-items:center; justify-content:center;
  border-radius:8px; cursor:pointer;
  font-family:'Baloo 2','Nunito',sans-serif;
  font-weight:800; font-size:13px;
  font-variant-numeric:tabular-nums;
  color:#a8c7e0;
  background-color:rgba(6,20,44,.45);
  border:1px solid rgba(190,240,255,.20);
  box-shadow:none;
  text-shadow:0 1px 2px rgba(0,20,45,.55);
  transition:transform .09s, filter .09s;
  -webkit-tap-highlight-color:transparent;
}
html body #battleArena .ok-yuva:active{ transform:scale(.96); filter:brightness(.93); }
/* dolu yuva: içinde kadro var */
html body #battleArena .ok-yuva.ok-dolu{ color:#ffd257; }
/* seçili yuva: 💾 buraya yazar */
html body #battleArena .ok-yuva.ok-secili{
  border-color:#ffd257;
  background-color:rgba(255,210,87,.14);
  color:#ffd257;
}

/* 💾 — X düğmesinin solunda, aynı ölçüde */
html body #battleArena #orduKayitBtn{
  position:absolute !important;
  top:12px !important; right:60px !important;
  left:auto !important; bottom:auto !important; margin:0 !important;
  z-index:50 !important;
  width:38px !important; height:38px !important; padding:0 !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  border-radius:10px !important;
  font-size:18px !important; line-height:1 !important;
  background-color:rgba(6,20,44,.55) !important;
  border:1px solid rgba(190,240,255,.35) !important;
  box-shadow:none !important;
  -webkit-tap-highlight-color:transparent;
  transition:transform .09s, filter .09s !important;
}
html body #battleArena #orduKayitBtn:active{
  transform:scale(.96) !important; filter:brightness(.93) !important;
}

/* ── 3) AİLE YÜZDELERİ ──
   Başlığın hemen altında tek satır. Kutucuklar rakam kadar dar;
   birlik satırlarındaki .t-num ile aynı yükseklikte durur ki
   hizası kaymasın. */
html body #battleArena .ay-serit{
  display:flex !important; align-items:center !important;
  justify-content:center !important;
  gap:14px !important; margin:-2px 0 9px !important;
}
html body #battleArena .ay-oge{
  display:inline-flex !important; align-items:center !important; gap:4px !important;
}
html body #battleArena .ay-ico{ font-size:14px; line-height:1; }
html body #battleArena .ay-num{
  box-sizing:content-box !important;
  width:2.2ch; height:18px; padding:0 3px; text-align:center;
  border-radius:6px; outline:none;
  background-color:rgba(6,20,44,.6) !important;
  border:1.5px solid rgba(160,215,255,.45) !important;
  color:#fff !important;
  font-family:'Baloo 2','Nunito',sans-serif !important;
  font-weight:800 !important; font-size:13px !important;
  font-variant-numeric:tabular-nums !important;
  -webkit-appearance:none; appearance:none;
  -webkit-tap-highlight-color:transparent;
}
html body #battleArena .ay-num:focus{ border-color:#ffd257 !important; }
html body #battleArena .ay-pc{
  font-family:'Baloo 2','Nunito',sans-serif;
  font-weight:800; font-size:12.5px; color:#ffd257;
}
`;
document.head.appendChild(st);
})();

/* ══════════════════════════════════════════════════════════════
   SAVAŞ PANELİ — YER KAZANMA VE ÜST KÖŞE DÜZENİ
   ------------------------------------------------------------
   Sorun: panel ekranın tamamını kullanmıyordu. #battleArena'nın
   üstünde 65px, altında 53px iç boşluk vardı; panelin kendi
   dolgusu ve satır araları da genişti. İçerik bu yüzden erken
   taşıyor, .troop-select-box kaydırmaya düşüyor, oyuncu her
   defasında aşağı yukarı sürüklemek zorunda kalıyordu — oysa
   ekranda boş yer duruyordu.

   Burada o boşluklar kısaltılıyor. Kaydırma yeteneği duruyor
   (çok uzun listelerde gerekir) ama artık normal kadroda
   devreye girmiyor.

   Ayrıca: 1·2·3 yuvaları sol üst köşeye, 💾 X'in soluna, üçü de
   aynı ölçüde ve aynı hizada. "Komutan Seç" başlığı gizli
   (yuvalar panelin çocuğu olduğu için eski :first-child kuralı
   yine başlığı yakalıyor — bkz. troops.js orduKayitCiz).
   ══════════════════════════════════════════════════════════════ */
(function savasPaneliYerKazan(){
"use strict";
const st = document.createElement("style");
st.id = "temaSavasPanelYer";
st.textContent = `
/* ── 1) GÖRÜNMEZ ŞERİTLER KISALDI ── */
html body #battleArena{ padding:20px 10px 14px !important; }
html body #battleArena .battle-arena{
  padding:38px 12px 12px !important;
  max-height:100% !important;
  gap:6px !important;
}
/* satır araları da daraldı — üst üste binen boşluklar toplanıyordu */
html body #battleArena #troopSelectList{ margin-top:4px !important; }
html body #battleArena .troop-select-title{ margin-bottom:5px !important; }
html body #battleArena #troopSelectList .troop-select-row{ margin-bottom:7px !important; }
html body #battleArena #heroPicker{ margin:0 !important; }

/* Komutan Seç başlığı kalksın */
html body #battleArena .troop-select-box .troop-select-title:first-child{
  display:none !important;
}

/* ── 2) SOL ÜST: 1·2·3 · SAĞ ÜST: 💾 ve X ──
   Üçü de aynı ölçü, aynı hiza. X zaten top:0/right:6. */
html body #battleArena .ok-serit{
  position:absolute !important;
  top:0 !important; left:6px !important;
  z-index:50 !important;
  display:flex !important; justify-content:flex-start !important;
  gap:6px !important; margin:0 !important;
}
html body #battleArena .ok-yuva{
  width:34px !important; height:34px !important;
  border-radius:10px !important;
  font-size:14px !important;
}
html body #battleArena #orduKayitBtn{
  top:0 !important; right:48px !important;
  width:34px !important; height:34px !important;
  border-radius:10px !important;
  font-size:17px !important;
}

/* ── 3) YÜZDE İŞARETİ KUTUCUĞA YAKLAŞTI ── */
html body #battleArena .ay-oge{ gap:2px !important; }
html body #battleArena .ay-serit{ gap:12px !important; margin:0 0 6px !important; }
`;
document.head.appendChild(st);
})();
