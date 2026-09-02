/* MAĞAZA EKLENTİSİ — görünüm + kod tek dosyada */
/* Stil bu dosyaya gömülüdür — görünüm ayarları için aşağıdaki CSS bloğunu düzenle.
   NOT: Bu blok bir zamanlar dosyada İKİ KEZ duruyordu (biri kaçış karakterli
   kopyasıydı) ve aynı stylesheet head'e iki kere ekleniyordu. Kopya silindi. */
(function(){ const st = document.createElement("style"); st.textContent = '/* ═══════════════════════════════════════════════════════\n   MAĞAZA GÖRÜNÜMÜ — oyundan bağımsız eklenti dosyası.\n   Oyunun kendi CSS\'ine dokunmaz; sadece mağaza panelini\n   (#panel-shop) yeniden giydirir.\n   ═══════════════════════════════════════════════════════ */\n#panel-shop h2{ color:var(--km-yazi,#eaf4ff); text-shadow:0 2px 4px rgba(0,15,40,.7); }\n\n.shop-refresh-band{\n  text-align:center; margin:2px 0 8px;\n  color:#fff; font-family:\'Baloo 2\',\'Nunito\',sans-serif; font-weight:800; font-size:13px;\n  text-shadow:0 1px 3px rgba(0,30,55,.5);\n}\n.shop-refresh-band .clock{ color:#ffd257; }\n\n#panel-shop .shop-tabs{\n  display:flex; gap:8px; overflow-x:auto; padding:2px 2px 8px;\n  border:none; background:none;\n}\n#panel-shop .shop-tab{\n  flex-shrink:0; cursor:pointer;\n  font-family:\'Baloo 2\',\'Nunito\',sans-serif; font-weight:800; font-size:12.5px; letter-spacing:.2px;\n  color:#dff4ff; padding:4px 14px; border-radius:16px;\n  background:linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.06));\n  border:1px solid rgba(160,215,255,.45);\n  text-shadow:0 1px 2px rgba(0,30,55,.5);\n  transition:all .15s ease;\n}\n#panel-shop .shop-tab:hover{ border-color:#fff; color:#fff; }\n#panel-shop .shop-tab.active{\n  background:linear-gradient(180deg,#ffffff,#cfeefb);\n  color:#152e5e; border-color:#fff; text-shadow:none;\n  box-shadow:none;\n}\n\n#panel-shop .shop-grid{\n  position:relative;\n  display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;\n  align-items:start; align-content:start;\n  overflow-y:auto; max-height:56vh; padding:4px 2px 14px;\n  scrollbar-width:thin; scrollbar-color:#5bb9e6 transparent;\n}\n#panel-shop .shop-grid::-webkit-scrollbar{width:8px;}\n#panel-shop .shop-grid::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#7fd0f2,#3d9fd6); border-radius:8px;}\n#panel-shop .shop-grid::-webkit-scrollbar-track{background:rgba(0,0,0,.15);}\n\n#panel-shop .shop-tier-header{\n  grid-column:1 / -1;\n  font-family:\'Baloo 2\',\'Nunito\',sans-serif; font-weight:800; font-size:12.5px;\n  color:#fff; text-shadow:0 1px 3px rgba(0,30,55,.6);\n  margin:4px 0 0; border:none; background:none; padding:0;\n}\n\n/* ── ürün kartı ── */\n.shop-card2{\n  position:relative;\n  background:linear-gradient(180deg, #3d7ccc 0%, #22488f 55%, #152e5e 100%);\n  border-radius:14px;\n  padding:8px 6px 0;\n  display:flex; flex-direction:column; align-items:center; gap:4px;\n  overflow:hidden;\n  box-shadow:none;\n  cursor:pointer;\n  transition:transform .12s, filter .12s;\n  animation:shopCardIn .3s cubic-bezier(.2,1.2,.35,1) backwards;\n}\n@keyframes shopCardIn{\n  from{ opacity:0; transform:translateY(16px) scale(.92); }\n  to  { opacity:1; transform:translateY(0) scale(1); }\n}\n.shop-card2:hover{ transform:translateY(-3px); filter:brightness(1.1) saturate(1.12); }\n.shop-card2:active{ transform:scale(.96); filter:brightness(.93); }\n\n/* SARI KUTU KALDIRILDI — görsel doğrudan çizilir, arkasında kap yok.\n   Ölçü (58% kare) kalır: kartın yüksekliğini bu belirler. */\n.shop-card2 .sc-icon{\n  position:relative;\n  width:58%; aspect-ratio:1/1;\n  border-radius:8px;\n  background:none;\n  box-shadow:none;\n  display:flex; align-items:center; justify-content:center;\n}\n.shop-card2 .sc-icon svg{ width:62%; height:62%; position:relative; }\n.shop-card2 .sc-badge{\n  position:absolute; right:2px; bottom:2px;\n  background:rgba(0,0,0,.5); color:#fff;\n  font-family:\'Baloo 2\',sans-serif; font-weight:800; font-size:9px;\n  border-radius:4px; padding:0 4px;\n}\n.shop-card2 .sc-tag{\n  font-family:\'Baloo 2\',sans-serif; font-weight:800; font-size:8.5px;\n  color:#9fe3ff; letter-spacing:.4px;\n  text-shadow:0 1px 2px rgba(0,10,30,.7);\n  margin-bottom:-3px;\n}\n/* rakamlar: beyaz dolgu + lacivert kontur (3B) */\n.shop-card2 .sc-left, .shop-card2 .sc-price{\n  font-family:\'Baloo 2\',\'Nunito\',sans-serif; font-weight:800; color:#fff;\n  text-shadow:\n    -2px -1px 0 #1d3a63, 2px -1px 0 #1d3a63,\n    -2px 2px 0 #1d3a63, 2px 2px 0 #1d3a63,\n    0 -2px 0 #1d3a63, 0 2px 0 #1d3a63,\n    -2px 0 0 #1d3a63, 2px 0 0 #1d3a63,\n    0 3px 0 #142a4a;\n}\n.shop-card2 .sc-left{ font-size:11.5px; letter-spacing:.2px; white-space:nowrap; line-height:1.15; }\n.shop-card2 .sc-price{\n  width:calc(100% + 12px); margin:1px -6px 0;\n  border:none; cursor:pointer;\n  background:linear-gradient(180deg,#0e2246 0%, #1a3a75 100%);\n  padding:4px 0 5px; font-size:12.5px;\n  box-shadow:none;\n  transition:filter .1s, transform .06s;\n}\n.shop-card2 .sc-price:hover{ filter:brightness(1.15); }\n.shop-card2 .sc-price:active{ transform:scale(.96); filter:brightness(.93); }\n.shop-card2 .sc-price:disabled{ cursor:not-allowed; opacity:.75; }\n\n/* tükendi durumu: kart kalır, grileşir */\n.shop-card2.soldout .sc-icon{ filter:saturate(.1) brightness(.85); }\n.shop-card2.soldout::before{\n  content:""; position:absolute; inset:0; z-index:2;\n  background:rgba(120,130,140,.32); border-radius:14px; pointer-events:none;\n}\n.shop-card2 .sc-soldtag{\n  position:absolute; top:34%; left:50%; transform:translate(-50%,-50%) rotate(-8deg);\n  z-index:3; background:rgba(90,100,110,.92); color:#fff;\n  font-family:\'Baloo 2\',sans-serif; font-weight:800; font-size:10px; letter-spacing:1px;\n  padding:2px 10px; border-radius:5px;\n  box-shadow:none;\n}\n.shop-card2.bought{ animation:shopPop .3s ease; }\n@keyframes shopPop{ 40%{ transform:scale(1.07); box-shadow:0 0 18px rgba(255,210,87,.85); } }\n\n/* ── özellik baloncuğu ── */\n.shop-info-pop{\n  position:absolute; z-index:20;\n  background:linear-gradient(180deg, rgba(26,58,117,.97), rgba(14,34,70,.97));\n  border-radius:12px;\n  box-shadow:none;\n  animation:shopCardIn .18s ease both;\n}\n.shop-info-pop{ padding:8px 12px 9px; cursor:pointer; }\n.shop-info-pop .in-name{\n  color:#ffd257; font-family:\'Baloo 2\',sans-serif; font-weight:800; font-size:13px;\n  text-shadow:0 1px 2px rgba(0,10,30,.7); margin-bottom:2px;\n}\n.shop-info-pop .in-desc{\n  color:#cbe4ff; font-family:\'Baloo 2\',\'Nunito\',sans-serif; font-weight:600; font-size:11.5px; line-height:1.35;\n  text-shadow:0 1px 2px rgba(0,10,30,.6);\n}\n.shop-info-pop .in-tl{\n  color:#9fe3ff; font-family:\'Baloo 2\',sans-serif; font-weight:800; font-size:10px; margin-top:3px;\n}\n\n@media (max-width:480px){\n  #panel-shop .shop-grid{ gap:8px; }\n}\n'; document.head.appendChild(st); })();


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

  { name: "5 Dakika Hızlandırma", price: 200, isSpeedUpItem: true, speedUpMinutes: 5, icon: "⏩", gorsel: "5dkhiz.webp" },
  { name: "1 Saat Hızlandırma", price: 2000, isSpeedUpItem: true, speedUpMinutes: 60, icon: "⏩", gorsel: "1shiz.webp" },
  { name: "3 Saat Hızlandırma", price: 5000, isSpeedUpItem: true, speedUpMinutes: 180, icon: "⏩", gorsel: "3shiz.webp" },

  /* ── İNTİKAL HIZLANDIRMA ──
     Çantaya düşer; yoldaki bir seferin KALAN süresini kısaltır.
     Sefer kutusundaki ⚡ düğmesinden kullanılır — çantada varsa
     önce o harcanır, yoksa elmasla hızlandırma önerilir.
     Görseller şimdilik emoji; sen kendi görsellerini koyacaksın. */
  { name: "İntikal Hızlandırma %25", price: 2000, isSeferHiz: true, hizOran: 0.25, icon: "⚡", gorsel: "25intikal.webp" },
  { name: "İntikal Hızlandırma %50", price: 3500, isSeferHiz: true, hizOran: 0.50, icon: "🌀", gorsel: "50intikal.webp" },
  { name: "Can Potu", price: (typeof STAMINA_POTION_PRICE !== "undefined" ? STAMINA_POTION_PRICE : 6000), isStaminaPotion: true, icon: "❤️" },

  /* ── KALKAN ──
     Çantaya düşer; çantadan "Kullan" denince kale kalkanSaat kadar
     saldırıya kapanır. Süre EKLENMEZ, her kullanımda başa sarar.
     Görsel `kalkan.webp`. `emoji` YEDEK olarak duruyor: dosya
     sunucuda bulunamazsa itemIconSVG ona düşmez (gorsel dalı önce
     gelir), ama ürün tanımından gorsel satırı silinirse emoji
     devreye girer. Dosya adında Türkçe harf YOK — sunucuda
     sessizce bulunamaz. */
  { name: "Kalkan (6 Saat)", price: 10000, isKalkan: true, kalkanSaat: 6, icon: "🛡️",
    gorsel: "kalkan.webp", emoji: "🛡️" },

  /* ── KAYNAK PAKETLERİ ──
     Çantaya DÜŞMEZ; alındığı an doğrudan kaynak sayacına eklenir.

     FİYAT NEREDEN ÇIKTI: kalenin dakikalık üretimi ölçü alınmıştı
     (o zaman et 500, demir 400, su 250, enerji 150; dakikası ≈ 40 💎).

     ÜRETİM %60 KISILDI (uretim.js HIZ: odun 180, et 200, demir 160,
     su 100, enerji 60). FİYATLAR BİLEREK DEĞİŞTİRİLMEDİ — paketler
     artık daha uzun bir üretim süresine denk geliyor, yani elmasın
     değeri arttı. Açıklama metinlerindeki dakikalar yeni hıza göre
     yazılıdır. Fiyat dengesini değiştirmek istersen tek yer burası:
       Odun  10.000 → 55,6 dk → 800  (et ile aynı paket, aynı fiyat)
       Et    10.000 → 50 dk   → 800
       Demir  5.000 → 31,3 dk → 500
       Su     5.000 → 50 dk   → 800
       Enerji 1.000 → 16,7 dk → 400  (en yavaş üretilen, darboğaz) */
  { name: "Odun Sandığı", price: 800, isKaynak: true, kaynakId: "odun", miktar: 10000,
    icon: "🪵", gorsel: "10kodun.webp",
    kaynakDesc: "10.000 🪵 Odun doğrudan kaynaklarına eklenir. Kalen dakikada 180 üretir; bu paket yaklaşık 56 dakikalık üretime denktir." },
  { name: "Et Sandığı", price: 800, isKaynak: true, kaynakId: "et", miktar: 10000,
    icon: "🍖", gorsel: "10ket.webp",
    kaynakDesc: "10.000 🍖 Et doğrudan kaynaklarına eklenir. Kalen dakikada 200 üretir; bu paket 50 dakikalık üretime denktir." },
  { name: "Demir Sandığı", price: 500, isKaynak: true, kaynakId: "demir", miktar: 5000,
    icon: "⛓️", gorsel: "5kdemir.webp",
    kaynakDesc: "5.000 ⛓️ Demir doğrudan kaynaklarına eklenir. Kalen dakikada 160 üretir; bu paket yaklaşık 31 dakikalık üretime denktir." },
  { name: "Su Sandığı", price: 800, isKaynak: true, kaynakId: "su", miktar: 5000,
    icon: "💧", gorsel: "5ksu.webp",
    kaynakDesc: "5.000 💧 Su doğrudan kaynaklarına eklenir. Kalen dakikada 100 üretir; bu paket 50 dakikalık üretime denktir." },
  { name: "Enerji Hücresi", price: 400, isKaynak: true, kaynakId: "enerji", miktar: 1000,
    icon: "⚡", gorsel: "1kenerji.webp",
    kaynakDesc: "1.000 ⚡ Enerji doğrudan kaynaklarına eklenir. Enerji en yavaş üretilen kaynaktır (dakikada 60), o yüzden birimi diğerlerinden pahalıdır." },

  /* ── FÜZE (kale saldırısı) ── */
  /* ── KAHRAMAN PARÇALARI ──
     Mor parça BEŞ mor kahramanın ORTAK havuzuna, turuncular
     kahramana ÖZEL havuza düşer (gelistir.js). Haftada 10'ar. */
  /* PARÇA GÖRSELİ BURADA YAZILMAZ — gelistir.js PARCA_GORSEL tek
     kaynaktır, kart çerçeveyle birlikte PARCA.kutu() ile çizilir. */
  { name: "Mor Kahraman Parçası", price: 15000, isParca: true, parcaKey: "mor",
    icon: "◆",
    parcaDesc: "HALVORSEN, MİKİAN, ROBERT, FRANKLY ve YU-NEEB'in seviyesini yükseltmekte kullanılır." },
  { name: "STELLİN Parçası", price: 30000, isParca: true, parcaKey: "celik_savasci",
    icon: "◆",
    parcaDesc: "Yalnız STELLİN'in seviyesini yükseltmekte kullanılır." },
  { name: "İVANOVNA Parçası", price: 30000, isParca: true, parcaKey: "ivanovna",
    icon: "◆",
    parcaDesc: "Yalnız İVANOVNA'nın seviyesini yükseltmekte kullanılır." },
  { name: "REVOLİA Parçası", price: 30000, isParca: true, parcaKey: "revolia",
    icon: "◆",
    parcaDesc: "Yalnız REVOLİA'nın seviyesini yükseltmekte kullanılır." },

  /* MAĞAZA GÖRSELİ BEKLENİYOR: `missile.js`teki fuze_Fuze-roket.webp
     HARİTADA UÇAN füzedir, kart görseli değil. Kart için ayrı
     asset üretilince buraya `gorsel: "fuzemagaza.webp"` eklenecek.
     ÖNCE DOSYAYI YÜKLE: `gorsel` satırı varken dosya yoksa kart
     kırık resim gösterir, emojiye DÜŞMEZ (index.html:5644). */
  { name: "Füze", price: 400000, isMissile: true, icon: "🚀",
    missileDesc: "Kale saldırısı için 1 füze. Haritada bir düşman kalesine 🚀 ile atılır ve kaleye ağır hasar verir. Füze yiyen oyuncu 24 saat boyunca hiçbir saldırı yapamaz (yalnızca savunma ve füze). Haftalık en fazla 2 adet alınabilir." },

  /*  ── KAHRAMAN GÜÇLENDİRMELERİ ───────────────────────────────
      Her güçlendirme artık YALNIZ BİR BİRLİK AİLESİNE işler:
        birim: "knight"  → Savunucu
        birim: "soldier" → Koruyucu
        birim: "robot"   → Nişancı
      Kademe farkı gözetilmez: Sv1 de Sv6 da aynı ailedendir,
      ikisi de aynı güçlendirmeden yararlanır.

      `sans` alanı olan güçlendirmelerde zar SAVAŞ BAŞINDA BİR KEZ
      atılır. Tuttuysa etki savaş boyunca (ya da belirtilen turlarda)
      geçerlidir; tutmadıysa hiç çalışmaz.
      ────────────────────────────────────────────────────────── */

  /* ── HALVORSEN (Buz Savaşçısı) — Savunucu ── */
  { name: "Buzul Özü", price: 6000, isBoost: true, heroId: "buz_savascisi", heroName: "HALVORSEN", icon: "🧊", gorsel: "buzulozu.webp",
    boostDesc: "Savunucu birliklerin savunmasını %15 artırır.",
    effect: { type: "boost_troop_def_pct", value: 15, birim: "knight" } },
  { name: "Direnç İlacı", price: 6500, isBoost: true, heroId: "buz_savascisi", heroName: "HALVORSEN", icon: "🩹", gorsel: "dirinecilaci.webp",
    boostDesc: "Yalnızca savunmada Savunucu birliklerin canını %25 artırır.",
    effect: { type: "boost_troop_hp_pct_defense_only", value: 25, birim: "knight" } },

  /* ── STELLİN (Çelik Savaşçı) — Savunucu ── */
  { name: "Titanyum Tozu", price: 9000, isBoost: true, heroId: "celik_savasci", heroName: "STELLİN", icon: "✨", gorsel: "titanyumtozu.webp",
    boostDesc: "%45 ihtimalle Savunucu birlikler rastgele 3 tur boyunca %200 hasar verir.",
    effect: { type: "boost_random_turns_damage", chance: 45, turns: 3, damagePct: 200, birim: "knight" } },
  { name: "Tank Güdüsü", price: 9500, isBoost: true, heroId: "celik_savasci", heroName: "STELLİN", icon: "🛡️", gorsel: "tankgudusu.webp",
    boostDesc: "%60 ihtimalle ilk 3 tur boyunca Savunucu birliklerin savunma ve canını %40 artırır.",
    effect: { type: "boost_first_turns_def_hp", chance: 60, turns: 3, valuePct: 40, birim: "knight" } },

  /* ── MİKİAN (Ateş Büyücüsü) — Koruyucu ── */
  { name: "Perdeleme", price: 8000, isBoost: true, heroId: "ates_buyucusu", heroName: "MİKİAN", icon: "🌫️", gorsel: "perdeleme.webp",
    boostDesc: "%50 ihtimalle ilk 4 tur içinde her 2 turda bir Koruyucu birliklerin aldığı hasar %50 azalır.",
    effect: { type: "boost_periodic_damage_reduce", chance: 50, everyTurns: 2, maxTurns: 4, reducePct: 50, birim: "soldier" } },
  { name: "Destek Bilgi", price: 8500, isBoost: true, heroId: "ates_buyucusu", heroName: "MİKİAN", icon: "📡", gorsel: "destekbilgi.webp",
    boostDesc: "%25 ihtimalle Koruyucu birlikler savaş boyunca %50 fazla hasar verir.",
    effect: { type: "boost_bonus_damage", chance: 25, bonusPct: 50, birim: "soldier" } },

  /* ── İVANOVNA (Komutan) — Koruyucu ── */
  { name: "Artan Aşk", price: 12000, isBoost: true, heroId: "ivanovna", heroName: "İVANOVNA", icon: "💗", gorsel: "artanask.webp",
    boostDesc: "Birliklerin Sevgilisi yeteneğinin değerini Koruyucu birlikler için 2 katına çıkarır.",
    effect: { type: "boost_double_ability", ability: "wounded_return_pct", birim: "soldier" } },
  { name: "Paralı Muhafız", price: 12500, isBoost: true, heroId: "ivanovna", heroName: "İVANOVNA", icon: "🪙", gorsel: "paralimuhafiz.webp",
    boostDesc: "Savaşan Koruyucu birliklerin sayısını %20 artırır.",
    effect: { type: "boost_troop_count_pct", value: 20, birim: "soldier" } },

  /* ── REVOLİA (Robot Komutan) — Nişancı ── */
  { name: "Ek Bağlantı", price: 10000, isBoost: true, heroId: "revolia", heroName: "REVOLİA", icon: "🔌", gorsel: "ekbaglanti.webp",
    boostDesc: "Nişancı birlikler her 3 turda bir %90 ihtimalle %195 hasar verir.",
    effect: { type: "boost_robot_periodic_damage", everyTurns: 3, chance: 90, damagePct: 195, birim: "robot" } },
  { name: "Yedek Şarj", price: 10500, isBoost: true, heroId: "revolia", heroName: "REVOLİA", icon: "🔋", gorsel: "yedeksarj.webp",
    boostDesc: "Nişancı birliklerin toplam canını %50 artırır.",
    effect: { type: "boost_total_hp_pct", value: 50, birim: "robot" } },
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
  "Kalkan (6 Saat)": 10,
  "5 Dakika Hızlandırma": 1000,
  "1 Saat Hızlandırma": 500,
  "3 Saat Hızlandırma": 200,
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

  /* Kahraman parçaları. TURUNCU üçlü haftada 5, mor 10 kalır. */
  "Mor Kahraman Parçası": 10,
  "STELLİN Parçası": 5,
  "İVANOVNA Parçası": 5,
  "REVOLİA Parçası": 5,

  /* Kaynak paketleri — haftada 50'şer.
     ODUN LİSTEDE YOKTU: bu tabloda adı geçmeyen ürün limitsiz
     sayılıyor (kartta ∞), o yüzden Odun Sandığı sınırsız alınabiliyordu.
     Diğer dördüyle aynı sayıya çekildi. */
  "Odun Sandığı": 50,
  "Et Sandığı": 50,
  "Demir Sandığı": 50,
  "Su Sandığı": 50,
  "Enerji Hücresi": 50,
};

/* ── TEST MODU: FÜZE ─────────────────────────────────────────────
   Adres çubuğunun sonuna ?ayar=1 ekleyerek girersen füzenin haftalık
   limiti 50, fiyatı 1 elmas olur. Böylece füzeyi ardı ardına deneyip
   uçuş/patlama davranışına bakabilirsin.

   NORMAL GİRİŞTE HİÇ ÇALIŞMAZ — ?ayar=1 yoksa limit yine 2, fiyat yine
   400.000. Yani canlıdaki oyuncular bundan etkilenmez.

   İKİ UYARI:
   1) Bu istemci tarafıdır. Adresi bilen herkes ?ayar=1 ekleyip ucuza
      füze alabilir. Zaten ?ayar=1 paneli için de geçerli olan bir açık;
      test bitince BU BLOĞU SİL.
   2) Haftalık sayaç (state.shopBuys) sıfırlanmaz. Bu hafta 2 füze
      aldıysan 48 hakkın kalır.

   Testi bitirince: bu bloğun tamamını sil, başka hiçbir yere dokunma. */
if (/[?&]ayar=1/.test(location.search)) {
  SHOP_LIMITS["Füze"] = 50;
  const _fuze = getItemDef("Füze");
  if (_fuze) _fuze.price = 1;
  console.log("[magaza.js] TEST MODU: Füze limiti 50, fiyat 1 elmas.");
}

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

/*  Hesap kodu sarmalayıcısı KALDIRILDI: index.html'deki
    compactStateForExport / expandCompactState ölü kod olduğu için
    silindi. Buradaki `const _shopOrigCompact = compactStateForExport;`
    satırı, artık var olmayan bir isme baktığı için ReferenceError
    atıp magaza.js'in tamamını çökertirdi. Haftalık alımlar buluta
    zaten tam state ile yazılıyor, kayıp yok.                       */

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
    /* Geliştirme sistemi kapalıyken parçalar mağazada GÖRÜNMEZ */
    if (item.isParca && !(typeof window.GELISTIR_ACIK === "function" && window.GELISTIR_ACIK()))
      return false;
    if (activeShopCategory === "all") return true;
    if (activeShopCategory === "potion") return !!(item.isStaminaPotion || item.isSpeedUpItem || item.isSeferHiz || item.isKalkan);
    if (activeShopCategory === "kaynak") return !!item.isKaynak;
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
    if (!item.isBoost && !item.isStaminaPotion && !item.isSpeedUpItem && !item.isSeferHiz &&
        !item.isKalkan &&
        activeShopCategory === "all" && item.tier && item.tier !== lastTier) {
      html += `<div class="shop-tier-header">${tierLabels[item.tier] || ""}</div>`;
      lastTier = item.tier;
    }

    const left = shopLeft(item);
    const soldOut = left <= 0;
    const badge = item.isKalkan ? ((item.kalkanSaat || 6) + "sa")
                : item.isSeferHiz ? ("%" + Math.round(item.hizOran * 100))
                : item.isKaynak
                    ? (item.miktar >= 1000 ? (item.miktar / 1000) + "K" : String(item.miktar))
                : (item.isSpeedUpItem
                    ? (item.speedUpMinutes >= 60
                        ? Math.round(item.speedUpMinutes / 60) + "sa"
                        : item.speedUpMinutes + "dk")
                    : "1");

    html += `
      <div class="shop-card2 ${soldOut ? "soldout" : ""}" data-idx="${realIdx}" style="animation-delay:${i * 0.04}s">
        <div class="sc-icon">${itemIconSVG(item)}<span class="sc-badge">${badge}</span></div>
        ${item.isBoost ? `<div class="sc-tag">${item.heroName}</div>` : ""}
        <div class="sc-left">Limit: ${shopLimitOf(item) ? fmt(left) : "∞"}</div>
        <button class="sc-price" data-idx="${realIdx}" ${soldOut ? "disabled" : ""}>
          ${soldOut ? "Tükendi" : ELMAS("magaza") + " " + fmt(item.price)}
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
      const maxQty = Math.min(left === Infinity ? 999 : left, Math.floor(state.diamonds / item.price));
      showBuyDialog(item, idx, maxQty);
    });
  });
  updateShopButtons();
}

function closeShopPopups() {
  document.querySelectorAll(".shop-info-pop").forEach(p => p.remove());
  closeBuyDialog();
}

/* ürün açıklaması — hem baloncuk hem satın alma penceresi kullanır */
function shopItemDesc(item) {
  if (item.isMissile)        return item.missileDesc || "";
  if (item.isSpeedUpItem)    return "Eğitim/iyileşme süresini " +
                                    (item.speedUpMinutes >= 60
                                      ? Math.round(item.speedUpMinutes / 60) + " saat"
                                      : item.speedUpMinutes + " dk") +
                                    " kısaltır.";
  if (item.isSeferHiz)       return "Yoldaki bir intikalin kalan süresini %" +
                                    Math.round(item.hizOran * 100) +
                                    " kısaltır. Haritadaki sefer kutusuna dokunup kullanılır.";
  if (item.isKalkan)         return "Çantana düşer. Kullandığında kalen " +
                                    (item.kalkanSaat || 6) +
                                    " saat saldırıya kapanır: kimse ordu gönderemez, füze atamaz. " +
                                    "Sen saldırırsan kalkanın anında düşer. Tekrar kullanınca süre başa sarar.";
  if (item.isStaminaPotion)  return "Genel Canı doldurur (envanterine düşer).";
  if (item.isParca)          return item.parcaDesc || "";
  if (item.isKaynak)         return item.kaynakDesc || "";
  if (item.isBoost)          return item.boostDesc || "";
  return formatBonus(item.bonus);
}

/* item özellik baloncuğu */
function showShopInfoPopup(item, card) {
  const grid = $id("shopGrid");
  const already = document.querySelector(".shop-info-pop[data-name='" + item.name + "']");
  closeShopPopups();
  if (already) return; // aynı karta ikinci tıklama = kapat

  const desc = shopItemDesc(item);

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

/* ── BALONCUĞU DIŞARI DOKUNUNCA KAPAT ─────────────────────────────
   Eskiden kapatma dinleyicisi YALNIZ baloncuğun kendisindeydi:
   boşluğa, sekmelere ya da panelin başka bir yerine dokunmak
   baloncuğu kapatmıyordu, ekranda asılı kalıyordu.

   Dinleyici belgeye BİR KEZ kurulur (her renderShop'ta yeniden
   eklenirse aynı tıklama defalarca işlenir). Baloncuğu açan
   tıklamanın kendisi kapatmaz: o tıklamanın hedefi kartın içindedir
   ve aşağıdaki closest() denetimine takılır — bu yüzden ayrıca
   gecikme/zamanlayıcı hilesine gerek yok.

   pointerdown kullanılır: parmak kalkmadan kapanır, kaydırmayla
   açılan hayalet tıklamalara bağlı kalmaz. */
(function shopPopupDisiKapat() {
  if (window._shopPopDisiKurulu) return;
  window._shopPopDisiKurulu = true;

  document.addEventListener("pointerdown", function (e) {
    if (!document.querySelector(".shop-info-pop")) return;      /* açık baloncuk yok */
    const t = e.target;
    /* Çantadaki kutucuklar da baloncuk açıyor (tema.js sonundaki
       cantaBuffDetay bloğu) — onlara dokunma baloncuğu kapatmamalı,
       yoksa açılan baloncuk aynı anda kapanır. */
    if (t && t.closest && t.closest(".shop-info-pop, .shop-card2, .bd-buy-mask, #invList .inv-card")) return;
    document.querySelectorAll(".shop-info-pop").forEach(p => p.remove());
  }, true);

  /* Listeyi kaydırınca da kapansın — baloncuk karta göre
     konumlandığı için kaydırmada kartından ayrı düşer. */
  const grid = document.getElementById("shopGrid");
  if (grid) grid.addEventListener("scroll", () => {
    document.querySelectorAll(".shop-info-pop").forEach(p => p.remove());
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════════
   SATIN ALMA PENCERESİ  (eski .shop-qty-pop sürgüsünün yerine)
   Ekranın ortasında açılır: ürün · adet ayarı · toplam fiyat.
   ═══════════════════════════════════════════════════════════════ */
let _bdEscHandler = null;

function closeBuyDialog() {
  const m = document.querySelector(".bd-buy-mask");
  if (m) m.remove();
  if (_bdEscHandler) { document.removeEventListener("keydown", _bdEscHandler); _bdEscHandler = null; }
}

function showBuyDialog(item, idx, maxQty) {
  closeShopPopups();
  maxQty = Math.max(1, Math.floor(maxQty) || 1);
  let qty = 1;

  const mask = document.createElement("div");
  mask.className = "bd-buy-mask";
  mask.innerHTML = `
    <div class="bd-buy-box">
      <div class="bd-buy-head">
        <span>Satın Al</span>
        <button class="bd-buy-x" type="button">✕</button>
      </div>
      <div class="bd-buy-body">
        <div class="bd-buy-top">
          <div class="bd-buy-icon">${itemIconSVG(item)}</div>
          <div class="bd-buy-txt">
            <div class="bd-buy-name">${item.isBoost ? item.heroName + " · " : ""}${item.name}</div>
            <div class="bd-buy-desc">${shopItemDesc(item)}</div>
          </div>
        </div>
        <div class="bd-q-row">
          <button class="bd-qbtn" type="button" data-d="-1">−</button>
          <input class="bd-q-range" type="range" min="1" max="${maxQty}" value="1">
          <button class="bd-qbtn" type="button" data-d="1">+</button>
          <div class="bd-qnum">1</div>
          <button class="bd-qmax" type="button">MAX</button>
        </div>
        <button class="bd-buy-go" type="button"></button>
      </div>
    </div>`;
  document.body.appendChild(mask);

  const range = mask.querySelector(".bd-q-range");
  const num   = mask.querySelector(".bd-qnum");
  const go    = mask.querySelector(".bd-buy-go");

  function sync() {
    qty = Math.min(maxQty, Math.max(1, qty));
    range.value = qty;
    num.textContent = qty;
    /* sürgünün dolu kısmı */
    const pct = maxQty > 1 ? ((qty - 1) / (maxQty - 1)) * 100 : 100;
    range.style.setProperty("--fill", pct + "%");

    const total = qty * item.price;
    go.textContent = "💎 " + fmt(total);
    go.disabled = total > state.diamonds;
  }

  range.addEventListener("input", () => { qty = parseInt(range.value, 10) || 1; sync(); });
  mask.querySelectorAll(".bd-qbtn").forEach(b => {
    b.addEventListener("click", () => { qty += parseInt(b.dataset.d, 10); sync(); });
  });
  mask.querySelector(".bd-qmax").addEventListener("click", () => { qty = maxQty; sync(); });
  mask.querySelector(".bd-buy-x").addEventListener("click", closeBuyDialog);
  /* boşluğa dokununca kapanır, kutunun içine dokununca kapanmaz */
  mask.addEventListener("click", (e) => { if (e.target === mask) closeBuyDialog(); });
  go.addEventListener("click", () => {
    if (go.disabled) return;
    const n = qty;
    closeBuyDialog();
    buyItem(idx, n);
  });
  _bdEscHandler = (e) => { if (e.key === "Escape") closeBuyDialog(); };
  document.addEventListener("keydown", _bdEscHandler);

  sync();
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
  } else if (item.isParca) {
    /* Parça ÇANTAYA düşer; havuza girmesi için çantadan "Kullan"
       demek gerekir (kaynak paketleriyle aynı akış). */
    state.inventory[item.name] = (state.inventory[item.name] || 0) + count;
    if (typeof renderInventory === "function") renderInventory();
  } else if (item.isKaynak) {
    /* Kaynak paketi ÇANTAYA düşer; sayaca girmesi için oyuncunun
       çantadan "Kullan" demesi gerekir (hızlandırma ürünleri gibi). */
    state.inventory[item.name] = (state.inventory[item.name] || 0) + count;
    if (typeof renderInventory === "function") renderInventory();
  } else {
    state.inventory[item.name] = (state.inventory[item.name] || 0) + count;
    renderInventory();         // çantaya yansıt
  }
  renderDiamonds();          // elması günceller + hesabı kaydeder (bulut dahil)
  renderShop();              // kalan sayısı / TÜKENDİ anında güncellensin
  const card = document.querySelector(`.shop-card2[data-idx="${idx}"]`);
  if (card) card.classList.add("bought");
  if (item.isParca) {
    showToast(`${count}x ${item.name} çantana eklendi!`);
  } else if (item.isKaynak) {
    showToast(`${item.icon} ${count}x ${item.name} çantana eklendi!`);
  } else {
    showToast(count === 1
      ? (item.isMissile ? "🚀 Füze hesabına eklendi!" : `${item.name} satın alındı!`)
      : (item.isMissile ? `${count} füze hesabına eklendi! 🚀` : `${count}x ${item.name} satın alındı!`));
  }
}

/* eklenti yüklendi → mağazayı yeni tasarımla yeniden çiz */
renderShopTabs();
renderShop();


/* ═══════════════════════════════════════════════════════════════
   SATIN ALMA PENCERESİ — GÖRÜNÜM
   Palet: KOYU MAVİ TEMA (tema.js) — #3d7ccc → #22488f → #152e5e
   Yazı:  'Baloo 2' 800 (Baloo 2'nin en kalın kesimi; 900 yok,
          o yüzden dolgunluk konturla veriliyor).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const st = document.createElement("style");
  st.textContent = `
.bd-buy-mask{
  position:fixed; inset:0; z-index:9000;
  display:flex; align-items:center; justify-content:center; padding:18px;
  background:rgba(2,10,24,.60);
  animation:bdFade .14s ease both;
}
@keyframes bdFade{ from{ opacity:0 } to{ opacity:1 } }

.bd-buy-box{
  width:min(330px, 90vw); overflow:hidden;
  border-radius:16px;
  font-family:'Baloo 2','Nunito',sans-serif;
  font-weight:700; color:#eaf4ff;
  background:
    linear-gradient(180deg, #3d7ccc 0%, #22488f 52%, #152e5e 100%);
  border:1px solid rgba(160,215,255,.60);
  box-shadow:none;
  animation:bdPop .2s cubic-bezier(.2,1.2,.35,1) both;
}
@keyframes bdPop{ from{ opacity:0; transform:translateY(14px) scale(.94) } to{ opacity:1; transform:none } }

/* ── başlık şeridi ── */
.bd-buy-head{
  position:relative; padding:9px 46px 10px; text-align:center;
  background:linear-gradient(180deg, rgba(150,205,255,.22), rgba(3,14,34,.18));
  border-bottom:1px solid rgba(160,215,255,.35);
  font-weight:800; font-size:15px; letter-spacing:.4px; color:#ffffff;
  text-shadow:0 2px 3px rgba(0,15,40,.75);
}
.bd-buy-x{
  position:absolute; top:6px; right:8px; width:30px; height:30px; padding:0;
  display:flex; align-items:center; justify-content:center;
  border-radius:9px; cursor:pointer;
  background:linear-gradient(180deg,#f03434,#c00d0d);
  border:1px solid rgba(255,220,220,.9);
  color:#fff; font-family:inherit; font-weight:800; font-size:13px; line-height:1;
  box-shadow:none;
}
.bd-buy-x:active{ transform:scale(.96); filter:brightness(.93); }

.bd-buy-body{ padding:13px 14px 15px; }

/* ── ürün satırı: ikon + yazı, dikey ortalı ── */
.bd-buy-top{ display:flex; align-items:center; gap:11px; margin-bottom:14px; }
.bd-buy-icon{
  flex:0 0 52px; width:52px; height:52px; border-radius:10px;
  display:flex; align-items:center; justify-content:center;
  background:none;
  box-shadow:none;
}
.bd-buy-icon svg{ width:60%; height:60%; }
.bd-buy-txt{ flex:1; min-width:0; }
.bd-buy-name{
  font-weight:800; font-size:15px; line-height:1.2; color:#ffffff;
  letter-spacing:.2px; text-shadow:0 2px 3px rgba(0,15,40,.75);
}
.bd-buy-desc{
  margin-top:3px; font-weight:600; font-size:12px; line-height:1.35;
  color:#cbe4ff; text-shadow:0 1px 2px rgba(0,10,30,.6);
  max-height:54px; overflow:auto;
}

/* ── adet satırı ── */
.bd-q-row{ display:flex; align-items:center; gap:7px; }
.bd-qbtn{
  flex:0 0 auto; width:32px; height:32px; border-radius:9px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  background:linear-gradient(180deg,#5a9ce0 0%,#3568b4 55%,#22488f 100%);
  border:1px solid rgba(170,220,255,.75);
  color:#fff; font-family:inherit; font-weight:800; font-size:19px; line-height:1;
  text-shadow:0 2px 3px rgba(0,15,40,.65);
  box-shadow:none;
}
.bd-qbtn:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none; }

.bd-q-range{
  flex:1; min-width:36px; height:9px; border-radius:5px;
  -webkit-appearance:none; appearance:none; outline:none; cursor:pointer;
  background:linear-gradient(90deg,
    #8fc4ff 0%, #8fc4ff var(--fill,0%), rgba(6,20,44,.75) var(--fill,0%));
  box-shadow:none;
}
.bd-q-range::-webkit-slider-thumb{
  -webkit-appearance:none; appearance:none;
  width:20px; height:20px; border-radius:50%;
  background:linear-gradient(180deg,#ffffff,#c9dff7);
  border:1px solid #3568b4; box-shadow:none; cursor:grab;
}
.bd-q-range::-moz-range-thumb{
  width:20px; height:20px; border-radius:50%;
  background:linear-gradient(180deg,#ffffff,#c9dff7);
  border:1px solid #3568b4; box-shadow:none; cursor:grab;
}

.bd-qnum{
  flex:0 0 auto; min-width:46px; height:32px;
  display:flex; align-items:center; justify-content:center;
  border-radius:9px;
  background:rgba(6,20,44,.6); border:1px solid rgba(160,215,255,.45);
  color:#fff; font-weight:800; font-size:14px; letter-spacing:.3px;
  text-shadow:0 1px 2px rgba(0,10,30,.7);
}
.bd-qmax{
  flex:0 0 auto; height:32px; padding:0 10px; border-radius:9px; cursor:pointer;
  background:linear-gradient(180deg,#ffd257,#f0932b);
  border:1px solid rgba(255,220,150,.75);
  color:#3a2408; font-family:inherit; font-weight:800; font-size:12px; letter-spacing:.4px;
  box-shadow:none;
}
.bd-qmax:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none; }

/* ── onay butonu: ortada, dar ── */
.bd-buy-go{
  display:block; margin:16px auto 2px;
  min-width:150px; padding:9px 26px; border-radius:12px; cursor:pointer;
  background:linear-gradient(180deg,#ffd257,#f0932b);
  border:1px solid rgba(255,220,150,.75);
  color:#3a2408; font-family:inherit; font-weight:800; font-size:16px; letter-spacing:.3px;
  text-shadow:0 1px 0 rgba(255,255,255,.45);
  box-shadow:none;
}
.bd-buy-go:active{ transform:scale(.96); filter:brightness(.93); box-shadow:none; }
.bd-buy-go:disabled{ filter:saturate(.2) brightness(.85); cursor:not-allowed; }

@media (max-width:360px){
  .bd-qnum{ min-width:40px; font-size:13px; }
  .bd-qmax{ padding:0 8px; font-size:11px; }
  .bd-buy-go{ min-width:130px; padding:9px 20px; }
}
`;
  document.head.appendChild(st);
})();
