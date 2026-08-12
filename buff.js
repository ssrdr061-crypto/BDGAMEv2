/* ═══════════════════════════════════════════════════════════════
   buff.js — KAHRAMAN GÜÇLENDİRMELERİ (mağaza buffları)
   ---------------------------------------------------------------
   Mağazadan alınan `isBoost:true` ürünleri artık gerçekten savaşa
   giriyor. Akış:

     1) Ürün mağazadan alınır  → çantaya düşer (state.inventory)
     2) Savaş ekranının SAĞ ÜST köşesindeki YEŞİL kutucuğa dokun
     3) Açılan pencerede KULLAN'a bas → buff "hazır" olur ve ürün
        çantadan DÜŞER (aynı ürünü iki kez hazırlayamazsın)
     4) O hazırlıkla girilen İLK savaşta etkisi işler, savaş
        bitince buff tükenir — TEK KULLANIMLIK.

   KİLİT KURAL: KULLAN düğmesi yalnız o buffun kahramanı savaşa
   seçilmişse (selectedCommanders içindeyse) açıktır. Kahraman
   seçili değilse düğme kilitlidir; buff boşa gitmez.

   ── SAVAŞ MOTORUNA BAĞLANTI ────────────────────────────────────
   Bu dosya savaşı KENDİ hesaplamaz. pvp.js ve pve.js şu kapıları
   çağırır (yoksa oyun eskisi gibi çalışır, sessizce kırılmaz):

     BUFF.savasBaslat()      → bu savaşın planını çözer (şans
                               zarları BİR KEZ burada atılır)
     BUFF.plan()             → çözülmüş plan (yoksa null)
     BUFF.yetenekleriBuyut(ab) → "mevcut yeteneği 2 katına çıkar"
     BUFF.orduyaUygula(birimler) → def/can/sayı yüzdeleri
     BUFF.turHasar(tur, robotPay)  → o turda VERİLEN hasar çarpanı
     BUFF.turAlinan(tur)     → o turda ALINAN hasar çarpanı
     BUFF.kayipKirp(kayip, gercek) → hayalet birlik kaybını kırpar
     BUFF.savasBitti()       → buffu tüketir, kutucuğu tazeler
     BUFF.savunmaEk(liste)   → SAVUNANIN hazır buffundan yetenek

   ── ETKİLERİN OKUNUŞU ──────────────────────────────────────────
   "%195 hasar verir"  → hasar ×1.95   (oranın kendisi)
   "%80 FAZLA hasar"   → hasar ×1.80   (1 + oran)
   "savunma ve canı %150 artırır" → o turlarda ALINAN hasar
     ×(1 / (1 + 1.50)). Can ortada değişemez (birim canı ölüm
     eşiğidir; sonradan düşürmek ölmüş birliği diriltirdi), o
     yüzden aynı sonucu veren hasar tarafından uygulanır.
   ═══════════════════════════════════════════════════════════════ */
(function () {
"use strict";

/* ── 1) YARDIMCILAR ──────────────────────────────────────────── */

function ST() { return (typeof state !== "undefined" && state) ? state : null; }
function urunler() { return (typeof shopItems !== "undefined" && Array.isArray(shopItems)) ? shopItems : []; }
function urunBul(ad) { return urunler().find(u => u.name === ad) || null; }
function buffUrunleri() { return urunler().filter(u => u.isBoost && u.effect); }

/* Savaşa seçili komutanlar */
function seciliKomutanlar() {
  try {
    if (typeof selectedCommanders !== "undefined" && Array.isArray(selectedCommanders)) {
      return selectedCommanders.filter(Boolean);
    }
  } catch (e) {}
  const s = ST();
  if (s && Array.isArray(s.selectedCommanders)) return s.selectedCommanders.filter(Boolean);
  return [];
}

function komutanVar(heroId) { return seciliKomutanlar().indexOf(heroId) !== -1; }

/* Hazır buff listesi — state üzerinde yaşar, buluta kendiliğinden gider */
function hazirListe() {
  const s = ST(); if (!s) return [];
  if (!Array.isArray(s.hazirBuff)) s.hazirBuff = [];
  return s.hazirBuff;
}
function hazirMi(ad) { return hazirListe().indexOf(ad) !== -1; }

function cantaAdet(ad) {
  const s = ST();
  return (s && s.inventory && s.inventory[ad]) ? s.inventory[ad] : 0;
}

function kaydet() {
  ["renderInventory", "persistCurrentState"].forEach(f => {
    try { if (typeof window[f] === "function") window[f](); } catch (e) {}
  });
}

function haber(msg) {
  try { if (typeof showToast === "function") showToast(msg); } catch (e) {}
}

/* Dışa aktarma koduna da girsin (bulut zaten tam state'i yazıyor) */
try {
  if (typeof compactStateForExport === "function") {
    const _eskiKisalt = compactStateForExport;
    compactStateForExport = function (s) {
      const out = _eskiKisalt(s);
      if (s && Array.isArray(s.hazirBuff) && s.hazirBuff.length) out.hb = s.hazirBuff;
      return out;
    };
  }
  if (typeof expandCompactState === "function") {
    const _eskiAc = expandCompactState;
    expandCompactState = function (c) {
      const st = _eskiAc(c);
      if (c && Array.isArray(c.hb)) st.hazirBuff = c.hb.slice();
      return st;
    };
  }
} catch (e) { console.warn("[buff] kayıt sarmalama kurulamadı:", e); }

/* ── 2) BUFF HAZIRLAMA / GERİ ALMA ───────────────────────────── */

/* Kullanılabilir mi? Sebebiyle birlikte döner. */
function durum(urun) {
  if (hazirMi(urun.name))            return { ok: false, hazir: true,  sebep: "Zaten hazır" };
  if (cantaAdet(urun.name) <= 0)     return { ok: false, hazir: false, sebep: "Çantanda yok" };
  if (!komutanVar(urun.heroId))      return { ok: false, hazir: false, sebep: (urun.heroName || "Kahraman") + " seçili değil" };
  return { ok: true, hazir: false, sebep: "" };
}

function kullan(ad) {
  const u = urunBul(ad); if (!u || !u.isBoost) return false;
  const d = durum(u);
  if (!d.ok) { haber(d.sebep); return false; }

  const s = ST();
  s.inventory[ad] = Math.max(0, (s.inventory[ad] || 0) - 1);
  if (s.inventory[ad] === 0) delete s.inventory[ad];
  hazirListe().push(ad);

  /* Plan savaş başında çözülür; hazırlık değişince eskisi geçersiz. */
  _plan = null;
  kaydet();
  tazele();
  haber((u.icon || "⭐") + " " + ad + " hazır — sonraki savaşta işleyecek.");
  return true;
}

function geriAl(ad) {
  const i = hazirListe().indexOf(ad);
  if (i === -1) return false;
  hazirListe().splice(i, 1);
  const s = ST();
  s.inventory[ad] = (s.inventory[ad] || 0) + 1;
  _plan = null;
  kaydet();
  tazele();
  haber(ad + " geri alındı.");
  return true;
}

/* ── 3) SAVAŞ PLANI ──────────────────────────────────────────
   Şans zarları savaş başında BİR KEZ atılır. Tur döngüsünde
   atılsaydı aynı savaşta her tur yeniden şans denenirdi. */

let _plan = null;

function planCoz() {
  const liste = hazirListe();
  if (!liste.length) return null;

  const p = {
    kaynaklar: liste.slice(),
    defPct: 0, hpPct: 0, countPct: 0,
    ilkTurKalkan: { tur: 0, oran: 1 },     /* alınan hasar çarpanı */
    periyodikAzalt: { her: 0, oran: 1 },
    rastgeleHasar: { bas: 0, tur: 0, carpan: 1 },
    ilkTurHasar: { tur: 0, carpan: 1 },
    robotPeriyodik: { her: 0, carpan: 1, sans: 0 },
    ciftYetenek: null,
  };

  liste.forEach(ad => {
    const u = urunBul(ad); if (!u || !u.effect) return;
    const e = u.effect;
    switch (e.type) {

      case "boost_troop_def_pct":
        p.defPct += (e.value || 0); break;

      case "boost_total_hp_pct":
        p.hpPct += (e.value || 0); break;

      case "boost_troop_count_pct":
        p.countPct += (e.value || 0); break;

      case "boost_troop_hp_pct_defense_only":
        /* saldırıda işlemez — savunanın tarafında savunmaEk() verir */
        break;

      case "boost_random_turns_damage":
        if (Math.random() * 100 < (e.chance || 0)) {
          p.rastgeleHasar.bas = 1 + Math.floor(Math.random() * 3);   /* 1–3. turda başlar */
          p.rastgeleHasar.tur = e.turns || 1;
          p.rastgeleHasar.carpan = (e.damagePct || 100) / 100;
        }
        break;

      case "boost_first_turns_def_hp":
        if (Math.random() * 100 < (e.chance || 0)) {
          p.ilkTurKalkan.tur = e.turns || 1;
          p.ilkTurKalkan.oran = 1 / (1 + (e.valuePct || 0) / 100);
        }
        break;

      case "boost_periodic_damage_reduce":
        p.periyodikAzalt.her = e.everyTurns || 2;
        p.periyodikAzalt.oran = 1 - (e.reducePct || 0) / 100;
        break;

      case "boost_first_turns_bonus_damage":
        p.ilkTurHasar.tur = e.turns || 1;
        p.ilkTurHasar.carpan = 1 + (e.bonusPct || 0) / 100;
        break;

      case "boost_robot_periodic_damage":
        p.robotPeriyodik.her = e.everyTurns || 3;
        p.robotPeriyodik.carpan = (e.damagePct || 100) / 100;
        p.robotPeriyodik.sans = (e.chance || 100);
        break;

      case "boost_double_ability":
        p.ciftYetenek = e.ability || null; break;

      default:
        console.warn("[buff] bilinmeyen etki türü:", e.type);
    }
  });

  return p;
}

/* Savaş başlıyor — planı çöz ve sakla. */
function savasBaslat() {
  _plan = planCoz();
  return _plan;
}
function plan() { return _plan; }

/* Savaş bitti — hazır buff TÜKENİR. */
function savasBitti() {
  const s = ST();
  const vardi = hazirListe().length > 0;
  if (s) s.hazirBuff = [];
  _plan = null;
  if (vardi) { kaydet(); tazele(); haber("⭐ Güçlendirme kullanıldı."); }
}

/* ── 4) MOTOR KAPILARI ───────────────────────────────────────── */

/* "Mevcut yeteneği 2 katına çıkar" — yetenek listesi motora
   girmeden önce büyütülür. Liste kopyalanır; kaynak dizi
   (abilitiesForSkins çıktısı) bozulmasın. */
function yetenekleriBuyut(ab) {
  const p = _plan;
  if (!p || !p.ciftYetenek || !Array.isArray(ab)) return ab;
  return ab.map(a => {
    if (!a || a.type !== p.ciftYetenek) return a;
    const k = Object.assign({}, a);
    if (typeof k.v === "number")  k.v  = k.v * 2;
    if (typeof k.v2 === "number") k.v2 = k.v2 * 2;
    return k;
  });
}

/* Birim statlarına yüzdeler. pvp.js'te makeArmy'den SONRA,
   taban (floor) hesabından ÖNCE çağrılır. */
function orduyaUygula(birimler) {
  const p = _plan;
  if (!p || !Array.isArray(birimler)) return;
  birimler.forEach(u => {
    if (p.defPct) u.def = Math.max(0, Math.round(u.def * (1 + p.defPct / 100)));
    if (p.hpPct) {
      /* pvp.js'te birim canı `hp`, pve.js'te `hpEach` */
      if (typeof u.hp === "number")     u.hp     = Math.max(1, Math.round(u.hp     * (1 + p.hpPct / 100)));
      if (typeof u.hpEach === "number") u.hpEach = Math.max(1, Math.round(u.hpEach * (1 + p.hpPct / 100)));
    }
    if (p.countPct && u.count > 0) {
      const ek = Math.floor(u.count * p.countPct / 100);
      u.count += ek;
      if (typeof u.start === "number") u.start += ek;
    }
  });
}

/* O turda VERİLEN hasarın çarpanı.
   robotPay: bu turki hasarın robot birliklerden gelen oranı (0–1). */
function turHasar(tur, robotPay) {
  const p = _plan; if (!p) return 1;
  let c = 1;

  if (p.ilkTurHasar.tur && tur <= p.ilkTurHasar.tur) c *= p.ilkTurHasar.carpan;

  if (p.rastgeleHasar.tur &&
      tur >= p.rastgeleHasar.bas &&
      tur <  p.rastgeleHasar.bas + p.rastgeleHasar.tur) {
    c *= p.rastgeleHasar.carpan;
  }

  /* Robot buffu yalnız robotların payını büyütür; ordunun
     tamamını çarpmak robotu olmayan orduyu da güçlendirirdi. */
  if (p.robotPeriyodik.her && tur % p.robotPeriyodik.her === 0) {
    const pay = Math.max(0, Math.min(1, robotPay || 0));
    if (pay > 0 && Math.random() * 100 < p.robotPeriyodik.sans) {
      c *= (1 + pay * (p.robotPeriyodik.carpan - 1));
    }
  }
  return c;
}

/* O turda ALINAN hasarın çarpanı. */
function turAlinan(tur) {
  const p = _plan; if (!p) return 1;
  let c = 1;
  if (p.ilkTurKalkan.tur && tur <= p.ilkTurKalkan.tur) c *= p.ilkTurKalkan.oran;
  if (p.periyodikAzalt.her && tur % p.periyodikAzalt.her === 0) c *= p.periyodikAzalt.oran;
  return c;
}

/* Hayalet birlik kırpması.
   "Paralı Muhafız" savaşa gerçekte olmayan birlik katar. O
   birlikler ölürse oyuncunun envanterinden düşülmemeli — yoksa
   sahip olmadığı birliği kaybeder. Kayıp, savaşa GERÇEKTEN
   götürdüğü sayıyla sınırlanır. */
function kayipKirp(olen, yarali, gercek) {
  const p = _plan;
  if (!p || !p.countPct) return;
  olen = olen || {}; yarali = yarali || {};
  const uids = Object.keys(olen).concat(Object.keys(yarali));
  uids.forEach(uid => {
    const sinir = Math.max(0, Math.floor((gercek || {})[uid] || 0));
    /* Önce ölenler kırpılır, artan pay yaralıdan düşer:
       oyuncu savaşa götürdüğünden fazlasını kaybedemez. */
    if ((olen[uid] || 0) > sinir) olen[uid] = sinir;
    const kalan = Math.max(0, sinir - (olen[uid] || 0));
    if ((yarali[uid] || 0) > kalan) yarali[uid] = kalan;
  });
}

/* SAVUNANIN hazır buffu → yetenek listesine eklenecek girdiler.
   Yalnız "savunmada" işleyen buff türü buradan girer; savunan
   oyuncu çevrimdışı olduğu için planı saldıranın istemcisi çözer. */
function savunmaEk(hazir) {
  const out = [];
  (Array.isArray(hazir) ? hazir : []).forEach(ad => {
    const u = urunBul(ad);
    if (!u || !u.effect) return;
    if (u.effect.type === "boost_troop_hp_pct_defense_only") {
      out.push({ type: "troop_hp_pct", v: u.effect.value || 0,
                 title: u.name, sources: [u.name] });
    }
  });
  return out;
}

/* ── 5) GÖRÜNÜM — savaş ekranı köşesindeki yeşil kutucuk ────── */

const CSS = `
#buffKutu{
  position:absolute; top:10px; right:10px; z-index:40;
  display:flex; align-items:center; gap:5px;
  padding:6px 10px; border-radius:12px; cursor:pointer;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:12px;
  color:#eaffef; letter-spacing:.3px; border:2px solid #7ff0a8;
  background:linear-gradient(180deg,#2fbb62 0%,#1c8544 60%,#12602f 100%);
  box-shadow:0 4px 0 #0c3d1f, 0 8px 14px rgba(0,40,15,.45),
             inset 0 2px 3px rgba(180,255,205,.5);
  text-shadow:0 1px 2px rgba(0,30,10,.6);
}
#buffKutu:active{ transform:translateY(2px); box-shadow:0 2px 0 #0c3d1f; }
#buffKutu .bk-ico{ font-size:15px; }
#buffKutu .bk-rozet{
  min-width:16px; text-align:center; border-radius:8px; padding:0 4px;
  background:#ffd257; color:#153a22; font-size:11px;
}
#buffKutu.bk-hazir{ animation:bkNabiz 1.3s ease-in-out infinite; }
@keyframes bkNabiz{ 50%{ box-shadow:0 4px 0 #0c3d1f, 0 0 16px rgba(120,255,170,.9),
                          inset 0 2px 3px rgba(180,255,205,.5); } }

.bk-mask{
  position:fixed; inset:0; z-index:9000; display:flex;
  align-items:center; justify-content:center; padding:16px;
  background:rgba(4,18,10,.55);
}
.bk-card{
  width:min(340px,92vw); max-height:76vh; overflow-y:auto;
  border-radius:16px; padding:12px 12px 14px;
  background:linear-gradient(180deg,#14432a 0%,#0d2c1c 100%);
  border:2px solid #48c07a; box-shadow:0 14px 30px rgba(0,20,8,.6);
  font-family:'Baloo 2','Nunito',sans-serif; color:#eaffef;
}
.bk-card h3{ margin:0 0 2px; font-size:15px; color:#b6ffd0; text-align:center; }
.bk-alt{ text-align:center; font-size:10.5px; color:#8fd8ab; margin-bottom:8px; }
.bk-satir{
  display:flex; align-items:center; gap:8px; margin-bottom:7px;
  padding:7px 8px; border-radius:11px;
  background:rgba(255,255,255,.07); border:1px solid rgba(120,230,165,.3);
}
.bk-satir.bk-acik{ border-color:#7ff0a8; background:rgba(90,235,150,.14); }
.bk-ikon{ font-size:22px; flex:0 0 auto; }
.bk-orta{ flex:1 1 auto; min-width:0; }
.bk-ad{ font-size:12.5px; font-weight:800; color:#fff; }
.bk-kahraman{ font-size:10px; color:#9fe3ff; }
.bk-aciklama{ font-size:10.5px; color:#cfe9d8; line-height:1.3; margin-top:2px; }
.bk-btn{
  flex:0 0 auto; border:0; cursor:pointer; border-radius:9px;
  padding:7px 11px; font-family:inherit; font-weight:800; font-size:11.5px;
  color:#0d2c1c; background:linear-gradient(180deg,#8dffb9,#33c46e);
  box-shadow:0 3px 0 #14713c;
}
.bk-btn:active{ transform:translateY(2px); box-shadow:0 1px 0 #14713c; }
.bk-btn:disabled{ background:#4d6355; color:#a9bdae; box-shadow:none; cursor:not-allowed; }
.bk-btn.bk-geri{ background:linear-gradient(180deg,#ffd9a1,#e8a545); box-shadow:0 3px 0 #96601c; }
.bk-bos{ text-align:center; font-size:11.5px; color:#9dd3b0; padding:14px 4px; }
.bk-kapat{
  width:100%; margin-top:6px; border:0; border-radius:10px; cursor:pointer;
  padding:8px; font-family:inherit; font-weight:800; font-size:12px;
  color:#eaffef; background:rgba(255,255,255,.12);
}
`;

(function stilKur() {
  if (document.getElementById("buffStil")) return;
  const st = document.createElement("style");
  st.id = "buffStil";
  st.textContent = CSS;
  document.head.appendChild(st);
})();

/* Kutucuk savaş ekranının içine oturur. Arena kabı arazi paneli
   tarafından devralınabildiği için (index.html'deki _ARAZI_DEVIR)
   her tazelemede GÜNCEL #battleArena aranır. */
function arenaKabi() {
  const arena = document.getElementById("battleArena");
  if (!arena) return null;
  const ic = arena.querySelector(".battle-arena") || arena;
  const kon = getComputedStyle(ic).position;
  if (kon === "static") ic.style.position = "relative";
  return ic;
}

function tazele() {
  const kap = arenaKabi();
  if (!kap) return;

  /* Çantada buff yoksa ve hazır da yoksa kutucuk hiç görünmesin. */
  const sahip = buffUrunleri().filter(u => cantaAdet(u.name) > 0);
  const hazir = hazirListe();
  let kutu = document.getElementById("buffKutu");

  if (!sahip.length && !hazir.length) { if (kutu) kutu.remove(); return; }

  if (!kutu) {
    kutu = document.createElement("div");
    kutu.id = "buffKutu";
    kutu.addEventListener("click", (e) => { e.stopPropagation(); pencereAc(); });
    kap.appendChild(kutu);
  } else if (kutu.parentElement !== kap) {
    kap.appendChild(kutu);
  }

  kutu.classList.toggle("bk-hazir", hazir.length > 0);
  kutu.innerHTML =
    '<span class="bk-ico">⭐</span><span>GÜÇLENDİRME</span>' +
    '<span class="bk-rozet">' + (hazir.length ? hazir.length + " ✓" : sahip.length) + '</span>';
}

function pencereKapat() {
  const m = document.querySelector(".bk-mask");
  if (m) m.remove();
}

function pencereAc() {
  pencereKapat();

  const mask = document.createElement("div");
  mask.className = "bk-mask";
  const card = document.createElement("div");
  card.className = "bk-card";
  mask.appendChild(card);

  const sahip = buffUrunleri().filter(u => cantaAdet(u.name) > 0 || hazirMi(u.name));

  let html = '<h3>⭐ Güçlendirmeler</h3>' +
             '<div class="bk-alt">Tek kullanımlık — bir sonraki savaşta işler.</div>';

  if (!sahip.length) {
    html += '<div class="bk-bos">Çantanda güçlendirme yok.<br>Mağazadan alabilirsin.</div>';
  } else {
    sahip.forEach(u => {
      const d = durum(u);
      const adet = cantaAdet(u.name);
      const btn = d.hazir
        ? '<button class="bk-btn bk-geri" data-geri="' + u.name + '">GERİ AL</button>'
        : '<button class="bk-btn" data-kullan="' + u.name + '"' + (d.ok ? "" : " disabled") + '>KULLAN</button>';
      html +=
        '<div class="bk-satir' + (d.hazir ? ' bk-acik' : '') + '">' +
          '<div class="bk-ikon">' + (u.icon || "⭐") + '</div>' +
          '<div class="bk-orta">' +
            '<div class="bk-ad">' + u.name + (adet > 1 ? ' ×' + adet : '') + '</div>' +
            '<div class="bk-kahraman">🦸 ' + (u.heroName || "") +
              (d.hazir ? ' · <b style="color:#8dffb9">HAZIR</b>'
                       : (d.ok ? '' : ' · ' + d.sebep)) + '</div>' +
            '<div class="bk-aciklama">' + (u.boostDesc || "") + '</div>' +
          '</div>' + btn +
        '</div>';
    });
  }
  html += '<button class="bk-kapat">Kapat</button>';
  card.innerHTML = html;

  card.querySelectorAll("[data-kullan]").forEach(b =>
    b.addEventListener("click", () => { if (kullan(b.dataset.kullan)) { pencereKapat(); pencereAc(); } }));
  card.querySelectorAll("[data-geri]").forEach(b =>
    b.addEventListener("click", () => { if (geriAl(b.dataset.geri)) { pencereKapat(); pencereAc(); } }));
  card.querySelector(".bk-kapat").addEventListener("click", pencereKapat);
  mask.addEventListener("click", e => { if (e.target === mask) pencereKapat(); });

  document.body.appendChild(mask);

  /* Tuzak 12 — hayalet tıklama: kutucuğa dokunuşun devamı olan
     click, yeni açılan pencereye düşüp anında kapatmasın. */
  mask.style.pointerEvents = "none";
  setTimeout(() => { mask.style.pointerEvents = ""; }, 350);
}

/* ── 6) OYUNA BAĞLAN ─────────────────────────────────────────── */

/* Savaş ekranı açılınca ve komutan seçimi değişince kutucuk tazelenir.
   Sarmalanan fonksiyonlar yoksa sessizce atlanır. */
function sarmala(ad) {
  try {
    const esk = window[ad];
    if (typeof esk !== "function" || esk._buffSarildi) return;
    const yeni = function () {
      const r = esk.apply(this, arguments);
      try { tazele(); } catch (e) {}
      return r;
    };
    yeni._buffSarildi = true;
    window[ad] = yeni;
  } catch (e) { console.warn("[buff] sarmalanamadı:", ad, e); }
}

function kur() {
  ["selectEnemyFromMap", "renderHeroPickerForBattle", "renderInventory"].forEach(sarmala);
  tazele();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", kur);
else kur();

/* Arena kapanınca pencere de kapansın */
document.addEventListener("click", function (e) {
  const t = e.target;
  if (t && (t.id === "mapBackBtn" || t.id === "battleBtn")) pencereKapat();
}, true);

/* ── 7) DIŞA AÇILANLAR ───────────────────────────────────────── */

window.BUFF = {
  SURUM: 1,
  /* motor kapıları */
  savasBaslat: savasBaslat,
  plan: plan,
  savasBitti: savasBitti,
  yetenekleriBuyut: yetenekleriBuyut,
  orduyaUygula: orduyaUygula,
  turHasar: turHasar,
  turAlinan: turAlinan,
  kayipKirp: kayipKirp,
  savunmaEk: savunmaEk,
  /* arayüz */
  tazele: tazele,
  ac: pencereAc,
  kullan: kullan,
  geriAl: geriAl,
  hazir: hazirListe,
  /* teşhis — telefonda konsol yok, tek satır özet */
  tani: function () {
    const r = {
      hazir: hazirListe().slice(),
      seciliKomutanlar: seciliKomutanlar(),
      cantadaki: buffUrunleri().filter(u => cantaAdet(u.name) > 0).map(u => u.name + "×" + cantaAdet(u.name)),
      plan: _plan,
    };
    console.log("[buff] TANI", r);
    return r;
  },
};

})();
