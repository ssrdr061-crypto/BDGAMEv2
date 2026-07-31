/* MAĞAZA EKLENTİSİ — görünüm + kod tek dosyada */
(function(){ const st = document.createElement("style"); st.textContent = '/* ═══════════════════════════════════════════════════════\n   MAĞAZA GÖRÜNÜMÜ — oyundan bağımsız eklenti dosyası.\n   Oyunun kendi CSS\'ine dokunmaz; sadece mağaza panelini\n   (#panel-shop) yeniden giydirir.\n   ═══════════════════════════════════════════════════════ */\n@import url(\'https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap\');\n\n#panel-shop .overlay-card{\n  background:\n    radial-gradient(ellipse 100% 50% at 50% 0%, rgba(170,240,255,.5), transparent 72%),\n    radial-gradient(ellipse 80% 40% at 50% 105%, rgba(8,45,80,.55), transparent 75%),\n    linear-gradient(180deg, #1fa3ea, #0e6fc0);\n  border:3px solid rgba(190,240,255,.85);\n  box-shadow:0 0 26px rgba(120,225,255,.45), inset 0 3px 0 rgba(255,255,255,.45);\n}\n#panel-shop h2{ color:#fff; text-shadow:0 2px 4px rgba(0,40,70,.6); }\n\n.shop-refresh-band{\n  text-align:center; margin:2px 0 8px;\n  color:#fff; font-family:\'Baloo 2\',\'Nunito\',sans-serif; font-weight:800; font-size:13px;\n  text-shadow:0 1px 3px rgba(0,30,55,.5);\n}\n.shop-refresh-band .clock{ color:#ffd257; }\n\n#panel-shop .shop-tabs{\n  display:flex; gap:8px; overflow-x:auto; padding:2px 2px 8px;\n  border:none; background:none;\n}\n#panel-shop .shop-tab{\n  flex-shrink:0; cursor:pointer;\n  font-family:\'Baloo 2\',\'Nunito\',sans-serif; font-weight:800; font-size:12px;\n  color:#dff4ff; padding:4px 14px; border-radius:16px;\n  background:linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.06));\n  border:2px solid rgba(190,240,255,.45);\n  text-shadow:0 1px 2px rgba(0,30,55,.5);\n  transition:all .15s ease;\n}\n#panel-shop .shop-tab:hover{ border-color:#fff; color:#fff; }\n#panel-shop .shop-tab.active{\n  background:linear-gradient(180deg,#ffffff,#cfeefb);\n  color:#0e6fc0; border-color:#fff; text-shadow:none;\n  box-shadow:0 3px 8px rgba(0,30,60,.35);\n}\n\n#panel-shop .shop-grid{\n  position:relative;\n  display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;\n  align-items:start; align-content:start;\n  overflow-y:auto; max-height:56vh; padding:4px 2px 14px;\n  scrollbar-width:thin; scrollbar-color:#5bb9e6 transparent;\n}\n#panel-shop .shop-grid::-webkit-scrollbar{width:8px;}\n#panel-shop .shop-grid::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#7fd0f2,#3d9fd6); border-radius:8px;}\n#panel-shop .shop-grid::-webkit-scrollbar-track{background:rgba(0,0,0,.15);}\n\n#panel-shop .shop-tier-header{\n  grid-column:1 / -1;\n  font-family:\'Baloo 2\',\'Nunito\',sans-serif; font-weight:800; font-size:12.5px;\n  color:#fff; text-shadow:0 1px 3px rgba(0,30,55,.6);\n  margin:4px 0 0; border:none; background:none; padding:0;\n}\n\n/* ── ürün kartı ── */\n.shop-card2{\n  position:relative;\n  background:linear-gradient(180deg, #3d7ccc 0%, #22488f 55%, #152e5e 100%);\n  border-radius:14px;\n  padding:8px 6px 0;\n  display:flex; flex-direction:column; align-items:center; gap:4px;\n  overflow:hidden;\n  box-shadow:\n    0 5px 0 #0b1c3a,\n    0 10px 16px rgba(0,20,45,.5),\n    inset 0 2px 3px rgba(150,205,255,.55),\n    inset 0 -4px 8px rgba(0,10,30,.55);\n  cursor:pointer;\n  transition:transform .12s, filter .12s;\n  animation:shopCardIn .3s cubic-bezier(.2,1.2,.35,1) backwards;\n}\n@keyframes shopCardIn{\n  from{ opacity:0; transform:translateY(16px) scale(.92); }\n  to  { opacity:1; transform:translateY(0) scale(1); }\n}\n.shop-card2:hover{ transform:translateY(-3px); filter:brightness(1.1) saturate(1.12); }\n.shop-card2:active{ transform:translateY(1px) scale(.98); }\n\n.shop-card2 .sc-icon{\n  position:relative;\n  width:58%; aspect-ratio:1/1;\n  border-radius:8px;\n  background:linear-gradient(180deg, #ffd257, #f0932b);\n  box-shadow:inset 0 3px 0 rgba(255,255,255,.6), inset 0 -5px 8px rgba(140,60,0,.45), 0 3px 6px rgba(0,15,40,.45);\n  display:flex; align-items:center; justify-content:center;\n}\n.shop-card2 .sc-icon::before{\n  content:""; position:absolute; top:-40%; left:-15%;\n  width:130%; height:75%;\n  background:radial-gradient(ellipse at center, rgba(255,255,255,.5), transparent 65%);\n  transform:rotate(-8deg); pointer-events:none;\n}\n.shop-card2 .sc-icon svg{ width:62%; height:62%; position:relative; }\n.shop-card2 .sc-badge{\n  position:absolute; right:2px; bottom:2px;\n  background:rgba(0,0,0,.5); color:#fff;\n  font-family:\'Baloo 2\',sans-serif; font-weight:800; font-size:9px;\n  border-radius:4px; padding:0 4px;\n}\n.shop-card2 .sc-tag{\n  font-family:\'Baloo 2\',sans-serif; font-weight:800; font-size:8.5px;\n  color:#9fe3ff; letter-spacing:.4px;\n  text-shadow:0 1px 2px rgba(0,10,30,.7);\n  margin-bottom:-3px;\n}\n.shop-card2 .sc-name{\n  font-family:\'Baloo 2\',sans-serif; font-weight:800; font-size:10px;\n  color:#eaf4ff; text-align:center; line-height:1.05;\n  max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;\n  text-shadow:0 1px 2px rgba(0,10,30,.7); padding:0 2px;\n}\n\n/* rakamlar: beyaz dolgu + lacivert kontur (3B) */\n.shop-card2 .sc-left, .shop-card2 .sc-price, .shop-qty-pop .sc-buy{\n  font-family:\'Baloo 2\',\'Nunito\',sans-serif; font-weight:800; color:#fff;\n  text-shadow:\n    -2px -1px 0 #1d3a63, 2px -1px 0 #1d3a63,\n    -2px 2px 0 #1d3a63, 2px 2px 0 #1d3a63,\n    0 -2px 0 #1d3a63, 0 2px 0 #1d3a63,\n    -2px 0 0 #1d3a63, 2px 0 0 #1d3a63,\n    0 3px 0 #142a4a;\n}\n.shop-card2 .sc-left{ font-size:13px; white-space:nowrap; line-height:1.1; }\n.shop-card2 .sc-price{\n  width:calc(100% + 12px); margin:1px -6px 0;\n  border:none; cursor:pointer;\n  background:linear-gradient(180deg,#0e2246 0%, #1a3a75 100%);\n  padding:4px 0 5px; font-size:12.5px;\n  box-shadow:inset 0 3px 6px rgba(0,8,25,.6), inset 0 -2px 0 rgba(120,180,255,.25);\n  transition:filter .1s, transform .06s;\n}\n.shop-card2 .sc-price:hover{ filter:brightness(1.15); }\n.shop-card2 .sc-price:active{ transform:translateY(2px); }\n.shop-card2 .sc-price:disabled{ cursor:not-allowed; opacity:.75; }\n\n/* tükendi durumu: kart kalır, grileşir */\n.shop-card2.soldout .sc-icon{ filter:saturate(.1) brightness(.85); }\n.shop-card2.soldout::before{\n  content:""; position:absolute; inset:0; z-index:2;\n  background:rgba(120,130,140,.32); border-radius:14px; pointer-events:none;\n}\n.shop-card2 .sc-soldtag{\n  position:absolute; top:34%; left:50%; transform:translate(-50%,-50%) rotate(-8deg);\n  z-index:3; background:rgba(90,100,110,.92); color:#fff;\n  font-family:\'Baloo 2\',sans-serif; font-weight:800; font-size:10px; letter-spacing:1px;\n  padding:2px 10px; border-radius:5px;\n  box-shadow:0 2px 4px rgba(0,0,0,.35);\n}\n.shop-card2.bought{ animation:shopPop .3s ease; }\n@keyframes shopPop{ 40%{ transform:scale(1.07); box-shadow:0 0 18px rgba(255,210,87,.85); } }\n\n/* ── adet sürgüsü ve özellik baloncuğu ── */\n.shop-qty-pop, .shop-info-pop{\n  position:absolute; z-index:20;\n  background:linear-gradient(180deg, rgba(26,58,117,.97), rgba(14,34,70,.97));\n  border-radius:12px;\n  box-shadow:0 10px 20px rgba(0,15,40,.55);\n  animation:shopCardIn .18s ease both;\n}\n.shop-qty-pop{\n  display:flex; flex-direction:column; align-items:center; gap:5px;\n  padding:7px 10px 8px;\n}\n.shop-qty-pop input[type=range]{\n  width:100%; -webkit-appearance:none; appearance:none;\n  height:7px; border-radius:4px;\n  background:linear-gradient(180deg,#ffffff,#cfe9f6);\n  box-shadow:inset 0 1px 3px rgba(20,80,120,.45);\n  outline:none;\n}\n.shop-qty-pop input[type=range]::-webkit-slider-thumb{\n  -webkit-appearance:none; appearance:none;\n  width:22px; height:22px;\n  background:transparent url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\'%3E%3Ctext x=\'10\' y=\'16\' font-size=\'16\' text-anchor=\'middle\'%3E%F0%9F%92%8E%3C/text%3E%3C/svg%3E") center/contain no-repeat;\n  cursor:grab;\n}\n.shop-qty-pop input[type=range]::-moz-range-thumb{\n  width:22px; height:22px; border:none;\n  background:transparent url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\'%3E%3Ctext x=\'10\' y=\'16\' font-size=\'16\' text-anchor=\'middle\'%3E%F0%9F%92%8E%3C/text%3E%3C/svg%3E") center/contain no-repeat;\n  cursor:grab;\n}\n.shop-qty-pop .sc-buy{\n  align-self:center; border:none; cursor:pointer;\n  background:linear-gradient(180deg,#6ee07f,#2cab44);\n  font-size:12px; letter-spacing:.4px;\n  border-radius:8px; padding:3px 18px;\n  box-shadow:0 3px 0 #1c7d31, inset 0 1px 0 rgba(255,255,255,.5);\n  transition:transform .06s, box-shadow .06s;\n  white-space:nowrap;\n  text-shadow:\n    -1px -1px 0 #1c6e31, 1px -1px 0 #1c6e31,\n    -1px 1px 0 #1c6e31, 1px 1px 0 #1c6e31,\n    0 2px 0 #145425;\n}\n.shop-qty-pop .sc-buy:active{ transform:translateY(3px); box-shadow:0 0 0 #1c7d31; }\n\n.shop-info-pop{ padding:8px 12px 9px; cursor:pointer; }\n.shop-info-pop .in-name{\n  color:#ffd257; font-family:\'Baloo 2\',sans-serif; font-weight:800; font-size:13px;\n  text-shadow:0 1px 2px rgba(0,10,30,.7); margin-bottom:2px;\n}\n.shop-info-pop .in-desc{\n  color:#eaf4ff; font-family:\'Nunito\',sans-serif; font-weight:700; font-size:11px; line-height:1.3;\n  text-shadow:0 1px 2px rgba(0,10,30,.6);\n}\n.shop-info-pop .in-tl{\n  color:#9fe3ff; font-family:\'Baloo 2\',sans-serif; font-weight:800; font-size:10px; margin-top:3px;\n}\n\n@media (max-width:480px){\n  #panel-shop .shop-grid{ gap:8px; }\n}\n'; document.head.appendChild(st); })();

/* Stil bu dosyaya gömülüdür — görünüm ayarları için aşağıdaki CSS bloğunu düzenle */
(function(){const st=document.createElement("style");st.textContent="/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n   MA\u011eAZA G\u00d6R\u00dcN\u00dcM\u00dc \u2014 oyundan ba\u011f\u0131ms\u0131z eklenti dosyas\u0131.\n   Oyunun kendi CSS'ine dokunmaz; sadece ma\u011faza panelini\n   (#panel-shop) yeniden giydirir.\n   \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */\n@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap');\n\n#panel-shop .overlay-card{\n  background:\n    radial-gradient(ellipse 100% 50% at 50% 0%, rgba(170,240,255,.5), transparent 72%),\n    radial-gradient(ellipse 80% 40% at 50% 105%, rgba(8,45,80,.55), transparent 75%),\n    linear-gradient(180deg, #1fa3ea, #0e6fc0);\n  border:3px solid rgba(190,240,255,.85);\n  box-shadow:0 0 26px rgba(120,225,255,.45), inset 0 3px 0 rgba(255,255,255,.45);\n}\n#panel-shop h2{ color:#fff; text-shadow:0 2px 4px rgba(0,40,70,.6); }\n\n.shop-refresh-band{\n  text-align:center; margin:2px 0 8px;\n  color:#fff; font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:13px;\n  text-shadow:0 1px 3px rgba(0,30,55,.5);\n}\n.shop-refresh-band .clock{ color:#ffd257; }\n\n#panel-shop .shop-tabs{\n  display:flex; gap:8px; overflow-x:auto; padding:2px 2px 8px;\n  border:none; background:none;\n}\n#panel-shop .shop-tab{\n  flex-shrink:0; cursor:pointer;\n  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:12px;\n  color:#dff4ff; padding:4px 14px; border-radius:16px;\n  background:linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.06));\n  border:2px solid rgba(190,240,255,.45);\n  text-shadow:0 1px 2px rgba(0,30,55,.5);\n  transition:all .15s ease;\n}\n#panel-shop .shop-tab:hover{ border-color:#fff; color:#fff; }\n#panel-shop .shop-tab.active{\n  background:linear-gradient(180deg,#ffffff,#cfeefb);\n  color:#0e6fc0; border-color:#fff; text-shadow:none;\n  box-shadow:0 3px 8px rgba(0,30,60,.35);\n}\n\n#panel-shop .shop-grid{\n  position:relative;\n  display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;\n  align-items:start; align-content:start;\n  overflow-y:auto; max-height:56vh; padding:4px 2px 14px;\n  scrollbar-width:thin; scrollbar-color:#5bb9e6 transparent;\n}\n#panel-shop .shop-grid::-webkit-scrollbar{width:8px;}\n#panel-shop .shop-grid::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#7fd0f2,#3d9fd6); border-radius:8px;}\n#panel-shop .shop-grid::-webkit-scrollbar-track{background:rgba(0,0,0,.15);}\n\n#panel-shop .shop-tier-header{\n  grid-column:1 / -1;\n  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:12.5px;\n  color:#fff; text-shadow:0 1px 3px rgba(0,30,55,.6);\n  margin:4px 0 0; border:none; background:none; padding:0;\n}\n\n/* \u2500\u2500 \u00fcr\u00fcn kart\u0131 \u2500\u2500 */\n.shop-card2{\n  position:relative;\n  background:linear-gradient(180deg, #3d7ccc 0%, #22488f 55%, #152e5e 100%);\n  border-radius:14px;\n  padding:8px 6px 0;\n  display:flex; flex-direction:column; align-items:center; gap:4px;\n  overflow:hidden;\n  box-shadow:\n    0 5px 0 #0b1c3a,\n    0 10px 16px rgba(0,20,45,.5),\n    inset 0 2px 3px rgba(150,205,255,.55),\n    inset 0 -4px 8px rgba(0,10,30,.55);\n  cursor:pointer;\n  transition:transform .12s, filter .12s;\n  animation:shopCardIn .3s cubic-bezier(.2,1.2,.35,1) backwards;\n}\n@keyframes shopCardIn{\n  from{ opacity:0; transform:translateY(16px) scale(.92); }\n  to  { opacity:1; transform:translateY(0) scale(1); }\n}\n.shop-card2:hover{ transform:translateY(-3px); filter:brightness(1.1) saturate(1.12); }\n.shop-card2:active{ transform:translateY(1px) scale(.98); }\n\n.shop-card2 .sc-icon{\n  position:relative;\n  width:58%; aspect-ratio:1/1;\n  border-radius:8px;\n  background:linear-gradient(180deg, #ffd257, #f0932b);\n  box-shadow:inset 0 3px 0 rgba(255,255,255,.6), inset 0 -5px 8px rgba(140,60,0,.45), 0 3px 6px rgba(0,15,40,.45);\n  display:flex; align-items:center; justify-content:center;\n}\n.shop-card2 .sc-icon::before{\n  content:\"\"; position:absolute; top:-40%; left:-15%;\n  width:130%; height:75%;\n  background:radial-gradient(ellipse at center, rgba(255,255,255,.5), transparent 65%);\n  transform:rotate(-8deg); pointer-events:none;\n}\n.shop-card2 .sc-icon svg{ width:62%; height:62%; position:relative; }\n.shop-card2 .sc-badge{\n  position:absolute; right:2px; bottom:2px;\n  background:rgba(0,0,0,.5); color:#fff;\n  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:9px;\n  border-radius:4px; padding:0 4px;\n}\n.shop-card2 .sc-tag{\n  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:8.5px;\n  color:#9fe3ff; letter-spacing:.4px;\n  text-shadow:0 1px 2px rgba(0,10,30,.7);\n  margin-bottom:-3px;\n}\n.shop-card2 .sc-name{\n  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:10px;\n  color:#eaf4ff; text-align:center; line-height:1.05;\n  max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;\n  text-shadow:0 1px 2px rgba(0,10,30,.7); padding:0 2px;\n}\n\n/* rakamlar: beyaz dolgu + lacivert kontur (3B) */\n.shop-card2 .sc-left, .shop-card2 .sc-price, .shop-qty-pop .sc-buy{\n  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; color:#fff;\n  text-shadow:\n    -2px -1px 0 #1d3a63, 2px -1px 0 #1d3a63,\n    -2px 2px 0 #1d3a63, 2px 2px 0 #1d3a63,\n    0 -2px 0 #1d3a63, 0 2px 0 #1d3a63,\n    -2px 0 0 #1d3a63, 2px 0 0 #1d3a63,\n    0 3px 0 #142a4a;\n}\n.shop-card2 .sc-left{ font-size:13px; white-space:nowrap; line-height:1.1; }\n.shop-card2 .sc-price{\n  width:calc(100% + 12px); margin:1px -6px 0;\n  border:none; cursor:pointer;\n  background:linear-gradient(180deg,#0e2246 0%, #1a3a75 100%);\n  padding:4px 0 5px; font-size:12.5px;\n  box-shadow:inset 0 3px 6px rgba(0,8,25,.6), inset 0 -2px 0 rgba(120,180,255,.25);\n  transition:filter .1s, transform .06s;\n}\n.shop-card2 .sc-price:hover{ filter:brightness(1.15); }\n.shop-card2 .sc-price:active{ transform:translateY(2px); }\n.shop-card2 .sc-price:disabled{ cursor:not-allowed; opacity:.75; }\n\n/* t\u00fckendi durumu: kart kal\u0131r, grile\u015fir */\n.shop-card2.soldout .sc-icon{ filter:saturate(.1) brightness(.85); }\n.shop-card2.soldout::before{\n  content:\"\"; position:absolute; inset:0; z-index:2;\n  background:rgba(120,130,140,.32); border-radius:14px; pointer-events:none;\n}\n.shop-card2 .sc-soldtag{\n  position:absolute; top:34%; left:50%; transform:translate(-50%,-50%) rotate(-8deg);\n  z-index:3; background:rgba(90,100,110,.92); color:#fff;\n  font-family:'Baloo 2',sans-serif; font-weight:800; font-size:10px; letter-spacing:1px;\n  padding:2px 10px; border-radius:5px;\n  box-shadow:0 2px 4px rgba(0,0,0,.35);\n}\n.shop-card2.bought{ animation:shopPop .3s ease; }\n@keyframes shopPop{ 40%{ transform:scale(1.07); box-shadow:0 0 18px rgba(255,210,87,.85); } }\n\n/* \u2500\u2500 adet s\u00fcrg\u00fcs\u00fc ve \u00f6zellik baloncu\u011fu \u2500\u2500 */\n.shop-qty-pop, .shop-info-pop{\n  position:absolute; z-index:20;\n  background:linear-gradient(180deg, rgba(26,58,117,.97), rgba(14,34,70,.97));\n  border-radius:12px;\n  box-shadow:0 10px 20px rgba(0,15,40,.55);\n  animation:shopCardIn .18s ease both;\n}\n.shop-qty-pop{\n  display:flex; flex-direction:column; align-items:center; gap:5px;\n  padding:7px 10px 8px;\n}\n.shop-qty-pop input[type=range]{\n  width:100%; -webkit-appearance:none; appearance:none;\n  height:7px; border-radius:4px;\n  background:linear-gradient(180deg,#ffffff,#cfe9f6);\n  box-shadow:inset 0 1px 3px rgba(20,80,120,.45);\n  outline:none;\n}\n.shop-qty-pop input[type=range]::-webkit-slider-thumb{\n  -webkit-appearance:none; appearance:none;\n  width:22px; height:22px;\n  background:transparent url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ctext x='10' y='16' font-size='16' text-anchor='middle'%3E%F0%9F%92%8E%3C/text%3E%3C/svg%3E\") center/contain no-repeat;\n  cursor:grab;\n}\n.shop-qty-pop input[type=range]::-moz-range-thumb{\n  width:22px; height:22px; border:none;\n  background:transparent url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ctext x='10' y='16' font-size='16' text-anchor='middle'%3E%F0%9F%92%8E%3C/text%3E%3C/svg%3E\") center/contain no-repeat;\n  cursor:grab;\n}\n.shop-qty-pop .sc-buy{\n  align-self:center; border:none; cursor:pointer;\n  background:linear-gradient(180deg,#6ee07f,#2cab44);\n  font-size:12px; letter-spacing:.4px;\n  border-radius:8px; padding:3px 18px;\n  box-shadow:0 3px 0 #1c7d31, inset 0 1px 0 rgba(255,255,255,.5);\n  transition:transform .06s, box-shadow .06s;\n  white-space:nowrap;\n  text-shadow:\n    -1px -1px 0 #1c6e31, 1px -1px 0 #1c6e31,\n    -1px 1px 0 #1c6e31, 1px 1px 0 #1c6e31,\n    0 2px 0 #145425;\n}\n.shop-qty-pop .sc-buy:active{ transform:translateY(3px); box-shadow:0 0 0 #1c7d31; }\n\n.shop-info-pop{ padding:8px 12px 9px; cursor:pointer; }\n.shop-info-pop .in-name{\n  color:#ffd257; font-family:'Baloo 2',sans-serif; font-weight:800; font-size:13px;\n  text-shadow:0 1px 2px rgba(0,10,30,.7); margin-bottom:2px;\n}\n.shop-info-pop .in-desc{\n  color:#eaf4ff; font-family:'Nunito',sans-serif; font-weight:700; font-size:11px; line-height:1.3;\n  text-shadow:0 1px 2px rgba(0,10,30,.6);\n}\n.shop-info-pop .in-tl{\n  color:#9fe3ff; font-family:'Baloo 2',sans-serif; font-weight:800; font-size:10px; margin-top:3px;\n}\n\n@media (max-width:480px){\n  #panel-shop .shop-grid{ gap:8px; }\n}\n";document.head.appendChild(st);})();

/* ═══════════════════════════════════════════════════════════════
   MAĞAZA EKLENTİSİ (magaza.js)
   Oyun kodundan bağımsızdır. Oyun dosyasının SONUNDA yüklenir ve
   mağazanın TÜM verisini (shopItems), görünümünü ve mantığını
   (renderShop, buyItem) kendi içinde barındırır.
   Ana kodda artık mağaza/item tanımı YOKTUR — itemleri eklemek,
   çıkarmak veya fiyatlarını değiştirmek için sadece bu dosyayı
   düzenle.

   ── ÜRÜN LİSTESİ (shopItems) ─────────────────────────────────────
   Yeni item eklemek için bu diziye yeni bir satır ekle, silmek için
   ilgili satırı kaldır. Alan açıklamaları:
     name      → mağazada/çantada görünen isim (BENZERSİZ olmalı,
                 envanter bu isme göre sayılır)
     price     → elmas fiyatı
     icon      → emoji simge
     isBoost   → true ise kahraman boost itemi (tek seferlik)
       heroId    → kahramanın heroes.js'teki id'si
       heroName  → kahramanın görünen adı (mağazada etiket)
       boostDesc → açıklama metni
       effect    → savaş motorunun okuyacağı efekt verisi
     isStaminaPotion / isSpeedUpItem → özel tüketim itemleri
   ═══════════════════════════════════════════════════════════════ */

const shopItems = [

  { name: "5 Dakika Hızlandırma", price: 200, isSpeedUpItem: true, speedUpMinutes: 5, icon: "⏩" },
  { name: "Can Potu", price: (typeof STAMINA_POTION_PRICE !== "undefined" ? STAMINA_POTION_PRICE : 6000), isStaminaPotion: true, icon: "❤️" },

  /* ── FÜZE (kale saldırısı) ── */
  { name: "Füze", price: 200000, isMissile: true, icon: "🚀",
    missileDesc: "Kale saldırısı için 1 füze. Haritada bir düşman kalesine 🚀 ile atılır ve kaleye ağır hasar verir. Füze yiyen oyuncu 24 saat boyunca hiçbir saldırı yapamaz (yalnızca savunma ve füze). Haftalık en fazla 2 adet alınabilir." },

  /* ── HALVORSEN (Buz Savaşçısı) ── */
  { name: "Buzul Özü", price: 6000, isBoost: true, heroId: "buz_savascisi", heroName: "HALVORSEN", icon: "🧊",
    boostDesc: "Halvorsen'in birlik savunmasını %15 artırır.",
    effect: { type: "boost_troop_def_pct", value: 15 } },
  { name: "Direnç İlacı", price: 6500, isBoost: true, heroId: "buz_savascisi", heroName: "HALVORSEN", icon: "🩹",
    boostDesc: "Yalnızca savunmada Halvorsen'in birliklerinin canını %22 artırır.",
    effect: { type: "boost_troop_hp_pct_defense_only", value: 22 } },

  /* ── STELLİN (Çelik Savaşçı) ── */
  { name: "Titanyum Tozu", price: 9000, isBoost: true, heroId: "celik_savasci", heroName: "STELLİN", icon: "✨",
    boostDesc: "%45 olasılıkla birlikler rastgele 3 tur boyunca %200 hasar verir.",
    effect: { type: "boost_random_turns_damage", chance: 45, turns: 3, damagePct: 200 } },
  { name: "Tank Güdüsü", price: 9500, isBoost: true, heroId: "celik_savasci", heroName: "STELLİN", icon: "🛡️",
    boostDesc: "%60 ihtimalle ilk 3 tur boyunca tüm birliklerin savunma ve canını %150 artırır.",
    effect: { type: "boost_first_turns_def_hp", chance: 60, turns: 3, valuePct: 150 } },

  /* ── MİKİAN (Ateş Büyücüsü) ── */
  { name: "Perdeleme", price: 8000, isBoost: true, heroId: "ates_buyucusu", heroName: "MİKİAN", icon: "🌫️",
    boostDesc: "Birliklerin aldığı hasarı 2 turda 1 %50 azaltır.",
    effect: { type: "boost_periodic_damage_reduce", everyTurns: 2, reducePct: 50 } },
  { name: "Destek Bilgi", price: 8500, isBoost: true, heroId: "ates_buyucusu", heroName: "MİKİAN", icon: "📡",
    boostDesc: "İlk 2 tur boyunca tüm rakip birliklere %80 fazla hasar verir.",
    effect: { type: "boost_first_turns_bonus_damage", turns: 2, bonusPct: 80 } },

  /* ── İVANOVNA (Komutan) ── */
  { name: "Artan Aşk", price: 12000, isBoost: true, heroId: "ivanovna", heroName: "İVANOVNA", icon: "💗",
    boostDesc: "Birliklerin Sevgilisi yeteneğindeki mevcut değeri 2 katına çıkartır.",
    effect: { type: "boost_double_ability", ability: "wounded_return_pct" } },
  { name: "Paralı Muhafız", price: 12500, isBoost: true, heroId: "ivanovna", heroName: "İVANOVNA", icon: "🪙",
    boostDesc: "Savaşan birliklerin sayısını %20 artırır.",
    effect: { type: "boost_troop_count_pct", value: 20 } },

  /* ── REVOLİA (Robot Komutan) ── */
  { name: "Ek Bağlantı", price: 10000, isBoost: true, heroId: "revolia", heroName: "REVOLİA", icon: "🔌",
    boostDesc: "Robot birlikler her 3 turda bir %90 ihtimalle %195 hasar verir.",
    effect: { type: "boost_robot_periodic_damage", everyTurns: 3, chance: 90, damagePct: 195 } },
  { name: "Yedek Şarj", price: 10500, isBoost: true, heroId: "revolia", heroName: "REVOLİA", icon: "🔋",
    boostDesc: "Tüm birliklerin toplam canına ek %50 ekstra can sağlığı ekler.",
    effect: { type: "boost_total_hp_pct", value: 50 } },
];

function getItemDef(name) {
  return shopItems.find(it => it.name === name) || null;
}

/* ── AYARLAR ──────────────────────────────────────────────────── */

/* Haftalık satın alma limitleri (oyuncu başına).
   Ürün adı → haftalık adet. Sayıyı değiştirerek ayarla.
   Burada OLMAYAN ürünler limitsizdir (kartta ∞ görünür). */
const SHOP_LIMITS = {
  "Füze": 2,
  "5 Dakika Hızlandırma": 10000,
  "Can Potu": 30,
  "Buzul Özü": 5,
  "Direnç İlacı": 5,
  "Titanyum Tozu": 5,
  "Tank Güdüsü": 5,
  "Perdeleme": 5,
  "Destek Bilgi": 5,
  "Artan Aşk": 5,
  "Paralı Muhafız": 5,
  "Ek Bağlantı": 5,
  "Yedek Şarj": 5,
};

/* Yenilenme HERKES için aynı anda: her Pazartesi 00:00 (UTC). */
const SHOP_WEEK_ANCHOR = Date.UTC(2024, 0, 1); // bir Pazartesi
const SHOP_WEEK_MS = 7 * 24 * 3600 * 1000;

/* ── HAFTALIK DÖNGÜ ───────────────────────────────────────────── */

function shopWeekId() { return Math.floor((Date.now() - SHOP_WEEK_ANCHOR) / SHOP_WEEK_MS); }

function ensureShopWeek() {
  if (!state.shopBuys) state.shopBuys = {};
  const w = shopWeekId();
  if (state.shopWeek !== w) {
    state.shopWeek = w;
    state.shopBuys = {};          // yeni hafta: bu oyuncunun limitleri sıfırlanır
    persistCurrentState();
  }
}

function shopLimitOf(item) { return SHOP_LIMITS[item.name] || 0; }
function shopBought(name) { return (state.shopBuys && state.shopBuys[name]) || 0; }
function shopLeft(item) {
  const lim = shopLimitOf(item);
  if (!lim) return Infinity;
  return Math.max(0, lim - shopBought(item.name));
}

function shopResetText() {
  const ms = SHOP_WEEK_ANCHOR + (shopWeekId() + 1) * SHOP_WEEK_MS - Date.now();
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600),
        m = Math.floor(t % 3600 / 60), sec = t % 60;
  const p = n => String(n).padStart(2, "0");
  return d + "g " + p(h) + ":" + p(m) + ":" + p(sec);
}

let _shopLastWeek = shopWeekId();
setInterval(() => {
  const el = document.getElementById("shopRefreshTimer");
  if (el) el.textContent = shopResetText();
  const w = shopWeekId();
  if (w !== _shopLastWeek) {
    _shopLastWeek = w;
    if (typeof currentUsername !== "undefined" && currentUsername) {
      ensureShopWeek();
      renderShop();
      showToast("🏪 Mağaza yenilendi! Haftalık limitler sıfırlandı.");
    }
  }
}, 1000);

/* ── KAYIT SİSTEMİNE BAĞLANMA ─────────────────────────────────────
   Oyuncunun haftalık alımları buluta ve hesap koduna da girsin diye
   oyunun kayıt fonksiyonlarını sarmalıyoruz. */
const _shopOrigCompact = compactStateForExport;
compactStateForExport = function (s) {
  const out = _shopOrigCompact(s);
  if (s.shopWeek !== undefined && s.shopWeek !== null) out.sw = s.shopWeek;
  if (s.shopBuys && Object.keys(s.shopBuys).length) out.sb = s.shopBuys;
  return out;
};
const _shopOrigExpand = expandCompactState;
expandCompactState = function (c) {
  const st = _shopOrigExpand(c);
  if (c.sw !== undefined) st.shopWeek = c.sw;
  if (c.sb) st.shopBuys = c.sb;
  return st;
};

/* ── YENİLENME SAYACINI PANELE EKLE ───────────────────────────── */
(function injectRefreshBand() {
  const panel = document.getElementById("panel-shop");
  if (!panel) return;
  const band = document.createElement("div");
  band.className = "shop-refresh-band";
  band.innerHTML = 'Yenilenme: <span class="clock">🕐</span> <span id="shopRefreshTimer">' + shopResetText() + '</span>';
  const desc = panel.querySelector(".desc");
  if (desc) desc.replaceWith(band);
  else {
    const h2 = panel.querySelector("h2");
    if (h2) h2.after(band);
  }
})();

/* ── MAĞAZAYI YENİ TASARIMLA ÇİZ (oyunun renderShop'unu devralır) ── */
function renderShop() {
  const grid = $id("shopGrid");
  if (!grid) return;
  ensureShopWeek();
  closeShopPopups();
  const tierLabels = { entry: "🔹 Giriş Seviyesi", mid: "🔷 Orta Seviye", elite: "🟠 Elit Seviye" };

  const filtered = shopItems.filter(item => {
    if (activeShopCategory === "all") return true;
    if (activeShopCategory === "potion") return !!(item.isStaminaPotion || item.isSpeedUpItem);
    if (activeShopCategory === "boost") return !!item.isBoost;
    return item.slot === activeShopCategory;
  });

  let lastTier = null;
  let html = "";

  filtered.forEach((item, i) => {
    const realIdx = shopItems.indexOf(item);

    if (item.isBoost && activeShopCategory === "all" && lastTier !== "boost") {
      html += `<div class="shop-tier-header">⭐ Kahraman Güçlendirmeleri</div>`;
      lastTier = "boost";
    }
    if (!item.isBoost && !item.isStaminaPotion && !item.isSpeedUpItem &&
        activeShopCategory === "all" && item.tier && item.tier !== lastTier) {
      html += `<div class="shop-tier-header">${tierLabels[item.tier] || ""}</div>`;
      lastTier = item.tier;
    }

    const left = shopLeft(item);
    const soldOut = left <= 0;
    const badge = item.isSpeedUpItem ? "5dk" : "1";

    html += `
      <div class="shop-card2 ${soldOut ? "soldout" : ""}" data-idx="${realIdx}" style="animation-delay:${i * 0.04}s">
        <div class="sc-icon">${itemIconSVG(item)}<span class="sc-badge">${badge}</span></div>
        ${item.isBoost ? `<div class="sc-tag">${item.heroName}</div>` : ""}
        <div class="sc-name">${item.name}</div>
        <div class="sc-left">${shopLimitOf(item) ? fmt(left) : "∞"}</div>
        <button class="sc-price" data-idx="${realIdx}" ${soldOut ? "disabled" : ""}>
          ${soldOut ? "Tükendi" : "💎 " + fmt(item.price)}
        </button>
        ${soldOut ? '<div class="sc-soldtag">TÜKENDİ</div>' : ""}
      </div>`;
  });

  grid.innerHTML = html || emptyState("🛒", "Bu kategoride eşya yok.");

  // karta tıkla → item özelliği
  grid.querySelectorAll(".shop-card2").forEach(card => {
    card.addEventListener("click", () => {
      const item = shopItems[parseInt(card.dataset.idx, 10)];
      showShopInfoPopup(item, card);
    });
  });
  // fiyata tıkla → adet sürgüsü (limit > 1) ya da direkt satın alma
  grid.querySelectorAll(".sc-price").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx, 10);
      const item = shopItems[idx];
      const left = shopLeft(item);
      if (left <= 0) return;
      if (state.diamonds < item.price) { showToast("Yeterli elmasın yok!"); return; }
      const card = btn.closest(".shop-card2");
      const maxQty = Math.min(left === Infinity ? 999 : left, Math.floor(state.diamonds / item.price));
      if (maxQty <= 1) { buyItem(idx, 1); return; }
      showShopQtyPopup(item, idx, card, maxQty);
    });
  });
  updateShopButtons();
}

function closeShopPopups() {
  document.querySelectorAll(".shop-qty-pop, .shop-info-pop").forEach(p => p.remove());
}

/* item özellik baloncuğu */
function showShopInfoPopup(item, card) {
  const grid = $id("shopGrid");
  const already = document.querySelector(".shop-info-pop[data-name='" + item.name + "']");
  closeShopPopups();
  if (already) return; // aynı karta ikinci tıklama = kapat

  let desc = "";
  if (item.isMissile) desc = item.missileDesc || "";
  else if (item.isSpeedUpItem) desc = "Eğitim/iyileşme süresini 5 dk kısaltır.";
  else if (item.isStaminaPotion) desc = "Genel Canı doldurur (envanterine düşer).";
  else if (item.isBoost) desc = item.boostDesc || "";
  else desc = formatBonus(item.bonus);

  const tl = item.tier ? `<div class="in-tl">≈ ${calculateTLPrice(item.price).toFixed(2)} ₺</div>` : "";
  const lim = shopLimitOf(item)
    ? `<div class="in-tl">Haftalık limit: ${shopBought(item.name)} / ${shopLimitOf(item)}</div>` : "";

  const pop = document.createElement("div");
  pop.className = "shop-info-pop";
  pop.dataset.name = item.name;
  pop.innerHTML = `<div class="in-name">${item.name}</div><div class="in-desc">${desc}</div>${tl}${lim}`;
  grid.appendChild(pop);
  positionShopPopup(pop, card, grid);
  pop.addEventListener("click", () => pop.remove());
}

/* adet sürgüsü paneli */
function showShopQtyPopup(item, idx, card, maxQty) {
  const grid = $id("shopGrid");
  const already = document.querySelector(".shop-qty-pop[data-name='" + item.name + "']");
  closeShopPopups();
  if (already) return;

  const pop = document.createElement("div");
  pop.className = "shop-qty-pop";
  pop.dataset.name = item.name;
  pop.innerHTML = `
    <input type="range" min="1" max="${maxQty}" value="1">
    <button class="sc-buy">💎 ${fmt(item.price)}</button>`;
  grid.appendChild(pop);
  positionShopPopup(pop, card, grid);

  const slider = pop.querySelector("input");
  const buyBtn = pop.querySelector(".sc-buy");
  slider.addEventListener("input", () => {
    buyBtn.textContent = "💎 " + fmt(parseInt(slider.value, 10) * item.price);
  });
  buyBtn.addEventListener("click", () => buyItem(idx, parseInt(slider.value, 10)));
}

function positionShopPopup(pop, card, grid) {
  const w = card.offsetWidth * 2 + 10;
  pop.style.width = Math.min(w, grid.clientWidth - 20) + "px";
  let x = card.offsetLeft;
  const maxX = grid.clientWidth - pop.offsetWidth - 10;
  if (x > maxX) x = Math.max(0, maxX);
  pop.style.left = x + "px";
  pop.style.top = (card.offsetTop + card.offsetHeight - pop.offsetHeight + 4) + "px";
}

/* oyunun updateShopButtons'unu devral: elmas değişince fiyatları aç/kapat */
function updateShopButtons() {
  document.querySelectorAll(".sc-price").forEach(btn => {
    const item = shopItems[parseInt(btn.dataset.idx, 10)];
    if (!item) return;
    if (shopLeft(item) <= 0) { btn.disabled = true; return; }
    btn.disabled = state.diamonds < item.price;
  });
}

/* oyunun buyItem'ını devral: haftalık limit + kayıt */
function buyItem(idx, count) {
  count = ensure(count || 1, 1);
  const item = shopItems[idx];
  ensureShopWeek();

  const left = shopLeft(item);
  if (left <= 0) {
    showToast("Bu ürünün haftalık limiti doldu. Mağaza yenilenince tekrar alabilirsin!");
    return;
  }
  if (count > left) count = left;

  // Füze buluttaki pvp verisine yazıldığı için bağlantı ve MISSILE_API şart.
  if (item.isMissile) {
    const fbOk = (typeof firebaseReady !== "undefined" && firebaseReady);
    if (!fbOk || !window.MISSILE_API || typeof window.MISSILE_API.addMissiles !== "function") {
      showToast("Füze almak için internet bağlantısı gerekli.");
      return;
    }
  }

  const totalCost = item.price * count;
  if (state.diamonds < totalCost) {
    showToast(`Yeterli elmasın yok. ${count} adet için 💎${fmt(totalCost)} gerekiyor.`);
    return;
  }

  state.diamonds -= totalCost;
  if (shopLimitOf(item)) {
    if (!state.shopBuys) state.shopBuys = {};
    state.shopBuys[item.name] = shopBought(item.name) + count;
  }

  if (item.isMissile) {
    // Füze envantere değil, buluttaki füze sayacına eklenir.
    window.MISSILE_API.addMissiles(count, function (ok) {
      if (!ok) {
        // Başarısız: elması ve haftalık limiti geri al.
        state.diamonds += totalCost;
        if (state.shopBuys) state.shopBuys[item.name] = Math.max(0, (state.shopBuys[item.name] || 0) - count);
        renderDiamonds();
        renderShop();
        showToast("Füze eklenemedi (bağlantı). Elmasın iade edildi.");
      }
    });
  } else {
    state.inventory[item.name] = (state.inventory[item.name] || 0) + count;
    renderInventory();         // çantaya yansıt
  }
  renderDiamonds();          // elması günceller + hesabı kaydeder (bulut dahil)
  renderShop();              // kalan sayısı / TÜKENDİ anında güncellensin
  const card = document.querySelector(`.shop-card2[data-idx="${idx}"]`);
  if (card) card.classList.add("bought");
  showToast(count === 1
    ? (item.isMissile ? "🚀 Füze hesabına eklendi!" : `${item.name} satın alındı!`)
    : (item.isMissile ? `${count} füze hesabına eklendi! 🚀` : `${count}x ${item.name} satın alındı!`));
}

/* eklenti yüklendi → mağazayı yeni tasarımla yeniden çiz */
renderShopTabs();
renderShop();
