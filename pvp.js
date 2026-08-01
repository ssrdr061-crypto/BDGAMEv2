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
  defenseFactor:  0.50,   /* savunma, gelen hasarın ne kadarını emer      */
  minDamagePct:   0.12,   /* savunma ne kadar yüksek olursa olsun bu oran geçer */
  variance:       0.30,   /* hasar dalgalanması (±%15)                     */
  damageScale:    0.35,   /* GENEL HIZ: küçültürsen savaş uzar, kayıplar azalır */
  deathPct:       0.35,   /* düşen birliklerin %35'i ÖLÜR, kalanı hastaneye */

  /* ── Savunan avantajı (kalesinde savunuyor) ── */
  castleAtkBonus: 1.00,
  castleDefBonus: 1.15,
  castleHpBonus:  1.10,
  defenseRobotMultiplier: 2,   /* REVOLİA pasifi: savunmada robotlar 2 kat */

  /* ── Ganimet ── */
  winStealPct: 0.10,   /* kazanınca rakip elmasının %10'u  */
  maxSteal:    50000,
  minSteal:    200,
  loseCostPct: 0.04,   /* kaybedersen kendi elmasının %4'ü */
  maxLoseCost: 20000,

  /* ── Kısıtlar ── */
  attackCooldownMs: 0,                   /* aynı oyuncuya tekrar saldırı beklemesi — 0 = yok */
  newbieShieldMs:   24 * 60 * 60 * 1000, /* yeni hesap kalkanı                   */

  /* ── Sadece GÖSTERİM: missile.js'teki kale HP ayarlarıyla aynı olmalı ── */
  castleMaxHp:        1000,
  castleRegenPerHour: 150,
  brokenThreshold:    150,
};

/* Birliklerin savaş dizilişi: baştakiler ÖN SAFTA, önce onlar kırılır */
const FRONT_ORDER = ["knight", "soldier", "robot"];

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
@keyframes pvpPopIn{ from{opacity:0; transform:translateY(14px) scale(.94)} to{opacity:1; transform:none} }

/* ═══════════════════════════════════════════════════════════════
   KALE KUTUCUĞU — görünüm şablonu tema.js ile aynı tutulmalı.
   (tema.js yüklü değilse de kutucuk düzgün görünsün diye burada
   kendi kopyası duruyor.)
   ═══════════════════════════════════════════════════════════════ */
.pvp-pop{
  background:
    radial-gradient(ellipse 100% 50% at 50% 0%, rgba(170,240,255,.5), transparent 72%),
    radial-gradient(ellipse 80% 40% at 50% 105%, rgba(8,45,80,.55), transparent 75%),
    linear-gradient(180deg, #1fa3ea, #0e6fc0) !important;
  border:3px solid rgba(190,240,255,.85) !important;
  box-shadow:0 0 26px rgba(120,225,255,.45), inset 0 3px 0 rgba(255,255,255,.45) !important;
}

.pvp-pop{
  position:relative; width:min(340px, 92vw);
  border-radius:20px; padding:16px 15px 15px;
  font-family:'Baloo 2',sans-serif; color:#eaf4ff;
  animation:pvpPopIn .18s cubic-bezier(.2,.9,.3,1.3);
}


/* SAĞ ÜST KÖŞE: FÜZE */
.pvp-missile{
  position:absolute; top:-13px; right:-11px; z-index:6;
  width:46px; height:46px; border:none; cursor:pointer; border-radius:50%;
  background:linear-gradient(180deg,#ffb44d,#e0631b);
  box-shadow:0 5px 0 #8d3208, 0 8px 16px rgba(0,10,30,.5), inset 0 1px 0 rgba(255,255,255,.55);
  font-size:22px; line-height:1; display:flex; align-items:center; justify-content:center;
  transition:transform .07s, box-shadow .07s; -webkit-tap-highlight-color:transparent;
}
.pvp-missile:active{ transform:translateY(4px); box-shadow:0 1px 0 #8d3208; }
.pvp-missile::after{
  content:"FÜZE"; position:absolute; bottom:-15px; left:50%; transform:translateX(-50%);
  font-weight:800; font-size:9px; letter-spacing:.5px; color:#ffd9a8;
  text-shadow:0 1px 3px rgba(0,10,30,.9); pointer-events:none; white-space:nowrap;
}

/* SOL ÜST KÖŞE: KAPAT */
.pvp-close{
  position:absolute; top:-11px; left:-9px; z-index:6;
  width:32px; height:32px; border:none; cursor:pointer; border-radius:50%;
  background:linear-gradient(180deg,#8894ad,#4a566e);
  box-shadow:0 4px 0 #2b3448, inset 0 1px 0 rgba(255,255,255,.35);
  color:#fff; font-weight:800; font-size:15px;
  display:flex; align-items:center; justify-content:center;
  -webkit-tap-highlight-color:transparent;
}
.pvp-close:active{ transform:translateY(3px); box-shadow:0 0 0 #2b3448; }

.pvp-head{ display:flex; align-items:center; gap:11px; margin:4px 0 12px; }
.pvp-ava{
  width:54px; height:54px; flex:0 0 54px; border-radius:14px;
  background:linear-gradient(180deg, rgba(255,255,255,.25), rgba(255,255,255,.06));
  border:2px solid rgba(190,240,255,.6);
  display:flex; align-items:center; justify-content:center; font-size:26px;
  box-shadow:inset 0 2px 0 rgba(255,255,255,.35);
}
.pvp-name{ font-weight:900; font-size:18px; line-height:1.1; color:#ffd257;
  text-shadow:0 2px 4px rgba(0,40,70,.7); word-break:break-word; }
.pvp-sub{ font-size:11.5px; font-weight:700; color:#dff2ff; margin-top:3px;
  text-shadow:0 1px 2px rgba(0,30,55,.5); }
.pvp-tag{ display:inline-block; margin-top:5px; padding:2px 8px; border-radius:999px;
  font-size:10px; font-weight:800; letter-spacing:.4px; }
.pvp-tag.friend{ background:rgba(59,116,232,.22); color:#8fb6ff; border:1px solid rgba(120,170,255,.4); }
.pvp-tag.shield{ background:rgba(95,217,138,.18); color:#7fe3a6; border:1px solid rgba(95,217,138,.4); }
.pvp-tag.own{    background:rgba(212,175,55,.18); color:#f2d47a; border:1px solid rgba(212,175,55,.45); }

.pvp-stats{
  background:linear-gradient(180deg, rgba(34,72,143,.7), rgba(13,34,70,.8));
  border:2px solid rgba(190,240,255,.4);
  border-radius:13px; padding:10px 11px; margin-bottom:12px;
  box-shadow:inset 0 2px 3px rgba(150,205,255,.25);
}
.pvp-stat-row{ display:flex; justify-content:space-between; align-items:center; gap:8px;
  font-size:12.5px; font-weight:700; padding:3px 0; color:#dff2ff;
  text-shadow:0 1px 2px rgba(0,30,55,.5); }
.pvp-stat-row b{ color:#fff; font-weight:900; }

.pvp-hp-bar{ height:9px; border-radius:5px; overflow:hidden; margin-top:2px;
  background:rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.16); }
.pvp-hp-bar i{ display:block; height:100%; border-radius:4px; transition:width .4s; }
.pvp-hp-note{ font-size:9.5px; font-weight:700; color:#7d90ae; margin-top:3px; text-align:right; }

.pvp-sep{ height:1px; background:rgba(190,240,255,.3); margin:9px 0 7px; }

.pvp-verdict{ text-align:center; font-size:12px; font-weight:800; margin-top:8px;
  padding-top:7px; border-top:1px dashed rgba(190,240,255,.32);
  text-shadow:0 1px 2px rgba(0,30,55,.6); }
.pvp-v-green{ color:#7fe3a6; } .pvp-v-yellow{ color:#f2d47a; } .pvp-v-red{ color:#ff8b8b; }

.pvp-actions{ display:flex; gap:9px; }
.pvp-btn{ flex:1; border:none; cursor:pointer; border-radius:14px;
  padding:13px 6px 15px; font-family:'Baloo 2',sans-serif;
  font-weight:900; font-size:14px; letter-spacing:.4px; color:#fff;
  text-shadow:0 2px 3px rgba(0,0,0,.45);
  transition:transform .07s, box-shadow .07s, filter .12s;
  -webkit-tap-highlight-color:transparent; }
.pvp-btn:active{ transform:translateY(4px); }
.pvp-btn:disabled{ filter:saturate(.25) brightness(.65); cursor:not-allowed; }
.pvp-btn-attack{ background:linear-gradient(180deg, ${CFG.attackColor1}, ${CFG.attackColor2});
  box-shadow:0 5px 0 ${CFG.attackShadow}, 0 8px 16px rgba(0,10,30,.45), inset 0 1px 0 rgba(255,255,255,.28); }
.pvp-btn-attack:active{ box-shadow:0 1px 0 ${CFG.attackShadow}; }
.pvp-btn-friend{ background:linear-gradient(180deg, ${CFG.friendColor1}, ${CFG.friendColor2});
  box-shadow:0 5px 0 ${CFG.friendShadow}, 0 8px 16px rgba(0,10,30,.45), inset 0 1px 0 rgba(255,255,255,.28); }
.pvp-btn-friend:active{ box-shadow:0 1px 0 ${CFG.friendShadow}; }

.pvp-note{ margin-top:9px; text-align:center; font-size:10.5px; font-weight:700;
  color:#dff2ff; line-height:1.45; text-shadow:0 1px 2px rgba(0,30,55,.6); }

/* savaş raporu — birlik kayıpları */
.pvp-loss-box{ margin-top:9px;
  background:linear-gradient(180deg, rgba(34,72,143,.62), rgba(13,34,70,.75));
  border:2px solid rgba(190,240,255,.35); border-radius:11px; padding:9px 10px; }
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
  FRONT_ORDER.forEach(uid => {
    let n = Math.max(0, Math.floor(num(src[uid], 0)));
    if (uid === "robot") n = Math.round(n * CFG.defenseRobotMultiplier);
    troops[uid] = n;
    troopCount += n;
  });
  /* gerçek envanteri de sakla (kayıp düşerken çarpansız kullanılacak) */
  const realTroops = {};
  FRONT_ORDER.forEach(uid => realTroops[uid] = Math.max(0, Math.floor(num(src[uid], 0))));

  /* kutucukta gösterilecek toplam güç */
  let atk = num(h.attack, 40), def = num(h.defense, 25), hp = num(h.maxHp, 200);
  FRONT_ORDER.forEach(uid => {
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
    troopCount:   troopCount,
    mapX: 0, mapY: 0, baseReward: 0,
  };
}

function hasNewbieShield(d) {
  return !!d.registeredAt && (Date.now() - d.registeredAt) < CFG.newbieShieldMs;
}

function verdictFor(defender) {
  let mine = { attack: 0, defense: 0, maxHp: 0 };
  try {
    if (typeof getEffectiveHeroStats === "function") {
      const all = {};
      Object.keys(state.troops || {}).forEach(k => all[k] = state.troops[k] || 0);
      mine = getEffectiveHeroStats(all);
    }
  } catch (e) {}
  const r = (defender.attack + defender.defense + defender.maxHp/4) > 0
    ? (mine.attack + mine.defense + mine.maxHp/4) /
      (defender.attack + defender.defense + defender.maxHp/4) : 2;
  if (r >= 1.5)  return { t: "Tüm ordunla rahat ezersin",     c: "pvp-v-green"  };
  if (r >= 1.05) return { t: "Avantajlısın",                  c: "pvp-v-green"  };
  if (r >= 0.85) return { t: "Dengeli — birlik kaybın ağır olur", c: "pvp-v-yellow" };
  return               { t: "Ordusu senden güçlü, dikkat!",   c: "pvp-v-red"    };
}

/* ═══════════════════════════════════════════════════════════════
   5) KALE KUTUCUĞU
   ═══════════════════════════════════════════════════════════════ */
let _popEl = null;
function closeCastlePopup() { if (_popEl) { _popEl.remove(); _popEl = null; } }

function openCastlePopup(name, gx, gy, isOwn) {
  /* Rakip verisi artık canlı dinlenmiyor; pencereyi açmadan önce
     o tek hesabı çekeriz. Önbellek tazeyse beklemeden açılır. */
  if (!isOwn) {
    const _k = fbKey(String(name || "").toLowerCase());
    if (!accTaze(_k)) {
      fetchAccount(name).then(() => {
        _accZaman[_k] = Date.now();   /* hesap yoksa bile tekrar tekrar deneme */
        openCastlePopup(name, gx, gy, isOwn);
      });
      return;
    }
  }

  closeCastlePopup();

  const hp      = castleHpOf(isOwn ? (currentUsername || "") : name);
  const hpPct   = Math.round(hp / CFG.castleMaxHp * 100);
  const hpColor = hpPct > 50 ? "#5ec46a" : hpPct > 20 ? "#e0b24a" : "#e05a4a";

  const acc      = isOwn ? null : findAccountByName(name);
  const defender = isOwn ? null : buildDefender(acc, name);
  const friend   = !isOwn && isFriend(name);
  const shield   = defender ? hasNewbieShield(defender) : false;
  const cdLeft   = isOwn ? 0 : cooldownLeft(name);

  let tag = "";
  if (isOwn)       tag = `<span class="pvp-tag own">👑 SENİN KALEN</span>`;
  else if (friend) tag = `<span class="pvp-tag friend">🤝 DOSTUN</span>`;
  else if (shield) tag = `<span class="pvp-tag shield">🛡️ YENİ OYUNCU KALKANI</span>`;

  /* Kale HP — SADECE füze sisteminin bilgisi, saldırıyla ilgisi yok */
  const hpBlock = `
    <div class="pvp-stat-row" style="padding-bottom:2px;">
      <span>🏰 Kale HP</span><b>${money(hp)} / ${money(CFG.castleMaxHp)}</b>
    </div>
    <div class="pvp-hp-bar"><i style="width:${hpPct}%; background:${hpColor};"></i></div>
    <div class="pvp-hp-note">🚀 füze hasarı — saldırıdan etkilenmez</div>`;

  /* Rakibin BİRLİK DÖKÜMÜ gizli — sadece TOPLAM GÜÇ gösterilir.
     Güç = saldırı + savunma + can/4 (savaş öncesi kaba bir kıyas). */
  const totalPower = defender
    ? Math.round(defender.attack + defender.defense + defender.maxHp / 4)
    : 0;

  const statsHTML = isOwn
    ? hpBlock + `<div class="pvp-sep"></div>
        <div class="pvp-stat-row"><span>💎 Elmasın</span><b>${money(state.diamonds || 0)}</b></div>
        ${FRONT_ORDER.filter(u => (state.troops||{})[u] > 0)
          .map(u => `<div class="pvp-stat-row"><span>${unitLabel(u)}</span><b>x${money(state.troops[u])}</b></div>`).join("")}`
    : hpBlock + `<div class="pvp-sep"></div>
        <div class="pvp-stat-row" style="font-size:14px;">
          <span>⚔️ Toplam Güç</span><b style="color:#ffd257;">${money(totalPower)}</b>
        </div>`;

  const actionsHTML = isOwn ? "" : `
    <div class="pvp-actions">
      <button class="pvp-btn pvp-btn-attack" id="pvpAttackBtn">⚔️ SALDIR</button>
      <button class="pvp-btn pvp-btn-friend" id="pvpFriendBtn">${friend ? "💔 DOSTLUĞU BİTİR" : "🤝 DOSTLUK"}</button>
    </div>`;

  /* Alt bilgi metni yalnızca bir KISIT varsa gösterilir; normal
     durumda hiçbir açıklama yazılmaz. */
  let note = "";
  if (friend)          note = "Dostuna saldıramazsın.";
  else if (shield)     note = "Yeni oyuncular ilk 24 saat korumalıdır.";
  else if (cdLeft > 0) note = `Tekrar saldırmak için ${fmtLeft(cdLeft)} beklemelisin.`;

  const back = document.createElement("div");
  back.className = "pvp-backdrop";
  back.innerHTML = `
    <div class="pvp-pop">
      <button class="pvp-close"   id="pvpCloseBtn">✕</button>
      <button class="pvp-missile" id="pvpMissileBtn" title="Füze gönder">🚀</button>
      <div class="pvp-head">
        <div class="pvp-ava">🏰</div>
        <div>
          <div class="pvp-name">${esc(name || "Oyuncu")}</div>
          <div class="pvp-sub">📍 x:${Math.round(gx*10)/10} &nbsp; y:${Math.round(gy*10)/10}</div>
          ${tag}
        </div>
      </div>
      <div class="pvp-stats">${statsHTML}</div>
      ${actionsHTML}
      ${note ? `<div class="pvp-note">${note}</div>` : ""}
    </div>`;
  document.body.appendChild(back);
  _popEl = back;

  /* Paneli açan dokunuşun devamı (click) hemen arka plana düşüp
     paneli kapatmasın diye kısa bir gecikme koyuyoruz. */
  setTimeout(() => {
    back.addEventListener("click", e => { if (e.target === back) closeCastlePopup(); });
  }, 300);
  tap(back.querySelector("#pvpCloseBtn"), closeCastlePopup);
  tap(back.querySelector("#pvpMissileBtn"), () => fireMissileAt(name, gx, gy, isOwn));

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
  if (isOwn) { toast("Kendi kaleni füzeleyemezsin 😄"); return; }
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
function buffsOf(skinList) {
  if (typeof window.abilitiesForSkins !== "function") return [];
  return window.abilitiesForSkins(skinList) || [];
}
function findBuff(ab, t) { return (ab || []).find(a => a.type === t); }

/* Birim statlarına yetenekleri uygular (makeArmy içinde çağrılır) */
function applyTroopBuffs(units, ab) {
  let f;
  units.forEach(u => {
    if (u.unitId === "robot") {
      const rob = findBuff(ab, "robot_atk_hp_pct");
      if (rob && rob.v) { u.atk *= (1 + rob.v / 100); u.hp *= (1 + rob.v / 100); }
      const rd = findBuff(ab, "defense_robot_multiplier");
      if (rd && rd.effect) u.def *= (rd.effect.multiplier || 2);
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
    if ((f = findBuff(ab, "troop_hp_pct")) && f.v) u.hp *= (1 + f.v / 100);

    u.atk = Math.max(1, Math.round(u.atk));
    u.def = Math.max(0, Math.round(u.def));
    u.hp  = Math.max(1, Math.round(u.hp));
  });
}

/* Savaş akışını etkileyen yetenekler — tur döngüsünde kullanılır */
function flowOf(ab) {
  const g = (t, k) => { const f = findBuff(ab, t); return f ? (f[k || "v"] || 0) : 0; };
  return {
    freezeTurns:   Math.round(g("enemy_freeze_turns")),
    reflectPct:    g("damage_reflect_pct"),
    defShredPct:   g("enemy_def_shred_pct"),
    enemyReducePct:g("enemy_hp_atk_reduce_pct"),
    instantPct:    g("enemy_instant_casualty"),
    periodicPct:   g("periodic_def_reduce_pct"),
    gapCapPct:     g("power_gap_cap"),
    woundedPct:    g("wounded_return_pct"),
    /* sayaçlar — rapora yazılır */
    used: { freeze: 0, reflect: 0, instant: 0, periodic: 0, gapCap: 0 }
  };
}

function makeArmy(troopsObj, heroStats, label, abilities) {
  const units = [];
  FRONT_ORDER.forEach(uid => {
    const d = UT()[uid]; if (!d) return;
    const c = Math.max(0, Math.floor(num((troopsObj || {})[uid], 0)));
    if (c > 0) units.push({ unitId: uid, count: c, start: c, atk: d.attack, def: d.defense, hp: d.hp });
  });
  const ab = abilities || [];
  applyTroopBuffs(units, ab);
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
    dealtByUnit: {},      /* hangi birlik tipi ne kadar hasar verdi */
    abilityKills: {},     /* yetenek kaynaklı kayıplar */
    pending: 0,           /* birim canını doldurmayan artık hasar */
    killed:  {},          /* kalıcı ölen */
    wounded: {},          /* hastaneye düşen */
    damageTaken: 0,
    damageDealt: 0,
  };
}
function armyTroopCount(a) { return a.units.reduce((s,u) => s + u.count, 0); }
function armyAtk(a) { return a.units.reduce((s,u) => s + u.atk*u.count, 0) + (a.hero.hp > 0 ? a.hero.atk : 0); }
function armyDef(a) { return a.units.reduce((s,u) => s + u.def*u.count, 0) + (a.hero.hp > 0 ? a.hero.def : 0); }
function armyAlive(a) { return armyTroopCount(a) > 0 || a.hero.hp > 0; }

/* hasarı orduya uygula → ÖN SAFTAN başlayarak birlikleri kırar */
function damageArmy(a, dmg) {
  a.damageTaken += dmg;
  a.pending += dmg;
  for (const u of a.units) {
    while (u.count > 0 && a.pending >= u.hp) {
      a.pending -= u.hp;
      u.count--;
      if (Math.random() < CFG.deathPct) a.killed[u.unitId]  = (a.killed[u.unitId]  || 0) + 1;
      else                              a.wounded[u.unitId] = (a.wounded[u.unitId] || 0) + 1;
    }
    if (a.pending < u.hp) break;
  }
  /* birlik kalmadıysa artan hasar komutana gider */
  if (armyTroopCount(a) === 0 && a.pending > 0) {
    a.hero.hp = Math.max(0, a.hero.hp - a.pending);
    a.pending = 0;
  }
}

/* bu turda ne kadar hasar çıkacağını hesapla (henüz uygulama) */
function rollDamage(from, to) {
  const raw = armyAtk(from);
  if (raw <= 0) return 0;
  const soak = armyDef(to) * CFG.defenseFactor;
  let dmg = Math.max(raw * CFG.minDamagePct, raw - soak) * CFG.damageScale;
  dmg *= (1 - CFG.variance/2) + Math.random() * CFG.variance;
  if (from.hero.hp > 0 && Math.random() < from.hero.ultiChance) dmg *= from.hero.ultiMul;
  dmg = Math.max(1, Math.round(dmg));

  /* Hasarı, birlik tiplerinin saldırı payına göre dağıt.
     NOT: Bu bir PAY hesabıdır — hangi birliğin tam olarak kimi vurduğu
     ayrı ayrı izlenmez, katkı oranına göre bölüştürülür. */
  from.units.forEach(u => {
    const pay = (u.atk * u.count) / raw;
    if (pay > 0) from.dealtByUnit[u.unitId] = (from.dealtByUnit[u.unitId] || 0) + dmg * pay;
  });
  return dmg;
}

function pvpSimulate(attackerTroops, attackerHero, defender) {
  /* İKİ TARAFIN da komutan yetenekleri hesaba katılır */
  const atkSkins = (typeof selectedCommanders !== "undefined" && Array.isArray(selectedCommanders))
    ? selectedCommanders.filter(Boolean) : [];
  const defSkins = Array.isArray(defender.commanderSkins) ? defender.commanderSkins : [];
  const abA = buffsOf(atkSkins.length ? atkSkins : [state.selectedHeroSkin]);
  const abD = buffsOf(defSkins);

  const A = makeArmy(attackerTroops, attackerHero, "attacker", abA);
  const D = makeArmy(defender.defTroops, {
    attack:  defender.hero.attack  * CFG.castleAtkBonus,
    defense: defender.hero.defense * CFG.castleDefBonus,
    maxHp:   defender.hero.maxHp   * CFG.castleHpBonus,
    ultiChance: defender.hero.ultiChance,
    ultiMultiplier: defender.hero.ultiMultiplier,
  }, "defender", abD);

  /* ── Karşı tarafı zayıflatan yetenekler ── */
  function weaken(src, tgt) {
    const fl = src.flow;
    if (fl.defShredPct)  tgt.units.forEach(u => u.def = Math.max(0, Math.round(u.def * (1 - fl.defShredPct / 100))));
    if (fl.enemyReducePct) {
      tgt.units.forEach(u => {
        u.atk = Math.max(1, Math.round(u.atk * (1 - fl.enemyReducePct / 100)));
        u.hp  = Math.max(1, Math.round(u.hp  * (1 - fl.enemyReducePct / 100)));
      });
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
  weaken(A, D);
  weaken(D, A);

  /* Savunanın HİÇ birliği yoksa kale savunmasızdır: komutan da
     dövüşmez, saldırana hasar vermez. Böylece boş kaleyi yağmalarken
     hiç birlik kaybetmezsin (kolay hedef). */
  const defenderHasTroops = D.units.reduce((s,u)=>s+u.count,0) > 0;
  if (!defenderHasTroops) { D.hero.atk = 0; D.hero.hp = 0; }

  /* savunanın birlik statlarına kale bonusu */
  D.units.forEach(u => { u.def = Math.round(u.def * CFG.castleDefBonus); u.hp = Math.max(1, Math.round(u.hp * CFG.castleHpBonus)); });

  /* EŞ ZAMANLI tur: iki taraf da tur başındaki güce göre vurur.
     Böylece saldıran taraf "önce vurma" avantajı kazanmaz. */
  let turn = 0;
  /* dondurma: rakip ilk N tur vuramaz */
  let freezeD = A.flow.freezeTurns, freezeA = D.flow.freezeTurns;
  if (freezeD) A.flow.used.freeze = freezeD;
  if (freezeA) D.flow.used.freeze = freezeA;

  while (turn < CFG.maxTurns && armyAlive(A) && armyAlive(D)) {
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

    let dmgAtoD = rollDamage(A, D);
    let dmgDtoA = rollDamage(D, A);

    if (freezeD > 0) { dmgDtoA = 0; freezeD--; }
    if (freezeA > 0) { dmgAtoD = 0; freezeA--; }

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

    A.damageDealt += dmgAtoD + yansiAtoD; damageArmy(D, dmgAtoD + yansiAtoD);
    D.damageDealt += dmgDtoA + yansiDtoA; damageArmy(A, dmgDtoA + yansiDtoA);
  }

  /* kazanan: rakip ordusu tükendiyse; ikisi de ayaktaysa oran karşılaştırması */
  let win;
  if (!armyAlive(D) && armyAlive(A))       win = true;
  else if (!armyAlive(A) && armyAlive(D))  win = false;
  else {
    const ra = armyTroopCount(A) / Math.max(1, A.units.reduce((s,u)=>s+u.start,0));
    const rd = armyTroopCount(D) / Math.max(1, D.units.reduce((s,u)=>s+u.start,0));
    win = ra > rd;
  }

  /* Rakip kayıplarını, benim birliklerimin hasar payına göre bölüştür.
     Yaklaşık bir dağıtımdır — kesin hedef takibi yapılmaz. */
  function attribute(src, tgt) {
    const toplam = Object.keys(src.dealtByUnit).reduce((n, k) => n + src.dealtByUnit[k], 0);
    const cikti = {};
    src.units.forEach(u => { cikti[u.unitId] = { killed: 0, wounded: 0 }; });
    if (toplam <= 0) return cikti;

    const oOldu = Object.keys(tgt.killed).reduce((n, k) => n + tgt.killed[k], 0);
    const oYarali = Object.keys(tgt.wounded).reduce((n, k) => n + tgt.wounded[k], 0);
    const yetenek = Object.keys(src.abilityKills).reduce((n, k) => n + src.abilityKills[k], 0);
    const dagit = Math.max(0, oOldu - yetenek);   /* yetenek kaynaklılar ayrı sayılır */

    let kalanO = dagit, kalanY = oYarali;
    const ids = Object.keys(cikti);
    ids.forEach((uid, i) => {
      const pay = (src.dealtByUnit[uid] || 0) / toplam;
      if (i === ids.length - 1) { cikti[uid].killed = kalanO; cikti[uid].wounded = kalanY; }
      else {
        const k = Math.round(dagit * pay), y = Math.round(oYarali * pay);
        cikti[uid].killed = Math.min(k, kalanO);  kalanO -= cikti[uid].killed;
        cikti[uid].wounded = Math.min(y, kalanY); kalanY -= cikti[uid].wounded;
      }
    });
    return cikti;
  }

  const attribA = attribute(A, D);
  const attribD = attribute(D, A);

  return {
    attackerTroopsUsed: Object.assign({}, attackerTroops || {}),
    attackerAttribution: attribA,
    defenderAttribution: attribD,
    heroFx: {
      attacker: A.flow.used, defender: D.flow.used,
      attackerKills: A.abilityKills, defenderKills: D.abilityKills,
      attackerAbilities: (A.abilities || []).map(x => ({ type: x.type, title: x.title, sources: x.sources })),
      defenderAbilities: (D.abilities || []).map(x => ({ type: x.type, title: x.title, sources: x.sources }))
    },
    win, turns: turn,
    attacker: {
      killed: A.killed, wounded: A.wounded,
      remaining: armyTroopCount(A),
      damageDealt: A.damageDealt, damageTaken: A.damageTaken,
      heroHp: Math.round(A.hero.hp), heroMaxHp: Math.round(A.hero.maxHp),
    },
    defender: {
      killed: D.killed, wounded: D.wounded,
      remaining: armyTroopCount(D),
      damageDealt: D.damageDealt, damageTaken: D.damageTaken,
      heroHp: Math.round(D.hero.hp), heroMaxHp: Math.round(D.hero.maxHp),
    },
  };
}

/* {knight:3} → hastane formatı [{severe:true}, ...] */
function toHospitalFormat(countMap) {
  const out = {};
  Object.keys(countMap || {}).forEach(uid => {
    const n = countMap[uid]; if (!n) return;
    out[uid] = [];
    for (let i = 0; i < n; i++) out[uid].push({ severe: Math.random() < 0.5 });
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
  const btn = document.getElementById("battleBtn");
  if (btn) btn.textContent = "⚔️ Orduyla Saldır";
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
  FRONT_ORDER.forEach(uid => {
    const n = Math.min(num((selectedTroopsForBattle||{})[uid], 0), num((state.troops||{})[uid], 0));
    sel[uid] = Math.max(0, Math.floor(n)); selTotal += sel[uid];
  });
  if (selTotal <= 0) { toast("Yanına en az 1 birlik almalısın!"); return; }

  _running = true;
  btn.disabled = true;
  log.innerHTML = `⚔️ Ordular çarpışıyor...`;
  const arena = document.querySelector(".battle-arena");
  if (arena) { arena.classList.add("shake"); setTimeout(()=>arena.classList.remove("shake"), 350); }
  await new Promise(r => setTimeout(r, 900));

  const myHero = (typeof state.hero === "object") ? state.hero : {};
  const R = pvpSimulate(sel, myHero, enemy);
  /* yetenek tetiklenme sayaçları — savaş raporunda gösterilir */
  const heroFx = R.heroFx || null;

  /* ── KENDİ KAYIPLARIN ── */
  const myKilled = R.attacker.killed, myWounded = R.attacker.wounded;
  Object.keys(myKilled).forEach(uid  => state.troops[uid] = Math.max(0,(state.troops[uid]||0) - myKilled[uid]));
  Object.keys(myWounded).forEach(uid => state.troops[uid] = Math.max(0,(state.troops[uid]||0) - myWounded[uid]));
  if (typeof sendWoundedToHospital === "function") sendWoundedToHospital(toHospitalFormat(myWounded));

  /* genel can */
  const drain = (typeof STAMINA_DRAIN_RATIO !== "undefined") ? STAMINA_DRAIN_RATIO : 0.35;
  const hpLost = Math.max(0, R.attacker.heroMaxHp - R.attacker.heroHp);
  state.stamina.current = Math.max(0, state.stamina.current - Math.max(2, Math.round(hpLost * drain / 10)));

  /* ── GANİMET ── */
  let delta;
  if (R.win) {
    delta = Math.max(CFG.minSteal, Math.min(CFG.maxSteal, Math.round(enemy.diamonds * CFG.winStealPct)));
    state.diamonds += delta;
  } else {
    delta = -Math.min(state.diamonds, CFG.maxLoseCost, Math.round(state.diamonds * CFG.loseCostPct) + 100);
    state.diamonds += delta;
  }
  pvpState().pvpCooldowns[enemy.name.toLowerCase()] = Date.now();

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
    myLosses: { killed: myKilled, wounded: myWounded },
    myAttribution: R.attackerAttribution || null,
    enemyAttribution: R.defenderAttribution || null,
    heroFx: R.heroFx || null,
    enemyLosses: { killed: R.defender.killed, wounded: R.defender.wounded },
    usedTroops: Object.assign({}, sel),
    enemyTroops: Object.assign({}, enemy.realTroops || enemy.troops || {}),
  });
  if (state.battleLogHistory.length > 200) state.battleLogHistory.length = 200;

  /* ── RAKİBE BİLDİR (birlik kayıpları dahil) ── */
  sendRaidReport(enemy, R, delta);

  ["renderBattleLogPanel","renderHospitalPanel","renderTroopsPanel",
   "renderDiamonds","updateShopButtons","renderStamina","persistCurrentState"]
    .forEach(f => { if (typeof window[f] === "function") window[f](); });

  _running = false;
  btn.disabled = (state.stamina.current <= 0);
  /* kazan-kaybet fark etmeksizin 3 saniye sonra panel kapanır */
  setTimeout(() => { if (typeof backToMap === "function") backToMap(); }, 3000);
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

function sendRaidReport(enemy, R, delta) {
  if (!fbOK()) return;
  /* Kendi kalene saldırırsan hem saldıran hem savunan sen olursun ve
     savaş günlüğüne iki kayıt düşer. Kendine bildirim gönderme. */
  const _hedef = enemy.accKey || fbKey(enemy.name);
  if (_hedef && _hedef === myKey()) {
    console.warn("[pvp] kendi kalene saldırı — savunma raporu gönderilmedi");
    return;
  }
  /* robot çarpanı yüzünden fazla kayıp yazılmasın */
  const real = Object.assign({}, enemy.realTroops);
  const killed = clampToReal(R.defender.killed, real);
  FRONT_ORDER.forEach(u => real[u] = Math.max(0, num(real[u],0) - num(killed[u],0)));
  const wounded = clampToReal(R.defender.wounded, real);

  const totalLost = sumMap(killed) + sumMap(wounded);
  const key = enemy.accKey || fbKey(enemy.name);

  /* ── 1) SAVUNANIN KAYDINI DOĞRUDAN GÜNCELLE ──────────────────
     Savunan çevrimdışı olsa bile elması ve birlikleri gerçekten
     azalsın diye accounts/{key}/state üzerinde transaction çalıştırıyoruz.
     Transaction, aynı anda birden çok saldırı gelse bile veriyi
     tutarlı tutar (herkes en güncel değeri okuyup yazar). */
  firebaseDb.ref("accounts/" + key + "/state").transaction(function (st) {
    if (!st) return st;   /* hesap yoksa dokunma */

    if (R.win) {
      const lose = Math.min(num(st.diamonds, 0), Math.max(0, num(delta, 0)));
      st.diamonds = Math.max(0, num(st.diamonds, 0) - lose);
    }
    if (!st.troops) st.troops = {};
    FRONT_ORDER.forEach(uid => {
      const gone = num(killed[uid], 0) + num(wounded[uid], 0);
      if (gone > 0) st.troops[uid] = Math.max(0, num(st.troops[uid], 0) - gone);
    }, function (err, committed) {
    if (err) pvpUyar("Savunanın hesabı güncellenemedi: " + (err.message || err));
    else if (!committed) pvpUyar("Savunanın hesabı bulunamadı, kayıp işlenmedi.");
  });

    /* yaralıları savunanın hastanesine ekle (girince iyileşsinler).
       Oyunun beklediği biçim: { unitId, finishAt, severe, confirmed } */
    if (totalLost > 0 && sumMap(wounded) > 0) {
      if (!Array.isArray(st.hospital)) st.hospital = [];
      FRONT_ORDER.forEach(uid => {
        const d = UT()[uid];
        const recMs = d ? Math.round(d.trainMinutes * 60 * 1000 / 3) : 10 * 60 * 1000;
        for (let i = 0; i < num(wounded[uid], 0); i++) {
          st.hospital.push({
            unitId: uid,
            finishAt: Date.now() + recMs,
            severe: false,
            confirmed: true,     /* saldırıdan gelen yaralı otomatik tedaviye alınır */
            fromRaid: true,
          });
        }
      });
    }
    return st;
  }).catch(e => console.warn("[pvp] savunan kaydı güncellenemedi:", e));

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
    diamondsLost: R.win ? delta : 0,
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
  }) || {};

  try {
    firebaseDb.ref("pvpRaids/" + key).push(bildirim)
      .catch(e => pvpUyar("Savunana rapor GÖNDERİLEMEDİ: " + (e && e.message ? e.message : e)));
  } catch (e) {
    pvpUyar("Rapor gönderimi HATA verdi: " + (e && e.message ? e.message : e));
  }
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
    });
    if (state.battleLogHistory.length > 200) state.battleLogHistory.length = 200;

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
  back.className = "pvp-backdrop";
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
  console.log("[pvp.js] Ordu savaşı sistemi yüklendi ✔");
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
};
})();
