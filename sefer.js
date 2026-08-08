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

   5) SÜRE KAYDEDİLİR, GERİ SAYIM DEĞİL. state.seferler içinde mutlak
      bitisAt damgası tutulur (hastane zinciri ile aynı mantık), böylece
      oyuncu sayfayı yenilese de sefer yoluna devam eder.

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
  if (typeof persistCurrentState === "function") persistCurrentState();
}

/* ── VERİ ────────────────────────────────────────────────────────── */
function liste() {
  if (typeof state !== "object" || !state) return [];
  if (!Array.isArray(state.seferler)) state.seferler = [];
  return state.seferler;
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
    komutanlar: (opt.komutanlar || []).slice(),
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

function varis(s) {
  if (s.yon === "donus") { eveDondu(s); return; }
  if (_savasKilidi) return;             /* sıradaki sefer bir sonraki tick'te */
  _savasKilidi = true;
  savasaGir(s);
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
    _savasKilidi = false; iptalEt(s, "Hedef bulunamadı"); return;
  }
  try { currentEnemy = e; } catch (err) { _savasKilidi = false; iptalEt(s, "Hedef oturmadı"); return; }

  Promise.resolve()
    .then(() => window.startBattle())
    .then(() => { savasBitti(s, oncesi); })
    .catch(() => { _savasKilidi = false; iptalEt(s, "Savaş çözülemedi"); });
}

function pvpVur(s, oncesi) {
  const btn = $("battleBtn");
  if (!btn || !s.pvpHedef) { _savasKilidi = false; iptalEt(s, "Rakip bulunamadı"); return; }
  try { currentEnemy = s.pvpHedef; } catch (err) { _savasKilidi = false; iptalEt(s, "Rakip oturmadı"); return; }

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
    if (--kalan <= 0) { _savasKilidi = false; iptalEt(s, "Savaş çözülemedi"); return; }
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
    _savasKilidi = false;
    yenile(["renderTroopsPanel", "renderTroopSelector"]);
    return;
  }

  /* dönüş yolu için tekrar envanterden düş */
  Object.keys(hayatta).forEach(uid => {
    state.troops[uid] = Math.max(0, say(state.troops[uid], 0) - hayatta[uid]);
  });

  donuseGec(s, hayatta);
  _savasKilidi = false;
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
  kok.style.cssText =
    "position:fixed; inset:0; z-index:9000; display:flex; align-items:center; " +
    "justify-content:center; background:rgba(0,10,25,.6); padding:20px;";

  const donus = (s.yon === "donus");
  const birlikYazi = Object.keys(s.birlikler).map(uid => {
    const d = (typeof UNIT_TYPES !== "undefined" && UNIT_TYPES[uid]) ? UNIT_TYPES[uid] : null;
    return (d ? d.icon + d.name : uid) + " x" + s.birlikler[uid];
  }).join(", ") || "—";

  kok.innerHTML = `
    <div class="overlay-card" style="max-width:340px; width:100%; position:relative;">
      <button class="overlay-close" type="button">✕</button>
      <h2 style="justify-content:center;">${donus ? "↩️ Dönüş Yolunda" : "⚔️ " + (ISIM[s.tur] || "Sefer")}</h2>
      <div style="text-align:center; font-size:14px; margin-bottom:6px;">${s.hedefAd}</div>
      <div style="text-align:center; font-size:22px; font-weight:800;" class="sefer-modal-sure">--:--</div>
      <div style="font-size:12px; opacity:.8; margin:10px 0; text-align:center;">${birlikYazi}</div>
      <div style="display:flex; gap:8px; margin-top:12px;">
        ${donus ? "" : `<button class="battle-btn sefer-geri" type="button" style="flex:1; font-size:13px;">↩️ Geri Çağır</button>`}
        <button class="battle-btn sefer-hizli" type="button" style="flex:1; font-size:13px;">💎 <span class="sefer-ucret">0</span></button>
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

/* ── HARİTADAKİ ">>" ÇİZGİSİ ─────────────────────────────────────── */
/* SVG, #battleMap (düğüm katmanı) içine konur. Konumlar PİKSEL —
   HARITA.ekranKonumu'ndan gelir; yüzde kullanılırsa zoom'da kayar.
   renderBattleMap katmanı tazelerse SVG kopar, her karede geri takılır
   (füze sprite'ının yaptığı gibi). */
function svgKok() {
  const mapEl = $("battleMap");
  if (!mapEl) return null;
  let sv = $("seferKatman");
  if (!sv || !sv.isConnected) {
    sv = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    sv.id = "seferKatman";
    sv.setAttribute("style",
      "position:absolute; left:0; top:0; width:100%; height:100%; " +
      "overflow:visible; pointer-events:none; z-index:1;");
    mapEl.appendChild(sv);
  } else if (sv.parentNode !== mapEl) {
    mapEl.appendChild(sv);
  }
  return sv;
}

function cizgileriCiz() {
  const h = H();
  const sv = svgKok();
  if (!h || !sv) return;
  const a = liste();
  if (!a.length) { sv.innerHTML = ""; return; }

  const simdi = Date.now();
  let out = "";

  a.forEach(s => {
    const bas = h.ekranKonumu(s.basGx, s.basGy);
    const hed = h.ekranKonumu(s.hedGx, s.hedGy);
    const su  = anlikKonum(s);
    const sp  = h.ekranKonumu(su.gx, su.gy);
    const renk = (s.yon === "donus") ? CFG.cizgiRenkDonus : CFG.cizgiRenk;
    const zoom = bas.zoom || 1;

    const aci = Math.atan2(hed.y - bas.y, hed.x - bas.x) * 180 / Math.PI;

    /* yol çizgisi */
    out += `<line x1="${bas.x}" y1="${bas.y}" x2="${hed.x}" y2="${hed.y}"
              stroke="${renk}" stroke-width="${Math.max(1.2, 2 * zoom)}"
              stroke-opacity=".45" stroke-dasharray="${6 * zoom} ${6 * zoom}"/>`;

    /* akan ">>" işaretleri — zaman ile kayar */
    const adet = 6;
    const kayma = ((simdi % 1600) / 1600);
    for (let i = 0; i < adet; i++) {
      let t = (i / adet + kayma) % 1;
      const x = bas.x + (hed.x - bas.x) * t;
      const y = bas.y + (hed.y - bas.y) * t;
      const solma = 0.25 + 0.55 * Math.sin(Math.PI * t);
      out += `<text x="${x}" y="${y}" fill="${renk}" fill-opacity="${solma.toFixed(2)}"
                font-size="${Math.max(9, 13 * zoom)}" font-weight="800"
                text-anchor="middle" dominant-baseline="middle"
                transform="rotate(${aci.toFixed(1)} ${x} ${y})">&#187;</text>`;
    }

    /* yürüyen birlik damgası */
    const r = Math.max(5, 8 * zoom);
    out += `<circle cx="${sp.x}" cy="${sp.y}" r="${r}" fill="rgba(6,22,44,.85)"
              stroke="${renk}" stroke-width="${Math.max(1.2, 2 * zoom)}"/>`;
    out += `<text x="${sp.x}" y="${sp.y}" text-anchor="middle" dominant-baseline="middle"
              font-size="${Math.max(8, 11 * zoom)}">${s.yon === "donus" ? "\u21A9" : "\u2694"}</text>`;
    out += `<text x="${sp.x}" y="${sp.y - r - 4 * zoom}" text-anchor="middle"
              fill="${renk}" font-size="${Math.max(8, 11 * zoom)}" font-weight="800"
              style="paint-order:stroke; stroke:rgba(0,10,25,.85); stroke-width:${3 * zoom}px;"
              >${sureYaz(s.bitisAt - simdi)}</text>`;
  });

  sv.innerHTML = out;
}

/* ── DÖNGÜ ───────────────────────────────────────────────────────── */
let _rafId = 0, _sonPanel = 0;

function kare() {
  _rafId = 0;
  const a = liste();

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

  cizgileriCiz();
  if (simdi - _sonPanel > 400) { _sonPanel = simdi; panelCiz(); }

  if (liste().length) dongudeKal();
  else { const sv = $("seferKatman"); if (sv) sv.innerHTML = ""; panelCiz(); }
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
    gx = say(currentEnemy.gx, NaN); gy = say(currentEnemy.gy, NaN);
    if (!isFinite(gx) && currentEnemy.castle) { gx = currentEnemy.castle.gx; gy = currentEnemy.castle.gy; }
  } else {
    tur = "canavar";
    ad = currentEnemy.name;
    gx = (say(currentEnemy.mapX, 0) / 100) * 30;
    gy = (say(currentEnemy.mapY, 0) / 100) * 30;
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
