/* ═══════════════════════════════════════════════════════════════════
   sefer.js  —  YOLA ÇIKMA (yürüyüş) SİSTEMİ
   -------------------------------------------------------------------
   Canavara / kaleye / (ileride) kaynak noktasına saldırırken savaş
   ARTIK ANINDA ÇÖZÜLMEZ. Birlik yola çıkar, haritada hedefe doğru
   ">>" çizgisi belirir, sol üstte geri sayan bir sayaç durur. Süre
   dolunca savaş gerçek koduyla (startBattle / runPvpBattle) koşar,
   sonra birlikler geri yürür.

   ── NEDEN BÖYLE YAZILDI (dokunmadan önce oku) ──────────────────────

   1) SAVAŞ MANTIĞI KOPYALANMADI. Ne PvE ne PvP formülü buraya
      taşınmadı. Sefer varınca gerçek "Savaşa Gir" düğmesine programlı
      dokunulur ve savaşı yine kendi kodu çözer. OKU-BENI'deki uyarı
      (bir özelliği ayrı dosyaya taşıyıp window'dan devralmak sessizce
      kırılır) tam olarak bundan kaçınmak için dinlendi.

   2) DÜĞMEYİ NASIL YAKALIYORUZ. index.html savaş düğmesine
      safeBind(...,"click") ile, pvp.js ise AYNI düğmeye capture
      aşamasında "pointerup"+"click" ile bağlanıyor. Aynı elemandaki
      capture dinleyicileri kayıt sırasına göre çalışır, bu dosya
      pvp.js'ten sonra yüklendiği için oraya bağlanmak İŞE YARAMAZDI.
      Çözüm: dinleyici DOCUMENT üzerinde capture aşamasında duruyor —
      document capture, hedef elemandaki capture'dan HER ZAMAN önce
      çalışır. Düğmenin id'si ("battleBtn") değişirse bu dosya sessizce
      devre dışı kalır ve savaş eskisi gibi anında çözülür.

   3) VARIŞTA OLAY GÖNDERİMİ TÜRE GÖRE FARKLI:
        PvE  → sadece "click"    (safeBind click bekliyor)
        PvP  → sadece "pointerup" (pvp.js önce pointerup'ı yakalıyor)
      İKİSİNİ BİRDEN göndermek PvP'de savaşı İKİ KEZ çözer
      (runPvpBattle içindeki _running kilidi eşzamansız değil, ilk
      çağrı bitince hemen açılıyor). Buraya "garanti olsun" diye
      ikinci olay eklenmemeli.

   4) BİRLİKLER YOLDAYKEN NEREDE. Yola çıkarken state.troops'tan
      DÜŞÜLÜR (yoksa aynı 72 şövalye üç sefere birden gider). Varışta
      savaştan hemen önce geri eklenir, savaş kayıpları düşürür,
      ardından HAYATTA KALANLAR dönüş yolu için tekrar düşülür.
      Hayatta kalan sayısı, savaş öncesi/sonrası state.troops farkından
      çıkarılır — bu sırada eğitim kuyruğundan birlik teslim olursa
      sayım şaşabilir, o yüzden fark 0..gönderilen aralığına kırpılıyor.

   5) SÜRE KAYDEDİLİR, GERİ SAYIM DEĞİL. Sefer listesinde mutlak
      bitisAt damgası tutulur (hastane zinciri ile aynı mantık), böylece
      oyuncu sayfayı yenilese de sefer yoluna devam eder. Liste state'in
      İÇİNDE DEĞİL, kendi localStorage anahtarındadır — sebebi "VERİ"
      başlığındaki uzun notta.

   6) ÇİZGİ KENDİ KARE DÖNGÜSÜNDE. harita.js'in dugumleriYerlestir'i
      SARMALANMADI: o fonksiyon dosya içinden adıyla çağrılıyor, dışarıdan
      üzerine yazılan sürüm çalışmaz (füze aylarca bu yüzden kırıktı).
      Bunun yerine sefer varken requestAnimationFrame ile her karede
      HARITA.ekranKonumu sorulup çizgi yeniden konumlanıyor.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
"use strict";

/* ── AYARLAR ─────────────────────────────────────────────────────── */
const CFG = {
  /* Oyunun ızgarası 0–30 (Firebase verisi böyle). Bir karo bu kadar
     saniye sürer. 30 karoluk çapraz uç ~ 6 dk civarı olur. */
  saniyeKaroBasi: 14,
  enAzSaniye: 25,          /* çok yakın hedefte de bir yürüyüş hissi kalsın */
  enCokSaniye: 25 * 60,
  maxSefer: 3,             /* aynı anda kaç sefer */
  donusCarpani: 1.0,       /* dönüş yolu gidişin kaç katı */
  elmasDk: 10,             /* hızlandırma: kalan her dakika için elmas */
  cizgiRenk: "#7fe3ff",
  cizgiRenkDonus: "#9ad48f",
};

const ISIM = { canavar: "Sefer", kale: "Baskın", kaynak: "Toplama" };

/* ── KISA YARDIMCILAR ────────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }
function say(v, d) { return (typeof v === "number" && isFinite(v)) ? v : (d || 0); }
function toast(m) { if (typeof showToast === "function") showToast(m); }
function H() { return (window.HARITA && typeof window.HARITA.ekranKonumu === "function") ? window.HARITA : null; }

/* money() pvp.js'in kendi kapsamında — buradan çağrılamaz (OKU-BENI, tuzak 11) */
function elmasYaz(n) { return Number(n || 0).toLocaleString("tr-TR"); }

function sureYaz(ms) {
  const t = Math.max(0, Math.round(ms / 1000));
  const sa = Math.floor(t / 3600), dk = Math.floor((t % 3600) / 60), sn = t % 60;
  const iki = n => String(n).padStart(2, "0");
  return sa > 0 ? `${sa}:${iki(dk)}:${iki(sn)}` : `${iki(dk)}:${iki(sn)}`;
}

function kaydet() {
  seferleriYaz();
  if (typeof persistCurrentState === "function") persistCurrentState();
}

/* ── VERİ ────────────────────────────────────────────────────────
   SEFERLER state İÇİNDE TUTULMAZ. Kendi localStorage anahtarında
   durur. Sebebi ciddi:

   queueCloudSave hesabı Firebase'e .set() ile yazıyor. Firebase,
   veride TEK BİR undefined bulursa yazmanın tamamını reddeder ve
   bunu SENKRON throw ederek yapar — o throw index.html'deki
   "catch (e) { console.warn('Bulut senkron hatasi') }" içinde
   sessizce yutulur. Sefer nesnesi state'e konunca (örneğin boş
   komutan yuvası yüzünden) bulut kaydı tamamen susuyordu.

   Bunun bedeli kale kaybı oluyordu: bulutta kalenin ESKİ konumu
   kalınca _doluNoktalar aynı kaleyi iki ayrı noktada görüyor,
   fixOverlappingCastle bunu çakışma sanıp kaleyi rastgele bir yere
   taşıyordu. Sefer verisi state'e GERİ KONMAMALI. */
const DEPO_ONEK = "sefer_v1_";

let _seferler = null;
let _seferSahibi = null;

function depoAnahtari() {
  const u = (typeof currentUsername === "string" && currentUsername) ? currentUsername.toLowerCase() : "";
  return u ? (DEPO_ONEK + u) : null;
}

function liste() {
  const anahtar = depoAnahtari();
  if (!anahtar) return [];
  if (_seferler && _seferSahibi === anahtar) return _seferler;

  /* hesap değişti ya da ilk okuma */
  _seferSahibi = anahtar;
  _seferler = [];
  try {
    const ham = localStorage.getItem(anahtar);
    const veri = ham ? JSON.parse(ham) : null;
    if (Array.isArray(veri)) _seferler = veri;
  } catch (e) { _seferler = []; }
  return _seferler;
}

function seferleriYaz() {
  const anahtar = depoAnahtari();
  if (!anahtar || !_seferler) return;
  try { localStorage.setItem(anahtar, JSON.stringify(_seferler)); } catch (e) {}
}

function kaleKonumu() {
  if (typeof state === "object" && state && state.castle && typeof state.castle.gx === "number") {
    return { gx: state.castle.gx, gy: state.castle.gy };
  }
  return null;
}

function mesafeSuresi(gx1, gy1, gx2, gy2) {
  const d = Math.hypot(gx2 - gx1, gy2 - gy1);
  const sn = Math.min(CFG.enCokSaniye, Math.max(CFG.enAzSaniye, d * CFG.saniyeKaroBasi));
  return Math.round(sn * 1000);
}

/* Seferin ŞU ANKİ ızgara konumu — çizgi ve kamera bunu kullanır. */
function anlikKonum(s) {
  const t = (s.bitisAt <= s.basAt) ? 1
          : Math.max(0, Math.min(1, (Date.now() - s.basAt) / (s.bitisAt - s.basAt)));
  return {
    gx: s.basGx + (s.hedGx - s.basGx) * t,
    gy: s.basGy + (s.hedGy - s.basGy) * t,
    t: t
  };
}

/* ── KALE KOORDİNATI ÇÖZME ───────────────────────────────────────
   pvp.js'in buildDefender'ı savunan oyuncunun KONUMUNU döndürmüyor:
   nesnede gx/gy yok, sadece "mapX: 0, mapY: 0" var. Bu yüzden hedef
   koordinatı doğrudan currentEnemy'den okunamaz — okumaya çalışınca
   0,0 çıkar ve her baskın ızgaranın sol üst köşesine yürür.

   Gerçek konum haritadaki kale düğümünde duruyor: index.html
   castleNodeHTML'i data-cname / data-cx / data-cy yazıyor, pvp.js de
   dokunuşu oradan okuyor. Biz de aynı kaynaktan alıyoruz.
   Düğüm haritada değilse (uzak kale, harita tazelenmiş) otherCastles
   listesine düşülür. İkisi de yoksa konum bilinmiyordur ve sefer
   BAŞLATILMAZ — 0,0'a ordu yollamaktansa eski davranış iyidir. */
function kaleKoordinati(ad) {
  const hedefAd = String(ad || "").toLowerCase();
  if (!hedefAd) return null;

  const mapEl = $("battleMap");
  if (mapEl) {
    const dugumler = mapEl.querySelectorAll(".castle-node[data-cname]");
    for (let i = 0; i < dugumler.length; i++) {
      const ds = dugumler[i].dataset;
      if (String(ds.cname || "").toLowerCase() !== hedefAd) continue;
      const gx = parseFloat(ds.cx), gy = parseFloat(ds.cy);
      if (isFinite(gx) && isFinite(gy)) return { gx: gx, gy: gy };
    }
  }

  try {
    if (typeof otherCastles !== "undefined" && Array.isArray(otherCastles)) {
      const k = otherCastles.find(c =>
        c && c.name && String(c.name).toLowerCase() === hedefAd &&
        c.castle && isFinite(c.castle.gx));
      if (k) return { gx: k.castle.gx, gy: k.castle.gy };
    }
  } catch (e) {}

  return null;
}

/* ── SEFER BAŞLATMA ──────────────────────────────────────────────── */
/* opt: { tur, hedefAd, hedefGx, hedefGy, birlikler, komutanlar, pvpHedef } */
function baslat(opt) {
  const kale = kaleKonumu();
  if (!kale) { toast("Önce kaleni yerleştir."); return false; }

  const aktif = liste();
  if (aktif.length >= CFG.maxSefer) {
    toast(`En fazla ${CFG.maxSefer} sefer aynı anda yolda olabilir.`);
    return false;
  }

  /* Birlikleri envanterden düş — yoldayken evde sayılmasınlar */
  const birlikler = {};
  let toplam = 0;
  Object.keys(opt.birlikler || {}).forEach(uid => {
    const n = Math.max(0, Math.floor(say(opt.birlikler[uid], 0)));
    const eldeki = Math.max(0, Math.floor(say((state.troops || {})[uid], 0)));
    const gider = Math.min(n, eldeki);
    if (gider > 0) { birlikler[uid] = gider; toplam += gider; }
  });
  if (toplam <= 0) return false;

  Object.keys(birlikler).forEach(uid => {
    state.troops[uid] = Math.max(0, say(state.troops[uid], 0) - birlikler[uid]);
  });

  const sure = mesafeSuresi(kale.gx, kale.gy, opt.hedefGx, opt.hedefGy);
  const simdi = Date.now();

  /* Taşınma denetimi bu andan itibaren geçerli. Senkronlanmazsa,
     sefer yokken yapılmış eski bir taşıma "az önce taşındı" sanılıp
     yeni sefer daha ilk karede iptal edilir. */
  _sonKaleGx = kale.gx; _sonKaleGy = kale.gy;

  aktif.push({
    id: "s" + simdi + "_" + Math.floor(Math.random() * 1000),
    tur: opt.tur || "canavar",
    hedefAd: String(opt.hedefAd || "Hedef"),
    yon: "gidis",
    basGx: kale.gx, basGy: kale.gy,
    hedGx: opt.hedefGx, hedGy: opt.hedefGy,
    varisGx: opt.hedefGx, varisGy: opt.hedefGy,   /* savaşın olacağı yer */
    basAt: simdi, bitisAt: simdi + sure,
    birlikler: birlikler,
    komutanlar: (opt.komutanlar || []).filter(x => typeof x === "string" && x),
    pvpHedef: opt.pvpHedef || null,
    savasti: false,
  });

  kaydet();
  yenile(["renderTroopsPanel", "renderTroopSelector"]);
  panelCizIste(true);
  dongudeKal();

  const dk = Math.round(sure / 60000), sn = Math.round(sure / 1000) % 60;
  toast(`⚔️ ${opt.hedefAd} yolunda — ${dk > 0 ? dk + " dk " : ""}${sn} sn`);
  return true;
}

function yenile(adlar) {
  adlar.forEach(f => { if (typeof window[f] === "function") { try { window[f](); } catch (e) {} } });
}

/* ── VARIŞ ───────────────────────────────────────────────────────── */
let _savasKilidi = false;   /* aynı anda tek varış savaşı çözülsün */
let _kilitBekci = 0;

/* Kilit AÇILMAZSA sefer sonsuza kadar "00:00"da donar ve birlikler
   ne savaşır ne eve döner. Savaş kurulumunda beklenmedik bir hata
   çıkarsa diye kilidi 30 sn sonra zorla açan bir bekçi var. */
function kilitle() {
  _savasKilidi = true;
  clearTimeout(_kilitBekci);
  _kilitBekci = setTimeout(() => { _savasKilidi = false; }, 30000);
}
function kilitAc() {
  _savasKilidi = false;
  clearTimeout(_kilitBekci);
}

function varis(s) {
  if (s.yon === "donus") { eveDondu(s); return; }
  if (_savasKilidi) return;             /* sıradaki sefer bir sonraki tick'te */
  kilitle();
  try { savasaGir(s); }
  catch (e) { kilitAc(); iptalEt(s, "Savaş kurulamadı"); }
}

function eveDondu(s) {
  Object.keys(s.birlikler || {}).forEach(uid => {
    state.troops[uid] = say(state.troops[uid], 0) + s.birlikler[uid];
  });
  sil(s.id);
  kaydet();
  yenile(["renderTroopsPanel", "renderTroopSelector", "renderHospitalPanel"]);
  toast(`🏰 ${s.hedefAd} seferindeki birliklerin kaleye döndü.`);
}

function sil(id) {
  const a = liste();
  const i = a.findIndex(x => x.id === id);
  if (i >= 0) a.splice(i, 1);
  panelCizIste(true);
}

/* Savaşı GERÇEK koduna çözdür — SAVAŞ EKRANI AÇILMADAN.

   ── selectEnemyFromMap ÇAĞIRMA ──
   O fonksiyon savaş ekranını açıyor VE selectedTroopsForBattle'ı
   sıfırlıyor. Varışta çağrılınca oyuncuya "yanına alacağın birlikler"
   menüsü ikinci kez gösteriliyordu. Birlik zaten yola çıkarken
   seçiliyor; burada sadece currentEnemy'yi elle oturtuyoruz.

   ── PvE'de OLAY GÖNDERİLMEZ ──
   index.html'deki safeBind(id,"click",...) aslında "click" DEĞİL,
   PointerEvent varsa "pointerup" bağlıyor (safeBind gövdesine bak).
   Bu yüzden düğmeye click göndermek startBattle'ı hiç çağırmıyordu:
   sefer varıyor, savaş olmuyor, 20 sn sonra iptal yolu birlikleri eve
   yolluyordu. Artık startBattle doğrudan çağrılıyor — async olduğu
   için bitişini yoklamaya da gerek yok.

   ── PvP'de OLAY GÖNDERİLİR ──
   runPvpBattle pvp.js'in kapalı kapsamında, dışarı açılmamış. Tek
   erişim yolu düğmeye "pointerup" göndermek (pvp.js capture aşamasında
   onu dinliyor). Bunun için ekranın AÇIK olması gerekmiyor; runPvpBattle
   sadece #battleLog'a yazıyor. Buraya bir de "click" eklenmemeli:
   pvp.js ikisini de dinliyor ve savaş İKİ KEZ çözülür. */
let _izin = false;   /* true iken kesici gönderdiğimiz olayı geçirir */

function savasaGir(s) {
  /* 1) birlikleri geçici olarak eve al ki savaş kodu onları görsün */
  Object.keys(s.birlikler || {}).forEach(uid => {
    state.troops[uid] = say(state.troops[uid], 0) + s.birlikler[uid];
  });
  const oncesi = Object.assign({}, state.troops);

  /* 2) komutan ve birlik seçimini seferin anlık görüntüsüne çevir */
  try {
    if (typeof selectedCommanders !== "undefined" && Array.isArray(s.komutanlar) && s.komutanlar.length) {
      selectedCommanders = s.komutanlar.slice();
    }
  } catch (e) {}
  try { selectedTroopsForBattle = Object.assign({}, s.birlikler); } catch (e) {}

  if (s.tur === "kale") { pvpVur(s, oncesi); }
  else                  { pveVur(s, oncesi); }
}

function pveVur(s, oncesi) {
  const e = (typeof enemies !== "undefined") ? enemies.find(x => x.name === s.hedefAd) : null;
  if (!e || typeof window.startBattle !== "function") {
    kilitAc(); iptalEt(s, "Hedef bulunamadı"); return;
  }
  try { currentEnemy = e; } catch (err) { kilitAc(); iptalEt(s, "Hedef oturmadı"); return; }

  Promise.resolve()
    .then(() => window.startBattle())
    .then(() => { savasBitti(s, oncesi); })
    .catch(() => { kilitAc(); iptalEt(s, "Savaş çözülemedi"); });
}

function pvpVur(s, oncesi) {
  const btn = $("battleBtn");
  if (!btn || !s.pvpHedef) { kilitAc(); iptalEt(s, "Rakip bulunamadı"); return; }
  try { currentEnemy = s.pvpHedef; } catch (err) { kilitAc(); iptalEt(s, "Rakip oturmadı"); return; }

  const gunlukOnce = (state.battleLogHistory || []).length;

  _izin = true;
  try {
    if (window.PointerEvent) {
      btn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
    } else {
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }
  } catch (e) {}
  _izin = false;

  /* runPvpBattle senkron biter ama içinde bekleme olabilir; günlüğe
     kayıt düşmesini kısa süre yokluyoruz. */
  let kalan = 25;   /* ~5 sn */
  (function bekle() {
    if ((state.battleLogHistory || []).length > gunlukOnce) { savasBitti(s, oncesi); return; }
    if (--kalan <= 0) { kilitAc(); iptalEt(s, "Savaş çözülemedi"); return; }
    setTimeout(bekle, 200);
  })();
}

/* Savaş çözüldü: hayatta kalanları dönüş yoluna koy */
function savasBitti(s, oncesi) {
  const hayatta = {};
  let toplam = 0;
  Object.keys(s.birlikler).forEach(uid => {
    const gonderilen = s.birlikler[uid];
    const kayip = Math.max(0, say(oncesi[uid], 0) - say((state.troops || {})[uid], 0));
    const kaldi = Math.max(0, Math.min(gonderilen, gonderilen - kayip));
    if (kaldi > 0) { hayatta[uid] = kaldi; toplam += kaldi; }
  });

  s.savasti = true;

  if (toplam <= 0) {
    sil(s.id);
    kaydet();
    kilitAc();
    yenile(["renderTroopsPanel", "renderTroopSelector"]);
    return;
  }

  /* dönüş yolu için tekrar envanterden düş */
  Object.keys(hayatta).forEach(uid => {
    state.troops[uid] = Math.max(0, say(state.troops[uid], 0) - hayatta[uid]);
  });

  donuseGec(s, hayatta);
  kilitAc();
  kaydet();
  yenile(["renderTroopsPanel", "renderTroopSelector"]);
}

function donuseGec(s, birlikler) {
  const kale = kaleKonumu();
  const su = anlikKonum(s);
  const bas = { gx: su.gx, gy: su.gy };
  const hed = kale || { gx: s.basGx, gy: s.basGy };
  const sure = Math.round(mesafeSuresi(bas.gx, bas.gy, hed.gx, hed.gy) * CFG.donusCarpani);

  s.yon = "donus";
  s.birlikler = birlikler;
  s.basGx = bas.gx; s.basGy = bas.gy;
  s.hedGx = hed.gx; s.hedGy = hed.gy;
  s.basAt = Date.now();
  s.bitisAt = s.basAt + sure;
  panelCizIste(true);
  dongudeKal();
}

/* Savaş kurulamadıysa birlikleri hemen eve yolla — asla yutma */
function iptalEt(s, sebep) {
  toast(`${s.hedefAd}: ${sebep} — birlikler dönüyor.`);
  donuseGec(s, Object.assign({}, s.birlikler));
  kaydet();
  yenile(["renderTroopsPanel", "renderTroopSelector"]);
}

/* ── GERİ ÇAĞIRMA / HIZLANDIRMA ──────────────────────────────────── */
function geriCagir(id) {
  const s = liste().find(x => x.id === id);
  if (!s) return;
  if (s.yon === "donus") { toast("Zaten dönüş yolunda."); return; }
  donuseGec(s, Object.assign({}, s.birlikler));
  kaydet();
  toast(`↩️ ${s.hedefAd} seferi geri çağrıldı.`);
}

function hizlandirmaUcreti(s) {
  const kalan = Math.max(0, s.bitisAt - Date.now());
  return Math.max(1, Math.ceil(kalan / 60000) * CFG.elmasDk);
}

function hizlandir(id) {
  const s = liste().find(x => x.id === id);
  if (!s) return;
  const ucret = hizlandirmaUcreti(s);
  if (say(state.diamonds, 0) < ucret) { toast(`Yetersiz elmas — ${elmasYaz(ucret)} gerekiyor.`); return; }
  state.diamonds -= ucret;
  s.bitisAt = Date.now();
  kaydet();
  yenile(["renderDiamonds", "updateShopButtons"]);
  panelCizIste(true);
  toast("⚡ Sefer hızlandırıldı.");
}

/* Sefer kartına dokununca açılan küçük pencere.
   Gövde oyunun kendi .overlay-card'ı, kapatma .overlay-close —
   tema elle taklit EDİLMEZ (OKU-BENI, hastane notu). */
function seferPenceresi(id) {
  const s = liste().find(x => x.id === id);
  if (!s) return;
  const eski = document.querySelector(".sefer-modal");
  if (eski) eski.remove();

  const kok = document.createElement("div");
  kok.className = "sefer-modal";
  /* FONT: gövdeye Baloo 2 açıkça yazılıyor ve düğmelerde .battle-btn
     KULLANILMIYOR — o sınıf font-family:'Cinzel',serif taşıyor ve
     pencereye serif yazı sızdırıyordu. Oyunun ana fontu Baloo 2. */
  kok.style.cssText =
    "position:fixed; inset:0; z-index:9000; display:flex; align-items:center; " +
    "justify-content:center; background:rgba(0,10,25,.6); padding:20px; " +
    "font-family:'Baloo 2','Nunito',sans-serif;";

  const donus = (s.yon === "donus");
  const birlikYazi = Object.keys(s.birlikler).map(uid => {
    const d = (typeof UNIT_TYPES !== "undefined" && UNIT_TYPES[uid]) ? UNIT_TYPES[uid] : null;
    return (d ? d.icon + d.name : uid) + " x" + s.birlikler[uid];
  }).join(", ") || "—";

  const dugmeStil =
    "flex:1; padding:12px 10px; border-radius:12px; cursor:pointer; " +
    "font-family:'Baloo 2','Nunito',sans-serif; font-weight:800; font-size:13.5px; " +
    "color:#eaf6ff; border:2px solid rgba(190,240,255,.55); " +
    "background:linear-gradient(180deg,#1fa3ea,#0e6fc0); " +
    "box-shadow:0 6px 16px -6px rgba(0,20,45,.6);";

  kok.innerHTML = `
    <div class="overlay-card" style="max-width:340px; width:100%; position:relative;
         font-family:'Baloo 2','Nunito',sans-serif;">
      <button class="overlay-close" type="button">✕</button>
      <h2 style="justify-content:center;">${donus ? "↩️ Dönüş Yolunda" : "⚔️ " + (ISIM[s.tur] || "Sefer")}</h2>
      <div style="text-align:center; font-size:14px; font-weight:700; margin-bottom:6px;">${s.hedefAd}</div>
      <div style="text-align:center; font-size:24px; font-weight:800;" class="sefer-modal-sure">--:--</div>
      <div style="font-size:12.5px; font-weight:600; opacity:.85; margin:10px 0; text-align:center;">${birlikYazi}</div>
      <div style="display:flex; gap:8px; margin-top:12px;">
        ${donus ? "" : `<button class="sefer-geri" type="button" style="${dugmeStil}">↩️ Geri Çağır</button>`}
        <button class="sefer-hizli" type="button" style="${dugmeStil}">💎 <span class="sefer-ucret">0</span></button>
      </div>
    </div>`;

  /* HAYALET TIKLAMA: pencere dokunuşla açılıyor, parmak kalkınca gelen
     click bu pencerede "Geri Çağır"a basıyordu (OKU-BENI, tuzak 12). */
  kok.style.pointerEvents = "none";
  setTimeout(() => { kok.style.pointerEvents = ""; }, 350);
  document.body.appendChild(kok);

  const kapat = () => { clearInterval(sayac); kok.remove(); };
  const sayac = setInterval(() => {
    const canli = liste().find(x => x.id === id);
    if (!canli) { kapat(); return; }
    const sEl = kok.querySelector(".sefer-modal-sure");
    if (sEl) sEl.textContent = sureYaz(canli.bitisAt - Date.now());
    const uEl = kok.querySelector(".sefer-ucret");
    if (uEl) uEl.textContent = elmasYaz(hizlandirmaUcreti(canli));
  }, 250);

  const bagla = (sec, fn) => {
    const el = kok.querySelector(sec);
    if (!el) return;
    if (typeof bindTap === "function") bindTap(el, fn);
    else el.addEventListener("click", fn);
  };
  bagla(".overlay-close", kapat);
  bagla(".sefer-geri", () => { geriCagir(id); kapat(); });
  bagla(".sefer-hizli", () => { hizlandir(id); kapat(); });
  kok.addEventListener("click", e => { if (e.target === kok) kapat(); });
}

/* ── SOL ÜST SAYAÇ PANELİ ────────────────────────────────────────── */
/* Saniyede bir çizilir. İmza değişmedikçe yeniden ÇİZİLMEZ — yoksa
   parmağın altındaki kart her saniye yok edilir (hastane paneliyle
   aynı desen). İmza "v1|" önekli: liste boşalınca boş dizge olup
   "değişmedi" sanılmasın. */
let _panelImza = null;

function panelCizIste(zorla) { if (zorla) _panelImza = null; }

function panelKok() {
  let el = $("seferPanel");
  if (el) return el;
  const dunya = $("worldScreen");
  if (!dunya) return null;
  el = document.createElement("div");
  el.id = "seferPanel";
  el.style.cssText =
    "position:absolute; left:10px; top:52px; z-index:19; " +
    "display:flex; flex-direction:column; gap:5px; pointer-events:none;";
  dunya.appendChild(el);
  return el;
}

function panelCiz() {
  const el = panelKok();
  if (!el) return;
  const a = liste();

  const imza = "v1|" + a.map(s => s.id + ":" + s.yon + ":" + Math.round(s.bitisAt / 1000)).join(",");
  if (imza !== _panelImza) {
    _panelImza = imza;
    el.innerHTML = a.map((s, i) => {
      const donus = (s.yon === "donus");
      const renk = donus ? CFG.cizgiRenkDonus : CFG.cizgiRenk;
      return `<div class="sefer-kart" data-sid="${s.id}" style="
          pointer-events:auto; display:flex; align-items:center; gap:6px;
          background:rgba(6,22,44,.78); border:2px solid ${renk};
          border-radius:999px; padding:4px 10px;
          font-family:'Baloo 2','Nunito',sans-serif; font-size:12.5px;
          font-weight:800; color:#eaf6ff; white-space:nowrap;
          box-shadow:0 6px 16px -6px rgba(0,20,45,.6);">
          <span>${donus ? "↩️" : "⚔️"}</span>
          <span>Birlik ${i + 1}</span>
          <span class="sefer-kalan" style="color:${renk};">--:--</span>
        </div>`;
    }).join("");

    el.querySelectorAll(".sefer-kart").forEach(kart => {
      const sid = kart.dataset.sid;
      if (typeof bindTap === "function") bindTap(kart, () => seferPenceresi(sid));
      else kart.addEventListener("click", () => seferPenceresi(sid));
    });
  }

  /* Süreler her saniye yerinde güncellenir, kart yeniden kurulmaz */
  const kartlar = el.querySelectorAll(".sefer-kart");
  a.forEach((s, i) => {
    const k = kartlar[i];
    if (!k) return;
    const sp = k.querySelector(".sefer-kalan");
    if (!sp) return;
    const kalan = s.bitisAt - Date.now();
    /* Vardı ama savaş henüz çözülüyor: donmuş "00:00" yerine durum yaz */
    sp.textContent = (kalan <= 0 && s.yon === "gidis") ? "çarpışıyor…" : sureYaz(kalan);
  });

  el.style.display = a.length ? "flex" : "none";
}

/* ── HARİTADAKİ YOL ÇİZGİSİ VE İŞARETLER ─────────────────────────
   Konumlar PİKSEL — HARITA.ekranKonumu'ndan gelir; yüzde kullanılırsa
   zoom'da kayar. Her şey #battleMap (düğüm katmanı) içinde durur;
   renderBattleMap katmanı tazelerse elemanlar kopar, geri takılır.

   ── NEDEN SVG DEĞİL ──
   İşaretler önce SVG <text>/<circle> ile çiziliyordu. İki ayrı sorun
   çıktı: <text> + dominant-baseline:middle Android'de glifi y'den
   kaydırarak bastığı için işaretler çizginin DIŞINDA duruyordu, ve
   transform ile taşınan eleman hızlı kaydırmada ayrı katmanda
   birleştirilip bir kare geriden geldiği için savruluyordu.

   Artık işaretler, oyunun düğümleri için zaten kullandığı kanıtlanmış
   desenle konumlanıyor: left/top PİKSEL + translate(-50%,-50%).
   Konum yerleşimden gelir, transform yalnızca merkezleme ve DÖNDÜRME
   yapar — döndürme elemanı yerinden oynatmaz. Sadece yol çizgisi SVG
   <line> olarak kaldı; o x1/y1/x2/y2 ile çizildiği için zaten sorunsuz.

   Buraya SVG <text> geri gelmemeli. */
const _cizimler = Object.create(null);   /* sefer id → elemanlar */
const CHEVRON_ADET = 6;
const CHEVRON_HIZ  = 1.6;   /* saniyede kaç karo ilerlesin (akış hızı) */

function katman() {
  const mapEl = $("battleMap");
  if (!mapEl) return null;

  let sv = $("seferKatman");
  if (!sv || !sv.isConnected || sv.parentNode !== mapEl) {
    if (sv && sv.parentNode) sv.parentNode.removeChild(sv);
    sv = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    sv.id = "seferKatman";
    sv.setAttribute("style",
      "position:absolute; left:0; top:0; width:100%; height:100%; " +
      "overflow:visible; pointer-events:none; z-index:1;");
    mapEl.appendChild(sv);
  }

  let kat = $("seferIsaretler");
  if (!kat || !kat.isConnected || kat.parentNode !== mapEl) {
    if (kat && kat.parentNode) kat.parentNode.removeChild(kat);
    kat = document.createElement("div");
    kat.id = "seferIsaretler";
    kat.style.cssText =
      "position:absolute; left:0; top:0; width:100%; height:100%; " +
      "pointer-events:none; z-index:2;";
    mapEl.appendChild(kat);
    /* katman yeniden doğduysa eski eleman göndermeleri geçersiz */
    Object.keys(_cizimler).forEach(k => delete _cizimler[k]);
  }

  return { sv: sv, kat: kat };
}

function cizimKur(sv, kat, id) {
  const cizgi = document.createElementNS("http://www.w3.org/2000/svg", "line");
  cizgi.setAttribute("stroke-linecap", "round");
  cizgi.setAttribute("stroke-opacity", ".45");
  sv.appendChild(cizgi);

  const yeniKutu = (ekStil) => {
    const d = document.createElement("div");
    d.style.cssText = "position:absolute; left:0; top:0; " +
      "font-family:'Baloo 2','Nunito',sans-serif; line-height:1; " +
      "white-space:nowrap; pointer-events:none; " + (ekStil || "");
    kat.appendChild(d);
    return d;
  };

  const chevronlar = [];
  for (let i = 0; i < CHEVRON_ADET; i++) {
    const c = yeniKutu("font-weight:800;");
    c.textContent = "\u00BB";
    chevronlar.push(c);
  }

  const damga  = yeniKutu("border-radius:50%; background:rgba(6,22,44,.85); " +
                          "display:flex; align-items:center; justify-content:center;");
  const etiket = yeniKutu("font-weight:800; text-shadow:0 0 3px rgba(0,10,25,.95), " +
                          "0 0 3px rgba(0,10,25,.95);");

  const kayit = { cizgi, chevronlar, damga, etiket };
  _cizimler[id] = kayit;
  return kayit;
}

/* left/top ile yerleştir, transform SADECE merkezleme + döndürme */
function yerlestir(el, x, y, derece) {
  el.style.left = x + "px";
  el.style.top  = y + "px";
  el.style.transform = "translate(-50%,-50%)" + (derece == null ? "" : " rotate(" + derece + "deg)");
}

function cizgileriCiz() {
  const h = H();
  const kk = katman();
  if (!h || !kk) return;

  const a = liste();

  /* biten seferlerin elemanlarını topla */
  const yasayan = Object.create(null);
  a.forEach(s => yasayan[s.id] = true);
  Object.keys(_cizimler).forEach(id => {
    if (yasayan[id]) return;
    const k = _cizimler[id];
    if (k) {
      if (k.cizgi && k.cizgi.parentNode) k.cizgi.parentNode.removeChild(k.cizgi);
      k.chevronlar.forEach(c => { if (c.parentNode) c.parentNode.removeChild(c); });
      if (k.damga  && k.damga.parentNode)  k.damga.parentNode.removeChild(k.damga);
      if (k.etiket && k.etiket.parentNode) k.etiket.parentNode.removeChild(k.etiket);
    }
    delete _cizimler[id];
  });

  const simdi = Date.now();

  a.forEach(s => {
    const k = _cizimler[s.id] || cizimKur(kk.sv, kk.kat, s.id);

    const bas = h.ekranKonumu(s.basGx, s.basGy);
    const hed = h.ekranKonumu(s.hedGx, s.hedGy);
    const su  = anlikKonum(s);
    const sp  = h.ekranKonumu(su.gx, su.gy);

    const renk = (s.yon === "donus") ? CFG.cizgiRenkDonus : CFG.cizgiRenk;
    const zoom = bas.zoom || 1;
    const aci  = Math.atan2(hed.y - bas.y, hed.x - bas.x) * 180 / Math.PI;

    /* yol çizgisi */
    k.cizgi.setAttribute("x1", bas.x);
    k.cizgi.setAttribute("y1", bas.y);
    k.cizgi.setAttribute("x2", hed.x);
    k.cizgi.setAttribute("y2", hed.y);
    k.cizgi.setAttribute("stroke", renk);
    k.cizgi.setAttribute("stroke-width", Math.max(1.2, 2 * zoom));
    k.cizgi.setAttribute("stroke-dasharray", (6 * zoom) + " " + (6 * zoom));

    /* Akan işaretler.
       HIZ KARO CİNSİNDEN sabit. Önce bütün yolu 1.6 saniyede dolaşan
       bir kesir kullanılıyordu: uzun seferlerde işaretler ok gibi
       fırlıyordu. Şimdi uzunluk ne olursa olsun aynı hızda akıyorlar. */
    const uzunlukKaro = Math.max(0.001, Math.hypot(s.hedGx - s.basGx, s.hedGy - s.basGy));
    const donguSn = uzunlukKaro / CHEVRON_HIZ / CHEVRON_ADET;
    const adim = 1 / CHEVRON_ADET;
    const kayma = ((simdi / 1000) / Math.max(0.001, donguSn) % 1) * adim;
    const chevronBoy = Math.max(9, 13 * zoom);

    for (let i = 0; i < CHEVRON_ADET; i++) {
      const t = (i * adim + kayma) % 1;
      const el = k.chevronlar[i];
      yerlestir(el, bas.x + (hed.x - bas.x) * t, bas.y + (hed.y - bas.y) * t, aci);
      el.style.color = renk;
      el.style.opacity = (0.25 + 0.55 * Math.sin(Math.PI * t)).toFixed(2);
      el.style.fontSize = chevronBoy + "px";
    }

    /* birlik damgası + kalan süre */
    const cap = Math.max(12, 17 * zoom);
    yerlestir(k.damga, sp.x, sp.y);
    k.damga.style.width  = cap + "px";
    k.damga.style.height = cap + "px";
    k.damga.style.border = Math.max(1.2, 2 * zoom) + "px solid " + renk;
    k.damga.style.fontSize = Math.max(8, 10 * zoom) + "px";
    const istenen = (s.yon === "donus") ? "\u21A9" : "\u2694";
    if (k.damga.textContent !== istenen) k.damga.textContent = istenen;

    yerlestir(k.etiket, sp.x, sp.y - cap * 0.75 - 6 * zoom);
    k.etiket.style.color = renk;
    k.etiket.style.fontSize = Math.max(9, 11 * zoom) + "px";
    const yazi = sureYaz(s.bitisAt - simdi);
    if (k.etiket.textContent !== yazi) k.etiket.textContent = yazi;
  });
}

/* ── DÖNGÜ ───────────────────────────────────────────────────────── */
/* ── KALE TAŞINDIĞINDA SEFERLERİ İPTAL ET ────────────────────────
   Kale ışınlanınca yoldaki birlikler eski kaleden çıkmış bir çizgide
   yürümeye devam ediyordu ve hâlâ savaşa giriyorlardı. Kale yer
   değiştirdiği an sefer geçersizdir: birlikler ANINDA kaleye döner,
   hiçbir savaş çözülmez. */
let _sonKaleGx = null, _sonKaleGy = null;

function kaleTasindiMi() {
  const k = kaleKonumu();
  if (!k) return false;
  if (_sonKaleGx === null) { _sonKaleGx = k.gx; _sonKaleGy = k.gy; return false; }
  if (Math.abs(k.gx - _sonKaleGx) < 0.001 && Math.abs(k.gy - _sonKaleGy) < 0.001) return false;
  _sonKaleGx = k.gx; _sonKaleGy = k.gy;
  return true;
}

function tumSeferleriIptalEt() {
  const a = liste();
  if (!a.length) return;
  let toplam = 0;
  a.forEach(s => {
    Object.keys(s.birlikler || {}).forEach(uid => {
      state.troops[uid] = say(state.troops[uid], 0) + s.birlikler[uid];
      toplam += s.birlikler[uid];
    });
  });
  a.length = 0;
  kilitAc();
  panelCizIste(true);
  kaydet();
  yenile(["renderTroopsPanel", "renderTroopSelector"]);
  if (toplam > 0) toast(`🏰 Kale taşındı — ${toplam} birlik savaşmadan kaleye döndü.`);
}

let _rafId = 0, _sonPanel = 0;

function haritaGorunur() {
  const wrap = $("battleMapWrap");
  if (!wrap) return false;
  if (wrap.style.display === "none") return false;
  const arena = $("battleArena");
  if (arena && arena.style.display !== "none" && arena.style.display !== "") return false;
  return true;
}

function kare() {
  _rafId = 0;
  const a = liste();

  /* Kale taşındıysa her şeyden önce seferleri iptal et */
  if (kaleTasindiMi()) { tumSeferleriIptalEt(); dongudeKal(); return; }

  /* varış kontrolü */
  const simdi = Date.now();
  for (let i = 0; i < a.length; i++) {
    if (a[i].bitisAt <= simdi && !a[i]._islemde) {
      a[i]._islemde = true;
      const s = a[i];
      setTimeout(() => { s._islemde = false; varis(s); }, 0);
      break;
    }
  }

  /* ÇİZİM HER KAREDE. Kısıtlanırsa harita kaydırılırken çizgi bir-iki
     kare geride kalır ve haritanın üstünde kayıyormuş gibi görünür.
     Artık sadece öznitelik güncellemesi olduğu için ucuz. */
  if (haritaGorunur()) cizgileriCiz();
  if (simdi - _sonPanel > 400) { _sonPanel = simdi; panelCiz(); }

  if (liste().length) dongudeKal();
  else {
    Object.keys(_cizimler).forEach(id => {
      const k = _cizimler[id];
      if (k) {
        if (k.cizgi && k.cizgi.parentNode) k.cizgi.parentNode.removeChild(k.cizgi);
        k.chevronlar.forEach(c => { if (c.parentNode) c.parentNode.removeChild(c); });
        if (k.damga  && k.damga.parentNode)  k.damga.parentNode.removeChild(k.damga);
        if (k.etiket && k.etiket.parentNode) k.etiket.parentNode.removeChild(k.etiket);
      }
      delete _cizimler[id];
    });
    panelCiz();
  }
}

function dongudeKal() {
  if (_rafId) return;
  _rafId = requestAnimationFrame(kare);
}

/* Sefer olmasa bile arada bir bak: başka dosya sefer eklemiş olabilir,
   ya da oyun yeni açılmıştır (kayıtlı sefer yoluna devam etmeli). */
setInterval(() => { if (liste().length) dongudeKal(); }, 1000);

/* ── SAVAŞ DÜĞMESİNİ KESME ───────────────────────────────────────── */
/* document capture = hedef elemandaki capture'dan önce. Dosya başındaki
   2 numaralı nota bak. */
let _sonKesme = 0;

function kesici(e) {
  if (_izin) return;                       /* varış tetiklemesi geçsin */
  const btn = e.target && e.target.closest ? e.target.closest("#battleBtn") : null;
  if (!btn) return;

  /* pointerup'tan sonra tarayıcı bir de click gönderir; ikisini de
     yutuyoruz ama sefer bir kez başlasın (bindTap ile aynı 400 ms). */
  const simdi = Date.now();
  if (simdi - _sonKesme < 500) { e.stopPropagation(); e.preventDefault(); return; }

  if (typeof currentEnemy !== "object" || !currentEnemy) return;

  /* Hiç birlik seçilmemişse karışma — oyunun kendi uyarısı çıksın */
  let toplam = 0;
  const sec = {};
  try {
    Object.keys(selectedTroopsForBattle || {}).forEach(uid => {
      const n = Math.max(0, Math.floor(Math.min(
        say(selectedTroopsForBattle[uid], 0),
        say((state.troops || {})[uid], 0))));
      if (n > 0) { sec[uid] = n; toplam += n; }
    });
  } catch (err) { return; }
  if (toplam <= 0) return;

  if (liste().length >= CFG.maxSefer) {
    e.stopPropagation(); e.preventDefault();
    _sonKesme = simdi;
    toast(`En fazla ${CFG.maxSefer} sefer aynı anda yolda olabilir.`);
    return;
  }

  /* hedef koordinatı */
  let gx, gy, tur, ad, pvpHedef = null;
  if (currentEnemy.isPlayer) {
    tur = "kale";
    ad = currentEnemy.name;
    pvpHedef = currentEnemy;
    const k = kaleKoordinati(ad);
    /* Konum çözülemediyse KARIŞMA: sefer başlatmak yerine oyunun eski
       anlık saldırısı çalışsın. Yoksa ordu 0,0'a yürür. */
    if (!k) return;
    gx = k.gx; gy = k.gy;
  } else {
    tur = "canavar";
    ad = currentEnemy.name;
    if (!isFinite(currentEnemy.mapX) || !isFinite(currentEnemy.mapY)) return;
    gx = (currentEnemy.mapX / 100) * 30;
    gy = (currentEnemy.mapY / 100) * 30;
  }
  if (!isFinite(gx) || !isFinite(gy)) return;   /* konum yoksa eski davranış */

  e.stopPropagation(); e.preventDefault();
  _sonKesme = simdi;

  const ok = baslat({
    tur: tur, hedefAd: ad, hedefGx: gx, hedefGy: gy,
    birlikler: sec, pvpHedef: pvpHedef,
    komutanlar: (typeof selectedCommanders !== "undefined") ? selectedCommanders : [],
  });

  if (ok && typeof backToMap === "function") backToMap();
}

document.addEventListener("pointerup", kesici, true);
document.addEventListener("click",     kesici, true);

/* ── DIŞA AÇILANLAR ──────────────────────────────────────────────
   Kaynak noktaları geldiğinde SEFER.gonder({...}) çağırılır; tur
   "kaynak" olur ve varışta savaş aranmaz (aşağıdaki not).
   BİR ADI SİLMEDEN ÖNCE projede o adı ARA. */
window.SEFER = {
  CFG: CFG,
  gonder: baslat,
  liste: liste,
  geriCagir: geriCagir,
  hizlandir: hizlandir,
  ciz: cizgileriCiz,
  panel: () => panelCizIste(true),
};

dongudeKal();
panelCiz();

})();
