/* ═══════════════════════════════════════════════════════════════
   temizle.js — TEK KULLANIMLIK KURTARMA ARACI
   ---------------------------------------------------------------
   Eski biçimde yazılmış hastane kayıtlarını (her yaralı için ayrı
   satır) hem BULUTTAN hem TELEFONDAN siler. Bütün hesaplar için.

   Kullanım:
     1) index.html'e ekle:  <script src="temizle.js"></script>
     2) Oyunu şöyle aç:     ...vercel.app/?temizle=1
     3) Ekrandaki düğmeye bas
     4) İş bitince BU DOSYAYI VE O SATIRI SİL

   ?temizle=1 yoksa dosya hiçbir şey yapmaz, oyuna dokunmaz.
   ═══════════════════════════════════════════════════════════════ */
(function () {
"use strict";

if (!/[?&]temizle=1/.test(location.search)) return;

const ACCOUNTS_KEY = "ejderha_diyari_accounts_v1";
let GUNLUK_ANAHTAR = [];

/* ── Ekran ── */
const kutu = document.createElement("div");
kutu.id = "temizlePanel";
kutu.style.cssText =
  "position:fixed;inset:0;z-index:99999;background:#0b1420;color:#eaf4ff;" +
  "font-family:'Baloo 2',sans-serif;padding:18px;overflow:auto;" +
  "-webkit-overflow-scrolling:touch;";
document.addEventListener("DOMContentLoaded", () => document.body.appendChild(kutu));
if (document.readyState !== "loading") document.body.appendChild(kutu);

let govde = "";
function yaz(s) { govde += s + "<br>"; ciz(); }
function ciz() {
  kutu.innerHTML =
    '<div style="font-weight:800;font-size:19px;margin-bottom:12px;">🧹 HASTANE TEMİZLİĞİ</div>' +
    '<div id="tmzLog" style="font-size:14px;line-height:1.55;white-space:pre-wrap;">' + govde + '</div>' +
    '<div id="tmzBtnAlan" style="margin-top:18px;"></div>';
  const alan = kutu.querySelector("#tmzBtnAlan");
  dugmeler.forEach(d => alan.appendChild(d));
}
let dugmeler = [];
function dugmeEkle(yazi, renk, islev) {
  const b = document.createElement("button");
  b.textContent = yazi;
  b.style.cssText =
    "display:block;width:100%;margin:0 0 10px;padding:15px;border:none;border-radius:12px;" +
    "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:16px;color:#fff;cursor:pointer;" +
    "background:" + renk + ";box-shadow:none;" +
    "text-shadow:0 1px 2px rgba(0,20,45,.55);transition:transform .09s,filter .09s;";
  b.addEventListener("pointerdown", () => { b.style.transform = "scale(.96)"; b.style.filter = "brightness(.93)"; });
  b.addEventListener("pointerup",   () => { b.style.transform = ""; b.style.filter = ""; });
  b.addEventListener("click", islev);
  dugmeler.push(b); ciz();
  return b;
}

/* ── Sayım yardımcıları ── */
function kb(v) {
  try { return Math.round(JSON.stringify(v).length / 1024); } catch (e) { return 0; }
}
function satirSayisi(h) {
  if (!h) return 0;
  if (Array.isArray(h)) return h.length;
  if (typeof h === "object") return Object.keys(h).length;
  return 0;
}
function eskiBicimMi(h) {
  const liste = Array.isArray(h) ? h : (h && typeof h === "object" ? Object.values(h) : []);
  return liste.some(r => r && typeof r === "object" && r.adet === undefined);
}

/* ── 1) DURUM RAPORU ── */
function raporla() {
  govde = "";
  yaz("<b>TELEFON (localStorage)</b>");
  let acc = {};
  try { acc = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}") || {}; } catch (e) {}
  const boyut = (localStorage.getItem(ACCOUNTS_KEY) || "").length;
  yaz("  toplam kayıt: " + Math.round(boyut / 1024) + " KB");
  const anahtarlar = Object.keys(acc);
  if (!anahtarlar.length) yaz("  <i>hesap bulunamadı</i>");
  anahtarlar.forEach(k => {
    const h = acc[k] && acc[k].state ? acc[k].state.hospital : null;
    const n = satirSayisi(h);
    yaz("  • " + k + " → " + n + " satır" + (n && eskiBicimMi(h) ? "  <span style='color:#ff8b8b'>[ESKİ BİÇİM]</span>" : ""));
  });

  yaz("");
  yaz("<b>BULUT (Firebase)</b>");
  if (typeof firebaseDb === "undefined" || !firebaseDb) {
    yaz("  <span style='color:#ff8b8b'>bağlantı yok — sadece telefon temizlenebilir</span>");
    dugmeleriKur(null);
    return;
  }
  firebaseDb.ref("accounts").get().then(snap => {
    const v = snap.val() || {};
    const ks = Object.keys(v);
    if (!ks.length) yaz("  <i>hesap bulunamadı</i>");
    ks.forEach(k => {
      const h = v[k] && v[k].state ? v[k].state.hospital : null;
      const n = satirSayisi(h);
      yaz("  • " + k + " → " + n + " satır" + (n && eskiBicimMi(h) ? "  <span style='color:#ff8b8b'>[ESKİ BİÇİM]</span>" : ""));
    });

    /* ── ÇÖP GÜNLÜK KOPYASI ──────────────────────────────────
       Günlüğün doğru yeri battleLogs/{hesap}. Ama queueCloudSave
       bir de accounts/{hesap}/state/battleLogHistory altına
       yazıyordu. Oradaki kopya HİÇ OKUNMUYOR, sadece yer kaplıyor
       ve girişte telefona iniyor.                                */
    yaz("");
    yaz("<b>ÇÖP GÜNLÜK KOPYASI (accounts/…/state/battleLogHistory)</b>");
    let bulunan = 0;
    ks.forEach(k => {
      const g = v[k] && v[k].state ? v[k].state.battleLogHistory : null;
      const n = satirSayisi(g);
      if (n > 0) {
        bulunan++;
        yaz("  • " + k + " → " + n + " kayıt, <b style='color:#ff8b8b'>" + kb(g) + " KB</b>");
      }
    });
    if (!bulunan) yaz("  <span style='color:#7fe3a6'>temiz</span>");

    /* ── SAVAŞ GÜNLÜĞÜ BOYUTU (battleLogs/{hesap}) ───────────
       Doğru yer burası, silinmez. Ama eski PvP raporlarının
       içinde asker asker yaralı dizileri var; onlar sayıya
       çevrilince günlük küçülür, hiçbir rapor kaybolmaz.       */
    yaz("");
    yaz("<b>SAVAŞ GÜNLÜĞÜ (battleLogs/…)</b>");
    firebaseDb.ref("battleLogs").get().then(gs => {
      const gv = gs.val() || {};
      GUNLUK_ANAHTAR = Object.keys(gv);
      if (!GUNLUK_ANAHTAR.length) yaz("  <i>kayıt yok</i>");
      GUNLUK_ANAHTAR.forEach(k => {
        const l = gv[k];
        const n = Array.isArray(l) ? l.length : satirSayisi(l);
        const b = kb(l);
        const renk = b > 300 ? "#ff8b8b" : (b > 50 ? "#ffd9a8" : "#7fe3a6");
        yaz("  • " + k + " → " + n + " rapor, <b style='color:" + renk + "'>" + b + " KB</b>");
      });
      dugmeleriKur(ks);
    }).catch(e => {
      yaz("  <span style='color:#ff8b8b'>okunamadı: " + e.message + "</span>");
      dugmeleriKur(ks);
    });
  }).catch(e => {
    yaz("  <span style='color:#ff8b8b'>okunamadı: " + e.message + "</span>");
    dugmeleriKur(null);
  });
}

/* ── 2) TEMİZLİK ── */
function dugmeleriKur(bulutAnahtarlari) {
  dugmeler = [];
  dugmeEkle("🗑️  BÜTÜN HESAPLARIN HASTANESİNİ SİL", "linear-gradient(180deg,#e05555,#a01818)", () => {
    if (!confirm("Bütün hesapların hastanesi silinecek. Tedavideki yaralılar gidecek. Emin misin?")) return;
    temizle(bulutAnahtarlari);
  });
  dugmeEkle("🧾  ÇÖP GÜNLÜK KOPYASINI SİL", "linear-gradient(180deg,#e0a020,#a06a00)", () => {
    if (!confirm("accounts/…/state/battleLogHistory altındaki kopya silinecek.\n\nMesaj kutundaki raporlara DOKUNULMAZ — onlar battleLogs/ düğümünde duruyor. Devam?")) return;
    gunlukKopyasiniSil(bulutAnahtarlari);
  });
  dugmeEkle("📉  SAVAŞ GÜNLÜĞÜNÜ KÜÇÜLT", "linear-gradient(180deg,#2fb37a,#12734a)", () => {
    if (!confirm("Eski raporların içindeki dev yaralı listeleri sayıya çevrilecek.\n\nHİÇBİR RAPOR SİLİNMEZ, hepsi okunabilir kalır. Devam?")) return;
    gunlugüKucult();
  });
  dugmeEkle("↻  Durumu yenile", "linear-gradient(180deg,#1fa3ea,#0e6fc0)", raporla);
  dugmeEkle("✕  Kapat ve oyuna dön", "linear-gradient(180deg,#5b6b7d,#39434f)", () => {
    location.href = location.pathname;
  });
}

function temizle(bulutAnahtarlari) {
  govde = "";
  yaz("<b>Temizlik başladı…</b>");
  yaz("");

  /* a) Bellekteki state — oyun bir sonraki kaydında boş yazsın */
  try {
    if (typeof state !== "undefined" && state) {
      state.hospital = [];
      yaz("✔ bellekteki hastane boşaltıldı");
    }
  } catch (e) { yaz("✖ bellek: " + e.message); }

  /* b) Telefondaki bütün hesaplar */
  try {
    const acc = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}") || {};
    let n = 0;
    Object.keys(acc).forEach(k => {
      if (acc[k] && acc[k].state) { acc[k].state.hospital = []; n++; }
    });
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(acc));
    const yeni = Math.round((localStorage.getItem(ACCOUNTS_KEY) || "").length / 1024);
    yaz("✔ telefon: " + n + " hesap temizlendi → kayıt artık " + yeni + " KB");
  } catch (e) { yaz("✖ telefon: " + e.message); }

  /* c) Buluttaki bütün hesaplar */
  if (!bulutAnahtarlari || typeof firebaseDb === "undefined" || !firebaseDb) {
    yaz("— bulut atlandı (bağlantı yok)");
    bitir();
    return;
  }
  const isler = bulutAnahtarlari.map(k =>
    firebaseDb.ref("accounts/" + k + "/state/hospital").remove()
      .then(() => yaz("✔ bulut: " + k))
      .catch(e => yaz("✖ bulut: " + k + " — " + e.message))
  );
  Promise.all(isler).then(bitir).catch(bitir);
}

/* ── ÇÖP GÜNLÜK KOPYASI ──────────────────────────────────────
   SADECE accounts/{k}/state/battleLogHistory silinir.
   battleLogs/{k} düğümüne ELLENMEZ — mesaj kutusu oradan okunur. */
function gunlukKopyasiniSil(bulutAnahtarlari) {
  govde = "";
  yaz("<b>Çöp günlük kopyası siliniyor…</b>");
  yaz("");

  /* a) Telefondaki hesap kaydından çıkar (günlük kendi anahtarında kalır) */
  try {
    const acc = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}") || {};
    let n = 0;
    Object.keys(acc).forEach(k => {
      if (acc[k] && acc[k].state && acc[k].state.battleLogHistory !== undefined) {
        delete acc[k].state.battleLogHistory; n++;
      }
    });
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(acc));
    const yeni = Math.round((localStorage.getItem(ACCOUNTS_KEY) || "").length / 1024);
    yaz("✔ telefon: " + n + " hesap → kayıt artık " + yeni + " KB");
  } catch (e) { yaz("✖ telefon: " + e.message); }

  if (!bulutAnahtarlari || typeof firebaseDb === "undefined" || !firebaseDb) {
    yaz("— bulut atlandı (bağlantı yok)");
    bitir(); return;
  }
  const isler = bulutAnahtarlari.map(k =>
    firebaseDb.ref("accounts/" + k + "/state/battleLogHistory").remove()
      .then(() => yaz("✔ bulut: " + k))
      .catch(e => yaz("✖ bulut: " + k + " — " + e.message))
  );
  Promise.all(isler).then(bitir).catch(bitir);
}

/* ── SAVAŞ GÜNLÜĞÜNÜ KÜÇÜLT ──────────────────────────────────
   Eski PvP raporları `troopsWoundedByUnit` / `rep.woundedByUnit`
   alanlarında ASKER ASKER nesne tutuyor ({knight:[{},{},…]}).
   Aynı bilgi tek sayıyla ifade edilir. Rapor ekranı zaten
   yaraliAdet() ile okuduğu için görüntü hiç değişmez.
   Rapor SİLİNMEZ, sadece içi sadeleşir.                        */
function sayiyaCevir(v) {
  if (typeof v === "number") return Math.max(0, Math.round(v));
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === "object") {
    if (typeof v.adet === "number") return Math.max(0, Math.round(v.adet));
    return Object.keys(v).length;
  }
  return 0;
}
function haritayiSadelestir(m) {
  if (!m || typeof m !== "object") return m;
  const o = {};
  Object.keys(m).forEach(k => { o[k] = sayiyaCevir(m[k]); });
  return o;
}
function raporuSadelestir(r) {
  if (!r || typeof r !== "object") return r;
  if (r.troopsWoundedByUnit) r.troopsWoundedByUnit = haritayiSadelestir(r.troopsWoundedByUnit);
  if (r.troopsLostByUnit)    r.troopsLostByUnit    = haritayiSadelestir(r.troopsLostByUnit);
  if (r.myLosses && typeof r.myLosses === "object") {
    if (r.myLosses.killed)  r.myLosses.killed  = haritayiSadelestir(r.myLosses.killed);
    if (r.myLosses.wounded) r.myLosses.wounded = haritayiSadelestir(r.myLosses.wounded);
  }
  if (r.rep && typeof r.rep === "object") {
    if (r.rep.woundedByUnit) r.rep.woundedByUnit = haritayiSadelestir(r.rep.woundedByUnit);
    if (r.rep.lostByUnit)    r.rep.lostByUnit    = haritayiSadelestir(r.rep.lostByUnit);
    if (r.rep.troopsSent)    r.rep.troopsSent    = haritayiSadelestir(r.rep.troopsSent);
  }
  return r;
}

function gunlugüKucult() {
  govde = "";
  yaz("<b>Savaş günlüğü küçültülüyor…</b>");
  yaz("");

  if (typeof firebaseDb === "undefined" || !firebaseDb) {
    yaz("<span style='color:#ff8b8b'>bulut bağlantısı yok</span>"); bitir(); return;
  }
  if (!GUNLUK_ANAHTAR.length) {
    yaz("<i>küçültülecek günlük bulunamadı</i>"); bitir(); return;
  }

  const isler = GUNLUK_ANAHTAR.map(k =>
    firebaseDb.ref("battleLogs/" + k).get().then(s => {
      const ham = s.val();
      if (!ham) return;
      const liste = Array.isArray(ham) ? ham : Object.values(ham);
      const once = kb(liste);
      const yeni = liste.map(raporuSadelestir);
      const sonra = kb(yeni);
      if (sonra >= once) { yaz("— " + k + ": zaten sade (" + once + " KB)"); return; }
      return firebaseDb.ref("battleLogs/" + k).set(yeni)
        .then(() => yaz("✔ " + k + ": " + once + " KB → <b style='color:#7fe3a6'>" + sonra + " KB</b> · " + yeni.length + " rapor korundu"))
        .catch(e => yaz("✖ " + k + ": " + e.message));
    }).catch(e => yaz("✖ " + k + " okunamadı: " + e.message))
  );

  Promise.all(isler).then(() => {
    /* Telefondaki kopyayı da sadeleştir — yoksa oyun açılınca
       eski şişkin hali tekrar buluta yazar. */
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.indexOf("bd_log_") !== 0) return;
        const l = JSON.parse(localStorage.getItem(k) || "[]");
        if (!Array.isArray(l) || !l.length) return;
        const once = kb(l);
        const yeni = l.map(raporuSadelestir);
        localStorage.setItem(k, JSON.stringify(yeni));
        yaz("✔ telefon " + k + ": " + once + " KB → " + kb(yeni) + " KB");
      });
      if (typeof state !== "undefined" && state && Array.isArray(state.battleLogHistory)) {
        state.battleLogHistory = state.battleLogHistory.map(raporuSadelestir);
        yaz("✔ bellekteki günlük sadeleştirildi");
      }
    } catch (e) { yaz("✖ telefon: " + e.message); }
    bitir();
  }).catch(bitir);
}

function bitir() {
  yaz("");
  yaz("<b style='color:#7fe3a6'>BİTTİ.</b>");
  yaz("Şimdi bu sekmeyi KAPAT, oyunu yeniden aç.");
  dugmeler = [];
  dugmeEkle("✕  Kapat ve oyuna dön", "linear-gradient(180deg,#5b6b7d,#39434f)", () => {
    location.href = location.pathname;
  });
}

/* Firebase ve state yüklensin diye biraz bekle */
setTimeout(raporla, 2500);
ciz();
yaz("Durum okunuyor, bekle…");

})();
