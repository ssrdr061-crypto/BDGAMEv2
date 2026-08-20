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
     BUFF.hasarCarpanlari(tur) → o turda VERİLEN hasarın AİLE
                               bazında çarpanları (knight/soldier/robot)
     BUFF.alinanCarpanlari(tur) → o turda ALINAN hasarın aile bazında
                               oranları (oran<1 = az hasar)
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
   atılsaydı aynı savaşta her tur yeniden şans denenirdi.

   ── BİRİM HEDEFİ (yeni) ─────────────────────────────────────
   magaza.js'teki her buffun `effect.birim` alanı vardır:
   "knight" (Savunucu) · "soldier" (Koruyucu) · "robot" (Nişancı).
   Buff YALNIZ o aileye işler. Alan boşsa eski davranış sürer
   (tüm orduya işler) — eski kayıtlar bozulmasın diye.
   Kademe kimlikleri (knight2 … robot6) aileye indirgenir.        */

const AILELER = ["knight", "soldier", "robot"];

/* "knight3" → "knight"; pvp.js'teki AILE ile aynı iş.
   Burada kendi kopyası var: buff.js pvp.js'ten önce de yüklenebilir. */
function _aile(id) { return String(id || "").replace(/\d+$/, ""); }

/* Efektin hedef ailesi. Tanımsız/geçersizse null = tüm ordu. */
function hedefAile(e) {
  const b = String((e && e.birim) || "");
  return AILELER.indexOf(b) !== -1 ? b : null;
}

function bosAile() { return { knight: 0, soldier: 0, robot: 0 }; }

/* Yüzdeyi hedef aileye (ya da hepsine) ekle */
function aileEkle(kap, aile, deger) {
  if (!deger) return;
  if (aile) kap[aile] += deger;
  else AILELER.forEach(a => kap[a] += deger);
}

let _plan = null;

function planCoz() {
  const liste = hazirListe();
  if (!liste.length) return null;

  const p = {
    kaynaklar: liste.slice(),
    /* statik yüzdeler — aile bazında */
    defPct:   bosAile(),
    hpPct:    bosAile(),
    countPct: bosAile(),
    /* tur bazlı çarpanlar — her girdi kendi ailesini taşır
       { aile, carpan, bas, son }  ya da  { aile, carpan, her }   */
    verilen: [],   /* VERİLEN hasar çarpanları */
    alinan:  [],   /* ALINAN hasar çarpanları (oran<1 = az hasar) */
    ciftYetenek: null,
    /* Savaş raporunun DETAYLAR ekranı için: hazırlanan her buff bir
       satır. `aktif` = şans zarı tuttu mu (zarsız buff'larda hep true). */
    rapor: [],
  };

  liste.forEach(ad => {
    const u = urunBul(ad); if (!u || !u.effect) return;
    const e = u.effect;
    const A = hedefAile(e);
    /* Şansa bağlı buff'larda zar tutmadıysa false'a çekilir. Rapor
       satırı yine yazılır — oyuncu hazırladığı buff'ın tutmadığını da
       görsün, satırın hiç çıkmaması "kayboldu mu" hissi veriyor. */
    let basarili = true;

    switch (e.type) {

      case "boost_troop_def_pct":
        aileEkle(p.defPct, A, e.value || 0); break;

      case "boost_total_hp_pct":
        aileEkle(p.hpPct, A, e.value || 0); break;

      case "boost_troop_count_pct":
        aileEkle(p.countPct, A, e.value || 0); break;

      case "boost_troop_hp_pct_defense_only":
        /* saldırıda işlemez — savunanın tarafında savunmaEk() verir */
        break;

      /* STELLİN · Titanyum Tozu: %45 şansla 3 tur boyunca %200 hasar */
      case "boost_random_turns_damage": {
        if (Math.random() * 100 >= (e.chance || 0)) { basarili = false; break; }
        const bas = 1 + Math.floor(Math.random() * 3);            /* 1–3. turda başlar */
        p.verilen.push({ aile: A, carpan: (e.damagePct || 100) / 100,
                         bas: bas, son: bas + (e.turns || 1) - 1 });
        break;
      }

      /* İlk N tur fazla hasar */
      case "boost_first_turns_bonus_damage":
        p.verilen.push({ aile: A, carpan: 1 + (e.bonusPct || 0) / 100,
                         bas: 1, son: (e.turns || 1) });
        break;

      /* MİKİAN · Destek Bilgi: %25 şansla SAVAŞ BOYU %50 fazla hasar.
         Bu tür eskiden switch'te YOKTU — hiç işlemiyordu. */
      case "boost_bonus_damage":
        if (Math.random() * 100 < (e.chance != null ? e.chance : 100)) {
          p.verilen.push({ aile: A, carpan: 1 + (e.bonusPct || 0) / 100,
                           bas: 1, son: Infinity });
        } else basarili = false;
        break;

      /* REVOLİA · Ek Bağlantı: her 3 turda bir %195 hasar.
         Zar savaş başında BİR KEZ atılır (eskiden her turda atılıyordu). */
      case "boost_robot_periodic_damage":
        if (Math.random() * 100 < (e.chance != null ? e.chance : 100)) {
          p.verilen.push({ aile: A, carpan: (e.damagePct || 100) / 100,
                           her: e.everyTurns || 3 });
        } else basarili = false;
        break;

      /* STELLİN · Tank Güdüsü: %60 şansla ilk 3 tur savunma+can %40.
         Can ortada değiştirilemediği için ALINAN hasar tarafında. */
      case "boost_first_turns_def_hp":
        if (Math.random() * 100 < (e.chance || 0)) {
          p.alinan.push({ aile: A, oran: 1 / (1 + (e.valuePct || 0) / 100),
                          bas: 1, son: (e.turns || 1) });
        } else basarili = false;
        break;

      /* MİKİAN · Perdeleme: %50 şansla her 2 turda bir alınan hasar
         yarıya iner, en çok 4 kez. `chance` ve `maxTurns` eskiden
         okunmuyordu — buff her savaşta ve süresiz işliyordu. */
      case "boost_periodic_damage_reduce":
        if (Math.random() * 100 < (e.chance != null ? e.chance : 100)) {
          p.alinan.push({ aile: A, oran: 1 - (e.reducePct || 0) / 100,
                          her: e.everyTurns || 2,
                          kalan: (e.maxTurns != null ? e.maxTurns : Infinity) });
        } else basarili = false;
        break;

      case "boost_double_ability":
        p.ciftYetenek = e.ability || null; break;

      default:
        console.warn("[buff] bilinmeyen etki türü:", e.type);
    }

    p.rapor.push(raporSatiri(u, basarili));
  });

  return p;
}

/* Savaş raporunun DETAYLAR ekranında gösterilecek satır.
   Kahraman yetenek satırlarıyla aynı biçim: kimin, hangi görsel,
   ne yaptığı. `aktif` yanlışsa satır "—" gösterir. */
function raporSatiri(u, aktif) {
  return {
    ad:       u.name,
    heroId:   u.heroId || "",
    heroName: u.heroName || "",
    gorsel:   u.gorsel || "",
    aciklama: u.boostDesc || "",
    aktif:    !!aktif,
  };
}

/* Saldıranın bu savaşta hazırladığı buff satırları. */
function raporSatirlari() {
  const p = _plan;
  return (p && Array.isArray(p.rapor)) ? p.rapor.slice() : [];
}

/* SAVUNANIN buff satırları. Savunanda yalnız "yalnızca savunmada"
   işleyen tür geçerlidir (savunmaEk ile aynı süzgeç); diğerleri
   savunurken hiç çalışmaz, raporda da görünmemeli. */
function savunmaRapor(hazir) {
  const out = [];
  (Array.isArray(hazir) ? hazir : []).forEach(ad => {
    const u = urunBul(ad);
    if (!u || !u.effect) return;
    if (u.effect.type === "boost_troop_hp_pct_defense_only") out.push(raporSatiri(u, true));
  });
  return out;
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
   taban (floor) hesabından ÖNCE çağrılır.
   Artık her birim YALNIZ kendi ailesinin yüzdesini alır. */
function orduyaUygula(birimler) {
  const p = _plan;
  if (!p || !Array.isArray(birimler)) return;
  birimler.forEach(u => {
    const a = _aile(u.unitId);
    const dp = p.defPct[a]   || 0;
    const hp = p.hpPct[a]    || 0;
    const cp = p.countPct[a] || 0;

    if (dp) u.def = Math.max(0, Math.round(u.def * (1 + dp / 100)));
    if (hp) {
      /* pvp.js'te birim canı `hp`, pve.js'te `hpEach` */
      if (typeof u.hp === "number")     u.hp     = Math.max(1, Math.round(u.hp     * (1 + hp / 100)));
      if (typeof u.hpEach === "number") u.hpEach = Math.max(1, Math.round(u.hpEach * (1 + hp / 100)));
    }
    if (cp && u.count > 0) {
      const ek = Math.floor(u.count * cp / 100);
      u.count += ek;
      if (typeof u.start === "number") u.start += ek;
    }
  });
}

/* Bir tur girdisi bu turda işliyor mu? */
function _turUyuyor(e, tur) {
  if (e.her) return (tur % e.her === 0);
  return (tur >= (e.bas || 1) && tur <= (e.son != null ? e.son : Infinity));
}

/* O turda VERİLEN hasarın AİLE BAZINDA çarpanları.
   Dönen: { knight:1, soldier:1.5, robot:1 } ya da null (buff yok).
   Motor bunu toplam hasarı çarpmak için değil, KAYNAK PAYLARINI
   çarpmak için kullanır — böylece fazla hasar gerçekten o aileden
   çıkar ve raporda da ona yazılır. */
function hasarCarpanlari(tur) {
  const p = _plan; if (!p || !p.verilen.length) return null;
  let out = null;
  p.verilen.forEach(e => {
    if (!_turUyuyor(e, tur)) return;
    if (e.kalan != null) { if (e.kalan <= 0) return; e.kalan--; }
    if (!out) out = { knight: 1, soldier: 1, robot: 1 };
    if (e.aile) out[e.aile] *= e.carpan;
    else        AILELER.forEach(a => out[a] *= e.carpan);
  });
  return out;
}

/* O turda ALINAN hasarın AİLE BAZINDA oranları (oran<1 = az hasar).
   Motor bunu, o ailenin canını 1/oran kadar geçici yükselterek
   uygular — "alınan hasarı yarıya indirmek" ile "canı iki katına
   çıkarmak" aynı şeydir, ama can birim bazında tutulduğu için
   ikincisi TEK BİR AİLEYE uygulanabilir. */
function alinanCarpanlari(tur) {
  const p = _plan; if (!p || !p.alinan.length) return null;
  let out = null;
  p.alinan.forEach(e => {
    if (!_turUyuyor(e, tur)) return;
    if (e.kalan != null) { if (e.kalan <= 0) return; e.kalan--; }
    if (!out) out = { knight: 1, soldier: 1, robot: 1 };
    if (e.aile) out[e.aile] *= e.oran;
    else        AILELER.forEach(a => out[a] *= e.oran);
  });
  return out;
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
      /* `aile` alanını pvp.js'teki applyTroopBuffs okur; boşsa
         eskisi gibi tüm orduya işler. */
      out.push({ type: "troop_hp_pct", v: u.effect.value || 0,
                 aile: hedefAile(u.effect),
                 title: u.name, sources: [u.name] });
    }
  });
  return out;
}

/* ── 5) GÖRÜNÜM — savaş ekranı köşesindeki yeşil kutucuk ────── */

const CSS = `
/* Kutucuk KARE ve panelin SOL alt köşesinde, SAVAŞA GİR düğmesiyle
   aynı hizada durur.
   Kap position:relative + kutu position:absolute olduğu için
   kutu satırda YER KAPLAMAZ — düğme eskisi gibi tam ortada kalır.
   (İlk denemede kutu akışın içindeydi ve düğmeyi sağa itiyordu.) */
.bk-satirKap{
  position:relative !important;
  display:flex !important; align-items:center; justify-content:center;
  width:100%;
}
#buffKutu{
  user-select:none; -webkit-user-select:none; -webkit-touch-callout:none;
  position:absolute; left:6px; top:50%; transform:translateY(-50%); z-index:40;
  width:62px; height:62px; box-sizing:border-box;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:1px; padding:4px; border-radius:14px; cursor:pointer;
  font-family:'Baloo 2','Nunito',sans-serif; font-weight:800;
  line-height:1.05; text-align:center;
  color:#eaffef; letter-spacing:.2px; border:none;
  background:linear-gradient(180deg,#2fbb62 0%,#1c8544 60%,#12602f 100%);
  box-shadow:0 2px 6px rgba(0,20,45,.3);
  text-shadow:0 1px 2px rgba(0,20,45,.55);
  transition:transform .09s, filter .09s;
}
#buffKutu:active{ transform:translateY(-50%) scale(.96); filter:brightness(.93); }
#buffKutu .bk-ico{ font-size:20px; line-height:1; }
#buffKutu .bk-yazi{ font-size:9px; }
/* Rozet: rakam ortada dursun diye satır yüksekliğiyle değil
   flex ile ortalanır — line-height + kenarlık rakamı aşağı kaydırıyordu. */
#buffKutu .bk-rozet{
  position:absolute; top:-7px; right:-7px;
  width:20px; height:20px; padding:0;
  display:flex; align-items:center; justify-content:center;
  border-radius:10px;
  background:#ffd257; color:#153a22; font-size:11px; line-height:1;
  border:2px solid #12602f;
}
#buffKutu.bk-hazir{ animation:bkNabiz 1.3s ease-in-out infinite; }
@keyframes bkNabiz{ 50%{ filter:brightness(1.18); } }

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
  color:#eaffef;
}
/* Yazı tipi ve METİN SEÇİMİ tüm alt öğelere birden verilir.
   Seçim kapatılmazsa düğmeye basılı tutunca telefon metni seçiyor,
   kopyala balonu çıkıyordu. */
.bk-card, .bk-card *{
  font-family:'Baloo 2','Nunito',sans-serif !important;
  user-select:none; -webkit-user-select:none; -webkit-touch-callout:none;
}
.bk-card h3{ margin:0 0 8px; font-size:15px; color:#b6ffd0; text-align:center; }
.bk-satir{
  display:flex; align-items:center; gap:8px; margin-bottom:7px;
  padding:7px 8px; border-radius:11px;
  background:rgba(255,255,255,.07); border:1px solid rgba(120,230,165,.3);
}
.bk-satir.bk-acik{ border-color:#7ff0a8; background:rgba(90,235,150,.14); }
.bk-ikon{
  font-size:22px; flex:0 0 auto;
  width:38px; height:38px;
  display:flex; align-items:center; justify-content:center;
}
/* Mağazadaki ürün görseli — magaza.js'teki gorsel alanından gelir.
   Dosya yoksa onerror emojiye döner (aşağıda, pencereAc içinde). */
.bk-ikon img{ width:100%; height:100%; object-fit:contain; display:block; }
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

/* Kutucuk artık SAVAŞA GİR düğmesiyle aynı satırda duruyor.
   Düğme, ilk seferde bir esnek satır kabına (.bk-satirKap) alınır;
   kutucuk onun soluna girer. Kap bir kez kurulur, sonraki
   tazelemelerde yeniden sarılmaz.
   Not: arena kabı arazi paneli tarafından devralınabildiği için
   (index.html'deki _ARAZI_DEVIR) her tazelemede GÜNCEL düğme
   aranır. */
function satirKabi() {
  const arena = document.getElementById("battleArena");
  if (!arena) return null;
  const btn = arena.querySelector("#battleBtn, .battle-btn");
  if (!btn) return null;

  let kap = btn.parentElement;
  if (!kap || !kap.classList.contains("bk-satirKap")) {
    kap = document.createElement("div");
    kap.className = "bk-satirKap";
    btn.parentElement.insertBefore(kap, btn);
    kap.appendChild(btn);
  }
  return kap;
}

function tazele() {
  const kap = satirKabi();
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
  }
  /* Düğmenin SOLUNDA dursun (kap içindeki ilk çocuk) */
  if (kutu.parentElement !== kap || kap.firstElementChild !== kutu) {
    kap.insertBefore(kutu, kap.firstElementChild);
  }

  kutu.classList.toggle("bk-hazir", hazir.length > 0);
  kutu.innerHTML =
    '<span class="bk-ico">⭐</span>' +
    '<span class="bk-yazi">BUFF</span>' +
    '<span class="bk-rozet">' + (hazir.length ? hazir.length + "✓" : sahip.length) + '</span>';
}

function pencereKapat() {
  const m = document.querySelector(".bk-mask");
  if (m) m.remove();
}

/*  Pencerenin İÇERİĞİ ayrı bir fonksiyondur.
    Sebebi: KULLAN'a basınca eskiden pencere komple kapanıp yeniden
    açılıyordu; kaydırma sıfırlanıp liste en başa zıplıyordu. Artık
    aynı kutunun içi yeniden çizilir ve kaydırma yerinde bırakılır.  */
function icerikCiz(card) {
  const kaydirma = card.scrollTop;

  /* YALNIZ SAVAŞA ALDIĞIN KAHRAMANLARIN BUFFLARI.
     Hazır olan bir buff, kahramanı yuvadan çıkarılsa bile listede
     kalır — yoksa GERİ AL düğmesine ulaşılamaz, buff çantada
     kilitli kalırdı. */
  const sahip = buffUrunleri().filter(u =>
    (cantaAdet(u.name) > 0 && komutanVar(u.heroId)) || hazirMi(u.name)
  );

  let html = '<h3>⭐ Güçlendirmeler</h3>';

  if (!sahip.length) {
    html += '<div class="bk-bos">Yanına aldığın kahramanların güçlendirmesi yok.<br>' +
            'Önce komutan seç ya da mağazadan güçlendirme al.</div>';
  } else {
    sahip.forEach(u => {
      const d = durum(u);
      const adet = cantaAdet(u.name);
      const btn = d.hazir
        ? '<button class="bk-btn bk-geri" data-geri="' + u.name + '">GERİ AL</button>'
        : '<button class="bk-btn" data-kullan="' + u.name + '"' + (d.ok ? "" : " disabled") + '>KULLAN</button>';
      /* Görsel magaza.js'teki `gorsel` alanından; yoksa/açılmazsa emoji. */
      const yedek = (u.icon || "⭐").replace(/'/g, "");
      const gorsel = u.gorsel
        ? '<img src="' + u.gorsel + '" alt="" onerror="this.onerror=null;this.replaceWith(document.createTextNode(\'' + yedek + '\'))">'
        : yedek;
      html +=
        '<div class="bk-satir' + (d.hazir ? ' bk-acik' : '') + '">' +
          '<div class="bk-ikon">' + gorsel + '</div>' +
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
    b.addEventListener("click", () => { if (kullan(b.dataset.kullan)) icerikCiz(card); }));
  card.querySelectorAll("[data-geri]").forEach(b =>
    b.addEventListener("click", () => { if (geriAl(b.dataset.geri)) icerikCiz(card); }));
  card.querySelector(".bk-kapat").addEventListener("click", pencereKapat);

  card.scrollTop = kaydirma;
}

function pencereAc() {
  pencereKapat();

  const mask = document.createElement("div");
  mask.className = "bk-mask";
  const card = document.createElement("div");
  card.className = "bk-card";
  mask.appendChild(card);

  icerikCiz(card);
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
  SURUM: 2,
  /* motor kapıları */
  savasBaslat: savasBaslat,
  plan: plan,
  savasBitti: savasBitti,
  yetenekleriBuyut: yetenekleriBuyut,
  orduyaUygula: orduyaUygula,
  hasarCarpanlari: hasarCarpanlari,
  raporSatirlari: raporSatirlari,
  savunmaRapor: savunmaRapor,
  alinanCarpanlari: alinanCarpanlari,
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
