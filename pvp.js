/* ═══════════════════════════════════════════════════════════════
   pvp.js — OYUNCU vs OYUNCU ORDU SAVAŞI
   ---------------------------------------------------------------
   Kurulum sırası:
       <script src="missile.js"></script>
       <script src="pvp.js"></script>        ← BUNU EKLE
   Ana kodun hiçbir yerine dokunmaz.

   ── ÖNEMLİ ──
   FÜZE ve SALDIRI birbirinden TAMAMEN AYRI iki güçtür:
     🚀 FÜZE   → missile.js'in işi. Kale HP'sini ve genel canı düşürür.
                 pvp.js buna karışmaz, sadece kutucukta bilgi olarak gösterir.
   ── SÜRÜM 2.0 — SAVAŞ MOTORU YENİLENDİ ──
   1) BOZGUN EŞİĞİ: Ordusu başlangıcın %25'ine düşen taraf dağılır,
      savaş biter, kalanlar SAĞ KURTULUR. Artık kimse sıfırlanmıyor.
      Ayar: CFG.routPct
   2) HEDEF ÖNCELİĞİ: Şövalye→Asker, Asker→Robot, Robot→Şövalye.
      Öncelikli hedefi biten birlik döngüde sıradakine TAŞAR.
      Ayar: TARGET_ORDER
   3) KESİN RAPOR: "kim kimi düşürdü" artık tahmin değil, savaş
      sırasında birebir kaydediliyor.

     ⚔️ SALDIR → pvp.js'in işi. Kale HP'sine HİÇ dokunmaz.
                 Sadece iki tarafın BİRLİKLERİ birbirini kırar.
   ═══════════════════════════════════════════════════════════════ */
(function () {
"use strict";

/* ═══════════════════════════════════════════════════════════════
   0) AYARLAR
   ═══════════════════════════════════════════════════════════════ */
const CFG = {
  /* ── Renkler ── */
  attackColor1: "#a8264f", attackColor2: "#6d1230", attackShadow: "#4a0b20",  /* bordo */
  friendColor1: "#3b74e8", friendColor2: "#12408f", friendShadow: "#0a2a63",  /* koyu mavi */

  /* ── SAVAŞ MOTORU ── */
  maxTurns:       30,     /* bu tur sayısından sonra savaş biter          */
  defenseFactor:  0.35,   /* savunma, gelen hasarın ne kadarını emer      */
  minDamagePct:   0.12,   /* savunma ne kadar yüksek olursa olsun bu oran geçer */
  variance:       0.30,   /* hasar dalgalanması (±%15)                     */
  damageScale:    0.35,   /* GENEL HIZ: küçültürsen savaş uzar, kayıplar azalır */
  deathPct:       0.35,   /* savaş sırasındaki geçici ayrım — sonunda yeniden bölünür */

  /* ── KAZANAN / KAYBEDEN ÖLÜM ORANI ────────────────────────────
     Savaş bitip kimin kazandığı belli olunca, DÜŞEN birlikler
     yeniden ölü/yaralı diye bölünür.
     Kazanan sahayı tuttuğu için yaralılarını toplar → az ölür.
     Kaybeden geri çekilirken yaralılarını bırakır → çok ölür.
     Toplam kayıp DEĞİŞMEZ, sadece ölü/hastane dağılımı değişir.
     İkisini de 0.35 yaparsan eski davranışa döner.                */
  kazananOlumPct: 0.15,
  kaybedenOlumPct: 0.50,

  /* ── BOZGUN EŞİĞİ ──────────────────────────────────────────────
     Ordusu, savaşa girdiği birlik sayısının bu oranına DÜŞEN ilk
     taraf bozguna uğrar: savaş o anda biter, kalan birlikler sağ
     kurtulur. Böylece kaybeden taraf sıfırlanmaz, toparlanabilir.
     0.25 = %25 kalınca dağılır • 0 yaparsan eski davranışa döner
     (bir taraf tamamen yok olana kadar savaş sürer).              */
  routPct:        0.25,

  /* ── TİP BAZINDA PASİFLEŞME EŞİĞİ ─────────────────────────────
     Bir birlik TÜRÜ, savaşa girdiği sayının bu oranına düşerse
     GERİ ÇEKİLİR: artık vurulamaz (korunur) ve artık vurmaz
     (saldırısı ve savunması orduya sayılmaz). Ordunun geri kalanı
     savaşmaya devam eder; o türü hedefleyen düşman birlikleri
     hedef sırasında bir SONRAKİ türe taşar.
     Amaç: bir tür (özellikle şövalye) komple silinmesin.
     0.08 = %8 kalınca çekilir • 0 yaparsan tür tükenene kadar savaşır */
  typeFloorPct:   0.08,

  /* ── Savunan avantajı (kalesinde savunuyor) ── */
  castleAtkBonus: 1.00,
  castleDefBonus: 1.15,
  castleHpBonus:  1.10,
  defenseRobotMultiplier: 2,   /* REVOLİA pasifi: savunmada robotlar 2 kat */

  /* ── Ganimet ──
     SAVAŞTAN ELMAS KAZANILMAZ, KAYBEDİLMEZ. 28'e kadar kazanan
     rakibin elmasının %10'unu çalıyor, kaybeden kendi elmasının
     %4'ünü ödüyordu; ikisi de kaldırıldı.
     Ganimet artık KAYNAKTIR: zaferde savunanın deposundan, hayatta
     kalan ordunun taşıyabildiği kadar. Kaybedende ganimet yoktur. */
  yagmaPay: 0.25,   /* tek baskında savunanın her kaynağından en çok %25 */

  /* ── Kısıtlar ── */
  attackCooldownMs: 0,                   /* aynı oyuncuya tekrar saldırı beklemesi — 0 = yok */
  newbieShieldMs:   0,                   /* yeni hesap kalkanı — 0 = KAPALI    */

  /* ── Sadece GÖSTERİM: missile.js'teki kale HP ayarlarıyla aynı olmalı ── */
  castleMaxHp:        1000,
  castleRegenPerHour: 150,
  brokenThreshold:    150,
};

/* Birliklerin savaş dizilişi: baştakiler ÖN SAFTA, önce onlar kırılır.
   Bunlar AİLELERDİR (knight/soldier/robot). Kademeler (knight2…knight6)
   kendi ailelerinin içinde, Sv1'den yukarı doğru sıralanır — yani ön
   safta önce alt kademeler kırılır. */
const FRONT_ORDER = ["knight", "soldier", "robot"];

/*  ── KADEME DESTEĞİ ─────────────────────────────────────────────
    troops.js 18 birlik tanımlar (3 aile × 6 kademe). Motorun her
    yerinde "knight" gibi sabit kimlik aramak yerine AİLEYE bakılır,
    böylece Sv2+ birlikler de savaşa girer, hedeflenir ve buff alır.  */
function AILE(uid) {
  const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[uid] : null;
  return (d && d.aile) || String(uid).replace(/[0-9]+$/, "") || uid;
}
function KADEME_NO(uid) {
  const d = (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES[uid] : null;
  return (d && (d.kademe || d.level)) || 1;
}
/* Ordunun kurulum sırası: aile sırası korunur, her ailenin
   kademeleri Sv1'den Sv6'ya. */
function SAF_SIRASI() {
  const hepsi = (typeof UNIT_TYPES !== "undefined") ? Object.keys(UNIT_TYPES) : [];
  const out = [];
  FRONT_ORDER.forEach(fam => {
    hepsi.filter(id => AILE(id) === fam)
         .sort((a, b) => KADEME_NO(a) - KADEME_NO(b))
         .forEach(id => out.push(id));
  });
  /* tanımda olup aileye girmeyen varsa sona eklenir */
  hepsi.forEach(id => { if (out.indexOf(id) < 0) out.push(id); });
  return out;
}

/* ═══════════════════════════════════════════════════════════════
   HEDEF ÖNCELİĞİ (taş-kağıt-makas)
   ---------------------------------------------------------------
     Şövalye (savunmacı) → önce ASKER'i vurur
     Asker   (organize)  → önce ROBOT'u vurur
     Robot   (nişancı)   → önce ŞÖVALYE'yi vurur

   Öncelikli hedefi tükenen birlik boş durmaz: döngüde sıradaki
   tipe geçer. Yani şövalyenin sırası  asker → robot → şövalye.
   Bu bir ÖNCELİK sırasıdır, hasar bonusu YOKTUR.
   ═══════════════════════════════════════════════════════════════ */
const TARGET_ORDER = {
  knight:  ["soldier", "robot",   "knight"],
  soldier: ["robot",   "knight",  "soldier"],
  robot:   ["knight",  "soldier", "robot"],
};

/* Komutanların hangi sınıfa sayıldığı — kahramanın kendi saldırısı
   bu sınıfın hedef sırasını kullanır. Yeni kahraman eklenirse
   buraya da yazılmalı; yazılmazsa ön saf sırasıyla vurur. */
/*  Aile eşlemesi ARTIK BURADA YAZILI DEĞİL — heroes.js'teki KAHRAMAN
    kapısından türer (heroes.js bu dosyadan önce yüklenir). Eskiden
    aynı tablo iki dosyada duruyordu ve biri güncellenmeyince kahraman
    sessizce kategorisiz kalıyordu.                                  */
const HERO_CATEGORY = (typeof KAHRAMAN !== "undefined")
  ? KAHRAMAN.tablo(id => KAHRAMAN.aile(id))
  : {};

/* ═══════════════════════════════════════════════════════════════
   1) CSS
   ═══════════════════════════════════════════════════════════════ */
(function injectCSS() {
  const st = document.createElement("style");
  st.id = "pvpStyles";
  st.textContent = `
.pvp-backdrop{
  position:fixed; inset:0; z-index:320;
  background:rgba(2,8,22,.55); -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px);
  display:flex; align-items:center; justify-content:center; padding:20px;
  animation:pvpFadeIn .16s ease;
}
@keyframes pvpFadeIn{ from{opacity:0} to{opacity:1} }

/* ── KALEYE ÇAPALI PENCERE ────────────────────────────────────
   Ekranın ortasında değil, dokunulan kalenin ÜSTÜNDE açılır ve
   arka plan KARARMAZ. Altındaki üçgen kaleyi gösterir. */
.pvp-backdrop.pvp-capa{
  background:transparent; -webkit-backdrop-filter:none; backdrop-filter:none;
  display:block; padding:0; animation:none;
}
/* Konumu hesaplanana kadar GİZLİ — ortada bir kare görünüp
   yerine zıplaması "ekran refresh attı" hissini veriyordu. */
.pvp-backdrop.pvp-capa .pvp-pop{ position:absolute; margin:0; animation:none; }
.pvp-backdrop.pvp-capa.pvp-hazir .pvp-pop{ animation:pvpFadeIn .12s ease; }
.pvp-pop-ok{
  position:absolute; left:var(--ok-x, 50%); width:0; height:0;
  transform:translateX(-50%); pointer-events:none;
}
.pvp-pop-ok.asagi{
  bottom:-11px;
  border-left:11px solid transparent; border-right:11px solid transparent;
  border-top:12px solid #0e6fc0;
}
.pvp-pop-ok.yukari{
  top:-11px;
  border-left:11px solid transparent; border-right:11px solid transparent;
  border-bottom:12px solid #1fa3ea;
}
@keyframes pvpPopIn{ from{opacity:0; transform:translateY(14px) scale(.94)} to{opacity:1; transform:none} }

/* ═══════════════════════════════════════════════════════════════
   KALE KUTUCUĞU — görünüm şablonu tema.js ile aynı tutulmalı.
   (tema.js yüklü değilse de kutucuk düzgün görünsün diye burada
   kendi kopyası duruyor.)
   ═══════════════════════════════════════════════════════════════ */
/* DÜZ: radial parlaklıklar, 3px çerçeve, dış ışıma ve inset kalktı. */
.pvp-pop{
  background:linear-gradient(180deg, #1fa3ea, #0e6fc0) !important;
  border:1px solid rgba(190,240,255,.20) !important;
  box-shadow:none !important;
}

.pvp-pop{
  position:relative; width:min(272px, 78vw);
  border-radius:16px; padding:12px 12px 12px;
  font-family:'Baloo 2',sans-serif; color:#eaf4ff;
  animation:pvpPopIn .18s cubic-bezier(.2,.9,.3,1.3);
}


/* SOL ÜST KÖŞE: FÜZE (eski ✕ yeri). ✕ kaldırıldı — panel dışına
   dokununca zaten kapanıyor. */
.pvp-missile{
  position:absolute; top:-13px; left:-11px; z-index:6;
  width:46px; height:46px; border:none; cursor:pointer; border-radius:50%;
  background:linear-gradient(180deg,#ffb44d,#e0631b);
  box-shadow:none;
  font-size:22px; line-height:1; display:flex; align-items:center; justify-content:center;
  transition:transform .09s, filter .09s; -webkit-tap-highlight-color:transparent;
}
.pvp-missile:active{ transform:scale(.96); filter:brightness(.93); }
.pvp-missile::after{
  content:"FÜZE"; position:absolute; bottom:-15px; left:50%; transform:translateX(-50%);
  font-weight:800; font-size:9px; letter-spacing:.5px; color:#ffd9a8;
  text-shadow:0 1px 2px rgba(0,20,45,.55); pointer-events:none; white-space:nowrap;
}

/* SAĞ ÜST KÖŞE: PAYLAŞ. Koordinat yazısı kaldırıldı; paylaşma işi
   bu düğmeye taşındı. Füze düğmesinin sol üstteki karşılığı. */
.pvp-share{
  position:absolute; top:-11px; right:-9px; z-index:6;
  width:38px; height:38px; border:none; cursor:pointer; border-radius:50%;
  background:linear-gradient(180deg,#5fd3ff,#1f7fd0);
  box-shadow:none;
  font-size:18px; line-height:1; display:flex; align-items:center; justify-content:center;
  transition:transform .09s, filter .09s; -webkit-tap-highlight-color:transparent;
}
.pvp-share:active{ transform:scale(.94); filter:brightness(.93); }

.pvp-head{ display:flex; flex-direction:column; align-items:center; gap:3px;
  margin:2px 0 9px; text-align:center; }
.pvp-ava{
  width:46px; height:46px; flex:0 0 46px; border-radius:12px;
  background:linear-gradient(180deg, rgba(255,255,255,.25), rgba(255,255,255,.06));
  border:1px solid rgba(190,240,255,.20);
  display:flex; align-items:center; justify-content:center; font-size:26px;
}
.pvp-name{ font-weight:800; font-size:17px; line-height:1.1; color:#fff;
  text-shadow:0 1px 2px rgba(0,20,45,.55); word-break:break-word; }
.pvp-sub{ font-size:11.5px; font-weight:700; color:#dff2ff; margin-top:1px;
  text-shadow:0 1px 2px rgba(0,30,55,.5); }
/* Koordinat satırı sohbette paylaşmak için tıklanabilir */
.pvp-sub-share{ display:inline-block; cursor:pointer; border-radius:8px;
  padding:1px 7px; margin-left:-7px; background:rgba(255,255,255,.10);
  transition:background .12s, transform .06s; }
.pvp-sub-share:hover{ background:rgba(255,255,255,.20); }
.pvp-sub-share:active{ transform:scale(.96); }
.pvp-share-ico{ font-size:.95em; opacity:.9; }
.pvp-tag{ display:inline-block; margin-top:5px; padding:2px 8px; border-radius:999px;
  font-size:10px; font-weight:800; letter-spacing:.4px; }
.pvp-tag.friend{ background:rgba(59,116,232,.22); color:#8fb6ff; border:1px solid rgba(120,170,255,.4); }
.pvp-tag.shield{ background:rgba(95,217,138,.18); color:#7fe3a6; border:1px solid rgba(95,217,138,.4); }
.pvp-tag.own{    background:rgba(212,175,55,.18); color:#f2d47a; border:1px solid rgba(212,175,55,.45); }

/* Ortadaki "kutu içinde kutu" kaldırıldı — sadece boşluk kaldı. */
.pvp-stats{
  background:none; border:none; box-shadow:none;
  padding:0; margin-bottom:10px;
}
.pvp-stat-row{ display:flex; justify-content:space-between; align-items:center; gap:8px;
  font-size:12.5px; font-weight:700; padding:3px 0; color:#dff2ff;
  text-shadow:0 1px 2px rgba(0,30,55,.5); }
.pvp-stat-row b{ color:#fff; font-weight:900; }

.pvp-hp-bar{ height:7px; border-radius:4px; overflow:hidden; margin:3px 0 0 auto;
  width:100%; max-width:132px;
  background:rgba(0,0,0,.40); border:none; }
.pvp-hp-bar i{ display:block; height:100%; border-radius:4px; transition:width .4s; }

.pvp-sep{ height:1px; background:rgba(190,240,255,.14); margin:7px 0 5px; }

.pvp-actions{ display:flex; gap:8px; }
.pvp-btn{ flex:1; border:none; cursor:pointer; border-radius:13px;
  padding:8px 8px; font-family:'Baloo 2',sans-serif;
  font-weight:800; font-size:14px; letter-spacing:.4px; color:#fff;
  text-shadow:0 1px 2px rgba(0,20,45,.55);
  box-shadow:none;
  transition:transform .09s, filter .09s;
  -webkit-tap-highlight-color:transparent; }
.pvp-btn:active{ transform:scale(.96); filter:brightness(.93); }
.pvp-btn:disabled{ filter:saturate(.25) brightness(.65); cursor:not-allowed; }
/* SALDIR = savaş panelindeki düğmenin kırmızısı (tema.js ile aynı) */
.pvp-btn-attack{ background:linear-gradient(180deg,#ff3b3b,#c50f0f);
  border:1px solid rgba(255,170,170,.75); }
.pvp-btn-friend{ background:linear-gradient(180deg, ${CFG.friendColor1}, ${CFG.friendColor2});
  border:1px solid rgba(150,190,255,.45); }

.pvp-note{ margin-top:9px; text-align:center; font-size:10.5px; font-weight:700;
  color:#dff2ff; line-height:1.45; text-shadow:0 1px 2px rgba(0,30,55,.6); }

/* savaş raporu — birlik kayıpları */
.pvp-loss-box{ margin-top:9px;
  background:linear-gradient(180deg, rgba(34,72,143,.62), rgba(13,34,70,.75));
  border:1px solid rgba(190,240,255,.35); border-radius:11px; padding:9px 10px; }
.pvp-loss-title{ font-size:11px; font-weight:900; color:#a9c2e4; margin-bottom:5px; letter-spacing:.3px; }
.pvp-loss-row{ display:flex; justify-content:space-between; font-size:12px; font-weight:700; padding:2px 0; }


`;
  document.head.appendChild(st);
})();

/* ═══════════════════════════════════════════════════════════════
   2) YARDIMCILAR
   ═══════════════════════════════════════════════════════════════ */
function num(v, d) { return (typeof v === "number" && isFinite(v)) ? v : (d || 0); }
function money(n)  { return (typeof fmt === "function") ? fmt(Math.round(n)) : String(Math.round(n)); }
function toast(m)  { if (typeof showToast === "function") showToast(m); }
function fbKey(u)  { return (typeof toFirebaseKey === "function")
                       ? toFirebaseKey(String(u||"").toLowerCase()) : String(u||"").toLowerCase(); }
function tap(el,fn){ if(!el) return; (typeof bindTap === "function") ? bindTap(el,fn) : el.addEventListener("click",fn); }
function myKey()   { return (typeof currentUsername === "string" && currentUsername) ? fbKey(currentUsername) : null; }
function fbOK()    { return (typeof firebaseReady !== "undefined") && firebaseReady
                            && typeof firebaseDb !== "undefined" && firebaseDb; }
function esc(s)    { return String(s == null ? "" : s).replace(/[<>&"']/g, ""); }
function UT()      { return (typeof UNIT_TYPES !== "undefined") ? UNIT_TYPES : {}; }
function unitLabel(uid) { const d = UT()[uid]; return d ? (d.icon + d.name) : uid; }

function pvpState() {
  if (typeof state !== "object" || !state) return null;
  if (!state.friends)      state.friends = {};
  if (!state.pvpCooldowns) state.pvpCooldowns = {};
  return state;
}
function isFriend(name) { const s = pvpState(); return !!(s && name && s.friends[String(name).toLowerCase()]); }
function cooldownLeft(name) {
  const s = pvpState(); if (!s) return 0;
  return Math.max(0, CFG.attackCooldownMs - (Date.now() - (s.pvpCooldowns[String(name).toLowerCase()] || 0)));
}
function fmtLeft(ms) { const m = Math.ceil(ms/60000); return m >= 60 ? Math.ceil(m/60)+" saat" : m+" dk"; }

/* ═══════════════════════════════════════════════════════════════
   3) FIREBASE DİNLEYİCİLERİ
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   HESAP VERİSİ — istek üzerine
   Eskiden accounts/ düğümünün tamamı CANLI dinleniyordu: herhangi bir
   oyuncunun herhangi bir değişikliğinde bütün hesapların bütün verisi
   (savaş günlükleri dahil) her cihaza yeniden iniyordu. Artık rakibin
   verisi yalnızca kalesine dokunulduğunda, tek hesap olarak çekilir.
   ═══════════════════════════════════════════════════════════════ */
let ACCOUNTS  = {};   /* istek üzerine dolan önbellek                  */
let CASTLE_HP = {};   /* pvp/ → missile.js'in kale HP kaydı (bilgi)    */
let _hpRef = null;
const _accZaman = {};              /* key → en son ne zaman çekildi */
const ACC_TAZELIK = 20000;         /* 20 sn önbellek */

function startWatchers() {
  if (!fbOK()) return;
  if (!_hpRef) {
    _hpRef = firebaseDb.ref("pvp");
    _hpRef.on("value", s => { CASTLE_HP = s.val() || {}; }, e => console.warn("[pvp]", e));
  }
}

function accTaze(key) {
  return _accZaman[key] && (Date.now() - _accZaman[key] < ACC_TAZELIK);
}

/* Tek bir hesabı çeker ve önbelleğe alır */
function fetchAccount(name) {
  const key = fbKey(String(name || "").toLowerCase());
  if (!key) return Promise.resolve(null);
  if (!fbOK()) return Promise.resolve(ACCOUNTS[key] || null);
  return firebaseDb.ref("accounts/" + key).get()
    .then(snap => {
      const v = snap.val();
      if (v) { ACCOUNTS[key] = v; _accZaman[key] = Date.now(); }
      return v || ACCOUNTS[key] || null;
    })
    .catch(e => { console.warn("[pvp] hesap alınamadı:", e); return ACCOUNTS[key] || null; });
}

/* missile.js ile aynı "tembel yenilenme" hesabı — sadece göstermek için */
function effectiveHp(rec) {
  if (!rec) return CFG.castleMaxHp;
  const base  = typeof rec.hp === "number" ? rec.hp : CFG.castleMaxHp;
  const hitAt = rec.hitAt || rec.brokenAt;
  if (!hitAt) return Math.max(0, Math.min(CFG.castleMaxHp, base));
  const regen = ((Date.now() - hitAt) / 3600000) * CFG.castleRegenPerHour;
  return Math.max(0, Math.min(CFG.castleMaxHp, Math.floor(base + regen)));
}
function castleHpOf(name) { return effectiveHp(CASTLE_HP[fbKey(name)]); }

function findAccountByName(name) {
  if (!name) return null;
  const want = String(name).toLowerCase();
  if (ACCOUNTS[fbKey(want)]) return ACCOUNTS[fbKey(want)];
  const k = Object.keys(ACCOUNTS).find(k2 => {
    const a = ACCOUNTS[k2];
    return a && a.displayName && a.displayName.toLowerCase() === want;
  });
  return k ? ACCOUNTS[k] : null;
}

/* ═══════════════════════════════════════════════════════════════
   4) SAVUNAN OYUNCU BİLGİSİ
   ═══════════════════════════════════════════════════════════════ */
function buildDefender(acc, fallbackName) {
  const st = (acc && acc.state) || {};
  const h  = st.hero || {};
  const src = st.troops || {};

  /* savunanın Firebase anahtarını çöz (state'ini doğrudan güncellemek için) */
  const dName = (acc && acc.displayName) || fallbackName || "Oyuncu";
  const dKey  = fbKey(dName);

  /* savunmadaki gerçek birlik sayıları (robot çarpanı dahil) */
  const troops = {};
  let troopCount = 0;
  /*  Savunanın Sv2+ birlikleri de sayılır. Savunma çarpanı KİMLİĞE
      değil AİLEYE bakar: "robot" kimliği Nişancı ailesinin Sv1'idir,
      Savaş Arabası (robot2) da aynı çarpanı almalı. */
  SAF_SIRASI().forEach(uid => {
    let n = Math.max(0, Math.floor(num(src[uid], 0)));
    if (AILE(uid) === "robot") n = Math.round(n * CFG.defenseRobotMultiplier);
    troops[uid] = n;
    troopCount += n;
  });
  /* gerçek envanteri de sakla (kayıp düşerken çarpansız kullanılacak) */
  const realTroops = {};
  SAF_SIRASI().forEach(uid => realTroops[uid] = Math.max(0, Math.floor(num(src[uid], 0))));

  /* kutucukta gösterilecek toplam güç */
  let atk = num(h.attack, 40), def = num(h.defense, 25), hp = num(h.maxHp, 200);
  SAF_SIRASI().forEach(uid => {
    const d = UT()[uid]; if (!d) return;
    atk += d.attack * troops[uid]; def += d.defense * troops[uid]; hp += d.hp * troops[uid];
  });

  /* Savunanın SAVAŞA SEÇTİĞİ komutanlar (yetenekleri savaşta işler).
     Eski hesaplarda selectedCommanders yoksa sahip olduklarına düşülür. */
  let defSkins = Array.isArray(st.selectedCommanders) ? st.selectedCommanders.filter(Boolean) : [];
  if (!defSkins.length && Array.isArray(st.ownedHeroSkins)) defSkins = st.ownedHeroSkins.slice(0, 3);
  defSkins = defSkins.slice(0, 3);

  const defCommanders = defSkins
    .map(id => (typeof HERO_STATS !== "undefined" && HERO_STATS[id]) ? HERO_STATS[id].name : null)
    .filter(Boolean);

  return {
    isPlayer: true,
    name: dName,
    accKey: dKey,
    commanderNames: defCommanders,
    commanderSkins: defSkins,
    /* Savunanın kahraman seviyeleri — stat bonusu buradan hesaplanır
       (kendi kaydımızdaki seviyeler savunan için geçerli değil). */
    commanderLevels: (st.heroLevels && typeof st.heroLevels === "object") ? st.heroLevels : {},
    /* Savunanın HAZIRLADIĞI mağaza buffları (buff.js).
       Savunan çevrimdışı olabildiği için planı saldıranın
       istemcisi çözer; yalnız "savunmada" işleyen türler girer. */
    hazirBuff: Array.isArray(st.hazirBuff) ? st.hazirBuff.slice() : [],
    avatar: "🏰", tier: "hard",
    /* arena önizlemesi bu 3 alanı kullanıyor */
    attack:  Math.max(5,  Math.round(atk * CFG.castleAtkBonus)),
    defense: Math.max(0,  Math.round(def * CFG.castleDefBonus)),
    maxHp:   Math.max(80, Math.round(hp  * CFG.castleHpBonus)),
    /* savaş motoru bunları kullanır */
    defTroops:  troops,
    realTroops: realTroops,
    hero: {
      attack:  num(h.attack, 40),
      defense: num(h.defense, 25),
      maxHp:   num(h.maxHp, 200),
      ultiChance:     num(h.ultiChance, 0.15),
      ultiMultiplier: num(h.ultiMultiplier, 1.8),
    },
    diamonds:     num(st.diamonds, 0),
    registeredAt: num(acc && acc.registeredAt, 0),
    /* KALKAN — savunanın state'inden taşınır. Buradan geçmezse
       ne rozet çizilir ne de SALDIR düğmesi kilitlenir. */
    kalkanBitis:  num(st.kalkanBitis, 0),
    troopCount:   troopCount,
    mapX: 0, mapY: 0, baseReward: 0,
  };
}

/* ── KALKAN ─────────────────────────────────────────────────────
   İKİ AYRI KALKAN, TEK KAPI:
     1) Yeni oyuncu kalkanı — `CFG.newbieShieldMs`. 0 ise KAPALI.
     2) Mağaza kalkanı — savunanın `state.kalkanBitis` damgası.
   Bu fonksiyona bağlı olan her şey (rozet, uyarı metni, SALDIR
   kilidi, füze kapısı) ikisini de kendiliğinden görür. Yeni bir
   kontrol yolu AÇMA, buraya ekle.
   Döner: kalan süre (ms). 0 = kalkan yok.                        */
function kalkanKalan(d) {
  if (!d) return 0;
  const now = Date.now();
  let en = 0;

  const b = num(d.kalkanBitis, 0);
  if (b > now) en = b - now;

  if (CFG.newbieShieldMs && d.registeredAt) {
    const y = d.registeredAt + CFG.newbieShieldMs;
    if (y > now && (y - now) > en) en = y - now;
  }
  return en;
}
function hasNewbieShield(d) { return kalkanKalan(d) > 0; }

/* ═══════════════════════════════════════════════════════════════
   5) KALE KUTUCUĞU
   ═══════════════════════════════════════════════════════════════ */
let _popEl = null;
let _popAd = null;          /* açık pencerenin ait olduğu oyuncu adı */
function closeCastlePopup() { if (_popEl) { _popEl.remove(); _popEl = null; } _popAd = null; }

/* Kısa uyarı — showToast bu cihazda görünmüyor, ekrana ham div basıyoruz. */
function pvpNot(yazi) {
  const d = document.createElement("div");
  d.textContent = yazi;
  d.style.cssText = "position:fixed;left:50%;bottom:22%;transform:translateX(-50%);" +
    "z-index:99999;background:rgba(10,28,52,.95);color:#fff;padding:8px 14px;" +
    "border-radius:12px;font-family:'Baloo 2',sans-serif;font-weight:800;font-size:14px;" +
    "box-shadow:none;pointer-events:none;";
  document.body.appendChild(d);
  setTimeout(() => { try { d.remove(); } catch (e) {} }, 2200);
}

/* Pencereyi dokunulan kalenin ÜSTÜNE oturtur.
   ekranKonumu() #battleMap katmanına göre PİKSEL verir; ekran
   koordinatına çevirmek için katmanın kendi kutusu eklenir. */
function capala(back, gx, gy) {
  const mapEl = document.getElementById("battleMap");
  const H = window.HARITA;
  if (!mapEl || !H || typeof H.ekranKonumu !== "function") return;

  let p;
  /* ── KALE 2×2 ──
     Çapa artık kalenin SOL ÜST karosu değil, kapladığı dört karonun
     TEPE KÖŞESİ. Kale iki kat büyüdüğü için eski çapa panelin kale
     görselinin üstüne binmesine yol açıyordu.

     İzometride tepe köşe, sol üst karonun (-0.5,-0.5) köşesidir ve
     kalenin görsel merkeziyle AYNI dikey eksende durur — yani okun
     yatay konumu değişmez, panel yalnız yukarı çıkar. */
  try {
    const K = window.KOORD;
    let ax = gx, ay = gy;
    if (K && typeof K.kaleSolUst === "function") {
      const k = K.kaleKaro({ gx: gx, gy: gy });
      if (k) {
        const s = K.kaleSolUst(k.kx, k.ky);
        ax = K.karodanOlcek(s.kx - 0.5);
        ay = K.karodanOlcek(s.ky - 0.5);
      }
    }
    p = H.ekranKonumu(ax, ay);
  } catch (e) { return; }
  if (!p || !isFinite(p.x) || !isFinite(p.y)) return;

  const r  = mapEl.getBoundingClientRect();
  const cx = r.left + p.x;                       /* kalenin ekran x'i */
  const cy = r.top  + p.y;                       /* kalenin tepe y'si */

  back.classList.add("pvp-capa");
  const pop = back.querySelector(".pvp-pop");
  const ok  = back.querySelector("#pvpPopOk");
  const w   = pop.offsetWidth, h = pop.offsetHeight;
  const vw  = window.innerWidth, vh = window.innerHeight;
  /* Kale görseli tepe köşenin bir karo kadar YUKARISINA taşıyor
     (resim iki karo boyunda ve alana ortalı). Boşluk ona göre. */
  const bosluk = Math.max(26, (p.kareYuksekligi || 30) * 1.2);
  const kenar  = 10;

  /* Yatay: kaleye ortala, ekran kenarını taşarsa içeri çek. */
  let left = cx - w / 2;
  left = Math.max(kenar, Math.min(left, vw - w - kenar));

  /* Dikey: üstte yer yoksa kalenin ALTINA düşer, ok ters döner. */
  let top = cy - bosluk - h;
  let ustte = true;
  if (top < kenar + 46) {                        /* 46: füze düğmesi taşması */
    top = cy + bosluk;
    ustte = false;
  }
  top = Math.max(kenar + 46, Math.min(top, vh - h - kenar));

  pop.style.left = left + "px";
  pop.style.top  = top  + "px";

  /* Ok kaleyi göstersin — pencere kenara çekilmiş olsa bile. */
  if (ok) {
    ok.className = "pvp-pop-ok " + (ustte ? "asagi" : "yukari");
    const okX = Math.max(16, Math.min(cx - left, w - 16));
    ok.style.setProperty("--ok-x", okX + "px");
  }
  return true;
}

function openCastlePopup(name, gx, gy, isOwn) {
  /* Rakip verisi canlı dinlenmiyor; o tek hesabı çekeriz.
     BEKLETME YOK: elde eski bir kayıt varsa pencere ANINDA açılır,
     taze veri gelince içi sessizce yenilenir. Uygulamadan dönerken
     Firebase bağlantısı yeniden kurulurken 10-20 sn sürüyordu ve
     kale "tıklanmıyor" gibi görünüyordu — sebep buydu. */
  if (!isOwn) {
    const _k = fbKey(String(name || "").toLowerCase());
    if (!accTaze(_k)) {
      const eldeVar = !!ACCOUNTS[_k];

      if (eldeVar) {
        /* Arka planda tazele; pencere hâlâ aynı kaleye aitse yenile. */
        fetchAccount(name).then(() => {
          _accZaman[_k] = Date.now();
          if (_popAd === name) openCastlePopup(name, gx, gy, isOwn);
        });
        /* return YOK — aşağıda eldeki veriyle hemen açılıyor. */
      } else {
        /* Hiç kayıt yok: beklemek zorundayız ama sınırlı.
           3 saniyede gelmezse sessiz kalmak yerine haber veriyoruz. */
        let bitti = false;
        fetchAccount(name).then(() => {
          if (bitti) return;
          bitti = true;
          _accZaman[_k] = Date.now();
          openCastlePopup(name, gx, gy, isOwn);
        });
        setTimeout(() => {
          if (bitti) return;
          bitti = true;
          if (ACCOUNTS[_k]) { _accZaman[_k] = Date.now(); openCastlePopup(name, gx, gy, isOwn); }
          else pvpNot("Bağlantı kurulamadı, tekrar dene");
        }, 3000);
        return;
      }
    }
  }

  closeCastlePopup();
  _popAd = isOwn ? null : name;

  const hp      = castleHpOf(isOwn ? (currentUsername || "") : name);
  const hpPct   = Math.round(hp / CFG.castleMaxHp * 100);
  const hpColor = "#e0332b";                     /* bar her zaman KIRMIZI */

  const acc      = isOwn ? null : findAccountByName(name);
  const defender = isOwn ? null : buildDefender(acc, name);
  const friend   = !isOwn && isFriend(name);
  const shieldMs = defender ? kalkanKalan(defender) : 0;
  const shield   = shieldMs > 0;
  const cdLeft   = isOwn ? 0 : cooldownLeft(name);

  let tag = "";
  /* KENDİ KALEN: "👑 SENİN KALEN" rozeti kaldırıldı — kendi kalene
     bastığını zaten biliyorsun, pencere sade kalsın. */
  if (friend) tag = `<span class="pvp-tag friend">🤝 DOSTUN</span>`;
  else if (shield) tag = `<span class="pvp-tag shield">🛡️ KALKAN — ${fmtLeft(shieldMs)}</span>`;

  /* Kale HP — SADECE füze sisteminin bilgisi, saldırıyla ilgisi yok */
  const hpBlock = `
    <div class="pvp-stat-row" style="padding-bottom:0;">
      <span>🏰 Kale HP</span><b>${hpPct}</b>
    </div>
    <div class="pvp-hp-bar"><i style="width:${hpPct}%; background:${hpColor};"></i></div>`;

  /* Rakibin BİRLİK DÖKÜMÜ gizli — sadece TOPLAM GÜÇ gösterilir.

     GÜÇ HESABI TEK YERDEN: index.html'deki computePlayerPower().
     Sıralama tablosu da aynı işlevi kullanıyor; böylece kale
     penceresindeki sayı ile 🏆 Güç Sıralamasındaki sayı BİREBİR
     aynı olur. Eskiden burada ayrı bir formül vardı
     (saldırı + savunma + can/4) ve iki ekran farklı sayı
     gösteriyordu.

     computePlayerPower ham state'i okur (savunma robot çarpanı
     uygulanmamış hâlini) — sıralama neyi okuyorsa o. */
  const totalPower = (typeof computePlayerPower === "function")
    ? computePlayerPower((acc && acc.state) || null)
    : (defender ? Math.round(defender.attack + defender.defense + defender.maxHp / 4) : 0);

  /* KENDİ KALEN: elmas ve birlik dökümü (Savunucu/Koruyucu/Nişancı)
     buradan kaldırıldı — aynı bilgiler üst çubukta ve Birlikler
     ekranında zaten var, pencerede yalnız Kale HP kalır. */
  const statsHTML = isOwn
    ? hpBlock
    : hpBlock + `<div class="pvp-sep"></div>
        <div class="pvp-stat-row" style="font-size:14px;">
          <span>⚔️ Güç</span><b style="color:#ffd257;">${money(totalPower)}</b>
        </div>`;

  const actionsHTML = isOwn ? "" : `
    <div class="pvp-actions">
      <button class="pvp-btn pvp-btn-friend" id="pvpFriendBtn">${friend ? "💔 DOSTLUĞU BİTİR" : "🤝 DOSTLUK"}</button>
      <button class="pvp-btn pvp-btn-attack" id="pvpAttackBtn">⚔️ SALDIR</button>
    </div>`;

  /* Alt bilgi metni yalnızca bir KISIT varsa gösterilir; normal
     durumda hiçbir açıklama yazılmaz. */
  let note = "";
  if (friend)          note = "Dostuna saldıramazsın.";
  else if (shield)     note = `Kalkanı açık. ${fmtLeft(shieldMs)} sonra saldırabilirsin.`;
  else if (cdLeft > 0) note = `Tekrar saldırmak için ${fmtLeft(cdLeft)} beklemelisin.`;

  const back = document.createElement("div");
  /* Çapa sınıfı DOM'a girmeden veriliyor: önce ortada bir kare
     çizilip sonra yerine zıplaması ekranın yenilendiği hissini
     veriyordu. */
  back.className = "pvp-backdrop pvp-capa";
  back.style.visibility = "hidden";
  back.innerHTML = `
    <div class="pvp-pop">
      <i class="pvp-pop-ok asagi" id="pvpPopOk"></i>
      ${isOwn ? "" : `<button class="pvp-missile" id="pvpMissileBtn" title="Füze gönder">🚀</button>`}
      <button class="pvp-share" id="pvpCoordShare" title="Sohbette paylaş">📤</button>
      <div class="pvp-head">
        <div class="pvp-ava">🏰</div>
        <div class="pvp-name">${esc(name || "Oyuncu")}</div>
        ${tag}
      </div>
      <div class="pvp-stats">${statsHTML}</div>
      ${actionsHTML}
      ${note ? `<div class="pvp-note">${note}</div>` : ""}
    </div>`;
  document.body.appendChild(back);
  _popEl = back;

  /* Kalenin üstüne çapala. Harita hazır değilse ortada açılır. */
  if (!capala(back, gx, gy)) back.classList.remove("pvp-capa");
  back.classList.add("pvp-hazir");
  back.style.visibility = "";

  /* Paneli açan dokunuşun devamı (click) hemen arka plana düşüp
     paneli kapatmasın diye kısa bir gecikme koyuyoruz. */
  setTimeout(() => {
    const disari = e => { if (e.target === back) closeCastlePopup(); };
    back.addEventListener("pointerdown", disari);
    back.addEventListener("click", disari);
  }, 300);
  /* ✕ kaldırıldı; varsa yine de bağlan (başka pencere kullanıyorsa). */
  const _kapatBtn = back.querySelector("#pvpCloseBtn");
  if (_kapatBtn) tap(_kapatBtn, closeCastlePopup);
  /* Kendi kalende füze düğmesi hiç basılmaz — yukarıda çizilmiyor. */
  const _fuzeBtn = back.querySelector("#pvpMissileBtn");
  if (_fuzeBtn) tap(_fuzeBtn, () => fireMissileAt(name, gx, gy, isOwn));

  /* 📍 satırına dokun → koordinatı sohbete at.
     shareCoordInChat index.html'de tanımlı. Yoksa satır sade yazıya
     döner; yanlış çalışmaktansa hiç görünmesin. */
  const coordEl = back.querySelector("#pvpCoordShare");
  if (coordEl) {
    if (typeof window.shareCoordInChat === "function") {
      tap(coordEl, () => {
        closeCastlePopup();
        window.shareCoordInChat(gx, gy, isOwn ? "" : name);
      });
    } else {
      /* Paylaşma işlevi yoksa düğme hiç durmasın — yanlış
         çalışmaktansa görünmesin. */
      coordEl.remove();
    }
  }

  const aBtn = back.querySelector("#pvpAttackBtn");
  const fBtn = back.querySelector("#pvpFriendBtn");
  if (aBtn) {
    aBtn.disabled = friend || shield || cdLeft > 0;
    tap(aBtn, () => { if (!aBtn.disabled) { closeCastlePopup(); beginPvpBattle(defender); } });
  }
  if (fBtn) tap(fBtn, () => { closeCastlePopup(); friend ? breakFriendship(name) : sendFriendRequest(name); });
}

/* ── FÜZE: missile.js'in açtığı resmi arayüzü çağır ──
   Artık DOM'dan buton bulup tıklama taklit etmiyoruz;
   missile.js window.MISSILE_API'yi dışarı açıyor. ── */
function fireMissileAt(name, gx, gy, isOwn) {
  /* Kendi kalende füze düğmesi artık hiç çizilmiyor; buraya
     gelinirse sessizce çık — uyarı yazısı kaldırıldı. */
  if (isOwn) return;

  /* ── KALKAN FÜZEYİ DE DURDURUR ──
     Füze yalnız buradan fırlatılıyor (missile.js kendi başına
     hedef seçmiyor), o yüzden kapı TEK YER: burası. */
  const _d  = buildDefender(findAccountByName(name), name);
  const _ms = kalkanKalan(_d);
  if (_ms > 0) {
    closeCastlePopup();
    pvpNot(`🛡️ ${name} kalkan açmış — füze işlemez. (${fmtLeft(_ms)})`);
    return;
  }

  closeCastlePopup();
  const api = window.MISSILE_API;
  if (api && typeof api.open === "function") {
    setTimeout(() => api.open(name, gx, gy), 60);
    return;
  }
  toast("Füze sistemi bulunamadı (missile.js güncel mi?).");
}

/* ═══════════════════════════════════════════════════════════════
   6) ORDU SAVAŞ MOTORU — birlikler birbirini kırar
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   KAHRAMAN YETENEKLERİ — PvP
   İki taraf da savaşa götürdüğü komutanların yeteneklerini kullanır.
   Yetenek verisi index.html'deki abilitiesForSkins() ile hesaplanır.
   ═══════════════════════════════════════════════════════════════ */
function buffsOf(skinList, engelli) {
  if (typeof window.abilitiesForSkins !== "function") return [];
  return window.abilitiesForSkins(skinList, engelli) || [];
}

/* ── PASİF: YETENEK ENGELİ (Gölge Manevrası) ──────────────────────
   heroes.js → HERO_STATS[id].passive.effect = { type:"ability_block", count:N }
   Kimlik motorda SABİT DEĞİL: tanım hangi kahramanda varsa o engeller.
   `engelleyenSkins` tarafındaki her pasif, `hedefSkins` kahramanlarının
   yeteneklerinden rastgele N tanesini savaş boyunca kapatır.
   Döner: { engelli:[{heroId,title}], satirlar:[rapor satırı] }        */
function yetenekEngeli(engelleyenSkins, hedefSkins) {
  const sonuc = { engelli: [], satirlar: [] };
  if (typeof HERO_STATS === "undefined") return sonuc;

  /* Hedefin iptal edilebilir yetenek havuzu (etkisi olan her yetenek) */
  const havuz = [];
  (hedefSkins || []).filter(Boolean).forEach(id => {
    const h = HERO_STATS[id];
    ((h && h.abilities) || []).forEach(a => {
      if (a && a.effect && a.title) havuz.push({ heroId: id, title: a.title });
    });
  });

  (engelleyenSkins || []).filter(Boolean).forEach(id => {
    const h = HERO_STATS[id];
    const p = h && h.passive && h.passive.effect;
    if (!p || p.type !== "ability_block") return;
    const adet = Math.max(1, p.count || 1);
    let n = 0;
    for (let i = 0; i < adet && havuz.length; i++) {
      sonuc.engelli.push(havuz.splice(Math.floor(Math.random() * havuz.length), 1)[0]);
      n++;
    }
    /* Rapor satırı: hangi yetenek değil, KAÇ yetenek iptal edildi. */
    sonuc.satirlar.push({
      type: "ability_block",
      title: h.passive.title || "Pasif Yetenek",
      ikon: h.passive.icon || "",
      aciklama: h.passive.desc || "",
      tetik: n,
      sources: [{ heroId: id, heroName: h.name || id, title: h.passive.title || "Pasif Yetenek" }]
    });
  });
  return sonuc;
}
function findBuff(ab, t) { return (ab || []).find(a => a.type === t); }

/* Birim statlarına yetenekleri uygular (makeArmy içinde çağrılır) */
function applyTroopBuffs(units, ab, taraf) {
  let f;
  /* `taraf` makeArmy'den gelir: "attacker" | "defender".
     Yalnız savunmada işleyen yetenekler bunu okur. */
  const savunmada = (taraf === "defender");
  units.forEach(u => {
    /* Belirli bir AİLENİN canı — YALNIZ KALE SAVUNMASINDA.
       Aile yetenek tanımından okunur, motorda sabit yazılmaz
       (family_atk_pct ile aynı kalıp). */
    if (savunmada && (f = findBuff(ab, "defense_family_hp_pct")) && f.v) {
      const fam = (f.effect && f.effect.family) || "";
      if (AILE(u.unitId) === fam) u.hp *= (1 + f.v / 100);
    }
    if (AILE(u.unitId) === "robot") {
      const rob = findBuff(ab, "robot_atk_hp_pct");
      if (rob && rob.v) { u.atk *= (1 + rob.v / 100); u.hp *= (1 + rob.v / 100); }
    }
    /*  Aile savunma çarpanı — YALNIZ KALE SAVUNMASINDA.
        Eskiden `AILE === "robot"` bloğunun İÇİNDEYDİ ve taraf
        bakılmıyordu: aile motorda sabit yazılıydı (tanımdaki
        `troopType` alanı hiç okunmuyordu) ve çarpan saldırıya
        çıkarken de uygulanıyordu. Artık aile tanımdan gelir ve
        yalnız savunan tarafta işler.                               */
    if (savunmada) {
      const rd = findBuff(ab, "defense_family_def_mult");
      if (rd && rd.effect) {
        const fam = rd.effect.family || "";
        if (AILE(u.unitId) === fam) u.def *= (rd.effect.multiplier || 2);
      }
    }
    /* Belirli bir AİLENİN saldırısı (Çelik Yansıması) — aile
       yetenek tanımından okunur, motorda sabit yazılmaz. */
    if ((f = findBuff(ab, "family_atk_pct")) && f.v) {
      const fam = (f.effect && f.effect.family) || "";
      if (AILE(u.unitId) === fam) u.atk *= (1 + f.v / 100);
    }
    if ((f = findBuff(ab, "troop_atk_def_pct")) && f.v) {
      u.atk *= (1 + f.v / 100); u.def *= (1 + f.v / 100);
    }
    if ((f = findBuff(ab, "troop_atk_def_hp_pct"))) {
      u.atk *= (1 + (f.v || 0) / 100);
      u.def *= (1 + ((f.v2 != null ? f.v2 : f.v) || 0) / 100);
      const hpp = (f.effect && f.effect.hpFlatPct) || 0;
      u.hp *= (1 + hpp / 100);
    }
    if ((f = findBuff(ab, "troop_def_pct")) && f.v) u.def *= (1 + f.v / 100);
    /* `troop_hp_pct` birden çok kaynaktan gelebilir (kahraman yeteneği
       + savunanın mağaza buffu) ve buff.js girdisi `aile` taşır.
       findBuff yalnız İLKİNİ döndürdüğü için burada hepsi gezilir;
       ailesi tutmayan birime işlemez. */
    (ab || []).forEach(a => {
      if (!a || a.type !== "troop_hp_pct" || !a.v) return;
      if (a.aile && AILE(u.unitId) !== a.aile) return;
      u.hp *= (1 + a.v / 100);
    });

    /* YUVARLAMA YOK — taban değerler tek haneli (savunma 5, saldırı 2).
       Math.round burada %15'lik yeteneği yutuyor, arkasından gelen
       kahraman bonusunu da yanlış tabana bindiriyordu. Ondalık taşınır;
       yuvarlama yalnızca ekrana yazarken yapılır. */
    u.atk = Math.max(0.1, u.atk);
    u.def = Math.max(0,   u.def);
    u.hp  = Math.max(0.1, u.hp);
  });
}

/* Savaş akışını etkileyen yetenekler — tur döngüsünde kullanılır */
function flowOf(ab) {
  const g = (t, k) => { const f = findBuff(ab, t); return f ? (f[k || "v"] || 0) : 0; };
  return {
    freezeTurns:   Math.round(g("enemy_freeze_turns")),
    reflectPct:    g("damage_reflect_pct"),
    defShredPct:   g("enemy_def_shred_pct"),
    /* Savunma yıpratmanın tutma ihtimali (Ateş Büyüsü) */
    defShredSans:  (() => {
      const f = findBuff(ab, "enemy_def_shred_pct");
      if (!f) return 100;
      const c = (f.effect && f.effect.chance);
      return (c != null) ? c : (f.chance != null ? f.chance : 100);
    })(),
    enemyReducePct:g("enemy_hp_atk_reduce_pct"),
    instantPct:    g("enemy_instant_casualty"),
    /* Aileye can azaltma — ihtimalli. Yetenek tanımından hem yüzde
       hem aile hem ihtimal okunur, motorda sabit yazılmaz. */
    familyHp:      (() => {
      const f = findBuff(ab, "enemy_family_hp_reduce");
      if (!f || !f.v) return null;
      return {
        pct: f.v,
        aile: (f.effect && f.effect.family) || "soldier",
        sans: ((f.effect && f.effect.chance) != null ? f.effect.chance
              : (f.chance != null ? f.chance : 100))
      };
    })(),
    periodicPct:   g("periodic_def_reduce_pct"),
    gapCapPct:     g("power_gap_cap"),
    woundedPct:    g("wounded_return_pct"),
    /* sayaçlar — rapora yazılır */
    used: { freeze: 0, reflect: 0, instant: 0, periodic: 0, gapCap: 0, familyHp: 0, defShred: 0 }
  };
}

function makeArmy(troopsObj, heroStats, label, abilities, heroSkins) {
  const units = [];
  SAF_SIRASI().forEach(uid => {
    const d = UT()[uid]; if (!d) return;
    const c = Math.max(0, Math.floor(num((troopsObj || {})[uid], 0)));
    if (c <= 0) return;

    /*  Statların TEK KAYNAĞI istatistik katmanıdır (istatistik.js):
        taban değer + araştırma/kale bonusları. Katman yüklü değilse
        troops.js'teki ham değere düşer — oyun yine çalışır.        */
    let atk = d.attack, def = d.defense, hp = d.hp, olum = d.olum || 0;
    if (typeof ISTATISTIK !== "undefined" && ISTATISTIK && ISTATISTIK.birim) {
      const b = ISTATISTIK.birim(uid);
      if (b) { atk = b.saldiri; def = b.savunma; hp = b.can; olum = b.olum; }
    }

    units.push({ unitId: uid, count: c, start: c,
                 atk: atk, def: def, hp: hp, olum: olum,
                 floor: 0, passive: false });
  });
  const ab = abilities || [];
  applyTroopBuffs(units, ab, label);
  return {
    abilities: ab,
    flow: flowOf(ab),
    label: label,
    units: units,
    hero: {
      atk: num(heroStats.attack, 0),
      def: num(heroStats.defense, 0),
      hp:  num(heroStats.maxHp, 0),
      maxHp: num(heroStats.maxHp, 0),
      ultiChance: num(heroStats.ultiChance, 0.15),
      ultiMul:    num(heroStats.ultiMultiplier, 1.8),
    },
    /* Komutanların sınıfları (HERO_CATEGORY). Kahramanın kendi
       saldırısı bu sınıfların hedef sırasını kullanır. Boşsa
       kahraman hasarı ön saf sırasıyla vurur. */
    heroCats: (heroSkins || []).map(id => HERO_CATEGORY[id]).filter(Boolean),
    dealtByUnit: {},      /* hangi birlik tipi ne kadar hasar verdi */
    abilityKills: {},     /* yetenek kaynaklı kayıplar */
    /* Kim kimi düşürdü — KESİN kayıt (tahmini dağıtım değil).
       Anahtar: vuran kaynağın adı (knight/soldier/robot/hero/reflect) */
    killsBy: {},
    /* Birim canını doldurmayan artık hasar, KAYNAK BAZINDA tutulur.
       Tek havuzda toplansaydı şövalyenin artığı robotun vuruşuna
       eklenir, hedef önceliği bozulurdu. */
    pendingBy: {},

    killed:  {},          /* kalıcı ölen */
    wounded: {},          /* hastaneye düşen */
    damageTaken: 0,
    damageDealt: 0,
  };
}
function armyTroopCount(a) { return a.units.reduce((s,u) => s + u.count, 0); }
/* Savaşan (pasifleşmemiş) birlik sayısı — bozgun ve güç hesapları buna bakar */
function armyActiveCount(a) { return a.units.reduce((s,u) => s + (u.passive ? 0 : u.count), 0); }
function armyAtk(a) { return a.units.reduce((s,u) => s + (u.passive ? 0 : u.atk*u.count), 0) + (a.hero.hp > 0 ? a.hero.atk : 0); }
function armyDef(a) { return a.units.reduce((s,u) => s + (u.passive ? 0 : u.def*u.count), 0) + (a.hero.hp > 0 ? a.hero.def : 0); }
function armyAlive(a) { return armyActiveCount(a) > 0 || a.hero.hp > 0; }

/* Bir kaynağın (vuran birlik tipinin) hedef sırası.
   "knight"/"soldier"/"robot" → TARGET_ORDER
   "hero:knight" gibi → o sınıfın sırası
   tanınmayan/sınıfsız → ön saf sırası */
function orderFor(srcKey) {
  const t = String(srcKey).split(":")[1] || String(srcKey);
  /* "knight3" gibi kademe kimlikleri kendi ailesinin sırasını kullanır */
  return TARGET_ORDER[AILE(t)] || TARGET_ORDER[t] || FRONT_ORDER;
}

/* Tek bir kaynağın hasarını hedef ordusuna uygula.
   Öncelikli hedefi biterse döngüde sıradaki tipe TAŞAR.
   taban: ordu bu birlik sayısına inince kırım durur (bozgun eşiği);
          artan hasar boşa gider — böylece eşik AŞILMAZ.            */
/* Vuranın ailesi: "knight3" → knight · "hero:robot" → robot */
function kaynakAilesi(srcKey) {
  const t = String(srcKey).split(":")[1] || String(srcKey);
  return AILE(t);
}
/* Üstünlük çemberi çarpanı (troops.js → CEMBER). Katman yoksa 1. */
function cemberCarp(srcKey, hedefAile) {
  try {
    if (typeof cemberCarpani === "function") return cemberCarpani(kaynakAilesi(srcKey), hedefAile);
  } catch (e) {}
  return 1;
}

function damageBySource(a, srcKey, dmg, taban, src) {
  if (dmg <= 0) return;
  a.damageTaken += dmg;
  a.pendingBy[srcKey] = (a.pendingBy[srcKey] || 0) + dmg;

  const sira = orderFor(srcKey);
  /* `sira` AİLE listesidir. Bir ailenin birden çok kademesi olabilir
     (Sv1 … Sv6); ön safta önce ALT kademeler kırılır. */
  for (const fam of sira) {
    if (a.pendingBy[srcKey] <= 0) break;            /* hasar tükendi */
    if (armyTroopCount(a) <= taban) break;          /* ordu bozguna uğradı */

    const grup = a.units
      .filter(x => AILE(x.unitId) === fam)
      .sort((p, q) => KADEME_NO(p.unitId) - KADEME_NO(q.unitId));
    if (!grup.length) continue;                     /* bu aile yok → sıradakine TAŞ */

    /*  ── ÜSTÜNLÜK ÇEMBERİ ──
        Hasarı çarpmak yerine birim canının MALİYETİNİ bölüyoruz:
        çarpan 1.20 ise aynı hasarla %20 fazla birlik düşer. Matematik
        aynı, ama hasar havuzu aileler arasında taşarken bozulmuyor —
        havuzu çarpsaydık sıradaki aileye şişmiş hasar geçerdi. */
    const carp = cemberCarp(srcKey, fam);

    let doldu = false;      /* tipte birlik var ama hasar yetmedi */

    for (const u of grup) {
      if (a.pendingBy[srcKey] <= 0) break;
      if (armyTroopCount(a) <= taban) break;
      if (u.passive || u.count <= u.floor) continue;  /* çekilmiş kademe → sıradakine TAŞ */

      const bedel = Math.max(1, Math.round(u.hp / carp));
      while (u.count > u.floor && a.pendingBy[srcKey] >= bedel && armyTroopCount(a) > taban) {
        a.pendingBy[srcKey] -= bedel;
        u.count--;
        const oldu = Math.random() < CFG.deathPct;
        if (oldu) a.killed[u.unitId]  = (a.killed[u.unitId]  || 0) + 1;
        else      a.wounded[u.unitId] = (a.wounded[u.unitId] || 0) + 1;
        /* kesin kayıt: bu düşüşü hangi kaynak yaptı */
        if (src) {
          const k = src.killsBy[srcKey] || (src.killsBy[srcKey] = { killed: 0, wounded: 0 });
          if (oldu) k.killed++; else k.wounded++;
        }
      }

      /* kademe kendi tabanına indi → GERİ ÇEKİLİR, hasar sıradakine taşar */
      if (u.count <= u.floor) { u.passive = true; continue; }
      doldu = true;   /* hâlâ birlik var ama hasar yetmedi → biriksin */
      break;
    }

    if (doldu) break;
  }

  /* bozguna uğradıysa biriken hasar boşa gider */
  if (armyTroopCount(a) <= taban) a.pendingBy[srcKey] = 0;

  /* birlik kalmadıysa (taban 0 ise mümkün) artan hasar komutana gider */
  if (armyTroopCount(a) === 0 && a.pendingBy[srcKey] > 0) {
    a.hero.hp = Math.max(0, a.hero.hp - a.pendingBy[srcKey]);
    a.pendingBy[srcKey] = 0;
  }
}

/* Mağaza güçlendirmelerini, savaş raporunun DETAYLAR ekranındaki
   kahraman yetenek listesiyle AYNI biçime çevirir. `sources.heroId`
   sayesinde her buff kendi kahramanının bloğuna düşer — ayrı başlık
   ya da "ekstra" etiketi yoktur, sıradan bir satır gibi görünür.
   `ikon`/`aciklama` doğrudan taşınır: ürünün kendi görseli ve mağaza
   açıklaması kullanılır, HERO_STATS'te aranmaz (orada yoklar). */
function magazaSatirlari(liste) {
  return (liste || []).map(b => ({
    type: "magaza_buff",
    title: b.ad,
    ikon: b.gorsel || "",
    aciklama: b.aciklama || "",
    aktif: !!b.aktif,
    sources: [{ heroId: b.heroId, heroName: b.heroName, title: b.ad }],
  }));
}

/* ═══════════════════════════════════════════════════════════════
   MAĞAZA BUFFLARININ AİLE BAZINDA UYGULANMASI
   ---------------------------------------------------------------
   Eskiden "Savunucu birlikler %200 hasar" gibi bir buff ordunun
   TAMAMININ hasarını çarpıyordu; oyuncu tek aile yazısını okuyup
   üç aileye birden etki alıyordu.

   VERİLEN hasar: toplamı çarpmak yerine kaynak PAYLARI çarpılır.
   Savunucu payı 0.20 iken ×3 buff varsa ağırlık 0.60 olur, toplam
   hasar da o oranda büyür. Diğer ailelerin hasarı DEĞİŞMEZ ve fazla
   hasar raporda Savunucu'ya yazılır.

   ALINAN hasar: "alınan hasar yarıya iner" = "can iki katına çıkar".
   Hasar tek sayı olduğu için aileye kısılamaz, ama can birim bazında
   tutulduğu için kısılabilir. O yüzden ilgili ailenin canı o tur
   geçici yükseltilir, tur bitince geri alınır. Sayı yalnız azaldığı
   için canı geri düşürmek ölmüş birliği DİRİLTMEZ.
   ═══════════════════════════════════════════════════════════════ */

/* paylar: { knight:0.2, "hero:soldier":0.05, ... } toplamı 1
   carpanlar: { knight:3, soldier:1, robot:1 }
   Dönen: { paylar (yeni, toplamı 1), olcek (toplam hasar çarpanı) } */
function buffPaylariCarp(paylar, carpanlar) {
  const keys = Object.keys(paylar || {});
  if (!keys.length) return { paylar: paylar, olcek: 1 };

  const agirlik = {};
  let top = 0;
  keys.forEach(k => {
    /* Kahramanın kendi vuruşu ("hero" / "hero:soldier") ve yansıma
       bir BİRLİĞİN hasarı değildir; birim buffu onlara işlemez.
       ("hero:soldier" yalnız hedef sırasını belirtir, aileyi değil.) */
    const s = String(k);
    const c = /^hero(:|$)/.test(s) ? 1
            : ((carpanlar && carpanlar[AILE(s)]) ? carpanlar[AILE(s)] : 1);
    const w = (paylar[k] || 0) * c;
    agirlik[k] = w;
    top += w;
  });
  if (top <= 0) return { paylar: paylar, olcek: 1 };

  const yeni = {};
  keys.forEach(k => yeni[k] = agirlik[k] / top);
  return { paylar: yeni, olcek: top };
}

/* Ailenin canını 1/oran kadar geçici yükselt. Geri almak için
   eski canları döndürür. */
function buffCanKalkani(birimler, oranlar) {
  if (!oranlar) return null;
  const geri = [];
  birimler.forEach(u => {
    const o = oranlar[AILE(u.unitId)];
    if (!o || o >= 1 || o <= 0) return;
    geri.push({ u: u, hp: u.hp });
    u.hp = Math.max(1, Math.round(u.hp / o));
  });
  return geri.length ? geri : null;
}
function buffCanGeriAl(geri) {
  if (!geri) return;
  geri.forEach(g => { g.u.hp = g.hp; });
}

/* Orduyu bozgun tabanına indirmek için EN FAZLA ne kadar hasar gerekir?
   Pahalı (canı yüksek) birlikten ucuza doğru sayarak ÜST SINIR verir.
   Üst sınır bilerek seçildi: az tahmin edilirse ordu tabana inmez ve
   savaşın sonucu değişir. Fazla tahmin yalnız dağıtımı biraz kabalaştırır. */
function gerekliHasar(a, taban) {
  const kalan = armyTroopCount(a) - taban;
  if (kalan <= 0) return 0;
  const grup = a.units
    .filter(u => !u.passive && u.count > u.floor)
    .map(u => ({ n: u.count - u.floor, hp: u.hp }))
    .sort((p, q) => q.hp - p.hp);
  let need = kalan, top = 0;
  for (const g of grup) {
    const al = Math.min(need, g.n);
    top += al * g.hp;
    need -= al;
    if (need <= 0) break;
  }
  return top;
}

/* Turun toplam hasarını, kaynak paylarına göre bölüp uygular.
   paylar: { "knight": 0.42, "hero:robot": 0.05, ... } — toplamı 1

   ── NEDEN DİLİM DİLİM? ──────────────────────────────────────────
   Eskiden her kaynağın payı TEK SEFERDE uygulanıyordu. Ezici
   savaşlarda ilk sıradaki kaynağın payı bile orduyu bozgun tabanına
   indirmeye yetiyor, sıradaki kaynaklar `armyTroopCount <= taban`
   kapısından hemen çıkıyordu. Sonuç: kırımın TAMAMI tek bir birliğe
   yazılıyor, diğer ikisi raporda "Öldürdü 0 / Yaraladı 0" görünüyordu.
   Sırayı karıştırmak yalnız kimin kazanacağını rastgeleleştirdi,
   dağıtmadı.

   Artık tabana inmek için gereken hasar önce ölçülüyor, o kadarı
   DİLİM tur halinde bütün kaynaklara sırayla dağıtılıyor. Ordu tabana
   inerken her kaynak payı oranında kırım yapmış oluyor.
   Toplam hasar ve savaşın sonucu DEĞİŞMEZ; yalnız kırımın kime
   yazıldığı düzelir.                                                */
const HASAR_DILIM = 12;

function damageArmy(a, dmg, paylar, taban, src) {
  if (dmg <= 0) return;
  const keys = Object.keys(paylar || {});
  if (!keys.length) { damageBySource(a, "reflect", dmg, taban, src); return; }

  /* Kaynak sırası her tur KARIŞTIRILIR — dilim içindeki sıra da
     yanlı olmasın diye. */
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = keys[i]; keys[i] = keys[j]; keys[j] = t;
  }

  /* Bu turda gerçekten işe yarayacak hasar. Fazlası zaten boşa gidiyor. */
  const etkin = Math.min(dmg, gerekliHasar(a, taban));

  if (etkin > 0) {
    for (let r = 0; r < HASAR_DILIM; r++) {
      if (armyTroopCount(a) <= taban) break;
      for (const k of keys) {
        const pay = (etkin * (paylar[k] || 0)) / HASAR_DILIM;
        if (pay > 0) damageBySource(a, k, pay, taban, src);
      }
    }
  }

  /* Artan hasar (tabana inildikten sonrası ya da birlik kalmayınca
     komutana taşan kısım) eski yolla, tek seferde uygulanır.
     yuvarlama artığı son kaynağa verilir → toplam hep tutar */
  const artan = dmg - etkin;
  if (artan > 0) {
    let kalan = artan;
    keys.forEach((k, i) => {
      const pay = (i === keys.length - 1) ? kalan : Math.round(artan * (paylar[k] || 0));
      kalan -= pay;
      damageBySource(a, k, Math.max(0, pay), taban, src);
    });
  }
}

/* Bu turda ne kadar hasar çıkacağını ve bu hasarın hangi kaynaktan
   ne kadarının geldiğini hesapla (henüz uygulamaz).
   Dönen: { dmg, paylar } — paylar toplamı 1'dir.                    */
/*  ── ÖLDÜRÜCÜLÜK ────────────────────────────────────────────────
    Ordunun AĞIRLIKLI ORTALAMA öldürücülüğü. Ağırlık, o birliğin
    saldırı payıdır: hasarı kim veriyorsa delme de ondan gelir.
    Karışık ordu (10k Sv1 + 3k Sv3) doğru sonucu ancak böyle verir.
    Kahramanın öldürücülüğü yoktur; payı ortalamayı SEYRELTİR —
    bu bilinçli, kahraman zaten ulti çarpanıyla ödüllendiriliyor.   */
function armyOlum(a) {
  const raw = armyAtk(a);
  if (raw <= 0) return 0;
  let top = 0;
  a.units.forEach(u => {
    if (u.passive) return;
    top += (u.olum || 0) * (u.atk * u.count);
  });
  return top / raw;
}

/*  Öldürücülük → rakip savunmasının yüzde kaçı yok sayılır (0–1).
    Hesap istatistik.js'te; katman yoksa motor kendi tavanını uygular
    ki iki yerde farklı sayı oluşmasın.                              */
function olumDelme(a) {
  const o = armyOlum(a);
  if (o <= 0) return 0;
  if (typeof ISTATISTIK !== "undefined" && ISTATISTIK && ISTATISTIK.olumCarpani) {
    return ISTATISTIK.olumCarpani(o) / 100;
  }
  return Math.min(75, o * 1.5) / 100;
}

function rollDamage(from, to) {
  const raw = armyAtk(from);
  if (raw <= 0) return { dmg: 0, paylar: {} };

  /* Savunma emilimi, saldıranın öldürücülüğü kadar delinir. */
  const delme = olumDelme(from);
  const soak  = armyDef(to) * CFG.defenseFactor * (1 - delme);

  let dmg = Math.max(raw * CFG.minDamagePct, raw - soak) * CFG.damageScale;
  dmg *= (1 - CFG.variance/2) + Math.random() * CFG.variance;
  if (from.hero.hp > 0 && Math.random() < from.hero.ultiChance) dmg *= from.hero.ultiMul;
  dmg = Math.max(1, Math.round(dmg));

  /* Raporda gösterilecek: öldürücülük bu turda ne kazandırdı? */
  if (delme > 0) {
    const soakTam = armyDef(to) * CFG.defenseFactor;
    from.olumFx = from.olumFx || { turlar: 0, delmeToplam: 0, kazanc: 0 };
    from.olumFx.turlar++;
    from.olumFx.delmeToplam += delme;
    from.olumFx.kazanc += Math.max(0, soakTam - soak) * CFG.damageScale;
  }

  /* Hasarın kaynak dağılımı: her birlik tipi kendi saldırı payı kadar.
     Bu pay, o tipin KENDİ hedef sırasıyla uygulanacak. */
  const paylar = {};
  from.units.forEach(u => {
    if (u.passive) return;                      /* çekilmiş tip vurmaz */
    const pay = (u.atk * u.count) / raw;
    if (pay > 0) {
      paylar[u.unitId] = (paylar[u.unitId] || 0) + pay;
      from.dealtByUnit[u.unitId] = (from.dealtByUnit[u.unitId] || 0) + dmg * pay;
    }
  });

  /* Kahramanın kendi saldırısı: komutan sınıflarına eşit bölünür.
     Komutan yoksa sınıfsız kaynak → ön saf sırasıyla vurur. */
  if (from.hero.hp > 0 && from.hero.atk > 0) {
    const hPay = from.hero.atk / raw;
    const cats = from.heroCats || [];
    if (cats.length) cats.forEach(c => { paylar["hero:" + c] = (paylar["hero:" + c] || 0) + hPay / cats.length; });
    else             paylar["hero"] = (paylar["hero"] || 0) + hPay;
  }
  return { dmg, paylar };
}

/* ═══════════════════════════════════════════════════════════════
   ÖLÜ / YARALI YENİDEN BÖLÜMÜ
   ---------------------------------------------------------------
   Savaş sırasında her düşüş anında `deathPct` ile zar atılıyor.
   Ama o an kimin kazanacağı HENÜZ BELLİ DEĞİL. Bu yüzden savaş
   bittikten sonra, toplam düşen sayısı sabit kalacak şekilde
   ölü/yaralı ayrımı yeniden yapılır.

   zarar gören ordu = `a`  ·  onu vuran ordu = `vuran`
   `vuran.killsBy` rapor içindir (kim kimi düşürdü); orada da aynı
   oranı uygulamazsak ekrandaki döküm toplamla tutmaz.
   ═══════════════════════════════════════════════════════════════ */
function olumOraniniAyarla(a, vuran, oran) {
  const ids = new Set([...Object.keys(a.killed || {}), ...Object.keys(a.wounded || {})]);
  ids.forEach(uid => {
    const dusen = (a.killed[uid] || 0) + (a.wounded[uid] || 0);
    if (dusen <= 0) { delete a.killed[uid]; delete a.wounded[uid]; return; }
    /* ±%4 dalgalanma: yoksa ölen ve yaralanan tam eşit çıkar
       (69.566 / 69.564 gibi) ve rapor uydurma gibi görünür. */
    const o = Math.min(0.95, Math.max(0.02, oran + (Math.random() - 0.5) * 0.08));
    const olen = Math.round(dusen * o);
    a.killed[uid]  = olen;
    a.wounded[uid] = dusen - olen;
  });
  if (vuran && vuran.killsBy) {
    Object.keys(vuran.killsBy).forEach(k => {
      const v = vuran.killsBy[k];
      const dusen = (v.killed || 0) + (v.wounded || 0);
      if (dusen <= 0) return;
      v.killed  = Math.round(dusen * oran);
      v.wounded = dusen - v.killed;
    });
  }
}

function pvpSimulate(attackerTroops, attackerHero, defender) {
  /* İKİ TARAFIN da komutan yetenekleri hesaba katılır */
  const atkSkins = (typeof selectedCommanders !== "undefined" && Array.isArray(selectedCommanders))
    ? selectedCommanders.filter(Boolean) : [];
  const defSkins = Array.isArray(defender.commanderSkins) ? defender.commanderSkins : [];
  /* ── MAĞAZA BUFFLARI (buff.js) ────────────────────────────────
     Hazırlanmış buffların şans zarları BURADA bir kez atılır;
     tur döngüsünde atılsaydı her tur yeniden denenirdi.
     buff.js yoksa hepsi sessizce atlanır — oyun eskisi gibi çalışır. */
  const BF = window.BUFF || null;
  if (BF) BF.savasBaslat();

  /* ── GÖLGE MANEVRASI (pasif) ──────────────────────────────────
     Çift yönlü: her iki tarafın pasifi de KARŞI tarafın yeteneğini
     kapatır. Zar savaş başında bir kez atılır, yetenekler
     hesaplanmadan ÖNCE — sonra yapılsaydı kapatılan yetenek statlara
     çoktan işlemiş olurdu. */
  const atkList = atkSkins.length ? atkSkins : [state.selectedHeroSkin];
  const engelA = yetenekEngeli(defSkins, atkList);   /* savunan → saldıranı kapatır */
  const engelD = yetenekEngeli(atkList, defSkins);   /* saldıran → savunanı kapatır */

  let abA = buffsOf(atkList, engelA.engelli);
  if (BF) abA = BF.yetenekleriBuyut(abA);          /* "Artan Aşk" gibi katlayıcılar */
  let abD = buffsOf(defSkins, engelD.engelli);
  if (BF) abD = abD.concat(BF.savunmaEk(defender.hazirBuff));  /* yalnız savunmada işleyenler */

  const A = makeArmy(attackerTroops, attackerHero, "attacker", abA,
                     atkSkins.length ? atkSkins : [state.selectedHeroSkin]);
  const D = makeArmy(defender.defTroops, {
    attack:  defender.hero.attack  * CFG.castleAtkBonus,
    defense: defender.hero.defense * CFG.castleDefBonus,
    maxHp:   defender.hero.maxHp   * CFG.castleHpBonus,
    ultiChance: defender.hero.ultiChance,
    ultiMultiplier: defender.hero.ultiMultiplier,
  }, "defender", abD, defSkins);

  /* Buff yüzdeleri (savunma/can/sayı) — TABAN hesabından ÖNCE.
     Sonra uygulansaydı çekilme eşiği eski sayıya göre kalırdı. */
  if (BF) BF.orduyaUygula(A.units);

  /* ── KAHRAMAN STAT BONUSLARI (gelistir.js) ────────────────────
     Seviyeye bağlı aile bonusları. buff.js ile AYNI noktada, taban
     hesabından ÖNCE uygulanır. gelistir.js yoksa sessizce atlanır. */
  if (typeof window.kahramanStatUygula === "function") {
    window.kahramanStatUygula(A.units, atkSkins.length ? atkSkins : [state.selectedHeroSkin]);
    window.kahramanStatUygula(D.units, defSkins, defender.commanderLevels || {});
  }

  /* ── STAT ÖZETİ (savaş raporu için) ───────────────────────────
     Bütün bonuslar (buff + kahraman) uygulandıktan SONRA, tur
     döngüsü BAŞLAMADAN alınır — savaş içinde stat değişiyor. */
  /* Motorun KENDİ fonksiyonlarıyla ölçülür (armyAtk/armyDef) —
     rapordaki sayı savaşta kullanılan sayının aynısı olsun diye.
     Ayrı bir toplama yazılırsa iki yer birbirinden ayrışır. */
  function _orduStat(ordu) {
    let hp = 0, olumPay = 0, agirlik = 0, sayi = 0;
    (ordu.units || []).forEach(u => {
      if (u.passive) return;
      const n = Math.max(0, u.count || 0);
      hp += (u.hp || 0) * n;
      olumPay += (u.olum || 0) * (u.atk || 0) * n;
      agirlik += (u.atk || 0) * n;
      sayi += n;
    });
    return {
      atk: Math.round(armyAtk(ordu)),
      def: Math.round(armyDef(ordu)),
      hp:  Math.round(hp + ((ordu.hero && ordu.hero.maxHp) || 0)),
      olum: agirlik > 0 ? Math.round(olumPay / agirlik * 100) / 100 : 0,
      sayi: sayi,
      /* BİRİM BAŞINA DÖKÜM — rapordaki tablo bunu okur.
         Değerler kahraman bonusları ve bufflar UYGULANDIKTAN sonra
         okunur, yani birimin savaşta kullandığı gerçek statıdır;
         bonusu ayrıca satır olarak göstermeye gerek yok. */
      /* BİRİM BAŞINA DÖKÜM — rapordaki yüzdeler bunu okur.
         `atk/def/hp/olum` = savaşta kullanılan GERÇEK stat (araştırma,
         buff, kahraman bonusu hepsi işlenmiş hâli).
         `t*` = troops.js'teki HAM taban. Rapor ikisini oranlayıp
         "+%kaç" üretir; böylece 3 askerle de 60 bin askerle de aynı
         yüzde çıkar — sayı ordu büyüklüğünden bağımsızdır. */
      birimler: (ordu.units || []).filter(u => (u.count || 0) > 0).map(u => {
        const d = UT()[u.unitId] || {};
        return {
          unitId: u.unitId,
          aile: AILE(u.unitId),
          ad: d.name || u.unitId,
          sayi: u.count,
          /* Rapor yüzdeyi bunlardan hesaplıyor — burada yuvarlanırsa
             küçük tabanlarda (saldırı 2) bonus kayboluyordu. */
          atk: Math.round((u.atk || 0) * 100) / 100,
          def: Math.round((u.def || 0) * 100) / 100,
          hp:  Math.round((u.hp || 0) * 100) / 100,
          olum: Math.round((u.olum || 0) * 100) / 100,
          tatk: d.attack || 0,
          tdef: d.defense || 0,
          thp:  d.hp || 0,
          tolum: d.olum || 0
        };
      })
    };
  }
  function _bonusSatir(skins, seviyeler) {
    if (typeof window.kahramanStatSatirlari !== "function") return [];
    const topla = {};
    /* Harita verildiyse eksik kahraman Sv1'dir; kendi seviyemize DÜŞME. */
    const dis = !!seviyeler;
    (skins || []).filter(Boolean).forEach(id => {
      const sv = dis ? (Math.floor(seviyeler[id]) || 1) : null;
      window.kahramanStatSatirlari(id, sv).forEach(x => {
        topla[x.ad] = (topla[x.ad] || 0) + x.yuzde;
      });
    });
    return Object.keys(topla).map(ad => ({ ad: ad, yuzde: topla[ad] }));
  }
  const _atkSkins = atkSkins.length ? atkSkins : [state.selectedHeroSkin];
  const _kendiSv  = (state.heroLevels && typeof state.heroLevels === "object") ? state.heroLevels : {};
  const _statOzet = {
    attacker: Object.assign(_orduStat(A), {
      bonus: _bonusSatir(_atkSkins, _kendiSv),
      seviyeler: _atkSkins.reduce((o, id) => { o[id] = Math.floor(_kendiSv[id] || 1); return o; }, {})
    }),
    defender: Object.assign(_orduStat(D), {
      bonus: _bonusSatir(defSkins, defender.commanderLevels || {}),
      seviyeler: defSkins.reduce((o, id) => {
        const m = defender.commanderLevels || {};
        o[id] = Math.floor(m[id] || 1); return o;
      }, {})
    })
  };

  /* ── Karşı tarafı zayıflatan yetenekler ── */
  function weaken(src, tgt) {
    const fl = src.flow;
    /* Savunma yıpratma İHTİMALLİ. Eskiden zar atılmıyordu; oyuncuya
       %75 yazan yetenek her savaşta tutuyordu. */
    if (fl.defShredPct && Math.random() * 100 < fl.defShredSans) {
      tgt.units.forEach(u => u.def = Math.max(0, Math.round(u.def * (1 - fl.defShredPct / 100))));
      fl.used.defShred = fl.defShredPct;
    }
    if (fl.enemyReducePct) {
      tgt.units.forEach(u => {
        u.atk = Math.max(1, Math.round(u.atk * (1 - fl.enemyReducePct / 100)));
        u.hp  = Math.max(1, Math.round(u.hp  * (1 - fl.enemyReducePct / 100)));
      });
    }
    /* Belirli bir AİLENİN canını azaltır — ihtimalli, savaş başında
       bir kez. Birlik SİLMEZ; sadece canı düşürür, kayıp savaşta
       normal yoldan oluşur (Yasak Büyüler). */
    if (fl.familyHp && Math.random() * 100 < fl.familyHp.sans) {
      const oran = 1 - fl.familyHp.pct / 100;
      tgt.units.forEach(u => {
        if (AILE(u.unitId) !== fl.familyHp.aile) return;
        u.hp = Math.max(1, Math.round(u.hp * oran));
      });
      fl.used.familyHp = fl.familyHp.pct;
    }

    /* savaş başında anlık kayıp */
    if (fl.instantPct) {
      tgt.units.forEach(u => {
        const yok = Math.floor(u.count * fl.instantPct / 100);
        if (yok > 0) {
          u.count = Math.max(0, u.count - yok);
          tgt.killed[u.unitId] = (tgt.killed[u.unitId] || 0) + yok;
          fl.used.instant += yok;
          src.abilityKills["enemy_instant_casualty"] =
            (src.abilityKills["enemy_instant_casualty"] || 0) + yok;
        }
      });
    }
  }
  /* Savunanın HİÇ birliği yoksa kale savunmasızdır: komutan da
     dövüşmez, saldırana hasar vermez. Böylece boş kaleyi yağmalarken
     hiç birlik kaybetmezsin (kolay hedef).
     DİKKAT — bu kontrol weaken()'DAN ÖNCE olmalı: savaş öncesi
     yetenekler (anlık kayıp / savunma yıpratma) tur döngüsünden
     bağımsız çalışır, sonra kapatılırsa çoktan vurmuş olur.
     Boş kale 6.8M'lik orduya %6 anlık kayıp yazdırmıştı (19 raporu). */
  const defenderHasTroops = D.units.reduce((s,u)=>s+u.count,0) > 0;
  if (!defenderHasTroops) { D.hero.atk = 0; D.hero.hp = 0; }

  weaken(A, D);
  /* savunanın yetenekleri yalnız birliği varsa işler */
  if (defenderHasTroops) weaken(D, A);

  /* savunanın birlik statlarına kale bonusu */
  D.units.forEach(u => { u.def = Math.round(u.def * CFG.castleDefBonus); u.hp = Math.max(1, Math.round(u.hp * CFG.castleHpBonus)); });

  /* ── TİP TABANI ───────────────────────────────────────────────
     Her birlik türü kendi başlangıç sayısının %typeFloorPct'ine
     inince geri çekilir (pasifleşir). Kale bonusu ve savaş öncesi
     yetenek kayıpları uygulandıktan SONRA hesaplanır. */
  [A, D].forEach(ord => ord.units.forEach(u => {
    u.floor = Math.floor(u.start * CFG.typeFloorPct);
  }));

  /* ── BOZGUN TABANI ────────────────────────────────────────────
     Savaşa girilen birlik sayısının %routPct'i. Ordu bu sayıya
     inince dağılır ve savaş biter; kalanlar sağ kurtulur.
     Hiç birliği olmayan taraf için taban 0'dır (eski davranış). */
  function routFloor(a) {
    const bas = a.units.reduce((s, u) => s + u.start, 0);
    return bas > 0 ? Math.floor(bas * CFG.routPct) : 0;
  }
  /* Bozgun: toplam birlik tabana indiyse YA DA savaşacak (pasifleşmemiş)
     birlik kalmadıysa. İkincisi olmazsa, tüm türleri çekilmiş bir ordu
     hiç hasar vermeden tur sınırına kadar ayakta kalırdı. */
  function routed(a, taban) {
    if (a.units.reduce((s, u) => s + u.start, 0) <= 0) return false;
    return armyTroopCount(a) <= taban || armyActiveCount(a) <= 0;
  }
  const tabanA = routFloor(A), tabanD = routFloor(D);

  /* EŞ ZAMANLI tur: iki taraf da tur başındaki güce göre vurur.
     Böylece saldıran taraf "önce vurma" avantajı kazanmaz. */
  let turn = 0;
  /* dondurma: rakip ilk N tur vuramaz */
  let freezeD = A.flow.freezeTurns, freezeA = D.flow.freezeTurns;
  if (freezeD) A.flow.used.freeze = freezeD;
  if (freezeA) D.flow.used.freeze = freezeA;

  while (turn < CFG.maxTurns && armyAlive(A) && armyAlive(D)
         && !routed(A, tabanA) && !routed(D, tabanD)) {
    turn++;

    /* periyodik savunma kırma — her 3 turda bir */
    if (A.flow.periodicPct && turn % 3 === 0) {
      D.units.forEach(u => u.def = Math.max(0, Math.round(u.def * (1 - A.flow.periodicPct / 100))));
      A.flow.used.periodic++;
    }
    if (D.flow.periodicPct && turn % 3 === 0) {
      A.units.forEach(u => u.def = Math.max(0, Math.round(u.def * (1 - D.flow.periodicPct / 100))));
      D.flow.used.periodic++;
    }

    const rollA = rollDamage(A, D), rollD = rollDamage(D, A);
    let dmgAtoD = rollA.dmg, dmgDtoA = rollD.dmg;

    if (freezeD > 0) { dmgDtoA = 0; freezeD--; }
    if (freezeA > 0) { dmgAtoD = 0; freezeA--; }

    /* ── MAĞAZA BUFFLARI: tur bazlı çarpanlar ──
       Artık her buff YALNIZ kendi ailesine işler (magaza.js'teki
       `effect.birim`). Verilen hasar tarafında toplam hasarı çarpmak
       yerine KAYNAK PAYLARI çarpılır (bkz. buffPaylariCarp) — böylece
       fazla hasar gerçekten o aileden çıkar, raporda da ona yazılır. */
    if (BF && BF.hasarCarpanlari) {
      const mc = BF.hasarCarpanlari(turn);
      if (mc) {
        const r = buffPaylariCarp(rollA.paylar, mc);
        if (r.olcek !== 1) {
          dmgAtoD = Math.max(1, Math.round(dmgAtoD * r.olcek));
          rollA.paylar = r.paylar;
        }
      }
    }

    /* güç farkı kalkanı: çok güçlü rakipten alınan hasarı azaltır */
    if (A.flow.gapCapPct && armyAtk(D) > armyAtk(A) * 1.5) {
      dmgDtoA = Math.round(dmgDtoA * (1 - A.flow.gapCapPct / 100));
      A.flow.used.gapCap++;
    }
    if (D.flow.gapCapPct && armyAtk(A) > armyAtk(D) * 1.5) {
      dmgAtoD = Math.round(dmgAtoD * (1 - D.flow.gapCapPct / 100));
      D.flow.used.gapCap++;
    }

    /* hasar yansıtma */
    let yansiAtoD = 0, yansiDtoA = 0;
    if (A.flow.reflectPct && dmgDtoA > 0) {
      yansiAtoD = Math.round(dmgDtoA * A.flow.reflectPct / 100);
      A.flow.used.reflect += yansiAtoD;
    }
    if (D.flow.reflectPct && dmgAtoD > 0) {
      yansiDtoA = Math.round(dmgAtoD * D.flow.reflectPct / 100);
      D.flow.used.reflect += yansiDtoA;
    }

    /* Normal hasar kaynak paylarıyla, yansıyan hasar ayrı kaynak
       olarak (yansıma bir birliğin vuruşu değildir) uygulanır. */
    A.damageDealt += dmgAtoD + yansiAtoD;
    damageArmy(D, dmgAtoD, rollA.paylar, tabanD, A);
    if (yansiAtoD > 0) damageBySource(D, "reflect", yansiAtoD, tabanD, A);

    /* ALINAN hasar buffu: yalnız hedef ailenin canı bu tur boyunca
       geçici yükselir (bkz. buffCanKalkani). Saldıranın buffudur,
       bu yüzden yalnız A tarafına uygulanır. */
    const kalkan = (BF && BF.alinanCarpanlari)
      ? buffCanKalkani(A.units, BF.alinanCarpanlari(turn)) : null;

    D.damageDealt += dmgDtoA + yansiDtoA;
    damageArmy(A, dmgDtoA, rollD.paylar, tabanA, D);
    if (yansiDtoA > 0) damageBySource(A, "reflect", yansiDtoA, tabanA, D);

    buffCanGeriAl(kalkan);
  }

  /* Kazanan: bozguna uğrayan (ya da tükenen) taraf kaybeder.
     İkisi de aynı turda dağıldıysa kalan ORANI yüksek olan kazanır;
     tam eşitlikte SAVUNAN kazanır (ra > rd testi bunu sağlar). */
  const bittiA = routed(A, tabanA) || !armyAlive(A);
  const bittiD = routed(D, tabanD) || !armyAlive(D);
  let win;
  if (bittiD && !bittiA)       win = true;
  else if (bittiA && !bittiD)  win = false;
  else {
    const ra = armyTroopCount(A) / Math.max(1, A.units.reduce((s,u)=>s+u.start,0));
    const rd = armyTroopCount(D) / Math.max(1, D.units.reduce((s,u)=>s+u.start,0));
    win = ra > rd;
  }

  /* ── Kazanan belli oldu: ölü/yaralı ayrımını şimdi yap ──
     A = saldıran, D = savunan. A'nın kayıplarını D vurdu, tersi de öyle. */
  olumOraniniAyarla(A, D, win ? CFG.kazananOlumPct : CFG.kaybedenOlumPct);
  olumOraniniAyarla(D, A, win ? CFG.kaybedenOlumPct : CFG.kazananOlumPct);

  /* Rakip kayıplarının dökümü — artık TAHMİN DEĞİL, kesin kayıt.
     damageBySource her düşüşü hangi kaynağın yaptığını yazdı.
     Kahraman ve yansıma kaynaklı düşüşler bir birliğin vuruşu
     olmadığı için, birliklerin verdiği hasar oranında paylaştırılır
     (rapor üç satır halinde gösteriliyor, dördüncü satır yok). */
  function attribute(src) {
    const cikti = {};
    src.units.forEach(u => { cikti[u.unitId] = { killed: 0, wounded: 0 }; });
    const ids = Object.keys(cikti);
    if (!ids.length) return cikti;

    let ekO = 0, ekY = 0;   /* birliğe ait olmayan (kahraman/yansıma) düşüşler */
    Object.keys(src.killsBy).forEach(k => {
      const v = src.killsBy[k];
      if (cikti[k]) { cikti[k].killed += v.killed; cikti[k].wounded += v.wounded; }
      else          { ekO += v.killed;             ekY += v.wounded; }
    });

    if (ekO > 0 || ekY > 0) {
      const toplam = ids.reduce((n, uid) => n + (src.dealtByUnit[uid] || 0), 0);
      let kalanO = ekO, kalanY = ekY;
      ids.forEach((uid, i) => {
        if (i === ids.length - 1) { cikti[uid].killed += kalanO; cikti[uid].wounded += kalanY; return; }
        const pay = toplam > 0 ? (src.dealtByUnit[uid] || 0) / toplam : 1 / ids.length;
        const k = Math.min(Math.round(ekO * pay), kalanO);
        const y = Math.min(Math.round(ekY * pay), kalanY);
        cikti[uid].killed += k;  kalanO -= k;
        cikti[uid].wounded += y; kalanY -= y;
      });
    }
    return cikti;
  }

  /* "Paralı Muhafız" savaşa gerçekte olmayan birlik katar; o
     hayaletler ölünce envanterden düşülmemeli. Kayıp, savaşa
     GERÇEKTEN götürülen sayıyla sınırlanır. Sonra buff tükenir —
     tek kullanımlık olduğu için savaşın çözüldüğü yerde biter
     (panelden de seferden de aynı yol geçilir). */
  /* Rapor satırları savasBitti()'DEN ÖNCE alınmalı: o çağrı planı
     siler (_plan = null) ve raporSatirlari() boş döner. */
  const magazaA = magazaSatirlari(BF ? BF.raporSatirlari() : []);
  const magazaD = magazaSatirlari(BF ? BF.savunmaRapor(defender.hazirBuff) : []);

  if (BF) {
    BF.kayipKirp(A.killed, A.wounded, attackerTroops);
    BF.savasBitti();
  }

  const attribA = attribute(A);
  const attribD = attribute(D);

  return {
    attackerTroopsUsed: Object.assign({}, attackerTroops || {}),
    attackerAttribution: attribA,
    defenderAttribution: attribD,
    heroFx: {
      attacker: A.flow.used, defender: D.flow.used,
      attackerKills: A.abilityKills, defenderKills: D.abilityKills,
      /* Engel satırı, engeli YAPAN tarafa yazılır: engelD saldıranın
         pasifidir (savunanı kapattı), engelA savunanın pasifidir. */
      attackerAbilities: (A.abilities || []).map(x => ({ type: x.type, title: x.title, sources: x.sources })).concat(magazaA).concat(engelD.satirlar),
      defenderAbilities: (D.abilities || []).map(x => ({ type: x.type, title: x.title, sources: x.sources })).concat(magazaD).concat(engelA.satirlar)
    },
    win, turns: turn,
    statlar: _statOzet,
    attacker: {
      killed: A.killed, wounded: A.wounded,
      remaining: armyTroopCount(A),
      damageDealt: A.damageDealt, damageTaken: Math.round(A.damageTaken),
      heroHp: Math.round(A.hero.hp), heroMaxHp: Math.round(A.hero.maxHp),
    },
    defender: {
      killed: D.killed, wounded: D.wounded,
      remaining: armyTroopCount(D),
      damageDealt: D.damageDealt, damageTaken: Math.round(D.damageTaken),
      heroHp: Math.round(D.hero.hp), heroMaxHp: Math.round(D.hero.maxHp),
    },
  };
}

/* {knight:3} → hastane formatı [{severe:true}, ...] */
/* Yaralı listesi → hastane biçimi.
   ── DİKKAT ──
   Eskiden her yaralı için AYRI nesne üretiyordu. 70.000 yaralıda
   70.000 nesne demek; bu liste hem hastaneye hem savaş günlüğüne
   yazıldığı için localStorage kotasını patlatıyor ve kayıt sessizce
   düşüyordu ("telefon deposu dolu olabilir"). Artık SAYI döner.
   `severe` alanı zaten hiçbir yerde okunmuyordu, kaldırıldı.        */
function toHospitalFormat(countMap) {
  const out = {};
  Object.keys(countMap || {}).forEach(uid => {
    const n = Math.max(0, Math.round(countMap[uid] || 0));
    if (n > 0) out[uid] = n;
  });
  return out;
}
function sumMap(m) { return Object.values(m || {}).reduce((a,b) => a + b, 0); }
function lossText(killed, wounded) {
  const ids = [...new Set([...Object.keys(killed||{}), ...Object.keys(wounded||{})])];
  if (!ids.length) return `<div class="pvp-loss-row"><span style="color:#7fe3a6;">Kayıp yok 🎉</span></div>`;
  return ids.map(uid => {
    const k = (killed||{})[uid] || 0, w = (wounded||{})[uid] || 0;
    return `<div class="pvp-loss-row"><span>${unitLabel(uid)}</span>
      <span><b class="col-red">☠️${k}</b> &nbsp; <b class="col-yellow">🏥${w}</b></span></div>`;
  }).join("");
}

/* ═══════════════════════════════════════════════════════════════
   7) SAVAŞI BAŞLAT
   ═══════════════════════════════════════════════════════════════ */
function beginPvpBattle(defender) {
  if (!defender) { toast("Bu oyuncunun bilgisi alınamadı."); return; }
  if (typeof applyStaminaRegen === "function") applyStaminaRegen();
  if (state.stamina && state.stamina.current <= 0) { toast("Genel canın bitti, saldıramazsın."); return; }

  /* Savaşa girmeden ÖNCE rakibin en güncel ordusunu buluttan çek —
     böylece başkası onu daha önce vurduysa gerçek kalan orduyla
     savaşırsın (eski localStorage verisiyle değil). */
  if (fbOK() && defender.accKey) {
    firebaseDb.ref("accounts/" + defender.accKey).get()
      .then(snap => {
        if (snap.exists()) {
          const fresh = buildDefender(snap.val(), defender.name);
          _enterBattleWith(fresh);
        } else {
          _enterBattleWith(defender);
        }
      })
      .catch(() => _enterBattleWith(defender));
  } else {
    _enterBattleWith(defender);
  }
}

function _enterBattleWith(defender) {
  if (typeof selectEnemyFromMap === "function") selectEnemyFromMap(defender);
  const log = document.getElementById("battleLog");
  if (log) log.innerHTML = "";
  /* Düğme yazısına DOKUNULMAZ. Eskiden bir salise "⚔️ Orduyla Saldır"
     yazıp hemen "SAVAŞ"a dönüyordu; göze çarpan bir titremeydi. */
}

function hookBattleButton() {
  const btn = document.getElementById("battleBtn");
  if (!btn || btn.dataset.pvpHooked) return;
  btn.dataset.pvpHooked = "1";
  const fire = function (e) {
    if (typeof currentEnemy === "object" && currentEnemy && currentEnemy.isPlayer) {
      e.stopImmediatePropagation(); e.preventDefault();
      runPvpBattle();
    }
  };
  btn.addEventListener("pointerup", fire, true);
  btn.addEventListener("click",     fire, true);
}

let _running = false;
async function runPvpBattle() {
  if (_running) return;
  const btn = document.getElementById("battleBtn");
  const log = document.getElementById("battleLog");
  const enemy = currentEnemy;
  if (!enemy || !enemy.isPlayer) return;

  if (typeof applyStaminaRegen === "function") applyStaminaRegen();
  if (state.stamina && state.stamina.current <= 0) {
    log.innerHTML = `<span class="col-red">Bitkin düştün, savaşacak gücün yok.</span>`; return;
  }
  const cd = cooldownLeft(enemy.name);
  if (cd > 0) { toast(`${fmtLeft(cd)} sonra tekrar saldırabilirsin.`); return; }

  /* seçilen birlikler */
  const sel = {};
  let selTotal = 0;
  /*  KÖK HATA (düzeltildi): burada FRONT_ORDER geziliyordu; o dizi
      yalnız Sv1 kimliklerini (knight/soldier/robot) tutar. Oyuncu
      Süvari ya da Savaş Fili seçse bile savaşa GİRMEDEN eleniyordu —
      ne dövüşüyor, ne rapora giriyor, ne de statı sayılıyordu.
      SAF_SIRASI() 18 birliğin tamamını aile ve kademe sırasıyla verir. */
  SAF_SIRASI().forEach(uid => {
    const n = Math.min(num((selectedTroopsForBattle||{})[uid], 0), num((state.troops||{})[uid], 0));
    sel[uid] = Math.max(0, Math.floor(n)); selTotal += sel[uid];
  });
  if (selTotal <= 0) { toast("Yanına en az 1 birlik almalısın!"); return; }

  _running = true;
  btn.disabled = true;
  log.innerHTML = "";
  /* Bekleme/sarsıntı kaldırıldı: saldırı anında çözülür. */

  const myHero = (typeof state.hero === "object") ? state.hero : {};
  const R = pvpSimulate(sel, myHero, enemy);
  /* yetenek tetiklenme sayaçları — savaş raporunda gösterilir */
  const heroFx = R.heroFx || null;

  /* ── KENDİ KAYIPLARIN ── */
  const myKilled = R.attacker.killed, myWounded = R.attacker.wounded;
  Object.keys(myKilled).forEach(uid  => state.troops[uid] = Math.max(0,(state.troops[uid]||0) - myKilled[uid]));
  Object.keys(myWounded).forEach(uid => state.troops[uid] = Math.max(0,(state.troops[uid]||0) - myWounded[uid]));
  if (typeof sendWoundedToHospital === "function") sendWoundedToHospital(toHospitalFormat(myWounded));

  /* Kayıpları dışarı bildir. sefer.js bunu okuyup dönen ordunun
     mevcudunu KESİN hesaplar. Savaş akışına etkisi yok. */
  if (window.PVP) window.PVP.sonSonuc = {
    killed:  Object.assign({}, myKilled),
    wounded: Object.assign({}, myWounded),
    at: Date.now()
  };

  /* genel can */
  const drain = (typeof STAMINA_DRAIN_RATIO !== "undefined") ? STAMINA_DRAIN_RATIO : 0.35;
  const hpLost = Math.max(0, R.attacker.heroMaxHp - R.attacker.heroHp);
  state.stamina.current = Math.max(0, state.stamina.current - Math.max(2, Math.round(hpLost * drain / 10)));

  /* ── GANİMET ──
     Elmas artık el değiştirmiyor; alan yalnız eski kayıtlarla
     uyum için 0 olarak taşınıyor. */
  const delta = 0;

  /* Yağmayı TAŞIYACAK ordu: gönderilenden ölen ve yaralı düşülür.
     Yaralılar hastaneye gittiği için yük taşımaz. */
  const saglamOrdu = {};
  Object.keys(sel).forEach(uid => {
    const n = Math.max(0, num(sel[uid], 0) - num(myKilled[uid], 0) - num(myWounded[uid], 0));
    if (n > 0) saglamOrdu[uid] = n;
  });

  pvpState().pvpCooldowns[enemy.name.toLowerCase()] = Date.now();

  /* ── SAVUNANIN HESABI + GANİMET ──
     Kaynak savunanın kaydından transaction içinde düşülür ve
     GERÇEKTEN alınan miktar geri döner. Rapora yazılacağı için
     günlük kaydından ÖNCE beklenir. */
  let ganimet = {};
  try {
    ganimet = await sendRaidReport(enemy, R, saglamOrdu) || {};
  } catch (e) {
    console.warn("[pvp] ganimet/rapor:", e);
  }

  /* Yük kaleye SEFERLE gelir: sefer.js dönüş kaydını yazarken bunu
     okuyup `yuk` alanına koyar, ordu kaleye varınca depoya girer.
     Burada state.kaynaklar'a EKLENMEZ — yoksa ordu daha yoldayken
     kaynak kalede belirirdi. */
  if (window.PVP) window.PVP.sonGanimet = Object.keys(ganimet).length
    ? { alinan: ganimet, at: Date.now() } : null;

  /* ── PANELE RAPOR YAZILMIYOR ──────────────────────────────────
     Sonuç savaş panelinde gösterilmiyor; kısa bir "sonuç" toast'u
     çıkıp panel 3 saniye sonra otomatik kapanıyor. Ayrıntılı rapor
     savaş günlüğüne (mesaj kutusu) düşüyor; oradan isteğe bağlı
     eyalet sohbetinde paylaşılabiliyor. */
  log.innerHTML = "";   /* panelde/toast'ta sonuç YOK — sadece savaş günlüğü + mektup */

  /* paylaşım için gereken TÜM detayları günlüğe göm */
  const myCommanders  = (typeof selectedCommanders !== "undefined" ? selectedCommanders : [])
                          .map(id => (typeof HERO_STATS !== "undefined" && HERO_STATS[id]) ? HERO_STATS[id].name : id)
                          .filter(Boolean);
  const enemyCommanders = (enemy.commanderNames || []);

  /* ── GÜNLÜK (mesaj kutusu) ── */
  state.battleLogHistory.unshift({
    enemyName: "🏰 " + enemy.name, win: R.win, diamondDelta: delta, turns: R.turns,
    ganimet: ganimet,
    dmgDealt: R.attacker.damageDealt, dmgAbsorbed: 0, dmgTaken: R.attacker.damageTaken,
    heroHpFinal: R.attacker.heroHp, heroMaxHp: R.attacker.heroMaxHp,
    troopsWoundedByUnit: toHospitalFormat(myWounded),
    timestamp: Date.now(), pvp: true,
    /* paylaşım detayları */
    role: "attacker",
    myName: currentUsername || "Ben",
    enemyPlainName: enemy.name,
    myCommanders: myCommanders,
    enemyCommanders: enemyCommanders,
    statlar: R.statlar || null,
    myLosses: { killed: myKilled, wounded: myWounded },
    myAttribution: R.attackerAttribution || null,
    enemyAttribution: R.defenderAttribution || null,
    heroFx: R.heroFx || null,
    enemyLosses: { killed: R.defender.killed, wounded: R.defender.wounded },
    usedTroops: Object.assign({}, sel),
    enemyTroops: Object.assign({}, enemy.realTroops || enemy.troops || {}),
  });
  if (typeof gunlugüKirp === "function") gunlugüKirp();
  else if (state.battleLogHistory.length > 70) state.battleLogHistory.length = 70;

  /* Rakibe bildirim + savunanın kaydı YUKARIDA gönderildi
     (ganimet günlüğe yazılabilsin diye). */

  ["renderBattleLogPanel","renderHospitalPanel","renderTroopsPanel",
   "renderDiamonds","updateShopButtons","renderStamina","persistCurrentState"]
    .forEach(f => { if (typeof window[f] === "function") window[f](); });

  _running = false;
  btn.disabled = (state.stamina.current <= 0);
  /* kazan-kaybet fark etmez: panel hemen kapanır, sonuç mesaj kutusunda */
  if (typeof backToMap === "function") backToMap();
}

/* savunanın kaybı: robot çarpanı sahte olduğu için gerçek envanteri aşmasın */
function clampToReal(map, realTroops) {
  const out = {};
  Object.keys(map || {}).forEach(uid => {
    out[uid] = Math.min(map[uid], Math.max(0, num(realTroops[uid], 0)));
  });
  return out;
}


/* Firebase "undefined" değer kabul etmez; içinde bir tane bile olsa
   gönderimin tamamını reddeder ve SENKRON hata fırlatır (catch'e düşmez).
   Bu yüzden gönderilecek veri önce temizlenir. */
function temizVeri(x) {
  if (x === undefined || x === null) return null;
  if (Array.isArray(x)) return x.map(temizVeri).filter(v => v !== null);
  if (typeof x === "number") return isFinite(x) ? x : 0;
  if (typeof x === "object") {
    const o = {};
    Object.keys(x).forEach(k => {
      const v = temizVeri(x[k]);
      if (v !== null) o[k] = v;
    });
    return Object.keys(o).length ? o : null;
  }
  return x;
}

/* Savunanın kaydını günceller VE zaferde ganimeti düşer.
   Dönüş: gerçekten alınan kaynak { odun: n, ... } — hiçbir şey
   alınamadıysa boş nesne. `saglamOrdu` yağmayı taşıyacak ordudur. */
async function sendRaidReport(enemy, R, saglamOrdu) {
  if (!fbOK()) return {};
  /* Kendi kalene saldırırsan hem saldıran hem savunan sen olursun ve
     savaş günlüğüne iki kayıt düşer. Kendine bildirim gönderme. */
  const _hedef = enemy.accKey || fbKey(enemy.name);
  if (_hedef && _hedef === myKey()) {
    console.warn("[pvp] kendi kalene saldırı — savunma raporu gönderilmedi");
    return {};
  }
  /* robot çarpanı yüzünden fazla kayıp yazılmasın */
  const real = Object.assign({}, enemy.realTroops);
  const killed = clampToReal(R.defender.killed, real);
  SAF_SIRASI().forEach(u => real[u] = Math.max(0, num(real[u],0) - num(killed[u],0)));
  const wounded = clampToReal(R.defender.wounded, real);

  const totalLost = sumMap(killed) + sumMap(wounded);
  const key = enemy.accKey || fbKey(enemy.name);

  /* ── YAĞMA KAPASİTESİ ──
     Sayılar dugum.js'te (YAGMA_KAPASITE); buraya GÖMÜLMEZ. */
  const yagmaKap = (R.win && window.DUGUM && typeof DUGUM.yagmaKapasitesi === "function")
                     ? Math.max(0, Math.floor(DUGUM.yagmaKapasitesi(saglamOrdu || {})))
                     : 0;
  const kaynakIdler = (window.DUGUM && Array.isArray(DUGUM.KAYNAK_IDLER))
                        ? DUGUM.KAYNAK_IDLER
                        : ["odun", "et", "demir", "su", "enerji"];
  /* Transaction birden çok kez koşabilir (aynı anda başka saldırı
     varsa Firebase baştan çalıştırır). Her koşuda yeniden yazılır,
     GEÇERLİ OLAN son koşudur — bu yüzden dışarıda tutulur. */
  let alinan = {};

  /* ── 1) SAVUNANIN KAYDINI DOĞRUDAN GÜNCELLE ──────────────────
     Savunan çevrimdışı olsa bile elması ve birlikleri gerçekten
     azalsın diye accounts/{key}/state üzerinde transaction çalıştırıyoruz.
     Transaction, aynı anda birden çok saldırı gelse bile veriyi
     tutarlı tutar (herkes en güncel değeri okuyup yazar). */
  const _islem = firebaseDb.ref("accounts/" + key + "/state").transaction(function (st) {
    if (!st) return st;   /* hesap yoksa dokunma */

    /* ── GANİMET: SAVUNANIN DEPOSU ──
       Elmasa DOKUNULMAZ. Her kaynaktan en çok CFG.yagmaPay kadarı
       yağmalanabilir; toplam bu tavanı aşarsa ordunun kapasitesi
       beş kaynağa ORANTILI dağıtılır (biri boşsa payı diğerlerine
       gitmez, o kaynak zaten yoktur). */
    alinan = {};
    if (R.win && yagmaKap > 0) {
      if (!st.kaynaklar || typeof st.kaynaklar !== "object") st.kaynaklar = {};
      const ust = {};
      let havuz = 0;
      kaynakIdler.forEach(k => {
        const eldeki = Math.max(0, Math.floor(num(st.kaynaklar[k], 0)));
        const tavan = Math.floor(eldeki * CFG.yagmaPay);
        if (tavan > 0) { ust[k] = tavan; havuz += tavan; }
      });
      if (havuz > 0) {
        const oran = Math.min(1, yagmaKap / havuz);
        Object.keys(ust).forEach(k => {
          const m = Math.floor(ust[k] * oran);
          if (m <= 0) return;
          alinan[k] = m;
          st.kaynaklar[k] = Math.max(0, Math.floor(num(st.kaynaklar[k], 0)) - m);
        });
      }
    }

    if (!st.troops) st.troops = {};
    SAF_SIRASI().forEach(uid => {
      const gone = num(killed[uid], 0) + num(wounded[uid], 0);
      if (gone > 0) st.troops[uid] = Math.max(0, num(st.troops[uid], 0) - gone);
    }, function (err, committed) {
    if (err) pvpUyar("Savunanın hesabı güncellenemedi: " + (err.message || err));
    else if (!committed) pvpUyar("Savunanın hesabı bulunamadı, kayıp işlenmedi.");
  });

    /* Savunmada işleyen mağaza buffu TEK KULLANIMLIKTIR: savunma
       gerçekleştiği için burada düşülür. Savunan çevrimdışıyken
       kendi istemcisi bunu yapamaz. (Bilinen sınır: savunan aynı
       anda oyundaysa kendi kaydını komple üstüne yazıp buffu geri
       getirebilir — bkz. Tuzak 19.) */
    if (Array.isArray(st.hazirBuff) && st.hazirBuff.length && window.BUFF) {
      const kalanBuff = st.hazirBuff.filter(ad => !window.BUFF.savunmaEk([ad]).length);
      if (kalanBuff.length !== st.hazirBuff.length) st.hazirBuff = kalanBuff;
    }

    /* yaralıları savunanın hastanesine ekle (girince iyileşsinler).
       GRUPLU kayıt: her yaralı için ayrı satır açılırsa 70.000 yaralıda
       70.000 satır olur, savunanın kaydı diske yazılamaz ve saldırı
       sonucu sessizce kaybolur. Satır başına `adet` tutulur. */
    if (totalLost > 0 && sumMap(wounded) > 0) {
      if (!Array.isArray(st.hospital)) st.hospital = [];
      SAF_SIRASI().forEach(uid => {
        const n = Math.max(0, Math.round(num(wounded[uid], 0)));
        if (n <= 0) return;
        const d = UT()[uid];
        const recMs = d ? Math.round(d.trainMinutes * 60 * 1000 / 3) : 10 * 60 * 1000;
        st.hospital.push({
          unitId: uid,
          adet: n,
          recoveryMs: recMs,
          finishAt: Date.now() + recMs,
          confirmed: true,     /* saldırıdan gelen yaralı otomatik tedaviye alınır */
          fromRaid: true,
        });
      });
    }
    return st;
  });

  /* GANİMET YAZILMADAN VERİLMEZ.
     Transaction beklenir: commit edilmediyse savunan hiçbir şey
     kaybetmemiştir, saldıran da yük getirmemeli. Yoksa kaynak
     yoktan var olurdu. */
  try {
    const sonuc = await _islem;
    if (!sonuc || !sonuc.committed) alinan = {};
  } catch (e) {
    console.warn("[pvp] savunan kaydı güncellenemedi:", e);
    alinan = {};
  }

  /* ── 2) BİLDİRİM KUTUSU ──────────────────────────────────────
     Artık veriyi DÜŞÜRMEK için değil, yalnızca savunan oyuna
     girince "saldırıya uğradın" mesajını göstermek için. */
  /* Savunanın raporu boş kalmasın: saldırının TÜM ayrıntısı gönderilir */
  const atkCmd = (typeof selectedCommanders !== "undefined" ? selectedCommanders : [])
    .map(id => (typeof HERO_STATS !== "undefined" && HERO_STATS[id]) ? HERO_STATS[id].name : null)
    .filter(Boolean);

  const bildirim = temizVeri({
    from: currentUsername || "Bilinmeyen",
    at: Date.now(),
    attackerWon: !!R.win,
    diamondsLost: 0,          /* elmas artık el değiştirmiyor */
    ganimet: alinan,          /* savunanın kaybettiği kaynak */
    turns: R.turns,
    troopsLost: totalLost,
    applied: true,        /* kayıp zaten işlendi — inbox tekrar düşürmeyecek */

    /* ── rapor ayrıntıları ── */
    atkCommanders: atkCmd,
    defCommanders: (enemy.commanderNames || []),
    atkTroops:     R.attackerTroopsUsed || null,
    defTroops:     enemy.realTroops || null,
    atkLosses:     { killed: R.attacker.killed, wounded: R.attacker.wounded },
    defLosses:     { killed: killed, wounded: wounded },
    atkAttrib:     R.attackerAttribution || null,
    defAttrib:     R.defenderAttribution || null,
    heroFx:        R.heroFx || null,
    statlar:       R.statlar || null,
  }) || {};

  try {
    firebaseDb.ref("pvpRaids/" + key).push(bildirim)
      .catch(e => pvpUyar("Savunana rapor GÖNDERİLEMEDİ: " + (e && e.message ? e.message : e)));
  } catch (e) {
    pvpUyar("Rapor gönderimi HATA verdi: " + (e && e.message ? e.message : e));
  }

  return alinan;
}

/* ═══════════════════════════════════════════════════════════════
   BULUTTAN GÜNCEL DURUMU ÇEK
   Savunan oyuna girdiğinde ya da bir saldırı bildirimi geldiğinde,
   kendi hesabının Firebase'deki güncel state'ini alıp yerel state'e
   uygular. Böylece çevrimdışıyken uğradığı kayıplar ekrana yansır.
   ═══════════════════════════════════════════════════════════════ */
let _pullingState = false;
function pullFreshStateFromCloud() {
  if (!fbOK() || !myKey() || _pullingState) return;
  if (typeof state !== "object" || !state) return;

  /*  YEREL YAZIM BİTMEDEN ÇEKME.
      Bulut yazması gecikmeli (index.html queueCloudSave). O aralıkta
      çekersek buluttaki ESKİ değeri belleğe geri yazarız. Yeni
      kayıtta bulutta defaultState duruyordu: hoş geldin 5.000.000
      elması veriliyor, ~1,5 sn sonra buradan sıfırlanıyordu. Bekleyen
      yazım varsa çekme ertelenir. */
  if (window.BULUT_YAZIM_BEKLIYOR) { setTimeout(pullFreshStateFromCloud, 700); return; }

  _pullingState = true;
  firebaseDb.ref("accounts/" + myKey() + "/state").get()
    .then(snap => {
      _pullingState = false;
      if (!snap.exists()) return;
      const fresh = snap.val();
      if (!fresh) return;
      /* yalnızca saldırıdan etkilenen alanları taze veriyle değiştir;
         oyuncunun o an açık paneli, seçili birlikleri vs. bozulmasın */
      if (typeof fresh.diamonds === "number") state.diamonds = fresh.diamonds;
      if (fresh.troops)   state.troops   = fresh.troops;
      if (fresh.hospital) state.hospital = fresh.hospital;
      ["renderDiamonds","renderTroopsPanel","renderHospitalPanel","persistCurrentState"]
        .forEach(f => { if (typeof window[f] === "function") window[f](); });
    })
    .catch(e => { _pullingState = false; console.warn("[pvp] durum tazelenemedi:", e); });
}

/* ═══════════════════════════════════════════════════════════════
   8) BİZE GELEN SALDIRILAR
   ---------------------------------------------------------------
   Kayıp (elmas + birlik) ARTIK saldıran tarafından, savunanın
   Firebase kaydına DOĞRUDAN işleniyor (sendRaidReport → transaction).
   Bu yüzden savunan oyuna girdiğinde o güncel state'i zaten çekmiş
   olur; burada veriyi TEKRAR düşürmüyoruz (çift sayım olurdu).

   Buranın tek işi: savunana "saldırıya uğradın" bildirimi göstermek
   ve savaş günlüğüne bir savunma kaydı eklemek.
   ═══════════════════════════════════════════════════════════════ */
let _raidRef = null, _raidKey = null;
const _islenmisRaporlar = {};

/* Telefonda konsol görünmediği için hataları ekrana basar */
function pvpUyar(msg) {
  console.warn("[pvp]", msg);
  try {
    let el = document.getElementById("pvpUyariCubugu");
    if (!el) {
      el = document.createElement("div");
      el.id = "pvpUyariCubugu";
      el.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99999;" +
        "background:#b3261e;color:#fff;font:12px/1.4 system-ui;padding:7px 30px 7px 10px;" +
        "white-space:pre-wrap;word-break:break-word;";
      const x = document.createElement("button");
      x.textContent = "✕";
      x.style.cssText = "position:absolute;right:6px;top:5px;background:none;border:0;color:#fff;font-size:14px;";
      x.onclick = () => el.remove();
      el.appendChild(x);
      document.body.appendChild(el);
    }
    const p = document.createElement("div");
    p.textContent = msg;
    el.appendChild(p);
  } catch (e) {}
}
function startRaidInbox() {
  if (!fbOK() || !myKey()) return;

  /* Hesap değiştiyse ESKİ dinleyiciyi bırak. Bırakılmazsa oyuncu,
     önceki hesabın rapor kutusunu dinlemeye devam eder: raporlar
     yanlış hesaba düşer ve asıl sahibinden silinir. */
  if (_raidRef && _raidKey !== myKey()) {
    try { _raidRef.off(); } catch (e) {}
    _raidRef = null;
    Object.keys(_islenmisRaporlar).forEach(k => delete _islenmisRaporlar[k]);
    console.log("[pvp] hesap değişti, rapor kutusu yeniden bağlanıyor");
  }
  if (_raidRef) return;

  _raidKey = myKey();
  _raidRef = firebaseDb.ref("pvpRaids/" + myKey());
  _raidRef.on("child_added", snap => {
    const r = snap.val() || {};

    /* Oyun henüz hazır değilse kaydı SİLME — sonra tekrar denenir.
       (Eskiden önce siliniyordu, hazır olmayan anda gelen rapor yok oluyordu.) */
    if (!pvpState()) { console.warn("[pvp] rapor bekletildi, state hazır değil"); return; }

    /* Aynı rapor iki kez işlenmesin */
    if (_islenmisRaporlar[snap.key]) return;
    _islenmisRaporlar[snap.key] = true;

    snap.ref.remove().catch(e => {
      /* Silinemezse her açılışta tekrar düşer — sebebini göster */
      pvpUyar("Rapor silinemedi (izin?): " + (e && e.message ? e.message : e));
    });

    const totalLost = num(r.troopsLost, 0);
    const lost = Math.max(0, num(r.diamondsLost, 0));

    /* Eski sürümden kalan, henüz işlenmemiş kayıtlar olabilir.
       Yeni kayıtlarda applied:true var → veriyi düşürme. */
    if (!r.applied) {
      const killed = r.killed || {}, wounded = r.wounded || {};
      if (r.attackerWon && lost > 0) state.diamonds = Math.max(0, state.diamonds - Math.min(state.diamonds, lost));
      Object.keys(killed).forEach(uid  => state.troops[uid] = Math.max(0,(state.troops[uid]||0) - num(killed[uid],0)));
      Object.keys(wounded).forEach(uid => state.troops[uid] = Math.max(0,(state.troops[uid]||0) - num(wounded[uid],0)));
      if (typeof sendWoundedToHospital === "function") sendWoundedToHospital(toHospitalFormat(wounded));
    } else {
      /* güncel state'i buluttan tazele — saldıran zaten düşürdü */
      if (typeof pullFreshStateFromCloud === "function") pullFreshStateFromCloud();
    }

    state.battleLogHistory.unshift({
      enemyName: "🛡️ " + (r.from || "Bilinmeyen") + " (savunma)",
      win: !r.attackerWon,
      diamondDelta: r.attackerWon ? -lost : 0,
      /* saldıranın götürdüğü kaynak — savunanın raporunda görünür */
      ganimet: r.ganimet || null,
      turns: num(r.turns, 0), dmgDealt: 0, dmgAbsorbed: 0, dmgTaken: 0,
      heroHpFinal: 0, heroMaxHp: 0, troopsWoundedByUnit: {},
      timestamp: num(r.at, Date.now()), pvp: true,
      /* paylaşım detayları — savunan gözünden */
      role: "defender",
      myName: currentUsername || "Ben",
      enemyPlainName: r.from || "Bilinmeyen",
      diamondsLost: lost,
      troopsLostTotal: totalLost,
      /* saldırıdan gelen tam rapor — DETAY ekranı bunları kullanır */
      enemyCommanders: r.atkCommanders || [],
      myCommanders:    r.defCommanders || [],
      enemyTroops:     r.atkTroops || null,
      usedTroops:      r.defTroops || null,
      enemyLosses:     r.atkLosses || null,
      myLosses:        r.defLosses || null,
      enemyAttribution: r.atkAttrib || null,
      myAttribution:    r.defAttrib || null,
      heroFx:           r.heroFx || null,
      statlar:          r.statlar || null,
    });
    if (typeof gunlugüKirp === "function") gunlugüKirp();
  else if (state.battleLogHistory.length > 70) state.battleLogHistory.length = 70;

    toast(r.attackerWon
      ? `💥 ${r.from} ordunu dağıttı! -${money(lost)} 💎, -${totalLost} birlik`
      : `🛡️ ${r.from} saldırdı, ordun püskürttü! (-${totalLost} birlik)`);

    ["renderDiamonds","renderTroopsPanel","renderHospitalPanel","renderBattleLogPanel","persistCurrentState"]
      .forEach(f => { if (typeof window[f] === "function") window[f](); });
  });
}

/* ═══════════════════════════════════════════════════════════════
   9) DOSTLUK
   ═══════════════════════════════════════════════════════════════ */
function sendFriendRequest(name) {
  if (!fbOK()) { toast("Dostluk için internet bağlantısı gerekli."); return; }
  if (!currentUsername) return;
  if (isFriend(name)) { toast("Zaten dostsunuz."); return; }
  firebaseDb.ref("pvpFriendReq/" + fbKey(name)).push({ from: currentUsername, at: Date.now() })
    .then(() => toast(`🤝 ${name} adlı oyuncuya dostluk isteği gönderildi.`))
    .catch(() => toast("İstek gönderilemedi."));
}
function addFriend(name) {
  const s = pvpState(); if (!s || !name) return;
  s.friends[String(name).toLowerCase()] = { name: name, since: Date.now() };
  if (typeof persistCurrentState === "function") persistCurrentState();
}
function breakFriendship(name) {
  const s = pvpState(); if (!s) return;
  delete s.friends[String(name).toLowerCase()];
  if (fbOK()) firebaseDb.ref("pvpFriendAck/" + fbKey(name))
    .push({ from: currentUsername, at: Date.now(), ok:false, broke:true }).catch(()=>{});
  toast(`💔 ${name} ile dostluğun sona erdi.`);
  if (typeof persistCurrentState === "function") persistCurrentState();
}

let _reqRef = null, _ackRef = null, _inboxKey = null;

/* hesap değiştiyse arkadaşlık dinleyicilerini de bırak */
function _inboxHesapKontrol() {
  if ((_reqRef || _ackRef) && _inboxKey !== myKey()) {
    try { if (_reqRef) _reqRef.off(); } catch (e) {}
    try { if (_ackRef) _ackRef.off(); } catch (e) {}
    _reqRef = _ackRef = null;
  }
}
function startFriendInbox() {
  _inboxHesapKontrol();
  if (!fbOK() || !myKey()) return;
  if (!_reqRef) {
    _inboxKey = myKey();
    _reqRef = firebaseDb.ref("pvpFriendReq/" + myKey());
    _reqRef.on("child_added", snap => {
      const r = snap.val() || {}; snap.ref.remove().catch(()=>{});
      if (r.from && !isFriend(r.from)) showFriendRequestPopup(r.from);
    });
  }
  if (!_ackRef) {
    _ackRef = firebaseDb.ref("pvpFriendAck/" + myKey());
    _ackRef.on("child_added", snap => {
      const a = snap.val() || {}; snap.ref.remove().catch(()=>{});
      if (!a.from) return;
      if (a.broke) {
        const s = pvpState();
        if (s) { delete s.friends[a.from.toLowerCase()];
                 if (typeof persistCurrentState === "function") persistCurrentState(); }
        toast(`💔 ${a.from} dostluğu bitirdi.`);
      } else if (a.ok) { addFriend(a.from); toast(`🤝 ${a.from} dostluk isteğini kabul etti!`); }
      else             { toast(`❌ ${a.from} dostluk isteğini reddetti.`); }
    });
  }
}

function showFriendRequestPopup(fromName) {
  closeCastlePopup();
  const back = document.createElement("div");
  /* Çapa sınıfı DOM'a girmeden veriliyor: önce ortada bir kare
     çizilip sonra yerine zıplaması ekranın yenilendiği hissini
     veriyordu. */
  back.className = "pvp-backdrop pvp-capa";
  back.style.visibility = "hidden";
  back.innerHTML = `
    <div class="pvp-pop">
      <div class="pvp-head">
        <div class="pvp-ava">🤝</div>
        <div>
          <div class="pvp-name">${esc(fromName)}</div>
          <div class="pvp-sub">sana dostluk isteği gönderdi</div>
        </div>
      </div>
      <div class="pvp-note" style="margin:0 0 12px;">Dost olursanız birbirinize saldıramazsınız.</div>
      <div class="pvp-actions">
        <button class="pvp-btn pvp-btn-friend" id="pvpAcceptBtn">✅ KABUL ET</button>
        <button class="pvp-btn pvp-btn-attack" id="pvpRejectBtn">❌ REDDET</button>
      </div>
    </div>`;
  document.body.appendChild(back);
  function answer(ok) {
    back.remove();
    if (fbOK() && currentUsername) firebaseDb.ref("pvpFriendAck/" + fbKey(fromName))
      .push({ from: currentUsername, at: Date.now(), ok: ok }).catch(()=>{});
    if (ok) { addFriend(fromName); toast(`🤝 ${fromName} artık dostun!`); }
    else    { toast("İstek reddedildi."); }
  }
  tap(back.querySelector("#pvpAcceptBtn"), () => answer(true));
  tap(back.querySelector("#pvpRejectBtn"), () => answer(false));
  back.addEventListener("click", e => { if (e.target === back) back.remove(); });
}

/* ═══════════════════════════════════════════════════════════════
   10) HARİTAYA BAĞLAN
   ═══════════════════════════════════════════════════════════════ */

function attachCastleTaps() {
  const mapEl = document.getElementById("battleMap");
  if (!mapEl) return;
  mapEl.querySelectorAll(".castle-node").forEach(node => {
    if (node.dataset.pvpBound) return;
    node.dataset.pvpBound = "1";
    tap(node, () => {
      const ds = node.dataset;
      openCastlePopup(ds.cname || "Oyuncu", parseFloat(ds.cx)||0, parseFloat(ds.cy)||0,
                      node.classList.contains("castle-own"));
    });
  });
}
function hookRenderBattleMap() {
  const orig = window.renderBattleMap;
  if (typeof orig !== "function" || orig.__pvpWrapped) return;
  const wrapped = function () { const r = orig.apply(this, arguments); attachCastleTaps(); return r; };
  wrapped.__pvpWrapped = true;
  window.renderBattleMap = wrapped;
}

/* ═══════════════════════════════════════════════════════════════
   11) BAŞLAT
   ═══════════════════════════════════════════════════════════════ */
let _pulledOnce = false;
function tick() {
  hookRenderBattleMap();
  hookBattleButton();
  attachCastleTaps();
  if (fbOK()) {
    startWatchers();
    if (myKey()) {
      startRaidInbox();
      startFriendInbox();
      /* oturum açıldıktan sonra bir kez buluttan güncel durumu çek:
         oyuncu yokken uğradığı kayıplar hemen görünsün */
      if (!_pulledOnce) { _pulledOnce = true; setTimeout(pullFreshStateFromCloud, 1500); }
    }
  }
}
/* ═══════════════════════════════════════════════════════════════
   GÜVENLİ BAŞLATMA
   ---------------------------------------------------------------
   pvp.js, troops.js'teki UNIT_TYPES ve ana koddaki state hazır
   olmadan çalışırsa "UNIT_TYPES is not defined" hatası verir.
   Bu yüzden hangi sırayla yüklenirse yüklensin, gerekli parçalar
   gelene kadar bekliyoruz. Böylece birleştirme sırası önemsiz olur.
   ═══════════════════════════════════════════════════════════════ */
function pvpDepsReady() {
  return typeof UNIT_TYPES !== "undefined"
      && typeof state !== "undefined" && state
      && typeof HERO_STATS !== "undefined";   /* pvp bunları da kullanıyor olabilir */
}


/* ═══════════════════════════════════════════════════════════════
   OTURUM KAPANIŞI
   Çıkış yapılınca dinleyiciler bırakılmazsa, yeni giren hesap hâlâ
   ESKİ hesabın kutusunu dinler ve kendi raporlarını hiç alamaz.
   index.html'deki logout() bunu çağırır.
   ═══════════════════════════════════════════════════════════════ */
function stopPvpListeners() {
  /* Sadece KULLANICIYA ÖZEL dinleyiciler bırakılır.
     _hpRef genel veriyi dinler, hesaba bağlı değildir. */
  Object.keys(_accZaman).forEach(k => delete _accZaman[k]);
  ACCOUNTS = {};
  [_raidRef, _reqRef, _ackRef].forEach(ref => {
    try { if (ref && ref.off) ref.off(); } catch (e) {}
  });
  _raidRef = _reqRef = _ackRef = null;
  _raidKey = _inboxKey = null;
  _pulledOnce = false;
  Object.keys(_islenmisRaporlar).forEach(k => delete _islenmisRaporlar[k]);
  console.log("[pvp] dinleyiciler bırakıldı (oturum kapandı)");
}
window.stopPvpListeners = stopPvpListeners;

function startPvp() {
  tick();
  setInterval(tick, 2500);
  uyandirmayiKur();
  console.log("[pvp.js] Ordu savaşı sistemi yüklendi ✔");
}

/* ═══════════════════════════════════════════════════════════════
   EKRAN GERİ GELİNCE BAĞLANTIYI UYANDIR
   Telefon Chrome'u arka plana atınca ağ bağlantısını kapatıyor.
   Eskiden bağlantı, oyuncu kaleye BASTIĞI anda kurulmaya başlıyordu
   ve 10-20 sn sürüyordu. Artık ekran geri gelir gelmez başlıyor;
   oyuncu kaleyi bulup basana kadar iş bitmiş oluyor.
   ═══════════════════════════════════════════════════════════════ */
function uyandir() {
  if (!fbOK()) return;
  try { if (firebaseDb.goOnline) firebaseDb.goOnline(); } catch (e) {}
  try { firebaseDb.ref(".info/connected").once("value"); } catch (e) {}
  try { startWatchers(); } catch (e) {}
}
function uyandirmayiKur() {
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) uyandir();
  });
  window.addEventListener("pageshow", uyandir);
  window.addEventListener("focus", uyandir);
}

function waitAndStart() {
  if (pvpDepsReady()) { startPvp(); return; }
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    if (pvpDepsReady()) { clearInterval(iv); startPvp(); }
    else if (tries > 200) {   /* ~20 sn: yine de başlat, kısımlar eksik çalışır */
      clearInterval(iv);
      console.warn("[pvp.js] UNIT_TYPES/state gelmedi ama yine de başlatılıyor.");
      startPvp();
    }
  }, 100);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", waitAndStart);
} else {
  waitAndStart();
}

window.PVP = {
  open: openCastlePopup, attack: beginPvpBattle,
  simulate: pvpSimulate, config: CFG,
  friends: () => (pvpState() || {}).friends,
  /* ── sefer.js kullanır ──
     savasiCalistir/savunanKur: sefer hedefe varınca savaşı PANELSİZ
     çözmek için. sonSonuc: o savaşta ölen/yaralanan KESİN sayılar —
     sefer dönen ordunun mevcudunu bundan hesaplar (tahminle değil).
     Bu üç ad silinirse sefer sistemi SESSİZCE kırılır: ordu varır,
     savaş olmaz, eli boş döner. Silmeden önce projede ARA. */
  savasiCalistir: runPvpBattle,
  savunanKur: buildDefender,
  /* sefer.js varış anında bunu sorar — kalkan hesabı TEK YERDE. */
  kalkanKalan: kalkanKalan,
  sonSonuc: null,
};
})();

/* ═══════════════════════════════════════════════════════════════
   MESAJ KUTUSU BİLDİRİMİ  —  alt menüdeki ✉ ikonunda kırmızı rozet
   ---------------------------------------------------------------
   Sayaç: state.battleLogHistory içinde "son okuma"dan YENİ olan
   kayıt sayısı. Kendi saldırın, sana gelen baskın raporu, füze —
   günlüğe düşen her şey sayılır. Panel açılınca sıfırlanır.

   Son okuma zamanı localStorage'da (hesap adına göre) tutulur;
   kayıt biçimine dokunulmadı, Firebase'e bir şey yazılmıyor.
   ═══════════════════════════════════════════════════════════════ */
(function mesajRozeti() {
"use strict";

const st = document.createElement("style");
st.id = "mesajRozetiStil";
st.textContent = `
.nav-dock, .nav-dock .dock-btn{ overflow:visible !important; }
.nav-dock .dock-btn[data-panel="battlelog"]{ position:relative !important; }
.mail-badge{
  position:absolute !important; top:-2px; right:2px; z-index:60; pointer-events:none;
  min-width:19px; height:19px; padding:0 5px;
  display:flex; align-items:center; justify-content:center;
  border-radius:10px;
  background:linear-gradient(180deg,#ff5c5c,#c00d0d);
  border:1px solid rgba(255,225,225,.92);
  color:#fff; font-family:'Baloo 2','Nunito',sans-serif;
  font-weight:800; font-size:11px; line-height:1; letter-spacing:.2px;
  text-shadow:0 1px 2px rgba(90,0,0,.6);
  box-shadow:none;
  animation:mailBadgePulse 1.6s ease-in-out infinite;
}
@keyframes mailBadgePulse{
  0%,100%{ transform:scale(1); }
  50%    { transform:scale(1.13); }
}
`;
document.head.appendChild(st);

function anahtar() {
  const u = (typeof currentUsername !== "undefined" && currentUsername) ? currentUsername : "misafir";
  return "bd_mail_seen_" + u;
}
function sonOkuma() {
  try { const v = parseInt(localStorage.getItem(anahtar()) || "", 10); return isFinite(v) ? v : null; }
  catch (e) { return null; }
}
function okunduYaz(t) { try { localStorage.setItem(anahtar(), String(t)); } catch (e) {} }

function okunmamisSayisi() {
  const h = (typeof state !== "undefined" && state && Array.isArray(state.battleLogHistory))
            ? state.battleLogHistory : [];
  const t = sonOkuma();
  if (t === null) return 0;
  let n = 0;
  for (let i = 0; i < h.length; i++) {
    const e = h[i];
    if (e && typeof e.timestamp === "number" && e.timestamp > t) n++;
  }
  return n;
}

function dockDugmesi() { return document.querySelector('.dock-btn[data-panel="battlelog"]'); }

function ciz() {
  const btn = dockDugmesi();
  if (!btn) return;
  /* ilk açılış: geçmiş kayıtlar okunmuş sayılır, rozet 0'dan başlar */
  if (sonOkuma() === null) { okunduYaz(Date.now()); }

  /* mesaj kutusu açıksa okundu kabul et */
  const panel = document.getElementById("panel-battlelog");
  if (panel && panel.classList.contains("active")) okunduYaz(Date.now());

  const n = okunmamisSayisi();
  let rozet = btn.querySelector(".mail-badge");
  if (n <= 0) { if (rozet) rozet.remove(); return; }
  if (!rozet) { rozet = document.createElement("span"); rozet.className = "mail-badge"; btn.appendChild(rozet); }
  const yazi = n > 99 ? "99+" : String(n);
  if (rozet.textContent !== yazi) rozet.textContent = yazi;
}

/* mesaj kutusuna dokunulduğu anda sıfırla (panel açılışını beklemeden) */
document.addEventListener("click", (e) => {
  const t = e.target && e.target.closest ? e.target.closest('[data-panel="battlelog"]') : null;
  if (t) { okunduYaz(Date.now()); setTimeout(ciz, 40); }
}, true);

/* state geç yükleniyor (giriş sonrası), o yüzden aralıklı kontrol */
setInterval(ciz, 1000);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ciz);
else ciz();

window.refreshMailBadge = ciz;

})();
